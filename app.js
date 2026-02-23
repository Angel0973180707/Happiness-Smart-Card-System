/* ================================
 * Angel Card App.js (FULL OVERWRITE)
 * - Step flow: choose plan first, then branch controls
 * - Contact block: LINE / website / phone / email / address
 * - Gallery: dynamic aspect ratio + contain (no crop) + click open original
 * - Keep: no custom headers (avoid CORS preflight)
 * - Keep: robust key normalization + image fallback chain + auto-detect photos
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 10000,
  RETRY: 2,

  GALLERY_AUTOPLAY_MS: 3200,
  GALLERY_MAX: 5,

  DOM_WAIT_MS: 2400,
  DOM_POLL_MS: 80,

  GALLERY_MIN_RATIO: 1 / 1.6,
  GALLERY_MAX_RATIO: 1.9,
  GALLERY_MAX_WIDTH: 520,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;

let __gallery = {
  list: [],
  index: 0,
  timer: null,
  inited: false,
  lastMode: null,
  lastShownUrl: ""
};

let __lastLoad = { id: "", ts: 0, url: "" };

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[AngelCard]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[AngelCard]", ...arguments); }
function err_() { console.error("[AngelCard]", ...arguments); }

function setText(id, v) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function nowIso_() { try { return new Date().toISOString(); } catch { return String(Date.now()); } }

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
 * ✅ Step flow: plan branching UI
 * --------------------------- */
function syncPlanUi_() {
  const rowFree = $("rowFreeDots");
  const rowPremium = $("rowPremiumDots");
  const freeControls = $("free-controls");
  const btnFree = $("btnPlanFree");
  const btnPremium = $("btnPlanPremium");

  const isFree = state.mode === "free";

  if (rowFree) rowFree.style.display = isFree ? "flex" : "none";
  if (rowPremium) rowPremium.style.display = isFree ? "none" : "flex";
  if (freeControls) freeControls.style.display = isFree ? "block" : "none";

  if (btnFree) btnFree.style.opacity = isFree ? "1" : ".55";
  if (btnPremium) btnPremium.style.opacity = isFree ? ".55" : "1";
}

window.setPlan = function(mode){
  const m = (mode === "premium") ? "premium" : "free";
  state.mode = m;

  // default theme when switching
  if (m === "free") state.theme = state.theme && state.theme.startsWith("color-") ? state.theme : "color-1";
  if (m === "premium") state.theme = state.theme && state.theme.startsWith("p") ? state.theme : "p1";

  // clear active dots then re-activate a reasonable one
  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (m === "free") {
    const first = document.querySelector(".dot");
    if (first) first.classList.add("active");
  } else {
    const first = document.querySelector(".p-dot");
    if (first) first.classList.add("active");
  }

  applyV382();
  syncPlanUi_();
  refreshGalleryMode_();
};

/* ---------------------------
 * Keep existing switching system
 * --------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
  syncPlanUi_();
  refreshGalleryMode_();
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
    for (const id of need) {
      if (!$(id)) { ok = false; break; }
    }
    if (ok) return true;
    await sleep(CONFIG.DOM_POLL_MS);
  }
  return false;
}

function coreUiReady_() {
  return !!$("u-name") && !!$("u-unit") && !!$("u-service");
}

/* ---------------------------
 * Fetch (NO custom headers)
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
      const m = body.match(/(\{[\s\S]*\}|[\s\S]*)/);
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
      await sleep(450 + i * 450);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
 * Key normalize
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

function setImgWithFallback_(imgEl, candidates, onLoaded) {
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
    try { onLoaded && onLoaded(imgEl); } catch {}
  };
  imgEl.onerror = () => {
    if (imgEl.dataset.loadToken !== token) return;
    tryNext();
  };

  imgEl.style.opacity = "0";
  tryNext();
}

function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;

  const cands = buildImageCandidates_(url);
  if (!cands.length) {
    img.removeAttribute("src");
    return;
  }

  img.style.opacity = "0";
  img.style.transition = "opacity 420ms ease";
  setImgWithFallback_(img, cands);
}

/* ---------------------------
 * Photos parsing + AUTO DETECT
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
    if (!/(照片|相片|作品|圖|照)/.test(kk)) continue;

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
    pick(payload, ["photos_img"]) ||
    pick(payload, ["照片_fast", "照片_fast "]) ||
    payload.photos ||
    pick(payload, ["photos"]) ||
    pick(payload, ["照片"]);

  const base = splitLinks_(v)
    .filter(Boolean)
    .map(u => normalizeImageUrl(u))
    .filter(Boolean);

  const auto = base.length ? [] : autoDetectPhotos_(payload);

  return (base.length ? base : auto).slice(0, CONFIG.GALLERY_MAX);
}

/* ---------------------------
 * Gallery DOM (dynamic ratio + contain + click open original)
 * --------------------------- */
function clamp_(n, a, b){ return Math.max(a, Math.min(b, n)); }

function setGalleryRatio_(ratio) {
  const box = $("galleryBox");
  if (!box) return;
  const r = clamp_(ratio || (16/9), CONFIG.GALLERY_MIN_RATIO, CONFIG.GALLERY_MAX_RATIO);
  box.style.aspectRatio = String(r);
}

function openUrlNewTab_(url) {
  const u = text(url);
  if (!u) return;
  try { window.open(u, "_blank", "noopener,noreferrer"); } catch { window.open(u, "_blank"); }
}

function ensureGalleryDom_() {
  if (__gallery.inited) return;

  const card = $("card-container");
  if (!card) return;

  const wrap = document.createElement("div");
  wrap.id = "photoGallery";
  wrap.setAttribute("aria-label", "產品照片預覽");
  wrap.style.margin = "12px auto 0";
  wrap.style.width = `min(92vw, ${CONFIG.GALLERY_MAX_WIDTH}px)`;
  wrap.style.borderRadius = "18px";
  wrap.style.overflow = "hidden";
  wrap.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)";
  wrap.style.position = "relative";
  wrap.style.background = "rgba(255,255,255,.35)";
  wrap.style.backdropFilter = "blur(6px)";

  const box = document.createElement("div");
  box.id = "galleryBox";
  box.style.width = "100%";
  box.style.aspectRatio = "16 / 9";
  box.style.position = "relative";
  box.style.background = "rgba(0,0,0,.03)";

  const img = document.createElement("img");
  img.id = "galleryImg";
  img.alt = "產品照";
  img.loading = "lazy";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.style.position = "absolute";
  img.style.inset = "0";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";   /* ✅ 等比例縮小看全貌 */
  img.style.objectPosition = "center";
  img.style.opacity = "0";
  img.style.transition = "opacity 520ms ease";
  img.style.cursor = "zoom-in";

  img.addEventListener("click", () => {
    const u = __gallery.lastShownUrl || (__gallery.list[__gallery.index] || "");
    openUrlNewTab_(u);               /* ✅ 點進去看原圖 */
  });

  box.appendChild(img);

  const dots = document.createElement("div");
  dots.id = "galleryDots";
  dots.style.position = "absolute";
  dots.style.left = "50%";
  dots.style.bottom = "10px";
  dots.style.transform = "translateX(-50%)";
  dots.style.display = "flex";
  dots.style.gap = "6px";
  dots.style.padding = "6px 10px";
  dots.style.borderRadius = "999px";
  dots.style.background = "rgba(255,255,255,.55)";
  dots.style.backdropFilter = "blur(6px)";
  dots.style.pointerEvents = "none";

  box.appendChild(dots);
  wrap.appendChild(box);

  const vtag = card.querySelector(".version-tag");
  if (vtag && vtag.parentElement === card) card.insertBefore(wrap, vtag);
  else card.appendChild(wrap);

  let startX = 0, startY = 0, moved = false;

  wrap.addEventListener("touchstart", (e) => {
    if (!e.touches || !e.touches[0]) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved = false;
  }, { passive: true });

  wrap.addEventListener("touchmove", (e) => {
    if (!e.touches || !e.touches[0]) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) moved = true;
  }, { passive: true });

  wrap.addEventListener("touchend", (e) => {
    if (state.mode !== "free") return;
    if (!moved) return;
    const end = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if (!end) return;
    const dx = end.clientX - startX;
    if (Math.abs(dx) < 28) return;
    if (dx < 0) galleryNext_();
    else galleryPrev_();
  });

  __gallery.inited = true;
  __gallery.lastMode = state.mode;
}

function renderGalleryDots_(count) {
  const dots = $("galleryDots");
  if (!dots) return;
  dots.innerHTML = "";
  if (count <= 1) {
    dots.style.display = "none";
    return;
  }
  dots.style.display = "flex";
  for (let i = 0; i < count; i++) {
    const d = document.createElement("span");
    d.style.width = "7px";
    d.style.height = "7px";
    d.style.borderRadius = "999px";
    d.style.background = (i === __gallery.index) ? "rgba(0,0,0,.55)" : "rgba(0,0,0,.18)";
    dots.appendChild(d);
  }
}

function setGalleryImage_(url) {
  const img = $("galleryImg");
  if (!img) return;

  const candidates = buildImageCandidates_(url);
  if (!candidates.length) {
    img.removeAttribute("src");
    img.style.opacity = "0";
    return;
  }

  __gallery.lastShownUrl = normalizeImageUrl(url);

  img.style.opacity = "0";
  setImgWithFallback_(img, candidates, (loadedImg) => {
    const w = loadedImg.naturalWidth || 0;
    const h = loadedImg.naturalHeight || 0;
    if (w > 0 && h > 0) setGalleryRatio_(w / h);   /* ✅ 動態平衡容器比例 */
  });
}

function galleryNext_() {
  if (!__gallery.list.length) return;
  __gallery.index = (__gallery.index + 1) % __gallery.list.length;
  setGalleryImage_(__gallery.list[__gallery.index]);
  renderGalleryDots_(__gallery.list.length);
}
function galleryPrev_() {
  if (!__gallery.list.length) return;
  __gallery.index = (__gallery.index - 1 + __gallery.list.length) % __gallery.list.length;
  setGalleryImage_(__gallery.list[__gallery.index]);
  renderGalleryDots_