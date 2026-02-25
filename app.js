/* ================================
 * Happiness Smart Card System
 * app.js v400.1 (COMPLETE OVERWRITE)
 * - Fix: GAS url empty bug
 * - Fix: payload row extraction (data.data / data.row / direct row)
 * - Keep: theme switch / docks / blocks / photo wall + lightbox
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v400.1"
};

let currentRow = null;

/* ---------- Utilities ---------- */

function qs(id){ return document.getElementById(id); }

function normalizeKey(k){
  return String(k ?? "")
    .replace(/[\n\r"]/g, "")
    .trim()
    .toLowerCase();
}

function pick(row, keys){
  if(!row) return "";
  const map = {};
  Object.keys(row).forEach(k => map[normalizeKey(k)] = row[k]);
  for(const key of keys){
    const v = map[normalizeKey(key)];
    if(v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function safeSetText(id, txt){
  const el = qs(id);
  if(!el) return;
  el.textContent = (txt || "").trim();
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

/* ---------- Theme Switching ---------- */

function setV382(mode, theme, el){
  document.body.className = "";

  if(mode === "free"){
    document.body.classList.add("mode-free", theme);
    if(qs("free-controls")) qs("free-controls").style.display = "block";
    if(qs("premiumDotsRow")) qs("premiumDotsRow").style.display = "none";
  }else{
    document.body.classList.add("mode-premium", theme);
    if(qs("free-controls")) qs("free-controls").style.display = "none";
    if(qs("premiumDotsRow")) qs("premiumDotsRow").style.display = "flex";
  }

  document.querySelectorAll(".btn-neo, .dot, .p-dot").forEach(b => b.classList.remove("active"));
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

/* ---------- Navigation ---------- */

function goFillForm(){
  window.open(CONFIG.FORM, "_blank");
}

/* ---------- Data Fetch (robust) ---------- */

async function fetchJsonRobust(url){
  const res = await fetch(url, { cache:"no-store" });
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
}

/* ✅ 支援：{ok:true,data:{...}} / {ok:true,row:{...}} / 直接 row */
function extractRow_(payload){
  if(!payload || typeof payload !== "object") return null;

  if(payload.ok === false) return null;

  const row =
    (payload.data && typeof payload.data === "object") ? payload.data :
    (payload.row  && typeof payload.row  === "object") ? payload.row  :
    payload;

  // 如果 row 還是包著 ok/data 這種，擋一下
  if(row && row.ok !== undefined && row.data !== undefined) return row.data;
  return row;
}

/* ---------- Render: Logo / Avatar / Blocks ---------- */

function renderLogo(row){
  const logoUrl =
    pick(row, ["logo", "logo_img", "logo圖片", "logo圖片連結", "logo連結"]) ||
    pick(row, ["logo_fast", "logo_fast_img"]);

  const logoWrap = qs("logoWrap");
  const logoImg  = qs("u-logo");

  if(logoUrl && logoImg && logoWrap){
    logoImg.src = normalizeUrl(logoUrl);
    logoImg.onload = () => { logoWrap.style.display = "block"; };
    logoImg.onerror = () => { logoWrap.style.display = "none"; };
  }else{
    if(logoWrap) logoWrap.style.display = "none";
  }
}

function renderAvatar(row){
  const avatar =
    pick(row, ["avatar_img", "個人照", "個人照連結", "照片", "photo"]) ||
    pick(row, ["avatar_fast", "avatar_fast_img", "個人照_fast"]);

  const img = qs("u-img");
  if(!img) return;

  if(avatar){
    img.src = normalizeUrl(avatar);
  }else{
    img.removeAttribute("src");
  }
}

function renderBlocks(row){
  const service = pick(row, ["服務項目", "service", "services"]);
  const exp     = pick(row, ["經歷", "experience", "exp"]);

  const b1 = qs("block-service");
  const b2 = qs("block-exp");

  if(b1){
    if(service){
      b1.style.display = "";
      b1.innerHTML = `
        <div class="block-title">服務項目</div>
        <div class="block-body preline">${escapeHtml(service)}</div>
      `;
    }else{
      b1.style.display = "none";
    }
  }

  if(b2){
    if(exp){
      b2.style.display = "";
      b2.innerHTML = `
        <div class="block-title">經歷</div>
        <div class="block-body preline">${escapeHtml(exp)}</div>
      `;
    }else{
      b2.style.display = "none";
    }
  }
}

/* ---------- Docks ---------- */

function openUrl(url){
  const u = normalizeUrl(url);
  if(!u) return;
  window.open(u, "_blank");
}

function openMapByAddress(addr){
  const a = String(addr||"").trim();
  if(!a) return;
  const q = encodeURIComponent(a);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

function buildBtn({label, icon, onClick}){
  const b = document.createElement("button");
  b.className = "dock-btn";
  b.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
  b.addEventListener("click", onClick);
  return b;
}

function renderDocks(row){
  const mediaDock = qs("mediaDock");
  const mediaBtns = qs("mediaButtons");
  const cDock     = qs("contactDock");
  const cBtns     = qs("contactButtons");

  if(mediaBtns) mediaBtns.innerHTML = "";
  if(cBtns) cBtns.innerHTML = "";

  // ---- Media ----
  const mediaItems = [
    { k: ["影音平台1","影音1","video1","youtube1"], label:"影音1", icon:"fa-solid fa-play" },
    { k: ["影音平台2","影音2","video2","youtube2"], label:"影音2", icon:"fa-solid fa-play" },
    { k: ["社群1","social1","ig","instagram"],     label:"社群1", icon:"fa-solid fa-users" },
    { k: ["社群2","social2","fb","facebook"],      label:"社群2", icon:"fa-solid fa-users" }
  ];

  let hasMedia = false;
  mediaItems.forEach(it=>{
    const v = pick(row, it.k);
    if(!v) return;
    hasMedia = true;
    if(mediaBtns){
      mediaBtns.appendChild(buildBtn({
        label: it.label,
        icon: it.icon,
        onClick: ()=> openUrl(v)
      }));
    }
  });
  if(mediaDock) mediaDock.style.display = hasMedia ? "" : "none";

  // ---- Contacts ----
  const phone   = pick(row, ["電話","phone","mobile"]);
  const email   = pick(row, ["email","Email","信箱"]);
  const lineOA  = pick(row, ["line官方帳號","line_oa","line官方","line官網"]);
  const lineLink= pick(row, ["line連結","line_link","line"]);
  const wechat  = pick(row, ["微信","微信id","wechat","wechat_id"]);
  const address = pick(row, ["地址","address","導航地址"]);

  const contactList = [];

  if(lineOA) contactList.push({ label:"LINE官網", icon:"fa-brands fa-line", action: ()=> openUrl(lineOA) });

  if(wechat) contactList.push({
    label:"微信ID", icon:"fa-brands fa-weixin",
    action: ()=>{
      try{ navigator.clipboard?.writeText(wechat); }catch{}
      alert("已複製微信ID");
    }
  });

  if(phone) contactList.push({ label:"電話", icon:"fa-solid fa-phone", action: ()=> location.href = `tel:${String(phone).trim()}` });

  if(email) contactList.push({ label:"Email", icon:"fa-solid fa-envelope", action: ()=> location.href = `mailto:${String(email).trim()}` });

  if(address) contactList.push({ label:"地址", icon:"fa-solid fa-location-dot", action: ()=> openMapByAddress(address) });

  if(lineLink && !lineOA) contactList.push({ label:"LINE", icon:"fa-brands fa-line", action: ()=> openUrl(lineLink) });

  let hasContact = false;
  contactList.forEach(x=>{
    hasContact = true;
    if(cBtns) cBtns.appendChild(buildBtn({ label:x.label, icon:x.icon, onClick:x.action }));
  });
  if(cDock) cDock.style.display = hasContact ? "" : "none";
}

/* ---------- Photo Wall + Lightbox ---------- */

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

  const hide = ()=>{
    overlay.style.display = "none";
    img.removeAttribute("src");
  };

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

function collectPhotoUrls(row){
  const bulk = pick(row, ["photos_img", "photos", "相片", "照片牆", "photo_wall"]);
  let urls = [];

  if(bulk){
    urls = urls.concat(
      bulk.split(/[\n,，;]/g).map(s=>String(s).trim()).filter(Boolean)
    );
  }

  for(let i=1;i<=12;i++){
    const v = pick(row, [`photo${i}`, `photo_${i}`, `照片${i}`, `相片${i}`, `photo${i}_img`]);
    if(v) urls.push(v);
  }

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
  if(n <= 1) cols = 1;
  else if(n === 2) cols = 2;

  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}

function renderPhotoWall(row){
  const wall = qs("photoWall");
  const grid = qs("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const urls = collectPhotoUrls(row);

  if(!urls.length){
    wall.style.display = "none";
    return;
  }

  urls.forEach((u)=>{
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

/* ---------- Main Render ---------- */

function renderCard(row){
  const name  = pick(row, ["姓名","name"]);
  const unit  = pick(row, ["單位","unit"]);
  const title = pick(row, ["頭銜","職稱","title"]);

  safeSetText("u-name", name || "未命名");
  safeSetText("u-unit", unit);
  safeSetText("u-title", title);

  const slogan = pick(row, ["slogan","簡介","一句話","引言"]);
  const sEl = qs("u-slogan");
  if(sEl){
    if(slogan){
      sEl.style.display = "";
      sEl.textContent = slogan;
    }else{
      sEl.style.display = "none";
    }
  }

  renderAvatar(row);
  renderLogo(row);
  renderBlocks(row);
  renderDocks(row);
}

/* ---------- Boot ---------- */

function getIdFromUrl(){
  const sp = new URLSearchParams(location.search);
  return sp.get("id") || sp.get("cid") || "";
}

async function loadAndRenderById(id){
  const cid = String(id || "").trim() || CONFIG.DEFAULT_ID;

  // ✅ FIX#1：永遠要有 GAS
  const gas = (window.CONFIG && window.CONFIG.GAS) ? window.CONFIG.GAS : CONFIG.GAS;

  const url = `${gas}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const payload = await fetchJsonRobust(url);

    // ✅ FIX#2：支援 data.data / data.row / direct row
    const row = extractRow_(payload);
    if(!row) throw new Error("Invalid payload row");

    currentRow = row;

    renderCard(row);
    renderPhotoWall(row);

    const v = qs("versionTag");
    if(v) v.textContent = CONFIG.VERSION;

  }catch(err){
    console.error("LOAD FAIL:", err);
    safeSetText("u-name", "讀取失敗");
    const v = qs("versionTag");
    if(v) v.textContent = CONFIG.VERSION;
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