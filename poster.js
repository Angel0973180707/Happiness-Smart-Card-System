/* ==========================================
 * HSC Poster v3.0
 * COMPLETE OVERWRITE
 *
 * 本版目標：
 * 1. LINE 官方帳號按鈕整排
 * 2. 分享說明 Dialog
 * 3. QR code 尺寸 / 留白優化
 * 4. 海報下載穩定
 * 5. 兼容 WeChat WebView 基本行為
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "3.0";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA = "https://lin.ee/3r2ZePN";

  const qs = new URLSearchParams(location.search);
  const id = (qs.get("id") || "").trim();
  const gas = (qs.get("gas") || DEFAULT_GAS).trim();
  const baseUrl = (qs.get("base") || DEFAULT_BASE).trim();
  const lineOA = (qs.get("lineoa") || DEFAULT_LINE_OA).trim();

  const el = {
    avatarImg: document.getElementById("avatarImg"),
    cardName: document.getElementById("cardName"),
    cardTitle: document.getElementById("cardTitle"),
    qrBox: document.getElementById("qrBox"),
    posterCapture: document.getElementById("posterCapture"),
    downloadBtn: document.getElementById("downloadBtn"),
    lineOABtn: document.getElementById("lineOABtn"),
    shareHelpBtn: document.getElementById("shareHelpBtn"),
    shareDialog: document.getElementById("shareDialog"),
    dialogCloseBtn: document.getElementById("dialogCloseBtn"),
    loadingText: document.getElementById("loadingText"),
    errorText: document.getElementById("errorText"),
  };

  let currentCardUrl = "";
  let currentItem = null;

  init().catch(showError);

  async function init() {
    bindEvents();

    if (!id) {
      throw new Error("缺少名片 id");
    }

    const item = await fetchCard(id);
    currentItem = item;

    renderCard(item);
    await renderQr(buildCardUrl(item));
    setLoading(false);
  }

  function bindEvents() {
    if (el.downloadBtn) {
      el.downloadBtn.addEventListener("click", downloadPoster);
    }

    if (el.lineOABtn) {
      el.lineOABtn.addEventListener("click", () => {
        if (!lineOA) return;
        location.href = lineOA;
      });
    }

    if (el.shareHelpBtn) {
      el.shareHelpBtn.addEventListener("click", openDialog);
    }

    if (el.dialogCloseBtn) {
      el.dialogCloseBtn.addEventListener("click", closeDialog);
    }

    if (el.shareDialog) {
      el.shareDialog.addEventListener("click", (e) => {
        if (e.target === el.shareDialog) closeDialog();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDialog();
    });
  }

  async function fetchCard(cardId) {
    const url = `${gas}?action=card&id=${encodeURIComponent(cardId)}&_=${Date.now()}`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      mode: "cors"
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

  function renderCard(item) {
    const name = safeText(item.name) || item.id || "我的智慧名片";
    const title =
      safeText(item.title) ||
      safeText(item.unit) ||
      safeText(item.slogan) ||
      "歡迎掃碼查看我的智慧名片";

    if (el.cardName) el.cardName.textContent = name;
    if (el.cardTitle) el.cardTitle.textContent = title;

    const avatar =
      item.avatar_url ||
      item.avatar_img_fast ||
      item.avatar_img ||
      "";

    if (el.avatarImg) {
      if (avatar) {
        el.avatarImg.src = avatar;
        el.avatarImg.alt = `${name} 頭像`;
        el.avatarImg.onerror = () => {
          el.avatarImg.src =
            "data:image/svg+xml;utf8," +
            encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
                <rect width="100%" height="100%" fill="#eadfd4"/>
                <circle cx="150" cy="118" r="54" fill="#d0b8a3"/>
                <rect x="70" y="190" width="160" height="70" rx="35" fill="#d0b8a3"/>
              </svg>
            `);
        };
      } else {
        el.avatarImg.src =
          "data:image/svg+xml;utf8," +
          encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
              <rect width="100%" height="100%" fill="#eadfd4"/>
              <circle cx="150" cy="118" r="54" fill="#d0b8a3"/>
              <rect x="70" y="190" width="160" height="70" rx="35" fill="#d0b8a3"/>
            </svg>
          `);
      }
    }
  }

  function buildCardUrl(item) {
    const cardId = item.id || id;
    currentCardUrl = `${baseUrl}index.html?id=${encodeURIComponent(cardId)}`;
    return currentCardUrl;
  }

  async function renderQr(text) {
    if (!el.qrBox) return;

    el.qrBox.innerHTML = "";

    const canvas = document.createElement("canvas");
    el.qrBox.appendChild(canvas);

    await QRCode.toCanvas(canvas, text, {
      width: 340,
      margin: 2,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    canvas.setAttribute("aria-label", "智慧名片 QR code");
  }

  async function downloadPoster() {
    try {
      setLoading(true, "正在產生海報圖片…");

      const node = el.posterCapture;
      if (!node) throw new Error("找不到海報區塊");

      const canvas = await html2canvas(node, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#fffaf6",
        scale: Math.min(3, window.devicePixelRatio || 2),
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
      });

      const name = safeFileName(currentItem?.name || currentItem?.id || "smart-card");
      const link = document.createElement("a");
      link.download = `${name}-poster.png`;
      link.href = canvas.toDataURL("image/png", 1);
      link.click();

      setLoading(false);
    } catch (err) {
      showError(err);
    }
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

  function setLoading(loading, text = "正在載入海報資料…") {
    if (!el.loadingText) return;

    if (loading) {
      el.loadingText.style.display = "block";
      el.loadingText.textContent = text;
    } else {
      el.loadingText.style.display = "none";
    }
  }

  function showError(err) {
    console.error(`[Poster ${VERSION}]`, err);
    setLoading(false);

    if (el.errorText) {
      el.errorText.style.display = "block";
      el.errorText.textContent = err?.message || "發生錯誤，請稍後再試";
    }
  }

  function safeText(v) {
    return String(v || "").trim();
  }

  function safeFileName(v) {
    return String(v || "poster")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }
})();