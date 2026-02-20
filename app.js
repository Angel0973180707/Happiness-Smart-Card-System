/* ================================
 * Angel Card App.js (FULL OVERWRITE)
 * Focus: TEXT data must load reliably (mobile/incognito)
 * - robust fetch: no-store + timeout + retry + safe JSON parse
 * - supports Chinese headers (含括號欄位名)
 * - keeps existing mode/theme/style/paper switching (V382 worldline)
 * - includes order help modal open/close (if exists in HTML)
 * - keeps image normalize helper (photo fix can be done next)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001",
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
      // sometimes JSON gets wrapped, try extract first {...} or [...]
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
 * Field mapping (✅ support your actual sheet headers)
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
  // ✅ match your screenshot headers FIRST
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

  // If name is empty, we still show fallback
  setText("u-name", name || "（尚未讀到姓名）");
  setText("u-unit", unit || "");
  setText("u-service", service || "");

  // image is NOT priority now — keep placeholder logic
  const photo = pick(payload, [
    "個人照片（請上傳形象照）",
    "形象照",
    "照片",
    "photo",
    "image"
  ]);
  setAvatarImage(photo);
}

/* ---------------------------
 * Image helpers (kept for next step)
 * --------------------------- */
function normalizeImageUrl(raw) {
  if (!raw) return "";
  let url = String(raw).trim();
  if (!url) return "";

  if (url.startsWith("http://")) url = "https://" + url.slice(7);

  // Drive: any ...?id=xxxx (open?id= / uc?id= / etc)
  const mId = url.match(/drive\.google\.com\/.*[?&]id=([^&]+)/i);
  if (mId && mId[1]) {
    const id = mId[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // Drive: /file/d/xxxx
  const mFile = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (mFile && mFile[1]) {
    const id = mFile[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // Dropbox share -> raw
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

  img.onload = () => {};
  img.onerror = () => {
    // don’t break layout, just hide
    img.removeAttribute("src");
  };

  // cache-bust for mobile/incognito
  const sep = finalUrl.includes("?") ? "&" : "?";
  img.src = finalUrl + sep + "t=" + Date.now();
}

/* ---------------------------
 * Order help modal (if exists in HTML)
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

// click backdrop to close (optional)
document.addEventListener("click", (e) => {
  const modal = $("orderHelpModal");
  if (!modal) return;
  if (e.target === modal) window.closeOrderHelp();
});

/* ---------------------------
 * Main load (✅ TEXT must load)
 * --------------------------- */
async function loadData() {
  // force fresh request each time
  const url = `${CONFIG.GAS}?id=${encodeURIComponent(CONFIG.ANGEL)}&ts=${Date.now()}`;

  setText("u-name", "載入中...");
  setText("u-unit", "同步中...");
  setText("u-service", "正在同步雲端服務項目...");

  try {
    const data = await fetchJsonRobust(url);
    const payload = (data && data.data) ? data.data : data;
    applyDataToCard(payload);
  } catch (e) {
    console.error("雲端同步異常:", e);
    // fallback (this is what you saw before)
    setText("u-name", "小天使笑長");
    setText("u-unit", "");
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