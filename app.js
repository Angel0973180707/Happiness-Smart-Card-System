/* ================================
Happiness Smart Card System — app.js (v397 COMPLETE OVERWRITE)

v397 GOALS:
- Data-driven card: fields show only if data exists
- Contacts Dock (Dock=B): contact + video + social into one dock
- Photo Wall: auto gather photos from multiple keys
- Hidden admin: triple-tap shows overlay with 4 buttons
- Keep v393 visual language & plan switch behavior
================================ */

const CONFIG = {
  VERSION: 397,

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_TRIPLETAP_WINDOW_MS: 800,
  ADMIN_TAP_COUNT: 3,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __resolvedId = CONFIG.DEFAULT_ID;

/* --------------------------- utils --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v397]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v397]", ...arguments); }
function err_() { console.error("[HSC-v397]", ...arguments); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

function show(el, yes) {
  if (!el) return;
  el.style.display = yes ? "" : "none";
}

/* --------------------------- params --------------------------- */
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
UI toggle: dots rows (free vs premium)
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

window.goFillForm = function () {
  try { window.open(CONFIG.FORM, "_blank"); } catch { location.href = CONFIG.FORM; }
};

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
    const body = (await res.text() || "").trim();

    if (CONFIG.DEBUG) {
      const head = body.slice(0, 180).replace(/\s+/g, " ");
      log_("fetch:", { status, len: body.length, head });
    }

    if (!res.ok && !body) throw new Error(`HTTP ${status} (empty)`);
    if (!body) throw new Error("Empty response");

    try {
      return JSON.parse(body);
    } catch {
      const m = body.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error(`Not JSON (status=${status})`);
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
Normalize + pick helpers
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
}/* ---------------------------
Images helpers
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
Render: base info
--------------------------- */
function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;
  const cands = buildImageCandidates_(url);
  if (!cands.length) { img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function setUnitTitleLine_(unit, title) {
  const line = $("u-unitline");
  const u = $("u-unit");
  const t = $("u-title");
  if (!line || !u || !t) return;

  setText(u, unit || "");
  setText(t, title ? `｜${title}` : "");

  // no data => hide entire line
  const hasAny = text(unit) || text(title);
  show(line, !!hasAny);
}

function setSlogan_(slogan) {
  const el = $("u-slogan");
  if (!el) return;
  setText(el, slogan || "");
  show(el, !!text(slogan));
}

/* ---------------------------
Dynamic Fields mapping
- will create cards only if value exists
--------------------------- */
const FIELD_SPECS = [
  { key: "服務項目", keys: ["服務項目", "service", "Service"] },
  { key: "經歷", keys: ["經歷", "experience", "Experience"] },
  { key: "理念標語", keys: ["理念標語", "slogan", "Slogan"] }, // also shown top; here acts as fallback/extra
  { key: "單位", keys: ["單位", "unit", "Unit"] }, // fallback
  { key: "頭銜", keys: ["頭銜", "title", "Title"] } // fallback
];

function buildFieldCard_(title, body) {
  const wrap = document.createElement("div");
  wrap.className = "field-card";

  const t = document.createElement("div");
  t.className = "field-title";
  t.textContent = title;

  const b = document.createElement("div");
  b.className = "field-body";
  b.textContent = body;

  wrap.appendChild(t);
  wrap.appendChild(b);
  return wrap;
}

function renderDynamicFields_(payloadNorm) {
  const host = $("dynamicFields");
  if (!host) return;
  host.innerHTML = "";

  // We will include these additional fields beyond the fixed top section
  const extraSpecs = [
    { title: "服務項目", keys: ["服務項目", "service", "Service"] },
    { title: "經歷", keys: ["經歷", "experience", "Experience"] }
  ];

  for (const spec of extraSpecs) {
    const v = pick(payloadNorm, spec.keys);
    if (!text(v)) continue;
    host.appendChild(buildFieldCard_(spec.title, text(v)));
  }
}

/* ---------------------------
Contacts Dock (Dock=B): contact + video + social
- Generate buttons only when exists
--------------------------- */
function makeDockBtn_(iconClass, label, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dock-btn";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  btn.addEventListener("click", onClick);
  return btn;
}

function openUrl_(url) {
  const u = text(url);
  if (!u) return;
  try { window.open(u, "_blank"); } catch { location.href = u; }
}

function copyText_(s) {
  const v = text(s);
  if (!v) return false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(v).then(()=>{}).catch(()=>{});
    return true;
  }
  // fallback
  const ta = document.createElement("textarea");
  ta.value = v;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(ta);
  return true;
}

function buildMapLink_(addr) {
  const a = text(addr);
  if (!a) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(a)}`;
}

function normalizeLineLink_(v) {
  const s = text(v);
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  // handle @xxxx as official account id
  if (s.startsWith("@")) return `https://line.me/R/ti/p/${encodeURIComponent(s)}`;
  return s; // may already be a deep link format
}

