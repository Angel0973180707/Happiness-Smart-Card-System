(function () {
  'use strict';

  const VERSION = 'v6.7.0-step1-addon-first';
  const CONFIG = {
    GAS: 'https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec',
    HUB_URL: 'https://angel0973180707.github.io/Happiness-Smart-Card-System/',
    CUSTOMER_SERVICE_URL: 'https://lin.ee/G3VJoRm',
    DRAFT_KEY: 'hsc_form_draft_v670_step1',
    BASE_LIMITS: {
      free: { photos: 2, ctas: 1 },
      premium: { photos: 5, ctas: 3 }
    },
    MAX_ADDON_PHOTO_QTY: 10,
    MAX_ADDON_CTA_QTY: 10,
    MAX_RENDER_PHOTO: 15,
    MAX_RENDER_CTA: 13
  };

  const state = {
    plan: 'free',
    addons: new Set(),
    addonPhotoQty: 0,
    addonCtaQty: 0,
    photoLimit: 2,
    ctaLimit: 1,
    marqueeEnabled: false
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDom();
    if (!els.form) return;

    syncHiddenMetaFromQuery();
    bindEvents();
    restoreDraftSilently();
    syncPlanPanels();
    syncAddonControls();
    recalculateDynamicState();
    renderPhotoSlots();
    renderCtaSlots();
    paintStatus('目前版本：' + VERSION + '｜已完成第 1 步：加購前置＋欄位連動');
  }

  function cacheDom() {
    els.form = document.getElementById('smart-card-form');
    els.statusStrip = document.getElementById('form-status-strip');
    els.planRadios = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.addonCheckboxes = Array.from(document.querySelectorAll('input[name="addons"]'));
    els.addonPhotoEnabled = document.getElementById('addon_photo_enabled');
    els.addonPhotoQty = document.getElementById('addon_photo_qty');
    els.addonCtaEnabled = document.getElementById('addon_cta_enabled');
    els.addonCtaQty = document.getElementById('addon_cta_qty');
    els.photoSlots = document.getElementById('photo-slots');
    els.ctaSlots = document.getElementById('cta-slots');
    els.photoTpl = document.getElementById('photo-slot-template');
    els.ctaTpl = document.getElementById('cta-slot-template');
    els.freeThemeGroup = document.getElementById('free-theme-group');
    els.premiumThemeGroup = document.getElementById('premium-theme-group');
    els.photoLimitField = document.getElementById('photo_limit_total');
    els.ctaLimitField = document.getElementById('cta_limit_total');
    els.marqueeSection = document.getElementById('marquee-section');
    els.summaryPlanName = document.getElementById('summary-plan-name');
    els.summaryPhotoCount = document.getElementById('summary-photo-count');
    els.summaryCtaCount = document.getElementById('summary-cta-count');
    els.summaryMarqueeStatus = document.getElementById('summary-marquee-status');
    els.summaryPlanPill = document.getElementById('summary-plan-pill');
    els.summaryPhotoPill = document.getElementById('summary-photo-pill');
    els.summaryCtaPill = document.getElementById('summary-cta-pill');
    els.btnSaveDraft = document.getElementById('btn-save-draft');
    els.btnClearDraft = document.getElementById('btn-clear-draft');
    els.btnContactService = document.getElementById('btn-contact-service');
    els.btnOpenShowcase = document.getElementById('btn-open-showcase');
  }

  function bindEvents() {
    els.planRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.plan = getCurrentPlan();
        syncPlanPanels();
        recalculateDynamicState();
        renderPhotoSlots();
        renderCtaSlots();
      });
    });

    els.addonCheckboxes.forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        syncAddonControls();
        recalculateDynamicState();
        renderPhotoSlots();
        renderCtaSlots();
      });
    });

    if (els.addonPhotoQty) {
      els.addonPhotoQty.addEventListener('input', function () {
        normalizeAddonNumberInput(els.addonPhotoQty, CONFIG.MAX_ADDON_PHOTO_QTY);
        if (toInt(els.addonPhotoQty.value) > 0) {
          els.addonPhotoEnabled.checked = true;
        }
        syncAddonControls();
        recalculateDynamicState();
        renderPhotoSlots();
      });
    }

    if (els.addonCtaQty) {
      els.addonCtaQty.addEventListener('input', function () {
        normalizeAddonNumberInput(els.addonCtaQty, CONFIG.MAX_ADDON_CTA_QTY);
        if (toInt(els.addonCtaQty.value) > 0) {
          els.addonCtaEnabled.checked = true;
        }
        syncAddonControls();
        recalculateDynamicState();
        renderCtaSlots();
      });
    }

    if (els.btnSaveDraft) {
      els.btnSaveDraft.addEventListener('click', function () {
        saveDraft();
      });
    }

    if (els.btnClearDraft) {
      els.btnClearDraft.addEventListener('click', function () {
        clearDraft();
      });
    }

    if (els.btnContactService) {
      els.btnContactService.addEventListener('click', function () {
        window.open(CONFIG.CUSTOMER_SERVICE_URL, '_blank', 'noopener');
      });
    }

    if (els.btnOpenShowcase) {
      els.btnOpenShowcase.addEventListener('click', function () {
        window.open(CONFIG.HUB_URL + 'index.html?view=1', '_blank', 'noopener');
      });
    }

    els.form.addEventListener('input', debounce(function () {
      saveDraft(true);
    }, 280));

    els.form.addEventListener('submit', function (event) {
      event.preventDefault();
      paintStatus('這一版先完成第 1 步：加購前置與欄位連動。送出修正會在第 7 步完整處理。', 'warn');
    });
  }

  function getCurrentPlan() {
    const checked = els.planRadios.find(function (item) { return item.checked; });
    return checked ? checked.value : 'free';
  }

  function syncPlanPanels() {
    const plan = getCurrentPlan();
    state.plan = plan;

    toggleHidden(els.freeThemeGroup, plan !== 'free');
    toggleHidden(els.premiumThemeGroup, plan !== 'premium');

    document.querySelectorAll('[data-plan-card]').forEach(function (node) {
      node.classList.toggle('is-selected', node.getAttribute('data-plan-card') === plan);
    });
  }

  function syncAddonControls() {
    const photoEnabled = !!(els.addonPhotoEnabled && els.addonPhotoEnabled.checked);
    const ctaEnabled = !!(els.addonCtaEnabled && els.addonCtaEnabled.checked);

    if (els.addonPhotoQty) {
      els.addonPhotoQty.disabled = !photoEnabled;
      if (!photoEnabled) els.addonPhotoQty.value = '0';
      if (photoEnabled && toInt(els.addonPhotoQty.value) < 1) els.addonPhotoQty.value = '1';
      normalizeAddonNumberInput(els.addonPhotoQty, CONFIG.MAX_ADDON_PHOTO_QTY);
    }

    if (els.addonCtaQty) {
      els.addonCtaQty.disabled = !ctaEnabled;
      if (!ctaEnabled) els.addonCtaQty.value = '0';
      if (ctaEnabled && toInt(els.addonCtaQty.value) < 1) els.addonCtaQty.value = '1';
      normalizeAddonNumberInput(els.addonCtaQty, CONFIG.MAX_ADDON_CTA_QTY);
    }
  }

  function recalculateDynamicState() {
    state.plan = getCurrentPlan();
    state.addons = new Set(
      els.addonCheckboxes.filter(function (box) { return box.checked; }).map(function (box) { return box.value; })
    );
    state.addonPhotoQty = state.addons.has('addon_photo') ? toInt(els.addonPhotoQty && els.addonPhotoQty.value) : 0;
    state.addonCtaQty = state.addons.has('addon_cta') ? toInt(els.addonCtaQty && els.addonCtaQty.value) : 0;

    const base = CONFIG.BASE_LIMITS[state.plan] || CONFIG.BASE_LIMITS.free;
    state.photoLimit = clamp(base.photos + state.addonPhotoQty, 0, CONFIG.MAX_RENDER_PHOTO);
    state.ctaLimit = clamp(base.ctas + state.addonCtaQty, 0, CONFIG.MAX_RENDER_CTA);
    state.marqueeEnabled = state.addons.has('addon_marquee') || state.addons.has('addon_bundle');

    if (els.photoLimitField) els.photoLimitField.value = String(state.photoLimit);
    if (els.ctaLimitField) els.ctaLimitField.value = String(state.ctaLimit);

    if (els.summaryPlanName) els.summaryPlanName.textContent = state.plan === 'premium' ? '精品設計' : '自由搭配';
    if (els.summaryPhotoCount) els.summaryPhotoCount.textContent = String(state.photoLimit);
    if (els.summaryCtaCount) els.summaryCtaCount.textContent = String(state.ctaLimit);
    if (els.summaryMarqueeStatus) els.summaryMarqueeStatus.textContent = state.marqueeEnabled ? '已開啟' : '未開啟';
    if (els.summaryPlanPill) els.summaryPlanPill.textContent = '目前方案：' + (state.plan === 'premium' ? '精品設計' : '自由搭配');
    if (els.summaryPhotoPill) els.summaryPhotoPill.textContent = '照片上限：' + state.photoLimit;
    if (els.summaryCtaPill) els.summaryCtaPill.textContent = 'CTA 上限：' + state.ctaLimit;

    toggleHidden(els.marqueeSection, !state.marqueeEnabled);
  }

  function renderPhotoSlots() {
    if (!els.photoSlots || !els.photoTpl) return;
    const previous = collectExistingPhotoValues();
    els.photoSlots.innerHTML = '';

    for (let i = 1; i <= state.photoLimit; i += 1) {
      const frag = els.photoTpl.content.cloneNode(true);
      const title = frag.querySelector('.photo-slot-title');
      const badge = frag.querySelector('.photo-slot-badge');
      const urlInput = frag.querySelector('.photo-url-input');
      const fileInput = frag.querySelector('.photo-file-input');
      const preview = frag.querySelector('.photo-preview-box');
      const prev = previous[i] || { url: '', name: '' };

      title.textContent = '照片 ' + i;
      badge.textContent = prev.url ? '已填網址' : '尚未上傳';
      urlInput.name = 'photo' + i + '_url';
      urlInput.id = 'photo' + i + '_url';
      urlInput.value = prev.url;
      fileInput.name = 'photo' + i + '_file';
      fileInput.id = 'photo' + i + '_file';
      preview.textContent = prev.url ? prev.url : '尚未選擇圖片';

      urlInput.addEventListener('input', function () {
        badge.textContent = urlInput.value.trim() ? '已填網址' : '尚未上傳';
        preview.textContent = urlInput.value.trim() || '尚未選擇圖片';
      });

      fileInput.addEventListener('change', function () {
        const file = fileInput.files && fileInput.files[0];
        const name = file ? file.name : '';
        badge.textContent = name ? '已選檔案' : (urlInput.value.trim() ? '已填網址' : '尚未上傳');
        preview.textContent = name || urlInput.value.trim() || '尚未選擇圖片';
      });

      els.photoSlots.appendChild(frag);
    }
  }

  function renderCtaSlots() {
    if (!els.ctaSlots || !els.ctaTpl) return;
    const previous = collectExistingCtaValues();
    els.ctaSlots.innerHTML = '';

    for (let i = 1; i <= state.ctaLimit; i += 1) {
      const frag = els.ctaTpl.content.cloneNode(true);
      const card = frag.querySelector('.cta-slot-card');
      const titleLabel = frag.querySelector('.cta-title-label');
      const labelInput = frag.querySelector('.cta-label-input');
      const urlInput = frag.querySelector('.cta-url-input');
      const prev = previous[i] || { label: '', url: '' };

      card.dataset.ctaIndex = String(i);
      titleLabel.setAttribute('for', 'cta' + i + '_label');
      titleLabel.textContent = 'CTA ' + i + ' 文字';
      labelInput.name = 'cta' + i + '_label';
      labelInput.id = 'cta' + i + '_label';
      labelInput.value = prev.label;
      urlInput.name = 'cta' + i + '_url';
      urlInput.id = 'cta' + i + '_url';
      urlInput.value = prev.url;

      els.ctaSlots.appendChild(frag);
    }
  }

  function collectExistingPhotoValues() {
    const result = {};
    document.querySelectorAll('.photo-url-input').forEach(function (input) {
      const match = (input.name || '').match(/photo(\d+)_url/);
      if (!match) return;
      result[Number(match[1])] = { url: input.value || '' };
    });
    return result;
  }

  function collectExistingCtaValues() {
    const result = {};
    document.querySelectorAll('.cta-slot-card').forEach(function (card) {
      const idx = Number(card.dataset.ctaIndex || 0);
      if (!idx) return;
      const label = card.querySelector('.cta-label-input');
      const url = card.querySelector('.cta-url-input');
      result[idx] = {
        label: label ? label.value : '',
        url: url ? url.value : ''
      };
    });
    return result;
  }

  function saveDraft(silent) {
    try {
      const payload = serializeFormState();
      localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(payload));
      if (!silent) paintStatus('已暫存目前表單內容。');
    } catch (error) {
      paintStatus('暫存失敗：' + (error && error.message ? error.message : '未知錯誤'), 'error');
    }
  }

  function clearDraft() {
    localStorage.removeItem(CONFIG.DRAFT_KEY);
    paintStatus('已清除暫存草稿。');
  }

  function restoreDraftSilently() {
    try {
      const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;

      applyScalar('invite_code', data.invite_code);
      applyScalar('ref', data.ref);
      applyPlan(data.plan);
      applyCheckboxes(data.addons);
      applyScalar('addon_photo_qty', data.addon_photo_qty);
      applyScalar('addon_cta_qty', data.addon_cta_qty);
      applyScalar('display_name', data.display_name);
      applyScalar('title', data.title);
      applyScalar('phone', data.phone);
      applyScalar('email', data.email);
      applyScalar('address', data.address);
      applyScalar('intro', data.intro);
      applyScalar('free_color', data.free_color);
      applyScalar('free_style', data.free_style);
      applyScalar('free_paper', data.free_paper);
      applyScalar('premium_color', data.premium_color);
      applyScalar('marquee_1', data.marquee_1);
      applyScalar('marquee_2', data.marquee_2);
      applyScalar('marquee_3', data.marquee_3);
    } catch (error) {
      console.warn('restore draft failed', error);
    }
  }

  function serializeFormState() {
    const formData = new FormData(els.form);
    const data = {};
    formData.forEach(function (value, key) {
      if (key === 'addons') {
        if (!Array.isArray(data.addons)) data.addons = [];
        data.addons.push(value);
        return;
      }
      if (value instanceof File) return;
      data[key] = value;
    });

    document.querySelectorAll('.photo-url-input').forEach(function (input) {
      data[input.name] = input.value;
    });
    document.querySelectorAll('.cta-label-input').forEach(function (input) {
      data[input.name] = input.value;
    });
    document.querySelectorAll('.cta-url-input').forEach(function (input) {
      data[input.name] = input.value;
    });

    data.version = VERSION;
    return data;
  }

  function applyScalar(idOrName, value) {
    if (value === undefined || value === null) return;
    const byId = document.getElementById(idOrName);
    if (byId) {
      byId.value = value;
      return;
    }
    const byName = document.querySelector('[name="' + cssEscape(idOrName) + '"]');
    if (byName) byName.value = value;
  }

  function applyPlan(value) {
    const target = value === 'premium' ? 'premium' : 'free';
    els.planRadios.forEach(function (radio) {
      radio.checked = radio.value === target;
    });
    state.plan = target;
  }

  function applyCheckboxes(values) {
    const set = new Set(Array.isArray(values) ? values : []);
    els.addonCheckboxes.forEach(function (box) {
      box.checked = set.has(box.value);
    });
  }

  function syncHiddenMetaFromQuery() {
    const params = new URLSearchParams(window.location.search || '');
    applyScalar('invite_code', params.get('invite') || params.get('invite_code') || '');
    applyScalar('ref', params.get('ref') || '');
  }

  function paintStatus(message, type) {
    if (!els.statusStrip) return;
    els.statusStrip.textContent = message;
    els.statusStrip.dataset.state = type || 'ok';
  }

  function toggleHidden(node, shouldHide) {
    if (!node) return;
    node.classList.toggle('hidden', !!shouldHide);
  }

  function normalizeAddonNumberInput(input, max) {
    if (!input) return;
    input.value = String(clamp(toInt(input.value), 0, max));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function toInt(value) {
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : 0;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  function cssEscape(value) {
    return String(value).replace(/"/g, '\\"');
  }
})();
