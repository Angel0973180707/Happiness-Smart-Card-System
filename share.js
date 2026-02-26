/* ============================================
 * share.js (v403 COMPLETE OVERWRITE)
 * 客戶展示模式：
 * 1) 照片牆（縮圖＋Lightbox）
 * 2) 動態 OG 圖（姓名＋頭像）— Canvas 產生，可複製
 * 3) 一鍵交貨整包複製（卡片/交貨/OG/文案）
 * 4) Drive 圖片超高容錯（多策略 fallback）
 * 手機優先｜不破壞既有 UI：必要 DOM 由 JS 動態插入
 * ============================================ */

/** ====== 可選：若你已在 HTML 先定義 window.CONFIG，會自動吃 ======
 * window.CONFIG = {
 *   GAS: "https://script.google.com/macros/s/...../exec",
 *   CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
 *   SHARE_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html"
 * }
 */

/* 你目前給我的前台首頁（名片網址） */
const FALLBACK_CARD_BASE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
/* share.html 的網址（通常與 CARD_BASE_URL 同站） */
const FALLBACK_SHARE_BASE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html";
/* 你目前給的 GAS WebApp */
const FALLBACK_GAS_URL =
  "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const CFG = {
  GAS: (window.CONFIG && window.CONFIG.GAS) || FALLBACK_GAS_URL,
  CARD_BASE_URL: (window.CONFIG && window.CONFIG.CARD_BASE_URL) || FALLBACK_CARD_BASE_URL,
  SHARE_BASE_URL: (window.CONFIG && window.CONFIG.SHARE_BASE_URL) || FALLBACK_SHARE_BASE_URL,
  DEFAULT_ID: "TW0001",
  MAX_PHOTOS: 12, // 客戶展示模式可以多一點
};

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getParam_(k) {
  const u = new URL(location.href);
  return (u.searchParams.get(k) || "").trim();
}

function safeText_(v) {
  if (v == null) return "";
  return String(v).trim();
}

function joinLines_(...arr) {
  return arr
    .map((s) => safeText_(s))
    .filter(Boolean)
    .join("\n");
}

/** ====== fetch JSON 防呆 ====== */
async function fetchJsonRobust_(url) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  // 可能不是 JSON（錯誤頁 / HTML）
  try {
    return JSON.parse(text);
  } catch (e) {
    // 嘗試從 text 中抓出 JSON（有些會前面多字）
    const m = text.match(/\{[\s\S]*\}$/);
    if (m) return JSON.parse(m[0]);
    throw new Error("GAS 回應不是 JSON（可能權限或部署問題）");
  }
}

/** ====== Drive 圖片容錯：把各種連結轉成可載入 candidates ====== */
function extractDriveFileId_(raw) {
  const url = safeText_(raw);
  if (!url) return "";
  let m = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (m && m[1]) return m[1];
  m = url.match(/[?&]id=([^&]+)/i);
  if (m && m[1]) return m[1];
  m = url.match(/thumbnail\?id=([^&]+)/i);
  if (m && m[1]) return m[1];
  return "";
}

