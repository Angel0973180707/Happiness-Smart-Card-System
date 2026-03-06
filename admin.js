/* ==========================================
 * HSC Admin Workspace — admin.js v522.2
 * COMPLETE OVERWRITE
 * ------------------------------------------
 * Connected:
 * - GAS v522.2
 * - ADMIN_SECRET preset
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "522.2";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_TENANT = "angel";
  const DEFAULT_ADMIN_SECRET = "ANGEL2026167777";

  const LS = {
    GAS: "hsc_admin_gas_v5222",
    TENANT: "hsc_admin_tenant_v5222",
    SECRET: "hsc_admin_secret_v5222"
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
    searchInput: $("#searchInput"),
    btnSearch: $("#btnSearch"),
    btnSearchId: $("#btnSearchId"),
    btnClearSearch: $("#btnClearSearch"),
    invitePlan: $("#invitePlan"),
    inviteDays: $("#inviteDays"),
    inviteCount: $("#inviteCount"),
    inviteNote: $("#inviteNote"),
    btnCreateInvite: $("#btnCreateInvite"),
    statusBox: $("#statusBox"),
    resultList: $("#resultList"),
    resultCount: $("#resultCount"),
    currentId: $("#currentId"),
    currentName: $("#currentName"),
    quickField: $("#quickField"),
    quickValue: $("#quickValue"),
    btnQuickUpdate: $("#btnQuickUpdate"),
    btnLoadCurrent: $("#btnLoadCurrent"),
    btnOpenCard: $("#btnOpenCard"),
    btnOpenShare: $("#btnOpenShare"),
    detailJson: $("#detailJson")
  };

  init();

  function init() {
    hydrateConfig();
    bindEvents();
    setStatus(`HSC Admin v${VERSION}\n設定已載入。`, "ok");
    renderResults([]);
  }

  function hydrateConfig() {
    el.gasUrl.value = localStorage.getItem(LS.GAS) || DEFAULT_GAS;
    el.tenant.value = localStorage.getItem(LS.TENANT) || DEFAULT_TENANT;
    el.adminSecret.value = localStorage.getItem(LS.SECRET) || DEFAULT_ADMIN_SECRET;
  }

  function saveConfig() {
    localStorage.setItem(LS.GAS, val(el.gasUrl));
    localStorage.setItem(LS.TENANT, val(el.tenant) || DEFAULT_TENANT);
    localStorage.setItem(LS.SECRET, val(el.adminSecret));
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

    el.btnStats?.addEventListener("click", async () => {
      try {
        setStatus("讀取統計中…", "warn");
        const res = await api("adminStats", {}, { admin: true });
        setStatus(
          [
            `統計讀取成功`,
            `tenant=${res.tenant || ""}`,
            `month=${res.month || ""}`,
            `total=${res.total ?? ""}`,
            `month_new=${res.month_new ?? ""}`,
            `active=${res.active ?? ""}`,
            `expired=${res.expired ?? ""}`
          ].join("\n"),
          "ok"
        );
      } catch (err) {
        setStatus(err.message || String(err), "err");
      }
    });

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
    el.btnOpenCard?.addEventListener("click", openCurrentCard);
    el.btnOpenShare?.addEventListener("click", openCurrentShare);

    el.resultList?.addEventListener("click", onResultAction);
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
      const items = Array.isArray(res.items) ? res.items : [];
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
      state.currentItem = res.item;
      fillCurrent(res.item);
      renderResults([normalizeFromAdminCard(res)]);
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
      const note = val(el.inviteNote);

      const res = await api(
        "adminCreateInvite",
        { plan, days, count, note },
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
      if (link) {
        await copyText(link);
      }
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
      const res = await api(
        "adminUpdate",
        { id, field, value },
        { admin: true }
      );

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
      state.currentItem = res.item;
      fillCurrent(res.item);
      setStatus(`重新載入完成：${id}`, "ok");
    } catch (err) {
      setStatus(err.message || String(err), "err");
    }
  }

  function openCurrentCard() {
    if (!state.currentItem?.id) {
      setStatus("請先載入卡片。", "warn");
      return;
    }
    const url = buildFrontUrl(`index.html?id=${encodeURIComponent(state.currentItem.id)}`);
    window.open(url, "_blank", "noopener");
  }

  function openCurrentShare() {
    if (!state.currentItem?.id) {
      setStatus("請先載入卡片。", "warn");
      return;
    }
    const url = buildFrontUrl(`share.html?id=${encodeURIComponent(state.currentItem.id)}`);
    window.open(url, "_blank", "noopener");
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

        case "card":
          window.open(buildFrontUrl(`index.html?id=${encodeURIComponent(id)}`), "_blank", "noopener");
          break;

        case "share":
          window.open(buildFrontUrl(`share.html?id=${encodeURIComponent(id)}`), "_blank", "noopener");
          break;

        case "copy-id":
          await copyText(id);
          setStatus(`已複製 ID：${id}`, "ok");
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
    const res = await api(
      "adminSetStatus",
      { id, status },
      { admin: true }
    );
    setStatus(`狀態更新成功：${res.id}\nstatus=${res.status}\nat=${res.at}`, "ok");

    if (state.currentItem?.id === id) {
      await loadCardToCurrent(id);
    }
    if (val(el.searchInput)) {
      await doSearch();
    }
  }

  async function createInviteForCard(id) {
    setStatus(`為後臺操作建立邀請碼中：${id}`, "warn");
    const plan = val(el.invitePlan) || "free";
    const days = val(el.inviteDays) || "7";
    const count = "1";
    const note = `from_card_${id}`;

    const res = await api(
      "adminCreateInvite",
      { plan, days, count, note },
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

  function normalizeFromAdminCard(res) {
    const item = res?.item || {};
    return {
      id: item.id || "",
      name: item.name || "",
      unit: item.unit || "",
      title: item.title || "",
      phone: item.phone || "",
      email: item.email || "",
      status: item.status || "",
      plan: item.plan || "",
      updated_at: item.updated_at || "",
      invite_code: item.invite_code || item.invite || "",
      card_link: buildFrontUrl(`index.html?id=${encodeURIComponent(item.id || "")}`),
      share_link: buildFrontUrl(`share.html?id=${encodeURIComponent(item.id || "")}`)
    };
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
    const email = esc(item.email || "");
    const plan = esc(item.plan || "");
    const updatedAt = esc(item.updated_at || "");
    const inviteCode = esc(item.invite_code || "");
    const status = String(item.status || "").trim().toLowerCase();
    const statusClass = status === "active" ? "active" : "inactive";

    return `
      <article class="card">
        <div class="card-top">
          <div>
            <h3 class="name">${name}</h3>
            <div class="meta">
              <span class="chip">${id}</span>
              <span class="chip ${statusClass}">${esc(status || "unknown")}</span>
              <span class="chip">${plan || "—"}</span>
            </div>
          </div>
        </div>

        <div class="data">
          <div class="kv"><b>單位</b><span>${unit || "—"}</span></div>
          <div class="kv"><b>職稱</b><span>${title || "—"}</span></div>
          <div class="kv"><b>電話</b><span>${phone || "—"}</span></div>
          <div class="kv"><b>Email</b><span>${email || "—"}</span></div>
          <div class="kv"><b>更新時間</b><span>${updatedAt || "—"}</span></div>
          <div class="kv"><b>邀請碼</b><span>${inviteCode || "—"}</span></div>
        </div>

        <div class="card-actions">
          <button data-act="load" data-id="${id}" class="primary">載入</button>
          <button data-act="card" data-id="${id}">開名片</button>
          <button data-act="share" data-id="${id}">開交付卡</button>
          <button data-act="copy-id" data-id="${id}">複製ID</button>
          <button data-act="copy-update-link" data-id="${id}">複製更新連結</button>
          <button data-act="activate" data-id="${id}" class="ok">啟用</button>
          <button data-act="inactivate" data-id="${id}" class="danger">停用</button>
          <button data-act="invite" data-id="${id}" class="warn">建邀請碼</button>
        </div>
      </article>
    `;
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

  function setStatus(msg, type = "") {
    el.statusBox.textContent = String(msg || "");
    el.statusBox.className = "statusbox";
    if (type === "ok") el.statusBox.classList.add("ok");
    else if (type === "warn") el.statusBox.classList.add("warn");
    else if (type === "err") el.statusBox.classList.add("err");
  }

  function buildFrontUrl(path) {
    const gas = val(el.gasUrl) || DEFAULT_GAS;
    try {
      const u = new URL(gas);
      const maybeBase = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
      return new URL(path, maybeBase).toString();
    } catch (_) {
      return `https://angel0973180707.github.io/Happiness-Smart-Card-System/${path}`;
    }
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