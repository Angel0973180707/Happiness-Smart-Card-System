/* ==========================================
 * HSC Poster v709.3
 * COMPLETE OVERWRITE
 *
 * 根源排除穩定版：
 * 1. 保留現有米白商用版 UI
 * 2. 保留 QR 本體、QR 點擊開名片、所有按鈕文案
 * 3. 手機下載海報仍走：直接開圖 → 長按保存
 * 4. 匯出海報時「忽略 QR 中央頭像」以排查失敗根源
 * 5. 匯出時只截最核心海報區塊，降低疊層風險
 * 6. 不改主幹結構，只做最小排除
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "709.3";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA =
    "https://lin.ee/3r2ZePN";

  const qs = new URLSearchParams(location.search);
  const id = (qs.get("id") || "").trim();
  const gas = (qs.get("gas") || DEFAULT_GAS).trim();
  const baseUrl = normalizeBase(qs.get("base") || DEFAULT_BASE);
  const lineOA = (qs.get("lineoa") || DEFAULT_LINE_OA).trim();

  const el = {
    avatarImg: document.getElementById("avatarImg"),
    cardName: document.getElementById("cardName"),
    cardTitle: document.getElementById("cardTitle"),
    qrViewport: document.getElementById("qrViewport"),
    qrCenterAvatar: document.getElementById("qrCenterAvatar"),
    qrCenterAvatarImg: document.getElementById("qrCenterAvatarImg"),
    qrLinkFallback: document.getElementById("qrLinkFallback"),
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
  let currentAvatarUrl = "";

  bindEvents();
  init();

  async function init() {
    try {
      if (!id) throw new Error("缺少名片 id");
      if (typeof window.QRCode === "undefined") {
        throw new Error("缺少 qrcode.min.js");
      }
      if (typeof window.html2canvas === "undefined") {
        throw new Error("缺少 html2canvas");
      }

      setStatus("正在載入資料…", false);

      const item = await fetchCard(id);
      currentItem = item;

      currentCardUrl = buildCardUrl(item);
      currentRecommendUrl = buildRecommendUrl(item);
      currentAvatarUrl = getAvatarUrl(item);

      renderPoster(item);
      await renderQrLocal(currentCardUrl);
      await renderQrCenterAvatar(currentAvatarUrl);

      setStatus("");
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] init error:`, err);
      renderPoster(null);
      renderQrFallback(currentCardUrl || "");
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

    el.qrBox?.addEventListener("click", () => {
      if (currentCardUrl) {
        window.open(currentCardUrl, "_blank", "noopener");
      }
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

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error("名片資料不是有效 JSON");
    }

    const item = json?.item || json?.data || json;
    if (!item || typeof item !== "object") {
      throw new Error("名片資料格式不正確");
    }

    return item;
  }

  function renderPoster(item) {
    const name = text(item?.name) || text(item?.id) || "我的智慧名片";
    const title =
      text(item?.title) ||
      text(item?.unit) ||
      text(item?.slogan) ||
      "";

    if (el.cardName) el.cardName.textContent = name;
    if (el.cardTitle) el.cardTitle.textContent = title;

    const avatar = getAvatarUrl(item);

    if (el.avatarImg) {
      el.avatarImg.alt = `${name} 頭像`;
      el.avatarImg.onerror = () => {
        el.avatarImg.onerror = null;
        el.avatarImg.src = buildDefaultAvatarSvg();
      };
      el.avatarImg.src = avatar || buildDefaultAvatarSvg();
    }
  }

  function getAvatarUrl(item) {
    return (
      text(item?.avatar_url) ||
      text(item?.avatar_img_fast) ||
      text(item?.avatar_img)
    );
  }

  function buildCardUrl(item) {
    const cardId = text(item?.id) || id;
    return `${baseUrl}index.html?id=${encodeURIComponent(cardId)}&view=1`;
  }

  function buildRecommendUrl(item) {
    const refId = text(item?.id) || id;
    return `${baseUrl}?ref=${encodeURIComponent(refId)}`;
  }

  async function renderQrLocal(targetUrl) {
    if (!el.qrViewport) return;

    hideQrFallback();
    el.qrViewport.innerHTML = "";

    const mount = document.createElement("div");
    mount.style.width = "100%";
    mount.style.height = "100%";
    mount.style.display = "flex";
    mount.style.alignItems = "center";
    mount.style.justifyContent = "center";
    el.qrViewport.appendChild(mount);

    new window.QRCode(mount, {
      text: targetUrl,
      width: 900,
      height: 900,
      colorDark: "#2f241d",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });

    await wait(240);

    const img = mount.querySelector("img");
    const canvas = mount.querySelector("canvas");
    const table = mount.querySelector("table");

    if (img) {
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.display = "block";
      img.style.objectFit = "contain";
      img.style.imageRendering = "pixelated";
      return;
    }

    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.objectFit = "contain";
      canvas.style.imageRendering = "pixelated";
      return;
    }

    if (table) {
      table.style.width = "100%";
      table.style.height = "100%";
      table.style.borderCollapse = "collapse";
      table.style.background = "#fff";
      table.querySelectorAll("td").forEach((td) => {
        td.style.padding = "0";
        td.style.margin = "0";
      });
      return;
    }

    renderQrFallback(targetUrl);
    setStatus("QR 產生失敗，已改顯示名片連結", true);
  }

  async function renderQrCenterAvatar(avatarUrl) {
    if (!el.qrCenterAvatar || !el.qrCenterAvatarImg) return;

    if (!avatarUrl) {
      el.qrCenterAvatar.classList.remove("show");
      el.qrCenterAvatarImg.removeAttribute("src");
      return;
    }

    const ok = await loadImage(
      el.qrCenterAvatarImg,
      avatarUrl,
      buildDefaultAvatarSvg()
    );

    if (ok) {
      el.qrCenterAvatar.classList.add("show");
    } else {
      el.qrCenterAvatar.classList.remove("show");
    }
  }

  function renderQrFallback(url) {
    if (el.qrViewport) el.qrViewport.innerHTML = "";
    if (el.qrCenterAvatar) el.qrCenterAvatar.classList.remove("show");

    if (el.qrLinkFallback) {
      el.qrLinkFallback.classList.add("show");
      el.qrLinkFallback.textContent = url
        ? `名片連結：${url}`
        : "QR 暫時無法顯示";
    }
  }

  function hideQrFallback() {
    if (el.qrLinkFallback) {
      el.qrLinkFallback.classList.remove("show");
      el.qrLinkFallback.textContent = "";
    }
  }

  async function onDownloadPoster() {
    try {
      disableButton(el.downloadBtn, true);
      setStatus("正在產生海報圖片…", false);

      if (!el.posterCapture) throw new Error("找不到海報區塊");

      await waitForImages(el.posterCapture);
      await wait(120);

      const canvas = await capturePosterCanvas(el.posterCapture);

      const filename = `${safeFileName(
        currentItem?.name || currentItem?.id || "smart-card"
      )}-poster.png`;

      const dataUrl = canvas.toDataURL("image/png", 0.96);

      if (isMobileDevice()) {
        showImagePage(dataUrl, filename);
        return;
      }

      triggerDownload(dataUrl, filename);
      setStatus("海報下載完成", false);
      clearStatusSoon();

    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] download error:`, err);
      setStatus("海報產生失敗，請重試", true);
    } finally {
      disableButton(el.downloadBtn, false);
    }
  }

  async function capturePosterCanvas(targetEl) {
    const scale = isMobileDevice() ? 2 : 3;

    return window.html2canvas(targetEl, {
      backgroundColor: "#fffaf5",
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
      removeContainer: true,
      foreignObjectRendering: false,

      ignoreElements(node) {
        if (!node || node.nodeType !== 1) return false;

        if (node.id === "qrCenterAvatar") return true;
        if (node.id === "statusText") return true;

        return false;
      },

      onclone(clonedDoc) {
        const clonedCapture = clonedDoc.getElementById("posterCapture");
        if (!clonedCapture) return;

        const clonedQrCenterAvatar = clonedDoc.getElementById("qrCenterAvatar");
        if (clonedQrCenterAvatar) {
          clonedQrCenterAvatar.remove();
        }

        const clonedFallback = clonedDoc.getElementById("qrLinkFallback");
        if (clonedFallback && !clonedFallback.classList.contains("show")) {
          clonedFallback.remove();
        }

        clonedCapture.style.transform = "none";
        clonedCapture.style.filter = "none";
        clonedCapture.style.transition = "none";
        clonedCapture.style.animation = "none";
        clonedCapture.style.width = `${Math.ceil(targetEl.getBoundingClientRect().width)}px`;
        clonedCapture.style.maxWidth = "none";
        clonedCapture.style.margin = "0";
        clonedCapture.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,.8)";
        clonedCapture.style.background = "linear-gradient(180deg, #fffefd 0%, #fffaf5 100%)";

        const clonedQrFrame = clonedDoc.querySelector(".qr-frame");
        if (clonedQrFrame) {
          clonedQrFrame.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,.82)";
        }

        const clonedAvatarWrap = clonedDoc.querySelector(".avatar-wrap");
        if (clonedAvatarWrap) {
          clonedAvatarWrap.style.boxShadow = "0 6px 14px rgba(88,67,48,.06)";
        }

        const allButtons = clonedDoc.querySelectorAll("button");
        allButtons.forEach((btn) => btn.remove());
      }
    });
  }

  function showImagePage(dataUrl, filename) {
    document.documentElement.innerHTML = `
      <html lang="zh-Hant">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
        <title>${escapeHtml(filename)}</title>
        <style>
          html,body{
            margin:0;
            padding:0;
            background:#111;
            min-height:100%;
            font-family:system-ui,-apple-system,sans-serif;
          }
          .wrap{
            min-height:100vh;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            padding:16px;
            gap:14px;
          }
          .tip{
            color:rgba(255,255,255,.88);
            font-size:15px;
            line-height:1.6;
            text-align:center;
          }
          img{
            max-width:100%;
            height:auto;
            display:block;
            border-radius:14px;
            box-shadow:0 14px 36px rgba(0,0,0,.45);
            background:#fff;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="tip">海報已開啟，請長按圖片保存到相簿</div>
          <img src="${dataUrl}" alt="poster">
        </div>
      </body>
      </html>
    `;
  }

  function triggerDownload(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function onOpenCard() {
    if (!currentCardUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }
    window.open(currentCardUrl, "_blank", "noopener");
  }

  async function onCopyCardLink() {
    if (!currentCardUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }
    const ok = await copyText(currentCardUrl);
    setStatus(ok ? "名片連結已複製" : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

  async function onShareCard() {
    if (!currentCardUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }

    const shareData = {
      title: currentItem?.name ? `${currentItem.name} 的智慧名片` : "我的智慧名片",
      text: "這是我的智慧名片，歡迎查看。",
      url: currentCardUrl
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
      if (err?.name === "AbortError") return;
      const ok = await copyText(currentCardUrl);
      setStatus(ok ? "已改為複製名片連結" : "分享失敗，請手動複製", !ok);
      clearStatusSoon();
    }
  }

  async function onRecommend() {
    if (!currentRecommendUrl) {
      setStatus("推薦連結尚未建立", true);
      return;
    }
    const ok = await copyText(currentRecommendUrl);
    setStatus(ok ? "推薦天使智慧名片連結已複製" : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

  function onOpenLineOA() {
    if (!lineOA) {
      setStatus("LINE 官方帳號連結未設定", true);
      return;
    }
    window.open(lineOA, "_blank", "noopener");
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
    el.statusText.textContent = message || "";
    el.statusText.classList.toggle("error", !!isError);
  }

  function clearStatusSoon() {
    window.clearTimeout(clearStatusSoon._timer);
    clearStatusSoon._timer = window.setTimeout(() => {
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

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  function loadImage(imgEl, src, fallback = "") {
    return new Promise((resolve) => {
      if (!imgEl) return resolve(false);

      let triedFallback = false;

      imgEl.onload = () => resolve(true);
      imgEl.onerror = () => {
        if (!triedFallback && fallback) {
          triedFallback = true;
          imgEl.src = fallback;
          return;
        }
        resolve(false);
      };

      imgEl.src = src;
    });
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return legacyCopyText(value);
    } catch {
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
    } catch {
      return false;
    }
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function disableButton(button, disabled) {
    if (!button) return;
    button.disabled = !!disabled;
    button.style.opacity = disabled ? "0.72" : "";
    button.style.cursor = disabled ? "wait" : "";
  }
})();