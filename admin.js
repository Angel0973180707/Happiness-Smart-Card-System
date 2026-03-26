(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v6.2.1",
    GAS_BASE_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    ADMIN_KEY: "ANGEL20261972070707",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FORM_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/form.html",
    DEFAULT_RENEW_DAYS: 365
  };

  const state = {
    cards: [],
    payments: [],
    addons: [],
    agents: [],
    currentCard: null,
    currentAgent: null,
    currentAddon: null,
    updateLinks: {},
    lastInviteCreated: null,
    adminUsers: [
      { admin_id: "AD001", name: "主管理員", role: "super_admin", permissions: "all", status: "active" },
      { admin_id: "AD002", name: "客服管理", role: "service", permissions: "cards, invites, renewals", status: "active" }
    ]
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindEvents();
    setDefaultSettlementMonth();
    renderMockAdmins();
    refreshAll();
  }

  function bindEvents() {
    $$(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".nav-btn").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        const target = btn.dataset.target;
        const el = $("#" + target);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    $("#btnRefreshAll").addEventListener("click", refreshAll);
    $("#btnOpenHub").addEventListener("click", () => window.open(CONFIG.HUB_URL, "_blank"));
    $("#btnOpenForm").addEventListener("click", () => window.open(CONFIG.FORM_URL, "_blank"));

    $("#btnCreateInviteCode").addEventListener("click", createInviteCodeAligned);

    $("#btnSearchCards").addEventListener("click", renderCards);
    $("#btnReloadCards").addEventListener("click", async () => {
      $("#cardSearch").value = "";
      await loadCards();
    });
    $("#btnLoadCardDetail").addEventListener("click", async () => {
      const id = valueOf("#detailCardId");
      if (!id) return alert("請輸入 card_id");
      await loadCardDetail(id);
    });

    $("#btnOpenPreviewLink").addEventListener("click", () => openTextLink("#previewLinkBox"));
    $("#btnCopyPreviewLink").addEventListener("click", () => copyFromField("#previewLinkBox", "已複製預覽連結"));
    $("#btnCopyPreviewText").addEventListener("click", () => copyFromField("#previewTextBox", "已複製預覽文案"));

    $("#btnOpenDeliveryLink").addEventListener("click", () => openTextLink("#deliveryLinkBox"));
    $("#btnCopyDeliveryLink").addEventListener("click", () => copyFromField("#deliveryLinkBox", "已複製交付卡連結"));
    $("#btnCopyDeliveryText").addEventListener("click", () => copyFromField("#deliveryTextBox", "已複製交付文案"));

    $("#btnGenerateUpdateLink").addEventListener("click", generateUpdateLinkForCurrentCard);
    $("#btnCopyUpdateLink").addEventListener("click", () => copyFromField("#updateLinkBox", "已複製更新連結"));
    $("#btnCopyUpdateText").addEventListener("click", () => copyFromField("#updateTextBox", "已複製更新文案"));

    $("#btnSearchAddons").addEventListener("click", renderAddons);
    $("#btnReloadAddons").addEventListener("click", async () => {
      $("#addonSearch").value = "";
      await loadAddons();
    });
    $("#btnLoadAddonDetail").addEventListener("click", async () => {
      const id = valueOf("#addonDetailId");
      if (!id) return alert("請輸入 addon_order_id");
      await loadAddonDetail(id);
    });

    $("#btnConfirmRenewalPaid").addEventListener("click", confirmRenewalAndExtend);
    $("#btnCopyRenewalText").addEventListener("click", copyRenewalReminderText);
    $("#btnCopyRenewalDeliveryText").addEventListener("click", copyRenewalDeliveryText);

    $("#btnSearchAgents").addEventListener("click", renderAgents);
    $("#btnReloadAgents").addEventListener("click", async () => {
      $("#agentSearch").value = "";
      await loadAgents();
    });
    $("#btnLoadAgentDetail").addEventListener("click", async () => {
      const id = valueOf("#detailAgentId");
      if (!id) return alert("請輸入 agent_id");
      await loadAgentDetail(id);
    });

    $("#btnAddPoints").addEventListener("click", () => adjustPoints("add"));
    $("#btnSubtractPoints").addEventListener("click", () => adjustPoints("subtract"));
    $("#btnAdjustCommission").addEventListener("click", adjustCommission);
    $("#btnLoadLogs").addEventListener("click", reloadLogsForCurrentAgent);

    $("#btnBuildSettlement").addEventListener("click", buildSettlement);
    $("#btnAddMockAdmin").addEventListener("click", addMockAdmin);
  }

  async function refreshAll() {
    await Promise.allSettled([
      loadCards(),
      loadPayments(),
      loadAddons(),
      loadAgents()
    ]);
    renderDashboard();
  }

  async function api(action, params = {}) {
    const getUrl = new URL(CONFIG.GAS_BASE_URL);
    getUrl.searchParams.set("action", action);
    getUrl.searchParams.set("admin_key", CONFIG.ADMIN_KEY);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        getUrl.searchParams.set(key, value);
      }
    });

    try {
      setLoading(true);

      let res;
      let text;
      let json;

      try {
        res = await fetch(getUrl.toString(), { method: "GET" });
        text = await res.text();
        json = parseJsonSafe(text);
        if (res.ok && json && json.ok !== false) {
          setGasStatus("正常", "ok");
          return json.data != null ? json.data : json;
        }
      } catch (err) {
        console.warn("GET failed, fallback POST:", action, err);
      }

      res = await fetch(CONFIG.GAS_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, admin_key: CONFIG.ADMIN_KEY, ...params })
      });

      text = await res.text();
      json = parseJsonSafe(text);

      if (!res.ok) throw new Error((json && json.error) || `HTTP ${res.status}`);
      if (json && json.ok === false) throw new Error(json.error || `${action} 執行失敗`);

      setGasStatus("正常", "ok");
      return json && json.data != null ? json.data : json;
    } catch (err) {
      console.error("API error:", action, err);
      setGasStatus("異常", "bad");
      alert(err.message || "系統錯誤");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function parseJsonSafe(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (err) {
      throw new Error("GAS 回傳不是合法 JSON");
    }
  }

  function normalizeList(data, preferredKeys = []) {
    if (Array.isArray(data)) return data;
    for (const key of preferredKeys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  async function loadCards() {
    const data = await api("getCards");
    state.cards = normalizeList(data, ["cards"]);
    renderCards();
    renderRenewals();
    renderDashboard();
  }

  async function loadCardDetail(cardId) {
    let data;
    try {
      data = await api("getCard", { id: cardId });
    } catch (err) {
      data = await api("getCard", { card_id: cardId });
    }

    const card = data.card || data || {};
    state.currentCard = card;
    $("#detailCardId").value = textOf(card.id || card.card_id);

    renderCardDetail(card);
    syncCurrentCardBox(card);
    syncCardWorkflowBoxes(card);
    renderRenewalComposer(card);
  }

  async function loadPayments() {
    const data = await api("getPayments");
    state.payments = normalizeList(data, ["payments"]);
    renderDashboard();
    renderRenewals();
  }

  async function loadAddons() {
    const data = await api("getAddonOrders");
    state.addons = normalizeList(data, ["addon_orders", "orders", "addons"]);
    renderAddons();
    renderDashboard();
  }

  async function loadAddonDetail(addonOrderId) {
    const data = await api("getAddonOrder", {
      addon_order_id: addonOrderId,
      add_on_order_id: addonOrderId
    });
    const detail = data.addon_order || data.order || data.addon || data || {};
    state.currentAddon = detail;
    $("#addonDetailId").value = addonOrderId;
    renderAddonDetail(detail);
  }

  async function loadAgents() {
    const data = await api("adminListAgents");
    state.agents = normalizeList(data, ["agents"]);
    renderAgents();
    renderDashboard();
  }

  async function loadAgentDetail(agentId) {
    const data = await api("adminGetAgent", { agent_id: agentId });
    const detail = data.agent || data || {};
    state.currentAgent = detail;

    $("#detailAgentId").value = agentId;
    $("#pointsAgentId").value = agentId;
    $("#commissionAgentId").value = agentId;

    renderAgentDetail(detail);
    syncCurrentAgentBox(detail);
    await reloadLogsForCurrentAgent();
  }

  async function createInviteCodeAligned() {
    const params = {
      count: valueOf("#createInviteCount") || "1",
      days: valueOf("#createInviteDays") || "30",
      referrer: valueOf("#createInviteReferrer"),
      service_agent: valueOf("#createInviteServiceAgent"),
      agent_type: valueOf("#createInviteAgentType"),
      source: valueOf("#createInviteSource") || "admin"
    };

    const data = await api("createInviteCode", params);
    const invite = data.invite || {};
    const inviteCode = textOf(invite.invite_code);
    const formUrl = data.form_url || buildFormUrl(inviteCode);

    state.lastInviteCreated = {
      invite_code: inviteCode,
      form_url: formUrl,
      reply_text: buildInviteReplyText(inviteCode)
    };

    $("#inviteCreateResult").textContent = JSON.stringify({
      invite_code: inviteCode,
      form_url: formUrl,
      reply_text: state.lastInviteCreated.reply_text
    }, null, 2);

    toast("邀請碼建立完成");
  }

  function renderCards() {
    const keyword = valueOf("#cardSearch").toLowerCase();
    const rows = state.cards.filter(item => {
      const hay = [
        textOf(item.id || item.card_id),
        textOf(item.name || item.owner_name),
        textOf(item.phone),
        textOf(item.email)
      ].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });

    const tbody = $("#cardsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-cell">查無卡片資料</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(item => {
      const id = textOf(item.id || item.card_id);
      return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(textOf(item.name || item.owner_name))}</td>
          <td>${escapeHtml(textOf(item.phone))}</td>
          <td>${escapeHtml(planText(item.plan))}</td>
          <td>${escapeHtml(cardStatusText(item.status))}</td>
          <td>${escapeHtml(billingStatusText(item.billing_status))}</td>
          <td>${escapeHtml(formatValue(item.expires_at))}</td>
          <td>${escapeHtml(textOf(item.service_agent))}</td>
          <td>${escapeHtml(textOf(item.referrer))}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-xs btn-soft btn-card-detail" data-card-id="${escapeAttr(id)}">查看</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    $$(".btn-card-detail", tbody).forEach(btn => {
      btn.addEventListener("click", async () => loadCardDetail(btn.dataset.cardId));
    });
  }

  function renderCardDetail(card) {
    const wrap = $("#cardDetailWrap");
    if (!card || !Object.keys(card).length) {
      wrap.className = "detail-stack empty-state";
      wrap.textContent = "查無卡片詳情";
      return;
    }

    const id = textOf(card.id || card.card_id);
    const previewLink = buildPreviewLink(id);
    const deliveryLink = buildDeliveryLink(id);
    const canDelivery = isPaid(card);
    const updateInfo = getUpdateInfo(id);

    wrap.className = "detail-stack";
    wrap.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">卡片基本資料</div>
        <div class="detail-grid">
          ${renderDetailItem("card_id", id)}
          ${renderDetailItem("name", textOf(card.name || card.owner_name))}
          ${renderDetailItem("phone", textOf(card.phone))}
          ${renderDetailItem("email", textOf(card.email))}
          ${renderDetailItem("plan", planText(card.plan))}
          ${renderDetailItem("status", cardStatusText(card.status))}
          ${renderDetailItem("billing_status", billingStatusText(card.billing_status))}
          ${renderDetailItem("expires_at", formatValue(card.expires_at))}
          ${renderDetailItem("service_agent", textOf(card.service_agent))}
          ${renderDetailItem("referrer", textOf(card.referrer))}
          ${renderDetailItem("source", textOf(card.source))}
          ${renderDetailItem("update_mode", getUpdateModeText(card))}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-title">流程總控</div>
        <div class="detail-grid">
          ${renderDetailItem("成品預覽", previewLink)}
          ${renderDetailItem("交付卡", canDelivery ? deliveryLink : "尚未付款，不可交付")}
          ${renderDetailItem("更新連結", updateInfo.link || "尚未產生")}
          ${renderDetailItem("加購狀態", summarizeCardAddons(id))}
          ${renderDetailItem("續約狀態", getRenewalStateText(card))}
          ${renderDetailItem("付款資訊", summarizePaymentInfo(id))}
        </div>
      </div>
    `;
  }

  function syncCurrentCardBox(card) {
    $("#currentCardLabel").textContent = textOf(card.id || card.card_id) || "未選取";
    $("#currentCardName").textContent = textOf(card.name || card.owner_name) || "-";
    $("#currentBillingStatus").textContent = billingStatusText(card.billing_status);
    $("#currentPlan").textContent = planText(card.plan);
    $("#currentUpdateMode").textContent = getUpdateModeText(card);
  }

  function syncCardWorkflowBoxes(card) {
    const id = textOf(card.id || card.card_id);
    const previewLink = buildPreviewLink(id);
    const deliveryLink = buildDeliveryLink(id);
    const canDelivery = isPaid(card);
    const updateInfo = getUpdateInfo(id);

    $("#previewLinkBox").value = previewLink;
    $("#previewTextBox").value = buildPreviewReplyText(card);

    $("#deliveryLinkBox").value = canDelivery ? deliveryLink : "";
    $("#deliveryTextBox").value = canDelivery
      ? buildDeliveryReplyText(card)
      : "此卡尚未付款，暫時不可提供交付卡。";

    $("#updateLinkBox").value = updateInfo.link || "";
    $("#updateTextBox").value = buildUpdateReplyText(card, updateInfo.link || "");
    $("#updateHint").textContent = hasUnlimitedUpdate(card)
      ? "此卡看起來已有無限更新權限，原則上不需單次更新連結。"
      : "此卡可使用單次更新流程。";
  }

  async function generateUpdateLinkForCurrentCard() {
    if (!state.currentCard) return alert("請先選取卡片");
    const id = textOf(state.currentCard.id || state.currentCard.card_id);

    const data = await api("getCardForUpdate", { id });
    const card = data.card || state.currentCard;
    const token = textOf(card.update_token);
    const link = token ? `${CONFIG.HUB_URL}update-form.html?token=${encodeURIComponent(token)}` : "";

    state.updateLinks[id] = { link, expire_at: textOf(card.update_token_expire) };
    $("#updateLinkBox").value = link;
    $("#updateTextBox").value = buildUpdateReplyText(state.currentCard, link);
    renderCardDetail(state.currentCard);
    toast("已產生更新連結");
  }

  function renderAddons() {
    const keyword = valueOf("#addonSearch").toLowerCase();
    const rows = state.addons.filter(item => {
      const hay = [
        textOf(item.addon_order_id || item.add_on_order_id),
        textOf(item.card_id),
        textOf(item.addon_type || item.item_code)
      ].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });

    const tbody = $("#addonsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">查無加購資料</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(item => {
      const addonOrderId = textOf(item.addon_order_id || item.add_on_order_id);
      const status = textOf(item.status);
      return `
        <tr>
          <td>${escapeHtml(addonOrderId)}</td>
          <td>${escapeHtml(textOf(item.card_id))}</td>
          <td>${escapeHtml(textOf(item.addon_type || item.item_code || item.addon_key))}</td>
          <td>${escapeHtml(formatValue(item.qty || item.quantity || 1))}</td>
          <td>${escapeHtml(status || "-")}</td>
          <td>${escapeHtml(formatValue(item.amount || item.unit_price))}</td>
          <td>${escapeHtml(describeAddonImpact(item))}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-xs btn-soft btn-addon-detail" data-addon-id="${escapeAttr(addonOrderId)}">查看</button>
              ${status.toLowerCase() !== "paid" ? `<button class="btn btn-xs btn-primary btn-addon-paid" data-addon-id="${escapeAttr(addonOrderId)}">確認付款</button>` : ""}
              ${status.toLowerCase() !== "cancelled" ? `<button class="btn btn-xs btn-danger btn-addon-cancel" data-addon-id="${escapeAttr(addonOrderId)}">取消</button>` : ""}
              <button class="btn btn-xs btn-soft" data-copy="${escapeAttr(buildAddonPaymentReminderText(item))}">複製付款提醒</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    bindCopyButtons(tbody);

    $$(".btn-addon-detail", tbody).forEach(btn => {
      btn.addEventListener("click", async () => loadAddonDetail(btn.dataset.addonId));
    });

    $$(".btn-addon-paid", tbody).forEach(btn => {
      btn.addEventListener("click", async () => confirmAddonPaid(btn.dataset.addonId));
    });

    $$(".btn-addon-cancel", tbody).forEach(btn => {
      btn.addEventListener("click", async () => cancelAddon(btn.dataset.addonId));
    });
  }

  function renderAddonDetail(detail) {
    const wrap = $("#addonDetailWrap");
    if (!detail || !Object.keys(detail).length) {
      wrap.className = "detail-stack empty-state";
      wrap.textContent = "查無加購詳情";
      return;
    }

    wrap.className = "detail-stack";
    wrap.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">加購單資料</div>
        <div class="detail-grid">
          ${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}
        </div>
      </div>
    `;
  }

  async function confirmAddonPaid(addonOrderId) {
    const ok = confirm(`確認加購單 ${addonOrderId} 已付款？`);
    if (!ok) return;

    await api("confirmAddonOrderPaid", {
      addon_order_id: addonOrderId,
      add_on_order_id: addonOrderId
    });

    toast("加購單已確認付款");
    await loadAddons();
    if (state.currentCard) await loadCardDetail(textOf(state.currentCard.id || state.currentCard.card_id));
  }

  async function cancelAddon(addonOrderId) {
    const ok = confirm(`確定取消加購單 ${addonOrderId}？`);
    if (!ok) return;

    await api("adminCancelAddonOrder", {
      addon_order_id: addonOrderId,
      add_on_order_id: addonOrderId
    });

    toast("加購單已取消");
    await loadAddons();
  }

  function renderRenewals() {
    const rows = state.cards.filter(card => needsRenewal(card) || isExpired(card) || isExpiringSoon(card, 30));
    const tbody = $("#renewalTableBody");

    $("#renewalSoonCount").textContent = state.cards.filter(card => isExpiringSoon(card, 30) && !isExpired(card)).length;
    $("#renewalExpiredCount").textContent = state.cards.filter(card => isExpired(card)).length;
    $("#renewalPendingPayCount").textContent = rows.filter(card => !isPaid(card)).length;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">目前沒有需要續約處理的卡片</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(card => {
      const id = textOf(card.id || card.card_id);
      return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(textOf(card.name || card.owner_name))}</td>
          <td>${escapeHtml(formatValue(card.expires_at))}</td>
          <td>${escapeHtml(billingStatusText(card.billing_status))}</td>
          <td>${escapeHtml(needsRenewal(card) ? "是" : "否")}</td>
          <td>${escapeHtml(getRenewalStateText(card))}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-xs btn-soft btn-renewal-select" data-card-id="${escapeAttr(id)}">選取</button>
              <button class="btn btn-xs btn-soft" data-copy="${escapeAttr(buildRenewalReminderText(card))}">複製提醒文案</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    bindCopyButtons(tbody);

    $$(".btn-renewal-select", tbody).forEach(btn => {
      btn.addEventListener("click", async () => loadCardDetail(btn.dataset.cardId));
    });
  }

  function renderRenewalComposer(card) {
    $("#renewalTextBox").value = card ? buildRenewalReminderText(card) : "";
  }

  async function confirmRenewalAndExtend() {
    if (!state.currentCard) return alert("請先選取卡片");
    const id = textOf(state.currentCard.id || state.currentCard.card_id);
    const renewDays = Number(valueOf("#renewDays") || CONFIG.DEFAULT_RENEW_DAYS);
    if (!Number.isFinite(renewDays) || renewDays <= 0) return alert("續約天數需大於 0");

    const ok = confirm(`將卡片 ${id} 執行「付款確認＋續約 ${renewDays} 天」？`);
    if (!ok) return;

    await api("adminMarkPaid", { id, note: `renewal paid ${renewDays} days`, operator: "admin-v621" });

    const base = parseDate(state.currentCard.expires_at);
    const start = base && base > new Date() ? base : new Date();
    const next = new Date(start.getTime() + renewDays * 24 * 60 * 60 * 1000);

    await api("adminUpdateCard", {
      id,
      expires_at: next.toISOString(),
      status: "active",
      billing_status: "paid"
    });

    toast("續約完成");
    await Promise.allSettled([loadCards(), loadPayments()]);
    await loadCardDetail(id);
    $("#renewalTextBox").value = buildRenewalDeliveryText(state.currentCard);
  }

  function copyRenewalReminderText() {
    if (!state.currentCard) return alert("請先選取卡片");
    const text = buildRenewalReminderText(state.currentCard);
    copyText(text, "已複製續約提醒文案");
    $("#renewalTextBox").value = text;
  }

  function copyRenewalDeliveryText() {
    if (!state.currentCard) return alert("請先選取卡片");
    const text = buildRenewalDeliveryText(state.currentCard);
    copyText(text, "已複製續約交付文案");
    $("#renewalTextBox").value = text;
  }

  function renderAgents() {
    const keyword = valueOf("#agentSearch").toLowerCase();
    const rows = state.agents.filter(item => {
      const hay = [
        textOf(item.agent_id),
        textOf(item.owner_name),
        textOf(item.agent_type),
        textOf(item.member_tier)
      ].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });

    const tbody = $("#agentsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">查無代理資料</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(item => `
      <tr>
        <td>${escapeHtml(textOf(item.agent_id))}</td>
        <td>${escapeHtml(textOf(item.owner_name))}</td>
        <td>${escapeHtml(textOf(item.agent_type))}</td>
        <td>${escapeHtml(textOf(item.member_tier))}</td>
        <td>${escapeHtml(formatValue(item.points_balance))}</td>
        <td>${escapeHtml(formatValue(item.total_commission))}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-xs btn-soft btn-agent-detail" data-agent-id="${escapeAttr(textOf(item.agent_id))}">查看</button>
          </div>
        </td>
      </tr>
    `).join("");

    $$(".btn-agent-detail", tbody).forEach(btn => {
      btn.addEventListener("click", async () => loadAgentDetail(btn.dataset.agentId));
    });
  }

  function renderAgentDetail(agent) {
    const wrap = $("#agentDetailWrap");
    if (!agent || !Object.keys(agent).length) {
      wrap.className = "detail-stack empty-state";
      wrap.textContent = "查無代理詳情";
      return;
    }

    wrap.className = "detail-stack";
    wrap.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">代理資料</div>
        <div class="detail-grid">
          ${Object.entries(agent).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}
        </div>
      </div>
    `;
  }

  function syncCurrentAgentBox(agent) {
    $("#currentAgentLabel").textContent = textOf(agent.agent_id) || "未選取";
    $("#currentAgentName").textContent = textOf(agent.owner_name) || "-";
    $("#currentAgentPoints").textContent = formatValue(agent.points_balance);
    $("#currentAgentCommission").textContent = formatValue(agent.total_commission);
  }

  async function adjustPoints(mode) {
    const agentId = valueOf("#pointsAgentId");
    const pointsValue = Number(valueOf("#pointsValue"));
    const note = valueOf("#pointsNote");

    if (!agentId) return alert("請輸入 agent_id");
    if (!Number.isFinite(pointsValue) || pointsValue <= 0) return alert("points 必須大於 0");

    const points = mode === "subtract" ? -Math.abs(pointsValue) : Math.abs(pointsValue);
    await api("adminAdjustPoints", { agent_id: agentId, points, note });

    toast(mode === "subtract" ? "已扣點" : "已加點");
    await loadAgents();
    await loadAgentDetail(agentId);
  }

  async function adjustCommission() {
    const agentId = valueOf("#commissionAgentId");
    const amount = Number(valueOf("#commissionValue"));
    const note = valueOf("#commissionNote");

    if (!agentId) return alert("請輸入 agent_id");
    if (!Number.isFinite(amount) || amount <= 0) return alert("amount 必須大於 0");

    await api("adminAdjustCommission", { agent_id: agentId, amount, note });

    toast("已補分潤");
    await loadAgents();
    await loadAgentDetail(agentId);
  }

  async function reloadLogsForCurrentAgent() {
    const agentId =
      valueOf("#detailAgentId") ||
      valueOf("#pointsAgentId") ||
      valueOf("#commissionAgentId") ||
      textOf(state.currentAgent && state.currentAgent.agent_id);

    if (!agentId) return alert("請先選取代理");

    const [pointsLogData, commissionLogData] = await Promise.all([
      api("getAgentPointsLog", { agent_id: agentId }),
      api("getAgentCommissionLog", { agent_id: agentId })
    ]);

    renderPointsLog(normalizeList(pointsLogData, ["logs", "points_logs"]));
    renderCommissionLog(normalizeList(commissionLogData, ["logs", "commission_logs"]));
  }

  function renderPointsLog(rows) {
    const tbody = $("#pointsLogTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">沒有點數 Log</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(row => `
      <tr>
        <td>${escapeHtml(formatValue(firstValue(row, ["created_at", "time", "updated_at", "timestamp"])))}</td>
        <td>${escapeHtml(formatValue(firstValue(row, ["type", "action", "log_type"])))}</td>
        <td>${escapeHtml(`${formatValue(firstValue(row, ["before_balance", "before_points", "points_before", "before"]))} → ${formatValue(firstValue(row, ["after_balance", "after_points", "points_after", "after"]))}`)}</td>
        <td>${escapeHtml(formatValue(firstValue(row, ["note", "memo", "remark"])))}</td>
      </tr>
    `).join("");
  }

  function renderCommissionLog(rows) {
    const tbody = $("#commissionLogTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">沒有分潤 Log</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(row => `
      <tr>
        <td>${escapeHtml(formatValue(firstValue(row, ["created_at", "time", "updated_at", "timestamp"])))}</td>
        <td>${escapeHtml(formatValue(firstValue(row, ["amount", "commission_amount", "delta"])))}</td>
        <td>${escapeHtml(`${formatValue(firstValue(row, ["before_total", "before_commission", "commission_before", "before"]))} → ${formatValue(firstValue(row, ["after_total", "after_commission", "commission_after", "after"]))}`)}</td>
        <td>${escapeHtml(formatValue(firstValue(row, ["note", "memo", "remark"])))}</td>
      </tr>
    `).join("");
  }

  async function buildSettlement() {
    const settlementMonth = valueOf("#settlementMonth");
    if (!settlementMonth) return alert("請選擇 settlement_month");

    const data = await api("buildMonthlySettlement", { settlement_month: settlementMonth });
    $("#settlementResult").textContent = JSON.stringify(data, null, 2);
    toast("已建立結算");
  }

  function renderDashboard() {
    const unpaid = state.cards.filter(card => !isPaid(card)).length;
    const needDelivery = state.cards.filter(card => isPaid(card)).length;
    const needRenewal = state.cards.filter(card => needsRenewal(card) || isExpiringSoon(card, 30)).length;
    const addonPending = state.addons.filter(item => {
      const s = textOf(item.status).toLowerCase();
      return s !== "paid" && s !== "cancelled";
    }).length;

    $("#statUnpaid").textContent = unpaid;
    $("#statNeedDelivery").textContent = needDelivery;
    $("#statNeedRenewal").textContent = needRenewal;
    $("#statAddonPending").textContent = addonPending;
    $("#statAgents").textContent = state.agents.length;

    const focus = [];
    if (unpaid > 0) focus.push(`待付款卡片 ${unpaid} 張。`);
    if (needDelivery > 0) focus.push(`已付款待交付卡片 ${needDelivery} 張。`);
    if (needRenewal > 0) focus.push(`需續約關注卡片 ${needRenewal} 張。`);
    if (addonPending > 0) focus.push(`待處理加購單 ${addonPending} 筆。`);
    if (!focus.length) focus.push("目前沒有高優先待辦。");

    $("#dashboardFocus").innerHTML = focus.map(x => `<div class="focus-item">${escapeHtml(x)}</div>`).join("");
  }

  function renderMockAdmins() {
    const tbody = $("#adminUsersTableBody");
    tbody.innerHTML = state.adminUsers.map(user => `
      <tr>
        <td>${escapeHtml(user.admin_id)}</td>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>${escapeHtml(user.permissions)}</td>
        <td>${escapeHtml(user.status)}</td>
        <td><button class="btn btn-xs btn-soft" disabled>編輯（待串 GAS）</button></td>
      </tr>
    `).join("");
  }

  function addMockAdmin() {
    const name = valueOf("#mockAdminName");
    const role = valueOf("#mockAdminRole");
    const permissions = valueOf("#mockAdminPermissions");

    if (!name || !role) return alert("請先輸入名稱與角色");

    const next = state.adminUsers.length + 1;
    state.adminUsers.push({
      admin_id: `AD${String(next).padStart(3, "0")}`,
      name,
      role,
      permissions: permissions || "custom",
      status: "active"
    });

    renderMockAdmins();
    $("#mockAdminName").value = "";
    $("#mockAdminRole").value = "";
    $("#mockAdminPermissions").value = "";
    toast("已新增管理員 UI 假資料");
  }

  function buildFormUrl(inviteCode) {
    const url = new URL(CONFIG.FORM_URL);
    if (inviteCode) url.searchParams.set("invite", inviteCode);
    return url.toString();
  }

  function buildInviteReplyText(inviteCode) {
    return [
      "您好，這是您的智慧名片申請入口。",
      inviteCode ? `邀請碼：${inviteCode}` : "",
      `申請連結：${buildFormUrl(inviteCode)}`,
      "若填寫時有問題，直接回覆客服即可。"
    ].filter(Boolean).join("\n");
  }

  function buildPreviewLink(cardId) {
    return `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`;
  }

  function buildDeliveryLink(cardId) {
    return `${CONFIG.HUB_URL}poster.html?id=${encodeURIComponent(cardId)}`;
  }

  function buildPreviewReplyText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    return [
      `${name}，您好～`,
      "您的智慧名片成品預覽已完成，請先查看預覽內容：",
      buildPreviewLink(id),
      `名片編號：${id}`,
      "目前為付款前預覽階段，確認完成後再進入正式交付。"
    ].join("\n");
  }

  function buildDeliveryReplyText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    return [
      `${name}，您好～`,
      "您的智慧名片已完成正式交付。",
      `交付卡入口：${buildDeliveryLink(id)}`,
      `名片編號：${id}`,
      "開啟後即可查看名片、分享名片、下載名片海報。"
    ].join("\n");
  }

  function buildUpdateReplyText(card, link) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    return [
      `${name}，您好～`,
      "這是您的單次更新入口。",
      `名片編號：${id}`,
      link ? `更新連結：${link}` : "目前尚未產生更新連結。",
      "若完成更新後仍需調整，可再聯繫客服。"
    ].join("\n");
  }

  function buildRenewalReminderText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    return [
      `${name}，您好～`,
      "提醒您，您的智慧名片即將到期 / 已到期。",
      `名片編號：${id}`,
      `到期日：${formatValue(card.expires_at)}`,
      "若要續約，請完成續約付款後通知客服。"
    ].join("\n");
  }

  function buildRenewalDeliveryText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    return [
      `${name}，您好～`,
      "您的智慧名片續約已完成。",
      `交付卡入口：${buildDeliveryLink(id)}`,
      `名片編號：${id}`,
      "若後續仍需更新內容，可再聯繫客服。"
    ].join("\n");
  }

  function buildAddonPaymentReminderText(addon) {
    const orderId = textOf(addon.addon_order_id || addon.add_on_order_id);
    return [
      "您好～提醒您，目前有一筆智慧名片加購單待付款。",
      `加購單號：${orderId}`,
      `名片編號：${textOf(addon.card_id)}`,
      `加購項目：${textOf(addon.addon_type || addon.item_code || addon.addon_key)}`,
      `金額：${formatValue(addon.amount || addon.unit_price)}`,
      "付款完成後請通知客服。"
    ].join("\n");
  }

  function summarizeCardAddons(cardId) {
    const rows = state.addons.filter(item => textOf(item.card_id) === textOf(cardId));
    if (!rows.length) return "無";
    return rows.map(item => {
      const code = textOf(item.addon_type || item.item_code || item.addon_key);
      const qty = formatValue(item.qty || item.quantity || 1);
      const status = textOf(item.status || "-");
      return `${code} x${qty} (${status})`;
    }).join("；");
  }

  function summarizePaymentInfo(cardId) {
    const rows = state.payments.filter(x => textOf(x.card_id || x.id) === textOf(cardId));
    if (!rows.length) return "無付款資料";
    const latest = rows
      .slice()
      .sort((a, b) => textOf(b.created_at).localeCompare(textOf(a.created_at)))[0];
    return `狀態：${textOf(latest.status || latest.billing_status)}；時間：${formatValue(latest.paid_at || latest.created_at)}`;
  }

  function getUpdateInfo(cardId) {
    return state.updateLinks[textOf(cardId)] || { link: "", expire_at: "" };
  }

  function getUpdateModeText(card) {
    return hasUnlimitedUpdate(card) ? "已具備無限更新 / 免單次連結" : "需使用單次更新連結";
  }

  function hasUnlimitedUpdate(card) {
    const cardId = textOf(card.id || card.card_id);
    const ownFlag = [
      textOf(card.update_limit_override_enabled),
      textOf(card.features_json),
      textOf(card.note)
    ].join(" ").toLowerCase();
    if (ownFlag.includes("unlimited")) return true;

    return state.addons.some(item => {
      const code = textOf(item.addon_type || item.item_code || item.addon_key).toLowerCase();
      const status = textOf(item.status).toLowerCase();
      return textOf(item.card_id) === cardId && status === "paid" && code.includes("update");
    });
  }

  function isPaid(card) {
    const cardId = textOf(card.id || card.card_id);
    if (textOf(card.billing_status).toLowerCase() === "paid") return true;

    const paidPayment = state.payments.some(p =>
      textOf(p.card_id) === cardId &&
      textOf(p.status).toLowerCase() === "paid"
    );
    return paidPayment;
  }

  function isExpired(card) {
    const d = parseDate(card.expires_at);
    return !!(d && d < new Date());
  }

  function isExpiringSoon(card, days) {
    const d = parseDate(card.expires_at);
    if (!d) return false;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return d >= now && d <= end;
  }

  function needsRenewal(card) {
    return isExpired(card) || isExpiringSoon(card, 30);
  }

  function getRenewalStateText(card) {
    if (isExpired(card)) return "已到期";
    if (isExpiringSoon(card, 30)) return "30天內到期";
    return "正常";
  }

  function describeAddonImpact(item) {
    const code = textOf(item.addon_type || item.item_code || item.addon_key).toLowerCase();
    const qty = Number(item.qty || item.quantity || 1);
    if (code.includes("photo")) return `照片 +${qty}`;
    if (code.includes("cta")) return `CTA +${qty}`;
    if (code.includes("update")) return "更新權限";
    if (code.includes("marquee")) return "跑馬燈";
    return textOf(item.addon_type || item.item_code || item.addon_key);
  }

  function renderDetailItem(key, value) {
    return `
      <div class="detail-item">
        <div class="detail-key">${escapeHtml(key)}</div>
        <div class="detail-value">${escapeHtml(formatValue(value))}</div>
      </div>
    `;
  }

  function bindCopyButtons(root = document) {
    $$("[data-copy]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        copyText(btn.dataset.copy, "已複製");
      });
    });
  }

  function copyFromField(selector, msg) {
    const text = valueOf(selector);
    if (!text) return alert("目前沒有可複製內容");
    copyText(text, msg);
  }

  function openTextLink(selector) {
    const text = valueOf(selector);
    if (!text) return alert("目前沒有可開啟連結");
    window.open(text, "_blank");
  }

  function copyText(text, message = "已複製") {
    const value = String(text || "");
    if (!value) return alert("沒有可複製的內容");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(() => toast(message)).catch(() => fallbackCopy(value, message));
      return;
    }
    fallbackCopy(value, message);
  }

  function fallbackCopy(value, message) {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      toast(message);
    } catch (err) {
      alert("複製失敗，請手動複製");
    } finally {
      ta.remove();
    }
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.add("hidden"), 1800);
  }

  function setLoading(show) {
    $("#loadingMask").classList.toggle("hidden", !show);
  }

  function setGasStatus(text, type) {
    const el = $("#gasStatus");
    el.textContent = text;
    el.className = `status-pill ${type || ""}`;
  }

  function setDefaultSettlementMonth() {
    const now = new Date();
    $("#settlementMonth").value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    $("#renewDays").value = CONFIG.DEFAULT_RENEW_DAYS;
  }

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatValue(value) {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (err) {
        return String(value);
      }
    }
    return String(value);
  }

  function textOf(value) {
    return value == null ? "" : String(value).trim();
  }

  function valueOf(selector) {
    const el = $(selector);
    return el ? textOf(el.value) : "";
  }

  function planText(value) {
    const v = textOf(value).toLowerCase();
    if (v === "free" || v === "plan_free") return "自由配款";
    if (v === "premium" || v === "plan_premium") return "精品設計款";
    return value ? String(value) : "-";
  }

  function billingStatusText(value) {
    const v = textOf(value).toLowerCase();
    if (v === "paid") return "已付款";
    if (v === "unpaid") return "未付款";
    if (v === "locked") return "已鎖卡";
    return value ? String(value) : "-";
  }

  function cardStatusText(value) {
    const v = textOf(value).toLowerCase();
    if (v === "active") return "啟用中";
    if (v === "inactive") return "停用中";
    if (v === "locked") return "已鎖卡";
    if (v === "expired") return "已到期";
    return value ? String(value) : "-";
  }

  function firstValue(obj, keys) {
    for (const key of keys) {
      const v = obj && obj[key];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }
})();
