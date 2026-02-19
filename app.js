/**
 * 幸福智慧名片 V382.6
 * 邏輯核心：狀態連動與全量 Class 重構
 */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = {
  mode: 'free',
  theme: 'color-1',
  style: 'arch',
  paper: 'paper-1'
};

// 🟢 切換顏色/模式 (自由5色/精品7色)
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  applyV382();
};

// 🟢 切換版型 (正拱/平直/晨曦)
window.setV382Style = function(style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382();
};

// 🟢 切換紙感
window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382();
};

/**
 * 核心應用函數
 * 確保每一次點擊都徹底刷新 body 的 className
 */
function applyV382() {
  const isFree = state.mode === 'free';
  const controlPanel = document.getElementById('free-controls');
  if (controlPanel) controlPanel.style.display = isFree ? 'block' : 'none';

  // 構造 Class 列表
  const classes = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];

  // 清除並重新賦予 body 類別，防止精品款樣式殘留
  document.body.className = classes.filter(Boolean).join(' ');
  
  updateThemeColor();
}

// 🟢 同步 Google 表單資料
async function loadV382Data() {
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${CONFIG.ANGEL}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "載入中...";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch(e) {
    console.warn("GAS 載入異常", e);
  }
}

function updateThemeColor() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');
window.handleHiddenGate = () => { console.log("系統狀態：", state); };

window.onload = () => {
  loadV382Data();
  applyV382();
};
/**
 * 幸福智慧名片 V382.6 - 淨化連動完整版
 * 核心功能：自動讀取小天使資料、版型紙感連動、按鈕全域掛載
 */

const CONFIG = {
  // 您提供的 GAS API
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  // 您提供的 Google 表單
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  // 預設讀取小天使 ID
  ANGEL: "TW0001"
};

// 狀態管理中心
let state = {
  mode: 'free',     // free | premium
  theme: 'color-1', // color-X | pX
  style: 'arch',    // arch | flat | spot
  paper: 'paper-1'  // paper-1 ~ paper-4
};

/** * 🟢 核心切換：強制掛載至 window 物件，解決 onclick 找不到函數問題
 * 處理 自由5色 與 精品7色 的模式切換
 */
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = mode === 'free' ? `color-${theme}` : theme;
  
  // 更新點選 UI 視覺：清除所有點點的 active，再賦予當前點點
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  
  applyV382();
};

/** * 🟢 自由款：版型切換 (正拱/平直/晨曦)
 */
window.setV382Style = function(style, el) {
  state.style = style;
  
  // 更新版型按鈕 UI
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  
  applyV382();
};

/** * 🟢 自由款：紙感切換 (棉紙/顆粒/亞麻/水彩)
 */
window.setV382Paper = function(paper, el) {
  state.paper = paper;
  
  // 更新紙感按鈕 UI
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  
  applyV382();
};

/** * 🟢 核心應用：全量重構 className
 * 這是解決「選色不連動」與「視覺髒髒」的最關鍵函數
 */
function applyV382() {
  const isFree = state.mode === 'free';
  
  // 控制自由搭配操作面板的顯示/隱藏
  const controlPanel = document.getElementById('free-controls');
  if (controlPanel) {
    controlPanel.style.display = isFree ? 'block' : 'none';
  }

  /**
   * 核心邏輯：直接重寫 body.className
   * 這會徹底洗掉上一次選擇留下的所有 Class，保證樣式不衝突。
   */
  const classNames = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];
  
  // 過濾掉空值並用空格連接
  document.body.className = classNames.filter(Boolean).join(' ');
  
  updateThemeColor();
}

/** * 🟢 同步 Google Sheets 資料：預設抓取小天使笑長
 */
async function loadV382Data() {
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${CONFIG.ANGEL}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "載入資訊中...";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch(e) {
    console.warn("GAS 資料同步異常，請檢查 API 權限", e);
  }
}

/** * 🟢 更新行動裝置瀏覽器上方狀態列顏色
 */
function updateThemeColor() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', accent);
}

// 🟢 跳轉 Google 表單
window.goFillForm = () => window.open(CONFIG.FORM, '_blank');

// 🟢 隱形入口觸發 (留給小天使的開發者檢查)
window.handleHiddenGate = () => {
    console.log("V382.6 系統自檢：模式 " + state.mode + " / 氣質 " + state.theme);
};

// 🟢 頁面加載初始化
window.onload = () => {
  loadV382Data();
  applyV382();
};
