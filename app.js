/* ================================================
 * Happiness Smart Card System — app.js (v400 COMPLETE)
 * Part A: Config, States, and Robust Helpers
 * ================================================ */

const CONFIG = {
  VERSION: "400.0",
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,
  ADMIN_TRIPLETAP_WINDOW: 650,
  PHOTO_SLOT_MAX: 20,
  DEBUG: true
};

let state = { 
  mode: "free", 
  theme: "color-1", 
  style: "arch", 
  paper: "paper-1",
  resolvedId: CONFIG.DEFAULT_ID 
};

// 基礎 DOM 工具
const $ = (id) => document.getElementById(id);
const qa = (sel) => Array.from(document.querySelectorAll(sel));
const text = (v) => (v == null ? "" : String(v)).trim();
const log = () => CONFIG.DEBUG && console.log("[HSC-v400]", ...arguments);

function setText(id, v) {
  const el = $(id);
  if (el) el.textContent = text(v);
}

// 取得參數
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// 序號正規化
function normalizeId(s) {
  const v = text(s).toUpperCase();
  if (!v) return "";
  if (/^TW\d{4}$/.test(v)) return v;
  if (/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if (/^TW\d{1,4}$/i.test(v)) {
    return "TW" + v.replace(/^TW/i, "").padStart(4, "0");
  }
  return v;
}

// 健壯的資料抓取
async function fetchJsonRobust(url) {
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      const body = await res.text();
      clearTimeout(t);
      return JSON.parse(body.match(/\{[\s\S]*\}/)[0]);
    } catch (e) {
      if (i === CONFIG.RETRY) throw e;
      await new Promise(r => setTimeout(r, 500 + i * 500));
    }
  }
}

// 圖片處理工具
function normalizeImageUrl(raw) {
  if (!raw) return "";
  let url = text(raw);
  if (url.includes("dropbox.com")) return url.replace("dl=0", "raw=1");
  const driveId = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  if (driveId) return `https://drive.google.com/uc?export=view&id=${driveId[1]}`;
  return url;
}
/* ================================================
 * Happiness Smart Card System — app.js (v400 COMPLETE)
 * Part B: Data Rendering & Flow Control
 * ================================================ */

// 資料正規化與選取 (Pick)
function buildNormalizedPayload(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const lower = {};
  for (let k in obj) { lower[k.trim().toLowerCase()] = obj[k]; }
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

// 核心渲染：根據 v400 排序邏輯填入資料
function applyDataToCard(payload) {
  const p = buildNormalizedPayload(payload);
  
  // 1. 取得基礎資料
  const name    = pick(p, ["姓名", "name"]);
  const unit    = pick(p, ["單位", "unit"]);
  const title   = pick(p, ["頭銜", "職稱", "title"]);
  const service = pick(p, ["服務項目", "service"]);
  const exp     = pick(p, ["經歷", "experience"]);
  const avatar  = pick(p, ["個人照", "形象照", "avatar"]);
  const logo    = pick(p, ["logo", "品牌logo"]);

  // 2. 姓名與單位頭銜處理 (自由款 vs 精品款)
  // 自由款：單位在 Banner，姓名與頭銜在下方
  setText("u-unit-banner", unit);
  setText("u-name-free", name);
  
  // 精品款：頭像姓名並列，單位在姓名下方
  setText("u-name-premium", name);
  setText("u-unit-main", unit);
  
  // 共同：頭銜
  setText("u-title", title);

  // 3. 圖片處理 (自由款與精品款頭像同步更新)
  const avatarUrl = normalizeImageUrl(avatar);
  const avatarCands = [avatarUrl, avatarUrl + "&sz=w500"].filter(Boolean);
  if (avatarUrl) {
    setImgWithFallback($("u-img-free"), avatarCands);
    setImgWithFallback($("u-img-premium"), avatarCands);
  }

  // 4. Logo 渲染 (根據要求：自由款放在頭銜下方，精品款在右上)
  const logoUrl = normalizeImageUrl(logo);
  const logoImg = $("u-logo");
  if (logoUrl) {
    $("logoWrap").style.display = "flex";
    setImgWithFallback(logoImg, [logoUrl]);
    // v400 自由款額外邏輯：複製一份到內容流中 (若需要)
    const midLogo = $("logo-mid-wrap");
    if (midLogo) {
      midLogo.innerHTML = `<img src="${logoUrl}" class="logo-img" style="margin: 0 auto;">`;
    }
  } else {
    $("logoWrap").style.display = "none";
  }

  // 5. 服務項目與經歷 (Block)
  renderInfoBlock("block-service", "服務項目", service);
  renderInfoBlock("block-exp", "經歷", exp);

  // 6. 照片牆
  renderPhotoWall(p);

  // 7. 聯絡與平台連結
  renderContactDock(p);
}

// 區塊渲染工具
function renderInfoBlock(id, title, body) {
  const el = $(id);
  if (!el || !text(body)) {
    if (el) el.style.display = "none";
    return;
  }
  el.style.display = "block";
  el.innerHTML = `<div class="block-title">${title}</div><div class="block-body preline">${body}</div>`;
}

// 圖片落實工具
function setImgWithFallback(imgEl, list) {
  if (!imgEl || !list.length) return;
  let idx = 0;
  const tryLoad = () => {
    if (idx >= list.length) return;
    imgEl.src = list[idx++] + "?t=" + Date.now();
  };
  imgEl.onerror = tryLoad;
  tryLoad();
}
/* ================================================
 * Happiness Smart Card System — app.js (v400 COMPLETE)
 * Part C: Final Rendering & Admin Engine
 * ================================================ */

// 8. 照片牆渲染
function renderPhotoWall(p) {
  const grid = $("photoGrid");
  if (!grid) return;
  grid.innerHTML = "";
  let count = 0;
  for (let i = 1; i <= CONFIG.PHOTO_SLOT_MAX; i++) {
    const url = normalizeImageUrl(pick(p, [`照片${i}`, `photo${i}`]));
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      img.onclick = () => window.open(url, "_blank");
      grid.appendChild(img);
      count++;
    }
  }
  $("photoWall").style.display = count > 0 ? "block" : "none";
}

// 9. 聯繫與社群按鈕渲染 (Dock)
function renderContactDock(p) {
  const socialBar = $("socialButtons");
  const contactBar = $("contactButtons");
  if (!socialBar || !contactBar) return;
  socialBar.innerHTML = "";
  contactBar.innerHTML = "";

  const links = [
    { key: ["line"], icon: "fa-brands fa-line", label: "LINE", type: "contact" },
    { key: ["電話", "phone"], icon: "fa-solid fa-phone", label: "電話", type: "contact" },
    { key: ["fb", "facebook"], icon: "fa-brands fa-facebook", label: "FB", type: "social" },
    { key: ["ig", "instagram"], icon: "fa-brands fa-instagram", label: "IG", type: "social" },
    { key: ["yt", "youtube"], icon: "fa-brands fa-youtube", label: "YouTube", type: "social" },
    { key: ["tiktok"], icon: "fa-brands fa-tiktok", label: "TikTok", type: "social" },
    { key: ["官網", "website"], icon: "fa-solid fa-globe", label: "官網", type: "social" }
  ];

  links.forEach(item => {
    let val = pick(p, item.key);
    if (!val) return;
    
    let href = val;
    if (item.label === "LINE" && !val.includes("http")) href = `https://line.me/ti/p/${val}`;
    if (item.label === "電話" && !val.includes("tel:")) href = `tel:${val}`;

    const btn = document.createElement("button");
    btn.className = "dock-btn";
    btn.type = "button";
    btn.innerHTML = `<i class="${item.icon}"></i> <span>${item.label}</span>`;
    btn.onclick = () => window.open(href, "_blank");

    if (item.type === "social") socialBar.appendChild(btn);
    else contactBar.appendChild(btn);
  });
}

// 10. 模式與風格控制核心 (v400 動態切換)
window.setV382 = function(mode, theme, btn) {
  state.mode = mode;
  state.theme = theme;
  document.body.className = `mode-${mode} ${theme} style-${state.style} ${state.paper}`;
  
  // 切換按鈕狀態
  if (btn && btn.classList.contains("pill")) {
    qa(".btn-neo.pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  
  // 同步色點
  const isFree = mode === "free";
  $("freeDotsRow").style.display = isFree ? "flex" : "none";
  $("premiumDotsRow").style.display = isFree ? "none" : "flex";
  $("free-controls").style.display = isFree ? "block" : "none";
  
  log(`Switch to ${mode} mode with ${theme}`);
};

window.setV382Style = function(sty, btn) {
  state.style = sty;
  window.setV382(state.mode, state.theme);
  if (btn) {
    const row = btn.parentElement;
    Array.from(row.children).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
};

window.setV382Paper = function(pap, btn) {
  state.paper = pap;
  window.setV382(state.mode, state.theme);
  if (btn) {
    const row = btn.parentElement;
    Array.from(row.children).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
};

// 11. 隱形入口：三擊觸發
let lastTap = 0;
let tapCount = 0;
$("adminHotspotTop").addEventListener("click", (e) => {
  const now = Date.now();
  if (now - lastTap < CONFIG.ADMIN_TRIPLETAP_WINDOW) {
    tapCount++;
  } else {
    tapCount = 1;
  }
  lastTap = now;
  if (tapCount >= 3) {
    const panel = $("admin-panel");
    panel.style.display = (panel.style.display === "block") ? "none" : "block";
    tapCount = 0;
  }
});

// 12. 分享名片功能
window.copyCardUrl = function() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert("名片連結已複製，可直接分享給好友！");
  }).catch(() => {
    alert("請複製網址列連結進行分享");
  });
};

window.goFillForm = function() { window.open(CONFIG.FORM, "_blank"); };

// 13. 初始化啟動
async function initV400() {
  const queryId = getParam("id") || getParam("ID");
  state.resolvedId = normalizeId(queryId || CONFIG.DEFAULT_ID);
  
  try {
    const data = await fetchJsonRobust(`${CONFIG.GAS}?id=${state.resolvedId}`);
    if (data && data.success !== false) {
      applyDataToCard(data);
    } else {
      alert("查無此序號資料，將顯示預設名片。");
      const defaultData = await fetchJsonRobust(`${CONFIG.GAS}?id=${CONFIG.DEFAULT_ID}`);
      applyDataToCard(defaultData);
    }
  } catch (err) {
    console.error("Init Error:", err);
  }
}

document.addEventListener("DOMContentLoaded", initV400);
