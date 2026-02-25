/* ================================
Happiness Smart Card System — app.js (v398.3 COMPLETE OVERWRITE)
Fix:
- Plan/style/paper linkage stable
- Premium theme p1~p7 works (body classes)
- Render ALL text fields: name/unit/title/slogan/service/experience + contact dock + photo wall
- Photo wall blanks: remove failed images, grid auto reflow
- Hidden admin entry: versionTag triple-tap OR long-press
================================ */

const CONFIG = {
  VERSION: "398.3",
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,
  ADMIN_LONGPRESS_MS: 1200,
  ADMIN_TRIPLETAP_MS: 650,
  PHOTO_SLOT_MAX: 20,
  PHOTO_GRID_COLS: 3,
  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let __payload = null;
let __lastLoad = { id: "", ts: 0, url: "" };
let __resolvedId = CONFIG.DEFAULT_ID;

/* ---------- utils ---------- */
function $(id){ return document.getElementById(id); }
function q(sel, root=document){ return root.querySelector(sel); }
function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function text(v){ return (v==null?"":String(v)).trim(); }
function log_(){ if(CONFIG.DEBUG) console.log("[HSC-v398.3]", ...arguments); }
function warn_(){ if(CONFIG.DEBUG) console.warn("[HSC-v398.3]", ...arguments); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function setText(elOrId, v){
  const el = typeof elOrId==="string" ? $(elOrId) : elOrId;
  if(!el) return false;
  el.textContent = text(v);
  return true;
}

function getParam(name){
  try{ return new URLSearchParams(window.location.search).get(name); }
  catch{ return null; }
}

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/i.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4,"0");
  if(/^TW\d{1,4}$/i.test(v)){
    const n = v.replace(/^TW/i,"");
    return "TW" + n.padStart(4,"0");
  }
  return v;
}
function getCardIdFromUrl_(){
  const id = normalizeId_(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

/* ---------- plan/style/paper linkage ---------- */
function toggleDotsRows_(){
  const rows = qa(".dots-row");
  if(!rows.length) return;
  let freeRow=null, premiumRow=null;
  for(const row of rows){
    if(!freeRow && row.querySelector(".dot")) freeRow=row;
    if(!premiumRow && row.querySelector(".p-dot")) premiumRow=row;
  }
  const isFree = state.mode==="free";
  if(freeRow) freeRow.style.display = isFree ? "flex" : "none";
  if(premiumRow) premiumRow.style.display = isFree ? "none" : "flex";
}

function syncPlanButtons_(){
  const a=$("btnPlanFree"), b=$("btnPlanPremium");
  if(!a||!b) return;
  if(state.mode==="free"){ a.classList.add("active"); b.classList.remove("active"); }
  else{ b.classList.add("active"); a.classList.remove("active"); }
}

function applyV382_(){
  const isFree = state.mode==="free";
  const controlPanel = $("free-controls");
  if(controlPanel) controlPanel.style.display = isFree ? "block" : "none";

  toggleDotsRows_();

  // ✅ 重要：premium 不要帶 style/paper，避免污染
  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];
  document.body.className = classList.filter(Boolean).join(" ");
}

window.setV382 = function(mode, theme, el){
  state.mode = mode;
  state.theme = theme;

  // active dots
  document.querySelectorAll(".dot, .p-dot").forEach(d=>d.classList.remove("active"));
  if(el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
  applyV382_();
};

window.setV382Style = function(style, el){
  state.style = style;
  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.setV382Paper = function(paper, el){
  state.paper = paper;
  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.goFillForm = function(){
  const u = CONFIG.FORM;
  window.open(u, "_blank");
};

/* ---------- fetch robust ---------- */
async function fetchWithTimeout(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method:"GET",
      mode:"cors",
      cache:"no-store",
      credentials:"omit",
      redirect:"follow",
      signal: controller.signal
    });
    const status = res.status;
    const body = (await res.text() || "").trim();
    if(CONFIG.DEBUG){
      const head = body.slice(0,180).replace(/\s+/g," ");
      log_("fetch:", {status, len: body.length, head});
    }
    if(!res.ok && !body) throw new Error(`HTTP ${status} (empty)`);
    if(!body) throw new Error("Empty response");
    try{ return JSON.parse(body); }
    catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error(`Not JSON (HTTP ${status})`);
    }
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonRobust(url){
  let lastErr=null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{ return await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT_MS); }
    catch(e){
      lastErr=e;
      warn_("fetch retry", i, e && e.message ? e.message : e);
      await sleep(520 + i*520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------- normalize payload ---------- */
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
  if(!obj || typeof obj!=="object") return obj;
  const out = { __raw: obj };
  const lowerMap = Object.create(null);
  for(const k of Object.keys(obj)){
    const nk = cleanKey_(k);
    if(!nk) continue;
    const v = obj[k];
    if(out[nk]==null || text(out[nk])==="") out[nk]=v;
    const lk = nk.toLowerCase();
    if(lowerMap[lk]==null || text(lowerMap[lk])==="") lowerMap[lk]=v;
  }
  out.__lower = lowerMap;
  return out;
}

function pick(obj, keys){
  if(!obj) return "";
  const raw = obj.__raw || null;
  const lower = obj.__lower || null;

  for(const k of keys){
    if(k==null) continue;
    const kk = cleanKey_(k);
    const v1 = obj[kk];
    if(v1!=null && text(v1)!=="") return v1;
    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2!=null && text(v2)!=="") return v2;
    }
  }
  if(raw){
    for(const k of keys){
      const v = raw[k];
      if(v!=null && text(v)!=="") return v;
    }
  }
  return "";
}

/* ---------- images ---------- */
function normalizeImageUrl(raw){
  if(!raw) return "";
  let url = String(raw).trim();
  if(!url) return "";
  if(url.startsWith("http://")) url = "https://" + url.slice(7);

  if(url.includes("dropbox.com")){
    url = url.replace("dl=0", "raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?") + "raw=1";
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
  const s = String(raw || "").trim();
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

/* ✅ 空白洞修復：若全部候選都失敗 -> 直接移除這張圖，grid 自動回填 */
function setImgWithFallback_(imgEl, candidates, onAllFail){
  if(!imgEl) return;
  const list = (candidates || []).map(text).filter(Boolean);
  if(!list.length){
    if(typeof onAllFail==="function") onAllFail();
    return;
  }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;

  let idx = 0;
  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";

  const tryNext = () => {
    if(imgEl.dataset.loadToken !== token) return;
    if(idx >= list.length){
      if(typeof onAllFail==="function") onAllFail();
      return;
    }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onload = () => {
    if(imgEl.dataset.loadToken !== token) return;
    requestAnimationFrame(()=> imgEl.style.opacity = "1");
  };
  imgEl.onerror = () => {
    if(imgEl.dataset.loadToken !== token) return;
    tryNext();
  };

  imgEl.style.opacity = "0";
  imgEl.style.transition = "opacity 420ms ease";
  tryNext();
}

/* ---------- photo wall ---------- */
function splitPhotoList_(raw){
  const s = text(raw);
  if(!s) return [];
  const normalized = s
    .replace(/\r\n/g,"\n")
    .replace(/[,，]+/g,"\n")
    .replace(/[ \t]+/g,"\n");
  return normalized.split("\n").map(x=>x.trim()).filter(Boolean);
}

function collectPhotoUrls_(p){
  const urls = [];
  const main = pick(p, ["照片_fast","照片","images","image","photo","照片牆","相片牆","圖片","相簿"]);
  urls.push(...splitPhotoList_(main));
  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitPhotoList_(p[`照片${i}`]));
    urls.push(...splitPhotoList_(p[`圖片${i}`]));
    urls.push(...splitPhotoList_(p[`photo${i}`]));
    urls.push(...splitPhotoList_(p[`image${i}`]));
  }
  const cleaned = [];
  const seen = new Set();
  for(const raw of urls){
    const r = text(raw);
    if(!r) continue;
    const norm = normalizeImageUrl(r);
    const key = norm || r;
    if(seen.has(key)) continue;
    seen.add(key);
    cleaned.push(r);
  }
  return cleaned;
}

function renderPhotoWall_(p){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const list = collectPhotoUrls_(p);
  if(!list.length){ wall.style.display="none"; return; }
  wall.style.display="";

  grid.style.gridTemplateColumns = `repeat(${CONFIG.PHOTO_GRID_COLS}, 1fr)`;

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    img.style.opacity = "0";
    img.onclick = ()=> window.open(normalizeImageUrl(raw)||raw, "_blank");

    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands, () => {
      // ✅ 全部失敗：移除，避免留下空白洞
      try{ img.remove(); }catch{}
    });

    grid.appendChild(img);
  }
}

/* ---------- contact dock ---------- */
function iconForKey_(k){
  const s = String(k||"").toLowerCase();
  if(s.includes("line")) return "fa-brands fa-line";
  if(s.includes("ig") || s.includes("instagram")) return "fa-brands fa-instagram";
  if(s.includes("fb") || s.includes("facebook")) return "fa-brands fa-facebook";
  if(s.includes("yt") || s.includes("youtube")) return "fa-brands fa-youtube";
  if(s.includes("tiktok") || s.includes("抖音")) return "fa-brands fa-tiktok";
  if(s.includes("email") || s.includes("mail")) return "fa-solid fa-envelope";
  if(s.includes("phone") || s.includes("tel") || s.includes("手機") || s.includes("電話")) return "fa-solid fa-phone";
  if(s.includes("web") || s.includes("網址") || s.includes("網站")) return "fa-solid fa-globe";
  if(s.includes("address") || s.includes("地址")) return "fa-solid fa-location-dot";
  return "fa-solid fa-link";
}

function asUrl_(v){
  const s = text(v);
  if(!s) return "";
  if(/^https?:\/\//i.test(s)) return s;
  // email
  if(s.includes("@") && !s.includes(" ")) return "mailto:" + s;
  // phone
  if(/^\+?\d[\d\-\s]{6,}$/.test(s)) return "tel:" + s.replace(/\s+/g,"");
  // line id
  if(/^line:/i.test(s)) return s.replace(/^line:/i,"https://line.me/ti/p/");
  return s;
}

function buildMapLink_(addr){
  const a = text(addr);
  if(!a) return "";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a);
}

