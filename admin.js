/* ==========================================
 * HSC Admin Workspace — admin.js v522.5
 * COMPLETE OVERWRITE
 *
 * Features:
 * - 大字、簡潔、直覺
 * - 搜尋卡片
 * - 載入卡片
 * - 開智慧名片成品（view=1）
 * - 開交付卡
 * - 複製交付連結
 * - 複製更新連結
 * - 啟用 / 停用
 * - 建邀請碼
 * - 快速更新
 * - 讀統計
 * - 即將到期提醒（30 天內 active）
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "522.5";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_TENANT = "angel";
  const DEFAULT_ADMIN_SECRET = "ANGEL2026167777";
  const DEFAULT_BASE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const EXPIRY_REMIND_DAYS = 30;

  const LS = {
    GAS: "hsc_admin_gas_v5225",
    TENANT: "hsc_admin_tenant_v5225",
    SECRET: "hsc_admin_secret_v5225"
  };

  const state = {
    items: [],
    currentItem: null
  };

  const $ = (sel) => document.querySelector(sel);

  const el = {
    gasUrl: $("#gasUrl"),
    tenant: $("#tenant"),
    adminSecret: $("#adminSecret"),

    btnSaveConfig: $("#btnSaveConfig"),
    btnPing: $("#btnPing"),
    btnStats: $("#btnStats"),
    btnRefreshExpiry: $("#btnRefreshExpiry"),

    statTotal: $("#statTotal"),
    statMonthNew: $("#statMonthNew"),
    statActive: $("#statActive"),
    statExpired: $("#statExpired"),

    expiryReminderList: $("#expiryReminderList"),

    searchInput: $("#searchInput"),
    btnSearch: $("#btnSearch"),
    btnSearchId: $("#btnSearchId"),
    btnClearSearch: $("#btnClearSearch"),

    invitePlan: $("#invitePlan"),
    inviteDays: $("#inviteDays"),
    inviteCount: $("#inviteCount"),
    btnCreateInvite: $("#btnCreateInvite"),

    statusBox: $("#statusBox"),

    currentId: $("#currentId"),
    currentName: $("#currentName"),
    quickField: $("#quickField"),
    quickValue: $("#quickValue"),
    btnQuickUpdate: $("#btnQuickUpdate"),
    btnLoadCurrent: $("#btnLoadCurrent"),
    btnOpenCardClean: $("#btnOpenCardClean"),
    btnOpenShare: $("#btnOpenShare"),
    btnCopyDeliveryLink: $("#btnCopyDeliveryLink"),
    btnCopyUpdateLink: $("#btnCopyUpdateLink"),
    detailJson: $("#detailJson"),

    resultCount: $("#resultCount"),
    resultList: $("#resultList")
  };

  init();

  function init() {
    hydrateConfig();
    bindEvents();
    renderResults([]);
    setStatus(`HSC Admin Workspace v${VERSION}\n準備就緒。`, "ok");
    refreshStats();
    refreshExpiryReminder();
  }

  function hydrateConfig() {
    el.gasUrl.value = localStorage.getItem(LS.GAS) || DEFAULT_GAS;
    el.tenant.value = localStorage.getItem(LS.TENANT) || DEFAULT_TENANT;
    el.adminSecret.value = localStorage.getItem(LS.SECRET) || DEFAULT_ADMIN_SECRET;
  }

  function saveConfig() {
    localStorage.setItem(LS.GAS, val(el.gasUrl) || DEFAULT_GAS);
    localStorage.setItem(LS.TENANT, val(el.tenant) || DEFAULT_TENANT);
    localStorage.setItem(LS.SECRET, val(el.adminSecret) || DEFAULT_ADMIN_SECRET);
    setStatus("設定已儲存。", "ok");
  }

  function bindEvents() {
    el.btnSaveConfig?.addEventListener("click", saveConfig);

    el.btnPing?.addEventListener("click", async () => {
      try {
        setStatus("測試連線中…", "warn");
        const res = await api("ping", {}, { admin: false });
        setStatus(`連線成功\nv=${res.v}\nnow=${res.now}`, "ok");
      } catch (err) {
        setStatus(err.message || String(err), "err");
      }
    });

    el.btnStats?.addEventListener("click", refreshStats);
    el.btnRefreshExpiry?.addEventListener("click", refreshExpiryReminder);

    el.btnSearch?.addEventListener("click", doSearch);
    el.btnSearchId?.addEventListener("click", doSearchId);

    el.btnClearSearch?.addEventListener("click", () => {
      el.searchInput.value = "";
      state.items = [];
      renderResults([]);
      setStatus("已清空搜尋結果。", "ok");
    });

    el.searchInput?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        doSearch();
      }
    });

    el.btnCreateInvite?.addEventListener("click", createInvite);

    el.btnQuickUpdate?.addEventListener("click", quickUpdate);
    el.btnLoadCurrent?.addEventListener("click", reloadCurrent);
    el.btnOpenCardClean?.addEventListener("click", openCurrentCardClean);
    el.btnOpenShare?.addEventListener("click", openCurrentShare);
    el.btnCopyDeliveryLink?.addEventListener("click", copyCurrentDeliveryLink);
    el.btnCopyUpdateLink?.addEventListener("click", copyCurrentUpdateLink);

    el.resultList?.addEventListener("click", onResultAction);
  }

  async function refreshStats() {
    try {
      const res = await api("adminStats", {}, { admin: true });
      el.statTotal.textContent = safeNum(res.total);
      el.statMonthNew.textContent = safeNum(res.month_new);
      el.statActive.textContent = safeNum(res.active);
      el.statExpired.textContent = safeNum(res.expired);
      setStatus(`統計已更新\nmonth=${res.month || ""}`, "ok");
    } catch (err) {
      el.statTotal.textContent = "—";
      el.statMonthNew.textContent = "—";
      el.statActive.textContent = "—";
      el.statExpired.textContent = "—";
      setStatus(err.message || String(err), "err");
    }
  }

  async function refreshExpiryReminder() {
    try {
      setStatus("讀取即將到期提醒中…", "warn");
      const items = await fetchAllCardsByTenant();
      const remindItems = items
        .filter((x) => String(x.status || "").trim().toLowerCase() === "active")
        .map((x) => {
          const daysLeft = calcDaysLeft(x.expires_at);
          return { ...x, daysLeft };
        })
        .filter((x) => x.daysLeft !== null && x.daysLeft >= 0 && x.daysLeft <= EXPIRY_REMIND_DAYS)
        .sort((a, b) => {
          const ad = a.daysLeft ?? 999999;
          const bd = b.daysLeft ?? 999999;
          if (ad !== bd) return ad - bd;
          return timeOf(a.expires_at) - timeOf(b.expires_at);
        });

      renderExpiryReminder(remindItems);
      setStatus(`即將到期提醒已更新\n共 ${remindItems.length} 筆`, "ok");
    } catch (err) {
      renderExpiryReminder([]);
      setStatus(err.message || String(err), "err");
    }
  }

  function renderExpiryReminder(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      el.expiryReminderList.innerHTML = `<div class="empty">目前沒有 30 天內即將到期的啟用卡片。</div>`;
      return;
    }

    el.expiryReminderList.innerHTML = list.map((item) => {
      const id = esc(item.id || "");
      const name = esc(item.name || "未命名");
      const exp = esc(item.expires_at || "—");
      const days = item.daysLeft;
      const dayText = days === 0 ? "今天到期" : `剩 ${days} 天`;
      return `
        <div class="reminder-item">
          <div class="reminder-main">
            <div class="reminder-title">${name}</div>
            <div class="reminder-sub">
              序號：<span class="inline-code">${id}</span> ｜ 到期：${exp} ｜ ${dayText}
            </div>
          </div>
          <div class="btns">
            <button data-act="load" data-id="${id}" class="primary">載入</button>
            <button data-act="copy-delivery-link" data-id="${id}" class="warn">複製交付連結</button>
          </div>
        </div>
      `;
    }).join("");
  }

  async function doSearch() {
    const q = val(el.searchInput);
    if (!q) {
      setStatus("請先輸入搜尋文字。", "warn");
      return;
    }

    try {
      setStatus(`搜尋中：${q}`, "warn");
      const res = await api("adminSearch", { q }, { admin: true });
      const items = normalizeSearchItems(res.items || []);
      state.items = items;
      renderResults(items);
      setStatus(`搜尋完成：${q}\n找到 ${items.length} 筆`, "ok");
    } catch (err) {
      renderResults([]);
      setStatus(err.message || String(err), "err");
    }
  }

  async function doSearchId() {
    const id = val(el.searchInput);
    if (!id) {
      setStatus("請先輸入卡號，例如 TW0001。", "warn");
      return;
    }

    try {
      setStatus(`讀取卡片中：${id}`, "warn");
      const res = await api("adminCard", { id }, { admin: true });
      if (!res?.item) throw new Error("讀卡失敗：沒有 item");

      const item = normalizeAdminCardItem(res.item);
      state.currentItem = item;
      fillCurrent(item);
      renderResults([item]);

      setStatus(`已讀取卡片：${id}`, "ok");
    } catch (err) {
      setStatus(err.message || String(err), "err");
    }
  }

  async function createInvite() {
    try {
      setStatus("建立邀請碼中…", "warn");
      const plan = val(el.invitePlan) || "free";
      const days = val(el.inviteDays) || "7";
      const count = val(el.inviteCount) || "1";

      const res = await api(
        "adminCreateInvite",
        { plan, days, count },
        { admin: true }
      );

      const msg = [
        `邀請碼建立成功`,
        `invite=${res.invite_code || res.invite || ""}`,
        `form_link=${res.form_link || ""}`,
        `facade_link=${res.facade_link || ""}`
      ].join("\n");

      setStatus(msg, "ok");

      const link = res.form_link || res.link || "";
      if (link) await copyText(link);
    } catch (err) {
      setStatus(err.message || String(err), "err");
    }
  }

  async function quickUpdate() {
    const id = val(el.currentId);
    const field = val(el.quickField);
    const value = val(el.quickValue);

    if (!id) {
      setStatus("請先載入一筆卡片。", "warn");
      return;
    }
    if (!field) {
      setStatus("請先選擇欄位。", "warn");
      return;
    }

    try {
      setStatus(`更新中：${id} / ${field}`, "warn");
      const res = await api("adminUpdate", { id, field, value }, { admin: true });

      setStatus(
        [
          `更新成功`,
          `id=${res.id || id}`,
          `field=${field}`,
          `updated_at=${res.updated_at || ""}`
        ].join("\n"),
        "ok"
      );

      await loadCardToCurrent(id);
      await refreshExpiryReminder();
    } catch (err) {
      setStatus(err.message || String(err), "err");
    }
  }

  async function reloadCurrent() {
    const id = val(el.currentId);
    if (!id) {
      setStatus("目前沒有卡號可載入。", "warn");
      return;
    }
    await loadCardToCurrent(id);
  }

  async function loadCardToCurrent(id) {
    try {
      setStatus(`重新載入中：${id}`, "warn");
      const res = await api("adminCard", { id }, { admin: true });
      if (!res?.item) throw new Error("重新載入失敗");
      const item = normalizeAdminCardItem(res.item);
      state.currentItem = item;
      fillCurrent(item);
      setStatus(`重新載入完成：${id}`, "ok");
    } catch (err) {
      setStatus(err.message || String(err), "err");
    }
  }

  function openCurrentCardClean() {
    if (!state.currentItem?.id) {
      setStatus("請先載入卡片。", "warn");
      return;
    }
    window.open(buildCardCleanLink(state.currentItem.id), "_blank", "noopener");
  }

  function openCurrentShare() {
    if (!state.currentItem?.id) {
      setStatus("請先載入卡片。", "warn");
      return;
    }
    window.open(buildShareLink(state.currentItem.id), "_blank", "noopener");
  }

  async function copyCurrentDeliveryLink() {
    if (!state.currentItem?.id) {
      setStatus("請先載入卡片。", "warn");
      return;
    }
    const link = buildShareLink(state.currentItem.id);
    await copyText(link);
    setStatus(`已複製交付連結：${state.currentItem.id}\n${link}`, "ok");
  }

  async function copyCurrentUpdateLink() {
    if (!state.currentItem?.id) {
      setStatus("請先載入卡片。", "warn");
      return;
    }
    await copyUpdateLink(state.currentItem.id);
  }

  async function onResultAction(ev) {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;

    const act = btn.dataset.act;
    const id = btn.dataset.id || "";
    if (!id) return;

    try {
      switch (act) {
        case "load":
          await loadCardToCurrent(id);
          break;
        case "card-clean":
          window.open(buildCardCleanLink(id), "_blank", "noopener");
          break;
        case "share":
          window.open(buildShareLink(id), "_blank", "noopener");
          break;
        case "copy-id":
          await copyText(id);
          setStatus(`已複製卡號：${id}`, "ok");
          break;
        case "copy-delivery-link":
          await copyText(buildShareLink(id));
          setStatus(`已複製交付連結：${id}\n${buildShareLink(id)}`, "ok");
          break;
        case "copy-update-link":
          await copyUpdateLink(id);
          break;
        case "activate":
          await setStatusAction(id, "active");
          break;
        case "inactivate":
          await setStatusAction(id, "inactive");
          break;
        case "invite":
          await createInviteForCard(id);
          break;
        default:
          break;
      }
    } catch (err) {
      setStatus(err.message || String(err), "err");
    }
  }

  async function copyUpdateLink(id) {
    setStatus(`產生更新連結中：${id}`, "warn");
    const res = await api("adminMakeUpdateLink", { id }, { admin: true });
    const link = res.link || "";
    if (!link) throw new Error("沒有取得更新連結");
    await copyText(link);
    setStatus(`已複製更新連結：${id}\n${link}`, "ok");
  }

  async function setStatusAction(id, status) {
    setStatus(`狀態更新中：${id} -> ${status}`, "warn");
    const res = await api("adminSetStatus", { id, status }, { admin: true });

    setStatus(`狀態更新成功：${res.id}\nstatus=${res.status}\nat=${res.at}`, "ok");

    if (state.currentItem?.id === id) {
      await loadCardToCurrent(id);
    }
    if (val(el.searchInput)) {
      await doSearch();
    }
    await refreshStats();
    await refreshExpiryReminder();
  }

  async function createInviteForCard(id) {
    setStatus(`建立邀請碼中：${id}`, "warn");
    const plan = inferPlanForId(id);
    const days = val(el.inviteDays) || "7";

    const res = await api(
      "adminCreateInvite",
      { plan, days, count: 1 },
      { admin: true }
    );

    const link = res.form_link || res.link || "";
    if (link) await copyText(link);

    setStatus(
      [
        `邀請碼建立成功`,
        `for=${id}`,
        `invite=${res.invite_code || ""}`,
        `form_link=${res.form_link || ""}`
      ].join("\n"),
      "ok"
    );
  }

  function inferPlanForId(id) {
    const hit = state.items.find((x) => x.id === id) || state.currentItem;
    return (hit && String(hit.plan || "").trim()) || val(el.invitePlan) || "free";
  }

  function fillCurrent(item) {
    el.currentId.value = item?.id || "";
    el.currentName.value = item?.name || "";
    el.detailJson.value = JSON.stringify(item || {}, null, 2);

    const quickField = val(el.quickField);
    if (quickField && Object.prototype.hasOwnProperty.call(item || {}, quickField)) {
      el.quickValue.value = item[quickField] == null ? "" : String(item[quickField]);
    } else {
      el.quickValue.value = "";
    }
  }

  function renderResults(items) {
    const list = Array.isArray(items) ? items : [];
    el.resultCount.textContent = `${list.length} 筆`;

    if (!list.length) {
      el.resultList.innerHTML = `<div class="empty">查無資料，請重新搜尋。</div>`;
      return;
    }

    el.resultList.innerHTML = list.map(renderCard).join("");
  }

  function renderCard(item) {
    const id = esc(item.id || "");
    const name = esc(item.name || "未命名");
    const unit = esc(item.unit || "");
    const title = esc(item.title || "");
    const phone = esc(item.phone || "");
    const status = String(item.status || "").trim().toLowerCase();
    const statusClass = status === "active" ? "active" : "inactive";
    const statusText = status || "unknown";
    const plan = esc(item.plan || "—");
    const updatedAt = esc(item.updated_at || "—");
    const expiresAt = esc(item.expires_at || "—");
    const styleLabel = esc(buildStyleLabel(item));
    const expiryDays = calcDaysLeft(item.expires_at);
    const expiryChip = (expiryDays !== null && expiryDays >= 0 && expiryDays <= EXPIRY_REMIND_DAYS && status === "active")
      ? `<span class="chip warn">即將到期 ${expiryDays === 0 ? "今天" : `剩 ${expiryDays} 天`}</span>`
      : "";

    return `
      <article class="card">
        <div class="card-top">
          <div>
            <h3 class="name">${name}</h3>
            <div class="meta">
              <span class="chip">${id}</span>
              <span class="chip ${statusClass}">${esc(statusText)}</span>
              <span class="chip">${plan}</span>
              <span class="chip">${styleLabel || "—"}</span>
              ${expiryChip}
            </div>
          </div>
        </div>

        <div class="data">
          <div class="kv"><b>單位</b><span>${unit || "—"}</span></div>
          <div class="kv"><b>職稱</b><span>${title || "—"}</span></div>
          <div class="kv"><b>電話</b><span>${phone || "—"}</span></div>
          <div class="kv"><b>更新時間</b><span>${updatedAt}</span></div>
          <div class="kv"><b>到期日</b><span>${expiresAt}</span></div>
          <div class="kv"><b>瀏覽數</b><span>${esc(String(item.view_count ?? "0"))}</span></div>
        </div>

        <div class="card-actions">
          <button data-act="load" data-id="${id}" class="primary">載入</button>
          <button data-act="card-clean" data-id="${id}">智慧名片成品</button>
          <button data-act="share" data-id="${id}">交付卡</button>
          <button data-act="copy-delivery-link" data-id="${id}" class="warn">複製交付連結</button>
          <button data-act="copy-update-link" data-id="${id}">更新連結</button>
          <button data-act="activate" data-id="${id}" class="ok">啟用</button>
          <button data-act="inactivate" data-id="${id}" class="danger">停用</button>
          <button data-act="invite" data-id="${id}" class="warn">邀請碼</button>
        </div>
      </article>
    `;
  }

  async function fetchAllCardsByTenant() {
    const tenant = val(el.tenant) || DEFAULT_TENANT;
    const broadTerms = ["TW", tenant, "a", "小", "0"];
    let all = [];

    for (const q of broadTerms) {
      try {
        const res = await api("adminSearch", { q }, { admin: true });
        const items = normalizeSearchItems(res.items || []);
        all = all.concat(items);
      } catch (_) {}
    }

    const map = new Map();
    for (const item of all) {
      if (!item?.id) continue;
      if (!map.has(item.id)) map.set(item.id, item);
    }

    // 用 adminCard 補齊完整資訊
    const ids = Array.from(map.keys());
    const out = [];
    for (const id of ids) {
      try {
        const res = await api("adminCard", { id }, { admin: true });
        if (res?.item) out.push(normalizeAdminCardItem(res.item));
      } catch (_) {
        out.push(map.get(id));
      }
    }
    return out;
  }

  function normalizeSearchItems(items) {
    return (Array.isArray(items) ? items : []).map((item) => ({
      ...item,
      id: String(item.id || "").trim(),
      name: String(item.name || "").trim(),
      unit: String(item.unit || "").trim(),
      title: String(item.title || "").trim(),
      phone: String(item.phone || "").trim(),
      status: String(item.status || "").trim(),
      plan: String(item.plan || "").trim(),
      color: String(item.color || item.free_color || "").trim(),
      style: String(item.style || item.free_style || "").trim(),
      paper: String(item.paper || item.free_paper || "").trim(),
      premium_color: String(item.premium_color || "").trim(),
      updated_at: String(item.updated_at || "").trim(),
      expires_at: String(item.expires_at || "").trim(),
      view_count: item.view_count ?? "0"
    }));
  }

  function normalizeAdminCardItem(item) {
    return {
      ...item,
      id: String(item.id || "").trim(),
      name: String(item.name || "").trim(),
      unit: String(item.unit || "").trim(),
      title: String(item.title || "").trim(),
      phone: String(item.phone || "").trim(),
      email: String(item.email || "").trim(),
      status: String(item.status || "").trim(),
      plan: String(item.plan || "").trim(),
      color: String(item.color || item.free_color || "").trim(),
      style: String(item.style || item.free_style || "").trim(),
      paper: String(item.paper || item.free_paper || "").trim(),
      premium_color: String(item.premium_color || "").trim(),
      updated_at: String(item.updated_at || "").trim(),
      expires_at: String(item.expires_at || "").trim(),
      activated_at: String(item.activated_at || "").trim(),
      view_count: item.view_count ?? "0"
    };
  }

  function buildStyleLabel(item) {
    const plan = String(item.plan || "").trim().toLowerCase();
    const color = normalizeFreeColor(item.color || item.free_color || "");
    const style = normalizeStyle(item.style || item.free_style || "");
    const paper = normalizePaper(item.paper || item.free_paper || "");
    const premium = normalizePremium(item.premium_color || "");

    if (plan === "premium" || premium) {
      return `premium｜${premium || "p?"}`;
    }
    return `free｜${color || "c?"}｜${style || "s?"}｜${paper || "f?"}`;
  }

  function normalizeFreeColor(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return "";
    if (/^c[1-5]$/.test(s)) return s;
    const m1 = s.match(/^color-(\d)$/);
    if (m1) return `c${m1[1]}`;
    if (/^[1-5]$/.test(s)) return `c${s}`;
    if (s.includes("粉")) return "c1";
    if (s.includes("藍")) return "c2";
    if (s.includes("橘")) return "c3";
    if (s.includes("紫")) return "c4";
    if (s.includes("綠")) return "c5";
    return s;
  }

  function normalizeStyle(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return "";
    if (/^s[1-3]$/.test(s)) return s;
    if (s.includes("arch") || s.includes("拱")) return "s1";
    if (s.includes("flat") || s.includes("直")) return "s2";
    if (s.includes("spot") || s.includes("晨")) return "s3";
    return s;
  }

  function normalizePaper(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return "";
    if (/^f[1-3]$/.test(s)) return s;
    if (s.includes("paper-1") || s.includes("棉")) return "f1";
    if (s.includes("paper-2") || s.includes("象牙") || s.includes("顆")) return "f2";
    if (s.includes("paper-3") || s.includes("霧灰") || s.includes("亞麻")) return "f3";
    return s;
  }

  function normalizePremium(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return "";
    if (/^p[1-7]$/.test(s)) return s;
    if (/^[1-7]$/.test(s)) return `p${s}`;
    if (s.includes("胭")) return "p1";
    if (s.includes("酒")) return "p2";
    if (s.includes("深藍")) return "p3";
    if (s.includes("霧紫")) return "p4";
    if (s.includes("藍灰")) return "p5";
    if (s.includes("金")) return "p6";
    if (s.includes("褐")) return "p7";
    return s;
  }

  function buildCardCleanLink(id) {
    return `${ensureBaseUrl()}?id=${encodeURIComponent(id)}&view=1`;
  }

  function buildShareLink(id) {
    return `${ensureBaseUrl()}share.html?id=${encodeURIComponent(id)}`;
  }

  function ensureBaseUrl() {
    return DEFAULT_BASE_URL;
  }

  async function api(action, params = {}, opts = {}) {
    const admin = opts.admin !== false;
    const gas = val(el.gasUrl) || DEFAULT_GAS;
    const tenant = val(el.tenant) || DEFAULT_TENANT;
    const adminSecret = val(el.adminSecret) || DEFAULT_ADMIN_SECRET;

    if (!gas) throw new Error("GAS URL 未填。");

    const qs = new URLSearchParams();
    qs.set("action", action);

    if (!("tenant" in params) && tenant) {
      qs.set("tenant", tenant);
    }

    Object.keys(params || {}).forEach((k) => {
      const v = params[k];
      if (v == null) return;
      qs.set(k, String(v));
    });

    if (admin) {
      if (!adminSecret) throw new Error("ADMIN_SECRET 未填。");
      qs.set("admin_secret", adminSecret);
    }

    const url = `${gas}?${qs.toString()}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      throw new Error(`JSON 解析失敗\n${text.slice(0, 300)}`);
    }

    if (!json.ok) {
      throw new Error(json.error || "API 失敗");
    }

    return json;
  }

  function calcDaysLeft(raw) {
    const t = timeOf(raw);
    if (!t) return null;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const d = new Date(t);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    return Math.ceil((end - start) / 86400000);
  }

  function timeOf(raw) {
    const t = Date.parse(String(raw || ""));
    return Number.isFinite(t) ? t : 0;
  }

  function safeNum(v) {
    return String(v ?? "0");
  }

  function setStatus(msg, type = "") {
    el.statusBox.textContent = String(msg || "");
    el.statusBox.className = "statusbox";
    if (type === "ok") el.statusBox.classList.add("ok");
    else if (type === "warn") el.statusBox.classList.add("warn");
    else if (type === "err") el.statusBox.classList.add("err");
  }

  function val(node) {
    return String(node?.value || "").trim();
  }

  async function copyText(text) {
    const t = String(text || "");
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();