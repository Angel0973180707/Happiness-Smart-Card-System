/* ================================
 * Happiness Smart Card System
 * app.js v400.2 (COMPLETE OVERWRITE)
 * - Accept payload shapes:
 *   A) direct row {姓名:...} ✅你目前回傳
 *   B) {ok:true, data:{...}}
 *   C) {ok:true, row:{...}}
 * - Fix docks keys to your sheet:
 *   影音平台1/2/3, 社群平台1/2/3
 * - Photo wall supports:
 *   photos[] / photos_full[] / 照片(逗號或換行)
 * - Robust image URL for Drive/Dropbox + fallback
 * - Keep mode/theme/style/paper when switching
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v400.2",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null?"":String(v)).trim(); }

/* ---------- Key normalize / pick ---------- */
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

/* ---------- payload shape normalize ---------- */
function unwrapRow_(data){
  if(!data || typeof data !== "object") return null;
  if(data.ok === true && data.data && typeof data.data === "object") return data.data;
  if(data.ok === true && data.row && typeof data.row === "object") return data.row;
  if(data.ok === undefined && Object.keys(data).length > 0) return data; // direct row
  return null;
}

/* ---------- URL + params ---------- */
function getParams_(){
  try { return new URLSearchParams(location.search); }
  catch { return new URLSearchParams(); }
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

/* ---------- Theme switching (preserve other classes) ---------- */
function removeByPrefix_(prefix){
  document.body.classList.forEach(c=>{
    if(c.startsWith(prefix)) document.body.classList.remove(c);
  });
}

window.setV382 = function setV382(mode, theme, el){
  // preserve style-* and paper-*; only change mode/theme
  removeByPrefix_("mode-");
  removeByPrefix_("color-");
  removeByPrefix_("p"); // premium themes are p1..p7 (safe: only when exact)
  // re-add
  document.body.classList.add(mode === "premium" ? "mode-premium" : "mode-free");
  if(theme) document.body.classList.add(theme);

  // show/hide controls
  const free = qs("free-controls");
  const premRow = qs("premiumDotsRow");
  if(free) free.style.display = (mode === "free") ? "block" : "none";
  if(premRow) premRow.style.display = (mode === "premium") ? "flex" : "none";

  // active UI
  document.querySelectorAll(".btn-neo, .dot, .p-dot").forEach(b=>b.classList.remove("active"));
  if(el) el.classList.add("active");

  // write params
  setParam_("mode", mode);
  setParam_("theme", theme);
};

window.setV382Style = function setV382Style(style, el){
  removeByPrefix_("style-");
  document.body.classList.add("style-" + style);

  document.querySelectorAll("#free-controls .btn-neo").forEach(b=>b.classList.remove("active"));
  if(el) el.classList.add("active");

  setParam_("style", style);
};

window.setV382Paper = function setV382Paper(paper, el){
  removeByPrefix_("paper-");
  document.body.classList.add(paper);

  document.querySelectorAll("#free-controls .btn-neo").forEach(b=>b.classList.remove("active"));
  if(el) el.classList.add("active");

  setParam_("paper", paper);
};

function setParam_(k,v){
  try{
    const sp = new URLSearchParams(location.search);
    if(v==null || String(v).trim()==="") sp.delete(k);
    else sp.set(k, String(v).trim());
    const newUrl = location.pathname + "?" + sp.toString() + location.hash;
    history.replaceState(null, "", newUrl);
  }catch{}
}

window.goFillForm = function goFillForm(){
  window.open(CONFIG.FORM, "_blank");
};

/* ---------- fetch robust ---------- */
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
      await new Promise(r=>setTimeout(r, 520 + i*520));
    }
  }
  throw last || new Error("Fetch failed");
}

/* ---------- common helpers ---------- */
function safeSetText(id, t){
  const el = qs(id);
  if(!el) return;
  el.textContent = text(t);
}

