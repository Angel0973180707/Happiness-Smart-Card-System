/* ==========================================
 * Happiness Smart Card System — admin.js v521.6 (COMPLETE OVERWRITE)
 *
 * v521.6:
 * ✅ 客服工作台版面流程
 * ✅ 發邀請碼 / 複製填表連結
 * ✅ 姓名+手機末3碼查找
 * ✅ 交付卡主連結 = share.html?id=...
 * ✅ 名片管理：status / wechat_poster
 * ✅ 統計排行（若 GAS 回傳 items/cards 含 view_count）
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "521.6";

  const DEFAULTS = {
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    BASE: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FETCH_TIMEOUT_MS: 15000
  };

  const LS = {
    gas: "HSC_ADMIN_GAS",
    base: "HSC_ADMIN_BASE",
    adminSecret: "HSC_ADMIN_SECRET"
  };

  const $ = (id) => document.getElementById(id);

  const state = {
    selectedCard: null,
    selectedId: "",
    selectedToken: "",
    statsCache: null
  };

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

  function safeText(el, v) {
    if (el) el.textContent = v == null ? "" : String(v);
  }

  function safeVal(el, v) {
    if (el) el.value = v == null ? "" : String(v);
  }

  function getVal(el) {
    return el ? String(el.value || "").trim() : "";
  }

  function loadCfg() {
    return {
      GAS: localStorage.getItem(LS.gas) || DEFAULTS.GAS,
      BASE: localStorage.getItem(LS.base) || DEFAULTS.BASE,
      FETCH_TIMEOUT_MS: DEFAULTS.FETCH_TIMEOUT_MS
    };
  }

  function saveCfg() {
    localStorage.setItem(LS.gas, getVal($("gasUrl")) || DEFAULTS.GAS);
    localStorage.setItem(LS.base, getVal($("baseUrl")) || DEFAULTS.BASE);
    localStorage.setItem(LS.adminSecret, getVal($("adminSecret")) || "");
  }

  function baseUrl_(cfg) {
    const b = String(cfg.BASE || "").trim();
    return b.endsWith("/") ? b : b + "/";
  }

  function buildShareUrl(cfg, id) {
    return baseUrl_(cfg) + "share.html?id=" + encodeURIComponent(id);
  }

  function buildCardUrl(cfg, id) {
    return baseUrl_(cfg) + "index.html?id=" + encodeURIComponent(id) + "&view=1";
  }

  function buildWeChatUrl(cfg, id) {
    return baseUrl_(cfg) + "wechat.html?id=" + encodeURIComponent(id);
  }

  function toast(msg) {
    const el = $("toast");
    if (!el) return;
    el.textContent = String(msg || "");
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 1800);
    safeText($("statusPill"), msg);
  }

  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(String(t || ""));
      return true;
    } catch (e) {
      const ok = prompt("請手動複製：", String(t || ""));
      return ok !== null;
    }
  }

  async function fetchJson(url, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || DEFAULTS.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      const txt = await res.text();
      let j = null;
      try { j = JSON.parse(txt); } catch (_) {}
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (!j || typeof j !== "object") throw new Error("Invalid JSON");
      return j;
    } finally {
      clearTimeout(t);
    }
  }

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

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      const v = obj && obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return fallback;
  }

  function parseCardsFromResponse(j) {
    const arr = j.cards || j.items || j.data || j.results || [];
    if (Array.isArray(arr)) return arr;
    if (j.item && typeof j.item === "object") return [j.item];
    return [];
  }

  async function apiFindCards(cfg, { q, admin_secret }) {
    const attempt = await tryActions(
      cfg,
      ["adminSearch", "searchCards", "adminFind", "findCards"],
      { q, admin_secret }
    );
    const cards = parseCardsFromResponse(attempt.json);
    return { cards, raw: attempt.json, action: attempt.action };
  }

  async function apiGetCard(cfg, { id, admin_secret }) {
    const attempt = await tryActions(
      cfg,
      ["adminCard", "adminGet", "card"],
      { id, admin_secret }
    );
    const j = attempt.json;
    const card = j.item || j.data || j.card || {};
    if (!card || typeof card !== "object") throw new Error("Empty card payload");
    return { card, raw: j, action: attempt.action };
  }

  async function apiSetStatus(cfg, { id, status, token, admin_secret }) {
    const attempt = await tryActions(
      cfg,
      ["adminSetStatus", "setStatus", "set_state"],
      { id, status, token, admin_secret }
    );
    return attempt.json;
  }

  async function apiSetWeChatPoster(cfg, { id, value, token, admin_secret }) {
    const attempt = await tryActions(
      cfg,
      ["adminUpdate", "updateCard", "setField"],
      { id, token, admin_secret, field: "wechat_poster", value }
    );
    return attempt.json;
  }

  async function apiCreateInvite(cfg, { admin_secret, count }) {
    const attempt = await tryActions(
      cfg,
      ["adminCreateInvite", "createInvite", "inviteCreate"],
      { admin_secret, count: count || 1 }
    );
    return attempt.json;
  }

  async function apiStats(cfg, { admin_secret }) {
    const attempt = await tryActions(
      cfg,
      ["adminStats", "stats", "dashboardStats"],
      { admin_secret }
    );
    return attempt.json;
  }

  async function apiMakeUpdateLink(cfg, { id, admin_secret, token }) {
    const attempt = await tryActions(
      cfg,
      ["adminMakeUpdateLink", "makeUpdateLink", "adminFillLink"],
      { id, admin_secret, token }
    );
    return attempt.json;
  }

  function renderRankList(items) {
    const box = $("rankList");
    box.innerHTML = "";

    if (!items || !items.length) {
      box.innerHTML = `<div class="rankEmpty">目前沒有排行資料</div>`;
      return;
    }

    items.slice(0, 10).forEach((item, idx) => {
      const id = normalizeId(pick(item, ["id"], ""));
      const name = pick(item, ["name", "姓名"], "（未填姓名）");
      const title = pick(item, ["title"], "");
      const unit = pick(item, ["unit"], "");
      const count = pick(item, ["view_count"], "0");

      const row = document.createElement("div");
      row.className = "rankItem";
      row.innerHTML = `
        <div class="rankNo">#${idx + 1}</div>
        <div class="rankMain">
          <div class="rankName">${name}</div>
          <div class="rankMeta">${[id, title || unit].filter(Boolean).join("｜")}</div>
        </div>
        <div class="rankCount mono">${count}</div>
      `;
      box.appendChild(row);
    });
  }

  function setSelectedCard(card) {
    state.selectedCard = card || null;
    state.selectedId = normalizeId(pick(card, ["id"], ""));
    state.selectedToken = pick(card, ["token"], "");

    safeText($("selectedId"), state.selectedId || "—");
    safeText($("selectedName"), pick(card, ["name", "姓名"], "—") || "—");
    safeText($("selectedStatus"), pick(card, ["status", "狀態"], "—") || "—");
    safeText($("selectedInviteCode"), pick(card, ["invite_code", "invite"], "—") || "—");

    safeText($("selectedViewCount"), pick(card, ["view_count"], "—") || "—");
    safeText($("selectedLastViewAt"), pick(card, ["last_view_at"], "—") || "—");
    safeText($("selectedExpiresAt"), pick(card, ["expires_at"], "—") || "—");

    const wx = pick(card, ["wechat_poster"], "");
    safeText($("wxStateText"), wx === "" ? "—" : String(wx));

    const cfg = loadCfg();
    if (state.selectedId) {
      safeVal($("shareLink"), buildShareUrl(cfg, state.selectedId));
      safeVal($("cardLink"), buildCardUrl(cfg, state.selectedId));
      safeVal($("wechatLink"), buildWeChatUrl(cfg, state.selectedId));
    } else {
      safeVal($("shareLink"), "");
      safeVal($("cardLink"), "");
      safeVal($("wechatLink"), "");
    }

    [
      "btnCopyInvite",
      "btnSetActive",
      "btnSetInactive",
      "btnWechatOff",
      "btnWechatOn",
      "btnCopyShare",
      "btnCopyCard",
      "btnCopyWeChat",
      "btnMakeUpdate",
      "btnCopyUpdate"
    ].forEach(id => {
      if ($(id)) $(id).disabled = !state.selectedId;
    });
  }

  function renderResultList(cards) {
    const box = $("resultList");
    box.innerHTML = "";

    if (!cards || !cards.length) {
      box.innerHTML = `<div class="item"><strong>查無結果</strong><small>請試：姓名＋手機末3碼，例如「王小明 123」</small></div>`;
      return;
    }

    cards.forEach(card => {
      const id = normalizeId(pick(card, ["id"], ""));
      const name = pick(card, ["name", "姓名"], "（未填姓名）");
      const title = pick(card, ["title", "職稱"], "");
      const unit = pick(card, ["unit", "單位"], "");
      const phone = pick(card, ["phone"], "");
      const status = pick(card, ["status", "狀態"], "");
      const inviteCode = pick(card, ["invite_code", "invite"], "");
      const wx = pick(card, ["wechat_poster"], "");
      const viewCount = pick(card, ["view_count"], "");

      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <strong>${name} <span class="mono">${id || ""}</span></strong>
        <small>${[title, unit].filter(Boolean).join("｜") || "—"}</small>
        <small>電話：${phone || "—"}｜狀態：${status || "—"}｜邀請碼：${inviteCode || "—"}｜微信：${wx || "0"}｜訪問：${viewCount || "0"}</small>
        <div class="actions">
          <button class="btn btnPick">選這筆</button>
        </div>
      `;
      item.querySelector(".btnPick").addEventListener("click", async () => {
        toast("讀取名片中…");
        const cfg = loadCfg();
        try {
          const adminSecret = getVal($("adminSecret"));
          const { card: fullCard } = await apiGetCard(cfg, { id, admin_secret: adminSecret });
          setSelectedCard(fullCard);
          toast("已選取 ✅");
        } catch (e) {
          setSelectedCard(card);
          toast("已選取（簡版資料）");
        }
      });
      box.appendChild(item);
    });
  }

  async function doFind() {
    saveCfg();
    const cfg = loadCfg();
    const q = getVal($("customerMsg"));
    const adminSecret = getVal($("adminSecret"));

    if (!q) return toast("請先輸入查找條件");

    toast("查找中…");
    try {
      const { cards } = await apiFindCards(cfg, { q, admin_secret: adminSecret });
      renderResultList(cards);
      toast(`找到 ${cards.length} 筆`);
    } catch (e) {
      renderResultList([]);
      toast("查找失敗");
    }
  }

  async function doStats() {
    saveCfg();
    const cfg = loadCfg();
    const adminSecret = getVal($("adminSecret"));
    toast("刷新統計中…");
    try {
      const j = await apiStats(cfg, { admin_secret: adminSecret });

      safeText($("stTotal"), pick(j, ["total", "total_cards"], "—"));
      safeText($("stMonthNew"), pick(j, ["month_new", "new_this_month"], "—"));
      safeText($("stActive"), pick(j, ["active", "active_cards"], "—"));
      safeText($("stExpired"), pick(j, ["expired", "expired_cards"], "—"));

      // 排行：優先吃 items/cards；若沒有就留空
      const rankItems = parseCardsFromResponse(j)
        .filter(x => String(pick(x, ["status"], "")).toLowerCase() === "active" || !pick(x, ["status"], ""))
        .sort((a, b) => Number(pick(b, ["view_count"], 0)) - Number(pick(a, ["view_count"], 0)));

      renderRankList(rankItems);

      toast("統計已更新 ✅");
    } catch (e) {
      toast("統計讀取失敗");
    }
  }

  async function doMakeFill() {
    saveCfg();
    const cfg = loadCfg();
    const adminSecret = getVal($("adminSecret"));

    toast("產生邀請碼中…");
    try {
      const j = await apiCreateInvite(cfg, { admin_secret: adminSecret, count: 1 });
      const inviteCode =
        pick(j, ["invite", "code"], "") ||
        (Array.isArray(j.invites) && j.invites[0]) ||
        (Array.isArray(j.codes) && j.codes[0]) ||
        "";

      if (!inviteCode) throw new Error("No invite code");

      const url = baseUrl_(cfg) + "form.html?invite=" + encodeURIComponent(inviteCode);

      safeVal($("inviteCode"), inviteCode);
      safeVal($("fillLink"), url);

      $("btnCopyInviteOnly").disabled = false;
      $("btnCopyFillOnly").disabled = false;

      await copyText(inviteCode);
      toast("邀請碼已複製 ✅");
    } catch (e) {
      toast("產生邀請碼失敗");
    }
  }

  async function doCopyInviteOnly() {
    const code = getVal($("inviteCode"));
    if (!code) return toast("目前沒有邀請碼");
    await copyText(code);
    toast("已複製邀請碼 ✅");
  }

  async function doCopyFillOnly() {
    const link = getVal($("fillLink"));
    if (!link) return toast("目前沒有填表連結");
    await copyText(link);
    toast("已複製填表連結 ✅");
  }

  async function doMakeUpdate() {
    saveCfg();
    const cfg = loadCfg();
    const adminSecret = getVal($("adminSecret"));
    if (!state.selectedId) return toast("請先選一筆名片");

    toast("產生更新連結中…");
    try {
      const j = await apiMakeUpdateLink(cfg, {
        id: state.selectedId,
        admin_secret: adminSecret,
        token: state.selectedToken
      });
      const link = pick(j, ["fill_link", "fillLink", "update_link", "updateLink", "url", "link"], "");
      if (!link) throw new Error("No update link");
      safeVal($("updateLink"), link);
      await copyText(link);
      toast("更新連結已複製 ✅");
    } catch (e) {
      toast("更新連結產生失敗");
    }
  }

  async function doCopyUpdate() {
    const link = getVal($("updateLink"));
    if (!link) return toast("目前沒有更新連結");
    await copyText(link);
    toast("已複製更新連結 ✅");
  }

  async function doCopyInvite() {
    if (!state.selectedCard) return toast("請先選一筆名片");
    const code = pick(state.selectedCard, ["invite_code", "invite"], "");
    if (!code) return toast("這筆名片沒有邀請碼");
    await copyText(code);
    toast("已複製邀請碼 ✅");
  }

  async function doCopyShare() {
    const link = getVal($("shareLink"));
    if (!link) return toast("沒有交付卡連結");
    await copyText(link);
    toast("已複製交付卡連結 ✅");
  }

  async function doCopyCard() {
    const link = getVal($("cardLink"));
    if (!link) return toast("沒有智慧名片連結");
    await copyText(link);
    toast("已複製智慧名片連結 ✅");
  }

  async function doCopyWeChat() {
    const link = getVal($("wechatLink"));
    if (!link) return toast("沒有微信連結");
    await copyText(link);
    toast("已複製微信連結 ✅");
  }

  async function doSetStatus(status) {
    saveCfg();
    const cfg = loadCfg();
    const adminSecret = getVal($("adminSecret"));
    if (!state.selectedId) return toast("請先選一筆名片");

    toast(`狀態切換為 ${status} 中…`);
    try {
      await apiSetStatus(cfg, {
        id: state.selectedId,
        status,
        token: state.selectedToken,
        admin_secret: adminSecret
      });
      const { card } = await apiGetCard(cfg, { id: state.selectedId, admin_secret: adminSecret });
      setSelectedCard(card);
      toast(`已設為 ${status} ✅`);
    } catch (e) {
      toast("狀態更新失敗");
    }
  }

  async function doSetWeChatPoster(value) {
    saveCfg();
    const cfg = loadCfg();
    const adminSecret = getVal($("adminSecret"));
    if (!state.selectedId) return toast("請先選一筆名片");

    toast(`設定微信加購 = ${value} 中…`);
    try {
      await apiSetWeChatPoster(cfg, {
        id: state.selectedId,
        value,
        token: state.selectedToken,
        admin_secret: adminSecret
      });
      const { card } = await apiGetCard(cfg, { id: state.selectedId, admin_secret: adminSecret });
      setSelectedCard(card);
      toast(`微信加購已更新為 ${value} ✅`);
    } catch (e) {
      toast("微信加購更新失敗");
    }
  }

  function init() {
    const cfg = loadCfg();
    safeVal($("gasUrl"), cfg.GAS);
    safeVal($("baseUrl"), cfg.BASE);
    safeVal($("adminSecret"), localStorage.getItem(LS.adminSecret) || "");

    $("gasUrl")?.addEventListener("change", saveCfg);
    $("baseUrl")?.addEventListener("change", saveCfg);
    $("adminSecret")?.addEventListener("change", saveCfg);

    $("btnStats")?.addEventListener("click", doStats);

    $("btnMakeFill")?.addEventListener("click", doMakeFill);
    $("btnCopyInviteOnly")?.addEventListener("click", doCopyInviteOnly);
    $("btnCopyFillOnly")?.addEventListener("click", doCopyFillOnly);

    $("btnFind")?.addEventListener("click", doFind);
    $("btnMakeUpdate")?.addEventListener("click", doMakeUpdate);
    $("btnCopyUpdate")?.addEventListener("click", doCopyUpdate);

    $("btnCopyInvite")?.addEventListener("click", doCopyInvite);
    $("btnCopyShare")?.addEventListener("click", doCopyShare);
    $("btnCopyCard")?.addEventListener("click", doCopyCard);
    $("btnCopyWeChat")?.addEventListener("click", doCopyWeChat);

    $("btnSetActive")?.addEventListener("click", () => doSetStatus("active"));
    $("btnSetInactive")?.addEventListener("click", () => doSetStatus("inactive"));

    $("btnWechatOff")?.addEventListener("click", () => doSetWeChatPoster("0"));
    $("btnWechatOn")?.addEventListener("click", () => doSetWeChatPoster("1"));

    setSelectedCard(null);
    $("btnCopyInviteOnly").disabled = true;
    $("btnCopyFillOnly").disabled = true;

    toast(`HSC Admin ready (v${VERSION})`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();