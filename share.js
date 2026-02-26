/* ================================
 * share.js v402.1 — 超級防呆版
 * — Auto Drive image fallback
 * — Fallback from avatar → photos
 * — Copy buttons with feedback
 * — Safe text + safe fetch
 * ================================ */

(() => {
  "use strict";

  const CFG = {
    CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    SHARE_BASE_URL:
      "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html",
    GAS_WEBAPP_URL:
      "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_ID: "TW0001",
    OG_IMAGE: "og-card.png",
    TIMEOUT_MS: 10000,
  };

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);

  const elAva = $("avaImg");
  const elName = $("name");
  const elSub = $("sub");
  const elCardBox = $("cardUrlBox");

  const btnBack = $("btnBack");
  const btnCopyCard = $("btnCopyCard");
  const btnOpenCard = $("btnOpenCard");
  const btnCopyOg = $("btnCopyOg");

  /* ---------- Helpers ---------- */
  function getParam(name) {
    try {
      const u = new URL(location.href);
      return (u.searchParams.get(name) || "").trim();
    } catch {
      return "";
    }
  }

  function noop() {}

  function safeText(v) {
    return String(v ?? "").trim();
  }

  function joinUrl(base, path) {
    if (!base) return path;
    if (!path) return base;
    return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
  }

  /* ========= Image Normalization / Fallback ========= */

  // 抽 Drive ID（盡可能）
  function extractDriveFileId(rawUrl) {
    const u = safeText(rawUrl);
    if (!u) return "";

    let m = u.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/i);
    if (m && m[1]) return m[1];

    m = u.match(/drive\.google\.com\/open\?id=([^&?#]+)/i);
    if (m && m[1]) return m[1];

    m = u.match(/drive\.google\.com\/uc\?[^#]*id=([^&?#]+)/i);
    if (m && m[1]) return m[1];

    m = u.match(/thumbnail\?id=([^&]+)/i);
    if (m && m[1]) return m[1];

    m = u.match(/[?&]id=([^&]+)/i);
    if (m && m[1]) return m[1];

    return "";
  }

  // 用多個 candidate 嘗試載圖
  function buildImageCandidates(raw) {
    const out = [];

    const urlRaw = safeText(raw);
    if (!urlRaw) return out;

    // 多連結（換行／逗號／分號）
    const parts = urlRaw.split(/[\n,，;；]+/).map((x) => x.trim()).filter(Boolean);

    for (let part of parts) {
      if (!part) continue;
      // http 強制 https
      if (part.startsWith("http://")) part = "https://" + part.slice(7);

      // dropbox
      if (part.includes("dropbox.com")) {
        let u2 = part.replace("dl=0", "raw=1");
        if (!u2.includes("raw=1")) u2 += (u2.includes("?") ? "&" : "?") + "raw=1";
        out.push(u2);
        continue;
      }

      // Drive
      const fid = extractDriveFileId(part);
      if (fid) {
        out.push(
          // Google 直連試候補
          `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fid)}`,
          `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fid)}`,
          `https://drive.googleusercontent.com/uc?id=${encodeURIComponent(fid)}`,
          `https://lh3.googleusercontent.com/d/${encodeURIComponent(fid)}`
        );
        continue;
      }

      // 一般網址就直接 push
      out.push(part);
    }

    // 加上 timestamp 防快取
    return Array.from(
      new Set(
        out.map((u) => (u ? u + (u.includes("?") ? "&" : "?") + "t=" + Date.now() : "")
        )
      )
    ).filter(Boolean);
  }

  // 依候選清單循環試圖
  async function setImgWithFallback(imgEl, rawUrl) {
    if (!imgEl) return false;
    const cand = buildImageCandidates(rawUrl);
    if (!cand.length) {
      imgEl.removeAttribute("src");
      return false;
    }

    let success = false;
    for (const src of cand) {
      success = await new Promise((resolve) => {
        const test = new Image();
        test.onload = () => {
          imgEl.src = src;
          resolve(true);
        };
        test.onerror = () => resolve(false);
        test.src = src;
      });
      if (success) break;
    }
    if (!success) {
      imgEl.removeAttribute("src");
    }
    return success;
  }

  /* ========= Fetch JSON ========= */
  async function fetchJson(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        console.warn("[share.js] JSON parse failed:", text.slice(0, 200));
        return null;
      }
    } catch (e) {
      console.warn("[share.js] fetch failed:", e);
      return null;
    }
  }

  /* ========= Clipboard ========= */
  async function copyText(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  }

  function showCopyFeedback(el, success) {
    if (!el) return;
    const old = el.innerHTML;
    el.innerHTML = success
      ? '<i class="fa-solid fa-check"></i> 已複製'
      : '<i class="fa-solid fa-triangle-exclamation"></i> 失敗';
    setTimeout(() => (el.innerHTML = old), 1200);
  }

  /* ========= Build URLs ========= */
  function buildCardUrl(id) {
    const base = CFG.CARD_BASE_URL.replace(/\/+$/, "") + "/";
    return `${base}?id=${encodeURIComponent(id)}`;
  }

  function buildOgUrl() {
    const base = CFG.CARD_BASE_URL.replace(/\/+$/, "") + "/";
    return base + CFG.OG_IMAGE;
  }

  /* ========= Main ========= */
  async function boot() {
    const id = getParam("id") || CFG.DEFAULT_ID;

    const cardUrl = buildCardUrl(id);
    elCardBox.textContent = cardUrl;

    btnBack?.addEventListener("click", () => (location.href = cardUrl));
    btnOpenCard?.addEventListener("click", () => window.open(cardUrl, "_blank"));
    btnCopyCard?.addEventListener("click", async () => {
      const ok = await copyText(cardUrl);
      showCopyFeedback(btnCopyCard, ok);
    });
    btnCopyOg?.addEventListener("click", async () => {
      const ok = await copyText(buildOgUrl());
      showCopyFeedback(btnCopyOg, ok);
    });

    // fetch card
    const apiUrl = `${CFG.GAS_WEBAPP_URL}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
    const row = await fetchJson(apiUrl);

    if (!row || !row["姓名"]) {
      elName.textContent = "載入失敗";
      elSub.textContent = "";
      return;
    }

    elName.textContent = safeText(row["姓名"] || row.name || id);
    elSub.textContent = [
      safeText(row["單位"]),
      safeText(row["頭銜"]),
      safeText(row["理念標語"]),
    ]
      .filter(Boolean)
      .join("\n");

    // head avatar fallback:
    // 1) 個人照_fast
    // 2) 個人照
    // 3) photos_full[0]
    // 4) photos[0]
    const avatarSources = [
      safeText(row["個人照_fast"]),
      safeText(row["個人照"]),
      Array.isArray(row.photos_full) && row.photos_full[0],
      Array.isArray(row.photos) && row.photos[0],
    ].filter(Boolean);

    let loaded = false;
    for (const raw of avatarSources) {
      loaded = await setImgWithFallback(elAva, raw);
      if (loaded) break;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();