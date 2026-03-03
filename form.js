/* ================================
 * HSC Form v498 (COMPLETE OVERWRITE)
 * - Prefer B: reserve -> Firebase -> create(urls)
 * - If reserve missing (your current GAS v497) => fallback A: create(dataURL)
 * - Align with GAS v497 MAX_IMAGE_BYTES = 650KB
 * ================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

const CONFIG = {
  VERSION: "v498",

  // ✅ 改成你的 GAS WebApp exec URL
  GAS: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",

  TENANT_DEFAULT: "angel",
  FETCH_TIMEOUT_MS: 20000,

  // Image rules (align GAS)
  MAX_IMAGE_BYTES: 650 * 1024, // 650KB

  // compress settings (tuned to fit 650KB usually)
  AVATAR_MAX: 1100,
  LOGO_MAX: 1100,
  PHOTO_MAX: 1400,
  JPG_QUALITY: 0.84,

  MAX_PHOTOS: 5,

  // Firebase config (kept for B; will only be used if reserve works)
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
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label}: ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function safeTrim(v){ return (v ?? "").toString().trim(); }

function normalizeLine(v){
  v = safeTrim(v);
  if (!v) return "";
  if (v.startsWith("@")) return v; // keep @id; GAS normalizeLine_ accepts
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

async function blobToDataUrl(blob){
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

async function compressToDataUrlUnderLimit(file, maxSide){
  // Step-down quality to ensure <= 650KB
  let q = CONFIG.JPG_QUALITY;
  for (let i = 0; i < 8; i++){
    const blob = await fileToJpgBlob(file, maxSide, q);
    if (blob.size <= CONFIG.MAX_IMAGE_BYTES){
      const dataUrl = await blobToDataUrl(blob);
      return { dataUrl, size: blob.size, quality: q };
    }
    q = Math.max(0.62, q - 0.04);
  }
  // last try with smaller maxSide
  const blob2 = await fileToJpgBlob(file, Math.max(900, Math.floor(maxSide * 0.75)), 0.72);
  if (blob2.size > CONFIG.MAX_IMAGE_BYTES){
    throw new Error(`壓縮後仍超過 650KB：${Math.round(blob2.size/1024)}KB（請換小一點的圖）`);
  }
  const dataUrl2 = await blobToDataUrl(blob2);
  return { dataUrl: dataUrl2, size: blob2.size, quality: 0.72 };
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

// reserve (optional; not in your GAS v497 now)
async function tryReserve(tenant){
  // try POST then GET
  let j = await gasCall({ action:"reserve", method:"POST", payload:{ tenant } });
  if (j?.ok && j?.id && j?.token) return j;
  j = await gasCall({ action:"reserve", method:"GET", params:{ tenant } });
  if (j?.ok && j?.id && j?.token) return j;
  return null;
}

async function gasCreate(payload){
  return await gasCall({ action:"create", method:"POST", payload });
}

// ---------- Firebase (only used if reserve works) ----------
const firebaseApp = initializeApp(CONFIG.FIREBASE);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

async function ensureAnonLogin(){
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}
async function uploadToFirebase({ tenant, cardId, kind, blob }){
  await ensureAnonLogin();
  const path = `hsc_cards/${tenant}/${cardId}/${kind}.jpg`;
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
    line_oa: safeTrim(ui.line_oa.value),
    address: safeTrim(ui.address.value),
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
    const textPayload = buildTextPayload();
    if (!textPayload.name){
      setStatus("姓名必填", "bad");
      return;
    }

    const tenant = textPayload.tenant;

    setStatus("檢查 reserve（若有就走 B）…", "warn");
    const reserved = await tryReserve(tenant);

    const avatarFile = ui.avatarFile.files?.[0] || null;
    const logoFile = ui.logoFile.files?.[0] || null;
    const photosFiles = Array.from(ui.photosFile.files || []).slice(0, CONFIG.MAX_PHOTOS);

    // ---- B path (only if reserved ok) ----
    if (reserved){
      setMode("B（reserve→Firebase→create(url)）");
      log("reserve ok:", reserved);

      const cardId = reserved.id;
      const token = reserved.token;

      setStatus("B：壓縮圖片…", "warn");

      const avatarBlob = avatarFile ? await fileToJpgBlob(avatarFile, CONFIG.AVATAR_MAX, CONFIG.JPG_QUALITY) : null;
      const logoBlob   = logoFile   ? await fileToJpgBlob(logoFile,   CONFIG.LOGO_MAX,   CONFIG.JPG_QUALITY) : null;

      const photoBlobs = [];
      for (let i = 0; i < photosFiles.length; i++){
        photoBlobs.push(await fileToJpgBlob(photosFiles[i], CONFIG.PHOTO_MAX, CONFIG.JPG_QUALITY));
      }

      setStatus("B：上傳 Firebase…", "warn");

      const urlFields = {};
      if (avatarBlob) urlFields.avatar_img = await uploadToFirebase({ tenant, cardId, kind:"avatar", blob:avatarBlob });
      if (logoBlob)   urlFields.logo_img   = await uploadToFirebase({ tenant, cardId, kind:"logo",   blob:logoBlob });

      for (let i = 0; i < photoBlobs.length; i++){
        urlFields[`photo${i+1}_img`] = await uploadToFirebase({ tenant, cardId, kind:`photo${i+1}`, blob:photoBlobs[i] });
      }

      const payload = { ...textPayload, id: cardId, token, ...urlFields };
      log("payload(B):", payload);

      setStatus("B：寫入 GAS create…", "warn");
      const out = await gasCreate(payload);
      log("GAS create:", out);

      if (out?.ok){
        setStatus(`成功 ✅ ${out.item?.id || cardId}`, "good");
      }else{
        setStatus("已送出，但 GAS 回應非 ok（看 log）", "bad");
      }
      return;
    }

    // ---- A path (fallback, align your GAS v497) ----
    setMode("A（dataURL→GAS→Drive）");
    setStatus("A：壓縮並轉 dataURL（≤650KB）…", "warn");

    const imgFields = {};

    if (avatarFile){
      const a = await compressToDataUrlUnderLimit(avatarFile, CONFIG.AVATAR_MAX);
      imgFields.avatar_img = a.dataUrl;
      log(`avatar dataURL OK: ${Math.round(a.size/1024)}KB q=${a.quality}`);
    }
    if (logoFile){
      const l = await compressToDataUrlUnderLimit(logoFile, CONFIG.LOGO_MAX);
      imgFields.logo_img = l.dataUrl;
      log(`logo dataURL OK: ${Math.round(l.size/1024)}KB q=${l.quality}`);
    }
    for (let i = 0; i < photosFiles.length; i++){
      const p = await compressToDataUrlUnderLimit(photosFiles[i], CONFIG.PHOTO_MAX);
      imgFields[`photo${i+1}_img`] = p.dataUrl;
      log(`photo${i+1} dataURL OK: ${Math.round(p.size/1024)}KB q=${p.quality}`);
    }

    const payloadA = { ...textPayload, ...imgFields };
    log("payload(A):", payloadA);

    setStatus("A：送到 GAS create（含 dataURL）…", "warn");
    const outA = await gasCreate(payloadA);
    log("GAS create:", outA);

    if (outA?.ok){
      setStatus(`成功 ✅ ${outA.item?.id || "(id由後端產生)"}`, "good");
    }else{
      setStatus("已送出，但 GAS 回應非 ok（看 log）", "bad");
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