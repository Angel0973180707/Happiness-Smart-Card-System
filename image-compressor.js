/* =========================================================
HSC v502
Image Compressor Module

avatar → 512px
cover  → 1200px

Output:
JPEG
quality 0.85
========================================================= */

export async function compressImage(file, type = "avatar") {

  const MAX_SIZE = {
    avatar: 512,
    cover: 1200
  };

  const maxSize = MAX_SIZE[type] || 512;

  const img = await loadImage(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxSize) {
      height *= maxSize / width;
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width *= maxSize / height;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, 0.85);

  return blob;
}

/* =============================== */

function loadImage(file) {
  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {

      const img = new Image();

      img.onload = () => resolve(img);

      img.onerror = reject;

      img.src = reader.result;
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/* =============================== */

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      blob => resolve(blob),
      "image/jpeg",
      quality
    );
  });
}
