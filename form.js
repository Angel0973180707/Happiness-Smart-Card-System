const CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
  SHOWCASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  HOME_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  DELIVERY_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  FIREBASE_MODULE: "./firebase.js",
  CREATE_ACTION_FALLBACK: "createCardWithOfflinePayment",
  BANNER_RATIO: 3 / 1,
  BASE_LIMITS: {
    free: { wallPhotos: 2, ctas: 1, price: 1500, label: "自由搭配" },
    premium: { wallPhotos: 5, ctas: 3, price: 2000, label: "精品設計" }
  },
  ADDON_PRICES: {
    addon_marquee: 300,
    addon_photo: 100,
    addon_cta: 100,
    addon_update_unlimited: 300,
    addon_bundle: 500
  },
  MAX_WALL_PHOTOS: 10,
  MAX_CTAS: 10,
  DEFAULT_PREVIEW_META: { layout: "grid", aspect_ratio: "1:1", fit_mode: "cover" }
};

const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };
const THEME_CLASSES = [
  "mode-free","mode-premium",
  "color-1","color-2","color-3","color-4","color-5",
  "style-arch","style-flat","style-spot",
  "paper-1","paper-2","paper-3",
  "p1","p2","p3","p4","p5","p6","p7"
];

const state = {
  mode: "create",
  token: "",
  cardId: "",
  tempCardId: "",
  cardData: null,
  leadData: null,
  updateEligibility: null,
  renewSummary: null,
  renewCard: null,
  photoMeta: { avatar: { ...DEFAULT_PHOTO_META }, logo: { ...DEFAULT_PHOTO_META }, banner: { ...DEFAULT_PHOTO_META } },
  photoPreviewUrls: {},
  photoRealUrls: {},
  photoFiles: {},
  photoUploadTokens: {},
  photoUploadState: {},
  bannerCropSourceUrl: "",
  bannerCropImage: null,
  bannerCrop: { zoom: 1, offsetX: 0, offsetY: 0 },
  lastSubmitResult: null,
  draftValues: {},
  isBooting: true
};

const els = {};
let _fb = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  collectEls();
  ensureRendererAlias();
  parseQuery();
  bindEvents();
  initModeUI();
  state.tempCardId = "TEMP_" + Date.now();
  buildPhotoSlots();
  buildCtaSlots();
  restoreDraft();
  ensureDefaultPlan();

  if (state.mode === "update") {
    await bootUpdateMode();
  } else if (state.mode === "renew") {
    await bootRenewMode();
  }

  refreshAll();
  state.isBooting = false;
}

function collectEls() {
  const ids = [
    "smartCardForm","modeEyebrow","modeTitle","modeDesc","modeBadge","tokenBadge","cardBadge",
    "statusMode","statusTokenWrap","statusToken","statusCardWrap","statusCard","statusPlan",
    "plan","premium_color","free_color","free_style","free_paper",
    "display_name","unit","title","website","intro","services","experience",
    "phone","email","wechat_id","line_oa","line_url","address",
    "video1","video2","video3","social1","social2","social3",
    "file-avatar","file-logo","file-banner","preview-avatar","preview-logo","preview-banner",
    "photo-slots","cta-slots","wallLimitBadge","ctaLimitBadge","wallPhotoDesc","marquee-section","marquee_text",
    "update-rights-section","updateRightsGrid","updateChargeBox",
    "renew-section","renewCardGrid","renewQuoteTable",
    "preview-theme-scope","livePreviewCard",
    "btn-save-draft","btn-clear-draft","btn-contact-service","btn-submit-form",
    "submit-progress-overlay","progress-text","progress-fill","progress-success-panel",
    "progress-card-id-display","deliveryCardGrid","successReplyText",
    "btn-copy-success-text","btn-open-card-link","btn-open-delivery-link","btn-close-progress",
    "bannerCropModal","bannerCropCanvas","bannerZoomRange","btn-close-crop","btn-edit-banner",
    "btn-banner-left","btn-banner-right","btn-banner-up","btn-banner-down","btn-banner-reset","btn-apply-crop"
  ];
  ids.forEach(id => els[id] = document.getElementById(id));
}

function parseQuery() {
  const p = new URLSearchParams(location.search);
  state.mode = normalizeMode(p.get("mode") || "create");
  state.token = (p.get("token") || "").trim();
  state.cardId = (p.get("card_id") || p.get("id") || "").trim().toUpperCase();
}

function normalizeMode(v) {
  return ["create","update","renew"].includes(v) ? v : "create";
}

function initModeUI() {
  const map = {
    create: {
      eyebrow: "CREATE",
      title: "天使幸福智慧名片｜申請表單",
      desc: "建立新申請，完成後顯示交付卡資訊、成品連結與 3 天付款期限。"
    },
    update: {
      eyebrow: "UPDATE",
      title: "天使幸福智慧名片｜更新表單",
      desc: "依更新權益判斷是否可直接更新，或建立更新付款單。"
    },
    renew: {
      eyebrow: "RENEW",
      title: "天使幸福智慧名片｜續約表單",
      desc: "先載入續約卡片資料，再建立續約付款單與續約交付資訊。"
    }
  };
  const cfg = map[state.mode];
  text(els.modeEyebrow, cfg.eyebrow);
  text(els.modeTitle, cfg.title);
  text(els.modeDesc, cfg.desc);
  text(els.modeBadge, state.mode);
  text(els.statusMode, state.mode);

  if (state.token) {
    els.tokenBadge.classList.remove("hidden");
    text(els.tokenBadge, "token 已載入");
    els.statusTokenWrap.classList.remove("hidden");
    text(els.statusToken, shorten(state.token));
  }
  if (state.cardId) {
    els.cardBadge.classList.remove("hidden");
    text(els.cardBadge, state.cardId);
    els.statusCardWrap.classList.remove("hidden");
    text(els.statusCard, state.cardId);
  }

  if (state.mode === "update") {
    els["update-rights-section"].classList.remove("hidden");
  }
  if (state.mode === "renew") {
    els["renew-section"].classList.remove("hidden");
  }
}

