/* =========================================
 * HSC update-form.js v722.0
 * COMPLETE OVERWRITE
 *
 * 支援：
 * - getCardForUpdate
 * - updateCardByToken
 * - uploadCardImageByToken
 *
 * 圖片流程：
 * 選圖 -> 前端壓縮 -> 裁切 -> 套用 -> 立即上傳 -> 回寫 *_url
 * ========================================= */

const GAS_URL = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

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
  cropper: {
    open: false,
    slotKey: "",
    image: null,
    objectUrl: "",
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

function escCssUrl(url){
  return String(url || "").replace(/"/g, '\\"');
}

function setStatus(type, text){
  const box = $("#statusBox");
  box.className = `status show ${type || ""}`;
  box.textContent = text || "";
}

function clearStatus(){
  const box = $("#statusBox");
  box.className = "status";
  box.textContent = "";
}

function lockForm(locked){
  const form = $("#updateForm");
  if(!form) return;
  const fields = form.querySelectorAll("input, textarea, button");
  fields.forEach(el => {
    if(el.id === "btnTop") return;
    if(el.id === "btnCropClose") return;
    el.disabled = !!locked;
  });
}

function showForm(show){
  $("#updateForm").classList.toggle("hidden", !show);
}

function isImageSlotBusy(){
  return !!state.imageUploading || !!state.cropper.open;
}

function setImageStatus(slotKey, text){
  const slot = IMAGE_SLOTS[slotKey];
  if(!slot) return;
  const el = document.getElementById(slot.statusId);
  if(el) el.textContent = text || "";
}

function setPreview(previewId, url){
  const el = document.getElementById(previewId);
  if(!el) return;
  const safe = String(url || "").trim();
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
  return el ? String(el.value || "").trim() : "";
}

function fillForm(item){
  UPDATE_FIELDS.forEach(key => {
    const el = document.getElementById(key);
    if(!el) return;
    el.value = item[key] == null ? "" : String(item[key]);
  });

  Object.values(IMAGE_SLOTS).forEach(slot => {
    const url = item[slot.field] || "";
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
    payload[key] = String(el.value || "").trim();
  });

  return payload;
}

async function apiGet(params){
  const url = new URL(GAS_URL);
  Object.keys(params).forEach(k => {
    if(params[k] == null) return;
    url.searchParams.set(k, params[k]);
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store"
  });

  return await res.json();
}

async function apiPost(payload){
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams(payload).toString()
  });

  return await res.json();
}

function buildErrMsg(res){
  if(!res) return "系統沒有回應，請稍後再試。";
  return String(res.error || res.message || "發生未知錯誤，請聯繫客服。");
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
      ts: Date.now()
    });

    if(!res || !res.ok){
      showForm(false);
      setStatus("bad",
        buildErrMsg(res).includes("expired")
          ? "此更新連結已過期，請聯繫客服重新取得更新連結。"
          : buildErrMsg(res)
      );
      return;
    }

    fillForm(res.item || {});
    state.loaded = true;
    showForm(true);
    setStatus("ok", "資料已載入，請確認後送出更新。圖片可直接上傳與裁切。");
  }catch(err){
    console.error(err);
    showForm(false);
    setStatus("bad", "載入失敗，請檢查網路或聯繫客服。");
  }finally{
    state.loading = false;
    lockForm(false);
  }
}

async function submitForm(ev){
  ev.preventDefault();
  if(state.submitting) return;
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
    const res = await apiPost(payload);

    if(!res || !res.ok){
      const msg = buildErrMsg(res);
      setStatus("bad",
        msg.includes("expired")
          ? "此更新連結已過期，請聯繫客服重新取得更新連結。"
          : msg
      );
      return;
    }

    setStatus("ok", "您的資料已更新完成。\n若後續仍需調整，請再聯繫客服重新取得更新連結。");
    showForm(false);
  }catch(err){
    console.error(err);
    setStatus("bad", "送出失敗，請稍後再試。");
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
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
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
  const isWide = Math.abs(ratio - 1) > 0.05;
  stage.classList.toggle("wide", isWide);
  stage.classList.toggle("square", !isWide);
  previewWrap.classList.toggle("wide", isWide);
}

function resizeCropCanvasByRatio(ratio){
  const { canvas } = getCropCanvasElements();
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
  ui.zoomRange.value = "1";
  ui.title.textContent = `${slot.title}｜圖片編輯`;
  ui.previewImage.src = "";

  $("#cropModal").classList.add("show");
  $("#cropModal").setAttribute("aria-hidden", "false");

  renderCropCanvas();
}

function closeCropper(){
  const crop = state.cropper;
  crop.open = false;
  crop.slotKey = "";
  crop.image = null;
  crop.ratio = 1;
  crop.dragging = false;
  $("#cropModal").classList.remove("show");
  $("#cropModal").setAttribute("aria-hidden", "true");
}

function renderCropCanvas(){
  const crop = state.cropper;
  if(!crop.open || !crop.image) return;

  const { canvas, previewImage } = getCropCanvasElements();
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

  // subtle guide
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, cw - 2, ch - 2);

  previewImage.src = canvas.toDataURL("image/jpeg", 0.92);
}

function clampScale(val){
  return Math.min(3, Math.max(0.8, val));
}

function updateZoomFromRange(val){
  state.cropper.scale = clampScale(Number(val || 1));
  renderCropCanvas();
}

