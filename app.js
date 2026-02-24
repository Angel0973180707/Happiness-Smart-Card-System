/* ================================
Happiness Smart Card System
app.js (v391 FULL OVERWRITE)

v391 GOALS
- Homepage adds 4 functions:
  1) Input: ID (TW0001) or Chinese name
  2) Preview: load card by id OR search->id then load
  3) Home: reset to GitHub Pages "home state" + default card
  4) Deliver: generate/copy GAS share link (?action=share&id=TWxxxx)

- Keep robust header normalize + flexible field pick
- Keep hidden admin entry: long-press footer/version tag 1.2s => admin.html
- Compatible with existing HTML: will auto-inject toolbar if missing

================================ */

const CONFIG = {
  VERSION: 391,

  // ✅ Your GAS WebApp
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

  // ✅ Your GitHub Pages home
  HOME_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",

  // Default card to show on load / reset
  DEFAULT_ID: "TW0001",

  // Fetch behavior
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  // Admin entry
  ADMIN_LONGPRESS_MS: 1200,

  // Debug
  DEBUG: true,
};

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[v391]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[v391]", ...arguments); }
function err_() { console.error("[v391]", ...arguments); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setText(elOrId, v) {
  const el = typeof elOrId === "string" ? $(elOrId) : elOrId;
  if (!el) return false;
  el.textContent = text(v);
  return true;
}

/* ---------------------------
Query param helpers
--------------------------- */
function getParam(name) {
  try { return new URLSearchParams(window.location.search).get(name); }
  catch { return null; }
}
function setUrlParams_(paramsObj = {}) {
  const u = new URL(window.location.href);
  // clear all first
  u.search = "";
  // set provided
  for (const k of Object.keys(paramsObj)) {
    const v = paramsObj[k];
    if (v == null || text(v) === "") continue;
    u.searchParams.set(k, String(v));
  }
  // push (no reload)
  history.pushState({}, "", u.toString());
}
function getCardIdFromUrl_() {
  const id = text(getParam("id"));
  return id || "";
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
      signal: controller.signal,
    });

    const status = res.status;
    const ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : "";
    const txt = await res.text();
    const body = (txt || "").trim();

    if (CONFIG.DEBUG) {
      const head = body.slice(0, 220).replace(/\s+/g, " ");
      log_("fetch:", { status, ct, len: body.length, head });
    }

    if (!res.ok && !body) throw new Error(`HTTP ${status} (empty)`);
    if (!body) throw new Error("Empty response");

    try {
      return JSON.parse(body);
    } catch {
      // GAS sometimes wraps; try extract first {...}
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
      warn_("retry:", i, e && e.message ? e.message : e);
      await sleep(520 + i * 520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
Header normalize + pick helpers
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
      normalizeImageUrl(original),
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
Clipboard helper
--------------------------- */
async function copyText_(s, okMsg = "") {
  const v = text(s);
  if (!v) return false;

  try {
    await navigator.clipboard.writeText(v);
    if (okMsg) alert(okMsg);
    return true;
  } catch {
    prompt("請複製：", v);
    return true;
  }
}

/* ===========================
v391 Toolbar (auto-inject)
=========================== */
function ensureV391Toolbar_() {
  // If user already built toolbar, do nothing.
  if ($("v391Toolbar")) return;

  // Prefer a known top container; fallback to body.
  const host =
    q("#topControls") ||
    q(".top-controls") ||
    q(".facade") ||
    q("main") ||
    document.body;

  const bar = document.createElement("section");
  bar.id = "v391Toolbar";
  bar.style.display = "flex";
  bar.style.gap = "10px";
  bar.style.alignItems = "center";
  bar.style.flexWrap = "wrap";
  bar.style.margin = "10px 0 14px 0";

  const input = document.createElement("input");
  input.id = "v391Input";
  input.type = "text";
  input.placeholder = "輸入 TW0001 或 姓名（例：王）";
  input.autocomplete = "off";
  input.inputMode = "text";
  input.style.flex = "1 1 220px";
  input.style.minWidth = "220px";
  input.style.padding = "10px 12px";
  input.style.borderRadius = "12px";
  input.style.border = "1px solid rgba(0,0,0,.15)";
  input.style.outline = "none";

  const btnPreview = document.createElement("button");
  btnPreview.id = "v391BtnPreview";
  btnPreview.type = "button";
  btnPreview.textContent = "成品預覽";
  btnPreview.className = "btn-cta";

  const btnHome = document.createElement("button");
  btnHome.id = "v391BtnHome";
  btnHome.type = "button";
  btnHome.textContent = "回首頁";
  btnHome.className = "btn-cta";

  const btnDeliver = document.createElement("button");
  btnDeliver.id = "v391BtnDeliver";
  btnDeliver.type = "button";
  btnDeliver.textContent = "一鍵交貨";
  btnDeliver.className = "btn-cta";

  // small hint label
  const hint = document.createElement("div");
  hint.id = "v391Hint";
  hint.style.fontSize = "12px";
  hint.style.opacity = "0.7";
  hint.style.flex = "1 1 100%";
  hint.textContent = "提示：可直接輸入 TW0001，或輸入姓名（會先搜尋再帶入預覽）。";

  bar.appendChild(input);
  bar.appendChild(btnPreview);
  bar.appendChild(btnHome);
  bar.appendChild(btnDeliver);
  bar.appendChild(hint);

  // Insert near top
  if (host.firstChild) host.insertBefore(bar, host.firstChild);
  else host.appendChild(bar);

  // Enter key => preview
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnPreview.click();
    }
  });
}

