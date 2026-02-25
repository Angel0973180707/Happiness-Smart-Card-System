/* ================================
 * Happiness Smart Card System — app.js (v399.9 COMPLETE OVERWRITE) 1/3
 * Fix:
 * - Social/Video/Web links section render (if DOM exists)
 * - More robust keys for social platforms
 * Keep:
 * - v382 hooks setV382 / setV382Style / setV382Paper
 * - robust fetch + normalize payload
 * ================================ */

const CONFIG = {
  VERSION: "399.9",

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_TRIPLETAP_WINDOW_MS: 650,
  ADMIN_TRIPLETAP_COUNT: 3,

  PHOTO_SLOT_MAX: 20,
  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let __resolvedId = CONFIG.DEFAULT_ID;

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v399]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v399]", ...arguments); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

function getParam(name) {
  try { return new URLSearchParams(window.location.search).get(name); }
  catch { return null; }
}

function normalizeId_(s) {
  const v = text(s).toUpperCase();
  if (!v) return "";
  if (/^TW\d{4}$/i.test(v)) return v;
  if (/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if (/^TW\d{1,4}$/i.test(v)) {
    const n = v.replace(/^TW/i, "");
    return "TW" + n.padStart(4, "0");
  }
  return v;
}

function getCardIdFromUrl_() {
  const id = normalizeId_(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

/* ---------------------------
UI: dots rows (free vs premium)
--------------------------- */
function toggleDotsRows_() {
  const rows = qa(".dots-row");
  if (!rows.length) return;

  let freeRow = null;
  let premiumRow = null;

  for (const row of rows) {
    if (!freeRow && row.querySelector(".dot")) freeRow = row;
    if (!premiumRow && row.querySelector(".p-dot")) premiumRow = row;
  }

  const isFree = state.mode === "free";
  if (freeRow) freeRow.style.display = isFree ? "flex" : "none";
  if (premiumRow) premiumRow.style.display = isFree ? "none" : "flex";
}

/* ---------------------------
Switching system (keep HTML hooks)
--------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
  applyV382_();
};

window.setV382Style = function (style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.setV382Paper = function (paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

function applyV382_() {
  const isFree = state.mode === "free";

  const controlPanel = $("free-controls");
  if (controlPanel) controlPanel.style.display = isFree ? "block" : "none";

  toggleDotsRows_();

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];
  document.body.className = classList.filter(Boolean).join(" ");
}

function syncPlanButtons_() {
  const a = $("btnPlanFree");
  const b = $("btnPlanPremium");
  if (!a || !b) return;

  if (state.mode === "free") {
    a.classList.add("active");
    b.classList.remove("active");
  } else {
    b.classList.add("active");
    a.classList.remove("active");
  }
}

/* ---------------------------
Fetch JSON (robust)
--------------------------- */
async function fetchWithTimeout_(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal
    });

    const status = res.status;
    const ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : "";
    const txt = await res.text();
    const body = (txt || "").trim();

    if (CONFIG.DEBUG) {
      const head = body.slice(0, 180).replace(/\s+/g, " ");
      log_("fetch:", { status, ct, len: body.length, head });
    }

    if (!res.ok && !body) throw new Error(`HTTP ${status} (empty)`);
    if (!body) throw new Error("Empty response");

    try {
      return JSON.parse(body);
    } catch {
      const m = body.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error(`Not JSON (status=${status}, ct=${ct || "?"})`);
    }
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url) {
  let lastErr = null;
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    try {
      return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS);
    } catch (e) {
      lastErr = e;
      warn_("fetch retry:", i, "err:", e && e.message ? e.message : e);
      await sleep(520 + i * 520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}/* ================================
 * Happiness Smart Card System — app.js (v399.9 COMPLETE OVERWRITE) 2/3
 * - Normalize keys + pick()
 * - Images: avatar / logo / photo wall robust
 * - Contact dock (指定順序) + Social/Video/Web links section render
 * ================================ */

/* ---------------------------
Normalize + pick
--------------------------- */
function cleanKey_(k) {
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "")
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "")
    .trim();
}