function resetCropperPosition(){
  const crop = state.cropper;
  crop.scale = 1;
  crop.dx = 0;
  crop.dy = 0;
  crop.lastDx = 0;
  crop.lastDy = 0;
  $("#zoomRange").value = "1";
  renderCropCanvas();
}

function centerCropper(){
  state.cropper.dx = 0;
  state.cropper.dy = 0;
  state.cropper.lastDx = 0;
  state.cropper.lastDy = 0;
  renderCropCanvas();
}

async function applyCropAndUpload(){
  const crop = state.cropper;
  const slot = IMAGE_SLOTS[crop.slotKey];
  if(!crop.open || !crop.image || !slot) return;

  state.imageUploading = true;
  lockForm(true);
  setImageStatus(slot.key, "上傳中…");
  setStatus("warn", `正在處理 ${slot.title}…`);

  try{
    const { canvas } = getCropCanvasElements();
    const outType = "image/jpeg";
    const outQuality = slot.ratio === 1 ? 0.9 : 0.88;
    const blob = await canvasToBlob(canvas, outType, outQuality);

    if(!blob){
      throw new Error("無法產生裁切圖檔");
    }

    const localUrl = URL.createObjectURL(blob);
    state.imageEdits[slot.key] = {
      blob,
      localUrl,
      remoteUrl: "",
      fileName: `${state.id}_${slot.key}_${Date.now()}.jpg`
    };

    setPreview(slot.previewId, localUrl);
    setImageStatus(slot.key, "已套用，準備上傳");

    const remoteUrl = await uploadImageForSlot(slot.key, blob, state.imageEdits[slot.key].fileName);

    setFieldValue(slot.field, remoteUrl);
    state.imageEdits[slot.key].remoteUrl = remoteUrl;
    setPreview(slot.previewId, remoteUrl);
    setImageStatus(slot.key, "上傳完成");

    closeCropper();
    setStatus("ok", `${slot.title} 已更新完成。`);
  }catch(err){
    console.error(err);
    setImageStatus(slot.key, "上傳失敗");
    setStatus("bad", `${slot.title} 上傳失敗，請稍後再試。`);
  }finally{
    state.imageUploading = false;
    lockForm(false);
  }
}

async function uploadImageForSlot(slotKey, blob, fileName){
  const slot = IMAGE_SLOTS[slotKey];
  if(!slot) throw new Error("invalid slot");

  const dataUrl = await blobToDataURL(blob);
  const res = await apiPost({
    action: "uploadCardImageByToken",
    id: state.id,
    utoken: state.utoken,
    image_slot: slotKey,
    field_name: slot.field,
    filename: fileName,
    content_type: blob.type || "image/jpeg",
    image_base64: String(dataUrl).split(",")[1] || ""
  });

  if(!res || !res.ok){
    throw new Error(buildErrMsg(res));
  }

  const imageUrl = String(res.url || "").trim();
  if(!imageUrl){
    throw new Error("upload url missing");
  }

  return imageUrl;
}

async function handlePickFile(slotKey, file){
  try{
    if(!file) return;

    const isImage = /^image\//i.test(file.type || "");
    if(!isImage){
      setStatus("bad", "請選擇圖片檔案。");
      return;
    }

    if(file.size > 18 * 1024 * 1024){
      setStatus("bad", "圖片過大，請選擇 18MB 以下的檔案。");
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

  if(state.imageEdits[slot.key]?.localUrl){
    try{ URL.revokeObjectURL(state.imageEdits[slot.key].localUrl); }catch(_){}
  }
  delete state.imageEdits[slot.key];
}

function startDrag(clientX, clientY){
  if(!state.cropper.open) return;
  state.cropper.dragging = true;
  state.cropper.dragStartX = clientX;
  state.cropper.dragStartY = clientY;
  $("#cropStage").classList.add("dragging");
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
  $("#cropStage").classList.remove("dragging");
}

/* =========================
 * event bindings
 * ========================= */

function bindCropperEvents(){
  const stage = $("#cropStage");
  const zoomRange = $("#zoomRange");

  $("#btnCropClose").addEventListener("click", closeCropper);
  $("#btnZoomOut").addEventListener("click", () => {
    const next = clampScale(state.cropper.scale - 0.08);
    $("#zoomRange").value = String(next);
    updateZoomFromRange(next);
  });
  $("#btnZoomIn").addEventListener("click", () => {
    const next = clampScale(state.cropper.scale + 0.08);
    $("#zoomRange").value = String(next);
    updateZoomFromRange(next);
  });
  $("#btnCenter").addEventListener("click", centerCropper);
  $("#btnReset").addEventListener("click", resetCropperPosition);
  $("#btnCropApply").addEventListener("click", applyCropAndUpload);

  zoomRange.addEventListener("input", (ev) => {
    updateZoomFromRange(ev.target.value);
  });

  stage.addEventListener("mousedown", (ev) => startDrag(ev.clientX, ev.clientY));
  window.addEventListener("mousemove", (ev) => moveDrag(ev.clientX, ev.clientY));
  window.addEventListener("mouseup", endDrag);

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
  $("#updateForm").addEventListener("submit", submitForm);

  $("#btnReload").addEventListener("click", async () => {
    await loadCard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#btnTop").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  bindImageSlotEvents();
  bindCropperEvents();
}

function init(){
  state.id = getParam("id");
  state.utoken = getParam("utoken");

  bindEvents();
  loadCard();
}

document.addEventListener("DOMContentLoaded", init);