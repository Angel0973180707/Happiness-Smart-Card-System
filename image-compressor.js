/* ======================================================
HSC v502
Firebase Upload Module
====================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* =============================
FIREBASE CONFIG
============================= */

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_BUCKET",
  appId: "YOUR_APP_ID"
};

/* =============================
INIT
============================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

/* =============================
ANONYMOUS LOGIN
============================= */

export async function initFirebase() {

  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  return auth.currentUser;
}

/* =============================
UPLOAD AVATAR
============================= */

export async function uploadAvatar(cardId, blob) {

  await initFirebase();

  const path = `hsc_cards/angel/${cardId}/avatar.jpg`;

  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, {
    contentType: "image/jpeg"
  });

  const url = await getDownloadURL(storageRef);

  return url;
}

/* =============================
UPLOAD COVER
============================= */

export async function uploadCover(cardId, blob) {

  await initFirebase();

  const path = `hsc_cards/angel/${cardId}/cover.jpg`;

  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, {
    contentType: "image/jpeg"
  });

  const url = await getDownloadURL(storageRef);

  return url;
}