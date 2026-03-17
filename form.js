/* =========================================
 * 天使幸福智慧名片系統
 * form.js v804.4 FULL
 * COMPLETE OVERWRITE
 * -----------------------------------------
 * ✔ 保留 v803 全部功能
 * ✔ 圖片壓縮 + crop（完整）
 * ✔ 預覽同步
 * ✔ 方案控制（CTA / 照片）
 * ✔ 進度條（固定第六步）
 * ✔ 成功流程（ID + copy + LINE）
 * ========================================= */

(function(){

/* =========================
   基本 DOM
========================= */
const $ = (id) => document.getElementById(id);

/* =========================
   Page 控制
========================= */
const pages = document.querySelectorAll(".page");
let currentPage = 0;

const nextBtn = $("nextBtn");
const prevBtn = $("prevBtn");

function showPage(i){
  pages.forEach(p => p.classList.remove("active"));
  pages[i].classList.add("active");
  currentPage = i;
  updateNav();
}

function updateNav(){
  if(prevBtn) prevBtn.style.display = currentPage === 0 ? "none" : "inline-block";
  if(nextBtn) nextBtn.style.display = currentPage === pages.length - 1 ? "none" : "inline-block";

  const dots = $("navDots");
  if(dots){
    dots.innerHTML = "";
    pages.forEach((_, idx)=>{
      const d = document.createElement("span");
      if(idx === currentPage) d.classList.add("active");
      dots.appendChild(d);
    });
  }
}

nextBtn?.addEventListener("click", () => {
  if(currentPage < pages.length - 1){
    showPage(currentPage + 1);
  }
});

prevBtn?.addEventListener("click", () => {
  if(currentPage > 0){
    showPage(currentPage - 1);
  }
});

/* =========================
   方案控制（🔥修正）
========================= */
const planEl = $("plan");
const ctaRow2 = $("ctaRow2");
const ctaRow3 = $("ctaRow3");

function applyPlanUI(){
  const plan = planEl.value;

  if(plan === "free"){
    if(ctaRow2) ctaRow2.style.display = "none";
    if(ctaRow3) ctaRow3.style.display = "none";
  }else if(plan === "premium"){
    if(ctaRow2) ctaRow2.style.display = "block";
    if(ctaRow3) ctaRow3.style.display = "block";
  }
}

planEl?.addEventListener("change", applyPlanUI);

/* =========================
   資料收集
========================= */
function getFormData(){
  return {
    plan: $("plan")?.value || "",
    color: $("color")?.value || "",
    style: $("style")?.value || "",
    paper: $("paper")?.value || "",

    name: $("name")?.value || "",
    unit: $("unit")?.value || "",
    title: $("title")?.value || "",
    slogan: $("slogan")?.value || "",

    phone: $("phone")?.value || "",
    email: $("email")?.value || "",
    line_url: $("line_url")?.value || "",
    line_oa: $("line_oa")?.value || "",
    wechat_id: $("wechat_id")?.value || "",
    address: $("address")?.value || "",
    website: $("website")?.value || "",

    services: $("services")?.value || "",
    experience: $("experience")?.value || "",

    video1: $("video1")?.value || "",
    video2: $("video2")?.value || "",
    video3: $("video3")?.value || "",

    social1: $("social1")?.value || "",
    social2: $("social2")?.value || "",
    social3: $("social3")?.value || "",

    cta_text_1: $("cta_text_1")?.value || "",
    cta_link_1: $("cta_link_1")?.value || "",
    cta_text_2: $("cta_text_2")?.value || "",
    cta_link_2: $("cta_link_2")?.value || "",
    cta_text_3: $("cta_text_3")?.value || "",
    cta_link_3: $("cta_link_3")?.value || "",

    invite_code: $("invite_code")?.value || "",
    reserved_uid: $("reserved_uid")?.value || "",
    tenant: $("tenant")?.value || "angel"
  };
}

/* =========================
   Summary（第6步）
========================= */
function renderSummary(){
  const box = $("summaryBox");
  if(!box) return;

  const d = getFormData();

  box.innerHTML = `
    <div class="card">
      <strong>${d.name || "未填姓名"}</strong><br/>
      ${d.unit || ""} ${d.title || ""}
      <div style="margin-top:6px;">${d.slogan || ""}</div>
    </div>

    <div class="card">
      <div>電話：${d.phone || "-"}</div>
      <div>Email：${d.email || "-"}</div>
      <div>LINE：${d.line_url || "-"}</div>
    </div>
  `;
}

/* =========================
   頁面切換時更新 summary
========================= */
document.addEventListener("click", (e)=>{
  if(e.target.id === "nextBtn" && currentPage === 4){
    setTimeout(renderSummary, 100);
  }
});

/* =========================
   初始化
========================= */
showPage(0);
applyPlanUI();

})();
/* =========================
   圖片系統（FULL）
   - 上傳前壓縮
   - canvas crop
   - 放大 / 縮小
   - 上下左右拖移
   - 置中 / 重設 / 套用
========================= */

const uploadGrid = $("uploadGrid");
const cropModal = $("cropModal");
const cropCanvas = $("cropCanvas");
const cropStage = $("cropStage");
const cropZoomIn = $("cropZoomIn");
const cropZoomOut = $("cropZoomOut");
const cropCenter = $("cropCenter");
const cropReset = $("cropReset");
const cropCancel = $("cropCancel");
const cropApply = $("cropApply");
const cropTitle = $("cropTitle");
const cropDesc = $("cropDesc");

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const IMAGE_SLOTS = [
  { key: "avatar", label: "頭像", shape: "square", w: 1200, h: 1200 },
  { key: "logo", label: "Logo", shape: "square", w: 1200, h: 1200 },
  { key: "photo1", label: "照片 1", shape: "photo", w: 1600, h: 1000 },
  { key: "photo2", label: "照片 2", shape: "photo", w: 1600, h: 1000 },
  { key: "photo3", label: "照片 3", shape: "photo", w: 1600, h: 1000 },
  { key: "photo4", label: "照片 4", shape: "photo", w: 1600, h: 1000 },
  { key: "photo5", label: "照片 5", shape: "photo", w: 1600, h: 1000 }
];

const imageState = {
  files: {
    avatar: null,
    logo: null,
    photo1: null,
    photo2: null,
    photo3: null,
    photo4: null,
    photo5: null
  },
  crop: {
    slot: "",
    file: null,
    img: null,
    scale: 1,
    minScale: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    targetW: 1200,
    targetH: 1200
  }
};

function allowedPhotoCount(){
  return ($("plan")?.value || "") === "premium" ? 5 : 2;
}

function slotEnabled(slotKey){
  if(slotKey === "avatar" || slotKey === "logo") return true;
  const n = Number(String(slotKey).replace("photo", ""));
  return n <= allowedPhotoCount();
}

function renderUploadGrid(){
  if(!uploadGrid) return;

  uploadGrid.innerHTML = "";

  IMAGE_SLOTS.forEach((slot) => {
    if(!slotEnabled(slot.key)) return;

    const wrap = document.createElement("div");
    wrap.className = "uItem";
    wrap.dataset.key = slot.key;

    const isSquare = slot.shape === "square" ? "square" : "";
    const fileObj = imageState.files[slot.key];
    const preview = fileObj?.previewUrl || "";

    wrap.innerHTML = `
      <div class="uItemHead">
        <div>
          <strong>${slot.label}</strong>
          <small>${slot.shape === "square" ? "正方形裁切" : "照片牆橫圖"}</small>
        </div>
      </div>

      <div class="thumb ${isSquare}" id="thumb_${slot.key}">
        ${preview ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(slot.label)}">` : "尚未上傳圖片"}
      </div>

      <div class="miniRow">
        <input type="file" id="file_${slot.key}" accept="image/*">
        <button type="button" class="secondary" id="edit_${slot.key}" ${preview ? "" : "disabled"}>調整位置</button>
        <button type="button" class="ghost" id="clear_${slot.key}" ${preview ? "" : "disabled"}>清除</button>
      </div>
    `;

    uploadGrid.appendChild(wrap);

    const fileInput = wrap.querySelector(`#file_${slot.key}`);
    const editBtn = wrap.querySelector(`#edit_${slot.key}`);
    const clearBtn = wrap.querySelector(`#clear_${slot.key}`);

    fileInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if(!file) return;
      if(file.size > MAX_FILE_SIZE){
        setStatus("圖片過大，請選擇 20MB 以下圖片。");
        e.target.value = "";
        return;
      }
      await openCropForSlot(slot.key, file);
      e.target.value = "";
    });

    editBtn?.addEventListener("click", async () => {
      const current = imageState.files[slot.key];
      if(!current?.sourceFile) return;
      await openCropForSlot(slot.key, current.sourceFile, current.cropData || null);
    });

    clearBtn?.addEventListener("click", () => {
      clearSlot(slot.key);
    });
  });
}

function clearSlot(slotKey){
  const old = imageState.files[slotKey];
  if(old?.previewUrl?.startsWith("blob:")){
    try{ URL.revokeObjectURL(old.previewUrl); }catch(_){}
  }
  imageState.files[slotKey] = null;
  renderUploadGrid();
  renderPreview();
  renderSummary();
}

async function openCropForSlot(slotKey, file, existingCrop = null){
  const slot = IMAGE_SLOTS.find(s => s.key === slotKey);
  if(!slot) return;

  const prepared = await prepareImage(file);

  imageState.crop.slot = slotKey;
  imageState.crop.file = file;
  imageState.crop.img = prepared.img;
  imageState.crop.targetW = slot.w;
  imageState.crop.targetH = slot.h;

  const ratioClass = slot.shape === "square" ? "ratio-square" : "ratio-photo";
  if(cropStage){
    cropStage.classList.remove("ratio-square", "ratio-logo", "ratio-photo");
    cropStage.classList.add(ratioClass);
  }

  if(cropTitle) cropTitle.textContent = `調整${slot.label}位置`;
  if(cropDesc){
    cropDesc.textContent = slot.shape === "square"
      ? "可拖移位置，並用按鈕放大、縮小、置中、重設後再套用。"
      : "照片牆橫圖支援上下左右拖移與縮放，套用後會同步更新預覽。";
  }

  openCropModal();
  resetCropView(existingCrop);
  drawCropCanvas();
}

function openCropModal(){
  if(cropModal) cropModal.classList.add("show");
}

function closeCropModal(){
  if(cropModal) cropModal.classList.remove("show");
  imageState.crop.dragging = false;
}

function getCanvasRect(){
  const rect = cropCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    cssW: rect.width || 300,
    cssH: rect.height || 300,
    pxW: Math.max(1, Math.round((rect.width || 300) * dpr)),
    pxH: Math.max(1, Math.round((rect.height || 300) * dpr)),
    dpr
  };
}

function resetCropView(existingCrop){
  const c = imageState.crop;
  if(!c.img) return;

  const rect = getCanvasRect();
  const fitScale = Math.max(rect.pxW / c.img.width, rect.pxH / c.img.height);

  c.minScale = fitScale;
  c.scale = existingCrop?.scale ? Math.max(fitScale, existingCrop.scale) : fitScale;
  c.offsetX = Number(existingCrop?.offsetX || 0);
  c.offsetY = Number(existingCrop?.offsetY || 0);
  clampCrop();
}

function clampCrop(){
  const c = imageState.crop;
  if(!c.img) return;
  const rect = getCanvasRect();

  const drawW = c.img.width * c.scale;
  const drawH = c.img.height * c.scale;

  const maxX = Math.max(0, (drawW - rect.pxW) / 2);
  const maxY = Math.max(0, (drawH - rect.pxH) / 2);

  c.offsetX = Math.max(-maxX, Math.min(maxX, c.offsetX));
  c.offsetY = Math.max(-maxY, Math.min(maxY, c.offsetY));
}

