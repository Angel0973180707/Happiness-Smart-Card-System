/**
 * 幸福智慧名片 V385 — 完整覆蓋版
 * 目標：
 *  - 圖片都能進來（支援 Google Drive open?id / file/d / uc）
 *  - 影音/聯繫/社群資料都能映射（30+ 欄位）
 *  - 作品照左右滑動 + 點開全圖
 *  - 精品版字形更好、卡片位置不重疊
 */

const APP_VERSION = '385';

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001"
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };
let currentId = CONFIG.DEFAULT_ID;

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function normKey(k){
  return String(k || '')
    .replace(/\u200B/g,'')
    .replace(/"/g,'')
    .replace(/[\n\r\t]/g,'')
    .replace(/\s+/g,'')
    .trim()
    .toLowerCase();
}

function pick(data, patterns, fallback=''){
  if(!data) return fallback;
  const keys = Object.keys(data);
  for(const p of patterns){
    const pn = normKey(p);
    // exact / contains
    for(const k of keys){
      const kn = normKey(k);
      if(kn === pn || kn.includes(pn)) {
        const v = data[k];
        if(v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
    }
  }
  return fallback;
}

function splitLines(v){
  const s = String(v || '').trim();
  if(!s) return [];
  return s.split(/\n+/).map(x=>x.trim()).filter(Boolean);
}

function splitByCommaOrNewline(v){
  const s = String(v || '').trim();
  if(!s) return [];
  return s.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
}

function extractDriveId(url){
  const u = String(url||'').trim();
  if(!u) return null;
  // open?id=
  let m = u.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if(m) return m[1];
  // file/d/ID/
  m = u.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})\//);
  if(m) return m[1];
  // uc?id=
  m = u.match(/\/uc\?[^#]*id=([a-zA-Z0-9_-]{10,})/);
  if(m) return m[1];
  return null;
}

function toDriveView(url){
  const id = extractDriveId(url);
  if(!id) return String(url||'').trim();
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

function safeUrl(url){
  const u = String(url||'').trim();
  if(!u) return '';
  // Allow tel/mailto/https/http/line/wechat
  if(/^mailto:|^tel:|^https?:\/\//i.test(u)) return u;
  // If user pasted naked domain
  if(/^[a-z0-9.-]+\.[a-z]{2,}/i.test(u)) return 'https://' + u;
  return u;
}

function applyV385(){
  const isFree = state.mode === 'free';
  const controlPanel = qs('#free-controls');
  if (controlPanel) controlPanel.style.display = isFree ? 'block' : 'none';

  const cls = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ].filter(Boolean).join(' ');
  document.body.className = cls;
}

window.setV385 = function(mode, theme, el){
  state.mode = mode;
  state.theme = theme;
  qsa('.dot,.p-dot').forEach(d => d.classList.remove('active'));
  if(el) el.classList.add('active');
  applyV385();
};

window.setV385Style = function(style, el){
  state.style = style;
  if(el && el.parentElement){
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV385();
};

window.setV385Paper = function(paper, el){
  state.paper = paper;
  if(el && el.parentElement){
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV385();
};

// Backward compatibility (你 HTML 若還有 setV382)
window.setV382 = window.setV385;
window.setV382Style = window.setV385Style;
window.setV382Paper = window.setV385Paper;

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');

function setText(id, text){
  const el = qs('#'+id);
  if(!el) return;
  el.textContent = text;
}

function setHtml(id, html){
  const el = qs('#'+id);
  if(!el) return;
  el.innerHTML = html;
}

function setShow(id, yes){
  const el = qs('#'+id);
  if(!el) return;
  el.style.display = yes ? '' : 'none';
}

function setLogo(url){
  const img = qs('#u-logo');
  const box = qs('.logo-float');
  const u = safeUrl(url);
  if(!img || !box) return;
  if(!u){ box.style.display = 'none'; img.removeAttribute('src'); return; }
  img.src = toDriveView(u);
  box.style.display = 'block';
}

function setAvatar(url){
  const img = qs('#u-img');
  if(!img) return;
  const u = safeUrl(url);
  if(!u){ img.removeAttribute('src'); return; }
  img.src = toDriveView(u);
  img.onerror = () => { /* keep circle */ };
}

function parseLineLink(v){
  // 允許「第一行連結，第二行名稱」
  const lines = splitLines(v);
  if(lines.length === 0) return null;
  const href = safeUrl(lines[0]);
  const label = (lines[1] || '').trim();
  return { href, label };
}

function makeTile({icon, title, href, kind}){
  if(!href) return '';
  const safe = safeUrl(href);

  // Special: address -> maps search
  let finalHref = safe;
  if(kind === 'map'){
    finalHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(href)}`;
  }
  const t = title || '';
  const ic = icon || 'fa-link';

  return `
    <div class="link-tile" role="button" tabindex="0" onclick="window.openLink('${encodeURIComponent(finalHref)}')" onkeydown="if(event.key==='Enter'){window.openLink('${encodeURIComponent(finalHref)}')}">
      <i class="fa-solid ${ic}"></i>
      <div class="t">${escapeHtml(t)}</div>
    </div>
  `;
}

function escapeHtml(s){
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

window.openLink = (encoded) => {
  try{
    const href = decodeURIComponent(encoded);
    window.open(href, '_blank');
  }catch(e){}
};

function renderLinks(data){
  const matrix = qs('#link-matrix');
  if(!matrix) return;

  const wechat = pick(data, ['微信ID','微信id','wechatid'], '');
  const v1 = pick(data, ['影音平台1','影音平台 1'], '');
  const v2 = pick(data, ['影音平台2','影音平台 2'], '');
  const v3 = pick(data, ['影音平台3','影音平台 3','影音平台3（或地址）','影音平台 3（或地址）'], '');

  const s1 = pick(data, ['社群平台1','社群平台 1'], '');
  const s2 = pick(data, ['社群平台2','社群平台 2'], '');
  const s3 = pick(data, ['社群平台3','社群平台 3'], '');

  const lineDmRaw = pick(data, ['私訊LINE連結','私訊 LINE 連結'], '');
  const lineOa = pick(data, ['LINE官方帳號連結','LINE 官方帳號連結'], '');
  const email = pick(data, ['一鍵聯繫Email','Email','一鍵聯繫 Email'], '');
  const phone = pick(data, ['一鍵聯繫電話','電話','一鍵聯繫 電話'], '');

  // line DM supports two lines (href + label)
  const lineDm = parseLineLink(lineDmRaw);

  const tiles = [];

  if(lineOa) tiles.push(makeTile({icon:'fa-comments', title:'LINE官帳', href: lineOa}));
  if(lineDm && lineDm.href) tiles.push(makeTile({icon:'fa-paper-plane', title: lineDm.label || '私訊LINE', href: lineDm.href}));

  if(phone) tiles.push(makeTile({icon:'fa-phone', title:'電話', href: phone.startsWith('tel:')?phone:`tel:${String(phone).trim()}`}));
  if(email) tiles.push(makeTile({icon:'fa-envelope', title:'Email', href: email.startsWith('mailto:')?email:`mailto:${String(email).trim()}`}));

  if(wechat) tiles.push(makeTile({icon:'fa-weixin', title:'微信', href: `https://www.google.com/search?q=${encodeURIComponent('WeChat '+wechat)}`}));

  // Video/social URL heuristics
  if(v1) tiles.push(makeTile({icon:'fa-youtube', title:'影音1', href: v1}));
  if(v2) tiles.push(makeTile({icon:'fa-tiktok', title:'影音2', href: v2}));

  // v3 might be address (no protocol, contains 市/區/路/號 etc)
  if(v3){
    const s = String(v3).trim();
    const looksLikeUrl = /^https?:\/\//i.test(s) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(s);
    const looksLikeAddr = /[市縣區鄉鎮路街巷弄號樓]/.test(s) && !looksLikeUrl;
    if(looksLikeAddr){
      tiles.push(makeTile({icon:'fa-location-dot', title:'導航', href: s, kind:'map'}));
    }else{
      tiles.push(makeTile({icon:'fa-link', title:'連結3', href: s}));
    }
  }

  if(s1) tiles.push(makeTile({icon:'fa-facebook', title:'社群1', href: s1}));
  if(s2) tiles.push(makeTile({icon:'fa-instagram', title:'社群2', href: s2}));
  if(s3) tiles.push(makeTile({icon:'fa-link', title:'社群3', href: s3}));

  matrix.innerHTML = tiles.join('');
}

function renderBadges(titlesRaw){
  const arr = splitByCommaOrNewline(titlesRaw);
  const box = qs('#u-titles');
  if(!box) return;
  if(arr.length === 0){
    box.innerHTML = '';
    setShow('u-titles', false);
    return;
  }
  const html = arr.slice(0, 8).map(t => `<span class="badge"><i class="fa-solid fa-award"></i>${escapeHtml(t)}</span>`).join('');
  box.innerHTML = html;
  setShow('u-titles', true);
}

function renderProducts(productRaw){
  const urls = splitByCommaOrNewline(productRaw).slice(0, 3).map(safeUrl).filter(Boolean);
  const sec = qs('#product-section');
  const slider = qs('#product-slider');
  if(!sec || !slider) return;

  if(urls.length === 0){
    sec.style.display = 'none';
    slider.innerHTML = '';
    return;
  }

  sec.style.display = '';
  slider.innerHTML = urls.map((u, idx) => {
    const src = toDriveView(u);
    const cap = `作品 ${idx+1}`;
    return `
      <div class="slide">
        <img src="${src}" alt="${cap}" loading="lazy" onclick="window.openLightbox('${encodeURIComponent(src)}','${encodeURIComponent(cap)}')" />
        <div class="cap">${cap}　<span style="opacity:.65;">點圖看全圖</span></div>
      </div>
    `;
  }).join('');
}

window.openLightbox = (srcEnc, capEnc) => {
  const lb = qs('#lightbox');
  const img = qs('#lb-img');
  const cap = qs('#lb-cap');
  if(!lb || !img) return;
  const src = decodeURIComponent(srcEnc);
  const title = capEnc ? decodeURIComponent(capEnc) : '';
  img.src = src;
  if(cap) cap.textContent = title || '';
  lb.classList.add('show');
  lb.setAttribute('aria-hidden','false');
};

window.closeLightbox = () => {
  const lb = qs('#lightbox');
  const img = qs('#lb-img');
  if(lb) {
    lb.classList.remove('show');
    lb.setAttribute('aria-hidden','true');
  }
  if(img) img.removeAttribute('src');
};

function renderQA(q1, a1, q2, a2){
  const sec = qs('#qa-section');
  const box = qs('#qa-box');
  if(!sec || !box) return;

  const items = [];
  if(String(q1||'').trim() || String(a1||'').trim()) items.push({q:q1, a:a1});
  if(String(q2||'').trim() || String(a2||'').trim()) items.push({q:q2, a:a2});

  if(items.length === 0){
    sec.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  sec.style.display = '';
  box.innerHTML = items.map((it, idx) => `
    <div class="qa-item">
      <div class="qa-q" onclick="window.toggleQA(${idx})">
        <div>${escapeHtml(it.q || '常見問題')}</div>
        <div style="opacity:.7;"><i class="fa-solid fa-chevron-down"></i></div>
      </div>
      <div class="qa-a" id="qa-a-${idx}">${escapeHtml(it.a || '')}</div>
    </div>
  `).join('');
}

window.toggleQA = (idx) => {
  const el = qs('#qa-a-'+idx);
  if(!el) return;
  const show = (el.style.display !== 'block');
  el.style.display = show ? 'block' : 'none';
};

function getIdFromUrl(){
  const u = new URL(location.href);
  const id = (u.searchParams.get('id') || '').trim();
  if(id) return id;
  return CONFIG.DEFAULT_ID;
}

window.loadByInputId = () => {
  const el = qs('#id-input');
  const id = String(el?.value || '').trim();
  if(!id) return;
  currentId = id;
  const u = new URL(location.href);
  u.searchParams.set('id', id);
  history.replaceState({}, '', u.toString());
  loadCard(id);
};

window.copyShareLink = async () => {
  const u = new URL(location.href);
  u.searchParams.set('id', currentId || CONFIG.DEFAULT_ID);
  const link = u.toString();
  try{
    await navigator.clipboard.writeText(link);
    toast('已複製交貨連結');
  }catch(e){
    // fallback
    const ta = document.createElement('textarea');
    ta.value = link;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('已複製交貨連結');
  }
};

function toast(msg){
  const d = document.createElement('div');
  d.textContent = msg;
  d.style.position='fixed';
  d.style.left='50%';
  d.style.bottom='18px';
  d.style.transform='translateX(-50%)';
  d.style.padding='10px 14px';
  d.style.borderRadius='14px';
  d.style.background='rgba(0,0,0,0.70)';
  d.style.color='#fff';
  d.style.fontWeight='900';
  d.style.zIndex='99999';
  d.style.fontSize='12px';
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 1200);
}

async function loadCard(id){
  try{
    setText('u-name','載入中...');
    setText('u-unit','同步中...');
    setText('u-service','正在同步雲端服務項目...');

    const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();

    // GAS v385.2 回傳 {ok:true, id, data:{...}}
    const data = json && json.data ? json.data : (json || {});
    // 若後端有包 ok
    if(json && json.ok === false){
      throw new Error(json.message || json.error || '讀取失敗');
    }

    // 映射欄位（用模糊匹配，避免欄位標題有換行/引號）
    const name = pick(data, ['姓名（名片大標題）','姓名','name'], '（未命名）');
    const unit = pick(data, ['單位名稱（如：幸福教養概念館）','單位名稱','單位','unit'], '');
    const slogan = pick(data, ['理念標語（顯示在照片下方，精簡有力）','理念標語','slogan'], '');
    const service = pick(data, ['服務項目（核心業務，多項可條列換行）','服務項目','service'], '');
    const titles = pick(data, ['重要頭銜/獎銜（權威背書項目，多項可條列換行）','重要頭銜','獎銜','titles'], '');
    const avatar = pick(data, ['個人專業形象照（名片主圖）','形象照','avatar'], '');
    const products = pick(data, ['產品或品牌或活動照片最多3張（內容區插圖）','產品照','活動照片','作品照','products'], '');
    const logo = pick(data, ['品牌Logo（右上角小圖標）','品牌Logo','logo'], '');

    const q1 = pick(data, ['客戶常見提問1(Q1)','客戶常見提問 1 (Q1)','Q1'], '');
    const a1 = pick(data, ['專業解答1(A1)','專業解答 1 (A1)','A1'], '');
    const q2 = pick(data, ['客戶常見提問2(Q2)','客戶常見提問 2 (Q2)','Q2'], '');
    const a2 = pick(data, ['專業解答2（A2）','專業解答2(A2)','A2'], '');

    setText('u-name', String(name).trim() || '（未命名）');
    setText('u-unit', String(unit).trim());

    const s = String(slogan||'').trim();
    if(s){
      setShow('u-slogan', true);
      setText('u-slogan', s);
    }else{
      setShow('u-slogan', false);
    }

    renderBadges(titles);

    setText('u-service', String(service||'').trim() || '');

    setAvatar(avatar);
    setLogo(logo);

    renderProducts(products);
    renderLinks(data);
    renderQA(q1,a1,q2,a2);

    // set id input
    const input = qs('#id-input');
    if(input && !input.value) input.value = id;

  }catch(err){
    console.error(err);
    setText('u-name', '讀取失敗');
    setText('u-unit', String(err.message || err));
    setText('u-service', '請確認：GAS 是否已部署、工作表欄位是否完整、該 id 是否存在。');
  }
}

// ---- Service Worker registration (cache-safe) ----
async function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  try{
    await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`);
  }catch(e){
    // ignore
  }
}

window.addEventListener('load', () => {
  applyV385();
  registerSW();
  currentId = getIdFromUrl();
  loadCard(currentId);
});
