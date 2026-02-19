const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = {
  mode: 'free',
  theme: 'color-1',
  style: 'arch',
  paper: '1'
};

// 🔵 核心：模式與顏色切換
window.setV381Mode = function(mode, theme, el) {
  state.mode = mode;
  state.theme = mode === 'free' ? `color-${theme}` : theme;
  
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  applyV381();
};

// 🔵 核心：版型切換 (正拱/平直/晨曦)
window.setV381Style = function(style, el) {
  state.style = style;
  el.parentElement.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  applyV381();
};

// 🔵 核心：紙感切換
window.setV381Paper = function(paper, el) {
  state.paper = paper;
  el.parentElement.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  applyV381();
};

function applyV381() {
  const isFree = state.mode === 'free';
  document.getElementById('free-controls').style.display = isFree ? 'block' : 'none';
  
  // 重寫 className，洗掉舊樣式，確保連動
  const classes = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? `paper-${state.paper}` : ''
  ];
  document.body.className = classes.filter(Boolean).join(' ');
  updateThemeColor();
}

// 🟢 自動讀取小天使樣板資料
async function loadV381Data() {
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${CONFIG.ANGEL}`);
    const data = await res.json();
    if (data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "致力實踐幸福教養。";
      if (data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch (e) { console.error("資料讀取異常"); }
}

function updateThemeColor() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');
window.onload = () => { loadV381Data(); applyV381(); };