function drawCropCanvas(){
  const c = imageState.crop;
  if(!cropCanvas || !c.img) return;

  const rect = getCanvasRect();
  cropCanvas.width = rect.pxW;
  cropCanvas.height = rect.pxH;

  const ctx = cropCanvas.getContext("2d");
  ctx.clearRect(0, 0, rect.pxW, rect.pxH);

  const drawW = c.img.width * c.scale;
  const drawH = c.img.height * c.scale;
  const x = (rect.pxW - drawW) / 2 + c.offsetX;
  const y = (rect.pxH - drawH) / 2 + c.offsetY;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(c.img, x, y, drawW, drawH);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.lineWidth = 2 * rect.dpr;
  ctx.strokeRect(0, 0, rect.pxW, rect.pxH);
  ctx.restore();
}

function cropPointer(e){
  if(e.touches?.[0]){
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function bindCropEvents(){
  if(!cropCanvas) return;

  const down = (e) => {
    if(!imageState.crop.img) return;
    const p = cropPointer(e);
    imageState.crop.dragging = true;
    imageState.crop.startX = p.x;
    imageState.crop.startY = p.y;
    imageState.crop.baseX = imageState.crop.offsetX;
    imageState.crop.baseY = imageState.crop.offsetY;
    e.preventDefault?.();
  };

  const move = (e) => {
    if(!imageState.crop.dragging) return;
    const p = cropPointer(e);
    imageState.crop.offsetX = imageState.crop.baseX + (p.x - imageState.crop.startX);
    imageState.crop.offsetY = imageState.crop.baseY + (p.y - imageState.crop.startY);
    clampCrop();
    drawCropCanvas();
    e.preventDefault?.();
  };

  const up = () => {
    imageState.crop.dragging = false;
  };

  cropCanvas.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);

  cropCanvas.addEventListener("touchstart", down, { passive:false });
  window.addEventListener("touchmove", move, { passive:false });
  window.addEventListener("touchend", up);
  window.addEventListener("touchcancel", up);

  cropZoomIn?.addEventListener("click", () => {
    const c = imageState.crop;
    c.scale *= 1.1;
    clampCrop();
    drawCropCanvas();
  });

  cropZoomOut?.addEventListener("click", () => {
    const c = imageState.crop;
    c.scale = Math.max(c.minScale, c.scale * 0.9);
    clampCrop();
    drawCropCanvas();
  });

  cropCenter?.addEventListener("click", () => {
    imageState.crop.offsetX = 0;
    imageState.crop.offsetY = 0;
    drawCropCanvas();
  });

  cropReset?.addEventListener("click", () => {
    resetCropView();
    drawCropCanvas();
  });

  cropCancel?.addEventListener("click", () => {
    closeCropModal();
  });

  cropApply?.addEventListener("click", async () => {
    await applyCrop();
  });

  cropModal?.addEventListener("click", (e) => {
    if(e.target === cropModal) closeCropModal();
  });
}

async function applyCrop(){
  const c = imageState.crop;
  const slot = IMAGE_SLOTS.find(s => s.key === c.slot);
  if(!slot || !c.img) return;

  const rect = getCanvasRect();
  const stageCanvas = document.createElement("canvas");
  stageCanvas.width = rect.pxW;
  stageCanvas.height = rect.pxH;
  const sctx = stageCanvas.getContext("2d");

  const drawW = c.img.width * c.scale;
  const drawH = c.img.height * c.scale;
  const x = (rect.pxW - drawW) / 2 + c.offsetX;
  const y = (rect.pxH - drawH) / 2 + c.offsetY;

  sctx.fillStyle = "#ffffff";
  sctx.fillRect(0, 0, rect.pxW, rect.pxH);
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(c.img, x, y, drawW, drawH);

  const out = document.createElement("canvas");
  out.width = slot.w;
  out.height = slot.h;
  const octx = out.getContext("2d");
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, slot.w, slot.h);
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(stageCanvas, 0, 0, slot.w, slot.h);

  const blob = await canvasToBlob(out, "image/jpeg", 0.9);
  const previewUrl = URL.createObjectURL(blob);

  const old = imageState.files[slot.key];
  if(old?.previewUrl?.startsWith("blob:")){
    try{ URL.revokeObjectURL(old.previewUrl); }catch(_){}
  }

  imageState.files[slot.key] = {
    sourceFile: c.file,
    blob,
    previewUrl,
    cropData: {
      scale: c.scale,
      offsetX: c.offsetX,
      offsetY: c.offsetY
    }
  };

  closeCropModal();
  renderUploadGrid();
  renderPreview();
  renderSummary();
  setStatus(`${slot.label} 已套用完成`);
}