function normalizeDriveCandidates_(raw) {
  const url = safeText_(raw);
  if (!url) return [];

  // dropbox 也順便防呆
  if (url.includes("dropbox.com")) {
    let u = url.replace("dl=0", "raw=1");
    if (!u.includes("raw=1")) u += (u.includes("?") ? "&" : "?") + "raw=1";
    return [u];
  }

  const fid = extractDriveFileId_(url);
  if (!fid) return [url];

  // 這些形式常見可直接當 <img src>
  const c1 = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fid)}`;
  const c2 = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fid)}`;
  const c3 = `https://drive.google.com/uc?id=${encodeURIComponent(fid)}`;
  const c4 = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fid)}&sz=w1200`;
  const c5 = url; // 原始放最後
  // 去重
  return Array.from(new Set([c1, c2, c3, c4, c5]));
}

async function loadImageWithFallback_(imgEl, rawUrl, opts = {}) {
  const { timeoutMs = 4500 } = opts;
  const candidates = normalizeDriveCandidates_(rawUrl);
  if (!candidates.length) return false;

  for (let i = 0; i < candidates.length; i++) {
    const src = candidates[i];
    const ok = await tryLoadImage_(imgEl, src, timeoutMs);
    if (ok) return true;
  }
  return false;
}

function tryLoadImage_(imgEl, src, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;

    const t = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      resolve(false);
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(t);
      imgEl.onload = null;
      imgEl.onerror = null;
    };

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

    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    imgEl.loading = "eager";
    imgEl.src = src;
  });
}

/** ====== 解析多張照片欄位 ====== */
function splitLinks_(cell) {
  const t = safeText_(cell);
  if (!t) return [];
  return t
    .split(/[\n,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickPhotoArray_(data) {
  // 優先：photos_full（原圖）> photos（fast）> 照片_fast > 照片
  const a = Array.isArray(data.photos_full) ? data.photos_full : [];
  const b = Array.isArray(data.photos) ? data.photos : [];

  const c = splitLinks_(data["照片_fast"]);
  const d = splitLinks_(data["照片"]);

  const out = [];
  const pushMany = (arr) => arr.forEach((x) => x && out.push(x));

  if (a.length) pushMany(a);
  else if (b.length) pushMany(b);
  else if (c.length) pushMany(c);
  else if (d.length) pushMany(d);

  // 正規化 + 去重 + 截斷
  const normalized = out
    .flatMap((u) => normalizeDriveCandidates_(u).slice(0, 1)) // 先用最佳候選（uc?export=view）
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, CFG.MAX_PHOTOS);
}

/** ====== UI：插入照片牆 + Lightbox（不改 HTML） ====== */
function ensureGalleryUI_() {
  if (document.querySelector("#photoWall")) return;

  const body = document.querySelector(".share-card .body");
  if (!body) return;

  const wall = document.createElement("div");
  wall.id = "photoWall";
  wall.style.marginTop = "12px";
  wall.innerHTML = `
    <div style="
      font-size:12px;
      font-weight:900;
      letter-spacing:.3px;
      opacity:.92;
      margin: 6px 2px 8px;
      display:flex;
      align-items:center;
      gap:6px;
    ">
      <i class="fa-solid fa-images"></i>
      照片牆
      <span id="photoWallHint" style="font-weight:700; opacity:.65;"></span>
    </div>

    <div id="thumbGrid" style="
      display:grid;
      grid-template-columns: repeat(3, 1fr);
      gap:8px;
    "></div>

    <div id="lightbox" style="
      position:fixed;
      inset:0;
      background: rgba(0,0,0,0.78);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:9999;
      padding: 18px;
    ">
      <div style="
        width:min(980px, 100%);
        border:1px solid rgba(255,255,255,0.14);
        border-radius:18px;
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(12px);
        overflow:hidden;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:10px 12px;
          border-bottom:1px solid rgba(255,255,255,0.12);
          font-size:12px;
          color:rgba(255,255,255,0.78);
        ">
          <div id="lbTitle" style="font-weight:900;">照片</div>
          <button id="lbClose" style="
            border:1px solid rgba(191,149,63,0.55);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.92);
            border-radius: 12px;
            padding:8px 10px;
            font-weight:900;
            cursor:pointer;
          "><i class="fa-solid fa-xmark"></i> 關閉</button>
        </div>

        <div style="position:relative; background: rgba(0,0,0,0.25);">
          <img id="lbImg" alt="photo" style="
            width:100%;
            height: min(72vh, 680px);
            object-fit: contain;
            display:block;
          "/>
        </div>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          padding:10px 12px 12px;
          border-top:1px solid rgba(255,255,255,0.10);
        ">
          <button id="lbPrev" style="
            border:1px solid rgba(191,149,63,0.55);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.92);
            border-radius: 12px;
            padding:8px 10px;
            font-weight:900;
            cursor:pointer;
          "><i class="fa-solid fa-chevron-left"></i> 上一張</button>

          <button id="lbNext" style="
            border:1px solid rgba(191,149,63,0.55);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.92);
            border-radius: 12px;
            padding:8px 10px;
            font-weight:900;
            cursor:pointer;
          "><i class="fa-solid fa-chevron-right"></i> 下一張</button>

          <button id="lbCopyUrl" style="
            border:1px solid rgba(191,149,63,0.55);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.92);
            border-radius: 12px;
            padding:8px 10px;
            font-weight:900;
            cursor:pointer;
          "><i class="fa-solid fa-link"></i> 複製照片連結</button>
        </div>
      </div>
    </div>
  `;

  body.appendChild(wall);
}

function renderThumbs_(urls) {
  ensureGalleryUI_();
  const grid = document.querySelector("#thumbGrid");
  const hint = document.querySelector("#photoWallHint");
  if (!grid) return;

  grid.innerHTML = "";
  if (hint) hint.textContent = urls.length ? `（共 ${urls.length} 張）` : "（目前沒有照片）";

  urls.forEach((u, idx) => {
    const card = document.createElement("button");
    card.type = "button";
    card.style.border = "1px solid rgba(255,255,255,0.12)";
    card.style.background = "rgba(0,0,0,0.22)";
    card.style.borderRadius = "14px";
    card.style.padding = "0";
    card.style.overflow = "hidden";
    card.style.cursor = "pointer";
    card.style.aspectRatio = "1 / 1";

    const img = document.createElement("img");
    img.alt = "thumb";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";
    img.style.opacity = "0.0";
    img.style.transition = "opacity .22s ease";

    // 嘗試載縮圖：thumbnail or uc view
    const candidates = normalizeDriveCandidates_(u);
    img.src = candidates[3] || candidates[0] || u;
    img.onload = () => (img.style.opacity = "1");
    img.onerror = () => {
      // 失敗再換 uc view
      img.src = candidates[0] || u;
    };

    card.appendChild(img);
    card.addEventListener("click", () => openLightbox_(idx));
    grid.appendChild(card);
  });
}

/** ====== Lightbox 控制 ====== */
let __photos = [];
let __lbIndex = 0;

function openLightbox_(idx) {
  const lb = document.querySelector("#lightbox");
  const img = document.querySelector("#lbImg");
  const title = document.querySelector("#lbTitle");
  if (!lb || !img) return;

  __lbIndex = Math.max(0, Math.min(idx, __photos.length - 1));
  lb.style.display = "flex";
  if (title) title.textContent = `照片 ${__lbIndex + 1} / ${__photos.length}`;

  // 用超容錯載入原圖
  img.style.opacity = "0.0";
  img.style.transition = "opacity .18s ease";
  loadImageWithFallback_(img, __photos[__lbIndex], { timeoutMs: 6000 }).then((ok) => {
    img.style.opacity = ok ? "1" : "0.35";
  });

  // click backdrop close
  lb.addEventListener(
    "click",
    (e) => {
      if (e.target === lb) closeLightbox_();
    },
    { once: true }
  );
}

function closeLightbox_() {
  const lb = document.querySelector("#lightbox");
  if (lb) lb.style.display = "none";
}

function stepLightbox_(dir) {
  if (!__photos.length) return;
  __lbIndex = (__lbIndex + dir + __photos.length) % __photos.length;
  openLightbox_(__lbIndex);
}

/** ====== 動態 OG 圖：Canvas 1200x630（頁內好用 + 可複製） ====== */
async function buildOgDataUrl_(name, avatarUrl) {
  const W = 1200,
    H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 背景（低調精品）
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0f1218");
  g.addColorStop(1, "#141a24");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 柔光
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.ellipse(220, 140, 320, 220, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(191,149,63,0.10)";
  ctx.beginPath();
  ctx.ellipse(980, 160, 360, 240, 0, 0, Math.PI * 2);
  ctx.fill();

  // 玻璃卡
  roundRect_(ctx, 170, 125, 860, 380, 34);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 金邊點綴
  ctx.strokeStyle = "rgba(191,149,63,0.38)";
  ctx.lineWidth = 2;
  roundRect_(ctx, 180, 135, 840, 360, 30);
  ctx.stroke();

  // 頭像：嘗試載入（超容錯）
  const avatarImg = await loadImageToCanvas_(avatarUrl);

  const cx = 290,
    cy = 315,
    r = 86;

  // 頭像底
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
  ctx.fill();

  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    // cover
    const scale = Math.max((r * 2) / avatarImg.width, (r * 2) / avatarImg.height);
    const w = avatarImg.width * scale;
    const h = avatarImg.height * scale;
    ctx.drawImage(avatarImg, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }

  // 文字
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "900 54px 'Noto Sans TC', system-ui, sans-serif";
  ctx.fillText(safeText_(name) || "幸福智慧名片", 410, 290);

  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "700 28px 'Noto Sans TC', system-ui, sans-serif";
  ctx.fillText("一點，就看見彼此的價值", 410, 340);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 22px 'Noto Sans TC', system-ui, sans-serif";
  ctx.fillText("Happiness Smart Card · Client Preview", 410, 388);

  return canvas.toDataURL("image/png");
}

function roundRect_(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function loadImageToCanvas_(rawUrl) {
  const candidates = normalizeDriveCandidates_(rawUrl);
  if (!candidates.length) return null;

  for (const src of candidates) {
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.referrerPolicy = "no-referrer";
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = src;
      });
      return img;
    } catch (e) {
      // try next
    }
  }
  return null;
}

/** ====== Clipboard 防呆 ====== */
async function copyText_(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast_("已複製 ✅");
    return true;
  } catch (e) {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      toast_("已複製 ✅");
      return true;
    } catch (err) {
      alert("複製失敗，請手動複製：\n" + text);
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

async function copyPngDataUrl_(dataUrl) {
  // 支援 ClipboardItem 的瀏覽器：可直接複製圖片
  try {
    if (!dataUrl || !dataUrl.startsWith("data:image/")) throw new Error("bad dataUrl");

    if (navigator.clipboard && window.ClipboardItem) {
      const blob = await (await fetch(dataUrl)).blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      toast_("OG 圖已複製 ✅");
      return true;
    }
  } catch (e) {}

  // fallback：複製 dataURL（可貼到某些工具），或開新分頁讓你長按存圖
  await copyText_(dataUrl);
  toast_("已複製 OG dataURL（不支援圖片剪貼簿時的備援）");
  return false;
}

/** ====== 小吐司（不破壞 UI） ====== */
let __toastTimer = null;
function toast_(msg) {
  let el = document.querySelector("#__toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.zIndex = "99999";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "14px";
    el.style.border = "1px solid rgba(255,255,255,0.16)";
    el.style.background = "rgba(0,0,0,0.55)";
    el.style.backdropFilter = "blur(10px)";
    el.style.color = "rgba(255,255,255,0.92)";
    el.style.fontSize = "12px";
    el.style.fontWeight = "900";
    el.style.maxWidth = "86vw";
    el.style.textAlign = "center";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(() => {
    el.style.opacity = "0";
  }, 1500);
}

/** ====== 主流程 ====== */
async function main_() {
  // DOM
  const btnBack = $("btnBack");
  const btnCopyCard = $("btnCopyCard");
  const btnOpenCard = $("btnOpenCard");
  const btnCopyOg = $("btnCopyOg");
  const nameEl = $("name");
  const subEl = $("sub");
  const avaImg = $("avaImg");
  const cardUrlBox = $("cardUrlBox");

  const id = getParam_("id") || CFG.DEFAULT_ID;

  const cardUrl = CFG.CARD_BASE_URL.replace(/\/?$/, "/") + `?id=${encodeURIComponent(id)}`;
  const shareUrl = CFG.SHARE_BASE_URL + `?id=${encodeURIComponent(id)}`;

  // back button
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      location.href = cardUrl;
    });
  }

  // 初始顯示
  if (nameEl) nameEl.textContent = "載入中…";
  if (subEl) subEl.textContent = "";
  if (cardUrlBox) cardUrlBox.textContent = "名片連結載入中…";

  // 取資料
  const api = `${CFG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  let data = null;

  try {
    data = await fetchJsonRobust_(api);
  } catch (e) {
    // 顯示錯誤，但仍提供網址讓你交貨
    if (nameEl) nameEl.textContent = "載入失敗";
    if (subEl) subEl.textContent = String(e && e.message ? e.message : e);
    if (cardUrlBox) cardUrlBox.textContent = cardUrl;
    wireButtons_(btnCopyCard, btnOpenCard, btnCopyOg, cardUrl, shareUrl, null, id);
    return;
  }

  // 名稱/副標
  const nm = safeText_(data["姓名"] || data.name || data["u-name"] || data["Name"]);
  const unit = safeText_(data["單位"] || data.unit);
  const title = safeText_(data["頭銜"] || data.title);
  const slogan = safeText_(data["理念標語"] || data.slogan);

  if (nameEl) nameEl.textContent = nm || id;
  if (subEl) subEl.textContent = joinLines_(unit, title, slogan);

  // 头像：優先 個人照_fast > 個人照 > avatar
  const avatarRaw = safeText_(data["個人照_fast"] || data["個人照"] || data.avatar || "");
  if (avaImg) {
    if (avatarRaw) {
      const ok = await loadImageWithFallback_(avaImg, avatarRaw, { timeoutMs: 6500 });
      if (!ok) {
        // 用純色做 fallback
        avaImg.removeAttribute("src");
        avaImg.style.opacity = "0";
      }
    } else {
      avaImg.style.opacity = "0";
    }
  }

  // 連結盒
  if (cardUrlBox) {
    cardUrlBox.textContent = cardUrl;
  }

  // 照片牆
  __photos = pickPhotoArray_(data);
  renderThumbs_(__photos);

  // Lightbox events
  const lbClose = document.querySelector("#lbClose");
  const lbPrev = document.querySelector("#lbPrev");
  const lbNext = document.querySelector("#lbNext");
  const lbCopyUrl = document.querySelector("#lbCopyUrl");
  const lightbox = document.querySelector("#lightbox");

  if (lbClose) lbClose.onclick = closeLightbox_;
  if (lbPrev) lbPrev.onclick = () => stepLightbox_(-1);
  if (lbNext) lbNext.onclick = () => stepLightbox_(+1);

  if (lbCopyUrl) {
    lbCopyUrl.onclick = async () => {
      const u = __photos[__lbIndex] || "";
      await copyText_(u);
    };
  }

  // ESC close
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox_();
    if (lightbox && lightbox.style.display === "flex") {
      if (e.key === "ArrowLeft") stepLightbox_(-1);
      if (e.key === "ArrowRight") stepLightbox_(+1);
    }
  });

  // 生成 OG dataURL（給「複製 OG 圖」與「整包交貨」用）
  const ogDataUrl = await buildOgDataUrl_(nm || "幸福智慧名片", avatarRaw || "");

  // 綁定按鈕（含整包交貨）
  wireButtons_(btnCopyCard, btnOpenCard, btnCopyOg, cardUrl, shareUrl, ogDataUrl, nm || id);
}

