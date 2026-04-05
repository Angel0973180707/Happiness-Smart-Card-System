/* ============================================================
   HSC form.js
   v8.0.0-mode-shared-form
   完整覆蓋版 — create / update / renew 共構控制器
============================================================ */

import {
  ensureAuth,
  uploadAvatar,
  uploadLogo,
  uploadBanner,
  uploadPhoto
} from "./firebase.js";

const CONFIG = Object.assign({
  GAS: "",
  CUSTOMER_SERVICE_URL: "",
  DEFAULT_TENANT: "angel",
  CREATE_CARD_ACTION: "createCard",
  CREATE_CARD_OFFLINE_ACTION: "createCardWithOfflinePayment",
  USE_OFFLINE_CREATE: false
}, window.HSC_FORM_CONFIG || {});

const MODES = {
  CREATE: "create",
  UPDATE: "update",
  RENEW: "renew"
};

const PHOTO_SLOT_MAX = 5;
const BANNER_RATIO = 16 / 5;
const DEFAULT_CREATE_THEME = { plan: "free", color: "c1", style: "s1", paper: "f1", premium_color: "p1" };

const state = {
  mode: MODES.CREATE,
  params: new URLSearchParams(location.search),
  token: "",
  cardId: "",
  inviteCode: "",
  ref: "",
  plan: "",
  createTempId: `draft_${Date.now()}`,
  updateInfo: null,
  renewInfo: null,
  renewSummary: null,
  currentCard: null,
  submitting: false,
  media: {
    banner: { dataUrl: "", fileName: "banner.jpg", blob: null },
    avatar: { dataUrl: "", fileName: "avatar.jpg", blob: null },
    logo: { dataUrl: "", fileName: "logo.jpg", blob: null },
    photos: Array.from({ length: PHOTO_SLOT_MAX }, (_, i) => ({
      dataUrl: "",
      fileName: `photo${i + 1}.jpg`,
      blob: null
    }))
  },
  cropper: {
    open: false,
    sourceDataUrl: "",
    naturalWidth: 0,
    naturalHeight: 0,
    stageWidth: 0,
    stageHeight: 0,
    imageBaseWidth: 0,
    imageBaseHeight: 0,
    scale: 1,
    minScale: 1,
    maxScale: 3,
    x: 0,
    y: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    originX: 0,
    originY: 0
  }
};

const $ = (id) => document.getElementById(id);

const els = {
  body: document.body,
  form: $("smartCardForm"),
  pageTitle: $("pageTitle"),
  pageDesc: $("pageDesc"),
  modePill: $("modePill"),
  modeExplainText: $("modeExplainText"),
  modeField: $("modeField"),
  inviteCodeField: $("inviteCodeField"),
  refField: $("refField"),
  tokenField: $("tokenField"),
  cardIdField: $("cardIdField"),
  planField: $("planField"),
  themeField: $("themeField"),
  bannerDataField: $("bannerDataField"),
  statusBox: $("statusBox"),
  resultBox: $("resultBox"),
  saveDraftBtn: $("saveDraftBtn"),
  clearDraftBtn: $("clearDraftBtn"),
  submitBtn: $("submitBtn"),

  identityPanel: $("identityPanel"),
  identityInvite: $("identityInvite"),
  identityRef: $("identityRef"),
  identityToken: $("identityToken"),
  identityCardId: $("identityCardId"),

  themePanel: $("themePanel"),
  profilePanel: $("profilePanel"),
  socialPanel: $("socialPanel"),
  mediaPanel: $("mediaPanel"),
  bannerPanel: $("bannerPanel"),
  ctaPanel: $("ctaPanel"),
  updateBenefitPanel: $("updateBenefitPanel"),
  renewPanel: $("renewPanel"),

  planSelect: $("planSelect"),
  colorSelect: $("colorSelect"),
  styleSelect: $("styleSelect"),
  paperSelect: $("paperSelect"),
  premiumColorSelect: $("premiumColorSelect"),

  bannerInput: $("bannerInput"),
  bannerPreview: $("bannerPreview"),
  bannerPreviewBox: $("bannerPreviewBox"),
  bannerPlaceholder: $("bannerPlaceholder"),
  bannerRecropBtn: $("bannerRecropBtn"),
  bannerClearBtn: $("bannerClearBtn"),

  avatarInput: $("avatarInput"),
  avatarPreview: $("avatarPreview"),
  avatarPlaceholder: $("avatarPlaceholder"),
  logoInput: $("logoInput"),
  logoPreview: $("logoPreview"),
  logoPlaceholder: $("logoPlaceholder"),
  photoSlots: $("photoSlots"),

  previewRoot: $("previewRoot"),

  benefitFreeLimit: $("benefitFreeLimit"),
  benefitUsed: $("benefitUsed"),
  benefitRemaining: $("benefitRemaining"),
  benefitUnlimited: $("benefitUnlimited"),
  benefitChargeRequired: $("benefitChargeRequired"),
  benefitChargeAmount: $("benefitChargeAmount"),

  renewCurrentPlan: $("renewCurrentPlan"),
  renewTargetPlan: $("renewTargetPlan"),
  renewCurrentExpires: $("renewCurrentExpires"),
  renewKeepMarquee: $("renewKeepMarquee"),
  renewKeepPhotoExtra: $("renewKeepPhotoExtra"),
  renewKeepCtaExtra: $("renewKeepCtaExtra"),
  renewUnlimited: $("renewUnlimited"),
  renewBasePrice: $("renewBasePrice"),
  renewUpgradeDiff: $("renewUpgradeDiff"),
  renewAddonAmount: $("renewAddonAmount"),
  renewTotalAmount: $("renewTotalAmount"),

  cropMask: $("cropMask"),
  cropStage: $("cropStage"),
  cropImage: $("cropImage"),
  cropFrame: $("cropFrame"),
  cropZoom: $("cropZoom"),
  cropApplyBtn: $("cropApplyBtn"),
  cropResetBtn: $("cropResetBtn"),
  cropCloseBtn: $("cropCloseBtn")
};

