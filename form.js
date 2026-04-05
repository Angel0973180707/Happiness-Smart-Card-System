import { ensureAuth, uploadAvatar, uploadLogo, uploadPhoto, uploadImage } from './firebase.js';

(() => {
  'use strict';

  const CONFIG = {
    GAS_URL: 'https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec',
    SERVICE_URL: 'https://lin.ee/G3VJoRm',
    SHOWCASE_URL: 'https://angel0973180707.github.io/Happiness-Smart-Card-System/',
    BASE_LIMITS: {
      free: { wallPhotos: 2, ctas: 1, price: 1500, label: '自由搭配' },
      premium: { wallPhotos: 5, ctas: 3, price: 2000, label: '精品設計' }
    },
    ADDON_PRICES: {
      addon_marquee: 300,
      addon_photo: 100,
      addon_cta: 100,
      addon_update_unlimited: 300,
      addon_bundle: 500
    },
    UPDATE_FEE_DEFAULT: 300,
    MAX_WALL_PHOTOS: 10,
    MAX_CTAS: 10,
    BANNER_RATIO: 16 / 5,
    DEFAULT_PREVIEW_META: { layout: 'grid', aspect_ratio: '1:1', fit_mode: 'cover' }
  };

  const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };
  const RENEW_CARD_FIELDS = ['name','unit','title','slogan','services','experience','wechat_id','line_url','line_oa','email','phone','address','website'];

  const state = {
    mode: 'create',
    token: '',
    cardId: '',
    tempCardId: 'TEMP_' + Date.now(),
    cardData: null,
    updateEligibility: null,
    renewalSummary: null,
    quote: null,
    photoMeta: {},
    photoPreviewUrls: {},
    photoRealUrls: {},
    photoUploadState: {},
    photoFiles: {},
    crop: null,
    draftValues: {}
  };

  const els = {};
  const photoSlots = [];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    collectEls();
    initMode();
    bindStaticEvents();
    buildPhotoSlots();
    restoreDraft();
    hydrateQueryParams();
    ensureDefaultPlan();
    syncModeUi();
    await loadModeData();
    refreshAll();
  }

  function collectEls() {
    [
      'smart-card-form','form-status-strip','btn-open-showcase','btn-save-draft','btn-clear-draft','btn-contact-service','btn-submit-form',
      'invite_code','ref','token','card_id','mode','page-title','page-desc','mode-ribbon','mode-headline','mode-copy','mode-badges',
      'section-plan-addons','section-style','section-basic-fields','section-links','section-photos','section-cta','section-update-eligibility','section-renew','section-renew-card-copy','section-preview',
      'display_name','unit','title','phone','email','website','line_url','line_oa','wechat_id','experience','services','address','intro',
      'video1','video2','video3','social1','social2','social3','marquee-section','marquee_text',
      'addon_marquee_enabled','addon_photo_enabled','addon_photo_qty','addon_cta_enabled','addon_cta_qty','addon_update_unlimited_enabled','addon_bundle_enabled',
      'free-theme-group','premium-theme-group','free_color','free_style','free_paper','premium_color',
      'summary-plan-pill','summary-photo-pill','summary-cta-pill','quote-state-text','quote-plan-amount','quote-addon-amount','quote-addon-breakdown','quote-total-amount',
      'photo-slots','cta-slots','livePreviewCard','eligibility-box','renew_target_plan','renew_keep_marquee','renew_update_unlimited','renew_photo_extra_qty','renew_cta_extra_qty','renew-summary-box','renew-addon-box','renew-card-data','renew-addon-data','renew-rule-text','renew-preview-summary',
      'submitProgressWrap','submitProgressTitle','submitProgressPercent','submitProgressFill','submitProgressText','successBox','successId','successCopyText','successDesc','btnCopyReply','btnLineOA',
      'submit-progress-overlay','progress-text','progress-fill','progress-contact-service',
      'cropModal','cropTitle','cropHint','cropViewport','cropImage','cropZoom','btnZoomOut','btnZoomIn','btnCenter','btnResetCrop','btnCancelCrop','btnApplyCrop'
    ].forEach(id => els[id] = document.getElementById(id));

    els.planRadios = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.addonCheckboxes = Array.from(document.querySelectorAll('input[name="addons"]'));
    els.photoTemplate = document.getElementById('photo-slot-template');
    els.ctaTemplate = document.getElementById('cta-slot-template');
  }

  function initMode() {
    const params = new URLSearchParams(location.search);
    const mode = String(params.get('mode') || 'create').trim().toLowerCase();
    state.mode = ['create','update','renew'].includes(mode) ? mode : 'create';
    state.token = String(params.get('token') || '').trim();
    state.cardId = String(params.get('card_id') || '').trim();
    els.mode.value = state.mode;
    els.token.value = state.token;
    els.card_id.value = state.cardId;
  }

  function hydrateQueryParams() {
    const params = new URLSearchParams(location.search);
    if (params.get('invite') || params.get('invite_code')) els.invite_code.value = params.get('invite') || params.get('invite_code') || '';
    if (params.get('ref')) els.ref.value = params.get('ref') || '';
    const planParam = params.get('plan');
    if (planParam === 'free' || planParam === 'premium') {
      const r = document.querySelector(`input[name="plan"][value="${planParam}"]`);
      if (r) r.checked = true;
    }
  }

  function syncModeUi() {
    const maps = {
      create: {
        title: '智慧名片申請表', desc: 'v8.1.0｜建卡模式：填完送出後，系統自動產生名片、連結與付款資訊。', ribbon: 'mode=create', head: '建卡模式', copy: '填完整名片資料後送出，系統將建立名片與付款資訊。'
      },
      update: {
        title: '智慧名片資料更新', desc: 'v8.1.0｜更新模式：會先讀取原卡資料與更新權益，再依規則判斷是否需收費。', ribbon: 'mode=update', head: '更新模式', copy: '會識別：無限次更新 / 年度 3 次免費更新 / 單次收費更新（一次 300）。'
      },
      renew: {
        title: '智慧名片續約表單', desc: 'v8.1.0｜續約模式：顯示原卡資料、原加購摘要與續約報價。', ribbon: 'mode=renew', head: '續約模式', copy: '續約會延續上年度照片與 CTA 數量；若要減少，不退款。'
      }
    };
    const conf = maps[state.mode];
    els['page-title'].textContent = conf.title;
    els['page-desc'].textContent = conf.desc;
    els['mode-ribbon'].textContent = conf.ribbon;
    els['mode-headline'].textContent = conf.head;
    els['mode-copy'].textContent = conf.copy;

    toggle(els['section-update-eligibility'], state.mode === 'update');
    toggle(els['section-renew'], state.mode === 'renew');
    toggle(els['section-renew-card-copy'], state.mode === 'renew');
    toggle(els['section-style'], state.mode !== 'renew');
    toggle(els['section-basic-fields'], state.mode !== 'renew');
    toggle(els['section-links'], state.mode !== 'renew');
    toggle(els['section-photos'], state.mode !== 'renew');
    toggle(els['section-cta'], state.mode !== 'renew');
    toggle(els['section-plan-addons'], true);
    els['btn-submit-form'].textContent = state.mode === 'create' ? '送出申請' : state.mode === 'update' ? '送出更新' : '送出續約';
    renderModeBadges();
  }

  function renderModeBadges() {
    const host = els['mode-badges'];
    host.innerHTML = '';
    if (state.mode === 'update' && state.token) host.appendChild(makePill('更新 Token 已載入'));
    if (state.mode === 'renew' && state.cardId) host.appendChild(makePill(`卡號 ${state.cardId}`));
    if (state.mode === 'create' && els.invite_code.value) host.appendChild(makePill(`邀請碼 ${els.invite_code.value}`));
  }

  function makePill(text, kind='') {
    const span = document.createElement('span');
    span.className = 'pill' + (kind ? ` ${kind}` : '');
    span.textContent = text;
    return span;
  }

  function bindStaticEvents() {
    els['smart-card-form'].addEventListener('submit', onSubmit);
    els['btn-open-showcase'].addEventListener('click', () => window.open(CONFIG.SHOWCASE_URL, '_blank', 'noopener'));
    els['btn-contact-service'].addEventListener('click', () => openService());
    els['progress-contact-service'].addEventListener('click', () => openService());
    els['btnLineOA'].addEventListener('click', () => openService());
    els['btn-save-draft'].addEventListener('click', () => { saveDraft(); setStatus('草稿已暫存。','success'); });
    els['btn-clear-draft'].addEventListener('click', clearDraft);
    els['btnCopyReply'].addEventListener('click', () => copyText(els['successCopyText'].value || ''));

    els.planRadios.forEach(r => r.addEventListener('change', refreshAll));
    els.addonCheckboxes.forEach(c => c.addEventListener('change', refreshAll));
    ['addon_photo_qty','addon_cta_qty','free_color','free_style','free_paper','premium_color','display_name','unit','title','phone','email','website','line_url','line_oa','wechat_id','experience','services','address','intro','marquee_text','video1','video2','video3','social1','social2','social3','renew_target_plan','renew_photo_extra_qty','renew_cta_extra_qty'].forEach(id => {
      const el = document.getElementById(id); if (el) { el.addEventListener('input', onLiveChange); el.addEventListener('change', onLiveChange); }
    });
    ['renew_keep_marquee','renew_update_unlimited'].forEach(id => document.getElementById(id)?.addEventListener('change', onLiveChange));

    bindCropEvents();
  }

  function bindCropEvents() {
    els.btnZoomOut.addEventListener('click', () => adjustCropZoom(-0.1));
    els.btnZoomIn.addEventListener('click', () => adjustCropZoom(0.1));
    els.cropZoom.addEventListener('input', () => { if (state.crop) { state.crop.scale = clamp(+els.cropZoom.value, 1, 3, 1); syncCropTransform(); } });
    els.btnCenter.addEventListener('click', () => { if (state.crop) { state.crop.x = 0; state.crop.y = 0; syncCropTransform(); } });
    els.btnResetCrop.addEventListener('click', () => resetCropState());
    els.btnCancelCrop.addEventListener('click', closeCropper);
    els.btnApplyCrop.addEventListener('click', applyCropAndUpload);

    let dragging = false, sx=0, sy=0, ox=0, oy=0;
    const start = (clientX, clientY) => { if (!state.crop) return; dragging = true; sx = clientX; sy = clientY; ox = state.crop.x; oy = state.crop.y; };
    const move = (clientX, clientY) => {
      if (!dragging || !state.crop) return;
      state.crop.x = ox + (clientX - sx);
      state.crop.y = oy + (clientY - sy);
      syncCropTransform();
    };
    const end = () => { dragging = false; };
    els.cropViewport.addEventListener('mousedown', e => { e.preventDefault(); start(e.clientX, e.clientY); });
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', end);
    els.cropViewport.addEventListener('touchstart', e => { const t=e.touches[0]; start(t.clientX, t.clientY); }, { passive:true });
    window.addEventListener('touchmove', e => { const t=e.touches[0]; if (t) move(t.clientX, t.clientY); }, { passive:true });
    window.addEventListener('touchend', end, { passive:true });
  }

  function onLiveChange() { refreshAll(); saveDraftSilently(); }

  function toggle(el, show) { if (!el) return; el.classList.toggle('hidden', !show); }
  function setStatus(msg='', stateName='') {
    const el = els['form-status-strip'];
    el.textContent = msg || '';
    el.classList.toggle('visible', !!msg);
    if (stateName) el.dataset.state = stateName; else delete el.dataset.state;
  }
  function valueOf(id) { return (document.getElementById(id)?.value ?? '').toString().trim(); }
  function checked(id) { return !!document.getElementById(id)?.checked; }
  function money(v) { return `NT$ ${Number(v || 0).toLocaleString('zh-TW')}`; }
  function clamp(v, min, max, fb) { const n = Number(v); if (!Number.isFinite(n)) return fb; return Math.max(min, Math.min(max, n)); }

  async function loadModeData() {
    if (state.mode === 'update') {
      if (!state.token) { setStatus('缺少 token，無法載入更新資料。','error'); return; }
      await loadUpdateData();
    }
    if (state.mode === 'renew') {
      if (!state.cardId) { setStatus('缺少 card_id，無法載入續約資料。','error'); return; }
      await loadRenewData();
    }
  }

  async function loadUpdateData() {
    try {
      setStatus('正在載入原卡資料與更新權益…','warn');
      const cardResp = await callGas('getCardForUpdate', { token: state.token });
      const card = pickRecord(cardResp);
      state.cardData = normalizeIncoming(card || {});
      if (state.cardData.card_id) { state.cardId = state.cardData.card_id; els.card_id.value = state.cardId; }
      hydrateCardIntoFields(state.cardData);

      const eligResp = await callGas('getUpdateEligibility', { token: state.token, card_id: state.cardId || state.cardData.card_id || '' });
      state.updateEligibility = normalizeEligibility(pickRecord(eligResp) || eligResp || {});
      renderEligibility();
      setStatus('更新資料已載入。','success');
    } catch (err) {
      console.error(err);
      setStatus(`載入更新資料失敗：${err.message}`,'error');
    }
  }

  async function loadRenewData() {
    try {
      setStatus('正在載入續約資料與報價…','warn');
      const cardResp = await callGas('getCardForRenewal', { card_id: state.cardId });
      const card = pickRecord(cardResp);
      state.cardData = normalizeIncoming(card || {});
      hydrateRenewView(state.cardData);
      hydrateCardIntoFields(state.cardData, true);

      const renewResp = await callGas('getRenewalSummary', { card_id: state.cardId });
      state.renewalSummary = normalizeRenewalSummary(pickRecord(renewResp) || renewResp || {});
      hydrateRenewSummary();
      setStatus('續約資料已載入。','success');
    } catch (err) {
      console.error(err);
      setStatus(`載入續約資料失敗：${err.message}`,'error');
    }
  }

  function normalizeIncoming(src) {
    const out = { ...(src || {}) };
    out.name = out.name || out.display_name || '';
    out.slogan = out.slogan || out.intro || '';
    out.plan = out.plan || 'free';
    out.color = out.color || (out.plan === 'premium' ? 'p1' : 'c1');
    out.style = out.style || 's1';
    out.paper = out.paper || 'f1';
    out.photo_limit = Number(out.photo_limit || out.keep_photo_extra_qty || 0) || 0;
    out.cta_limit = Number(out.cta_limit || out.keep_cta_extra_qty || 0) || 0;
    return out;
  }

  function normalizeEligibility(src) {
    const e = { ...(src || {}) };
    e.is_unlimited = toBool(e.is_unlimited);
    e.free_limit = Number(e.free_limit || 3) || 3;
    e.used_count = Number(e.used_count || 0) || 0;
    e.remaining_count = Number.isFinite(Number(e.remaining_count)) ? Number(e.remaining_count) : Math.max(0, e.free_limit - e.used_count);
    e.charge_amount = Number(e.charge_amount || CONFIG.UPDATE_FEE_DEFAULT) || CONFIG.UPDATE_FEE_DEFAULT;
    e.charge_required = e.is_unlimited ? false : toBool(e.charge_required) || e.remaining_count <= 0;
    if (e.is_unlimited) e.mode_text = '無限次更新';
    else if (e.remaining_count > 0) e.mode_text = `年度免費更新（剩餘 ${e.remaining_count} 次）`;
    else e.mode_text = '單次收費更新';
    return e;
  }

  function normalizeRenewalSummary(src) {
    const r = { ...(src || {}) };
    r.current_plan = r.current_plan || state.cardData?.plan || 'free';
    r.target_plan = r.target_plan || r.current_plan;
    r.current_expires_at = r.current_expires_at || '';
    r.keep_marquee = toBool(r.keep_marquee);
    r.keep_photo_extra_qty = Number(r.keep_photo_extra_qty || 0) || 0;
    r.keep_cta_extra_qty = Number(r.keep_cta_extra_qty || 0) || 0;
    r.update_unlimited_renew = toBool(r.update_unlimited_renew);
    r.renewal_price = Number(r.renewal_price || CONFIG.BASE_LIMITS[r.target_plan]?.price || 0) || 0;
    r.upgrade_diff = Number(r.upgrade_diff || 0) || 0;
    r.addon_amount = Number(r.addon_amount || 0) || 0;
    r.total_amount = Number(r.total_amount || (r.renewal_price + r.upgrade_diff + r.addon_amount)) || 0;
    return r;
  }

  function toBool(v) { return [true,'true','1',1,'yes','y'].includes(v); }
  function pickRecord(resp) { return resp?.data || resp?.card || resp?.item || resp?.record || resp; }

  function hydrateCardIntoFields(card, readonlyOnly=false) {
    if (!card) return;
    const map = {
      display_name: card.name || '', unit: card.unit || '', title: card.title || '', phone: card.phone || '', email: card.email || '', website: card.website || '',
      line_url: card.line_url || '', line_oa: card.line_oa || '', wechat_id: card.wechat_id || '', experience: card.experience || '', services: card.services || '', address: card.address || '', intro: card.slogan || card.intro || '',
      video1: card.video1 || '', video2: card.video2 || '', video3: card.video3 || '', social1: card.social1 || '', social2: card.social2 || '', social3: card.social3 || '', marquee_text: card.marquee_text || ''
    };
    Object.entries(map).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; if (readonlyOnly && el) el.classList.add('readonly-field'); });
    const plan = card.plan || 'free';
    const radio = document.querySelector(`input[name="plan"][value="${plan}"]`); if (radio) radio.checked = true;
    els.free_color.value = card.color && card.color.startsWith('c') ? card.color : 'c1';
    els.free_style.value = card.style || 's1';
    els.free_paper.value = card.paper || 'f1';
    els.premium_color.value = card.color && card.color.startsWith('p') ? card.color : 'p1';
    if (card.marquee_enabled || card.marquee_text) els.addon_marquee_enabled.checked = true;
    if (Number(card.photo_extra_purchased || 0) > 0) { els.addon_photo_enabled.checked = true; els.addon_photo_qty.value = Number(card.photo_extra_purchased || 0); }
    if (Number(card.cta_extra_purchased || 0) > 0) { els.addon_cta_enabled.checked = true; els.addon_cta_qty.value = Number(card.cta_extra_purchased || 0); }
    if (toBool(card.update_unlimited) || toBool(card.update_unlimited_renew) || toBool(card.update_unlimited_purchased)) els.addon_update_unlimited_enabled.checked = true;

    if (card.avatar_url) setLoadedPhoto('avatar', card.avatar_url);
    if (card.logo_url) setLoadedPhoto('logo', card.logo_url);
    if (card.banner_url) setLoadedPhoto('banner', card.banner_url);
    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) {
      const url = card[`photo${i}_url`] || card[`photo_url_${i}`] || '';
      if (url) setLoadedPhoto(`photo${i}`, url);
    }
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const label = card[`cta_text_${i}`] || ''; const link = card[`cta_link_${i}`] || '';
      const labelEl = document.getElementById(`cta_text_${i}`), linkEl = document.getElementById(`cta_link_${i}`);
      if (labelEl) labelEl.value = label;
      if (linkEl) linkEl.value = link;
    }
  }

  function hydrateRenewView(card) {
    const host = els['renew-card-data'];
    host.innerHTML = '';
    RENEW_CARD_FIELDS.forEach(key => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      row.innerHTML = `<span>${labelOfCardField(key)}</span><strong>${escapeHtml(card[key] || '') || '-'}</strong>`;
      host.appendChild(row);
    });
    const addonHost = els['renew-addon-data'];
    addonHost.innerHTML = '';
    const rows = [
      ['原方案', card.plan || '-'],
      ['原照片數', String(getCurrentPhotoLimit(card))],
      ['原 CTA 數', String(getCurrentCtaLimit(card))],
      ['原跑馬燈', card.marquee_text ? '有' : '無'],
      ['原無限更新', toBool(card.update_unlimited_renew || card.update_unlimited || card.update_unlimited_purchased) ? '有' : '無']
    ];
    rows.forEach(([k,v]) => {
      const box = document.createElement('div');
      box.className = 'summary-box';
      box.innerHTML = `<div class="summary-row"><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`;
      addonHost.appendChild(box);
    });
    els['renew_target_plan'].value = card.plan || 'free';
    els['renew_keep_marquee'].checked = !!card.marquee_text;
    els['renew_update_unlimited'].checked = !!(card.update_unlimited || card.update_unlimited_renew || card.update_unlimited_purchased);
    els['renew-rule-text'].textContent = '無限次更新屬年度權益，新年度需重新加購後才生效。\n照片與 CTA 數量預設延續上年度數量；若本次選擇減少，不退款。';
  }

  function hydrateRenewSummary() {
    const s = state.renewalSummary || {};
    renderSummaryBox(els['renew-summary-box'], [
      ['目前方案', s.current_plan || '-'], ['續約方案', s.target_plan || els['renew_target_plan'].value], ['目前到期日', s.current_expires_at || '-'], ['基本續約', money(s.renewal_price || 0)], ['升級差價', money(s.upgrade_diff || 0)], ['加購金額', money(s.addon_amount || 0)], ['總金額', money(s.total_amount || 0)]
    ]);
    renderSummaryBox(els['renew-addon-box'], [
      ['保留跑馬燈', s.keep_marquee ? '是' : '否'], ['延續照片數', String(getCurrentPhotoLimit(state.cardData))], ['延續 CTA 數', String(getCurrentCtaLimit(state.cardData))], ['無限更新需重購', '是']
    ]);
  }

  function renderSummaryBox(el, rows) {
    el.innerHTML = '';
    rows.forEach(([k,v]) => {
      const row = document.createElement('div'); row.className = 'summary-row'; row.innerHTML = `<span>${k}</span><strong>${escapeHtml(v)}</strong>`; el.appendChild(row);
    });
  }

  function renderEligibility() {
    const e = state.updateEligibility; if (!e) return;
    const kind = e.is_unlimited ? 'ok' : e.charge_required ? 'warn' : 'ok';
    els['eligibility-box'].innerHTML = [
      pillHtml(e.mode_text, kind),
      rowHtml('免費次數上限', String(e.free_limit)),
      rowHtml('已使用次數', String(e.used_count)),
      rowHtml('剩餘次數', String(e.remaining_count)),
      rowHtml('無限更新', e.is_unlimited ? '是' : '否'),
      rowHtml('本次是否需收費', e.charge_required ? '是' : '否'),
      rowHtml('本次更新金額', money(e.charge_required ? e.charge_amount : 0))
    ].join('');
  }
  function rowHtml(k,v) { return `<div class="summary-row"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`; }
  function pillHtml(t, kind='') { return `<div style="margin-bottom:8px;">${makePill(t, kind).outerHTML}</div>`; }

  function buildPhotoSlots() {
    const root = els['photo-slots'];
    root.innerHTML = '';
    photoSlots.length = 0;
    const sections = [
      { title: '主圖區', copy: '個人照、Logo、Banner', items: [
        { key: 'avatar', title: '個人照', shape: 'square' },
        { key: 'logo', title: 'Logo', shape: 'square' },
        { key: 'banner', title: 'Banner', shape: 'banner' }
      ]},
      { title: '照片牆', copy: '照片牆數量會依方案 / 加購動態顯示', items: [] }
    ];
    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) sections[1].items.push({ key: `photo${i}`, title: `照片 ${i}`, shape: 'square', wall:true });

    sections.forEach(section => {
      const wrap = document.createElement('div'); wrap.className = 'photo-section';
      wrap.innerHTML = `<div class="photo-section-head"><div><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.copy)}</p></div></div>`;
      const grid = document.createElement('div'); grid.className = 'photo-grid-form';
      section.items.forEach(cfg => {
        const node = els.photoTemplate.content.firstElementChild.cloneNode(true);
        node.dataset.photoKey = cfg.key;
        node.querySelector('.photo-title').textContent = cfg.title;
        const frame = node.querySelector('.preview-frame');
        if (cfg.shape === 'banner') frame.classList.add('banner');
        const previewImage = node.querySelector('.preview-image');
        const previewEmpty = node.querySelector('.preview-empty');
        const fileInput = node.querySelector('.photo-file-input');
        const tools = node.querySelector('.photo-tools');
        const zoomRange = node.querySelector('.zoom-range');
        const badge = node.querySelector('.badge');
        state.photoMeta[cfg.key] = state.photoMeta[cfg.key] || { ...DEFAULT_PHOTO_META };
        const slot = { cfg, node, frame, previewImage, previewEmpty, fileInput, tools, zoomRange, badge };
        photoSlots.push(slot);
        bindPhotoSlot(slot);
        grid.appendChild(node);
      });
      wrap.appendChild(grid);
      root.appendChild(wrap);
    });
    buildCtaSlots();
  }

  function bindPhotoSlot(slot) {
    const { cfg, fileInput, previewImage, previewEmpty, tools, zoomRange, badge } = slot;
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      try { await openCropper(cfg.key, file, cfg.shape === 'banner' ? 'banner' : 'square'); } catch (err) { setStatus(`圖片讀取失敗：${err.message}`,'error'); }
      fileInput.value = '';
    });
    slot.node.querySelector('.preview-frame').addEventListener('click', () => fileInput.click());
    slot.node.querySelector('.clear-photo').addEventListener('click', () => clearPhoto(cfg.key));
    slot.node.querySelector('.rotate-left').addEventListener('click', () => transformPhoto(cfg.key, { rotate: state.photoMeta[cfg.key].rotate - 90 }));
    slot.node.querySelector('.rotate-right').addEventListener('click', () => transformPhoto(cfg.key, { rotate: state.photoMeta[cfg.key].rotate + 90 }));
    slot.node.querySelector('.move-left').addEventListener('click', () => transformPhoto(cfg.key, { x: +(state.photoMeta[cfg.key].x - 0.05).toFixed(2) }));
    slot.node.querySelector('.move-right').addEventListener('click', () => transformPhoto(cfg.key, { x: +(state.photoMeta[cfg.key].x + 0.05).toFixed(2) }));
    slot.node.querySelector('.move-up').addEventListener('click', () => transformPhoto(cfg.key, { y: +(state.photoMeta[cfg.key].y - 0.05).toFixed(2) }));
    slot.node.querySelector('.move-down').addEventListener('click', () => transformPhoto(cfg.key, { y: +(state.photoMeta[cfg.key].y + 0.05).toFixed(2) }));
    slot.node.querySelector('.reset-photo').addEventListener('click', () => { state.photoMeta[cfg.key] = { ...DEFAULT_PHOTO_META }; applyPhotoTransform(previewImage, state.photoMeta[cfg.key]); updatePreview(); saveDraftSilently(); zoomRange.value = '1'; });
    zoomRange.addEventListener('input', () => { state.photoMeta[cfg.key].scale = clamp(zoomRange.value, 0.5, 3, 1); applyPhotoTransform(previewImage, state.photoMeta[cfg.key]); updatePreview(); saveDraftSilently(); });
    tools.classList.add('hidden'); previewImage.classList.add('hidden'); previewEmpty.classList.remove('hidden'); badge.textContent = '尚未上傳'; badge.dataset.uploadState = 'idle';
  }

  function buildCtaSlots() {
    const root = els['cta-slots']; root.innerHTML = '';
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const node = els.ctaTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector('.cta-title-label').textContent = `CTA ${i}`;
      const labelInput = node.querySelector('.cta-label-input');
      const urlInput = node.querySelector('.cta-url-input');
      labelInput.id = `cta_text_${i}`; urlInput.id = `cta_link_${i}`;
      labelInput.addEventListener('input', onLiveChange); urlInput.addEventListener('input', onLiveChange);
      root.appendChild(node);
    }
  }

  function clearPhoto(key) {
    delete state.photoPreviewUrls[key]; delete state.photoRealUrls[key]; delete state.photoFiles[key]; state.photoUploadState[key] = 'idle';
    const slot = photoSlots.find(s => s.cfg.key === key); if (!slot) return;
    slot.previewImage.removeAttribute('src'); slot.previewImage.classList.add('hidden'); slot.previewEmpty.classList.remove('hidden'); slot.tools.classList.add('hidden'); slot.badge.textContent = '尚未上傳'; slot.badge.dataset.uploadState = 'idle';
    updatePreview(); saveDraftSilently();
  }

  function setLoadedPhoto(key, url) {
    state.photoPreviewUrls[key] = url; state.photoRealUrls[key] = url; state.photoUploadState[key] = 'done';
    const slot = photoSlots.find(s => s.cfg.key === key); if (!slot) return;
    slot.previewImage.src = url; slot.previewImage.classList.remove('hidden'); slot.previewEmpty.classList.add('hidden'); slot.tools.classList.remove('hidden'); slot.badge.textContent = '已載入'; slot.badge.dataset.uploadState = 'done'; applyPhotoTransform(slot.previewImage, state.photoMeta[key] || DEFAULT_PHOTO_META);
  }

  function transformPhoto(key, next) {
    state.photoMeta[key] = { ...state.photoMeta[key], ...next };
    state.photoMeta[key].x = clamp(state.photoMeta[key].x, 0, 1, 0.5);
    state.photoMeta[key].y = clamp(state.photoMeta[key].y, 0, 1, 0.5);
    state.photoMeta[key].scale = clamp(state.photoMeta[key].scale, 0.5, 3, 1);
    state.photoMeta[key].rotate = clamp(state.photoMeta[key].rotate, -180, 180, 0);
    const slot = photoSlots.find(s => s.cfg.key === key); if (slot) applyPhotoTransform(slot.previewImage, state.photoMeta[key]);
    updatePreview(); saveDraftSilently();
  }

  function applyPhotoTransform(img, meta) {
    if (!img) return;
    img.style.objectPosition = `${(meta.x * 100).toFixed(2)}% ${(meta.y * 100).toFixed(2)}%`;
    img.style.transform = `scale(${meta.scale}) rotate(${meta.rotate}deg)`;
  }

  function getLimits(plan = getPlan()) {
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.free;
    const photoExtra = checked('addon_photo_enabled') ? Number(els['addon_photo_qty'].value || 0) : 0;
    const ctaExtra = checked('addon_cta_enabled') ? Number(els['addon_cta_qty'].value || 0) : 0;
    return { wallPhotos: Math.min(CONFIG.MAX_WALL_PHOTOS, base.wallPhotos + photoExtra), ctas: Math.min(CONFIG.MAX_CTAS, base.ctas + ctaExtra), price: base.price, label: base.label };
  }
  function getPlan() { return document.querySelector('input[name="plan"]:checked')?.value || 'free'; }
  function getThemeSelection() {
    const plan = getPlan();
    return plan === 'premium' ? { plan, color: els['premium_color'].value || 'p1', style: 's1', paper: 'f1' } : { plan, color: els['free_color'].value || 'c1', style: els['free_style'].value || 's1', paper: els['free_paper'].value || 'f1' };
  }

  function refreshAll() {
    refreshModeVisibility();
    refreshSummary();
    refreshDynamicSlots();
    updatePreview();
    if (state.mode === 'renew') updateRenewSummaryLive();
  }

  function refreshModeVisibility() {
    const plan = getPlan();
    toggle(els['free-theme-group'], plan === 'free');
    toggle(els['premium-theme-group'], plan === 'premium');
    const showMarquee = checked('addon_marquee_enabled') || checked('addon_bundle_enabled') || state.mode === 'renew' && checked('renew_keep_marquee');
    toggle(els['marquee-section'], showMarquee && state.mode !== 'renew');
    photoSlots.forEach(slot => {
      if (!slot.cfg.wall) return;
      const idx = Number(slot.cfg.key.replace('photo',''));
      toggle(slot.node, idx <= getLimits().wallPhotos && state.mode !== 'renew');
    });
    const bannerSlot = photoSlots.find(s => s.cfg.key === 'banner'); if (bannerSlot) toggle(bannerSlot.node, state.mode !== 'renew');
  }

  function refreshDynamicSlots() {
    const limits = getLimits();
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) toggle(document.getElementById(`cta_text_${i}`)?.closest('.cta-slot-card'), i <= limits.ctas && state.mode !== 'renew');
  }

  function refreshSummary() {
    const limits = state.mode === 'renew' ? getRenewComputedLimits() : getLimits();
    const plan = state.mode === 'renew' ? (els['renew_target_plan'].value || state.cardData?.plan || 'free') : getPlan();
    els['summary-plan-pill'].textContent = `方案：${CONFIG.BASE_LIMITS[plan].label}`;
    els['summary-photo-pill'].textContent = `照片牆：${limits.wallPhotos}`;
    els['summary-cta-pill'].textContent = `CTA：${limits.ctas}`;

    let planAmount = 0, addonAmount = 0, breakdown = [];
    if (state.mode === 'create') {
      planAmount = CONFIG.BASE_LIMITS[plan].price;
      addonAmount = calcCreateAddonAmount(breakdown);
      els['quote-state-text'].textContent = '建卡報價';
    } else if (state.mode === 'update') {
      const e = state.updateEligibility || normalizeEligibility({});
      planAmount = 0;
      addonAmount = e.charge_required ? e.charge_amount : 0;
      breakdown.push(e.mode_text);
      els['quote-state-text'].textContent = e.charge_required ? '本次更新需付費' : '本次更新免費';
    } else {
      const rs = computeRenewPricing();
      planAmount = rs.planAmount;
      addonAmount = rs.addonAmount + rs.upgradeDiff;
      breakdown = rs.breakdown;
      els['quote-state-text'].textContent = '續約報價';
    }
    els['quote-plan-amount'].textContent = money(planAmount);
    els['quote-addon-amount'].textContent = money(addonAmount);
    els['quote-total-amount'].textContent = money(planAmount + addonAmount);
    els['quote-addon-breakdown'].innerHTML = breakdown.length ? breakdown.map(t => `<div class="quote-breakdown-row"><span>${escapeHtml(t)}</span></div>`).join('') : '<div class="quote-breakdown-row"><span>目前沒有額外加購</span></div>';
  }

  function calcCreateAddonAmount(breakdown) {
    let addonAmount = 0;
    if (checked('addon_bundle_enabled')) { addonAmount += CONFIG.ADDON_PRICES.addon_bundle; breakdown.push(`跑馬燈 + 無限更新組合 ${money(CONFIG.ADDON_PRICES.addon_bundle)}`); }
    else {
      if (checked('addon_marquee_enabled')) { addonAmount += CONFIG.ADDON_PRICES.addon_marquee; breakdown.push(`跑馬燈 ${money(CONFIG.ADDON_PRICES.addon_marquee)}`); }
      if (checked('addon_update_unlimited_enabled')) { addonAmount += CONFIG.ADDON_PRICES.addon_update_unlimited; breakdown.push(`無限更新 ${money(CONFIG.ADDON_PRICES.addon_update_unlimited)}`); }
    }
    if (checked('addon_photo_enabled') && Number(els['addon_photo_qty'].value || 0) > 0) { const amt = Number(els['addon_photo_qty'].value || 0) * CONFIG.ADDON_PRICES.addon_photo; addonAmount += amt; breakdown.push(`照片加購 ${money(amt)}`); }
    if (checked('addon_cta_enabled') && Number(els['addon_cta_qty'].value || 0) > 0) { const amt = Number(els['addon_cta_qty'].value || 0) * CONFIG.ADDON_PRICES.addon_cta; addonAmount += amt; breakdown.push(`CTA 加購 ${money(amt)}`); }
    return addonAmount;
  }

  function getCurrentPhotoLimit(card = state.cardData || {}) {
    const base = CONFIG.BASE_LIMITS[card.plan || 'free']?.wallPhotos || 2;
    return base + (Number(card.photo_extra_purchased || 0) || 0);
  }
  function getCurrentCtaLimit(card = state.cardData || {}) {
    const base = CONFIG.BASE_LIMITS[card.plan || 'free']?.ctas || 1;
    return base + (Number(card.cta_extra_purchased || 0) || 0);
  }
  function getRenewComputedLimits() {
    return { wallPhotos: getCurrentPhotoLimit(state.cardData) + Number(els['renew_photo_extra_qty'].value || 0), ctas: getCurrentCtaLimit(state.cardData) + Number(els['renew_cta_extra_qty'].value || 0) };
  }

  function computeRenewPricing() {
    const currentPlan = state.cardData?.plan || 'free';
    const targetPlan = els['renew_target_plan'].value || currentPlan;
    const planAmount = CONFIG.BASE_LIMITS[targetPlan].price;
    const photoExtraQty = Number(els['renew_photo_extra_qty'].value || 0) || 0;
    const ctaExtraQty = Number(els['renew_cta_extra_qty'].value || 0) || 0;
    const keepUnlimited = checked('renew_update_unlimited');
    const keepMarquee = checked('renew_keep_marquee');
    let addonAmount = 0, upgradeDiff = 0; const breakdown = [];
    if (currentPlan === 'free' && targetPlan === 'premium') { upgradeDiff = CONFIG.BASE_LIMITS.premium.price - CONFIG.BASE_LIMITS.free.price; breakdown.push(`升級差價 ${money(upgradeDiff)}`); }
    if (photoExtraQty > 0) { const amt = photoExtraQty * CONFIG.ADDON_PRICES.addon_photo; addonAmount += amt; breakdown.push(`照片增加 ${money(amt)}`); }
    if (ctaExtraQty > 0) { const amt = ctaExtraQty * CONFIG.ADDON_PRICES.addon_cta; addonAmount += amt; breakdown.push(`CTA 增加 ${money(amt)}`); }
    if (keepMarquee) { addonAmount += CONFIG.ADDON_PRICES.addon_marquee; breakdown.push(`跑馬燈續保 ${money(CONFIG.ADDON_PRICES.addon_marquee)}`); }
    if (keepUnlimited) { addonAmount += CONFIG.ADDON_PRICES.addon_update_unlimited; breakdown.push(`新年度無限更新 ${money(CONFIG.ADDON_PRICES.addon_update_unlimited)}`); }
    return { planAmount, addonAmount, upgradeDiff, total: planAmount + addonAmount + upgradeDiff, breakdown };
  }

  function updateRenewSummaryLive() {
    const p = computeRenewPricing();
    renderSummaryBox(els['renew-summary-box'], [
      ['目前方案', state.cardData?.plan || '-'], ['續約方案', els['renew_target_plan'].value], ['基本續約', money(p.planAmount)], ['升級差價', money(p.upgradeDiff)], ['加購金額', money(p.addonAmount)], ['總金額', money(p.total)]
    ]);
    renderSummaryBox(els['renew-addon-box'], [
      ['延續照片數', String(getCurrentPhotoLimit(state.cardData))], ['延續 CTA 數', String(getCurrentCtaLimit(state.cardData))], ['照片新增', String(Number(els['renew_photo_extra_qty'].value || 0))], ['CTA 新增', String(Number(els['renew_cta_extra_qty'].value || 0))]
    ]);
    els['renew-preview-summary'].classList.remove('hidden');
    els['renew-preview-summary'].textContent = `續約方案：${CONFIG.BASE_LIMITS[els['renew_target_plan'].value].label}｜照片延續 ${getCurrentPhotoLimit(state.cardData)} 張，可再增加 ${Number(els['renew_photo_extra_qty'].value || 0)} 張｜CTA 延續 ${getCurrentCtaLimit(state.cardData)} 個，可再增加 ${Number(els['renew_cta_extra_qty'].value || 0)} 個。`;
  }

  function buildPreviewData() {
    if (state.mode === 'renew') {
      const base = state.cardData || {};
      return {
        ...base,
        name: base.name || '續約名片',
        slogan: base.slogan || base.intro || '',
        plan: els['renew_target_plan'].value || base.plan || 'free',
        marquee_text: checked('renew_keep_marquee') ? (base.marquee_text || '') : '',
        cta_limit: getRenewComputedLimits().ctas,
        photo_limit: getRenewComputedLimits().wallPhotos,
        card_url: base.card_url || '',
        features_json: { photo_meta: state.photoMeta, preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: els['renew_target_plan'].value || base.plan || 'free' }, photo_preview_urls: { ...state.photoPreviewUrls } }
      };
    }
    const theme = getThemeSelection();
    const limits = getLimits(theme.plan);
    return {
      name: valueOf('display_name'), unit: valueOf('unit'), title: valueOf('title'), slogan: valueOf('intro'), phone: valueOf('phone'), email: valueOf('email'), website: valueOf('website'), address: valueOf('address'), line_url: valueOf('line_url'), line_oa: valueOf('line_oa'), wechat_id: valueOf('wechat_id'), experience: valueOf('experience'), services: valueOf('services'),
      video1: valueOf('video1'), video2: valueOf('video2'), video3: valueOf('video3'), social1: valueOf('social1'), social2: valueOf('social2'), social3: valueOf('social3'),
      plan: theme.plan, color: theme.color, style: theme.style, paper: theme.paper,
      marquee_text: checked('addon_marquee_enabled') || checked('addon_bundle_enabled') ? valueOf('marquee_text') : '',
      marquee_enabled: checked('addon_marquee_enabled') || checked('addon_bundle_enabled') ? 'true' : '',
      photo_limit: limits.wallPhotos, cta_limit: limits.ctas,
      avatar_url: state.photoRealUrls.avatar || '', logo_url: state.photoRealUrls.logo || '', banner_url: state.photoRealUrls.banner || '',
      card_url: state.cardData?.card_url || '',
      features_json: { photo_meta: state.photoMeta, preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan }, photo_preview_urls: { ...state.photoPreviewUrls } }
    };
  }

  function updatePreview() {
    if (!window.renderCard) return;
    const data = buildPreviewData();
    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) {
      const url = state.photoRealUrls[`photo${i}`] || '';
      if (url) { data[`photo${i}_url`] = url; data[`photo_url_${i}`] = url; }
    }
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const label = document.getElementById(`cta_text_${i}`)?.value || '';
      const link = document.getElementById(`cta_link_${i}`)?.value || '';
      if (label) data[`cta_text_${i}`] = label;
      if (link) data[`cta_link_${i}`] = link;
    }
    try { window.renderCard(data, { root: els['livePreviewCard'], useExistingDom: false, mode: 'form', allowActions: false }); } catch (err) { console.error(err); }
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      if (!validateBeforeSubmit()) return;
      showOverlay(true, '整理資料中…', 10);
      showInlineProgress(10, '整理資料中…');
      await waitAllUploads();
      if (state.mode === 'create') await submitCreate();
      else if (state.mode === 'update') await submitUpdate();
      else await submitRenew();
    } catch (err) {
      console.error(err);
      setStatus(err.message || '送出失敗。','error');
      showOverlay(false); showInlineProgress(0, '送出失敗');
    }
  }

  function validateBeforeSubmit() {
    if (state.mode !== 'renew') {
      if (!valueOf('display_name') || !valueOf('phone')) { setStatus('請先完成必填欄位（姓名、電話）。','error'); return false; }
      if (!getPlan()) { setStatus('請先選擇方案。','error'); return false; }
    }
    if (state.mode === 'update' && !state.token) { setStatus('缺少更新 token。','error'); return false; }
    if (state.mode === 'renew' && !state.cardId) { setStatus('缺少 card_id。','error'); return false; }
    return true;
  }

  async function submitCreate() {
    const payload = buildCreatePayload();
    showOverlay(true, '建立建卡資料中…', 20); showInlineProgress(20, '建立建卡資料中…');
    const leadResp = await callGas('createLead', payload);
    showOverlay(true, '建立名片中…', 55); showInlineProgress(55, '建立名片中…');
    const cardResp = await callGas(payload.action, payload);
    finishSuccess({ mode: 'create', serial: cardResp?.card_id || cardResp?.request_id || leadResp?.request_id || 'CREATE_OK', desc: '建卡資料已建立完成。', raw: cardResp, payload });
  }

  async function submitUpdate() {
    const payload = buildUpdatePayload();
    const e = state.updateEligibility || normalizeEligibility({});
    showOverlay(true, e.charge_required ? '建立更新付款單中…' : '寫入更新資料中…', 35); showInlineProgress(35, e.charge_required ? '建立更新付款單中…' : '寫入更新資料中…');
    const resp = e.charge_required ? await callGas('createUpdateFeePayment', payload) : await callGas('updateCardByToken', payload);
    finishSuccess({ mode: 'update', serial: resp?.payment_id || resp?.request_id || state.cardId || 'UPDATE_OK', desc: e.charge_required ? '更新付款單已建立。' : '名片更新完成。', raw: resp, payload });
  }

  async function submitRenew() {
    const payload = buildRenewPayload();
    showOverlay(true, '建立續約付款資料中…', 45); showInlineProgress(45, '建立續約付款資料中…');
    const resp = await callGas('createRenewalPayment', payload);
    finishSuccess({ mode: 'renew', serial: resp?.payment_id || resp?.request_id || state.cardId || 'RENEW_OK', desc: '續約付款資料已建立。', raw: resp, payload });
  }

  function buildCreatePayload() {
    const theme = getThemeSelection();
    const limits = getLimits(theme.plan);
    const payload = buildCommonCardPayload(theme, limits);
    payload.action = 'createCardWithOfflinePayment';
    payload.invite_code = els.invite_code.value || '';
    payload.referrer = els.ref.value || '';
    return payload;
  }

  function buildUpdatePayload() {
    const theme = getThemeSelection();
    const limits = getLimits(theme.plan);
    const payload = buildCommonCardPayload(theme, limits);
    payload.token = state.token;
    payload.card_id = state.cardId || state.cardData?.card_id || '';
    payload.charge_required = state.updateEligibility?.charge_required ? 'true' : '';
    payload.charge_amount = state.updateEligibility?.charge_amount || 0;
    return payload;
  }

  function buildRenewPayload() {
    const pricing = computeRenewPricing();
    return {
      action: 'createRenewalPayment', tenant: 'angel', card_id: state.cardId,
      current_plan: state.cardData?.plan || 'free', target_plan: els['renew_target_plan'].value,
      current_expires_at: state.renewalSummary?.current_expires_at || '',
      keep_marquee: checked('renew_keep_marquee') ? 'true' : '',
      keep_photo_extra_qty: getCurrentPhotoLimit(state.cardData),
      keep_cta_extra_qty: getCurrentCtaLimit(state.cardData),
      update_unlimited_renew: checked('renew_update_unlimited') ? 'true' : '',
      renewal_price: pricing.planAmount, upgrade_diff: pricing.upgradeDiff, addon_amount: pricing.addonAmount, total_amount: pricing.total,
      photo_extra_qty: Number(els['renew_photo_extra_qty'].value || 0) || 0,
      cta_extra_qty: Number(els['renew_cta_extra_qty'].value || 0) || 0,
      lead_snapshot: JSON.stringify({ card: state.cardData || {}, renewal: state.renewalSummary || {}, pricing })
    };
  }

  function buildCommonCardPayload(theme, limits) {
    const payload = {
      tenant: 'angel', name: valueOf('display_name'), unit: valueOf('unit'), title: valueOf('title'), slogan: valueOf('intro'), phone: String(valueOf('phone')).replace(/\s/g,''), email: valueOf('email'), website: valueOf('website'), address: valueOf('address'), line_url: valueOf('line_url'), line_oa: valueOf('line_oa'), wechat_id: valueOf('wechat_id'), experience: valueOf('experience'), services: valueOf('services'),
      video1: valueOf('video1'), video2: valueOf('video2'), video3: valueOf('video3'), social1: valueOf('social1'), social2: valueOf('social2'), social3: valueOf('social3'),
      plan: theme.plan, color: theme.color, style: theme.style, paper: theme.paper,
      marquee_text: checked('addon_marquee_enabled') || checked('addon_bundle_enabled') ? valueOf('marquee_text') : '', marquee_enabled: checked('addon_marquee_enabled') || checked('addon_bundle_enabled') ? 'true' : '',
      photo_limit: limits.wallPhotos, cta_limit: limits.ctas, photo_extra_purchased: checked('addon_photo_enabled') ? String(Number(els['addon_photo_qty'].value || 0) || 0) : '', cta_extra_purchased: checked('addon_cta_enabled') ? String(Number(els['addon_cta_qty'].value || 0) || 0) : '', update_unlimited_purchased: checked('addon_update_unlimited_enabled') || checked('addon_bundle_enabled') ? '1' : ''
    };
    if (state.photoRealUrls.avatar) payload.avatar_url = state.photoRealUrls.avatar;
    if (state.photoRealUrls.logo) payload.logo_url = state.photoRealUrls.logo;
    if (state.photoRealUrls.banner) payload.banner_url = state.photoRealUrls.banner;
    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoRealUrls[`photo${i}`] || '';
      if (url) { payload[`photo${i}_url`] = url; payload[`photo_url_${i}`] = url; }
    }
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = document.getElementById(`cta_text_${i}`)?.value || '';
      payload[`cta_link_${i}`] = document.getElementById(`cta_link_${i}`)?.value || '';
    }
    payload.features_json = JSON.stringify({ photo_meta: state.photoMeta, preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan }, photo_preview_urls: { ...state.photoPreviewUrls } });
    return payload;
  }

  async function callGas(action, params = {}) {
    const body = new URLSearchParams();
    body.set('action', action);
    Object.entries(params).forEach(([k,v]) => {
      if (v == null) return;
      body.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    const resp = await fetch(CONFIG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: body.toString() });
    if (!resp.ok) throw new Error(`GAS 呼叫失敗（${resp.status}）`);
    const text = await resp.text();
    const data = safeJsonParse(text) || {};
    if (data.ok === false || data.error) throw new Error(data.error || data.message || 'GAS 回傳失敗');
    return data;
  }

  function safeJsonParse(raw) {
    let s = String(raw || '').trim();
    if (!s) return null;
    s = s.replace(/^\)\]\}'\s*\n?/, '').trim();
    try { return JSON.parse(s); } catch (_) {}
    const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
    return null;
  }

  function showOverlay(show, text = '', percent = 0) {
    els['submit-progress-overlay'].classList.toggle('hidden', !show);
    if (text) els['progress-text'].textContent = text;
    if (percent != null) els['progress-fill'].style.width = `${percent}%`;
  }
  function showInlineProgress(percent, text) {
    els['submitProgressWrap'].classList.add('show');
    els['submitProgressPercent'].textContent = `${Math.round(percent)}%`;
    els['submitProgressFill'].style.width = `${percent}%`;
    els['submitProgressText'].textContent = text || '處理中…';
  }

  function finishSuccess({ mode, serial, desc, raw, payload }) {
    showOverlay(true, '完成', 100); showInlineProgress(100, '完成');
    els['successBox'].classList.remove('hidden');
    els['successId'].textContent = serial;
    els['successDesc'].textContent = desc;
    const copy = buildServiceCopy(mode, serial, raw, payload);
    els['successCopyText'].value = copy;
    setStatus(desc,'success');
    setTimeout(() => showOverlay(false), 900);
  }

  function buildServiceCopy(mode, serial, raw, payload) {
    if (mode === 'create') return `您好，我已完成智慧名片建卡申請。\n序號：${serial}\n姓名／品牌：${payload.name || ''}\n方案：${CONFIG.BASE_LIMITS[payload.plan]?.label || payload.plan}\n請協助確認後續付款與開通，謝謝。`;
    if (mode === 'update') return `您好，我已送出智慧名片更新。\n序號：${serial}\n卡號：${payload.card_id || ''}\n本次模式：${state.updateEligibility?.mode_text || ''}\n若需付款，請協助確認付款資訊，謝謝。`;
    return `您好，我已送出智慧名片續約。\n序號：${serial}\n卡號：${payload.card_id || ''}\n續約方案：${CONFIG.BASE_LIMITS[payload.target_plan]?.label || payload.target_plan}\n總金額：${money(payload.total_amount || 0)}\n請協助確認續約後續流程，謝謝。`;
  }

  function openService() { window.open(CONFIG.SERVICE_URL, '_blank', 'noopener'); }

  async function copyText(str) {
    if (!str) return;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(str); setStatus('已複製客服文案。','success'); return; } } catch (_) {}
    const ta = document.createElement('textarea'); ta.value = str; ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setStatus('已複製客服文案。','success');
  }

  function getDraftKey() {
    if (state.mode === 'create') return 'hsc_form_create_draft';
    if (state.mode === 'update') return `hsc_form_update_${state.token || 'unknown'}`;
    return `hsc_form_renew_${state.cardId || 'unknown'}`;
  }

  function collectFormValues() {
    const out = {};
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (!el.id) return;
      if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; return; }
      if (el.type === 'checkbox') out[el.id] = el.checked; else out[el.id] = el.value;
    });
    return out;
  }

  function saveDraft() {
    const draft = { values: collectFormValues(), photoMeta: state.photoMeta, photoPreviewUrls: state.photoPreviewUrls, photoRealUrls: state.photoRealUrls };
    localStorage.setItem(getDraftKey(), JSON.stringify(draft));
  }
  function saveDraftSilently() { try { saveDraft(); } catch (_) {} }
  function restoreDraft() {
    let draft = null; try { draft = JSON.parse(localStorage.getItem(getDraftKey()) || 'null'); } catch (_) {}
    if (!draft || typeof draft !== 'object') return;
    state.photoMeta = draft.photoMeta || {};
    state.photoPreviewUrls = draft.photoPreviewUrls || {};
    state.photoRealUrls = draft.photoRealUrls || {};
    const values = draft.values || {};
    Object.entries(values).forEach(([key,val]) => {
      const el = document.getElementById(key);
      if (el) { if (el.type === 'checkbox') el.checked = !!val; else el.value = val; return; }
      if (key === 'plan') { const r = document.querySelector(`input[name="plan"][value="${val}"]`); if (r) r.checked = true; }
    });
    Object.keys(state.photoPreviewUrls).forEach(k => setLoadedPhoto(k, state.photoPreviewUrls[k]));
  }
  function clearDraft() { localStorage.removeItem(getDraftKey()); location.reload(); }

  async function waitAllUploads() {
    const keys = Object.keys(state.photoUploadState);
    for (const key of keys) {
      const s = state.photoUploadState[key];
      if (!state.photoFiles[key]) continue;
      if (s === 'uploading' || s === 'pending') {
        await new Promise((resolve, reject) => {
          const start = Date.now();
          const timer = setInterval(() => {
            const cur = state.photoUploadState[key];
            if (cur === 'done') { clearInterval(timer); resolve(); return; }
            if (cur === 'error') { clearInterval(timer); reject(new Error(`圖片上傳失敗：${key}`)); return; }
            if (Date.now() - start > 30000) { clearInterval(timer); reject(new Error(`圖片上傳逾時：${key}`)); }
          }, 300);
        });
      }
    }
  }

  async function openCropper(key, file, ratioType='square') {
    const dataUrl = await fileToDataURL(file);
    state.crop = { key, file, ratioType, src: dataUrl, scale: 1, x: 0, y: 0, imageNaturalWidth: 0, imageNaturalHeight: 0 };
    els.cropImage.src = dataUrl;
    els.cropViewport.classList.toggle('is-square', ratioType === 'square');
    els.cropViewport.classList.toggle('is-wide', ratioType === 'banner');
    els.cropTitle.textContent = ratioType === 'banner' ? '裁切 Banner 圖片' : '裁切圖片';
    els.cropHint.textContent = ratioType === 'banner' ? 'Banner 採固定比例裁切，請調整構圖後套用。' : '拖曳可移動圖片，使用縮放調整構圖後套用。';
    els.cropZoom.value = '1';
    els.cropModal.classList.add('show');
    await new Promise(resolve => { els.cropImage.onload = resolve; });
    state.crop.imageNaturalWidth = els.cropImage.naturalWidth; state.crop.imageNaturalHeight = els.cropImage.naturalHeight;
    resetCropState(); syncCropTransform();
  }

  function closeCropper() { els.cropModal.classList.remove('show'); state.crop = null; }
  function adjustCropZoom(diff) { if (!state.crop) return; state.crop.scale = clamp(state.crop.scale + diff, 1, 3, 1); els.cropZoom.value = String(state.crop.scale); syncCropTransform(); }
  function resetCropState() { if (!state.crop) return; state.crop.scale = 1; state.crop.x = 0; state.crop.y = 0; els.cropZoom.value = '1'; syncCropTransform(); }
  function syncCropTransform() {
    if (!state.crop) return;
    const vp = els.cropViewport.getBoundingClientRect();
    const iw = state.crop.imageNaturalWidth || 1000; const ih = state.crop.imageNaturalHeight || 1000;
    const baseScale = Math.max(vp.width / iw, vp.height / ih);
    const scale = baseScale * state.crop.scale;
    const w = iw * scale, h = ih * scale;
    els.cropImage.style.width = `${w}px`; els.cropImage.style.height = `${h}px`; els.cropImage.style.transform = `translate(calc(-50% + ${state.crop.x}px), calc(-50% + ${state.crop.y}px))`;
  }

  async function applyCropAndUpload() {
    if (!state.crop) return;
    const { blob, dataUrl } = await renderCropBlob();
    const key = state.crop.key;
    state.photoPreviewUrls[key] = dataUrl; state.photoFiles[key] = state.crop.file; state.photoUploadState[key] = 'uploading';
    const slot = photoSlots.find(s => s.cfg.key === key);
    if (slot) { slot.previewImage.src = dataUrl; slot.previewImage.classList.remove('hidden'); slot.previewEmpty.classList.add('hidden'); slot.tools.classList.remove('hidden'); slot.badge.textContent = '上傳中…'; slot.badge.dataset.uploadState = 'uploading'; }
    closeCropper(); updatePreview(); saveDraftSilently();
    try {
      await ensureAuth();
      let url = '';
      if (key === 'avatar') url = await uploadAvatar(state.tempCardId, blob);
      else if (key === 'logo') url = await uploadLogo(state.tempCardId, blob);
      else if (key === 'banner') url = await uploadImage(state.tempCardId, blob, 'banner.jpg');
      else if (/^photo\d+$/.test(key)) url = await uploadPhoto(state.tempCardId, blob, Number(key.replace('photo','')));
      state.photoRealUrls[key] = url || dataUrl; state.photoUploadState[key] = 'done'; if (slot) { slot.badge.textContent = '已上傳 ✓'; slot.badge.dataset.uploadState = 'done'; }
      updatePreview(); saveDraftSilently();
    } catch (err) {
      state.photoUploadState[key] = 'error'; if (slot) { slot.badge.textContent = '上傳失敗'; slot.badge.dataset.uploadState = 'error'; }
      setStatus(`圖片上傳失敗（${key}）：${err.message}`,'error');
    }
  }

  async function renderCropBlob() {
    const ratio = state.crop.ratioType === 'banner' ? CONFIG.BANNER_RATIO : 1;
    const outW = state.crop.ratioType === 'banner' ? 1600 : 1200;
    const outH = Math.round(outW / ratio);
    const canvas = document.createElement('canvas'); canvas.width = outW; canvas.height = outH; const ctx = canvas.getContext('2d');
    const img = new Image(); img.src = state.crop.src; await img.decode();
    const vp = els.cropViewport.getBoundingClientRect();
    const iw = img.naturalWidth, ih = img.naturalHeight; const baseScale = Math.max(vp.width / iw, vp.height / ih); const scale = baseScale * state.crop.scale;
    const drawW = iw * scale, drawH = ih * scale;
    const scaleToOut = outW / vp.width;
    const dx = (outW - drawW * scaleToOut) / 2 + state.crop.x * scaleToOut;
    const dy = (outH - drawH * scaleToOut) / 2 + state.crop.y * scaleToOut;
    ctx.drawImage(img, dx, dy, drawW * scaleToOut, drawH * scaleToOut);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return { blob, dataUrl: canvas.toDataURL('image/jpeg', 0.9) };
  }

  function fileToDataURL(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }
  function ensureDefaultPlan() { if (!document.querySelector('input[name="plan"]:checked')) { const r = document.querySelector('input[name="plan"][value="free"]'); if (r) r.checked = true; } }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c])); }
  function labelOfCardField(k) { return ({ name:'姓名', unit:'單位', title:'職稱', slogan:'標語', services:'服務', experience:'經歷', wechat_id:'微信', line_url:'LINE', line_oa:'官方 LINE', email:'Email', phone:'電話', address:'地址', website:'網站' }[k] || k); }
})();
