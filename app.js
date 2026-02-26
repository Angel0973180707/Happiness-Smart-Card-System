/* ================================
 * app.js v401 COMPLETE OVERWRITE (1/3)
 * ✅ 主題變數（--p/--s）驅動 banner/按鈕/底色
 * ✅ 修正：方案/色系/版型/紙感 可選可預覽
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v401",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,
};

let currentRow = null;

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
function getIdFromUrl_(){
  try{
    const sp = new URLSearchParams(location.search);
    return sp.get("id") || sp.get("cid") || "";
  }catch{ return ""; }
}

/* ---------- Theme vars ---------- */
function setThemeVars_(theme){
  const map = {
    // free
    "color-1":["#ff6b6b","#ff3b3b"],
    "color-2":["#00a8ff","#0097e6"],
    "color-3":["#ffa502","#ff7f00"],
    "color-4":["#7d5fff","#5f27cd"],
    "color-5":["#2ecc71","#10ac84"],
    // premium
    "p1":["#a36d6d","#7a4a4a"],
    "p2":["#722f37","#4e1f25"],
    "p3":["#1c2e42","#101d2b"],
    "p4":["#5e548e","#40376b"],
    "p5":["#7a94a6","#5b7383"],
    "p6":["#bf953f","#8f6b1c"],
    "p7":["#444444","#222222"],
  };
  const pair = map[theme] || map["color-1"];
  document.documentElement.style.setProperty("--p", pair[0]);
  document.documentElement.style.setProperty("--s", pair[1]);

  // 色點按鈕自動上色（不用你手寫 style）
  document.querySelectorAll(".dot[data-theme], .p-dot[data-theme]").forEach(btn=>{
    const th = btn.getAttribute("data-theme");
    const p = (map[th]||[])[0];
    if(p) btn.style.background = p;
  });
}

/* ---------- Active UI helpers ---------- */
function setActiveWithin_(scopeSel, el){
  try{
    document.querySelectorAll(scopeSel + " .active").forEach(x=>x.classList.remove("active"));
    if(el) el.classList.add("active");
  }catch{}
}

/* ---------- Public (HTML onclick) ---------- */
function setTheme(mode, theme, el){
  // 保留 style/paper 目前狀態
  const keepStyle = (document.body.className.match(/style-(arch|flat|spot)/) || [,"arch"])[1];
  const keepPaper = (document.body.className.match(/paper-(1|2|3)/) || [,"1"])[1];

  document.body.className = "";
  document.body.classList.add("mode-"+mode, theme, "style-"+keepStyle, "paper-"+keepPaper);

  // show/hide controls
  const fc = qs("free-controls");
  const pr = qs("premiumDotsRow");
  if(mode === "free"){
    if(fc) fc.style.display = "block";
    if(pr) pr.style.display = "none";
  }else{
    if(fc) fc.style.display = "none";
    if(pr) pr.style.display = "flex";
  }

  setThemeVars_(theme);

  // active buttons
  setActiveWithin_("#admin-panel", null);
  // 方案鈕要維持 active
  if(mode === "free") qs("btnPlanFree")?.classList.add("active");
  else qs("btnPlanPremium")?.classList.add("active");

  if(el) el.classList.add("active");
}

function setStyle(style, el){
  document.body.classList.remove("style-arch","style-flat","style-spot");
  document.body.classList.add("style-"+style);
  setActiveWithin_("#free-controls .btn-row:nth-of-type(2)", el);
  applyStylePreview_();
}

function setPaper(paper, el){
  document.body.classList.remove("paper-1","paper-2","paper-3");
  document.body.classList.add(paper);
  setActiveWithin_("#free-controls .btn-row:nth-of-type(3)", el);
}

function goFillForm(){
  window.open(CONFIG.FORM, "_blank");
}