function renderContactDock_(payloadNorm) {
  const dock = $("contactDock");
  const host = $("contactButtons");
  if (!dock || !host) return;

  host.innerHTML = "";
  let count = 0;

  const wechat = pick(payloadNorm, ["微信", "wechat", "WeChat"]);
  const lineLink = pick(payloadNorm, ["LINE連結", "line_link", "line", "Line"]);
  const lineOA = pick(payloadNorm, ["LINE官方帳號", "line_oa", "LINE OA"]);
  const email = pick(payloadNorm, ["Email", "email", "E-mail"]);
  const phone = pick(payloadNorm, ["電話", "phone", "Phone", "手機", "mobile"]);
  const addr = pick(payloadNorm, ["地址", "address", "Address"]);

  const v1 = pick(payloadNorm, ["影音平台1", "video1", "Video1"]);
  const v2 = pick(payloadNorm, ["影音平台2", "video2", "Video2"]);
  const v3 = pick(payloadNorm, ["影音平台3", "video3", "Video3"]);

  const s1 = pick(payloadNorm, ["社群平台1", "social1", "Social1"]);
  const s2 = pick(payloadNorm, ["社群平台2", "social2", "Social2"]);
  const s3 = pick(payloadNorm, ["社群平台3", "social3", "Social3"]);

  if (text(wechat)) {
    host.appendChild(makeDockBtn_("fa-brands fa-weixin", "微信（複製）", () => {
      copyText_(wechat);
      toast_("已複製微信：" + wechat);
    }));
    count++;
  }

  const ll = normalizeLineLink_(lineLink);
  if (text(ll)) {
    host.appendChild(makeDockBtn_("fa-brands fa-line", "LINE", () => openUrl_(ll)));
    count++;
  }

  const loa = normalizeLineLink_(lineOA);
  if (text(loa)) {
    host.appendChild(makeDockBtn_("fa-brands fa-line", "LINE官方帳號", () => openUrl_(loa)));
    count++;
  }

  if (text(email)) {
    host.appendChild(makeDockBtn_("fa-solid fa-envelope", "Email", () => openUrl_(`mailto:${email}`)));
    count++;
  }

  if (text(phone)) {
    host.appendChild(makeDockBtn_("fa-solid fa-phone", "電話", () => openUrl_(`tel:${phone}`)));
    count++;
  }

  if (text(addr)) {
    host.appendChild(makeDockBtn_("fa-solid fa-location-dot", "地址導航", () => openUrl_(buildMapLink_(addr))));
    count++;
  }

  // videos
  const videos = [v1, v2, v3].map(text).filter(Boolean);
  videos.forEach((u, i) => {
    host.appendChild(makeDockBtn_("fa-solid fa-circle-play", `影音${i + 1}`, () => openUrl_(u)));
    count++;
  });

  // socials
  const socials = [s1, s2, s3].map(text).filter(Boolean);
  socials.forEach((u, i) => {
    host.appendChild(makeDockBtn_("fa-solid fa-hashtag", `社群${i + 1}`, () => openUrl_(u)));
    count++;
  });

  show(dock, count > 0);
}

/* ---------------------------
Photo Wall: gather from multiple keys
- supports: 照片_fast/照片 + 照片2/3/4... if exists
--------------------------- */
let __wallPhotos = [];

function collectPhotoUrls_(payloadNorm) {
  const urls = [];

  // primary
  const pFast = pick(payloadNorm, ["照片_fast", "photos_fast", "photo_fast"]);
  const p = pick(payloadNorm, ["照片", "photos", "photo"]);
  if (text(pFast)) urls.push(text(pFast));
  if (text(p)) urls.push(text(p));

  // try numbered columns (照片2, 照片3, ... up to 12)
  for (let i = 2; i <= 12; i++) {
    const k1 = `照片${i}`;
    const k2 = `照片${i}_fast`;
    const vFast = pick(payloadNorm, [k2]);
    const v = pick(payloadNorm, [k1]);
    if (text(vFast)) urls.push(text(vFast));
    if (text(v)) urls.push(text(v));
  }

  // split if contains multiple urls in one cell (comma/newline)
  const expanded = [];
  for (const u of urls) {
    const s = text(u);
    if (!s) continue;
    const parts = s.split(/[\n,，\s]+/).map(t => t.trim()).filter(Boolean);
    if (parts.length > 1) expanded.push(...parts);
    else expanded.push(s);
  }

  // normalize + dedupe
  const norm = expanded.map(normalizeImageUrl).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const u of norm) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/* ---------------------------
Lightbox
--------------------------- */
function ensureLightbox_() {
  if ($("lightbox397")) return;

  const lb = document.createElement("div");
  lb.id = "lightbox397";
  lb.style.position = "fixed";
  lb.style.inset = "0";
  lb.style.background = "rgba(0,0,0,0.85)";
  lb.style.display = "none";
  lb.style.alignItems = "center";
  lb.style.justifyContent = "center";
  lb.style.zIndex = "99998";
  lb.style.padding = "18px";

  lb.innerHTML = `
    <div id="lbInner397" style="width:100%; max-width:920px; max-height:90vh; display:flex; justify-content:center; align-items:center;">
      <img id="lbImg397" alt="photo" style="max-width:100%; max-height:90vh; border-radius:18px; background:#111; object-fit:contain;" />
    </div>
  `;

  lb.addEventListener("click", () => { lb.style.display = "none"; });

  document.body.appendChild(lb);
}

function openLightbox_(url) {
  ensureLightbox_();
  const lb = $("lightbox397");
  const img = $("lbImg397");
  if (!lb || !img) return;
  img.src = normalizeImageUrl(url) + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  lb.style.display = "flex";
}

/* ---------------------------
Render Photo Wall
--------------------------- */
function renderPhotoWall_(payloadNorm) {
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if (!wall || !grid) return;

  grid.innerHTML = "";
  __wallPhotos = collectPhotoUrls_(payloadNorm);

  if (!__wallPhotos.length) {
    show(wall, false);
    return;
  }

  // limit to 12 for UI neatness
  const list = __wallPhotos.slice(0, 12);

  for (const u of list) {
    const item = document.createElement("div");
    item.className = "photo-item";

    const img = document.createElement("img");
    img.alt = "photo";
    const cands = buildImageCandidates_(u);
    setImgWithFallback_(img, cands);

    item.appendChild(img);
    item.addEventListener("click", () => openLightbox_(u));

    grid.appendChild(item);
  }

  show(wall, true);
}

/* ---------------------------
Tiny Toast (for copy feedback)
--------------------------- */
let __toastTimer = null;
function toast_(msg) {
  const m = text(msg);
  if (!m) return;

  let el = $("toast397");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast397";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "26px";
    el.style.transform = "translateX(-50%)";
    el.style.background = "rgba(0,0,0,0.78)";
    el.style.color = "#fff";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "14px";
    el.style.fontSize = "13px";
    el.style.fontWeight = "900";
    el.style.zIndex = "99999";
    el.style.maxWidth = "92vw";
    el.style.textAlign = "center";
    el.style.display = "none";
    document.body.appendChild(el);
  }/* ---------------------------
Apply payload to card
--------------------------- */
function applyDataToCard(payloadNorm) {
  const name = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const title = pick(payloadNorm, ["頭銜", "title", "Title"]);
  const slogan = pick(payloadNorm, ["理念標語", "slogan", "Slogan"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);
  const exp = pick(payloadNorm, ["經歷", "experience", "Experience"]);

  // avatar priority: 個人照_fast > 個人照 > 形象照_fast > 形象照 > avatar_fast > avatar
  const avatar = pick(payloadNorm, ["個人照_fast", "個人照", "形象照_fast", "形象照", "avatar_fast", "avatar"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setUnitTitleLine_(text(unit), text(title));
  setSlogan_(text(slogan));

  // dynamic content cards: include service/experience if present
  // if they are missing but other fields exist in future, easy to extend here
  renderDynamicFields_(payloadNorm);

  // contacts dock + photo wall
  renderContactDock_(payloadNorm);
  renderPhotoWall_(payloadNorm);

  setAvatarImage(avatar);
  syncPlanButtons_();
}

/* ---------------------------
UI states
--------------------------- */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setUnitTitleLine_("同步中...", "");
  setSlogan_("");
  const host = $("dynamicFields");
  if (host) host.innerHTML = "";
  const dock = $("contactDock");
  const wall = $("photoWall");
  if (dock) dock.style.display = "none";
  if (wall) wall.style.display = "none";
}

function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setUnitTitleLine_(msg || "請確認 id 或 GAS 權限", "");
  setSlogan_("");
  const host = $("dynamicFields");
  if (host) host.innerHTML = "";
  const img = $("u-img");
  if (img) img.removeAttribute("src");
  const dock = $("contactDock");
  const wall = $("photoWall");
  if (dock) dock.style.display = "none";
  if (wall) wall.style.display = "none";
}

/* ---------------------------
Load card by id
--------------------------- */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __resolvedId = cid;

  setLoadingUi_();

  try {
    const data = await fetchJsonRobust(url);
    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    applyDataToCard(__payload);

    // stabilize
    await sleep(80);
    applyDataToCard(__payload);

    // keep id in url
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    } catch {}

    return cid;
  } catch (e) {
    err_("loadCard error:", e);
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
    throw e;
  }
}

/* ===========================
Hidden Admin (TRIPLE TAP)
- shows 4 buttons overlay:
  a) 序號輸入
  b) 成品預覽
  c) 一鍵複製交貨
  d) 回首頁
=========================== */
let __tapCount = 0;
let __tapTimer = null;

function ensureAdminOverlay_() {
  if ($("adminOverlay397")) return;

  const ov = document.createElement("div");
  ov.id = "adminOverlay397";
  ov.style.position = "fixed";
  ov.style.inset = "0";
  ov.style.background = "rgba(0,0,0,0.28)";
  ov.style.backdropFilter = "blur(4px)";
  ov.style.zIndex = "99997";
  ov.style.display = "none";
  ov.style.alignItems = "center";
  ov.style.justifyContent = "center";
  ov.style.padding = "18px";

  ov.innerHTML = `
    <div style="width:min(420px, 92vw); background:rgba(255,255,255,0.95); border-radius:22px; padding:18px 16px; box-shadow:0 20px 40px rgba(0,0,0,0.18);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <div style="font-weight:900; opacity:.85;">隱形後台</div>
        <button id="adminClose397" type="button" style="border:none; background:#eef1f5; border-radius:12px; padding:8px 10px; font-weight:900; cursor:pointer;">關閉</button>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:12px;">
        <input id="adminId397" placeholder="輸入序號（TW0001 或 1）" style="flex:1; padding:12px 12px; border-radius:14px; border:1px solid #e5e7eb; font-size:14px; font-weight:900; text-align:center;" />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <button id="btnAdminSetId397" type="button" style="border:none; border-radius:16px; padding:12px; font-weight:900; cursor:pointer; background:#f4f5f7;">序號輸入</button>
        <button id="btnAdminPreview397" type="button" style="border:none; border-radius:16px; padding:12px; font-weight:900; cursor:pointer; background:#ee5253; color:#fff;">成品預覽</button>
        <button id="btnAdminCopy397" type="button" style="border:none; border-radius:16px; padding:12px; font-weight:900; cursor:pointer; background:#ee5253; color:#fff;">一鍵複製交貨</button>
        <button id="btnAdminHome397" type="button" style="border:none; border-radius:16px; padding:12px; font-weight:900; cursor:pointer; background:#f4f5f7;">回首頁</button>
      </div>

      <div id="adminMsg397" style="margin-top:12px; font-size:12px; opacity:.7; text-align:center;"></div>
    </div>
  `;

  document.body.appendChild(ov);

  const close = $("adminClose397");
  close && close.addEventListener("click", () => toggleAdminOverlay_(false));

  ov.addEventListener("click", (e) => {
    if (e.target === ov) toggleAdminOverlay_(false);
  });

  const setMsg = (m) => { const el = $("adminMsg397"); if (el) el.textContent = text(m); };

  const normalizeInputId = () => {
    const v = text($("adminId397")?.value || "");
    return normalizeId_(v);
  };

  $("btnAdminSetId397")?.addEventListener("click", () => {
    const id = normalizeInputId();
    if (!id) { setMsg("請輸入序號"); return; }
    __resolvedId = id;
    setMsg(`已設定序號：${id}`);
    toast_("已設定：" + id);
  });

  $("btnAdminPreview397")?.addEventListener("click", async () => {
    const id = normalizeInputId() || __resolvedId || CONFIG.DEFAULT_ID;
    try {
      await loadCardById_(id);
      toggleAdminOverlay_(false);
      toast_("已載入：" + id);
    } catch {
      setMsg("預覽失敗：請確認序號或權限");
    }
  });

  $("btnAdminCopy397")?.addEventListener("click", () => {
    const id = normalizeInputId() || __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;

    // delivery link: recommend share.html?id=TW0001 (OG static, page shows name/avatar by JS)
    const origin = location.origin;
    const basePath = location.pathname.replace(/\/[^/]*$/, "/"); // folder
    const link = `${origin}${basePath}share.html?id=${encodeURIComponent(id)}`;

    copyText_(link);
    setMsg("交貨連結已複製");
    toast_("交貨連結已複製");
  });

  $("btnAdminHome397")?.addEventListener("click", () => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("id");
      location.href = u.origin + u.pathname;
    } catch {
      location.href = "./index.html";
    }
  });
}

function toggleAdminOverlay_(yes) {
  ensureAdminOverlay_();
  const ov = $("adminOverlay397");
  if (!ov) return;
  ov.style.display = yes ? "flex" : "none";
  if (yes) {
    const input = $("adminId397");
    if (input) input.value = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  }
}

function bindTripleTap_() {
  const targets = [
    $("card-container"),
    $("versionTag"),
    $("footerTag"),
    document.body
  ].filter(Boolean);

  const onTap = () => {
    __tapCount++;
    clearTimeout(__tapTimer);
    __tapTimer = setTimeout(() => { __tapCount = 0; }, CONFIG.ADMIN_TRIPLETAP_WINDOW_MS);

    if (__tapCount >= CONFIG.ADMIN_TAP_COUNT) {
      __tapCount = 0;
      toggleAdminOverlay_(true);
    }
  };

  for (const t of targets) {
    t.addEventListener("click", onTap, { passive: true });
    t.addEventListener("touchend", onTap, { passive: true });
  }
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  try { applyV382_(); } catch {}
  try { syncPlanButtons_(); } catch {}
  try { toggleDotsRows_(); } catch {}

  // triple tap admin
  try { bindTripleTap_(); } catch {}

  const id = getCardIdFromUrl_();
  loadCardById_(id).catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => { /* fallback */ });

  el.textContent = m;
  el.style.display = "block";
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(() => { el.style.display = "none"; }, 1400);
}