function bindEvents() {
  const liveIds = [
    "plan","premium_color","free_color","free_style","free_paper",
    "display_name","unit","title","website","intro","services","experience",
    "phone","email","wechat_id","line_oa","line_url","address",
    "video1","video2","video3","social1","social2","social3","marquee_text"
  ];

  liveIds.forEach(id => {
    const el = els[id];
    if (!el) return;
    el.addEventListener("input", onLiveChange);
    el.addEventListener("change", onLiveChange);
  });

  els.plan.addEventListener("change", () => {
    syncPlanSections();
    rebuildDynamicSlotsByPlan();
    refreshAll();
  });

  els["file-avatar"].addEventListener("change", e => handlePhotoFile("avatar", e.target.files?.[0] || null));
  els["file-logo"].addEventListener("change", e => handlePhotoFile("logo", e.target.files?.[0] || null));
  els["file-banner"].addEventListener("change", e => handleBannerSelect(e.target.files?.[0] || null));
  els["btn-edit-banner"].addEventListener("click", openExistingBannerCrop);

  document.querySelectorAll("[data-clear-photo]").forEach(btn => {
    btn.addEventListener("click", () => clearPhoto(btn.dataset.clearPhoto));
  });

  els["btn-save-draft"].addEventListener("click", () => {
    saveDraft();
    toast("已暫存草稿");
  });

  els["btn-clear-draft"].addEventListener("click", clearDraft);
  els["btn-contact-service"].addEventListener("click", () => window.open(CONFIG.CUSTOMER_SERVICE_URL, "_blank"));
  els["smartCardForm"].addEventListener("submit", onSubmit);

  els["btn-copy-success-text"].addEventListener("click", async () => {
    await copyText(els["successReplyText"].value || "");
    toast("已複製客服文案");
  });
  els["btn-open-card-link"].addEventListener("click", () => openSuccessLink("card"));
  els["btn-open-delivery-link"].addEventListener("click", () => openSuccessLink("delivery"));
  els["btn-close-progress"].addEventListener("click", closeProgressOverlay);

  bindCropEvents();
}

function bindCropEvents() {
  els["btn-close-crop"].addEventListener("click", closeCropModal);
  els["bannerZoomRange"].addEventListener("input", e => {
    state.bannerCrop.zoom = clamp(parseFloat(e.target.value || "1") || 1, 1, 3);
    drawBannerCrop();
  });
  els["btn-banner-left"].addEventListener("click", () => moveCrop(-20, 0));
  els["btn-banner-right"].addEventListener("click", () => moveCrop(20, 0));
  els["btn-banner-up"].addEventListener("click", () => moveCrop(0, -10));
  els["btn-banner-down"].addEventListener("click", () => moveCrop(0, 10));
  els["btn-banner-reset"].addEventListener("click", resetBannerCrop);
  els["btn-apply-crop"].addEventListener("click", applyBannerCrop);
}

function onLiveChange() {
  if (state.isBooting) return;
  refreshAll();
}

async function bootUpdateMode() {
  if (!state.token) {
    renderInfoGrid(els.updateRightsGrid, [{ label: "錯誤", value: "缺少 token" }]);
    return;
  }

  try {
    const [cardResp, eligibilityResp] = await Promise.all([
      gasGet("getCardForUpdate", { token: state.token }),
      gasGet("getUpdateEligibility", { token: state.token })
    ]);

    state.cardData = pickCardPayload(cardResp);
    hydrateFormFromCard(state.cardData);

    state.updateEligibility = eligibilityResp || null;
    renderUpdateEligibility(eligibilityResp || {});
  } catch (err) {
    renderInfoGrid(els.updateRightsGrid, [{ label: "載入失敗", value: err.message || "update boot error" }]);
  }
}

async function bootRenewMode() {
  if (!state.cardId) {
    renderInfoGrid(els.renewCardGrid, [{ label: "錯誤", value: "缺少 card_id" }]);
    return;
  }

  try {
    const [cardResp, summaryResp] = await Promise.all([
      gasGet("getCardForRenewal", { card_id: state.cardId }),
      gasGet("getRenewalSummary", { card_id: state.cardId })
    ]);

    state.renewCard = cardResp || null;
    state.renewSummary = summaryResp || null;

    const card = pickRenewCardPayload(cardResp);
    if (card) {
      state.cardData = card;
      hydrateFormFromCard(card);
    }

    renderRenewSection(cardResp || {}, summaryResp || {});
  } catch (err) {
    renderInfoGrid(els.renewCardGrid, [{ label: "載入失敗", value: err.message || "renew boot error" }]);
  }
}

function pickCardPayload(resp) {
  return resp?.card || resp?.data || resp || null;
}

function pickRenewCardPayload(resp) {
  return resp?.card || resp?.data?.card || resp?.data || null;
}

function hydrateFormFromCard(card) {
  if (!card || typeof card !== "object") return;

  const plan = normalizePlan(card.plan || "free");
  els.plan.value = plan;
  if (plan === "premium") {
    els.premium_color.value = card.color || "p1";
  } else {
    els.free_color.value = card.color || "c1";
    els.free_style.value = card.style || "s1";
    els.free_paper.value = card.paper || "f1";
  }

  const map = {
    display_name: card.name || card.display_name || "",
    unit: card.unit || "",
    title: card.title || "",
    website: card.website || "",
    intro: card.slogan || card.intro || "",
    services: card.services || "",
    experience: card.experience || "",
    phone: card.phone || "",
    email: card.email || "",
    wechat_id: card.wechat_id || "",
    line_oa: card.line_oa || "",
    line_url: card.line_url || "",
    address: card.address || "",
    video1: card.video1 || "",
    video2: card.video2 || "",
    video3: card.video3 || "",
    social1: card.social1 || "",
    social2: card.social2 || "",
    social3: card.social3 || "",
    marquee_text: card.marquee_text || ""
  };

  Object.entries(map).forEach(([id, val]) => {
    if (els[id]) els[id].value = val || "";
  });

  if (card.avatar_url) setRemotePhoto("avatar", card.avatar_url);
  if (card.logo_url) setRemotePhoto("logo", card.logo_url);
  if (card.banner_url) setRemotePhoto("banner", card.banner_url);

  for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) {
    if (card[`photo${i}_url`]) setRemotePhoto(`photo${i}`, card[`photo${i}_url`]);
  }

  for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
    const textVal = card[`cta_text_${i}`] || card[`ctaText${i}`] || "";
    const linkVal = card[`cta_link_${i}`] || card[`ctaLink${i}`] || "";
    const textEl = document.getElementById(`cta_text_${i}`);
    const linkEl = document.getElementById(`cta_link_${i}`);
    if (textEl) textEl.value = textVal;
    if (linkEl) linkEl.value = linkVal;
  }

  syncPlanSections();
  rebuildDynamicSlotsByPlan(card);
}

function setRemotePhoto(key, url) {
  if (!url) return;
  state.photoPreviewUrls[key] = url;
  state.photoRealUrls[key] = url;
  state.photoUploadState[key] = "done";
  updatePhotoPreview(key, url);
  updateUploadBadge(key, "done", "已載入 ✓");
}

function ensureDefaultPlan() {
  els.plan.value = normalizePlan(els.plan.value || "free");
  syncPlanSections();
}

function normalizePlan(v) {
  return v === "premium" ? "premium" : "free";
}

function syncPlanSections() {
  const plan = normalizePlan(els.plan.value);
  text(els.statusPlan, plan);
  document.querySelectorAll(".premium-only").forEach(el => el.classList.toggle("hidden", plan !== "premium"));
  document.querySelectorAll(".free-only").forEach(el => el.classList.toggle("hidden", plan !== "free"));
  syncMarqueeVisibility();
}

function syncMarqueeVisibility() {
  const enabled = isMarqueeEnabled();
  els["marquee-section"].classList.toggle("hidden", !enabled);
}

function isMarqueeEnabled() {
  if (state.mode === "renew") {
    return !!(state.renewSummary?.keep_marquee || state.cardData?.marquee_enabled || state.cardData?.marquee_text);
  }
  return true;
}

function rebuildDynamicSlotsByPlan(card = null) {
  buildPhotoSlots(card);
  buildCtaSlots(card);
}

function getLimits(card = null) {
  const plan = normalizePlan(els.plan.value);
  let wallPhotos = CONFIG.BASE_LIMITS[plan].wallPhotos;
  let ctas = CONFIG.BASE_LIMITS[plan].ctas;

  if (card?.photo_limit) wallPhotos = Math.max(wallPhotos, parseInt(card.photo_limit, 10) || wallPhotos);
  if (card?.cta_limit) ctas = Math.max(ctas, parseInt(card.cta_limit, 10) || ctas);
  if (state.renewSummary?.keep_photo_extra_qty) {
    wallPhotos = Math.max(wallPhotos, CONFIG.BASE_LIMITS[plan].wallPhotos + parseInt(state.renewSummary.keep_photo_extra_qty, 10));
  }
  if (state.renewSummary?.keep_cta_extra_qty) {
    ctas = Math.max(ctas, CONFIG.BASE_LIMITS[plan].ctas + parseInt(state.renewSummary.keep_cta_extra_qty, 10));
  }

  wallPhotos = clampInt(wallPhotos, 0, CONFIG.MAX_WALL_PHOTOS);
  ctas = clampInt(ctas, 0, CONFIG.MAX_CTAS);
  return { wallPhotos, ctas };
}

function buildPhotoSlots(card = null) {
  const limits = getLimits(card || state.cardData || {});
  const wrap = els["photo-slots"];
  if (!wrap) return;
  wrap.innerHTML = "";

  for (let i = 1; i <= limits.wallPhotos; i++) {
    const key = `photo${i}`;
    const box = document.createElement("div");
    box.className = "photo-card";
    box.dataset.photoKey = key;
    box.innerHTML = `
      <div class="photo-head"><span class="photo-title">照片牆 ${i}</span><span class="badge" data-upload-state="${state.photoUploadState[key] || "idle"}">尚未選圖</span></div>
      <div class="preview-frame" id="preview-${key}"><div class="preview-empty">尚未上傳</div></div>
      <div class="photo-right-col">
        <input class="photo-file-input" id="file-${key}" type="file" accept="image/*" />
        <div class="photo-tools"><div class="photo-tool-row"><button type="button" class="mini ghost-btn" data-clear-photo="${key}">清除</button></div></div>
      </div>`;
    wrap.appendChild(box);
  }

  text(els.wallLimitBadge, `${limits.wallPhotos} / ${CONFIG.MAX_WALL_PHOTOS}`);

  wrap.querySelectorAll("input[type=file]").forEach(input => {
    const key = input.id.replace("file-", "");
    input.addEventListener("change", e => handlePhotoFile(key, e.target.files?.[0] || null));
  });
  wrap.querySelectorAll("[data-clear-photo]").forEach(btn => {
    btn.addEventListener("click", () => clearPhoto(btn.dataset.clearPhoto));
  });

  for (let i = 1; i <= limits.wallPhotos; i++) {
    const key = `photo${i}`;
    if (state.photoPreviewUrls[key]) updatePhotoPreview(key, state.photoPreviewUrls[key]);
    updateUploadBadge(key, state.photoUploadState[key] || "idle", badgeTextForState(key));
  }
}

