/* ================================
Happiness Smart Card System — app.js (v393.1 COMPLETE OVERWRITE)

Base on v393:
- Keep plan/style/paper linkage (已驗證 OK)
Add/Fix:
- Avatar image more robust (key priority + stronger candidates)
- Photo wall (multi photos) robust: primary keys + slots 1~20 + separators + per-image fallback
- Auto create photo wall DOM if missing (so no HTML change required)

================================ */

const CONFIG = {
  VERSION: 393.1,

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_LONGPRESS_MS: 1200,

  // Photo wall
  PHOTO_SLOT_MAX: 20,
  PHOTO_GRID_COLS: 3,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __lastLoad = { id: "", ts: 0, url: "" };
let __resolvedId = CONFIG.DEFAULT_ID;

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v393.1]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v393.1]", ...arguments); }
function err_() { console.error("[HSC-v393.1]", ...arguments); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

/* --------------------------- */
function getParam(name) {
  try { return new URLSearchParams(window.location.search).get(name); }
  catch { return null; }
}

function normalizeId_(s) {
  const v = text(s).toUpperCase();
  if (!v) return "";
  if (/^TW\d{4}$/i.test(v)) return v;
  if (/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if (/^TW\d{1,4}$/i.test(v)) {
    const n = v.replace(/^TW/i, "");
    return "TW" + n.padStart(4, "0");
  }
  return v;
}

function getCardIdFromUrl_() {
  const id = normalizeId_(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

/* ---------------------------
UI toggle: dots rows (free vs premium)
--------------------------- */
function toggleDotsRows_() {
  const rows = qa(".dots-row");
  if (!rows.length) return;

  let freeRow = null;
  let premiumRow = null;

  for (const row of rows) {
    if (!freeRow && row.querySelector(".dot")) freeRow = row;
    if (!premiumRow && row.querySelector(".p-dot")) premiumRow = row;
  }

  const isFree = state.mode === "free";

  if (freeRow) freeRow.style.display = isFree ? "flex" : "none";
  if (premiumRow) premiumRow.style.display = isFree ? "none" : "flex";
}

/* ---------------------------
Switching system (keep existing HTML hooks)
--------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
  applyV382_();
  refreshPremiumSafety_();
};

window.setV382Style = function (style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.setV382Paper = function (paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

function applyV382_() {
  const isFree = state.mode === "free";

  const controlPanel = $("free-controls");
  if (controlPanel) controlPanel.style.display = isFree ? "block" : "none";

  toggleDotsRows_();

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];
  document.body.className = classList.filter(Boolean).join(" ");
}

function syncPlanButtons_() {
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

function refreshPremiumSafety_() {
  if (state.mode !== "premium") return;
  const nameEl = $("u-name");
  if (!nameEl) return;
  requestAnimationFrame(() => {
    nameEl.style.transform = "translateZ(0)";
    setTimeout(() => { nameEl.style.transform = ""; }, 120);
  });
}

/* --------------------------- */
async function waitForDom_(ids, timeoutMs = 2400) {
  const need = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    let ok = true;
    for (const id of need) { if (!$(id)) { ok = false; break; } }
    if (ok) return true;
    await sleep(60);
  }
  return false;
}

/* ---------------------------
Fetch JSON (robust)
--------------------------- */
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
      const m = body.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
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
Normalize + pick
--------------------------- */
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
Images (strong)
- Drive / Dropbox / normal URL
- candidates include drive uc + thumbnail
--------------------------- */
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

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
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
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
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
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
      normalizeImageUrl(original)
    ].filter(Boolean);
  }

  return [normalizeImageUrl(original)].filter(Boolean);
}

