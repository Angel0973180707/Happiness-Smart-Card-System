/* ============================================================
   天使幸福智慧名片館 form.js
   v8.2-FINAL-marquee-complete-overwrite

   基於 v7.8.4，本版修正：

   【任務二修正】waitAllUploads() 補強（pending bug 修正）
   - 原本：pending 狀態直接跳過（continue），導致剛選圖但未進入
     uploading 的圖片被漏掉
   - 修正：pending 或 uploading 都要等待
   - 等待邏輯：30 秒 timeout，每 300ms poll 一次 state
   - 有選圖（hasFile）才等待，沒選圖的格子不阻擋送出
   - error 狀態一律阻擋送出並提示重試

   【任務一說明】style.css 已在 v7.8.4.1 補上所有 .preview-theme-scope 選擇器
   v8.2 FINAL：syncPreviewContainerClasses() 仍只掛在 #preview-theme-scope，並移除 #livePreviewCard 雙重掛載，避免與 renderer 打架
   跑馬燈正式接通：marquee_enabled / marquee_text / marquee_purchased
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
    DRAFT_KEY: "hsc_form_draft_v82",

    CREATE_ACTION: "createCardWithOfflinePayment",
    DELIVER_ACTION: "markCardDelivered",
    PAYMENT_NOTICE_ACTION: "buildPaymentNoticeText",

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
    MAX_WALL_PHOTOS: 10,
    MAX_CTAS: 10,
    DEFAULT_PREVIEW_META: {
      layout: "grid", aspect_ratio: "1:1", fit_mode: "cover"
    },
    FIREBASE_MODULE: "./firebase.js"
  };

  const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };

  /* ============================================================
     STATE
  ============================================================ */
  const state = {
    photoMeta:        { avatar: { ...DEFAULT_PHOTO_META }, logo: { ...DEFAULT_PHOTO_META } },
    photoPreviewUrls: {},
    photoRealUrls:    {},
    photoFiles:       {},

    // upload token 防 race condition
    photoUploadTokens: {},

    // 五態 badge 管理
    // "idle" | "pending" | "uploading" | "done" | "error"
    photoUploadState: {},

    wallPhotoCount:   0,
    ctaCount:         0,
    lastSubmitResult: null,
    tempCardId:       null,

    // CTA 草稿暫存層
    draftValues: {}
  };

  const els = {};

  // Firebase module（lazy import）
  let _fb = null;

  document.addEventListener("DOMContentLoaded", init);

  /* ============================================================
     初始化
  ============================================================ */
  function init() {
    collectEls();
    ensureRendererAlias();
    hydrateQueryParams();

    upgradeExperienceToTextarea();

    bindStaticEvents();
    restoreDraft();
    ensureDefaultPlan();
    state.tempCardId = "TEMP_" + Date.now();
    refreshAll();
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
      console.error("[HSC form] firebase.js import failed:", err);
      throw new Error("Firebase 模組載入失敗，請確認 firebase.js 存在於根目錄。");
    }
  }

  /* ============================================================
     圖片上傳到 Firebase Storage（upload token 防 race condition）
  ============================================================ */
  async function uploadPhotoToFirebase(key, file) {
    const token = Date.now() + "_" + Math.random().toString(36).slice(2);
    state.photoUploadTokens[key] = token;
    state.photoUploadState[key] = "uploading";
    updateUploadBadge(key, "uploading", "上傳中…");

    try {
      const fb = await getFirebase();
      await fb.ensureAuth();

      const fileName = `${key}.jpg`;
      const cardId   = state.tempCardId;

      const url = await fb.uploadImage(cardId, file, fileName);

      if (state.photoUploadTokens[key] !== token) {
        console.log(`[HSC form] upload result discarded (stale token): ${key}`);
        return;
      }

      state.photoRealUrls[key]    = url;
      state.photoUploadState[key] = "done";
      updateUploadBadge(key, "done", "已上傳 ✓");
      console.log(`[HSC form] upload OK: ${key} →`, url);
      return url;
    } catch (err) {
      if (state.photoUploadTokens[key] !== token) return;

      state.photoUploadState[key] = "error";
      updateUploadBadge(key, "error", "上傳失敗");
      console.error(`[HSC form] upload failed: ${key}`, err);
      throw err;
    }
  }

  /* ============================================================
     badge 五態管理
  ============================================================ */
  function updateUploadBadge(key, uploadState, text) {
    const cards = document.querySelectorAll("[data-photo-key]");
    cards.forEach(card => {
      if (card.dataset.photoKey !== key) return;
      const badge = card.querySelector(".badge");
      if (!badge) return;
      badge.textContent = text;
      badge.dataset.uploadState = uploadState;
    });
  }

  /* ============================================================
     【任務二修正】waitAllUploads v7.8.4.1
     - pending 狀態（剛選圖、尚未進入 uploading）同樣要等待
     - 只等有選圖（hasFile）的格子
     - 等待上限 30 秒，每 300ms poll 一次
     - error 一律阻擋送出
  ============================================================ */
  async function waitAllUploads() {
    const keys = Object.keys(state.photoUploadState);

    for (const key of keys) {
      const s = state.photoUploadState[key];
      const hasFile = !!state.photoFiles[key];

      // 沒選圖 → 不阻擋
      if (!hasFile) continue;

      // pending 或 uploading 都要等
      if (s === "pending" || s === "uploading") {
        await new Promise((resolve, reject) => {
          const start = Date.now();

          const check = setInterval(() => {
            const cur = state.photoUploadState[key];

            if (cur === "done") {
              clearInterval(check);
              resolve();
              return;
            }

            if (cur === "error") {
              clearInterval(check);
              reject(new Error(`圖片上傳失敗：${key}`));
              return;
            }

            if (Date.now() - start > 30000) {
              clearInterval(check);
              reject(new Error(`圖片上傳逾時：${key}`));
            }
          }, 300);
        });
      }

      // error 一律阻擋送出
      if (state.photoUploadState[key] === "error") {
        throw new Error(`圖片 ${key} 上傳失敗，請重新選取後再送出。`);
      }
    }
  }

  /* ============================================================
     hydrateQueryParams
  ============================================================ */
  function hydrateQueryParams() {
    let search = "";
    try { search = window.location.search || ""; } catch (_) { return; }
    if (!search) return;

    const params = new URLSearchParams(search);

    const inviteCode = params.get("invite_code") || params.get("invite");
    if (inviteCode && els["invite_code"])
      els["invite_code"].value = inviteCode.trim();

    const ref = params.get("ref");
    if (ref && els["ref"])
      els["ref"].value = ref.trim();

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


  /* ============================================================
     將 experience <input> 升級為 <textarea>
     - 防重複執行（already-upgraded 標記）
     - 升級後才執行草稿回填
     - 不重複 append hint
     - 不重複綁事件
  ============================================================ */
  function upgradeExperienceToTextarea() {
    const old = document.getElementById("experience");
    if (!old) return;

    if (old.tagName === "TEXTAREA") return;
    if (old.dataset.upgraded === "1") return;

    const existingValue = old.value || "";
    const parent = old.parentNode;

    const ta         = document.createElement("textarea");
    ta.id            = "experience";
    ta.rows          = 4;
    ta.placeholder   = "例：前 XX 公司品牌顧問、10 年業界資歷\n可換行填寫多段經歷";
    ta.style.cssText = "resize:vertical;min-height:96px;";
    ta.value         = existingValue;
    ta.dataset.upgraded = "1";

    const existingHint = parent.querySelector(".experience-hint");
    const hint = document.createElement("p");
    hint.className   = "field-hint experience-hint";
    hint.textContent = "可換行填寫多段經歷，系統自動整理排版。";

    parent.insertBefore(ta, old);
    parent.removeChild(old);

    if (!existingHint) {
      parent.appendChild(hint);
    }

    els["experience"] = ta;

    ta.addEventListener("input",  onLiveChange);
    ta.addEventListener("change", onLiveChange);
  }

  /* ============================================================
     collectEls
  ============================================================ */
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
      "photo-slots", "cta-slots",
      "livePreviewCard",
      "preview-theme-scope",

      "summary-plan-pill", "summary-photo-pill", "summary-cta-pill",
      "summary-plan-name", "summary-photo-count", "summary-cta-count",
      "summary-marquee-status",

      "quote-state-text", "quote-plan-amount", "quote-addon-amount",
      "quote-addon-breakdown", "quote-total-amount",

      "submit-progress-overlay", "progress-text", "progress-fill",
      "progress-success-panel",
      "progress-card-id-display",
      "btn-copy-card-notice",
      "progress-preview-link"
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
    if (!window.HSCCardRenderer && window.HscCardRenderer)
      window.HSCCardRenderer = window.HscCardRenderer;
  }

  /* ============================================================
     靜態事件
  ============================================================ */
  function bindStaticEvents() {
    if (els["smart-card-form"])
      els["smart-card-form"].addEventListener("submit", submit);

    els.planRadios.forEach(r => r.addEventListener("change", refreshAll));
    els.addonCheckboxes.forEach(b => b.addEventListener("change", refreshAll));

    ["addon_photo_qty", "addon_cta_qty"].forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input",  refreshAll);
        els[id].addEventListener("change", refreshAll);
      }
    });

    [
      "free_color", "free_style", "free_paper", "premium_color",
      "display_name", "unit", "title", "phone", "email", "website",
      "line_url", "line_oa", "wechat_id", "experience", "services",
      "address", "intro", "marquee_text",
      "video1", "video2", "video3", "social1", "social2", "social3"
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
    bindButton(els["btn-gold-info"],            () => alert("金牌級會員請聯繫客服瞭解完整權益。"));
    bindButton(els["btn-save-draft"],  () => { saveDraft(); setStatus("草稿已暫存。"); });
    bindButton(els["btn-clear-draft"], clearDraft);

    bindButton(els["btn-gold-copy"], async () => {
      await copyText("您好，我想瞭解金牌級會員的完整權益與適合方案。");
      setStatus("已複製金牌會員詢問文案。");
    });

    bindButton(els["btn-copy-card-notice"], handleCopyCardNotice);
  }

  function bindButton(btn, handler) {
    if (btn) btn.addEventListener("click", handler);
  }

  function onLiveChange() {
    updatePreview();
    saveDraftSilently();
  }

  /* ============================================================
     validateBeforeSubmit
  ============================================================ */
  function validateBeforeSubmit() {
    const limits = getLimits();

    for (let i = 1; i <= limits.ctas; i++) {
      const textVal = valueOf(`cta_text_${i}`);
      const linkVal = valueOf(`cta_link_${i}`);
      if (textVal && !linkVal) {
        setStatus(`CTA 按鈕第 ${i} 組：請補上按鈕連結（文字與連結需成對）。`, "error");
        return false;
      }
      if (!textVal && linkVal) {
        setStatus(`CTA 按鈕第 ${i} 組：請補上按鈕文字（文字與連結需成對）。`, "error");
        return false;
      }
      if (linkVal && !isLooksLikeUrl(linkVal)) {
        setStatus(`CTA 按鈕第 ${i} 組的連結格式看起來有誤，請確認以 https:// 開頭。`, "warn");
        return false;
      }
    }

    if (isMarqueeEnabled()) {
      const mText = valueOf("marquee_text");
      if (!mText) {
        setStatus("已開啟跑馬燈功能，請填入跑馬燈內容。", "error");
        return false;
      }
    }

    if (isAddonChecked("addon_photo")) {
      const photoQty = getAddonQty("addon_photo_qty");
      if (photoQty <= 0) {
        setStatus("已勾選照片牆加購，請輸入加購張數（至少 1 張）。", "error");
        return false;
      }
    }

    if (isAddonChecked("addon_cta")) {
      const ctaQty = getAddonQty("addon_cta_qty");
      if (ctaQty <= 0) {
        setStatus("已勾選 CTA 按鈕加購，請輸入加購數量（至少 1 個）。", "error");
        return false;
      }
    }

    const urlFields = ["website", "line_url", "video1", "video2", "video3",
                       "social1", "social2", "social3"];
    for (const id of urlFields) {
      const v = valueOf(id);
      if (v && !isLooksLikeUrl(v)) {
        setStatus(`「${id}」的網址格式看起來有誤，請確認是否以 https:// 開頭。`, "warn");
        return false;
      }
    }

    return true;
  }

  function isLooksLikeUrl(str) {
    if (!str) return true;
    const s = str.trim();
    if (/^(https?:\/\/|line:|tel:|mailto:)/i.test(s)) return true;
    if (/^www\./i.test(s)) return true;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return true;
    return false;
  }

  /* ============================================================
     formatDateYMD
  ============================================================ */
  function formatDateYMD(input) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d.getTime())) throw new Error("invalid");
      return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
    } catch (_) {
      const fb = new Date();
      fb.setDate(fb.getDate() + 3);
      return `${fb.getFullYear()}/${String(fb.getMonth()+1).padStart(2,"0")}/${String(fb.getDate()).padStart(2,"0")}`;
    }
  }

  /* ============================================================
     pickPaymentDueAt
  ============================================================ */
  function pickPaymentDueAt(data) {
    const candidates = [
      data?.payment_due_at,
      data?.card?.payment_due_at,
      data?.data?.payment_due_at,
      data?.quote?.payment_due_at
    ];
    for (const c of candidates) {
      if (c && String(c).trim()) return String(c).trim();
    }
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString();
  }

  /* ============================================================
     buildLastSubmitResult
  ============================================================ */
  function buildLastSubmitResult({ cardId, previewUrl, paymentDueAt, totalAmount, planLabel, customerName, paymentId = "", paymentNotice = "" }) {
    return {
      cardId,
      previewUrl,
      paymentDueAt,
      dueDateStr: formatDateYMD(paymentDueAt),
      totalAmount,
      planLabel,
      customerName,
      paymentId,
      paymentNotice
    };
  }

  /* ============================================================
     handleCopyCardNotice
  ============================================================ */
  async function handleCopyCardNotice() {
    let r = state.lastSubmitResult;

    if (!r) {
      const limits      = getLimits();
      const addonItems  = getAddonItemsForQuote(limits);
      const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
      const total       = limits.planPrice + addonAmount;
      const cardId      = els["progress-card-id-display"]?.dataset.cardId || "";
      const previewUrl  = cardId
        ? `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`
        : CONFIG.SHOWCASE_URL;
      const dueIso = new Date();
      dueIso.setDate(dueIso.getDate() + 3);

      r = buildLastSubmitResult({
        cardId,
        previewUrl,
        paymentDueAt:  dueIso.toISOString(),
        totalAmount:   total,
        planLabel:     limits.planLabel,
        customerName:  valueOf("display_name") || "您"
      });
    }

    const notice =
      `您好，我是 ${r.customerName}，已完成天使幸福智慧名片申請！\n` +
      `📋 名片序號：${r.cardId || "（待確認）"}\n` +
      `💳 方案：${r.planLabel}，總金額 NT$ ${Number(r.totalAmount || 0).toLocaleString("zh-TW")}\n` +
      `🔗 成品預覽：${r.previewUrl}\n` +
      `⏰ 付款期限：${r.dueDateStr} 前，請協助確認並開通名片，謝謝！`;

    await copyText(notice);

    const btn = els["btn-copy-card-notice"];
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = "✅ 已複製！";
      setTimeout(() => { btn.textContent = orig; }, 2200);
    }
  }

  /* ============================================================
     方案 / 加購邏輯
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

  /* ============================================================
     全面刷新
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
    const plan = getSelectedPlan() || "premium";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;
    const urlOverride = Number(state.urlPhotoLimitOverride || 0);

    const effectiveBaseWallPhotos = urlOverride > 0
      ? clamp(urlOverride, base.wallPhotos, CONFIG.MAX_WALL_PHOTOS)
      : base.wallPhotos;

    let ewp = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let ect = isAddonChecked("addon_cta") ? getAddonQty("addon_cta_qty") : 0;

    ewp = clamp(ewp, 0, CONFIG.MAX_WALL_PHOTOS - effectiveBaseWallPhotos);
    ect = clamp(ect, 0, CONFIG.MAX_CTAS - base.ctas);

    return {
      plan,
      planLabel: base.label,
      planPrice: base.price,
      baseWallPhotos: effectiveBaseWallPhotos,
      wallPhotos: clamp(effectiveBaseWallPhotos + ewp, 0, CONFIG.MAX_WALL_PHOTOS),
      ctas: clamp(base.ctas + ect, 0, CONFIG.MAX_CTAS),
      extraWallPhotos: ewp,
      extraCtas: ect
    };
  }


  function syncPlanCards() {
    const plan = getSelectedPlan();
    els.planCards.forEach(c =>
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
      els["addon_photo_qty"].max      = String(maxExtra);
      if (!enabled) els["addon_photo_qty"].value = "0";
      if (Number(els["addon_photo_qty"].value || 0) > maxExtra)
        els["addon_photo_qty"].value = String(maxExtra);
    }

    if (els["addon-photo-tip"]) {
      const remain = Math.max(0, CONFIG.MAX_WALL_PHOTOS - CONFIG.BASE_LIMITS[limits.plan].wallPhotos);
      els["addon-photo-tip"].textContent = `本方案最多可再加 ${remain} 張`;
    }

    if (els["addon_cta_qty"]) {
      const enabled  = isAddonChecked("addon_cta");
      const maxExtra = Math.max(0, CONFIG.MAX_CTAS - CONFIG.BASE_LIMITS[limits.plan].ctas);
      els["addon_cta_qty"].disabled = !enabled;
      els["addon_cta_qty"].max      = String(maxExtra);
      if (!enabled) els["addon_cta_qty"].value = "0";
      if (Number(els["addon_cta_qty"].value || 0) > maxExtra)
        els["addon_cta_qty"].value = String(maxExtra);
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
      { title: "個人照", desc: "固定 1 張，套用到成品卡頭像。",
        keys: ["avatar"] },
      { title: "Logo",   desc: "固定 1 張，套用到成品卡 logo。",
        keys: ["logo"]   },
      { title: "照片牆", desc: `本次可上傳 ${wallLimit} 張（不含個人照與 Logo）`,
        keys: Array.from({ length: wallLimit }, (_, i) => `photo${i + 1}`) }
    ];

    sections.forEach(sec => {
      const wrapper = document.createElement("section");
      wrapper.className = "photo-section";
      const head = document.createElement("div");
      head.className = "photo-section-head";
      head.innerHTML =
        `<div><h3>${escapeHtml(sec.title)}</h3><p>${escapeHtml(sec.desc)}</p></div>`;
      const grid = document.createElement("div");
      grid.className = "photo-grid photo-grid-form";
      sec.keys.forEach((key, idx) =>
        grid.appendChild(buildPhotoCard(key, sec.title, idx + 1)));
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
    title.textContent          = ({ avatar: "個人照", logo: "Logo" })[key] || `照片牆 ${index}`;
    fileInput.dataset.photoKey = key;
    zoomRange.dataset.photoKey = key;
    zoomRange.value            = String(state.photoMeta[key]?.scale || 1);

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      state.photoFiles[key]  = file;
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
      state.photoMeta[key].x =
        clampNumber(+(state.photoMeta[key].x - 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    moveRight.addEventListener("click", () => {
      state.photoMeta[key].x =
        clampNumber(+(state.photoMeta[key].x + 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    moveUp.addEventListener("click", () => {
      state.photoMeta[key].y =
        clampNumber(+(state.photoMeta[key].y - 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    moveDown.addEventListener("click", () => {
      state.photoMeta[key].y =
        clampNumber(+(state.photoMeta[key].y + 0.05).toFixed(2), 0, 1, 0.5);
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
      const us = state.photoUploadState[key];
      if (us === "done") {
        badge.textContent = "已上傳 ✓";
        badge.dataset.uploadState = "done";
      } else if (us === "uploading") {
        badge.textContent = "上傳中…";
        badge.dataset.uploadState = "uploading";
      } else if (us === "error") {
        badge.textContent = "上傳失敗";
        badge.dataset.uploadState = "error";
      } else {
        badge.textContent = "已選擇";
        badge.dataset.uploadState = "pending";
      }
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
    const scale  = clampNumber(meta.scale,  0.5, 3,    1);
    const rotate = clampNumber(meta.rotate, -180, 180, 0);
    const x      = ((meta.x ?? 0.5) - 0.5) * 40;
    const y      = ((meta.y ?? 0.5) - 0.5) * 40;
    img.style.transform = `translate(${x}px,${y}px) scale(${scale}) rotate(${rotate}deg)`;
  }

  /* ============================================================
     CTA 區塊 — renderCtas 優先讀 state.draftValues
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

      textInput.value =
        currentDomValues[`cta_text_${i}`] ||
        state.draftValues[`cta_text_${i}`] || "";
      urlInput.value  =
        currentDomValues[`cta_link_${i}`] ||
        state.draftValues[`cta_link_${i}`] || "";

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
    const items         = [];
    const bundleChecked = isAddonChecked("addon_bundle");
    const photoChecked  = isAddonChecked("addon_photo");
    const ctaChecked    = isAddonChecked("addon_cta");
    const photoQty      = photoChecked ? getAddonQty("addon_photo_qty") : 0;
    const ctaQty        = ctaChecked   ? getAddonQty("addon_cta_qty")   : 0;

    if (bundleChecked) {
      items.push({ code: "addon_bundle", name: "跑馬燈＋更新組合", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_bundle,
        amount:     CONFIG.ADDON_PRICES.addon_bundle });
    } else {
      if (isAddonChecked("addon_marquee")) items.push({
        code: "addon_marquee", name: "跑馬燈功能", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_marquee,
        amount:     CONFIG.ADDON_PRICES.addon_marquee });
      if (isAddonChecked("addon_update_unlimited")) items.push({
        code: "addon_update_unlimited", name: "無限更新", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_update_unlimited,
        amount:     CONFIG.ADDON_PRICES.addon_update_unlimited });
    }

    if (photoChecked && photoQty > 0) items.push({
      code: "addon_photo", name: "照片牆加購", qty: photoQty,
      unit_price: CONFIG.ADDON_PRICES.addon_photo,
      amount:     photoQty * CONFIG.ADDON_PRICES.addon_photo });

    if (ctaChecked && ctaQty > 0) items.push({
      code: "addon_cta", name: "CTA 加購", qty: ctaQty,
      unit_price: CONFIG.ADDON_PRICES.addon_cta,
      amount:     ctaQty * CONFIG.ADDON_PRICES.addon_cta });

    if (isAddonChecked("addon_agent_upgrade")) items.push({
      code: "addon_agent_upgrade", name: "金牌級會員", qty: 1,
      unit_price: CONFIG.ADDON_PRICES.addon_agent_upgrade,
      amount:     CONFIG.ADDON_PRICES.addon_agent_upgrade });

    return items;
  }

  function syncQuote(limits) {
    const items       = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const total       = (limits.planPrice || 0) + addonAmount;
    const set         = (id, v) => { if (els[id]) els[id].textContent = v; };

    set("quote-state-text",   `${limits.planLabel}｜${money(total)}`);
    set("quote-plan-amount",  money(limits.planPrice || 0));
    set("quote-addon-amount", money(addonAmount));
    set("quote-total-amount", money(total));

    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!items.length) {
        els["quote-addon-breakdown"].appendChild(
          Object.assign(document.createElement("span"), { textContent: "尚未選擇加購" }));
      } else {
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          const qs = (item.code === "addon_photo" || item.code === "addon_cta") && item.qty > 1
            ? ` × ${item.qty}` : "";
          row.innerHTML =
            `<span>${escapeHtml(item.name)}${qs}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
  }

  /* ============================================================
     即時預覽 — 主題 class 掛在 .preview-theme-scope
  ============================================================ */
  const THEME_CLASSES = [
    "mode-free", "mode-premium",
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
      const premClass = mapPremiumColor(theme.color);
      scope.classList.add(premClass);
    } else {
      scope.classList.add(mapFreeColor(theme.color));
      scope.classList.add(mapStyle(theme.style));
      scope.classList.add(mapPaper(theme.paper));
    }

    // v8.2 FINAL：主題 class 只掛在 .preview-theme-scope
    // #livePreviewCard 只作為 renderer 掛載目標，避免雙重掛載打架
  }

  function mapFreeColor(v) {
    const m = { c1:"color-1", c2:"color-2", c3:"color-3", c4:"color-4", c5:"color-5" };
    return m[v] || "color-1";
  }

  function mapStyle(v) {
    const m = { s1:"style-arch", s2:"style-flat", s3:"style-spot" };
    return m[v] || "style-arch";
  }

  function mapPaper(v) {
    const m = { f1:"paper-1", f2:"paper-2", f3:"paper-3" };
    return m[v] || "paper-1";
  }

  function mapPremiumColor(v) {
    return ["p1","p2","p3","p4","p5","p6","p7"].includes(v) ? v : "p1";
  }

  function updatePreview() {
    const root = els["livePreviewCard"];
    if (!root) return;

    syncPreviewContainerClasses();

    ensureRendererAlias();
    const renderer = window.HSCCardRenderer || window.HscCardRenderer;
    if (!renderer || typeof renderer.renderCard !== "function") {
      root.innerHTML =
        `<div class="renderer-error">找不到 HscCardRenderer，請確認已載入 card-renderer.js</div>`;
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
      root.innerHTML =
        `<div class="renderer-error">預覽渲染失敗：${escapeHtml(err.message || "未知")}</div>`;
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
      wechat_id:  valueOf("wechat_id"),
      video1:     valueOf("video1"),
      video2:     valueOf("video2"),
      video3:     valueOf("video3"),
      social1:    valueOf("social1"),
      social2:    valueOf("social2"),
      social3:    valueOf("social3"),

      plan:  theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,

      marquee_text:    isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",

      photo_limit: limits.wallPhotos,
      cta_limit:   limits.ctas,

      preview_url: CONFIG.SHOWCASE_URL,
      share_url:   CONFIG.SHOWCASE_URL,
      card_url:    CONFIG.SHOWCASE_URL,

      features: {
        photo_meta:         buildPhotoMetaMap(),
        preview_meta:       { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        photo_preview_urls: { ...state.photoPreviewUrls }
      }
    };

    const avatarUrl = state.photoRealUrls.avatar || state.photoPreviewUrls.avatar || "";
    if (avatarUrl) {
      data.avatar_url = avatarUrl;
      data["u-img"]   = avatarUrl;
    }

    const logoUrl = state.photoRealUrls.logo || state.photoPreviewUrls.logo || "";
    if (logoUrl) data.logo_url = logoUrl;

    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoRealUrls[`photo${i}`] || state.photoPreviewUrls[`photo${i}`] || "";
      if (url) {
        data[`photo${i}_url`]  = url;
        data[`photo_url_${i}`] = url;
      }
    }

    for (let i = 1; i <= limits.ctas; i++) {
      data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      data[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }

    return data;
  }

  function bindPreviewCollapseToggles(root) {
    setupPreviewBlockClamp(root, "[data-block-service]", 140);
    setupPreviewBlockClamp(root, "[data-block-exp]",     180);
  }

  function setupPreviewBlockClamp(root, selector, collapsedHeight) {
    const block = root.querySelector(selector);
    if (!block || block.style.display === "none") return;
    const next = block.nextElementSibling;
    if (next && next.classList.contains("preview-more-toggle")) next.remove();
    block.style.maxHeight = "";
    block.style.overflow  = "";
    block.classList.remove("is-collapsed", "is-expanded");
    requestAnimationFrame(() => {
      if (block.scrollHeight <= collapsedHeight + 8) return;
      block.style.maxHeight = `${collapsedHeight}px`;
      block.style.overflow  = "hidden";
      block.classList.add("is-collapsed");
      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = "ghost-btn mini preview-more-toggle";
      btn.textContent = "展開更多";
      btn.addEventListener("click", () => {
        if (block.classList.contains("is-expanded")) {
          block.classList.replace("is-expanded", "is-collapsed");
          block.style.maxHeight = `${collapsedHeight}px`;
          block.style.overflow  = "hidden";
          btn.textContent = "展開更多";
        } else {
          block.classList.replace("is-collapsed", "is-expanded");
          block.style.maxHeight = "none";
          block.style.overflow  = "visible";
          btn.textContent = "收合";
        }
      });
      block.insertAdjacentElement("afterend", btn);
    });
  }

  function buildPhotoMetaMap() {
    const out = {
      avatar: normalizePhotoMeta(state.photoMeta.avatar),
      logo:   normalizePhotoMeta(state.photoMeta.logo)
    };
    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) {
      out[`photo${i}`] = normalizePhotoMeta(state.photoMeta[`photo${i}`]);
    }
    return out;
  }

  /* ============================================================
     buildPayload
  ============================================================ */
  function buildPayload() {
    const limits         = getLimits();
    const theme          = getThemeSelection();
    const previewData    = buildPreviewData();
    const addonItems     = getAddonItemsForQuote(limits);
    const bundleChecked  = isAddonChecked("addon_bundle");
    const marqueeChecked = isAddonChecked("addon_marquee");
    const addonAmount    = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalAmount    = Number(limits.planPrice || 0) + Number(addonAmount || 0);

    const phoneStr = String(valueOf("phone") || "").replace(/\s/g, "");
    const refCode  = valueOf("ref");

    const payload = {
      action:"createCardWithOfflinePayment",
      tenant: "angel",
invite_code: "TEST001",

      name:       previewData.name,
      unit:       previewData.unit,
      title:      previewData.title,
      slogan:     previewData.slogan,
      phone:      phoneStr,
      email:      previewData.email,
      website:    previewData.website,
      address:    previewData.address,
      line_url:   previewData.line_url,
      line_oa:    previewData.line_oa,
      wechat_id:  previewData.wechat_id,
      experience: previewData.experience,
      services:   previewData.services,

      video1:  valueOf("video1"),
      video2:  valueOf("video2"),
      video3:  valueOf("video3"),
      social1: valueOf("social1"),
      social2: valueOf("social2"),
      social3: valueOf("social3"),

      invite_code: valueOf("invite_code"),
      referrer:    refCode,
      service_agent: refCode,
      agent_type:  refCode ? "service" : "self",
      source:      refCode ? "agent_form" : "form",
      form_source: "smart_card_form",
      process_status: "submitted",

      plan:  theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,

      marquee_text:      previewData.marquee_text,
      marquee_enabled:   isMarqueeEnabled() ? "true" : "",
      marquee_purchased: (marqueeChecked || bundleChecked) ? "1" : "",

      photo_limit:           limits.wallPhotos,
      cta_limit:             limits.ctas,
      photo_extra_purchased: isAddonChecked("addon_photo")
                               ? String(getAddonQty("addon_photo_qty")) : "",
      cta_extra_purchased:   isAddonChecked("addon_cta")
                               ? String(getAddonQty("addon_cta_qty"))   : "",

      amount: totalAmount,
      plan_amount: Number(limits.planPrice || 0),
      addon_amount: Number(addonAmount || 0),
      total_amount: totalAmount,
      note: buildOrderNote(limits, addonItems, totalAmount),

      ...(state.photoRealUrls.avatar ? { avatar_url: state.photoRealUrls.avatar } : {}),
      ...(state.photoRealUrls.logo   ? { logo_url:   state.photoRealUrls.logo   } : {}),

      addon_items: addonItems,

      features_json: {
        photo_meta:   buildPhotoMetaMap(),
        preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        addon_items: addonItems,
        order_summary: {
          plan: theme.plan,
          plan_label: limits.planLabel,
          plan_amount: Number(limits.planPrice || 0),
          addon_amount: Number(addonAmount || 0),
          total_amount: Number(totalAmount || 0)
        }
      }
    };

    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoRealUrls[`photo${i}`] || "";
      if (url) {
        payload[`photo${i}_url`]  = url;
        payload[`photo_url_${i}`] = url;
      }
    }

    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }

    return payload;
  }

  function buildOrderNote(limits, addonItems, totalAmount) {
    const parts = [
      `form_submit`,
      `plan=${limits.plan}`,
      `plan_label=${limits.planLabel}`,
      `plan_amount=${Number(limits.planPrice || 0)}`,
      `addon_amount=${addonItems.reduce((s, i) => s + Number(i.amount || 0), 0)}`,
      `total_amount=${Number(totalAmount || 0)}`
    ];

    addonItems.forEach(item => {
      const code = String(item.code || item.item_code || "").trim();
      const qty  = Number(item.qty || item.quantity || 1);
      const amt  = Number(item.amount || 0);
      if (code) parts.push(`addon=${code}:${qty}:${amt}`);
    });

    return parts.join(" ; ");
  }


  /* ============================================================
     送出流程 v7.8.4.1
  ============================================================ */
  async function submit(e) {
    e.preventDefault();

    const payload = buildPayload();

    if (!payload.name || !String(payload.phone || "").trim() || !payload.plan) {
      setStatus("請先完成必填欄位（姓名、電話、方案）。", "error");
      return;
    }

    if (!validateBeforeSubmit()) return;

    const limits      = getLimits();
    const addonItems  = getAddonItemsForQuote(limits);
    const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalAmount = Number(limits.planPrice || 0) + Number(addonAmount || 0);

    showProgress(true);
    hideSuccessPanel();
    setProgressStep(1, "正在等待圖片上傳完成…");

    try {
      await waitAllUploads();

      setProgressStep(2, "正在送出建卡資料…");

      const finalPayload = buildPayload();

// ⭐強制補 action（最穩）
finalPayload.action = "createCardWithOfflinePayment";

const data = await postToGas(finalPayload);
console.log("[HSC form] createCardWithOfflinePayment response =", data);

if (!data || !data.ok) {
  throw new Error(data?.error || data?.message || data?.raw || "建立名片失敗，請稍後再試。");
}

const cardId =
  data.card_id ||
  data.id ||
  data.card?.id ||
  data.card?.card_id ||
  data.data?.card_id ||
  data.data?.id ||
  data.result?.card_id ||
  data.result?.id ||
  data.payload?.card_id ||
  "";
const paymentId =
  data.payment?.payment_id ||
  data.payment_id ||
  data.result?.payment_id ||
  data.payload?.payment_id ||
  "";

if (!cardId) {
  throw new Error(
    "GAS 已回應成功，但沒有回傳 card_id。\n完整回傳：\n" +
    JSON.stringify(data, null, 2)
  );
}

setProgressStep(3, "正在建立付款期限…");

const delivered = await postToGas({
  action: "markCardDelivered",
  card_id: cardId
});

if (!delivered || !delivered.ok) {
  throw new Error(delivered?.error || delivered?.message || "付款期限建立失敗，請檢查 markCardDelivered。");
}
      let paymentNoticeText = data.payment_notice?.copy_text || "";
      if (paymentId) {
        try {
          const noticeRes = await postToGas({
          action: "buildPaymentNoticeText",
            payment_id: paymentId
          });
          if (noticeRes?.ok && noticeRes?.copy_text) {
            paymentNoticeText = noticeRes.copy_text;
          }
        } catch (noticeErr) {
          console.warn("[HSC form] payment notice fetch failed:", noticeErr);
        }
      }

      const previewUrl = `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`;
      const paymentDueAt =
        delivered?.payment_due_at ||
        delivered?.card?.payment_due_at ||
        data?.payment?.due_at ||
        pickPaymentDueAt(data);

      setProgressStep(4, "正在寫入報價與預覽資料…");

      const result = buildLastSubmitResult({
        cardId,
        previewUrl,
        paymentDueAt,
        totalAmount,
        planLabel: limits.planLabel,
        customerName: finalPayload.name
      });

      result.paymentId = paymentId || "";
      result.paymentNotice = paymentNoticeText || "";

      state.lastSubmitResult = result;

      localStorage.setItem(CONFIG.QUOTE_STORAGE_KEY, JSON.stringify({
        card_id: cardId,
        payment_id: paymentId || "",
        customer_name: finalPayload.name || "",
        plan_name: limits.planLabel || "方案",
        submitted_at: new Date().toISOString(),
        payment_notice: paymentNoticeText || "請於 3 天內完成付款",
        payment_due_at: paymentDueAt,
        preview_url: previewUrl,
        plan_amount: Number(limits.planPrice || 0),
        addon_items: addonItems,
        addon_amount: Number(addonAmount || 0),
        total_amount: Number(totalAmount || 0)
      }));

      localStorage.removeItem(CONFIG.DRAFT_KEY);

      setProgressStep(5, "✅ 申請成功！名片已建立。");
      showSuccessPanel(result);
      setStatus("名片已成功建立，請複製下方資訊回覆客服。", "success");

    } catch (err) {
      console.error("[HSC form] submit error:", err);
      setStatus("送出失敗：" + (err.message || "未知錯誤"), "error");
      showProgress(false);
    }
  }

