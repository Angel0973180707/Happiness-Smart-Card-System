/* ================================
 * Happiness Smart Card System — app.js (v399 COMPLETE OVERWRITE) 3/3
 * FIXED in v399:
 * 1️⃣ LINE 永遠顯示（好友 / 官網）
 * 2️⃣ Logo 正常顯示（u-logo）
 * 3️⃣ 精品姓名右側布局相容
 * 4️⃣ 隱形後臺入口（三擊右下角）
 * 5️⃣ 後臺交貨流程（開 share.html?id=）
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform",
  DEFAULT_ID: "TW0001",
  ADMIN_PASS: "angel",
};

/* ========= 全域狀態 ========= */

let state = {
  mode: "free",
  theme: "color-1",
  style: "arch",
  paper: "paper-1",
};

let tapCounter = 0;
let tapTimer = null;

/* ========= 啟動 ========= */

boot();

async function boot() {
  bindHiddenAdminEntry();
  const id = getIdFromUrl() || CONFIG.DEFAULT_ID;
  await loadCard(id);
}

/* ========= URL ========= */

function getIdFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get("id");
}

function normalizeId(id) {
  if (!id) return CONFIG.DEFAULT_ID;
  return id.trim().toUpperCase();
}

/* ========= 主讀取 ========= */

async function loadCard(id) {

  const cid = normalizeId(id);

  try {
    const url = `${CONFIG.GAS}?action=card&id=${cid}&ts=${Date.now()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.ok === false) throw new Error("bad payload");

    renderCard(data);

  } catch (err) {
    console.warn("loadCard fail", err);
  }
}

/* ========= 畫面渲染 ========= */

function renderCard(row) {

  const nameEl = document.getElementById("u-name");
  const unitEl = document.getElementById("u-unit");
  const titleEl = document.getElementById("u-title");
  const sloganEl = document.getElementById("u-slogan");
  const avatarEl = document.getElementById("u-img");
  const logoEl = document.getElementById("u-logo");

  nameEl.textContent = row.name || "";
  unitEl.textContent = row.unit || "";
  titleEl.textContent = row.title || "";
  sloganEl.textContent = row.slogan || "";

  if (row.avatar_img) avatarEl.src = row.avatar_img;

  /* ✅ v399 FIX: Logo */
  if (row.logo_img) {
    logoEl.src = row.logo_img;
    document.getElementById("logoWrap").style.display = "block";
  }

  renderContacts(row);
  renderPhotos(row);
}

/* ========= 聯繫區（重點修正 LINE） ========= */

function renderContacts(row) {

  const wrap = document.getElementById("contactButtons");
  wrap.innerHTML = "";

  /* ✅ LINE 好友 */
  const line = row.line || row.line_id || row.line好友;
  if (line) wrap.appendChild(makeBtn("LINE 好友", `https://line.me/R/ti/p/${line}`, "fa-brands fa-line"));

  /* ✅ LINE 官網 */
  const lineOa = row.line_oa || row.line官方 || row.line_official;
  if (lineOa) wrap.appendChild(makeBtn("LINE 官網", lineOa, "fa-solid fa-globe"));

  if (!wrap.innerHTML) document.getElementById("contactDock").style.display = "none";
  else document.getElementById("contactDock").style.display = "block";
}

function makeBtn(label, url, icon) {
  const btn = document.createElement("button");
  btn.className = "dock-btn";
  btn.innerHTML = `<i class="${icon}"></i>${label}`;
  btn.onclick = () => window.open(url, "_blank");
  return btn;
}

/* ========= 照片牆 ========= */

function renderPhotos(row) {

  const grid = document.getElementById("photoGrid");
  grid.innerHTML = "";

  const arr = row.photos_img || row.photos || [];

  arr.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.onclick = () => window.open(url, "_blank");
    grid.appendChild(img);
  });

  document.getElementById("photoWall").style.display =
    arr.length ? "block" : "none";
}

/* ========= 方案切換 ========= */

window.setV382 = function(mode, theme, el) {

  state.mode = mode;

  document.body.className =
    `mode-${mode} ${theme} style-${state.style} ${state.paper}`;

  syncActive(el);
};

window.setV382Style = function(style, el) {
  state.style = style;
  document.body.className =
    `mode-${state.mode} ${state.theme} style-${style} ${state.paper}`;
  syncActive(el);
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  document.body.className =
    `mode-${state.mode} ${state.theme} style-${state.style} ${paper}`;
  syncActive(el);
};

function syncActive(el) {
  if (!el) return;
  const group = el.parentNode.querySelectorAll(".btn-neo");
  group.forEach(b => b.classList.remove("active"));
  el.classList.add("active");
}

/* ========= 按鈕 ========= */

window.goFillForm = function() {
  window.open(CONFIG.FORM, "_blank");
};

window.copyCardUrl = function() {
  navigator.clipboard.writeText(location.href);
};

/* ========= 隱形後臺（三擊右下角） ========= */

function bindHiddenAdminEntry() {

  const tag = document.getElementById("versionTag");

  tag.addEventListener("click", () => {

    tapCounter++;

    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => tapCounter = 0, 900);

    if (tapCounter >= 3) {

      const pass = prompt("Admin Pass");
      if (pass === CONFIG.ADMIN_PASS) {
        const id = getIdFromUrl() || CONFIG.DEFAULT_ID;
        window.open(`share.html?id=${id}`, "_blank");
      }

      tapCounter = 0;
    }
  });
}