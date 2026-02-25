/* ================================
 * Happiness Smart Card System
 * app.js v399.10 COMPLETE OVERWRITE
 * (Part 1/3 — Social / Platform Engine)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  DEFAULT_ID: "TW0001"
};

window.CONFIG = CONFIG;

/* ---------- 工具 ---------- */

function safeText(v) {
  return (v || "").toString().trim();
}

function pickFirst(row, keys) {
  for (const k of keys) {
    if (row[k]) return safeText(row[k]);
  }
  return "";
}

/* ---------- Row Normalize（關鍵修正區） ---------- */

function normalizeRow_(raw) {
  const row = {};

  Object.keys(raw || {}).forEach(k => {
    const clean = k.replace(/["'\n\r]/g, "").trim();
    row[clean] = raw[k];
  });

  return row;
}

/* ---------- Social / Platform Engine ---------- */

function renderSocialButtons_(row) {
  const box = document.getElementById("socialBox");
  const wrap = document.getElementById("socialButtons");

  if (!box || !wrap) return;

  wrap.innerHTML = "";

  const keys = [
    "影音平台1", "影音平台2", "影音平台3",
    "社群平台1", "社群平台2", "社群平台3"
  ];

  const urls = keys
    .map(k => safeText(row[k]))
    .filter(v => v);

  if (!urls.length) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";

  urls.forEach(url => {
    const btn = document.createElement("button");
    btn.className = "dock-btn";

    let icon = "fa-globe";
    if (/youtube/i.test(url)) icon = "fa-youtube";
    else if (/facebook/i.test(url)) icon = "fa-facebook";
    else if (/instagram/i.test(url)) icon = "fa-instagram";

    btn.innerHTML = `<i class="fa-brands ${icon}"></i><span>前往</span>`;

    btn.onclick = () => window.open(url, "_blank");

    wrap.appendChild(btn);
  });
}/* ================================
 * Part 2 / 3 — Logo + Photo Wall Engine
 * ================================ */

function splitImages_(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) return raw;

  return raw
    .toString()
    .split(/[\n,]/)
    .map(v => v.trim())
    .filter(v => v);
}

/* ---------- Logo Render（關鍵修正） ---------- */

function renderLogo_(row) {
  const logo = safeText(
    pickFirst(row, ["logo_img", "logo", "Logo", "LOGO"])
  );

  const img = document.getElementById("u-logo");
  const wrap = document.getElementById("logoWrap");

  if (!img || !wrap) return;

  if (!logo) {
    wrap.style.display = "none";
    return;
  }

  img.src = logo;
  wrap.style.display = "flex";
}

/* ---------- Avatar Render（一起補強穩定度） ---------- */

function renderAvatar_(row) {
  const avatar = safeText(
    pickFirst(row, ["avatar_img", "photo", "照片", "image"])
  );

  const img = document.getElementById("u-img");

  if (!img || !avatar) return;

  img.src = avatar;
}

/* ---------- Photo Wall Render（永久穩定版） ---------- */

function renderPhotoWall_(row) {
  const raw =
    pickFirst(row, ["photos_img", "photos", "照片牆", "gallery"]);

  const list = splitImages_(raw);

  const wall = document.getElementById("photoWall");
  const grid = document.getElementById("photoGrid");

  if (!wall || !grid) return;

  grid.innerHTML = "";

  if (!list.length) {
    wall.style.display = "none";
    return;
  }

  wall.style.display = "block";

  list.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.className = "wall-img";

    img.onclick = () => window.open(url, "_blank");

    grid.appendChild(img);
  });
}/* ================================
 * Part 3 / 3 — FULL App Core (v382 hooks + robust loader + dock + social + admin hotspot)
 * NOTE:
 * - Keep: window.setV382 / setV382Style / setV382Paper (index.html onclick uses these)
 * - Add: socialBox (#socialButtons) render from:
 *   影音平台1~3 + 社群平台1~3
 * - Fix: LINE官網 / LINE / 微信(複製ID) / 影音社群確實出現
 * - Fix: dots row show/hide + plan button active
 * - Fix: top admin hotspot (#adminHotspotTop) triple tap
 * ================================ */

/* ---------- Upgrade CONFIG (extend) ---------- */
CONFIG.VERSION = CONFIG.VERSION || "399.10";
CONFIG.FORM = CONFIG.FORM || "https://forms.gle/6A6LoEdT7mpfPeNJ7";
CONFIG.FETCH_TIMEOUT_MS = CONFIG.FETCH_TIMEOUT_MS || 12000;
CONFIG.RETRY = CONFIG.RETRY ?? 2;
CONFIG.ADMIN_TRIPLETAP_WINDOW_MS = CONFIG.ADMIN_TRIPLETAP_WINDOW_MS || 650;
CONFIG.ADMIN_TRIPLETAP_COUNT = CONFIG.ADMIN_TRIPLETAP_COUNT || 3;

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let __resolvedId = CONFIG.DEFAULT_ID;

/* ---------- DOM helpers ---------- */
function $(id){ return document.getElementById(id); }
function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

/* ---------- URL helpers ---------- */
function getParam_(k){
  try{ return new URLSearchParams(location.search).get(k); } catch { return ""; }
}
function normalizeId_(s){
  const v = safeText(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4,"0");
  if(/^TW\d{1,4}$/.test(v)){
    const n = v.replace(/^TW/i,"");
    return "TW" + n.padStart(4,"0");
  }
  return v;
}
function getCardIdFromUrl_(){
  return normalizeId_(getParam_("id")) || CONFIG.DEFAULT_ID;
}
function ensureHttp_(u){
  let v = safeText(u);
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith("www.")) return "https://" + v;
  return v;
}
function isUrl_(s){ return /^https?:\/\//i.test(safeText(s)) || safeText(s).startsWith("www."); }

/* ---------- Toast / Copy ---------- */
function toast_(msg){
  const m = safeText(msg);
  if(!m) return;
  let t = $("__toast");
  if(!t){
    t = document.createElement("div");
    t.id="__toast";
    t.style.position="fixed";
    t.style.left="50%";
    t.style.bottom="18px";
    t.style.transform="translateX(-50%)";
    t.style.background="rgba(0,0,0,0.78)";
    t.style.color="#fff";
    t.style.padding="10px 14px";
    t.style.borderRadius="999px";
    t.style.fontSize="13px";
    t.style.fontWeight="800";
    t.style.zIndex="99999";
    t.style.opacity="0";
    t.style.transition="opacity 180ms ease";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.style.opacity="1";
  clearTimeout(toast_._timer);
  toast_._timer = setTimeout(()=>{ t.style.opacity="0"; }, 1100);
}

async function copyText_(s){
  const v = safeText(s);
  if(!v) return false;
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(v);
      toast_("已複製");
      return true;
    }
  }catch{}
  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.setAttribute("readonly","readonly");
    ta.style.position="fixed";
    ta.style.left="-9999px";
    ta.style.top="0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast_("已複製");
    return true;
  }catch{}
  toast_("無法自動複製");
  alert(v);
  return false;
}

/* ---------- Share API ---------- */
window.copyCardUrl = async function(){
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  try{
    const u = new URL(location.href);
    u.searchParams.set("id", id);
    return copyText_(u.toString());
  }catch{
    const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(id)}`;
    return copyText_(url);
  }
};

/* ---------- Fill form ---------- */
window.goFillForm = function(){
  const url = CONFIG.FORM || "";
  if(url) window.open(url, "_blank");
};

/* =========================================================
   v382 Hooks (index.html onclick uses these)
========================================================= */
function toggleDotsRows_(){
  const freeRow = $("freeDotsRow");
  const premiumRow = $("premiumDotsRow");
  const isFree = state.mode === "free";
  if(freeRow) freeRow.style.display = isFree ? "flex" : "none";
  if(premiumRow) premiumRow.style.display = isFree ? "none" : "flex";
}

function syncPlanButtons_(){
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

function applyV382_(){
  const isFree = state.mode === "free";
  const freeControls = $("free-controls");
  if(freeControls) freeControls.style.display = isFree ? "block" : "none";

  toggleDotsRows_();
  syncPlanButtons_();

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ].filter(Boolean).join(" ");
  document.body.className = classList;
}

window.setV382 = function(mode, theme, el){
  state.mode = (mode === "premium") ? "premium" : "free";
  state.theme = safeText(theme) || (state.mode==="free" ? "color-1" : "p1");

  // dot active
  qa(".dot, .p-dot").forEach(d=>d.classList.remove("active"));
  if(el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  applyV382_();
};

window.setV382Style = function(style, el){
  state.style = safeText(style) || "arch";
  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.setV382Paper = function(paper, el){
  state.paper = safeText(paper) || "paper-1";
  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

/* =========================================================
   Robust fetch + normalize keys (for GAS payload)
========================================================= */
function cleanKey_(k){
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g,"")
    .replace(/\u3000/g," ")
    .replace(/\r\n/g,"\n")
    .replace(/\r/g,"\n")
    .replace(/\n+/g,"")
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g,"")
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
    if(out[nk] == null || safeText(out[nk])==="") out[nk] = v;
    const lk = nk.toLowerCase();
    if(lower[lk] == null || safeText(lower[lk])==="") lower[lk] = v;
  }
  out.__lower = lower;
  return out;
}

function pick_(payloadNorm, keys){
  if(!payloadNorm) return "";
  const lower = payloadNorm.__lower || null;
  const raw = payloadNorm.__raw || null;

  for(const k of keys){
    if(k == null) continue;
    const kk = cleanKey_(k);
    const v1 = payloadNorm[kk];
    if(v1 != null && safeText(v1)!=="") return v1;

    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2 != null && safeText(v2)!=="") return v2;
    }
  }
  if(raw){
    for(const k of keys){
      const v = raw[k];
      if(v != null && safeText(v)!=="") return v;
    }
  }
  return "";
}

async function fetchWithTimeout_(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", mode:"cors", cache:"no-store", credentials:"omit", redirect:"follow", signal: controller.signal });
    const txt = await res.text();
    const body = (txt||"").trim();
    if(!res.ok && !body) throw new Error(`HTTP ${res.status} (empty)`);
    if(!body) throw new Error("Empty response");

    try{ return JSON.parse(body); }
    catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url){
  let lastErr = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{ return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS); }
    catch(e){
      lastErr = e;
      await new Promise(r=>setTimeout(r, 520 + i*520));
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* =========================================================
   Images (logo/avatar/photo wall) — stable loader
========================================================= */
function buildImageCandidates_(raw){
  const s = safeText(raw);
  if(!s) return [];
  const original = s.startsWith("http://") ? "https://" + s.slice(7) : s;

  if(original.includes("dropbox.com")){
    let u = original.replace("dl=0","raw=1");
    if(!u.includes("raw=1")) u += (u.includes("?") ? "&" : "?") + "raw=1";
    return [u];
  }

  const mFile = original.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const mId = original.match(/(?:\?|&)id=([^&]+)/i);
  const mThumb = original.match(/thumbnail\?id=([^&]+)/i);
  const id = (mFile&&mFile[1]) || (mId&&mId[1]) || (mThumb&&mThumb[1]) || "";

  if(id){
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
      original
    ].filter(Boolean);
  }
  return [ensureHttp_(original) || original].filter(Boolean);
}

function setImgWithFallback_(imgEl, candidates){
  if(!imgEl) return;
  const list = (candidates||[]).map(safeText).filter(Boolean);
  if(!list.length){ imgEl.removeAttribute("src"); return; }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;
  let idx = 0;

  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";

  const tryNext = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    if(idx >= list.length){
      imgEl.style.opacity="0";
      imgEl.removeAttribute("src");
      return;
    }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onload = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    requestAnimationFrame(()=> imgEl.style.opacity="1");
  };
  imgEl.onerror = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    tryNext();
  };

  imgEl.style.opacity="0";
  imgEl.style.transition="opacity 420ms ease";
  tryNext();
}

function setAvatarImage_(payloadNorm){
  const img = $("u-img");
  if(!img) return;
  const raw = pick_(payloadNorm, ["個人照_fast","個人照","avatar_img","avatar","photo_fast","photo","image"]);
  const cands = buildImageCandidates_(raw);
  if(!cands.length){ img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function setLogo_(payloadNorm){
  const wrap = $("logoWrap");
  const img = $("u-logo");
  if(!wrap || !img) return;

  const raw = pick_(payloadNorm, ["logo_fast","logo_img","logo","Logo","LOGO","品牌logo","品牌Logo","公司logo","公司Logo"]);
  const cands = buildImageCandidates_(raw);
  if(!cands.length){
    wrap.style.display="none";
    img.removeAttribute("src");
    return;
  }
  wrap.style.display="";
  setImgWithFallback_(img, cands);
}

function splitPhotoList_(raw){
  const s = safeText(raw);
  if(!s) return [];
  return s
    .replace(/\r\n/g,"\n")
    .replace(/[,，]+/g,"\n")
    .split("\n")
    .map(x=>x.trim())
    .filter(Boolean);
}

function collectPhotoUrls_(payloadNorm){
  const urls = [];
  const main = pick_(payloadNorm, ["照片_fast","照片","photos_img","photos","照片牆","相片牆","圖片","相簿"]);
  urls.push(...splitPhotoList_(main));
  // slots
  for(let i=1;i<=20;i++){
    urls.push(...splitPhotoList_(payloadNorm[`照片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`圖片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`photo${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`image${i}`]));
  }
  // dedupe
  const out = [];
  const seen = new Set();
  for(const r of urls){
    const v = safeText(r);
    if(!v) continue;
    const key = v;
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function renderPhotoWallStable_(payloadNorm){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const list = collectPhotoUrls_(payloadNorm);

  if(!list.length){
    wall.style.display="none";
    return;
  }
  wall.style.display="";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands);

    const openUrl = ensureHttp_(raw) || raw;
    img.addEventListener("click", ()=> window.open(openUrl, "_blank"));
    grid.appendChild(img);
  }
}

