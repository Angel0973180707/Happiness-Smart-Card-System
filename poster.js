/* ==========================================
 * HSC Poster v707.2
 * COMPLETE OVERWRITE
 *
 * 修正重點：
 * 1. 放棄 html2canvas 截圖下載
 * 2. 改用原生 Canvas 直接合成海報
 * 3. 手機下載更穩
 * 4. 保留本地 QR 生成 + 中央頭像
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "707.2";

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
      if (!qrNode) throw new Error("本地 QR 生成失敗");

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
      setStatus("正在產生海報圖片…", false);
      disableDownloadBtn(true);

      const posterCanvas = await buildPosterCanvas();
      const filename = `${safeFileName(currentItem?.name || currentItem?.id || "smart-card")}-poster.png`;

      const dataUrl = posterCanvas.toDataURL("image/png", 0.96);

      if (isMobileDevice()) {
        openImageInNewTab(dataUrl, filename);
        setStatus("海報已開啟，請長按圖片保存", false);
      } else {
        triggerDownload(dataUrl, filename);
        setStatus("海報下載完成", false);
      }

      clearStatusSoon();
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] canvas export error:`, err);
      setStatus("海報產生失敗，請重試", true);
    } finally {
      disableDownloadBtn(false);
    }
  }

  async function buildPosterCanvas() {
    const width = 1080;
    const height = 1560;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const avatarImg = await loadImageElement(currentAvatarUrl || buildDefaultAvatarSvg(), buildDefaultAvatarSvg());
    const qrSource = await getQrDrawable();
    const qrAvatarImg = await loadImageElement(currentAvatarUrl || buildDefaultAvatarSvg(), buildDefaultAvatarSvg());

    drawBackground(ctx, width, height);
    drawMainCard(ctx, 26, 26, width - 52, height - 52, 42);

    drawTopBrand(ctx, width);
    drawPosterBody(ctx, width);

    drawAvatarCircle(ctx, avatarImg, width / 2, 240, 102);

    drawCenteredText(ctx, text(currentItem?.name) || text(currentItem?.id) || "我的智慧名片", width / 2, 410, {
      font: "900 66px 'Noto Sans TC', sans-serif",
      color: "#453429"
    });

    const titleText =
      text(currentItem?.title) ||
      text(currentItem?.unit) ||
      text(currentItem?.slogan) ||
      "";

    drawCenteredMultiLine(ctx, titleText, width / 2, 490, 760, 54, {
      font: "500 34px 'Noto Sans TC', sans-serif",
      color: "#6f5d50"
    });

    const qrFrameX = 138;
    const qrFrameY = 600;
    const qrFrameW = 804;
    const qrFrameH = 804;

    drawRoundRect(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, 44, "#ffffff");
    addSoftShadow(ctx);

    drawRoundRect(ctx, qrFrameX + 28, qrFrameY + 28, qrFrameW - 56, qrFrameH - 56, 34, "#ffffff");
    ctx.restore();

    const qrBoxX = qrFrameX + 70;
    const qrBoxY = qrFrameY + 70;
    const qrBoxSize = 664;

    drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 26, "#ffffff");
    ctx.save();
    roundRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 26);
    ctx.clip();

    if (qrSource) {
      ctx.drawImage(qrSource, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
    } else {
      ctx.fillStyle = "#f7f2ec";
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.fillStyle = "#7f6b5c";
      ctx.font = "600 28px 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("名片連結", width / 2, qrBoxY + qrBoxSize / 2 - 10);
      ctx.font = "400 18px sans-serif";
      wrapText(ctx, currentCardUrl, width / 2, qrBoxY + qrBoxSize / 2 + 28, 520, 28);
    }
    ctx.restore();

    if (qrAvatarImg) {
      drawQrCenterAvatar(ctx, qrAvatarImg, width / 2, qrBoxY + qrBoxSize / 2, 76);
    }

    drawCenteredText(ctx, "掃描QRcode查閱完整名片", width / 2, 1342, {
      font: "800 28px 'Noto Sans TC', sans-serif",
      color: "#6f5d50"
    });

    return canvas;
  }

  async function getQrDrawable() {
    if (!el.qrViewport) return null;

    const canvas = el.qrViewport.querySelector("canvas");
    if (canvas) return canvas;

    const img = el.qrViewport.querySelector("img");
    if (img && img.complete && img.naturalWidth > 0) return img;

    if (img) {
      await waitForImageElement(img);
      if (img.naturalWidth > 0) return img;
    }

    const table = el.qrViewport.querySelector("table");
    if (table) return tableToCanvas(table);

    return null;
  }

  function tableToCanvas(table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (!rows.length) return null;

    const rowCount = rows.length;
    const colCount = rows[0].querySelectorAll("td").length;
    if (!colCount) return null;

    const size = 800;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    const cellW = size / colCount;
    const cellH = size / rowCount;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    rows.forEach((tr, r) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      cells.forEach((td, cIdx) => {
        const bg = getComputedStyle(td).backgroundColor;
        if (!isWhiteColor(bg)) {
          ctx.fillStyle = "#2f241d";
          ctx.fillRect(cIdx * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH));
        }
      });
    });

    return c;
  }

  function isWhiteColor(color) {
    const v = String(color || "").replace(/\s+/g, "").toLowerCase();
    return (
      v === "rgb(255,255,255)" ||
      v === "rgba(255,255,255,1)" ||
      v === "transparent" ||
      v === ""
    );
  }

  function drawBackground(ctx, w, h) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#f8f4ee");
    grad.addColorStop(1, "#f2ebe2");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w / 2, -40, 40, w / 2, -40, 700);
    glow.addColorStop(0, "rgba(255,255,255,.85)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  function drawMainCard(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.shadowColor = "rgba(83,62,45,.08)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 10;
    drawRoundRect(ctx, x, y, w, h, r, "#fffdfa");
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(102,78,57,.10)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  function drawTopBrand(ctx, width) {
    const icon = new Image();
    icon.src = "./icon-192.png";

    ctx.save();
    ctx.font = "900 34px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#453429";
    ctx.textAlign = "center";
    ctx.fillText("天使幸福智慧名片", width / 2 + 18, 108);
    ctx.restore();

    try {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.05)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#ffffff";
      drawRoundRect(ctx, 290, 70, 44, 44, 12, "#ffffff");
      ctx.restore();

      ctx.drawImage(icon, 294, 74, 36, 36);
    } catch (_) {}

    drawRoundRect(ctx, 380, 126, 320, 48, 24, "#fbf2e8");
    ctx.save();
    ctx.strokeStyle = "rgba(191,135,87,.16)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, 380, 126, 320, 48, 24);
    ctx.stroke();
    ctx.restore();

    drawCenteredText(ctx, "名片交付卡", width / 2, 158, {
      font: "900 24px 'Noto Sans TC', sans-serif",
      color: "#9d6d45"
    });
  }

  function drawPosterBody(ctx, width) {
    ctx.save();
    ctx.shadowColor = "rgba(83,62,45,.06)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    drawRoundRect(ctx, 74, 178, width - 148, 1340, 34, "#fffaf5");
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(102,78,57,.08)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, 74, 178, width - 148, 1340, 34);
    ctx.stroke();
    ctx.restore();
  }

  function drawAvatarCircle(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.shadowColor = "rgba(88,67,48,.09)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img) {
      ctx.drawImage(img, cx - r + 6, cy - r + 6, (r - 6) * 2, (r - 6) * 2);
    } else {
      ctx.fillStyle = "#eadfd4";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function drawQrCenterAvatar(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.10)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, cx - r + 6, cy - r + 6, (r - 6) * 2, (r - 6) * 2);
    ctx.restore();
  }

  function drawCenteredText(ctx, str, x, y, opts = {}) {
    ctx.save();
    ctx.font = opts.font || "600 32px sans-serif";
    ctx.fillStyle = opts.color || "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str || "", x, y);
    ctx.restore();
  }

  function drawCenteredMultiLine(ctx, str, x, y, maxWidth, lineHeight, opts = {}) {
    const lines = splitLinesByWidth(ctx, str || "", maxWidth, opts.font || "500 34px sans-serif");
    ctx.save();
    ctx.font = opts.font || "500 34px sans-serif";
    ctx.fillStyle = opts.color || "#6f5d50";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, x, startY + idx * lineHeight);
    });
    ctx.restore();
  }

  function splitLinesByWidth(ctx, textValue, maxWidth, font) {
    const textStr = String(textValue || "").trim();
    if (!textStr) return [""];

    ctx.save();
    ctx.font = font;

    const chars = Array.from(textStr);
    const lines = [];
    let line = "";

    chars.forEach((ch) => {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    });

    if (line) lines.push(line);
    ctx.restore();

    return lines.slice(0, 2);
  }

  function wrapText(ctx, textValue, x, y, maxWidth, lineHeight) {
    const lines = splitLinesByWidth(ctx, textValue, maxWidth, ctx.font);
    lines.forEach((line, idx) => {
      ctx.fillText(line, x, y + idx * lineHeight);
    });
  }

  function drawRoundRect(ctx, x, y, w, h, r, fill) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
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

  function addSoftShadow(ctx) {
    ctx.save();
    ctx.shadowColor = "rgba(83,62,45,.06)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
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

  function waitForImageElement(imgEl) {
    return new Promise((resolve) => {
      if (!imgEl) return resolve();
      if (imgEl.complete && imgEl.naturalWidth > 0) return resolve();

      const done = () => {
        imgEl.removeEventListener("load", done);
        imgEl.removeEventListener("error", done);
        resolve();
      };
      imgEl.addEventListener("load", done, { once: true });
      imgEl.addEventListener("error", done, { once: true });
    });
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

  function loadImageElement(src, fallback = "") {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      let triedFallback = false;

      img.onload = () => resolve(img);
      img.onerror = () => {
        if (!triedFallback && fallback) {
          triedFallback = true;
          img.src = fallback;
          return;
        }
        resolve(null);
      };

      img.src = src;
    });
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