async function prepareImage(file){
  const dataUrl = await readFileAsDataURL(file);
  const rawImg = await loadImage(dataUrl);

  const resized = resizeSmart(rawImg, file.size || 0);
  const resizedBlob = await canvasToBlob(resized.canvas, "image/jpeg", resized.quality);
  const resizedUrl = await blobToDataURL(resizedBlob);
  const finalImg = await loadImage(resizedUrl);

  return {
    img: finalImg,
    quality: resized.quality
  };
}

function resizeSmart(img, size){
  let maxLong = 1800;
  let quality = 0.9;

  if(size > 4 * 1024 * 1024){
    maxLong = 1500;
    quality = 0.84;
  }
  if(size > 10 * 1024 * 1024){
    maxLong = 1200;
    quality = 0.78;
  }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const long = Math.max(w, h);

  if(long <= maxLong){
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, quality };
  }

  const ratio = maxLong / long;
  const nw = Math.round(w * ratio);
  const nh = Math.round(h * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, nw, nh);

  return { canvas, quality };
}

function readFileAsDataURL(file){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("讀取圖片失敗"));
    fr.readAsDataURL(file);
  });
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("載入圖片失敗"));
    img.src = src;
  });
}

function canvasToBlob(canvas, type, quality){
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if(blob) resolve(blob);
      else reject(new Error("輸出圖片失敗"));
    }, type, quality);
  });
}

function blobToDataURL(blob){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("Blob 轉換失敗"));
    fr.readAsDataURL(blob);
  });
}

