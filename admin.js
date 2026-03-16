/* =========================================================
 * HSC Admin Console v1.4
 * admin.js
 * COMPLETE OVERWRITE
 * ---------------------------------------------------------
 * 注意：
 * 此版 admin.js 依賴 GAS 已存在 process_status 欄位，
 * 且 adminUpdate / leadUpdate 可寫入該欄位。
 * ======================================================= */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "HSC Admin Console v1.4",
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FORM_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/form.html",
    FETCH_TIMEOUT_MS: 20000,
    ADMIN_KEY_STORAGE: "hsc_admin_key_v1"
  };

  const state = {
    tab: "lead",
    stats: null,

    leadQuery: "",
    inviteQuery: "",
    cardQuery: "",
    billingQuery: "",
    billingFilter: "all",

    showTestData: false,

    leadProcessFilter: "pending",
    cardProcessFilter: "pending",
    billingProcessFilter: "pending",

    leads: [],
    invites: [],
    cards: [],
    payments: [],

    currentLead: null,
    currentInvite: null,
    currentCard: null,

    updateLinks: {}, // { [cardId]: { update_link, expire_at, update_token, updated_at } }
    cardExpandedMap: {} // { [cardId]: boolean }
  };

  const root = ensureRoot_();
  renderShell_();
  bindShellEvents_();
  boot_();

  function ensureRoot_() {
    let el = document.getElementById("app");
    if (el) return el;
    el = document.createElement("div");
    el.id = "app";
    document.body.innerHTML = "";
    document.body.appendChild(el);
    return el;
  }

  function renderShell_() {
    root.innerHTML = `
      <div class="hsc-admin">
        <div class="topbar">
          <div class="brand">
            <div class="brand-title">天使幸福智慧名片｜客服後台</div>
            <div class="brand-sub">
              ${CONFIG.VERSION}<br>
              第一入口是 Lead 申請清單。整合邀請碼、卡片管理、付款管理、LINE通知與系統統計。
            </div>
          </div>

          <div class="card">
            <div class="card-title">後台授權</div>
            <div class="card-sub">請先輸入 admin_key，系統會暫存於目前瀏覽器。</div>
            <div class="top-auth">
              <input class="input" id="adminKeyInput" type="password" placeholder="請輸入 admin_key">
              <button class="btn primary" id="btnSaveAdminKey">儲存授權</button>
            </div>
            <div class="hint mt8">若沒有設定 admin_key，後台查詢與操作都會被 GAS 擋下。</div>
          </div>

          <div class="top-actions">
            <button class="btn soft" id="btnRefreshAll">重新整理</button>
            <button class="btn soft" id="btnGoHub">開名片館</button>
            <button class="btn soft" id="btnOpenForm">開申請表單</button>
          </div>
        </div>

        <div class="tabbar">
          <button class="tab-btn active" data-tab="lead">Lead申請</button>
          <button class="tab-btn" data-tab="invite">邀請碼</button>
          <button class="tab-btn" data-tab="card">卡片管理</button>
          <button class="tab-btn" data-tab="billing">付款管理</button>
          <button class="tab-btn" data-tab="line">LINE通知</button>
          <button class="tab-btn" data-tab="stats">系統統計</button>
        </div>

        <section class="panel active" id="panel-lead"></section>
        <section class="panel" id="panel-invite"></section>
        <section class="panel" id="panel-card"></section>
        <section class="panel" id="panel-billing"></section>
        <section class="panel" id="panel-line"></section>
        <section class="panel" id="panel-stats"></section>
      </div>

      <div class="drawer-mask" id="drawerMask"></div>
      <aside class="drawer" id="drawer">
        <div class="drawer-head">
          <div class="drawer-title" id="drawerTitle">詳細資料</div>
          <button class="btn" id="drawerClose">關閉</button>
        </div>
        <div class="drawer-body" id="drawerBody"></div>
      </aside>
    `;

    qs("adminKeyInput").value = getAdminKey_();

    renderLeadPanel_();
    renderInvitePanel_();
    renderCardPanel_();
    renderBillingPanel_();
    renderLinePanel_();
    renderStatsPanel_();
  }

  function bindShellEvents_() {
    root.addEventListener("click", onRootClick_);
    root.addEventListener("input", onRootInput_);
    root.addEventListener("change", onRootChange_);
    qs("drawerClose").addEventListener("click", closeDrawer_);
    qs("drawerMask").addEventListener("click", closeDrawer_);
  }

  async function boot_() {
    await Promise.allSettled([
      loadStats_(),
      loadLeads_(),
      loadInvites_(),
      loadCards_(),
      loadPayments_()
    ]);
    renderLinePanel_();
    renderStatsPanel_();
  }

  function onRootInput_(e) {
    const t = e.target;
    if (!t) return;
    if (t.id === "leadQuery") state.leadQuery = t.value;
    if (t.id === "inviteQuery") state.inviteQuery = t.value;
    if (t.id === "cardQuery") state.cardQuery = t.value;
    if (t.id === "billingQuery") state.billingQuery = t.value;
    if (t.id === "billingFilter") state.billingFilter = t.value;
  }

  function onRootChange_(e) {
    const t = e.target;
    if (!t) return;

    if (t.id === "toggleShowTestData") {
      state.showTestData = !!t.checked;
      refreshVisiblePanels_();
      return;
    }

    if (t.id === "leadProcessFilter") {
      state.leadProcessFilter = t.value || "pending";
      renderLeadPanel_();
      switchTab_(state.tab);
      return;
    }

    if (t.id === "cardProcessFilter") {
      state.cardProcessFilter = t.value || "pending";
      renderCardPanel_();
      switchTab_(state.tab);
      return;
    }

    if (t.id === "billingProcessFilter") {
      state.billingProcessFilter = t.value || "pending";
      renderBillingPanel_();
      switchTab_(state.tab);
      return;
    }

    if (t.id === "billingFilter") {
      state.billingFilter = t.value || "all";
    }
  }

  async function onRootClick_(e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const tab = btn.dataset.tab;
    const act = btn.dataset.act;

    if (tab) {
      switchTab_(tab);
      return;
    }

    if (btn.id === "btnSaveAdminKey") {
      const v = text_(qs("adminKeyInput").value);
      if (!v) {
        alert("請先輸入 admin_key");
        return;
      }
      localStorage.setItem(CONFIG.ADMIN_KEY_STORAGE, v);
      toast_("已儲存 admin_key");
      return;
    }

    if (btn.id === "btnRefreshAll") {
      await Promise.allSettled([
        loadStats_(),
        loadLeads_(),
        loadInvites_(),
        loadCards_(),
        loadPayments_()
      ]);
      renderLinePanel_();
      renderStatsPanel_();
      toast_("已重新整理");
      return;
    }

    if (btn.id === "btnGoHub") {
      window.open(CONFIG.HUB_URL, "_blank");
      return;
    }

    if (btn.id === "btnOpenForm") {
      window.open(CONFIG.FORM_URL, "_blank");
      return;
    }

    if (btn.id === "btnSearchLead") return await loadLeads_();
    if (btn.id === "btnReloadLead") {
      state.leadQuery = "";
      renderLeadPanel_();
      return await loadLeads_();
    }

    if (btn.id === "btnSearchInvite") return await loadInvites_();
    if (btn.id === "btnReloadInvite") {
      state.inviteQuery = "";
      renderInvitePanel_();
      return await loadInvites_();
    }

    if (btn.id === "btnSearchCard") return await loadCards_();
    if (btn.id === "btnReloadCard") {
      state.cardQuery = "";
      renderCardPanel_();
      return await loadCards_();
    }

    if (btn.id === "btnSearchBilling") return await loadPayments_();
    if (btn.id === "btnReloadBilling") {
      state.billingQuery = "";
      state.billingFilter = "all";
      renderBillingPanel_();
      return await loadPayments_();
    }

    if (!act) return;

    try {
      if (act === "lead-detail") return await openLeadDetail_(btn.dataset.id);
      if (act === "lead-invite") return await createInviteFromLead_(btn.dataset.id);
      if (act === "lead-copy-invite") return copyLeadInvite_(btn.dataset.id);
      if (act === "lead-copy-form") return copyLeadFormLink_(btn.dataset.id);
      if (act === "lead-copy-script") return copyLeadScript_(btn.dataset.id);
      if (act === "lead-open-card") return openCard_(btn.dataset.cardId);
      if (act === "lead-process") return await updateLeadProcessStatus_(btn.dataset.id, btn.dataset.value);

      if (act === "invite-detail") return await openInviteDetail_(btn.dataset.id);
      if (act === "invite-copy-code") return copyText_(btn.dataset.id, "已複製邀請碼");
      if (act === "invite-copy-both") return copyInviteBundle_(btn.dataset.id);
      if (act === "invite-disable") return await disableInvite_(btn.dataset.id);

      if (act === "card-detail") return await openCardDetail_(btn.dataset.id);
      if (act === "card-open") return openCard_(btn.dataset.id);
      if (act === "card-open-clean") return openCardClean_(btn.dataset.id);
      if (act === "card-copy-link") return copyCardLink_(btn.dataset.id);
      if (act === "card-gen-update") return await genCardUpdateLink_(btn.dataset.id);
      if (act === "card-copy-update") return copyCardUpdateLink_(btn.dataset.id);
      if (act === "card-activate") return await updateCardStatus_(btn.dataset.id, "active");
      if (act === "card-inactivate") return await updateCardStatus_(btn.dataset.id, "inactive");
      if (act === "card-extend") return await extendCard_(btn.dataset.id);
      if (act === "card-process") return await updateCardProcessStatus_(btn.dataset.id, btn.dataset.value);
      if (act === "card-toggle-expand") return toggleCardExpand_(btn.dataset.id);

      if (act === "billing-detail") return await openBillingDetail_(btn.dataset.id);
      if (act === "billing-paid") return await markBillingPaid_(btn.dataset.id);
      if (act === "billing-open") return openCard_(btn.dataset.id);
      if (act === "billing-process") return await updateBillingProcessStatus_(btn.dataset.id, btn.dataset.value);

      if (act === "drawer-copy-update") return copyCurrentCardUpdateLink_();
      if (act === "drawer-gen-update") return await genCurrentCardUpdateLink_();
    } catch (err) {
      console.error(err);
      alert(err.message || "操作失敗");
    }
  }

  function switchTab_(tab) {
    state.tab = tab;
    qsa_(".tab-btn").forEach(el => el.classList.toggle("active", el.dataset.tab === tab));
    qsa_(".panel").forEach(el => el.classList.remove("active"));
    const panel = qs(`panel-${tab}`);
    if (panel) panel.classList.add("active");
  }

  function renderLeadPanel_() {
    qs("panel-lead").innerHTML = `
      <div class="card">
        <div class="card-title">Lead 申請清單</div>
        <div class="card-sub">
          客服第一工作入口。請客戶先回報申請編號 lead_id，再由客服搜尋該筆資料，產生邀請碼並回覆客戶。
        </div>
        <div class="search-row">
          <input class="input" id="leadQuery" placeholder="可搜尋：申請編號、姓名、電話、Email、Line ID、備註、邀請碼、卡號、來源代理、推薦來源" value="${escapeHtml_(state.leadQuery)}">
          <button class="btn primary" id="btnSearchLead">搜尋Lead</button>
          <button class="btn soft" id="btnReloadLead">重新載入</button>
        </div>
        <div class="mt12">${renderMinorControls_("lead")}</div>
        <div class="footer-note">建議客服優先搜尋：申請編號 lead_id。</div>
      </div>

      <div class="card">
        <div class="card-title">待辦清單</div>
        <div class="card-sub">每一列直接完成：查看詳情 → 產生邀請碼 → 複製邀請碼／表單連結／客服話術。</div>
        <div class="list">${renderLeadItems_()}</div>
      </div>
    `;
  }

  function renderInvitePanel_() {
    qs("panel-invite").innerHTML = `
      <div class="card">
        <div class="card-title">邀請碼清單</div>
        <div class="card-sub">
          這裡保留邀請碼管理，但不是第一入口。客服主要仍以 Lead 申請清單處理工作。
        </div>
        <div class="search-row">
          <input class="input" id="inviteQuery" placeholder="可搜尋：邀請碼、來源代理、推薦來源、使用卡號" value="${escapeHtml_(state.inviteQuery)}">
          <button class="btn primary" id="btnSearchInvite">搜尋邀請碼</button>
          <button class="btn soft" id="btnReloadInvite">重新載入</button>
        </div>
        <div class="mt12">${renderMinorControls_("invite")}</div>
      </div>

      <div class="card">
        <div class="card-title">Invite 清單</div>
        <div class="list">${renderInviteItems_()}</div>
      </div>
    `;
  }

  function renderCardPanel_() {
    qs("panel-card").innerHTML = `
      <div class="card">
        <div class="card-title">卡片管理</div>
        <div class="card-sub">
          這裡用來查看卡片、開啟名片、產生更新頁、啟用／停用／延長期限。
        </div>
        <div class="search-row">
          <input class="input" id="cardQuery" placeholder="可搜尋：卡號、姓名、單位、職稱、電話、方案、來源代理" value="${escapeHtml_(state.cardQuery)}">
          <button class="btn primary" id="btnSearchCard">搜尋卡片</button>
          <button class="btn soft" id="btnReloadCard">重新載入</button>
        </div>
        <div class="mt12">${renderMinorControls_("card")}</div>
      </div>

      <div class="card">
        <div class="card-title">卡片列表</div>
        <div class="list">${renderCardItems_()}</div>
      </div>
    `;
  }

  function renderBillingPanel_() {
    const p = calcPaymentStats_();

    qs("panel-billing").innerHTML = `
      <div class="card">
        <div class="card-title">付款管理</div>
        <div class="card-sub">
          查看未付款、已提醒、已鎖卡、已付款，並可直接標記為已付款。
        </div>

        <div class="stats">
          <div class="stat"><div class="stat-k">未付款</div><div class="stat-v">${p.unpaid}</div></div>
          <div class="stat"><div class="stat-k">已提醒</div><div class="stat-v">${p.reminded}</div></div>
          <div class="stat"><div class="stat-k">已鎖卡</div><div class="stat-v">${p.locked}</div></div>
          <div class="stat"><div class="stat-k">已付款</div><div class="stat-v">${p.paid}</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">付款清單</div>
        <div class="card-sub">
          可搜尋 ID／姓名／電話，並依付款狀態切換篩選。
        </div>
        <div class="search-row">
          <input class="input" id="billingQuery" placeholder="可搜尋：ID、姓名、電話、備註" value="${escapeHtml_(state.billingQuery)}">
          <select class="select" id="billingFilter">
            <option value="all" ${state.billingFilter === "all" ? "selected" : ""}>全部</option>
            <option value="unpaid" ${state.billingFilter === "unpaid" ? "selected" : ""}>未付款</option>
            <option value="reminded" ${state.billingFilter === "reminded" ? "selected" : ""}>已提醒</option>
            <option value="locked" ${state.billingFilter === "locked" ? "selected" : ""}>已鎖卡</option>
            <option value="paid" ${state.billingFilter === "paid" ? "selected" : ""}>已付款</option>
          </select>
          <button class="btn primary" id="btnSearchBilling">搜尋付款</button>
        </div>
        <div class="mt12">${renderMinorControls_("billing")}</div>
        <div class="mt12 item-actions">
          <button class="btn soft" id="btnReloadBilling">重新載入</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">付款工作清單</div>
        <div class="list">${renderBillingItems_()}</div>
      </div>
    `;
  }

  function renderLinePanel_() {
    const lineItems = buildLineNotifyItems_();

    qs("panel-line").innerHTML = `
      <div class="card">
        <div class="card-title">LINE通知監控</div>
        <div class="card-sub">
          顯示系統發送的付款提醒與鎖卡通知時間，方便客服追蹤。
        </div>
        <div class="mt12">${renderMinorControls_("line")}</div>
      </div>

      <div class="card">
        <div class="card-title">通知紀錄</div>
        <div class="list">
          ${lineItems.length ? lineItems.map(item => `
            <div class="item">
              <div class="item-top">
                <div>
                  <div class="item-title">${escapeHtml_(item.name || "未填姓名")}</div>
                  <div class="mt8 mono">${escapeHtml_(item.id || "-")}</div>
                </div>
                <div class="item-badges">
                  ${item.badges.join("")}
                  ${isTestBadge_(item)}
                  ${processStatusBadge_(item.process_status)}
                </div>
              </div>

              <div class="grid-3">
                ${kv_("提醒1", item.payment_remind_1_at)}
                ${kv_("提醒2", item.payment_remind_2_at)}
                ${kv_("提醒3", item.payment_remind_3_at)}
                ${kv_("鎖卡通知", item.lock_notice_sent_at)}
                ${kv_("付款狀態", billingStatusText_(item.billing_status))}
                ${kv_("卡片狀態", cardStatusText_(item.status))}
              </div>

              <div class="item-actions">
                <button class="btn soft" data-act="billing-detail" data-id="${escapeAttr_(item.id)}">查看付款詳情</button>
                <button class="btn ok" data-act="card-open" data-id="${escapeAttr_(item.id)}">開名片</button>
              </div>
            </div>
          `).join("") : `<div class="empty">目前沒有 LINE 通知資料。</div>`}
        </div>
      </div>
    `;
  }

  function renderStatsPanel_() {
    const p = calcPaymentStats_();
    const leads = getFilteredLeads_();
    const invites = getFilteredInvites_();
    const cards = getFilteredCards_();
    const totalLeads = leads.length;
    const totalInvites = invites.length;
    const totalCards = cards.length;
    const paidRate = totalCards ? Math.round((p.paid / totalCards) * 100) : 0;
    const lockedRate = totalCards ? Math.round((p.locked / totalCards) * 100) : 0;

    qs("panel-stats").innerHTML = `
      <div class="card">
        <div class="card-title">系統統計</div>
        <div class="card-sub">
          後台營運總覽：Lead、Invite、卡片、付款率、鎖卡率。
        </div>

        <div class="mt12">${renderMinorControls_("stats")}</div>

        <div class="stats-6">
          <div class="stat"><div class="stat-k">Lead數</div><div class="stat-v">${totalLeads}</div></div>
          <div class="stat"><div class="stat-k">Invite數</div><div class="stat-v">${totalInvites}</div></div>
          <div class="stat"><div class="stat-k">卡片數</div><div class="stat-v">${totalCards}</div></div>
          <div class="stat"><div class="stat-k">已付款數</div><div class="stat-v">${p.paid}</div></div>
          <div class="stat"><div class="stat-k">付款率</div><div class="stat-v">${paidRate}%</div></div>
          <div class="stat"><div class="stat-k">鎖卡率</div><div class="stat-v">${lockedRate}%</div></div>
        </div>
      </div>
    `;
  }

  function renderMinorControls_(scope) {
    const showProcessLead = scope === "lead";
    const showProcessCard = scope === "card";
    const showProcessBilling = scope === "billing";

    return `
      <div class="item-actions">
        ${showProcessLead ? renderProcessFilterSelect_("leadProcessFilter", state.leadProcessFilter) : ""}
        ${showProcessCard ? renderProcessFilterSelect_("cardProcessFilter", state.cardProcessFilter) : ""}
        ${showProcessBilling ? renderProcessFilterSelect_("billingProcessFilter", state.billingProcessFilter) : ""}
        <label class="hint" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="toggleShowTestData" ${state.showTestData ? "checked" : ""}>
          顯示測試資料
        </label>
      </div>
    `;
  }

  function renderProcessFilterSelect_(id, value) {
    return `
      <select class="select" id="${id}">
        <option value="all" ${value === "all" ? "selected" : ""}>全部</option>
        <option value="pending" ${value === "pending" ? "selected" : ""}>待處理</option>
        <option value="done" ${value === "done" ? "selected" : ""}>已處理</option>
        <option value="archived" ${value === "archived" ? "selected" : ""}>已封存</option>
      </select>
    `;
  }

  function renderLeadItems_() {
    const rows = getFilteredLeads_();
    if (!rows.length) return `<div class="empty">目前沒有符合條件的 Lead 資料。</div>`;

    return rows.map(item => {
      const statusBadge = leadStatusBadge_(item.status);
      const canOpenCard = !!text_(item.card_id);
      const inviteCode = text_(item.invite_code);

      return `
        <div class="item">
          <div class="item-top">
            <div>
              <div class="item-title">${escapeHtml_(text_(item.customer_name) || text_(item.name) || "未填姓名")}</div>
              <div class="mt8 mono">${escapeHtml_(text_(item.lead_id) || "-")}</div>
            </div>
            <div class="item-badges">
              ${statusBadge}
              ${processStatusBadge_(item.process_status)}
              ${inviteCode ? `<span class="badge ok">已產邀請碼</span>` : `<span class="badge warn">待產邀請碼</span>`}
              ${canOpenCard ? `<span class="badge ok">已成卡</span>` : ``}
              ${isTestBadge_(item)}
            </div>
          </div>

          <div class="grid">
            ${kv_("申請編號", item.lead_id, true)}
            ${kv_("流程", processStatusText_(item.process_status))}
            ${kv_("狀態", item.status)}
            ${kv_("姓名", item.customer_name || item.name)}
            ${kv_("電話", item.phone)}
            ${kv_("Email", item.email)}
            ${kv_("Line ID", item.line_id)}
            ${kv_("備註", item.note)}
            ${kv_("邀請碼", item.invite_code, true)}
            ${kv_("成卡卡號", item.card_id, true)}
            ${kv_("推薦來源", item.referrer)}
            ${kv_("來源代理", item.service_agent)}
            ${kv_("名單來源", item.source)}
            ${kv_("建立時間", formatDateTime_(item.created_at))}
            ${kv_("更新時間", formatDateTime_(item.updated_at))}
          </div>

          <div class="item-actions">
            <button class="btn soft" data-act="lead-detail" data-id="${escapeAttr_(item.lead_id)}">查看詳情</button>
            <button class="btn primary" data-act="lead-invite" data-id="${escapeAttr_(item.lead_id)}">產生邀請碼</button>
            <button class="btn" data-act="lead-copy-invite" data-id="${escapeAttr_(item.lead_id)}" ${inviteCode ? "" : "disabled"}>複製邀請碼</button>
            <button class="btn" data-act="lead-copy-form" data-id="${escapeAttr_(item.lead_id)}">複製表單連結</button>
            <button class="btn" data-act="lead-copy-script" data-id="${escapeAttr_(item.lead_id)}">複製客服話術</button>
            ${canOpenCard ? `<button class="btn ok" data-act="lead-open-card" data-card-id="${escapeAttr_(item.card_id)}">開名片</button>` : ``}
            ${renderProcessButtons_("lead", item.lead_id)}
          </div>
        </div>
      `;
    }).join("");
  }

  function renderInviteItems_() {
    const rows = getFilteredInvites_();
    if (!rows.length) return `<div class="empty">目前沒有符合條件的 Invite 資料。</div>`;

    return rows.map(item => `
      <div class="item">
        <div class="item-top">
          <div>
            <div class="item-title mono">${escapeHtml_(text_(item.invite_code) || "-")}</div>
            <div class="mt8">${escapeHtml_(inviteStatusText_(item.status))}</div>
          </div>
          <div class="item-badges">
            ${inviteStatusBadge_(item.status)}
            ${isTestBadge_(item)}
          </div>
        </div>

        <div class="grid">
          ${kv_("邀請碼", item.invite_code, true)}
          ${kv_("狀態", item.status)}
          ${kv_("使用卡號", item.used_by_id || item.card_id, true)}
          ${kv_("推薦來源", item.referrer)}
          ${kv_("來源代理", item.service_agent)}
          ${kv_("名單來源", item.source)}
          ${kv_("建立時間", formatDateTime_(item.created_at))}
          ${kv_("使用時間", formatDateTime_(item.used_at))}
          ${kv_("到期時間", formatDateTime_(item.expires_at))}
        </div>

        <div class="item-actions">
          <button class="btn soft" data-act="invite-detail" data-id="${escapeAttr_(item.invite_code)}">查看</button>
          <button class="btn" data-act="invite-copy-code" data-id="${escapeAttr_(item.invite_code)}">複製邀請碼</button>
          <button class="btn" data-act="invite-copy-both" data-id="${escapeAttr_(item.invite_code)}">複製邀請碼＋表單連結</button>
          <button class="btn bad" data-act="invite-disable" data-id="${escapeAttr_(item.invite_code)}">停用邀請碼</button>
        </div>
      </div>
    `).join("");
  }

  function renderCardItems_() {
    const rows = getFilteredCards_();
    if (!rows.length) return `<div class="empty">目前沒有符合條件的卡片資料。</div>`;

    return rows.map(item => {
      const isExpanded = !!state.cardExpandedMap[text_(item.id)];
      const cache = getCardUpdateCache_(item.id);
      const hasUpdate = !!text_(cache.update_link);

      return `
        <div class="item">
          <div class="item-top">
            <div>
              <div class="item-title">${escapeHtml_(text_(item.name) || "未命名卡片")}</div>
              <div class="mt8 mono">${escapeHtml_(text_(item.id) || "-")}</div>
            </div>
            <div class="item-badges">
              ${cardStatusBadge_(item.status)}
              ${processStatusBadge_(item.process_status)}
              <span class="badge">${escapeHtml_(planText_(item.plan))}</span>
              ${hasUpdate ? `<span class="badge ok">有更新頁</span>` : ``}
              ${isTestBadge_(item)}
            </div>
          </div>

          <div class="grid">
            ${kv_("卡號", item.id, true)}
            ${kv_("姓名", item.name)}
            ${kv_("電話", item.phone)}
            ${kv_("方案", planText_(item.plan))}
            ${kv_("狀態", cardStatusText_(item.status))}
            ${kv_("付款", billingStatusText_(item.billing_status))}
            ${kv_("流程", processStatusText_(item.process_status))}
            ${kv_("到期日", formatDateTime_(item.expires_at))}
          </div>

          ${isExpanded ? `
            <div class="grid mt12">
              ${kv_("單位", item.unit)}
              ${kv_("職稱", item.title)}
              ${kv_("Email", item.email)}
              ${kv_("推薦來源", item.referrer)}
              ${kv_("來源代理", item.service_agent)}
              ${kv_("名單來源", item.source)}
              ${kv_("邀請碼", item.invite_code, true)}
              ${kv_("建立時間", formatDateTime_(item.created_at))}
              ${kv_("更新時間", formatDateTime_(item.updated_at))}
              ${kv_("更新頁", cache.update_link || "-")}
              ${kv_("更新頁到期", formatDateTime_(cache.expire_at))}
            </div>
          ` : ``}

          <div class="item-actions">
            <button class="btn soft" data-act="card-toggle-expand" data-id="${escapeAttr_(item.id)}">${isExpanded ? "收起" : "展開更多"}</button>
            ${isExpanded ? `
              <button class="btn soft" data-act="card-detail" data-id="${escapeAttr_(item.id)}">查看</button>
              <button class="btn ok" data-act="card-open" data-id="${escapeAttr_(item.id)}">開名片</button>
              <button class="btn ok" data-act="card-open-clean" data-id="${escapeAttr_(item.id)}">開乾淨名片</button>
              <button class="btn" data-act="card-copy-link" data-id="${escapeAttr_(item.id)}">複製名片連結</button>
              <button class="btn primary" data-act="card-gen-update" data-id="${escapeAttr_(item.id)}">產生更新頁</button>
              <button class="btn" data-act="card-copy-update" data-id="${escapeAttr_(item.id)}" ${hasUpdate ? "" : ""}>複製更新頁</button>
              <button class="btn warn" data-act="card-activate" data-id="${escapeAttr_(item.id)}">啟用卡片</button>
              <button class="btn bad" data-act="card-inactivate" data-id="${escapeAttr_(item.id)}">停用卡片</button>
              <button class="btn" data-act="card-extend" data-id="${escapeAttr_(item.id)}">延長期限</button>
              ${renderProcessButtons_("card", item.id)}
            ` : ``}
          </div>
        </div>
      `;
    }).join("");
  }

  function renderBillingItems_() {
    const rows = getFilteredPayments_();
    if (!rows.length) return `<div class="empty">目前沒有符合條件的付款資料。</div>`;

    return rows.map(item => `
      <div class="item">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHtml_(text_(item.name) || "未填姓名")}</div>
            <div class="mt8 mono">${escapeHtml_(text_(item.id) || "-")}</div>
          </div>
          <div class="item-badges">
            ${billingBadge_(item)}
            ${processStatusBadge_(item.process_status)}
            ${isTestBadge_(item)}
          </div>
        </div>

        <div class="grid">
          ${kv_("卡號", item.id, true)}
          ${kv_("姓名", item.name)}
          ${kv_("電話", item.phone)}
          ${kv_("方案", planText_(item.plan))}
          ${kv_("卡片狀態", cardStatusText_(item.status))}
          ${kv_("付款狀態", billingStatusText_(item.billing_status))}
          ${kv_("流程", processStatusText_(item.process_status))}
          ${kv_("發卡時間", formatDateTime_(item.activated_at))}
          ${kv_("付款期限", formatDateTime_(item.payment_due_at))}
          ${kv_("提醒次數", item.payment_remind_count)}
          ${kv_("鎖卡時間", formatDateTime_(item.payment_lock_at))}
          ${kv_("付款時間", formatDateTime_(item.payment_paid_at))}
          ${kv_("鎖卡原因", item.lock_reason)}
          ${kv_("付款備註", item.payment_note)}
        </div>

        <div class="item-actions">
          <button class="btn soft" data-act="billing-detail" data-id="${escapeAttr_(item.id)}">查看付款詳情</button>
          ${text_(item.billing_status).toLowerCase() !== "paid" ? `<button class="btn primary" data-act="billing-paid" data-id="${escapeAttr_(item.id)}">標記已付款</button>` : ``}
          <button class="btn ok" data-act="billing-open" data-id="${escapeAttr_(item.id)}">開名片</button>
          ${renderProcessButtons_("billing", item.id)}
        </div>
      </div>
    `).join("");
  }

  async function openLeadDetail_(leadId) {
    const item = await api_("leadGet", { lead_id: leadId }) || findLead_(leadId) || {};
    state.currentLead = item;

    openDrawer_("Lead 詳情", `
      ${detailSection_("Lead 基本資料", [
        ["申請編號", item.lead_id, true],
        ["姓名", item.customer_name || item.name],
        ["電話", item.phone],
        ["Email", item.email],
        ["Line ID", item.line_id],
        ["備註", item.note],
        ["流程", processStatusText_(item.process_status)],
        ["狀態", item.status],
        ["邀請碼", item.invite_code, true],
        ["成卡卡號", item.card_id, true],
        ["推薦來源", item.referrer],
        ["來源代理", item.service_agent],
        ["代理類型", item.agent_type],
        ["名單來源", item.source],
        ["建立時間", formatDateTime_(item.created_at)],
        ["更新時間", formatDateTime_(item.updated_at)]
      ])}

      <div class="mt16 item-actions">
        <button class="btn primary" data-act="lead-invite" data-id="${escapeAttr_(item.lead_id || "")}">產生邀請碼</button>
        <button class="btn" data-act="lead-copy-form" data-id="${escapeAttr_(item.lead_id || "")}">複製表單連結</button>
        <button class="btn" data-act="lead-copy-script" data-id="${escapeAttr_(item.lead_id || "")}">複製客服話術</button>
        ${renderProcessButtons_("lead", item.lead_id || "")}
      </div>
    `);
  }

  async function createInviteFromLead_(leadId) {
    const lead = findLead_(leadId) || await api_("leadGet", { lead_id: leadId }) || {};
    if (!text_(lead.lead_id)) throw new Error("找不到該筆 Lead 資料");

    const inviteRes = await api_("inviteCreate", {
      tenant: "angel",
      count: 1,
      days: 30,
      referrer: text_(lead.referrer),
      service_agent: text_(lead.service_agent),
      agent_type: text_(lead.agent_type),
      source: text_(lead.source || "lead")
    });

    const inviteCode = text_(inviteRes?.codes?.[0]) || text_(inviteRes?.invite_code);
    if (!inviteCode) throw new Error("邀請碼產生失敗");

    await api_("leadMarkInvited", {
      lead_id: lead.lead_id,
      invite_code: inviteCode,
      status: "invited"
    });

    updateLeadLocal_(lead.lead_id, {
      invite_code: inviteCode,
      status: "invited"
    });

    toast_(`已產生邀請碼：${inviteCode}`);
    await Promise.allSettled([loadLeads_(), loadInvites_()]);
  }

  function copyLeadInvite_(leadId) {
    const item = findLead_(leadId);
    const code = text_(item?.invite_code);
    if (!code) {
      alert("這筆 Lead 目前還沒有邀請碼，請先按「產生邀請碼」。");
      return;
    }
    copyText_(code, "已複製邀請碼");
  }

  function copyLeadFormLink_(leadId) {
    const item = findLead_(leadId);
    copyText_(buildFormLink_(text_(item?.invite_code)), "已複製表單連結");
  }

  function copyLeadScript_(leadId) {
    const item = findLead_(leadId);
    if (!item) return;

    const inviteCode = text_(item.invite_code);
    const formLink = buildFormLink_(inviteCode);
    const script = [
      `${text_(item.customer_name || item.name) || "您好"}，您好～`,
      `這是您的智慧名片填寫入口。`,
      inviteCode ? `邀請碼：${inviteCode}` : `若您尚未收到邀請碼，請先告知客服您的申請編號：${text_(item.lead_id)}`,
      `填寫連結：${formLink}`,
      `申請編號：${text_(item.lead_id)}`,
      `若填寫過程中有問題，直接回覆客服即可。`
    ].join("\n");

    copyText_(script, "已複製客服話術");
  }

  async function updateLeadProcessStatus_(leadId, processStatus) {
    if (!text_(leadId)) return;
    await api_("leadUpdate", { lead_id: leadId, process_status: normalizeProcessStatus_(processStatus) });
    updateLeadLocal_(leadId, { process_status: normalizeProcessStatus_(processStatus) });
    if (state.currentLead && text_(state.currentLead.lead_id) === text_(leadId)) {
      state.currentLead.process_status = normalizeProcessStatus_(processStatus);
      if (qs("drawer").classList.contains("show")) await openLeadDetail_(leadId);
    }
    renderLeadPanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
    toast_("Lead 流程已更新");
  }

  async function openInviteDetail_(inviteCode) {
    const item = await api_("inviteGet", { invite_code: inviteCode }) || findInvite_(inviteCode) || {};
    state.currentInvite = item;

    openDrawer_("Invite 詳情", `
      ${detailSection_("邀請碼資料", [
        ["邀請碼", item.invite_code, true],
        ["狀態", item.status],
        ["使用卡號", item.used_by_id || item.card_id, true],
        ["推薦來源", item.referrer],
        ["來源代理", item.service_agent],
        ["代理類型", item.agent_type],
        ["名單來源", item.source],
        ["建立時間", formatDateTime_(item.created_at)],
        ["使用時間", formatDateTime_(item.used_at)],
        ["到期時間", formatDateTime_(item.expires_at)]
      ])}

      <div class="mt16 item-actions">
        <button class="btn" data-act="invite-copy-code" data-id="${escapeAttr_(item.invite_code || "")}">複製邀請碼</button>
        <button class="btn" data-act="invite-copy-both" data-id="${escapeAttr_(item.invite_code || "")}">複製邀請碼＋表單連結</button>
        <button class="btn bad" data-act="invite-disable" data-id="${escapeAttr_(item.invite_code || "")}">停用邀請碼</button>
      </div>
    `);
  }

  function copyInviteBundle_(inviteCode) {
    const txt = `邀請碼：${inviteCode}\n填寫連結：${buildFormLink_(inviteCode)}`;
    copyText_(txt, "已複製邀請碼＋表單連結");
  }

  async function disableInvite_(inviteCode) {
    const ok = confirm(`確定要停用邀請碼 ${inviteCode} 嗎？`);
    if (!ok) return;

    await api_("inviteDisable", { invite_code: inviteCode });
    toast_("邀請碼已停用");
    await loadInvites_();
  }

  async function openCardDetail_(cardId) {
    const item = await api_("adminCard", { id: cardId }) || findCard_(cardId) || {};
    state.currentCard = mergeCardWithUpdateCache_(item);

    const cache = getCardUpdateCache_(cardId);

    openDrawer_("卡片詳情", `
      ${detailSection_("卡片資料", [
        ["卡號", state.currentCard.id, true],
        ["姓名", state.currentCard.name],
        ["單位", state.currentCard.unit],
        ["職稱", state.currentCard.title],
        ["電話", state.currentCard.phone],
        ["Email", state.currentCard.email],
        ["方案", planText_(state.currentCard.plan)],
        ["流程", processStatusText_(state.currentCard.process_status)],
        ["狀態", cardStatusText_(state.currentCard.status)],
        ["付款狀態", billingStatusText_(state.currentCard.billing_status)],
        ["推薦來源", state.currentCard.referrer],
        ["來源代理", state.currentCard.service_agent],
        ["名單來源", state.currentCard.source],
        ["邀請碼", state.currentCard.invite_code, true],
        ["更新頁", cache.update_link || "-", false],
        ["更新頁到期", formatDateTime_(cache.expire_at)],
        ["到期日", formatDateTime_(state.currentCard.expires_at)],
        ["建立時間", formatDateTime_(state.currentCard.created_at)],
        ["更新時間", formatDateTime_(state.currentCard.updated_at)]
      ])}

      <div class="mt16 item-actions">
        <button class="btn ok" data-act="card-open" data-id="${escapeAttr_(state.currentCard.id || "")}">開名片</button>
        <button class="btn ok" data-act="card-open-clean" data-id="${escapeAttr_(state.currentCard.id || "")}">開乾淨名片</button>
        <button class="btn" data-act="card-copy-link" data-id="${escapeAttr_(state.currentCard.id || "")}">複製名片連結</button>
        <button class="btn primary" data-act="drawer-gen-update">產生更新頁</button>
        <button class="btn" data-act="drawer-copy-update">複製更新頁</button>
        <button class="btn warn" data-act="card-activate" data-id="${escapeAttr_(state.currentCard.id || "")}">啟用卡片</button>
        <button class="btn bad" data-act="card-inactivate" data-id="${escapeAttr_(state.currentCard.id || "")}">停用卡片</button>
        <button class="btn" data-act="card-extend" data-id="${escapeAttr_(state.currentCard.id || "")}">延長期限</button>
        ${renderProcessButtons_("card", state.currentCard.id || "")}
      </div>
    `);
  }

  async function openBillingDetail_(cardId) {
    const item = findPayment_(cardId) || await api_("adminCard", { id: cardId }) || {};
    openDrawer_("付款詳情", `
      ${detailSection_("付款資料", [
        ["卡號", item.id, true],
        ["姓名", item.name],
        ["電話", item.phone],
        ["方案", planText_(item.plan)],
        ["流程", processStatusText_(item.process_status)],
        ["卡片狀態", cardStatusText_(item.status)],
        ["付款狀態", billingStatusText_(item.billing_status)],
        ["發卡時間", formatDateTime_(item.activated_at)],
        ["付款期限", formatDateTime_(item.payment_due_at)],
        ["提醒1", formatDateTime_(item.payment_remind_1_at)],
        ["提醒2", formatDateTime_(item.payment_remind_2_at)],
        ["提醒3", formatDateTime_(item.payment_remind_3_at)],
        ["提醒次數", item.payment_remind_count],
        ["鎖卡時間", formatDateTime_(item.payment_lock_at)],
        ["鎖卡原因", item.lock_reason],
        ["通知時間", formatDateTime_(item.lock_notice_sent_at)],
        ["付款時間", formatDateTime_(item.payment_paid_at)],
        ["付款備註", item.payment_note]
      ])}

      <div class="mt16 item-actions">
        ${text_(item.billing_status).toLowerCase() !== "paid" ? `<button class="btn primary" data-act="billing-paid" data-id="${escapeAttr_(item.id || "")}">標記已付款</button>` : ``}
        <button class="btn ok" data-act="card-open" data-id="${escapeAttr_(item.id || "")}">開名片</button>
        ${renderProcessButtons_("billing", item.id || "")}
      </div>
    `);
  }

  async function markBillingPaid_(cardId) {
    const note = prompt("請輸入付款備註", "已收款");
    if (note === null) return;

    await api_("adminMarkPaid", {
      id: cardId,
      note,
      operator: "admin"
    });

    updateCardLocal_(cardId, {
      billing_status: "paid",
      payment_paid_at: new Date().toISOString(),
      payment_note: note
    });
    updatePaymentLocal_(cardId, {
      billing_status: "paid",
      payment_paid_at: new Date().toISOString(),
      payment_note: note
    });

    toast_("已標記為付款完成");
    await Promise.allSettled([
      loadPayments_(),
      loadCards_(),
      loadStats_()
    ]);
    renderLinePanel_();
    renderStatsPanel_();
  }

  function openCard_(cardId) {
    window.open(`${CONFIG.HUB_URL}?id=${encodeURIComponent(cardId)}`, "_blank");
  }

  function openCardClean_(cardId) {
    window.open(`${CONFIG.HUB_URL}?id=${encodeURIComponent(cardId)}&clean=1`, "_blank");
  }

  function copyCardLink_(cardId) {
    copyText_(`${CONFIG.HUB_URL}?id=${encodeURIComponent(cardId)}`, "已複製名片連結");
  }

  async function genCardUpdateLink_(cardId) {
    const res = await api_("adminCreateUpdateLink24h", { id: cardId });
    const link = text_(res?.update_link);
    const expireAt = text_(res?.expire_at || res?.update_token_expire || res?.expires_at);
    const updateToken = text_(res?.update_token || res?.utoken);

    if (!link) throw new Error("未取得更新頁連結");

    setCardUpdateCache_(cardId, {
      update_link: link,
      expire_at: expireAt,
      update_token: updateToken,
      updated_at: new Date().toISOString()
    });

    copyText_(link, "已產生並複製更新頁");
    renderCardPanel_();
    if (state.currentCard && text_(state.currentCard.id) === text_(cardId) && qs("drawer").classList.contains("show")) {
      state.currentCard = mergeCardWithUpdateCache_(state.currentCard);
      await openCardDetail_(cardId);
    }
  }

  function copyCardUpdateLink_(cardId) {
    const cache = getCardUpdateCache_(cardId);
    const link = text_(cache.update_link);
    if (!link) {
      alert("這張卡片尚未產生更新頁，請先按「產生更新頁」。");
      return;
    }
    copyText_(link, "已複製更新頁");
  }

  async function genCurrentCardUpdateLink_() {
    const cardId = text_(state.currentCard?.id);
    if (!cardId) throw new Error("目前沒有選到卡片");
    await genCardUpdateLink_(cardId);
  }

  function copyCurrentCardUpdateLink_() {
    const cardId = text_(state.currentCard?.id);
    if (!cardId) {
      alert("目前沒有選到卡片");
      return;
    }
    copyCardUpdateLink_(cardId);
  }

  async function updateCardStatus_(cardId, status) {
    const ok = confirm(`確定要將卡片 ${cardId} 設為 ${status === "active" ? "啟用" : "停用"} 嗎？`);
    if (!ok) return;

    await api_("adminUpdate", { id: cardId, status });
    updateCardLocal_(cardId, { status });
    updatePaymentLocal_(cardId, { status });

    if (state.currentCard && text_(state.currentCard.id) === text_(cardId)) {
      state.currentCard.status = status;
      if (qs("drawer").classList.contains("show")) await openCardDetail_(cardId);
    }

    toast_(status === "active" ? "卡片已啟用" : "卡片已停用");
    await Promise.allSettled([loadCards_(), loadPayments_(), loadStats_()]);
    renderLinePanel_();
    renderStatsPanel_();
  }

  async function extendCard_(cardId) {
    const daysStr = prompt("請輸入要延長的天數", "365");
    if (daysStr == null) return;

    const days = Number(daysStr);
    if (!Number.isFinite(days) || days <= 0) {
      alert("請輸入正整數天數");
      return;
    }

    const card = findCard_(cardId) || await api_("adminCard", { id: cardId }) || {};
    const baseDate = text_(card.expires_at) ? new Date(card.expires_at) : new Date();
    const nextDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await api_("adminUpdate", {
      id: cardId,
      expires_at: nextDate.toISOString(),
      status: "active"
    });

    updateCardLocal_(cardId, {
      expires_at: nextDate.toISOString(),
      status: "active"
    });
    updatePaymentLocal_(cardId, {
      expires_at: nextDate.toISOString(),
      status: "active"
    });

    if (state.currentCard && text_(state.currentCard.id) === text_(cardId)) {
      state.currentCard.expires_at = nextDate.toISOString();
      state.currentCard.status = "active";
      if (qs("drawer").classList.contains("show")) await openCardDetail_(cardId);
    }

    toast_(`已延長 ${days} 天`);
    await Promise.allSettled([loadCards_(), loadPayments_(), loadStats_()]);
  }

  async function updateCardProcessStatus_(cardId, processStatus) {
    const v = normalizeProcessStatus_(processStatus);
    await api_("adminUpdate", { id: cardId, process_status: v });
    updateCardLocal_(cardId, { process_status: v });
    updatePaymentLocal_(cardId, { process_status: v });

    if (state.currentCard && text_(state.currentCard.id) === text_(cardId)) {
      state.currentCard.process_status = v;
      if (qs("drawer").classList.contains("show")) await openCardDetail_(cardId);
    }

    renderCardPanel_();
    renderBillingPanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
    toast_("卡片流程已更新");
  }

  async function updateBillingProcessStatus_(cardId, processStatus) {
    const v = normalizeProcessStatus_(processStatus);
    await api_("adminUpdate", { id: cardId, process_status: v });
    updateCardLocal_(cardId, { process_status: v });
    updatePaymentLocal_(cardId, { process_status: v });

    renderBillingPanel_();
    renderCardPanel_();
    renderLinePanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
    toast_("付款流程已更新");
  }

  function toggleCardExpand_(cardId) {
    const key = text_(cardId);
    state.cardExpandedMap[key] = !state.cardExpandedMap[key];
    renderCardPanel_();
    switchTab_(state.tab);
  }

  async function loadStats_() {
    try {
      state.stats = await api_("adminStats", {}) || {};
      renderStatsPanel_();
    } catch (err) {
      console.warn("loadStats error", err);
    }
  }

  async function loadLeads_() {
    const params = {};
    if (text_(state.leadQuery)) params.q = text_(state.leadQuery);

    const res = await api_("leadList", params);
    state.leads = normalizeArrayResult_(res).map(normalizeProcessRow_);
    renderLeadPanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
  }

  async function loadInvites_() {
    const params = {};
    if (text_(state.inviteQuery)) params.q = text_(state.inviteQuery);

    const res = await api_("inviteList", params);
    state.invites = normalizeArrayResult_(res).map(normalizeProcessRow_);
    renderInvitePanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
  }

  async function loadCards_() {
    const params = {};
    if (text_(state.cardQuery)) params.q = text_(state.cardQuery);

    const res = await api_("adminFind", params);
    state.cards = normalizeArrayResult_(res).map(item => mergeCardWithUpdateCache_(normalizeProcessRow_(item)));
    renderCardPanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
  }

  async function loadPayments_() {
    const params = {
      status: text_(state.billingFilter || "all")
    };
    if (text_(state.billingQuery)) params.keyword = text_(state.billingQuery);

    let res = [];
    try {
      res = await api_("paymentList", params);
    } catch (err) {
      console.warn("paymentList error, fallback to adminFind", err);
      const fallback = await api_("adminFind", text_(state.billingQuery) ? { q: text_(state.billingQuery) } : {});
      res = normalizeArrayResult_(fallback);
    }

    state.payments = normalizeArrayResult_(res).map(normalizeProcessRow_);
    renderBillingPanel_();
    renderLinePanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
  }

  async function api_(action, payload = {}) {
    const adminKey = getAdminKey_();
    if (!adminKey) throw new Error("請先輸入 admin_key");

    const body = JSON.stringify({ action, admin_key: adminKey, ...payload });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        signal: controller.signal
      });

      const txt = await res.text();
      let json = {};
      try {
        json = txt ? JSON.parse(txt) : {};
      } catch {
        throw new Error(`API 回傳不是合法 JSON：${txt.slice(0, 200)}`);
      }

      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (json && json.ok === false) throw new Error(json.error || `${action} 執行失敗`);

      return json.data != null ? json.data : json;
    } catch (err) {
      if (err.name === "AbortError") throw new Error(`請求逾時：${action}`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeArrayResult_(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.list)) return res.list;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.rows)) return res.rows;
    return [];
  }

  function normalizeProcessRow_(row) {
    const item = { ...(row || {}) };
    item.process_status = normalizeProcessStatus_(item.process_status);
    return item;
  }

  function normalizeProcessStatus_(v) {
    const s = text_(v).toLowerCase();
    if (s === "done") return "done";
    if (s === "archived") return "archived";
    return "pending";
  }

  function getFilteredLeads_() {
    return applyCommonFilters_(state.leads, state.leadProcessFilter);
  }

  function getFilteredInvites_() {
    return applyCommonFilters_(state.invites, "all");
  }

  function getFilteredCards_() {
    return applyCommonFilters_(state.cards, state.cardProcessFilter);
  }

  function getFilteredPayments_() {
    let rows = applyCommonFilters_(state.payments, state.billingProcessFilter);

    const bf = text_(state.billingFilter).toLowerCase();
    if (bf && bf !== "all") {
      rows = rows.filter(item => {
        const billing = text_(item.billing_status).toLowerCase();
        const status = text_(item.status).toLowerCase();
        const remindCount = num_(item.payment_remind_count);

        if (bf === "paid") return billing === "paid";
        if (bf === "locked") return status === "locked";
        if (bf === "reminded") return billing !== "paid" && status !== "locked" && remindCount >= 1;
        if (bf === "unpaid") return billing === "unpaid" && status !== "locked" && remindCount < 1;
        return true;
      });
    }
    return rows;
  }

  function applyCommonFilters_(rows, processFilter) {
    const list = Array.isArray(rows) ? rows.slice() : [];
    return list.filter(item => {
      if (!state.showTestData && isTestRow_(item)) return false;
      if (processFilter && processFilter !== "all") {
        if (normalizeProcessStatus_(item.process_status) !== processFilter) return false;
      }
      return true;
    });
  }

  function findLead_(leadId) {
    return state.leads.find(x => text_(x.lead_id) === text_(leadId));
  }

  function findInvite_(inviteCode) {
    return state.invites.find(x => text_(x.invite_code) === text_(inviteCode));
  }

  function findCard_(cardId) {
    return state.cards.find(x => text_(x.id) === text_(cardId));
  }

  function findPayment_(cardId) {
    return state.payments.find(x => text_(x.id) === text_(cardId));
  }

  function updateLeadLocal_(leadId, patch) {
    const row = findLead_(leadId);
    if (row) Object.assign(row, patch || {});
  }

  function updateCardLocal_(cardId, patch) {
    const row = findCard_(cardId);
    if (row) Object.assign(row, patch || {});
  }

  function updatePaymentLocal_(cardId, patch) {
    const row = findPayment_(cardId);
    if (row) Object.assign(row, patch || {});
  }

  function setCardUpdateCache_(cardId, patch) {
    const id = text_(cardId);
    if (!id) return;
    state.updateLinks[id] = {
      ...(state.updateLinks[id] || {}),
      ...(patch || {})
    };

    const row = findCard_(id);
    if (row) {
      row.__update_link = state.updateLinks[id].update_link || "";
      row.__update_expire_at = state.updateLinks[id].expire_at || "";
      row.__update_token = state.updateLinks[id].update_token || "";
    }
  }

  function getCardUpdateCache_(cardId) {
    const id = text_(cardId);
    if (!id) return {};
    const fromState = state.updateLinks[id] || {};
    const fromCard = findCard_(id) || {};
    return {
      update_link: text_(fromState.update_link || fromCard.__update_link),
      expire_at: text_(fromState.expire_at || fromCard.__update_expire_at),
      update_token: text_(fromState.update_token || fromCard.__update_token),
      updated_at: text_(fromState.updated_at)
    };
  }

  function mergeCardWithUpdateCache_(card) {
    const item = { ...(card || {}) };
    const cache = getCardUpdateCache_(item.id);
    if (cache.update_link) item.__update_link = cache.update_link;
    if (cache.expire_at) item.__update_expire_at = cache.expire_at;
    if (cache.update_token) item.__update_token = cache.update_token;
    return item;
  }

  function getAdminKey_() {
    return localStorage.getItem(CONFIG.ADMIN_KEY_STORAGE) || "";
  }

  function buildFormLink_(inviteCode) {
    const url = new URL(CONFIG.FORM_URL);
    if (text_(inviteCode)) url.searchParams.set("invite", inviteCode);
    return url.toString();
  }

  function buildLineNotifyItems_() {
    return getFilteredPayments_()
      .filter(item =>
        text_(item.payment_remind_1_at) ||
        text_(item.payment_remind_2_at) ||
        text_(item.payment_remind_3_at) ||
        text_(item.lock_notice_sent_at)
      )
      .map(item => ({
        ...item,
        badges: [
          text_(item.payment_remind_1_at) ? `<span class="badge warn">Day1</span>` : "",
          text_(item.payment_remind_2_at) ? `<span class="badge warn">Day2</span>` : "",
          text_(item.payment_remind_3_at) ? `<span class="badge warn">Day3</span>` : "",
          text_(item.lock_notice_sent_at) ? `<span class="badge bad">鎖卡通知</span>` : ""
        ].filter(Boolean)
      }));
  }

  function calcPaymentStats_() {
    let unpaid = 0;
    let reminded = 0;
    let locked = 0;
    let paid = 0;

    getFilteredPayments_().forEach(item => {
      const billing = text_(item.billing_status).toLowerCase();
      const status = text_(item.status).toLowerCase();
      const remindCount = num_(item.payment_remind_count);

      if (billing === "paid") {
        paid++;
        return;
      }
      if (status === "locked") {
        locked++;
        return;
      }
      if (billing === "unpaid" && remindCount >= 1) {
        reminded++;
        return;
      }
      if (billing === "unpaid") {
        unpaid++;
      }
    });

    return { unpaid, reminded, locked, paid };
  }

  function renderProcessButtons_(module, id) {
    const safeId = escapeAttr_(text_(id));
    const act = module === "lead" ? "lead-process" : module === "card" ? "card-process" : "billing-process";
    return `
      <button class="btn" data-act="${act}" data-id="${safeId}" data-value="pending">標為待處理</button>
      <button class="btn" data-act="${act}" data-id="${safeId}" data-value="done">標為已處理</button>
      <button class="btn" data-act="${act}" data-id="${safeId}" data-value="archived">封存</button>
    `;
  }

  function billingBadge_(item) {
    const billing = text_(item.billing_status).toLowerCase();
    const status = text_(item.status).toLowerCase();
    const remindCount = num_(item.payment_remind_count);

    if (billing === "paid") return `<span class="badge ok">已付款</span>`;
    if (status === "locked") return `<span class="badge bad">已鎖卡</span>`;
    if (remindCount >= 1) return `<span class="badge warn">已提醒</span>`;
    return `<span class="badge">未付款</span>`;
  }

  function kv_(k, v, mono = false) {
    return `
      <div class="kv">
        <div class="kv-k">${escapeHtml_(k)}</div>
        <div class="kv-v ${mono ? "mono" : ""}">${escapeHtml_(text_(v) || "-")}</div>
      </div>
    `;
  }

  function detailSection_(title, rows) {
    return `
      <div class="card" style="margin:0;">
        <div class="card-title">${escapeHtml_(title)}</div>
        <div class="grid">
          ${rows.map(([k, v, mono]) => kv_(k, v, mono)).join("")}
        </div>
      </div>
    `;
  }

  function openDrawer_(title, html) {
    qs("drawerTitle").textContent = title || "詳細資料";
    qs("drawerBody").innerHTML = html || "";
    qs("drawer").classList.add("show");
    qs("drawerMask").classList.add("show");
  }

  function closeDrawer_() {
    qs("drawer").classList.remove("show");
    qs("drawerMask").classList.remove("show");
  }

  function refreshVisiblePanels_() {
    renderLeadPanel_();
    renderInvitePanel_();
    renderCardPanel_();
    renderBillingPanel_();
    renderLinePanel_();
    renderStatsPanel_();
    switchTab_(state.tab);
  }

  function copyText_(text, msg = "已複製") {
    const v = String(text || "");
    if (!v) {
      alert("沒有可複製的內容");
      return;
    }
    navigator.clipboard.writeText(v).then(() => {
      toast_(msg);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = v;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast_(msg);
    });
  }

  function toast_(msg) {
    const old = qs("hscToast");
    if (old) old.remove();

    const el = document.createElement("div");
    el.id = "hscToast";
    el.textContent = msg || "完成";
    Object.assign(el.style, {
      position: "fixed",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      background: "rgba(47,36,28,.92)",
      color: "#fff",
      padding: "12px 16px",
      borderRadius: "999px",
      zIndex: "9999",
      fontSize: "14px",
      fontWeight: "800",
      boxShadow: "0 8px 24px rgba(0,0,0,.18)"
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function qsa_(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function text_(v) {
    return v == null ? "" : String(v).trim();
  }

  function num_(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function formatDateTime_(v) {
    const s = text_(v);
    if (!s) return "-";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  function planText_(v) {
    const s = text_(v).toLowerCase();
    if (s === "free") return "自由款";
    if (s === "premium") return "精品款";
    return s || "-";
  }

  function billingStatusText_(v) {
    const s = text_(v).toLowerCase();
    if (s === "paid") return "已付款";
    if (s === "unpaid") return "未付款";
    if (s === "locked") return "已鎖卡";
    return v || "-";
  }

  function processStatusText_(v) {
    const s = normalizeProcessStatus_(v);
    if (s === "done") return "已處理";
    if (s === "archived") return "已封存";
    return "待處理";
  }

  function processStatusBadge_(v) {
    const s = normalizeProcessStatus_(v);
    if (s === "done") return `<span class="badge ok">已處理</span>`;
    if (s === "archived") return `<span class="badge bad">已封存</span>`;
    return `<span class="badge warn">待處理</span>`;
  }

  function leadStatusBadge_(status) {
    const s = text_(status).toLowerCase();
    if (s === "converted") return `<span class="badge ok">已成卡</span>`;
    if (s === "invited") return `<span class="badge warn">已發邀請碼</span>`;
    if (s === "new" || s === "pending") return `<span class="badge">待處理</span>`;
    return `<span class="badge">${escapeHtml_(status || "未分類")}</span>`;
  }

  function inviteStatusText_(status) {
    const s = text_(status).toLowerCase();
    if (s === "open") return "可使用";
    if (s === "used") return "已使用";
    if (s === "disabled") return "已停用";
    if (s === "expired") return "已過期";
    return status || "-";
  }

  function inviteStatusBadge_(status) {
    const s = text_(status).toLowerCase();
    if (s === "open") return `<span class="badge ok">可使用</span>`;
    if (s === "used") return `<span class="badge">已使用</span>`;
    if (s === "disabled") return `<span class="badge bad">已停用</span>`;
    if (s === "expired") return `<span class="badge warn">已過期</span>`;
    return `<span class="badge">${escapeHtml_(status || "-")}</span>`;
  }

  function cardStatusText_(status) {
    const s = text_(status).toLowerCase();
    if (s === "active") return "啟用中";
    if (s === "inactive") return "停用中";
    if (s === "locked") return "已鎖卡";
    if (s === "expired") return "已到期";
    return status || "-";
  }

  function cardStatusBadge_(status) {
    const s = text_(status).toLowerCase();
    if (s === "active") return `<span class="badge ok">啟用中</span>`;
    if (s === "inactive") return `<span class="badge bad">停用中</span>`;
    if (s === "locked") return `<span class="badge bad">已鎖卡</span>`;
    if (s === "expired") return `<span class="badge warn">已到期</span>`;
    return `<span class="badge">${escapeHtml_(status || "-")}</span>`;
  }

  function isTestRow_(item) {
    const v = text_(item?.is_test).toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "y";
  }

  function isTestBadge_(item) {
    return isTestRow_(item) ? `<span class="badge">測試</span>` : ``;
  }

  function escapeHtml_(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr_(s) {
    return escapeHtml_(s);
  }
})();