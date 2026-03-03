/* ================================
 * form.js — v501 (COMPLETE OVERWRITE)
 * - exp+sig entry (verifyFillLink)
 * - Auto Anonymous Auth (Firebase) -> uid = auth.currentUser.uid
 * - Client-side image compression BEFORE Firebase upload
 * - Flow: verify -> reserve -> upload -> create -> confirm
 * - Aligns with form.html v501 ids (all fields)
 * ================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

/* ========= Firebase CONFIG (your project) ========= */

const firebaseConfig = {
  apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
  authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
  projectId: "happiness-smart-card-pro-7389a",
  storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
  messagingSenderId: "143313936007",
  appId: "1:143313936007:web:7c948563c51e8a47d3a222"
};

/* ========= System CONFIG ========= */

// ✅ from form.html (must exist before this module loads)
const GAS_URL = String(window.HSC_GAS_URL || "").trim();

// default
const DEFAULT_LINE_OA = "https://lin.ee/G3VJoRm";

// Retry / timeout
const FETCH_TIMEOUT_MS = 15000;
const FETCH_RETRY = 2;

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
  exp: 0,
  sig: "",

  tenant: "angel",
  plan: "",

  // uid MUST come from Firebase Auth (anon)
  uid: "",

  // reserve -> returns
  id: "",
  token: "",
  uploadPath: "",

  clean_card_url: "",
  og_page_url: ""
};

/* ========= Boot ========= */

(async function init() {
  try {
    pill.textContent = "v501";

    if (!GAS_URL) {
      setPill("GAS URL missing");
      verifyStatus.textContent =
        "請在 form.html 先設定 window.HSC_GAS_URL（你的 WebApp exec URL）。";
      return;
    }

    // read exp+sig
    const qs = new URLSearchParams(location.search);
    state.exp = Number(qs.get("exp") || 0);
    state.sig = String(qs.get("sig") || "").trim();

    if (!state.exp || !state.sig) {
      setPill("Invalid link");
      verifyStatus.textContent =
        "缺少 exp 或 sig。\n" +
        "請使用管理端產生的填表連結進入（?exp=...&sig=...）。";
      return;
    }

    // init firebase + auth (anonymous)
    setPill("Auth…");
    verifyStatus.textContent = "初始化 Firebase（匿名登入）…";
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    await ensureAnonAuth_(auth);

    // uid ready
    const u = auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : "";
    if (!u) throw new Error("匿名登入失敗：未取得 uid（請確認 Firebase 已開啟 Anonymous）");
    state.uid = u;

    // verify fill link
    setPill("Verifying…");
    verifyStatus.textContent = "正在驗證 exp + sig…";

    const v = await api_("verifyFillLink", { exp: state.exp, sig: state.sig }, "GET");
    if (!v || !v.ok) throw new Error((v && v.error) || "verifyFillLink failed");

    // trust server plan/tenant (locked)
    state.tenant = v.tenant || state.tenant || "angel";
    state.plan = v.plan || "";
    if (state.plan !== "free" && state.plan !== "premium") {
      throw new Error("verifyFillLink 回傳 plan 不正確（必須是 free 或 premium）");
    }

    setPill(`OK • ${state.plan}`);
    verifyStatus.textContent =
      `驗證成功 ✅\n` +
      `tenant: ${state.tenant}\n` +
      `uid: ${state.uid}\n` +
      `plan: ${state.plan}\n`;

    // show form
    formCard.style.display = "block";
    planStatus.textContent = `系統方案：${state.plan}（此連結已鎖定，無法自行更改）`;
    freeBox.style.display = state.plan === "free" ? "block" : "none";
    premiumBox.style.display = state.plan === "premium" ? "block" : "none";
    photoLimitHint.textContent = state.plan === "free" ? "照片限制：最多 2 張" : "照片限制：最多 5 張";

    // default line oa
    if ($("line_oa") && !$("line_oa").value) $("line_oa").value = DEFAULT_LINE_OA;

    // bind submit
    btnSubmit.addEventListener("click", () => onSubmit_(app));

  } catch (err) {
    setPill("Init failed");
    verifyStatus.textContent = `初始化失敗：${String(err && err.message ? err.message : err)}`;
  }
})();

/* ========= Submit flow ========= */

async function onSubmit_(app) {
  try {
    btnSubmit.disabled = true;
    submitStatus.textContent = "開始處理…";

    // basic validate
    const name = String($("name").value || "").trim();
    if (!name) throw new Error("請填寫「姓名」");

    if (!$("avatarFile").files || !$("avatarFile").files[0]) {
      throw new Error("請上傳「頭像（必填）」");
    }

    if (state.plan === "free") {
      if (!String($("free_color").value || "").trim()) throw new Error("free 方案：請選擇 顏色（c1~c5）");
      if (!String($("free_style").value || "").trim()) throw new Error("free 方案：請選擇 版型（s1~s3）");
      if (!String($("free_paper").value || "").trim()) throw new Error("free 方案：請選擇 紙感（f1~f3）");
    } else {
      if (!String($("premium_color").value || "").trim()) throw new Error("premium 方案：請選擇 底色（p1~p7）");
    }

    // reserve
    submitStatus.textContent = "Step 1/4：建立預約（reserve）…";
    const r = await api_("reserve", {
      tenant: state.tenant,
      uid: state.uid,        // ✅ auth.uid
      plan: state.plan,
      exp: state.exp,
      sig: state.sig
    });

    if (!r || !r.ok) throw new Error((r && r.error) || "reserve failed");

    state.id = r.id;
    state.token = r.token;
    state.uploadPath = r.uploadPath;
    state.clean_card_url = r.clean_card_url || "";
    state.og_page_url = r.og_page_url || "";

    if (!state.id || !state.token || !state.uploadPath) throw new Error("reserve 回傳資料不完整（id/token/uploadPath）");

    // upload to firebase
    submitStatus.textContent = "Step 2/4：壓縮並上傳圖片到 Firebase Storage…";
    const urls = await uploadAllImages_(app);

    // create (text + urls)
    submitStatus.textContent = "Step 3/4：送出文字 + 圖片網址（create）…";
    const payload = buildCreatePayload_(urls);

    const c = await api_("create", payload);
    if (!c || !c.ok) throw new Error((c && c.error) || "create failed");

    state.clean_card_url = c.clean_card_url || state.clean_card_url || "";
    state.og_page_url = c.og_page_url || state.og_page_url || "";

    submitStatus.textContent = "Step 4/4：完成 ✅";
    showResult_();

  } catch (err) {
    submitStatus.textContent = `送出失敗：${String(err && err.message ? err.message : err)}`;
  } finally {
    btnSubmit.disabled = false;
  }
}

/* ========= Build create payload ========= */

function buildCreatePayload_(urls) {
  const plan = state.plan;

  const common = {
    tenant: state.tenant,
    uid: state.uid,      // ✅ auth.uid
    plan,

    exp: state.exp,
    sig: state.sig,

    id: state.id,
    token: state.token,

    // text fields (align with form.html)
    name: String($("name").value || "").trim(),
    unit: String($("unit").value || "").trim(),
    title: String($("title").value || "").trim(),
    slogan: String($("slogan").value || "").trim(),
    services: String($("services").value || "").trim(),
    experience: String($("experience").value || "").trim(),

    phone: String($("phone").value || "").trim(),
    email: String($("email").value || "").trim(),
    website: String($("website").value || "").trim(),
    address: String($("address").value || "").trim(),

    line_id: String($("line_id").value || "").trim(),
    line_url: String($("line_url").value || "").trim(),
    line_oa: String($("line_oa").value || "").trim(),
    wechat_id: String($("wechat_id").value || "").trim(),

    // image urls
    avatar_url: urls.avatar_url || "",
    logo_url: urls.logo_url || "",
    photos: Array.isArray(urls.photos) ? urls.photos : []
  };

  if (plan === "free") {
    common.free_color = String($("free_color").value || "").trim();
    common.free_style = String($("free_style").value || "").trim();
    common.free_paper = String($("free_paper").value || "").trim();
  } else {
    common.premium_color = String($("premium_color").value || "").trim();
  }

  return common;
}

/* ========= Upload (Firebase Storage) ========= */

async function uploadAllImages_(app) {
  const storage = getStorage(app);

  const avatarFile = $("avatarFile").files && $("avatarFile").files[0] ? $("avatarFile").files[0] : null;
  const logoFile = $("logoFile").files && $("logoFile").files[0] ? $("logoFile").files[0] : null;
  const photosFiles = $("photosFile").files ? Array.from($("photosFile").files) : [];

  if (!avatarFile) throw new Error("請上傳頭像（avatar）");

  const maxPhotos = state.plan === "free" ? 2 : 5;
  if (photosFiles.length > maxPhotos) throw new Error(`照片最多 ${maxPhotos} 張，請重新選擇`);

  // IMPORTANT:
  // - uploadPath should be like: hsc_cards/{tenant}/{uid}/{cardId}/
  const base = String(state.uploadPath || "").trim();
  if (!base) throw new Error("uploadPath empty");

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

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  const scale = Math.min(1, maxEdge / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { alpha: false });

  // Fill white background to avoid black on transparent PNG -> JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await canvasToBlob_(canvas, mime || "image/jpeg", quality || 0.8);

  // Safety: if compressed becomes bigger than original, use original file
  if (blob && file && blob.size > file.size) return file;

  return blob;
}

function fileToImage_(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("圖片讀取失敗")); };
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
    `啟用需由管理端 adminSetStatus 完成交貨啟用。`;

  if (state.clean_card_url) btnPreview.href = state.clean_card_url;

  btnConfirm.onclick = async () => {
    try {
      btnConfirm.textContent = "確認中…";
      btnConfirm.style.pointerEvents = "none";

      const res = await api_("confirm", {
        id: state.id,
        token: state.token,
        uid: state.uid,
        tenant: state.tenant
      });

      if (!res || !res.ok) throw new Error((res && res.error) || "confirm failed");

      btnConfirm.textContent = "已確認 ✅（等待交貨啟用）";
    } catch (err) {
      btnConfirm.textContent = "確認資料";
      btnConfirm.style.pointerEvents = "auto";
      alert("確認失敗：" + String(err && err.message ? err.message : err));
    }
  };
}

function setPill(t) {
  pill.textContent = t;
}

/* ========= Firebase Auth helper ========= */

function ensureAnonAuth_(auth) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user && user.uid) {
          if (!settled) {
            settled = true;
            unsub();
            resolve(true);
          }
          return;
        }

        // not signed in yet -> sign in anonymously
        await signInAnonymously(auth);

        // wait for state change (will re-enter)
      } catch (e) {
        if (!settled) {
          settled = true;
          try { unsub(); } catch(_) {}
          reject(new Error(
            "匿名登入失敗。\n" +
            "請到 Firebase Console → Authentication → Sign-in method → 啟用 Anonymous。\n" +
            `原始錯誤：${String(e && e.message ? e.message : e)}`
          ));
        }
      }
    });

    // timeout guard
    setTimeout(() => {
      if (!settled) {
        settled = true;
        try { unsub(); } catch(_) {}
        reject(new Error("匿名登入逾時（請確認網路與 Firebase Anonymous 已啟用）"));
      }
    }, 12000);
  });
}

/* ========= API helper ========= */

async function api_(action, payload, method) {
  const m = method || "POST";

  if (m === "GET") {
    const u = new URL(GAS_URL);
    u.searchParams.set("action", action);
    Object.keys(payload || {}).forEach((k) => u.searchParams.set(k, String(payload[k])));
    return await fetchJsonWithRetry_(u.toString(), { method: "GET" });
  }

  const u = new URL(GAS_URL);
  u.searchParams.set("action", action);

  return await fetchJsonWithRetry_(u.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
}

async function fetchJsonWithRetry_(url, options) {
  let lastErr = null;

  for (let i = 0; i <= FETCH_RETRY; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(t);

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch(_) {}

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) ? (json.error || json.message) : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      if (json == null) throw new Error("回應不是 JSON（請檢查 GAS 是否回傳 JSON）");
      return json;

    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      // small backoff
      await new Promise(r => setTimeout(r, 250 * (i + 1)));
    }
  }

  throw new Error(String(lastErr && lastErr.message ? lastErr.message : lastErr));
}