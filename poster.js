/* ==========================================
 * HSC Poster v707.1
 * COMPLETE OVERWRITE
 *
 * 修正重點：
 * 1. 手機下載海報過慢 / 卡住
 * 2. html2canvas 降負載
 * 3. 只截海報主卡，不截整頁
 * 4. 失敗時提供開圖備援
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "707.1";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA = "https://lin.ee/3r2ZePN";

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
    qrFallback: document.getElementById("qrFallback"),
    qrCenterAvatar: document.getElementById("qrCenterAvatar"),
    qrCenterAvatarImg: document.getElementById("qrCenterAvatarImg"),

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
        throw new Error("缺少 qrcode.min.js，請確認檔案已放在 poster.html 同層");
      }

      setStatus("正在載入資料…", false);

      const item = await fetchCard(id);
      currentItem = item;

      currentCardUrl = buildCardUrl(item);
      currentRecommendUrl = buildRecommendUrl(item);
      currentAvatarUrl = getAvatarUrl(item);

      renderPoster(item);
      await renderQrLocal(currentCardUrl, currentAvatarUrl);

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
    return `${baseUrl}index.html?id=${encodeURIComponent(cardId)}`;
  }

  function buildRecommendUrl(item) {
    const refId = text(item?.id) || id;
    return `${baseUrl}?ref=${encodeURIComponent(refId)}`;
  }

  async function renderQrLocal(targetUrl, avatarUrl) {
    try {
      if (!el.qrViewport) throw new Error("找不到 QR 區塊");

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
        width: 640,
        height: 640,
        colorDark: "#2f241d",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H
      });

      await wait(120);

      const qrNode = normalizeQrNode(mount);
      if (!qrNode) {
        throw new Error("本地 QR 生成失敗");
      }

      await renderCenterAvatar(avatarUrl);
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] QR render error:`, err);
      renderQrFallback(targetUrl);
      setStatus("QR 產生失敗，已顯示名片連結", true);
    }
  }

  function normalizeQrNode(root) {
    const img = root.querySelector("img");
    const canvas = root.querySelector("canvas");
    const table = root.querySelector("table");

    if (img) {
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.display = "block";
      img.style.objectFit = "contain";
      img.style.imageRendering = "pixelated";
      return img;
    }

    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.objectFit = "contain";
      canvas.style.imageRendering = "pixelated";
      return canvas;
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
      return table;
    }

    return null;
  }

  async function renderCenterAvatar(avatarUrl) {
    if (!el.qrCenterAvatar || !el.qrCenterAvatarImg) return;

    if (!avatarUrl) {
      el.qrCenterAvatar.classList.remove("show");
      el.qrCenterAvatarImg.removeAttribute("src");
      return;
    }

    const ok = await loadImage(el.qrCenterAvatarImg, avatarUrl, buildDefaultAvatarSvg());
    if (ok) {
      el.qrCenterAvatar.classList.add("show");
    } else {
      el.qrCenterAvatar.classList.remove("show");
    }
  }

  function renderQrFallback(url) {
    if (el.qrViewport) el.qrViewport.innerHTML = "";
    if (el.qrCenterAvatar) el.qrCenterAvatar.classList.remove("show");

    if (el.qrFallback) {
      el.qrFallback.classList.add("show");
      el.qrFallback.textContent = url
        ? `名片連結：${url}`
        : "QR 暫時無法顯示";
    }
  }

  function hideQrFallback() {
    if (el.qrFallback) {
      el.qrFallback.classList.remove("show");
      el.qrFallback.textContent = "";
    }
  }

  async function onDownloadPoster() {
    try {
      if (!el.posterCapture) throw new Error("找不到海報區塊");
      if (!window.html2canvas) throw new Error("html2canvas 未載入");

      setStatus("正在產生海報圖片…", false);
      disableDownloadBtn(true);

      await waitForImages(el.posterCapture);

      const exportNode = el.posterCapture.cloneNode(true);
      optimizeExportNode(exportNode, el.posterCapture.offsetWidth);

      document.body.appendChild(exportNode);
      await waitForImages(exportNode);

      const scale = getSafeScale();

      const canvas = await promiseWithTimeout(
        window.html2canvas(exportNode, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#fffaf6",
          scale,
          logging: false,
          imageTimeout: 12000,
          removeContainer: true
        }),
        15000,
        "海報產生逾時"
      );

      safeRemove(exportNode);

      const filename = `${safeFileName(currentItem?.name || currentItem?.id || "smart-card")}-poster.png`;

      const dataUrl = canvas.toDataURL("image/png", 0.95);

      if (isMobileDevice()) {
        openImageInNewTab(dataUrl, filename);
        setStatus("海報已開啟，請長按圖片保存", false);
      } else {
        triggerDownload(dataUrl, filename);
        setStatus("海報下載完成", false);
      }

      clearStatusSoon();
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] download error:`, err);
      setStatus("手機下載較吃效能，建議改用長按截圖或再次重試", true);
    } finally {
      disableDownloadBtn(false);
    }
  }

  function optimizeExportNode(node, width) {
    node.style.width = `${width}px`;
    node.style.position = "fixed";
    node.style.left = "-99999px";
    node.style.top = "0";
    node.style.margin = "0";
    node.style.transform = "none";
    node.style.zIndex = "-1";
    node.style.pointerEvents = "none";
    node.style.boxShadow = "none";

    node.querySelectorAll("*").forEach((child) => {
      const style = child.style;
      if (!style) return;
      if (style.animation) style.animation = "none";
      if (style.transition) style.transition = "none";
    });
  }

  function getSafeScale() {
    const dpr = window.devicePixelRatio || 1;
    if (isMobileDevice()) return Math.min(2, dpr, 1.8);
    return Math.min(2.2, dpr || 2);
  }

  function disableDownloadBtn(disabled) {
    if (!el.downloadBtn) return;
    el.downloadBtn.disabled = !!disabled;
    el.downloadBtn.style.opacity = disabled ? ".72" : "";
    el.downloadBtn.style.cursor = disabled ? "wait" : "";
  }

  function openImageInNewTab(dataUrl, filename) {
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <!doctype html>
      <html lang="zh-Hant">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${escapeHtml(filename)}</title>
        <style>
          body{
            margin:0;
            background:#111;
            display:flex;
            align-items:center;
            justify-content:center;
            min-height:100vh;
          }
          img{
            max-width:100%;
            height:auto;
            display:block;
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="poster">
      </body>
      </html>
    `);
    w.document.close();
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
    window.location.href = currentCardUrl;
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
    setStatus(ok ? "推薦智慧名片館連結已複製" : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

  function onOpenLineOA() {
    if (!lineOA) {
      setStatus("LINE 官方帳號連結未設定", true);
      return;
    }
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
    el.statusText.textContent = message || "";
    el.statusText.classList.toggle("error", !!isError);
  }

  function clearStatusSoon() {
    window.clearTimeout(clearStatusSoon._timer);
    clearStatusSoon._timer = window.setTimeout(() => setStatus(""), 1800);
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

  function promiseWithTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message || "timeout")), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  function safeRemove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
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
})();