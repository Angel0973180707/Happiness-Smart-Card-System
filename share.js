/* =========================================
 * share.js v402 (COMPLETE OVERWRITE)
 * - Auto load card data by id (from URL)
 * - Build card link & OG helper
 * - ✅ Drive image URL auto-normalize (anti-fail)
 * - ✅ referrerPolicy + safe fallbacks
 * ========================================= */

(() => {
  "use strict";

  // ===== Config (fill only if you want override) =====
  const CFG = {
    // 你的名片前台（你已給我）
    CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",

    // 交貨頁自己的 base（通常同站）
    SHARE_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html",

    // 後端 GAS WebApp（如果你要 share 頁自己打 GAS 拿資料，才需要）
    // 若你的 share.html 只是顯示「已由 index.html 產生的內容」，可留空
    GAS_WEBAPP_URL: "", // e.g. "https://script.google.com/macros/s/XXXX/exec"
  };

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);

  const elAva = $("avaImg");
  const elName = $("name");
  const elSub = $("sub");
  const elCardBox = $("cardUrlBox");

  const btnBack = $("btnBack");
  const btnCopyCard = $("btnCopyCard");
  const btnOpenCard = $("btnOpenCard");
  const btnCopyOg = $("btnCopyOg");

  // ===== Helpers =====
  function qs(name) {
    const u = new URL(location.href);
    return (u.searchParams.get(name) || "").trim();
  }

  function safeText(v) {
    return String(v == null ? "" : v).trim();
  }

  function joinLines(...arr) {
    return arr
      .map(safeText)
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  function normalizeHttp(url) {
    let u = safeText(url);
    if (!u) return "";
    if (u.startsWith("http://")) u = "https://" + u.slice(7);
    return u;
  }

  // ✅ 核心：把各種 Drive 分享連結轉成可 <img> 直接顯示的格式
  function toDirectImageUrl(raw) {
    let url = normalizeHttp(raw);
    if (!url) return "";

    // 1) 如果是多連結，取第一個（避免有人亂貼多行）
    url = url.split(/[\n,，;；\s]+/).map(s => s.trim()).filter(Boolean)[0] || "";

    // 2) Drive 常見格式抓 fileId
    // - https://drive.google.com/file/d/<ID>/view?usp=...
    // - https://drive.google.com/open?id=<ID>
    // - https://drive.google.com/uc?export=view&id=<ID>
    // - https://drive.google.com/uc?id=<ID>&export=download
    // - https://drive.google.com/thumbnail?id=<ID>&sz=w1000
    const m1 = url.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/i);
    const m2 = url.match(/drive\.google\.com\/open\?id=([^&?#]+)/i);
    const m3 = url.match(/drive\.google\.com\/uc\?[^#]*id=([^&?#]+)/i);
    const m4 = url.match(/drive\.google\.com\/uc\?id=([^&?#]+)/i);
    const m5 = url.match(/drive\.google\.com\/thumbnail\?[^#]*id=([^&?#]+)/i);
    const m6 = url.match(/[?&]id=([^&?#]+)/i); // 最後保底：網址裡有 id=

    const fileId = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || (m4 && m4[1]) || (m5 && m5[1]) || (m6 && m6[1]) || "";
    if (fileId) {
      // ✅ 最穩的直出圖（公開可讀時）
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
    }

    // 3) Dropbox 圖
    if (url.includes("dropbox.com")) {
      url = url.replace("dl=0", "raw=1");
      if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
      return url;
    }

    // 4) 其他網址就原樣（但確保 https）
    return url;
  }

  function setImgSafe(imgEl, rawUrl) {
    const u = toDirectImageUrl(rawUrl);
    if (!imgEl) return;

    imgEl.referrerPolicy = "no-referrer";
    imgEl.loading = "lazy";
    imgEl.decoding = "async";

    if (!u) {
      // 沒圖就清空（保持你現在的白圓）
      imgEl.removeAttribute("src");
      return;
    }

    // 加防快取 ts，避免手機快取舊的 403/redirect
    const withTs = u + (u.includes("?") ? "&" : "?") + "ts=" + Date.now();
    imgEl.src = withTs;

    // 失敗就再試一次（去掉 ts 或換一種 export=download 保底）
    imgEl.onerror = () => {
      imgEl.onerror = null;
      const alt = u.includes("drive.google.com/uc?")
        ? u.replace("export=view", "export=download")
        : u;
      imgEl.src = alt;
    };
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error("Invalid JSON: " + txt.slice(0, 120));
    }
  }

  function buildCardUrl(id) {
    const base = CFG.CARD_BASE_URL.replace(/\/+$/, "") + "/";
    return base + `?id=${encodeURIComponent(id)}`;
  }

  function buildShareUrl(id) {
    const base = CFG.SHARE_BASE_URL.replace(/\/+$/, "");
    return base + `?id=${encodeURIComponent(id)}`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("已複製 ✅");
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        toast("已複製 ✅");
      } catch {
        toast("複製失敗，請長按手動複製");
      }
      document.body.removeChild(ta);
    }
  }

  function toast(msg) {
    // 極簡 toast
    const d = document.createElement("div");
    d.textContent = msg;
    d.style.position = "fixed";
    d.style.left = "50%";
    d.style.bottom = "18px";
    d.style.transform = "translateX(-50%)";
    d.style.padding = "10px 12px";
    d.style.borderRadius = "12px";
    d.style.background = "rgba(0,0,0,0.75)";
    d.style.color = "rgba(255,255,255,0.95)";
    d.style.fontSize = "13px";
    d.style.zIndex = "9999";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }

  // ===== Main =====
  async function boot() {
    const id = qs("id");
    if (!id) {
      elName && (elName.textContent = "缺少 id");
      elCardBox && (elCardBox.textContent = "請用 ?id=TW0001 開啟");
      return;
    }

    const cardUrl = buildCardUrl(id);
    elCardBox && (elCardBox.textContent = cardUrl);

    // buttons
    btnBack && btnBack.addEventListener("click", () => location.href = cardUrl);
    btnOpenCard && btnOpenCard.addEventListener("click", () => window.open(cardUrl, "_blank"));
    btnCopyCard && btnCopyCard.addEventListener("click", () => copyText(cardUrl));

    // OG 圖：你現在是固定 og-card.png（同站）
    btnCopyOg && btnCopyOg.addEventListener("click", async () => {
      const ogUrl = new URL("og-card.png", location.href).toString();
      await copyText(ogUrl);
    });

    // 如果你有 GAS，就直接讀資料，把頭像/姓名/副標補滿
    if (CFG.GAS_WEBAPP_URL) {
      try {
        const api = CFG.GAS_WEBAPP_URL.replace(/\/+$/, "");
        const url = `${api}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
        const data = await fetchJson(url);

        // 後端如果回 ok:false
        if (data && data.ok === false) throw new Error(data.error || "Load failed");

        // 兼容欄位
        const name = safeText(data["姓名"] || data.name || data.u_name || data["u-name"]);
        const unit = safeText(data["單位"] || data.unit || data.u_unit || data["u-unit"]);
        const title = safeText(data["頭銜"] || data.title || data.u_title || data["u-title"]);
        const slogan = safeText(data["理念標語"] || data.slogan || data.tagline);

        // 圖片欄位：個人照 / avatar / 個人照_fast 任何一個
        const avatar =
          safeText(data["個人照_fast"]) ||
          safeText(data["個人照"]) ||
          safeText(data.avatar_img) ||
          safeText(data.avatar) ||
          safeText(data.photo) ||
          "";

        elName && (elName.textContent = name || id);
        elSub && (elSub.textContent = joinLines(unit, title, slogan));
        setImgSafe(elAva, avatar);
      } catch (e) {
        // 讀不到資料也沒關係：至少連結能交貨
        elSub && (elSub.textContent = "（資料載入失敗：仍可交付連結）");
        setImgSafe(elAva, ""); // 留白
      }
    } else {
      // 沒有 GAS：至少讓 name 顯示 id（或你也可用 localStorage 再補）
      elName && (elName.textContent = id);
      elSub && (elSub.textContent = "");
      setImgSafe(elAva, ""); // 留白
    }
  }

  boot();
})();