/* ============================================================
   天使幸福智慧名片館 form.js
   v8.0.0-unified

   三模式共構版本
   - mode=create  建卡表單（現行功能完整保留）
   - mode=update  更新表單（getCardForUpdate / getUpdateEligibility / updateCardByToken / createUpdateFeePayment）
   - mode=renew   續約表單（getCardForRenewal / getRenewalSummary / createRenewalPayment）

   新增功能：
   - Banner 上傳 + 裁切（create / update 模式）
   - mode 切換控制器
   - 草稿 key 依 mode 分離

   保留 v7.8.4.1 穩定功能：
   - waitAllUploads() pending bug 修正（v7.8.4.1）
   - Firebase lazy import + upload token 防 race condition
   - photo meta 正規化
   - CTA 草稿回填
   - syncPreviewContainerClasses（.preview-theme-scope 掛載）
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

    /* draft key 依 mode 分離，由 getDraftKey() 動態決定 */
    DRAFT_KEY_CREATE:  "hsc_form_create_draft",
    /* update / renew 的 key 由 getDraftKey() 帶入 token / card_id */

    /* GAS actions */
    ACTIONS: {
      createLead:                  "createLead",
      createCard:                  "createCard",
      createCardWithOfflinePayment:"createCardWithOfflinePayment",
      getCardForUpdate:            "getCardForUpdate",
      getUpdateEligibility:        "getUpdateEligibility",
      updateCardByToken:           "updateCardByToken",
      createUpdateFeePayment:      "createUpdateFeePayment",
      getCardForRenewal:           "getCardForRenewal",
      getRenewalSummary:           "getRenewalSummary",
      createRenewalPayment:        "createRenewalPayment"
    },

    BASE_LIMITS: {
      free:    { wallPhotos: 2, ctas: 1, price: 1500, label: "自由搭配" },
      premium: { wallPhotos: 5, ctas: 3, price: 2000, label: "精品設計" }
    },
    ADDON_PRICES: {
      addon_marquee:          300,
      addon_photo:            100,
      addon_cta:              100,
      addon_update_unlimited: 300,
      addon_bundle:           500,
      addon_agent_upgrade:  10000
    },
    RENEW_PRICES: {
      marquee:   300,
      unlimited: 300,
      photo:     100,
      cta:       100
    },
    MAX_WALL_PHOTOS: 10,
    MAX_CTAS: 10,
    DEFAULT_PREVIEW_META: { layout: "grid", aspect_ratio: "1:1", fit_mode: "cover" },
    FIREBASE_MODULE: "./firebase.js",

    /* Banner 裁切輸出尺寸：4:1 比例，符合 style.css .banner height:130px */
    BANNER_OUTPUT_W: 1400,
    BANNER_OUTPUT_H: 350
  };

  const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };

  /* ============================================================
     MODE STATE
  ============================================================ */
  let mode    = "create"; // "create" | "update" | "renew"
  let token   = "";       // update mode
  let cardId  = "";       // renew mode (card_id param)

  /* update 模式從 API 載入的資格資料 */
  let updateEligibility = null;
  /*
    {
      free_limit: 3,
      used_count: 1,
      remaining_count: 2,
      is_unlimited: false,
      charge_required: false,
      charge_amount: 300
    }
  */

  /* renew 模式從 API 載入的摘要 */
  let renewalSummary = null;
  /*
    {
      card_id, customer_name, avatar_url,
      current_plan, current_expires_at,
      renewal_base_price, upgrade_diff,
      has_marquee, has_unlimited
    }
  */

  /* ============================================================
     PHOTO / BANNER STATE
  ============================================================ */
  const state = {
    photoMeta:          { avatar: { ...DEFAULT_PHOTO_META }, logo: { ...DEFAULT_PHOTO_META } },
    photoPreviewUrls:   {},
    photoRealUrls:      {},
    photoFiles:         {},
    photoUploadTokens:  {},
    photoUploadState:   {},
    wallPhotoCount:     0,
    ctaCount:           0,
    lastSubmitResult:   null,
    tempCardId:         null,
    draftValues:        {},

    /* banner */
    bannerPreviewUrl:  null,   // base64 裁切結果
    bannerRealUrl:     null,   // Firebase 上傳後的 URL
    bannerUploadState: "idle", // idle | pending | uploading | done | error
    bannerUploadToken: null
  };

  /* banner crop state */
  const cropState = {
    sourceDataUrl: null,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    rotate: 0,
    dragging: false,
    lastX: 0,
    lastY: 0
  };

  const els = {};
  let _fb = null;

  document.addEventListener("DOMContentLoaded", init);

  /* ============================================================
     初始化
  ============================================================ */
  function init() {
    parseUrlParams();
    collectEls();
    ensureRendererAlias();
    applyModeUI();
    bindStaticEvents();

    if (mode === "create") {
      hydrateQueryParams();
      upgradeExperienceToTextarea();
      restoreDraft();
      ensureDefaultPlan();
      state.tempCardId = "TEMP_" + Date.now();
      refreshAll();
    } else if (mode === "update") {
      upgradeExperienceToTextarea();
      restoreDraft();
      state.tempCardId = "TEMP_" + Date.now();
      loadCardForUpdate();
    } else if (mode === "renew") {
      loadCardForRenewal();
    }
  }

  /* ============================================================
     parseUrlParams
  ============================================================ */
  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search || "");
    const m = params.get("mode") || "create";
    mode    = ["create","update","renew"].includes(m) ? m : "create";
    token   = params.get("token")   || "";
    cardId  = params.get("card_id") || "";
  }

  /* ============================================================
     applyModeUI — 切換頁面文案與 section 顯示
  ============================================================ */
  function applyModeUI() {
    /* hidden field */
    if (els["form-mode"])    els["form-mode"].value    = mode;
    if (els["form-token"])   els["form-token"].value   = token;
    if (els["form-card-id"]) els["form-card-id"].value = cardId;

    /* 頁首文案 */
    const titles = {
      create: { h1: "智慧名片申請表",  desc: "v8.0.0｜填完送出後，系統自動產生成品連結與繳費期限倒數。",  badge: "建卡" },
      update: { h1: "智慧名片更新表",  desc: "v8.0.0｜載入原卡資料後修改，依更新資格決定是否收費。",       badge: "更新" },
      renew:  { h1: "智慧名片續約表",  desc: "v8.0.0｜選擇續約方案與加購項目，送出後建立付款單。",           badge: "續約" }
    };

    const t = titles[mode] || titles.create;
    setText("page-h1",   t.h1);
    setText("page-desc", t.desc);
    if (els["page-title"]) els["page-title"].textContent = `天使幸福智慧名片｜${t.h1}`;

    const badge = els["mode-badge"];
    if (badge) {
      badge.textContent = t.badge;
      badge.className   = `mode-badge ${mode}`;
    }

    /* 送出按鈕文案 */
    const submitLabels = { create: "送出申請", update: "送出更新", renew: "送出續約" };
    setText("btn-submit-form", submitLabels[mode]);

    /* 顯示 / 隱藏 sections by data-mode-show */
    document.querySelectorAll("[data-mode-show]").forEach(el => {
      const modes = (el.getAttribute("data-mode-show") || "").split(",").map(s => s.trim());
      el.classList.toggle("hidden", !modes.includes(mode));
    });

    /* update 模式顯示資格區 */
    els["update-eligibility-section"]?.classList.toggle("hidden", mode !== "update");

    /* renew 模式顯示續約區，隱藏主表單 */
    els["renew-summary-section"]?.classList.toggle("hidden", mode !== "renew");
    if (mode === "renew") {
      const form = document.getElementById("smart-card-form");
      if (form) form.classList.add("hidden");
    }

    /* step kicker 重新編號（update 從 STEP 1 開始，省去 plan 區段） */
    if (mode === "update") {
      setText("step-style-kicker",   "STEP 1");
      setText("step-banner-kicker",  "STEP 2");
      setText("step-basic-kicker",   "STEP 3");
      setText("step-media-kicker",   "STEP 4");
      setText("step-photos-kicker",  "STEP 5");
      setText("step-cta-kicker",     "STEP 6");
      setText("step-marquee-kicker", "STEP 7");
      setText("step-preview-kicker", "STEP 8");
    }

    /* update 模式 preview 提示改文案 */
    if (mode === "update") {
      setText("preview-hint-mode-specific", "送出後依更新資格決定是否需付費。");
    }

    /* progress steps 依 mode 生成 */
    buildProgressSteps();
  }

  function buildProgressSteps() {
    const list = els["progress-steps-list"];
    if (!list) return;
    list.innerHTML = "";

    const steps = {
      create: [
        "1. 等待圖片上傳完成",
        "2. 送出建卡資料",
        "3. 整理報價資料",
        "4. 寫入預覽與繳費資訊",
        "5. 申請完成"
      ],
      update: [
        "1. 等待圖片上傳完成",
        "2. 確認更新資格",
        "3. 送出更新資料",
        "4. 寫入結果",
        "5. 更新完成"
      ],
      renew: [
        "1. 確認續約方案",
        "2. 送出續約申請",
        "3. 整理報價",
        "4. 建立付款單",
        "5. 續約完成"
      ]
    };

    (steps[mode] || steps.create).forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "progress-step";
      li.dataset.step = String(i + 1);
      li.textContent = text;
      list.appendChild(li);
    });
  }

  /* ============================================================
     Firebase lazy import
  ============================================================ */
  async function getFirebase() {
    if (_fb) return _fb;
    try {
      _fb = await import(CONFIG.FIREBASE_MODULE);
      return _fb;
    } catch (err) {
      throw new Error("Firebase 模組載入失敗，請確認 firebase.js 存在於根目錄。");
    }
  }

  /* ============================================================
     getDraftKey
  ============================================================ */
  function getDraftKey() {
    if (mode === "update") return `hsc_form_update_${token || "no_token"}`;
    if (mode === "renew")  return `hsc_form_renew_${cardId || "no_card"}`;
    return CONFIG.DRAFT_KEY_CREATE;
  }

  /* ============================================================
     collectEls
  ============================================================ */
  function collectEls() {
    const ids = [
      "smart-card-form", "form-status-strip",
      "page-title", "page-h1", "page-desc", "mode-badge",
      "btn-open-showcase", "btn-save-draft", "btn-clear-draft",
      "btn-contact-service", "btn-submit-form",
      "btn-gold-info", "btn-gold-copy", "btn-gold-contact",
      "progress-contact-service",

      "form-mode", "form-token", "form-card-id",
      "invite_code", "ref",

      /* update eligibility */
      "update-eligibility-section", "eligibility-card", "eligibility-status-pill",
      "stat-free-limit", "stat-used-count", "stat-remaining",
      "charge-alert", "charge-amount-text",

      /* renew summary */
      "renew-summary-section", "renew-card-preview-section", "renew-settings-section",
      "renew-preview-avatar", "renew-preview-name", "renew-preview-unit",
      "renew-current-plan", "renew-expires-at",
      "renew_keep_marquee", "renew_update_unlimited",
      "renew_photo_extra_qty", "renew_cta_extra_qty",
      "renew-quote-state", "renew-quote-base", "renew-quote-upgrade",
      "renew-quote-addon", "renew-quote-total",
      "renew-free-price", "renew-premium-price",

      /* addon */
      "addon_marquee_enabled", "addon_photo_enabled", "addon_photo_qty",
      "addon_cta_enabled", "addon_cta_qty",
      "addon_update_unlimited_enabled", "addon_bundle_enabled",
      "addon_agent_upgrade_enabled", "addon-photo-tip",

      /* theme */
      "free-theme-group", "premium-theme-group",
      "free_color", "free_style", "free_paper", "premium_color",

      /* banner */
      "banner-upload-board", "banner-file-input", "banner-preview-img",
      "banner-placeholder", "banner-upload-badge", "banner-toolbar",
      "btn-banner-recrop", "btn-banner-clear",
      "banner-crop-overlay", "banner-crop-canvas-wrap", "banner-crop-source",
      "banner-crop-img", "banner-crop-zoom", "banner-crop-rotate",
      "banner-crop-zoom-val", "banner-crop-rotate-val",
      "btn-banner-crop-cancel", "btn-banner-crop-reset", "btn-banner-crop-confirm",

      /* fields */
      "display_name", "unit", "title", "phone", "email", "website",
      "line_url", "line_oa", "wechat_id", "experience", "services",
      "address", "intro",
      "video1", "video2", "video3",
      "social1", "social2", "social3",

      /* marquee */
      "marquee-section", "marquee_text",
      "photo-slots", "cta-slots",
      "livePreviewCard", "preview-theme-scope",

      /* summary / quote (create) */
      "summary-plan-pill", "summary-photo-pill", "summary-cta-pill",
      "summary-plan-name", "summary-photo-count", "summary-cta-count",
      "summary-marquee-status",
      "quote-state-text", "quote-plan-amount", "quote-addon-amount",
      "quote-addon-breakdown", "quote-total-amount",

      /* progress */
      "submit-progress-overlay", "progress-title", "progress-text", "progress-fill",
      "progress-steps-list", "progress-success-panel",
      "progress-card-id-display", "btn-copy-card-notice", "progress-preview-link",
      "success-header-title", "success-header-sub", "success-id-label",
      "success-info-label-1", "success-info-label-2", "success-due-alert",
      "success-footer-note"
    ];

    ids.forEach(id => { els[id] = document.getElementById(id); });

    els.planRadios       = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.targetPlanRadios = Array.from(document.querySelectorAll('input[name="target_plan"]'));
    els.addonCheckboxes  = Array.from(document.querySelectorAll('input[name="addons"]'));
    els.planCards        = Array.from(document.querySelectorAll("[data-plan-card]"));
    els.photoTemplate    = document.getElementById("photo-slot-template");
    els.ctaTemplate      = document.getElementById("cta-slot-template");
  }

  function ensureRendererAlias() {
    if (!window.HSCCardRenderer && window.HscCardRenderer)
      window.HSCCardRenderer = window.HscCardRenderer;
  }

  /* ============================================================
     hydrateQueryParams (create only)
  ============================================================ */
  function hydrateQueryParams() {
    const params = new URLSearchParams(window.location.search || "");
    const ic = params.get("invite_code");
    if (ic && els["invite_code"]) els["invite_code"].value = ic.trim();
    const ref = params.get("ref");
    if (ref && els["ref"]) els["ref"].value = ref.trim();
    const planParam = params.get("plan");
    if (planParam === "free" || planParam === "premium") {
      const r = document.querySelector(`input[name="plan"][value="${planParam}"]`);
      if (r) r.checked = true;
    }
  }

  /* ============================================================
     upgradeExperienceToTextarea
  ============================================================ */
  function upgradeExperienceToTextarea() {
    const old = document.getElementById("experience");
    if (!old || old.tagName === "TEXTAREA" || old.dataset.upgraded === "1") return;
    const existingValue = old.value || "";
    const parent = old.parentNode;
    const ta = document.createElement("textarea");
    ta.id = "experience"; ta.rows = 4;
    ta.placeholder = "例：前 XX 公司品牌顧問、10 年業界資歷\n可換行填寫多段經歷";
    ta.style.cssText = "resize:vertical;min-height:96px;";
    ta.value = existingValue;
    ta.dataset.upgraded = "1";
    const hint = document.createElement("p");
    hint.className = "field-hint experience-hint";
    hint.textContent = "可換行填寫多段經歷，系統自動整理排版。";
    parent.insertBefore(ta, old);
    parent.removeChild(old);
    if (!parent.querySelector(".experience-hint")) parent.appendChild(hint);
    els["experience"] = ta;
    ta.addEventListener("input", onLiveChange);
    ta.addEventListener("change", onLiveChange);
  }

  /* ============================================================
     bindStaticEvents
  ============================================================ */
  function bindStaticEvents() {
    if (mode !== "renew") {
      els["smart-card-form"]?.addEventListener("submit", handleSubmit);
    } else {
      /* renew 有自己的送出按鈕 */
      els["btn-submit-form"]?.addEventListener("click", handleRenewSubmit);
    }

    els.planRadios.forEach(r => r.addEventListener("change", refreshAll));
    els.addonCheckboxes.forEach(b => b.addEventListener("change", refreshAll));

    ["addon_photo_qty","addon_cta_qty"].forEach(id => {
      els[id]?.addEventListener("input", refreshAll);
      els[id]?.addEventListener("change", refreshAll);
    });

    const liveFields = [
      "free_color","free_style","free_paper","premium_color",
      "display_name","unit","title","phone","email","website",
      "line_url","line_oa","wechat_id","experience","services",
      "address","intro","marquee_text",
      "video1","video2","video3","social1","social2","social3"
    ];
    liveFields.forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input", onLiveChange);
        els[id].addEventListener("change", onLiveChange);
      }
    });

    /* renew 動態計算 */
    els.targetPlanRadios.forEach(r => r.addEventListener("change", refreshRenewQuote));
    ["renew_keep_marquee","renew_update_unlimited"].forEach(id => {
      els[id]?.addEventListener("change", refreshRenewQuote);
    });
    ["renew_photo_extra_qty","renew_cta_extra_qty"].forEach(id => {
      els[id]?.addEventListener("input", refreshRenewQuote);
      els[id]?.addEventListener("change", refreshRenewQuote);
    });

    /* buttons */
    bindBtn("btn-open-showcase",        () => window.open(CONFIG.SHOWCASE_URL, "_blank", "noopener"));
    bindBtn("btn-contact-service",      () => window.open(CONFIG.SERVICE_URL,  "_blank", "noopener"));
    bindBtn("progress-contact-service", () => window.open(CONFIG.SERVICE_URL,  "_blank", "noopener"));
    bindBtn("btn-gold-contact",         () => window.open(CONFIG.SERVICE_URL,  "_blank", "noopener"));
    bindBtn("btn-gold-info",            () => alert("金牌級會員請聯繫客服瞭解完整權益。"));
    bindBtn("btn-save-draft",  () => { saveDraft(); setStatus("草稿已暫存。"); });
    bindBtn("btn-clear-draft", clearDraft);
    bindBtn("btn-gold-copy", async () => {
      await copyText("您好，我想瞭解金牌級會員的完整權益與適合方案。");
      setStatus("已複製金牌會員詢問文案。");
    });
    bindBtn("btn-copy-card-notice", handleCopyCardNotice);

    /* banner */
    bindBannerEvents();
  }

  function bindBtn(id, fn) {
    const el = els[id] || document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  function onLiveChange() { updatePreview(); saveDraftSilently(); }

  /* ============================================================
     ── BANNER UPLOAD & CROP ──
  ============================================================ */
  function bindBannerEvents() {
    const board = els["banner-upload-board"];
    if (!board) return;

    board.addEventListener("click", () => els["banner-file-input"]?.click());
    board.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") els["banner-file-input"]?.click();
    });

    els["banner-file-input"]?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file) return;
      openBannerCrop(file);
    });

    bindBtn("btn-banner-recrop", () => els["banner-file-input"]?.click());
    bindBtn("btn-banner-clear",  clearBanner);

    /* crop overlay controls */
    bindBtn("btn-banner-crop-cancel",  closeBannerCrop);
    bindBtn("btn-banner-crop-reset",   resetBannerCrop);
    bindBtn("btn-banner-crop-confirm", confirmBannerCrop);

    els["banner-crop-zoom"]?.addEventListener("input", () => {
      cropState.zoom = parseFloat(els["banner-crop-zoom"].value);
      if (els["banner-crop-zoom-val"])
        els["banner-crop-zoom-val"].textContent = Math.round(cropState.zoom * 100) + "%";
      renderCropPreview();
    });

    els["banner-crop-rotate"]?.addEventListener("input", () => {
      cropState.rotate = parseInt(els["banner-crop-rotate"].value);
      if (els["banner-crop-rotate-val"])
        els["banner-crop-rotate-val"].textContent = cropState.rotate + "°";
      renderCropPreview();
    });

    /* drag interaction */
    const source = els["banner-crop-source"];
    if (source) {
      source.addEventListener("mousedown", onCropDragStart);
      source.addEventListener("touchstart", onCropDragStart, { passive: false });
      window.addEventListener("mousemove", onCropDragMove);
      window.addEventListener("touchmove",  onCropDragMove, { passive: false });
      window.addEventListener("mouseup",  onCropDragEnd);
      window.addEventListener("touchend", onCropDragEnd);
    }
  }

  function openBannerCrop(file) {
    const reader = new FileReader();
    reader.onload = e => {
      cropState.sourceDataUrl = e.target.result;
      cropState.offsetX = 0;
      cropState.offsetY = 0;
      cropState.zoom = 1;
      cropState.rotate = 0;

      const img = els["banner-crop-img"];
      if (img) img.src = cropState.sourceDataUrl;

      if (els["banner-crop-zoom"])  els["banner-crop-zoom"].value = "1";
      if (els["banner-crop-rotate"]) els["banner-crop-rotate"].value = "0";
      if (els["banner-crop-zoom-val"])   els["banner-crop-zoom-val"].textContent  = "100%";
      if (els["banner-crop-rotate-val"]) els["banner-crop-rotate-val"].textContent = "0°";

      els["banner-crop-overlay"]?.classList.remove("hidden");

      /* wait for img to load before centering */
      img.onload = () => {
        renderCropPreview();
      };
    };
    reader.readAsDataURL(file);
  }

  function closeBannerCrop() {
    els["banner-crop-overlay"]?.classList.add("hidden");
  }

  function resetBannerCrop() {
    cropState.offsetX = 0;
    cropState.offsetY = 0;
    cropState.zoom = 1;
    cropState.rotate = 0;
    if (els["banner-crop-zoom"])  els["banner-crop-zoom"].value = "1";
    if (els["banner-crop-rotate"]) els["banner-crop-rotate"].value = "0";
    if (els["banner-crop-zoom-val"])   els["banner-crop-zoom-val"].textContent  = "100%";
    if (els["banner-crop-rotate-val"]) els["banner-crop-rotate-val"].textContent = "0°";
    renderCropPreview();
  }

  function renderCropPreview() {
    const img = els["banner-crop-img"];
    if (!img || !cropState.sourceDataUrl) return;
    img.style.transform =
      `translate(${cropState.offsetX}px, ${cropState.offsetY}px) ` +
      `scale(${cropState.zoom}) rotate(${cropState.rotate}deg)`;
  }

  function onCropDragStart(e) {
    e.preventDefault();
    cropState.dragging = true;
    const pt = e.touches ? e.touches[0] : e;
    cropState.lastX = pt.clientX;
    cropState.lastY = pt.clientY;
  }

  function onCropDragMove(e) {
    if (!cropState.dragging) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    cropState.offsetX += pt.clientX - cropState.lastX;
    cropState.offsetY += pt.clientY - cropState.lastY;
    cropState.lastX = pt.clientX;
    cropState.lastY = pt.clientY;
    renderCropPreview();
  }

  function onCropDragEnd() {
    cropState.dragging = false;
  }

  async function confirmBannerCrop() {
    if (!cropState.sourceDataUrl) return;

    /* 用 OffscreenCanvas / Canvas 裁切 */
    const canvas = document.createElement("canvas");
    canvas.width  = CONFIG.BANNER_OUTPUT_W;
    canvas.height = CONFIG.BANNER_OUTPUT_H;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = cropState.sourceDataUrl;
    await new Promise(r => { img.onload = r; });

    /* 計算 canvas 中心 */
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    /* crop source 容器實際像素大小 */
    const wrap = els["banner-crop-canvas-wrap"];
    const wrapW = wrap ? wrap.clientWidth  : 640;
    const wrapH = wrap ? wrap.clientHeight : 160;

    /* 縮放比：輸出尺寸 vs 容器顯示尺寸 */
    const scaleX = canvas.width  / wrapW;
    const scaleY = canvas.height / wrapH;

    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(cx, cy);
    ctx.rotate(cropState.rotate * Math.PI / 180);
    ctx.scale(cropState.zoom, cropState.zoom);
    ctx.translate(cropState.offsetX * scaleX, cropState.offsetY * scaleY);
    /* 以圖片中心為原點繪製 */
    ctx.drawImage(img,
      -img.naturalWidth  / 2,
      -img.naturalHeight / 2,
       img.naturalWidth,
       img.naturalHeight
    );
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    state.bannerPreviewUrl  = dataUrl;
    state.bannerRealUrl     = null;
    state.bannerUploadState = "pending";

    /* 顯示預覽 */
    const previewImg = els["banner-preview-img"];
    if (previewImg) {
      previewImg.src = dataUrl;
      previewImg.classList.add("visible");
    }
    els["banner-placeholder"]?.classList.add("hidden");

    const boardEl = els["banner-upload-board"];
    if (boardEl) boardEl.classList.add("has-image");

    const toolbar = els["banner-toolbar"];
    if (toolbar) toolbar.style.display = "flex";

    updateBannerBadge("pending", "準備上傳…");
    closeBannerCrop();
    updatePreview();
    saveDraftSilently();

    /* 轉 File 上傳 */
    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], "banner.jpg", { type: "image/jpeg" });
      await uploadBannerToFirebase(file);
    }, "image/jpeg", 0.92);
  }

  function clearBanner() {
    state.bannerPreviewUrl  = null;
    state.bannerRealUrl     = null;
    state.bannerUploadState = "idle";

    const previewImg = els["banner-preview-img"];
    if (previewImg) {
      previewImg.src = "";
      previewImg.classList.remove("visible");
    }
    els["banner-placeholder"]?.classList.remove("hidden");
    els["banner-upload-board"]?.classList.remove("has-image");
    const toolbar = els["banner-toolbar"];
    if (toolbar) toolbar.style.display = "none";

    updateBannerBadge("idle", "尚未上傳");
    updatePreview();
    saveDraftSilently();

    /* reset file input */
    if (els["banner-file-input"]) els["banner-file-input"].value = "";
  }

  function updateBannerBadge(uploadState, text) {
    const badge = els["banner-upload-badge"];
    if (!badge) return;
    badge.textContent = text;
    badge.dataset.uploadState = uploadState;
  }

  async function uploadBannerToFirebase(file) {
    const token_inner = Date.now() + "_b";
    state.bannerUploadToken = token_inner;
    state.bannerUploadState = "uploading";
    updateBannerBadge("uploading", "上傳中…");
    try {
      const fb = await getFirebase();
      await fb.ensureAuth();
      const url = await fb.uploadImage(state.tempCardId || "TEMP", file, "banner.jpg");
      if (state.bannerUploadToken !== token_inner) return;
      state.bannerRealUrl     = url;
      state.bannerUploadState = "done";
      updateBannerBadge("done", "已上傳 ✓");
    } catch (err) {
      if (state.bannerUploadToken !== token_inner) return;
      state.bannerUploadState = "error";
      updateBannerBadge("error", "上傳失敗");
      setStatus("Banner 上傳失敗：" + err.message, "error");
    }
  }

  async function waitBannerUpload() {
    if (!state.bannerPreviewUrl) return; // 沒有 banner 不阻擋
    if (state.bannerUploadState === "done") return;
    if (state.bannerUploadState === "error")
      throw new Error("Banner 上傳失敗，請重新選取後再送出。");

    await new Promise((resolve, reject) => {
      const start = Date.now();
      const check = setInterval(() => {
        const s = state.bannerUploadState;
        if (s === "done")  { clearInterval(check); resolve(); return; }
        if (s === "error") { clearInterval(check); reject(new Error("Banner 上傳失敗。")); return; }
        if (Date.now() - start > 30000) { clearInterval(check); reject(new Error("Banner 上傳逾時。")); }
      }, 300);
    });
  }

  /* ============================================================
     ── UPDATE MODE：載入卡片 & 資格 ──
  ============================================================ */
  async function loadCardForUpdate() {
    if (!token) {
      setStatus("缺少更新 token，請確認網址是否正確。", "error");
      return;
    }
    setStatus("正在載入卡片資料與更新資格…", "info");
    try {
      const [cardData, eligibilityData] = await Promise.all([
        callGAS({ action: CONFIG.ACTIONS.getCardForUpdate, token }),
        callGAS({ action: CONFIG.ACTIONS.getUpdateEligibility, token })
      ]);

      if (!cardData.ok) throw new Error(cardData.error || "載入卡片資料失敗");
      if (!eligibilityData.ok) throw new Error(eligibilityData.error || "載入更新資格失敗");

      updateEligibility = eligibilityData.eligibility || eligibilityData.data || eligibilityData;
      fillFormFromCard(cardData.card || cardData.data || cardData);
      renderEligibilityUI(updateEligibility);
      setStatus("卡片資料已載入，請確認內容後送出更新。", "success");
      refreshAll();
    } catch (err) {
      setStatus("載入失敗：" + err.message, "error");
    }
  }

  function fillFormFromCard(card) {
    if (!card) return;
    const fields = [
      "display_name","unit","title","phone","email","website",
      "line_url","line_oa","wechat_id","services","address","intro",
      "video1","video2","video3","social1","social2","social3","marquee_text"
    ];
    fields.forEach(id => {
      const el = document.getElementById(id) || els[id];
      if (el && card[id] !== undefined) el.value = card[id] || "";
    });

    /* experience 需等 upgrade 完再填 */
    const expEl = document.getElementById("experience") || els["experience"];
    if (expEl && card.experience) expEl.value = card.experience;

    /* plan / theme */
    const plan = card.plan || "premium";
    const planR = document.querySelector(`input[name="plan"][value="${plan}"]`);
    if (planR) planR.checked = true;

    if (plan === "free") {
      if (els["free_color"] && card.color) els["free_color"].value = card.color;
      if (els["free_style"] && card.style) els["free_style"].value = card.style;
      if (els["free_paper"] && card.paper) els["free_paper"].value = card.paper;
    } else {
      if (els["premium_color"] && card.color) els["premium_color"].value = card.color;
    }

    /* photo urls 回填 (for preview) */
    if (card.avatar_url) {
      state.photoPreviewUrls.avatar = card.avatar_url;
      state.photoRealUrls.avatar    = card.avatar_url;
    }
    if (card.logo_url) {
      state.photoPreviewUrls.logo = card.logo_url;
      state.photoRealUrls.logo    = card.logo_url;
    }
    for (let i = 1; i <= 10; i++) {
      const u = card[`photo${i}_url`] || card[`photo_url_${i}`] || "";
      if (u) {
        state.photoPreviewUrls[`photo${i}`] = u;
        state.photoRealUrls[`photo${i}`]    = u;
      }
    }

    /* banner */
    if (card.banner_url) {
      state.bannerRealUrl     = card.banner_url;
      state.bannerPreviewUrl  = card.banner_url;
      state.bannerUploadState = "done";
      const previewImg = els["banner-preview-img"];
      if (previewImg) {
        previewImg.src = card.banner_url;
        previewImg.classList.add("visible");
      }
      els["banner-placeholder"]?.classList.add("hidden");
      els["banner-upload-board"]?.classList.add("has-image");
      const toolbar = els["banner-toolbar"];
      if (toolbar) toolbar.style.display = "flex";
      updateBannerBadge("done", "已上傳 ✓");
    }

    /* CTA */
    for (let i = 1; i <= 10; i++) {
      const t = card[`cta_text_${i}`] || "";
      const u = card[`cta_link_${i}`] || "";
      if (t || u) {
        state.draftValues[`cta_text_${i}`] = t;
        state.draftValues[`cta_link_${i}`] = u;
      }
    }

    /* marquee */
    const marqueeEnabled = card.marquee_enabled === "true" || card.marquee_enabled === true;
    if (marqueeEnabled) {
      const marqCb = document.querySelector('input[name="addons"][value="addon_marquee"]');
      if (marqCb) marqCb.checked = true;
    }

    /* card_id 存入 hidden field */
    if (card.card_id || card.id) {
      const cid = card.card_id || card.id;
      cardId = cid;
      if (els["form-card-id"]) els["form-card-id"].value = cid;
    }
  }

  function renderEligibilityUI(elig) {
    if (!elig) return;
    const el = els["eligibility-card"];
    const pill = els["eligibility-status-pill"];
    const chargeAlert = els["charge-alert"];
    const chargeAmtText = els["charge-amount-text"];

    setText("stat-free-limit", elig.is_unlimited ? "∞" : String(elig.free_limit ?? 3));
    setText("stat-used-count", String(elig.used_count ?? 0));
    setText("stat-remaining",  elig.is_unlimited ? "∞" : String(elig.remaining_count ?? 0));

    if (elig.charge_required) {
      el?.classList.add("charge-required");
      el?.classList.remove("charge-free");
      if (pill) { pill.textContent = "本次需付費"; pill.style.background = "#fff7ec"; pill.style.color = "#8b5b16"; }
      chargeAlert?.classList.remove("hidden");
      if (chargeAmtText) chargeAmtText.textContent = `NT$ ${elig.charge_amount || 300}`;
    } else {
      el?.classList.add("charge-free");
      el?.classList.remove("charge-required");
      if (pill) { pill.textContent = elig.is_unlimited ? "無限更新" : "免費更新"; pill.style.background = "rgba(6,166,106,.12)"; pill.style.color = "#0a7a4e"; }
      chargeAlert?.classList.add("hidden");
    }
  }

  /* ============================================================
     ── RENEW MODE：載入卡片 & 摘要 ──
  ============================================================ */
  async function loadCardForRenewal() {
    if (!cardId) {
      setStatus("缺少名片 ID，請確認網址是否正確。", "error");
      return;
    }
    setStatus("正在載入卡片資料…", "info");
    try {
      const [cardData, summaryData] = await Promise.all([
        callGAS({ action: CONFIG.ACTIONS.getCardForRenewal, card_id: cardId }),
        callGAS({ action: CONFIG.ACTIONS.getRenewalSummary, card_id: cardId })
      ]);

      if (!cardData.ok) throw new Error(cardData.error || "載入卡片資料失敗");
      if (!summaryData.ok) throw new Error(summaryData.error || "載入續約摘要失敗");

      renewalSummary = summaryData.summary || summaryData.data || summaryData;
      renderRenewalUI(cardData.card || cardData.data, renewalSummary);
      setStatus("卡片資料已載入，請確認續約方案後送出。", "success");
    } catch (err) {
      setStatus("載入失敗：" + err.message, "error");
    }
  }

  function renderRenewalUI(card, summary) {
    if (!card && !summary) return;
    const data = summary || card || {};

    /* 名片摘要 */
    const avatarEl = els["renew-preview-avatar"];
    if (avatarEl && data.avatar_url) avatarEl.src = data.avatar_url;

    setText("renew-preview-name", data.customer_name || data.name || "—");
    setText("renew-preview-unit", data.unit || "—");
    setText("renew-current-plan", data.current_plan === "premium" ? "精品設計" : "自由搭配");
    setText("renew-expires-at",   formatDateYMD(data.current_expires_at) || "—");

    /* 預設選目前方案 */
    const curPlan = data.current_plan || "premium";
    const targetR = document.querySelector(`input[name="target_plan"][value="${curPlan}"]`);
    if (targetR) targetR.checked = true;

    /* 若已有跑馬燈，預設勾選保留 */
    if (data.has_marquee) {
      const cb = els["renew_keep_marquee"];
      if (cb) cb.checked = true;
    }

    /* 價格顯示 */
    if (data.renewal_base_free !== undefined) {
      setText("renew-free-price",    `NT$ ${data.renewal_base_free || 1500}`);
      setText("renew-premium-price", `NT$ ${data.renewal_base_premium || 2000}`);
    }

    renewalSummary = { ...renewalSummary, ...data };
    refreshRenewQuote();
  }

  function refreshRenewQuote() {
    const targetPlan = (document.querySelector('input[name="target_plan"]:checked') || {}).value || "free";
    const currentPlan = renewalSummary?.current_plan || "free";

    const baseFree    = parseInt(renewalSummary?.renewal_base_free    || 1500);
    const basePremium = parseInt(renewalSummary?.renewal_base_premium || 2000);
    const basePrice   = targetPlan === "premium" ? basePremium : baseFree;

    /* upgrade diff：僅 free→premium 才有 */
    const upgradeDiff = (currentPlan === "free" && targetPlan === "premium")
      ? (parseInt(renewalSummary?.upgrade_diff || 0))
      : 0;

    let addonAmount = 0;
    const keepMarquee    = els["renew_keep_marquee"]?.checked;
    const keepUnlimited  = els["renew_update_unlimited"]?.checked;
    const photoExtraQty  = parseInt(els["renew_photo_extra_qty"]?.value || 0);
    const ctaExtraQty    = parseInt(els["renew_cta_extra_qty"]?.value   || 0);

    if (keepMarquee)            addonAmount += CONFIG.RENEW_PRICES.marquee;
    if (keepUnlimited)          addonAmount += CONFIG.RENEW_PRICES.unlimited;
    if (photoExtraQty > 0)      addonAmount += photoExtraQty * CONFIG.RENEW_PRICES.photo;
    if (ctaExtraQty > 0)        addonAmount += ctaExtraQty   * CONFIG.RENEW_PRICES.cta;

    const total = basePrice + upgradeDiff + addonAmount;

    setText("renew-quote-state",   `${targetPlan === "premium" ? "精品設計" : "自由搭配"}｜${money(total)}`);
    setText("renew-quote-base",    money(basePrice));
    setText("renew-quote-upgrade", money(upgradeDiff));
    setText("renew-quote-addon",   money(addonAmount));
    setText("renew-quote-total",   money(total));
  }

  /* ============================================================
     waitAllUploads v7.8.4.1（保留修正邏輯）
  ============================================================ */
  async function waitAllUploads() {
    for (const key of Object.keys(state.photoUploadState)) {
      const s       = state.photoUploadState[key];
      const hasFile = !!state.photoFiles[key];
      if (!hasFile) continue;

      if (s === "pending" || s === "uploading") {
        await new Promise((resolve, reject) => {
          const start = Date.now();
          const check = setInterval(() => {
            const cur = state.photoUploadState[key];
            if (cur === "done")  { clearInterval(check); resolve(); return; }
            if (cur === "error") { clearInterval(check); reject(new Error(`圖片上傳失敗：${key}`)); return; }
            if (Date.now() - start > 30000) { clearInterval(check); reject(new Error(`圖片上傳逾時：${key}`)); }
          }, 300);
        });
      }

      if (state.photoUploadState[key] === "error")
        throw new Error(`圖片 ${key} 上傳失敗，請重新選取後再送出。`);
    }

    await waitBannerUpload();
  }

  /* ============================================================
     Firebase 圖片上傳
  ============================================================ */
  async function uploadPhotoToFirebase(key, file) {
    const token_inner = Date.now() + "_" + Math.random().toString(36).slice(2);
    state.photoUploadTokens[key] = token_inner;
    state.photoUploadState[key]  = "uploading";
    updateUploadBadge(key, "uploading", "上傳中…");
    try {
      const fb = await getFirebase();
      await fb.ensureAuth();
      const url = await fb.uploadImage(state.tempCardId, file, `${key}.jpg`);
      if (state.photoUploadTokens[key] !== token_inner) return;
      state.photoRealUrls[key]    = url;
      state.photoUploadState[key] = "done";
      updateUploadBadge(key, "done", "已上傳 ✓");
      return url;
    } catch (err) {
      if (state.photoUploadTokens[key] !== token_inner) return;
      state.photoUploadState[key] = "error";
      updateUploadBadge(key, "error", "上傳失敗");
      throw err;
    }
  }

  function updateUploadBadge(key, uploadState, text) {
    document.querySelectorAll("[data-photo-key]").forEach(card => {
      if (card.dataset.photoKey !== key) return;
      const badge = card.querySelector(".badge");
      if (!badge) return;
      badge.textContent = text;
      badge.dataset.uploadState = uploadState;
    });
  }

  /* ============================================================
     ── SUBMIT HANDLERS ──
  ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === "create") await submitCreate();
    else if (mode === "update") await submitUpdate();
  }

  async function handleRenewSubmit() {
    await submitRenew();
  }

  /* ── CREATE ── */
  async function submitCreate() {
    const payload = buildCreatePayload();
    if (!payload.name || !String(payload.phone || "").trim() || !payload.plan) {
      setStatus("請先完成必填欄位（姓名、電話、方案）。", "error");
      return;
    }
    if (!validateBeforeSubmit()) return;

    const limits      = getLimits();
    const addonItems  = getAddonItemsForQuote(limits);
    const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalAmount = limits.planPrice + addonAmount;

    showProgress(true, "資料送出中");
    hideSuccessPanel();
    setProgressStep(1, "正在等待圖片上傳完成…");

    try {
      await waitAllUploads();
      setProgressStep(2, "正在送出建卡資料…");
      const finalPayload = buildCreatePayload();
      const data = await callGAS(finalPayload);
      if (!data || !data.ok) throw new Error(data?.error || data?.message || "建立名片失敗");

      setProgressStep(3, "正在整理報價資料…");
      const cid = extractCardId(data);
      const previewUrl   = cid ? `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cid)}&view=1` : CONFIG.SHOWCASE_URL;
      const paymentDueAt = pickPaymentDueAt(data);

      setProgressStep(4, "正在寫入報價與預覽資料…");
      const result = buildLastSubmitResult({ cardId: cid, previewUrl, paymentDueAt, totalAmount, planLabel: limits.planLabel, customerName: finalPayload.name });
      state.lastSubmitResult = result;

      localStorage.setItem(CONFIG.QUOTE_STORAGE_KEY, JSON.stringify({
        card_id: cid, customer_name: finalPayload.name || "",
        plan_name: limits.planLabel, submitted_at: new Date().toISOString(),
        payment_notice: "請於 3 天內完成付款",
        payment_due_at: paymentDueAt, preview_url: previewUrl,
        plan_amount: Number(limits.planPrice || 0),
        addon_items: addonItems, addon_amount: Number(addonAmount || 0),
        total_amount: Number(totalAmount || 0)
      }));

      localStorage.removeItem(getDraftKey());
      setProgressStep(5, "✅ 申請成功！名片已建立。");
      showSuccessPanel(result, "create");
    } catch (err) {
      setStatus("送出失敗：" + err.message, "error");
      showProgress(false);
    }
  }

  /* ── UPDATE ── */
  async function submitUpdate() {
    if (!token) { setStatus("缺少更新 token。", "error"); return; }
    if (!validateBeforeSubmit()) return;

    showProgress(true, "更新資料送出中");
    hideSuccessPanel();
    setProgressStep(1, "正在等待圖片上傳完成…");

    try {
      await waitAllUploads();
      setProgressStep(2, "確認更新資格…");

      const elig = updateEligibility || {};
      const chargeRequired = elig.charge_required || false;
      const chargeAmount   = elig.charge_amount   || 300;

      const finalPayload = buildUpdatePayload();

      if (!chargeRequired) {
        setProgressStep(3, "正在送出更新資料…");
        const data = await callGAS({ ...finalPayload, action: CONFIG.ACTIONS.updateCardByToken });
        if (!data || !data.ok) throw new Error(data?.error || "更新失敗");
        setProgressStep(4, "寫入結果…");
        setProgressStep(5, "✅ 更新成功！");
        const result = buildLastSubmitResult({
          cardId: cardId || finalPayload.card_id,
          previewUrl: finalPayload.card_id ? `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(finalPayload.card_id)}&view=1` : CONFIG.SHOWCASE_URL,
          paymentDueAt: null,
          totalAmount: 0,
          planLabel: "更新完成",
          customerName: finalPayload.name
        });
        state.lastSubmitResult = result;
        showSuccessPanel(result, "update");
      } else {
        setProgressStep(3, "正在建立付款單…");
        const data = await callGAS({ action: CONFIG.ACTIONS.createUpdateFeePayment, token, card_id: cardId });
        if (!data || !data.ok) throw new Error(data?.error || "建立付款單失敗");
        const paymentDueAt = pickPaymentDueAt(data);
        setProgressStep(5, "✅ 付款單建立成功！");
        const result = buildLastSubmitResult({
          cardId: cardId,
          previewUrl: CONFIG.SHOWCASE_URL,
          paymentDueAt,
          totalAmount: chargeAmount,
          planLabel: "更新付款",
          customerName: finalPayload.name
        });
        state.lastSubmitResult = result;
        showSuccessPanel(result, "update_charge");
      }

      localStorage.removeItem(getDraftKey());
    } catch (err) {
      setStatus("送出失敗：" + err.message, "error");
      showProgress(false);
    }
  }

  /* ── RENEW ── */
  async function submitRenew() {
    if (!cardId) { setStatus("缺少名片 ID。", "error"); return; }

    const targetPlan  = (document.querySelector('input[name="target_plan"]:checked') || {}).value;
    if (!targetPlan) { setStatus("請選擇續約方案。", "error"); return; }

    showProgress(true, "續約資料送出中");
    hideSuccessPanel();
    setProgressStep(1, "確認續約方案…");

    try {
      const payload = buildRenewPayload();
      setProgressStep(2, "正在送出續約申請…");
      const data = await callGAS(payload);
      if (!data || !data.ok) throw new Error(data?.error || "續約失敗");

      setProgressStep(3, "整理報價…");
      setProgressStep(4, "建立付款單…");
      const paymentDueAt = pickPaymentDueAt(data);
      const renewalId    = data.renewal_id || data.id || "";
      const paymentId    = data.payment_id || "";

      setProgressStep(5, "✅ 續約成功！");

      const totalEl = document.getElementById("renew-quote-total");
      const totalStr = totalEl ? totalEl.textContent.replace(/[^0-9]/g,"") : "0";
      const totalAmount = parseInt(totalStr) || 0;

      const result = buildLastSubmitResult({
        cardId: renewalId || cardId,
        previewUrl: CONFIG.SHOWCASE_URL,
        paymentDueAt,
        totalAmount,
        planLabel: targetPlan === "premium" ? "精品設計續約" : "自由搭配續約",
        customerName: renewalSummary?.customer_name || ""
      });
      state.lastSubmitResult = result;
      showSuccessPanel(result, "renew");
    } catch (err) {
      setStatus("送出失敗：" + err.message, "error");
      showProgress(false);
    }
  }

  /* ============================================================
     buildPayloads
  ============================================================ */
  function buildCreatePayload() {
    const limits      = getLimits();
    const theme       = getThemeSelection();
    const addonItems  = getAddonItemsForQuote(limits);
    const bundleChecked  = isAddonChecked("addon_bundle");
    const marqueeChecked = isAddonChecked("addon_marquee");

    const payload = {
      action: CONFIG.ACTIONS.createCardWithOfflinePayment,
      tenant: "angel",
      name:       valueOf("display_name"),
      unit:       valueOf("unit"),
      title:      valueOf("title"),
      slogan:     valueOf("intro"),
      phone:      String(valueOf("phone") || "").replace(/\s/g,""),
      email:      valueOf("email"),
      website:    valueOf("website"),
      address:    valueOf("address"),
      line_url:   valueOf("line_url"),
      line_oa:    valueOf("line_oa"),
      wechat_id:  valueOf("wechat_id"),
      experience: valueOf("experience"),
      services:   valueOf("services"),
      video1: valueOf("video1"), video2: valueOf("video2"), video3: valueOf("video3"),
      social1: valueOf("social1"), social2: valueOf("social2"), social3: valueOf("social3"),
      invite_code: valueOf("invite_code"),
      referrer:    valueOf("ref"),
      plan:  theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,
      marquee_text:      isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled:   isMarqueeEnabled() ? "true" : "",
      marquee_purchased: (marqueeChecked || bundleChecked) ? "1" : "",
      photo_limit: limits.wallPhotos,
      cta_limit:   limits.ctas,
      photo_extra_purchased: isAddonChecked("addon_photo") ? String(getAddonQty("addon_photo_qty")) : "",
      cta_extra_purchased:   isAddonChecked("addon_cta")   ? String(getAddonQty("addon_cta_qty"))   : "",
      ...(state.photoRealUrls.avatar ? { avatar_url: state.photoRealUrls.avatar } : {}),
      ...(state.photoRealUrls.logo   ? { logo_url:   state.photoRealUrls.logo   } : {}),
      ...(state.bannerRealUrl        ? { banner_url:  state.bannerRealUrl        } : {}),
      addon_items: addonItems,
      features_json: {
        photo_meta:   buildPhotoMetaMap(),
        preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan }
      }
    };

    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoRealUrls[`photo${i}`] || "";
      if (url) { payload[`photo${i}_url`] = url; payload[`photo_url_${i}`] = url; }
    }
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return payload;
  }

  function buildUpdatePayload() {
    const limits  = getLimits();
    const theme   = getThemeSelection();
    const payload = {
      action: CONFIG.ACTIONS.updateCardByToken,
      token,
      card_id: cardId,
      name:       valueOf("display_name"),
      unit:       valueOf("unit"),
      title:      valueOf("title"),
      slogan:     valueOf("intro"),
      phone:      String(valueOf("phone") || "").replace(/\s/g,""),
      email:      valueOf("email"),
      website:    valueOf("website"),
      address:    valueOf("address"),
      line_url:   valueOf("line_url"),
      line_oa:    valueOf("line_oa"),
      wechat_id:  valueOf("wechat_id"),
      experience: valueOf("experience"),
      services:   valueOf("services"),
      video1: valueOf("video1"), video2: valueOf("video2"), video3: valueOf("video3"),
      social1: valueOf("social1"), social2: valueOf("social2"), social3: valueOf("social3"),
      plan:  theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,
      marquee_text:    isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",
      photo_limit: limits.wallPhotos,
      cta_limit:   limits.ctas,
      ...(state.photoRealUrls.avatar ? { avatar_url: state.photoRealUrls.avatar } : {}),
      ...(state.photoRealUrls.logo   ? { logo_url:   state.photoRealUrls.logo   } : {}),
      ...(state.bannerRealUrl        ? { banner_url:  state.bannerRealUrl        } : {}),
      features_json: {
        photo_meta:   buildPhotoMetaMap(),
        preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan }
      }
    };
    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoRealUrls[`photo${i}`] || "";
      if (url) { payload[`photo${i}_url`] = url; payload[`photo_url_${i}`] = url; }
    }
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return payload;
  }

  function buildRenewPayload() {
    const targetPlan     = (document.querySelector('input[name="target_plan"]:checked') || {}).value || "free";
    const keepMarquee    = !!els["renew_keep_marquee"]?.checked;
    const keepUnlimited  = !!els["renew_update_unlimited"]?.checked;
    const photoExtraQty  = parseInt(els["renew_photo_extra_qty"]?.value || 0);
    const ctaExtraQty    = parseInt(els["renew_cta_extra_qty"]?.value   || 0);

    /* calc total */
    const currentPlan = renewalSummary?.current_plan || "free";
    const baseFree    = parseInt(renewalSummary?.renewal_base_free    || 1500);
    const basePremium = parseInt(renewalSummary?.renewal_base_premium || 2000);
    const basePrice   = targetPlan === "premium" ? basePremium : baseFree;
    const upgradeDiff = (currentPlan === "free" && targetPlan === "premium") ? parseInt(renewalSummary?.upgrade_diff || 0) : 0;
    let addonAmount = 0;
    if (keepMarquee)       addonAmount += CONFIG.RENEW_PRICES.marquee;
    if (keepUnlimited)     addonAmount += CONFIG.RENEW_PRICES.unlimited;
    if (photoExtraQty > 0) addonAmount += photoExtraQty * CONFIG.RENEW_PRICES.photo;
    if (ctaExtraQty > 0)   addonAmount += ctaExtraQty   * CONFIG.RENEW_PRICES.cta;
    const totalAmount = basePrice + upgradeDiff + addonAmount;

    return {
      action: CONFIG.ACTIONS.createRenewalPayment,
      tenant: "angel",
      card_id: cardId,
      current_plan:          renewalSummary?.current_plan || "free",
      target_plan:           targetPlan,
      keep_marquee:          keepMarquee   ? "1" : "",
      update_unlimited_renew:keepUnlimited ? "1" : "",
      keep_photo_extra_qty:  String(photoExtraQty),
      keep_cta_extra_qty:    String(ctaExtraQty),
      renewal_price:         String(basePrice),
      upgrade_diff:          String(upgradeDiff),
      addon_amount:          String(addonAmount),
      total_amount:          String(totalAmount)
    };
  }

  /* ============================================================
     callGAS — 通用 GAS 呼叫器
  ============================================================ */
  async function callGAS(payload) {
    const res  = await fetch(CONFIG.GAS_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    });
    return parseJsonSafe(res);
  }

  async function parseJsonSafe(res) {
    let raw = "";
    try { raw = await res.text(); } catch (e) { return { ok: false, error: "無法讀取回應", raw: "" }; }
    try { return JSON.parse(raw); } catch (_) { return { ok: false, error: "Non-JSON response", raw }; }
  }

  /* ============================================================
     validateBeforeSubmit
  ============================================================ */
  function validateBeforeSubmit() {
    const limits = getLimits();

    for (let i = 1; i <= limits.ctas; i++) {
      const t = valueOf(`cta_text_${i}`);
      const u = valueOf(`cta_link_${i}`);
      if (t && !u) { setStatus(`CTA 按鈕第 ${i} 組：請補上連結。`, "error"); return false; }
      if (!t && u) { setStatus(`CTA 按鈕第 ${i} 組：請補上文字。`, "error"); return false; }
      if (u && !isLooksLikeUrl(u)) { setStatus(`CTA 按鈕第 ${i} 組連結格式有誤。`, "warn"); return false; }
    }

    if (isMarqueeEnabled() && !valueOf("marquee_text")) {
      setStatus("已開啟跑馬燈，請填入跑馬燈內容。", "error"); return false;
    }

    if (mode === "create") {
      if (isAddonChecked("addon_photo") && getAddonQty("addon_photo_qty") <= 0) {
        setStatus("已勾選照片牆加購，請輸入加購張數。", "error"); return false;
      }
      if (isAddonChecked("addon_cta") && getAddonQty("addon_cta_qty") <= 0) {
        setStatus("已勾選 CTA 加購，請輸入加購數量。", "error"); return false;
      }
    }

    const urlFields = ["website","line_url","video1","video2","video3","social1","social2","social3"];
    for (const id of urlFields) {
      const v = valueOf(id);
      if (v && !isLooksLikeUrl(v)) { setStatus(`「${id}」網址格式有誤。`, "warn"); return false; }
    }
    return true;
  }

  function isLooksLikeUrl(str) {
    if (!str) return true;
    const s = str.trim();
    return /^(https?:\/\/|line:|tel:|mailto:)/i.test(s) || /^www\./i.test(s) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s);
  }

  /* ============================================================
     全面刷新（create / update）
  ============================================================ */
  function refreshAll() {
    if (mode === "renew") return;
    const limits = getLimits();
    syncPlanCards();
    syncThemeGroups(limits.plan);
    if (mode === "create") syncAddonInputs(limits);
    syncMarqueeSection();
    renderPhotoSections(limits.wallPhotos);
    renderCtas(limits.ctas);
    if (mode === "create") {
      syncSummary(limits);
      syncQuote(limits);
    }
    updatePreview();
    saveDraftSilently();
  }

  /* ============================================================
     getLimits
  ============================================================ */
  function getLimits() {
    const plan = getSelectedPlan() || "premium";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;
    let ewp = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let ect = isAddonChecked("addon_cta")   ? getAddonQty("addon_cta_qty")   : 0;
    ewp = clamp(ewp, 0, CONFIG.MAX_WALL_PHOTOS - base.wallPhotos);
    ect = clamp(ect, 0, CONFIG.MAX_CTAS - base.ctas);
    return {
      plan, planLabel: base.label, planPrice: base.price,
      wallPhotos: clamp(base.wallPhotos + ewp, 0, CONFIG.MAX_WALL_PHOTOS),
      ctas:       clamp(base.ctas       + ect, 0, CONFIG.MAX_CTAS),
      extraWallPhotos: ewp, extraCtas: ect
    };
  }

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
    const n = Number(els[id]?.value || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function syncPlanCards() {
    const plan = getSelectedPlan();
    document.querySelectorAll("[data-plan-card]").forEach(c =>
      c.classList.toggle("is-selected", c.getAttribute("data-plan-card") === plan));
  }

  function syncThemeGroups(plan) {
    els["free-theme-group"]   ?.classList.toggle("hidden", plan !== "free");
    els["premium-theme-group"]?.classList.toggle("hidden", plan !== "premium");
  }

  function syncAddonInputs(limits) {
    const bundleChecked = isAddonChecked("addon_bundle");
    if (els["addon_photo_qty"]) {
      const enabled  = isAddonChecked("addon_photo");
      const maxExtra = Math.max(0, CONFIG.MAX_WALL_PHOTOS - CONFIG.BASE_LIMITS[limits.plan].wallPhotos);
      els["addon_photo_qty"].disabled = !enabled;
      els["addon_photo_qty"].max = String(maxExtra);
      if (!enabled) els["addon_photo_qty"].value = "0";
      if (Number(els["addon_photo_qty"].value || 0) > maxExtra) els["addon_photo_qty"].value = String(maxExtra);
    }
    if (els["addon-photo-tip"]) {
      const remain = Math.max(0, CONFIG.MAX_WALL_PHOTOS - CONFIG.BASE_LIMITS[limits.plan].wallPhotos);
      els["addon-photo-tip"].textContent = `本方案最多可再加 ${remain} 張`;
    }
    if (els["addon_cta_qty"]) {
      const enabled  = isAddonChecked("addon_cta");
      const maxExtra = Math.max(0, CONFIG.MAX_CTAS - CONFIG.BASE_LIMITS[limits.plan].ctas);
      els["addon_cta_qty"].disabled = !enabled;
      els["addon_cta_qty"].max = String(maxExtra);
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
    els["marquee-section"]?.classList.toggle("hidden", !isMarqueeEnabled());
  }

  /* ============================================================
     照片區塊
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
      { title: "個人照", desc: "固定 1 張，套用到成品卡頭像。", keys: ["avatar"] },
      { title: "Logo",   desc: "固定 1 張，套用到成品卡 logo。", keys: ["logo"] },
      { title: "照片牆", desc: `本次可上傳 ${wallLimit} 張`,
        keys: Array.from({ length: wallLimit }, (_, i) => `photo${i+1}`) }
    ];

    sections.forEach(sec => {
      const wrapper = document.createElement("section");
      wrapper.className = "photo-section";
      const head = document.createElement("div");
      head.className = "photo-section-head";
      head.innerHTML = `<div><h3>${escapeHtml(sec.title)}</h3><p>${escapeHtml(sec.desc)}</p></div>`;
      const grid = document.createElement("div");
      grid.className = "photo-grid photo-grid-form";
      sec.keys.forEach((key, idx) => grid.appendChild(buildPhotoCard(key, sec.title, idx+1)));
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
    title.textContent          = ({ avatar:"個人照", logo:"Logo" })[key] || `照片牆 ${index}`;
    fileInput.dataset.photoKey = key;
    zoomRange.dataset.photoKey = key;
    zoomRange.value            = String(state.photoMeta[key]?.scale || 1);

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      state.photoFiles[key]   = file;
      delete state.photoRealUrls[key];
      state.photoUploadState[key] = "pending";
      const b64 = await fileToDataURL(file);
      state.photoPreviewUrls[key] = b64;
      previewImage.src = b64;
      previewImage.classList.remove("hidden");
      previewEmpty.classList.add("hidden");
      tools.classList.remove("hidden");
      badge.textContent = "準備上傳…";
      badge.dataset.uploadState = "pending";
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
      uploadPhotoToFirebase(key, file).catch(err => {
        setStatus(`圖片上傳失敗（${key}）：${err.message}`, "error");
      });
    });

    zoomRange.addEventListener("input", () => {
      state.photoMeta[key].scale = clampNumber(zoomRange.value, 0.5, 3, 1);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    const makeMove = (fn) => () => { fn(); applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); };

    rotateLeft.addEventListener("click", makeMove(() => { state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate - 90, -180, 180, 0); }));
    rotateRight.addEventListener("click", makeMove(() => { state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate + 90, -180, 180, 0); }));
    moveLeft.addEventListener("click", makeMove(() => { state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x - 0.05).toFixed(2), 0, 1, 0.5); }));
    moveRight.addEventListener("click", makeMove(() => { state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x + 0.05).toFixed(2), 0, 1, 0.5); }));
    moveUp.addEventListener("click", makeMove(() => { state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y - 0.05).toFixed(2), 0, 1, 0.5); }));
    moveDown.addEventListener("click", makeMove(() => { state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y + 0.05).toFixed(2), 0, 1, 0.5); }));
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
      const us = state.photoUploadState[key];
      if (us === "done")  { badge.textContent = "已上傳 ✓"; badge.dataset.uploadState = "done"; }
      else if (us === "uploading") { badge.textContent = "上傳中…"; badge.dataset.uploadState = "uploading"; }
      else if (us === "error") { badge.textContent = "上傳失敗"; badge.dataset.uploadState = "error"; }
      else { badge.textContent = "已選擇"; badge.dataset.uploadState = "pending"; }
      applyPhotoTransform(previewImage, state.photoMeta[key]);
    } else {
      previewImage.removeAttribute("src");
      previewImage.classList.add("hidden");
      previewEmpty.classList.remove("hidden");
      tools.classList.add("hidden");
      badge.textContent = "尚未上傳";
      badge.dataset.uploadState = "idle";
    }
  }

  function applyPhotoTransform(img, meta) {
    if (!img || !meta) return;
    const scale  = clampNumber(meta.scale, 0.5, 3, 1);
    const rotate = clampNumber(meta.rotate, -180, 180, 0);
    const x = ((meta.x ?? 0.5) - 0.5) * 40;
    const y = ((meta.y ?? 0.5) - 0.5) * 40;
    img.style.transform = `translate(${x}px,${y}px) scale(${scale}) rotate(${rotate}deg)`;
  }

  /* ============================================================
     CTA 區塊
  ============================================================ */
  function renderCtas(limit) {
    if (!els["cta-slots"] || !els.ctaTemplate) return;
    const currentDomValues = collectCurrentCtaValues();
    els["cta-slots"].innerHTML = "";
    state.ctaCount = limit;

    for (let i = 1; i <= limit; i++) {
      const frag      = els.ctaTemplate.content.cloneNode(true);
      const label     = frag.querySelector(".cta-title-label");
      const textInput = frag.querySelector(".cta-label-input");
      const urlInput  = frag.querySelector(".cta-url-input");
      label.textContent = `CTA 按鈕 ${i}`;
      textInput.id    = `cta_text_${i}`;
      urlInput.id     = `cta_link_${i}`;
      textInput.value = currentDomValues[`cta_text_${i}`] || state.draftValues[`cta_text_${i}`] || "";
      urlInput.value  = currentDomValues[`cta_link_${i}`] || state.draftValues[`cta_link_${i}`] || "";
      textInput.addEventListener("input", onLiveChange);
      textInput.addEventListener("change", onLiveChange);
      urlInput.addEventListener("input", onLiveChange);
      urlInput.addEventListener("change", onLiveChange);
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
     Summary & Quote (create)
  ============================================================ */
  function syncSummary(limits) {
    const set = (id, v) => { if (els[id]) els[id].textContent = v; };
    set("summary-plan-pill",      limits.planLabel);
    set("summary-photo-pill",     `照片牆：${limits.wallPhotos}`);
    set("summary-cta-pill",       `CTA：${limits.ctas}`);
    set("summary-plan-name",      limits.planLabel);
    set("summary-photo-count",    String(limits.wallPhotos));
    set("summary-cta-count",      String(limits.ctas));
    set("summary-marquee-status", isMarqueeEnabled() ? "已開啟" : "未開啟");
  }

  function getAddonItemsForQuote(limits) {
    const items = [];
    const bundleChecked = isAddonChecked("addon_bundle");
    const photoQty = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    const ctaQty   = isAddonChecked("addon_cta")   ? getAddonQty("addon_cta_qty")   : 0;

    if (bundleChecked) {
      items.push({ code:"addon_bundle", name:"跑馬燈＋更新組合", qty:1, unit_price:CONFIG.ADDON_PRICES.addon_bundle, amount:CONFIG.ADDON_PRICES.addon_bundle });
    } else {
      if (isAddonChecked("addon_marquee"))          items.push({ code:"addon_marquee",          name:"跑馬燈功能", qty:1, unit_price:CONFIG.ADDON_PRICES.addon_marquee, amount:CONFIG.ADDON_PRICES.addon_marquee });
      if (isAddonChecked("addon_update_unlimited")) items.push({ code:"addon_update_unlimited", name:"無限更新",   qty:1, unit_price:CONFIG.ADDON_PRICES.addon_update_unlimited, amount:CONFIG.ADDON_PRICES.addon_update_unlimited });
    }
    if (isAddonChecked("addon_photo") && photoQty > 0)
      items.push({ code:"addon_photo", name:"照片牆加購", qty:photoQty, unit_price:CONFIG.ADDON_PRICES.addon_photo, amount:photoQty*CONFIG.ADDON_PRICES.addon_photo });
    if (isAddonChecked("addon_cta") && ctaQty > 0)
      items.push({ code:"addon_cta", name:"CTA 加購", qty:ctaQty, unit_price:CONFIG.ADDON_PRICES.addon_cta, amount:ctaQty*CONFIG.ADDON_PRICES.addon_cta });
    if (isAddonChecked("addon_agent_upgrade"))
      items.push({ code:"addon_agent_upgrade", name:"金牌級會員", qty:1, unit_price:CONFIG.ADDON_PRICES.addon_agent_upgrade, amount:CONFIG.ADDON_PRICES.addon_agent_upgrade });
    return items;
  }

  function syncQuote(limits) {
    const items       = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s,i) => s + Number(i.amount||0), 0);
    const total       = (limits.planPrice||0) + addonAmount;
    const set         = (id,v) => { if (els[id]) els[id].textContent = v; };
    set("quote-state-text",   `${limits.planLabel}｜${money(total)}`);
    set("quote-plan-amount",  money(limits.planPrice||0));
    set("quote-addon-amount", money(addonAmount));
    set("quote-total-amount", money(total));
    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!items.length) {
        els["quote-addon-breakdown"].appendChild(Object.assign(document.createElement("span"),{ textContent:"尚未選擇加購" }));
      } else {
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          const qs = (item.code === "addon_photo" || item.code === "addon_cta") && item.qty > 1 ? ` × ${item.qty}` : "";
          row.innerHTML = `<span>${escapeHtml(item.name)}${qs}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
  }

  /* ============================================================
     即時預覽
  ============================================================ */
  const THEME_CLASSES = [
    "mode-free","mode-premium",
    "color-1","color-2","color-3","color-4","color-5",
    "p1","p2","p3","p4","p5","p6","p7",
    "style-arch","style-flat","style-spot",
    "paper-1","paper-2","paper-3"
  ];

  function syncPreviewContainerClasses() {
    const scope = els["preview-theme-scope"];
    if (!scope) return;
    const theme = getThemeSelection();
    const plan  = theme.plan;
    THEME_CLASSES.forEach(c => scope.classList.remove(c));
    scope.classList.add(plan === "premium" ? "mode-premium" : "mode-free");
    if (plan === "premium") {
      scope.classList.add(mapPremiumColor(theme.color));
    } else {
      scope.classList.add(mapFreeColor(theme.color));
      scope.classList.add(mapStyle(theme.style));
      scope.classList.add(mapPaper(theme.paper));
    }
    const liveCard = els["livePreviewCard"];
    if (liveCard) {
      THEME_CLASSES.forEach(c => liveCard.classList.remove(c));
      liveCard.classList.add(plan === "premium" ? "mode-premium" : "mode-free");
      if (plan === "premium") liveCard.classList.add(mapPremiumColor(theme.color));
      else { liveCard.classList.add(mapFreeColor(theme.color)); liveCard.classList.add(mapStyle(theme.style)); liveCard.classList.add(mapPaper(theme.paper)); }
    }
  }

  function mapFreeColor(v)    { return ({ c1:"color-1",c2:"color-2",c3:"color-3",c4:"color-4",c5:"color-5" })[v] || "color-1"; }
  function mapStyle(v)        { return ({ s1:"style-arch",s2:"style-flat",s3:"style-spot" })[v] || "style-arch"; }
  function mapPaper(v)        { return ({ f1:"paper-1",f2:"paper-2",f3:"paper-3" })[v] || "paper-1"; }
  function mapPremiumColor(v) { return ["p1","p2","p3","p4","p5","p6","p7"].includes(v) ? v : "p1"; }

  function updatePreview() {
    if (mode === "renew") return;
    const root = els["livePreviewCard"];
    if (!root) return;
    syncPreviewContainerClasses();
    ensureRendererAlias();
    const renderer = window.HSCCardRenderer || window.HscCardRenderer;
    if (!renderer || typeof renderer.renderCard !== "function") {
      root.innerHTML = `<div class="renderer-error">找不到 HscCardRenderer，請確認已載入 card-renderer.js</div>`;
      return;
    }
    try {
      renderer.renderCard(buildPreviewData(), {
        mode: "form", root, useExistingDom: false,
        qrMode: "preview", allowActions: false,
        previewUrl: CONFIG.SHOWCASE_URL, shareUrl: CONFIG.SHOWCASE_URL, cardUrl: CONFIG.SHOWCASE_URL
      });
    } catch (err) {
      root.innerHTML = `<div class="renderer-error">預覽渲染失敗：${escapeHtml(err.message || "未知")}</div>`;
    }
  }

  function buildPreviewData() {
    const limits = getLimits();
    const theme  = getThemeSelection();
    const data = {
      name: valueOf("display_name"), unit: valueOf("unit"), title: valueOf("title"),
      slogan: valueOf("intro"), services: valueOf("services"), experience: valueOf("experience"),
      phone: valueOf("phone"), email: valueOf("email"), address: valueOf("address"),
      website: valueOf("website"), line_url: valueOf("line_url"), line_oa: valueOf("line_oa"),
      wechat_id: valueOf("wechat_id"),
      video1: valueOf("video1"), video2: valueOf("video2"), video3: valueOf("video3"),
      social1: valueOf("social1"), social2: valueOf("social2"), social3: valueOf("social3"),
      plan: theme.plan, color: theme.color, style: theme.style, paper: theme.paper,
      marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",
      photo_limit: limits.wallPhotos, cta_limit: limits.ctas,
      preview_url: CONFIG.SHOWCASE_URL, share_url: CONFIG.SHOWCASE_URL, card_url: CONFIG.SHOWCASE_URL,
      features: {
        photo_meta: buildPhotoMetaMap(),
        preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        photo_preview_urls: { ...state.photoPreviewUrls }
      }
    };

    const avatarUrl = state.photoRealUrls.avatar || state.photoPreviewUrls.avatar || "";
    if (avatarUrl) { data.avatar_url = avatarUrl; data["u-img"] = avatarUrl; }
    const logoUrl = state.photoRealUrls.logo || state.photoPreviewUrls.logo || "";
    if (logoUrl) data.logo_url = logoUrl;
    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoRealUrls[`photo${i}`] || state.photoPreviewUrls[`photo${i}`] || "";
      if (url) { data[`photo${i}_url`] = url; data[`photo_url_${i}`] = url; }
    }
    for (let i = 1; i <= limits.ctas; i++) {
      data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      data[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return data;
  }

  function buildPhotoMetaMap() {
    const out = { avatar: normalizePhotoMeta(state.photoMeta.avatar), logo: normalizePhotoMeta(state.photoMeta.logo) };
    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++)
      out[`photo${i}`] = normalizePhotoMeta(state.photoMeta[`photo${i}`]);
    return out;
  }

  /* ============================================================
     草稿
  ============================================================ */
  function saveDraft() {
    const values = {};
    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "radio") { if (el.checked) values[el.name] = el.value; return; }
      if (!el.id) return;
      values[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    localStorage.setItem(getDraftKey(), JSON.stringify({ values, photoMeta: state.photoMeta }));
  }

  function saveDraftSilently() { try { saveDraft(); } catch (_) {} }

  function restoreDraft() {
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(getDraftKey()) || "null"); } catch (_) {}
    if (!draft || typeof draft !== "object") return;
    const values = draft.values || {};
    state.draftValues = { ...values };

    Object.keys(values).forEach(key => {
      if (/^cta_(text|link)_\d+$/.test(key)) return;
      const el = document.getElementById(key);
      if (el) {
        if (el.type === "checkbox") el.checked = !!values[key];
        else el.value = values[key];
        return;
      }
      if (key === "plan") {
        const r = document.querySelector(`input[name="plan"][value="${values[key]}"]`);
        if (r) r.checked = true;
      }
    });

    if (values["experience"] !== undefined) {
      const expEl = document.getElementById("experience") || els["experience"];
      if (expEl) expEl.value = values["experience"] || "";
    }
    if (draft.photoMeta && typeof draft.photoMeta === "object") state.photoMeta = draft.photoMeta;
    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
  }

  function clearDraft() {
    localStorage.removeItem(getDraftKey());
    localStorage.removeItem(CONFIG.QUOTE_STORAGE_KEY);
    location.reload();
  }

  /* ============================================================
     成功面板
  ============================================================ */
  function showSuccessPanel(result, submitMode) {
    if (!result) return;
    if (els["progress-fill"]) els["progress-fill"].style.width = "100%";

    const idEl = els["progress-card-id-display"];
    if (idEl) { idEl.textContent = result.cardId || "（待客服確認）"; idEl.dataset.cardId = result.cardId || ""; }

    const linkEl = els["progress-preview-link"];
    if (linkEl) { linkEl.href = result.previewUrl || CONFIG.SHOWCASE_URL; linkEl.textContent = result.previewUrl || CONFIG.SHOWCASE_URL; }

    const panel = els["progress-success-panel"];
    if (!panel) return;

    const setT = (sel, v) => { const el = panel.querySelector(sel); if (el) el.textContent = v; };

    /* 依 submitMode 調整成功面板文案 */
    if (submitMode === "update") {
      setText("success-header-title", "更新成功！");
      setText("success-header-sub",   "名片內容已更新。");
      setText("success-id-label",     "📋 名片序號");
      setText("success-info-label-1", "更新人");
      setText("success-info-label-2", "操作");
      setT(".success-plan", "名片更新");
      els["success-due-alert"]?.classList.add("hidden");
    } else if (submitMode === "update_charge") {
      setText("success-header-title", "付款單建立成功！");
      setText("success-header-sub",   "請於期限內完成付款，付款後客服將協助更新。");
      setText("success-id-label",     "📋 名片序號");
      els["success-due-alert"]?.classList.remove("hidden");
    } else if (submitMode === "renew") {
      setText("success-header-title", "續約申請成功！");
      setText("success-header-sub",   "請於期限內完成付款，付款後系統自動續期。");
      setText("success-id-label",     "📋 續約單號");
      setText("success-info-label-1", "客戶");
      setText("success-info-label-2", "方案");
      els["success-due-alert"]?.classList.remove("hidden");
    }

    setT(".success-name",  result.customerName || "您");
    setT(".success-plan",  result.planLabel    || "方案");
    setT(".success-total", result.totalAmount > 0 ? `NT$ ${Number(result.totalAmount).toLocaleString("zh-TW")}` : "—");
    setT(".success-due",   result.dueDateStr   || "3 天內");

    if (submitMode === "update") {
      setText("success-footer-note", "名片更新完成，成品頁已同步更新。");
    } else {
      setText("success-footer-note", "點「複製序號＋回覆文案」→ 貼到 LINE 客服對話框\n客服確認付款後將立即為您開通。");
    }

    panel.classList.remove("hidden");
  }

  function hideSuccessPanel() {
    els["progress-success-panel"]?.classList.add("hidden");
  }

  /* ============================================================
     Progress
  ============================================================ */
  function showProgress(show, title) {
    if (!els["submit-progress-overlay"]) return;
    els["submit-progress-overlay"].classList.toggle("hidden", !show);
    if (show) {
      setText("progress-title", title || "資料送出中");
      const steps = Array.from(document.querySelectorAll(".progress-step"));
      steps.forEach(s => s.classList.remove("is-active","is-done"));
      if (els["progress-fill"]) els["progress-fill"].style.width = "0%";
      if (els["progress-text"]) els["progress-text"].textContent = "正在處理，請稍候。";
      hideSuccessPanel();
    }
  }

  function setProgressStep(stepNo, text) {
    const total = 5;
    const steps = Array.from(document.querySelectorAll(".progress-step"));
    steps.forEach(step => {
      const n = Number(step.dataset.step || 0);
      step.classList.toggle("is-active", n === stepNo);
      step.classList.toggle("is-done",   n <  stepNo);
    });
    if (els["progress-fill"]) els["progress-fill"].style.width = `${Math.round((stepNo/total)*100)}%`;
    if (els["progress-text"] && text) els["progress-text"].textContent = text;
  }

  /* ============================================================
     handleCopyCardNotice
  ============================================================ */
  async function handleCopyCardNotice() {
    let r = state.lastSubmitResult;
    if (!r) {
      const limits      = getLimits();
      const addonItems  = getAddonItemsForQuote(limits);
      const addonAmount = addonItems.reduce((s,i) => s + Number(i.amount||0), 0);
      const total       = limits.planPrice + addonAmount;
      const cid         = els["progress-card-id-display"]?.dataset.cardId || "";
      const previewUrl  = cid ? `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cid)}&view=1` : CONFIG.SHOWCASE_URL;
      const dueIso      = new Date(); dueIso.setDate(dueIso.getDate()+3);
      r = buildLastSubmitResult({ cardId: cid, previewUrl, paymentDueAt: dueIso.toISOString(), totalAmount: total, planLabel: limits.planLabel, customerName: valueOf("display_name") || "您" });
    }
    const notice = `您好，我是 ${r.customerName}，已完成天使幸福智慧名片申請！\n📋 名片序號：${r.cardId || "（待確認）"}\n💳 方案：${r.planLabel}，總金額 NT$ ${Number(r.totalAmount||0).toLocaleString("zh-TW")}\n🔗 成品預覽：${r.previewUrl}\n⏰ 付款期限：${r.dueDateStr} 前，請協助確認並開通名片，謝謝！`;
    await copyText(notice);
    const btn = els["btn-copy-card-notice"];
    if (btn) { const orig = btn.textContent; btn.textContent = "✅ 已複製！"; setTimeout(() => { btn.textContent = orig; }, 2200); }
  }

  /* ============================================================
     工具函式
  ============================================================ */
  function getThemeSelection() {
    const plan = getSelectedPlan() || "premium";
    if (plan === "free") return { plan, color: els["free_color"]?.value || "c1", style: els["free_style"]?.value || "s1", paper: els["free_paper"]?.value || "f1" };
    return { plan, color: els["premium_color"]?.value || "p1", style: "", paper: "" };
  }

  function isMarqueeEnabled() {
    return isAddonChecked("addon_marquee") || isAddonChecked("addon_bundle");
  }

  function valueOf(id) {
    const el = document.getElementById(id) || els[id];
    return (el?.value || "").trim();
  }

  function setText(id, val) {
    const el = els[id] || document.getElementById(id);
    if (el) el.textContent = val || "";
  }

  function setStatus(msg, stateName) {
    const el = els["form-status-strip"];
    if (!el) return;
    el.textContent = msg || "";
    if (msg) el.classList.add("visible"); else el.classList.remove("visible");
    if (stateName) el.dataset.state = stateName; else delete el.dataset.state;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

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

  function extractCardId(data) {
    return data.card_id || data.id || data.card?.id || data.card?.card_id || data.data?.card_id || data.data?.id || "";
  }

  function pickPaymentDueAt(data) {
    const candidates = [data?.payment_due_at, data?.card?.payment_due_at, data?.data?.payment_due_at, data?.quote?.payment_due_at];
    for (const c of candidates) { if (c && String(c).trim()) return String(c).trim(); }
    const d = new Date(); d.setDate(d.getDate()+3); return d.toISOString();
  }

  function formatDateYMD(input) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d.getTime())) throw new Error("invalid");
      return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
    } catch (_) {
      const fb = new Date(); fb.setDate(fb.getDate()+3);
      return `${fb.getFullYear()}/${String(fb.getMonth()+1).padStart(2,"0")}/${String(fb.getDate()).padStart(2,"0")}`;
    }
  }

  function buildLastSubmitResult({ cardId, previewUrl, paymentDueAt, totalAmount, planLabel, customerName }) {
    return { cardId, previewUrl, paymentDueAt, dueDateStr: paymentDueAt ? formatDateYMD(paymentDueAt) : "3 天內", totalAmount, planLabel, customerName };
  }

  function money(v) { return `NT$ ${Number(v||0).toLocaleString("zh-TW")}`; }

  async function copyText(str) {
    if (!str) return;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(str); return; } } catch (_) {}
    const ta = document.createElement("textarea");
    ta.value = str; ta.style.cssText = "position:fixed;top:-9999px;opacity:0;";
    document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

})();
