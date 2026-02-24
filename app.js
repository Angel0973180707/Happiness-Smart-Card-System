/* app.js (V386.2 complete overwrite)
 * FIX: keep original facade (controls) + sample preview co-exist
 * FIX: photo wall is mounted INSIDE card (before version tag), not before card
 * NEW: sample preview (mini card) auto-mount under admin panel if missing
 * - mirrors current card DOM (cloned + scaled) so user always sees "成品名片形式"
 * - updates on plan/theme/style/paper change + after data loaded
 */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 10000,
  RETRY: 2,

  // gallery
  GALLERY_MAX: 12,
  THUMB_MIN_COL: 3,
  THUMB_MAX_COL: 4,

  DOM_WAIT_MS: 2600,
  DOM_POLL_MS: 80,

  DEBUG: true,

  // sample preview
  SAMPLE_SCALE: 0.32,          // ✅ 樣品縮放比例（可調）
  SAMPLE_MAX_W: 820,
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

function setText(id, v) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function nowIso_() { try { return new Date().toISOString(); } catch { return String(Date.now()); } }

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
 * Existing switching system
 * --------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
  applyPlanSplitUi_();
  updatePlanButtonsActive_();

  // ✅ keep sample preview updated
  scheduleSampleSync_();
};

window.setV382Style = function (style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
  scheduleSampleSync_();
};

window.setV382Paper = function (paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
  scheduleSampleSync_();
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

/* --------------------------- */
async function waitForDom_(ids, timeoutMs = CONFIG.DOM_WAIT_MS) {
  const need = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    let ok = true;
    for (const id of need) {
      if (!$(id)) { ok = false; break; }
    }
    if (ok) return true;
    await sleep(CONFIG.DOM_POLL_MS);
  }
  return false;
}

function coreUiReady_() {
  return !!$("u-name") && !!$("u-unit") && !!$("u-service");
}

/* ---------------------------
 * Fetch (NO custom headers => avoid CORS preflight)
 * --------------------------- */
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
      await sleep(450 + i * 450);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
 * Key normalize
 * --------------------------- */
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
 * Image helpers
 * --------------------------- */
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
  tryNext();
}

function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;

  const cands = buildImageCandidates_(url);
  if (!cands.length) {
    img.removeAttribute("src");
    return;
  }

  img.style.opacity = "0";
  img.style.transition = "opacity 420ms ease";
  setImgWithFallback_(img, cands);
}

/* ---------------------------
 * Photos parsing + auto detect
 * --------------------------- */
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
    const kk = String(k);
    if (!/(照片|相片|作品|圖|照|photo|image|img)/i.test(kk)) continue;

    const v = payload[k];
    const parts = splitLinks_(v);
    for (const p of parts) {
      if (/^https?:\/\//i.test(p)) out.push(p);
    }
  }

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
    pick(payload, ["photos_img"]) ||
    pick(payload, ["照片_fast", "照片_fast "]) ||
    payload.photos ||
    pick(payload, ["photos"]) ||
    pick(payload, ["照片"]);

  const base = splitLinks_(v)
    .filter(Boolean)
    .map(u => normalizeImageUrl(u))
    .filter(Boolean);

  const auto = base.length ? [] : autoDetectPhotos_(payload);
  return (base.length ? base : auto).slice(0, CONFIG.GALLERY_MAX);
}

/* ===========================
 * Plan selector UI (inject)
 * =========================== */