function buildCtaSlots(card = null) {
  const limits = getLimits(card || state.cardData || {});
  const wrap = els["cta-slots"];
  if (!wrap) return;
  wrap.innerHTML = "";
  for (let i = 1; i <= limits.ctas; i++) {
    const box = document.createElement("div");
    box.className = "cta-slot-card";
    box.innerHTML = `
      <div class="cta-title-label">CTA ${i}</div>
      <div class="field-group"><label class="field-label" for="cta_text_${i}">按鈕文字</label><input id="cta_text_${i}" type="text" placeholder="例：加入 LINE" /></div>
      <div class="field-group"><label class="field-label" for="cta_link_${i}">按鈕連結</label><input id="cta_link_${i}" type="url" placeholder="https://..." /></div>`;
    wrap.appendChild(box);
  }
  text(els.ctaLimitBadge, `${limits.ctas} / ${CONFIG.MAX_CTAS}`);

  wrap.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", onLiveChange);
    input.addEventListener("change", onLiveChange);
  });

  for (let i = 1; i <= limits.ctas; i++) {
    const savedText = state.draftValues[`cta_text_${i}`] ?? "";
    const savedLink = state.draftValues[`cta_link_${i}`] ?? "";
    const t = document.getElementById(`cta_text_${i}`);
    const l = document.getElementById(`cta_link_${i}`);
    if (t && !t.value) t.value = savedText;
    if (l && !l.value) l.value = savedLink;
  }
}

async function getFirebase() {
  if (_fb) return _fb;
  _fb = await import(CONFIG.FIREBASE_MODULE);
  return _fb;
}

async function handlePhotoFile(key, file) {
  if (!file) return;
  const localUrl = URL.createObjectURL(file);
  state.photoFiles[key] = file;
  state.photoPreviewUrls[key] = localUrl;
  state.photoUploadState[key] = "pending";
  updatePhotoPreview(key, localUrl);
  updateUploadBadge(key, "pending", "待上傳…");
  saveDraft();
  updatePreview();
  try {
    await uploadPhotoToFirebase(key, file);
    saveDraft();
    updatePreview();
  } catch (err) {
    console.error(err);
    toast(`圖片上傳失敗：${key}`);
  }
}

async function handleBannerSelect(file) {
  if (!file) return;
  if (state.mode === "renew") {
    toast("續約模式不開放修改 Banner");
    return;
  }
  state.photoFiles.bannerSource = file;
  const url = URL.createObjectURL(file);
  state.bannerCropSourceUrl = url;
  await prepareBannerCrop(url);
  openCropModal();
}

async function prepareBannerCrop(url) {
  const img = await loadImage(url);
  state.bannerCropImage = img;
  resetBannerCrop();
}

function openExistingBannerCrop() {
  if (state.mode === "renew") {
    toast("續約模式不開放修改 Banner");
    return;
  }
  if (!state.bannerCropImage && !state.bannerCropSourceUrl) {
    toast("請先選擇 Banner 圖片");
    return;
  }
  if (state.bannerCropSourceUrl && !state.bannerCropImage) {
    prepareBannerCrop(state.bannerCropSourceUrl).then(openCropModal).catch(err => toast(err.message || "Banner 載入失敗"));
    return;
  }
  openCropModal();
}

function openCropModal() {
  els["bannerCropModal"].classList.remove("hidden");
  drawBannerCrop();
}

function closeCropModal() {
  els["bannerCropModal"].classList.add("hidden");
}

function resetBannerCrop() {
  state.bannerCrop = { zoom: 1, offsetX: 0, offsetY: 0 };
  if (els["bannerZoomRange"]) els["bannerZoomRange"].value = "1";
  drawBannerCrop();
}

function moveCrop(dx, dy) {
  state.bannerCrop.offsetX += dx;
  state.bannerCrop.offsetY += dy;
  drawBannerCrop();
}

function drawBannerCrop() {
  const canvas = els["bannerCropCanvas"];
  const img = state.bannerCropImage;
  if (!canvas || !img) return;
  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#ede7df";
  ctx.fillRect(0, 0, cw, ch);

  const zoom = state.bannerCrop.zoom || 1;
  const scale = Math.max(cw / img.width, ch / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (cw - dw) / 2 + state.bannerCrop.offsetX;
  const dy = (ch - dh) / 2 + state.bannerCrop.offsetY;

  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, cw - 4, ch - 4);
}

async function applyBannerCrop() {
  const canvas = els["bannerCropCanvas"];
  if (!canvas) return;
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  const file = new File([blob], `banner-${Date.now()}.jpg`, { type: "image/jpeg" });
  const localUrl = URL.createObjectURL(blob);
  state.photoFiles.banner = file;
  state.photoPreviewUrls.banner = localUrl;
  state.photoUploadState.banner = "pending";
  updatePhotoPreview("banner", localUrl);
  updateUploadBadge("banner", "pending", "待上傳…");
  closeCropModal();
  saveDraft();
  updatePreview();
  try {
    await uploadPhotoToFirebase("banner", file);
    saveDraft();
    updatePreview();
  } catch (err) {
    console.error(err);
    toast("Banner 上傳失敗");
  }
}

async function uploadPhotoToFirebase(key, file) {
  const token = Date.now() + "_" + Math.random().toString(36).slice(2);
  state.photoUploadTokens[key] = token;
  state.photoUploadState[key] = "uploading";
  updateUploadBadge(key, "uploading", "上傳中…");

  const fb = await getFirebase();
  await fb.ensureAuth();

  const cardId = state.cardId || state.tempCardId || ("TEMP_" + Date.now());
  const fileName = `${key}.jpg`;
  const url = await fb.uploadImage(cardId, file, fileName);

  if (state.photoUploadTokens[key] !== token) return url;
  state.photoRealUrls[key] = url;
  state.photoUploadState[key] = "done";
  updateUploadBadge(key, "done", "已上傳 ✓");
  return url;
}

function updateUploadBadge(key, uploadState, textValue) {
  const card = document.querySelector(`[data-photo-key="${key}"]`);
  if (!card) return;
  const badge = card.querySelector(".badge");
  if (!badge) return;
  badge.dataset.uploadState = uploadState;
  badge.textContent = textValue;
}

function badgeTextForState(key) {
  const s = state.photoUploadState[key] || "idle";
  const map = {
    idle: key === "banner" ? "固定 3:1 裁切" : "尚未選圖",
    pending: "待上傳…",
    uploading: "上傳中…",
    done: "已上傳 ✓",
    error: "上傳失敗"
  };
  return map[s] || map.idle;
}

