const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/3r2ZePN",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v523.9",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/"
};

let currentRow = null;
let deferredInstallPrompt = null;
let currentAvatarUrlCache = "";

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

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

function getSearchParams_(){
  try{ return new URLSearchParams(location.search || ""); }
  catch{ return new URLSearchParams(); }
}

function getIdFromUrl_(){
  try{
    const sp = getSearchParams_();
    return sp.get("id") || "";
  }catch{
    return "";
  }
}

function normalizeUrl_(s){
  let v = String(s||"").trim();
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
  return v;
}

function safeJsonParse_(rawText){
  let s = String(rawText||"").trim();
  if(!s) return null;
  s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
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
    const res = await fetch(url, {
      method:"GET",
      cache:"no-store",
      redirect:"follow",
      signal: controller.signal
    });
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

function buildCardApiUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "card");
  u.searchParams.set("id", cid);
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildNormalizedPayload_(obj){
  if(!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  const lower = Object.create(null);
  for(const k of Object.keys(obj)){
    const nk = String(k || "").trim();
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
    const kk = String(k || "").trim();
    const v1 = p[kk];
    if(v1!=null && text(v1)!=="") return v1;
    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2!=null && text(v2)!=="") return v2;
    }
  }
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

  if(url.includes("drive.google.com") && url.includes("/file/d/")){
    const m = url.match(/\/file\/d\/([^/]+)/i);
    if(m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;
  }

  return url;
}