function buildNormalizedPayload_(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  const lowerMap = Object.create(null);

  for (const k of Object.keys(obj)) {
    const nk = cleanKey_(k);
    if (!nk) continue;
    const v = obj[k];

    if (out[nk] == null || text(out[nk]) === "") out[nk] = v;

    const lk = nk.toLowerCase();
    if (lowerMap[lk] == null || text(lowerMap[lk]) === "") lowerMap[lk] = v;
  }

  out.__lower = lowerMap;
  return out;
}

function pick(obj, keys) {
  if (!obj) return "";
  const raw = obj.__raw || null;
  const lower = obj.__lower || null;

  for (const k of keys) {
    if (k == null) continue;
    const kk = cleanKey_(k);

    const v1 = obj[kk];
    if (v1 != null && text(v1) !== "") return v1;

    if (lower) {
      const v2 = lower[String(kk).toLowerCase()];
      if (v2 != null && text(v2) !== "") return v2;
    }
  }

  if (raw) {
    for (const k of keys) {
      const v = raw[k];
      if (v != null && text(v) !== "") return v;
    }
  }

  return "";
}

/* ---------------------------
Images utils
--------------------------- */
function normalizeImageUrl(raw) {
  if (!raw) return "";
  let url = String(raw).trim();
  if (!url) return "";
  if (url.startsWith("http://")) url = "https://" + url.slice(7);

  if (url.includes("dropbox.com")) {
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (mFile && mFile[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mFile[1])}`;

  const mId = url.match(/(?:\?|&)id=([^&]+)/i);
  if (mId && mId[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mId[1])}`;

  const mThumb = url.match(/thumbnail\?id=([^&]+)/i);
  if (mThumb && mThumb[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mThumb[1])}`;

  return url;
}

function buildImageCandidates_(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  const original = s.startsWith("http://") ? "https://" + s.slice(7) : s;

  let driveId = "";
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const mId = original.match(/(?:\?|&)id=([^&]+)/i);
  const mThumb = original.match(/thumbnail\?id=([^&]+)/i);

  if (mFile && mFile[1]) driveId = mFile[1];
  else if (mId && mId[1]) driveId = mId[1];
  else if (mThumb && mThumb[1]) driveId = mThumb[1];

  if (original.includes("dropbox.com")) return [normalizeImageUrl(original)];

  if (driveId) {
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
      normalizeImageUrl(original)
    ].filter(Boolean);
  }

  return [normalizeImageUrl(original)].filter(Boolean);
}

function setImgWithFallback_(imgEl, candidates) {
  if (!imgEl) return;
  const list = (candidates || []).map(text).filter(Boolean);
  if (!list.length) { imgEl.removeAttribute("src"); return; }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;
  let idx = 0;

  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";

  const tryNext = () => {
    if (imgEl.dataset.loadToken !== token) return;
    if (idx >= list.length) { imgEl.style.opacity = "0"; imgEl.removeAttribute("src"); return; }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onload = () => {
    if (imgEl.dataset.loadToken !== token) return;
    requestAnimationFrame(() => (imgEl.style.opacity = "1"));
  };
  imgEl.onerror = () => {
    if (imgEl.dataset.loadToken !== token) return;
    tryNext();
  };

  imgEl.style.opacity = "0";
  imgEl.style.transition = "opacity 420ms ease";
  tryNext();
}

/* ---------------------------
Avatar / Logo
--------------------------- */
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

function setAvatar_(p){
  const img = $("u-img");
  if(!img) return;
  const raw = getAvatarUrl_(p);
  const cands = buildImageCandidates_(raw);
  if(!cands.length){ img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function getLogoUrl_(p){
  return pick(p, [
    "logo_fast","logo",
    "品牌logo_fast","品牌logo",
    "品牌Logo_fast","品牌Logo",
    "LOGO_fast","LOGO",
    "公司logo_fast","公司logo",
    "公司Logo_fast","公司Logo",
    "商標_fast","商標",
    "mark_fast","mark"
  ]);
}

function setLogo_(p){
  const wrap = $("logoWrap");
  const img = $("u-logo");
  if(!wrap || !img) return;

  const raw = getLogoUrl_(p);
  const cands = buildImageCandidates_(raw);

  if(!cands.length){
    wrap.style.display="none";
    img.removeAttribute("src");
    return;
  }
  wrap.style.display="";
  setImgWithFallback_(img, cands);
}

/* ---------------------------
Photo wall
--------------------------- */
function splitPhotoList_(raw){
  const s = text(raw);
  if(!s) return [];
  const normalized = s
    .replace(/\r\n/g, "\n")
    .replace(/[,，]+/g, "\n")
    .replace(/[ \t]+/g, "\n");

  return normalized.split("\n").map(x=>x.trim()).filter(Boolean);
}

function collectPhotoUrls_(p){
  const urls = [];
  const main = pick(p, ["照片_fast","照片","images","photo_wall","photoWall","照片牆","相片牆","圖片","相簿"]);
  urls.push(...splitPhotoList_(main));

  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitPhotoList_(p[`照片${i}`]));
    urls.push(...splitPhotoList_(p[`圖片${i}`]));
    urls.push(...splitPhotoList_(p[`photo${i}`]));
    urls.push(...splitPhotoList_(p[`image${i}`]));
  }

  const cleaned=[];
  const seen=new Set();
  for(const raw of urls){
    const r=text(raw);
    if(!r) continue;
    const norm=normalizeImageUrl(r);
    const key=norm||r;
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

  grid.innerHTML="";
  const list = collectPhotoUrls_(p);

  if(!list.length){
    wall.style.display="none";
    return;
  }
  wall.style.display="";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt="照片";
    setImgWithFallback_(img, buildImageCandidates_(raw));
    const openUrl = normalizeImageUrl(raw);
    img.onclick=()=>window.open(openUrl||raw,"_blank");
    grid.appendChild(img);
  }
}

/* ---------------------------
Contact dock + Social section
--------------------------- */
function normalizePhone_(s){
  const v=text(s);
  if(!v) return "";
  return v.replace(/[^\d+]/g,"");
}
function ensureHttp_(u){
  let v=text(u);
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith("www.")) return "https://" + v;
  return v;
}

function iconFor_(type){
  const t=String(type||"").toLowerCase();
  if(t==="phone") return "fa-solid fa-phone";
  if(t==="email") return "fa-solid fa-envelope";
  if(t==="web") return "fa-solid fa-globe";
  if(t==="map") return "fa-solid fa-location-dot";
  if(t==="line") return "fa-brands fa-line";
  if(t==="wechat") return "fa-brands fa-weixin";
  if(t==="video") return "fa-solid fa-circle-play";
  if(t==="youtube") return "fa-brands fa-youtube";
  if(t==="ig") return "fa-brands fa-instagram";
  if(t==="fb") return "fa-brands fa-facebook";
  if(t==="tiktok") return "fa-brands fa-tiktok";
  if(t==="bilibili") return "fa-brands fa-bilibili";
  return "fa-solid fa-link";
}

function addDockBtn_(wrap,label,href,iconClass){
  if(!wrap || !href) return;
  const btn=document.createElement("button");
  btn.type="button";
  btn.className="dock-btn";
  btn.innerHTML=`<i class="${iconClass}"></i><span>${label}</span>`;
  btn.onclick=()=>window.open(href,"_blank");
  wrap.appendChild(btn);
}

/* --- Social section (影音/社群/網站) --- */
function getSocialRoot_(){
  const a = $("socialSection");
  const b = $("socialButtons");
  if(a && b) return { section:a, wrap:b };
  if(b) return { section: b.parentElement || document.body, wrap:b };
  const c = $("socialLinks");
  if(c) return { section: c.parentElement || document.body, wrap:c };
  return null;
}

function addSocialBtn_(wrap,label,href,icon){
  if(!wrap || !href) return;
  const btn=document.createElement("button");
  btn.type="button";
  btn.className="dock-btn";
  btn.innerHTML=`<i class="${icon}"></i><span>${label}</span>`;
  btn.onclick=()=>window.open(href,"_blank");
  wrap.appendChild(btn);
}

function renderSocialLinks_(p){
  const root = getSocialRoot_();
  if(!root) return;

  const { section, wrap } = root;
  wrap.innerHTML = "";

  const yt = pick(p, ["youtube","YouTube","YT","頻道","channel","youtube_url","yt_url"]);
  const ig = pick(p, ["ig","IG","instagram","Instagram","ig_url"]);
  const fb = pick(p, ["fb","FB","facebook","Facebook","fb_url"]);
  const tt = pick(p, ["tiktok","TikTok","抖音","douyin","tt_url"]);
  const bili = pick(p, ["bilibili","B站","哔哩哔哩","bili","bili_url"]);
  const video = pick(p, ["影音平台","video","video_url","影片","影音連結","社群平台"]);
  const web = pick(p, ["官網","網站","website","url","link","個人網頁","網頁"]);

  const addIf = (val, label, icon) => {
    const v = text(val);
    if(!v) return;
    const href = v.includes("http") ? ensureHttp_(v) : `https://www.google.com/search?q=${encodeURIComponent(v)}`;
    addSocialBtn_(wrap, label, href, icon);
  };

  addIf(yt, "YouTube", iconFor_("youtube"));
  addIf(ig, "IG", iconFor_("ig"));
  addIf(fb, "FB", iconFor_("fb"));
  addIf(tt, "TikTok", iconFor_("tiktok"));
  addIf(bili, "B站", iconFor_("bilibili"));
  addIf(video, "影音平台", iconFor_("video"));

  const w = ensureHttp_(web);
  if(w && /^https?:\/\//i.test(w)){
    addSocialBtn_(wrap, "個人網頁", w, iconFor_("web"));
  }

  section.style.display = wrap.children.length ? "" : "none";
}

