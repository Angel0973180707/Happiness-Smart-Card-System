/* ================================
 * Angel Card App.js (V387.2 FULL OVERWRITE)
 * Goal:
 * - KEEP V385 layout/face/sample look (no HTML/CSS edits required)
 * - Robust header auto-pick for ALL sheet fields
 * - Auto blocks: Unit/Title/Slogan/Experience/Contacts/Logo/PhotoWall
 * - Add premium feel buttons: 3D outline + breathing (CSS injected by JS)
 * - Logo: top-right small logo (auto-insert if #u-logo not present)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  GALLERY_MAX: 12,
  THUMB_MIN_COL: 3,
  THUMB_MAX_COL: 4,

  DOM_WAIT_MS: 2800,
  DOM_POLL_MS: 80,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;

let __gallery = { list: [], inited: false };
let __lastLoad = { id: "", ts: 0, url: "" };

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[AngelCard]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[AngelCard]", ...arguments); }
function err_() { console.error("[AngelCard]", ...arguments); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* --------------------------- */
function getParam(name) {
  try { return new URLSearchParams(window.location.search).get(name); }
  catch { return null; }
}
function getCardId() {
  const id = text(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

/* ---------------------------
 * KEEP existing switching API (V385/V382 compatible)
 * --------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
  applyPlanSplitUi_();
  updatePlanButtonsActive_();
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

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];
  document.body.className = classList.filter(Boolean).join(" ");
}

/* --------------------------- */
async function waitForDom_(ids, timeoutMs = CONFIG.DOM_WAIT_MS) {
  const need = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    let ok = true;
    for (const id of need) { if (!$(id)) { ok = false; break; } }
    if (ok) return true;
    await sleep(CONFIG.DOM_POLL_MS);
  }
  return false;
}

function coreUiReady_() {
  return !!$("u-name") && !!$("u-unit") && !!$("u-service");
}

/* ---------------------------
 * Fetch JSON (NO custom headers)
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

    const status = res.status;
    const ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : "";
    const txt = await res.text();
    const body = (txt || "").trim();

    if (CONFIG.DEBUG) {
      const head = body.slice(0, 180).replace(/\s+/g, " ");
      log_("fetch:", { status, ct, len: body.length, head });
    }

    if (!res.ok && !body) throw new Error(`HTTP ${status} (empty)`);
    if (!body) throw new Error("Empty response");

    try {
      return JSON.parse(body);
    } catch {
      const m = body.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) return JSON.parse(m[1]);
      throw new Error(`Not JSON (status=${status}, ct=${ct || "?"})`);
    }
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonRobust(url) {
  let lastErr = null;
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    try {
      return await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT_MS);
    } catch (e) {
      lastErr = e;
      warn_("fetch retry:", i, "err:", e && e.message ? e.message : e);
      await sleep(520 + i * 520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
 * Key normalize + pick helpers
 * --------------------------- */
function cleanKey_(k) {
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "")
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "")
    .trim();
}

function buildNormalizedPayload_(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  const lowerMap = Object.create(null);

  for (const k of Object.keys(obj)) {
    const nk = cleanKey_(k);
    if (!nk) continue;
    const v = obj[k];

    if (out[nk] == null || text(out[nk]) === "") out[nk] = v;

    const lk = nk.toLowerCase();
    if (lowerMap[lk] == null || text(lowerMap[lk]) === "") lowerMap[lk] = v;
  }

  out.__lower = lowerMap;
  return out;
}

/** multi-key pick: exact, lower, raw */
function pick(obj, keys) {
  if (!obj) return "";
  const raw = obj.__raw || null;
  const lower = obj.__lower || null;

  for (const k of keys) {
    if (k == null) continue;
    const kk = cleanKey_(k);

    const v1 = obj[kk];
    if (v1 != null && text(v1) !== "") return v1;

    if (lower) {
      const v2 = lower[String(kk).toLowerCase()];
      if (v2 != null && text(v2) !== "") return v2;
    }
  }

  if (raw) {
    for (const k of keys) {
      const v = raw[k];
      if (v != null && text(v) !== "") return v;
    }
  }

  return "";
}

/** loose pick: find by regex on header keys */
function pickByHeaderRegex_(payloadNorm, regexList) {
  if (!payloadNorm || typeof payloadNorm !== "object") return "";
  const keys = Object.keys(payloadNorm).filter(k => k && !k.startsWith("__"));
  for (const rx of regexList) {
    for (const k of keys) {
      if (rx.test(String(k))) {
        const v = payloadNorm[k];
        if (v != null && text(v) !== "") return v;
      }
    }
  }
  return "";
}

