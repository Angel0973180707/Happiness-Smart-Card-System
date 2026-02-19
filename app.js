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

window.setV381 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = mode === 'free' ? `color-${theme}` : theme;
  
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  applyV381();
};

window.setV381Style = function(style, el) {
  state.style = style;
  document.querySelectorAll('#free-controls .btn-mini').forEach(b => b.classList.remove('active')); // 修正：只選版型那列
  el.classList.add('active');
  applyV381();
};

window.setV381Paper = function(paper, el) {
  state.paper = paper;
  applyV381();
};

function applyV381() {
  const isFree = state.mode === 'free';
  const selector = document.getElementById('free-controls');
  selector.style.display = isFree ? 'block' : 'none';
  
  // 核心：全量重寫 Class，徹底解決連動問題
  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? `paper-${state.paper}` : ''
  ];
  document.body.className = classList.filter(Boolean).join(' ');
  updateThemeColor();
}

async function fetchAngelV381() {
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${CONFIG.ANGEL}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "載入資訊中...";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch(e) { console.error("GAS Error"); }
}

function updateThemeColor() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');
window.onload = () => { fetchAngelV381(); applyV381(); };
