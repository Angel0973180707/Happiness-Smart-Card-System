/* ================================
 * Angel Card app.js (V387 FULL OVERWRITE)
 * Goal:
 * - KEEP V385 look/structure (門面/樣品區/自由款只影響 banner、精品卡樣貌不變)
 * - MERGE V386.2 capabilities (auto-read ALL headers, robust fetch, contacts, photo wall, full-text modal)
 * - Respect premium color order: p1胭脂 p2酒紅 p3深藍 p4霧紫 p5藍灰 p6金箔 p7褐碳 (handled by HTML dots order)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  DOM_WAIT_MS: 2600,
  DOM_POLL_MS: 80,

  GALLERY_MAX: 12,

  // full-text preview
  PREVIEW_CHARS: 60,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let __payloadRaw = null;
let __payload = null;

function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[AngelCard]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[AngelCard]", ...arguments); }
function err_() { console.error("[AngelCard]", ...arguments); }
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
function getCardId() {
  const id = text(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

async function waitForDom_(ids, timeoutMs = CONFIG.DOM_WAIT_MS) {
  const need = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    let ok = true;
    for (const id of need) { if (!$(id)) { ok = false; break; } }
    if (ok) return true;
    await sleep(CONFIG.DOM_POLL_MS);
  }
  return false;
}

/* =========================================================
 * V385 switching (KEEP) — do NOT change layout, only body classes
 * ========================================================= */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
  applyPlanSplitUi_();
  syncControlsActiveUi_();
};

window.setV382Style = function (style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

window.setV382Paper = function (paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

function applyV382() {
  const isFree = state.mode === "free";
  const controlPanel = $("free-controls");
  if (controlPanel) controlPanel.style.display = isFree ? "block" : "none";

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];
  document.body.className = classList.filter(Boolean).join(" ");
}

function applyPlanSplitUi_() {
  const panel = $("admin-panel");
  if (!panel) return;

  // expectation: panel has 2 dots-row (free row then premium row) + #free-controls
  const rows = qa(".dots-row", panel);
  const freeDotsRow = rows[0] || null;
  const premiumDotsRow = rows[1] || null;

  const freeControls = $("free-controls");
  const isFree = state.mode === "free";

  if (freeDotsRow) freeDotsRow.style.display = isFree ? "flex" : "none";
  if (premiumDotsRow) premiumDotsRow.style.display = isFree ? "none" : "flex";
  if (freeControls) freeControls.style.display = isFree ? "block" : "none";
}

function syncControlsActiveUi_() {
  // keep active state for style & paper buttons if present
  const styleMap = { arch: "優雅正拱", flat: "簡潔平直", spot: "晨曦款" };
  const paperMap = { "paper-1": "棉紙", "paper-2": "顆粒", "paper-3": "亞麻" };

  const freeControls = $("free-controls");
  if (!freeControls) return;

  // style row = first .control-row inside free-controls
  const rows = qa(".control-row", freeControls);
  const styleRow = rows[0] || null;
  const paperRow = rows[1] || null;

  if (styleRow) {
    const btns = qa(".btn-neo", styleRow);
    btns.forEach(b => b.classList.remove("active"));
    const want = styleMap[state.style];
    const hit = btns.find(b => text(b.textContent) === want);
    if (hit) hit.classList.add("active");
  }

  if (paperRow) {
    const btns = qa(".btn-neo", paperRow);
    btns.forEach(b => b.classList.remove("active"));
    const want = paperMap[state.paper];
    const hit = btns.find(b => text(b.textContent) === want);
    if (hit) hit.classList.add("active");
  }
}

window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

/* =========================================================
 * Robust fetch (NO custom headers) — keep stable in mobile
 * ========================================================= */
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
      const m = body.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) return JSON.parse(m[1]);
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

/* =========================================================
 * Header normalize + pick (AUTO read ALL headers)
 * ========================================================= */
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

/* =========================================================
 * Image helpers (Drive / Dropbox safe)
 * ========================================================= */
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

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
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
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
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
      original
    ];
  }

  return [normalizeImageUrl(original)];
}

