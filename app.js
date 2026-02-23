/* ================================
 * Angel Card App.js (FULL OVERWRITE)
 * - Load by URL ?id=TW000X
 * - use GAS: ?action=card&id=...
 * - robust fetch + safe JSON
 * - FIX: weird headers with quotes/newlines (normalize keys)
 * - NEW: prefer avatar_img / photos_img (fallback to *_fast / photos / raw)
 * - NEW: Gallery
 *   - free  : manual swipe left/right
 *   - premium: autoplay carousel + fade-in
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec
",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 10000,
  RETRY: 2,

  // gallery behavior
  GALLERY_AUTOPLAY_MS: 3200,
  GALLERY_MAX: 5
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

// runtime
let __payloadRaw = null;
let __payload = null;
let __gallery = {
  list: [],
  index: 0,
  timer: null,
  inited: false
};

/* ---------------------------
 * Small helpers
 * --------------------------- */
function $(id) { return document.getElementById(id); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function setText(id, v) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el) return;
  el.textContent = text(v);
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/* ---------------------------
 * Read URL params
 * --------------------------- */
function getParam(name) {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get(name);
  } catch {
    return null;
  }
}
function getCardId() {
  const id = text(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

/* ---------------------------
 * Keep existing switching system
 * --------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
  // ✅ mode switch affects gallery behavior
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

/* ---------------------------
 * Robust fetch (no-store + timeout + retry + safe JSON)
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
      signal: controller.signal,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    const txt = await res.text();
    const body = (txt || "").trim();
    if (!body) throw new Error("Empty response");

    try {
      return JSON.parse(body);
    } catch {
      const m = body.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) return JSON.parse(m[1]);
      throw new Error("Not JSON (maybe HTML/login/blocked)");
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
      await sleep(450 + i * 450);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
 * Key normalize (fix: weird headers with quotes/newlines)
 * --------------------------- */
function cleanKey_(k) {
  return String(k ?? "")
    .replace(/\u3000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "")         // remove all newlines inside header
    .replace(/^[\s"“”']+|[\s"“”']+$/g, "") // trim quotes/spaces
    .trim();
}

function buildNormalizedPayload_(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  for (const k of Object.keys(obj)) {
    const nk = cleanKey_(k);
    if (!nk) continue;
    // keep first non-empty value priority
    if (out[nk] == null || text(out[nk]) === "") out[nk] = obj[k];
  }
  return out;
}

/* ---------------------------
 * Field mapping (support your headers)
 * - pick() will look in normalized payload first
 * --------------------------- */
function pick(obj, keys) {
  if (!obj) return "";
  for (const k of keys) {
    if (k == null) continue;
    const kk = cleanKey_(k);
    const v = obj[kk];
    if (v != null && text(v) !== "") return v;
  }
  // as last resort, check raw object with original keys (rare)
  const raw = obj.__raw || null;
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

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (mFile && mFile[1]) {
    const id = mFile[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  const mId = url.match(/(?:\?|&)id=([^&]+)/i);
  if (mId && mId[1]) {
    const id = mId[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  const mThumb = url.match(/thumbnail\?id=([^&]+)/i);
  if (mThumb && mThumb[1]) {
    const id = mThumb[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  if (url.includes("dropbox.com")) {
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }

  return url;
}

function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;

  const finalUrl = normalizeImageUrl(url);
  if (!finalUrl) {
    img.removeAttribute("src");
    return;
  }

  // premium fade-in feel (only visual, safe for both)
  img.style.opacity = "0";
  img.style.transition = "opacity 420ms ease";

  img.onerror = () => img.removeAttribute("src");

  const sep = finalUrl.includes("?") ? "&" : "?";
  img.src = finalUrl + sep + "t=" + Date.now();

  // fade in on load
  img.onload = () => {
    requestAnimationFrame(() => (img.style.opacity = "1"));
  };
}

/* ---------------------------
 * Photos array parsing
 * - accept array / comma / newline / Chinese comma
 * --------------------------- */
function splitLinks_(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => text(x)).filter(Boolean);
  const s = text(v);
  if (!s) return [];
  return s.split(/[\n,，;；]+/).map(x => text(x)).filter(Boolean);
}

function getPhotosArray_(payload) {
  // ✅ prefer compressed/cropped output
  // - photos_img : array or comma string
  // - 照片_fast  : comma string
  // - photos     : array from GAS
  // - 照片       : raw cell
  const v =
    pick(payload, ["photos_img"]) ||
    pick(payload, ["照片_fast", "照片_fast "]) ||
    payload.photos ||
    pick(payload, ["photos"]) ||
    pick(payload, ["照片"]);

  const arr = splitLinks_(v)
    .map(normalizeImageUrl)
    .filter(Boolean)
    .slice(0, CONFIG.GALLERY_MAX);

  return arr;
}

/* ---------------------------
 * Gallery DOM (created dynamically)
 * - free  : swipe
 * - premium: autoplay + fade
 * --------------------------- */
function ensureGalleryDom_() {
  if (__gallery.inited) return;

  const card = $("card-container");
  if (!card) return;

  // Create container
  const wrap = document.createElement("div");
  wrap.id = "photoGallery";
  wrap.setAttribute("aria-label", "產品照片預覽");
  // basic inline style so it works without extra CSS
  wrap.style.margin = "12px auto 0";
  wrap.style.width = "min(92vw, 520px)";
  wrap.style.borderRadius = "18px";
  wrap.style.overflow = "hidden";
  wrap.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)";
  wrap.style.position = "relative";
  wrap.style.background = "rgba(255,255,255,.35)";
  wrap.style.backdropFilter = "blur(6px)";

  // 16:9 box
  const box = document.createElement("div");
  box.style.width = "100%";
  box.style.aspectRatio = "16 / 9";
  box.style.position = "relative";
  box.style.background = "rgba(0,0,0,.03)";

  const img = document.createElement("img");
  img.id = "galleryImg";
  img.alt = "產品照";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.style.position = "absolute";
  img.style.inset = "0";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.opacity = "0";
  img.style.transition = "opacity 520ms ease";
  img.onerror = () => { img.style.opacity = "0"; };

  box.appendChild(img);

  // dots
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

  // Insert gallery into card (below info-scroll for better layout)
  // Try to place before version-tag if exists
  const vtag = card.querySelector(".version-tag");
  if (vtag && vtag.parentElement === card) {
    card.insertBefore(wrap, vtag);
  } else {
    card.appendChild(wrap);
  }

  // swipe events (free mode)
  let startX = 0;
  let startY = 0;
  let moved = false;

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
    // only for free mode manual
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
  const u = normalizeImageUrl(url);
  if (!u) {
    img.removeAttribute("src");
    img.style.opacity = "0";
    return;
  }
  img.style.opacity = "0";
  const sep = u.includes("?") ? "&" : "?";
  img.src = u + sep + "t=" + Date.now();
  img.onload = () => {
    requestAnimationFrame(() => (img.style.opacity = "1"));
  };
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
  renderGalleryDots_(__gallery.list.length);
}

function stopAutoplay_() {
  if (__gallery.timer) {
    clearInterval(__gallery.timer);
    __gallery.timer = null;
  }
}

function startAutoplay_() {
  stopAutoplay_();
  if (state.mode !== "premium") return;
  if (__gallery.list.length <= 1) return;
  __gallery.timer = setInterval(() => {
    galleryNext_();
  }, CONFIG.GALLERY_AUTOPLAY_MS);
}

function refreshGalleryMode_() {
  // called after mode switch
  if (!__gallery.inited) return;
  if (state.mode === "premium") startAutoplay_();
  else stopAutoplay_();
}

/* ---------------------------
 * Apply data to card
 * --------------------------- */
function applyDataToCard(payloadNorm) {
  const name = pick(payloadNorm, ["姓名（名片大標題）", "姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位名稱（如：幸福教養概念館）", "單位名稱", "單位", "unit", "Unit"]);
  const service = pick(payloadNorm, ["服務項目（核心業務，多項可條列換行）", "服務項目", "service", "Service"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  // ✅ avatar: prefer processed/compressed
  const avatar = pick(payloadNorm, [
    "avatar_img",
    "個人照_fast",
    "個人照",
    "形象照",
    "avatar",
    "photo",
    "image"
  ]);
  setAvatarImage(avatar);

  // ✅ photos: prefer processed/compressed
  const photos = getPhotosArray_(payloadNorm);
  __gallery.list = photos;
  __gallery.index = 0;

  // build gallery UI only if there are photos
  ensureGalleryDom_();
  if (__gallery.inited) {
    if (photos.length) {
      setGalleryImage_(photos[0]);
      renderGalleryDots_(photos.length);
      refreshGalleryMode_();
    } else {
      // no photos -> hide gallery
      const g = $("photoGallery");
      if (g) g.style.display = "none";
      stopAutoplay_();
    }
  }
}

/* ---------------------------
 * Order help modal (if exists)
 * --------------------------- */
window.openOrderHelp = function () {
  const modal = $("orderHelpModal");
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};

window.closeOrderHelp = function () {
  const modal = $("orderHelpModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
};

document.addEventListener("click", (e) => {
  const modal = $("orderHelpModal");
  if (!modal) return;
  if (e.target === modal) window.closeOrderHelp();
});

/* ---------------------------
 * Main load (✅ load by URL id)
 * --------------------------- */
async function loadData() {
  const id = getCardId();
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;

  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端服務項目...");

  try {
    const data = await fetchJsonRobust(url);

    // ✅ your GAS returns row object directly (no ok:true)
    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");

    // ✅ success rule: has at least one key
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    // in case keys are weird, normalized payload will have clean keys
    applyDataToCard(__payload);

  } catch (e) {
    console.error("雲端同步異常:", e);

    setText("u-name", "（同步失敗）");
    setText("u-unit", "請確認網址 ?id=TW000X 或檢查 GAS 權限");
    setText("u-service", "");
    setAvatarImage("");

    const g = $("photoGallery");
    if (g) g.style.display = "none";
    stopAutoplay_();
  }
}

/* ---------------------------
 * External actions
 * --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

window.addEventListener("load", () => {
  applyV382();
  loadData();
});