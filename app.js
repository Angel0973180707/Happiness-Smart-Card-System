/* ================================
 * Happiness Smart Card System
 * app.js v400 (1/3)
 * Core Fix Layer
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v400"
};

let currentRow = null;

/* ---------- Utilities ---------- */

function qs(id){ return document.getElementById(id); }

function normalizeKey(k){
  return String(k)
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
    if(v) return String(v).trim();
  }
  return "";
}

/* ---------- Theme Switching ---------- */

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

  document.querySelectorAll(".btn-neo")
    .forEach(b => b.classList.remove("active"));

  if(el) el.classList.add("active");
}

function setV382Paper(paper, el){
  document.body.classList.remove("paper-1","paper-2","paper-3");
  document.body.classList.add(paper);

  document.querySelectorAll(".btn-neo")
    .forEach(b => b.classList.remove("active"));

  if(el) el.classList.add("active");
}

/* ---------- Navigation ---------- */

function goFillForm(){
  window.open(CONFIG.FORM, "_blank");
}

/* ---------- Data Load ---------- */

async function loadCard(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || CONFIG.DEFAULT_ID;

  const url = `${CONFIG.GAS}?action=card&id=${id}&ts=${Date.now()}`;

  try{
    const res = await fetch(url);
    const data = await res.json();

    if(!data || !data.ok) throw new Error("Invalid payload");

    currentRow = data.data;

    renderCard(currentRow);

  }catch(err){
    console.error("LOAD FAIL:", err);
    qs("u-name").innerText = "讀取失敗";
  }

  qs("versionTag").innerText = CONFIG.VERSION;
}/* ================================
 * app.js v400 (2/3)
 * Render Card + Docks + Address Navigation + Logo
 * ================================ */

function safeSetText(id, text){
  const el = qs(id);
  if(!el) return;
  el.textContent = (text || "").trim();
}

function safeShow(el, yes){
  if(!el) return;
  el.style.display = yes ? "" : "none";
}

function isUrl(s){
  return /^https?:\/\//i.test(String(s||"").trim());
}

function normalizeUrl(s){
  const v = String(s||"").trim();
  if(!v) return "";
  if(isUrl(v)) return v;
  // allow "www.xxx.com"
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}

function openUrl(url){
  const u = normalizeUrl(url);
  if(!u) return;
  window.open(u, "_blank");
}

function openMapByAddress(addr){
  const a = String(addr||"").trim();
  if(!a) return;
  const q = encodeURIComponent(a);
  // Google Maps
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

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

function escapeHtml(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

/* ---------- Docks ---------- */

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

  // ---- Media (影音/社群) ----
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
    mediaBtns.appendChild(buildBtn({
      label: it.label,
      icon: it.icon,
      onClick: ()=> openUrl(v)
    }));
  });
  if(mediaDock) mediaDock.style.display = hasMedia ? "" : "none";

  // ---- Contacts (電話/Email/官網/導航/LINE/微信) ----
  const phone = pick(row, ["電話","phone","mobile"]);
  const email = pick(row, ["email","Email","信箱"]);
  const lineOA = pick(row, ["line官方帳號","line_oa","line官方","line官網"]);
  const lineLink = pick(row, ["line連結","line_link","line"]);
  const wechat = pick(row, ["微信","微信id","wechat","wechat_id"]);
  const address = pick(row, ["地址","address","導航地址"]);

  const contactList = [];

  if(lineOA) contactList.push({
    label:"LINE官網", icon:"fa-brands fa-line",
    action: ()=> openUrl(lineOA)
  });

  if(wechat) contactList.push({
    label:"微信ID", icon:"fa-brands fa-weixin",
    action: ()=> { navigator.clipboard?.writeText(wechat).catch(()=>{}); alert("已複製微信ID"); }
  });

  if(phone) contactList.push({
    label:"電話", icon:"fa-solid fa-phone",
    action: ()=> { window.location.href = `tel:${String(phone).trim()}`; }
  });

  if(email) contactList.push({
    label:"Email", icon:"fa-solid fa-envelope",
    action: ()=> { window.location.href = `mailto:${String(email).trim()}`; }
  });

  // ✅ 你指定：導航表頭＝地址
  if(address) contactList.push({
    label:"地址", icon:"fa-solid fa-location-dot",
    action: ()=> openMapByAddress(address)
  });

  // lineLink（個人line）如果有，也補上
  if(lineLink && !lineOA) contactList.push({
    label:"LINE", icon:"fa-brands fa-line",
    action: ()=> openUrl(lineLink)
  });

  let hasContact = false;
  contactList.forEach(x=>{
    hasContact = true;
    cBtns.appendChild(buildBtn({ label:x.label, icon:x.icon, onClick:x.action }));
  });
  if(cDock) cDock.style.display = hasContact ? "" : "none";
}

/* ---------- Main render ---------- */

function renderCard(row){
  // name / unit / title
  const name = pick(row, ["姓名","name"]);
  const unit = pick(row, ["單位","unit"]);
  const title = pick(row, ["頭銜","職稱","title"]);

  safeSetText("u-name", name || "未命名");
  safeSetText("u-unit", unit);
  safeSetText("u-title", title);

  // slogan
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

  // photo wall 會在 3/3 做「動態平衡」處理
}/* ================================
 * app.js v400 (3/3)
 * Photo Wall dynamic-balance + Lightbox + Boot
 * ================================ */

/* ---- fallback helpers (if not defined in 1/3) ---- */
if (typeof qs !== "function") {
  window.qs = (id) => document.getElementById(id);
}
if (typeof pick !== "function") {
  // pick(row, ["a","b"]) => first non-empty value
  window.pick = (row, keys) => {
    if (!row || !keys) return "";
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };
}
if (typeof normalizeId_ !== "function") {
  window.normalizeId_ = (s) => String(s || "").trim();
}
if (typeof fetchJsonRobust !== "function") {
  window.fetchJsonRobust = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return {}; }
  };
}

/* ---------- Photo Parsing ---------- */

function collectPhotoUrls(row){
  // 1) single field list (comma/newline)
  const bulk = pick(row, ["photos_img", "photos", "相片", "照片牆", "photo_wall"]);
  let urls = [];

  if (bulk) {
    urls = urls.concat(
      bulk
        .split(/[\n,，;]/g)
        .map(s => String(s).trim())
        .filter(Boolean)
    );
  }

  // 2) photo1..photo12
  for (let i = 1; i <= 12; i++) {
    const v = pick(row, [`photo${i}`, `photo_${i}`, `照片${i}`, `相片${i}`, `photo${i}_img`]);
    if (v) urls.push(v);
  }

  // 3) remove duplicates
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

/* ---------- Lightbox (contain) ---------- */

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

  overlay.addEventListener("click", (e)=>{
    if (e.target === overlay) hide();
  });
  close.addEventListener("click", hide);
  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") hide();
  });
}

function openLightbox(url){
  ensureLightbox_();
  const overlay = qs("lightboxOverlay");
  const img = qs("lightboxImg");
  if(!overlay || !img) return;
  img.src = url;
  overlay.style.display = "flex";
}

/* ---------- Photo Wall dynamic balance ---------- */

function setPhotoGridBalance_(gridEl, n){
  // ✅ 動態平衡：1=1欄、2=2欄、3+=3欄
  let cols = 3;
  if (n <= 1) cols = 1;
  else if (n === 2) cols = 2;
  else cols = 3;

  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // 1 張時給它更好看：略長方（避免空白感）
  if (n === 1) {
    gridEl.querySelectorAll("img").forEach(im=>{
      im.style.aspectRatio = "16 / 10";
      im.style.objectFit = "cover";
    });
  } else {
    gridEl.querySelectorAll("img").forEach(im=>{
      im.style.aspectRatio = "1 / 1";
      im.style.objectFit = "cover";
    });
  }
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

  // ✅ 關鍵：避免「空白」— 用 JS 依數量調整欄位
  setPhotoGridBalance_(grid, urls.length);
}

/* ---------- Load + Boot ---------- */

async function loadAndRenderById(id){
  const cid = normalizeId_(id) || (window.CONFIG && CONFIG.DEFAULT_ID) || "TW0001";
  const gas = (window.CONFIG && CONFIG.GAS) ? CONFIG.GAS : "";

  if(!gas){
    console.warn("CONFIG.GAS missing");
    return;
  }

  const url = `${gas}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const data = await fetchJsonRobust(url);

    // allow payload shapes: {ok:true,row:{...}} OR {...directRow}
    const row = (data && data.row && typeof data.row === "object") ? data.row : data;

    renderCard(row);
    renderPhotoWall(row);

    // version tag
    const v = qs("versionTag");
    if(v) v.textContent = "v400";

  }catch(err){
    console.error(err);
    safeSetText("u-name", "載入失敗");
  }
}

function getIdFromUrl(){
  const sp = new URLSearchParams(location.search);
  return sp.get("id") || sp.get("cid") || "";
}

/* boot */
(function boot(){
  try{
    ensureLightbox_();
    const id = getIdFromUrl() || (window.CONFIG && CONFIG.DEFAULT_ID) || "TW0001";
    loadAndRenderById(id);
  }catch(e){
    console.error(e);
  }
})();