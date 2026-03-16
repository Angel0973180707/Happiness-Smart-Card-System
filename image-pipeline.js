
/* ======================================================
 * Happiness Smart Card System — image-pipeline.js
 * HSCv802 (COMPLETE OVERWRITE)
 *
 * Purpose:
 * - Shared image pipeline for form.js / update-form.js
 * - Read file
 * - Preview
 * - Crop / zoom / pan
 * - Center / reset / apply
 * - Compress to jpg
 * - Upload to Firebase Storage
 * - Return *_url
 *
 * Depends on:
 * - firebase.js
 * ====================================================== */

import { uploadAvatar, uploadLogo, uploadPhoto } from "./firebase.js";

/* =========================
 * helpers
 * ========================= */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isImageFile(file) {
  return !!(file && /^image\//i.test(file.type || ""));
}

function revokeUrlSafe(url) {
  try {
    if (url) URL.revokeObjectURL(url);
  } catch (_) {}
}

function fileToObjectUrl(file) {
  return URL.createObjectURL(file);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("圖片載入失敗"));
    img.src = url;
  });
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("圖片輸出失敗"));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

/* =========================
 * editor class
 * ========================= */
export class HSCImageEditor {
  constructor(options = {}) {
    this.slot = options.slot || "avatar";
    this.cardId = options.cardId || "";
    this.stageEl = options.stageEl || null;
    this.previewEl = options.previewEl || null;
    this.statusEl = options.statusEl || null;
    this.onUploaded = typeof options.onUploaded === "function" ? options.onUploaded : null;

    this.viewportSize = Number(options.viewportSize || 280);
    this.exportSize = Number(options.exportSize || 1200);
    this.jpegQuality = Number(options.jpegQuality || 0.9);
    this.minScaleRatio = Number(options.minScaleRatio || 1);
    this.maxScaleRatio = Number(options.maxScaleRatio || 4);

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.viewportSize;
    this.canvas.height = this.viewportSize;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none";
    this.ctx = this.canvas.getContext("2d");

    if (!this.stageEl) {
      throw new Error("stageEl is required");
    }
    this.stageEl.innerHTML = "";
    this.stageEl.appendChild(this.canvas);

    this.file = null;
    this.image = null;
    this.objectUrl = "";
    this.appliedBlob = null;
    this.appliedUrl = "";

    this.baseScale = 1;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOriginX = 0;
    this.dragOriginY = 0;

    this.bindEvents();
    this.renderEmpty();
  }

  setCardId(cardId) {
    this.cardId = String(cardId || "").trim();
  }

  setStatus(msg, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg || "";
    this.statusEl.style.color = isError ? "#c62828" : "";
  }

  bindEvents() {
    this.canvas.addEventListener("mousedown", this.handlePointerDown);
    window.addEventListener("mousemove", this.handlePointerMove);
    window.addEventListener("mouseup", this.handlePointerUp);

    this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    window.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    window.addEventListener("touchend", this.handlePointerUp, { passive: false });

    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  destroy() {
    revokeUrlSafe(this.objectUrl);
    revokeUrlSafe(this.appliedUrl);

    this.canvas.removeEventListener("mousedown", this.handlePointerDown);
    window.removeEventListener("mousemove", this.handlePointerMove);
    window.removeEventListener("mouseup", this.handlePointerUp);

    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handlePointerUp);

    this.canvas.removeEventListener("wheel", this.handleWheel);
  }

  handlePointerDown = (e) => {
    if (!this.image) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragOriginX = this.offsetX;
    this.dragOriginY = this.offsetY;
  };

  handlePointerMove = (e) => {
    if (!this.isDragging || !this.image) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.offsetX = this.dragOriginX + dx;
    this.offsetY = this.dragOriginY + dy;
    this.render();
  };

  handlePointerUp = () => {
    this.isDragging = false;
  };

  handleTouchStart = (e) => {
    if (!this.image) return;
    if (!e.touches || !e.touches[0]) return;
    e.preventDefault();
    const t = e.touches[0];
    this.isDragging = true;
    this.dragStartX = t.clientX;
    this.dragStartY = t.clientY;
    this.dragOriginX = this.offsetX;
    this.dragOriginY = this.offsetY;
  };

  handleTouchMove = (e) => {
    if (!this.isDragging || !this.image) return;
    if (!e.touches || !e.touches[0]) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - this.dragStartX;
    const dy = t.clientY - this.dragStartY;
    this.offsetX = this.dragOriginX + dx;
    this.offsetY = this.dragOriginY + dy;
    this.render();
  };

  handleWheel = (e) => {
    if (!this.image) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    this.zoom(delta);
  };

  renderEmpty() {
    const c = this.canvas;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "14px sans-serif";
    ctx.fillText("尚未選擇圖片", c.width / 2, c.height / 2);
  }

  async loadFile(file) {
    if (!file) throw new Error("沒有選擇檔案");
    if (!isImageFile(file)) throw new Error("請選擇圖片檔");
    this.setStatus("讀取圖片中…");

    revokeUrlSafe(this.objectUrl);
    this.file = file;
    this.objectUrl = fileToObjectUrl(file);
    this.image = await loadImage(this.objectUrl);

    this.fitToCenter();
    this.render();
    this.setStatus("可拖移、縮放、置中，按套用完成裁切");
  }

