/**
 * 幸福智慧名片 V382.3 - 邏輯連動強化版
 * 解決點擊失靈與版型不匹配問題
 */
const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

// 初始狀態
let state = {
  mode: 'free',
  theme: 'color-1',
  style: 'arch',
  paper: 'paper-1'
};

/** 🟢 核心切換：強制掛載至 window 物件 **/
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新點點 UI 視覺
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  
  applyV382();
};

window.setV382Style = function(style, el) {
  state.style = style;
  
  // 美化點擊回饋：微縮動畫
  el.style.transform = "scale(0.95)";
  setTimeout(() => el.style.transform = "translateY(2px)", 100);

  // 更新按鈕 UI
  el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  
  applyV382();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  
  // 更新紙感按鈕 UI
  el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  
  applyV382();
};

/** 🟢 應用狀態：全量重構 ClassName 防止殘留 **/
function applyV382() {
  const isFree = state.mode === 'free';
  const controlPanel = document.getElementById('free-controls');
  
  // 控制自由搭配面板顯示/隱藏
  if (controlPanel) {
    controlPanel.style.display = isFree ? 'block' : 'none';
  }

  // 核心邏輯：直接覆蓋 body.className，確保舊有的樣式（如精品款的 p1）不會留在 free 模式
  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];
  
  document.body.className = classList.filter(Boolean).join(' ');
  updateThemeColor();
}

/** 🟢 同步 Google Sheets 資料 **/
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
    console.error("GAS 資料同步失敗", e);
  }
}

/** 🟢 更新瀏覽器頂部主題顏色 **/
function updateThemeColor() {
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accentColor);
}

// 跳轉表單
window.goFillForm = () => window.open(CONFIG.FORM, '_blank');

// 隱形入口預留
window.handleHiddenGate = () => {
    console.log("V382.3 系統檢查正常");
};

// 初始化啟動
window.onload = () => {
  loadV382Data();
  applyV382();
};