function escapeHtml(str){
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* =========================
   預覽同步
========================= */

function renderPreview(){
  const data = getFormData();

  if($("previewName")) $("previewName").textContent = data.name || "您的姓名";
  if($("previewUnit")) $("previewUnit").textContent = data.unit || "";
  if($("previewTitle")) $("previewTitle").textContent = data.title || "";
  if($("previewSlogan")) $("previewSlogan").textContent = data.slogan || "";

  const services = data.services || "";
  const experience = data.experience || "";

  if($("previewServices")) $("previewServices").textContent = services;
  if($("previewExperience")) $("previewExperience").textContent = experience;

  if($("previewServicesBlock")) $("previewServicesBlock").style.display = services ? "" : "none";
  if($("previewExperienceBlock")) $("previewExperienceBlock").style.display = experience ? "" : "none";

  const avatar = imageState.files.avatar?.previewUrl || "";
  const logo = imageState.files.logo?.previewUrl || "";

  const previewAvatar = $("previewAvatar");
  const previewLogo = $("previewLogo");
  const previewLogoWrap = $("previewLogoWrap");

  if(previewAvatar){
    if(avatar){
      previewAvatar.src = avatar;
      previewAvatar.style.display = "block";
    }else{
      previewAvatar.removeAttribute("src");
      previewAvatar.style.display = "none";
    }
  }

  if(previewLogo && previewLogoWrap){
    if(logo){
      previewLogo.src = logo;
      previewLogoWrap.style.display = "";
    }else{
      previewLogo.removeAttribute("src");
      previewLogoWrap.style.display = "none";
    }
  }

  const photoWall = $("previewPhotoWall");
  const emptyPhotos = $("previewEmptyPhotos");
  if(photoWall){
    photoWall.innerHTML = "";

    const photoKeys = ["photo1", "photo2", "photo3", "photo4", "photo5"]
      .filter(slotEnabled);

    const urls = photoKeys
      .map(k => imageState.files[k]?.previewUrl || "")
      .filter(Boolean);

    urls.forEach((url) => {
      const item = document.createElement("div");
      item.className = "hsc-preview-photoItem";
      item.innerHTML = `<img src="${escapeHtml(url)}" alt="圖片預覽">`;
      photoWall.appendChild(item);
    });

    if(emptyPhotos) emptyPhotos.style.display = urls.length ? "none" : "";
  }

  const liveCard = $("livePreviewCard");
  if(liveCard){
    liveCard.dataset.plan = data.plan || "free";
    liveCard.dataset.color = data.color || "c1";
    liveCard.dataset.style = data.style || "s1";
    liveCard.dataset.paper = data.paper || "f1";
  }
}

document.addEventListener("input", (e) => {
  if(e.target.matches("input, textarea, select")){
    renderPreview();
  }
});

bindCropEvents();
renderUploadGrid();
renderPreview();
/* =========================
   送出流程（🔥核心）
========================= */

const btnSubmit = $("btnSubmit");
const btnTest = $("btnTest");
const btnReset = $("btnReset");

const progressWrap = $("submitProgressWrap");
const progressFill = $("submitProgressFill");
const progressText = $("submitProgressText");
const progressPercent = $("submitProgressPercent");

const successBox = $("submitSuccessBox");
const successIdEl = $("successCardId");
const successCopyText = $("successCopyText");
const copyBtn = $("copyBtn");

const statusEl = $("status");

/* =========================
   狀態顯示
========================= */
function setStatus(msg){
  if(statusEl) statusEl.textContent = msg;
}

/* =========================
   進度條控制
========================= */
function showProgress(){
  if(progressWrap) progressWrap.style.display = "block";
}

function setProgress(p, msg){
  if(progressFill) progressFill.style.width = p + "%";
  if(progressPercent) progressPercent.textContent = p + "%";
  if(progressText && msg) progressText.textContent = msg;
}

/* =========================
   成功顯示
========================= */
function showSuccess(id){
  if(!successBox) return;

  successBox.style.display = "block";
  if(successIdEl) successIdEl.textContent = id;

  const copyText =
`您好，我已完成智慧名片資料填寫

我的資料ID是：${id}

請協助確認並進入製作流程，謝謝 🙏`;

  if(successCopyText) successCopyText.value = copyText;
}

/* =========================
   複製功能
========================= */
copyBtn?.addEventListener("click", async () => {
  const text = successCopyText?.value || "";
  if(!text) return;

  try{
    await navigator.clipboard.writeText(text);
    setStatus("已複製客服文案 👍");
  }catch(err){
    // fallback
    successCopyText.select();
    document.execCommand("copy");
    setStatus("已複製（備援）");
  }
});

/* =========================
   測試連線
========================= */
btnTest?.addEventListener("click", async () => {
  setStatus("測試中...");
  try{
    const res = await fetch(GAS_URL + "?action=ping");
    const json = await res.json();
    setStatus("連線成功：" + (json?.status || "OK"));
  }catch(err){
    setStatus("連線失敗：" + err.message);
  }
});

/* =========================
   重設
========================= */
btnReset?.addEventListener("click", () => {
  if(confirm("確定要清空所有資料？")){
    location.reload();
  }
});

/* =========================
   主送出
========================= */
btnSubmit?.addEventListener("click", async () => {

  const data = getFormData();

  if(!data.plan){
    setStatus("請先選擇方案");
    showPage(0);
    return;
  }

  if(!data.name){
    setStatus("請填寫姓名");
    showPage(1);
    return;
  }

  try{

    setStatus("開始送出...");
    showProgress();

    setProgress(10, "整理資料中...");

    /* =========================
       整理 payload
    ========================= */
    const payload = {
      action: "create",
      ...data
    };

    /* =========================
       加入圖片（base64）
    ========================= */
    setProgress(30, "處理圖片...");

    for(const key in imageState.files){
      const fileObj = imageState.files[key];
      if(fileObj?.blob){
        payload[key + "_img"] = await blobToDataURL(fileObj.blob);
      }
    }

    /* =========================
       發送
    ========================= */
    setProgress(60, "送出資料到伺服器...");

    const res = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers:{
        "Content-Type":"application/json"
      }
    });

    setProgress(80, "等待回應...");

    const json = await res.json();

    if(!json || json.status !== "ok"){
      throw new Error(json?.message || "送出失敗");
    }

    const id = json.id || "UNKNOWN";

    setProgress(100, "完成！");

    setStatus("送出成功");

    /* =========================
       顯示成功區
    ========================= */
    showSuccess(id);

  }catch(err){
    console.error(err);
    setStatus("送出失敗：" + err.message);
    setProgress(0, "發生錯誤");
  }

});
/* =========================
   設定 / 初始化 / 防呆
========================= */

