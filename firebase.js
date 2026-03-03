/* ======================================================
 * Happiness Smart Card System — Frontend firebase.js
 * v502 (COMPLETE OVERWRITE)
 *
 * Purpose:
 * - Initialize Firebase (CDN ESM)
 * - Anonymous sign-in (once)
 * - Upload compressed images to Firebase Storage
 * - Return downloadURL
 *
 * Storage path: hsc_cards/{tenant}/{cardId}/{fileName}
 * ====================================================== */

const HSC_FRONTEND_VERSION = "v502";
const TENANT = "angel";

/** ✅ 只填「物件」：從 Firebase Console 複製 firebaseConfig 裡面的內容 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
  authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
  projectId: "happiness-smart-card-pro-7389a",
  storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
  appId: "1:143313936007:web:7c948563c51e8a47d3a222"
};

/** CDN ESM imports（固定版本，避免未來 Firebase 升級造成壞掉） */
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

  if (_signing) return _signing;

  _signing = (async () => {
    const cred = await signInAnonymously(_auth);
    return cred.user;
  })();

  try {
    return await _signing;
  } finally {
    _signing = null;
  }
}

/**
 * Upload blob to Storage and return downloadURL
 * @param {string} cardId
 * @param {Blob} blob
 * @param {string} fileName
 * @returns {Promise<string>}
 */
export async function uploadImage(cardId, blob, fileName) {
  if (!cardId) throw new Error("uploadImage: missing cardId");
  if (!blob) throw new Error("uploadImage: missing blob");
  if (!fileName) throw new Error("uploadImage: missing fileName");

  await ensureAuth();

  const max = 5 * 1024 * 1024;
  if (blob.size > max) throw new Error("uploadImage: blob too large (>5MB). Please compress more.");

  const path = `hsc_cards/${TENANT}/${cardId}/${fileName}`;
  const storageRef = ref(_storage, path);

  const contentType = blob.type || "image/jpeg";
  await uploadBytes(storageRef, blob, { contentType });

  return await getDownloadURL(storageRef);
}

export async function uploadAvatar(cardId, avatarBlob) {
  return uploadImage(cardId, avatarBlob, "avatar.jpg");
}

export async function uploadCover(cardId, coverBlob) {
  return uploadImage(cardId, coverBlob, "cover.jpg");
}

export async function uploadPhoto(cardId, blob, index = 1) {
  const i = Math.max(1, Math.min(9, Number(index) || 1));
  return uploadImage(cardId, blob, `photo${i}.jpg`);
}

export function getFirebaseInfo() {
  initFirebase();
  return {
    version: HSC_FRONTEND_VERSION,
    tenant: TENANT,
    authed: !!(_auth && _auth.currentUser),
    uid: _auth && _auth.currentUser ? _auth.currentUser.uid : ""
  };
}