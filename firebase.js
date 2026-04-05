/* ======================================================
 * Happiness Smart Card System — firebase.js
 * HSCv803-banner-support (COMPLETE OVERWRITE)
 *
 * Purpose:
 * - Firebase v10 modular via CDN ESM
 * - Anonymous sign-in (once)
 * - Upload compressed images to Firebase Storage
 * - Return downloadURL
 *
 * Official route:
 * - cards/{cardId}/avatar.jpg
 * - cards/{cardId}/logo.jpg
 * - cards/{cardId}/banner.jpg
 * - cards/{cardId}/photo1.jpg ~ photo10.jpg
 * ====================================================== */

export const HSC_FRONTEND_VERSION = "v803-banner-support";

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

let _app = null;
let _auth = null;
let _storage = null;
let _inited = false;
let _signing = null;

function clean(v) {
  return String(v == null ? "" : v).trim();
}

function normalizeCardId(cardId) {
  const v = clean(cardId);
  if (!v) throw new Error("uploadImage: missing cardId");
  return v.replace(/[^\w-]/g, "");
}

function normalizeFileName(fileName) {
  const v = clean(fileName).toLowerCase();
  if (!v) throw new Error("uploadImage: missing fileName");
  if (!/^[a-z0-9._-]+$/.test(v)) {
    throw new Error(`uploadImage: invalid fileName: ${fileName}`);
  }
  return v;
}

export function initFirebase() {
  if (_inited && _app && _auth && _storage) {
    return { app: _app, auth: _auth, storage: _storage };
  }

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

export async function uploadImage(cardId, blob, fileName) {
  if (!blob) throw new Error("uploadImage: missing blob");
  await ensureAuth();

  const safeCardId = normalizeCardId(cardId);
  const safeFileName = normalizeFileName(fileName);

  const max = 5 * 1024 * 1024;
  if (blob.size > max) {
    throw new Error("uploadImage: blob too large (>5MB). Please compress more.");
  }

  const contentType = blob.type || "image/jpeg";
  if (!/^image\//i.test(contentType)) {
    throw new Error(`uploadImage: invalid content type: ${contentType}`);
  }

  const path = `cards/${safeCardId}/${safeFileName}`;
  const storageRef = ref(_storage, path);

  await uploadBytes(storageRef, blob, {
    contentType,
    cacheControl: "public,max-age=31536000,immutable"
  });

  return await getDownloadURL(storageRef);
}

export const uploadAvatar = (cardId, blob) => uploadImage(cardId, blob, "avatar.jpg");
export const uploadLogo = (cardId, blob) => uploadImage(cardId, blob, "logo.jpg");
export const uploadBanner = (cardId, blob) => uploadImage(cardId, blob, "banner.jpg");
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
    files: [
      "avatar.jpg", "logo.jpg", "banner.jpg",
      "photo1.jpg", "photo2.jpg", "photo3.jpg", "photo4.jpg", "photo5.jpg",
      "photo6.jpg", "photo7.jpg", "photo8.jpg", "photo9.jpg", "photo10.jpg"
    ]
  };
}
