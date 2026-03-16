/* =========================================
 * HSC update-form.js v802.1
 * COMPLETE OVERWRITE
 *
 * 主線：
 * - getCardForUpdate
 * - updateCardByToken
 * - 圖片流程改走 Firebase Storage
 *
 * 圖片流程：
 * 選圖 -> 前端壓縮 -> 裁切 -> 套用 -> 立即上傳 Firebase -> 回寫 *_url
 * ========================================= */

import {
  initFirebase,
  ensureAuth,
  uploadAvatar,
  uploadLogo,
  uploadPhoto
} from "./firebase.js";

const GAS_URL = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
const VERSION = "802.1";

const UPDATE_FIELDS = [
  "name","unit","title","slogan","services","experience",
  "wechat_id","line_url","line_oa","email","phone","address","website",
  "video1","video2","video3","social1","social2","social3",
  "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3",
  "avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url",
  "color","style","paper","premium_color"
];

const IMAGE_SLOTS = {
  avatar: {
    key: "avatar",
    title: "頭像",
    field: "avatar_url",
    previewId: "preview_avatar",
    fileId: "file_avatar",
    statusId: "status_avatar",
    ratio: 1
  },
  logo: {
    key: "logo",
    title: "Logo",
    field: "logo_url",
    previewId: "preview_logo",
    fileId: "file_logo",
    statusId: "status_logo",
    ratio: 1
  },
  photo1: {
    key: "photo1",
    title: "照片 1",
    field: "photo1_url",
    previewId: "preview_photo1",
    fileId: "file_photo1",
    statusId: "status_photo1",
    ratio: 16 / 10
  },
  photo2: {
    key: "photo2",
    title: "照片 2",
    field: "photo2_url",
    previewId: "preview_photo2",
    fileId: "file_photo2",
    statusId: "status_photo2",
    ratio: 16 / 10
  },
  photo3: {
    key: "photo3",
    title: "照片 3",
    field: "photo3_url",
    previewId: "preview_photo3",
    fileId: "file_photo3",
    statusId: "status_photo3",
    ratio: 16 / 10
  },
  photo4: {
    key: "photo4",
    title: "照片 4",
    field: "photo4_url",
    previewId: "preview_photo4",
    fileId: "file_photo4",
    statusId: "status_photo4",
    ratio: 16 / 10
  },
  photo5: {
    key: "photo5",
    title: "照片 5",
    field: "photo5_url",
    previewId: "preview_photo5",
    fileId: "file_photo5",
    statusId: "status_photo5",
    ratio: 16 / 10
  }
};

const state = {
  id: "",
  utoken: "",
  loaded: false,
  loading: false,
  submitting: false,
  imageUploading: false,
  firebaseReady: false,
  cropper: {
    open: false,
    slotKey: "",
    image: null,
    ratio: 1,
    canvasSize: { w: 900, h: 900 },
    baseScale: 1,
    scale: 1,
    dx: 0,
    dy: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastDx: 0,
    lastDy: 0
  },
  imageEdits: {} // slotKey -> { blob, localUrl, remoteUrl, fileName }
};

const $ = (sel) => document.querySelector(sel);

function getParam(name){
  const url = new URL(window.location.href);
  return (url.searchParams.get(name) || "").trim();
}

function clean(v){
  return String(v == null ? "" : v).trim();
}

