/* 幸福智慧名片｜PWA V386
 * - 承接 V384 成品卡樣式（外觀切換，不改資料）
 * - 預設讀 TW0001（或 URL ?id=TWxxxx）
 * - 一鍵複製交貨連結：優先用 GAS share（社群才抓得到動態 OG）
 */

const CONFIG = {
  // ✅ 你的 GAS WebApp
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  // ✅ 你的 Google Form（仍可保留；之後可改成 PWA 內嵌寫入）
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  // ✅ 展示樣品
  DEFAULT_ID: "TW0001"
};

const state = {
  mode: 'free',        // free / premium
  theme: 'color-1',    // color-1..5 or p1..p7
  style: 'arch',       // arch / flat / spot
  paper: 'paper-1',    // paper-1..3
  id: CONFIG.DEFAULT_ID,
  token: ''            // 可選：如果你之後要做 token 驗證，可用 URL 帶入
};

function qs(name){
  const url = new URL(location.href);
  return url.searchParams.get(name) || '';
}

function applyClasses(){
  const isFree = state.mode === 'free';
  const cls = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ].filter(Boolean).join(' ');
  document.body.className = cls + (document.body.classList.contains('share-page') ? ' share-page' : '');
}

function setActive(el, selector){
  document.querySelectorAll(selector).forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function fetchCard(id){
  const url = new URL(CONFIG.GAS);
  url.searchParams.set('action','card');
  url.searchParams.set('id', id);
  // token 目前不做驗證（世界線先跑通）；若未來要做可在 GAS 端加驗證
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (data && data.ok === false) throw new Error(data.error || 'API error');
  return data;
}

function pickField(obj, candidates){
  for (const k of candidates){
    if (k in obj && String(obj[k]||'').trim()) return String(obj[k]).trim();
  }
  return '';
}

function toDirectDrive(url){
  // 將常見的 /file/d/<id>/view 轉成 uc?export=view&id=<id>
  try{
    const m = String(url||'').match(/\/file\/d\/(.+?)\//);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  }catch(_){}
  return url;
}

async function renderCard(){
  const id = state.id || CONFIG.DEFAULT_ID;
  const data = await fetchCard(id);

  // 你的欄位命名可能是：
  // - 姓名（名片大標題）
  // - 單位名稱（如：幸福教養概念館）
  // - 服務項目
  // - 個人專業形象照（名片主圖） / 形象照
  const name = pickField(data, ['姓名（名片大標題）','姓名','name']) || '小天使';
  const unit = pickField(data, ['單位名稱（如：幸福教養概念館）','單位','單位名稱','unit']) || '';
  const service = pickField(data, ['服務項目','服務','service']) || '';
  const photo = pickField(data, ['個人專業形象照（名片主圖）','形象照','照片','photo','photo_url','photo_url_720']);

  // index page
  const uName = document.getElementById('u-name');
  const uUnit = document.getElementById('u-unit');
  const uService = document.getElementById('u-service');
  const uImg = document.getElementById('u-img');

  if (uName) uName.textContent = name;
  if (uUnit) uUnit.textContent = unit || ' ';
  if (uService) uService.textContent = service || ' ';
  if (uImg && photo) uImg.src = toDirectDrive(photo);

  // share page (human view)
  const sName = document.getElementById('s-name');
  const sImg = document.getElementById('s-img');
  if (sName) sName.textContent = name;
  if (sImg && photo) sImg.src = toDirectDrive(photo);
}

function buildPwaCardUrl(){
  const url = new URL(location.href);
  url.pathname = url.pathname.replace(/\/share\.html$/, '/index.html');
  url.searchParams.set('id', state.id);
  if (state.token) url.searchParams.set('token', state.token);
  return url.toString();
}

function buildGasShareUrl(){
  // ✅ 這條才是「可貼社群」的 OG 交貨連結（需要你在 GAS 加 action=share HTML 輸出）
  // 我們先組好格式，後端下一步你只要加 action=share 即可。
  const url = new URL(CONFIG.GAS);
  url.searchParams.set('action','share');
  url.searchParams.set('id', state.id);
  if (state.token) url.searchParams.set('token', state.token);

  // 讓 share 頁面知道要跳回哪個 PWA
  url.searchParams.set('to', buildPwaCardUrl());
  return url.toString();
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast('已複製');
  }catch(e){
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('已複製');
  }
}

function toast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position='fixed';
  t.style.left='50%';
  t.style.bottom='18px';
  t.style.transform='translateX(-50%)';
  t.style.background='rgba(0,0,0,.78)';
  t.style.color='#fff';
  t.style.padding='10px 14px';
  t.style.borderRadius='999px';
  t.style.fontWeight='900';
  t.style.zIndex='9999';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1200);
}

const AngelCard = {
  setMode(mode, theme, el){
    state.mode = mode;
    if (theme) state.theme = theme;

    // plan buttons
    const btnFree = document.getElementById('btn-plan-free');
    const btnPremium = document.getElementById('btn-plan-premium');
    if (btnFree && btnPremium){
      btnFree.classList.toggle('active', mode==='free');
      btnPremium.classList.toggle('active', mode==='premium');
    }

    // controls
    const freeCtr = document.getElementById('free-controls');
    const freeColors = document.getElementById('free-colors');
    const premiumColors = document.getElementById('premium-colors');
    if (freeCtr) freeCtr.style.display = mode==='free' ? 'block' : 'none';
    if (freeColors) freeColors.style.display = mode==='free' ? 'flex' : 'none';
    if (premiumColors) premiumColors.style.display = mode==='premium' ? 'flex' : 'none';

    // active dot
    if (el && (el.classList.contains('p-dot') || el.classList.contains('dot'))){
      setActive(el, '.dot, .p-dot');
    }

    applyClasses();
  },

  setTheme(theme, el){
    state.theme = theme;
    setActive(el, '.dot');
    applyClasses();
  },

  setStyle(style, el){
    state.style = style;
    if (el && el.parentElement){
      el.parentElement.querySelectorAll('.btn-neo').forEach(b=>b.classList.remove('active'));
      el.classList.add('active');
    }
    applyClasses();
  },

  setPaper(paper, el){
    state.paper = paper;
    if (el && el.parentElement){
      el.parentElement.querySelectorAll('.btn-neo').forEach(b=>b.classList.remove('active'));
      el.classList.add('active');
    }
    applyClasses();
  },

  openForm(){
    window.open(CONFIG.FORM, '_blank', 'noopener');
  },

  async copyDeliveryLink(){
    // ✅ 給客戶貼社群：用 GAS share（支援 OG）
    const link = buildGasShareUrl();
    await copyText(link);
  }
};

// Share page helper
const SharePage = {
  openCard(){
    location.href = buildPwaCardUrl();
  },
  async copyGasLink(){
    const link = buildGasShareUrl();
    await copyText(link);
  }
};

function init(){
  // URL params
  const id = qs('id');
  const token = qs('token');
  state.id = id || CONFIG.DEFAULT_ID;
  state.token = token || '';

  // If share page, keep body class
  if (location.pathname.endsWith('/share.html') || location.pathname.endsWith('share.html')){
    document.body.classList.add('share-page');
  }

  // default UI visibility
  const freeCtr = document.getElementById('free-controls');
  const freeColors = document.getElementById('free-colors');
  const premiumColors = document.getElementById('premium-colors');
  if (freeCtr) freeCtr.style.display = 'block';
  if (freeColors) freeColors.style.display = 'flex';
  if (premiumColors) premiumColors.style.display = 'none';

  applyClasses();
  renderCard().catch(err=>{
    console.error(err);
    toast('資料同步失敗');
  });

  // PWA register SW
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}

window.AngelCard = AngelCard;
window.SharePage = SharePage;
window.addEventListener('load', init);
