(() => {
"use strict";

const VERSION = "v4.9-marquee";
const GAS_URL =
document.getElementById("gas")?.value ||
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const CONFIG = {
  GAS: GAS_URL,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm"
};

const MB = 1024 * 1024;
const MAX_ACCEPT_FILE_SIZE = 20 * MB;
const ADDON_PRICES = {
  marquee: 300,
  gold_member: 10000,
  photo: 100,
  cta: 100,
  update_unlimited: 300,
  bundle: 500
};

let firebaseApi = null;
async function getFirebaseApi() {
  if (firebaseApi) return firebaseApi;
  const mod = await import("./firebase.js");
  if (
    !mod ||
    typeof mod.initFirebase !== "function" ||
    typeof mod.ensureAuth !== "function" ||
    typeof mod.uploadAvatar !== "function" ||
    typeof mod.uploadLogo !== "function" ||
    typeof mod.uploadPhoto !== "function"
  ) {
    throw new Error("firebase.js 載入失敗");
  }
  firebaseApi = mod;
  return firebaseApi;
}

const PLAN_RULES = {
  free: { key: "free", label: "自由搭配款", maxCtas: 1, defaultPhotos: 2, amount: 1500 },
  premium: { key: "premium", label: "精品設計款", maxCtas: 3, defaultPhotos: 5, amount: 2000 }
};

const SMART_PROFILE = {
  small: { maxLong: 1800, maxShort: 1800, previewQuality: 0.9, outputQuality: 0.88 },
  medium: { maxLong: 1500, maxShort: 1500, previewQuality: 0.86, outputQuality: 0.82 },
  large: { maxLong: 1200, maxShort: 1200, previewQuality: 0.82, outputQuality: 0.76 }
};

function buildImageSlots(photoLimit) {
  const slots = [
    { slot: "avatar", label: "頭像", key: "avatar_url", cropShape: "square", targetWidth: 1200, targetHeight: 1200 },
    { slot: "logo", label: "Logo", key: "logo_url", cropShape: "square", targetWidth: 1200, targetHeight: 1200 }
  ];
  for (let i = 1; i <= photoLimit; i++) {
    slots.push({
      slot: `photo${i}`,
      label: `照片 ${i}`,
      key: `photo${i}_url`,
      cropShape: "wide",
      targetWidth: 1600,
      targetHeight: 1000
    });
  }
  return slots;
}

const state = {
  currentPage: 0,
  totalPages: 6,
  busy: false,
  firebaseReady: false,
  plan: "free",
  rules: PLAN_RULES.free,
  photoLimit: 2,
  imageSlots: [],
  drag: { active: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 },
  cropper: {
    slot: "", image: null, imageUrl: "", sourceFile: null, smartProfile: SMART_PROFILE.small,
    scale: 1, minScale: 1, offsetX: 0, offsetY: 0, viewportW: 0, viewportH: 0, imageW: 0, imageH: 0
  }
};

const el = {
  pages: Array.from(document.querySelectorAll(".page")),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  navDots: document.getElementById("navDots"),

  plan: document.getElementById("plan"),
  color: document.getElementById("color"),
  style: document.getElementById("style"),
  paper: document.getElementById("paper"),
  premiumColor: document.getElementById("premium_color"),
  freeStyleGroup: document.getElementById("freeStyleGroup"),
  premiumColorCard: document.getElementById("premiumColorCard"),

  ctaRow2: document.getElementById("ctaRow2"),
  ctaRow3: document.getElementById("ctaRow3"),

  uploadGrid: document.getElementById("uploadGrid"),
  summaryBox: document.getElementById("summaryBox"),

  previewCard: document.getElementById("livePreviewCard"),
  previewAvatar: document.getElementById("previewAvatar"),
  previewLogo: document.getElementById("previewLogo"),
  previewLogoWrap: document.getElementById("previewLogoWrap"),
  previewName: document.getElementById("previewName"),
  previewUnit: document.getElementById("previewUnit"),
  previewTitle: document.getElementById("previewTitle"),
  previewSlogan: document.getElementById("previewSlogan"),
  previewServices: document.getElementById("previewServices"),
  previewExperience: document.getElementById("previewExperience"),
  previewServicesBlock: document.getElementById("previewServicesBlock"),
  previewExperienceBlock: document.getElementById("previewExperienceBlock"),
  previewPhotoWall: document.getElementById("previewPhotoWall"),
  previewPhotoGrid: document.getElementById("previewPhotoGrid"),
  previewEmptyPhotos: document.getElementById("previewEmptyPhotos"),

  btnTest: document.getElementById("btnTest"),
  btnSubmit: document.getElementById("btnSubmit"),
  btnReset: document.getElementById("btnReset"),
  status: document.getElementById("status"),
  successBox: document.getElementById("submitSuccessBox"),
  successCardId: document.getElementById("successCardId"),
  successCopyText: document.getElementById("successCopyText"),
  copyBtn: document.getElementById("copyBtn"),
  lineCustomerServiceBtn: document.getElementById("lineCustomerServiceBtn"),

  progressWrap: document.getElementById("submitProgressWrap"),
  progressTitle: document.getElementById("submitProgressTitle"),
  progressPercent: document.getElementById("submitProgressPercent"),
  progressFill: document.getElementById("submitProgressFill"),
  progressText: document.getElementById("submitProgressText"),

  successBox: document.getElementById("submitSuccessBox"),
  successCardId: document.getElementById("successCardId"),
  successCopyText: document.getElementById("successCopyText"),

  guideModal: document.getElementById("guideModal"),
  facadeModal: document.getElementById("facadeModal"),
  cropModal: document.getElementById("cropModal"),

  openGuideTopBtn: document.getElementById("openGuideTopBtn"),
  openGuideBtn: document.getElementById("openGuideBtn"),
  closeGuideBtn: document.getElementById("closeGuideBtn"),
  guideConfirmBtn: document.getElementById("guideConfirmBtn"),
  guideGoFacadeBtn: document.getElementById("guideGoFacadeBtn"),

  openFacadeTopBtn: document.getElementById("openFacadeTopBtn"),
  openFacadeBtn: document.getElementById("openFacadeBtn"),
  closeFacadeBtn: document.getElementById("closeFacadeBtn"),
  facadeBackBtn: document.getElementById("facadeBackBtn"),

  cropTitle: document.getElementById("cropTitle"),
  cropDesc: document.getElementById("cropDesc"),
  cropMeta: document.getElementById("cropMeta"),
  cropStage: document.getElementById("cropStage"),
  cropCanvas: document.getElementById("cropCanvas"),
  cropZoomOut: document.getElementById("cropZoomOut"),
  cropZoomIn: document.getElementById("cropZoomIn"),
  cropCenter: document.getElementById("cropCenter"),
  cropReset: document.getElementById("cropReset"),
  cropCancel: document.getElementById("cropCancel"),
  cropApply: document.getElementById("cropApply"),

  addonMarquee: document.getElementById("addon_marquee"),
  marqueeText: document.getElementById("marquee_text"),
  marqueeTextWrap: document.getElementById("marqueeTextWrap")
};

init().catch((err) => {
  console.error("[HSC form] init failed:", err);
  setStatus(`初始化失敗：${err?.message || "未知錯誤"}`);
});

async function init() {
  const urlPhotoLimit = getPhotoLimitFromUrl();
  const plan = normalizePlan(getFieldValue("plan") || "free");
  state.plan = plan;
  state.rules = PLAN_RULES[plan];
  state.photoLimit = urlPhotoLimit !== null ? urlPhotoLimit : state.rules.defaultPhotos;
  state.imageSlots = buildImageSlots(state.photoLimit);

  createUploadGrid();
  bindSlotEvents();
  bindModalEvents();
  bindPageEvents();
  bindPlanEvents();
  bindFieldEvents();
  bindActionEvents();
  bindCropEvents();
  readUrlParams();
  initNavDots();
  applyPlanRules(state.plan, true);
  updatePage(true);
  updateLivePreview();
  buildSummary();
  hideSuccess();
  setProgress(0, "尚未送出");
  setStatus("請依序填寫。");
}

function getPhotoLimitFromUrl() {
  const url = new URL(location.href);
  const val = url.searchParams.get("photo_limit");
  if (val === null || val === "") return null;
  const num = parseInt(val, 10);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.min(num, 10);
}

function createUploadGrid() {
  if (!el.uploadGrid) return;
  el.uploadGrid.innerHTML = "";

  state.imageSlots.forEach((cfg) => {
    const item = document.createElement("div");
    item.className = "uItem";
    item.id = `slotWrap_${cfg.slot}`;
    item.innerHTML = `
      <div class="uItemHead">
        <div>
          <strong>${cfg.label}</strong>
          <small id="slotStatus_${cfg.slot}">尚未選擇</small>
        </div>
      </div>
      <div class="thumb ${cfg.cropShape === "square" ? "square" : ""}" id="thumb_${cfg.slot}">
        尚未選擇圖片
      </div>
      <div class="miniRow">
        <input id="file_${cfg.slot}" type="file" accept="image/*" />
        <button type="button" class="secondary" data-pick="${cfg.slot}">選圖</button>
        <button type="button" class="secondary" data-edit="${cfg.slot}">重選</button>
        <button type="button" class="ghost" data-clear="${cfg.slot}">清除</button>
      </div>
      <input type="hidden" id="${cfg.key}" />
    `;
    el.uploadGrid.appendChild(item);
  });

  state.imageSlots.forEach((cfg) => {
    const input = document.getElementById(`file_${cfg.slot}`);
    if (!input) return;
    input.addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_ACCEPT_FILE_SIZE) {
        input.value = "";
        setStatus("圖片太大了，請選擇 20MB 以下圖片。");
        return;
      }
      if (!isPhotoSlotAllowed(cfg.slot)) {
        input.value = "";
        setStatus("這個方案目前沒有開放這個照片位置。");
        return;
      }
      try {
        await openCropper(cfg.slot, file);
      } catch (err) {
        console.error("[HSC form] openCropper failed:", err);
        setStatus(`圖片讀取失敗：${err?.message || "請重新選擇圖片"}`);
      }
    });
  });
}

function bindSlotEvents() {
  document.addEventListener("click", (ev) => {
    const pickBtn = ev.target.closest("[data-pick]");
    if (pickBtn) return triggerFilePick(pickBtn.getAttribute("data-pick"));
    const editBtn = ev.target.closest("[data-edit]");
    if (editBtn) return triggerFilePick(editBtn.getAttribute("data-edit"));
    const clearBtn = ev.target.closest("[data-clear]");
    if (clearBtn) return clearSlot(clearBtn.getAttribute("data-clear"));
  });
}

function bindModalEvents() {
  [
    [el.openGuideTopBtn, () => openModal(el.guideModal)],
    [el.openGuideBtn, () => openModal(el.guideModal)],
    [el.closeGuideBtn, () => closeModal(el.guideModal)],
    [el.guideConfirmBtn, () => closeModal(el.guideModal)],
    [el.openFacadeTopBtn, () => openModal(el.facadeModal)],
    [el.openFacadeBtn, () => openModal(el.facadeModal)],
    [el.closeFacadeBtn, () => closeModal(el.facadeModal)],
    [el.facadeBackBtn, () => closeModal(el.facadeModal)],
    [el.guideGoFacadeBtn, () => { closeModal(el.guideModal); openModal(el.facadeModal); }]
  ].forEach(([node, fn]) => node?.addEventListener("click", fn));

  [el.guideModal, el.facadeModal, el.cropModal].forEach((modal) => {
    modal?.addEventListener("click", (ev) => {
      if (ev.target === modal) closeModal(modal);
    });
  });
}

function bindPageEvents() {
  el.prevBtn?.addEventListener("click", () => {
    if (state.currentPage <= 0) return;
    state.currentPage -= 1;
    updatePage(true);
  });

  el.nextBtn?.addEventListener("click", () => {
    if (state.currentPage < state.totalPages - 1) {
      if (!validateCurrentPage(state.currentPage)) {
        const msg = document.getElementById("status")?.textContent || "請檢查欄位";
        alert("⚠️ " + msg);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      state.currentPage += 1;
      updatePage(true);
      if (state.currentPage === 5) buildSummary();
    } else {
      submitForm();
    }
  });
}

function bindPlanEvents() {
  el.plan?.addEventListener("change", () => {
    const newPlan = normalizePlan(el.plan.value);
    if (newPlan === state.plan) return;
    state.plan = newPlan;
    state.rules = PLAN_RULES[newPlan];
    const urlPhotoLimit = getPhotoLimitFromUrl();
    state.photoLimit = urlPhotoLimit !== null ? Math.min(urlPhotoLimit, 10) : state.rules.defaultPhotos;
    state.imageSlots = buildImageSlots(state.photoLimit);
    createUploadGrid();
    syncPhotoFieldsAfterLimitChange();
    applyPlanRules(state.plan, true);
    updateLivePreview();
    buildSummary();
  });

  [el.color, el.style, el.paper, el.premiumColor].forEach((node) => {
    node?.addEventListener("change", () => updateLivePreview());
  });
}

function bindFieldEvents() {
  const watchIds = [
    "name","unit","title","slogan","services","experience",
    "phone","email","line_url","line_oa","wechat_id","website","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3",
    "marquee_text"
  ];

  watchIds.forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener("input", () => {
      autoGrow(node);
      updateLivePreview();
      if (state.currentPage === 5) buildSummary();
    });
    node.addEventListener("change", () => {
      updateLivePreview();
      if (state.currentPage === 5) buildSummary();
    });
  });
}

