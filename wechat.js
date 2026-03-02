/* ================================
 * wechat.js — v497 (COMPLETE OVERWRITE)
 * - Fetch GAS: action=card (unified)
 * - Accept payload: {ok:true, data:{...}} OR {ok:true, item:{...}}
 * - Robust image URL normalize (Drive/Dropbox/http->https)
 * - Plan split: free max 2 photos; premium max 5 photos
 * - QR -> clean card url (index.html?id=TWxxxx&view=1)
 * - html2canvas -> PNG (best effort; if images are non-CORS, still may fail on canvas)
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v497",
    DEFAULT_ID: "TW0001",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    FETCH_TIMEOUT_MS: 12000,
    RETRY: 2
  };

  const $ = (sel) => document.querySelector(sel);

  function getId() {
    const u = new URL(location.href);
    const q = (u.searchParams.get("id") || "").trim();
    if (q) return normalizeId(q);
    const h = (location.hash || "").replace("#", "").trim();
    return normalizeId(h) || CONFIG.DEFAULT_ID;
  }

  function normalizeId(raw) {
    const s = String(raw || "").trim().toUpperCase();
    if (!s) return "";
    if (/^TW\d{4}$/.test(s)) return s;
    if (/^\d{1,4}$/.test(s)) return "TW" + s.padStart(4, "0");
    if (/^TW\d{1,4}$/.test(s)) {
      const n = s.replace(/^TW/i, "");
      return "TW" + n.padStart(4, "0");
    }
    return s;
  }

  function base_() {
    // GitHub Pages subpath safe
    // e.g. https://xxx.github.io/Happiness-Smart-Card-System/wechat.html -> .../Happiness-Smart-Card-System/
    return location.origin + location.pathname.replace(/\/[^/]*$/, "/");
  }

  function buildCleanUrl(id) {
    return base_() + "index.html?id=" + encodeURIComponent(id) + "&view=1";
  }

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      const v = obj && obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return fallback;
  }

  // ---- URL normalize for <img> ----
  function toHttps_(u) {
    if (!u) return "";
    let s = String(u).trim();
    if (!s) return "";
    if (s.startsWith("//")) s = "https:" + s;
    s = s.replace(/^http:\/\//i, "https://");
    return s;
  }

  function driveIdFromUrl_(u) {
    const s = String(u || "");
    // file/d/<id>/
    let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    // open?id=<id>
    m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    // uc?id=<id>
    m = s.match(/\/uc\?[^#]*[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    return "";
  }

  function normalizeImgUrl_(u) {
    let s = toHttps_(u);
    if (!s) return "";

    // Dropbox: dl=0 -> raw=1
    if (/dropbox\.com/i.test(s)) {
      s = s.replace(/[?&]dl=0\b/, "");
      s += (s.includes("?") ? "&" : "?") + "raw=1";
      return s;
    }

    // Google Drive links -> uc?export=view&id=
    if (/drive\.google\.com/i.test(s)) {
      const id = driveIdFromUrl_(s);
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
      return s;
    }

    // If already googleusercontent, keep
    return s;
  }

  function safeTextOrHide(el, v, fallback = "") {
    if (!el) return;
    const val = (v && String(v).trim()) ? String(v).trim() : (fallback || "");
    if (!val) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "";
    el.textContent = val;
  }

  function safeImg(el, url) {
    if (!el) return;
    const u = normalizeImgUrl_(url);
    if (!u) { el.style.display = "none"; return; }
    el.style.display = "";
    // best effort for CORS / referrer issues
    el.crossOrigin = "anonymous";
    el.referrerPolicy = "no-referrer";
    el.src = u;
  }

  function splitLines_(s) {
    const t = String(s || "").trim();
    if (!t) return "";
    // keep user newlines, also accept comma-like separators
    return t.replace(/\r\n/g, "\n");
  }

  function collectPhotos(card) {
    // prefer fast first
    const cands = [
      pick(card, ["photo1_img_fast","photo1_fast","照片1_fast","照片1_img_fast","照片1_fast_url"], ""),
      pick(card, ["photo2_img_fast","photo2_fast","照片2_fast","照片2_img_fast"], ""),
      pick(card, ["photo3_img_fast","photo3_fast","照片3_fast","照片3_img_fast"], ""),
      pick(card, ["photo4_img_fast","photo4_fast","照片4_fast","照片4_img_fast"], ""),
      pick(card, ["photo5_img_fast","photo5_fast","照片5_fast","照片5_img_fast"], "")
    ].filter(Boolean);

    const raw = [
      pick(card, ["photo1_img","photo1","照片1","照片1_img"], ""),
      pick(card, ["photo2_img","photo2","照片2","照片2_img"], ""),
      pick(card, ["photo3_img","photo3","照片3","照片3_img"], ""),
      pick(card, ["photo4_img","photo4","照片4","照片4_img"], ""),
      pick(card, ["photo5_img","photo5","照片5","照片5_img"], "")
    ].filter(Boolean);

    const all = [...cands, ...raw].filter(Boolean).map(normalizeImgUrl_);

    // de-dup
    const seen = new Set();
    const out = [];
    for (const u of all) {
      if (!u) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  }

  function renderPhotos(container, urls) {
    if (!container) return;
    container.innerHTML = "";

    const list = (urls || []).filter(Boolean);
    for (const u of list) {
      const img = document.createElement("img");
      img.alt = "photo";
      img.loading = "lazy";
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.src = u;
      container.appendChild(img);
    }
    container.style.display = list.length ? "" : "none";
  }

  function renderQR(qrBox, text) {
    if (!qrBox) return;
    qrBox.innerHTML = "";
    const t = String(text || "").trim();

    if (window.QRCode) {
      // eslint-disable-next-line no-new
      new window.QRCode(qrBox, {
        text: t,
        width: 180,
        height: 180,
        correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : undefined
      });
      return;
    }

    const p = document.createElement("div");
    p.style.fontSize = "12px";
    p.style.wordBreak = "break-all";
    p.textContent = t;
    qrBox.appendChild(p);
  }

  function toast(msg) {
    const el = $("#toast") || $("#toastBox");
    if (!el) { console.log(msg); return; }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 1600);
  }

  async function copyText(text) {
    if (!text) { toast("沒有可複製的連結"); return false; }
    try {
      await navigator.clipboard.writeText(text);
      toast("已複製連結");
      return true;
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast("已複製連結");
        return true;
      } catch (e) {
        prompt("請手動複製：", text);
        return false;
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  // ---- fetch ----
  async function fetchJson(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store", signal: ctrl.signal });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (_) { json = { ok: false, raw: text }; }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
      return json;
    } finally {
      clearTimeout(t);
    }
  }

  async function fetchWithRetry(url) {
    let lastErr = null;
    for (let i = 0; i <= CONFIG.RETRY; i++) {
      try { return await fetchJson(url); }
      catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 450 * (i + 1))); }
    }
    throw lastErr || new Error("fetch failed");
  }

  // ---- capture mode for clean poster ----
  function ensureCaptureCssOnce() {
    if (document.getElementById("captureModeStyle")) return;
    const style = document.createElement("style");
    style.id = "captureModeStyle";
    style.textContent = `
      body.capture-mode .topbar { display:none !important; }
      body.capture-mode .actions { display:none !important; }
      body.capture-mode #resultBox { display:none !important; }
      body.capture-mode #toast { display:none !important; }
      body.capture-mode .qrHint > div:first-child { display:none !important; }
    `;
    document.head.appendChild(style);
  }

  async function renderPng(targetEl, outImgEl) {
    if (!targetEl || !outImgEl) return;
    if (!window.html2canvas) { toast("缺少 html2canvas"); return; }

    ensureCaptureCssOnce();

    // optional: hide long url line
    const cleanUrlEl = $("#wCleanUrl");
    const prevCleanDisplay = cleanUrlEl ? cleanUrlEl.style.display : "";
    if (cleanUrlEl) cleanUrlEl.style.display = "none";

    document.body.classList.add("capture-mode");
    await new Promise(r => setTimeout(r, 80));

    try {
      const canvas = await window.html2canvas(targetEl, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true
      });
      outImgEl.src = canvas.toDataURL("image/png");
      outImgEl.style.display = "";
      const resultBox = $("#resultBox");
      if (resultBox) resultBox.style.display = "";
      toast("PNG 已產生");
    } catch (err) {
      console.error(err);
      toast("PNG 產生失敗（可能是圖片來源不允許跨域）");
    } finally {
      document.body.classList.remove("capture-mode");
      if (cleanUrlEl) cleanUrlEl.style.display = prevCleanDisplay;
    }
  }

  function wireButtons(cleanUrl) {
    const btnCopy = $("#btnCopyLink");
    const btnOpen = $("#btnOpenLink");
    const btnRender = $("#btnRender");
    const btnBack = $("#btnBack");

    const captureTarget = $("#capture");
    const outImg = $("#resultImg");

    if (btnCopy) btnCopy.onclick = () => copyText(cleanUrl || "");
    if (btnOpen) btnOpen.onclick = () => { if (cleanUrl) window.open(cleanUrl, "_blank"); };
    if (btnRender) btnRender.onclick = () => renderPng(captureTarget, outImg);
    if (btnBack) btnBack.onclick = () => history.back();
  }

  async function main() {
    const id = getId();
    safeTextOrHide($("#wId"), id);

    // ✅ IMPORTANT: unified API
    const api = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
    const json = await fetchWithRetry(api);

    if (!json || !json.ok) {
      console.error(json);
      alert("讀取名片失敗：" + (json && (json.error || json.message) ? (json.error || json.message) : "unknown"));
      return;
    }

    // ✅ accept data or item
    const card = (json.data && typeof json.data === "object") ? json.data
              : (json.item && typeof json.item === "object") ? json.item
              : {};

    // plan split
    const plan = (pick(card, ["plan","方案","mode"], "free") || "free").toLowerCase();
    const isPremium = (plan === "premium" || plan === "pro" || plan === "p");

    // text fields
    safeTextOrHide($("#wName"), pick(card, ["name","姓名"], "(未填姓名)"), "(未填姓名)");
    safeTextOrHide($("#wUnit"), pick(card, ["unit","單位"], "—"), "—");
    safeTextOrHide($("#wTitle"), pick(card, ["title","頭銜"], "—"), "—");
    safeTextOrHide($("#wSlogan"), pick(card, ["slogan","理念標語","標語"], "—"), "—");

    const servicesRaw = pick(card, ["services","service","服務項目"], "");
    safeTextOrHide($("#wServices"), splitLines_(servicesRaw) || "—", "—");

    // images
    const avatar = pick(card, ["avatar_img_fast","avatar_fast","個人照_fast","avatar_img","個人照"], "");
    const logo   = pick(card, ["logo_img_fast","logo_fast","Logo_fast","logo_img","Logo"], "");
    safeImg($("#wAvatar"), avatar);
    safeImg($("#wLogo"), logo);

    // photos
    let photos = collectPhotos(card);
    photos = isPremium ? photos.slice(0, 5) : photos.slice(0, 2);
    renderPhotos($("#wPhotos"), photos);

    // clean url + QR
    const cleanUrl = buildCleanUrl(id);
    renderQR($("#wQR"), cleanUrl);
    safeTextOrHide($("#wCleanUrl"), cleanUrl, cleanUrl);

    wireButtons(cleanUrl);
  }

  document.addEventListener("DOMContentLoaded", () => {
    main().catch(err => {
      console.error(err);
      alert("系統錯誤：" + (err && err.message ? err.message : "unknown"));
    });
  });
})();