function text(v) {
  return v == null ? "" : String(v).trim();
}

function toBool(v) {
  return ["1", "true", "yes", "y"].includes(text(v).toLowerCase());
}

function toCurrency(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

function formatDateTime(v) {
  const s = text(v);
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(d);
}

function normalizeUrl(v) {
  const s = text(v);
  if (!s) return "";
  if (/^(https?:\/\/|mailto:|tel:|sms:|line:|data:|blob:)/i.test(s)) return s;
  if (/^www\./i.test(s)) return "https://" + s;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return "https://" + s;
  return s;
}

function safeJsonParse(raw) {
  const s = text(raw);
  if (!s) return null;
  try { return JSON.parse(s); } catch (_) { return null; }
}

function getMode() {
  const input = text(state.params.get("mode")).toLowerCase();
  if (input === MODES.UPDATE) return MODES.UPDATE;
  if (input === MODES.RENEW) return MODES.RENEW;
  return MODES.CREATE;
}

function getDraftKey() {
  if (state.mode === MODES.UPDATE) return `hsc_form_update_${state.token || "unknown"}`;
  if (state.mode === MODES.RENEW) return `hsc_form_renew_${state.cardId || "unknown"}`;
  return "hsc_form_create_draft";
}

function setStatus(message, type = "") {
  els.statusBox.classList.remove("hidden", "is-error", "is-success");
  els.statusBox.textContent = text(message);
  if (type === "error") els.statusBox.classList.add("is-error");
  if (type === "success") els.statusBox.classList.add("is-success");
}

function clearStatus() {
  els.statusBox.className = "result-box hidden";
  els.statusBox.textContent = "";
}

function setResult(message) {
  if (!text(message)) {
    els.resultBox.className = "result-box hidden is-soft";
    els.resultBox.textContent = "";
    return;
  }
  els.resultBox.className = "result-box is-soft";
  els.resultBox.textContent = message;
}

function setSubmitLoading(loading) {
  state.submitting = !!loading;
  els.submitBtn.disabled = loading;
  els.saveDraftBtn.disabled = loading;
  els.clearDraftBtn.disabled = loading;
  els.submitBtn.textContent = loading ? "處理中..." : resolveSubmitLabel();
}

function resolveSubmitLabel() {
  if (state.mode === MODES.UPDATE) return "送出更新";
  if (state.mode === MODES.RENEW) return "建立續約單";
  return "送出建卡";
}

function apiUrl(action, params = {}) {
  const base = text(CONFIG.GAS);
  if (!base) throw new Error("請先在 window.HSC_FORM_CONFIG.GAS 設定 GAS URL");
  const u = new URL(base);
  u.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && text(v) !== "") u.searchParams.set(k, v);
  });
  return u.toString();
}

async function apiGet(action, params = {}) {
  const res = await fetch(apiUrl(action, params), { credentials: "omit" });
  const raw = await res.text();
  const data = safeJsonParse(raw);
  if (!data) throw new Error(`無法解析 ${action} 回應`);
  if (data.ok === false) throw new Error(data.error || data.message || `${action} 失敗`);
  return data;
}

async function apiPost(action, payload = {}) {
  const base = text(CONFIG.GAS);
  if (!base) throw new Error("請先在 window.HSC_FORM_CONFIG.GAS 設定 GAS URL");
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ action }, payload))
  });
  const raw = await res.text();
  const data = safeJsonParse(raw);
  if (!data) throw new Error(`無法解析 ${action} 回應`);
  if (data.ok === false) throw new Error(data.error || data.message || `${action} 失敗`);
  return data;
}

function syncHiddenFields() {
  els.modeField.value = state.mode;
  els.inviteCodeField.value = state.inviteCode;
  els.refField.value = state.ref;
  els.tokenField.value = state.token;
  els.cardIdField.value = state.cardId;
  els.planField.value = state.plan || els.planSelect.value;
  els.identityInvite.textContent = state.inviteCode || "—";
  els.identityRef.textContent = state.ref || "—";
  els.identityToken.textContent = state.token || "—";
  els.identityCardId.textContent = state.cardId || "—";
}

function showSection(el, show) {
  if (!el) return;
  el.classList.toggle("hidden", !show);
}

function applyModeUI() {
  const modeLabel = state.mode.toUpperCase();
  els.modePill.textContent = modeLabel;
  els.submitBtn.textContent = resolveSubmitLabel();

  if (state.mode === MODES.CREATE) {
    els.pageTitle.textContent = "智慧名片申請表單";
    els.pageDesc.textContent = "建立新名片，完成後顯示成品卡與付款資訊。";
    els.modeExplainText.textContent = "create：填寫完整名片資料，送出 createLead / createCard（或離線付款版）。";
  } else if (state.mode === MODES.UPDATE) {
    els.pageTitle.textContent = "智慧名片更新表單";
    els.pageDesc.textContent = "讀取 token 後可更新資料，並依權益判斷是否需要收費。";
    els.modeExplainText.textContent = "update：先讀 getCardForUpdate 與 getUpdateEligibility，再依 charge_required 分流處理。";
  } else {
    els.pageTitle.textContent = "智慧名片續約表單";
    els.pageDesc.textContent = "只處理續約權益與報價，不修改名片內容。";
    els.modeExplainText.textContent = "renew：讀取 getCardForRenewal / getRenewalSummary，送出 createRenewalPayment。";
  }

  showSection(els.identityPanel, true);
  showSection(els.themePanel, state.mode !== MODES.RENEW);
  showSection(els.profilePanel, state.mode !== MODES.RENEW);
  showSection(els.socialPanel, state.mode !== MODES.RENEW);
  showSection(els.mediaPanel, state.mode !== MODES.RENEW);
  showSection(els.bannerPanel, state.mode !== MODES.RENEW);
  showSection(els.ctaPanel, state.mode !== MODES.RENEW);
  showSection(els.updateBenefitPanel, state.mode === MODES.UPDATE);
  showSection(els.renewPanel, state.mode === MODES.RENEW);

  syncHiddenFields();
  updateThemeVisibility();
}

