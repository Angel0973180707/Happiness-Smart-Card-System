/* ======================================================
 * Happiness Smart Card System — firebase.js
 * HSCv803 (COMPLETE OVERWRITE)
 *
 * v803 新增：
 * - 接入 image-compressor.js
 * - 上傳前自動壓縮（依檔名判斷尺寸）：
 *   • avatar.jpg → 512px, quality 0.85
 *   • logo.jpg   → 400px, quality 0.90
 *   • photoN.jpg → 1080px, quality 0.82
 * - 觸發條件：檔案 > 800KB 才壓縮
 * - 非圖片檔（blob.type 非 image/*）不壓縮
 * - 壓縮失敗 fallback 原檔上傳（不影響建卡流程）
 * ====================================================== */

export const HSC_FRONTEND_VERSION = "v803";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
  authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
  projectId: "happiness-smart-card-pro-7389a",
  storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
  messagingSenderId: "143313936007",
  appId: "1:143313936007:web:7c948563c51e8a47d3a222"
};

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { compressToJpeg } from "./image-compressor.js";

let _app = null;
let _auth = null;
let _storage = null;
let _inited = false;
let _signing = null;

// ── 壓縮設定表 ─────────────────────────────────────────
const COMPRESS_THRESHOLD = 800 * 1024; // 檔案 > 800KB 才壓縮

const COMPRESS_PROFILES = {
  avatar: { maxPx: 512,  quality: 0.85 },
  logo:   { maxPx: 400,  quality: 0.90 },
  photo:  { maxPx: 1080, quality: 0.82 },
  banner: { maxPx: 1600, quality: 0.85 },
  default:{ maxPx: 1080, quality: 0.82 }
};

function pickProfile(fileName) {
  const n = String(fileName || "").toLowerCase();
  if (/^avatar/.test(n))    return COMPRESS_PROFILES.avatar;
  if (/^logo/.test(n))      return COMPRESS_PROFILES.logo;
  if (/^photo\d+/.test(n))  return COMPRESS_PROFILES.photo;
  if (/^banner/.test(n))    return COMPRESS_PROFILES.banner;
  return COMPRESS_PROFILES.default;
}

async function maybeCompress(blob, fileName) {
  if (!blob) return blob;

  // 非圖片檔不壓縮
  if (!/^image\//i.test(blob.type || "")) return blob;

  // 檔案太小不壓縮
  if (blob.size <= COMPRESS_THRESHOLD) return blob;

  try {
    const profile = pickProfile(fileName);
    const compressed = await compressToJpeg(blob, profile.maxPx, profile.quality);

    // 壓縮後反而變大（極少見）就用原檔
    if (compressed && compressed.size > 0 && compressed.size < blob.size) {
      if (console && console.debug) {
        console.debug(
          `[HSC ${HSC_FRONTEND_VERSION}] compressed ${fileName}: `
          + `${Math.round(blob.size/1024)}KB → ${Math.round(compressed.size/1024)}KB`
        );
      }
      return compressed;
    }
    return blob;
  } catch (err) {
    // 壓縮失敗就用原檔，不中斷流程
    if (console && console.warn) {
      console.warn(`[HSC ${HSC_FRONTEND_VERSION}] compress failed, using original:`, err);
    }
    return blob;
  }
}

// ── 共用工具 ───────────────────────────────────────────
function clean(v) { return String(v == null ? "" : v).trim(); }

function normalizeCardId(cardId) {
  const v = clean(cardId);
  if (!v) throw new Error("uploadImage: missing cardId");
  return v.replace(/[^\w-]/g, "");
}

function normalizeFileName(fileName) {
  const v = clean(fileName).toLowerCase();
  if (!v) throw new Error("uploadImage: missing fileName");
  if (!/^[a-z0-9._-]+$/.test(v)) throw new Error(`uploadImage: invalid fileName: ${fileName}`);
  return v;
}

// ── Auth ───────────────────────────────────────────────
export function initFirebase() {
  if (_inited && _app && _auth && _storage) return { app: _app, auth: _auth, storage: _storage };

  const apps = getApps();
  _app = apps && apps.length ? apps[0] : initializeApp(FIREBASE_CONFIG);

  _auth = getAuth(_app);
  _storage = getStorage(_app);

  _inited = true;
  return { app: _app, auth: _auth, storage: _storage };
}

export async function ensureAuth() {
  initFirebase();

  if (_auth.currentUser) return _auth.currentUser;
  if (_signing) return _signing;

  _signing = (async () => (await signInAnonymously(_auth)).user)();

  try {
    return await _signing;
  } finally {
    _signing = null;
  }
}

// ── Upload ─────────────────────────────────────────────
export async function uploadImage(cardId, blob, fileName) {
  if (!blob) throw new Error("uploadImage: missing blob");

  await ensureAuth();

  const safeCardId = normalizeCardId(cardId);
  const safeFileName = normalizeFileName(fileName);

  // 🆕 v803：上傳前自動壓縮
  const finalBlob = await maybeCompress(blob, safeFileName);

  const max = 5 * 1024 * 1024;
  if (finalBlob.size > max) {
    throw new Error("uploadImage: blob too large (>5MB). Please compress more.");
  }

  const contentType = finalBlob.type || "image/jpeg";
  if (!/^image\//i.test(contentType)) {
    throw new Error(`uploadImage: invalid content type: ${contentType}`);
  }

  const path = `cards/${safeCardId}/${safeFileName}`;
  const storageRef = ref(_storage, path);

  await uploadBytes(storageRef, finalBlob, {
    contentType,
    cacheControl: "public,max-age=31536000,immutable"
  });

  return await getDownloadURL(storageRef);
}

// ── Helpers ────────────────────────────────────────────
export const uploadAvatar = (cardId, blob) =>
  uploadImage(cardId, blob, "avatar.jpg");

export const uploadLogo = (cardId, blob) =>
  uploadImage(cardId, blob, "logo.jpg");

export const uploadPhoto = (cardId, blob, index = 1) => {
  const i = Math.max(1, Math.min(10, Number(index) || 1));
  return uploadImage(cardId, blob, `photo${i}.jpg`);
};

export function getFirebaseInfo() {
  initFirebase();

  return {
    version: HSC_FRONTEND_VERSION,
    authed: !!(_auth && _auth.currentUser),
    uid: (_auth && _auth.currentUser) ? _auth.currentUser.uid : "",
    officialBasePath: "cards/{cardId}/",
    compressProfiles: COMPRESS_PROFILES,
    compressThresholdKB: Math.round(COMPRESS_THRESHOLD / 1024),
    files: [
      "avatar.jpg",
      "logo.jpg",
      "banner.jpg",
      "photo1.jpg",
      "photo2.jpg",
      "photo3.jpg",
      "photo4.jpg",
      "photo5.jpg",
      "photo6.jpg",
      "photo7.jpg",
      "photo8.jpg",
      "photo9.jpg",
      "photo10.jpg"
    ]
  };
}
