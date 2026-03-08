/* ======================================
 * HSC Image Resolver v534.1
 * COMPLETE OVERWRITE
 *
 * 規則：
 * 1. 優先 fast
 * 2. 再讀舊 img
 * 3. 再讀 url
 * 4. 保持舊資料相容
 * 5. 補 Google Drive 圖片候補網址
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
    } catch (err) {}

    const m1 = s.match(/[?&]id=([^&]+)/);
    if (m1 && m1[1]) return m1[1];

    const m2 = s.match(/\/file\/d\/([^/]+)/);
    if (m2 && m2[1]) return m2[1];

    return "";
  }

  function getGoogleDriveCandidates(url) {
    const s = clean(url);
    const fileId = extractGoogleDriveFileId(s);
    if (!fileId) return s ? [s] : [];

    return [
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`,
      `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1200`,
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
      s
    ];
  }

  function normalizeImageUrl(url) {
    const s = clean(url);
    if (!s) return "";
    const arr = getGoogleDriveCandidates(s);
    return arr[0] || s;
  }

  function getImageCandidates(url) {
    const s = clean(url);
    if (!s) return [];
    return getGoogleDriveCandidates(s);
  }

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

  function getAvatarCandidates(item = {}) {
    return getImageCandidates(
      pickImage(
        item.avatar_img_fast,
        item.avatar_img,
        item.avatar_url,
        item.avatar
      )
    );
  }

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

  function getPhoto(item = {}, i = 1) {
    const fast = item[`photo${i}_img_fast`];
    const img = item[`photo${i}_img`];
    const url = item[`photo${i}_url`];
    return normalizeImageUrl(pickImage(fast, img, url));
  }

  function getPhotos(item = {}) {
    const arr = [];
    for (let i = 1; i <= 5; i++) {
      const p = getPhoto(item, i);
      if (p) arr.push(p);
    }
    return arr;
  }

  global.pickImage = pickImage;
  global.extractGoogleDriveFileId = extractGoogleDriveFileId;
  global.normalizeImageUrl = normalizeImageUrl;
  global.getImageCandidates = getImageCandidates;
  global.getAvatar = getAvatar;
  global.getAvatarCandidates = getAvatarCandidates;
  global.getLogo = getLogo;
  global.getPhoto = getPhoto;
  global.getPhotos = getPhotos;
})(window);