function updateThemeVisibility() {
  const plan = els.planSelect.value === "premium" ? "premium" : "free";
  state.plan = plan;
  els.planField.value = plan;
  els.themeField.value = plan;
  document.querySelectorAll(".free-only").forEach(el => el.classList.toggle("hidden", plan !== "free"));
  document.querySelectorAll(".premium-only").forEach(el => el.classList.toggle("hidden", plan !== "premium"));

  const body = els.body;
  body.classList.remove("mode-free", "mode-premium", "color-1", "color-2", "color-3", "color-4", "color-5",
    "style-arch", "style-flat", "style-spot", "paper-1", "paper-2", "paper-3", "p1", "p2", "p3", "p4", "p5", "p6", "p7");

  if (plan === "premium") {
    body.classList.add("mode-premium", els.premiumColorSelect.value || "p1");
  } else {
    body.classList.add("mode-free");
    body.classList.add(mapFreeColorClass(els.colorSelect.value));
    body.classList.add(mapStyleClass(els.styleSelect.value));
    body.classList.add(mapPaperClass(els.paperSelect.value));
  }

  renderPreview();
}

function mapFreeColorClass(v) {
  return { c1: "color-1", c2: "color-2", c3: "color-3", c4: "color-4", c5: "color-5" }[text(v)] || "color-1";
}

function mapStyleClass(v) {
  return { s1: "style-arch", s2: "style-flat", s3: "style-spot" }[text(v)] || "style-arch";
}

function mapPaperClass(v) {
  return { f1: "paper-1", f2: "paper-2", f3: "paper-3" }[text(v)] || "paper-1";
}

function bindFieldEvents() {
  els.form.addEventListener("input", handleLiveChange, true);
  els.form.addEventListener("change", handleLiveChange, true);
  els.form.addEventListener("submit", handleSubmit);

  els.planSelect.addEventListener("change", updateThemeVisibility);
  els.colorSelect.addEventListener("change", updateThemeVisibility);
  els.styleSelect.addEventListener("change", updateThemeVisibility);
  els.paperSelect.addEventListener("change", updateThemeVisibility);
  els.premiumColorSelect.addEventListener("change", updateThemeVisibility);

  els.saveDraftBtn.addEventListener("click", () => {
    saveDraft();
    setStatus("草稿已儲存。", "success");
  });

  els.clearDraftBtn.addEventListener("click", clearDraft);

  els.avatarInput.addEventListener("change", (e) => handleBasicImageChange(e, "avatar"));
  els.logoInput.addEventListener("change", (e) => handleBasicImageChange(e, "logo"));
  els.bannerInput.addEventListener("change", handleBannerSelect);
  els.bannerRecropBtn.addEventListener("click", reopenBannerCrop);
  els.bannerClearBtn.addEventListener("click", clearBanner);

  document.addEventListener("click", (e) => {
    const clearKey = e.target?.dataset?.clearMedia;
    if (clearKey === "avatar") clearBasicMedia("avatar");
    if (clearKey === "logo") clearBasicMedia("logo");
    const photoIndex = e.target?.dataset?.clearPhoto;
    if (photoIndex) clearPhotoSlot(Number(photoIndex));
  });

  els.cropCloseBtn.addEventListener("click", closeCropper);
  els.cropResetBtn.addEventListener("click", resetCropper);
  els.cropApplyBtn.addEventListener("click", applyBannerCrop);
  els.cropZoom.addEventListener("input", onCropZoom);
  bindCropDrag();
}

