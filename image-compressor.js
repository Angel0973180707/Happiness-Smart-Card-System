/* ======================================================
 * Happiness Smart Card System — image-compressor.js
 * v502 (COMPLETE OVERWRITE)
 *
 * Exports:
 * - compressToJpeg(file, maxPx, quality?)
 *
 * Usage:
 * - avatar: compressToJpeg(file, 512)
 * - cover : compressToJpeg(file, 1200)
 * ====================================================== */

export async function compressToJpeg(file, maxPx = 1200, quality = 0.85) {
  if (!file) throw new Error("compressToJpeg: missing file");

  const img = await loadImageFromFile(file);

  // keep aspect ratio
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  if (!w || !h) throw new Error("compressToJpeg: invalid image");

  const scale = calcScale(w, h, maxPx);
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(img, 0, 0, tw, th);

  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!blob) throw new Error("compressToJpeg: toBlob failed");

  return blob;
}

function calcScale(w, h, maxPx) {
  const m = Math.max(w, h);
  if (m <= maxPx) return 1;
  return maxPx / m;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("compressToJpeg: image load error"));
    };
    img.src = url;
  });
}