function escCssUrl(url){
  return String(url || "").replace(/"/g, '\\"');
}

function hasText(v){
  return clean(v) !== "";
}

function lower(v){
  return clean(v).toLowerCase();
}

function isExpiredMessage(msg){
  const s = lower(msg);
  return s.includes("expired") || s.includes("expire") || s.includes("已過期") || s.includes("過期");
}

function isInvalidTokenMessage(msg){
  const s = lower(msg);
  return s.includes("invalid token") || s.includes("invalid utoken") || s.includes("token invalid") || s.includes("token 錯誤") || s.includes("驗證失敗") || s.includes("無效");
}

function setStatus(type, text){
  const box = $("#statusBox");
  if (!box) return;
  box.className = `status show ${type || ""}`;
  box.textContent = text || "";
}

function clearStatus(){
  const box = $("#statusBox");
  if (!box) return;
  box.className = "status";
  box.textContent = "";
}

function lockForm(locked){
  const form = $("#updateForm");
  if(!form) return;
  const fields = form.querySelectorAll("input, textarea, button, select");
  fields.forEach(el => {
    if(el.id === "btnTop") return;
    if(el.id === "btnCropClose") return;
    el.disabled = !!locked;
  });
}

function showForm(show){
  const form = $("#updateForm");
  if (form) form.classList.toggle("hidden", !show);
}

function setImageStatus(slotKey, textValue){
  const slot = IMAGE_SLOTS[slotKey];
  if(!slot) return;
  const el = document.getElementById(slot.statusId);
  if(el) el.textContent = textValue || "";
}

function setPreview(previewId, url){
  const el = document.getElementById(previewId);
  if(!el) return;
  const safe = clean(url);
  el.style.backgroundImage = safe ? `url("${escCssUrl(safe)}")` : "none";
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  el.style.backgroundRepeat = "no-repeat";
}

function setFieldValue(id, value){
  const el = document.getElementById(id);
  if(el) el.value = value == null ? "" : String(value);
}

function getFieldValue(id){
  const el = document.getElementById(id);
  return el ? clean(el.value) : "";
}

function getResponseData(res){
  if(!res || typeof res !== "object") return null;
  return res.data || res.item || res.card || null;
}

function normalizeApiError(res){
  const raw = clean(
    (res && (res.error || res.message || res.msg || res.reason || "")) || ""
  );

  if (isExpiredMessage(raw)) {
    return "此更新連結已過期，請聯繫客服重新取得更新連結。";
  }

  if (isInvalidTokenMessage(raw)) {
    return "更新驗證失敗，請確認連結是否正確，或聯繫客服重新取得更新連結。";
  }

  return raw || "發生未知錯誤，請聯繫客服。";
}

function normalizeThrownError(err, fallback){
  const msg = clean(err && err.message);
  if (msg === "INVALID_JSON") {
    return "系統回傳格式錯誤（invalid json），請稍後再試或聯繫客服。";
  }
  if (msg === "NETWORK_FAIL") {
    return "網路連線失敗（network fail），請檢查網路後再試。";
  }
  if (isExpiredMessage(msg)) {
    return "此更新連結已過期，請聯繫客服重新取得更新連結。";
  }
  if (isInvalidTokenMessage(msg)) {
    return "更新驗證失敗，請確認連結是否正確，或聯繫客服重新取得更新連結。";
  }
  return msg || fallback || "系統忙碌中，請稍後再試。";
}

function fillForm(item){
  const data = item || {};

  UPDATE_FIELDS.forEach(key => {
    const el = document.getElementById(key);
    if(!el) return;
    el.value = data[key] == null ? "" : String(data[key]);
  });

  Object.values(IMAGE_SLOTS).forEach(slot => {
    const url = clean(data[slot.field] || "");
    revokeSlotLocalUrlIfRemoteSame(slot.key, url);
    setPreview(slot.previewId, url);
    setImageStatus(slot.key, url ? "已載入" : "未設定");
  });
}

function collectPayload(){
  const payload = {
    action: "updateCardByToken",
    id: state.id,
    utoken: state.utoken
  };

  UPDATE_FIELDS.forEach(key => {
    const el = document.getElementById(key);
    if(!el) return;
    payload[key] = clean(el.value);
  });

  return payload;
}

async function apiGet(params){
  const url = new URL(GAS_URL);
  Object.keys(params).forEach(k => {
    if(params[k] == null) return;
    url.searchParams.set(k, params[k]);
  });

  let res;
  try{
    res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store"
    });
  }catch(_){
    throw new Error("NETWORK_FAIL");
  }

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

async function apiPostJson(payload){
  let res;
  try{
    res = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: JSON.stringify(payload)
    });
  }catch(_){
    throw new Error("NETWORK_FAIL");
  }

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