function buildPhotoSlots() {
  els.photoSlots.innerHTML = "";
  for (let i = 1; i <= PHOTO_SLOT_MAX; i++) {
    const card = document.createElement("div");
    card.className = "photo-slot";
    card.innerHTML = `
      <div class="photo-slot-head">
        <div class="photo-slot-title">照片 ${i}</div>
        <div class="photo-slot-badge">photo${i}</div>
      </div>
      <div class="media-preview square">
        <span class="media-placeholder" id="photoPlaceholder${i}">照片 ${i}</span>
        <img id="photoPreview${i}" alt="照片 ${i} 預覽" />
      </div>
      <div class="media-actions">
        <label class="btn-chip">
          <input id="photoInput${i}" type="file" accept="image/*" hidden />
          選擇
        </label>
        <button class="btn-chip subtle" type="button" data-clear-photo="${i}">清除</button>
      </div>
    `;
    els.photoSlots.appendChild(card);
  }

  for (let i = 1; i <= PHOTO_SLOT_MAX; i++) {
    const input = $(`photoInput${i}`);
    input.addEventListener("change", (e) => handlePhotoChange(e, i));
  }
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function fileToJpegBlob(file, maxW = 1600, quality = 0.9) {
  const dataUrl = await readFileAsDataUrl(file);
  return dataUrlToJpegBlob(dataUrl, maxW, quality);
}

async function dataUrlToJpegBlob(dataUrl, maxW = 1600, quality = 0.9) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const ratio = img.width / img.height;
  const width = Math.min(maxW, img.width);
  const height = Math.round(width / ratio);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function dataUrlToBlob(dataUrl) {
  const [meta, content] = String(dataUrl).split(",");
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/jpeg";
  const bytes = atob(content);
  const len = bytes.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function loadImage(src) {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function handleBasicImageChange(e, key) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  const blob = await fileToJpegBlob(file, 1200, 0.9);
  state.media[key] = { dataUrl, blob, fileName: `${key}.jpg` };
  updateMediaPreview(key);
  saveDraft();
  renderPreview();
}

async function handlePhotoChange(e, index) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  const blob = await fileToJpegBlob(file, 1600, 0.9);
  state.media.photos[index - 1] = { dataUrl, blob, fileName: `photo${index}.jpg` };
  updatePhotoPreview(index);
  saveDraft();
  renderPreview();
}

function updateMediaPreview(key) {
  const item = state.media[key];
  const img = key === "avatar" ? els.avatarPreview : els.logoPreview;
  const placeholder = key === "avatar" ? els.avatarPlaceholder : els.logoPlaceholder;
  if (item?.dataUrl) {
    img.src = item.dataUrl;
    img.style.display = "block";
    placeholder.style.display = "none";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
    placeholder.style.display = "block";
  }
}

function updatePhotoPreview(index) {
  const item = state.media.photos[index - 1];
  const img = $(`photoPreview${index}`);
  const placeholder = $(`photoPlaceholder${index}`);
  if (item?.dataUrl) {
    img.src = item.dataUrl;
    img.style.display = "block";
    placeholder.style.display = "none";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
    placeholder.style.display = "block";
  }
}

function clearBasicMedia(key) {
  state.media[key] = { dataUrl: "", blob: null, fileName: `${key}.jpg` };
  updateMediaPreview(key);
  saveDraft();
  renderPreview();
}

function clearPhotoSlot(index) {
  state.media.photos[index - 1] = { dataUrl: "", blob: null, fileName: `photo${index}.jpg` };
  updatePhotoPreview(index);
  saveDraft();
  renderPreview();
}

async function handleBannerSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  openCropper(dataUrl);
}

function reopenBannerCrop() {
  const src = state.media.banner.dataUrl || state.cropper.sourceDataUrl;
  if (!src) {
    setStatus("目前沒有可重新裁切的 Banner。", "error");
    return;
  }
  openCropper(src);
}

function clearBanner() {
  state.media.banner = { dataUrl: "", fileName: "banner.jpg", blob: null };
  els.bannerPreview.removeAttribute("src");
  els.bannerPreview.style.display = "none";
  els.bannerPlaceholder.style.display = "block";
  els.bannerDataField.value = "";
  saveDraft();
  renderPreview();
}

async function openCropper(dataUrl) {
  const img = await loadImage(dataUrl);
  state.cropper.open = true;
  state.cropper.sourceDataUrl = dataUrl;
  state.cropper.naturalWidth = img.width;
  state.cropper.naturalHeight = img.height;
  els.cropImage.src = dataUrl;
  els.cropMask.classList.remove("hidden");
  requestAnimationFrame(() => {
    const stageRect = els.cropStage.getBoundingClientRect();
    state.cropper.stageWidth = stageRect.width;
    state.cropper.stageHeight = stageRect.height;

    const fitScale = Math.max(stageRect.width / img.width, stageRect.height / img.height);
    state.cropper.imageBaseWidth = img.width * fitScale;
    state.cropper.imageBaseHeight = img.height * fitScale;
    state.cropper.minScale = 1;
    state.cropper.maxScale = 3;
    state.cropper.scale = 1;
    state.cropper.x = 0;
    state.cropper.y = 0;
    els.cropZoom.value = "1";
    applyCropTransform();
  });
}

function closeCropper() {
  state.cropper.open = false;
  els.cropMask.classList.add("hidden");
  els.cropImage.classList.remove("is-dragging");
}

function resetCropper() {
  state.cropper.scale = 1;
  state.cropper.x = 0;
  state.cropper.y = 0;
  els.cropZoom.value = "1";
  applyCropTransform();
}

function onCropZoom() {
  state.cropper.scale = Number(els.cropZoom.value || 1);
  clampCropPosition();
  applyCropTransform();
}

function clampCropPosition() {
  const frameRect = els.cropFrame.getBoundingClientRect();
  const stageRect = els.cropStage.getBoundingClientRect();

  const frameW = frameRect.width;
  const frameH = frameRect.height;
  const displayW = state.cropper.imageBaseWidth * state.cropper.scale;
  const displayH = state.cropper.imageBaseHeight * state.cropper.scale;

  const maxX = Math.max(0, (displayW - frameW) / 2);
  const maxY = Math.max(0, (displayH - frameH) / 2);

  state.cropper.x = Math.min(maxX, Math.max(-maxX, state.cropper.x));
  state.cropper.y = Math.min(maxY, Math.max(-maxY, state.cropper.y));
}

function applyCropTransform() {
  clampCropPosition();
  const width = state.cropper.imageBaseWidth;
  const height = state.cropper.imageBaseHeight;
  els.cropImage.style.width = `${width}px`;
  els.cropImage.style.height = `${height}px`;
  els.cropImage.style.transform = `translate(calc(-50% + ${state.cropper.x}px), calc(-50% + ${state.cropper.y}px)) scale(${state.cropper.scale})`;
}

