/* =========================================================
 * 幸福智慧名片｜app.js（V384/V385 前台｜Complete Overwrite）
 * ✅ 保留：選色/選版型/選紙感（window.setV382...）
 * ✅ 對接：你目前 GAS v1.1（action=list）從整表撈出指定 id 的一筆資料
 * ✅ 支援：網址參數 id，例如 index.html?id=TW0001
 * ✅ 修正：Google Drive 圖片顯示（提供多種直連 fallback + onerror 退路）
 * ========================================================= */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

// ------------------------ helpers ------------------------
function byId_(id){ return document.getElementById(id); }

function getIdFromUrl_() {
  try {
    const u = new URL(location.href);
    return (u.searchParams.get("id") || CONFIG.ANGEL || "TW0001").trim();
  } catch(e) {
    return (CONFIG.ANGEL || "TW0001").trim();
  }
}

/** rows 可能是「物件陣列」或「二維陣列」，這裡統一轉成物件 */
function rowToObject_(row, headers) {
  if (!row) return null;
  if (typeof row === "object" && !Array.isArray(row)) return row;
  if (Array.isArray(row) && Array.isArray(headers) && headers.length) {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h).trim()] = row[i]; });
    return obj;
  }
  return null;
}

/** 嘗試從一列資料物件取值（多個 key 依序 fallback） */
function pick_(obj, keys, fallback = "") {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k];
      if (v !== null && v !== undefined && String(v).trim() !== "") return v;
    }
  }
  return fallback;
}

/** 從 Drive/URL 抽 fileId（支援 open?id= / file/d/ / uc?id= / thumbnail?id=） */
function extractDriveId_(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  const m1 = s.match(/[?&]id=([^&]+)/);
  const m2 = s.match(/\/d\/([^/]+)/);
  const m3 = s.match(/\/file\/d\/([^/]+)/);
  if (m1) return m1[1];
  if (m3) return m3[1];
  if (m2) return m2[1];
  return "";
}

/**
 * Google Drive 圖片轉「可顯示」URL（多策略）
 * ⚠️ 前提：該圖片需設定「知道連結的人可檢視」
 */
function driveImageCandidates_(url) {
  const raw = String(url || "").trim();
  const id = extractDriveId_(raw);
  if (!id) return [raw];

  // 多種候選：不同情況不同連得上
  return [
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${id}`,
    raw
  ];
}

/** 讓 <img> 依序嘗試候選 URL（onerror 自動換下一個） */
function setImgWithFallback_(imgEl, url) {
  if (!imgEl) return;
  const candidates = driveImageCandidates_(url);
  let idx = 0;

  const tryNext = () => {
    if (idx >= candidates.length) return;
    const next = candidates[idx++];
    imgEl.src = next;
  };

  imgEl.onerror = () => {
    tryNext();
  };

  tryNext();
}

// ------------------------ UI controls (保留選版功能) ------------------------
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");

  // 切 premium 時，free 內控件隱藏
  applyV382();
};

window.setV382Style = function(style, el) {
  state.style = style;

  // 只影響同一排（版型排）
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;

  // 只影響同一排（紙感排）
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

  if (nameEl) nameEl.innerText = "載入中...";
  if (unitEl) unitEl.innerText = "同步中...";

  try {
    const res = await fetch(`${CONFIG.GAS}?action=list`, { cache: "no-store" });
    const json = await res.json();

    if (!json || json.ok !== true) {
      console.warn("GAS return:", json);
      if (nameEl) nameEl.innerText = "雲端同步失敗";
      if (unitEl) unitEl.innerText = "請確認 GAS 回傳";
      return;
    }

    const headers = Array.isArray(json.headers) ? json.headers : [];
    const rows = Array.isArray(json.rows) ? json.rows : (Array.isArray(json.data) ? json.data : []);

    if (!Array.isArray(rows) || rows.length === 0) {
      if (nameEl) nameEl.innerText = "查無資料";
      if (unitEl) unitEl.innerText = id;
      return;
    }

    let rowObj = null;
    for (const r of rows) {
      const obj = rowToObject_(r, headers);
      if (!obj) continue;
      const rid = String(obj.id || obj.ID || "").trim();
      if (rid === id) { rowObj = obj; break; }
    }

    if (!rowObj) {
      if (nameEl) nameEl.innerText = "找不到此序號";
      if (unitEl) unitEl.innerText = id;
      if (serviceEl) serviceEl.innerText = "請確認該列是否有填入 id（例如 TW0001）。";
      return;
    }

    // 依你試算表欄位（截圖 headers）取值
    const name = pick_(rowObj, ["姓名（名片大標題）", "姓名"], "（未填姓名）");
    const unit = pick_(rowObj, ["單位名稱（如：幸福教養概念館）", "單位"], "");
    const service = pick_(rowObj, ["服務項目（核心業務，多項可條列換行）", "服務項目"], "");
    const img = pick_(rowObj, ["個人專業形象照（名片主圖）", "形象照"], "");

    if (nameEl) nameEl.innerText = String(name);
    if (unitEl) unitEl.innerText = String(unit);
    if (serviceEl) serviceEl.innerText = String(service);

    // 圖片：多候選 fallback（如果仍不顯示，99% 是 Drive 權限未開）
    if (imgEl && img) setImgWithFallback_(imgEl, img);

  } catch (e) {
    console.error("loadCardDataFromListAPI_ error:", e);
    if (nameEl) nameEl.innerText = "雲端同步異常";
    if (unitEl) unitEl.innerText = "請稍後再試";
  }
}

// ------------------------ boot ------------------------
window.addEventListener("load", () => {
  // 先套用你 HTML body 預設 class（mode-free color-1 style-arch paper-1）
  applyV382();
  // 再抓雲端資料
  loadCardDataFromListAPI_();
});