async function loadCard(){
  if(!state.id || !state.utoken){
    showForm(false);
    setStatus("bad", "缺少更新驗證資訊，請聯繫客服重新取得更新連結。");
    return;
  }

  state.loading = true;
  lockForm(true);
  clearStatus();
  setStatus("warn", "正在載入資料…");

  try{
    const res = await apiGet({
      action: "getCardForUpdate",
      id: state.id,
      utoken: state.utoken,
      ts: Date.now(),
      v: VERSION
    });

    if(!res || !res.ok){
      showForm(false);
      setStatus("bad", normalizeApiError(res));
      return;
    }

    const item = getResponseData(res);

    if(!item || typeof item !== "object"){
      showForm(false);
      setStatus("bad", "載入成功但找不到可用資料，請聯繫客服協助處理。");
      return;
    }

    fillForm(item);
    state.loaded = true;
    showForm(true);

    if(state.firebaseReady){
      setStatus("ok", "資料已載入，請確認後送出更新。圖片可直接上傳與裁切。");
    }else{
      setStatus("warn", "資料已載入。Firebase 初始化失敗，圖片更新可能無法使用，但文字更新仍可送出。");
    }
  }catch(err){
    console.error(err);
    showForm(false);
    setStatus("bad", normalizeThrownError(err, "載入失敗，請檢查網路或聯繫客服。"));
  }finally{
    state.loading = false;
    lockForm(false);
  }
}

async function submitForm(ev){
  ev.preventDefault();
  if(state.submitting) return;

  if(!state.id || !state.utoken){
    showForm(false);
    setStatus("bad", "缺少更新驗證資訊，無法送出。請聯繫客服重新取得更新連結。");
    return;
  }

  if(state.imageUploading){
    setStatus("warn", "目前仍有圖片上傳中，請稍候完成後再送出。");
    return;
  }

  if(state.cropper.open){
    setStatus("warn", "請先完成目前圖片編輯，再送出更新。");
    return;
  }

  state.submitting = true;
  lockForm(true);
  setStatus("warn", "資料更新中，請稍候…");

  try{
    const payload = collectPayload();
    const res = await apiPostJson(payload);

    if(!res || !res.ok){
      setStatus("bad", normalizeApiError(res));
      return;
    }

    setStatus("ok", "您的資料已更新完成。\n若後續仍需調整，請再聯繫客服重新取得更新連結。");
    showForm(false);
  }catch(err){
    console.error(err);
    setStatus("bad", normalizeThrownError(err, "送出失敗，請稍後再試。"));
  }finally{
    state.submitting = false;
    lockForm(false);
  }
}

/* =========================
 * image helpers
 * ========================= */

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToImage(dataUrl){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function blobToDataURL(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.9){
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if(blob) resolve(blob);
      else reject(new Error("無法產生裁切圖檔"));
    }, type, quality);
  });
}

async function downscaleImage(img, maxSide = 2200, type = "image/jpeg", quality = 0.9){
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const ratio = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * ratio));
  const th = Math.max(1, Math.round(h * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, tw, th);

  const blob = await canvasToBlob(canvas, type, quality);
  const dataUrl = await blobToDataURL(blob);
  const downscaledImg = await dataUrlToImage(dataUrl);

  return {
    blob,
    dataUrl,
    img: downscaledImg,
    width: tw,
    height: th
  };
}

function getCropCanvasElements(){
  return {
    modal: $("#cropModal"),
    stage: $("#cropStage"),
    canvas: $("#cropCanvas"),
    zoomRange: $("#zoomRange"),
    previewImage: $("#cropPreviewImage"),
    previewWrap: $("#cropPreviewWrap"),
    title: $("#cropTitle")
  };
}

function updateCropStageClass(ratio){
  const { stage, previewWrap } = getCropCanvasElements();
  if (!stage) return;
  const isWide = Math.abs(ratio - 1) > 0.05;
  stage.classList.toggle("wide", isWide);
  stage.classList.toggle("square", !isWide);
  if (previewWrap) previewWrap.classList.toggle("wide", isWide);
}

function resizeCropCanvasByRatio(ratio){
  const { canvas } = getCropCanvasElements();
  if(!canvas) return;
  const baseW = 900;
  const baseH = Math.round(baseW / ratio);
  canvas.width = baseW;
  canvas.height = baseH;
  state.cropper.canvasSize = { w: baseW, h: baseH };
}

