/* ================================
 * Happiness Smart Card System
 * app.js v400.4 (COMPLETE OVERWRITE) 1/3
 * - Keep ALL original functions (no trimming)
 * - Robust GAS payload support:
 *   A) direct row JSON
 *   B) { ok:true, data:{...} } or { ok:true, row:{...} } or { data:{...} }
 * - Theme switch: free/premium + theme/style/paper
 * - URL/Image normalize: Google Drive file/d -> uc?export=view&id=
 * - Admin hotspot: bottom-right triple-tap (no password)
 * ================================ */

const CONFIG = {
  // ⚠️ 這裡請換成你「正在使用的」GAS API（你說的那支）
  // 例如： "https://script.google.com/macros/s/AKfycby.../exec"
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v400.4",

  FETCH_TIMEOUT_MS: 15000,
  RETRY: 2,
};

let currentRow = null;

/* ---------- DOM ---------- */
function qs(id){ return document.getElementById(id); }

/* ---------- Basic utils ---------- */
function text(v){ return (v==null ? "" : String(v)).trim(); }

function sleep_(ms){ return new Promise(r => setTimeout(r, ms)); }

/* ---------- Key normalize (handles weird headers/quotes/newlines) ---------- */
function cleanKey_(k){
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/[\n\r"]/g, "")
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

    // keep first non-empty
    if(out[nk]==null || text(out[nk])==="") out[nk] = v;

    // lower map
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

/* ---------- ID normalize ---------- */
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
      // try extract JSON block if GAS mixed logs/html
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
      await sleep_(520 + i*680);
    }
  }
  throw last || new Error("Fetch failed");
}

/* ---------- URL normalize ---------- */
function isUrl_(s){ return /^https?:\/\//i.test(String(s||"").trim()); }

function normalizeUrl_(s){
  let v = String(s||"").trim();
  if(!v) return "";
  if(v.startsWith("http://")) v = "https://" + v.slice(7);
  if(isUrl_(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}

/* ---------- Image URL normalize (Drive/Dropbox) ---------- */
function normalizeDriveToUc_(url){
  const u = String(url||"").trim();
  if(!u) return "";

  // file/d/<id>/view
  const mFile = u.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mFile[1])}`;

  // open?id=<id>
  const mId = u.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mId[1])}`;

  // uc?export=view&id=...
  if(u.includes("drive.google.com/uc?")) return u;

  return u;
}

function normalizeImageUrl_(raw){
  let url = normalizeUrl_(raw);
  if(!url) return "";

  // Dropbox share -> raw
  if(url.includes("dropbox.com")){
    url = url.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }

  // Google Drive to uc view
  if(url.includes("drive.google.com")){
    return normalizeDriveToUc_(url);
  }

  return url;
}

/* ---------- Theme Switching (HTML onclick uses these) ---------- */
function setV382(mode, theme, el){
  // ✅ 不要把 body.className 清空到「只剩 mode」，會讓紙感/版型掉光導致版面看起來歪
  // 改成：保留既有 style-*/paper-*（如果有）
  const keep = [];
  document.body.classList.forEach(c=>{
    if(c.startsWith("style-") || c.startsWith("paper-")) keep.push(c);
  });

  document.body.className = "";
  keep.forEach(c=>document.body.classList.add(c));

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

  // 只處理 style 那排的 active：避免 plan/paper 被一起清掉
  // 但你目前 HTML 都是 btn-neo，所以先保留全清，再把目前這顆設 active
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

/* expose for inline onclick */
window.setV382 = setV382;
window.setV382Style = setV382Style;
window.setV382Paper = setV382Paper;
window.goFillForm = goFillForm;

/* ---------- Admin hotspot: bottom-right triple tap, no password ---------- */
function setupAdminHotspot_(){
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
      // ✅ 不設密碼：先做預留入口（之後你要接工作區）
      alert("✅ 進入隱形後臺（預留工作區）");
    }
  });
}
/* ================================
 * app.js v400.4 (2/3)
 * Render Card + Blocks + Media/Contact Docks (with variation)
 * - Media dock: platform detection => different button class
 * - Contact dock: 2-col grid + last odd button becomes wide
 * ================================ */

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

/* ---------- Image set helpers ---------- */
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