function setImgWithFallback_(imgEl, candidates) {
  if (!imgEl) return;
  const list = (candidates || []).map(text).filter(Boolean);
  if (!list.length) { imgEl.removeAttribute("src"); return; }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;
  let idx = 0;

  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";

  const tryNext = () => {
    if (imgEl.dataset.loadToken !== token) return;
    if (idx >= list.length) { imgEl.style.opacity = "0"; imgEl.removeAttribute("src"); return; }
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
Photo wall DOM ensure (no HTML change)
Creates:
<div id="photoWall" class="photo-wall">
  <div class="wall-title">照片牆</div>
  <div id="photoGrid" class="photo-grid"></div>
</div>
--------------------------- */
function ensurePhotoWallDom_(){
  let wall = $("photoWall");
  let grid = $("photoGrid");

  if (wall && grid) return { wall, grid };

  // try mount inside info scroll
  const mount = q(".info-scroll") || $("card-container") || document.body;

  wall = document.createElement("div");
  wall.id = "photoWall";
  wall.className = "photo-wall";

  const title = document.createElement("div");
  title.className = "wall-title";
  title.textContent = "照片牆";

  grid = document.createElement("div");
  grid.id = "photoGrid";
  grid.className = "photo-grid";

  wall.appendChild(title);
  wall.appendChild(grid);
  mount.appendChild(wall);

  return { wall, grid };
}/* ---------------------------
Avatar (personal photo) — stronger key priority
Priority:
個人照_fast > 個人照 > 形象照_fast > 形象照 > avatar_fast > avatar > photo_fast > photo > image
Also try slot style: 個人照1..3 / 形象照1..3
--------------------------- */
function getAvatarUrl_(payloadNorm){
  const keys = [
    "個人照_fast","個人照",
    "形象照_fast","形象照",
    "avatar_fast","avatar",
    "photo_fast","photo",
    "image"
  ];

  let v = pick(payloadNorm, keys);
  if(text(v)) return v;

  for(let i=1;i<=3;i++){
    v = pick(payloadNorm, [`個人照${i}`, `形象照${i}`, `avatar${i}`, `photo${i}`, `image${i}`]);
    if(text(v)) return v;
  }

  return "";
}

function setAvatarImage_(payloadNorm){
  const img = $("u-img");
  if(!img) return;

  const raw = getAvatarUrl_(payloadNorm);
  const cands = buildImageCandidates_(raw);

  if(!cands.length){
    img.removeAttribute("src");
    return;
  }

  setImgWithFallback_(img, cands);
}

/* ---------------------------
Photo wall (multi photos) — extraction rules
Priority main fields:
照片_fast > 照片 > images > image > photo
Also support:
照片牆 / 相片牆 / 圖片 / 相簿
Slots:
照片1..20, photo1..20, image1..20, 圖片1..20
Separators:
newline / comma / whitespace
--------------------------- */
function splitPhotoList_(raw){
  const s = text(raw);
  if(!s) return [];

  // normalize separators to newline
  const normalized = s
    .replace(/\r\n/g, "\n")
    .replace(/[,，]+/g, "\n")
    .replace(/[ \t]+/g, "\n");

  return normalized
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
}

function collectPhotoUrls_(payloadNorm){
  const urls = [];

  // main fields
  const main = pick(payloadNorm, ["照片_fast","照片","images","image","photo","照片牆","相片牆","圖片","相簿"]);
  urls.push(...splitPhotoList_(main));

  // slots
  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitPhotoList_(payloadNorm[`照片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`圖片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`photo${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`image${i}`]));
  }

  // normalize urls + candidates: pick first normalized, but keep raw for candidate generation in render
  const cleaned = [];
  const seen = new Set();

  for(const raw of urls){
    const r = text(raw);
    if(!r) continue;

    // keep original but de-dup by normalized url
    const norm = normalizeImageUrl(r);
    const key = norm || r;
    if(seen.has(key)) continue;
    seen.add(key);
    cleaned.push(r);
  }

  return cleaned;
}

function renderPhotoWall_(payloadNorm){
  const { wall, grid } = ensurePhotoWallDom_();
  if(!wall || !grid) return;

  grid.innerHTML = "";

  const list = collectPhotoUrls_(payloadNorm);

  if(!list.length){
    wall.style.display = "none";
    return;
  }

  wall.style.display = "";

  // Ensure grid columns even if css not set
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${CONFIG.PHOTO_GRID_COLS}, 1fr)`;
  grid.style.gap = "6px";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    img.style.width = "100%";
    img.style.aspectRatio = "1/1";
    img.style.objectFit = "cover";
    img.style.borderRadius = "12px";
    img.style.cursor = "pointer";
    img.style.opacity = "0";
    img.style.transition = "opacity 420ms ease";

    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands);

    // click open (use normalized url)
    const openUrl = normalizeImageUrl(raw);
    img.onclick = ()=> window.open(openUrl || raw, "_blank");

    grid.appendChild(img);
  }
}/* ---------------------------
Render
- Keep v393 text fields behavior
- Add: avatar + photo wall
--------------------------- */
function applyDataToCard(payloadNorm) {
  const name = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  // ✅ avatar + photo wall (new)
  setAvatarImage_(payloadNorm);
  renderPhotoWall_(payloadNorm);

  syncPlanButtons_();
  refreshPremiumSafety_();
}

/* ---------------------------
UI states
--------------------------- */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端內容...");

  // while loading: hide photo wall
  try{
    const wall = $("photoWall");
    if(wall) wall.style.display = "none";
  }catch{}
}

function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認 id 或 GAS 權限");
  setText("u-service", "");

  const img = $("u-img");
  if (img) img.removeAttribute("src");

  try{
    const wall = $("photoWall");
    if(wall) wall.style.display = "none";
    const grid = $("photoGrid");
    if(grid) grid.innerHTML = "";
  }catch{}
}