function openCropper(slotKey, imageObj){
  const slot = IMAGE_SLOTS[slotKey];
  if(!slot || !imageObj) return;

  const crop = state.cropper;
  crop.open = true;
  crop.slotKey = slotKey;
  crop.image = imageObj;
  crop.ratio = slot.ratio;

  updateCropStageClass(slot.ratio);
  resizeCropCanvasByRatio(slot.ratio);

  const cw = crop.canvasSize.w;
  const ch = crop.canvasSize.h;
  const iw = imageObj.naturalWidth || imageObj.width;
  const ih = imageObj.naturalHeight || imageObj.height;

  crop.baseScale = Math.max(cw / iw, ch / ih);
  crop.scale = 1;
  crop.dx = 0;
  crop.dy = 0;
  crop.lastDx = 0;
  crop.lastDy = 0;

  const ui = getCropCanvasElements();
  if(ui.zoomRange) ui.zoomRange.value = "1";
  if(ui.title) ui.title.textContent = `${slot.title}｜圖片編輯`;
  if(ui.previewImage) ui.previewImage.src = "";

  const modal = $("#cropModal");
  if(modal){
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  renderCropCanvas();
}

function closeCropper(){
  const crop = state.cropper;
  crop.open = false;
  crop.slotKey = "";
  crop.image = null;
  crop.ratio = 1;
  crop.dragging = false;

  const modal = $("#cropModal");
  if(modal){
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
}

function renderCropCanvas(){
  const crop = state.cropper;
  if(!crop.open || !crop.image) return;

  const { canvas, previewImage } = getCropCanvasElements();
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;
  const img = crop.image;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const totalScale = crop.baseScale * crop.scale;
  const drawW = iw * totalScale;
  const drawH = ih * totalScale;
  const x = (cw - drawW) / 2 + crop.dx;
  const y = (ch - drawH) / 2 + crop.dy;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, cw, ch);

  ctx.drawImage(img, x, y, drawW, drawH);

  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, cw - 2, ch - 2);

  if(previewImage){
    previewImage.src = canvas.toDataURL("image/jpeg", 0.92);
  }
}

function clampScale(val){
  return Math.min(3, Math.max(0.8, Number(val || 1)));
}

function updateZoomFromRange(val){
  state.cropper.scale = clampScale(val);
  renderCropCanvas();
}

function resetCropperPosition(){
  const crop = state.cropper;
  crop.scale = 1;
  crop.dx = 0;
  crop.dy = 0;
  crop.lastDx = 0;
  crop.lastDy = 0;
  const zoomRange = $("#zoomRange");
  if(zoomRange) zoomRange.value = "1";
  renderCropCanvas();
}

function centerCropper(){
  state.cropper.dx = 0;
  state.cropper.dy = 0;
  state.cropper.lastDx = 0;
  state.cropper.lastDy = 0;
  renderCropCanvas();
}

function revokeSlotLocalUrl(slotKey){
  const info = state.imageEdits[slotKey];
  if(info && info.localUrl){
    try { URL.revokeObjectURL(info.localUrl); } catch (_) {}
  }
}

function revokeSlotLocalUrlIfRemoteSame(slotKey, remoteUrl){
  const info = state.imageEdits[slotKey];
  if(!info) return;
  if(clean(info.remoteUrl) && clean(info.remoteUrl) === clean(remoteUrl)){
    revokeSlotLocalUrl(slotKey);
    info.localUrl = "";
  }
}

async function applyCropAndUpload(){
  const crop = state.cropper;
  const slot = IMAGE_SLOTS[crop.slotKey];
  if(!crop.open || !crop.image || !slot) return;

  if(!state.firebaseReady){
    setImageStatus(slot.key, "Firebase 未就緒");
    setStatus("bad", "Firebase 初始化失敗，圖片更新目前無法使用。");
    return;
  }

  state.imageUploading = true;
  lockForm(true);
  setImageStatus(slot.key, "上傳中…");
  setStatus("warn", `正在處理 ${slot.title}…`);

  try{
    const { canvas } = getCropCanvasElements();
    if(!canvas){
      throw new Error("找不到裁切畫布");
    }

    const outType = "image/jpeg";
    const outQuality = slot.ratio === 1 ? 0.9 : 0.88;
    const blob = await canvasToBlob(canvas, outType, outQuality);
    const localUrl = URL.createObjectURL(blob);

    revokeSlotLocalUrl(slot.key);

    state.imageEdits[slot.key] = {
      blob,
      localUrl,
      remoteUrl: "",
      fileName: `${state.id}_${slot.key}_${Date.now()}.jpg`
    };

    setPreview(slot.previewId, localUrl);
    setImageStatus(slot.key, "已套用，準備上傳");

    const remoteUrl = await uploadImageForSlot(slot.key, blob);

    setFieldValue(slot.field, remoteUrl);
    state.imageEdits[slot.key].remoteUrl = remoteUrl;
    setPreview(slot.previewId, remoteUrl);
    setImageStatus(slot.key, "上傳完成");

    closeCropper();
    setStatus("ok", `${slot.title} 已更新完成。`);
  }catch(err){
    console.error(err);
    setImageStatus(slot.key, "上傳失敗");
    setStatus("bad", normalizeThrownError(err, `${slot.title} 上傳失敗，請稍後再試。`));
  }finally{
    state.imageUploading = false;
    lockForm(false);
  }
}

