/* ==========================================
 * HSC Poster v800.1
 * COMPLETE OVERWRITE
 *
 * 商用版：
 * 1. 本地 QR 生成
 * 2. QR 中央頭像
 * 3. 頭像 / 姓名 / 標題載入
 * 4. 下載海報（桌機下載 / 手機開圖長按保存）
 * 5. 查看智慧名片
 * 6. 複製名片連結
 * 7. 分享智慧名片
 * 8. 推薦智慧名片館
 * 9. 分享說明 Dialog
 * 10. LINE 官方帳號
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "800.1";

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
  let currentQrSource = null;

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

  async function renderQrLocal(targetUrl) {
    if (!el.qrViewport) return;

    hideQrFallback();
    el.qrViewport.innerHTML = "";
    currentQrSource = null;

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

    await wait(120);

    const source = normalizeQrSource(mount);
    if (!source) {
      renderQrFallback(targetUrl);
      setStatus("QR 產生失敗，已改顯示名片連結", true);
      return;
    }

    currentQrSource = source;
  }

  function normalizeQrSource(root) {
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

  async function renderQrCenterAvatar(avatarUrl) {
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

      const canvas = await buildPosterCanvas();
      const filename = `${safeFileName(currentItem?.name || currentItem?.id || "smart-card")}-poster.png`;
      const dataUrl = canvas.toDataURL("image/png", 0.96);

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
      setStatus("海報產生失敗，請重試", true);
    } finally {
      disableButton(el.downloadBtn, false);
    }
  }

  async function buildPosterCanvas() {
    const width = 1080;
    const height = 1600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const avatar = await loadImageElement(currentAvatarUrl || buildDefaultAvatarSvg(), buildDefaultAvatarSvg());
    const qrDrawable = await getQrDrawable();
    const qrCenterAvatar = await loadImageElement(currentAvatarUrl || buildDefaultAvatarSvg(), buildDefaultAvatarSvg());

    drawBackground(ctx, width, height);
    drawCard(ctx, 30, 30, width - 60, height - 60, 40);

    drawBrandHead(ctx, width);
    drawInnerPanel(ctx, 76, 186, width - 152, 1360, 34);

    drawAvatarCircle(ctx, avatar, width / 2, 286, 102);

    drawCenteredText(ctx, text(currentItem?.name) || text(currentItem?.id) || "我的智慧名片", width / 2, 460, {
      font: "900 64px 'Noto Sans TC', sans-serif",
      color: "#453429"
    });

    drawCenteredMultiLine(
      ctx,
      text(currentItem?.title) || text(currentItem?.unit) || text(currentItem?.slogan) || "",
      width / 2,
      540,
      760,
      48,
      {
        font: "500 34px 'Noto Sans TC', sans-serif",
        color: "#705d50"
      }
    );

    const qrFrameX = 156;
    const qrFrameY = 632;
    const qrFrameW = 768;
    const qrFrameH = 768;

    drawFrame(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, 34);
    const qrBoxX = qrFrameX + 44;
    const qrBoxY = qrFrameY + 44;
    const qrBoxSize = qrFrameW - 88;

    drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24, "#ffffff");

    ctx.save();
    roundRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
    ctx.clip();

    if (qrDrawable) {
      ctx.drawImage(qrDrawable, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
    } else {
      ctx.fillStyle = "#f6efe8";
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.fillStyle = "#705d50";
      ctx.textAlign = "center";
      ctx.font = "600 28px 'Noto Sans TC', sans-serif";
      ctx.fillText("名片連結", width / 2, qrBoxY + qrBoxSize / 2 - 20);
      ctx.font = "400 18px sans-serif";
      wrapTextCenter(ctx, currentCardUrl, width / 2, qrBoxY + qrBoxSize / 2 + 18, 500, 28);
    }
    ctx.restore();

    if (qrCenterAvatar) {
      drawQrCenterCircle(ctx, qrCenterAvatar, width / 2, qrBoxY + qrBoxSize / 2, 82);
    }

    drawCenteredText(ctx, "掃描QRcode查閱完整名片", width / 2, 1452, {
      font: "800 28px 'Noto Sans TC', sans-serif",
      color: "#705d50"
    });

    return canvas;
  }

  async function getQrDrawable() {
    if (!currentQrSource) return null;

    if (currentQrSource.tagName === "CANVAS") return currentQrSource;

    if (currentQrSource.tagName === "IMG") {
      if (!currentQrSource.complete || currentQrSource.naturalWidth === 0) {
        await waitForImageElement(currentQrSource);
      }
      return currentQrSource.naturalWidth > 0 ? currentQrSource : null;
    }

    if (currentQrSource.tagName === "TABLE") {
      return tableToCanvas(currentQrSource);
    }

    return null;
  }

  function tableToCanvas(table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (!rows.length) return null;

    const cols = rows[0].querySelectorAll("td").length;
    if (!cols) return null;

    const size = 800;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const cellW = size / cols;
    const cellH = size / rows.length;

    rows.forEach((tr, r) => {
      const tds = Array.from(tr.querySelectorAll("td"));
      tds.forEach((td, c) => {
        const bg = getComputedStyle(td).backgroundColor.replace(/\s+/g, "").toLowerCase();
        if (bg !== "rgb(255,255,255)" && bg !== "rgba(255,255,255,1)" && bg !== "transparent") {
          ctx.fillStyle = "#2f241d";
          ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH));
        }
      });
    });

    return canvas;
  }

  function drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f8f4ee");
    g.addColorStop(1, "#f3ece3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const rg = ctx.createRadialGradient(w / 2, -40, 30, w / 2, -40, 680);
    rg.addColorStop(0, "rgba(255,255,255,.85)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }

  function drawCard(ctx, x, y, w, h, r) {
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

  function drawBrandHead(ctx, width) {
    drawCenteredText(ctx, "☀", width / 2, 88, {
      font: "900 44px 'Noto Sans TC', sans-serif",
      color: "#9d6d45"
    });

    drawCenteredText(ctx, "天使幸福智慧名片", width / 2, 126, {
      font: "900 38px 'Noto Sans TC', sans-serif",
      color: "#453429"
    });

    drawCenteredText(ctx, "Angel Smart Card", width / 2, 158, {
      font: "700 18px sans-serif",
      color: "#8b7a6d"
    });

    drawRoundRect(ctx, 388, 176, 304, 46, 23, "#fbf2e8");
    ctx.save();
    ctx.strokeStyle = "rgba(191,135,87,.16)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, 388, 176, 304, 46, 23);
    ctx.stroke();
    ctx.restore();

    drawCenteredText(ctx, "名片交付卡", width / 2, 198, {
      font: "900 24px 'Noto Sans TC', sans-serif",
      color: "#9d6d45"
    });
  }

  function drawInnerPanel(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.shadowColor = "rgba(83,62,45,.06)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    drawRoundRect(ctx, x, y, w, h, r, "#fffaf5");
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(102,78,57,.08)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  function drawFrame(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.05)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    drawRoundRect(ctx, x, y, w, h, r, "#fffdfa");
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,.04)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  function drawAvatarCircle(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.shadowColor = "rgba(88,67,48,.09)";
    ctx.shadowBlur = 18;
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
    if (img) {
      ctx.drawImage(img, cx - r + 6, cy - r + 6, (r - 6) * 2, (r - 6) * 2);
    } else {
      ctx.fillStyle = "#eadfd4";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function drawQrCenterCircle(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.10)";
    ctx.shadowBlur = 18;
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

  function drawCenteredMultiLine(ctx, textValue, x, y, maxWidth, lineHeight, opts = {}) {
    const lines = splitLinesByWidth(ctx, textValue || "", maxWidth, opts.font || "500 34px sans-serif");
    ctx.save();
    ctx.font = opts.font || "500 34px sans-serif";
    ctx.fillStyle = opts.color || "#705d50";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, x, startY + idx * lineHeight);
    });
    ctx.restore();
  }

  function splitLinesByWidth(ctx, input, maxWidth, font) {
    const s = String(input || "").trim();
    if (!s) return [""];

    ctx.save();
    ctx.font = font;

    const chars = Array.from(s);
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

  function wrapTextCenter(ctx, textValue, x, y, maxWidth, lineHeight) {
    const lines = splitLinesByWidth(ctx, textValue || "", maxWidth, ctx.font);
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

  function disableButton(btn, disabled) {
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.style.opacity = disabled ? ".72" : "";
    btn.style.cursor = disabled ? "wait" : "";
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
    setStatus(ok ? "推薦智慧名片館連結已複製" : "複製失敗，請手動複製", !ok);
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
})();