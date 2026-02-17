/* Angel Happy Smart Card V358 - app.js (Complete Overwrite) */
(() => {
  const VERSION = 358;

  // ✅ Remember (for main page only)
  const LS_THEME = 'angel_card_theme';
  const LS_STYLE = 'angel_card_style';
  const LS_PAPER = 'angel_card_paper';

  // ✅ Google Form base (kept same)
  const FORM_BASE = "https://forms.gle/dkeHW9tfEYiGx39U9";
  const FORM_PREFILL = "";

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=' + VERSION).catch(() => {});
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get('id');

  let allRows = [];
  let clicks = 0;

  // default selections (for main page choosing UI)
  let curTheme = urlParams.get('theme') || localStorage.getItem(LS_THEME) || 'warm-pink';
  let curStyle = urlParams.get('style') || localStorage.getItem(LS_STYLE) || 'arch';
  let curPaper = urlParams.get('paper') || localStorage.getItem(LS_PAPER) || 'cotton';

  let uiMain = !urlId;

  function openInstallModal(){ document.getElementById('install-modal').style.display = 'flex'; }
  function closeInstallModal(){ document.getElementById('install-modal').style.display = 'none'; }
  function switchTab(type){
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    if(type === 'apple'){
      document.querySelectorAll('.tab-btn')[0].classList.add('active');
      document.getElementById('apple-pane').classList.add('active');
    } else {
      document.querySelectorAll('.tab-btn')[1].classList.add('active');
      document.getElementById('android-pane').classList.add('active');
    }
  }

  async function safeCopy(text){
    try{
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(e){}
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }catch(e){
      return false;
    }
  }

  async function copyCurrentUrl(){
    const ok = await safeCopy(window.location.href);
    alert(ok ? "網址已複製！" : "此瀏覽器限制複製，請長按網址列複製");
  }

  function showWechatText(){ document.getElementById('wechat-mask').style.display = 'flex'; }
  async function copyWechat(){
    const ok = await safeCopy(document.getElementById('wechat-id-text').innerText);
    alert(ok ? "微信 ID 已複製！" : "此瀏覽器限制複製，請手動複製");
  }

  function setTheme(t){
    curTheme = t;
    localStorage.setItem(LS_THEME, t);
    updateClass();
    syncStyleButtons();
    syncPaperButtons();
    updateFormLink();
  }
  function setStyle(s, btn){
    curStyle = s;
    localStorage.setItem(LS_STYLE, s);
    updateClass();
    if(btn){
      document.querySelectorAll('#admin-panel .picker-group:nth-of-type(3) .btn-style').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    syncStyleButtons();
    syncPaperButtons();
    updateFormLink();
  }
  function setPaper(p, btn){
    curPaper = p;
    localStorage.setItem(LS_PAPER, p);
    updateClass();
    if(btn){
      const paperRow = btn.parentElement;
      paperRow.querySelectorAll('.btn-style').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    syncStyleButtons();
    syncPaperButtons();
    updateFormLink();
  }

  function updateClass(){
    document.body.className = `${curTheme} style-${curStyle} paper-${curPaper}${uiMain ? ' mode-main' : ' mode-delivery'}`;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--p').trim() || '#ee5253');
  }

  function syncStyleButtons(){
    const btns = document.querySelectorAll('#admin-panel .picker-group:nth-of-type(3) .btn-style');
    btns.forEach(b => b.classList.remove('active'));
    const mapBtn = { arch:0, flat:1, spot:2 };
    const idx = mapBtn[curStyle] ?? 0;
    if(btns[idx]) btns[idx].classList.add('active');
  }

  function syncPaperButtons(){
    const paperBtns = document.querySelectorAll('#admin-panel .picker-group:nth-of-type(4) .btn-style');
    paperBtns.forEach(b => b.classList.remove('active'));
    const map = { cotton:0, grain:1, linen:2, watercolor:3 };
    const idx = map[curPaper] ?? 0;
    if(paperBtns[idx]) paperBtns[idx].classList.add('active');
  }

  function handleGate(){
    if(!uiMain) return;
    clicks++;
    if(clicks >= 3){
      document.getElementById('work-drawer').style.maxHeight = '500px';
      clicks = 0;
    }
    setTimeout(() => clicks = 0, 1000);
  }

  async function handleShare(){
    const ok = await safeCopy(window.location.href);
    alert(ok ? "連結複製成功！" : "此瀏覽器限制複製，請長按網址列複製");
  }

  function fixImg(url){
    if(!url) return "";
    const idMatch = url.match(/id=([-\w]+)/) || url.match(/d\/([-\w]+)/);
    return idMatch ? `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000` : url;
  }

  function splitPhotos(raw){
    if(!raw) return [];
    return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  }

  function parseCSV(text){
    const rows = [];
    let row = [];
    let cur = '';
    let i = 0;
    let inQuotes = false;

    while(i < text.length){
      const ch = text[i];

      if(inQuotes){
        if(ch === '"'){
          const next = text[i+1];
          if(next === '"'){ cur += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cur += ch; i++; continue;
      }else{
        if(ch === '"'){ inQuotes = true; i++; continue; }
        if(ch === ','){ row.push(cur.trim()); cur=''; i++; continue; }
        if(ch === '\n' || ch === '\r'){
          if(ch === '\r' && text[i+1] === '\n') i++;
          row.push(cur.trim()); cur='';
          if(row.some(c => c !== '')) rows.push(row);
          row = []; i++; continue;
        }
        cur += ch; i++; continue;
      }
    }
    row.push(cur.trim());
    if(row.some(c => c !== '')) rows.push(row);
    return rows;
  }

  async function loadSheetData(){
    const csvUrl = "https://docs.google.com/spreadsheets/d/16c21SGmuUVpKVnUrCvWt88OWZdepI76hawWW3DvNJMY/export?format=csv&gid=1350316682&t=" + Date.now();
    try{
      const res = await fetch(csvUrl, { cache: 'no-store' });
      if(!res.ok) throw new Error('bad status');
      const text = await res.text();
      allRows = parseCSV(text);
    } catch(e){
      console.log("資料同步中");
    }
  }

  const isLineDomain = (v) => {
    const s = (v || '').toLowerCase();
    return (
      s.startsWith('line://') ||
      s.includes('line.me') ||
      s.includes('lin.ee') ||
      s.includes('liff.line.me') ||
      s.includes('linevoom.line.me') ||
      s.includes('openchat.line.me') ||
      s.includes('line.biz') ||
      s.includes('access.line.me') ||
      s.includes('social-plugins.line.me')
    );
  };

  const isMapUrl = (u) => {
    const v = (u || "").toLowerCase();
    return (
      v.includes('google.com/maps') ||
      v.includes('maps.google') ||
      v.includes('maps.app.goo.gl') ||
      v.includes('share.google') ||
      v.includes('goo.gl/maps') ||
      v.includes('maps.apple.com')
    );
  };

  const parseAddressOrUrl = (raw) => {
    const s = (raw || "").trim();
    if(!s) return { type:'none', value:'' };
    const httpIdx = s.indexOf('http');
    if(httpIdx >= 0){
      const maybeAddr = s.slice(0, httpIdx).trim();
      const maybeUrl  = s.slice(httpIdx).trim();
      return { type:'mixed', addr: maybeAddr, url: maybeUrl };
    }
    return { type:'plain', value: s };
  };

  const toNavUrl = (raw) => {
    const p = parseAddressOrUrl(raw);

    if(p.type === 'mixed'){
      if(p.addr){
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.addr)}`;
      }
      if(p.url){
        if((p.url || "").toLowerCase().includes('maps.apple.com')) return p.url;
        if(isMapUrl(p.url)){
          return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.url)}`;
        }
        return p.url;
      }
    }

    if(p.type === 'plain' && p.value.includes('http')){
      const url = p.value;
      if(url.toLowerCase().includes('maps.apple.com')) return url;
      if(isMapUrl(url)) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(url)}`;
      return url;
    }

    if(p.type === 'plain'){
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.value)}`;
    }

    return '';
  };

  const isProbablyAddress = (raw) => {
    const s = (raw || "").trim();
    if(!s) return false;
    if(/[市縣區鄉鎮里路街巷弄號樓]/.test(s)) return true;
    if(/^\d{3}(\d{2})?\s?/.test(s)) return true;
    if(s.includes('http') && isMapUrl(s)) return true;
    if(s.includes('http') && s.indexOf('http') > 0) return true;
    return false;
  };

  const linkIconHtml = (val) => {
    const raw = String(val || "").trim();
    const v = raw.toLowerCase();
    if(isProbablyAddress(raw)) return '<i class="fa-solid fa-map-location-dot"></i>';
    if(v.includes('youtube') || v.includes('youtu.be')) return '<i class="fa-solid fa-play"></i>';
    if(v.includes('tiktok') || v.includes('douyin')) return '<i class="fa-brands fa-tiktok"></i>';
    return '<i class="fa-solid fa-link"></i>';
  };

  const normalizeWebOrAddress = (val) => {
    const raw = String(val || "").trim();
    if(!raw) return "";
    if(isLineDomain(raw)) return "";
    if(raw.toLowerCase().includes('drive.google.com')) return "";
    if(isProbablyAddress(raw)) return toNavUrl(raw);
    const httpIdx = raw.indexOf('http');
    if(httpIdx < 0) return "";
    return raw.slice(httpIdx).trim();
  };

  function fillSocialLinks(list){
    for(let i=1; i<=3; i++){
      const el = document.getElementById('lk'+i);
      el.style.display = 'none';
      el.href = '#';
      el.innerHTML = '';
    }

    const cleaned = [];
    (list || []).forEach(v => {
      const href = normalizeWebOrAddress(v);
      if(!href) return;
      cleaned.push({ raw: String(v||'').trim(), href });
    });

    let count = 1;
    for(const item of cleaned){
      if(count > 3) break;
      const el = document.getElementById('lk'+count);
      el.style.display = 'flex';
      el.innerHTML = linkIconHtml(item.raw);
      el.href = item.href;
      count++;
    }
  }

  function layoutActionsGrid(){
    const actions = document.getElementById('actions-area');
    if(!actions) return;
    const btns = Array.from(actions.querySelectorAll('a.act-btn'))
      .filter(el => getComputedStyle(el).display !== 'none' && !el.classList.contains('btn-main'));

    btns.forEach(b => b.style.gridColumn = '');
    if(btns.length % 2 === 1){
      const last = btns[btns.length - 1];
      last.style.gridColumn = 'span 2';
    }
  }

  function normalizeThemeFromSheet(v){
    const s = String(v||'').trim().toLowerCase();
    if(!s) return "";
    if(['warm-pink','aurora-blue','vivid-orange','royal-purple','teal-green'].includes(s)) return s;
    if(s.includes('粉') || s.includes('暖')) return 'warm-pink';
    if(s.includes('藍') || s.includes('極光')) return 'aurora-blue';
    if(s.includes('橘')) return 'vivid-orange';
    if(s.includes('紫')) return 'royal-purple';
    if(s.includes('綠') || s.includes('青')) return 'teal-green';
    return "";
  }
  function normalizeStyleFromSheet(v){
    const s = String(v||'').trim().toLowerCase();
    if(!s) return "";
    if(['arch','flat','spot'].includes(s)) return s;
    if(s.includes('拱')) return 'arch';
    if(s.includes('平') || s.includes('簡潔')) return 'flat';
    if(s.includes('光') || s.includes('聚')) return 'spot';
    return "";
  }
  function normalizePaperFromSheet(v){
    const s = String(v||'').trim().toLowerCase();
    if(!s) return "";
    if(['cotton','grain','linen','watercolor'].includes(s)) return s;
    if(s.includes('棉')) return 'cotton';
    if(s.includes('顆粒') || s.includes('砂')) return 'grain';
    if(s.includes('亞麻') || s.includes('麻')) return 'linen';
    if(s.includes('水彩')) return 'watercolor';
    return "";
  }

  function updateFormLink(){
    const a = document.getElementById('form-link');
    if(!a) return;

    if(FORM_PREFILL){
      const url = FORM_PREFILL
        .replaceAll('__THEME__', encodeURIComponent(curTheme))
        .replaceAll('__STYLE__', encodeURIComponent(curStyle))
        .replaceAll('__PAPER__', encodeURIComponent(curPaper));
      a.href = url;
      return;
    }
    a.href = FORM_BASE;
  }

  function goFillForm(){
    updateFormLink();
    window.open(document.getElementById('form-link').href, '_blank', 'noopener');
  }

  // ===== photo carousel + viewer state =====
  let pvList = [];
  let pvIndex = 0;

  function buildPhotoCarousel(rawList){
    const box = document.getElementById('photos-box');
    const rail = document.getElementById('photo-carousel');
    const dots = document.getElementById('photo-dots');

    rail.innerHTML = '';
    dots.innerHTML = '';

    const list = (rawList || []).filter(Boolean);
    if(!list.length){
      box.style.display = 'none';
      return;
    }

    box.style.display = '';
    pvList = list.map(u => ({ raw:u, fixed: fixImg(u) || u }));

    pvList.forEach((item, idx) => {
      const slide = document.createElement('div');
      slide.className = 'photo-slide';
      slide.setAttribute('data-idx', String(idx));
      slide.innerHTML = `<img alt="photo${idx+1}" loading="lazy" src="${item.fixed}">`;
      slide.addEventListener('click', () => showPhotoViewer(idx));
      rail.appendChild(slide);

      const dot = document.createElement('div');
      dot.className = 'photo-dot' + (idx === 0 ? ' active' : '');
      dots.appendChild(dot);
    });

    dots.style.display = (pvList.length > 1) ? 'flex' : 'none';

    let ticking = false;
    rail.addEventListener('scroll', () => {
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const slides = Array.from(rail.querySelectorAll('.photo-slide'));
        if(!slides.length) return;
        const railRect = rail.getBoundingClientRect();
        const centerX = railRect.left + railRect.width / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        slides.forEach((s, i) => {
          const r = s.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const d = Math.abs(cx - centerX);
          if(d < bestDist){ bestDist = d; bestIdx = i; }
        });
        setCarouselDot(bestIdx);
      });
    }, { passive:true });
  }

  function setCarouselDot(idx){
    const dots = document.getElementById('photo-dots');
    const arr = Array.from(dots.querySelectorAll('.photo-dot'));
    arr.forEach(d => d.classList.remove('active'));
    if(arr[idx]) arr[idx].classList.add('active');
  }

  function showPhotoViewer(idx){
    if(!pvList.length) return;
    pvIndex = Math.max(0, Math.min(idx, pvList.length - 1));
    document.getElementById('photo-viewer').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    pvRender();
  }

  function hidePhotoViewer(){
    document.getElementById('photo-viewer').style.display = 'none';
    document.body.style.overflow = '';
  }

  function closePhotoViewer(){ hidePhotoViewer(); }

  function pvRender(){
    const img = document.getElementById('pv-img');
    const counter = document.getElementById('pv-counter');
    const dots = document.getElementById('pv-dots');
    const prevBtn = document.getElementById('pv-prev');
    const nextBtn = document.getElementById('pv-next');

    const item = pvList[pvIndex];
    img.src = item ? item.fixed : '';
    counter.textContent = `${pvIndex + 1} / ${pvList.length}`;

    prevBtn.style.display = pvList.length > 1 ? 'flex' : 'none';
    nextBtn.style.display = pvList.length > 1 ? 'flex' : 'none';

    dots.innerHTML = '';
    if(pvList.length > 1){
      pvList.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'pv-dot' + (i === pvIndex ? ' active' : '');
        dots.appendChild(d);
      });
    }
  }

  function pvPrev(e){
    if(e) e.stopPropagation();
    if(pvList.length <= 1) return;
    pvIndex = (pvIndex - 1 + pvList.length) % pvList.length;
    pvRender();
  }
  function pvNext(e){
    if(e) e.stopPropagation();
    if(pvList.length <= 1) return;
    pvIndex = (pvIndex + 1) % pvList.length;
    pvRender();
  }

  (function bindPvSwipe(){
    const stage = () => document.getElementById('pv-stage');
    let startX = 0, startY = 0, moved = false;

    const onStart = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev;
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
    };
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if(Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) moved = true;
    };
    const onEnd = (ev) => {
      if(!moved || pvList.length <= 1) return;
      const t = ev.changedTouches ? ev.changedTouches[0] : ev;
      const dx = t.clientX - startX;
      if(Math.abs(dx) < 35) return;
      if(dx < 0) pvNext();
      else pvPrev();
    };

    window.addEventListener('load', () => {
      const el = stage();
      if(!el) return;
      el.addEventListener('touchstart', onStart, { passive:true });
      el.addEventListener('touchmove', onMove, { passive:true });
      el.addEventListener('touchend', onEnd, { passive:true });
    });
  })();

  window.addEventListener('keydown', (e) => {
    if(document.getElementById('photo-viewer').style.display !== 'flex') return;
    if(e.key === 'Escape') hidePhotoViewer();
    if(e.key === 'ArrowLeft') pvPrev();
    if(e.key === 'ArrowRight') pvNext();
  });

  function renderMainFixedFirstRow(){
    if(!allRows[0] || !allRows[1]) return;
    applyRow(allRows[0], allRows[1], { isMainData:true, keepUiMain:true });
  }

  function renderById(keyword, keepUiMain){
    if(!keyword || !allRows[0]) return false;
    const h = allRows[0];
    const d = allRows.find((r, idx) => idx !== 0 && (r[0] == keyword || r[1] == keyword));
    if(!d) return false;
    applyRow(h, d, { isMainData:false, keepUiMain: !!keepUiMain });
    return true;
  }

  function doPreviewInPlace(){
    const id = (document.getElementById('work-id').value || "").trim();
    if(!id){ alert("請先輸入序號或姓名"); return; }
    const ok = renderById(id, true);
    if(!ok){ alert("找不到此序號/姓名"); return; }
    document.querySelector('.info-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function applyRow(h, d, opt){
    const isMainData = !!(opt && opt.isMainData);
    const keepUiMain = !!(opt && opt.keepUiMain);

    uiMain = keepUiMain ? true : !urlId;

    const getVal = (key) => {
      const idx = h.findIndex(head => (head || "").includes(key));
      return (idx !== -1 && d[idx]) ? d[idx] : "";
    };

    const prefTheme = normalizeThemeFromSheet(getVal('您喜歡的顏色'));
    const prefStyle = normalizeStyleFromSheet(getVal('您喜歡的版型'));
    const prefPaper = normalizePaperFromSheet(getVal('您喜歡的紙感'));

    curTheme = prefTheme || (urlParams.get('theme') || localStorage.getItem(LS_THEME) || curTheme || 'warm-pink');
    curStyle = prefStyle || (urlParams.get('style') || localStorage.getItem(LS_STYLE) || curStyle || 'arch');
    curPaper = prefPaper || (urlParams.get('paper') || localStorage.getItem(LS_PAPER) || curPaper || 'cotton');

    if(uiMain){
      localStorage.setItem(LS_THEME, curTheme);
      localStorage.setItem(LS_STYLE, curStyle);
      localStorage.setItem(LS_PAPER, curPaper);
    }

    updateClass();
    updateFormLink();

    const name   = getVal('姓名');
    const unit   = getVal('單位') || getVal('單位名稱');
    const motto  = getVal('理念標語');
    const service= getVal('服務項目') || getVal('服務');
    const titles = getVal('重要頭銜') || getVal('獎銜') || getVal('重要頭銜/獎銜');
    const avatar = fixImg(getVal('個人專業形象照') || getVal('形象照'));
    const photos = splitPhotos(getVal('產品或品牌或活動照片'));
    const logo   = fixImg(getVal('品牌 Logo') || getVal('品牌Logo') || getVal('Logo'));
    const wechat = getVal('微信') || getVal('微信 ID');
    const email  = getVal('一鍵聯繫 Email') || getVal('Email') || getVal('郵箱');
    const phone  = getVal('一鍵聯繫電話') || getVal('電話');
    const lineP  = getVal('私訊 LINE') || getVal('LINE 加好友') || getVal('個人好友');
    const lineOA = getVal('LINE 官方') || getVal('官方帳號') || getVal('​LINE 官方帳號連結');

    const v1 = getVal('影音平台 1') || getVal('影音平台1');
    const v2 = getVal('影音平台 2') || getVal('影音平台2');
    const v3 = getVal('影音平台 3') || getVal('影音平台3');
    const s1 = getVal('社群平台 1') || getVal('社群平台1');
    const s2 = getVal('社群平台 2') || getVal('社群平台2');
    const s3 = getVal('社群平台 3') || getVal('社群平台3');

    const q1 = getVal('客戶常見提問 1') || getVal('Q1');
    const a1 = getVal('專業解答 1') || getVal('A1');
    const q2 = getVal('客戶常見提問 2') || getVal('Q2');
    const a2 = getVal('專業解答2') || getVal('專業解答 2') || getVal('A2');

    document.getElementById('u-name').innerText = name || "（未填姓名）";
    document.getElementById('u-unit').innerText = unit || "（未填單位）";
    document.getElementById('u-service').innerText = service || "（未填服務項目）";

    document.getElementById('u-img').src = avatar || "https://drive.google.com/thumbnail?id=18izl3Ym9zRDLtqe6zplRhB7mFjDA3tuB&sz=w1000";

    const mottoEl = document.getElementById('u-motto');
    if(motto){ mottoEl.style.display=''; mottoEl.innerText=motto; }
    else { mottoEl.style.display='none'; mottoEl.innerText=''; }

    const logoWrap = document.getElementById('brand-logo');
    const logoImg  = document.getElementById('u-logo');
    if(logo){
      logoImg.src = logo;
      logoWrap.style.display = 'flex';
    } else {
      logoImg.src = '';
      logoWrap.style.display = 'none';
    }

    buildPhotoCarousel(photos);

    const titlesBox = document.getElementById('titles-box');
    const titlesEl  = document.getElementById('u-titles');
    if(titles){
      titlesBox.style.display = '';
      titlesEl.innerText = titles;
    } else {
      titlesBox.style.display = 'none';
      titlesEl.innerText = '';
    }

    const faqBox = document.getElementById('faq-box');
    const faq1 = document.getElementById('faq-1');
    const faq2 = document.getElementById('faq-2');
    let anyFaq = false;

    if(q1 || a1){
      anyFaq = true;
      faq1.style.display = '';
      document.getElementById('q1').innerText = q1 || "常見提問";
      document.getElementById('a1').innerText = a1 || "";
    } else {
      faq1.style.display = 'none';
    }

    if(q2 || a2){
      anyFaq = true;
      faq2.style.display = '';
      document.getElementById('q2').innerText = q2 || "常見提問";
      document.getElementById('a2').innerText = a2 || "";
    } else {
      faq2.style.display = 'none';
    }
    faqBox.style.display = anyFaq ? '' : 'none';

    fillSocialLinks([v1, v2, v3, s1, s2, s3]);

    if(isMainData){
      document.getElementById('advantage-box').style.display = 'block';
      document.getElementById('order-box').style.display = 'block';
      document.getElementById('install-entry').style.display = 'none';
      document.getElementById('wechat-id-text').innerText = "a0973180707";
      document.getElementById('line-guide').style.display = 'block';
    } else {
      document.getElementById('advantage-box').style.display = 'none';
      document.getElementById('order-box').style.display = 'none';
      document.getElementById('install-entry').style.display = 'block';
      document.getElementById('wechat-id-text').innerText = wechat || "未提供";
      document.getElementById('line-guide').style.display = uiMain ? 'block' : 'none';
    }

    document.getElementById('share-cta-text').innerText = "複製網址，分享名片給朋友";

    if(!isMainData){
      const btnOA = document.getElementById('btn-oa');
      if(lineOA && String(lineOA).includes('http')){ btnOA.href = lineOA; btnOA.style.display = 'flex'; }
      else { btnOA.style.display = 'none'; }

      const btnP = document.getElementById('btn-p');
      if(lineP && String(lineP).includes('http')){ btnP.href = lineP; btnP.style.display = 'flex'; }
      else { btnP.style.display = 'none'; }

      const btnMail = document.getElementById('btn-mail');
      if(email){ btnMail.href = `mailto:${email}`; btnMail.style.display = 'flex'; }
      else { btnMail.style.display = 'none'; }

      const actions = document.getElementById('actions-area');
      let phoneBtn = document.getElementById('btn-phone');
      if(!phoneBtn){
        phoneBtn = document.createElement('a');
        phoneBtn.id = 'btn-phone';
        phoneBtn.className = 'act-btn framed';
        phoneBtn.innerHTML = `
          <span class="btn-ico"><i class="fa-solid fa-phone"></i></span>
          <span class="btn-txt">
            <span class="btn-title">一鍵撥號</span>
            <span class="btn-subtitle">立即通話</span>
          </span>
        `;
        actions.appendChild(phoneBtn);
      }
      if(phone){
        phoneBtn.href = `tel:${String(phone).replace(/\s+/g,'')}`;
        phoneBtn.style.display = 'flex';
      } else {
        phoneBtn.style.display = 'none';
      }

      const btnWechat = document.getElementById('btn-wechat');
      if(wechat){ btnWechat.style.display = 'flex'; }
      else { btnWechat.style.display = 'none'; }
    } else {
      document.getElementById('btn-oa').style.display = 'flex';
      document.getElementById('btn-p').style.display  = 'flex';
      document.getElementById('btn-mail').style.display= 'flex';
      document.getElementById('btn-wechat').style.display='flex';
      const phoneBtn = document.getElementById('btn-phone');
      if(phoneBtn) phoneBtn.style.display = 'none';
    }

    layoutActionsGrid();
  }

  async function doCopy(){
    const id = (document.getElementById('work-id').value || "").trim();
    if(!id){ alert("請先輸入序號或姓名"); return; }
    const finalUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(id)}&theme=${encodeURIComponent(curTheme)}&style=${encodeURIComponent(curStyle)}&paper=${encodeURIComponent(curPaper)}`;
    const ok = await safeCopy(finalUrl);
    alert(ok ? "✅ 交貨網址已複製！（成品以資料列外觀為主）" : "此瀏覽器限制複製，請手動複製網址列");
  }

  async function init(){
    await loadSheetData();

    if(urlId){
      uiMain = false;
      const ok = renderById(urlId, false);
      if(!ok){
        uiMain = true;
        renderMainFixedFirstRow();
      }
    } else {
      uiMain = true;
      renderMainFixedFirstRow();
    }

    updateClass();
    syncStyleButtons();
    syncPaperButtons();
    updateFormLink();
    layoutActionsGrid();
  }

  // ====== 對外(HTML inline onclick) ======
  window.openInstallModal = openInstallModal;
  window.closeInstallModal = closeInstallModal;
  window.switchTab = switchTab;

  window.copyCurrentUrl = copyCurrentUrl;

  window.showWechatText = showWechatText;
  window.copyWechat = copyWechat;

  window.setTheme = setTheme;
  window.setStyle = setStyle;
  window.setPaper = setPaper;

  window.handleGate = handleGate;
  window.handleShare = handleShare;

  window.goFillForm = goFillForm;

  window.closePhotoViewer = closePhotoViewer;
  window.hidePhotoViewer = hidePhotoViewer;
  window.pvPrev = pvPrev;
  window.pvNext = pvNext;

  window.doPreviewInPlace = doPreviewInPlace;
  window.doCopy = doCopy;

  init();
})();
