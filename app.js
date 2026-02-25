/* ========================================
Happiness Smart Card System — app.js v398.2
COMPLETE OVERWRITE (1/3)

Fix:
- Plan/theme/style/paper sync (facade + sample)
- Style buttons mapping: no more wrong order (arch/flat/spot)
Add:
- Dock icon pills (Font Awesome)
- Read more / Collapse for long texts

Requires:
- index.html has Font Awesome loaded (already)
- style.css v398.2 has .dock-btn i/span + .readmore-btn + clamp CSS (already)

======================================== */

const CONFIG = {
  VERSION: "398.2",
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  RETRY: 2,
  DEBUG: true,

  TRIPLE_TAP_WINDOW_MS: 500,

  // Read more
  CLAMP_LINES_BLOCK: 6,
  CLAMP_LINES_SLOGAN: 4
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
Hidden backend (triple tap, invisible hotzone)
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

      <button id="hbCopyUrl" type="button"
        style="border:none; padding:10px 12px; border-radius:14px; font-weight:900; cursor:pointer;">
        複製名片網址
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
      <br/>Keys：<span id="hbKeys"></span>
      <br/>UI：<span id="hbUi"></span>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector("#hbClose").onclick = () => show(panel, false);
  panel.querySelector("#hbCopyId").onclick = () => copyText_(__resolvedId || "");
  panel.querySelector("#hbCopyUrl").onclick = () => copyText_(location.href);
  panel.querySelector("#hbOpenForm").onclick = () => window.open(CONFIG.FORM, "_blank");
  panel.querySelector("#hbToggleDebug").onclick = () => { CONFIG.DEBUG = !CONFIG.DEBUG; };

  return panel;
}

async function copyText_(s){
  const v = text(s);
  if(!v) return;
  try{
    await navigator.clipboard.writeText(v);
  }catch{
    const ta = document.createElement("textarea");
    ta.value = v;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

function updateHiddenBackendInfo_(){
  const panel = $("hiddenBackendPanel");
  if(!panel) return;
  const idText = panel.querySelector("#hbIdText");
  const keys = panel.querySelector("#hbKeys");
  const ui = panel.querySelector("#hbUi");

  if(idText) idText.textContent = __resolvedId || "";
  if(keys) keys.textContent = __payload ? String(Object.keys(__payload).length) : "0";
  if(ui) ui.textContent = `${state.mode}/${state.theme}/${state.style}/${state.paper}`;
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
Facade sync (plan/theme/style/paper) + persistence
Fix:
- dots row visibility by plan
- style buttons mapping from onclick arg (no more wrong order)
--------------------------- */
const STORAGE_KEY_UI = "hsc_ui_state_v398_2";

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

  // clear themes
  for(let i=1;i<=5;i++) body.classList.remove(`color-${i}`);
  for(let i=1;i<=7;i++) body.classList.remove(`p${i}`);
  if(state.theme) body.classList.add(state.theme);

  // style
  body.classList.remove("style-arch","style-flat","style-spot");
  body.classList.add(`style-${state.style || "arch"}`);

  // paper
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
  const rows = qa("#admin-panel .dots-row");
  if(!rows.length) return;

  rows.forEach(row=>{
    const hasFree = row.querySelector(".dot");
    const hasPremium = row.querySelector(".p-dot");

    if(hasFree) row.style.display = (state.mode === "free") ? "flex" : "none";
    if(hasPremium) row.style.display = (state.mode === "premium") ? "flex" : "none";
  });
}

function syncFreeControlsVisibility_(){
  const fc = $("free-controls");
  if(!fc) return;
  fc.style.display = (state.mode === "free") ? "" : "none";
}

/* key: no more order mapping — read onclick args */
function getOnclickArg_(btn){
  const raw = btn?.getAttribute?.("onclick") || "";
  const m = raw.match(/\(\s*'([^']+)'\s*/);
  return m ? m[1] : "";
}

function syncStyleButtons_(){
  const btns = qa("#free-controls .control-row:nth-of-type(1) .btn-neo");
  btns.forEach(b=>{
    const style = getOnclickArg_(b); // arch/flat/spot
    setActive_(b, state.style === style);
  });
}

function syncPaperButtons_(){
  const btns = qa("#free-controls .control-row:nth-of-type(2) .btn-neo");
  btns.forEach(b=>{
    const paper = getOnclickArg_(b); // paper-1/2/3
    setActive_(b, state.paper === paper);
  });
}

function syncFacadeUI_(){
  applyUIClasses_();
  syncPlanButtons_();
  syncDots_();
  syncDotsRowVisibility_();
  syncStyleButtons_();
  syncPaperButtons_();
  syncFreeControlsVisibility_();
  saveUIState_();
  updateHiddenBackendInfo_();
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
Read more / collapse helper
- apply after text set
- uses CSS .is-collapsed + -webkit-line-clamp
--------------------------- */
function enableReadMore_(bodyEl, lines, btnTextMore="讀全文", btnTextLess="收起"){
  if(!bodyEl) return;

  // remove existing button if any (re-render safe)
  const oldBtn = bodyEl.parentElement?.querySelector?.(".readmore-btn");
  if(oldBtn) oldBtn.remove();

  // prepare collapsed
  bodyEl.style.setProperty("--clamp-lines", String(lines));
  bodyEl.classList.add("is-collapsed");

  // measure: if not overflowing, don't add button
  // Use scrollHeight vs clientHeight after next frame
  requestAnimationFrame(()=>{
    const isOverflow = bodyEl.scrollHeight - bodyEl.clientHeight > 2;
    if(!isOverflow){
      bodyEl.classList.remove("is-collapsed");
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "readmore-btn";
    btn.textContent = btnTextMore;

    btn.onclick = () => {
      const collapsed = bodyEl.classList.contains("is-collapsed");
      if(collapsed){
        bodyEl.classList.remove("is-collapsed");
        btn.textContent = btnTextLess;
      }else{
        bodyEl.classList.add("is-collapsed");
        btn.textContent = btnTextMore;
        // scroll back to block top a little (mobile friendly)
        bodyEl.parentElement?.scrollIntoView?.({ behavior:"smooth", block:"start" });
      }
    };

    bodyEl.parentElement?.appendChild(btn);
  });
}

/* ---------------------------
Blocks renderer (v398 structure)
- Title vs Body is handled by CSS (block-title / block-body)
- preline keeps user line breaks
- auto add read more if long
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

  // enable read more for long text blocks
  if(opts.readMore){
    enableReadMore_(body, opts.clampLines || CONFIG.CLAMP_LINES_BLOCK);
  }
}