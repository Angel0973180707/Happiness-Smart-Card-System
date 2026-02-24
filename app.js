/* ========================================
Happiness Smart Card System — v397
Minimal Premium Visual Mode
COMPLETE OVERWRITE
======================================== */

const CONFIG = {
  VERSION: 397,
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,
  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let __payload = null;
let __resolvedId = CONFIG.DEFAULT_ID;

/* --------------------------- */
function $(id){ return document.getElementById(id); }
function qa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v==null?"":String(v)).trim(); }
function show(el,yes){ if(el) el.style.display = yes ? "" : "none"; }

function log_(){ if(CONFIG.DEBUG) console.log("[HSC]", ...arguments); }

/* --------------------------- */
function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4,"0");
  if(/^TW\d{1,4}$/.test(v)) return "TW" + v.replace(/^TW/,"").padStart(4,"0");
  return v;
}

function getCardIdFromUrl_(){
  try{
    const id = new URLSearchParams(window.location.search).get("id");
    return normalizeId_(id) || CONFIG.DEFAULT_ID;
  }catch{
    return CONFIG.DEFAULT_ID;
  }
}

/* --------------------------- */
function cleanKey_(k){
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g,"")
    .trim();
}

function buildNormalizedPayload_(obj){
  if(!obj || typeof obj!=="object") return obj;
  const out = {};
  for(const k of Object.keys(obj)){
    const nk = cleanKey_(k);
    if(!nk) continue;
    if(out[nk]==null || text(out[nk])==="") out[nk]=obj[k];
  }
  return out;
}
/* ---------------------------
Image Helpers (stable GitHub + Drive)
--------------------------- */
function normalizeImageUrl(raw){
  if(!raw) return "";
  let url = String(raw).trim();
  if(!url) return "";

  if(url.startsWith("http://")) url = "https://" + url.slice(7);

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]){
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mFile[1])}`;
  }

  const mId = url.match(/[?&]id=([^&]+)/i);
  if(mId && mId[1]){
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mId[1])}`;
  }

  return url;
}

function setImg_(imgEl, url){
  if(!imgEl) return;
  const u = normalizeImageUrl(url);
  if(!u){ imgEl.removeAttribute("src"); return; }

  imgEl.style.opacity = "0";
  imgEl.onload = () => imgEl.style.opacity = "1";
  imgEl.onerror = () => imgEl.style.opacity = "0";

  imgEl.src = u + (u.includes("?") ? "&" : "?") + "t=" + Date.now();
}

/* ---------------------------
Minimal Content Renderer (NO TITLES)
--------------------------- */
function renderDynamicFields_(payload){
  const host = $("dynamicFields");
  if(!host) return;

  host.innerHTML = "";

  const blocks = [];

  const slogan = pick(payload, ["理念標語"]);
  const service = pick(payload, ["服務項目"]);
  const exp = pick(payload, ["經歷"]);

  if(text(slogan)) blocks.push(text(slogan));
  if(text(service)) blocks.push(text(service));
  if(text(exp)) blocks.push(text(exp));

  if(!blocks.length) return;

  for(const content of blocks){
    const div = document.createElement("div");
    div.className = "minimal-block";
    div.textContent = content;
    host.appendChild(div);
  }
}

/* ---------------------------
Dock Buttons (auto / no titles)
--------------------------- */
function makeBtn_(label, url){
  const btn = document.createElement("button");
  btn.className = "dock-btn";
  btn.textContent = label;
  btn.onclick = () => window.open(url, "_blank");
  return btn;
}

function renderContactDock_(payload){
  const dock = $("contactDock");
  const host = $("contactButtons");
  if(!dock || !host) return;

  host.innerHTML = "";
  let count = 0;

  const line = pick(payload, ["LINE連結"]);
  const email = pick(payload, ["Email"]);
  const phone = pick(payload, ["電話"]);
  const addr = pick(payload, ["地址"]);

  if(text(line)){
    host.appendChild(makeBtn_("LINE", line));
    count++;
  }

  if(text(email)){
    host.appendChild(makeBtn_("Email", `mailto:${email}`));
    count++;
  }

  if(text(phone)){
    host.appendChild(makeBtn_("電話", `tel:${phone}`));
    count++;
  }

  if(text(addr)){
    const map = `https://www.google.com/maps?q=${encodeURIComponent(addr)}`;
    host.appendChild(makeBtn_("地址", map));
    count++;
  }

  show(dock, count > 0);
}
function pick(obj, keys){
  if(!obj) return "";
  for(const k of keys){
    const v = obj[k];
    if(v!=null && text(v)!=="") return v;
  }
  return "";
}/* ---------------------------
Apply Payload → Card (Minimal Mode)
--------------------------- */
function applyDataToCard(payload){

  const name = pick(payload, ["姓名"]);
  const unit = pick(payload, ["單位"]);
  const title = pick(payload, ["頭銜"]);
  const avatar = pick(payload, ["個人照_fast","個人照","形象照"]);

  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl = $("u-title");
  const lineEl = $("u-unitline");
  const sloganEl = $("u-slogan");

  if(nameEl) nameEl.textContent = name || "";

  if(unitEl) unitEl.textContent = unit || "";
  if(titleEl) titleEl.textContent = title ? `｜${title}` : "";

  const hasLine = text(unit) || text(title);
  show(lineEl, !!hasLine);

  show(sloganEl, false); // slogan moved into minimal blocks

  setImg_($("u-img"), avatar);

  renderDynamicFields_(payload);
  renderContactDock_(payload);
}

/* ---------------------------
Fetch JSON Robust
--------------------------- */
async function fetchJsonRobust(url){
  let lastErr = null;

  for(let i=0;i<=CONFIG.RETRY;i++){
    try{
      const res = await fetch(url, { cache:"no-store" });
      const txt = await res.text();
      const body = (txt || "").trim();

      if(!body) throw new Error("Empty response");

      try{
        return JSON.parse(body);
      }catch{
        const m = body.match(/\{[\s\S]*\}/);
        if(m) return JSON.parse(m[0]);
        throw new Error("Not JSON");
      }

    }catch(e){
      lastErr = e;
      await new Promise(r=>setTimeout(r, 500));
    }
  }

  throw lastErr;
}

/* ---------------------------
Load Card
--------------------------- */
async function loadCardById_(id){

  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;

  try{
    const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
    const data = await fetchJsonRobust(url);

    if(!data || typeof data !== "object") throw new Error("Invalid payload");

    __payload = buildNormalizedPayload_(data);
    applyDataToCard(__payload);

  }catch(e){
    console.error(e);
  }
}

/* ---------------------------
Boot
--------------------------- */
function boot_(){
  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });