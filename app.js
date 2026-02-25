/* ================================
 * Happiness Smart Card System — app.js (v399.12 COMPLETE OVERWRITE) 1/3
 * Fixes:
 * - MUST define fetchJsonRobust (no more "not defined")
 * - Extract payload robustly: data.card / data.row / data.data / data
 * - Keep v382 hooks: setV382 / setV382Style / setV382Paper
 * - Add "event-delegation safety": buttons won't randomly die
 * - Admin: top invisible hotspot (triple tap)
 * - Share: window.copyCardUrl()
 * ================================ */

const CONFIG = {
  VERSION: "399.12",

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_TRIPLETAP_WINDOW_MS: 900,
  ADMIN_TRIPLETAP_COUNT: 3,

  PHOTO_SLOT_MAX: 20,

  DEBUG: true
};

// expose for admin.html usage (你先前提到的需求)
window.CONFIG = CONFIG;

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __resolvedId = CONFIG.DEFAULT_ID;
let __lastLoad = { id: "", ts: 0, url: "" };

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v399]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v399]", ...arguments); }
function err_() { console.error("[HSC-v399]", ...arguments); }
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
Fetch JSON (robust) — ✅ 一定存在
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

async function fetchJsonRobust(url) {
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
Switching system (keep HTML hooks)
+ Safety: if inline onclick 被覆蓋/失效，仍可用事件委派
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
  state.mode = (mode === "premium" ? "premium" : "free");
  state.theme = text(theme) || (state.mode === "premium" ? "p1" : "color-1");

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el && (el.classList.contains("dot") || el.classList.contains("p-dot"))) el.classList.add("active");

  syncPlanButtons_();
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
}/* ================================
 * Happiness Smart Card System — app.js (v399.12 COMPLETE OVERWRITE) 3/3
 * - Blocks render
 * - Apply payload to card
 * - Load card by id (robust)
 * - Admin hotspot (top)
 * - Button safety: event delegation (fix "按鈕又失效")
 * ================================ */

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
Payload extractor (✅ 解決：有時 data.card 才是真資料)
--------------------------- */
function extractPayload_(data){
  if(!data || typeof data !== "object") return {};
  const cand = data.card || data.row || data.data || data.payload || data;
  return (cand && typeof cand === "object") ? cand : {};
}

/* ---------------------------
Apply data
--------------------------- */
function applyDataToCard(payloadNorm) {
  const name    = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit    = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const title   = pick(payloadNorm, ["頭銜","職稱","title","Title"]);
  const slogan  = pick(payloadNorm, ["理念","標語","slogan","Slogan"]);
  const service = pick(payloadNorm, ["服務項目","經營項目","service","Service"]);
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
  renderPhotoWall_(payloadNorm);
  renderSocialLinks_(payloadNorm);   // ✅ 影音/社群/網頁
  renderContactDock_(payloadNorm);   // ✅ LINE官網/LINE/微信複製/電話/Email/導航
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

  const social = $("socialBox") || $("socialLinks") || $("videoBox") || $("block-social");
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

  const social = $("socialBox") || $("socialLinks") || $("videoBox") || $("block-social");
  if (social) social.style.display = "none";
}

/* ---------------------------
Load card
--------------------------- */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  __resolvedId = cid;
  __lastLoad = { id: cid, ts: Date.now(), url };

  setLoadingUi_();

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object")
      throw new Error("Invalid payload");

    if (data.ok === false)
      throw new Error(data.error || "Not found");

    const payload = extractPayload_(data);
    const payloadNorm = buildNormalizedPayload_(payload);

    applyDataToCard(payloadNorm);

    try {
      const u = new URL(window.location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    } catch {}

    return cid;

  } catch (e) {
    err_(e);
    setFailUi_(e.message);
  }
}

/* ===========================
Hidden Admin Entry (Top Hotspot)
=========================== */
function openAdmin_() {
  const id = __resolvedId || CONFIG.DEFAULT_ID;
  window.open(`admin.html?id=${encodeURIComponent(id)}`, "_blank");
}

function ensureAdminHotspot_() {
  // 優先用你 CSS 裡的 #adminHotspotTop（若存在）
  let hs = $("adminHotspotTop");

  if (!hs) {
    hs = document.createElement("div");
    hs.id = "adminHotspotTop";
    document.body.appendChild(hs);
  }

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

/* ===========================
Button Safety: Event Delegation
- 解決你說的「怎麼按鈕又失效」
=========================== */
function bindDelegationSafety_(){
  document.addEventListener("click", (e)=>{
    const t = e.target;

    // plan buttons
    const planA = t.closest && t.closest("#btnPlanFree");
    const planB = t.closest && t.closest("#btnPlanPremium");
    if(planA){
      window.setV382("free", state.theme || "color-1", planA);
      return;
    }
    if(planB){
      window.setV382("premium", (state.theme && state.theme.startsWith("p")) ? state.theme : "p1", planB);
      return;
    }

    // free dots / premium dots
    const dot = t.closest && t.closest(".dot");
    const pdot = t.closest && t.closest(".p-dot");
    if(dot){
      // dot should have data-theme or style attr? fallback: keep current
      const theme = dot.dataset.theme || dot.getAttribute("data-theme") || state.theme || "color-1";
      window.setV382("free", theme, dot);
      return;
    }
    if(pdot){
      const theme = pdot.dataset.theme || pdot.getAttribute("data-theme") || state.theme || "p1";
      window.setV382("premium", theme, pdot);
      return;
    }
  }, { passive:true });
}

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  ensureAdminHotspot_();
  bindDelegationSafety_();

  // ensure initial mode buttons reflect state
  syncPlanButtons_();
  applyV382_();

  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });