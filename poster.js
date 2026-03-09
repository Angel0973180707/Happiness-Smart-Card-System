/* ==========================================
 * HSC Poster v704.1
 * COMPLETE OVERWRITE
 *
 * 重點：
 * 1. 修正 QR code 顯示
 * 2. 標題改為 icon + 天使幸福智慧名片
 * 3. 名片交付卡使用橢圓框
 * 4. 外露小字說明收進分享說明 Dialog
 * 5. 保留 7 個按鈕
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "704.1";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA = "https://lin.ee/3r2ZePN";

  const QR_SCRIPT_CANDIDATES = [
    "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js",
    "https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js"
  ];

  const qs = new URLSearchParams(location.search);
  const id = (qs.get("id") || "").trim();
  const gas = (qs.get("gas") || DEFAULT_GAS).trim();
  const baseUrl = normalizeBase(qs.get("base") || DEFAULT_BASE);
  const lineOA = (qs.get("lineoa") || DEFAULT_LINE_OA).trim();

  const el = {
    avatarImg: document.getElementById("avatarImg"),
    cardName: document.getElementById("cardName"),
    cardTitle: document.getElementById("cardTitle"),
    qrBox: document.getElementById("qrBox"),
    posterCapture: document.getElementById("posterCapture"),
    statusText: document.getElementById("statusText"),

    downloadBtn: document.getElementById("downloadBtn"),
    openCardBtn: document.getElementById("openCardBtn"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    shareCardBtn: document.getElementById("shareCardBtn"),
    recommendBtn: document.getElementById("recommendBtn"),
    helpBtn: document.getElementById("helpBtn"),
    lineOABtn: document.getElementById("lineOABtn"),

    shareDialog: document.getElementById("shareDialog"),
    dialogCloseBtn: document.getElementById("dialogCloseBtn"),
  };

  let currentItem = null;
  let currentCardUrl = "";
  let currentRecommendUrl = "";

  bindEvents();
  init();

  async function init() {
    try {
      if (!id) throw new Error("缺少名片 id");

      setStatus("正在載入資料…", false);

      const item = await fetchCard(id);
      currentItem = item;

      renderPoster(item);

      currentCardUrl = buildCardUrl(item);
      currentRecommendUrl = buildRecommendUrl(item);

      await ensureQRCodeLib();
      await renderQr(currentCardUrl);

      setStatus("");
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] init error:`, err);
      setStatus(err.message || "載入失敗", true);
    }
  }

  function bindEvents() {
    el.downloadBtn?.addEventListener("click", onDownloadPoster);
    el.openCardBtn?.addEventListener("click", onOpenCard);
    el.copyLinkBtn?.addEventListener("click", onCopyCardLink);
    el.shareCardBtn?.addEventListener("click", onShareCard);
    el.recommendBtn?.addEventListener("click", onRecommend);
    el.helpBtn?.addEventListener("click", openDialog);
    el.lineOABtn?.addEventListener("click", onOpenLineOA);

    el.dialogCloseBtn?.addEventListener("click", closeDialog);

    el.shareDialog?.addEventListener("click", (e) => {
      if (e.target === el.shareDialog) closeDialog();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDialog();
    });
  }

  async function fetchCard(cardId) {
    const url = `${gas}?action=card&id=${encodeURIComponent(cardId)}&_=${Date.now()}`;

    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`讀取名片失敗（HTTP ${res.status}）`);
    }

    const json = await res.json();
    const item = json?.item || json?.data || json;

    if (!item || (!item.id && !item.name)) {
      throw new Error("名片資料格式不正確");
    }

    return item;
  }

  function renderPoster(item) {
    const name = text(item.name) || item.id || "我的智慧名片";
    const title =
      text(item.title) ||
      text(item.unit) ||
      text(item.slogan) ||
      "";

    if (el.cardName) el.cardName.textContent = name;
    if (el.cardTitle) el.cardTitle.textContent = title;

    const avatar =
      text(item.avatar_url) ||
      text(item.avatar_img_fast) ||
      text(item.avatar_img);

    if (el.avatarImg) {
      el.avatarImg.src = avatar || buildDefaultAvatarSvg();
      el.avatarImg.alt = `${name} 頭像`;
      el.avatarImg.onerror = () => {
        el.avatarImg.src = buildDefaultAvatarSvg();
      };
    }
  }

  function buildCardUrl(item) {
    const cardId = text(item.id) || id;
    return `${baseUrl}index.html?id=${encodeURIComponent(cardId)}`;
  }

  function buildRecommendUrl(item) {
    const refId = text(item.id) || id;
    return `${baseUrl}?ref=${encodeURIComponent(refId)}`;
  }

  async function ensureQRCodeLib() {
    if (window.QRCode && typeof window.QRCode.toDataURL === "function") return;

    for (const src of QR_SCRIPT_CANDIDATES) {
      try {
        await loadScript(src);
        if (window.QRCode && typeof window.QRCode.toDataURL === "function") return;
      } catch (err) {
        console.warn(`[HSC Poster ${VERSION}] QR script load failed:`, src, err);
      }
    }

    throw new Error("QRCode 套件載入失敗");
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existed = Array.from(document.scripts).find((s) => s.src === src);
      if (existed) {
        if (window.QRCode) resolve();
        else reject(new Error("script exists but QRCode unavailable"));
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`load fail: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function renderQr(targetUrl) {
    if (!el.qrBox) return;

    el.qrBox.innerHTML = "";
    el.qrBox.style.minHeight = "280px";

    try {
      const dataUrl = await window.QRCode.toDataURL(targetUrl, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#111111",
          light: "#ffffff"
        }
      });

      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "智慧名片 QR code";
      img.decoding = "sync";
      img.loading = "eager";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.display = "block";
      img.style.objectFit = "contain";

      await waitSingleImage(img);
      el.qrBox.innerHTML = "";
      el.qrBox.appendChild(img);
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] QR render fail:`, err);
      el.qrBox.innerHTML = `
        <div style="
          width:100%;
          height:100%;
          min-height:280px;
          display:flex;
          align-items:center;
          justify-content:center;
          text-align:center;
          color:#b42318;
          font-size:14px;
          line-height:1.8;
          padding:16px;
        ">
          QR code 產生失敗
        </div>
      `;
      throw new Error("QR code 產生失敗");
    }
  }

  async function onDownloadPoster() {
    try {
      if (!el.posterCapture) {
        throw new Error("找不到海報區塊");
      }

      setStatus("正在產生海報圖片…", false);

      await waitForImages(el.posterCapture);

      if (!window.html2canvas) {
        await ensureHtml2Canvas();
      }

      const canvas = await window.html2canvas(el.posterCapture, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#fffaf6",
        scale: Math.min(3, window.devicePixelRatio || 2),
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
      });

      const filename = `${safeFileName(currentItem?.name || currentItem?.id || "smart-card")}-poster.png`;

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png", 1);
      link.download = filename;
      link.click();

      setStatus("海報下載完成");
      clearStatusSoon();
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] download error:`, err);
      setStatus(err.message || "海報下載失敗", true);
    }
  }

  async function ensureHtml2Canvas() {
    if (window.html2canvas) return;
    await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
    if (!window.html2canvas) {
      throw new Error("html2canvas 載入失敗");
    }
  }

  function onOpenCard() {
    if (!currentCardUrl) return;
    window.location.href = currentCardUrl;
  }

  async function onCopyCardLink() {
    if (!currentCardUrl) return;
    const ok = await copyText(currentCardUrl);
    setStatus(ok ? "名片連結已複製" : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

  async function onShareCard() {
    if (!currentCardUrl) return;

    const shareData = {
      title: currentItem?.name ? `${currentItem.name} 的智慧名片` : "我的智慧名片",
      text: "這是我的智慧名片，歡迎查看。",
      url: currentCardUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setStatus("已開啟分享");
        clearStatusSoon();
        return;
      }

      const ok = await copyText(currentCardUrl);
      setStatus(ok ? "已改為複製名片連結" : "分享失敗，請手動複製", !ok);
      clearStatusSoon();
    } catch (err) {
      if (err && err.name === "AbortError") return;
      const ok = await copyText(currentCardUrl);
      setStatus(ok ? "已改為複製名片連結" : "分享失敗，請手動複製", !ok);
      clearStatusSoon();
    }
  }

  async function onRecommend() {
    if (!currentRecommendUrl) return;
    const ok = await copyText(currentRecommendUrl);
    setStatus(ok ? "推薦智慧名片館連結已複製" : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

  function onOpenLineOA() {
    if (!lineOA) return;
    window.location.href = lineOA;
  }

  function openDialog() {
    if (!el.shareDialog) return;
    el.shareDialog.classList.add("show");
    el.shareDialog.setAttribute("aria-hidden", "false");
  }

  function closeDialog() {
    if (!el.shareDialog) return;
    el.shareDialog.classList.remove("show");
    el.shareDialog.setAttribute("aria-hidden", "true");
  }

  function setStatus(message, isError = false) {
    if (!el.statusText) return;

    if (!message) {
      el.statusText.textContent = "";
      el.statusText.classList.remove("error");
      return;
    }

    el.statusText.textContent = message;
    el.statusText.classList.toggle("error", !!isError);
  }

  function clearStatusSoon() {
    window.clearTimeout(clearStatusSoon._t);
    clearStatusSoon._t = window.setTimeout(() => {
      setStatus("");
    }, 1800);
  }

  function text(v) {
    return String(v || "").trim();
  }

  function normalizeBase(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.endsWith("/") ? s : `${s}/`;
  }

  function safeFileName(v) {
    return String(v || "poster")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }

  function buildDefaultAvatarSvg() {
    return "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
        <rect width="320" height="320" rx="160" fill="#eadfd4"/>
        <circle cx="160" cy="122" r="58" fill="#d0b8a3"/>
        <rect x="72" y="202" width="176" height="84" rx="42" fill="#d0b8a3"/>
      </svg>
    `);
  }

  function waitSingleImage(img) {
    return new Promise((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load fail"));
    });
  }

  function waitForImages(root) {
    const images = Array.from(root.querySelectorAll("img"));
    if (!images.length) return Promise.resolve();

    return Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();

        return new Promise((resolve) => {
          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      })
    );
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return legacyCopyText(value);
    } catch (err) {
      return legacyCopyText(value);
    }
  }

  function legacyCopyText(value) {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch (err) {
      return false;
    }
  }
})();