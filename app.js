/* ================================
 * Angel Card App.js (FULL OVERWRITE)
 * - FIX: remove custom headers to avoid CORS preflight
 * - FIX: robust key normalization + mobile re-apply
 * - FIX: image fallback chain
 * - NEW: Step1 choose plan (free/premium) -> UI split
 * - NEW: Photo thumbnails grid (contain) + click to open original (lightbox)
 * - NEW: Contact section injected into card (LINE/WEB/PHONE/EMAIL/SOCIAL)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 10000,
  RETRY: 2,

  // gallery
  GALLERY_MAX: 12,           // ✅ 照片牆最多抓幾張（你可調）
  THUMB_MIN_COL: 3,          // ✅ 手機最少 3 欄
  THUMB_MAX_COL: 4,          // ✅ 寬一點可到 4 欄

  DOM_WAIT_MS: 2600,
  DOM_POLL_MS: 80,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;

let __gallery = {
  list: [],
  inited: false
};

let __lastLoad = { id: "", ts: 0, url: "" };

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
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
 * Existing switching system
 * --------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
  applyPlanSplitUi_();     // ✅ NEW: 分流 UI
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
 * Fetch (NO custom headers => avoid CORS preflight)
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
 * Photos parsing + auto detect
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

/* ===========================
 * NEW: Plan selector UI
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
  wrap.style.padding = "10px 12px 4px";
  wrap.style.flexWrap = "wrap";

  const btnFree = document.createElement("button");
  btnFree.id = "btnPlanFree";
  btnFree.type = "button";
  btnFree.textContent = "先選方案：自由搭配款";
  btnFree.className = "btn-neo";
  btnFree.style.borderRadius = "999px";
  btnFree.style.fontWeight = "900";

  const btnPremium = document.createElement("button");
  btnPremium.id = "btnPlanPremium";
  btnPremium.type = "button";
  btnPremium.textContent = "精品設計款";
  btnPremium.className = "btn-neo";
  btnPremium.style.borderRadius = "999px";
  btnPremium.style.fontWeight = "900";

  btnFree.addEventListener("click", () => {
    // 保留當前自由色或回預設
    state.mode = "free";
    if (!state.theme || !String(state.theme).startsWith("color-")) state.theme = "color-1";
    applyV382();
    applyPlanSplitUi_();
    updatePlanButtonsActive_();
    // ✅ 自動讓使用者看到下一步
    try { $("free-controls")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch {}
  });

  btnPremium.addEventListener("click", () => {
    state.mode = "premium";
    if (!state.theme || !String(state.theme).startsWith("p")) state.theme = "p1";
    applyV382();
    applyPlanSplitUi_();
    updatePlanButtonsActive_();
  });

  wrap.appendChild(btnFree);
  wrap.appendChild(btnPremium);

  // 插在 panel 最上方
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

  // 依你 index.html：第1個 dots-row = 自由色；第2個 dots-row = 精品色
  const rows = qa(".dots-row", panel);
  const freeDotsRow = rows[0] || null;
  const premiumDotsRow = rows[1] || null;

  const freeControls = $("free-controls");

  const isFree = state.mode === "free";

  if (freeDotsRow) freeDotsRow.style.display = isFree ? "flex" : "none";
  if (premiumDotsRow) premiumDotsRow.style.display = isFree ? "none" : "flex";
  if (freeControls) freeControls.style.display = isFree ? "block" : "none";

  // CTA 區不用動，保持一直可見（你要）
}

/* ===========================
 * NEW: Lightbox (view original)
 * =========================== */
function ensureLightbox_() {
  if ($("imgLightbox")) return;

  const overlay = document.createElement("div");
  overlay.id = "imgLightbox";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.72)";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "18px";
  overlay.style.zIndex = "10000";

  const img = document.createElement("img");
  img.id = "imgLightboxImg";
  img.alt = "原圖";
  img.style.maxWidth = "95vw";
  img.style.maxHeight = "92vh";
  img.style.objectFit = "contain";
  img.style.borderRadius = "14px";
  img.style.boxShadow = "0 18px 60px rgba(0,0,0,0.35)";
  img.style.background = "rgba(255,255,255,0.06)";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "關閉");
  close.style.position = "fixed";
  close.style.top = "14px";
  close.style.right = "14px";
  close.style.width = "44px";
  close.style.height = "44px";
  close.style.borderRadius = "12px";
  close.style.border = "none";
  close.style.background = "rgba(255,255,255,0.15)";
  close.style.color = "#fff";
  close.style.fontSize = "28px";
  close.style.cursor = "pointer";

  overlay.appendChild(img);
  overlay.appendChild(close);
  document.body.appendChild(overlay);

  const hide = () => {
    overlay.style.display = "none";
    img.removeAttribute("src");
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hide();
  });
  close.addEventListener("click", hide);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") hide();
  });
}

