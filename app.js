/* Angel Smart Card V382.3 - Global Hook Fix */
const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

// ✅ 選色與切換模式 (強制重設 className)
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  
  applyV382();
};

// ✅ 選版型
window.setV382Style = function(style, el) {
  state.style = style;
  el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  
  applyV382();
};

// ✅ 選紙感
window.setV382Paper = function(paper, el) {
  state.paper = paper;
  el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  
  applyV382();
};

function applyV382() {
  const isFree = state.mode === 'free';
  document.getElementById('free-controls').style.display = isFree ? 'block' : 'none';
  
  // 核心：全量重構 className。這會徹底清除舊的 class 殘留。
  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];
  document.body.className = classList.filter(Boolean).join(' ');
  updateThemeMeta();
}

async function loadV382() {
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${CONFIG.ANGEL}`);
    const data = await res.json();
    if(data) {
      document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
      document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
      document.getElementById('u-service').innerText = data.服務項目 || "載入資訊中...";
      if(data.形象照) document.getElementById('u-img').src = data.形象照;
    }
  } catch(e) { console.error("GAS 載入異常"); }
}

function updateThemeMeta() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');
window.handleHiddenGate = () => { /* 隱形入口 */ };

window.onload = () => { loadV382(); applyV382(); };
