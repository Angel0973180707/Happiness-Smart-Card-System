/* =========================================================
 * 幸福智慧名片｜app.js（V384 前台｜Stable Overwrite v3）
 * 目的：修掉「圖進不來」+「按鈕失效」的根因（欄位名含引號/換行/零寬字元）
 *
 * ✅ 保留：選色/選版型/選紙感（window.setV382...）
 * ✅ 對接：GAS v1.1 action=list（回傳 headers + rows）
 * ✅ 支援：網址參數 id，例如 index.html?id=TW0001
 * ✅ 圖片：Drive open?id / file/d / uc?id 皆可，自動轉直連 + fallback
 * ========================================================= */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

// ------------------------ small helpers ------------------------
function byId_(id){ return document.getElementById(id); }

function safeText_(el, text){
  if (!el) return;
  el.innerText = (text === null || text === undefined) ? "" : String(text);
}

function getIdFromUrl_() {
  try {
    const u = new URL(location.href);
    return (u.searchParams.get("id") || CONFIG.ANGEL || "TW0001").trim();
  } catch (e) {
    return (CONFIG.ANGEL || "TW0001").trim();
  }
}

// ------------------------ header normalization (關鍵) ------------------------
function stripZeroWidth_(s){
  // 移除零寬空白 / BOM 等
  return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function normKey_(s){
  // GAS headers 可能含：引號、換行、尾端空白
  let t = stripZeroWidth_(s);
  t = t.replace(/"/g, "");
  t = t.replace(/\r?\n/g, " ");
  t = t.replace(/\s+/g, " ");
  t = t.trim();
  return t;
}

function buildRowIndex_(rowObj){
  // 建立「normalizedKey -> value」索引，提升容錯
  const idx = new Map();
  Object.keys(rowObj || {}).forEach(k => {
    const nk = normKey_(k);
    if (!idx.has(nk)) idx.set(nk, rowObj[k]);
  });
  return idx;
}

function findByIncludes_(indexMap, patterns){
  // patterns: ["個人專業形象照", "名片主圖"]
  if (!indexMap || !(indexMap instanceof Map)) return "";
  const keys = Array.from(indexMap.keys());
  for (const p of patterns) {
    const np = normKey_(p);
    for (const k of keys) {
      if (k.includes(np)) {
        const v = indexMap.get(k);
        if (v !== null && v !== undefined && String(v).trim() !== "") return v;
      }
    }
  }
  return "";
}

/** rows 可能是「物件陣列」或「二維陣列」，統一轉成物件（並保留原 headers） */
function rowToObject_(row, headers) {
  if (!row) return null;

  // 已是物件
  if (typeof row === "object" && !Array.isArray(row)) return row;

  // 二維陣列 → 用 headers 組成物件
  if (Array.isArray(row) && Array.isArray(headers) && headers.length) {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h)] = row[i]; });
    return obj;
  }
  return null;
}

// ------------------------ Drive image handling ------------------------
function extractDriveId_(url) {
  const s = String(url || "").trim();
  if (!s) return "";

  const m1 = s.match(/[?&]id=([^&]+)/i);        // open?id= / uc?id=
  const m2 = s.match(/\/d\/([^/]+)/i);          // /file/d/<id>/
  const m3 = s.match(/\/file\/d\/([^/]+)/i);    // /file/d/<id>/

  if (m1) return m1[1];
  if (m3) return m3[1];
  if (m2) return m2[1];
  return "";
}

function driveImageCandidates_(url) {
  const raw = String(url || "").trim();
  const id = extractDriveId_(raw);
  if (!id) return [raw];

  return [
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${id}`,
    raw
  ];
}

function setImgWithFallback_(imgEl, url) {
  if (!imgEl) return;
  const candidates = driveImageCandidates_(url);
  let idx = 0;

  const tryNext = () => {
    if (idx >= candidates.length) return;
    imgEl.src = candidates[idx++];
  };

  imgEl.onerror = () => tryNext();

  tryNext();
}

// ------------------------ UI controls (保留選版功能) ------------------------
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  applyV382();
};

window.setV382Style = function(style, el) {
  state.style = style;

  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;

  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

function applyV382() {
  const isFree = state.mode === "free";
  const controlPanel = byId_("free-controls");
  if (controlPanel) controlPanel.style.display = isFree ? "block" : "none";

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];

  document.body.className = classList.filter(Boolean).join(" ");
}

window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

// ------------------------ data loader (對接 GAS v1.1 list) ------------------------
async function loadCardDataFromListAPI_() {
  const id = getIdFromUrl_();

  const nameEl = byId_("u-name");
  const unitEl = byId_("u-unit");
  const serviceEl = byId_("u-service");
  const imgEl = byId_("u-img");

  safeText_(nameEl, "載入中...");
  safeText_(unitEl, "同步中...");

  try {
    // 重要：你這支 GAS「不帶 action」會回 Unknown action，所以一定要 action=list
    const res = await fetch(`${CONFIG.GAS}?action=list`, { cache: "no-store" });
    const json = await res.json();

    if (!json || json.ok !== true) {
      console.warn("GAS return:", json);
      safeText_(nameEl, "雲端同步失敗");
      safeText_(unitEl, "請確認 GAS 回傳");
      return;
    }

    const headers = Array.isArray(json.headers) ? json.headers : [];
    const rows = Array.isArray(json.rows) ? json.rows : [];

    let rowObj = null;
    for (const r of rows) {
      const obj = rowToObject_(r, headers);
      if (!obj) continue;

      // id 欄位通常叫 id（小寫），但也可能 ID
      const rid = String(obj.id || obj.ID || obj["id"] || obj["ID"] || "").trim();
      if (rid === id) { rowObj = obj; break; }
    }

    if (!rowObj) {
      safeText_(nameEl, "找不到此序號");
      safeText_(unitEl, id);
      safeText_(serviceEl, "請確認該列是否有填入 id（例如 TW0001）。");
      return;
    }

    // 建索引（修掉：headers 含引號/換行/零寬字元）
    const idx = buildRowIndex_(rowObj);

    // 依「包含關鍵字」抓欄位（最穩，不怕你表單欄位變動）
    const name = findByIncludes_(idx, ["姓名（名片大標題）", "姓名"]);
    const unit = findByIncludes_(idx, ["單位名稱", "單位"]);
    const service = findByIncludes_(idx, ["服務項目", "核心業務"]);
    const avatar = findByIncludes_(idx, ["個人專業形象照", "名片主圖", "形象照", "頭像", "照片"]);

    safeText_(nameEl, name || "（未填姓名）");
    safeText_(unitEl, unit || "");
    safeText_(serviceEl, service || "");

    // 圖片：Drive 直連候選 + onerror fallback
    if (imgEl && avatar) setImgWithFallback_(imgEl, avatar);

  } catch (e) {
    console.error("loadCardDataFromListAPI_ error:", e);
    safeText_(nameEl, "雲端同步異常");
    safeText_(unitEl, "請稍後再試");
  }
}

// ------------------------ boot ------------------------
window.addEventListener("load", () => {
  // 先套用你 HTML body 預設 class
  applyV382();
  // 再抓雲端資料
  loadCardDataFromListAPI_();
});
