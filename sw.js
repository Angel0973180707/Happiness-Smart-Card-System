/* ================================
Happiness Smart Card System — app.js (v393 COMPLETE OVERWRITE)

v393 GOALS (per v391 / v393 request):
- Keep existing v385/v387 facade + sample card layout intact (no required HTML rewrite)
- Add 4 front buttons (inject if missing):
  1) Input (TW0001 or Chinese name)
  2) Preview (card/search -> load by id)
  3) Home (reset to homepage state)
  4) One-click delivery (copy share link: ?action=share&id=TWxxxx)
- share.html will use GAS to fetch name + avatar (handled in share page script, not here)
- Hidden admin entry: long-press version-tag/footer 1.2s => admin.html?id=TWxxxx
- Robust fetch + JSON parse + header normalize
================================ */

const CONFIG = {
  VERSION: 393,

  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_LONGPRESS_MS: 1200,

  // optional extras if columns exist
  GALLERY_MAX: 12,
  THUMB_MIN_COL: 3,
  THUMB_MAX_COL: 4,

  DEBUG: true
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

let __payloadRaw = null;
let __payload = null;
let __gallery = { list: [], inited: false };
let __lastLoad = { id: "", ts: 0, url: "" };
let __resolvedId = CONFIG.DEFAULT_ID;

/* --------------------------- */
function $(id) { return document.getElementById(id); }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function log_() { if (CONFIG.DEBUG) console.log("[HSC-v393]", ...arguments); }
function warn_() { if (CONFIG.DEBUG) console.warn("[HSC-v393]", ...arguments); }
function err_() { console.error("[HSC-v393]", ...arguments); }
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
  // accept TW0001 / tw0001 / TW001 / 0001 (will pad if numeric)
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
Core render
--------------------------- */
function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;
  const cands = buildImageCandidates_(url);
  if (!cands.length) { img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function applyDataToCard(payloadNorm) {
  const name = pick(payloadNorm, ["姓名", "name", "Name"]);
  const unit = pick(payloadNorm, ["單位", "unit", "Unit"]);
  const service = pick(payloadNorm, ["服務項目", "service", "Service"]);

  const avatar =
    pick(payloadNorm, ["個人照_fast", "個人照", "形象照_fast", "形象照", "avatar_fast", "avatar"]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  setAvatarImage(avatar);

  syncPlanButtons_();
  refreshPremiumSafety_();
}

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
  setText("u-unit", msg || "請確認 id 或 GAS 權限");
  setText("u-service", "");
  const img = $("u-img");
  if (img) img.removeAttribute("src");
}

/* ---------------------------
Actions: load card / search
--------------------------- */
async function loadCardById_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __lastLoad = { id: cid, ts: Date.now(), url };
  __resolvedId = cid;

  await waitForDom_(["u-name", "u-unit", "u-service"], 2400);
  setLoadingUi_();

  try {
    const data = await fetchJsonRobust(url);

    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    if (data.ok === false) throw new Error(data.error || "Not found");
    if (Object.keys(data).length === 0) throw new Error("Empty object");

    __payloadRaw = data;
    __payload = buildNormalizedPayload_(data);

    applyDataToCard(__payload);
    await sleep(120);
    applyDataToCard(__payload);

    // keep URL in sync (so share/admin know current)
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    } catch {}

    log_("loadCard success:", cid);
    return cid;
  } catch (e) {
    err_("loadCard error:", e);
    setFailUi_(e && e.message ? `同步失敗：${e.message}` : "同步失敗");
    throw e;
  }
}

async function searchToId_(qstr) {
  const qv = text(qstr);
  if (!qv) return "";

  // If user typed an id, shortcut
  const maybeId = normalizeId_(qv);
  if (/^TW\d{4}$/i.test(maybeId)) return maybeId;

  const url = `${CONFIG.GAS}?action=search&q=${encodeURIComponent(qv)}&ts=${Date.now()}`;
  const data = await fetchJsonRobust(url);

  if (!data || typeof data !== "object") throw new Error("Search payload invalid");
  if (data.ok === false) throw new Error(data.error || "Search failed");

  // Accept possible shapes:
  // {ok:true, rows:[{id:"TW0001",...}, ...]}
  // {ok:true, results:[...]}
  // [{id:"TW0001"}...]
  const rows =
    (Array.isArray(data) ? data :
      (Array.isArray(data.rows) ? data.rows :
        (Array.isArray(data.results) ? data.results : [])));

  if (!rows.length) throw new Error("找不到符合的姓名/關鍵字");

  const first = rows[0] || {};
  const rid = normalizeId_(first.id || first.ID || first.Id || "");
  if (!/^TW\d{4}$/i.test(rid)) throw new Error("Search 回傳缺少 id");

  return rid;
}

