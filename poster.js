/* ==========================================
 * HSC Poster v534.2
 * COMPLETE OVERWRITE
 *
 * 修正重點：
 * 1) 成品頁使用 index.html?id=xxx&view=1
 * 2) 微信按鈕改為「複製連結到微信」
 * 3) QR 中央改固定品牌小圓章，不再放真人頭像
 * 4) 保持三區簡潔交付卡
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "534.2";

  const GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const BASE = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
  const HALL_URL = BASE;
  const CARD_PAGE = `${BASE}index.html`;

  const qs = new URLSearchParams(location.search);
  const id = (qs.get("id") || "").trim();

  const avatarEl = document.getElementById("avatar");
  const avatarFallbackEl = document.getElementById("avatarFallback");

  const nameEl = document.getElementById("name");
  const unitEl = document.getElementById("unit");
  const titleEl = document.getElementById("title");
  const footerIdEl = document.getElementById("footerId");
  const qrTipEl = document.getElementById("qrTip");
  const statusEl = document.getElementById("status");

  const posterEl = document.getElementById("poster");
  const qrWrapEl = document.getElementById("qrcode");

  const btnDownload = document.getElementById("btnDownload");
  const btnOpenCard = document.getElementById("btnOpenCard");
  const btnCopyCard = document.getElementById("btnCopyCard");
  const btnShareLine = document.getElementById("btnShareLine");
  const btnCopyWechat = document.getElementById("btnCopyWechat");
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
      await renderQRCode(cardURL);

      setButtonsDisabled(false);
      setStatus("success", "交付卡已載入完成。");
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
    return `${CARD_PAGE}?id=${encodeURIComponent(cardId)}&view=1`;
  }

  function renderCard(item) {
    const name = safeText(item.name, "未命名");
    const unit = safeText(item.unit, "");
    const title = safeText(item.title, "");

    nameEl.textContent = name;
    unitEl.textContent = unit || " ";
    titleEl.textContent = title || " ";
    footerIdEl.textContent = `ID：${safeText(item.id, "--")}`;

    renderAvatar(item, name);
  }

  async function renderAvatar(item, nameText) {
    const fallbackText = getFallbackText(nameText);

    avatarFallbackEl.textContent = fallbackText;
    avatarFallbackEl.style.display = "grid";
    avatarEl.style.display = "none";
    avatarEl.removeAttribute("src");

    let candidates = [];
    try {
      if (typeof getAvatarCandidates === "function") {
        candidates = getAvatarCandidates(item);
      }
    } catch (err) {
      console.warn("[getAvatarCandidates error]", err);
    }

    if (!candidates || !candidates.length) {
      const single =
        (typeof getAvatar === "function" ? getAvatar(item) : "") ||
        item.avatar_img_fast ||
        item.avatar_img ||
        item.avatar_url ||
        item.avatar ||
        "";
      if (single) candidates = [single];
    }

    const loaded = await loadFirstAvailableImage(candidates);

    if (!loaded) {
      return;
    }

    avatarEl.crossOrigin = "anonymous";
    avatarEl.referrerPolicy = "no-referrer";
    avatarEl.src = loaded;
    avatarEl.style.display = "block";
    avatarFallbackEl.style.display = "none";
  }

  async function loadFirstAvailableImage(candidates) {
    const uniq = Array.from(new Set((candidates || []).filter(Boolean)));

    for (const src of uniq) {
      const ok = await testImage(src);
      if (ok) return src;
    }

    return "";
  }

  function testImage(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);

      img.src = src;
    });
  }

  async function renderQRCode(text) {
    qrTipEl.textContent = "QR 產生中...";
    qrWrapEl.innerHTML = "";

    await wait(60);

    new QRCode(qrWrapEl, {
      text,
      width: 150,
      height: 150,
      correctLevel: QRCode.CorrectLevel.H
    });

    qrTipEl.textContent = "掃描QRCode查閱智慧名片";
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

    btnCopyWechat.onclick = async () => {
      if (!cardURL) return;
      const ok = await copyText(cardURL);
      setStatus(
        ok ? "success" : "error",
        ok ? "智慧名片連結已複製，可直接貼到微信分享。" : "複製失敗，請手動複製後貼到微信。"
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
      btnCopyWechat,
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