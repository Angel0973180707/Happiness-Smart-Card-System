/* ======================================================
 * Happiness Smart Card System — Frontend firebase.js
 * v502 (COMPLETE OVERWRITE)
 *
 * Purpose:
 * - Initialize Firebase (v9 modular via CDN ESM)
 * - Anonymous sign-in (once)
 * - Upload compressed images to Firebase Storage
 * - Return downloadURL
 *
 * Rules alignment (current):
 * - Storage path: hsc_cards/{tenant}/{cardId}/{fileName}
 * - allow write only when auth != null
 * - tenant currently locked: "angel"
 * - fileName extension: png/jpg/jpeg/webp
 * - contentType image/*
 * - size < 5MB
 *
 * We upload JPEG blobs (image/jpeg) with .jpg filename.
 * ====================================================== */

const HSC_FRONTEND_VERSION = "v502";

// ✅ 你目前 tenant 鎖定 angel（與 Rules v1 對齊）
const TENANT = "angel";

/** ✅ 請填入你 Firebase Console 的 web app config */
const FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  appId: "REPLACE_ME"
};

/** Firebase v9 ESM CDN imports (pin a version for stability) */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* =============================
 * Internal singleton
 * ============================= */

let _app = null;
let _auth = null;
let _storage = null;
let _inited = false;
let _signing = null;

/** Initialize app/auth/storage once */
export function initFirebase() {
  if (_inited && _app && _auth && _storage) return { app: _app, auth: _auth, storage: _storage };

  // Avoid double init if other scripts already initialized Firebase
  const apps = getApps();
  _app = apps && apps.length ? apps[0] : initializeApp(FIREBASE_CONFIG);

  _auth = getAuth(_app);
  _storage = getStorage(_app);

  _inited = true;
  return { app: _app, auth: _auth, storage: _storage };
}

/** Ensure anonymous login (Rules require auth != null) */
export async function ensureAuth() {
  initFirebase();

  if (_auth.currentUser) return _auth.currentUser;

  // prevent multi-click causing multiple sign-in requests
  if (_signing) return _signing;

  _signing = (async () => {
    const cred = await signInAnonymously(_auth);
    return cred.user;
  })();

  try {
    const user = await _signing;
    return user;
  } finally {
    _signing = null;
  }
}

/* =============================
 * Upload helpers
 * ============================= */

/**
 * Upload a JPEG/PNG/WebP blob to Storage and return downloadURL.
 * @param {string} cardId
 * @param {Blob} blob - compressed image blob (recommend image/jpeg)
 * @param {string} fileName - like "avatar.jpg"
 * @returns {Promise<string>} downloadURL
 */
export async function uploadImage(cardId, blob, fileName) {
  if (!cardId) throw new Error("uploadImage: missing cardId");
  if (!blob) throw new Error("uploadImage: missing blob");
  if (!fileName) throw new Error("uploadImage: missing fileName");

  // Must be logged in
  await ensureAuth();

  // Safety: size limit (rules is 5MB) – keep a little margin
  const max = 5 * 1024 * 1024;
  if (blob.size > max) throw new Error("uploadImage: blob too large (>5MB). Please compress more.");

  const path = `hsc_cards/${TENANT}/${cardId}/${fileName}`;
  const storageRef = ref(_storage, path);

  const contentType = blob.type || "image/jpeg";
  await uploadBytes(storageRef, blob, { contentType });

  const url = await getDownloadURL(storageRef);
  return url;
}

/** Convenience: avatar → 512px (from compressor) then upload as avatar.jpg */
export async function uploadAvatar(cardId, avatarBlob) {
  return uploadImage(cardId, avatarBlob, "avatar.jpg");
}

/** Convenience: cover → 1200px (from compressor) then upload as cover.jpg */
export async function uploadCover(cardId, coverBlob) {
  return uploadImage(cardId, coverBlob, "cover.jpg");
}

/**
 * Generic photo slots: photo1.jpg .. photo5.jpg
 * @param {number} index 1..5
 */
export async function uploadPhoto(cardId, blob, index = 1) {
  const i = Math.max(1, Math.min(9, Number(index) || 1));
  return uploadImage(cardId, blob, `photo${i}.jpg`);
}

/* =============================
 * Debug helpers (optional)
 * ============================= */

export function getFirebaseInfo() {
  initFirebase();
  return {
    version: HSC_FRONTEND_VERSION,
    tenant: TENANT,
    authed: !!(_auth && _auth.currentUser),
    uid: _auth && _auth.currentUser ? _auth.currentUser.uid : ""
  };
}
