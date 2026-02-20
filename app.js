/* ================================
 * Angel Card App.js (FULL OVERWRITE)
 * Fix Focus: Data fetch + Image load reliability
 * - Works better in Incognito (no-cache, retry, robust JSON parse)
 * - Normalizes Google Drive / share links to direct image URL
 * - Fallback if missing fields (dynamic balance via body classes)
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001",
  FETCH_TIMEOUT_MS: 9000,
  RETRY: 2,               // total tries = RETRY + 1
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

/* ---------------------------
 * UI helpers
 * --------------------------- */
function $(id){ return document.getElementById(id); }

function setTextSafe(el, text){
  if (!el) return;
  el.textContent = (text == null ? "" : String(text)).trim();
}

function setBodyFlag(flag, on){
  document.body.classList.toggle(flag, !!on);
}

function showAvatar(on){
  // 不改結構，用 class 控制（CSS 若沒有也不會壞）
  document.body.classList.toggle('has-no-avatar', !on);
}

/* ---------------------------
 * Mode switching (保持原系統)
 * --------------------------- */
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

/* ---------------------------
 * Robust Fetch (no-cache + timeout + retry + safe JSON)
 * --------------------------- */
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

    // 有些 GAS 出錯會回 HTML（登入頁/錯誤頁），這裡先判斷
    const maybeJson = text.trim();
    if (!maybeJson) throw new Error("Empty response");

    // 嘗試 parse JSON
    try{
      return JSON.parse(maybeJson);
    }catch(_){
      // 如果是 JSON 前後被包東西（少見），試抽出第一段 {..} 或 [..]
      const objMatch = maybeJson.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (objMatch) return JSON.parse(objMatch[1]);
      throw new Error("Response is not JSON (maybe HTML or blocked)");
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
      // 短暫退避
      await new Promise(r => setTimeout(r, 350 + i*350));
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* ---------------------------
 * Image URL normalize (Google Drive / share links)
 * --------------------------- */
function normalizeImageUrl(raw){
  if (!raw) return "";
  let url = String(raw).trim();
  if (!url) return "";

  // http -> https
  if (url.startsWith("http://")) url = "https://" + url.slice(7);

  // Google Drive patterns:
  // 1) https://drive.google.com/file/d/<ID>/view?...
  const m1 = url.match(/drive\.google\.com\/file\/d\/([^\/]+)\//i);
  if (m1 && m1[1]) {
    const id = m1[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // 2) https://drive.google.com/open?id=<ID>
  const m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (m2 && m2[1]) {
    const id = m2[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // 3) https://drive.google.com/uc?id=<ID>...
  const m3 = url.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
  if (m3 && m3[1]) {
    const id = m3[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // 4) Google "thumbnail?id="
  const m4 = url.match(/thumbnail\?id=([^&]+)/i);
  if (m4 && m4[1]) {
    const id = m4[1];
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
  }

  // Dropbox share -> raw
  if (url.includes("dropbox.com")) {
    // dl=0 -> raw=1
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) {
      url += (url.includes("?") ? "&" : "?") + "raw=1";
    }
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
    showAvatar(false);
    return;
  }

  showAvatar(true);

  // 先掛 error/onload，再設 src
  img.onload = () => { showAvatar(true); };
  img.onerror = () => {
    // 圖片抓不到：隱藏頭像，避免卡片破版
    img.removeAttribute("src");
    showAvatar(false);
  };

  // ✅ bust cache（特別是無痕/手機）
  const bust = `t=${Date.now()}`;
  const sep = finalUrl.includes("?") ? "&" : "?";
  img.src = finalUrl + sep + bust;
}

/* ---------------------------
 * Apply data to UI + Dynamic balance
 * --------------------------- */
function applyDataToCard(data){
  // 你原本欄位：姓名 / 單位 / 服務項目 / 形象照
  const name = (data && (data.姓名 || data.name)) || "小天使笑長";
  const unit = (data && (data.單位 || data.unit)) || "";
  const service = (data && (data.服務項目 || data.service)) || "";
  const photo = (data && (data.形象照 || data.photo)) || "";

  setTextSafe($('u-name'), name);
  setTextSafe($('u-unit'), unit);
  setTextSafe($('u-service'), service);

  // 動態平衡：沒填就收斂（配合你 CSS 的 .has-no-unit/.has-no-service）
  setBodyFlag('has-no-unit', !String(unit).trim());
  setBodyFlag('has-no-service', !String(service).trim());

  // 圖片
  setAvatarImage(photo);
}

/* ---------------------------
 * Main load
 * --------------------------- */
async function loadData(){
  // ✅ 加上 cache bust，避免被快取卡住（尤其是手機/無痕）
  const url = `${CONFIG.GAS}?id=${encodeURIComponent(CONFIG.ANGEL)}&ts=${Date.now()}`;

  // UI placeholder
  setTextSafe($('u-name'), "載入中...");
  setTextSafe($('u-unit'), "同步中...");
  setTextSafe($('u-service'), "正在同步雲端服務項目...");

  try{
    const data = await fetchJsonRobust(url);

    // 若 GAS 包一層 {ok:true,data:{...}} 也能吃
    const payload = (data && data.data) ? data.data : data;

    applyDataToCard(payload);
  }catch(e){
    console.error("雲端同步異常:", e);

    // 失敗時保底：讓卡片仍能使用，不要白屏
    setTextSafe($('u-name'), "小天使笑長");
    setTextSafe($('u-unit'), "");
    setTextSafe($('u-service'), "");

    setBodyFlag('has-no-unit', true);
    setBodyFlag('has-no-service', true);
    setAvatarImage(""); // hide avatar
  }
}

/* ---------------------------
 * External actions
 * --------------------------- */
window.goFillForm = () => window.open(CONFIG.FORM, '_blank');

window.addEventListener('load', () => {
  applyV382();
  loadData();
});