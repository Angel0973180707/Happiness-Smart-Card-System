/* ================================
 * Happiness Smart Card System — app.js (v399.x COMPLETE OVERWRITE) 1/3
 * Base: v399 robust loader + v382 hooks + v393 dynamic-mask
 * FIX (per your request, keep function & look, only layout/order fixes):
 * 1) Free: unit -> banner center (#u-unit-banner)
 * 2) Free content order already in HTML; JS ensures correct show/hide + dynamic balance
 * 3) Premium: logo top-right, avatar left, name right (use #u-name-premium)
 *    + ensure premium title element exists (create #u-title-premium if missing)
 * 4) Split docks:
 *    - platformDock (#platformButtons): 影音/社群/個人網頁
 *    - contactDock  (#contactButtons): line官網、line、微信、電話、Email、導航 (THIS ORDER)
 * 5) Photos: keep click-open original; CSS makes it horizontal carousel
 * 6) Admin: top triple tap -> admin.html?id=...
 * 7) Expose window.CONFIG for admin.html name-search use
 * ================================ */

const CONFIG = {
  VERSION: "399.9",
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  PHOTO_SLOT_MAX: 12,
  DEBUG: false
};

// ✅ expose for admin.html (name search)
window.CONFIG = CONFIG;

const state = {
  mode: "free",          // free | premium
  freeColor: "color-1",  // color-1..color-5
  premiumTheme: "p1",    // p1..p7
  style: "arch",         // arch | flat | spot
  paper: "paper-1",      // paper-1..paper-3
};

let __resolvedId = CONFIG.DEFAULT_ID;
let __lastLoad = null;

function $(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }
function log(){ if(CONFIG.DEBUG) console.log("[app]", ...arguments); }
function warn(){ if(CONFIG.DEBUG) console.warn("[app]", ...arguments); }

function setText(id, s){
  const el = $(id);
  if(!el) return;
  const v = text(s);
  el.textContent = v;
}

function setShow(id, yes){
  const el = $(id);
  if(!el) return;
  el.style.display = yes ? "" : "none";
}

/* ---------------------------
v382 hooks (button linkage)
--------------------------- */
window.setV382 = function(mode, token, btnEl){
  if(mode === "premium"){
    state.mode = "premium";
    state.premiumTheme = token || "p1";
  }else{
    state.mode = "free";
    state.freeColor = token || "color-1";
  }
  applyModeClass_();
  markPlanButtons_();
  markDotsActive_(mode, token);
  refreshPremiumSafety_();
};

window.setV382Style = function(styleName, btnEl){
  state.style = styleName || "arch";
  applyModeClass_();
  markStyleButtons_(styleName);
};

window.setV382Paper = function(paperName, btnEl){
  state.paper = paperName || "paper-1";
  applyModeClass_();
  markPaperButtons_(paperName);
};

function applyModeClass_(){
  const b = document.body;
  if(!b) return;

  // clear
  b.classList.remove("mode-free","mode-premium");
  for(let i=1;i<=5;i++) b.classList.remove(`color-${i}`);
  for(let i=1;i<=7;i++) b.classList.remove(`p${i}`);
  b.classList.remove("style-arch","style-flat","style-spot");
  b.classList.remove("paper-1","paper-2","paper-3");

  // apply
  if(state.mode === "premium"){
    b.classList.add("mode-premium");
    b.classList.add(state.premiumTheme || "p1");
  }else{
    b.classList.add("mode-free");
    b.classList.add(state.freeColor || "color-1");
  }

  b.classList.add(`style-${state.style || "arch"}`);
  b.classList.add(state.paper || "paper-1");

  // show/hide control groups
  const freeControls = $("free-controls");
  const freeDots = $("freeDotsRow");
  const premiumDots = $("premiumDotsRow");

  if(state.mode === "premium"){
    if(freeControls) freeControls.style.display = "none";
    if(freeDots) freeDots.style.display = "none";
    if(premiumDots) premiumDots.style.display = "";
  }else{
    if(freeControls) freeControls.style.display = "";
    if(freeDots) freeDots.style.display = "";
    if(premiumDots) premiumDots.style.display = "none";
  }
}

function markPlanButtons_(){
  const a = $("btnPlanFree");
  const b = $("btnPlanPremium");
  if(!a || !b) return;

  if(state.mode === "free"){
    a.classList.add("active");
    b.classList.remove("active");
  }else{
    b.classList.add("active");
    a.classList.remove("active");
  }
}

function markDotsActive_(mode, token){
  const freeDots = Array.from(document.querySelectorAll("#freeDotsRow .dot"));
  const premDots = Array.from(document.querySelectorAll("#premiumDotsRow .p-dot"));

  freeDots.forEach(d=>d.classList.remove("active"));
  premDots.forEach(d=>d.classList.remove("active"));

  if(mode === "premium"){
    // token is p1..p7
    const idx = Math.max(1, Math.min(7, parseInt(String(token||"p1").replace("p",""),10)||1));
    if(premDots[idx-1]) premDots[idx-1].classList.add("active");
  }else{
    // token is color-1..color-5
    const idx = Math.max(1, Math.min(5, parseInt(String(token||"color-1").replace("color-",""),10)||1));
    if(freeDots[idx-1]) freeDots[idx-1].classList.add("active");
  }
}

function markStyleButtons_(styleName){
  const btns = Array.from(document.querySelectorAll("#free-controls .control-row:nth-of-type(1) .btn-neo"));
  btns.forEach(b=>b.classList.remove("active"));
  const key = String(styleName||"arch").toLowerCase();
  const map = { arch:0, flat:1, spot:2 };
  const i = map[key];
  if(i!=null && btns[i]) btns[i].classList.add("active");
}

function markPaperButtons_(paperName){
  const btns = Array.from(document.querySelectorAll("#free-controls .control-row:nth-of-type(2) .btn-neo"));
  btns.forEach(b=>b.classList.remove("active"));
  const key = String(paperName||"paper-1").toLowerCase();
  const map = { "paper-1":0, "paper-2":1, "paper-3":2 };
  const i = map[key];
  if(i!=null && btns[i]) btns[i].classList.add("active");
}

function refreshPremiumSafety_(){
  if(state.mode !== "premium") return;
  const nameEl = $("u-name-premium");
  if(!nameEl) return;
  requestAnimationFrame(()=>{
    nameEl.style.transform = "translateZ(0)";
    setTimeout(()=>{ nameEl.style.transform = ""; }, 120);
  });
}

/* ---------------------------
DOM wait helper
--------------------------- */
async function waitForDom_(ids, timeoutMs = 2400){
  const need = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  const started = Date.now();
  while(Date.now() - started < timeoutMs){
    let ok = true;
    for(const id of need){
      if(!$(id)){ ok = false; break; }
    }
    if(ok) return true;
    await new Promise(r=>setTimeout(r, 40));
  }
  return false;
}/* ================================
 * app.js (v399.x) 2/3
 * - robust fetch + key normalize
 * - pick helpers
 * - image url normalize + candidates
 * - render: avatar / logo / service / exp / photo wall
 * ================================ */

function cleanKey_(k){
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "")
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "")
    .trim();
}

function buildNormalizedPayload_(obj){
  if(!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  const lower = Object.create(null);

  for(const k of Object.keys(obj)){
    const nk = cleanKey_(k);
    if(!nk) continue;

    const v = obj[k];
    if(out[nk]==null || text(out[nk])==="") out[nk]=v;
    lower[nk.toLowerCase()] = v;
  }

  out.__lower = lower;
  return out;
}

function pick(p, keys){
  if(!p) return "";
  const lower = p.__lower || null;

  for(const k of keys){
    const kk = cleanKey_(k);
    const v1 = p[kk];
    if(v1!=null && text(v1)!=="") return v1;

    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2!=null && text(v2)!=="") return v2;
    }
  }
  return "";
}

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4,"0");
  if(/^TW\d{1,4}$/.test(v)){
    const n = v.replace(/^TW/i,"");
    return "TW" + n.padStart(4,"0");
  }
  return v;
}

