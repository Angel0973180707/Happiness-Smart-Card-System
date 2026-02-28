/* ================================
 * Happiness Smart Card System
 * app.js v491 (COMPLETE OVERWRITE) 1/3
 * - Base: v408.3
 * - Align: v491 (version + fetch stronger)
 * - Keep ALL existing UI/feature behaviors
 * - NEW: Hidden Admin Panel (triple tap bottom-right hotspot)
 * - Plan A: Unit/Company -> ONE LINE join by " / " (render)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  VERSION: "v491",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3
};

let currentRow = null;

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

function normalizeLink_(s){
  let v = String(s||"").trim();
  if(!v) return "";
  v = v.replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "").trim();
  if(!v) return "";
  if(v.startsWith("//")) v = "https:" + v;
  if(v.startsWith("http://")) v = "https://" + v.slice(7);
  if(/^https?:\/\//i.test(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  const noSpace = !/\s/.test(v);
  const hasDot = /\./.test(v);
  if(noSpace && hasDot) return "https://" + v;
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

  const mOpen = s.match(/drive\.google\.com\/open\?[^#]*id=([^&]+)/i);
  if(mOpen && mOpen[1]) return decodeURIComponent(mOpen[1]);

  const mId = s.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return decodeURIComponent(mId[1]);

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

/* ---------- Canonical key for image de-dup ---------- */
function canonicalImageKey_(rawUrl){
  const u0 = normalizeImageUrl_(rawUrl);
  if(!u0) return "";

  const did = driveIdFromUrl_(u0);
  if(did) return "drive:" + did;

  try{
    const u = new URL(u0);
    ["t","ts","v","ver","cache","cb","_","utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(k=>{
      if(u.searchParams.has(k)) u.searchParams.delete(k);
    });
    if(u.host.includes("dropbox.com")){
      u.searchParams.set("raw","1");
      u.searchParams.delete("dl");
    }
    let path = u.pathname.replace(/\/+$/,"");
    return (u.origin + path + (u.search ? u.search : "")).toLowerCase();
  }catch{
    return u0.toLowerCase().replace(/[?#].*$/,"");
  }
}

/* ---------- UI helpers ---------- */
function setActiveInGroup_(group, el){
  if(!group) return;
  qsa(`[data-group="${group}"]`).forEach(x=>x.classList.remove("active"));
  if(el) el.classList.add("active");
}

/* ---------- State ---------- */
const STATE = {
  mode: "free",
  color: "color-1",
  style: "arch",
  paper: "paper-1",
  premium: "p1"
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
    if(premBadge) premBadge.style.display = "none";
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
/* ---------- Exposed APIs ---------- */
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

/* ---------- Render helpers ---------- */
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
  const u = normalizeLink_(url);
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

/* ---------- LINE helpers ---------- */
function looksLikeLineUrl_(v){
  const s = String(v||"").toLowerCase();
  return s.includes("lin.ee") || s.includes("line.me") || s.startsWith("line://");
}

function normalizeLineUrl_(raw){
  const v = text(raw);
  if(!v) return "";
  if(looksLikeLineUrl_(v)) return normalizeLink_(v);

  let id = v;
  id = id.replace(/\s+/g,"").replace(/^line[:：]*/i,"");

  if(isUrl_(id) || /^www\./i.test(id)) return normalizeLink_(id);

  if(id.startsWith("@")){
    const handle = encodeURIComponent(id);
    return `https://line.me/R/ti/p/${handle}`;
  }

  if(/^[a-z0-9._-]{3,}$/i.test(id)){
    return `https://line.me/R/ti/p/@${encodeURIComponent(id)}`;
  }

  return normalizeLink_(v);
}

function scanAnyLineFromPayload_(p){
  if(!p || !p.__raw) return "";
  const raw = p.__raw;

  for(const k of Object.keys(raw)){
    const v = raw[k];
    if(v==null) continue;
    const s = String(v);
    if(looksLikeLineUrl_(s)) return normalizeLink_(s);
  }

  for(const k of Object.keys(raw)){
    const nk = cleanKey_(k).toLowerCase();
    if(!nk.includes("line")) continue;
    const v = raw[k];
    const vv = text(v);
    if(!vv) continue;
    return normalizeLineUrl_(vv);
  }

  return "";
}

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

/* ================================
 * Media/Social (same as v408.3)
 * ================================ */
function gatherByKeys_(p, keys){
  const hits = [];
  for(const k of keys){
    const v = pick(p, [k]);
    if(text(v)) hits.push({ key: cleanKey_(k), value: v });
  }
  return hits;
}

function resolveHandleUrl_(platform, raw){
  const v0 = text(raw);
  if(!v0) return "";

  const asLink = normalizeLink_(v0);
  if(/^https?:\/\//i.test(asLink)) return asLink;

  let v = v0.replace(/^[@\s]+/g, "@").trim();
  v = v.replace(/^(ig|instagram|threads|x|twitter|yt|youtube|tiktok|douyin|bili|bilibili)[:：\s]+/i, "").trim();
  if(!v) return "";

  const isAt = v.startsWith("@");
  const handle = (isAt ? v.slice(1) : v).trim();
  const safe = encodeURIComponent(handle);

  if(platform === "instagram") return `https://instagram.com/${safe}`;
  if(platform === "facebook")  return `https://facebook.com/${safe}`;
  if(platform === "threads")   return `https://www.threads.net/@${safe}`;
  if(platform === "x")         return `https://x.com/${safe}`;
  if(platform === "youtube"){
    if(/^UC[A-Za-z0-9_-]{10,}$/.test(handle)) return `https://www.youtube.com/channel/${safe}`;
    return `https://www.youtube.com/@${safe}`;
  }
  if(platform === "bilibili"){
    if(/^\d{3,}$/.test(handle)) return `https://space.bilibili.com/${safe}`;
    return `https://www.bilibili.com/search?keyword=${safe}`;
  }
  if(platform === "tiktok") return `https://www.tiktok.com/@${safe}`;
  if(platform === "douyin") return `https://www.douyin.com/search/${safe}`;
  if(platform === "xiaohongshu") return `https://www.xiaohongshu.com/search_result?keyword=${safe}`;
  return normalizeLink_(v0);
}

function resolveWebsite_(raw){
  const v = text(raw);
  if(!v) return "";
  return normalizeLink_(v);
}

function resolvePodcast_(raw){
  const v = text(raw);
  if(!v) return "";
  const u = normalizeLink_(v);
  if(/^https?:\/\//i.test(u)) return u;
  return `https://www.google.com/search?q=${encodeURIComponent(v + " podcast")}`;
}

const MEDIA_SPECS = [
  { label:"YouTube", icon:"fa-brands fa-youtube", keys:["影音連結1","影音連結2","影音連結3","youtube","yt","youtube_url","youtube_link"], resolver:(v)=> resolveHandleUrl_("youtube", v) },
  { label:"B站", icon:"fa-solid fa-play", keys:["bilibili","b站","bili","bilibili_url"], resolver:(v)=> resolveHandleUrl_("bilibili", v) },
  { label:"TikTok", icon:"fa-brands fa-tiktok", keys:["tiktok_video","tiktok"], resolver:(v)=> resolveHandleUrl_("tiktok", v) },
  { label:"抖音", icon:"fa-solid fa-circle-play", keys:["douyin","抖音"], resolver:(v)=> resolveHandleUrl_("douyin", v) },
  { label:"Podcast", icon:"fa-solid fa-podcast", keys:["podcast","soundon","spotify_podcast","apple_podcast"], resolver:(v)=> resolvePodcast_(v) },
  { label:"Video", icon:"fa-solid fa-play", keys:["video","video_url","media_url"], resolver:(v)=> normalizeLink_(v) }
];

const SOCIAL_SPECS = [
  { label:"FB", icon:"fa-brands fa-facebook", keys:["社群連結1","社群連結2","社群連結3","facebook","fb","fb_url"], resolver:(v)=> resolveHandleUrl_("facebook", v) },
  { label:"IG", icon:"fa-brands fa-instagram", keys:["instagram","ig","ig_url"], resolver:(v)=> resolveHandleUrl_("instagram", v) },
  { label:"Threads", icon:"fa-solid fa-at", keys:["threads","threads_url"], resolver:(v)=> resolveHandleUrl_("threads", v) },
  { label:"X", icon:"fa-brands fa-x-twitter", keys:["x","twitter","x_url","twitter_url"], resolver:(v)=> resolveHandleUrl_("x", v) },

  // WeChat/LINE excluded here (contact only)
  { label:"WeChat", icon:"fa-brands fa-weixin", keys:["wechat","微信","wechat_id","wechat_url","微信ID"], resolver:(_v)=> "" },
  { label:"LINE", icon:"fa-brands fa-line", keys:["line","line_oa","line_id","line_url","LINE連結","LINE官方帳號"], resolver:(_v)=> "" },

  { label:"小紅書", icon:"fa-solid fa-book", keys:["xiaohongshu","小紅書","rednote"], resolver:(v)=> resolveHandleUrl_("xiaohongshu", v) },
  { label:"官網", icon:"fa-solid fa-globe", keys:["website","web","homepage","url"], resolver:(v)=> resolveWebsite_(v) }
];

function ensureMediaDockMount_(){
  let dock = qs("mediaDock");
  let btns = qs("mediaButtons");
  if(dock && btns) return { dock, btns };

  const ref = qs("contactDock") || qs("photoWall") || document.body;

  dock = document.createElement("div");
  dock.id = "mediaDock";
  dock.className = "info-block";
  dock.style.display = "none";

  btns = document.createElement("div");
  btns.id = "mediaButtons";
  dock.appendChild(btns);

  if(qs("photoWall") && qs("photoWall").parentNode){
    const ph = qs("photoWall");
    ph.parentNode.insertBefore(dock, ph);
  }else if(ref && ref.parentNode){
    ref.parentNode.insertBefore(dock, ref.nextSibling);
  }else{
    document.body.appendChild(dock);
  }

  return { dock, btns };
}

function renderSpecsToDock_(p, specs, tag){
  const mount = ensureMediaDockMount_();
  const btns = mount.btns;
  const dock = mount.dock;

  if(!btns || !dock){
    console.warn(`[${tag}] found but not mounted`);
    return false;
  }

  let hasAny = false;

  for(const spec of specs){
    const hits = gatherByKeys_(p, spec.keys);
    if(!hits.length) continue;

    for(const h of hits){
      const rawVal = h.value;
      const finalUrl = spec.resolver(rawVal);
      if(!text(finalUrl)) continue;

      hasAny = true;
      console.log(`[${tag}] ${h.key} -> ${finalUrl}`);

      const cls = classifyDockClass_(finalUrl);
      btns.appendChild(buildDockBtn_({
        label: spec.label,
        icon: spec.icon,
        extraClass: cls,
        onClick: ()=> openUrl_(finalUrl)
      }));
      break;
    }
  }

  return hasAny;
}
function renderDocks_(p){
  const mediaDock = qs("mediaDock");
  const mediaBtns = qs("mediaButtons");
  const cDock     = qs("contactDock");
  const cBtns     = qs("contactButtons");

  if(mediaBtns) mediaBtns.innerHTML = "";
  if(cBtns) cBtns.innerHTML = "";

  const hasMedia = renderSpecsToDock_(p, MEDIA_SPECS, "MEDIA");
  const hasSocial = renderSpecsToDock_(p, SOCIAL_SPECS, "SOCIAL");
  if(mediaDock) mediaDock.style.display = (hasMedia || hasSocial) ? "" : "none";
  applyWideRule_(mediaBtns);

  /* ---- Contact: LINE/WeChat/Phone/Email/Address ---- */
  const phone   = pick(p, ["電話","phone","mobile","手機","cell"]);
  const email   = pick(p, ["Email","email","信箱","E-mail","mail"]);
  const address = pick(p, ["地址","address","住址","工作地址"]);

  const lineRaw =
    pick(p, [
      "LINE連結","LINE連結1","LINE Link","line_url","line_link",
      "LINE官方帳號","LINE 官方帳號","line_oa","line oa","Line OA","LINE OA",
      "LINE官網","LINE 官網","line官網","Line官網",
      "LINE","Line","line","LINE ID","Line ID","line id","LINE帳號","LINE 帳號","line_account",
      "LINE@", "Line@", "line@"
    ]);

  let lineUrl = normalizeLineUrl_(lineRaw);
  if(!text(lineUrl)) lineUrl = scanAnyLineFromPayload_(p);

  const wechatUrlRaw = pick(p, ["wechat_url","WeChat URL","微信連結","微信網址"]);
  const wechatIdRaw  = pick(p, ["微信ID","微信","wechat","wechat_id","WeChat","WeChat ID"]);
  const wechatUrl = normalizeLink_(wechatUrlRaw);
  const wechatId = text(wechatIdRaw);

  const contactList = [];

  if(text(lineUrl)){
    contactList.push({ label:"LINE", icon:"fa-brands fa-line", cls:"dock-line", action: ()=> openUrl_(lineUrl) });
  }

  if(text(wechatUrl) && /^https?:\/\//i.test(wechatUrl)){
    contactList.push({ label:"WeChat", icon:"fa-brands fa-weixin", cls:"dock-web", action: ()=> openUrl_(wechatUrl) });
  }else if(text(wechatId)){
    contactList.push({
      label:"微信ID",
      icon:"fa-brands fa-weixin",
      cls:"dock-web",
      action: async ()=>{
        try{ if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(wechatId); }catch{}
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

/* ================================
 * Text formatting helpers (Plan A)
 * ================================ */
function normalizeMultiline_(s){
  return String(s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u3000/g, " ")
    .trim();
}

function toOneLine_(s){
  const raw = normalizeMultiline_(s);
  if(!raw) return "";
  const parts = raw
    .split(/[\n,，;；/]+/g)
    .map(x=>x.trim())
    .filter(Boolean);
  return parts.join(" / ");
}

/* ---------- Main render ---------- */
function renderCard(row){
  const p = buildNormalizedPayload_(row || {});
  currentRow = p;

  const name  = pick(p, ["姓名","name"]);

  // ✅ Plan A: unit ONE LINE
  const unitRaw = pick(p, ["單位","unit","公司","company"]);
  const unit = toOneLine_(unitRaw);

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

/* ---------- LINE CTA ---------- */
function goLineIntro(){
  const p = currentRow || null;
  if(!p){
    alert("⏳ 名片資料載入中，請稍等一下再點 LINE。");
    return;
  }

  const lineRaw =
    pick(p, [
      "LINE連結","LINE連結1","line_url","line_link",
      "LINE官方帳號","LINE 官方帳號","line_oa","line oa","Line OA","LINE OA",
      "LINE官網","LINE 官網","line官網","Line官網",
      "LINE","Line","line","LINE ID","Line ID","line id","LINE帳號","LINE 帳號","line_account",
      "LINE@", "Line@", "line@"
    ]);

  let url = normalizeLineUrl_(lineRaw);
  if(!text(url)) url = scanAnyLineFromPayload_(p);

  if(!text(url)){
    alert("⚠️ 這張名片尚未提供 LINE（連結或 @ID）");
    return;
  }

  openUrl_(url);
}

/* expose */
window.setPlan = setPlan;
window.setTheme = setTheme;
window.setStyle = setStyle;
window.setPaper = setPaper;
window.goLineIntro = goLineIntro;
window.goFillForm = goFillForm;

/* ================================
 * Photo Wall + Lightbox
 * ================================ */
function extractRowFromPayload_(data){
  if(!data || typeof data !== "object") return null;

  // v491 standard
  if(data.ok === true && data.data && typeof data.data === "object"){
    return data.data;
  }

  // fallbacks
  if(data.data && typeof data.data === "object") return data.data;
  if(data.row && typeof data.row === "object") return data.row;
  if(data.id || data["姓名"] || data.name) return data;

  return null;
}

function collectPhotoUrls_(p){
  let urls = [];
  if(Array.isArray(p.photos_fast)) urls = urls.concat(p.photos_fast);

  const bulkFast = pick(p, ["照片_fast","photos_fast","photos_img_fast","photo_wall_fast"]);
  const bulkSlow = pick(p, ["照片","photos_img","photos","photo_wall"]);
  const bulk = text(bulkFast) ? bulkFast : bulkSlow;

  if(text(bulk)){
    urls = urls.concat(
      String(bulk)
        .split(/[\n,，;]/g)
        .map(s => s.trim())
        .filter(Boolean)
    );
  }

  for(let i=1;i<=12;i++){
    const vFast = pick(p, [`photo_fast${i}`,`photo${i}_fast`,`照片_fast${i}`,`照片${i}_fast`]);
    const v = text(vFast) ? vFast : pick(p, [`photo${i}`,`photo_${i}`,`照片${i}`,`相片${i}`]);
    if(text(v)) urls.push(v);
  }

  const seen = new Set();
  const out = [];
  urls.forEach(u=>{
    const nu = normalizeImageUrl_(u);
    if(!nu) return;
    const key = canonicalImageKey_(nu);
    if(!key) return;
    if(seen.has(key)) return;
    seen.add(key);
    out.push(nu);
  });

  return out;
}

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

function computeCols_(n){
  if(n <= 1) return 1;
  if(n === 2) return 2;
  if(n === 4) return 2;
  if(n % 3 === 1) return 2;
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

/* ================================
 * Hidden Admin Panel
 * - Trigger: bottom-right hotspot triple tap
 * ================================ */
function basePath_(){
  return location.origin + location.pathname;
}

function homeUrl_(){
  return basePath_();
}

function cardUrlById_(cid){
  const id = normalizeId_(cid) || CONFIG.DEFAULT_ID;
  return `${basePath_()}?id=${encodeURIComponent(id)}`;
}

function ogUrl_(){
  return `${location.origin}${location.pathname.replace(/\/[^\/]*$/, "/")}og-card.png`;
}

async function copyText_(s){
  const v = String(s||"");
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(v);
      return true;
    }
  }catch{}
  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }catch{
    return false;
  }
}

function ensureAdminPanel_(){
  if(qs("adminPanelOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "adminPanelOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:999998;
    background:rgba(0,0,0,0.55);
    display:none;
    align-items:flex-end;
    justify-content:center;
    padding:14px;
  `;

  const panel = document.createElement("div");
  panel.id = "adminPanel";
  panel.style.cssText = `
    width:min(520px, 100%);
    border-radius:18px;
    background:rgba(255,255,255,0.92);
    box-shadow:0 18px 60px rgba(0,0,0,0.28);
    overflow:hidden;
    backdrop-filter: blur(10px);
  `;

  const head = document.createElement("div");
  head.style.cssText = `
    padding:12px 14px;
    display:flex; align-items:center; justify-content:space-between;
    border-bottom:1px solid rgba(0,0,0,0.08);
  `;
  head.innerHTML = `
    <div style="font-weight:900; letter-spacing:0.5px;">隱形後臺</div>
    <button id="adminCloseBtn" type="button"
      style="width:36px;height:36px;border-radius:999px;border:none;cursor:pointer;
             background:rgba(0,0,0,0.06);font-size:18px;font-weight:900;">✕</button>
  `;

  const body = document.createElement("div");
  body.style.cssText = `padding:12px 14px;`;

  body.innerHTML = `
    <div style="font-size:13px; opacity:0.85; margin-bottom:8px;">
      輸入 <b>序號（TW0001）</b> 或 姓名（目前以序號查詢為主）
    </div>

    <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
      <input id="adminInput"
        placeholder="TW0001 / 0001 / 小天使"
        style="flex:1; height:42px; padding:0 12px; border-radius:12px;
               border:1px solid rgba(0,0,0,0.18); outline:none; font-size:15px;" />
      <button id="adminGoBtn" type="button"
        style="height:42px; padding:0 14px; border-radius:12px; border:none; cursor:pointer;
               background:rgba(0,0,0,0.08); font-weight:900;">套用</button>
    </div>

    <div id="adminHint" style="font-size:13px; color:#333; opacity:0.85; margin-bottom:10px;"></div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <button id="btnAdminHome" type="button"
        style="height:42px; border-radius:12px; border:none; cursor:pointer;
               background:rgba(0,0,0,0.08); font-weight:900;">返回首頁</button>

      <button id="btnAdminPreview" type="button"
        style="height:42px; border-radius:12px; border:none; cursor:pointer;
               background:rgba(0,0,0,0.08); font-weight:900;">成品預覽</button>

      <button id="btnCopyCard" type="button"
        style="height:42px; border-radius:12px; border:none; cursor:pointer;
               background:rgba(0,0,0,0.08); font-weight:900;">一鍵複製名片連結</button>

      <button id="btnCopyOg" type="button"
        style="height:42px; border-radius:12px; border:none; cursor:pointer;
               background:rgba(0,0,0,0.08); font-weight:900;">一鍵複製 OG 圖卡</button>

      <button id="btnDelivery" type="button"
        style="grid-column:1 / -1; height:44px; border-radius:12px; border:none; cursor:pointer;
               background:rgba(0,0,0,0.12); font-weight:900;">
        一鍵交貨（複製 OG + 名片連結）
      </button>
    </div>

    <div style="margin-top:10px; font-size:12px; opacity:0.7;">
      版本：${escapeHtml_(CONFIG.VERSION)}
    </div>
  `;

  panel.appendChild(head);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const closeBtn = qs("adminCloseBtn");
  const input = qs("adminInput");
  const goBtn = qs("adminGoBtn");
  const hint = qs("adminHint");

  function getCurrentTargetId_(){
    const v = text(input?.value) || getIdFromUrl_() || CONFIG.DEFAULT_ID;
    const nid = normalizeId_(v);
    return nid;
  }

  function setHint_(msg){
    if(hint) hint.innerHTML = msg ? msg : "";
  }

  async function applyInput_(){
    const raw = text(input?.value);
    if(!raw){
      setHint_("⚠️ 請輸入 TW0001 / 0001 / 姓名");
      return;
    }

    const nid = normalizeId_(raw);
    if(/^TW\d{4}$/.test(nid)){
      setHint_(`✅ 已套用：<b>${escapeHtml_(nid)}</b>`);
      console.log("[ADMIN] set target id:", nid);
      return;
    }

    setHint_(`⚠️ 目前後端是用 <b>id</b> 取資料（例：TW0001）。<br>你輸入的是「${escapeHtml_(raw)}」，請改輸入序號。`);
    console.warn("[ADMIN] name entered; id required:", raw);
  }

  async function doHome_(){
    console.log("[ADMIN] home:", homeUrl_());
    location.href = homeUrl_();
  }

  async function doPreview_(){
    const nid = getCurrentTargetId_();
    if(!/^TW\d{4}$/.test(nid)){
      setHint_("⚠️ 預覽需要序號，例如 TW0001");
      return;
    }
    const url = cardUrlById_(nid);
    console.log("[ADMIN] preview:", url);
    window.open(url, "_blank");
  }

  async function doCopyCard_(){
    const nid = getCurrentTargetId_();
    if(!/^TW\d{4}$/.test(nid)){
      setHint_("⚠️ 複製名片連結需要序號，例如 TW0001");
      return;
    }
    const url = cardUrlById_(nid);
    const ok = await copyText_(url);
    console.log("[ADMIN] copy card link:", url, "ok=", ok);
    alert(ok ? "✅ 已複製名片連結" : "⚠️ 複製失敗（可手動長按複製網址）");
  }

  async function doCopyOg_(){
    const url = ogUrl_();
    const ok = await copyText_(url);
    console.log("[ADMIN] copy og link:", url, "ok=", ok);
    alert(ok ? "✅ 已複製 OG 圖卡網址" : "⚠️ 複製失敗（可手動複製 OG 圖卡網址）");
  }

  async function doDelivery_(){
    const nid = getCurrentTargetId_();
    if(!/^TW\d{4}$/.test(nid)){
      setHint_("⚠️ 一鍵交貨需要序號，例如 TW0001");
      return;
    }
    const pack = `OG 圖卡：${ogUrl_()}\n名片連結：${cardUrlById_(nid)}`;
    const ok = await copyText_(pack);
    console.log("[ADMIN] delivery pack copied. id=", nid, "ok=", ok);
    alert(ok ? "✅ 已複製交貨內容（OG + 名片連結）" : "⚠️ 複製失敗（可手動複製）");
  }

  overlay.addEventListener("click", (e)=>{ if(e.target === overlay) hideAdminPanel_(); });
  closeBtn?.addEventListener("click", hideAdminPanel_);
  goBtn?.addEventListener("click", applyInput_);
  input?.addEventListener("keydown", (e)=>{ if(e.key === "Enter") applyInput_(); });

  qs("btnAdminHome")?.addEventListener("click", doHome_);
  qs("btnAdminPreview")?.addEventListener("click", doPreview_);
  qs("btnCopyCard")?.addEventListener("click", doCopyCard_);
  qs("btnCopyOg")?.addEventListener("click", doCopyOg_);
  qs("btnDelivery")?.addEventListener("click", doDelivery_);
}

function showAdminPanel_(){
  ensureAdminPanel_();
  const overlay = qs("adminPanelOverlay");
  if(overlay) overlay.style.display = "flex";

  const input = qs("adminInput");
  const currentId = normalizeId_(getIdFromUrl_() || CONFIG.DEFAULT_ID);
  if(input && !text(input.value)) input.value = currentId;

  console.log("[ADMIN] open panel. current=", currentId);
}

function hideAdminPanel_(){
  const overlay = qs("adminPanelOverlay");
  if(overlay) overlay.style.display = "none";
  console.log("[ADMIN] close panel");
}

/* ---------- Admin hotspot (bottom-right triple tap) ---------- */
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
      showAdminPanel_();
    }
  });
}

/* ---------- Load + Boot ---------- */
async function loadAndRenderById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  console.log("[LOAD] fetching:", url);

  try{
    const payload = await fetchJsonRobust_(url);

    // ✅ ensure complete / expected
    if(!payload || payload.ok !== true){
      console.warn("[LOAD] GAS returned not ok:", payload);
      throw new Error("GAS not ok");
    }

    const row = extractRowFromPayload_(payload);
    if(!row || typeof row !== "object"){
      console.warn("[LOAD] invalid row shape:", payload);
      throw new Error("Invalid payload shape");
    }

    console.log("[LOAD] success id=", cid, row);

    renderCard(row);
    renderPhotoWall_(row);

  }catch(err){
    console.error("LOAD FAIL:", err);
    safeSetText_("u-name", "資料載入失敗");
    safeSetText_("u-unit", "");
    safeSetText_("u-title", "");
  }
}

(function boot_(){
  try{
    ensureLightbox_();
    setupAdminHotspotBR_();

    const b = document.body;
    STATE.mode = b.classList.contains("mode-premium") ? "premium" : "free";

    ["color-1","color-2","color-3","color-4","color-5"].forEach(c=>{ if(b.classList.contains(c)) STATE.color = c; });
    ["style-arch","style-flat","style-spot"].forEach(s=>{
      if(b.classList.contains(s)) STATE.style = s.replace("style-","");
    });
    ["paper-1","paper-2","paper-3"].forEach(p=>{
      if(b.classList.contains(p)) STATE.paper = p;
    });

    ["p1","p2","p3","p4","p5","p6","p7"].forEach(p=>{
      if(b.classList.contains(p)) STATE.premium = p;
    });

    applyBodyClasses_();

    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    loadAndRenderById_(id);

  }catch(e){
    console.error(e);
  }
})();