function updatePhotoPreview(key, url) {
  const box = document.getElementById(`preview-${key}`);
  if (!box) return;
  box.innerHTML = url ? `<img class="preview-image" src="${escapeHtml(url)}" alt="${key}">` : `<div class="preview-empty">尚未上傳</div>`;
}

function clearPhoto(key) {
  delete state.photoFiles[key];
  delete state.photoPreviewUrls[key];
  delete state.photoRealUrls[key];
  delete state.photoUploadTokens[key];
  state.photoUploadState[key] = "idle";
  updatePhotoPreview(key, "");
  updateUploadBadge(key, "idle", badgeTextForState(key));
  const fileInput = document.getElementById(`file-${key}`);
  if (fileInput) fileInput.value = "";
  saveDraft();
  updatePreview();
}

function refreshAll() {
  syncPlanSections();
  syncPreviewContainerClasses();
  saveDraft();
  updatePreview();
}

function syncPreviewContainerClasses() {
  const scope = els["preview-theme-scope"];
  if (!scope) return;
  THEME_CLASSES.forEach(c => scope.classList.remove(c));
  const theme = getThemeSelection();
  if (theme.plan === "premium") {
    scope.classList.add("mode-premium", mapPremiumColor(theme.color));
  } else {
    scope.classList.add("mode-free", mapFreeColor(theme.color), mapStyle(theme.style), mapPaper(theme.paper));
  }
}

function mapFreeColor(v) {
  return ({ c1:"color-1", c2:"color-2", c3:"color-3", c4:"color-4", c5:"color-5" })[v] || "color-1";
}
function mapStyle(v) {
  return ({ s1:"style-arch", s2:"style-flat", s3:"style-spot" })[v] || "style-arch";
}
function mapPaper(v) {
  return ({ f1:"paper-1", f2:"paper-2", f3:"paper-3" })[v] || "paper-1";
}
function mapPremiumColor(v) {
  return ["p1","p2","p3","p4","p5","p6","p7"].includes(v) ? v : "p1";
}

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
      mode: "form",
      root,
      useExistingDom: false,
      qrMode: "preview",
      allowActions: false,
      previewUrl: CONFIG.SHOWCASE_URL,
      shareUrl: CONFIG.SHOWCASE_URL,
      cardUrl: CONFIG.SHOWCASE_URL
    });
    bindPreviewCollapseToggles(root);
  } catch (err) {
    console.error("updatePreview error:", err);
    root.innerHTML = `<div class="renderer-error">預覽渲染失敗：${escapeHtml(err.message || "未知")}</div>`;
  }
}

function buildPreviewData() {
  const limits = getLimits(state.cardData || {});
  const theme = getThemeSelection();
  const data = {
    id: state.cardId || "PREVIEW",
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
      photo_preview_urls: { ...state.photoPreviewUrls },
      banner_url: state.photoRealUrls.banner || state.photoPreviewUrls.banner || ""
    }
  };

  const avatarUrl = state.photoRealUrls.avatar || state.photoPreviewUrls.avatar || "";
  const logoUrl = state.photoRealUrls.logo || state.photoPreviewUrls.logo || "";
  if (avatarUrl) data.avatar_url = avatarUrl;
  if (logoUrl) data.logo_url = logoUrl;
  if (state.photoRealUrls.banner || state.photoPreviewUrls.banner) {
    data.banner_url = state.photoRealUrls.banner || state.photoPreviewUrls.banner;
  }

  for (let i = 1; i <= limits.wallPhotos; i++) {
    const key = `photo${i}`;
    const url = state.photoRealUrls[key] || state.photoPreviewUrls[key] || "";
    if (url) data[`photo${i}_url`] = url;
  }

  for (let i = 1; i <= limits.ctas; i++) {
    const t = valueOf(`cta_text_${i}`);
    const l = valueOf(`cta_link_${i}`);
    if (t && l) {
      data[`cta_text_${i}`] = t;
      data[`cta_link_${i}`] = l;
    }
  }

  return data;
}

function buildPhotoMetaMap() {
  const map = {};
  Object.keys(state.photoPreviewUrls).forEach(key => {
    map[key] = state.photoMeta[key] || { ...DEFAULT_PHOTO_META };
  });
  return map;
}

function getThemeSelection() {
  const plan = normalizePlan(els.plan.value);
  if (plan === "premium") {
    return { plan, color: els.premium_color.value || "p1", style: "", paper: "" };
  }
  return {
    plan,
    color: els.free_color.value || "c1",
    style: els.free_style.value || "s1",
    paper: els.free_paper.value || "f1"
  };
}

function renderUpdateEligibility(data) {
  const grid = els.updateRightsGrid;
  const freeLimit = data.free_limit ?? data.free_update_limit_yearly ?? 0;
  const used = data.used ?? data.used_count ?? 0;
  const remaining = data.remaining ?? Math.max(0, freeLimit - used);
  const unlimited = boolText(data.unlimited || data.update_unlimited || false);
  const chargeRequired = boolText(data.charge_required);
  const amount = formatMoney(data.amount || data.update_fee || 0);

  renderInfoGrid(grid, [
    { label: "免費額度", value: freeLimit },
    { label: "已使用", value: used },
    { label: "剩餘", value: remaining },
    { label: "無限更新", value: unlimited },
    { label: "是否需付費", value: chargeRequired },
    { label: "本次金額", value: amount }
  ]);

  const chargeBox = els.updateChargeBox;
  chargeBox.classList.remove("hidden");
  chargeBox.innerHTML = data.charge_required
    ? `<strong>本次更新需付費 ${amount}</strong><br><span class="muted">送出後將建立更新付款單，而不是直接更新名片。</span>`
    : `<strong>本次更新可直接套用</strong><br><span class="muted">送出後將直接呼叫 updateCardByToken。</span>`;
}