const GAS_URL = (($("gas")?.value || "").trim()) || "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

/* =========================
   Toast
========================= */
const toastEl = $("toast");

function showToast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg || "";
  toastEl.style.position = "fixed";
  toastEl.style.left = "50%";
  toastEl.style.bottom = "24px";
  toastEl.style.transform = "translateX(-50%)";
  toastEl.style.background = "rgba(0,0,0,.82)";
  toastEl.style.color = "#fff";
  toastEl.style.padding = "10px 14px";
  toastEl.style.borderRadius = "999px";
  toastEl.style.fontSize = "13px";
  toastEl.style.zIndex = "9999";
  toastEl.style.display = "block";

  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.style.display = "none";
  }, 1800);
}

/* =========================
   Loading Overlay
========================= */
const loadingOverlay = $("loadingOverlay");

function setLoading(on, text){
  if(!loadingOverlay) return;
  const textEl = loadingOverlay.querySelector(".loadingText");
  if(textEl && text) textEl.textContent = text;
  loadingOverlay.style.display = on ? "flex" : "none";
}

/* =========================
   強制方案規則
========================= */
function enforcePlanRules(payload){
  const plan = payload.plan || "";

  if(plan === "free"){
    payload.cta_text_2 = "";
    payload.cta_link_2 = "";
    payload.cta_text_3 = "";
    payload.cta_link_3 = "";

    if(payload.photo3_img) delete payload.photo3_img;
    if(payload.photo4_img) delete payload.photo4_img;
    if(payload.photo5_img) delete payload.photo5_img;
  }

  if(plan !== "premium" && plan !== "free"){
    throw new Error("請先選擇方案");
  }

  return payload;
}

/* =========================
   基本驗證
========================= */
function validateBeforeSubmit(data){
  if(!data.plan){
    showPage(0);
    throw new Error("請先選擇方案");
  }

  if(!data.name){
    showPage(1);
    throw new Error("請填寫姓名");
  }

  const contactOK = !!(
    data.phone ||
    data.email ||
    data.line_url ||
    data.line_oa ||
    data.wechat_id
  );

  if(!contactOK){
    showPage(2);
    throw new Error("請至少填寫一種聯絡方式");
  }

  validateCTAGroup(data);
  return true;
}

function validateCTAGroup(data){
  const plan = data.plan;
  const max = plan === "premium" ? 3 : 1;

  for(let i=1; i<=max; i++){
    const t = String(data[`cta_text_${i}`] || "").trim();
    const l = String(data[`cta_link_${i}`] || "").trim();

    if((t && !l) || (!t && l)){
      showPage(3);
      throw new Error(`CTA ${i} 需同時填寫文字與連結`);
    }
  }
}

/* =========================
   送出用圖片整理
========================= */
async function appendImagePayload(payload){
  const order = ["avatar","logo","photo1","photo2","photo3","photo4","photo5"];

  for(const key of order){
    if(!slotEnabled(key)) continue;

    const fileObj = imageState.files[key];
    if(fileObj?.blob){
      payload[`${key}_img`] = await blobToDataURL(fileObj.blob);
    }else{
      payload[`${key}_img`] = "";
    }
  }
  return payload;
}

/* =========================
   對應舊欄位相容
========================= */
function normalizeLegacyFields(payload){
  payload.avatar_img = payload.avatar_img || "";
  payload.logo_img = payload.logo_img || "";
  payload.photo1_img = payload.photo1_img || "";
  payload.photo2_img = payload.photo2_img || "";
  payload.photo3_img = payload.photo3_img || "";
  payload.photo4_img = payload.photo4_img || "";
  payload.photo5_img = payload.photo5_img || "";
  return payload;
}