window.setTheme = setTheme;
window.setStyle = setStyle;
window.setPaper = setPaper;
window.goFillForm = goFillForm;
/* ================================
 * app.js v401 (2/3)
 * ✅ 渲染：avatar / logo（候選連結＋顯示容錯）
 * ✅ Dock：影音/社群獨立、不同 icon class、自動平衡
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

function normalizeUrl_(s){
  let v = String(s||"").trim();
  if(!v) return "";
  if(v.startsWith("http://")) v = "https://" + v.slice(7);
  if(/^https?:\/\//i.test(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}
function driveIdFromUrl_(u){
  const s = String(u||"").trim();
  if(!s) return "";
  const mFile = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return mFile[1];
  const mId = s.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return decodeURIComponent(mId[1]);
  const mThumb = s.match(/thumbnail\?id=([^&]+)/i);
  if(mThumb && mThumb[1]) return decodeURIComponent(mThumb[1]);
  const mUc = s.match(/uc\?[^#]*id=([^&]+)/i);
  if(mUc && mUc[1]) return decodeURIComponent(mUc[1]);
  return "";
}
function normalizeImageUrl_(raw){
  let url = normalizeUrl_(raw);
  if(!url) return "";
  if(url.includes("dropbox.com")){
    url = url.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }
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

function safeSetText_(id, val){
  const el = qs(id);
  if(el) el.textContent = text(val);
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
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`, "_blank");
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
  if(btns.length % 2 === 1) btns[btns.length - 1].classList.add("wide");
}

/* ----- Logo / Avatar ----- */
function renderAvatar_(p){
  const raw = pick(p, ["個人照_fast","個人照","avatar_fast","avatar","形象照","photo"]);
  const img = qs("u-img");
  if(!img) return;
  const u = normalizeImageUrl_(raw);
  if(!u){ img.removeAttribute("src"); return; }
  setImgWithFallback_(img, buildImgCandidates_(u));
}
function renderLogo_(p){
  const raw = pick(p, ["Logo_fast","Logo","logo_fast","logo","logo_img"]);
  const wrap = qs("logoWrap");
  const img  = qs("u-logo");
  if(!wrap || !img) return;

  const u = normalizeImageUrl_(raw);
  if(!u){
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }
  img.onload = ()=>{ wrap.style.display = "flex"; };
  img.onerror = ()=>{ wrap.style.display = "none"; };
  setImgWithFallback_(img, buildImgCandidates_(u));
}

/* ----- Blocks ----- */
function renderBlocks_(p){
  const service = pick(p, ["服務項目","service","services"]);
  const exp     = pick(p, ["經歷","experience","exp"]);

  const b1 = qs("block-service");
  const b2 = qs("block-exp");

  if(b1){
    if(text(service)){
      b1.style.display = "";
      b1.innerHTML = `<div class="block-title">服務項目</div><div class="block-body">${escapeHtml_(service)}</div>`;
    }else{ b1.style.display="none"; b1.innerHTML=""; }
  }
  if(b2){
    if(text(exp)){
      b2.style.display = "";
      b2.innerHTML = `<div class="block-title">經歷</div><div class="block-body">${escapeHtml_(exp)}</div>`;
    }else{ b2.style.display="none"; b2.innerHTML=""; }
  }
}

/* ----- Docks ----- */
function renderDocks_(p){
  const mediaDock = qs("mediaDock");
  const mediaBtns = qs("mediaButtons");
  const cDock     = qs("contactDock");
  const cBtns     = qs("contactButtons");

  if(mediaBtns) mediaBtns.innerHTML = "";
  if(cBtns) cBtns.innerHTML = "";

  // 影音/社群（你表單的欄位名可能不同，這裡做容錯）
  const mediaItems = [
    { k:["影音平台","影音平台1","影音1","YouTube","youtube"], label:"YouTube", icon:"fa-brands fa-youtube" },
    { k:["IG","Instagram","instagram"], label:"Instagram", icon:"fa-brands fa-instagram" },
    { k:["FB","Facebook","facebook"], label:"Facebook", icon:"fa-brands fa-facebook" },
    { k:["社群平台","社群平台1","社群1"], label:"社群/平台", icon:"fa-solid fa-share-nodes" },
    { k:["官網","網站","website","web"], label:"官網", icon:"fa-solid fa-globe" },
  ];

  let hasMedia = false;
  for(const it of mediaItems){
    const v = pick(p, it.k);
    if(!text(v)) continue;
    hasMedia = true;
    const cls = classifyDockClass_(v);
    mediaBtns?.appendChild(buildDockBtn_({
      label: it.label,
      icon: it.icon,
      extraClass: cls,
      onClick: ()=> openUrl_(v)
    }));
  }
  if(mediaDock) mediaDock.style.display = hasMedia ? "" : "none";
  applyWideRule_(mediaBtns);

  // 聯繫（LINE/微信/電話/email/地址）
  const phone   = pick(p, ["電話","phone","mobile"]);
  const email   = pick(p, ["Email","email","信箱"]);
  const lineOA  = pick(p, ["LINE官方帳號","line_oa","line官網","line_official"]);
  const lineLink= pick(p, ["LINE連結","line_link","line"]);
  const wechat  = pick(p, ["微信","wechat","wechat_id"]);
  const address = pick(p, ["地址","address"]);

  const list = [];

  if(text(lineOA)) list.push({ label:"LINE 官網", icon:"fa-brands fa-line", cls:"dock-line", action:()=>openUrl_(lineOA) });
  if(text(lineLink) && !text(lineOA)) list.push({ label:"LINE", icon:"fa-brands fa-line", cls:"dock-line", action:()=>openUrl_(lineLink) });

  if(text(wechat)){
    list.push({
      label:"微信ID",
      icon:"fa-brands fa-weixin",
      cls:"dock-web",
      action: async ()=>{
        try{ await navigator.clipboard?.writeText(text(wechat)); }catch{}
        alert("✅ 已複製微信ID");
      }
    });
  }
  if(text(phone)) list.push({ label:"電話", icon:"fa-solid fa-phone", cls:"dock-web", action:()=>location.href=`tel:${text(phone)}` });
  if(text(email)) list.push({ label:"Email", icon:"fa-solid fa-envelope", cls:"dock-web", action:()=>location.href=`mailto:${text(email)}` });
  if(text(address)) list.push({ label:"地址", icon:"fa-solid fa-location-dot", cls:"dock-map", action:()=>openMapByAddress_(address) });

  let hasContact = false;
  for(const x of list){
    hasContact = true;
    cBtns?.appendChild(buildDockBtn_({ label:x.label, icon:x.icon, extraClass:x.cls, onClick:x.action }));
  }
  if(cDock) cDock.style.display = hasContact ? "" : "none";
  applyWideRule_(cBtns);
}

/* ----- Preview style hook（你若未來要做拱/平/晨曦的遮罩差異可擴） ----- */
function applyStylePreview_(){
  // 先保留鉤子，不破壞世界觀：這裡你未來要做正拱/平直/晨曦的遮罩變化可直接加
}
/* ================================
 * app.js v401 (3/3)
 * ✅ 照片牆：等比例一致縮圖＋動態平衡不留空
 * ✅ Lightbox
 * ✅ 右下角三擊隱形後臺入口（保留）
 * ✅ Robust load/boot
 * ================================ */

async function fetchWithTimeout_(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", cache:"no-store", redirect:"follow", signal: controller.signal });
    const txt = await res.text();
    const body = (txt||"").trim();
    if(!body) throw new Error("Empty response");
    try{ return JSON.parse(body); }
    catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
  }finally{ clearTimeout(t); }
}
async function fetchJsonRobust_(url){
  let last = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{ return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS); }
    catch(e){ last = e; await new Promise(r=>setTimeout(r, 520 + i*520)); }
  }
  throw last || new Error("Fetch failed");
}

function extractRowFromPayload_(data){
  if(!data || typeof data !== "object") return null;
  if(data.data && typeof data.data === "object") return data.data;
  if(data.row && typeof data.row === "object") return data.row;
  if(data.id || data["姓名"] || data.name) return data;
  return null;
}

/* photo collect */
function collectPhotoUrls_(p){
  let urls = [];
  if(Array.isArray(p.photos)) urls = urls.concat(p.photos);
  if(Array.isArray(p.photos_full)) urls = urls.concat(p.photos_full);

  const bulk = pick(p, ["照片_fast","照片","photos_img","photos","photo_wall"]);
  if(text(bulk)){
    urls = urls.concat(String(bulk).split(/[\n,，;]/g).map(s=>s.trim()).filter(Boolean));
  }
  for(let i=1;i<=12;i++){
    const v = pick(p, [`photo${i}`,`photo_${i}`,`照片${i}`,`相片${i}`]);
    if(text(v)) urls.push(v);
  }

  const seen = new Set();
  const out = [];
  urls.forEach(u=>{
    const nu = normalizeImageUrl_(u);
    if(!nu || seen.has(nu)) return;
    seen.add(nu);
    out.push(nu);
  });
  return out;
}

/* lightbox */
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
    max-width:100%; max-height:100%;
    object-fit:contain; border-radius:16px;
    box-shadow:0 20px 60px rgba(0,0,0,0.35);
    background:rgba(255,255,255,0.06);
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

/* ✅ 照片牆：動態平衡不留空（1=1col, 2=2col, 3-4=2col, 5-9=3col, 10+=4col）
 * 並且：若最後一列落單 → 讓最後一張 span 全列（不留空）
 */
function layoutPhotoGrid_(grid, n){
  let cols = 3;
  if(n <= 1) cols = 1;
  else if(n === 2) cols = 2;
  else if(n <= 4) cols = 2;
  else if(n <= 9) cols = 3;
  else cols = 4;

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // 清掉舊的 span
  Array.from(grid.children).forEach(el=>el.style.gridColumn="");

  if(cols > 1){
    const remainder = n % cols;
    if(remainder === 1){
      // 最後一張拉滿整列
      const last = grid.lastElementChild;
      if(last) last.style.gridColumn = "1 / -1";
    }
  }
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

  urls.forEach(u=>{
    const img = document.createElement("img");
    img.className = "wall-img";
    img.alt = "照片";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    setImgWithFallback_(img, buildImgCandidates_(u));
    img.addEventListener("click", ()=> openLightbox_(u));
    grid.appendChild(img);
  });

  wall.style.display = "";
  layoutPhotoGrid_(grid, urls.length);
}

/* ✅ 右下角三擊隱形後臺入口（保留） */
function setupAdminHotspotBR_(){
  const spot = qs("adminHotspotBR");
  if(!spot) return;
  let taps = 0;
  let timer = null;

  spot.addEventListener("click", ()=>{
    taps++;
    clearTimeout(timer);
    timer = setTimeout(()=>{ taps = 0; }, 900);
    if(taps >= 3){
      taps = 0;
      alert("✅ 進入隱形後臺（v401 預留工作區）");
      // TODO: 之後在這裡打開你的工作區（輸入序號/姓名、一鍵交貨、預覽等）
    }
  });
}

/* render card */
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
    if(text(slogan)){ sEl.style.display=""; sEl.textContent=text(slogan); }
    else{ sEl.style.display="none"; sEl.textContent=""; }
  }

  renderAvatar_(p);
  renderLogo_(p);
  renderBlocks_(p);
  renderDocks_(p);

  qs("versionTag") && (qs("versionTag").textContent = CONFIG.VERSION);
}

/* load */
async function loadAndRenderById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const payload = await fetchJsonRobust_(url);
    const row = extractRowFromPayload_(payload);
    if(!row) throw new Error("Invalid payload shape");

    renderCard(row);
    renderPhotoWall_(row);
  }catch(err){
    console.error("LOAD FAIL:", err);
    safeSetText_("u-name", "載入失敗");
  }
}

(function boot_(){
  try{
    // 初始化色點自動上色
    setThemeVars_((document.body.className.match(/\b(color-\d|p\d)\b/)||[])[1] || "color-1");

    ensureLightbox_();
    setupAdminHotspotBR_();

    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    loadAndRenderById_(id);
  }catch(e){
    console.error(e);
  }
})();