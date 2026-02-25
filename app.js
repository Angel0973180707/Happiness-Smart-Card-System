/* ================================
 * Happiness Smart Card System — app.js (v399.4 COMPLETE OVERWRITE)
 * FIX:
 * 1) DO NOT overwrite body.className (preserve other classes) -> style linkage stable
 * 2) Build URLs with base directory (GitHub Pages subpath safe)
 * 3) Stronger button "active" sync for style/paper/theme
 * 4) Keep dynamic auto-hide blocks
 * ================================ */

const CONFIG = {
  VERSION: "399.4",

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_LONGPRESS_MS: 1200,
  ADMIN_TRIPLE_TAP_MS: 650,

  PHOTO_SLOT_MAX: 20,
  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __resolvedId = CONFIG.DEFAULT_ID;
let __lastLoad = { id: "", ts: 0, url: "" };

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }

function log_() { if (CONFIG.DEBUG) console.log("[HSC-v399.4]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v399.4]", ...arguments); }
function err_() { console.error("[HSC-v399.4]", ...arguments); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

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

function ensureHttp_(u) {
  let v = text(u);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("www.")) return "https://" + v;
  return v;
}

/* ---------------------------
Base directory helper (GitHub subpath safe)
- Always resolve from current directory (not hard-coded repo)
--------------------------- */
function getBaseDir_() {
  try {
    const u = new URL(window.location.href);
    u.hash = "";
    // keep search because we might be on index.html?id=...
    // but for base dir we remove filename only
    const p = u.pathname;
    const dir = p.endsWith("/") ? p : p.substring(0, p.lastIndexOf("/") + 1);
    return u.origin + dir;
  } catch {
    return window.location.origin + "/";
  }
}

/* ---------------------------
UI linkage (MUST exist because HTML uses onclick=window.setV382...)
- FIX: do NOT overwrite body.className
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

function clearActive_(selector) {
  qa(selector).forEach(el => el.classList.remove("active"));
}

function setActive_(el) {
  if (el) el.classList.add("active");
}

/* remove only our own classes; keep the rest */
function applyModeClasses_() {
  const body = document.body;
  if (!body) return;

  const keep = [];
  for (const c of Array.from(body.classList)) {
    // remove our controlled namespace classes
    if (/^(mode-|color-|style-|paper-)/.test(c)) continue;
    keep.push(c);
  }

  const isFree = state.mode === "free";

  keep.push(`mode-${state.mode}`);
  if (state.theme) keep.push(state.theme);
  if (isFree && state.style) keep.push(`style-${state.style}`);
  if (isFree && state.paper) keep.push(state.paper);

  body.className = keep.join(" ").trim();
}

function applyV382_() {
  const isFree = state.mode === "free";

  const freeControls = $("free-controls");
  if (freeControls) freeControls.style.display = isFree ? "block" : "none";

  toggleDotsRows_();
  applyModeClasses_();
}

/* --- HTML onclick hooks --- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  clearActive_(".dot");
  clearActive_(".p-dot");
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) setActive_(el);

  syncPlanButtons_();
  applyV382_();
};

window.setV382Style = function (style, el) {
  state.style = style;

  // FIX: don't rely on parentElement; clear the group globally
  clearActive_(".btn-style");
  clearActive_("[data-style]");
  clearActive_(".style-buttons .btn-neo");
  if (el) setActive_(el);

  applyV382_();
};

window.setV382Paper = function (paper, el) {
  state.paper = paper;

  // FIX: don't rely on parentElement; clear the group globally
  clearActive_(".btn-paper");
  clearActive_("[data-paper]");
  clearActive_(".paper-buttons .btn-neo");
  if (el) setActive_(el);

  applyV382_();
};/* =========================
 * app.js Part 2/3
 * Images + Dock + Blocks + Auto-hide (dynamic balance)
 * ========================= */

function escapeHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------------------------
Normalize keys + pick
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
Images
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
Avatar / Logo (fast priority)
--------------------------- */
function setAvatarImage_(p){
  const img = $("u-img");
  if(!img) return;

  const raw = pick(p, ["個人照_fast","個人照"]);
  const cands = buildImageCandidates_(raw);

  if(!cands.length){
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, cands);
}

function setLogo_(p){
  const wrap = $("logoWrap");
  const img = $("u-logo");
  if(!wrap || !img) return;

  const raw = pick(p, ["Logo_fast","Logo"]);
  const cands = buildImageCandidates_(raw);

  if(!cands.length){
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }
  wrap.style.display = "";
  setImgWithFallback_(img, cands);
}

/* ---------------------------
Photo wall (auto-hide)
--------------------------- */
function splitPhotoList_(raw){
  const s = text(raw);
  if(!s) return [];
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[,，]+/g, "\n")
    .replace(/[ \t]+/g, "\n")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
}

function collectPhotoUrls_(p){
  const urls = [];
  const main = pick(p, ["照片_fast","照片"]);
  urls.push(...splitPhotoList_(main));

  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitPhotoList_(p[`照片${i}`]));
  }

  const cleaned = [];
  const seen = new Set();
  for(const raw of urls){
    const r = text(raw);
    if(!r) continue;
    const key = normalizeImageUrl(r) || r;
    if(seen.has(key)) continue;
    seen.add(key);
    cleaned.push(r);
  }
  return cleaned;
}

function renderPhotoWall_(p){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const list = collectPhotoUrls_(p);

  if(!list.length){
    wall.style.display = "none";
    return;
  }
  wall.style.display = "";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    setImgWithFallback_(img, buildImageCandidates_(raw));
    img.onclick = ()=> window.open(normalizeImageUrl(raw) || raw, "_blank");
    grid.appendChild(img);
  }
}

/* ---------------------------
Dock: LINE / 影音 / 社群 (auto-hide)
--------------------------- */
function addDockBtn_(wrap, label, href){
  if(!wrap || !href) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dock-btn";
  btn.innerHTML = `<span>${escapeHtml_(label)}</span>`;
  btn.onclick = ()=> window.open(href, "_blank");
  wrap.appendChild(btn);
}

function asUrlOrSearch_(v){
  const s = text(v);
  if(!s) return "";
  if(/^https?:\/\//i.test(s)) return s;
  if(s.startsWith("www.")) return "https://" + s;
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

function renderContactDock_(p){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML = "";

  // LINE
  const lineFriend = asUrlOrSearch_(pick(p, ["LINE連結"]));
  const lineOA = asUrlOrSearch_(pick(p, ["LINE官方帳號"]));
  if(lineFriend) addDockBtn_(wrap, "LINE（好友）", lineFriend);
  if(lineOA) addDockBtn_(wrap, "LINE（官帳）", lineOA);

  // 影音1~3
  for(let i=1;i<=3;i++){
    const href = asUrlOrSearch_(pick(p, [`影音平台${i}`]));
    if(href) addDockBtn_(wrap, `影音平台${i}`, href);
  }

  // 社群1~3
  for(let i=1;i<=3;i++){
    const href = asUrlOrSearch_(pick(p, [`社群平台${i}`]));
    if(href) addDockBtn_(wrap, `社群平台${i}`, href);
  }

  // Email/電話/地址/微信
  const email = text(pick(p, ["Email"]));
  const phone = text(pick(p, ["電話"]));
  const addr  = text(pick(p, ["地址"]));
  const wx    = text(pick(p, ["微信"]));

  if(email) addDockBtn_(wrap, "Email", `mailto:${email}`);

  if(phone){
    const pnum = phone.replace(/[^\d+]/g, "");
    if(pnum) addDockBtn_(wrap, "撥打", `tel:${pnum}`);
  }

  if(addr) addDockBtn_(wrap, "導航", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);

  if(wx) addDockBtn_(wrap, "微信", `https://www.google.com/search?q=${encodeURIComponent("WeChat " + wx)}`);

  dock.style.display = wrap.children.length ? "" : "none";
}

/* ---------------------------
Blocks: slogan/service/exp auto-hide
--------------------------- */
function renderBlock_(rootId, title, body){
  const root = $(rootId);
  if(!root) return;

  const b = text(body);
  if(!b){
    root.innerHTML = "";
    root.style.display = "none";
    return;
  }
  root.style.display = "";
  root.innerHTML = `
    <div class="block-title">${escapeHtml_(title)}</div>
    <div class="block-body preline">${escapeHtml_(b)}</div>
  `;
}/* =========================
 * app.js Part 3/3
 * Load + Share/Delivery + Hidden Admin + Boot
 * ========================= */

function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-title", "");

  const sl = $("u-slogan");
  if (sl) { sl.style.display = "none"; sl.textContent = ""; }

  const bs = $("block-service");
  const be = $("block-exp");
  if (bs) bs.style.display = "none";
  if (be) be.style.display = "none";

  const dock = $("contactDock");
  if (dock) dock.style.display = "none";

  const wall = $("photoWall");
  if (wall) wall.style.display = "none";

  const wrap = $("logoWrap");
  const logo = $("u-logo");
  if (wrap) wrap.style.display = "none";
  if (logo) logo.removeAttribute("src");
}

function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認 id 或 GAS 權限");
  setText("u-title", "");

  const img = $("u-img");
  if (img) img.removeAttribute("src");

  const wrap = $("logoWrap");
  const logo = $("u-logo");
  if (wrap) wrap.style.display = "none";
  if (logo) logo.removeAttribute("src");

  const bs = $("block-service");
  const be = $("block-exp");
  if (bs) bs.style.display = "none";
  if (be) be.style.display = "none";

  const dock = $("contactDock");
  if (dock) dock.style.display = "none";

  const wall = $("photoWall");
  const grid = $("photoGrid");
  if (wall) wall.style.display = "none";
  if (grid) grid.innerHTML = "";
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
Apply data to card (auto-hide)
--------------------------- */
function applyDataToCard(p) {
  const name   = pick(p, ["姓名"]);
  const unit   = pick(p, ["單位"]);
  const title  = pick(p, ["頭銜"]);
  const slogan = pick(p, ["理念標語"]);
  const service = pick(p, ["服務項目"]);
  const exp     = pick(p, ["經歷"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-title", title || "");

  const sl = $("u-slogan");
  if (sl) {
    const s = text(slogan);
    if (s) {
      sl.style.display = "";
      sl.classList.add("preline");
      sl.textContent = s;
    } else {
      sl.style.display = "none";
      sl.textContent = "";
    }
  }

  renderBlock_("block-service", "服務項目", service);
  renderBlock_("block-exp", "經歷", exp);

  setAvatarImage_(p);
  setLogo_(p);
  renderContactDock_(p);
  renderPhotoWall_(p);

  syncPlanButtons_();
}

/* ---------------------------
Load card
--------------------------- */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  __resolvedId = cid;
  __lastLoad = { id: cid, ts: Date.now(), url };

  setLoadingUi_();

  try {
    const data = await fetchJsonRobust(url);
    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    applyDataToCard(__payload);

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

/* ---------------------------
Share + Delivery (baseDir safe)
--------------------------- */
function buildCardUrl_() {
  const base = getBaseDir_();
  const u = new URL("index.html", base);
  u.searchParams.set("id", __resolvedId || CONFIG.DEFAULT_ID);
  u.hash = "";
  return u.toString();
}

function buildDeliveryUrl_() {
  const base = getBaseDir_();
  const u = new URL("share.html", base);
  u.searchParams.set("id", __resolvedId || CONFIG.DEFAULT_ID);
  u.hash = "";
  return u.toString();
}

async function copyText_(s) {
  const v = text(s);
  if (!v) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(v);
      return true;
    }
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = v;
  ta.setAttribute("readonly", "readonly");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(ta);
  return true;
}

function bindShareUi_() {
  const btn = $("btnShareCard");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const url = buildCardUrl_();
    await copyText_(url);
    alert("✅ 已複製名片網址");
  });
}

function bindDeliveryUi_() {
  const btn = $("btnDelivery");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const url = buildDeliveryUrl_();
    await copyText_(url);
    alert("✅ 已複製交貨（OG卡）連結");
    // 若你不想自動開新分頁：把下一行註解掉
    window.open(url, "_blank");
  });
}

