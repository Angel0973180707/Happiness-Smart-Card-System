const CONFIG = {
  GAS_API: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM_BASE: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL_ID: "TW0001"
};

let state = { mode: 'free', theme: 'warm-pink', style: 'arch' };

// 按鈕功能：切換模式
window.setAppMode = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');

  const styleRow = document.getElementById('style-selector');
  if(mode === 'premium') {
    styleRow.style.display = 'none';
    document.body.className = `mode-premium ${theme}`;
  } else {
    styleRow.style.display = 'block';
    document.body.className = `mode-free ${theme} style-${state.style}`;
  }
};

window.setFreeStyle = function(style, el) {
  state.style = style;
  document.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.body.className = `mode-free ${state.theme} style-${style}`;
};

// 自動讀取小天使資料
async function init() {
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
    console.log("讀取失敗，使用預設值");
  }
}

window.goFillForm = () => window.open(CONFIG.FORM_BASE, '_blank');

window.onload = init;