function renderContactDock_(p){
  const box = $("contactButtons");
  if(!box) return;
  box.innerHTML = "";

  // 你表單可能的 key（你可再加）
  const candidates = [
    ["line_oa","LINE","line"],
    ["line","LINE","line"],
    ["email","Email","email"],
    ["phone","電話","phone"],
    ["website","官網","web"],
    ["url","官網","web"],
    ["facebook","Facebook","fb"],
    ["instagram","Instagram","ig"],
    ["youtube","YouTube","yt"],
    ["tiktok","TikTok","tiktok"],
    ["address","地址","address"],
    ["地址","地址","address"]
  ];

  const items = [];
  for(const [k,label] of candidates){
    const v = pick(p,[k, k.toUpperCase(), k.toLowerCase()]);
    if(text(v)) items.push({ key:k, label, value:v });
  }

  if(!items.length) return;

  for(const it of items){
    const btn = document.createElement("button");
    btn.className = "dock-btn";
    const icon = document.createElement("i");
    icon.className = iconForKey_(it.key);
    const span = document.createElement("span");
    span.textContent = it.label;

    btn.appendChild(icon);
    btn.appendChild(span);

    btn.onclick = ()=>{
      const k = String(it.key||"").toLowerCase();
      if(k.includes("address") || k.includes("地址")){
        const u = buildMapLink_(it.value);
        if(u) window.open(u,"_blank");
        return;
      }
      const u = asUrl_(it.value);
      if(u) window.open(u,"_blank");
    };

    box.appendChild(btn);
  }
}

/* ---------- main render ---------- */
function renderBlocks_(p){
  const service = pick(p, ["服務項目","service","Service"]);
  const exp = pick(p, ["經歷","experience","Experience","簡歷","bio"]);

  const bs = $("block-service");
  const be = $("block-exp");

  if(bs){
    bs.innerHTML = "";
    const t = document.createElement("div");
    t.className = "block-title";
    t.textContent = "服務項目";
    const b = document.createElement("div");
    b.className = "block-body";
    b.textContent = text(service);
    bs.appendChild(t);
    bs.appendChild(b);
    bs.style.display = text(service) ? "" : "none";
  }

  if(be){
    be.innerHTML = "";
    const t = document.createElement("div");
    t.className = "block-title";
    t.textContent = "經歷";
    const b = document.createElement("div");
    b.className = "block-body";
    b.textContent = text(exp);
    be.appendChild(t);
    be.appendChild(b);
    be.style.display = text(exp) ? "" : "none";
  }
}

