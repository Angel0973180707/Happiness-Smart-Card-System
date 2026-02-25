/* ================================
 * Happiness Smart Card System — app.js (v399.1 COMPLETE OVERWRITE)
 * FIX:
 * 1) Use #adminHotspotTop as the ONLY hidden admin entry (triple tap)
 * 2) Safe URL building for GitHub Pages subpath
 * 3) Share: try Web Share API then fallback to copy
 * Keep:
 * - v382 hooks: setV382 / setV382Style / setV382Paper
 * - robust loader + normalize/pick + images + dock + blocks + photo wall
 * ================================ */

const CONFIG = {
  VERSION: "399.1",

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
function q(sel, root = document) { return root.querySelector(sel); }
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

/* --------------------------- */
async function waitForDom_(ids, timeoutMs = 2400) {
  const need = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    let ok = true;
    for (const id of need) { if (!$(id)) { ok = false; break; } }
    if (ok) return true;
    await sleep(60);
  }
  return false;
}

/* ---------------------------
Fetch JSON (robust)
--------------------------- */
async function fetchWithTimeout(url, timeoutMs) {
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

async function fetchJsonRobust(url) {
  let lastErr = null;
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    try {
      return await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT_MS);
    } catch (e) {
      lastErr = e;
      warn_("fetch retry:", i, "err:", e && e.message ? e.message : e);
      await sleep(520 + i * 520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

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
Images
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
    if (idx >= list.length) {
      imgEl.style.opacity = "0";
      imgEl.removeAttribute("src");
      return;
    }
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

function setAvatarImage_(p){
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
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }

  wrap.style.display = "";
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
  return normalized.split("\n").map(x => x.trim()).filter(Boolean);
}

function collectPhotoUrls_(p){
  const urls = [];
  const main = pick(p, ["照片_fast","照片","照片牆","相片牆","圖片","相簿","images","photos"]);
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

  if(!list.length){ wall.style.display = "none"; return; }
  wall.style.display = "";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    setImgWithFallback_(img, buildImageCandidates_(raw));
    const openUrl = normalizeImageUrl(raw);
    img.onclick = ()=> window.open(openUrl || raw, "_blank");
    grid.appendChild(img);
  }
}

/* ---------------------------
Contact dock + Share
--------------------------- */
function normalizePhone_(s){
  const v = text(s);
  if(!v) return "";
  return v.replace(/[^\d+]/g, "");
}
function ensureHttp_(u){
  let v = text(u);
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith("www.")) return "https://" + v;
  return v;
}
function iconFor_(type){
  const t = String(type||"").toLowerCase();
  if(t === "phone") return "fa-solid fa-phone";
  if(t === "email") return "fa-solid fa-envelope";
  if(t === "web") return "fa-solid fa-globe";
  if(t === "map") return "fa-solid fa-location-dot";
  if(t === "line") return "fa-brands fa-line";
  if(t === "wechat") return "fa-brands fa-weixin";
  if(t === "video") return "fa-solid fa-circle-play";
  if(t === "youtube") return "fa-brands fa-youtube";
  if(t === "ig") return "fa-brands fa-instagram";
  if(t === "fb") return "fa-brands fa-facebook";
  if(t === "tiktok") return "fa-brands fa-tiktok";
  if(t === "bilibili") return "fa-brands fa-bilibili";
  return "fa-solid fa-link";
}
function addDockBtn_(wrap, label, href, iconClass){
  if(!wrap || !href) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dock-btn";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  btn.onclick = ()=> window.open(href, "_blank");
  wrap.appendChild(btn);
}

