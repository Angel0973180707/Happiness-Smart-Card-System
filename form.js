/* ================================
 * form.js — v500.1 (COMPLETE OVERWRITE)
 * - Adds client-side image compression BEFORE Firebase upload
 * - Keeps v500 flow unchanged (exp+sig -> reserve -> upload -> create -> confirm)
 * ================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
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

// ✅ 填你的 GAS WebApp exec URL
const GAS_URL = window.HSC_GAS_URL || "";

const DEFAULT_LINE_OA = "https://lin.ee/G3VJoRm";

/* ========= Compression presets ========= */
// NOTE: You can tune these later without touching GAS.
const COMPRESS = {
  avatar: { maxEdge: 900, quality: 0.82, mime: "image/jpeg" },
  logo:   { maxEdge: 900, quality: 0.82, mime: "image/jpeg" },
  photo:  { maxEdge: 1600, quality: 0.80, mime: "image/jpeg" }
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
  exp: 0,
  sig: "",
  tenant: "",
  uid: "",
  plan: "",
  invite: "",

  id: "",
  token: "",
  uploadPath: "",

  clean_card_url: "",
  og_page_url: ""
};

/* ========= Boot ========= */

(async function init() {
  try {
    if (!GAS_URL) {
      pill.textContent = "GAS URL missing";
      verifyStatus.textContent = "請在 form.js 填入 GAS_URL（你的 WebApp exec URL）。";
      return;
    }

    const qs = new URLSearchParams(location.search);
    state.exp = Number(qs.get("exp") || 0);
    state.sig = String(qs.get("sig") || "").trim();

    if (!state.exp || !state.sig) {
      pill.textContent = "Invalid link";
      verifyStatus.textContent = "缺少 exp 或 sig，請用後台產生的填表連結進入。";
      return;
    }

    setPill("Verifying…");
    verifyStatus.textContent = "正在驗證 exp + sig…";

    const v = await api("verifyFillLink", { exp: state.exp, sig: state.sig }, "GET");
    if (!v.ok) throw new Error(v.error || "verify failed");

    state.tenant = v.tenant;
    state.uid = v.uid;
    state.plan = v.plan;
    state.invite = v.invite || "";

    setPill(`OK • ${state.plan}`);
    verifyStatus.textContent =
      `驗證成功 ✅\n` +
      `tenant: ${state.tenant}\n` +
      `uid: ${state.uid}\n` +
      `plan: ${state.plan}\n` +
      (state.invite ? `invite: ${state.invite}\n` : "");

    formCard.style.display = "block";

    planStatus.textContent = `系統方案：${state.plan}（此連結已鎖定，無法自行更改）`;
    freeBox.style.display = state.plan === "free" ? "block" : "none";
    premiumBox.style.display = state.plan === "premium" ? "block" : "none";
    photoLimitHint.textContent = state.plan === "free" ? "照片限制：最多 2 張" : "照片限制：最多 5 張";

    if (!$("line_oa").value) $("line_oa").value = DEFAULT_LINE_OA;

    btnSubmit.addEventListener("click", onSubmit);

  } catch (err) {
    setPill("Verify failed");
    verifyStatus.textContent = `驗證失敗：${String(err.message || err)}`;
  }
})();

/* ========= Submit ========= */

async function onSubmit() {
  try {
    btnSubmit.disabled = true;
    submitStatus.textContent = "開始處理…";

    submitStatus.textContent = "Step 1/4：建立預約（reserve）…";
    const r = await api("reserve", {
      tenant: state.tenant,
      uid: state.uid,
      plan: state.plan,
      invite: state.invite
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

    const c = await api("create", payload);
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

/* ========= Build payload ========= */

function buildCreatePayload_(urls) {
  const plan = state.plan;

  const common = {
    tenant: state.tenant,
    uid: state.uid,
    plan,
    invite: state.invite,
    id: state.id,
    token: state.token,

    name: $("name").value.trim(),
    unit: $("unit").value.trim(),
    title: $("title").value.trim(),
    slogan: $("slogan").value.trim(),
    services: $("services").value.trim(),
    experience: $("experience").value.trim(),

    phone: $("phone").value.trim(),
    email: $("email").value.trim(),
    website: $("website").value.trim(),
    address: $("address").value.trim(),
    line_id: $("line_id").value.trim(),
    line_url: $("line_url").value.trim(),
    line_oa: $("line_oa").value.trim(),
    wechat_id: $("wechat_id").value.trim(),

    avatar_url: urls.avatar_url || "",
    logo_url: urls.logo_url || "",
    photos: urls.photos || []
  };

  if (plan === "free") {
    common.free_color = $("free_color").value.trim();
    common.free_style = $("free_style").value.trim();
    common.free_paper = $("free_paper").value.trim();
  } else {
    common.premium_color = $("premium_color").value.trim();
  }

  return common;
}

/* ========= Firebase upload (with compression) ========= */

async function uploadAllImages_() {
  const app = initializeApp(firebaseConfig);
  const storage = getStorage(app);

  const avatarFile = $("avatarFile").files && $("avatarFile").files[0] ? $("avatarFile").files[0] : null;
  const logoFile = $("logoFile").files && $("logoFile").files[0] ? $("logoFile").files[0] : null;
  const photosFiles = $("photosFile").files ? Array.from($("photosFile").files) : [];

  if (!avatarFile) throw new Error("請上傳頭像（avatar）");

  const maxPhotos = state.plan === "free" ? 2 : 5;
  if (photosFiles.length > maxPhotos) throw new Error(`照片最多 ${maxPhotos} 張，請重新選擇`);

  const base = state.uploadPath; // e.g. hsc_cards/tenant/uid/cardId/
  const urls = { avatar_url: "", logo_url: "", photos: [] };

  // avatar
  const avatarBlob = await compressImageToBlob_(avatarFile, COMPRESS.avatar);
  urls.avatar_url = await uploadBlob_(storage, base + "avatar.jpg", avatarBlob, "image/jpeg");

  // logo (optional)
  if (logoFile) {
    const logoBlob = await compressImageToBlob_(logoFile, COMPRESS.logo);
    urls.logo_url = await uploadBlob_(storage, base + "logo.jpg", logoBlob, "image/jpeg");
  }

  // photos
  for (let i = 0; i < photosFiles.length; i++) {
    const f = photosFiles[i];
    const photoBlob = await compressImageToBlob_(f, COMPRESS.photo);
    const path = base + `photo${i + 1}.jpg`;
    const u = await uploadBlob_(storage, path, photoBlob, "image/jpeg");
    urls.photos.push(u);
  }

  return urls;
}

async function uploadBlob_(storage, path, blob, contentType) {
  const r = ref(storage, path);
  const snap = await uploadBytes(r, blob, {
    contentType: contentType || blob.type || "image/jpeg",
    cacheControl: "public,max-age=31536000"
  });
  return await getDownloadURL(snap.ref);
}

/* ========= Compression core ========= */

async function compressImageToBlob_(file, opt) {
  const { maxEdge, quality, mime } = opt;

  const img = await fileToImage_(file);

  // original size
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  // scale
  const scale = Math.min(1, maxEdge / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { alpha: false });
  // fill white background to avoid black for transparent PNG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await canvasToBlob_(canvas, mime || "image/jpeg", quality || 0.8);

  // Safety: if compression somehow bigger than original, use original file
  if (blob && blob.size > file.size) {
    return file;
  }
  return blob;
}

function fileToImage_(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(new Error("圖片讀取失敗")); };
    img.src = url;
  });
}

function canvasToBlob_(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

/* ========= Result ========= */

function showResult_() {
  resultBox.style.display = "block";

  resultStatus.textContent =
    `名片已建立（狀態：inactive）\n` +
    `id: ${state.id}\n` +
    `你可先預覽成品並確認資料，確認不等於啟用。\n` +
    `啟用需由管理端 adminSetStatus 完成交貨。`;

  btnPreview.href = state.clean_card_url;

  btnConfirm.onclick = async () => {
    try {
      btnConfirm.textContent = "確認中…";
      btnConfirm.style.pointerEvents = "none";

      const res = await api("confirm", { id: state.id, token: state.token });
      if (!res.ok) throw new Error(res.error || "confirm failed");

      btnConfirm.textContent = "已確認 ✅（等待交貨啟用）";
    } catch (err) {
      btnConfirm.textContent = "確認資料";
      btnConfirm.style.pointerEvents = "auto";
      alert("確認失敗：" + String(err.message || err));
    }
  };
}

function setPill(t) {
  pill.textContent = t;
}

/* ========= API helper ========= */

async function api(action, payload, method) {
  const m = method || "POST";

  if (m === "GET") {
    const u = new URL(GAS_URL);
    u.searchParams.set("action", action);
    Object.keys(payload || {}).forEach(k => u.searchParams.set(k, String(payload[k])));
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