/* =========================================================
   Dock buttons (fixed order + LINE官網 + WeChat copy id)
========================================================= */
function iconFor_(type){
  const t = String(type||"").toLowerCase();
  if(t==="phone") return "fa-solid fa-phone";
  if(t==="email") return "fa-solid fa-envelope";
  if(t==="web") return "fa-solid fa-globe";
  if(t==="map") return "fa-solid fa-location-dot";
  if(t==="line") return "fa-brands fa-line";
  if(t==="wechat") return "fa-brands fa-weixin";
  if(t==="video") return "fa-solid fa-circle-play";
  return "fa-solid fa-link";
}

function addDockBtn_(wrap, label, hrefOrFn, iconClass){
  if(!wrap) return;
  const btn = document.createElement("button");
  btn.type="button";
  btn.className="dock-btn";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  if(typeof hrefOrFn === "function"){
    btn.addEventListener("click", hrefOrFn);
  }else{
    const href = safeText(hrefOrFn);
    if(!href) return;
    btn.addEventListener("click", ()=> window.open(href, "_blank"));
  }
  wrap.appendChild(btn);
}

function normalizePhone_(s){ return safeText(s).replace(/[^\d+]/g,""); }

function renderContactDockStable_(payloadNorm){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML = "";

  // ✅ 指定順序：line官網、line、微信、電話、Email、導航
  const lineOfficial = pick_(payloadNorm, ["line官網","line官網預約","line官方","line官方帳號","line_oa","line oa","LINE_OA","LINE OA","Line OA"]);
  const lineId       = pick_(payloadNorm, ["line","line_id","Line","LINE"]);
  const wechat       = pick_(payloadNorm, ["微信","wechat","weixin","微信號","weixin_id","wx","wxid"]);
  const phone        = pick_(payloadNorm, ["電話","手機","phone","mobile","tel"]);
  const email        = pick_(payloadNorm, ["Email","email","E-mail","信箱","mail"]);
  const addr         = pick_(payloadNorm, ["地址","address","所在地","location"]);

  // line官網（一定是 URL 才顯示）
  const lo = ensureHttp_(lineOfficial);
  if(lo && /^https?:\/\//i.test(lo)){
    addDockBtn_(wrap, "LINE官網", lo, iconFor_("line"));
  }

  // line（id 或 url）
  const li = safeText(lineId);
  if(li){
    const href = isUrl_(li) ? ensureHttp_(li) : `https://line.me/R/ti/p/${encodeURIComponent(li)}`;
    addDockBtn_(wrap, "LINE", href, iconFor_("line"));
  }

  // wechat：若是 URL -> 開；否則 -> 複製ID
  const wx = safeText(wechat);
  if(wx){
    if(isUrl_(wx)){
      addDockBtn_(wrap, "微信", ensureHttp_(wx), iconFor_("wechat"));
    }else{
      addDockBtn_(wrap, "微信ID", async ()=>{ await copyText_(wx); toast_("微信ID已複製"); }, iconFor_("wechat"));
    }
  }

  // phone
  const p = normalizePhone_(phone);
  if(p) addDockBtn_(wrap, "電話", `tel:${p}`, iconFor_("phone"));

  // email
  const em = safeText(email);
  if(em) addDockBtn_(wrap, "Email", `mailto:${encodeURIComponent(em)}`, iconFor_("email"));

  // map
  const a = safeText(addr);
  if(a){
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
    addDockBtn_(wrap, "導航", href, iconFor_("map"));
  }

  dock.style.display = wrap.children.length ? "" : "none";
}