function renderRenewSection(cardResp, summary) {
  renderInfoGrid(els.renewCardGrid, [
    { label: "卡號", value: state.cardId || summary.card_id || "—" },
    { label: "目前方案", value: summary.current_plan || cardResp.current_plan || state.cardData?.plan || "—" },
    { label: "目前到期", value: summary.current_expires_at || cardResp.current_expires_at || state.cardData?.expires_at || "—" },
    { label: "新到期", value: summary.new_expires_at || "送出後決定" },
    { label: "可續約", value: boolText(cardResp.can_renew !== false) },
    { label: "保留跑馬燈", value: boolText(summary.keep_marquee) },
    { label: "保留照片加購", value: summary.keep_photo_extra_qty ?? 0 },
    { label: "保留 CTA 加購", value: summary.keep_cta_extra_qty ?? 0 },
    { label: "本年無限更新", value: boolText(summary.update_unlimited_current) },
    { label: "續約含無限更新", value: boolText(summary.update_unlimited_renew) }
  ]);

  const rows = [
    { label: "續約基本費", value: formatMoney(summary.renewal_price || summary.renewal_amount || 0) },
    { label: "升級差額", value: formatMoney(summary.upgrade_diff || 0) },
    { label: "加購保留金額", value: formatMoney(summary.addon_amount || 0) },
    { label: "總金額", value: formatMoney(summary.total_amount || 0), total: true }
  ];

  els.renewQuoteTable.innerHTML = rows.map(r => `
    <div class="quote-row ${r.total ? "total" : ""}">
      <div>${escapeHtml(r.label)}</div>
      <div>${escapeHtml(String(r.value))}</div>
    </div>
  `).join("");
}

function renderInfoGrid(target, items) {
  target.innerHTML = items.map(item => `
    <div class="info-chip"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.value ?? "—"))}</strong></div>
  `).join("");
}

function valueOf(id) {
  const el = document.getElementById(id);
  return (el?.value || "").trim();
}

function buildPayloadBase() {
  const theme = getThemeSelection();
  const limits = getLimits(state.cardData || {});
  const payload = {
    plan: theme.plan,
    color: theme.color,
    style: theme.style,
    paper: theme.paper,
    name: valueOf("display_name"),
    unit: valueOf("unit"),
    title: valueOf("title"),
    slogan: valueOf("intro"),
    intro: valueOf("intro"),
    services: valueOf("services"),
    experience: valueOf("experience"),
    phone: valueOf("phone"),
    email: valueOf("email"),
    website: valueOf("website"),
    line_url: valueOf("line_url"),
    line_oa: valueOf("line_oa"),
    wechat_id: valueOf("wechat_id"),
    address: valueOf("address"),
    video1: valueOf("video1"),
    video2: valueOf("video2"),
    video3: valueOf("video3"),
    social1: valueOf("social1"),
    social2: valueOf("social2"),
    social3: valueOf("social3"),
    marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
    marquee_enabled: isMarqueeEnabled() ? "true" : "",
    photo_limit: limits.wallPhotos,
    cta_limit: limits.ctas
  };

  const avatarUrl = state.photoRealUrls.avatar || state.photoPreviewUrls.avatar || "";
  const logoUrl = state.photoRealUrls.logo || state.photoPreviewUrls.logo || "";
  const bannerUrl = state.photoRealUrls.banner || state.photoPreviewUrls.banner || "";
  if (avatarUrl) payload.avatar_url = avatarUrl;
  if (logoUrl) payload.logo_url = logoUrl;
  if (bannerUrl) payload.banner_url = bannerUrl;

  for (let i = 1; i <= limits.wallPhotos; i++) {
    const key = `photo${i}`;
    const url = state.photoRealUrls[key] || state.photoPreviewUrls[key] || "";
    if (url) payload[`${key}_url`] = url;
  }

  for (let i = 1; i <= limits.ctas; i++) {
    const txt = valueOf(`cta_text_${i}`);
    const lnk = valueOf(`cta_link_${i}`);
    if (txt || lnk) {
      payload[`cta_text_${i}`] = txt;
      payload[`cta_link_${i}`] = lnk;
    }
  }

  return payload;
}

async function onSubmit(e) {
  e.preventDefault();

  try {
    validateBeforeSubmit();
    openProgressOverlay();
    await setProgress(1, "等待圖片上傳完成…");
    await waitAllUploads();

    let result;
    if (state.mode === "create") {
      result = await submitCreate();
    } else if (state.mode === "update") {
      result = await submitUpdate();
    } else {
      result = await submitRenew();
    }

    state.lastSubmitResult = result;
    await setProgress(4, "生成交付資訊…");
    renderSuccessPanel(result);
    await setProgress(5, "完成");
    clearDraftSilently();
  } catch (err) {
    console.error(err);
    toast(err.message || "送出失敗");
    closeProgressOverlay(false);
  }
}

function validateBeforeSubmit() {
  if (state.mode !== "renew") {
    if (!valueOf("display_name")) throw new Error("請填寫姓名");
    if (!valueOf("title")) throw new Error("請填寫職稱");
  }

  const limits = getLimits(state.cardData || {});
  for (let i = 1; i <= limits.ctas; i++) {
    const txt = valueOf(`cta_text_${i}`);
    const lnk = valueOf(`cta_link_${i}`);
    if (!!txt !== !!lnk) throw new Error(`CTA ${i} 需同時填寫文字與連結`);
  }
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
        const timer = setInterval(() => {
          const cur = state.photoUploadState[key];
          if (cur === "done") {
            clearInterval(timer);
            resolve();
            return;
          }
          if (cur === "error") {
            clearInterval(timer);
            reject(new Error(`圖片上傳失敗：${key}`));
            return;
          }
          if (Date.now() - start > 30000) {
            clearInterval(timer);
            reject(new Error(`圖片上傳逾時：${key}`));
          }
        }, 300);
      });
    }

    if (state.photoUploadState[key] === "error") {
      throw new Error(`圖片 ${key} 上傳失敗，請重新選取後再送出。`);
    }
  }
}