/* =========================
   成功文案生成
========================= */
function buildServiceReplyText(cardId){
  const id = String(cardId || "").trim() || "（未取得ID）";
  return [
    "您好，我已完成智慧名片資料填寫",
    "",
    `我的資料ID是：${id}`,
    "",
    "請協助確認並進入製作流程，謝謝 🙏"
  ].join("\n");
}

/* =========================
   成功區更新
========================= */
function fillSuccessBox(cardId){
  if(successIdEl) successIdEl.textContent = cardId || "-";
  if(successCopyText) successCopyText.value = buildServiceReplyText(cardId);
  if(successBox) successBox.style.display = "block";
  showToast("已完成，可直接複製並回覆客服");
}

/* =========================
   copy 備援
========================= */
async function copyText(text){
  const v = String(text || "");
  if(!v) return false;

  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(v);
      return true;
    }
  }catch(_){}

  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return !!ok;
  }catch(_){
    return false;
  }
}

copyBtn?.addEventListener("click", async () => {
  const ok = await copyText(successCopyText?.value || "");
  if(ok){
    setStatus("已複製客服文案");
    showToast("已複製客服文案");
  }else{
    setStatus("複製失敗，請手動複製");
  }
});

/* =========================
   畫面初始化同步
========================= */
function bindLiveSync(){
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", () => {
      renderPreview();
      renderSummary();
    });
    el.addEventListener("change", () => {
      renderPreview();
      renderSummary();
      if(el.id === "plan"){
        applyPlanUI();
        renderUploadGrid();
      }
    });
  });
}

bindLiveSync();

/* =========================
   resize 時重繪 crop
========================= */
window.addEventListener("resize", () => {
  if(cropModal?.classList.contains("show")){
    try{
      drawCropCanvas();
    }catch(_){}
  }
});

/* =========================
   初始狀態
========================= */
setStatus("尚未操作。");
renderSummary();
renderPreview();
renderUploadGrid();
applyPlanUI();
showPage(0);
/* =========================
   最終送出（強化版）
========================= */

let submitting = false;

btnSubmit?.addEventListener("click", async () => {

  if(submitting){
    showToast("資料送出中，請稍候…");
    return;
  }

  let data;

  try{
    data = getFormData();

    /* 🔥 強制驗證 */
    validateBeforeSubmit(data);

  }catch(err){
    setStatus(err.message);
    return;
  }

  try{

    submitting = true;

    setStatus("開始送出...");
    showProgress();
    setProgress(5, "初始化...");

    setLoading(true, "準備送出資料");

    /* =========================
       payload 建立
    ========================= */
    let payload = {
      action: "create",
      ...data
    };

    setProgress(15, "套用方案規則...");
    payload = enforcePlanRules(payload);

    /* =========================
       圖片整理
    ========================= */
    setProgress(30, "處理圖片中...");
    payload = await appendImagePayload(payload);

    payload = normalizeLegacyFields(payload);

    /* =========================
       發送
    ========================= */
    setProgress(55, "連線伺服器...");

    const res = await fetch(GAS_URL, {
      method: "POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(payload)
    });

    if(!res.ok){
      throw new Error("伺服器回應錯誤：" + res.status);
    }

    setProgress(75, "解析回應...");

    let json;
    try{
      json = await res.json();
    }catch(_){
      throw new Error("回應解析失敗");
    }

    if(!json || json.status !== "ok"){
      throw new Error(json?.message || "建立失敗");
    }

    const cardId = json.id || json.card_id || "UNKNOWN";

    setProgress(100, "完成");

    /* =========================
       成功處理
    ========================= */
    setLoading(false);

    setStatus("送出成功");

    fillSuccessBox(cardId);

    /* 🔥 UX：停在第六步 */
    showPage(5);

  }catch(err){

    console.error(err);

    setLoading(false);

    setStatus("送出失敗：" + err.message);

    setProgress(0, "發生錯誤");

    showToast("送出失敗，請稍後再試");

  }finally{
    submitting = false;
  }

});