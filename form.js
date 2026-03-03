/* ================================
 * form.js — v500.3 (COMPLETE OVERWRITE)
 * - Anonymous Auth (auto sign-in once)
 * - uid ALWAYS = auth.currentUser.uid
 * - v500.3 GAS align: verifyFillLink -> reserve(uid) -> compress -> Firebase upload -> create(text+urls) -> confirm(token)
 * - Images NEVER go to GAS (base64 rejected server-side)
 * ================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

/* ========= CONFIG ========= */

const firebaseConfig = {
  apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
  authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
  projectId: "happiness-smart-card-pro-7389a",
  storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
  messagingSenderId: "143313936007",
  appId: "1:143313936007:web:7c948563c51e8a47d3a222"
};

// ✅ 你已給的 GAS WebApp exec URL
const GAS_URL =
  window.HSC_GAS_URL ||
  "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const DEFAULT_LINE_OA = "https://lin.ee/G3VJoRm";

/* ========= Compression presets ========= */
const COMPRESS = {
  avatar: { maxEdge: 900, quality: 0.82, mime: "image/jpeg" },
  logo: { maxEdge: 900, quality: 0.82, mime: "image/jpeg" },
  photo: { maxEdge: 1600, quality: 0.8, mime: "image/jpeg" }
};

/* ========= DOM ========= */
const $ = (id) => document.getElementById(id);

const pill = $("pill");
const verifyStatus = $("verifyStatus");
const formCard = $("formCard");
const planStatus = $("planStatus");
const freeBox = $("freeBox");
const premiumBox = $("premiumBox");
const photoLimitHint = $("photoLimitHint");

const submitStatus = $("submitStatus");
const btnSubmit = $("btnSubmit");

const resultBox = $("resultBox");
const resultStatus = $("resultStatus");
const btnPreview = $("btnPreview");
const btnConfirm = $("btnConfirm");

/* ========= State ========= */
const state = {
  sig: "",
  tenant: "",
  plan: "",
  invite: "",

  // auth
  uid: "",

  // reservation
  id: "",
  token: "",
  uploadPath: "",

  // result
  clean_card_url: "",
  og_page_url: ""
};

/* ========= Firebase singletons ========= */
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const storage = getStorage(fbApp);

/* ================================
 * Boot
 * ================================ */

init_();

async function init_() {
  try {
    if (!GAS_URL) {
      setPill_("GAS URL missing");
      verifyStatus.textContent =
        "請在 form.html 設定 window.HSC_GAS_URL（你的 WebApp exec URL），或確認 form.js 的 GAS_URL 常數。";
      return;
    }

    // 1) Parse query: sig only (v500.3)
    const qs = new URLSearchParams(location.search);
    state.sig = String(qs.get("sig") || "").trim();
    if (!state.sig) {
      setPill_("Invalid link");
      verifyStatus.textContent = "缺少 sig，請用後台產生的填表連結進入。";
      return;
    }

    // 2) Verify fill link first (does not include uid)
    setPill_("Verifying…");
    verifyStatus.textContent = "正在驗證連結 sig…";

    const v = await api_("verifyFillLink", { sig: state.sig }, "GET");
    if (!v.ok) throw new Error(v.error || "verify failed");

    state.tenant = v.tenant;
    state.plan = v.plan;
    state.invite = v.invite || "";

    setPill_(`OK • ${state.plan}`);
    verifyStatus.textContent =
      `驗證成功 ✅\n` +
      `tenant: ${state.tenant}\n` +
      `plan: ${state.plan}\n` +
      (state.invite ? `invite: ${state.invite}\n` : "") +
      `\n接著會自動匿名登入，取得 uid…`;

    // 3) Anonymous sign-in (auto)
    await ensureAnonAuth_();

    // 4) Render form
    formCard.style.display = "block";
    planStatus.textContent = `系統方案：${state.plan}（此連結已鎖定，無法自行更改）`;
    freeBox.style.display = state.plan === "free" ? "block" : "none";
    premiumBox.style.display = state.plan === "premium" ? "block" : "none";
    photoLimitHint.textContent =
      state.plan === "free" ? "照片限制：最多 2 張" : "照片限制：最多 5 張";

    if ($("line_oa") && !$("line_oa").value) $("line_oa").value = DEFAULT_LINE_OA;

    btnSubmit.addEventListener("click", onSubmit_);

    // Show uid
    verifyStatus.textContent += `\nuid(auth.uid): ${state.uid}\n`;

  } catch (err) {
    setPill_("Init failed");
    verifyStatus.textContent = `初始化失敗：${String(err.message || err)}`;
  }
}