function setImgWithFallback_(imgEl, candidates) {
  if (!imgEl) return;
  const list = (candidates || []).map(text).filter(Boolean);
  if (!list.length) {
    imgEl.removeAttribute("src");
    return;
  }

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

/* =========================================================
 * Photos parsing (multi links)
 * ========================================================= */
function splitLinks_(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => text(x)).filter(Boolean);
  const s = text(v);
  if (!s) return [];
  return s.split(/[\n,，;；]+/).map(x => text(x)).filter(Boolean);
}

function getPhotosArray_(payload) {
  const v =
    pick(payload, ["照片_fast", "照片_fast ", "photos_fast"]) ||
    pick(payload, ["照片", "作品照片", "相片", "photos"]);

  const base = splitLinks_(v)
    .filter(Boolean)
    .map(u => normalizeImageUrl(u))
    .filter(Boolean);

  // uniq + limit
  const uniq = [];
  const seen = new Set();
  for (const u of base) {
    if (seen.has(u)) continue;
    seen.add(u);
    uniq.push(u);
    if (uniq.length >= CONFIG.GALLERY_MAX) break;
  }
  return uniq;
}

/* =========================================================
 * V387: Full-text modal (NO CSS changes to v385; we inject needed styles)
 * ========================================================= */
function injectV387Styles_() {
  if (q("#v387-style")) return;
  const style = document.createElement("style");
  style.id = "v387-style";
  style.textContent = `
    .v387-more-btn{
      display:inline-flex; align-items:center; justify-content:center;
      gap:6px; padding:8px 12px; border-radius:999px;
      border:1px solid rgba(0,0,0,0.12);
      background:rgba(255,255,255,0.65);
      font-weight:900; cursor:pointer;
      margin-top:10px;
    }
    .mode-premium .v387-more-btn{
      border:1px solid rgba(255,255,255,0.25);
      background:rgba(255,255,255,0.16);
      color:rgba(255,255,255,0.92);
      backdrop-filter: blur(8px);
    }
    .v387-modal{
      position:fixed; inset:0; display:none;
      align-items:center; justify-content:center;
      background:rgba(0,0,0,0.45);
      z-index:9999;
      padding:16px;
    }
    .v387-modal-card{
      width:min(560px, 96vw);
      max-height:88vh;
      overflow:auto;
      border-radius:18px;
      background:rgba(255,255,255,0.95);
      box-shadow:0 18px 60px rgba(0,0,0,0.25);
      padding:16px 16px 14px;
    }
    .mode-premium .v387-modal-card{
      background:rgba(20,20,20,0.68);
      border:1px solid rgba(255,255,255,0.18);
      color:rgba(255,255,255,0.92);
      backdrop-filter: blur(12px);
    }
    .v387-modal-title{
      font-weight:1000;
      font-size:14px;
      opacity:0.9;
      margin-bottom:10px;
    }
    .v387-modal-body{
      white-space:pre-line;
      line-height:1.75;
      font-weight:700;
      font-size:13px;
    }
    .v387-modal-actions{
      display:flex;
      justify-content:flex-end;
      gap:10px;
      margin-top:12px;
    }
    .v387-modal-close{
      padding:8px 12px;
      border-radius:12px;
      border:none;
      cursor:pointer;
      font-weight:900;
      background:rgba(0,0,0,0.08);
    }
    .mode-premium .v387-modal-close{
      background:rgba(255,255,255,0.16);
      color:rgba(255,255,255,0.92);
    }
  `;
  document.head.appendChild(style);
}

function ensureModal_() {
  if ($("v387Modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "v387Modal";
  overlay.className = "v387-modal";

  const card = document.createElement("div");
  card.className = "v387-modal-card";

  const title = document.createElement("div");
  title.id = "v387ModalTitle";
  title.className = "v387-modal-title";

  const body = document.createElement("div");
  body.id = "v387ModalBody";
  body.className = "v387-modal-body";

  const actions = document.createElement("div");
  actions.className = "v387-modal-actions";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "v387-modal-close";
  close.textContent = "關閉";

  actions.appendChild(close);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const hide = () => (overlay.style.display = "none");
  close.addEventListener("click", hide);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) hide(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display !== "none") hide();
  });
}

