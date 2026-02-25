/* ========================================
Happiness Smart Card System — v398.1
FIX:
1) 方案連動同步（含點列切換）
2) 照片欄位更強容錯
3) v398 blocks title/body 層級維持
4) slogan/exp 斷句交給 CSS pre-line
COMPLETE OVERWRITE (1/3)
======================================== */

const CONFIG = {
  VERSION: 398.1,
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  RETRY: 2,
  DEBUG: true,
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

/* ---------------------------
ID helpers
--------------------------- */
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

/* ---------------------------
Payload normalization
--------------------------- */
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
Image helpers
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
Hidden backend panel (triple tap)
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

  panel.querySelector("#hbClose").onclick = () => show(panel, false);
  panel.querySelector("#hbCopyId").onclick = async () => {
    try{
      await navigator.clipboard.writeText(__resolvedId || "");
    }catch{
      const ta = document.createElement("textarea");
      ta.value = __resolvedId || "";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  };
  panel.querySelector("#hbOpenForm").onclick = () => window.open(CONFIG.FORM, "_blank");
  panel.querySelector("#hbToggleDebug").onclick = () => { CONFIG.DEBUG = !CONFIG.DEBUG; };

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
    }
  }

  hot.addEventListener("click", trigger_);
  hot.addEventListener("touchend", (e)=>{ e.preventDefault(); trigger_(); }, { passive:false });
}/* ---------------------------
v398.1: Facade sync (plan/theme/style/paper)
FIX#1: Plan linkage + dots row visibility
- free mode => show .dot row, hide .p-dot row
- premium mode => hide .dot row, show .p-dot row
- keep your HTML onclick="setV382..."
--------------------------- */
const STORAGE_KEY_UI = "hsc_ui_state_v398";

function saveUIState_(){ try{ localStorage.setItem(STORAGE_KEY_UI, JSON.stringify(state)); }catch{} }
function loadUIState_(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_UI);
    if(!raw) return;
    const obj = JSON.parse(raw);
    if(obj && typeof obj === "object") state = { ...state, ...obj };
  }catch{}
}

function setActive_(el, yes){ if(el) el.classList.toggle("active", !!yes); }

function applyUIClasses_(){
  const body = document.body;
  if(!body) return;

  body.classList.remove("mode-free","mode-premium");
  body.classList.add(state.mode === "premium" ? "mode-premium" : "mode-free");

  for(let i=1;i<=5;i++) body.classList.remove(`color-${i}`);
  for(let i=1;i<=7;i++) body.classList.remove(`p${i}`);
  if(state.theme) body.classList.add(state.theme);

  body.classList.remove("style-arch","style-flat","style-spot");
  body.classList.add(`style-${state.style || "arch"}`);

  body.classList.remove("paper-1","paper-2","paper-3");
  body.classList.add(state.paper || "paper-1");
}

function syncPlanButtons_(){
  setActive_($("btnPlanFree"), state.mode === "free");
  setActive_($("btnPlanPremium"), state.mode === "premium");
}

function syncDots_(){
  const freeDots = qa("#admin-panel .dot");
  freeDots.forEach((d, idx) => setActive_(d, state.mode==="free" && state.theme===`color-${idx+1}`));

  const pDots = qa("#admin-panel .p-dot");
  pDots.forEach((d, idx) => setActive_(d, state.mode==="premium" && state.theme===`p${idx+1}`));
}

function syncDotsRowVisibility_(){
  // your HTML has two ".dots-row": first contains .dot, second contains .p-dot
  const rows = qa("#admin-panel .dots-row");
  if(!rows.length) return;

  rows.forEach(row=>{
    const hasFree = row.querySelector(".dot");
    const hasPremium = row.querySelector(".p-dot");

    if(hasFree){
      row.style.display = (state.mode === "free") ? "flex" : "none";
    }
    if(hasPremium){
      row.style.display = (state.mode === "premium") ? "flex" : "none";
    }
  });
}

function syncStyleButtons_(){
  const btns = qa("#free-controls .control-row:nth-of-type(1) .btn-neo");
  const styles = ["arch","flat","spot"];
  btns.forEach((b,i)=> setActive_(b, state.style === styles[i]));
}

function syncPaperButtons_(){
  const btns = qa("#free-controls .control-row:nth-of-type(2) .btn-neo");
  const papers = ["paper-1","paper-2","paper-3"];
  btns.forEach((b,i)=> setActive_(b, state.paper === papers[i]));
}

function syncFreeControlsVisibility_(){
  const fc = $("free-controls");
  if(!fc) return;
  fc.style.display = (state.mode === "free") ? "" : "none";
}

function syncFacadeUI_(){
  applyUIClasses_();
  syncPlanButtons_();
  syncDots_();
  syncDotsRowVisibility_();   // ✅ FIX#1
  syncStyleButtons_();
  syncPaperButtons_();
  syncFreeControlsVisibility_();
  saveUIState_();
}

/* Restore old API names used by your HTML */
window.setV382 = function(mode, theme){
  state.mode = (mode === "premium") ? "premium" : "free";
  state.theme = theme || (state.mode === "premium" ? "p1" : "color-1");
  syncFacadeUI_();
};
window.setV382Style = function(style){
  state.style = (style === "flat" || style === "spot") ? style : "arch";
  syncFacadeUI_();
};
window.setV382Paper = function(paper){
  state.paper = (paper === "paper-2" || paper === "paper-3") ? paper : "paper-1";
  syncFacadeUI_();
};

/* ---------------------------
v398.1: info blocks renderer
- Title vs Body will be styled in CSS (FIX#3 goes to style.css)
- preline class used for slogan/exp (FIX#4)
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
FIX#2: stronger photo extraction
Priority:
1) 照片_fast / 照片 / image / photo (as spec)
2) any keys that look like photo slots: 照片1..照片20 / photo1..photo20 / image1..image20
3) if payload has array-like field, join it
Separators: newline / comma / whitespace
--------------------------- */
function splitPhotoList_(raw){
  const s = text(raw);
  if(!s) return [];
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

function collectPhotoUrls_(payload){
  const urls = [];

  // primary field
  const raw = pick(payload, ["照片_fast", "照片", "image", "photo", "Photo", "Images"]);
  urls.push(...splitPhotoList_(raw));

  // slots: 照片1..照片20 / photo1..photo20 / image1..image20
  for(let i=1;i<=20;i++){
    const v1 = payload[`照片${i}`];
    const v2 = payload[`photo${i}`];
    const v3 = payload[`image${i}`];
    urls.push(...splitPhotoList_(v1));
    urls.push(...splitPhotoList_(v2));
    urls.push(...splitPhotoList_(v3));
  }

  // de-dup
  const uniq = [];
  const seen = new Set();
  for(const u of urls){
    const key = String(u||"").trim();
    if(!key) continue;
    if(seen.has(key)) continue;
    seen.add(key);
    uniq.push(key);
  }
  return uniq;
}

function renderPhotoWall_(payload){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";

  const urls = collectPhotoUrls_(payload); // ✅ FIX#2

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
Dock renderer (adds Video)
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
  if(/^www\./i.test(u)) return "https://" + u;
  if(/^(youtube\.com|youtu\.be)/i.test(u)) return "https://" + u;
  return u;
}

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

  if(text(line)){ host.appendChild(makeBtn_("LINE", line)); count++; }
  if(text(email)){ host.appendChild(makeBtn_("Email", `mailto:${text(email)}`)); count++; }
  if(text(phone)){ host.appendChild(makeBtn_("電話", `tel:${text(phone)}`)); count++; }
  if(text(addr)){
    const map = `https://www.google.com/maps?q=${encodeURIComponent(text(addr))}`;
    host.appendChild(makeBtn_("地址", map)); count++;
  }
  if(text(video)){ host.appendChild(makeBtn_("影音", normalizeVideoUrl_(video))); count++; }

  show(dock, count > 0);
}

/* ---------------------------
Apply Payload → Card (v398 structure)
FIX#4: slogan uses preline to keep line breaks
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

  if(unitEl){ unitEl.textContent = text(unit); show(unitEl, !!text(unit)); }
  if(titleEl){ titleEl.textContent = text(title); show(titleEl, !!text(title)); }

  if(sloganEl){
    sloganEl.textContent = text(slogan);
    sloganEl.classList.add("preline"); // ✅ FIX#4
    show(sloganEl, !!text(slogan));
  }

  setImg_($("u-img"), avatar);

  setInfoBlock_($("block-service"), "服務項目", service, { preline:true });
  setInfoBlock_($("block-exp"), "經歷", exp, { preline:true }); // ✅ FIX#4

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
Expose facade actions
--------------------------- */
window.goFillForm = function(){
  window.open(CONFIG.FORM, "_blank");
};

/* ---------------------------
Boot
--------------------------- */
function boot_(){
  // enable hidden backend entry
  setupTripleTapEntry_();

  // load facade state and sync immediately
  loadUIState_();
  // safety: validate theme value by mode
  if(state.mode === "free" && !/^color-\d$/.test(state.theme)) state.theme = "color-1";
  if(state.mode === "premium" && !/^p\d$/.test(state.theme)) state.theme = "p1";
  if(!state.style) state.style = "arch";
  if(!state.paper) state.paper = "paper-1";

  syncFacadeUI_(); // ✅ ensures dots-row visibility correct on first paint

  // load card
  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });