/* ================================
 * share.js (v408 COMPLETE OVERWRITE)
 * 幸福智慧名片｜交貨卡「客戶展示模式」
 * - 1️⃣ 照片牆（縮圖＋Lightbox）
 * - 2️⃣ 動態 OG 圖（姓名＋頭像）：用 Canvas 產出 dataURL（同頁顯示/複製）
 * - 3️⃣ 一鍵交貨整包複製（名片連結＋交貨頁連結＋OG 圖連結/備援）
 * - 4️⃣ Drive 圖片超高容錯（view/open/uc/thumbnail 皆可）
 * 手機優先｜不破壞既有 UI（只做「加料」，不改你現有排版）
 * ================================ */

(() => {
  "use strict";

  const CFG = {
    // 你已提供的前台首頁（名片系統）
    CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    // share.html 本頁（交貨卡）
    SHARE_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html",
    // 你的 GAS WebApp
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

    DEFAULT_ID: "TW0001",

    // 動態 OG 尺寸
    OG_W: 1200,
    OG_H: 630,

    // 照片牆最大張數（用 row.photos 或 row.photos_full）
    MAX_PHOTOS: 12,

    // Drive 圖片載入容錯：嘗試序列
    IMG_TIMEOUT_MS: 8000,
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  const elAvaImg = $("avaImg");
  const elName = $("name");
  const elSub = $("sub");
  const elCardUrlBox = $("cardUrlBox");

  const btnBack = $("btnBack");
  const btnCopyCard = $("btnCopyCard");
  const btnOpenCard = $("btnOpenCard");
  const btnCopyOg = $("btnCopyOg");

  // ---------- State ----------
  let state = {
    id: "",
    row: null,
    cardUrl: "",
    shareUrl: "",
    ogDataUrl: "",       // data:image/png;base64,...
    ogBlob: null,        // Blob for share api
    ogReady: false,
    photos: [],
  };

  // ---------- Helpers ----------
  function getQueryParam(name) {
    const u = new URL(location.href);
    return (u.searchParams.get(name) || "").trim();
  }

  function safeText(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  function joinNonEmpty(lines) {
    return lines.filter(Boolean).join("\n");
  }

  function buildCardUrl(id) {
    // 名片前台一般是用 ?id=TW0001
    const u = new URL(CFG.CARD_BASE_URL);
    u.searchParams.set("id", id);
    return u.toString();
  }

  function buildShareUrl(id) {
    const u = new URL(CFG.SHARE_BASE_URL);
    u.searchParams.set("id", id);
    return u.toString();
  }

  function buildGasCardApiUrl(id) {
    const u = new URL(CFG.GAS);
    u.searchParams.set("action", "card");
    u.searchParams.set("id", id);
    u.searchParams.set("ts", String(Date.now()));
    return u.toString();
  }

  function normalizeDriveUrl(raw) {
    // 允許 view/open/uc/thumbnail 等格式 -> 統一成 uc?export=view&id=
    let url = safeText(raw);
    if (!url) return "";

    // data url / blob / http(s) 外部
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    if (url.startsWith("http://")) url = "https://" + url.slice(7);

    // Drive: /file/d/{id}/view
    let m = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/i);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;

    // Drive: open?id={id}
    m = url.match(/[?&]id=([^&]+)/i);
    if (m && m[1] && url.includes("drive.google.com")) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;
    }

    // Drive: uc?...id=
    m = url.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;

    // Drive: thumbnail?id=
    m = url.match(/thumbnail\?id=([^&]+)/i);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;

    // Dropbox dl=0 -> raw=1
    if (url.includes("dropbox.com")) {
      url = url.replace("dl=0", "raw=1");
      if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
      return url;
    }

    return url;
  }

  function extractDriveId(raw) {
    const url = safeText(raw);
    if (!url) return "";
    let m = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/i);
    if (m && m[1]) return m[1];
    m = url.match(/[?&]id=([^&]+)/i);
    if (m && m[1] && url.includes("drive.google.com")) return m[1];
    m = url.match(/thumbnail\?id=([^&]+)/i);
    if (m && m[1]) return m[1];
    m = url.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
    if (m && m[1]) return m[1];
    return "";
  }

  function driveFallbackCandidates(raw) {
    const url = safeText(raw);
    if (!url) return [];
    const id = extractDriveId(url);
    if (!id) {
      // 非 Drive：直接當作候選
      return [normalizeDriveUrl(url)];
    }
    // Drive：多路徑候選（uc / thumbnail / 原 view）
    const uc = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
    const thumb = `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
    const view = `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
    return [uc, thumb, view];
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const txt = await res.text();
    // 有些 GAS 會回傳非 JSON（錯誤 HTML），做防呆
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error("GAS 回傳不是 JSON：" + txt.slice(0, 160));
    }
  }

  function setText(el, v) {
    if (!el) return;
    el.textContent = v == null ? "" : String(v);
  }

  async function copyText(text) {
    const t = String(text || "");
    if (!t) return false;
    try {
      await navigator.clipboard.writeText(t);
      toast("已複製 ✅");
      return true;
    } catch {
      // 退而求其次：select + execCommand
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) toast("已複製 ✅");
        else toast("複製失敗（請長按選取）");
        return ok;
      } catch {
        toast("複製失敗（請長按選取）");
        return false;
      }
    }
  }

  function toast(msg) {
    // 不破壞 UI：用輕量提示
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "18px";
    t.style.transform = "translateX(-50%)";
    t.style.padding = "10px 12px";
    t.style.borderRadius = "12px";
    t.style.background = "rgba(0,0,0,0.55)";
    t.style.border = "1px solid rgba(255,255,255,0.14)";
    t.style.backdropFilter = "blur(10px)";
    t.style.color = "rgba(255,255,255,0.92)";
    t.style.fontSize = "12px";
    t.style.fontWeight = "900";
    t.style.zIndex = "99999";
    t.style.maxWidth = "86vw";
    t.style.textAlign = "center";
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity .25s ease";
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 260);
    }, 1200);
  }

  async function tryLoadImgWithFallback(imgEl, rawUrl, { timeoutMs = CFG.IMG_TIMEOUT_MS } = {}) {
    if (!imgEl) return false;
    const cands = driveFallbackCandidates(rawUrl).filter(Boolean);

    for (const url of cands) {
      const ok = await loadImgOnce(imgEl, url, timeoutMs);
      if (ok) return true;
    }
    return false;
  }

  function loadImgOnce(imgEl, url, timeoutMs) {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        resolve(false);
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        imgEl.onload = null;
        imgEl.onerror = null;
      }

      imgEl.onload = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve(true);
      };
      imgEl.onerror = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve(false);
      };

      // cache bust
      const u = new URL(url, location.href);
      u.searchParams.set("_ts", String(Date.now()));
      imgEl.referrerPolicy = "no-referrer";
      imgEl.src = u.toString();
    });
  }

  // ---------- Photo Wall + Lightbox (runtime inject, no UI break) ----------
  function ensurePhotoWallContainer() {
    // 放在 cardUrlBox 下方（不改你現有結構，只補一塊）
    const body = elCardUrlBox?.closest(".body");
    if (!body) return null;

    let wall = body.querySelector("#photoWall");
    if (wall) return wall;

    wall = document.createElement("div");
    wall.id = "photoWall";
    wall.style.marginTop = "12px";
    wall.style.borderRadius = "14px";
    wall.style.border = "1px solid rgba(255,255,255,0.12)";
    wall.style.background = "rgba(0,0,0,0.18)";
    wall.style.padding = "10px";

    const title = document.createElement("div");
    title.textContent = "照片牆";
    title.style.fontSize = "12px";
    title.style.fontWeight = "900";
    title.style.color = "rgba(255,255,255,0.86)";
    title.style.marginBottom = "8px";
    title.style.letterSpacing = ".3px";

    const grid = document.createElement("div");
    grid.id = "photoGrid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(4, 1fr)";
    grid.style.gap = "8px";

    // 手機小螢幕更舒服
    const mq = window.matchMedia("(max-width: 420px)");
    if (mq.matches) grid.style.gridTemplateColumns = "repeat(3, 1fr)";

    wall.appendChild(title);
    wall.appendChild(grid);

    // 插在 linkbox 後面
    elCardUrlBox.insertAdjacentElement("afterend", wall);

    injectLightboxOnce_();
    return wall;
  }

  function renderPhotoWall(urls) {
    const wall = ensurePhotoWallContainer();
    if (!wall) return;

    const grid = wall.querySelector("#photoGrid");
    if (!grid) return;

    grid.innerHTML = "";

    const list = (urls || []).slice(0, CFG.MAX_PHOTOS);
    if (!list.length) {
      wall.style.display = "none";
      return;
    }
    wall.style.display = "";

    list.forEach((raw, idx) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.style.border = "1px solid rgba(255,255,255,0.14)";
      thumb.style.background = "rgba(255,255,255,0.06)";
      thumb.style.borderRadius = "12px";
      thumb.style.padding = "0";
      thumb.style.overflow = "hidden";
      thumb.style.aspectRatio = "1 / 1";
      thumb.style.cursor = "pointer";

      const img = document.createElement("img");
      img.alt = `photo-${idx + 1}`;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";

      // 超防呆：Drive 多候選
      tryLoadImgWithFallback(img, raw).then((ok) => {
        if (!ok) {
          img.style.objectFit = "contain";
          img.style.opacity = "0.9";
          img.src =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
              <rect width="100%" height="100%" fill="rgba(255,255,255,0.06)"/>
              <text x="50%" y="50%" fill="rgba(255,255,255,0.65)" font-size="14" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">
                Image
              </text>
            </svg>`);
        }
      });

      thumb.addEventListener("click", () => openLightbox_(list, idx));

      thumb.appendChild(img);
      grid.appendChild(thumb);
    });
  }

  function injectLightboxOnce_() {
    if (document.getElementById("lbRoot")) return;

    const root = document.createElement("div");
    root.id = "lbRoot";
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.background = "rgba(0,0,0,0.72)";
    root.style.backdropFilter = "blur(10px)";
    root.style.display = "none";
    root.style.zIndex = "99998";

    root.innerHTML = `
      <div id="lbWrap" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div id="lbCard" style="width:min(92vw,820px); height:min(86vh,820px); border-radius:18px; border:1px solid rgba(255,255,255,0.16); background:rgba(20,22,28,0.72); overflow:hidden; position:relative;">
          <button id="lbClose" type="button" style="position:absolute; right:10px; top:10px; z-index:2; border-radius:12px; padding:8px 10px; border:1px solid rgba(255,255,255,0.22); background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.92); font-weight:900; font-size:12px; cursor:pointer;">關閉</button>
          <button id="lbPrev" type="button" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); z-index:2; border-radius:12px; padding:8px 10px; border:1px solid rgba(255,255,255,0.22); background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.92); font-weight:900; font-size:12px; cursor:pointer;">◀</button>
          <button id="lbNext" type="button" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); z-index:2; border-radius:12px; padding:8px 10px; border:1px solid rgba(255,255,255,0.22); background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.92); font-weight:900; font-size:12px; cursor:pointer;">▶</button>

          <div style="position:absolute; left:0; right:0; top:0; bottom:0; display:flex; align-items:center; justify-content:center;">
            <img id="lbImg" alt="photo" style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; display:block;"/>
          </div>

          <div id="lbCap" style="position:absolute; left:0; right:0; bottom:0; padding:10px 12px; font-size:12px; color:rgba(255,255,255,0.72); background:linear-gradient(to top, rgba(0,0,0,0.55), transparent);">
            <span id="lbIdx">1</span>/<span id="lbTotal">1</span>
          </div>
        </div>
      </div>
    `;

    root.addEventListener("click", (e) => {
      if (e.target === root) closeLightbox_();
    });

    document.body.appendChild(root);

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (root.style.display !== "block") return;
      if (e.key === "Escape") closeLightbox_();
      if (e.key === "ArrowLeft") lbPrev_();
      if (e.key === "ArrowRight") lbNext_();
    });

    // bind buttons
    root.querySelector("#lbClose").addEventListener("click", closeLightbox_);
    root.querySelector("#lbPrev").addEventListener("click", lbPrev_);
    root.querySelector("#lbNext").addEventListener("click", lbNext_);
  }

  let __lb = { list: [], idx: 0 };

  function openLightbox_(list, idx) {
    const root = document.getElementById("lbRoot");
    if (!root) return;
    __lb.list = list || [];
    __lb.idx = Math.max(0, Math.min(idx || 0, __lb.list.length - 1));
    root.style.display = "block";
    renderLightbox_();
  }

  function closeLightbox_() {
    const root = document.getElementById("lbRoot");
    if (!root) return;
    root.style.display = "none";
  }

  function lbPrev_() {
    if (!__lb.list.length) return;
    __lb.idx = (__lb.idx - 1 + __lb.list.length) % __lb.list.length;
    renderLightbox_();
  }

  function lbNext_() {
    if (!__lb.list.length) return;
    __lb.idx = (__lb.idx + 1) % __lb.list.length;
    renderLightbox_();
  }

  function renderLightbox_() {
    const root = document.getElementById("lbRoot");
    if (!root) return;

    const img = root.querySelector("#lbImg");
    const elIdx = root.querySelector("#lbIdx");
    const elTotal = root.querySelector("#lbTotal");

    const total = __lb.list.length || 1;
    const idx = (__lb.idx || 0);

    elIdx.textContent = String(idx + 1);
    elTotal.textContent = String(total);

    // 超防呆：Drive 多候選
    tryLoadImgWithFallback(img, __lb.list[idx], { timeoutMs: 9000 }).then((ok) => {
      if (!ok) toast("此圖載入失敗（Drive 仍可能未公開）");
    });
  }

  // ---------- Dynamic OG (canvas) ----------
  async function buildDynamicOg({ name, avatarUrl }) {
    const W = CFG.OG_W, H = CFG.OG_H;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // background (quiet luxury dark)
    const g1 = ctx.createLinearGradient(0, 0, W, H);
    g1.addColorStop(0, "#0f1218");
    g1.addColorStop(1, "#0a0d12");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // soft lights
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.ellipse(W * 0.18, H * 0.10, 420, 220, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(191,149,63,0.12)";
    ctx.beginPath();
    ctx.ellipse(W * 0.82, H * 0.16, 420, 240, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // glass card
    const cardX = 90, cardY = 90, cardW = W - 180, cardH = H - 180;
    roundRect(ctx, cardX, cardY, cardW, cardH, 34);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // gold accent line
    ctx.strokeStyle = "rgba(191,149,63,0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, cardX + 14, cardY + 14, cardW - 28, cardH - 28, 28);
    ctx.stroke();

    // avatar circle
    const cx = cardX + 140;
    const cy = cardY + cardH / 2;
    const r = 92;

    // avatar fallback (placeholder)
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.fill();

    // load avatar image (try multi candidates)
    let avaImg = null;
    try {
      avaImg = await loadImageRobust(avatarUrl);
    } catch {
      avaImg = null;
    }

    // draw avatar (cover)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    if (avaImg) {
      // cover draw
      const iw = avaImg.naturalWidth || avaImg.width;
      const ih = avaImg.naturalHeight || avaImg.height;
      const scale = Math.max((r * 2) / iw, (r * 2) / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = cx - dw / 2;
      const dy = cy - dh / 2;
      ctx.drawImage(avaImg, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Angel Card", cx, cy);
    }
    ctx.restore();

    // texts
    const title = "幸福智慧名片｜交貨卡";
    const subtitle = "一點，就看見彼此的價值";
    const nm = name || "（未填姓名）";

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 48px 'Noto Sans TC', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(nm, cardX + 270, cardY + 170);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "700 26px 'Noto Sans TC', system-ui, sans-serif";
    ctx.fillText(title, cardX + 270, cardY + 236);

    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = "600 24px 'Noto Sans TC', system-ui, sans-serif";
    ctx.fillText(subtitle, cardX + 270, cardY + 284);

    // micro text
    ctx.fillStyle = "rgba(191,149,63,0.62)";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText("Premium · Elegant · Timeless", cardX + 270, cardY + cardH - 140);

    // export
    const dataUrl = canvas.toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    return { dataUrl, blob };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  async function loadImageRobust(rawUrl) {
    const cands = driveFallbackCandidates(rawUrl).filter(Boolean);
    let lastErr = null;

    for (const url of cands) {
      try {
        const img = await loadImage(url);
        return img;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("loadImageRobust failed");
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // 盡量允許 canvas draw（Drive 有時仍會擋，會走 fallback）
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("img timeout"));
      }, 8000);

      function cleanup() {
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
      }

      img.onload = () => {
        cleanup();
        resolve(img);
      };
      img.onerror = () => {
        cleanup();
        reject(new Error("img error"));
      };

      const u = new URL(url, location.href);
      u.searchParams.set("_ts", String(Date.now()));
      img.referrerPolicy = "no-referrer";
      img.src = u.toString();
    });
  }

  // ---------- One-click delivery pack ----------
  function buildDeliveryPackText() {
    const name = safeText(state.row?.["姓名"] || state.row?.name || "");
    const lines = [];

    lines.push(`【幸福智慧名片｜交貨包】${name ? " " + name : ""}`);
    lines.push("");
    lines.push(`✅ 名片連結：`);
    lines.push(state.cardUrl);
    lines.push("");
    lines.push(`✅ 交貨卡（本頁）：`);
    lines.push(state.shareUrl);
    lines.push("");

    // OG：我們這裡提供「可直接貼到聊天」的做法：dataURL 太長，不直接塞
    // 改成提示：用「複製 OG 圖」按鈕，走 Web Share / Clipboard
    lines.push(`✅ OG 圖：請按「OG 圖」按鈕複製/分享`);
    lines.push("");

    // 如果有 LINE/Email/Phone，也順便帶一下（可選）
    const lineOA = safeText(state.row?.["LINE官方帳號"] || state.row?.line_oa || "");
    const lineLink = safeText(state.row?.["LINE連結"] || state.row?.line || "");
    const email = safeText(state.row?.["Email"] || state.row?.email || "");
    const phone = safeText(state.row?.["電話"] || state.row?.phone || "");

    const contact = [];
    if (lineOA) contact.push(`LINE OA：${lineOA}`);
    if (lineLink) contact.push(`LINE：${lineLink}`);
    if (email) contact.push(`Email：${email}`);
    if (phone) contact.push(`電話：${phone}`);
    if (contact.length) {
      lines.push("📌 聯繫：");
      lines.push(...contact);
      lines.push("");
    }

    return lines.join("\n");
  }

  async function shareOrCopyOg() {
    if (!state.ogReady || !state.ogBlob) {
      toast("OG 還在生成中…");
      return;
    }

    // 1) Web Share（手機最順）
    const file = new File([state.ogBlob], "og-dynamic.png", { type: "image/png" });

    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    if (canShare && navigator.share) {
      try {
        await navigator.share({
          title: "幸福智慧名片｜OG 圖",
          text: "動態 OG 圖（姓名＋頭像）",
          files: [file],
        });
        toast("已開啟分享 ✅");
        return;
      } catch {
        // fallthrough
      }
    }

    // 2) Clipboard 寫入圖片（部分瀏覽器可行）
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ "image/png": state.ogBlob });
        await navigator.clipboard.write([item]);
        toast("OG 圖已複製 ✅");
        return;
      }
    } catch {}

    // 3) fallback：開新視窗顯示 dataURL，讓你長按存
    try {
      const w = window.open();
      if (w) {
        w.document.write(`<img src="${state.ogDataUrl}" style="max-width:100%;height:auto;display:block;margin:0 auto;background:#0f1218"/>`);
        w.document.title = "OG 圖";
        toast("已開啟 OG 圖（長按存檔）");
        return;
      }
    } catch {}

    toast("此瀏覽器不支援複製圖片，請長按另存");
  }

  // ---------- UI bind ----------
  function bindUi() {
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        if (state.cardUrl) location.href = state.cardUrl;
        else location.href = CFG.CARD_BASE_URL;
      });
    }

    if (btnOpenCard) {
      btnOpenCard.addEventListener("click", () => {
        if (!state.cardUrl) return toast("名片連結尚未就緒");
        window.open(state.cardUrl, "_blank", "noopener");
      });
    }

    if (btnCopyCard) {
      btnCopyCard.addEventListener("click", async () => {
        if (!state.cardUrl) return toast("名片連結尚未就緒");
        await copyText(state.cardUrl);
      });

      // 長按：整包交貨複製（不增加新按鈕）
      let pressTimer = null;
      btnCopyCard.addEventListener("touchstart", () => {
        pressTimer = setTimeout(async () => {
          pressTimer = null;
          const pack = buildDeliveryPackText();
          await copyText(pack);
          toast("已複製交貨整包 ✅");
        }, 650);
      }, { passive: true });

      btnCopyCard.addEventListener("touchend", () => {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
      }, { passive: true });

      btnCopyCard.addEventListener("contextmenu", (e) => {
        // 桌機右鍵也當作整包
        e.preventDefault();
        const pack = buildDeliveryPackText();
        copyText(pack);
        toast("已複製交貨整包 ✅");
      });
    }

    if (btnCopyOg) {
      btnCopyOg.addEventListener("click", shareOrCopyOg);

      // 長按：先複製交貨整包，再提示按 OG
      let pressTimer = null;
      btnCopyOg.addEventListener("touchstart", () => {
        pressTimer = setTimeout(async () => {
          pressTimer = null;
          const pack = buildDeliveryPackText();
          await copyText(pack);
          toast("整包已複製 ✅ 再按一次複製 OG");
        }, 650);
      }, { passive: true });

      btnCopyOg.addEventListener("touchend", () => {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
      }, { passive: true });
    }
  }

  // ---------- Main ----------
  async function boot() {
    bindUi();

    const id = getQueryParam("id") || CFG.DEFAULT_ID;
    state.id = id;
    state.cardUrl = buildCardUrl(id);
    state.shareUrl = buildShareUrl(id);

    // 先顯示連結（就算資料還沒回也能交付）
    if (elCardUrlBox) {
      elCardUrlBox.textContent = `名片連結：\n${state.cardUrl}`;
    }

    // 先把按鈕回首頁指向「名片連結」
    if (btnBack) btnBack.title = state.cardUrl;

    // 載入資料
    setText(elName, "載入中…");
    setText(elSub, "請稍候");

    let row = null;
    try {
      row = await fetchJson(buildGasCardApiUrl(id));
    } catch (e) {
      // 即使 GAS 壞了，交貨仍可用（只有頭像/姓名少）
      setText(elName, id);
      setText(elSub, "（資料讀取失敗，但連結可交付）");
      toast("資料讀取失敗：請確認 GAS 或 id");
      row = null;
    }
    state.row = row;

    // 套姓名/副標
    const name = safeText(row?.["姓名"] || row?.name || id);
    const unit = safeText(row?.["單位"] || row?.unit || "");
    const title = safeText(row?.["頭銜"] || row?.title || "");
    const slogan = safeText(row?.["理念標語"] || row?.slogan || "");

    setText(elName, name);
    setText(elSub, joinNonEmpty([
      joinNonEmpty([unit, title].filter(Boolean)),
      slogan
    ]));

    // 頭像：優先 個人照_fast -> 個人照 -> avatar
    const avaRaw =
      safeText(row?.["個人照_fast"]) ||
      safeText(row?.["個人照"]) ||
      safeText(row?.avatar) ||
      "";

    // 先塞一個保底（避免空白破 UI）
    if (elAvaImg) {
      elAvaImg.alt = "avatar";
      elAvaImg.src =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.15)"/>
          <text x="50%" y="50%" fill="rgba(0,0,0,0.55)" font-size="18" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">
            AVATAR
          </text>
        </svg>`);
    }

    // 超防呆載頭像
    if (avaRaw && elAvaImg) {
      const ok = await tryLoadImgWithFallback(elAvaImg, avaRaw);
      if (!ok) toast("頭像載入失敗（Drive 可能仍未公開）");
    }

    // 照片牆資料：優先 photos_full（原圖），再 photos（壓縮）
    let photos = [];
    const pfull = row?.photos_full;
    const pfast = row?.photos;

    if (Array.isArray(pfull)) photos = pfull;
    else if (Array.isArray(pfast)) photos = pfast;

    // 也兼容：照片_fast / 照片 欄位是逗號/換行字串
    if (!photos.length) {
      const s = safeText(row?.["照片_fast"] || row?.["照片"] || "");
      photos = s ? s.split(/[\n,，;；]+/).map(x => x.trim()).filter(Boolean) : [];
    }

    // normalize
    photos = photos
      .map(normalizeDriveUrl_)
      .filter(Boolean)
      .slice(0, CFG.MAX_PHOTOS);

    state.photos = photos;

    // 渲染照片牆
    renderPhotoWall(photos);

    // 動態 OG：姓名＋頭像（用頭像 raw）
    try {
      const { dataUrl, blob } = await buildDynamicOg({ name, avatarUrl: avaRaw });
      state.ogDataUrl = dataUrl;
      state.ogBlob = blob;
      state.ogReady = true;
      toast("動態 OG 已就緒 ✅");
    } catch {
      state.ogReady = false;
      toast("動態 OG 生成失敗（頭像跨域或 Drive 限制）");
    }
  }

  function normalizeDriveUrl_(raw) {
    return normalizeDriveUrl(raw);
  }

  // boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();