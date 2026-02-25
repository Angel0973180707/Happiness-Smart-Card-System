/* ================================
 * Happiness Smart Card System — app.js (v399.2 COMPLETE OVERWRITE)
 * - Keep v393 free dynamic-mask (HTML/CSS already)
 * - Fix: LINE(好友/官帳) + 影音1~3 + 社群1~3
 * - Fix: fast fields priority (個人照_fast / Logo_fast / 照片_fast)
 * - Add: Share button (copy card url / copy delivery url)
 * - Hidden admin entry: top hotspot long-press (1.2s) + triple-tap backup
 * ================================ */

const CONFIG = {
  VERSION: "399.2",

  // ✅ 你的 GAS WebApp（action=card&id=TW0001）
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

  // ✅ 你的表單
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",

  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  // 隱形入口（你先要討論，我這裡先做「可用」：右上熱區長按 + 三擊備援）
  ADMIN_LONGPRESS_MS: 1200,
  ADMIN_TRIPLE_TAP_MS: 650,

  PHOTO_SLOT_MAX: 20,

  DEBUG: true
};

/* ---------------------------
State
--------------------------- */
let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __resolvedId = CONFIG.DEFAULT_ID;
let __lastLoad = { id: "", ts: 0, url: "" };

/* ---------------------------
DOM helpers
--------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }

function log_() { if (CONFIG.DEBUG) console.log("[HSC-v399.2]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v399.2]", ...arguments); }
function err_() { console.error("[HSC-v399.2]", ...arguments); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

/* ---------------------------
URL helpers
--------------------------- */
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
      const head = body.slice(0, 160).replace(/\s+/g, " ");
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
Normalize keys + pick
(你的表頭很乾淨，但仍保留容錯：去除 BOM/引號/換行/全形空白)
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

function ensureHttp_(u) {
  let v = text(u);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("www.")) return "https://" + v;
  return v;
}

function escapeHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
/* =========================
 * app.js Part 2/3
 * Images + Photo wall + Dock + Blocks
 * ========================= */

/* ---------------------------
Images: normalize + candidates
(支援 dropbox / google drive)
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
Avatar / Logo (fast priority)
--------------------------- */
function getAvatarUrl_(p){
  // ✅ 你的表頭：個人照 / 個人照_fast
  return pick(p, ["個人照_fast","個人照"]);
}

function getLogoUrl_(p){
  // ✅ 你的表頭：Logo / Logo_fast
  return pick(p, ["Logo_fast","Logo"]);
}

function setAvatarImage_(p){
  const img = $("u-img");
  if(!img) return;
  const raw = getAvatarUrl_(p);
  const cands = buildImageCandidates_(raw);
  if(!cands.length){ img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function setLogo_(p){
  const wrap = $("logoWrap");
  const img = $("u-logo");
  if(!wrap || !img) return;

  const raw = getLogoUrl_(p);
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
Photo wall
- 優先：照片_fast
- 其次：照片
--------------------------- */
function splitPhotoList_(raw){
  const s = text(raw);
  if(!s) return [];
  const normalized = s
    .replace(/\r\n/g, "\n")
    .replace(/[,，]+/g, "\n")
    .replace(/[ \t]+/g, "\n");

  return normalized
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
}

function collectPhotoUrls_(p){
  const urls = [];
  const main = pick(p, ["照片_fast","照片"]);
  urls.push(...splitPhotoList_(main));

  // 預留：若未來你又加 照片1/2/3 也不會壞
  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitPhotoList_(p[`照片${i}`]));
  }

  const cleaned = [];
  const seen = new Set();
  for(const raw of urls){
    const r = text(raw);
    if(!r) continue;
    const norm = normalizeImageUrl(r);
    const key = norm || r;
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
    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands);

    const openUrl = normalizeImageUrl(raw);
    img.onclick = ()=> window.open(openUrl || raw, "_blank");
    grid.appendChild(img);
  }
}

