const CONFIG = {
  // ✅ 你的 GAS API
  GAS_API: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  // ✅ 你的 Google Form
  FORM_BASE: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL_ID: "TW0001"
};

let state = { mode: 'free', theme: 'warm-pink', style: 'arch' };

// 將函數掛載到 window 確保 HTML 點擊可辨識
window.handleMode = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');

  const styleRow = document.getElementById('style-selector');
  if(mode === 'premium') {
    styleRow.style.display = 'none'; // 精品款鎖定排版
    document.body.className = `mode-premium ${theme}`;
  } else {
    styleRow.style.display = 'block';
    document.body.className = `mode-free ${theme} style-${state.style}`;
  }
  updateThemeColor();
};

window.setPremiumTheme = function(theme, el) {
  window.handleMode('premium', theme, el);
};

window.handleStyle = function(style, el) {
  state.style = style;
  document.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.body.className = `mode-free ${state.theme} style-${style}`;
};

// 立即預約表單跳轉
window.goFillForm = () => {
  const finalUrl = `${CONFIG.FORM_BASE}?usp=pp_url&entry.1234567=${state.theme}&entry.7654321=${state.style}`;
  window.open(finalUrl, '_blank');
};

// 自動讀取小天使資料
async function fetchInitialData() {
  try {
    const res = await fetch(`${CONFIG.GAS_API}?id=${CONFIG.ANGEL_ID}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "致力推動幸福教養，陪伴家長共好。";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch (e) {
    console.error("GAS 讀取失敗:", e);
  }
}

function updateThemeColor() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

// 頁面加載完成後執行
window.addEventListener('DOMContentLoaded', () => {
  fetchInitialData();
  updateThemeColor();
});
