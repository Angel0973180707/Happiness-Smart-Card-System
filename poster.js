/* ==========================================
 * HSC Poster v533
 * COMPLETE OVERWRITE
 *
 * Goals:
 * 1) 修正按鈕 ID 綁定錯誤
 * 2) 使用 imageResolver 統一解析頭像
 * 3) QRCode 載入穩定
 * 4) 海報下載穩定
 * 5) 不改 GAS / 不改資料欄位 / 不改主流程
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "533";

  const GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const BASE = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

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
  const featureDescEl = document.getElementById("featureDesc");
  const footerIdEl = document.getElementById("footerId");
  const qrTipEl = document.getElementById("qrTip");
  const statusEl = document.getElementById("status");

  const posterEl = document.getElementById("poster");
  const qrWrapEl = document.getElementById("qrcode");

  const btnOpenCard = document.getElementById("btnOpenCard");
  const btnDownload = document.getElementById("btnDownload");
  const btnCopyCard = document.getElementById("btnCopyCard");
  const btnCopyHome = document.getElementById("btnCopyHome");

  let itemData = null;
  let cardURL = "";

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

      renderCard(item);
      bindActions();
      await renderQRCode(cardURL, getAvatarSafe(item));

      setButtonsDisabled(false);
      setStatus("success", "交付卡已載入完成，可以直接下載海報或分享名片。");
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
    return `${BASE}?id=${encodeURIComponent(cardId)}`;
  }

  function getAvatarSafe(item) {
    try {
      if (typeof getAvatar === "function") return getAvatar(item);
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
    const services = safeText(item.services, "");
    const experience = safeText(item.experience, "");

    nameEl.textContent = name;
    unitEl.textContent = unit;
    titleEl.textContent = title;
    sloganEl.textContent = slogan;
    footerIdEl.textContent = `ID：${safeText(item.id, "--")}`;

    if (services || experience) {
      featureDescEl.textContent = [services, experience].filter(Boolean).join("｜");
    } else if (slogan) {
      featureDescEl.textContent = slogan;
    } else {
      featureDescEl.textContent =
        "名片會整合你的品牌入口與個人資訊，讓對方更快認識你、找到你、聯絡你。";
    }

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

    avatarEl.onload = () => {
      avatarEl.style.display = "block";
      avatarFallbackEl.style.display = "none";
      showQrCenter(src);
    };

    avatarEl.onerror = () => {
      avatarEl.style.display = "none";
      avatarFallbackEl.style.display = "grid";
      hideQrCenter();
    };

    avatarEl.src = src;
  }

  async function renderQRCode(text, avatarSrc) {
    qrTipEl.textContent = "QR 產生中...";
    qrWrapEl.innerHTML = "";
    hideQrCenter();

    await wait(50);

    new QRCode(qrWrapEl, {
      text,
      width: 124,
      height: 124,
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

    qrCenterImgEl.onload = () => {
      qrCenterEl.style.display = "block";
    };

    qrCenterImgEl.onerror = () => {
      hideQrCenter();
    };

    qrCenterImgEl.src = src;
  }

  function hideQrCenter() {
    qrCenterEl.style.display = "none";
    qrCenterImgEl.removeAttribute("src");
  }

  function bindActions() {
    btnOpenCard.onclick = () => {
      if (!cardURL) return;
      window.open(cardURL, "_blank", "noopener");
    };

    btnCopyCard.onclick = async () => {
      if (!cardURL) return;
      const ok = await copyText(cardURL);
      if (ok) {
        setStatus("success", "名片連結已複製。");
      } else {
        setStatus("error", "名片連結複製失敗，請手動複製網址。");
      }
    };

    btnCopyHome.onclick = async () => {
      const ok = await copyText(BASE);
      if (ok) {
        setStatus("success", "智慧名片首頁連結已複製。");
      } else {
        setStatus("error", "首頁連結複製失敗，請手動複製網址。");
      }
    };

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
  }

  async function downloadPoster() {
    if (!posterEl) {
      throw new Error("找不到海報區塊。");
    }

    await waitForImages(posterEl);
    await wait(80);

    const canvas = await html2canvas(posterEl, {
      useCORS: true,
      allowTaint: false,
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
    [btnOpenCard, btnDownload, btnCopyCard, btnCopyHome].forEach((btn) => {
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