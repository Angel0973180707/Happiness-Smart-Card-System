/* ================================
 * Happiness Smart Card System
 * app.js v400.2 (COMPLETE OVERWRITE) 1/3
 * - FIX: GAS payload compatibility (direct row OR {ok,data/row})
 * - FIX: robust fetch + timeout + retry
 * - Keep: theme switch (free/premium + theme/style/paper)
 * - Keep: goFillForm()
 * ================================ */

const CONFIG = {
  // ✅ 你目前正在用的這支 API（AMI-E）
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

  // ✅ 舊的備援（如果你要留）
  GAS_BACKUP: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",

  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v400.2",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,
};

let currentRow = null;

/* ---------- DOM ---------- */
function qs(id){ return document.getElementById(id); }

/* ---------- Text / Key normalize ---------- */
function text(v){ return (v==null ? "" : String(v)).trim(); }

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

/* ---------- Fetch (robust) ---------- */
async function fetchWithTimeout_(url, timeoutMs){
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
      // GAS 有時夾雜字元：抽出第一段 JSON
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
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

/* ---------- URL / Images ---------- */
function isUrl_(s){ return /^https?:\/\//i.test(String(s||"").trim()); }

function normalizeUrl_(s){
  let v = String(s||"").trim();
  if(!v) return "";
  if(v.startsWith("http://")) v = "https://" + v.slice(7);
  if(isUrl_(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}

function normalizeImageUrl_(raw){
  let url = normalizeUrl_(raw);
  if(!url) return "";

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

/* ---------- Theme Switching (used by HTML onclick) ---------- */
function setV382(mode, theme, el){
  document.body.className = "";

  if(mode === "free"){
    document.body.classList.add("mode-free", theme);
    const fc = qs("free-controls");
    const pr = qs("premiumDotsRow");
    if(fc) fc.style.display = "block";
    if(pr) pr.style.display = "none";
  }else{
    document.body.classList.add("mode-premium", theme);
    const fc = qs("free-controls");
    const pr = qs("premiumDotsRow");
    if(fc) fc.style.display = "none";
    if(pr) pr.style.display = "flex";
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

/* expose to window (because HTML uses onclick="...") */
window.setV382 = setV382;
window.setV382Style = setV382Style;
window.setV382Paper = setV382Paper;
window.goFillForm = goFillForm;

/* ========== 2/3 will add: renderCard (name/unit/title/slogan/logo/blocks/docks) ========== */
/* ========== 3/3 will add: photo wall + lightbox + load/boot + safer admin hotspot ========== */
/* ================================
 * app.js v400.2 (2/3)
 * Render Card + Docks + Address Navigation + Logo + Blocks
 * ================================ */

function safeSetText(id, val){
  const el = qs(id);
  if(!el) return;
  el.textContent = text(val);
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

function escapeHtml_(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

/* ---------- Logo / Avatar ---------- */
function renderLogo_(p){
  // 你的 payload 同時有：Logo / logo
  const logoRaw = pick(p, ["Logo_fast","Logo","logo_fast","logo","logo_img","logo圖片","logo圖片連結","logo連結"]);
  const wrap = qs("logoWrap");
  const img  = qs("u-logo");
  if(!wrap || !img) return;

  const u = normalizeImageUrl_(logoRaw);
  if(!u){
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }

  img.onload = () => { wrap.style.display = "block"; };
  img.onerror = () => { wrap.style.display = "none"; };

  const sep = u.includes("?") ? "&" : "?";
  img.src = u + sep + "t=" + Date.now();
}

function renderAvatar_(p){
  // 你的 payload 同時有：個人照 / avatar
  const avatarRaw = pick(p, ["個人照_fast","個人照","形象照_fast","形象照","avatar_fast","avatar","photo_fast","photo","image"]);
  const img = qs("u-img");
  if(!img) return;

  const u = normalizeImageUrl_(avatarRaw);
  if(!u){
    img.removeAttribute("src");
    return;
  }

  img.onerror = () => {
    const u2 = normalizeUrl_(avatarRaw);
    if(u2 && u2 !== u) img.src = u2;
  };

  const sep = u.includes("?") ? "&" : "?";
  img.src = u + sep + "t=" + Date.now();
}

/* ---------- Blocks (服務項目 / 經歷) ---------- */
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
function buildDockBtn_({label, icon, onClick}){
  const b = document.createElement("button");
  b.className = "dock-btn";
  b.type = "button";
  b.innerHTML = `<i class="${icon}"></i><span>${escapeHtml_(label)}</span>`;
  b.addEventListener("click", onClick);
  return b;
}

function renderDocks_(p){
  const mediaDock = qs("mediaDock");
  const mediaBtns = qs("mediaButtons");
  const cDock     = qs("contactDock");
  const cBtns     = qs("contactButtons");

  if(mediaBtns) mediaBtns.innerHTML = "";
  if(cBtns) cBtns.innerHTML = "";

  // ---- Media: 影音 / 社群 ----
  const mediaItems = [
    { k:["影音平台1","影音1","video1","youtube1"], label:"影音1", icon:"fa-solid fa-play" },
    { k:["影音平台2","影音2","video2","youtube2"], label:"影音2", icon:"fa-solid fa-play" },
    { k:["影音平台3","影音3","video3","youtube3"], label:"影音3", icon:"fa-solid fa-play" },
    { k:["社群平台1","社群1","social1","ig","instagram","facebook","fb"], label:"社群1", icon:"fa-solid fa-users" },
    { k:["社群平台2","社群2","social2"], label:"社群2", icon:"fa-solid fa-users" },
    { k:["社群平台3","社群3","social3"], label:"社群3", icon:"fa-solid fa-users" }
  ];

  let hasMedia = false;
  mediaItems.forEach(it=>{
    const v = pick(p, it.k);
    if(!text(v)) return;
    hasMedia = true;
    if(mediaBtns){
      mediaBtns.appendChild(buildDockBtn_({
        label: it.label,
        icon: it.icon,
        onClick: ()=> openUrl_(v)
      }));
    }
  });
  if(mediaDock) mediaDock.style.display = hasMedia ? "" : "none";

  // ---- Contact: LINE / 微信 / 電話 / Email / 地址 ----
  const phone    = pick(p, ["電話","phone","mobile"]);
  const email    = pick(p, ["Email","email","信箱"]);
  const lineOA   = pick(p, ["LINE官方帳號","line官方帳號","line_oa","line官網"]);
  const lineLink = pick(p, ["LINE連結","line連結","line_link","line"]);
  const wechat   = pick(p, ["微信","微信id","wechat","wechat_id"]);
  const address  = pick(p, ["地址","address","導航地址"]);

  const contactList = [];

  if(text(lineOA)){
    contactList.push({
      label:"LINE 官網",
      icon:"fa-brands fa-line",
      action: ()=> openUrl_(lineOA)
    });
  }

  if(text(wechat)){
    contactList.push({
      label:"微信ID",
      icon:"fa-brands fa-weixin",
      action: async ()=> {
        try{
          if(navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(text(wechat));
          }
        }catch{}
        alert("✅ 已複製微信ID");
      }
    });
  }

  if(text(phone)){
    contactList.push({
      label:"電話",
      icon:"fa-solid fa-phone",
      action: ()=> { location.href = `tel:${text(phone)}`; }
    });
  }

  if(text(email)){
    contactList.push({
      label:"Email",
      icon:"fa-solid fa-envelope",
      action: ()=> { location.href = `mailto:${text(email)}`; }
    });
  }

  if(text(address)){
    contactList.push({
      label:"地址",
      icon:"fa-solid fa-location-dot",
      action: ()=> openMapByAddress_(address)
    });
  }

  // 沒有 LINE 官網才補個人 LINE
  if(text(lineLink) && !text(lineOA)){
    contactList.push({
      label:"LINE",
      icon:"fa-brands fa-line",
      action: ()=> openUrl_(lineLink)
    });
  }

  let hasContact = false;
  contactList.forEach(x=>{
    hasContact = true;
    if(cBtns){
      cBtns.appendChild(buildDockBtn_({
        label: x.label,
        icon: x.icon,
        onClick: x.action
      }));
    }
  });
  if(cDock) cDock.style.display = hasContact ? "" : "none";
}

/* ---------- Main render ---------- */
function renderCard(row){
  const p = buildNormalizedPayload_(row || {});
  currentRow = p;

  const name  = pick(p, ["姓名","name"]);
  const unit  = pick(p, ["單位","unit"]);
  const title = pick(p, ["頭銜","職稱","title"]);

  safeSetText("u-name", name || "未命名");
  safeSetText("u-unit", unit);
  safeSetText("u-title", title);

  // 你的回傳是「理念標語」
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
}
/* ================================
 * app.js v400.2 (3/3)
 * Photo Wall + Lightbox + Robust Load + Safer Admin Hotspot
 * ================================ */

/* ---------- Photo Parsing ---------- */
function collectPhotoUrls_(p){
  let urls = [];

  // ① photos (array) / photos_full (array)
  if (Array.isArray(p.photos)) urls = urls.concat(p.photos);
  if (Array.isArray(p.photos_full)) urls = urls.concat(p.photos_full);

  // ② 照片（逗號/換行字串）
  const bulk = pick(p, ["照片_fast","照片","photos_img","photos","photo_wall"]);
  if (bulk) {
    urls = urls.concat(
      String(bulk)
        .split(/[\n,，;]/g)
        .map(s => s.trim())
        .filter(Boolean)
    );
  }

  // ③ photo1..photo12 / 照片1..照片12
  for (let i = 1; i <= 12; i++) {
    const v = pick(p, [`photo${i}`, `photo_${i}`, `照片${i}`, `相片${i}`]);
    if (v) urls.push(v);
  }

  // 去重 + 正規化（Drive/Dropbox）
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

/* ---------- Lightbox (contain) ---------- */
function ensureLightbox_(){
  if (qs("lightboxOverlay")) return;

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
    box-shadow:0 20px 60px rgba(0,0,0,0.35);
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
    if(e.target === overlay) hide();
  });
  close.addEventListener("click", hide);
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") hide();
  });
}

function openLightbox_(url){
  ensureLightbox_();
  const overlay = qs("lightboxOverlay");
  const img = qs("lightboxImg");
  if(!overlay || !img) return;
  img.src = url;
  overlay.style.display = "flex";
}

/* ---------- Photo Wall dynamic balance ---------- */
function setPhotoGridBalance_(grid, n){
  let cols = 3;
  if(n <= 1) cols = 1;
  else if(n === 2) cols = 2;
  else cols = 3;

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // 1 張：更像展示（避免很空）
  const imgs = grid.querySelectorAll("img");
  imgs.forEach(im=>{
    im.style.objectFit = "cover";
    im.style.aspectRatio = (n === 1) ? "16 / 10" : "1 / 1";
  });
}

function renderPhotoWall_(p){
  const wall = qs("photoWall");
  const grid = qs("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";

  const urls = collectPhotoUrls_(p);
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
    img.addEventListener("click", ()=> openLightbox_(u));
    grid.appendChild(img);
  });

  wall.style.display = "";
  setPhotoGridBalance_(grid, urls.length);
}

/* ---------- Payload shape normalizer ---------- */
function extractRow_(data){
  // 你的實際回傳「可能是整包 row 直接 JSON」
  // 也可能是 {ok:true, data:{...}} 或 {ok:true, row:{...}}
  if(!data || typeof data !== "object") return null;

  if(data.data && typeof data.data === "object") return data.data;
  if(data.row && typeof data.row === "object") return data.row;

  // 如果裡面就已經有「姓名/單位」這類欄位，當成 row
  if(("姓名" in data) || ("name" in data) || ("單位" in data) || ("unit" in data)) return data;

  // 如果是 {ok:true, ...但 row 放在其他 key}：最後退回整包
  return data;
}

/* ---------- Robust Load ---------- */
async function loadAndRenderById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;

  // ✅ 這次用你指定的 API（CONFIG.GAS）
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const data = await fetchJsonRobust_(url);

    // ✅ 如果 GAS 有 ok=false，就判斷
    if(data && data.ok === false) throw new Error(data.error || "ok=false");

    const row = extractRow_(data);
    if(!row) throw new Error("No row");

    renderCard(row);

    const p = buildNormalizedPayload_(row);
    renderPhotoWall_(p);

    const v = qs("versionTag");
    if(v) v.textContent = CONFIG.VERSION;

  }catch(err){
    console.error("LOAD FAIL:", err);
    safeSetText("u-name", "載入失敗");
  }
}

/* ---------- Safer Admin Hotspot (三連點 + 小區域) ---------- */
function setupAdminHotspot_(){
  const spot = qs("adminHotspotTop");
  if(!spot) return;

  // ✅ 小一點、最上方、完全不壓到方案鈕（位置靠 CSS）
  let taps = 0;
  let timer = null;

  spot.addEventListener("click", ()=>{
    taps++;
    clearTimeout(timer);
    timer = setTimeout(()=>{ taps = 0; }, 900);

    if(taps >= 3){
      taps = 0;
      const pass = prompt("管理入口");
      if(pass === "angel"){
        alert("進入後臺（預留）");
        // TODO: 之後在這裡導向隱形工作區（例如 location.href='admin.html'）
      }
    }
  }, { passive:true });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  try{
    ensureLightbox_();
    setupAdminHotspot_();

    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    loadAndRenderById_(id);
  }catch(e){
    console.error(e);
  }
}, { once:true });