function openLightbox_(url) {
  ensureLightbox_();
  const overlay = $("imgLightbox");
  const img = $("imgLightboxImg");
  if (!overlay || !img) return;

  overlay.style.display = "flex";
  // 原圖：用候選串避免部分平台縮圖
  const cands = buildImageCandidates_(url);
  setImgWithFallback_(img, cands.length ? cands : [url]);
}

/* ===========================
 * NEW: Photo thumbnails grid (contain)
 * =========================== */
function ensurePhotoWallDom_() {
  if (__gallery.inited) return;

  const card = $("card-container");
  if (!card) return;

  // 插在 version-tag 前（你原本插 gallery 的位置）
  const vtag = card.querySelector(".version-tag");

  const wrap = document.createElement("section");
  wrap.id = "photoWall";
  wrap.setAttribute("aria-label", "多張照片預覽");
  wrap.style.margin = "12px auto 0";
  wrap.style.width = "min(92vw, 520px)";
  wrap.style.borderRadius = "18px";
  wrap.style.overflow = "hidden";
  wrap.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)";
  wrap.style.background = "rgba(255,255,255,.35)";
  wrap.style.backdropFilter = "blur(6px)";
  wrap.style.display = "none";

  const title = document.createElement("div");
  title.textContent = "照片作品（點一下看原圖）";
  title.style.fontWeight = "900";
  title.style.fontSize = "14px";
  title.style.padding = "12px 12px 8px";
  title.style.opacity = "0.85";

  const grid = document.createElement("div");
  grid.id = "photoWallGrid";
  grid.style.display = "grid";
  grid.style.gap = "8px";
  grid.style.padding = "10px 12px 14px";
  grid.style.gridTemplateColumns = `repeat(${CONFIG.THUMB_MIN_COL}, 1fr)`;

  wrap.appendChild(title);
  wrap.appendChild(grid);

  if (vtag && vtag.parentElement) {
    vtag.parentElement.insertBefore(wrap, vtag);
  } else {
    card.appendChild(wrap);
  }

  // 依寬度調欄數
  const setCols = () => {
    const w = Math.min(window.innerWidth, 520);
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
    const item = document.createElement("button");
    item.type = "button";
    item.style.border = "none";
    item.style.padding = "0";
    item.style.background = "rgba(255,255,255,0.22)";
    item.style.borderRadius = "12px";
    item.style.overflow = "hidden";
    item.style.cursor = "pointer";
    item.style.position = "relative";
    item.style.aspectRatio = "1 / 1"; // ✅ 縮圖框：正方形，圖用 contain 看到全貌
    item.setAttribute("aria-label", "點擊查看原圖");

    const img = document.createElement("img");
    img.alt = "縮圖";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";     // ✅ 不裁切：看到全貌
    img.style.background = "rgba(0,0,0,0.03)";
    img.style.opacity = "0";
    img.style.transition = "opacity 320ms ease";

    setImgWithFallback_(img, buildImageCandidates_(u));

    item.addEventListener("click", () => openLightbox_(u));

    item.appendChild(img);
    grid.appendChild(item);
  }
}

/* ===========================
 * NEW: Contact section
 * =========================== */
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
  // 允許只填 domain
  return "https://" + s;
}
function makeBtn_(label, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn-cta mini";
  b.textContent = label;
  b.style.marginTop = "8px";
  b.addEventListener("click", onClick);
  return b;
}
function makeMiniLink_(label, url) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "inline-block";
  a.style.padding = "8px 10px";
  a.style.borderRadius = "999px";
  a.style.background = "rgba(0,0,0,0.04)";
  a.style.fontWeight = "800";
  a.style.fontSize = "13px";
  a.style.textDecoration = "none";
  a.style.color = "inherit";
  return a;
}

function ensureContactDom_() {
  const scroll = q(".info-scroll");
  if (!scroll) return null;
  if ($("contactBox")) return $("contactBox");

  const box = document.createElement("div");
  box.id = "contactBox";
  box.className = "content-box";

  const h = document.createElement("div");
  h.textContent = "聯繫方式";
  h.style.fontWeight = "900";
  h.style.marginBottom = "8px";

  const main = document.createElement("div");
  main.id = "contactMain";
  main.style.display = "flex";
  main.style.gap = "10px";
  main.style.flexWrap = "wrap";

  const sub = document.createElement("div");
  sub.id = "contactSub";
  sub.style.marginTop = "10px";
  sub.style.display = "flex";
  sub.style.gap = "8px";
  sub.style.flexWrap = "wrap";

  box.appendChild(h);
  box.appendChild(main);
  box.appendChild(sub);

  // 插在「服務項目」盒子後面（比較合理）
  const serviceBox = scroll.querySelector("#u-service")?.closest(".content-box");
  if (serviceBox && serviceBox.nextSibling) {
    scroll.insertBefore(box, serviceBox.nextSibling);
  } else {
    scroll.appendChild(box);
  }

  return box;
}