function bindActionEvents() {
  el.btnTest?.addEventListener("click", testConnection);
  el.btnSubmit?.addEventListener("click", submitForm);
  el.btnReset?.addEventListener("click", resetForm);

  el.addonMarquee?.addEventListener("change", () => {
    syncAddonUI();
    buildSummary();
  });

  el.addonGoldMember?.addEventListener("change", () => {
    buildSummary();
  });

  el.addonPhoto?.addEventListener("change", () => {
    syncAddonUI();
    buildSummary();
  });

  el.addonCta?.addEventListener("change", () => {
    syncAddonUI();
    buildSummary();
  });

  el.addonUpdateUnlimited?.addEventListener("change", () => {
    buildSummary();
  });

  el.addonBundle?.addEventListener("change", () => {
    buildSummary();
  });

  el.addonPhotoQty?.addEventListener("input", () => buildSummary());
  el.addonCtaQty?.addEventListener("input", () => buildSummary());

  el.copyBtn?.addEventListener("click", async () => {
    try {
      const copyText = el.successCopyText?.value || "";
      if (!copyText) return;
      await copyToClipboard(copyText);
      const oldText = el.copyBtn.textContent;
      el.copyBtn.textContent = "✅ 已複製";
      setTimeout(() => {
        if (el.copyBtn) el.copyBtn.textContent = oldText;
      }, 1600);
    } catch {
      setStatus("請手動複製客服回覆文案。");
    }
  });
}

function syncAddonUI() {
  const show = !!el.addonMarquee?.checked;
  if (el.marqueeTextWrap) el.marqueeTextWrap.classList.toggle("show", show);
  if (!show && el.marqueeText) el.marqueeText.value = "";
}

function bindCropEvents() {
  el.cropCanvas?.addEventListener("pointerdown", (ev) => {
    if (!state.cropper.image) return;
    state.drag.active = true;
    state.drag.startX = ev.clientX;
    state.drag.startY = ev.clientY;
    state.drag.startOffsetX = state.cropper.offsetX;
    state.drag.startOffsetY = state.cropper.offsetY;
    el.cropCanvas?.setPointerCapture?.(ev.pointerId);
  });

  window.addEventListener("pointermove", (ev) => {
    if (!state.drag.active || !state.cropper.image) return;
    const dx = ev.clientX - state.drag.startX;
    const dy = ev.clientY - state.drag.startY;
    state.cropper.offsetX = state.drag.startOffsetX + dx;
    state.cropper.offsetY = state.drag.startOffsetY + dy;
    renderCropCanvas();
  });

  window.addEventListener("pointerup", () => { state.drag.active = false; });

  el.cropZoomOut?.addEventListener("click", () => {
    const cp = state.cropper;
    if (!cp.image) return;
    cp.scale = clamp(cp.scale - Math.max(cp.minScale * 0.08, 0.04), cp.minScale * 0.6, cp.minScale * 3);
    renderCropCanvas();
  });

  el.cropZoomIn?.addEventListener("click", () => {
    const cp = state.cropper;
    if (!cp.image) return;
    cp.scale = clamp(cp.scale + Math.max(cp.minScale * 0.08, 0.04), cp.minScale * 0.6, cp.minScale * 3);
    renderCropCanvas();
  });

  el.cropCenter?.addEventListener("click", () => {
    state.cropper.offsetX = 0;
    state.cropper.offsetY = 0;
    renderCropCanvas();
  });

  el.cropReset?.addEventListener("click", resetCropperView);
  el.cropCancel?.addEventListener("click", () => closeModal(el.cropModal));
  el.cropApply?.addEventListener("click", applyCropAndUpload);

  window.addEventListener("resize", () => {
    if (el.cropModal?.classList.contains("show") && state.cropper.image) resetCropperView();
  });
}

function readUrlParams() {
  const url = new URL(location.href);
  setFieldValue("invite_code", text(url.searchParams.get("invite")));
  setFieldValue("reserved_uid", text(url.searchParams.get("reserved_uid")));
  setFieldValue("share_card_id", text(url.searchParams.get("share_card_id")));
  setFieldValue("share_agent_id", text(url.searchParams.get("share_agent_id")));
  setFieldValue("share_source", text(url.searchParams.get("share_source") || url.searchParams.get("ref")));
  setFieldValue("share_channel", text(url.searchParams.get("share_channel")));
  setFieldValue("share_visit_id", text(url.searchParams.get("share_visit_id")));
}

function normalizePlan(v) {
  return text(v).toLowerCase() === "premium" ? "premium" : "free";
}

function applyPlanRules(plan, updateValue = false) {
  const rules = PLAN_RULES[plan];
  state.plan = rules.key;
  state.rules = rules;

  if (updateValue && el.plan) el.plan.value = rules.key;

  toggleEl(el.freeStyleGroup, rules.key === "free");
  toggleEl(el.premiumColorCard, rules.key === "premium");
  toggleEl(el.ctaRow2, rules.maxCtas >= 2);
  toggleEl(el.ctaRow3, rules.maxCtas >= 3);

  if (rules.key === "free") {
    setFieldValue("premium_color", "");
    clearCtaFieldsFrom(2);
  } else {
    setFieldValue("color", "");
    setFieldValue("style", "");
    setFieldValue("paper", "");
  }

  updateLivePreview();
}

function clearCtaFieldsFrom(start) {
  for (let i = start; i <= 3; i++) {
    setFieldValue(`cta_text_${i}`, "");
    setFieldValue(`cta_link_${i}`, "");
  }
}

function initNavDots() {
  if (!el.navDots) return;
  el.navDots.innerHTML = "";
  for (let i = 0; i < state.totalPages; i++) {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("active");
    el.navDots.appendChild(dot);
  }
}