/* ---------------------------
Hidden Admin Entry
--------------------------- */
function openAdmin_() {
  const base = getBaseDir_();
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  const u = new URL("admin.html", base);
  u.searchParams.set("id", id);
  window.open(u.toString(), "_blank");
}

function bindHiddenAdmin_() {
  const hs = $("adminHotspot");
  if (!hs) return;

  let timer = null;
  let tapCount = 0;
  let tapTimer = null;

  const start = () => {
    clearTimeout(timer);
    timer = setTimeout(() => openAdmin_(), CONFIG.ADMIN_LONGPRESS_MS);
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  hs.addEventListener("touchstart", start, { passive: true });
  hs.addEventListener("touchend", () => {
    cancel();

    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, CONFIG.ADMIN_TRIPLE_TAP_MS);

    if (tapCount >= 3) {
      tapCount = 0;
      openAdmin_();
    }
  }, { passive: true });

  hs.addEventListener("touchcancel", cancel, { passive: true });

  // desktop
  hs.addEventListener("mousedown", start);
  hs.addEventListener("mouseup", cancel);
  hs.addEventListener("mouseleave", cancel);
}

/* ---------------------------
CTA
--------------------------- */
window.goFillForm = function () {
  const u = ensureHttp_(CONFIG.FORM);
  if (u) window.open(u, "_blank");
};

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  try { applyV382_(); } catch {}
  try { syncPlanButtons_(); } catch {}
  try { toggleDotsRows_(); } catch {}

  const id = getCardIdFromUrl_();
  loadCardById_(id).catch(() => {});

  bindShareUi_();
  bindDeliveryUi_();
  bindHiddenAdmin_();

  const vt = $("versionTag");
  if (vt) vt.textContent = "v" + CONFIG.VERSION;
  const ft = $("footerTag");
  if (ft) ft.textContent = "Happiness Smart Card System v" + CONFIG.VERSION;
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });