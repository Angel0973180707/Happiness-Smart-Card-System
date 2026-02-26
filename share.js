/* ================================
 * share.js (v402 COMPLETE OVERWRITE)
 * - 交貨卡頁：讀取 ?id=TW0001
 * - 向 GAS 取卡：?action=card&id=...
 * - 顯示：個人照 / 姓名 / 單位+頭銜
 * - 產出：名片連結（前台）
 * - 按鈕：返回名片 / 複製連結 / 打開 / 複製 OG 圖網址
 * - Robust：容錯 key（含中文表頭、_fast 優先）
 * ================================ */

(() => {
  "use strict";

  /* ====== 你目前的 GAS WebApp ====== */
  const CFG = {
    GAS_WEBAPP_URL:
      "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

    // 名片前台（用來組名片連結）
    CARD_BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",

    // Share 交貨頁（通常同專案根目錄 share.html）
    SHARE_BASE_URL:
      "https://angel0973180707.github.io/Happiness-Smart-Card-System/share.html",

    // 預設 OG 圖（放在專案根目錄：/og-card.png）
    OG_IMAGE_NAME: "og-card.png",
  };

  /* ====== DOM ====== */
  const $ = (id) => document.getElementById(id);

  const els = {
    btnBack: $("btnBack"),
    avaImg: $("avaImg"),
    name: $("name"),
    sub: $("sub"),
    cardUrlBox: $("cardUrlBox"),
    btnCopyCard: $("btnCopyCard"),
    btnOpenCard: $("btnOpenCard"),
    btnCopyOg: $("btnCopyOg"),
  };

  /* ====== Utils ====== */
  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch {
      return "";
    }
  }

  function normalizeId(id) {
    const s = String(id || "").trim();
    if (!s) return "";
    // 只做基本清洗，不強制格式（避免你未來改 prefix）
    return s.replace(/\s+/g, "");
  }

  function baseDirUrl() {
    // share.html 所在資料夾（GitHub Pages repo path）
    const u = new URL(location.href);
    u.hash = "";
    u.search = "";
    u.pathname = u.pathname.replace(/\/[^\/]*$/, "/");
    return u.toString();
  }

  function buildCardUrl(id) {
    const base = String(CFG.CARD_BASE_URL || "").trim() || baseDirUrl();
    const u = new URL(base, location.origin);
    u.searchParams.set("id", id);
    return u.toString();
  }

  function buildOgUrl() {
    // 以 share.html 同層的根目錄推導：/og-card.png
    const dir = baseDirUrl();
    return new URL(CFG.OG_IMAGE_NAME, dir).toString();
  }

  async function copyText(text) {
    const t = String(text || "");
    if (!t) return false;

    // modern
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(t);
        toast("已複製 ✅");
        return true;
      }
    } catch {}

    // fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      toast(ok ? "已複製 ✅" : "複製失敗");
      return ok;
    } catch {
      toast("複製失敗");
      return false;
    }
  }

  function toast(msg) {
    // 極簡提示：不改你既有 UI，只用 title 暫存
    try {
      document.title = msg;
      setTimeout(() => {
        document.title = "Angel Card Share v402";
      }, 900);
    } catch {}
  }

  function safeStr(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  function cleanHeaderKey(k) {
    let s = String(k == null ? "" : k);
    s = s.replace(/\u3000/g, " ").trim();
    s = s.replace(/^[\s"“”]+|[\s"“”]+$/g, "").trim();
    return s;
  }

  function normalizeObjectKeys(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const out = {};
    for (const key of Object.keys(obj)) {
      out[cleanHeaderKey(key)] = obj[key];
    }
    return out;
  }

  function pickFirst(obj, keys) {
    for (const k of keys) {
      const v = safeStr(obj[k]);
      if (v) return v;
    }
    return "";
  }

  // 把「照片_fast / 照片」這種逗號或換行拆成第一張
  function firstLinkFromCell(cell) {
    const t = safeStr(cell);
    if (!t) return "";
    const parts = t.split(/[\n,，;；]+/).map((x) => x.trim()).filter(Boolean);
    return parts[0] || "";
  }

  async function fetchJson(url, timeoutMs = 10000) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: ctrl.signal,
      });
      const txt = await res.text();
      try {
        return JSON.parse(txt);
      } catch {
        throw new Error("JSON 解析失敗");
      }
    } finally {
      clearTimeout(to);
    }
  }

  /* ====== Render ====== */
  function setLoading() {
    if (els.name) els.name.textContent = "載入中";
    if (els.sub) els.sub.textContent = "";
    if (els.cardUrlBox) els.cardUrlBox.textContent = "名片連結載入中…";
    if (els.avaImg) els.avaImg.removeAttribute("src");
  }

  function setError(msg) {
    if (els.name) els.name.textContent = "載入失敗";
    if (els.sub) els.sub.textContent = safeStr(msg) || "請確認 id / GAS";
    if (els.cardUrlBox) els.cardUrlBox.textContent = "—";
  }

  function renderCard(id, raw) {
    const data = normalizeObjectKeys(raw || {});
    const name = pickFirst(data, ["姓名", "name", "Name"]);
    const unit = pickFirst(data, ["單位", "unit"]);
    const title = pickFirst(data, ["頭銜", "title"]);
    const slogan = pickFirst(data, ["理念標語", "slogan"]);

    // avatar：*_fast 優先，其次 個人照
    const avatar = pickFirst(data, ["個人照_fast", "avatar_fast", "個人照", "avatar"]);
    const avatarUrl = avatar || "";

    // 如果有人把圖片塞進 cell 多連結，抓第一個
    const avatarFinal = firstLinkFromCell(avatarUrl);

    // 顯示文字
    if (els.name) els.name.textContent = name || id || "（未填姓名）";

    const subLines = [];
    if (unit) subLines.push(unit);
    if (title) subLines.push(title);
    if (slogan) subLines.push(slogan);
    if (els.sub) els.sub.textContent = subLines.join("\n");

    // 頭像
    if (els.avaImg) {
      if (avatarFinal) {
        els.avaImg.src = avatarFinal;
      } else {
        // 沒頭像就給透明佔位，不報錯
        els.avaImg.removeAttribute("src");
      }
    }

    // 名片連結
    const cardUrl = buildCardUrl(id);
    if (els.cardUrlBox) {
      els.cardUrlBox.textContent = cardUrl;
    }

    // 事件
    if (els.btnBack) {
      els.btnBack.onclick = () => {
        location.href = cardUrl;
      };
    }

    if (els.btnCopyCard) {
      els.btnCopyCard.onclick = () => copyText(cardUrl);
    }

    if (els.btnOpenCard) {
      els.btnOpenCard.onclick = () => window.open(cardUrl, "_blank", "noopener,noreferrer");
    }

    if (els.btnCopyOg) {
      // OG 圖網址（建議你 share.html meta og:image 也改成絕對路徑）
      const ogUrl = buildOgUrl();
      els.btnCopyOg.onclick = () => copyText(ogUrl);
    }
  }

  /* ====== Boot ====== */
  async function boot() {
    setLoading();

    const id = normalizeId(qs("id"));
    if (!id) {
      setError("缺少 ?id=TW0001");
      return;
    }

    // 支援：網址帶 ?gas=... 覆蓋（必要時用）
    const gasOverride = safeStr(qs("gas"));
    const gasUrl = gasOverride || CFG.GAS_WEBAPP_URL;

    if (!gasUrl) {
      setError("CFG.GAS_WEBAPP_URL 未設定");
      return;
    }

    const api = `${gasUrl}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;

    try {
      const payload = await fetchJson(api, 12000);

      // 兼容：有些版本會回 {ok:false,...}
      if (payload && typeof payload === "object" && payload.ok === false) {
        setError(payload.error || "Not found");
        return;
      }

      renderCard(id, payload);
    } catch (err) {
      setError(String(err && err.message ? err.message : err));
    }
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();