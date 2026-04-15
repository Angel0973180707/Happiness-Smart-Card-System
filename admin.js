(() => {
  "use strict";

  // ─────────────────────────────────────────────
  //  CONFIG
  // ─────────────────────────────────────────────
  const CONFIG = {
    VERSION: "v6.5.3-stable-no-break",
    GAS_BASE_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FORM_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/form.html",
    DEFAULT_RENEW_DAYS: 365,
    API_TIMEOUT_MS: 10000,
    API_RETRY: 1
  };

  // ─────────────────────────────────────────────
  //  ADMIN KEY 管理
  // ─────────────────────────────────────────────
  const KEY_STORAGE = "hsc_admin_key";

  function getAdminKey() { return localStorage.getItem(KEY_STORAGE) || ""; }
  function saveAdminKey(key) { if (!key || !key.trim()) return false; localStorage.setItem(KEY_STORAGE, key.trim()); return true; }
  function clearAdminKey() { localStorage.removeItem(KEY_STORAGE); }
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
  //  STATE
  // ─────────────────────────────────────────────
  let inviteGlobalBound = false;

  const state = {
    cards: [],
    payments: [],
    addons: [],
    agents: [],
    currentCard: null,
    currentAgent: null,
    currentAddon: null,
    paymentList: [],
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
    currentRenewalDetail: null,
    requests: [],
    requestFilter: '',
    currentRequest: null,
    currentRequestTrace: null,
    currentSelectedRequestForInvite: null
  };

  //  UTILS
  function $(selector) { return document.querySelector(selector); }
  function $$(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function textOf(value) { return value == null ? "" : String(value).trim(); }
  function valueOf(selector) { const el = $(selector); return el ? textOf(el.value) : ""; }
  function setTextValue(selector, value) { const el = $(selector); if (el) el.textContent = value || "-"; }
  function formatValue(value) { return value === undefined || value === null || value === "" ? "-" : String(value); }
  function parseDate(value) { if (!value) return null; const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
  function escapeHtml(str) { return String(str ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
  function parseJsonSafe(text) { try { return text ? JSON.parse(text) : {}; } catch { throw new Error("GAS 回傳不是合法 JSON"); } }
  function normalizeList(data, preferredKeys = []) {
    if (Array.isArray(data)) return data;
    for (const key of preferredKeys) if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }
  function firstValue(obj, keys) { for (const key of keys) { const v = obj && obj[key]; if (v !== undefined && v !== null && String(v).trim() !== "") return v; } return ""; }

  // TOAST & LOADING
  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.add("hidden"), 2200);
  }
  function setLoading(show) { const el = $("#loadingMask"); if (el) el.classList.toggle("hidden", !show); }
  function setGasStatus(text, type) {
    const el = $("#gasStatus");
    if (!el) return;
    el.textContent = text;
    el.className = `status-pill ${type || ""}`;
  }
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

  function on(selector, event, handler) {
    const el = $(selector);
    if (el) el.addEventListener(event, handler);
    else console.warn(`[on] Element not found: ${selector}`);
  }

  function doubleConfirmId(id, label = "ID") {
    const entered = prompt(`⚠️ 高風險操作：請輸入 ${label}「${id}」以確認執行\n\n（輸入錯誤或取消則中止）`);
    if (entered === null) return false;
    if (textOf(entered) !== textOf(id)) { toast("❌ 輸入不符，操作已取消"); return false; }
    return true;
  }

  function copyText(value, message = "已複製") {
    const val = String(value || "");
    if (!val) return alert("沒有可複製的內容");
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(val).then(() => toast(message)).catch(() => fallbackCopy(val, message)); }
    else fallbackCopy(val, message);
  }
  function fallbackCopy(value, message) {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed"; ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand("copy"); toast(message); } catch { alert("複製失敗，請手動複製"); }
    finally { ta.remove(); }
  }
  function copyFromField(selector, msg) { const text = valueOf(selector); if (!text) return alert("目前沒有可複製內容"); copyText(text, msg); }

  // ======================== 邀請碼相關函式 ========================
 function buildInviteFormUrl(inviteCode, backendFormUrl = "") {
  const directUrl = String(backendFormUrl || "").trim();
  if (directUrl) return directUrl;

  const code = String(inviteCode || "").trim();
  if (!code) return "";

  return `${CONFIG.FORM_URL}?invite=${encodeURIComponent(code)}`;
}

function buildInviteReplyText(request) {
  const code = String(request?.assigned_invite_code || "").trim();
  const requestId = String(request?.request_id || "").trim();
  const formUrl = buildInviteFormUrl(code, request?.form_url);

  if (!code) return "";

  return `您好，這是您的申請入口

申請編號：${requestId}
邀請碼：${code}

👉 點擊填寫：
${formUrl}`;
}

  // ─────────────────────────────────────────────
  //  API LAYER
  // ─────────────────────────────────────────────
  async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.API_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try { return await fetch(url, { ...options, signal: ctrl.signal }); }
    finally { clearTimeout(timer); }
  }
  async function apiGet(action, params = {}) {
    const key = getAdminKey();
    if (!key) { toast("⚠️ 請先設定 Admin Key"); throw new Error("Admin Key 未設定"); }
    const url = new URL(CONFIG.GAS_BASE_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("admin_key", key);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && String(v).trim() !== "") url.searchParams.set(k, v); });
    return _apiCall("GET", url.toString(), null, action);
  }
  async function apiPost(action, params = {}) {
    const key = getAdminKey();
    if (!key) { toast("⚠️ 請先設定 Admin Key"); throw new Error("Admin Key 未設定"); }
    return _apiCall("POST", CONFIG.GAS_BASE_URL, JSON.stringify({ action, admin_key: key, ...params }), action);
  }
  async function _apiCall(method, url, body, action, attempt = 0) {
    try {
      setLoading(true);
      const options = { method, ...(body ? { headers: { "Content-Type": "text/plain;charset=utf-8" }, body } : {}) };
      const res = await fetchWithTimeout(url, options);
      const text = await res.text();
      const json = parseJsonSafe(text);
      if (!res.ok) throw new Error((json && json.error) || `HTTP ${res.status}`);
      if (json && json.ok === false) throw new Error(json.error || `${action} 執行失敗`);
      setGasStatus("正常", "ok");
      return json && json.data != null ? json.data : json;
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
    } finally { setLoading(false); }
  }

  const WRITE_ACTIONS = new Set([
    "confirmPayment", "markPaymentRefunded", "approveRecognition", "rejectRecognition",
    "adminMarkRenewalPaid", "adminCancelAddonOrder",
    "adminFreezeAgent", "adminUnfreezeAgent", "markCommissionPaid", "runDailyOps",
    "adminCreateAddonOrder", "adminMarkAddonPaid", "adminBackfillAddonDueAt",
    "repairAddonOrderStatuses", "triggerRenewalReminder", "triggerRenewalPaymentReminder",
    "installSystemTriggers", "installCommercialTriggers", "adminRepairDueAt",
    "adminRepairDataValidation", "adminNormalizeCardThemeFields", "adminAuditCardThemeFields",
    "adminUpdateAgent", "adminSetAgentUpgrade", "adminNormalizeAgentTypeAndTier",
    "adminRepairAgentTypeEnum", "adminNormalizeAgentMemberTier", "adminRepairMissingAgents",
    "adminAdjustPoints", "adminAdjustCommission", "adminSaveAnnouncement",
    "adminToggleAnnouncement", "adminUpdateAgentType",
    "assignInviteToRequest"
  ]);

  async function api(action, params = {}) { return WRITE_ACTIONS.has(action) ? apiPost(action, params) : apiGet(action, params); }

  // ======================== 申請單相關 API ========================
  async function getRequests() { return apiGet("getRequests"); }
  async function assignInviteToRequest(requestId, inviteCode = null) {
    const payload = { request_id: requestId };
    if (inviteCode) payload.invite_code = inviteCode;
    return apiPost("assignInviteToRequest", payload);
  }
  async function getRequestTrace(requestId) {
    return apiGet("getRequestTrace", { request_id: requestId });
  }

  // ─────────────────────────────────────────────
  //  LINK BUILDERS
  // ─────────────────────────────────────────────
  function buildPreviewLink(cardId) { return `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`; }
  function buildDeliveryLink(cardId) { return `${CONFIG.HUB_URL}poster.html?id=${encodeURIComponent(cardId)}`; }
  function buildCardUrlForToolbox(cardId) { return `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}`; }
  function buildUpdateLink(cardId) { return `${CONFIG.HUB_URL}update.html?id=${encodeURIComponent(cardId)}`; }
  function buildRenewalLink(cardId) { return `${CONFIG.HUB_URL}renew.html?id=${encodeURIComponent(cardId)}`; }

  // ─────────────────────────────────────────────
  //  CARD HELPERS
  // ─────────────────────────────────────────────
  function isPaid(card) {
    const cardId = textOf(card.id || card.card_id);
    if (textOf(card.billing_status).toLowerCase() === "paid") return true;
    return state.payments.some(p => textOf(p.card_id) === cardId && textOf(p.status).toLowerCase() === "paid");
  }
  function isExpired(card) { const d = parseDate(card.expires_at); return !!(d && d < new Date()); }
  function isExpiringSoon(card, days) { const d = parseDate(card.expires_at); if (!d) return false; const now = new Date(); const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000); return d >= now && d <= end; }
  function needsRenewal(card) { return isExpired(card) || isExpiringSoon(card, 30); }
  function getRenewalStateText(card) { if (isExpired(card)) return "已到期"; if (isExpiringSoon(card, 30)) return "30天內到期"; return "正常"; }
  function billingStatusText(value) { const v = textOf(value).toLowerCase(); if (v === "paid") return "已付款"; if (v === "unpaid") return "未付款"; if (v === "locked") return "已鎖卡"; return value ? String(value) : "-"; }
  function planText(value) { const v = textOf(value).toLowerCase(); if (v === "free" || v === "plan_free") return "自由配款"; if (v === "premium" || v === "plan_premium") return "精品設計款"; return value ? String(value) : "-"; }

  // ======================== 收合式表格操作區核心函式 ========================
  function toggleRequest(id) {
    const el = document.getElementById(`req-${id}`);
    if (el) el.classList.toggle("hidden");
  }

  function copyInviteCodeByRequest(requestId) {
    const r = state.requests.find(x => x.request_id === requestId);
    if (!r || !r.assigned_invite_code) return toast("尚未派發");
    copyText(r.assigned_invite_code, "已複製邀請碼");
  }

function copyInviteUrlByRequest(requestId) {
  const r = state.requests.find(x => x.request_id === requestId);
  if (!r || !r.assigned_invite_code) return toast("尚未派發");
  copyText(
    buildInviteFormUrl(r.assigned_invite_code, r.form_url),
    "已複製申請連結"
  );
}

function copyInviteReplyByRequest(requestId) {
  const r = state.requests.find(x => x.request_id === requestId);
  if (!r || !r.assigned_invite_code) return toast("尚未派發");
  copyText(buildInviteReplyText(r), "已複製客服文案");
}

async function reassignInvite(requestId) {
  if (!confirm("重新派發會產生新邀請碼，確定？")) return;
  if (!doubleConfirmId(requestId, "申請單")) return;
  try {
    await apiPost("assignInviteToRequest", { request_id: requestId, force: true });
    toast("已重新派發");
    await loadRequests();
  } catch (e) {
    toast("後端尚未支援重新派發");
  }
}

function copyInviteUrlHandler() {
  const req = state.currentSelectedRequestForInvite;
  if (!req || !req.assigned_invite_code) {
    toast("⚠️ 請先選取申請單");
    return;
  }
  copyText(
    buildInviteFormUrl(req.assigned_invite_code, req.form_url),
    "✅ 申請連結已複製"
  );
}
  function copyInviteTextHandler() {
    const req = state.currentSelectedRequestForInvite;
    if (!req || !req.assigned_invite_code) { toast("⚠️ 請先選取申請單"); return; }
    copyText(buildInviteReplyText(req), "✅ 客服文案已複製");
  }
  function selectRequest(requestId) {
    const request = state.requests.find(r => r.request_id === requestId);
    if (!request) { toast('找不到該申請單'); return; }
    state.currentSelectedRequestForInvite = request;
    updateInviteResultPanel(request);
  }
