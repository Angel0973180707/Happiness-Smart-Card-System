/* ================================
app.js (v396 COMPLETE OVERWRITE)

v396 FIX:
- Front card must NOT show system / form selection / backend fields:
  timestamp, token, status, 選擇名片顏色, 選擇版型風格, 選擇名片製作方案, etc.
- Keep archived UI (no redesign)
- Robust payload resolving stays
================================ */

const CONFIG = {
  VERSION: 396,

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_LONGPRESS_MS: 1200,
  DEBUG: true,

  GALLERY_AUTOPLAY: false,
  GALLERY_AUTOPLAY_MS: 3200
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __lastLoad = { id: "", ts: 0, url: "" };
let __resolvedId = CONFIG.DEFAULT_ID;

let __galleryUrls = [];
let __galleryIndex = 0;
let __galleryTimer = null;

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v396]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v396]", ...arguments); }
function err_() { console.error("[HSC-v396]", ...arguments); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}
function showEl(idOrEl, yes) {
  const el = typeof idOrEl === "string" ? $(idOrEl) : idOrEl;
  if (!el) return;
  el.style.display = yes ? "" : "none";
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

/* ---------------------------
Switching system (keep existing HTML hooks)
--------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
  applyV382_();
  refreshPremiumSafety_();
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

function refreshPremiumSafety_() {
  if (state.mode !== "premium") return;
  const nameEl = $("u-name");
  if (!nameEl) return;
  requestAnimationFrame(() => {
    nameEl.style.transform = "translateZ(0)";
    setTimeout(() => { nameEl.style.transform = ""; }, 120);
  });
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
      const head = body.slice(0, 260).replace(/\s+/g, " ");
      log_("fetch:", { status, ct, len: body.length, head });
    }

    if (!res.ok && !body) throw new Error(`HTTP ${status} (empty)`);
    if (!body) throw new Error("Empty response");

    try { return JSON.parse(body); } catch {}

    const jsonp = body.match(/^[\w$]+\(([\s\S]*)\)\s*;?\s*$/);
    if (jsonp && jsonp[1]) {
      const inner = jsonp[1].trim().replace(/;$/, "");
      return JSON.parse(inner);
    }

    const m = body.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);

    throw new Error(`Not JSON (status=${status}, ct=${ct || "?"})`);
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

/* ===========================
Normalize + pick
=========================== */
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

function isPlainObject_(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function firstNonEmpty_(arr) {
  for (const v of (arr || [])) {
    const s = text(v);
    if (s) return s;
  }
  return "";
}

/* ===========================
Resolve GAS payload shapes
=========================== */
function resolveCardObject_(data, cid) {
  if (!data || typeof data !== "object") return null;
  if (data.ok === false) return null;

  const directLooksLikeRow =
    ("姓名" in data) || ("name" in data) || ("Name" in data) ||
    ("單位" in data) || ("unit" in data) || ("Unit" in data) ||
    ("服務項目" in data) || ("service" in data) ||
    ("id" in data) || ("ID" in data) || ("Id" in data);

  if (directLooksLikeRow && !("rows" in data)) return data;

  const candidates = [];
  if (isPlainObject_(data.card)) candidates.push(data.card);
  if (isPlainObject_(data.data)) candidates.push(data.data);
  if (isPlainObject_(data.row)) candidates.push(data.row);
  if (isPlainObject_(data.result) && isPlainObject_(data.result.card)) candidates.push(data.result.card);
  if (isPlainObject_(data.result) && isPlainObject_(data.result.data)) candidates.push(data.result.data);

  for (const c of candidates) {
    if (!c) continue;
    const nid = normalizeId_(c.id || c.ID || c.Id || pick(buildNormalizedPayload_(c), ["id", "ID", "編號", "卡號"]));
    if (!cid || !nid || nid === cid) return c;
    if (!("id" in c) && !("ID" in c) && !("Id" in c)) return c;
  }

  if (Array.isArray(data.rows) && data.rows.length) {
    if (isPlainObject_(data.rows[0])) {
      const list = data.rows;
      if (cid) {
        const hit = list.find(r => normalizeId_(r.id || r.ID || r.Id) === cid);
        if (hit) return hit;
      }
      return list[0];
    }

    if (Array.isArray(data.headers) && data.headers.length && Array.isArray(data.rows[0])) {
      const headers = data.headers.map(h => cleanKey_(h));
      const idxId = headers.findIndex(h => String(h).toLowerCase() === "id" || h === "編號" || h === "卡號");
      const buildObj = (rowArr) => {
        const o = {};
        for (let i = 0; i < headers.length; i++) {
          const k = headers[i];
          if (!k) continue;
          o[k] = rowArr[i];
        }
        return o;
      };

      if (cid && idxId >= 0) {
        for (const r of data.rows) {
          const rid = normalizeId_(r[idxId]);
          if (rid === cid) return buildObj(r);
        }
      }
      return buildObj(data.rows[0]);
    }
  }

  for (const k of Object.keys(data)) {
    const v = data[k];
    if (isPlainObject_(v)) {
      const vv = v;
      const looks =
        ("姓名" in vv) || ("name" in vv) || ("單位" in vv) || ("service" in vv) || ("服務項目" in vv);
      if (looks) return vv;
    }
  }

  return null;
}

/* ===========================
Images helpers
=========================== */
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

/* ===========================
Gallery parse
=========================== */
function splitUrls_(raw) {
  const s = text(raw);
  if (!s) return [];
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map(normalizeImageUrl).filter(Boolean);
      if (isPlainObject_(j)) {
        const vals = Object.values(j).map(v => text(v)).filter(Boolean);
        return vals.flatMap(v => splitUrls_(v));
      }
    } catch {}
  }
  const parts = s.split(/[\n,;|]+/g).map(v => text(v)).filter(Boolean);
  if (parts.length > 1) return parts.map(normalizeImageUrl).filter(Boolean);
  if ((s.match(/https?:\/\//g) || []).length >= 2) {
    const ps = s.split(/\s+/g).map(v => text(v)).filter(Boolean);
    return ps.map(normalizeImageUrl).filter(Boolean);
  }
  return [normalizeImageUrl(s)].filter(Boolean);
}

function extractGalleryUrls_(payloadNorm) {
  const raw = payloadNorm.__raw || payloadNorm;
  const keys = Object.keys(raw || {});
  const urls = [];

  const keyLikePhoto = (k) => {
    const lk = String(k).toLowerCase();
    return (
      lk.startsWith("photo") || lk.startsWith("image") || lk.startsWith("pic") ||
      lk.includes("gallery") || lk.includes("images") ||
      String(k).includes("照片") || String(k).includes("作品") || String(k).includes("相片")
    );
  };

  for (const k of keys) {
    if (!keyLikePhoto(k)) continue;
    const v = raw[k];
    const arr = splitUrls_(v);
    for (const u of arr) if (u) urls.push(u);
  }

  const more = [
    pick(payloadNorm, ["gallery", "Gallery", "images", "Images", "照片牆", "作品照", "作品照片", "相簿", "輪播牆"]),
  ].flatMap(v => splitUrls_(v));
  for (const u of more) if (u) urls.push(u);

  const seen = new Set();
  const out = [];
  for (const u of urls) {
    const nu = text(u);
    if (!nu) continue;
    if (seen.has(nu)) continue;
    seen.add(nu);
    out.push(nu);
  }
  return out;
}

/* ===========================
Avatar
=========================== */
function setAvatarImage_(payloadNorm) {
  const img = $("u-img");
  if (!img) return;

  const avatar = firstNonEmpty_([
    pick(payloadNorm, ["個人照_fast", "個人照", "形象照_fast", "形象照", "avatar_fast", "avatar", "photo"]),
  ]);

  if (!avatar) {
    img.removeAttribute("src");
    return;
  }

  const cands = buildImageCandidates_(avatar);
  setImgWithFallback_(img, cands);
}

/* ===========================
Contact Buttons
=========================== */
function buildContactButtons_(payloadNorm) {
  const row = $("contactRow");
  if (!row) return;

  row.innerHTML = "";

  const phone = pick(payloadNorm, ["phone", "電話", "手機"]);
  const line = pick(payloadNorm, ["line", "LINE", "line_id"]);
  const web = pick(payloadNorm, ["website", "網址", "官網"]);
  const email = pick(payloadNorm, ["email", "Email"]);
  const ig = pick(payloadNorm, ["instagram", "ig"]);
  const fb = pick(payloadNorm, ["facebook", "fb"]);
  const wechat = pick(payloadNorm, ["wechat", "weixin"]);

  const addBtn = (label, url) => {
    if (!url) return;
    const b = document.createElement("button");
    b.className = "btn-mini";
    b.textContent = label;
    b.onclick = () => window.open(url, "_blank");
    row.appendChild(b);
  };

  if (phone) addBtn("撥打電話", `tel:${phone}`);
  if (line) addBtn("LINE", `https://line.me/R/ti/p/~${line}`);
  if (web) addBtn("網站", web.startsWith("http") ? web : `https://${web}`);
  if (email) addBtn("Email", `mailto:${email}`);
  if (ig) addBtn("Instagram", `https://instagram.com/${ig}`);
  if (fb) addBtn("Facebook", `https://facebook.com/${fb}`);
  if (wechat) addBtn("WeChat", wechat);

  showEl("blk-contact", row.children.length > 0);
}

/* ===========================
Gallery Renderer
=========================== */
function renderGallery_(urls) {
  const wrap = $("galleryWrap");
  const dots = $("galleryDots");
  if (!wrap || !dots) return;

  wrap.innerHTML = "";
  dots.innerHTML = "";

  if (!urls.length) {
    showEl("blk-gallery", false);
    return;
  }

  urls.forEach((u, i) => {
    const div = document.createElement("div");
    div.className = "g-item";
    const img = document.createElement("img");
    img.src = normalizeImageUrl(u);
    div.appendChild(img);
    wrap.appendChild(div);

    const d = document.createElement("div");
    d.className = "g-dot" + (i === 0 ? " active" : "");
    dots.appendChild(d);
  });

  showEl("blk-gallery", true);
}

/* ===========================
Extra Fields Auto Boxes
v396: STRICT FILTER — hide system/form selection/back-end fields
=========================== */
function shouldHideField_(key, value) {
  const k = cleanKey_(key);
  const lk = k.toLowerCase();
  const v = text(value);

  if (!k || !v) return true;

  // never show internal keys
  if (lk.startsWith("__") || lk.startsWith("_")) return true;

  // do not show primary identifiers
  if (lk === "id" || k === "編號" || k === "卡號") return true;

  // blacklist by exact known keys (Chinese + English)
  const exactHide = new Set([
    "時間戳記", "timestamp", "Timestamp", "提交時間", "建立時間", "更新時間",
    "token", "status", "Status", "狀態",
    "選擇名片顏色", "選擇版型風格", "選擇名片製作方案",
    "選擇方案", "選擇顏色", "選擇版型", "選擇紙感", "選擇紙張", "選擇風格",
  ]);
  if (exactHide.has(k) || exactHide.has(lk) || exactHide.has(key)) return true;

  // regex hide: anything about selection/config/form meta
  const rx = /(token|status|timestamp|time\s*stamp|created|updated|submit|submitted|選擇|方案|名片顏色|版型|紙感|紙張|風格|製作方案|紀錄|記錄)/i;
  if (rx.test(k) || rx.test(lk)) return true;

  // if the value looks like ISO time, treat as meta
  if (/^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}(\.\d+)?z$/i.test(v)) return true;

  return false;
}

function renderExtraFields_(payloadNorm) {
  const host = $("blk-extra");
  if (!host) return;

  host.innerHTML = "";

  const raw = payloadNorm.__raw || {};
  const usedKeyHints = [
    "姓名","name","Name",
    "單位","unit","Unit",
    "服務項目","service","Service",
    "一句話","標語","tagline","slogan",
    "phone","電話","手機",
    "line","LINE","line_id",
    "website","網址","官網",
    "email","Email",
    "instagram","ig",
    "facebook","fb",
    "wechat","weixin",
    "address","地址","公司地址","住址",
    "個人照","形象照","avatar","photo",
    "gallery","images","照片牆","作品照","相簿","輪播牆"
  ].map(s => String(s).toLowerCase());

  const boxes = [];

  for (const k of Object.keys(raw)) {
    const v = raw[k];
    if (shouldHideField_(k, v)) continue;

    const lk = cleanKey_(k).toLowerCase();
    // skip fields already used in main sections (roughly)
    if (usedKeyHints.some(h => lk.includes(h))) continue;

    const box = document.createElement("div");
    box.className = "content-box";
    box.innerHTML = `<div class="box-title">${cleanKey_(k)}</div><div class="box-text">${text(v)}</div>`;
    boxes.push(box);
  }

  // render
  boxes.forEach(b => host.appendChild(b));
  showEl("blk-extra", boxes.length > 0);
}

/* ===========================
Apply Data To Card
=========================== */
function applyDataToCard_(fields) {
  const norm = buildNormalizedPayload_(fields);

  setText("u-name", pick(norm, ["姓名", "name", "Name"]) || "（尚未讀到姓名）");
  setText("u-unit", pick(norm, ["單位", "unit", "Unit"]) || "");
  setText("u-service", pick(norm, ["服務項目", "service", "Service"]) || "");

  const tagline = pick(norm, ["一句話", "定位", "標語", "tagline", "slogan"]);
  setText("u-tagline", tagline);
  showEl("blk-tagline", !!text(tagline));

  setAvatarImage_(norm);

  const gallery = extractGalleryUrls_(norm);
  renderGallery_(gallery);

  buildContactButtons_(norm);
  renderExtraFields_(norm);
}

/* ===========================
Load Card
=========================== */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;

  await waitForDom_(["u-name","u-unit","u-service"], 2400);

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __lastLoad = { id: cid, ts: Date.now(), url };

  try {
    const data = await fetchJsonRobust(url);
    const fields = resolveCardObject_(data, cid);
    if (!fields) throw new Error("No card fields");

    __payloadRaw = data;
    __payload = fields;

    applyDataToCard_(fields);

    // keep URL id
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    } catch {}

  } catch (e) {
    err_("loadCard failed:", e);
    setText("u-name", "（同步失敗）");
    setText("u-unit", e && e.message ? `同步失敗：${e.message}` : "請確認 GAS 權限/ID");
    setText("u-service", "");
    const img = $("u-img");
    if (img) img.removeAttribute("src");
  }
}

