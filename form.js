/* =============================================
 * form.js — v512 (COMPLETE OVERWRITE)
 * - One-page step form (STEP 1~8)
 * - Swatches for color (c1~c5, p1~p7)
 * - Style/Paper displayed in Chinese but stored as s1~s3 / f1~f3
 * - Ping-first (stop if GAS down; no reserve waste)
 * - Draft resume: fields(localStorage) + images(IndexedDB)
 * - Reserve anti-spam: draft card id/token reused
 * - GET-first + POST fallback (avoid CORS preflight)
 * - Upload to Firebase Storage path: hsc_cards/{tenant}/{cardId}/{fileName}
 * - Create sends text + downloadURL only (no base64)
 * - Console logs writtenFields/skippedFields
 * ============================================= */

(() => {
  "use strict";

  const VERSION = "v512";
  const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_TENANT: "angel",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 1,

    DRAFT_CARD_KEY: "hsc_draft_card_v1",
    DRAFT_FORM_KEY: "hsc_draft_form_v1",
    DRAFT_TTL_MS: 12 * 60 * 60 * 1000,

    IDB: { DB_NAME: "hsc_draft_db", DB_VER: 1, STORE: "files" },

    COMPRESS: {
      avatar: { maxW: 1200, maxH: 1200, targetKB: 280, qualityStart: 0.86, qualityMin: 0.55 },
      logo:   { maxW: 1200, maxH: 1200, targetKB: 220, qualityStart: 0.86, qualityMin: 0.55 },
      photo:  { maxW: 1600, maxH: 1600, targetKB: 420, qualityStart: 0.84, qualityMin: 0.50 },
    }
  };

  const byId = (id) => document.getElementById(id);
  const URLP = new URLSearchParams(location.search);
  const exp = URLP.get("exp") || "";
  const sig = URLP.get("sig") || "";
  const tenant = (URLP.get("tenant") || CONFIG.DEFAULT_TENANT).trim() || CONFIG.DEFAULT_TENANT;

  const STEP_MAX = 8;
  let step = 1;
  let inFlight = false;
  let currentCardId = "";
  let currentToken = "";

  /* -----------------------------
   * UI basics
   * ----------------------------- */
  function toast(msg) {
    let t = byId("hscToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hscToast";
      t.style.cssText = [
        "position:fixed","left:16px","right:16px","top:14px","z-index:99998",
        "padding:12px 14px","border-radius:999px","background:rgba(255,255,255,.90)",
        "color:rgba(0,0,0,.88)","font:14px/1.4 system-ui,-apple-system,'Noto Sans TC',Segoe UI,Roboto,Arial",
        "box-shadow:0 8px 22px rgba(0,0,0,.18)","text-align:center",
        "opacity:0","transform:translateY(-8px)","transition:opacity .18s ease, transform .18s ease"
      ].join(";");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(-8px)";
    }, 2200);
  }

  function setText(id, v){ const el = byId(id); if(el) el.textContent = String(v ?? ""); }
  function getValue(id){ const el = byId(id); return el ? String(el.value || "").trim() : ""; }
  function setValue(id, v){ const el = byId(id); if(el) el.value = String(v ?? ""); }
  function pickFile(id){ const el = byId(id); return (el && el.files && el.files[0]) ? el.files[0] : null; }
  function nowMs(){ return Date.now(); }

  function setPill(msg){ const el = byId("pillMsg"); if(el) el.textContent = msg; }

  /* -----------------------------
   * Debug panel (same as v511.x)
   * ----------------------------- */
  function ensureDebugPanel() {
    let box = byId("hscDebugBox");
    if (box) return box;

    box = document.createElement("div");
    box.id = "hscDebugBox";
    box.style.cssText = [
      "position:fixed","left:12px","right:12px","bottom:72px","z-index:99999",
      "padding:12px","border-radius:16px","background:rgba(0,0,0,.72)",
      "color:rgba(255,255,255,.92)","font:12px/1.5 system-ui,-apple-system,'Noto Sans TC',Segoe UI,Roboto,Arial",
      "box-shadow:0 10px 30px rgba(0,0,0,.35)","backdrop-filter: blur(10px)",
      "max-height:46vh","overflow:auto","display:none"
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px;";
    header.innerHTML = `
      <div style="font-weight:900;letter-spacing:.5px">HSC Debug</div>
      <div style="opacity:.75">${VERSION}</div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button id="hscDbgHide" style="all:unset;cursor:pointer;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.12)">收起</button>
        <button id="hscDbgCopy" style="all:unset;cursor:pointer;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.12)">複製</button>
        <button id="hscDbgClear" style="all:unset;cursor:pointer;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.12)">清空</button>
      </div>
    `;

    const pre = document.createElement("pre");
    pre.id = "hscDbgPre";
    pre.style.cssText = "white-space:pre-wrap;margin:0;opacity:.95";

    box.appendChild(header);
    box.appendChild(pre);
    document.body.appendChild(box);

    byId("hscDbgHide").onclick = () => (box.style.display = "none");
    byId("hscDbgClear").onclick = () => (pre.textContent = "");
    byId("hscDbgCopy").onclick = async () => {
      try { await navigator.clipboard.writeText(pre.textContent || ""); toast("已複製 Debug ✅"); }
      catch { toast("複製失敗（瀏覽器限制）"); }
    };
    return box;
  }

  function dbg(line, obj) {
    const box = ensureDebugPanel();
    const pre = byId("hscDbgPre");
    const ts = new Date().toISOString().replace("T", " ").replace("Z", "");
    pre.textContent += `[${ts}] ${obj ? `${line} ${safeJson(obj)}` : line}\n`;
    if (/fail|error|拒絕|無法|timeout|missing|mismatch/i.test(line)) box.style.display = "block";
  }

  function safeJson(x){ try{return JSON.stringify(x);}catch{return String(x);} }

  /* -----------------------------
   * Step engine
   * ----------------------------- */
  function showStep(n){
    step = Math.max(1, Math.min(STEP_MAX, n));
    document.querySelectorAll(".step").forEach((s) => {
      const k = Number(s.getAttribute("data-step") || "0");
      s.classList.toggle("hide", k !== step);
    });

    // hide CTA step if plan != premium
    const plan = getValue("plan");
    if (step === 7 && plan !== "premium") {
      // skip CTA step for free
      step = 8;
      showStep(8);
      return;
    }

    // progress
    const percent = Math.round((step / STEP_MAX) * 100);
    const fill = byId("progressFill");
    if (fill) fill.style.width = `${Math.max(10, percent)}%`;

    const titles = {
      1:"STEP 1｜方案",
      2:"STEP 2｜外觀",
      3:"STEP 3｜主資訊",
      4:"STEP 4｜圖片",
      5:"STEP 5｜聯絡",
      6:"STEP 6｜影音/社群",
      7:"STEP 7｜精品 CTA",
      8:"STEP 8｜送出"
    };
    setText("stepTitle", titles[step] || `STEP ${step}`);

    // nav buttons
    const prev = byId("prevBtn");
    const next = byId("nextBtn");
    if (prev) prev.disabled = (step === 1) || inFlight;
    if (next) next.textContent = (step === STEP_MAX) ? "完成" : "下一步";
    if (next) next.disabled = inFlight;

    // update summary + preview
    updatePreview();
    updateSummary();
    validateLive(); // keep pill updated
  }

  function goNext(){
    if (step < STEP_MAX) showStep(step + 1);
  }
  function goPrev(){
    if (step > 1) showStep(step - 1);
  }

  /* -----------------------------
   * Theme UI split
   * ----------------------------- */
  function applyPlanUI(plan){
    const freeCard = byId("freeThemeCard");
    const premiumCard = byId("premiumThemeCard");
    const premiumPhotoRow = byId("premiumPhotoRow");

    if (plan === "premium") {
      freeCard?.classList.add("hide");
      premiumCard?.classList.remove("hide");
      premiumPhotoRow?.classList.remove("hide");

      // clear free selections
      setValue("color", "");
      setValue("style", "");
      setValue("paper", "");
      clearGroup("color");
      clearChips("style");
      clearChips("paper");
    } else {
      freeCard?.classList.remove("hide");
      premiumCard?.classList.add("hide");
      premiumPhotoRow?.classList.add("hide");

      // clear premium selections
      setValue("premium_color", "");
      clearGroup("premium_color");

      // clear premium-only inputs
      setValue("cta_text", "");
      setValue("cta_link", "");
    }

    updatePreview();
    updateSummary();
    validateLive();
    scheduleSaveDraft();
  }

  function clearChips(group){
    document.querySelectorAll(`[data-chip-group="${group}"]`).forEach(btn => btn.dataset.on = "0");
  }
  function clearGroup(group){
    document.querySelectorAll(`[data-swatch-group="${group}"] .swatch`).forEach(btn => btn.dataset.on = "0");
  }

  function setChipOn(group, value){
    document.querySelectorAll(`[data-chip-group="${group}"]`).forEach(btn => {
      btn.dataset.on = (btn.getAttribute("data-value") === value) ? "1" : "0";
    });
    setValue(group, value);
  }

  function setSwatchOn(group, value){
    document.querySelectorAll(`[data-swatch-group="${group}"] .swatch`).forEach(btn => {
      btn.dataset.on = (btn.getAttribute("data-value") === value) ? "1" : "0";
    });
    setValue(group, value);
  }

  /* -----------------------------
   * Preview (links with codes)
   * ----------------------------- */
  function updatePreview(){
    const plan = getValue("plan") || "free";
    const name = getValue("name") || "姓名";
    const unit = getValue("unit") || "單位";
    const title = getValue("title") || "頭銜";

    setText("pvName", name);
    setText("pvUnit", unit);
    setText("pvTitle", title);

    const card = byId("previewCard");
    const banner = byId("previewBanner");
    if (!card || !banner) return;

    // reset classes
    card.className = "preview-card";
    banner.className = "preview-banner";

    if (plan === "premium") {
      const p = getValue("premium_color") || "p?";
      setText("pvTheme", p);
      // simple mapping for preview (visual only)
      card.dataset.plan = "premium";
      card.dataset.p = p;
      // apply background by class injection
      banner.style.background = getComputedStyle(findSwatchEl("premium_color", p) || banner).background || "";
    } else {
      const c = getValue("color") || "c?";
      const s = getValue("style") || "s?";
      const f = getValue("paper") || "f?";
      setText("pvTheme", `${c}/${s}/${f}`);

      // background by free color swatch
      banner.style.background = getComputedStyle(findSwatchEl("color", c) || banner).background || "";
    }
  }

  function findSwatchEl(group, value){
    return document.querySelector(`[data-swatch-group="${group}"] .swatch[data-value="${value}"]`);
  }

  /* -----------------------------
   * Summary
   * ----------------------------- */
  function updateSummary(){
    const plan = getValue("plan") || "-";
    setText("sumPlan", plan === "premium" ? "精品設計" : (plan === "free" ? "自由搭配" : "-"));

    if (plan === "premium") {
      setText("sumTheme", getValue("premium_color") || "-");
    } else {
      const c = getValue("color") || "-";
      const s = getValue("style") || "-";
      const f = getValue("paper") || "-";
      setText("sumTheme", `${c}/${s}/${f}`);
    }

    setText("sumName", getValue("name") || "-");
    setText("sumUnit", getValue("unit") || "-");
    setText("sumTitle", getValue("title") || "-");
  }

  /* -----------------------------
   * Draft: localStorage fields
   * ----------------------------- */
  function readFormDraft(){
    try{
      const raw = localStorage.getItem(CONFIG.DRAFT_FORM_KEY);
      if(!raw) return null;
      const d = JSON.parse(raw);
      if(!d || d.tenant !== tenant) return null;
      if (nowMs() - (d.ts||0) > CONFIG.DRAFT_TTL_MS) { localStorage.removeItem(CONFIG.DRAFT_FORM_KEY); return null; }
      return d;
    }catch{ return null; }
  }
  function writeFormDraft(fields){
    try{ localStorage.setItem(CONFIG.DRAFT_FORM_KEY, JSON.stringify({tenant, ts: nowMs(), fields})); }catch{}
  }
  function clearFormDraft(){ localStorage.removeItem(CONFIG.DRAFT_FORM_KEY); }

  function debounce(fn, wait){
    let t;
    return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
  }
  const scheduleSaveDraft = debounce(()=>{
    const fields = collectFieldsSnapshot();
    writeFormDraft(fields);
  }, 300);

  function collectFieldsSnapshot(){
    const ids = [
      "plan","color","style","paper","premium_color",
      "name","unit","title","slogan","services","experience",
      "wechat_id","line_url","line_oa","email","phone","address",
      "video1","video2","video3","social1","social2","social3",
      "cta_text","cta_link"
    ];
    const out = {};
    ids.forEach(id => out[id] = getValue(id));
    return out;
  }

  async function restoreFormDraftIfAny(){
    const d = readFormDraft();
    if(!d || !d.fields) return false;

    // restore plan first
    const plan = (d.fields.plan||"").trim();
    if (plan === "free" || plan === "premium") {
      setChipOn("plan", plan);
      applyPlanUI(plan);
    }

    Object.keys(d.fields).forEach((k)=>{
      if (!byId(k)) return;
      setValue(k, d.fields[k] ?? "");
    });

    // restore chip/swatches state
    const style = (d.fields.style||"").trim(); if(style) setChipOn("style", style);
    const paper = (d.fields.paper||"").trim(); if(paper) setChipOn("paper", paper);
    const color = (d.fields.color||"").trim(); if(color) setSwatchOn("color", color);
    const pc = (d.fields.premium_color||"").trim(); if(pc) setSwatchOn("premium_color", pc);

    toast("已恢復草稿（文字/選項）✅");
    return true;
  }

  /* -----------------------------
   * Draft card id/token (anti reserve spam)
   * ----------------------------- */
  function readCardDraft(){
    try{
      const raw = localStorage.getItem(CONFIG.DRAFT_CARD_KEY);
      if(!raw) return null;
      const d = JSON.parse(raw);
      if(!d || !d.id || !d.token) return null;
      if(d.tenant && d.tenant !== tenant) return null;
      if (nowMs() - (d.ts||0) > CONFIG.DRAFT_TTL_MS) { localStorage.removeItem(CONFIG.DRAFT_CARD_KEY); return null; }
      return d;
    }catch{ return null; }
  }
  function writeCardDraft(id, token){
    try{ localStorage.setItem(CONFIG.DRAFT_CARD_KEY, JSON.stringify({tenant, id, token, ts: nowMs()})); }catch{}
  }
  function clearCardDraft(){ localStorage.removeItem(CONFIG.DRAFT_CARD_KEY); }

  /* -----------------------------
   * IndexedDB for image draft
   * ----------------------------- */
  function idbOpen(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(CONFIG.IDB.DB_NAME, CONFIG.IDB.DB_VER);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(CONFIG.IDB.STORE)){
          db.createObjectStore(CONFIG.IDB.STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error || new Error("idb open error"));
    });
  }
  async function idbPutFile(slot, blob, meta){
    const db = await idbOpen();
    const key = `${tenant}:${slot}`;
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(CONFIG.IDB.STORE, "readwrite");
      tx.objectStore(CONFIG.IDB.STORE).put({ key, tenant, slot, ts: nowMs(), meta: meta||{}, blob });
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>reject(tx.error || new Error("idb put error"));
    });
  }
  async function idbGetFile(slot){
    const db = await idbOpen();
    const key = `${tenant}:${slot}`;
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(CONFIG.IDB.STORE, "readonly");
      const req = tx.objectStore(CONFIG.IDB.STORE).get(key);
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>reject(req.error || new Error("idb get error"));
    });
  }
  async function idbDelFile(slot){
    const db = await idbOpen();
    const key = `${tenant}:${slot}`;
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(CONFIG.IDB.STORE, "readwrite");
      tx.objectStore(CONFIG.IDB.STORE).delete(key);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>reject(tx.error || new Error("idb del error"));
    });
  }
  async function idbClearAllDraftFiles(){
    const db = await idbOpen();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(CONFIG.IDB.STORE, "readwrite");
      const store = tx.objectStore(CONFIG.IDB.STORE);
      const req = store.openCursor();
      req.onsuccess = (e)=>{
        const cur = e.target.result;
        if(cur){
          const v = cur.value;
          if(v && v.tenant === tenant) cur.delete();
          cur.continue();
        }
      };
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>reject(tx.error || new Error("idb clear error"));
    });
  }

  function ensureSavedHintAfter(inputId) {
    const input = byId(inputId);
    if (!input) return null;
    const key = `savedHint_${inputId}`;
    let el = byId(key);
    if (el) return el;

    el = document.createElement("div");
    el.id = key;
    el.style.cssText = "margin-top:6px;color:rgba(255,255,255,.70);font-size:12px;line-height:1.6;";
    input.insertAdjacentElement("afterend", el);
    return el;
  }

  async function refreshSavedHints(){
    const slots = ["avatar","logo","photo1","photo2","photo3","photo4","photo5"];
    const map = {
      avatar:"avatarFile", logo:"logoFile",
      photo1:"photo1File", photo2:"photo2File",
      photo3:"photo3File", photo4:"photo4File", photo5:"photo5File"
    };
    for(const slot of slots){
      const hint = ensureSavedHintAfter(map[slot]);
      if(!hint) continue;
      try{
        const rec = await idbGetFile(slot);
        if(rec && rec.blob){
          const kb = Math.round(rec.blob.size/1024);
          const name = (rec.meta && rec.meta.name) ? rec.meta.name : `${slot}.jpg`;
          hint.textContent = `（草稿已保存）${name} · ${kb}KB`;
        } else hint.textContent = "";
      }catch{ hint.textContent = ""; }
    }
  }

  /* -----------------------------
   * Compression
   * ----------------------------- */
  async function fileToImageBitmap(file){
    if("createImageBitmap" in window){
      try{ return await createImageBitmap(file); }catch{}
    }
    const dataUrl = await new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=>res(fr.result);
      fr.onerror = ()=>rej(new Error("FileReader error"));
      fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej)=>{
      const i = new Image();
      i.onload = ()=>res(i);
      i.onerror = ()=>rej(new Error("Image load error"));
      i.src = dataUrl;
    });
    return img;
  }

  function drawToCanvas(src, maxW, maxH){
    const sw = src.width, sh = src.height;
    const scale = Math.min(1, maxW/sw, maxH/sh);
    const w = Math.max(1, Math.round(sw*scale));
    const h = Math.max(1, Math.round(sh*scale));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { alpha:false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, w, h);
    return c;
  }

  async function canvasToBlob(canvas, type, quality){
    return await new Promise((res)=>canvas.toBlob((b)=>res(b), type, quality));
  }

  async function compressImage(file, policy){
    if(!file || !/^image\//i.test(file.type||"")) return { blob:file, outType:file?.type||"" };
    const bmp = await fileToImageBitmap(file);
    const canvas = drawToCanvas(bmp, policy.maxW, policy.maxH);
    const outType = "image/jpeg";
    let q = policy.qualityStart;
    let blob = await canvasToBlob(canvas, outType, q);
    if(!blob) return { blob:file, outType:file.type||"" };

    const target = policy.targetKB * 1024;
    while(blob.size > target && q > policy.qualityMin){
      q = Math.max(policy.qualityMin, q - 0.06);
      const b2 = await canvasToBlob(canvas, outType, q);
      if(!b2) break;
      blob = b2;
    }
    return { blob, outType };
  }

  async function saveImageDraft(slot, file, kind){
    if(!file){
      await idbDelFile(slot).catch(()=>{});
      await refreshSavedHints();
      return;
    }
    const policy = CONFIG.COMPRESS[kind] || CONFIG.COMPRESS.photo;
    const r = await compressImage(file, policy);
    await idbPutFile(slot, r.blob, { name:file.name, type:r.outType||file.type||"image/jpeg" });
    await refreshSavedHints();
  }

  /* -----------------------------
   * Validation
   * ----------------------------- */
  function setErr(key, msg){
    const el = byId(`err_${key}`);
    if(el) el.textContent = msg || "";
  }
  function setInvalid(id, on){
    const el = byId(id);
    if(!el) return;
    el.classList.toggle("isInvalid", !!on);
  }

  async function hasAvatarAvailable(){
    if(pickFile("avatarFile")) return true;
    const rec = await idbGetFile("avatar");
    return !!(rec && rec.blob);
  }

  async function validateStateAsync(){
    const plan = getValue("plan");
    const errors = {};

    if(!plan) errors.plan = "請先選擇方案";

    if(plan === "premium"){
      if(!getValue("premium_color")) errors.premium_color = "請選擇精品底色";
    } else if(plan === "free"){
      if(!getValue("color")) errors.color = "請選擇顏色";
      if(!getValue("style")) errors.style = "請選擇版型";
      if(!getValue("paper")) errors.paper = "請選擇紙感";
    }

    if(!getValue("name")) errors.name = "請填寫姓名";
    if(!getValue("unit")) errors.unit = "請填寫單位";
    if(!getValue("title")) errors.title = "請填寫頭銜";

    const okAvatar = await hasAvatarAvailable();
    if(!okAvatar) errors.avatar = "請上傳個人照（必填）";

    const ctaText = getValue("cta_text");
    const ctaLink = getValue("cta_link");
    if(plan === "premium"){
      if((ctaText && !ctaLink) || (!ctaText && ctaLink)) errors.cta_pair = "CTA 需要文字＋連結同時填（或都留空）";
    }

    return { ok: Object.keys(errors).length === 0, errors };
  }

  async function validateLive(){
    const st = await validateStateAsync();

    ["plan","color","style","paper","premium_color","name","unit","title","avatar","cta_pair"].forEach(k=>setErr(k,""));
    ["name","unit","title"].forEach(id=>setInvalid(id,false));

    Object.entries(st.errors).forEach(([k,msg])=>setErr(k,msg));
    setInvalid("name", !!st.errors.name);
    setInvalid("unit", !!st.errors.unit);
    setInvalid("title", !!st.errors.title);

    const submitBtn = byId("submitBtn");
    if(submitBtn) submitBtn.disabled = !st.ok || inFlight;

    if(!inFlight){
      setPill(st.ok ? "可送出 ✅" : `尚缺 ${Object.keys(st.errors).length} 項`);
    }
    return st.ok;
  }

  /* -----------------------------
   * Network: GET-first + POST fallback
   * ----------------------------- */
  function withTimeout(promise, ms){
    let to;
    const t = new Promise((_,rej)=>{ to=setTimeout(()=>rej(new Error(`timeout ${ms}ms`)), ms); });
    return Promise.race([promise.finally(()=>clearTimeout(to)), t]);
  }

  async function fetchJson(url, opts){
    const r = await withTimeout(fetch(url, opts), CONFIG.FETCH_TIMEOUT_MS);
    const txt = await r.text();
    let js;
    try{ js = JSON.parse(txt); }catch{ throw new Error(`Non-JSON response: ${txt.slice(0,220)}`); }
    return js;
  }

  function toQuery(params){
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{
      if(v === undefined || v === null) return;
      const s = String(v);
      if(s === "") return;
      usp.set(k, s);
    });
    return usp.toString();
  }

  async function callGAS_GET(action, params){
    const url = `${CONFIG.GAS}?${toQuery({action, ...params})}`;
    return await fetchJson(url, { method:"GET", credentials:"omit" });
  }
  async function callGAS_POST_URLENC(action, params){
    const body = toQuery({action, ...params});
    return await fetchJson(CONFIG.GAS, {
      method:"POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
      body,
      credentials:"omit"
    });
  }
  async function callGAS(action, params){
    let lastErr;
    for(let i=0;i<=CONFIG.RETRY;i++){
      try{ return await callGAS_GET(action, params); }catch(e){ lastErr=e; }
      try{ return await callGAS_POST_URLENC(action, params); }catch(e2){ lastErr=e2; }
    }
    throw lastErr || new Error("callGAS failed");
  }

  async function pingCheck(){
    try{
      const js = await callGAS_GET("ping", {});
      return js && js.ok === true;
    }catch{
      return false;
    }
  }

  async function schemaCheck(){
    const js = await callGAS("schemaCheck", {});
    if(!js || js.ok !== true) throw new Error(js?.error || `schemaCheck failed: ${safeJson(js)}`);
    return true;
  }

  /* -----------------------------
   * Firebase upload
   * ----------------------------- */
  function hasFirebaseCompat(){
    return !!(window.firebase && typeof window.firebase.storage === "function");
  }

  async function uploadToFirebaseCompat(cardId, blobOrFile, fileName, contentType){
    if(!hasFirebaseCompat()) throw new Error("Firebase SDK not found (firebase.storage)");
    const storage = window.firebase.storage();
    const path = `hsc_cards/${tenant}/${cardId}/${fileName}`;
    dbg(`firebase upload -> ${path}`);
    const ref = storage.ref().child(path);
    const meta = { contentType: contentType || blobOrFile.type || "image/jpeg" };
    const snap = await ref.put(blobOrFile, meta);
    const url = await snap.ref.getDownloadURL();
    dbg(`firebase url -> ${url}`);
    return url;
  }

  async function getImageSource(slot, inputId, kind){
    const f = pickFile(inputId);
    if(f){
      const policy = CONFIG.COMPRESS[kind] || CONFIG.COMPRESS.photo;
      const r = await compressImage(f, policy);
      return { blob:r.blob, contentType:"image/jpeg" };
    }
    const rec = await idbGetFile(slot);
    if(rec && rec.blob) return { blob:rec.blob, contentType:"image/jpeg" };
    return null;
  }

  async function uploadImages(cardId, plan){
    const out = {};

    const avatar = await getImageSource("avatar","avatarFile","avatar");
    if(avatar) out.avatar_img = await uploadToFirebaseCompat(cardId, avatar.blob, "avatar.jpg", avatar.contentType);

    const logo = await getImageSource("logo","logoFile","logo");
    if(logo) out.logo_img = await uploadToFirebaseCompat(cardId, logo.blob, "logo.jpg", logo.contentType);

    const maxPhotos = plan === "premium" ? 5 : 2;
    for(let i=1;i<=maxPhotos;i++){
      const src = await getImageSource(`photo${i}`, `photo${i}File`, "photo");
      if(src) out[`photo${i}_img`] = await uploadToFirebaseCompat(cardId, src.blob, `photo${i}.jpg`, src.contentType);
    }
    return out;
  }

  /* -----------------------------
   * Reserve / Create
   * ----------------------------- */
  async function reserveOnce(){
    const d = readCardDraft();
    if(d){
      currentCardId = d.id;
      currentToken = d.token;
      setText("cardIdText", currentCardId);
      dbg("reuse draft card", d);
      return { ok:true, id:currentCardId, token:currentToken, reused:true };
    }

    const plan = getValue("plan") || "free";
    const js = await callGAS("reserve", { tenant, plan });
    if(!js || js.ok !== true) throw new Error(js?.error || `reserve failed: ${safeJson(js)}`);
    if(!js.id || !js.token) throw new Error(`reserve missing id/token: ${safeJson(js)}`);

    currentCardId = js.id;
    currentToken = js.token;
    setText("cardIdText", currentCardId);
    writeCardDraft(currentCardId, currentToken);
    return js;
  }

  function collectTextPayload(){
    const p = {
      tenant,
      plan: getValue("plan"),
      color: getValue("color"),
      style: getValue("style"),
      paper: getValue("paper"),
      premium_color: getValue("premium_color"),

      name: getValue("name"),
      unit: getValue("unit"),
      title: getValue("title"),
      slogan: getValue("slogan"),
      services: getValue("services"),
      experience: getValue("experience"),

      wechat_id: getValue("wechat_id"),
      line_url: getValue("line_url"),
      line_oa: getValue("line_oa"),
      email: getValue("email"),
      phone: getValue("phone"),
      address: getValue("address"),

      video1: getValue("video1"),
      video2: getValue("video2"),
      video3: getValue("video3"),

      social1: getValue("social1"),
      social2: getValue("social2"),
      social3: getValue("social3"),

      cta_text: getValue("cta_text"),
      cta_link: getValue("cta_link")
    };

    Object.keys(p).forEach(k => { if(p[k] === "") delete p[k]; });

    // CTA pair rule
    if(p.plan !== "premium"){
      delete p.cta_text; delete p.cta_link;
    } else {
      const hasText = !!p.cta_text;
      const hasLink = !!p.cta_link;
      if(hasText !== hasLink){
        delete p.cta_text; delete p.cta_link;
      }
    }

    return p;
  }

  async function create(textPayload, imageMap){
    const params = {
      tenant,
      id: currentCardId,
      token: currentToken,
      overwrite: "0",
      ...textPayload,
      ...imageMap
    };

    if(exp && sig){ params.exp = exp; params.sig = sig; }

    // reject base64
    Object.entries(params).forEach(([k,v])=>{
      if(typeof v === "string" && v.startsWith("data:image/")) throw new Error(`Client reject base64 field: ${k}`);
    });

    const js = await callGAS("create", params);
    if(!js || js.ok !== true) throw new Error(js?.error || `create failed: ${safeJson(js)}`);

    console.log("[HSC create] writtenFields:", js.writtenFields || []);
    console.log("[HSC create] skippedFields:", js.skippedFields || []);
    dbg("writtenFields:", js.writtenFields || []);
    dbg("skippedFields:", js.skippedFields || []);

    return js;
  }

  /* -----------------------------
   * Submit
   * ----------------------------- */
  function setSubmitting(on){
    inFlight = !!on;
    const next = byId("nextBtn");
    const prev = byId("prevBtn");
    const submit = byId("submitBtn");
    if(next) next.disabled = inFlight;
    if(prev) prev.disabled = inFlight || (step===1);
    if(submit) submit.disabled = inFlight;
    setPill(inFlight ? "送出中…" : "準備填寫");
  }

  async function onSubmit(ev){
    ev.preventDefault();

    const ok = await validateLive();
    if(!ok){
      toast("請先完成必填");
      ensureDebugPanel().style.display = "block";
      dbg("blocked submit by validation");
      return;
    }
    if(inFlight){
      toast("送出中…已鎖定防連點");
      return;
    }

    setSubmitting(true);
    try{
      // ping-first
      setPill("連線檢查中…");
      const okPing = await pingCheck();
      if(!okPing){
        toast("系統暫時無法連線，請稍後再送出");
        ensureDebugPanel().style.display = "block";
        dbg("ping fail - stop submit (no reserve)");
        return;
      }

      // schema check
      setPill("檢查資料表中…");
      await schemaCheck();

      // reserve once
      setPill("建立草稿卡中…");
      await reserveOnce();

      // firebase check
      if(!hasFirebaseCompat()){
        throw new Error("Firebase Storage SDK 未載入：請確認 firebase-app-compat / firebase-storage-compat + initializeApp");
      }

      // upload images
      const plan = getValue("plan") || "free";
      setPill("圖片上傳中…");
      const imageMap = await uploadImages(currentCardId, plan);

      // create
      setPill("寫入資料中…");
      const textPayload = collectTextPayload();
      const cr = await create(textPayload, imageMap);

      toast("送出成功 ✅");
      setPill("送出成功 ✅");
      ensureDebugPanel().style.display = "block";
      dbg("create ok", cr);

      // clear drafts
      clearCardDraft();
      clearFormDraft();
      await idbClearAllDraftFiles().catch(()=>{});
      await refreshSavedHints();

      // go to final step
      showStep(8);
    }catch(e){
      toast(`送出失敗 ❌ ${e.message}`);
      setPill("送出失敗 ❌");
      ensureDebugPanel().style.display = "block";
      dbg(`submit fail: ${e.message}`);
      dbg("tip: 失敗可再按送出（會沿用草稿卡，不再 reserve 新卡）");
    }finally{
      setSubmitting(false);
      await validateLive();
    }
  }

  /* -----------------------------
   * Bind events
   * ----------------------------- */
  function bindPlanThemeUI(){
    // chips
    document.querySelectorAll("[data-chip-group]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const group = btn.getAttribute("data-chip-group");
        const value = btn.getAttribute("data-value");

        if(group === "plan"){
          setChipOn("plan", value);
          applyPlanUI(value);
          showStep(2);
        } else {
          setChipOn(group, value);
          updatePreview();
          updateSummary();
          validateLive();
          scheduleSaveDraft();
        }
      });
    });

    // swatches
    document.querySelectorAll("[data-swatch-group] .swatch").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const parent = btn.closest("[data-swatch-group]");
        const group = parent?.getAttribute("data-swatch-group");
        const value = btn.getAttribute("data-value");
        if(!group) return;

        setSwatchOn(group, value);
        updatePreview();
        updateSummary();
        validateLive();
        scheduleSaveDraft();
      });
    });
  }

  function bindTextAutosave(){
    const ids = [
      "name","unit","title","slogan","services","experience",
      "wechat_id","line_url","line_oa","email","phone","address",
      "video1","video2","video3","social1","social2","social3",
      "cta_text","cta_link"
    ];
    ids.forEach(id=>{
      const el = byId(id);
      if(!el) return;
      el.addEventListener("input", ()=>{ updatePreview(); updateSummary(); validateLive(); scheduleSaveDraft(); });
      el.addEventListener("blur",  ()=>{ updatePreview(); updateSummary(); validateLive(); scheduleSaveDraft(); });
    });
  }

  function bindFileDraftSave(){
    const bindOne = (slot, inputId, kind)=>{
      const el = byId(inputId);
      if(!el) return;
      el.addEventListener("change", async ()=>{
        const f = pickFile(inputId);
        if(!f){
          await idbDelFile(slot).catch(()=>{});
          await refreshSavedHints();
          await validateLive();
          return;
        }
        toast(`保存草稿圖片：${slot}…`);
        try{
          await saveImageDraft(slot, f, kind);
          toast(`已保存：${slot} ✅`);
          await validateLive();
        }catch(e){
          dbg(`saveImageDraft fail ${slot}: ${e.message}`);
          toast(`保存失敗：${slot} ❌`);
        }
      });
    };

    bindOne("avatar","avatarFile","avatar");
    bindOne("logo","logoFile","logo");
    bindOne("photo1","photo1File","photo");
    bindOne("photo2","photo2File","photo");
    bindOne("photo3","photo3File","photo");
    bindOne("photo4","photo4File","photo");
    bindOne("photo5","photo5File","photo");
  }

  function bindNav(){
    byId("prevBtn")?.addEventListener("click", ()=>goPrev());
    byId("nextBtn")?.addEventListener("click", ()=>goNext());
  }

  function bindDebug(){
    byId("openDebug")?.addEventListener("click", ()=>{
      const box = ensureDebugPanel();
      box.style.display = (box.style.display === "none") ? "block" : "none";
    });

    byId("resetDraftBtn")?.addEventListener("click", async ()=>{
      clearCardDraft();
      clearFormDraft();
      await idbClearAllDraftFiles().catch(()=>{});
      setText("cardIdText","-");
      toast("已清除草稿（文字+圖片+草稿卡）");
      await refreshSavedHints();
      await validateLive();
    });
  }

  /* -----------------------------
   * Boot
   * ----------------------------- */
  async function boot(){
    setText("versionText", "512");
    setText("tenantText", tenant);

    // default
    setChipOn("plan", "free");
    applyPlanUI("free");

    // restore
    await restoreFormDraftIfAny();
    await refreshSavedHints();

    const cd = readCardDraft();
    if(cd){ setText("cardIdText", cd.id); currentCardId = cd.id; currentToken = cd.token; }

    // bindings
    bindPlanThemeUI();
    bindTextAutosave();
    bindFileDraftSave();
    bindNav();
    bindDebug();

    // submit
    const form = byId("hscForm");
    form?.addEventListener("submit", onSubmit);

    // start at step 1
    showStep(1);

    dbg("boot ok", {
      VERSION,
      tenant,
      hasFirebaseCompat: hasFirebaseCompat(),
      hasExpSig: !!(exp && sig),
      gas: CONFIG.GAS
    });

    // Keep preview synced
    updatePreview();
    updateSummary();
    await validateLive();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else boot();

})();