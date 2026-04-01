(() => {
  "use strict";

  const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    SERVICE_URL: "https://lin.ee/G3VJoRm",
    SHOWCASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    QUOTE_STORAGE_KEY: "HSC_LAST_QUOTE",
    DRAFT_KEY: "hsc_form_draft_v776_full",
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
    }
  };

  const DEFAULT_PHOTO_META = {
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotate: 0
  };

  const state = {
    photoMeta: {
      avatar: { ...DEFAULT_PHOTO_META },
      logo: { ...DEFAULT_PHOTO_META }
    },
    photoPreviewUrls: {},
    photoFiles: {},
    wallPhotoCount: 0,
    ctaCount: 0
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

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
      "smart-card-form",
      "form-status-strip",
      "btn-open-showcase",
      "btn-save-draft",
      "btn-clear-draft",
      "btn-contact-service",
      "btn-submit-form",
      "btn-gold-info",
      "btn-gold-copy",
      "btn-gold-contact",
      "progress-contact-service",

      "invite_code",
      "ref",

      "addon_marquee_enabled",
      "addon_photo_enabled",
      "addon_photo_qty",
      "addon_cta_enabled",
      "addon_cta_qty",
      "addon_update_unlimited_enabled",
      "addon_bundle_enabled",
      "addon_agent_upgrade_enabled",
      "addon-photo-tip",

      "free-theme-group",
      "premium-theme-group",
      "free_color",
      "free_style",
      "free_paper",
      "premium_color",

      "display_name",
      "unit",
      "title",
      "phone",
      "email",
      "website",
      "line_url",
      "line_oa",
      "wechat_id",
      "experience",
      "services",
      "address",
      "intro",

      "marquee-section",
      "marquee_text",

      "photo-slots",
      "cta-slots",
      "livePreviewCard",

      "summary-plan-pill",
      "summary-photo-pill",
      "summary-cta-pill",
      "summary-plan-name",
      "summary-photo-count",
      "summary-cta-count",
      "summary-marquee-status",

      "quote-state-text",
      "quote-plan-amount",
      "quote-addon-amount",
      "quote-addon-breakdown",
      "quote-total-amount",

      "submit-progress-overlay",
      "progress-text",
      "progress-fill"
    ];

    ids.forEach(id => {
      els[id] = document.getElementById(id);
    });

    els.planRadios = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.addonCheckboxes = Array.from(document.querySelectorAll('input[name="addons"]'));
    els.planCards = Array.from(document.querySelectorAll("[data-plan-card]"));
    els.progressSteps = Array.from(document.querySelectorAll(".progress-step"));
    els.photoTemplate = document.getElementById("photo-slot-template");
    els.ctaTemplate = document.getElementById("cta-slot-template");
  }

  function ensureRendererAlias() {
    if (!window.HSCCardRenderer && window.HscCardRenderer) {
      window.HSCCardRenderer = window.HscCardRenderer;
    }
  }

  function bindStaticEvents() {
    if (els["smart-card-form"]) {
      els["smart-card-form"].addEventListener("submit", submit);
    }

    els.planRadios.forEach(radio => {
      radio.addEventListener("change", refreshAll);
    });

    els.addonCheckboxes.forEach(box => {
      box.addEventListener("change", refreshAll);
    });

    if (els["addon_photo_qty"]) {
      els["addon_photo_qty"].addEventListener("input", refreshAll);
      els["addon_photo_qty"].addEventListener("change", refreshAll);
    }

    if (els["addon_cta_qty"]) {
      els["addon_cta_qty"].addEventListener("input", refreshAll);
      els["addon_cta_qty"].addEventListener("change", refreshAll);
    }

    [
      "free_color",
      "free_style",
      "free_paper",
      "premium_color",
      "display_name",
      "unit",
      "title",
      "phone",
      "email",
      "website",
      "line_url",
      "line_oa",
      "wechat_id",
      "experience",
      "services",
      "address",
      "intro",
      "marquee_text"
    ].forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input", onLiveChange);
        els[id].addEventListener("change", onLiveChange);
      }
    });

    bindButton(els["btn-open-showcase"], () => {
      window.open(CONFIG.SHOWCASE_URL, "_blank", "noopener");
    });

    bindButton(els["btn-contact-service"], () => {
      window.open(CONFIG.SERVICE_URL, "_blank", "noopener");
    });

    bindButton(els["progress-contact-service"], () => {
      window.open(CONFIG.SERVICE_URL, "_blank", "noopener");
    });

    bindButton(els["btn-gold-contact"], () => {
      window.open(CONFIG.SERVICE_URL, "_blank", "noopener");
    });

    bindButton(els["btn-gold-info"], () => {
      alert("金牌級會員請聯繫客服瞭解完整權益與適合方案。");
    });

    bindButton(els["btn-gold-copy"], async () => {
      await copyText("您好，我想瞭解金牌級會員的完整權益與適合方案。");
      setStatus("已複製金牌會員詢問文案。");
    });

    bindButton(els["btn-save-draft"], () => {
      saveDraft();
      setStatus("草稿已暫存。");
    });

    bindButton(els["btn-clear-draft"], clearDraft);
  }

  function onLiveChange() {
    updatePreview();
    saveDraftSilently();
  }

  function bindButton(btn, handler) {
    if (!btn) return;
    btn.addEventListener("click", handler);
  }

  function ensureDefaultPlan() {
    const checked = getSelectedPlan();
    if (checked) return;
    const premium = els.planRadios.find(r => r.value === "premium");
    if (premium) premium.checked = true;
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

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (Number.isFinite(min) && n < min) return min;
    if (Number.isFinite(max) && n > max) return max;
    return n;
  }

  function normalizePhotoMeta(meta) {
    const src = meta && typeof meta === "object" ? meta : {};
    return {
      x: clampNumber(src.x, 0, 1, DEFAULT_PHOTO_META.x),
      y: clampNumber(src.y, 0, 1, DEFAULT_PHOTO_META.y),
      scale: clampNumber(src.scale, 0.5, 3, DEFAULT_PHOTO_META.scale),
      rotate: clampNumber(src.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
    };
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
    syncQuote(limits);
    updatePreview();
    saveDraftSilently();
  }

  function getLimits() {
    const plan = getSelectedPlan() || "premium";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;

    let extraWallPhotos = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let extraCtas = isAddonChecked("addon_cta") ? getAddonQty("addon_cta_qty") : 0;

    extraWallPhotos = clamp(extraWallPhotos, 0, CONFIG.MAX_WALL_PHOTOS - base.wallPhotos);
    extraCtas = clamp(extraCtas, 0, CONFIG.MAX_CTAS - base.ctas);

    const wallPhotos = clamp(base.wallPhotos + extraWallPhotos, 0, CONFIG.MAX_WALL_PHOTOS);
    const ctas = clamp(base.ctas + extraCtas, 0, CONFIG.MAX_CTAS);

    return {
      plan,
      planLabel: base.label,
      planPrice: base.price,
      wallPhotos,
      ctas,
      extraWallPhotos,
      extraCtas
    };
  }

  function syncPlanCards() {
    const plan = getSelectedPlan();
    els.planCards.forEach(card => {
      const p = card.getAttribute("data-plan-card");
      card.classList.toggle("is-selected", p === plan);
    });
  }

  function syncThemeGroups(plan) {
    if (els["free-theme-group"]) {
      els["free-theme-group"].classList.toggle("hidden", plan !== "free");
    }
    if (els["premium-theme-group"]) {
      els["premium-theme-group"].classList.toggle("hidden", plan !== "premium");
    }
  }

  function syncAddonInputs(limits) {
    if (els["addon_photo_qty"]) {
      const enabled = isAddonChecked("addon_photo");
      const maxExtra = Math.max(0, CONFIG.MAX_WALL_PHOTOS - CONFIG.BASE_LIMITS[limits.plan].wallPhotos);
      els["addon_photo_qty"].disabled = !enabled;
      els["addon_photo_qty"].max = String(maxExtra);
      if (!enabled) els["addon_photo_qty"].value = "0";
      if (Number(els["addon_photo_qty"].value || 0) > maxExtra) {
        els["addon_photo_qty"].value = String(maxExtra);
      }
    }

    if (els["addon-photo-tip"]) {
      const remain = Math.max(0, CONFIG.MAX_WALL_PHOTOS - CONFIG.BASE_LIMITS[limits.plan].wallPhotos);
      els["addon-photo-tip"].textContent = `本方案照片牆最多可再加 ${remain} 張`;
    }

    if (els["addon_cta_qty"]) {
      const enabled = isAddonChecked("addon_cta");
      const maxExtra = Math.max(0, CONFIG.MAX_CTAS - CONFIG.BASE_LIMITS[limits.plan].ctas);
      els["addon_cta_qty"].disabled = !enabled;
      els["addon_cta_qty"].max = String(maxExtra);
      if (!enabled) els["addon_cta_qty"].value = "0";
      if (Number(els["addon_cta_qty"].value || 0) > maxExtra) {
        els["addon_cta_qty"].value = String(maxExtra);
      }
    }
  }

  function syncMarqueeSection() {
    const enabled = isMarqueeEnabled();
    if (els["marquee-section"]) {
      els["marquee-section"].classList.toggle("hidden", !enabled);
    }
  }

  function ensurePhotoMetaKey(key) {
    if (!state.photoMeta[key]) {
      state.photoMeta[key] = { ...DEFAULT_PHOTO_META };
    } else {
      state.photoMeta[key] = normalizePhotoMeta(state.photoMeta[key]);
    }
  }

  function renderPhotoSections(wallLimit) {
    if (!els["photo-slots"] || !els.photoTemplate) return;

    state.wallPhotoCount = wallLimit;
    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");

    for (let i = 1; i <= wallLimit; i++) {
      ensurePhotoMetaKey(`photo${i}`);
    }

    els["photo-slots"].innerHTML = "";

    const sections = [
      {
        title: "個人照",
        desc: "固定 1 張，會套用到成品卡頭像。",
        keys: ["avatar"]
      },
      {
        title: "Logo",
        desc: "固定 1 張，會套用到成品卡 logo。",
        keys: ["logo"]
      },
      {
        title: "照片牆",
        desc: `本次可上傳 ${wallLimit} 張（不含個人照與 Logo）`,
        keys: Array.from({ length: wallLimit }, (_, idx) => `photo${idx + 1}`)
      }
    ];

    sections.forEach(section => {
      const wrapper = document.createElement("section");
      wrapper.className = "photo-section";

      const head = document.createElement("div");
      head.className = "photo-section-head";
      head.innerHTML = `
        <div>
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(section.desc)}</p>
        </div>
      `;

      const grid = document.createElement("div");
      grid.className = "photo-grid photo-grid-form";

      section.keys.forEach((key, index) => {
        const card = buildPhotoCard(key, section.title, index + 1);
        grid.appendChild(card);
      });

      wrapper.appendChild(head);
      wrapper.appendChild(grid);
      els["photo-slots"].appendChild(wrapper);
    });
  }

  function buildPhotoCard(key, sectionTitle, index) {
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
    const resetBtn = frag.querySelector(".reset-photo");

    card.dataset.photoKey = key;

    const labels = {
      avatar: "個人照",
      logo: "Logo"
    };

    title.textContent = labels[key] || `照片牆 ${index}`;
    fileInput.dataset.photoKey = key;
    zoomRange.dataset.photoKey = key;
    zoomRange.value = String(state.photoMeta[key]?.scale || 1);

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
      updatePreview();
      saveDraftSilently();
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
      state.photoMeta[key].x = clampNumber(Number((state.photoMeta[key].x - 0.05).toFixed(2)), 0, 1, 0.5);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });

    moveRight.addEventListener("click", () => {
      state.photoMeta[key].x = clampNumber(Number((state.photoMeta[key].x + 0.05).toFixed(2)), 0, 1, 0.5);
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

    hydratePhotoCardUi(key, {
      badge,
      previewImage,
      previewEmpty,
      tools,
      zoomRange
    });

    return card;
  }

  function hydratePhotoCardUi(key, refs) {
    ensurePhotoMetaKey(key);
    const { badge, previewImage, previewEmpty, tools, zoomRange } = refs;
    const src = state.photoPreviewUrls[key];

    if (zoomRange) {
      zoomRange.value = String(state.photoMeta[key].scale || 1);
    }

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
    const scale = clampNumber(meta.scale, 0.5, 3, 1);
    const rotate = clampNumber(meta.rotate, -180, 180, 0);
    const x = ((meta.x ?? 0.5) - 0.5) * 40;
    const y = ((meta.y ?? 0.5) - 0.5) * 40;
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`;
  }

  function renderCtas(limit) {
    if (!els["cta-slots"] || !els.ctaTemplate) return;

    const savedValues = collectCurrentCtaValues();
    els["cta-slots"].innerHTML = "";
    state.ctaCount = limit;

    for (let i = 1; i <= limit; i++) {
      const frag = els.ctaTemplate.content.cloneNode(true);
      const label = frag.querySelector(".cta-title-label");
      const textInput = frag.querySelector(".cta-label-input");
      const urlInput = frag.querySelector(".cta-url-input");

      label.textContent = `CTA ${i}`;

      textInput.id = `cta_text_${i}`;
      textInput.value = savedValues[`cta_text_${i}`] || "";
      textInput.addEventListener("input", onLiveChange);
      textInput.addEventListener("change", onLiveChange);

      urlInput.id = `cta_link_${i}`;
      urlInput.value = savedValues[`cta_link_${i}`] || "";
      urlInput.addEventListener("input", onLiveChange);
      urlInput.addEventListener("change", onLiveChange);

      els["cta-slots"].appendChild(frag);
    }
  }

  function collectCurrentCtaValues() {
    const out = {};
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const textInput = document.getElementById(`cta_text_${i}`);
      const urlInput = document.getElementById(`cta_link_${i}`);
      if (textInput) out[`cta_text_${i}`] = textInput.value || "";
      if (urlInput) out[`cta_link_${i}`] = urlInput.value || "";
    }
    return out;
  }

  function syncSummary(limits) {
    if (els["summary-plan-pill"]) {
      els["summary-plan-pill"].textContent = limits.planLabel;
    }
    if (els["summary-photo-pill"]) {
      els["summary-photo-pill"].textContent = `照片牆：${limits.wallPhotos}`;
    }
    if (els["summary-cta-pill"]) {
      els["summary-cta-pill"].textContent = `CTA 上限：${limits.ctas}`;
    }
    if (els["summary-plan-name"]) {
      els["summary-plan-name"].textContent = limits.planLabel;
    }
    if (els["summary-photo-count"]) {
      els["summary-photo-count"].textContent = String(limits.wallPhotos);
    }
    if (els["summary-cta-count"]) {
      els["summary-cta-count"].textContent = String(limits.ctas);
    }
    if (els["summary-marquee-status"]) {
      els["summary-marquee-status"].textContent = isMarqueeEnabled() ? "已開啟" : "未開啟";
    }
  }

  function getAddonItemsForQuote(limits) {
    const items = [];

    if (isAddonChecked("addon_bundle")) {
      items.push({
        code: "addon_bundle",
        name: "跑馬燈＋更新組合",
        qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_bundle,
        amount: CONFIG.ADDON_PRICES.addon_bundle
      });
      return items;
    }

    if (isAddonChecked("addon_marquee")) {
      items.push({
        code: "addon_marquee",
        name: "跑馬燈功能",
        qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_marquee,
        amount: CONFIG.ADDON_PRICES.addon_marquee
      });
    }

    if (isAddonChecked("addon_photo") && limits.extraWallPhotos > 0) {
      items.push({
        code: "addon_photo",
        name: "照片牆加購",
        qty: limits.extraWallPhotos,
        unit_price: CONFIG.ADDON_PRICES.addon_photo,
        amount: limits.extraWallPhotos * CONFIG.ADDON_PRICES.addon_photo
      });
    }

    if (isAddonChecked("addon_cta") && limits.extraCtas > 0) {
      items.push({
        code: "addon_cta",
        name: "CTA 加購",
        qty: limits.extraCtas,
        unit_price: CONFIG.ADDON_PRICES.addon_cta,
        amount: limits.extraCtas * CONFIG.ADDON_PRICES.addon_cta
      });
    }

    if (isAddonChecked("addon_update_unlimited")) {
      items.push({
        code: "addon_update_unlimited",
        name: "無限更新",
        qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_update_unlimited,
        amount: CONFIG.ADDON_PRICES.addon_update_unlimited
      });
    }

    if (isAddonChecked("addon_agent_upgrade")) {
      items.push({
        code: "addon_agent_upgrade",
        name: "金牌級會員",
        qty: 1,
        unit_price: CONFIG.ADDON_PRICES.addon_agent_upgrade,
        amount: CONFIG.ADDON_PRICES.addon_agent_upgrade
      });
    }

    return items;
  }

  function syncQuote(limits) {
    const addonItems = getAddonItemsForQuote(limits);
    const addonAmount = addonItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total = limits.planPrice + addonAmount;

    if (els["quote-state-text"]) {
      els["quote-state-text"].textContent = `${limits.planLabel}｜${money(total)}`;
    }
    if (els["quote-plan-amount"]) {
      els["quote-plan-amount"].textContent = money(limits.planPrice);
    }
    if (els["quote-addon-amount"]) {
      els["quote-addon-amount"].textContent = money(addonAmount);
    }
    if (els["quote-total-amount"]) {
      els["quote-total-amount"].textContent = money(total);
    }

    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!addonItems.length) {
        const span = document.createElement("span");
        span.textContent = "尚未選擇加購";
        els["quote-addon-breakdown"].appendChild(span);
      } else {
        addonItems.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          row.innerHTML = `<span>${escapeHtml(item.name)}${item.qty > 1 ? ` × ${item.qty}` : ""}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
  }

  function updatePreview() {
    const root = els["livePreviewCard"];
    if (!root) return;

    ensureRendererAlias();
    const renderer = window.HSCCardRenderer || window.HscCardRenderer;

    if (!renderer || typeof renderer.renderCard !== "function") {
      root.innerHTML = `<div class="renderer-error">找不到 HscCardRenderer，請確認已先載入 card-renderer.js</div>`;
      return;
    }

    const data = buildPreviewData();

    try {
      renderer.renderCard(data, {
        mode: "form",
        root: root,
        useExistingDom: true,
        qrMode: "preview",
        allowActions: false,
        previewUrl: buildPreviewUrl(),
        shareUrl: buildPreviewUrl(),
        cardUrl: buildPreviewUrl()
      });

      bindPreviewCollapseToggles(root);
    } catch (err) {
      console.error("updatePreview renderCard error:", err);
      root.innerHTML = `<div class="renderer-error">預覽渲染失敗：${escapeHtml(err.message || "未知錯誤")}</div>`;
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

      phone: valueOf("phone"),
      email: valueOf("email"),
      address: valueOf("address"),
      website: valueOf("website"),
      line_url: valueOf("line_url"),
      line_oa: valueOf("line_oa"),
      wechat_id: valueOf("wechat_id"),

      plan: theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,

      marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",

      photo_limit: limits.wallPhotos,
      cta_limit: limits.ctas,

      preview_url: buildPreviewUrl(),
      share_url: buildPreviewUrl(),
      card_url: buildPreviewUrl(),

      features: {
        photo_meta: buildPhotoMetaMap(),
        preview_meta: {
          ...CONFIG.DEFAULT_PREVIEW_META,
          theme: theme.plan
        }
      }
    };

    if (state.photoPreviewUrls.avatar) {
      data.avatar_url = state.photoPreviewUrls.avatar;
    }

    if (state.photoPreviewUrls.logo) {
      data.logo_url = state.photoPreviewUrls.logo;
    }

    for (let i = 1; i <= limits.wallPhotos; i++) {
      const key = `photo${i}`;
      if (state.photoPreviewUrls[key]) {
        data[`photo${i}_url`] = state.photoPreviewUrls[key];
      }
    }

    for (let i = 1; i <= limits.ctas; i++) {
      data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      data[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }

    return data;
  }

  function bindPreviewCollapseToggles(root) {
    if (!root) return;
    setupPreviewBlockClamp(root, "#block-service", 140);
    setupPreviewBlockClamp(root, "#block-exp", 180);
  }

  function setupPreviewBlockClamp(root, selector, collapsedHeight) {
    const block = root.querySelector(selector);
    if (!block) return;
    if (block.style.display === "none") return;

    const next = block.nextElementSibling;
    if (next && next.classList.contains("preview-more-toggle")) {
      next.remove();
    }

    block.style.maxHeight = "";
    block.style.overflow = "";
    block.classList.remove("is-collapsed");
    block.classList.remove("is-expanded");

    requestAnimationFrame(() => {
      const needsClamp = block.scrollHeight > collapsedHeight + 8;
      if (!needsClamp) return;

      block.style.maxHeight = `${collapsedHeight}px`;
      block.style.overflow = "hidden";
      block.classList.add("is-collapsed");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost-btn mini preview-more-toggle";
      btn.textContent = "展開更多";

      btn.addEventListener("click", () => {
        const expanded = block.classList.contains("is-expanded");

        if (expanded) {
          block.classList.remove("is-expanded");
          block.classList.add("is-collapsed");
          block.style.maxHeight = `${collapsedHeight}px`;
          block.style.overflow = "hidden";
          btn.textContent = "展開更多";
        } else {
          block.classList.remove("is-collapsed");
          block.classList.add("is-expanded");
          block.style.maxHeight = "none";
          block.style.overflow = "visible";
          btn.textContent = "收合";
        }
      });

      block.insertAdjacentElement("afterend", btn);
    });
  }

  function buildPhotoMetaMap() {
    const out = {
      avatar: normalizePhotoMeta(state.photoMeta.avatar),
      logo: normalizePhotoMeta(state.photoMeta.logo)
    };

    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) {
      const key = `photo${i}`;
      out[key] = normalizePhotoMeta(state.photoMeta[key]);
    }

    return out;
  }

  function buildPayload() {
    const limits = getLimits();
    const theme = getThemeSelection();
    const previewData = buildPreviewData();

    const payload = {
      action: "createCardWithOfflinePayment",
      tenant: "angel",

      name: previewData.name,
      unit: previewData.unit,
      title: previewData.title,
      phone: previewData.phone,
      email: previewData.email,
      website: previewData.website,
      line_url: previewData.line_url,
      line_oa: previewData.line_oa,
      wechat_id: previewData.wechat_id,
      experience: previewData.experience,
      services: previewData.services,
      address: previewData.address,
      slogan: previewData.slogan,

      invite_code: valueOf("invite_code"),
      ref: valueOf("ref"),

      plan: theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,

      marquee_text: previewData.marquee_text,
      photo_limit: limits.wallPhotos,
      cta_limit: limits.ctas,

      avatar_url: previewData.avatar_url || "",
      logo_url: previewData.logo_url || "",

      features_json: {
        photo_meta: buildPhotoMetaMap(),
        preview_meta: {
          ...CONFIG.DEFAULT_PREVIEW_META,
          theme: theme.plan
        }
      }
    };

    for (let i = 1; i <= limits.wallPhotos; i++) {
      const key = `photo${i}`;
      if (state.photoPreviewUrls[key]) {
        payload[`photo${i}_url`] = state.photoPreviewUrls[key];
      }
    }

    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }

    return payload;
  }

  async function submit(e) {
    e.preventDefault();

    const payload = buildPayload();
    const limits = getLimits();
    const addonItems = getAddonItemsForQuote(limits);
    const addonAmount = addonItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalAmount = limits.planPrice + addonAmount;

    if (!payload.name || !payload.phone || !payload.plan) {
      setStatus("請先完成必填欄位。", "error");
      return;
    }

    showProgress(true);
    setProgressStep(1, "正在整理表單與 features_json...");

    try {
      setProgressStep(2, "正在送出建卡資料...");

      const res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await parseJsonSafe(res);

      if (!data || !data.ok) {
        throw new Error(data?.error || "建立卡片失敗");
      }

      setProgressStep(4, "正在整理報價與預覽資料...");

      const cardId = data.card_id || data.card?.id || "";
      const previewUrl = `${CONFIG.SHOWCASE_URL}poster.html?id=${encodeURIComponent(cardId)}`;

      const quoteData = {
        card_id: cardId || "",
        customer_name: payload.name || "",
        submitted_at: new Date().toISOString(),
        payment_notice: "請於 3 天內完成付款",
        preview_url: previewUrl || "",
        plan_name: limits.planLabel || "方案",
        plan_amount: Number(limits.planPrice || 0),
        addon_items: Array.isArray(addonItems) ? addonItems : [],
        addon_amount: Number(addonAmount || 0),
        total_amount: Number(totalAmount || 0)
      };

      localStorage.setItem(CONFIG.QUOTE_STORAGE_KEY, JSON.stringify(quoteData));

      setProgressStep(5, "即將前往報價與預覽頁...");
      window.location.href = "./quote-success.html";
    } catch (err) {
      console.error(err);
      setStatus("送出失敗：" + (err.message || "未知錯誤"), "error");
      showProgress(false);
    }
  }

  async function parseJsonSafe(res) {
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function buildPreviewUrl() {
    return CONFIG.SHOWCASE_URL;
  }

  function isMarqueeEnabled() {
    return isAddonChecked("addon_marquee") || isAddonChecked("addon_bundle");
  }

  function valueOf(id) {
    const el = document.getElementById(id) || els[id];
    return (el?.value || "").trim();
  }

  function getThemeSelection() {
    const plan = getSelectedPlan() || "premium";
    if (plan === "free") {
      return {
        plan,
        color: els["free_color"]?.value || "c1",
        style: els["free_style"]?.value || "s1",
        paper: els["free_paper"]?.value || "f1"
      };
    }

    return {
      plan,
      color: els["premium_color"]?.value || "p1",
      style: "",
      paper: ""
    };
  }

  function showProgress(show) {
    if (!els["submit-progress-overlay"]) return;
    els["submit-progress-overlay"].classList.toggle("hidden", !show);

    if (!show) {
      els.progressSteps.forEach(step => {
        step.classList.remove("is-active", "is-done");
      });
      if (els["progress-fill"]) els["progress-fill"].style.width = "0%";
      if (els["progress-text"]) {
        els["progress-text"].textContent = "正在建立申請資料，請稍候。";
      }
    }
  }

  function setProgressStep(stepNo, text) {
    const total = 5;

    els.progressSteps.forEach(step => {
      const n = Number(step.dataset.step || 0);
      step.classList.toggle("is-active", n === stepNo);
      step.classList.toggle("is-done", n < stepNo);
    });

    if (els["progress-fill"]) {
      els["progress-fill"].style.width = `${Math.round((stepNo / total) * 100)}%`;
    }

    if (els["progress-text"] && text) {
      els["progress-text"].textContent = text;
    }
  }

  function setStatus(msg, stateName = "") {
    if (!els["form-status-strip"]) return;
    els["form-status-strip"].textContent = msg || "";
    if (stateName) {
      els["form-status-strip"].dataset.state = stateName;
    } else {
      delete els["form-status-strip"].dataset.state;
    }
  }

  function collectFormValues() {
    const out = {};

    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "radio") {
        if (el.checked) out[el.name] = el.value;
        return;
      }

      if (!el.id) return;

      if (el.type === "checkbox") {
        out[el.id] = el.checked;
      } else {
        out[el.id] = el.value;
      }
    });

    return out;
  }

  function saveDraft() {
    const draft = {
      values: collectFormValues(),
      photoMeta: state.photoMeta,
      photoPreviewUrls: state.photoPreviewUrls
    };
    localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(draft));
  }

  function saveDraftSilently() {
    try {
      saveDraft();
    } catch (_) {}
  }

  function restoreDraft() {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(CONFIG.DRAFT_KEY) || "null");
    } catch (_) {}

    if (!draft || typeof draft !== "object") return;

    const values = draft.values || {};
    Object.keys(values).forEach(key => {
      const byId = document.getElementById(key);
      if (byId) {
        if (byId.type === "checkbox") {
          byId.checked = !!values[key];
        } else {
          byId.value = values[key];
        }
        return;
      }

      if (key === "plan") {
        const planRadio = document.querySelector(`input[name="plan"][value="${values[key]}"]`);
        if (planRadio) planRadio.checked = true;
      }
    });

    if (draft.photoMeta && typeof draft.photoMeta === "object") {
      state.photoMeta = draft.photoMeta;
    }

    if (draft.photoPreviewUrls && typeof draft.photoPreviewUrls === "object") {
      state.photoPreviewUrls = draft.photoPreviewUrls;
    }

    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
  }

  function clearDraft() {
    localStorage.removeItem(CONFIG.DRAFT_KEY);
    localStorage.removeItem(CONFIG.QUOTE_STORAGE_KEY);
    location.reload();
  }

  function money(v) {
    return `NT$ ${Number(v || 0).toLocaleString("zh-TW")}`;
  }

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
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