function normalizeImageUrl(raw){
  if(!raw) return "";
  let url = String(raw).trim();
  if(!url) return "";
  if(url.startsWith("http://")) url = "https://" + url.slice(7);

  if(url.includes("dropbox.com")){
    url = url.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mFile[1])}`;

  const mId = url.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mId[1])}`;

  const mThumb = url.match(/thumbnail\?id=([^&]+)/i);
  if(mThumb && mThumb[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mThumb[1])}`;

  return url;
}

function buildImageCandidates_(raw){
  const s = text(raw);
  if(!s) return [];
  const original = s.startsWith("http://") ? "https://" + s.slice(7) : s;

  if(original.includes("dropbox.com")) return [normalizeImageUrl(original)];

  let driveId = "";
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const mId = original.match(/(?:\?|&)id=([^&]+)/i);
  const mThumb = original.match(/thumbnail\?id=([^&]+)/i);
  if(mFile && mFile[1]) driveId = mFile[1];
  else if(mId && mId[1]) driveId = mId[1];
  else if(mThumb && mThumb[1]) driveId = mThumb[1];

  if(driveId){
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
      normalizeImageUrl(original)
    ].filter(Boolean);
  }
  return [normalizeImageUrl(original)].filter(Boolean);
}

function setImgWithFallback_(imgEl, candidates){
  if(!imgEl) return;

  const list = (candidates||[]).map(text).filter(Boolean);
  if(!list.length){ imgEl.removeAttribute("src"); return; }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;

  let idx = 0;
  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "eager";

  const tryNext = () => {
    if(imgEl.dataset.loadToken !== token) return;
    if(idx >= list.length){ imgEl.removeAttribute("src"); return; }

    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onerror = () => tryNext();
  tryNext();
}

async function fetchWithTimeout(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);

  try{
    const res = await fetch(url, { method:"GET", cache:"no-store", redirect:"follow", signal: controller.signal });
    const txt = await res.text();
    const body = (txt||"").trim();
    if(!body) throw new Error("Empty response");

    try{
      return JSON.parse(body);
    }catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
  }finally{
    clearTimeout(t);
  }
}

async function fetchJsonRobust(url){
  let last = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{
      return await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT_MS);
    }catch(e){
      last = e;
      warn("retry", i, e && e.message ? e.message : e);
      await new Promise(r=>setTimeout(r, 520 + i*520));
    }
  }
  throw last || new Error("Fetch failed");
}

/* ---------- blocks helpers ---------- */

function setBlockHtml_(blockId, title, bodyText){
  const el = $(blockId);
  if(!el) return;
  const v = text(bodyText);
  if(!v){
    el.innerHTML = "";
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  el.innerHTML = `
    <div class="block-title">${title}</div>
    <div class="block-body preline">${escapeHtml_(v)}</div>
  `;
}

function escapeHtml_(s){
  return String(s ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

/* ---------- photo wall ---------- */

function parsePhotoList_(p){
  // accept: photos_img / photos / photo1.. / 圖片1.. etc.
  const raw = pick(p, ["photos_img","photos","相片","照片","圖片"]);
  const list = [];

  const pushOne = (v)=>{
    const s = text(v);
    if(!s) return;
    // allow multi by newline or comma
    const parts = s.split(/\n|,|，/).map(x=>text(x)).filter(Boolean);
    parts.forEach(u=>list.push(u));
  };

  if(text(raw)) pushOne(raw);

  // try numbered fields (most robust)
  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    const v = pick(p, [
      `photos_${i}`, `photo_${i}`, `photo${i}`, `photos${i}`, `照片${i}`, `相片${i}`, `圖片${i}`, `image${i}`
    ]);
    if(text(v)) pushOne(v);
  }

  // de-dup
  const seen = new Set();
  return list
    .map(u=>normalizeImageUrl(u))
    .filter(u=>{
      if(!u) return false;
      const key = u.trim();
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, CONFIG.PHOTO_SLOT_MAX);
}

function renderPhotoWall_(p){
  const grid = $("photoGrid");
  const wall = $("photoWall");
  if(!grid || !wall) return;

  const photos = parsePhotoList_(p);
  if(!photos.length){
    grid.innerHTML = "";
    wall.style.display = "none";
    return;
  }

  wall.style.display = "";
  grid.innerHTML = "";

  photos.forEach((u)=>{
    const img = document.createElement("img");
    img.alt = "photo";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = u;
    img.addEventListener("click", ()=> openLightbox_(u));
    grid.appendChild(img);
  });
}

function ensureLightbox_(){
  if($("lightbox")) return;

  const lb = document.createElement("div");
  lb.id = "lightbox";
  lb.style.position = "fixed";
  lb.style.inset = "0";
  lb.style.background = "rgba(0,0,0,0.78)";
  lb.style.display = "none";
  lb.style.alignItems = "center";
  lb.style.justifyContent = "center";
  lb.style.zIndex = "999999";

  const img = document.createElement("img");
  img.id = "lightboxImg";
  img.style.maxWidth = "92vw";
  img.style.maxHeight = "92vh";
  img.style.objectFit = "contain";
  img.style.borderRadius = "16px";
  img.style.boxShadow = "0 24px 60px rgba(0,0,0,0.35)";
  img.referrerPolicy = "no-referrer";

  lb.appendChild(img);
  lb.addEventListener("click", ()=>{ lb.style.display = "none"; });

  document.body.appendChild(lb);
}

function openLightbox_(url){
  ensureLightbox_();
  const lb = $("lightbox");
  const img = $("lightboxImg");
  if(!lb || !img) return;
  img.src = url;
  lb.style.display = "flex";
}

/* ---------- logo/avatar ---------- */

function applyAvatar_(p){
  const avatarEl = $("u-img");
  if(!avatarEl) return;

  const raw = pick(p, [
    "個人照_fast","個人照",
    "形象照_fast","形象照",
    "avatar_fast","avatar",
    "photo_fast","photo","image"
  ]);

  const candidates = buildImageCandidates_(raw);
  if(candidates.length){
    setImgWithFallback_(avatarEl, candidates);
  }else{
    avatarEl.removeAttribute("src");
  }
}

function applyLogo_(p){
  const logoRaw = pick(p, ["logo_fast","logo","Logo","LOGO","品牌logo","品牌Logo","商標"]);

  const freeWrap = $("logoWrapFree");
  const premWrap = $("logoWrapPremium");
  const freeImg = $("u-logo");
  const premImg = $("u-logo-premium");

  const has = !!text(logoRaw);

  if(freeWrap) freeWrap.style.display = has ? "flex" : "none";
  if(premWrap) premWrap.style.display = (state.mode === "premium" && has) ? "block" : "none";

  if(has){
    const cands = buildImageCandidates_(logoRaw);
    if(freeImg) setImgWithFallback_(freeImg, cands);
    if(premImg) setImgWithFallback_(premImg, cands);
  }else{
    if(freeImg) freeImg.removeAttribute("src");
    if(premImg) premImg.removeAttribute("src");
  }
}/* ================================
 * app.js (v399.x) 3/3
 * - render fields (free/premium)
 * - docks: platform vs contact (strict order)
 * - banner unit injection
 * - copy share / copy card url
 * - admin triple tap
 * - boot
 * ================================ */

function setEmptyHide_(id, value){
  const el = $(id);
  if(!el) return;
  const v = text(value);
  if(!v){
    el.textContent = "";
    el.style.display = "none";
  }else{
    el.textContent = v;
    el.style.display = "";
  }
}

function applyNames_(p){
  const name = text(pick(p, ["姓名","name","Name"]));
  setEmptyHide_("u-name", name || "");               // free stack uses #u-name
  setEmptyHide_("u-name-premium", name || "");       // premium header uses #u-name-premium
}

function applyTitle_(p){
  // title (頭銜) — free uses #u-title, premium uses #u-slogan as title line (we keep id stable)
  const title = text(pick(p, ["頭銜","職稱","title","Title","position","Position"]));
  setEmptyHide_("u-title", title || "");

  // premium needs unit + title in meta blocks: we will place unit in #u-unit and title in #u-slogan if slogan empty
  // but we also support "標語/一句話" in slogan.
}

function applyUnitAndSlogan_(p){
  const unit = text(pick(p, ["單位","公司","機構","unit","Unit","company","Company","organization"]));
  const slogan = text(pick(p, ["一句話","標語","slogan","Slogan","簡介","intro","Intro","自我介紹","介紹"]));
  const title = text(pick(p, ["頭銜","職稱","title","Title","position","Position"]));

  // ✅ Free: unit goes into banner center
  const bannerUnitEl = $("u-unit-banner");
  if(bannerUnitEl){
    bannerUnitEl.textContent = unit || "";
    bannerUnitEl.style.display = unit ? "" : "none";
  }

  // Free: hide #u-unit always (CSS already hides)
  // Premium: show unit in #u-unit
  if(state.mode === "premium"){
    setEmptyHide_("u-unit", unit || "");
  }else{
    setEmptyHide_("u-unit", "");
  }

  // Decide what goes to slogan area:
  // - Premium: use slogan if provided; else use title as a gentle line (so unit/title/service don't squeeze)
  // - Free: keep slogan if provided; else hide
  if(state.mode === "premium"){
    setEmptyHide_("u-slogan", slogan || title || "");
  }else{
    setEmptyHide_("u-slogan", slogan || "");
  }
}

function applyServiceExp_(p){
  // Service item (經營項目/服務項目)
  const service = text(pick(p, ["服務項目","經營項目","服務","service","Service","業務","business"]));
  const exp = text(pick(p, ["經歷","簡歷","experience","Experience","資歷","背景","bio"]));

  setBlockHtml_("block-service", "服務項目", service);
  setBlockHtml_("block-exp", "經歷", exp);
}

/* ---------- platform/contact split + strict order ---------- */

function isUrl_(s){
  const v = text(s);
  return /^https?:\/\//i.test(v) || /^www\./i.test(v);
}

function normalizeWebUrl_(s){
  const v = text(s);
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}

function makeBtn_(iconClass, label, onClick){
  const btn = document.createElement("button");
  btn.className = "dock-btn";
  btn.type = "button";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  btn.addEventListener("click", onClick);
  return btn;
}

function openUrl_(url){
  const u = normalizeWebUrl_(url);
  if(!u) return;
  window.open(u, "_blank", "noopener,noreferrer");
}

function copyText_(s){
  const v = text(s);
  if(!v) return false;
  // clipboard best-effort
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(v).then(()=>alert("✅ 已複製連結")).catch(()=>fallbackCopy_(v));
    return true;
  }
  fallbackCopy_(v);
  return true;
}

function fallbackCopy_(v){
  const ta = document.createElement("textarea");
  ta.value = v;
  ta.setAttribute("readonly","readonly");
  ta.style.position="fixed";
  ta.style.left="-9999px";
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand("copy"); }catch{}
  document.body.removeChild(ta);
  alert("✅ 已複製連結");
}

function projectBase_(){
  try{
    const u = new URL(location.href);
    u.hash = "";
    u.search = "";
    const p = u.pathname;
    const dir = p.endsWith("/") ? p : p.substring(0, p.lastIndexOf("/") + 1);
    return u.origin + dir;
  }catch{
    return location.origin + "/";
  }
}
function buildCardUrl_(id){
  return projectBase_() + "index.html?id=" + encodeURIComponent(id);
}
function buildShareUrl_(id){
  return projectBase_() + "share.html?id=" + encodeURIComponent(id);
}

/* ✅ named export for your button */
window.copyCardUrl = function(){
  const id = __resolvedId || CONFIG.DEFAULT_ID;
  copyText_(buildShareUrl_(id));
};

window.goFillForm = function(){
  // keep your existing behavior if you had a form; fallback: copy share url
  const id = __resolvedId || CONFIG.DEFAULT_ID;
  copyText_(buildShareUrl_(id));
};

function renderPlatformDock_(p){
  const wrap = $("platformDock");
  const box = $("platformButtons");
  if(!wrap || !box) return;

  box.innerHTML = "";

  // platform candidates (影音/社群/個人網頁)
  const yt = pick(p, ["YouTube","youtube","YT","yt","影音平台","影片","頻道"]);
  const ig = pick(p, ["Instagram","instagram","IG","ig"]);
  const fb = pick(p, ["Facebook","facebook","FB","fb"]);
  const tt = pick(p, ["TikTok","tiktok","抖音","Douyin","douyin"]);
  const web = pick(p, ["個人網頁","官網","網站","website","Website","web","Web"]);

  const add = (icon,label,url)=>{
    const u = text(url);
    if(!u) return;
    box.appendChild(makeBtn_(icon, label, ()=>openUrl_(u)));
  };

  add("fa-brands fa-youtube", "YouTube", yt);
  add("fa-brands fa-instagram", "Instagram", ig);
  add("fa-brands fa-facebook", "Facebook", fb);
  add("fa-brands fa-tiktok", "TikTok", tt);
  add("fa-solid fa-globe", "個人網頁", web);

  wrap.style.display = box.children.length ? "" : "none";
}

function renderContactDock_(p){
  const wrap = $("contactDock");
  const box = $("contactButtons");
  if(!wrap || !box) return;

  box.innerHTML = "";

  // ✅ strict order:
  // line官網、line、微信、電話、Email、導航
  const lineOfficial = pick(p, ["line官網","LINE官網","line_official","lineOfficial","lineOA","LINE OA","官方line","官方LINE","Line@","LINE@"]);
  const line = pick(p, ["line","LINE","Line","line_id","LINE ID","lineId"]);
  const wechat = pick(p, ["微信","WeChat","wechat","Wechat","weixin","微信號","微信ID"]);
  const phone = pick(p, ["電話","手機","phone","Phone","tel","Tel"]);
  const email = pick(p, ["Email","email","E-mail","mail","Mail","電子郵件","信箱"]);
  const addr = pick(p, ["地址","住址","location","Location","address","Address"]);

  // helpers
  const addBtn = (btn)=>{ if(btn) box.appendChild(btn); };

  // line官網 (usually URL)
  if(text(lineOfficial)){
    if(isUrl_(lineOfficial)){
      addBtn(makeBtn_("fa-brands fa-line", "LINE官網", ()=>openUrl_(lineOfficial)));
    }else{
      // if not url, treat as line OA id, copy it
      addBtn(makeBtn_("fa-brands fa-line", "LINE官網", ()=>copyText_(text(lineOfficial))));
    }
  }

  // line (id) -> copy
  if(text(line)){
    addBtn(makeBtn_("fa-brands fa-line", "LINE", ()=>copyText_(text(line))));
  }

  // wechat -> copy
  if(text(wechat)){
    addBtn(makeBtn_("fa-brands fa-weixin", "微信", ()=>copyText_(text(wechat))));
  }

  // phone -> tel
  if(text(phone)){
    const pnum = text(phone).replace(/\s+/g,"");
    addBtn(makeBtn_("fa-solid fa-phone", "電話", ()=>{ location.href = "tel:" + encodeURIComponent(pnum); }));
  }

  // email -> mailto
  if(text(email)){
    const em = text(email);
    addBtn(makeBtn_("fa-solid fa-envelope", "Email", ()=>{ location.href = "mailto:" + encodeURIComponent(em); }));
  }

  // navigation
  if(text(addr)){
    const q = encodeURIComponent(text(addr));
    const nav = `https://www.google.com/maps/search/?api=1&query=${q}`;
    addBtn(makeBtn_("fa-solid fa-location-dot", "導航", ()=>openUrl_(nav)));
  }

  // keep dock visible even if contactButtons empty? -> hide for balance
  wrap.style.display = box.children.length ? "" : "none";
}

/* ---------- Admin triple tap hotspot ---------- */

function setupAdminHotspot_(){
  const hs = $("adminHotspotTop");
  if(!hs) return;

  let count = 0;
  let timer = null;

  const hit = ()=>{
    count++;
    if(timer) clearTimeout(timer);
    timer = setTimeout(()=>{ count = 0; }, 650);

    if(count >= 3){
      count = 0;
      const id = __resolvedId || CONFIG.DEFAULT_ID;
      location.href = "./admin.html?id=" + encodeURIComponent(id);
    }
  };

  hs.addEventListener("click", hit, { passive:true });
}

/* ---------- Load card ---------- */

async function loadCardById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __lastLoad = { id: cid, url, ts: Date.now() };

  // minimal "loading"
  setText("u-name", "載入中...");
  setText("u-name-premium", "載入中...");

  await waitForDom_(["u-name","u-name-premium","u-img"], 2600);

  try{
    const data = await fetchJsonRobust(url);
    if(!data || typeof data !== "object") throw new Error("Invalid payload");
    if(data.ok === false) throw new Error(data.error || "Not found");

    const p = buildNormalizedPayload_(data);

    // 1) avatar/logo
    applyAvatar_(p);
    applyLogo_(p);

    // 2) names/title/unit/slogan
    applyNames_(p);
    applyTitle_(p);
    applyUnitAndSlogan_(p);

    // 3) service/exp
    applyServiceExp_(p);

    // 4) photos carousel wall
    renderPhotoWall_(p);

    // 5) platform & contact docks
    renderPlatformDock_(p);
    renderContactDock_(p);

    // 6) premium logo visibility depends on mode
    // (applyLogo already toggles; but ensure premium wrap hidden in free)
    const premWrap = $("logoWrapPremium");
    if(premWrap && state.mode !== "premium") premWrap.style.display = "none";

    // 7) update version tag
    const vt = $("versionTag");
    if(vt) vt.textContent = "v" + CONFIG.VERSION;

  }catch(e){
    warn(e);
    setText("u-name", "載入失敗");
    setText("u-name-premium", "載入失敗");
  }
}

/* ---------- Boot ---------- */

function getIdFromUrl_(){
  try{
    const u = new URL(location.href);
    const id = u.searchParams.get("id");
    const nid = normalizeId_(id);
    return /^TW\d{4}$/.test(nid) ? nid : "";
  }catch{ return ""; }
}

function initDefaultMode_(){
  // default: free color-1 + arch + paper-1
  applyModeClass_();
  markPlanButtons_();
  markDotsActive_("free", state.freeColor);
  markStyleButtons_(state.style);
  markPaperButtons_(state.paper);
}

async function boot(){
  setupAdminHotspot_();
  initDefaultMode_();

  const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
  await loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot, { once:true });