function wireButtons_(btnCopyCard, btnOpenCard, btnCopyOg, cardUrl, shareUrl, ogDataUrl, displayName) {
  if (btnCopyCard) {
    btnCopyCard.addEventListener("click", async () => {
      await copyText_(cardUrl);
    });
  }

  if (btnOpenCard) {
    btnOpenCard.addEventListener("click", () => {
      window.open(cardUrl, "_blank", "noopener,noreferrer");
    });
  }

  if (btnCopyOg) {
    btnCopyOg.addEventListener("click", async () => {
      if (!ogDataUrl) {
        toast_("OG 尚未生成，請稍後再試");
        return;
      }
      await copyPngDataUrl_(ogDataUrl);
    });
  }

  // ✅ 一鍵交貨整包複製（長按 cardUrlBox）
  const box = document.querySelector("#cardUrlBox");
  if (box && !box.__wired) {
    box.__wired = true;

    let pressT = null;
    const start = () => {
      clearTimeout(pressT);
      pressT = setTimeout(async () => {
        const pack = buildDeliveryPackText_(displayName, cardUrl, shareUrl, ogDataUrl);
        await copyText_(pack);
        toast_("交貨整包已複製 ✅");
      }, 520);
    };
    const end = () => clearTimeout(pressT);

    box.style.cursor = "pointer";
    box.title = "長按 0.5 秒：一鍵複製交貨整包";
    box.addEventListener("touchstart", start, { passive: true });
    box.addEventListener("touchend", end);
    box.addEventListener("mousedown", start);
    box.addEventListener("mouseup", end);
    box.addEventListener("mouseleave", end);

    // 點一下：也複製名片連結（符合直覺）
    box.addEventListener("click", async () => {
      await copyText_(cardUrl);
    });
  }
}

