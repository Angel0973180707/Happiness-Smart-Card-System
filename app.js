/* ================================
 * Angel Card App.js (FULL OVERWRITE)
 * - Load by URL ?id=TW000X
 * - use GAS: ?action=card&id=...
 * - robust fetch + safe JSON
 * - FIX: weird headers with quotes/newlines/zero-width chars (normalize keys)
 * - FIX: mobile fetch success but UI not updated (wait DOM + re-apply once)
 * - FIX: Drive/Dropbox image fallback + onerror chain
 * - FIX: Gallery mode switch stability (timer/state)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 10000,
  RETRY: 2,

  // gallery behavior
  GALLERY_AUTOPLAY_MS: 3200,
  GALLERY_MAX: 5,

  // DOM wait (mobile safety)
  DOM_WAIT_MS: 2400,
  DOM_POLL_MS: 80,

  // debug
  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

// runtime
let __payloadRaw = null;
let __payload = null;

let __gallery = {
  list: [],
  index: 0,
  timer: null,
  inited: false,
  lastMode: null
};

let __lastLoad = { id: "", ts: 0, url: "" };

/* ---------------------------
 * Small helpers
 * --------------------------- */
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

function nowIso_() {
  try { return new Date().toISOString(); } catch { return String(Date.now()); }
}

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
 * DOM readiness guard (mobile: prevent "fetch OK but UI not updated")
 * --------------------------- */
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
  // minimum UI targets we must be able to write
  return !!$("u-name") && !!$("u-unit") && !!$("u-service");
}

/* ---------------------------
 * Robust fetch (no-store + timeout + retry + safe JSON)
 * - Add diagnostics: status, content-type, short body head
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

    const status = res.status;
    const ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : "";
    const txt = await res.text();
    const body = (txt || "").trim();

    if (CONFIG.DEBUG) {
      const head = body.slice(0, 180).replace(/\s+/g, " ");
      log_("fetch:", { status, ct, len: body.length, head });
    }

    if (!res.ok) {
      // still try JSON parse if GAS returns error JSON with 4xx
      if (!body) throw new Error(`HTTP ${status} (empty)`);
    }

    if (!body) throw new Error("Empty response");

    try {
      return JSON.parse(body);
    } catch {
      // try to salvage JSON embedded in HTML
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
      await sleep(450 + i * 450);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
 * Key normalize (fix: weird headers with quotes/newlines/zero-width)
 * --------------------------- */
function cleanKey_(k) {
  return String(k ?? "")
    // BOM / zero-width / direction marks
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "")
    // full-width space
    .replace(/\u3000/g, " ")
    // normalize line breaks then remove all line breaks within header
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "")
    // trim quotes and spaces
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "")
    .trim();
}

function buildNormalizedPayload_(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };

  // also build a lower-cased alias map for fallback (safe, not changing keys)
  const lowerMap = Object.create(null);

  for (const k of Object.keys(obj)) {
    const nk = cleanKey_(k);
    if (!nk) continue;

    // keep first non-empty value priority
    const v = obj[k];
    if (out[nk] == null || text(out[nk]) === "") out[nk] = v;

    const lk = nk.toLowerCase();
    if (lowerMap[lk] == null || text(lowerMap[lk]) === "") lowerMap[lk] = v;
  }

  out.__lower = lowerMap;
  return out;
}

/* ---------------------------
 * Field mapping (support your headers)
 * --------------------------- */
function pick(obj, keys) {
  if (!obj) return "";
  const raw = obj.__raw || null;
  const lower = obj.__lower || null;

  for (const k of keys) {
    if (k == null) continue;
    const kk = cleanKey_(k);

    // exact normalized key
    const v1 = obj[kk];
    if (v1 != null && text(v1) !== "") return v1;

    // case-insensitive fallback
    if (lower) {
      const v2 = lower[String(kk).toLowerCase()];
      if (v2 != null && text(v2) !== "") return v2;
    }
  }

  // last resort: raw object original keys (as provided)
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

  // Dropbox
  if (url.includes("dropbox.com")) {
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }

  // Drive file/d/<id>
  const mFile = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (mFile && mFile[1]) {
    const id = mFile[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // Drive ?id=<id>
  const mId = url.match(/(?:\?|&)id=([^&]+)/i);
  if (mId && mId[1]) {
    const id = mId[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // Drive thumbnail?id=<id>
  const mThumb = url.match(/thumbnail\?id=([^&]+)/i);
  if (mThumb && mThumb[1]) {
    const id = mThumb[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

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

  if (original.includes("dropbox.com")) {
    return [normalizeImageUrl(original)];
  }

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
 * Photos array parsing
 * --------------------------- */
function splitLinks_(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => text(x)).filter(Boolean);
  const s = text(v);
  if (!s) return [];
  return s.split(/[\n,，;；]+/).map(x => text(x)).filter(Boolean);
}

function getPhotosArray_(payload) {
  const v =
    pick(payload, ["photos_img"]) ||
    pick(payload, ["照片_fast", "照片_fast "]) ||
    payload.photos ||
    pick(payload, ["photos"]) ||
    pick(payload, ["照片"]);

  const rawArr = splitLinks_(v).filter(Boolean);
  const arr = rawArr
    .map(u => normalizeImageUrl(u))
    .filter(Boolean)
    .slice(0, CONFIG.GALLERY_MAX);

  return arr;
}

/* ---------------------------
 * Gallery DOM
 * --------------------------- */
function ensureGalleryDom_() {
  if (__gallery.inited) return;

  const card = $("card-container");
  if (!card) return;

  const wrap = document.createElement("div");
  wrap.id = "photoGallery";
  wrap.setAttribute("aria-label", "產品照片預覽");
  wrap.style.margin = "12px auto 0";
  wrap.style.width = "min(92vw, 520px)";
  wrap.style.borderRadius = "18px";
  wrap.style.overflow = "hidden";
  wrap.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)";
  wrap.style.position = "relative";
  wrap.style.background = "rgba(255,255,255,.35)";
  wrap.style.backdropFilter = "blur(6px)";

  const box = document.createElement("div");
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
  img.style.objectFit = "cover";
  img.style.opacity = "0";
  img.style.transition = "opacity 520ms ease";
  img.onerror = () => { img.style.opacity = "0"; };

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

  // Insert gallery before version-tag if exists
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

  img.style.opacity = "0";
  img.style.transition = "opacity 520ms ease";
  setImgWithFallback_(img, candidates);
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
  if (!__gallery.inited) return;

  if (__gallery.lastMode !== state.mode) {
    stopAutoplay_();
    __gallery.lastMode = state.mode;
  }

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

  const ok1 = setText("u-name", name || "（尚未讀到姓名）");
  const ok2 = setText("u-unit", unit || "");
  const ok3 = setText("u-service", service || "");

  if (CONFIG.DEBUG && (!ok1 || !ok2 || !ok3)) {
    warn_("applyDataToCard: some UI nodes missing, will rely on re-apply pass");
  }

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

  const photos = getPhotosArray_(payloadNorm);
  __gallery.list = photos;
  __gallery.index = 0;

  ensureGalleryDom_();
  if (__gallery.inited) {
    const g = $("photoGallery");
    if (photos.length) {
      if (g) g.style.display = "block";
      setGalleryImage_(photos[0]);
      renderGalleryDots_(photos.length);
      refreshGalleryMode_();
    } else {
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
 * Main load
 * --------------------------- */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端服務項目...");
}

function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認網址 ?id=TW000X 或檢查 GAS 權限");
  setText("u-service", "");
  setAvatarImage("");

  const g = $("photoGallery");
  if (g) g.style.display = "none";
  stopAutoplay_();
}

async function loadData() {
  const id = getCardId();
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  __lastLoad = { id, ts: Date.now(), url };

  await waitForDom_(["u-name", "u-unit", "u-service"], CONFIG.DOM_WAIT_MS);
  setLoadingUi_();

  log_("loadData start:", { id, time: nowIso_() });

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    applyDataToCard(__payload);

    // mobile safety re-apply once
    await sleep(120);
    if (!coreUiReady_()) {
      await waitForDom_(["u-name", "u-unit", "u-service"], CONFIG.DOM_WAIT_MS);
      applyDataToCard(__payload);
    } else {
      const n = text($("u-name") ? $("u-name").textContent : "");
      if (n === "載入中..." || n === "（同步失敗）") {
        await sleep(180);
        applyDataToCard(__payload);
      }
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
 * External actions
 * --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

/* ---------------------------
 * Boot
 * --------------------------- */
function boot_() {
  try { applyV382(); } catch {}
  try { loadData(); } catch (e) { err_("boot loadData error:", e); }
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => {
  if (!__lastLoad.ts) boot_();
});