async function uploadImageForSlot(slotKey, blob){
  if(!blob) throw new Error("missing blob");
  if(!state.id) throw new Error("missing card id");
  if(!state.firebaseReady) throw new Error("Firebase 未就緒");

  let url = "";

  if(slotKey === "avatar"){
    url = await uploadAvatar(state.id, blob);
  } else if(slotKey === "logo"){
    url = await uploadLogo(state.id, blob);
  } else if(slotKey.startsWith("photo")){
    const index = Number(slotKey.replace("photo", "")) || 1;
    url = await uploadPhoto(state.id, blob, index);
  } else {
    throw new Error("invalid image slot");
  }

  if(!url){
    throw new Error("firebase upload failed");
  }

  return clean(url);
}

async function handlePickFile(slotKey, file){
  try{
    if(!file) return;

    if(!state.firebaseReady){
      setImageStatus(slotKey, "Firebase 未就緒");
      setStatus("bad", "Firebase 初始化失敗，圖片更新可能無法使用。");
      return;
    }

    const isImage = /^image\//i.test(file.type || "");
    if(!isImage){
      setStatus("bad", "請選擇圖片檔案。");
      setImageStatus(slotKey, "格式錯誤");
      return;
    }

    if(file.size > 18 * 1024 * 1024){
      setStatus("bad", "圖片過大，請選擇 18MB 以下的檔案。");
      setImageStatus(slotKey, "檔案過大");
      return;
    }

    setImageStatus(slotKey, "讀取中…");
    setStatus("warn", "正在讀取圖片…");

    const rawDataUrl = await fileToDataURL(file);
    const rawImg = await dataUrlToImage(rawDataUrl);
    const optimized = await downscaleImage(rawImg, 2200, "image/jpeg", 0.9);

    openCropper(slotKey, optimized.img);
    setImageStatus(slotKey, "待裁切");
    clearStatus();
  }catch(err){
    console.error(err);
    setImageStatus(slotKey, "讀取失敗");
    setStatus("bad", "圖片讀取失敗，請換一張圖片再試。");
  }
}

function clearSlot(slotKey){
  const slot = IMAGE_SLOTS[slotKey];
  if(!slot) return;

  setFieldValue(slot.field, "");
  setPreview(slot.previewId, "");
  setImageStatus(slot.key, "未設定");

  const fileInput = document.getElementById(slot.fileId);
  if(fileInput) fileInput.value = "";

  revokeSlotLocalUrl(slot.key);
  delete state.imageEdits[slot.key];
}

function startDrag(clientX, clientY){
  if(!state.cropper.open) return;
  state.cropper.dragging = true;
  state.cropper.dragStartX = clientX;
  state.cropper.dragStartY = clientY;
  const stage = $("#cropStage");
  if(stage) stage.classList.add("dragging");
}

function moveDrag(clientX, clientY){
  const crop = state.cropper;
  if(!crop.open || !crop.dragging) return;
  crop.dx = crop.lastDx + (clientX - crop.dragStartX);
  crop.dy = crop.lastDy + (clientY - crop.dragStartY);
  renderCropCanvas();
}

function endDrag(){
  const crop = state.cropper;
  if(!crop.open) return;
  crop.dragging = false;
  crop.lastDx = crop.dx;
  crop.lastDy = crop.dy;
  const stage = $("#cropStage");
  if(stage) stage.classList.remove("dragging");
}

/* =========================
 * event bindings
 * ========================= */

