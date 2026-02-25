/* ================================
 * Happiness Smart Card System — app.js (v399.2 COMPLETE OVERWRITE) 1/3
 * Fix v399.1:
 * 1) Premium button always works (bind fallback)
 * 2) Line官網: accept dedicated fields OR if line is URL -> treat as 官網
 * 3) Free logo auto nudge (temp inline tweak)
 * Keep:
 * - robust loader
 * - v382 hooks: setV382 / setV382Style / setV382Paper
 * ================================ */

const CONFIG = {
  VERSION: "399.2",

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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

/* --------------------------- */
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
  state.mode = (mode === "premium") ? "premium" : "free";
  state.theme = theme || (state.mode === "premium" ? "p1" : "color-1");

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
  applyV382_();
  refreshPremiumSafety_();
};

window.setV382Style = function (style, el) {
  state.style = style || "arch";
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.setV382Paper = function (paper, el) {
  state.paper = paper || "paper-1";
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

  // ✅ TEMP: 自由款 logo 縮小上移（等你確認後再回到 CSS 做最終）
  nudgeFreeLogo_();
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

function refreshPremiumSafety_() {
  if (state.mode !== "premium") return;
  const nameEl = $("u-name");
  if (!nameEl) return;
  requestAnimationFrame(() => {
    nameEl.style.transform = "translateZ(0)";
    setTimeout(() => { nameEl.style.transform = ""; }, 120);
  });
}

/* ✅ TEMP: 自由款 logo 微調（不動 CSS 世界觀） */
function nudgeFreeLogo_(){
  if (state.mode !== "free") return;
  const wrap = $("logoWrap");
  const img  = $("u-logo");
  if (!wrap || !img) return;

  // 你要「縮小 + 上移」
  wrap.style.top = "154px";
  img.style.width = "46px";
  img.style.height = "46px";
}/* ================================
 * Happiness Smart Card System — app.js (v399.2 COMPLETE OVERWRITE) 2/3
 * - Normalize keys + pick()
 * - Images: avatar/logo/photo wall robust loading
 * - Contact dock ORDER FIX + Line官網 fallback from line(URL)
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
function getAvatarUrl_(payloadNorm){
  const keys = [
    "個人照_fast","個人照",
    "形象照_fast","形象照",
    "avatar_fast","avatar",
    "photo_fast","photo",
    "image"
  ];

  let v = pick(payloadNorm, keys);
  if(text(v)) return v;

  for(let i=1;i<=3;i++){
    v = pick(payloadNorm, [`個人照${i}`, `形象照${i}`, `avatar${i}`, `photo${i}`, `image${i}`]);
    if(text(v)) return v;
  }
  return "";
}

function setAvatarImage_(payloadNorm){
  const img = $("u-img");
  if(!img) return;

  const raw = getAvatarUrl_(payloadNorm);
  const cands = buildImageCandidates_(raw);

  if(!cands.length){
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, cands);
}

function getLogoUrl_(payloadNorm){
  return pick(payloadNorm, [
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

function setLogo_(payloadNorm){
  const wrap = $("logoWrap");
  const img = $("u-logo");
  if(!wrap || !img) return;

  const raw = getLogoUrl_(payloadNorm);
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

  return normalized
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
}

function collectPhotoUrls_(payloadNorm){
  const urls = [];

  const main = pick(payloadNorm, ["照片_fast","照片","images","image","photo","照片牆","相片牆","圖片","相簿"]);
  urls.push(...splitPhotoList_(main));

  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitPhotoList_(payloadNorm[`照片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`圖片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`photo${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`image${i}`]));
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

function renderPhotoWall_(payloadNorm){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const list = collectPhotoUrls_(payloadNorm);

  if(!list.length){
    wall.style.display = "none";
    return;
  }
  wall.style.display = "";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands);
    const openUrl = normalizeImageUrl(raw);
    img.onclick = ()=> window.open(openUrl || raw, "_blank");
    grid.appendChild(img);
  }
}

/* ---------------------------
Contact dock (ORDER + Line官網 fallback)
order: LINE官網, LINE, 微信, 電話, Email, 導航
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
function addDockBtn_(wrap, label, href, iconClass){
  if(!wrap || !href) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dock-btn";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  btn.onclick = ()=> window.open(href, "_blank");
  wrap.appendChild(btn);
}
function iconFor_(type){
  const t = String(type||"").toLowerCase();
  if(t === "phone") return "fa-solid fa-phone";
  if(t === "email") return "fa-solid fa-envelope";
  if(t === "web") return "fa-solid fa-globe";
  if(t === "map") return "fa-solid fa-location-dot";
  if(t === "line") return "fa-brands fa-line";
  if(t === "wechat") return "fa-brands fa-weixin";
  return "fa-solid fa-link";
}

function renderContactDock_(payloadNorm){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML = "";

  const phone = pick(payloadNorm, ["電話","手機","phone","mobile","tel"]);
  const email = pick(payloadNorm, ["Email","E-mail","email","信箱","電子郵件","mail"]);
  const wechat = pick(payloadNorm, ["wechat","weixin","微信","微信號","weixin_id","wx","wxid"]);
  const addr = pick(payloadNorm, ["地址","address","所在地","location"]);

  // ✅ 先抓 line官網欄位
  let lineSite = pick(payloadNorm, [
    "line官網","line官網預約","line官網預約溝通","line官網預約溝通網址",
    "line官方預約","line預約","預約網址","預約連結",
    "line_website","line_site","booking_url","booking"
  ]);

  // ✅ 再抓 line（可能是 ID 或 URL）
  const line = pick(payloadNorm, [
    "line","Line","LINE",
    "line_id","line oa","line_oa","LINE_OA",
    "line官方","line官方帳號","line官方帳號網址"
  ]);

  const lineRaw = text(line);
  const lineLooksLikeUrl = /^https?:\/\//i.test(lineRaw) || (lineRaw.includes("http") && lineRaw.includes("://"));

  // ✅ 若 line官網沒填，但 line 是 URL，就把 line 當官網（並保留 line 本體給第二顆按鈕）
  if(!text(lineSite) && lineLooksLikeUrl){
    lineSite = lineRaw;
  }

  // 1) LINE官網（只接受 URL）
  const ls = ensureHttp_(lineSite);
  if(ls && /^https?:\/\//i.test(ls)){
    addDockBtn_(wrap, "LINE官網", ls, iconFor_("web"));
  }

  // 2) LINE（URL->開啟；ID->line.me）
  if(lineRaw){
    let href = "";
    if(lineLooksLikeUrl) href = ensureHttp_(lineRaw);
    else href = `https://line.me/R/ti/p/${encodeURIComponent(lineRaw)}`;
    addDockBtn_(wrap, "LINE", href, iconFor_("line"));
  }

  // 3) 微信
  const wx = text(wechat);
  if(wx){
    const href = `https://www.google.com/search?q=${encodeURIComponent("WeChat " + wx)}`;
    addDockBtn_(wrap, "微信", href, iconFor_("wechat"));
  }

  // 4) 電話
  const p = normalizePhone_(phone);
  if(p){
    addDockBtn_(wrap, "電話", `tel:${p}`, iconFor_("phone"));
  }

  // 5) Email
  const em = text(email);
  if(em){
    addDockBtn_(wrap, "Email", `mailto:${encodeURIComponent(em)}`, iconFor_("email"));
  }

  // 6) 導航
  const a = text(addr);
  if(a){
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
    addDockBtn_(wrap, "導航", href, iconFor_("map"));
  }

  dock.style.display = wrap.children.length ? "" : "none";
}/* ================================
 * Happiness Smart Card System — app.js (v399.2 COMPLETE OVERWRITE) 3/3
 * - Fetch JSON robust
 * - Apply data to card
 * - Blocks render
 * - Hidden admin entry (top invisible hotspot)
 * - Boot + Plan buttons fallback bind
 * ================================ */

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
      if (CONFIG.DEBUG) console.warn("[HSC-v399] fetch retry:", i, e && e.message ? e.message : e);
      await sleep(520 + i * 520);
    }
  }
  throw lastErr || new Error("Fetch failed");
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
Apply data
--------------------------- */
function applyDataToCard(payloadNorm) {
  const name    = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit    = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const title   = pick(payloadNorm, ["頭銜","職稱","title","Title"]);
  const slogan  = pick(payloadNorm, ["理念","標語","slogan","Slogan"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);
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

  setAvatarImage_(payloadNorm);
  setLogo_(payloadNorm);
  renderContactDock_(payloadNorm);
  renderPhotoWall_(payloadNorm);

  // 方案切換後，logo 仍維持你要的「自由款縮小上移」
  nudgeFreeLogo_();
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
    setFailUi_(e.message);
  }
}