function renderContactDock_(p){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML = "";

  const phone = pick(p, ["電話","手機","phone","mobile","tel"]);
  const line = pick(p, ["line","line_id","line oa","line_oa","LINE","Line"]);
  const wechat = pick(p, ["wechat","weixin","微信","微信號","wx","wxid"]);
  const video = pick(p, ["影音平台","video","video_url","影片","youtube","YouTube","yt","頻道","channel"]);
  const web = pick(p, ["網站","官網","website","url","link"]);
  const addr = pick(p, ["地址","address","所在地","location"]);

  const p1 = normalizePhone_(phone);
  if(p1) addDockBtn_(wrap, "撥打", `tel:${p1}`, iconFor_("phone"));

  const lineV = text(line);
  if(lineV){
    const href = lineV.includes("http") ? ensureHttp_(lineV) : `https://line.me/R/ti/p/${encodeURIComponent(lineV)}`;
    addDockBtn_(wrap, "LINE", href, iconFor_("line"));
  }

  const wx = text(wechat);
  if(wx){
    const href = `https://www.google.com/search?q=${encodeURIComponent("WeChat " + wx)}`;
    addDockBtn_(wrap, "微信", href, iconFor_("wechat"));
  }

  const vv = text(video);
  if(vv){
    const href = vv.includes("http") ? ensureHttp_(vv) : `https://www.google.com/search?q=${encodeURIComponent(vv)}`;
    addDockBtn_(wrap, "影音平台", href, iconFor_("video"));
  }

  const w = ensureHttp_(web);
  if(w && /^https?:\/\//i.test(w)) addDockBtn_(wrap, "官網", w, iconFor_("web"));

  const a = text(addr);
  if(a){
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
    addDockBtn_(wrap, "導航", href, iconFor_("map"));
  }

  dock.style.display = wrap.children.length ? "" : "none";
}

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
Toast + Copy
--------------------------- */
function toast_(msg){
  const m = text(msg);
  if(!m) return;
  let t = $("__toast");
  if(!t){
    t = document.createElement("div");
    t.id="__toast";
    t.style.position="fixed";
    t.style.left="50%";
    t.style.bottom="18px";
    t.style.transform="translateX(-50%)";
    t.style.background="rgba(0,0,0,0.78)";
    t.style.color="#fff";
    t.style.padding="10px 14px";
    t.style.borderRadius="999px";
    t.style.fontSize="13px";
    t.style.fontWeight="800";
    t.style.zIndex="99999";
    t.style.opacity="0";
    t.style.transition="opacity 180ms ease";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.style.opacity="1";
  clearTimeout(toast_._timer);
  toast_._timer = setTimeout(()=>{ t.style.opacity="0"; }, 1100);
}

async function copyText_(s){
  const v = text(s);
  if(!v) return false;

  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(v);
      toast_("已複製連結");
      return true;
    }
  }catch{}

  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast_("已複製連結");
    return true;
  }catch{}

  toast_("無法自動複製，請手動複製");
  alert(v);
  return false;
}

function projectBase_(){
  try{
    const u = new URL(location.href);
    u.hash = "";
    u.search = "";
    const p = u.pathname;
    const dir = p.endsWith("/") ? p : p.substring(0, p.lastIndexOf("/") + 1);
    return u.origin + dir;
  }catch{
    return location.origin + "/";
  }
}

function buildCardUrl_(id){
  return projectBase_() + "index.html?id=" + encodeURIComponent(id);
}

window.copyCardUrl = async function(){
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  const url = buildCardUrl_(id);

  // ✅ Web Share API (手機更順)
  try{
    if(navigator.share){
      await navigator.share({ title:"幸福智慧名片", text:"點擊查看名片", url });
      return true;
    }
  }catch{}
  return copyText_(url);
};

window.goFillForm = function(){
  window.open(CONFIG.FORM, "_blank");
};

/* ---------------------------
Apply data
--------------------------- */
function applyDataToCard(p) {
  const name    = pick(p, ["姓名", "name", "Name"]);
  const unit    = pick(p, ["單位", "unit", "Unit"]);
  const title   = pick(p, ["頭銜","職稱","title","Title"]);
  const slogan  = pick(p, ["理念","標語","slogan","Slogan"]);
  const service = pick(p, ["服務項目", "service", "Service"]);
  const exp     = pick(p, ["經歷","experience","Experience","簡歷","履歷"]);

  setText("u-name",  name || "（尚未讀到姓名）");
  setText("u-unit",  unit || "");
  setText("u-title", title || "");

  const sl = $("u-slogan");
  if (sl) {
    const s = text(slogan);
    if (s) { sl.style.display = ""; sl.textContent = s; }
    else { sl.style.display = "none"; sl.textContent = ""; }
  }

  renderBlock_("block-service", "服務項目", service);
  renderBlock_("block-exp",     "經歷",     exp);

  setAvatarImage_(p);
  setLogo_(p);
  renderContactDock_(p);
  renderPhotoWall_(p);
}

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
}

async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  __resolvedId = cid;
  setLoadingUi_();

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");

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
    setFailUi_(e.message);
  }
}

/* ===========================
Hidden Admin Entry (v399.1)
- bind to #adminHotspotTop (triple tap)
=========================== */
function openAdmin_() {
  const id = __resolvedId || CONFIG.DEFAULT_ID;
  const url = projectBase_() + "admin.html?id=" + encodeURIComponent(id);
  window.open(url, "_blank");
}

function bindAdminHotspotTop_(){
  const hs = $("adminHotspotTop");
  if(!hs) return;

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
  }, { passive:true });
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  bindAdminHotspotTop_();

  // init state default
  applyV382_();
  syncPlanButtons_();

  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });
window.addEventListener("load", () => {
  if (!__resolvedId) boot_();
});