function updateInviteResultPanel(request) {
  const resultPre = $("#inviteCreateResult");
  const urlBox = $("#inviteFormUrlBox");
  const textBox = $("#inviteReplyTextBox");

  if (!resultPre) return;

  if (!request || !textOf(request.assigned_invite_code)) {
    resultPre.innerText = "尚未選取任何已派發申請";
    if (urlBox) urlBox.value = "";
    if (textBox) textBox.value = "";
    return;
  }

  const inviteCode = textOf(request.assigned_invite_code);
  const formUrl = buildInviteFormUrl(inviteCode, request.form_url);
  const replyText = buildInviteReplyText({
    ...request,
    form_url: formUrl
  });

  resultPre.innerText =
    `【已派發申請單】\n` +
    `申請單 ID: ${textOf(request.request_id)}\n` +
    `邀請碼: ${inviteCode}\n` +
    `派發時間: ${textOf(request.assigned_at) || textOf(request.updated_at) || textOf(request.created_at) || "未知"}`;

  if (urlBox) urlBox.value = formUrl;
  if (textBox) textBox.value = replyText;
}
  function fillRequestToAssignForm(requestId) {
    const request = state.requests.find(r => textOf(r.request_id) === textOf(requestId));
    if (!request) { toast("找不到該申請單"); return; }
    if (textOf(request.status).toLowerCase() !== "pending") { toast("只有 pending 狀態的申請單可以派碼"); return; }
    state.currentRequest = request;
    const reqInput = $("#requestIdForAssign") || $("#assignRequestId");
    const refInput = $("#assignRequestRef");
    const sourceInput = $("#assignInviteSource");
    const noteInput = $("#assignInviteNote");
    const codeInput = $("#inviteCodeForRequest") || $("#assignInviteCode");
    if (reqInput) reqInput.value = textOf(request.request_id);
    if (refInput) refInput.value = textOf(request.ref);
    if (sourceInput && !textOf(sourceInput.value)) sourceInput.value = "request_assign";
    if (noteInput && !textOf(noteInput.value)) noteInput.value = textOf(request.note);
    if (codeInput) codeInput.value = "";
    updateInviteResultPanel(null);
    const assignDetails = $("#assignInviteDetails") || document.querySelector('[data-block="assign-invite"]') || document.querySelector("#formalInviteDetails");
    if (assignDetails && typeof assignDetails.open !== "undefined") assignDetails.open = true;
    if (reqInput && typeof reqInput.scrollIntoView === "function") reqInput.scrollIntoView({ behavior: "smooth", block: "center" });
    toast(`已載入申請單 ${textOf(request.request_id)}，可進行派碼`);
  }
  function renderFallbackTrace(request) {
    const wrap = $("#requestTraceWrap");
    if (!wrap) return;
    if (!request) { wrap.innerHTML = '<div class="empty-state">查無申請資料</div>'; return; }
    const inviteCode = textOf(request.assigned_invite_code);
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">申請單基本資料</div><div class="detail-grid">${renderDetailItem("request_id", request.request_id)}${renderDetailItem("created_at", request.created_at)}${renderDetailItem("ref", request.ref)}${renderDetailItem("status", request.status)}${renderDetailItem("assigned_invite_code", inviteCode || "尚未派碼")}${renderDetailItem("assigned_by", request.assigned_by)}${renderDetailItem("note", request.note)}${renderDetailItem("trace_mode", "local_fallback")}</div></div>`;
  }
  async function handleRequestTrace(requestId) {
    const request = state.requests.find(r => textOf(r.request_id) === textOf(requestId));
    if (!request) { toast("查無申請資料"); return; }
    updateInviteResultPanel(request);
    const actionRow = document.getElementById(`req-${requestId}`);
    if (actionRow) actionRow.classList.remove("hidden");
    renderFallbackTrace(request);
    try { if (typeof loadRequestTrace === "function") await loadRequestTrace(requestId); } catch (err) { console.warn("[handleRequestTrace] fallback mode:", err); toast("目前使用本地追蹤模式"); }
    const traceDetails = $("#requestTraceDetails") || document.querySelector('[data-block="request-trace"]') || document.querySelector("#requestTraceWrap")?.closest("details");
    if (traceDetails && typeof traceDetails.open !== "undefined") traceDetails.open = true;
    const traceWrap = $("#requestTraceWrap");
    if (traceWrap && typeof traceWrap.scrollIntoView === "function") traceWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function bindRequestListEvents() {
    const container = $("#requestListContainer");
    if (!container) return;
    if (container.dataset.bound === "1") return;
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const requestId = btn.dataset.requestId;
      if (!requestId) return;
      e.preventDefault();
      e.stopPropagation();
      switch(action) {
        case "toggle": toggleRequest(requestId); selectRequest(requestId); break;
        case "copyInviteCode": copyInviteCodeByRequest(requestId); break;
        case "copyInviteUrl": copyInviteUrlByRequest(requestId); break;
        case "copyInviteReply": copyInviteReplyByRequest(requestId); break;
        case "reassignInvite": reassignInvite(requestId); break;
        case "fillAssign": fillRequestToAssignForm(requestId); break;
        case "trace": handleRequestTrace(requestId); break;
      }
    });
    container.dataset.bound = "1";
  }

  // ======================== 修正後的派發邀請碼核心函式 ========================
  async function assignInviteToRequestAligned(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const reqInput = $("#requestIdForAssign") || $("#assignRequestId");
    const codeInput = $("#inviteCodeForRequest") || $("#assignInviteCode");
    const noteInput = $("#assignInviteNote");

    const requestId = textOf(reqInput?.value);

    if (!requestId) {
      toast("請先點擊「填寫派碼」選取申請單");
      return;
    }

    const request = state.requests.find(r => textOf(r.request_id) === requestId);

    if (!request) {
      toast("找不到對應申請單");
      return;
    }

    if (textOf(request.status).toLowerCase() !== "pending") {
      toast("該申請單已非 pending 狀態，無法派碼");
      return;
    }

    const btn = $("#btnAssignInviteToRequest");
    setBtnLoading(btn, true);

    try {
      const result = await assignInviteToRequest(requestId, null);
console.log("[assignInviteToRequest result]", result);

const immediateRequestRaw =
  result?.request ||
  result?.data?.request ||
  null;

const immediateRequest = immediateRequestRaw
  ? {
      ...immediateRequestRaw,
      form_url:
        result?.form_url ||
        result?.data?.form_url ||
        immediateRequestRaw.form_url ||
        ""
    }
  : null;

if (immediateRequest) {
  state.currentSelectedRequestForInvite = immediateRequest;

  updateInviteResultPanel(immediateRequest);

  if (codeInput) {
    codeInput.value = textOf(immediateRequest.assigned_invite_code);
  }

  if (textOf(immediateRequest.assigned_invite_code)) {
    toast("派碼成功");
  } else {
    toast("派碼完成，但後端未回寫 invite code");
  }

  const idx = state.requests.findIndex(
    r => textOf(r.request_id) === requestId
  );
  if (idx >= 0) {
    state.requests[idx] = {
      ...state.requests[idx],
      ...immediateRequest
    };
    renderRequests();
    bindRequestListEvents();
  }
} else {
  toast("派碼成功，正在同步列表…");
}

loadRequests().catch(err => {
  console.warn("loadRequests after assign failed:", err);
});

      if (reqInput) reqInput.value = "";
      if (noteInput) noteInput.value = "";

    } catch (err) {
      console.error("assignInviteToRequestAligned error:", err);
      toast("派碼失敗：" + err.message);
    } finally {
      setBtnLoading(btn, false);
    }
  }

  async function loadRequests() {
    try {
      const data = await getRequests();
      state.requests = normalizeList(data, ["requests", "items"]);
      renderRequests();
      bindRequestListEvents();
    } catch (err) {
      console.error('載入申請單失敗', err);
      state.requests = [];
      renderRequests();
      bindRequestListEvents();
      toast('載入申請單失敗：' + err.message);
    }
  }

  async function loadRequestTrace(requestId) {
    const container = $("#requestTraceWrap");
    if (!container) return;
    try {
      const trace = await getRequestTrace(requestId);
      state.currentRequestTrace = trace;
      renderRequestTrace(trace);
    } catch (err) {
      console.warn('getRequestTrace API 失敗，使用前端 fallback 模式', err);
      const request = state.requests.find(r => r.request_id === requestId);
      if (!request) { container.innerHTML = '<div class="empty-state">找不到申請單</div>'; return; }
      const fallbackTrace = { request: request, invite: request.assigned_invite_code ? { invite_code: request.assigned_invite_code } : null, lead: null, message: '目前使用前端追蹤模式（暫無完整追蹤 API）' };
      renderRequestTrace(fallbackTrace);
    }
  }
  function renderRequestTrace(trace) {
    const container = $("#requestTraceWrap");
    if (!container) return;
    if (!trace) { container.innerHTML = '<div class="empty-state">無追蹤資料</div>'; return; }
    let html = `<div class="trace-card">`;
    if (trace.message) html += `<div class="info-message">${escapeHtml(trace.message)}</div>`;
    html += `<h4>📌 申請單 (Request)</h4><pre>${escapeHtml(JSON.stringify(trace.request, null, 2))}</pre>`;
    if (trace.invite) html += `<h4>🎫 邀請碼 (Invite)</h4><pre>${escapeHtml(JSON.stringify(trace.invite, null, 2))}</pre>`;
    else html += `<h4>🎫 邀請碼</h4><div class="empty-state">尚未產生邀請碼</div>`;
    if (trace.lead) {
      html += `<h4>👤 客戶 (Lead / Card)</h4><pre>${escapeHtml(JSON.stringify(trace.lead, null, 2))}</pre>`;
      if (trace.lead.converted_card_id) html += `<div class="action-row mt8"><button id="btnTraceGoToCard" data-card-id="${escapeHtml(trace.lead.converted_card_id)}" class="btn btn-primary btn-sm">查看卡片詳情</button></div>`;
    } else html += `<h4>👤 客戶</h4><div class="empty-state">尚未轉換成卡片</div>`;
    html += `</div>`;
    container.innerHTML = html;
    const goBtn = $("#btnTraceGoToCard");
    if (goBtn) goBtn.addEventListener('click', (e) => { const cardId = e.currentTarget.dataset.cardId; if (cardId) loadCardDetail(cardId); });
  }
  // 跳轉到卡片詳情
  async function loadCardDetail(cardId) {
    if (!cardId) { toast("請提供卡片 ID"); return; }
    try {
      setLoading(true);
      const data = await apiGet("getCard", { card_id: cardId });
      const card = data.card || data || {};
      if (!card || !Object.keys(card).length) { toast("查無卡片資料"); return; }
      state.currentCard = card;
      const detailInput = $("#detailCardId");
      if (detailInput) detailInput.value = cardId;
      renderCardDetail(card);
      syncCurrentCardBox(card);
      syncDeliveryControlPanel(card);
      await loadCardPaymentSummary(cardId);
      await loadRenewalByCardId(cardId);
      const cardSection = document.getElementById("cardSection");
      if (cardSection) {
        $$(".section").forEach(s => s.style.display = "none");
        cardSection.style.display = "block";
        cardSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      toast(`已載入卡片 ${cardId}`);
    } catch (err) { console.error(err); toast(`載入卡片失敗：${err.message}`); }
    finally { setLoading(false); }
  }
// ─────────────────────────────────────────────
//  LOAD DATA
// ─────────────────────────────────────────────

    // 首屏只載核心資料，先讓畫面快出來
    const results = await Promise.allSettled([
      loadCards(),
      loadPaymentList(),   // 保留這支，移除重複的 loadPayments()
      loadAddons(),
      loadAgents()
    ]);

    const failed = results.filter(r => r.status === "rejected");
    if (failed.length) {
      console.warn("[refreshAll] 部分載入失敗:", failed.length, failed);
    }

    renderDashboard();

    // 次要資料延後背景補載，不阻塞首頁
    setTimeout(async () => {
      try { await loadRecognitionQueues(); } catch (err) { console.warn("[deferred] loadRecognitionQueues failed:", err); }
      try { await loadRenewalList(); } catch (err) { console.warn("[deferred] loadRenewalList failed:", err); }
      try { await loadAnnouncements(); } catch (err) { console.warn("[deferred] loadAnnouncements failed:", err); }
      try { await loadTrackingSummary(); } catch (err) { console.warn("[deferred] loadTrackingSummary failed:", err); }
      try { await loadRecentOpsLogs(); } catch (err) { console.warn("[deferred] loadRecentOpsLogs failed:", err); }

      // schema 檢查最重，改成最後補
      try { await checkSchemaStatus(); } catch (err) { console.warn("[deferred] checkSchemaStatus failed:", err); }

      renderDashboard();
    }, 50);

  } finally {
    setLoading(false);
  }
}
  // ─────────────────────────────────────────────
  //  RENDER FUNCTIONS (all with DOM existence checks)
  // ─────────────────────────────────────────────
  function renderDashboard() {
    const unpaid = state.cards.filter(card => !isPaid(card)).length;
    const needDelivery = state.cards.filter(card => isPaid(card)).length;
    const needRenewal = state.cards.filter(card => needsRenewal(card) || isExpiringSoon(card, 30)).length;
    const addonPending = state.addons.filter(item => { const s = textOf(item.status).toLowerCase(); return s !== "paid" && s !== "cancelled"; }).length;
    safeSetText("#statUnpaid", unpaid);
    safeSetText("#statNeedDelivery", needDelivery);
    safeSetText("#statNeedRenewal", needRenewal);
    safeSetText("#statAddonPending", addonPending);
    safeSetText("#statAgents", state.agents.length);
    const pendingPayments = state.paymentList.filter(p => textOf(p.status).toLowerCase() !== "paid").length;
    const pendingRecognition = state.recognitionRenewalItems.length + state.recognitionAddonItems.length;
    safeSetText("#statPendingPayments", pendingPayments);
    safeSetText("#statPendingRecognition", pendingRecognition);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPayments = state.payments.filter(p => textOf(p.paid_at || p.created_at || "").startsWith(todayStr)).length;
    const todayCards = state.cards.filter(c => textOf(c.created_at || "").startsWith(todayStr)).length;
    safeSetText("#statTodayPayments", todayPayments);
    safeSetText("#statTodayCards", todayCards);
    safeSetText("#statTodayCta", "N/A");
    safeSetText("#statTodayConversion", "N/A");
    renderDashboardRisks();
    renderDashboardFocus();
  }
  function renderDashboardRisks() {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const risks = [];
    const overdueUnpaid = state.cards.filter(card => { if (isPaid(card)) return false; const created = parseDate(card.created_at); return created && created < threeDaysAgo; });
    if (overdueUnpaid.length) risks.push({ level: "danger", text: `⚠️ 未付款超過 3 天：${overdueUnpaid.length} 張` });
    const paidNotDelivered = state.cards.filter(card => isPaid(card) && textOf(card.status).toLowerCase() !== "active");
    if (paidNotDelivered.length) risks.push({ level: "warn", text: `📦 已付款未交付：${paidNotDelivered.length} 張` });
    const expiringSoon = state.cards.filter(card => isExpiringSoon(card, 30) && !isExpired(card));
    if (expiringSoon.length) risks.push({ level: "info", text: `⏰ 30 天內即將到期：${expiringSoon.length} 張` });
    const expired = state.cards.filter(card => isExpired(card));
    if (expired.length) risks.push({ level: "danger", text: `🔴 已到期：${expired.length} 張` });
    const addonPending = state.addons.filter(item => { const s = textOf(item.status).toLowerCase(); return s !== "paid" && s !== "cancelled"; }).length;
    if (addonPending) risks.push({ level: "warn", text: `🛒 加購單待處理：${addonPending} 筆` });
    const riskEl = $("#dashboardRiskList");
    if (riskEl) riskEl.innerHTML = risks.length === 0 ? '<div class="focus-item">✅ 目前無高風險項目</div>' : risks.map(r => `<div class="focus-item risk-item risk-${r.level}">${escapeHtml(r.text)}</div>`).join("");
  }
  function renderDashboardFocus() {
    const unpaid = state.cards.filter(card => !isPaid(card)).length;
    const needDelivery = state.cards.filter(card => isPaid(card)).length;
    const needRenewal = state.cards.filter(card => needsRenewal(card) || isExpiringSoon(card, 30)).length;
    const addonPending = state.addons.filter(item => { const s = textOf(item.status).toLowerCase(); return s !== "paid" && s !== "cancelled"; }).length;
    const focus = [];
    if (unpaid) focus.push(`待付款卡片 ${unpaid} 張。`);
    if (needDelivery) focus.push(`已付款待交付卡片 ${needDelivery} 張。`);
    if (needRenewal) focus.push(`需續約關注卡片 ${needRenewal} 張。`);
    if (addonPending) focus.push(`待處理加購單 ${addonPending} 筆。`);
    if (!focus.length) focus.push("目前沒有高優先待辦。");
    const focusEl = $("#dashboardFocus");
    if (focusEl) focusEl.innerHTML = focus.map(x => `<div class="focus-item">${escapeHtml(x)}</div>`).join("");
  }
  function safeSetText(selector, value) { const el = $(selector); if (el) el.textContent = value; }
  function updateDashboardAnnouncementCount() { const activeCount = state.announcementItems.filter(a => textOf(a.status).toLowerCase() === "active").length; safeSetText("#statActiveAnnouncements", activeCount); }
  function updateDashboardSystemIssues() { const issues = state.schemaStatus?.issues || 0; safeSetText("#statSystemIssues", issues); }
  function updateDashboardPendingRecognition() { const pending = state.recognitionRenewalItems.length + state.recognitionAddonItems.length; safeSetText("#statPendingRecognition", pending); }
  function updateDashboardOpsLogs() {
    const opsContainer = $("#recentOpsLogs");
    if (!opsContainer) return;
    if (!state.opsLogs.length) { opsContainer.innerHTML = '<div class="focus-item">暫無操作紀錄</div>'; return; }
    opsContainer.innerHTML = state.opsLogs.slice(0, 5).map(log => `<div class="focus-item">${escapeHtml(formatValue(log.created_at))} - ${escapeHtml(log.action)} (${escapeHtml(log.operator || "system")})</div>`).join("");
  }
  function updateRenewalStats() {
    const soon = state.renewalItems.filter(r => textOf(r.status).toLowerCase() === "pending" && isExpiringSoon({ expires_at: r.expires_at }, 30)).length;
    const expired = state.renewalItems.filter(r => textOf(r.status).toLowerCase() === "pending" && isExpired({ expires_at: r.expires_at })).length;
    const pendingPay = state.renewalItems.filter(r => textOf(r.status).toLowerCase() === "pending").length;
    safeSetText("#renewalSoonCount", soon);
    safeSetText("#renewalExpiredCount", expired);
    safeSetText("#renewalPendingPayCount", pendingPay);
  }

  function renderCards() {
    const tbody = $("#cardsTableBody");
    if (!tbody) return;
    const keyword = valueOf("#cardSearch").toLowerCase();
    const rows = state.cards.filter(item => { const hay = [textOf(item.id || item.card_id), textOf(item.name || item.owner_name), textOf(item.phone), textOf(item.email)].join(" ").toLowerCase(); return !keyword || hay.includes(keyword); });
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">查無卡片資料</td></tr>'; return; }
    tbody.innerHTML = rows.map(item => { const id = textOf(item.id || item.card_id); return `<tr><td>${escapeHtml(id)}</td><td>${escapeHtml(textOf(item.name || item.owner_name))}</td><td>${escapeHtml(textOf(item.phone))}</td><td>${escapeHtml(planText(item.plan))}</td><td>${escapeHtml(textOf(item.status))}</td><td>${escapeHtml(billingStatusText(item.billing_status))}</td><td>${escapeHtml(formatValue(item.expires_at))}</td><td><button class="btn btn-xs btn-soft btn-card-detail" data-card-id="${escapeAttr(id)}">查看</button></td></tr>`; }).join("");
    $$(".btn-card-detail", tbody).forEach(btn => btn.addEventListener("click", async () => loadCardDetail(btn.dataset.cardId)));
  }
  function escapeAttr(str) { return escapeHtml(str); }
  function renderDetailItem(key, value) { return `<div class="detail-item"><div class="detail-key">${escapeHtml(key)}</div><div class="detail-value">${escapeHtml(formatValue(value))}</div></div>`; }
  function syncCurrentCardBox(card) {
    const label = $("#currentCardLabel"); if (label) label.textContent = textOf(card.id || card.card_id) || "未選取";
    const name = $("#currentCardName"); if (name) name.textContent = textOf(card.name || card.owner_name) || "-";
    const billing = $("#currentBillingStatus"); if (billing) billing.textContent = billingStatusText(card.billing_status);
    const plan = $("#currentPlan"); if (plan) plan.textContent = planText(card.plan);
  }

  function renderPayments() {
    const tbody = $("#paymentsTableBody");
    if (!tbody) return;
    if (!state.paymentList.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">尚無付款資料</td></tr>'; return; }
    tbody.innerHTML = state.paymentList.map(p => `<tr><td>${escapeHtml(textOf(p.payment_id || p.id))}</td><td>${escapeHtml(textOf(p.card_id))}</td><td>${escapeHtml(textOf(p.event_type))}</td><td>${escapeHtml(formatValue(p.amount))}</td><td><span class="badge ${textOf(p.status).toLowerCase() === 'paid' ? 'badge-success' : 'badge-warn'}">${escapeHtml(textOf(p.status) || 'pending')}</span></td><td>${escapeHtml(formatValue(p.due_at))}</td><td>${escapeHtml(formatValue(p.paid_at))}</td><td><div class="table-actions"><button class="btn btn-xs btn-soft btn-payment-detail" data-payment-id="${escapeAttr(p.payment_id || p.id)}">查看</button>${textOf(p.status).toLowerCase() !== 'paid' ? `<button class="btn btn-xs btn-primary btn-payment-confirm" data-payment-id="${escapeAttr(p.payment_id || p.id)}">確認付款</button>` : ''}${textOf(p.status).toLowerCase() === 'paid' ? `<button class="btn btn-xs btn-danger btn-payment-refund" data-payment-id="${escapeAttr(p.payment_id || p.id)}">退款</button>` : ''}</div></td></tr>`).join("");
    $$(".btn-payment-detail", tbody).forEach(btn => btn.addEventListener("click", () => loadPaymentDetail(btn.dataset.paymentId)));
    $$(".btn-payment-confirm", tbody).forEach(btn => btn.addEventListener("click", () => confirmPaymentFromUi(btn.dataset.paymentId)));
    $$(".btn-payment-refund", tbody).forEach(btn => btn.addEventListener("click", () => markPaymentRefundedFromUi(btn.dataset.paymentId)));
  }
  async function loadPaymentDetail(paymentId) {
    try { const data = await apiGet("getPaymentDetail", { payment_id: paymentId }); state.currentPaymentDetail = data.payment || data || {}; renderPaymentDetail(state.currentPaymentDetail); loadCardPaymentSummary(state.currentPaymentDetail.card_id); } catch (err) { console.error(err); }
  }
  function renderPaymentDetail(detail) {
    const wrap = $("#paymentDetailWrap");
    if (!wrap) return;
    if (!detail || !Object.keys(detail).length) { wrap.innerHTML = '<div class="empty-state">無詳情資料</div>'; return; }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">付款詳情</div><div class="detail-grid">${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }
  async function loadCardPaymentSummary(cardId) { if (!cardId) return; try { const data = await apiGet("getCardPaymentSummary", { card_id: cardId }); renderCardPaymentSummary(data.summary || data || {}); } catch (err) { console.error(err); } }
  function renderCardPaymentSummary(summary) {
    const wrap = $("#cardPaymentSummaryWrap");
    if (!wrap) return;
    if (!summary || !Object.keys(summary).length) { wrap.innerHTML = '<div class="empty-state">無摘要資料</div>'; return; }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">付款卡摘要</div><div class="detail-grid">${Object.entries(summary).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }
  async function confirmPaymentFromUi(paymentId) { if (!confirm(`確認付款單 ${paymentId} 已付款？`)) return; if (!doubleConfirmId(paymentId, "付款單")) return; try {   await apiPost("confirmPayment", { payment_id: paymentId }); toast("✅ 付款已確認");await loadPayments();  renderPayments();} catch (err) {   toast(`確認失敗：${err.message}`); }
  async function markPaymentRefundedFromUi(paymentId) { if (!confirm("⚠️ 退款操作無法自動撤銷，確定要退款嗎？")) return; if (!doubleConfirmId(paymentId, "付款單")) return; try { await apiPost("markPaymentRefunded", { payment_id: paymentId }); toast("✅ 已標記退款"); await loadPaymentList(); } catch (err) { toast(`退款失敗：${err.message}`); } }
  async function buildPaymentNoticeTexts(type) {
    const paymentId = state.currentPaymentDetail?.payment_id || state.paymentList[0]?.payment_id;
    if (!paymentId) return toast("請先選取一筆付款");
    try {
      let text = "";
      if (type === "payment") { const data = await apiGet("buildPaymentNoticeText", { payment_id: paymentId }); text = data.text || data.message || ""; const el = $("#paymentNoticeText"); if (el) el.value = text; }
      else if (type === "paid") { const data = await apiGet("buildPaidNoticeText", { payment_id: paymentId }); text = data.text || data.message || ""; const el = $("#paidNoticeText"); if (el) el.value = text; }
      else if (type === "delivery") { const data = await apiGet("buildDeliveryNoticeText", { payment_id: paymentId }); text = data.text || data.message || ""; if (/請貼上交付卡連結|placeholder|佔位|\{\{.*?\}\}/.test(text)) { const cardId = state.currentPaymentDetail?.card_id; if (cardId) text = `您好，您的名片已完成，請點擊連結查看：\n${buildDeliveryLink(cardId)}`; } const el = $("#deliveryNoticeText"); if (el) el.value = text; }
      if (text) toast("✅ 文案已生成");
    } catch (err) { toast(`生成失敗：${err.message}`); }
  }

  function renderRecognitionQueue(items) {
    const tbody = $("#recognitionTableBody");
    if (!tbody) return;
    if (!items.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">尚無待採認項目</td></tr>'; return; }
    tbody.innerHTML = items.map(item => `<tr><td>${escapeHtml(textOf(item.recognition_id || item.id))}</td><td>${escapeHtml(textOf(item.event_type))}</td><td>${escapeHtml(textOf(item.event_id))}</td><td>${escapeHtml(textOf(item.card_id))}</td><td>${escapeHtml(textOf(item.agent_id))}</td><td><span class="badge badge-warn">${escapeHtml(textOf(item.result) || 'pending')}</span></td><td>${escapeHtml(formatValue(item.recognized_at))}</td><td><button class="btn btn-xs btn-soft btn-recognition-detail" data-recognition-id="${escapeAttr(item.recognition_id || item.id)}">查看</button></td></tr>`).join("");
    $$(".btn-recognition-detail", tbody).forEach(btn => btn.addEventListener("click", () => loadRecognitionDetail(btn.dataset.recognitionId)));
  }
  function renderRecognitionDetail(detail) {
    const wrap = $("#recognitionDetailWrap");
    if (!wrap) return;
    if (!detail || !Object.keys(detail).length) { wrap.innerHTML = '<div class="empty-state">無詳情資料</div>'; return; }
    const recognitionId = detail.recognition_id || detail.id;
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">採認詳情</div><div class="detail-grid">${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div><div class="action-row mt16"><input id="recognitionServiceLogId" class="input" type="text" placeholder="service_log_id (選填)" style="flex:1;" /><input id="recognitionNote" class="input" type="text" placeholder="備註" style="flex:1;" /><button id="btnApproveRecognition" class="btn btn-primary" data-id="${escapeAttr(recognitionId)}">核准</button><button id="btnRejectRecognition" class="btn btn-danger" data-id="${escapeAttr(recognitionId)}">拒絕</button></div>`;
    const approveBtn = $("#btnApproveRecognition"); if (approveBtn) approveBtn.addEventListener("click", (e) => approveRecognitionFromUi(e.target.dataset.id));
    const rejectBtn = $("#btnRejectRecognition"); if (rejectBtn) rejectBtn.addEventListener("click", (e) => rejectRecognitionFromUi(e.target.dataset.id));
  }
  async function approveRecognitionFromUi(recognitionId) { if (!confirm("核准此採認單？")) return; if (!doubleConfirmId(recognitionId, "採認單")) return; const serviceLogId = valueOf("#recognitionServiceLogId") || undefined; const note = valueOf("#recognitionNote") || undefined; const btn = $("#btnApproveRecognition"); setBtnLoading(btn, true); try { await apiPost("approveRecognition", { recognition_id: recognitionId, service_log_id: serviceLogId, note }); toast("✅ 已核准採認"); await loadRecognitionQueues(); const wrap = $("#recognitionDetailWrap"); if (wrap) wrap.innerHTML = '<div class="empty-state">已核准，詳情已關閉</div>'; } catch (err) { toast(`核准失敗：${err.message}`); } finally { setBtnLoading(btn, false); } }
  async function rejectRecognitionFromUi(recognitionId) { if (!confirm("拒絕此採認單？")) return; if (!doubleConfirmId(recognitionId, "採認單")) return; const note = valueOf("#recognitionNote") || undefined; const btn = $("#btnRejectRecognition"); setBtnLoading(btn, true); try { await apiPost("rejectRecognition", { recognition_id: recognitionId, note }); toast("❌ 已拒絕採認"); await loadRecognitionQueues(); const wrap = $("#recognitionDetailWrap"); if (wrap) wrap.innerHTML = '<div class="empty-state">已拒絕，詳情已關閉</div>'; } catch (err) { toast(`拒絕失敗：${err.message}`); } finally { setBtnLoading(btn, false); } }

  function renderRenewalList() {
    const tbody = $("#renewalListTableBody");
    if (!tbody) return;
    if (!state.renewalItems.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">尚無續約資料</td></tr>'; return; }
    tbody.innerHTML = state.renewalItems.map(item => `<tr><td>${escapeHtml(textOf(item.renewal_id || item.id))}</td><td>${escapeHtml(textOf(item.card_id))}</td><td>${escapeHtml(formatValue(item.renew_days))}</td><td>${escapeHtml(formatValue(item.amount))}</td><td><span class="badge ${item.status === 'paid' ? 'badge-success' : 'badge-warn'}">${escapeHtml(item.status || 'pending')}</span></td><td>${escapeHtml(formatValue(item.expires_at))}</td><td><button class="btn btn-xs btn-soft btn-renewal-detail" data-renewal-id="${escapeAttr(item.renewal_id || item.id)}">查看詳情</button></td></tr>`).join("");
    $$(".btn-renewal-detail", tbody).forEach(btn => btn.addEventListener("click", () => loadRenewalDetail(btn.dataset.renewalId)));
  }
  function renderRenewalDetail(detail) {
    const wrap = $("#renewalDetailWrap");
    if (!wrap) return;
    if (!detail || !Object.keys(detail).length) { wrap.innerHTML = '<div class="empty-state">無詳情資料</div>'; return; }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">基本資訊</div><div class="detail-grid">${renderDetailItem("renewal_id", detail.renewal_id)}${renderDetailItem("card_id", detail.card_id)}${renderDetailItem("renew_days", detail.renew_days)}</div></div><div class="detail-section"><div class="detail-title">付款狀態</div><div class="detail-grid">${renderDetailItem("status", detail.status)}${renderDetailItem("amount", detail.amount)}${renderDetailItem("paid_at", detail.paid_at)}</div></div><div class="detail-section"><div class="detail-title">提醒狀態</div><div class="detail-grid">${renderDetailItem("reminder_sent_at", detail.reminder_sent_at)}${renderDetailItem("payment_reminder_sent_at", detail.payment_reminder_sent_at)}</div></div><div class="action-row"><button class="btn btn-primary btn-mark-renewal-paid" data-id="${escapeAttr(detail.renewal_id)}">標記已付款</button><button class="btn btn-soft btn-trigger-renewal-reminder" data-card-id="${escapeAttr(detail.card_id)}">觸發續約提醒</button></div>`;
    $$(".btn-mark-renewal-paid", wrap).forEach(btn => btn.addEventListener("click", () => markRenewalPaid(btn.dataset.id)));
    $$(".btn-trigger-renewal-reminder", wrap).forEach(btn => btn.addEventListener("click", () => triggerRenewalReminderForCard(btn.dataset.cardId)));
  }
  async function markRenewalPaid(renewalId) { if (!confirm(`確認續約單 ${renewalId} 已付款？`)) return; if (!doubleConfirmId(renewalId, "續約單")) return; try { await apiPost("adminMarkRenewalPaid", { renewal_id: renewalId }); toast("✅ 續約付款已確認"); await loadRenewalList(); if (state.currentCard) await loadRenewalByCardId(textOf(state.currentCard.id || state.currentCard.card_id)); } catch (err) { toast(`確認失敗：${err.message}`); } }
  async function triggerRenewalReminderForCard(cardId) { try { await apiPost("triggerRenewalReminder", { card_id: cardId }); toast("✅ 續約提醒已觸發"); } catch (err) { toast(`觸發失敗：${err.message}`); } }
  async function confirmRenewalPaid() { if (!state.currentCard) return alert("請先選取卡片"); const cardId = textOf(state.currentCard.id || state.currentCard.card_id); const renewDays = Number(valueOf("#renewDays") || CONFIG.DEFAULT_RENEW_DAYS); if (!confirm(`將卡片 ${cardId} 執行續約 ${renewDays} 天？`)) return; if (!doubleConfirmId(cardId, "卡片")) return; try { await apiPost("adminMarkRenewalPaid", { card_id: cardId, renew_days: renewDays }); toast("✅ 續約完成"); await loadCards(); await loadCardDetail(cardId); renderDashboard(); } catch (err) { toast(`續約失敗：${err.message}`); } }
  async function triggerPaymentReminder() { if (!state.currentCard) return alert("請先選取卡片"); const cardId = textOf(state.currentCard.id || state.currentCard.card_id); try { await apiPost("triggerRenewalPaymentReminder", { card_id: cardId }); toast("✅ 付款提醒已觸發"); } catch (err) { toast(`觸發失敗：${err.message}`); } }

  function renderAddons() {
    const tbody = $("#addonsTableBody");
    if (!tbody) return;
    const keyword = valueOf("#addonSearch").toLowerCase();
    const rows = state.addons.filter(item => { const hay = [textOf(item.addon_order_id), textOf(item.card_id), textOf(item.addon_type)].join(" ").toLowerCase(); return !keyword || hay.includes(keyword); });
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">查無加購資料</td></tr>'; return; }
    tbody.innerHTML = rows.map(item => { const addonOrderId = textOf(item.addon_order_id); const status = textOf(item.status); return `<tr><td>${escapeHtml(addonOrderId)}</td><td>${escapeHtml(textOf(item.card_id))}</td><td>${escapeHtml(textOf(item.addon_type))}</td><td>${escapeHtml(formatValue(item.qty || 1))}</td><td><span class="badge ${status === 'paid' ? 'badge-success' : 'badge-warn'}">${escapeHtml(status || '-')}</span></td><td>${escapeHtml(formatValue(item.amount))}</td><td>${escapeHtml(formatValue(item.due_at))}</td><td><div class="table-actions"><button class="btn btn-xs btn-soft btn-addon-detail" data-addon-id="${escapeAttr(addonOrderId)}">查看</button>${status.toLowerCase() !== 'paid' ? `<button class="btn btn-xs btn-primary btn-addon-paid" data-addon-id="${escapeAttr(addonOrderId)}" data-card-id="${escapeAttr(textOf(item.card_id))}">確認付款</button>` : ''}<button class="btn btn-xs btn-soft btn-addon-reminder" data-addon-id="${escapeAttr(addonOrderId)}">複製提醒</button></div></td></tr>`; }).join("");
    $$(".btn-addon-detail", tbody).forEach(btn => btn.addEventListener("click", async () => loadAddonDetail(btn.dataset.addonId)));
    $$(".btn-addon-paid", tbody).forEach(btn => btn.addEventListener("click", async () => confirmAddonPaid(btn.dataset.addonId, btn.dataset.cardId, btn)));
    $$(".btn-addon-reminder", tbody).forEach(btn => btn.addEventListener("click", () => { const item = state.addons.find(a => textOf(a.addon_order_id) === btn.dataset.addonId); if (item) buildAddonReminderFromApi(item.addon_order_id); }));
  }
  async function buildAddonReminderFromApi(addonOrderId) {
    try { const data = await apiGet("buildAddonPaymentNoticeText", { addon_order_id: addonOrderId }); const text = data.text || data.message || ""; const el = $("#addonPaymentReminderText"); if (el) el.value = text; toast("✅ 文案已生成"); } catch (err) { console.warn(err); const fallback = state.addons.find(a => textOf(a.addon_order_id) === addonOrderId); if (fallback) { const el = $("#addonPaymentReminderText"); if (el) el.value = buildAddonPaymentReminderText(fallback); toast("⚠️ 使用前端備用文案"); } else toast("無法產生提醒文案"); }
  }
  function buildAddonPaymentReminderText(addon) { return `您好～提醒您，目前有一筆智慧名片加購單待付款。\n加購單號：${textOf(addon.addon_order_id)}\n名片編號：${textOf(addon.card_id)}\n加購項目：${textOf(addon.addon_type)}\n金額：${formatValue(addon.amount)}\n付款完成後請通知客服。`; }
  function renderAddonDetail(detail) {
    const wrap = $("#addonDetailWrap");
    if (!wrap) return;
    if (!detail || !Object.keys(detail).length) { wrap.innerHTML = '<div class="empty-state">查無加購詳情</div>'; return; }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">加購單資料</div><div class="detail-grid">${Object.entries(detail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}${detail.due_at ? `<div class="detail-item"><div class="detail-key">倒數</div><div class="detail-value">${calcCountdown(detail.due_at)}</div></div>` : ''}</div></div><div class="action-row"><button class="btn btn-primary btn-confirm-addon-paid" data-id="${escapeAttr(detail.addon_order_id)}" data-card-id="${escapeAttr(detail.card_id)}">確認付款</button><button class="btn btn-soft btn-backfill-due" data-id="${escapeAttr(detail.addon_order_id)}">補填 due_at</button><button class="btn btn-danger btn-cancel-addon" data-id="${escapeAttr(detail.addon_order_id)}">取消加購單</button></div>`;
    $$(".btn-confirm-addon-paid", wrap).forEach(btn => btn.addEventListener("click", () => confirmAddonPaid(btn.dataset.id, btn.dataset.cardId, btn)));
    $$(".btn-backfill-due", wrap).forEach(btn => btn.addEventListener("click", () => backfillAddonDueAt(btn.dataset.id)));
    $$(".btn-cancel-addon", wrap).forEach(btn => btn.addEventListener("click", () => cancelAddon(btn.dataset.id, btn)));
  }
  function calcCountdown(dueAt) { const due = parseDate(dueAt); if (!due) return "-"; const diff = due - new Date(); if (diff <= 0) return "已逾期"; const days = Math.floor(diff / (1000 * 60 * 60 * 24)); return `剩餘 ${days} 天`; }
  async function createAddonOrder() { const cardId = valueOf("#createAddonCardId"); const addonType = valueOf("#createAddonType"); const qty = parseInt(valueOf("#createAddonQty") || "1"); const amount = parseFloat(valueOf("#createAddonAmount") || "0"); if (!cardId) return toast("請輸入卡片 ID"); if (!doubleConfirmId(cardId, "卡片")) return; try { await apiPost("adminCreateAddonOrder", { card_id: cardId, addon_type: addonType, qty, amount }); toast("✅ 加購單建立成功"); await loadAddons(); if (state.currentCard && textOf(state.currentCard.id) === cardId) await loadCardDetail(cardId); } catch (err) { toast(`建立失敗：${err.message}`); } }
  async function confirmAddonPaid(addonOrderId, cardId, btnEl) { if (!confirm(`確認加購單 ${addonOrderId} 已付款？`)) return; if (!doubleConfirmId(addonOrderId, "加購單")) return; setBtnLoading(btnEl, true); try { await apiPost("adminMarkAddonPaid", { addon_order_id: addonOrderId }); toast("✅ 加購單已確認付款"); await loadAddons(); if (cardId) await loadCardDetail(cardId); } catch (err) { toast(`確認失敗：${err.message}`); } finally { setBtnLoading(btnEl, false); } }
  async function backfillAddonDueAt(addonOrderId) { const dueAt = prompt("輸入 due_at (YYYY-MM-DD)：", new Date().toISOString().slice(0, 10)); if (!dueAt) return; try { await apiPost("adminBackfillAddonDueAt", { addon_order_id: addonOrderId, due_at: dueAt }); toast("✅ due_at 已補填"); await loadAddons(); } catch (err) { toast(`補填失敗：${err.message}`); } }
  async function cancelAddon(addonOrderId, btnEl) { if (!confirm(`確定取消加購單 ${addonOrderId}？`)) return; if (!doubleConfirmId(addonOrderId, "加購單")) return; setBtnLoading(btnEl, true); try { await apiPost("adminCancelAddonOrder", { addon_order_id: addonOrderId }); toast("✅ 加購單已取消"); await loadAddons(); } catch (err) { toast(`取消失敗：${err.message}`); } finally { setBtnLoading(btnEl, false); } }
  async function repairAddonStatuses() { if (!confirm("修復加購單狀態？")) return; try { await apiPost("repairAddonOrderStatuses"); toast("✅ 修復完成"); await loadAddons(); const resultDiv = $("#addonRepairResult"); if (resultDiv) resultDiv.innerHTML = '<div class="result-box">✅ 加購單狀態修復完成</div>'; } catch (err) { toast(`修復失敗：${err.message}`); } }

  function renderAgents() {
    const tbody = $("#agentsTableBody");
    if (!tbody) return;
    const keyword = valueOf("#agentSearch").toLowerCase();
    const rows = state.agents.filter(item => { const hay = [textOf(item.agent_id), textOf(item.owner_name), textOf(item.agent_type)].join(" ").toLowerCase(); return !keyword || hay.includes(keyword); });
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">查無代理資料</div>'; return; }
    tbody.innerHTML = rows.map(item => `<tr><td>${escapeHtml(textOf(item.agent_id))}</td><td>${escapeHtml(textOf(item.owner_name))}</td><td class="badge ${item.agent_type === 'partner' ? 'badge-success' : 'badge-info'}">${escapeHtml(textOf(item.agent_type) || '-')}</span></td><td>${escapeHtml(textOf(item.member_tier) || '-')}</td><td>${escapeHtml(formatValue(item.points_balance))}</td><td>${escapeHtml(formatValue(item.total_commission))}</td><td class="badge ${item.status === 'active' ? 'badge-success' : 'badge-warn'}">${escapeHtml(item.status || 'active')}</span></td><td><button class="btn btn-xs btn-soft btn-agent-detail" data-agent-id="${escapeAttr(textOf(item.agent_id))}">查看</button></td></tr>`).join("");
    $$(".btn-agent-detail", tbody).forEach(btn => btn.addEventListener("click", async () => loadAgentDetail(btn.dataset.agentId)));
  }
  function renderAgentDetail(agent) {
    const wrap = $("#agentDetailWrap");
    if (!wrap) return;
    if (!agent || !Object.keys(agent).length) { wrap.innerHTML = '<div class="empty-state">查無代理詳情</div>'; return; }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">代理資料</div><div class="detail-grid">${Object.entries(agent).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }
  function syncCurrentAgentBox(agent) {
    const label = $("#currentAgentLabel"); if (label) label.textContent = textOf(agent.agent_id) || "未選取";
    const name = $("#currentAgentName"); if (name) name.textContent = textOf(agent.owner_name) || "-";
    const points = $("#currentAgentPoints"); if (points) points.textContent = formatValue(agent.points_balance);
    const commission = $("#currentAgentCommission"); if (commission) commission.textContent = formatValue(agent.total_commission);
  }
  function populateAgentEditForm(agent) {
    const nameEl = $("#editAgentName"); if (nameEl) nameEl.value = textOf(agent.owner_name) || "";
    const phoneEl = $("#editAgentPhone"); if (phoneEl) phoneEl.value = textOf(agent.phone) || "";
    const emailEl = $("#editAgentEmail"); if (emailEl) emailEl.value = textOf(agent.email) || "";
    const typeEl = $("#editAgentType"); if (typeEl) typeEl.value = textOf(agent.agent_type) || "";
  }
  function renderAgentUpgradeCard(agent) {
    const wrap = $("#agentUpgradeCard");
    if (!wrap) return;
    if (!agent || !Object.keys(agent).length) { wrap.innerHTML = '<div class="empty-state">請先查詢代理詳情</div>'; return; }
    wrap.innerHTML = `<div class="detail-grid">${renderDetailItem("agent_type", agent.agent_type)}${renderDetailItem("member_tier", agent.member_tier)}${renderDetailItem("eligible_for_upgrade", agent.eligible_for_upgrade || "-")}${renderDetailItem("tier_upgrade_eligible", agent.tier_upgrade_eligible || "-")}${renderDetailItem("upgrade_status", agent.upgrade_status || "-")}${renderDetailItem("partner_status", agent.partner_status || "-")}${renderDetailItem("points_balance", agent.points_balance)}${renderDetailItem("points_lifetime", agent.points_lifetime)}${renderDetailItem("total_commission", agent.total_commission)}${renderDetailItem("upgrade_eligible_at", agent.upgrade_eligible_at)}${renderDetailItem("tier_upgrade_reminder_sent_at", agent.tier_upgrade_reminder_sent_at || "-")}${renderDetailItem("target_tier", agent.target_tier || "-")}</div>`;
  }
  async function renderAgentRecentLogs(agentId) {
    if (!agentId) return;
    try { const pointsLog = await apiGet("getAgentPointsLog", { agent_id: agentId }); const commissionLog = await apiGet("getAgentCommissionLog", { agent_id: agentId }); renderPointsLog(normalizeList(pointsLog, ["logs"])); renderCommissionLog(normalizeList(commissionLog, ["logs"])); } catch (err) { console.error(err); }
  }
  async function updateAgent() { const agentId = valueOf("#detailAgentId"); if (!agentId) return alert("請先查詢代理詳情"); const params = { agent_id: agentId, owner_name: valueOf("#editAgentName"), phone: valueOf("#editAgentPhone"), email: valueOf("#editAgentEmail"), agent_type: valueOf("#editAgentType") }; try { await apiPost("adminUpdateAgent", params); toast("✅ 代理資料已更新"); await loadAgentDetail(agentId); await loadAgents(); } catch (err) { toast(`更新失敗：${err.message}`); } }
  async function freezeAgent() { const agentId = valueOf("#detailAgentId"); if (!agentId) return alert("請先查詢代理詳情"); if (!confirm(`確定凍結代理 ${agentId}？`)) return; if (!doubleConfirmId(agentId, "代理")) return; try { await apiPost("adminFreezeAgent", { agent_id: agentId }); toast("✅ 代理已凍結"); await loadAgentDetail(agentId); await loadAgents(); } catch (err) { toast(`凍結失敗：${err.message}`); } }
  async function unfreezeAgent() { const agentId = valueOf("#detailAgentId"); if (!agentId) return alert("請先查詢代理詳情"); if (!confirm(`確定解凍代理 ${agentId}？`)) return; if (!doubleConfirmId(agentId, "代理")) return; try { await apiPost("adminUnfreezeAgent", { agent_id: agentId }); toast("✅ 代理已解凍"); await loadAgentDetail(agentId); await loadAgents(); } catch (err) { toast(`解凍失敗：${err.message}`); } }
  async function setAgentUpgrade() { const agentId = valueOf("#detailAgentId"); if (!agentId) return alert("請先查詢代理詳情"); const targetTier = valueOf("#target_tier"); if (!targetTier) return alert("請輸入目標等級 (target_tier)"); if (!doubleConfirmId(agentId, "代理")) return; try { await apiPost("adminSetAgentUpgrade", { agent_id: agentId, target_tier: targetTier }); toast("✅ 代理已設為可升級（目標等級：" + targetTier + "）"); await loadAgentDetail(agentId); } catch (err) { toast(`設定失敗：${err.message}`); } }
  async function normalizeMemberTier() { const agentId = valueOf("#detailAgentId"); if (!agentId) return alert("請先查詢代理詳情"); try { await apiPost("adminNormalizeAgentMemberTier", { agent_id: agentId }); toast("✅ member_tier 已正規化"); await loadAgentDetail(agentId); } catch (err) { toast(`正規化失敗：${err.message}`); } }
  async function normalizeTypeAndTier() { if (!confirm("正規化所有代理的 type 和 tier？")) return; try { await apiPost("adminNormalizeAgentTypeAndTier"); toast("✅ 正規化完成"); await loadAgents(); } catch (err) { toast(`正規化失敗：${err.message}`); } }
  async function repairAgentTypeEnum() { if (!confirm("修復 agent_type enum？")) return; try { await apiPost("adminRepairAgentTypeEnum"); toast("✅ 修復完成"); await loadAgents(); } catch (err) { toast(`修復失敗：${err.message}`); } }
  async function repairMissingAgents() { if (!confirm("修復遺失代理？")) return; try { await apiPost("adminRepairMissingAgents"); toast("✅ 修復完成"); await loadAgents(); } catch (err) { toast(`修復失敗：${err.message}`); } }

  async function adjustPoints(mode) { const agentId = valueOf("#pointsAgentId"); const pointsValue = Number(valueOf("#pointsValue")); const note = valueOf("#pointsNote"); if (!agentId) return alert("請輸入 agent_id"); if (!Number.isFinite(pointsValue) || pointsValue <= 0) return alert("points 必須大於 0"); const points = mode === "subtract" ? -Math.abs(pointsValue) : Math.abs(pointsValue); try { await apiPost("adminAdjustPoints", { agent_id: agentId, points, note }); toast(mode === "subtract" ? "✅ 已扣點" : "✅ 已加點"); await loadAgents(); await loadAgentDetail(agentId); } catch (err) { toast(`操作失敗：${err.message}`); } }
  async function adjustCommission() { const agentId = valueOf("#commissionAgentId"); const amount = Number(valueOf("#commissionValue")); const note = valueOf("#commissionNote"); if (!agentId) return alert("請輸入 agent_id"); if (!Number.isFinite(amount) || amount <= 0) return alert("amount 必須大於 0"); try { await apiPost("adminAdjustCommission", { agent_id: agentId, amount, note }); toast("✅ 已補分潤"); await loadAgents(); await loadAgentDetail(agentId); } catch (err) { toast(`操作失敗：${err.message}`); } }
  async function reloadLogsForCurrentAgent() { const agentId = valueOf("#detailAgentId") || textOf(state.currentAgent?.agent_id); if (!agentId) return alert("請先選取代理"); await renderAgentRecentLogs(agentId); }
  function renderPointsLog(rows) {
    const tbody = $("#pointsLogTableBody");
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">沒有點數 Log</td></tr>'; return; }
    tbody.innerHTML = rows.map(row => `<tr><td>${escapeHtml(formatValue(firstValue(row, ["created_at", "time"])))}</td><td>${escapeHtml(formatValue(firstValue(row, ["type", "action"])))}</td><td>${escapeHtml(`${formatValue(firstValue(row, ["before_balance", "before"]))} → ${formatValue(firstValue(row, ["after_balance", "after"]))}`)}</td><td>${escapeHtml(formatValue(firstValue(row, ["note", "memo"])))}</td></tr>`).join("");
  }
  function renderCommissionLog(rows) {
    const tbody = $("#commissionLogTableBody");
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = '<td><td colspan="4" class="empty-cell">沒有分潤 Log</td></tr>'; return; }
    tbody.innerHTML = rows.map(row => `<tr><td>${escapeHtml(formatValue(firstValue(row, ["created_at", "time"])))}</td><td>${escapeHtml(formatValue(firstValue(row, ["amount"])))}</td><td>${escapeHtml(`${formatValue(firstValue(row, ["before_total", "before"]))} → ${formatValue(firstValue(row, ["after_total", "after"]))}`)}</td><td>${escapeHtml(formatValue(firstValue(row, ["note", "memo"])))}</td></tr>`).join("");
  }
 function renderCommissionList() {
  const tbody = $("#commissionListTableBody");
  if (!tbody) return;

  if (!state.commissionItems.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">尚無分潤資料</td></tr>';
    return;
  }

  tbody.innerHTML = state.commissionItems.map(item => `
    <tr>
      <td>${escapeHtml(textOf(item.commission_id || item.id))}</td>
      <td>${escapeHtml(textOf(item.agent_id))}</td>
      <td>${escapeHtml(formatValue(item.amount))}</td>
      <td>
        <span class="badge ${item.status === 'paid' ? 'badge-success' : 'badge-warn'}">
          ${escapeHtml(item.status || 'pending')}
        </span>
       </td>
      <td>${escapeHtml(formatValue(item.payment_id))}</td>
      <td>
        ${item.status !== 'paid'
          ? `<button class="btn btn-xs btn-primary btn-mark-commission-paid" data-id="${escapeAttr(item.commission_id || item.id)}">標記已付</button>`
          : '-'}
       </td>
    </tr>
  `).join("");

  $$(".btn-mark-commission-paid").forEach(btn =>
    btn.addEventListener("click", () => markCommissionPaid(btn.dataset.id))
  );
}

  function renderAnnouncements() {
    const tbody = $("#announcementsTableBody");
    if (!tbody) return;
    if (!state.announcementItems.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">尚無公告</td></tr>'; return; }
    tbody.innerHTML = state.announcementItems.map(a => `<tr><td>${escapeHtml(textOf(a.announcement_id || a.id))}</td><td>${escapeHtml(textOf(a.title))}</td><td>${escapeHtml(textOf(a.content).substring(0, 50))}${textOf(a.content).length > 50 ? "..." : ""}</td><td><span class="badge ${textOf(a.status).toLowerCase() === 'active' ? 'badge-success' : ''}">${escapeHtml(textOf(a.status))}</span></td><td>${escapeHtml(formatValue(a.published_at || a.created_at))}</td><td><button class="btn btn-xs btn-soft btn-toggle-announcement" data-id="${escapeAttr(a.announcement_id || a.id)}" data-status="${escapeAttr(a.status)}">切換狀態</button></td></tr>`).join("");
    $$(".btn-toggle-announcement").forEach(btn => btn.addEventListener("click", () => toggleAnnouncement(btn.dataset.id, btn.dataset.status)));
  }
  function showAnnouncementForm() {
    const card = $("#announcementFormCard");
    if (card) {
      card.style.display = "block";
      if (card.open !== undefined) card.open = true;
    }
    const titleEl = $("#announcementTitle"); if (titleEl) titleEl.value = "";
    const contentEl = $("#announcementContent"); if (contentEl) contentEl.value = "";
    const statusEl = $("#announcementStatus"); if (statusEl) statusEl.value = "draft";
  }
  function hideAnnouncementForm() {
    const card = $("#announcementFormCard");
    if (card) {
      card.style.display = "none";
      if (card.open !== undefined) card.open = false;
    }
  }
  async function saveAnnouncement() { const title = valueOf("#announcementTitle"); const content = valueOf("#announcementContent"); const status = valueOf("#announcementStatus"); if (!title || !content) return toast("請填寫標題和內容"); try { await apiPost("adminSaveAnnouncement", { title, content, status }); toast("✅ 公告已儲存"); hideAnnouncementForm(); await loadAnnouncements(); } catch (err) { toast(`儲存失敗：${err.message}`); } }
  async function toggleAnnouncement(id, currentStatus) { const newStatus = currentStatus === "active" ? "draft" : "active"; try { await apiPost("adminToggleAnnouncement", { announcement_id: id, status: newStatus }); toast(`✅ 公告已${newStatus === "active" ? "啟用" : "停用"}`); await loadAnnouncements(); } catch (err) { toast(`操作失敗：${err.message}`); } }

  function renderTrackingSummary() {
    if (!state.trackingSummary) return;
    safeSetText("#trackingTotalCards", formatValue(state.trackingSummary.total_cards || 0));
    safeSetText("#trackingTotalAgents", formatValue(state.trackingSummary.total_agents || 0));
    safeSetText("#trackingMonthlyRevenue", formatValue(state.trackingSummary.monthly_revenue || 0));
    safeSetText("#trackingMonthlyCommission", formatValue(state.trackingSummary.monthly_commission || 0));
  }
  function renderCardTrackingDetail() {
    const wrap = $("#cardTrackingDetail");
    if (!wrap) return;
    if (!state.cardTrackingDetail || !Object.keys(state.cardTrackingDetail).length) { wrap.innerHTML = '<div class="empty-state">無追蹤資料</div>'; return; }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-grid">${Object.entries(state.cardTrackingDetail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }
  function renderAgentTrackingDetail() {
    const wrap = $("#agentTrackingDetail");
    if (!wrap) return;
    if (!state.agentTrackingDetail || !Object.keys(state.agentTrackingDetail).length) { wrap.innerHTML = '<div class="empty-state">無追蹤資料</div>'; return; }
    wrap.innerHTML = `<div class="detail-section"><div class="detail-grid">${Object.entries(state.agentTrackingDetail).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div></div>`;
  }
  async function getCardTrackingStats() { const cardId = valueOf("#trackingCardId"); if (!cardId) return toast("請輸入卡片 ID"); try { const data = await apiGet("getCardTrackingStats", { card_id: cardId }); state.cardTrackingDetail = data.tracking || data || {}; renderCardTrackingDetail(); } catch (err) { toast("查詢失敗"); } }
  async function getAgentTrackingStats() { const agentId = valueOf("#trackingAgentId"); if (!agentId) return toast("請輸入代理 ID"); try { const data = await apiGet("getAgentTrackingStats", { agent_id: agentId }); state.agentTrackingDetail = data.tracking || data || {}; renderAgentTrackingDetail(); } catch (err) { toast("查詢失敗"); } }

  function renderSchemaStatus() {
    const wrap = $("#schemaStatus");
    if (!wrap) return;
    if (!state.schemaStatus) { wrap.innerHTML = '<div class="empty-state">尚未檢查</div>'; return; }
    const issues = state.schemaStatus.issues || 0;
    const statusHtml = `<div class="focus-item risk-${issues === 0 ? 'ok' : 'warn'}">📋 Schema 健康度：${issues === 0 ? "✅ 正常" : `⚠️ 發現 ${issues} 個問題`}</div><div class="detail-grid mt8">${Object.entries(state.schemaStatus).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("")}</div>`;
    wrap.innerHTML = statusHtml;
  }
  function renderOpsLogs() {
    const wrap = $("#opsLogsList");
    if (!wrap) return;
    if (!state.opsLogs.length) { wrap.innerHTML = '<div class="empty-state">暫無維運紀錄</div>'; return; }
    wrap.innerHTML = state.opsLogs.map(log => `<div class="focus-item">${escapeHtml(formatValue(log.created_at))} - ${escapeHtml(log.action)}</div>`).join("");
  }
  async function runRepairAction(actionName) {
    const actions = {
      due_at: { action: "adminRepairDueAt", msg: "修復所有 due_at 欄位？", reload: ["addons", "cards"] },
      addon_status: { action: "repairAddonOrderStatuses", msg: "修復加購單狀態？", reload: ["addons"] },
      data_validation: { action: "adminRepairDataValidation", msg: "執行資料驗證修復？", reload: ["cards", "agents"] },
      normalize_card_theme: { action: "adminNormalizeCardThemeFields", msg: "正規化卡片主題欄位？", reload: ["cards"] },
      audit_card_theme: { action: "adminAuditCardThemeFields", msg: "稽核卡片主題欄位？", reload: ["cards"] },
      install_system_triggers: { action: "installSystemTriggers", msg: "安裝系統觸發器？", reload: ["ops"] },
      install_commercial_triggers: { action: "installCommercialTriggers", msg: "安裝商業觸發器？", reload: ["ops"] }
    };
    const config = actions[actionName];
    if (!config) return toast("未知的修復動作");
    if (!confirm(config.msg)) return;
    if (!doubleConfirmId(actionName, "修復動作")) return;
    try {
      const result = await apiPost(config.action);
      const resultMsg = result?.message || result?.result || "執行完成";
      const resultDiv = $("#systemToolResult");
      if (resultDiv) resultDiv.innerHTML = `<div class="result-box">✅ ${resultMsg}<br><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></div>`;
      toast(`✅ 修復完成: ${resultMsg}`);
      if (config.reload.includes("addons")) await loadAddons();
      if (config.reload.includes("cards")) await loadCards();
      if (config.reload.includes("agents")) await loadAgents();
      if (config.reload.includes("ops")) await loadRecentOpsLogs();
      await checkSchemaStatus();
    } catch (err) { toast(`修復失敗：${err.message}`); const resultDiv = $("#systemToolResult"); if (resultDiv) resultDiv.innerHTML = `<div class="result-box empty-state">❌ 修復失敗: ${err.message}</div>`; }
  }
  async function runDailyOps() { if (!confirm("執行每日維運作業？")) return; if (!doubleConfirmId("daily_ops", "每日維運")) return; try { await apiPost("runDailyOps"); toast("✅ 每日維運執行完成"); await Promise.allSettled([loadCards(), loadAddons(), loadRenewalList(), loadRecentOpsLogs()]); } catch (err) { toast(`執行失敗：${err.message}`); } }

  // ─────────────────────────────────────────────
  //  DELIVERY CONTROL
  // ─────────────────────────────────────────────
  function buildWalletModeMeta(card) {
    const dg = card?.delivery_guidance || {};
    const nested = card?.agent || card?.agent_info || {};
    const pointsLifetime = Number(nested?.points_lifetime ?? dg?.points_lifetime ?? card?.points_lifetime ?? 0);
    const referralLink = card?.referral_link || nested?.referral_link || "";
    const referralCount = card?.referral_count ?? nested?.referral_count ?? 0;
    const convertedCount = card?.converted_count ?? nested?.converted_count ?? 0;
    const commissionMonthly = card?.commission_monthly ?? nested?.commission_monthly ?? 0;
    const commissionTotal = card?.total_commission ?? nested?.total_commission ?? 0;
    const upgradeHint = card?.upgrade_hint || "";
    const pointsRule = card?.points_rule || "每筆付款可獲得對應點數";
    const commissionRule = card?.commission_rule || "推薦分潤 10%";
    const upgradeRule = card?.upgrade_rule || "累積 100 點即可升級 referral";
    const remainingPointsToNextTier = card?.remaining_points_to_next_tier ?? 0;
    return {
      wallet_mode: textOf(nested?.wallet_mode || card?.wallet_mode),
      agent_type: textOf(nested?.agent_type || card?.agent_type),
      member_tier: textOf(dg?.member_tier || nested?.member_tier),
      points_lifetime: pointsLifetime,
      referral_link: referralLink,
      referral_count: referralCount,
      converted_count: convertedCount,
      commission_monthly: commissionMonthly,
      commission_total: commissionTotal,
      upgrade_hint: upgradeHint,
      points_rule: pointsRule,
      commission_rule: commissionRule,
      upgrade_rule: upgradeRule,
      remaining_points_to_next_tier: remainingPointsToNextTier
    };
  }
  function resolveWalletModeFromMeta(wallet) {
    const backendMode = textOf(wallet?.wallet_mode).toLowerCase();
    if (["trial", "referral", "partner"].includes(backendMode)) return backendMode;
    const agentType = textOf(wallet?.agent_type).toLowerCase();
    if (agentType === "partner") return "partner";
    if (agentType === "referral") return "referral";
    const tier = textOf(wallet?.member_tier).toLowerCase();
    if (tier === "partner") return "partner";
    if (tier === "referral" || tier === "silver") return "referral";
    if (Number(wallet?.points_lifetime ?? 0) >= 5) return "referral";
    return "trial";
  }
  function buildTrialShareText(card) { const id = textOf(card.id || card.card_id); return `🎉 體驗 HSC 智慧名片！點擊連結搶先試用：${buildPreviewLink(id)}`; }
  function buildReferralEntryText(card, meta) { const id = textOf(card.id || card.card_id); const link = meta.referral_link || buildPreviewLink(id); return `🔗 您的專屬推薦入口：${link}\n每推薦一位好友成功付款，可獲得 ${meta.commission_rule || "10%"} 分潤。`; }
  function buildDeliveryUpdateEntryText(card) { const id = textOf(card.id || card.card_id); return `✏️ 更新您的名片資料：${buildUpdateLink(id)}`; }
  function buildDeliveryRenewalEntryText(card) { const id = textOf(card.id || card.card_id); return `🔄 續約您的名片服務：${buildRenewalLink(id)}`; }
  function detectDeliveryWarnings(card, meta) {
    const warnings = [];
    if (isPaid(card) && textOf(card.status).toLowerCase() !== "active") warnings.push("⚠️ 已付款但未啟用");
    if ((meta.wallet_mode === "referral" || meta.wallet_mode === "partner") && !meta.referral_link) warnings.push("⚠️ 推薦/夥伴模式但缺 referral_link");
    if (meta.wallet_mode === "partner" && (meta.commission_total === 0 && meta.commission_monthly === 0)) warnings.push("⚠️ 夥伴模式但收益資料為 0");
    if (meta.wallet_mode !== "trial" && !card.agent_id) warnings.push("⚠️ 非 trial 模式但缺 agent_id");
    if (!card.expires_at) warnings.push("⚠️ expires_at 缺失");
    const updateLink = buildUpdateLink(textOf(card.id || card.card_id));
    const renewalLink = buildRenewalLink(textOf(card.id || card.card_id));
    if (!updateLink) warnings.push("⚠️ update_link 缺失");
    if (!renewalLink) warnings.push("⚠️ renewal_link 缺失");
    return warnings;
  }
  function renderWalletObserver(meta) {
    const wrap = $("#walletObserver");
    if (!wrap) return;
    wrap.innerHTML = `<div class="detail-grid">${renderDetailItem("wallet_mode", meta.wallet_mode)}${renderDetailItem("points_lifetime", meta.points_lifetime)}${renderDetailItem("referral_count", meta.referral_count)}${renderDetailItem("converted_count", meta.converted_count)}${renderDetailItem("commission_monthly", meta.commission_monthly)}${renderDetailItem("commission_total", meta.commission_total)}${renderDetailItem("remaining_points_to_next_tier", meta.remaining_points_to_next_tier)}${renderDetailItem("upgrade_hint", meta.upgrade_hint)}${renderDetailItem("points_rule", meta.points_rule)}${renderDetailItem("commission_rule", meta.commission_rule)}${renderDetailItem("upgrade_rule", meta.upgrade_rule)}</div>`;
  }
  async function renderServiceLogObserver(card, meta) {
    const wrap = $("#serviceLogObserver");
    if (!wrap) return;
    try {
      const logsData = await apiGet("getServiceLogs", { card_id: textOf(card.id || card.card_id), limit: 5 });
      const logs = normalizeList(logsData, ["logs", "data"]);
      if (logs.length) { wrap.innerHTML = `<div class="focus-list">${logs.map(log => `<div class="focus-item">${escapeHtml(formatValue(log.created_at))} - ${escapeHtml(log.action)} (${escapeHtml(log.note || "")})</div>`).join("")}</div>`; }
      else { wrap.innerHTML = '<div class="empty-state">尚無服務紀錄</div>'; }
    } catch (err) { wrap.innerHTML = '<div class="empty-state">無法載入服務紀錄</div>'; }
  }
  function syncDeliveryControlPanel(card) {
    if (!card) return;
    const id = textOf(card.id || card.card_id);
    const meta = buildWalletModeMeta(card);
    const mode = resolveWalletModeFromMeta(meta);
    const toolboxCardLink = $("#toolboxCardLink"); if (toolboxCardLink) toolboxCardLink.textContent = buildCardUrlForToolbox(id);
    const toolboxPosterLink = $("#toolboxPosterLink"); if (toolboxPosterLink) toolboxPosterLink.textContent = buildDeliveryLink(id);
    const toolboxReferralLink = $("#toolboxReferralLink"); if (toolboxReferralLink) toolboxReferralLink.textContent = meta.referral_link || buildPreviewLink(id);
    const toolboxUpdateLink = $("#toolboxUpdateLink"); if (toolboxUpdateLink) toolboxUpdateLink.textContent = buildUpdateLink(id);
    const toolboxRenewalLink = $("#toolboxRenewalLink"); if (toolboxRenewalLink) toolboxRenewalLink.textContent = buildRenewalLink(id);
    const toolboxPosterUrl = $("#toolboxPosterUrl"); if (toolboxPosterUrl) toolboxPosterUrl.textContent = `${CONFIG.HUB_URL}poster.html?id=${encodeURIComponent(id)}`;
    const trialShareText = $("#trialShareText"); if (trialShareText) trialShareText.value = buildTrialShareText(card);
    const referralEntryText = $("#referralEntryText"); if (referralEntryText) referralEntryText.value = buildReferralEntryText(card, meta);
    const updateEntryText = $("#updateEntryText"); if (updateEntryText) updateEntryText.value = buildDeliveryUpdateEntryText(card);
    const renewalEntryText = $("#renewalEntryText"); if (renewalEntryText) renewalEntryText.value = buildDeliveryRenewalEntryText(card);
    const walletModeSimulator = $("#walletModeSimulator"); if (walletModeSimulator) walletModeSimulator.innerHTML = `<div class="detail-item"><div class="detail-key">判定模式</div><div class="detail-value"><span class="wallet-mode-badge wallet-mode-${mode}">${mode.toUpperCase()}</span></div></div>`;
    renderWalletObserver(meta);
    renderServiceLogObserver(card, meta);
    const warnings = detectDeliveryWarnings(card, meta);
    const warningsDiv = $("#deliveryWarnings");
    if (warningsDiv) {
      if (warnings.length) warningsDiv.innerHTML = `<div class="focus-list">${warnings.map(w => `<div class="focus-item delivery-warning">${escapeHtml(w)}</div>`).join("")}</div>`;
      else warningsDiv.innerHTML = '<div class="empty-state">✅ 無異常</div>';
    }
  }

  function renderCardDetail(card) {
    const wrap = $("#cardDetailWrap");
    if (!wrap) return;
    if (!card || !Object.keys(card).length) { wrap.className = "detail-stack empty-state"; wrap.textContent = "查無卡片詳情"; return; }
    const id = textOf(card.id || card.card_id);
    const previewLink = buildPreviewLink(id);
    const deliveryLink = buildDeliveryLink(id);
    const canDelivery = isPaid(card);
    wrap.className = "detail-stack";
    wrap.innerHTML = `<div class="detail-section"><div class="detail-title">卡片基本資料</div><div class="detail-grid">${renderDetailItem("card_id", id)}${renderDetailItem("name", textOf(card.name || card.owner_name))}${renderDetailItem("phone", textOf(card.phone))}${renderDetailItem("email", textOf(card.email))}${renderDetailItem("plan", planText(card.plan))}${renderDetailItem("status", textOf(card.status))}${renderDetailItem("billing_status", billingStatusText(card.billing_status))}${renderDetailItem("expires_at", formatValue(card.expires_at))}${renderDetailItem("service_agent", textOf(card.service_agent))}${renderDetailItem("referrer", textOf(card.referrer))}</div></div><div class="detail-section"><div class="detail-title">流程總控</div><div class="detail-grid">${renderDetailItem("成品預覽", previewLink)}${renderDetailItem("交付卡", canDelivery ? deliveryLink : "尚未付款，不可交付")}${renderDetailItem("續約狀態", getRenewalStateText(card))}</div></div>`;
    const previewBox = $("#previewLinkBox"); if (previewBox) previewBox.value = previewLink;
    const deliveryBox = $("#deliveryLinkBox"); if (deliveryBox) deliveryBox.value = canDelivery ? deliveryLink : "";
    syncCurrentCardBox(card);
    syncDeliveryControlPanel(card);
  }

  // ─────────────────────────────────────────────
  //  BIND EVENTS
  // ─────────────────────────────────────────────
  function bindEvents() {
    $$(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        if (!targetId) return;
        $$(".nav-btn").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        $$(".section").forEach(section => section.style.display = "none");
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
          targetSection.style.display = "block";
          targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    on("#btnRefreshAll", "click", refreshAll);
    on("#btnOpenHub", "click", () => window.open(CONFIG.HUB_URL, "_blank"));
    on("#btnOpenForm", "click", () => window.open(CONFIG.FORM_URL, "_blank"));
    on("#btnSaveKey", "click", () => { const key = valueOf("#adminKeyInput"); if (!key) return toast("請輸入 Key"); saveAdminKey(key); const inputEl = $("#adminKeyInput"); if (inputEl) inputEl.value = ""; renderKeyStatus(); refreshAll(); });
    on("#btnClearKey", "click", () => { clearAdminKey(); renderKeyStatus(); });
    on("#btnRefreshPayments", "click", loadPaymentList);
    on("#btnLoadPendingOffline", "click", () => { toast("功能開發中"); });
    on("#btnBuildPaymentNotice", "click", () => buildPaymentNoticeTexts("payment"));
    on("#btnBuildPaidNotice", "click", () => buildPaymentNoticeTexts("paid"));
    on("#btnBuildDeliveryNotice", "click", () => buildPaymentNoticeTexts("delivery"));
    $$(".recognition-tab").forEach(tab => tab.addEventListener("click", () => { $$(".recognition-tab").forEach(t => t.classList.remove("active")); tab.classList.add("active"); state.currentRecognitionType = tab.dataset.type; loadRecognitionQueues(); }));
    on("#btnRefreshRenewalList", "click", loadRenewalList);
    on("#btnConfirmRenewalPaid", "click", confirmRenewalPaid);
    on("#btnTriggerPaymentReminder", "click", triggerPaymentReminder);
    on("#btnCopyRenewalText", "click", () => copyFromField("#renewalTextBox", "已複製續約提醒文案"));
    on("#btnCopyRenewalDeliveryText", "click", () => copyFromField("#renewalTextBox", "已複製續約交付文案"));
    on("#btnSearchAddons", "click", renderAddons);
    on("#btnReloadAddons", "click", async () => { const searchEl = $("#addonSearch"); if (searchEl) searchEl.value = ""; await loadAddons(); });
    on("#btnLoadAddonDetail", "click", () => loadAddonDetail(valueOf("#addonDetailId")));
    on("#btnSubmitCreateAddon", "click", createAddonOrder);
    on("#btnRepairAddonStatus", "click", repairAddonStatuses);
    on("#btnBackfillDueAt", "click", () => backfillAddonDueAt(prompt("輸入 addon_order_id：")));
    on("#btnCopyAddonReminder", "click", () => copyFromField("#addonPaymentReminderText", "已複製加購提醒文案"));
    on("#btnSearchCards", "click", renderCards);
    on("#btnReloadCards", "click", async () => { const searchEl = $("#cardSearch"); if (searchEl) searchEl.value = ""; await loadCards(); });
    on("#btnLoadCardDetail", "click", () => loadCardDetail(valueOf("#detailCardId")));
    on("#btnCopyPreviewLink", "click", () => copyFromField("#previewLinkBox", "已複製預覽連結"));
    on("#btnCopyDeliveryLink", "click", () => copyFromField("#deliveryLinkBox", "已複製交付連結"));
    on("#btnCopyCardLink", "click", () => { const el = $("#toolboxCardLink"); if (el) copyText(el.textContent, "已複製名片連結"); else toast("找不到元素"); });
    on("#btnCopyPosterLink", "click", () => { const el = $("#toolboxPosterLink"); if (el) copyText(el.textContent, "已複製交付卡連結"); else toast("找不到元素"); });
    on("#btnCopyReferralToolLink", "click", () => { const el = $("#toolboxReferralLink"); if (el) copyText(el.textContent, "已複製推薦入口連結"); else toast("找不到元素"); });
    on("#btnCopyUpdateToolLink", "click", () => { const el = $("#toolboxUpdateLink"); if (el) copyText(el.textContent, "已複製更新入口連結"); else toast("找不到元素"); });
    on("#btnCopyRenewalToolLink", "click", () => { const el = $("#toolboxRenewalLink"); if (el) copyText(el.textContent, "已複製續用入口連結"); else toast("找不到元素"); });
    on("#btnCopyPosterUrlLink", "click", () => { const el = $("#toolboxPosterUrl"); if (el) copyText(el.textContent, "已複製海報圖片連結"); else toast("找不到元素"); });
    on("#btnCopyTrialShareText", "click", () => copyFromField("#trialShareText", "已複製 Trial 分享文案"));
    on("#btnCopyReferralEntryText", "click", () => copyFromField("#referralEntryText", "已複製專屬入口文案"));
    on("#btnCopyUpdateEntryText", "click", () => copyFromField("#updateEntryText", "已複製更新入口文案"));
    on("#btnCopyRenewalEntryText", "click", () => copyFromField("#renewalEntryText", "已複製續用入口文案"));
    on("#btnSearchAgents", "click", renderAgents);
    on("#btnReloadAgents", "click", async () => { const searchEl = $("#agentSearch"); if (searchEl) searchEl.value = ""; await loadAgents(); });
    on("#btnLoadAgentDetail", "click", () => loadAgentDetail(valueOf("#detailAgentId")));
    on("#btnUpdateAgent", "click", updateAgent);
    on("#btnFreezeAgent", "click", freezeAgent);
    on("#btnUnfreezeAgent", "click", unfreezeAgent);
    on("#btnSetAgentUpgrade", "click", setAgentUpgrade);
    on("#btnNormalizeMemberTier", "click", normalizeMemberTier);
    on("#btnNormalizeTypeAndTier", "click", normalizeTypeAndTier);
    on("#btnRepairAgentTypeEnum", "click", repairAgentTypeEnum);
    on("#btnRepairMissingAgents", "click", repairMissingAgents);
    on("#btnNormalizeAgentType", "click", normalizeTypeAndTier);
    on("#btnAddPoints", "click", () => adjustPoints("add"));
    on("#btnSubtractPoints", "click", () => adjustPoints("subtract"));
    on("#btnAdjustCommission", "click", adjustCommission);
    on("#btnLoadLogs", "click", reloadLogsForCurrentAgent);
    on("#btnLoadCommissions", "click", loadCommissionList);
    on("#btnLoadPendingCommissions", "click", loadPendingCommissions);
    on("#btnRefreshAnnouncements", "click", loadAnnouncements);
    on("#btnCreateAnnouncement", "click", showAnnouncementForm);
    on("#btnSaveAnnouncement", "click", saveAnnouncement);
    on("#btnCancelAnnouncement", "click", hideAnnouncementForm);
    on("#btnRefreshTracking", "click", loadTrackingSummary);
    on("#btnGetCardTracking", "click", getCardTrackingStats);
    on("#btnGetAgentTracking", "click", getAgentTrackingStats);
    on("#btnCheckSchema", "click", checkSchemaStatus);
    on("#btnRepairDueAt", "click", () => runRepairAction("due_at"));
    on("#btnRepairAddonStatusTool", "click", () => runRepairAction("addon_status"));
    on("#btnRepairDataValidation", "click", () => runRepairAction("data_validation"));
    on("#btnNormalizeCardTheme", "click", () => runRepairAction("normalize_card_theme"));
    on("#btnAuditCardTheme", "click", () => runRepairAction("audit_card_theme"));
    on("#btnInstallSystemTriggers", "click", () => runRepairAction("install_system_triggers"));
    on("#btnInstallCommercialTriggers", "click", () => runRepairAction("install_commercial_triggers"));
    on("#btnRunDailyOps", "click", runDailyOps);
    on("#btnRefreshOpsLogs", "click", loadRecentOpsLogs);
    
    // ======================== 修正後的按鈕事件綁定 ========================
    // 原本: on("#btnAssignInviteToRequest", "click", assignInviteToRequestAligned);
    // 修正為包裝箭頭函式以確保傳入 event 物件
    on("#btnAssignInviteToRequest", "click", (e) => assignInviteToRequestAligned(e));
    
    on("#btnRefreshRequests", "click", loadRequests);
    on("#btnCopyInviteCode", "click", () => {
      const request = state.currentSelectedRequestForInvite;
      if (request && request.assigned_invite_code) copyText(request.assigned_invite_code, "已複製邀請碼");
      else toast("請先選取已派發的申請單");
    });
   on("#btnCopyInviteUrl", "click", () => {
  const request = state.currentSelectedRequestForInvite;
  if (request && request.assigned_invite_code) {
    copyText(
      buildInviteFormUrl(request.assigned_invite_code, request.form_url),
      "已複製申請連結"
    );
  } else {
    toast("請先選取已派發的申請單");
  }
});
    on("#btnCopyInviteText", "click", () => {
      const request = state.currentSelectedRequestForInvite;
      if (request && request.assigned_invite_code) copyText(buildInviteReplyText(request), "已複製客服文案");
      else toast("請先選取已派發的申請單");
    });

    if (!inviteGlobalBound) {
      document.addEventListener("click", function (e) {
        if (e.target.closest(".btn-copy-invite-code-global")) { copyInviteCodeHandler(); return; }
        if (e.target.closest(".btn-copy-invite-url-global")) { copyInviteUrlHandler(); return; }
        if (e.target.closest(".btn-copy-invite-text-global")) { copyInviteTextHandler(); return; }
      });
      inviteGlobalBound = true;
    }
  }

  // ─────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────
  function init() {
    bindEvents();
    bindRequestListEvents();
    renderKeyStatus();
    if (getAdminKey()) refreshAll();
    else toast("⚠️ 請先設定 Admin Key");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
