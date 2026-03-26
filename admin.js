(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v6.2",
    GAS_BASE_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    ADMIN_KEY: "ANGEL20261972070707",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FORM_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/form.html",
    FETCH_TIMEOUT: 25000,
    DEFAULT_RENEW_DAYS: 365
  };

  const state = {
    cards: [],
    invites: [],
    addons: [],
    payments: [],
    agents: [],
    currentCard: null,
    currentAgent: null,
    currentAddon: null,
    updateLinks: {},
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

    $("#btnSearchInvites").addEventListener("click", renderInvites);
    $("#btnReloadInvites").addEventListener("click", async () => {
      $("#inviteSearch").value = "";
      await loadInvites();
    });

    $("#btnCreateInviteCode").addEventListener("click", createInviteCode);

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
    $("#btnCopyPreviewLink").addEventListener("click", () => copyFromField("#previewLinkBox", "已複製成品預覽連結"));
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
      if (!id) return alert("請輸入 add_on_order_id");
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
      loadInvites(),
      loadAddons(),
      loadPayments(),
      loadAgents()
    ]);
    renderDashboard();
  }

  async function api(action, params = {}) {
    const queryUrl = new URL(CONFIG.GAS_BASE_URL);
    queryUrl.searchParams.set("action", action);
    queryUrl.searchParams.set("admin_key", CONFIG.ADMIN_KEY);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        queryUrl.searchParams.set(key, value);
      }
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);

    try {
      setLoading(true);

      try {
        const getRes = await fetch(queryUrl.toString(), { method: "GET", signal: controller.signal });
        const getText = await getRes.text();
        const getJson = parseJsonSafe(getText);

        if (getRes.ok && getJson && getJson.ok !== false) {
          setGasStatus("正常", "ok");
          return getJson.data != null ? getJson.data : getJson;
        }
      } catch (e) {
        console.warn("GET fallback to POST:", action, e);
      }

      const postRes = await fetch(CONFIG.GAS_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, admin_key: CONFIG.ADMIN_KEY, ...params }),
        signal: controller.signal
      });

      const postText = await postRes.text();
      const postJson = parseJsonSafe(postText);

      if (!postRes.ok) throw new Error((postJson && postJson.error) || `HTTP ${postRes.status}`);
      if (postJson && postJson.ok === false) throw new Error(postJson.error || `${action} 執行失敗`);

      setGasStatus("正常", "ok");
      return postJson && postJson.data != null ? postJson.data : postJson;
    } catch (err) {
      setGasStatus("異常", "bad");
      alert(err.message || "系統發生錯誤");
      throw err;
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  function parseJsonSafe(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (err) {
      console.warn("Invalid JSON:", text);
      throw new Error("GAS 回傳不是合法 JSON");
    }
  }

  async function loadCards() {
    let data = [];
    try {
      data = await api("getCards");
    } catch (err) {
      try {
        data = await api("adminFind");
      } catch (err2) {
        data = [];
      }
    }
    state.cards = normalizeList(data);
    renderCards();
    renderRenewals();
    renderDashboard();
  }

  async function loadCardDetail(cardId) {
    let card = null;
    try {
      card = await api("getCard", { id: cardId });
    } catch (err) {
      card = await api("getCard", { card_id: cardId });
    }

    if (Array.isArray(card)) card = card[0];
    if (!card || typeof card !== "object") {
      const found = state.cards.find(x => textOf(x.id || x.card_id) === textOf(cardId));
      card = found || {};
    }

    state.currentCard = card;
    $("#detailCardId").value = textOf(card.id || card.card_id);

    renderCardDetail(card);
    syncCurrentCardBox(card);
    syncCardWorkflowBoxes(card);
    renderRenewalComposer(card);
  }

  async function loadInvites() {
    let data = [];
    try {
      data = await api("inviteList");
    } catch (err) {
      data = [];
    }
    state.invites = normalizeList(data);
    renderInvites();
  }

  async function loadAddons() {
    let data = [];
    try {
      data = await api("getAddonOrders");
    } catch (err) {
      data = [];
    }
    state.addons = normalizeList(data);
    renderAddons();
    renderDashboard();
  }

  async function loadAddonDetail(addOnOrderId) {
    const detail = await api("getAddonOrder", { add_on_order_id: addOnOrderId });
    state.currentAddon = detail;
    $("#addonDetailId").value = addOnOrderId;
    renderAddonDetail(detail);
  }

  async function loadPayments() {
    let data = [];
    try {
      data = await api("paymentList");
    } catch (err) {
      try {
        data = await api("getPayments");
      } catch (err2) {
        data = [];
      }
    }
    state.payments = normalizeList(data);
    renderDashboard();
    renderRenewals();
  }

  async function loadAgents() {
    const data = await api("adminListAgents");
    state.agents = normalizeList(data);
    renderAgents();
    renderDashboard();
  }

  async function loadAgentDetail(agentId) {
    const detail = await api("adminGetAgent", { agent_id: agentId });
    state.currentAgent = detail || {};
    $("#detailAgentId").value = agentId;
    $("#pointsAgentId").value = agentId;
    $("#commissionAgentId").value = agentId;
    renderAgentDetail(detail);
    syncCurrentAgentBox(detail);
    await reloadLogsForCurrentAgent();
  }

  async function createInviteCode() {
    const count = valueOf("#createInviteCount") || "1";
    const days = valueOf("#createInviteDays") || "30";
    const referrer = valueOf("#createInviteReferrer");
    const serviceAgent = valueOf("#createInviteServiceAgent");
    const agentType = valueOf("#createInviteAgentType");
    const source = valueOf("#createInviteSource") || "admin";

    const res = await api("createInviteCode", {
      count,
      days,
      referrer,
      service_agent: serviceAgent,
      agent_type: agentType,
      source
    });

    $("#inviteCreateResult").textContent = JSON.stringify(res, null, 2);
    toast("邀請碼建立完成");
    await loadInvites();
  }

  function renderInvites() {
    const keyword = valueOf("#inviteSearch").toLowerCase();
    const rows = state.invites.filter(item => {
      const inviteCode = textOf(item.invite_code || item.code);
      const referrer = textOf(item.referrer);
      const serviceAgent = textOf(item.service_agent);
      return !keyword || [inviteCode, referrer, serviceAgent].some(v => v.toLowerCase().includes(keyword));
    });

    const tbody = $("#invitesTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">查無邀請碼資料</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(item => {
      const inviteCode = textOf(item.invite_code || item.code);
      const link = buildFormUrl(inviteCode);
      const script = buildInviteReplyText({
        invite_code: inviteCode,
        referrer: item.referrer
      });
      return `
        <tr>
          <td>${escapeHtml(inviteCode)}</td>
          <td>${escapeHtml(textOf(item.status || "open"))}</td>
          <td>${escapeHtml(textOf(item.referrer))}</td>
          <td>${escapeHtml(textOf(item.service_agent))}</td>
          <td>${escapeHtml(textOf(item.source))}</td>
          <td>${escapeHtml(formatValue(item.expires_at))}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-xs btn-soft" data-copy="${escapeAttr(inviteCode)}">複製邀請碼</button>
              <button class="btn btn-xs btn-primary" data-copy="${escapeAttr(link)}">複製申請連結</button>
              <button class="btn btn-xs btn-soft" data-copy="${escapeAttr(script)}">複製客服文案</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    bindCopyButtons(tbody);
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
    const updateMode = getUpdateModeText(card);

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
          ${renderDetailItem("update_mode", updateMode)}
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

      <div class="action-row">
        <button class="btn btn-soft" data-open-link="${escapeAttr(previewLink)}">開預覽</button>
        <button class="btn btn-primary" data-copy="${escapeAttr(buildPreviewReplyText(card))}">複製預覽文案</button>
        <button class="btn btn-soft ${canDelivery ? "" : "is-disabled"}" ${canDelivery ? `data-open-link="${escapeAttr(deliveryLink)}"` : "disabled"}>開交付卡</button>
        <button class="btn btn-primary ${canDelivery ? "" : "is-disabled"}" ${canDelivery ? `data-copy="${escapeAttr(buildDeliveryReplyText(card))}"` : "disabled"}>複製交付文案</button>
        <button class="btn btn-primary" id="detailGenerateUpdateBtn">產生更新連結</button>
        <button class="btn btn-soft" data-copy="${escapeAttr(buildUpdateReplyText(card, updateInfo.link || ""))}">複製更新文案</button>
      </div>
    `;

    bindCopyButtons(wrap);
    bindOpenLinkButtons(wrap);
    const btn = $("#detailGenerateUpdateBtn");
    if (btn) {
      btn.addEventListener("click", generateUpdateLinkForCurrentCard);
    }
  }

  function syncCurrentCardBox(card) {
    const id = textOf(card.id || card.card_id);
    $("#currentCardLabel").textContent = id || "未選取";
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
    $("#deliveryTextBox").value = canDelivery ? buildDeliveryReplyText(card) : "此卡尚未付款，暫時不可提供交付卡。";

    $("#updateLinkBox").value = updateInfo.link || "";
    $("#updateTextBox").value = buildUpdateReplyText(card, updateInfo.link || "");

    const allowSingleUpdate = !hasUnlimitedUpdate(card);
    $("#updateHint").textContent = allowSingleUpdate
      ? "此卡目前可使用單次更新流程。若尚未產生更新連結，請按「產生單次更新連結」。"
      : "此卡疑似已有無限更新權限，原則上不需單次更新連結。";
  }

  async function generateUpdateLinkForCurrentCard() {
    if (!state.currentCard) return alert("請先選取卡片");
    const id = textOf(state.currentCard.id || state.currentCard.card_id);

    if (hasUnlimitedUpdate(state.currentCard)) {
      const go = confirm("此卡看起來已有無限更新權限，仍要產生單次更新連結嗎？");
      if (!go) return;
    }

    const res = await api("adminCreateUpdateLink24h", { id });
    const link = textOf(res.update_link || res.link);
    const expireAt = textOf(res.expire_at || res.update_token_expire || res.expires_at);

    state.updateLinks[id] = { link, expire_at: expireAt };
    $("#updateLinkBox").value = link;
    $("#updateTextBox").value = buildUpdateReplyText(state.currentCard, link);
    renderCardDetail(state.currentCard);
    toast("已產生更新連結");
  }

  function renderAddons() {
    const keyword = valueOf("#addonSearch").toLowerCase();
    const rows = state.addons.filter(item => {
      const hay = [
        textOf(item.add_on_order_id || item.order_id),
        textOf(item.card_id),
        textOf(item.agent_id),
        textOf(item.item_code)
      ].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });

    const tbody = $("#addonsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">查無加購單資料</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(item => {
      const addOnOrderId = textOf(item.add_on_order_id || item.order_id);
      const status = textOf(item.status || "pending");
      return `
        <tr>
          <td>${escapeHtml(addOnOrderId)}</td>
          <td>${escapeHtml(textOf(item.card_id))}</td>
          <td>${escapeHtml(textOf(item.item_code))}</td>
          <td>${escapeHtml(formatValue(item.qty || item.quantity || 1))}</td>
          <td>${escapeHtml(status)}</td>
          <td>${escapeHtml(formatValue(item.amount || item.total_amount || item.unit_price))}</td>
          <td>${escapeHtml(describeAddonImpact(item))}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-xs btn-soft btn-addon-detail" data-addon-id="${escapeAttr(addOnOrderId)}">查看</button>
              ${status !== "paid" ? `<button class="btn btn-xs btn-primary btn-addon-paid" data-addon-id="${escapeAttr(addOnOrderId)}">確認付款</button>` : ""}
              ${status !== "cancelled" ? `<button class="btn btn-xs btn-danger btn-addon-cancel" data-addon-id="${escapeAttr(addOnOrderId)}">取消</button>` : ""}
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
      btn.addEventListener("click", async () => {
        await confirmAddonPaid(btn.dataset.addonId);
      });
    });

    $$(".btn-addon-cancel", tbody).forEach(btn => {
      btn.addEventListener("click", async () => {
        await cancelAddon(btn.dataset.addonId);
      });
    });
  }

  function renderAddonDetail(detail) {
    const wrap = $("#addonDetailWrap");
    if (!detail || !Object.keys(detail).length) {
      wrap.className = "detail-stack empty-state";
      wrap.textContent = "查無加購單詳情";
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

  async function confirmAddonPaid(addOnOrderId) {
    const go = confirm(`確定要將加購單 ${addOnOrderId} 標記為已付款嗎？`);
    if (!go) return;
    await api("confirmAddonOrderPaid", { add_on_order_id: addOnOrderId });
    toast("加購單已確認付款");
    await loadAddons();
    if (state.currentCard) await loadCardDetail(textOf(state.currentCard.id || state.currentCard.card_id));
  }

  async function cancelAddon(addOnOrderId) {
    const go = confirm(`確定要取消加購單 ${addOnOrderId} 嗎？`);
    if (!go) return;
    await api("adminCancelAddonOrder", { add_on_order_id: addOnOrderId });
    toast("加購單已取消");
    await loadAddons();
  }

  function renderRenewals() {
    const rows = state.cards.filter(card => needsRenewal(card) || isExpired(card) || isExpiringSoon(card, 30));
    const tbody = $("#renewalTableBody");

    const soonCount = state.cards.filter(card => isExpiringSoon(card, 30) && !isExpired(card)).length;
    const expiredCount = state.cards.filter(card => isExpired(card)).length;
    const pendingPayCount = rows.filter(card => !isPaid(card)).length;

    $("#renewalSoonCount").textContent = soonCount;
    $("#renewalExpiredCount").textContent = expiredCount;
    $("#renewalPendingPayCount").textContent = pendingPayCount;

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

    renderDashboard();
  }

  function renderRenewalComposer(card) {
    if (!card) {
      $("#renewalTextBox").value = "";
      return;
    }
    $("#renewalTextBox").value = buildRenewalReminderText(card);
  }

  async function confirmRenewalAndExtend() {
    if (!state.currentCard) return alert("請先選取卡片");
    const id = textOf(state.currentCard.id || state.currentCard.card_id);
    const renewDays = Number(valueOf("#renewDays") || CONFIG.DEFAULT_RENEW_DAYS);

    if (!Number.isFinite(renewDays) || renewDays <= 0) {
      return alert("續約天數必須大於 0");
    }

    const go = confirm(`將卡片 ${id} 執行「付款確認＋續約 ${renewDays} 天」？`);
    if (!go) return;

    await api("adminMarkPaid", { id, note: `renewal paid ${renewDays} days`, operator: "admin-v6.2" });

    const base = parseDate(state.currentCard.expires_at);
    const start = base && base > new Date() ? base : new Date();
    const next = new Date(start.getTime() + renewDays * 24 * 60 * 60 * 1000);

    try {
      await api("adminUpdateCard", {
        id,
        expires_at: next.toISOString(),
        status: "active",
        billing_status: "paid"
      });
    } catch (err) {
      await api("adminUpdateCard", {
        card_id: id,
        expires_at: next.toISOString(),
        status: "active",
        billing_status: "paid"
      });
    }

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
    const pointsRaw = Number(valueOf("#pointsValue"));
    const note = valueOf("#pointsNote");

    if (!agentId) return alert("請輸入 agent_id");
    if (!Number.isFinite(pointsRaw) || pointsRaw <= 0) return alert("points 必須大於 0");

    const points = mode === "subtract" ? -Math.abs(pointsRaw) : Math.abs(pointsRaw);
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

    const [pointsLog, commissionLog] = await Promise.all([
      api("getAgentPointsLog", { agent_id: agentId }),
      api("getAgentCommissionLog", { agent_id: agentId })
    ]);

    renderPointsLog(normalizeList(pointsLog));
    renderCommissionLog(normalizeList(commissionLog));
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
        <td>${escapeHtml(`${formatValue(firstValue(row, ["before_points", "points_before", "before"]))} → ${formatValue(firstValue(row, ["after_points", "points_after", "after"]))}`)}</td>
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
        <td>${escapeHtml(`${formatValue(firstValue(row, ["before_commission", "commission_before", "before"]))} → ${formatValue(firstValue(row, ["after_commission", "commission_after", "after"]))}`)}</td>
        <td>${escapeHtml(formatValue(firstValue(row, ["note", "memo", "remark"])))}</td>
      </tr>
    `).join("");
  }

  async function buildSettlement() {
    const settlementMonth = valueOf("#settlementMonth");
    if (!settlementMonth) return alert("請選擇 settlement_month");

    const res = await api("buildMonthlySettlement", { settlement_month: settlementMonth });
    $("#settlementResult").textContent = JSON.stringify(res, null, 2);
    toast("已建立結算");
  }

  function renderDashboard() {
    const unpaid = state.cards.filter(card => !isPaid(card)).length;
    const needDelivery = state.cards.filter(card => isPaid(card) && isActiveOrCanDeliver(card)).length;
    const needRenewal = state.cards.filter(card => needsRenewal(card) || isExpiringSoon(card, 30)).length;
    const addonPending = state.addons.filter(item => textOf(item.status).toLowerCase() !== "paid" && textOf(item.status).toLowerCase() !== "cancelled").length;
    const agentCount = state.agents.length;

    $("#statUnpaid").textContent = unpaid;
    $("#statNeedDelivery").textContent = needDelivery;
    $("#statNeedRenewal").textContent = needRenewal;
    $("#statAddonPending").textContent = addonPending;
    $("#statAgents").textContent = agentCount;

    const focus = [];
    if (unpaid > 0) focus.push(`待付款卡片 ${unpaid} 張，請先確認付款，再交付交付卡。`);
    if (needDelivery > 0) focus.push(`已有 ${needDelivery} 張已付款卡片可進入交付流程。`);
    if (needRenewal > 0) focus.push(`共有 ${needRenewal} 張卡片進入續約觀察區。`);
    if (addonPending > 0) focus.push(`目前有 ${addonPending} 筆加購單待處理。`);
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
        <td>
          <div class="table-actions">
            <button class="btn btn-xs btn-soft" disabled>編輯（待串 GAS）</button>
          </div>
        </td>
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

  function buildPreviewLink(cardId) {
    return `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`;
  }

  function buildDeliveryLink(cardId) {
    return `${CONFIG.HUB_URL}poster.html?id=${encodeURIComponent(cardId)}`;
  }

  function buildInviteReplyText(payload) {
    const code = textOf(payload.invite_code);
    const link = buildFormUrl(code);
    return [
      `您好，這是您的智慧名片申請入口。`,
      code ? `邀請碼：${code}` : ``,
      `申請連結：${link}`,
      `若填寫時有問題，直接回覆客服即可。`
    ].filter(Boolean).join("\n");
  }

  function buildPreviewReplyText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    const link = buildPreviewLink(id);
    return [
      `${name}，您好～`,
      `您的智慧名片成品預覽已完成，請先查看預覽內容：`,
      link,
      `名片編號：${id}`,
      `目前為付款前預覽階段，確認完成後再進入正式交付。`
    ].join("\n");
  }

  function buildDeliveryReplyText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    const link = buildDeliveryLink(id);
    return [
      `${name}，您好～`,
      `您的智慧名片已完成正式交付。`,
      `交付卡入口：${link}`,
      `名片編號：${id}`,
      `開啟後即可查看名片、分享名片、下載名片海報。`
    ].join("\n");
  }

  function buildUpdateReplyText(card, link) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    const lines = [
      `${name}，您好～`,
      `這是您的單次更新入口。`,
      `名片編號：${id}`
    ];
    if (link) lines.push(`更新連結：${link}`);
    else lines.push(`目前尚未產生更新連結，請由客服重新產生後提供。`);
    lines.push(`若內容更新完成後仍需調整，可再與客服聯繫。`);
    return lines.join("\n");
  }

  function buildRenewalReminderText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    const expiresAt = formatValue(card.expires_at);
    return [
      `${name}，您好～`,
      `提醒您，您的智慧名片即將到期 / 已到期。`,
      `名片編號：${id}`,
      `到期日：${expiresAt}`,
      `若要續約，請完成續約付款後通知客服，我們會協助您續期並重新交付。`
    ].join("\n");
  }

  function buildRenewalDeliveryText(card) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    const delivery = buildDeliveryLink(id);
    return [
      `${name}，您好～`,
      `您的智慧名片續約已完成。`,
      `交付卡入口：${delivery}`,
      `名片編號：${id}`,
      `若後續仍需更新內容，可再聯繫客服。`
    ].join("\n");
  }

  function buildAddonPaymentReminderText(addon) {
    const orderId = textOf(addon.add_on_order_id || addon.order_id);
    const cardId = textOf(addon.card_id);
    const itemCode = textOf(addon.item_code);
    const amount = formatValue(addon.amount || addon.total_amount || addon.unit_price);
    return [
      `您好～提醒您，目前有一筆智慧名片加購單待付款。`,
      `加購單號：${orderId}`,
      `名片編號：${cardId}`,
      `加購項目：${itemCode}`,
      `金額：${amount}`,
      `付款完成後請通知客服，我們會協助確認並開通。`
    ].join("\n");
  }

  function summarizeCardAddons(cardId) {
    const rows = state.addons.filter(item => textOf(item.card_id) === textOf(cardId) && textOf(item.status).toLowerCase() !== "cancelled");
    if (!rows.length) return "無";
    return rows.map(item => `${textOf(item.item_code)} x${formatValue(item.qty || item.quantity || 1)} (${textOf(item.status || "pending")})`).join("；");
  }

  function summarizePaymentInfo(cardId) {
    const payment = state.payments.find(x => textOf(x.id || x.card_id) === textOf(cardId));
    if (!payment) return "無付款紀錄";
    return `付款狀態：${billingStatusText(payment.billing_status)}；付款時間：${formatValue(payment.payment_paid_at)}`;
  }

  function getUpdateInfo(cardId) {
    return state.updateLinks[textOf(cardId)] || { link: "", expire_at: "" };
  }

  function getUpdateModeText(card) {
    return hasUnlimitedUpdate(card) ? "已具備無限更新 / 免單次連結" : "需使用單次更新連結";
  }

  function hasUnlimitedUpdate(card) {
    const hay = JSON.stringify(card || {}).toLowerCase();
    if (hay.includes("update_unlimited")) return true;
    if (hay.includes("unlimited_update")) return true;
    if (hay.includes("addon_update_unlimited")) return true;
    return state.addons.some(item =>
      textOf(item.card_id) === textOf(card.id || card.card_id) &&
      textOf(item.status).toLowerCase() === "paid" &&
      textOf(item.item_code).toLowerCase().includes("update")
    );
  }

  function isPaid(card) {
    return textOf(card.billing_status).toLowerCase() === "paid" || textOf(card.payment_status).toLowerCase() === "paid";
  }

  function isActiveOrCanDeliver(card) {
    const s = textOf(card.status).toLowerCase();
    return s === "active" || s === "" || s === "inactive" || s === "locked";
  }

  function needsRenewal(card) {
    return isExpired(card) || isExpiringSoon(card, 30);
  }

  function isExpired(card) {
    const date = parseDate(card.expires_at);
    if (!date) return false;
    return date < new Date();
  }

  function isExpiringSoon(card, days) {
    const date = parseDate(card.expires_at);
    if (!date) return false;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return date >= now && date <= end;
  }

  function getRenewalStateText(card) {
    if (isExpired(card)) return "已到期";
    if (isExpiringSoon(card, 30)) return "30天內到期";
    return "正常";
  }

  function describeAddonImpact(item) {
    const code = textOf(item.item_code).toLowerCase();
    const qty = Number(item.qty || item.quantity || 1);
    if (code.includes("photo")) return `照片 +${qty}`;
    if (code.includes("cta")) return `CTA +${qty}`;
    if (code.includes("update")) return `更新權限`;
    if (code.includes("marquee")) return `跑馬燈`;
    return textOf(item.item_name || item.item_code || "加購");
  }

  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  function firstValue(obj, keys) {
    for (const key of keys) {
      const v = obj && obj[key];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  }

  function renderDetailItem(key, value) {
    return `
      <div class="detail-item">
        <div class="detail-key">${escapeHtml(key)}</div>
        <div class="detail-value">${escapeHtml(formatValue(value))}</div>
      </div>
    `;
  }

  function copyFromField(selector, msg) {
    const text = valueOf(selector);
    if (!text) return alert("目前沒有可複製的內容");
    copyText(text, msg);
  }

  function openTextLink(selector) {
    const text = valueOf(selector);
    if (!text) return alert("目前沒有可開啟的連結");
    window.open(text, "_blank");
  }

  function bindCopyButtons(root = document) {
    $$("[data-copy]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        copyText(btn.dataset.copy, "已複製");
      });
    });
  }

  function bindOpenLinkButtons(root = document) {
    $$("[data-open-link]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        window.open(btn.dataset.openLink, "_blank");
      });
    });
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
    toast._timer = setTimeout(() => {
      el.classList.add("hidden");
    }, 1800);
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
    const text = String(value);
    return text;
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
