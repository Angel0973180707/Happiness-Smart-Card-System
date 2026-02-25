/* ============================================================
 * Happiness Smart Card System — app.js (v400 FULL OVERWRITE)
 * 1. 核心邏輯：支援三擊隱形入口、序號/姓名自動識別
 * 2. 排版控制：實現自由款與精品款雙重 DOM 渲染
 * 3. 健壯系統：自動修復 Google Drive 圖片連結、超時重試
 * ============================================================ */

const CONFIG = {
  VERSION: "400.0",
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,
  ADMIN_TRIPLETAP_WINDOW: 650,
  PHOTO_SLOT_MAX: 20
};

let state = {
  mode: "free",
  theme: "color-1",
  style: "arch",
  paper: "paper-1",
  resolvedId: CONFIG.DEFAULT_ID
};

// --- 基礎工具 ---
const $ = (id) => document.getElementById(id);
const qa = (sel) => Array.from(document.querySelectorAll(sel));
const text = (v) => (v == null ? "" : String(v)).trim();

function setText(id, v) {
  const el = $(id);
  if (el) el.textContent = text(v);
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// 序號正規化 (如: 0001 -> TW0001)
function normalizeId(s) {
  let v = text(s).toUpperCase();
  if (!v) return "";
  if (/^TW\d{4}$/.test(v)) return v;
  if (/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if (/^TW\d{1,4}$/i.test(v)) {
    return "TW" + v.replace(/^TW/i, "").padStart(4, "0");
  }
  return v;
}

// 圖片連結修復邏輯
function normalizeImageUrl(raw) {
  if (!raw) return "";
  let url = text(raw);
  if (url.includes("dropbox.com")) return url.replace("dl=0", "raw=1");
  
  // 處理 Google Drive 連結
  const driveId = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  if (driveId) return `https://drive.google.com/uc?export=view&id=${driveId[1]}`;
  
  return url;
}

// --- 資料抓取與渲染 ---

async function fetchJsonRobust(url) {
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      const body = await res.text();
      clearTimeout(t);
      // 利用正則抓取 JSON 內容
      const match = body.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("No JSON found");
    } catch (e) {
      if (i === CONFIG.RETRY) throw e;
      await new Promise(r => setTimeout(r, 600 + i * 500));
    }
  }
}

function buildNormalizedPayload(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const lower = {};
  for (let k in obj) {
    const cleanK = k.replace(/[\uFEFF\u200B-\u200D\u2060]/g, "").trim().toLowerCase();
    lower[cleanK] = obj[k];
  }
  return { __raw: obj, __lower: lower };
}

function pick(p, keys) {
  if (!p) return "";
  for (let k of keys) {
    const v = p.__lower[k.toLowerCase()];
    if (v != null && String(v).trim() !== "") return v;
  }
  return "";
}

// 核心渲染：落實 v400 要求的所有排序與模式位置
function applyDataToCard(payload) {
  const p = buildNormalizedPayload(payload);
  
  const name    = pick(p, ["姓名", "name"]);
  const unit    = pick(p, ["單位", "unit"]);
  const title   = pick(p, ["頭銜", "職稱", "title"]);
  const service = pick(p, ["服務項目", "service", "經營項目"]);
  const exp     = pick(p, ["經歷", "experience", "簡歷"]);
  const avatar  = pick(p, ["個人照", "形象照", "avatar", "photo"]);
  const logo    = pick(p, ["logo", "品牌logo", "商標"]);

  // 1. 模式資料分發
  // 自由款：單位在 Banner
  setText("u-unit-banner", unit);
  setText("u-name-free", name || "（請設定姓名）");
  
  // 精品款：單位在內容區
  setText("u-name-premium", name || "（請設定姓名）");
  setText("u-unit-main", unit);
  
  setText("u-title", title);

  // 2. 圖片處理 (自由/精品同步)
  const avatarUrl = normalizeImageUrl(avatar);
  if (avatarUrl) {
    const cands = [avatarUrl, avatarUrl + "&sz=w600"];
    setImgWithFallback($("u-img-free"), cands);
    setImgWithFallback($("u-img-premium"), cands);
  }

  // 3. Logo 處理：自由款置於頭銜下方
  const logoUrl = normalizeImageUrl(logo);
  if (logoUrl) {
    $("logoWrap").style.display = "flex";
    setImgWithFallback($("u-logo"), [logoUrl]);
    const midLogo = $("logo-mid-wrap");
    if (midLogo) midLogo.innerHTML = `<img src="${logoUrl}" class="logo-img">`;
  } else {
    $("logoWrap").style.display = "none";
  }

  // 4. 服務與經歷
  renderInfoBlock("block-service", "服務項目", service);
  renderInfoBlock("block-exp", "經歷", exp);

  // 5. 照片牆
  renderPhotoWall(p);

  // 6. Dock 按鈕
  renderContactDock(p);
}

function renderInfoBlock(id, title, body) {
  const el = $(id);
  if (!el) return;
  const content = text(body);
  if (!content) { el.style.display = "none"; return; }
  el.style.display = "block";
  el.innerHTML = `<div class="block-title">${title}</div><div class="block-body preline">${content}</div>`;
}

function renderPhotoWall(p) {
  const grid = $("photoGrid");
  if (!grid) return;
  grid.innerHTML = "";
  let count = 0;
  for (let i = 1; i <= CONFIG.PHOTO_SLOT_MAX; i++) {
    const url = normalizeImageUrl(pick(p, [`照片${i}`, `photo${i}`, `圖片${i}`]));
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.onclick = () => window.open(url, "_blank");
      grid.appendChild(img);
      count++;
    }
  }
  $("photoWall").style.display = count > 0 ? "block" : "none";
}

function renderContactDock(p) {
  const socialBar = $("socialButtons");
  const contactBar = $("contactButtons");
  if (!socialBar || !contactBar) return;
  socialBar.innerHTML = "";
  contactBar.innerHTML = "";

  const links = [
    { keys: ["line官網", "line oa", "line_oa"], icon: "fa-solid fa-building-circle-check", label: "LINE官網", type: "contact" },
    { keys: ["line"], icon: "fa-brands fa-line", label: "LINE", type: "contact" },
    { keys: ["微信", "wechat"], icon: "fa-brands fa-weixin", label: "微信", type: "contact" },
    { keys: ["電話", "手機", "phone"], icon: "fa-solid fa-phone", label: "電話", type: "contact" },
    { keys: ["email", "郵件"], icon: "fa-solid fa-envelope", label: "Email", type: "contact" },
    { keys: ["地址", "導航", "location"], icon: "fa-solid fa-location-dot", label: "導航", type: "contact" },
    { keys: ["影音社群平台", "youtube", "ig", "tiktok", "fb"], icon: "fa-solid fa-display", label: "影音平台", type: "social" }
  ];

  links.forEach(item => {
    let val = pick(p, item.keys);
    if (!val) return;
    let href = val;
    if (item.label === "電話") href = `tel:${val.replace(/[^\d+]/g, "")}`;
    if (item.label === "導航") href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`;
    if (!href.startsWith("http") && !href.startsWith("tel")) href = "https://" + href;

    const btn = document.createElement("button");
    btn.className = "dock-btn";
    btn.innerHTML = `<i class="${item.icon}"></i> <span>${item.label}</span>`;
    btn.onclick = () => window.open(href, "_blank");

    if (item.type === "social") socialBar.appendChild(btn);
    else contactBar.appendChild(btn);
  });
}

function setImgWithFallback(el, list) {
  if (!el || !list.length) return;
  let idx = 0;
  const load = () => {
    if (idx >= list.length) return;
    el.src = list[idx++] + (list[idx-1].includes("?") ? "&" : "?") + "v=" + Date.now();
  };
  el.onerror = load;
  load();
}

// --- 介面控制 ---

window.setV382 = function(mode, theme, btn) {
  state.mode = mode;
  state.theme = theme;
  document.body.className = `mode-${mode} ${theme} style-${state.style} ${state.paper}`;
  
  if (btn) {
    qa(".btn-neo.pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  
  const isFree = (mode === "free");
  $("freeDotsRow").style.display = isFree ? "flex" : "none";
  $("premiumDotsRow").style.display = isFree ? "none" : "flex";
  $("free-controls").style.display = isFree ? "block" : "none";
};

window.setV382Style = (sty, btn) => {
  state.style = sty;
  window.setV382(state.mode, state.theme);
  if (btn) {
    qa(btn.parentElement.children).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
};

window.setV382Paper = (pap, btn) => {
  state.paper = pap;
  window.setV382(state.mode, state.theme);
  if (btn) {
    qa(btn.parentElement.children).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
};

// 三擊隱形入口
let lastTap = 0, tapCount = 0;
$("adminHotspotTop").addEventListener("click", () => {
  const now = Date.now();
  if (now - lastTap < CONFIG.ADMIN_TRIPLETAP_WINDOW) tapCount++;
  else tapCount = 1;
  lastTap = now;
  if (tapCount >= 3) {
    const p = $("admin-panel");
    p.style.display = (p.style.display === "block") ? "none" : "block";
    tapCount = 0;
  }
});

window.copyCardUrl = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    alert("名片連結已複製！");
  } catch {
    alert("請手動複製網址列連結");
  }
};

window.goFillForm = () => window.open(CONFIG.FORM, "_blank");

// --- 啟動 ---

async function bootV400() {
  const qId = normalizeId(getParam("id") || getParam("ID"));
  state.resolvedId = qId || CONFIG.DEFAULT_ID;
  
  // 顯示載入動畫
  setText("u-name-free", "同步資料中...");
  setText("u-name-premium", "同步資料中...");

  try {
    const data = await fetchJsonRobust(`${CONFIG.GAS}?id=${state.resolvedId}`);
    if (data && data.ok !== false) {
      applyDataToCard(data);
    } else {
      throw new Error("No data");
    }
  } catch (err) {
    console.error(err);
    setText("u-name-free", "連線失敗，請檢查網路");
  }
}

document.addEventListener("DOMContentLoaded", bootV400);
