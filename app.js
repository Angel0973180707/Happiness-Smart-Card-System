/* ================================
 * Happiness Smart Card System — app.js (v400 COMPLETE OVERWRITE) 1/3
 * ✅ NEW API GAS
 * ✅ Keep v382 hooks: setV382 / setV382Style / setV382Paper
 * ✅ Robust loader + normalize keys + pick()
 * ✅ Share API: window.copyCardUrl()
 * ✅ Hidden admin hotspot: #adminHotspotTop triple tap -> admin.html?id=...
 * ✅ NEW v400: SocialBox separated from ContactDock
 * ================================ */

const CONFIG = {
  VERSION: "400",
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

/* --------------------------- DOM helpers --------------------------- */
function $(id) { return document.getElementById(id); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v400]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v400]", ...arguments); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* --------------------------- URL helpers --------------------------- */
function getParam_(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return ""; }
}
function normalizeId_(s) {
  const v = text(s).toUpperCase();
  if (!v) return "";
  if (/^TW\d{4}$/.test(v)) return v;
  if (/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if (/^TW\d{1,4}$/.test(v)) return "TW" + v.replace(/^TW/i, "").padStart(4, "0");
  return v;
}
function getCardIdFromUrl_() {
  return normalizeId_(getParam_("id")) || CONFIG.DEFAULT_ID;
}
function ensureHttp_(u) {
  let v = text(u);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("www.")) return "https://" + v;
  return v;
}
function isUrl_(s) {
  const v = text(s);
  return /^https?:\/\//i.test(v) || v.startsWith("www.");
}

/* --------------------------- v382 Hooks --------------------------- */
function toggleDotsRows_() {
  const freeRow = $("freeDotsRow");
  const premiumRow = $("premiumDotsRow");
  const isFree = state.mode === "free";
  if (freeRow) freeRow.style.display = isFree ? "flex" : "none";
  if (premiumRow) premiumRow.style.display = isFree ? "none" : "flex";
}
function syncPlanButtons_() {
  const a = $("btnPlanFree");
  const b = $("btnPlanPremium");
  if (!a || !b) return;
  if (state.mode === "free") {
    a.classList.add("active"); b.classList.remove("active");
  } else {
    b.classList.add("active"); a.classList.remove("active");
  }
}
function applyV382_() {
  const isFree = state.mode === "free";
  const freeControls = $("free-controls");
  if (freeControls) freeControls.style.display = isFree ? "block" : "none";

  toggleDotsRows_();
  syncPlanButtons_();

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ].filter(Boolean).join(" ");

  document.body.className = classList;

  // ✅ premium safety marker (for CSS selectors if needed)
  document.body.classList.toggle("is-premium", state.mode === "premium");
}

