/* ================================
 * share.js (v402 COMPLETE OVERWRITE)
 * - Delivery card page: share.html?id=TW0001
 * - Robust fetch from GAS
 * - Robust avatar/logo image url normalization
 * - Auto fallback when <img> fails to load
 * ================================ */

(() => {
  "use strict";

  // ✅ 你提供的網址
  const CONFIG = {
    VERSION: "v402",
    GAS_WEBAPP_URL:
      "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    SHARE_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html",
    OG_IMAGE_PATH: "og-card.png", // repo root 的 og-card.png
    FETCH_TIMEOUT_MS: 12000,
  };

  const $ = (id) => document.getElementById(id);

  function getQueryParam(name) {
    const u = new URL(location.href);
    return (u.searchParams.get(name) || "").trim();
  }

  function firstLink(text) {
    if (text == null) return "";
    const t = String(text).trim();
    if (!t) return "";
    // 可能是一格多連結：逗號/分號/換行
    const parts = t.split(/[\n,，;；]+/).map((x) => x.trim()).filter(Boolean);
    return parts[0] || "";
  }

  function extractDriveFileId(rawUrl) {
    if (!rawUrl) return "";
    const url = String(rawUrl).trim();
    if (!url) return "";

    // /file/d/ID/
    let m = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
    if (m && m[1]) return m[1];

    // ?id=ID
    m = url.match(/[?&]id=([^&]+)/i);
    if (m && m[1]) return m[1];

    // thumbnail?id=ID
    m = url.match(/thumbnail\?id=([^&]+)/i);
    if (m && m[1]) return m[1];

    // googleusercontent uc?id=
    m = url.match(/googleusercontent\.com\/.*[?&]id=([^&]+)/i);
    if (m && m[1]) return m[1];

    // lh3 googleusercontent /d/ID
    m = url.match(/googleusercontent\.com\/d\/([^\/\?]+)/i);
    if (m && m[1]) return m[1];

    return "";
  }

  /**
   * 將各種可能的 Drive/Dropbox/一般網址，轉成「可直連圖片」候選清單
   * 會回傳多個 candidates，給 <img> 失敗時輪流試
   */
  function buildImageCandidates(raw) {
    const out = [];
    let url = firstLink(raw);
    if (!url) return out;

    // normalize http -> https
    if (url.startsWith("http://")) url = "https://" + url.slice(7);

    // dropbox
    if (url.includes("dropbox.com")) {
      let u = url.replace("dl=0", "raw=1");
      if (!u.includes("raw=1")) u += (u.includes("?") ? "&" : "?") + "raw=1";
      out.push(u);
      return uniq(out);
    }

    // Already looks direct (jpg/png/webp/gif etc.)
    if (/\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(url)) {
      out.push(url);
    }

    // Drive variants
    const fileId = extractDriveFileId(url);
    if (fileId) {
      // 常見可用（有時 view 會被擋，download 更穩）
      out.push(`https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`);
      out.push(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`);
      out.push(`https://drive.googleusercontent.com/uc?id=${encodeURIComponent(fileId)}&export=view`);
      // 近年最穩的直連之一
      out.push(`https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`);

      // 你原本可能已經是 uc?export=view，仍然把 download 也加進來
      if (url.includes("drive.google.com/uc?") && url.includes("export=view")) {
        out.push(url.replace("export=view", "export=download"));
      }
      if (url.includes("drive.google.com/uc?") && url.includes("export=download")) {
        out.push(url.replace("export=download", "export=view"));
      }
    } else {
      // 非 Drive：就把原網址也加進候選
      out.push(url);
    }

    return uniq(out).filter(Boolean);
  }

  function uniq(arr) {
    const s = new Set();
    const out = [];
    for (const x of arr) {
      const k = String(x || "").trim();
      if (!k) continue;
      if (s.has(k)) continue;
      s.add(k);
      out.push(k);
    }
    return out;
  }

  function timeoutPromise(ms) {
    return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
  }

  async function fetchJson(url) {
    const res = await Promise.race([fetch(url, { cache: "no-store" }), timeoutPromise(CONFIG.FETCH_TIMEOUT_MS)]);
    const text = await res.text();

    // 有時 GAS 失敗會回 HTML
    if (!text || text.trim().startsWith("<")) throw new Error("GAS returned non-JSON");

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("JSON parse failed");
    }
    return data;
  }

  async function setImgWithFallback(imgEl, candidates) {
    const list = (candidates || []).slice(0, 8);
    if (!list.length) {
      imgEl.removeAttribute("src");
      imgEl.alt = "no image";
      return false;
    }

    for (const src of list) {
      const ok = await new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), 6000);
        imgEl.onload = () => {
          clearTimeout(t);
          resolve(true);
        };
        imgEl.onerror = () => {
          clearTimeout(t);
          resolve(false);
        };
        imgEl.src = src;
      });
      if (ok) return true;
    }
    return false;
  }

  function pickField(row, keys) {
    for (const k of keys) {
      if (row && row[k] != null && String(row[k]).trim() !== "") return row[k];
    }
    return "";
  }

  function buildCardUrl(id) {
    // CARD_BASE_URL 可能是資料夾結尾 /
    const base = CONFIG.CARD_BASE_URL.endsWith("/") ? CONFIG.CARD_BASE_URL : CONFIG.CARD_BASE_URL + "/";
    return `${base}?id=${encodeURIComponent(id)}`;
  }

  function absOgUrl() {
    const base = CONFIG.CARD_BASE_URL.endsWith("/") ? CONFIG.CARD_BASE_URL : CONFIG.CARD_BASE_URL + "/";
    return base + CONFIG.OG_IMAGE_PATH;
  }

  async function copyText(text) {
    const t = String(text || "");
    if (!t) return false;
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        document.body.removeChild(ta);
        return false;
      }
    }
  }

  async function boot() {
    const id = getQueryParam("id");
    const nameEl = $("name");
    const subEl = $("sub");
    const avaEl = $("avaImg");
    const cardUrlBox = $("cardUrlBox");

    if (!id) {
      nameEl.textContent = "缺少 id";
      subEl.textContent = "請用 share.html?id=TW0001";
      cardUrlBox.textContent = "—";
      return;
    }

    const cardUrl = buildCardUrl(id);
    cardUrlBox.textContent = cardUrl;

    // buttons
    $("btnBack")?.addEventListener("click", () => location.href = cardUrl);
    $("btnOpenCard")?.addEventListener("click", () => window.open(cardUrl, "_blank"));
    $("btnCopyCard")?.addEventListener("click", async () => {
      const ok = await copyText(cardUrl);
      $("btnCopyCard").innerHTML = ok ? '<i class="fa-solid fa-check"></i> 已複製' : '<i class="fa-solid fa-triangle-exclamation"></i> 失敗';
      setTimeout(() => ($("btnCopyCard").innerHTML = '<i class="fa-solid fa-link"></i> 複製連結'), 1200);
    });

    $("btnCopyOg")?.addEventListener("click", async () => {
      const og = absOgUrl();
      const ok = await copyText(og);
      $("btnCopyOg").innerHTML = ok ? '<i class="fa-solid fa-check"></i> 已複製' : '<i class="fa-solid fa-triangle-exclamation"></i> 失敗';
      setTimeout(() => ($("btnCopyOg").innerHTML = '<i class="fa-solid fa-image"></i> OG 圖'), 1200);
    });

    // fetch row
    nameEl.textContent = "載入中…";
    subEl.textContent = "";

    try {
      const api = `${CONFIG.GAS_WEBAPP_URL}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
      const row = await fetchJson(api);

      // name
      const name = pickField(row, ["姓名", "name", "Name", "u_name"]) || id;
      nameEl.textContent = String(name).trim();

      // sub: unit/title/slogan
      const unit = pickField(row, ["單位", "unit", "u_unit"]);
      const title = pickField(row, ["頭銜", "title", "u_title"]);
      const slogan = pickField(row, ["理念標語", "slogan", "tagline"]);
      const lines = [unit, title, slogan].map((x) => String(x || "").trim()).filter(Boolean);
      subEl.textContent = lines.join("\n");

      // avatar candidates (最常失敗的地方：這裡加超多容錯)
      const avatarRaw = pickField(row, ["個人照_fast", "個人照", "avatar_fast", "avatar", "avatar_img", "avatar_url"]);
      const candidates = buildImageCandidates(avatarRaw);

      // 如果還是空，試試 logo 當備援
      if (!candidates.length) {
        const logoRaw = pickField(row, ["Logo_fast", "Logo", "logo_fast", "logo", "logo_img", "logo_url"]);
        candidates.push(...buildImageCandidates(logoRaw));
      }

      await setImgWithFallback(avaEl, candidates);

    } catch (e) {
      nameEl.textContent = "載入失敗";
      subEl.textContent = "請確認 GAS / 試算表 id 是否存在";
      // 仍顯示交貨連結
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();