function ensurePlanSelectorUi_() {
  const panel = $("admin-panel");
  if (!panel) return;
  if ($("plan-selector")) return;

  const wrap = document.createElement("div");
  wrap.id = "plan-selector";
  wrap.className = "step-card";
  wrap.innerHTML = `
    <div class="step-title">第一步：先選方案</div>
    <div class="step-actions">
      <button id="btnPlanFree" class="btn-neo pill">自由搭配款</button>
      <button id="btnPlanPremium" class="btn-neo pill">精品設計款</button>
    </div>
    <div class="step-hint">選了方案後，才會出現對應的顏色／版型／紙感</div>
  `;

  // Insert to top
  panel.insertBefore(wrap, panel.firstChild);

  $("btnPlanFree").addEventListener("click", () => {
    state.mode = "free";
    if (!state.theme || !String(state.theme).startsWith("color-")) state.theme = "color-1";
    applyV382();
    applyPlanSplitUi_();
    updatePlanButtonsActive_();
    scheduleSampleSync_();
    try { $("free-controls")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch {}
  });

  $("btnPlanPremium").addEventListener("click", () => {
    state.mode = "premium";
    if (!state.theme || !String(state.theme).startsWith("p")) state.theme = "p1";
    applyV382();
    applyPlanSplitUi_();
    updatePlanButtonsActive_();
    scheduleSampleSync_();
  });

  updatePlanButtonsActive_();
}

function updatePlanButtonsActive_() {
  const a = $("btnPlanFree");
  const b = $("btnPlanPremium");
  if (!a || !b) return;

  a.classList.toggle("active", state.mode === "free");
  b.classList.toggle("active", state.mode !== "free");
}

/* keep original controls co-exist */
function applyPlanSplitUi_() {
  const panel = $("admin-panel");
  if (!panel) return;

  const rows = qa(".dots-row", panel);
  const freeDotsRow = $("rowFreeDots") || rows[0] || null;
  const premiumDotsRow = $("rowPremiumDots") || rows[1] || null;

  const freeControls = $("free-controls");
  const isFree = state.mode === "free";

  if (freeDotsRow) freeDotsRow.style.display = isFree ? "flex" : "none";
  if (premiumDotsRow) premiumDotsRow.style.display = isFree ? "none" : "flex";
  if (freeControls) freeControls.style.display = isFree ? "block" : "none";
}

/* ===========================
 * Lightbox (original view)
 * =========================== */
function ensureLightbox_() {
  if ($("imgLightbox")) return;

  const overlay = document.createElement("div");
  overlay.id = "imgLightbox";
  overlay.className = "img-lightbox";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <div class="img-lightbox-inner" role="dialog" aria-modal="true" aria-label="原圖檢視">
      <img id="imgLightboxImg" alt="原圖" />
      <button id="imgLightboxClose" type="button" aria-label="關閉">×</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const hide = () => {
    overlay.style.display = "none";
    const img = $("imgLightboxImg");
    if (img) img.removeAttribute("src");
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hide();
  });
  $("imgLightboxClose").addEventListener("click", hide);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") hide();
  });
}

function openLightbox_(url) {
  ensureLightbox_();
  const overlay = $("imgLightbox");
  const img = $("imgLightboxImg");
  if (!overlay || !img) return;

  overlay.style.display = "flex";
  const cands = buildImageCandidates_(url);
  setImgWithFallback_(img, cands.length ? cands : [url]);
}

/* ===========================
 * Photo wall (mount INSIDE card)
 * =========================== */
function ensurePhotoWallDom_() {
  if (__gallery.inited) return;

  const card = $("card-container");
  if (!card) return;

  const scroll = card.querySelector(".info-scroll") || card;
  const vtag = scroll.querySelector(".version-tag");

  const wrap = document.createElement("section");
  wrap.id = "photoWall";
  wrap.className = "photo-wall";
  wrap.style.display = "none";

  wrap.innerHTML = `
    <div class="photo-wall-head">照片作品（點一下看原圖）</div>
    <div id="photoWallGrid" class="photo-wall-grid"></div>
  `;

  if (vtag && vtag.parentElement) vtag.parentElement.insertBefore(wrap, vtag);
  else scroll.appendChild(wrap);

  const grid = $("photoWallGrid");

  const setCols = () => {
    const w = Math.min(window.innerWidth, 520);
    const cols = w >= 420 ? CONFIG.THUMB_MAX_COL : CONFIG.THUMB_MIN_COL;
    if (grid) grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
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
    const item = document.createElement("button");
    item.type = "button";
    item.className = "photo-thumb";
    item.setAttribute("aria-label", "點擊查看原圖");

    const img = document.createElement("img");
    img.alt = "縮圖";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    setImgWithFallback_(img, buildImageCandidates_(u));

    item.addEventListener("click", () => openLightbox_(u));

    item.appendChild(img);
    grid.appendChild(item);
  }
}

/* ===========================
 * Contact section (inject)
 * =========================== */
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
  return "https://" + s;
}

function makeBtn_(label, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn-cta mini";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}
function makeChip_(label, url) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "chip";
  return a;
}

function ensureContactDom_() {
  const scroll = q(".info-scroll");
  if (!scroll) return null;
  if ($("contactBox")) return $("contactBox");

  const box = document.createElement("div");
  box.id = "contactBox";
  box.className = "content-box";

  box.innerHTML = `
    <div class="box-title">聯繫方式</div>
    <div id="contactMain" class="contact-main"></div>
    <div id="contactSub" class="contact-sub"></div>
  `;

  const serviceBox = scroll.querySelector("#u-service")?.closest(".content-box");
  if (serviceBox && serviceBox.nextSibling) scroll.insertBefore(box, serviceBox.nextSibling);
  else scroll.appendChild(box);

  return box;
}

function renderContacts_(payloadNorm) {
  const box = ensureContactDom_();
  if (!box) return;

  const main = $("contactMain");
  const sub = $("contactSub");
  if (!main || !sub) return;

  main.innerHTML = "";
  sub.innerHTML = "";

  const line = pick(payloadNorm, ["LINE 官方帳號", "line_oa", "line", "LINE", "Line"]);
  const web = pick(payloadNorm, ["官網", "網站", "website", "web", "url", "網址"]);
  const phone = pick(payloadNorm, ["電話", "手機", "phone", "tel", "mobile"]);
  const email = pick(payloadNorm, ["Email", "email", "信箱", "e-mail"]);
  const youtube = pick(payloadNorm, ["YouTube", "youtube"]);
  const ig = pick(payloadNorm, ["IG", "Instagram", "instagram", "insta"]);
  const fb = pick(payloadNorm, ["FB", "Facebook", "facebook"]);
  const wechat = pick(payloadNorm, ["微信", "wechat", "WeChat"]);

  if (line) {
    const u = normalizeUrl_(line);
    main.appendChild(makeBtn_("加 LINE 官方帳號", () => window.open(u, "_blank")));
  }
  if (web) {
    const u = normalizeUrl_(web);
    main.appendChild(makeBtn_("前往官網 / 預約", () => window.open(u, "_blank")));
  }
  main.appendChild(makeBtn_("填寫預約表單", () => window.open(CONFIG.FORM, "_blank")));

  if (phone) {
    const t = normalizeTel_(phone);
    if (t) sub.appendChild(makeChip_("電話：" + t, "tel:" + t));
  }
  if (email) {
    const e = normalizeEmail_(email);
    if (e) sub.appendChild(makeChip_("Email：" + e, "mailto:" + e));
  }
  if (youtube) sub.appendChild(makeChip_("YouTube", normalizeUrl_(youtube)));
  if (ig) sub.appendChild(makeChip_("IG", normalizeUrl_(ig)));
  if (fb) sub.appendChild(makeChip_("FB", normalizeUrl_(fb)));

  if (wechat) {
    const w = text(wechat);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = "WeChat（點我複製）";
    chip.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(w);
        alert("已複製微信資訊：" + w);
      } catch {
        prompt("請複製微信資訊：", w);
      }
    });
    sub.appendChild(chip);
  }
}

/* ===========================
 * ✅ Sample preview (keep facade + sample co-exist)
 * =========================== */

let __sampleSyncTimer = null;

function scheduleSampleSync_() {
  if (__sampleSyncTimer) clearTimeout(__sampleSyncTimer);
  __sampleSyncTimer = setTimeout(() => {
    __sampleSyncTimer = null;
    try { syncSamplePreview_(); } catch {}
  }, 80);
}

function findSampleHost_() {
  // ✅ If you already have a sample zone in HTML, we DO NOT remove it.
  // We just use it.
  return (
    $("sample-area") ||
    $("sample-preview") ||
    $("samplePanel") ||
    q('[data-role="sample"]') ||
    null
  );
}

function ensureSampleHost_() {
  let host = findSampleHost_();
  if (host) return host;

  // ✅ If missing, create one under admin-panel (so "樣品區" never disappears)
  const panel = $("admin-panel");
  if (!panel) return null;

  host = document.createElement("section");
  host.id = "samplePanel";
  host.className = "sample-panel";
  host.style.maxWidth = CONFIG.SAMPLE_MAX_W + "px";
  host.style.margin = "10px auto 0";
  host.style.padding = "0 12px 12px";

  host.innerHTML = `
    <div class="step-card">
      <div class="step-title">樣品預覽（會跟著你切換外觀）</div>
      <div id="sampleMount" class="sample-mount"></div>
    </div>
  `;

  panel.appendChild(host);
  return host;
}

function syncSamplePreview_() {
  const host = ensureSampleHost_();
  if (!host) return;

  // decide mount node
  const mount = $("sampleMount") || q(".sample-mount", host) || host;

  const card = $("card-container");
  if (!card) return;

  // Remove old clone (only inside our mount)
  const old = q(".sample-clone", mount);
  if (old) old.remove();

  // Clone card
  const clone = card.cloneNode(true);
  clone.classList.add("sample-clone");
  clone.removeAttribute("id");

  // Ensure it reflects current body classes (theme/style/paper)
  // We simulate by applying same classes to clone root
  // (CSS uses body selectors, but clone still gets styling from global body;
  //  scaling only)
  clone.style.transform = `scale(${CONFIG.SAMPLE_SCALE})`;
  clone.style.transformOrigin = "top center";
  clone.style.pointerEvents = "none"; // sample = view only
  clone.style.margin = "0 auto";
  clone.style.height = "auto";

  // put in a fixed-height wrapper so it won't collapse
  const wrapper = document.createElement("div");
  wrapper.className = "sample-wrapper";
  wrapper.style.width = "100%";
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "center";
  wrapper.style.overflow = "hidden";
  wrapper.style.paddingTop = "6px";

  // Estimate height: card height * scale + padding
  const rect = card.getBoundingClientRect();
  const estH = Math.max(180, Math.round(rect.height * CONFIG.SAMPLE_SCALE) + 18);
  wrapper.style.height = estH + "px";

  wrapper.appendChild(clone);

  // replace mount content (but DO NOT destroy other existing content outside mount)
  mount.innerHTML = "";
  mount.appendChild(wrapper);
}

/* ---------------------------
 * Apply data to card
 * --------------------------- */
function applyDataToCard(payloadNorm) {
  const name = pick(payloadNorm, ["姓名（名片大標題）", "姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位名稱（如：幸福教養概念館）", "單位名稱", "單位", "unit", "Unit"]);
  const service = pick(payloadNorm, ["服務項目（核心業務，多項可條列換行）", "服務項目", "service", "Service"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  const avatar = pick(payloadNorm, ["avatar_img", "個人照_fast", "個人照", "形象照", "avatar", "photo", "image"]);
  setAvatarImage(avatar);

  const photos = getPhotosArray_(payloadNorm);
  __gallery.list = photos;
  renderPhotoWall_(photos);

  renderContacts_(payloadNorm);

  // ✅ after applying data, keep sample in sync
  scheduleSampleSync_();
}

/* --------------------------- */
window.openOrderHelp = function () {
  const modal = $("orderHelpModal");
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};
window.closeOrderHelp = function () {
  const modal = $("orderHelpModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
};
document.addEventListener("click", (e) => {
  const modal = $("orderHelpModal");
  if (!modal) return;
  if (e.target === modal) window.closeOrderHelp();
});

/* --------------------------- */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端服務項目...");
}
function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請確認網址 ?id=TW000X 或檢查 GAS 權限");
  setText("u-service", "");
  setAvatarImage("");

  $("photoWall") && ($("photoWall").style.display = "none");
  $("photoWallGrid") && ($("photoWallGrid").innerHTML = "");
  $("contactMain") && ($("contactMain").innerHTML = "");
  $("contactSub") && ($("contactSub").innerHTML = "");

  scheduleSampleSync_();
}

async function loadData() {
  const id = getCardId();
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  __lastLoad = { id, ts: Date.now(), url };

  await waitForDom_(["u-name", "u-unit", "u-service"], CONFIG.DOM_WAIT_MS);
  setLoadingUi_();

  log_("loadData start:", { id, time: nowIso_() });

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    applyDataToCard(__payload);

    // mobile re-apply
    await sleep(140);
    const n = text($("u-name") ? $("u-name").textContent : "");
    if (!coreUiReady_() || n === "載入中..." || n === "（同步失敗）") {
      await waitForDom_(["u-name", "u-unit", "u-service"], CONFIG.DOM_WAIT_MS);
      applyDataToCard(__payload);
    }

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

/* --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

function boot_() {
  try { applyV382(); } catch {}
  try {
    ensurePlanSelectorUi_();  // ✅ plan buttons
    applyPlanSplitUi_();      // ✅ split
    updatePlanButtonsActive_();
  } catch {}

  // ✅ ensure sample exists even before data loads
  scheduleSampleSync_();

  try { loadData(); } catch (e) { err_("boot loadData error:", e); }
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => {
  if (!__lastLoad.ts) boot_();
});