/* ================================
 * HSC Invite Form v499 (COMPLETE OVERWRITE)
 * - Plan split UI:
 *   free: c1~c5 + s1~s3 + f1~f3, photos<=2
 *   premium: p1~p7, photos<=5
 * - Flow:
 *   1) signInAnonymously -> uid
 *   2) reserve(invite+uid+tenant) -> cardId + uploadPath
 *   3) compress jpg -> upload Firebase:
 *      hsc_cards/{tenant}/{uid}/{cardId}/avatar.jpg|logo.jpg|photo1.jpg...
 *   4) create(text + urls + id + token(if returned) + invite + uid)
 *   5) show confirm UI (no copy link / no share)
 *   6) confirm(id+token) -> pending_activation
 * ================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

const CONFIG = {
  VERSION: "v499",

  // ✅ 你剛貼的最新 GAS URL（已填好）
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

  TENANT_DEFAULT: "angel",
  FETCH_TIMEOUT_MS: 20000,

  // compress settings (行動名片：穩定、漂亮、不要太大)
  AVATAR_MAX: 1100,
  LOGO_MAX: 1100,
  PHOTO_MAX: 1400,
  JPG_QUALITY: 0.84,

  // Plan photo limits
  MAX_PHOTOS_FREE: 2,
  MAX_PHOTOS_PREMIUM: 5,

  // Firebase config（用你現有那組）
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
  invite: $("invite"),
  tenant: $("tenant"),
  plan: $("plan"),

  // free hidden
  color: $("color"),
  style: $("style"),
  paper: $("paper"),

  // premium hidden
  premium_color: $("premium_color"),

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
  photoLimitHint: $("photoLimitHint"),

  freeBox: $("freeBox"),
  premiumBox: $("premiumBox"),

  statusText: $("statusText"),
  modeText: $("modeText"),
  logBox: $("logBox"),

  btnSubmit: $("btnSubmit"),
  btnPing: $("btnPing"),
  btnReset: $("btnReset"),

  confirmBox: $("confirmBox"),
  cId: $("cId"),
  cName: $("cName"),
  btnOk: $("btnOk"),
  btnNeedEdit: $("btnNeedEdit")
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
  if (v.startsWith("@")) return v;
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

function pickLimitByPlan(plan){
  return plan === "premium" ? CONFIG.MAX_PHOTOS_PREMIUM : CONFIG.MAX_PHOTOS_FREE;
}

function applyPlanUI(){
  const plan = safeTrim(ui.plan.value) || "free";
  if (plan === "premium"){
    ui.freeBox.style.display = "none";
    ui.premiumBox.style.display = "block";
    ui.photoLimitHint.textContent = `精品設計最多 ${CONFIG.MAX_PHOTOS_PREMIUM} 張`;
  }else{
    ui.freeBox.style.display = "block";
    ui.premiumBox.style.display = "none";
    ui.photoLimitHint.textContent = `自由搭配最多 ${CONFIG.MAX_PHOTOS_FREE} 張`;
  }
  // 修剪已選照片數量（如果用戶先選很多再切方案）
  trimPhotosToLimit();
}

function trimPhotosToLimit(){
  const plan = safeTrim(ui.plan.value) || "free";
  const limit = pickLimitByPlan(plan);
  const files = Array.from(ui.photosFile.files || []);
  if (files.length <= limit) return;
  // 不能直接改 FileList，只能提示並重新渲染預覽（保持前 limit 張）
  setStatus(`照片超過限制：已選 ${files.length}，${plan==="premium"?"精品":"自由"}最多 ${limit} 張。請重新選擇。`, "warn");
}

function renderPhotosPreview(files){
  ui.photosPrev.innerHTML = "";
  files.forEach((f) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(f);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    ui.photosPrev.appendChild(img);
  });
}

// ---------- Plan Chips ----------
function mkChip(text, onClick){
  const el = document.createElement("div");
  el.className = "chip";
  el.textContent = text;
  el.addEventListener("click", onClick);
  return el;
}
function setActiveChip(container, value){
  Array.from(container.querySelectorAll(".chip")).forEach(ch => {
    ch.classList.toggle("active", ch.dataset.value === value);
  });
}

function buildFreeChips(){
  const freeColors = $("freeColors");
  const freeStyles = $("freeStyles");
  const freePapers = $("freePapers");

  // colors
  const cs = ["c1","c2","c3","c4","c5"];
  freeColors.innerHTML = "";
  cs.forEach(v => {
    const c = mkChip(v, () => {
      ui.color.value = v;
      setActiveChip(freeColors, v);
    });
    c.dataset.value = v;
    freeColors.appendChild(c);
  });

  // styles
  const ss = ["s1","s2","s3"];
  freeStyles.innerHTML = "";
  ss.forEach(v => {
    const c = mkChip(v, () => {
      ui.style.value = v;
      setActiveChip(freeStyles, v);
    });
    c.dataset.value = v;
    freeStyles.appendChild(c);
  });

  // papers
  const fs = ["f1","f2","f3"];
  freePapers.innerHTML = "";
  fs.forEach(v => {
    const c = mkChip(v, () => {
      ui.paper.value = v;
      setActiveChip(freePapers, v);
    });
    c.dataset.value = v;
    freePapers.appendChild(c);
  });

  // defaults
  ui.color.value = ui.color.value || "c1";
  ui.style.value = ui.style.value || "s1";
  ui.paper.value = ui.paper.value || "f1";
  setActiveChip(freeColors, ui.color.value);
  setActiveChip(freeStyles, ui.style.value);
  setActiveChip(freePapers, ui.paper.value);
}

function buildPremiumChips(){
  const premiumColors = $("premiumColors");
  const ps = ["p1","p2","p3","p4","p5","p6","p7"];
  premiumColors.innerHTML = "";
  ps.forEach(v => {
    const c = mkChip(v, () => {
      ui.premium_color.value = v;
      setActiveChip(premiumColors, v);
    });
    c.dataset.value = v;
    premiumColors.appendChild(c);
  });

  ui.premium_color.value = ui.premium_color.value || "p1";
  setActiveChip(premiumColors, ui.premium_color.value);
}

// ---------- Image compress (Canvas → JPG blob) ----------
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
  const tenant = safeTrim(ui.tenant.value) || CONFIG.TENANT_DEFAULT;
  return await gasCall({ action:"ping", method:"GET", params:{ tenant } });
}
async function gasReserve({ invite, uid, tenant }){
  return await gasCall({ action:"reserve", method:"POST", payload:{ invite, uid, tenant } });
}
async function gasCreate(payload){
  return await gasCall({ action:"create", method:"POST", payload });
}
async function gasConfirm({ id, token }){
  return await gasCall({ action:"confirm", method:"POST", payload:{ id, token } });
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

async function uploadToFirebase({ tenant, uid, cardId, pathPrefix, fileName, blob }){
  // pathPrefix is returned by reserve: hsc_cards/{tenant}/{uid}/{cardId}/
  const path = `${pathPrefix}${fileName}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, {
    contentType:"image/jpeg",
    cacheControl:"public,max-age=31536000"
  });
  const url = await getDownloadURL(r);
  // cache-bust for immediate preview (optional)
  return url + (url.includes("?") ? "&" : "?") + `v=${encodeURIComponent(CONFIG.VERSION)}&ts=${Date.now()}`;
}

// ---------- Payload ----------
function buildTextPayload({ tenant, plan }){
  const base = {
    tenant,
    plan,
    name: safeTrim(ui.name.value),
    unit: safeTrim(ui.unit.value),
    title: safeTrim(ui.title.value),
    phone: safeTrim(ui.phone.value),
    email: safeTrim(ui.email.value),
    line_url: normalizeLine(ui.line_url.value),
    line_oa: safeTrim(ui.line_oa.value),
    address: safeTrim(ui.address.value),
    website: safeTrim(ui.website.value),

    // optional fields keep empty (align DB)
    slogan: "",
    services: "",
    experience: "",
    wechat_id: "",
    video1: "",
    video2: "",
    video3: "",
    social1: "",
    social2: "",
    social3: "",

    form_ts: new Date().toISOString(),
    client_version: CONFIG.VERSION
  };

  if (plan === "premium"){
    base.premium_color = safeTrim(ui.premium_color.value) || "p1";
    base.color = "";
    base.style = "";
    base.paper = "";
  }else{
    base.color = safeTrim(ui.color.value) || "c1";
    base.style = safeTrim(ui.style.value) || "s1";
    base.paper = safeTrim(ui.paper.value) || "f1";
    base.premium_color = "";
  }
  return base;
}

// ---------- Submit ----------
let lastCreated = null; // { id, token, name }

async function onSubmit(){
  ui.btnSubmit.disabled = true;
  ui.btnPing.disabled = true;
  ui.btnReset.disabled = true;
  ui.confirmBox.style.display = "none";
  ui.logBox.textContent = "";
  lastCreated = null;

  try{
    const invite = safeTrim(ui.invite.value);
    if (!invite){
      setStatus("邀請碼必填", "bad");
      return;
    }

    const tenant = safeTrim(ui.tenant.value) || CONFIG.TENANT_DEFAULT;
    const plan = safeTrim(ui.plan.value) || "free";

    const textPayload = buildTextPayload({ tenant, plan });
    if (!textPayload.name){
      setStatus("姓名必填", "bad");
      return;
    }

    // photo limit
    const limit = pickLimitByPlan(plan);
    const photoFilesAll = Array.from(ui.photosFile.files || []);
    if (photoFilesAll.length > limit){
      setStatus(`照片超過限制：${plan==="premium"?"精品":"自由"}最多 ${limit} 張，請重新選擇。`, "bad");
      return;
    }

    setMode("B（reserve→Firebase→create(url)）");
    setStatus("Firebase 匿名登入…", "warn");
    const user = await ensureAnonLogin();
    const uid = user.uid;
    log("uid:", uid);

    setStatus("reserve（綁邀請碼+uid）…", "warn");
    const reserved = await gasReserve({ invite, uid, tenant });
    log("reserve:", reserved);

    if (!reserved?.ok || !reserved?.cardId || !reserved?.uploadPath){
      setStatus("reserve 失敗（看 log）", "bad");
      return;
    }

    const cardId = reserved.cardId;
    const uploadPath = reserved.uploadPath; // ends with /
    // token may or may not exist depending on your GAS
    const token = reserved.token || "";

    // Compress + upload
    const avatarFile = ui.avatarFile.files?.[0] || null;
    const logoFile = ui.logoFile.files?.[0] || null;

    const photoFiles = photoFilesAll; // already limited

    setStatus("壓縮圖片…", "warn");
    const avatarBlob = avatarFile ? await fileToJpgBlob(avatarFile, CONFIG.AVATAR_MAX, CONFIG.JPG_QUALITY) : null;
    const logoBlob   = logoFile   ? await fileToJpgBlob(logoFile,   CONFIG.LOGO_MAX,   CONFIG.JPG_QUALITY) : null;

    const photoBlobs = [];
    for (let i = 0; i < photoFiles.length; i++){
      photoBlobs.push(await fileToJpgBlob(photoFiles[i], CONFIG.PHOTO_MAX, CONFIG.JPG_QUALITY));
    }

    setStatus("上傳 Firebase…", "warn");
    const urlFields = {};
    if (avatarBlob) urlFields.avatar_img = await uploadToFirebase({ tenant, uid, cardId, pathPrefix: uploadPath, fileName:"avatar.jpg", blob: avatarBlob });
    if (logoBlob)   urlFields.logo_img   = await uploadToFirebase({ tenant, uid, cardId, pathPrefix: uploadPath, fileName:"logo.jpg",   blob: logoBlob });

    for (let i = 0; i < photoBlobs.length; i++){
      urlFields[`photo${i+1}_img`] = await uploadToFirebase({
        tenant, uid, cardId,
        pathPrefix: uploadPath,
        fileName: `photo${i+1}.jpg`,
        blob: photoBlobs[i]
      });
    }

    setStatus("寫入 GAS create（純文字+URL）…", "warn");
    const payload = {
      ...textPayload,
      id: cardId,
      ...(token ? { token } : {}),
      invite,
      uid,
      ...urlFields
    };
    log("payload(create):", payload);

    const out = await gasCreate(payload);
    log("create:", out);

    if (!out?.ok){
      setStatus("create 失敗（看 log）", "bad");
      return;
    }

    const createdId = out.item?.id || cardId;
    const createdToken = out.item?.token || token || "";
    lastCreated = { id: createdId, token: createdToken, name: textPayload.name };

    // Show confirm UI
    ui.cId.textContent = createdId;
    ui.cName.textContent = textPayload.name;
    ui.confirmBox.style.display = "block";

    setStatus(`建立成功 ✅ ${createdId}（請核對後按「我確認 OK」）`, "good");
    return;

  }catch(err){
    log("ERROR:", String(err?.message || err));
    setStatus("失敗 ❌（看 log）", "bad");
  }finally{
    ui.btnSubmit.disabled = false;
    ui.btnPing.disabled = false;
    ui.btnReset.disabled = false;
  }
}

// ---------- Confirm Buttons ----------
async function onConfirmOk(){
  if (!lastCreated?.id || !lastCreated?.token){
    setStatus("缺少 token，無法確認（請看 log / GAS reserve 是否回 token）", "bad");
    return;
  }
  ui.btnOk.disabled = true;
  ui.btnNeedEdit.disabled = true;

  try{
    setStatus("送出確認（confirm）…", "warn");
    const out = await gasConfirm({ id: lastCreated.id, token: lastCreated.token });
    log("confirm:", out);

    if (out?.ok){
      setStatus("已確認 ✅（等待館長啟用交貨）", "good");
    }else{
      setStatus("confirm 失敗（看 log）", "bad");
    }
  }catch(err){
    log("confirm ERROR:", String(err?.message || err));
    setStatus("confirm 失敗", "bad");
  }finally{
    ui.btnOk.disabled = false;
    ui.btnNeedEdit.disabled = false;
  }
}

function onNeedEdit(){
  setStatus("已標記需要修改。請直接把需要修改的內容回覆給館長。", "warn");
}

// ---------- Reset ----------
function onReset(){
  ui.invite.value = "";
  ui.tenant.value = CONFIG.TENANT_DEFAULT;
  ui.plan.value = "free";

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

  ui.confirmBox.style.display = "none";
  ui.logBox.textContent = "";
  lastCreated = null;

  applyPlanUI();
  setStatus("已清空", "normal");
  setMode("未開始");
}

// ---------- Bind ----------
ui.tenant.value = CONFIG.TENANT_DEFAULT;

ui.plan.addEventListener("change", applyPlanUI);

ui.avatarFile.addEventListener("change", () => {
  setImgPreview(ui.avatarPrev, ui.avatarFile.files?.[0] || null);
});
ui.logoFile.addEventListener("change", () => {
  setImgPreview(ui.logoPrev, ui.logoFile.files?.[0] || null);
});
ui.photosFile.addEventListener("change", () => {
  const plan = safeTrim(ui.plan.value) || "free";
  const limit = pickLimitByPlan(plan);
  const files = Array.from(ui.photosFile.files || []);
  if (files.length > limit){
    setStatus(`照片超過限制：已選 ${files.length}，最多 ${limit} 張。請重新選擇。`, "bad");
    renderPhotosPreview(files.slice(0, limit));
    return;
  }
  renderPhotosPreview(files);
});

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

ui.btnOk.addEventListener("click", onConfirmOk);
ui.btnNeedEdit.addEventListener("click", onNeedEdit);

// ---------- Boot ----------
buildFreeChips();
buildPremiumChips();
applyPlanUI();

setStatus("等待填寫", "normal");
setMode("未開始");
log(`[${CONFIG.VERSION}] ready`);