function openModal_(title, content) {
  ensureModal_();
  const overlay = $("v387Modal");
  const t = $("v387ModalTitle");
  const b = $("v387ModalBody");
  if (!overlay || !t || !b) return;

  t.textContent = title || "內容";
  b.textContent = text(content) || "";
  overlay.style.display = "flex";
}

function applyFullTextBtn_(containerEl, title, content) {
  if (!containerEl) return;
  const s = text(content);
  if (!s) return;

  // keep original look: only add a button at the end, do not change the box style
  const short = s.length > CONFIG.PREVIEW_CHARS ? (s.slice(0, CONFIG.PREVIEW_CHARS) + "…") : s;

  // If element is plain text container (like #u-service), replace with preview + btn
  // but keep it SIMPLE to avoid breaking sample area.
  containerEl.textContent = short;

  if (s.length <= CONFIG.PREVIEW_CHARS) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "v387-more-btn";
  btn.innerHTML = `<i class="fa-solid fa-circle-info"></i><span>查看全文</span>`;
  btn.addEventListener("click", () => openModal_(title, s));

  containerEl.appendChild(document.createElement("div"));
  containerEl.appendChild(btn);
}

/* =========================================================
 * Contact box + Photo wall (inject AFTER existing content — do not touch admin/sample area)
 * ========================================================= */
function ensureInfoScroll_() {
  return q(".info-scroll") || $("card-container") || document.body;
}

function ensureContactBox_() {
  const scroll = ensureInfoScroll_();
  if ($("contactBox")) return $("contactBox");

  const box = document.createElement("div");
  box.id = "contactBox";
  box.className = "content-box";

  const t = document.createElement("div");
  t.className = "box-title";
  t.textContent = "聯繫方式";

  const main = document.createElement("div");
  main.className = "contact-main";
  main.id = "contactMain";

  const sub = document.createElement("div");
  sub.className = "contact-sub";
  sub.id = "contactSub";

  box.appendChild(t);
  box.appendChild(main);
  box.appendChild(sub);

  // insert after #u-service box (existing v385 structure)
  const serviceEl = $("u-service");
  const anchorBox = serviceEl ? serviceEl.closest(".content-box") : null;
  if (anchorBox && anchorBox.parentElement) {
    if (anchorBox.nextSibling) anchorBox.parentElement.insertBefore(box, anchorBox.nextSibling);
    else anchorBox.parentElement.appendChild(box);
  } else {
    scroll.appendChild(box);
  }

  return box;
}

function normalizeTel_(v) {
  const s = text(v);
  if (!s) return "";
  return s.replace(/[^\d+]/g, "");
}
function normalizeEmail_(v) {
  const s = text(v);
  if (!s) return "";
  return s.replace(/\s+/g, "");
}
function normalizeUrl_(v) {
  const s = text(v);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^line:\/\//i.test(s)) return s;
  return "https://" + s; // allow lin.ee / line.me without scheme
}

function makeMainBtn_(label, urlOrFn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn-cta mini";
  b.textContent = label;
  b.addEventListener("click", async () => {
    if (typeof urlOrFn === "function") return urlOrFn();
    const u = text(urlOrFn);
    if (!u) return;
    window.open(u, "_blank");
  });
  return b;
}
function makeChip_(label, url) {
  const a = document.createElement("a");
  a.className = "chip";
  a.textContent = label;
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}
async function copyText_(s) {
  const v = text(s);
  if (!v) return;
  try {
    await navigator.clipboard.writeText(v);
    alert("已複製：" + v);
  } catch {
    prompt("請複製：", v);
  }
}

