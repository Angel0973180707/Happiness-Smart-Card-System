/* ================================
 * share.js (v402 COMPLETE OVERWRITE)
 * - Robust load card by ?id=TW0001
 * - Build card url + share url
 * - Robust avatar picking + URL normalization
 * - Buttons: back / copy link / open / copy OG
 * ================================ */

(function () {
  "use strict";

  // ✅ 你已提供的前台網址
  const CFG = {
    CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    SHARE_PAGE: "share.html",
    OG_IMAGE: "og-card.png",

    // ✅ 你的 GAS WebApp（你已提供）
    GAS_WEBAPP_URL:
      "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

    DEFAULT_ID: "TW0001",
    TIMEOUT_MS: 9000,
  };

  // ---------- DOM
  const $ = (id) => document.getElementById(id);

  const elAva = $("avaImg");
  const elName = $("name");
  const elSub = $("sub");
  const elCardBox = $("cardUrlBox");

  const btnBack = $("btnBack");
  const btnCopyCard = $("btnCopyCard");
  const btnOpenCard = $("btnOpenCard");
  const btnCopyOg = $("btnCopyOg");

  // ---------- Helpers
  function qs(name) {
    try {
      return new URL(location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  function joinUrl(base, path) {
    const b = String(base || "").trim();
    const p = String(path || "").trim();
    if (!b) return p;
    if (!p) return b;
    return b.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, "");
  }

  function safeText(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  function normalizeHttp(url) {
    let u = safeText(url);
    if (!u) return "";
    if (u.startsWith("http://")) u = "https://" + u.slice(7);
    return u;
  }

  // 把常見 Drive 連結轉成可直接顯示圖片的形式
  function normalizeImageUrl(raw) {
    let url = normalizeHttp(raw);
    if (!url) return "";

    // drive file/d/ID
    let m = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;

    // open?id=ID
    m = url.match(/[?&]id=([^&]+)/i);
    if (m && m[1] && url.includes("drive.google.com")) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;
    }

    // uc?id=ID
    m = url.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;

    // thumbnail?id=ID
    m = url.match(/thumbnail\?id=([^&]+)/i);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;

    // dropbox dl=0 -> raw=1
    if (url.includes("dropbox.com")) {
      url = url.replace("dl=0", "raw=1");
      if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
      return url;
    }

    return url;
  }

  function pickFirstNonEmpty(...vals) {
    for (const v of vals) {
      const s = safeText(v);
      if (s) return s;
    }
    return "";
  }

  function pickAvatarFromRow(row) {
    if (!row || typeof row !== "object") return "";

    // 1) 直接欄位（中英＋常見變體）
    let avatar =
      pickFirstNonEmpty(
        row["個人照_fast"],
        row["個人照"],
        row["avatar_fast"],
        row["avatar_img"],
        row["avatar_url"],
        row["avatar"],
        row["avatarImg"],
        row["avatarUrl"],
        row["photo"],
        row["photo_url"]
      ) || "";

    // 2) 若沒抓到，退一步用相簿第一張
    const photosFull = Array.isArray(row.photos_full) ? row.photos_full : [];
    const photosFast = Array.isArray(row.photos) ? row.photos : [];

    if (!avatar) avatar = safeText(photosFull[0] || photosFast[0] || "");

    // 3) 有時 cell 會是「多連結」逗號/換行
    if (avatar && /[\n,，;；]/.test(avatar)) {
      avatar = avatar.split(/[\n,，;；]+/)[0].trim();
    }

    return normalizeImageUrl(avatar);
  }

  function buildSub(row) {
    // 你 share.html 的 sub 是多行顯示
    const unit = safeText(row?.["單位"] || row?.unit || row?.org || "");
    const title = safeText(row?.["頭銜"] || row?.title || "");
    const slogan = safeText(row?.["理念標語"] || row?.slogan || "");
    const lines = [];
    if (unit) lines.push(unit);
    if (title) lines.push(title);
    if (slogan) lines.push(slogan);
    return lines.join("\n");
  }

  async function fetchJsonWithTimeout(url, ms) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      const txt = await res.text();
      try {
        return JSON.parse(txt);
      } catch {
        // 有些 GAS 可能回 HTML 或錯誤頁
        return { ok: false, error: "Non-JSON response", raw: txt?.slice(0, 300) };
      }
    } finally {
      clearTimeout(t);
    }
  }

  async function copyText(text) {
    const t = String(text || "");
    if (!t) return false;

    // clipboard API
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch {}

    // fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  // ---------- Main
  const id = safeText(qs("id")) || CFG.DEFAULT_ID;

  const cardUrl = CFG.CARD_BASE_URL.replace(/\/+$/, "") + "/?id=" + encodeURIComponent(id);
  const shareUrl =
    joinUrl(CFG.CARD_BASE_URL, CFG.SHARE_PAGE) + "?id=" + encodeURIComponent(id);
  const ogUrl = joinUrl(CFG.CARD_BASE_URL, CFG.OG_IMAGE);

  elCardBox.textContent = cardUrl;

  // buttons
  btnBack?.addEventListener("click", () => {
    location.href = cardUrl;
  });

  btnOpenCard?.addEventListener("click", () => {
    window.open(cardUrl, "_blank");
  });

  btnCopyCard?.addEventListener("click", async () => {
    const ok = await copyText(cardUrl);
    toast_(ok ? "已複製名片連結" : "複製失敗");
  });

  btnCopyOg?.addEventListener("click", async () => {
    const ok = await copyText(ogUrl);
    toast_(ok ? "已複製 OG 圖網址" : "複製失敗");
  });

  // load row
  (async () => {
    elName.textContent = "載入中…";
    elSub.textContent = "";

    const api = `${CFG.GAS_WEBAPP_URL}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
    const data = await fetchJsonWithTimeout(api, CFG.TIMEOUT_MS);

    // 你的 GAS 回傳有時是 row object（不是 {ok:true,data:...}）
    const row = (data && typeof data === "object" && data.ok === false) ? null : data;

    if (!row) {
      elName.textContent = "找不到資料";
      elSub.textContent = safeText(data?.error || "請檢查 id 或 GAS");
      console.warn("[share v402] load failed:", data);
      return;
    }

    // name
    const name = pickFirstNonEmpty(row["姓名"], row.name, row.fullname, row["Name"]);
    elName.textContent = name || id;

    // sub
    elSub.textContent = buildSub(row);

    // avatar
    const avatarUrl = pickAvatarFromRow(row);
    console.log("[share v402] id =", id);
    console.log("[share v402] api =", api);
    console.log("[share v402] avatarUrl =", avatarUrl);

    if (elAva) {
      // 有些外站會擋 referer
      elAva.referrerPolicy = "no-referrer";
      elAva.loading = "lazy";

      if (avatarUrl) {
        elAva.src = avatarUrl;
        elAva.onerror = () => {
          console.warn("[share v402] avatar load error:", avatarUrl);
          // fallback：不顯示破圖
          elAva.removeAttribute("src");
          elAva.alt = "avatar";
        };
      } else {
        // 沒有圖就不要塞 src（避免破圖 icon）
        elAva.removeAttribute("src");
        elAva.alt = "avatar";
      }
    }

    // 也把 shareUrl 放到 console，方便你檢查
    console.log("[share v402] shareUrl =", shareUrl);
    console.log("[share v402] cardUrl  =", cardUrl);
    console.log("[share v402] ogUrl    =", ogUrl);
  })();

  // ---------- tiny toast (no CSS dependency)
  function toast_(msg) {
    const m = safeText(msg) || "OK";
    const d = document.createElement("div");
    d.textContent = m;
    d.style.position = "fixed";
    d.style.left = "50%";
    d.style.bottom = "18px";
    d.style.transform = "translateX(-50%)";
    d.style.padding = "10px 12px";
    d.style.borderRadius = "12px";
    d.style.background = "rgba(0,0,0,0.65)";
    d.style.color = "rgba(255,255,255,0.92)";
    d.style.fontSize = "12px";
    d.style.fontWeight = "900";
    d.style.zIndex = "9999";
    d.style.border = "1px solid rgba(255,255,255,0.12)";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }
})();