function bindCropDrag() {
  const start = (clientX, clientY) => {
    if (!state.cropper.open) return;
    state.cropper.dragging = true;
    state.cropper.dragStartX = clientX;
    state.cropper.dragStartY = clientY;
    state.cropper.originX = state.cropper.x;
    state.cropper.originY = state.cropper.y;
    els.cropImage.classList.add("is-dragging");
  };

  const move = (clientX, clientY) => {
    if (!state.cropper.dragging) return;
    state.cropper.x = state.cropper.originX + (clientX - state.cropper.dragStartX);
    state.cropper.y = state.cropper.originY + (clientY - state.cropper.dragStartY);
    applyCropTransform();
  };

  const end = () => {
    state.cropper.dragging = false;
    els.cropImage.classList.remove("is-dragging");
  };

  els.cropStage.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
  window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  window.addEventListener("mouseup", end);

  els.cropStage.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (!t) return;
    move(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener("touchend", end);
}

async function applyBannerCrop() {
  const src = state.cropper.sourceDataUrl;
  if (!src) return;

  const source = await loadImage(src);
  const frameRect = els.cropFrame.getBoundingClientRect();
  const stageRect = els.cropStage.getBoundingClientRect();

  const displayW = state.cropper.imageBaseWidth * state.cropper.scale;
  const displayH = state.cropper.imageBaseHeight * state.cropper.scale;
  const imageLeft = (stageRect.width / 2) - (displayW / 2) + state.cropper.x;
  const imageTop = (stageRect.height / 2) - (displayH / 2) + state.cropper.y;
  const frameLeft = (stageRect.width - frameRect.width) / 2;
  const frameTop = (stageRect.height - frameRect.height) / 2;

  const scaleX = source.width / displayW;
  const scaleY = source.height / displayH;

  let sx = (frameLeft - imageLeft) * scaleX;
  let sy = (frameTop - imageTop) * scaleY;
  let sw = frameRect.width * scaleX;
  let sh = frameRect.height * scaleY;

  sx = Math.max(0, sx);
  sy = Math.max(0, sy);
  sw = Math.min(source.width - sx, sw);
  sh = Math.min(source.height - sy, sh);

  const outputW = 1600;
  const outputH = Math.round(outputW / BANNER_RATIO);

  const canvas = document.createElement("canvas");
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outputW, outputH);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

  state.media.banner = { dataUrl, blob, fileName: "banner.jpg" };
  els.bannerPreview.src = dataUrl;
  els.bannerPreview.style.display = "block";
  els.bannerPlaceholder.style.display = "none";
  els.bannerDataField.value = dataUrl;
  closeCropper();
  saveDraft();
  renderPreview();
}

function collectFormData() {
  const fd = new FormData(els.form);
  const out = {};
  for (const [k, v] of fd.entries()) out[k] = text(v);

  out.plan = els.planSelect.value === "premium" ? "premium" : "free";
  if (out.plan === "premium") {
    out.color = els.premiumColorSelect.value || "p1";
    out.style = "";
    out.paper = "";
  } else {
    out.color = els.colorSelect.value || "c1";
    out.style = els.styleSelect.value || "s1";
    out.paper = els.paperSelect.value || "f1";
  }

  out.line_url = normalizeUrl(out.line_url);
  out.line_oa = normalizeUrl(out.line_oa);
  out.website = normalizeUrl(out.website);
  out.social1 = normalizeUrl(out.social1);
  out.social2 = normalizeUrl(out.social2);
  out.social3 = normalizeUrl(out.social3);
  out.video1 = normalizeUrl(out.video1);
  out.video2 = normalizeUrl(out.video2);
  out.video3 = normalizeUrl(out.video3);
  out.cta_link_1 = normalizeUrl(out.cta_link_1);
  out.cta_link_2 = normalizeUrl(out.cta_link_2);
  out.cta_link_3 = normalizeUrl(out.cta_link_3);

  return out;
}

function buildRendererPayload() {
  const data = collectFormData();

  if (state.media.avatar.dataUrl) data.avatar_url = state.media.avatar.dataUrl;
  if (state.media.logo.dataUrl) data.logo_url = state.media.logo.dataUrl;
  if (state.media.banner.dataUrl) data.banner_url = state.media.banner.dataUrl;
  data.photo_limit = PHOTO_SLOT_MAX;

  state.media.photos.forEach((item, idx) => {
    if (item.dataUrl) data[`photo${idx + 1}_url`] = item.dataUrl;
  });

  data.preview_url = buildPreviewUrlFallback();
  data.features = {
    preview_meta: {
      theme: data.plan,
      layout: "grid",
      aspect_ratio: "1:1",
      fit_mode: "cover"
    },
    photo_meta: buildPhotoMetaMap(),
    photo_preview_urls: buildPreviewUrlMap()
  };

  if (state.mode === MODES.RENEW) {
    const summary = state.renewSummary || {};
    data.name = "續約摘要";
    data.title = `${text(summary.current_plan || summary.target_plan || "")} → ${text(summary.target_plan || "")}`;
    data.slogan = `目前到期日：${formatDateTime(summary.current_expires_at || state.renewInfo?.current_expires_at)}`;
    data.services = `續約方案：${text(summary.target_plan || "—")}\n總金額：${toCurrency(summary.total_amount)} 元`;
    data.experience = [
      `基本續約：${toCurrency(summary.renewal_price)} 元`,
      `升級差價：${toCurrency(summary.upgrade_diff)} 元`,
      `加購金額：${toCurrency(summary.addon_amount)} 元`
    ].join("\n");
  }

  return data;
}

