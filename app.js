/* ================================
 * app.js (v403-dev COMPLETE OVERWRITE - NO SW)
 * - Dev-friendly: NO service worker register
 * - One-time cleanup: unregister old SW + clear caches
 * - Keep: robust fetch + payload normalize + photo wall + docks
 * - Keep: Admin Workspace (triple tap BR) + OG Preview + Share
 * ================================ */

/* ---------- DEV: remove old SW once ---------- */
(async function removeOldSwOnce_(){
  try{
    const key = "HSC_SW_REMOVED_ONCE";
    if (localStorage.getItem(key) === "1") return;

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        try { await r.unregister(); } catch {}
      }
    }
    if (window.caches) {
      const keys = await caches.keys();
      for (const k of keys) {
        try { await caches.delete(k); } catch {}
      }
    }

    localStorage.setItem(key, "1");
    console.log("✅ Old SW unregistered + caches cleared (one-time).");
  }catch(e){
    console.warn("SW cleanup skipped:", e);
  }
})();

/* ================================
 * Happiness Smart Card System
 * app.js v403-dev (NO SW)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v403-dev",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  // OG fallback image
  OG_FALLBACK_IMG: "og-card.png"
};

let currentRow = null;
let __resolvedId = CONFIG.DEFAULT_ID;

/* ---------- DOM ---------- */
function qs(id){ return document.getElementById(id); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

/* ---------- Text / Key normalize ---------- */
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

/* ---------- ID ---------- */
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

function getIdFromUrl_(){
  try{
    const sp = new URLSearchParams(location.search);
    return sp.get("id") || sp.get("cid") || "";
  }catch{
    return "";
  }
}

function setUrlId_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  try{
    const u = new URL(location.href);
    u.searchParams.set("id", cid);
    history.replaceState({}, "", u.toString());
  }catch{}
}

/* ---------- Fetch (robust) ---------- */
function safeJsonParse_(rawText){
  let s = String(rawText||"").trim();
  if(!s) return null;
  s = s.replace(/^\)\]\}'\s*\n?/, "").trim(); // XSSI guard
  try{ return JSON.parse(s); }catch{}
  const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if(m){
    try{ return JSON.parse(m[0]); }catch{}
  }
  return null;
}

async function fetchWithTimeout_(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", cache:"no-store", redirect:"follow", signal: controller.signal });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if(!json) throw new Error("Not JSON");
    return json;
  }finally{
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url){
  let last = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{
      return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS);
    }catch(e){
      last = e;
      await new Promise(r=>setTimeout(r, 520 + i*520));
    }
  }
  throw last || new Error("Fetch failed");
}

/* ---------- URL / Images (Drive 超容錯) ---------- */
function isUrl_(s){ return /^https?:\/\//i.test(String(s||"").trim()); }

function normalizeUrl_(s){
  let v = String(s||"").trim();
  if(!v) return "";
  if(v.startsWith("http://")) v = "https://" + v.slice(7);
  if(isUrl_(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}

function driveIdFromUrl_(u){
  const s = String(u||"").trim();
  if(!s) return "";
  const mFile = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return mFile[1];
  const mUc = s.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
  if(mUc && mUc[1]) return decodeURIComponent(mUc[1]);
  const mThumb = s.match(/thumbnail\?id=([^&]+)/i);
  if(mThumb && mThumb[1]) return decodeURIComponent(mThumb[1]);
  const mId = s.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return decodeURIComponent(mId[1]);
  return "";
}

function normalizeImageUrl_(raw){
  let url = normalizeUrl_(raw);
  if(!url) return "";

  // Dropbox
  if(url.includes("dropbox.com")){
    url = url.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }

  // Google Drive: 統一轉成可顯示連結
  const did = driveIdFromUrl_(url);
  if(did) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(did)}`;
  return url;
}

function buildImgCandidates_(raw){
  const s = text(raw);
  if(!s) return [];

  const did = driveIdFromUrl_(s);
  if(did){
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(did)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(did)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(did)}`,
      normalizeUrl_(s)
    ].filter(Boolean);
  }

  return [normalizeImageUrl_(s)].filter(Boolean);
}