function renderContacts_(payloadNorm) {
  const box = ensureContactDom_();
  if (!box) return;

  const main = $("contactMain");
  const sub = $("contactSub");
  if (!main || !sub) return;

  main.innerHTML = "";
  sub.innerHTML = "";

  // 常見欄位：你表單/試算表不一定叫這些，所以用 pick 多抓幾種
  const line = pick(payloadNorm, ["LINE 官方帳號", "line_oa", "line", "LINE", "Line"]);
  const wechat = pick(payloadNorm, ["微信", "wechat", "WeChat"]);
  const web = pick(payloadNorm, ["官網", "網站", "website", "web", "url", "網址"]);
  const phone = pick(payloadNorm, ["電話", "手機", "phone", "tel", "mobile"]);
  const email = pick(payloadNorm, ["Email", "email", "信箱", "e-mail"]);
  const youtube = pick(payloadNorm, ["YouTube", "youtube"]);
  const ig = pick(payloadNorm, ["IG", "Instagram", "instagram", "insta"]);
  const fb = pick(payloadNorm, ["FB", "Facebook", "facebook"]);

  // 主行為（大按鈕）：LINE / 官網 / 預約
  if (line) {
    const u = normalizeUrl_(line);
    main.appendChild(makeBtn_("加 LINE 官方帳號", () => window.open(u, "_blank")));
  }
  if (wechat) {
    // 微信如果不是網址，先用複製比較穩
    const w = text(wechat);
    const b = makeBtn_("微信聯繫", async () => {
      try {
        await navigator.clipboard.writeText(w);
        alert("已複製微信資訊：" + w);
      } catch {
        prompt("請複製微信資訊：", w);
      }
    });
    main.appendChild(b);
  }
  if (web) {
    const u = normalizeUrl_(web);
    main.appendChild(makeBtn_("前往官網 / 預約", () => window.open(u, "_blank")));
  }

  // 固定保留：填表
  main.appendChild(makeBtn_("填寫預約表單", () => window.open(CONFIG.FORM, "_blank")));

  // 次要資訊：電話/Email/社群（小膠囊）
  if (phone) {
    const t = normalizeTel_(phone);
    if (t) sub.appendChild(makeMiniLink_("電話：" + t, "tel:" + t));
  }
  if (email) {
    const e = normalizeEmail_(email);
    if (e) sub.appendChild(makeMiniLink_("Email：" + e, "mailto:" + e));
  }
  if (youtube) {
    sub.appendChild(makeMiniLink_("YouTube", normalizeUrl_(youtube)));
  }
  if (ig) {
    sub.appendChild(makeMiniLink_("IG", normalizeUrl_(ig)));
  }
  if (fb) {
    sub.appendChild(makeMiniLink_("FB", normalizeUrl_(fb)));
  }

  // 如果真的什麼都沒有，避免空白
  if (!main.children.length && !sub.children.length) {
    const note = document.createElement("div");
    note.style.opacity = "0.75";
    note.style.fontSize = "13px";
    note.textContent = "（尚未提供聯繫方式）";
    main.appendChild(note);
  }
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

  const avatar = pick(payloadNorm, ["avatar_img", "個人照_fast", "個人照", "形象照", "avatar", "photo", "image"]);
  setAvatarImage(avatar);

  // ✅ 多照片：縮圖牆 + 點看原圖
  const photos = getPhotosArray_(payloadNorm);
  __gallery.list = photos;
  renderPhotoWall_(photos);

  // ✅ 聯繫區：注入
  renderContacts_(payloadNorm);
}

/* --------------------------- */
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

/* --------------------------- */
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

  // 清掉照片牆/聯繫
  $("photoWall") && ($("photoWall").style.display = "none");
  $("photoWallGrid") && ($("photoWallGrid").innerHTML = "");
  $("contactMain") && ($("contactMain").innerHTML = "");
  $("contactSub") && ($("contactSub").innerHTML = "");
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

    // mobile 再套一次，避免某些機型 DOM 還在排版
    await sleep(140);
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

/* --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

function boot_() {
  try { applyV382(); } catch {}
  try {
    ensurePlanSelectorUi_();  // ✅ 先選方案按鈕
    applyPlanSplitUi_();      // ✅ 分流
  } catch {}
  try { loadData(); } catch (e) { err_("boot loadData error:", e); }
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => {
  if (!__lastLoad.ts) boot_();
});