function buildDeliveryPackText_(name, cardUrl, shareUrl, ogDataUrl) {
  const lines = [];
  lines.push(`【幸福智慧名片｜交貨整包】`);
  lines.push(`姓名：${safeText_(name)}`);
  lines.push(`名片網址：${safeText_(cardUrl)}`);
  lines.push(`交貨頁：${safeText_(shareUrl)}`);
  lines.push(`OG 圖（dataURL）：${ogDataUrl ? "(已內建，可貼到需要的工具)" : "(尚未生成)"}`);
  lines.push("");
  lines.push("貼給客戶用語（可直接複製）：");
  lines.push("您好～這是您的「幸福智慧名片」：");
  lines.push(`👉 名片：${safeText_(cardUrl)}`);
  lines.push(`👉 交貨卡：${safeText_(shareUrl)}`);
  lines.push("若需要社群固定預覽圖（OG），我也可以提供一張專屬預覽圖給您使用。");
  lines.push("");
  if (ogDataUrl) {
    lines.push("（備註）OG dataURL：");
    lines.push(ogDataUrl);
  }
  return lines.join("\n");
}

/** boot */
document.addEventListener("DOMContentLoaded", () => {
  main_().catch((e) => {
    console.error(e);
    toast_("發生錯誤：" + String(e && e.message ? e.message : e));
  });
});