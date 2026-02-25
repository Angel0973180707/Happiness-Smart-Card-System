/* ================================
 * Happiness Smart Card System — app.js
 * v399.8 COMPLETE OVERWRITE
 * - RESTORE: setV382 / setV382Style / setV382Paper (buttons must work)
 * - KEEP: robust fetch + normalize payload
 * - FIX: LINE官網 / Social links / WeChat copy ID
 * - KEEP: top admin triple tap + copyCardUrl()
 * ================================ */

const CONFIG = {
  VERSION: "399.8",

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

window.CONFIG = CONFIG;

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payloadNorm = null;
let __resolvedId = CONFIG.DEFAULT_ID;

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v399.8]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v399.8]", ...arguments); }
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
RESTORE switching hooks (buttons rely on these)
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
}/* ================================
 * app.js v399.8 (2/3)
 * - robust fetch + normalize keys + pick()
 * - images: avatar/logo/photo wall
 * - contact: LINE官網 / LINE / 微信(複製ID) / 影音社群 / 個人網頁 / 電話 / Email / 導航
 * - dock buttons: dynamic-even layout hook (CSS already handles)
 * ================================ */

/* ---------------------------
Fetch JSON (robust)
--------------------------- */
async function fetchWithTimeout_(url, timeoutMs) {
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

async function fetchJsonRobust_(url) {
  let lastErr = null;
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    try {
      return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS);
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

function pick(p, keys) {
  if (!p) return "";
  const raw = p.__raw || null;
  const lower = p.__lower || null;

  for (const k of keys) {
    if (k == null) continue;
    const kk = cleanKey_(k);

    const v1 = p[kk];
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
URL helpers
--------------------------- */
function ensureHttp_(u){
  let v = text(u);
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith("www.")) return "https://" + v;
  // ✅ 像 lin.ee/xxx、instagram.com/xxx 也補 https
  if(/[a-z0-9-]+\.[a-z]{2,}/i.test(v)) return "https://" + v;
  return v;
}
function normalizePhone_(s){
  const v = text(s);
  if(!v) return "";
  return v.replace(/[^\d+]/g, "");
}
function splitList_(raw){
  const s = text(raw);
  if(!s) return [];
  return s
    .replace(/\r\n/g,"\n")
    .replace(/[，,]+/g,"\n")
    .replace(/[ \t]+/g,"\n")   // ✅ 空白也拆（影音社群常用）
    .split("\n")
    .map(x=>x.trim())
    .filter(Boolean);
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

/* Avatar / Logo */
function setAvatar_(p){
  const img = $("u-img");
  if(!img) return;

  const raw = pick(p, [
    "個人照_fast","個人照",
    "形象照_fast","形象照",
    "avatar_fast","avatar",
    "photo_fast","photo",
    "image"
  ]);

  const cands = buildImageCandidates_(raw);
  if(!cands.length){ img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function setLogo_(p){
  const wrap = $("logoWrap");
  const img  = $("u-logo");
  if(!wrap || !img) return;

  const raw = pick(p, [
    "logo_fast","logo","Logo",
    "品牌logo_fast","品牌logo","品牌Logo_fast","品牌Logo",
    "LOGO_fast","LOGO",
    "公司logo_fast","公司logo","公司Logo_fast","公司Logo",
    "商標_fast","商標"
  ]);

  const cands = buildImageCandidates_(raw);
  if(!cands.length){
    wrap.style.display="none";
    img.removeAttribute("src");
    return;
  }
  wrap.style.display="";
  setImgWithFallback_(img, cands);
}

/* Photo wall */
function collectPhotoUrls_(p){
  const urls = [];

  // ✅ 支援你常用多種欄位
  const main = pick(p, ["照片_fast","照片","photos","images","相片牆","照片牆","相簿"]);
  urls.push(...splitList_(main));

  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitList_(p[`照片${i}`]));
    urls.push(...splitList_(p[`圖片${i}`]));
    urls.push(...splitList_(p[`photo${i}`]));
    urls.push(...splitList_(p[`image${i}`]));
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
    wall.style.display="none";
    return;
  }
  wall.style.display="";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    setImgWithFallback_(img, buildImageCandidates_(raw));
    const openUrl = normalizeImageUrl(raw);
    img.onclick = ()=> window.open(openUrl || raw, "_blank");
    grid.appendChild(img);
  }
}

/* ---------------------------
Dock buttons helpers
--------------------------- */
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
}

async function copyText_(s){
  const v = text(s);
  if(!v) return false;

  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(v);
      toast_("已複製");
      return true;
    }
  }catch{}

  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.setAttribute("readonly","readonly");
    ta.style.position="fixed";
    ta.style.left="-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast_("已複製");
    return true;
  }catch{}

  alert(v);
  return false;
}

