/* ================================
Happiness Smart Card System — app.js (v398.2 COMPLETE OVERWRITE)

v398.2 GOALS (Fix all):
1) Plan/style/paper linkage correct (arch/flat/spot mapping fixed)
2) Theme colors truly linked (free color-1..5 + premium p1..p7 -> CSS vars --p/--bg/--card-bg/--text)
3) Premium mode actually works (mode-premium + theme pX + controls/dots sync)
4) Renderer matches v398 DOM:
   - u-name / u-unit / u-title / u-slogan
   - block-service / block-exp (with titles)
5) Long text keep newline (pre-line) + optional "Read more"
6) Photo wall dynamic balance (auto columns by count) + robust multi-photo parsing + per-image fallback
7) Hidden admin entry: triple tap (500ms) on card-container bottom-right hotzone

================================ */

const CONFIG = {
  VERSION: "398.2",

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  // hidden admin
  ADMIN_TRIPLETAP_WINDOW_MS: 500,
  ADMIN_TRIPLETAP_REQUIRED: 3,

  // photos
  PHOTO_SLOT_MAX: 20,

  // read more
  READMORE_MIN_CHARS: 160,
  READMORE_CLAMP_LINES: 6,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __resolvedId = CONFIG.DEFAULT_ID;

/* --------------------------- */
function $(id){ return document.getElementById(id); }
function q(sel, root=document){ return root.querySelector(sel); }
function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function text(v){ return (v==null?"":String(v)).trim(); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function log_(){ if(CONFIG.DEBUG) console.log("[HSC-v398.2]", ...arguments); }
function warn_(){ if(CONFIG.DEBUG) console.warn("[HSC-v398.2]", ...arguments); }
function err_(){ console.error("[HSC-v398.2]", ...arguments); }

function show(el, yes){
  if(!el) return;
  el.style.display = yes ? "" : "none";
}

function setText(elOrId, v){
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if(!el) return false;
  el.textContent = text(v);
  return true;
}

/* --------------------------- */
function getParam(name){
  try{ return new URLSearchParams(location.search).get(name); }
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
  return normalizeId_(getParam("id")) || CONFIG.DEFAULT_ID;
}

/* ---------------------------
SAFE class system (do NOT wipe unknown classes)
- fixes: theme not linked / premium not moving / style mismatch caused by class clobber
--------------------------- */
const CLASS_BUCKETS = {
  mode: ["mode-free","mode-premium"],
  freeThemes: ["color-1","color-2","color-3","color-4","color-5"],
  premiumThemes: ["p1","p2","p3","p4","p5","p6","p7"],
  styles: ["style-arch","style-flat","style-spot"],
  papers: ["paper-1","paper-2","paper-3"]
};

function removeBucket_(bucket){
  const list = CLASS_BUCKETS[bucket] || [];
  for(const c of list) document.body.classList.remove(c);
}

function applyBodyClasses_(){
  // mode
  removeBucket_("mode");
  document.body.classList.add(`mode-${state.mode}`);

  // theme
  removeBucket_("freeThemes");
  removeBucket_("premiumThemes");
  document.body.classList.add(state.theme);

  // free-only style/paper
  removeBucket_("styles");
  removeBucket_("papers");

  if(state.mode === "free"){
    document.body.classList.add(`style-${state.style}`);
    document.body.classList.add(state.paper);
  }
}

/* ---------------------------
Theme vars linkage (REAL color linkage)
- CSS uses --p/--bg/--card-bg/--text
So we set them here to ensure the UI actually changes
--------------------------- */
const FREE_THEME = {
  "color-1": { p:"#ff5e5e", bg:"#fff5f5" },
  "color-2": { p:"#00a8ff", bg:"#f2fbff" },
  "color-3": { p:"#ffa502", bg:"#fff7e8" },
  "color-4": { p:"#7d5fff", bg:"#f6f2ff" },
  "color-5": { p:"#2ecc71", bg:"#f1fff6" }
};

const PREMIUM_THEME = {
  "p1": { p:"#a36d6d", bg:"#0f0f12" },
  "p2": { p:"#722f37", bg:"#0f0f12" },
  "p3": { p:"#1c2e42", bg:"#0b0f14" },
  "p4": { p:"#5e548e", bg:"#0f0f14" },
  "p5": { p:"#7a94a6", bg:"#0c0f13" },
  "p6": { p:"#bf953f", bg:"#0f0f12" },
  "p7": { p:"#444444", bg:"#0b0b0d" }
};

function applyThemeVars_(){
  const root = document.documentElement;
  const isFree = state.mode === "free";
  const map = isFree ? FREE_THEME : PREMIUM_THEME;
  const t = map[state.theme] || (isFree ? FREE_THEME["color-1"] : PREMIUM_THEME["p1"]);

  root.style.setProperty("--p", t.p);
  root.style.setProperty("--bg", t.bg);

  // card/text can stay default; premium can be slightly glassy by css already
}

/* ---------------------------
Dots rows toggle
--------------------------- */
function toggleDotsRows_(){
  const rows = qa(".dots-row");
  if(!rows.length) return;

  let freeRow=null, premiumRow=null;
  for(const row of rows){
    if(!freeRow && row.querySelector(".dot")) freeRow = row;
    if(!premiumRow && row.querySelector(".p-dot")) premiumRow = row;
  }

  const isFree = state.mode === "free";
  if(freeRow) freeRow.style.display = isFree ? "flex" : "none";
  if(premiumRow) premiumRow.style.display = isFree ? "none" : "flex";
}

/* ---------------------------
Plan buttons sync
--------------------------- */
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

/* ---------------------------
Free controls show/hide + active states
--------------------------- */
function syncFreeControls_(){
  const panel = $("free-controls");
  if(panel) panel.style.display = (state.mode === "free") ? "block" : "none";

  // sync style buttons
  const styleBtns = panel ? qa(".control-row:nth-child(1) .btn-neo", panel) : [];
  if(styleBtns.length){
    styleBtns.forEach(b=>b.classList.remove("active"));
    const hit = styleBtns.find(b=>{
      const t = text(b.textContent);
      return (state.style==="arch" && t.includes("正拱")) ||
             (state.style==="flat" && t.includes("平直")) ||
             (state.style==="spot" && t.includes("晨曦"));
    });
    if(hit) hit.classList.add("active");
  }

  // sync paper buttons
  const paperBtns = panel ? qa(".control-row:nth-child(2) .btn-neo", panel) : [];
  if(paperBtns.length){
    paperBtns.forEach(b=>b.classList.remove("active"));
    const hit = paperBtns.find(b=>{
      const t = text(b.textContent);
      return (state.paper==="paper-1" && t.includes("棉紙")) ||
             (state.paper==="paper-2" && t.includes("顆粒")) ||
             (state.paper==="paper-3" && t.includes("亞麻"));
    });
    if(hit) hit.classList.add("active");
  }
}

/* ---------------------------
Public switches (HTML onclick hooks)
NOTE: mapping is already correct in your v398 HTML:
arch/flat/spot — we keep them as-is (fixes the "錯置" issue)
--------------------------- */
window.setV382 = function(mode, theme, el){
  state.mode = mode;
  state.theme = theme;

  // active dot
  document.querySelectorAll(".dot, .p-dot").forEach(d=>d.classList.remove("active"));
  if(el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
  syncFreeControls_();
  toggleDotsRows_();

  applyBodyClasses_();
  applyThemeVars_();
};

window.setV382Style = function(style, el){
  state.style = style;

  // active btn in row
  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }

  applyBodyClasses_();
  applyThemeVars_();
};

window.setV382Paper = function(paper, el){
  state.paper = paper;

  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }

  applyBodyClasses_();
  applyThemeVars_();
};

/* ---------------------------
Form CTA
--------------------------- */
window.goFillForm = function(){
  window.open(CONFIG.FORM, "_blank");
};/* =========================
Payload normalize + pick
========================= */
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
  const lowerMap = Object.create(null);

  for(const k of Object.keys(obj)){
    const nk = cleanKey_(k);
    if(!nk) continue;
    const v = obj[k];

    if(out[nk] == null || text(out[nk]) === "") out[nk] = v;

    const lk = nk.toLowerCase();
    if(lowerMap[lk] == null || text(lowerMap[lk]) === "") lowerMap[lk] = v;
  }

  out.__lower = lowerMap;
  return out;
}

