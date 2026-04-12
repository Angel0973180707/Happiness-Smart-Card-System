(() => {
  "use strict";

  // ─────────────────────────────────────────────
  //  CONFIG
  // ─────────────────────────────────────────────
  const CONFIG = {
    VERSION: "v6.4.0",
    GAS_BASE_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FORM_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/form.html",
    DEFAULT_RENEW_DAYS: 365,
    API_TIMEOUT_MS: 10000,
    API_RETRY: 1
  };

  // ─────────────────────────────────────────────
  //  ADMIN KEY 管理（localStorage 永久保存）
  // ─────────────────────────────────────────────
  const KEY_STORAGE = "hsc_admin_key";

  function getAdminKey() {
    return localStorage.getItem(KEY_STORAGE) || "";
  }

  function saveAdminKey(key) {
    if (!key || !key.trim()) return false;
    localStorage.setItem(KEY_STORAGE, key.trim());
    return true;
  }

  function clearAdminKey() {
    localStorage.removeItem(KEY_STORAGE);
  }

  function renderKeyStatus() {
    const key = getAdminKey();
    const statusEl = $("#keyStatus");
    if (!statusEl) return;
    if (key) {
      const masked = "•".repeat(Math.max(0, key.length - 4)) + key.slice(-4);
      statusEl.textContent = `✅ 已設定（${masked}）`;
      statusEl.className = "key-status ok";
    } else {
      statusEl.textContent = "⚠️ 尚未設定，API 無法呼叫";
      statusEl.className = "key-status warn";
    }
  }

  // ─────────────────────────────────────────────
  //  STATE（v6.4 擴充）
  // ─────────────────────────────────────────────
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
    ],
    // v6.4 新增 state
    paymentList: [],
    recognitionItems: [],
    recognitionRenewalItems: [],
    recognitionAddonItems: [],
    renewalItems: [],
    commissionItems: [],
    announcementItems: [],
    trackingSummary: null,
    cardTrackingDetail: null,
    agentTrackingDetail: null,
    opsLogs: [],
    schemaStatus: null,
    deliveryCardMeta: {},
    deliveryWalletMeta: {},
    currentRecognitionType: "renewal",
    currentPaymentDetail: null,
    currentRecognitionDetail: null,
    currentRenewalDetail: null
  };

  // ─────────────────────────────────────────────
  //  SAFE EVENT HELPER
  // ─────────────────────────────────────────────
  function on(selector, event, handler) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (el) el.addEventListener(event, handler);
  }

  // ─────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindEvents();
    setDefaultSettlementMonth();
    renderMockAdmins();
    renderKeyStatus();
    if (getAdminKey()) {
      refreshAll();
    } else {
      toast("⚠️ 請先在左側「Admin Key」區設定金鑰");
    }
  }

  // ─────────────────────────────────────────────
  //  BIND EVENTS（保留原有 + v6.4 新增）
  // ─────────────────────────────────────────────
  function bindEvents() {
    // 原有導航按鈕
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

    // 邀請碼
    $("#btnCreateInviteCode").addEventListener("click", createInviteCodeAligned);
    on("#btnCopyInviteCode", "click", () => {
      const code = textOf(state.lastInviteCreated?.invite_code);
      if (!code) return toast("⚠️ 請先建立邀請碼");
      copyText(code, "✅ 已複製邀請碼");
    });
    on("#btnCopyInviteUrl", "click", () => copyFromField("#inviteFormUrlBox", "✅ 已複製申請連結"));
    on("#btnCopyInviteText", "click", () => copyFromField("#inviteReplyTextBox", "✅ 已複製客服文案"));

    // 卡片
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

    // 預覽
    $("#btnOpenPreviewLink").addEventListener("click", () => openTextLink("#previewLinkBox"));
    $("#btnCopyPreviewLink").addEventListener("click", () => copyFromField("#previewLinkBox", "已複製預覽連結"));
    $("#btnCopyPreviewText").addEventListener("click", () => copyFromField("#previewTextBox", "已複製預覽文案"));

    // 交付卡原有
    $("#btnOpenDeliveryLink").addEventListener("click", () => openTextLink("#deliveryLinkBox"));
    $("#btnCopyDeliveryLink").addEventListener("click", () => copyFromField("#deliveryLinkBox", "已複製交付卡連結"));
    $("#btnCopyDeliveryText").addEventListener("click", () => copyFromField("#deliveryTextBox", "已複製交付文案"));

    // 更新連結
    $("#btnGenerateUpdateLink").addEventListener("click", generateUpdateLinkForCurrentCard);
    $("#btnCopyUpdateLink").addEventListener("click", () => copyFromField("#updateLinkBox", "已複製更新連結"));
    $("#btnCopyUpdateText").addEventListener("click", () => copyFromField("#updateTextBox", "已複製更新文案"));

    // 加購
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
    $("#btnCreateAddonOrder").addEventListener("click", () => {
      const formCard = $("#createAddonFormCard");
      if (formCard) formCard.style.display = formCard.style.display === "none" ? "block" : "none";
    });
    $("#btnCloseAddonForm").addEventListener("click", () => {
      $("#createAddonFormCard").style.display = "none";
    });
    $("#btnSubmitCreateAddon").addEventListener("click", createAddonOrder);

    // 續約
    $("#btnConfirmRenewalPaid").addEventListener("click", async () => {
      if (!state.currentCard) return alert("請先選取卡片");
      const id = textOf(state.currentCard.id || state.currentCard.card_id);
      await renewCard(id);
    });
    $("#btnCopyRenewalText").addEventListener("click", copyRenewalReminderText);
    $("#btnCopyRenewalDeliveryText").addEventListener("click", copyRenewalDeliveryText);
    $("#btnRefreshRenewalList").addEventListener("click", loadRenewalList);
    $("#btnTriggerRenewalReminders").addEventListener("click", triggerRenewalReminders);
    $("#btnTriggerPaymentReminder").addEventListener("click", triggerPaymentReminder);

    // 代理
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
    $("#btnRepairMissingAgents").addEventListener("click", repairMissingAgents);
    $("#btnNormalizeAgentType").addEventListener("click", normalizeAgentType);
    $("#btnFreezeAgent").addEventListener("click", () => freezeUnfreezeAgent("freeze"));
    $("#btnUnfreezeAgent").addEventListener("click", () => freezeUnfreezeAgent("unfreeze"));
    $("#btnSetAgentUpgrade").addEventListener("click", setAgentUpgrade);
    $("#btnUpdateAgentType").addEventListener("click", updateAgentType);

    // 點數/分潤/Log
    $("#btnAddPoints").addEventListener("click", () => adjustPoints("add"));
    $("#btnSubtractPoints").addEventListener("click", () => adjustPoints("subtract"));
    $("#btnAdjustCommission").addEventListener("click", adjustCommission);
    $("#btnLoadLogs").addEventListener("click", reloadLogsForCurrentAgent);
    $("#btnLoadCommissions").addEventListener("click", loadCommissionList);
    $("#btnLoadPendingCommissions").addEventListener("click", loadPendingCommissions);

    // 結算
    $("#btnBuildSettlement").addEventListener("click", buildSettlement);

    // 管理員
    $("#btnAddMockAdmin").addEventListener("click", addMockAdmin);

    // Admin Key
    on("#btnSaveKey", "click", () => {
      const input = valueOf("#adminKeyInput");
      if (!input) return toast("⚠️ 請輸入 Key");
      const ok = saveAdminKey(input);
      if (ok) {
        $("#adminKeyInput").value = "";
        renderKeyStatus();
        toast("✅ Key 已儲存，重新載入資料中…");
        refreshAll();
      }
    });
    on("#btnClearKey", "click", () => {
      if (!confirm("確定清除已儲存的 Admin Key？")) return;
      clearAdminKey();
      renderKeyStatus();
      toast("🗑️ Key 已清除");
    });
    on("#adminKeyInput", "keydown", (e) => {
      if (e.key === "Enter") $("#btnSaveKey")?.click();
    });

    // ─────────────────────────────────────────
    // v6.4 新增事件綁定
    // ─────────────────────────────────────────

    // 付款管理
    $("#btnRefreshPayments").addEventListener("click", loadPaymentList);
    $("#btnLoadPendingOffline").addEventListener("click", loadPendingOfflinePayments);
    $("#btnBuildPaymentNotice").addEventListener("click", () => buildPaymentNoticeTexts("payment"));
    $("#btnBuildPaidNotice").addEventListener("click", () => buildPaymentNoticeTexts("paid"));
    $("#btnBuildDeliveryNotice").addEventListener("click", () => buildPaymentNoticeTexts("delivery"));

    // 採認管理
    $$(".recognition-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        $$(".recognition-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        state.currentRecognitionType = tab.dataset.type;
        loadRecognitionQueues();
      });
    });

    // 公告管理
    $("#btnRefreshAnnouncements").addEventListener("click", loadAnnouncements);
    $("#btnCreateAnnouncement").addEventListener("click", showAnnouncementForm);
    $("#btnCloseAnnouncementForm").addEventListener("click", hideAnnouncementForm);
    $("#btnSaveAnnouncement").addEventListener("click", saveAnnouncement);
    $("#btnCancelAnnouncement").addEventListener("click", hideAnnouncementForm);

    // 追蹤分析
    $("#btnRefreshTracking").addEventListener("click", loadTrackingSummary);
    $("#btnGetCardTracking").addEventListener("click", getCardTrackingStats);
    $("#btnGetAgentTracking").addEventListener("click", getAgentTrackingStats);

    // 系統工具
    $("#btnCheckSchema").addEventListener("click", checkSchemaStatus);
    $("#btnRepairDueAt").addEventListener("click", () => runRepairAction("due_at"));
    $("#btnRepairAddonStatus").addEventListener("click", () => runRepairAction("addon_status"));
    $("#btnRepairDataValidation").addEventListener("click", () => runRepairAction("data_validation"));
    $("#btnNormalizeCardTheme").addEventListener("click", () => runRepairAction("normalize_card_theme"));
    $("#btnAuditCardTheme").addEventListener("click", () => runRepairAction("audit_card_theme"));
    $("#btnInstallSystemTriggers").addEventListener("click", () => runRepairAction("install_system_triggers"));
    $("#btnInstallCommercialTriggers").addEventListener("click", () => runRepairAction("install_commercial_triggers"));
    $("#btnRunDailyOps").addEventListener("click", runDailyOps);
    $("#btnRefreshOpsLogs").addEventListener("click", loadRecentOpsLogs);

    // 交付卡控制區（v6.4 新增）
    $("#btnCopyCardLink").addEventListener("click", () => copyFromValue("#toolboxCardLink", "已複製名片連結"));
    $("#btnCopyPosterLink").addEventListener("click", () => copyFromValue("#toolboxPosterLink", "已複製交付卡連結"));
    $("#btnCopyReferralToolLink").addEventListener("click", () => copyFromValue("#toolboxReferralLink", "已複製推薦入口"));
    $("#btnCopyUpdateToolLink").addEventListener("click", () => copyFromValue("#toolboxUpdateLink", "已複製更新入口"));
    $("#btnCopyRenewalToolLink").addEventListener("click", () => copyFromValue("#toolboxRenewalLink", "已複製續用入口"));
    $("#btnCopyPosterUrlLink").addEventListener("click", () => copyFromValue("#toolboxPosterUrl", "已複製海報圖片連結"));
    $("#btnCopyTrialShareText").addEventListener("click", () => copyFromField("#trialShareText", "已複製文案"));
    $("#btnCopyReferralEntryText").addEventListener("click", () => copyFromField("#referralEntryText", "已複製文案"));
    $("#btnCopyUpdateEntryText").addEventListener("click", () => copyFromField("#updateEntryText", "已複製文案"));
    $("#btnCopyRenewalEntryText").addEventListener("click", () => copyFromField("#renewalEntryText", "已複製文案"));
  }

  // ─────────────────────────────────────────────
  //  REFRESH ALL（v6.4 擴充）
  // ─────────────────────────────────────────────
  async function refreshAll() {
    setLoading(true);
    const results = await Promise.allSettled([
      loadCards(),
      loadPayments(),
      loadAddons(),
      loadAgents(),
      loadPaymentList(),
      loadRecognitionQueues(),
      loadAnnouncements(),
      loadTrackingSummary(),
      loadRecentOpsLogs(),
      checkSchemaStatus()
    ]);
    setLoading(false);

    // 統計失敗數量
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) {
      console.warn("[refreshAll] 部分載入失敗:", failed.length);
    }

    renderDashboard();
    renderDeliveryHealthSummary();
  }
    // ─────────────────────────────────────────────
  //  API LAYER（v6.4 標準化）
  // ─────────────────────────────────────────────

  async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.API_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function apiGet(action, params = {}) {
    const key = getAdminKey();
    if (!key) {
      toast("⚠️ 請先在左側「Admin Key」區設定金鑰");
      throw new Error("Admin Key 未設定");
    }
    const url = new URL(CONFIG.GAS_BASE_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("admin_key", key);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, v);
      }
    });
    return _apiCall("GET", url.toString(), null, action);
  }

  async function apiPost(action, params = {}) {
    const key = getAdminKey();
    if (!key) {
      toast("⚠️ 請先在左側「Admin Key」區設定金鑰");
      throw new Error("Admin Key 未設定");
    }
    return _apiCall("POST", CONFIG.GAS_BASE_URL, JSON.stringify({ action, admin_key: key, ...params }), action);
  }

  async function _apiCall(method, url, body, action, attempt = 0) {
    try {
      setLoading(true);
      const options = { method, ...(body ? { headers: { "Content-Type": "text/plain;charset=utf-8" }, body } : {}) };
      const res = await fetchWithTimeout(url, options, CONFIG.API_TIMEOUT_MS);
      const text = await res.text();
      const json = parseJsonSafe(text);
      if (!res.ok) throw new Error((json && json.error) || `HTTP ${res.status}`);
      if (json && json.ok === false) throw new Error(json.error || `${action} 執行失敗`);
      setGasStatus("正常", "ok");
      const result = json && json.data != null ? json.data : json;
      console.info("[API]", { action, method, result });
      return result;
    } catch (err) {
      if (attempt < CONFIG.API_RETRY) {
        console.warn(`[API] retry #${attempt + 1}`, action, err.message);
        await new Promise(r => setTimeout(r, 600));
        return _apiCall(method, url, body, action, attempt + 1);
      }
      console.error("[API] error:", action, err);
      setGasStatus("異常", "bad");
      toast(`❌ ${action}：${err.message || "系統錯誤"}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const WRITE_ACTIONS = new Set([
    "confirmPayment", "confirmAddonOrderPaid", "adminCancelAddonOrder", "markCardRenewed",
    "adminAdjustPoints", "adminAdjustCommission", "adminMarkPaid", "adminUpdateCard",
    "createInviteCode", "buildMonthlySettlement", "approveRecognition", "rejectRecognition",
    "adminSaveAnnouncement", "adminToggleAnnouncement", "adminFreezeAgent", "adminUnfreezeAgent",
    "adminSetAgentUpgrade", "adminUpdateAgentType", "adminRepairMissingAgents",
    "adminNormalizeAgentType", "markCommissionPaid", "adminCreateAddonOrder",
    "adminMarkAddonPaid", "adminBackfillAddonDueAt", "expirePendingAddonOrders",
    "repairAddonOrderStatuses", "triggerRenewalReminder", "triggerRenewalPaymentReminder",
    "installSystemTriggers", "installCommercialTriggers", "runDailyOps",
    "adminRepairDueAt", "adminRepairDataValidation", "adminNormalizeCardThemeFields",
    "adminAuditCardThemeFields"
  ]);

  async function api(action, params = {}) {
    if (WRITE_ACTIONS.has(action)) return apiPost(action, params);
    return apiGet(action, params);
  }

  // ─────────────────────────────────────────────
  //  PARSE HELPERS
  // ─────────────────────────────────────────────
  function parseJsonSafe(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
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

  // ─────────────────────────────────────────────
  //  LOAD DATA（保留原有 + v6.4 新增）
  // ─────────────────────────────────────────────
  async function loadCards() {
    const data = await apiGet("getCards");
    state.cards = normalizeList(data, ["cards"]);
    renderCards();
    renderRenewals();
    renderDashboard();
  }

  async function loadCardDetail(cardId) {
    let data;
    try {
      data = await apiGet("getCard", { id: cardId });
    } catch {
      data = await apiGet("getCard", { card_id: cardId });
    }
    const card = data.card || data || {};
    state.currentCard = card;
    $("#detailCardId").value = textOf(card.id || card.card_id);
    renderCardDetail(card);
    syncCurrentCardBox(card);
    syncCardWorkflowBoxes(card);
    renderRenewalComposer(card);
    // v6.4：同步交付卡控制區
    syncDeliveryControlPanel(card);
  }

  async function loadPayments() {
    const data = await apiGet("getPayments");
    state.payments = normalizeList(data, ["payments"]);
    renderDashboard();
    renderRenewals();
  }

  async function loadAddons() {
    const data = await apiGet("getAddonOrders");
    state.addons = normalizeList(data, ["addon_orders", "orders", "addons"]);
    renderAddons();
    renderDashboard();
  }

  async function loadAddonDetail(addonOrderId) {
    const data = await apiGet("getAddonOrder", { addon_order_id: addonOrderId });
    const detail = data.addon_order || data.order || data.addon || data || {};
    state.currentAddon = detail;
    $("#addonDetailId").value = addonOrderId;
    renderAddonDetail(detail);
  }

  async function loadAgents() {
    const data = await apiGet("adminListAgents");
    state.agents = normalizeList(data, ["agents"]);
    renderAgents();
    renderDashboard();
  }

  async function loadAgentDetail(agentId) {
    const data = await apiGet("adminGetAgent", { agent_id: agentId });
    const detail = data.agent || data || {};
    state.currentAgent = detail;
    $("#detailAgentId").value = agentId;
    $("#pointsAgentId").value = agentId;
    $("#commissionAgentId").value = agentId;
    renderAgentDetail(detail);
    syncCurrentAgentBox(detail);
    await reloadLogsForCurrentAgent();
  }

  // v6.4 新增載入函式
  async function loadPaymentList() {
    try {
      const data = await apiGet("getPayments");
      state.paymentList = normalizeList(data, ["payments", "data"]);
      renderPayments();
    } catch (err) {
      console.error("[loadPaymentList]", err);
      state.paymentList = [];
      renderPayments();
    }
  }

  async function loadPaymentDetail(paymentId) {
    try {
      const data = await apiGet("getPaymentDetail", { payment_id: paymentId });
      state.currentPaymentDetail = data.payment || data || {};
      renderPaymentDetail(state.currentPaymentDetail);
    } catch (err) {
      console.error("[loadPaymentDetail]", err);
      toast("載入付款詳情失敗");
    }
  }

  async function loadPendingOfflinePayments() {
    try {
      const data = await apiGet("getPendingOfflinePayments");
      const list = normalizeList(data, ["payments", "data"]);
      if (list.length === 0) {
        toast("目前沒有待確認的離線付款");
      } else {
        toast(`找到 ${list.length} 筆待確認離線付款`);
        state.paymentList = list;
        renderPayments();
      }
    } catch (err) {
      console.error("[loadPendingOfflinePayments]", err);
    }
  }

  async function loadRecognitionQueues() {
    try {
      if (state.currentRecognitionType === "renewal") {
        const data = await apiGet("getRenewalRecognitionQueue");
        state.recognitionRenewalItems = normalizeList(data, ["recognitions", "data", "items"]);
        renderRecognitionQueue(state.recognitionRenewalItems);
      } else {
        const data = await apiGet("getAddonRecognitionQueue");
        state.recognitionAddonItems = normalizeList(data, ["recognitions", "data", "items"]);
        renderRecognitionQueue(state.recognitionAddonItems);
      }
    } catch (err) {
      console.error("[loadRecognitionQueues]", err);
      renderRecognitionQueue([]);
    }
  }

  async function loadRecognitionDetail(recognitionId) {
    try {
      const data = await apiGet("getRecognitionDetail", { recognition_id: recognitionId });
      state.currentRecognitionDetail = data.recognition || data || {};
      renderRecognitionDetail(state.currentRecognitionDetail);
    } catch (err) {
      console.error("[loadRecognitionDetail]", err);
    }
  }

  async function loadRenewalList() {
    try {
      const data = await apiGet("adminGetRenewalList");
      state.renewalItems = normalizeList(data, ["renewals", "data", "items"]);
      renderRenewalList();
    } catch (err) {
      console.error("[loadRenewalList]", err);
      state.renewalItems = [];
      renderRenewalList();
    }
  }

  async function loadRenewalDetail(renewalId) {
    try {
      const data = await apiGet("adminGetRenewalDetail", { renewal_id: renewalId });
      state.currentRenewalDetail = data.renewal || data || {};
      renderRenewalDetail(state.currentRenewalDetail);
    } catch (err) {
      console.error("[loadRenewalDetail]", err);
    }
  }

  async function loadCommissionList() {
    try {
      const data = await apiGet("adminGetCommissionList");
      state.commissionItems = normalizeList(data, ["commissions", "data", "items"]);
      renderCommissionList();
    } catch (err) {
      console.error("[loadCommissionList]", err);
      state.commissionItems = [];
      renderCommissionList();
    }
  }

  async function loadPendingCommissions() {
    try {
      const data = await apiGet("getPendingCommissionPayments");
      const list = normalizeList(data, ["commissions", "data", "items"]);
      if (list.length === 0) {
        toast("目前沒有待支付的分潤");
      } else {
        toast(`找到 ${list.length} 筆待支付分潤`);
        state.commissionItems = list;
        renderCommissionList();
      }
    } catch (err) {
      console.error("[loadPendingCommissions]", err);
    }
  }

  async function loadAnnouncements() {
    try {
      const data = await apiGet("adminGetAnnouncements");
      state.announcementItems = normalizeList(data, ["announcements", "data", "items"]);
      renderAnnouncements();
      updateDashboardAnnouncementCount();
    } catch (err) {
      console.error("[loadAnnouncements]", err);
      state.announcementItems = [];
      renderAnnouncements();
    }
  }

  async function loadTrackingSummary() {
    try {
      const data = await apiGet("getTrackingSummary");
      state.trackingSummary = data.summary || data || {};
      renderTrackingSummary();
    } catch (err) {
      console.error("[loadTrackingSummary]", err);
      state.trackingSummary = null;
      renderTrackingSummary();
    }
  }

  async function getCardTrackingStats() {
    const cardId = valueOf("#trackingCardId");
    if (!cardId) return toast("請輸入卡片 ID");
    try {
      const data = await apiGet("getCardTrackingStats", { card_id: cardId });
      state.cardTrackingDetail = data.tracking || data || {};
      renderCardTrackingDetail();
    } catch (err) {
      console.error("[getCardTrackingStats]", err);
      toast("查詢失敗");
    }
  }

  async function getAgentTrackingStats() {
    const agentId = valueOf("#trackingAgentId");
    if (!agentId) return toast("請輸入代理 ID");
    try {
      const data = await apiGet("getAgentTrackingStats", { agent_id: agentId });
      state.agentTrackingDetail = data.tracking || data || {};
      renderAgentTrackingDetail();
    } catch (err) {
      console.error("[getAgentTrackingStats]", err);
      toast("查詢失敗");
    }
  }

  async function loadRecentOpsLogs() {
    try {
      const data = await apiGet("getRecentOpsLogs", { limit: 20 });
      state.opsLogs = normalizeList(data, ["logs", "data", "items"]);
      renderOpsLogs();
      updateDashboardOpsLogs();
    } catch (err) {
      console.error("[loadRecentOpsLogs]", err);
      state.opsLogs = [];
      renderOpsLogs();
    }
  }

  async function checkSchemaStatus() {
    try {
      const data = await apiGet("adminCheckSchemaStatus");
      state.schemaStatus = data.status || data || {};
      renderSchemaStatus();
      updateDashboardSystemIssues();
    } catch (err) {
      console.error("[checkSchemaStatus]", err);
      state.schemaStatus = { error: err.message };
      renderSchemaStatus();
    }
  }

  // ─────────────────────────────────────────────
  //  v6.3：confirmPaymentAndSync（保留）
  // ─────────────────────────────────────────────
  async function confirmPaymentAndSync(paymentId, paymentType, relatedCardId) {
    console.info("[confirmPaymentAndSync]", { paymentId, paymentType, relatedCardId });
    const result = await apiPost("confirmPayment", { payment_id: paymentId });
    await Promise.allSettled([loadPayments(), loadCards()]);
    renderDashboard();
    if (paymentType === "first_payment" && relatedCardId) {
      toast("✅ 首次付款確認完成，可開放交付卡");
      await loadCardDetail(relatedCardId);
    } else if (paymentType === "renewal" && relatedCardId) {
      toast("✅ 續約付款確認完成");
      await loadCardDetail(relatedCardId);
    } else if (paymentType === "addon" && relatedCardId) {
      toast("✅ 加購付款確認完成");
      await Promise.allSettled([loadAddons(), loadCardDetail(relatedCardId)]);
    } else {
      toast("✅ 付款確認完成");
    }
    return result;
  }

  // ─────────────────────────────────────────────
  //  v6.3：renewCard（保留）
  // ─────────────────────────────────────────────
  async function renewCard(cardId) {
    const renewDays = Number(valueOf("#renewDays") || CONFIG.DEFAULT_RENEW_DAYS);
    if (!Number.isFinite(renewDays) || renewDays <= 0) return alert("續約天數需大於 0");
    if (!confirm(`將卡片 ${cardId} 執行「付款確認＋續約 ${renewDays} 天」？\n\n⚠️ 此操作執行後無法自動撤銷。`)) return;
    if (!doubleConfirmId(cardId, "卡片")) return;

    const btnEl = $("#btnConfirmRenewalPaid");
    setBtnLoading(btnEl, true);
    try {
      try { await apiPost("adminMarkPaid", { id: cardId, note: `renewal paid ${renewDays} days`, operator: "admin-v640" }); } catch (err) { console.warn(err); }
      const renewResult = await apiPost("markCardRenewed", { card_id: cardId, renew_days: renewDays, operator: "admin-v640" });
      await Promise.allSettled([loadCards(), loadPayments()]);
      await loadCardDetail(cardId);
      renderDashboard();
      toast("✅ 續約完成");
      showRevertButtonAfterPaid("卡片", cardId);
      $("#renewalTextBox").value = buildRenewalDeliveryText(state.currentCard);
    } catch (err) {
      toast(`❌ 續約失敗：${err.message}`);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }
   // ─────────────────────────────────────────────
  //  INVITE
  // ─────────────────────────────────────────────
  async function createInviteCodeAligned() {
    const params = {
      count: valueOf("#createInviteCount") || "1",
      days: valueOf("#createInviteDays") || "30",
      referrer: valueOf("#createInviteReferrer"),
      service_agent: valueOf("#createInviteServiceAgent"),
      agent_type: valueOf("#createInviteAgentType"),
      source: valueOf("#createInviteSource") || "admin"
    };

    const btnEl = $("#btnCreateInviteCode");
    setBtnLoading(btnEl, true);
    try {
      const data = await apiPost("createInviteCode", params);
      const invite = data.invite || {};
      const inviteCode = textOf(invite.invite_code);
      const formUrl = data.form_url || buildFormUrl(inviteCode);
      const replyText = buildInviteReplyText(inviteCode);
      state.lastInviteCreated = { invite_code: inviteCode, form_url: formUrl, reply_text: replyText };
      $("#inviteCreateResult").textContent = JSON.stringify({ invite_code: inviteCode, form_url: formUrl, reply_text: replyText }, null, 2);
      $("#inviteFormUrlBox").value = formUrl;
      $("#inviteReplyTextBox").value = replyText;
      toast("✅ 邀請碼建立完成");
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  // ─────────────────────────────────────────────
  //  RENDER：CARDS（保留原有）
  // ─────────────────────────────────────────────
  function renderCards() {
    const keyword = valueOf("#cardSearch").toLowerCase();
    const rows = state.cards.filter(item => {
      const hay = [textOf(item.id || item.card_id), textOf(item.name || item.owner_name), textOf(item.phone), textOf(item.email)].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });
    const tbody = $("#cardsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-cell">查無卡片資料</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(item => {
      const id = textOf(item.id || item.card_id);
      return `<tr>
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(textOf(item.name || item.owner_name))}</td>
        <td>${escapeHtml(textOf(item.phone))}</td>
        <td>${escapeHtml(planText(item.plan))}</td>
        <td>${escapeHtml(cardStatusText(item.status))}</td>
        <td>${escapeHtml(billingStatusText(item.billing_status))}</td>
        <td>${escapeHtml(formatValue(item.expires_at))}</td>
        <td>${escapeHtml(textOf(item.service_agent))}</td>
        <td>${escapeHtml(textOf(item.referrer))}</td>
        <td><div class="table-actions"><button class="btn btn-xs btn-soft btn-card-detail" data-card-id="${escapeAttr(id)}">查看</button></div></td>
      </tr>`;
    }).join("");
    $$(".btn-card-detail", tbody).forEach(btn => btn.addEventListener("click", async () => loadCardDetail(btn.dataset.cardId)));
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
    const addonImpact = buildAddonImpactHtml(id);
    wrap.className = "detail-stack";
    wrap.innerHTML = `
      <div class="detail-section"><div class="detail-title">卡片基本資料</div><div class="detail-grid">
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
      </div></div>
      <div class="detail-section"><div class="detail-title">流程總控</div><div class="detail-grid">
        ${renderDetailItem("成品預覽", previewLink)}
        ${renderDetailItem("交付卡", canDelivery ? deliveryLink : "尚未付款，不可交付")}
        ${renderDetailItem("更新連結", updateInfo.link || "尚未產生")}
        ${renderDetailItem("加購狀態", summarizeCardAddons(id))}
        ${renderDetailItem("續約狀態", getRenewalStateText(card))}
        ${renderDetailItem("付款資訊", summarizePaymentInfo(id))}
      </div></div>
      ${addonImpact ? `<div class="detail-section"><div class="detail-title">加購影響摘要</div><div class="addon-impact-grid">${addonImpact}</div></div>` : ""}
    `;
  }

  function buildAddonImpactHtml(cardId) {
    const rows = state.addons.filter(item => textOf(item.card_id) === textOf(cardId) && textOf(item.status).toLowerCase() === "paid");
    if (!rows.length) return "";
    const impact = { cta: 0, photo: 0, update: false, marquee: false };
    rows.forEach(item => {
      const code = textOf(item.addon_type || item.item_code || item.addon_key).toLowerCase();
      const qty = Number(item.qty || item.quantity || 1);
      if (code.includes("cta")) impact.cta += qty;
      else if (code.includes("photo")) impact.photo += qty;
      else if (code.includes("update")) impact.update = true;
      else if (code.includes("marquee")) impact.marquee = true;
    });
    const badges = [];
    if (impact.cta > 0) badges.push(`<span class="badge badge-info">CTA +${impact.cta}</span>`);
    if (impact.photo > 0) badges.push(`<span class="badge badge-info">照片 +${impact.photo}</span>`);
    if (impact.update) badges.push(`<span class="badge badge-warn">更新權限 ✓</span>`);
    if (impact.marquee) badges.push(`<span class="badge">跑馬燈 ✓</span>`);
    return badges.join(" ");
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
    $("#deliveryTextBox").value = canDelivery ? buildDeliveryReplyText(card) : "此卡尚未付款，暫時不可提供交付卡。";
    $("#updateLinkBox").value = updateInfo.link || "";
    $("#updateTextBox").value = buildUpdateReplyText(card, updateInfo.link || "");
    $("#updateHint").textContent = hasUnlimitedUpdate(card) ? "此卡看起來已有無限更新權限，原則上不需單次更新連結。" : "此卡可使用單次更新流程。";
  }

  async function generateUpdateLinkForCurrentCard() {
    if (!state.currentCard) return alert("請先選取卡片");
    const id = textOf(state.currentCard.id || state.currentCard.card_id);
    const btnEl = $("#btnGenerateUpdateLink");
    setBtnLoading(btnEl, true);
    try {
      const data = await apiGet("getCardForUpdate", { id });
      const card = data.card || state.currentCard;
      const token = textOf(card.update_token);
      const link = token ? `${CONFIG.HUB_URL}update-form.html?token=${encodeURIComponent(token)}` : "";
      state.updateLinks[id] = { link, expire_at: textOf(card.update_token_expire) };
      $("#updateLinkBox").value = link;
      $("#updateTextBox").value = buildUpdateReplyText(state.currentCard, link);
      renderCardDetail(state.currentCard);
      toast("✅ 已產生更新連結");
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  // ─────────────────────────────────────────────
  //  RENDER：ADDONS（保留原有 + v6.4 擴充）
  // ─────────────────────────────────────────────
  function renderAddons() {
    const keyword = valueOf("#addonSearch").toLowerCase();
    const rows = state.addons.filter(item => {
      const hay = [textOf(item.addon_order_id || item.add_on_order_id), textOf(item.card_id), textOf(item.addon_type || item.item_code)].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });
    const tbody = $("#addonsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">查無加購資料</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(item => {
      const addonOrderId = textOf(item.addon_order_id || item.add_on_order_id);
      const status = textOf(item.status);
      return `<tr>
        <td>${escapeHtml(addonOrderId)}</td>
        <td>${escapeHtml(textOf(item.card_id))}</td>
        <td>${escapeHtml(textOf(item.addon_type || item.item_code || item.addon_key))}</td>
        <td>${escapeHtml(formatValue(item.qty || item.quantity || 1))}</td>
        <td>${escapeHtml(status || "-")}</td>
        <td>${escapeHtml(formatValue(item.amount || item.unit_price))}</td>
        <td>${escapeHtml(formatValue(item.due_at))}</td>
        <td>${escapeHtml(describeAddonImpact(item))}</td>
        <td><div class="table-actions">
          <button class="btn btn-xs btn-soft btn-addon-detail" data-addon-id="${escapeAttr(addonOrderId)}">查看</button>
          ${status.toLowerCase() !== "paid" ? `<button class="btn btn-xs btn-primary btn-addon-paid" data-addon-id="${escapeAttr(addonOrderId)}" data-card-id="${escapeAttr(textOf(item.card_id))}">確認付款</button>` : ""}
          ${status.toLowerCase() !== "cancelled" ? `<button class="btn btn-xs btn-danger btn-addon-cancel" data-addon-id="${escapeAttr(addonOrderId)}">取消</button>` : ""}
          <button class="btn btn-xs btn-soft" data-copy="${escapeHtml(buildAddonPaymentReminderText(item))}">複製提醒</button>
        </div></td>
      </tr>`;
    }).join("");
    bindCopyButtons(tbody);
    $$(".btn-addon-detail", tbody).forEach(btn => btn.addEventListener("click", async () => loadAddonDetail(btn.dataset.addonId)));
    $$(".btn-addon-paid", tbody).forEach(btn => btn.addEventListener("click", async () => confirmAddonPaid(btn.dataset.addonId, btn.dataset.cardId, btn)));
    $$(".btn-addon-cancel", tbody).forEach(btn => btn.addEventListener("click", async () => cancelAddon(btn.dataset.addonId, btn)));
  }

  function renderAddonDetail(detail) {
    const wrap = $("#addonDetailWrap");
    if (!detail || !Object.keys(detail).length) {
      wrap.className = "detail-stack empty-state";
      wrap.textContent = "查無加購詳情";
      return;
    }
    wrap.className = "detail-stack";
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">加購單資料</div><div class="detail-grid">${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }

  async function createAddonOrder() {
    const cardId = valueOf("#createAddonCardId");
    const addonType = valueOf("#createAddonType");
    const qty = parseInt(valueOf("#createAddonQty") || "1");
    const amount = parseFloat(valueOf("#createAddonAmount") || "0");

    if (!cardId) return toast("請輸入卡片 ID");
    if (!addonType) return toast("請選擇加購類型");

    if (!doubleConfirmId(cardId, "卡片")) return;

    const btnEl = $("#btnSubmitCreateAddon");
    setBtnLoading(btnEl, true);
    try {
      const result = await apiPost("adminCreateAddonOrder", { card_id: cardId, addon_type: addonType, qty, amount });
      toast("✅ 加購單建立成功");
      $("#createAddonFormCard").style.display = "none";
      $("#createAddonCardId").value = "";
      $("#createAddonAmount").value = "";
      await loadAddons();
      if (state.currentCard && textOf(state.currentCard.id) === cardId) await loadCardDetail(cardId);
    } catch (err) {
      toast(`建立失敗：${err.message}`);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  async function confirmAddonPaid(addonOrderId, cardId, btnEl) {
    if (!confirm(`確認加購單 ${addonOrderId} 已付款？`)) return;
    if (!doubleConfirmId(addonOrderId, "加購單")) return;
    setBtnLoading(btnEl, true);
    try {
      await apiPost("adminMarkAddonPaid", { addon_order_id: addonOrderId });
      toast("✅ 加購單已確認付款");
      showRevertButtonAfterPaid("addon", addonOrderId);
      await loadAddons();
      if (cardId) await loadCardDetail(cardId);
    } catch (err) {
      toast(`確認失敗：${err.message}`);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  async function cancelAddon(addonOrderId, btnEl) {
    if (!confirm(`確定取消加購單 ${addonOrderId}？`)) return;
    setBtnLoading(btnEl, true);
    try {
      await apiPost("adminCancelAddonOrder", { addon_order_id: addonOrderId });
      toast("✅ 加購單已取消");
      await loadAddons();
    } catch (err) {
      toast(`取消失敗：${err.message}`);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  // ─────────────────────────────────────────────
  //  RENDER：RENEWALS（保留原有 + v6.4 擴充）
  // ─────────────────────────────────────────────
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
      return `<tr>
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(textOf(card.name || card.owner_name))}</td>
        <td>${escapeHtml(formatValue(card.expires_at))}</td>
        <td>${escapeHtml(billingStatusText(card.billing_status))}</td>
        <td>${escapeHtml(needsRenewal(card) ? "是" : "否")}</td>
        <td>${escapeHtml(getRenewalStateText(card))}</td>
        <td><div class="table-actions"><button class="btn btn-xs btn-soft btn-renewal-select" data-card-id="${escapeAttr(id)}">選取</button><button class="btn btn-xs btn-soft" data-copy="${escapeHtml(buildRenewalReminderText(card))}">複製提醒文案</button></div></td>
      </tr>`;
    }).join("");
    bindCopyButtons(tbody);
    $$(".btn-renewal-select", tbody).forEach(btn => btn.addEventListener("click", async () => loadCardDetail(btn.dataset.cardId)));
  }

  function renderRenewalComposer(card) {
    $("#renewalTextBox").value = card ? buildRenewalReminderText(card) : "";
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

  // v6.4 新增續約列表渲染
  function renderRenewalList() {
    const tbody = $("#renewalListTableBody");
    if (!state.renewalItems.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">尚無續約資料</td></tr>`;
      return;
    }
    tbody.innerHTML = state.renewalItems.map(item => `<tr>
      <td>${escapeHtml(textOf(item.renewal_id || item.id))}</td>
      <td>${escapeHtml(textOf(item.card_id))}</td>
      <td>${escapeHtml(formatValue(item.renew_days))}</td>
      <td>${escapeHtml(formatValue(item.amount))}</td>
      <td><span class="badge ${item.status === 'paid' ? 'badge-success' : 'badge-warn'}">${escapeHtml(item.status || 'pending')}</span></td>
      <td>${escapeHtml(formatValue(item.expires_at))}</td>
      <td><button class="btn btn-xs btn-soft btn-renewal-detail" data-renewal-id="${escapeAttr(item.renewal_id || item.id)}">查看詳情</button></td>
    </tr>`).join("");
    $$(".btn-renewal-detail", tbody).forEach(btn => btn.addEventListener("click", () => loadRenewalDetail(btn.dataset.renewalId)));
  }

  function renderRenewalDetail(detail) {
    const wrap = $("#renewalDetailWrap");
    if (!detail || !Object.keys(detail).length) {
      wrap.innerHTML = '<div class="empty-state">無詳情資料</div>';
      return;
    }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">續約詳情</div><div class="detail-grid">${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }

  async function triggerRenewalReminders() {
    if (!confirm("觸發所有即將到期卡片的續約提醒？")) return;
    try {
      const result = await apiPost("triggerRenewalReminder", {});
      toast(`✅ 已觸發續約提醒`);
    } catch (err) {
      toast(`觸發失敗：${err.message}`);
    }
  }

  async function triggerPaymentReminder() {
    if (!state.currentCard) return alert("請先選取卡片");
    const cardId = textOf(state.currentCard.id || state.currentCard.card_id);
    try {
      const result = await apiPost("triggerRenewalPaymentReminder", { card_id: cardId });
      toast(`✅ 已觸發付款提醒`);
    } catch (err) {
      toast(`觸發失敗：${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  //  RENDER：AGENTS（保留原有 + v6.4 擴充）
  // ─────────────────────────────────────────────
  function renderAgents() {
    const keyword = valueOf("#agentSearch").toLowerCase();
    const rows = state.agents.filter(item => {
      const hay = [textOf(item.agent_id), textOf(item.owner_name), textOf(item.agent_type), textOf(item.member_tier)].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });
    const tbody = $("#agentsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">查無代理資料</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(item => `<tr>
      <td>${escapeHtml(textOf(item.agent_id))}</td>
      <td>${escapeHtml(textOf(item.owner_name))}</td>
      <td><span class="badge ${item.agent_type === 'partner' ? 'badge-success' : 'badge-info'}">${escapeHtml(textOf(item.agent_type) || '-')}</span></td>
      <td>${escapeHtml(textOf(item.member_tier) || '-')}</td>
      <td>${escapeHtml(formatValue(item.points_balance))}</td>
      <td>${escapeHtml(formatValue(item.total_commission))}</td>
      <td><span class="badge ${item.status === 'active' ? 'badge-success' : 'badge-warn'}">${escapeHtml(item.status || 'active')}</span></td>
      <td><div class="table-actions"><button class="btn btn-xs btn-soft btn-agent-detail" data-agent-id="${escapeAttr(textOf(item.agent_id))}">查看</button></div></td>
    </tr>`).join("");
    $$(".btn-agent-detail", tbody).forEach(btn => btn.addEventListener("click", async () => loadAgentDetail(btn.dataset.agentId)));
  }

  function renderAgentDetail(agent) {
    const wrap = $("#agentDetailWrap");
    if (!agent || !Object.keys(agent).length) {
      wrap.className = "detail-stack empty-state";
      wrap.textContent = "查無代理詳情";
      return;
    }
    wrap.className = "detail-stack";
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">代理資料</div><div class="detail-grid">${Object.entries(agent).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }

  function syncCurrentAgentBox(agent) {
    $("#currentAgentLabel").textContent = textOf(agent.agent_id) || "未選取";
    $("#currentAgentName").textContent = textOf(agent.owner_name) || "-";
    $("#currentAgentPoints").textContent = formatValue(agent.points_balance);
    $("#currentAgentCommission").textContent = formatValue(agent.total_commission);
  }

  // v6.4 新增代理操作
  async function repairMissingAgents() {
    if (!confirm("執行修復遺失代理？這將會掃描並建立缺失的代理記錄。")) return;
    try {
      const result = await apiPost("adminRepairMissingAgents", {});
      toast("✅ 代理修復完成");
      await loadAgents();
    } catch (err) {
      toast(`修復失敗：${err.message}`);
    }
  }

  async function normalizeAgentType() {
    if (!confirm("執行正規化代理類型？這將會根據規則更新 agent_type 和 member_tier。")) return;
    try {
      await apiPost("adminNormalizeAgentTypeAndTier", {});
      toast("✅ 正規化完成");
      await loadAgents();
    } catch (err) {
      toast(`正規化失敗：${err.message}`);
    }
  }

  async function freezeUnfreezeAgent(action) {
    const agentId = valueOf("#detailAgentId");
    if (!agentId) return alert("請先查詢代理詳情");
    if (!doubleConfirmId(agentId, "代理")) return;
    try {
      const result = await apiPost(action === "freeze" ? "adminFreezeAgent" : "adminUnfreezeAgent", { agent_id: agentId });
      toast(`✅ 代理已${action === "freeze" ? "凍結" : "解凍"}`);
      await loadAgentDetail(agentId);
      await loadAgents();
    } catch (err) {
      toast(`操作失敗：${err.message}`);
    }
  }

  async function setAgentUpgrade() {
    const agentId = valueOf("#detailAgentId");
    const targetTier = valueOf("#upgradeTargetTier");
    if (!agentId) return alert("請先查詢代理詳情");
    if (!targetTier) return alert("請輸入目標等級 (referral/partner)");
    if (!doubleConfirmId(agentId, "代理")) return;
    try {
      const result = await apiPost("adminSetAgentUpgrade", { agent_id: agentId, target_tier: targetTier });
      toast("✅ 代理升級設定完成");
      await loadAgentDetail(agentId);
      await loadAgents();
    } catch (err) {
      toast(`設定失敗：${err.message}`);
    }
  }

  async function updateAgentType() {
    const agentId = valueOf("#detailAgentId");
    const newType = valueOf("#updateAgentTypeValue");
    if (!agentId) return alert("請先查詢代理詳情");
    if (!newType) return alert("請輸入新的 agent_type");
    if (!doubleConfirmId(agentId, "代理")) return;
    try {
      const result = await apiPost("adminUpdateAgentType", { agent_id: agentId, agent_type: newType });
      toast("✅ 代理類型已更新");
      await loadAgentDetail(agentId);
      await loadAgents();
    } catch (err) {
      toast(`更新失敗：${err.message}`);
    }
  }
    // ─────────────────────────────────────────────
  //  POINTS / COMMISSION / LOGS（保留原有 + v6.4 擴充）
  // ─────────────────────────────────────────────
  async function adjustPoints(mode) {
    const agentId = valueOf("#pointsAgentId");
    const pointsValue = Number(valueOf("#pointsValue"));
    const note = valueOf("#pointsNote");
    if (!agentId) return alert("請輸入 agent_id");
    if (!Number.isFinite(pointsValue) || pointsValue <= 0) return alert("points 必須大於 0");
    if (!confirm(`確認對 ${agentId} 執行「${mode === "subtract" ? "扣點" : "加點"} ${pointsValue}」？`)) return;
    const points = mode === "subtract" ? -Math.abs(pointsValue) : Math.abs(pointsValue);
    const btnEl = mode === "subtract" ? $("#btnSubtractPoints") : $("#btnAddPoints");
    setBtnLoading(btnEl, true);
    try {
      await apiPost("adminAdjustPoints", { agent_id: agentId, points, note });
      toast(mode === "subtract" ? "✅ 已扣點" : "✅ 已加點");
      await loadAgents();
      await loadAgentDetail(agentId);
    } catch (err) {
      toast(`操作失敗：${err.message}`);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  async function adjustCommission() {
    const agentId = valueOf("#commissionAgentId");
    const amount = Number(valueOf("#commissionValue"));
    const note = valueOf("#commissionNote");
    if (!agentId) return alert("請輸入 agent_id");
    if (!Number.isFinite(amount) || amount <= 0) return alert("amount 必須大於 0");
    if (!confirm(`確認對 ${agentId} 補分潤 ${amount}？`)) return;
    const btnEl = $("#btnAdjustCommission");
    setBtnLoading(btnEl, true);
    try {
      await apiPost("adminAdjustCommission", { agent_id: agentId, amount, note });
      toast("✅ 已補分潤");
      await loadAgents();
      await loadAgentDetail(agentId);
    } catch (err) {
      toast(`操作失敗：${err.message}`);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  async function reloadLogsForCurrentAgent() {
    const agentId = valueOf("#detailAgentId") || valueOf("#pointsAgentId") || valueOf("#commissionAgentId") || textOf(state.currentAgent?.agent_id);
    if (!agentId) return alert("請先選取代理");
    const [pointsLogData, commissionLogData] = await Promise.all([
      apiGet("getAgentPointsLog", { agent_id: agentId }),
      apiGet("getAgentCommissionLog", { agent_id: agentId })
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
    tbody.innerHTML = rows.map(row => `<tr>
      <td>${escapeHtml(formatValue(firstValue(row, ["created_at", "time", "updated_at", "timestamp"])))}</td>
      <td>${escapeHtml(formatValue(firstValue(row, ["type", "action", "log_type"])))}</td>
      <td>${escapeHtml(`${formatValue(firstValue(row, ["before_balance", "before_points", "points_before", "before"]))} → ${formatValue(firstValue(row, ["after_balance", "after_points", "points_after", "after"]))}`)}</td>
      <td>${escapeHtml(formatValue(firstValue(row, ["note", "memo", "remark"])))}</td>
    </tr>`).join("");
  }

  function renderCommissionLog(rows) {
    const tbody = $("#commissionLogTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">沒有分潤 Log</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(row => `<tr>
      <td>${escapeHtml(formatValue(firstValue(row, ["created_at", "time", "updated_at", "timestamp"])))}</td>
      <td>${escapeHtml(formatValue(firstValue(row, ["amount", "commission_amount", "delta"])))}</td>
      <td>${escapeHtml(`${formatValue(firstValue(row, ["before_total", "before_commission", "commission_before", "before"]))} → ${formatValue(firstValue(row, ["after_total", "after_commission", "commission_after", "after"]))}`)}</td>
      <td>${escapeHtml(formatValue(firstValue(row, ["note", "memo", "remark"])))}</td>
    </tr>`).join("");
  }

  function renderCommissionList() {
    const tbody = $("#commissionListTableBody");
    if (!state.commissionItems.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">尚無分潤資料</td></tr>`;
      return;
    }
    tbody.innerHTML = state.commissionItems.map(item => `<tr>
      <td>${escapeHtml(textOf(item.commission_id || item.id))}</td>
      <td>${escapeHtml(textOf(item.agent_id))}</td>
      <td>${escapeHtml(formatValue(item.amount))}</td>
      <td><span class="badge ${item.status === 'paid' ? 'badge-success' : 'badge-warn'}">${escapeHtml(item.status || 'pending')}</span></td>
      <td>${escapeHtml(formatValue(item.payment_id))}</td>
      <td>${item.status !== 'paid' ? `<button class="btn btn-xs btn-primary btn-mark-commission-paid" data-commission-id="${escapeAttr(item.commission_id || item.id)}">標記已付</button>` : '-'}</td>
    </tr>`).join("");
    $$(".btn-mark-commission-paid").forEach(btn => btn.addEventListener("click", () => markCommissionPaid(btn.dataset.commissionId)));
  }

  async function markCommissionPaid(commissionId) {
    if (!doubleConfirmId(commissionId, "分潤單")) return;
    try {
      await apiPost("markCommissionPaid", { commission_id: commissionId });
      toast("✅ 分潤已標記為已付");
      await loadCommissionList();
    } catch (err) {
      toast(`操作失敗：${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  //  SETTLEMENT（保留）
  // ─────────────────────────────────────────────
  async function buildSettlement() {
    const settlementMonth = valueOf("#settlementMonth");
    if (!settlementMonth) return alert("請選擇 settlement_month");
    if (!confirm(`確認建立 ${settlementMonth} 的結算？`)) return;
    const btnEl = $("#btnBuildSettlement");
    setBtnLoading(btnEl, true);
    try {
      const data = await apiPost("buildMonthlySettlement", { settlement_month: settlementMonth });
      $("#settlementResult").textContent = JSON.stringify(data, null, 2);
      toast("✅ 已建立結算");
    } catch (err) {
      toast(`結算失敗：${err.message}`);
    } finally {
      setBtnLoading(btnEl, false);
    }
  }

  // ─────────────────────────────────────────────
  //  DASHBOARD（v6.4 升級）
  // ─────────────────────────────────────────────
  function renderDashboard() {
    const unpaid = state.cards.filter(card => !isPaid(card)).length;
    const needDelivery = state.cards.filter(card => isPaid(card)).length;
    const needRenewal = state.cards.filter(card => needsRenewal(card) || isExpiringSoon(card, 30)).length;
    const addonPending = state.addons.filter(item => { const s = textOf(item.status).toLowerCase(); return s !== "paid" && s !== "cancelled"; }).length;

    $("#statUnpaid").textContent = unpaid;
    $("#statNeedDelivery").textContent = needDelivery;
    $("#statNeedRenewal").textContent = needRenewal;
    $("#statAddonPending").textContent = addonPending;
    $("#statAgents").textContent = state.agents.length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPayments = state.payments.filter(p => textOf(p.paid_at || p.created_at || "").startsWith(todayStr)).length;
    const todayCards = state.cards.filter(c => textOf(c.created_at || "").startsWith(todayStr)).length;
    safeSetText("#statTodayPayments", todayPayments);
    safeSetText("#statTodayCards", todayCards);
    safeSetText("#statTodayCta", "N/A");
    safeSetText("#statTodayConversion", "N/A");

    const pendingPayments = state.paymentList.filter(p => textOf(p.status).toLowerCase() !== "paid").length;
    const pendingRecognition = state.recognitionRenewalItems.length + state.recognitionAddonItems.length;
    safeSetText("#statPendingPayments", pendingPayments);
    safeSetText("#statPendingRecognition", pendingRecognition);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const risks = [];
    const overdueUnpaid = state.cards.filter(card => { if (isPaid(card)) return false; const created = parseDate(card.created_at); return created && created < threeDaysAgo; });
    if (overdueUnpaid.length > 0) risks.push({ level: "danger", text: `⚠️ 未付款超過 3 天：${overdueUnpaid.length} 張` });
    const paidNotDelivered = state.cards.filter(card => isPaid(card) && textOf(card.status).toLowerCase() !== "active");
    if (paidNotDelivered.length > 0) risks.push({ level: "warn", text: `📦 已付款未交付：${paidNotDelivered.length} 張` });
    const expiringSoon = state.cards.filter(card => isExpiringSoon(card, 30) && !isExpired(card));
    if (expiringSoon.length > 0) risks.push({ level: "info", text: `⏰ 30 天內即將到期：${expiringSoon.length} 張` });
    const expired = state.cards.filter(card => isExpired(card));
    if (expired.length > 0) risks.push({ level: "danger", text: `🔴 已到期：${expired.length} 張` });
    if (addonPending > 0) risks.push({ level: "warn", text: `🛒 加購單待處理：${addonPending} 筆` });

    const riskEl = $("#dashboardRiskList");
    if (riskEl) riskEl.innerHTML = risks.length === 0 ? '<div class="focus-item">✅ 目前無高風險項目</div>' : risks.map(r => `<div class="focus-item risk-item risk-${r.level}">${escapeHtml(r.text)}</div>`).join("");

    const focus = [];
    if (unpaid > 0) focus.push(`待付款卡片 ${unpaid} 張。`);
    if (needDelivery > 0) focus.push(`已付款待交付卡片 ${needDelivery} 張。`);
    if (needRenewal > 0) focus.push(`需續約關注卡片 ${needRenewal} 張。`);
    if (addonPending > 0) focus.push(`待處理加購單 ${addonPending} 筆。`);
    if (!focus.length) focus.push("目前沒有高優先待辦。");
    $("#dashboardFocus").innerHTML = focus.map(x => `<div class="focus-item">${escapeHtml(x)}</div>`).join("");
  }

  function renderDeliveryHealthSummary() {
    const summary = {
      trial: 0, referral: 0, partner: 0,
      paidNotActivated: 0,
      partnerMissingCommission: 0,
      missingReferralLink: 0
    };
    state.cards.forEach(card => {
      const walletMeta = buildWalletMetaFromCard(card);
      const mode = resolveWalletModeFromMeta(walletMeta);
      if (mode === "trial") summary.trial++;
      else if (mode === "referral") summary.referral++;
      else if (mode === "partner") summary.partner++;

      if (isPaid(card) && textOf(card.status).toLowerCase() !== "active") summary.paidNotActivated++;
      if (mode === "partner" && (!walletMeta.commission_total || walletMeta.commission_total === 0)) summary.partnerMissingCommission++;
      if ((mode === "referral" || mode === "partner") && !walletMeta.referral_link) summary.missingReferralLink++;
    });
    const html = `
      <div class="focus-item">📊 試用模式：${summary.trial} 張</div>
      <div class="focus-item">📊 推薦模式：${summary.referral} 張</div>
      <div class="focus-item">📊 合作模式：${summary.partner} 張</div>
      <div class="focus-item risk-warn">⚠️ 已付款未啟用：${summary.paidNotActivated} 張</div>
      <div class="focus-item risk-warn">⚠️ 合作模式無收益資料：${summary.partnerMissingCommission} 張</div>
      <div class="focus-item risk-warn">⚠️ 推薦入口缺失：${summary.missingReferralLink} 張</div>
    `;
    $("#deliveryHealthSummary").innerHTML = html;
  }

  function updateDashboardAnnouncementCount() {
    const activeCount = state.announcementItems.filter(a => textOf(a.status).toLowerCase() === "active").length;
    safeSetText("#statActiveAnnouncements", activeCount);
  }

  function updateDashboardSystemIssues() {
    const issues = state.schemaStatus?.issues || 0;
    safeSetText("#statSystemIssues", issues);
  }

  function updateDashboardOpsLogs() {
    const opsContainer = $("#recentOpsLogs");
    if (!opsContainer) return;
    if (!state.opsLogs.length) {
      opsContainer.innerHTML = '<div class="focus-item">暫無操作紀錄</div>';
      return;
    }
    opsContainer.innerHTML = state.opsLogs.slice(0, 5).map(log => `<div class="focus-item">${escapeHtml(formatValue(log.created_at))} - ${escapeHtml(log.action)} (${escapeHtml(log.operator || "system")})</div>`).join("");
  }

  function safeSetText(selector, value) { const el = $(selector); if (el) el.textContent = value; }

  // ─────────────────────────────────────────────
  //  PAYMENT SECTION（v6.4 新增）
  // ─────────────────────────────────────────────
  function renderPayments() {
    const tbody = $("#paymentsTableBody");
    if (!state.paymentList.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">尚無付款資料</td></tr>`;
      return;
    }
    tbody.innerHTML = state.paymentList.map(p => `<tr>
      <td>${escapeHtml(textOf(p.payment_id || p.id))}</td>
      <td>${escapeHtml(textOf(p.card_id))}</td>
      <td>${escapeHtml(textOf(p.event_type))}</td>
      <td>${escapeHtml(formatValue(p.amount))}</td>
      <td><span class="payment-status-${textOf(p.status).toLowerCase() === 'paid' ? 'paid' : 'pending'}">${escapeHtml(textOf(p.status) || 'pending')}</span></td>
      <td>${escapeHtml(formatValue(p.due_at))}</td>
      <td>${escapeHtml(formatValue(p.paid_at))}</td>
      <td>${escapeHtml(formatValue(p.transaction_id))}</td>
      <td><button class="btn btn-xs btn-soft btn-payment-detail" data-payment-id="${escapeAttr(p.payment_id || p.id)}">查看</button>
        ${textOf(p.status).toLowerCase() !== 'paid' ? `<button class="btn btn-xs btn-primary btn-payment-confirm" data-payment-id="${escapeAttr(p.payment_id || p.id)}">確認付款</button>` : ''}
        ${textOf(p.status).toLowerCase() === 'paid' ? `<button class="btn btn-xs btn-danger btn-payment-refund" data-payment-id="${escapeAttr(p.payment_id || p.id)}">退款</button>` : ''}
      </td>
    </tr>`).join("");
    $$(".btn-payment-detail").forEach(btn => btn.addEventListener("click", () => loadPaymentDetail(btn.dataset.paymentId)));
    $$(".btn-payment-confirm").forEach(btn => btn.addEventListener("click", () => confirmPaymentFromUi(btn.dataset.paymentId)));
    $$(".btn-payment-refund").forEach(btn => btn.addEventListener("click", () => markPaymentRefundedFromUi(btn.dataset.paymentId)));
  }

  function renderPaymentDetail(detail) {
    const wrap = $("#paymentDetailWrap");
    if (!detail || !Object.keys(detail).length) {
      wrap.innerHTML = '<div class="empty-state">無詳情資料</div>';
      return;
    }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">付款詳情</div><div class="detail-grid">${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }

  async function confirmPaymentFromUi(paymentId) {
    if (!doubleConfirmId(paymentId, "付款單")) return;
    try {
      const result = await apiPost("confirmPayment", { payment_id: paymentId });
      toast("✅ 付款已確認");
      await loadPaymentList();
      await loadPayments();
      renderDashboard();
    } catch (err) {
      toast(`確認失敗：${err.message}`);
    }
  }

  async function markPaymentRefundedFromUi(paymentId) {
    if (!doubleConfirmId(paymentId, "付款單")) return;
    if (!confirm("⚠️ 退款操作無法自動撤銷，確定要退款嗎？")) return;
    try {
      const result = await apiPost("markPaymentRefunded", { payment_id: paymentId });
      toast("✅ 已標記退款");
      await loadPaymentList();
    } catch (err) {
      toast(`退款失敗：${err.message}`);
    }
  }

  async function buildPaymentNoticeTexts(type) {
    const paymentId = state.currentPaymentDetail?.payment_id || state.paymentList[0]?.payment_id;
    if (!paymentId) return toast("請先選取一筆付款");
    try {
      let text = "";
      if (type === "payment") {
        const data = await apiGet("buildPaymentNoticeText", { payment_id: paymentId });
        text = data.text || data.message || "";
        $("#paymentNoticeText").value = text;
      } else if (type === "paid") {
        const data = await apiGet("buildPaidNoticeText", { payment_id: paymentId });
        text = data.text || data.message || "";
        $("#paidNoticeText").value = text;
      } else if (type === "delivery") {
        const data = await apiGet("buildDeliveryNoticeText", { payment_id: paymentId });
        text = data.text || data.message || "";
        $("#deliveryNoticeText").value = text;
      }
      if (text) toast("✅ 文案已生成");
    } catch (err) {
      toast(`生成失敗：${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  //  RECOGNITION SECTION（v6.4 新增）
  // ─────────────────────────────────────────────
  function renderRecognitionQueue(items) {
    const tbody = $("#recognitionTableBody");
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">尚無待採認項目</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(item => `<tr>
      <td>${escapeHtml(textOf(item.recognition_id || item.id))}</td>
      <td>${escapeHtml(textOf(item.event_type))}</td>
      <td>${escapeHtml(textOf(item.event_id))}</td>
      <td>${escapeHtml(textOf(item.card_id))}</td>
      <td>${escapeHtml(textOf(item.agent_id))}</td>
      <td><span class="badge badge-warn">${escapeHtml(textOf(item.result) || 'pending')}</span></td>
      <td>${escapeHtml(formatValue(item.service_log_id))}</td>
      <td>${escapeHtml(formatValue(item.recognized_at))}</td>
      <td><button class="btn btn-xs btn-soft btn-recognition-detail" data-recognition-id="${escapeAttr(item.recognition_id || item.id)}">查看</button></td>
    </tr>`).join("");
    $$(".btn-recognition-detail").forEach(btn => btn.addEventListener("click", () => loadRecognitionDetail(btn.dataset.recognitionId)));
  }

  function renderRecognitionDetail(detail) {
    const wrap = $("#recognitionDetailWrap");
    if (!detail || !Object.keys(detail).length) {
      wrap.innerHTML = '<div class="empty-state">無詳情資料</div>';
      return;
    }
    wrap.innerHTML = `
      <div class="detail-section"><div class="detail-title">採認詳情</div><div class="detail-grid">${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>
      <div class="action-row mt16">
        <input id="recognitionServiceLogId" class="input" type="text" placeholder="service_log_id (選填)" style="flex:1;" />
        <input id="recognitionNote" class="input" type="text" placeholder="備註" style="flex:1;" />
        <button id="btnApproveRecognition" class="btn btn-primary">核准</button>
        <button id="btnRejectRecognition" class="btn btn-danger">拒絕</button>
      </div>
    `;
    $("#btnApproveRecognition").addEventListener("click", () => approveRecognitionFromUi(detail.recognition_id || detail.id));
    $("#btnRejectRecognition").addEventListener("click", () => rejectRecognitionFromUi(detail.recognition_id || detail.id));
  }

  async function approveRecognitionFromUi(recognitionId) {
    const serviceLogId = valueOf("#recognitionServiceLogId") || undefined;
    const note = valueOf("#recognitionNote") || undefined;
    if (!doubleConfirmId(recognitionId, "採認單")) return;
    try {
      const result = await apiPost("approveRecognition", { recognition_id: recognitionId, service_log_id: serviceLogId, note });
      toast("✅ 已核准採認");
      await loadRecognitionQueues();
      $("#recognitionDetailWrap").innerHTML = '<div class="empty-state">已核准，詳情已關閉</div>';
    } catch (err) {
      toast(`核准失敗：${err.message}`);
    }
  }

  async function rejectRecognitionFromUi(recognitionId) {
    const note = valueOf("#recognitionNote") || undefined;
    if (!doubleConfirmId(recognitionId, "採認單")) return;
    try {
      const result = await apiPost("rejectRecognition", { recognition_id: recognitionId, note });
      toast("❌ 已拒絕採認");
      await loadRecognitionQueues();
      $("#recognitionDetailWrap").innerHTML = '<div class="empty-state">已拒絕，詳情已關閉</div>';
    } catch (err) {
      toast(`拒絕失敗：${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  //  ANNOUNCEMENT SECTION（v6.4 新增）
  // ─────────────────────────────────────────────
  function renderAnnouncements() {
    const tbody = $("#announcementsTableBody");
    if (!state.announcementItems.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">尚無公告</td></tr>`;
      return;
    }
    tbody.innerHTML = state.announcementItems.map(a => `<tr>
      <td>${escapeHtml(textOf(a.announcement_id || a.id))}</td>
      <td>${escapeHtml(textOf(a.title))}</td>
      <td>${escapeHtml(textOf(a.content).substring(0, 50))}${(textOf(a.content).length > 50 ? "..." : "")}</td>
      <td><span class="announcement-status-${textOf(a.status).toLowerCase()}">${escapeHtml(textOf(a.status))}</span></td>
      <td>${escapeHtml(formatValue(a.published_at || a.created_at))}</td>
      <td><button class="btn btn-xs btn-soft btn-toggle-announcement" data-id="${escapeAttr(a.announcement_id || a.id)}" data-status="${escapeAttr(a.status)}">切換狀態</button></td>
    </tr>`).join("");
    $$(".btn-toggle-announcement").forEach(btn => btn.addEventListener("click", () => toggleAnnouncement(btn.dataset.id, btn.dataset.status)));
  }

  function showAnnouncementForm() {
    $("#announcementFormCard").style.display = "block";
    $("#announcementTitle").value = "";
    $("#announcementContent").value = "";
    $("#announcementStatus").value = "draft";
    $("#announcementFormTitle").textContent = "新增公告";
    state.currentAnnouncementId = null;
  }

  function hideAnnouncementForm() {
    $("#announcementFormCard").style.display = "none";
  }

  async function saveAnnouncement() {
    const title = valueOf("#announcementTitle");
    const content = valueOf("#announcementContent");
    const status = valueOf("#announcementStatus");
    if (!title || !content) return toast("請填寫標題和內容");
    try {
      await apiPost("adminSaveAnnouncement", { title, content, status });
      toast("✅ 公告已儲存");
      hideAnnouncementForm();
      await loadAnnouncements();
    } catch (err) {
      toast(`儲存失敗：${err.message}`);
    }
  }

  async function toggleAnnouncement(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "draft" : "active";
    try {
      await apiPost("adminToggleAnnouncement", { announcement_id: id, status: newStatus });
      toast(`✅ 公告已${newStatus === "active" ? "啟用" : "停用"}`);
      await loadAnnouncements();
    } catch (err) {
      toast(`操作失敗：${err.message}`);
    }
  }
    // ─────────────────────────────────────────────
  //  TRACKING SECTION（v6.4 新增）
  // ─────────────────────────────────────────────
  function renderTrackingSummary() {
    if (!state.trackingSummary) {
      $("#trackingTotalCards").textContent = "-";
      $("#trackingTotalAgents").textContent = "-";
      $("#trackingMonthlyRevenue").textContent = "-";
      $("#trackingMonthlyCommission").textContent = "-";
      return;
    }
    $("#trackingTotalCards").textContent = formatValue(state.trackingSummary.total_cards || 0);
    $("#trackingTotalAgents").textContent = formatValue(state.trackingSummary.total_agents || 0);
    $("#trackingMonthlyRevenue").textContent = formatValue(state.trackingSummary.monthly_revenue || 0);
    $("#trackingMonthlyCommission").textContent = formatValue(state.trackingSummary.monthly_commission || 0);
  }

  function renderCardTrackingDetail() {
    const wrap = $("#cardTrackingDetail");
    if (!state.cardTrackingDetail || !Object.keys(state.cardTrackingDetail).length) {
      wrap.innerHTML = '<div class="empty-state">無追蹤資料</div>';
      return;
    }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">卡片追蹤統計</div><div class="detail-grid">${Object.entries(state.cardTrackingDetail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }

  function renderAgentTrackingDetail() {
    const wrap = $("#agentTrackingDetail");
    if (!state.agentTrackingDetail || !Object.keys(state.agentTrackingDetail).length) {
      wrap.innerHTML = '<div class="empty-state">無追蹤資料</div>';
      return;
    }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">代理追蹤統計</div><div class="detail-grid">${Object.entries(state.agentTrackingDetail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }

  // ─────────────────────────────────────────────
  //  SYSTEM TOOLS SECTION（v6.4 新增）
  // ─────────────────────────────────────────────
  function renderSchemaStatus() {
    const wrap = $("#schemaStatus");
    if (!state.schemaStatus) {
      wrap.innerHTML = '<div class="empty-state">尚未檢查</div>';
      return;
    }
    if (state.schemaStatus.error) {
      wrap.innerHTML = `<div class="focus-item risk-danger">⚠️ 檢查失敗：${escapeHtml(state.schemaStatus.error)}</div>`;
      return;
    }
    const issues = state.schemaStatus.issues || 0;
    const statusClass = issues === 0 ? "ok" : "warn";
    wrap.innerHTML = `<div class="focus-item risk-${statusClass}">📋 Schema 健康度：${issues === 0 ? "✅ 正常" : `⚠️ 發現 ${issues} 個問題`}</div>
      <div class="detail-grid mt8">${Object.entries(state.schemaStatus).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div>`;
  }

  function renderOpsLogs() {
    const wrap = $("#opsLogsList");
    if (!state.opsLogs.length) {
      wrap.innerHTML = '<div class="empty-state">暫無維運紀錄</div>';
      return;
    }
    wrap.innerHTML = state.opsLogs.map(log => `<div class="focus-item">${escapeHtml(formatValue(log.created_at))} - ${escapeHtml(log.action)} (${escapeHtml(log.operator || "system")})<br><span class="detail-key">${escapeHtml(log.details || "")}</span></div>`).join("");
  }

  async function runRepairAction(actionName) {
    let action = "";
    let confirmMsg = "";
    switch (actionName) {
      case "due_at":
        action = "adminRepairDueAt";
        confirmMsg = "修復所有 due_at 欄位？";
        break;
      case "addon_status":
        action = "repairAddonOrderStatuses";
        confirmMsg = "修復加購單狀態？";
        break;
      case "data_validation":
        action = "adminRepairDataValidation";
        confirmMsg = "執行資料驗證修復？";
        break;
      case "normalize_card_theme":
        action = "adminNormalizeCardThemeFields";
        confirmMsg = "正規化卡片主題欄位？";
        break;
      case "audit_card_theme":
        action = "adminAuditCardThemeFields";
        confirmMsg = "稽核卡片主題欄位？";
        break;
      case "install_system_triggers":
        action = "installSystemTriggers";
        confirmMsg = "安裝系統觸發器？";
        break;
      case "install_commercial_triggers":
        action = "installCommercialTriggers";
        confirmMsg = "安裝商業觸發器？";
        break;
      default:
        return toast("未知的修復動作");
    }
    if (!confirm(confirmMsg)) return;
    if (!doubleConfirmId(actionName, "修復動作")) return;
    try {
      const result = await apiPost(action, {});
      toast(`✅ 修復完成：${actionName}`);
      if (actionName === "due_at") await loadAddons();
      if (actionName === "addon_status") await loadAddons();
      if (actionName === "normalize_card_theme" || actionName === "audit_card_theme") await loadCards();
      await checkSchemaStatus();
    } catch (err) {
      toast(`修復失敗：${err.message}`);
    }
  }

  async function runDailyOps() {
    if (!confirm("執行每日維運作業？這將會觸發多個自動化任務。")) return;
    if (!doubleConfirmId("daily_ops", "每日維運")) return;
    try {
      const result = await apiPost("runDailyOps", {});
      toast("✅ 每日維運執行完成");
      await Promise.allSettled([loadCards(), loadAddons(), loadRenewalList(), loadRecentOpsLogs(), checkSchemaStatus()]);
      renderDashboard();
    } catch (err) {
      toast(`執行失敗：${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  //  DELIVERY CONTROL PANEL（v6.4 核心：完全對齊 poster.js）
  // ─────────────────────────────────────────────

  /**
   * 從卡片資料建構錢包 Meta（對齊 poster.js buildWalletData）
   */
  function buildWalletMetaFromCard(card) {
    const dg = card?.delivery_guidance || {};
    const nested = card?.agent || card?.agent_info || card?.delivery_agent || {};
    const pointsLifetime = Number.isFinite(Number(nested?.points_lifetime)) ? Number(nested.points_lifetime) : 
                           (Number.isFinite(Number(dg?.points_lifetime)) ? Number(dg.points_lifetime) : 
                           (Number.isFinite(Number(card?.points_lifetime)) ? Number(card.points_lifetime) : 0));
    return {
      wallet_mode: textOf(nested?.wallet_mode || card?.wallet_mode),
      agent_type: textOf(nested?.agent_type || card?.agent_type),
      agent_id: textOf(nested?.agent_id || card?.agent_id || card?.service_agent),
      referral_link: textOf(nested?.referral_link || card?.referral_link),
      referral_count: Number(nested?.referral_count ?? card?.referral_count ?? 0),
      converted_count: Number(nested?.converted_count ?? card?.converted_count ?? 0),
      commission_monthly: Number(nested?.commission_monthly ?? card?.commission_monthly ?? 0),
      commission_total: Number(nested?.commission_total ?? card?.commission_total ?? 0),
      member_tier: textOf(dg?.member_tier || nested?.member_tier || card?.member_tier),
      points_lifetime: pointsLifetime,
      upgrade_hint: textOf(dg?.upgrade_hint),
      points_rule: textOf(dg?.points_rule),
      commission_rule: textOf(dg?.commission_rule),
      upgrade_rule: textOf(dg?.upgrade_rule),
      remaining_points_to_next_tier: Number(dg?.remaining_points_to_next_tier ?? 5)
    };
  }

  /**
   * 解析錢包模式（完全對齊 poster.js resolveWalletMode）
   * 規則：wallet_mode → agent_type → member_tier → points_lifetime >= 5 → trial
   */
  function resolveWalletModeFromMeta(wallet) {
    const backendMode = textOf(wallet?.wallet_mode).toLowerCase();
    if (["trial", "referral", "partner"].includes(backendMode)) return backendMode;
    const agentType = textOf(wallet?.agent_type).toLowerCase();
    if (agentType === "partner") return "partner";
    if (agentType === "referral") return "referral";
    const tier = textOf(wallet?.member_tier).toLowerCase();
    if (tier === "partner") return "partner";
    if (tier === "referral" || tier === "silver") return "referral";
    const pts = Number(wallet?.points_lifetime ?? 0);
    if (pts >= 5) return "referral";
    return "trial";
  }

  /**
   * 建構完整的交付卡 Meta
   */
  function buildDeliveryCardMeta(card) {
    const id = textOf(card.id || card.card_id);
    const walletMeta = buildWalletMetaFromCard(card);
    const mode = resolveWalletModeFromMeta(walletMeta);
    return {
      card_id: id,
      name: textOf(card.name || card.owner_name),
      billing_status: textOf(card.billing_status),
      status: textOf(card.status),
      activated_at: formatValue(card.activated_at),
      expires_at: formatValue(card.expires_at),
      poster_url: buildDeliveryLink(id),
      update_link: textOf(card.update_link),
      renewal_link: textOf(card.renewal_link),
      referral_link: walletMeta.referral_link,
      wallet_mode: walletMeta.wallet_mode,
      agent_type: walletMeta.agent_type,
      member_tier: walletMeta.member_tier,
      points_lifetime: walletMeta.points_lifetime,
      referral_count: walletMeta.referral_count,
      converted_count: walletMeta.converted_count,
      commission_monthly: walletMeta.commission_monthly,
      commission_total: walletMeta.commission_total,
      remaining_points_to_next_tier: walletMeta.remaining_points_to_next_tier,
      upgrade_hint: walletMeta.upgrade_hint,
      mode: mode,
      hasReferralEntry: mode !== "trial",
      hasServiceLog: !!walletMeta.agent_id,
      hasEarnings: mode === "partner",
      hasTrialProgress: mode === "trial"
    };
  }

  /**
   * 同步交付卡控制面板
   */
  function syncDeliveryControlPanel(card) {
    if (!card || !Object.keys(card).length) {
      $("#deliveryCardMetaWrap").innerHTML = '<div class="empty-state">請先選取卡片</div>';
      $("#walletModeSimulator").innerHTML = '<div class="empty-state">請先選取卡片</div>';
      $("#walletObserver").innerHTML = '<div class="empty-state">請先選取卡片</div>';
      $("#serviceLogObserver").innerHTML = '<div class="empty-state">請先選取卡片</div>';
      $("#deliveryWarnings").innerHTML = '<div class="empty-state">請先選取卡片</div>';
      return;
    }

    const meta = buildDeliveryCardMeta(card);
    state.deliveryCardMeta = meta;
    state.deliveryWalletMeta = buildWalletMetaFromCard(card);

    renderDeliveryMeta(meta);
    renderWalletModeSimulator(meta, state.deliveryWalletMeta);
    renderWalletObserver(meta, state.deliveryWalletMeta);
    renderServiceLogObserver(card, state.deliveryWalletMeta);
    renderDeliveryWarnings(card, meta, state.deliveryWalletMeta);
    syncDeliveryLinkToolbox(card, meta);
    syncDeliveryMessageCenter(card, meta, state.deliveryWalletMeta);
  }

  function renderDeliveryMeta(meta) {
    const wrap = $("#deliveryCardMetaWrap");
    wrap.innerHTML = `
      <div class="delivery-meta-grid">
        <div class="delivery-meta-card"><div class="delivery-meta-label">card_id</div><div class="delivery-meta-value">${escapeHtml(meta.card_id)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">姓名</div><div class="delivery-meta-value">${escapeHtml(meta.name)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">付款狀態</div><div class="delivery-meta-value"><span class="badge ${meta.billing_status === 'paid' ? 'badge-success' : 'badge-warn'}">${escapeHtml(meta.billing_status)}</span></div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">卡片狀態</div><div class="delivery-meta-value"><span class="badge ${meta.status === 'active' ? 'badge-success' : 'badge-warn'}">${escapeHtml(meta.status)}</span></div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">啟用時間</div><div class="delivery-meta-value">${escapeHtml(meta.activated_at)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">到期時間</div><div class="delivery-meta-value">${escapeHtml(meta.expires_at)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">錢包模式</div><div class="delivery-meta-value"><span class="wallet-mode-badge wallet-mode-${meta.mode}">${escapeHtml(meta.mode)}</span></div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">agent_type</div><div class="delivery-meta-value">${escapeHtml(meta.agent_type || '-')}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">member_tier</div><div class="delivery-meta-value">${escapeHtml(meta.member_tier || '-')}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">累積點數</div><div class="delivery-meta-value">${escapeHtml(meta.points_lifetime)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">推薦人數</div><div class="delivery-meta-value">${escapeHtml(meta.referral_count)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">轉換人數</div><div class="delivery-meta-value">${escapeHtml(meta.converted_count)}</div></div>
        ${meta.mode === 'partner' ? `
        <div class="delivery-meta-card"><div class="delivery-meta-label">本月分潤</div><div class="delivery-meta-value">${escapeHtml(meta.commission_monthly)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">累計分潤</div><div class="delivery-meta-value">${escapeHtml(meta.commission_total)}</div></div>
        ` : ''}
        <div class="delivery-meta-card"><div class="delivery-meta-label">升級所需點數</div><div class="delivery-meta-value">${escapeHtml(meta.remaining_points_to_next_tier)}</div></div>
        <div class="delivery-meta-card"><div class="delivery-meta-label">升級提示</div><div class="delivery-meta-value">${escapeHtml(meta.upgrade_hint || '繼續累積即可升級')}</div></div>
      </div>
    `;
  }

  function renderWalletModeSimulator(meta, walletMeta) {
    const wrap = $("#walletModeSimulator");
    const rules = [
      `1️⃣ 檢查 wallet_mode 原始值：<strong>${escapeHtml(walletMeta.wallet_mode || '(無)')}</strong> → ${walletMeta.wallet_mode && ['trial','referral','partner'].includes(walletMeta.wallet_mode) ? '直接採用' : '繼續檢查'}`,
      `2️⃣ 檢查 agent_type 原始值：<strong>${escapeHtml(walletMeta.agent_type || '(無)')}</strong> → ${walletMeta.agent_type === 'partner' ? '判定為 partner' : (walletMeta.agent_type === 'referral' ? '判定為 referral' : '繼續檢查')}`,
      `3️⃣ 檢查 member_tier 原始值：<strong>${escapeHtml(walletMeta.member_tier || '(無)')}</strong> → ${walletMeta.member_tier === 'partner' ? '判定為 partner' : (walletMeta.member_tier === 'referral' ? '判定為 referral' : '繼續檢查')}`,
      `4️⃣ 檢查 points_lifetime：<strong>${walletMeta.points_lifetime}</strong> → ${walletMeta.points_lifetime >= 5 ? '≥5，判定為 referral' : '<5，判定為 trial'}`,
      `🎯 <strong>最終判定模式：<span class="wallet-mode-badge wallet-mode-${meta.mode}">${meta.mode}</span></strong>`
    ];
    wrap.innerHTML = `<div class="wallet-mode-simulator"><div class="detail-title">⚙️ 模式判定規則（對齊 poster.js resolveWalletMode）</div><div class="detail-grid"><div class="detail-item"><div class="detail-key">判定邏輯</div><div class="detail-value">${rules.map(r => `<div>${r}</div>`).join('')}</div></div></div></div>`;
  }

  function renderWalletObserver(meta, walletMeta) {
    const wrap = $("#walletObserver");
    wrap.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">💰 服務荷包觀測</div>
        <div class="detail-grid">
          ${renderDetailItem("推薦人數", meta.referral_count)}
          ${renderDetailItem("轉換人數", meta.converted_count)}
          ${renderDetailItem("累積點數", meta.points_lifetime)}
          ${renderDetailItem("升級所需點數", meta.remaining_points_to_next_tier)}
          ${renderDetailItem("升級提示", meta.upgrade_hint || "繼續累積即可升級")}
          ${renderDetailItem("點數規則", walletMeta.points_rule || "推薦成交獲得點數")}
          ${renderDetailItem("分潤規則", walletMeta.commission_rule || "服務核准獲得分潤")}
          ${renderDetailItem("升級規則", walletMeta.upgrade_rule || "累積5點升級為推薦模式")}
        </div>
      </div>
    `;
  }

  function renderServiceLogObserver(card, walletMeta) {
    const wrap = $("#serviceLogObserver");
    const canUseServiceLog = !!walletMeta.agent_id;
    wrap.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">📋 服務快記 / 服務紀錄觀測</div>
        <div class="detail-grid">
          ${renderDetailItem("agent_id", walletMeta.agent_id || "(無)")}
          ${renderDetailItem("服務快記可用性", canUseServiceLog ? "✅ 可用" : "❌ 不可用（無 agent_id）")}
          ${renderDetailItem("服務紀錄入口", canUseServiceLog ? "✅ 可查看" : "❌ 不可用")}
        </div>
        ${canUseServiceLog ? `<div class="action-row mt8"><button id="btnViewServiceLogsFromObserver" class="btn btn-xs btn-soft">查看服務紀錄</button></div>` : ''}
      </div>
    `;
    if (canUseServiceLog) {
      const btn = $("#btnViewServiceLogsFromObserver");
      if (btn) btn.addEventListener("click", () => {
        const agentId = walletMeta.agent_id;
        const cardId = textOf(card.id || card.card_id);
        window.open(`${CONFIG.GAS_BASE_URL}?action=getServiceLogs&card_id=${encodeURIComponent(cardId)}&agent_id=${encodeURIComponent(agentId)}&admin_key=${getAdminKey()}`, "_blank");
      });
    }
  }

  function renderDeliveryWarnings(card, meta, walletMeta) {
    const wrap = $("#deliveryWarnings");
    const warnings = [];
    if (isPaid(card) && !card.activated_at) warnings.push("⚠️ 已付款但無 activated_at");
    if (isPaid(card) && textOf(card.status).toLowerCase() !== "active") warnings.push("⚠️ 已付款但 status 非 active");
    if ((meta.mode === "referral" || meta.mode === "partner") && !walletMeta.referral_link) warnings.push("⚠️ 推薦/合作模式但 referral_link 缺失");
    if (meta.mode === "partner" && (!walletMeta.commission_total || walletMeta.commission_total === 0)) warnings.push("⚠️ 合作模式但無收益資料");
    if (!walletMeta.agent_id && meta.mode !== "trial") warnings.push("⚠️ 非試用模式但 agent_id 缺失");
    if (!card.expires_at) warnings.push("⚠️ expires_at 缺失");
    if (!card.update_link) warnings.push("⚠️ update_link 缺失");
    if (!card.renewal_link) warnings.push("⚠️ renewal_link 缺失");
    if (warnings.length === 0) {
      wrap.innerHTML = '<div class="delivery-meta-card" style="background:var(--ok-bg);color:var(--ok);">✅ 無異常</div>';
    } else {
      wrap.innerHTML = `<div class="delivery-warning">${warnings.map(w => `<div>${escapeHtml(w)}</div>`).join('')}</div>`;
    }
  }

  function syncDeliveryLinkToolbox(card, meta) {
    const id = textOf(card.id || card.card_id);
    const cardLink = buildCardUrlForToolbox(id);
    const posterLink = buildDeliveryLink(id);
    const referralLink = meta.referral_link || "";
    const updateLink = textOf(card.update_link) || "";
    const renewalLink = textOf(card.renewal_link) || "";
    const posterUrl = textOf(card.wechat_poster) || textOf(card.poster_url) || "";

    setTextValue("#toolboxCardLink", cardLink);
    setTextValue("#toolboxPosterLink", posterLink);
    setTextValue("#toolboxReferralLink", referralLink);
    setTextValue("#toolboxUpdateLink", updateLink);
    setTextValue("#toolboxRenewalLink", renewalLink);
    setTextValue("#toolboxPosterUrl", posterUrl);
  }

  function syncDeliveryMessageCenter(card, meta, walletMeta) {
    const id = textOf(card.id || card.card_id);
    const name = textOf(card.name || card.owner_name) || "您好";
    const cardLink = buildCardUrlForToolbox(id);
    const posterLink = buildDeliveryLink(id);
    const referralLink = meta.referral_link || "";
    const updateLink = textOf(card.update_link) || "";
    const renewalLink = textOf(card.renewal_link) || "";

    // Trial 分享文案
    const trialShareText = `${name}，您好～\n這是我的智慧名片，歡迎認識我。\n${cardLink}\n名片編號：${id}`;
    // 專屬入口文案
    const referralEntryText = meta.mode !== "trial" ? 
      `${name}，您好～\n這是我的專屬推薦入口，朋友從這裡進來，您的推薦與服務會被記錄。\n${referralLink}\n名片編號：${id}` : "此卡片為試用模式，尚無專屬入口";
    // 更新入口文案
    const updateEntryText = updateLink ? 
      `${name}，您好～\n這是您的名片更新入口。\n${updateLink}\n名片編號：${id}` : "此卡片尚無更新入口";
    // 續用入口文案
    const renewalEntryText = renewalLink ? 
      `${name}，您好～\n這是您的名片續用入口。\n${renewalLink}\n名片編號：${id}` : "此卡片尚無續用入口";

    setTextValue("#trialShareText", trialShareText);
    setTextValue("#referralEntryText", referralEntryText);
    setTextValue("#updateEntryText", updateEntryText);
    setTextValue("#renewalEntryText", renewalEntryText);
  }

  // ─────────────────────────────────────────────
  //  ADMIN USERS（mock，保留）
  // ─────────────────────────────────────────────
  function renderMockAdmins() {
    const tbody = $("#adminUsersTableBody");
    tbody.innerHTML = state.adminUsers.map(user => `<tr>
      <td>${escapeHtml(user.admin_id)}</td><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.role)}</td>
      <td>${escapeHtml(user.permissions)}</td><td>${escapeHtml(user.status)}</td>
      <td><button class="btn btn-xs btn-soft" disabled>編輯（待串 GAS）</button></td>
    </tr>`).join("");
  }

  function addMockAdmin() {
    const name = valueOf("#mockAdminName");
    const role = valueOf("#mockAdminRole");
    const permissions = valueOf("#mockAdminPermissions");
    if (!name || !role) return alert("請先輸入名稱與角色");
    const next = state.adminUsers.length + 1;
    state.adminUsers.push({ admin_id: `AD${String(next).padStart(3, "0")}`, name, role, permissions: permissions || "custom", status: "active" });
    renderMockAdmins();
    $("#mockAdminName").value = "";
    $("#mockAdminRole").value = "";
    $("#mockAdminPermissions").value = "";
    toast("✅ 已新增管理員 UI 假資料");
  }
    // ─────────────────────────────────────────────
  //  TEXT BUILDERS（保留原有 + v6.4 擴充）
  // ─────────────────────────────────────────────
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

  function buildCardUrlForToolbox(cardId) {
    return `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}`;
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

  // ─────────────────────────────────────────────
  //  DATA HELPERS（保留原有）
  // ─────────────────────────────────────────────
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
    const latest = rows.slice().sort((a, b) => textOf(b.created_at).localeCompare(textOf(a.created_at)))[0];
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
    const ownFlag = [textOf(card.update_limit_override_enabled), textOf(card.features_json), textOf(card.note)].join(" ").toLowerCase();
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
    return state.payments.some(p => textOf(p.card_id) === cardId && textOf(p.status).toLowerCase() === "paid");
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

  // ─────────────────────────────────────────────
  //  RENDER HELPERS
  // ─────────────────────────────────────────────
  function renderDetailItem(key, value) {
    return `<div class="detail-item"><div class="detail-key">${escapeHtml(key)}</div><div class="detail-value">${escapeHtml(formatValue(value))}</div></div>`;
  }

  // ─────────────────────────────────────────────
  //  UI HELPERS
  // ─────────────────────────────────────────────
  function setBtnLoading(btnEl, isLoading) {
    if (!btnEl) return;
    if (isLoading) {
      btnEl.dataset.originalText = btnEl.dataset.originalText || btnEl.textContent;
      btnEl.textContent = "處理中…";
      btnEl.disabled = true;
      btnEl.classList.add("is-disabled");
    } else {
      btnEl.textContent = btnEl.dataset.originalText || btnEl.textContent;
      btnEl.disabled = false;
      btnEl.classList.remove("is-disabled");
      delete btnEl.dataset.originalText;
    }
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

  function copyFromValue(selector, msg) {
    const el = $(selector);
    if (!el) return alert("找不到元素");
    const text = el.textContent;
    if (!text || text === "-") return alert("目前沒有可複製內容");
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
    } catch {
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
    toast._timer = setTimeout(() => el.classList.add("hidden"), 2200);
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

  function setTextValue(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value || "-";
  }

  /**
   * Double confirm：要求輸入 ID 才能繼續
   */
  function doubleConfirmId(id, label = "ID") {
    const entered = prompt(`⚠️ 高風險操作：請輸入 ${label}「${id}」以確認執行\n\n（輸入錯誤或取消則中止）`);
    if (entered === null) return false;
    if (textOf(entered) !== textOf(id)) {
      toast("❌ 輸入不符，操作已取消");
      return false;
    }
    return true;
  }

  function showRevertButtonAfterPaid(type, id) {
    const label = type === "addon" ? "加購單" : "卡片";
    const el = document.createElement("div");
    el.id = "revertNotice";
    el.className = "revert-notice";
    el.innerHTML = `<span>剛才確認了${label} <strong>${escapeHtml(id)}</strong> 的付款</span><button class="btn btn-xs btn-danger" id="btnRevertPaid">我按錯了</button>`;
    document.body.appendChild(el);
    document.getElementById("btnRevertPaid")?.addEventListener("click", () => {
      el.remove();
      showRevertNotice(label, id);
    });
    setTimeout(() => el.remove(), 30000);
  }

  function showRevertNotice(type, id) {
    const instructions = [
      `【撤銷${type}付款 - 手動處理】`,
      `操作時間：${new Date().toLocaleString("zh-TW")}`,
      `${type} ID：${id}`,
      ``,
      `請至 GAS 試算表手動將以下欄位改回：`,
      `- billing_status → unpaid`,
      `- status → pending（或原始狀態）`,
      `- paid_at → 清空`,
      ``,
      `或請工程師執行對應 script 撤銷。`
    ].join("\n");
    copyText(instructions, "✅ 撤銷指令已複製，請貼給工程師或手動至 GAS 處理");
    alert(`⚠️ 注意：系統目前無法自動撤銷付款。\n\n已複製處理指令到剪貼簿，請貼給工程師或手動至 GAS 試算表修改。\n\n${type} ID：${id}`);
  }

  // ─────────────────────────────────────────────
  //  PURE UTILS
  // ─────────────────────────────────────────────
  function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatValue(value) {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "object") {
      try { return JSON.stringify(value); } catch { return String(value); }
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

})(); // 結束 IIFE
