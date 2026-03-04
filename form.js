/* =============================================
 * form.js — v511.2 (COMPLETE OVERWRITE)
 * - Real-time validation (required fields)
 * - Front-end image compression (Canvas) before Firebase upload
 * - Split UI by plan (free/premium)
 * - Draft cache prevents reserve spam
 * - GET-first + POST fallback (avoid CORS preflight)
 * ============================================= */

(() => {
  "use strict";

  const VERSION = "v511.2";

  const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_TENANT: "angel",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 1,

    FIREBASE_ENABLED: true,

    DRAFT_KEY: "hsc_draft_card_v1",
    DRAFT_TTL_MS: 2 * 60 * 60 * 1000, // 2h

    // Compression policy (tuned for speed + quality)
    COMPRESS: {
      avatar: { maxW: 1200, maxH: 1200, targetKB: 280, qualityStart: 0.86, qualityMin: 0.55 },
      logo:   { maxW: 1200, maxH: 1200, targetKB: 220, qualityStart: 0.86, qualityMin: 0.55 },
      photo:  { maxW: 1600, maxH: 1600, targetKB: 420, qualityStart: 0.84, qualityMin: 0.50 },
    }
  };

  /* -----------------------------
   * DOM helpers
   * ----------------------------- */
  const byId = (id) => document.getElementById(id);

  function setText(id, v) {
    const el = byId(id);
    if (el) el.textContent = String(v ?? "");
  }

  function getValue(id) {
    const el = byId(id);
    if (!el) return "";
    return String(el.value || "").trim();
  }
  function setValue(id, v) {
    const el = byId(id);
    if (el) el.value = String(v ?? "");
  }

  function pickFile(id) {
    const el = byId(id);
    if (!el || !el.files || !el.files[0]) return null;
    return el.files[0];
  }

  function setPill(msg) {
    const m = byId("pillMsg");
    if (m) m.textContent = msg;
  }

  function safeJson(x){ try{return JSON.stringify(x);}catch{return String(x);} }

  /* -----------------------------
   * Tiny toast
   * ----------------------------- */
  function toast(msg) {
    let t = byId("hscToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hscToast";
      t.style.cssText = [
        "position:fixed","left:16px","right:16px","top:14px","z-index:99998",
        "padding:12px 14px","border-radius:999px","background:rgba(255,255,255,.88)",
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

  /* -----------------------------
   * Debug panel (same behavior)
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
      catch { toast("複製失敗（瀏覽器限制），請長按選取。"); }
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

  /* -----------------------------
   * URL params (optional exp+sig)
   * ----------------------------- */
  const URLP = new URLSearchParams(location.search);
  const exp = URLP.get("exp") || "";
  const sig = URLP.get("sig") || "";
  const tenantFromUrl = URLP.get("tenant") || "";
  const tenant = (tenantFromUrl || CONFIG.DEFAULT_TENANT).trim() || CONFIG.DEFAULT_TENANT;

  /* -----------------------------
   * Draft cache
   * ----------------------------- */
  const nowMs = () => Date.now();

  function readDraft() {
    try {
      const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || !d.id || !d.token) return null;
      if (d.tenant && d.tenant !== tenant) return null;
      const age = nowMs() - (d.ts || 0);
      if (age > CONFIG.DRAFT_TTL_MS) { localStorage.removeItem(CONFIG.DRAFT_KEY); return null; }
      return d;
    } catch { return null; }
  }
  function writeDraft(id, token) {
    const d = { id, token, tenant, ts: nowMs() };
    localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(d));
    dbg("draft saved", d);
  }
  function clearDraft() {
    localStorage.removeItem(CONFIG.DRAFT_KEY);
    dbg("draft cleared");
  }

  /* -----------------------------
   * Fetch helpers (GET-first + POST fallback)
   * ----------------------------- */
  function withTimeout(promise, ms) {
    let to;
    const timeout = new Promise((_, rej) => { to = setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms); });
    return Promise.race([promise.finally(() => clearTimeout(to)), timeout]);
  }

  async function fetchJson(url, opts) {
    const r = await withTimeout(fetch(url, opts), CONFIG.FETCH_TIMEOUT_MS);
    const txt = await r.text();
    let js;
    try { js = JSON.parse(txt); }
    catch { throw new Error(`Non-JSON response: ${txt.slice(0, 220)}`); }
    return js;
  }

  function toQuery(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === "") return;
      usp.set(k, s);
    });
    return usp.toString();
  }

  async function callGAS_GET(action, params) {
    const qs = toQuery({ action, ...params });
    const url = `${CONFIG.GAS}?${qs}`;
    dbg(`GET ${action}`);
    return await fetchJson(url, { method: "GET", credentials: "omit" });
  }

  async function callGAS_POST_URLENC(action, params) {
    const body = toQuery({ action, ...params });
    dbg(`POST(urlenc) ${action}`);
    return await fetchJson(CONFIG.GAS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      credentials: "omit"
    });
  }

  async function callGAS(action, params) {
    let lastErr;
    for (let i = 0; i <= CONFIG.RETRY; i++) {
      try { return await callGAS_GET(action, params); }
      catch (e) { lastErr = e; dbg(`GET ${action} fail: ${e.message}`); }
      try { return await callGAS_POST_URLENC(action, params); }
      catch (e2) { lastErr = e2; dbg(`POST ${action} fail: ${e2.message}`); }
    }
    throw lastErr || new Error("callGAS failed");
  }

  /* -----------------------------
   * Firebase upload (compat SDK)
   * ----------------------------- */
  function hasFirebaseCompat() {
    return !!(window.firebase && typeof window.firebase.storage === "function");
  }

  async function uploadToFirebaseCompat(cardId, blobOrFile, fileName, contentType) {
    if (!CONFIG.FIREBASE_ENABLED) throw new Error("Firebase disabled");
    if (!hasFirebaseCompat()) throw new Error("Firebase SDK not found (window.firebase.storage)");
    const storage = window.firebase.storage();
    const path = `hsc_cards/${tenant}/${cardId}/${fileName}`; // REQUIRED
    dbg(`firebase upload -> ${path}`);

    const ref = storage.ref().child(path);
    const meta = { contentType: contentType || (blobOrFile && blobOrFile.type) || "image/jpeg" };
    const snap = await ref.put(blobOrFile, meta);
    const url = await snap.ref.getDownloadURL();
    dbg(`firebase url -> ${url}`);
    return url;
  }

  /* -----------------------------
   * UI: chips + swatches
   * ----------------------------- */
  function setChipOn(group, value) {
    document.querySelectorAll(`[data-chip-group="${group}"]`).forEach((btn) => {
      const on = btn.getAttribute("data-value") === value;
      btn.dataset.on = on ? "1" : "0";
    });
    setValue(group, value);
  }

  function setSwatchOn(group, value) {
    document.querySelectorAll(`[data-swatch-group="${group}"] .swatch`).forEach((btn) => {
      const on = btn.getAttribute("data-value") === value;
      btn.dataset.on = on ? "1" : "0";
    });
    setValue(group, value);
  }

  function applyPlanUI(plan) {
    const freeThemeCard = byId("freeThemeCard");
    const premiumThemeCard = byId("premiumThemeCard");
    const premiumCtaCard = byId("premiumCtaCard");
    const premiumPhotoRow = byId("premiumPhotoRow");
    const p3 = byId("photo3File");
    const p4 = byId("photo4File");
    const p5 = byId("photo5File");

    if (plan === "premium") {
      freeThemeCard?.classList.add("hide");
      premiumThemeCard?.classList.remove("hide");
      premiumCtaCard?.classList.remove("hide");
      premiumPhotoRow?.classList.remove("hide");
      if (p3) p3.disabled = false;
      if (p4) p4.disabled = false;
      if (p5) p5.disabled = false;

      // clear free fields
      setValue("color", "");
      setValue("style", "");
      setValue("paper", "");
      document.querySelectorAll(`[data-chip-group="style"],[data-chip-group="paper"]`).forEach(b => b.dataset.on="0");
      document.querySelectorAll(`[data-swatch-group="color"] .swatch`).forEach(b => b.dataset.on="0");
    } else {
      freeThemeCard?.classList.remove("hide");
      premiumThemeCard?.classList.add("hide");
      premiumCtaCard?.classList.add("hide");

      premiumPhotoRow?.classList.add("hide");
      if (p3) { p3.value=""; p3.disabled = true; }
      if (p4) { p4.value=""; p4.disabled = true; }
      if (p5) { p5.value=""; p5.disabled = true; }

      // clear premium fields
      setValue("premium_color", "");
      setValue("cta_text", "");
      setValue("cta_link", "");
      document.querySelectorAll(`[data-swatch-group="premium_color"] .swatch`).forEach(b => b.dataset.on="0");
    }

    // Re-validate when plan changes
    validateLive();
  }

  /* -----------------------------
   * Live validation UI
   * ----------------------------- */
  function setErr(key, msg) {
    const el = byId(`err_${key}`);
    if (el) el.textContent = msg || "";
  }
  function setInvalidInput(id, on) {
    const el = byId(id);
    if (!el) return;
    if (on) el.classList.add("isInvalid");
    else el.classList.remove("isInvalid");
  }

  function validateState() {
    const plan = getValue("plan");
    const errors = {};

    if (!plan) errors.plan = "請先選擇方案";

    if (plan === "premium") {
      if (!getValue("premium_color")) errors.premium_color = "請選擇精品底色";
    } else if (plan === "free") {
      if (!getValue("color")) errors.color = "請選擇顏色";
      if (!getValue("style")) errors.style = "請選擇版型";
      if (!getValue("paper")) errors.paper = "請選擇紙感";
    } else {
      // plan not chosen yet: don’t spam theme errors
    }

    if (!getValue("name")) errors.name = "請填寫姓名";
    if (!getValue("unit")) errors.unit = "請填寫單位";
    if (!getValue("title")) errors.title = "請填寫頭銜";

    const avatar = pickFile("avatarFile");
    if (!avatar) errors.avatar = "請上傳個人照（必填）";

    const ctaText = getValue("cta_text");
    const ctaLink = getValue("cta_link");
    if ((ctaText && !ctaLink) || (!ctaText && ctaLink)) errors.cta_pair = "CTA 需要「文字 + 連結」同時填寫（或兩個都留空）";

    return { ok: Object.keys(errors).length === 0, errors };
  }

  function validateLive() {
    const st = validateState();

    // clear all
    ["plan","color","style","paper","premium_color","name","unit","title","avatar","cta_pair"].forEach(k => setErr(k, ""));
    ["name","unit","title"].forEach(id => setInvalidInput(id, false));

    // apply errors
    Object.entries(st.errors).forEach(([k, msg]) => setErr(k, msg));

    // input highlights
    setInvalidInput("name", !!st.errors.name);
    setInvalidInput("unit", !!st.errors.unit);
    setInvalidInput("title", !!st.errors.title);

    // CTA pair error field
    setErr("cta_pair", st.errors.cta_pair || "");

    // submit enabled
    const submitBtn = byId("submitBtn");
    if (submitBtn) submitBtn.disabled = !st.ok || inFlight;

    // pill message
    if (!inFlight) {
      if (st.ok) setPill("可送出 ✅");
      else {
        const keys = Object.keys(st.errors);
        setPill(keys.length ? `尚缺 ${keys.length} 項` : "準備填寫");
      }
    }

    return st.ok;
  }

  /* -----------------------------
   * Front-end compression (Canvas)
   * - No EXIF rotate handling to keep lightweight
   * - Works well for most modern phone images
   * ----------------------------- */
  function fmtKB(bytes){ return `${Math.round(bytes/1024)}KB`; }

  async function fileToImageBitmap(file) {
    // Prefer createImageBitmap (fast)
    if ("createImageBitmap" in window) {
      try { return await createImageBitmap(file); } catch {}
    }
    // Fallback: Image element
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(new Error("FileReader error"));
      fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Image load error"));
      i.src = dataUrl;
    });
    return img;
  }

  function drawToCanvas(source, maxW, maxH) {
    const sw = source.width;
    const sh = source.height;
    const scale = Math.min(1, maxW / sw, maxH / sh);
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, w, h);
    return canvas;
  }

  async function canvasToBlob(canvas, type, quality) {
    return await new Promise((res) => {
      canvas.toBlob((b) => res(b), type, quality);
    });
  }

  async function compressImage(file, policy, label) {
    // Skip if not image
    if (!file || !/^image\//i.test(file.type || "")) return { blob: file, report: `${label}: 非圖片，略過` };

    const before = file.size;
    const bmp = await fileToImageBitmap(file);

    const canvas = drawToCanvas(bmp, policy.maxW, policy.maxH);

    // Force JPEG for stable size; PNG often huge
    const outType = "image/jpeg";

    let q = policy.qualityStart;
    let blob = await canvasToBlob(canvas, outType, q);

    // If toBlob returns null (rare), fallback to original
    if (!blob) return { blob: file, report: `${label}: 壓縮失敗，使用原檔` };

    // Loop to reach target size
    const targetBytes = policy.targetKB * 1024;
    while (blob.size > targetBytes && q > policy.qualityMin) {
      q = Math.max(policy.qualityMin, q - 0.06);
      const b2 = await canvasToBlob(canvas, outType, q);
      if (!b2) break;
      blob = b2;
    }

    const after = blob.size;
    const report = `${label}: ${fmtKB(before)} → ${fmtKB(after)}（q=${q.toFixed(2)}）`;
    return { blob, report, outType };
  }

  async function compressAllForPlan(plan) {
    const lines = [];
    const avatar = pickFile("avatarFile");
    const logo = pickFile("logoFile");

    const out = { blobs: {}, types: {} };

    if (avatar) {
      const r = await compressImage(avatar, CONFIG.COMPRESS.avatar, "個人照");
      out.blobs.avatar = r.blob; out.types.avatar = r.outType || r.blob.type;
      lines.push(r.report);
    }

    if (logo) {
      const r = await compressImage(logo, CONFIG.COMPRESS.logo, "Logo");
      out.blobs.logo = r.blob; out.types.logo = r.outType || r.blob.type;
      lines.push(r.report);
    }

    const maxPhotos = plan === "premium" ? 5 : 2;
    for (let i=1;i<=maxPhotos;i++){
      const f = pickFile(`photo${i}File`);
      if (!f) continue;
      const r = await compressImage(f, CONFIG.COMPRESS.photo, `照片${i}`);
      out.blobs[`photo${i}`] = r.blob; out.types[`photo${i}`] = r.outType || r.blob.type;
      lines.push(r.report);
    }

    const reportEl = byId("compressReport");
    if (reportEl) reportEl.textContent = lines.join("　｜　");

    dbg("compress report", lines);
    return out;
  }

  /* -----------------------------
   * Payload
   * ----------------------------- */
  function collectTextPayload() {
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

    // Remove empty
    Object.keys(p).forEach((k) => { if (p[k] === "") delete p[k]; });

    // CTA pair safety: if not paired, let validation block already; still sanitize
    if ((p.cta_text && !p.cta_link) || (!p.cta_text && p.cta_link)) {
      delete p.cta_text; delete p.cta_link;
    }
    return p;
  }

  async function schemaCheck() {
    const js = await callGAS("schemaCheck", {});
    dbg("schemaCheck resp:", js);
    if (!js || js.ok !== true) throw new Error(`schemaCheck failed: ${safeJson(js)}`);
    return true;
  }

  /* -----------------------------
   * Reserve/Create flow with Draft cache
   * ----------------------------- */
  let currentCardId = "";
  let currentToken = "";

  async function reserveOnce() {
    const draft = readDraft();
    if (draft) {
      currentCardId = draft.id;
      currentToken = draft.token;
      setText("cardIdText", currentCardId);
      dbg("reuse draft", draft);
      return { ok: true, id: currentCardId, token: currentToken, reused: true };
    }

    const plan = getValue("plan") || "free";
    const js = await callGAS("reserve", { tenant, plan });
    dbg("reserve resp:", js);

    if (!js || js.ok !== true) throw new Error(js && js.error ? js.error : `reserve failed: ${safeJson(js)}`);
    if (!js.id || !js.token) throw new Error(`reserve missing id/token: ${safeJson(js)}`);

    currentCardId = js.id;
    currentToken = js.token;

    setText("cardIdText", currentCardId);
    writeDraft(currentCardId, currentToken);

    return js;
  }

  async function uploadImages(cardId, plan, compressed) {
    const out = {};

    if (compressed.blobs.avatar) out.avatar_img = await uploadToFirebaseCompat(cardId, compressed.blobs.avatar, "avatar.jpg", "image/jpeg");
    if (compressed.blobs.logo) out.logo_img = await uploadToFirebaseCompat(cardId, compressed.blobs.logo, "logo.jpg", "image/jpeg");

    const maxPhotos = plan === "premium" ? 5 : 2;
    for (let i=1;i<=maxPhotos;i++){
      const key = `photo${i}`;
      if (!compressed.blobs[key]) continue;
      out[`photo${i}_img`] = await uploadToFirebaseCompat(cardId, compressed.blobs[key], `photo${i}.jpg`, "image/jpeg");
    }

    dbg("uploadImages result:", out);
    return out;
  }

  async function create(textPayload, imageMap) {
    const params = {
      tenant,
      id: currentCardId,
      token: currentToken,
      overwrite: "0",
      ...textPayload,
      ...imageMap
    };
    if (exp && sig) { params.exp = exp; params.sig = sig; }

    // client-side reject base64
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v === "string" && v.startsWith("data:image/")) {
        throw new Error(`Client reject base64 field: ${k}`);
      }
    });

    const js = await callGAS("create", params);
    dbg("create resp:", js);

    if (!js || js.ok !== true) throw new Error(js && js.error ? js.error : `create failed: ${safeJson(js)}`);
    return js;
  }

  /* -----------------------------
   * Submit lock
   * ----------------------------- */
  let inFlight = false;

  function setSubmitting(on) {
    const submitBtn = byId("submitBtn");
    if (submitBtn) submitBtn.disabled = !!on || !validateState().ok;
    setPill(on ? "送出中…" : (validateState().ok ? "可送出 ✅" : "尚未完成必填"));
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    // Live validation gate
    const ok = validateLive();
    if (!ok) {
      toast("請先完成必填項目");
      ensureDebugPanel().style.display = "block";
      dbg("blocked submit by live validation");
      return;
    }

    if (inFlight) {
      toast("送出中…已鎖定防連點");
      dbg("blocked duplicate submit (inFlight=true)");
      return;
    }

    inFlight = true;
    setSubmitting(true);

    try {
      setText("verText", VERSION);
      setText("versionText", VERSION);

      await schemaCheck();
      await reserveOnce();

      if (!hasFirebaseCompat()) {
        throw new Error("找不到 Firebase Storage SDK（請確認 firebase.initializeApp 已載入）");
      }

      const plan = getValue("plan") || "free";

      // compress first
      setPill("壓縮圖片中…");
      const compressed = await compressAllForPlan(plan);

      // upload after compression
      setPill("上傳圖片中…");
      const imageMap = await uploadImages(currentCardId, plan, compressed);

      // create
      setPill("寫入資料中…");
      const textPayload = collectTextPayload();
      const cr = await create(textPayload, imageMap);

      toast("送出成功 ✅");
      setPill("送出成功 ✅");
      ensureDebugPanel().style.display = "block";
      dbg("writtenFields:", cr.writtenFields || []);
      dbg("skippedFields:", cr.skippedFields || []);

      clearDraft();
    } catch (e) {
      toast(`送出失敗 ❌ ${e.message}`);
      setPill("送出失敗 ❌");
      ensureDebugPanel().style.display = "block";
      dbg(`submit fail: ${e.message}`);
      dbg("tip: 失敗可再按一次送出（會沿用草稿卡，不再 reserve 新卡）");
    } finally {
      inFlight = false;
      setSubmitting(false);
      validateLive();
    }
  }

  /* -----------------------------
   * Bind events
   * ----------------------------- */
  function bindLiveValidation() {
    // Inputs
    ["name","unit","title","cta_text","cta_link"].forEach((id) => {
      const el = byId(id);
      if (!el) return;
      el.addEventListener("input", () => validateLive());
      el.addEventListener("blur", () => validateLive());
    });

    // File inputs
    ["avatarFile","logoFile","photo1File","photo2File","photo3File","photo4File","photo5File"].forEach((id) => {
      const el = byId(id);
      if (!el) return;
      el.addEventListener("change", () => {
        validateLive();
        // show quick file size tip (no compression yet)
        const f = pickFile(id);
        if (f) dbg(`file pick ${id}: ${f.name} ${Math.round(f.size/1024)}KB ${f.type}`);
      });
    });
  }

  /* -----------------------------
   * Boot
   * ----------------------------- */
  function bindOnce() {
    setText("verText", VERSION);
    setText("versionText", VERSION);

    // Chips
    document.querySelectorAll("[data-chip-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.getAttribute("data-chip-group");
        const value = btn.getAttribute("data-value");

        if (group === "plan") {
          setChipOn("plan", value);
          applyPlanUI(value);
        } else {
          setChipOn(group, value);
          validateLive();
        }
      });
    });

    // Swatches
    document.querySelectorAll("[data-swatch-group] .swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        const parent = btn.closest("[data-swatch-group]");
        const group = parent?.getAttribute("data-swatch-group");
        const value = btn.getAttribute("data-value");
        if (!group) return;
        setSwatchOn(group, value);
        validateLive();
      });
    });

    // Draft detected
    const d = readDraft();
    if (d) {
      setText("cardIdText", d.id);
      dbg("draft detected on boot", d);
    }

    // Default UI
    applyPlanUI("free");

    // Debug toggle
    const openDebug = byId("openDebug");
    if (openDebug) {
      openDebug.onclick = () => {
        const box = ensureDebugPanel();
        box.style.display = box.style.display === "none" ? "block" : "none";
      };
    }

    // Reset draft
    const resetBtn = byId("resetDraftBtn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        clearDraft();
        setText("cardIdText", "-");
        toast("已清除草稿卡（下次送出會重新 reserve）");
        validateLive();
      };
    }

    // Submit
    const form = byId("hscForm");
    if (!form) {
      ensureDebugPanel().style.display = "block";
      dbg("missing form#hscForm");
      toast("頁面找不到表單，請確認 form.html 有 <form id='hscForm'>");
      return;
    }
    if (form.dataset.hscBound === "1") return;
    form.dataset.hscBound = "1";
    form.addEventListener("submit", onSubmit);

    // Live validation bindings
    bindLiveValidation();

    // Initial validate
    validateLive();

    dbg("boot ok", { VERSION, tenant, gas: CONFIG.GAS, hasFirebaseCompat: hasFirebaseCompat(), hasExpSig: !!(exp && sig) });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindOnce);
  } else {
    bindOnce();
  }
})();