function buildPhotoMetaMap() {
  const map = {};
  for (let i = 1; i <= PHOTO_SLOT_MAX; i++) {
    map[`photo${i}`] = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };
  }
  return map;
}

function buildPreviewUrlMap() {
  const out = {};
  if (state.media.avatar.dataUrl) out.avatar = state.media.avatar.dataUrl;
  if (state.media.logo.dataUrl) out.logo = state.media.logo.dataUrl;
  if (state.media.banner.dataUrl) out.banner = state.media.banner.dataUrl;
  state.media.photos.forEach((item, idx) => {
    if (item.dataUrl) out[`photo${idx + 1}`] = item.dataUrl;
  });
  return out;
}

function buildPreviewUrlFallback() {
  if (state.mode === MODES.UPDATE && state.cardId) {
    return `${location.origin}${location.pathname.replace(/form\.html?$/i, "index.html")}?id=${encodeURIComponent(state.cardId)}`;
  }
  if (state.mode === MODES.RENEW && state.cardId) {
    return `${location.origin}${location.pathname.replace(/form\.html?$/i, "index.html")}?id=${encodeURIComponent(state.cardId)}`;
  }
  return location.href;
}

function renderPreview() {
  if (typeof window.renderCard !== "function") return;
  const payload = buildRendererPayload();
  try {
    window.renderCard(payload, {
      root: els.previewRoot,
      useExistingDom: false,
      mode: "form",
      qrMode: "preview",
      allowActions: false
    });
  } catch (err) {
    console.error(err);
  }
}

function handleLiveChange() {
  syncHiddenFields();
  saveDraftSilently();
  renderPreview();
}

function saveDraftSilently() {
  try {
    localStorage.setItem(getDraftKey(), JSON.stringify(buildDraftPayload()));
  } catch (_) {}
}

function saveDraft() {
  saveDraftSilently();
}

function clearDraft() {
  localStorage.removeItem(getDraftKey());
  setStatus("已清除此模式草稿。", "success");
}

function buildDraftPayload() {
  return {
    version: "v8.0.0-mode-shared-form",
    mode: state.mode,
    token: state.token,
    cardId: state.cardId,
    inviteCode: state.inviteCode,
    ref: state.ref,
    fields: collectFormData(),
    media: {
      banner: state.media.banner.dataUrl,
      avatar: state.media.avatar.dataUrl,
      logo: state.media.logo.dataUrl,
      photos: state.media.photos.map(item => item.dataUrl)
    },
    updateInfo: state.updateInfo,
    renewInfo: state.renewInfo,
    renewSummary: state.renewSummary
  };
}

function restoreDraft() {
  const raw = localStorage.getItem(getDraftKey());
  if (!raw) return false;
  const data = safeJsonParse(raw);
  if (!data) return false;

  const fields = data.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    const input = els.form.elements.namedItem(k);
    if (input && "value" in input) {
      input.value = v;
    }
  }

  if (data.media) {
    if (data.media.banner) {
      state.media.banner = { dataUrl: data.media.banner, blob: dataUrlToBlob(data.media.banner), fileName: "banner.jpg" };
      els.bannerPreview.src = data.media.banner;
      els.bannerPreview.style.display = "block";
      els.bannerPlaceholder.style.display = "none";
      els.bannerDataField.value = data.media.banner;
    }
    if (data.media.avatar) {
      state.media.avatar = { dataUrl: data.media.avatar, blob: dataUrlToBlob(data.media.avatar), fileName: "avatar.jpg" };
      updateMediaPreview("avatar");
    }
    if (data.media.logo) {
      state.media.logo = { dataUrl: data.media.logo, blob: dataUrlToBlob(data.media.logo), fileName: "logo.jpg" };
      updateMediaPreview("logo");
    }
    (data.media.photos || []).forEach((url, idx) => {
      if (url) {
        state.media.photos[idx] = { dataUrl: url, blob: dataUrlToBlob(url), fileName: `photo${idx + 1}.jpg` };
        updatePhotoPreview(idx + 1);
      }
    });
  }

  if (data.updateInfo) state.updateInfo = data.updateInfo;
  if (data.renewInfo) state.renewInfo = data.renewInfo;
  if (data.renewSummary) state.renewSummary = data.renewSummary;
  return true;
}

function renderUpdateBenefits() {
  const info = state.updateInfo || {};
  els.benefitFreeLimit.textContent = text(info.free_limit || info.free_update_limit_yearly || "0");
  els.benefitUsed.textContent = text(info.used_count || info.current_used_count || "0");
  els.benefitRemaining.textContent = text(info.remaining_count || info.remaining || "0");
  els.benefitUnlimited.textContent = toBool(info.is_unlimited || info.update_unlimited) ? "是" : "否";
  els.benefitChargeRequired.textContent = toBool(info.charge_required) ? "是" : "否";
  els.benefitChargeAmount.textContent = `${toCurrency(info.charge_amount || info.extra_update_fee || 0)} 元`;
}

function renderRenewSummary() {
  const info = state.renewSummary || {};
  els.renewCurrentPlan.textContent = text(info.current_plan || state.renewInfo?.current_plan || "—");
  els.renewTargetPlan.textContent = text(info.target_plan || "—");
  els.renewCurrentExpires.textContent = formatDateTime(info.current_expires_at || state.renewInfo?.current_expires_at);
  els.renewKeepMarquee.textContent = toBool(info.keep_marquee) ? "是" : "否";
  els.renewKeepPhotoExtra.textContent = text(info.keep_photo_extra_qty || "0");
  els.renewKeepCtaExtra.textContent = text(info.keep_cta_extra_qty || "0");
  els.renewUnlimited.textContent = toBool(info.update_unlimited_renew) ? "是" : "否";
  els.renewBasePrice.textContent = `${toCurrency(info.renewal_price)} 元`;
  els.renewUpgradeDiff.textContent = `${toCurrency(info.upgrade_diff)} 元`;
  els.renewAddonAmount.textContent = `${toCurrency(info.addon_amount)} 元`;
  els.renewTotalAmount.textContent = `${toCurrency(info.total_amount)} 元`;
}

