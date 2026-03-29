import {
  initFirebase,
  ensureAuth,
  uploadAvatar,
  uploadLogo,
  uploadPhoto
} from "./firebase.js";

(() => {
  "use strict";

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const VERSION = "v7.2-single-marquee";
  const LINE_OA_URL = "https://lin.ee/G3VJoRm";
  const MB = 1024 * 1024;
  const MAX_ACCEPT_FILE_SIZE = 20 * MB;

  const SMART_PROFILE = {
    small: { maxLong: 1800, maxShort: 1800, previewQuality: 0.90, outputQuality: 0.88, label: "輕壓縮" },
    medium: { maxLong: 1500, maxShort: 1500, previewQuality: 0.86, outputQuality: 0.82, label: "中壓縮" },
    large: { maxLong: 1200, maxShort: 1200, previewQuality: 0.82, outputQuality: 0.76, label: "強壓縮" }
  };

  const TEXT_FIELDS = [
    "plan","color","style","paper","premium_color","name","unit","title","slogan","services","experience",
    "phone","email","line_url","line_oa","wechat_id","website","address","video1","video2","video3",
    "social1","social2","social3","cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3",
    "marquee_text"
  ];

  const PLAN_RULES = {
    free: { key: "free", label: "自由搭配款", maxPhotos: 2, maxCtas: 1, showFreeFields: true, showPremiumField: false },
    premium: { key: "premium", label: "精品設計款", maxPhotos: 5, maxCtas: 3, showFreeFields: false, showPremiumField: true }
  };

  const FIXED_SLOTS = {
    avatar: { slot: "avatar", label: "頭像", key: "avatar_url", previewId: "preview_avatar", statusId: "status_avatar", fileId: "file_avatar", cropShape: "square", targetWidth: 1200, targetHeight: 1200 },
    logo: { slot: "logo", label: "Logo", key: "logo_url", previewId: "preview_logo", statusId: "status_logo", fileId: "file_logo", cropShape: "square", targetWidth: 1200, targetHeight: 1200 }
  };

  const state = {
    id: "",
    token: "",
    loaded: false,
    busy: false,
    firebaseReady: false,
    card: null,
    plan: "free",
    rules: PLAN_RULES.free,
    photoLimit: 2,
    photoSlots: [],
    marquee: {
      hasEntitlement: false,
      enabled: false,
      text: ""
    },
    drag: { active: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 },
    cropper: {
      slot: "", image: null, imageUrl: "", sourceFile: null, sourceSize: 0, smartProfile: SMART_PROFILE.small,
      scale: 1, minScale: 1, offsetX: 0, offsetY: 0, viewportW: 0, viewportH: 0, imageW: 0, imageH: 0
    }
  };

  const el = {
    form: document.getElementById("updateForm"),
    statusBox: document.getElementById("statusBox"),

    plan: document.getElementById("plan"),
    color: document.getElementById("color"),
    style: document.getElementById("style"),
    paper: document.getElementById("paper"),
    premiumColor: document.getElementById("premium_color"),

    freeStyleFields: document.getElementById("freeStyleFields"),
    premiumColorField: document.getElementById("premiumColorField"),
    schemeHint: document.getElementById("schemeHint"),

    marqueeSection: document.getElementById("marqueeSection"),
    marqueeEnabled: document.getElementById("marquee_enabled"),
    marqueeText: document.getElementById("marquee_text"),

    btnSubmit: document.getElementById("btnSubmit"),
    btnReload: document.getElementById("btnReload"),
    btnTop: document.getElementById("btnTop"),

    progressWrap: document.getElementById("submitProgressWrap"),
    progressTitle: document.getElementById("submitProgressTitle"),
    progressPercent: document.getElementById("submitProgressPercent"),
    progressFill: document.getElementById("submitProgressFill"),
    progressText: document.getElementById("submitProgressText"),

    successBox: document.getElementById("successBox"),
    successId: document.getElementById("successId"),
    successCopyText: document.getElementById("successCopyText"),
    btnCopyReply: document.getElementById("btnCopyReply"),
    btnLineOA: document.getElementById("btnLineOA"),

    ctaRow2: document.getElementById("ctaRow2"),
    ctaRow2Link: document.getElementById("ctaRow2_link"),
    ctaRow3: document.getElementById("ctaRow3"),
    ctaRow3Link: document.getElementById("ctaRow3_link"),

    photoSlotsContainer: document.getElementById("photoSlotsContainer"),

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
    cropHint: document.getElementById("cropHint"),
    cropViewport: document.getElementById("cropViewport"),
    cropImage: document.getElementById("cropImage"),
    cropZoom: document.getElementById("cropZoom"),
    btnZoomOut: document.getElementById("btnZoomOut"),
    btnZoomIn: document.getElementById("btnZoomIn"),
    btnCenter: document.getElementById("btnCenter"),
    btnResetCrop: document.getElementById("btnResetCrop"),
    btnCancelCrop: document.getElementById("btnCancelCrop"),
    btnApplyCrop: document.getElementById("btnApplyCrop")
  };

  init().catch((err) => {
    console.error("[HSC update-form] init failed:", err);
    showStatus("bad", `初始化失敗：${err?.message || "未知錯誤"}`);
  });

  async function init() {
    state.token = text(getUrlParam("token") || getUrlParam("update_token"));

    bindBaseEvents();
    bindSuccessEvents();
    bindSchemeEvents();
    bindAssistModals();
    bindImageEvents();
    bindCropEvents();

    setProgress(0, "尚未送出");
    hideSuccess();
    hideMarqueeSection();

    if (!state.token) {
      showStatus("bad", "缺少更新連結資訊，請聯繫客服重新取得。");
      return;
    }

    await ensureFirebaseReady();
    await loadCard();
  }

  async function ensureFirebaseReady() {
    if (state.firebaseReady) return;
    initFirebase();
    await ensureAuth();
    state.firebaseReady = true;
  }

  function bindBaseEvents() {
    el.btnReload?.addEventListener("click", () => loadCard(true));
    el.btnTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    el.form?.addEventListener("submit", onSubmit);

    TEXT_FIELDS.forEach((id) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.addEventListener("input", () => autoGrow(node));
    });
  }

  function bindSuccessEvents() {
    el.btnCopyReply?.addEventListener("click", async () => {
      const reply = buildReplyText();
      try {
        await copyText(reply);
        showStatus("ok", `已複製客服回覆內容\n\n${reply}`);
      } catch {
        showStatus("warn", `請手動複製以下內容：\n\n${reply}`);
      }
    });

    el.btnLineOA?.addEventListener("click", () => {
      window.open(LINE_OA_URL, "_blank", "noopener,noreferrer");
    });
  }

  function bindSchemeEvents() {
    el.plan?.addEventListener("change", () => {
      const newPlan = normalizePlan(el.plan.value);
      if (newPlan === state.plan) return;

      const rules = PLAN_RULES[newPlan];
      let newPhotoLimit = state.photoLimit;
      if (state.photoLimit > rules.maxPhotos) {
        newPhotoLimit = rules.maxPhotos;
        showStatus("warn", `此方案最多只能放 ${rules.maxPhotos} 張照片，超出部分將被清除。`);
        for (let i = rules.maxPhotos + 1; i <= state.photoLimit; i++) {
          const slot = `photo${i}`;
          const cfg = getSlotConfig(slot);
          if (cfg) {
            setFieldValue(cfg.key, "");
            setSlotPreview(slot, "");
            setSlotStatus(slot, "未開放");
          }
        }
      }
      state.photoLimit = newPhotoLimit;
      state.plan = newPlan;
      state.rules = rules;

      rebuildPhotoSlots();
      applyPlanRules(state.plan, true);
    });

    el.color?.addEventListener("change", () => updateLivePreview());
    el.style?.addEventListener("change", () => updateLivePreview());
    el.paper?.addEventListener("change", () => updateLivePreview());
    el.premiumColor?.addEventListener("change", () => updateLivePreview());
    el.marqueeEnabled?.addEventListener("change", () => syncMarqueeInputState());
  }

  function rebuildPhotoSlots() {
    state.photoSlots = [];
    for (let i = 1; i <= state.photoLimit; i++) {
      state.photoSlots.push({
        slot: `photo${i}`,
        label: `照片 ${i}`,
        key: `photo${i}_url`,
        previewId: `preview_photo${i}`,
        statusId: `status_photo${i}`,
        fileId: `file_photo${i}`,
        cropShape: "wide",
        targetWidth: 1600,
        targetHeight: 1000
      });
    }

    if (el.photoSlotsContainer) {
      el.photoSlotsContainer.innerHTML = "";
      state.photoSlots.forEach((cfg) => {
        const card = createPhotoCard(cfg);
        el.photoSlotsContainer.appendChild(card);
      });
    }

    state.photoSlots.forEach((cfg) => {
      const fileInput = document.getElementById(cfg.fileId);
      if (fileInput) {
        fileInput.addEventListener("change", async (ev) => {
          const file = ev.target.files?.[0];
          if (!file) return;
          if (file.size > MAX_ACCEPT_FILE_SIZE) {
            fileInput.value = "";
            showStatus("bad", "圖片太大了，請選擇 20MB 以下的圖片。");
            return;
          }
          if (!isPhotoSlotAllowed(cfg.slot)) {
            fileInput.value = "";
            showStatus("warn", "目前這個方案沒有開放這個照片位置。");
            return;
          }
          try {
            await openCropper(cfg.slot, file);
          } catch (err) {
            console.error(`[HSC update-form] openCropper failed: ${cfg.slot}`, err);
            showStatus("bad", `圖片讀取失敗：${err?.message || "請重新選擇圖片"}`);
            fileInput.value = "";
          }
        });
      }
    });

    if (state.card) {
      state.photoSlots.forEach((cfg) => {
        const url = text(state.card[cfg.key]);
        setFieldValue(cfg.key, url);
        setSlotPreview(cfg.slot, url);
        setSlotStatus(cfg.slot, url ? "已載入" : "尚未設定");
      });
    }
  }

  function createPhotoCard(cfg) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "image-card";
    cardDiv.innerHTML = `
      <div class="image-card-head">
        <div class="image-card-title">${escapeHtml(cfg.label)}</div>
        <div class="image-card-status" id="${cfg.statusId}">未設定</div>
      </div>
      <div class="thumb-box wide">
        <img id="${cfg.previewId}" class="thumb-image" alt="${cfg.label}預覽" />
      </div>
      <div class="image-actions">
        <button type="button" class="btn btn-secondary" data-pick="${cfg.slot}">選圖</button>
        <button type="button" class="btn btn-secondary" data-edit="${cfg.slot}">重選</button>
        <button type="button" class="btn btn-danger" data-clear="${cfg.slot}">清除</button>
      </div>
      <input id="${cfg.key}" name="${cfg.key}" class="input sys-field" />
      <input id="${cfg.fileId}" class="file-input" type="file" accept="image/*" />
    `;
    return cardDiv;
  }

  function bindAssistModals() {
    const pairs = [
      [el.openGuideTopBtn, () => openModal(el.guideModal)],
      [el.openGuideBtn, () => openModal(el.guideModal)],
      [el.openFacadeTopBtn, () => openModal(el.facadeModal)],
      [el.openFacadeBtn, () => openModal(el.facadeModal)],
      [el.closeGuideBtn, () => closeModal(el.guideModal)],
      [el.guideConfirmBtn, () => closeModal(el.guideModal)],
      [el.closeFacadeBtn, () => closeModal(el.facadeModal)],
      [el.facadeBackBtn, () => closeModal(el.facadeModal)],
      [el.guideGoFacadeBtn, () => { closeModal(el.guideModal); openModal(el.facadeModal); }]
    ];
    pairs.forEach(([node, fn]) => node?.addEventListener("click", fn));

    [el.guideModal, el.facadeModal, el.cropModal].forEach((modal) => {
      modal?.addEventListener("click", (ev) => {
        if (ev.target === modal) closeModal(modal);
      });
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("show");
    document.body.classList.add("modal-open");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("show");
    const stillOpen = document.querySelector(".assist-modal.show, .crop-modal.show");
    if (!stillOpen) document.body.classList.remove("modal-open");
  }

  async function loadCard(isReload = false) {
    if (state.busy) return;

    setBusy(true);
    hideSuccess();
    hideMarqueeSection();
    setProgress(10, isReload ? "重新載入資料中…" : "載入資料中…");
    showStatus("warn", isReload ? "重新載入資料中…" : "載入資料中…");

    try {
      const url = new URL(GAS_URL);
      url.searchParams.set("action", "getCardForUpdate");
      url.searchParams.set("token", state.token);
      url.searchParams.set("_t", String(Date.now()));
      url.searchParams.set("_v", VERSION);

      const res = await fetchJson(url.toString());

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "資料載入失敗");
      }

      const card = res.card || res.data || {};
      state.card = card;
      state.loaded = true;
      state.id = text(card.id);
      if (text(card.update_token)) state.token = text(card.update_token);

      const plan = normalizePlan(card.plan || "free");
      const rules = PLAN_RULES[plan];
      let photoLimit = toNumber(card.photo_limit);
      if (photoLimit === 0 || isNaN(photoLimit)) photoLimit = rules.maxPhotos;
      photoLimit = Math.min(photoLimit, 10);

      state.photoLimit = photoLimit;
      state.plan = plan;
      state.rules = rules;

      rebuildPhotoSlots();
      applyPlanRules(plan, false);
      fillForm(card);
      await loadMarqueeState();

      el.form?.classList.remove("hidden");
      setProgress(100, "資料載入完成");
      showStatus("ok", `資料載入成功\n名片編號：${state.id || "-"}`);
    } catch (err) {
      console.error("[HSC update-form] loadCard failed:", err);
      state.loaded = false;
      el.form?.classList.add("hidden");
      setProgress(0, "載入失敗");
      showStatus("bad", `資料沒有正常載入。\n${err?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadMarqueeState() {
    state.marquee = { hasEntitlement: false, enabled: false, text: "" };
    if (!state.id) return;
    try {
      const data = await loadMarquee(state.id);
      if (data && data.ok && data.has_marquee) {
        state.marquee.hasEntitlement = true;
        state.marquee.enabled = !!data.marquee?.enabled;
        state.marquee.text = text(data.marquee?.marquee_text);
        showMarqueeSection();
        if (el.marqueeEnabled) el.marqueeEnabled.checked = state.marquee.enabled;
        if (el.marqueeText) {
          el.marqueeText.value = state.marquee.text;
          autoGrow(el.marqueeText);
        }
        syncMarqueeInputState();
      } else {
        hideMarqueeSection();
      }
    } catch (err) {
      console.warn("[HSC update-form] load marquee failed:", err);
      hideMarqueeSection();
    }
  }

  async function loadMarquee(cardId) {
    const url = new URL(GAS_URL);
    url.searchParams.set("action", "getCardMarquee");
    url.searchParams.set("id", cardId);
    url.searchParams.set("_t", String(Date.now()));
    return await fetchJson(url.toString());
  }

  function showMarqueeSection() {
    state.marquee.hasEntitlement = true;
    el.marqueeSection?.classList.remove("hidden");
  }

  function hideMarqueeSection() {
    state.marquee.hasEntitlement = false;
    el.marqueeSection?.classList.add("hidden");
    if (el.marqueeEnabled) el.marqueeEnabled.checked = false;
    if (el.marqueeText) el.marqueeText.value = "";
  }

  function syncMarqueeInputState() {
    if (!el.marqueeText || !el.marqueeEnabled) return;
    el.marqueeText.disabled = !el.marqueeEnabled.checked;
    if (!el.marqueeEnabled.checked && !text(el.marqueeText.value)) {
      el.marqueeText.placeholder = "未啟用跑馬燈";
    } else {
      el.marqueeText.placeholder = "例如：歡迎聯絡我｜健康手作麵包｜幸福從早餐開始";
    }
  }

  function normalizePlan(v) {
    return text(v).toLowerCase() === "premium" ? "premium" : "free";
  }

  function applyPlanRules(plan, updateSelectValue = true) {
    const rules = PLAN_RULES[plan];
    state.rules = rules;

    if (updateSelectValue && el.plan) el.plan.value = rules.key;

    toggleEl(el.freeStyleFields, rules.showFreeFields);
    toggleEl(el.premiumColorField, rules.showPremiumField);

    toggleEl(el.ctaRow2, rules.maxCtas >= 2);
    toggleEl(el.ctaRow2Link, rules.maxCtas >= 2);
    toggleEl(el.ctaRow3, rules.maxCtas >= 3);
    toggleEl(el.ctaRow3Link, rules.maxCtas >= 3);

    if (el.schemeHint) {
      el.schemeHint.textContent =
        rules.key === "premium"
          ? "目前為精品設計款：可放 5 張照片、3 個按鈕，並使用精品色。"
          : "目前為自由搭配款：可放 2 張照片、1 個按鈕，並可調整顏色、版型與紙感。";
    }

    if (rules.key === "free") {
      setFieldValue("premium_color", "");
      clearCtaFieldsFrom(2);
    } else {
      setFieldValue("color", "");
      setFieldValue("style", "");
      setFieldValue("paper", "");
    }
  }

  function clearCtaFieldsFrom(start) {
    for (let i = start; i <= 3; i++) {
      setFieldValue(`cta_text_${i}`, "");
      setFieldValue(`cta_link_${i}`, "");
    }
  }

  function fillForm(card) {
    TEXT_FIELDS.forEach((key) => {
      if (key === "marquee_text") return;
      const input = document.getElementById(key);
      if (!input) return;
      input.value = text(card[key]);
      autoGrow(input);
    });

    const plan = normalizePlan(card.plan || "free");

    if (plan === "premium") {
      setFieldValue("premium_color", card.color || "p1");
      setFieldValue("color", "");
      setFieldValue("style", "");
      setFieldValue("paper", "");
    } else {
      setFieldValue("color", card.color || "c1");
      setFieldValue("style", card.style || "s1");
      setFieldValue("paper", card.paper || "f1");
      setFieldValue("premium_color", "");
    }

    Object.values(FIXED_SLOTS).forEach((cfg) => {
      const url = text(card[cfg.key]);
      setFieldValue(cfg.key, url);
      setSlotPreview(cfg.slot, url);
      setSlotStatus(cfg.slot, url ? "已載入" : "尚未設定");
    });

    state.photoSlots.forEach((cfg) => {
      const url = text(card[cfg.key]);
      setFieldValue(cfg.key, url);
      setSlotPreview(cfg.slot, url);
      setSlotStatus(cfg.slot, url ? "已載入" : "尚未設定");
    });

    if (state.rules.maxCtas < 2) {
      setFieldValue("cta_text_2", "");
      setFieldValue("cta_link_2", "");
    }
    if (state.rules.maxCtas < 3) {
      setFieldValue("cta_text_3", "");
      setFieldValue("cta_link_3", "");
    }
  }

  function getSlotConfig(slot) {
    if (FIXED_SLOTS[slot]) return FIXED_SLOTS[slot];
    return state.photoSlots.find(s => s.slot === slot);
  }

  function bindImageEvents() {
    document.addEventListener("click", (ev) => {
      const pickBtn = ev.target.closest("[data-pick]");
      if (pickBtn) {
        const slot = pickBtn.getAttribute("data-pick");
        if (!isPhotoSlotAllowed(slot)) {
          showStatus("warn", "目前這個方案沒有開放這個照片位置。");
          return;
        }
        triggerFilePick(slot);
        return;
      }

      const editBtn = ev.target.closest("[data-edit]");
      if (editBtn) {
        const slot = editBtn.getAttribute("data-edit");
        if (!isPhotoSlotAllowed(slot)) {
          showStatus("warn", "目前這個方案沒有開放這個照片位置。");
          return;
        }
        triggerFilePick(slot);
        return;
      }

      const clearBtn = ev.target.closest("[data-clear]");
      if (clearBtn) {
        const slot = clearBtn.getAttribute("data-clear");
        if (!isPhotoSlotAllowed(slot)) {
          showStatus("warn", "目前這個方案沒有開放這個照片位置。");
          return;
        }
        clearSlot(slot);
      }
    });
  }

  function triggerFilePick(slot) {
    const cfg = getSlotConfig(slot);
    if (!cfg) return;
    const fileInput = document.getElementById(cfg.fileId);
    fileInput?.click();
  }

  function clearSlot(slot) {
    const cfg = getSlotConfig(slot);
    if (!cfg) return;
    const fileInput = document.getElementById(cfg.fileId);
    if (fileInput) fileInput.value = "";
    setFieldValue(cfg.key, "");
    setSlotPreview(slot, "");
    setSlotStatus(slot, isPhotoSlotAllowed(slot) ? "已清除，待送出" : "未開放");
    showStatus("warn", `${cfg.label} 已清除，請記得按「送出更新」。`);
  }

  function isPhotoSlotAllowed(slot) {
    if (slot === "avatar" || slot === "logo") return true;
    if (!slot.startsWith("photo")) return true;
    const idx = Number(slot.replace("photo", ""));
    return idx <= state.photoLimit;
  }

  function setSlotPreview(slot, url) {
    const cfg = getSlotConfig(slot);
    if (!cfg) return;
    const img = document.getElementById(cfg.previewId);
    if (!img) return;
    if (url) {
      img.src = url;
      img.style.display = "block";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
    }
  }

  function setSlotStatus(slot, msg) {
    const cfg = getSlotConfig(slot);
    if (!cfg) return;
    const node = document.getElementById(cfg.statusId);
    if (node) node.textContent = msg || "未設定";
  }

  async function openCropper(slot, file) {
    const cfg = getSlotConfig(slot);
    if (!cfg) throw new Error("找不到圖片欄位設定");

    await ensureFirebaseReady();

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
    state.cropper.sourceSize = file.size || 0;
    state.cropper.smartProfile = prepared.profile;
    state.cropper.imageW = img.naturalWidth || img.width;
    state.cropper.imageH = img.naturalHeight || img.height;
    state.cropper.targetWidth = cfg.targetWidth;
    state.cropper.targetHeight = cfg.targetHeight;

    el.cropTitle.textContent = `調整圖片：${cfg.label}`;
    if (el.cropHint) {
      el.cropHint.textContent =
        cfg.cropShape === "square"
          ? "拖曳可移動位置，也可以放大、縮小，再按套用。"
          : "可上下左右調整畫面，也可以放大、縮小，再按套用。";
    }

    el.cropViewport.classList.toggle("is-square", cfg.cropShape === "square");
    el.cropViewport.classList.toggle("is-wide", cfg.cropShape === "wide");

    openModal(el.cropModal);
    resetCropperView();
  }

  function resetCropperView() {
    const cp = state.cropper;
    if (!cp.image) return;

    const rect = el.cropViewport.getBoundingClientRect();
    cp.viewportW = Math.max(1, rect.width);
    cp.viewportH = Math.max(1, rect.height);

    const fitScale = Math.max(cp.viewportW / cp.imageW, cp.viewportH / cp.imageH);
    cp.minScale = fitScale;
    cp.scale = fitScale;
    cp.offsetX = 0;
    cp.offsetY = 0;

    if (el.cropZoom) {
      el.cropZoom.min = String(fitScale * 0.6);
      el.cropZoom.max = String(fitScale * 3);
      el.cropZoom.step = "0.01";
      el.cropZoom.value = String(fitScale);
    }

    if (el.cropImage) {
      el.cropImage.src = cp.image.src;
      renderCropImage();
    }
  }

  function renderCropImage() {
    const cp = state.cropper;
    if (!cp.image || !el.cropImage) return;

    clampOffsets();

    el.cropImage.style.width = `${cp.imageW * cp.scale}px`;
    el.cropImage.style.height = `${cp.imageH * cp.scale}px`;
    el.cropImage.style.transform = `translate(calc(-50% + ${cp.offsetX}px), calc(-50% + ${cp.offsetY}px))`;
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

  function bindCropEvents() {
    el.cropViewport?.addEventListener("pointerdown", (ev) => {
      if (!state.cropper.image) return;
      state.drag.active = true;
      state.drag.startX = ev.clientX;
      state.drag.startY = ev.clientY;
      state.drag.startOffsetX = state.cropper.offsetX;
      state.drag.startOffsetY = state.cropper.offsetY;
      el.cropViewport?.setPointerCapture?.(ev.pointerId);
    });

    window.addEventListener("pointermove", (ev) => {
      if (!state.drag.active || !state.cropper.image) return;
      const dx = ev.clientX - state.drag.startX;
      const dy = ev.clientY - state.drag.startY;
      state.cropper.offsetX = state.drag.startOffsetX + dx;
      state.cropper.offsetY = state.drag.startOffsetY + dy;
      renderCropImage();
    });

    window.addEventListener("pointerup", () => { state.drag.active = false; });

    el.btnZoomOut?.addEventListener("click", () => {
      const cp = state.cropper;
      if (!cp.image) return;
      cp.scale = clamp(cp.scale - Math.max(cp.minScale * 0.08, 0.04), cp.minScale * 0.6, cp.minScale * 3);
      if (el.cropZoom) el.cropZoom.value = String(cp.scale);
      renderCropImage();
    });

    el.btnZoomIn?.addEventListener("click", () => {
      const cp = state.cropper;
      if (!cp.image) return;
      cp.scale = clamp(cp.scale + Math.max(cp.minScale * 0.08, 0.04), cp.minScale * 0.6, cp.minScale * 3);
      if (el.cropZoom) el.cropZoom.value = String(cp.scale);
      renderCropImage();
    });

    el.cropZoom?.addEventListener("input", () => {
      const cp = state.cropper;
      if (!cp.image) return;
      cp.scale = clamp(Number(el.cropZoom.value || cp.minScale), cp.minScale * 0.6, cp.minScale * 3);
      renderCropImage();
    });

    el.btnCenter?.addEventListener("click", () => {
      state.cropper.offsetX = 0;
      state.cropper.offsetY = 0;
      renderCropImage();
    });

    el.btnResetCrop?.addEventListener("click", () => { resetCropperView(); });
    el.btnCancelCrop?.addEventListener("click", () => { closeModal(el.cropModal); });
    el.btnApplyCrop?.addEventListener("click", applyCropAndUpload);

    window.addEventListener("resize", () => {
      if (el.cropModal?.classList.contains("show") && state.cropper.image) resetCropperView();
    });
  }

  async function applyCropAndUpload() {
    const cp = state.cropper;
    const slot = cp.slot;
    const cfg = getSlotConfig(slot);

    if (!cp.image || !cfg) {
      showStatus("bad", "目前沒有可套用的圖片。");
      return;
    }

    if (!isPhotoSlotAllowed(slot)) {
      showStatus("warn", "目前這個方案沒有開放這張照片。");
      closeModal(el.cropModal);
      return;
    }

    try {
      setBusy(true);
      setSlotStatus(slot, "處理中…");
      showStatus("warn", `正在處理 ${cfg.label}…`);
      setProgress(18, `正在處理 ${cfg.label}…`);

      const blob = await renderCroppedBlob(slot);
      const url = await uploadBySlot(slot, blob);

      if (!url) throw new Error("沒有取得圖片網址");

      setFieldValue(cfg.key, url);
      setSlotPreview(slot, url);
      setSlotStatus(slot, "已完成");

      setProgress(100, `${cfg.label} 已更新`);
      showStatus("ok", `${cfg.label} 已更新完成。`);
      closeModal(el.cropModal);
    } catch (err) {
      console.error(`[HSC update-form] upload failed: ${slot}`, err);
      setSlotStatus(slot, "失敗");
      setProgress(0, "圖片更新失敗");
      showStatus("bad", `${cfg.label} 更新失敗：${err?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  async function renderCroppedBlob(slot) {
    const cp = state.cropper;
    const cfg = getSlotConfig(slot);

    const canvas = document.createElement("canvas");
    canvas.width = cfg.targetWidth;
    canvas.height = cfg.targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法建立 Canvas");

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
    if (slot === "avatar") return await uploadAvatar(state.id || "TMP", blob);
    if (slot === "logo") return await uploadLogo(state.id || "TMP", blob);
    if (slot.startsWith("photo")) {
      const idx = Number(slot.replace("photo", ""));
      return await uploadPhoto(state.id || "TMP", blob, idx);
    }
    throw new Error(`未知圖片欄位：${slot}`);
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    if (!state.loaded) {
      showStatus("bad", "資料尚未載入完成，暫時不能送出。");
      return;
    }
    if (state.busy) return;

    try {
      validateFormBeforeSubmit();
    } catch (err) {
      showStatus("bad", err.message || "請檢查欄位");
      return;
    }

    setBusy(true);
    hideSuccess();
    setProgress(8, "整理更新資料中…");
    showStatus("warn", "送出更新中…");

    try {
      const payload = collectPayload();

      setProgress(28, "送出更新資料到系統…");
      const res = await fetchJson(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "更新失敗");
      }

      setProgress(72, "主資料更新完成，處理跑馬燈中…");

      const nextToken = text(res.new_update_token || res.update_token);
      if (nextToken) {
        state.token = nextToken;
        updateTokenInUrl(nextToken);
      }

      if (state.marquee.hasEntitlement) {
        try {
          const marqueePayload = {
            action: "saveCardMarquee",
            card_id: state.id,
            enabled: !!el.marqueeEnabled?.checked,
            marquee_text: text(el.marqueeText?.value),
            tenant: "angel"
          };

          const marqueeRes = await fetchJson(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(marqueePayload)
          });

          if (!marqueeRes || marqueeRes.ok !== true) {
            showStatus("warn", `主資料已更新，但跑馬燈儲存失敗：${readError(marqueeRes) || "未知錯誤"}`);
          }
        } catch (err) {
          console.warn("[HSC update-form] marquee save failed:", err);
          showStatus("warn", `主資料已更新，但跑馬燈儲存失敗：${err?.message || "未知錯誤"}`);
        }
      }

      setProgress(100, "更新完成");
      showStatus("ok", "資料更新成功。");
      showSuccess();
    } catch (err) {
      console.error("[HSC update-form] submit failed:", err);
      setProgress(0, "送出失敗");
      showStatus("bad", `資料更新失敗：${err?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  function updateTokenInUrl(nextToken) {
    try {
      const url = new URL(location.href);
      url.searchParams.set("token", nextToken);
      url.searchParams.delete("update_token");
      history.replaceState({}, "", url.toString());
    } catch (err) {
      console.warn("[HSC update-form] updateTokenInUrl failed:", err);
    }
  }

  function validateFormBeforeSubmit() {
    const plan = normalizePlan(getFieldValue("plan"));
    if (!plan) throw new Error("請先選擇方案。");

    if (plan === "free") {
      if (!getFieldValue("color")) throw new Error("自由搭配款請選擇主色。");
      if (!getFieldValue("style")) throw new Error("自由搭配款請選擇版型。");
      if (!getFieldValue("paper")) throw new Error("自由搭配款請選擇紙感。");
    }

    if (plan === "premium") {
      if (!getFieldValue("premium_color")) throw new Error("精品設計款請選擇精品色。");
    }

    if (!getFieldValue("name")) throw new Error("請填寫姓名 / 品牌名稱。");

    const contactOk = [
      getFieldValue("phone"),
      getFieldValue("email"),
      getFieldValue("line_url"),
      getFieldValue("line_oa"),
      getFieldValue("wechat_id")
    ].some(Boolean);

    if (!contactOk) throw new Error("請至少填寫一種聯絡方式。");

    const maxCtas = state.rules.maxCtas;
    for (let i = 1; i <= maxCtas; i++) {
      const t = getFieldValue(`cta_text_${i}`);
      const l = getFieldValue(`cta_link_${i}`);
      if ((t && !l) || (!t && l)) {
        throw new Error(`第 ${i} 個按鈕請同時填寫文字與連結。`);
      }
    }

    if (state.marquee.hasEntitlement && el.marqueeEnabled?.checked) {
      const marqueeText = text(el.marqueeText?.value);
      if (marqueeText.length > 150) {
        throw new Error("跑馬燈內容最多 150 字。");
      }
    }
  }

  function collectPayload() {
    const plan = normalizePlan(getFieldValue("plan"));

    let color = "";
    let style = "";
    let paper = "";

    if (plan === "free") {
      color = getFieldValue("color");
      style = getFieldValue("style");
      paper = getFieldValue("paper");
    } else if (plan === "premium") {
      color = getFieldValue("premium_color");
      style = "";
      paper = "";
    }

    return {
      action: "updateCardByToken",
      token: state.token,
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
      cta_link_3: state.rules.maxCtas >= 3 ? getFieldValue("cta_link_3") : ""
    };
  }

  function buildReplyText() {
    return [
      "您好，我已完成天使幸福智慧名片資料更新。",
      "",
      `名片編號：${state.id || "-"}`,
      "",
      "再請協助確認，謝謝。"
    ].join("\n");
  }

  function showSuccess() {
    if (!el.successBox) return;
    if (el.successId) el.successId.textContent = state.id || "";
    if (el.successCopyText) {
      el.successCopyText.value = buildReplyText();
      autoGrow(el.successCopyText);
    }
    el.successBox.classList.remove("hidden");
  }

  function hideSuccess() {
    el.successBox?.classList.add("hidden");
  }

  function getFieldValue(id) {
    const input = document.getElementById(id);
    return input ? text(input.value) : "";
  }

  function setFieldValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value || "";
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
    const w = canvas.width;
    const h = canvas.height;
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
            const tag = view.getUint16(tagOffset, little);
            if (tag === 0x0112) return view.getUint16(tagOffset + 8, little);
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

  function autoGrow(node) {
    if (!node || node.tagName !== "TEXTAREA") return;
    node.style.height = "auto";
    node.style.height = `${Math.max(110, node.scrollHeight)}px`;
  }

  function setBusy(busy) {
    state.busy = !!busy;
    if (el.btnSubmit) el.btnSubmit.disabled = !!busy;
    if (el.btnReload) el.btnReload.disabled = !!busy;
    if (el.btnApplyCrop) el.btnApplyCrop.disabled = !!busy;

    document.querySelectorAll("[data-pick],[data-edit],[data-clear]").forEach((btn) => {
      btn.disabled = !!busy;
    });
  }

  function setProgress(percent, textMessage) {
    const n = Math.max(0, Math.min(100, Number(percent) || 0));
    if (el.progressWrap) el.progressWrap.style.display = "";
    if (el.progressFill) el.progressFill.style.width = `${n}%`;
    if (el.progressPercent) el.progressPercent.textContent = `${Math.round(n)}%`;
    if (el.progressText) el.progressText.textContent = textMessage || "";
    if (el.progressTitle) el.progressTitle.textContent = n >= 100 ? "完成" : "處理中";
  }

  function showStatus(type, message) {
    if (!el.statusBox) return;
    el.statusBox.className = `status show ${type || "warn"}`;
    el.statusBox.textContent = message || "";
  }

  function getUrlParam(name) {
    return new URL(location.href).searchParams.get(name) || "";
  }

  function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }
  function text(v) { return v == null ? "" : String(v).trim(); }
  function toNumber(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

  async function copyText(value) {
    const v = String(value || "");
    if (!v) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(v);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = v;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function toggleEl(node, show) {
    if (!node) return;
    node.classList.toggle("hidden", !show);
    node.style.display = show ? "" : "none";
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

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
