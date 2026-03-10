/* ==========================================
 * HSC Poster v709.5
 * COMPLETE OVERWRITE
 *
 * 封存版：
 * 1. 保留 v709.4 純 canvas 生成海報穩定流程
 * 2. 視覺微調，不動生成主幹
 * 3. QR 可掃描、可點擊
 * 4. 文案定稿
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "709.5";

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
    el.downloadBtn?.addEventListener("click", onGeneratePoster);
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

  async function onGeneratePoster() {
    try {
      disableButton(el.downloadBtn, true);
      setStatus("正在產生海報圖片…", false);

      await waitForFonts();

      const dataUrl = await buildPosterImageDataUrl();

      const filename = `${safeFileName(
        currentItem?.name || currentItem?.id || "smart-card"
      )}-poster.png`;

      showImagePage(dataUrl, filename);

    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] generate error:`, err);
      setStatus(`海報產生失敗：${err.message || "請重試"}`, true);
      disableButton(el.downloadBtn, false);
    }
  }

  async function buildPosterImageDataUrl() {
    if (!currentCardUrl) {
      throw new Error("名片連結尚未建立");
    }

    const qrCanvas = await buildQrCanvas(currentCardUrl, 880);

    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("無法建立畫布");
    }

    drawBackground(ctx, width, height);
    drawMainCard(ctx, width, height);
    drawHeader(ctx, width);
    drawDeliveryPill(ctx, width);

    const name = text(currentItem?.name) || text(currentItem?.id) || "我的智慧名片";
    const title =
      text(currentItem?.title) ||
      text(currentItem?.unit) ||
      text(currentItem?.slogan) ||
      "";

    drawNameAndTitle(ctx, width, name, title);
    drawQrBlock(ctx, width, qrCanvas);
    drawFooterTips(ctx, width);

    return canvas.toDataURL("image/png", 0.96);
  }

  async function buildQrCanvas(targetUrl, size = 880) {
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-99999px";
    wrap.style.top = "-99999px";
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    wrap.style.pointerEvents = "none";
    wrap.style.opacity = "0";
    document.body.appendChild(wrap);

    try {
      new window.QRCode(wrap, {
        text: targetUrl,
        width: size,
        height: size,
        colorDark: "#2f241d",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H
      });

      await wait(260);

      const nodeCanvas = wrap.querySelector("canvas");
      if (nodeCanvas) return nodeCanvas;

      const img = wrap.querySelector("img");
      if (img && img.src) {
        const loaded = await createImage(img.src);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(loaded, 0, 0, size, size);
        return canvas;
      }

      throw new Error("QR 生成失敗");
    } finally {
      wrap.remove();
    }
  }

  function drawBackground(ctx, width, height) {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#f8f4ee");
    bg.addColorStop(1, "#f3ece3");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width / 2, 150, 40, width / 2, 150, 620);
    glow.addColorStop(0, "rgba(255,255,255,.92)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, 520);
  }

  function drawMainCard(ctx, width, height) {
    roundRect(ctx, 66, 74, width - 132, height - 148, 44);
    const cardGrad = ctx.createLinearGradient(0, 74, 0, height - 74);
    cardGrad.addColorStop(0, "rgba(255,253,250,.98)");
    cardGrad.addColorStop(1, "rgba(255,248,241,.98)");
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(102,78,57,.09)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, 66, 74, width - 132, 220, 44);
    ctx.clip();

    const topGlow = ctx.createLinearGradient(0, 74, 0, 294);
    topGlow.addColorStop(0, "rgba(255,255,255,.76)");
    topGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(66, 74, width - 132, 220);
    ctx.restore();
  }

  function drawHeader(ctx, width) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "700 40px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#b6855e";
    ctx.fillText("☀", width / 2, 150);

    ctx.font = "900 50px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#433227";
    ctx.fillText("天使幸福智慧名片", width / 2, 220);

    ctx.font = "700 24px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#9c8b7f";
    ctx.fillText("Angel Smart Card", width / 2, 270);
  }

  function drawDeliveryPill(ctx, width) {
    const pillW = 360;
    const pillH = 68;
    const x = (width - pillW) / 2;
    const y = 315;

    roundRect(ctx, x, y, pillW, pillH, 999);
    const grad = ctx.createLinearGradient(0, y, 0, y + pillH);
    grad.addColorStop(0, "#fffefb");
    grad.addColorStop(1, "#fbf3e9");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(191,135,87,.13)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 28px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#9a6a44";
    ctx.fillText("智慧名片交付卡", width / 2, y + pillH / 2 + 1);
  }

  function drawNameAndTitle(ctx, width, name, title) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxNameWidth = width - 220;
    let nameFont = 64;
    while (nameFont > 40) {
      ctx.font = `900 ${nameFont}px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif`;
      if (ctx.measureText(name).width <= maxNameWidth) break;
      nameFont -= 2;
    }

    ctx.fillStyle = "#433227";
    ctx.font = `900 ${nameFont}px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif`;
    ctx.fillText(name, width / 2, 495);

    if (title) {
      const lines = wrapTextByWidth(ctx, title, width - 320, 32);
      ctx.fillStyle = "#6b5a4d";
      ctx.font = "500 32px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      let y = 575;
      lines.slice(0, 2).forEach((line) => {
        ctx.fillText(line, width / 2, y);
        y += 48;
      });
    }
  }

  function drawQrBlock(ctx, width, qrCanvas) {
    const frameX = 160;
    const frameY = 690;
    const frameW = 760;
    const frameH = 760;

    roundRect(ctx, frameX, frameY, frameW, frameH, 38);
    const frameGrad = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
    frameGrad.addColorStop(0, "#ffffff");
    frameGrad.addColorStop(1, "#fffdfb");
    ctx.fillStyle = frameGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,.035)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const qrBoxX = 205;
    const qrBoxY = 735;
    const qrBoxSize = 670;

    roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.035)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.drawImage(qrCanvas, qrBoxX + 10, qrBoxY + 10, qrBoxSize - 20, qrBoxSize - 20);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6b5a4d";

    ctx.font = "800 28px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillText("掃描或點擊 QR Code", width / 2, 1490);
    ctx.fillText("即可查看完整智慧名片", width / 2, 1536);
  }

  function drawFooterTips(ctx, width) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8d7d70";
    ctx.font = "500 23px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillText("分享海報給朋友或客戶掃描，即可快速查看名片。", width / 2, 1650);
  }

  function showImagePage(dataUrl, filename) {
    document.open();
    document.write(`
      <!doctype html>
      <html lang="zh-Hant">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
        <title>${escapeHtml(filename)}</title>
        <style>
          html,body{
            margin:0;
            padding:0;
            background:#121212;
            min-height:100%;
            font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;
          }
          .wrap{
            min-height:100vh;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            padding:24px 16px 28px;
            gap:18px;
          }
          .tip{
            text-align:center;
            color:rgba(255,255,255,.88);
            font-size:15px;
            line-height:1.75;
            white-space:normal;
          }
          img{
            max-width:100%;
            height:auto;
            display:block;
            border-radius:18px;
            box-shadow:0 16px 40px rgba(0,0,0,.42);
            background:#fff;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="tip">海報已開啟<br><br>長按圖片即可保存到相簿<br>可分享給朋友或客戶掃描查看</div>
          <img src="${dataUrl}" alt="poster">
        </div>
      </body>
      </html>
    `);
    document.close();
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

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready.catch(() => {});
    }
    return Promise.resolve();
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

  function createImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.src = src;
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

  function wrapTextByWidth(ctx, textValue, maxWidth, fontSize) {
    const chars = Array.from(String(textValue || ""));
    const lines = [];
    let line = "";

    ctx.font = `500 ${fontSize}px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif`;

    for (const ch of chars) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    roundRectPath(ctx, x, y, w, h, r);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function disableButton(button, disabled) {
    if (!button) return;
    button.disabled = !!disabled;
    button.style.opacity = disabled ? "0.72" : "";
    button.style.cursor = disabled ? "wait" : "";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();