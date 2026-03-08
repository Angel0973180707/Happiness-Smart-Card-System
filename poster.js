/* ==========================================
 * HSC Poster v534
 * COMPLETE OVERWRITE
 *
 * 本版重點：
 * 1) 頭像改走 imageResolver.js 正規化
 * 2) 打開我的智慧名片 => 明確指向 index.html?id=
 * 3) 補齊 7 顆按鈕
 * 4) 交付卡精簡為正式交付入口
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "534";

  const GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const BASE = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
  const HALL_URL = BASE;
  const CARD_PAGE = `${BASE}index.html`;

  const qs = new URLSearchParams(location.search);
  const id = (qs.get("id") || "").trim();

  const avatarEl = document.getElementById("avatar");
  const avatarFallbackEl = document.getElementById("avatarFallback");
  const qrCenterEl = document.getElementById("qrCenter");
  const qrCenterImgEl = document.getElementById("qrCenterImg");

  const nameEl = document.getElementById("name");
  const unitEl = document.getElementById("unit");
  const titleEl = document.getElementById("title");
  const sloganEl = document.getElementById("slogan");
  const footerIdEl = document.getElementById("footerId");
  const qrTipEl = document.getElementById("qrTip");
  const statusEl = document.getElementById("status");

  const posterEl = document.getElementById("poster");
  const qrWrapEl = document.getElementById("qrcode");

  const btnDownload = document.getElementById("btnDownload");
  const btnOpenCard = document.getElementById("btnOpenCard");
  const btnCopyCard = document.getElementById("btnCopyCard");
  const btnShareLine = document.getElementById("btnShareLine");
  const btnShareWechat = document.getElementById("btnShareWechat");
  const btnShareHall = document.getElementById("btnShareHall");
  const btnConsult = document.getElementById("btnConsult");

  let itemData = null;
  let cardURL = "";
  let hallURL = HALL_URL;
  let consultURL = "";

  init();

  async function init() {
    try {
      setButtonsDisabled(true);

      if (!id) {
        throw new Error("缺少名片 id，請從正確交付卡連結進入。");
      }

      setStatus("loading", "正在載入交付卡資料...");

      const data = await fetchCard(id);
      const item = data && data.item ? data.item : null;

      if (!item || !item.id) {
        throw new Error("查無名片資料。");
      }

      itemData = item;
      cardURL = buildCardURL(item.id);
      consultURL = safeText(item.line_oa, "");

      renderCard(item);
      bindActions();
      await renderQRCode(cardURL, getAvatarSafe(item));

      setButtonsDisabled(false);
      setStatus("success", "交付卡已載入完成，可直接下載、開啟或分享。");
    } catch (err) {
      console.error("[HSC Poster init error]", err);
      setButtonsDisabled(true);
      setStatus("error", err && err.message ? err.message : "交付卡載入失敗。");
    }
  }

  async function fetchCard(cardId) {
    const url = `${GAS}?action=card&id=${encodeURIComponent(cardId)}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });

    if (!res.ok) {
      throw new Error(`讀取名片失敗（HTTP ${res.status}）`);
    }

    const data = await res.json();

    if (!data || data.ok === false) {
      throw new Error((data && data.message) || "名片資料回傳失敗。");
    }

    return data;
  }

  function buildCardURL(cardId) {
    return `${CARD_PAGE}?id=${encodeURIComponent(cardId)}`;
  }

  function getAvatarSafe(item) {
    try {
      if (typeof getAvatar === "function") {
        return getAvatar(item);
      }
    } catch (err) {
      console.warn("[getAvatar fallback]", err);
    }

    return (
      item.avatar_img_fast ||
      item.avatar_img ||
      item.avatar_url ||
      item.avatar ||
      ""
    );
  }

  function renderCard(item) {
    const name = safeText(item.name, "未命名");
    const unit = safeText(item.unit, "天使幸福智慧名片");
    const title = safeText(item.title, "智慧名片");
    const slogan = safeText(item.slogan, "");

    nameEl.textContent = name;
    unitEl.textContent = unit;
    titleEl.textContent = title;
    sloganEl.textContent = slogan || "可分享的專屬名片入口";
    footerIdEl.textContent = `ID：${safeText(item.id, "--")}`;

    renderAvatar(getAvatarSafe(item), name);
  }

  function renderAvatar(src, nameText) {
    const fallbackText = getFallbackText(nameText);

    avatarFallbackEl.textContent = fallbackText;
    avatarFallbackEl.style.display = "grid";
    avatarEl.style.display = "none";
    avatarEl.removeAttribute("src");

    if (!src) {
      hideQrCenter();
      return;
    }

    const testImg = new Image();
    testImg.crossOrigin = "anonymous";

    testImg.onload = () => {
      avatarEl.onload = null;
      avatarEl.onerror = null;
      avatarEl.crossOrigin = "anonymous";
      avatarEl.referrerPolicy = "no-referrer";
      avatarEl.src = src;
      avatarEl.style.display = "block";
      avatarFallbackEl.style.display = "none";
      showQrCenter(src);
    };

    testImg.onerror = () => {
      avatarEl.style.display = "none";
      avatarFallbackEl.style.display = "grid";
      hideQrCenter();
      setStatus("error", "頭像資料存在，但圖片來源目前無法穩定載入。");
    };

    testImg.referrerPolicy = "no-referrer";
    testImg.src = src;
  }

  async function renderQRCode(text, avatarSrc) {
    qrTipEl.textContent = "QR 產生中...";
    qrWrapEl.innerHTML = "";
    hideQrCenter();

    await wait(60);

    new QRCode(qrWrapEl, {
      text,
      width: 136,
      height: 136,
      correctLevel: QRCode.CorrectLevel.H
    });

    if (avatarSrc) {
      showQrCenter(avatarSrc);
    }

    qrTipEl.textContent = "掃描後可立即查看智慧名片";
  }

  function showQrCenter(src) {
    if (!src) {
      hideQrCenter();
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      qrCenterImgEl.crossOrigin = "anonymous";
      qrCenterImgEl.referrerPolicy = "no-referrer";
      qrCenterImgEl.src = src;
      qrCenterEl.style.display = "block";
    };

    img.onerror = () => {
      hideQrCenter();
    };

    img.referrerPolicy = "no-referrer";
    img.src = src;
  }

  function hideQrCenter() {
    qrCenterEl.style.display = "none";
    qrCenterImgEl.removeAttribute("src");
  }

  function bindActions() {
    btnDownload.onclick = async () => {
      try {
        btnDownload.disabled = true;
        setStatus("loading", "正在產生海報，請稍候...");

        await downloadPoster();

        setStatus("success", "海報已下載完成。");
      } catch (err) {
        console.error("[downloadPoster error]", err);
        setStatus("error", err && err.message ? err.message : "海報下載失敗。");
      } finally {
        btnDownload.disabled = false;
      }
    };

    btnOpenCard.onclick = () => {
      if (!cardURL) return;
      window.open(cardURL, "_blank", "noopener");
    };

    btnCopyCard.onclick = async () => {
      if (!cardURL) return;
      const ok = await copyText(cardURL);
      setStatus(ok ? "success" : "error", ok ? "智慧名片連結已複製。" : "複製失敗，請手動複製網址。");
    };

    btnShareLine.onclick = () => {
      if (!cardURL) return;
      const text = `這是我的智慧名片：${cardURL}`;
      const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
    };

    btnShareWechat.onclick = async () => {
      if (!cardURL) return;
      const ok = await copyText(cardURL);
      setStatus(
        ok ? "success" : "error",
        ok ? "智慧名片連結已複製，可直接貼到微信分享。" : "微信分享連結複製失敗。"
      );
    };

    btnShareHall.onclick = () => {
      window.open(hallURL, "_blank", "noopener");
    };

    btnConsult.onclick = () => {
      if (!consultURL) {
        setStatus("error", "目前尚未設定名片諮詢服務連結。");
        return;
      }
      window.open(consultURL, "_blank", "noopener");
    };
  }

  async function downloadPoster() {
    if (!posterEl) {
      throw new Error("找不到海報區塊。");
    }

    await waitForImages(posterEl);
    await wait(120);

    const canvas = await html2canvas(posterEl, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: Math.max(2, Math.min(window.devicePixelRatio || 1, 3))
    });

    const a = document.createElement("a");
    const fileId = itemData && itemData.id ? itemData.id : "card";
    a.href = canvas.toDataURL("image/png");
    a.download = `hsc-poster-${fileId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (err) {
      console.warn("[copyText error]", err);
      return false;
    }
  }

  function setButtonsDisabled(disabled) {
    [
      btnDownload,
      btnOpenCard,
      btnCopyCard,
      btnShareLine,
      btnShareWechat,
      btnShareHall,
      btnConsult
    ].forEach((btn) => {
      if (btn) btn.disabled = !!disabled;
    });
  }

  function setStatus(type, text) {
    if (!statusEl) return;

    if (type === "error") {
      statusEl.setAttribute("data-type", "error");
      statusEl.textContent = text;
      return;
    }

    if (type === "success") {
      statusEl.setAttribute("data-type", "success");
      statusEl.textContent = text;
      return;
    }

    statusEl.removeAttribute("data-type");
    statusEl.innerHTML = `
      <span class="loading">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </span>
      ${escapeHtml(text)}
    `;
  }

  function safeText(value, fallback = "") {
    const s = value === null || value === undefined ? "" : String(value).trim();
    return s || fallback;
  }

  function getFallbackText(name) {
    const s = safeText(name, "名片");
    return s.slice(0, 2);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForImages(root) {
    const imgs = Array.from(root.querySelectorAll("img"));
    const waits = imgs.map((img) => {
      if (img.complete) return Promise.resolve();

      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    });

    return Promise.all(waits);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  console.log(`[HSC Poster v${VERSION}] ready`);
})();