const CONFIG = {
  GAS_API: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM_BASE: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL_ID: "TW0001"
};

let state = { mode: 'free', theme: 'warm-pink', style: 'arch' };

// 🛠 解決「按鈕不動」：將函數顯式掛載到全域 window
window.handleMode = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新點點狀態
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');

  const styleSelector = document.getElementById('style-selector');
  if(mode === 'premium') {
    styleSelector.style.display = 'none'; // 精品款鎖定排版
    document.body.className = `mode-premium ${theme}`;
  } else {
    styleSelector.style.display = 'block';
    document.body.className = `mode-free ${theme} style-${state.style}`;
  }
  updateThemeColor();
};

window.handleStyle = function(style, el) {
  state.style = style;
  document.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.body.className = `mode-free ${state.theme} style-${style}`;
};

// 🛠 解決「自動讀取」：初始化抓取 GAS 資料
async function fetchAngelData() {
  try {
    const res = await fetch(`${CONFIG.GAS_API}?id=${CONFIG.ANGEL_ID}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "載入中...";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch (e) {
    console.error("雲端資料讀取失敗");
  }
}

window.goFillForm = () => {
  const finalUrl = `${CONFIG.FORM_BASE}?usp=pp_url&entry.12345=${state.theme}&entry.67890=${state.style}`;
  window.open(finalUrl, '_blank');
};

function updateThemeColor() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

// 頁面加載完成後執行
window.addEventListener('DOMContentLoaded', () => {
  fetchAngelData();
  updateThemeColor();
});