/* ---------------------------
 * Image helpers
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

  const mThumb = url.match(/thumbnail\?id=([^&]+)/i);
  if (mThumb && mThumb[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mThumb[1])}`;

  return url;
}

function buildImageCandidates_(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const original = s.startsWith("http://") ? "https://" + s.slice(7) : s;

  let driveId = "";
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  const mId = original.match(/(?:\?|&)id=([^&]+)/i);
  const mThumb = original.match(/thumbnail\?id=([^&]+)/i);

  if (mFile && mFile[1]) driveId = mFile[1];
  else if (mId && mId[1]) driveId = mId[1];
  else if (mThumb && mThumb[1]) driveId = mThumb[1];

  if (original.includes("dropbox.com")) return [normalizeImageUrl(original)];

  if (driveId) {
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`,
      original
    ];
  }

  return [normalizeImageUrl(original)];
}

function setImgWithFallback_(imgEl, candidates) {
  if (!imgEl) return;
  const list = (candidates || []).map(text).filter(Boolean);
  if (!list.length) {
    imgEl.removeAttribute("src");
    return;
  }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;

  let idx = 0;

  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";

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
    requestAnimationFrame(() => (imgEl.style.opacity = "1"));
  };
  imgEl.onerror = () => {
    if (imgEl.dataset.loadToken !== token) return;
    tryNext();
  };

  imgEl.style.opacity = "0";
  imgEl.style.transition = "opacity 420ms ease";
  tryNext();
}

/* ---------------------------
 * Split links for photos
 * --------------------------- */
function splitLinks_(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => text(x)).filter(Boolean);
  const s = text(v);
  if (!s) return [];
  return s.split(/[\n,，;；]+/).map(x => text(x)).filter(Boolean);
}

