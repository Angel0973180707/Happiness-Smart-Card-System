/* =========================================================
 * form.js — v510 (COMPLETE OVERWRITE)
 * Happiness Smart Card System — Frontend Form
 *
 * ✅ v510 rules:
 * - Fixed GAS exec
 * - reserve/create: GET-first (avoid CORS preflight) + fallback POST (urlencoded)
 * - create: text + image downloadURL only (NO base64)
 * - If URL has exp+sig: include exp+sig in create (optional hardening)
 * - Console logs writtenFields / skippedFields for debugging
 * ========================================================= */

(() => {
  const VERSION = 510;

  const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_TENANT: "angel",
    // When true, create() will pass enforceSig=1 to GAS (GAS will require token or sig per its logic)
    ENFORCE_SIG: false
  };

  /* -----------------------------
   * Utilities
   * ----------------------------- */
  const qs = new URLSearchParams(location.search);

  const getParam = (k, d = "") => (qs.get(k) ?? d);
  const hasParam = (k) => qs.has(k);

  const nowIso = () => new Date().toISOString();

  function log(...a){ console.log(`[form v${VERSION}]`, ...a); }
  function warn(...a){ console.warn(`[form v${VERSION}]`, ...a); }
  function err(...a){ console.error(`[form v${VERSION}]`, ...a); }

  function setStatusText(msg){
    const el = document.querySelector("[data-status]") || document.getElementById("status") || null;
    if(el) el.textContent = msg;
  }

  function $(sel){ return document.querySelector(sel); }

  function val(sel){
    const el = $(sel);
    if(!el) return "";
    return String(el.value ?? "").trim();
  }

  function pickFile(sel){
    const el = $(sel);
    if(!el || !el.files || !el.files[0]) return null;
    return el.files[0];
  }

  function isProbablyBase64(s){
    return typeof s === "string" && s.startsWith("data:image/");
  }

  function buildUploadPath(tenant, cardId){
    // must match: hsc_cards/{tenant}/{cardId}/{fileName}
    return `hsc_cards/${tenant}/${cardId}/`;
  }

  function safeFileName(file){
    const name = String(file && file.name ? file.name : "image");
    // basic sanitize
    return name.replace(/[^\w.\-()]+/g, "_").slice(0, 80);
  }

  function requireFirebaseReady(){
    if(!window.firebase) throw new Error("Firebase SDK not found on page. Please load firebase-app + firebase-storage.");
    if(!firebase.apps || !firebase.apps.length) throw new Error("Firebase not initialized. Please call firebase.initializeApp(...) in form.html.");
    if(!firebase.storage) throw new Error("Firebase storage SDK not loaded (firebase-storage).");
  }

  /* -----------------------------
   * GAS fetch: GET-first + POST fallback
   * ----------------------------- */
  async function gasCall(action, params){
    const p = Object.assign({}, params || {});
    p.action = action;
    p.v = String(VERSION);

    // GET first (avoid CORS preflight)
    const url = CONFIG.GAS + "?" + new URLSearchParams(p).toString();
    try{
      const r = await fetch(url, { method:"GET", mode:"cors", cache:"no-store" });
      const t = await r.text();
      let j = null;
      try{ j = JSON.parse(t); }catch(_){}
      if(!j) throw new Error("GAS non-JSON response (GET): " + t.slice(0,120));
      return j;
    }catch(e){
      warn("GET failed, fallback to POST", e);

      // POST fallback: application/x-www-form-urlencoded
      const body = new URLSearchParams(p).toString();
      const r2 = await fetch(CONFIG.GAS, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: { "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8" },
        body
      });
      const t2 = await r2.text();
      let j2 = null;
      try{ j2 = JSON.parse(t2); }catch(_){}
      if(!j2) throw new Error("GAS non-JSON response (POST): " + t2.slice(0,120));
      return j2;
    }
  }

  /* -----------------------------
   * Reserve -> Upload -> Create
   * ----------------------------- */
  async function reserveCard(){
    const tenant = val('[name="tenant"]') || getParam("tenant") || CONFIG.DEFAULT_TENANT;
    const plan = val('[name="plan"]') || getParam("plan") || "free";

    setStatusText("建立名片序號中...");
    const res = await gasCall("reserve", { tenant, plan });

    if(!res.ok) throw new Error(`reserve failed: ${res.error || "unknown"}`);

    log("reserve ok:", res);

    // store in hidden fields if exist
    const idEl = $('[name="cardId"]') || $('[data-card-id]');
    const tokenEl = $('[name="token"]') || $('[data-token]');
    if(idEl) idEl.value = res.id;
    if(tokenEl) tokenEl.value = res.token;

    return res;
  }

  async function uploadToFirebase(tenant, cardId, file, kind){
    requireFirebaseReady();
    if(!file) return "";

    const folder = buildUploadPath(tenant, cardId);
    const fileName = `${kind}_${Date.now()}_${safeFileName(file)}`;
    const fullPath = folder + fileName;

    // Firebase Storage upload
    setStatusText(`上傳圖片中：${kind}...`);
    const ref = firebase.storage().ref(fullPath);
    const snapshot = await ref.put(file, { contentType: file.type || "image/*" });
    const url = await snapshot.ref.getDownloadURL();

    log(`upload ok (${kind})`, { fullPath, url });
    return url;
  }

  function collectPayload(tenant, cardId, token){
    // ✅ 僅收白名單欄位，且不送 base64
    // 你 form.html 的欄位 name 可按這裡對應（沒有就忽略）
    const payload = {
      tenant,
      id: cardId,
      token,

      // optional sig hardening
      exp: getParam("exp", ""),
      sig: getParam("sig", ""),

      // overwrite default 0
      overwrite: "0",
      enforceSig: CONFIG.ENFORCE_SIG ? "1" : "0",

      // business fields
      plan: val('[name="plan"]'),
      billing_status: val('[name="billing_status"]'),
      color: val('[name="color"]'),
      style: val('[name="style"]'),
      paper: val('[name="paper"]'),
      premium_color: val('[name="premium_color"]'),

      name: val('[name="name"]'),
      unit: val('[name="unit"]'),
      title: val('[name="title"]'),
      slogan: val('[name="slogan"]'),
      services: val('[name="services"]'),
      experience: val('[name="experience"]'),

      phone: val('[name="phone"]'),
      email: val('[name="email"]'),
      website: val('[name="website"]'),
      address: val('[name="address"]'),

      line_id: val('[name="line_id"]'),
      line_url: val('[name="line_url"]'),
      line_oa: val('[name="line_oa"]'),
      wechat_id: val('[name="wechat_id"]'),

      video1: val('[name="video1"]'),
      video2: val('[name="video2"]'),
      video3: val('[name="video3"]'),
      social1: val('[name="social1"]'),
      social2: val('[name="social2"]'),
      social3: val('[name="social3"]'),

      notes: val('[name="notes"]')
    };

    // ✅ 若 URL 沒有 exp/sig 就不要送空字串（讓 GAS 判斷更乾淨）
    if(!payload.exp) delete payload.exp;
    if(!payload.sig) delete payload.sig;

    // ✅ 安全：任何欄位如果被填成 base64，直接丟錯（避免又塞回 GAS）
    for(const k of Object.keys(payload)){
      if(isProbablyBase64(payload[k])) throw new Error(`base64 rejected in field: ${k}`);
    }

    return payload;
  }

  async function createCard(payload){
    setStatusText("寫入資料到 card_db 中...");
    const res = await gasCall("create", payload);

    if(!res.ok) throw new Error(`create failed: ${res.error || "unknown"}`);

    log("create ok:", res);
    log("writtenFields:", res.writtenFields || []);
    log("skippedFields:", res.skippedFields || []);

    return res;
  }

  async function runSubmitFlow(){
    try{
      setStatusText("開始送出...");

      // 1) reserve
      const r = await reserveCard();
      const tenant = r.tenant || CONFIG.DEFAULT_TENANT;
      const cardId = r.id;
      const token = r.token;

      // 2) upload images (optional)
      const avatarFile = pickFile('[name="avatar_file"]') || pickFile('#avatar_file');
      const logoFile   = pickFile('[name="logo_file"]')   || pickFile('#logo_file');
      const p1File     = pickFile('[name="photo1_file"]') || pickFile('#photo1_file');
      const p2File     = pickFile('[name="photo2_file"]') || pickFile('#photo2_file');
      const p3File     = pickFile('[name="photo3_file"]') || pickFile('#photo3_file');
      const p4File     = pickFile('[name="photo4_file"]') || pickFile('#photo4_file');
      const p5File     = pickFile('[name="photo5_file"]') || pickFile('#photo5_file');

      // NOTE: 若你精品/自由要限制張數，建議在 form.html 做 UI 限制（v510 先把資料寫進去穩）
      const avatarUrl = await uploadToFirebase(tenant, cardId, avatarFile, "avatar");
      const logoUrl   = await uploadToFirebase(tenant, cardId, logoFile,   "logo");
      const photo1Url = await uploadToFirebase(tenant, cardId, p1File,     "photo1");
      const photo2Url = await uploadToFirebase(tenant, cardId, p2File,     "photo2");
      const photo3Url = await uploadToFirebase(tenant, cardId, p3File,     "photo3");
      const photo4Url = await uploadToFirebase(tenant, cardId, p4File,     "photo4");
      const photo5Url = await uploadToFirebase(tenant, cardId, p5File,     "photo5");

      // 3) create payload (text + url only)
      const payload = collectPayload(tenant, cardId, token);
      if(avatarUrl) payload.avatar_img = avatarUrl;
      if(logoUrl)   payload.logo_img   = logoUrl;
      if(photo1Url) payload.photo1_img = photo1Url;
      if(photo2Url) payload.photo2_img = photo2Url;
      if(photo3Url) payload.photo3_img = photo3Url;
      if(photo4Url) payload.photo4_img = photo4Url;
      if(photo5Url) payload.photo5_img = photo5Url;

      // 4) create
      const c = await createCard(payload);

      // 5) success UI
      setStatusText("送出成功 ✅ 資料已寫入系統");
      const successEl = $("#success") || document.querySelector("[data-success]");
      if(successEl) successEl.style.display = "";

      // optionally show card id
      const showId = $("#result_id") || document.querySelector("[data-result-id]");
      if(showId) showId.textContent = cardId;

      // Debug summary
      log("DONE", {
        cardId,
        writtenFields: c.writtenFields || [],
        skippedFields: c.skippedFields || []
      });

    }catch(e){
      err(e);
      setStatusText("送出失敗 ❌ 請開啟 Console 查看錯誤");

      const failEl = $("#error") || document.querySelector("[data-error]");
      if(failEl){
        failEl.style.display = "";
        failEl.textContent = String(e && e.message ? e.message : e);
      }
    }
  }

  /* -----------------------------
   * Bind submit
   * ----------------------------- */
  function init(){
    log("init", { gas: CONFIG.GAS, ts: nowIso() });

    const btn = $("#submitBtn") || document.querySelector("[data-submit]");
    const form = $("form");

    if(btn){
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        runSubmitFlow();
      });
    }else if(form){
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        runSubmitFlow();
      });
    }else{
      warn("No submit button or form found. Please bind manually.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();