  fitToCenter() {
    if (!this.image) return;

    const vw = this.canvas.width;
    const vh = this.canvas.height;
    const iw = this.image.width;
    const ih = this.image.height;

    this.baseScale = Math.max(vw / iw, vh / ih);
    this.scale = this.baseScale;
    this.center();
  }

  center() {
    if (!this.image) return;
    const drawW = this.image.width * this.scale;
    const drawH = this.image.height * this.scale;
    this.offsetX = (this.canvas.width - drawW) / 2;
    this.offsetY = (this.canvas.height - drawH) / 2;
    this.render();
  }

  reset() {
    if (!this.image) {
      this.renderEmpty();
      return;
    }
    this.fitToCenter();
    this.setStatus("已重設圖片位置");
  }

  zoom(delta) {
    if (!this.image) return;
    const minScale = this.baseScale * this.minScaleRatio;
    const maxScale = this.baseScale * this.maxScaleRatio;
    this.scale = clamp(this.scale + delta, minScale, maxScale);
    this.render();
  }

  zoomIn(step = 0.1) {
    this.zoom(Math.abs(step));
  }

  zoomOut(step = 0.1) {
    this.zoom(-Math.abs(step));
  }

  render() {
    const c = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#eef2f7";
    ctx.fillRect(0, 0, c.width, c.height);

    if (!this.image) return;

    const drawW = this.image.width * this.scale;
    const drawH = this.image.height * this.scale;

    ctx.drawImage(this.image, this.offsetX, this.offsetY, drawW, drawH);

    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, c.width - 2, c.height - 2);
  }

  async apply() {
    if (!this.image) throw new Error("請先選擇圖片");

    const out = document.createElement("canvas");
    out.width = this.exportSize;
    out.height = this.exportSize;
    const octx = out.getContext("2d");

    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, out.width, out.height);

    const ratio = out.width / this.canvas.width;
    octx.drawImage(
      this.image,
      this.offsetX * ratio,
      this.offsetY * ratio,
      this.image.width * this.scale * ratio,
      this.image.height * this.scale * ratio
    );

    const blob = await canvasToBlob(out, "image/jpeg", this.jpegQuality);
    this.appliedBlob = blob;

    revokeUrlSafe(this.appliedUrl);
    this.appliedUrl = URL.createObjectURL(blob);

    if (this.previewEl) {
      this.previewEl.src = this.appliedUrl;
      this.previewEl.hidden = false;
    }

    this.setStatus("已套用裁切結果");
    return blob;
  }

  clear() {
    this.file = null;
    this.image = null;
    this.appliedBlob = null;

    revokeUrlSafe(this.objectUrl);
    revokeUrlSafe(this.appliedUrl);
    this.objectUrl = "";
    this.appliedUrl = "";

    if (this.previewEl) {
      this.previewEl.src = "";
      this.previewEl.hidden = true;
    }

    this.renderEmpty();
    this.setStatus("已清除圖片");
  }

  async upload() {
    if (!this.cardId) throw new Error("缺少 cardId");
    const blob = this.appliedBlob;
    if (!blob) throw new Error("請先按套用，再上傳");

    this.setStatus("上傳圖片中…");

    let url = "";
    if (this.slot === "avatar") {
      url = await uploadAvatar(this.cardId, blob);
    } else if (this.slot === "logo") {
      url = await uploadLogo(this.cardId, blob);
    } else if (/^photo[1-5]$/.test(this.slot)) {
      const index = Number(this.slot.replace("photo", ""));
      url = await uploadPhoto(this.cardId, blob, index);
    } else {
      throw new Error(`不支援的圖片槽位：${this.slot}`);
    }

    this.setStatus("圖片上傳完成");

    if (this.onUploaded) {
      this.onUploaded(url, this.slot);
    }

    return url;
  }

  async applyAndUpload() {
    await this.apply();
    return await this.upload();
  }
}

/* =========================
 * factory
 * ========================= */
export function createImageEditor(options) {
  return new HSCImageEditor(options);
}

/* =========================
 * quick binder
 * 可選：若 form.js / update-form.js 想快速綁定一整組按鈕可用
 * ========================= */
export function bindEditorControls(editor, controls = {}) {
  if (!editor) throw new Error("editor is required");

  const {
    fileInput,
    zoomInBtn,
    zoomOutBtn,
    centerBtn,
    resetBtn,
    applyBtn,
    uploadBtn,
    clearBtn
  } = controls;

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      try {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        await editor.loadFile(file);
      } catch (err) {
        console.error(err);
        editor.setStatus(err.message || String(err), true);
      }
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => editor.zoomIn());
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => editor.zoomOut());
  }

  if (centerBtn) {
    centerBtn.addEventListener("click", () => editor.center());
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => editor.reset());
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", async () => {
      try {
        await editor.apply();
      } catch (err) {
        console.error(err);
        editor.setStatus(err.message || String(err), true);
      }
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
      try {
        await editor.upload();
      } catch (err) {
        console.error(err);
        editor.setStatus(err.message || String(err), true);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => editor.clear());
  }

  return editor;
}

/* =========================
 * slot helpers
 * ========================= */
export function slotToField(slot) {
  if (slot === "avatar") return "avatar_url";
  if (slot === "logo") return "logo_url";
  if (/^photo[1-5]$/.test(slot)) return `${slot}_url`;
  throw new Error(`unknown slot: ${slot}`);
}

export function buildUploadPayload(slot, url) {
  return {
    [slotToField(slot)]: String(url || "")
  };
}