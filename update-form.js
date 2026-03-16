/* =========================================
 * HSC update-form.js v805
 * COMPLETE OVERWRITE
 *
 * 主線：
 * - 與 form.js 對齊
 * - 圖片流程：選圖 -> 裁切 -> 套用 -> 上傳 Firebase -> 回寫 *_url
 * - 送出 updateCardByToken 時只送文字 + *_url
 * - 對齊 firebase.js v802:
 *   uploadAvatar(cardId, blob)
 *   uploadLogo(cardId, blob)
 *   uploadPhoto(cardId, blob, index)
 * ========================================= */

import {
  initFirebase,
  ensureAuth,
  uploadAvatar,
  uploadLogo,
  uploadPhoto
} from "./firebase.js";

(() => {
  "use strict";

  const GAS_URL = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const VERSION = "805";

  const TEXT_FIELDS = [
    "name","unit","title","slogan","services","experience",
    "phone","email","line_url","line_oa","wechat_id","website","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3"
  ];

  const IMAGE_FIELDS = [
    "avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url"
  ];

  const IMAGE_SLOTS = {
    avatar: {
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
    card: null,
    busy: false,
    firebaseReady: false,
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
    btnSubmit: document.getElementById("btnSubmit"),
    btnReload: document.getElementById("btnReload"),
    btnTop: document.getElementById("btnTop"),

    cropModal: document.getElementById("cropModal"),
    cropTitle: document.getElementById("cropTitle"),
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
    bindImageEvents();
    bindCropEvents();

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
  }

  function bindImageEvents() {
    document.addEventListener("click", (ev) => {
      const pickBtn = ev.target.closest("[data-pick]");
      if (pickBtn) {
        const slot = pickBtn.getAttribute("data-pick");
        triggerFilePick(slot);
        return;
      }

      const editBtn = ev.target.closest("[data-edit]");
      if (editBtn) {
        const slot = editBtn.getAttribute("data-edit");
        triggerFilePick(slot);
        return;
      }

      const clearBtn = ev.target.closest("[data-clear]");
      if (clearBtn) {
        const slot = clearBtn.getAttribute("data-clear");
        clearSlot(slot);
      }
    });

    Object.keys(IMAGE_SLOTS).forEach((slot) => {
      const fileInput = document.getElementById(IMAGE_SLOTS[slot].fileId);
      if (!fileInput) return;

      fileInput.addEventListener("change", async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;

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
  }

  function triggerFilePick(slot) {
    if (!IMAGE_SLOTS[slot]) return;
    const fileInput = document.getElementById(IMAGE_SLOTS[slot].fileId);
    fileInput?.click();
  }

  async function loadCard(isReload = false) {
    if (state.busy) return;

    setBusy(true);
    showStatus("warn", isReload ? "重新載入資料中…" : "載入資料中…");

    try {
      const url = new URL(GAS_URL);
      url.searchParams.set("action", "getCardForUpdate");
      url.searchParams.set("id", state.id);
      url.searchParams.set("utoken", state.utoken);
      url.searchParams.set("_t", String(Date.now()));
      url.searchParams.set("_v", VERSION);

      const res = await fetchJson(url.toString());
      console.log("[HSC update-form] getCardForUpdate:", res);

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "資料載入失敗");
      }

      const card = res.data || {};
      state.card = card;
      state.loaded = true;

      fillForm(card);
      el.form?.classList.remove("hidden");

      showStatus("ok", `資料載入成功\n名片編號：${state.id}`);
    } catch (err) {
      console.error("[HSC update-form] loadCard failed:", err);
      state.loaded = false;
      el.form?.classList.add("hidden");
      showStatus(
        "bad",
        [
          "資料沒有正常載入。",
          err?.message || "未知錯誤",
          "",
          "請檢查：",
          "1. update-form.js 是否已更新到 v805",
          "2. firebase.js 是否為 v802",
          "3. HTML 是否已改為 type=\"module\"",
          "4. 連結中的 id / utoken 是否正確"
        ].join("\n")
      );
    } finally {
      setBusy(false);
    }
  }

  function fillForm(card) {
    TEXT_FIELDS.forEach((key) => {
      const input = document.getElementById(key);
      if (!input) return;
      input.value = text(card[key]);
    });

    Object.keys(IMAGE_SLOTS).forEach((slot) => {
      const cfg = IMAGE_SLOTS[slot];
      const url = pickFirstImage(card, cfg.fallback);

      setFieldValue(cfg.key, url);
      setSlotPreview(slot, url);
      setSlotStatus(slot, url ? "已載入既有圖片" : "未設定");
    });
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    if (!state.loaded) {
      showStatus("bad", "資料尚未載入完成，暫時不能送出。");
      return;
    }

    if (state.busy) return;

    setBusy(true);
    showStatus("warn", "送出更新中…");

    try {
      const payload = collectPayload();

      const res = await fetchJson(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      console.log("[HSC update-form] updateCardByToken:", res);

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "更新失敗");
      }

      showStatus("ok", "資料更新成功。");
    } catch (err) {
      console.error("[HSC update-form] submit failed:", err);
      showStatus("bad", `資料更新失敗：${err?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  function collectPayload() {
    const out = {
      action: "updateCardByToken",
      id: state.id,
      utoken: state.utoken
    };

    TEXT_FIELDS.forEach((key) => {
      out[key] = getFieldValue(key);
    });

    IMAGE_FIELDS.forEach((key) => {
      out[key] = getFieldValue(key);
    });

    return out;
  }

  async function openCropper(slot, file) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) throw new Error("找不到圖片欄位設定");

    await ensureFirebaseReady();

    const objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);

    if (state.cropper.imageUrl) {
      URL.revokeObjectURL(state.cropper.imageUrl);
    }

    state.cropper.slot = slot;
    state.cropper.image = img;
    state.cropper.imageUrl = objectUrl;
    state.cropper.imageW = img.naturalWidth || img.width;
    state.cropper.imageH = img.naturalHeight || img.height;

    if (el.cropTitle) {
      el.cropTitle.textContent = `裁切圖片：${getSlotLabel(slot)}`;
    }

    if (el.cropViewport) {
      el.cropViewport.classList.toggle("is-square", cfg.cropShape === "square");
      el.cropViewport.classList.toggle("is-wide", cfg.cropShape === "wide");
    }

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
      URL.revokeObjectURL(state.cropper.imageUrl);
    }

    state.cropper.slot = "";
    state.cropper.image = null;
    state.cropper.imageUrl = "";
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
    if (!cp.image || !cfg || !el.cropViewport) return;

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
    el.cropImage.style.transform = `translate(calc(-50% + ${cp.offsetX}px), calc(-50% + ${cp.offsetY}px))`;
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

    try {
      setBusy(true);
      setSlotStatus(slot, "裁切完成，準備上傳…");
      showStatus("warn", `上傳中：${getSlotLabel(slot)}…`);

      const blob = await renderCroppedBlob(slot);
      const url = await uploadBySlot(slot, blob);

      if (!url) {
        throw new Error("Firebase 未回傳 downloadURL");
      }

      setFieldValue(cfg.key, url);
      setSlotPreview(slot, url);
      setSlotStatus(slot, "已上傳成功");

      showStatus("ok", `${getSlotLabel(slot)} 已更新完成。`);
      closeCropper();
    } catch (err) {
      console.error(`[HSC update-form] upload failed: ${slot}`, err);
      setSlotStatus(slot, "上傳失敗");
      showStatus("bad", `${getSlotLabel(slot)} 上傳失敗：${err?.message || "未知錯誤"}`);
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
    ctx.drawImage(cp.image, drawX, drawY, drawW, drawH);

    return await canvasToBlob(canvas, "image/jpeg", 0.92);
  }

  async function uploadBySlot(slot, blob) {
    if (slot === "avatar") {
      return await uploadAvatar(state.id, blob);
    }
    if (slot === "logo") {
      return await uploadLogo(state.id, blob);
    }
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
    setSlotStatus(slot, "已清除，待送出保存");
    showStatus("warn", `${getSlotLabel(slot)} 已清除，請記得按「送出更新」。`);
  }

  function setSlotPreview(slot, url) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) return;

    const box = document.getElementById(cfg.previewId);
    if (!box) return;

    if (url) {
      box.style.backgroundImage = `url("${escapeCssUrl(url)}")`;
      box.classList.add("has-image");
    } else {
      box.style.backgroundImage = "none";
      box.classList.remove("has-image");
    }
  }

  function setSlotStatus(slot, msg) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) return;
    const node = document.getElementById(cfg.statusId);
    if (node) node.textContent = msg || "未設定";
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

  function showStatus(type, message) {
    if (!el.statusBox) return;
    el.statusBox.className = `status show ${type || "warn"}`;
    el.statusBox.textContent = message || "";
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

  function getSlotLabel(slot) {
    const map = {
      avatar: "頭像",
      logo: "Logo",
      photo1: "照片 1",
      photo2: "照片 2",
      photo3: "照片 3",
      photo4: "照片 4",
      photo5: "照片 5"
    };
    return map[slot] || slot;
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
    return text(res.error || res.message || res.msg);
  }

  function loadImage(objectUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.src = objectUrl;
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

  function escapeCssUrl(v) {
    return String(v || "").replace(/"/g, '\\"');
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function text(v) {
    return v == null ? "" : String(v).trim();
  }
})();