/* ================================
 * Anonymous Auth
 * ================================ */

async function ensureAnonAuth_() {
  // If already signed in
  if (auth.currentUser && auth.currentUser.uid) {
    state.uid = auth.currentUser.uid;
    return;
  }

  // Try signInAnonymously and wait for onAuthStateChanged
  let resolved = false;

  const waiter = new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.uid) {
        unsub();
        resolved = true;
        state.uid = user.uid;
        resolve(user);
      }
    });

    // Safety timeout
    setTimeout(() => {
      if (!resolved) {
        try { unsub(); } catch (_) {}
        reject(new Error("匿名登入逾時。請確認 Firebase Authentication 已啟用 Anonymous。"));
      }
    }, 15000);
  });

  try {
    await signInAnonymously(auth);
  } catch (e) {
    // Most common: Anonymous not enabled
    throw new Error(
      "匿名登入失敗：請到 Firebase Console → Authentication → Sign-in method → Anonymous → Enable"
    );
  }

  await waiter;
}

/* ================================
 * Submit Flow
 * ================================ */

async function onSubmit_() {
  try {
    btnSubmit.disabled = true;
    submitStatus.textContent = "開始處理…";

    // Ensure auth (again)
    if (!state.uid) await ensureAnonAuth_();

    submitStatus.textContent = "Step 1/4：建立預約（reserve）…";
    const r = await api_("reserve", {
      tenant: state.tenant,
      uid: state.uid,           // ✅ uid=auth.uid
      plan: state.plan,
      invite: state.invite || ""
    });

    if (!r.ok) throw new Error(r.error || "reserve failed");

    state.id = r.id;
    state.token = r.token;
    state.uploadPath = r.uploadPath;
    state.clean_card_url = r.clean_card_url;
    state.og_page_url = r.og_page_url;

    submitStatus.textContent = "Step 2/4：壓縮並上傳圖片到 Firebase Storage…";
    const urls = await uploadAllImages_();

    submitStatus.textContent = "Step 3/4：送出文字 + 圖片網址（create）…";
    const payload = buildCreatePayload_(urls);

    const c = await api_("create", payload);
    if (!c.ok) throw new Error(c.error || "create failed");

    state.clean_card_url = c.clean_card_url || state.clean_card_url;
    state.og_page_url = c.og_page_url || state.og_page_url;

    submitStatus.textContent = "Step 4/4：完成 ✅";
    showResult_();
  } catch (err) {
    submitStatus.textContent = `送出失敗：${String(err.message || err)}`;
  } finally {
    btnSubmit.disabled = false;
  }
}

/* ================================
 * Build create payload
 * ================================ */

function buildCreatePayload_(urls) {
  const plan = state.plan;

  const common = {
    tenant: state.tenant,
    uid: state.uid,     // ✅ uid=auth.uid
    plan,
    invite: state.invite || "",
    id: state.id,
    token: state.token,

    name: ($("name")?.value || "").trim(),
    unit: ($("unit")?.value || "").trim(),
    title: ($("title")?.value || "").trim(),
    slogan: ($("slogan")?.value || "").trim(),
    services: ($("services")?.value || "").trim(),
    experience: ($("experience")?.value || "").trim(),

    phone: ($("phone")?.value || "").trim(),
    email: ($("email")?.value || "").trim(),
    website: ($("website")?.value || "").trim(),
    address: ($("address")?.value || "").trim(),
    line_id: ($("line_id")?.value || "").trim(),
    line_url: ($("line_url")?.value || "").trim(),
    line_oa: ($("line_oa")?.value || "").trim(),
    wechat_id: ($("wechat_id")?.value || "").trim(),

    avatar_url: urls.avatar_url || "",
    logo_url: urls.logo_url || "",
    photos: urls.photos || []
  };

  if (plan === "free") {
    common.free_color = ($("free_color")?.value || "").trim();
    common.free_style = ($("free_style")?.value || "").trim();
    common.free_paper = ($("free_paper")?.value || "").trim();
  } else {
    common.premium_color = ($("premium_color")?.value || "").trim();
  }

  return common;
}

