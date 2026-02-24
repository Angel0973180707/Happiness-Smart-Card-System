/* ================================
Angel Card app.js (V388 FULL OVERWRITE)

GOALS (per v387-AdminShare):
- Keep v385 front layout intact (NO duplicated plan buttons / NO duplicated form button)
- Bring back v386.2 abilities: robust auto field pick, logo, contacts, photo wall
- Add hidden admin entry: long-press footer/version-tag 1.2s => admin.html
- Add share card page: share.html?id=TW000X (OG-like delivery card, not dynamic OG image)
- Robust header normalize (quote/newline/zero-width)
- Support photos field (comma/newline split) + Drive link normalization
================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  GALLERY_MAX: 12,
  THUMB_MIN_COL: 3,
  THUMB_MAX_COL: 4,

  DOM_WAIT_MS: 2800,
  DOM_POLL_MS: 80,

  ADMIN_LONGPRESS_MS: 1200,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __gallery = { list: [], inited: false };
let __lastLoad = { id: "", ts: 0, url: "" };

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[AngelCard]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[AngelCard]", ...arguments); }
function err_() { console.error("[AngelCard]", ...arguments); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* --------------------------- */
function getParam(name) {
  try { return new URLSearchParams(window.location.search).get(name); }
  catch { return null; }
}
function getCardId() {
  const id = text(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

/* ---------------------------
Switching system (keep existing HTML hooks)
--------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  // active dot
  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
  applyV382();
  refreshPremiumSafety_();
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

  // IMPORTANT: keep v385 classes expectations
  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];
  document.body.className = classList.filter(Boolean).join(" ");
}

/* --------------------------- */
function syncPlanButtons_() {
  // v385 usually has one pair. If not found, ignore.
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

/* ---- premium safety: avoid overlap on some phones ---- */
function refreshPremiumSafety_() {
  if (state.mode !== "premium") return;
  const nameEl = $("u-name");
  if (!nameEl) return;

  // small reflow insurance
  requestAnimationFrame(() => {
    nameEl.style.transform = "translateZ(0)";
    setTimeout(() => { nameEl.style.transform = ""; }, 120);
  });
}

/* --------------------------- */
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

/* ---------------------------
Fetch JSON (NO custom headers)
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
      // Some GAS setups wrap JSON; try to extract the first {...}
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
Key normalize + pick helpers
--------------------------- */
function cleanKey_(k) {
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "") // zero-width
    .replace(/\u3000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "") // remove newlines inside header
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

function pickByHeaderRegex_(payloadNorm, regexList) {
  if (!payloadNorm || typeof payloadNorm !== "object") return "";
  const keys = Object.keys(payloadNorm).filter(k => k && !k.startsWith("__"));
  for (const rx of regexList) {
    for (const k of keys) {
      if (rx.test(String(k))) {
        const v = payloadNorm[k];
        if (v != null && text(v) !== "") return v;
      }
    }
  }
  return "";
}

/* ---------------------------
URL helpers
--------------------------- */
function normalizeUrl_(v) {
  const s = text(v);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^line:\/\//i.test(s)) return s;
  return "https://" + s;
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

/* ---------------------------
Image helpers (Drive/Dropbox)
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

/* ---------------------------
Photos split
--------------------------- */
function splitLinks_(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => text(x)).filter(Boolean);
  const s = text(v);
  if (!s) return [];
  return s.split(/[\n,，;；]+/).map(x => text(x)).filter(Boolean);
}

function autoDetectPhotos_(payload) {
  if (!payload || typeof payload !== "object") return [];
  const out = [];
  const keys = Object.keys(payload).filter(k => k && !k.startsWith("__"));
  for (const k of keys) {
    if (!/(照片|相片|作品|photo|image|img)/i.test(String(k))) continue;
    const parts = splitLinks_(payload[k]);
    for (const p of parts) if (/^https?:\/\//i.test(p)) out.push(p);
  }
  // uniq
  const uniq = [];
  const seen = new Set();
  for (const u of out) {
    const nu = normalizeImageUrl(u);
    if (!nu) continue;
    if (seen.has(nu)) continue;
    seen.add(nu);
    uniq.push(nu);
  }
  return uniq;
}

function getPhotosArray_(payload) {
  const v =
    pick(payload, ["照片_fast", "photo_fast", "photos_fast"]) ||
    pick(payload, ["照片", "相片", "作品照片", "作品"]) ||
    payload.photos;

  const base = splitLinks_(v)
    .map(u => normalizeImageUrl(u))
    .filter(Boolean);

  const auto = base.length ? [] : autoDetectPhotos_(payload);
  return (base.length ? base : auto).slice(0, CONFIG.GALLERY_MAX);
}

/* ===========================
Logo inject (top-right)
=========================== */
function ensureLogoDom_() {
  const card = $("card-container") || q(".card") || q("#card") || q(".card-container");
  if (!card) return null;

  const exist = $("u-logo") || card.querySelector("img.card-logo");
  if (exist) return exist;

  let wrap = card.querySelector(".card-logo-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "card-logo-wrap";
    card.appendChild(wrap);
  }

  const img = document.createElement("img");
  img.className = "card-logo";
  img.alt = "Logo";
  wrap.appendChild(img);
  return img;
}

/* ===========================
Lightbox
=========================== */
function ensureLightbox_() {
  if ($("imgLightbox")) return;

  const overlay = document.createElement("div");
  overlay.id = "imgLightbox";
  overlay.className = "img-lightbox";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const inner = document.createElement("div");
  inner.className = "img-lightbox-inner";

  const img = document.createElement("img");
  img.id = "imgLightboxImg";
  img.alt = "原圖";
  img.style.maxWidth = "100%";
  img.style.maxHeight = "82vh";
  img.style.objectFit = "contain";

  const close = document.createElement("button");
  close.id = "imgLightboxClose";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "關閉");

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

/* ===========================
Photo wall inject
=========================== */
function ensurePhotoWallDom_() {
  if (__gallery.inited) return;
  const card = $("card-container") || q(".card") || q("#card");
  if (!card) return;

  const scroll = card.querySelector(".info-scroll") || card;

  const wrap = document.createElement("section");
  wrap.id = "photoWall";
  wrap.className = "photo-wall content-box";
  wrap.style.display = "none";

  const head = document.createElement("div");
  head.className = "box-title";
  head.textContent = "照片作品";

  const grid = document.createElement("div");
  grid.id = "photoWallGrid";
  grid.className = "photo-wall-grid";

  wrap.appendChild(head);
  wrap.appendChild(grid);

  scroll.appendChild(wrap);

  const setCols = () => {
    const w = Math.min(window.innerWidth, 560);
    const cols = w >= 420 ? CONFIG.THUMB_MAX_COL : CONFIG.THUMB_MIN_COL;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  };
  setCols();
  window.addEventListener("resize", setCols);

  __gallery.inited = true;
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
    btn.className = "photo-thumb";
    btn.setAttribute("aria-label", "點擊查看原圖");

    const img = document.createElement("img");
    img.alt = "縮圖";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    setImgWithFallback_(img, buildImageCandidates_(u));
    btn.addEventListener("click", () => openLightbox_(u));

    btn.appendChild(img);
    grid.appendChild(btn);
  }
}

/* ===========================
Contact box inject
=========================== */
function ensureContactBox_() {
  const card = $("card-container") || q(".card") || q("#card");
  if (!card) return null;

  const scroll = card.querySelector(".info-scroll") || card;
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

  scroll.appendChild(box);
  return box;
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
  ensureContactBox_();
  const main = $("contactMain");
  const sub = $("contactSub");
  if (!main || !sub) return;

  main.innerHTML = "";
  sub.innerHTML = "";

  const wechat = pick(payloadNorm, ["微信", "WeChat", "wechat"]);
  const lineLink = pick(payloadNorm, ["LINE連結", "line_link", "LINE link"]);
  const lineOA = pick(payloadNorm, ["LINE官方帳號", "LINE 官方帳號", "line_oa", "lin.ee"]);
  const email = pick(payloadNorm, ["Email", "email", "E-mail", "信箱"]);
  const phone = pick(payloadNorm, ["電話", "phone", "tel", "mobile", "手機"]);
  const addr = pick(payloadNorm, ["地址", "address", "住址", "地點"]);

  // allow 1~3 media & social (per spec; extend ok)
  const medias = [
    pick(payloadNorm, ["影音平台1", "video1", "media1"]),
    pick(payloadNorm, ["影音平台2", "video2", "media2"]),
    pick(payloadNorm, ["影音平台3", "video3", "media3"])
  ].filter(v => text(v));

  const socials = [
    pick(payloadNorm, ["社群平台1", "social1"]),
    pick(payloadNorm, ["社群平台2", "social2"]),
    pick(payloadNorm, ["社群平台3", "social3"])
  ].filter(v => text(v));

  // Main CTA: LINE / 官網作品 / 表單 / 微信複製
  const bestLine = text(lineLink) ? normalizeUrl_(lineLink) : (text(lineOA) ? normalizeUrl_(lineOA) : "");
  if (bestLine) main.appendChild(makeMainBtn_("加 LINE / 聯繫", bestLine));

  const bestWeb = medias.length ? normalizeUrl_(medias[0]) : (socials.length ? normalizeUrl_(socials[0]) : "");
  if (bestWeb) main.appendChild(makeMainBtn_("前往官網 / 作品", bestWeb));

  // IMPORTANT: only one form CTA should exist on facade (v385).
  // Here we provide "fill form" inside contact box (not duplicated on facade).
  // If you want "ONLY facade CTA", set data attribute on body to disable inner button.
  if (!document.body.hasAttribute("data-disable-inner-form")) {
    main.appendChild(makeMainBtn_("填寫預約表單", () => window.open(CONFIG.FORM, "_blank")));
  }

  if (wechat) main.appendChild(makeMainBtn_("微信（複製）", () => copyText_(wechat)));

  // chips
  if (phone) {
    const t = normalizeTel_(phone);
    if (t) sub.appendChild(makeChip_(t, "tel:" + t));
  }
  if (email) {
    const e = normalizeEmail_(email);
    if (e) sub.appendChild(makeChip_(e, "mailto:" + e));
  }
  if (addr) {
    const a = text(addr);
    const maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a);
    sub.appendChild(makeChip_("地址導航", maps));
  }

  // Extra links
  const extra = [];
  for (let i = 0; i < medias.length; i++) extra.push([`影音${i + 1}`, medias[i]]);
  for (let i = 0; i < socials.length; i++) extra.push([`社群${i + 1}`, socials[i]]);

  for (const [label, v] of extra) {
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

/* ---------------------------
Avatar + core fields
--------------------------- */
function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;
  const cands = buildImageCandidates_(url);
  if (!cands.length) { img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

/* ---------------------------
Auto inject blocks: Title/Slogan/Experience
--------------------------- */
function ensureBox_(boxId, titleText) {
  const scroll = q(".info-scroll") || $("card-container") || q(".card") || document.body;
  let box = $(boxId);
  if (!box) {
    box = document.createElement("div");
    box.id = boxId;
    box.className = "content-box";

    const t = document.createElement("div");
    t.className = "box-title";
    t.textContent = titleText;

    const body = document.createElement("div");
    body.id = boxId + "_body";
    body.style.whiteSpace = "pre-line";
    body.style.fontWeight = "900";
    body.style.lineHeight = "1.7";

    box.appendChild(t);
    box.appendChild(body);
    scroll.appendChild(box);
  }
  return box;
}

function setBox_(boxId, titleText, value) {
  const v = text(value);
  const box = $(boxId);
  if (!v) {
    if (box) box.style.display = "none";
    return;
  }
  const b = ensureBox_(boxId, titleText);
  b.style.display = "block";
  setText(boxId + "_body", v);
}

/* ---------------------------
Apply all data to card
--------------------------- */
function applyDataToCard(payloadNorm) {
  // core
  const name = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const title = pick(payloadNorm, ["頭銜", "職稱", "title", "Title"]);
  const slogan = pick(payloadNorm, ["理念標語", "標語", "slogan", "tagline"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);
  const exp = pick(payloadNorm, ["經歷", "學經歷", "experience", "Experience"]);

  // images
  const avatar =
    pick(payloadNorm, ["個人照_fast", "個人照", "形象照_fast", "形象照"]) ||
    pickByHeaderRegex_(payloadNorm, [/個人照/i, /形象照/i, /avatar/i]);

  const logo =
    pick(payloadNorm, ["Logo_fast", "Logo", "logo", "LOGO"]) ||
    pickByHeaderRegex_(payloadNorm, [/logo/i, /標誌/i]);

  const photos = getPhotosArray_(payloadNorm);

  // write: keep v385 target ids
  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  setAvatarImage(avatar);

  // inject blocks
  setBox_("boxTitle", "頭銜", title);
  setBox_("boxSlogan", "理念標語", slogan);
  setBox_("boxExp", "經歷", exp);

  // contacts + photos
  renderContacts_(payloadNorm);
  __gallery.list = photos;
  renderPhotoWall_(photos);

  // logo inject (top-right)
  if (logo) {
    const logoEl = ensureLogoDom_();
    if (logoEl) setImgWithFallback_(logoEl, buildImageCandidates_(logo));
  }

  // plan buttons sync
  syncPlanButtons_();
  refreshPremiumSafety_();
}

/* --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

/* ---------------------------
Loading / Fail UI
--------------------------- */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端內容...");
}

function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認網址 ?id=TW000X 或檢查 GAS 權限");
  setText("u-service", "");
  const img = $("u-img");
  if (img) img.removeAttribute("src");

  if ($("photoWall")) $("photoWall").style.display = "none";
  if ($("photoWallGrid")) $("photoWallGrid").innerHTML = "";

  if ($("contactMain")) $("contactMain").innerHTML = "";
  if ($("contactSub")) $("contactSub").innerHTML = "";
}

/* ---------------------------
Load data
--------------------------- */
async function loadData_() {
  const id = getCardId();
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  __lastLoad = { id, ts: Date.now(), url };

  await waitForDom_(["u-name", "u-unit", "u-service"], CONFIG.DOM_WAIT_MS);
  setLoadingUi_();

  log_("loadData start:", { id });

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    applyDataToCard(__payload);

    // mobile re-apply
    await sleep(180);
    applyDataToCard(__payload);

    log_("loadData success:", {
      id,
      keys: Object.keys(data).length,
      photos: (__gallery.list || []).length
    });
  } catch (e) {
    err_("雲端同步異常:", e);
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
  }
}

/* ===========================
Hidden Admin Entry (long-press footer/version tag)
=========================== */
function bindAdminLongPress_() {
  // Prefer version-tag (most invisible), else footer
  const target = q(".version-tag") || q("#versionTag") || q("footer") || null;
  if (!target) return;

  let timer = null;
  let fired = false;

  const start = (e) => {
    fired = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fired = true;
      const id = getCardId();
      const u = `admin.html?id=${encodeURIComponent(id)}`;
      window.open(u, "_blank");
    }, CONFIG.ADMIN_LONGPRESS_MS);
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

  // Avoid accidental click actions if long-pressed
  target.addEventListener("click", (e) => {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  try { applyV382(); } catch {}
  try { syncPlanButtons_(); } catch {}
  try { bindAdminLongPress_(); } catch {}
  try { loadData_(); } catch (e) { err_("boot loadData error:", e); }
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => {
  // If DOMContentLoaded missed (rare), re-run once
  if (!__lastLoad.ts) boot_();
});