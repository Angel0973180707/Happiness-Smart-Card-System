/* ==========================================
 * Happiness Smart Card System — admin.js v521.2 (COMPLETE OVERWRITE)
 *
 * Goals (v521.2):
 * ✅ 不走山：JS 不綁死特定 HTML 結構（有就綁，沒有就跳過）
 * ✅ 讓「按鈕都不能動」的情況最大機率恢復：使用事件委派 + 捕捉 click/submit
 * ✅ Admin 一鍵載入：用 ADMIN_SECRET 拉資料，並自動把 token 填回去
 * ✅ 相容多版 GAS：依序嘗試 action=adminCard/adminGet/card （GET only）
 * ✅ 只用 GET（避免 CORS preflight）
 * ✅ 內建：狀態切換 active/inactive、複製乾淨成品/OG/WeChat 連結、複製填表連結（若 GAS 提供）
 *
 * Notes:
 * - 你只要在 admin.html 放一個 <script src="./admin.js?v=5212"></script> 就能用
 * - GAS 端若支援：adminCard/adminGet/adminSetStatus/adminExtend/adminExport/adminCreateInvite 等 action，
 *   這支會自動對齊；若沒有，會優雅降級。
 * ========================================== */

(() => {
  "use strict";

  /* ---------- Config ---------- */
  const VERSION = "521.2";

  const DEFAULTS = {
    GAS:
      "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    BASE: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    INDEX: "index.html",
    SHARE: "share.html",
    WECHAT: "wechat.html",
    FETCH_TIMEOUT_MS: 15000,
  };

  // keys used in localStorage
  const LS = {
    gas: "HSC_ADMIN_GAS",
    base: "HSC_ADMIN_BASE",
    adminSecret: "HSC_ADMIN_SECRET",
    exportSecret: "HSC_EXPORT_SECRET",
    lastId: "HSC_ADMIN_LAST_ID",
    lastToken: "HSC_ADMIN_LAST_TOKEN",
    lastTenant: "HSC_ADMIN_LAST_TENANT",
  };

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeText(el, t) {
    if (!el) return;
    el.textContent = t == null ? "" : String(t);
  }
  function safeVal(el, v) {
    if (!el) return;
    el.value = v == null ? "" : String(v);
  }
  function getVal(el) {
    return el ? String(el.value || "").trim() : "";
  }
  function qs(k) {
    return new URLSearchParams(location.search).get(k);
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

  function nowIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes()) +
      ":" +
      pad(d.getSeconds())
    );
  }

  function loadCfg() {
    return {
      GAS: localStorage.getItem(LS.gas) || DEFAULTS.GAS,
      BASE: localStorage.getItem(LS.base) || DEFAULTS.BASE,
      INDEX: DEFAULTS.INDEX,
      SHARE: DEFAULTS.SHARE,
      WECHAT: DEFAULTS.WECHAT,
      FETCH_TIMEOUT_MS: DEFAULTS.FETCH_TIMEOUT_MS,
    };
  }

  function setCfgKV(key, val) {
    if (key === "GAS") localStorage.setItem(LS.gas, val);
    if (key === "BASE") localStorage.setItem(LS.base, val);
  }

  function baseUrl_(cfg) {
    const b = (cfg.BASE || "").trim();
    if (!b) return DEFAULTS.BASE;
    return b.endsWith("/") ? b : b + "/";
  }

  function buildCleanUrl(cfg, id) {
    return baseUrl_(cfg) + cfg.INDEX + "?id=" + encodeURIComponent(id) + "&view=1";
  }
  function buildOgUrl(cfg, id) {
    return baseUrl_(cfg) + cfg.SHARE + "?id=" + encodeURIComponent(id);
  }
  function buildWeChatUrl(cfg, id) {
    return baseUrl_(cfg) + cfg.WECHAT + "?id=" + encodeURIComponent(id);
  }

  async function copyText(t) {
    const s = String(t || "");
    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch (e) {
      const ok = prompt("請手動複製：", s);
      return ok !== null;
    }
  }

  function toast(msg, type = "info") {
    // support common ids: #toast, #hint, #statusText, #log
    const elToast = $("#toast");
    const elHint = $("#hint") || $("#statusText");
    const elLog = $("#log");

    const line = `[${nowIso()}] ${msg}`;
    if (elLog) {
      elLog.value = (elLog.value ? elLog.value + "\n" : "") + line;
      elLog.scrollTop = elLog.scrollHeight;
    }

    if (elHint) safeText(elHint, msg);

    if (elToast) {
      safeText(elToast, msg);
      elToast.classList.add("show");
      elToast.setAttribute("data-type", type);
      clearTimeout(toast._t);
      toast._t = setTimeout(() => elToast.classList.remove("show"), 1800);
    } else {
      // no UI, still log
      console.log("HSC Admin:", msg);
    }
  }

  async function fetchJson(url, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || DEFAULTS.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      const txt = await res.text();
      let j = null;
      try {
        j = JSON.parse(txt);
      } catch (_) {}
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (!j || typeof j !== "object") throw new Error("Invalid JSON");
      return j;
    } finally {
      clearTimeout(t);
    }
  }

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      const v = obj && obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return fallback;
  }

  function statusLower(card) {
    return (pick(card, ["status", "狀態"], "") || "").toLowerCase();
  }

  /* ---------- GAS API wrappers (GET only) ---------- */
  function buildUrl(cfg, params) {
    const u = new URL(cfg.GAS);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === "") return;
      u.searchParams.set(k, String(v));
    });
    u.searchParams.set("ts", String(Date.now()));
    return u.toString();
  }

  async function tryActions(cfg, actionList, paramsBase) {
    let lastErr = null;
    for (const a of actionList) {
      try {
        const url = buildUrl(cfg, { action: a, ...paramsBase });
        const j = await fetchJson(url, cfg.FETCH_TIMEOUT_MS);
        if (j && j.ok) return { ok: true, json: j, action: a, url };
        lastErr = new Error(j && j.error ? j.error : "ok=false");
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("All actions failed");
  }

  async function apiAdminGetCard(cfg, { id, token, admin_secret }) {
    // order: adminCard/adminGet then fallback card
    const attempt = await tryActions(
      cfg,
      ["adminCard", "adminGet", "card"],
      { id, token, admin_secret }
    );
    const j = attempt.json;
    const card = j.item || j.data || j.card || {};
    if (!card || typeof card !== "object") throw new Error("Empty card payload");
    return { action: attempt.action, card, raw: j, url: attempt.url };
  }

  async function apiSetStatus(cfg, { id, status, token, admin_secret }) {
    const attempt = await tryActions(
      cfg,
      ["adminSetStatus", "setStatus", "set_state"],
      { id, status, token, admin_secret }
    );
    return attempt.json;
  }

  async function apiExtend(cfg, { id, days, token, admin_secret }) {
    const attempt = await tryActions(cfg, ["adminExtend", "extend"], {
      id,
      days,
      token,
      admin_secret,
    });
    return attempt.json;
  }

  async function apiExport(cfg, { admin_secret, export_secret, tenant }) {
    const attempt = await tryActions(cfg, ["adminExport", "export"], {
      admin_secret,
      export_secret,
      tenant,
    });
    return attempt.json;
  }

  async function apiCreateInvite(cfg, { tenant, count, admin_secret }) {
    const attempt = await tryActions(cfg, ["adminCreateInvite", "createInvite", "inviteCreate"], {
      tenant,
      count,
      admin_secret,
    });
    return attempt.json;
  }

  /* ---------- UI binding (DOM-agnostic) ---------- */
  function findField(keys) {
    // try by id first
    for (const k of keys) {
      const byId = document.getElementById(k);
      if (byId) return byId;
    }
    // try data-field
    for (const k of keys) {
      const el = document.querySelector(`[data-field="${CSS.escape(k)}"]`);
      if (el) return el;
    }
    // try name
    for (const k of keys) {
      const el = document.querySelector(`[name="${CSS.escape(k)}"]`);
      if (el) return el;
    }
    return null;
  }

  function findButton(keys) {
    for (const k of keys) {
      const byId = document.getElementById(k);
      if (byId) return byId;
    }
    for (const k of keys) {
      const el = document.querySelector(`[data-action="${CSS.escape(k)}"]`);
      if (el) return el;
    }
    return null;
  }

  function applyCardToUI(card) {
    // optional fields in admin UI
    const idEl = findField(["cardId", "id", "inputId"]);
    const tokenEl = findField(["token", "inputToken"]);
    const nameEl = findField(["name", "inputName"]);
    const tenantEl = findField(["tenant", "inputTenant"]);
    const statusEl = findField(["status", "inputStatus"]);

    const id = normalizeId(pick(card, ["id"], ""));
    const token = pick(card, ["token"], "");
    const name = pick(card, ["name", "姓名"], "");
    const tenant = pick(card, ["tenant"], "");
    const status = pick(card, ["status", "狀態"], "");

    if (idEl && !getVal(idEl)) safeVal(idEl, id);
    if (tokenEl) safeVal(tokenEl, token);
    if (nameEl) safeVal(nameEl, name);
    if (tenantEl) safeVal(tenantEl, tenant);
    if (statusEl) safeVal(statusEl, status);

    // preview zones (optional)
    safeText($("#previewName"), name || "—");
    safeText($("#previewTenant"), tenant || "—");
    safeText($("#previewStatus"), status || "—");
    safeText($("#previewId"), id || "—");
  }

  function setLinksToUI(cfg, id) {
    const clean = buildCleanUrl(cfg, id);
    const og = buildOgUrl(cfg, id);
    const wc = buildWeChatUrl(cfg, id);

    const elClean = $("#cleanUrl") || $("#cleanLink");
    const elOg = $("#ogUrl") || $("#ogLink");
    const elWc = $("#wechatUrl") || $("#wechatLink");

    if (elClean) elClean.value ? (elClean.value = clean) : (elClean.href = clean);
    if (elOg) elOg.value ? (elOg.value = og) : (elOg.href = og);
    if (elWc) elWc.value ? (elWc.value = wc) : (elWc.href = wc);

    safeText($("#cleanUrlHint"), clean.replace(cfg.BASE, ""));
    safeText($("#ogUrlHint"), og.replace(cfg.BASE, ""));
    safeText($("#wechatUrlHint"), wc.replace(cfg.BASE, ""));
  }

  /* ---------- Core actions ---------- */
  async function doLoadCard(opts = {}) {
    const cfg = loadCfg();

    const idEl = findField(["cardId", "id", "inputId"]);
    const tokenEl = findField(["token", "inputToken"]);
    const tenantEl = findField(["tenant", "inputTenant"]);

    // read inputs (or fallback to query/local)
    const id =
      normalizeId(
        opts.id ||
          getVal(idEl) ||
          qs("id") ||
          localStorage.getItem(LS.lastId) ||
          "TW0001"
      ) || "TW0001";

    const token =
      opts.token || getVal(tokenEl) || localStorage.getItem(LS.lastToken) || "";

    const adminSecret =
      opts.admin_secret ||
      getVal(findField(["admin_secret", "adminSecret", "ADMIN_SECRET"])) ||
      localStorage.getItem(LS.adminSecret) ||
      "";

    // persist quickly
    localStorage.setItem(LS.lastId, id);
    if (token) localStorage.setItem(LS.lastToken, token);
    if (getVal(tenantEl)) localStorage.setItem(LS.lastTenant, getVal(tenantEl));
    if (adminSecret) localStorage.setItem(LS.adminSecret, adminSecret);

    toast(`讀取中：${id} …`);

    try {
      setCfgKV("GAS", cfg.GAS);
      setCfgKV("BASE", cfg.BASE);

      const { action, card, raw } = await apiAdminGetCard(cfg, {
        id,
        token,
        admin_secret: adminSecret,
      });

      // auto fill token if returned
      const newToken = pick(card, ["token"], "");
      if (newToken && tokenEl) safeVal(tokenEl, newToken);
      if (newToken) localStorage.setItem(LS.lastToken, newToken);

      applyCardToUI(card);
      setLinksToUI(cfg, id);

      // show status badge (optional)
      const st = statusLower(card) || "unknown";
      const badge = $("#badge");
      if (badge) {
        badge.textContent = st;
        badge.classList.toggle("ok", st === "active");
        badge.classList.toggle("warn", st !== "active");
      }

      // fill quick meta
      safeText($("#apiAction"), action || "—");
      safeText($("#apiOk"), raw && raw.ok ? "ok" : "—");

      toast(`讀取成功 ✅ (${action})`);
      return { ok: true, id, card };
    } catch (e) {
      toast(`讀取失敗：${String(e && e.message ? e.message : e)}`, "warn");
      return { ok: false, id, error: e };
    }
  }

  async function doSetStatus(toStatus) {
    const cfg = loadCfg();
    const id = normalizeId(getVal(findField(["cardId", "id", "inputId"])) || localStorage.getItem(LS.lastId) || "");
    if (!id) return toast("缺少 ID", "warn");

    const token = getVal(findField(["token", "inputToken"])) || localStorage.getItem(LS.lastToken) || "";
    const adminSecret = getVal(findField(["admin_secret", "adminSecret", "ADMIN_SECRET"])) || localStorage.getItem(LS.adminSecret) || "";

    toast(`狀態切換中：${id} → ${toStatus} …`);
    try {
      const j = await apiSetStatus(cfg, { id, status: toStatus, token, admin_secret: adminSecret });
      if (!j || !j.ok) throw new Error(j && j.error ? j.error : "ok=false");
      toast(`狀態已更新 ✅ (${toStatus})`);
      await doLoadCard({ id }); // refresh
    } catch (e) {
      toast(`狀態更新失敗：${String(e && e.message ? e.message : e)}`, "warn");
    }
  }

  async function doExtend(days) {
    const cfg = loadCfg();
    const id = normalizeId(getVal(findField(["cardId", "id", "inputId"])) || localStorage.getItem(LS.lastId) || "");
    if (!id) return toast("缺少 ID", "warn");

    const token = getVal(findField(["token", "inputToken"])) || localStorage.getItem(LS.lastToken) || "";
    const adminSecret = getVal(findField(["admin_secret", "adminSecret", "ADMIN_SECRET"])) || localStorage.getItem(LS.adminSecret) || "";

    const d = Number(days || 30);
    toast(`延長中：${id} +${d} 天 …`);
    try {
      const j = await apiExtend(cfg, { id, days: d, token, admin_secret: adminSecret });
      if (!j || !j.ok) throw new Error(j && j.error ? j.error : "ok=false");
      toast(`延長成功 ✅ (+${d} 天)`);
      await doLoadCard({ id });
    } catch (e) {
      toast(`延長失敗：${String(e && e.message ? e.message : e)}`, "warn");
    }
  }

  async function doExport() {
    const cfg = loadCfg();
    const adminSecret = getVal(findField(["admin_secret", "adminSecret", "ADMIN_SECRET"])) || localStorage.getItem(LS.adminSecret) || "";
    const exportSecret = getVal(findField(["export_secret", "exportSecret", "EXPORT_SECRET"])) || localStorage.getItem(LS.exportSecret) || "";
    const tenant = getVal(findField(["tenant", "inputTenant"])) || localStorage.getItem(LS.lastTenant) || "";

    if (!adminSecret) return toast("缺少 ADMIN_SECRET", "warn");

    if (exportSecret) localStorage.setItem(LS.exportSecret, exportSecret);
    if (tenant) localStorage.setItem(LS.lastTenant, tenant);

    toast("匯出中…");
    try {
      const j = await apiExport(cfg, { admin_secret: adminSecret, export_secret: exportSecret, tenant });
      if (!j || !j.ok) throw new Error(j && j.error ? j.error : "ok=false");

      // Support: j.url (download link) OR j.csv (raw) OR j.data
      if (j.url) {
        const ok = await copyText(j.url);
        toast(ok ? "已複製匯出連結 ✅" : "已取消");
        return;
      }
      if (j.csv) {
        // offer download as file
        const blob = new Blob([String(j.csv)], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `hsc_export_${tenant || "all"}_${Date.now()}.csv`;
        a.click();
        toast("已下載 CSV ✅");
        return;
      }
      toast("匯出成功 ✅（但回傳格式未知）");
    } catch (e) {
      toast(`匯出失敗：${String(e && e.message ? e.message : e)}`, "warn");
    }
  }

  async function doCreateInvite(count = 1) {
    const cfg = loadCfg();
    const adminSecret = getVal(findField(["admin_secret", "adminSecret", "ADMIN_SECRET"])) || localStorage.getItem(LS.adminSecret) || "";
    const tenant = getVal(findField(["tenant", "inputTenant"])) || localStorage.getItem(LS.lastTenant) || "angel";

    if (!adminSecret) return toast("缺少 ADMIN_SECRET", "warn");

    toast(`產生邀請碼中…（${tenant} x${count}）`);
    try {
      const j = await apiCreateInvite(cfg, { tenant, count, admin_secret: adminSecret });
      if (!j || !j.ok) throw new Error(j && j.error ? j.error : "ok=false");

      // j.invites may be array
      const invites = j.invites || j.codes || j.data || [];
      const text =
        Array.isArray(invites) && invites.length
          ? invites.join("\n")
          : (j.invite || j.code || "");

      if (text) {
        const ok = await copyText(text);
        toast(ok ? "邀請碼已複製 ✅" : "已取消");
      } else {
        toast("已產生邀請碼 ✅（但回傳欄位未知）");
      }
    } catch (e) {
      toast(`產生邀請碼失敗：${String(e && e.message ? e.message : e)}`, "warn");
    }
  }

  async function doCopyLink(which) {
    const cfg = loadCfg();
    const id = normalizeId(getVal(findField(["cardId", "id", "inputId"])) || localStorage.getItem(LS.lastId) || "");
    if (!id) return toast("缺少 ID", "warn");

    const map = {
      clean: buildCleanUrl(cfg, id),
      og: buildOgUrl(cfg, id),
      wechat: buildWeChatUrl(cfg, id),
    };

    const url = map[which] || map.clean;
    const ok = await copyText(url);
    toast(ok ? "已複製 ✅" : "已取消");
  }

  // If GAS returns a fill link in adminCard payload, we can copy it:
  async function doCopyFillLink() {
    const cfg = loadCfg();
    const r = await doLoadCard(); // refresh & reuse payload already shown
    if (!r.ok) return;

    const card = r.card || {};
    const fillLink = pick(card, ["fill_link", "fillLink", "form_link", "formLink", "link"], "");
    if (!fillLink) {
      toast("目前回傳資料沒有 fill_link（需 GAS adminCard 支援）", "warn");
      return;
    }
    const ok = await copyText(fillLink);
    toast(ok ? "已複製填表連結 ✅" : "已取消");
  }

  /* ---------- Event wiring (resilient) ---------- */
  function wireButtons() {
    // Direct bindings (if those ids exist)
    const btnLoad = findButton(["btnLoad", "load", "btnFetch", "btnGet", "btnSearch"]);
    if (btnLoad) btnLoad.addEventListener("click", (e) => (e.preventDefault(), doLoadCard()));

    const btnActive = findButton(["btnActive", "setActive", "btnEnable"]);
    if (btnActive) btnActive.addEventListener("click", (e) => (e.preventDefault(), doSetStatus("active")));

    const btnInactive = findButton(["btnInactive", "setInactive", "btnDisable", "btnLock"]);
    if (btnInactive) btnInactive.addEventListener("click", (e) => (e.preventDefault(), doSetStatus("inactive")));

    const btnExtend = findButton(["btnExtend", "extend"]);
    if (btnExtend) btnExtend.addEventListener("click", (e) => (e.preventDefault(), doExtend(Number(getVal(findField(["extend_days", "days"])) || 30))));

    const btnExport = findButton(["btnExport", "export"]);
    if (btnExport) btnExport.addEventListener("click", (e) => (e.preventDefault(), doExport()));

    const btnInvite = findButton(["btnInvite", "createInvite", "btnCreateInvite"]);
    if (btnInvite) btnInvite.addEventListener("click", (e) => (e.preventDefault(), doCreateInvite(Number(getVal(findField(["invite_count", "count"])) || 1))));

    const btnCopyClean = findButton(["btnCopyClean", "copyClean"]);
    if (btnCopyClean) btnCopyClean.addEventListener("click", (e) => (e.preventDefault(), doCopyLink("clean")));

    const btnCopyOg = findButton(["btnCopyOg", "copyOg"]);
    if (btnCopyOg) btnCopyOg.addEventListener("click", (e) => (e.preventDefault(), doCopyLink("og")));

    const btnCopyWeChat = findButton(["btnCopyWeChat", "copyWeChat"]);
    if (btnCopyWeChat) btnCopyWeChat.addEventListener("click", (e) => (e.preventDefault(), doCopyLink("wechat")));

    const btnCopyFill = findButton(["btnCopyFill", "copyFill", "btnCopyForm"]);
    if (btnCopyFill) btnCopyFill.addEventListener("click", (e) => (e.preventDefault(), doCopyFillLink()));

    // Submit form bindings (if admin.html uses a <form>)
    const form = $("form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        doLoadCard();
      });
    }

    // Event delegation: catch buttons by data-action
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action]");
      if (!t) return;

      const act = String(t.getAttribute("data-action") || "").trim();
      if (!act) return;

      // avoid double-binding if already bound
      e.preventDefault();

      const table = {
        load: () => doLoadCard(),
        reload: () => doLoadCard(),
        active: () => doSetStatus("active"),
        inactive: () => doSetStatus("inactive"),
        extend: () => doExtend(Number(t.getAttribute("data-days") || getVal(findField(["extend_days", "days"])) || 30)),
        export: () => doExport(),
        invite: () => doCreateInvite(Number(t.getAttribute("data-count") || getVal(findField(["invite_count", "count"])) || 1)),
        copy_clean: () => doCopyLink("clean"),
        copy_og: () => doCopyLink("og"),
        copy_wechat: () => doCopyLink("wechat"),
        copy_fill: () => doCopyFillLink(),
      };

      const fn = table[act];
      if (fn) fn();
    }, true);
  }

  function initInputs() {
    const cfg = loadCfg();

    // optional: allow admin UI to show current cfg
    const gasEl = findField(["gas", "gasUrl", "inputGas"]);
    const baseEl = findField(["base", "baseUrl", "inputBase"]);
    if (gasEl) safeVal(gasEl, cfg.GAS);
    if (baseEl) safeVal(baseEl, cfg.BASE);

    // persist changes (if these inputs exist)
    if (gasEl) {
      gasEl.addEventListener("change", () => {
        const v = getVal(gasEl);
        if (v) localStorage.setItem(LS.gas, v);
        toast("已更新 GAS URL ✅");
      });
    }
    if (baseEl) {
      baseEl.addEventListener("change", () => {
        const v = getVal(baseEl);
        if (v) localStorage.setItem(LS.base, v);
        toast("已更新 BASE URL ✅");
      });
    }

    // secrets
    const adminSecretEl = findField(["admin_secret", "adminSecret", "ADMIN_SECRET"]);
    const exportSecretEl = findField(["export_secret", "exportSecret", "EXPORT_SECRET"]);
    if (adminSecretEl && !getVal(adminSecretEl)) safeVal(adminSecretEl, localStorage.getItem(LS.adminSecret) || "");
    if (exportSecretEl && !getVal(exportSecretEl)) safeVal(exportSecretEl, localStorage.getItem(LS.exportSecret) || "");

    // id/token
    const idEl = findField(["cardId", "id", "inputId"]);
    const tokenEl = findField(["token", "inputToken"]);
    if (idEl && !getVal(idEl)) safeVal(idEl, qs("id") || localStorage.getItem(LS.lastId) || "TW0001");
    if (tokenEl && !getVal(tokenEl)) safeVal(tokenEl, qs("token") || localStorage.getItem(LS.lastToken) || "");

    // show version
    safeText($("#version"), "admin.js v" + VERSION);
    safeText($("#jsVersion"), "v" + VERSION);
  }

  function boot() {
    initInputs();
    wireButtons();

    // auto-load if query id present
    const qid = normalizeId(qs("id") || "");
    const auto = qs("autoload");
    if (qid || auto === "1") {
      // fill id and load
      const idEl = findField(["cardId", "id", "inputId"]);
      if (qid && idEl) safeVal(idEl, qid);
      doLoadCard({ id: qid || undefined });
    } else {
      toast(`HSC Admin ready (v${VERSION})`);
    }
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();