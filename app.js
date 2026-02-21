/* ================================
 * Angel Card App.js (FULL OVERWRITE)
 * Fix: UI must load by URL ?id=TW000X
 * - use GAS: ?action=card&id=...
 * - fallback only when fetch truly fails
 * - keep V382 switching + robust fetch + modal
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 10000,
  RETRY: 2
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

/* ---------------------------
 * Small helpers
 * --------------------------- */
function $(id) { return document.getElementById(id); }
function text(v) { return (v == null ? "" : String(v)).trim(); }
function setText(id, v) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el) return;
  el.textContent = text(v);
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/* ---------------------------
 * Read URL params
 * --------------------------- */
function getParam(name) {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get(name);
  } catch {
    return null;
  }
}
function getCardId() {
  const id = text(getParam("id"));
  return id || CONFIG.DEFAULT_ID;
}

/* ---------------------------
 * Keep existing switching system
 * --------------------------- */
window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
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

/* ---------------------------
 * Robust fetch (no-store + timeout + retry + safe JSON)
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
      signal: controller.signal,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    const txt = await res.text();
    const body = (txt || "").trim();
    if (!body) throw new Error("Empty response");

    try {
      return JSON.parse(body);
    } catch {
      const m = body.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) return JSON.parse(m[1]);
      throw new Error("Not JSON (maybe HTML/login/blocked)");
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
      await sleep(450 + i * 450);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
 * Field mapping (support your headers)
 * --------------------------- */
function pick(obj, keys) {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v != null && text(v) !== "") return v;
  }
  return "";
}

function applyDataToCard(payload) {
  const name = pick(payload, [
    "姓名（名片大標題）",
    "姓名",
    "name",
    "Name"
  ]);

  const unit = pick(payload, [
    "單位名稱（如：幸福教養概念館）",
    "單位名稱",
    "單位",
    "unit",
    "Unit"
  ]);

  const service = pick(payload, [
    "服務項目（核心業務，多項可條列換行）",
    "服務項目",
    "service",
    "Service"
  ]);

  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  const photo = pick(payload, [
    "個人照片（請上傳形象照）",
    "個人照",
    "形象照",
    "照片",
    "photo",
    "image"
  ]);
  setAvatarImage(photo);
}

/* ---------------------------
 * Image helpers
 * --------------------------- */
function normalizeImageUrl(raw) {
  if (!raw) return "";
  let url = String(raw).trim();
  if (!url) return "";

  if (url.startsWith("http://")) url = "https://" + url.slice(7);

  const mId = url.match(/drive\.google\.com\/.*[?&]id=([^&]+)/i);
  if (mId && mId[1]) {
    const id = mId[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (mFile && mFile[1]) {
    const id = mFile[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  if (url.includes("dropbox.com")) {
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }

  return url;
}

function setAvatarImage(url) {
  const img = $("u-img");
  if (!img) return;

  const finalUrl = normalizeImageUrl(url);
  if (!finalUrl) {
    img.removeAttribute("src");
    return;
  }

  img.onerror = () => img.removeAttribute("src");

  const sep = finalUrl.includes("?") ? "&" : "?";
  img.src = finalUrl + sep + "t=" + Date.now();
}

/* ---------------------------
 * Order help modal (if exists)
 * --------------------------- */
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

/* ---------------------------
 * Main load (✅ load by URL id)
 * --------------------------- */
async function loadData() {
  const id = getCardId();

  // ✅ your GAS requires action=card
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;

  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端服務項目...");

  try {
    const data = await fetchJsonRobust(url);

    // data is the row object directly in your GAS
    if (data && data.ok === false) throw new Error(data.error || "Not found");

    applyDataToCard(data);

  } catch (e) {
    console.error("雲端同步異常:", e);

    // show a clear fail state (不要再用固定小天使誤導)
    setText("u-name", "（同步失敗）");
    setText("u-unit", "請確認網址 ?id=TW000X 或檢查 GAS 權限");
    setText("u-service", "");
    setAvatarImage("");
  }
}

/* ---------------------------
 * External actions
 * --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

window.addEventListener("load", () => {
  applyV382();
  loadData();
});