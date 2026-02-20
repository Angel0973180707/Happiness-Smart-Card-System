/* ================================
 * Angel Card App.js (FULL OVERWRITE) V385.3
 * Fix Focus: data fetch + image load + modal
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001",
  FETCH_TIMEOUT_MS: 9000,
  RETRY: 2
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

function $(id){ return document.getElementById(id); }
function setTextSafe(el, text){
  if (!el) return;
  el.textContent = (text == null ? "" : String(text)).trim();
}
function setBodyFlag(flag, on){ document.body.classList.toggle(flag, !!on); }

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  applyV382();
};
window.setV382Style = function(style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382();
};
window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382();
};

function applyV382() {
  const isFree = state.mode === 'free';
  const controlPanel = $('free-controls');
  if (controlPanel) controlPanel.style.display = isFree ? 'block' : 'none';

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];
  document.body.className = classList.filter(Boolean).join(' ');
}

/* ---------- modal ---------- */
window.openOrderHelp = function(){
  const m = $('orderHelpModal');
  if (!m) return;
  m.classList.add('show');
  m.setAttribute('aria-hidden', 'false');
};
window.closeOrderHelp = function(){
  const m = $('orderHelpModal');
  if (!m) return;
  m.classList.remove('show');
  m.setAttribute('aria-hidden', 'true');
};
document.addEventListener('click', (e) => {
  const m = $('orderHelpModal');
  if (!m || !m.classList.contains('show')) return;
  if (e.target === m) window.closeOrderHelp();
});

/* ---------- fetch robust ---------- */
async function fetchWithTimeout(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });
    const text = await res.text();
    const maybe = text.trim();
    if (!maybe) throw new Error("Empty response");
    try{
      return JSON.parse(maybe);
    }catch(_){
      const m = maybe.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) return JSON.parse(m[1]);
      throw new Error("Not JSON (maybe HTML/blocked)");
    }
  } finally{
    clearTimeout(t);
  }
}

async function fetchJsonRobust(url){
  let lastErr = null;
  for (let i=0; i<=CONFIG.RETRY; i++){
    try{
      return await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT_MS);
    }catch(e){
      lastErr = e;
      await new Promise(r => setTimeout(r, 350 + i*350));
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------- image normalize ---------- */
function normalizeImageUrl(raw){
  if (!raw) return "";
  let url = String(raw).trim();
  if (!url) return "";
  if (url.startsWith("http://")) url = "https://" + url.slice(7);

  const m1 = url.match(/drive\.google\.com\/file\/d\/([^\/]+)\//i);
  if (m1 && m1[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m1[1])}`;

  const m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (m2 && m2[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m2[1])}`;

  const m3 = url.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
  if (m3 && m3[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m3[1])}`;

  const m4 = url.match(/thumbnail\?id=([^&]+)/i);
  if (m4 && m4[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m4[1])}`;

  if (url.includes("dropbox.com")) {
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }
  return url;
}

function setAvatarImage(url){
  const img = $('u-img');
  if (!img) return;
  const finalUrl = normalizeImageUrl(url);
  if (!finalUrl) {
    img.removeAttribute("src");
    setBodyFlag('has-no-avatar', true);
    return;
  }

  img.onload = () => setBodyFlag('has-no-avatar', false);
  img.onerror = () => {
    img.removeAttribute("src");
    setBodyFlag('has-no-avatar', true);
  };

  const sep = finalUrl.includes("?") ? "&" : "?";
  img.src = finalUrl + sep + `t=${Date.now()}`;
  setBodyFlag('has-no-avatar', false);
}

/* ---------- apply data ---------- */
function applyDataToCard(data){
  const name = (data && (data.姓名 || data.name)) || "小天使笑長";
  const unit = (data && (data.單位 || data.unit)) || "";
  const service = (data && (data.服務項目 || data.service)) || "";
  const photo = (data && (data.形象照 || data.photo)) || "";

  setTextSafe($('u-name'), name);
  setTextSafe($('u-unit'), unit);
  setTextSafe($('u-service'), service);

  setBodyFlag('has-no-unit', !String(unit).trim());
  setBodyFlag('has-no-service', !String(service).trim());

  setAvatarImage(photo);
}

async function loadData(){
  const url = `${CONFIG.GAS}?id=${encodeURIComponent(CONFIG.ANGEL)}&ts=${Date.now()}`;

  setTextSafe($('u-name'), "載入中...");
  setTextSafe($('u-unit'), "同步中...");
  setTextSafe($('u-service'), "正在同步雲端服務項目...");

  try{
    const data = await fetchJsonRobust(url);
    const payload = (data && data.data) ? data.data : data;
    applyDataToCard(payload);
  }catch(e){
    console.error("雲端同步異常:", e);
    // 保底：不白屏
    setTextSafe($('u-name'), "小天使笑長");
    setTextSafe($('u-unit'), "");
    setTextSafe($('u-service'), "");
    setBodyFlag('has-no-unit', true);
    setBodyFlag('has-no-service', true);
    setAvatarImage("");
  }
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');

window.addEventListener('load', () => {
  applyV382();
  loadData();
});