/* ===========================
Hidden Admin Entry (v399)
=========================== */
function openAdmin_() {
  const id = __resolvedId || CONFIG.DEFAULT_ID;
  const u = `admin.html?id=${encodeURIComponent(id)}`;
  window.open(u, "_blank");
}

function ensureAdminHotspot_() {
  if ($("__adminHotspot")) return;

  const hs = document.createElement("div");
  hs.id = "__adminHotspot";
  hs.style.position = "fixed";
  hs.style.top = "8px";
  hs.style.right = "8px";
  hs.style.width = "32px";
  hs.style.height = "32px";
  hs.style.opacity = "0";
  hs.style.zIndex = "99999";
  hs.style.background = "transparent";

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

  document.body.appendChild(hs);
}

/* ===========================
Fix: Premium plan button not working
- bind fallback for #btnPlanFree / #btnPlanPremium
=========================== */
function bindPlanButtonsFallback_(){
  const a = $("btnPlanFree");
  const b = $("btnPlanPremium");
  if(!a || !b) return;

  // 避免重綁
  if(a.dataset.bound === "1" && b.dataset.bound === "1") return;

  a.addEventListener("click", (e)=>{
    // 切自由：保留目前 free 色 / 版型 / 紙感
    const theme = (state.theme && state.theme.startsWith("color-")) ? state.theme : "color-1";
    window.setV382("free", theme, a);
  });

  b.addEventListener("click", (e)=>{
    // 切精品：如果目前 theme 不是 p1~p7，就用 p1
    const theme = (state.theme && /^p[1-7]$/.test(state.theme)) ? state.theme : "p1";
    window.setV382("premium", theme, b);
  });

  a.dataset.bound = "1";
  b.dataset.bound = "1";
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  // ✅ 讓 admin.html 可用 window.CONFIG.GAS
  window.CONFIG = CONFIG;

  ensureAdminHotspot_();
  bindPlanButtonsFallback_();

  // 初次套一次 class（避免某些機型第一次沒有 mode-premium/mode-free）
  applyV382_();
  syncPlanButtons_();

  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });
window.addEventListener("load", () => {
  if (!__resolvedId) boot_();
});