function updatePage(scrollToTop = true) {
  el.pages.forEach((page, idx) => page.classList.toggle("active", idx === state.currentPage));
  Array.from(el.navDots?.children || []).forEach((dot, idx) => dot.classList.toggle("active", idx === state.currentPage));
  if (el.prevBtn) el.prevBtn.disabled = state.currentPage === 0;
  if (el.nextBtn) el.nextBtn.textContent = state.currentPage === state.totalPages - 1 ? "送出資料" : "下一步";
  if (state.currentPage === 5) buildSummary();
  if (scrollToTop !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearValidationState() {
  document.querySelectorAll(".hsc-field-error").forEach((node) => node.classList.remove("hsc-field-error"));
}

function markFieldError(id) {
  const node = document.getElementById(id);
  if (node) node.classList.add("hsc-field-error");
}

function focusField(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => { try { node.focus(); } catch {} }, 160);
}

function validateCurrentPage(pageIndex) {
  clearValidationState();
  try {
    if (pageIndex === 0) {
      const plan = normalizePlan(getFieldValue("plan"));
      if (!getFieldValue("plan")) { markFieldError("plan"); throw new Error("請先選擇方案。"); }
      if (plan === "free") {
        if (!getFieldValue("color")) { markFieldError("color"); throw new Error("請選擇主色。"); }
        if (!getFieldValue("style")) { markFieldError("style"); throw new Error("請選擇版型。"); }
        if (!getFieldValue("paper")) { markFieldError("paper"); throw new Error("請選擇紙感。"); }
      }
      if (plan === "premium" && !getFieldValue("premium_color")) {
        markFieldError("premium_color");
        throw new Error("請選擇精品色。");
      }
    }

    if (pageIndex === 1) {
      if (!getFieldValue("name")) { markFieldError("name"); throw new Error("請填寫姓名或品牌名稱。"); }
    }

    if (pageIndex === 2) {
      const contactIds = ["phone","email","line_url","line_oa","wechat_id"];
      const contactOk = contactIds.some((id) => getFieldValue(id));
      if (!contactOk) {
        contactIds.forEach(markFieldError);
        throw new Error("請至少留一種聯絡方式。");
      }
    }

    if (pageIndex === 3) {
      for (let i = 1; i <= state.rules.maxCtas; i++) {
        const textId = `cta_text_${i}`;
        const linkId = `cta_link_${i}`;
        const t = getFieldValue(textId);
        const l = getFieldValue(linkId);
        if ((t && !l) || (!t && l)) {
          markFieldError(textId);
          markFieldError(linkId);
          throw new Error(`第 ${i} 個按鈕請同時填寫文字和連結。`);
        }
      }
    }

    if (pageIndex === 5) {
      if (el.addonMarquee?.checked && !getFieldValue("marquee_text")) {
        markFieldError("marquee_text");
        throw new Error("已勾選跑馬燈加購，請填寫跑馬燈內容。");
      }
    }

    setStatus("請繼續填寫。");
    return true;
  } catch (err) {
    const msg = err?.message || "請檢查欄位。";
    setStatus(msg);

    if (pageIndex === 0) {
      if (!getFieldValue("plan")) focusField("plan");
      else if (normalizePlan(getFieldValue("plan")) === "free" && !getFieldValue("color")) focusField("color");
      else if (normalizePlan(getFieldValue("plan")) === "free" && !getFieldValue("style")) focusField("style");
      else if (normalizePlan(getFieldValue("plan")) === "free" && !getFieldValue("paper")) focusField("paper");
      else if (normalizePlan(getFieldValue("plan")) === "premium" && !getFieldValue("premium_color")) focusField("premium_color");
    } else if (pageIndex === 1) {
      focusField("name");
    } else if (pageIndex === 2) {
      focusField("phone");
    } else if (pageIndex === 3) {
      focusField("cta_text_1");
    } else if (pageIndex === 5) {
      focusField("marquee_text");
    }

    return false;
  }
}

function updatePhotoWall(photos) {
  if (!el.previewPhotoWall) return;
  if (!el.previewPhotoGrid) {
    const grid = document.createElement("div");
    grid.id = "previewPhotoGrid";
    grid.className = "photo-grid";
    el.previewPhotoWall.appendChild(grid);
    el.previewPhotoGrid = grid;
  }
  el.previewPhotoGrid.innerHTML = "";

  if (photos.length === 0) {
    el.previewPhotoWall.style.display = "none";
    if (el.previewEmptyPhotos) el.previewEmptyPhotos.style.display = "";
    return;
  }

  el.previewPhotoWall.style.display = "";
  if (el.previewEmptyPhotos) el.previewEmptyPhotos.style.display = "none";
  el.previewPhotoGrid.className = "photo-grid";
  if (photos.length === 1) el.previewPhotoGrid.classList.add("layout-1");
  else if (photos.length === 2) el.previewPhotoGrid.classList.add("layout-2");
  else if (photos.length === 3) el.previewPhotoGrid.classList.add("layout-3");
  else if (photos.length === 4) el.previewPhotoGrid.classList.add("layout-4");
  else el.previewPhotoGrid.classList.add("layout-5");

  photos.forEach((url, idx) => {
    const item = document.createElement("img");
    item.className = "wall-img";
    item.alt = `照片 ${idx + 1}`;
    item.src = url;
    item.loading = "lazy";
    el.previewPhotoGrid.appendChild(item);
  });
}

function updateAvatar(url) {
  if (!el.previewAvatar) return;
  if (url) {
    el.previewAvatar.src = url;
    el.previewAvatar.style.display = "block";
  } else {
    el.previewAvatar.removeAttribute("src");
    el.previewAvatar.style.display = "none";
  }
}

function updateLogo(url) {
  if (!el.previewLogo) return;
  if (url) {
    el.previewLogo.src = url;
    el.previewLogo.style.display = "block";
    if (el.previewLogoWrap) el.previewLogoWrap.style.display = "flex";
  } else {
    el.previewLogo.removeAttribute("src");
    el.previewLogo.style.display = "none";
    if (el.previewLogoWrap) el.previewLogoWrap.style.display = "none";
  }
}

function updateLivePreview() {
  if (!el.previewCard) return;
  el.previewCard.dataset.plan = state.plan;
  el.previewCard.dataset.color = getFieldValue("color") || "c1";
  el.previewCard.dataset.style = getFieldValue("style") || "s1";
  el.previewCard.dataset.paper = getFieldValue("paper") || "f1";
  el.previewCard.dataset.premium = getFieldValue("premium_color") || "p1";

  if (el.previewName) el.previewName.textContent = getFieldValue("name") || "您的姓名";
  if (el.previewUnit) el.previewUnit.textContent = getFieldValue("unit");
  if (el.previewTitle) el.previewTitle.textContent = getFieldValue("title");
  if (el.previewSlogan) el.previewSlogan.textContent = getFieldValue("slogan");

  const services = getFieldValue("services");
  const experience = getFieldValue("experience");
  if (el.previewServices) el.previewServices.textContent = services;
  if (el.previewExperience) el.previewExperience.textContent = experience;
  toggleEl(el.previewServicesBlock, !!services);
  toggleEl(el.previewExperienceBlock, !!experience);

  updateAvatar(getFieldValue("avatar_url"));
  updateLogo(getFieldValue("logo_url"));

  const activePhotos = [];
  for (let i = 1; i <= state.photoLimit; i++) {
    const url = getFieldValue(`photo${i}_url`);
    if (url) activePhotos.push(url);
  }
  updatePhotoWall(activePhotos);
}

function getAddonItems() {
  const items = [];

  const marqueeMessages = [
    getFieldValue("marquee_text_1"),
    getFieldValue("marquee_text_2"),
    getFieldValue("marquee_text_3")
  ].filter(Boolean);

  const photoQty = Math.max(0, parseInt(el.addonPhotoQty?.value || "0", 10) || 0);
  const ctaQty = Math.max(0, parseInt(el.addonCtaQty?.value || "0", 10) || 0);

  const hasBundle = !!el.addonBundle?.checked;

  if (hasBundle) {
    items.push({
      code: "addon_bundle",
      name: "組合包（跑馬燈＋無限更新）",
      amount: ADDON_PRICES.bundle,
      messages: marqueeMessages
    });
  } else {
    if (el.addonMarquee?.checked) {
      items.push({
        code: "addon_marquee",
        name: "跑馬燈（3則輪播）",
        amount: ADDON_PRICES.marquee,
        messages: marqueeMessages
      });
    }

    if (el.addonUpdateUnlimited?.checked) {
      items.push({
        code: "addon_update_unlimited",
        name: "無限更新",
        amount: ADDON_PRICES.update_unlimited
      });
    }
  }

  if (el.addonGoldMember?.checked) {
    items.push({
      code: "addon_gold_member",
      name: "升級金牌級會員方案",
      amount: ADDON_PRICES.gold_member,
      display_price: "請洽客服"
    });
  }

  if (el.addonPhoto?.checked && photoQty > 0) {
    items.push({
      code: "addon_photo",
      name: "照片加購",
      qty: photoQty,
      unit_price: ADDON_PRICES.photo,
      amount: ADDON_PRICES.photo * photoQty
    });
  }

  if (el.addonCta?.checked && ctaQty > 0) {
    items.push({
      code: "addon_cta",
      name: "CTA 加購",
      qty: ctaQty,
      unit_price: ADDON_PRICES.cta,
      amount: ADDON_PRICES.cta * ctaQty
    });
  }

  return items;
}

function buildSummary() {
  if (!el.summaryBox) return;
  const addonItems = getAddonItems();
  const addonText = addonItems.length
    ? addonItems.map((item) => {
        let parts = [];
        if (item.qty && item.unit_price) {
          parts.push(`${item.name}｜${item.qty} × NT$ ${Number(item.unit_price).toLocaleString("zh-TW")}｜NT$ ${Number(item.amount || 0).toLocaleString("zh-TW")}`);
        } else {
          const priceText = item.display_price || `NT$ ${Number(item.amount || 0).toLocaleString("zh-TW")}`;
          parts.push(`${item.name}｜${priceText}`);
        }
        if (item.messages && item.messages.length) {
          parts.push(`內容：${item.messages.join(" / ")}`);
        }
        return parts.join("｜");
      }).join("\n")
    : "未加購";

  const rows = [
    ["方案", state.rules.label],
    ["姓名 / 品牌", getFieldValue("name")],
    ["單位", getFieldValue("unit")],
    ["職稱", getFieldValue("title")],
    ["一句話介紹", getFieldValue("slogan")],
    ["電話", getFieldValue("phone")],
    ["Email", getFieldValue("email")],
    ["LINE", getFieldValue("line_url") || getFieldValue("line_oa")],
    ["微信", getFieldValue("wechat_id")],
    ["地址", getFieldValue("address")],
    ["網站", getFieldValue("website")],
    ["服務項目", getFieldValue("services")],
    ["品牌故事", getFieldValue("experience")],
    ["加購", addonText]
  ];

  const activePhotos = [];
  for (let i = 1; i <= state.photoLimit; i++) {
    if (getFieldValue(`photo${i}_url`)) activePhotos.push(1);
  }
  rows.push(["照片數量", `${activePhotos.length} / ${state.photoLimit}`]);

  const ctaRows = [];
  for (let i = 1; i <= state.rules.maxCtas; i++) {
    const t = getFieldValue(`cta_text_${i}`);
    const l = getFieldValue(`cta_link_${i}`);
    if (t || l) ctaRows.push(`${t || "未填寫"}｜${l || "未填寫"}`);
  }
  rows.push(["按鈕", ctaRows.length ? ctaRows.join("\n") : "未填寫"]);

  el.summaryBox.innerHTML = rows.map(([label, value]) => `
    <div class="card" style="margin-bottom:0;">
      <label style="margin-bottom:6px;">${escapeHtml(label)}</label>
      <div class="helperText" style="color:rgba(255,255,255,.9);">${escapeHtml(value || "未填寫")}</div>
    </div>
  `).join("");
}

async function testConnection() {
  if (state.busy) return;
  try {
    setBusy(true);
    setProgress(20, "檢查連線中…");
    setStatus("檢查連線中…");
    const url = new URL(GAS_URL);
    url.searchParams.set("action", "ping");
    url.searchParams.set("_t", String(Date.now()));
    const res = await fetchJson(url.toString());
    if (!res || res.ok !== true) throw new Error(readError(res) || "連線失敗");
    setProgress(100, "連線正常");
    setStatus("連線正常，可以送出資料。");
  } catch (err) {
    console.error("[HSC form] testConnection failed:", err);
    setProgress(0, "連線失敗");
    setStatus(`連線失敗：${err?.message || "未知錯誤"}`);
  } finally {
    setBusy(false);
  }
}

async function ensureFirebaseReady() {
  if (state.firebaseReady) return;
  const fb = await getFirebaseApi();
  fb.initFirebase();
  await fb.ensureAuth();
  state.firebaseReady = true;
}

async function openCropper(slot, file) {
  await ensureFirebaseReady();
  const cfg = state.imageSlots.find(s => s.slot === slot);
  if (!cfg) throw new Error("找不到圖片設定");

  const prepared = await prepareImageForCrop(file);
  if (state.cropper.imageUrl) {
    try { URL.revokeObjectURL(state.cropper.imageUrl); } catch {}
  }

  const objectUrl = URL.createObjectURL(prepared.blob);
  const img = await loadImage(objectUrl);

  state.cropper.slot = slot;
  state.cropper.image = img;
  state.cropper.imageUrl = objectUrl;
  state.cropper.sourceFile = file;
  state.cropper.smartProfile = prepared.profile;
  state.cropper.imageW = img.naturalWidth || img.width;
  state.cropper.imageH = img.naturalHeight || img.height;
  state.cropper.targetWidth = cfg.targetWidth;
  state.cropper.targetHeight = cfg.targetHeight;

  el.cropTitle.textContent = `調整圖片：${cfg.label}`;
  el.cropDesc.textContent = "可拖移位置，也可以放大、縮小，再按套用。";
  el.cropMeta.textContent = cfg.cropShape === "square"
    ? "頭像與 Logo 建議主體置中。"
    : "照片可先縮小保留更多畫面，也可放大讓主體更明顯。";

  el.cropStage.classList.toggle("ratio-square", cfg.cropShape === "square");
  el.cropStage.classList.toggle("ratio-photo", cfg.cropShape === "wide");

  openModal(el.cropModal);
  resetCropperView();
}

function resetCropperView() {
  const cp = state.cropper;
  if (!cp.image || !el.cropCanvas || !el.cropStage) return;

  const rect = el.cropStage.getBoundingClientRect();
  const ratio = cp.slot === "avatar" || cp.slot === "logo" ? 1 : 16 / 10;
  const width = Math.max(280, Math.floor(rect.width));
  const height = Math.floor(width / ratio);

  el.cropCanvas.width = width;
  el.cropCanvas.height = height;
  cp.viewportW = width;
  cp.viewportH = height;

  const fitScale = Math.max(width / cp.imageW, height / cp.imageH);
  cp.minScale = fitScale;
  cp.scale = fitScale;
  cp.offsetX = 0;
  cp.offsetY = 0;

  renderCropCanvas();
}

function renderCropCanvas() {
  const cp = state.cropper;
  const canvas = el.cropCanvas;
  if (!cp.image || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  clampOffsets();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const drawW = cp.imageW * cp.scale;
  const drawH = cp.imageH * cp.scale;
  const x = canvas.width / 2 - drawW / 2 + cp.offsetX;
  const y = canvas.height / 2 - drawH / 2 + cp.offsetY;
  ctx.drawImage(cp.image, x, y, drawW, drawH);
}

function clampOffsets() {
  const cp = state.cropper;
  if (!cp.image) return;
  const drawW = cp.imageW * cp.scale;
  const drawH = cp.imageH * cp.scale;
  const maxX = Math.max(0, (drawW - cp.viewportW) / 2 + cp.viewportW * 0.3);
  const maxY = Math.max(0, (drawH - cp.viewportH) / 2 + cp.viewportH * 0.3);
  cp.offsetX = clamp(cp.offsetX, -maxX, maxX);
  cp.offsetY = clamp(cp.offsetY, -maxY, maxY);
}

async function applyCropAndUpload() {
  const cp = state.cropper;
  const slot = cp.slot;
  const cfg = state.imageSlots.find(s => s.slot === slot);
  if (!cp.image || !cfg) return;

  try {
    setBusy(true);
    setStatus(`正在處理 ${cfg.label}…`);
    setProgress(22, `正在處理 ${cfg.label}…`);

    const blob = await renderCroppedBlob(slot);
    setProgress(48, `正在上傳 ${cfg.label}…`);

    const url = await uploadBySlot(slot, blob);
    if (!url) throw new Error("圖片上傳失敗");

    setFieldValue(cfg.key, url);
    setSlotPreview(slot, url);
    setSlotStatus(slot, "已完成");
    updateLivePreview();
    buildSummary();

    closeModal(el.cropModal);
    setProgress(100, `${cfg.label} 已更新`);
    setStatus(`${cfg.label} 已更新完成。`);
  } catch (err) {
    console.error("[HSC form] applyCropAndUpload failed:", err);
    setProgress(0, "圖片處理失敗");
    setStatus(`${cfg.label} 更新失敗：${err?.message || "未知錯誤"}`);
  } finally {
    setBusy(false);
  }
}

async function renderCroppedBlob(slot) {
  const cp = state.cropper;
  const cfg = state.imageSlots.find(s => s.slot === slot);

  const canvas = document.createElement("canvas");
  canvas.width = cfg.targetWidth;
  canvas.height = cfg.targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立畫布");

  const scaleToOutput = cfg.targetWidth / cp.viewportW;
  const drawW = cp.imageW * cp.scale * scaleToOutput;
  const drawH = cp.imageH * cp.scale * scaleToOutput;
  const centerX = cfg.targetWidth / 2;
  const centerY = cfg.targetHeight / 2;

  const drawX = centerX - drawW / 2 + cp.offsetX * scaleToOutput;
  const drawY = centerY - drawH / 2 + cp.offsetY * scaleToOutput;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(cp.image, drawX, drawY, drawW, drawH);

  return await canvasToBlob(canvas, "image/jpeg", cp.smartProfile.outputQuality);
}

async function uploadBySlot(slot, blob) {
  const fb = await getFirebaseApi();
  if (slot === "avatar") return await fb.uploadAvatar("TMP", blob);
  if (slot === "logo") return await fb.uploadLogo("TMP", blob);
  if (slot.startsWith("photo")) return await fb.uploadPhoto("TMP", blob, Number(slot.replace("photo", "")));
  throw new Error("未知的圖片欄位");
}

function triggerFilePick(slot) {
  if (!state.imageSlots.find(s => s.slot === slot)) return;
  if (!isPhotoSlotAllowed(slot)) {
    setStatus("這個方案目前沒有開放這個照片位置。");
    return;
  }
  const input = document.getElementById(`file_${slot}`);
  if (!input) return;
  input.value = "";
  input.click();
}

function clearSlot(slot) {
  const cfg = state.imageSlots.find(s => s.slot === slot);
  if (!cfg) return;
  if (!isPhotoSlotAllowed(slot)) {
    setStatus("這個方案目前沒有開放這個照片位置。");
    return;
  }
  setFieldValue(cfg.key, "");
  setSlotPreview(slot, "");
  setSlotStatus(slot, "已清除");
  const input = document.getElementById(`file_${slot}`);
  if (input) input.value = "";
  updateLivePreview();
  buildSummary();
  setStatus(`${cfg.label} 已清除。`);
}

function setSlotPreview(slot, url) {
  const thumb = document.getElementById(`thumb_${slot}`);
  if (!thumb) return;
  if (url) {
    thumb.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(state.imageSlots.find(s => s.slot === slot)?.label || slot)}" style="width:100%;height:100%;object-fit:contain;display:block;background:rgba(255,255,255,.02);">`;
  } else {
    thumb.textContent = "尚未選擇圖片";
  }
}

function setSlotStatus(slot, textValue) {
  const node = document.getElementById(`slotStatus_${slot}`);
  if (node) node.textContent = textValue || "尚未選擇";
}

function syncPhotoFieldsAfterLimitChange() {
  for (let i = state.photoLimit + 1; i <= 10; i++) {
    setFieldValue(`photo${i}_url`, "");
    const input = document.getElementById(`file_photo${i}`);
    if (input) input.value = "";
  }
}

function isPhotoSlotAllowed(slot) {
  if (slot === "avatar" || slot === "logo") return true;
  if (!slot.startsWith("photo")) return true;
  return Number(slot.replace("photo", "")) <= state.photoLimit;
}

async function submitForm() {
  if (state.busy) return;

  for (let i = 0; i < state.totalPages; i++) {
    if (!validateCurrentPage(i)) {
      state.currentPage = i;
      updatePage(true);
      return;
    }
  }

  try {
    setBusy(true);
    hideSuccess();
    setProgress(10, "正在整理資料…");
    setStatus("正在整理資料…");

    const payload = collectPayload();
    setProgress(60, "資料送出中，請勿離開頁面");

    const res = await fetchJson(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res || res.ok !== true) {
      throw new Error(readError(res) || "送出失敗");
    }

    const cardId = text(res.card_id || res.id || res.data?.card_id || res.data?.id || "");
    const addonItems = getAddonItems();
    const planName = state.rules.label;
    const planAmount = state.rules.amount;
    const addonAmount = addonItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalAmount = planAmount + addonAmount;
    const previewUrl = CONFIG.HUB_URL + "index.html?id=" + encodeURIComponent(cardId);

    const quoteData = {
      card_id: cardId,
      plan_name: planName,
      plan_amount: planAmount,
      addon_amount: addonAmount,
      total_amount: totalAmount,
      preview_url: previewUrl,
      customer_name: getFieldValue("name"),
      submitted_at: new Date().toISOString(),
      service_url: CONFIG.CUSTOMER_SERVICE_URL || "",
      addon_items: addonItems
    };

    localStorage.setItem("HSC_LAST_QUOTE", JSON.stringify(quoteData));

    const params = new URLSearchParams({
      card_id: quoteData.card_id,
      plan_name: quoteData.plan_name,
      plan_amount: String(quoteData.plan_amount),
      addon_amount: String(quoteData.addon_amount),
      total_amount: String(quoteData.total_amount),
      preview_url: quoteData.preview_url,
      customer_name: quoteData.customer_name,
      submitted_at: quoteData.submitted_at,
      service_url: quoteData.service_url,
      addon_items: JSON.stringify(quoteData.addon_items || [])
    });

    const replyText = buildSuccessReply(cardId);
    showSuccess(cardId, replyText);
    setProgress(100, "送出成功，跳轉中…");
    setStatus("✅ 資料已送出！可先一鍵回覆客服，或直接前往報價頁。");
    setTimeout(() => {
      window.location.href = "quote-success.html?" + params.toString();
    }, 1200);
  } catch (err) {
    console.error("[HSC form] submit failed:", err);
    setProgress(0, "送出失敗");
    setStatus(`❌ 送出失敗：${err?.message || "未知錯誤"}`);
  } finally {
    setBusy(false);
  }
}

function collectPayload() {
  const plan = normalizePlan(getFieldValue("plan"));
  let color = "", style = "", paper = "";

  if (plan === "free") {
    color = getFieldValue("color");
    style = getFieldValue("style");
    paper = getFieldValue("paper");
  } else {
    color = getFieldValue("premium_color");
  }

  const addonItems = getAddonItems();

  return {
    action: "createLead",
    invite_code: getFieldValue("invite_code"),
    reserved_uid: getFieldValue("reserved_uid"),
    tenant: getFieldValue("tenant") || "angel",
    plan, color, style, paper,
    name: getFieldValue("name"),
    unit: getFieldValue("unit"),
    title: getFieldValue("title"),
    slogan: getFieldValue("slogan"),
    services: getFieldValue("services"),
    experience: getFieldValue("experience"),
    wechat_id: getFieldValue("wechat_id"),
    line_url: getFieldValue("line_url"),
    line_oa: getFieldValue("line_oa"),
    email: getFieldValue("email"),
    phone: getFieldValue("phone"),
    address: getFieldValue("address"),
    video1: getFieldValue("video1"),
    video2: getFieldValue("video2"),
    video3: getFieldValue("video3"),
    social1: getFieldValue("social1"),
    social2: getFieldValue("social2"),
    social3: getFieldValue("social3"),
    avatar_url: getFieldValue("avatar_url"),
    logo_url: getFieldValue("logo_url"),
    photo_limit: state.photoLimit,
    photo1_url: getFieldValue("photo1_url"),
    photo2_url: getFieldValue("photo2_url"),
    photo3_url: state.photoLimit >= 3 ? getFieldValue("photo3_url") : "",
    photo4_url: state.photoLimit >= 4 ? getFieldValue("photo4_url") : "",
    photo5_url: state.photoLimit >= 5 ? getFieldValue("photo5_url") : "",
    photo6_url: state.photoLimit >= 6 ? getFieldValue("photo6_url") : "",
    photo7_url: state.photoLimit >= 7 ? getFieldValue("photo7_url") : "",
    photo8_url: state.photoLimit >= 8 ? getFieldValue("photo8_url") : "",
    photo9_url: state.photoLimit >= 9 ? getFieldValue("photo9_url") : "",
    photo10_url: state.photoLimit >= 10 ? getFieldValue("photo10_url") : "",
    website: getFieldValue("website"),
    cta_text_1: getFieldValue("cta_text_1"),
    cta_link_1: getFieldValue("cta_link_1"),
    cta_text_2: state.rules.maxCtas >= 2 ? getFieldValue("cta_text_2") : "",
    cta_link_2: state.rules.maxCtas >= 2 ? getFieldValue("cta_link_2") : "",
    cta_text_3: state.rules.maxCtas >= 3 ? getFieldValue("cta_text_3") : "",
    cta_link_3: state.rules.maxCtas >= 3 ? getFieldValue("cta_link_3") : "",
    share_card_id: getFieldValue("share_card_id"),
    share_agent_id: getFieldValue("share_agent_id"),
    share_source: getFieldValue("share_source"),
    share_channel: getFieldValue("share_channel"),
    share_visit_id: getFieldValue("share_visit_id"),
    addon_marquee: el.addonMarquee?.checked ? "true" : "false",
    marquee_text: getFieldValue("marquee_text"),
    addon_items_json: JSON.stringify(addonItems)
  };
}


function buildSuccessReply(cardId) {
  return `您好，我已送出智慧名片申請資料。
申請編號：${cardId || "-"}
請協助確認資料與後續流程，謝謝。`;
}

function showSuccess(cardId, replyText) {
  if (el.successCardId) el.successCardId.textContent = cardId || "-";
  if (el.successCopyText) el.successCopyText.value = replyText || "";
  toggleEl(el.successBox, true);
}

async function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function hideSuccess() {
  toggleEl(el.successBox, false);
}

function resetForm() {
  if (state.busy) return;
  if (!window.confirm("確定要重設這份表單嗎？")) return;

  const allInputIds = [
    "plan","color","style","paper","premium_color",
    "name","unit","title","slogan","services","experience",
    "phone","email","line_url","line_oa","wechat_id","website","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3",
    "marquee_text"
  ];
  allInputIds.forEach((id) => setFieldValue(id, ""));

  state.imageSlots.forEach((cfg) => {
    setFieldValue(cfg.key, "");
    setSlotPreview(cfg.slot, "");
    setSlotStatus(cfg.slot, "尚未選擇");
    const file = document.getElementById(`file_${cfg.slot}`);
    if (file) file.value = "";
  });

  if (el.addonMarquee) el.addonMarquee.checked = false;
  if (el.addonGoldMember) el.addonGoldMember.checked = false;
  if (el.addonPhoto) el.addonPhoto.checked = false;
  if (el.addonCta) el.addonCta.checked = false;
  if (el.addonUpdateUnlimited) el.addonUpdateUnlimited.checked = false;
  if (el.addonBundle) el.addonBundle.checked = false;
  if (el.addonPhotoQty) el.addonPhotoQty.value = "";
  if (el.addonCtaQty) el.addonCtaQty.value = "";
  syncAddonUI();

  setFieldValue("tenant", "angel");
  readUrlParams();

  const urlPhotoLimit = getPhotoLimitFromUrl();
  state.plan = "free";
  state.rules = PLAN_RULES.free;
  state.photoLimit = urlPhotoLimit !== null ? urlPhotoLimit : state.rules.defaultPhotos;
  state.imageSlots = buildImageSlots(state.photoLimit);
  createUploadGrid();

  applyPlanRules("free", true);
  state.currentPage = 0;
  updatePage(true);
  updateLivePreview();
  buildSummary();
  hideSuccess();
  setProgress(0, "尚未送出");
  setStatus("表單已重設。");
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body,
    cache: "no-store",
    redirect: "follow"
  });
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = extractJson(raw);
    if (cleaned) return JSON.parse(cleaned);
    throw new Error(`GAS 回傳格式不正確：${raw.slice(0, 240)}`);
  }
}