async function submitCreate() {
  await setProgress(2, "建立申請資料…");
  const payload = buildPayloadBase();
  let leadResp;
  try {
    leadResp = await gasPost("createLead", payload);
  } catch (err) {
    leadResp = { ok: false, error: err.message };
  }

  const leadId = leadResp?.lead_id || leadResp?.data?.lead_id || leadResp?.lead?.id || "";
  const createPayload = { ...payload };
  if (leadId) createPayload.lead_id = leadId;

  await setProgress(3, "建立卡片與付款資訊…");
  let cardResp;
  try {
    cardResp = await gasPost("createCard", createPayload);
  } catch (err) {
    cardResp = await gasPost(CONFIG.CREATE_ACTION_FALLBACK, createPayload);
  }

  const card = pickCardPayload(cardResp) || cardResp?.card || cardResp;
  const cardId = card?.id || cardResp?.card_id || cardResp?.id || state.cardId || "";
  state.cardId = cardId || state.cardId;

  return {
    mode: "create",
    leadResp,
    cardResp,
    lead_id: leadId,
    card_id: cardId,
    update_token: card?.update_token || cardResp?.update_token || "",
    payment_due_at: card?.payment_due_at || cardResp?.payment_due_at || addDaysIso(3),
    billing_status: card?.billing_status || cardResp?.billing_status || "pending",
    poster_url: buildDeliveryUrl(cardId, { view: 1, mode: "poster" }),
    delivery_url: buildDeliveryUrl(cardId, { view: 1, mode: "delivery" }),
    card_url: buildCardUrl(cardId),
    renew_url: buildFormUrl("renew", { card_id: cardId }),
    update_url: buildFormUrl("update", { token: card?.update_token || cardResp?.update_token || "" })
  };
}

async function submitUpdate() {
  await setProgress(2, "重新讀取更新權益…");
  const eligibility = await gasGet("getUpdateEligibility", { token: state.token });
  state.updateEligibility = eligibility;

  const payload = buildPayloadBase();
  payload.token = state.token;

  await setProgress(3, eligibility?.charge_required ? "建立更新付款單…" : "直接更新名片…");

  let resp;
  let modeDetail;
  if (eligibility?.charge_required) {
    resp = await gasPost("createUpdateFeePayment", payload);
    modeDetail = "payment";
  } else {
    resp = await gasPost("updateCardByToken", payload);
    modeDetail = "direct_update";
  }

  const card = pickCardPayload(resp) || state.cardData || {};
  const cardId = card?.id || resp?.card_id || state.cardId || "";
  state.cardId = cardId || state.cardId;

  return {
    mode: "update",
    update_mode: modeDetail,
    updateEligibility: eligibility,
    response: resp,
    card_id: cardId,
    update_token: state.token,
    payment_due_at: resp?.payment_due_at || addDaysIso(3),
    billing_status: resp?.billing_status || card?.billing_status || (eligibility?.charge_required ? "pending" : "paid"),
    poster_url: buildDeliveryUrl(cardId, { view: 1, mode: "poster" }),
    delivery_url: buildDeliveryUrl(cardId, { view: 1, mode: "delivery" }),
    card_url: buildCardUrl(cardId),
    renew_url: buildFormUrl("renew", { card_id: cardId }),
    update_url: buildFormUrl("update", { token: state.token })
  };
}

async function submitRenew() {
  await setProgress(2, "確認續約資料…");
  if (!state.cardId) throw new Error("缺少 card_id，無法續約");

  await setProgress(3, "建立續約付款單…");
  const resp = await gasPost("createRenewalPayment", { card_id: state.cardId });

  return {
    mode: "renew",
    response: resp,
    card_id: state.cardId,
    payment_due_at: resp?.payment?.due_at || resp?.due_at || addDaysIso(3),
    billing_status: resp?.payment?.status || "pending",
    poster_url: buildDeliveryUrl(state.cardId, { view: 1, mode: "poster" }),
    delivery_url: buildDeliveryUrl(state.cardId, { view: 1, mode: "delivery" }),
    card_url: buildCardUrl(state.cardId),
    renew_url: buildFormUrl("renew", { card_id: state.cardId }),
    update_url: buildFormUrl("update", { token: state.token || "" })
  };
}

function openProgressOverlay() {
  els["submit-progress-overlay"].classList.remove("hidden");
  els["progress-success-panel"].classList.add("hidden");
  els["btn-close-progress"].classList.add("hidden");
  setProgressVisual(0);
  document.querySelectorAll(".progress-step").forEach(li => li.classList.remove("done","active"));
}

async function setProgress(step, message) {
  text(els["progress-text"], message || "處理中…");
  setProgressVisual(step);
  document.querySelectorAll(".progress-step").forEach(li => {
    const n = parseInt(li.dataset.step, 10) || 0;
    li.classList.toggle("done", n < step);
    li.classList.toggle("active", n === step);
  });
  await wait(120);
}

function setProgressVisual(step) {
  const pct = Math.max(0, Math.min(100, step * 20));
  els["progress-fill"].style.width = `${pct}%`;
}

function renderSuccessPanel(result) {
  els["progress-success-panel"].classList.remove("hidden");
  els["btn-close-progress"].classList.remove("hidden");
  text(els["progress-card-id-display"], result.card_id || "—");

  const items = [
    { label: "成品卡", value: result.card_url || "—", type: "link", key: "card" },
    { label: "交付卡", value: result.delivery_url || "—", type: "link", key: "delivery" },
    { label: "海報 / Poster", value: result.poster_url || "—", type: "link" },
    { label: "更新連結", value: result.update_url || "—", type: "link" },
    { label: "續約連結", value: result.renew_url || "—", type: "link" },
    { label: "付款期限", value: result.payment_due_at || "—" },
    { label: "付款狀態", value: result.billing_status || "—" }
  ];

  els.deliveryCardGrid.innerHTML = items.map(item => `
    <div class="info-chip">
      <span>${escapeHtml(item.label)}</span>
      <strong>${item.type === "link" && item.value && item.value !== "—"
        ? `<a href="${escapeHtml(item.value)}" target="_blank" rel="noopener">開啟連結</a>`
        : escapeHtml(String(item.value || "—"))}</strong>
    </div>`).join("");

  const reply = buildReplyText(result);
  els["successReplyText"].value = reply;
}

