/* =============================================
 * form.js — v510.1 (COMPLETE OVERWRITE)
 * Happiness Smart Card System — Frontend Form
 *
 * Goals:
 * - GET-first reserve/create (avoid CORS preflight) + fallback POST (urlencoded)
 * - No base64 to GAS (text + image URLs only)
 * - Optional hardening: pass exp+sig when present in URL
 * - On-page debug panel (NO need mobile console)
 * - Show VERSION / cardId / step-by-step status
 * ============================================= */

(() => {
  "use strict";

  const VERSION = "v510.1";

  const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_TENANT: "angel",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 1,
    // If you already have Firebase upload in your page, keep using it.
    // This script will try to detect firebase storage SDK (compat) automatically.
    FIREBASE_ENABLED: true
  };

  /* -----------------------------
   * Mini DOM helpers
   * ----------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  function ensureDebugPanel() {
    let box = byId("hscDebugBox");
    if (box) return box;

    box = document.createElement("div");
    box.id = "hscDebugBox";
    box.style.cssText = [
      "position:fixed",
      "left:12px",
      "right:12px",
      "bottom:12px",
      "z-index:99999",
      "padding:12px 12px",
      "border-radius:16px",
      "background:rgba(0,0,0,.72)",
      "color:rgba(255,255,255,.92)",
      "font:12px/1.5 system-ui,-apple-system,'Noto Sans TC',Segoe UI,Roboto,Arial",
      "box-shadow:0 10px 30px rgba(0,0,0,.35)",
      "backdrop-filter: blur(10px)",
      "max-height:42vh",
      "overflow:auto",
      "display:none"
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px;";
    header.innerHTML = `
      <div style="font-weight:800;letter-spacing:.5px">HSC Debug</div>
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
      try {
        await navigator.clipboard.writeText(pre.textContent || "");
        toast("已複製 Debug 內容 ✅");
      } catch (e) {
        toast("複製失敗（瀏覽器限制），請手動長按選取。");
      }
    };

    return box;
  }

  function dbg(line, obj) {
    const box = ensureDebugPanel();
    const pre = byId("hscDbgPre");
    const ts = new Date().toISOString().replace("T", " ").replace("Z", "");
    const s = obj ? `${line} ${safeJson(obj)}` : line;
    pre.textContent += `[${ts}] ${s}\n`;
    // also show box if error keywords
    if (/fail|error|拒絕|無法|timeout|missing|mismatch/i.test(line)) {
      box.style.display = "block";
    }
  }

  function safeJson(x) {
    try { return JSON.stringify(x); } catch { return String(x); }
  }

  function toast(msg) {
    let t = byId("hscToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hscToast";
      t.style.cssText = [
        "position:fixed",
        "left:16px",
        "right:16px",
        "top:14px",
        "z-index:99998",
        "padding:12px 14px",
        "border-radius:999px",
        "background:rgba(255,255,255,.88)",
        "color:rgba(0,0,0,.88)",
        "font:14px/1.4 system-ui,-apple-system,'Noto Sans TC',Segoe UI,Roboto,Arial",
        "box-shadow:0 8px 22px rgba(0,0,0,.18)",
        "text-align:center",
        "opacity:0",
        "transform:translateY(-8px)",
        "transition:opacity .18s ease, transform .18s ease"
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

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function showFailBanner(msg) {
    // Your UI already has a big pill; if exists, write into it.
    const pill = byId("statusPill") || byId("status") || byId("submitStatus");
    if (pill) {
      pill.textContent = msg;
    }
    toast(msg);
    ensureDebugPanel().style.display = "block";
  }

  /* -----------------------------
   * URL params
   * ----------------------------- */
  const URLP = new URLSearchParams(location.search);
  const exp = URLP.get("exp") || "";
  const sig = URLP.get("sig") || "";
  const tenantFromUrl = URLP.get("tenant") || "";
  const tenant = (tenantFromUrl || CONFIG.DEFAULT_TENANT).trim() || CONFIG.DEFAULT_TENANT;

  /* -----------------------------
   * Fetch helpers (GET-first + fallback POST)
   * ----------------------------- */
  function withTimeout(promise, ms) {
    let to;
    const timeout = new Promise((_, rej) => {
      to = setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms);
    });
    return Promise.race([promise.finally(() => clearTimeout(to)), timeout]);
  }

  async function fetchJson(url, opts) {
    const r = await withTimeout(fetch(url, opts), CONFIG.FETCH_TIMEOUT_MS);
    const txt = await r.text();
    let js;
    try { js = JSON.parse(txt); }
    catch {
      throw new Error(`Non-JSON response: ${txt.slice(0, 180)}`);
    }
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
    dbg(`GET ${action} -> ${url}`);
    return await fetchJson(url, { method: "GET", credentials: "omit" });
  }

  async function callGAS_POST_URLENC(action, params) {
    const body = toQuery({ action, ...params });
    dbg(`POST(urlenc) ${action} -> ${CONFIG.GAS}`);
    return await fetchJson(CONFIG.GAS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      credentials: "omit"
    });
  }

  async function callGAS(action, params) {
    // GET-first (avoid CORS preflight), fallback POST urlencoded
    let lastErr;
    for (let i = 0; i <= CONFIG.RETRY; i++) {
      try {
        const js = await callGAS_GET(action, params);
        return js;
      } catch (e) {
        lastErr = e;
        dbg(`GET ${action} fail: ${e.message}`);
      }
      try {
        const js = await callGAS_POST_URLENC(action, params);
        return js;
      } catch (e2) {
        lastErr = e2;
        dbg(`POST ${action} fail: ${e2.message}`);
      }
    }
    throw lastErr || new Error("callGAS failed");
  }

  /* -----------------------------
   * Firebase upload (best-effort)
   * - Detect firebase compat SDK: window.firebase.storage()
   * - Path MUST be: hsc_cards/{tenant}/{cardId}/{fileName}
   * ----------------------------- */
  function hasFirebaseCompat() {
    return !!(window.firebase && typeof window.firebase.storage === "function");
  }

  async function uploadToFirebaseCompat(cardId, file, fileName) {
    if (!CONFIG.FIREBASE_ENABLED) throw new Error("Firebase disabled");
    if (!hasFirebaseCompat()) throw new Error("Firebase SDK not found (window.firebase.storage)");
    const storage = window.firebase.storage();
    const path = `hsc_cards/${tenant}/${cardId}/${fileName}`;
    dbg(`firebase upload -> ${path} (${Math.round(file.size / 1024)}KB)`);

    const ref = storage.ref().child(path);
    const snap = await ref.put(file, { contentType: file.type || "image/jpeg" });
    const url = await snap.ref.getDownloadURL();
    dbg(`firebase url -> ${url}`);
    return url;
  }

  function pickFile(id) {
    const el = byId(id);
    if (!el || !el.files || !el.files[0]) return null;
    return el.files[0];
  }

  /* -----------------------------
   * Form field collection
   * - Only send whitelist-ish fields that your GAS expects.
   * - Images are URL fields: avatar_img, logo_img, photo1_img..photo5_img
   * ----------------------------- */
  function getValue(id) {
    const el = byId(id);
    if (!el) return "";
    return String(el.value || "").trim();
  }

  function collectTextPayload() {
    // Map to your card_db columns (common set)
    const p = {
      tenant,
      name: getValue("name"),
      unit: getValue("unit"),
      title: getValue("title"),
      slogan: getValue("slogan"),
      services: getValue("services"),
      experience: getValue("experience"),
      phone: getValue("phone"),
      email: getValue("email"),
      website: getValue("website"),
      address: getValue("address"),
      line_id: getValue("line_id"),
      line_url: getValue("line_url"),
      line_oa: getValue("line_oa"),
      wechat_id: getValue("wechat_id"),

      // plan / theme selectors if present
      plan: getValue("plan"),
      color: getValue("color"),
      style: getValue("style"),
      paper: getValue("paper")
    };

    // Remove empty
    Object.keys(p).forEach((k) => {
      if (p[k] === "") delete p[k];
    });
    return p;
  }

  /* -----------------------------
   * Main flow: reserve -> upload -> create
   * ----------------------------- */
  let currentCardId = "";
  let currentToken = "";

  async function schemaCheck() {
    const js = await callGAS("schemaCheck", {});
    dbg("schemaCheck resp:", js);
    if (!js || js.ok !== true) throw new Error(`schemaCheck failed: ${safeJson(js)}`);
    return true;
  }

  async function reserve() {
    const plan = getValue("plan") || "free";
    const js = await callGAS("reserve", { tenant, plan });
    dbg("reserve resp:", js);

    if (!js || js.ok !== true) {
      throw new Error(js && js.error ? js.error : `reserve failed: ${safeJson(js)}`);
    }
    if (!js.id || !js.token) throw new Error(`reserve missing id/token: ${safeJson(js)}`);

    currentCardId = js.id;
    currentToken = js.token;

    setText("cardIdText", currentCardId);
    setText("cardId", currentCardId); // in case your UI uses this id
    return js;
  }

  async function uploadImages(cardId) {
    // If you already have URL inputs instead of file inputs, we keep them.
    // File input IDs (best guess): avatarFile, logoFile, photo1File..photo5File
    // If your page uses different ids, this upload will simply skip (no fail).
    const out = {};

    // avatar
    const avatarFile = pickFile("avatarFile");
    if (avatarFile) {
      out.avatar_img = await uploadToFirebaseCompat(cardId, avatarFile, "avatar.jpg");
    } else {
      const avatarUrl = getValue("avatar_img") || getValue("avatarURL");
      if (avatarUrl) out.avatar_img = avatarUrl;
    }

    // logo
    const logoFile = pickFile("logoFile");
    if (logoFile) {
      out.logo_img = await uploadToFirebaseCompat(cardId, logoFile, "logo.jpg");
    } else {
      const logoUrl = getValue("logo_img") || getValue("logoURL");
      if (logoUrl) out.logo_img = logoUrl;
    }

    // photos 1..5
    for (let i = 1; i <= 5; i++) {
      const f = pickFile(`photo${i}File`);
      if (f) {
        out[`photo${i}_img`] = await uploadToFirebaseCompat(cardId, f, `photo${i}.jpg`);
      } else {
        const u = getValue(`photo${i}_img`) || getValue(`photo${i}URL`);
        if (u) out[`photo${i}_img`] = u;
      }
    }

    dbg("uploadImages result:", out);
    return out;
  }

  async function create(payload, imageMap) {
    const params = {
      tenant,
      id: currentCardId,
      token: currentToken,
      overwrite: "0",
      ...payload,
      ...imageMap
    };

    // Optional hardening: include exp+sig if present
    if (exp && sig) {
      params.exp = exp;
      params.sig = sig;
    }

    // Reject base64 by client side too (safety)
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v === "string" && v.startsWith("data:image/")) {
        throw new Error(`Client reject base64 field: ${k}`);
      }
    });

    const js = await callGAS("create", params);
    dbg("create resp:", js);

    if (!js || js.ok !== true) {
      throw new Error(js && js.error ? js.error : `create failed: ${safeJson(js)}`);
    }

    // Show debug info on page if placeholders exist
    if (Array.isArray(js.writtenFields)) {
      dbg("writtenFields:", js.writtenFields);
    }
    if (Array.isArray(js.skippedFields)) {
      dbg("skippedFields:", js.skippedFields);
    }

    return js;
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    try {
      dbg("submit start", { VERSION, tenant, hasExpSig: !!(exp && sig) });
      toast("送出中…");

      setText("verText", VERSION);
      setText("versionText", VERSION);
      setText("ver", VERSION);

      await schemaCheck();

      const rsv = await reserve();
      toast(`reserve ok ${rsv.id}`);

      let imageMap = {};
      try {
        imageMap = await uploadImages(rsv.id);
      } catch (upErr) {
        // Upload is best-effort: if firebase not found, we continue with text only
        dbg(`upload warning: ${upErr.message}`);
      }

      const textPayload = collectTextPayload();
      const cr = await create(textPayload, imageMap);

      toast("送出成功 ✅");
      // If your UI has a big pill
      const pill = byId("statusPill") || byId("status") || byId("submitStatus");
      if (pill) pill.textContent = "送出成功 ✅";

      // Persist last result for support
      window.__HSC_LAST_RESULT__ = { reserve: rsv, create: cr };

      // Optionally show debug panel
      ensureDebugPanel().style.display = "block";
    } catch (e) {
      dbg(`submit fail: ${e.message}`);
      showFailBanner(`送出失敗 ❌ ${e.message}`);
    }
  }

  /* -----------------------------
   * Boot
   * ----------------------------- */
  function bind() {
    // Show version immediately (so you never see "-")
    setText("verText", VERSION);
    setText("versionText", VERSION);
    setText("ver", VERSION);

    // Bind submit button / form
    const form = byId("hscForm") || $("form");
    if (form) {
      form.addEventListener("submit", onSubmit);
      dbg("bind form ok");
    } else {
      dbg("missing <form> element — cannot bind submit");
      showFailBanner("頁面找不到 form，請確認 form.html 的 <form> 結構。");
    }

    // Debug button if exists
    const dbgBtn = byId("debugBtn") || byId("openDebug");
    if (dbgBtn) {
      dbgBtn.onclick = () => {
        const box = ensureDebugPanel();
        box.style.display = box.style.display === "none" ? "block" : "none";
      };
    }

    // Always create panel (hidden)
    ensureDebugPanel();

    dbg("boot ok", {
      VERSION,
      gas: CONFIG.GAS,
      tenant,
      hasFirebaseCompat: hasFirebaseCompat(),
      expSig: !!(exp && sig),
      nocache: URLP.get("nocache") || ""
    });
  }

  // Run after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();