function bindCropperEvents(){
  const stage = $("#cropStage");
  const zoomRange = $("#zoomRange");
  const btnCropClose = $("#btnCropClose");
  const btnZoomOut = $("#btnZoomOut");
  const btnZoomIn = $("#btnZoomIn");
  const btnCenter = $("#btnCenter");
  const btnReset = $("#btnReset");
  const btnCropApply = $("#btnCropApply");

  if(btnCropClose) btnCropClose.addEventListener("click", closeCropper);

  if(btnZoomOut) btnZoomOut.addEventListener("click", () => {
    const next = clampScale(state.cropper.scale - 0.08);
    if(zoomRange) zoomRange.value = String(next);
    updateZoomFromRange(next);
  });

  if(btnZoomIn) btnZoomIn.addEventListener("click", () => {
    const next = clampScale(state.cropper.scale + 0.08);
    if(zoomRange) zoomRange.value = String(next);
    updateZoomFromRange(next);
  });

  if(btnCenter) btnCenter.addEventListener("click", centerCropper);
  if(btnReset) btnReset.addEventListener("click", resetCropperPosition);
  if(btnCropApply) btnCropApply.addEventListener("click", applyCropAndUpload);

  if(zoomRange){
    zoomRange.addEventListener("input", (ev) => {
      updateZoomFromRange(ev.target.value);
    });
  }

  if(stage){
    stage.addEventListener("mousedown", (ev) => startDrag(ev.clientX, ev.clientY));
    stage.addEventListener("touchstart", (ev) => {
      const t = ev.touches && ev.touches[0];
      if(!t) return;
      startDrag(t.clientX, t.clientY);
    }, { passive: true });

    stage.addEventListener("touchmove", (ev) => {
      const t = ev.touches && ev.touches[0];
      if(!t) return;
      moveDrag(t.clientX, t.clientY);
    }, { passive: true });

    stage.addEventListener("touchend", endDrag, { passive: true });
  }

  window.addEventListener("mousemove", (ev) => moveDrag(ev.clientX, ev.clientY));
  window.addEventListener("mouseup", endDrag);

  window.addEventListener("keydown", (ev) => {
    if(!state.cropper.open) return;
    if(ev.key === "Escape"){
      closeCropper();
    }
  });
}

function bindImageSlotEvents(){
  Object.values(IMAGE_SLOTS).forEach(slot => {
    const fileInput = document.getElementById(slot.fileId);
    if(!fileInput) return;

    fileInput.addEventListener("change", async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      await handlePickFile(slot.key, file);
    });
  });

  document.querySelectorAll("[data-pick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const slotKey = btn.dataset.pick;
      const slot = IMAGE_SLOTS[slotKey];
      if(!slot) return;
      const fileInput = document.getElementById(slot.fileId);
      if(fileInput) fileInput.click();
    });
  });

  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const slotKey = btn.dataset.edit;
      const slot = IMAGE_SLOTS[slotKey];
      if(!slot) return;
      const fileInput = document.getElementById(slot.fileId);
      if(fileInput) fileInput.click();
    });
  });

  document.querySelectorAll("[data-clear]").forEach(btn => {
    btn.addEventListener("click", () => {
      const slotKey = btn.dataset.clear;
      clearSlot(slotKey);
    });
  });
}

function bindEvents(){
  const form = $("#updateForm");
  const btnReload = $("#btnReload");
  const btnTop = $("#btnTop");

  if(form) form.addEventListener("submit", submitForm);

  if(btnReload){
    btnReload.addEventListener("click", async () => {
      await loadCard();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if(btnTop){
    btnTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  bindImageSlotEvents();
  bindCropperEvents();
}

async function initFirebaseSafe(){
  try {
    initFirebase();
    await ensureAuth();
    state.firebaseReady = true;
  } catch (err) {
    console.error(err);
    state.firebaseReady = false;
    setStatus("bad", "Firebase 初始化失敗，圖片更新可能無法使用。");
  }
}

function cleanupAllObjectUrls(){
  Object.keys(state.imageEdits).forEach(slotKey => {
    revokeSlotLocalUrl(slotKey);
  });
}

async function init(){
  state.id = getParam("id");
  state.utoken = getParam("utoken");

  bindEvents();

  if(!state.id || !state.utoken){
    showForm(false);
    setStatus("bad", "缺少 id 或 utoken，請聯繫客服重新取得更新連結。");
    return;
  }

  await initFirebaseSafe();
  await loadCard();

  window.addEventListener("beforeunload", cleanupAllObjectUrls);
}

document.addEventListener("DOMContentLoaded", init);