function buildReplyText(result) {
  const lines = [];
  if (result.mode === "create") {
    lines.push("您好，您的智慧名片申請已建立完成。", "");
  } else if (result.mode === "update") {
    lines.push("您好，您的智慧名片更新作業已建立完成。", "");
  } else {
    lines.push("您好，您的智慧名片續約作業已建立完成。", "");
  }
  if (result.card_id) lines.push(`名片序號：${result.card_id}`);
  if (result.card_url) lines.push(`成品卡：${result.card_url}`);
  if (result.delivery_url) lines.push(`交付卡：${result.delivery_url}`);
  if (result.poster_url) lines.push(`海報連結：${result.poster_url}`);
  if (result.update_url) lines.push(`更新連結：${result.update_url}`);
  if (result.renew_url) lines.push(`續約連結：${result.renew_url}`);
  if (result.payment_due_at) lines.push(`付款期限：${result.payment_due_at}`);
  lines.push("若需協助開通 / 確認付款，請將以上資訊回覆客服。", "謝謝您。");
  return lines.join("\n");
}

function openSuccessLink(type) {
  if (!state.lastSubmitResult) return;
  const map = {
    card: state.lastSubmitResult.card_url,
    delivery: state.lastSubmitResult.delivery_url
  };
  const url = map[type];
  if (url) window.open(url, "_blank");
}

function closeProgressOverlay(reset = true) {
  els["submit-progress-overlay"].classList.add("hidden");
  if (reset) {
    text(els["progress-text"], "正在準備送出。");
    setProgressVisual(0);
  }
}

function saveDraft() {
  const data = collectDraftData();
  localStorage.setItem(draftKey(), JSON.stringify(data));
}

function restoreDraft() {
  const raw = localStorage.getItem(draftKey());
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.draftValues = data || {};
    Object.entries(data).forEach(([k, v]) => {
      if (k.startsWith("__")) return;
      const el = document.getElementById(k);
      if (el && typeof v === "string" && !el.value) el.value = v;
    });

    if (data.__photoPreviewUrls) {
      Object.entries(data.__photoPreviewUrls).forEach(([key, url]) => {
        if (!state.photoPreviewUrls[key] && url) {
          state.photoPreviewUrls[key] = url;
          updatePhotoPreview(key, url);
          state.photoUploadState[key] = "done";
          updateUploadBadge(key, "done", "已載入草稿 ✓");
        }
      });
    }
  } catch (err) {
    console.error("restoreDraft error", err);
  }
}

function collectDraftData() {
  const ids = [
    "plan","premium_color","free_color","free_style","free_paper",
    "display_name","unit","title","website","intro","services","experience",
    "phone","email","wechat_id","line_oa","line_url","address",
    "video1","video2","video3","social1","social2","social3","marquee_text"
  ];
  const data = {};
  ids.forEach(id => data[id] = valueOf(id));

  const limits = getLimits(state.cardData || {});
  for (let i = 1; i <= limits.ctas; i++) {
    data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
    data[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
  }

  data.__photoPreviewUrls = { ...state.photoPreviewUrls };
  data.__mode = state.mode;
  data.__token = state.token;
  data.__card_id = state.cardId;
  return data;
}

function clearDraft() {
  localStorage.removeItem(draftKey());
  toast("已清除草稿");
}
function clearDraftSilently() { localStorage.removeItem(draftKey()); }
function draftKey() {
  if (state.mode === "update") return `hsc_form_draft_update_${state.token || "no_token"}`;
  if (state.mode === "renew") return `hsc_form_draft_renew_${state.cardId || "no_card"}`;
  return `hsc_form_draft_create`;
}

function buildDeliveryUrl(cardId, extra = {}) {
  const u = new URL(CONFIG.DELIVERY_BASE_URL);
  if (cardId) u.searchParams.set("id", cardId);
  Object.entries(extra).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") u.searchParams.set(k, v);
  });
  return u.toString();
}
function buildCardUrl(cardId) {
  const u = new URL(CONFIG.HOME_URL);
  if (cardId) u.searchParams.set("id", cardId);
  u.searchParams.set("view", "1");
  return u.toString();
}
function buildFormUrl(mode, params = {}) {
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("mode", mode);
  Object.entries(params).forEach(([k, v]) => {
    if (v) u.searchParams.set(k, v);
  });
  return u.toString();
}

async function gasGet(action, params = {}) {
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { method: "GET" });
  const data = await safeJson(res);
  if (!res.ok || data?.ok === false) throw new Error(data?.error || `${action} failed`);
  return data;
}

async function gasPost(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(CONFIG.GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body
  });
  const data = await safeJson(res);
  if (!res.ok || data?.ok === false) throw new Error(data?.error || `${action} failed`);
  return data;
}

async function safeJson(res) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (_) { throw new Error(txt || "JSON parse failed"); }
}

function bindPreviewCollapseToggles(root) {
  if (!root) return;
  root.querySelectorAll("[data-collapse-trigger]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-collapse-target");
      const target = id ? root.querySelector(`#${id}`) : null;
      if (target) target.classList.toggle("is-collapsed");
    });
  });
}

function ensureRendererAlias() {
  if (window.HSCCardRenderer) return;
  if (window.HscCardRenderer) {
    window.HSCCardRenderer = window.HscCardRenderer;
  }
}

function text(el, value) { if (el) el.textContent = value ?? ""; }
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function shorten(v) { return v && v.length > 14 ? `${v.slice(0, 6)}...${v.slice(-4)}` : (v || "—"); }
function boolText(v) { return v ? "是" : "否"; }
function formatMoney(v) {
  const n = Number(v || 0);
  return `NT$ ${n.toLocaleString("zh-TW")}`;
}
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function clampInt(n, min, max) { return clamp(parseInt(n, 10) || 0, min, max); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function toast(msg) { window.alert(msg); }
async function copyText(v) {
  if (!v) return;
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(v);
  const ta = document.createElement("textarea");
  ta.value = v;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("圖片載入失敗"));
    img.src = url;
  });
}
function canvasToBlob(canvas, type = "image/jpeg", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas 轉檔失敗")), type, quality);
  });
}
