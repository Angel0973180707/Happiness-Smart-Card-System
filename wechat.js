/* wechat.js — v491 (COMPLETE OVERWRITE)
 * - Compatible with GAS response: { ok:true, id:"TW0001", data:{...} }
 * - Robust field mapping (supports both snake_case English and legacy Chinese headers)
 * - Prefer *_fast images first
 * - Generate QR code that points to index.html?id=...
 * - Render DOM poster to PNG via html2canvas
 */

const CONFIG = {
  VERSION: "v491",
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  BASE: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  INDEX: "index.html",
  FETCH_TIMEOUT_MS: 12000,
};

const $ = (id) => document.getElementById(id);
const qs = (k) => new URLSearchParams(location.search).get(k);

function normalizeId(id) {
  return String(id || "").trim().toUpperCase();
}

function buildIndexUrl(id) {
  const base = CONFIG.BASE.endsWith("/") ? CONFIG.BASE : (CONFIG.BASE + "/");
  return base + CONFIG.INDEX + "?id=" + encodeURIComponent(id);
}

function pick(obj, keys, fallback = "") {
  for (const k of keys) {
    const v = obj && obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return fallback;
}

function setText(id, txt) {
  const el = $(id);
  if (!el) return;
  el.textContent = (txt === undefined || txt === null || String(txt).trim() === "") ? "—" : String(txt);
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    const txt = await res.text();
    let j = null;
    try { j = JSON.parse(txt); } catch (_) {}
    if (!res.ok) throw new Error("HTTP " + res.status + " " + (txt || ""));
    if (!j || typeof j !== "object") throw new Error("Invalid JSON");
    return j;
  } finally {
    clearTimeout(t);
  }
}

function safeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  // Prefer https
  if (s.startsWith("http://")) return "https://" + s.slice(7);
  if (/^www\./i.test(s)) return "https://" + s;
  return s;
}

function loadAvatar(url) {
  const box = $("avatarBox");
  if (!box) return;
  const u = safeUrl(url);
  if (!u) return;

  const img = new Image();
  img.referrerPolicy = "no-referrer";
  img.onload = () => {
    box.innerHTML = "";
    box.appendChild(img);
  };
  img.onerror = () => {};
  img.src = u;
}

function setBlockVisible(blockId, text) {
  const blk = $(blockId);
  if (!blk) return;
  const t = String(text || "").trim();
  if (!t) blk.classList.add("hidden");
  else blk.classList.remove("hidden");
}

function makeQr(containerId, text) {
  const box = $(containerId);
  if (!box) return;

  box.innerHTML = "";
  // qrcode lib
  QRCode.toCanvas(text, { width: 110, margin: 1 }, (err, canvas) => {
    if (err) {
      box.textContent = "QR 失敗";
      return;
    }
    box.appendChild(canvas);
  });
}

async function renderPosterToPng() {
  const poster = $("poster");
  const outWrap = $("outImg");
  const outImg = $("outPng");
  if (!poster || !outWrap || !outImg) return;

  // Render (higher scale for better sharpness)
  const canvas = await html2canvas(poster, {
    backgroundColor: null,
    scale: Math.min(2.2, window.devicePixelRatio ? (window.devicePixelRatio + 0.6) : 2),
    useCORS: true,
    allowTaint: true
  });

  const dataUrl = canvas.toDataURL("image/png", 1.0);
  outImg.src = dataUrl;
  outWrap.classList.remove("hidden");

  // Hint: long-press save
  outWrap.scrollIntoView({ behavior: "smooth", block: "start" });
}

function copyText(text) {
  const t = String(text || "").trim();
  if (!t) return Promise.resolve(false);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(t).then(() => true).catch(() => false);
  }
  // fallback prompt
  prompt("請手動複製：", t);
  return Promise.resolve(true);
}

// =========================
// Main
// =========================
(async function main() {
  const id = normalizeId(qs("id") || qs("card") || "TW0001");
  $("chipId").textContent = "ID：" + id;

  const api = CONFIG.GAS + "?action=card&id=" + encodeURIComponent(id) + "&ts=" + Date.now();
  const indexUrl = buildIndexUrl(id);

  // Buttons
  $("btnOpenCard").addEventListener("click", () => location.href = indexUrl);
  $("btnCopy").addEventListener("click", async () => {
    const ok = await copyText(indexUrl);
    if (ok) $("btnCopy").querySelector("small").textContent = "Copied";
    setTimeout(() => $("btnCopy").querySelector("small").textContent = "Copy", 1200);
  });
  $("btnMake").addEventListener("click", async () => {
    $("btnMake").querySelector("small").textContent = "Working…";
    try {
      await renderPosterToPng();
      $("btnMake").querySelector("small").textContent = "Done";
    } catch (e) {
      $("btnMake").querySelector("small").textContent = "Error";
      alert("產生圖片失敗：" + String(e && e.message ? e.message : e));
    } finally {
      setTimeout(() => $("btnMake").querySelector("small").textContent = "PNG", 1200);
    }
  });

  try {
    const json = await fetchJson(api);
    if (!json.ok) throw new Error(json.error || "API ok=false");

    const card = json.data || {};

    // ---- Field mapping (robust) ----
    const name   = pick(card, ["name", "姓名"], "（未填姓名）");
    const unit   = pick(card, ["unit", "單位"], "");
    const title  = pick(card, ["title", "頭銜"], "");
    const slogan = pick(card, ["slogan", "理念標語"], "");
    const service = pick(card, ["service", "服務項目"], "");
    const exp    = pick(card, ["experience", "經歷"], "");

    const phone  = pick(card, ["phone", "電話"], "");
    const email  = pick(card, ["email", "Email"], "");
    const line   = pick(card, ["line_oa", "LINE官方帳號", "line_url", "LINE連結"], "");
    const wechat = pick(card, ["wechat_id", "微信ID", "微信"], "");

    // Images (prefer fast first)
    const avatar = pick(card, [
      "avatar_fast", "avatar_img_fast", "個人照_fast",
      "avatar_img", "個人照"
    ], "");

    // ---- Fill UI ----
    setText("uName", name);
    setText("uLine2", [unit, title].filter(Boolean).join("｜") || "—");
    setText("uLine3", "狀態：" + pick(card, ["status","狀態"], "—"));

    setText("uSlogan", slogan || "—");
    setText("uService", service || "—");
    setText("uExp", exp || "—");

    setText("uPhone", phone || "—");
    setText("uEmail", email || "—");
    setText("uLine", line || "—");
    setText("uWeChat", wechat || "—");

    setBlockVisible("blkSlogan", slogan);
    setBlockVisible("blkService", service);
    setBlockVisible("blkExp", exp);

    loadAvatar(avatar);

    // QR -> index url
    makeQr("qrBox", indexUrl);
    setText("qrLink", indexUrl);

    // Title
    document.title = `${name}｜WeChat Poster`;

  } catch (err) {
    alert("讀取名片失敗：" + String(err && err.message ? err.message : err));
    // Still show QR for index
    makeQr("qrBox", indexUrl);
    setText("qrLink", indexUrl);
  }
})();