function pick(obj, keys){
  if(!obj) return "";
  const raw = obj.__raw || null;
  const lower = obj.__lower || null;

  for(const k of keys){
    if(k == null) continue;
    const kk = cleanKey_(k);

    const v1 = obj[kk];
    if(v1 != null && text(v1) !== "") return v1;

    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2 != null && text(v2) !== "") return v2;
    }
  }

  if(raw){
    for(const k of keys){
      const v = raw[k];
      if(v != null && text(v) !== "") return v;
    }
  }

  return "";
}

/* =========================
Fetch JSON robust
========================= */
async function fetchWithTimeout_(url, timeoutMs){
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
    const ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : "";
    const txt = await res.text();
    const body = (txt || "").trim();

    if(CONFIG.DEBUG){
      const head = body.slice(0, 180).replace(/\s+/g, " ");
      log_("fetch:", { status, ct, len: body.length, head });
    }

    if(!res.ok && !body) throw new Error(`HTTP ${status} (empty)`);
    if(!body) throw new Error("Empty response");

    try{
      return JSON.parse(body);
    }catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error(`Not JSON (status=${status}, ct=${ct || "?"})`);
    }
  }finally{
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url){
  let lastErr = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{
      return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS);
    }catch(e){
      lastErr = e;
      warn_("fetch retry:", i, "err:", e && e.message ? e.message : e);
      await sleep(520 + i*520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* =========================
Images helpers
========================= */
function normalizeImageUrl_(raw){
  if(!raw) return "";
  let url = String(raw).trim();
  if(!url) return "";
  if(url.startsWith("http://")) url = "https://" + url.slice(7);

  if(url.includes("dropbox.com")){
    url = url.replace("dl=0", "raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
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

  let driveId = "";
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const mId = original.match(/(?:\?|&)id=([^&]+)/i);
  const mThumb = original.match(/thumbnail\?id=([^&]+)/i);

  if(mFile && mFile[1]) driveId = mFile[1];
  else if(mId && mId[1]) driveId = mId[1];
  else if(mThumb && mThumb[1]) driveId = mThumb[1];

  if(original.includes("dropbox.com")) return [normalizeImageUrl_(original)];

  if(driveId){
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
      normalizeImageUrl_(original)
    ].filter(Boolean);
  }

  return [normalizeImageUrl_(original)].filter(Boolean);
}

function setImgWithFallback_(imgEl, candidates){
  if(!imgEl) return;
  const list = (candidates || []).map(text).filter(Boolean);
  if(!list.length){
    imgEl.removeAttribute("src");
    return;
  }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;
  let idx = 0;

  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";

  const tryNext = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    if(idx >= list.length){
      imgEl.style.opacity = "0";
      imgEl.removeAttribute("src");
      return;
    }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onload = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    requestAnimationFrame(()=> imgEl.style.opacity = "1");
  };
  imgEl.onerror = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    tryNext();
  };

  imgEl.style.opacity = "0";
  imgEl.style.transition = "opacity 420ms ease";
  tryNext();
}

/* =========================
Read more helper (for blocks)
========================= */
function applyReadMore_(bodyEl, clampLines = CONFIG.READMORE_CLAMP_LINES){
  if(!bodyEl) return;
  const raw = text(bodyEl.textContent);
  if(raw.length < CONFIG.READMORE_MIN_CHARS) return;

  bodyEl.classList.add("is-collapsed");
  bodyEl.style.setProperty("--clamp-lines", String(clampLines));

  // avoid duplicate button
  const next = bodyEl.nextElementSibling;
  if(next && next.classList && next.classList.contains("readmore-btn")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "readmore-btn";
  btn.textContent = "讀全文 ▾";

  btn.addEventListener("click", ()=>{
    const collapsed = bodyEl.classList.contains("is-collapsed");
    if(collapsed){
      bodyEl.classList.remove("is-collapsed");
      btn.textContent = "收起 ▴";
    }else{
      bodyEl.classList.add("is-collapsed");
      btn.textContent = "讀全文 ▾";
      // scroll back a bit for comfort
      try{ bodyEl.scrollIntoView({ block:"nearest", behavior:"smooth" }); }catch{}
    }
  });

  bodyEl.insertAdjacentElement("afterend", btn);
}

/* =========================
Avatar + basic text render (v398 DOM)
========================= */
function getAvatarUrl_(p){
  const keys = [
    "個人照_fast","個人照",
    "形象照_fast","形象照",
    "avatar_fast","avatar",
    "photo_fast","photo",
    "image"
  ];
  let v = pick(p, keys);
  if(text(v)) return v;

  for(let i=1;i<=3;i++){
    v = pick(p, [`個人照${i}`, `形象照${i}`, `avatar${i}`, `photo${i}`, `image${i}`]);
    if(text(v)) return v;
  }
  return "";
}

function renderAvatar_(p){
  const img = $("u-img");
  if(!img) return;
  const raw = getAvatarUrl_(p);
  const cands = buildImageCandidates_(raw);
  if(!cands.length){
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, cands);
}

/* =========================
Blocks renderer (Service / Experience / Slogan)
- keep newline with .preline
- titles are required: 服務項目 / 經歷
========================= */
function setBlock_(blockEl, titleText, bodyText){
  if(!blockEl) return;

  const t = text(titleText);
  const b = String(bodyText ?? "").trim();

  // if empty => hide
  if(!text(b)){
    blockEl.innerHTML = "";
    blockEl.style.display = "none";
    return;
  }

  blockEl.style.display = "";

  blockEl.innerHTML = `
    <div class="block-title">${t}</div>
    <div class="block-body preline"></div>
  `;

  const bodyEl = q(".block-body", blockEl);
  if(bodyEl){
    bodyEl.textContent = b;
    applyReadMore_(bodyEl, CONFIG.READMORE_CLAMP_LINES);
  }
}

function renderCoreText_(p){
  const name   = pick(p, ["姓名","name","Name"]);
  const unit   = pick(p, ["單位","unit","Unit"]);
  const title  = pick(p, ["頭銜","職稱","title","Title"]);
  const slogan = pick(p, ["理念","品牌理念","標語","slogan","Slogan"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-title", title || "");

  const sloganEl = $("u-slogan");
  if(sloganEl){
    const s = String(slogan ?? "").trim();
    if(text(s)){
      sloganEl.style.display = "";
      sloganEl.classList.add("preline");
      sloganEl.textContent = s;

      // optional readmore for slogan if very long
      if(text(s).length >= CONFIG.READMORE_MIN_CHARS){
        sloganEl.classList.add("is-collapsed");
        sloganEl.style.setProperty("--clamp-lines", "4");
      }else{
        sloganEl.classList.remove("is-collapsed");
      }
    }else{
      sloganEl.textContent = "";
      sloganEl.style.display = "none";
    }
  }

  // service/experience blocks (v398 fixed containers)
  const service = pick(p, ["服務項目","服務","service","Service"]);
  const exp = pick(p, ["經歷","簡歷","自介","experience","Experience","bio","Bio"]);

  setBlock_($("block-service"), "服務項目", service);
  setBlock_($("block-exp"), "經歷", exp);
}

/* =========================
Contact dock (icons)
- Create buttons into #contactButtons
- Supports: phone / tel, line, email, website, video/youtube, address(map)
- Also supports "影音" / "影片" / "YouTube" / "IG" / "FB" keys (best-effort)
========================= */
function ensureContactDock_(){
  // v398 HTML has these ids; but keep safe
  if($("contactButtons")) return;

  const mount = q(".info-scroll") || $("card-container") || document.body;
  const dock = document.createElement("div");
  dock.id = "contactDock";
  dock.className = "contact-dock";

  const btns = document.createElement("div");
  btns.id = "contactButtons";
  btns.className = "dock-buttons";

  dock.appendChild(btns);
  mount.appendChild(dock);
}

function mkDockBtn_(label, iconClass, onClick){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "dock-btn";
  b.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  b.addEventListener("click", onClick);
  return b;
}

function normalizeTel_(s){
  const v = text(s);
  if(!v) return "";
  // keep + and digits
  const cleaned = v.replace(/[^\d+]/g, "");
  return cleaned || v;
}

function normalizeUrl_(s){
  let v = text(s);
  if(!v) return "";
  if(v.startsWith("http://") || v.startsWith("https://")) return v;
  // LINE id or handle?
  if(v.startsWith("@")) return "https://line.me/R/ti/p/" + encodeURIComponent(v);
  return "https://" + v;
}

function normalizeAddressToMapUrl_(addr){
  const a = text(addr);
  if(!a) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}

function renderContactDock_(p){
  ensureContactDock_();
  const wrap = $("contactButtons");
  if(!wrap) return;
  wrap.innerHTML = "";

  // candidates (many aliases)
  const phone = pick(p, ["電話","手機","phone","tel","mobile"]);
  const email = pick(p, ["email","Email","信箱","電子郵件"]);
  const line  = pick(p, ["line","Line","line_oa","LINE OA","LINE","Line OA"]);
  const web   = pick(p, ["網站","官網","website","url","URL"]);
  const video = pick(p, ["影音","影片","video","youtube","YouTube","YT"]);
  const addr  = pick(p, ["地址","地點","location","address","Address","導航"]);

  const ig    = pick(p, ["ig","IG","instagram","Instagram"]);
  const fb    = pick(p, ["fb","FB","facebook","Facebook"]);

  const items = [];

  if(text(phone)){
    const t = normalizeTel_(phone);
    items.push(mkDockBtn_("電話", "fa-solid fa-phone", ()=>location.href = `tel:${t}`));
  }
  if(text(line)){
    const u = normalizeUrl_(line);
    items.push(mkDockBtn_("LINE", "fa-brands fa-line", ()=>window.open(u, "_blank")));
  }
  if(text(email)){
    items.push(mkDockBtn_("Email", "fa-solid fa-envelope", ()=>location.href = `mailto:${text(email)}`));
  }
  if(text(web)){
    const u = normalizeUrl_(web);
    items.push(mkDockBtn_("網頁", "fa-solid fa-globe", ()=>window.open(u, "_blank")));
  }
  if(text(video)){
    const u = normalizeUrl_(video);
    items.push(mkDockBtn_("影音", "fa-solid fa-circle-play", ()=>window.open(u, "_blank")));
  }
  if(text(addr)){
    const u = normalizeAddressToMapUrl_(addr);
    items.push(mkDockBtn_("導航", "fa-solid fa-location-dot", ()=>window.open(u, "_blank")));
  }

  if(text(ig)){
    const u = normalizeUrl_(ig);
    items.push(mkDockBtn_("IG", "fa-brands fa-instagram", ()=>window.open(u, "_blank")));
  }
  if(text(fb)){
    const u = normalizeUrl_(fb);
    items.push(mkDockBtn_("FB", "fa-brands fa-facebook", ()=>window.open(u, "_blank")));
  }

  // if none => hide dock container
  const dock = $("contactDock");
  if(!items.length){
    if(dock) dock.style.display = "none";
    return;
  }
  if(dock) dock.style.display = "";

  items.forEach(x=>wrap.appendChild(x));
}

/* =========================
Loading / Fail UI (v398)
========================= */
function setLoadingUi_(){
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-title", "");
  const sloganEl = $("u-slogan");
  if(sloganEl){ sloganEl.textContent=""; sloganEl.style.display="none"; }

  const b1 = $("block-service"); if(b1){ b1.innerHTML=""; b1.style.display="none"; }
  const b2 = $("block-exp"); if(b2){ b2.innerHTML=""; b2.style.display="none"; }

  try{
    const dock = $("contactDock");
    if(dock) dock.style.display = "none";
  }catch{}

  const img = $("u-img");
  if(img) img.removeAttribute("src");
}

function setFailUi_(msg){
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認 id 或 GAS 權限");
  setText("u-title", "");

  const sloganEl = $("u-slogan");
  if(sloganEl){ sloganEl.textContent=""; sloganEl.style.display="none"; }

  const b1 = $("block-service"); if(b1){ b1.innerHTML=""; b1.style.display="none"; }
  const b2 = $("block-exp"); if(b2){ b2.innerHTML=""; b2.style.display="none"; }

  try{
    const dock = $("contactDock");
    if(dock) dock.style.display = "none";
  }catch{}

  const img = $("u-img");
  if(img) img.removeAttribute("src");
}

/* =========================
Main render (v398)
========================= */
function applyDataToCard_(p){
  renderCoreText_(p);
  renderAvatar_(p);
  renderContactDock_(p);
}/* =========================
Photo wall (dynamic balance)
- sources priority: 照片_fast > 照片 > image(s) > photo
- separators: newline / comma / whitespace
- slots: 照片1..20 / 圖片1..20 / photo1..20 / image1..20
- dynamic columns:
  1 img => 1 col
  2-4 => 2 cols
  5+  => 3 cols
- NO empty holes (we only render actual urls)
========================= */
function splitPhotoList_(raw){
  const s = String(raw ?? "").trim();
  if(!s) return [];

  const normalized = s
    .replace(/\r\n/g, "\n")
    .replace(/[,，]+/g, "\n")
    .replace(/[ \t]+/g, "\n");

  return normalized
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
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

  // de-dup by normalized url key
  const out = [];
  const seen = new Set();
  for(const raw of urls){
    const r = text(raw);
    if(!r) continue;
    const key = normalizeImageUrl_(r) || r;
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function ensurePhotoWallDom_(){
  let wall = $("photoWall");
  let grid = $("photoGrid");
  if(wall && grid) return { wall, grid };

  // mount after contact dock if possible
  const mount = q(".info-scroll") || $("card-container") || document.body;

  wall = document.createElement("div");
  wall.id = "photoWall";
  wall.className = "photo-wall";

  const title = document.createElement("div");
  title.className = "wall-title";
  title.textContent = "照片牆";

  grid = document.createElement("div");
  grid.id = "photoGrid";
  grid.className = "photo-grid";

  wall.appendChild(title);
  wall.appendChild(grid);
  mount.appendChild(wall);

  return { wall, grid };
}

function calcPhotoCols_(n){
  if(n <= 1) return 1;
  if(n <= 4) return 2;
  return 3;
}

function renderPhotoWall_(p){
  const { wall, grid } = ensurePhotoWallDom_();
  if(!wall || !grid) return;

  grid.innerHTML = "";

  const list = collectPhotoUrls_(p);
  if(!list.length){
    wall.style.display = "none";
    return;
  }

  wall.style.display = "";

  const cols = calcPhotoCols_(list.length);
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    img.style.opacity = "0";
    img.style.transition = "opacity 420ms ease";

    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands);

    const openUrl = normalizeImageUrl_(raw) || raw;
    img.addEventListener("click", ()=> window.open(openUrl, "_blank"));

    grid.appendChild(img);
  }
}

/* =========================
Hidden admin entry (v398 spec)
- Hotzone: bottom-right of card-container
- Triple tap within 500ms
- Invisible
========================= */
function openAdmin_(){
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  const u = `admin.html?id=${encodeURIComponent(id)}`;
  window.open(u, "_blank");
}

function ensureAdminTripHotzone_(){
  if($("adminTripHotzone")) return $("adminTripHotzone");

  const card = $("card-container");
  if(!card) return null;

  const hs = document.createElement("div");
  hs.id = "adminTripHotzone";
  hs.setAttribute("aria-label", "admin-trip-hotzone");

  hs.style.position = "absolute";
  hs.style.right = "10px";
  hs.style.bottom = "10px";
  hs.style.width = "56px";
  hs.style.height = "56px";
  hs.style.opacity = "0";
  hs.style.pointerEvents = "auto";
  hs.style.borderRadius = "16px";
  hs.style.background = "transparent";
  hs.style.zIndex = "9999";

  card.appendChild(hs);
  return hs;
}

function bindAdminTripTap_(){
  const hs = ensureAdminTripHotzone_();
  if(!hs) return;

  let taps = [];
  const onTap = (e)=>{
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    taps = taps.filter(t => now - t <= CONFIG.ADMIN_TRIPLETAP_WINDOW_MS);
    taps.push(now);

    if(taps.length >= CONFIG.ADMIN_TRIPLETAP_REQUIRED){
      taps = [];
      openAdmin_();
    }
  };

  hs.addEventListener("click", onTap, true);
  hs.addEventListener("touchend", onTap, { passive:false });
}

/* =========================
Load card + boot
========================= */
async function loadCardById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  setLoadingUi_();

  try{
    const data = await fetchJsonRobust_(url);
    if(!data || typeof data !== "object") throw new Error("Invalid payload");
    if(data.ok === false) throw new Error(data.error || "Not found");
    if(Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    // render twice for layout stability
    applyDataToCard_(__payload);
    renderPhotoWall_(__payload);
    await sleep(120);
    applyDataToCard_(__payload);
    renderPhotoWall_(__payload);

    // keep url id updated
    try{
      const u = new URL(location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    }catch{}

    return cid;
  }catch(e){
    err_("loadCard error:", e);
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
    throw e;
  }
}

function ensureMinimumDom_(){
  // v398 requires these ids; if missing we avoid crash
  const required = ["u-name","u-unit","u-title","u-slogan","block-service","block-exp","contactButtons","photoGrid"];
  const missing = required.filter(id => !$(id));
  if(missing.length) warn_("Missing DOM ids:", missing.join(", "));
}

function boot_(){
  // initial UI
  try{ applyBodyClasses_(); }catch{}
  try{ applyThemeVars_(); }catch{}
  try{ syncPlanButtons_(); }catch{}
  try{ syncFreeControls_(); }catch{}
  try{ toggleDotsRows_(); }catch{}

  // admin entry
  try{ bindAdminTripTap_(); }catch{}

  // ensure dock + photo wall exist
  try{ ensureContactDock_(); }catch{}
  try{ ensurePhotoWallDom_(); }catch{}

  try{ ensureMinimumDom_(); }catch{}

  // load
  const id = getCardIdFromUrl_();
  loadCardById_(id).catch(()=>{});
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });
window.addEventListener("load", ()=>{ /* safety */ }, { once:true });