function setImgWithFallback_(imgEl, candidates){
  const list = (candidates || []).filter(Boolean);
  if(!imgEl || !list.length) return;

  let idx = 0;

  imgEl.referrerPolicy = "no-referrer";

  const tryNext = ()=>{
    idx++;
    if(idx >= list.length) return;
    imgEl.src = list[idx] + (list[idx].includes("?") ? "&" : "?") + "t=" + Date.now();
  };

  imgEl.onerror = tryNext;
  imgEl.src = list[0] + (list[0].includes("?") ? "&" : "?") + "t=" + Date.now();
}

/* ---------- UI helpers: active by group ---------- */
function setActiveInGroup_(group, el){
  if(!group) return;
  qsa(`[data-group="${group}"]`).forEach(x=>x.classList.remove("active"));
  if(el) el.classList.add("active");
}

/* ---------- State (match your HTML class system) ---------- */
const STATE = {
  mode: "free",         // free | premium
  color: "color-1",     // free: color-1..5
  style: "arch",        // free: arch/flat/spot
  paper: "paper-1",     // free: paper-1..3
  premium: "p1"         // premium: p1..p7
};

function applyModeUi_(){
  const freeBlock = qs("free-controls");
  const premBlock = qs("premium-controls");
  const banner = qs("banner");
  const paperOverlay = qs("paperOverlay");
  const premBadge = qs("premiumBadge");

  if(STATE.mode === "free"){
    if(freeBlock) freeBlock.style.display = "";
    if(premBlock) premBlock.style.display = "none";
    if(banner) banner.style.display = "";
    if(paperOverlay) paperOverlay.style.display = "";
    if(premBadge) premBadge.style.display = "none";
  }else{
    if(freeBlock) freeBlock.style.display = "none";
    if(premBlock) premBlock.style.display = "";
    if(banner) banner.style.display = "none";
    if(paperOverlay) paperOverlay.style.display = "none";
    if(premBadge) premBadge.style.display = ""; // ✅ 修正：Premium 要顯示 badge
  }
}

function applyBodyClasses_(){
  const b = document.body;

  [
    "mode-free","mode-premium",
    "color-1","color-2","color-3","color-4","color-5",
    "style-arch","style-flat","style-spot",
    "paper-1","paper-2","paper-3",
    "p1","p2","p3","p4","p5","p6","p7"
  ].forEach(c=>b.classList.remove(c));

  if(STATE.mode === "free"){
    b.classList.add("mode-free", STATE.color, "style-" + STATE.style, STATE.paper);
  }else{
    b.classList.add("mode-premium", STATE.premium);
  }

  applyModeUi_();
}

/* ---------- Exposed APIs (HTML calls these) ---------- */
function setPlan(mode, el){
  STATE.mode = (mode === "premium") ? "premium" : "free";
  setActiveInGroup_("plan", el);
  applyBodyClasses_();

  const btnFree = qs("btnPlanFree");
  const btnPrem = qs("btnPlanPremium");
  if(btnFree && btnPrem){
    btnFree.classList.toggle("breathe", STATE.mode === "free");
    btnPrem.classList.toggle("breathe", STATE.mode === "premium");
  }
}

function setTheme(theme, el){
  if(String(theme||"").startsWith("p")){
    STATE.mode = "premium";
    STATE.premium = theme;
    setActiveInGroup_("theme", el);
  }else{
    STATE.mode = "free";
    STATE.color = theme;
    setActiveInGroup_("theme", el);
  }
  applyBodyClasses_();

  const btnFree = qs("btnPlanFree");
  const btnPrem = qs("btnPlanPremium");
  if(btnFree && btnPrem){
    btnFree.classList.toggle("active", STATE.mode === "free");
    btnPrem.classList.toggle("active", STATE.mode === "premium");
  }
}

function setStyle(style, el){
  STATE.mode = "free";
  STATE.style = style;
  setActiveInGroup_("style", el);
  applyBodyClasses_();

  const btnFree = qs("btnPlanFree");
  const btnPrem = qs("btnPlanPremium");
  if(btnFree && btnPrem){
    btnFree.classList.add("active");
    btnPrem.classList.remove("active");
  }
}

function setPaper(paper, el){
  STATE.mode = "free";
  STATE.paper = paper;
  setActiveInGroup_("paper", el);
  applyBodyClasses_();

  const btnFree = qs("btnPlanFree");
  const btnPrem = qs("btnPlanPremium");
  if(btnFree && btnPrem){
    btnFree.classList.add("active");
    btnPrem.classList.remove("active");
  }
}

/* CTA */
function goFillForm(){
  window.open(CONFIG.FORM, "_blank");
}