async function loadModeData() {
  state.mode = getMode();
  state.token = text(state.params.get("token"));
  state.cardId = text(state.params.get("card_id"));
  state.inviteCode = text(state.params.get("invite") || state.params.get("invite_code"));
  state.ref = text(state.params.get("ref"));
  state.plan = text(state.params.get("plan")) || DEFAULT_CREATE_THEME.plan;
  syncHiddenFields();
  applyModeUI();

  if (state.mode === MODES.CREATE) {
    hydrateCreateDefaults();
  }

  if (state.mode === MODES.UPDATE) {
    if (!state.token) throw new Error("update 模式缺少 token");
    const detail = await apiGet("getCardForUpdate", { token: state.token });
    const card = detail.card || detail.data || detail;
    state.currentCard = card;
    state.cardId = text(card.id || card.card_id);
    fillFormFromCard(card);
    const eligibility = await apiGet("getUpdateEligibility", { token: state.token, card_id: state.cardId });
    state.updateInfo = eligibility.eligibility || eligibility.data || eligibility;
    renderUpdateBenefits();
  }

  if (state.mode === MODES.RENEW) {
    if (!state.cardId) throw new Error("renew 模式缺少 card_id");
    const renewCard = await apiGet("getCardForRenewal", { card_id: state.cardId });
    state.renewInfo = renewCard.card || renewCard.data || renewCard;
    const summary = await apiGet("getRenewalSummary", { card_id: state.cardId });
    state.renewSummary = summary.summary || summary.data || summary;
    renderRenewSummary();
  }

  restoreDraft();
  syncHiddenFields();
  renderPreview();
}

function hydrateCreateDefaults() {
  const plan = state.plan || DEFAULT_CREATE_THEME.plan;
  els.planSelect.value = plan === "premium" ? "premium" : "free";
  if (plan === "premium") {
    els.premiumColorSelect.value = text(state.params.get("color")) || DEFAULT_CREATE_THEME.premium_color;
  } else {
    els.colorSelect.value = text(state.params.get("color")) || DEFAULT_CREATE_THEME.color;
    els.styleSelect.value = text(state.params.get("style")) || DEFAULT_CREATE_THEME.style;
    els.paperSelect.value = text(state.params.get("paper")) || DEFAULT_CREATE_THEME.paper;
  }
  updateThemeVisibility();
}

function fillFormFromCard(card) {
  if (!card || typeof card !== "object") return;
  const mapping = [
    "name", "unit", "title", "slogan", "services", "experience", "wechat_id", "line_url", "line_oa",
    "email", "phone", "address", "website",
    "social1", "social2", "social3", "video1", "video2", "video3",
    "cta_text_1", "cta_text_2", "cta_text_3", "cta_link_1", "cta_link_2", "cta_link_3"
  ];
  mapping.forEach((k) => {
    const input = els.form.elements.namedItem(k);
    if (input && "value" in input) input.value = text(card[k]);
  });

  els.planSelect.value = text(card.plan) === "premium" ? "premium" : "free";
  if (els.planSelect.value === "premium") {
    els.premiumColorSelect.value = text(card.color) || "p1";
  } else {
    els.colorSelect.value = text(card.color) || "c1";
    els.styleSelect.value = text(card.style) || "s1";
    els.paperSelect.value = text(card.paper) || "f1";
  }
  updateThemeVisibility();

  if (text(card.banner_url)) {
    state.media.banner = { dataUrl: text(card.banner_url), blob: null, fileName: "banner.jpg" };
    els.bannerPreview.src = text(card.banner_url);
    els.bannerPreview.style.display = "block";
    els.bannerPlaceholder.style.display = "none";
    els.bannerDataField.value = text(card.banner_url);
  }
  if (text(card.avatar_url)) {
    state.media.avatar = { dataUrl: text(card.avatar_url), blob: null, fileName: "avatar.jpg" };
    updateMediaPreview("avatar");
  }
  if (text(card.logo_url)) {
    state.media.logo = { dataUrl: text(card.logo_url), blob: null, fileName: "logo.jpg" };
    updateMediaPreview("logo");
  }
  for (let i = 1; i <= PHOTO_SLOT_MAX; i++) {
    const url = text(card[`photo${i}_url`]);
    if (url) {
      state.media.photos[i - 1] = { dataUrl: url, blob: null, fileName: `photo${i}.jpg` };
      updatePhotoPreview(i);
    }
  }
}

async function uploadAllMedia(targetCardId) {
  await ensureAuth();
  const uploaded = {};

  if (state.media.banner.blob) uploaded.banner_url = await uploadBanner(targetCardId, state.media.banner.blob);
  else if (state.media.banner.dataUrl) uploaded.banner_url = state.media.banner.dataUrl;

  if (state.media.avatar.blob) uploaded.avatar_url = await uploadAvatar(targetCardId, state.media.avatar.blob);
  else if (state.media.avatar.dataUrl) uploaded.avatar_url = state.media.avatar.dataUrl;

  if (state.media.logo.blob) uploaded.logo_url = await uploadLogo(targetCardId, state.media.logo.blob);
  else if (state.media.logo.dataUrl) uploaded.logo_url = state.media.logo.dataUrl;

  for (let i = 1; i <= PHOTO_SLOT_MAX; i++) {
    const item = state.media.photos[i - 1];
    if (item.blob) uploaded[`photo${i}_url`] = await uploadPhoto(targetCardId, item.blob, i);
    else if (item.dataUrl) uploaded[`photo${i}_url`] = item.dataUrl;
  }

  return uploaded;
}

