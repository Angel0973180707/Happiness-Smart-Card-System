/* ======================================
 * HSC Image Resolver v533
 * 統一解析所有圖片欄位
 * 規則：
 * 1. 優先 fast
 * 2. 再讀舊 img
 * 3. 再讀 url
 * 4. 保持舊資料相容
 * ====================================== */

(function (global) {
  "use strict";

  function clean(value) {
    if (value === null || value === undefined) return "";
    const s = String(value).trim();
    return s;
  }

  function pickImage(...args) {
    for (const value of args) {
      const s = clean(value);
      if (s) return s;
    }
    return "";
  }

  /* ---------- avatar ---------- */
  function getAvatar(item = {}) {
    return pickImage(
      item.avatar_img_fast,
      item.avatar_img,
      item.avatar_url,
      item.avatar
    );
  }

  /* ---------- logo ---------- */
  function getLogo(item = {}) {
    return pickImage(
      item.logo_img_fast,
      item.logo_img,
      item.logo_url,
      item.logo
    );
  }

  /* ---------- single photo ---------- */
  function getPhoto(item = {}, i = 1) {
    const fast = item[`photo${i}_img_fast`];
    const img = item[`photo${i}_img`];
    const url = item[`photo${i}_url`];
    return pickImage(fast, img, url);
  }

  /* ---------- photo list ---------- */
  function getPhotos(item = {}) {
    const arr = [];
    for (let i = 1; i <= 5; i++) {
      const p = getPhoto(item, i);
      if (p) arr.push(p);
    }
    return arr;
  }

  /* ---------- expose ---------- */
  global.pickImage = pickImage;
  global.getAvatar = getAvatar;
  global.getLogo = getLogo;
  global.getPhoto = getPhoto;
  global.getPhotos = getPhotos;
})(window);