function extractJson(raw) {
  if (!raw) return "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return "";
}

function readError(res) {
  if (!res || typeof res !== "object") return "";
  return text(res.error || res.message || res.msg || res.data?.message);
}

async function prepareImageForCrop(file) {
  const profile = getSmartProfile(file.size || 0);
  const arrayBuffer = await file.arrayBuffer();
  const orientation = getJpegOrientation(arrayBuffer);
  const rawDataUrl = await readFileAsDataURL(file);
  const original = await loadImage(rawDataUrl);

  const correctedCanvas = drawImageWithOrientation(original, orientation);
  const normalizedCanvas = shrinkCanvasIfNeeded(correctedCanvas, profile.maxLong, profile.maxShort);
  const previewBlob = await canvasToBlob(normalizedCanvas, "image/jpeg", profile.previewQuality);
  return { blob: previewBlob, profile };
}

function getSmartProfile(size) {
  if (size <= 1 * MB) return SMART_PROFILE.small;
  if (size <= 4 * MB) return SMART_PROFILE.medium;
  return SMART_PROFILE.large;
}

function shrinkCanvasIfNeeded(canvas, maxLong, maxShort) {
  const w = canvas.width, h = canvas.height;
  const longSide = Math.max(w, h);
  const shortSide = Math.min(w, h);
  if (longSide <= maxLong && shortSide <= maxShort) return canvas;

  const ratio = Math.min(maxLong / longSide, maxShort / shortSide);
  const targetW = Math.max(1, Math.round(w * ratio));
  const targetH = Math.max(1, Math.round(h * ratio));

  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, targetW, targetH);
  return out;
}

