/* ================================
 * wechat.js — v495 (COMPLETE OVERWRITE)
 * - Read id from ?id=TW0001 or #TW0001
 * - Fetch GAS: action=wechat-data
 * - Render into wechat.html (v495 DOM ids)
 * - QR code -> clean_card_url
 * - html2canvas -> PNG
 * - NEW: Pure Poster Capture Mode (clean PNG)
 *   - During capture: hide UI that shouldn't be in poster
 *   - Hide clean URL text line (optional) for cleaner poster
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v495",
    DEFAULT_ID: "TW0001",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    FETCH_TIMEOUT_MS: 12000,
    RETRY: 2
  };

  const $ = (sel) => document.querySelector(sel);

  function getId() {
    const u = new URL(location.href);
    const q = (u.searchParams.get("id") || "").trim();
    if (q) return q;
    const h = (location.hash || "").replace("#", "").trim();
    return h || CONFIG.DEFAULT_ID;
  }

  async function fetchJson(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: ctrl.signal
      });
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

  function safeText(el, v) {
    if (!el) return;
    const has = !!(v && String(v).trim());
    el.textContent = has ? String(v) : "—";
    el.classList.toggle("muted", !has);
    el.style.display = "";
  }

  function safeTextOrHide(el, v) {
    if (!el) return;
    const has = !!(v && String(v).trim());
    el.textContent = has ? String(v) : "";
    el.style.display = has ? "" : "none";
  }

  function safeImg(el, url) {
    if (!el) return;
    if (!url) { el.style.display = "none"; return; }
    el.style.display = "";
    el.src = url;
  }

  function renderPhotos(container, urls) {
    if (!container) return;
    container.innerHTML = "";
    (urls || []).filter(Boolean).forEach(u => {
      const img = document.createElement("img");
      img.alt = "photo";
      img.loading = "lazy";
      img.src = u;
      container.appendChild(img);
    });
    container.style.display = (urls && urls.filter(Boolean).length) ? "" : "none";
  }

  function renderQR(qrBox, text) {
    if (!qrBox) return;
    qrBox.innerHTML = "";

    if (window.QRCode) {
      // eslint-disable-next-line no-new
      new window.QRCode(qrBox, {
        text: text || "",
        width: 180,
        height: 180,
        correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : undefined
      });
      return;
    }

    // fallback text
    const p = document.createElement("div");
    p.style.fontSize = "12px";
    p.style.wordBreak = "break-all";
    p.textContent = text || "";
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
        toast("複製失敗，請手動複製");
        return false;
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  /* ================================
   * Pure Poster Capture Mode
   * - add class "capture-mode" on body during html2canvas
   * - temporarily hide small url text for cleaner poster
   * ================================ */
  function ensureCaptureCssOnce() {
    if (document.getElementById("captureModeStyle")) return;

    const style = document.createElement("style");
    style.id = "captureModeStyle";
    style.textContent = `
      body.capture-mode .topbar { display:none !important; }
      body.capture-mode .actions { display:none !important; }
      body.capture-mode #resultBox { display:none !important; }
      body.capture-mode #toast { display:none !important; }
      /* 如果你希望海報上不出現 Clean Card URL 英文字，也一起隱藏 */
      body.capture-mode .qrHint > div:first-child { display:none !important; }
    `;
    document.head.appendChild(style);
  }

  async function renderPng(targetEl, outImgEl) {
    if (!targetEl || !outImgEl) return;
    if (!window.html2canvas) { toast("缺少 html2canvas"); return; }

    ensureCaptureCssOnce();

    // Optional: hide the long URL line in poster for cleaner look
    const cleanUrlEl = $("#wCleanUrl");
    const prevCleanDisplay = cleanUrlEl ? cleanUrlEl.style.display : "";
    if (cleanUrlEl) cleanUrlEl.style.display = "none";

    // Enter capture mode
    document.body.classList.add("capture-mode");

    // Give browser a tick to apply styles
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
      toast("PNG 產生失敗");
    } finally {
      // Exit capture mode and restore
      document.body.classList.remove("capture-mode");
      if (cleanUrlEl) cleanUrlEl.style.display = prevCleanDisplay;
    }
  }

  function wireButtons(cleanUrl) {
    const btnCopy = $("#btnCopyLink") || $("#btnCopy") || $("[data-action='copy']");
    const btnOpen = $("#btnOpenLink") || $("#btnOpen") || $("[data-action='open']");
    const btnRender = $("#btnRender") || $("[data-action='render']");
    const btnBack = $("#btnBack") || $("[data-action='back']");

    const captureTarget = $("#capture") || $("#wechatCard") || $("#card");
    const outImg = $("#resultImg") || $("#pngOut");

    if (btnCopy) btnCopy.onclick = () => copyText(cleanUrl || "");
    if (btnOpen) btnOpen.onclick = () => { if (cleanUrl) window.open(cleanUrl, "_blank"); };
    if (btnRender) btnRender.onclick = () => renderPng(captureTarget, outImg);
    if (btnBack) btnBack.onclick = () => history.back();
  }

  async function main() {
    const id = getId();

    // Show ID immediately
    safeTextOrHide($("#wId"), id);

    const url = `${CONFIG.GAS}?action=wechat-data&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
    const data = await fetchWithRetry(url);

    if (!data || !data.ok) {
      console.error(data);
      alert("讀取名片失敗：" + (data && (data.error || data.message) ? (data.error || data.message) : "unknown"));
      return;
    }

    const item = data.item || {};

    // DOM ids (aligned with wechat.html v495)
    safeTextOrHide($("#wName"), item.name || "(未填姓名)");
    safeTextOrHide($("#wUnit"), item.unit || "—");
    safeTextOrHide($("#wTitle"), item.title || "—");
    safeTextOrHide($("#wSlogan"), item.slogan || "—");
    safeTextOrHide($("#wServices"), item.services || "—");

    safeImg($("#wAvatar"), item.avatar_url);
    safeImg($("#wLogo"), item.logo_url);

    renderPhotos($("#wPhotos"), item.photos);

    const cleanUrl = item.clean_card_url || "";
    renderQR($("#wQR"), cleanUrl);

    // 這行在「純海報模式」會在截圖時暫時隱藏
    safeTextOrHide($("#wCleanUrl"), cleanUrl || "—");

    wireButtons(cleanUrl);
  }

  document.addEventListener("DOMContentLoaded", () => {
    main().catch(err => {
      console.error(err);
      alert("系統錯誤：" + (err && err.message ? err.message : "unknown"));
    });
  });
})();