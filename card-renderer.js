(function (global) {
  'use strict';

  const DEFAULTS = { mode: 'index', root: null, useExistingDom: true, qrMode: 'card', allowActions: true };
  const BODY_MODE_CLASSES = ['mode-free', 'mode-premium'];
  const FREE_THEME_CLASSES = ['color-1','color-2','color-3','color-4','color-5'];
  const PREMIUM_THEME_CLASSES = ['p1','p2','p3','p4','p5','p6','p7'];
  const STYLE_CLASSES = ['style-arch','style-flat','style-spot'];
  const PAPER_CLASSES = ['paper-1','paper-2','paper-3'];

  function text(v){ return v == null ? '' : String(v).trim(); }
  function normalizeUrl(raw){ let v = text(raw); if (!v) return ''; if (/^(tel:|mailto:|sms:|line:|https?:\/\/|data:|blob:)/i.test(v)) return v; if (/^www\./i.test(v)) return 'https://' + v; if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return 'https://' + v; return v; }
  function isLocalUrl(url){ return typeof url === 'string' && (url.startsWith('data:') || url.startsWith('blob:')); }
  function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c])); }
  function safeParse(raw){ try { return JSON.parse(raw); } catch (_) { return null; } }
  function pick(obj, keys){ for (const k of keys) { const v = obj?.[k]; if (v != null && text(v) !== '') return v; } return ''; }

  function buildTemplate(root, mode){
    root.innerHTML = `
      <div class="hsc-render-root ${mode === 'form' ? 'hsc-render-form' : 'hsc-render-index'}">
        <section class="card" data-card-root>
          <div class="premium-fx-layer"></div>
          <div class="banner"><img class="banner-image" data-banner-image alt="Banner" /><div class="dynamic-mask"></div></div>
          <div class="paper-overlay"></div>
          <div class="avatar-wrap"><div class="avatar-circle"><img class="avatar" data-u-img alt="個人照" /></div></div>
          <div class="premium-badge" data-premium-badge style="display:none;"><span class="badge-dot"></span><span class="badge-text">精品設計</span></div>
          <div class="logo-wrap" data-logo-wrap style="display:none;"><img class="logo-img" data-u-logo alt="Logo" /></div>
          <div class="info-scroll">
            <div class="name" data-u-name></div>
            <div class="text-toggle-wrap unit-wrap" data-u-unit-wrap style="display:none;"><div class="unit" data-u-unit></div></div>
            <div class="title" data-u-title></div>
            <div class="text-toggle-wrap slogan-wrap" data-u-slogan-wrap style="display:none;"><div class="slogan preline" data-u-slogan></div></div>
            <div class="info-block" data-block-service style="display:none;"></div>
            <div class="info-block" data-block-exp style="display:none;"></div>
            <div class="contact-dock" data-contact-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-address-card"></i> 聯繫方式</div><div class="dock-buttons" data-contact-buttons></div></div>
            <div class="contact-dock marquee-dock" data-marquee-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-bullhorn"></i> 重要訊息</div><div class="marquee-shell" data-marquee-shell><div class="marquee-track" data-marquee-track><span class="marquee-text" data-marquee-text></span></div></div></div>
            <div class="contact-dock primary-link-dock" data-primary-link-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-globe"></i> 主網站</div><div class="dock-buttons" data-primary-link-buttons></div></div>
            <div class="contact-dock" data-media-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-clapperboard"></i> 影音／社群</div><div class="dock-buttons" data-media-buttons></div></div>
            <div class="contact-dock cta-dock" data-cta-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-bolt"></i> 立即行動</div><div class="dock-buttons" data-cta-buttons></div></div>
            <div class="photo-wall" data-photo-wall style="display:none;"><div class="dock-title"><i class="fa-regular fa-images"></i> 照片</div><div class="photo-grid" data-photo-grid></div></div>
            <div class="card-expiry" id="cardExpiry" style="display:none;"></div>
            <div class="qr-bottom" data-bottom-qr-section style="display:none;"><div class="qr-bottom-head"><div class="qr-bottom-title">掃描 QRcode｜開啟我的智慧名片</div><div class="qr-bottom-sub">可收藏・可分享・可快速回看</div></div><div class="qr-bottom-wrap"><div class="qr-bottom-canvas" style="position:relative;"><div class="qr-bottom-grid" data-bottom-qr-grid id="bottomQrGrid"></div><img data-bottom-qr-avatar id="bottomQrAvatar" alt="QR 頭像" /></div></div></div>
          </div>
        </section>
      </div>`;
    return getScope(root);
  }

  function getScope(root){ const q = sel => root.querySelector(sel); return { root, cardRoot:q('[data-card-root]'), banner:q('.banner'), bannerImage:q('[data-banner-image]'), premiumBadge:q('[data-premium-badge]'), avatar:q('[data-u-img]'), logoWrap:q('[data-logo-wrap]'), logo:q('[data-u-logo]'), name:q('[data-u-name]'), unitWrap:q('[data-u-unit-wrap]'), unit:q('[data-u-unit]'), title:q('[data-u-title]'), sloganWrap:q('[data-u-slogan-wrap]'), slogan:q('[data-u-slogan]'), blockService:q('[data-block-service]'), blockExp:q('[data-block-exp]'), contactDock:q('[data-contact-dock]'), contactButtons:q('[data-contact-buttons]'), marqueeDock:q('[data-marquee-dock]'), marqueeShell:q('[data-marquee-shell]'), marqueeTrack:q('[data-marquee-track]'), marqueeText:q('[data-marquee-text]'), primaryLinkDock:q('[data-primary-link-dock]'), primaryLinkButtons:q('[data-primary-link-buttons]'), mediaDock:q('[data-media-dock]'), mediaButtons:q('[data-media-buttons]'), ctaDock:q('[data-cta-dock]'), ctaButtons:q('[data-cta-buttons]'), photoWall:q('[data-photo-wall]'), photoGrid:q('[data-photo-grid]'), cardExpiry:q('#cardExpiry'), bottomQrSection:q('[data-bottom-qr-section]'), bottomQrGrid:q('[data-bottom-qr-grid]'), bottomQrAvatar:q('[data-bottom-qr-avatar]') }; }

  function normalize(data){
    const out = { ...(data || {}) };
    if (typeof out.features_json === 'string') {
      const f = safeParse(out.features_json); if (f && typeof f === 'object') out.features = f;
    } else if (out.features_json && typeof out.features_json === 'object') out.features = out.features_json;
    out.features = out.features || {};
    out.features.photo_preview_urls = out.features.photo_preview_urls || {};
    out.features.preview_meta = out.features.preview_meta || {};
    return out;
  }

  function applyTheme(scope, data){
    const root = scope.root;
    [...BODY_MODE_CLASSES, ...FREE_THEME_CLASSES, ...PREMIUM_THEME_CLASSES, ...STYLE_CLASSES, ...PAPER_CLASSES].forEach(c => root.classList.remove(c));
    const plan = text(data.features?.preview_meta?.theme || data.plan).toLowerCase() === 'premium' ? 'premium' : (text(data.plan).toLowerCase() === 'premium' ? 'premium' : 'free');
    root.classList.add(plan === 'premium' ? 'mode-premium' : 'mode-free');
    if (plan === 'premium') {
      root.classList.add(['p1','p2','p3','p4','p5','p6','p7'].includes(text(data.color).toLowerCase()) ? text(data.color).toLowerCase() : 'p1');
      scope.premiumBadge.style.display = '';
    } else {
      const freeColor = ({ c1:'color-1', c2:'color-2', c3:'color-3', c4:'color-4', c5:'color-5' })[text(data.color).toLowerCase()] || 'color-1';
      const style = ({ s1:'style-arch', s2:'style-flat', s3:'style-spot' })[text(data.style).toLowerCase()] || 'style-arch';
      const paper = ({ f1:'paper-1', f2:'paper-2', f3:'paper-3' })[text(data.paper).toLowerCase()] || 'paper-1';
      root.classList.add(freeColor, style, paper);
      scope.premiumBadge.style.display = 'none';
    }
  }

  function setImg(el, url, onFail){
    if (!el) return;
    const u = normalizeUrl(url);
    if (!u) { el.removeAttribute('src'); el.style.display = 'none'; if (onFail) onFail(); return; }
    el.style.display = 'block';
    el.onerror = () => { el.removeAttribute('src'); el.style.display='none'; if (onFail) onFail(); };
    el.src = isLocalUrl(u) ? u : u + (u.includes('?') ? '&' : '?') + 't=' + Date.now();
  }

  function renderBanner(scope, data){
    const url = pick(data, ['banner_url']) || text(data.features?.photo_preview_urls?.banner);
    if (url) { scope.banner.classList.add('has-banner'); setImg(scope.bannerImage, url); }
    else { scope.banner.classList.remove('has-banner'); scope.bannerImage.removeAttribute('src'); scope.bannerImage.style.display = 'none'; }
  }
  function renderAvatar(scope, data){ setImg(scope.avatar, pick(data, ['avatar_url']) || text(data.features?.photo_preview_urls?.avatar)); }
  function renderLogo(scope, data){ const u = pick(data, ['logo_url']) || text(data.features?.photo_preview_urls?.logo); if (u) { scope.logoWrap.style.display='flex'; setImg(scope.logo, u); } else { scope.logoWrap.style.display='none'; scope.logo.removeAttribute('src'); } }
  function renderTexts(scope, data){ scope.name.textContent = pick(data,['name','display_name']) || '未命名'; const unit = pick(data,['unit']); const title = pick(data,['title']); const slogan = pick(data,['slogan','intro']); scope.unit.textContent = unit; scope.title.textContent = title; scope.slogan.textContent = slogan; scope.unitWrap.style.display = unit ? '' : 'none'; scope.sloganWrap.style.display = slogan ? '' : 'none'; }
  function renderInfoBlock(el, title, body){ const val = text(body); if (!val) { el.style.display='none'; el.innerHTML=''; return; } el.style.display=''; el.innerHTML = `<div class="block-title">${escapeHtml(title)}</div><div class="block-body preline">${escapeHtml(val)}</div>`; }
  function renderBlocks(scope, data){ renderInfoBlock(scope.blockService, '服務項目', pick(data,['services'])); renderInfoBlock(scope.blockExp, '經歷 / 品牌故事', pick(data,['experience'])); }

  function createBtn(label, icon, cls, href, allow){ const b=document.createElement('button'); b.type='button'; b.className=`dock-btn ${cls||''}`.trim(); b.innerHTML=`<i class="${icon}"></i><span>${escapeHtml(label)}</span>`; b.addEventListener('click', () => { if (!allow) return; if (href) window.open(normalizeUrl(href), '_blank', 'noopener'); }); return b; }
  function renderContactDock(scope, data, allow){ const btns=[]; if (data.line_url || data.line_oa) btns.push(createBtn('私訊 LINE','fa-brands fa-line','dock-line', data.line_url || data.line_oa, allow)); if (data.phone) btns.push(createBtn('電話','fa-solid fa-phone','dock-web', `tel:${data.phone}`, allow)); if (data.email) btns.push(createBtn('Email','fa-solid fa-envelope','dock-web', `mailto:${data.email}`, allow)); if (data.address) btns.push(createBtn('地址導航','fa-solid fa-location-dot','dock-map', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`, allow)); if (data.wechat_id) btns.push(createBtn(`微信 ${data.wechat_id}`,'fa-brands fa-weixin','dock-web','', false)); scope.contactButtons.innerHTML=''; btns.forEach(b => scope.contactButtons.appendChild(b)); scope.contactDock.style.display = btns.length ? '' : 'none'; }
  function renderPrimaryLinkDock(scope,data,allow){ scope.primaryLinkButtons.innerHTML=''; const u = normalizeUrl(data.website); if (!u) { scope.primaryLinkDock.style.display='none'; return; } scope.primaryLinkButtons.appendChild(createBtn('官方網站','fa-solid fa-globe','dock-web wide',u,allow)); scope.primaryLinkDock.style.display=''; }
  function renderMediaDock(scope,data,allow){ const items=[]; ['video1','video2','video3'].forEach((k,i)=>{ const u=normalizeUrl(data[k]); if (u) items.push(createBtn(`影音 ${i+1}`,'fa-solid fa-play','dock-web',u,allow));}); ['social1','social2','social3'].forEach((k,i)=>{ const u=normalizeUrl(data[k]); if (u) items.push(createBtn(`社群 ${i+1}`,'fa-solid fa-link','dock-web',u,allow));}); scope.mediaButtons.innerHTML=''; items.forEach(b=>scope.mediaButtons.appendChild(b)); scope.mediaDock.style.display = items.length ? '' : 'none'; }
  function renderCtas(scope,data,allow){ scope.ctaButtons.innerHTML=''; const limit = Number(data.cta_limit || 3) || 3; let count = 0; for (let i=1;i<=10 && count<limit;i++){ const label = text(data[`cta_text_${i}`]); const link = normalizeUrl(data[`cta_link_${i}`]); if (!label || !link) continue; scope.ctaButtons.appendChild(createBtn(label, count===0 ? 'fa-solid fa-bolt':'fa-solid fa-arrow-up-right-from-square', count===0 && limit===1 ? 'dock-web wide':'dock-web', link, allow)); count++; }
    scope.ctaDock.style.display = count ? '' : 'none'; }
  function renderMarquee(scope,data){ const txt = text(data.marquee_text); if (!txt) { scope.marqueeDock.style.display='none'; scope.marqueeText.textContent=''; return; } const joined = txt.split('｜').map(s=>s.trim()).filter(Boolean).join('　｜　'); scope.marqueeText.textContent = joined + '　｜　' + joined + '　｜　'; scope.marqueeDock.style.display=''; requestAnimationFrame(() => { const shellWidth = scope.marqueeShell.clientWidth || 280; const textWidth = scope.marqueeText.scrollWidth || shellWidth; const dist = Math.max(textWidth, shellWidth); const duration = Math.max(10, Math.round(dist / 36)); scope.marqueeTrack.style.setProperty('--marquee-duration', `${duration}s`); scope.marqueeDock.classList.toggle('is-static', textWidth <= shellWidth + 20); }); }
  function renderPhotos(scope,data,allow){ const limit = Number(data.photo_limit || 0) || 0; const items=[]; for (let i=1;i<=Math.max(limit,10);i++){ const u = pick(data,[`photo${i}_url`,`photo_url_${i}`]) || text(data.features?.photo_preview_urls?.[`photo${i}`]); if (u) items.push({ key:`photo${i}`, url:u }); } scope.photoGrid.innerHTML=''; if (!items.length) { scope.photoWall.style.display='none'; return; } items.forEach((item)=>{ const tile=document.createElement('div'); tile.className='photo-tile'; const img=document.createElement('img'); img.className='wall-img'; img.alt=item.key; setImg(img,item.url,()=>tile.remove()); if (allow && !isLocalUrl(item.url)) img.addEventListener('click',()=>window.open(normalizeUrl(item.url),'_blank','noopener')); tile.appendChild(img); scope.photoGrid.appendChild(tile); }); scope.photoWall.style.display=''; }
  function buildQrImageUrl(url, size){ const s = Number(size) || 220; return 'https://api.qrserver.com/v1/create-qr-code/' + '?size=' + encodeURIComponent(`${s}x${s}`) + '&data=' + encodeURIComponent(String(url)) + '&ecc=H&margin=2'; }
  function renderQr(container,url,size,avatarEl,avatarUrl){ if (!container || !url) return; container.innerHTML=''; const img=document.createElement('img'); img.alt='QR Code'; img.src = buildQrImageUrl(url,size) + '&t=' + Date.now(); img.style.width='100%'; img.style.height='100%'; img.style.display='block'; img.style.objectFit='contain'; container.appendChild(img); if (avatarEl && avatarUrl) setImg(avatarEl, avatarUrl); }
  function renderBottomQr(scope,data){ const qrUrl = normalizeUrl(pick(data,['card_url','share_url','preview_url','website'])); if (!qrUrl) { scope.bottomQrSection.style.display='none'; scope.bottomQrGrid.innerHTML=''; scope.bottomQrAvatar.removeAttribute('src'); return; } scope.bottomQrSection.style.display=''; renderQr(scope.bottomQrGrid, qrUrl, 136, scope.bottomQrAvatar, pick(data,['avatar_url']) || text(data.features?.photo_preview_urls?.avatar)); }

  function renderCard(data, options){
    const opts = Object.assign({}, DEFAULTS, options || {});
    if (!opts.root || !(opts.root instanceof HTMLElement)) throw new Error('renderCard(data, options) 需要提供 options.root HTMLElement');
    const source = normalize(data || {});
    const scope = buildTemplate(opts.root, opts.mode);
    applyTheme(scope, source);
    renderBanner(scope, source);
    renderAvatar(scope, source);
    renderLogo(scope, source);
    renderTexts(scope, source);
    renderBlocks(scope, source);
    renderContactDock(scope, source, opts.allowActions !== false);
    renderMarquee(scope, source);
    renderPrimaryLinkDock(scope, source, opts.allowActions !== false);
    renderMediaDock(scope, source, opts.allowActions !== false);
    renderCtas(scope, source, opts.allowActions !== false);
    renderPhotos(scope, source, opts.allowActions !== false);
    renderBottomQr(scope, source);
    return { ok:true, data:source, scope };
  }

  global.HscCardRenderer = { renderCard, renderQr, version:'HSC-card-renderer-v8.1.0-banner-aligned' };
  global.HSCCardRenderer = global.HscCardRenderer;
  global.renderCard = renderCard;
  global.renderQr = renderQr;
})(window);
