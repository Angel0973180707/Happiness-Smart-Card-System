/* ================================
 * share.js v402 (COMPLETE OVERWRITE)
 * - Angel Card Share Page (share.html)
 * - Auto-foolproof image loading (Google Drive link variants)
 * - Build Card URL / Share URL / OG URL
 * - Copy link / Open link / Copy OG image link
 * ================================ */

(() => {
  "use strict";

  /***************
   * CONFIG (可改)
   ***************/
  const CFG = {
    // 你的名片前台（你已提供）
    CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    // share.html 的網址（同站即可）
    SHARE_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html",
    // 你的 GAS WebApp（你已提供）
    GAS_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

    DEFAULT_ID: "TW0001",
    OG_IMAGE: "og-card.png",

    // 你 Code.gs 會回 photos / photos_full；也可能回「照片_fast」逗號字串
    MAX_PHOTOS: 5,

    // UI
    TOAST_MS: 1600,
  };

  /***************
   * DOM
   ***************/
  const $ = (id) => document.getElementById(id);

  const elAva = $("avaImg");
  const elName = $("name");
  const elSub = $("sub");
  const elCardUrlBox = $("cardUrlBox");

  const btnBack = $("btnBack");
  const btnCopyCard = $("btnCopyCard");
  const btnOpenCard = $("btnOpenCard");
  const btnCopyOg = $("btnCopyOg");

  /***************
   * URL helpers
   ***************/
  function getQueryParam_(k) {
    const u = new URL(location.href);
    return (u.searchParams.get(k) || "").trim();
  }

  function normalizeBaseUrl_(u) {
    if (!u) return "";
    try {
      const url = new URL(u);
      // ensure trailing slash for base
      if (!url.pathname.endsWith("/")) url.pathname += "/";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch (e) {
      return u;
    }
  }

  function buildCardUrl_(id) {
    const base = normalizeBaseUrl_(CFG.CARD_BASE_URL);
    return `${base}?id=${encodeURIComponent(id)}`;
  }

  function buildShareUrl_(id) {
    return `${CFG.SHARE_BASE_URL}?id=${encodeURIComponent(id)}`;
  }

  function buildOgUrl_() {
    // og-card.png 放在同層根目錄
    try {
      const u = new URL(CFG.SHARE_BASE_URL);
      // keep directory
      const dir = u.pathname.endsWith("/") ? u.pathname : u.pathname.split("/").slice(0, -1).join("/") + "/";
      return `${u.origin}${dir}${CFG.OG_IMAGE}`;
    } catch (e) {
      return CFG.OG_IMAGE;
    }
  }

  /***************
   * Toast
   ***************/
  function toast_(msg) {
    // minimal toast (no extra CSS dependency)
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "18px";
    t.style.transform = "translateX(-50%)";
    t.style.background = "rgba(0,0,0,0.72)";
    t.style.color = "rgba(255,255,255,0.92)";
    t.style.padding = "10px 12px";
    t.style.borderRadius = "12px";
    t.style.fontSize = "12px";
    t.style.zIndex = "99999";
    t.style.maxWidth = "92vw";
    t.style.wordBreak = "break-word";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), CFG.TOAST_MS);
  }

  /***************
   * Clipboard
   ***************/
  async function copyText_(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast_("已複製");
      return true;
    } catch (e) {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast_("已複製");
        return true;
      } catch (e2) {
        toast_("複製失敗（請長按手動複製）");
        return false;
      }
    }
  }

  /***************
   * Google Drive image foolproof
   *
   * Problem:
   * - /file/d/.../view?usp=drivesdk often fails in <img>
   * Fix:
   * - Convert to a list of direct-ish variants and try sequentially
   ***************/
  function extractDriveId_(url) {
    if (!url) return "";
    const s = String(url).trim();

    // file/d/<id>/
    let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (m && m[1]) return m[1];

    // open?id=<id>
    m = s.match(/[?&]id=([^&]+)/i);
    if (m && m[1]) return m[1];

    // uc?...id=<id>
    m = s.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
    if (m && m[1]) return m[1];

    // thumbnail?id=<id>
    m = s.match(/thumbnail\?id=([^&]+)/i);
    if (m && m[1]) return m[1];

    return "";
  }

  function normalizeHttp_(url) {
    if (!url) return "";
    let u = String(url).trim();
    if (!u) return "";
    if (u.startsWith("http://")) u = "https://" + u.slice(7);
    return u;
  }

  function driveVariants_(rawUrl) {
    const u = normalizeHttp_(rawUrl);
    const id = extractDriveId_(u);
    if (!id) return [withCacheBust_(u)];

    // Try 3 variants (view / download / thumbnail)
    const v1 = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
    const v2 = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    const v3 = `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1024`;

    return [withCacheBust_(v1), withCacheBust_(v2), withCacheBust_(v3)];
  }

  function withCacheBust_(url) {
    if (!url) return "";
    try {
      const u = new URL(url);
      u.searchParams.set("v", String(Date.now()));
      return u.toString();
    } catch (e) {
      const join = url.includes("?") ? "&" : "?";
      return `${url}${join}v=${Date.now()}`;
    }
  }

  function splitLinks_(cell) {
    if (!cell) return [];
    const t = String(cell).trim();
    if (!t) return [];
    return t
      .split(/[\n,，;；]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function setImgWithFallback_(imgEl, rawUrl, placeholderText) {
    if (!imgEl) return;

    if (!rawUrl) {
      imgEl.removeAttribute("src");
      imgEl.alt = placeholderText || "no image";
      return;
    }

    const variants = driveVariants_(rawUrl);

    // sequential try
    let idx = 0;
    const tryOne = () => {
      if (idx >= variants.length) {
        // give up
        imgEl.removeAttribute("src");
        imgEl.alt = "image failed";
        return;
      }
      const src = variants[idx++];
      imgEl.src = src;
    };

    imgEl.onerror = () => tryOne();
    imgEl.onload = () => {
      // ok
    };

    tryOne();
  }

  /***************
   * Fetch card data
   ***************/
  async function fetchCard_(id) {
    const url = `${CFG.GAS_WEBAPP_URL}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    // sometimes GAS returns HTML on error; try JSON parse safely
    try {
      const obj = JSON.parse(text);
      return obj;
    } catch (e) {
      return { ok: false, error: "Invalid JSON", raw: text };
    }
  }

  function pickFirst_(obj, keys) {
    for (const k of keys) {
      const v = obj && obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }

  function buildSubText_(row) {
    const unit = pickFirst_(row, ["單位", "unit"]);
    const title = pickFirst_(row, ["頭銜", "title"]);
    const slogan = pickFirst_(row, ["理念標語", "slogan"]);
    const lines = [];
    if (unit) lines.push(unit);
    if (title) lines.push(title);
    if (slogan) lines.push(slogan);
    return lines.join("\n");
  }

  function pickAvatarUrl_(row) {
    // priority: 個人照_fast -> 個人照 -> avatar
    return (
      pickFirst_(row, ["個人照_fast"]) ||
      pickFirst_(row, ["個人照"]) ||
      pickFirst_(row, ["avatar"]) ||
      pickFirst_(row, ["avatar_img"])
    );
  }

  function pickPhotos_(row) {
    // prefer photos (array) -> 照片_fast (csv) -> 照片 (csv)
    if (row && Array.isArray(row.photos) && row.photos.length) {
      return row.photos.slice(0, CFG.MAX_PHOTOS);
    }
    const fast = pickFirst_(row, ["照片_fast"]);
    if (fast) return splitLinks_(fast).slice(0, CFG.MAX_PHOTOS);

    const raw = pickFirst_(row, ["照片"]);
    if (raw) return splitLinks_(raw).slice(0, CFG.MAX_PHOTOS);

    return [];
  }

  /***************
   * Render
   ***************/
  async function render_() {
    const id = getQueryParam_("id") || CFG.DEFAULT_ID;

    // build URLs
    const cardUrl = buildCardUrl_(id);
    const ogUrl = buildOgUrl_();

    // show link box first
    elCardUrlBox.textContent = cardUrl;

    // wire buttons
    btnBack?.addEventListener("click", () => (location.href = cardUrl));
    btnOpenCard?.addEventListener("click", () => window.open(cardUrl, "_blank", "noopener"));
    btnCopyCard?.addEventListener("click", () => copyText_(cardUrl));
    btnCopyOg?.addEventListener("click", () => copyText_(ogUrl));

    // load data
    const row = await fetchCard_(id);

    // if your Code.gs returns {ok:false,...}
    if (row && row.ok === false) {
      elName.textContent = "找不到資料";
      elSub.textContent = row.error ? String(row.error) : "error";
      // still keep link box
      return;
    }

    const name = pickFirst_(row, ["姓名", "name"]) || id;
    elName.textContent = name;

    elSub.textContent = buildSubText_(row);

    // avatar
    const avatarUrl = pickAvatarUrl_(row);
    await setImgWithFallback_(elAva, avatarUrl, "avatar");

    // (optional) if you later want to show gallery preview on share page:
    // const photos = pickPhotos_(row);
    // console.log("photos:", photos);

    // Replace linkbox with selectable content
    elCardUrlBox.innerHTML = `名片連結：<br><strong>${escapeHtml_(cardUrl)}</strong>`;
  }

  function escapeHtml_(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // boot
  document.addEventListener("DOMContentLoaded", render_);
})();