function validateBeforeSubmit() {
  const data = collectFormData();

  if (state.mode !== MODES.RENEW && !data.name) {
    throw new Error("請填寫名稱。");
  }

  for (let i = 1; i <= 3; i++) {
    const txt = text(data[`cta_text_${i}`]);
    const link = text(data[`cta_link_${i}`]);
    if ((txt && !link) || (!txt && link)) {
      throw new Error(`CTA${i} 文字與連結需成對填寫。`);
    }
  }

  return data;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearStatus();
  setResult("");

  try {
    validateBeforeSubmit();
    setSubmitLoading(true);

    if (state.mode === MODES.CREATE) {
      await submitCreate();
    } else if (state.mode === MODES.UPDATE) {
      await submitUpdate();
    } else {
      await submitRenew();
    }

    localStorage.removeItem(getDraftKey());
  } catch (err) {
    console.error(err);
    setStatus(err.message || "送出失敗", "error");
  } finally {
    setSubmitLoading(false);
  }
}

async function submitCreate() {
  const data = collectFormData();
  const mediaUrls = await uploadAllMedia(state.createTempId);
  const payload = Object.assign({}, data, mediaUrls, {
    invite_code: state.inviteCode,
    ref: state.ref,
    tenant: CONFIG.DEFAULT_TENANT,
    source: state.ref ? "agent_form" : "form",
    features_json: JSON.stringify({
      preview_meta: { theme: data.plan, layout: "grid", aspect_ratio: "1:1", fit_mode: "cover" },
      photo_meta: buildPhotoMetaMap()
    })
  });

  const leadRes = await apiPost("createLead", payload);
  const lead = leadRes.lead || {};
  const createAction = CONFIG.USE_OFFLINE_CREATE ? CONFIG.CREATE_CARD_OFFLINE_ACTION : CONFIG.CREATE_CARD_ACTION;
  const cardRes = await apiPost(createAction, Object.assign({}, payload, {
    lead_id: text(lead.lead_id || lead.id || "")
  }));
  const card = cardRes.card || cardRes.data || cardRes;
  state.cardId = text(card.id || card.card_id);
  syncHiddenFields();

  setStatus("建卡成功。", "success");
  setResult([
    `card_id：${state.cardId || "—"}`,
    `成品卡：${text(card.card_url || card.share_url || "") || "請依後端回傳為準"}`,
    `付款期限：${formatDateTime(card.payment_due_at || card.due_at)}`,
    `客服連結：${CONFIG.CUSTOMER_SERVICE_URL || "未設定"}`
  ].join("\n"));
}

async function submitUpdate() {
  if (!state.token) throw new Error("缺少 token，無法更新。");
  const data = collectFormData();
  const targetCardId = state.cardId || state.createTempId;
  const mediaUrls = await uploadAllMedia(targetCardId);

  if (!state.updateInfo) {
    const eligibility = await apiGet("getUpdateEligibility", { token: state.token, card_id: state.cardId });
    state.updateInfo = eligibility.eligibility || eligibility.data || eligibility;
    renderUpdateBenefits();
  }

  const updatePayload = Object.assign({}, data, mediaUrls, {
    token: state.token,
    card_id: state.cardId
  });

  if (toBool(state.updateInfo.charge_required)) {
    const feeRes = await apiPost("createUpdateFeePayment", updatePayload);
    const payment = feeRes.payment || feeRes.data || feeRes;
    setStatus("本次更新需付費，已建立更新付款單。", "success");
    setResult([
      `payment_id：${text(payment.payment_id || payment.id) || "—"}`,
      `金額：${toCurrency(payment.amount || state.updateInfo.charge_amount)} 元`,
      `付款期限：${formatDateTime(payment.due_at)}`,
      `請聯繫客服開通：${CONFIG.CUSTOMER_SERVICE_URL || "未設定"}`
    ].join("\n"));
  } else {
    const res = await apiPost("updateCardByToken", updatePayload);
    const card = res.card || res.data || res;
    setStatus("更新成功。", "success");
    setResult([
      `card_id：${text(card.id || card.card_id || state.cardId) || "—"}`,
      `成品卡：${text(card.card_url || card.share_url || "") || "請依後端回傳為準"}`
    ].join("\n"));
  }
}

async function submitRenew() {
  if (!state.cardId) throw new Error("缺少 card_id，無法續約。");
  const payload = {
    card_id: state.cardId
  };
  const res = await apiPost("createRenewalPayment", payload);
  const payment = res.payment || res.data || res;
  setStatus("續約單已建立。", "success");
  setResult([
    `payment_id：${text(payment.payment_id || payment.id) || "—"}`,
    `card_id：${state.cardId}`,
    `金額：${toCurrency(payment.amount || state.renewSummary?.total_amount)} 元`,
    `付款期限：${formatDateTime(payment.due_at)}`
  ].join("\n"));
}

async function init() {
  buildPhotoSlots();
  bindFieldEvents();
  applyModeUI();
  try {
    await loadModeData();
  } catch (err) {
    console.error(err);
    setStatus(err.message || "載入失敗", "error");
  } finally {
    setSubmitLoading(false);
  }
}

init();
