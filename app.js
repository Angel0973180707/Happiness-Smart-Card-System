const CONFIG = {
  GAS_API: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM_BASE: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL_ID: "TW0001"
};

let state = { mode: 'free', theme: 'warm-pink', style: 'arch' };

// 核心連動函數
window.handleMode = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 1. 清除所有點點的 active 狀態
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');

  // 2. 徹底重寫 Body 的 Class (這是解決不連動的關鍵)
  // 如果是 free 模式，class 會是 "mode-free warm-pink style-arch"
  // 如果是 premium 模式，class 會是 "mode-premium p-deep-green"
  if (mode === 'free') {
    state.style = localStorage.getItem('v358_style') || 'arch';
    document.body.className = `mode-free ${theme} style-${state.style}`;
    document.getElementById('style-selector').style.display = 'block';
  } else {
    state.style = 'premium';
    document.body.className = `mode-premium ${theme}`;
    document.getElementById('style-selector').style.display = 'none';
  }

  // 3. 更新瀏覽器頂部顏色
  updateThemeColor();
};

// 自動讀取小天使資料 (TW0001)
async function fetchAngelData() {
  const nameEl = document.getElementById('u-name');
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
    nameEl.innerText = "小天使笑長";
  }
}

function updateThemeColor() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

window.goFillForm = () => window.open(CONFIG.FORM_BASE, '_blank');

// 頁面加載時執行
window.onload = () => {
  fetchAngelData();
  updateThemeColor();
};