/* ===========================
Core UI hooks (existing ids)
=========================== */
function setLoadingUi_() {
  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端內容...");
}
function setFailUi_(msg) {
  setText("u-name", "（同步失敗）");
  setText("u-unit", msg || "請檢查 GAS 或查詢條件");
  setText("u-service", "");
  const img = $("u-img");
  if (img) img.removeAttribute("src");
}

function setAvatarImage_(url) {
  const img = $("u-img");
  if (!img) return;
  const cands = buildImageCandidates_(url);
  if (!cands.length) { img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

/* ===========================
Apply card data to UI
(Keep it flexible: only fill what exists)
=========================== */
function applyCardToUi_(payloadNorm) {
  const id = pick(payloadNorm, ["id", "ID"]);
  const name = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);
  const avatar =
    pick(payloadNorm, ["個人照_fast", "個人照", "形象照_fast", "形象照", "avatar_fast", "avatar"]);

  // Base v385 hooks
  if ($("u-name")) setText("u-name", name || "（尚未讀到姓名）");
  if ($("u-unit")) setText("u-unit", unit || "");
  if ($("u-service")) setText("u-service", service || "");

  if (avatar) setAvatarImage_(avatar);

  // Optional: show id somewhere if you have it
  if ($("u-id")) setText("u-id", id || "");
}

/* ===========================
GAS actions
- card: ?action=card&id=TW0001
- search: ?action=search&q=王  (or name=王 / id=TW0001)
- share: ?action=share&id=TW0001
=========================== */
function gasUrl_(action, params = {}) {
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", action);
  for (const k of Object.keys(params)) {
    const v = params[k];
    if (v == null || text(v) === "") continue;
    u.searchParams.set(k, String(v));
  }
  u.searchParams.set("ts", String(Date.now()));
  return u.toString();
}

async function gasCard_(id) {
  const url = gasUrl_("card", { id });
  const data = await fetchJsonRobust(url);
  if (!data || typeof data !== "object") throw new Error("Invalid payload");
  if (data.ok === false) throw new Error(data.error || "Not found");
  return data;
}

function extractFirstIdFromSearch_(data) {
  if (!data || typeof data !== "object") return "";

  // common shapes:
  // { ok:true, id:"TW0001" }
  if (text(data.id)) return text(data.id);

  // { ok:true, row:{id:"TW0001"} }
  if (data.row && text(data.row.id)) return text(data.row.id);

  // { ok:true, rows:[{id:"TW0001"}, ...] }
  if (Array.isArray(data.rows) && data.rows.length) {
    const r = data.rows[0];
    if (r && text(r.id)) return text(r.id);
  }

  // { ok:true, results:[{id:"TW0001"}] }
  if (Array.isArray(data.results) && data.results.length) {
    const r = data.results[0];
    if (r && text(r.id)) return text(r.id);
  }

  // fallback: scan any object array field
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object") {
      const r = v[0];
      if (text(r.id)) return text(r.id);
    }
  }

  return "";
}

async function gasSearchToId_(qOrNameOrId) {
  const v = text(qOrNameOrId);
  if (!v) return "";

  // If already looks like TW0001, accept.
  if (/^TW\d{4}$/i.test(v)) return v.toUpperCase();

  // Try search endpoints: q, name
  // (You said both work: ?action=search&name=王 OR &q=王)
  const url = gasUrl_("search", { q: v });
  let data = await fetchJsonRobust(url);
  if (data && data.ok === false) {
    // try name param
    const url2 = gasUrl_("search", { name: v });
    data = await fetchJsonRobust(url2);
  }

  if (!data || typeof data !== "object") throw new Error("Search invalid payload");
  if (data.ok === false) throw new Error(data.error || "Search failed");

  const id = extractFirstIdFromSearch_(data);
  if (!id) throw new Error("找不到符合的 id（請改用 TW0001 或輸入更完整姓名）");
  return id.toUpperCase();
}

/* ===========================
v391 Main flows
=========================== */
let __currentId = "";

async function loadAndRenderById_(id) {
  const safeId = text(id).toUpperCase();
  if (!safeId) throw new Error("Missing id");

  __currentId = safeId;

  if ($("u-name")) setLoadingUi_();

  const data = await gasCard_(safeId);
  const payloadNorm = buildNormalizedPayload_(data);

  applyCardToUi_(payloadNorm);
}

async function previewFromInput_() {
  const inputEl = $("v391Input") || $("searchInput") || $("qInput");
  const raw = inputEl ? text(inputEl.value) : "";

  // If input empty -> use url id -> default id
  const target = raw || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;

  try {
    // If not TW0001, search first
    const id = /^TW\d{4}$/i.test(target) ? target.toUpperCase() : await gasSearchToId_(target);
    // sync url param for share button consistency
    setUrlParams_({ id });
    await loadAndRenderById_(id);
  } catch (e) {
    err_(e);
    if ($("u-name")) setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
    else alert(e && e.message ? e.message : "同步失敗");
  }
}

function goHomeReset_() {
  // Hard reset: go to HOME_URL (no params) then default render
  // (Single-page style: pushState + re-render)
  try {
    history.pushState({}, "", CONFIG.HOME_URL);
  } catch {
    // If pushState blocked, fallback to assign
    window.location.href = CONFIG.HOME_URL;
    return;
  }

  const inputEl = $("v391Input") || $("searchInput") || $("qInput");
  if (inputEl) inputEl.value = "";

  __currentId = CONFIG.DEFAULT_ID;
  // Ensure UI shows default
  setUrlParams_({ id: CONFIG.DEFAULT_ID });
  previewFromInput_();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deliverCopyLink_() {
  // Use current url id first, then __currentId, else default
  const id = getCardIdFromUrl_() || __currentId || CONFIG.DEFAULT_ID;

  // Deliver link is GAS share endpoint (server-side OG title contains name)
  const link = `${CONFIG.GAS}?action=share&id=${encodeURIComponent(id)}`;

  await copyText_(link, "已複製交貨連結（share link）！");
}

/* ===========================
Hidden Admin Entry (long-press footer/version tag)
=========================== */
function bindAdminLongPress_() {
  const target =
    q(".version-tag") || q("#versionTag") || q("footer") || q("#footer") || null;
  if (!target) return;

  let timer = null;
  let fired = false;

  const start = () => {
    fired = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fired = true;
      const id = getCardIdFromUrl_() || __currentId || CONFIG.DEFAULT_ID;
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

  target.addEventListener("click", (e) => {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

/* ===========================
Bind toolbar buttons
=========================== */
function bindV391ToolbarActions_() {
  const btnPreview = $("v391BtnPreview") || $("btnPreview") || $("btnCardPreview");
  const btnHome = $("v391BtnHome") || $("btnHome");
  const btnDeliver = $("v391BtnDeliver") || $("btnDeliver") || $("btnShare");

  if (btnPreview) btnPreview.addEventListener("click", previewFromInput_);
  if (btnHome) btnHome.addEventListener("click", goHomeReset_);
  if (btnDeliver) btnDeliver.addEventListener("click", deliverCopyLink_);
}

/* ===========================
Boot
=========================== */
function bootV391_() {
  // Inject toolbar if missing
  ensureV391Toolbar_();

  // Bind actions
  bindV391ToolbarActions_();
  bindAdminLongPress_();

  // Init input with current URL id if present
  const idFromUrl = getCardIdFromUrl_();
  const inputEl = $("v391Input");
  if (inputEl && idFromUrl) inputEl.value = idFromUrl;

  // First render: url id -> default
  const initial = idFromUrl || CONFIG.DEFAULT_ID;
  setUrlParams_({ id: initial });
  __currentId = initial;

  // Load
  previewFromInput_();

  log_("boot ok", { version: CONFIG.VERSION, initial });
}

document.addEventListener("DOMContentLoaded", () => bootV391_(), { once: true });
window.addEventListener("load", () => {
  // safety: if DOMContentLoaded missed
  if (!__currentId) bootV391_();
});