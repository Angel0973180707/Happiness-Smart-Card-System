/* ============================================================
   天使幸福智慧名片館 form.js
   完整覆蓋版

   本次調整：
   1. 保留既有三模式共構與主流程
   2. 修正可見文案，移除工程語言
   3. 新增一鍵切換模式按鈕（改網址並重新初始化）
   4. 補強 premium 預覽可讀性相關 UI 同步
============================================================ */

(() => {
  "use strict";

  const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    SERVICE_URL: "https://lin.ee/G3VJoRm",
    SHOWCASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    QUOTE_STORAGE_KEY: "HSC_LAST_QUOTE",
    DRAFT_KEY: "hsc_form_draft_v834",

    CREATE_ACTION: "createCardWithOfflinePayment",
    DELIVER_ACTION: "markCardDelivered",
    PAYMENT_NOTICE_ACTION: "buildPaymentNoticeText",

    UPDATE_LOAD_ACTION: "getCardForUpdate",
    UPDATE_ELIGIBILITY_ACTION: "getUpdateEligibility",
    UPDATE_SUBMIT_ACTION: "updateCardByToken",
    UPDATE_CREATE_PAYMENT_ACTION: "createUpdateFeePayment",

    RENEW_LOAD_CARD_ACTION: "getCard",
    RENEW_PAYMENT_SUMMARY_ACTION: "getCardPaymentSummary",
    RENEW_ADDON_SUMMARY_ACTION: "getAddonOrders",
    RENEW_QUOTE_ACTION: "createRenewalQuote",
    RENEW_CREATE_PAYMENT_ACTION: "createRenewalPayment",
    RENEW_MARK_RENEWED_ACTION: "markCardRenewed",

    BASE_LIMITS: {
      free: { wallPhotos: 2, ctas: 1, price: 1500, label: "自由搭配" },
      premium: { wallPhotos: 5, ctas: 3, price: 2000, label: "精品設計" }
    },
    ADDON_PRICES: {
      addon_marquee: 300,
      addon_photo: 100,
      addon_cta: 100,
      addon_update_unlimited: 300,
      addon_bundle: 500,
      addon_agent_upgrade: 10000
    },
    MAX_WALL_PHOTOS: 10,
    MAX_CTAS: 10,
    DEFAULT_PREVIEW_META: {
      layout: "grid",
      aspect_ratio: "1:1",
      fit_mode: "cover"
    },
    FIREBASE_MODULE: "./firebase.js"
  };

  const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };

  const state = {
    mode: "create",
    query: {},
    modeContext: {
      cardId: "",
      inviteCode: "",
      updateToken: "",
      renewToken: ""
    },

    runtime: {
      createMeta: null,
      updateCard: null,
      updateEligibilityRaw: null,
      updateEligibility: null,
      renewCard: null,
      renewPaymentSummary: null,
      renewAddonSummary: null,
      renewQuote: null
    },

    identity: {
      tenant: "angel",
      cardId: "",
      leadId: "",
      paymentId: "",
      renewalId: "",
      addonOrderId: ""
    },

    shared: {
      name: "",
      unit: "",
      title: "",
      slogan: "",
      services: "",
      experience: "",
      wechat_id: "",
      line_url: "",
      line_oa: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      social1: "",
      social2: "",
      social3: "",
      video1: "",
      video2: "",
      video3: ""
    },

    theme: {
      plan: "",
      color: "",
      style: "",
      paper: "",
      photoLimit: 0,
      ctaLimit: 0,
      marqueeText: "",
      marqueeEnabled: false
    },

    meta: {
      referrer: "",
      serviceAgent: "",
      agentType: "",
      shareSource: "",
      shareChannel: ""
    },

    ctas: [],

    quote: {
      mode: "",
      planAmount: 0,
      addonAmount: 0,
      totalAmount: 0,
      baseRenewalFee: 0,
      planDiffFee: 0,
      unlimitedUpdateFee: 0,
      quoteItems: [],
      quoteSummary: ""
    },

    updateFlow: {
      cardExpired: false,
      freeRemaining: 0,
      isUnlimited: false,
      requiresPayment: false,
      canSubmitDirectly: false,
      deductFreeCount: false,
      updateFeeAmount: 0,
      expiresAt: "",
      reasonText: ""
    },

    renewFlow: {
      targetPlan: "",
      selectedAddons: [],
      renewUnlimitedUpdate: false,
      renewTerm: 1,
      newExpiresAt: ""
    },

    photoMeta: {
      avatar: { ...DEFAULT_PHOTO_META },
      logo: { ...DEFAULT_PHOTO_META }
    },
    photoPreviewUrls: {},
    photoRealUrls: {},
    photoFiles: {},
    photoUploadTokens: {},
    photoUploadState: {},

    wallPhotoCount: 0,
    ctaCount: 0,
    tempCardId: "",
    lastSubmitResult: null,
    draftValues: {},
    urlPhotoLimitOverride: 0,

    snapshots: {
      before: null,
      after: null,
      diff: null
    }
  };

  const els = {};
  let _fb = null;

  document.addEventListener("DOMContentLoaded", init);

  function collectEls() {
    const ids = [
      "smart-card-form", "form-status-strip",
      "btn-open-showcase", "btn-toggle-mode", "btn-save-draft", "btn-clear-draft",
      "btn-contact-service", "btn-submit-form",
      "btn-gold-info", "btn-gold-copy", "btn-gold-contact",
      "progress-contact-service", "btn-copy-primary-notice", "btn-copy-secondary-notice",
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
      "photo-slots", "cta-slots",
      "preview-theme-scope",
      "summary-plan-pill", "summary-photo-pill", "summary-cta-pill",
      "summary-plan-name", "summary-photo-count", "summary-cta-count",
      "summary-marquee-status",
      "quote-kicker", "quote-title", "quote-state-text", "quote-plan-amount",
      "quote-addon-amount", "quote-addon-breakdown", "quote-total-amount",
      "submit-progress-overlay", "progress-text", "progress-fill",
      "progress-success-panel",
      "success-primary-id-label", "success-primary-id-value",
      "success-info-rows", "success-due-alert", "success-due-text",
      "success-preview-row", "success-preview-label", "progress-preview-link",
      "success-summary-box", "success-summary-content",
      "success-actions", "success-footer-note",
      "success-header-icon", "success-header-title", "success-header-sub",
      "mode-info-card", "mode-info-kicker", "mode-info-title", "mode-info-desc",
      "mode-info-panel", "renew-controls-card", "renew-controls-panel",
      "mode-inline-tip",
      "dev-mode-switcher", "btn-mode-create", "btn-mode-update", "btn-mode-renew", "dev-current-mode-pill"
    ];
    ids.forEach(id => { els[id] = document.getElementById(id); });
    els.planRadios = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.addonCheckboxes = Array.from(document.querySelectorAll('input[name="addons"]'));
    els.planCards = Array.from(document.querySelectorAll("[data-plan-card]"));
    els.progressSteps = Array.from(document.querySelectorAll(".progress-step"));
    els.photoTemplate = document.getElementById("photo-slot-template");
    els.ctaTemplate = document.getElementById("cta-slot-template");
  }

  function ensureRendererAlias() {
    if (!window.HSCCardRenderer && window.HscCardRenderer) window.HSCCardRenderer = window.HscCardRenderer;
  }

  function init() {
    collectEls();
    ensureRendererAlias();
    hydrateQueryParams();
    hydrateModeFromQuery();
    applyModeUi();
    upgradeExperienceToTextarea();
    bindStaticEvents();
    restoreDraft();
    ensureDefaultPlan();
    state.tempCardId = "TEMP_" + Date.now();
    loadModeBootstrap();
    refreshAll();
  }

  function upgradeExperienceToTextarea() {
    const old = document.getElementById("experience");
    if (!old || old.tagName === "TEXTAREA") return;
    const existingValue = old.value || "";
    const parent = old.parentNode;
    const ta = document.createElement("textarea");
    ta.id = "experience";
    ta.rows = 4;
    ta.placeholder = "例：前 XX 公司品牌顧問、10 年業界資歷\n可換行填寫多段經歷";
    ta.style.cssText = "resize:vertical;min-height:96px;";
    ta.value = existingValue;
    parent.insertBefore(ta, old);
    parent.removeChild(old);
    els["experience"] = ta;
    ta.addEventListener("input", onLiveChange);
    ta.addEventListener("change", onLiveChange);
  }

  function hydrateQueryParams() {
    let search = "";
    try { search = window.location.search || ""; } catch (_) { return; }
    if (!search) return;
    const params = new URLSearchParams(search);
    state.query = Object.fromEntries(params.entries());

    const inviteCode = params.get("invite_code") || params.get("invite");
    if (inviteCode && els["invite_code"]) els["invite_code"].value = inviteCode.trim();

    const ref = params.get("ref");
    if (ref && els["ref"]) els["ref"].value = ref.trim();

    const planParam = params.get("plan");
    if (planParam === "free" || planParam === "premium") {
      const radio = document.querySelector(`input[name="plan"][value="${planParam}"]`);
      if (radio) radio.checked = true;
    }

    const photoLimitParam = Number(params.get("photo_limit") || 0);
    if (Number.isFinite(photoLimitParam) && photoLimitParam > 0) {
      state.urlPhotoLimitOverride = Math.min(CONFIG.MAX_WALL_PHOTOS, Math.max(0, Math.floor(photoLimitParam)));
    }
  }

  function hydrateModeFromQuery() {
    const mode = String(state.query.mode || "create").trim().toLowerCase();
    if (mode === "update" || mode === "renew") state.mode = mode;
    else state.mode = "create";

    state.modeContext.cardId = String(state.query.card_id || "").trim();
    state.modeContext.inviteCode = String(state.query.invite_code || state.query.invite || "").trim();
    state.modeContext.updateToken = String(state.query.update_token || "").trim();
    state.modeContext.renewToken = String(state.query.renew_token || "").trim();

    if (state.mode === "update" && !state.modeContext.updateToken && state.modeContext.cardId) {
      state.modeContext.updateToken = state.modeContext.cardId;
    }
    if (state.mode === "renew" && !state.modeContext.renewToken && state.modeContext.cardId) {
      state.modeContext.renewToken = state.modeContext.cardId;
    }
  }

  function applyModeUi() {
    const h1 = document.getElementById("page-hero-title") || document.querySelector(".page-hero h1");
    const heroDesc = document.getElementById("hero-desc") || document.querySelector(".hero-desc");
    const submitBtn = els["btn-submit-form"];

    if (state.mode === "update") {
      if (h1) h1.textContent = "智慧名片更新表單";
      if (heroDesc) heroDesc.textContent = "可查看原資料、確認更新資格後送出。";
      if (submitBtn) submitBtn.textContent = "送出更新申請";
    } else if (state.mode === "renew") {
      if (h1) h1.textContent = "智慧名片續約表單";
      if (heroDesc) heroDesc.textContent = "可續約、調整方案與加購內容。";
      if (submitBtn) submitBtn.textContent = "送出續約申請";
    } else {
      if (h1) h1.textContent = "智慧名片申請表";
      if (heroDesc) heroDesc.textContent = "即時預覽｜照片編輯｜完整報價";
      if (submitBtn) submitBtn.textContent = "送出申請";
    }

    const isUpdate = state.mode === "update";
    const isRenew = state.mode === "renew";
    if (els["mode-info-card"]) {
      els["mode-info-card"].classList.toggle("hidden", !(isUpdate || isRenew));
    }
    if (els["renew-controls-card"]) {
      els["renew-controls-card"].classList.toggle("hidden", !isRenew);
    }

    const modePill = els["dev-current-mode-pill"];
    if (modePill) {
      if (state.mode === "update") modePill.textContent = "目前模式：更新內容";
      else if (state.mode === "renew") modePill.textContent = "目前模式：續約服務";
      else modePill.textContent = "目前模式：申請名片";
      modePill.setAttribute("data-mode", state.mode);
    }

    document.body.setAttribute("data-form-mode", state.mode);
  }

  function switchModeByUrl(mode) {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);

    if (mode === "create") {
      url.searchParams.delete("card_id");
      url.searchParams.delete("update_token");
      url.searchParams.delete("renew_token");
      if (!url.searchParams.get("invite_code")) {
        url.searchParams.set("invite_code", "TEST001");
      }
    }

    if (mode === "update") {
      url.searchParams.set("card_id", url.searchParams.get("card_id") || "TW0001");
      url.searchParams.set("update_token", url.searchParams.get("update_token") || "TEST123");
      url.searchParams.delete("renew_token");
    }

    if (mode === "renew") {
      url.searchParams.set("card_id", url.searchParams.get("card_id") || "TW0001");
      url.searchParams.set("renew_token", url.searchParams.get("renew_token") || "TEST456");
      url.searchParams.delete("update_token");
    }

    window.location.href = url.toString();
  }

  function syncModePanels() {
    if (state.mode === "update" && state.runtime.updateEligibility) {
      renderUpdateEligibilityPanel();
    } else if (state.mode === "renew" && state.runtime.renewCard) {
      renderRenewSummaryPanel();
      renderRenewControls();
    }
  }

  async function loadModeBootstrap() {
    if (state.mode === "create") {
      await loadCreateBootstrap();
    } else if (state.mode === "update") {
      await loadUpdateBootstrap();
    } else if (state.mode === "renew") {
      await loadRenewBootstrap();
    }
    refreshAll();
  }

  async function loadCreateBootstrap() {
    state.runtime.createMeta = { mode: "create" };
    if (els["invite_code"] && !els["invite_code"].value && state.modeContext.inviteCode) {
      els["invite_code"].value = state.modeContext.inviteCode;
    }
  }

  async function loadUpdateBootstrap() {
    const cardId = state.modeContext.cardId;
    const token = state.modeContext.updateToken;
    if (!cardId || !token) {
      setStatus("缺少更新所需資料，無法載入表單。", "error");
      return;
    }

    try {
      const cardRes = await postToGas({ action: CONFIG.UPDATE_LOAD_ACTION, card_id: cardId, update_token: token });
      if (!cardRes.ok) throw new Error(cardRes.error || "取得資料失敗");
      state.runtime.updateCard = cardRes.card || cardRes.data || cardRes;

      const eligRes = await postToGas({ action: CONFIG.UPDATE_ELIGIBILITY_ACTION, card_id: cardId });
      state.runtime.updateEligibilityRaw = eligRes;
      resolveUpdateEligibilityState(eligRes);
      state.runtime.updateEligibility = { ...state.updateFlow };

      hydrateFormFromCard(state.runtime.updateCard);

      setStatus(`已載入更新資料。${state.updateFlow.reasonText || ""}`, "info");
    } catch (err) {
      console.error(err);
      setStatus(`載入更新資料失敗：${err.message}`, "error");
    }
  }

  async function loadRenewBootstrap() {
    const cardId = state.modeContext.cardId;
    const token = state.modeContext.renewToken;
    if (!cardId || !token) {
      setStatus("缺少續約所需資料，無法載入表單。", "error");
      return;
    }

    try {
      const cardRes = await postToGas({ action: CONFIG.RENEW_LOAD_CARD_ACTION, card_id: cardId, renew_token: token });
      if (!cardRes.ok) throw new Error(cardRes.error || "取得資料失敗");
      state.runtime.renewCard = cardRes.card || cardRes.data || cardRes;

      const paymentRes = await postToGas({ action: CONFIG.RENEW_PAYMENT_SUMMARY_ACTION, card_id: cardId });
      state.runtime.renewPaymentSummary = paymentRes;

      const addonRes = await postToGas({ action: CONFIG.RENEW_ADDON_SUMMARY_ACTION, card_id: cardId });
      state.runtime.renewAddonSummary = addonRes;

      hydrateFormFromCard(state.runtime.renewCard);

      state.renewFlow.targetPlan = state.runtime.renewCard?.plan || getSelectedPlan() || "free";
      const radio = document.querySelector(`input[name="plan"][value="${state.renewFlow.targetPlan}"]`);
      if (radio) radio.checked = true;

      setStatus("已載入續約資料，可調整方案與加購項目。", "info");
    } catch (err) {
      console.error(err);
      setStatus(`載入續約資料失敗：${err.message}`, "error");
    }
  }

  async function postToGas(payload) {
    const body = new URLSearchParams();
    body.append("payload", JSON.stringify(payload || {}));
    const res = await fetch(CONFIG.GAS_URL, { method: "POST", body });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (err) {
      console.error("[HSC] GAS non-json response:", text);
      throw new Error("系統回傳格式錯誤");
    }
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    }
    return data;
  }

  function extractCardId(data) {
    return data?.card_id || data?.id || data?.card?.id || data?.card?.card_id || data?.data?.card_id || "";
  }

  function extractPaymentId(data) {
    return data?.payment?.payment_id || data?.payment_id || data?.data?.payment_id || "";
  }

  function buildSharedCardData() {
    return {
      name: valueOf("display_name"),
      unit: valueOf("unit"),
      title: valueOf("title"),
      slogan: valueOf("intro"),
      services: valueOf("services"),
      experience: valueOf("experience"),
      wechat_id: valueOf("wechat_id"),
      line_url: valueOf("line_url"),
      line_oa: valueOf("line_oa"),
      email: valueOf("email"),
      phone: normalizePhone(valueOf("phone")),
      address: valueOf("address"),
      website: valueOf("website"),
      social1: valueOf("social1"),
      social2: valueOf("social2"),
      social3: valueOf("social3"),
      video1: valueOf("video1"),
      video2: valueOf("video2"),
      video3: valueOf("video3")
    };
  }

  function hydrateFormFromCard(card) {
    if (!card) return;
    const map = {
      display_name: "name", unit: "unit", title: "title", intro: "slogan",
      services: "services", experience: "experience", wechat_id: "wechat_id",
      line_url: "line_url", line_oa: "line_oa", email: "email", phone: "phone",
      address: "address", website: "website", social1: "social1", social2: "social2",
      social3: "social3", video1: "video1", video2: "video2", video3: "video3"
    };
    for (const [field, prop] of Object.entries(map)) {
      if (card[prop] !== undefined) setInputValue(field, card[prop]);
    }
    if (card.plan) {
      const radio = document.querySelector(`input[name="plan"][value="${card.plan}"]`);
      if (radio) radio.checked = true;
    }
    hydrateThemeFromCard(card);
    hydrateMediaFromCard(card);
    hydrateCtasFromCard(card);
  }

  function hydrateThemeFromCard(card) {
    if (card.plan === "free") {
      if (card.color) setInputValue("free_color", card.color);
      if (card.style) setInputValue("free_style", card.style);
      if (card.paper) setInputValue("free_paper", card.paper);
    } else if (card.plan === "premium") {
      if (card.color) setInputValue("premium_color", card.color);
    }
  }

  function hydrateMediaFromCard(card) {
    void card;
  }

  function hydrateCtasFromCard(card) {
    if (!card) return;
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const text = card[`cta_text_${i}`];
      const link = card[`cta_link_${i}`];
      if (text !== undefined) state.draftValues[`cta_text_${i}`] = text || "";
      if (link !== undefined) state.draftValues[`cta_link_${i}`] = link || "";
    }
  }

  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  }

  function ensureDefaultPlan() {
    if (getSelectedPlan()) return;
    const defaultPlan = state.mode === "renew" ? "free" : "premium";
    const r = els.planRadios.find(radio => radio.value === defaultPlan) || els.planRadios[0];
    if (r) r.checked = true;
  }

  function getSelectedPlan() { return els.planRadios.find(r => r.checked)?.value || ""; }
  function isAddonChecked(code) { return !!document.querySelector(`input[name="addons"][value="${code}"]`)?.checked; }
  function getAddonQty(id) {
    const el = els[id];
    if (!el) return 0;
    const n = Number(el.value || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function getLimits() {
    if (state.mode === "create") return getLimitsCreate();
    if (state.mode === "update") return getLimitsUpdate();
    if (state.mode === "renew") return getLimitsRenew();
    return getLimitsCreate();
  }

  function getLimitsCreate() {
    const plan = getSelectedPlan() || "premium";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;
    const urlOverride = Number(state.urlPhotoLimitOverride || 0);
    const effectiveBaseWallPhotos = urlOverride > 0 ? Math.min(urlOverride, CONFIG.MAX_WALL_PHOTOS) : base.wallPhotos;
    let ewp = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let ect = isAddonChecked("addon_cta") ? getAddonQty("addon_cta_qty") : 0;
    ewp = Math.min(ewp, CONFIG.MAX_WALL_PHOTOS - effectiveBaseWallPhotos);
    ect = Math.min(ect, CONFIG.MAX_CTAS - base.ctas);
    return {
      plan, planLabel: base.label, planPrice: base.price,
      baseWallPhotos: effectiveBaseWallPhotos,
      wallPhotos: effectiveBaseWallPhotos + ewp,
      ctas: base.ctas + ect,
      extraWallPhotos: ewp, extraCtas: ect
    };
  }

  function getLimitsUpdate() {
    const card = state.runtime.updateCard;
    const plan = card?.plan || getSelectedPlan() || "premium";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;
    return {
      plan, planLabel: base.label, planPrice: base.price,
      baseWallPhotos: Number(card?.photo_limit ?? base.wallPhotos),
      wallPhotos: Number(card?.photo_limit ?? base.wallPhotos),
      ctas: Number(card?.cta_limit ?? base.ctas),
      extraWallPhotos: 0, extraCtas: 0
    };
  }

  function getLimitsRenew() {
    const plan = state.renewFlow.targetPlan || getSelectedPlan() || "free";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.free;
    let ewp = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let ect = isAddonChecked("addon_cta") ? getAddonQty("addon_cta_qty") : 0;
    ewp = Math.min(ewp, CONFIG.MAX_WALL_PHOTOS - base.wallPhotos);
    ect = Math.min(ect, CONFIG.MAX_CTAS - base.ctas);
    return {
      plan, planLabel: base.label, planPrice: base.price,
      baseWallPhotos: base.wallPhotos,
      wallPhotos: base.wallPhotos + ewp,
      ctas: base.ctas + ect,
      extraWallPhotos: ewp, extraCtas: ect
    };
  }

  function getAddonItemsForQuote(limits) {
    const items = [];
    const bundleChecked = isAddonChecked("addon_bundle");
    const photoChecked = isAddonChecked("addon_photo");
    const ctaChecked = isAddonChecked("addon_cta");
    const photoQty = photoChecked ? getAddonQty("addon_photo_qty") : 0;
    const ctaQty = ctaChecked ? getAddonQty("addon_cta_qty") : 0;

    if (bundleChecked) {
      items.push({ code: "addon_bundle", name: "跑馬燈＋更新組合", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_bundle, amount: CONFIG.ADDON_PRICES.addon_bundle });
    } else {
      if (isAddonChecked("addon_marquee")) items.push({ code: "addon_marquee", name: "跑馬燈功能", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_marquee, amount: CONFIG.ADDON_PRICES.addon_marquee });
      if (isAddonChecked("addon_update_unlimited")) items.push({ code: "addon_update_unlimited", name: "無限更新", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_update_unlimited, amount: CONFIG.ADDON_PRICES.addon_update_unlimited });
    }
    if (photoChecked && photoQty > 0) items.push({ code: "addon_photo", name: "照片牆加購", qty: photoQty, unit_price: CONFIG.ADDON_PRICES.addon_photo, amount: photoQty * CONFIG.ADDON_PRICES.addon_photo });
    if (ctaChecked && ctaQty > 0) items.push({ code: "addon_cta", name: "CTA 加購", qty: ctaQty, unit_price: CONFIG.ADDON_PRICES.addon_cta, amount: ctaQty * CONFIG.ADDON_PRICES.addon_cta });
    if (isAddonChecked("addon_agent_upgrade")) items.push({ code: "addon_agent_upgrade", name: "金牌級會員", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_agent_upgrade, amount: CONFIG.ADDON_PRICES.addon_agent_upgrade });

    return items;
  }

  function refreshAll() {
    const limits = getLimits();
    syncPlanCards();
    syncThemeGroups(limits.plan);
    syncAddonInputs(limits);
    syncMarqueeSection();
    renderPhotoSections(limits.wallPhotos);
    renderCtas(limits.ctas);
    syncSummary(limits);
    syncQuoteByMode();
    syncModePanels();
    updatePreview();
    saveDraftSilently();
  }

  function syncPlanCards() {
    const plan = getSelectedPlan();
    els.planCards.forEach(c => c.classList.toggle("is-selected", c.getAttribute("data-plan-card") === plan));
  }

  function syncThemeGroups(plan) {
    els["free-theme-group"]?.classList.toggle("hidden", plan !== "free");
    els["premium-theme-group"]?.classList.toggle("hidden", plan !== "premium");
  }

  function syncAddonInputs(limits) {
    const bundleChecked = isAddonChecked("addon_bundle");
    const createOnly = state.mode === "create" || state.mode === "renew";

    if (els["addon_photo_qty"]) {
      const enabled = isAddonChecked("addon_photo");
      const maxExtra = Math.max(0, CONFIG.MAX_WALL_PHOTOS - limits.baseWallPhotos);
      els["addon_photo_qty"].disabled = !enabled || !createOnly;
      els["addon_photo_qty"].max = String(maxExtra);
      if (!enabled) els["addon_photo_qty"].value = "0";
    }
    if (els["addon_cta_qty"]) {
      const enabled = isAddonChecked("addon_cta");
      const maxExtra = Math.max(0, CONFIG.MAX_CTAS - (CONFIG.BASE_LIMITS[limits.plan]?.ctas || 3));
      els["addon_cta_qty"].disabled = !enabled || !createOnly;
      els["addon_cta_qty"].max = String(maxExtra);
      if (!enabled) els["addon_cta_qty"].value = "0";
    }
    if (els["addon_marquee_enabled"]) {
      els["addon_marquee_enabled"].disabled = bundleChecked || !createOnly;
      if (bundleChecked) els["addon_marquee_enabled"].checked = false;
    }
    if (els["addon_update_unlimited_enabled"]) {
      els["addon_update_unlimited_enabled"].disabled = bundleChecked || !createOnly;
      if (bundleChecked) els["addon_update_unlimited_enabled"].checked = false;
    }
    if (state.mode === "update") {
      ["addon_photo_enabled", "addon_cta_enabled", "addon_marquee_enabled", "addon_update_unlimited_enabled", "addon_bundle_enabled", "addon_agent_upgrade_enabled"].forEach(id => {
        if (els[id]) els[id].disabled = true;
      });
    }
  }

  function syncMarqueeSection() {
    els["marquee-section"]?.classList.toggle("hidden", !isMarqueeEnabled());
  }

  function syncSummary(limits) {
    const set = (id, v) => { if (els[id]) els[id].textContent = v; };
    set("summary-plan-pill", limits.planLabel);
    set("summary-photo-pill", `照片牆：${limits.wallPhotos}`);
    set("summary-cta-pill", `CTA：${limits.ctas}`);
    set("summary-plan-name", limits.planLabel);
    set("summary-photo-count", String(limits.wallPhotos));
    set("summary-cta-count", String(limits.ctas));
    set("summary-marquee-status", isMarqueeEnabled() ? "已開啟" : "未開啟");
  }

  function syncQuoteByMode() {
    if (state.mode === "create") syncCreateQuote();
    else if (state.mode === "update") syncUpdateQuote();
    else if (state.mode === "renew") syncRenewQuote();
  }

  function syncCreateQuote() {
    const limits = getLimitsCreate();
    const items = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const total = limits.planPrice + addonAmount;
    if (els["quote-kicker"]) els["quote-kicker"].textContent = "即時報價";
    if (els["quote-title"]) els["quote-title"].textContent = "目前費用";
    if (els["quote-state-text"]) els["quote-state-text"].textContent = `${limits.planLabel}｜${money(total)}`;
    if (els["quote-plan-amount"]) els["quote-plan-amount"].textContent = money(limits.planPrice);
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = money(addonAmount);
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = money(total);
    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!items.length) {
        els["quote-addon-breakdown"].appendChild(Object.assign(document.createElement("span"), { textContent: "尚未選擇加購" }));
      } else {
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          row.innerHTML = `<span>${escapeHtml(item.name)}${item.qty > 1 ? ` × ${item.qty}` : ""}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
    state.quote = { mode: "create", planAmount: limits.planPrice, addonAmount, totalAmount: total, quoteItems: items };
  }

  function syncUpdateQuote() {
    const elig = state.updateFlow;
    if (els["quote-kicker"]) els["quote-kicker"].textContent = "更新資格";
    if (els["quote-title"]) els["quote-title"].textContent = elig.requiresPayment ? "本次更新費用" : "本次更新方式";
    if (els["quote-state-text"]) els["quote-state-text"].textContent = elig.reasonText || (elig.canSubmitDirectly ? "可直接更新" : "需先建立付款資訊");
    if (els["quote-plan-amount"]) els["quote-plan-amount"].textContent = elig.requiresPayment ? money(elig.updateFeeAmount) : "NT$ 0";
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = "—";
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = elig.requiresPayment ? money(elig.updateFeeAmount) : "免費";
    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      const row = document.createElement("div");
      row.className = "quote-breakdown-row";
      row.innerHTML = `<span>${escapeHtml(elig.reasonText || "請確認更新方式")}</span><strong>${elig.requiresPayment ? money(elig.updateFeeAmount) : "免費"}</strong>`;
      els["quote-addon-breakdown"].appendChild(row);
    }
  }

  function syncRenewQuote() {
    const targetPlan = state.renewFlow.targetPlan || getSelectedPlan() || "free";
    const basePrice = CONFIG.BASE_LIMITS[targetPlan]?.price || 1500;
    const addonItems = getAddonItemsForQuote(getLimitsRenew());
    const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const unlimitedFee = state.renewFlow.renewUnlimitedUpdate ? 300 : 0;
    let total = basePrice + addonAmount + unlimitedFee;

    const originalPlan = state.runtime.renewCard?.plan;
    let planDiffFee = 0;
    if (originalPlan && originalPlan !== targetPlan) {
      const originalPrice = CONFIG.BASE_LIMITS[originalPlan]?.price || 0;
      planDiffFee = Math.max(0, basePrice - originalPrice);
      total = planDiffFee + addonAmount + unlimitedFee;
    }

    if (els["quote-kicker"]) els["quote-kicker"].textContent = "續約報價";
    if (els["quote-title"]) els["quote-title"].textContent = "續約費用";
    if (els["quote-state-text"]) els["quote-state-text"].textContent = `${CONFIG.BASE_LIMITS[targetPlan]?.label || targetPlan} 續約`;
    if (els["quote-plan-amount"]) els["quote-plan-amount"].textContent = money(planDiffFee > 0 ? planDiffFee : basePrice);
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = money(addonAmount + unlimitedFee);
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = money(total);
    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (planDiffFee > 0) {
        const row = document.createElement("div");
        row.className = "quote-breakdown-row";
        row.innerHTML = `<span>方案差價 (${escapeHtml(originalPlan)} → ${escapeHtml(targetPlan)})</span><strong>${money(planDiffFee)}</strong>`;
        els["quote-addon-breakdown"].appendChild(row);
      }
      addonItems.forEach(item => {
        const row = document.createElement("div");
        row.className = "quote-breakdown-row";
        row.innerHTML = `<span>${escapeHtml(item.name)}${item.qty > 1 ? ` × ${item.qty}` : ""}</span><strong>${money(item.amount)}</strong>`;
        els["quote-addon-breakdown"].appendChild(row);
      });
      if (unlimitedFee > 0) {
        const row = document.createElement("div");
        row.className = "quote-breakdown-row";
        row.innerHTML = `<span>續用無限更新</span><strong>${money(unlimitedFee)}</strong>`;
        els["quote-addon-breakdown"].appendChild(row);
      }
      if (!planDiffFee && !addonItems.length && !unlimitedFee) {
        const row = document.createElement("div");
        row.className = "quote-breakdown-row";
        row.innerHTML = `<span>續約主方案</span><strong>${money(basePrice)}</strong>`;
        els["quote-addon-breakdown"].appendChild(row);
      }
    }
    state.quote = { mode: "renew", planAmount: basePrice, addonAmount, totalAmount: total, planDiffFee, unlimitedUpdateFee: unlimitedFee, quoteItems: addonItems };
  }

  function buildCreateQuoteSummary() {
    const limits = getLimitsCreate();
    const items = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    return {
      plan: limits.plan,
      plan_label: limits.planLabel,
      plan_amount: limits.planPrice,
      addon_amount: addonAmount,
      total_amount: limits.planPrice + addonAmount,
      addon_items: items
    };
  }

  async function getFirebase() {
    if (_fb) return _fb;
    try {
      _fb = await import(CONFIG.FIREBASE_MODULE);
      return _fb;
    } catch (err) {
      console.error("[HSC] firebase.js import failed:", err);
      throw new Error("圖片上傳模組載入失敗");
    }
  }

  async function uploadPhotoToFirebase(key, file) {
    const token = Date.now() + "_" + Math.random().toString(36).slice(2);
    state.photoUploadTokens[key] = token;
    state.photoUploadState[key] = "uploading";
    updateUploadBadge(key, "uploading", "上傳中…");
    try {
      const fb = await getFirebase();
      await fb.ensureAuth();
      const fileName = `${key}.jpg`;
      const cardId = state.tempCardId;
      const url = await fb.uploadImage(cardId, file, fileName);
      if (state.photoUploadTokens[key] !== token) return;
      state.photoRealUrls[key] = url;
      state.photoUploadState[key] = "done";
      updateUploadBadge(key, "done", "已上傳 ✓");
      return url;
    } catch (err) {
      if (state.photoUploadTokens[key] !== token) return;
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

  async function waitAllUploads() {
    const keys = Object.keys(state.photoUploadState);
    for (const key of keys) {
      const s = state.photoUploadState[key];
      const hasFile = !!state.photoFiles[key];
      if (!hasFile) continue;
      if (s === "pending" || s === "uploading") {
        await new Promise((resolve, reject) => {
          const start = Date.now();
          const check = setInterval(() => {
            const cur = state.photoUploadState[key];
            if (cur === "done") { clearInterval(check); resolve(); return; }
            if (cur === "error") { clearInterval(check); reject(new Error(`圖片上傳失敗：${key}`)); return; }
            if (Date.now() - start > 30000) { clearInterval(check); reject(new Error(`圖片上傳逾時：${key}`)); }
          }, 300);
        });
      }
      if (state.photoUploadState[key] === "error") {
        throw new Error(`圖片 ${key} 上傳失敗，請重新選取後再送出。`);
      }
    }
  }

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
      { title: "Logo", desc: "固定 1 張，套用到成品卡 logo。", keys: ["logo"] },
      { title: "照片牆", desc: `本次可上傳 ${wallLimit} 張（不含個人照與 Logo）`, keys: Array.from({ length: wallLimit }, (_, i) => `photo${i + 1}`) }
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
    void sectionTitle;
    const frag = els.photoTemplate.content.cloneNode(true);
    const card = frag.querySelector(".photo-card");
    const title = frag.querySelector(".photo-title");
    const badge = frag.querySelector(".badge");
    const fileInput = frag.querySelector(".photo-file-input");
    const previewImage = frag.querySelector(".preview-image");
    const previewEmpty = frag.querySelector(".preview-empty");
    const tools = frag.querySelector(".photo-tools");
    const zoomRange = frag.querySelector(".zoom-range");
    const rotateLeft = frag.querySelector(".rotate-left");
    const rotateRight = frag.querySelector(".rotate-right");
    const moveLeft = frag.querySelector(".move-left");
    const moveRight = frag.querySelector(".move-right");
    const moveUp = frag.querySelector(".move-up");
    const moveDown = frag.querySelector(".move-down");
    const resetBtn = frag.querySelector(".reset-photo");

    card.dataset.photoKey = key;
    title.textContent = ({ avatar: "個人照", logo: "Logo" })[key] || `照片牆 ${index}`;
    fileInput.dataset.photoKey = key;
    zoomRange.dataset.photoKey = key;
    zoomRange.value = String(state.photoMeta[key]?.scale || 1);

    fileInput.addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      state.photoFiles[key] = file;
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
      uploadPhotoToFirebase(key, file).catch(err => { setStatus(`圖片上傳失敗（${key}）：${err.message}`, "error"); });
    });

    zoomRange.addEventListener("input", () => {
      state.photoMeta[key].scale = clampNumber(zoomRange.value, 0.5, 3, 1);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });

    rotateLeft.addEventListener("click", () => {
      state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate - 90, -180, 180, 0);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });
    rotateRight.addEventListener("click", () => {
      state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate + 90, -180, 180, 0);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });
    moveLeft.addEventListener("click", () => {
      state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x - 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });
    moveRight.addEventListener("click", () => {
      state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x + 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });
    moveUp.addEventListener("click", () => {
      state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y - 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });
    moveDown.addEventListener("click", () => {
      state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y + 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });
    resetBtn.addEventListener("click", () => {
      state.photoMeta[key] = { ...DEFAULT_PHOTO_META };
      zoomRange.value = "1";
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
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
      if (us === "done") { badge.textContent = "已上傳 ✓"; badge.dataset.uploadState = "done"; }
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
    const scale = clampNumber(meta.scale, 0.5, 3, 1);
    const rotate = clampNumber(meta.rotate, -180, 180, 0);
    const x = ((meta.x ?? 0.5) - 0.5) * 40;
    const y = ((meta.y ?? 0.5) - 0.5) * 40;
    img.style.transform = `translate(${x}px,${y}px) scale(${scale}) rotate(${rotate}deg)`;
  }

  function renderCtas(limit) {
    if (!els["cta-slots"] || !els.ctaTemplate) return;
    const currentDomValues = collectCurrentCtaValues();
    els["cta-slots"].innerHTML = "";
    state.ctaCount = limit;

    for (let i = 1; i <= limit; i++) {
      const frag = els.ctaTemplate.content.cloneNode(true);
      const label = frag.querySelector(".cta-title-label");
      const textInput = frag.querySelector(".cta-label-input");
      const urlInput = frag.querySelector(".cta-url-input");

      label.textContent = `CTA 按鈕 ${i}`;
      textInput.id = `cta_text_${i}`;
      urlInput.id = `cta_link_${i}`;
      textInput.value = currentDomValues[`cta_text_${i}`] || state.draftValues[`cta_text_${i}`] || "";
      urlInput.value = currentDomValues[`cta_link_${i}`] || state.draftValues[`cta_link_${i}`] || "";

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

  function updatePreview() {
    const scope = els["preview-theme-scope"];
    if (!scope) return;
    ensureRendererAlias();
    const renderer = window.HSCCardRenderer || window.HscCardRenderer;
    if (!renderer || typeof renderer.renderCard !== "function") {
      scope.innerHTML = `<div class="renderer-error">預覽元件尚未載入完成，請重新整理頁面。</div>`;
      return;
    }
    try {
      renderer.renderCard(buildPreviewData(), {
        mode: "form",
        root: scope,
        useExistingDom: false,
        qrMode: "preview",
        allowActions: false,
        previewUrl: CONFIG.SHOWCASE_URL,
        shareUrl: CONFIG.SHOWCASE_URL,
        cardUrl: CONFIG.SHOWCASE_URL
      });
      bindPreviewCollapseToggles(scope);
    } catch (err) {
      console.error("updatePreview error:", err);
      scope.innerHTML = `<div class="renderer-error">預覽顯示失敗：${escapeHtml(err.message || "請稍後再試")}</div>`;
    }
  }

  function buildPreviewData() {
    const limits = getLimits();
    const theme = getThemeSelection();
    const data = {
      name: valueOf("display_name"),
      unit: valueOf("unit"),
      title: valueOf("title"),
      slogan: valueOf("intro"),
      services: valueOf("services"),
      experience: valueOf("experience"),
      phone: normalizePhone(valueOf("phone")),
      email: valueOf("email"),
      address: valueOf("address"),
      website: valueOf("website"),
      line_url: valueOf("line_url"),
      line_oa: valueOf("line_oa"),
      wechat_id: valueOf("wechat_id"),
      video1: valueOf("video1"),
      video2: valueOf("video2"),
      video3: valueOf("video3"),
      social1: valueOf("social1"),
      social2: valueOf("social2"),
      social3: valueOf("social3"),
      plan: theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,
      marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",
      photo_limit: limits.wallPhotos,
      cta_limit: limits.ctas,
      preview_url: CONFIG.SHOWCASE_URL,
      share_url: CONFIG.SHOWCASE_URL,
      card_url: CONFIG.SHOWCASE_URL,
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
      if (url) data[`photo${i}_url`] = url;
    }
    for (let i = 1; i <= limits.ctas; i++) {
      data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      data[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return data;
  }

  function buildPhotoMetaMap() {
    const out = { avatar: normalizePhotoMeta(state.photoMeta.avatar), logo: normalizePhotoMeta(state.photoMeta.logo) };
    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) out[`photo${i}`] = normalizePhotoMeta(state.photoMeta[`photo${i}`]);
    return out;
  }

  function bindPreviewCollapseToggles(root) {
    setupPreviewBlockClamp(root, "[data-block-service]", 140);
    setupPreviewBlockClamp(root, "[data-block-exp]", 180);
  }

  function setupPreviewBlockClamp(root, selector, collapsedHeight) {
    const block = root.querySelector(selector);
    if (!block || block.style.display === "none") return;
    const next = block.nextElementSibling;
    if (next && next.classList.contains("preview-more-toggle")) next.remove();
    block.style.maxHeight = "";
    block.style.overflow = "";
    block.classList.remove("is-collapsed", "is-expanded");
    requestAnimationFrame(() => {
      if (block.scrollHeight <= collapsedHeight + 8) return;
      block.style.maxHeight = `${collapsedHeight}px`;
      block.style.overflow = "hidden";
      block.classList.add("is-collapsed");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost-btn mini preview-more-toggle";
      btn.textContent = "展開更多";
      btn.addEventListener("click", () => {
        if (block.classList.contains("is-expanded")) {
          block.classList.replace("is-expanded", "is-collapsed");
          block.style.maxHeight = `${collapsedHeight}px`;
          block.style.overflow = "hidden";
          btn.textContent = "展開更多";
        } else {
          block.classList.replace("is-collapsed", "is-expanded");
          block.style.maxHeight = "none";
          block.style.overflow = "visible";
          btn.textContent = "收合";
        }
      });
      block.insertAdjacentElement("afterend", btn);
    });
  }

  function validateBeforeSubmit() {
    if (state.mode === "create") return validateCreateBeforeSubmit();
    if (state.mode === "update") return validateUpdateBeforeSubmit();
    if (state.mode === "renew") return validateRenewBeforeSubmit();
    return false;
  }

  function validateCreateBeforeSubmit() {
    if (!valueOf("invite_code")) {
      setStatus("缺少邀請資訊，請確認是從正確的連結進入。", "error");
      return false;
    }
    if (!valueOf("display_name")) { setStatus("請填寫姓名／品牌名稱。", "error"); return false; }
    if (!valueOf("phone")) { setStatus("請填寫電話。", "error"); return false; }
    const limits = getLimitsCreate();
    for (let i = 1; i <= limits.ctas; i++) {
      const textVal = valueOf(`cta_text_${i}`);
      const linkVal = valueOf(`cta_link_${i}`);
      if (textVal && !linkVal) { setStatus(`CTA 按鈕第 ${i} 組：請補上按鈕連結。`, "error"); return false; }
      if (!textVal && linkVal) { setStatus(`CTA 按鈕第 ${i} 組：請補上按鈕文字。`, "error"); return false; }
      if (linkVal && !isLooksLikeUrl(linkVal)) { setStatus(`CTA 按鈕第 ${i} 組：請填寫正確連結。`, "error"); return false; }
    }
    if (isMarqueeEnabled() && !valueOf("marquee_text")) { setStatus("已開啟跑馬燈功能，請填入跑馬燈內容。", "error"); return false; }
    if (isAddonChecked("addon_photo") && getAddonQty("addon_photo_qty") <= 0) { setStatus("已勾選照片牆加購，請輸入加購張數。", "error"); return false; }
    if (isAddonChecked("addon_cta") && getAddonQty("addon_cta_qty") <= 0) { setStatus("已勾選 CTA 按鈕加購，請輸入加購數量。", "error"); return false; }
    return true;
  }

  function validateUpdateBeforeSubmit() {
    if (state.updateFlow.cardExpired) {
      setStatus("卡片已到期，請先續約。", "error");
      return false;
    }
    if (!state.updateFlow.canSubmitDirectly && !state.updateFlow.requiresPayment) {
      setStatus("目前無法判斷更新資格，請重新整理後再試。", "error");
      return false;
    }
    return true;
  }

  function validateRenewBeforeSubmit() {
    if (!state.renewFlow.targetPlan) {
      setStatus("請選擇續約方案。", "error");
      return false;
    }
    return true;
  }

  function isLooksLikeUrl(str) {
    if (!str) return true;
    const s = str.trim();
    if (/^(https?:\/\/|line:|tel:|mailto:)/i.test(s)) return true;
    if (/^www\./i.test(s)) return true;
    return false;
  }

  function buildCreatePayload() {
    const limits = getLimitsCreate();
    const theme = getThemeSelection();
    const addonItems = getAddonItemsForQuote(limits);
    const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalAmount = limits.planPrice + addonAmount;
    const shared = buildSharedCardData();
    const payload = {
      action: CONFIG.CREATE_ACTION,
      tenant: "angel",
      invite_code: valueOf("invite_code"),
      referrer: valueOf("ref"),
      service_agent: valueOf("ref"),
      agent_type: valueOf("ref") ? "referral" : "customer",
      share_source: "form",
      share_channel: "direct",
      ...shared,
      plan: theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,
      marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",
      photo_limit: limits.wallPhotos,
      cta_limit: limits.ctas,
      amount: totalAmount,
      plan_amount: limits.planPrice,
      addon_amount: addonAmount,
      total_amount: totalAmount,
      addon_items: addonItems,
      features_json: {
        photo_meta: buildPhotoMetaMap(),
        preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        addon_items: addonItems,
        order_summary: buildCreateQuoteSummary()
      }
    };
    if (state.photoRealUrls.avatar) payload.avatar_url = state.photoRealUrls.avatar;
    if (state.photoRealUrls.logo) payload.logo_url = state.photoRealUrls.logo;
    for (let i = 1; i <= limits.wallPhotos; i++) {
      if (state.photoRealUrls[`photo${i}`]) payload[`photo${i}_url`] = state.photoRealUrls[`photo${i}`];
    }
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return payload;
  }

  async function submitCreate() {
    const payload = buildCreatePayload();
    if (!validateCreateBeforeSubmit()) return;

    showProgress(true);
    hideSuccessPanel();
    setProgressStep(1, "正在等待圖片上傳完成…");

    try {
      await waitAllUploads();
      setProgressStep(2, "正在送出申請資料…");

      const createRes = await postToGas(payload);
      if (!createRes.ok) throw new Error(createRes.error || "建立名片失敗");

      const cardId = extractCardId(createRes);
      const paymentId = extractPaymentId(createRes);
      if (!cardId) throw new Error("系統沒有回傳名片序號");

      setProgressStep(3, "正在建立付款期限…");
      await postToGas({ action: CONFIG.DELIVER_ACTION, card_id: cardId });

      setProgressStep(4, "正在整理付款通知…");
      let paymentNotice = "";
      try {
        const noticeRes = await postToGas({ action: CONFIG.PAYMENT_NOTICE_ACTION, payment_id: paymentId, card_id: cardId });
        paymentNotice = noticeRes?.copy_text || noticeRes?.payment_notice?.copy_text || "";
      } catch (e) { console.warn(e); }

      const previewUrl = `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`;
      const dueIso = new Date();
      dueIso.setDate(dueIso.getDate() + 3);
      const dueDateStr = formatDateYMD(dueIso);

      const result = {
        cardId, paymentId, previewUrl, paymentDueAt: dueIso.toISOString(), dueDateStr,
        totalAmount: payload.total_amount, planLabel: CONFIG.BASE_LIMITS[payload.plan]?.label || payload.plan,
        customerName: payload.name, paymentNotice, addonAmount: payload.addon_amount
      };
      state.lastSubmitResult = result;

      setProgressStep(5, "✅ 申請完成");
      showCreateSuccessPanel(result);
      setStatus("名片已成功建立，請複製下方資訊回覆客服。", "success");
      localStorage.removeItem(CONFIG.DRAFT_KEY);
    } catch (err) {
      console.error(err);
      setStatus("送出失敗：" + err.message, "error");
    } finally {
      showProgress(false);
      if (els["progress-success-panel"] && state.lastSubmitResult) {
        els["progress-success-panel"].classList.remove("hidden");
      }
    }
  }

  function buildCreatePrimaryNoticeText(result) {
    return `您好，我是 ${result.customerName}，已完成天使幸福智慧名片申請！\n📋 名片序號：${result.cardId}\n💳 方案：${result.planLabel}，總金額 ${money(result.totalAmount)}\n🔗 成品預覽：${result.previewUrl}\n⏰ 付款期限：${result.dueDateStr} 前，請協助確認並開通名片，謝謝！`;
  }

 function buildCreateSecondaryNoticeText(result) {
  return `【天使幸福智慧名片 報價摘要】
名片序號：${result.cardId}
方案：${result.planLabel} ${money(result.totalAmount)}
付款期限：${result.dueDateStr}
預覽連結：${result.previewUrl}

付款與開通請以官方通知流程為準
本系統不會透過私訊更改收款帳號`;
}

  function resolveUpdateEligibilityState(eligData) {
    const card = state.runtime.updateCard;
    const expiresAt = card?.expires_at || card?.expiry_date;
    const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
    const freeRemaining = Number(eligData?.free_update_remaining ?? 0);
    const isUnlimited = !!eligData?.has_unlimited_update || !!card?.has_unlimited_update;

    let requiresPayment = false;
    let canSubmitDirectly = false;
    let deductFreeCount = false;
    let reasonText = "";
    let updateFeeAmount = 0;

    if (expired) {
      reasonText = "卡片已到期，請先續約後再更新。";
    } else if (isUnlimited) {
      canSubmitDirectly = true;
      reasonText = "無限更新資格有效，可直接更新。";
    } else if (freeRemaining > 0) {
      canSubmitDirectly = true;
      deductFreeCount = true;
      reasonText = `尚有 ${freeRemaining} 次免費更新次數，可直接更新。`;
    } else {
      requiresPayment = true;
      updateFeeAmount = eligData?.update_fee_amount || 300;
      reasonText = `免費更新次數已用完，需付費 ${money(updateFeeAmount)} 進行單次更新。`;
    }

    state.updateFlow = {
      cardExpired: expired,
      freeRemaining,
      isUnlimited,
      requiresPayment,
      canSubmitDirectly,
      deductFreeCount,
      updateFeeAmount,
      expiresAt: expiresAt || "",
      reasonText
    };
  }

  function renderUpdateEligibilityPanel() {
    const panel = els["mode-info-panel"];
    if (!panel) return;
    const f = state.updateFlow;
    panel.innerHTML = `
      <div class="mode-info-block"><div class="mode-info-label">卡片狀態</div><div class="mode-info-value">${f.cardExpired ? "⚠️ 已到期" : "✅ 有效期內"}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">免費更新次數</div><div class="mode-info-value">${f.isUnlimited ? "無限次" : f.freeRemaining}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">更新資格</div><div class="mode-info-value">${f.reasonText}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">建議操作</div><div class="mode-info-value">${f.canSubmitDirectly ? "可直接送出更新" : f.requiresPayment ? "先建立付款資訊" : "請先續約"}</div></div>
    `;
    if (els["mode-info-kicker"]) els["mode-info-kicker"].textContent = "更新資訊";
    if (els["mode-info-title"]) els["mode-info-title"].textContent = "更新資格摘要";
    if (els["mode-info-desc"]) els["mode-info-desc"].textContent = f.reasonText;
    if (els["mode-inline-tip"]) els["mode-inline-tip"].textContent = f.canSubmitDirectly ? "確認內容無誤後，可直接送出更新。" : "若本次需付費，系統會先建立付款資訊。";
  }

  async function createUpdatePaymentIfNeeded() {
    if (!state.updateFlow.requiresPayment) return null;
    const cardId = state.modeContext.cardId;
    const res = await postToGas({ action: CONFIG.UPDATE_CREATE_PAYMENT_ACTION, card_id: cardId, amount: state.updateFlow.updateFeeAmount });
    if (!res.ok) throw new Error(res.error || "建立更新付款資訊失敗");
    return res;
  }

  async function submitUpdate() {
    if (!validateUpdateBeforeSubmit()) return;
    showProgress(true);
    hideSuccessPanel();
    setProgressStep(1, "檢查更新資格…");

    try {
      const cardId = state.modeContext.cardId;
      const token = state.modeContext.updateToken;

      if (state.updateFlow.cardExpired) throw new Error("卡片已到期，無法更新。");

      if (state.updateFlow.requiresPayment) {
        setProgressStep(2, "建立付款資訊…");
        const paymentRes = await createUpdatePaymentIfNeeded();
        const paymentId = paymentRes?.payment_id || "";
        const dueAt = paymentRes?.due_at || new Date(Date.now() + 3 * 86400000).toISOString();
        const result = {
          cardId, paymentId, paymentDueAt: dueAt, dueDateStr: formatDateYMD(dueAt),
          updateFeeAmount: state.updateFlow.updateFeeAmount, requiresPayment: true,
          customerName: valueOf("display_name") || "您"
        };
        state.lastSubmitResult = result;
        setProgressStep(5, "付款資訊已建立");
        showUpdateSuccessPanel(result);
        setStatus("已建立更新付款資訊，請完成付款後再進行更新。", "success");
        return;
      }

      setProgressStep(2, "送出更新資料…");
      const updatePayload = buildUpdatePayload();
      const updateRes = await postToGas({ action: CONFIG.UPDATE_SUBMIT_ACTION, card_id: cardId, update_token: token, ...updatePayload });
      if (!updateRes.ok) throw new Error(updateRes.error || "更新失敗");

      const result = {
        cardId, updatedCard: updateRes.card || updateRes,
        deductFreeCount: state.updateFlow.deductFreeCount,
        isUnlimited: state.updateFlow.isUnlimited,
        customerName: valueOf("display_name") || "您"
      };
      state.lastSubmitResult = result;
      setProgressStep(5, "更新完成");
      showUpdateSuccessPanel(result);
      setStatus("名片已成功更新！", "success");
    } catch (err) {
      console.error(err);
      setStatus("更新失敗：" + err.message, "error");
    } finally {
      showProgress(false);
      if (els["progress-success-panel"] && state.lastSubmitResult) {
        els["progress-success-panel"].classList.remove("hidden");
      }
    }
  }

  function buildUpdatePayload() {
    const shared = buildSharedCardData();
    const theme = getThemeSelection();
    const limits = getLimitsUpdate();
    const payload = {
      ...shared,
      plan: theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,
      marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",
      photo_limit: limits.wallPhotos,
      cta_limit: limits.ctas
    };
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return payload;
  }

  function buildUpdateDoneText(result) {
    return `【名片更新完成通知】\n名片序號：${result.cardId}\n更新方式：${result.isUnlimited ? "無限更新" : result.deductFreeCount ? "免費次數更新" : "付費更新"}\n已成功套用最新內容。`;
  }

  function buildUpdatePaymentText(result) {
    return `【更新付款通知】\n名片序號：${result.cardId}\n付款單號：${result.paymentId}\n應付金額：${money(result.updateFeeAmount)}\n付款期限：${result.dueDateStr}\n請完成付款後通知客服進行更新。`;
  }

  function buildUpdateSummaryText(result) {
    return `更新摘要：${result.isUnlimited ? "無限更新" : result.deductFreeCount ? "使用免費次數" : "單次付費更新"}`;
  }

  function renderRenewSummaryPanel() {
    const panel = els["mode-info-panel"];
    if (!panel) return;
    const card = state.runtime.renewCard;
    const summary = state.runtime.renewPaymentSummary || {};
    panel.innerHTML = `
      <div class="mode-info-block"><div class="mode-info-label">原方案</div><div class="mode-info-value">${escapeHtml(card?.plan || "—")}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">原到期日</div><div class="mode-info-value">${card?.expires_at ? formatDateYMD(card.expires_at) : "—"}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">無限更新</div><div class="mode-info-value">${card?.has_unlimited_update ? "✅ 有" : "❌ 無"}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">既有加購</div><div class="mode-info-value">${escapeHtml(summary.addon_summary || "無")}</div></div>
    `;
    if (els["mode-info-kicker"]) els["mode-info-kicker"].textContent = "續約資訊";
    if (els["mode-info-title"]) els["mode-info-title"].textContent = "原卡片摘要";
    if (els["mode-info-desc"]) els["mode-info-desc"].textContent = "可依需求調整續約方案與延用功能。";
    if (els["mode-inline-tip"]) els["mode-inline-tip"].textContent = "確認方案與加購後送出，系統會建立續約付款資訊。";
  }

  function renderRenewControls() {
    const panel = els["renew-controls-panel"];
    if (!panel) return;
    panel.innerHTML = `
      <div class="renew-control-group">
        <label for="renew-target-plan">目標方案</label>
        <select id="renew-target-plan">
          <option value="free">自由搭配 NT$1,500</option>
          <option value="premium">精品設計 NT$2,000</option>
        </select>
      </div>
      <div class="renew-control-group">
        <label for="renew-unlimited-update">延用設定</label>
        <label style="margin:0;"><input type="checkbox" id="renew-unlimited-update" /> 續用無限更新 (+NT$300)</label>
      </div>
      <div class="renew-control-group">
        <label for="renew-term">續約年數</label>
        <select id="renew-term">
          <option value="1">1 年</option>
          <option value="2">2 年</option>
        </select>
      </div>
    `;
    const targetSelect = document.getElementById("renew-target-plan");
    const unlimitedCheck = document.getElementById("renew-unlimited-update");
    const termSelect = document.getElementById("renew-term");
    if (targetSelect) {
      targetSelect.value = state.renewFlow.targetPlan || "free";
      targetSelect.addEventListener("change", (e) => {
        state.renewFlow.targetPlan = e.target.value;
        const radio = document.querySelector(`input[name="plan"][value="${state.renewFlow.targetPlan}"]`);
        if (radio) radio.checked = true;
        refreshAll();
      });
    }
    if (unlimitedCheck) {
      unlimitedCheck.checked = state.renewFlow.renewUnlimitedUpdate;
      unlimitedCheck.addEventListener("change", (e) => {
        state.renewFlow.renewUnlimitedUpdate = e.target.checked;
        refreshAll();
      });
    }
    if (termSelect) {
      termSelect.value = String(state.renewFlow.renewTerm || 1);
      termSelect.addEventListener("change", (e) => {
        state.renewFlow.renewTerm = parseInt(e.target.value, 10);
        refreshAll();
      });
    }
  }

  function collectRenewSelectedAddons() {
    const items = getAddonItemsForQuote(getLimitsRenew());
    return items.map(i => ({ addon_code: i.code, quantity: i.qty, price: i.unit_price }));
  }

  async function requestRenewQuote() {
    const cardId = state.modeContext.cardId;
    const token = state.modeContext.renewToken;
    const payload = {
      action: CONFIG.RENEW_QUOTE_ACTION,
      card_id: cardId,
      renew_token: token,
      target_plan: state.renewFlow.targetPlan,
      selected_addons: collectRenewSelectedAddons(),
      renew_unlimited_update: state.renewFlow.renewUnlimitedUpdate,
      renew_term: state.renewFlow.renewTerm
    };
    const res = await postToGas(payload);
    if (!res.ok) throw new Error(res.error || "取得續約報價失敗");
    state.runtime.renewQuote = res;
    return res;
  }

  async function submitRenew() {
    if (!validateRenewBeforeSubmit()) return;
    showProgress(true);
    hideSuccessPanel();
    setProgressStep(1, "計算續約報價…");

    try {
      const quote = await requestRenewQuote();
      setProgressStep(2, "建立續約付款資訊…");

      const paymentPayload = {
        action: CONFIG.RENEW_CREATE_PAYMENT_ACTION,
        card_id: state.modeContext.cardId,
        renew_token: state.modeContext.renewToken,
        target_plan: state.renewFlow.targetPlan,
        selected_addons: collectRenewSelectedAddons(),
        renew_unlimited_update: state.renewFlow.renewUnlimitedUpdate,
        quote_items: quote.quote_items || [],
        total_amount: quote.total_amount || state.quote.totalAmount
      };
      const paymentRes = await postToGas(paymentPayload);
      if (!paymentRes.ok) throw new Error(paymentRes.error || "建立續約付款資訊失敗");

      const renewalId = paymentRes.renewal_id || paymentRes.id;
      const paymentId = paymentRes.payment_id || "";
      const dueAt = paymentRes.due_at || new Date(Date.now() + 3 * 86400000).toISOString();

      const result = {
        cardId: state.modeContext.cardId,
        renewalId,
        paymentId,
        paymentDueAt: dueAt,
        dueDateStr: formatDateYMD(dueAt),
        totalAmount: paymentPayload.total_amount,
        targetPlan: state.renewFlow.targetPlan,
        customerName: valueOf("display_name") || "您",
        quoteItems: quote.quote_items || []
      };
      state.lastSubmitResult = result;

      setProgressStep(5, "續約付款資訊已建立");
      showRenewSuccessPanel(result);
      setStatus("續約付款資訊已建立，請完成付款後續約生效。", "success");
    } catch (err) {
      console.error(err);
      setStatus("續約失敗：" + err.message, "error");
    } finally {
      showProgress(false);
      if (els["progress-success-panel"] && state.lastSubmitResult) {
        els["progress-success-panel"].classList.remove("hidden");
      }
    }
  }

  function buildRenewPaymentText(result) {
    return `【續約付款通知】\n名片序號：${result.cardId}\n續約單號：${result.renewalId}\n付款單號：${result.paymentId}\n目標方案：${result.targetPlan}\n應付總額：${money(result.totalAmount)}\n付款期限：${result.dueDateStr}\n請完成付款後通知客服開通續約。`;
  }

  function buildRenewQuoteText(result) {
    let itemsText = "";
    if (result.quoteItems && result.quoteItems.length) {
      itemsText = result.quoteItems.map(i => `${i.name} ${money(i.amount)}`).join("\n");
    }
    return `【續約報價摘要】\n名片序號：${result.cardId}\n目標方案：${result.targetPlan}\n總金額：${money(result.totalAmount)}\n${itemsText}`;
  }

  function buildRenewDoneText(result) {
    return `【續約完成通知】\n名片序號：${result.cardId}\n續約單號：${result.renewalId}\n新方案：${result.targetPlan}\n有效期已延長。`;
  }

  async function submit(e) {
    e.preventDefault();
    if (state.mode === "create") await submitCreate();
    else if (state.mode === "update") await submitUpdate();
    else if (state.mode === "renew") await submitRenew();
    else setStatus("目前模式不支援送出。", "error");
  }

  function resetSuccessPanel() {
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 編號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = "—";
    if (els["success-info-rows"]) els["success-info-rows"].innerHTML = "";
    if (els["success-due-alert"]) els["success-due-alert"].classList.add("hidden");
    if (els["success-preview-row"]) els["success-preview-row"].classList.add("hidden");
    if (els["success-summary-box"]) els["success-summary-box"].classList.add("hidden");
    if (els["success-footer-note"]) els["success-footer-note"].innerHTML = "";
    if (els["btn-copy-secondary-notice"]) els["btn-copy-secondary-notice"].classList.add("hidden");
    if (els["btn-copy-primary-notice"]) els["btn-copy-primary-notice"].textContent = "📋 複製通知";
    if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
  }

  function showSuccessPanel(result) {
    if (!result) return;
    if (state.mode === "create") showCreateSuccessPanel(result);
    else if (state.mode === "update") showUpdateSuccessPanel(result);
    else if (state.mode === "renew") showRenewSuccessPanel(result);
    if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
  }
function renderCreateSuccessFooterNote(els) {
  if (!els["success-footer-note"]) return;

  els["success-footer-note"].innerHTML = `
    <div style="
      margin-top:14px;
      padding:16px;
      border-radius:16px;
      background:linear-gradient(135deg,#fffdf9,#fff7ec);
      border:1.5px solid rgba(240,160,75,.28);
      display:flex;
      flex-direction:column;
      gap:14px;
    ">

      <div style="text-align:center;">
        <div style="font-size:22px;">✅</div>
        <div style="font-size:15px;font-weight:900;">
          已收到你的申請，我們會協助你完成開通
        </div>
      </div>

      <div style="padding:12px;border-radius:12px;background:#fff;">
        <b>接下來的流程</b><br>
        1️⃣ 客服會提供付款資訊給你<br>
        2️⃣ 完成付款後開通名片
      </div>

      <div style="padding:12px;border-radius:12px;background:#fff8ec;border:1px solid #f0a04b;">
        🔒 <b>付款安全提醒</b><br>
        付款與開通請以官方通知流程為準，避免被詐騙
      </div>

      <button onclick="window.open('https://lin.ee/G3VJoRm')"
        style="background:#1ac964;color:#fff;border:none;padding:12px;border-radius:12px;font-weight:900;">
        💬 聯繫客服
      </button>
    </div>
  `;
}
  function showCreateSuccessPanel(result) {
    resetSuccessPanel();
    if (els["success-header-icon"]) els["success-header-icon"].textContent = "🎉";
    if (els["success-header-title"]) els["success-header-title"].textContent = "名片申請成功！";
    if (els["success-header-sub"]) els["success-header-sub"].textContent = "請複製以下資訊並回覆客服，協助確認付款與開通名片。";
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 名片序號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = result.cardId || "—";
    if (els["success-info-rows"]) {
      els["success-info-rows"].innerHTML = `
        <div class="success-info-row"><span class="label">申請人</span><span class="value">${escapeHtml(result.customerName)}</span></div>
        <div class="success-info-row"><span class="label">方案</span><span class="value">${escapeHtml(result.planLabel)}</span></div>
        <div class="success-info-row"><span class="label">總金額</span><span class="value">${money(result.totalAmount)}</span></div>
        ${result.paymentId ? `<div class="success-info-row"><span class="label">付款單號</span><span class="value">${escapeHtml(result.paymentId)}</span></div>` : ""}
      `;
    }
    if (els["success-due-alert"]) {
      els["success-due-alert"].classList.remove("hidden");
      if (els["success-due-text"]) els["success-due-text"].textContent = `付款期限：${result.dueDateStr || "—"}`;
    }
    if (els["success-preview-row"]) {
      els["success-preview-row"].classList.remove("hidden");
      if (els["progress-preview-link"]) {
        els["progress-preview-link"].href = result.previewUrl || "";
        els["progress-preview-link"].textContent = result.previewUrl || "（建立後顯示）";
      }
    }
    if (els["success-summary-box"]) {
      els["success-summary-box"].classList.remove("hidden");
      if (els["success-summary-content"]) {
        els["success-summary-content"].innerHTML = `
          <div class="quote-breakdown-row"><span>主方案</span><strong>${money(result.totalAmount - (result.addonAmount || 0))}</strong></div>
          <div class="quote-breakdown-row"><span>加購小計</span><strong>${money(result.addonAmount || 0)}</strong></div>
          <div class="quote-breakdown-row"><span>應付總額</span><strong>${money(result.totalAmount)}</strong></div>
        `;
      }
    }
    renderCreateSuccessFooterNote(els);  
    setSuccessActionLabels("create", result);
  }

  function showUpdateSuccessPanel(result) {
    resetSuccessPanel();
    if (result.requiresPayment) {
      if (els["success-header-icon"]) els["success-header-icon"].textContent = "💳";
      if (els["success-header-title"]) els["success-header-title"].textContent = "已建立更新付款資訊";
      if (els["success-header-sub"]) els["success-header-sub"].textContent = "請先完成本次單次更新付款。";
      if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 名片序號";
      if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = result.cardId || "—";
      if (els["success-info-rows"]) {
        els["success-info-rows"].innerHTML = `
          <div class="success-info-row"><span class="label">付款單號</span><span class="value">${escapeHtml(result.paymentId)}</span></div>
          <div class="success-info-row"><span class="label">更新方式</span><span class="value">單次付費更新</span></div>
          <div class="success-info-row"><span class="label">應付金額</span><span class="value">${money(result.updateFeeAmount)}</span></div>
        `;
      }
      if (els["success-due-alert"]) {
        els["success-due-alert"].classList.remove("hidden");
        if (els["success-due-text"]) els["success-due-text"].textContent = `付款期限：${result.dueDateStr || "—"}`;
      }
      if (els["success-summary-box"]) {
        els["success-summary-box"].classList.remove("hidden");
        if (els["success-summary-content"]) {
          els["success-summary-content"].innerHTML = `<div class="quote-breakdown-row"><span>本次更新費用</span><strong>${money(result.updateFeeAmount)}</strong></div>`;
        }
      }
      setSuccessActionLabels("update_payment", result);
    } else {
      if (els["success-header-icon"]) els["success-header-icon"].textContent = "🛠️";
      if (els["success-header-title"]) els["success-header-title"].textContent = "名片更新完成";
      if (els["success-header-sub"]) els["success-header-sub"].textContent = "更新內容已套用到名片。";
      if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 名片序號";
      if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = result.cardId || "—";
      if (els["success-info-rows"]) {
        els["success-info-rows"].innerHTML = `
          <div class="success-info-row"><span class="label">是否需付款</span><span class="value">否</span></div>
          <div class="success-info-row"><span class="label">扣減次數</span><span class="value">${result.deductFreeCount ? "是" : "否"}</span></div>
          <div class="success-info-row"><span class="label">無限更新</span><span class="value">${result.isUnlimited ? "是" : "否"}</span></div>
        `;
      }
      if (els["success-preview-row"]) {
        els["success-preview-row"].classList.remove("hidden");
        const previewUrl = `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(result.cardId)}&view=1`;
        if (els["progress-preview-link"]) {
          els["progress-preview-link"].href = previewUrl;
          els["progress-preview-link"].textContent = previewUrl;
        }
      }
      setSuccessActionLabels("update_done", result);
    }
  }

  function showRenewSuccessPanel(result) {
    resetSuccessPanel();
    if (els["success-header-icon"]) els["success-header-icon"].textContent = "🔄";
    if (els["success-header-title"]) els["success-header-title"].textContent = "續約付款資訊已建立";
    if (els["success-header-sub"]) els["success-header-sub"].textContent = "請依下列資訊完成續約付款。";
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 續約單號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = result.renewalId || "—";
    if (els["success-info-rows"]) {
      els["success-info-rows"].innerHTML = `
        <div class="success-info-row"><span class="label">名片序號</span><span class="value">${escapeHtml(result.cardId)}</span></div>
        <div class="success-info-row"><span class="label">付款單號</span><span class="value">${escapeHtml(result.paymentId)}</span></div>
        <div class="success-info-row"><span class="label">應付金額</span><span class="value">${money(result.totalAmount)}</span></div>
        <div class="success-info-row"><span class="label">目標方案</span><span class="value">${escapeHtml(result.targetPlan)}</span></div>
      `;
    }
    if (els["success-due-alert"]) {
      els["success-due-alert"].classList.remove("hidden");
      if (els["success-due-text"]) els["success-due-text"].textContent = `付款期限：${result.dueDateStr || "—"}`;
    }
    if (els["success-summary-box"]) {
      els["success-summary-box"].classList.remove("hidden");
      if (els["success-summary-content"]) {
        let summaryHtml = "";
        if (result.quoteItems && result.quoteItems.length) {
          summaryHtml = result.quoteItems.map(i => `<div class="quote-breakdown-row"><span>${escapeHtml(i.name)}</span><strong>${money(i.amount)}</strong></div>`).join("");
        }
        summaryHtml += `<div class="quote-breakdown-row"><span>總計</span><strong>${money(result.totalAmount)}</strong></div>`;
        els["success-summary-content"].innerHTML = summaryHtml;
      }
    }
    setSuccessActionLabels("renew", result);
  }

  function setSuccessActionLabels(mode, result) {
    const primaryBtn = els["btn-copy-primary-notice"];
    const secondaryBtn = els["btn-copy-secondary-notice"];
    if (!primaryBtn) return;

    if (mode === "create") {
      primaryBtn.textContent = "📋 複製預覽＋付款通知";
      primaryBtn.onclick = async () => { await copyText(buildCreatePrimaryNoticeText(result)); setStatus("已複製通知。", "success"); };
      if (secondaryBtn) {
        secondaryBtn.classList.remove("hidden");
        secondaryBtn.textContent = "📄 複製報價＋付款資訊";
        secondaryBtn.onclick = async () => { await copyText(buildCreateSecondaryNoticeText(result)); setStatus("已複製摘要。", "success"); };
      }
    } else if (mode === "update_done") {
      primaryBtn.textContent = "📋 複製更新完成通知";
      primaryBtn.onclick = async () => { await copyText(buildUpdateDoneText(result)); setStatus("已複製通知。", "success"); };
      if (secondaryBtn) secondaryBtn.classList.add("hidden");
    } else if (mode === "update_payment") {
      primaryBtn.textContent = "📋 複製更新付款通知";
      primaryBtn.onclick = async () => { await copyText(buildUpdatePaymentText(result)); setStatus("已複製通知。", "success"); };
      if (secondaryBtn) {
        secondaryBtn.classList.remove("hidden");
        secondaryBtn.textContent = "📄 複製更新摘要";
        secondaryBtn.onclick = async () => { await copyText(buildUpdateSummaryText(result)); setStatus("已複製摘要。", "success"); };
      }
    } else if (mode === "renew") {
      primaryBtn.textContent = "📋 複製續約付款通知";
      primaryBtn.onclick = async () => { await copyText(buildRenewPaymentText(result)); setStatus("已複製通知。", "success"); };
      if (secondaryBtn) {
        secondaryBtn.classList.remove("hidden");
        secondaryBtn.textContent = "📄 複製續約報價摘要";
        secondaryBtn.onclick = async () => { await copyText(buildRenewQuoteText(result)); setStatus("已複製摘要。", "success"); };
      }
    }
  }

  function showProgress(show) {
    if (!els["submit-progress-overlay"]) return;
    els["submit-progress-overlay"].classList.toggle("hidden", !show);
    if (!show) {
      els.progressSteps.forEach(s => s.classList.remove("is-active", "is-done"));
      if (els["progress-fill"]) els["progress-fill"].style.width = "0%";
      if (els["progress-text"]) els["progress-text"].textContent = "正在整理資料，請稍候。";
    }
  }

  function setProgressStep(stepNo, text) {
    const total = 5;
    els.progressSteps.forEach(step => {
      const n = Number(step.dataset.step || 0);
      step.classList.toggle("is-active", n === stepNo);
      step.classList.toggle("is-done", n < stepNo);
    });
    if (els["progress-fill"]) els["progress-fill"].style.width = `${Math.round((stepNo / total) * 100)}%`;
    if (els["progress-text"] && text) els["progress-text"].textContent = text;
  }

  function setStatus(msg, stateName = "") {
    const el = els["form-status-strip"];
    if (!el) return;
    el.textContent = msg || "";
    if (msg) el.classList.add("visible");
    else el.classList.remove("visible");
    if (stateName) el.dataset.state = stateName;
    else delete el.dataset.state;
  }

  function hideSuccessPanel() {
    if (els["progress-success-panel"]) els["progress-success-panel"].classList.add("hidden");
  }

  function collectFormValues() {
    const out = {};
    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "radio") {
        if (el.checked) out[el.name] = el.value;
        return;
      }
      if (!el.id) return;
      out[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return out;
  }

  function saveDraft() {
    const values = collectFormValues();
    localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify({ values, photoMeta: state.photoMeta, mode: state.mode }));
  }

  function saveDraftSilently() { try { saveDraft(); } catch (_) {} }

  function restoreDraft() {
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(CONFIG.DRAFT_KEY) || "null"); } catch (_) {}
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
    if (draft.photoMeta && typeof draft.photoMeta === "object") state.photoMeta = draft.photoMeta;
    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
  }

  function clearDraft() {
    localStorage.removeItem(CONFIG.DRAFT_KEY);
    localStorage.removeItem(CONFIG.QUOTE_STORAGE_KEY);
    location.reload();
  }

  function bindStaticEvents() {
    if (els["smart-card-form"]) els["smart-card-form"].addEventListener("submit", submit);

    els.planRadios.forEach(r => r.addEventListener("change", () => {
      if (state.mode === "renew") state.renewFlow.targetPlan = r.value;
      refreshAll();
    }));
    els.addonCheckboxes.forEach(b => b.addEventListener("change", refreshAll));
    ["addon_photo_qty", "addon_cta_qty"].forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input", refreshAll);
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
        els[id].addEventListener("input", onLiveChange);
        els[id].addEventListener("change", onLiveChange);
      }
    });

    bindButton(els["btn-open-showcase"], () => window.open(CONFIG.SHOWCASE_URL, "_blank", "noopener"));
    bindButton(els["btn-toggle-mode"], () => {
      els["dev-mode-switcher"]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bindButton(els["btn-contact-service"], () => window.open(CONFIG.SERVICE_URL, "_blank", "noopener"));
    bindButton(els["progress-contact-service"], () => window.open(CONFIG.SERVICE_URL, "_blank", "noopener"));
    bindButton(els["btn-gold-contact"], () => window.open(CONFIG.SERVICE_URL, "_blank", "noopener"));
    bindButton(els["btn-gold-info"], () => alert("金牌級會員請聯繫客服瞭解完整權益。"));
    bindButton(els["btn-save-draft"], () => { saveDraft(); setStatus("草稿已暫存。", "success"); });
    bindButton(els["btn-clear-draft"], clearDraft);
    bindButton(els["btn-gold-copy"], async () => {
      await copyText("您好，我想瞭解金牌級會員的完整權益與適合方案。");
      setStatus("已複製金牌會員詢問文案。", "success");
    });

    bindButton(els["btn-mode-create"], () => switchModeByUrl("create"));
    bindButton(els["btn-mode-update"], () => switchModeByUrl("update"));
    bindButton(els["btn-mode-renew"], () => switchModeByUrl("renew"));
  }

  function bindButton(btn, handler) {
    if (btn) btn.addEventListener("click", handler);
  }

  function onLiveChange() {
    updatePreview();
    saveDraftSilently();
  }

  function formatDateYMD(input) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d.getTime())) throw new Error();
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    } catch (_) {
      const fb = new Date();
      fb.setDate(fb.getDate() + 3);
      return `${fb.getFullYear()}/${String(fb.getMonth() + 1).padStart(2, "0")}/${String(fb.getDate()).padStart(2, "0")}`;
    }
  }

  function money(v) { return `NT$ ${Number(v || 0).toLocaleString("zh-TW")}`; }

  async function copyText(str) {
    if (!str) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(str);
        return;
      }
    } catch (_) {}
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

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
      x: clampNumber(s.x, 0, 1, DEFAULT_PHOTO_META.x),
      y: clampNumber(s.y, 0, 1, DEFAULT_PHOTO_META.y),
      scale: clampNumber(s.scale, 0.5, 3, DEFAULT_PHOTO_META.scale),
      rotate: clampNumber(s.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
    };
  }

  function normalizePhone(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 9 && digits[0] !== "0") return `0${digits}`;
    return digits;
  }

  function isMarqueeEnabled() { return isAddonChecked("addon_marquee") || isAddonChecked("addon_bundle"); }
  function valueOf(id) {
    const el = document.getElementById(id) || els[id];
    return (el?.value || "").trim();
  }
  function getThemeSelection() {
    const plan = state.mode === "renew" ? (state.renewFlow.targetPlan || getSelectedPlan() || "free") : (getSelectedPlan() || "premium");
    if (plan === "free") {
      return {
        plan,
        color: els["free_color"]?.value || "c1",
        style: els["free_style"]?.value || "s1",
        paper: els["free_paper"]?.value || "f1"
      };
    }
    return { plan, color: els["premium_color"]?.value || "p1", style: "", paper: "" };
  }
})();