window.setV382 = function (mode, theme, el) {
  state.mode = (mode === "premium") ? "premium" : "free";
  state.theme = text(theme) || (state.mode === "free" ? "color-1" : "p1");

  // active dot highlight
  qa(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  applyV382_();
};

window.setV382Style = function (style, el) {
  state.style = text(style) || "arch";
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.setV382Paper = function (paper, el) {
  state.paper = text(paper) || "paper-1";
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

/* --------------------------- share + form --------------------------- */
function toast_(msg) {
  const m = text(msg);
  if (!m) return;
  let t = $("__toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "__toast";
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "18px";
    t.style.transform = "translateX(-50%)";
    t.style.background = "rgba(0,0,0,0.78)";
    t.style.color = "#fff";
    t.style.padding = "10px 14px";
    t.style.borderRadius = "999px";
    t.style.fontSize = "13px";
    t.style.fontWeight = "800";
    t.style.zIndex = "99999";
    t.style.opacity = "0";
    t.style.transition = "opacity 180ms ease";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.style.opacity = "1";
  clearTimeout(toast_._timer);
  toast_._timer = setTimeout(() => { t.style.opacity = "0"; }, 1100);
}

async function copyText_(s) {
  const v = text(s);
  if (!v) return false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(v);
      toast_("已複製");
      return true;
    }
  } catch {}

  try {
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
    toast_("已複製");
    return true;
  } catch {}

  toast_("無法自動複製");
  alert(v);
  return false;
}

window.copyCardUrl = async function () {
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  let url = "";
  try {
    const u = new URL(location.href);
    u.searchParams.set("id", id);
    url = u.toString();
  } catch {
    url = `${location.origin}${location.pathname}?id=${encodeURIComponent(id)}`;
  }
  return copyText_(url);
};

window.goFillForm = function () {
  const url = CONFIG.FORM || "";
  if (url) window.open(url, "_blank");
};

/* ---------------------------
Normalize keys + pick()
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
  const lower = Object.create(null);

  for (const k of Object.keys(obj)) {
    const nk = cleanKey_(k);
    if (!nk) continue;
    const v = obj[k];

    if (out[nk] == null || text(out[nk]) === "") out[nk] = v;

    const lk = nk.toLowerCase();
    if (lower[lk] == null || text(lower[lk]) === "") lower[lk] = v;
  }
  out.__lower = lower;
  return out;
}

function pick_(payloadNorm, keys) {
  if (!payloadNorm) return "";
  const lower = payloadNorm.__lower || null;
  const raw = payloadNorm.__raw || null;

  for (const k of keys) {
    if (k == null) continue;
    const kk = cleanKey_(k);

    const v1 = payloadNorm[kk];
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
      warn_("fetch retry:", i, e && e.message ? e.message : e);
      await sleep(520 + i * 520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}/* ================================
 * Happiness Smart Card System — app.js (v400 COMPLETE OVERWRITE) 2/3
 * - Images: avatar/logo/photo wall (fallback candidates)
 * - ✅ ContactDock: 動作型(電話/Email/導航/LINE/微信ID複製)
 * - ✅ SocialBox: 展示型(影音/社群/個人網頁)
 * ================================ */

/* ---------------------------
Image helpers
--------------------------- */
function normalizeImageUrl_(raw) {
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
  const s = text(raw);
  if (!s) return [];
  const original = s.startsWith("http://") ? "https://" + s.slice(7) : s;

  if (original.includes("dropbox.com")) return [normalizeImageUrl_(original)];

  let driveId = "";
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const mId = original.match(/(?:\?|&)id=([^&]+)/i);
  const mThumb = original.match(/thumbnail\?id=([^&]+)/i);
  if (mFile && mFile[1]) driveId = mFile[1];
  else if (mId && mId[1]) driveId = mId[1];
  else if (mThumb && mThumb[1]) driveId = mThumb[1];

  if (driveId) {
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
      normalizeImageUrl_(original)
    ].filter(Boolean);
  }

  return [normalizeImageUrl_(original)].filter(Boolean);
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
Avatar / Logo / PhotoWall
--------------------------- */
function setAvatarImage_(payloadNorm) {
  const img = $("u-img");
  if (!img) return;

  const raw = pick_(payloadNorm, [
    "個人照_fast", "個人照",
    "形象照_fast", "形象照",
    "avatar_fast", "avatar_img", "avatar",
    "photo_fast", "photo",
    "image"
  ]);

  const cands = buildImageCandidates_(raw);
  if (!cands.length) { img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function setLogo_(payloadNorm) {
  const wrap = $("logoWrap");
  const img = $("u-logo");
  if (!wrap || !img) return;

  const raw = pick_(payloadNorm, [
    "Logo_fast", "logo_fast",
    "Logo", "logo",
    "品牌logo_fast", "品牌logo",
    "公司logo_fast", "公司logo",
    "LOGO_fast", "LOGO"
  ]);

  const cands = buildImageCandidates_(raw);

  if (!cands.length) {
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }

  wrap.style.display = "";
  img.style.width = "42px";
  img.style.height = "42px";
  img.style.borderRadius = "999px";
  img.style.objectFit = "cover";

  setImgWithFallback_(img, cands);
}

function splitPhotoList_(raw) {
  const s = text(raw);
  if (!s) return [];
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[,，;；]+/g, "\n")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
}

function collectPhotoUrls_(payloadNorm) {
  const urls = [];

  const main = pick_(payloadNorm, [
    "照片_fast", "照片",
    "photos", "photos_img", "photos_full",
    "照片牆", "相片牆", "圖片", "相簿"
  ]);

  if (Array.isArray(main)) {
    urls.push(...main.map(x => text(x)).filter(Boolean));
  } else {
    urls.push(...splitPhotoList_(main));
  }

  for (let i = 1; i <= CONFIG.PHOTO_SLOT_MAX; i++) {
    urls.push(...splitPhotoList_(payloadNorm[`照片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`圖片${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`photo${i}`]));
    urls.push(...splitPhotoList_(payloadNorm[`image${i}`]));
  }

  const out = [];
  const seen = new Set();
  for (const raw of urls) {
    const r = text(raw);
    if (!r) continue;
    const norm = normalizeImageUrl_(r);
    const key = norm || r;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function renderPhotoWall_(payloadNorm) {
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if (!wall || !grid) return;

  grid.innerHTML = "";
  const list = collectPhotoUrls_(payloadNorm);

  if (!list.length) {
    wall.style.display = "none";
    return;
  }
  wall.style.display = "";

  for (const raw of list) {
    const img = document.createElement("img");
    img.alt = "照片";
    img.style.cursor = "pointer";

    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands);

    const openUrl = normalizeImageUrl_(raw) || ensureHttp_(raw) || raw;
    img.addEventListener("click", () => window.open(openUrl, "_blank"));
    grid.appendChild(img);
  }
}

/* ---------------------------
Buttons (Dock/Social) helpers
--------------------------- */
function iconFor_(type) {
  const t = String(type || "").toLowerCase();
  if (t === "phone") return "fa-solid fa-phone";
  if (t === "email") return "fa-solid fa-envelope";
  if (t === "web") return "fa-solid fa-globe";
  if (t === "map") return "fa-solid fa-location-dot";
  if (t === "line") return "fa-brands fa-line";
  if (t === "wechat") return "fa-brands fa-weixin";
  if (t === "video") return "fa-solid fa-circle-play";
  if (t === "social") return "fa-solid fa-users";
  return "fa-solid fa-link";
}

function addBtn_(wrap, label, hrefOrFn, iconClass, className) {
  if (!wrap) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className || "dock-btn";
  btn.style.flex = "1 1 0";
  btn.style.minWidth = "118px";

  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;

  if (typeof hrefOrFn === "function") {
    btn.addEventListener("click", hrefOrFn);
  } else {
    const href = text(hrefOrFn);
    if (!href) return;
    btn.addEventListener("click", () => window.open(href, "_blank"));
  }

  wrap.appendChild(btn);
}

function normalizePhone_(s) {
  const v = text(s);
  return v ? v.replace(/[^\d+]/g, "") : "";
}

/* ---------------------------
✅ ContactDock：動作型（不要混雜影音社群）
--------------------------- */
function renderContactDock_(payloadNorm) {
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if (!wrap || !dock) return;

  wrap.innerHTML = "";

  const phone = pick_(payloadNorm, ["電話", "手機", "phone", "mobile", "tel"]);
  const email = pick_(payloadNorm, ["Email", "email", "E-mail", "信箱", "mail"]);
  const addr  = pick_(payloadNorm, ["地址", "address", "所在地", "location"]);

  const lineOfficial = pick_(payloadNorm, [
    "LINE官方帳號", "line官方帳號", "line官方", "line官網", "line官網預約",
    "line_oa", "line oa", "LINE_OA", "LINE OA", "Line OA"
  ]);
  const lineId = pick_(payloadNorm, ["line", "line_id", "Line", "LINE"]);

  const wechat = pick_(payloadNorm, ["微信", "wechat", "weixin", "微信號", "weixin_id", "wx", "wxid"]);

  const lo = ensureHttp_(lineOfficial);
  if (lo && /^https?:\/\//i.test(lo)) addBtn_(wrap, "LINE官網", lo, iconFor_("line"), "dock-btn");

  const li = text(lineId);
  if (li) {
    const href = isUrl_(li) ? ensureHttp_(li) : `https://line.me/R/ti/p/${encodeURIComponent(li)}`;
    addBtn_(wrap, "LINE", href, iconFor_("line"), "dock-btn");
  }

  const wx = text(wechat);
  if (wx) {
    if (isUrl_(wx)) {
      addBtn_(wrap, "微信", ensureHttp_(wx), iconFor_("wechat"), "dock-btn");
    } else {
      addBtn_(wrap, "微信ID", async () => {
        await copyText_(wx);
        toast_("微信ID已複製");
      }, iconFor_("wechat"), "dock-btn");
    }
  }

  const p = normalizePhone_(phone);
  if (p) addBtn_(wrap, "電話", `tel:${p}`, iconFor_("phone"), "dock-btn");

  const em = text(email);
  if (em) addBtn_(wrap, "Email", `mailto:${encodeURIComponent(em)}`, iconFor_("email"), "dock-btn");

  const a = text(addr);
  if (a) addBtn_(wrap, "導航", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`, iconFor_("map"), "dock-btn");

  dock.style.display = wrap.children.length ? "" : "none";
}

/* ---------------------------
✅ SocialBox：展示型（影音/社群/個人網頁）
- 使用 index.html 的 #socialBox / #socialButtons
--------------------------- */
function renderSocialBox_(payloadNorm) {
  const box = $("socialBox");
  const wrap = $("socialButtons");
  if (!box || !wrap) return;

  wrap.innerHTML = "";

  const web = pick_(payloadNorm, ["網站", "官網", "website", "url", "link"]);

  const video1 = pick_(payloadNorm, ["影音平台1"]);
  const video2 = pick_(payloadNorm, ["影音平台2"]);
  const video3 = pick_(payloadNorm, ["影音平台3"]);
  const soc1   = pick_(payloadNorm, ["社群平台1"]);
  const soc2   = pick_(payloadNorm, ["社群平台2"]);
  const soc3   = pick_(payloadNorm, ["社群平台3"]);

  const addLinkBtn = (label, value, kind) => {
    const v = text(value);
    if (!v) return;
    const href = isUrl_(v) ? ensureHttp_(v) : `https://www.google.com/search?q=${encodeURIComponent(v)}`;
    addBtn_(wrap, label, href, iconFor_(kind), "dock-btn");
  };

  const w = ensureHttp_(web);
  if (w && /^https?:\/\//i.test(w)) addLinkBtn("個人網頁", w, "web");

  [video1, video2, video3].map(text).filter(Boolean)
    .forEach((v, i) => addLinkBtn(`影音${i + 1}`, v, "video"));

  [soc1, soc2, soc3].map(text).filter(Boolean)
    .forEach((v, i) => addLinkBtn(`社群${i + 1}`, v, "social"));

  box.style.display = wrap.children.length ? "" : "none";
}/* ================================
 * Happiness Smart Card System — app.js (v400 COMPLETE OVERWRITE) 3/3
 * - Apply data to card
 * - Robust loadCardById_()
 * - Admin hotspot triple tap
 * - Boot
 * ================================ */

function escapeHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBlock_(rootId, title, body) {
  const root = $(rootId);
  if (!root) return;

  const b = text(body);
  if (!b) {
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

/* ✅ v400：精品姓名顯示修正
   - 永遠用 textContent
   - 加 class 讓 CSS 可選擇性避開 absolute 版本 */
function setNameSafe_(nameEl, value) {
  if (!nameEl) return;
  nameEl.textContent = text(value) || "（尚未讀到姓名）";
  nameEl.classList.add("name-safe");
}

function applyDataToCard_(payloadNorm) {
  const name    = pick_(payloadNorm, ["姓名", "name", "Name"]);
  const unit    = pick_(payloadNorm, ["單位", "unit", "Unit"]);
  const title   = pick_(payloadNorm, ["頭銜", "職稱", "title", "Title"]);
  const slogan  = pick_(payloadNorm, ["理念", "標語", "slogan", "Slogan"]);
  const service = pick_(payloadNorm, ["服務項目", "service", "Service"]);
  const exp     = pick_(payloadNorm, ["經歷", "experience", "Experience", "簡歷", "履歷"]);

  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl= $("u-title");

  setNameSafe_(nameEl, name);
  if (unitEl)  unitEl.textContent  = text(unit) || "";
  if (titleEl) titleEl.textContent = text(title) || "";

  const sl = $("u-slogan");
  if (sl) {
    const s = text(slogan);
    if (s) { sl.style.display = ""; sl.textContent = s; }
    else { sl.style.display = "none"; sl.textContent = ""; }
  }

  renderBlock_("block-service", "服務項目", service);
  renderBlock_("block-exp", "經歷", exp);

  // images + wall
  setAvatarImage_(payloadNorm);
  setLogo_(payloadNorm);
  renderPhotoWall_(payloadNorm);

  // ✅ 分流：SocialBox（展示） vs ContactDock（動作）
  renderSocialBox_(payloadNorm);
  renderContactDock_(payloadNorm);

  const vt = $("versionTag");
  if (vt) vt.textContent = "v" + CONFIG.VERSION;
}

function setLoadingUi_() {
  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl= $("u-title");
  if (nameEl) nameEl.textContent = "載入中...";
  if (unitEl) unitEl.textContent = "同步中...";
  if (titleEl) titleEl.textContent = "";

  const sl = $("u-slogan");
  if (sl) { sl.style.display = "none"; sl.textContent = ""; }

  const dock = $("contactDock");
  if (dock) dock.style.display = "none";

  const social = $("socialBox");
  if (social) social.style.display = "none";

  const wall = $("photoWall");
  if (wall) wall.style.display = "none";

  const wrap = $("logoWrap");
  if (wrap) wrap.style.display = "none";
}

function setFailUi_(msg) {
  const nameEl = $("u-name");
  const unitEl = $("u-unit");
  const titleEl= $("u-title");
  if (nameEl) nameEl.textContent = "（同步失敗）";
  if (unitEl) unitEl.textContent = text(msg) || "請確認 id 或 GAS 權限";
  if (titleEl) titleEl.textContent = "";

  const dock = $("contactDock");
  if (dock) dock.style.display = "none";

  const social = $("socialBox");
  if (social) social.style.display = "none";

  const wall = $("photoWall");
  if (wall) wall.style.display = "none";

  const wrap = $("logoWrap");
  if (wrap) wrap.style.display = "none";
}

/* ---------------------------
Load card (NEW API)
--------------------------- */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  __resolvedId = cid;
  setLoadingUi_();

  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try {
    const data = await fetchJsonRobust_(url);

    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");

    const payloadNorm = buildNormalizedPayload_(data);
    applyDataToCard_(payloadNorm);

    try {
      const u = new URL(location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    } catch {}

    return cid;
  } catch (e) {
    setFailUi_(e && e.message ? e.message : String(e));
  }
}

/* ---------------------------
Admin hotspot (top invisible div)
--------------------------- */
function bindAdminHotspot_() {
  const hs = $("adminHotspotTop");
  if (!hs) return;

  let tapCount = 0;
  let timer = null;

  hs.addEventListener("click", () => {
    tapCount++;
    clearTimeout(timer);
    timer = setTimeout(() => { tapCount = 0; }, CONFIG.ADMIN_TRIPLETAP_WINDOW_MS);

    if (tapCount >= CONFIG.ADMIN_TRIPLETAP_COUNT) {
      tapCount = 0;
      const id = __resolvedId || CONFIG.DEFAULT_ID;
      window.open(`admin.html?id=${encodeURIComponent(id)}`, "_blank");
    }
  }, { passive: true });
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  bindAdminHotspot_();
  applyV382_();
  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once: true });