function renderContacts_(payloadNorm) {
  const box = ensureContactBox_();
  if (!box) return;

  const main = $("contactMain");
  const sub = $("contactSub");
  if (!main || !sub) return;

  main.innerHTML = "";
  sub.innerHTML = "";

  const wechat = pick(payloadNorm, ["微信", "WeChat", "wechat"]);
  const lineLink = pick(payloadNorm, ["LINE連結", "line_link", "LINE link", "line"]);
  const lineOA = pick(payloadNorm, ["LINE官方帳號", "LINE 官方帳號", "line_oa", "lin.ee"]);
  const email = pick(payloadNorm, ["Email", "email", "E-mail", "信箱"]);
  const phone = pick(payloadNorm, ["電話", "phone", "tel", "mobile", "手機"]);
  const addr = pick(payloadNorm, ["地址", "address", "住址", "地點"]);

  const media1 = pick(payloadNorm, ["影音平台1", "video1", "media1"]);
  const media2 = pick(payloadNorm, ["影音平台2", "video2", "media2"]);
  const media3 = pick(payloadNorm, ["影音平台3", "video3", "media3"]);

  const social1 = pick(payloadNorm, ["社群平台1", "social1"]);
  const social2 = pick(payloadNorm, ["社群平台2", "social2"]);
  const social3 = pick(payloadNorm, ["社群平台3", "social3"]);

  // Main actions
  const bestLine = text(lineLink) ? normalizeUrl_(lineLink) : (text(lineOA) ? normalizeUrl_(lineOA) : "");
  if (bestLine) main.appendChild(makeMainBtn_("加 LINE / 聯繫", bestLine));

  const bestWeb = text(media1) ? normalizeUrl_(media1) : (text(social1) ? normalizeUrl_(social1) : "");
  if (bestWeb) main.appendChild(makeMainBtn_("前往官網 / 作品", bestWeb));

  main.appendChild(makeMainBtn_("填寫預約表單", () => window.open(CONFIG.FORM, "_blank")));

  if (wechat) {
    main.appendChild(makeMainBtn_("微信聯繫（複製）", () => copyText_(wechat)));
  }

  // Sub chips
  if (phone) {
    const t = normalizeTel_(phone);
    if (t) sub.appendChild(makeChip_("電話：" + t, "tel:" + t));
  }
  if (email) {
    const e = normalizeEmail_(email);
    if (e) sub.appendChild(makeChip_("Email：" + e, "mailto:" + e));
  }
  if (addr) {
    const a = text(addr);
    const maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a);
    sub.appendChild(makeChip_("地址導航", maps));
  }

  const extraLinks = [
    ["影音平台2", media2],
    ["影音平台3", media3],
    ["社群平台1", social1],
    ["社群平台2", social2],
    ["社群平台3", social3],
  ];
  for (const [label, v] of extraLinks) {
    if (!text(v)) continue;
    sub.appendChild(makeChip_(label, normalizeUrl_(v)));
  }

  if (!main.children.length && !sub.children.length) {
    const note = document.createElement("div");
    note.style.opacity = "0.75";
    note.style.fontSize = "13px";
    note.textContent = "（尚未提供聯繫方式）";
    main.appendChild(note);
  }
}

/* -------- Photo wall (simple + safe) -------- */
function ensurePhotoWallDom_() {
  if ($("photoWall")) return;
  const card = $("card-container");
  if (!card) return;

  const vtag = card.querySelector(".version-tag");

  const wrap = document.createElement("section");
  wrap.id = "photoWall";
  wrap.className = "photo-wall content-box";
  wrap.style.display = "none";

  const head = document.createElement("div");
  head.className = "box-title";
  head.textContent = "照片作品（點一下看原圖）";

  const grid = document.createElement("div");
  grid.id = "photoWallGrid";
  grid.className = "photo-wall-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "10px";

  wrap.appendChild(head);
  wrap.appendChild(grid);

  // insert near bottom, before version tag (keep v385 sample area untouched)
  if (vtag && vtag.parentElement) vtag.parentElement.insertBefore(wrap, vtag);
  else card.appendChild(wrap);

  const setCols = () => {
    const w = Math.min(window.innerWidth, 560);
    const cols = w >= 420 ? 4 : 3;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  };
  setCols();
  window.addEventListener("resize", setCols);
}

function ensureLightbox_() {
  if ($("imgLightbox")) return;

  const overlay = document.createElement("div");
  overlay.id = "imgLightbox";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.55)";
  overlay.style.zIndex = "9998";
  overlay.style.padding = "14px";

  const inner = document.createElement("div");
  inner.style.width = "min(720px, 96vw)";
  inner.style.maxHeight = "90vh";
  inner.style.borderRadius = "18px";
  inner.style.overflow = "hidden";
  inner.style.background = "rgba(255,255,255,0.06)";
  inner.style.border = "1px solid rgba(255,255,255,0.18)";
  inner.style.backdropFilter = "blur(10px)";
  inner.style.position = "relative";

  const img = document.createElement("img");
  img.id = "imgLightboxImg";
  img.alt = "原圖";
  img.style.width = "100%";
  img.style.height = "auto";
  img.style.maxHeight = "90vh";
  img.style.objectFit = "contain";
  img.style.display = "block";
  img.style.background = "rgba(0,0,0,0.18)";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "關閉");
  close.style.position = "absolute";
  close.style.top = "10px";
  close.style.right = "10px";
  close.style.width = "40px";
  close.style.height = "40px";
  close.style.borderRadius = "999px";
  close.style.border = "none";
  close.style.cursor = "pointer";
  close.style.fontSize = "26px";
  close.style.fontWeight = "900";
  close.style.background = "rgba(255,255,255,0.2)";
  close.style.color = "rgba(255,255,255,0.92)";

  inner.appendChild(img);
  inner.appendChild(close);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  const hide = () => {
    overlay.style.display = "none";
    img.removeAttribute("src");
  };

  overlay.addEventListener("click", (e) => { if (e.target === overlay) hide(); });
  close.addEventListener("click", hide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display !== "none") hide();
  });
}

function openLightbox_(url) {
  ensureLightbox_();
  const overlay = $("imgLightbox");
  const img = $("imgLightboxImg");
  if (!overlay || !img) return;
  overlay.style.display = "flex";
  setImgWithFallback_(img, buildImageCandidates_(url));
}

function renderPhotoWall_(urls) {
  ensurePhotoWallDom_();
  const wrap = $("photoWall");
  const grid = $("photoWallGrid");
  if (!wrap || !grid) return;

  const list = (urls || []).map(text).filter(Boolean);
  if (!list.length) {
    wrap.style.display = "none";
    grid.innerHTML = "";
    return;
  }

  wrap.style.display = "block";
  grid.innerHTML = "";

  for (const u of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.padding = "0";
    btn.style.border = "none";
    btn.style.borderRadius = "14px";
    btn.style.overflow = "hidden";
    btn.style.cursor = "pointer";
    btn.style.background = "rgba(0,0,0,0.06)";

    const img = document.createElement("img");
    img.alt = "縮圖";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.style.width = "100%";
    img.style.height = "92px";
    img.style.objectFit = "contain";
    img.style.display = "block";
    img.style.background = "rgba(0,0,0,0.06)";

    setImgWithFallback_(img, buildImageCandidates_(u));
    btn.addEventListener("click", () => openLightbox_(u));

    btn.appendChild(img);
    grid.appendChild(btn);
  }
}

/* =========================================================
 * V387: Read sheet selections -> set initial UI state (keep v385 dots order)
 * ========================================================= */
function parsePlanSelections_(payloadNorm) {
  const plan = pick(payloadNorm, ["選擇名片製作方案", "方案", "plan"]);
  const color = pick(payloadNorm, ["選擇名片顏色", "顏色", "color"]);
  const style = pick(payloadNorm, ["選擇版型風格", "版型", "style"]);
  const paper = pick(payloadNorm, ["選擇紙感質地", "紙感", "paper"]);
  const premium = pick(payloadNorm, ["選擇精品底色", "精品底色", "premium"]);

  // plan: "1自由搭配款" or "2精品設計款"
  if (/精品|2/i.test(String(plan || ""))) state.mode = "premium";
  else state.mode = "free";

  // free colors: c1~c5 -> color-1~color-5
  const mC = String(color || "").match(/c(\d)/i);
  if (mC && mC[1]) state.theme = `color-${mC[1]}`;

  // premium colors: p1~p7
  const mP = String(premium || "").match(/p(\d)/i);
  if (mP && mP[1]) state.theme = `p${mP[1]}`;

  // styles: s1正拱 / s2平直 / s3晨曦
  const mS = String(style || "").match(/s(\d)/i);
  if (mS && mS[1]) {
    if (mS[1] === "1") state.style = "arch";
    if (mS[1] === "2") state.style = "flat";
    if (mS[1] === "3") state.style = "spot";
  }

  // paper: f1棉紙 / f2顆粒 / f3亞麻
  const mF = String(paper || "").match(/f(\d)/i);
  if (mF && mF[1]) state.paper = `paper-${mF[1]}`;
}

function syncDotActiveByState_() {
  const panel = $("admin-panel");
  if (!panel) return;

  // free dots row
  const rows = qa(".dots-row", panel);
  const freeRow = rows[0] || null;
  const premiumRow = rows[1] || null;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));

  if (state.mode === "free" && freeRow) {
    const idx = Math.max(1, Math.min(5, parseInt(String(state.theme).replace("color-", ""), 10) || 1));
    const dots = qa(".dot", freeRow);
    const el = dots[idx - 1];
    if (el) el.classList.add("active");
  }

  if (state.mode === "premium" && premiumRow) {
    const idx = Math.max(1, Math.min(7, parseInt(String(state.theme).replace("p", ""), 10) || 1));
    const dots = qa(".p-dot", premiumRow);
    const el = dots[idx - 1];
    if (el) el.classList.add("active");
  }

  syncControlsActiveUi_();
}

/* =========================================================
 * Apply all data to card (KEEP v385 DOM)
 * - Read all your headers: 單位、頭銜、理念標語、經歷…等
 * - Do NOT remove sample area or restructure
 * ========================================================= */
function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;
  const cands = buildImageCandidates_(url);
  if (!cands.length) {
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, cands);
}