/* --- Contact dock (指定順序：line官網、line、微信、電話、Email、導航) --- */
function renderContactDock_(p){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML="";

  const lineOfficial = pick(p, ["line官網","line官網預約","line官方","line官方帳號","line_oa","LINE_OA","line oa","LINE OA","line官方帳號連結"]);
  const line = pick(p, ["line","line_id","Line","LINE"]);
  const wechat = pick(p, ["wechat","weixin","微信","微信號","weixin_id","wx","wxid"]);
  const phone = pick(p, ["電話","手機","phone","mobile","tel"]);
  const email = pick(p, ["email","Email","E-mail","電子郵件","mail"]);
  const addr = pick(p, ["地址","address","所在地","location"]);

  // 1) LINE 官網 / 官方帳號
  const lo = text(lineOfficial);
  if(lo){
    const href = lo.includes("http") ? ensureHttp_(lo) : `https://line.me/R/ti/p/${encodeURIComponent(lo)}`;
    addDockBtn_(wrap, "LINE官網", href, iconFor_("web"));
  }

  // 2) LINE
  const lineV = text(line);
  if(lineV){
    const href = lineV.includes("http") ? ensureHttp_(lineV) : `https://line.me/R/ti/p/${encodeURIComponent(lineV)}`;
    addDockBtn_(wrap, "LINE", href, iconFor_("line"));
  }

  // 3) WeChat：維持你先前規則（之後你要改成「複製ID」我在 3/3 做）
  const wx = text(wechat);
  if(wx){
    const href = `https://www.google.com/search?q=${encodeURIComponent("WeChat " + wx)}`;
    addDockBtn_(wrap, "微信", href, iconFor_("wechat"));
  }

  // 4) phone
  const pnum = normalizePhone_(phone);
  if(pnum){
    addDockBtn_(wrap, "電話", `tel:${pnum}`, iconFor_("phone"));
  }

  // 5) email
  const em = text(email);
  if(em){
    addDockBtn_(wrap, "Email", `mailto:${encodeURIComponent(em)}`, iconFor_("email"));
  }

  // 6) map
  const a = text(addr);
  if(a){
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
    addDockBtn_(wrap, "導航", href, iconFor_("map"));
  }

  dock.style.display = wrap.children.length ? "" : "none";

  // Social links
  renderSocialLinks_(p);
}/* ================================
 * Happiness Smart Card System — app.js (v399.9 COMPLETE OVERWRITE) 3/3
 * - Apply data to card (含影音/社群顯示)
 * - Load card by id (robust)
 * - Hidden admin entry (top invisible hotspot)
 * - Premium safety for name (避免被切)
 * - WeChat: copy ID (不跳搜尋)
 * - Boot
 * ================================ */