function buildImgCandidates_(raw){
  const s = text(raw);
  if(!s) return [];
  const url = normalizeImageUrl_(s);
  const list = [url];

  if(url.includes("drive.google.com/uc?export=view&id=")){
    const m = url.match(/id=([^&]+)/i);
    if(m && m[1]){
      list.push(`https://drive.google.com/thumbnail?id=${decodeURIComponent(m[1])}&sz=w1200`);
      list.push(`https://drive.google.com/uc?export=download&id=${decodeURIComponent(m[1])}`);
    }
  }

  return [...new Set(list.filter(Boolean))];
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

const BODY_MODE_CLASSES = ["mode-free", "mode-premium"];
const BODY_FREE_THEME_CLASSES = ["color-1", "color-2", "color-3", "color-4", "color-5"];
const BODY_PREMIUM_THEME_CLASSES = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const BODY_STYLE_CLASSES = ["style-arch", "style-flat", "style-spot"];
const BODY_PAPER_CLASSES = ["paper-1", "paper-2", "paper-3"];

const UI_STATE = {
  plan: "free",
  theme: "color-1",
  premiumTheme: "p1",
  style: "arch",
  paper: "paper-1"
};

function removeBodyClasses_(classes){
  classes.forEach(c => document.body.classList.remove(c));
}

function setBodyClassOneOf_(classes, target){
  removeBodyClasses_(classes);
  if(target) document.body.classList.add(target);
}

function setActiveAmong_(elements, activeEl){
  (elements || []).forEach(el => {
    if(el === activeEl) el.classList.add("active");
    else el.classList.remove("active");
  });
}

function syncPlanUI_(){
  const freeBtn = qs("btnPlanFree");
  const premBtn = qs("btnPlanPremium");
  const freeControls = qs("free-controls");
  const premiumControls = qs("premium-controls");
  const badge = qs("premiumBadge");

  setBodyClassOneOf_(BODY_MODE_CLASSES, UI_STATE.plan === "premium" ? "mode-premium" : "mode-free");

  if(UI_STATE.plan === "premium"){
    if(freeControls) freeControls.style.display = "none";
    if(premiumControls) premiumControls.style.display = "";
    if(badge) badge.style.display = "";
    if(freeBtn) freeBtn.classList.remove("active");
    if(premBtn) premBtn.classList.add("active");
  }else{
    if(premiumControls) premiumControls.style.display = "none";
    if(freeControls) freeControls.style.display = "";
    if(badge) badge.style.display = "none";
    if(premBtn) premBtn.classList.remove("active");
    if(freeBtn) freeBtn.classList.add("active");
  }

  syncThemeUI_();
  syncStyleUI_();
  syncPaperUI_();
}

function syncThemeUI_(){
  const freeDots = qsa("#freeDotsRow .dot");
  const premiumDots = qsa("#premiumDotsRow .p-dot");

  removeBodyClasses_(BODY_FREE_THEME_CLASSES);
  removeBodyClasses_(BODY_PREMIUM_THEME_CLASSES);

  if(UI_STATE.plan === "premium"){
    document.body.classList.add(UI_STATE.premiumTheme || "p1");

    premiumDots.forEach(btn => {
      const expected = btn.getAttribute("aria-label");
      if(expected === UI_STATE.premiumTheme){
        btn.classList.add("active");
      }else{
        btn.classList.remove("active");
      }
    });

    freeDots.forEach(btn => btn.classList.remove("active"));
  }else{
    document.body.classList.add(UI_STATE.theme || "color-1");

    freeDots.forEach(btn => {
      const map = {
        "dot-1":"color-1",
        "dot-2":"color-2",
        "dot-3":"color-3",
        "dot-4":"color-4",
        "dot-5":"color-5"
      };
      const match = Object.keys(map).find(cls => btn.classList.contains(cls));
      if(match && map[match] === UI_STATE.theme){
        btn.classList.add("active");
      }else{
        btn.classList.remove("active");
      }
    });

    premiumDots.forEach(btn => btn.classList.remove("active"));
  }
}

function syncStyleUI_(){
  removeBodyClasses_(BODY_STYLE_CLASSES);
  document.body.classList.add(`style-${UI_STATE.style || "arch"}`);

  const buttons = qsa("#styleRow .btn-neo");
  buttons.forEach(btn => {
    const t = text(btn.textContent);
    const map = {
      "正拱": "arch",
      "平直": "flat",
      "晨曦": "spot"
    };
    const v = map[t] || "";
    if(v === UI_STATE.style) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

function syncPaperUI_(){
  removeBodyClasses_(BODY_PAPER_CLASSES);
  document.body.classList.add(UI_STATE.paper || "paper-1");

  const buttons = qsa("#paperRow .btn-neo");
  buttons.forEach(btn => {
    const t = text(btn.textContent);
    const map = {
      "棉紙": "paper-1",
      "象牙紙": "paper-2",
      "霧灰": "paper-3"
    };
    const v = map[t] || "";
    if(v === UI_STATE.paper) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

window.setPlan = function(plan, el){
  UI_STATE.plan = (plan === "premium") ? "premium" : "free";
  syncPlanUI_();
  if(el){
    const planBtns = [qs("btnPlanFree"), qs("btnPlanPremium")].filter(Boolean);
    setActiveAmong_(planBtns, el);
  }
};

window.setTheme = function(theme, el){
  if(!theme) return;

  if(/^color-\d+$/.test(theme)){
    UI_STATE.plan = "free";
    UI_STATE.theme = theme;
  }else if(/^p\d+$/.test(theme)){
    UI_STATE.plan = "premium";
    UI_STATE.premiumTheme = theme;
  }

  syncPlanUI_();

  if(el){
    const groupSel = UI_STATE.plan === "premium" ? "#premiumDotsRow .p-dot" : "#freeDotsRow .dot";
    setActiveAmong_(qsa(groupSel), el);
  }
};

window.setStyle = function(style, el){
  const v = text(style);
  if(!["arch","flat","spot"].includes(v)) return;
  UI_STATE.style = v;
  syncStyleUI_();
  if(el) setActiveAmong_(qsa("#styleRow .btn-neo"), el);
};

window.setPaper = function(paper, el){
  const v = text(paper);
  if(!["paper-1","paper-2","paper-3"].includes(v)) return;
  UI_STATE.paper = v;
  syncPaperUI_();
  if(el) setActiveAmong_(qsa("#paperRow .btn-neo"), el);
};

function initSelectionState_(){
  const body = document.body;
  if(!body) return;

  UI_STATE.plan = body.classList.contains("mode-premium") ? "premium" : "free";

  const freeTheme = BODY_FREE_THEME_CLASSES.find(c => body.classList.contains(c));
  if(freeTheme) UI_STATE.theme = freeTheme;

  const premiumTheme = BODY_PREMIUM_THEME_CLASSES.find(c => body.classList.contains(c));
  if(premiumTheme) UI_STATE.premiumTheme = premiumTheme;

  const styleClass = BODY_STYLE_CLASSES.find(c => body.classList.contains(c));
  if(styleClass) UI_STATE.style = styleClass.replace(/^style-/, "");

  const paperClass = BODY_PAPER_CLASSES.find(c => body.classList.contains(c));
  if(paperClass) UI_STATE.paper = paperClass;

  syncPlanUI_();
}

function renderAvatar_(p){
  const avatarRaw = pick(p, ["avatar_img_fast","avatar_img","avatar_url","個人照_fast","個人照"]);
  const img = qs("u-img");
  if(!img) return;
  const u = normalizeImageUrl_(avatarRaw);
  currentAvatarUrlCache = u || "";
  if(!u){
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, buildImgCandidates_(u));
}

function renderLogo_(p){
  const logoUrl = pick(p, ["logo_img_fast","logo_img","logo_url","Logo_fast","Logo"]);
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
  img.style.borderRadius = "18px";
  img.style.objectFit = "cover";
  setImgWithFallback_(img, buildImgCandidates_(u));
}

function renderBlocks_(p){
  const service = pick(p, ["services","服務項目","service"]);
  const exp     = pick(p, ["experience","經歷","exp"]);

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

function renderContactDock_(p){
  const dock = qs("contactDock");
  const btns = qs("contactButtons");
  if(!dock || !btns) return;
  btns.innerHTML = "";

  const phone   = pick(p, ["phone","電話"]);
  const email   = pick(p, ["email","Email"]);
  const address = pick(p, ["address","地址"]);
  const lineUrl = normalizeUrl_(pick(p, ["line_url","line_oa","LINE連結"]));
  const wechatId = text(pick(p, ["wechat_id","微信ID","微信"]));

  const list = [];

  if(lineUrl){
    list.push({
      label:"私訊 LINE",
      icon:"fa-brands fa-line",
      cls:"dock-line",
      action: ()=> openUrl_(lineUrl)
    });
  }

  if(wechatId){
    list.push({
      label:"微信ID",
      icon:"fa-brands fa-weixin",
      cls:"dock-web",
      action: async ()=>{
        try{ if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(wechatId); }catch{}
        alert("✅ 已複製微信ID");
      }
    });
  }

  if(phone){
    list.push({
      label:"電話",
      icon:"fa-solid fa-phone",
      cls:"dock-web",
      action: ()=> { location.href = `tel:${text(phone)}`; }
    });
  }

  if(email){
    list.push({
      label:"Email",
      icon:"fa-solid fa-envelope",
      cls:"dock-web",
      action: ()=> { location.href = `mailto:${text(email)}`; }
    });
  }

  if(address){
    list.push({
      label:"地址導航",
      icon:"fa-solid fa-location-dot",
      cls:"dock-map",
      action: ()=> openMapByAddress_(address)
    });
  }

  if(!list.length){
    dock.style.display = "none";
    return;
  }

  list.forEach(x=>{
    btns.appendChild(buildDockBtn_({
      label:x.label,
      icon:x.icon,
      extraClass:x.cls,
      onClick:x.action
    }));
  });

  dock.style.display = "";
  applyWideRule_(btns);
}

function inferLinkMeta_(url, kind, idx){
  const u = String(url||"").toLowerCase();

  if(u.includes("youtube.com") || u.includes("youtu.be")) return { label:"YouTube", icon:"fa-brands fa-youtube", cls:"dock-yt" };
  if(u.includes("facebook.com") || u.includes("fb.com")) return { label:"FB", icon:"fa-brands fa-facebook", cls:"dock-fb" };
  if(u.includes("instagram.com")) return { label:"Instagram", icon:"fa-brands fa-instagram", cls:"dock-ig" };
  if(u.includes("threads.net")) return { label:"Threads", icon:"fa-solid fa-at", cls:"dock-web" };

  if(kind === "video") return { label:`影音 ${idx}`, icon:"fa-solid fa-play", cls:"dock-web" };
  return { label:`社群 ${idx}`, icon:"fa-solid fa-link", cls:"dock-web" };
}

function renderPrimaryLinkDock_(p){
  const dock = qs("primaryLinkDock");
  const btns = qs("primaryLinkButtons");
  if(!dock || !btns) return;

  btns.innerHTML = "";
  const website = normalizeUrl_(pick(p, ["website","網站","web","homepage"]));
  if(!website){
    dock.style.display = "none";
    return;
  }

  btns.appendChild(buildDockBtn_({
    label: "官方網站",
    icon: "fa-solid fa-globe",
    extraClass: "dock-web wide",
    onClick: ()=> openUrl_(website)
  }));

  dock.style.display = "";
}

function renderMediaDock_(p){
  const dock = qs("mediaDock");
  const btns = qs("mediaButtons");
  if(!dock || !btns) return;
  btns.innerHTML = "";

  const items = [];
  ["video1","video2","video3"].forEach((k, i)=>{
    const u = normalizeUrl_(pick(p, [k, `影音連結${i+1}`]));
    if(u) items.push({ kind:"video", idx:i+1, url:u });
  });
  ["social1","social2","social3"].forEach((k, i)=>{
    const u = normalizeUrl_(pick(p, [k, `社群連結${i+1}`]));
    if(u) items.push({ kind:"social", idx:i+1, url:u });
  });

  if(!items.length){
    dock.style.display = "none";
    return;
  }

  items.forEach(item=>{
    const meta = inferLinkMeta_(item.url, item.kind, item.idx);
    btns.appendChild(buildDockBtn_({
      label: meta.label,
      icon: meta.icon,
      extraClass: meta.cls,
      onClick: ()=> openUrl_(item.url)
    }));
  });

  dock.style.display = "";
  applyWideRule_(btns);
}

function renderCtaDock_(p){
  const dock = qs("ctaDock");
  const btns = qs("ctaButtons");
  if(!dock || !btns) return;
  btns.innerHTML = "";

  const ctaText = text(pick(p, ["cta_text","CTA文字","ctaText"]));
  const ctaLink = normalizeUrl_(pick(p, ["cta_link","CTA連結","ctaLink"]));

  if(!ctaText || !ctaLink){
    dock.style.display = "none";
    return;
  }

  btns.appendChild(buildDockBtn_({
    label: ctaText,
    icon: "fa-solid fa-bolt",
    extraClass: "dock-web wide",
    onClick: ()=> openUrl_(ctaLink)
  }));

  dock.style.display = "";
}

function renderInstallDock_(){
  const dock = qs("installDock");
  const cleanMode = getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1";
  if(!dock) return;
  dock.style.display = cleanMode ? "" : "none";
}

function renderDocks_(p){
  renderInstallDock_();
  renderContactDock_(p);
  renderPrimaryLinkDock_(p);
  renderMediaDock_(p);
  renderCtaDock_(p);
}

function collectPhotos_(p){
  const keys = [
    "photo1_img_fast","photo2_img_fast","photo3_img_fast","photo4_img_fast","photo5_img_fast",
    "photo1_img","photo2_img","photo3_img","photo4_img","photo5_img",
    "photo1_url","photo2_url","photo3_url","photo4_url","photo5_url"
  ];
  const out = [];
  keys.forEach(k=>{
    const u = normalizeImageUrl_(pick(p, [k]));
    if(u && !out.includes(u)) out.push(u);
  });
  return out;
}

function renderPhotoWall_(p){
  const wall = qs("photoWall");
  const grid = qs("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const photos = collectPhotos_(p);

  if(!photos.length){
    wall.style.display = "none";
    return;
  }

  photos.forEach(u=>{
    const img = document.createElement("img");
    img.className = "wall-img";
    img.alt = "照片";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.width = "100%";
    img.style.aspectRatio = "1 / 1";
    img.style.objectFit = "cover";
    setImgWithFallback_(img, buildImgCandidates_(u));
    img.addEventListener("click", ()=> openUrl_(u));
    grid.appendChild(img);
  });

  wall.style.display = "";
}

function applySmartBalanceToEl_(el){
  if(!el) return;
  const raw = text(el.dataset.rawText || el.textContent);
  if(!raw) return;
  el.dataset.rawText = raw;

  if(window.innerWidth > 560){
    el.textContent = raw;
    return;
  }

  if(el.dataset.balanceType === "hero-copy"){
    const parts = raw.split("｜");
    el.innerHTML = "";
    if(parts.length >= 2){
      const first = document.createElement("span");
      first.className = "balance-line";
      first.textContent = parts[0] + "｜";
      el.appendChild(first);

      const rest = parts.slice(1).join("｜");
      const idx = rest.indexOf("打造");
      if(idx > -1){
        const line2 = document.createElement("span");
        line2.className = "balance-line";
        line2.textContent = rest.slice(0, idx).trim();
        el.appendChild(line2);

        const line3 = document.createElement("span");
        line3.className = "balance-line";
        line3.textContent = rest.slice(idx).trim();
        el.appendChild(line3);
      }else{
        const line2 = document.createElement("span");
        line2.className = "balance-line";
        line2.textContent = rest.trim();
        el.appendChild(line2);
      }
      return;
    }
  }

  if(el.dataset.balanceType === "qr-title" || el.dataset.balanceType === "product-qr-title"){
    if(raw.includes("｜")){
      const arr = raw.split("｜");
      el.innerHTML = `<span class="balance-line">${escapeHtml_(arr[0])}｜</span><span class="balance-line">${escapeHtml_(arr.slice(1).join("｜"))}</span>`;
      return;
    }
  }

  if(el.dataset.balanceType === "qr-sub" || el.dataset.balanceType === "product-qr-sub"){
    if(raw.includes("・")){
      const parts = raw.split("・").map(x=>x.trim()).filter(Boolean);
      if(parts.length >= 2){
        const half = Math.ceil(parts.length / 2);
        const l1 = parts.slice(0, half).join("・");
        const l2 = parts.slice(half).join("・");
        el.innerHTML = `<span class="balance-line">${escapeHtml_(l1)}</span><span class="balance-line">${escapeHtml_(l2)}</span>`;
        return;
      }
    }
  }

  el.textContent = raw;
}

function applySmartBalanceAll_(){
  qsa("[data-balance-type]").forEach(applySmartBalanceToEl_);
}

let __balanceTimer = null;
window.addEventListener("resize", ()=>{
  clearTimeout(__balanceTimer);
  __balanceTimer = setTimeout(applySmartBalanceAll_, 120);
});

function buildCleanShareUrl_(){
  try{
    const u = new URL(location.href);
    if(u.searchParams.get("view") !== "1") u.searchParams.set("view","1");
    u.searchParams.delete("clean");
    u.searchParams.delete("admin");
    return u.toString();
  }catch{
    const url = location.href;
    if(url.includes("view=1")) return url;
    return url + (url.includes("?") ? "&" : "?") + "view=1";
  }
}

function buildHubShareUrl_(){
  try{
    const u = new URL(CONFIG.HUB_URL);
    const id = normalizeId_(getIdFromUrl_());
    if(id) u.searchParams.set("ref", id);
    return u.toString();
  }catch{
    const id = normalizeId_(getIdFromUrl_());
    return CONFIG.HUB_URL + (id ? ("?ref=" + encodeURIComponent(id)) : "");
  }
}

function buildBottomQrUrl_(){
  try{
    const u = new URL(location.href);
    const id = normalizeId_(getIdFromUrl_()) || CONFIG.DEFAULT_ID;
    u.searchParams.set("id", id);
    u.searchParams.set("view", "1");
    u.searchParams.delete("clean");
    u.searchParams.delete("admin");
    return u.toString();
  }catch{
    const id = normalizeId_(getIdFromUrl_()) || CONFIG.DEFAULT_ID;
    return location.origin + location.pathname + "?id=" + encodeURIComponent(id) + "&view=1";
  }
}

function buildQuickChartQrUrl_(url, size){
  const s = Number(size) || 220;
  return "https://quickchart.io/qr?margin=1&ecLevel=H&size=" + encodeURIComponent(s) + "&text=" + encodeURIComponent(url);
}

function setCenterImg_(imgEl, centerImgUrl){
  if(!imgEl) return;
  const u = normalizeImageUrl_(centerImgUrl);
  if(!u){
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    return;
  }
  imgEl.style.display = "block";
  setImgWithFallback_(imgEl, buildImgCandidates_(u));
}

function renderQr(options){
  const {
    container,
    url,
    size = 160,
    colorDark = "#433227",
    colorLight = "#ffffff",
    centerImgEl = null,
    centerImgUrl = ""
  } = options || {};

  if(!container || !url) return false;
  container.innerHTML = "";

  let rendered = false;

  if(window.QRCode){
    try{
      new QRCode(container, {
        text: String(url),
        width: Number(size),
        height: Number(size),
        colorDark,
        colorLight,
        correctLevel: QRCode.CorrectLevel.H
      });
      rendered = !!container.querySelector("canvas, img");
    }catch(err){
      console.error("renderQr QRCode failed:", err);
    }
  }

  if(!rendered){
    const img = document.createElement("img");
    img.alt = "QR Code";
    img.loading = "eager";
    img.decoding = "sync";
    img.referrerPolicy = "no-referrer";
    img.src = buildQuickChartQrUrl_(String(url), Number(size));
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.display = "block";
    container.appendChild(img);
    rendered = true;
  }

  if(centerImgEl){
    setCenterImg_(centerImgEl, centerImgUrl);
  }

  return rendered;
}

window.renderQr = renderQr;
window.__getCurrentAvatarUrl = function(){ return currentAvatarUrlCache || ""; };
window.__getHubShareUrl = buildHubShareUrl_;

function tryRenderBottomQrOnce_(p){
  const sec = qs("bottomQrSection");
  const grid = qs("bottomQrGrid");
  const avatar = qs("bottomQrAvatar");
  if(!sec || !grid || !avatar) return false;

  const qrUrl = buildBottomQrUrl_();
  const avatarRaw = pick(p, ["avatar_img_fast","avatar_img","avatar_url","個人照_fast","個人照"]);
  const avatarUrl = normalizeImageUrl_(avatarRaw);

  const ok = renderQr({
    container: grid,
    url: qrUrl,
    size: 136,
    colorDark: "#433227",
    centerImgEl: avatar,
    centerImgUrl: avatarUrl
  });

  sec.style.display = "";
  return ok;
}

function renderBottomQr_(p){
  const sec = qs("bottomQrSection");
  if(!sec) return;
  sec.style.display = "";

  let attempts = 0;
  const maxAttempts = 20;
  const tick = ()=>{
    attempts++;
    const ok = tryRenderBottomQrOnce_(p);
    if(ok) return;
    if(attempts < maxAttempts) setTimeout(tick, 220);
  };

  tick();
  window.addEventListener("load", ()=>{ tryRenderBottomQrOnce_(p); }, { once:true });
}

function renderFeatureQrFromCurrent_(){
  const grid = qs("featureQrGrid");
  const avatar = qs("featureQrAvatar");
  if(!grid) return;
  renderQr({
    container: grid,
    url: buildHubShareUrl_(),
    size: 152,
    colorDark: "#433227",
    centerImgEl: avatar,
    centerImgUrl: currentAvatarUrlCache
  });
}
window.__renderFeatureQrFromCurrent = renderFeatureQrFromCurrent_;

function renderCard(row){
  const p = buildNormalizedPayload_(row || {});
  currentRow = p;

  const nameEl = qs("u-name");
  const unitEl = qs("u-unit");
  const titleEl = qs("u-title");
  const sloganEl = qs("u-slogan");

  if(nameEl) nameEl.textContent = text(pick(p, ["name","姓名"])) || "未命名";
  if(unitEl) unitEl.textContent = text(pick(p, ["unit","單位","公司"])) || "";
  if(titleEl) titleEl.textContent = text(pick(p, ["title","職稱"])) || "";

  const slogan = text(pick(p, ["slogan","一句話","簡介"]));
  if(sloganEl){
    if(slogan){
      sloganEl.style.display = "";
      sloganEl.textContent = slogan;
    }else{
      sloganEl.style.display = "none";
      sloganEl.textContent = "";
    }
  }

  renderAvatar_(p);
  renderLogo_(p);
  renderBlocks_(p);
  renderDocks_(p);
  renderPhotoWall_(p);
  renderBottomQr_(p);
  renderFeatureQrFromCurrent_();
  applySmartBalanceAll_();

  const vt = qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;
}

function isIos_(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
}

function isStandalone_(){
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function updateInstallUi_(){
  const btn = qs("btnInstallCard");
  const fab = qs("installFab");
  const dock = qs("installDock");
  const canInstall = !!deferredInstallPrompt || isIos_() || !isStandalone_();
  if(btn){
    btn.disabled = false;
    btn.style.opacity = canInstall ? "1" : ".62";
  }
  if(fab) fab.style.display = (getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1") ? "flex" : "none";
  if(dock) dock.style.display = (getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1") ? "" : "none";
}

async function triggerPwaInstall_(){
  if(isStandalone_()){
    alert("✅ 已經安裝在桌面上了");
    return;
  }

  if(deferredInstallPrompt){
    try{
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    }catch(err){
      console.error(err);
    }finally{
      deferredInstallPrompt = null;
      updateInstallUi_();
    }
    return;
  }

  if(isIos_()){
    alert("請用 Safari 開啟，點分享，再選『加入主畫面』。\n\n若目前不是 Safari，請先複製此頁連結後改用 Safari 開啟。");
    return;
  }

  alert("目前裝置尚未出現系統安裝提示。\n\n你可以先用瀏覽器選單中的『安裝應用程式』或『加入主畫面』。");
}

window.__triggerPwaInstall = triggerPwaInstall_;

window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredInstallPrompt = e;
  updateInstallUi_();
});

window.addEventListener("appinstalled", ()=>{
  deferredInstallPrompt = null;
  updateInstallUi_();
});

(async function boot_(){
  try{
    initSelectionState_();
    applySmartBalanceAll_();
    updateInstallUi_();

    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    const url = buildCardApiUrl_(id);
    const payload = await fetchJsonRobust_(url);
    const row = payload?.item || payload?.data || payload;
    renderCard(row);
  }catch(err){
    console.error(err);
    const nameEl = qs("u-name");
    const unitEl = qs("u-unit");
    const titleEl = qs("u-title");
    if(nameEl) nameEl.textContent = "資料載入失敗";
    if(unitEl) unitEl.textContent = "請稍後再試";
    if(titleEl) titleEl.textContent = "";
  }
})();