/* =========================================================
   SocialBox render (影音平台1~3 / 社群平台1~3)
========================================================= */
function renderSocialButtonsV2_(payloadNorm){
  const box = $("socialBox");
  const wrap = $("socialButtons");
  if(!box || !wrap) return;

  wrap.innerHTML = "";

  const pairs = [
    { key:"影音平台1", label:"影音1", icon: iconFor_("video") },
    { key:"影音平台2", label:"影音2", icon: iconFor_("video") },
    { key:"影音平台3", label:"影音3", icon: iconFor_("video") },
    { key:"社群平台1", label:"社群1", icon: "fa-solid fa-users" },
    { key:"社群平台2", label:"社群2", icon: "fa-solid fa-users" },
    { key:"社群平台3", label:"社群3", icon: "fa-solid fa-users" },
  ];

  let count = 0;
  for(const it of pairs){
    const v = safeText(pick_(payloadNorm, [it.key]));
    if(!v) continue;

    const href = isUrl_(v) ? ensureHttp_(v) : `https://www.google.com/search?q=${encodeURIComponent(v)}`;
    addDockBtn_(wrap, it.label, href, it.icon);
    count++;
  }

  box.style.display = count ? "" : "none";
}

/* =========================================================
   Blocks (服務/經歷)
========================================================= */
function escapeHtml_(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function renderBlock_(rootId, title, body){
  const root = $(rootId);
  if(!root) return;
  const b = safeText(body);
  if(!b){
    root.innerHTML="";
    root.style.display="none";
    return;
  }
  root.style.display="";
  root.innerHTML = `
    <div class="block-title">${title}</div>
    <div class="block-body preline">${escapeHtml_(b)}</div>
  `;
}

/* =========================================================
   Apply data
========================================================= */
function applyDataToCard_(payloadNorm){
  const name    = pick_(payloadNorm, ["姓名","name","Name"]);
  const unit    = pick_(payloadNorm, ["單位","unit","Unit"]);
  const title   = pick_(payloadNorm, ["頭銜","職稱","title","Title"]);
  const slogan  = pick_(payloadNorm, ["理念","標語","slogan","Slogan"]);
  const service = pick_(payloadNorm, ["服務項目","service","Service"]);
  const exp     = pick_(payloadNorm, ["經歷","experience","Experience","簡歷","履歷"]);

  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl= $("u-title");
  if(nameEl) nameEl.textContent = safeText(name) || "（尚未讀到姓名）";
  if(unitEl) unitEl.textContent = safeText(unit) || "";
  if(titleEl) titleEl.textContent = safeText(title) || "";

  const sl = $("u-slogan");
  if(sl){
    const s = safeText(slogan);
    if(s){
      sl.style.display="";
      sl.textContent = s;
    }else{
      sl.style.display="none";
      sl.textContent="";
    }
  }

  renderBlock_("block-service","服務項目", service);
  renderBlock_("block-exp","經歷", exp);

  setAvatarImage_(payloadNorm);
  setLogo_(payloadNorm);

  // ✅ 先照片牆，再影音社群，再聯繫列（符合你定錨）
  renderPhotoWallStable_(payloadNorm);
  renderSocialButtonsV2_(payloadNorm);
  renderContactDockStable_(payloadNorm);
}

/* =========================================================
   Loading / Fail UI
========================================================= */
function setLoadingUi_(){
  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl= $("u-title");
  if(nameEl) nameEl.textContent = "載入中...";
  if(unitEl) unitEl.textContent = "同步中...";
  if(titleEl) titleEl.textContent = "";

  const sl = $("u-slogan");
  if(sl){ sl.style.display="none"; sl.textContent=""; }

  const dock = $("contactDock");
  if(dock) dock.style.display="none";

  const socialBox = $("socialBox");
  if(socialBox) socialBox.style.display="none";

  const wall = $("photoWall");
  if(wall) wall.style.display="none";

  const wrap = $("logoWrap");
  if(wrap) wrap.style.display="none";
}

function setFailUi_(msg){
  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl= $("u-title");
  if(nameEl) nameEl.textContent = "（同步失敗）";
  if(unitEl) unitEl.textContent = safeText(msg) || "請確認 id 或 GAS 權限";
  if(titleEl) titleEl.textContent = "";

  const dock = $("contactDock");
  if(dock) dock.style.display="none";
  const socialBox = $("socialBox");
  if(socialBox) socialBox.style.display="none";
  const wall = $("photoWall");
  if(wall) wall.style.display="none";
  const wrap = $("logoWrap");
  if(wrap) wrap.style.display="none";
}

/* =========================================================
   Load card
========================================================= */
async function loadCardById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;
  setLoadingUi_();

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const data = await fetchJsonRobust_(url);
    if(!data || typeof data !== "object") throw new Error("Invalid payload");
    if(data.ok === false) throw new Error(data.error || "Not found");

    const payloadNorm = buildNormalizedPayload_(data);
    applyDataToCard_(payloadNorm);

    // keep url
    try{
      const u = new URL(location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    }catch{}

    return cid;
  }catch(e){
    setFailUi_(e && e.message ? e.message : String(e));
  }
}

/* =========================================================
   Admin Hotspot (top invisible) — triple tap
========================================================= */
function bindAdminHotspot_(){
  const hs = $("adminHotspotTop");
  if(!hs) return;

  let tapCount = 0;
  let timer = null;

  hs.addEventListener("click", ()=>{
    tapCount++;
    clearTimeout(timer);
    timer = setTimeout(()=>{ tapCount = 0; }, CONFIG.ADMIN_TRIPLETAP_WINDOW_MS);

    if(tapCount >= CONFIG.ADMIN_TRIPLETAP_COUNT){
      tapCount = 0;
      const id = __resolvedId || CONFIG.DEFAULT_ID;
      window.open(`admin.html?id=${encodeURIComponent(id)}`, "_blank");
    }
  }, { passive:true });
}

/* =========================================================
   Boot
========================================================= */
function boot_(){
  bindAdminHotspot_();

  // init UI (start: free)
  applyV382_();

  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });