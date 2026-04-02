/* ============================================================
   \u5929\u4f7f\u5e78\u798f\u667a\u6167\u540d\u7247\u9928 form.js
   v7.8.0
   \u4fee\u6b63\uff1a
   1. \u7d93\u6b77\u6b04\u4f4d\u6539\u70ba textarea\uff08\u53ef\u5206\u884c\u586b\u5beb\uff09
   2. \u670d\u52d9\u3001\u54c1\u724c\u91d1\u53e5\u3001\u7d93\u6b77\u8d85\u904e 3 \u884c\u53ef\u6536\u8d77
   3. \u9001\u51fa\u5f8c\u9032\u5ea6\u689d + \u5b8c\u6210\u756b\u9762\u986f\u793a\u5e8f\u865f + \u8907\u88fd\u6587\u6848\u6309\u9215
   4. \u9001\u51fa\u5f8c\u7acb\u5373\u751f\u6210\u6210\u54c1\u9023\u7d50\uff08cardId \u2192 previewUrl\uff09
   5. \u6210\u54c1\u9801\u986f\u793a 3 \u5929\u4ed8\u6b3e\u5012\u6578\u671f\u9650
============================================================ */

(() => {
  "use strict";

  /* ============================================================
     CONFIG
  ============================================================ */
  const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    SERVICE_URL:  "https://lin.ee/G3VJoRm",
    SHOWCASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    QUOTE_STORAGE_KEY: "HSC_LAST_QUOTE",
    DRAFT_KEY: "hsc_form_draft_v780",
    BASE_LIMITS: {
      free:    { wallPhotos: 2, ctas: 1, price: 1500, label: "\u81ea\u7531\u642d\u914d" },
      premium: { wallPhotos: 5, ctas: 3, price: 2000, label: "\u7cbe\u54c1\u8a2d\u8a08" }
    },
    ADDON_PRICES: {
      addon_marquee:          300,
      addon_photo:            100,
      addon_cta:              100,
      addon_update_unlimited: 300,
      addon_bundle:           500,
      addon_agent_upgrade:  10000
    },
    MAX_WALL_PHOTOS: 10,
    MAX_CTAS: 10,
    DEFAULT_PREVIEW_META: {
      layout: "grid", aspect_ratio: "1:1", fit_mode: "cover"
    }
  };

  const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };

  const state = {
    photoMeta:        { avatar: { ...DEFAULT_PHOTO_META }, logo: { ...DEFAULT_PHOTO_META } },
    photoPreviewUrls: {},
    photoFiles:       {},
    wallPhotoCount:   0,
    ctaCount:         0
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  /* ============================================================
     \u521d\u59cb\u5316
  ============================================================ */
  function init() {
    collectEls();
    ensureRendererAlias();
    // FIX 1: \u5c07 experience \u8f38\u5165\u6846\u5347\u7d1a\u70ba textarea
    upgradeExperienceToTextarea();
    bindStaticEvents();
    restoreDraft();
    ensureDefaultPlan();
    refreshAll();
    // FIX 2: \u521d\u59cb\u5316\u9577\u6587\u6536\u6298
    initTextareaCollapse();
  }

  /* ============================================================
     FIX 1: \u5c07 experience <input> \u52d5\u614b\u66ff\u63db\u70ba <textarea>
  ============================================================ */
  function upgradeExperienceToTextarea() {
    const oldInput = document.getElementById("experience");
    if (!oldInput || oldInput.tagName === "TEXTAREA") return;

    const ta = document.createElement("textarea");
    ta.id          = "experience";
    ta.name        = oldInput.name || "experience";
    ta.rows        = 4;
    ta.placeholder = "\u4f8b\uff1a\u524d XX \u516c\u53f8\u54c1\u724c\u9867\u554f\u300110 \u5e74\u696d\u754c\u8cc7\u6b77\n\u53ef\u5206\u884c\u586b\u5beb\u591a\u6bb5\u7d93\u6b77";
    ta.style.cssText = "resize:vertical;min-height:96px;";

    // \u52a0\u63d0\u793a\u5b57
    const hint = document.createElement("p");
    hint.className = "field-hint";
    hint.textContent = "\u53ef\u63db\u884c\u586b\u5beb\u591a\u6bb5\u7d93\u6b77\uff0c\u7cfb\u7d71\u81ea\u52d5\u6574\u7406\u6392\u7248\u3002";

    oldInput.parentNode.insertBefore(ta, oldInput);
    oldInput.parentNode.removeChild(oldInput);
    oldInput.parentNode && oldInput.parentNode.appendChild(hint);
    ta.parentNode.appendChild(hint);
  }

  /* ============================================================
     FIX 2: \u9577\u6587\u6b04\u4f4d\u8d85\u904e 3 \u884c\u81ea\u52d5\u52a0\u300c\u6536\u8d77\uff0f\u5c55\u958b\u300d\u6309\u9215
     \u9069\u7528\uff1aservices, intro (\u54c1\u724c\u91d1\u53e5), experience
  ============================================================ */
  function initTextareaCollapse() {
    ["services","intro","experience","marquee_text"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => checkCollapse(el));
      checkCollapse(el);
    });
  }

  function checkCollapse(textarea) {
    const MAX_VISIBLE_LINES = 3;
    const LINE_HEIGHT = 24; // px
    const THRESHOLD = MAX_VISIBLE_LINES * LINE_HEIGHT + 8;

    // \u5148\u79fb\u9664\u820a\u6309\u9215
    const existingBtn = textarea.parentNode.querySelector(".textarea-collapse-btn");
    if (existingBtn) existingBtn.remove();
    textarea.style.maxHeight = "";
    textarea.style.overflow  = "hidden auto";

    requestAnimationFrame(() => {
      if (textarea.scrollHeight <= THRESHOLD) return;

      // \u9810\u8a2d\u6536\u8d77
      if (!textarea.dataset.expanded) {
        textarea.style.maxHeight = `${THRESHOLD}px`;
        textarea.style.overflow  = "hidden";
      }

      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = "ghost-btn mini textarea-collapse-btn";
      btn.style.cssText = "margin-top:4px;width:100%;";
      btn.textContent = textarea.dataset.expanded ? "\u25b2 \u6536\u8d77" : "\u25bc \u5c55\u958b\u5168\u90e8";

      btn.addEventListener("click", () => {
        if (textarea.dataset.expanded) {
          delete textarea.dataset.expanded;
          textarea.style.maxHeight = `${THRESHOLD}px`;
          textarea.style.overflow  = "hidden";
          btn.textContent = "\u25bc \u5c55\u958b\u5168\u90e8";
        } else {
          textarea.dataset.expanded = "1";
          textarea.style.maxHeight = "none";
          textarea.style.overflow  = "hidden auto";
          btn.textContent = "\u25b2 \u6536\u8d77";
        }
      });

      textarea.insertAdjacentElement("afterend", btn);
    });
  }

  function collectEls() {
    const ids = [
      "smart-card-form", "form-status-strip",
      "btn-open-showcase", "btn-save-draft", "btn-clear-draft",
      "btn-contact-service", "btn-submit-form",
      "btn-gold-info", "btn-gold-copy", "btn-gold-contact",
      "progress-contact-service",

      "invite_code", "ref",

      "addon_marquee_enabled", "addon_photo_enabled", "addon_photo_qty",
      "addon_cta_enabled", "addon_cta_qty",
      "addon_update_unlimited_enabled", "addon_bundle_enabled",
      "addon_agent_upgrade_enabled", "addon-photo-tip",

      "free-theme-group", "premium-theme-group",
      "free_color", "free_style", "free_paper", "premium_color",

      "display_name", "unit", "title", "phone", "email", "website",
      "line_url", "line_oa", "wechat_id", "experience", "services",
      "address", "intro",
      "video1", "video2", "video3",
      "social1", "social2", "social3",

      "marquee-section", "marquee_text",
      "photo-slots", "cta-slots", "livePreviewCard",

      "summary-plan-pill", "summary-photo-pill", "summary-cta-pill",
      "summary-plan-name", "summary-photo-count", "summary-cta-count",
      "summary-marquee-status",

      "quote-state-text", "quote-plan-amount", "quote-addon-amount",
      "quote-addon-breakdown", "quote-total-amount",

      "submit-progress-overlay", "progress-text", "progress-fill",
      "progress-success-panel", "progress-card-id-display",
      "btn-copy-card-notice", "progress-preview-link"
    ];

    ids.forEach(id => { els[id] = document.getElementById(id); });

    els.planRadios      = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.addonCheckboxes = Array.from(document.querySelectorAll('input[name="addons"]'));
    els.planCards       = Array.from(document.querySelectorAll("[data-plan-card]"));
    els.progressSteps   = Array.from(document.querySelectorAll(".progress-step"));
    els.photoTemplate   = document.getElementById("photo-slot-template");
    els.ctaTemplate     = document.getElementById("cta-slot-template");
  }

  function ensureRendererAlias() {
    if (!window.HSCCardRenderer && window.HscCardRenderer) {
      window.HSCCardRenderer = window.HscCardRenderer;
    }
  }

  /* ============================================================
     \u975c\u614b\u4e8b\u4ef6
  ============================================================ */
  function bindStaticEvents() {
    if (els["smart-card-form"]) els["smart-card-form"].addEventListener("submit", submit);

    els.planRadios.forEach(r => r.addEventListener("change", refreshAll));
    els.addonCheckboxes.forEach(b => b.addEventListener("change", refreshAll));

    ["addon_photo_qty", "addon_cta_qty"].forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input",  refreshAll);
        els[id].addEventListener("change", refreshAll);
      }
    });

    [
      "free_color","free_style","free_paper","premium_color",
      "display_name","unit","title","phone","email","website",
      "line_url","line_oa","wechat_id","experience","services",
      "address","intro","marquee_text",
      "video1","video2","video3","social1","social2","social3"
    ].forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input",  onLiveChange);
        els[id].addEventListener("change", onLiveChange);
      }
    });

    bindButton(els["btn-open-showcase"],        () => window.open(CONFIG.SHOWCASE_URL, "_blank", "noopener"));
    bindButton(els["btn-contact-service"],      () => window.open(CONFIG.SERVICE_URL,  "_blank", "noopener"));
    bindButton(els["progress-contact-service"], () => window.open(CONFIG.SERVICE_URL,  "_blank", "noopener"));
    bindButton(els["btn-gold-contact"],         () => window.open(CONFIG.SERVICE_URL,  "_blank", "noopener"));
    bindButton(els["btn-gold-info"],            () => alert("\u91d1\u724c\u7d1a\u6703\u54e1\u8acb\u806f\u7e6b\u5ba2\u670d\u77ad\u89e3\u5b8c\u6574\u6b0a\u76ca\u3002"));
    bindButton(els["btn-gold-copy"], async () => {
      await copyText("\u60a8\u597d\uff0c\u6211\u60f3\u77ad\u89e3\u91d1\u724c\u7d1a\u6703\u54e1\u7684\u5b8c\u6574\u6b0a\u76ca\u8207\u9069\u5408\u65b9\u6848\u3002");
      setStatus("\u5df2\u8907\u88fd\u91d1\u724c\u6703\u54e1\u8a62\u554f\u6587\u6848\u3002");
    });
    bindButton(els["btn-save-draft"],  () => { saveDraft(); setStatus("\u8349\u7a3f\u5df2\u66ab\u5b58\u3002"); });
    bindButton(els["btn-clear-draft"], clearDraft);

    // FIX 3: \u8907\u88fd\u5e8f\u865f\u901a\u77e5\u6587\u6848
    bindButton(els["btn-copy-card-notice"], async () => {
      const cardId = els["progress-card-id-display"]?.dataset.cardId || "";
      const name   = valueOf("display_name") || "\u60a8";
      const limits = getLimits();
      const addonItems = getAddonItemsForQuote(limits);
      const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
      const total = limits.planPrice + addonAmount;
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 3);
      const dueDateStr = `${dueDate.getFullYear()}/${dueDate.getMonth()+1}/${dueDate.getDate()}`;
      const previewUrl = cardId
        ? `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`
        : CONFIG.SHOWCASE_URL;

      const notice = `\u60a8\u597d\uff0c\u6211\u662f ${name}\uff0c\u5df2\u5b8c\u6210\u5929\u4f7f\u5e78\u798f\u667a\u6167\u540d\u7247\u7533\u8acb\uff01\n` +
        `\ud83d\udccb \u540d\u7247\u5e8f\u865f\uff1a${cardId || "\uff08\u5f85\u78ba\u8a8d\uff09"}\n` +
        `\ud83d\udcb3 \u65b9\u6848\uff1a${limits.planLabel}\uff0c\u7e3d\u91d1\u984d NT$ ${total.toLocaleString("zh-TW")}\n` +
        `\ud83d\udd17 \u6210\u54c1\u9810\u89bd\uff1a${previewUrl}\n` +
        `\u23f0 \u4ed8\u6b3e\u671f\u9650\uff1a${dueDateStr} \u524d\uff0c\u8acb\u5354\u52a9\u78ba\u8a8d\u4e26\u958b\u901a\u540d\u7247\uff0c\u8b1d\u8b1d\uff01`;

      await copyText(notice);
      const btn = els["btn-copy-card-notice"];
      if (btn) {
        btn.textContent = "\u2705 \u5df2\u8907\u88fd\uff01";
        setTimeout(() => { btn.textContent = "\ud83d\udccb \u8907\u88fd\u5e8f\u865f\uff0b\u56de\u8986\u6587\u6848"; }, 2000);
      }
    });
  }

  function bindButton(btn, handler) {
    if (btn) btn.addEventListener("click", handler);
  }

  function onLiveChange() {
    updatePreview();
    saveDraftSilently();
    // FIX 2: \u91cd\u65b0\u6aa2\u67e5\u6536\u6298
    const el = event?.target;
    if (el && el.tagName === "TEXTAREA") checkCollapse(el);
  }

  /* ============================================================
     \u65b9\u6848 / \u52a0\u8cfc\u908f\u8f2f
  ============================================================ */
  function ensureDefaultPlan() {
    if (getSelectedPlan()) return;
    const r = els.planRadios.find(r => r.value === "premium");
    if (r) r.checked = true;
  }

  function getSelectedPlan() {
    return els.planRadios.find(r => r.checked)?.value || "";
  }

  function isAddonChecked(code) {
    return !!document.querySelector(`input[name="addons"][value="${code}"]`)?.checked;
  }

  function getAddonQty(id) {
    const el = els[id];
    if (!el) return 0;
    const n = Number(el.value || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (Number.isFinite(min) && n < min) return min;
    if (Number.isFinite(max) && n > max) return max;
    return n;
  }

  function normalizePhotoMeta(meta) {
    const s = meta && typeof meta === "object" ? meta : {};
    return {
      x:      clampNumber(s.x,      0,    1,   DEFAULT_PHOTO_META.x),
      y:      clampNumber(s.y,      0,    1,   DEFAULT_PHOTO_META.y),
      scale:  clampNumber(s.scale,  0.5,  3,   DEFAULT_PHOTO_META.scale),
      rotate: clampNumber(s.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
    };
  }

  /* ============================================================
     \u5168\u9762\u5237\u65b0
  ============================================================ */
  function refreshAll() {
    const limits = getLimits();
    syncPlanCards();
    syncThemeGroups(limits.plan);
    syncAddonInputs(limits);
    syncMarqueeSection();
    renderPhotoSections(limits.wallPhotos);
    renderCtas(limits.ctas);
    syncSummary(limits);
    syncQuote(limits);
    updatePreview();
    saveDraftSilently();
  }

  function getLimits() {
    const plan  = getSelectedPlan() || "premium";
    const base  = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;
    let ewp = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let ect = isAddonChecked("addon_cta")   ? getAddonQty("addon_cta_qty")   : 0;
    ewp = clamp(ewp, 0, CONFIG.MAX_WALL_PHOTOS - base.wallPhotos);
    ect = clamp(ect, 0, CONFIG.MAX_CTAS - base.ctas);
    return {
      plan,
      planLabel:  base.label,
      planPrice:  base.price,
      wallPhotos: clamp(base.wallPhotos + ewp, 0, CONFIG.MAX_WALL_PHOTOS),
      ctas:       clamp(base.ctas + ect, 0, CONFIG.MAX_CTAS),
      extraWallPhotos: ewp,
      extraCtas: ect
    };
  }

  function syncPlanCards() {
    const plan = getSelectedPlan();
    els.planCards.forEach(c => c.classList.toggle("is-selected", c.getAttribute("data-plan-card") === plan));
  }

  function syncThemeGroups(plan) {
    if (els["free-theme-group"])    els["free-theme-group"].classList.toggle("hidden",    plan !== "free");
    if (els["premium-theme-group"]) els["premium-theme-group"].classList.toggle("hidden", plan !== "premium");
  }

  function syncAddonInputs(limits) {
    const bundleChecked = isAddonChecked("addon_bundle");

    if (els["addon_photo_qty"]) {
      const enabled  = isAddonChecked("addon_photo");
      const maxExtra = Math.max(0, CONFIG.MAX_WALL_PHOTOS - CONFIG.BASE_LIMITS[limits.plan].wallPhotos);
      els["addon_photo_qty"].disabled = !enabled;
      els["addon_photo_qty"].max      = String(maxExtra);
      if (!enabled) els["addon_photo_qty"].value = "0";
      if (Number(els["addon_photo_qty"].value || 0) > maxExtra) els["addon_photo_qty"].value = String(maxExtra);
    }

    if (els["addon-photo-tip"]) {
      const remain = Math.max(0, CONFIG.MAX_WALL_PHOTOS - CONFIG.BASE_LIMITS[limits.plan].wallPhotos);
      els["addon-photo-tip"].textContent = `\u672c\u65b9\u6848\u6700\u591a\u53ef\u518d\u52a0 ${remain} \u5f35`;
    }

    if (els["addon_cta_qty"]) {
      const enabled  = isAddonChecked("addon_cta");
      const maxExtra = Math.max(0, CONFIG.MAX_CTAS - CONFIG.BASE_LIMITS[limits.plan].ctas);
      els["addon_cta_qty"].disabled = !enabled;
      els["addon_cta_qty"].max      = String(maxExtra);
      if (!enabled) els["addon_cta_qty"].value = "0";
      if (Number(els["addon_cta_qty"].value || 0) > maxExtra) els["addon_cta_qty"].value = String(maxExtra);
    }

    if (els["addon_marquee_enabled"]) {
      els["addon_marquee_enabled"].disabled = bundleChecked;
      if (bundleChecked) els["addon_marquee_enabled"].checked = false;
    }

    if (els["addon_update_unlimited_enabled"]) {
      els["addon_update_unlimited_enabled"].disabled = bundleChecked;
      if (bundleChecked) els["addon_update_unlimited_enabled"].checked = false;
    }
  }

  function syncMarqueeSection() {
    if (els["marquee-section"]) els["marquee-section"].classList.toggle("hidden", !isMarqueeEnabled());
  }

  /* ============================================================
     \u7167\u7247\u5340\u584a
  ============================================================ */
  function ensurePhotoMetaKey(key) {
    if (!state.photoMeta[key]) state.photoMeta[key] = { ...DEFAULT_PHOTO_META };
    else state.photoMeta[key] = normalizePhotoMeta(state.photoMeta[key]);
  }

  function renderPhotoSections(wallLimit) {
    if (!els["photo-slots"] || !els.photoTemplate) return;
    state.wallPhotoCount = wallLimit;
    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
    for (let i = 1; i <= wallLimit; i++) ensurePhotoMetaKey(`photo${i}`);

    els["photo-slots"].innerHTML = "";

    const sections = [
      { title: "\u500b\u4eba\u7167", desc: "\u56fa\u5b9a 1 \u5f35\uff0c\u5957\u7528\u5230\u6210\u54c1\u5361\u982d\u50cf\u3002",                              keys: ["avatar"] },
      { title: "Logo",   desc: "\u56fa\u5b9a 1 \u5f35\uff0c\u5957\u7528\u5230\u6210\u54c1\u5361 logo\u3002",                             keys: ["logo"]   },
      { title: "\u7167\u7247\u7246", desc: `\u672c\u6b21\u53ef\u4e0a\u50b3 ${wallLimit} \u5f35\uff08\u4e0d\u542b\u500b\u4eba\u7167\u8207 Logo\uff09`,              keys: Array.from({ length: wallLimit }, (_, i) => `photo${i + 1}`) }
    ];

    sections.forEach(sec => {
      const wrapper = document.createElement("section");
      wrapper.className = "photo-section";
      const head = document.createElement("div");
      head.className = "photo-section-head";
      head.innerHTML = `<div><h3>${escapeHtml(sec.title)}</h3><p>${escapeHtml(sec.desc)}</p></div>`;
      const grid = document.createElement("div");
      grid.className = "photo-grid photo-grid-form";
      sec.keys.forEach((key, idx) => grid.appendChild(buildPhotoCard(key, sec.title, idx + 1)));
      wrapper.appendChild(head);
      wrapper.appendChild(grid);
      els["photo-slots"].appendChild(wrapper);
    });
  }

  function buildPhotoCard(key, sectionTitle, index) {
    const frag         = els.photoTemplate.content.cloneNode(true);
    const card         = frag.querySelector(".photo-card");
    const title        = frag.querySelector(".photo-title");
    const badge        = frag.querySelector(".badge");
    const fileInput    = frag.querySelector(".photo-file-input");
    const previewImage = frag.querySelector(".preview-image");
    const previewEmpty = frag.querySelector(".preview-empty");
    const tools        = frag.querySelector(".photo-tools");
    const zoomRange    = frag.querySelector(".zoom-range");
    const rotateLeft   = frag.querySelector(".rotate-left");
    const rotateRight  = frag.querySelector(".rotate-right");
    const moveLeft     = frag.querySelector(".move-left");
    const moveRight    = frag.querySelector(".move-right");
    const moveUp       = frag.querySelector(".move-up");
    const moveDown     = frag.querySelector(".move-down");
    const resetBtn     = frag.querySelector(".reset-photo");

    card.dataset.photoKey      = key;
    title.textContent          = ({ avatar: "\u500b\u4eba\u7167", logo: "Logo" })[key] || `\u7167\u7247\u7246 ${index}`;
    fileInput.dataset.photoKey = key;
    zoomRange.dataset.photoKey = key;
    zoomRange.value            = String(state.photoMeta[key]?.scale || 1);

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      state.photoFiles[key] = file;
      const url = await fileToDataURL(file);
      state.photoPreviewUrls[key] = url;
      previewImage.src = url;
      previewImage.classList.remove("hidden");
      previewEmpty.classList.add("hidden");
      tools.classList.remove("hidden");
      badge.textContent = "\u5df2\u4e0a\u50b3";
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    zoomRange.addEventListener("input", () => {
      state.photoMeta[key].scale = clampNumber(zoomRange.value, 0.5, 3, 1);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    rotateLeft.addEventListener("click", () => {
      state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate - 90, -180, 180, 0);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    rotateRight.addEventListener("click", () => {
      state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate + 90, -180, 180, 0);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    moveLeft.addEventListener("click", () => {
      state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x - 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    moveRight.addEventListener("click", () => {
      state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x + 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    moveUp.addEventListener("click", () => {
      state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y - 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    moveDown.addEventListener("click", () => {
      state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y + 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    resetBtn.addEventListener("click", () => {
      state.photoMeta[key] = { ...DEFAULT_PHOTO_META };
      zoomRange.value = "1";
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    hydratePhotoCardUi(key, { badge, previewImage, previewEmpty, tools, zoomRange });
    return card;
  }

  function hydratePhotoCardUi(key, { badge, previewImage, previewEmpty, tools, zoomRange }) {
    ensurePhotoMetaKey(key);
    const src = state.photoPreviewUrls[key];
    if (zoomRange) zoomRange.value = String(state.photoMeta[key].scale || 1);
    if (src) {
      previewImage.src = src;
      previewImage.classList.remove("hidden");
      previewEmpty.classList.add("hidden");
      tools.classList.remove("hidden");
      badge.textContent = "\u5df2\u4e0a\u50b3";
      applyPhotoTransform(previewImage, state.photoMeta[key]);
    } else {
      previewImage.removeAttribute("src");
      previewImage.classList.add("hidden");
      previewEmpty.classList.remove("hidden");
      tools.classList.add("hidden");
      badge.textContent = "\u5c1a\u672a\u4e0a\u50b3";
    }
  }

  function applyPhotoTransform(img, meta) {
    if (!img || !meta) return;
    const scale  = clampNumber(meta.scale,  0.5, 3,    1);
    const rotate = clampNumber(meta.rotate, -180, 180, 0);
    const x      = ((meta.x ?? 0.5) - 0.5) * 40;
    const y      = ((meta.y ?? 0.5) - 0.5) * 40;
    img.style.transform = `translate(${x}px,${y}px) scale(${scale}) rotate(${rotate}deg)`;
  }

  /* ============================================================
     CTA \u5340\u584a
  ============================================================ */
  function renderCtas(limit) {
    if (!els["cta-slots"] || !els.ctaTemplate) return;
    const saved = collectCurrentCtaValues();
    els["cta-slots"].innerHTML = "";
    state.ctaCount = limit;

    for (let i = 1; i <= limit; i++) {
      const frag      = els.ctaTemplate.content.cloneNode(true);
      const label     = frag.querySelector(".cta-title-label");
      const textInput = frag.querySelector(".cta-label-input");
      const urlInput  = frag.querySelector(".cta-url-input");

      label.textContent = `CTA \u6309\u9215 ${i}`;
      textInput.id    = `cta_text_${i}`;
      textInput.value = saved[`cta_text_${i}`] || "";
      urlInput.id     = `cta_link_${i}`;
      urlInput.value  = saved[`cta_link_${i}`] || "";

      textInput.addEventListener("input",  onLiveChange);
      textInput.addEventListener("change", onLiveChange);
      urlInput.addEventListener("input",   onLiveChange);
      urlInput.addEventListener("change",  onLiveChange);

      els["cta-slots"].appendChild(frag);
    }
  }

  function collectCurrentCtaValues() {
    const out = {};
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const t = document.getElementById(`cta_text_${i}`);
      const u = document.getElementById(`cta_link_${i}`);
      if (t) out[`cta_text_${i}`] = t.value || "";
      if (u) out[`cta_link_${i}`] = u.value || "";
    }
    return out;
  }

  /* ============================================================
     Summary & Quote
  ============================================================ */
  function syncSummary(limits) {
    if (els["summary-plan-pill"])      els["summary-plan-pill"].textContent      = limits.planLabel;
    if (els["summary-photo-pill"])     els["summary-photo-pill"].textContent     = `\u7167\u7247\u7246\uff1a${limits.wallPhotos}`;
    if (els["summary-cta-pill"])       els["summary-cta-pill"].textContent       = `CTA\uff1a${limits.ctas}`;
    if (els["summary-plan-name"])      els["summary-plan-name"].textContent      = limits.planLabel;
    if (els["summary-photo-count"])    els["summary-photo-count"].textContent    = String(limits.wallPhotos);
    if (els["summary-cta-count"])      els["summary-cta-count"].textContent      = String(limits.ctas);
    if (els["summary-marquee-status"]) els["summary-marquee-status"].textContent = isMarqueeEnabled() ? "\u5df2\u958b\u555f" : "\u672a\u958b\u555f";
  }

  function getAddonItemsForQuote(limits) {
    const items          = [];
    const bundleChecked  = isAddonChecked("addon_bundle");
    const photoChecked   = isAddonChecked("addon_photo");
    const ctaChecked     = isAddonChecked("addon_cta");
    const photoQty       = photoChecked ? getAddonQty("addon_photo_qty") : 0;
    const ctaQty         = ctaChecked   ? getAddonQty("addon_cta_qty")   : 0;

    if (bundleChecked) {
      items.push({ code: "addon_bundle", name: "\u8dd1\u99ac\u71c8\uff0b\u66f4\u65b0\u7d44\u5408", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_bundle, amount: CONFIG.ADDON_PRICES.addon_bundle });
    } else {
      if (isAddonChecked("addon_marquee")) items.push({
        code: "addon_marquee", name: "\u8dd1\u99ac\u71c8\u529f\u80fd", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_marquee, amount: CONFIG.ADDON_PRICES.addon_marquee });
      if (isAddonChecked("addon_update_unlimited")) items.push({
        code: "addon_update_unlimited", name: "\u7121\u9650\u66f4\u65b0", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_update_unlimited, amount: CONFIG.ADDON_PRICES.addon_update_unlimited });
    }

    if (photoChecked && photoQty > 0) items.push({
      code: "addon_photo", name: "\u7167\u7247\u7246\u52a0\u8cfc", qty: photoQty,
      unit_price: CONFIG.ADDON_PRICES.addon_photo, amount: photoQty * CONFIG.ADDON_PRICES.addon_photo });

    if (ctaChecked && ctaQty > 0) items.push({
      code: "addon_cta", name: "CTA \u52a0\u8cfc", qty: ctaQty,
      unit_price: CONFIG.ADDON_PRICES.addon_cta, amount: ctaQty * CONFIG.ADDON_PRICES.addon_cta });

    if (isAddonChecked("addon_agent_upgrade")) items.push({
      code: "addon_agent_upgrade", name: "\u91d1\u724c\u7d1a\u6703\u54e1", qty: 1,
      unit_price: CONFIG.ADDON_PRICES.addon_agent_upgrade, amount: CONFIG.ADDON_PRICES.addon_agent_upgrade });

    return items;
  }

  function syncQuote(limits) {
    const items       = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const total       = (limits.planPrice || 0) + addonAmount;

    if (els["quote-state-text"])   els["quote-state-text"].textContent   = `${limits.planLabel}\uff5c${money(total)}`;
    if (els["quote-plan-amount"])  els["quote-plan-amount"].textContent  = money(limits.planPrice || 0);
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = money(addonAmount);
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = money(total);

    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!items.length) {
        const s = document.createElement("span");
        s.textContent = "\u5c1a\u672a\u9078\u64c7\u52a0\u8cfc";
        els["quote-addon-breakdown"].appendChild(s);
      } else {
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          const qs = (item.code === "addon_photo" || item.code === "addon_cta") && item.qty > 1
            ? ` \u00d7 ${item.qty}` : "";
          row.innerHTML = `<span>${escapeHtml(item.name)}${qs}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
  }

  /* ============================================================
     \u5373\u6642\u9810\u89bd
  ============================================================ */
  function updatePreview() {
    const root = els["livePreviewCard"];
    if (!root) return;
    ensureRendererAlias();
    const renderer = window.HSCCardRenderer || window.HscCardRenderer;
    if (!renderer || typeof renderer.renderCard !== "function") {
      root.innerHTML = `<div class="renderer-error">\u627e\u4e0d\u5230 HscCardRenderer\uff0c\u8acb\u78ba\u8a8d\u5df2\u8f09\u5165 card-renderer.js</div>`;
      return;
    }
    try {
      renderer.renderCard(buildPreviewData(), {
        mode: "form", root, useExistingDom: false,
        qrMode: "preview", allowActions: false,
        previewUrl: CONFIG.SHOWCASE_URL,
        shareUrl:   CONFIG.SHOWCASE_URL,
        cardUrl:    CONFIG.SHOWCASE_URL
      });
      bindPreviewCollapseToggles(root);
    } catch (err) {
      console.error("updatePreview error:", err);
      root.innerHTML = `<div class="renderer-error">\u9810\u89bd\u6e32\u67d3\u5931\u6557\uff1a${escapeHtml(err.message || "\u672a\u77e5")}</div>`;
    }
  }

  function buildPreviewData() {
    const limits = getLimits();
    const theme  = getThemeSelection();

    const data = {
      name:       valueOf("display_name"),
      unit:       valueOf("unit"),
      title:      valueOf("title"),
      slogan:     valueOf("intro"),
      services:   valueOf("services"),
      experience: valueOf("experience"),
      phone:      valueOf("phone"),
      email:      valueOf("email"),
      address:    valueOf("address"),
      website:    valueOf("website"),
      line_url:   valueOf("line_url"),
      line_oa:    valueOf("line_oa"),
      wechat_id:  valueOf("wechat_