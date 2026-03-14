const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/3r2ZePN",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v524.6.7",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  DEBUG_QR: true
};

let currentRow = null;
let deferredInstallPrompt = null;
let currentAvatarUrlCache = "";
let currentAvatarSourceKeyCache = "";
let lastBottomQrRenderKey = "";
let lastFeatureQrRenderKey = "";
let lastFacadeQrRenderKey = "";

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

function setQrDebug_(msg){
  const el = qs("qrDebugText");
  if(!el) return;
  el.textContent = text(msg) || "（無除錯資訊）";
}

function appendQrDebug_(msg){
  const el = qs("qrDebugText");
  if(!el) return;
  const old = text(el.textContent);
  el.textContent = old ? (old + "\n" + text(msg)) : text(msg);
}

function showQrDebug_(show){
  const wrap = qs("qrDebugBox");
  if(!wrap) return;
  wrap.style.display = show ? "block" : "none";
}

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
      const id = decodeURIComponent(m[1]);
      list.push(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
      list.push(`https://drive.google.com/uc?export=download&id=${id}`);
    }
  }

  return [...new Set(list.filter(Boolean))];
}

function setImgWithFallback_(imgEl, candidates, options = {}){
  const list = (candidates || []).filter(Boolean);
  if(!imgEl){
    if(typeof options.onFail === "function") options.onFail();
    return;
  }

  if(!list.length){
    if(typeof options.onFail === "function") options.onFail();
    return;
  }

  let idx = 0;
  let done = false;

  imgEl.referrerPolicy = options.referrerPolicy || "no-referrer";
  try{ imgEl.crossOrigin = options.crossOrigin || "anonymous"; }catch{}

  const buildSrc = (src)=>{
    const sep = src.includes("?") ? "&" : "?";
    return src + sep + "t=" + Date.now() + "&v=" + encodeURIComponent(CONFIG.VERSION);
  };

  const cleanup = ()=>{
    imgEl.onerror = null;
    imgEl.onload = null;
  };

  const failAll = ()=>{
    if(done) return;
    done = true;
    cleanup();
    if(typeof options.onFail === "function") options.onFail();
  };

  const tryNext = ()=>{
    if(done) return;
    idx++;
    if(idx >= list.length){
      failAll();
      return;
    }
    imgEl.src = buildSrc(list[idx]);
  };

  imgEl.onload = ()=>{
    if(done) return;
    done = true;
    cleanup();
    if(typeof options.onLoad === "function") options.onLoad();
  };

  imgEl.onerror = ()=>{
    tryNext();
  };

  imgEl.src = buildSrc(list[0]);
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

function mapFreeColorToTheme_(v){
  const raw = text(v).toLowerCase();
  const map = {
    "c1":"color-1","c2":"color-2","c3":"color-3","c4":"color-4","c5":"color-5",
    "color-1":"color-1","color-2":"color-2","color-3":"color-3","color-4":"color-4","color-5":"color-5"
  };
  return map[raw] || "color-1";
}

function mapStyleToUi_(v){
  const raw = text(v).toLowerCase();
  const map = {
    "s1":"arch","s2":"flat","s3":"spot",
    "arch":"arch","flat":"flat","spot":"spot"
  };
  return map[raw] || "arch";
}

function mapPaperToUi_(v){
  const raw = text(v).toLowerCase();
  const map = {
    "f1":"paper-1","f2":"paper-2","f3":"paper-3",
    "paper-1":"paper-1","paper-2":"paper-2","paper-3":"paper-3"
  };
  return map[raw] || "paper-1";
}

function mapPremiumToUi_(v){
  const raw = text(v).toLowerCase();
  const allow = ["p1","p2","p3","p4","p5","p6","p7"];
  return allow.includes(raw) ? raw : "p1";
}

function applyThemeFromPayload_(p){
  const planRaw = text(pick(p, ["plan"])) || "free";
  const isPremium = planRaw === "premium";

  if(isPremium){
    const rawPremium = pick(p, ["premium_color"]);
    UI_STATE.plan = "premium";
    UI_STATE.premiumTheme = mapPremiumToUi_(rawPremium);
  }else{
    const rawColor = pick(p, ["color","free_color"]);
    const rawStyle = pick(p, ["style","free_style"]);
    const rawPaper = pick(p, ["paper","free_paper"]);

    UI_STATE.plan = "free";
    UI_STATE.theme = mapFreeColorToTheme_(rawColor);
    UI_STATE.style = mapStyleToUi_(rawStyle);
    UI_STATE.paper = mapPaperToUi_(rawPaper);
  }

  syncPlanUI_();
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
      if(expected === UI_STATE.premiumTheme) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    freeDots.forEach(btn => btn.classList.remove("active"));
  }else{
    document.body.classList.add(UI_STATE.theme || "color-1");

    freeDots.forEach(btn => {
      const map = {
        "dot-1":"color-1","dot-2":"color-2","dot-3":"color-3","dot-4":"color-4","dot-5":"color-5"
      };
      const match = Object.keys(map).find(cls => btn.classList.contains(cls));
      if(match && map[match] === UI_STATE.theme) btn.classList.add("active");
      else btn.classList.remove("active");
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
    const map = { "正拱": "arch", "平直": "flat", "晨曦": "spot" };
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
    const map = { "棉紙": "paper-1", "象牙紙": "paper-2", "霧灰": "paper-3" };
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

function escapeHtmlWithBreaks_(s){
  return escapeHtml_(s).replace(/\n/g, "<br>");
}

function setExpandableText_(contentEl, toggleEl, rawText, maxLines, options = {}){
  if(!contentEl) return;

  const value = String(rawText || "");
  const hasText = text(value) !== "";
  const allowMultiline = !!options.allowMultiline;

  contentEl.dataset.raw = value;
  contentEl.dataset.maxLines = String(maxLines || 3);
  contentEl.dataset.expandable = "1";

  if(allowMultiline){
    contentEl.innerHTML = escapeHtmlWithBreaks_(value);
    contentEl.classList.add("preline");
  }else{
    contentEl.textContent = value;
    contentEl.classList.remove("preline");
  }

  contentEl.classList.remove("is-expanded");
  contentEl.classList.add("is-collapsed");
  contentEl.style.setProperty("--max-lines", String(maxLines || 3));

  if(toggleEl){
    toggleEl.type = "button";
    toggleEl.textContent = "看更多";
    toggleEl.style.display = "none";
    toggleEl.setAttribute("aria-expanded", "false");
    toggleEl.onclick = null;

    toggleEl.onclick = ()=>{
      const expanded = contentEl.classList.contains("is-expanded");
      if(expanded){
        contentEl.classList.remove("is-expanded");
        contentEl.classList.add("is-collapsed");
        toggleEl.textContent = "看更多";
        toggleEl.setAttribute("aria-expanded", "false");
      }else{
        contentEl.classList.remove("is-collapsed");
        contentEl.classList.add("is-expanded");
        toggleEl.textContent = "收合";
        toggleEl.setAttribute("aria-expanded", "true");
      }
    };
  }

  if(!hasText){
    if(toggleEl) toggleEl.style.display = "none";
    return;
  }

  requestAnimationFrame(()=>{
    refreshExpandableItem_(contentEl, toggleEl);
  });
}

function refreshExpandableItem_(contentEl, toggleEl){
  if(!contentEl) return;

  const maxLines = Number(contentEl.dataset.maxLines || 3);
  const wasExpanded = contentEl.classList.contains("is-expanded");

  contentEl.classList.remove("is-expanded");
  contentEl.classList.add("is-collapsed");
  contentEl.style.setProperty("--max-lines", String(maxLines));

  const needToggle = (contentEl.scrollHeight - contentEl.clientHeight) > 4;

  if(toggleEl){
    toggleEl.style.display = needToggle ? "inline-flex" : "none";
    if(!needToggle){
      toggleEl.textContent = "看更多";
      toggleEl.setAttribute("aria-expanded", "false");
    }
  }

  if(needToggle && wasExpanded){
    contentEl.classList.remove("is-collapsed");
    contentEl.classList.add("is-expanded");
    if(toggleEl){
      toggleEl.textContent = "收合";
      toggleEl.setAttribute("aria-expanded", "true");
    }
  }
}

function refreshAllExpandable_(){
  qsa("[data-expandable='1']").forEach((contentEl)=>{
    const wrap = contentEl.closest(".expandable-wrap") || contentEl.parentElement;
    const toggleEl = wrap ? wrap.querySelector(".expand-toggle") : null;
    refreshExpandableItem_(contentEl, toggleEl);
  });
}

let __expandRefreshTimer = null;
window.addEventListener("resize", ()=>{
  clearTimeout(__expandRefreshTimer);
  __expandRefreshTimer = setTimeout(()=>{
    refreshAllExpandable_();
    applySmartBalanceAll_();
  }, 120);
});

function renderExpandableInfoBlock_(blockEl, title, rawText, maxLines){
  if(!blockEl) return;

  const value = String(rawText || "");
  if(!text(value)){
    blockEl.style.display = "none";
    blockEl.innerHTML = "";
    return;
  }

  blockEl.style.display = "";
  blockEl.innerHTML = `
    <div class="block-title">${escapeHtml_(title)}</div>
    <div class="expandable-wrap">
      <div class="block-body expandable-text is-collapsed preline" style="--max-lines:${Number(maxLines || 3)}"></div>
      <button class="expand-toggle" type="button" style="display:none;">看更多</button>
    </div>
  `;

  const contentEl = blockEl.querySelector(".expandable-text");
  const toggleEl = blockEl.querySelector(".expand-toggle");
  setExpandableText_(contentEl, toggleEl, value, maxLines, { allowMultiline:true });
}

function pickAvatarInfo_(p){
  const keys = [
    "avatar_img_fast",
    "avatar_img",
    "avatar_url",
    "avatar",
    "個人照_fast",
    "個人照",
    "個人照_url"
  ];

  for(const k of keys){
    const v = pick(p, [k]);
    if(text(v)){
      return {
        key: k,
        raw: v,
        url: normalizeImageUrl_(v)
      };
    }
  }

  return {
    key: "",
    raw: "",
    url: ""
  };
}

function pickAvatarUrl_(p){
  const info = pickAvatarInfo_(p);
  return info.url;
}

function renderAvatar_(p){
  const img = qs("u-img");
  if(!img) return;

  const info = pickAvatarInfo_(p);
  const u = info.url;

  currentAvatarUrlCache = u || "";
  currentAvatarSourceKeyCache = info.key || "";

  if(CONFIG.DEBUG_QR){
    showQrDebug_(true);
    setQrDebug_(
      `版本：${CONFIG.VERSION}
ID：${normalizeId_(getIdFromUrl_()) || CONFIG.DEFAULT_ID}
avatar來源欄位：${info.key || "（沒抓到）"}
avatar原始值：${text(info.raw) || "（空）"}
avatar正規化URL：${u || "（空）"}`
    );
  }

  if(!u){
    img.removeAttribute("src");
    if(CONFIG.DEBUG_QR){
      appendQrDebug_("主頭像：無可用 URL");
    }
    return;
  }

  setImgWithFallback_(img, buildImgCandidates_(u), {
    onLoad: ()=>{
      if(CONFIG.DEBUG_QR){
        appendQrDebug_("主頭像：載入成功");
      }
    },
    onFail: ()=>{
      img.removeAttribute("src");
      if(CONFIG.DEBUG_QR){
        appendQrDebug_("主頭像：載入失敗");
      }
    }
  });
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
  setImgWithFallback_(img, buildImgCandidates_(u), {
    onFail: ()=>{
      wrap.style.display = "none";
      img.removeAttribute("src");
    }
  });
}

function renderBlocks_(p){
  const service = pick(p, ["services","服務項目","service"]);
  const exp     = pick(p, ["experience","經歷","exp"]);

  const b1 = qs("block-service");
  const b2 = qs("block-exp");

  renderExpandableInfoBlock_(b1, "服務項目", service, 3);
  renderExpandableInfoBlock_(b2, "經歷", exp, 3);
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
    list.push({ label:"私訊 LINE", icon:"fa-brands fa-line", cls:"dock-line", action: ()=> openUrl_(lineUrl) });
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
    list.push({ label:"電話", icon:"fa-solid fa-phone", cls:"dock-web", action: ()=> { location.href = `tel:${text(phone)}`; } });
  }
  if(email){
    list.push({ label:"Email", icon:"fa-solid fa-envelope", cls:"dock-web", action: ()=> { location.href = `mailto:${text(email)}`; } });
  }
  if(address){
    list.push({ label:"地址導航", icon:"fa-solid fa-location-dot", cls:"dock-map", action: ()=> openMapByAddress_(address) });
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

function stripQueryAndHash_(url){
  const s = String(url || "");
  return s.split("#")[0].split("?")[0];
}

function extractDriveId_(url){
  const s = String(url || "");
  let m = s.match(/[?&]id=([^&]+)/i);
  if(m && m[1]) return decodeURIComponent(m[1]);

  m = s.match(/\/file\/d\/([^/]+)/i);
  if(m && m[1]) return decodeURIComponent(m[1]);

  m = s.match(/\/thumbnail\?id=([^&]+)/i);
  if(m && m[1]) return decodeURIComponent(m[1]);

  return "";
}

function extractFirebaseFingerprint_(url){
  const s = String(url || "");
  if(!/firebasestorage\.googleapis\.com/i.test(s)) return "";
  const noHash = s.split("#")[0];
  const m = noHash.match(/\/o\/([^?]+)/i);
  if(m && m[1]) return decodeURIComponent(m[1]).toLowerCase();
  return "";
}

function extractLastPathSeg_(url){
  const clean = stripQueryAndHash_(url);
  const arr = clean.split("/").filter(Boolean);
  return (arr[arr.length - 1] || "").toLowerCase();
}

function buildImageFingerprint_(raw){
  const url = normalizeImageUrl_(raw);
  if(!url) return "";

  const driveId = extractDriveId_(url);
  if(driveId) return "gdrive:" + driveId.toLowerCase();

  const firebaseKey = extractFirebaseFingerprint_(url);
  if(firebaseKey) return "firebase:" + firebaseKey;

  const noQuery = stripQueryAndHash_(url).toLowerCase();
  const lastSeg = extractLastPathSeg_(url);

  if(lastSeg) return "path:" + lastSeg + "|" + noQuery;
  return "url:" + noQuery;
}

function collectPhotos_(p){
  const slots = [
    ["photo1_img_fast","photo1_img","photo1_url"],
    ["photo2_img_fast","photo2_img","photo2_url"],
    ["photo3_img_fast","photo3_img","photo3_url"],
    ["photo4_img_fast","photo4_img","photo4_url"],
    ["photo5_img_fast","photo5_img","photo5_url"]
  ];

  const photos = [];
  const seen = new Set();

  slots.forEach(keys=>{
    for(const k of keys){
      const raw = pick(p,[k]);
      const url = normalizeImageUrl_(raw);
      if(!url) continue;

      const fp = buildImageFingerprint_(url) || url;
      if(seen.has(fp)) continue;

      seen.add(fp);
      photos.push(url);
      break;
    }
  });

  return photos;
}

function renderPhotoWall_(p){
  const wall = qs("photoWall");
  const grid = qs("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const photos = collectPhotos_(p);
  const count = photos.length;

  if(!count){
    wall.style.display = "none";
    return;
  }

  grid.className = "photo-grid";
  if(count === 1) grid.classList.add("layout-1");
  else if(count === 2) grid.classList.add("layout-2");
  else if(count === 3) grid.classList.add("layout-3");
  else if(count === 4) grid.classList.add("layout-4");
  else grid.classList.add("layout-5");

  photos.forEach((u, idx)=>{
    const img = document.createElement("img");
    img.className = "wall-img";
    img.alt = `照片 ${idx+1}`;
    img.loading = "lazy";
    img.decoding = "async";
    setImgWithFallback_(img, buildImgCandidates_(u), {
      onFail: ()=>{ img.remove(); }
    });
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

function buildCanonicalCleanCardUrl_(id){
  const cid = normalizeId_(id || getIdFromUrl_()) || CONFIG.DEFAULT_ID;
  try{
    const u = new URL(CONFIG.HUB_URL + "index.html");
    u.searchParams.set("id", cid);
    u.searchParams.set("view", "1");
    return u.toString();
  }catch{
    return CONFIG.HUB_URL + "index.html?id=" + encodeURIComponent(cid) + "&view=1";
  }
}

function buildCardShareUrl_(){
  return buildCanonicalCleanCardUrl_(getIdFromUrl_());
}

function buildCleanShareUrl_(){
  return buildCanonicalCleanCardUrl_(getIdFromUrl_());
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
  return buildCanonicalCleanCardUrl_(getIdFromUrl_());
}

function buildFeatureQrUrl_(){
  return buildCanonicalCleanCardUrl_(getIdFromUrl_());
}

function buildFacadeQrUrl_(){
  return buildHubShareUrl_();
}

function getQrCenterRatio_(baseRatio){
  const vw = window.innerWidth || 390;
  if(vw <= 360) return Math.max(0.06, baseRatio - 0.02);
  if(vw <= 520) return Math.max(0.07, baseRatio - 0.01);
  return baseRatio;
}

function buildQrImageUrl_(url, size){
  const s = Number(size) || 220;
  return "https://api.qrserver.com/v1/create-qr-code/"
    + "?size=" + encodeURIComponent(`${s}x${s}`)
    + "&data=" + encodeURIComponent(String(url))
    + "&ecc=H"
    + "&margin=2";
}

function hideCenterImg_(imgEl, reason){
  if(!imgEl) return;
  imgEl.removeAttribute("src");
  imgEl.style.display = "none";
  imgEl.style.background = "transparent";
  imgEl.style.padding = "0";
  imgEl.style.boxShadow = "none";
  if(CONFIG.DEBUG_QR && reason){
    appendQrDebug_(reason);
  }
}

function setCenterImg_(imgEl, centerImgUrl, sizeRatio = 0.09){
  if(!imgEl) return;

  const u = normalizeImageUrl_(centerImgUrl);

  if(!u){
    hideCenterImg_(imgEl, "QR 頭像：無可用 URL，已隱藏");
    return;
  }

  const ratio = getQrCenterRatio_(sizeRatio);

  imgEl.style.position = "absolute";
  imgEl.style.left = "50%";
  imgEl.style.top = "50%";
  imgEl.style.width = `${Math.round(ratio * 100)}%`;
  imgEl.style.height = `${Math.round(ratio * 100)}%`;
  imgEl.style.transform = "translate(-50%, -50%)";
  imgEl.style.borderRadius = "999px";
  imgEl.style.objectFit = "cover";
  imgEl.style.zIndex = "2";
  imgEl.style.background = "transparent";
  imgEl.style.padding = "0";
  imgEl.style.boxShadow = "none";
  imgEl.style.display = "block";

  imgEl.onerror = ()=>{
    hideCenterImg_(imgEl, "QR 頭像：載入失敗，已隱藏");
  };

  setImgWithFallback_(imgEl, buildImgCandidates_(u), {
    crossOrigin: "anonymous",
    referrerPolicy: "no-referrer",
    onLoad: ()=>{
      imgEl.style.display = "block";
      imgEl.style.background = "transparent";
      imgEl.style.padding = "0";
      imgEl.style.boxShadow = "none";
      if(CONFIG.DEBUG_QR){
        appendQrDebug_("QR 頭像：載入成功");
      }
    },
    onFail: ()=>{
      hideCenterImg_(imgEl, "QR 頭像：fallback 全失敗，已隱藏");
    }
  });
}

function renderQr(options){
  const {
    container,
    url,
    size = 160,
    centerImgEl = null,
    centerImgUrl = "",
    centerSizeRatio = 0.09,
    renderKey = ""
  } = options || {};

  if(!container || !url) return false;

  const key = renderKey || `${url}|${size}|${normalizeImageUrl_(centerImgUrl)}|${centerSizeRatio}`;
  if(container.dataset.renderKey === key){
    if(centerImgEl) setCenterImg_(centerImgEl, centerImgUrl, centerSizeRatio);
    return true;
  }

  container.dataset.renderKey = key;
  container.innerHTML = "";

  const img = document.createElement("img");
  img.alt = "QR Code";
  img.loading = "eager";
  img.decoding = "sync";
  img.referrerPolicy = "no-referrer";
  try{ img.crossOrigin = "anonymous"; }catch{}
  img.src = buildQrImageUrl_(url, size) + "&t=" + Date.now();
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.display = "block";
  img.style.objectFit = "contain";
  container.appendChild(img);

  if(centerImgEl){
    setCenterImg_(centerImgEl, centerImgUrl, centerSizeRatio);
  }

  return true;
}

window.renderQr = renderQr;
window.__getCurrentAvatarUrl = function(){ return currentAvatarUrlCache || ""; };
window.__getHubShareUrl = buildHubShareUrl_;
window.__getCardShareUrl = buildCardShareUrl_;

function renderFacadeQrFromCurrent_(){
  const grid = qs("facadeQrGrid");
  if(!grid) return;

  const url = buildFacadeQrUrl_();
  const key = "facade|" + url;
  if(lastFacadeQrRenderKey === key && grid.dataset.renderKey === key) return;

  lastFacadeQrRenderKey = key;
  renderQr({
    container: grid,
    url,
    size: 148,
    centerImgEl: null,
    centerImgUrl: "",
    renderKey: key
  });
}

function renderBottomQr_(p){
  const sec = qs("bottomQrSection");
  const grid = qs("bottomQrGrid");
  const avatar = qs("bottomQrAvatar");

  if(!sec || !grid || !avatar) return;

  const info = pickAvatarInfo_(p);
  const qrUrl = buildBottomQrUrl_();
  const avatarUrl = info.url;
  const key = "bottom|" + qrUrl + "|" + avatarUrl;

  if(CONFIG.DEBUG_QR){
    appendQrDebug_(
      `底部QR：
來源欄位=${info.key || "（沒抓到）"}
URL=${avatarUrl || "（空）"}`
    );
  }

  if(lastBottomQrRenderKey !== key || grid.dataset.renderKey !== key){
    lastBottomQrRenderKey = key;
    renderQr({
      container: grid,
      url: qrUrl,
      size: 136,
      centerImgEl: avatar,
      centerImgUrl: avatarUrl,
      centerSizeRatio: 0.09,
      renderKey: key
    });
  }else{
    setCenterImg_(avatar, avatarUrl, 0.09);
  }

  sec.style.display = "block";
}

function renderFeatureQrFromCurrent_(){
  const grid = qs("featureQrGrid");
  const avatar = qs("featureQrAvatar");
  if(!grid) return;

  const url = buildFeatureQrUrl_();
  const avatarUrl = currentAvatarUrlCache || "";
  const key = "feature|" + url + "|" + avatarUrl;

  if(CONFIG.DEBUG_QR){
    appendQrDebug_(
      `特色QR：
來源欄位=${currentAvatarSourceKeyCache || "（沒抓到）"}
URL=${avatarUrl || "（空）"}`
    );
  }

  if(lastFeatureQrRenderKey !== key || grid.dataset.renderKey !== key){
    lastFeatureQrRenderKey = key;
    renderQr({
      container: grid,
      url,
      size: 152,
      centerImgEl: avatar,
      centerImgUrl: avatarUrl,
      centerSizeRatio: 0.09,
      renderKey: key
    });
  }else{
    setCenterImg_(avatar, avatarUrl, 0.09);
  }
}
window.__renderFeatureQrFromCurrent = renderFeatureQrFromCurrent_;

async function shareUrl_(url, title, textMsg, okMsg){
  try{
    if(navigator.share){
      await navigator.share({ title: title || "天使幸福智慧名片", text: textMsg || "", url });
      return;
    }
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(url);
      alert(okMsg || "✅ 已複製連結");
      return;
    }
    prompt("請手動複製連結", url);
  }catch(_err){}
}

function renderBottomHubShareBtn_(){
  const sec = qs("bottomQrSection");
  if(!sec) return;

  let wrap = qs("bottomHubShareWrap");
  if(!wrap){
    wrap = document.createElement("div");
    wrap.id = "bottomHubShareWrap";
    wrap.style.marginTop = "12px";
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";

    const btn = document.createElement("button");
    btn.id = "btnShareHubBottom";
    btn.type = "button";
    btn.className = "dock-btn wide dock-web";
    btn.style.maxWidth = "260px";
    btn.style.width = "100%";
    btn.style.borderRadius = "999px";
    btn.style.fontWeight = "900";
    btn.style.boxShadow = "0 10px 22px rgba(83,62,45,.08)";
    btn.innerHTML = `<i class="fa-solid fa-share-nodes"></i><span>分享智慧名片館</span>`;
    btn.addEventListener("click", async ()=>{
      const url = buildHubShareUrl_();
      await shareUrl_(url, "天使幸福智慧名片館", "分享智慧名片館", "✅ 已複製智慧名片館連結");
    });

    wrap.appendChild(btn);
    sec.insertAdjacentElement("afterend", wrap);
  }
}

function ensureBottomQrVisible_(){
  if(!currentRow) return;
  try{ renderBottomQr_(currentRow); }catch(e){}
  try{ renderBottomHubShareBtn_(); }catch(e){}

  setTimeout(()=>{
    try{ renderBottomQr_(currentRow); }catch(e){}
    try{ renderBottomHubShareBtn_(); }catch(e){}
  }, 250);

  setTimeout(()=>{
    try{ renderBottomQr_(currentRow); }catch(e){}
    try{ renderBottomHubShareBtn_(); }catch(e){}
  }, 800);
}

function renderCard(row){
  const p = buildNormalizedPayload_(row || {});
  currentRow = p;

  applyThemeFromPayload_(p);

  const nameEl = qs("u-name");
  const unitWrap = qs("u-unit-wrap");
  const unitEl = qs("u-unit");
  const unitToggle = qs("u-unit-toggle");
  const titleEl = qs("u-title");
  const sloganWrap = qs("u-slogan-wrap");
  const sloganEl = qs("u-slogan");
  const sloganToggle = qs("u-slogan-toggle");

  const nameVal = text(pick(p, ["name","姓名"])) || "未命名";
  const unitVal = String(pick(p, ["unit","單位","公司"]) || "");
  const titleVal = text(pick(p, ["title","職稱"])) || "";
  const sloganVal = String(pick(p, ["slogan","一句話","簡介"]) || "");

  if(nameEl) nameEl.textContent = nameVal;

  if(unitWrap && unitEl){
    if(text(unitVal)){
      unitWrap.style.display = "";
      setExpandableText_(unitEl, unitToggle, unitVal, 2, { allowMultiline:true });
    }else{
      unitWrap.style.display = "none";
      unitEl.innerHTML = "";
      if(unitToggle) unitToggle.style.display = "none";
    }
  }

  if(titleEl) titleEl.textContent = titleVal;

  if(sloganWrap && sloganEl){
    if(text(sloganVal)){
      sloganWrap.style.display = "";
      setExpandableText_(sloganEl, sloganToggle, sloganVal, 3, { allowMultiline:true });
    }else{
      sloganWrap.style.display = "none";
      sloganEl.innerHTML = "";
      if(sloganToggle) sloganToggle.style.display = "none";
    }
  }

  renderAvatar_(p);
  renderLogo_(p);
  renderBlocks_(p);
  renderDocks_(p);
  renderPhotoWall_(p);
  renderBottomQr_(p);
  renderBottomHubShareBtn_();
  renderFeatureQrFromCurrent_();
  renderFacadeQrFromCurrent_();
  applySmartBalanceAll_();

  const vt = qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;

  requestAnimationFrame(()=>{
    refreshAllExpandable_();
    ensureBottomQrVisible_();
  });
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
  const cleanMode = getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1";
  const canInstall = !!deferredInstallPrompt || isIos_() || !isStandalone_();
  if(btn){
    btn.disabled = false;
    btn.style.opacity = canInstall ? "1" : ".62";
  }
  if(fab) fab.style.display = cleanMode ? "flex" : "none";
  if(dock) dock.style.display = cleanMode ? "" : "none";
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

window.addEventListener("load", ()=>{
  ensureBottomQrVisible_();
}, { once:true });

(async function boot_(){
  try{
    initSelectionState_();
    applySmartBalanceAll_();
    updateInstallUi_();

    if(CONFIG.DEBUG_QR){
      showQrDebug_(true);
      setQrDebug_("開始載入資料…");
    }

    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    const url = buildCardApiUrl_(id);
    const payload = await fetchJsonRobust_(url);
    const row = payload?.item || payload?.data || payload;

    if(CONFIG.DEBUG_QR){
      appendQrDebug_("資料載入成功");
    }

    renderCard(row);
  }catch(err){
    console.error(err);
    if(CONFIG.DEBUG_QR){
      showQrDebug_(true);
      setQrDebug_(`資料載入失敗：${err && err.message ? err.message : err}`);
    }
    const nameEl = qs("u-name");
    const unitWrap = qs("u-unit-wrap");
    const titleEl = qs("u-title");
    if(nameEl) nameEl.textContent = "資料載入失敗";
    if(unitWrap) unitWrap.style.display = "";
    const unitEl = qs("u-unit");
    if(unitEl) unitEl.textContent = "請稍後再試";
    if(titleEl) titleEl.textContent = "";
  }
})();