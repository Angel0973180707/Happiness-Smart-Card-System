const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { plan: 'free', theme: 'p-deep-green', style: 'arch' };
let gateClicks = 0;

// 🌿 核心切換：解決不連動問題
window.setAppMode = function(theme, el) {
  state.theme = theme;
  document.querySelectorAll('.p-dot').forEach(d => d.classList.remove('active'));
  if(el) el.classList.add('active');
  applyState();
};

window.setPlan = function(plan) {
  state.plan = plan;
  document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${plan}`).classList.add('active');
  applyState();
};

window.setFreeStyle = function(style, el) {
  state.style = style;
  document.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  applyState();
};

function applyState() {
  const card = document.getElementById('card-container');
  const styleSelector = document.getElementById('free-styles');
  
  // 徹底更新 Body Class
  if (state.plan === 'free') {
    document.body.className = `mode-free ${state.theme} style-${state.style}`;
    styleSelector.style.display = 'block';
  } else {
    document.body.className = `mode-premium ${state.theme}`;
    styleSelector.style.display = 'none';
  }
  updateThemeMeta();
}

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
  setTimeout(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
  }, 100);
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');
window.onload = () => { fetchData(CONFIG.ANGEL); applyState(); };
