/* ================================
 * Happiness Smart Card System — app.js (v399.4 COMPLETE OVERWRITE) 1/3
 * Fix v399.4:
 * 1) Photos/Avatar/Logo not showing -> DOM id mismatch tolerant getters
 * 2) Keep v382 hooks + v3994 admin hotspot + share helper
 * ================================ */

const CONFIG = {
  VERSION: "399.4",

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_TRIPLETAP_WINDOW_MS: 650,
  ADMIN_TRIPLETAP_COUNT: 3,

  PHOTO_SLOT_MAX: 20,

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

function log_() { if (CONFIG.DEBUG) console.log("[HSC-v399.3]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v399.3]", ...arguments); }
function err_() { console.error("[HSC-v399.3]", ...arguments); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

/* ✅ DOM tolerant getter: try ids then selectors */
function getElAny_(ids = [], selectors = []) {
  for (const id of (ids || [])) {
    const el = $(id);
    if (el) return el;
  }
  for (const sel of (selectors || [])) {
    const el = q(sel);
    if (el) return el;
  }
  return null;
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
UI: dots rows (free vs premium)
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
Switching system (keep HTML hooks)
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
async function waitForDom_(ids, timeoutMs = 2600) {
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
Share helper (keep)
--------------------------- */
async function copyText_(s){
  const v = text(s);
  if(!v) return false;

  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(v);
      toast_("已複製連結");
      return true;
    }
  }catch{}

  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast_("已複製連結");
    return true;
  }catch{}

  toast_("無法自動複製，請手動複製");
  alert(v);
  return false;
}

window.copyCardUrl = async function(){
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  let url = "";
  try{
    const u = new URL(window.location.href);
    u.searchParams.set("id", id);
    url = u.toString();
  }catch{
    url = `${location.origin}${location.pathname}?id=${encodeURIComponent(id)}`;
  }
  return copyText_(url);
};

function toast_(msg){
  const m = text(msg);
  if(!m) return;
  let t = $("__toast");
  if(!t){
    t = document.createElement("div");
    t.id="__toast";
    t.style.position="fixed";
    t.style.left="50%";
    t.style.bottom="18px";
    t.style.transform="translateX(-50%)";
    t.style.background="rgba(0,0,0,0.78)";
    t.style.color="#fff";
    t.style.padding="10px 14px";
    t.style.borderRadius="999px";
    t.style.fontSize="13px";
    t.style.fontWeight="800";
    t.style.zIndex="99999";
    t.style.opacity="0";
    t.style.transition="opacity 180ms ease";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.style.opacity="1";
  clearTimeout(toast_._timer);
  toast_._timer = setTimeout(()=>{ t.style.opacity="0"; }, 1100);
}/* ================================
 * Happiness Smart Card System — app.js (v399.3 COMPLETE OVERWRITE) 2/3
 * - Normalize keys + pick()
 * - Images: avatar/logo/photo wall robust loading (DOM tolerant)
 * - Contact dock: required order + dynamic-average layout hooks
 * ================================ */

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
Avatar / Logo (DOM tolerant)
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
  // ✅ 兼容不同 HTML：u-img / avatar / .avatar
  const img =
    getElAny_(["u-img","avatarImg","avatar","uAvatar"], ["#card-container img.avatar", "img.avatar"]) ||
    $("u-img");

  if(!img) { warn_("avatar img not found"); return; }

  const raw = getAvatarUrl_(payloadNorm);
  const cands = buildImageCandidates_(raw);

  if(!cands.length){
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, cands);
}

function getLogoUrl_(payloadNorm){
  return pick(payloadNorm, [
    "logo_fast","logo",
    "品牌logo_fast","品牌logo",
    "品牌Logo_fast","品牌Logo",
    "LOGO_fast","LOGO",
    "公司logo_fast","公司logo",
    "公司Logo_fast","公司Logo",
    "商標_fast","商標",
    "mark_fast","mark"
  ]);
}

function setLogo_(payloadNorm){
  // ✅ 兼容不同 HTML：logoWrap / logo-wrap / #logoWrap
  const wrap =
    getElAny_(["logoWrap","uLogoWrap","logo-wrap"], ["#logoWrap", ".logo-wrap"]) ||
    $("logoWrap");

  const img =
    getElAny_(["u-logo","logoImg","logo","uLogo"], ["#logoWrap img", ".logo-wrap img"]) ||
    $("u-logo");

  if(!wrap || !img) { warn_("logo elements not found"); return; }

  const raw = getLogoUrl_(payloadNorm);
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
Photo wall (DOM tolerant)
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

function collectPhotoUrls_(payloadNorm){
  const urls = [];

  const main = pick(payloadNorm, ["照片_fast","照片","images","image","photo","照片牆","相片牆","圖片","相簿"]);
  urls.push(...splitPhotoList_(main));

  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitPhotoList_(payloadNorm[`照片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`圖片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`photo${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`image${i}`]));
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

function renderPhotoWall_(payloadNorm){
  // ✅ 兼容不同 HTML：photoWall/photoGrid 或 .photo-wall/.photo-grid
  const wall =
    getElAny_(["photoWall","wallPhotos","photosWall"], ["#photoWall",".photo-wall"]) ||
    $("photoWall");

  const grid =
    getElAny_(["photoGrid","gridPhotos","photosGrid"], ["#photoGrid",".photo-grid"]) ||
    $("photoGrid");

  if(!wall || !grid) { warn_("photo wall elements not found"); return; }

  grid.innerHTML = "";
  const list = collectPhotoUrls_(payloadNorm);

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
Contact dock: required order + dynamic-average hint
Order: line官網、line、微信、電話、Email、導航
--------------------------- */
function normalizePhone_(s){
  const v = text(s);
  if(!v) return "";
  return v.replace(/[^\d+]/g, "");
}
function ensureHttp_(u){
  let v = text(u);
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith("www.")) return "https://" + v;
  return v;
}

function iconFor_(type){
  const t = String(type||"").toLowerCase();
  if(t === "phone") return "fa-solid fa-phone";
  if(t === "email") return "fa-solid fa-envelope";
  if(t === "web") return "fa-solid fa-globe";
  if(t === "map") return "fa-solid fa-location-dot";
  if(t === "line") return "fa-brands fa-line";
  if(t === "wechat") return "fa-brands fa-weixin";
  return "fa-solid fa-link";
}

function addDockBtn_(wrap, label, href, iconClass){
  if(!wrap || !href) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dock-btn";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  btn.onclick = ()=> window.open(href, "_blank");
  wrap.appendChild(btn);
}

function renderContactDock_(payloadNorm){
  const wrap =
    getElAny_(["contactButtons","dockButtons","btnDock"], ["#contactButtons",".dock-buttons"]) ||
    $("contactButtons");

  const dock =
    getElAny_(["contactDock","dock","uDock"], ["#contactDock",".contact-dock"]) ||
    $("contactDock");

  if(!wrap || !dock) { warn_("dock elements not found"); return; }

  wrap.innerHTML = "";

  // ✅ 官網（LINE官網第一優先）
  const lineOfficial = pick(payloadNorm, ["line官網","line官網預約","line官方網站","line官方帳號網址","line_oa_url","lineoa_url","line_oa"]);
  const lineIdOrUrl  = pick(payloadNorm, ["line","line_id","Line","LINE","line_id_or_url"]);
  const wechat       = pick(payloadNorm, ["wechat","weixin","微信","微信號","weixin_id","wx","wxid"]);
  const phone        = pick(payloadNorm, ["電話","手機","phone","mobile","tel"]);
  const email        = pick(payloadNorm, ["Email","email","電子郵件","信箱","mail"]);
  const addr         = pick(payloadNorm, ["地址","address","所在地","location"]);

  // 1) LINE官網（如果是 url 直接開；如果是 id 走 line.me）
  const lo = text(lineOfficial);
  if(lo){
    let href = "";
    if(/https?:\/\//i.test(lo) || lo.startsWith("www.")) href = ensureHttp_(lo);
    else href = `https://line.me/R/ti/p/${encodeURIComponent(lo)}`;
    addDockBtn_(wrap, "LINE官網", href, iconFor_("web"));
  }

  // 2) LINE（若填 url，仍可當一般 LINE）
  const lv = text(lineIdOrUrl);
  if(lv){
    let href = "";
    if(/https?:\/\//i.test(lv) || lv.startsWith("www.")) href = ensureHttp_(lv);
    else href = `https://line.me/R/ti/p/${encodeURIComponent(lv)}`;
    addDockBtn_(wrap, "LINE", href, iconFor_("line"));
  }

  // 3) WeChat（無通用 deep link -> 搜尋）
  const wx = text(wechat);
  if(wx){
    const href = `https://www.google.com/search?q=${encodeURIComponent("WeChat " + wx)}`;
    addDockBtn_(wrap, "微信", href, iconFor_("wechat"));
  }

  // 4) Phone
  const p = normalizePhone_(phone);
  if(p){
    addDockBtn_(wrap, "電話", `tel:${p}`, iconFor_("phone"));
  }

  // 5) Email
  const em = text(email);
  if(em){
    addDockBtn_(wrap, "Email", `mailto:${em}`, iconFor_("email"));
  }

  // 6) Map
  const a = text(addr);
  if(a){
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
    addDockBtn_(wrap, "導航", href, iconFor_("map"));
  }

  // ✅ 交給 CSS 做動態平均（wrap 加上資料屬性）
  wrap.dataset.count = String(wrap.children.length || 0);

  dock.style.display = wrap.children.length ? "" : "none";
}/* ================================
 * Happiness Smart Card System — app.js (v399.3 COMPLETE OVERWRITE) 3/3
 * - Fetch + Load Card
 * - Apply to DOM (free / premium)
 * - Premium button fix (dead button insurance)
 * - Dynamic hide blocks
 * - Admin hotspot (triple tap)
 * - Boot
 * ================================ */

async function fetchJsonRobust_(url){
  const res = await fetch(url, { cache:"no-store" });
  const txt = await res.text();
  try{ return JSON.parse(txt); }
  catch(e){
    console.warn("JSON parse fail →", txt);
    throw e;
  }
}

/* ---------------------------
DOM helpers
--------------------------- */
function hideIfEmpty_(el, value){
  if(!el) return;
  if(!text(value)) el.style.display = "none";
  else el.style.display = "";
}

function setText_(id, value){
  const el = $(id);
  if(el) el.textContent = text(value);
  hideIfEmpty_(el, value);
}

/* ---------------------------
Apply payload to UI
--------------------------- */
function applyPayload_(payloadRaw){

  const payload = buildNormalizedPayload_(payloadRaw);

  setText_("u-name",  pick(payload, ["姓名","name"]));
  setText_("u-unit",  pick(payload, ["單位","unit","公司"]));
  setText_("u-title", pick(payload, ["頭銜","title","職稱"]));

  const service = pick(payload, ["服務項目","經營項目","service"]);
  const exp     = pick(payload, ["經歷","experience"]);

  setText_("block-service-body", service);
  setText_("block-exp-body", exp);

  hideIfEmpty_($("block-service"), service);
  hideIfEmpty_($("block-exp"), exp);

  setAvatarImage_(payload);
  setLogo_(payload);
  renderPhotoWall_(payload);
  renderContactDock_(payload);
}

/* ---------------------------
Load card by id
--------------------------- */
async function loadCardById_(id){

  const cid = id || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&t=${Date.now()}`;

  try{
    const data = await fetchJsonRobust_(url);

    if(!data || data.ok === false){
      console.warn("card fail", data);
      return;
    }

    applyPayload_(data.data || data);

  }catch(err){
    console.error("loadCard error", err);
  }
}

/* ---------------------------
Premium buttons — FIX DEAD BUTTON
--------------------------- */
function bindPremiumButtons_(){

  document.querySelectorAll(".p-dot").forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll(".p-dot").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      const cls = btn.dataset.theme;
      document.body.className = `mode-premium ${cls}`;
    };
  });

  document.querySelectorAll(".dot").forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll(".dot").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      const cls = btn.dataset.theme;
      document.body.className = `mode-free ${cls}`;
    };
  });
}

/* ---------------------------
Admin hotspot (triple tap)
--------------------------- */
function bindAdminHotspot_(){
  const hot = $("adminHotspotTop");
  if(!hot) return;

  let tap = 0;
  hot.addEventListener("click", ()=>{
    tap++;
    if(tap >= 3){
      window.location.href = "admin.html";
    }
    setTimeout(()=> tap = 0, 900);
  });
}

/* ---------------------------
Boot
--------------------------- */
(function boot(){

  window.CONFIG = CONFIG; // ✅ 給 admin.html 用

  bindPremiumButtons_();
  bindAdminHotspot_();

  const p = new URLSearchParams(window.location.search);
  const id = p.get("id") || CONFIG.DEFAULT_ID;

  loadCardById_(id);

})();