function applyDataToCard(payloadNorm) {
  // core fields
  const name = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const title = pick(payloadNorm, ["頭銜", "職稱", "title", "Title"]);
  const slogan = pick(payloadNorm, ["理念標語", "標語", "slogan", "tagline"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);
  const exp = pick(payloadNorm, ["經歷", "學經歷", "experience", "Experience"]);

  // images
  const avatar =
    pick(payloadNorm, ["個人照_fast", "個人照", "形象照_fast", "形象照", "個人照_fast "]) ||
    pick(payloadNorm, ["個人照", "形象照", "照片", "photo"]);

  // apply plan selections -> state -> class (do it BEFORE writing UI)
  parsePlanSelections_(payloadNorm);
  applyV382();
  applyPlanSplitUi_();
  syncDotActiveByState_();

  // write existing DOM
  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");

  // #u-service is a content-box in v385: keep it, but apply full-text button
  const serviceEl = $("u-service");
  if (serviceEl) {
    applyFullTextBtn_(serviceEl, "服務項目", service || "");
  } else {
    // if missing, don't inject anything (protect v385 layout)
  }

  // avatar
  setAvatarImage(avatar);

  // Optional: if your v385 HTML later has these ids, we fill them (safe)
  if ($("u-title")) setText("u-title", title || "");
  if ($("u-slogan")) applyFullTextBtn_($("u-slogan"), "理念標語", slogan || "");
  if ($("u-exp")) applyFullTextBtn_($("u-exp"), "經歷", exp || "");

  // If v385 doesn't have u-slogan/u-exp containers, we STILL respect your rule:
  // "所有說明都設一個鈕，點進去看全文" — we do it by adding small buttons ONLY,
  // and we place them in existing content flow after service box, but never touch the sample area.
  const scroll = ensureInfoScroll_();
  const serviceBox = serviceEl ? serviceEl.closest(".content-box") : null;

  // slogan box (only if not already present)
  if (!$("v387SloganBox") && text(slogan)) {
    const box = document.createElement("div");
    box.id = "v387SloganBox";
    box.className = "content-box";
    const body = document.createElement("div");
    box.appendChild(body);
    applyFullTextBtn_(body, "理念標語", slogan);

    if (serviceBox && serviceBox.parentElement) {
      if (serviceBox.nextSibling) serviceBox.parentElement.insertBefore(box, serviceBox.nextSibling);
      else serviceBox.parentElement.appendChild(box);
    } else {
      scroll.appendChild(box);
    }
  }

  // exp box
  if (!$("v387ExpBox") && text(exp)) {
    const box = document.createElement("div");
    box.id = "v387ExpBox";
    box.className = "content-box";
    const body = document.createElement("div");
    box.appendChild(body);
    applyFullTextBtn_(body, "經歷", exp);

    const anchor = $("v387SloganBox") || serviceBox;
    if (anchor && anchor.parentElement) {
      if (anchor.nextSibling) anchor.parentElement.insertBefore(box, anchor.nextSibling);
      else anchor.parentElement.appendChild(box);
    } else {
      scroll.appendChild(box);
    }
  }

  // contacts + photos
  renderContacts_(payloadNorm);
  const photos = getPhotosArray_(payloadNorm);
  renderPhotoWall_(photos);
}

/* =========================================================
 * Loading / fail UI (keep gentle)
 * ========================================================= */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  const s = $("u-service");
  if (s) s.textContent = "正在同步雲端服務項目...";
}

function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認網址 ?id=TW000X 或檢查 GAS 權限");
  const s = $("u-service");
  if (s) s.textContent = "";

  const img = $("u-img");
  if (img) img.removeAttribute("src");

  if ($("photoWall")) $("photoWall").style.display = "none";
  if ($("photoWallGrid")) $("photoWallGrid").innerHTML = "";

  if ($("contactMain")) $("contactMain").innerHTML = "";
  if ($("contactSub")) $("contactSub").innerHTML = "";
}

/* =========================================================
 * Load data (action=card&id=...)
 * Supports:
 * - direct row object OR {ok:true, data:{...}} OR {row:{...}}
 * ========================================================= */
function unwrapPayload_(data) {
  if (!data || typeof data !== "object") return null;
  if (data.ok === false) return null;

  // common wrappers
  if (data.data && typeof data.data === "object") return data.data;
  if (data.row && typeof data.row === "object") return data.row;
  if (data.item && typeof data.item === "object") return data.item;

  // if it already looks like row fields, use it
  return data;
}

async function loadData() {
  const id = getCardId();
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;

  await waitForDom_(["u-name", "u-unit"], CONFIG.DOM_WAIT_MS);
  setLoadingUi_();

  log_("loadData start:", { id });

  try {
    const data = await fetchJsonRobust(url);
    const rawRow = unwrapPayload_(data);
    if (!rawRow || typeof rawRow !== "object") throw new Error("Invalid payload");

    __payloadRaw = rawRow;
    __payload = buildNormalizedPayload_(rawRow);

    // apply
    applyDataToCard(__payload);

    // mobile settle re-apply once
    await sleep(180);
    if (text($("u-name")?.textContent) === "載入中...") {
      applyDataToCard(__payload);
    }

    log_("loadData success:", { id, keys: Object.keys(rawRow).length });

  } catch (e) {
    err_("雲端同步異常:", e);
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
  }
}

/* =========================================================
 * Boot
 * ========================================================= */
function boot_() {
  injectV387Styles_();
  ensureModal_();

  try { applyV382(); } catch {}
  try { applyPlanSplitUi_(); } catch {}

  loadData();
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => {
  // fallback if DOMContentLoaded missed
  if (!__payload) boot_();
});