function addDockBtn_(wrap, label, hrefOrFn, iconClass){
  if(!wrap) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dock-btn";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;

  if(typeof hrefOrFn === "function"){
    btn.onclick = hrefOrFn;
  }else{
    const href = text(hrefOrFn);
    if(!href) return;
    btn.onclick = ()=> window.open(href, "_blank");
  }

  wrap.appendChild(btn);
}

function iconFor_(type){
  const t = String(type||"").toLowerCase();
  if(t === "phone") return "fa-solid fa-phone";
  if(t === "email") return "fa-solid fa-envelope";
  if(t === "web") return "fa-solid fa-globe";
  if(t === "map") return "fa-solid fa-location-dot";
  if(t === "line") return "fa-brands fa-line";
  if(t === "wechat") return "fa-brands fa-weixin";
  if(t === "video") return "fa-solid fa-circle-play";
  return "fa-solid fa-link";
}

/* ---------------------------
Dock render (ORDER FIXED)
Order you want:
LINE官網、LINE、微信、電話、Email、導航
+ 影音社群/個人網頁（在上方內容區顯示時，也可放 dock）
--------------------------- */
function renderContactDock_(p){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML = "";

  const lineOfficial = pick(p, [
    "LINE官方帳號","LINE 官方帳號","line官方帳號","line 官方帳號",
    "line官網","line官網預約","line官方網站","line官方帳號網址",
    "line_oa_url","lineoa_url","line_oa","line_oa_link","LINE_OA_URL","LINE_OA",
    "lin.ee"
  ]);

  const line = pick(p, [
    "line","Line","LINE","line_id","lineId","LineID",
    "line個人","line個人帳號"
  ]);

  const wechat = pick(p, ["wechat","weixin","微信","微信號","weixin_id","wx","wxid"]);
  const phone  = pick(p, ["電話","手機","phone","mobile","tel"]);
  const email  = pick(p, ["Email","email","E-mail","電子郵件","mail"]);
  const addr   = pick(p, ["地址","address","所在地","location"]);

  // ✅ 影音/社群/個人網頁（多連結）
  const videoRaw = pick(p, ["影音社群","影音社群平台","社群平台","影音平台","video","youtube","YouTube","yt","頻道","channel"]);
  const webRaw   = pick(p, ["個人網頁","個人網站","官網","網站","website","url","link"]);

  // 1) LINE官網
  if(text(lineOfficial)){
    const href = ensureHttp_(lineOfficial);
    addDockBtn_(wrap, "LINE官網", href, iconFor_("line"));
  }

  // 2) LINE（id or url）
  if(text(line)){
    let href = "";
    if(/https?:\/\//i.test(line) || /lin\.ee\//i.test(line) || /line\.me\//i.test(line)) href = ensureHttp_(line);
    else href = `https://line.me/R/ti/p/${encodeURIComponent(text(line))}`;
    addDockBtn_(wrap, "LINE", href, iconFor_("line"));
  }

  // 3) WeChat: copy ID
  if(text(wechat)){
    addDockBtn_(wrap, "微信ID", () => copyText_(wechat), iconFor_("wechat"));
  }

  // 4) phone
  if(text(phone)){
    const pnum = normalizePhone_(phone);
    if(pnum) addDockBtn_(wrap, "電話", `tel:${pnum}`, iconFor_("phone"));
  }

  // 5) email
  if(text(email)){
    const e = text(email);
    addDockBtn_(wrap, "Email", `mailto:${encodeURIComponent(e)}`, iconFor_("email"));
  }

  // 6) map
  if(text(addr)){
    const a = text(addr);
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
    addDockBtn_(wrap, "導航", href, iconFor_("map"));
  }

  // ✅ 影音社群（若有多條，先取第一條放 dock；其餘交給 index.html 的內容區（若你有））
  const videos = splitList_(videoRaw).map(ensureHttp_).filter(Boolean);
  if(videos.length){
    addDockBtn_(wrap, "影音", videos[0], iconFor_("video"));
  }

  // ✅ 個人網頁（同上）
  const webs = splitList_(webRaw).map(ensureHttp_).filter(Boolean);
  if(webs.length){
    addDockBtn_(wrap, "網頁", webs[0], iconFor_("web"));
  }

  dock.style.display = wrap.children.length ? "" : "none";
}/* ---------------------------
Apply data to card
--------------------------- */

function setText_(id, v){
  const e = $(id);
  if(e) e.textContent = text(v);
}

function renderBlock_(id, title, body){
  const root = $(id);
  if(!root) return;

  const b = text(body);
  if(!b){
    root.style.display="none";
    root.innerHTML="";
    return;
  }

  root.style.display="";
  root.innerHTML = `
    <div class="block-title">${title}</div>
    <div class="block-body preline">${b}</div>
  `;
}

function applyDataToCard_(p){

  const name   = pick(p, ["姓名","name","Name"]);
  const unit   = pick(p, ["單位","unit","Unit"]);
  const title  = pick(p, ["頭銜","職稱","title","Title"]);
  const slogan = pick(p, ["理念","標語","slogan","Slogan"]);
  const svc    = pick(p, ["服務項目","service","Service"]);
  const exp    = pick(p, ["經歷","experience","Experience"]);

  setText_("u-name",  name || "");
  setText_("u-unit",  unit || "");
  setText_("u-title", title || "");

  const sl = $("u-slogan");
  if(sl){
    if(text(slogan)){
      sl.style.display="";
      sl.textContent = slogan;
    }else{
      sl.style.display="none";
      sl.textContent="";
    }
  }

  renderBlock_("block-service","服務項目", svc);
  renderBlock_("block-exp","經歷", exp);

  setAvatar_(p);
  setLogo_(p);
  renderPhotoWall_(p);
  renderContactDock_(p);
}

/* ---------------------------
Load card
--------------------------- */

async function loadCardById_(id){

  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{

    const data = await fetchJsonRobust_(url);

    if(!data || data.ok === false)
      throw new Error(data && data.error ? data.error : "Not found");

    const norm = buildNormalizedPayload_(data);

    applyDataToCard_(norm);

    try{
      const u = new URL(location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    }catch{}

  }catch(e){

    console.error(e);
    toast_("讀取失敗");

  }
}

/* ---------------------------
Normalize ID
--------------------------- */

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";

  if(/^TW\d{4}$/.test(v)) return v;

  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4,"0");

  if(/^TW\d{1,4}$/.test(v)){
    const n = v.replace("TW","");
    return "TW" + n.padStart(4,"0");
  }

  return v;
}

function getIdFromUrl_(){
  try{
    const u = new URL(location.href);
    return normalizeId_(u.searchParams.get("id"));
  }catch{
    return CONFIG.DEFAULT_ID;
  }
}

/* ---------------------------
Hidden Admin (top invisible)
--------------------------- */

function ensureAdminHotspot_(){

  if($("__adminHotspot")) return;

  const hs = document.createElement("div");
  hs.id="__adminHotspot";

  hs.style.position="fixed";
  hs.style.top="6px";
  hs.style.right="6px";
  hs.style.width="36px";
  hs.style.height="36px";
  hs.style.opacity="0";
  hs.style.zIndex="99999";

  let taps=0;
  let timer=null;

  hs.onclick = ()=>{
    taps++;
    clearTimeout(timer);
    timer=setTimeout(()=>taps=0,600);

    if(taps>=3){
      taps=0;
      window.open(`admin.html?id=${encodeURIComponent(__resolvedId||CONFIG.DEFAULT_ID)}`,"_blank");
    }
  };

  document.body.appendChild(hs);
}

/* ---------------------------
Boot
--------------------------- */

function boot_(){

  ensureAdminHotspot_();

  const id = getIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });