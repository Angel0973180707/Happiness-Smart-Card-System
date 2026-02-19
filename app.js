/* =========================================================
 * 幸福智慧名片｜app.js（Complete Overwrite）
 * 目的：對接你目前的 GAS v1.1（action=list）並從整表撈出指定 id 的一筆資料
 * 用法：
 *   - 名片網址可帶參數：index.html?id=TW0001
 *   - 不帶 id 時使用 CONFIG.ANGEL
 * ========================================================= */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

// ------------------------ helpers ------------------------
function qs_(sel) { return document.querySelector(sel); }
function byId_(id) { return document.getElementById(id); }

function getIdFromUrl_() {
  try {
    const u = new URL(location.href);
    return (u.searchParams.get("id") || CONFIG.ANGEL || "TW0001").trim();
  } catch (e) {
    return (CONFIG.ANGEL || "TW0001").trim();
  }
}

/** Google Drive 圖片連結轉「可直接顯示」的 URL（open?id= / file/d/ 皆支援） */
function driveToDirectImageUrl_(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  let id = "";
  const m1 = s.match(/[?&]id=([^&]+)/);
  const m2 = s.match(/\/d\/([^/]+)/);
  if (m1) id = m1[1];
  else if (m2) id = m2[1];
  if (!id) return s;
  return `https://drive.google.com/uc?export=view&id=${id}`;
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

// ------------------------ UI actions ------------------------
window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

// ------------------------ main loader ------------------------
async function loadCardDataFromListAPI_() {
  const id = getIdFromUrl_();

  // UI placeholder
  const nameEl = byId_("u-name");
  const unitEl = byId_("u-unit");
  const serviceEl = byId_("u-service");
  const imgEl = byId_("u-img");

  if (nameEl) nameEl.innerText = "載入中...";
  if (unitEl) unitEl.innerText = "同步中...";

  try {
    // 你目前的 GAS 是 v1.1：action=list
    const url = `${CONFIG.GAS}?action=list`;
    const res = await fetch(url, { cache: "no-store" });
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
      console.warn("No rows in list");
      if (nameEl) nameEl.innerText = "查無資料";
      if (unitEl) unitEl.innerText = id;
      return;
    }

    // 找到 id 對應那一筆
    let rowObj = null;
    for (const r of rows) {
      const obj = rowToObject_(r, headers);
      if (!obj) continue;
      const rid = String(obj.id || obj.ID || "").trim();
      if (rid === id) { rowObj = obj; break; }
    }

    if (!rowObj) {
      console.warn("Row not found, id=", id);
      if (nameEl) nameEl.innerText = "找不到此序號";
      if (unitEl) unitEl.innerText = id;
      if (serviceEl) serviceEl.innerText = "請確認試算表該列是否有填入 id（例如 TW0001）。";
      return;
    }

    // 依照你截圖的 headers（長中文欄名）取值
    const name = pick_(rowObj, ["姓名（名片大標題）", "姓名"], "（未填姓名）");
    const unit = pick_(rowObj, ["單位名稱（如：幸福教養概念館）", "單位"], "");
    const service = pick_(rowObj, ["服務項目（核心業務，多項可條列換行）", "服務項目"], "");
    const img = pick_(rowObj, ["個人專業形象照（名片主圖）", "形象照"], "");

    if (nameEl) nameEl.innerText = String(name);
    if (unitEl) unitEl.innerText = String(unit);
    if (serviceEl) serviceEl.innerText = String(service);

    if (imgEl) {
      const src = driveToDirectImageUrl_(img);
      if (src) imgEl.src = src;
    }

  } catch (e) {
    console.error("loadCardDataFromListAPI_ error:", e);
    if (byId_("u-name")) byId_("u-name").innerText = "雲端同步異常";
    if (byId_("u-unit")) byId_("u-unit").innerText = "請稍後再試";
  }
}

// 頁面載入即跑
window.addEventListener("load", () => {
  loadCardDataFromListAPI_();
});
