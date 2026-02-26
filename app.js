/* ================================
 * Happiness Smart Card System
 * app.js v400.2 (COMPLETE OVERWRITE)
 * - FIX: GAS payload could be direct row (no ok/data)
 * - FIX: Use correct GAS endpoint (your working one)
 * - Robust JSON parsing + safe rendering
 * - Media / Social keys match your sheet: 影音平台1..3 / 社群平台1..3
 * - Photo wall: photos[] / photos_full[] / 照片 CSV / photo1..12
 * ================================ */

const CONFIG = {
  // ✅ 你目前「確定有回資料」的 GAS（你貼的那支）
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v400.2",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

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

/* ---------- URL helpers ---------- */

function isUrl(s){ return /^https?:\/\//i.test(text(s)); }

function normalizeUrl(s){
  const v = text(s);
  if(!v) return "";
  if(v.startsWith("http://")) return "https://" + v.slice(7);
  if(isUrl(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}

function openUrl(url){
  const u = normalizeUrl(url);
  if(!u) return;
  window.open(u, "_blank");
}

function openMapByAddress(addr){
  const a = text(addr);
  if(!a) return;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`, "_blank");
}

/* ---------- Robust fetch ---------- */

async function fetchWithTimeout(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", cache:"no-store", redirect:"follow", signal: controller.signal });
    const raw = await res.text();
    const body = (raw||"").trim();
    if(!body) throw new Error("Empty response");

    try{
      return JSON.parse(body);
    }catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      // 把原文丟出去方便你 debug
      const err = new Error("Not JSON");
      err.rawText = body.slice(0, 400);
      throw err;
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

/* ---------- Theme Switching (keep your existing hooks) ---------- */

function setV382(mode, theme, el){
  document.body.className = "";

  if(mode === "free"){
    document.body.classList.add("mode-free", theme);
    qs("free-controls").style.display = "block";
    qs("premiumDotsRow").style.display = "none";
  }else{
    document.body.classList.add("mode-premium", theme);
    qs("free-controls").style.display = "none";
    qs("premiumDotsRow").style.display = "flex";
  }

  document.querySelectorAll(".btn-neo, .dot, .p-dot")
    .forEach(b => b.classList.remove("active"));

  if(el) el.classList.add("active");
}

function setV382Style(style, el){
  document.body.classList.remove("style-arch","style-flat","style-spot");
  document.body.classList.add("style-" + style);

  document.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
  if(el) el.classList.add("active");
}

function setV382Paper(paper, el){
  document.body.classList.remove("paper-1","paper-2","paper-3");
  document.body.classList.add(paper);

  document.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
  if(el) el.classList.add("active");
}

function goFillForm(){ window.open(CONFIG.FORM, "_blank"); }

/* ---------- Render helpers ---------- */

function safeSetText(id, val){
  const el = qs(id);
  if(!el) return;
  el.textContent = text(val);
}

function escapeHtml(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function renderLogo(p){
  const logoUrl =
    pick(p, ["Logo_fast","Logo","logo_fast","logo","logo_img","logo圖片","logo圖片連結","logo連結"]);

  const wrap = qs("logoWrap");
  const img  = qs("u-logo");
  if(!wrap || !img) return;

  const u = normalizeUrl(logoUrl);
  if(!u){ wrap.style.display="none"; return; }

  img.onload = ()=>{ wrap.style.display="block"; };
  img.onerror = ()=>{ wrap.style.display="none"; };
  img.src = u;
}

function renderAvatar(p){
  const avatar =
    pick(p, ["個人照_fast","個人照","avatar_fast","avatar","avatar_img","photo_fast","photo","照片"]);

  const img = qs("u-img");
  if(!img) return;

  const u = normalizeUrl(avatar);
  if(!u){ img.removeAttribute("src"); return; }
  img.src = u;
}

function renderBlocks(p){
  const service = pick(p, ["服務項目","service","services"]);
  const exp     = pick(p, ["經歷","experience","exp"]);

  const b1 = qs("block-service");
  const b2 = qs("block-exp");

  if(b1){
    if(text(service)){
      b1.style.display = "";
      b1.innerHTML = `
        <div class="block-title">服務項目</div>
        <div class="block-body preline">${escapeHtml(service)}</div>
      `;
    }else b1.style.display = "none";
  }

  if(b2){
    if(text(exp)){
      b2.style.display = "";
      b2.innerHTML = `
        <div class="block-title">經歷</div>
        <div class="block-body preline">${escapeHtml(exp)}</div>
      `;
    }else b2.style.display = "none";
  }
}

/* ---------- Docks ---------- */

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

  // ✅ 影音 / 社群（用你資料的表頭）
  const mediaItems = [
    { k: ["影音平台1"], label:"影音平台", icon:"fa-solid fa-play" },
    { k: ["影音平台2"], label:"官網/作品", icon:"fa-solid fa-link" },
    { k: ["影音平台3"], label:"影音3",   icon:"fa-solid fa-play" },
    { k: ["社群平台1"], label:"社群平台", icon:"fa-solid fa-users" },
    { k: ["社群平台2"], label:"社群2",   icon:"fa-solid fa-users" },
    { k: ["社群平台3"], label:"社群3",   icon:"fa-solid fa-users" }
  ];

  let hasMedia = false;
  if(mediaBtns){
    mediaItems.forEach(it=>{
      const v = pick(p, it.k);
      if(!text(v)) return;
      hasMedia = true;
      mediaBtns.appendChild(buildBtn({
        label: it.label,
        icon: it.icon,
        onClick: ()=> openUrl(v)
      }));
    });
  }
  if(mediaDock) mediaDock.style.display = hasMedia ? "" : "none";

  // 聯繫：LINE/微信/電話/Email/地址
  const phone   = pick(p, ["電話","phone","mobile"]);
  const email   = pick(p, ["Email","email","信箱"]);
  const lineOA  = pick(p, ["LINE官方帳號","line_oa","line官方帳號"]);
  const lineLink= pick(p, ["LINE連結","line_link","line"]);
  const wechat  = pick(p, ["微信","wechat","wechat_id"]);
  const address = pick(p, ["地址","address","導航地址"]);

  const contactList = [];

  if(text(lineOA)) contactList.push({
    label:"LINE官網", icon:"fa-brands fa-line",
    action: ()=> openUrl(lineOA)
  });

  if(text(wechat)) contactList.push({
    label:"微信ID", icon:"fa-brands fa-weixin",
    action: ()=> {
      (navigator.clipboard?.writeText(text(wechat)) || Promise.reject())
        .catch(()=>{})
        .finally(()=> alert("✅ 已複製微信ID"));
    }
  });

  if(text(phone)) contactList.push({
    label:"電話", icon:"fa-solid fa-phone",
    action: ()=> { location.href = `tel:${text(phone)}`; }
  });

  if(text(email)) contactList.push({
    label:"Email", icon:"fa-solid fa-envelope",
    action: ()=> { location.href = `mailto:${text(email)}`; }
  });

  if(text(address)) contactList.push({
    label:"地址", icon:"fa-solid fa-location-dot",
    action: ()=> openMapByAddress(address)
  });

  if(text(lineLink) && !text(lineOA)) contactList.push({
    label:"LINE", icon:"fa-brands fa-line",
    action: ()=> openUrl(lineLink)
  });

  let hasContact = false;
  if(cBtns){
    contactList.forEach(x=>{
      hasContact = true;
      cBtns.appendChild(buildBtn({ label:x.label, icon:x.icon, onClick:x.action }));
    });
  }
  if(cDock) cDock.style.display = hasContact ? "" : "none";
}

/* ---------- Photo Wall ---------- */

function ensureLightbox_(){
  if(qs("lightboxOverlay")) return;

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

  overlay.addEventListener("click", (e)=>{ if(e.target===overlay) hide(); });
  close.addEventListener("click", hide);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") hide(); });
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
  const urls = [];

  // ✅ 先吃陣列（你 GAS 其實已經給 photos / photos_full）
  const arr1 = p.__raw && Array.isArray(p.__raw.photos) ? p.__raw.photos : null;
  const arr2 = p.__raw && Array.isArray(p.__raw.photos_full) ? p.__raw.photos_full : null;
  (arr2 || arr1 || []).forEach(u => { if(text(u)) urls.push(u); });

  // ✅ 再吃「照片」欄位（CSV/換行）
  const bulk = pick(p, ["照片_fast","照片","photos_img","photos","相片","照片牆","photo_wall"]);
  if(text(bulk)){
    bulk.split(/[\n,，;]/g).map(s=>text(s)).filter(Boolean).forEach(u=>urls.push(u));
  }

  // ✅ 再吃 photo1..12
  for(let i=1;i<=12;i++){
    const v = pick(p, [`photo${i}`, `photo_${i}`, `照片${i}`, `相片${i}`, `photo${i}_img`]);
    if(text(v)) urls.push(v);
  }

  // 去重 + 正規化
  const seen = new Set();
  const out = [];
  urls.forEach(u=>{
    const nu = normalizeUrl(u);
    if(!nu) return;
    if(seen.has(nu)) return;
    seen.add(nu);
    out.push(nu);
  });
  return out;
}

function setPhotoGridBalance_(gridEl, n){
  let cols = 3;
  if(n<=1) cols = 1;
  else if(n===2) cols = 2;
  else cols = 3;

  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  gridEl.querySelectorAll("img").forEach(im=>{
    im.style.aspectRatio = (n===1) ? "16 / 10" : "1 / 1";
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

  urls.forEach(u=>{
    const img = document.createElement("img");
    img.src = u;
    img.alt = "照片";
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("click", ()=> openLightbox(u));
    grid.appendChild(img);
  });

  wall.style.display = "";
  setPhotoGridBalance_(grid, urls.length);
}

/* ---------- Main render ---------- */

function renderCard(p){
  const name  = pick(p, ["姓名","name"]);
  const unit  = pick(p, ["單位","unit"]);
  const title = pick(p, ["頭銜","職稱","title"]);
  const slogan= pick(p, ["理念標語","標語","slogan","簡介","一句話","引言"]);

  safeSetText("u-name", name || "未命名");
  safeSetText("u-unit", unit);
  safeSetText("u-title", title);

  const sEl = qs("u-slogan");
  if(sEl){
    if(text(slogan)){ sEl.style.display=""; sEl.textContent = text(slogan); }
    else sEl.style.display="none";
  }

  renderAvatar(p);
  renderLogo(p);
  renderBlocks(p);
  renderDocks(p);
  renderPhotoWall(p);

  const v = qs("versionTag");
  if(v) v.textContent = CONFIG.VERSION;
}

/* ---------- Load + Boot ---------- */

function getIdFromUrl(){
  const sp = new URLSearchParams(location.search);
  return sp.get("id") || sp.get("cid") || "";
}

function unwrapRow_(data){
  // ✅ 相容多種回傳：
  // 1) 直接就是 row（你現在就是這種）
  // 2) {ok:true, data:{...}}
  // 3) {ok:true, row:{...}}
  if(!data || typeof data!=="object") return null;
  if(data.ok === true && data.data && typeof data.data === "object") return data.data;
  if(data.ok === true && data.row  && typeof data.row  === "object") return data.row;

  // 有些人會包成 {data:{...}} 但沒 ok
  if(data.data && typeof data.data === "object") return data.data;
  if(data.row  && typeof data.row  === "object") return data.row;

  return data; // direct row
}

async function loadAndRenderById(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const data = await fetchJsonRobust(url);
    const row = unwrapRow_(data);
    if(!row) throw new Error("Empty row");

    const p = buildNormalizedPayload_(row);
    renderCard(p);
  }catch(err){
    console.error("LOAD FAIL:", err);
    const nameEl = qs("u-name");
    if(nameEl) nameEl.textContent = "載入失敗";
    const v = qs("versionTag");
    if(v) v.textContent = CONFIG.VERSION + " | LOAD FAIL";
  }
}

(function boot(){
  try{
    ensureLightbox_();
    const id = getIdFromUrl() || CONFIG.DEFAULT_ID;
    loadAndRenderById(id);
  }catch(e){
    console.error(e);
  }
})();