/* ---------------------------
Front UI injection (input + 4 buttons)
--------------------------- */
function ensureFrontToolbar_() {
  if ($("frontBar")) return;

  const panel = $("admin-panel") || q("#admin-panel");
  if (!panel) return;

  const bar = document.createElement("div");
  bar.id = "frontBar";
  bar.style.display = "flex";
  bar.style.gap = "8px";
  bar.style.flexWrap = "wrap";
  bar.style.justifyContent = "center";
  bar.style.alignItems = "center";
  bar.style.padding = "8px 12px 4px";

  const input = document.createElement("input");
  input.id = "frontQuery";
  input.type = "text";
  input.inputMode = "text";
  input.placeholder = "輸入 TW0001 或 姓名";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.style.width = "min(520px, 92vw)";
  input.style.maxWidth = "520px";
  input.style.padding = "12px 14px";
  input.style.borderRadius = "18px";
  input.style.border = "1px solid rgba(0,0,0,0.10)";
  input.style.fontWeight = "900";
  input.style.outline = "none";

  const btnPreview = document.createElement("button");
  btnPreview.id = "btnPreview";
  btnPreview.type = "button";
  btnPreview.className = "btn-neo";
  btnPreview.textContent = "成品預覽";

  const btnHome = document.createElement("button");
  btnHome.id = "btnHome";
  btnHome.type = "button";
  btnHome.className = "btn-neo";
  btnHome.textContent = "回首頁";

  const btnDeliver = document.createElement("button");
  btnDeliver.id = "btnDeliver";
  btnDeliver.type = "button";
  btnDeliver.className = "btn-neo";
  btnDeliver.textContent = "一鍵交貨";

  // put input first, then buttons
  bar.appendChild(input);
  bar.appendChild(btnPreview);
  bar.appendChild(btnHome);
  bar.appendChild(btnDeliver);

  // Insert under the plan buttons row (near top), but inside panel
  panel.insertBefore(bar, panel.children[1] || null);
}

async function copyText_(s) {
  const v = text(s);
  if (!v) return;
  try {
    await navigator.clipboard.writeText(v);
    alert("已複製交貨連結：\n" + v);
  } catch {
    prompt("請複製交貨連結：", v);
  }
}

/* ---------------------------
Required 4 actions
--------------------------- */
async function actionPreview_() {
  const input = $("frontQuery");
  const qv = text(input ? input.value : "");
  const rid = await searchToId_(qv || __resolvedId || CONFIG.DEFAULT_ID);
  if (!rid) throw new Error("請輸入序號或姓名");
  await loadCardById_(rid);
  if (input) input.value = rid;
}

function actionHome_() {
  // reset UI state + clear URL + load default
  try { history.replaceState({}, "", window.location.pathname); } catch {}

  // reset state to homepage defaults
  state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
  applyV382_();
  syncPlanButtons_();

  // reset active dots (free color-1)
  const freeDots = qa(".dot");
  freeDots.forEach(d => d.classList.remove("active"));
  if (freeDots[0]) freeDots[0].classList.add("active");

  // reset style/paper buttons (best-effort: pick first active groups)
  const freeControls = $("free-controls");
  if (freeControls) {
    // style row
    const rows = qa(".control-row", freeControls);
    if (rows[0]) {
      qa(".btn-neo", rows[0]).forEach(b => b.classList.remove("active"));
      const first = q(".btn-neo", rows[0]);
      if (first) first.classList.add("active");
    }
    if (rows[1]) {
      qa(".btn-neo", rows[1]).forEach(b => b.classList.remove("active"));
      const first = q(".btn-neo", rows[1]);
      if (first) first.classList.add("active");
    }
  }

  // clear input
  const input = $("frontQuery");
  if (input) input.value = "";

  // scroll top
  try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}

  // reload default card
  loadCardById_(CONFIG.DEFAULT_ID).catch(()=>{});
}

async function actionDeliver_() {
  // use current resolved id
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  const shareLink = `${CONFIG.GAS}?action=share&id=${encodeURIComponent(id)}`;
  await copyText_(shareLink);
}

/* ---------------------------
Bind front actions
--------------------------- */
function bindFrontActions_() {
  ensureFrontToolbar_();

  const input = $("frontQuery");
  const btnPreview = $("btnPreview");
  const btnHome = $("btnHome");
  const btnDeliver = $("btnDeliver");

  if (btnPreview) {
    btnPreview.addEventListener("click", () => {
      actionPreview_().catch(e => alert(e && e.message ? e.message : "預覽失敗"));
    });
  }
  if (btnHome) {
    btnHome.addEventListener("click", () => actionHome_());
  }
  if (btnDeliver) {
    btnDeliver.addEventListener("click", () => {
      actionDeliver_().catch(e => alert(e && e.message ? e.message : "複製失敗"));
    });
  }
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        actionPreview_().catch(err => alert(err && err.message ? err.message : "預覽失敗"));
      }
    });
  }
}

/* ---------------------------
Hidden Admin Entry (long-press)
--------------------------- */
function bindAdminLongPress_() {
  const target = $("versionTag") || q(".version-tag") || q("#versionTag") || $("footerTag") || q("footer") || null;
  if (!target) return;

  let timer = null;
  let fired = false;

  const start = () => {
    fired = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fired = true;
      const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
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

/* ---------------------------
Boot
--------------------------- */
function boot_() {
  try { applyV382_(); } catch {}
  try { syncPlanButtons_(); } catch {}
  try { bindFrontActions_(); } catch {}
  try { bindAdminLongPress_(); } catch {}

  const id = getCardIdFromUrl_();
  loadCardById_(id).catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => boot_(), { once: true });
window.addEventListener("load", () => { if (!__lastLoad.ts) boot_(); });