function autoDetectPhotos_(payload) {
  if (!payload || typeof payload !== "object") return [];
  const out = [];
  const keys = Object.keys(payload).filter(k => k && !k.startsWith("__"));
  for (const k of keys) {
    const kk = String(k);
    if (!/(照片|相片|作品|圖|照|photo|image|img)/i.test(kk)) continue;
    const v = payload[k];
    const parts = splitLinks_(v);
    for (const p of parts) {
      if (/^https?:\/\//i.test(p)) out.push(p);
    }
  }
  const uniq = [];
  const seen = new Set();
  for (const u of out) {
    const nu = normalizeImageUrl(u);
    if (!nu) continue;
    if (seen.has(nu)) continue;
    seen.add(nu);
    uniq.push(nu);
  }
  return uniq;
}

function getPhotosArray_(payload) {
  const v =
    pick(payload, ["照片_fast", "photos_fast", "photos_img"]) ||
    pick(payload, ["照片", "photos", "作品照片", "相片"]) ||
    payload.photos;

  const base = splitLinks_(v)
    .filter(Boolean)
    .map(u => normalizeImageUrl(u))
    .filter(Boolean);

  const auto = base.length ? [] : autoDetectPhotos_(payload);
  return (base.length ? base : auto).slice(0, CONFIG.GALLERY_MAX);
}

/* ===========================
 * Premium feel (3D outline + breathing) - injected CSS
 * =========================== */
function injectPremiumButtonFx_() {
  if ($("ac_fx_style")) return;

  const style = document.createElement("style");
  style.id = "ac_fx_style";
  style.textContent = `
  /* Premium 3D outline + breathing */
  @keyframes angelBreath {
    0%   { transform: translateY(0) scale(1); filter: saturate(1); }
    50%  { transform: translateY(-1px) scale(1.015); filter: saturate(1.06); }
    100% { transform: translateY(0) scale(1); filter: saturate(1); }
  }

  /* Plan buttons (injected) */
  #plan-selector .btn-neo.pill{
    position: relative;
    border-radius: 999px;
    padding: 10px 14px;
    font-weight: 900;
    letter-spacing: .3px;
    border: 1px solid rgba(255,255,255,.65);
    box-shadow:
      0 10px 26px rgba(0,0,0,.10),
      0 2px 0 rgba(255,255,255,.55) inset,
      0 -2px 0 rgba(0,0,0,.06) inset;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
    animation: angelBreath 2.4s ease-in-out infinite;
  }
  #plan-selector .btn-neo.pill:hover{
    transform: translateY(-2px) scale(1.02);
    box-shadow:
      0 14px 34px rgba(0,0,0,.14),
      0 2px 0 rgba(255,255,255,.65) inset,
      0 -2px 0 rgba(0,0,0,.06) inset;
  }
  #plan-selector .btn-neo.pill:active{
    transform: translateY(0) scale(0.99);
    box-shadow:
      0 8px 20px rgba(0,0,0,.10),
      0 1px 0 rgba(255,255,255,.55) inset,
      0 -1px 0 rgba(0,0,0,.06) inset;
  }
  #plan-selector .btn-neo.pill.active{
    outline: 2px solid rgba(0,0,0,.15);
    outline-offset: 2px;
    filter: brightness(1.03);
  }

  /* CTA button (existing .btn-cta) add a subtle premium edge without breaking V385 */
  .btn-cta{
    border: 1px solid rgba(255,255,255,.55);
    box-shadow:
      0 12px 26px rgba(0,0,0,.12),
      0 2px 0 rgba(255,255,255,.40) inset,
      0 -2px 0 rgba(0,0,0,.10) inset;
    animation: angelBreath 2.6s ease-in-out infinite;
  }
  `;
  document.head.appendChild(style);
}

/* ===========================
 * Plan selector UI (safe inject)
 * =========================== */
function ensurePlanSelectorUi_() {
  const panel = $("admin-panel");
  if (!panel) return;
  if ($("plan-selector")) return;

  const wrap = document.createElement("div");
  wrap.id = "plan-selector";
  wrap.style.display = "flex";
  wrap.style.justifyContent = "center";
  wrap.style.gap = "10px";
  wrap.style.padding = "10px 12px 6px";
  wrap.style.flexWrap = "wrap";

  const btnFree = document.createElement("button");
  btnFree.id = "btnPlanFree";
  btnFree.type = "button";
  btnFree.textContent = "方案 A｜自由搭配";
  btnFree.className = "btn-neo pill";

  const btnPremium = document.createElement("button");
  btnPremium.id = "btnPlanPremium";
  btnPremium.type = "button";
  btnPremium.textContent = "方案 B｜精品設計";
  btnPremium.className = "btn-neo pill";

  btnFree.addEventListener("click", () => {
    state.mode = "free";
    if (!String(state.theme || "").startsWith("color-")) state.theme = "color-1";
    applyV382();
    applyPlanSplitUi_();
    updatePlanButtonsActive_();
    // also toggle dots row active dot state: keep existing dot UI intact
  });

  btnPremium.addEventListener("click", () => {
    state.mode = "premium";
    // keep your premium theme naming
    if (!String(state.theme || "").startsWith("p")) state.theme = "p1";
    applyV382();
    applyPlanSplitUi_();
    updatePlanButtonsActive_();
  });

  wrap.appendChild(btnFree);
  wrap.appendChild(btnPremium);

  // insert at top of admin panel
  panel.insertBefore(wrap, panel.firstChild);

  updatePlanButtonsActive_();
}

function updatePlanButtonsActive_() {
  const a = $("btnPlanFree");
  const b = $("btnPlanPremium");
  if (!a || !b) return;
  if (state.mode === "free") {
    a.classList.add("active");
    b.classList.remove("active");
  } else {
    b.classList.add("active");
    a.classList.remove("active");
  }
}

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
 * Lightbox (view original)
 * =========================== */
function ensureLightbox_() {
  if ($("imgLightbox")) return;

  const overlay = document.createElement("div");
  overlay.id = "imgLightbox";
  overlay.className = "img-lightbox";
  overlay.style.display = "none";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "9999";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";

  const inner = document.createElement("div");
  inner.className = "img-lightbox-inner";
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
  img.alt = "原圖";
  img.style.maxWidth = "92vw";
  img.style.maxHeight = "82vh";
  img.style.objectFit = "contain";
  img.style.display = "block";

  const close = document.createElement("button");
  close.id = "imgLightboxClose";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "關閉");
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
  close.style.cursor = "pointer";

  inner.appendChild(img);
  inner.appendChild(close);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  const hide = () => {
    overlay.style.display = "none";
    img.removeAttribute("src");
  };

  overlay.addEventListener("click", (e) => { if (e.target === overlay) hide(); });
  close.addEventListener("click", hide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display !== "none") hide();
  });
}

function openLightbox_(url) {
  ensureLightbox_();
  const overlay = $("imgLightbox");
  const img = $("imgLightboxImg");
  if (!overlay || !img) return;
  overlay.style.display = "flex";
  const cands = buildImageCandidates_(url);
  setImgWithFallback_(img, cands.length ? cands : [url]);
}

/* ===========================
 * Photo wall (safe inject into card)
 * =========================== */
function ensurePhotoWallDom_() {
  if (__gallery.inited) return;
  const card = $("card-container");
  if (!card) return;

  const vtag = card.querySelector(".version-tag");

  const wrap = document.createElement("section");
  wrap.id = "photoWall";
  wrap.className = "photo-wall content-box";
  wrap.style.display = "none";

  const head = document.createElement("div");
  head.className = "box-title";
  head.textContent = "照片作品（點一下看原圖）";

  const grid = document.createElement("div");
  grid.id = "photoWallGrid";
  grid.className = "photo-wall-grid";
  grid.style.display = "grid";
  grid.style.gap = "10px";

  wrap.appendChild(head);
  wrap.appendChild(grid);

  if (vtag && vtag.parentElement) vtag.parentElement.insertBefore(wrap, vtag);
  else card.appendChild(wrap);

  const setCols = () => {
    const w = Math.min(window.innerWidth, 560);
    const cols = w >= 420 ? CONFIG.THUMB_MAX_COL : CONFIG.THUMB_MIN_COL;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  };
  setCols();
  window.addEventListener("resize", setCols);

  __gallery.inited = true;
}

function renderPhotoWall_(urls) {
  ensurePhotoWallDom_();
  const wrap = $("photoWall");
  const grid = $("photoWallGrid");
  if (!wrap || !grid) return;

  const list = (urls || []).map(text).filter(Boolean);
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
    btn.className = "photo-thumb";
    btn.setAttribute("aria-label", "點擊查看原圖");
    btn.style.border = "none";
    btn.style.padding = "0";
    btn.style.borderRadius = "14px";
    btn.style.overflow = "hidden";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 10px 24px rgba(0,0,0,0.10)";

    const img = document.createElement("img");
    img.alt = "縮圖";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.style.width = "100%";
    img.style.aspectRatio = "1 / 1";
    img.style.objectFit = "contain";
    img.style.background = "rgba(0,0,0,0.06)";

    setImgWithFallback_(img, buildImageCandidates_(u));
    btn.addEventListener("click", () => openLightbox_(u));

    btn.appendChild(img);
    grid.appendChild(btn);
  }
}

/* ===========================
 * Contact + Extra blocks (AUTO INJECT)
 * =========================== */
function ensureInfoScroll_() {
  return q(".info-scroll") || $("card-container") || document.body;
}

function ensureBoxAfter_(anchorEl, boxId, titleText) {
  const root = ensureInfoScroll_();
  if ($(boxId)) return $(boxId);

  const box = document.createElement("div");
  box.id = boxId;
  box.className = "content-box";

  const t = document.createElement("div");
  t.className = "box-title";
  t.textContent = titleText;

  const body = document.createElement("div");
  body.id = boxId + "_body";
  body.style.whiteSpace = "pre-line";
  body.style.fontWeight = "700";
  body.style.color = "rgba(255,255,255,0.88)";
  body.style.lineHeight = "1.7";

  box.appendChild(t);
  box.appendChild(body);

  if (anchorEl && anchorEl.parentElement) {
    if (anchorEl.nextSibling) anchorEl.parentElement.insertBefore(box, anchorEl.nextSibling);
    else anchorEl.parentElement.appendChild(box);
  } else {
    root.appendChild(box);
  }

  return box;
}

function normalizeTel_(v) {
  const s = text(v);
  if (!s) return "";
  return s.replace(/[^\d+]/g, "");
}
function normalizeEmail_(v) {
  const s = text(v);
  if (!s) return "";
  return s.replace(/\s+/g, "");
}
function normalizeUrl_(v) {
  const s = text(v);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^line:\/\//i.test(s)) return s;
  return "https://" + s;
}

function makeMainBtn_(label, urlOrFn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn-cta mini";
  b.textContent = label;
  b.style.borderRadius = "999px";
  b.style.padding = "12px 14px";
  b.style.fontWeight = "900";
  b.style.letterSpacing = ".3px";
  b.style.margin = "6px 6px 0 0";
  b.addEventListener("click", async () => {
    if (typeof urlOrFn === "function") return urlOrFn();
    const u = text(urlOrFn);
    if (!u) return;
    window.open(u, "_blank");
  });
  return b;
}
function makeChip_(label, url) {
  const a = document.createElement("a");
  a.className = "chip";
  a.textContent = label;
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "inline-block";
  a.style.margin = "6px 8px 0 0";
  a.style.padding = "8px 10px";
  a.style.borderRadius = "999px";
  a.style.textDecoration = "none";
  a.style.border = "1px solid rgba(255,255,255,0.25)";
  a.style.background = "rgba(255,255,255,0.10)";
  a.style.backdropFilter = "blur(10px)";
  a.style.webkitBackdropFilter = "blur(10px)";
  a.style.color = "inherit";
  return a;
}
async function copyText_(s) {
  const v = text(s);
  if (!v) return;
  try {
    await navigator.clipboard.writeText(v);
    alert("已複製：" + v);
  } catch {
    prompt("請複製：", v);
  }
}

function ensureContactBox_() {
  const scroll = ensureInfoScroll_();
  if ($("contactBox")) return $("contactBox");

  const box = document.createElement("div");
  box.id = "contactBox";
  box.className = "content-box";

  const t = document.createElement("div");
  t.className = "box-title";
  t.textContent = "聯繫方式";

  const main = document.createElement("div");
  main.className = "contact-main";
  main.id = "contactMain";

  const sub = document.createElement("div");
  sub.className = "contact-sub";
  sub.id = "contactSub";

  box.appendChild(t);
  box.appendChild(main);
  box.appendChild(sub);

  const serviceEl = $("u-service");
  const serviceBox = serviceEl ? serviceEl.closest(".content-box") : null;
  if (serviceBox && serviceBox.parentElement) {
    if (serviceBox.nextSibling) serviceBox.parentElement.insertBefore(box, serviceBox.nextSibling);
    else serviceBox.parentElement.appendChild(box);
  } else {
    scroll.appendChild(box);
  }

  return box;
}

function renderContacts_(payloadNorm) {
  const box = ensureContactBox_();
  if (!box) return;

  const main = $("contactMain");
  const sub = $("contactSub");
  if (!main || !sub) return;

  main.innerHTML = "";
  sub.innerHTML = "";

  const wechat = pick(payloadNorm, ["微信", "WeChat", "wechat"]);
  const lineLink = pick(payloadNorm, ["LINE連結", "line_link", "LINE link", "line"]);
  const lineOA = pick(payloadNorm, ["LINE官方帳號", "LINE 官方帳號", "line_oa", "lin.ee"]);
  const email = pick(payloadNorm, ["Email", "email", "E-mail", "信箱"]);
  const phone = pick(payloadNorm, ["電話", "phone", "tel", "mobile", "手機"]);
  const addr = pick(payloadNorm, ["地址", "address", "住址", "地點"]);

  const media1 = pick(payloadNorm, ["影音平台1", "video1", "media1"]);
  const media2 = pick(payloadNorm, ["影音平台2", "video2", "media2"]);
  const media3 = pick(payloadNorm, ["影音平台3", "video3", "media3"]);

  const social1 = pick(payloadNorm, ["社群平台1", "social1"]);
  const social2 = pick(payloadNorm, ["社群平台2", "social2"]);
  const social3 = pick(payloadNorm, ["社群平台3", "social3"]);

  const bestLine = text(lineLink) ? normalizeUrl_(lineLink) : (text(lineOA) ? normalizeUrl_(lineOA) : "");
  if (bestLine) main.appendChild(makeMainBtn_("加 LINE / 聯繫", bestLine));

  const bestWeb = text(media1) ? normalizeUrl_(media1) : (text(social1) ? normalizeUrl_(social1) : "");
  if (bestWeb) main.appendChild(makeMainBtn_("前往官網 / 作品", bestWeb));

  main.appendChild(makeMainBtn_("填寫預約表單", () => window.open(CONFIG.FORM, "_blank")));

  if (wechat) {
    main.appendChild(makeMainBtn_("微信聯繫（複製）", () => copyText_(wechat)));
  }

  if (phone) {
    const t = normalizeTel_(phone);
    if (t) sub.appendChild(makeChip_("電話：" + t, "tel:" + t));
  }
  if (email) {
    const e = normalizeEmail_(email);
    if (e) sub.appendChild(makeChip_("Email：" + e, "mailto:" + e));
  }

  if (addr) {
    const a = text(addr);
    const maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a);
    sub.appendChild(makeChip_("地址導航", maps));
  }

  const extraLinks = [
    ["影音平台2", media2],
    ["影音平台3", media3],
    ["社群平台1", social1],
    ["社群平台2", social2],
    ["社群平台3", social3],
  ];
  for (const [label, v] of extraLinks) {
    if (!text(v)) continue;
    sub.appendChild(makeChip_(label, normalizeUrl_(v)));
  }

  if (!main.children.length && !sub.children.length) {
    const note = document.createElement("div");
    note.style.opacity = "0.75";
    note.style.fontSize = "13px";
    note.textContent = "（尚未提供聯繫方式）";
    main.appendChild(note);
  }
}

/* ===========================
 * Logo (Top-right small) - SAFE inject (no HTML changes)
 * =========================== */
function ensureTopRightLogo_() {
  // If user already has #u-logo, we respect it
  if ($("u-logo")) return $("u-logo");

  const card = $("card-container");
  if (!card) return null;

  let holder = $("logoHolderTopRight");
  if (holder) return holder.querySelector("img") || null;

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
  holder.style.display = "flex";
  holder.style.alignItems = "center";
  holder.style.justifyContent = "center";
  holder.style.border = "1px solid rgba(255,255,255,0.55)";
  holder.style.background = "rgba(255,255,255,0.18)";
  holder.style.backdropFilter = "blur(12px)";
  holder.style.webkitBackdropFilter = "blur(12px)";
  holder.style.boxShadow =
    "0 16px 30px rgba(0,0,0,0.12), 0 2px 0 rgba(255,255,255,0.55) inset, 0 -2px 0 rgba(0,0,0,0.06) inset";

  const img = document.createElement("img");
  img.alt = "Logo";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.padding = "8px";
  img.style.opacity = "0";
  img.style.transition = "opacity .35s ease";

  holder.appendChild(img);
  card.appendChild(holder);

  // Mode tweak: premium card top has avatar left; keep logo right but slightly down
  const applyPos = () => {
    if (document.body.classList.contains("mode-premium")) {
      holder.style.top = "18px";
      holder.style.right = "16px";
      holder.style.width = "52px";
      holder.style.height = "52px";
    } else {
      holder.style.top = "14px";
      holder.style.right = "14px";
      holder.style.width = "56px";
      holder.style.height = "56px";
    }
  };
  applyPos();
  // call again after mode changes
  const _origApplyV382 = applyV382;
  applyV382 = function(){
    _origApplyV382();
    applyPos();
  };

  return img;
}

function setLogoImage_(logoUrl) {
  const img = ensureTopRightLogo_();
  if (!img) return;

  const cands = buildImageCandidates_(logoUrl);
  if (!cands.length) {
    img.style.opacity = "0";
    img.removeAttribute("src");
    const holder = $("logoHolderTopRight");
    if (holder) holder.style.display = "none";
    return;
  }
  const holder = $("logoHolderTopRight");
  if (holder) holder.style.display = "flex";
  setImgWithFallback_(img, cands);
  // ensure visible when loaded
  const token = img.dataset.loadToken;
  const show = () => {
    if (img.dataset.loadToken !== token) return;
    img.style.opacity = "1";
  };
  img.onload = show;
  // fallback show after delay if browser doesn't fire load due to cache quirks
  setTimeout(show, 700);
}

/* ---------------------------
 * Avatar + basic fields
 * --------------------------- */
function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;
  const cands = buildImageCandidates_(url);
  if (!cands.length) {
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, cands);
}

/* ---------------------------
 * Apply all data to card (AUTO)
 * --------------------------- */