function buildImageCandidates_(raw){
  const s = text(raw);
  if(!s) return [];

  const original = s.startsWith("http://") ? "https://" + s.slice(7) : s;
  const normalized = normalizeImageUrl_(original);

  // Drive: also try thumbnail as fallback
  const mId = normalized.match(/drive\.google\.com\/uc\?export=view&id=([^&]+)/i);
  if(mId && mId[1]){
    const id = decodeURIComponent(mId[1]);
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
      normalized
    ].filter(Boolean);
  }

  return [normalized].filter(Boolean);
}

/* ---------- Logo / Avatar ---------- */
function renderLogo_(p){
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

  img.onload  = ()=>{ wrap.style.display = "block"; };
  img.onerror = ()=>{ wrap.style.display = "none"; };

  setImgWithFallback_(img, buildImageCandidates_(u));
}

function renderAvatar_(p){
  const avatarRaw = pick(p, ["個人照_fast","個人照","形象照_fast","形象照","avatar_fast","avatar","photo_fast","photo","image"]);
  const img = qs("u-img");
  if(!img) return;

  const u = normalizeImageUrl_(avatarRaw);
  if(!u){
    img.removeAttribute("src");
    return;
  }

  setImgWithFallback_(img, buildImageCandidates_(u));
}

/* ---------- Blocks (服務項目/經歷) ---------- */
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

/* ---------- Platform detection (影音/社群要有變化) ---------- */
function detectPlatform_(url){
  const u = String(url||"").toLowerCase();
  if(u.includes("youtube.com") || u.includes("youtu.be")) return "yt";
  if(u.includes("facebook.com") || u.includes("fb.com")) return "fb";
  if(u.includes("instagram.com")) return "ig";
  if(u.includes("line.me") || u.includes("lin.ee")) return "line";
  return "web";
}

/* ---------- Dock button builder ---------- */
function buildDockBtn_({label, icon, onClick, extraClass}){
  const b = document.createElement("button");
  b.className = `dock-btn ${extraClass||""}`.trim();
  b.type = "button";
  b.innerHTML = `<i class="${icon}"></i><span>${escapeHtml_(label)}</span>`;
  b.addEventListener("click", onClick);
  return b;
}

/* ---------- Media Dock ---------- */
function renderMediaDock_(p){
  const mediaDock = qs("mediaDock");
  const mediaBtns = qs("mediaButtons");
  if(!mediaDock || !mediaBtns) return;

  mediaBtns.innerHTML = "";

  // 你的回傳：影音平台1/2/3、社群平台1/2/3
  const items = [
    { k:["影音平台1","影音1","video1","youtube1"], label:"YouTube", icon:"fa-brands fa-youtube" },
    { k:["影音平台2","影音2","video2","youtube2"], label:"影音2",  icon:"fa-solid fa-play" },
    { k:["影音平台3","影音3","video3","youtube3"], label:"影音3",  icon:"fa-solid fa-play" },
    { k:["社群平台1","社群1","social1"],           label:"社群1",  icon:"fa-solid fa-users" },
    { k:["社群平台2","社群2","social2"],           label:"社群2",  icon:"fa-solid fa-users" },
    { k:["社群平台3","社群3","social3"],           label:"社群3",  icon:"fa-solid fa-users" }
  ];

  let has = false;

  items.forEach(it=>{
    const v = pick(p, it.k);
    if(!text(v)) return;

    has = true;
    const plat = detectPlatform_(v);

    // ✅ 讓 CSS 可以做差異化：dock-yt / dock-fb / dock-ig / dock-line / dock-web
    const extra = `dock-${plat}`;

    // icon：依平台更合理
    let icon = it.icon;
    if(plat === "yt") icon = "fa-brands fa-youtube";
    else if(plat === "fb") icon = "fa-brands fa-facebook";
    else if(plat === "ig") icon = "fa-brands fa-instagram";
    else if(plat === "line") icon = "fa-brands fa-line";
    else icon = "fa-solid fa-globe";

    // label：平台優先，其次原 label
    let label = it.label;
    if(plat === "yt") label = "YouTube";
    else if(plat === "fb") label = "Facebook";
    else if(plat === "ig") label = "Instagram";
    else if(plat === "line") label = "LINE";
    else label = (label || "網站");

    mediaBtns.appendChild(buildDockBtn_({
      label,
      icon,
      extraClass: extra,
      onClick: ()=> openUrl_(v)
    }));
  });

  mediaDock.style.display = has ? "" : "none";
}

/* ---------- Contact Dock (2-col + last odd wide) ---------- */
function renderContactDock_(p){
  const cDock = qs("contactDock");
  const cBtns = qs("contactButtons");
  if(!cDock || !cBtns) return;

  cBtns.innerHTML = "";

  const phone   = pick(p, ["電話","phone","mobile"]);
  const email   = pick(p, ["Email","email","信箱"]);
  const lineOA  = pick(p, ["LINE官方帳號","line官方帳號","line_oa","line官網","line官方"]);
  const lineLink= pick(p, ["LINE連結","line連結","line_link","line"]);
  const wechat  = pick(p, ["微信","微信id","wechat","wechat_id"]);
  const address = pick(p, ["地址","address","導航地址"]);

  const list = [];

  if(text(lineOA)){
    list.push({
      label:"LINE 官網",
      icon:"fa-brands fa-line",
      onClick: ()=> openUrl_(lineOA),
      extraClass:"dock-line"
    });
  }else if(text(lineLink)){
    list.push({
      label:"LINE",
      icon:"fa-brands fa-line",
      onClick: ()=> openUrl_(lineLink),
      extraClass:"dock-line"
    });
  }

  if(text(wechat)){
    list.push({
      label:"微信ID",
      icon:"fa-brands fa-weixin",
      onClick: async ()=>{
        try{
          if(navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(text(wechat));
          }
        }catch{}
        alert("✅ 已複製微信ID");
      },
      extraClass:"dock-wechat"
    });
  }

  if(text(phone)){
    list.push({
      label:"電話",
      icon:"fa-solid fa-phone",
      onClick: ()=> { location.href = `tel:${text(phone)}`; },
      extraClass:"dock-phone"
    });
  }

  if(text(email)){
    list.push({
      label:"Email",
      icon:"fa-solid fa-envelope",
      onClick: ()=> { location.href = `mailto:${text(email)}`; },
      extraClass:"dock-email"
    });
  }

  if(text(address)){
    list.push({
      label:"地址",
      icon:"fa-solid fa-location-dot",
      onClick: ()=> openMapByAddress_(address),
      extraClass:"dock-map"
    });
  }

  // render
  list.forEach((x, idx)=>{
    const btn = buildDockBtn_({
      label: x.label,
      icon: x.icon,
      extraClass: x.extraClass || "",
      onClick: x.onClick
    });
    cBtns.appendChild(btn);
  });

  // ✅ 動態平衡：落單的最後一顆拉滿
  if(list.length % 2 === 1){
    const last = cBtns.lastElementChild;
    if(last) last.classList.add("wide");
  }

  cDock.style.display = list.length ? "" : "none";
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

  // ✅ 影音/社群獨立區（有變化）
  renderMediaDock_(p);

  // ✅ 聯繫區：兩欄並排 + 落單拉滿
  renderContactDock_(p);

  // photo wall 在 3/3
}/* ================================
 * app.js v400.4 (3/3)
 * Photo Wall (Drive-safe) + Lightbox + Robust Load/Boot
 * + Admin hotspot bottom-right: triple-tap, no password
 * ================================ */

/* ---------- Drive helpers ---------- */
function driveIdFromUrl_(u){
  const s = String(u||"").trim();
  if(!s) return "";

  // /file/d/<id>/
  const mFile = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return mFile[1];

  // ?id=<id>
  const mId = s.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return decodeURIComponent(mId[1]);

  // thumbnail?id=<id>
  const mThumb = s.match(/thumbnail\?id=([^&]+)/i);
  if(mThumb && mThumb[1]) return decodeURIComponent(mThumb[1]);

  // uc?export=view&id=<id>
  const mUc = s.match(/uc\?[^#]*id=([^&]+)/i);
  if(mUc && mUc[1]) return decodeURIComponent(mUc[1]);

  return "";
}

function normalizePhotoUrl_(raw){
  const s = text(raw);
  if(!s) return "";

  // make https
  let url = s.startsWith("http://") ? "https://" + s.slice(7) : s;

  // dropbox raw
  if(url.includes("dropbox.com")){
    url = url.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }

  // drive => uc view
  const did = driveIdFromUrl_(url);
  if(did) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(did)}`;

  // otherwise keep
  return normalizeUrl_(url);
}

function buildPhotoCandidates_(raw){
  const u = text(raw);
  if(!u) return [];

  const did = driveIdFromUrl_(u);
  if(did){
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(did)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(did)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(did)}`,
      normalizePhotoUrl_(u)
    ].filter(Boolean);
  }
  return [normalizePhotoUrl_(u)].filter(Boolean);
}