/* ================================
 * Firebase upload (with compression)
 * ================================ */

async function uploadAllImages_() {
  const avatarFile = $("avatarFile")?.files?.[0] || null;
  const logoFile = $("logoFile")?.files?.[0] || null;
  const photosFiles = $("photosFile")?.files ? Array.from($("photosFile").files) : [];

  if (!avatarFile) throw new Error("請上傳頭像（avatar）");

  const maxPhotos = state.plan === "free" ? 2 : 5;
  if (photosFiles.length > maxPhotos) throw new Error(`照片最多 ${maxPhotos} 張，請重新選擇`);

  const base = state.uploadPath; // e.g. hsc_cards/tenant/uid/cardId/
  const urls = { avatar_url: "", logo_url: "", photos: [] };

  // avatar
  const avatarBlob = await compressImageToBlob_(avatarFile, COMPRESS.avatar);
  urls.avatar_url = await uploadBlob_(base + "avatar.jpg", avatarBlob, "image/jpeg");

  // logo (optional)
  if (logoFile) {
    const logoBlob = await compressImageToBlob_(logoFile, COMPRESS.logo);
    urls.logo_url = await uploadBlob_(base + "logo.jpg", logoBlob, "image/jpeg");
  }

  // photos
  for (let i = 0; i < photosFiles.length; i++) {
    const f = photosFiles[i];
    const photoBlob = await compressImageToBlob_(f, COMPRESS.photo);
    const path = base + `photo${i + 1}.jpg`;
    const u = await uploadBlob_(path, photoBlob, "image/jpeg");
    urls.photos.push(u);
  }

  return urls;
}

async function uploadBlob_(path, blob, contentType) {
  const r = ref(storage, path);
  const snap = await uploadBytes(r, blob, {
    contentType: contentType || blob.type || "image/jpeg",
    cacheControl: "public,max-age=31536000"
  });
  return await getDownloadURL(snap.ref);
}

/* ================================
 * Compression core
 * ================================ */

async function compressImageToBlob_(file, opt) {
  const { maxEdge, quality, mime } = opt;

  const img = await fileToImage_(file);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  const scale = Math.min(1, maxEdge / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#ffffff"; // avoid black for transparent PNG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const outBlob = await canvasToBlob_(canvas, mime || "image/jpeg", quality || 0.8);

  // If compressed somehow larger, fallback original file
  if (outBlob && outBlob.size > file.size) return file;
  return outBlob;
}

function fileToImage_(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("圖片讀取失敗"));
    };
    img.src = url;
  });
}

function canvasToBlob_(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

/* ================================
 * Result + Confirm
 * ================================ */

function showResult_() {
  resultBox.style.display = "block";

  resultStatus.textContent =
    `名片已建立（狀態：inactive）\n` +
    `id: ${state.id}\n` +
    `uid(auth.uid): ${state.uid}\n` +
    `你可先預覽成品並確認資料。\n` +
    `確認不等於啟用，啟用需由管理端 adminSetStatus 完成交貨。`;

  btnPreview.href = state.clean_card_url;

  btnConfirm.onclick = async () => {
    try {
      btnConfirm.textContent = "確認中…";
      btnConfirm.style.pointerEvents = "none";

      const res = await api_("confirm", { id: state.id, token: state.token });
      if (!res.ok) throw new Error(res.error || "confirm failed");

      btnConfirm.textContent = "已確認 ✅（等待交貨啟用）";
    } catch (err) {
      btnConfirm.textContent = "確認資料";
      btnConfirm.style.pointerEvents = "auto";
      alert("確認失敗：" + String(err.message || err));
    }
  };
}

/* ================================
 * UI helper
 * ================================ */

function setPill_(t) {
  if (pill) pill.textContent = t;
}

/* ================================
 * API helper
 * ================================ */

async function api_(action, payload, method) {
  const m = method || "POST";

  if (m === "GET") {
    const u = new URL(GAS_URL);
    u.searchParams.set("action", action);
    Object.keys(payload || {}).forEach((k) => u.searchParams.set(k, String(payload[k])));
    const res = await fetch(u.toString(), { method: "GET" });
    return await res.json();
  }

  const u = new URL(GAS_URL);
  u.searchParams.set("action", action);

  const res = await fetch(u.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });

  return await res.json();
}