function applyDataToCard(payloadNorm) {
  const name = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const title = pick(payloadNorm, ["頭銜", "職稱", "title", "Title"]);
  const slogan = pick(payloadNorm, ["理念標語", "標語", "slogan", "tagline"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);
  const exp = pick(payloadNorm, ["經歷", "學經歷", "experience", "Experience"]);

  const avatar =
    pick(payloadNorm, ["個人照_fast", "個人照", "形象照_fast", "形象照", "avatar_img", "avatar"]) ||
    pickByHeaderRegex_(payloadNorm, [/個人照/i, /形象照/i, /avatar/i]);

  const logo =
    pick(payloadNorm, ["Logo_fast", "Logo", "logo", "LOGO"]) ||
    pickByHeaderRegex_(payloadNorm, [/logo/i, /LOGO/i, /標誌/i]);

  const photos = getPhotosArray_(payloadNorm);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  setAvatarImage(avatar);

  // Auto inject blocks only when value exists
  const scroll = ensureInfoScroll_();
  const serviceEl = $("u-service");
  const serviceBox = serviceEl ? serviceEl.closest(".content-box") : null;

  // Title
  if ($("u-title")) {
    setText("u-title", title || "");
  } else if (text(title)) {
    const unitEl = $("u-unit");
    const anchor = unitEl ? unitEl : (scroll.firstChild || null);
    const box = ensureBoxAfter_(anchor, "boxTitle", "頭銜");
    setText("boxTitle_body", title);
    box.style.display = "block";
  } else {
    if ($("boxTitle")) $("boxTitle").style.display = "none";
  }

  // Slogan
  if ($("u-slogan")) {
    setText("u-slogan", slogan || "");
  } else if (text(slogan)) {
    const box = ensureBoxAfter_(serviceBox || scroll, "boxSlogan", "理念標語");
    setText("boxSlogan_body", slogan);
    box.style.display = "block";
  } else {
    if ($("boxSlogan")) $("boxSlogan").style.display = "none";
  }

  // Experience
  if ($("u-exp")) {
    setText("u-exp", exp || "");
  } else if (text(exp)) {
    const box = ensureBoxAfter_(serviceBox || scroll, "boxExp", "經歷");
    setText("boxExp_body", exp);
    box.style.display = "block";
  } else {
    if ($("boxExp")) $("boxExp").style.display = "none";
  }

  // Contacts
  renderContacts_(payloadNorm);

  // Photo wall
  __gallery.list = photos;
  renderPhotoWall_(photos);

  // Logo (Top-right small)
  if (text(logo)) setLogoImage_(logo);
  else setLogoImage_("");
}

/* --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

/* ---------------------------
 * Loading / Fail UI
 * --------------------------- */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端內容...");
  // keep logo hidden while loading
  setLogoImage_("");
}

function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認網址 ?id=TW000X 或檢查 GAS 權限");
  setText("u-service", "");
  const img = $("u-img");
  if (img) img.removeAttribute("src");

  if ($("photoWall")) $("photoWall").style.display = "none";
  if ($("photoWallGrid")) $("photoWallGrid").innerHTML = "";

  if ($("contactMain")) $("contactMain").innerHTML = "";
  if ($("contactSub")) $("contactSub").innerHTML = "";

  if ($("boxTitle")) $("boxTitle").style.display = "none";
  if ($("boxSlogan")) $("boxSlogan").style.display = "none";
  if ($("boxExp")) $("boxExp").style.display = "none";

  setLogoImage_("");
}

/* ---------------------------
 * Load data
 * --------------------------- */
async function loadData() {
  const id = getCardId();
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  __lastLoad = { id, ts: Date.now(), url };

  await waitForDom_(["u-name", "u-unit", "u-service"], CONFIG.DOM_WAIT_MS);
  setLoadingUi_();

  log_("loadData start:", { id });

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    applyDataToCard(__payload);

    // mobile re-apply (layout settle)
    await sleep(180);
    const n = text($("u-name") ? $("u-name").textContent : "");
    if (!coreUiReady_() || n === "載入中..." || n === "（同步失敗）") {
      await waitForDom_(["u-name", "u-unit", "u-service"], CONFIG.DOM_WAIT_MS);
      applyDataToCard(__payload);
    }

    log_("loadData success:", {
      id,
      keys: Object.keys(data).length,
      photos: (__gallery.list || []).length
    });

  } catch (e) {
    err_("雲端同步異常:", e);
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
  }
}

/* ---------------------------
 * Boot
 * --------------------------- */
function boot_() {
  try {
    injectPremiumButtonFx_();
  } catch (e) {
    warn_("injectPremiumButtonFx_ failed:", e);
  }

  try { applyV382(); } catch {}
  try {
    ensurePlanSelectorUi_();
    applyPlanSplitUi_();
    updatePlanButtonsActive_();
  } catch {}

  try { loadData(); } catch (e) { err_("boot loadData error:", e); }
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => {
  if (!__lastLoad.ts) boot_();
});