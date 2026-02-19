/**
 * Angel Card v385.1 — Stable Frontend app.js (Complete Overwrite)
 * Fixes:
 * - Works with BOTH GAS formats:
 *   A) action=card&id=TW0001 => {ok:true, data:{...}}
 *   B) action=list (or no action) => {ok:true, headers:[...], rows:[[...], ...]}  OR {ok:true, headers:[...], rows:[{...}, ...]}
 * - No-cache fetch to avoid SW/Chrome stale JS/data
 * - Google Drive image link normalization (open?id= / file/d/ / uc?id=)
 */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: ""
};

// ---------- helpers ----------
function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
function $(id) {
  return document.getElementById(id);
}
function setText(id, value) {
  const el = $(id);
  if (!el) return;
  const v = (value == null) ? "" : String(value);
  el.textContent = v.trim();
}
function setImg(id, url) {
  const el = $(id);
  if (!el) return;
  const u = normalizeDriveUrl(url);
  if (u) el.src = u;
}

// Google Drive link → direct view link
function normalizeDriveUrl(url) {
  if (!url) return "";
  let u = String(url).trim();
  if (!u) return "";

  // If multiple URLs separated by comma/newline, take first
  u = u.split(/\s*,\s*|\n+/)[0].trim();

  // already a direct uc
  if (u.includes("drive.google.com/uc?") || u.includes("googleusercontent.com")) return u;

  // open?id=FILEID
  const m1 = u.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;

  // file/d/FILEID/view
  const m2 = u.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;

  // uc?id=FILEID
  const m3 = u.match(/drive\.google\.com\/uc\?id=([^&]+)/i);
  if (m3) return `https://drive.google.com/uc?export=view&id=${m3[1]}`;

  return u;
}

async function fetchJsonNoStore(url) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });
  return await res.json();
}

// ---------- GAS adapters ----------
async function fetchCardObject(id, token) {
  // Try action=card first
  const urlCard = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
  try {
    const j = await fetchJsonNoStore(urlCard);
    if (j && j.ok && (j.data || j.row || j.card)) return (j.data || j.row || j.card);
    // Some deployments return {ok:false, error:"Unknown action"} etc.
  } catch (e) {
    // ignore & fallback
  }

  // Fallback to action=list (or default)
  const urlList = `${CONFIG.GAS}?action=list`;
  const j2 = await fetchJsonNoStore(urlList);

  if (!j2 || !j2.ok) throw new Error((j2 && (j2.error || j2.message)) || "GAS list failed");

  const headers = Array.isArray(j2.headers) ? j2.headers : [];
  const rows = Array.isArray(j2.rows) ? j2.rows : [];

  // Case 1: rows are objects
  if (rows.length && typeof rows[0] === "object" && !Array.isArray(rows[0])) {
    const found = rows.find(r => String(r.id || r.ID || r.Id || "").trim() === id);
    if (!found) throw new Error("ID not found in list");
    return found;
  }

  // Case 2: rows are arrays + headers
  if (!headers.length) throw new Error("No headers in list response");
  const idColIdx = headers.findIndex(h => String(h).trim().toLowerCase() === "id");
  if (idColIdx === -1) throw new Error("No id column in headers");

  const foundRow = rows.find(r => Array.isArray(r) && String(r[idColIdx] || "").trim() === id);
  if (!foundRow) throw new Error("ID not found in list");

  const obj = {};
  headers.forEach((h, i) => {
    const key = String(h || "").replace(/"/g, "").trim();
    if (key) obj[key] = foundRow[i];
  });
  return obj;
}

// ---------- render ----------
function renderCard(d) {
  // Your sheet headers are Chinese; keep both map + fallback
  const name = d["姓名（名片大標題）"] || d["姓名"] || d["name"] || "（未填姓名）";
  const unit = d["單位名稱（如：幸福教養概念館）"] || d["單位"] || d["unit"] || "";
  const service = d["服務項目（核心業務，多項可條列換行）"] || d["服務項目"] || d["service"] || "";

  const avatar = d["個人專業形象照（名片主圖）"] || d["形象照"] || d["avatar"] || d["photo"] || "";

  setText("u-name", name);
  setText("u-unit", unit);
  setText("u-service", service);
  setImg("u-img", avatar);
}

async function boot() {
  const id = qs("id") || CONFIG.DEFAULT_ID;
  const token = qs("token") || CONFIG.DEFAULT_TOKEN;

  // Basic placeholders (avoid blank look)
  setText("u-name", "載入中…");
  setText("u-unit", "");
  setText("u-service", "");

  try {
    const obj = await fetchCardObject(id, token);
    renderCard(obj);
  } catch (e) {
    console.error(e);
    setText("u-name", "讀取失敗");
    setText("u-unit", "請確認 GAS / 權限 / id");
    setText("u-service", String(e && e.message ? e.message : e));
  }
}

window.addEventListener("load", boot);
