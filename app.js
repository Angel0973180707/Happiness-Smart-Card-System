/* ========================================
Happiness Smart Card System — v398
STRUCTURE REFACTOR (UI frame + renderer)
COMPLETE OVERWRITE (1/3)
======================================== */

const CONFIG = {
  VERSION: 398,
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  RETRY: 2,
  DEBUG: true,

  // v398 hidden backend entry
  TRIPLE_TAP_WINDOW_MS: 500
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let __payload = null;
let __resolvedId = CONFIG.DEFAULT_ID;

function $(id){ return document.getElementById(id); }
function qa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v==null ? "" : String(v)).trim(); }
function show(el, yes){ if(el) el.style.display = yes ? "" : "none"; }
function log_(){ if(CONFIG.DEBUG) console.log("[HSC]", ...arguments); }

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

function pick(obj, keys){
  if(!obj) return "";
  for(const k of keys){
    const v = obj[k];
    if(v!=null && text(v)!=="") return v;
  }
  return "";
}

/* ---------------------------
Image URL normalize
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
v398 Hidden Backend Panel (default hidden)
- NOT the facade (admin-panel remains visible)
- opened by bottom-right triple tap within 500ms
--------------------------- */
function ensureHiddenBackendPanel_(){
  let panel = $("hiddenBackendPanel");
  if(panel) return panel;

  panel = document.createElement("div");
  panel.id = "hiddenBackendPanel";
  panel.style.position = "fixed";
  panel.style.left = "12px";
  panel.style.right = "12px";
  panel.style.bottom = "12px";
  panel.style.zIndex = "9999";
  panel.style.background = "rgba(255,255,255,0.96)";
  panel.style.border = "1px solid rgba(0,0,0,0.08)";
  panel.style.borderRadius = "18px";
  panel.style.boxShadow = "0 15px 40px rgba(0,0,0,0.12)";
  panel.style.padding = "12px";
  panel.style.display = "none";

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <div style="font-weight:900;">隱形後台（v398）</div>
      <button id="hbClose" type="button"
        style="border:none; padding:8px 12px; border-radius:12px; font-weight:900; cursor:pointer;">
        關閉
      </button>
    </div>

    <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;">
      <button id="hbCopyId" type="button"
        style="border:none; padding:10px 12px; border-radius:14px; font-weight:900; cursor:pointer;">
        複製名片ID
      </button>

      <button id="hbOpenForm" type="button"
        style="border:none; padding:10px 12px; border-radius:14px; font-weight:900; cursor:pointer;">
        開啟訂製表單
      </button>

      <button id="hbToggleDebug" type="button"
        style="border:none; padding:10px 12px; border-radius:14px; font-weight:900; cursor:pointer;">
        切換 DEBUG
      </button>
    </div>

    <div id="hbInfo" style="margin-top:10px; font-size:12px; opacity:.75; line-height:1.5;">
      ID：<span id="hbIdText"></span>
      <br/>Payload keys：<span id="hbKeys"></span>
    </div>
  `;

  document.body.appendChild(panel);

  // wire actions
  panel.querySelector("#hbClose").onclick = () => show(panel, false);

  panel.querySelector("#hbCopyId").onclick = async () => {
    try{
      await navigator.clipboard.writeText(__resolvedId || "");
      log_("Copied ID:", __resolvedId);
    }catch{
      // fallback
      const ta = document.createElement("textarea");
      ta.value = __resolvedId || "";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  };

  panel.querySelector("#hbOpenForm").onclick = () => window.open(CONFIG.FORM, "_blank");

  panel.querySelector("#hbToggleDebug").onclick = () => {
    CONFIG.DEBUG = !CONFIG.DEBUG;
    log_("DEBUG:", CONFIG.DEBUG);
  };

  return panel;
}

function updateHiddenBackendInfo_(){
  const panel = $("hiddenBackendPanel");
  if(!panel) return;
  const idText = panel.querySelector("#hbIdText");
  const keys = panel.querySelector("#hbKeys");
  if(idText) idText.textContent = __resolvedId || "";
  if(keys) keys.textContent = __payload ? String(Object.keys(__payload).length) : "0";
}

/* ---------------------------
v398 Triple Tap Hotzone (bottom-right inside card-container)
- invisible, 500ms triple tap opens hidden backend panel
--------------------------- */
function setupTripleTapEntry_(){
  const card = $("card-container");
  if(!card) return;

  const panel = ensureHiddenBackendPanel_();

  let hot = $("hiddenHotzone");
  if(!hot){
    hot = document.createElement("div");
    hot.id = "hiddenHotzone";
    hot.style.position = "absolute";
    hot.style.right = "0";
    hot.style.bottom = "0";
    hot.style.width = "84px";
    hot.style.height = "84px";
    hot.style.opacity = "0";
    hot.style.pointerEvents = "auto";
    hot.style.zIndex = "60";
    card.appendChild(hot);
  }

  let taps = [];

  function trigger_(){
    const now = Date.now();
    taps = taps.filter(t => now - t <= CONFIG.TRIPLE_TAP_WINDOW_MS);
    taps.push(now);

    if(taps.length >= 3){
      taps = [];
      const isHidden = (panel.style.display === "none" || getComputedStyle(panel).display === "none");
      show(panel, isHidden);
      updateHiddenBackendInfo_();
      log_("Hidden backend:", isHidden ? "OPEN" : "CLOSE");
    }
  }/* ---------------------------
v398: Text blocks renderer
- fixed containers: #block-service, #block-exp
- titles allowed only: 服務項目 / 經歷
- empty => display:none
--------------------------- */
function setInfoBlock_(host, titleText, content, opts={}){
  if(!host) return;
  const c = text(content);

  if(!c){
    host.innerHTML = "";
    host.style.display = "none";
    return;
  }

  host.style.display = "";

  // minimal title (small, grey) — CSS will style .block-title
  const title = document.createElement("div");
  title.className = "block-title";
  title.textContent = titleText;

  const body = document.createElement("div");
  body.className = "block-body" + (opts.preline ? " preline" : "");
  body.textContent = c;

  host.innerHTML = "";
  host.appendChild(title);
  host.appendChild(body);
}

/* ---------------------------
v398: split & parse photo list
supports separators: newline / comma / whitespace
--------------------------- */
function splitPhotoList_(raw){
  const s = text(raw);
  if(!s) return [];
  // normalize separators to newline
  const normalized = s
    .replace(/\r\n/g, "\n")
    .replace(/[,，]+/g, "\n")
    .replace(/\s+/g, "\n");
  return normalized
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean)
    .map(normalizeImageUrl);
}

/* ---------------------------
v398: Photo Wall renderer (data driven)
priority: 照片_fast > 照片 > image > photo
--------------------------- */
function renderPhotoWall_(payload){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";

  const raw = pick(payload, ["照片_fast", "照片", "image", "photo", "照片Fast", "Photo", "Images"]);
  const urls = splitPhotoList_(raw);

  if(!urls.length){
    show(wall, false);
    return;
  }

  for(const u of urls){
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = "照片";
    img.src = u + (u.includes("?") ? "&" : "?") + "t=" + Date.now();
    img.onclick = () => window.open(u, "_blank");
    grid.appendChild(img);
  }

  show(wall, true);
}

/* ---------------------------
Dock Buttons
--------------------------- */
function makeBtn_(label, url){
  const btn = document.createElement("button");
  btn.className = "dock-btn";
  btn.textContent = label;
  btn.onclick = () => window.open(url, "_blank");
  return btn;
}

function normalizeVideoUrl_(raw){
  const u = text(raw);
  if(!u) return "";
  // if someone pasted youtube short link without scheme
  if(/^www\./i.test(u)) return "https://" + u;
  if(/^(youtube\.com|youtu\.be)/i.test(u)) return "https://" + u;
  return u;
}

/* ---------------------------
v398: Contact Dock renderer
- keep existing LINE/Email/Phone/Address
- add Video button (影音) by recognizing common keys
--------------------------- */
function renderContactDock_(payload){
  const dock = $("contactDock");
  const host = $("contactButtons");
  if(!dock || !host) return;

  host.innerHTML = "";
  let count = 0;

  const line = pick(payload, ["LINE連結", "LINE", "Line", "line"]);
  const email = pick(payload, ["Email", "email", "E-mail"]);
  const phone = pick(payload, ["電話", "手機", "phone", "tel"]);
  const addr = pick(payload, ["地址", "住址", "address"]);
  const video = pick(payload, ["影音連結", "影片連結", "影片", "YouTube", "youtube", "Video", "video", "YT"]);

  if(text(line)){
    host.appendChild(makeBtn_("LINE", line));
    count++;
  }

  if(text(email)){
    host.appendChild(makeBtn_("Email", `mailto:${text(email)}`));
    count++;
  }

  if(text(phone)){
    host.appendChild(makeBtn_("電話", `tel:${text(phone)}`));
    count++;
  }

  if(text(addr)){
    const map = `https://www.google.com/maps?q=${encodeURIComponent(text(addr))}`;
    host.appendChild(makeBtn_("地址", map));
    count++;
  }

  if(text(video)){
    host.appendChild(makeBtn_("影音", normalizeVideoUrl_(video)));
    count++;
  }

  show(dock, count > 0);
}

/* ---------------------------
v398: Apply Payload → Card
- name as main visual
- unit and title split lines (no unitline)
- slogan: optional show
- fixed blocks: service/exp
- dock + photo wall
--------------------------- */
function applyDataToCard(payload){

  const name   = pick(payload, ["姓名", "name", "Name"]);
  const unit   = pick(payload, ["單位", "unit", "Unit"]);
  const title  = pick(payload, ["頭銜", "title", "Title"]);
  const slogan = pick(payload, ["理念標語", "標語", "slogan", "Slogan"]);
  const service = pick(payload, ["服務項目", "服務", "service", "Service"]);
  const exp     = pick(payload, ["經歷", "experience", "Experience", "簡歷"]);

  const avatar = pick(payload, ["個人照_fast","個人照","形象照", "avatar", "photo_fast", "photo"]);

  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl = $("u-title");
  const sloganEl = $("u-slogan");

  if(nameEl) nameEl.textContent = text(name);

  if(unitEl){
    unitEl.textContent = text(unit);
    show(unitEl, !!text(unit));
  }

  if(titleEl){
    titleEl.textContent = text(title);
    show(titleEl, !!text(title));
  }

  if(sloganEl){
    sloganEl.textContent = text(slogan);
    // v398: slogan is optional; show only when has value
    show(sloganEl, !!text(slogan));
  }

  setImg_($("u-img"), avatar);

  // v398 fixed blocks
  setInfoBlock_($("block-service"), "服務項目", service, { preline:false });
  // exp must support newline from GAS
  setInfoBlock_($("block-exp"), "經歷", exp, { preline:true });

  renderContactDock_(payload);
  renderPhotoWall_(payload);

  updateHiddenBackendInfo_();
}/* ---------------------------
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

    log_("Loaded:", cid);

  }catch(e){
    console.error(e);
  }finally{
    updateHiddenBackendInfo_();
  }
}

/* ---------------------------
Expose existing facade actions (keep old buttons working)
--------------------------- */
window.goFillForm = function(){
  window.open(CONFIG.FORM, "_blank");
};

/* ---------------------------
Boot
--------------------------- */
function boot_(){
  // v398: enable hidden backend entry (triple tap) — facade remains visible
  setupTripleTapEntry_();

  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });

  hot.addEventListener("click", trigger_);
  hot.addEventListener("touchend", (e)=>{ e.preventDefault(); trigger_(); }, { passive:false });
}