/* ===========================
CTA
=========================== */
window.goFillForm = function(){
  try{
    const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
    const u = new URL(CONFIG.FORM);
    u.searchParams.set("id", id);
    window.open(u.toString(), "_blank");
  }catch{
    window.open(CONFIG.FORM, "_blank");
  }
};

/* ===========================
Hidden Admin Entry
=========================== */
function openAdmin_() {
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  const u = `admin.html?id=${encodeURIComponent(id)}`;
  window.open(u, "_blank");
}

function bindLongPress_(target, ms, onFire) {
  if (!target) return;

  let timer = null;
  let fired = false;

  const start = () => {
    fired = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fired = true;
      try { onFire(); } catch {}
    }, ms);
  };

  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  target.addEventListener("touchstart", start, { passive: true });
  target.addEventListener("touchend", cancel, { passive: true });
  target.addEventListener("touchcancel", cancel, { passive: true });

  target.addEventListener("mousedown", start);
  target.addEventListener("mouseup", cancel);
  target.addEventListener("mouseleave", cancel);

  target.addEventListener("click", (e) => {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

function ensureAdminHotspot_() {
  if ($("adminHotspot")) return;

  const hs = document.createElement("div");
  hs.id = "adminHotspot";
  hs.setAttribute("aria-label", "admin-hotspot");
  hs.style.position = "fixed";
  hs.style.top = "6px";
  hs.style.right = "6px";
  hs.style.width = "28px";
  hs.style.height = "28px";
  hs.style.opacity = "0";
  hs.style.zIndex = "99999";
  hs.style.background = "transparent";
  hs.style.borderRadius = "10px";
  hs.style.pointerEvents = "auto";
  document.body.appendChild(hs);
}

function bindAdminHiddenEntry_() {
  const versionTag = q(".version-tag") || $("versionTag") || null;
  const footer = q("footer") || $("footerTag") || null;

  if (versionTag) bindLongPress_(versionTag, CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);
  else if (footer) bindLongPress_(footer, CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);

  ensureAdminHotspot_();
  bindLongPress_($("adminHotspot"), CONFIG.ADMIN_LONGPRESS_MS, openAdmin_);
}

/* ===========================
Boot
=========================== */
function boot_() {
  try { applyV382_(); } catch {}
  try { syncPlanButtons_(); } catch {}
  try { toggleDotsRows_(); } catch {}
  try { bindAdminHiddenEntry_(); } catch {}

  const id = getCardIdFromUrl_();
  loadCardById_(id).catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => { if (!__lastLoad.ts) boot_(); });