function drawImageWithOrientation(img, orientation) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if ([5, 6, 7, 8].includes(orientation)) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  switch (orientation) {
    case 2: ctx.translate(w, 0); ctx.scale(-1, 1); break;
    case 3: ctx.translate(w, h); ctx.rotate(Math.PI); break;
    case 4: ctx.translate(0, h); ctx.scale(1, -1); break;
    case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
    case 6: ctx.rotate(0.5 * Math.PI); ctx.translate(0, -h); break;
    case 7: ctx.rotate(0.5 * Math.PI); ctx.translate(w, -h); ctx.scale(-1, 1); break;
    case 8: ctx.rotate(-0.5 * Math.PI); ctx.translate(-w, 0); break;
    default: break;
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
}

function getJpegOrientation(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    if (view.getUint16(0, false) !== 0xFFD8) return 1;
    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xFFE1) {
        offset += 2;
        if (getString(view, offset, 4) !== "Exif") return 1;
        offset += 6;
        const little = view.getUint16(offset, false) === 0x4949;
        const firstIFDOffset = view.getUint32(offset + 4, little);
        offset += firstIFDOffset;
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (let i = 0; i < tags; i++) {
          const tagOffset = offset + i * 12;
          if (view.getUint16(tagOffset, little) === 0x0112) {
            return view.getUint16(tagOffset + 8, little);
          }
        }
        return 1;
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
    return 1;
  } catch {
    return 1;
  }
}

