/* ======================================
 * HSC Image Resolver v534
 * COMPLETE OVERWRITE
 *
 * 規則：
 * 1. 優先 fast
 * 2. 再讀舊 img
 * 3. 再讀 url
 * 4. 保持舊資料相容
 * 5. 補 Google Drive 圖片網址正規化
 * ====================================== */

(function (global) {
  "use strict";

  function clean(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function pickImage(...args) {
    for (const value of args) {
      const s = clean(value);
      if (s) return s;
    }
    return "";
  }

  function extractGoogleDriveFileId(url) {
    const s = clean(url);
    if (!s) return "";

    try {
      const u = new URL(s);

      if (u.hostname.includes("drive.google.com")) {
        const idFromQuery = u.searchParams.get("id");
        if (idFromQuery) return idFromQuery;

        const m = u.pathname.match(/\/file\/d\/([^/]+)/);
        if (m && m[1]) return m[1];
      }
    } catch (err) {
      // ignore
    }

    const m1 = s.match(/[?&]id=([^&]+)/);
    if (m1 && m1[1]) return m1[1];

    const m2 = s.match(/\/file\/d\/([^/]+)/);
    if (m2 && m2[1]) return m2[1];

    return "";
  }

  function normalizeImageUrl(url) {
    const s = clean(url);
    if (!s) return "";

    const fileId = extractGoogleDriveFileId(s);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`;
    }

    return s;
  }

  /* ---------- avatar ---------- */
  function getAvatar(item = {}) {
    return normalizeImageUrl(
      pickImage(
        item.avatar_img_fast,
        item.avatar_img,
        item.avatar_url,
        item.avatar
      )
    );
  }

  /* ---------- logo ---------- */
  function getLogo(item = {}) {
    return normalizeImageUrl(
      pickImage(
        item.logo_img_fast,
        item.logo_img,
        item.logo_url,
        item.logo
      )
    );
  }

  /* ---------- single photo ---------- */
  function getPhoto(item = {}, i = 1) {
    const fast = item[`photo${i}_img_fast`];
    const img = item[`photo${i}_img`];
    const url = item[`photo${i}_url`];
    return normalizeImageUrl(pickImage(fast, img, url));
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
  global.normalizeImageUrl = normalizeImageUrl;
  global.extractGoogleDriveFileId = extractGoogleDriveFileId;
  global.getAvatar = getAvatar;
  global.getLogo = getLogo;
  global.getPhoto = getPhoto;
  global.getPhotos = getPhotos;
})(window);