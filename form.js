/* =============================================
 * form.js — v511.0 (COMPLETE OVERWRITE)
 * HSC Frontend Form — 商用穩定：防連點 + Draft 暫存
 *
 * Key fixes:
 * - Prevent duplicate reserve rows
 * - Draft cache {id,token,tenant,ts} in localStorage
 * - If draft exists -> reuse it (skip reserve) -> proceed upload/create
 * - Clear draft ONLY after create success
 *
 * Also keeps:
 * - GET-first + fallback POST(urlencoded)
 * - No base64 to GAS
 * - Optional exp+sig passthrough
 * - On-page debug panel (no mobile console needed)
 * ============================================= */

(() => {
  "use strict";

  const VERSION = "v511.0";

  const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_TENANT: "angel",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 1,
    FIREBASE_ENABLED: true,

    // Draft cache behavior
    DRAFT_KEY: "hsc_draft_card_v1",
    DRAFT_TTL_MS: 2 * 60 * 60 * 1000, // 2 hours (你也可改 24hr)
  };

  /* -----------------------------
   * DOM helpers
   * ----------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }

  function ensureDebugPanel() {
    let box = byId("hscDebugBox");
    if (box) return box;

    box = document.createElement("div");
    box.id = "hscDebugBox";
    box.style.cssText = [
      "position:fixed","left:12px","right:12px","bottom:12px","z-index:99999",
      "padding:12px","border-radius:16px","background:rgba(0,0,0,.72)",
      "color:rgba(255,255,255,.92)","font:12px/1.5 system-ui,-apple-system,'Noto Sans TC',Segoe UI,Roboto,Arial",
      "box-shadow:0 10px 30px rgba(0,0,0,.35)","backdrop-filter: blur(10px)",
      "max-height:42vh","overflow:auto","display:none"
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
        toast("已複製 Debug ✅");
      } catch {
        toast("複製失敗（瀏覽器限制），請長按選取。");
      }
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

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function showFailBanner(msg) {
    const pill = byId("statusPill") || byId("status") || byId("submitStatus");
    if (pill) pill.textContent = msg;
    toast(msg);
    ensureDebugPanel().style.display = "block";
  }

  function getValue(id) {
    const el = byId(id);
    if (!el) return "";
    return String(el.value || "").trim();
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
   * Draft cache
   * ----------------------------- */
  function nowMs() { return Date.now(); }

  function readDraft() {
    try {
      const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || !d.id || !d.token) return null;
      if (d.tenant && d.tenant !== tenant) return null;

      const age = nowMs() - (d.ts || 0);
      if (age > CONFIG.DRAFT_TTL_MS) {
        localStorage.removeItem(CONFIG.DRAFT_KEY);
        return null;
      }
      return d;
    } catch {
      return null;
    }
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
    catch { throw new Error(`Non-JSON response: ${txt.slice(0, 180)}`); }
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

  async function uploadToFirebaseCompat(cardId, file, fileName) {
    if (!CONFIG.FIREBASE_ENABLED) throw new Error("Firebase disabled");
    if (!hasFirebaseCompat()) throw new Error("Firebase SDK not found (window.firebase.storage)");
    const storage = window.firebase.storage();
    const path = `hsc_cards/${tenant}/${cardId}/${fileName}`; // REQUIRED
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
   * Payload
   * ----------------------------- */
  function collectTextPayload() {
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
      plan: getValue("plan"),
      color: getValue("color"),
      style: getValue("style"),
      paper: getValue("paper")
    };
    Object.keys(p).forEach((k) => { if (p[k] === "") delete p[k]; });
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
    // If draft exists, reuse it
    const draft = readDraft();
    if (draft) {
      currentCardId = draft.id;
      currentToken = draft.token;
      setText("cardIdText", currentCardId);
      setText("cardId", currentCardId);
      dbg("reuse draft id/token", draft);
      toast(`沿用草稿卡 ${currentCardId}`);
      return { ok: true, id: currentCardId, token: currentToken, reused: true };
    }

    // Otherwise reserve a new one and save draft
    const plan = getValue("plan") || "free";
    const js = await callGAS("reserve", { tenant, plan });
    dbg("reserve resp:", js);

    if (!js || js.ok !== true) throw new Error(js && js.error ? js.error : `reserve failed: ${safeJson(js)}`);
    if (!js.id || !js.token) throw new Error(`reserve missing id/token: ${safeJson(js)}`);

    currentCardId = js.id;
    currentToken = js.token;

    setText("cardIdText", currentCardId);
    setText("cardId", currentCardId);

    writeDraft(currentCardId, currentToken);
    toast(`reserve ok ${currentCardId}`);
    return js;
  }

  async function uploadImages(cardId) {
    const out = {};

    const avatarFile = pickFile("avatarFile");
    if (avatarFile) out.avatar_img = await uploadToFirebaseCompat(cardId, avatarFile, "avatar.jpg");
    else {
      const u = getValue("avatar_img") || getValue("avatarURL");
      if (u) out.avatar_img = u;
    }

    const logoFile = pickFile("logoFile");
    if (logoFile) out.logo_img = await uploadToFirebaseCompat(cardId, logoFile, "logo.jpg");
    else {
      const u = getValue("logo_img") || getValue("logoURL");
      if (u) out.logo_img = u;
    }

    for (let i = 1; i <= 5; i++) {
      const f = pickFile(`photo${i}File`);
      if (f) out[`photo${i}_img`] = await uploadToFirebaseCompat(cardId, f, `photo${i}.jpg`);
      else {
        const u = getValue(`photo${i}_img`) || getValue(`photo${i}URL`);
        if (u) out[`photo${i}_img`] = u;
      }
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

    // client-side base64 reject
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v === "string" && v.startsWith("data:image/")) {
        throw new Error(`Client reject base64 field: ${k}`);
      }
    });

    const js = await callGAS("create", params);
    dbg("create resp:", js);

    if (!js || js.ok !== true) throw new Error(js && js.error ? js.error : `create failed: ${safeJson(js)}`);

    if (Array.isArray(js.writtenFields)) dbg("writtenFields:", js.writtenFields);
    if (Array.isArray(js.skippedFields)) dbg("skippedFields:", js.skippedFields);

    return js;
  }

  /* -----------------------------
   * Submit lock + disable buttons
   * ----------------------------- */
  let inFlight = false;

  function setSubmitting(on) {
    const btns = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
    btns.forEach(b => {
      try { b.disabled = !!on; } catch {}
      if (on) b.setAttribute("aria-busy", "true");
      else b.removeAttribute("aria-busy");
    });

    // Optional: if your UI has a big pill
    const pill = byId("statusPill") || byId("status") || byId("submitStatus");
    if (pill) pill.textContent = on ? "送出中…" : pill.textContent;
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    if (inFlight) {
      toast("送出中…請稍等（已鎖定防連點）");
      dbg("blocked duplicate submit (inFlight=true)");
      return;
    }

    inFlight = true;
    setSubmitting(true);

    try {
      dbg("submit start", { VERSION, tenant, hasExpSig: !!(exp && sig), hasFirebaseCompat: hasFirebaseCompat() });

      setText("verText", VERSION);
      setText("versionText", VERSION);
      setText("ver", VERSION);

      await schemaCheck();

      // Reserve ONCE (or reuse draft)
      const rsv = await reserveOnce();

      let imageMap = {};
      try {
        imageMap = await uploadImages(currentCardId);
      } catch (upErr) {
        dbg(`upload warning: ${upErr.message}`);
      }

      const textPayload = collectTextPayload();
      const cr = await create(textPayload, imageMap);

      toast("送出成功 ✅");
      const pill = byId("statusPill") || byId("status") || byId("submitStatus");
      if (pill) pill.textContent = "送出成功 ✅";

      // IMPORTANT: clear draft only after success
      clearDraft();

      // Keep last result
      window.__HSC_LAST_RESULT__ = { reserve: rsv, create: cr };

      ensureDebugPanel().style.display = "block";
    } catch (e) {
      dbg(`submit fail: ${e.message}`);
      showFailBanner(`送出失敗 ❌ ${e.message}`);
      // draft NOT cleared on failure, so user can retry without new reserve
      toast("可直接再按一次送出（會沿用同一張卡，不會再 reserve 新卡）");
    } finally {
      inFlight = false;
      setSubmitting(false);
    }
  }

  /* -----------------------------
   * Boot / bind once
   * ----------------------------- */
  function bindOnce() {
    // Show version immediately
    setText("verText", VERSION);
    setText("versionText", VERSION);
    setText("ver", VERSION);

    // If draft exists, show cardId immediately (nice UX)
    const d = readDraft();
    if (d) {
      setText("cardIdText", d.id);
      setText("cardId", d.id);
      dbg("draft detected on boot", d);
    }

    // Bind form submit (avoid double binding)
    const form = byId("hscForm") || $("form");
    if (!form) {
      dbg("missing <form> element — cannot bind submit");
      showFailBanner("頁面找不到 form，請確認 form.html 的 <form> 結構。");
      return;
    }

    if (form.dataset.hscBound === "1") {
      dbg("already bound, skip");
      return;
    }
    form.dataset.hscBound = "1";
    form.addEventListener("submit", onSubmit);

    // Optional: Debug toggle button
    const dbgBtn = byId("debugBtn") || byId("openDebug");
    if (dbgBtn) {
      dbgBtn.onclick = () => {
        const box = ensureDebugPanel();
        box.style.display = box.style.display === "none" ? "block" : "none";
      };
    }

    // Optional: Draft reset button (if you have a place for it)
    // If you want, add a button with id="resetDraftBtn" in form.html
    const resetBtn = byId("resetDraftBtn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        clearDraft();
        toast("已清除草稿卡（下次會重新 reserve）");
        setText("cardIdText", "-");
        setText("cardId", "-");
      };
    }

    ensureDebugPanel();
    dbg("boot ok", { VERSION, gas: CONFIG.GAS, tenant, expSig: !!(exp && sig), nocache: URLP.get("nocache") || "" });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindOnce);
  } else {
    bindOnce();
  }
})();