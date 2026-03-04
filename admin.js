/* ==========================================
 * HSC Admin Workspace — admin.js v514.3 (COMPLETE OVERWRITE)
 * Focus:
 * 1) ✅ Admin 一鍵載入：用 admin_secret 取得資料；若回 token 則自動回填與記憶
 * 2) ✅ 相容多版 GAS：依序嘗試 action=card / adminCard / adminGet / adminRead
 * 3) ✅ 只用 GET（避免 CORS preflight）
 * 4) ✅ 不綁死 DOM：有就綁，沒有就跳過（避免 HTML 改版就壞）
 * 5) ✅ 圖片預覽欄位權威順序：*_url → *_img → *_img_fast
 * ========================================== */

(() => {
  "use strict";

  /* ---------- Config ---------- */
  const VERSION = "514.3";
  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const STORAGE = {
    ADMIN_SECRET: "HSC_ADMIN_SECRET",
    TOKEN_MAP: "HSC_TOKEN_MAP", // { [id]: token }
    LAST_ID: "HSC_ADMIN_LAST_ID"
  };

  const CONFIG = {
    GAS: DEFAULT_GAS,
    BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 1
  };

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const qs = (() => {
    const u = new URL(location.href);
    return {
      id: (u.searchParams.get("id") || "").trim(),
      token: (u.searchParams.get("token") || "").trim()
    };
  })();

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function nowISO() { return new Date().toISOString(); }

  const logs = [];
  function log(...args) {
    const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logs.push(`[${nowISO()}] ${msg}`);
    console.log("[HSC ADMIN]", ...args);
  }

  function safeText(v) {
    return (v === undefined || v === null) ? "" : String(v);
  }

  async function copyText(text) {
    const t = String(text || "");
    try {
      await navigator.clipboard.writeText(t);
      toast(`已複製 ✅`);
      return true;
    } catch (_e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast(`已複製 ✅`);
        return true;
      } catch (_e2) {
        alert("複製失敗，請手動複製：\n" + t);
        return false;
      }
    }
  }

  function toast(msg) {
    const pill = $("pillMsg") || $("statusText") || $("status");
    if (pill) pill.textContent = msg;
  }

  function setValueIf(el, v) {
    if (!el) return;
    if ("value" in el) el.value = safeText(v);
    else el.textContent = safeText(v);
  }

  function getValue(el) {
    if (!el) return "";
    if ("value" in el) return String(el.value || "").trim();
    return String(el.textContent || "").trim();
  }

  function loadTokenMap() {
    try { return JSON.parse(localStorage.getItem(STORAGE.TOKEN_MAP) || "{}") || {}; }
    catch (_e) { return {}; }
  }
  function saveTokenMap(map) {
    localStorage.setItem(STORAGE.TOKEN_MAP, JSON.stringify(map || {}));
  }
  function rememberToken(id, token) {
    const _id = (id || "").trim();
    const _t = (token || "").trim();
    if (!_id || !_t) return;
    const m = loadTokenMap();
    m[_id] = _t;
    saveTokenMap(m);
  }
  function recallToken(id) {
    const _id = (id || "").trim();
    if (!_id) return "";
    const m = loadTokenMap();
    return (m[_id] || "").trim();
  }

  function buildUrl(params) {
    const u = new URL(CONFIG.GAS);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (!s) return;
      u.searchParams.set(k, s);
    });
    return u.toString();
  }

  async function fetchJsonGET(params) {
    const url = buildUrl(params);
    log("GET", url);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: ctrl.signal
      });
      const txt = await res.text();
      let json;
      try { json = JSON.parse(txt); }
      catch (_e) { throw new Error("GAS JSON parse fail: " + txt.slice(0, 220)); }
      if (!json || json.ok !== true) {
        throw new Error((json && json.error) ? json.error : "GAS error");
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchJsonWithRetry(params) {
    let lastErr;
    for (let i = 0; i <= CONFIG.RETRY; i++) {
      try { return await fetchJsonGET(params); }
      catch (e) {
        lastErr = e;
        log("ERR", e && e.message ? e.message : String(e));
        if (i < CONFIG.RETRY) await sleep(350);
      }
    }
    throw lastErr;
  }

  /* ---------- DOM mapping (soft) ---------- */
  const dom = {
    idInput: $("cardId") || $("id") || $("cardIdInput") || $("idInput"),
    tokenInput: $("token") || $("cardToken") || $("tokenInput"),
    adminSecretInput: $("admin_secret") || $("ADMIN_SECRET") || $("adminSecret") || $("adminSecretInput"),

    btnLoad: $("btnLoad") || $("loadBtn") || $("loadDataBtn") || $("btnLoadData"),
    btnRememberToken: $("btnRememberToken") || $("rememberTokenBtn") || $("btnRemember"),
    btnCopyCard: $("btnCopyCard") || $("copyCardBtn") || $("copyProductBtn"),
    btnCopyShare: $("btnCopyShare") || $("copyShareBtn"),
    btnCopyDelivery: $("btnCopyDelivery") || $("copyDeliveryBtn"),
    btnCopyWechat: $("btnCopyWechat") || $("copyWechatBtn"),
    btnDebug: $("btnDebug") || $("openDebug") || $("debugBtn"),

    btnConfirm: $("btnConfirm") || $("confirmBtn"),
    btnActivate: $("btnActivate") || $("activateBtn"),

    // optional preview
    pvName: $("pvName") || $("nameText") || $("previewName"),
    pvUnit: $("pvUnit") || $("unitText") || $("previewUnit"),
    pvTitle: $("pvTitle") || $("titleText") || $("previewTitle"),
    pvSlogan: $("pvSlogan") || $("sloganText") || $("previewSlogan"),
    pvAvatar: $("pvAvatar") || $("avatarImg") || $("previewAvatar")
  };

  function setVersionLabel() {
    const v = $("versionText") || $("ver") || $("version");
    if (v) v.textContent = VERSION;
  }

  /* ---------- GAS action adapters ---------- */
  async function adminReadCard({ id, admin_secret }) {
    const tries = [
      { action: "card", id, admin_secret },       // 多數新版：card + admin_secret
      { action: "adminCard", id, admin_secret },  // 兼容
      { action: "adminGet", id, admin_secret },   // 兼容
      { action: "adminRead", id, admin_secret }   // 兼容
    ];

    let lastErr = null;
    for (const t of tries) {
      try { return await fetchJsonWithRetry(t); }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("admin read failed");
  }

  async function tokenReadCard({ id, token }) {
    const tries = [{ action: "card", id, token }];
    let lastErr = null;
    for (const t of tries) {
      try { return await fetchJsonWithRetry(t); }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("token read failed");
  }

  async function confirmCard({ id, admin_secret }) {
    const tries = [
      { action: "confirm", id, admin_secret },
      { action: "adminConfirm", id, admin_secret }
    ];
    let lastErr = null;
    for (const t of tries) {
      try { return await fetchJsonWithRetry(t); }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("confirm failed");
  }

  async function activateCard({ id, admin_secret }) {
    const tries = [
      { action: "adminSetStatus", id, status: "active", admin_secret },
      { action: "activate", id, admin_secret }
    ];
    let lastErr = null;
    for (const t of tries) {
      try { return await fetchJsonWithRetry(t); }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("activate failed");
  }

  /* ---------- Links ---------- */
  function buildLinks(id) {
    const _id = (id || "").trim();
    return {
      card: `${CONFIG.BASE_URL}index.html?id=${encodeURIComponent(_id)}`,
      share: `${CONFIG.BASE_URL}share.html?id=${encodeURIComponent(_id)}`,
      delivery: `${CONFIG.BASE_URL}delivery.html?id=${encodeURIComponent(_id)}`, // 你要的「交付連結卡」之後做這頁
      wechat: `${CONFIG.BASE_URL}wechat.html?id=${encodeURIComponent(_id)}`
    };
  }

  /* ---------- Render ---------- */
  function pickImgUrl(item, baseKey) {
    // 權威順序：*_url → *_img → *_img_fast
    const u = (item && item[`${baseKey}_url`]) ? String(item[`${baseKey}_url`]).trim() : "";
    if (u) return u;

    const img = (item && item[`${baseKey}_img`]) ? String(item[`${baseKey}_img`]).trim() : "";
    if (img) return img;

    const fast = (item && item[`${baseKey}_img_fast`]) ? String(item[`${baseKey}_img_fast`]).trim() : "";
    if (fast) return fast;

    return "";
  }

  function renderCard(item) {
    if (!item) return;

    setValueIf(dom.pvName, item.name || "");
    setValueIf(dom.pvUnit, item.unit || "");
    setValueIf(dom.pvTitle, item.title || "");
    setValueIf(dom.pvSlogan, item.slogan || "");

    // avatar preview
    const av = pickImgUrl(item, "avatar");
    if (dom.pvAvatar && av) {
      try { dom.pvAvatar.src = av; } catch (_e) {}
    }

    // 若你頁面還有更多欄位要填（方案、到期、狀態…）
    // 等你貼 admin.html，我再做「完整欄位映射」。
  }

  /* ---------- Debug ---------- */
  function showDebug() {
    const id = (getValue(dom.idInput) || "-");
    const token = (getValue(dom.tokenInput) || "-");
    const admin_secret = (getValue(dom.adminSecretInput) || "-");
    const m = loadTokenMap();
    const memTok = recallToken(id);

    const text = [
      `HSC Admin v${VERSION}`,
      `GAS=${CONFIG.GAS}`,
      `BASE=${CONFIG.BASE_URL}`,
      "",
      `id=${id}`,
      `token(input)=${token ? token.slice(0, 10) + (token.length > 10 ? "..." : "") : "-"}`,
      `token(mem)=${memTok ? memTok.slice(0, 10) + "..." : "-"}`,
      `admin_secret=${admin_secret ? "yes" : "no"}`,
      "",
      `token_map_keys=${Object.keys(m).length}`,
      "",
      "Logs (last 80):",
      ...logs.slice(-80)
    ].join("\n");

    alert(text);
  }

  /* ---------- Actions ---------- */
  async function onLoad() {
    const id = (getValue(dom.idInput) || "").trim();
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    const tokenInput = (getValue(dom.tokenInput) || "").trim();

    if (!id) {
      alert("請先輸入/選取卡片 ID（例如 TW0007）");
      return;
    }

    localStorage.setItem(STORAGE.LAST_ID, id);

    // 如果沒填 token，先用記憶 token 補上
    if (!tokenInput) {
      const mem = recallToken(id);
      if (mem && dom.tokenInput) dom.tokenInput.value = mem;
    }

    try {
      toast("載入中…");
      log("load", { id, hasAdmin: !!admin_secret });

      if (admin_secret) {
        const r = await adminReadCard({ id, admin_secret });
        const item = r.item || r.data || r.card || r.result || null;
        if (!item) throw new Error("GAS 回傳格式不含 item/data");

        // ✅ 若回傳 token 就自動回填與記憶
        const gotToken = String(item.token || r.token || "").trim();
        if (gotToken) {
          setValueIf(dom.tokenInput, gotToken);
          rememberToken(id, gotToken);
          toast(`已載入：${id} ✅（token 已回填）`);
        } else {
          // ✅ 沒回 token 也不算錯：代表 GAS 安全設計不回傳
          toast(`已載入：${id} ✅（此版 GAS 不回傳 token）`);
        }

        renderCard(item);
        return;
      }

      // 沒 admin_secret → 用 token 讀
      const token = (getValue(dom.tokenInput) || "").trim();
      if (!token) {
        const mem = recallToken(id);
        if (mem) {
          setValueIf(dom.tokenInput, mem);
          const rr = await tokenReadCard({ id, token: mem });
          const item = rr.item || rr.data || rr.card || rr.result || null;
          if (!item) throw new Error("GAS 回傳格式不含 item/data");
          renderCard(item);
          toast(`已載入：${id} ✅`);
          return;
        }
        throw new Error("此卡尚未啟用（inactive/pending）時需要 token，或請輸入 admin_secret 用管理者載入。");
      }

      const r2 = await tokenReadCard({ id, token });
      const item2 = r2.item || r2.data || r2.card || r2.result || null;
      if (!item2) throw new Error("GAS 回傳格式不含 item/data");

      rememberToken(id, token);
      renderCard(item2);
      toast(`已載入：${id} ✅`);
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      toast("載入失敗 ❌");
      alert("載入失敗：\n" + msg);
      log("load fail", msg);
    }
  }

  function onRememberToken() {
    const id = (getValue(dom.idInput) || "").trim();
    const token = (getValue(dom.tokenInput) || "").trim();
    if (!id) return alert("請先輸入卡片 ID（TWxxxx）");
    if (!token) return alert("請先輸入 token");
    rememberToken(id, token);
    toast("token 已記住 ✅");
  }

  async function onCopy(which) {
    const id = (getValue(dom.idInput) || "").trim();
    if (!id) return alert("請先輸入卡片 ID（TWxxxx）");
    const links = buildLinks(id);
    const text = links[which];
    if (!text) return;
    await copyText(text);
  }

  async function onConfirm() {
    const id = (getValue(dom.idInput) || "").trim();
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    if (!id) return alert("請先輸入卡片 ID（TWxxxx）");
    if (!admin_secret) return alert("confirm 需要 admin_secret");
    if (!confirm(`確認要將 ${id} 設為 confirmed（客戶確認）嗎？`)) return;

    try {
      toast("confirm 中…");
      await confirmCard({ id, admin_secret });
      toast("confirm 完成 ✅");
      await onLoad();
    } catch (e) {
      alert("confirm 失敗：\n" + (e && e.message ? e.message : String(e)));
    }
  }

  async function onActivate() {
    const id = (getValue(dom.idInput) || "").trim();
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    if (!id) return alert("請先輸入卡片 ID（TWxxxx）");
    if (!admin_secret) return alert("activate 需要 admin_secret");
    if (!confirm(`要把 ${id} 啟用為 active 嗎？（啟用後客戶就不需要 token）`)) return;

    try {
      toast("啟用中…");
      await activateCard({ id, admin_secret });
      toast("已啟用 ✅（客戶不需要 token）");
      await onLoad();
    } catch (e) {
      alert("啟用失敗：\n" + (e && e.message ? e.message : String(e)));
    }
  }

  /* ---------- Bind ---------- */
  function bind() {
    setVersionLabel();

    // preload secret
    const savedSecret = localStorage.getItem(STORAGE.ADMIN_SECRET) || "";
    if (dom.adminSecretInput && savedSecret && !getValue(dom.adminSecretInput)) {
      dom.adminSecretInput.value = savedSecret;
    }

    // preload id
    const lastId = localStorage.getItem(STORAGE.LAST_ID) || "";
    if (dom.idInput && !getValue(dom.idInput)) {
      dom.idInput.value = qs.id || lastId || "";
    } else if (dom.idInput && qs.id) {
      dom.idInput.value = qs.id;
    }

    // preload token
    if (dom.tokenInput && !getValue(dom.tokenInput)) {
      dom.tokenInput.value = qs.token || recallToken(getValue(dom.idInput)) || "";
    } else if (dom.tokenInput && qs.token) {
      dom.tokenInput.value = qs.token;
    }

    // save admin_secret when changed
    if (dom.adminSecretInput) {
      dom.adminSecretInput.addEventListener("change", () => {
        const v = getValue(dom.adminSecretInput);
        localStorage.setItem(STORAGE.ADMIN_SECRET, v);
      });
    }

    if (dom.btnLoad) dom.btnLoad.addEventListener("click", onLoad);
    if (dom.btnRememberToken) dom.btnRememberToken.addEventListener("click", onRememberToken);

    if (dom.btnCopyCard) dom.btnCopyCard.addEventListener("click", () => onCopy("card"));
    if (dom.btnCopyShare) dom.btnCopyShare.addEventListener("click", () => onCopy("share"));
    if (dom.btnCopyDelivery) dom.btnCopyDelivery.addEventListener("click", () => onCopy("delivery"));
    if (dom.btnCopyWechat) dom.btnCopyWechat.addEventListener("click", () => onCopy("wechat"));

    if (dom.btnConfirm) dom.btnConfirm.addEventListener("click", onConfirm);
    if (dom.btnActivate) dom.btnActivate.addEventListener("click", onActivate);

    if (dom.btnDebug) dom.btnDebug.addEventListener("click", showDebug);

    // Enter to load
    if (dom.idInput) {
      dom.idInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); onLoad(); }
      });
    }
    if (dom.tokenInput) {
      dom.tokenInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); onLoad(); }
      });
    }

    // auto-load if has id
    const idNow = (getValue(dom.idInput) || "").trim();
    if (idNow) {
      setTimeout(() => onLoad().catch(() => {}), 200);
    }
  }

  bind();
  log("boot ok", { VERSION, GAS: CONFIG.GAS });
})();