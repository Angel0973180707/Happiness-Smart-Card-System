const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { mode: 'free', theme: 'warm-pink', style: 'arch' };
let gateClicks = 0;

// 全域掛載函數
window.setAppMode = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if(el) el.classList.add('active');

  const selector = document.getElementById('style-selector');
  
  if (mode === 'free') {
    state.style = localStorage.getItem('v380_style') || 'arch';
    document.body.className = `mode-free ${theme} style-${state.style}`;
    selector.style.display = 'block';
  } else {
    // 精品模式：選顏色即選版型
    document.body.className = `mode-premium ${theme}`;
    selector.style.display = 'none';
  }
  updateThemeMeta();
};

window.setFreeStyle = function(style, el) {
  if (state.mode !== 'free') return;
  state.style = style;
  localStorage.setItem('v380_style', style);
  document.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  document.body.className = `mode-free ${state.theme} style-${style}`;
};

window.handleHiddenGate = function() {
  gateClicks++;
  if(gateClicks >= 3) {
    document.getElementById('work-drawer').style.maxHeight = '500px';
    gateClicks = 0;
  }
  setTimeout(() => gateClicks = 0, 1000);
};

window.doPreviewById = () => {
  const id = document.getElementById('work-id').value.trim();
  if(id) { fetchData(id); document.getElementById('work-drawer').style.maxHeight = '0'; }
};

async function fetchData(id) {
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${id}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "無資料";
      document.getElementById('u-unit').innerText = data.單位 || "";
      document.getElementById('u-service').innerText = data.服務項目 || "";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch (e) { console.error("GAS 讀取失敗"); }
}

function updateThemeMeta() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');
window.onload = () => { fetchData(CONFIG.ANGEL); updateThemeMeta(); };
