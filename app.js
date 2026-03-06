/* ================================
 * Happiness Smart Card System
 * app.js v521.5 (COMPLETE OVERWRITE)
 *
 * Align to GAS v501 payload:
 * ✅ { ok:true, v:"501", item:{...} }
 *
 * Rules:
 * ✅ HARD LOCK: status !== "active" => lock
 * ✅ Expiry key align: expires_at / expired_at / expire_at (legacy)
 * ✅ Keep ALL behaviors: plan/theme/style/paper, share, docks, photowall, hidden admin panel (if exists in HTML)
 *
 * v521.5 changes:
 * ✅ A) Facade/Clean isolation support: detect clean mode (?view=1 / ?clean=1)
 * ✅ B) Share ALWAYS shares clean URL (force view=1; remove clean)
 * ✅ C) Move private LINE into Contact Dock, hide top CTA private LINE buttons
 * ✅ D) Facade only: selection -> LINE OA CTA linkage with params:
 *    plan, color/premium, style, paper, id (if any), from=facade
 *
 * Lock CTA / contact CTA -> LINE OA: https://lin.ee/3r2ZePN
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/3r2ZePN",
  DEFAULT_ID: "TW0001",
  VERSION: "v521.5",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3
};

let currentRow = null;

/* ---------- DOM ---------- */
function qs(id){ return document.getElementById(id); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

/* ---------- Mode detect ---------- */
function isCleanMode_(){
  try{
    const sp = new URLSearchParams(location.search || "");
    return (sp.get("view") === "1") || (sp.get("clean") === "1");
  }catch{
    return false;
  }
}
const __IS_CLEAN = isCleanMode_();

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

function getCurrentCardId_(){
  // prefer URL id; fallback to payload id
  const urlId = normalizeId_(getIdFromUrl_());
  if(urlId) return urlId;
  const p = currentRow || null;
  if(p){
    const pid = normalizeId_(pick(p, ["id","card_id","cid","序號","編號"]));
    if(pid) return pid;
  }
  return "";
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
    imgEl.src = list[idx] + (list[idx].includes("?") ? "&" : "?") + "t=" + Date.now() + "&v=" + encodeURIComponent(CONFIG.VERSION);
  };

  imgEl.onerror = tryNext;
  imgEl.src = list[0] + (list[0].includes("?") ? "&" : "?") + "t=" + Date.now() + "&v=" + encodeURIComponent(CONFIG.VERSION);
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
  mode: "free",        // free | premium
  color: "color-1",    // color-1..5
  style: "arch",       // arch | flat | spot
  paper: "paper-1",    // paper-1..3
  premium: "p1"        // p1..p7
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
    if(premBadge) premBadge.style.display = "";
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

/* ---------- payload -> STATE sync ---------- */
function normalizePlan_(raw){
  const v = text(raw).toLowerCase();
  if(!v) return "";
  if(v.includes("premium") || v.includes("pro") || v.includes("精品")) return "premium";
  if(v.includes("free") || v.includes("basic") || v.includes("自由")) return "free";
  return v;
}

function normalizeColorClass_(raw){
  const v = text(raw).toLowerCase().replace(/_/g,"-");
  if(!v) return "";
  if(/^color-\d$/.test(v)) return v;
  if(/^c[1-5]$/.test(v)) return "color-" + v.slice(1);
  if(/^[1-5]$/.test(v)) return "color-" + v;
  if(v.includes("粉")) return "color-1";
  if(v.includes("藍")) return "color-2";
  if(v.includes("橘")) return "color-3";
  if(v.includes("紫")) return "color-4";
  if(v.includes("綠")) return "color-5";
  return "";
}

function normalizeStyle_(raw){
  let v = text(raw).toLowerCase().replace(/_/g,"-");
  if(!v) return "";
  v = v.replace(/^style-/, "");
  if(v.includes("arch") || v.includes("拱") || v.includes("s1")) return "arch";
  if(v.includes("flat") || v.includes("直") || v.includes("s2")) return "flat";
  if(v.includes("spot") || v.includes("晨") || v.includes("s3")) return "spot";
  return "";
}

function normalizePaper_(raw){
  let v = text(raw).toLowerCase().replace(/_/g,"-");
  if(!v) return "";
  if(v === "paper-1" || v.includes("f1") || v.includes("棉")) return "paper-1";
  if(v === "paper-2" || v.includes("f2") || v.includes("顆") || v.includes("象牙")) return "paper-2";
  if(v === "paper-3" || v.includes("f3") || v.includes("亞") || v.includes("霧灰")) return "paper-3";
  if(/^[123]$/.test(v)) return "paper-" + v;
  return "";
}

function normalizePremium_(raw){
  const v = text(raw).toLowerCase();
  if(!v) return "";
  if(/^p[1-7]$/.test(v)) return v;
  if(/^[1-7]$/.test(v)) return "p" + v;
  if(v.includes("胭")) return "p1";
  if(v.includes("酒")) return "p2";
  if(v.includes("深藍")) return "p3";
  if(v.includes("霧紫")) return "p4";
  if(v.includes("藍灰")) return "p5";
  if(v.includes("金")) return "p6";
  if(v.includes("褐")) return "p7";
  return "";
}

function syncStateFromPayload_(p){
  const planRaw = pick(p, ["plan","方案","plan_name","mode","方案別"]);
  const plan = normalizePlan_(planRaw);

  const colorRaw = pick(p, ["color","顏色","theme","free_color","color_id"]);
  const styleRaw = pick(p, ["style","版型","card_style","banner_style","style_id"]);
  const paperRaw = pick(p, ["paper","紙感","texture","paper_id"]);
  const premRaw  = pick(p, ["premium_color","premium","premium_theme","p_color","精品底色","premiumColor"]);

  const c  = normalizeColorClass_(colorRaw);
  const s  = normalizeStyle_(styleRaw);
  const pa = normalizePaper_(paperRaw);
  const pr = normalizePremium_(premRaw);

  if(plan === "premium" || pr){
    STATE.mode = "premium";
    if(pr) STATE.premium = pr;
  }else if(plan === "free"){
    STATE.mode = "free";
  }

  if(c)  STATE.color = c;
  if(s)  STATE.style = s;
  if(pa) STATE.paper = pa;
  if(pr) STATE.premium = pr;

  if(!STATE.color) STATE.color = "color-1";
  if(!STATE.style) STATE.style = "arch";
  if(!STATE.paper) STATE.paper = "paper-1";
  if(!STATE.premium) STATE.premium = "p1";
}

/* ---------- Active buttons sync ---------- */
function matchThemeEl_(el, themeValue){
  if(!el) return false;

  const dv = text(el.getAttribute("data-value"));
  if(dv && dv === themeValue) return true;

  for(let i=1;i<=5;i++){
    if(el.classList.contains("dot-" + i) && themeValue === ("color-" + i)) return true;
  }
  for(let i=1;i<=7;i++){
    if(el.classList.contains("p" + i) && themeValue === ("p" + i)) return true;
  }

  const al = text(el.getAttribute("aria-label")).toLowerCase();
  if(al){
    if(themeValue.startsWith("color-")){
      const n = themeValue.split("-")[1];
      if(n==="1" && al.includes("粉")) return true;
      if(n==="2" && al.includes("藍")) return true;
      if(n==="3" && al.includes("橘")) return true;
      if(n==="4" && al.includes("紫")) return true;
      if(n==="5" && al.includes("綠")) return true;
    }
    if(themeValue.startsWith("p")){
      if(al === themeValue) return true;
    }
  }

  return false;
}

function matchStyleEl_(el, styleValue){
  const dv = text(el.getAttribute("data-value"));
  if(dv && dv === styleValue) return true;
  const t = text(el.textContent).toLowerCase();
  if(styleValue==="arch" && (t.includes("正拱") || t.includes("拱") || t.includes("arch"))) return true;
  if(styleValue==="flat" && (t.includes("平直") || t.includes("直") || t.includes("flat"))) return true;
  if(styleValue==="spot" && (t.includes("晨曦") || t.includes("spot"))) return true;
  return false;
}

function matchPaperEl_(el, paperValue){
  const dv = text(el.getAttribute("data-value"));
  if(dv && dv === paperValue) return true;
  const t = text(el.textContent).toLowerCase();
  if(paperValue==="paper-1" && (t.includes("棉") || t.includes("paper-1") || t.includes("f1"))) return true;
  if(paperValue==="paper-2" && (t.includes("象牙") || t.includes("顆") || t.includes("paper-2") || t.includes("f2"))) return true;
  if(paperValue==="paper-3" && (t.includes("霧灰") || t.includes("亞麻") || t.includes("paper-3") || t.includes("f3"))) return true;
  return false;
}

function syncActiveButtonsFromState_(){
  const btnFree = qs("btnPlanFree");
  const btnPrem = qs("btnPlanPremium");
  if(btnFree && btnPrem){
    btnFree.classList.toggle("active", STATE.mode === "free");
    btnPrem.classList.toggle("active", STATE.mode === "premium");
    btnFree.classList.toggle("breathe", STATE.mode === "free");
    btnPrem.classList.toggle("breathe", STATE.mode === "premium");
  }

  const themeValue = (STATE.mode === "premium") ? STATE.premium : STATE.color;

  qsa(`[data-group="theme"]`).forEach(el=>{
    el.classList.toggle("active", matchThemeEl_(el, themeValue));
  });

  qsa(`[data-group="style"]`).forEach(el=>{
    el.classList.toggle("active", matchStyleEl_(el, STATE.style));
  });

  qsa(`[data-group="paper"]`).forEach(el=>{
    el.classList.toggle("active", matchPaperEl_(el, STATE.paper));
  });
}

/* ---------- Share URL (force view=1) ---------- */
function buildCleanShareUrl_(){
  try{
    const u = new URL(location.href);
    if(u.searchParams.get("view") !== "1") u.searchParams.set("view","1");
    u.searchParams.delete("clean"); // canonicalize
    return u.toString();
  }catch{
    const url = location.href;
    if(url.includes("view=1")) return url;
    return url + (url.includes("?") ? "&" : "?") + "view=1";
  }
}

/* ---------- LINE OA linkage (selection -> OA CTA) ---------- */
function buildLineOaUrlWithState_(){
  const base = normalizeLink_(CONFIG.CUSTOMER_SERVICE_URL);
  if(!base) return "";

  // Clean mode: facade CTA must not exist; if somehow called, return base without tracking params
  if(__IS_CLEAN) return base;

  const plan = (STATE.mode === "premium") ? "premium" : "free";

  // map to your preferred param style:
  // - plan: free/premium
  // - color: c1..c5 (free)
  // - premium: p1..p7 (premium)
  // - style: s1/s2/s3
  // - paper: f1/f2/f3
  function colorToC_(c){
    const m = String(c||"").match(/color-(\d)/i);
    return m ? ("c" + m[1]) : (c || "c1");
  }
  function styleToS_(s){
    if(s === "arch") return "s1";
    if(s === "flat") return "s2";
    if(s === "spot") return "s3";
    return "s1";
  }
  function paperToF_(p){
    if(p === "paper-1") return "f1";
    if(p === "paper-2") return "f2";
    if(p === "paper-3") return "f3";
    return "f1";
  }

  try{
    const u = new URL(base);

    u.searchParams.set("from", "facade");
    u.searchParams.set("plan", plan);

    const id = getCurrentCardId_();
    if(id) u.searchParams.set("id", id);

    if(plan === "premium"){
      u.searchParams.set("premium", STATE.premium || "p1");
    }else{
      u.searchParams.set("color", colorToC_(STATE.color || "color-1"));
      u.searchParams.set("style", styleToS_(STATE.style || "arch"));
      u.searchParams.set("paper", paperToF_(STATE.paper || "paper-1"));
    }

    return u.toString();
  }catch{
    const q = [];
    q.push("from=facade");
    q.push("plan=" + encodeURIComponent(plan));
    const id = getCurrentCardId_();
    if(id) q.push("id=" + encodeURIComponent(id));
    if(plan === "premium"){
      q.push("premium=" + encodeURIComponent(STATE.premium || "p1"));
    }else{
      q.push("color=" + encodeURIComponent(colorToC_(STATE.color || "color-1")));
      q.push("style=" + encodeURIComponent(styleToS_(STATE.style || "arch")));
      q.push("paper=" + encodeURIComponent(paperToF_(STATE.paper || "paper-1")));
    }
    return base + (base.includes("?") ? "&" : "?") + q.join("&");
  }
}

function openLineOaWithState_(){
  const u = buildLineOaUrlWithState_();
  if(!u){
    alert("⚠️ LINE 官方帳號連結未設定");
    return;
  }
  try{ window.open(u, "_blank"); }catch(e){ location.href = u; }
}

function bindLineOaOverride_(){
  // Use capture to override any listeners in index.html
  ["btnLineOaCta","btnLineOaCta2"].forEach(id=>{
    const b = qs(id);
    if(!b) return;
    b.addEventListener("click", (e)=>{
      try{
        e.preventDefault();
        e.stopPropagation();
        if(typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      }catch{}
      openLineOaWithState_();
    }, { capture:true });
  });
}

/* ---------- Exposed APIs ---------- */
function setPlan(mode, el){
  STATE.mode = (mode === "premium") ? "premium" : "free";
  setActiveInGroup_("plan", el);
  applyBodyClasses_();
  syncActiveButtonsFromState_();
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
  syncActiveButtonsFromState_();
}

function setStyle(style, el){
  STATE.mode = "free";
  STATE.style = style;
  setActiveInGroup_("style", el);
  applyBodyClasses_();
  syncActiveButtonsFromState_();
}

function setPaper(paper, el){
  STATE.mode = "free";
  STATE.paper = paper;
  setActiveInGroup_("paper", el);
  applyBodyClasses_();
  syncActiveButtonsFromState_();
}

/* CTA: lock/contact -> LINE OA */
function goFillForm(){
  openLineOaWithState_();
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
  const logoUrl = pick(p, ["Logo_fast","Logo","logo_fast","logo","logo_img","logo_url"]);
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
  const avatarRaw = pick(p, ["個人照_fast","個人照","avatar_fast","avatar","avatar_img","avatar_url","形象照","photo"]);
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
 * Media/Social (kept)
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
  { label:"YouTube", icon:"fa-brands fa-youtube", keys:["影音連結1","影音連結2","影音連結3","video1","video2","video3","youtube","yt","youtube_url","youtube_link"], resolver:(v)=> resolveHandleUrl_("youtube", v) },
  { label:"B站", icon:"fa-solid fa-play", keys:["bilibili","b站","bili","bilibili_url"], resolver:(v)=> resolveHandleUrl_("bilibili", v) },
  { label:"TikTok", icon:"fa-brands fa-tiktok", keys:["tiktok_video","tiktok"], resolver:(v)=> resolveHandleUrl_("tiktok", v) },
  { label:"抖音", icon:"fa-solid fa-circle-play", keys:["douyin","抖音"], resolver:(v)=> resolveHandleUrl_("douyin", v) },
  { label:"Podcast", icon:"fa-solid fa-podcast", keys:["podcast","soundon","spotify_podcast","apple_podcast"], resolver:(v)=> resolvePodcast_(v) },
  { label:"Video", icon:"fa-solid fa-play", keys:["video","video_url","media_url"], resolver:(v)=> normalizeLink_(v) }
];

const SOCIAL_SPECS = [
  { label:"FB", icon:"fa-brands fa-facebook", keys:["社群連結1","社群連結2","社群連結3","social1","social2","social3","facebook","fb","fb_url"], resolver:(v)=> resolveHandleUrl_("facebook", v) },
  { label:"IG", icon:"fa-brands fa-instagram", keys:["instagram","ig","ig_url"], resolver:(v)=> resolveHandleUrl_("instagram", v) },
  { label:"Threads", icon:"fa-solid fa-at", keys:["threads","threads_url"], resolver:(v)=> resolveHandleUrl_("threads", v) },
  { label:"X", icon:"fa-brands fa-x-twitter", keys:["x","twitter","x_url","twitter_url"], resolver:(v)=> resolveHandleUrl_("x", v) },
  { label:"WeChat", icon:"fa-brands fa-weixin", keys:["wechat","微信","wechat_id","wechat_url","微信ID"], resolver:(_v)=> "" },
  { label:"LINE", icon:"fa-brands fa-line", keys:["line","line_oa","line_id","line_url","LINE連結","LINE官方帳號"], resolver:(_v)=> "" },
  { label:"小紅書", icon:"fa-solid fa-book", keys:["xiaohongshu","小紅書","rednote"], resolver:(v)=> resolveHandleUrl_("xiaohongshu", v) },
  { label:"官網", icon:"fa-solid fa-globe", keys:["website","web","homepage","url"], resolver:(v)=> resolveWebsite_(v) }
];

function ensureMediaDockMount_(){
  let dock = qs("mediaDock");
  let btns = qs("mediaButtons");
  if(dock && btns) return { dock, btns };
  return { dock, btns };
}

function renderSpecsToDock_(p, specs){
  const mount = ensureMediaDockMount_();
  const btns = mount.btns;
  const dock = mount.dock;
  if(!btns || !dock) return false;

  let hasAny = false;

  for(const spec of specs){
    const hits = gatherByKeys_(p, spec.keys);
    if(!hits.length) continue;

    for(const h of hits){
      const finalUrl = spec.resolver(h.value);
      if(!text(finalUrl)) continue;

      hasAny = true;
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

  const hasMedia = renderSpecsToDock_(p, MEDIA_SPECS);
  const hasSocial = renderSpecsToDock_(p, SOCIAL_SPECS);
  if(mediaDock) mediaDock.style.display = (hasMedia || hasSocial) ? "" : "none";
  applyWideRule_(mediaBtns);

  /* ---- Contact: Private LINE (first) + WeChat/Phone/Email/Address ---- */
  const phone   = pick(p, ["電話","phone","mobile","手機","cell"]);
  const email   = pick(p, ["Email","email","信箱","E-mail","mail"]);
  const address = pick(p, ["地址","address","住址","工作地址"]);

  const lineRaw =
    pick(p, [
      "line_url","line_oa","LINE連結","LINE連結1","LINE Link","line_link",
      "LINE官方帳號","LINE 官方帳號","line oa","Line OA","LINE OA",
      "LINE官網","LINE 官網","line官網","Line官網",
      "LINE","Line","line","LINE ID","Line ID","line id","LINE帳號","LINE 帳號","line_account",
      "LINE@", "Line@", "line@"
    ]);

  let lineUrl = normalizeLineUrl_(lineRaw);
  if(!text(lineUrl)) lineUrl = scanAnyLineFromPayload_(p);

  const wechatUrlRaw = pick(p, ["wechat_url","WeChat URL","微信連結","微信網址"]);
  const wechatIdRaw  = pick(p, ["wechat_id","微信ID","微信","wechat","WeChat","WeChat ID"]);
  const wechatUrl = normalizeLink_(wechatUrlRaw);
  const wechatId = text(wechatIdRaw);

  const contactList = [];

  // ✅ Put "私訊 LINE" into contactDock (priority)
  if(text(lineUrl)){
    contactList.push({
      label:"私訊 LINE",
      icon:"fa-brands fa-line",
      cls:"dock-line",
      action: ()=> goLineIntro()
    });
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

/* ---------- Text helpers ---------- */
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

/* ---------- Expiry + Status gate ---------- */
function parseAnyDate_(raw){
  const v = text(raw);
  if(!v) return null;

  if(/^\d{13}$/.test(v)){
    const d = new Date(Number(v));
    return isNaN(d.getTime()) ? null : d;
  }
  if(/^\d{10}$/.test(v)){
    const d = new Date(Number(v) * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  const m = v.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if(m){
    const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]||0), Number(m[5]||0), Number(m[6]||0));
    return isNaN(d.getTime()) ? null : d;
  }

  const d2 = new Date(v);
  return isNaN(d2.getTime()) ? null : d2;
}

function getExpiryInfo_(p){
  const raw = pick(p, [
    "expires_at","expired_at","expire_at","expiry_at","expiry","expire_date","expires","due_date","due",
    "ExpireAt","ExpiresAt","ExpiredAt","Expiry","DueDate",
    "到期日","到期","有效期限","到期日期","失效日"
  ]);
  const d = parseAnyDate_(raw);
  if(!d) return { has:false, date:null, daysLeft:null };

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysLeft = Math.ceil((end - start) / (24*60*60*1000));
  return { has:true, date:d, daysLeft };
}

function normalizeStatus_(p){
  const s = text(pick(p, ["status","Status","狀態"])).toLowerCase();
  return s || "";
}

function showLockedUi_(reasonText){
  safeSetText_("u-name", "請聯繫客服開通");
  safeSetText_("u-unit", "請聯繫客服開通");
  safeSetText_("u-title", "");

  const sEl = qs("u-slogan");
  if(sEl){
    sEl.style.display = "";
    sEl.textContent = text(reasonText) || "請聯繫客服開通";
  }

  ["block-service","block-exp","mediaDock","photoWall"].forEach(id=>{
    const el = qs(id);
    if(el) el.style.display = "none";
  });

  const logoWrap = qs("logoWrap");
  const logoImg = qs("u-logo");
  if(logoWrap) logoWrap.style.display = "none";
  if(logoImg) logoImg.removeAttribute("src");

  const avatar = qs("u-img");
  if(avatar) avatar.removeAttribute("src");

  const cDock = qs("contactDock");
  const cBtns = qs("contactButtons");
  if(cBtns) cBtns.innerHTML = "";
  if(cDock) cDock.style.display = "";

  if(cBtns){
    cBtns.appendChild(buildDockBtn_({
      label: "聯繫開通",
      icon: "fa-solid fa-headset",
      extraClass: "dock-web",
      onClick: ()=> goFillForm()
    }));
    applyWideRule_(cBtns);
  }
}

function applyStatusGate_(p){
  const status = normalizeStatus_(p);
  const expiry = getExpiryInfo_(p);

  if(expiry.has && typeof expiry.daysLeft === "number" && expiry.daysLeft <= 0){
    showLockedUi_("此名片已到期，請聯繫客服開通");
    return { locked:true, expiry };
  }

  if(!status || status !== "active"){
    showLockedUi_("請聯繫客服開通");
    return { locked:true, expiry };
  }

  return { locked:false, expiry };
}

function applyExpiryHint_(p, expiryInfo){
  if(!expiryInfo || !expiryInfo.has) return;
  const days = expiryInfo.daysLeft;
  if(!(typeof days === "number")) return;

  if(days >= 1 && days <= 30){
    const sEl = qs("u-slogan");
    const hint = `⏳ 名片即將到期（剩 ${days} 天）`;
    if(sEl){
      const old = text(sEl.textContent);
      sEl.style.display = "";
      sEl.textContent = old ? (old + "｜" + hint) : hint;
    }
  }
}

/* ---------- Main render ---------- */
function renderCard(row){
  const p = buildNormalizedPayload_(row || {});
  currentRow = p;

  syncStateFromPayload_(p);
  applyBodyClasses_();
  syncActiveButtonsFromState_();

  const gate = applyStatusGate_(p);
  if(gate.locked){
    const vt = qs("versionTag");
    if(vt) vt.textContent = CONFIG.VERSION;
    return;
  }

  const name  = pick(p, ["name","姓名"]);
  const unitRaw = pick(p, ["unit","單位","公司","company"]);
  const unit = toOneLine_(unitRaw);
  const title = pick(p, ["title","頭銜","職稱"]);

  safeSetText_("u-name", name || "未命名");
  safeSetText_("u-unit", unit);
  safeSetText_("u-title", title);

  const slogan = pick(p, ["slogan","理念標語","簡介","一句話","引言"]);
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

  applyExpiryHint_(p, gate.expiry);

  renderAvatar_(p);
  renderLogo_(p);
  renderBlocks_(p);
  renderDocks_(p);

  const vt = qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;
}

/* ---------- goLineIntro ---------- */
function goLineIntro(){
  const p = currentRow || null;
  if(!p){
    alert("⏳ 名片資料載入中，請稍等一下再點 LINE。");
    return;
  }

  const status = normalizeStatus_(p);
  const expiry = getExpiryInfo_(p);
  if((!status || status !== "active") || (expiry.has && typeof expiry.daysLeft==="number" && expiry.daysLeft<=0)){
    alert("⚠️ 此名片尚未開通或已到期，請聯繫客服開通。");
    return;
  }

  const lineRaw =
    pick(p, [
      "line_url","line_oa",
      "LINE連結","LINE連結1","line_link",
      "LINE官方帳號","LINE 官方帳號","line oa","Line OA","LINE OA",
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
window.__buildLineOaUrlWithState = buildLineOaUrlWithState_;
window.__getCleanShareUrl = buildCleanShareUrl_;

/* ================================
 * Photo Wall + Lightbox (kept)
 * ================================ */
function extractRowFromPayload_(data){
  if(!data || typeof data !== "object") return null;
  if(data.ok === true && data.item && typeof data.item === "object") return data.item;
  if(data.ok === true && data.data && typeof data.data === "object") return data.data;
  if(data.item && typeof data.item === "object") return data.item;
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
    const vFast = pick(p, [`photo${i}_img_fast`,`photo${i}_fast`,`照片${i}_fast`,`photo${i}_url_fast`]);
    const vSlow = pick(p, [`photo${i}_img`,`photo${i}`,`照片${i}`,`photo${i}_url`]);
    const v = text(vFast) ? vFast : vSlow;
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

  const status = normalizeStatus_(p);
  const expiry = getExpiryInfo_(p);
  if((!status || status !== "active") || (expiry.has && typeof expiry.daysLeft==="number" && expiry.daysLeft<=0)){
    wall.style.display = "none";
    grid.innerHTML = "";
    return;
  }

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

/* ---------- Share button (force clean view=1) ---------- */
(function bindShareBtn_(){
  const btn = qs("btnShare");
  if(!btn) return;

  btn.addEventListener("click", async (e)=>{
    try{
      // capture a clean URL always
      const url = buildCleanShareUrl_();

      if(navigator.share){
        e.preventDefault();
        await navigator.share({ title: document.title, url });
        return;
      }

      const ok = await (async ()=>{
        try{
          if(navigator.clipboard?.writeText){
            await navigator.clipboard.writeText(url);
            return true;
          }
        }catch{}
        return false;
      })();

      alert(ok ? "✅ 已複製分享連結（乾淨成品）" : "⚠️ 無法分享/複製，請手動複製網址");
    }catch(err){
      console.warn(err);
    }
  }, true);
})();

/* ---------- Load + Boot ---------- */
async function loadAndRenderById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}&v=${encodeURIComponent(CONFIG.VERSION)}`;
  console.log("[LOAD] fetching:", url);

  try{
    const payload = await fetchJsonRobust_(url);
    if(!payload || payload.ok !== true) throw new Error("GAS not ok");
    const row = extractRowFromPayload_(payload);
    if(!row || typeof row !== "object") throw new Error("Invalid payload shape");

    console.log("[LOAD] success id=", cid, row);
    renderCard(row);
    renderPhotoWall_(row);

  }catch(err){
    console.error("LOAD FAIL:", err);
    safeSetText_("u-name", "資料載入失敗");
    safeSetText_("u-unit", "");
    safeSetText_("u-title", "");
    const vt = qs("versionTag");
    if(vt) vt.textContent = CONFIG.VERSION;
  }
}

function hideTopPrivateLineCta_(){
  // ✅ per request: move private line to contactDock, hide top CTA buttons
  ["btnLinePrivateCta","btnLinePrivateCta2"].forEach(id=>{
    const b = qs(id);
    if(b){
      b.style.display = "none";
      b.style.visibility = "hidden";
      b.style.opacity = "0";
      b.style.pointerEvents = "none";
      b.setAttribute("aria-hidden","true");
      b.tabIndex = -1;
    }
  });
}

(function boot_(){
  try{
    ensureLightbox_();

    // initial from body (works even before data)
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
    syncActiveButtonsFromState_();

    // ✅ v521.5: selection -> LINE OA CTA linkage (facade only; clean returns base)
    bindLineOaOverride_();

    // ✅ v521.5: move private LINE to contact dock
    hideTopPrivateLineCta_();

    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    loadAndRenderById_(id);

  }catch(e){
    console.error(e);
  }
})();