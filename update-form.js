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

  const VERSION = "804.5-full";
  const LINE_OA_URL = "https://lin.ee/G3VJoRm";

  const MB = 1024 * 1024;
  const MAX_ACCEPT_FILE_SIZE = 20 * MB;

  const SMART_PROFILE = {
    small: {
      maxLong: 1800,
      maxShort: 1800,
      previewQuality: 0.90,
      outputQuality: 0.88,
      label: "輕壓縮"
    },
    medium: {
      maxLong: 1500,
      maxShort: 1500,
      previewQuality: 0.86,
      outputQuality: 0.82,
      label: "中壓縮"
    },
    large: {
      maxLong: 1200,
      maxShort: 1200,
      previewQuality: 0.82,
      outputQuality: 0.76,
      label: "強壓縮"
    }
  };

  const TEXT_FIELDS = [
    "plan",
    "color",
    "style",
    "paper",
    "premium_color",
    "name",
    "unit",
    "title",
    "slogan",
    "services",
    "experience",
    "phone",
    "email",
    "line_url",
    "line_oa",
    "wechat_id",
    "website",
    "address",
    "video1",
    "video2",
    "video3",
    "social1",
    "social2",
    "social3",
    "cta_text_1",
    "cta_link_1",
    "cta_text_2",
    "cta_link_2",
    "cta_text_3",
    "cta_link_3"
  ];

  const IMAGE_FIELDS = [
    "avatar_url",
    "logo_url",
    "photo1_url",
    "photo2_url",
    "photo3_url",
    "photo4_url",
    "photo5_url"
  ];

  const PLAN_RULES = {
    free: {
      key: "free",
      label: "自由搭配款",
      maxPhotos: 2,
      maxCtas: 1,
      showFreeFields: true,
      showPremiumField: false
    },
    premium: {
      key: "premium",
      label: "精品設計款",
      maxPhotos: 5,
      maxCtas: 3,
      showFreeFields: false,
      showPremiumField: true
    }
  };

  const IMAGE_SLOTS = {
    avatar: {
      slot: "avatar",
      label: "頭像",
      key: "avatar_url",
      previewId: "preview_avatar",
      statusId: "status_avatar",
      fileId: "file_avatar",
      cropShape: "square",
      targetWidth: 1200,
      targetHeight: 1200,
      fallback: ["avatar_url", "avatar_img_fast", "avatar_img"]
    },
    logo: {
      slot: "logo",
      label: "Logo",
      key: "logo_url",
      previewId: "preview_logo",
      statusId: "status_logo",
      fileId: "file_logo",
      cropShape: "square",
      targetWidth: 1200,
      targetHeight: 1200,
      fallback: ["logo_url", "logo_img_fast", "logo_img"]
    },
    photo1: {
      slot: "photo1",
      label: "照片 1",
      key: "photo1_url",
      previewId: "preview_photo1",
      statusId: "status_photo1",
      fileId: "file_photo1",
      cropShape: "wide",
      targetWidth: 1600,
      targetHeight: 1000,
      fallback: ["photo1_url", "photo1_img_fast", "photo1_img"]
    },
    photo2: {
      slot: "photo2",
      label: "照片 2",
      key: "photo2_url",
      previewId: "preview_photo2",
      statusId: "status_photo2",
      fileId: "file_photo2",
      cropShape: "wide",
      targetWidth: 1600,
      targetHeight: 1000,
      fallback: ["photo2_url", "photo2_img_fast", "photo2_img"]
    },
    photo3: {
      slot: "photo3",
      label: "照片 3",
      key: "photo3_url",
      previewId: "preview_photo3",
      statusId: "status_photo3",
      fileId: "file_photo3",
      cropShape: "wide",
      targetWidth: 1600,
      targetHeight: 1000,
      fallback: ["photo3_url", "photo3_img_fast", "photo3_img"]
    },
    photo4: {
      slot: "photo4",
      label: "照片 4",
      key: "photo4_url",
      previewId: "preview_photo4",
      statusId: "status_photo4",
      fileId: "file_photo4",
      cropShape: "wide",
      targetWidth: 1600,
      targetHeight: 1000,
      fallback: ["photo4_url", "photo4_img_fast", "photo4_img"]
    },
    photo5: {
      slot: "photo5",
      label: "照片 5",
      key: "photo5_url",
      previewId: "preview_photo5",
      statusId: "status_photo5",
      fileId: "file_photo5",
      cropShape: "wide",
      targetWidth: 1600,
      targetHeight: 1000,
      fallback: ["photo5_url", "photo5_img_fast", "photo5_img"]
    }
  };

  const state = {
    id: "",
    utoken: "",
    loaded: false,
    busy: false,
    firebaseReady: false,
    card: null,
    plan: "free",
    rules: PLAN_RULES.free,
    drag: {
      active: false,
      startX: 0,
      startY: 0,
      startOffsetX: 0,
      startOffsetY: 0
    },
    cropper: {
      slot: "",
      image: null,
      imageUrl: "",
      sourceFile: null,
      sourceSize: 0,
      smartProfile: SMART_PROFILE.small,
      scale: 1,
      minScale: 1,
      offsetX: 0,
      offsetY: 0,
      viewportW: 0,
      viewportH: 0,
      imageW: 0,
      imageH: 0
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

    photoCard3: document.getElementById("photoCard3"),
    photoCard4: document.getElementById("photoCard4"),
    photoCard5: document.getElementById("photoCard5"),

    cropModal: document.getElementById("cropModal"),
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
    const qs = new URLSearchParams(location.search);
    state.id = text(qs.get("id")).toUpperCase();
    state.utoken = text(qs.get("utoken"));

    bindBaseEvents();
    bindSuccessEvents();
    bindSchemeEvents();
    bindImageEvents();
    bindCropEvents();

    setProgress(0, "尚未送出");
    hideSuccess();

    if (!state.id || !state.utoken) {
      showStatus("bad", "缺少更新參數 id 或 utoken。\n請聯繫客服重新取得更新連結。");
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

    el.btnTop?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    el.form?.addEventListener("submit", onSubmit);

    TEXT_FIELDS.forEach((id) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.addEventListener("input", () => {
        autoGrow(node);
      });
    });
  }

  function bindSuccessEvents() {
    el.btnCopyReply?.addEventListener("click", async () => {
      const reply = buildReplyText();
      try {
        await copyText(reply);
        showStatus("ok", `已複製客服回覆內容\n\n${reply}`);
      } catch (_err) {
        showStatus("warn", `請手動複製以下內容：\n\n${reply}`);
      }
    });

    el.btnLineOA?.addEventListener("click", () => {
      window.open(LINE_OA_URL, "_blank", "noopener,noreferrer");
    });
  }

  function bindSchemeEvents() {
    el.plan?.addEventListener("change", () => {
      const plan = normalizePlan(el.plan.value);
      applyPlanRules(plan, true);
    });
  }

  function bindImageEvents() {
    document.addEventListener("click", (ev) => {
      const pickBtn = ev.target.closest("[data-pick]");
      if (pickBtn) {
        const slot = pickBtn.getAttribute("data-pick");
        if (!isPhotoSlotAllowed(slot)) {
          showStatus("warn", "此方案目前未開放這張照片欄位。");
          return;
        }
        triggerFilePick(slot);
        return;
      }

      const editBtn = ev.target.closest("[data-edit]");
      if (editBtn) {
        const slot = editBtn.getAttribute("data-edit");
        if (!isPhotoSlotAllowed(slot)) {
          showStatus("warn", "此方案目前未開放這張照片欄位。");
          return;
        }
        triggerFilePick(slot);
        return;
      }

      const clearBtn = ev.target.closest("[data-clear]");
      if (clearBtn) {
        const slot = clearBtn.getAttribute("data-clear");
        if (!isPhotoSlotAllowed(slot)) {
          showStatus("warn", "此方案目前未開放這張照片欄位。");
          return;
        }
        clearSlot(slot);
      }
    });

    Object.keys(IMAGE_SLOTS).forEach((slot) => {
      const fileInput = document.getElementById(IMAGE_SLOTS[slot].fileId);
      if (!fileInput) return;

      fileInput.addEventListener("change", async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_ACCEPT_FILE_SIZE) {
          fileInput.value = "";
          showStatus("bad", "圖片過大，請選擇 20MB 以下圖片。");
          return;
        }

        if (!isPhotoSlotAllowed(slot)) {
          fileInput.value = "";
          showStatus("warn", "此方案目前未開放這張照片欄位。");
          return;
        }

        try {
          await openCropper(slot, file);
        } catch (err) {
          console.error(`[HSC update-form] openCropper failed: ${slot}`, err);
          showStatus("bad", `圖片讀取失敗：${err?.message || "請重新選擇圖片"}`);
          fileInput.value = "";
        }
      });
    });
  }

  function bindCropEvents() {
    el.btnCancelCrop?.addEventListener("click", closeCropper);
    el.btnZoomOut?.addEventListener("click", () => adjustZoom(-0.05));
    el.btnZoomIn?.addEventListener("click", () => adjustZoom(0.05));
    el.btnCenter?.addEventListener("click", centerCropImage);
    el.btnResetCrop?.addEventListener("click", resetCropperView);
    el.btnApplyCrop?.addEventListener("click", applyCropAndUpload);

    el.cropZoom?.addEventListener("input", () => {
      const nextScale = Number(el.cropZoom.value || 1);
      setScale(nextScale);
    });

    el.cropViewport?.addEventListener("pointerdown", onCropPointerDown);
    window.addEventListener("pointermove", onCropPointerMove);
    window.addEventListener("pointerup", onCropPointerUp);
    window.addEventListener("pointercancel", onCropPointerUp);

    el.cropModal?.addEventListener("click", (ev) => {
      if (ev.target === el.cropModal) closeCropper();
    });

    window.addEventListener("resize", () => {
      if (el.cropModal?.classList.contains("show") && state.cropper.image) {
        resetCropperView();
      }
    });
  }

  async function loadCard(isReload = false) {
    if (state.busy) return;

    setBusy(true);
    hideSuccess();
    setProgress(10, isReload ? "重新載入資料中…" : "載入資料中…");
    showStatus("warn", isReload ? "重新載入資料中…" : "載入資料中…");

    try {
      const url = new URL(GAS_URL);
      url.searchParams.set("action", "getCardForUpdate");
      url.searchParams.set("id", state.id);
      url.searchParams.set("utoken", state.utoken);
      url.searchParams.set("_t", String(Date.now()));
      url.searchParams.set("_v", VERSION);

      const res = await fetchJson(url.toString());

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "資料載入失敗");
      }

      const card = res.data || {};
      state.card = card;
      state.loaded = true;

      const plan = normalizePlan(card.plan || "free");
      applyPlanRules(plan, false);
      fillForm(card);

      el.form?.classList.remove("hidden");
      setProgress(100, "資料載入完成");
      showStatus("ok", `資料載入成功\n名片編號：${state.id}`);
    } catch (err) {
      console.error("[HSC update-form] loadCard failed:", err);
      state.loaded = false;
      el.form?.classList.add("hidden");
      setProgress(0, "載入失敗");
      showStatus(
        "bad",
        [
          "資料沒有正常載入。",
          err?.message || "未知錯誤",
          "",
          "請檢查：",
          "1. update-form.js 是否為最新完整覆蓋版",
          "2. update-form.html 是否為 module 版本",
          "3. Firebase / GAS 是否為最新部署",
          "4. 連結中的 id / utoken 是否正確"
        ].join("\n")
      );
    } finally {
      setBusy(false);
    }
  }

  function normalizePlan(v) {
    return text(v).toLowerCase() === "premium" ? "premium" : "free";
  }

  function getPlanRules(plan) {
    return PLAN_RULES[normalizePlan(plan)] || PLAN_RULES.free;
  }

  function applyPlanRules(plan, updateSelectValue = true) {
    const rules = getPlanRules(plan);
    state.plan = rules.key;
    state.rules = rules;

    if (updateSelectValue && el.plan) {
      el.plan.value = rules.key;
    }

    toggleEl(el.freeStyleFields, rules.showFreeFields);
    toggleEl(el.premiumColorField, rules.showPremiumField);

    toggleEl(el.ctaRow2, rules.maxCtas >= 2);
    toggleEl(el.ctaRow2Link, rules.maxCtas >= 2);
    toggleEl(el.ctaRow3, rules.maxCtas >= 3);
    toggleEl(el.ctaRow3Link, rules.maxCtas >= 3);

    toggleEl(el.photoCard3, rules.maxPhotos >= 3);
    toggleEl(el.photoCard4, rules.maxPhotos >= 4);
    toggleEl(el.photoCard5, rules.maxPhotos >= 5);

    if (el.schemeHint) {
      el.schemeHint.textContent =
        rules.key === "premium"
          ? "目前為精品設計款：支援 5 張照片、3 個 CTA，畫面只顯示 7 色。"
          : "目前為自由搭配款：支援 2 張照片、1 個 CTA，可選 5 色 / 3 版 / 3 紙。";
    }

    if (rules.key === "free") {
      setFieldValue("premium_color", "");
      clearCtaFieldsFrom(2);
      clearPhotoFieldsFrom(3);
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

  function clearPhotoFieldsFrom(start) {
    for (let i = start; i <= 5; i++) {
      const slot = `photo${i}`;
      const key = `${slot}_url`;
      setFieldValue(key, "");
      setSlotPreview(slot, "");
      setSlotStatus(slot, "未開放");
    }
  }

  function fillForm(card) {
    TEXT_FIELDS.forEach((key) => {
      const input = document.getElementById(key);
      if (!input) return;
      input.value = text(card[key]);
      autoGrow(input);
    });

    setFieldValue("premium_color", text(card.premium_color));

    Object.keys(IMAGE_SLOTS).forEach((slot) => {
      const cfg = IMAGE_SLOTS[slot];
      const url = pickFirstImage(card, cfg.fallback);

      const hiddenInput = document.getElementById(cfg.key);
      if (hiddenInput) hiddenInput.value = url;

      setSlotPreview(slot, url);
      setSlotStatus(slot, url ? "已載入既有圖片" : "未設定");
    });

    if (state.rules.maxCtas < 2) {
      setFieldValue("cta_text_2", "");
      setFieldValue("cta_link_2", "");
    }
    if (state.rules.maxCtas < 3) {
      setFieldValue("cta_text_3", "");
      setFieldValue("cta_link_3", "");
    }

    if (state.rules.maxPhotos < 3) {
      setFieldValue("photo3_url", "");
      setSlotPreview("photo3", "");
      setSlotStatus("photo3", "未開放");
    }
    if (state.rules.maxPhotos < 4) {
      setFieldValue("photo4_url", "");
      setSlotPreview("photo4", "");
      setSlotStatus("photo4", "未開放");
    }
    if (state.rules.maxPhotos < 5) {
      setFieldValue("photo5_url", "");
      setSlotPreview("photo5", "");
      setSlotStatus("photo5", "未開放");
    }
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
      const body = JSON.stringify(payload);

      setProgress(28, "送出更新資料到 GAS…");

      const res = await fetchJson(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body
      });

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "更新失敗");
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

  function validateFormBeforeSubmit() {
    const plan = normalizePlan(getFieldValue("plan"));
    if (!plan) {
      throw new Error("請先選擇方案。");
    }

    const name = getFieldValue("name");
    if (!name) {
      throw new Error("請填寫姓名 / 品牌名稱。");
    }

    const contactOk = [
      getFieldValue("phone"),
      getFieldValue("email"),
      getFieldValue("line_url"),
      getFieldValue("line_oa"),
      getFieldValue("wechat_id")
    ].some(Boolean);

    if (!contactOk) {
      throw new Error("請至少填寫一種聯絡方式。");
    }

    const maxCtas = getPlanRules(plan).maxCtas;
    for (let i = 1; i <= maxCtas; i++) {
      const t = getFieldValue(`cta_text_${i}`);
      const l = getFieldValue(`cta_link_${i}`);
      if ((t && !l) || (!t && l)) {
        throw new Error(`CTA ${i} 需同時填寫文字與連結。`);
      }
    }
  }

  function collectPayload() {
    const plan = normalizePlan(getFieldValue("plan"));
    const rules = getPlanRules(plan);

    const out = {
      action: "updateCardByToken",
      id: state.id,
      utoken: state.utoken,
      plan,
      color: plan === "free" ? getFieldValue("color") : "",
      style: plan === "free" ? getFieldValue("style") : "",
      paper: plan === "free" ? getFieldValue("paper") : "",
      premium_color: plan === "premium" ? getFieldValue("premium_color") : "",
      form_version: VERSION,
      source: "update_form"
    };

    TEXT_FIELDS.forEach((key) => {
      if (["plan", "color", "style", "paper", "premium_color"].includes(key)) return;

      if (rules.maxCtas === 1 && [
        "cta_text_2", "cta_link_2", "cta_text_3", "cta_link_3"
      ].includes(key)) {
        out[key] = "";
        return;
      }

      if (rules.maxCtas === 2 && [
        "cta_text_3", "cta_link_3"
      ].includes(key)) {
        out[key] = "";
        return;
      }

      out[key] = getFieldValue(key);
    });

    IMAGE_FIELDS.forEach((key) => {
      const photoNum = getPhotoNumberFromKey(key);
      if (photoNum && photoNum > rules.maxPhotos) {
        out[key] = "";
        return;
      }
      out[key] = getFieldValue(key);
    });

    return out;
  }

  function triggerFilePick(slot) {
    if (!IMAGE_SLOTS[slot]) return;
    const fileInput = document.getElementById(IMAGE_SLOTS[slot].fileId);
    fileInput?.click();
  }

  async function openCropper(slot, file) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) throw new Error("找不到圖片欄位設定");

    await ensureFirebaseReady();

    const prepared = await prepareImageForCrop(file);

    if (state.cropper.imageUrl) {
      try {
        URL.revokeObjectURL(state.cropper.imageUrl);
      } catch (_) {}
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

    el.cropTitle.textContent = `裁切圖片：${cfg.label}`;
    if (el.cropHint) {
      el.cropHint.textContent =
        cfg.cropShape === "square"
          ? `拖曳可移動圖片，使用縮放調整構圖，按「套用並上傳」即會直接寫入 Firebase。\n智慧壓縮：${prepared.profile.label}`
          : `可左右上下拖移圖片，並使用縮放調整構圖，按「套用並上傳」即會直接寫入 Firebase。\n智慧壓縮：${prepared.profile.label}`;
    }

    el.cropViewport.classList.toggle("is-square", cfg.cropShape === "square");
    el.cropViewport.classList.toggle("is-wide", cfg.cropShape === "wide");

    openCropModal();
    resetCropperView();
  }

  function openCropModal() {
    el.cropModal?.classList.add("show");
    document.body.classList.add("modal-open");
  }

  function closeCropper() {
    el.cropModal?.classList.remove("show");
    document.body.classList.remove("modal-open");
    state.drag.active = false;

    const slot = state.cropper.slot;
    if (slot && IMAGE_SLOTS[slot]) {
      const fileInput = document.getElementById(IMAGE_SLOTS[slot].fileId);
      if (fileInput) fileInput.value = "";
    }

    if (state.cropper.imageUrl) {
      try {
        URL.revokeObjectURL(state.cropper.imageUrl);
      } catch (_) {}
    }

    state.cropper.slot = "";
    state.cropper.image = null;
    state.cropper.imageUrl = "";
    state.cropper.sourceFile = null;
    state.cropper.sourceSize = 0;
    state.cropper.smartProfile = SMART_PROFILE.small;
    state.cropper.scale = 1;
    state.cropper.minScale = 1;
    state.cropper.offsetX = 0;
    state.cropper.offsetY = 0;
    state.cropper.viewportW = 0;
    state.cropper.viewportH = 0;
    state.cropper.imageW = 0;
    state.cropper.imageH = 0;

    if (el.cropImage) {
      el.cropImage.src = "";
      el.cropImage.style.transform = "";
      el.cropImage.style.width = "";
      el.cropImage.style.height = "";
    }
  }

  function resetCropperView() {
    const cp = state.cropper;
    const cfg = IMAGE_SLOTS[cp.slot];
    if (!cp.image || !cfg) return;

    const rect = el.cropViewport.getBoundingClientRect();
    cp.viewportW = Math.max(1, rect.width);
    cp.viewportH = Math.max(1, rect.height);

    const baseScale = Math.max(
      cp.viewportW / cp.imageW,
      cp.viewportH / cp.imageH
    );

    cp.minScale = baseScale;
    cp.scale = baseScale;
    cp.offsetX = 0;
    cp.offsetY = 0;

    if (el.cropZoom) {
      el.cropZoom.min = String(baseScale);
      el.cropZoom.max = String(baseScale * 3);
      el.cropZoom.step = "0.01";
      el.cropZoom.value = String(baseScale);
    }

    if (el.cropImage) {
      el.cropImage.src = cp.image.src;
      renderCropImage();
    }
  }

  function centerCropImage() {
    state.cropper.offsetX = 0;
    state.cropper.offsetY = 0;
    renderCropImage();
  }

  function adjustZoom(delta) {
    const cp = state.cropper;
    if (!cp.image) return;
    const next = clamp(cp.scale + delta, cp.minScale, cp.minScale * 3);
    setScale(next);
  }

  function setScale(nextScale) {
    const cp = state.cropper;
    if (!cp.image) return;

    cp.scale = clamp(nextScale, cp.minScale, cp.minScale * 3);
    clampOffsets();

    if (el.cropZoom) {
      el.cropZoom.value = String(cp.scale);
    }

    renderCropImage();
  }

  function renderCropImage() {
    const cp = state.cropper;
    if (!cp.image || !el.cropImage) return;

    clampOffsets();

    el.cropImage.style.width = `${cp.imageW * cp.scale}px`;
    el.cropImage.style.height = `${cp.imageH * cp.scale}px`;
    el.cropImage.style.transform =
      `translate(calc(-50% + ${cp.offsetX}px), calc(-50% + ${cp.offsetY}px))`;
  }

  function clampOffsets() {
    const cp = state.cropper;
    if (!cp.image) return;

    const drawW = cp.imageW * cp.scale;
    const drawH = cp.imageH * cp.scale;

    const maxX = Math.max(0, (drawW - cp.viewportW) / 2);
    const maxY = Math.max(0, (drawH - cp.viewportH) / 2);

    cp.offsetX = clamp(cp.offsetX, -maxX, maxX);
    cp.offsetY = clamp(cp.offsetY, -maxY, maxY);
  }

  function onCropPointerDown(ev) {
    if (!state.cropper.image) return;
    state.drag.active = true;
    state.drag.startX = ev.clientX;
    state.drag.startY = ev.clientY;
    state.drag.startOffsetX = state.cropper.offsetX;
    state.drag.startOffsetY = state.cropper.offsetY;
    el.cropViewport?.setPointerCapture?.(ev.pointerId);
  }

  function onCropPointerMove(ev) {
    if (!state.drag.active || !state.cropper.image) return;

    const dx = ev.clientX - state.drag.startX;
    const dy = ev.clientY - state.drag.startY;

    state.cropper.offsetX = state.drag.startOffsetX + dx;
    state.cropper.offsetY = state.drag.startOffsetY + dy;
    renderCropImage();
  }

  function onCropPointerUp() {
    state.drag.active = false;
  }

  async function applyCropAndUpload() {
    const cp = state.cropper;
    const slot = cp.slot;
    const cfg = IMAGE_SLOTS[slot];

    if (!cp.image || !cfg) {
      showStatus("bad", "目前沒有可套用的圖片。");
      return;
    }

    if (!isPhotoSlotAllowed(slot)) {
      showStatus("warn", "此方案目前未開放這張照片欄位。");
      closeCropper();
      return;
    }

    try {
      setBusy(true);
      setSlotStatus(slot, "裁切完成，準備上傳…");
      showStatus("warn", `上傳中：${cfg.label}…`);
      setProgress(18, `處理圖片：${cfg.label}…`);

      const blob = await renderCroppedBlob(slot);
      const url = await uploadBySlot(slot, blob);

      if (!url) {
        throw new Error("Firebase 未回傳 downloadURL");
      }

      setFieldValue(cfg.key, url);
      setSlotPreview(slot, url);
      setSlotStatus(slot, "已上傳成功");

      setProgress(100, `${cfg.label} 已更新完成`);
      showStatus("ok", `${cfg.label} 已更新完成。`);
      closeCropper();
    } catch (err) {
      console.error(`[HSC update-form] upload failed: ${slot}`, err);
      setSlotStatus(slot, "上傳失敗");
      setProgress(0, "圖片上傳失敗");
      showStatus("bad", `${cfg.label} 上傳失敗：${err?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  async function renderCroppedBlob(slot) {
    const cp = state.cropper;
    const cfg = IMAGE_SLOTS[slot];

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
    if (slot === "avatar") return await uploadAvatar(state.id, blob);
    if (slot === "logo") return await uploadLogo(state.id, blob);
    if (slot.startsWith("photo")) {
      const idx = Number(slot.replace("photo", ""));
      return await uploadPhoto(state.id, blob, idx);
    }
    throw new Error(`未知圖片欄位：${slot}`);
  }

  function clearSlot(slot) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) return;

    const fileInput = document.getElementById(cfg.fileId);
    if (fileInput) fileInput.value = "";

    setFieldValue(cfg.key, "");
    setSlotPreview(slot, "");
    setSlotStatus(slot, isPhotoSlotAllowed(slot) ? "已清除，待送出保存" : "未開放");
    showStatus("warn", `${cfg.label} 已清除，請記得按「送出更新」。`);
  }

  function isPhotoSlotAllowed(slot) {
    if (slot === "avatar" || slot === "logo") return true;
    if (!slot.startsWith("photo")) return true;
    const idx = Number(slot.replace("photo", ""));
    return idx <= state.rules.maxPhotos;
  }

  function setSlotPreview(slot, url) {
    const cfg = IMAGE_SLOTS[slot];
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
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) return;
    const node = document.getElementById(cfg.statusId);
    if (node) node.textContent = msg || "未設定";
  }

  function showStatus(type, message) {
    if (!el.statusBox) return;
    el.statusBox.className = `status show ${type || "warn"}`;
    el.statusBox.textContent = message || "";
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
    if (el.progressTitle) el.progressTitle.textContent = n >= 100 ? "處理完成" : "送出中";
  }

  function showSuccess() {
    if (!el.successBox) return;
    if (el.successId) el.successId.textContent = state.id || "";
    if (el.successCopyText) {
      el.successCopyText.value = buildReplyText();
      autoGrow(el.successCopyText);
    }
    el.successBox.classList.remove("hidden");

    setTimeout(() => {
      el.successBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function hideSuccess() {
    el.successBox?.classList.add("hidden");
  }

  function buildReplyText() {
    return [
      "您好，我已完成天使幸福智慧名片資料更新。",
      "",
      `我的名片編號：${state.id || "-"}`,
      "",
      "請協助我確認與後續開通，謝謝。"
    ].join("\n");
  }

  function getFieldValue(id) {
    const input = document.getElementById(id);
    return input ? text(input.value) : "";
  }

  function setFieldValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value || "";
  }

  function pickFirstImage(card, keys) {
    for (const k of keys) {
      const v = text(card[k]);
      if (v) return v;
    }
    return "";
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
    } catch (_err) {
      const cleaned = extractJson(raw);
      if (cleaned) return JSON.parse(cleaned);
      throw new Error(`GAS 回傳非有效 JSON：${raw.slice(0, 240)}`);
    }
  }

  function extractJson(raw) {
    if (!raw) return "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return raw.slice(start, end + 1);
    }
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
    const normalizedCanvas = shrinkCanvasIfNeeded(
      correctedCanvas,
      profile.maxLong,
      profile.maxShort
    );

    const previewBlob = await canvasToBlob(
      normalizedCanvas,
      "image/jpeg",
      profile.previewQuality
    );

    return {
      blob: previewBlob,
      profile
    };
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
      case 2:
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        ctx.translate(w, h);
        ctx.rotate(Math.PI);
        break;
      case 4:
        ctx.translate(0, h);
        ctx.scale(1, -1);
        break;
      case 5:
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -h);
        break;
      case 7:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(w, -h);
        ctx.scale(-1, 1);
        break;
      case 8:
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-w, 0);
        break;
      default:
        break;
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
            if (tag === 0x0112) {
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
    } catch (_) {
      return 1;
    }
  }

  function getString(view, start, length) {
    let out = "";
    for (let i = 0; i < length; i++) {
      out += String.fromCharCode(view.getUint8(start + i));
    }
    return out;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.src = src;
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(new Error("讀取圖片失敗"));
      fr.readAsDataURL(file);
    });
  }

  function canvasToBlob(canvas, type = "image/jpeg", quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas 轉 Blob 失敗"));
      }, type, quality);
    });
  }

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

  function getPhotoNumberFromKey(key) {
    const m = /^photo(\d+)_url$/.exec(key || "");
    return m ? Number(m[1]) : 0;
  }

  function toggleEl(node, show) {
    if (!node) return;
    node.classList.toggle("hidden", !show);
    node.style.display = show ? "" : "none";
  }

  function autoGrow(node) {
    if (!node || node.tagName !== "TEXTAREA") return;
    node.style.height = "auto";
    node.style.height = `${Math.max(110, node.scrollHeight)}px`;
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function text(v) {
    return v == null ? "" : String(v).trim();
  }
})();