/* ---------------------------
Dock: LINE / 影音 / 社群
你的乾淨表頭：
- LINE連結
- LINE官方帳號
- 影音平台1/2/3
- 社群平台1/2/3
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
  // 非 URL：用搜尋 fallback（避免假功能）
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

function renderContactDock_(p){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML = "";

  // LINE（兩種分開顯示）
  const lineFriend = asUrlOrSearch_(pick(p, ["LINE連結"]));
  const lineOA = asUrlOrSearch_(pick(p, ["LINE官方帳號"]));
  if(lineFriend) addDockBtn_(wrap, "LINE（好友）", lineFriend);
  if(lineOA) addDockBtn_(wrap, "LINE（官帳）", lineOA);

  // 影音 1~3
  for(let i=1;i<=3;i++){
    const v = pick(p, [`影音平台${i}`]);
    const href = asUrlOrSearch_(v);
    if(href) addDockBtn_(wrap, `影音平台${i}`, href);
  }

  // 社群 1~3
  for(let i=1;i<=3;i++){
    const v = pick(p, [`社群平台${i}`]);
    const href = asUrlOrSearch_(v);
    if(href) addDockBtn_(wrap, `社群平台${i}`, href);
  }

  // 基本聯繫（你的表頭也有）
  const email = text(pick(p, ["Email"]));
  const phone = text(pick(p, ["電話"]));
  const addr = text(pick(p, ["地址"]));

  if(email) addDockBtn_(wrap, "Email", `mailto:${email}`);
  if(phone){
    const pnum = phone.replace(/[^\d+]/g, "");
    if(pnum) addDockBtn_(wrap, "撥打", `tel:${pnum}`);
  }
  if(addr) addDockBtn_(wrap, "導航", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);

  // WeChat（微信）— 無通用 scheme，給搜尋 fallback
  const wx = text(pick(p, ["微信"]));
  if(wx) addDockBtn_(wrap, "微信", `https://www.google.com/search?q=${encodeURIComponent("WeChat " + wx)}`);

  dock.style.display = wrap.children.length ? "" : "none";
}

/* ---------------------------
Blocks render (服務 / 經歷)
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
}
/* =========================
 * app.js Part 3/3
 * Load + Apply + Share + Hidden Admin + Boot
 * ========================= */

/* ---------------------------
Apply Data To UI
⚠️ id 不顯示在名片
⚠️ 精品款：姓名 / 單位 / 頭銜視覺分離（CSS 已處理）
--------------------------- */
function applyDataToUi_(p){

  const name  = pick(p, ["姓名"]);
  const unit  = pick(p, ["單位"]);
  const title = pick(p, ["頭銜"]);

  setText("u-name", name);
  setText("u-unit", unit);
  setText("u-title", title);

  renderBlock_("u-slogan", "理念標語", pick(p, ["理念標語"]));
  renderBlock_("u-service", "服務項目", pick(p, ["服務項目"]));
  renderBlock_("u-exp", "經歷", pick(p, ["經歷"]));

  setAvatarImage_(p);
  setLogo_(p);
  renderPhotoWall_(p);
  renderContactDock_(p);
}

/* ---------------------------
Load Card From GAS
--------------------------- */
async function loadCardById_(id){

  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __lastLoad = { id: cid, ts: Date.now(), url };

  log_("loadCard:", url);

  const data = await fetchJsonRobust(url);

  if(!data || typeof data !== "object"){
    throw new Error("Invalid GAS payload");
  }
  if(data.ok === false){
    throw new Error(data.error || "Card load failed");
  }

  __payloadRaw = data;
  __payload = buildNormalizedPayload_(data);

  applyDataToUi_(__payload);
}

/* ---------------------------
Share Sheet Logic
--------------------------- */
function bindShareSheet_(){

  const fab = $("fabShare");
  const sheet = $("shareSheet");

  if(!fab || !sheet) return;

  fab.onclick = ()=> sheet.classList.add("show");

  const close = $("sheetClose");
  if(close) close.onclick = ()=> sheet.classList.remove("show");

  const copyCard = $("copyCardUrl");
  if(copyCard){
    copyCard.onclick = ()=>{
      const url = `${location.origin}${location.pathname}?id=${__resolvedId}`;
      navigator.clipboard.writeText(url);
      sheet.classList.remove("show");
    };
  }

  const copyDelivery = $("copyDeliveryUrl");
  if(copyDelivery){
    copyDelivery.onclick = ()=>{
      const url = `${location.origin}/share.html?id=${__resolvedId}`;
      navigator.clipboard.writeText(url);
      sheet.classList.remove("show");
    };
  }
}

/* ---------------------------
Hidden Admin Entry
方案：
① 右上角熱區長按 1.2 秒（主入口）
② 三擊備援（避免某些手機長按被吃掉）
--------------------------- */
function bindHiddenAdmin_(){

  const hotspot = $("adminHotspot");
  if(!hotspot) return;

  let pressTimer = null;
  let tapCount = 0;
  let tapTimer = null;

  const openAdmin = ()=>{
    const url = `${location.origin}/admin.html?id=${__resolvedId}`;
    window.open(url, "_blank");
  };

  hotspot.addEventListener("touchstart", ()=>{
    pressTimer = setTimeout(openAdmin, CONFIG.ADMIN_LONGPRESS_MS);
  });

  hotspot.addEventListener("touchend", ()=>{
    clearTimeout(pressTimer);

    tapCount++;
    clearTimeout(tapTimer);

    tapTimer = setTimeout(()=> tapCount = 0, CONFIG.ADMIN_TRIPLE_TAP_MS);

    if(tapCount >= 3){
      tapCount = 0;
      openAdmin();
    }
  });
}

/* ---------------------------
Boot
--------------------------- */
window.addEventListener("DOMContentLoaded", async ()=>{

  const id = getCardIdFromUrl_();

  try{
    await loadCardById_(id);
  }catch(e){
    err_("Boot load error:", e);
  }

  bindShareSheet_();
  bindHiddenAdmin_();
});

/* ---------------------------
Global actions
--------------------------- */
window.goFillForm = function(){
  window.open(CONFIG.FORM, "_blank");
};