/* ---------- Photo collect (support your payload) ---------- */
function collectPhotoUrls_(p){
  let urls = [];

  // 1) photos array
  if(Array.isArray(p.photos)) urls = urls.concat(p.photos);

  // 2) photos_full array
  if(Array.isArray(p.photos_full)) urls = urls.concat(p.photos_full);

  // 3) "照片" string (comma separated)
  const bulk = pick(p, ["照片_fast","照片","photos_img","photos","photo_wall"]);
  if(text(bulk)){
    urls = urls.concat(
      String(bulk)
        .split(/[\n,，;]/g)
        .map(s => s.trim())
        .filter(Boolean)
    );
  }

  // 4) photo1..photo12
  for(let i=1;i<=12;i++){
    const v = pick(p, [`photo${i}`,`photo_${i}`,`照片${i}`,`相片${i}`]);
    if(text(v)) urls.push(v);
  }

  // normalize + dedupe
  const seen = new Set();
  const out = [];
  urls.forEach(u=>{
    const nu = normalizePhotoUrl_(u);
    if(!nu) return;
    if(seen.has(nu)) return;
    seen.add(nu);
    out.push(nu);
  });

  return out;
}

/* ---------- Lightbox (contain) ---------- */
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

  // prefer candidates (drive thumbnail fallback)
  const candidates = buildPhotoCandidates_(url);
  setImgWithFallback_(img, candidates);
  overlay.style.display = "flex";
}

/* ---------- Photo wall dynamic balance ---------- */
function setPhotoGridBalance_(gridEl, n){
  let cols = 3;
  if(n <= 1) cols = 1;
  else if(n === 2) cols = 2;
  else cols = 3;

  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
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

  urls.forEach((u)=>{
    const img = document.createElement("img");
    img.className = "wall-img";
    img.alt = "照片";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    // ✅ 用 candidates 避免 drive link 偶發失敗
    setImgWithFallback_(img, buildPhotoCandidates_(u));
    img.addEventListener("click", ()=> openLightbox_(u));

    grid.appendChild(img);
  });

  wall.style.display = "";
  setPhotoGridBalance_(grid, urls.length);
}

/* ---------- Admin hotspot (bottom-right triple tap, no password) ---------- */
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
      // ✅ 不設密碼：直接進入（預留）
      alert("✅ 進入隱形後臺（預留工作區）");
      // TODO: 之後在這裡開啟你的工作區 modal / page
    }
  });
}

/* ---------- Robust load + boot ---------- */
function extractRowFromPayload_(data){
  if(!data || typeof data !== "object") return null;

  // shapes:
  // A) direct row JSON (your pasted sample)
  // B) { ok:true, data:{...} }
  // C) { ok:true, row:{...} }
  // D) { ok:true, ...fields... }
  if(data.data && typeof data.data === "object") return data.data;
  if(data.row && typeof data.row === "object") return data.row;

  // if has id/name etc, treat as row
  if(data.id || data["姓名"] || data.name) return data;

  return null;
}

async function loadAndRenderById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const payload = await fetchJsonRobust_(url); // ✅ 正確呼叫
    const row = extractRowFromPayload_(payload);
    if(!row) throw new Error("Invalid payload shape");

    renderCard(row);
    renderPhotoWall_(row);

    const vt = qs("versionTag");
    if(vt) vt.textContent = CONFIG.VERSION;

  }catch(err){
    console.error("LOAD FAIL:", err);
    safeSetText_("u-name", "載入失敗");
  }
}

(function boot_(){
  try{
    ensureLightbox_();
    setupAdminHotspotBR_();

    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    loadAndRenderById_(id);
  }catch(e){
    console.error(e);
  }
})();