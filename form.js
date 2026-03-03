/* ================================
 * HSC Form v499 (COMPLETE OVERWRITE)
 * - FINAL: reserve(invite+uid) -> Firebase upload(uid/cardId path) -> create(urls)
 * - No base64. (GAS v499 rejects dataURL)
 * ================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

const CONFIG = {
  VERSION: "v499",

  // ✅ 你提供的最新 GAS exec URL
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

  TENANT_DEFAULT: "angel",
  FETCH_TIMEOUT_MS: 20000,

  // Firebase rules: max 2MB (per file)
  MAX_IMAGE_BYTES: 2 * 1024 * 1024,

  // compress settings
  AVATAR_MAX: 1200,
  LOGO_MAX: 1200,
  PHOTO_MAX: 1600,
  JPG_QUALITY: 0.84,

  MAX_PHOTOS: 5,

  FIREBASE: {
    apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
    authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
    projectId: "happiness-smart-card-pro-7389a",
    storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
    messagingSenderId: "143313936007",
    appId: "1:143313936007:web:7c948563c51e8a47d3a222"
  }
};

const $ = (id) => document.getElementById(id);

const ui = {
  tenant: $("tenant"),
  invite: $("invite"),

  plan: $("plan"),
  name: $("name"),
  unit: $("unit"),
  title: $("title"),
  phone: $("phone"),
  email: $("email"),
  line_url: $("line_url"),
  line_oa: $("line_oa"),
  address: $("address"),
  website: $("website"),

  avatarFile: $("avatarFile"),
  logoFile: $("logoFile"),
  photosFile: $("photosFile"),

  avatarPrev: $("avatarPrev"),
  logoPrev: $("logoPrev"),
  photosPrev: $("photosPrev"),

  btnSubmit: $("btnSubmit"),
  btnPing: $("btnPing"),
  btnReset: $("btnReset"),

  statusText: $("statusText"),
  modeText: $("modeText"),
  logBox: $("logBox")
};

function setStatus(text, tone="normal"){
  ui.statusText.textContent = text;
  ui.statusText.style.color =
    tone === "good" ? "var(--good)" :
    tone === "bad"  ? "var(--bad)" :
    tone === "warn" ? "var(--warn)" : "var(--text)";
}
function setMode(text){ ui.modeText.textContent = `模式：${text}`; }

function log(...args){
  const msg = args.map(a => typeof a === "string" ? a : JSON.stringify(a, null, 2)).join(" ");
  ui.logBox.textContent = (ui.logBox.textContent ? ui.logBox.textContent + "\n" : "") + msg;
  ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

function withTimeout(promise, ms, label="timeout"){
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${label}: ${ms}ms`)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function safeTrim(v){ return (v ?? "").toString().trim(); }

function normalizeLine(v){
  v = safeTrim(v);
  if (!v) return "";
  if (v.startsWith("@")) return v;
  if (/^http:\/\//i.test(v)) return v.replace(/^http:\/\//i, "https://");
  return v;
}

function normalizeHttp(v){
  v = safeTrim(v);
  if (!v) return "";
  if (/^http:\/\//i.test(v)) return v.replace(/^http:\/\//i, "https://");
  return v;
}

function setImgPreview(imgEl, file){
  if (!file){ imgEl.src=""; imgEl.style.display="none"; return; }
  const url = URL.createObjectURL(file);
  imgEl.src = url;
  imgEl.style.display = "block";
  imgEl.onload = () => URL.revokeObjectURL(url);
}

// ---------- Image compress ----------
async function fileToJpgBlob(file, maxSide, quality){
  const imgUrl = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imgUrl;
  });
  URL.revokeObjectURL(imgUrl);

  let w = img.width, h = img.height;
  const longSide = Math.max(w, h);
  const scale = longSide > maxSide ? (maxSide / longSide) : 1;
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha:false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Canvas toBlob failed");
  return blob;
}

async function compressBlobUnderLimit(file, maxSide){
  let q = CONFIG.JPG_QUALITY;
  for (let i = 0; i < 10; i++){
    const blob = await fileToJpgBlob(file, maxSide, q);
    if (blob.size <= CONFIG.MAX_IMAGE_BYTES) return { blob, size: blob.size, quality: q };
    q = Math.max(0.62, q - 0.05);
  }
  const blob2 = await fileToJpgBlob(file, Math.max(900, Math.floor(maxSide * 0.75)), 0.70);
  if (blob2.size > CONFIG.MAX_IMAGE_BYTES){
    throw new Error(`壓縮後仍超過限制：${Math.round(blob2.size/1024)}KB（請換小一點的圖）`);
  }
  return { blob: blob2, size: blob2.size, quality: 0.70 };
}

// ---------- GAS ----------
async function gasCall({ action, method="GET", payload=null, params=null }){
  const url = new URL(CONFIG.GAS);
  if (action) url.searchParams.set("action", action);
  if (params){
    Object.entries(params).forEach(([k,v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
  }
  const opt = { method, headers:{} };
  if (method === "POST"){
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(payload || {});
  }
  const res = await withTimeout(fetch(url.toString(), opt), CONFIG.FETCH_TIMEOUT_MS, "GAS fetch");
  const text = await res.text();
  try{ return JSON.parse(text); }
  catch{ return { ok:false, message:"GAS_RESPONSE_NOT_JSON", raw:text }; }
}

async function gasPing(){
  return await gasCall({ action:"ping", method:"GET", params:{ tenant: safeTrim(ui.tenant.value) || CONFIG.TENANT_DEFAULT } });
}

async function gasReserve({ tenant, invite, uid }){
  return await gasCall({ action:"reserve", method:"POST", payload:{ tenant, invite, uid } });
}

async function gasCreate(payload){
  return await gasCall({ action:"create", method:"POST", payload });
}

// ---------- Firebase ----------
const firebaseApp = initializeApp(CONFIG.FIREBASE);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

async function ensureAnonLogin(){
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

async function uploadToFirebase({ tenant, uid, cardId, fileName, blob }){
  await ensureAnonLogin();
  const path = `hsc_cards/${tenant}/${uid}/${cardId}/${fileName}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType:"image/jpeg", cacheControl:"public,max-age=31536000" });
  const url = await getDownloadURL(r);
  return url + (url.includes("?") ? "&" : "?") + `v=${encodeURIComponent(CONFIG.VERSION)}&ts=${Date.now()}`;
}

// ---------- payload ----------
function buildTextPayload(){
  const tenant = safeTrim(ui.tenant.value) || CONFIG.TENANT_DEFAULT;
  return {
    tenant,
    plan: safeTrim(ui.plan.value) || "free",

    name: safeTrim(ui.name.value),
    unit: safeTrim(ui.unit.value),
    title: safeTrim(ui.title.value),

    phone: safeTrim(ui.phone.value),
    email: safeTrim(ui.email.value),

    line_url: normalizeLine(ui.line_url.value),
    line_oa: normalizeHttp(ui.line_oa.value),

    address: safeTrim(ui.address.value),
    website: normalizeHttp(ui.website.value),

    services: "",
    experience: "",
    slogan: "",

    video1: "",
    video2: "",
    video3: "",
    social1: "",
    social2: "",
    social3: "",

    form_ts: new Date().toISOString(),
    client_version: CONFIG.VERSION
  };
}

// ---------- submit ----------
async function onSubmit(){
  ui.btnSubmit.disabled = true;
  ui.btnPing.disabled = true;
  ui.btnReset.disabled = true;
  ui.logBox.textContent = "";

  try{
    setMode("v499（reserve→Firebase→create(url)）");

    const textPayload = buildTextPayload();
    const invite = safeTrim(ui.invite.value);
    if (!invite){ setStatus("邀請碼（invite）必填", "bad"); return; }
    if (!textPayload.name){ setStatus("姓名必填", "bad"); return; }

    const tenant = textPayload.tenant;

    setStatus("匿名登入 Firebase…", "warn");
    const user = await ensureAnonLogin();
    const uid = user?.uid;
    if (!uid) throw new Error("匿名登入失敗：沒有 uid");
    log("uid:", uid);

    setStatus("向 GAS reserve（invite+uid）…", "warn");
    const resv = await gasReserve({ tenant, invite, uid });
    log("reserve:", resv);
    if (!resv?.ok) throw new Error(`reserve 失敗：${resv?.message || "unknown"}`);

    const cardId = resv.cardId;
    log("cardId:", cardId);
    log("uploadPath:", resv.uploadPath || "");

    const avatarFile = ui.avatarFile.files?.[0] || null;
    const logoFile = ui.logoFile.files?.[0] || null;
    const photosFiles = Array.from(ui.photosFile.files || []).slice(0, CONFIG.MAX_PHOTOS);

    const urlFields = {};

    if (avatarFile){
      setStatus("壓縮 avatar…", "warn");
      const a = await compressBlobUnderLimit(avatarFile, CONFIG.AVATAR_MAX);
      log(`avatar OK: ${Math.round(a.size/1024)}KB q=${a.quality}`);
      setStatus("上傳 avatar…", "warn");
      urlFields.avatar_img = await uploadToFirebase({ tenant, uid, cardId, fileName:"avatar.jpg", blob:a.blob });
    }

    if (logoFile){
      setStatus("壓縮 logo…", "warn");
      const l = await compressBlobUnderLimit(logoFile, CONFIG.LOGO_MAX);
      log(`logo OK: ${Math.round(l.size/1024)}KB q=${l.quality}`);
      setStatus("上傳 logo…", "warn");
      urlFields.logo_img = await uploadToFirebase({ tenant, uid, cardId, fileName:"logo.jpg", blob:l.blob });
    }

    for (let i = 0; i < photosFiles.length; i++){
      setStatus(`壓縮 photo${i+1}…`, "warn");
      const p = await compressBlobUnderLimit(photosFiles[i], CONFIG.PHOTO_MAX);
      log(`photo${i+1} OK: ${Math.round(p.size/1024)}KB q=${p.quality}`);
      setStatus(`上傳 photo${i+1}…`, "warn");
      urlFields[`photo${i+1}_img`] = await uploadToFirebase({ tenant, uid, cardId, fileName:`photo${i+1}.jpg`, blob:p.blob });
    }

    const payload = {
      ...textPayload,
      id: cardId,
      invite_code: invite,
      uid,
      reserved_uid: uid,
      ...urlFields
    };

    log("payload(create):", payload);

    setStatus("寫入 GAS create（純URL）…", "warn");
    const out = await gasCreate(payload);
    log("create:", out);
    if (!out?.ok) throw new Error(`create 失敗：${out?.message || "unknown"}`);

    setStatus(`成功 ✅ ${out.item?.id || cardId}（已建立，待館長啟用交貨）`, "good");

    if (out.og_page_url){
      log("preview:", out.og_page_url);
      window.open(out.og_page_url, "_blank");
    }

  }catch(err){
    log("ERROR:", String(err?.message || err));
    setStatus("失敗 ❌（看 log）", "bad");
  }finally{
    ui.btnSubmit.disabled = false;
    ui.btnPing.disabled = false;
    ui.btnReset.disabled = false;
  }
}

// ---------- reset ----------
function onReset(){
  ui.invite.value = "";

  ui.name.value = "";
  ui.unit.value = "";
  ui.title.value = "";
  ui.phone.value = "";
  ui.email.value = "";
  ui.line_url.value = "";
  ui.line_oa.value = "";
  ui.address.value = "";
  ui.website.value = "";

  ui.avatarFile.value = "";
  ui.logoFile.value = "";
  ui.photosFile.value = "";

  ui.avatarPrev.src=""; ui.avatarPrev.style.display="none";
  ui.logoPrev.src=""; ui.logoPrev.style.display="none";
  ui.photosPrev.innerHTML = "";

  ui.logBox.textContent = "";
  setStatus("已清空", "normal");
  setMode("未開始");
}

// ---------- bind previews ----------
ui.tenant.value = CONFIG.TENANT_DEFAULT;

ui.avatarFile.addEventListener("change", () => {
  const f = ui.avatarFile.files?.[0] || null;
  setImgPreview(ui.avatarPrev, f);
});
ui.logoFile.addEventListener("change", () => {
  const f = ui.logoFile.files?.[0] || null;
  setImgPreview(ui.logoPrev, f);
});
ui.photosFile.addEventListener("change", () => {
  const files = Array.from(ui.photosFile.files || []).slice(0, CONFIG.MAX_PHOTOS);
  ui.photosPrev.innerHTML = "";
  files.forEach((f) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(f);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    ui.photosPrev.appendChild(img);
  });
});

// ---------- buttons ----------
ui.btnSubmit.addEventListener("click", onSubmit);

ui.btnPing.addEventListener("click", async () => {
  ui.logBox.textContent = "";
  setStatus("ping…", "warn");
  try{
    const j = await gasPing();
    log("ping:", j);
    setStatus(j?.ok ? "ping ok ✅" : "ping 回應非 ok（看 log）", j?.ok ? "good" : "bad");
  }catch(e){
    log("ping error:", String(e?.message || e));
    setStatus("ping 失敗", "bad");
  }
});

ui.btnReset.addEventListener("click", onReset);

// ---------- boot ----------
setStatus("等待填寫", "normal");
setMode("未開始");
log(`[${CONFIG.VERSION}] ready`);