/* ---------------------------
Load card
--------------------------- */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __lastLoad = { id: cid, ts: Date.now(), url };
  __resolvedId = cid;

  // v393 needed ids: u-name/u-unit/u-service. We keep it.
  await waitForDom_(["u-name", "u-unit", "u-service"], 2400);
  setLoadingUi_();

  // ensure photo wall dom exists early (no HTML changes required)
  try{ ensurePhotoWallDom_(); }catch{}

  try {
    const data = await fetchJsonRobust(url);
    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    // render twice (same as v393) to stabilize layout / images
    applyDataToCard(__payload);
    await sleep(120);
    applyDataToCard(__payload);

    // keep url id in place
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    } catch {}

    return cid;
  } catch (e) {
    err_("loadCard error:", e);
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
    throw e;
  }
}

/* ===========================
Hidden Admin Entry (no visible backend)
=========================== */
function openAdmin_() {
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  const u = `admin.html?id=${encodeURIComponent(id)}`;
  window.open(u, "_blank");
}

function bindLongPress_(target, ms, onFire) {
  if (!target) return;

  let timer = null;
  let fired = false;

  const start = () => {
    fired = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fired = true;
      try { onFire(); } catch {}
    }, ms);
  };

  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  target.addEventListener("touchstart", start, { passive: true });
  target.addEventListener("touchend", cancel, { passive: true });
  target.addEventListener("touchcancel", cancel, { passive: true });

  target.addEventListener("mousedown", start);
  target.addEventListener("mouseup", cancel);
  target.addEventListener("mouseleave", cancel);

  target.addEventListener("click", (e) => {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

function ensureAdminHotspot_() {
  if ($("adminHotspot")) return;

  const hs = document.createElement("div");
  hs.id = "adminHotspot";
  hs.setAttribute("aria-label", "admin-hotspot");
  hs.style.position = "fixed";
  hs.style.top = "6px";
  hs.style.right = "6px";
  hs.style.width = "28px";
  hs.style.height = "28px";
  hs.style.opacity = "0";
  hs.style.zIndex = "99999";
  hs.style.background = "transparent";
  hs.style.borderRadius = "10px";
  hs.style.pointerEvents = "auto";
  document.body.appendChild(hs);
}

function bindAdminHiddenEntry_() {
  const versionTag = q(".version-tag") || $("versionTag") || null;
  const footer = q("footer") || null;

  if (versionTag) bindLongPress_(versionTag, CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);
  else if (footer) bindLongPress_(footer, CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);

  ensureAdminHotspot_();
  bindLongPress_($("adminHotspot"), CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  try { applyV382_(); } catch {}
  try { syncPlanButtons_(); } catch {}
  try { toggleDotsRows_(); } catch {}

  // ONLY hidden admin entry
  try { bindAdminHiddenEntry_(); } catch {}

  // ensure photo wall dom exists even before load (safe)
  try{ ensurePhotoWallDom_(); }catch{}

  const id = getCardIdFromUrl_();
  loadCardById_(id).catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => { if (!__lastLoad.ts) boot_(); });