/* ---------- misc helpers ---------- */
function safeSetText_(id, val){
  const el = qs(id);
  if(!el) return;
  el.textContent = text(val);
}

function escapeHtml_(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function openUrl_(url){
  const u = normalizeUrl_(url);
  if(!u) return;
  window.open(u, "_blank");
}

function openMapByAddress_(addr){
  const a = text(addr);
  if(!a) return;
  const q = encodeURIComponent(a);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

function classifyDockClass_(url){
  const u = String(url||"").toLowerCase();
  if(u.includes("youtube.com") || u.includes("youtu.be")) return "dock-yt";
  if(u.includes("facebook.com") || u.includes("fb.com")) return "dock-fb";
  if(u.includes("instagram.com")) return "dock-ig";
  if(u.includes("line.me") || u.includes("lin.ee")) return "dock-line";
  if(u.includes("google.com/maps") || u.includes("maps.app")) return "dock-map";
  return "dock-web";
}
/* ================================
 * app.js (v403-dev) 2/3
 * - Render Card (logo/avatar/blocks/docks)
 * - Photo Wall (thumb + lightbox)
 * ================================ */

/* ---------- Logo ---------- */
function renderLogo_(p){
  const logoUrl = pick(p, ["Logo_fast","Logo","logo_fast","logo","logo_img"]);
  const wrap = qs("logoWrap");
  const img  = qs("u-logo");
  if(!wrap || !img) return;

  const u = normalizeImageUrl_(logoUrl);
  if(!u){
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }

  wrap.style.display = "flex";
  img.style.borderRadius = "999px";
  img.style.objectFit = "cover";

  img.onload = ()=>{ wrap.style.display = "flex"; };
  img.onerror = ()=>{ wrap.style.display = "none"; };

  setImgWithFallback_(img, buildImgCandidates_(u));
}

/* ---------- Avatar ---------- */
function renderAvatar_(p){
  const avatarRaw = pick(p, ["個人照_fast","個人照","avatar_fast","avatar","形象照","photo"]);
  const img = qs("u-img");
  if(!img) return;

  const u = normalizeImageUrl_(avatarRaw);
  if(!u){
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, buildImgCandidates_(u));
}

/* ---------- Blocks ---------- */
function renderBlocks_(p){
  const service = pick(p, ["服務項目","service","services"]);
  const exp     = pick(p, ["經歷","experience","exp"]);

  const b1 = qs("block-service");
  const b2 = qs("block-exp");

  if(b1){
    if(text(service)){
      b1.style.display = "";
      b1.innerHTML = `
        <div class="block-title">服務項目</div>
        <div class="block-body preline">${escapeHtml_(service)}</div>
      `;
    }else{
      b1.style.display = "none";
      b1.innerHTML = "";
    }
  }

  if(b2){
    if(text(exp)){
      b2.style.display = "";
      b2.innerHTML = `
        <div class="block-title">經歷</div>
        <div class="block-body preline">${escapeHtml_(exp)}</div>
      `;
    }else{
      b2.style.display = "none";
      b2.innerHTML = "";
    }
  }
}

/* ---------- Dock buttons ---------- */
function buildDockBtn_({label, icon, onClick, extraClass}){
  const b = document.createElement("button");
  b.className = "dock-btn" + (extraClass ? (" " + extraClass) : "");
  b.type = "button";
  b.innerHTML = `<i class="${icon}"></i><span>${escapeHtml_(label)}</span>`;
  b.addEventListener("click", onClick);
  return b;
}

function applyWideRule_(container){
  if(!container) return;
  const btns = Array.from(container.querySelectorAll(".dock-btn"));
  btns.forEach(b=>b.classList.remove("wide"));
  if(btns.length % 2 === 1){
    btns[btns.length - 1].classList.add("wide");
  }
}

function renderDocks_(p){
  const mediaDock = qs("mediaDock");
  const mediaBtns = qs("mediaButtons");
  const cDock     = qs("contactDock");
  const cBtns     = qs("contactButtons");

  if(mediaBtns) mediaBtns.innerHTML = "";
  if(cBtns) cBtns.innerHTML = "";

  /* ---- Media: 影音/平台 ---- */
  const mediaItems = [
    { k:["影音平台1","影音1"], label:"影音平台", icon:"fa-solid fa-play" },
    { k:["影音平台2","影音2"], label:"平台2", icon:"fa-solid fa-globe" },
    { k:["影音平台3","影音3"], label:"平台3", icon:"fa-solid fa-circle-play" },
    { k:["社群平台1","社群1"], label:"社群1", icon:"fa-solid fa-users" },
    { k:["社群平台2","社群2"], label:"社群2", icon:"fa-solid fa-users" },
    { k:["社群平台3","社群3"], label:"社群3", icon:"fa-solid fa-users" }
  ];

  let hasMedia = false;
  mediaItems.forEach(it=>{
    const v = pick(p, it.k);
    if(!text(v)) return;
    hasMedia = true;

    const cls = classifyDockClass_(v);
    if(mediaBtns){
      mediaBtns.appendChild(buildDockBtn_({
        label: it.label,
        icon: it.icon,
        extraClass: cls,
        onClick: ()=> openUrl_(v)
      }));
    }
  });

  if(mediaDock) mediaDock.style.display = hasMedia ? "" : "none";
  applyWideRule_(mediaBtns);

  /* ---- Contact: LINE/微信/電話/Email/地址 ---- */
  const phone   = pick(p, ["電話","phone","mobile"]);
  const email   = pick(p, ["Email","email","信箱"]);
  const lineOA  = pick(p, ["LINE官方帳號","line_oa","line官網","LINE官網"]);
  const lineLink= pick(p, ["LINE連結","line_link","line"]);
  const wechat  = pick(p, ["微信","wechat","wechat_id"]);
  const address = pick(p, ["地址","address"]);

  const contactList = [];

  if(text(lineOA)){
    contactList.push({ label:"LINE 官網", icon:"fa-brands fa-line", cls:"dock-line", action: ()=> openUrl_(lineOA) });
  }

  if(text(wechat)){
    contactList.push({
      label:"微信ID",
      icon:"fa-brands fa-weixin",
      cls:"dock-web",
      action: async ()=>{
        try{
          if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(text(wechat));
        }catch{}
        alert("✅ 已複製微信ID");
      }
    });
  }

  if(text(phone)){
    contactList.push({ label:"電話", icon:"fa-solid fa-phone", cls:"dock-web", action: ()=> { location.href = `tel:${text(phone)}`; } });
  }

  if(text(email)){
    contactList.push({ label:"Email", icon:"fa-solid fa-envelope", cls:"dock-web", action: ()=> { location.href = `mailto:${text(email)}`; } });
  }

  if(text(address)){
    contactList.push({ label:"地址導航", icon:"fa-solid fa-location-dot", cls:"dock-map", action: ()=> openMapByAddress_(address) });
  }

  if(text(lineLink) && !text(lineOA)){
    contactList.push({ label:"LINE", icon:"fa-brands fa-line", cls:"dock-line", action: ()=> openUrl_(lineLink) });
  }

  let hasContact = false;
  contactList.forEach(x=>{
    hasContact = true;
    if(cBtns){
      cBtns.appendChild(buildDockBtn_({
        label:x.label, icon:x.icon, extraClass:x.cls, onClick:x.action
      }));
    }
  });

  if(cDock) cDock.style.display = hasContact ? "" : "none";
  applyWideRule_(cBtns);
}

/* ---------- Main render ---------- */
function renderCard(row){
  const p = buildNormalizedPayload_(row || {});
  currentRow = p;

  const name  = pick(p, ["姓名","name"]);
  const unit  = pick(p, ["單位","unit"]);
  const title = pick(p, ["頭銜","職稱","title"]);

  safeSetText_("u-name", name || "未命名");
  safeSetText_("u-unit", unit);
  safeSetText_("u-title", title);

  const slogan = pick(p, ["理念標語","slogan","簡介","一句話","引言"]);
  const sEl = qs("u-slogan");
  if(sEl){
    if(text(slogan)){
      sEl.style.display = "";
      sEl.textContent = text(slogan);
    }else{
      sEl.style.display = "none";
      sEl.textContent = "";
    }
  }

  renderAvatar_(p);
  renderLogo_(p);
  renderBlocks_(p);
  renderDocks_(p);

  const vt = qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;
}

/* ---------- LINE CTA (needs payload) ---------- */
function goLineIntro(){
  const p = currentRow || null;
  if(!p){
    alert("⏳ 名片資料載入中，請稍等一下再點 LINE 官網。");
    return;
  }
  const lineOA  = pick(p, ["LINE官方帳號","line_oa","line官網","LINE官網"]);
  const lineLink= pick(p, ["LINE連結","line_link","line"]);
  const url = text(lineOA) ? lineOA : lineLink;

  if(!text(url)){
    alert("⚠️ 這張名片尚未提供 LINE 官網連結");
    return;
  }
  openUrl_(url);
}

/* ---------- Payload shape compat ---------- */
function extractRowFromPayload_(data){
  if(!data || typeof data !== "object") return null;
  if(data.data && typeof data.data === "object") return data.data;
  if(data.row && typeof data.row === "object") return data.row;
  if(data.id || data["姓名"] || data.name) return data;
  return null;
}
/* ================================
 * app.js (v403-dev) 3/3
 * - Photo Wall (dynamic) + Lightbox
 * - Share
 * - Admin Workspace (triple tap BR) + OG Preview (canvas)
 * - Boot (no SW)
 * ================================ */

/* ---------- Photo collect ---------- */
function collectPhotoUrls_(p){
  let urls = [];

  if(Array.isArray(p.photos)) urls = urls.concat(p.photos);
  if(Array.isArray(p.photos_full)) urls = urls.concat(p.photos_full);

  const bulk = pick(p, ["照片_fast","照片","photos_img","photos","photo_wall"]);
  if(text(bulk)){
    urls = urls.concat(
      String(bulk)
        .split(/[\n,，;]/g)
        .map(s => s.trim())
        .filter(Boolean)
    );
  }

  for(let i=1;i<=12;i++){
    const v = pick(p, [`photo${i}`,`photo_${i}`,`照片${i}`,`相片${i}`]);
    if(text(v)) urls.push(v);
  }

  const seen = new Set();
  const out = [];
  urls.forEach(u=>{
    const nu = normalizeImageUrl_(u);
    if(!nu) return;
    if(seen.has(nu)) return;
    seen.add(nu);
    out.push(nu);
  });

  return out;
}

/* ---------- Lightbox ---------- */
function ensureLightbox_(){
  if(qs("lightboxOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "lightboxOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:999999;
    background:rgba(0,0,0,0.82);
    display:none; align-items:center; justify-content:center;
    padding:16px;
  `;

  const img = document.createElement("img");
  img.id = "lightboxImg";
  img.style.cssText = `
    max-width:100%;
    max-height:100%;
    object-fit:contain;
    border-radius:16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
    background: rgba(255,255,255,0.06);
  `;

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "✕";
  close.style.cssText = `
    position:absolute; top:14px; right:14px;
    width:42px; height:42px; border-radius:999px;
    border:none; cursor:pointer;
    background:rgba(255,255,255,0.18);
    color:#fff; font-size:20px; font-weight:900;
    backdrop-filter: blur(8px);
  `;

  overlay.appendChild(img);
  overlay.appendChild(close);
  document.body.appendChild(overlay);

  function hide(){
    overlay.style.display = "none";
    img.removeAttribute("src");
  }
  overlay.addEventListener("click",(e)=>{ if(e.target===overlay) hide(); });
  close.addEventListener("click", hide);
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") hide(); });
}

function openLightbox_(url){
  ensureLightbox_();
  const overlay = qs("lightboxOverlay");
  const img = qs("lightboxImg");
  if(!overlay || !img) return;

  setImgWithFallback_(img, buildImgCandidates_(url));
  overlay.style.display = "flex";
}

/* ---------- Photo wall dynamic balance ---------- */
function computeCols_(n){
  if(n <= 1) return 1;
  if(n === 2) return 2;
  if(n === 4) return 2;
  if(n % 3 === 1) return 2; // 7/10/13...
  return 3;
}

function renderPhotoWall_(row){
  const p = buildNormalizedPayload_(row || {});
  const wall = qs("photoWall");
  const grid = qs("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const urls = collectPhotoUrls_(p);

  if(!urls.length){
    wall.style.display = "none";
    return;
  }

  const cols = computeCols_(urls.length);
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0,1fr))`;

  urls.forEach(u=>{
    const img = document.createElement("img");
    img.className = "wall-img";
    img.alt = "照片";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    img.style.width = "100%";
    img.style.aspectRatio = "1 / 1";
    img.style.objectFit = "cover";

    setImgWithFallback_(img, buildImgCandidates_(u));
    img.addEventListener("click", ()=> openLightbox_(u));
    grid.appendChild(img);
  });

  wall.style.display = "";
}

/* ---------- Share card ---------- */
function getCardShareUrl_(){
  try{
    const u = new URL(location.href);
    u.searchParams.set("id", __resolvedId || CONFIG.DEFAULT_ID);
    return u.toString();
  }catch{
    return location.href;
  }
}

async function shareCard_(){
  const p = currentRow || null;
  const name = p ? (pick(p, ["姓名","name"]) || "幸福智慧名片") : "幸福智慧名片";
  const url = getCardShareUrl_();

  try{
    if(navigator.share){
      await navigator.share({ title: name, text: name, url });
      return;
    }
  }catch{}

  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(url);
      alert("✅ 已複製名片連結");
      return;
    }
  }catch{}

  prompt("複製名片連結：", url);
}

/* ---------- Admin Workspace modal (客戶展示模式) ---------- */
function ensureAdminModal_(){
  if(qs("adminModal")) return;

  const modal = document.createElement("div");
  modal.id = "adminModal";
  modal.style.cssText = `
    position:fixed; inset:0; z-index:1000000;
    display:none; align-items:flex-end; justify-content:center;
    background: rgba(0,0,0,0.55);
    padding: 14px;
  `;

  const sheet = document.createElement("div");
  sheet.id = "adminSheet";
  sheet.style.cssText = `
    width: min(560px, 100%);
    border-radius: 22px;
    background: rgba(255,255,255,0.92);
    box-shadow: 0 30px 90px rgba(0,0,0,0.32);
    border: 1px solid rgba(0,0,0,0.10);
    overflow:hidden;
    backdrop-filter: blur(10px);
  `;

  sheet.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 14px 10px;">
      <div style="font-weight:900; letter-spacing:.4px;">客戶展示模式｜交貨工作台</div>
      <button id="btnAdminClose" type="button" style="
        width:38px;height:38px;border-radius:999px;border:none;cursor:pointer;
        background:rgba(0,0,0,0.06); font-size:18px; font-weight:900;
      ">✕</button>
    </div>

    <div style="padding:0 14px 14px; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; gap:10px;">
        <input id="adminIdInput" placeholder="輸入序號（例 TW0008 或 8）" style="
          flex:1; padding:12px 12px; border-radius:14px;
          border:1px solid rgba(0,0,0,0.12); outline:none;
          font-weight:800;
        "/>
        <button id="btnAdminLoad" type="button" style="
          padding:12px 14px;border-radius:14px;border:none;cursor:pointer;
          background: linear-gradient(135deg, rgba(255,95,123,1), rgba(255,47,69,1));
          color:#fff;font-weight:900; letter-spacing:.4px;
          box-shadow: 0 16px 30px rgba(0,0,0,0.18);
        ">載入</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;">
        <button id="btnAdminCopyLink" type="button" class="admin-mini-btn">複製名片連結</button>
        <button id="btnAdminShareLink" type="button" class="admin-mini-btn">分享名片</button>
        <button id="btnAdminCopyBundle" type="button" class="admin-mini-btn admin-mini-btn-gold">一鍵交貨整包複製</button>
        <button id="btnAdminOpenCard" type="button" class="admin-mini-btn">成品預覽</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;">
        <button id="btnAdminOgPreview" type="button" class="admin-mini-btn admin-mini-btn-gold">動態 OG 圖（姓名＋頭像）</button>
        <button id="btnAdminOpenShare" type="button" class="admin-mini-btn">打開 share.html</button>
      </div>

      <div id="ogPreviewBox" style="display:none; margin-top:4px; border-radius:16px; overflow:hidden; border:1px solid rgba(0,0,0,0.10); background:#fff;">
        <div style="padding:10px 10px 8px; display:flex; align-items:center; justify-content:space-between;">
          <div style="font-weight:900;">OG 預覽（1200×630）</div>
          <button id="btnOgClose" type="button" style="border:none;background:rgba(0,0,0,0.06);border-radius:999px;width:34px;height:34px;cursor:pointer;font-weight:900;">✕</button>
        </div>
        <div style="padding:0 10px 10px;">
          <img id="ogPreviewImg" alt="OG Preview" style="width:100%; display:block; border-radius:14px; background:rgba(0,0,0,0.04);" />
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button id="btnOgOpenNew" type="button" class="admin-mini-btn">開新頁預覽</button>
            <button id="btnOgDownload" type="button" class="admin-mini-btn admin-mini-btn-gold">下載 PNG</button>
          </div>
        </div>
      </div>

      <div style="opacity:.72; font-size:12px; line-height:1.5;">
        v403-dev：不使用 SW，適合開發階段常改版。<br/>
        三擊右下角進來，支援照片牆/Lightbox、動態 OG、一鍵交貨整包複製。
      </div>
    </div>
  `;

  modal.appendChild(sheet);
  document.body.appendChild(modal);

  const style = document.createElement("style");
  style.textContent = `
    .admin-mini-btn{
      padding: 12px 12px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,0.12);
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.86));
      font-weight: 900;
      letter-spacing: .3px;
      cursor: pointer;
      box-shadow: 0 12px 22px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.90);
    }
    .admin-mini-btn:active{ transform: scale(0.99); }
    .admin-mini-btn-gold{
      border: 1px solid rgba(0,0,0,0.10);
      background:
        radial-gradient(900px 520px at 20% 10%, rgba(255,255,255,0.20), transparent 62%),
        linear-gradient(135deg, rgba(255,233,168,0.88), rgba(191,149,63,0.92));
      color:#1a1408;
      box-shadow: 0 18px 34px rgba(0,0,0,0.16);
    }
  `;
  document.head.appendChild(style);

  const close = ()=>{
    modal.style.display = "none";
    const box = qs("ogPreviewBox");
    if(box) box.style.display = "none";
  };

  modal.addEventListener("click",(e)=>{ if(e.target === modal) close(); });
  qs("btnAdminClose")?.addEventListener("click", close);

  qs("btnAdminLoad")?.addEventListener("click", async ()=>{
    const v = qs("adminIdInput")?.value || "";
    const cid = normalizeId_(v);
    if(!cid){
      alert("請輸入序號（例 TW0008 或 8）");
      return;
    }
    await loadAndRenderById_(cid);
    setUrlId_(cid);
    alert("✅ 已載入：" + cid);
  });

  qs("btnAdminCopyLink")?.addEventListener("click", async ()=>{
    const url = getCardShareUrl_();
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(url);
        alert("✅ 已複製名片連結");
        return;
      }
    }catch{}
    prompt("複製名片連結：", url);
  });

  qs("btnAdminShareLink")?.addEventListener("click", shareCard_);

  qs("btnAdminOpenCard")?.addEventListener("click", ()=>{
    openUrl_(getCardShareUrl_());
  });

  qs("btnAdminOpenShare")?.addEventListener("click", ()=>{
    const base = location.origin + location.pathname.replace(/\/[^\/]*$/, "/");
    openUrl_(base + "share.html?id=" + encodeURIComponent(__resolvedId || CONFIG.DEFAULT_ID));
  });

  qs("btnAdminOgPreview")?.addEventListener("click", async ()=>{
    await buildOgPreview_();
  });

  qs("btnOgClose")?.addEventListener("click", ()=>{
    const box = qs("ogPreviewBox");
    if(box) box.style.display = "none";
  });

  qs("btnAdminCopyBundle")?.addEventListener("click", async ()=>{
    const p = currentRow || null;
    if(!p){
      alert("⏳ 名片資料載入中，請稍後再試");
      return;
    }

    const name = pick(p, ["姓名","name"]) || "";
    const unit = pick(p, ["單位","unit"]) || "";
    const title= pick(p, ["頭銜","職稱","title"]) || "";

    const cardUrl = getCardShareUrl_();
    const base = location.origin + location.pathname.replace(/\/[^\/]*$/, "/");
    const shareUrl = base + "share.html?id=" + encodeURIComponent(__resolvedId || CONFIG.DEFAULT_ID);

    const avatarRaw = pick(p, ["個人照_fast","個人照","avatar_fast","avatar"]);
    const avatar = normalizeImageUrl_(avatarRaw);

    const bundle =
`【幸福智慧名片｜交貨整包】
姓名：${name}
單位：${unit}
頭銜：${title}

名片連結：${cardUrl}
交貨卡：${shareUrl}

頭像（可選）：${avatar || "(無)"}
序號：${__resolvedId || CONFIG.DEFAULT_ID}
`;

    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(bundle);
        alert("✅ 已複製交貨整包");
        return;
      }
    }catch{}

    prompt("複製交貨整包：", bundle);
  });
}

/* ---------- OG Preview generator (canvas) ---------- */
function loadImageAsBitmap_(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";