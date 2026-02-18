/* Angel Smart Card V380 - Logic Fix */
const CONFIG = {
  GAS_API: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM_BASE: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL_ID: "TW0001"
};

// 狀態管理
let state = {
  mode: 'free',     // free | premium
  theme: 'warm-pink',
  style: 'arch'     // arch | flat
};

// 核心切換函數：解決不連動問題
window.setAppMode = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 1. 更新 UI 選取標籤
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if(el) el.classList.add('active');

  // 2. 徹底重寫 Body Class (防止類別堆疊)
  // 自由款格式: mode-free warm-pink style-arch
  // 精品款格式: mode-premium p-deep-green
  if (mode === 'free') {
    state.style = localStorage.getItem('v380_style') || 'arch';
    document.body.className = `mode-free ${theme} style-${state.style}`;
  } else {
    state.style = 'premium'; // 精品款內定版型
    document.body.className = `mode-premium ${theme}`;
  }

  updateThemeMeta();
  console.log(`V380: Switched to ${mode} - ${theme}`);
};

// 自由款版型切換
window.setFreeStyle = function(style, el) {
  if (state.mode !== 'free') return; // 若在精品模式則不動作
  state.style = style;
  localStorage.setItem('v380_style', style);
  document.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  document.body.className = `mode-free ${state.theme} style-${style}`;
};

// 自動讀取小天使資料 (TW0001)
async function initV380() {
  try {
    const res = await fetch(`${CONFIG.GAS_API}?id=${CONFIG.ANGEL_ID}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "致力推廣幸福教養";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch (e) {
    console.warn("GAS 載入異常，使用預設值");
  }
}

function updateThemeMeta() {
  setTimeout(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
  }, 100);
}

window.goFillForm = () => window.open(CONFIG.FORM_BASE, '_blank');

// 初始啟動
window.onload = initV380;