async function postToGas(payload) {
  const fd = new FormData();

  // ✅ 改成「平鋪欄位」
  Object.keys(payload || {}).forEach((key) => {
    const value = payload[key];

    if (value === undefined || value === null) return;

    // 物件轉 JSON
    if (typeof value === "object") {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, String(value));
    }
  });

  const res = await fetch(CONFIG.GAS_URL, {
    method: "POST",
    body: fd
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("GAS回傳不是JSON:", text);
    throw new Error("GAS 回傳格式錯誤");
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}
  /* ============================================================
     showSuccessPanel
  ============================================================ */
  function showSuccessPanel(result) {
    if (!result) return;

    if (els["progress-fill"]) els["progress-fill"].style.width = "100%";

    const idEl = els["progress-card-id-display"];
    if (idEl) {
      idEl.textContent    = result.cardId || "（待客服確認）";
      idEl.dataset.cardId = result.cardId || "";
    }

    const linkEl = els["progress-preview-link"];
    if (linkEl) {
      linkEl.href        = result.previewUrl || CONFIG.SHOWCASE_URL;
      linkEl.textContent = result.previewUrl || CONFIG.SHOWCASE_URL;
    }

    const panel = els["progress-success-panel"];
    if (!panel) return;

    const setT = (sel, v) => {
      const el = panel.querySelector(sel);
      if (el) el.textContent = v;
    };

    setT(".success-name",  result.customerName || "您");
    setT(".success-plan",  result.planLabel    || "方案");
    setT(".success-total", `NT$ ${Number(result.totalAmount || 0).toLocaleString("zh-TW")}`);
    setT(".success-due",   result.dueDateStr   || "3 天內");

    panel.classList.remove("hidden");
  }

  function hideSuccessPanel() {
    els["progress-success-panel"]?.classList.add("hidden");
  }

  /* ============================================================
     parseJsonSafe
  ============================================================ */
  async function parseJsonSafe(res) {
    let raw = "";
    try { raw = await res.text(); } catch (e) {
      console.error("[HSC form] failed to read response text:", e);
      return { ok: false, error: "無法讀取回應內容", raw: "" };
    }
    try {
      return JSON.parse(raw);
    } catch (_) {
      console.error("[HSC form] non-json response:", raw.slice(0, 500));
      return { ok: false, error: "Non-JSON response", raw };
    }
  }

  /* ============================================================
     工具函式
  ============================================================ */
  function isMarqueeEnabled() {
    return isAddonChecked("addon_marquee") || isAddonChecked("addon_bundle");
  }

  function valueOf(id) {
    const el = document.getElementById(id) || els[id];
    return (el?.value || "").trim();
  }

  function getThemeSelection() {
    const plan = getSelectedPlan() || "premium";
    if (plan === "free") return {
      plan,
      color: els["free_color"]?.value || "c1",
      style: els["free_style"]?.value || "s1",
      paper: els["free_paper"]?.value || "f1"
    };
    return { plan, color: els["premium_color"]?.value || "p1", style: "", paper: "" };
  }

  function showProgress(show) {
    if (!els["submit-progress-overlay"]) return;
    els["submit-progress-overlay"].classList.toggle("hidden", !show);
    if (!show) {
      els.progressSteps.forEach(s => s.classList.remove("is-active", "is-done"));
      if (els["progress-fill"]) els["progress-fill"].style.width = "0%";
      if (els["progress-text"]) els["progress-text"].textContent = "正在建立申請資料，請稍候。";
      hideSuccessPanel();
    }
  }

  function setProgressStep(stepNo, text) {
    const total = 5;
    els.progressSteps.forEach(step => {
      const n = Number(step.dataset.step || 0);
      step.classList.toggle("is-active", n === stepNo);
      step.classList.toggle("is-done",   n <  stepNo);
    });
    if (els["progress-fill"])
      els["progress-fill"].style.width = `${Math.round((stepNo / total) * 100)}%`;
    if (els["progress-text"] && text)
      els["progress-text"].textContent = text;
  }

  function setStatus(msg, stateName = "") {
    const el = els["form-status-strip"];
    if (!el) return;
    el.textContent = msg || "";
    if (msg) el.classList.add("visible"); else el.classList.remove("visible");
    if (stateName) el.dataset.state = stateName; else delete el.dataset.state;
  }

  function collectFormValues() {
    const out = {};
    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "radio") { if (el.checked) out[el.name] = el.value; return; }
      if (!el.id) return;
      out[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return out;
  }

  /* ============================================================
     草稿儲存 / 恢復
  ============================================================ */
  function saveDraft() {
    const values = collectFormValues();
    localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify({
      values,
      photoMeta: state.photoMeta
    }));
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

    if (values["experience"] !== undefined) {
      const expEl = document.getElementById("experience") || els["experience"];
      if (expEl) expEl.value = values["experience"] || "";
    }

    if (draft.photoMeta && typeof draft.photoMeta === "object")
      state.photoMeta = draft.photoMeta;

    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
  }

  function clearDraft() {
    localStorage.removeItem(CONFIG.DRAFT_KEY);
    localStorage.removeItem(CONFIG.QUOTE_STORAGE_KEY);
    location.reload();
  }

  function money(v) { return `NT$ ${Number(v || 0).toLocaleString("zh-TW")}`; }

  async function copyText(str) {
    if (!str) return;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(str); return; }
    } catch (_) {}
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

})();
// ⭐ 強制覆蓋版 postToGas（解決 GAS 收不到 payload 問題）
async function postToGas(payload) {
  const body = new URLSearchParams();
  body.append("payload", JSON.stringify(payload));

  const res = await fetch(CONFIG.GAS_URL, {
    method: "POST",
    body
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("GAS回傳不是JSON:", text);
    throw new Error("GAS 回傳格式錯誤");
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}