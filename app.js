/* Angel Card — V385.7_fix (Complete Overwrite)
 * Focus:
 * - Fix JS errors (zero syntax errors)
 * - Robustly fetch sample data (TW0001) from GAS API (supports multiple response shapes)
 * - Preview card switches by plan/color/frame/paper/premium
 * - Contact buttons, gallery prev/next, lightbox
 * - Built-in form (big inputs), submit to GAS (POST->GET fallback)
 * - Hidden admin (tap version 3x + password)
 */

(() => {
  'use strict';

  const APP_VER = '385.7_fix';
  const API_BASE = 'https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec';
  const SAMPLE_ID = 'TW0001';

  // NOTE: front-end only protection
  const ADMIN_PASS = 'angel';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const state = {
    plan: 'free',                // free | premium
    freeColor: 'pink',           // pink blue orange purple green
    frame: 'arch',               // arch flat dawn
    paper: 'cotton',             // cotton grain linen
    premium: 'p1',               // p1..p7
    // sample data
    sample: null,
    gallery: [],
    gIndex: 0,
    // contact links extracted from sample
    links: { line:'', wechat:'', phone:'', email:'', map:'' },
    // admin
    verTapCount: 0,
    verTapTimer: null,
  };

  // ---------- Helpers ----------
  function setMsg(text){
    const el = $('#sysMsg');
    if (!el) return;
    el.textContent = text || '';
  }

  function safeURL(u){
    if (!u) return '';
    let s = String(u).trim();
    if (!s) return '';

    // Normalize common Google Drive share links to direct view
    // file/d/<id>/view
    let m = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    // open?id=<id>
    m = s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    // uc?id=<id>
    m = s.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

    // If it's a LINE OA link, keep
    // If missing scheme for phone/email/map/line/wechat, later builder will add
    return s;
  }

  function openUrl(url){
    const u = safeURL(url);
    if (!u) return;
    window.open(u, '_blank', 'noopener,noreferrer');
  }

  function copyText(text){
    const t = String(text || '').trim();
    if (!t) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(()=>true).catch(()=>fallbackCopy(t));
    }
    return Promise.resolve(fallbackCopy(t));
  }
  function fallbackCopy(text){
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }catch(e){
      return false;
    }
  }

  function withTimeout(promise, ms){
    let t;
    const timeout = new Promise((_, rej)=>{ t=setTimeout(()=>rej(new Error('timeout')), ms); });
    return Promise.race([promise.finally(()=>clearTimeout(t)), timeout]);
  }

  async function fetchJson(url){
    const res = await withTimeout(fetch(url, { method:'GET', cache:'no-store' }), 12000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function pickFirst(obj, keys){
    for (const k of keys){
      if (obj && obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
    }
    return '';
  }

  function normalizeRow(row){
    // Accept both flat objects and nested row.data
    const r = row && row.data ? row.data : row;
    if (!r || typeof r !== 'object') return null;

    // Normalize common field aliases
    const name = pickFirst(r, ['name','姓名','display_name','full_name','title_name']);
    const title = pickFirst(r, ['role','職稱','subtitle','tagline','about','介紹','bio']);
    const avatar = safeURL(pickFirst(r, ['avatar','頭像','photo','photo_url','img','image']));

    // Contacts
    const line = safeURL(pickFirst(r, ['line','LINE','line_url','line_link','lineOA','line_oa','line_official']));
    const wechat = safeURL(pickFirst(r, ['wechat','微信','weixin','wx']));
    const phone = pickFirst(r, ['phone','電話','tel','mobile']);
    const email = pickFirst(r, ['email','Email','mail']);
    const map = safeURL(pickFirst(r, ['map','地圖','map_url','address','地址','location']));

    // Gallery: allow array fields or delimited strings
    let gallery = [];
    const g1 = r.gallery || r.Gallery || r.samples || r.作品 || r.images || r.imgs || r.photos;
    if (Array.isArray(g1)) gallery = g1;
    const g2 = pickFirst(r, ['gallery_urls','gallery_url','作品連結','作品圖','images_url','imgs_url']);
    if (!gallery.length && g2){
      const parts = String(g2).split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
      gallery = parts;
    }
    gallery = gallery.map(safeURL).filter(Boolean);

    return { raw:r, name, title, avatar, links:{line,wechat,phone,email,map}, gallery };
  }

  async function fetchSampleRow(){
    // Try several likely API shapes/actions. We DO NOT assume one specific backend.
    const candidates = [
      `${API_BASE}?action=card&id=${encodeURIComponent(SAMPLE_ID)}`,
      `${API_BASE}?action=get&id=${encodeURIComponent(SAMPLE_ID)}`,
      `${API_BASE}?action=row&id=${encodeURIComponent(SAMPLE_ID)}`,
      `${API_BASE}?action=one&id=${encodeURIComponent(SAMPLE_ID)}`,
      `${API_BASE}?action=list`,
      `${API_BASE}?action=data`,
      `${API_BASE}?`,
    ];

    let lastErr = null;
    for (const url of candidates){
      try{
        const j = await fetchJson(url);
        // Possible shapes:
        // 1) {ok:true, row:{...}}
        // 2) {ok:true, data:{...}}
        // 3) {ok:true, rows:[...]}
        // 4) {rows:[...]} or {data:[...]}
        const maybeRow = j && (j.row || j.data && !Array.isArray(j.data) ? j.data : null);
        if (maybeRow){
          const nr = normalizeRow(maybeRow);
          if (nr) return nr;
        }

        const rows = (j && (j.rows || j.data || j.items)) || [];
        if (Array.isArray(rows) && rows.length){
          // find by id (support variants)
          const found = rows.find(x => {
            const r = x && (x.data ? x.data : x);
            const id = pickFirst(r, ['id','ID','card_id','編號']);
            return String(id||'').trim().toUpperCase() === SAMPLE_ID;
          }) || rows[0];
          const nr = normalizeRow(found);
          if (nr) return nr;
        }
      }catch(e){
        lastErr = e;
      }
    }
    throw lastErr || new Error('Unable to fetch sample');
  }

  function applyPreviewState(){
    const card = $('#sampleCard');
    if (!card) return;

    card.dataset.plan = state.plan;
    card.dataset.freeColor = state.freeColor;
    card.dataset.frame = state.frame;
    card.dataset.paper = state.paper;
    card.dataset.premium = state.premium;

    // meta pills in form
    const metaPlan = $('#metaPlan');
    const metaStyle = $('#metaStyle');
    if (metaPlan) metaPlan.textContent = `方案：${state.plan==='free' ? '自由搭配款' : '精品設計款'}`;

    if (metaStyle){
      if (state.plan === 'free'){
        const cMap = { pink:'粉（紅）', blue:'藍', orange:'橘', purple:'紫', green:'綠' };
        const fMap = { arch:'正拱', flat:'平直', dawn:'晨曦' };
        const pMap = { cotton:'霧面棉紙', grain:'細顆粒紙', linen:'亞麻紋' };
        metaStyle.textContent = `樣式：${cMap[state.freeColor]} / ${fMap[state.frame]} / ${pMap[state.paper]}`;
      } else {
        const pm = { p1:'p1 胭脂', p2:'p2 酒紅', p3:'p3 深藍', p4:'p4 霧紫', p5:'p5 藍灰', p6:'p6 金箔', p7:'p7 褐碳' };
        metaStyle.textContent = `樣式：${pm[state.premium]}`;
      }
    }
  }

  function renderSample(){
    const s = state.sample;
    if (!s) return;

    $('#sampleName').textContent = s.name || 'TW0001';
    $('#sampleTitle').textContent = s.title || '（樣品資料）';

    const av = $('#sampleAvatar');
    if (av){
      if (s.avatar){
        av.src = s.avatar;
        av.style.display = 'block';
      }else{
        av.removeAttribute('src');
        av.style.display = 'none';
      }
    }

    state.links = s.links || state.links;
    state.gallery = (s.gallery && s.gallery.length) ? s.gallery : [];
    state.gIndex = 0;

    const gi = $('#sampleGalleryImg');
    if (gi){
      if (state.gallery.length){
        gi.src = state.gallery[state.gIndex];
        gi.style.display = 'block';
      }else{
        gi.removeAttribute('src');
        gi.style.display = 'none';
      }
    }

    applyPreviewState();
    setMsg(state.gallery.length ? `已載入樣品作品 ${state.gallery.length} 張` : '已載入樣品資料（未提供作品圖）');
  }

  function galleryMove(delta){
    if (!state.gallery.length) return;
    state.gIndex = (state.gIndex + delta + state.gallery.length) % state.gallery.length;
    const gi = $('#sampleGalleryImg');
    if (gi) gi.src = state.gallery[state.gIndex];
  }

  function openLightbox(){
    const gi = $('#sampleGalleryImg');
    if (!gi || !gi.src) return;
    const dlg = $('#imgDlg');
    const img = $('#imgDlgImg');
    if (!dlg || !img) return;
    img.src = gi.src;
    dlg.showModal();
  }

  function openContact(kind){
    const links = state.links || {};
    if (kind === 'line'){
      // Accept line url or id
      const v = links.line || '';
      if (!v) return setMsg('此樣品未提供 LINE 連結');
      return openUrl(v.startsWith('http') ? v : `https://line.me/R/ti/p/${encodeURIComponent(v)}`);
    }
    if (kind === 'wechat'){
      const v = links.wechat || '';
      if (!v) return setMsg('此樣品未提供 微信');
      // WeChat doesn't have universal open url; copy instead
      copyText(v).then(()=>setMsg(`已複製微信：${v}`));
      return;
    }
    if (kind === 'phone'){
      const v = (links.phone || '').trim();
      if (!v) return setMsg('此樣品未提供 電話');
      location.href = `tel:${v}`;
      return;
    }
    if (kind === 'email'){
      const v = (links.email || '').trim();
      if (!v) return setMsg('此樣品未提供 Email');
      location.href = `mailto:${v}`;
      return;
    }
    if (kind === 'map'){
      const v = (links.map || '').trim();
      if (!v) return setMsg('此樣品未提供 地圖');
      // If address only, use Google Maps search
      if (!/^https?:\/\//i.test(v)){
        openUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`);
      }else{
        openUrl(v);
      }
      return;
    }
  }

  function showPanelByPlan(){
    const freePanel = $('[data-panel="free"]');
    const premiumPanel = $('[data-panel="premium"]');
    if (!freePanel || !premiumPanel) return;

    if (state.plan === 'free'){
      freePanel.classList.remove('is-hidden');
      premiumPanel.classList.add('is-hidden');
    }else{
      premiumPanel.classList.remove('is-hidden');
      freePanel.classList.add('is-hidden');
    }
    applyPreviewState();
  }

  // Delivery link:
  // - For OG share, best is GAS action=share (server outputs OG meta)
  // - Fallback to current page url with querystring
  function buildDeliveryLink(){
    const qs = new URLSearchParams();
    qs.set('plan', state.plan);
    if (state.plan === 'free'){
      qs.set('free_color', state.freeColor);
      qs.set('frame', state.frame);
      qs.set('paper', state.paper);
    }else{
      qs.set('premium', state.premium);
    }
    // Recommend server OG page
    const share = `${API_BASE}?action=share&sample=${encodeURIComponent(SAMPLE_ID)}&${qs.toString()}`;
    return share;
  }

  // Built-in form submit
  async function submitForm(){
    const payload = {
      // core
      name: ($('#f_name').value || '').trim(),
      title: ($('#f_title').value || '').trim(),
      phone: ($('#f_phone').value || '').trim(),
      email: ($('#f_email').value || '').trim(),
      line: ($('#f_line').value || '').trim(),
      wechat: ($('#f_wechat').value || '').trim(),
      map: ($('#f_map').value || '').trim(),
      note: ($('#f_note').value || '').trim(),
      // selections
      plan: state.plan,
      free_color: state.freeColor,
      frame: state.frame,
      paper: state.paper,
      premium: state.premium,
      status: 'new',
    };

    const btn = $('#btnSubmit');
    if (btn) { btn.disabled = true; btn.textContent = '送出中…'; }

    try{
      // Try POST JSON
      const res = await withTimeout(fetch(API_BASE, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ action:'submit', ...payload }),
      }), 15000);

      let ok = false;
      try{
        const j = await res.json();
        ok = !!(j && (j.ok || j.status===200));
      }catch(_){
        ok = res.ok;
      }

      if (!ok) throw new Error('POST submit failed');

      setMsg('已送出！我們會盡快與你聯繫。');
      const dlg = $('#formDlg'); if (dlg) dlg.close();
      return;
    }catch(e){
      // Fallback GET (querystring)
      try{
        const qs = new URLSearchParams();
        qs.set('action','submit');
        Object.entries(payload).forEach(([k,v]) => qs.set(k, String(v ?? '')));
        const url = `${API_BASE}?${qs.toString()}`;
        const j = await fetchJson(url);
        if (!(j && (j.ok || j.status===200))) throw new Error('GET fallback failed');
        setMsg('已送出！我們會盡快與你聯繫。');
        const dlg = $('#formDlg'); if (dlg) dlg.close();
        return;
      }catch(e2){
        console.error(e, e2);
        setMsg('送出失敗：目前後台未回應。請先用 LINE 官方帳號預約。');
        return;
      }
    }finally{
      if (btn) { btn.disabled = false; btn.textContent = '送出'; }
    }
  }

  // Admin
  async function adminList(){
    const pass = ($('#adminPass').value || '').trim();
    if (pass !== ADMIN_PASS){
      $('#adminLog').textContent = '密碼錯誤';
      return;
    }
    $('#adminLog').textContent = '讀取中…';
    const candidates = [
      `${API_BASE}?action=admin_list&limit=50&key=${encodeURIComponent(pass)}`,
      `${API_BASE}?action=admin_list&limit=50&pass=${encodeURIComponent(pass)}`,
      `${API_BASE}?action=list&limit=50`,
    ];
    for (const url of candidates){
      try{
        const j = await fetchJson(url);
        $('#adminLog').textContent = JSON.stringify(j, null, 2);
        return;
      }catch(e){
        // continue
      }
    }
    $('#adminLog').textContent = '後台清單讀取失敗（API 端未開啟 admin_list 或限制權限）';
  }

  function tryOpenAdminByTripleTap(){
    state.verTapCount++;
    clearTimeout(state.verTapTimer);
    state.verTapTimer = setTimeout(()=>{ state.verTapCount = 0; }, 900);

    if (state.verTapCount >= 3){
      state.verTapCount = 0;
      const dlg = $('#adminDlg');
      if (dlg) dlg.showModal();
    }
  }

  // ---------- Event Delegation ----------
  function onClick(e){
    const t = e.target.closest('[data-action], #btnCopyDelivery, #openAdmin, #btnSubmit, #btnAdminList');
    if (!t) return;

    const action = t.dataset.action || t.id;

    if (action === 'pick-plan'){
      const plan = t.dataset.plan;
      state.plan = (plan === 'premium') ? 'premium' : 'free';
      // toggle seg active
      $$('.seg__btn').forEach(b => b.classList.toggle('is-active', b.dataset.plan === state.plan));
      showPanelByPlan();
      applyPreviewState();
      return;
    }

    if (action === 'pick-free-color'){
      state.freeColor = t.dataset.value;
      $$('.dot').forEach(b => b.classList.toggle('is-selected', b === t));
      applyPreviewState();
      return;
    }

    if (action === 'pick-frame'){
      state.frame = t.dataset.value;
      $$('.chips [data-action="pick-frame"]').forEach(b => b.classList.toggle('is-selected', b === t));
      applyPreviewState();
      return;
    }

    if (action === 'pick-paper'){
      state.paper = t.dataset.value;
      $$('.chips [data-action="pick-paper"]').forEach(b => b.classList.toggle('is-selected', b === t));
      applyPreviewState();
      return;
    }

    if (action === 'pick-premium'){
      state.premium = t.dataset.value;
      $$('.pbtn').forEach(b => b.classList.toggle('is-selected', b === t));
      applyPreviewState();
      return;
    }

    if (action === 'open-line'){
      e.preventDefault();
      // Prefer sample line OA if provided; otherwise copy placeholder
      const line = (state.links && state.links.line) ? state.links.line : '';
      if (line){
        openUrl(line);
      }else{
        setMsg('尚未取得 LINE 連結（請確認試算表欄位是否有 line/LINE/line_url）');
      }
      return;
    }

    if (action === 'open-form'){
      e.preventDefault();
      const dlg = $('#formDlg');
      if (dlg) dlg.showModal();
      applyPreviewState();
      return;
    }

    if (action === 'btnSubmit' || action === 'btnSubmit'.toLowerCase()){
      submitForm();
      return;
    }

    if (action === 'contact'){
      const kind = t.dataset.kind;
      openContact(kind);
      return;
    }

    if (action === 'gallery-prev'){
      galleryMove(-1);
      return;
    }
    if (action === 'gallery-next'){
      galleryMove(1);
      return;
    }

    // lightbox open by clicking gallery image
    if (t.id === 'sampleGalleryImg' || (t.tagName === 'IMG' && t.closest('.gframe'))){
      openLightbox();
      return;
    }

    if (action === 'btnCopyDelivery' || t.id === 'btnCopyDelivery'){
      const link = buildDeliveryLink();
      Promise.resolve(copyText(link)).then(()=> setMsg('已複製一鍵交貨連結（貼出去會出 OG 卡）'));
      return;
    }

    if (action === 'openAdmin' || t.id === 'openAdmin'){
      tryOpenAdminByTripleTap();
      return;
    }

    if (action === 'btnAdminList' || t.id === 'btnAdminList'){
      adminList();
      return;
    }
  }

  // ---------- Init ----------
  async function init(){
    // PWA SW
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('./sw.js?v=3857').catch(()=>{});
    }

    // click delegation
    document.addEventListener('click', onClick, { passive:false });

    // triple tap on version text
    const ver = $('#ver');
    if (ver){
      ver.addEventListener('click', (e)=>{ e.preventDefault(); tryOpenAdminByTripleTap(); });
    }

    // also allow click on gallery image
    const gimg = $('#sampleGalleryImg');
    if (gimg){
      gimg.addEventListener('click', (e)=>{ e.preventDefault(); openLightbox(); });
    }

    // Load sample data
    setMsg('讀取樣品資料（TW0001）…');
    try{
      const row = await fetchSampleRow();
      state.sample = row;
      renderSample();
    }catch(err){
      console.error(err);
      setMsg('無法讀取樣品資料：請確認 GAS 已允許匿名讀取、且 action/list/card 端點存在。');
      // Still allow preview switching without data
      state.sample = { name:'TW0001', title:'（未讀取到資料）', avatar:'', links:{}, gallery:[] };
      renderSample();
    }

    showPanelByPlan();
    applyPreviewState();
  }

  init();
})();
