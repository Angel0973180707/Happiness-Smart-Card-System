/* ============================================================
   天使幸福智慧名片館 form.js
   v7.7.8
   完整覆蓋版

   修正：
   1. 照片上傳工具列補上移/下移按鈕（photoMeta[key].y ±0.05，clamp 0~1）
   2. photo-grid-form 已於 HTML/CSS 改為固定兩欄（CSS 端修正）
   3. buildPreviewData() 正確傳入 avatar_url / logo_url / photo_url，
      並在 features.photo_preview_urls 提供備援，對齊 renderer 欄位
   4. buildPayload() ref → referrer
   5. 補齊 marquee_purchased / marquee_enabled /
      cta_extra_purchased / photo_extra_purchased
   6. 新增 video1~3 / social1~3 欄位收集與送出
   7. submit() cardId 相容多種 GAS 回傳格式
   8. HSC_LAST_QUOTE 補齊 preview_url / payment_due_at（+3天）
   9. intro → slogan（card_db 欄位名）
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
    DRAFT_KEY: "hsc_form_draft_v778",
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
     初始化
  ============================================================ */
  function init() {
    collectEls();
    ensureRendererAlias();
    bindStaticEvents();
    restoreDraft();
    ensureDefaultPlan();
    refreshAll();
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

      "submit-progress-overlay", "progress-text", "progress-fill"
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
     靜態事件
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
    bindButton(els["btn-gold-info"],            () => alert("金牌級會員請聯繫客服瞭解完整權益。"));
    bindButton(els["btn-gold-copy"], async () => {
      await copyText("您好，我想瞭解金牌級會員的完整權益與適合方案。");
      setStatus("已複製金牌會員詢問文案。");
    });
    bindButton(els["btn-save-draft"],  () => { saveDraft(); setStatus("草稿已暫存。"); });
    bindButton(els["btn-clear-draft"], clearDraft);
  }

  function bindButton(btn, handler) {
    if (btn) btn.addEventListener("click", handler);
  }

  function onLiveChange() { updatePreview(); saveDraftSilently(); }

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
      els["addon-photo-tip"].textContent = `本方案最多可再加 ${remain} 張`;
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
      { title: "個人照", desc: "固定 1 張，套用到成品卡頭像。",                              keys: ["avatar"] },
      { title: "Logo",   desc: "固定 1 張，套用到成品卡 logo。",                             keys: ["logo"]   },
      { title: "照片牆", desc: `本次可上傳 ${wallLimit} 張（不含個人照與 Logo）`,              keys: Array.from({ length: wallLimit }, (_, i) => `photo${i + 1}`) }
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
    const moveUp       = frag.querySelector(".move-up");    // FIX 1
    const moveDown     = frag.querySelector(".move-down");  // FIX 1
    const resetBtn     = frag.querySelector(".reset-photo");

    card.dataset.photoKey      = key;
    title.textContent          = ({ avatar: "個人照", logo: "Logo" })[key] || `照片牆 ${index}`;
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
      badge.textContent = "已上傳";
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

    // FIX 1: 上移 — y 減小（畫面往上）
    moveUp.addEventListener("click", () => {
      state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y - 0.05).toFixed(2), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview(); saveDraftSilently();
    });

    // FIX 1: 下移 — y 增大（畫面往下）
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
      badge.textContent = "已上傳";
      applyPhotoTransform(previewImage, state.photoMeta[key]);
    } else {
      previewImage.removeAttribute("src");
      previewImage.classList.add("hidden");
      previewEmpty.classList.remove("hidden");
      tools.classList.add("hidden");
      badge.textContent = "尚未上傳";
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
     CTA 區塊
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

      label.textContent = `CTA 按鈕 ${i}`;
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
    if (els["summary-photo-pill"])     els["summary-photo-pill"].textContent     = `照片牆：${limits.wallPhotos}`;
    if (els["summary-cta-pill"])       els["summary-cta-pill"].textContent       = `CTA：${limits.ctas}`;
    if (els["summary-plan-name"])      els["summary-plan-name"].textContent      = limits.planLabel;
    if (els["summary-photo-count"])    els["summary-photo-count"].textContent    = String(limits.wallPhotos);
    if (els["summary-cta-count"])      els["summary-cta-count"].textContent      = String(limits.ctas);
    if (els["summary-marquee-status"]) els["summary-marquee-status"].textContent = isMarqueeEnabled() ? "已開啟" : "未開啟";
  }

  function getAddonItemsForQuote(limits) {
    const items          = [];
    const bundleChecked  = isAddonChecked("addon_bundle");
    const photoChecked   = isAddonChecked("addon_photo");
    const ctaChecked     = isAddonChecked("addon_cta");
    const photoQty       = photoChecked ? getAddonQty("addon_photo_qty") : 0;
    const ctaQty         = ctaChecked   ? getAddonQty("addon_cta_qty")   : 0;

    if (bundleChecked) {
      items.push({ code: "addon_bundle", name: "跑馬燈＋更新組合", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_bundle, amount: CONFIG.ADDON_PRICES.addon_bundle });
    } else {
      if (isAddonChecked("addon_marquee")) items.push({
        code: "addon_marquee", name: "跑馬燈功能", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_marquee, amount: CONFIG.ADDON_PRICES.addon_marquee });
      if (isAddonChecked("addon_update_unlimited")) items.push({
        code: "addon_update_unlimited", name: "無限更新", qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_update_unlimited, amount: CONFIG.ADDON_PRICES.addon_update_unlimited });
    }

    if (photoChecked && photoQty > 0) items.push({
      code: "addon_photo", name: "照片牆加購", qty: photoQty,
      unit_price: CONFIG.ADDON_PRICES.addon_photo, amount: photoQty * CONFIG.ADDON_PRICES.addon_photo });

    if (ctaChecked && ctaQty > 0) items.push({
      code: "addon_cta", name: "CTA 加購", qty: ctaQty,
      unit_price: CONFIG.ADDON_PRICES.addon_cta, amount: ctaQty * CONFIG.ADDON_PRICES.addon_cta });

    if (isAddonChecked("addon_agent_upgrade")) items.push({
      code: "addon_agent_upgrade", name: "金牌級會員", qty: 1,
      unit_price: CONFIG.ADDON_PRICES.addon_agent_upgrade, amount: CONFIG.ADDON_PRICES.addon_agent_upgrade });

    return items;
  }

  function syncQuote(limits) {
    const items       = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const total       = (limits.planPrice || 0) + addonAmount;

    if (els["quote-state-text"])   els["quote-state-text"].textContent   = `${limits.planLabel}｜${money(total)}`;
    if (els["quote-plan-amount"])  els["quote-plan-amount"].textContent  = money(limits.planPrice || 0);
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = money(addonAmount);
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = money(total);

    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!items.length) {
        const s = document.createElement("span");
        s.textContent = "尚未選擇加購";
        els["quote-addon-breakdown"].appendChild(s);
      } else {
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          const qs = (item.code === "addon_photo" || item.code === "addon_cta") && item.qty > 1
            ? ` × ${item.qty}` : "";
          row.innerHTML = `<span>${escapeHtml(item.name)}${qs}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
  }

  /* ============================================================
     即時預覽
  ============================================================ */
  function updatePreview() {
    const root = els["livePreviewCard"];
    if (!root) return;
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
        previewUrl: CONFIG.SHOWCASE_URL,
        shareUrl:   CONFIG.SHOWCASE_URL,
        cardUrl:    CONFIG.SHOWCASE_URL
      });
      bindPreviewCollapseToggles(root);
    } catch (err) {
      console.error("updatePreview error:", err);
      root.innerHTML = `<div class="renderer-error">預覽渲染失敗：${escapeHtml(err.message || "未知")}</div>`;
    }
  }

  /* ============================================================
     FIX 3: buildPreviewData
     - avatar_url / logo_url / photo${i}_url 直接帶入頂層
     - features.photo_preview_urls 提供備援（renderer 可自行取用）
     - u-img 對應欄位：avatar_url → renderer 需讀此欄
  ============================================================ */
  function buildPreviewData() {
    const limits = getLimits();
    const theme  = getThemeSelection();

    const data = {
      /* 基本資料 */
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

      /* 樣式 */
      plan:  theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,

      /* 跑馬燈 */
      marquee_text:    isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",

      /* 數量 */
      photo_limit: limits.wallPhotos,
      cta_limit:   limits.ctas,

      /* 系統 */
      preview_url: CONFIG.SHOWCASE_URL,
      share_url:   CONFIG.SHOWCASE_URL,
      card_url:    CONFIG.SHOWCASE_URL,

      features: {
        photo_meta:         buildPhotoMetaMap(),
        preview_meta:       { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        /* FIX 3: 備援圖片來源，renderer 可由此取 base64 DataURL */
        photo_preview_urls: { ...state.photoPreviewUrls }
      }
    };

    /* FIX 3: 頂層圖片欄位，對應 renderer 的 avatar_url / logo_url */
    if (state.photoPreviewUrls.avatar) {
      data.avatar_url = state.photoPreviewUrls.avatar;
      data["u-img"]   = state.photoPreviewUrls.avatar; // 相容 renderer 讀 u-img src
    }
    if (state.photoPreviewUrls.logo) {
      data.logo_url = state.photoPreviewUrls.logo;
    }

    /* 照片牆 */
    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoPreviewUrls[`photo${i}`];
      if (url) {
        data[`photo${i}_url`] = url;
        data[`photo_url_${i}`] = url; // 備援欄位名
      }
    }

    /* CTA */
    for (let i = 1; i <= limits.ctas; i++) {
      data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      data[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }

    return data;
  }

  function bindPreviewCollapseToggles(root) {
    setupPreviewBlockClamp(root, "#block-service", 140);
    setupPreviewBlockClamp(root, "#block-exp",     180);
  }

  function setupPreviewBlockClamp(root, selector, collapsedHeight) {
    const block = root.querySelector(selector);
    if (!block || block.style.display === "none") return;
    const next = block.nextElementSibling;
    if (next && next.classList.contains("preview-more-toggle")) next.remove();
    block.style.maxHeight = ""; block.style.overflow = "";
    block.classList.remove("is-collapsed", "is-expanded");
    requestAnimationFrame(() => {
      if (block.scrollHeight <= collapsedHeight + 8) return;
      block.style.maxHeight = `${collapsedHeight}px`;
      block.style.overflow  = "hidden";
      block.classList.add("is-collapsed");
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "ghost-btn mini preview-more-toggle";
      btn.textContent = "展開更多";
      btn.addEventListener("click", () => {
        if (block.classList.contains("is-expanded")) {
          block.classList.replace("is-expanded","is-collapsed");
          block.style.maxHeight = `${collapsedHeight}px`;
          block.style.overflow  = "hidden";
          btn.textContent = "展開更多";
        } else {
          block.classList.replace("is-collapsed","is-expanded");
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
     buildPayload — 完整版
  ============================================================ */
  function buildPayload() {
    const limits      = getLimits();
    const theme       = getThemeSelection();
    const previewData = buildPreviewData();
    const addonItems  = getAddonItemsForQuote(limits);
    const bundleChecked  = isAddonChecked("addon_bundle");
    const marqueeChecked = isAddonChecked("addon_marquee");

    const payload = {
      action: "createCardWithOfflinePayment",
      tenant: "angel",

      /* 基本資料 */
      name:       previewData.name,
      unit:       previewData.unit,
      title:      previewData.title,
      slogan:     previewData.slogan,
      phone:      previewData.phone,
      email:      previewData.email,
      website:    previewData.website,
      address:    previewData.address,
      line_url:   previewData.line_url,
      line_oa:    previewData.line_oa,
      wechat_id:  previewData.wechat_id,
      experience: previewData.experience,
      services:   previewData.services,

      /* 影音 / 社群連結 */
      video1:  valueOf("video1"),
      video2:  valueOf("video2"),
      video3:  valueOf("video3"),
      social1: valueOf("social1"),
      social2: valueOf("social2"),
      social3: valueOf("social3"),

      /* 邀請碼 & 來源 */
      invite_code: valueOf("invite_code"),
      referrer:    valueOf("ref"),

      /* 樣式 */
      plan:  theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,

      /* 跑馬燈 */
      marquee_text:      previewData.marquee_text,
      marquee_enabled:   isMarqueeEnabled() ? "true" : "",
      marquee_purchased: (marqueeChecked || bundleChecked) ? "1" : "",

      /* 照片 & CTA 數量 */
      photo_limit:           limits.wallPhotos,
      cta_limit:             limits.ctas,
      photo_extra_purchased: isAddonChecked("addon_photo")
                              ? String(getAddonQty("addon_photo_qty")) : "",
      cta_extra_purchased:   isAddonChecked("addon_cta")
                              ? String(getAddonQty("addon_cta_qty"))   : "",

      /* 圖片主檔 */
      avatar_url: previewData.avatar_url || "",
      logo_url:   previewData.logo_url   || "",

      /* 加購明細 */
      addon_items: addonItems,

      /* features */
      features_json: {
        photo_meta:         buildPhotoMetaMap(),
        preview_meta:       { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        photo_preview_urls: { ...state.photoPreviewUrls }
      }
    };

    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoPreviewUrls[`photo${i}`];
      if (url) {
        payload[`photo${i}_url`] = url;
        payload[`photo_url_${i}`] = url;
      }
    }
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }

    return payload;
  }

  /* ============================================================
     送出
  ============================================================ */
  async function submit(e) {
    e.preventDefault();

    const payload     = buildPayload();
    const limits      = getLimits();
    const addonItems  = getAddonItemsForQuote(limits);
    const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalAmount = limits.planPrice + addonAmount;

    if (!payload.name || !payload.phone || !payload.plan) {
      setStatus("請先完成必填欄位（姓名、電話、方案）。", "error");
      return;
    }

    showProgress(true);
    setProgressStep(1, "正在整理表單與 features_json…");

    try {
      setProgressStep(2, "正在送出建卡資料…");

      const res  = await fetch(CONFIG.GAS_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
      });

      const data = await parseJsonSafe(res);

      if (!data || !data.ok) {
        throw new Error(data?.error || data?.message || "建立名片失敗，請稍後再試。");
      }

      setProgressStep(3, "正在整理報價資料…");

      /* 相容多種 GAS 回傳格式 */
      const cardId =
        data.card_id       ||
        data.id            ||
        data.card?.id      ||
        data.card?.card_id ||
        data.data?.card_id ||
        data.data?.id      ||
        "";

      const previewUrl = cardId
        ? `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`
        : CONFIG.SHOWCASE_URL;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const paymentDueAt = dueDate.toISOString();

      setProgressStep(4, "正在寫入報價與預覽資料…");

      const quoteData = {
        card_id:        cardId,
        customer_name:  payload.name      || "",
        plan_name:      limits.planLabel  || "方案",
        submitted_at:   new Date().toISOString(),
        payment_notice: "請於 3 天內完成付款",
        payment_due_at: paymentDueAt,
        preview_url:    previewUrl,
        plan_amount:    Number(limits.planPrice || 0),
        addon_items:    addonItems,
        addon_amount:   Number(addonAmount || 0),
        total_amount:   Number(totalAmount || 0)
      };

      localStorage.setItem(CONFIG.QUOTE_STORAGE_KEY, JSON.stringify(quoteData));

      setProgressStep(5, "即將前往確認頁…");
      window.location.href = "./quote-success.html";

    } catch (err) {
      console.error("[HSC form] submit error:", err);
      setStatus("送出失敗：" + (err.message || "未知錯誤"), "error");
      showProgress(false);
    }
  }

  async function parseJsonSafe(res) {
    const raw = await res.text();
    try { return JSON.parse(raw); } catch (_) { return null; }
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
      plan, color: els["free_color"]?.value  || "c1",
      style: els["free_style"]?.value  || "s1", paper: els["free_paper"]?.value  || "f1"
    };
    return { plan, color: els["premium_color"]?.value || "p1", style: "", paper: "" };
  }

  /* ── 進度條 ── */
  function showProgress(show) {
    if (!els["submit-progress-overlay"]) return;
    els["submit-progress-overlay"].classList.toggle("hidden", !show);
    if (!show) {
      els.progressSteps.forEach(s => s.classList.remove("is-active","is-done"));
      if (els["progress-fill"]) els["progress-fill"].style.width = "0%";
      if (els["progress-text"]) els["progress-text"].textContent = "正在建立申請資料，請稍候。";
    }
  }

  function setProgressStep(stepNo, text) {
    const total = 5;
    els.progressSteps.forEach(step => {
      const n = Number(step.dataset.step || 0);
      step.classList.toggle("is-active", n === stepNo);
      step.classList.toggle("is-done",   n < stepNo);
    });
    if (els["progress-fill"]) els["progress-fill"].style.width = `${Math.round((stepNo / total) * 100)}%`;
    if (els["progress-text"] && text) els["progress-text"].textContent = text;
  }

  function setStatus(msg, stateName = "") {
    const el = els["form-status-strip"];
    if (!el) return;
    el.textContent = msg || "";
    if (msg) el.classList.add("visible"); else el.classList.remove("visible");
    if (stateName) el.dataset.state = stateName; else delete el.dataset.state;
  }

  /* ── 草稿 ── */
  function collectFormValues() {
    const out = {};
    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "radio") { if (el.checked) out[el.name] = el.value; return; }
      if (!el.id) return;
      out[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return out;
  }

  function saveDraft() {
    localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify({
      values: collectFormValues(),
      photoMeta: state.photoMeta,
      photoPreviewUrls: state.photoPreviewUrls
    }));
  }

  function saveDraftSilently() { try { saveDraft(); } catch (_) {} }

  function restoreDraft() {
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(CONFIG.DRAFT_KEY) || "null"); } catch (_) {}
    if (!draft || typeof draft !== "object") return;

    Object.keys(draft.values || {}).forEach(key => {
      const el = document.getElementById(key);
      if (el) {
        if (el.type === "checkbox") el.checked = !!draft.values[key];
        else el.value = draft.values[key];
        return;
      }
      if (key === "plan") {
        const r = document.querySelector(`input[name="plan"][value="${draft.values[key]}"]`);
        if (r) r.checked = true;
      }
    });

    if (draft.photoMeta        && typeof draft.photoMeta        === "object") state.photoMeta        = draft.photoMeta;
    if (draft.photoPreviewUrls && typeof draft.photoPreviewUrls === "object") state.photoPreviewUrls = draft.photoPreviewUrls;

    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
  }

  function clearDraft() {
    localStorage.removeItem(CONFIG.DRAFT_KEY);
    localStorage.removeItem(CONFIG.QUOTE_STORAGE_KEY);
    location.reload();
  }

  /* ── 格式化 ── */
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
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

})();