function getString(view, start, length) {
  let out = "";
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(start + i));
  return out;
}

async function loadImage(src) {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("圖片載入失敗"));
    img.src = src;
  });
}

async function readFileAsDataURL(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("讀取圖片失敗"));
    reader.readAsDataURL(file);
  });
}

async function canvasToBlob(canvas, type, quality) {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("圖片轉換失敗")), type, quality);
  });
}

function getFieldValue(id) {
  const node = document.getElementById(id);
  return node ? text(node.value) : "";
}

function setFieldValue(id, value) {
  const node = document.getElementById(id);
  if (node) node.value = value || "";
}

function setBusy(busy) {
  state.busy = !!busy;
  [
    el.prevBtn, el.nextBtn, el.btnSubmit, el.btnReset, el.btnTest,
    el.cropApply, el.cropCancel, el.cropCenter, el.cropReset, el.cropZoomIn, el.cropZoomOut
  ].forEach((node) => { if (node) node.disabled = !!busy; });
  document.querySelectorAll("[data-pick],[data-edit],[data-clear]").forEach((btn) => { btn.disabled = !!busy; });
}

function setProgress(percent, textMessage) {
  const n = Math.max(0, Math.min(100, Number(percent) || 0));
  if (el.progressWrap) el.progressWrap.style.display = "";
  if (el.progressFill) el.progressFill.style.width = `${n}%`;
  if (el.progressPercent) el.progressPercent.textContent = `${Math.round(n)}%`;
  if (el.progressText) el.progressText.textContent = textMessage || "";
  if (el.progressTitle) el.progressTitle.textContent = n >= 100 ? "完成" : "處理中";
}

function setStatus(message) {
  if (el.status) el.status.textContent = message || "";
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("show");
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("show");
  if (modal === el.cropModal) state.drag.active = false;
  const stillOpen = document.querySelector(".assistModal.show, .cropModal.show");
  if (!stillOpen) document.body.classList.remove("modal-open");
}

function autoGrow(node) {
  if (!node || node.tagName !== "TEXTAREA") return;
  node.style.height = "auto";
  node.style.height = `${Math.max(110, node.scrollHeight)}px`;
}

function toggleEl(node, show) {
  if (!node) return;
  node.style.display = show ? "" : "none";
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function text(v) {
  return v == null ? "" : String(v).trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
})();