function applyDataToCard(p){
  const name = pick(p, ["姓名","name","Name"]);
  const unit = pick(p, ["單位","unit","Unit"]);
  const title = pick(p, ["頭銜","職稱","title","Title"]);
  const slogan = pick(p, ["理念標語","標語","slogan","Slogan","一句話","自我介紹"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-title", title || "");

  const sloganEl = $("u-slogan");
  if(sloganEl){
    const s = text(slogan);
    sloganEl.textContent = s;
    sloganEl.style.display = s ? "" : "none";
  }

  renderBlocks_(p);
  renderContactDock_(p);
  renderPhotoWall_(p);
}

/* ---------- loading/fail UI ---------- */
function setLoadingUi_(){
  setText("u-name","載入中...");
  setText("u-unit","同步中...");
  setText("u-title","");
  const s = $("u-slogan"); if(s){ s.textContent=""; s.style.display="none"; }
  const wall = $("photoWall"); if(wall) wall.style.display="none";
  const grid = $("photoGrid"); if(grid) grid.innerHTML="";
  const dock = $("contactButtons"); if(dock) dock.innerHTML="";
  const bs=$("block-service"); if(bs) bs.style.display="none";
  const be=$("block-exp"); if(be) be.style.display="none";
}

function setFailUi_(msg){
  setText("u-name","（同步失敗）");
  setText("u-unit", msg || "請確認 id 或 GAS 權限");
  setText("u-title","");
  const img=$("u-img"); if(img) img.removeAttribute("src");
  const wall=$("photoWall"); if(wall) wall.style.display="none";
  const grid=$("photoGrid"); if(grid) grid.innerHTML="";
}

/* ---------- avatar ---------- */
function getAvatarUrl_(p){
  const keys = ["個人照_fast","個人照","形象照_fast","形象照","avatar_fast","avatar","photo_fast","photo","image"];
  let v = pick(p, keys);
  if(text(v)) return v;
  for(let i=1;i<=3;i++){
    v = pick(p, [`個人照${i}`,`形象照${i}`,`avatar${i}`,`photo${i}`,`image${i}`]);
    if(text(v)) return v;
  }
  return "";
}

function setAvatarImage_(p){
  const img = $("u-img");
  if(!img) return;
  const raw = getAvatarUrl_(p);
  const cands = buildImageCandidates_(raw);
  setImgWithFallback_(img, cands, ()=>{ img.removeAttribute("src"); });
}

/* ---------- load ---------- */
async function loadCardById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __lastLoad = { id: cid, ts: Date.now(), url };
  __resolvedId = cid;

  setLoadingUi_();

  try{
    const data = await fetchJsonRobust(url);
    if(!data || typeof data!=="object") throw new Error("Invalid payload");
    if(data.ok === false) throw new Error(data.error || "Not found");
    if(Object.keys(data).length === 0) throw new Error("Empty object");

    __payload = buildNormalizedPayload_(data);

    // avatar first (better perceived loading)
    setAvatarImage_(__payload);
    applyDataToCard(__payload);
    await sleep(120);
    setAvatarImage_(__payload);
    applyDataToCard(__payload);

    // keep url id
    try{
      const u = new URL(window.location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    }catch{}

    return cid;
  }catch(e){
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
    throw e;
  }
}

/* ---------- hidden admin entry ---------- */
function openAdmin_(){
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  window.open(`admin.html?id=${encodeURIComponent(id)}`, "_blank");
}

function bindLongPress_(target, ms, onFire){
  if(!target) return;
  let timer=null, fired=false;

  const start=()=>{
    fired=false;
    clearTimeout(timer);
    timer=setTimeout(()=>{ fired=true; try{ onFire(); }catch{} }, ms);
  };
  const cancel=()=>{ clearTimeout(timer); timer=null; };

  target.addEventListener("touchstart", start, {passive:true});
  target.addEventListener("touchend", cancel, {passive:true});
  target.addEventListener("touchcancel", cancel, {passive:true});
  target.addEventListener("mousedown", start);
  target.addEventListener("mouseup", cancel);
  target.addEventListener("mouseleave", cancel);

  target.addEventListener("click",(e)=>{
    if(fired){ e.preventDefault(); e.stopPropagation(); }
  }, true);
}

function bindTripleTap_(target, ms, onFire){
  if(!target) return;
  let taps = 0;
  let last = 0;
  target.addEventListener("click", ()=>{
    const now = Date.now();
    if(now - last > ms) taps = 0;
    taps++;
    last = now;
    if(taps >= 3){
      taps = 0;
      try{ onFire(); }catch{}
    }
  }, true);
}

function bindAdminHiddenEntry_(){
  const versionTag = $("versionTag") || q(".version-tag");
  const footer = $("footerTag") || q("footer");

  if(versionTag){
    bindLongPress_(versionTag, CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);
    bindTripleTap_(versionTag, CONFIG.ADMIN_TRIPLETAP_MS, openAdmin_);
  }else if(footer){
    bindLongPress_(footer, CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);
    bindTripleTap_(footer, CONFIG.ADMIN_TRIPLETAP_MS, openAdmin_);
  }
}

/* ---------- boot ---------- */
function boot_(){
  try{ applyV382_(); }catch{}
  try{ syncPlanButtons_(); }catch{}
  try{ toggleDotsRows_(); }catch{}
  try{ bindAdminHiddenEntry_(); }catch{}

  const id = getCardIdFromUrl_();
  loadCardById_(id).catch(()=>{});
}

document.addEventListener("DOMContentLoaded", boot_, {once:true});
window.addEventListener("load", ()=>{ if(!__lastLoad.ts) boot_(); });