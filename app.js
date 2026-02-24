/* ================================
 * Angel Card App.js (V387.3 FULL OVERWRITE)
 * Fixes:
 * 1) Remove duplicated Plan A/B buttons (do NOT inject if existing)
 * 2) Logo image auto rounded corners
 * 3) Premium layout re-position (CSS injected)
 * 4) Read ALL content robustly + Photo wall appears
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  GALLERY_MAX: 16,
  DEBUG: true,
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[AngelCard]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[AngelCard]", ...arguments); }
function err_() { console.error("[AngelCard]", ...arguments); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

function getCardId() {
  try {
    const u = new URL(location.href);
    return (u.searchParams.get("id") || CONFIG.DEFAULT_ID).trim();
  } catch {
    return CONFIG.DEFAULT_ID;
  }
}

/* ---------------------------
 * Keep your existing window.setV382 API
 * --------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
  applyPlanSplitUi_();
};

window.setV382Style = function (style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

window.setV382Paper = function (paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

function applyV382() {
  const isFree = state.mode === "free";
  const controlPanel = $("free-controls");
  if (controlPanel) controlPanel.style.display = isFree ? "block" : "none";

  const cls = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ].filter(Boolean).join(" ");

  document.body.className = cls;

  // premium layout tweak needs to follow mode change
  applyPremiumLayoutTweak_();
}

window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

/* ---------------------------
 * Fetch (robust JSON)
 * --------------------------- */
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal
    });

    const raw = (await res.text() || "").trim();
    if (!raw) throw new Error(`Empty response (HTTP ${res.status})`);

    try { return JSON.parse(raw); }
    catch {
      const m = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) return JSON.parse(m[1]);
      throw new Error("Response is not JSON");
    }
  } finally { clearTimeout(t); }
}

async function fetchJsonRobust(url) {
  let last = null;
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    try { return await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT_MS); }
    catch (e) { last = e; await sleep(520 + i * 520); }
  }
  throw last || new Error("Fetch failed");
}

/* ---------------------------
 * Key normalize + flexible pick
 * --------------------------- */
function cleanKey_(k) {
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/\r?\n/g, "")
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "")
    .trim();
}

function buildNorm_(obj) {
  const out = { __raw: obj, __lower: Object.create(null) };
  if (!obj || typeof obj !== "object") return out;

  for (const k of Object.keys(obj)) {
    const nk = cleanKey_(k);
    if (!nk) continue;
    const v = obj[k];
    if (out[nk] == null || text(out[nk]) === "") out[nk] = v;
    const lk = nk.toLowerCase();
    if (out.__lower[lk] == null || text(out.__lower[lk]) === "") out.__lower[lk] = v;
  }
  return out;
}

function pick(norm, keys) {
  if (!norm) return "";
  for (const k of keys) {
    const kk = cleanKey_(k);
    const v1 = norm[kk];
    if (v1 != null && text(v1) !== "") return v1;
    const v2 = norm.__lower ? norm.__lower[String(kk).toLowerCase()] : null;
    if (v2 != null && text(v2) !== "") return v2;
  }
  return "";
}

function pickByRegex_(norm, regexList) {
  const keys = Object.keys(norm || {}).filter(k => k && !k.startsWith("__"));
  for (const rx of regexList) {
    for (const k of keys) {
      if (rx.test(String(k))) {
        const v = norm[k];
        if (v != null && text(v) !== "") return v;
      }
    }
  }
  return "";
}

/* ---------------------------
 * Image normalize + fallback
 * --------------------------- */
function normalizeImageUrl(raw) {
  if (!raw) return "";
  let url = String(raw).trim();
  if (!url) return "";
  if (url.startsWith("http://")) url = "https://" + url.slice(7);

  if (url.includes("dropbox.com")) {
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (mFile && mFile[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mFile[1])}`;

  const mId = url.match(/(?:\?|&)id=([^&]+)/i);
  if (mId && mId[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mId[1])}`;

  return url;
}

function buildImageCandidates_(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  const u = normalizeImageUrl(s);

  const mDrive = s.match(/(?:\?|&)id=([^&]+)/i) || s.match(/\/file\/d\/([^\/]+)/i);
  const id = mDrive && mDrive[1] ? mDrive[1] : "";

  if (id) {
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`,
      `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}`,
      u
    ];
  }
  return [u];
}

function setImgWithFallback_(imgEl, urls) {
  if (!imgEl) return;
  const list = (urls || []).map(text).filter(Boolean);
  if (!list.length) {
    imgEl.style.opacity = "0";
    imgEl.removeAttribute("src");
    return;
  }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;

  let idx = 0;
  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";
  imgEl.style.opacity = "0";
  imgEl.style.transition = "opacity 420ms ease";

  const tryNext = () => {
    if (imgEl.dataset.loadToken !== token) return;
    if (idx >= list.length) {
      imgEl.style.opacity = "0";
      imgEl.removeAttribute("src");
      return;
    }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onload = () => {
    if (imgEl.dataset.loadToken !== token) return;
    imgEl.style.opacity = "1";
  };
  imgEl.onerror = () => tryNext();

  tryNext();
}

/* ---------------------------
 * Plan buttons duplication fix
 * - We DO NOT inject A/B if you already have them
 * - We only control show/hide of dot rows + free-controls
 * --------------------------- */
function applyPlanSplitUi_() {
  const panel = $("admin-panel");
  if (!panel) return;

  const rows = qa(".dots-row", panel);
  const freeDotsRow = rows[0] || null;
  const premiumDotsRow = rows[1] || null;

  const freeControls = $("free-controls");
  const isFree = state.mode === "free";

  if (freeDotsRow) freeDotsRow.style.display = isFree ? "flex" : "none";
  if (premiumDotsRow) premiumDotsRow.style.display = isFree ? "none" : "flex";
  if (freeControls) freeControls.style.display = isFree ? "block" : "none";
}

/* ===========================
 * Premium feel + layout tuning (JS injected CSS)
 * =========================== */
function injectStyleOnce_(id, cssText) {
  if ($(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = cssText;
  document.head.appendChild(s);
}

function injectPremiumFx_() {
  injectStyleOnce_("ac_premium_fx_v3873", `
    @keyframes angelBreath { 
      0%{transform:translateY(0) scale(1); filter:saturate(1);}
      50%{transform:translateY(-1px) scale(1.015); filter:saturate(1.06);}
      100%{transform:translateY(0) scale(1); filter:saturate(1);}
    }
    /* Keep your V385 look; only enhance 3D + breath */
    .btn-neo, .btn-cta{
      box-shadow:
        0 12px 26px rgba(0,0,0,.10),
        0 2px 0 rgba(255,255,255,.55) inset,
        0 -2px 0 rgba(0,0,0,.08) inset;
      border: 1px solid rgba(255,255,255,.65);
      animation: angelBreath 2.6s ease-in-out infinite;
    }
    .btn-neo:active, .btn-cta:active{ transform: scale(.99); }

    /* Premium layout: give name/content a safer top space */
    body.mode-premium .info-scroll{ padding-top: 108px !important; }
    body.mode-premium .name{ margin-top: 2px !important; }
  `);
}

function applyPremiumLayoutTweak_() {
  // placeholder if later you want runtime adjustments; injected css handles most
}

/* ===========================
 * Logo (top-right small) + auto rounded logo image
 * =========================== */
function ensureTopRightLogo_() {
  const card = $("card-container");
  if (!card) return null;

  let holder = $("logoHolderTopRight");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "logoHolderTopRight";
    holder.style.position = "absolute";
    holder.style.top = "14px";
    holder.style.right = "14px";
    holder.style.zIndex = "60";
    holder.style.width = "56px";
    holder.style.height = "56px";
    holder.style.borderRadius = "16px";
    holder.style.overflow = "hidden";
    holder.style.display = "none";
    holder.style.alignItems = "center";
    holder.style.justifyContent = "center";
    holder.style.border = "1px solid rgba(255,255,255,0.55)";
    holder.style.background = "rgba(255,255,255,0.18)";
    holder.style.backdropFilter = "blur(12px)";
    holder.style.webkitBackdropFilter = "blur(12px)";
    holder.style.boxShadow =
      "0 16px 30px rgba(0,0,0,0.12), 0 2px 0 rgba(255,255,255,0.55) inset, 0 -2px 0 rgba(0,0,0,0.06) inset";

    const img = document.createElement("img");
    img.id = "u-logo-img";
    img.alt = "Logo";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.padding = "8px";
    img.style.opacity = "0";
    img.style.transition = "opacity .35s ease";

    /* ✅ Logo 圖本身圓角化（你要的） */
    img.style.borderRadius = "14px";

    holder.appendChild(img);
    card.appendChild(holder);
  }

  return $("u-logo-img");
}

function setLogoImage_(logoUrl) {
  const img = ensureTopRightLogo_();
  const holder = $("logoHolderTopRight");
  if (!img || !holder) return;

  const cands = buildImageCandidates_(logoUrl);
  if (!cands.length) {
    holder.style.display = "none";
    img.style.opacity = "0";
    img.removeAttribute("src");
    return;
  }

  holder.style.display = "flex";
  setImgWithFallback_(img, cands);

  const token = img.dataset.loadToken;
  const show = () => {
    if (img.dataset.loadToken !== token) return;
    img.style.opacity = "1";
  };
  img.onload = show;
  setTimeout(show, 700);
}

/* ===========================
 * Photo wall (always insert + robust parsing)
 * =========================== */
function splitLinks_(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => text(x)).filter(Boolean);

  const s = text(v);
  if (!s) return [];

  // JSON array string
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map(x => text(x)).filter(Boolean);
    } catch { /* ignore */ }
  }

  return s.split(/[\n,，;；]+/).map(x => text(x)).filter(Boolean);
}

function autoDetectPhotos_(norm) {
  const urls = [];
  const keys = Object.keys(norm || {}).filter(k => k && !k.startsWith("__"));
  for (const k of keys) {
    if (!/(照片|相片|作品|圖|photo|image|img)/i.test(k)) continue;
    const parts = splitLinks_(norm[k]);
    for (const p of parts) {
      if (/^https?:\/\//i.test(p) || /drive\.google\.com/i.test(p) || /dropbox\.com/i.test(p)) {
        urls.push(normalizeImageUrl(p));
      }
    }
  }
  const uniq = [];
  const seen = new Set();
  for (const u of urls) {
    if (!u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    uniq.push(u);
  }
  return uniq;
}

function ensurePhotoWallDom_() {
  if ($("photoWall")) return;

  const card = $("card-container");
  if (!card) return;

  const wrap = document.createElement("div");
  wrap.id = "photoWall";
  wrap.className = "content-box";
  wrap.style.display = "none";

  const title = document.createElement("div");
  title.className = "box-title";
  title.textContent = "照片作品（點一下看原圖）";

  const grid = document.createElement("div");
  grid.id = "photoWallGrid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "10px";

  wrap.appendChild(title);
  wrap.appendChild(grid);

  // Put it near bottom but above version tag if exists
  const vtag = card.querySelector(".version-tag");
  if (vtag && vtag.parentElement) vtag.parentElement.insertBefore(wrap, vtag);
  else card.appendChild(wrap);

  const setCols = () => {
    const w = Math.min(window.innerWidth, 560);
    grid.style.gridTemplateColumns = w >= 420 ? "repeat(4, 1fr)" : "repeat(3, 1fr)";
  };
  setCols();
  window.addEventListener("resize", setCols);
}

function openLightbox_(url) {
  let overlay = $("imgLightbox");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "imgLightbox";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "9999";
    overlay.style.background = "rgba(0,0,0,.65)";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "16px";

    const inner = document.createElement("div");
    inner.style.position = "relative";
    inner.style.maxWidth = "92vw";
    inner.style.maxHeight = "88vh";
    inner.style.borderRadius = "16px";
    inner.style.overflow = "hidden";
    inner.style.background = "rgba(255,255,255,0.06)";
    inner.style.backdropFilter = "blur(16px)";
    inner.style.webkitBackdropFilter = "blur(16px)";
    inner.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)";

    const img = document.createElement("img");
    img.id = "imgLightboxImg";
    img.style.maxWidth = "92vw";
    img.style.maxHeight = "82vh";
    img.style.objectFit = "contain";
    img.style.display = "block";

    const close = document.createElement("button");
    close.textContent = "×";
    close.style.position = "absolute";
    close.style.top = "8px";
    close.style.right = "10px";
    close.style.width = "40px";
    close.style.height = "40px";
    close.style.borderRadius = "999px";
    close.style.border = "1px solid rgba(255,255,255,0.45)";
    close.style.background = "rgba(0,0,0,0.25)";
    close.style.color = "#fff";
    close.style.fontSize = "26px";

    close.onclick = () => { overlay.style.display = "none"; img.removeAttribute("src"); };
    overlay.onclick = (e) => { if (e.target === overlay) close.onclick(); };

    inner.appendChild(img);
    inner.appendChild(close);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
  }

  const img = $("imgLightboxImg");
  overlay.style.display = "flex";
  setImgWithFallback_(img, buildImageCandidates_(url));
}

function renderPhotoWall_(urls) {
  ensurePhotoWallDom_();
  const wrap = $("photoWall");
  const grid = $("photoWallGrid");
  if (!wrap || !grid) return;

  const list = (urls || []).map(text).filter(Boolean).slice(0, CONFIG.GALLERY_MAX);
  if (!list.length) {
    wrap.style.display = "none";
    grid.innerHTML = "";
    return;
  }

  wrap.style.display = "block";
  grid.innerHTML = "";

  for (const u of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.border = "none";
    btn.style.padding = "0";
    btn.style.borderRadius = "14px";
    btn.style.overflow = "hidden";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 10px 24px rgba(0,0,0,0.10)";

    const img = document.createElement("img");
    img.alt = "縮圖";
    img.style.width = "100%";
    img.style.aspectRatio = "1/1";
    img.style.objectFit = "contain";
    img.style.background = "rgba(0,0,0,0.06)";
    img.style.display = "block";

    setImgWithFallback_(img, buildImageCandidates_(u));
    btn.onclick = () => openLightbox_(u);

    btn.appendChild(img);
    grid.appendChild(btn);
  }
}

/* ===========================
 * Apply data into your existing V385 DOM
 * =========================== */
function setAvatar_(url) {
  const img = $("u-img");
  if (!img) return;
  setImgWithFallback_(img, buildImageCandidates_(url));
}

function applyDataToCard_(norm) {
  // Core
  const name = pick(norm, ["姓名", "name"]);
  const unit = pick(norm, ["單位名稱", "單位", "unit"]);
  const service = pick(norm, ["服務項目", "核心業務", "service"]);

  // Avatar / Logo / Photos (very flexible)
  const avatar =
    pick(norm, ["個人專業形象照", "形象照", "頭像", "照片", "avatar"]) ||
    pickByRegex_(norm, [/形象照/i, /頭像/i, /avatar/i]);

  const logo =
    pick(norm, ["logo", "Logo", "LOGO", "品牌Logo", "品牌logo"]) ||
    pickByRegex_(norm, [/logo/i, /標誌/i]);

  // Contacts & extras are not forced into your existing boxes;
  // (you already have an "立即填寫" box + u-service box)
  // Here we only ensure core text shows and extra assets render.
  setText("u-name", name || "（未填姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  if (avatar) setAvatar_(avatar);

  if (logo) setLogoImage_(logo);
  else setLogoImage_("");

  const photos = autoDetectPhotos_(norm);
  renderPhotoWall_(photos);

  log_("applyData:", { hasLogo: !!logo, photos: photos.length });
}

/* ===========================
 * Load from GAS action=card&id=
 * =========================== */
async function loadData_() {
  const id = getCardId();
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端內容...");
  setLogoImage_("");
  renderPhotoWall_([]);

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  log_("fetch:", url);

  const data = await fetchJsonRobust(url);
  if (!data || typeof data !== "object") throw new Error("Invalid payload");
  if (data.ok === false) throw new Error(data.error || "Not found");

  const norm = buildNorm_(data);
  applyDataToCard_(norm);
}

/* ===========================
 * Boot
 * =========================== */
function boot_() {
  injectPremiumFx_();      // 精品感：立體描邊 + 呼吸
  applyV382();             // keep your body classes
  applyPlanSplitUi_();     // no plan button injection (fix duplication)
  ensurePhotoWallDom_();   // insert placeholder now

  loadData_().catch(e => {
    err_(e);
    setText("u-name", "（同步失敗）");
    setText("u-unit", e.message || "請檢查 GAS/欄位");
    setText("u-service", "");
    setLogoImage_("");
    renderPhotoWall_([]);
  });
}

document.addEventListener("DOMContentLoaded", boot_, { once: true });
window.addEventListener("load", () => { /* fallback */ }, { once: true });