/* ---------------------------
Blocks render (service / experience)
--------------------------- */
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

  const b = text(body);
  if(!b){
    root.innerHTML = "";
    root.style.display = "none";
    return;
  }
  root.style.display = "";

  root.innerHTML = `
    <div class="block-title">${title}</div>
    <div class="block-body preline">${escapeHtml_(b)}</div>
  `;
}

/* ---------------------------
WeChat copy helper
--------------------------- */
async function copyWechatId_(wx){
  const v = text(wx);
  if(!v) return false;
  const ok = await copyText_(v);
  if(ok) toast_("已複製微信ID");
  return ok;
}

/* ---------------------------
Premium name safety (避免被切)
- 不改樣式，只在 premium 時微調 name 的可視穩定
--------------------------- */
function premiumNameSafety_(){
  if(state.mode !== "premium") return;
  const nameEl = $("u-name");
  if(!nameEl) return;

  // 先暫時取消任何 transform/過渡造成的裁切風險
  nameEl.style.willChange = "transform";
  nameEl.style.transform = "translateZ(0)";

  // 如果文字太長：縮小一點 + 允許換行（不破壞現有 CSS）
  const txt = text(nameEl.textContent);
  if(txt.length >= 8){
    nameEl.style.fontSize = "20px";
    nameEl.style.lineHeight = "1.15";
    nameEl.style.whiteSpace = "normal";
    nameEl.style.wordBreak = "break-word";
  }else{
    nameEl.style.fontSize = "";
    nameEl.style.lineHeight = "";
    nameEl.style.whiteSpace = "";
    nameEl.style.wordBreak = "";
  }

  // 延後把 transform 清掉，讓 iOS/Android 字體渲染穩定
  setTimeout(()=>{
    nameEl.style.transform = "";
    nameEl.style.willChange = "";
  }, 140);
}

/* ---------------------------
Contact dock override (微信=複製ID)
- 直接覆蓋 2/3 的 renderContactDock_ 行為中的「微信按鈕」
--------------------------- */
(function patchWechatDock_(){
  const _old = renderContactDock_;
  renderContactDock_ = function(p){
    _old(p);

    // 找到「微信」按鈕，改成複製ID
    const wx = pick(p, ["wechat","weixin","微信","微信號","weixin_id","wx","wxid"]);
    const wrap = $("contactButtons");
    if(!wrap) return;

    const btns = Array.from(wrap.querySelectorAll("button.dock-btn"));
    const wechatBtn = btns.find(b => (b.textContent || "").includes("微信"));
    if(!wechatBtn) return;

    wechatBtn.onclick = async () => { await copyWechatId_(wx); };
  };
})();

/* ---------------------------
Apply data
--------------------------- */
function applyDataToCard(payloadNorm) {
  const name    = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit    = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const title   = pick(payloadNorm, ["頭銜","職稱","title","Title"]);
  const slogan  = pick(payloadNorm, ["理念","標語","slogan","Slogan"]);
  const service = pick(payloadNorm, ["服務項目","服務","service","Service","經營項目","項目"]);
  const exp     = pick(payloadNorm, ["經歷","experience","Experience","簡歷","履歷"]);

  setText("u-name",  name || "（尚未讀到姓名）");
  setText("u-unit",  unit || "");
  setText("u-title", title || "");

  const sl = $("u-slogan");
  if (sl) {
    const s = text(slogan);
    if (s) {
      sl.style.display = "";
      sl.textContent = s;
    } else {
      sl.style.display = "none";
      sl.textContent = "";
    }
  }

  renderBlock_("block-service", "服務項目", service);
  renderBlock_("block-exp",     "經歷",     exp);

  setAvatar_(payloadNorm);
  setLogo_(payloadNorm);
  renderPhotoWall_(payloadNorm);
  renderContactDock_(payloadNorm);

  // premium name safety
  requestAnimationFrame(premiumNameSafety_);
}

/* ---------------------------
UI states
--------------------------- */
function setLoadingUi_() {
  setText("u-name",  "載入中...");
  setText("u-unit",  "同步中...");
  setText("u-title", "");

  const sl = $("u-slogan");
  if (sl) sl.style.display = "none";

  const dock = $("contactDock");
  if (dock) dock.style.display = "none";

  const wall = $("photoWall");
  if (wall) wall.style.display = "none";

  const wrap = $("logoWrap");
  if (wrap) wrap.style.display = "none";

  const social = $("socialSection");
  if (social) social.style.display = "none";
}

function setFailUi_(msg) {
  setText("u-name",  "（同步失敗）");
  setText("u-unit",  msg || "請確認 id 或 GAS 權限");
  setText("u-title", "");

  const dock = $("contactDock");
  if (dock) dock.style.display = "none";

  const wall = $("photoWall");
  if (wall) wall.style.display = "none";

  const wrap = $("logoWrap");
  if (wrap) wrap.style.display = "none";

  const social = $("socialSection");
  if (social) social.style.display = "none";
}

/* ---------------------------
Load card
--------------------------- */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  __resolvedId = cid;
  setLoadingUi_();

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object")
      throw new Error("Invalid payload");

    if (data.ok === false)
      throw new Error(data.error || "Not found");

    const payloadNorm = buildNormalizedPayload_(data);

    applyDataToCard(payloadNorm);

    try {
      const u = new URL(window.location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    } catch {}

    return cid;

  } catch (e) {
    console.error(e);
    setFailUi_(e && e.message ? e.message : String(e));
  }
}

/* ===========================
Hidden Admin Entry (v399)
- 使用既有 style.css 的 #adminHotspotTop（若存在）
- 若不存在就建立一個同等大小透明熱區
=========================== */

function openAdmin_() {
  const id = __resolvedId || CONFIG.DEFAULT_ID;
  const u = `admin.html?id=${encodeURIComponent(id)}`;
  window.open(u, "_blank");
}

function ensureAdminHotspot_() {
  // 優先使用 HTML 既有的 adminHotspotTop（你 style.css 已定義）
  let hs = $("adminHotspotTop");
  if (!hs) {
    hs = document.createElement("div");
    hs.id = "adminHotspotTop";
    document.body.appendChild(hs);
  }

  // 置頂透明（不破壞門面）
  hs.style.position = "fixed";
  hs.style.top = "0";
  hs.style.left = "0";
  hs.style.width = "100%";
  hs.style.height = "44px";
  hs.style.opacity = "0";
  hs.style.zIndex = "99999";
  hs.style.background = "transparent";
  hs.style.pointerEvents = "auto";

  let tapCount = 0;
  let timer = null;

  hs.addEventListener("click", () => {
    tapCount++;
    clearTimeout(timer);
    timer = setTimeout(() => (tapCount = 0), CONFIG.ADMIN_TRIPLETAP_WINDOW_MS);

    if (tapCount >= CONFIG.ADMIN_TRIPLETAP_COUNT) {
      tapCount = 0;
      openAdmin_();
    }
  });
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  // 讓 admin.html 可以用 window.CONFIG.GAS 查姓名
  window.CONFIG = CONFIG;

  // 確保按鈕 hooks 可用（避免「按鈕又失效」）
  window.setV382 = window.setV382 || function(){};
  window.setV382Style = window.setV382Style || function(){};
  window.setV382Paper = window.setV382Paper || function(){};

  ensureAdminHotspot_();

  // 初始化方案按鈕狀態
  syncPlanButtons_();
  applyV382_();

  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });
window.addEventListener("load", () => {
  if (!__resolvedId) boot_();
});