function escapeHtml(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function isUrl(s){
  return /^https?:\/\//i.test(String(s||"").trim());
}

function normalizeUrl(s){
  const v = String(s||"").trim();
  if(!v) return "";
  if(isUrl(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}

/* ---------- image helpers (Drive/Dropbox) ---------- */
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

/* ---------- actions ---------- */
function openUrl(url){
  const u = normalizeUrl(url);
  if(!u) return;
  window.open(u, "_blank");
}

function openMapByAddress(addr){
  const a = String(addr||"").trim();
  if(!a) return;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`, "_blank");
}

/* ---------- render: logo/avatar/blocks ---------- */
function renderLogo(p){
  const logoUrl =
    pick(p, ["Logo_fast","logo_fast","logo_fast_img","Logo"]) ||
    pick(p, ["logo","logo_img","logo圖片","logo圖片連結","logo連結"]);

  const wrap = qs("logoWrap");
  const img  = qs("u-logo");
  if(!wrap || !img){ return; }

  if(logoUrl){
    wrap.style.display = "block";
    setImgWithFallback_(img, buildImageCandidates_(logoUrl));
  }else{
    wrap.style.display = "none";
    img.removeAttribute("src");
  }
}

function renderAvatar(p){
  const raw =
    pick(p, ["個人照_fast","avatar_fast","photo_fast","個人照","avatar","avatar_img","photo","照片"]) ||
    pick(p, ["avatar"]);

  const img = qs("u-img");
  if(!img) return;

  if(raw){
    setImgWithFallback_(img, buildImageCandidates_(raw));
  }else{
    img.removeAttribute("src");
  }
}

function renderBlocks(p){
  const service = pick(p, ["服務項目","service","services"]);
  const exp     = pick(p, ["經歷","experience","exp"]);

  const b1 = qs("block-service");
  const b2 = qs("block-exp");

  if(b1){
    if(service){
      b1.style.display = "";
      b1.innerHTML = `
        <div class="block-title">服務項目</div>
        <div class="block-body preline">${escapeHtml(service)}</div>
      `;
    }else b1.style.display = "none";
  }

  if(b2){
    if(exp){
      b2.style.display = "";
      b2.innerHTML = `
        <div class="block-title">經歷</div>
        <div class="block-body preline">${escapeHtml(exp)}</div>
      `;
    }else b2.style.display = "none";
  }
}

/* ---------- docks ---------- */
function buildBtn({label, icon, onClick}){
  const b = document.createElement("button");
  b.className = "dock-btn";
  b.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
  b.addEventListener("click", onClick);
  return b;
}

function renderDocks(p){
  const mediaDock = qs("mediaDock");
  const mediaBtns = qs("mediaButtons");
  const cDock     = qs("contactDock");
  const cBtns     = qs("contactButtons");
  if(mediaBtns) mediaBtns.innerHTML = "";
  if(cBtns) cBtns.innerHTML = "";

  // 影音 / 社群：對齊你回傳的 key
  const mediaItems = [
    { k:["影音平台1","影音1"], label:"影音平台1", icon:"fa-solid fa-play" },
    { k:["影音平台2","影音2"], label:"影音平台2", icon:"fa-solid fa-play" },
    { k:["影音平台3","影音3"], label:"影音平台3", icon:"fa-solid fa-play" },
    { k:["社群平台1","社群1"], label:"社群平台1", icon:"fa-solid fa-users" },
    { k:["社群平台2","社群2"], label:"社群平台2", icon:"fa-solid fa-users" },
    { k:["社群平台3","社群3"], label:"社群平台3", icon:"fa-solid fa-users" }
  ];

  let hasMedia = false;
  mediaItems.forEach(it=>{
    const v = pick(p, it.k);
    if(!v) return;
    hasMedia = true;
    mediaBtns.appendChild(buildBtn({
      label: it.label,
      icon: it.icon,
      onClick: ()=> openUrl(v)
    }));
  });
  if(mediaDock) mediaDock.style.display = hasMedia ? "" : "none";

  // Contacts
  const phone  = pick(p, ["電話","phone","mobile"]);
  const email  = pick(p, ["Email","email","信箱"]);
  const lineOA = pick(p, ["LINE官方帳號","line_oa","line官方帳號"]);
  const lineLink = pick(p, ["LINE連結","line_link","line"]);
  const wechat = pick(p, ["微信","wechat","wechat_id"]);
  const address = pick(p, ["地址","address","導航地址"]);

  const contactList = [];

  if(lineOA) contactList.push({
    label:"LINE官方", icon:"fa-brands fa-line",
    action: ()=> openUrl(lineOA)
  });

  if(lineLink && !lineOA) contactList.push({
    label:"LINE", icon:"fa-brands fa-line",
    action: ()=> openUrl(lineLink)
  });

  if(wechat) contactList.push({
    label:"微信ID", icon:"fa-brands fa-weixin",
    action: async ()=> {
      try{
        if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(String(wechat).trim());
      }catch{}
      alert("✅ 已複製微信ID");
    }
  });

  if(phone) contactList.push({
    label:"電話", icon:"fa-solid fa-phone",
    action: ()=> { location.href = `tel:${String(phone).trim()}`; }
  });

  if(email) contactList.push({
    label:"Email", icon:"fa-solid fa-envelope",
    action: ()=> { location.href = `mailto:${String(email).trim()}`; }
  });

  if(address) contactList.push({
    label:"地址", icon:"fa-solid fa-location-dot",
    action: ()=> openMapByAddress(address)
  });

  let hasContact = false;
  contactList.forEach(x=>{
    hasContact = true;
    cBtns.appendChild(buildBtn({ label:x.label, icon:x.icon, onClick:x.action }));
  });
  if(cDock) cDock.style.display = hasContact ? "" : "none";
}

/* ---------- photo wall + lightbox ---------- */
function ensureLightbox_(){
  if (qs("lightboxOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "lightboxOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:999999;
    background:rgba(0,0,0,0.78);
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
  overlay.addEventListener("click", (e)=>{ if(e.target === overlay) hide(); });
  close.addEventListener("click", hide);
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") hide(); });
}

function openLightbox(url){
  ensureLightbox_();
  const overlay = qs("lightboxOverlay");
  const img = qs("lightboxImg");
  if(!overlay || !img) return;
  img.src = url;
  overlay.style.display = "flex";
}

function collectPhotoUrls(p){
  const out = [];

  // A) array
  const arr1 = p && p.__raw && Array.isArray(p.__raw.photos) ? p.__raw.photos : null;
  const arr2 = p && p.__raw && Array.isArray(p.__raw.photos_full) ? p.__raw.photos_full : null;
  if(arr1) out.push(...arr1);
  if(arr2) out.push(...arr2);

  // B) "照片" field: comma/newline list
  const bulk = pick(p, ["照片_fast","照片","photos_img","photos","相片","照片牆","photo_wall"]);
  if(bulk){
    out.push(...String(bulk).split(/[\n,，;]/g).map(s=>s.trim()).filter(Boolean));
  }

  // C) photo1..photo12
  for(let i=1;i<=12;i++){
    const v = pick(p, [`photo${i}`, `photo_${i}`, `照片${i}`, `相片${i}`, `photo${i}_img`]);
    if(v) out.push(v);
  }

  // normalize + dedupe
  const seen = new Set();
  const urls = [];
  out.forEach(u=>{
    const nu = normalizeImageUrl(u);
    if(!nu) return;
    if(seen.has(nu)) return;
    seen.add(nu);
    urls.push(nu);
  });

  return urls;
}

function setPhotoGridBalance_(gridEl, n){
  let cols = 3;
  if(n <= 1) cols = 1;
  else if(n === 2) cols = 2;
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  gridEl.querySelectorAll("img").forEach(im=>{
    im.style.aspectRatio = (n === 1) ? "16 / 10" : "1 / 1";
    im.style.objectFit = "cover";
  });
}

function renderPhotoWall(p){
  const wall = qs("photoWall");
  const grid = qs("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const urls = collectPhotoUrls(p);

  if(!urls.length){
    wall.style.display = "none";
    return;
  }

  urls.forEach((u)=>{
    const img = document.createElement("img");
    img.alt = "照片";
    img.loading = "lazy";
    img.decoding = "async";
    setImgWithFallback_(img, buildImageCandidates_(u));
    img.addEventListener("click", ()=> openLightbox(normalizeImageUrl(u)));
    grid.appendChild(img);
  });

  wall.style.display = "";
  setPhotoGridBalance_(grid, urls.length);
}

/* ---------- main render ---------- */
function renderCard(row){
  const p = buildNormalizedPayload_(row);

  const name  = pick(p, ["姓名","name"]);
  const unit  = pick(p, ["單位","unit"]);
  const title = pick(p, ["頭銜","職稱","title"]);

  safeSetText("u-name", name || "未命名");
  safeSetText("u-unit", unit);
  safeSetText("u-title", title);

  const slogan = pick(p, ["理念標語","slogan","簡介","一句話","引言"]);
  const sEl = qs("u-slogan");
  if(sEl){
    if(slogan){
      sEl.style.display = "";
      sEl.textContent = slogan;
    }else{
      sEl.style.display = "none";
    }
  }

  renderAvatar(p);
  renderLogo(p);
  renderBlocks(p);
  renderDocks(p);
  renderPhotoWall(p);

  const v = qs("versionTag");
  if(v) v.textContent = CONFIG.VERSION;
}

/* ---------- boot ---------- */
function applyInitialParams_(){
  const sp = getParams_();

  const mode  = sp.get("mode") || "free";
  const theme = sp.get("theme") || (mode === "premium" ? "p1" : "color-1");
  const style = sp.get("style") || "arch";
  const paper = sp.get("paper") || "paper-1";

  // set body classes directly (avoid needing button elements)
  removeByPrefix_("mode-");
  removeByPrefix_("color-");
  removeByPrefix_("p");
  removeByPrefix_("style-");
  removeByPrefix_("paper-");

  document.body.classList.add(mode === "premium" ? "mode-premium" : "mode-free");
  document.body.classList.add(theme);
  document.body.classList.add("style-" + style);
  document.body.classList.add(paper);

  const free = qs("free-controls");
  const premRow = qs("premiumDotsRow");
  if(free) free.style.display = (mode === "free") ? "block" : "none";
  if(premRow) premRow.style.display = (mode === "premium") ? "flex" : "none";
}

async function loadAndRender_(){
  const sp = getParams_();
  const id = normalizeId_(sp.get("id")) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;

  try{
    const data = await fetchJsonRobust(url);
    const row = unwrapRow_(data);
    if(!row) throw new Error("Invalid payload shape");
    renderCard(row);
  }catch(e){
    console.error(e);
    safeSetText("u-name", "載入失敗");
    const v = qs("versionTag");
    if(v) v.textContent = CONFIG.VERSION;
  }
}

(function boot(){
  try{
    ensureLightbox_();
    applyInitialParams_();
    loadAndRender_();
  }catch(e){
    console.error(e);
  }
})();