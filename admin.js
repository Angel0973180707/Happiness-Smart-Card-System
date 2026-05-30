(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v6.7.0-perf-optimized",
    KEY_PREFIX: "ANGEL2026",
   GAS_BASE_URL: "https://angel-namecard.letssyncus.com/gas-proxy/exec",
    HUB_URL: "https://angel-namecard.letssyncus.com/",
   FORM_URL: "https://angel-namecard.letssyncus.com/form.html",
    DEFAULT_RENEW_DAYS: 365,
    API_TIMEOUT_MS: 25000,
    API_RETRY: 1,
    BANK_NAME: "玉山銀行",
    BANK_CODE: "808",
    BANK_ACCOUNT: "0738968051590",
    BANK_HOLDER: "李秀芳",
    CONTACT_LINE: "@hsc_service",
    // ── 分頁設定 ──
    PAGE_SIZE: 50,
  };

  // ── KEY STORAGE ──
  const KEY_STORAGE = "hsc_admin_key";
  function getAdminKey() {
    const suffix = localStorage.getItem(KEY_STORAGE) || "";
    if (suffix.startsWith(CONFIG.KEY_PREFIX)) return suffix;
    return suffix ? CONFIG.KEY_PREFIX + suffix : "";
  }
  function saveAdminKey(key) {
    if (!key || !key.trim()) return false;
    const val = key.trim();
    const suffix = val.startsWith(CONFIG.KEY_PREFIX) ? val.slice(CONFIG.KEY_PREFIX.length) : val;
    localStorage.setItem(KEY_STORAGE, suffix);
    return true;
  }
  function clearAdminKey() { localStorage.removeItem(KEY_STORAGE); }
  function renderKeyStatus() {
    const el = $("#keyDot");
    if (!el) return;
    const key = getAdminKey();
    el.className = key ? "key-dot ok" : "key-dot warn";
  }

  // ── LEDGER STORAGE ──
  const LEDGER_KEY = "hsc_ledger_records";
  function getLedgerRecords() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); }
    catch { return []; }
  }
  function saveLedgerRecords(records) {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(records));
  }
  function addLedgerRecord(record) {
    const records = getLedgerRecords();
    if (record.payment_id) {
      const exists = records.find(r => r.payment_id === record.payment_id);
      if (exists) return;
    }
    records.unshift({ ...record, ledger_id: `L${Date.now()}`, created_at: new Date().toISOString() });
    saveLedgerRecords(records);
  }

  const state = {
    cards: [], payments: [], addons: [], agents: [],
    currentCard: null, currentAgent: null, currentAddon: null,
    paymentList: [], recognitionRenewalItems: [], recognitionAddonItems: [],
    renewalItems: [], commissionItems: [], announcementItems: [],
    trackingSummary: null, cardTrackingDetail: null, agentTrackingDetail: null,
    opsLogs: [], schemaStatus: null,
    deliveryCardMeta: {}, deliveryWalletMeta: {},
    currentRecognitionType: "renewal",
    currentPaymentDetail: null, currentRecognitionDetail: null, currentRenewalDetail: null,
    requests: [], requestFilter: '', currentRequest: null,
    currentRequestTrace: null, currentSelectedRequestForInvite: null,
    ledgerRecords: [],
    // ── 分頁狀態 ──
    _cardPage: 1,
    _paymentPage: 1,
  };

  window._hscState = state;

  function $(selector) { return document.querySelector(selector); }
  function $$(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function textOf(value) { return value == null ? "" : String(value).trim(); }
  function valueOf(selector) { const el = $(selector); return el ? textOf(el.value) : ""; }
  function formatValue(value) { return value === undefined || value === null || value === "" ? "-" : String(value); }
  function parseDate(value) { if (!value) return null; const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
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

  function patchListItem(list, idKey, idVal, patch) {
    if (!Array.isArray(list)) return;
    const idx = list.findIndex(r => String(r?.[idKey] || "").trim() === String(idVal || "").trim());
    if (idx >= 0) Object.assign(list[idx], patch);
  }

  function toast(message) {
    if (typeof window._hscToast === 'function') { window._hscToast(message); return; }
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.add("hidden"), 2200);
  }

  let _loadingCount = 0;
  let _loadingTimer = null;
  function setLoading(show) {
    _loadingCount = Math.max(0, _loadingCount + (show ? 1 : -1));
    const el = $("#loadingMask");
    if (!el) return;
    if (show) {
      clearTimeout(_loadingTimer);
      _loadingTimer = setTimeout(() => {
        if (_loadingCount > 0) el.classList.remove("hidden");
      }, 300);
    } else {
      if (_loadingCount <= 0) {
        clearTimeout(_loadingTimer);
        el.classList.add("hidden");
      }
    }
  }

  function setBtnLoading(btnEl, isLoading) {
    if (!btnEl) return;
    if (isLoading) { btnEl.dataset.originalText = btnEl.dataset.originalText || btnEl.textContent; btnEl.textContent = "處理中…"; btnEl.disabled = true; }
    else { btnEl.textContent = btnEl.dataset.originalText || btnEl.textContent; btnEl.disabled = false; delete btnEl.dataset.originalText; }
  }

  function on(selector, event, handler) {
    const el = $(selector);
    if (el) el.addEventListener(event, handler);
  }

  // ── DEBOUNCE（防止搜尋每字觸發 render）──
  function debounce(fn, delay = 220) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function doubleConfirmId(id, label = "ID") {
    const entered = prompt(`⚠️ 高風險操作：請輸入 ${label}「${id}」以確認\n（輸入錯誤或取消則中止）`);
    if (entered === null) return false;
    if (textOf(entered) !== textOf(id)) { toast("❌ 輸入不符，操作已取消"); return false; }
    return true;
  }

  function copyText(value, message = "已複製") {
    const val = String(value || "");
    if (!val) return alert("沒有可複製的內容");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(val).then(() => toast(message)).catch(() => fallbackCopy(val, message));
    } else fallbackCopy(val, message);
  }
  function fallbackCopy(value, message) {
    const ta = document.createElement("textarea");
    ta.value = value; ta.style.position = "fixed"; ta.style.top = "-9999px";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); toast(message); } catch { alert("複製失敗，請手動複製"); }
    finally { ta.remove(); }
  }

  // ── 付款倒數計算 ──
  function calcDeadline(card) {
    const due = card.due_at || card.payment_due_at;
    const createdAt = card.created_at;
    if (due) return new Date(due);
    if (createdAt) return new Date(new Date(createdAt).getTime() + 24 * 3600 * 1000);
    return null;
  }

  function renderCountdownBadge(card) {
    if (billingBadge(card.billing_status) === 'badge-ok') return '';
    const base = calcDeadline(card);
    if (!base || isNaN(base)) return '';
    const msLeft = base - new Date();
    if (msLeft < 0) return '<span class="badge badge-danger" style="margin-top:3px;">🔴 逾期未付</span>';
    const hLeft = Math.floor(msLeft / 3600000);
    const dLeft = Math.floor(hLeft / 24);
    const label = dLeft > 0 ? `⏰ 剩 ${dLeft} 天` : `⏰ 剩 ${hLeft} 時`;
    const cls = hLeft < 24 ? 'badge-danger' : hLeft < 72 ? 'badge-warn' : 'badge-info';
    return `<span class="badge ${cls}" style="margin-top:3px;">${escapeHtml(label)}</span>`;
  }

  function formatDeadlineStr(card) {
    const base = calcDeadline(card);
    if (!base || isNaN(base)) return '';
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    const hh = String(base.getHours()).padStart(2, '0');
    const mm = String(base.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}`;
  }

  // ── 文案產生器 ──
  function buildCardCreatedNotice(card) {
    const name = textOf(card.name || card.owner_name) || '您';
    const cardId = textOf(card.id || card.card_id);
    const amount = card.amount || card.plan_price || '請洽客服';
    const deadline = formatDeadlineStr(card);
    const previewUrl = `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}`;
    return `您好 ${name}，\n\n🎉 您的 HSC 智慧名片已建立完成！\n\n請依照以下步驟完成付款，名片即可正式啟用：\n\n━━━━━━━━━━━━━━━━━\n💳【付款資訊】\n銀行：${CONFIG.BANK_NAME}（${CONFIG.BANK_CODE}）\n帳號：${CONFIG.BANK_ACCOUNT}\n戶名：${CONFIG.BANK_HOLDER}\n金額：NT$ ${amount}\n━━━━━━━━━━━━━━━━━\n\n📋【付款注意事項】\n・付款完成後請回傳您的匯款帳號末 5 碼供對帳\n・付款截止時間：${deadline || '請盡快完成'}\n・確認後 1 個工作天內啟用\n・啟用後將發送交付卡連結給您\n\n🔗 名片預覽：\n${previewUrl}\n\n📩 如有任何問題，請透過 LINE 官方帳號聯繫：\n${CONFIG.CONTACT_LINE}\n\n感謝您的支持！`;
  }

  function buildPaymentReminderNotice(card) {
    const name = textOf(card.name || card.owner_name) || '您';
    const cardId = textOf(card.id || card.card_id);
    const amount = card.amount || card.plan_price || '請洽客服';
    const deadline = formatDeadlineStr(card);
    const base = calcDeadline(card);
    let urgencyPrefix = '';
    if (base) {
      const hLeft = Math.floor((base - new Date()) / 3600000);
      if (hLeft < 0) urgencyPrefix = '⚠️ 您的付款已逾期，';
      else if (hLeft < 24) urgencyPrefix = `🔴 付款截止時間剩不到 ${hLeft} 小時，`;
    }
    return `您好 ${name}，\n\n${urgencyPrefix}提醒您完成 HSC 智慧名片付款以正式啟用服務。\n\n━━━━━━━━━━━━━━━━━\n💳【付款資訊】\n銀行：${CONFIG.BANK_NAME}（${CONFIG.BANK_CODE}）\n帳號：${CONFIG.BANK_ACCOUNT}\n戶名：${CONFIG.BANK_HOLDER}\n金額：NT$ ${amount}\n━━━━━━━━━━━━━━━━━\n\n⏰ 付款截止：${deadline || '請盡快完成'}\n\n📋【注意事項】\n・付款完成後請回傳您的匯款帳號末 5 碼供對帳\n・確認後 1 個工作天內啟用\n・如需延期請提前告知\n\n📩 聯繫客服：${CONFIG.CONTACT_LINE}`;
  }

  function buildPaymentConfirmedNotice(card, paymentAmount) {
    const name = textOf(card.name || card.owner_name) || '您';
    const cardId = textOf(card.id || card.card_id);
    const amount = paymentAmount || card.amount || card.plan_price || '—';
    const expiresAt = card.expires_at || '—';
    const renewUrl = `${CONFIG.HUB_URL}renew.html?id=${encodeURIComponent(cardId)}`;
    return `您好 ${name}，\n\n✅ 已確認收到您的付款，感謝您！\n\n━━━━━━━━━━━━━━━━━\n💰【付款確認明細】\n收款金額：NT$ ${amount}\n服務使用期限：${expiresAt} 到期\n━━━━━━━━━━━━━━━━━\n\n📋【續約說明】\n・本服務為年費方案，到期前 30 天將通知續約\n・續約連結：${renewUrl}\n・如有問題請透過 LINE 聯繫\n\n📩 客服 LINE：${CONFIG.CONTACT_LINE}\n\n感謝您的支持，啟用通知請稍候，我們將儘快完成交付！`;
  }

 function buildDeliveryNotice(card) {
    const name        = textOf(card.name || card.owner_name) || '您';
    const cardId      = textOf(card.id || card.card_id);
    const cardUrl     = `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`;
    const deliveryUrl = `${CONFIG.HUB_URL}poster.html?id=${encodeURIComponent(cardId)}`;
    const hubUrl      = CONFIG.HUB_URL;
    const expiresAt   = card.expires_at || '—';
    return `✅ 付款確認完成,感謝 ${name} 的信任 ❤️\n\n服務使用期限:${expiresAt} 到期\n\n━━━━━━━━━━━━━━━━━\n🔐【您的專屬交付卡】\n${deliveryUrl}\n\n⚠️ 這是個人管理入口,請勿轉傳\n建議加到手機桌面,隨時使用 📱\n\n打開可以:\n✏️ 更新名片 / 🔄 辦理續約 / 📊 查推薦點數\n━━━━━━━━━━━━━━━━━\n\n💡 想讓朋友認識您?請用下面三種 👇\n\n📇 我的智慧名片(主要分享連結)\n${cardUrl}\n→ 放 LINE 簡介、IG、簽名檔、群組\n\n🖼️ 名片海報\n打開交付卡 → 點「下載海報」→ 存圖分享\n\n🏛️ 智慧名片館(推薦服務用)\n${hubUrl}\n\n━━━━━━━━━━━━━━━━━\n有問題隨時聯繫:${CONFIG.CONTACT_LINE}\n感謝您使用 HSC 智慧名片服務!`;
  }

  // ── INVITE HELPERS ──
  function buildInviteFormUrl(inviteCode, backendFormUrl = "", referrer = "") {
    // 後端給的 URL 優先用(v7.16 後端已自動帶 ref)
    const directUrl = String(backendFormUrl || "").trim();
    if (directUrl) return directUrl;
    const code = String(inviteCode || "").trim();
    if (!code) return "";
    // 前端 fallback:如果有 referrer,帶上去
    const params = new URLSearchParams();
    params.set("invite", code);
    const ref = String(referrer || "").trim();
    if (ref) params.set("ref", ref);
    return `${CONFIG.FORM_URL}?${params.toString()}`;
  }
function buildInviteReplyText(request) {
    const code = String(request?.assigned_invite_code || "").trim();
    const requestId = String(request?.request_id || "").trim();
    const referrer = String(request?.ref || "").trim();
    const formUrl = buildInviteFormUrl(code, request?.form_url, referrer);
    if (!code) return "";
    return `✨ 天使幸福智慧名片 ✨\n\n您好，這是您的專屬申請入口 💛\n\n━━━━━━━━━━━━━━━━━\n📋 申請編號：${requestId}\n🎫 邀請碼：${code}\n━━━━━━━━━━━━━━━━━\n\n⭐⭐⭐ 請點擊下方連結開始填寫 ⭐⭐⭐\n\n👇👇👇\n\n${formUrl}\n\n👆👆👆\n\n━━━━━━━━━━━━━━━━━\n💡 填寫小提醒\n━━━━━━━━━━━━━━━━━\n✅ 建議用 LINE 開啟（自動綁定通知）\n✅ 如無 LINE 帳號 → 請聯繫業務員協助\n✅ 填寫約需 3-5 分鐘\n\n期待為您服務 ❤️`;
  }
  // ── API ──
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
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") url.searchParams.set(k, v);
    });
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
      return json && json.data != null ? json.data : json;
    } catch (err) {
      if (attempt < CONFIG.API_RETRY) { await new Promise(r => setTimeout(r, 600)); return _apiCall(method, url, body, action, attempt + 1); }
      toast(`❌ ${action}：${err.message || "系統錯誤"}`);
      throw err;
    } finally { setLoading(false); }
  }

  const WRITE_ACTIONS = new Set([
    "confirmPayment","markPaymentRefunded","approveRecognition","rejectRecognition",
    "adminMarkRenewalPaid","adminCancelAddonOrder","adminFreezeAgent","adminUnfreezeAgent",
    "markCommissionPaid","runDailyOps","adminCreateAddonOrder","adminMarkAddonPaid",
    "adminBackfillAddonDueAt","repairAddonOrderStatuses","triggerRenewalReminder",
    "triggerRenewalPaymentReminder","installSystemTriggers","installCommercialTriggers",
    "adminRepairDueAt","adminRepairDataValidation","adminNormalizeCardThemeFields",
    "adminAuditCardThemeFields","adminUpdateAgent","adminSetAgentUpgrade",
    "adminNormalizeAgentTypeAndTier","adminRepairAgentTypeEnum","adminNormalizeAgentMemberTier",
    "adminRepairMissingAgents","adminAdjustPoints","adminAdjustCommission",
    "adminSaveAnnouncement","adminToggleAnnouncement","adminUpdateAgentType",
    "assignInviteToRequest"
  ]);
  async function api(action, params = {}) { return WRITE_ACTIONS.has(action) ? apiPost(action, params) : apiGet(action, params); }

  // ── REQUEST API ──
  async function getRequests() { return apiGet("getRequests"); }
  async function assignInviteToRequest(requestId, inviteCode = null) {
    const payload = { request_id: requestId };
    if (inviteCode) payload.invite_code = inviteCode;
    return apiPost("assignInviteToRequest", payload);
  }
  async function getRequestTrace(requestId) { return apiGet("getRequestTrace", { request_id: requestId }); }

  // ── LINK BUILDERS ──
  function buildPreviewLink(cardId) { return `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`; }
  function buildDeliveryLink(cardId) { return `${CONFIG.HUB_URL}poster.html?id=${encodeURIComponent(cardId)}`; }
  function buildCardUrlForToolbox(cardId) { return `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}`; }
  function buildUpdateLink(cardId) { return `${CONFIG.HUB_URL}update.html?id=${encodeURIComponent(cardId)}`; }
  function buildRenewalLink(cardId) { return `${CONFIG.HUB_URL}renew.html?id=${encodeURIComponent(cardId)}`; }

  // ── CARD HELPERS ──
  function isPaid(card) {
    const cardId = textOf(card.id || card.card_id);
    if (textOf(card.billing_status).toLowerCase() === "paid") return true;
    return state.payments.some(p => textOf(p.card_id) === cardId && textOf(p.status).toLowerCase() === "paid");
  }
  function isExpired(card) { const d = parseDate(card.expires_at); return !!(d && d < new Date()); }
  function isExpiringSoon(card, days) {
    const d = parseDate(card.expires_at);
    if (!d) return false;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return d >= now && d <= end;
  }
  function needsRenewal(card) { return isExpired(card) || isExpiringSoon(card, 30); }
  function getRenewalStateText(card) {
    if (isExpired(card)) return "已到期";
    if (isExpiringSoon(card, 30)) return "30天內到期";
    return "正常";
  }
  function billingStatusText(value) {
    const v = textOf(value).toLowerCase();
    if (v === "paid") return "已付款"; if (v === "unpaid") return "未付款"; if (v === "locked") return "已鎖卡";
    return value ? String(value) : "-";
  }
  function billingBadge(v) {
    const s = String(v || '').toLowerCase();
    if (s === 'paid') return 'badge-ok';
    if (s === 'unpaid') return 'badge-warn';
    if (s === 'locked') return 'badge-danger';
    return 'badge-neutral';
  }
  function planText(value) {
    const v = textOf(value).toLowerCase();
    if (v === "free" || v === "plan_free") return "自由配款";
    if (v === "premium" || v === "plan_premium") return "精品設計款";
    return value ? String(value) : "-";
  }

  // ── INVITE UI HELPERS ──
  window.copyInviteCodeByRequest = function(requestId) {
    const r = state.requests.find(x => x.request_id === requestId);
    if (!r || !r.assigned_invite_code) return toast("尚未派發");
    copyText(r.assigned_invite_code, "已複製邀請碼");
  };
  window.copyInviteUrlByRequest = function(requestId) {
    const r = state.requests.find(x => x.request_id === requestId);
    if (!r || !r.assigned_invite_code) return toast("尚未派發");
    copyText(buildInviteFormUrl(r.assigned_invite_code, r.form_url, r.ref), "已複製申請連結");
  };
  window.copyInviteReplyByRequest = function(requestId) {
    const r = state.requests.find(x => x.request_id === requestId);
    if (!r || !r.assigned_invite_code) return toast("尚未派發");
    copyText(buildInviteReplyText(r), "已複製客服文案");
  };
  window.reassignInvite = async function(requestId) {
    if (!confirm("重新派發會產生新邀請碼，舊碼將失效，確定？")) return;
    if (!doubleConfirmId(requestId, "申請單")) return;
    try {
      await apiPost("assignInviteToRequest", { request_id: requestId, force: true });
      toast("✅ 已重新派發");
      await loadRequests();
    } catch (e) { toast("重新派發失敗：" + e.message); }
  };
  window.fillRequestToAssignForm = function(requestId) {
    const request = state.requests.find(r => textOf(r.request_id) === textOf(requestId));
    if (!request) { toast("找不到該申請單"); return; }
    if (textOf(request.status).toLowerCase() !== "pending") { toast("只有 pending 狀態可以派碼"); return; }
    state.currentRequest = request;
    const reqInput = $("#requestIdForAssign");
    if (reqInput) reqInput.value = textOf(request.request_id);
    const noteInput = $("#assignInviteNote");
    if (noteInput) noteInput.value = textOf(request.note);
  };
  window.handleRequestTrace = async function(requestId) {
    const request = state.requests.find(r => textOf(r.request_id) === textOf(requestId));
    if (!request) { toast("查無申請資料"); return; }
    if (typeof window.updateInviteSelectedPanel === 'function') window.updateInviteSelectedPanel(request);
    try { await loadRequestTrace(requestId); }
    catch (err) { renderFallbackTrace(request); toast("目前使用本地追蹤模式"); }
  };

  function renderFallbackTrace(request) {
    const wrap = $("#requestTraceWrap");
    if (!wrap) return;
    wrap.innerHTML = `<div class="result-box">${escapeHtml(JSON.stringify(request, null, 2))}</div>`;
  }

  // ── RENDER REQUESTS ──
  function renderRequests() {
    if (typeof window.renderRequestsNew === 'function') {
      window.renderRequestsNew(state.requests, state);
    }
    if (state.currentSelectedRequestForInvite) {
      const updated = state.requests.find(r => r.request_id === state.currentSelectedRequestForInvite.request_id);
      if (updated && typeof window.updateInviteSelectedPanel === 'function') window.updateInviteSelectedPanel(updated);
    }
  }

  // ══════════════════════════════════════════
  // ── CARDS LIST（分頁版）──
  // ══════════════════════════════════════════

  function renderCards() {
    state._cardPage = 1; // 搜尋時重設頁碼
    const keyword = valueOf("#cardSearch");
    if (typeof window.renderCardsNew === 'function') {
      window.renderCardsNew(state.cards, keyword);
    }
  }

  function renderDetailItem(key, value) {
    return `<div class="detail-item"><div class="detail-key">${escapeHtml(key)}</div><div class="detail-val">${escapeHtml(formatValue(value))}</div></div>`;
  }

  function renderCardDetail(card) {
    const wrap = $("#cardDetailWrap");
    if (!wrap) return;
    if (!card || !Object.keys(card).length) { wrap.innerHTML = '<div class="empty-state">查無卡片詳情</div>'; return; }
    const id = textOf(card.id || card.card_id);
    wrap.innerHTML = `
      <div class="detail-grid" style="margin-top:0;">
        ${renderDetailItem("卡片 ID", id)}
        ${renderDetailItem("姓名", card.name || card.owner_name)}
        ${renderDetailItem("電話", card.phone)}
        ${renderDetailItem("Email", card.email)}
        ${renderDetailItem("方案", planText(card.plan))}
        ${renderDetailItem("狀態", card.status)}
        ${renderDetailItem("帳務", billingStatusText(card.billing_status))}
        ${renderDetailItem("到期日", card.expires_at)}
        ${renderDetailItem("服務代理", card.service_agent)}
        ${renderDetailItem("推薦人", card.referrer)}
        ${renderDetailItem("續約狀態", getRenewalStateText(card))}
      </div>
      <div class="action-strip">
        <button class="btn btn-primary btn-sm" id="btnGoDeliveryFromDetail" data-cid="${escapeHtml(id)}">📦 前往交付</button>
        <button class="btn btn-soft btn-sm" id="btnOpenPreview" data-cid="${escapeHtml(id)}">預覽</button>
      </div>`;
    wrap.querySelector('#btnGoDeliveryFromDetail')?.addEventListener('click', e => {
      const cid = e.currentTarget.dataset.cid;
      const inp = $('#deliveryCardIdInput');
      if (inp) inp.value = cid;
      if (typeof window.activateAdminSection === 'function') window.activateAdminSection('deliverySection');
      loadCardDetail(cid);
      const dc = $('#deliveryContent'); if (dc) dc.style.display = 'block';
      const de = $('#deliveryEmpty'); if (de) de.style.display = 'none';
    });
    wrap.querySelector('#btnOpenPreview')?.addEventListener('click', e => {
      window.open(buildPreviewLink(e.currentTarget.dataset.cid), '_blank');
    });
    
  }

  // ── 分頁輔助：產生「載入更多」按鈕 HTML ──
  function renderLoadMoreBtn(containerId, remaining) {
    return `<div class="load-more-wrap" style="text-align:center;padding:12px 0;">
      <button class="btn btn-soft btn-sm" data-load-more="${containerId}">
        載入更多（還有 ${remaining} 筆）
      </button>
    </div>`;
  }

  // ── CARDS LIST（分頁版）──
  window.renderCardsNew = function(cards, keyword) {
    const container = $('#cardsListContainer');
    if (!container) return;
    const kw = (keyword || '').toLowerCase();
    const rows = cards.filter(c => {
      if (!kw) return true;
      return [c.id || c.card_id, c.name || c.owner_name, c.phone, c.email]
        .map(v => String(v || '')).join(' ').toLowerCase().includes(kw);
    });
    if (!rows.length) { container.innerHTML = '<div class="empty-state">查無卡片</div>'; return; }

    const pageSize = CONFIG.PAGE_SIZE;
    const page = state._cardPage || 1;
    const visible = rows.slice(0, page * pageSize);
    const remaining = rows.length - visible.length;

    const html = visible.map(c => buildCardRowHtml(c)).join('');
    container.innerHTML = html + (remaining > 0 ? renderLoadMoreBtn('cardsListContainer', remaining) : '');

   // 展開折疊
    container.querySelectorAll('.list-row-head[data-type="card"]').forEach(head => {
      head.addEventListener('click', () => {
        const row = document.getElementById(`crow-${head.dataset.row}`);
        if (row) row.classList.toggle('open');
      });
    });

    // ops_log 折疊（lazy load）
    container.querySelectorAll('.ops-log-head[data-ops-cid]').forEach(head => {
      head.addEventListener('click', e => {
        e.stopPropagation();
        const cid = head.dataset.opsCid;
        const body = document.getElementById(`ops-body-${cid}`);
        const chevron = head.querySelector('.ops-chevron');
        const listEl = document.getElementById(`ops-list-${cid}`);
        if (!body) return;
        const isOpen = body.style.display !== 'none';
        if (isOpen) {
          body.style.display = 'none';
          if (chevron) chevron.style.transform = '';
        } else {
          body.style.display = 'block';
          if (chevron) chevron.style.transform = 'rotate(90deg)';
          // 只在第一次展開時 lazy load
          if (listEl && listEl.dataset.loaded !== 'true') {
            listEl.dataset.loaded = 'true';
            loadOpsLogInline(cid, listEl);
          }
        }
      });
    });

    // 載入更多
    container.querySelector('[data-load-more="cardsListContainer"]')?.addEventListener('click', () => {
      state._cardPage = (state._cardPage || 1) + 1;
      window.renderCardsNew(cards, keyword);
    });

    // 動作按鈕（事件委派）
    container.addEventListener('click', handleCardsContainerClick);
  };

  function buildCardRowHtml(c) {
    const id = escapeHtml(String(c.id || c.card_id || ''));
    const name = escapeHtml(String(c.name || c.owner_name || '-'));
    const billing = billingStatusText(c.billing_status);
    const bClass = billingBadge(c.billing_status);
    const statusLabel = escapeHtml(String(c.status || '-'));
    const unpaid = bClass !== 'badge-ok';
    return `
      <div class="list-row" id="crow-${id}">
        <div class="list-row-head" data-row="${id}" data-type="card">
          <div class="list-row-icon icon-neutral">💳</div>
          <div class="list-row-info">
            <div class="list-row-title">${name}</div>
            <div class="list-row-sub">${id} · ${statusLabel}</div>
          </div>
          <div class="list-row-right">
            <span class="badge ${bClass}">${escapeHtml(billing)}</span>
            ${renderCountdownBadge(c)}
            <span style="font-size:11px;color:var(--ink3);margin-top:3px;">${escapeHtml(String(c.expires_at || ''))}</span>
          </div>
          <span class="chevron" style="margin-left:6px;">›</span>
        </div>
        <div class="list-row-body">
          <div class="detail-grid">
            ${renderDetailItem("卡片 ID", id)}
            ${renderDetailItem("電話", c.phone || '-')}
            ${renderDetailItem("方案", planText(c.plan))}
            ${renderDetailItem("到期日", c.expires_at || '-')}
          </div>
      ${unpaid ? `
            <button class="btn btn-ok btn-sm" data-action="copyCardCreated" data-cid="${id}">🎉 建卡通知</button>
            <button class="btn btn-warn btn-sm" data-action="copyPayNotice" data-cid="${id}">📋 催繳文案</button>
            <button class="btn btn-info btn-sm" data-action="copyPaymentInfo" data-cid="${id}">📤 補發付款資訊</button>
            ` : ''}
          <div class="ops-log-collapsible" style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">
            <div class="ops-log-head" data-ops-cid="${id}" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:6px 0;user-select:none;">
              <span style="font-size:12px;font-weight:800;color:var(--ink2);">📋 操作記錄</span>
              <span class="ops-chevron" style="font-size:14px;color:var(--ink3);transition:transform 0.2s;">›</span>
            </div>
            <div class="ops-log-body" id="ops-body-${id}" style="display:none;">
              <div class="ops-log-list" id="ops-list-${id}">
                <div class="empty-state" style="padding:10px;font-size:12px;">點擊載入記錄</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  // 用獨立函式避免 removeEventListener 問題（容器每次重建，不累積）
  function handleCardsContainerClick(e) {
    const detailBtn = e.target.closest('[data-action="cardDetail"]');
    if (detailBtn) { e.stopPropagation(); if (typeof window.loadCardDetail === 'function') window.loadCardDetail(detailBtn.dataset.cid); return; }
    const goBtn = e.target.closest('[data-action="goDelivery"]');
    if (goBtn) {
      e.stopPropagation();
      const cid = goBtn.dataset.cid;
      const inp = $('#deliveryCardIdInput'); if (inp) inp.value = cid;
      if (typeof window.activateAdminSection === 'function') window.activateAdminSection('deliverySection');
      if (typeof window.loadCardDetail === 'function') window.loadCardDetail(cid);
      const dc = $('#deliveryContent'); if (dc) dc.style.display = 'block';
      const de = $('#deliveryEmpty'); if (de) de.style.display = 'none';
      return;
    }
    const createdBtn = e.target.closest('[data-action="copyCardCreated"]');
    if (createdBtn) {
      e.stopPropagation();
      const cid = createdBtn.dataset.cid;
      const card = state.cards.find(c => String(c.id || c.card_id) === cid) || {};
      copyText(buildCardCreatedNotice(card), '✅ 已複製建卡通知文案');
      return;
    }
    const payBtn = e.target.closest('[data-action="copyPayNotice"]');
    if (payBtn) {
      e.stopPropagation();
      const cid = payBtn.dataset.cid;
      const card = state.cards.find(c => String(c.id || c.card_id) === cid) || {};
      copyText(buildPaymentReminderNotice(card), '✅ 已複製催繳文案');
      return;
    }
    const payInfoBtn = e.target.closest('[data-action="copyPaymentInfo"]');
    if (payInfoBtn) {
      e.stopPropagation();
      const cid = payInfoBtn.dataset.cid;
      const paymentUrl = `https://angel-namecard.letssyncus.com/payment.html?id=${encodeURIComponent(cid)}`;
      const text = `您好，以下是您的付款資訊：\n\n━━━━━━━━━━━━━━━━━\n💳【匯款資訊】\n銀行：玉山銀行（808）\n帳號：0738968051590\n戶名：李秀芳\n━━━━━━━━━━━━━━━━━\n\n完成匯款後，請點擊以下連結填寫末5碼：\n${paymentUrl}\n\n確認後 1 個工作天內啟用。`;
      copyText(text, '📤 已複製付款資訊文案');
      return;
    }
  }

  // ── DELIVERY PANEL ──
function syncDeliveryControlPanel(card) {
    if (!card) return;
    const id = textOf(card.id || card.card_id);
    const meta = buildWalletModeMeta(card);
    const mode = resolveWalletModeFromMeta(meta);
    const unpaid = !isPaid(card);

    const summaryEl = $('#deliveryCardSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `<div class="card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:900;font-size:16px;">${escapeHtml(textOf(card.name || card.owner_name) || '-')}</div>
          <span class="badge ${isPaid(card) ? 'badge-ok' : 'badge-warn'}">${isPaid(card) ? '已付款' : '未付款'}</span>
        </div>
        <div style="font-size:12px;color:var(--ink3);">${escapeHtml(id)} · ${escapeHtml(planText(card.plan))} · 到期 ${escapeHtml(formatValue(card.expires_at))}</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
          <span class="badge badge-info">${escapeHtml(mode.toUpperCase())}</span>
          ${renderCountdownBadge(card)}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          ${unpaid ? `
            <button class="btn btn-ok btn-sm" id="btnDeliveryCardCreated">🎉 建卡通知</button>
            <button class="btn btn-warn btn-sm" id="btnDeliveryPayReminder">📋 催繳文案</button>
          ` : `
            <button class="btn btn-primary btn-sm" id="btnDeliveryPayConfirmed">✅ 付款確認文案</button>
          `}
        </div>
        ${!unpaid ? `
          <div style="margin-top:12px;background:var(--primary-bg);border:1.5px solid var(--primary);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-weight:900;color:var(--primary);margin-bottom:8px;font-size:13px;">📦 補發交付卡</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
              <button class="btn btn-soft btn-sm" id="btnCopyDeliveryUrl" title="私人管理頁,不可分享">🔐 交付卡連結</button>
              <button class="btn btn-primary btn-sm" id="btnCopyCardPublicUrl" title="可分享給任何人">📇 名片連結</button>
              <button class="btn btn-ok btn-sm" id="btnDeliveryNotice">📋 完整文案</button>
            </div>
          </div>
        ` : ''}
      </div>`;

      summaryEl.querySelector('#btnDeliveryCardCreated')?.addEventListener('click', () => copyText(buildCardCreatedNotice(card), '✅ 已複製建卡通知文案'));
      summaryEl.querySelector('#btnDeliveryPayReminder')?.addEventListener('click', () => copyText(buildPaymentReminderNotice(card), '✅ 已複製催繳文案'));
      summaryEl.querySelector('#btnDeliveryPayConfirmed')?.addEventListener('click', () => copyText(buildPaymentConfirmedNotice(card, card.amount || card.plan_price), '✅ 已複製付款確認文案'));
      summaryEl.querySelector('#btnDeliveryNotice')?.addEventListener('click', () => copyText(buildDeliveryNotice(card), '✅ 已複製完整交付文案'));
      summaryEl.querySelector('#btnCopyDeliveryUrl')?.addEventListener('click', () => copyText(`${CONFIG.HUB_URL}poster.html?id=${encodeURIComponent(id)}`, '🔐 已複製交付卡連結(請勿外傳)'));
      summaryEl.querySelector('#btnCopyCardPublicUrl')?.addEventListener('click', () => copyText(buildPreviewLink(id), '📇 已複製智慧名片連結(可分享)'));
    }

    if (typeof window.renderDeliveryLinks === 'function') window.renderDeliveryLinks(id, meta.referral_link, card.line_user_id);
    if (typeof window.renderDeliveryCopyTexts === 'function') {
      const texts = [
        { label: 'Trial 分享文案', value: `🎉 體驗 HSC 智慧名片！點擊連結搶先試用：${buildPreviewLink(id)}` },
        { label: '推薦入口文案', value: `🔗 您的專屬推薦入口：${meta.referral_link || buildPreviewLink(id)}\n每推薦一位好友成功付款，可獲得分潤。` },
        { label: '更新入口文案', value: `✏️ 更新您的名片資料：${buildUpdateLink(id)}` },
        { label: '續約入口文案', value: `🔄 續約您的名片服務：${buildRenewalLink(id)}` },
      ];
      window.renderDeliveryCopyTexts(texts);
    }

    const walletWrap = $('#walletObserverWrap');
    if (walletWrap) {
      walletWrap.innerHTML = `<div class="detail-grid" style="margin-top:0;">
        ${renderDetailItem("模式", mode)}
        ${renderDetailItem("終身點數", meta.points_lifetime)}
        ${renderDetailItem("推薦數", meta.referral_count)}
        ${renderDetailItem("轉換數", meta.converted_count)}
        ${renderDetailItem("本月分潤", meta.commission_monthly)}
        ${renderDetailItem("總分潤", meta.commission_total)}
        ${renderDetailItem("升級提示", meta.upgrade_hint || '-')}
      </div>`;
    }

    const warnings = detectDeliveryWarnings(card, meta);
    const warningsWrap = $('#deliveryWarningsWrap');
    if (warningsWrap) {
      warningsWrap.innerHTML = warnings.length
        ? `<div class="section-label" style="margin-top:12px;">⚠️ 異常提示</div>` +
          warnings.map(w => `<div class="risk-item danger" style="margin-bottom:6px;">${escapeHtml(w)}</div>`).join('')
        : `<div class="risk-item ok" style="margin-top:12px;">✅ 無異常</div>`;
    }
  }

  // ── DASHBOARD ──
  function renderDashboard() {
    const unpaid = state.cards.filter(c => !isPaid(c)).length;
    const needDelivery = state.cards.filter(c => isPaid(c)).length;
    const needRenewal = state.cards.filter(c => needsRenewal(c) || isExpiringSoon(c, 30)).length;
    const addonPending = state.addons.filter(i => { const s = textOf(i.status).toLowerCase(); return s !== "paid" && s !== "cancelled"; }).length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPayments = state.paymentList.filter(p => textOf(p.paid_at || p.created_at || "").startsWith(todayStr)).length;

    safeSetText("#statUnpaid", unpaid);
    safeSetText("#statNeedDelivery", needDelivery);
    safeSetText("#statNeedRenewal", needRenewal);
    safeSetText("#statAddonPending", addonPending);
    safeSetText("#statTodayPayments", todayPayments);

    const tileUnpaid = $('#tileUnpaid');
    if (tileUnpaid) tileUnpaid.className = `stat-tile ${unpaid > 0 ? 'urgent' : 'ok'}`;
    const tileDelivery = $('#tileDelivery');
    if (tileDelivery) tileDelivery.className = `stat-tile ${needDelivery > 0 ? 'warn' : ''}`;

    renderDashboardRisks();
    renderDashboardOpsLogs();
  }

  function renderDashboardRisks() {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const risks = [];
    const overdueUnpaid = state.cards.filter(c => !isPaid(c) && parseDate(c.created_at) && parseDate(c.created_at) < threeDaysAgo);
    if (overdueUnpaid.length) risks.push({ level: "danger", text: `未付款超過 3 天：${overdueUnpaid.length} 張` });
    const paidNotDelivered = state.cards.filter(c => isPaid(c) && textOf(c.status).toLowerCase() !== "active");
    if (paidNotDelivered.length) risks.push({ level: "warn", text: `已付款未啟用：${paidNotDelivered.length} 張` });
    const expiringSoon = state.cards.filter(c => isExpiringSoon(c, 30) && !isExpired(c));
    if (expiringSoon.length) risks.push({ level: "info", text: `30 天內到期：${expiringSoon.length} 張` });
    const expired = state.cards.filter(c => isExpired(c));
    if (expired.length) risks.push({ level: "danger", text: `已到期：${expired.length} 張` });
    const addonPending = state.addons.filter(i => { const s = textOf(i.status).toLowerCase(); return s !== "paid" && s !== "cancelled"; }).length;
    if (addonPending) risks.push({ level: "warn", text: `加購單待處理：${addonPending} 筆` });

    const el = $("#dashRiskList");
    if (!el) return;
    el.innerHTML = risks.length === 0
      ? '<div class="risk-item ok">✅ 目前無高風險項目</div>'
      : risks.map(r => `<div class="risk-item ${r.level}">${escapeHtml(r.text)}</div>`).join('');
  }

  function renderDashboardOpsLogs() {
    const el = $('#dashRecentLogs');
    if (!el) return;
    if (!state.opsLogs.length) { el.innerHTML = '<div class="empty-state">暫無紀錄</div>'; return; }
    el.innerHTML = state.opsLogs.slice(0, 5).map(log =>
      `<div class="risk-item" style="border-left-color:var(--border);background:var(--surface2);color:var(--ink2);">
        <span style="color:var(--ink3);font-size:11px;">${escapeHtml(formatValue(log.created_at))}</span>
        <span style="margin-left:8px;">${escapeHtml(log.action)}</span>
      </div>`
    ).join('');
  }

  function safeSetText(selector, value) { const el = $(selector); if (el) el.textContent = value; }

  // ── PAYMENTS（分頁版）──
  function renderPayments() {
    state._paymentPage = 1;
    _renderPaymentsPage();
  }

  function _renderPaymentsPage() {
    const container = $('#paymentsListContainer');
    if (!container) return;
    if (!state.paymentList.length) { container.innerHTML = '<div class="empty-state">尚無付款資料</div>'; return; }

    const pageSize = CONFIG.PAGE_SIZE;
    const page = state._paymentPage || 1;
    const visible = state.paymentList.slice(0, page * pageSize);
    const remaining = state.paymentList.length - visible.length;

    container.innerHTML = visible.map(p => buildPaymentRowHtml(p)).join('')
      + (remaining > 0 ? renderLoadMoreBtn('paymentsListContainer', remaining) : '');

    container.querySelectorAll('.list-row-head[data-type="payment"]').forEach(head => {
      head.addEventListener('click', () => document.getElementById(`prow-${head.dataset.row}`)?.classList.toggle('open'));
    });
    container.querySelectorAll('.btn-pay-confirm').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); confirmPaymentFromUi(btn.dataset.pid); }));
    container.querySelectorAll('.btn-pay-copy-confirm').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const cid = btn.dataset.cid;
        const p = state.paymentList.find(x => String(x.payment_id || x.id) === btn.dataset.pid) || {};
        const card = state.cards.find(c => String(c.id || c.card_id) === cid) || { id: cid, card_id: cid };
        copyText(buildPaymentConfirmedNotice(card, p.amount), '✅ 已複製付款確認文案');
      }));
    container.querySelectorAll('.btn-pay-refund').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); markPaymentRefundedFromUi(btn.dataset.pid); }));

    container.querySelector('[data-load-more="paymentsListContainer"]')?.addEventListener('click', () => {
      state._paymentPage = (state._paymentPage || 1) + 1;
      _renderPaymentsPage();
    });
  }

  function buildPaymentRowHtml(p) {
    const pid = escapeHtml(textOf(p.payment_id || p.id));
    const status = textOf(p.status).toLowerCase();
    const badgeClass = status === 'paid' ? 'badge-ok' : 'badge-warn';
    return `
      <div class="list-row" id="prow-${pid}">
        <div class="list-row-head" data-row="${pid}" data-type="payment">
          <div class="list-row-icon ${status === 'paid' ? 'icon-done' : 'icon-pending'}">💰</div>
          <div class="list-row-info">
            <div class="list-row-title">${escapeHtml(textOf(p.card_id))} · ${escapeHtml(textOf(p.event_type))}</div>
            <div class="list-row-sub">${pid} · $${escapeHtml(formatValue(p.amount))}</div>
          </div>
          <div class="list-row-right">
            <span class="badge ${badgeClass}">${escapeHtml(textOf(p.status) || 'pending')}</span>
          </div>
          <span class="chevron" style="margin-left:6px;">›</span>
        </div>
        <div class="list-row-body">
          <div class="detail-grid" style="margin-top:0;">
            ${renderDetailItem("付款ID", p.payment_id || p.id)}
            ${renderDetailItem("卡片ID", p.card_id)}
            ${renderDetailItem("金額", p.amount)}
            ${renderDetailItem("應付日", p.due_at)}
            ${renderDetailItem("付款日", p.paid_at)}
            ${renderDetailItem("事件類型", p.event_type)}
          </div>
          <div class="action-strip">
            ${status !== 'paid' ? `<button class="btn btn-primary btn-sm btn-pay-confirm" data-pid="${pid}">確認付款</button>` : ''}
            ${status === 'paid' ? `<button class="btn btn-ok btn-sm btn-pay-copy-confirm" data-pid="${pid}" data-cid="${escapeHtml(textOf(p.card_id))}">📋 複製付款確認文案</button>` : ''}
            ${status === 'paid' ? `<button class="btn btn-danger btn-sm btn-pay-refund" data-pid="${pid}">退款</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  async function confirmPaymentFromUi(paymentId) {
    if (!confirm(`確認付款單 ${paymentId} 已付款？`)) return;
    if (!doubleConfirmId(paymentId, "付款單")) return;
    try {
      const res = await apiPost("confirmPayment", { payment_id: paymentId });
      const payment = res?.payment || {};
      const paidAt = payment.paid_at || new Date().toISOString();
      const nextPayment = { ...payment, payment_id: payment.payment_id || paymentId, status: payment.status || "paid", billing_status: payment.billing_status || payment.billing_status_after || "paid", paid_at: paidAt };

      patchListItem(state.paymentList, "payment_id", paymentId, nextPayment);
      patchListItem(state.payments, "payment_id", paymentId, nextPayment);

      const cardId = res?.card?.id || res?.card?.card_id || res?.card_id || payment.card_id;
      const cardPatch = { billing_status: "paid", payment_paid_at: paidAt, payment_due_at: "" };
      if (res?.card?.expires_at) cardPatch.expires_at = res.card.expires_at;
      if (cardId) {
        patchListItem(state.cards, "id", cardId, cardPatch);
        patchListItem(state.cards, "card_id", cardId, cardPatch);
      }

      toast("✅ 付款已確認");
      _renderPaymentsPage();
      renderDashboard();

      const ledgerSection = $('#ledgerSection');
      if (ledgerSection?.classList.contains('active')) renderLedger();
    } catch (err) { toast(`確認失敗：${err.message}`); }
  }

  async function markPaymentRefundedFromUi(paymentId) {
    if (!confirm("⚠️ 退款操作無法自動撤銷，確定？")) return;
    if (!doubleConfirmId(paymentId, "付款單")) return;
    try {
      await apiPost("markPaymentRefunded", { payment_id: paymentId });
      toast("✅ 已標記退款");
      patchListItem(state.paymentList, "payment_id", paymentId, { status: "refunded" });
      patchListItem(state.payments, "payment_id", paymentId, { status: "refunded" });
      _renderPaymentsPage();
    } catch (err) { toast(`退款失敗：${err.message}`); }
  }

  // ── RENEWALS ──
  function renderRenewalList() {
    const container = $('#renewalListContainer');
    if (!container) return;
    if (!state.renewalItems.length) { container.innerHTML = '<div class="empty-state">尚無續約資料</div>'; return; }
    container.innerHTML = state.renewalItems.map(item => {
      const rid = escapeHtml(textOf(item.renewal_id || item.id));
      const status = textOf(item.status);
      const badgeClass = status === 'paid' ? 'badge-ok' : 'badge-warn';
      return `
        <div class="list-row" id="rrow-${rid}">
          <div class="list-row-head" data-row="${rid}" data-type="renewal">
            <div class="list-row-icon ${status === 'paid' ? 'icon-done' : 'icon-pending'}">🔄</div>
            <div class="list-row-info">
              <div class="list-row-title">${escapeHtml(textOf(item.card_id))}</div>
              <div class="list-row-sub">${rid} · ${escapeHtml(formatValue(item.renew_days))} 天 · $${escapeHtml(formatValue(item.amount))}</div>
            </div>
            <div class="list-row-right">
              <span class="badge ${badgeClass}">${escapeHtml(status || 'pending')}</span>
              <span style="font-size:11px;color:var(--ink3);margin-top:3px;">${escapeHtml(formatValue(item.expires_at))}</span>
            </div>
            <span class="chevron" style="margin-left:6px;">›</span>
          </div>
          <div class="list-row-body">
            <div class="detail-grid" style="margin-top:0;">
              ${renderDetailItem("續約ID", item.renewal_id)}
              ${renderDetailItem("卡片ID", item.card_id)}
              ${renderDetailItem("天數", item.renew_days)}
              ${renderDetailItem("金額", item.amount)}
              ${renderDetailItem("狀態", item.status)}
              ${renderDetailItem("到期日", item.expires_at)}
            </div>
            <div class="action-strip">
             ${status !== 'paid' ? `<button class="btn btn-primary btn-sm btn-renewal-paid" data-id="${rid}">標記已付款</button>` : ''}
${status === 'paid' ? '<button class="btn btn-danger btn-sm btn-renewal-refund" data-id="' + rid + '" data-pid="' + escapeHtml(textOf(item.payment_id)) + '">退款</button>' : ''}
<button class="btn btn-soft btn-sm btn-renewal-reminder" data-cid="${escapeHtml(textOf(item.card_id))}">觸發提醒</button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.list-row-head[data-type="renewal"]').forEach(head => {
      head.addEventListener('click', () => document.getElementById(`rrow-${head.dataset.row}`)?.classList.toggle('open'));
    });
    container.querySelectorAll('.btn-renewal-paid').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); markRenewalPaid(btn.dataset.id); }));
   container.querySelectorAll('.btn-renewal-refund').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const renewalId = btn.dataset.id;
        const paymentId = btn.dataset.pid;
        if (!confirm('確定退款？\n續約單：' + renewalId + '\n付款單：' + paymentId + '\n\n退款後點數將自動退回。')) return;
        setLoading(true);
        apiPost('markPaymentRefunded', { payment_id: paymentId, note: '後台退款' })
          .then(function() {
            toast('✅ 退款成功，點數已退回');
            loadRenewalList();
          })
          .catch(function(err) {
            toast('退款失敗：' + err.message);
          })
          .finally(function() {
            setLoading(false);
          });
      }));
    container.querySelectorAll('.btn-renewal-reminder').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); triggerRenewalReminderForCard(btn.dataset.cid); }));
  }
 
  function updateRenewalStats() {
    const soon = state.renewalItems.filter(r => textOf(r.status).toLowerCase() === "pending" && isExpiringSoon({ expires_at: r.expires_at }, 30)).length;
    const expired = state.renewalItems.filter(r => textOf(r.status).toLowerCase() === "pending" && isExpired({ expires_at: r.expires_at })).length;
    const pendingPay = state.renewalItems.filter(r => textOf(r.status).toLowerCase() === "pending").length;
    safeSetText("#renewalSoonCount", soon);
    safeSetText("#renewalExpiredCount", expired);
    safeSetText("#renewalPendingPayCount", pendingPay);
  }

  async function markRenewalPaid(renewalId) {
    if (!confirm(`確認續約單 ${renewalId} 已付款？`)) return;
    if (!doubleConfirmId(renewalId, "續約單")) return;
    try {
      await apiPost("adminMarkRenewalPaid", { renewal_id: renewalId });
      toast("✅ 續約付款已確認");
      patchListItem(state.renewalItems, "renewal_id", renewalId, { status: "paid", billing_status: "paid" });
      renderRenewalList(); updateRenewalStats(); renderDashboard();
    } catch (err) { toast(`確認失敗：${err.message}`); }
  }
  async function triggerRenewalReminderForCard(cardId) {
    try { await apiPost("triggerRenewalReminder", { card_id: cardId }); toast("✅ 提醒已觸發"); }
    catch (err) { toast(`觸發失敗：${err.message}`); }
  }

  // ── ADDONS ──
  function renderAddons() {
    const container = $('#addonsListContainer');
    if (!container) return;
    const keyword = valueOf("#addonSearch").toLowerCase();
    const rows = state.addons.filter(item => {
      if (!keyword) return true;
      return [textOf(item.addon_order_id), textOf(item.card_id), textOf(item.addon_type)].join(" ").toLowerCase().includes(keyword);
    });
    if (!rows.length) { container.innerHTML = '<div class="empty-state">查無加購資料</div>'; return; }
    container.innerHTML = rows.map(item => {
      const aid = escapeHtml(textOf(item.addon_order_id));
      const status = textOf(item.status);
      const badgeClass = status === 'paid' ? 'badge-ok' : 'badge-warn';
      return `
        <div class="list-row" id="arow-${aid}">
          <div class="list-row-head" data-row="${aid}" data-type="addon">
            <div class="list-row-icon ${status === 'paid' ? 'icon-done' : 'icon-pending'}">➕</div>
            <div class="list-row-info">
              <div class="list-row-title">${escapeHtml(textOf(item.card_id))} · ${escapeHtml(textOf(item.addon_type))}</div>
              <div class="list-row-sub">${aid} · $${escapeHtml(formatValue(item.amount))}</div>
            </div>
            <div class="list-row-right"><span class="badge ${badgeClass}">${escapeHtml(status || '-')}</span></div>
            <span class="chevron" style="margin-left:6px;">›</span>
          </div>
          <div class="list-row-body">
            <div class="detail-grid" style="margin-top:0;">
              ${renderDetailItem("加購單ID", item.addon_order_id)}
              ${renderDetailItem("卡片ID", item.card_id)}
              ${renderDetailItem("類型", item.addon_type)}
              ${renderDetailItem("數量", item.qty || 1)}
              ${renderDetailItem("金額", item.amount)}
              ${renderDetailItem("應付日", item.due_at)}
            </div>
            <div class="action-strip">
              ${status.toLowerCase() !== 'paid' ? `<button class="btn btn-primary btn-sm btn-addon-paid" data-id="${aid}" data-cid="${escapeHtml(textOf(item.card_id))}">確認付款</button>` : ''}
              <button class="btn btn-soft btn-sm btn-addon-remind" data-id="${aid}">複製提醒</button>
              <button class="btn btn-danger btn-sm btn-addon-cancel" data-id="${aid}">取消</button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.list-row-head[data-type="addon"]').forEach(head => {
      head.addEventListener('click', () => document.getElementById(`arow-${head.dataset.row}`)?.classList.toggle('open'));
    });
    container.querySelectorAll('.btn-addon-paid').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); confirmAddonPaid(btn.dataset.id, btn.dataset.cid, btn); }));
    container.querySelectorAll('.btn-addon-remind').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); buildAddonReminderFromApi(btn.dataset.id); }));
    container.querySelectorAll('.btn-addon-cancel').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); cancelAddon(btn.dataset.id, btn); }));
  }

  async function buildAddonReminderFromApi(addonOrderId) {
    try {
      const data = await apiGet("buildAddonPaymentNoticeText", { addon_order_id: addonOrderId });
      const text = data.text || data.message || "";
      copyText(text, "✅ 加購提醒已複製");
    } catch {
      const fallback = state.addons.find(a => textOf(a.addon_order_id) === addonOrderId);
      if (fallback) copyText(`提醒您，加購單 ${textOf(fallback.addon_order_id)} 金額 ${formatValue(fallback.amount)} 待付款。`, "⚠️ 已複製備用文案");
      else toast("無法產生提醒文案");
    }
  }

  async function confirmAddonPaid(addonOrderId, cardId, btnEl) {
    if (!confirm(`確認加購單 ${addonOrderId} 已付款？`)) return;
    if (!doubleConfirmId(addonOrderId, "加購單")) return;
    setBtnLoading(btnEl, true);
    try {
      await apiPost("adminMarkAddonPaid", { addon_order_id: addonOrderId });
      toast("✅ 加購單已確認付款");
      patchListItem(state.addons, "addon_order_id", addonOrderId, { status: "paid" });
      renderAddons(); renderDashboard();
    } catch (err) { toast(`確認失敗：${err.message}`); }
    finally { setBtnLoading(btnEl, false); }
  }

  async function cancelAddon(addonOrderId, btnEl) {
    if (!confirm(`確定取消加購單 ${addonOrderId}？`)) return;
    if (!doubleConfirmId(addonOrderId, "加購單")) return;
    setBtnLoading(btnEl, true);
    try {
      await apiPost("adminCancelAddonOrder", { addon_order_id: addonOrderId });
      toast("✅ 已取消");
      patchListItem(state.addons, "addon_order_id", addonOrderId, { status: "cancelled" });
      renderAddons();
    } catch (err) { toast(`取消失敗：${err.message}`); }
    finally { setBtnLoading(btnEl, false); }
  }

  // ── AGENTS ──
  function renderAgents() {
    const container = $('#agentsListContainer');
    if (!container) return;
    const keyword = valueOf("#agentSearch").toLowerCase();
    const rows = state.agents.filter(item => {
      if (!keyword) return true;
      return [textOf(item.agent_id), textOf(item.owner_name), textOf(item.agent_type)].join(" ").toLowerCase().includes(keyword);
    });
    if (!rows.length) { container.innerHTML = '<div class="empty-state">查無代理資料</div>'; return; }
    container.innerHTML = rows.map(item => {
      const agid = escapeHtml(textOf(item.agent_id));
      const status = textOf(item.status || 'active');
      return `
        <div class="list-row" id="agrow-${agid}">
          <div class="list-row-head" data-row="${agid}" data-type="agent">
            <div class="list-row-icon icon-neutral">🤝</div>
            <div class="list-row-info">
              <div class="list-row-title">${escapeHtml(textOf(item.owner_name) || '-')}</div>
              <div class="list-row-sub">${agid} · ${escapeHtml(textOf(item.agent_type) || '-')} · ${escapeHtml(textOf(item.member_tier) || '-')}</div>
            </div>
            <div class="list-row-right">
              <span class="badge ${status === 'active' ? 'badge-ok' : 'badge-warn'}">${escapeHtml(status)}</span>
              <span style="font-size:11px;color:var(--ink3);margin-top:3px;">點 ${escapeHtml(formatValue(item.points_balance))}</span>
            </div>
            <span class="chevron" style="margin-left:6px;">›</span>
          </div>
          <div class="list-row-body">
            <div class="detail-grid" style="margin-top:0;">
              ${renderDetailItem("代理ID", item.agent_id)}
              ${renderDetailItem("點數", item.points_balance)}
              ${renderDetailItem("總分潤", item.total_commission)}
              ${renderDetailItem("電話", item.phone)}
              ${renderDetailItem("Email", item.email)}
            </div>
            <div class="action-strip">
              <button class="btn btn-primary btn-sm btn-agent-detail" data-id="${agid}">詳情 / 編輯</button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.list-row-head[data-type="agent"]').forEach(head => {
      head.addEventListener('click', () => document.getElementById(`agrow-${head.dataset.row}`)?.classList.toggle('open'));
    });
    container.querySelectorAll('.btn-agent-detail').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); loadAgentDetail(btn.dataset.id); }));
  }

  // ── COMMISSIONS ──
  function renderCommissionList() {
    const container = $('#commissionsListContainer');
    if (!container) return;
    if (!state.commissionItems.length) { container.innerHTML = '<div class="empty-state">尚無分潤資料</div>'; return; }
    container.innerHTML = state.commissionItems.map(item => {
      const cid = escapeHtml(textOf(item.commission_id || item.id));
      const status = textOf(item.status);
      return `
        <div class="list-row" id="cmrow-${cid}">
          <div class="list-row-head" data-row="${cid}" data-type="commission">
            <div class="list-row-icon ${status === 'paid' ? 'icon-done' : 'icon-pending'}">💵</div>
            <div class="list-row-info">
              <div class="list-row-title">${escapeHtml(textOf(item.beneficiary_agent_id))}</div>
<div class="list-row-sub">${cid} · $${escapeHtml(formatValue(item.reward_amount))}</div>
            </div>
            <div class="list-row-right"><span class="badge ${status === 'paid' ? 'badge-ok' : 'badge-warn'}">${escapeHtml(status || 'pending')}</span></div>
            <span class="chevron" style="margin-left:6px;">›</span>
          </div>
          <div class="list-row-body">
            <div class="detail-grid" style="margin-top:0;">
              ${renderDetailItem("分潤ID", item.commission_id || item.id)}
             ${renderDetailItem("代理ID", item.beneficiary_agent_id)}
              ${renderDetailItem("金額", item.reward_amount)}
              ${renderDetailItem("付款單", item.payment_id)}
            </div>
            <div class="action-strip">
              ${status !== 'paid' ? `<button class="btn btn-primary btn-sm btn-commission-paid" data-id="${cid}">標記已付</button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.list-row-head[data-type="commission"]').forEach(head => {
      head.addEventListener('click', () => document.getElementById(`cmrow-${head.dataset.row}`)?.classList.toggle('open'));
    });
    container.querySelectorAll('.btn-commission-paid').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); markCommissionPaid(btn.dataset.id); }));
  }

  async function markCommissionPaid(commissionId) {
    if (!confirm(`確認分潤 ${commissionId} 已付款？`)) return;
    if (!doubleConfirmId(commissionId, "分潤單")) return;
    try {
      await apiPost("markCommissionPaid", { commission_id: commissionId });
      toast("✅ 已標記付款");
      patchListItem(state.commissionItems, "commission_id", commissionId, { status: "paid" });
      const item = state.commissionItems.find(c => String(c.commission_id || c.id) === commissionId);
      if (item) {
        addLedgerRecord({
          type: 'commission_paid', payment_id: item.payment_id || '', card_id: item.card_id || '', card_name: '',
          amount: item.reward_amount || 0, paid_at: new Date().toISOString(), note: `分潤付款 代理：${item.beneficiary_agent_id || ''}`,
        commission: item.reward_amount || 0, withdrawn: item.reward_amount || 0,
        });
      }
      renderCommissionList();
      const ledgerSection = $('#ledgerSection');
      if (ledgerSection?.classList.contains('active')) renderLedger();
    } catch (err) { toast(`操作失敗：${err.message}`); }
  }

  // ── ANNOUNCEMENTS ──
  function renderAnnouncements() {
    const container = $('#announcementsListContainer');
    if (!container) return;
    if (!state.announcementItems.length) { container.innerHTML = '<div class="empty-state">尚無公告</div>'; return; }
    container.innerHTML = state.announcementItems.map(a => {
      const aid = escapeHtml(textOf(a.announcement_id || a.id));
      const status = textOf(a.status).toLowerCase();
      return `
        <div class="list-row" id="anrow-${aid}">
          <div class="list-row-head" data-row="${aid}" data-type="announcement">
            <div class="list-row-icon ${status === 'active' ? 'icon-done' : 'icon-neutral'}">📢</div>
            <div class="list-row-info">
              <div class="list-row-title">${escapeHtml(textOf(a.title))}</div>
              <div class="list-row-sub">${escapeHtml(formatValue(a.published_at || a.created_at))}</div>
            </div>
            <div class="list-row-right"><span class="badge ${status === 'active' ? 'badge-ok' : 'badge-neutral'}">${escapeHtml(status)}</span></div>
            <span class="chevron" style="margin-left:6px;">›</span>
          </div>
          <div class="list-row-body">
            <div style="font-size:13px;line-height:1.6;margin-bottom:10px;">${escapeHtml(textOf(a.content))}</div>
            <div class="action-strip">
              <button class="btn btn-soft btn-sm btn-toggle-announcement" data-id="${aid}" data-status="${escapeHtml(status)}">
                ${status === 'active' ? '停用' : '啟用'}
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.list-row-head[data-type="announcement"]').forEach(head => {
      head.addEventListener('click', () => document.getElementById(`anrow-${head.dataset.row}`)?.classList.toggle('open'));
    });
    container.querySelectorAll('.btn-toggle-announcement').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); toggleAnnouncement(btn.dataset.id, btn.dataset.status); }));
  }

  async function toggleAnnouncement(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "draft" : "active";
    try {
      await apiPost("adminToggleAnnouncement", { announcement_id: id, status: newStatus });
      toast(`✅ 公告已${newStatus === "active" ? "啟用" : "停用"}`);
      patchListItem(state.announcementItems, "id", id, { status: newStatus });
      renderAnnouncements();
    } catch (err) { toast(`操作失敗：${err.message}`); }
  }
  async function saveAnnouncement() {
    const title = valueOf("#announcementTitle");
    const content = valueOf("#announcementContent");
    const status = valueOf("#announcementStatus");
    if (!title || !content) return toast("請填寫標題和內容");
    try {
      await apiPost("adminSaveAnnouncement", { title, content, status });
      toast("✅ 公告已儲存");
      const wrap = $('#announcementFormCollapsible');
      if (wrap) wrap.classList.remove('open');
      await loadAnnouncements();
    } catch (err) { toast(`儲存失敗：${err.message}`); }
  }

  // ── TRACKING ──
  function renderTrackingSummary() {
    if (!state.trackingSummary) return;
    safeSetText("#trackingTotalCards", formatValue(state.trackingSummary.total_cards || 0));
    safeSetText("#trackingTotalAgents", formatValue(state.trackingSummary.total_agents || 0));
    safeSetText("#trackingMonthlyRevenue", formatValue(state.trackingSummary.monthly_revenue || 0));
    safeSetText("#trackingMonthlyCommission", formatValue(state.trackingSummary.monthly_commission || 0));
  }

  function renderTrackingDetail(wrap, data) {
    if (!wrap) return;
    if (!data || !Object.keys(data).length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `<div class="detail-grid" style="margin-top:0;">${Object.entries(data).map(([k, v]) => renderDetailItem(k, formatValue(v))).join('')}</div>`;
  }

  // ── SCHEMA / OPS ──
  function renderSchemaStatus() {
    const wrap = $("#schemaStatus");
    if (!wrap || !state.schemaStatus) return;
    const issues = state.schemaStatus.issues || 0;
    wrap.textContent = issues === 0 ? "✅ Schema 正常" : `⚠️ 發現 ${issues} 個問題\n${JSON.stringify(state.schemaStatus, null, 2)}`;
  }

  // ── WALLET HELPERS ──
  function buildWalletModeMeta(card) {
    const dg = card?.delivery_guidance || {};
    const nested = card?.agent || card?.agent_info || {};
    const pointsLifetime = Number(nested?.points_lifetime ?? dg?.points_lifetime ?? card?.points_lifetime ?? 0);
    const referralLink = card?.referral_link || nested?.referral_link || "";
    return {
      wallet_mode: textOf(nested?.wallet_mode || card?.wallet_mode),
      agent_type: textOf(nested?.agent_type || card?.agent_type),
      member_tier: textOf(dg?.member_tier || nested?.member_tier),
      points_lifetime: pointsLifetime,
      referral_link: referralLink,
      referral_count: card?.referral_count ?? nested?.referral_count ?? 0,
      converted_count: card?.converted_count ?? nested?.converted_count ?? 0,
      commission_monthly: card?.commission_monthly ?? nested?.commission_monthly ?? 0,
      commission_total: card?.total_commission ?? nested?.total_commission ?? 0,
      upgrade_hint: card?.upgrade_hint || "",
      points_rule: card?.points_rule || "每筆付款可獲得對應點數",
      commission_rule: card?.commission_rule || "推薦分潤 10%",
      upgrade_rule: card?.upgrade_rule || "累積 100 點即可升級",
      remaining_points_to_next_tier: card?.remaining_points_to_next_tier ?? 0
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
  function detectDeliveryWarnings(card, meta) {
    const warnings = [];
    if (isPaid(card) && textOf(card.status).toLowerCase() !== "active") warnings.push("已付款但未啟用");
    if ((meta.wallet_mode === "referral" || meta.wallet_mode === "partner") && !meta.referral_link) warnings.push("推薦/夥伴模式但缺 referral_link");
    if (meta.wallet_mode === "partner" && (meta.commission_total === 0 && meta.commission_monthly === 0)) warnings.push("夥伴模式但收益資料為 0");
    if (meta.wallet_mode !== "trial" && !card.agent_id) warnings.push("非 trial 模式但缺 agent_id");
    if (!card.expires_at) warnings.push("expires_at 缺失");
    return warnings;
  }

  // ── 記帳功能 ──
  function formatMoney(v) { const n = Number(v || 0); return 'NT$ ' + n.toLocaleString('zh-TW'); }

  function buildLedgerFromPayments() {
    return state.paymentList.filter(p => textOf(p.status).toLowerCase() === 'paid').map(p => {
      const card = state.cards.find(c => String(c.id || c.card_id) === String(p.card_id || '')) || {};
      return {
        ledger_id: `PM_${p.payment_id || p.id}`, type: 'income',
        payment_id: p.payment_id || '', card_id: p.card_id || '',
        card_name: card.name || card.owner_name || '',
        amount: Number(p.amount || p.total_amount || 0), commission: 0, withdrawn: 0,
        paid_at: p.paid_at || p.updated_at || p.created_at || '',
        note: `${p.event_type || 'payment'} / ${p.order_type || ''}`.trim(),
        created_at: p.created_at || ''
      };
    });
  }

  function buildLedgerFromCommissions() {
    return state.commissionItems.filter(c => { const status = textOf(c.status).toLowerCase(); return status === 'paid' || status === 'processed'; })
      .map(c => ({
        ledger_id: `CM_${c.commission_id || c.id}`, type: 'commission_paid',
        payment_id: c.payment_id || '', card_id: c.card_id || '', card_name: '', amount: 0,
        commission: Number(c.reward_amount || c.amount || 0),
        withdrawn: Number(c.commission_paid_total || c.reward_amount || c.amount || 0),
        paid_at: c.paid_at || c.updated_at || c.created_at || '',
        note: `分潤 代理：${c.beneficiary_agent_id || c.agent_id || ''}`,
        created_at: c.created_at || ''
      }));
  }

  function renderLedger() {
    const container = $('#ledgerSection');
    if (!container) return;
    const localRecords = getLedgerRecords().map(r => ({ ...r, type: r.type || 'manual', amount: Number(r.amount || 0), commission: Number(r.commission || 0), withdrawn: Number(r.withdrawn || 0) }));
    const paymentRecords = buildLedgerFromPayments();
    const commissionRecords = buildLedgerFromCommissions();
    const localIds = new Set(localRecords.map(r => r.ledger_id));
    const merged = [
      ...paymentRecords.filter(r => !localIds.has(r.ledger_id)),
      ...commissionRecords.filter(r => !localIds.has(r.ledger_id)),
      ...localRecords
    ].sort((a, b) => new Date(b.paid_at || b.created_at || 0) - new Date(a.paid_at || a.created_at || 0));

    const totalIncome = merged.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalCommission = merged.reduce((s, r) => s + Number(r.commission || 0), 0);
    const totalWithdrawn = merged.reduce((s, r) => s + Number(r.withdrawn || 0), 0);
    const totalManual = merged.filter(r => r.type === 'manual').reduce((s, r) => s + Number(r.amount || 0), 0);

    const monthMap = {};
    merged.forEach(r => {
      const dt = r.paid_at || r.created_at || '';
      const key = dt.slice(0, 7) || '未知';
      if (!monthMap[key]) monthMap[key] = { income: 0, commission: 0, withdrawn: 0 };
      if (r.type === 'income') monthMap[key].income += Number(r.amount || 0);
      monthMap[key].commission += Number(r.commission || 0);
      monthMap[key].withdrawn += Number(r.withdrawn || 0);
    });
    const months = Object.entries(monthMap).sort((a, b) => b[0].localeCompare(a[0]));

    const wrap = $('#ledgerContentWrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="stats-row" style="margin-bottom:16px;">
        <div class="stat-tile ok"><div class="stat-label">總收款</div><div class="stat-value" style="font-size:18px;">${formatMoney(totalIncome)}</div></div>
        <div class="stat-tile"><div class="stat-label">總分潤</div><div class="stat-value" style="font-size:18px;">${formatMoney(totalCommission)}</div></div>
        <div class="stat-tile warn"><div class="stat-label">已取款</div><div class="stat-value" style="font-size:18px;">${formatMoney(totalWithdrawn)}</div></div>
        <div class="stat-tile"><div class="stat-label">手動調整</div><div class="stat-value" style="font-size:18px;">${formatMoney(totalManual)}</div></div>
      </div>
      <div class="card" style="margin-bottom:16px;">
        <div class="card-body">
          <div style="font-weight:900;margin-bottom:10px;">月報概況</div>
          ${months.length ? months.map(([m, v]) => `<div class="copy-row"><div class="copy-row-label">${escapeHtml(m)}</div><div class="copy-row-value">收款 ${formatMoney(v.income)} ／ 分潤 ${formatMoney(v.commission)} ／ 已取 ${formatMoney(v.withdrawn)}</div></div>`).join('') : `<div class="empty-state">尚無資料</div>`}
        </div>
      </div>
      <div class="collapsible" id="ledgerAddCollapsible">
        <div class="collapsible-head" id="ledgerAddHead"><span>➕ 新增手動記帳</span><span class="chevron">›</span></div>
        <div class="collapsible-body">
          <div class="detail-grid" style="margin-top:0;">
            <div class="field"><label>類型</label><select id="ledgerAddType"><option value="manual">手動調整</option><option value="expense">支出</option></select></div>
            <div class="field"><label>金額</label><input type="number" id="ledgerAddAmount" placeholder="0" min="0"></div>
            <div class="field"><label>分潤</label><input type="number" id="ledgerAddCommission" placeholder="0" min="0"></div>
            <div class="field"><label>已取款</label><input type="number" id="ledgerAddWithdrawn" placeholder="0" min="0"></div>
            <div class="field"><label>卡片 ID</label><input type="text" id="ledgerAddCardId" placeholder="選填"></div>
            <div class="field"><label>日期</label><input type="datetime-local" id="ledgerAddDate"></div>
            <div class="field" style="grid-column:1 / -1;"><label>備註</label><input type="text" id="ledgerAddNote" placeholder="選填"></div>
          </div>
          <div class="action-strip"><button class="btn btn-primary btn-sm" id="btnLedgerAddSave">儲存</button></div>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div style="font-weight:900;margin-bottom:10px;">詳細紀錄</div>
          <div id="ledgerDetailList">${merged.length ? merged.map(r => renderLedgerRow(r)).join('') : `<div class="empty-state">尚無資料</div>`}</div>
        </div>
      </div>`;

    wrap.querySelector('#ledgerAddHead')?.addEventListener('click', () => wrap.querySelector('#ledgerAddCollapsible')?.classList.toggle('open'));

    const dateInput = wrap.querySelector('#ledgerAddDate');
    if (dateInput && !dateInput.value) {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    wrap.querySelector('#btnLedgerAddSave')?.addEventListener('click', () => {
      const type = wrap.querySelector('#ledgerAddType')?.value || 'manual';
      const amount = Number(wrap.querySelector('#ledgerAddAmount')?.value || 0);
      const commission = Number(wrap.querySelector('#ledgerAddCommission')?.value || 0);
      const withdrawn = Number(wrap.querySelector('#ledgerAddWithdrawn')?.value || 0);
      const cardId = textOf(wrap.querySelector('#ledgerAddCardId')?.value);
      const note = textOf(wrap.querySelector('#ledgerAddNote')?.value);
      const dateVal = wrap.querySelector('#ledgerAddDate')?.value;
      const paidAt = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();
      addLedgerRecord({ type, amount, commission, withdrawn, card_id: cardId, paid_at: paidAt, note });
      toast('✅ 已新增記帳紀錄');
      renderLedger();
    });

    wrap.querySelector('#ledgerDetailList')?.addEventListener('click', e => {
      const editBtn = e.target.closest('[data-ledger-edit]');
      if (editBtn) { openLedgerEditModal(editBtn.dataset.ledgerEdit); return; }
      const delBtn = e.target.closest('[data-ledger-del]');
      if (!delBtn) return;
      if (!confirm('確定刪除此手動記帳？')) return;
      const records = getLedgerRecords().filter(r => r.ledger_id !== delBtn.dataset.ledgerDel);
      saveLedgerRecords(records);
      toast('✅ 已刪除');
      renderLedger();
    });
  }

  function renderLedgerRow(r) {
    const typeLabel = { income: '💰 收款', commission_paid: '💵 分潤取款', manual: '✏️ 手動', withdrawal: '🏦 取款' }[r.type] || r.type;
    const typeColor = { income: 'var(--ok)', commission_paid: 'var(--warn)', manual: 'var(--info)', withdrawal: 'var(--ink3)' }[r.type] || 'var(--ink)';
    const dt = (r.paid_at || r.created_at || '').slice(0, 10);
    const isLocal = !/^CM_|^PM_/.test(String(r.ledger_id || ''));
    return `<div class="list-row" style="margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:800;color:${typeColor};">${typeLabel}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${escapeHtml(dt)} ${escapeHtml(r.card_id || '')} ${escapeHtml(r.note || '')}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          ${r.amount ? `<div style="font-size:13px;font-weight:900;color:var(--ok);">${formatMoney(r.amount)}</div>` : ''}
          ${r.commission ? `<div style="font-size:11px;color:var(--ink3);">分潤 ${formatMoney(r.commission)}</div>` : ''}
          ${r.withdrawn ? `<div style="font-size:11px;color:var(--warn);">取款 ${formatMoney(r.withdrawn)}</div>` : ''}
        </div>
        ${isLocal ? `<div style="display:flex;gap:4px;flex-shrink:0;"><button class="btn btn-soft btn-sm" style="padding:0 8px;height:32px;" data-ledger-edit="${escapeHtml(r.ledger_id)}">編輯</button><button class="btn btn-danger btn-sm" style="padding:0 8px;height:32px;" data-ledger-del="${escapeHtml(r.ledger_id)}">刪</button></div>` : ''}
      </div>
    </div>`;
  }

  function openLedgerEditModal(ledgerId) {
    const records = getLedgerRecords();
    const record = records.find(r => r.ledger_id === ledgerId);
    if (!record) return toast('找不到記錄');
    const newAmount = prompt('收款金額', record.amount || 0); if (newAmount === null) return;
    const newCommission = prompt('分潤金額', record.commission || 0); if (newCommission === null) return;
    const newWithdrawn = prompt('取款金額', record.withdrawn || 0); if (newWithdrawn === null) return;
    const newNote = prompt('備註', record.note || ''); if (newNote === null) return;
    const idx = records.findIndex(r => r.ledger_id === ledgerId);
    if (idx >= 0) {
      records[idx] = { ...records[idx], amount: Number(newAmount) || 0, commission: Number(newCommission) || 0, withdrawn: Number(newWithdrawn) || 0, note: newNote };
      saveLedgerRecords(records);
      toast('✅ 已更新');
      renderLedger();
    }
  }

  function injectLedgerSection() {
    if (document.getElementById('ledgerSection')) return;
    const main = document.querySelector('.content');
    if (!main) return;
    const sec = document.createElement('section');
    sec.id = 'ledgerSection';
    sec.className = 'section';
    sec.innerHTML = `
      <div class="section-header">
        <div class="section-title">記帳</div>
        <button class="btn btn-soft btn-sm" id="btnRefreshLedger">↻ 重整</button>
      </div>
      <div id="ledgerContentWrap"></div>`;
    main.appendChild(sec);

    document.getElementById('btnRefreshLedger')?.addEventListener('click', async () => {
      await Promise.allSettled([loadPayments(), loadCommissionList()]);
      renderLedger();
    });

    const tabnav = document.getElementById('tabNav');
    if (tabnav) {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'tab-btn';
      tabBtn.dataset.section = 'ledgerSection';
      tabBtn.textContent = '📒 記帳';
      const moreBtn = document.getElementById('btnMore');
      tabnav.insertBefore(tabBtn, moreBtn);
      tabBtn.addEventListener('click', async () => {
        if (typeof window.activateAdminSection === 'function') window.activateAdminSection('ledgerSection');
        if (!state.commissionItems.length) await loadCommissionList();
        renderLedger();
      });
    }

    const moreGrid = document.querySelector('.more-menu-grid');
    if (moreGrid) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'more-menu-btn';
      moreBtn.dataset.section = 'ledgerSection';
      moreBtn.textContent = '📒 記帳';
      moreBtn.addEventListener('click', async () => {
        if (typeof window.activateAdminSection === 'function') window.activateAdminSection('ledgerSection');
        if (!state.commissionItems.length) await loadCommissionList();
        renderLedger();
        document.getElementById('moreMenu')?.classList.remove('open');
      });
      moreGrid.appendChild(moreBtn);
    }
  }

  // ══════════════════════════════════════════
  // ── LOAD DATA（分開的 loader，供 lazy 使用）──
  // ══════════════════════════════════════════
  async function loadCards() {
    try { const data = await apiGet("getCards", { limit: 100, offset: 0, light: true }); state.cards = normalizeList(data, ["cards", "items"]); renderCards(); }
    catch { state.cards = []; renderCards(); }
  }
  async function loadPayments() {
    try {
      const data = await apiGet("getPaymentList", { limit: 200, light: true });
      const rows = normalizeList(data, ["payment_list", "payments", "rows", "items"]);
      state.payments = rows; state.paymentList = rows; renderPayments();
    } catch { state.payments = []; state.paymentList = []; renderPayments(); }
  }
  async function loadPaymentList() { return loadPayments(); }
  async function loadAddons() {
    try { const data = await apiGet("getAddonOrders"); state.addons = normalizeList(data, ["addons", "orders", "items"]); renderAddons(); }
    catch { state.addons = []; renderAddons(); }
  }
  async function loadAgents() {
    try { const data = await apiGet("adminListAgents"); state.agents = normalizeList(data, ["agents", "items"]); renderAgents(); }
    catch { state.agents = []; renderAgents(); }
  }
  async function loadRenewalList() {
    try { const data = await apiGet("adminGetRenewalList"); state.renewalItems = normalizeList(data, ["renewals", "items"]); renderRenewalList(); updateRenewalStats(); }
    catch { state.renewalItems = []; renderRenewalList(); }
  }
  async function loadAnnouncements() {
    try { const data = await apiGet("getAnnouncements"); state.announcementItems = normalizeList(data, ["announcements", "items"]); renderAnnouncements(); }
    catch { state.announcementItems = []; renderAnnouncements(); }
  }
  async function loadTrackingSummary() {
    try { const data = await apiGet("getTrackingSummary"); state.trackingSummary = data.summary || data || {}; renderTrackingSummary(); }
    catch (err) { console.error(err); }
  }
  async function loadRecentOpsLogs() {
    try { const data = await apiGet("getRecentOpsLogs"); state.opsLogs = normalizeList(data, ["logs", "items"]); renderDashboardOpsLogs(); }
    catch { state.opsLogs = []; }
  }
  async function loadCommissionList() {
    try { const data = await apiGet("getCommissionList"); state.commissionItems = normalizeList(data, ["commissions", "items"]); renderCommissionList(); }
    catch { state.commissionItems = []; renderCommissionList(); }
  }
  async function checkSchemaStatus() {
    try { const data = await apiGet("adminCheckSchemaStatus"); state.schemaStatus = data.schema || data || {}; renderSchemaStatus(); }
    catch (err) { console.error(err); }
  }

  window.loadCardDetail = async function(cardId) {
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

syncDeliveryControlPanel(card);
      $('#cardDetailCollapsible')?.classList.add('open');
      toast(`已載入卡片 ${cardId}`);
    } catch (err) { toast(`載入卡片失敗：${err.message}`); }
    finally { setLoading(false); }
  };

  async function loadAgentDetail(agentId) {
    if (!agentId) return toast("請輸入代理 ID");
    try {
      const data = await apiGet("adminGetAgent", { agent_id: agentId });
      state.currentAgent = data.agent || data || {};
      toast(`代理 ${agentId} 已載入`);
    } catch (err) { toast(`載入代理失敗：${err.message}`); }
  }

  async function loadRequests() {
    try {
      const data = await apiGet("getRequests", { limit: 50, offset: 0 });
      state.requests = normalizeList(data, ["requests", "items"]);
      renderRequests();
    } catch (err) { state.requests = []; renderRequests(); toast('載入申請單失敗：' + err.message); }
  }

  async function loadRequestTrace(requestId) {
    const container = $("#requestTraceWrap");
    try {
      const trace = await getRequestTrace(requestId);
      state.currentRequestTrace = trace;
      if (container) container.innerHTML = `<div class="result-box">${escapeHtml(JSON.stringify(trace, null, 2))}</div>`;
    } catch {
      const request = state.requests.find(r => r.request_id === requestId);
      if (container && request) container.innerHTML = `<div class="result-box">${escapeHtml(JSON.stringify(request, null, 2))}</div>`;
    }
  }

  // ── ASSIGN INVITE ──
  async function assignInviteToRequestAligned(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const reqInput = $("#requestIdForAssign");
    const requestId = textOf(reqInput?.value);
    if (!requestId) { toast("請先點擊申請單「派碼」選取"); return; }
    const request = state.requests.find(r => textOf(r.request_id) === requestId);
    if (!request) { toast("找不到對應申請單"); return; }
    if (textOf(request.status).toLowerCase() !== "pending") { toast("該申請單已非 pending 狀態"); return; }
    const btn = $("#btnAssignInviteToRequest");
    setBtnLoading(btn, true);
    try {
      const result = await assignInviteToRequest(requestId, null);
      const immediateRequest = result?.request || result?.data?.request || null;
      if (immediateRequest) {
        const full = { ...immediateRequest, form_url: result?.form_url || immediateRequest.form_url || "" };
        state.currentSelectedRequestForInvite = full;
        if (typeof window.updateInviteSelectedPanel === 'function') window.updateInviteSelectedPanel(full);
        toast("✅ 派碼成功");
        const idx = state.requests.findIndex(r => textOf(r.request_id) === requestId);
        if (idx >= 0) state.requests[idx] = { ...state.requests[idx], ...full };
        renderRequests();
      } else {
        toast("✅ 派碼成功，同步中…");
        loadRequests().catch(() => {});
      }
      if (reqInput) reqInput.value = "";
      const noteInput = $("#assignInviteNote");
      if (noteInput) noteInput.value = "";
    } catch (err) { toast("派碼失敗：" + err.message); }
    finally { setBtnLoading(btn, false); }
  }

  // ── SYSTEM TOOLS ──
  async function runRepairAction(actionName) {
    const actions = {
      due_at: { action: "adminRepairDueAt", msg: "修復到期日？" },
      addon_status: { action: "repairAddonOrderStatuses", msg: "修復加購單狀態？" },
      data_validation: { action: "adminRepairDataValidation", msg: "執行資料驗證修復？" },
      normalize_card_theme: { action: "adminNormalizeCardThemeFields", msg: "正規化卡片主題？" },
      audit_card_theme: { action: "adminAuditCardThemeFields", msg: "稽核卡片主題？" },
      install_system_triggers: { action: "installSystemTriggers", msg: "安裝系統排程？" },
      install_commercial_triggers: { action: "installCommercialTriggers", msg: "安裝商業排程？" }
    };
    const config = actions[actionName];
    if (!config) return toast("未知操作");
    if (!confirm(config.msg)) return;
    if (!doubleConfirmId(actionName, "操作名稱")) return;
    try {
      const result = await apiPost(config.action);
      const msg = result?.message || result?.result || "執行完成";
      const resultDiv = $("#systemToolResult");
      if (resultDiv) resultDiv.textContent = `✅ ${msg}\n${JSON.stringify(result, null, 2)}`;
      toast(`✅ ${msg}`);
    } catch (err) {
      const resultDiv = $("#systemToolResult");
      if (resultDiv) resultDiv.textContent = `❌ 失敗: ${err.message}`;
      toast(`失敗：${err.message}`);
    }
  }

  async function runDailyOps() {
    if (!confirm("執行每日維運作業？")) return;
    if (!doubleConfirmId("daily_ops", "每日維運")) return;
    try {
      await apiPost("runDailyOps");
      toast("✅ 每日維運執行完成");
      await Promise.allSettled([loadCards(), loadAddons(), loadRenewalList(), loadRecentOpsLogs()]);
    } catch (err) { toast(`執行失敗：${err.message}`); }
  }

  // ══════════════════════════════════════════
  // ── refreshAll（分層載入核心優化）──
  // ══════════════════════════════════════════
  async function refreshAll() {
    try {
      setLoading(true);

      // ── 第一層：首屏資料 ──
      let boot = null;
      try {
        boot = await apiGet("getAdminBootstrap", {
          requests_limit: 50,
          cards_limit: 100,
          payments_limit: 100,
          ops_limit: 20,
          include_renewals: false,
          include_addons: false,
          include_agents: false,
          include_announcements: false
        });
      } catch (bootErr) {
        console.warn("[refreshAll] bootstrap failed, fallback:", bootErr);
        await Promise.allSettled([loadRequests(), loadCards(), loadPayments()]);
        renderRequests(); renderCards(); renderDashboard();
        return;
      }

      if (boot.requests) state.requests     = normalizeList(boot.requests,  ["requests", "items"]);
      if (boot.cards)    state.cards        = normalizeList(boot.cards,     ["cards", "items"]);
      if (boot.payments) {
        const rows = normalizeList(boot.payments, ["payments", "items"]);
        state.payments = rows; state.paymentList = rows;
      }
      if (boot.ops_logs) state.opsLogs      = normalizeList(boot.ops_logs,  ["ops_logs", "items"]);

      renderRequests();
      renderCards();
      renderPayments();
      renderDashboard();
      renderDashboardOpsLogs();

    } finally {
      setLoading(false);
    }

    // ── 第二層：背景靜默載入 ──
    const bgJobs = [
      loadRenewalList(),
      loadAddons(),
      loadAgents(),
      loadAnnouncements(),
      loadCommissionList(),
    ];

    Promise.allSettled(bgJobs).then(() => {
      renderDashboard();
    });
  }

  // ── BIND EVENTS ──
  function bindEvents() {
    on("#btnSaveKey", "click", () => {
      const key = valueOf("#adminKeyInput");
      if (!key) return toast("請輸入 Key");
      saveAdminKey(key);
      const inputEl = $("#adminKeyInput"); if (inputEl) inputEl.value = "";
      renderKeyStatus();
      refreshAll();
    });
    on("#adminKeyInput", "keydown", (e) => { if (e.key === "Enter") $("#btnSaveKey")?.click(); });
    on("#btnClearKey", "click", () => { clearAdminKey(); renderKeyStatus(); toast("已清除 Key"); });
    on("#btnRefreshAll", "click", refreshAll);
    on("#btnRefreshPayments", "click", loadPaymentList);
    on("#btnRefreshRenewalList", "click", loadRenewalList);
    on("#btnReloadCards", "click", async () => { const s = $("#cardSearch"); if (s) s.value = ""; await loadCards(); });
    on("#btnLoadCardDetail", "click", () => window.loadCardDetail(valueOf("#detailCardId")));
    on("#btnReloadAddons", "click", async () => { const s = $("#addonSearch"); if (s) s.value = ""; await loadAddons(); });
    on("#btnReloadAgents", "click", async () => { const s = $("#agentSearch"); if (s) s.value = ""; await loadAgents(); });
    on("#btnLoadCommissions", "click", loadCommissionList);
    on("#btnRefreshAnnouncements", "click", loadAnnouncements);
    on("#btnSaveAnnouncement", "click", saveAnnouncement);
    on("#btnRefreshTracking", "click", loadTrackingSummary);
    on("#btnGetCardTracking", "click", async () => {
      const cardId = valueOf("#trackingCardId"); if (!cardId) return toast("請輸入卡片 ID");
      try { const data = await apiGet("getCardTrackingStats", { card_id: cardId }); state.cardTrackingDetail = data.tracking || data || {}; renderTrackingDetail($('#cardTrackingDetail'), state.cardTrackingDetail); }
      catch { toast("查詢失敗"); }
    });
    on("#btnGetAgentTracking", "click", async () => {
      const agentId = valueOf("#trackingAgentId"); if (!agentId) return toast("請輸入代理 ID");
      try { const data = await apiGet("getAgentTrackingStats", { agent_id: agentId }); state.agentTrackingDetail = data.tracking || data || {}; renderTrackingDetail($('#agentTrackingDetail'), state.agentTrackingDetail); }
      catch { toast("查詢失敗"); }
    });
    on("#btnCheckSchema", "click", checkSchemaStatus);
    on("#btnRunDailyOps", "click", runDailyOps);
    on("#btnRepairDueAt", "click", () => runRepairAction("due_at"));
    on("#btnRepairAddonStatusTool", "click", () => runRepairAction("addon_status"));
    on("#btnRepairDataValidation", "click", () => runRepairAction("data_validation"));
    on("#btnNormalizeCardTheme", "click", () => runRepairAction("normalize_card_theme"));
    on("#btnAuditCardTheme", "click", () => runRepairAction("audit_card_theme"));
    on("#btnInstallSystemTriggers", "click", () => runRepairAction("install_system_triggers"));
    on("#btnInstallCommercialTriggers", "click", () => runRepairAction("install_commercial_triggers"));
    on("#btnAssignInviteToRequest", "click", assignInviteToRequestAligned);
    on("#btnRefreshRequests", "click", loadRequests);
    on("#btnLoadDelivery", "click", async () => {
      const cardId = valueOf("#deliveryCardIdInput");
      if (!cardId) return toast("請輸入卡片 ID");
      await window.loadCardDetail(cardId);
      const c = $('#deliveryContent'); if (c) c.style.display = 'block';
      const e = $('#deliveryEmpty'); if (e) e.style.display = 'none';
    });

    // ── Debounce 搜尋 ──
    const cardSearchEl = $("#cardSearch");
    if (cardSearchEl) {
      cardSearchEl.addEventListener("input", debounce(() => {
        state._cardPage = 1;
        renderCards();
      }, 220));
    }
    const addonSearchEl = $("#addonSearch");
    if (addonSearchEl) addonSearchEl.addEventListener("input", debounce(renderAddons, 220));
    const agentSearchEl = $("#agentSearch");
    if (agentSearchEl) agentSearchEl.addEventListener("input", debounce(renderAgents, 220));

    window.renderCards = renderCards;
    window.renderAddons = renderAddons;
    window.renderAgents = renderAgents;
  }

  function init() {
    injectLedgerSection();
    bindEvents();

    const urlKey = new URLSearchParams(window.location.search).get("key");
    if (urlKey && urlKey.trim()) {
      saveAdminKey(urlKey.trim());
      window.history.replaceState({}, "", window.location.pathname);
    }

    renderKeyStatus();

    const savedKey = getAdminKey();
    const keyInput = $("#adminKeyInput");
    if (savedKey && keyInput) keyInput.placeholder = "Key 已儲存 ✓";

    if (savedKey) refreshAll();
    else toast("⚠️ 請輸入後段 Key（1972070707）");
  }

  document.addEventListener("DOMContentLoaded", init);

  // ─── RECOGNITION QUEUE ───
  function renderRecognitionQueue(items) {
    const con = $("#recognitionListContainer"); if (!con) return;
    if (!items.length) { con.innerHTML = '<div class="empty-state">尚無待採認項目</div>'; return; }
    con.innerHTML = items.map(item => {
      const rid = escapeHtml(String(item.recognition_id || item.id || ""));
      return `<div class="list-row" id="recrow-${rid}">
        <div class="list-row-head" data-row="${rid}" data-type="recognition">
          <div class="list-row-icon icon-pending">✅</div>
          <div class="list-row-info">
            <div class="list-row-title">${escapeHtml(String(item.card_id || ""))} · ${escapeHtml(String(item.event_type || ""))}</div>
            <div class="list-row-sub">${rid} · 代理：${escapeHtml(String(item.agent_id || ""))}</div>
          </div>
          <div class="list-row-right"><span class="badge badge-warn">${escapeHtml(String(item.result || "pending"))}</span></div>
          <span class="chevron" style="margin-left:6px;">›</span>
        </div>
        <div class="list-row-body">
          <div class="detail-grid" style="margin-top:0;">
            ${renderDetailItem("採認ID", item.recognition_id || item.id)}
            ${renderDetailItem("事件類型", item.event_type)}
            ${renderDetailItem("事件ID", item.event_id)}
            ${renderDetailItem("卡片ID", item.card_id)}
            ${renderDetailItem("代理ID", item.agent_id)}
            ${renderDetailItem("採認時間", item.recognized_at)}
          </div>
          <div class="field" style="margin-top:10px;"><label>service_log_id（選填）</label><input type="text" id="rLogId-${rid}" placeholder="service_log_id"></div>
          <div class="field"><label>備註（選填）</label><input type="text" id="rNote-${rid}" placeholder="備註"></div>
          <div class="action-strip">
            <button class="btn btn-ok btn-sm btn-rec-approve" data-id="${rid}">核准</button>
            <button class="btn btn-danger btn-sm btn-rec-reject" data-id="${rid}">拒絕</button>
          </div>
        </div>
      </div>`;
    }).join("");
    con.querySelectorAll(".list-row-head[data-type='recognition']").forEach(h =>
      h.addEventListener("click", () => document.getElementById(`recrow-${h.dataset.row}`)?.classList.toggle("open")));
    con.querySelectorAll(".btn-rec-approve").forEach(b =>
      b.addEventListener("click", e => { e.stopPropagation(); approveRecognitionFromUi(b.dataset.id); }));
    con.querySelectorAll(".btn-rec-reject").forEach(b =>
      b.addEventListener("click", e => { e.stopPropagation(); rejectRecognitionFromUi(b.dataset.id); }));
  }
  async function approveRecognitionFromUi(rid) {
    if (!confirm("核准此採認單？")) return;
    if (!doubleConfirmId(rid, "採認單")) return;
    const sli = document.getElementById(`rLogId-${rid}`);
    const ni = document.getElementById(`rNote-${rid}`);
    try {
      await apiPost("approveRecognition", { recognition_id: rid, service_log_id: sli?.value?.trim() || undefined, note: ni?.value?.trim() || undefined });
      toast("✅ 已核准");
      await loadRecognitionQueues();
    } catch (e) { toast(`核准失敗：${e.message}`); }
  }
  async function rejectRecognitionFromUi(rid) {
    if (!confirm("拒絕此採認單？")) return;
    if (!doubleConfirmId(rid, "採認單")) return;
    const ni = document.getElementById(`rNote-${rid}`);
    try {
      await apiPost("rejectRecognition", { recognition_id: rid, note: ni?.value?.trim() || undefined });
      toast("❌ 已拒絕");
      await loadRecognitionQueues();
    } catch (e) { toast(`拒絕失敗：${e.message}`); }
  }
  async function loadRecognitionQueues() {
    try {
      const action = state.currentRecognitionType === "addon" ? "getAddonRecognitionQueue" : "getRenewalRecognitionQueue";
      const items = normalizeList(await apiGet(action), ["items", "queue"]);
      if (state.currentRecognitionType === "renewal") state.recognitionRenewalItems = items;
      else state.recognitionAddonItems = items;
      renderRecognitionQueue(items);
    } catch { renderRecognitionQueue([]); }
  }

  // ─── AGENT DETAIL ───
  function renderAgentDetail(agent) {
    const wrap = $("#agentDetailWrap"); if (!wrap) return;
    if (!agent || !Object.keys(agent).length) { wrap.innerHTML = '<div class="empty-state">查無代理詳情</div>'; return; }
    const agid = escapeHtml(String(agent.agent_id || ""));
    const dg = Object.entries(agent).map(([k, v]) => renderDetailItem(k, formatValue(v))).join("");
    wrap.innerHTML = `
      <div class="detail-grid" style="margin-top:0;">${dg}</div>
      <div class="divider"></div>
      <div style="font-size:13px;font-weight:800;margin-bottom:10px;">編輯代理資料</div>
      <div class="field"><label>姓名</label><input type="text" id="editAgentName" value="${escapeHtml(String(agent.owner_name || ''))}"></div>
      <div class="field"><label>電話</label><input type="text" id="editAgentPhone" value="${escapeHtml(String(agent.phone || ''))}"></div>
      <div class="field"><label>Email</label><input type="email" id="editAgentEmail" value="${escapeHtml(String(agent.email || ''))}"></div>
      <div class="field"><label>代理類型</label><input type="text" id="editAgentType" value="${escapeHtml(String(agent.agent_type || ''))}"></div>
      <div class="action-strip">
        <button class="btn btn-primary btn-sm" id="btnUpdateAgentD" data-id="${agid}">更新資料</button>
        <button class="btn btn-danger btn-sm" id="btnFreezeAgentD" data-id="${agid}">凍結</button>
        <button class="btn btn-soft btn-sm" id="btnUnfreezeAgentD" data-id="${agid}">解凍</button>
      </div>
      <div class="divider"></div>
      <div style="font-size:13px;font-weight:800;margin-bottom:10px;">升級設定</div>
      <div class="field"><label>目標等級（target_tier）</label><input type="text" id="editTargetTier" placeholder="例如：silver / gold" value="${escapeHtml(String(agent.target_tier || ''))}"></div>
      <button class="btn btn-warn btn-sm" id="btnSetUpgradeD" data-id="${agid}">設定可升級</button>
      <div class="divider"></div>
      <div style="font-size:13px;font-weight:800;margin-bottom:8px;">點數 / 分潤紀錄</div>
      <div id="agentLogsWrap"><div class="empty-state">載入中…</div></div>`;

    wrap.querySelector("#btnUpdateAgentD")?.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      try {
        const res = await apiPost("adminUpdateAgent", { agent_id: id, owner_name: valueOf("#editAgentName"), phone: valueOf("#editAgentPhone"), email: valueOf("#editAgentEmail"), agent_type: valueOf("#editAgentType") });
        toast("✅ 已更新");
        if (res?.agent) { patchListItem(state.agents, "agent_id", id, res.agent); renderAgents(); }
        await loadAgentDetail(id);
      } catch (e) { toast(`更新失敗：${e.message}`); }
    });
    wrap.querySelector("#btnFreezeAgentD")?.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm(`凍結代理 ${id}？`)) return;
      if (!doubleConfirmId(id, "代理")) return;
      try { const res = await apiPost("adminFreezeAgent", { agent_id: id }); toast("✅ 已凍結"); if (res?.agent) { patchListItem(state.agents, "agent_id", id, res.agent); renderAgents(); } await loadAgentDetail(id); }
      catch (e) { toast(`凍結失敗：${e.message}`); }
    });
    wrap.querySelector("#btnUnfreezeAgentD")?.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm(`解凍代理 ${id}？`)) return;
      if (!doubleConfirmId(id, "代理")) return;
      try { const res = await apiPost("adminUnfreezeAgent", { agent_id: id }); toast("✅ 已解凍"); if (res?.agent) { patchListItem(state.agents, "agent_id", id, res.agent); renderAgents(); } await loadAgentDetail(id); }
      catch (e) { toast(`解凍失敗：${e.message}`); }
    });
    wrap.querySelector("#btnSetUpgradeD")?.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      const tier = valueOf("#editTargetTier");
      if (!tier) return toast("請輸入目標等級");
      if (!doubleConfirmId(id, "代理")) return;
      try { await apiPost("adminSetAgentUpgrade", { agent_id: id, target_tier: tier }); toast("✅ 升級已設定"); await loadAgentDetail(id); }
      catch (e) { toast(`設定失敗：${e.message}`); }
    });
    loadAgentLogs(String(agent.agent_id || ""));
  }

  async function loadAgentLogs(agid) {
    const wrap = document.getElementById("agentLogsWrap"); if (!wrap) return;
    try {
      const [pl, cl] = await Promise.all([apiGet("getAgentPointsLog", { agent_id: agid }), apiGet("getAgentCommissionLog", { agent_id: agid })]);
      const pRows = normalizeList(pl, ["logs"]);
      const cRows = normalizeList(cl, ["logs"]);
      function fvk(obj, keys) { for (const k of keys) { const v = obj && obj[k]; if (v !== undefined && v !== null && String(v).trim()) return v; } return ""; }
      wrap.innerHTML = `
        <div style="font-size:12px;font-weight:900;color:var(--ink3);margin-bottom:6px;">點數紀錄</div>
        ${pRows.length ? pRows.map(r => `<div class="risk-item" style="background:var(--surface2);border-left-color:var(--border);color:var(--ink2);margin-bottom:4px;"><span style="color:var(--ink3);font-size:11px;">${escapeHtml(formatValue(fvk(r, ["created_at", "time"])))}</span><span style="margin-left:6px;">${escapeHtml(formatValue(fvk(r, ["type", "action"])))} ${escapeHtml(formatValue(fvk(r, ["before_balance", "before"])))}→${escapeHtml(formatValue(fvk(r, ["after_balance", "after"])))}</span></div>`).join("") : "<div class='empty-state'>沒有點數紀錄</div>"}
        <div style="font-size:12px;font-weight:900;color:var(--ink3);margin:10px 0 6px;">分潤紀錄</div>
        ${cRows.length ? cRows.map(r => `<div class="risk-item" style="background:var(--surface2);border-left-color:var(--border);color:var(--ink2);margin-bottom:4px;"><span style="color:var(--ink3);font-size:11px;">${escapeHtml(formatValue(fvk(r, ["created_at", "time"])))}</span><span style="margin-left:6px;">$${escapeHtml(formatValue(fvk(r, ["amount"])))} ${escapeHtml(formatValue(fvk(r, ["note", "memo"])))}</span></div>`).join("") : "<div class='empty-state'>沒有分潤紀錄</div>"}`;
    } catch { wrap.innerHTML = "<div class='empty-state'>無法載入紀錄</div>"; }
  }

  // ─── REQUEST TRACE ───
  function renderRequestTrace(trace) {
    const wrap = document.getElementById("requestTraceWrap"); if (!wrap) return;
    if (!trace) { wrap.innerHTML = "<div class='empty-state'>無追蹤資料</div>"; return; }
    let html = "";
    if (trace.message) html += `<div class="risk-item info" style="margin-bottom:8px;">${escapeHtml(trace.message)}</div>`;
    html += `<div style="font-size:12px;font-weight:900;color:var(--ink3);margin-bottom:6px;">📌 申請單</div>`;
    html += `<div class="result-box" style="margin-bottom:10px;">${escapeHtml(JSON.stringify(trace.request, null, 2))}</div>`;
    if (trace.invite) {
      html += `<div style="font-size:12px;font-weight:900;color:var(--ink3);margin-bottom:6px;">🎫 邀請碼</div>`;
      html += `<div class="result-box" style="margin-bottom:10px;">${escapeHtml(JSON.stringify(trace.invite, null, 2))}</div>`;
    } else { html += `<div class="risk-item warn" style="margin-bottom:8px;">尚未產生邀請碼</div>`; }
    if (trace.lead) {
      html += `<div style="font-size:12px;font-weight:900;color:var(--ink3);margin-bottom:6px;">👤 客戶</div>`;
      html += `<div class="result-box" style="margin-bottom:10px;">${escapeHtml(JSON.stringify(trace.lead, null, 2))}</div>`;
      if (trace.lead.converted_card_id) html += `<button class="btn btn-primary btn-sm" id="btnTraceCard" data-cid="${escapeHtml(trace.lead.converted_card_id)}">查看卡片</button>`;
    } else { html += `<div class="risk-item" style="background:var(--surface2);border-left-color:var(--border);color:var(--ink3);">尚未轉換成卡片</div>`; }
    wrap.innerHTML = html;
    wrap.querySelector("#btnTraceCard")?.addEventListener("click", e => window.loadCardDetail?.(e.currentTarget.dataset.cid));
  }

  async function triggerPaymentReminderForCard(cid) {
    try { await apiPost("triggerRenewalPaymentReminder", { card_id: cid }); toast("✅ 付款提醒已觸發"); }
    catch (e) { toast(`觸發失敗：${e.message}`); }
  }
  async function buildAndCopyRenewalText(cid) {
    try {
      const data = await apiGet("buildRenewalReminderText", { card_id: cid });
      const text = data.text || data.message || "";
      if (text) copyText(text, "✅ 已複製續約文案");
      else toast("無法產生文案");
    } catch {
      copyText(`您好，您的名片服務即將到期，請點擊以下連結完成續約：\n${buildRenewalLink(cid)}`, "⚠️ 已複製備用文案");
    }
  }
})();
/* ============================================================
   HSC ADMIN · 維護模式功能 PATCH for admin.js
============================================================ */

(function initAdminMaintenance() {
  "use strict";

  const MAINT_GAS_URL = "https://angel-namecard.letssyncus.com/gas-proxy/exec";

  function $m(s) { return document.querySelector(s); }

  function getMaintAdminKey() {
    const suffix = localStorage.getItem("hsc_admin_key") || "";
    if (suffix.startsWith("ANGEL2026")) return suffix;
    return suffix ? "ANGEL2026" + suffix : "";
  }

  function maintToast(msg) {
    if (typeof window._hscToast === "function") window._hscToast(msg);
    else alert(msg);
  }

  function maintEscapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function maintFormatDate(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${y}/${m}/${day} ${hh}:${mm}`;
    } catch (_e) {
      return iso;
    }
  }

  async function loadMaintStatus() {
    try {
      const res = await fetch(`${MAINT_GAS_URL}?action=getMaintenanceStatus&_t=${Date.now()}`, { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.error || "查詢失敗");
      return data.maintenance || { enabled: false };
    } catch (err) {
      console.warn("[admin maint] loadStatus failed:", err);
      return null;
    }
  }

  async function activateMaintenance(message, endAt, title) {
    const key = getMaintAdminKey();
    if (!key) { maintToast("⚠️ 請先設定 Admin Key"); return false; }
    const url = new URL(MAINT_GAS_URL);
    url.searchParams.set("action", "adminSetMaintenance");
    url.searchParams.set("admin_key", key);
    url.searchParams.set("enabled", "true");
    if (message) url.searchParams.set("message", message);
    if (endAt) url.searchParams.set("end_at", endAt);
    if (title) url.searchParams.set("title", title);
    try {
      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.error || "啟動失敗");
      return data;
    } catch (err) {
      maintToast("啟動維護失敗:" + err.message);
      return null;
    }
  }

  async function deactivateMaintenance() {
    const key = getMaintAdminKey();
    if (!key) { maintToast("⚠️ 請先設定 Admin Key"); return false; }
    const url = new URL(MAINT_GAS_URL);
    url.searchParams.set("action", "adminSetMaintenance");
    url.searchParams.set("admin_key", key);
    url.searchParams.set("enabled", "false");
    try {
      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.error || "關閉失敗");
      return data;
    } catch (err) {
      maintToast("關閉維護失敗:" + err.message);
      return null;
    }
  }

  function renderMaintStatus(info) {
    const badge = $m("#maintStatusBadge");
    const wrap = $m("#maintStatusWrap");
    if (!badge || !wrap) return;
    if (!info) {
      badge.textContent = "查詢失敗";
      badge.style.background = "var(--danger-bg)";
      badge.style.color = "var(--danger)";
      wrap.innerHTML = '<div style="color:var(--danger);">❌ 無法查詢維護狀態</div>';
      return;
    }
    if (info.enabled) {
      badge.textContent = "🔴 維護中";
      badge.style.background = "var(--danger-bg)";
      badge.style.color = "var(--danger)";
      wrap.innerHTML = `
        <div style="font-weight:900;color:var(--danger);margin-bottom:6px;">🔴 目前處於維護模式</div>
        <div style="color:var(--ink);margin-bottom:4px;"><strong>訊息:</strong> ${maintEscapeHtml(info.message || "-")}</div>
        ${info.start_at ? `<div style="color:var(--ink2);font-size:12px;">開始時間:${maintEscapeHtml(maintFormatDate(info.start_at))}</div>` : ""}
        ${info.end_at ? `<div style="color:var(--ink2);font-size:12px;">預計結束:${maintEscapeHtml(maintFormatDate(info.end_at))}</div>` : '<div style="color:var(--ink2);font-size:12px;">⚠️ 未設定結束時間(需手動關閉)</div>'}
      `;
    } else {
      badge.textContent = "🟢 服務正常";
      badge.style.background = "var(--ok-bg)";
      badge.style.color = "var(--ok)";
      wrap.innerHTML = '<div style="color:var(--ok);font-weight:900;">🟢 系統運作正常,客戶端可正常使用</div>';
    }
  }

  async function refreshMaintStatus() {
    const info = await loadMaintStatus();
    renderMaintStatus(info);
    return info;
  }

  function bindMaintEvents() {
    const head = $m("#maintActivateHead");
    const collapsible = $m("#maintActivateCollapsible");
    if (head && collapsible) {
      head.addEventListener("click", () => collapsible.classList.toggle("open"));
    }
    $m("#btnMaintActivate")?.addEventListener("click", async () => {
      const message = ($m("#maintInputMessage")?.value || "").trim();
      const endAtRaw = ($m("#maintInputEndAt")?.value || "").trim();
      const title = ($m("#maintInputTitle")?.value || "").trim();
      if (!message) { maintToast("請填寫維護訊息"); return; }
      let endAt = "";
      if (endAtRaw) { endAt = endAtRaw.length === 16 ? endAtRaw + ":00" : endAtRaw; }
      if (!confirm(`確認啟動維護模式?\n\n訊息:${message}\n${endAt ? `結束時間:${maintFormatDate(endAt)}` : "無結束時間(需手動關閉)"}\n\n啟動後所有客戶端 API 會被攔下,只有帶 admin_key 才能操作。`)) return;
      const result = await activateMaintenance(message, endAt, title);
      if (result) {
        maintToast("🔴 維護模式已啟動");
        if ($m("#maintInputMessage")) $m("#maintInputMessage").value = "";
        if ($m("#maintInputEndAt")) $m("#maintInputEndAt").value = "";
        if ($m("#maintInputTitle")) $m("#maintInputTitle").value = "";
        collapsible?.classList.remove("open");
        await refreshMaintStatus();
      }
    });
    $m("#btnMaintDeactivate")?.addEventListener("click", async () => {
      if (!confirm("確認關閉維護模式?\n\n關閉後客戶端將立即恢復正常使用。")) return;
      const result = await deactivateMaintenance();
      if (result) { maintToast("🟢 維護模式已關閉"); await refreshMaintStatus(); }
    });
    $m("#btnMaintRefresh")?.addEventListener("click", async () => {
      await refreshMaintStatus();
      maintToast("狀態已更新");
    });
    document.querySelectorAll('[data-section="systemSection"]').forEach(btn => {
      btn.addEventListener("click", () => { setTimeout(refreshMaintStatus, 200); });
    });
    setTimeout(() => {
      const sysSection = $m("#systemSection");
      if (sysSection && sysSection.classList.contains("active")) { refreshMaintStatus(); }
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMaintEvents);
  } else {
    bindMaintEvents();
  }

  window.refreshMaintStatus = refreshMaintStatus;
})();

/* ============================================================
   HSC ADMIN · R0g:測試卡清理 PATCH for admin.js
============================================================ */

(function initAdminTestCardsPurge() {
  "use strict";

  const PURGE_GAS_URL = "https://angel-namecard.letssyncus.com/gas-proxy/exec";

  function $p(s) { return document.querySelector(s); }

  function getPurgeAdminKey() {
    const suffix = localStorage.getItem("hsc_admin_key") || "";
    if (suffix.startsWith("ANGEL2026")) return suffix;
    return suffix ? "ANGEL2026" + suffix : "";
  }

  function purgeToast(msg) {
    if (typeof window._hscToast === "function") window._hscToast(msg);
    else alert(msg);
  }

  function purgeEsc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  let _testCardsCache = [];

  async function loadTestCards() {
    const key = getPurgeAdminKey();
    if (!key) { purgeToast("⚠️ 請先設定 Admin Key"); return; }
    const wrap = $p("#testCardsListWrap");
    const badge = $p("#testCardsCountBadge");
    const purgeBtn = $p("#btnPurgeSelectedTestCards");
    if (wrap) wrap.innerHTML = '<div class="empty-state" style="padding:20px;font-size:13px;">載入中…</div>';
    if (badge) { badge.textContent = "查詢中…"; badge.style.background = "var(--info-bg)"; badge.style.color = "var(--info)"; }
    try {
      const res = await fetch(PURGE_GAS_URL, {
        method: "POST", redirect: "follow",
        body: JSON.stringify({ action: "adminListTestCards", admin_key: key })
      });
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.error || "載入失敗");
      _testCardsCache = data.cards || [];
      renderTestCardsList(_testCardsCache);
      if (badge) {
        badge.textContent = `共 ${data.count || 0} 張`;
        badge.style.background = data.count > 0 ? "var(--warn-bg)" : "var(--ok-bg)";
        badge.style.color = data.count > 0 ? "var(--warn)" : "var(--ok)";
      }
      if (purgeBtn) purgeBtn.disabled = (data.count || 0) === 0;
    } catch (err) {
      if (wrap) wrap.innerHTML = `<div class="empty-state" style="padding:20px;font-size:13px;color:var(--danger);">❌ 載入失敗:${purgeEsc(err.message)}</div>`;
      if (badge) { badge.textContent = "載入失敗"; badge.style.background = "var(--danger-bg)"; badge.style.color = "var(--danger)"; }
    }
  }

  function renderTestCardsList(cards) {
    const wrap = $p("#testCardsListWrap");
    if (!wrap) return;
    if (!cards || !cards.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:20px;font-size:13px;">🎉 沒有測試卡需要清理</div>';
      return;
    }
    wrap.innerHTML = cards.map(c => `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;">
        <input type="checkbox" class="test-card-cb" value="${purgeEsc(c.id)}" style="width:16px;height:16px;flex-shrink:0;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:800;color:var(--ink);">${purgeEsc(c.id)} <span style="font-weight:400;color:var(--ink3);">·</span> ${purgeEsc(c.name || "(無名)")}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${purgeEsc(c.plan || "-")} · ${purgeEsc(c.billing_status || "-")} · ${purgeEsc(c.match_reason || "")}</div>
        </div>
      </label>`).join("");
    wrap.querySelectorAll(".test-card-cb").forEach(cb => {
      cb.addEventListener("change", updatePurgeBtnState);
    });
  }

  function updatePurgeBtnState() {
    const checked = document.querySelectorAll(".test-card-cb:checked");
    const purgeBtn = $p("#btnPurgeSelectedTestCards");
    if (purgeBtn) {
      purgeBtn.disabled = checked.length === 0;
      purgeBtn.textContent = checked.length > 0 ? `🗑️ 批次刪除選取(${checked.length} 張)` : "🗑️ 批次刪除選取";
    }
  }

  async function purgeSelectedTestCards() {
    const checked = Array.from(document.querySelectorAll(".test-card-cb:checked"));
    if (!checked.length) { purgeToast("請先勾選要刪的卡"); return; }
    const cardIds = checked.map(cb => cb.value);
    if (!confirm(`⚠️ 確定刪除 ${cardIds.length} 張測試卡?\n\n卡號:${cardIds.join(", ")}\n\n此操作會連帶清除 payment / renewal / commission / agent 等所有資料。`)) return;
    const reason = prompt(`請輸入刪除原因(必填,審計用):`);
    if (!reason || !reason.trim()) { purgeToast("❌ 必須輸入刪除原因"); return; }
    const operator = prompt(`請輸入操作者名稱(必填,審計用):`, "admin");
    if (!operator || !operator.trim()) { purgeToast("❌ 必須輸入操作者"); return; }
    const key = getPurgeAdminKey();
    const resultWrap = $p("#testCardsResultWrap");
    const purgeBtn = $p("#btnPurgeSelectedTestCards");
    if (purgeBtn) { purgeBtn.disabled = true; purgeBtn.textContent = "處理中…"; }
    if (resultWrap) resultWrap.innerHTML = "🔄 開始批次刪除…";
    let succeeded = 0, failed = 0;
    const errors = [];
    for (let i = 0; i < cardIds.length; i++) {
      const cardId = cardIds[i];
      if (resultWrap) resultWrap.innerHTML = `🔄 處理中 ${i + 1}/${cardIds.length}:${purgeEsc(cardId)}…`;
      try {
        const res = await fetch(PURGE_GAS_URL, {
          method: "POST", redirect: "follow",
          body: JSON.stringify({ action: "adminDeleteTestCard", admin_key: key, card_id: cardId, confirm: "YES_DELETE_FOREVER", operated_by: operator.trim(), reason: reason.trim() })
        });
        const data = await res.json();
        if (!data || !data.ok) throw new Error(data?.error || data?.message || "刪除失敗");
        succeeded++;
      } catch (err) { failed++; errors.push(`${cardId}: ${err.message}`); }
    }
    if (resultWrap) {
      resultWrap.innerHTML = `
        <div style="background:${failed > 0 ? 'var(--warn-bg)' : 'var(--ok-bg)'};border-radius:var(--radius-sm);padding:10px 12px;font-weight:800;color:${failed > 0 ? 'var(--warn)' : 'var(--ok)'};">
          ${failed === 0 ? "✅" : "⚠️"} 完成:成功 ${succeeded} 張,失敗 ${failed} 張
        </div>
        ${errors.length ? `<div style="margin-top:8px;color:var(--danger);font-size:11px;">${purgeEsc(errors.join("\n"))}</div>` : ""}`;
    }
    purgeToast(`✅ 完成:成功 ${succeeded} / 失敗 ${failed}`);
    setTimeout(() => loadTestCards(), 800);
  }

  function bindPurgeEvents() {
    $p("#btnLoadTestCards")?.addEventListener("click", loadTestCards);
    $p("#btnPurgeSelectedTestCards")?.addEventListener("click", purgeSelectedTestCards);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindPurgeEvents);
  } else {
    bindPurgeEvents();
  }

  window.loadTestCards = loadTestCards;
  window.purgeSelectedTestCards = purgeSelectedTestCards;
})();

// ── 推播記錄 ──
async function loadCardOpsLogs(cardId) {
  let wrap = document.getElementById('cardOpsLogsWrap');
  if (!wrap) {
    const detailWrap = document.getElementById('cardDetailWrap');
    if (!detailWrap) return;
    wrap = document.createElement('div');
    wrap.id = 'cardOpsLogsWrap';
    detailWrap.appendChild(wrap);
  }
  wrap.innerHTML = `
    <div class="section-label" style="margin-top:16px;">📋 推播記錄</div>
    <div id="cardOpsLogsList"><div class="empty-state" style="padding:16px;">載入中…</div></div>`;
  try {
    const GAS_URL = 'https://angel-namecard.letssyncus.com/gas-proxy/exec';
    const k = localStorage.getItem('hsc_admin_key') || '';
    const adminKey = k.startsWith('ANGEL2026') ? k : 'ANGEL2026' + k;
    const url = `${GAS_URL}?action=getCardOpsLogs&admin_key=${encodeURIComponent(adminKey)}&card_id=${encodeURIComponent(cardId)}`;
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const data = await res.json();
    const items = (data && (data.items || data.list || data.rows)) || [];
    renderCardOpsLogs(items, cardId);
  } catch (err) {
    const listEl = document.getElementById('cardOpsLogsList');
    if (listEl) listEl.innerHTML = `<div class="empty-state" style="padding:16px;color:var(--danger);">載入失敗：${err.message}</div>`;
  }
}

function renderCardOpsLogs(items, cardId) {
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const txt = v => v == null ? '' : String(v).trim();
  const GAS_URL = 'https://angel-namecard.letssyncus.com/gas-proxy/exec';
  const getKey = () => { const k = localStorage.getItem('hsc_admin_key')||''; return k.startsWith('ANGEL2026')?k:'ANGEL2026'+k; };
  const listEl = document.getElementById('cardOpsLogsList');
  if (!listEl) return;
  if (!items || !items.length) {
    listEl.innerHTML = '<div class="empty-state" style="padding:16px;">尚無記錄</div>';
    return;
  }
  const moduleIcon = { delivery: '📦', renewal: '🔄', invite: '🎫', line_bind: '🔗', update_fee: '✏️' };
  const statusIcon = s => {
    const v = String(s || '').toLowerCase();
    if (v.includes('fail') || v.includes('error')) return '❌';
    if (v.includes('delivered') || v.includes('notified') || v.includes('assigned')) return '✅';
    return '📝';
  };
  listEl.innerHTML = items.map(r => {
    const lid = esc(txt(r.log_id));
    const icon = moduleIcon[r.module] || '📝';
    const si = statusIcon(r.after_status);
    const dt = txt(r.created_at).slice(0, 16).replace('T', ' ');
    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);" id="opslog-${lid}">
        <div style="font-size:18px;flex-shrink:0;line-height:1.4;">${si}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:800;color:var(--ink);">${icon} ${esc(txt(r.module))} · ${esc(txt(r.action))}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${esc(dt)} · ${esc(txt(r.after_status))}</div>
          <div id="opslog-note-${lid}" style="font-size:12px;color:var(--ink2);margin-top:4px;white-space:pre-wrap;word-break:break-word;">${esc(txt(r.note))}</div>
          <div id="opslog-edit-${lid}" style="display:none;margin-top:6px;">
            <textarea id="opslog-textarea-${lid}" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;min-height:60px;">${esc(txt(r.note))}</textarea>
            <div style="display:flex;gap:6px;margin-top:4px;">
              <button class="btn btn-primary btn-sm" data-save-log="${lid}">儲存</button>
              <button class="btn btn-soft btn-sm" data-cancel-log="${lid}">取消</button>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
          <button class="btn btn-soft btn-sm" data-edit-log="${lid}" style="padding:0 8px;height:28px;font-size:11px;">✏️</button>
          <button class="btn btn-danger btn-sm" data-del-log="${lid}" style="padding:0 8px;height:28px;font-size:11px;">🗑️</button>
        </div>
      </div>`;
  }).join('');
  listEl.querySelectorAll('[data-edit-log]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lid = btn.dataset.editLog;
      document.getElementById(`opslog-note-${lid}`).style.display = 'none';
      document.getElementById(`opslog-edit-${lid}`).style.display = 'block';
    });
  });
  listEl.querySelectorAll('[data-cancel-log]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lid = btn.dataset.cancelLog;
      document.getElementById(`opslog-note-${lid}`).style.display = '';
      document.getElementById(`opslog-edit-${lid}`).style.display = 'none';
    });
  });
  listEl.querySelectorAll('[data-save-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lid = btn.dataset.saveLog;
      const note = document.getElementById(`opslog-textarea-${lid}`)?.value || '';
      try {
        const res = await fetch(GAS_URL, {
          method: 'POST', redirect: 'follow',
          body: JSON.stringify({ action: 'adminUpdateOpsLog', admin_key: getKey(), log_id: lid, note })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '失敗');
        document.getElementById(`opslog-note-${lid}`).textContent = note;
        document.getElementById(`opslog-note-${lid}`).style.display = '';
        document.getElementById(`opslog-edit-${lid}`).style.display = 'none';
        window._hscToast?.('✅ 已更新');
      } catch (err) { window._hscToast?.(`更新失敗：${err.message}`); }
    });
  });
  listEl.querySelectorAll('[data-del-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lid = btn.dataset.delLog;
      if (!confirm('確定刪除這筆記錄？')) return;
      try {
        const res = await fetch(GAS_URL, {
          method: 'POST', redirect: 'follow',
          body: JSON.stringify({ action: 'adminDeleteOpsLog', admin_key: getKey(), log_id: lid })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '失敗');
        document.getElementById(`opslog-${lid}`)?.remove();
        window._hscToast?.('✅ 已刪除');
      } catch (err) { window._hscToast?.(`刪除失敗：${err.message}`); }
    });
  });
}
async function loadOpsLogInline(cardId, listEl) {
  listEl.innerHTML = '<div class="empty-state" style="padding:10px;font-size:12px;">載入中…</div>';
  try {
    const GAS_URL = 'https://angel-namecard.letssyncus.com/gas-proxy/exec';
    const k = localStorage.getItem('hsc_admin_key') || '';
    const adminKey = k.startsWith('ANGEL2026') ? k : 'ANGEL2026' + k;
    const url = `${GAS_URL}?action=getCardOpsLogs&admin_key=${encodeURIComponent(adminKey)}&card_id=${encodeURIComponent(cardId)}`;
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const data = await res.json();
    const items = (data && (data.items || data.list || data.rows)) || [];
    renderOpsLogInline(items, cardId, listEl);
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state" style="padding:10px;font-size:12px;color:var(--danger);">載入失敗：${err.message}</div>`;
  }
}

function renderOpsLogInline(items, cardId, listEl) {
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const txt = v => v == null ? '' : String(v).trim();
  const GAS_URL = 'https://angel-namecard.letssyncus.com/gas-proxy/exec';
  const getKey = () => { const k = localStorage.getItem('hsc_admin_key') || ''; return k.startsWith('ANGEL2026') ? k : 'ANGEL2026' + k; };
  const moduleIcon = { delivery: '📦', renewal: '🔄', invite: '🎫', line_bind: '🔗', update_fee: '✏️' };
  const statusIcon = s => {
    const v = String(s || '').toLowerCase();
    if (v.includes('fail') || v.includes('error')) return '❌';
    if (v.includes('delivered') || v.includes('notified') || v.includes('assigned')) return '✅';
    return '📝';
  };

  if (!items || !items.length) {
    listEl.innerHTML = '<div class="empty-state" style="padding:10px;font-size:12px;">尚無操作記錄</div>';
    return;
  }

  listEl.innerHTML = items.map(r => {
    const lid = esc(txt(r.log_id));
    const icon = moduleIcon[r.module] || '📝';
    const si = statusIcon(r.after_status);
    const dt = txt(r.created_at).slice(0, 16).replace('T', ' ');
    return `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);" id="ilog-${lid}">
        <div style="font-size:15px;flex-shrink:0;line-height:1.4;">${si}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:800;color:var(--ink);">${icon} ${esc(txt(r.module))} · ${esc(txt(r.action))}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:1px;">${esc(dt)} · ${esc(txt(r.after_status))}</div>
          <div id="ilog-note-${lid}" style="font-size:12px;color:var(--ink2);margin-top:3px;white-space:pre-wrap;word-break:break-word;">${esc(txt(r.note))}</div>
          <div id="ilog-edit-${lid}" style="display:none;margin-top:6px;">
            <textarea id="ilog-ta-${lid}" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;min-height:56px;box-sizing:border-box;">${esc(txt(r.note))}</textarea>
            <div style="display:flex;gap:6px;margin-top:4px;">
              <button class="btn btn-primary btn-sm" data-ilog-save="${lid}">儲存</button>
              <button class="btn btn-soft btn-sm" data-ilog-cancel="${lid}">取消</button>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
          <button class="btn btn-soft btn-sm" data-ilog-edit="${lid}" style="padding:0 8px;height:26px;font-size:11px;">✏️</button>
          <button class="btn btn-danger btn-sm" data-ilog-del="${lid}" style="padding:0 8px;height:26px;font-size:11px;">🗑️</button>
        </div>
      </div>`;
  }).join('');

  // 編輯
  listEl.querySelectorAll('[data-ilog-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lid = btn.dataset.ilogEdit;
      document.getElementById(`ilog-note-${lid}`).style.display = 'none';
      document.getElementById(`ilog-edit-${lid}`).style.display = 'block';
    });
  });
  listEl.querySelectorAll('[data-ilog-cancel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lid = btn.dataset.ilogCancel;
      document.getElementById(`ilog-note-${lid}`).style.display = '';
      document.getElementById(`ilog-edit-${lid}`).style.display = 'none';
    });
  });
  // 儲存
  listEl.querySelectorAll('[data-ilog-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lid = btn.dataset.ilogSave;
      const note = document.getElementById(`ilog-ta-${lid}`)?.value || '';
      try {
        const res = await fetch(GAS_URL, {
          method: 'POST', redirect: 'follow',
          body: JSON.stringify({ action: 'adminUpdateOpsLog', admin_key: getKey(), log_id: lid, note })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '失敗');
        document.getElementById(`ilog-note-${lid}`).textContent = note;
        document.getElementById(`ilog-note-${lid}`).style.display = '';
        document.getElementById(`ilog-edit-${lid}`).style.display = 'none';
        window._hscToast?.('✅ 已更新備註');
      } catch (err) { window._hscToast?.(`更新失敗：${err.message}`); }
    });
  });
  // 刪除
  listEl.querySelectorAll('[data-ilog-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lid = btn.dataset.ilogDel;
      if (!confirm('確定刪除這筆記錄？')) return;
      try {
        const res = await fetch(GAS_URL, {
          method: 'POST', redirect: 'follow',
          body: JSON.stringify({ action: 'adminDeleteOpsLog', admin_key: getKey(), log_id: lid })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '失敗');
        document.getElementById(`ilog-${lid}`)?.remove();
        if (!listEl.querySelector('[id^="ilog-"]')) {
          listEl.innerHTML = '<div class="empty-state" style="padding:10px;font-size:12px;">尚無操作記錄</div>';
        }
        window._hscToast?.('✅ 已刪除');
      } catch (err) { window._hscToast?.(`刪除失敗：${err.message}`); }
    });
  });
}
(function initAgentPaymentInbox() {
  "use strict";
  const GAS_URL = "https://angel-namecard.letssyncus.com/gas-proxy/exec";
  function getKey() {
    const k = localStorage.getItem("hsc_admin_key") || "";
    return k.startsWith("ANGEL2026") ? k : "ANGEL2026" + k;
  }
  function bindEvents() {
    const btn = document.querySelector("#btnSubmitAgentPaymentInbox");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const cardId = (document.querySelector("#agentPaymentCardId")?.value || "").trim();
      const amount = (document.querySelector("#agentPaymentAmount")?.value || "").trim();
      const last5 = (document.querySelector("#agentPaymentLast5")?.value || "").trim();
      const note = (document.querySelector("#agentPaymentNote")?.value || "").trim();
      if (!cardId || !amount || !last5) {
        window._hscToast?.("請填寫卡號、金額、末五碼");
        return;
      }
      btn.disabled = true;
      btn.textContent = "處理中…";
      try {
        const res = await fetch(GAS_URL, {
          method: "POST",
          redirect: "follow",
          body: JSON.stringify({
            action: "submitAgentPaymentInbox",
            admin_key: getKey(),
            card_id: cardId,
            amount: Number(amount),
            last5: last5,
            note: note
          })
        });
        const data = await res.json();
        if (!data || !data.ok) throw new Error(data?.error || "送出失敗");
        window._hscToast?.("✅ 入帳資料已送出");
      } catch (err) {
        window._hscToast?.("送出失敗：" + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "送出入帳資料";
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindEvents);
  } else {
    bindEvents();
  }
})();
/* ============================================================
   HSC ADMIN · v420 直接確認付款 PATCH for admin.js
============================================================ */
(function initDirectConfirmPayment() {
  "use strict";

  const DC_GAS_URL = "https://angel-namecard.letssyncus.com/gas-proxy/exec";

  function getKey() {
    const k = localStorage.getItem("hsc_admin_key") || "";
    return k.startsWith("ANGEL2026") ? k : "ANGEL2026" + k;
  }

  function dcToast(msg) {
    if (typeof window._hscToast === "function") window._hscToast(msg);
    else alert(msg);
  }

  function injectUI() {
    // 找付款中心 section，插入 UI
    const paySection = document.getElementById("paymentSection") ||
                       document.querySelector('[id*="payment"]') ||
                       document.querySelector('.section');
    if (!paySection) return;

    if (document.getElementById("directConfirmPaymentBlock")) return;

    const block = document.createElement("div");
    block.id = "directConfirmPaymentBlock";
    block.style.cssText = "margin-top:24px;border-top:1px solid var(--border);padding-top:16px;";
    block.innerHTML = `
      <div style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:12px;">💵 直接確認付款</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">
        <div>
          <div style="font-size:11px;color:var(--ink3);margin-bottom:4px;">卡號</div>
          <input id="dcCardId" type="text" placeholder="TW0001"
            style="width:110px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;">
        </div>
        <div>
          <div style="font-size:11px;color:var(--ink3);margin-bottom:4px;">金額（0=贈送）</div>
          <input id="dcAmount" type="number" value="0" min="0"
            style="width:90px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;">
        </div>
        <div>
          <div style="font-size:11px;color:var(--ink3);margin-bottom:4px;">付款類型</div>
          <select id="dcType" style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;">
            <option value="">自動判斷</option>
            <option value="first">首次</option>
            <option value="renew">續約</option>
          </select>
        </div>
        <div style="flex:1;min-width:160px;">
          <div style="font-size:11px;color:var(--ink3);margin-bottom:4px;">備註</div>
          <input id="dcNote" type="text" placeholder="收現金 / 贈送原因…"
            style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <button id="btnDirectConfirm" class="btn btn-ok btn-sm"
          style="height:38px;padding:0 18px;font-weight:900;">✅ 直接確認</button>
      </div>
      <div id="dcResult" style="margin-top:12px;font-size:13px;"></div>
    `;
    paySection.appendChild(block);

    document.getElementById("btnDirectConfirm")?.addEventListener("click", doDirectConfirm);
  }

  async function doDirectConfirm() {
    const cardId = (document.getElementById("dcCardId")?.value || "").trim().toUpperCase();
    const amount = Number(document.getElementById("dcAmount")?.value) || 0;
    const type   = document.getElementById("dcType")?.value || "";
    const note   = (document.getElementById("dcNote")?.value || "").trim();
    const result = document.getElementById("dcResult");

    if (!cardId) { dcToast("⚠️ 請填卡號"); return; }

    if (result) result.innerHTML = "⏳ 處理中…";
    const btn = document.getElementById("btnDirectConfirm");
    if (btn) { btn.disabled = true; btn.textContent = "處理中…"; }

    try {
      const res = await fetch(DC_GAS_URL, {
        method: "POST",
        redirect: "follow",
        body: JSON.stringify({
          action:      "adminDirectConfirmPayment",
          admin_key:   getKey(),
          cardId:      cardId,
          amount:      amount,
          paymentType: type,
          note:        note
        })
      });
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.error || "操作失敗");

      const lineMsg = data.linePushed ? "✅ 已推 LINE" : "（金額=0，未推 LINE）";
      if (result) result.innerHTML = `
        <div style="background:var(--ok-bg);border-radius:8px;padding:10px 14px;color:var(--ok);font-weight:800;">
          ✅ 確認成功<br>
          <span style="font-weight:400;color:var(--ink);">
            卡號：${data.cardId}　類型：${data.paymentType}　金額：NT$${data.amount}<br>
            新到期：${data.newExpires}　${lineMsg}
          </span>
        </div>`;
      dcToast(`✅ ${data.cardId} 確認完成`);

      // 清空欄位
      const ci = document.getElementById("dcCardId"); if (ci) ci.value = "";
      const ai = document.getElementById("dcAmount"); if (ai) ai.value = "0";
      const ni = document.getElementById("dcNote");   if (ni) ni.value = "";

    } catch (err) {
      if (result) result.innerHTML = `<div style="color:var(--danger);">❌ 失敗：${err.message}</div>`;
      dcToast("失敗：" + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "✅ 直接確認"; }
    }
  }
window._doDirectConfirm = doDirectConfirm;
function bindInit() {
    // 直接綁 HTML 裡的按鈕
    const btn = document.getElementById("btnDirectConfirm");
    if (btn) {
      btn.addEventListener("click", doDirectConfirm);
    } else {
      // 若還沒渲染，等 DOM ready
      document.addEventListener("DOMContentLoaded", function() {
        const b = document.getElementById("btnDirectConfirm");
        if (b) b.addEventListener("click", doDirectConfirm);
      });
    }
  }
})();

/* ============================================================
   批次建卡模組 v1.0
============================================================ */
(function() {
  "use strict";

  const GAS_URL = "https://angel-namecard.letssyncus.com/gas-proxy/exec";
  const KEY_PREFIX = "ANGEL2026";
  const KEY_STORAGE = "hsc_admin_key";

  const COLOR_MAP = {
    p1:"#e8909a", p2:"#9b5566", p3:"#3c5878", p4:"#8e7fc4", p5:"#2a5447", p6:"#e8ba5a", p7:"#7a6558",
    c1:"#e57d84", c2:"#7daed7", c3:"#e7a860", c4:"#a48bd8", c5:"#7fc89a"
  };
  const VALID_TYPES = ["負責人","員工","北區","中區","南區"];
  const REGION_TYPES = ["北區","中區","南區"];
  const BATCH_SIZE = 20;

  let batchCards = [];
  let batchResults = [];

  function getKey() {
    const s = localStorage.getItem(KEY_STORAGE) || "";
    if (s.startsWith(KEY_PREFIX)) return s;
    return s ? KEY_PREFIX + s : "";
  }

  function esc(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── SheetJS 懶加載 ──
  function withXLSX(cb) {
    if (window.XLSX) { cb(window.XLSX); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = function() { cb(window.XLSX); };
    s.onerror = function() { showToast("❌ 無法載入 Excel 解析器，請確認網路"); };
    document.head.appendChild(s);
  }

  function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add("hidden"), 3500);
  }

  // ── 下載範本 ──
  function downloadTemplate() {
    withXLSX(function(XLSX) {
      const rows = [
        ["type","name","title","company","phone","email","line_id","avatar_url","plan","color","region","price"],
        ["負責人","王總監","執行長","XX科技","0900111222","boss@mail.com","boss_line","https://example.com/boss.jpg","premium","p3","",""],
        ["北區","北區服務站","北區中心","XX科技","","","","https://example.com/north.jpg","premium","p3","",""],
        ["中區","中區服務站","中區中心","XX科技","","","","https://example.com/mid.jpg","premium","p3","",""],
        ["南區","南區服務站","南區中心","XX科技","","","","https://example.com/south.jpg","premium","p3","",""],
        ["員工","李小明","業務","XX科技","0911222333","lee@mail.com","lee_line","https://example.com/lee.jpg","premium","p1","北區","1500"],
        ["員工","陳小花","主任","XX科技","0922333444","chen@mail.com","chen_line","https://example.com/chen.jpg","premium","p2","南區","1500"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = rows[0].map((_,i) => ({ wch: [8,12,10,10,12,18,12,30,8,6,6,6][i]||12 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "批次建卡");
      XLSX.writeFile(wb, "HSC批次建卡範本.xlsx");
    });
  }

  // ── 解析 Excel ──
  function parseExcel(file) {
    return new Promise((resolve, reject) => {
      withXLSX(function(XLSX) {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type:"array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
            resolve(rows);
          } catch(err) { reject(err); }
        };
        reader.onerror = () => reject(new Error("讀取檔案失敗"));
        reader.readAsArrayBuffer(file);
      });
    });
  }

  // ── 驗證資料 ──
  function validateRows(rows) {
    const errors = [], normalized = [];
    rows.forEach((row, i) => {
      const line = i + 2;
      const type = String(row.type||"").trim();
      const name = String(row.name||"").trim();
      if (!type) { errors.push(`第${line}列：type 為必填`); return; }
      if (!VALID_TYPES.includes(type)) { errors.push(`第${line}列：type「${type}」不合法，必須是 ${VALID_TYPES.join("/")}`); return; }
      if (!name) { errors.push(`第${line}列：name 為必填`); return; }
      if (type === "員工") {
        const region = String(row.region||"").trim();
        if (!REGION_TYPES.includes(region)) { errors.push(`第${line}列：員工 region 必須填 北區/中區/南區（目前：「${region}」）`); return; }
      }
      normalized.push({
        type, name,
        title: String(row.title||"").trim(),
        company: String(row.company||"").trim(),
        phone: String(row.phone||"").trim(),
        email: String(row.email||"").trim(),
        line_id: String(row.line_id||"").trim(),
        avatar_url: String(row.avatar_url||"").trim(),
        plan: String(row.plan||"premium").trim().toLowerCase() === "free" ? "free" : "premium",
        color: String(row.color||"").trim() || "",
        region: String(row.region||"").trim(),
        price: Number(row.price)||0,
      });
    });
    return { errors, normalized };
  }

  // ── 渲染預覽 ──
  function renderPreview(cards) {
    const wrap = document.getElementById("batchPreviewWrap");
    const summary = document.getElementById("batchSummary");
    const head = document.getElementById("batchPreviewHead");
    const body = document.getElementById("batchPreviewBody");
    if (!wrap) return;

    const cnt = { 負責人:0, 員工:0, 北區:0, 中區:0, 南區:0 };
    cards.forEach(c => { if (cnt[c.type]!==undefined) cnt[c.type]++; });
    summary.innerHTML = `共 <strong>${cards.length}</strong> 張卡：負責人 ${cnt["負責人"]}、員工 ${cnt["員工"]}、北區 ${cnt["北區"]}、中區 ${cnt["中區"]}、南區 ${cnt["南區"]}`;

    const cols = ["#","type","name","title","plan","color","region","頭像"];
    head.innerHTML = "<tr>" + cols.map(c =>
      `<th style="padding:5px 8px;text-align:left;border:1px solid var(--border);white-space:nowrap;font-size:11px;">${c}</th>`
    ).join("") + "</tr>";

    body.innerHTML = cards.map((c, i) => {
      const dot = COLOR_MAP[c.color]
        ? `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${COLOR_MAP[c.color]};margin-right:3px;vertical-align:middle;"></span>`
        : "";
      const bg = c.type==="負責人"?"background:#fff8e8;" : REGION_TYPES.includes(c.type)?"background:#e8f4ff;":"";
      const cells = [
        i+1,
        `<strong>${esc(c.type)}</strong>`,
        esc(c.name),
        esc(c.title||"-"),
        c.plan,
        dot + esc(c.color||"(預設)"),
        esc(c.region||"-"),
        c.avatar_url ? `<a href="${esc(c.avatar_url)}" target="_blank" style="font-size:10px;">🖼</a>` : "-",
      ];
      return `<tr style="${bg}">${cells.map(v => `<td style="padding:4px 8px;border:1px solid var(--border);font-size:11px;">${v}</td>`).join("")}</tr>`;
    }).join("");

    wrap.style.display = "";
    document.getElementById("batchCreateActions").style.display = "";
  }

  // ── GAS POST ──
  async function gasPost(action, params) {
    const key = getKey();
    if (!key) throw new Error("請先設定 Admin Key");
    const body = JSON.stringify({ action, admin_key: key, ...params });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch(GAS_URL, {
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body, signal: ctrl.signal
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch(_) { throw new Error("GAS 回傳非 JSON: " + text.slice(0,100)); }
      if (!res.ok || json.ok===false) throw new Error(json.error || `HTTP ${res.status}`);
      return json.data != null ? json.data : json;
    } finally { clearTimeout(timer); }
  }

  // ── 開始批次建卡 ──
  async function startBatch(cards) {
    const logWrap = document.getElementById("batchLogWrap");
    const logList = document.getElementById("batchLogList");
    const progressEl = document.getElementById("batchProgressText");
    const btn = document.getElementById("btnStartBatchCreate");
    if (!logWrap) return;

    btn.disabled = true;
    btn.textContent = "⏳ 建立中…";
    logWrap.style.display = "";
    logList.innerHTML = "";
    batchResults = [];

    let done = 0;
    const total = cards.length;

    function log(msg, ok) {
      const d = document.createElement("div");
      d.style.color = ok===false ? "var(--danger)" : ok===true ? "var(--ok,#2d8a4e)" : "var(--ink2)";
      d.textContent = msg;
      logList.appendChild(d);
      logList.scrollTop = logList.scrollHeight;
    }

    for (let start = 0; start < total; start += BATCH_SIZE) {
      const chunk = cards.slice(start, start + BATCH_SIZE);
      const batchNum = Math.floor(start/BATCH_SIZE) + 1;
      progressEl.textContent = `進度：${done} / ${total}`;
      log(`──── 第 ${batchNum} 批（${chunk.length} 張）────`);

      try {
        const res = await gasPost("adminBatchCreateCards", { cards: chunk });
        const results = Array.isArray(res) ? res : (res?.results || []);
        results.forEach(r => {
          done++;
          batchResults.push(r);
          if (r.ok) log(`✅ ${r.card_id||""} ${r.name}（${r.type}）`, true);
          else log(`❌ ${r.name}（${r.type}）失敗：${r.error||"未知"}`, false);
        });
      } catch(err) {
        log(`❌ 第 ${batchNum} 批失敗：${err.message}`, false);
        break;
      }

      if (start + BATCH_SIZE < total) {
        log("⏸ 等待 2 秒…");
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    progressEl.textContent = `完成：${done} / ${total}`;
    log("══ 全部完成 ══");
    btn.disabled = false;
    btn.textContent = "🚀 開始批次建卡";
    document.getElementById("btnExportBatchResult").style.display = "";
    const confirmWrap = document.getElementById("batchConfirmPayWrap");
    if (confirmWrap && batchResults.some(r => r.ok)) confirmWrap.style.display = "";

    // 建卡完成 → 存主檔（含 card_id）
    try {
      const masterData = batchCards.map((c, i) => {
        const r = batchResults[i] || {};
        return Object.assign({}, c, { card_id: r.ok ? (r.card_id || "") : "" });
      });
      localStorage.setItem("hsc_batch_master", JSON.stringify({
        data: masterData,
        saved_at: new Date().toISOString(),
        source: "batch_create",
        success: batchResults.filter(r => r.ok).length
      }));
      const statusEl = document.getElementById("masterFileStatus");
      if (statusEl) statusEl.textContent = "📋 主檔已儲存（" + masterData.length + " 筆，" + new Date().toLocaleString("zh-TW") + "）";
    } catch(_) {}
  }

  // ── 匯出結果 ──
  function exportResults() {
    withXLSX(function(XLSX) {
      const data = [["card_id","name","type","狀態","錯誤訊息"]].concat(
        batchResults.map(r => [r.card_id||"",r.name||"",r.type||"",r.ok?"成功":"失敗",r.error||""])
      );
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "建立結果");
      XLSX.writeFile(wb, "HSC批次建卡結果.xlsx");
    });
  }

  // ── 初始化 ──
  function init() {
    const dlBtn = document.getElementById("btnDownloadBatchTemplate");
    const fileInput = document.getElementById("batchExcelInput");
    const clearBtn = document.getElementById("btnClearBatch");
    const startBtn = document.getElementById("btnStartBatchCreate");
    const exportBtn = document.getElementById("btnExportBatchResult");
    const formatHead = document.getElementById("batchFormatHead");
    const formatBody = document.querySelector("#batchFormatCollapsible .collapsible-body");

    if (dlBtn) dlBtn.addEventListener("click", downloadTemplate);
    if (exportBtn) exportBtn.addEventListener("click", exportResults);

    // 允許外部（AI轉換模組）直接載入資料
    window._hscBatchLoad = function(cards) {
      const { errors, normalized } = validateRows(cards);
      if (errors.length) { alert("資料有問題：\n" + errors.join("\n")); return false; }
      batchCards = normalized;
      renderPreview(batchCards);
      document.getElementById("batchCreateSection")?.scrollIntoView({ behavior: "smooth" });
      showToast("✅ 已從 AI 轉換載入 " + batchCards.length + " 筆");
      return true;
    };

    // 顯示主檔狀態
    try {
      const stored = localStorage.getItem("hsc_batch_master");
      if (stored) {
        const m = JSON.parse(stored);
        const statusEl = document.getElementById("masterFileStatus");
        if (statusEl && m.saved_at) {
          const d = new Date(m.saved_at).toLocaleString("zh-TW");
          statusEl.textContent = "📋 主檔：" + (m.data||[]).length + " 筆，存於 " + d;
        }
      }
    } catch(_) {}

    if (clearBtn) clearBtn.addEventListener("click", () => {
      batchCards = []; batchResults = [];
      ["batchPreviewWrap","batchCreateActions","batchLogWrap"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
      if (fileInput) fileInput.value = "";
      showToast("已清除");
    });

    if (fileInput) fileInput.addEventListener("change", async function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const rows = await parseExcel(file);
        if (!rows.length) { showToast("⚠️ 檔案是空的"); return; }
        const { errors, normalized } = validateRows(rows);
        if (errors.length) {
          showToast("⚠️ 資料有誤，請修正");
          alert("以下欄位有錯誤，請修正後重新上傳：\n\n" + errors.join("\n"));
          return;
        }
        batchCards = normalized;
        renderPreview(batchCards);
        showToast(`✅ 已解析 ${batchCards.length} 筆資料`);
      } catch(err) {
        showToast("❌ 解析失敗：" + err.message);
      }
    });

    if (startBtn) startBtn.addEventListener("click", () => {
      if (!batchCards.length) { showToast("⚠️ 請先上傳 Excel"); return; }
      if (!confirm(`確定要批次建立 ${batchCards.length} 張卡片嗎？\n\n此操作不可復原，請確認預覽無誤後再執行。`)) return;
      startBatch(batchCards);
    });

    // ── 💳 批次確認付款 ──
    const confirmPayBtn = document.getElementById("btnBatchConfirmPay");
    if (confirmPayBtn) confirmPayBtn.addEventListener("click", async () => {
      if (!batchResults.length) { showToast("⚠️ 請先完成批次建卡"); return; }
      const successCards = batchResults.filter(r => r.ok && r.card_id);
      if (!successCards.length) { showToast("⚠️ 沒有成功建立的卡片"); return; }
      const amount = Number(document.getElementById("batchConfirmAmount")?.value) || 0;
      const note   = (document.getElementById("batchConfirmNote")?.value || "批次確認付款").trim();
      const statusEl = document.getElementById("batchConfirmPayStatus");
      if (!confirm(`確定要幫 ${successCards.length} 張卡確認付款（每張 NT$${amount}）？`)) return;
      confirmPayBtn.disabled = true;
      if (statusEl) statusEl.textContent = "⏳ 確認中…";
      try {
        const cards = successCards.map(r => ({ card_id: r.card_id, amount, note }));
        const res = await gasPost("adminBatchDirectConfirmPayment", { cards });
        const results = Array.isArray(res) ? res : (res?.results || []);
        const ok  = results.filter(r => r.ok).length;
        const err = results.filter(r => !r.ok);
        if (statusEl) statusEl.textContent = `✅ 成功 ${ok} 張${err.length ? `，失敗 ${err.length} 張：` + err.map(r => r.card_id + "(" + r.error + ")").join("、") : ""}`;
        showToast(`✅ 批次付款確認完成：${ok} 張成功`);
      } catch(err) {
        if (statusEl) statusEl.textContent = "❌ " + err.message;
        showToast("❌ 批次付款確認失敗：" + err.message);
      } finally { confirmPayBtn.disabled = false; }
    });

    // collapsible (建卡格式說明)
    if (formatHead && formatBody) {
      formatHead.addEventListener("click", () => {
        const open = formatBody.style.display !== "none";
        formatBody.style.display = open ? "none" : "";
        const ch = formatHead.querySelector(".chevron");
        if (ch) ch.style.transform = open ? "" : "rotate(90deg)";
      });
    }

    // ── 其他批次操作的 collapsible ──
    [
      ["batchDeliveryHead","batchDeliveryCollapsible"],
      ["batchUpdateHead","batchUpdateCollapsible"],
      ["batchRenewHead","batchRenewCollapsible"],
    ].forEach(([headId, colId]) => {
      const h = document.getElementById(headId);
      const c = document.getElementById(colId);
      if (!h || !c) return;
      const b = c.querySelector(".collapsible-body");
      if (!b) return;
      h.addEventListener("click", () => {
        const open = b.style.display !== "none";
        b.style.display = open ? "none" : "";
        const ch = h.querySelector(".chevron");
        if (ch) ch.style.transform = open ? "" : "rotate(90deg)";
      });
    });

    // ── 📦 批次交付 ──
    const fetchDeliveryBtn = document.getElementById("btnFetchDelivery");
    if (fetchDeliveryBtn) {
      fetchDeliveryBtn.addEventListener("click", async () => {
        const referrerId = (document.getElementById("deliveryReferrerId")?.value || "").trim().toUpperCase();
        if (!referrerId) { showToast("⚠️ 請輸入負責人卡號"); return; }
        const statusEl = document.getElementById("deliveryStatus");
        if (statusEl) statusEl.textContent = "⏳ 查詢中…";
        fetchDeliveryBtn.disabled = true;
        try {
          const data = await gasPost("adminGetCardsByReferrer", { referrer_id: referrerId });
          const cards = Array.isArray(data) ? data : (data?.cards || []);
          if (!cards.length) { showToast("⚠️ 查無資料"); if (statusEl) statusEl.textContent = "查無員工卡"; return; }
          exportDeliveryExcel(cards, referrerId);
          if (statusEl) statusEl.textContent = `✅ 已找到 ${cards.length} 張卡，Excel 已下載`;
          showToast(`✅ 匯出 ${cards.length} 張卡的交付連結`);
        } catch(err) {
          showToast("❌ 查詢失敗：" + err.message);
          if (statusEl) statusEl.textContent = "❌ " + err.message;
        } finally { fetchDeliveryBtn.disabled = false; }
      });
    }

    // ── ✏️ 批次更新 ──
    const dlUpdateBtn = document.getElementById("btnDownloadUpdateTemplate");
    const updateInput = document.getElementById("updateExcelInput");
    const startUpdateBtn = document.getElementById("btnStartBatchUpdate");
    let updateCards = [];

    const loadMasterUpdateBtn = document.getElementById("btnLoadMasterForUpdate");
    if (loadMasterUpdateBtn) loadMasterUpdateBtn.addEventListener("click", function() {
      try {
        const stored = localStorage.getItem("hsc_batch_master");
        if (!stored) { showToast("⚠️ 找不到主檔，請先執行批次建卡或 AI 轉換"); return; }
        const master = JSON.parse(stored);
        const valid = (master.data || []).filter(c => c.card_id);
        if (!valid.length) { showToast("⚠️ 主檔中沒有已建立的卡片（card_id）"); return; }
        updateCards = valid.map(c => ({
          card_id: c.card_id, name: c.name || "", title: c.title || "",
          company: c.company || "", phone: c.phone || "", email: c.email || "",
          line_id: c.line_id || "", avatar_url: c.avatar_url || "", color: c.color || ""
        }));
        renderSimplePreview("updatePreviewWrap","updateSummary","updatePreviewHead","updatePreviewBody","updateActions",
          updateCards, ["card_id","name","title","company","phone","color","avatar_url"],
          "共 " + updateCards.length + " 筆更新（主檔）");
        const b = document.querySelector("#batchUpdateCollapsible .collapsible-body");
        if (b) b.style.display = "";
        showToast("✅ 已載入主檔 " + updateCards.length + " 筆");
      } catch(err) { showToast("❌ 載入主檔失敗：" + err.message); }
    });

    if (dlUpdateBtn) dlUpdateBtn.addEventListener("click", () => downloadUpdateTemplate());
    if (updateInput) updateInput.addEventListener("change", async function(e) {
      const file = e.target.files?.[0]; if (!file) return;
      try {
        const rows = await parseExcel(file);
        if (!rows.length) { showToast("⚠️ 檔案是空的"); return; }
        const { errors, normalized } = validateUpdateRows(rows);
        if (errors.length) { showToast("⚠️ 資料有誤"); alert(errors.join("\n")); return; }
        updateCards = normalized;
        renderSimplePreview("updatePreviewWrap","updateSummary","updatePreviewHead","updatePreviewBody","updateActions",
          updateCards, ["card_id","name","title","company","phone","color","avatar_url"],
          `共 ${updateCards.length} 筆更新`);
        showToast(`✅ 已解析 ${updateCards.length} 筆`);
      } catch(err) { showToast("❌ 解析失敗：" + err.message); }
    });
    if (startUpdateBtn) startUpdateBtn.addEventListener("click", () => {
      if (!updateCards.length) { showToast("⚠️ 請先上傳 Excel"); return; }
      if (!confirm(`確定要更新 ${updateCards.length} 張卡的資料嗎？`)) return;
      runBatchOp("adminBatchUpdateCards", { cards: updateCards },
        "updateLogWrap","updateLogList","updateProgressText", startUpdateBtn, "✏️ 開始批次更新");
    });

    // ── 🔄 批次續約 ──
    const dlRenewBtn = document.getElementById("btnDownloadRenewTemplate");
    const renewInput = document.getElementById("renewExcelInput");
    const startRenewBtn = document.getElementById("btnStartBatchRenew");
    let renewCards = [];

    const loadMasterRenewBtn = document.getElementById("btnLoadMasterForRenew");
    if (loadMasterRenewBtn) loadMasterRenewBtn.addEventListener("click", function() {
      try {
        const stored = localStorage.getItem("hsc_batch_master");
        if (!stored) { showToast("⚠️ 找不到主檔，請先執行批次建卡或 AI 轉換"); return; }
        const master = JSON.parse(stored);
        const valid = (master.data || []).filter(c => c.card_id);
        if (!valid.length) { showToast("⚠️ 主檔中沒有已建立的卡片（card_id）"); return; }
        renewCards = valid.map(c => ({ card_id: c.card_id, price: c.price || 0 }));
        renderSimplePreview("renewPreviewWrap","renewSummary","renewPreviewHead","renewPreviewBody","renewActions",
          renewCards, ["card_id","price"],
          "共 " + renewCards.length + " 張卡待續約（主檔）");
        const b = document.querySelector("#batchRenewCollapsible .collapsible-body");
        if (b) b.style.display = "";
        showToast("✅ 已載入主檔 " + renewCards.length + " 筆");
      } catch(err) { showToast("❌ 載入主檔失敗：" + err.message); }
    });

    if (dlRenewBtn) dlRenewBtn.addEventListener("click", () => downloadRenewTemplate());
    if (renewInput) renewInput.addEventListener("change", async function(e) {
      const file = e.target.files?.[0]; if (!file) return;
      try {
        const rows = await parseExcel(file);
        if (!rows.length) { showToast("⚠️ 檔案是空的"); return; }
        const { errors, normalized } = validateRenewRows(rows);
        if (errors.length) { showToast("⚠️ 資料有誤"); alert(errors.join("\n")); return; }
        renewCards = normalized;
        renderSimplePreview("renewPreviewWrap","renewSummary","renewPreviewHead","renewPreviewBody","renewActions",
          renewCards, ["card_id","price"],
          `共 ${renewCards.length} 張卡待續約`);
        showToast(`✅ 已解析 ${renewCards.length} 筆`);
      } catch(err) { showToast("❌ 解析失敗：" + err.message); }
    });
    if (startRenewBtn) startRenewBtn.addEventListener("click", () => {
      if (!renewCards.length) { showToast("⚠️ 請先上傳 Excel"); return; }
      if (!confirm(`確定要幫 ${renewCards.length} 張卡續約 365 天嗎？`)) return;
      runBatchOp("adminBatchRenewCards", { cards: renewCards },
        "renewLogWrap","renewLogList","renewProgressText", startRenewBtn, "🔄 開始批次續約");
    });
  }

  // ── 匯出交付 Excel ──
  function exportDeliveryExcel(cards, referrerId) {
    withXLSX(function(XLSX) {
      const BASE = "https://angel-namecard.letssyncus.com";
      const rows = [["卡號","姓名","職稱","公司","名片連結","交付卡連結","到期日"]].concat(
        cards.map(c => [
          c.id || c.card_id || "",
          c.name || "",
          c.title || "",
          c.company || "",
          `${BASE}/index.html?id=${c.id||c.card_id}&view=1`,
          `${BASE}/poster.html?id=${c.id||c.card_id}`,
          c.expires_at || "",
        ])
      );
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [10,12,10,12,50,50,12].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "交付連結");
      XLSX.writeFile(wb, `HSC交付連結_${referrerId}.xlsx`);
    });
  }

  // ── 下載更新範本 ──
  function downloadUpdateTemplate() {
    withXLSX(function(XLSX) {
      const rows = [
        ["card_id","name","title","company","phone","email","line_id","avatar_url","color"],
        ["TW0201","王小明","資深業務","XX科技","0911222333","","","https://...","p2"],
        ["TW0202","陳小花","主任","XX科技","","","","",""],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "批次更新");
      XLSX.writeFile(wb, "HSC批次更新範本.xlsx");
    });
  }

  // ── 下載續約範本 ──
  function downloadRenewTemplate() {
    withXLSX(function(XLSX) {
      const rows = [
        ["card_id","price"],
        ["TW0201","1500"],
        ["TW0202","1500"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "批次續約");
      XLSX.writeFile(wb, "HSC批次續約範本.xlsx");
    });
  }

  // ── 驗證更新資料 ──
  function validateUpdateRows(rows) {
    const errors = [], normalized = [];
    rows.forEach((r, i) => {
      const card_id = String(r.card_id || "").trim().toUpperCase();
      if (!card_id) { errors.push(`第${i+2}列：card_id 為必填`); return; }
      normalized.push({
        card_id,
        name:       String(r.name       || "").trim(),
        title:      String(r.title      || "").trim(),
        company:    String(r.company    || "").trim(),
        phone:      String(r.phone      || "").trim(),
        email:      String(r.email      || "").trim(),
        line_id:    String(r.line_id    || "").trim(),
        avatar_url: String(r.avatar_url || "").trim(),
        color:      String(r.color      || "").trim(),
      });
    });
    return { errors, normalized };
  }

  // ── 驗證續約資料 ──
  function validateRenewRows(rows) {
    const errors = [], normalized = [];
    rows.forEach((r, i) => {
      const card_id = String(r.card_id || "").trim().toUpperCase();
      if (!card_id) { errors.push(`第${i+2}列：card_id 為必填`); return; }
      normalized.push({ card_id, price: Number(r.price) || 0 });
    });
    return { errors, normalized };
  }

  // ── 通用預覽渲染 ──
  function renderSimplePreview(wrapId, summaryId, headId, bodyId, actionsId, data, cols, summaryText) {
    const wrap = document.getElementById(wrapId); if (!wrap) return;
    document.getElementById(summaryId).textContent = summaryText;
    document.getElementById(headId).innerHTML = "<tr>" + cols.map(c =>
      `<th style="padding:4px 8px;border:1px solid var(--border);font-size:11px;">${c}</th>`).join("") + "</tr>";
    document.getElementById(bodyId).innerHTML = data.map(row =>
      "<tr>" + cols.map(c =>
        `<td style="padding:3px 8px;border:1px solid var(--border);font-size:11px;">${esc(row[c]||"-")}</td>`
      ).join("") + "</tr>"
    ).join("");
    wrap.style.display = "";
    const act = document.getElementById(actionsId); if (act) act.style.display = "";
  }

  // ── 通用批次執行（update / renew）──
  async function runBatchOp(action, params, logWrapId, logListId, progressId, btn, btnLabel) {
    const logWrap = document.getElementById(logWrapId);
    const logList = document.getElementById(logListId);
    const progressEl = document.getElementById(progressId);
    if (!logWrap) return;
    btn.disabled = true; btn.textContent = "⏳ 執行中…";
    logWrap.style.display = ""; logList.innerHTML = "";
    const cards = params.cards || [];
    const total = cards.length; let done = 0;

    function log(msg, ok) {
      const d = document.createElement("div");
      d.style.color = ok===false?"var(--danger)":ok===true?"var(--ok,#2d8a4e)":"var(--ink2)";
      d.textContent = msg;
      logList.appendChild(d); logList.scrollTop = logList.scrollHeight;
    }

    for (let start = 0; start < total; start += BATCH_SIZE) {
      const chunk = cards.slice(start, start + BATCH_SIZE);
      progressEl.textContent = `進度：${done} / ${total}`;
      log(`──── 第 ${Math.floor(start/BATCH_SIZE)+1} 批（${chunk.length} 筆）────`);
      try {
        const res = await gasPost(action, { cards: chunk });
        const results = Array.isArray(res) ? res : (res?.results || []);
        results.forEach(r => {
          done++;
          if (r.ok) log(`✅ ${r.card_id||""} ${r.name||""} 完成`, true);
          else log(`❌ ${r.card_id||r.name||""} 失敗：${r.error||"未知"}`, false);
        });
      } catch(err) {
        log(`❌ 第 ${Math.floor(start/BATCH_SIZE)+1} 批失敗：${err.message}`, false);
        break;
      }
      if (start + BATCH_SIZE < total) { log("⏸ 等待 2 秒…"); await new Promise(r => setTimeout(r, 2000)); }
    }
    progressEl.textContent = `完成：${done} / ${total}`;
    log("══ 全部完成 ══");
    btn.disabled = false; btn.textContent = btnLabel;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ═══════════════════════════════════════════════════════════
// 📷 照片壓縮上傳模組 v1.0（Firebase Storage）
// ═══════════════════════════════════════════════════════════
(function() {
  "use strict";

  var photoFiles  = [];
  var photoResults = [];
  var fbInited    = false;
  var fbStorage   = null;
  var fbAuth      = null;

  // Firebase 設定（同 firebase.js）
  var FB_CONFIG = {
    apiKey:            "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
    authDomain:        "happiness-smart-card-pro-7389a.firebaseapp.com",
    projectId:         "happiness-smart-card-pro-7389a",
    storageBucket:     "happiness-smart-card-pro-7389a.firebasestorage.app",
    messagingSenderId: "143313936007",
    appId:             "1:143313936007:web:7c948563c51e8a47d3a222"
  };

  // ── Firebase 初始化 ─────────────────────────────────────
  function initFb() {
    if (fbInited) return;
    if (!window.firebase) throw new Error("Firebase SDK 未載入");
    if (firebase.apps && firebase.apps.length > 0) {
      fbAuth    = firebase.auth(firebase.apps[0]);
      fbStorage = firebase.storage(firebase.apps[0]);
    } else {
      firebase.initializeApp(FB_CONFIG);
      fbAuth    = firebase.auth();
      fbStorage = firebase.storage();
    }
    fbInited = true;
  }

  async function ensureAuth() {
    initFb();
    if (fbAuth.currentUser) return;
    await fbAuth.signInAnonymously();
  }

  // ── 照片壓縮（Canvas） ──────────────────────────────────
  function compressImage(file, maxWidth, quality) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() {
          var w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob(function(blob) {
            if (blob) resolve({ blob: blob, size: blob.size });
            else reject(new Error("Canvas toBlob 失敗"));
          }, "image/jpeg", quality);
        };
        img.onerror = function() { reject(new Error("圖片讀取失敗")); };
        img.src = ev.target.result;
      };
      reader.onerror = function() { reject(new Error("FileReader 失敗")); };
      reader.readAsDataURL(file);
    });
  }

  // ── 工具 ───────────────────────────────────────────────
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + pad2(d.getMonth()+1) + pad2(d.getDate());
  }
  function pad2(n) { return n < 10 ? "0"+n : ""+n; }

  function safeName(name) {
    return name.replace(/\s+/g, "_").replace(/[^\w.-]/g, "").replace(/\.[^.]+$/, "") + ".jpg";
  }

  function fmtKB(bytes) {
    return bytes > 0 ? Math.round(bytes / 1024) + " KB" : "—";
  }

  // ── 預覽縮圖 ──────────────────────────────────────────
  function renderPhotoPreview(files) {
    var grid = document.getElementById("photoPreviewGrid");
    if (!grid) return;
    grid.innerHTML = "";
    grid.style.display = files.length ? "flex" : "none";
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var div = document.createElement("div");
        div.style.cssText = "width:56px;height:56px;border-radius:8px;overflow:hidden;border:1px solid var(--border);flex-shrink:0;";
        var img = document.createElement("img");
        img.src = ev.target.result;
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        div.appendChild(img);
        grid.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  // ── 結果列 ─────────────────────────────────────────────
  function appendPhotoRow(name, origSize, compSize, url, error) {
    var tbody = document.getElementById("photoResultBody");
    if (!tbody) return;
    var tr = document.createElement("tr");

    // 縮圖
    var td0 = document.createElement("td");
    td0.style.cssText = "padding:4px 6px;border:1px solid var(--border);";
    if (url) {
      var img = document.createElement("img");
      img.src = url;
      img.style.cssText = "width:40px;height:40px;object-fit:cover;border-radius:4px;display:block;";
      td0.appendChild(img);
    } else {
      td0.textContent = "❌";
    }

    // 檔名
    var td1 = document.createElement("td");
    td1.style.cssText = "padding:4px 8px;border:1px solid var(--border);font-size:11px;word-break:break-all;";
    td1.textContent = name;

    // 原始大小
    var td2 = document.createElement("td");
    td2.style.cssText = "padding:4px 8px;border:1px solid var(--border);font-size:11px;";
    td2.textContent = fmtKB(origSize);

    // 壓縮後
    var td3 = document.createElement("td");
    td3.style.cssText = "padding:4px 8px;border:1px solid var(--border);font-size:11px;";
    td3.textContent = compSize ? fmtKB(compSize) : "—";

    // 網址 / 錯誤
    var td4 = document.createElement("td");
    td4.style.cssText = "padding:4px 8px;border:1px solid var(--border);font-size:10px;font-family:monospace;word-break:break-all;max-width:200px;";
    if (url) {
      td4.textContent = url;
    } else {
      td4.style.color = "#e55";
      td4.textContent = error || "失敗";
    }

    // 複製按鈕
    var td5 = document.createElement("td");
    td5.style.cssText = "padding:4px 6px;border:1px solid var(--border);text-align:center;";
    if (url) {
      var btn = document.createElement("button");
      btn.textContent = "複製";
      btn.style.cssText = "font-size:11px;padding:2px 8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);cursor:pointer;";
      (function(u, b) {
        b.addEventListener("click", function() {
          navigator.clipboard.writeText(u).then(function() {
            b.textContent = "✅";
            setTimeout(function() { b.textContent = "複製"; }, 2000);
          });
        });
      })(url, btn);
      td5.appendChild(btn);
    } else {
      td5.textContent = "—";
    }

    tr.appendChild(td0); tr.appendChild(td1); tr.appendChild(td2);
    tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(td5);
    tbody.appendChild(tr);
  }

  // ── 主流程 ─────────────────────────────────────────────
  async function startPhotoUpload() {
    if (!photoFiles.length) return;
    var maxWidth = parseInt(document.getElementById("photoMaxWidth").value, 10);
    var quality  = parseFloat(document.getElementById("photoQuality").value);
    var btn      = document.getElementById("btnStartPhotoUpload");
    var progress = document.getElementById("photoUploadProgress");

    btn.disabled = true;
    btn.textContent = "上傳中…";
    progress.style.display = "block";
    progress.textContent = "連線 Firebase…";
    document.getElementById("photoResultBody").innerHTML = "";
    photoResults = [];

    try {
      await ensureAuth();
    } catch(err) {
      progress.textContent = "❌ Firebase 認證失敗：" + err.message;
      btn.disabled = false; btn.textContent = "☁️ 開始壓縮並上傳";
      return;
    }

    var dateFolder = todayStr();

    for (var i = 0; i < photoFiles.length; i++) {
      var file = photoFiles[i];
      progress.textContent = "處理中 " + (i + 1) + " / " + photoFiles.length + "：" + file.name;

      try {
        var compressed = await compressImage(file, maxWidth, quality);
        var filename   = safeName(file.name);
        var path       = "uploads/batch/" + dateFolder + "/" + Date.now() + "_" + filename;
        var storageRef = fbStorage.ref(path);
        await storageRef.put(compressed.blob, {
          contentType: "image/jpeg",
          cacheControl: "public,max-age=31536000,immutable"
        });
        var url = await storageRef.getDownloadURL();

        photoResults.push({ name: file.name, origSize: file.size, compSize: compressed.size, url: url });
        appendPhotoRow(file.name, file.size, compressed.size, url, null);
      } catch(err) {
        photoResults.push({ name: file.name, origSize: file.size, compSize: 0, url: "", error: err.message });
        appendPhotoRow(file.name, file.size, 0, null, err.message);
      }
    }

    progress.textContent = "✅ 完成！" + photoFiles.length + " 張";
    btn.disabled = false; btn.textContent = "☁️ 開始壓縮並上傳";
    document.getElementById("photoResultWrap").style.display = "block";
  }

  // ── 匯出 Excel ─────────────────────────────────────────
  function exportPhotoResults() {
    if (!window.XLSX || !photoResults.length) { alert("尚無結果可匯出"); return; }
    var rows = [["序號（對應建卡Excel行數）", "檔名", "原始大小(KB)", "壓縮後(KB)", "圖片網址（貼入 avatar_url）"]];
    photoResults.forEach(function(r, i) {
      rows.push([
        i + 1,
        r.name,
        Math.round((r.origSize || 0) / 1024),
        r.compSize ? Math.round(r.compSize / 1024) : "",
        r.url || r.error || ""
      ]);
    });
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{wch:20},{wch:30},{wch:12},{wch:12},{wch:80}];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "照片網址");
    XLSX.writeFile(wb, "HSC_Photo_URLs_" + todayStr() + ".xlsx");
  }

  // ── 初始化 ─────────────────────────────────────────────
  function init() {
    var head = document.getElementById("photoUploadHead");
    if (!head) return;

    // Collapsible 折疊
    head.addEventListener("click", function() {
      var body  = document.getElementById("photoUploadBody");
      var arrow = head.querySelector(".collapsible-arrow");
      var open  = body.style.display !== "none";
      body.style.display = open ? "none" : "block";
      if (arrow) arrow.textContent = open ? "▶" : "▼";
    });

    // 選取檔案
    var fileInput = document.getElementById("photoFileInput");
    if (fileInput) {
      fileInput.addEventListener("change", function(e) {
        photoFiles = Array.from(e.target.files || []);
        var countEl = document.getElementById("photoFileCount");
        if (countEl) countEl.textContent = photoFiles.length ? photoFiles.length + " 張" : "";
        renderPhotoPreview(photoFiles);
        var actionsEl = document.getElementById("photoUploadActions");
        if (actionsEl) actionsEl.style.display = photoFiles.length ? "block" : "none";
        var resultEl = document.getElementById("photoResultWrap");
        if (resultEl) resultEl.style.display = "none";
        document.getElementById("photoResultBody").innerHTML = "";
        photoResults = [];
      });
    }

    var btnUpload = document.getElementById("btnStartPhotoUpload");
    if (btnUpload) btnUpload.addEventListener("click", startPhotoUpload);

    var btnExport = document.getElementById("btnExportPhotoUrls");
    if (btnExport) btnExport.addEventListener("click", exportPhotoResults);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ═══════════════════════════════════════════════════════════
// 🔗 批次 CTA 管理模組 v1.0
// ═══════════════════════════════════════════════════════════
(function() {
  "use strict";

  var GAS_URL = "https://angel-namecard.letssyncus.com/gas-proxy/exec";

  function getKey() {
    return localStorage.getItem("hsc_admin_key") || "";
  }

  async function gasPost(action, params) {
    var body = Object.assign({ action: action, admin_key: getKey() }, params);
    var res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    var json = await res.json();
    if (!json.ok) throw new Error(json.error || "GAS 回傳失敗");
    return json;
  }

  // ── 新增一行 CTA ────────────────────────────────────────
  function addCtaRow(seq, text, link) {
    var tbody = document.getElementById("ctaEditorBody");
    if (!tbody) return;
    // 清除提示列
    if (tbody.querySelector("td[colspan]")) tbody.innerHTML = "";

    var rowCount = tbody.querySelectorAll("tr[data-cta-row]").length + 1;
    var seqNum = seq || rowCount;
    var tr = document.createElement("tr");
    tr.setAttribute("data-cta-row", "1");

    var td0 = document.createElement("td");
    td0.style.cssText = "padding:4px 6px;border:1px solid var(--border);text-align:center;font-size:12px;color:var(--ink3);";
    td0.className = "cta-seq-cell";
    td0.textContent = seqNum;

    var td1 = document.createElement("td");
    td1.style.cssText = "padding:4px 6px;border:1px solid var(--border);";
    var inp1 = document.createElement("input");
    inp1.type = "text"; inp1.className = "cta-text-input";
    inp1.value = text || "";
    inp1.placeholder = "按鈕名稱（如：王小明）";
    inp1.style.cssText = "width:100%;font-size:12px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;background:var(--surface);box-sizing:border-box;";
    td1.appendChild(inp1);

    var td2 = document.createElement("td");
    td2.style.cssText = "padding:4px 6px;border:1px solid var(--border);";
    var inp2 = document.createElement("input");
    inp2.type = "text"; inp2.className = "cta-link-input";
    inp2.value = link || "";
    inp2.placeholder = "https://... 或 tel:09xxxxxxxx";
    inp2.style.cssText = "width:100%;font-size:12px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;background:var(--surface);box-sizing:border-box;";
    td2.appendChild(inp2);

    var td3 = document.createElement("td");
    td3.style.cssText = "padding:4px 6px;border:1px solid var(--border);text-align:center;";
    var btnDel = document.createElement("button");
    btnDel.textContent = "✕";
    btnDel.style.cssText = "font-size:13px;background:none;border:none;color:#e55;cursor:pointer;padding:2px 6px;line-height:1;";
    btnDel.addEventListener("click", function() {
      tr.parentNode.removeChild(tr);
      reorderSeq();
    });
    td3.appendChild(btnDel);

    tr.appendChild(td0); tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    tbody.appendChild(tr);
  }

  function reorderSeq() {
    var rows = document.querySelectorAll("#ctaEditorBody tr[data-cta-row]");
    rows.forEach(function(tr, i) {
      var cell = tr.querySelector(".cta-seq-cell");
      if (cell) cell.textContent = i + 1;
    });
  }

  function getCtaRows() {
    var rows = document.querySelectorAll("#ctaEditorBody tr[data-cta-row]");
    var result = [];
    rows.forEach(function(tr, i) {
      var text = (tr.querySelector(".cta-text-input") || {}).value || "";
      var link = (tr.querySelector(".cta-link-input") || {}).value || "";
      if (text.trim() || link.trim()) {
        result.push({ seq: i + 1, cta_text: text.trim(), cta_link: link.trim() });
      }
    });
    return result;
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("ctaSaveStatus");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok === false ? "#e55" : (ok === true ? "var(--primary)" : "var(--ink2)");
  }

  // ── 查詢現有 CTA（輔助功能）────────────────────────────────
  async function fetchCtas() {
    var cardId = (document.getElementById("ctaCardId").value || "").trim().toUpperCase();
    if (!cardId) { setStatus("請先輸入主綁卡號", false); return; }

    setStatus("查詢中…");
    try {
      var res = await gasPost("adminGetCardCtas", { card_id: cardId });
      var ctas = res.ctas || [];
      var tbody = document.getElementById("ctaEditorBody");
      tbody.innerHTML = "";

      if (!ctas.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='padding:12px;text-align:center;color:var(--ink3);font-size:12px;border:1px solid var(--border);'>此卡目前無 CTA，可直接新增</td></tr>";
      } else {
        ctas.forEach(function(c) { addCtaRow(c.seq, c.cta_text, c.cta_link); });
      }
      document.getElementById("ctaEditorTitle").textContent = "CTA 列表（" + cardId + "，共 " + ctas.length + " 筆）";
      setStatus("查詢完成，共 " + ctas.length + " 筆", true);
    } catch(err) {
      setStatus("❌ " + err.message, false);
    }
  }

  // ── 自動產生員工連結（主流程）────────────────────────────
  async function autoGenCtas() {
    var mainCardId = (document.getElementById("ctaCardId").value || "").trim().toUpperCase();
    if (!mainCardId) { setStatus("請輸入主綁卡號（負責人）", false); return; }

    var btn = document.getElementById("btnAutoGenCtas");
    btn.disabled = true; btn.textContent = "讀取中…";
    setStatus("讀取員工清單中…");

    try {
      var res = await gasPost("adminGetCardsByReferrer", { referrer_id: mainCardId });
      var cards = res.cards || [];
      if (!cards.length) { setStatus("找不到此主綁卡轄下的員工卡，可手動新增", false); return; }

      var tbody = document.getElementById("ctaEditorBody");
      tbody.innerHTML = "";
      cards.forEach(function(card, i) {
        var ctaText = [card.name, card.title].filter(Boolean).join(" ");
        var link = "https://angel-namecard.letssyncus.com/index.html?id=" + card.id;
        addCtaRow(i + 1, ctaText, link);
      });
      document.getElementById("ctaEditorTitle").textContent =
        "CTA 列表（" + mainCardId + " 轄下，共 " + cards.length + " 筆）";
      setStatus("已填入 " + cards.length + " 筆員工 CTA，確認後按儲存到主綁卡", true);
    } catch(err) {
      setStatus("❌ " + err.message, false);
    } finally {
      btn.disabled = false; btn.textContent = "⚡ 抓員工建 CTA";
    }
  }

  // ── 儲存 ──────────────────────────────────────────────
  async function saveCtas() {
    var cardId = (document.getElementById("ctaCardId").value || "").trim().toUpperCase();
    if (!cardId) { setStatus("請先輸入要設定 CTA 的卡號", false); return; }

    var ctas = getCtaRows();
    if (!ctas.length) {
      if (!confirm("CTA 列表為空，確定要清除 " + cardId + " 的所有 CTA 嗎？")) return;
    }

    var btn = document.getElementById("btnSaveCtas");
    btn.disabled = true; btn.textContent = "儲存中…";
    setStatus("儲存中…");

    try {
      var res = await gasPost("adminSetCardCtas", { card_id: cardId, ctas: ctas });
      setStatus("✅ 已儲存！" + cardId + " 共 " + (res.count !== undefined ? res.count : ctas.length) + " 個 CTA", true);
      document.getElementById("ctaEditorTitle").textContent =
        "CTA 列表（" + cardId + "，共 " + ctas.length + " 筆）";
    } catch(err) {
      setStatus("❌ 儲存失敗：" + err.message, false);
    } finally {
      btn.disabled = false; btn.textContent = "💾 儲存（取代該卡所有 CTA）";
    }
  }

  // ── 初始化 ─────────────────────────────────────────────
  function init() {
    var head = document.getElementById("ctaManagerHead");
    if (!head) return;

    head.addEventListener("click", function() {
      var body  = document.getElementById("ctaManagerBody");
      var arrow = head.querySelector(".collapsible-arrow");
      var open  = body.style.display !== "none";
      body.style.display = open ? "none" : "block";
      if (arrow) arrow.textContent = open ? "▶" : "▼";
    });

    var lnkFetch = document.getElementById("lnkFetchCtas");
    if (lnkFetch) lnkFetch.addEventListener("click", function(e) { e.preventDefault(); fetchCtas(); });

    var btnAuto = document.getElementById("btnAutoGenCtas");
    if (btnAuto) btnAuto.addEventListener("click", autoGenCtas);

    var btnAdd = document.getElementById("btnAddCtaRow");
    if (btnAdd) btnAdd.addEventListener("click", function() { addCtaRow(); });

    var btnSave = document.getElementById("btnSaveCtas");
    if (btnSave) btnSave.addEventListener("click", saveCtas);

    var cardIdInput = document.getElementById("ctaCardId");
    if (cardIdInput) {
      cardIdInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") autoGenCtas();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ═══════════════════════════════════════════════════════════
// 🏦 銀行對帳批次匯入模組 v1.0
// ═══════════════════════════════════════════════════════════
(function() {
  "use strict";

  var GAS_URL  = "https://angel-namecard.letssyncus.com/gas-proxy/exec";
  var bankRows = [];
  var matchResults = [];

  function getKey() { return localStorage.getItem("hsc_admin_key") || ""; }

  function setStatus(msg, ok) {
    var el = document.getElementById("bankImportStatus");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok === false ? "#e55" : (ok === true ? "var(--primary)" : "var(--ink2)");
  }

  async function gasPost(action, params) {
    var body = Object.assign({ action: action, admin_key: getKey() }, params);
    var res  = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    var json = await res.json();
    if (!json.ok) throw new Error(json.error || "GAS 回傳失敗");
    return json;
  }

  // ── 下載範本 ──────────────────────────────────────────
  function downloadBankTemplate() {
    if (!window.XLSX) { alert("XLSX 套件未載入"); return; }
    var rows = [
      ["入帳日期", "入帳金額", "末五碼", "備註"],
      ["2026-05-24", 1500, "12345", "王小明轉入"],
      ["2026-05-24", 3000, "67890", ""]
    ];
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{wch:14},{wch:10},{wch:8},{wch:20}];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "銀行明細");
    XLSX.writeFile(wb, "HSC_銀行對帳範本.xlsx");
  }

  // ── 解析 Excel ────────────────────────────────────────
  function parseBankExcel(file) {
    return new Promise(function(resolve, reject) {
      if (!window.XLSX) { reject(new Error("XLSX 套件未載入")); return; }
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var wb = XLSX.read(e.target.result, { type: "binary" });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          if (raw.length < 2) { reject(new Error("Excel 無資料")); return; }

          var hdrs = raw[0].map(function(h) { return String(h).trim(); });
          function findCol(aliases) {
            for (var i = 0; i < aliases.length; i++) {
              var ix = hdrs.indexOf(aliases[i]);
              if (ix >= 0) return ix;
            }
            return -1;
          }
          var dateCol  = findCol(["入帳日期","日期","交易日期","date"]);
          var amtCol   = findCol(["入帳金額","金額","交易金額","amount"]);
          var last5Col = findCol(["末五碼","末5碼","後5碼","last5"]);
          var noteCol  = findCol(["備註","note","說明","摘要"]);

          if (amtCol < 0 || last5Col < 0) {
            reject(new Error("找不到「入帳金額」或「末五碼」欄，請用範本格式"));
            return;
          }
          var rows = [];
          for (var i = 1; i < raw.length; i++) {
            var r = raw[i];
            var amt   = Number(r[amtCol] || 0);
            var last5 = String(r[last5Col] || "").trim().replace(/\D/g, "");
            if (!amt && !last5) continue;
            rows.push({
              date:   dateCol >= 0 ? String(r[dateCol] || "").trim() : "",
              amount: amt,
              last5:  last5,
              note:   noteCol >= 0 ? String(r[noteCol] || "").trim() : ""
            });
          }
          resolve(rows);
        } catch(err) { reject(err); }
      };
      reader.onerror = function() { reject(new Error("檔案讀取失敗")); };
      reader.readAsBinaryString(file);
    });
  }

  // ── 預覽 ──────────────────────────────────────────────
  function renderBankPreview(rows) {
    var tbody = document.getElementById("bankPreviewBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    rows.forEach(function(r) {
      var tr = document.createElement("tr");
      [r.date || "—", r.amount ? r.amount.toLocaleString() : "—", r.last5 || "—", r.note || ""].forEach(function(v) {
        var td = document.createElement("td");
        td.style.cssText = "padding:4px 8px;border:1px solid var(--border);font-size:11px;";
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // ── 比對結果渲染 ──────────────────────────────────────
  function renderMatchResults(results, summary) {
    var summaryEl = document.getElementById("bankMatchSummary");
    if (summaryEl) {
      summaryEl.innerHTML =
        '<span style="background:#d4edda;color:#155724;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">✅ 已比對 ' + (summary.matched || 0) + ' 筆</span> ' +
        (summary.multiple ? '<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">⚠️ 多筆符合 ' + summary.multiple + ' 筆</span> ' : '') +
        '<span style="background:#f8d7da;color:#721c24;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">❌ 未比對 ' + (summary.unmatched || 0) + ' 筆</span>';
    }
    var tbody = document.getElementById("bankMatchBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    results.forEach(function(r, idx) {
      var tr = document.createElement("tr");

      var statusTd = document.createElement("td");
      statusTd.style.cssText = "padding:4px 8px;border:1px solid var(--border);text-align:center;font-size:12px;white-space:nowrap;font-weight:700;";
      if (r.matched === true)            { statusTd.textContent = "✅ 比對成功"; statusTd.style.color = "#155724"; tr.style.background = "#f0fff4"; }
      else if (r.matched === "multiple") { statusTd.textContent = "⚠️ 多筆符合"; statusTd.style.color = "#856404"; tr.style.background = "#fffef0"; }
      else                               { statusTd.textContent = "❌ " + (r.reason || "未比對"); statusTd.style.color = "#721c24"; }

      function mkTd(txt, extra) {
        var td = document.createElement("td");
        td.style.cssText = "padding:4px 8px;border:1px solid var(--border);font-size:11px;" + (extra || "");
        td.textContent = txt;
        return td;
      }

      // 卡號欄（multiple 時顯示下拉）
      var cardTd = document.createElement("td");
      cardTd.style.cssText = "padding:4px 8px;border:1px solid var(--border);font-size:11px;";
      if (r.matched === true) {
        cardTd.textContent = r.card_id || "—";
      } else if (r.matched === "multiple" && r.candidates) {
        var sel = document.createElement("select");
        sel.style.cssText = "font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;";
        sel.setAttribute("data-ridx", idx);
        r.candidates.forEach(function(c) {
          var opt = document.createElement("option");
          opt.value = c.card_id;
          opt.textContent = c.card_id + " " + c.name;
          sel.appendChild(opt);
        });
        sel.addEventListener("change", function() {
          matchResults[parseInt(this.getAttribute("data-ridx"), 10)].selected_card_id = this.value;
        });
        matchResults[idx].selected_card_id = r.candidates[0].card_id;
        cardTd.appendChild(sel);
      } else {
        cardTd.textContent = "—";
      }

      tr.appendChild(statusTd);
      tr.appendChild(mkTd(r.date || "—"));
      tr.appendChild(mkTd(r.amount ? r.amount.toLocaleString() : "—", "text-align:right;"));
      tr.appendChild(mkTd(r.last5 || "—", "font-family:monospace;"));
      tr.appendChild(cardTd);
      tr.appendChild(mkTd(r.matched === true ? (r.name || "—") : "—"));
      tr.appendChild(mkTd(r.note || "", "color:var(--ink3);"));
      tbody.appendChild(tr);
    });
  }

  // ── 開始比對 ──────────────────────────────────────────
  async function startBankMatch() {
    if (!bankRows.length) { setStatus("請先上傳銀行明細", false); return; }
    var btn = document.getElementById("btnStartBankMatch");
    btn.disabled = true; btn.textContent = "比對中…";
    setStatus("比對中，請稍候…");
    try {
      var res = await gasPost("adminBatchBankMatch", { entries: bankRows });
      matchResults = res.results || [];
      renderMatchResults(matchResults, res.summary || {});
      document.getElementById("bankMatchResultWrap").style.display = "block";
      document.getElementById("bankMatchTitle").textContent = "比對結果（共 " + matchResults.length + " 筆）";
      setStatus("比對完成，請確認後按「確認匯入」", true);
    } catch(err) {
      setStatus("❌ " + err.message, false);
    } finally {
      btn.disabled = false; btn.textContent = "🔍 開始比對";
    }
  }

  // ── 確認匯入 ──────────────────────────────────────────
  async function confirmBankImport() {
    var toImport = matchResults.filter(function(r) {
      return r.matched === true || (r.matched === "multiple" && r.selected_card_id);
    }).map(function(r) {
      return { date: r.date, amount: r.amount, last5: r.last5, note: r.note,
               card_id: r.matched === true ? r.card_id : r.selected_card_id };
    });
    if (!toImport.length) { setStatus("沒有可匯入的項目", false); return; }
    if (!confirm("確定匯入 " + toImport.length + " 筆入帳記錄並觸發開卡嗎？")) return;

    var btn = document.getElementById("btnConfirmBankImport");
    btn.disabled = true; btn.textContent = "匯入中…";
    setStatus("寫入資料並觸發自動比對…");
    try {
      var res = await gasPost("adminConfirmBankImport", { entries: toImport });
      var txt = "✅ 成功寫入 " + res.written + " 筆入帳記錄\n";
      if (res.auto_match && res.auto_match.ok) {
        txt += "🔄 自動比對完成：開卡 " + (res.auto_match.matched_count || res.auto_match.count || 0) + " 張";
      } else {
        txt += "⚠️ " + (res.auto_match && res.auto_match.message ? res.auto_match.message : "請手動重整付款中心確認");
      }
      var resultEl = document.getElementById("bankImportResultText");
      resultEl.style.whiteSpace = "pre-line";
      resultEl.textContent = txt;
      document.getElementById("bankImportResultWrap").style.display = "block";
      setStatus("✅ 完成", true);
    } catch(err) {
      setStatus("❌ 匯入失敗：" + err.message, false);
    } finally {
      btn.disabled = false; btn.textContent = "✅ 確認匯入已比對項目並開卡";
    }
  }

  // ── 初始化 ─────────────────────────────────────────────
  function init() {
    var head = document.getElementById("bankImportHead");
    var collapsible = document.getElementById("bankImportCollapsible");
    if (head && collapsible) {
      head.addEventListener("click", function() { collapsible.classList.toggle("open"); });
    }

    var btnTpl = document.getElementById("btnDownloadBankTemplate");
    if (btnTpl) btnTpl.addEventListener("click", downloadBankTemplate);

    var fileInput = document.getElementById("bankExcelInput");
    if (fileInput) {
      fileInput.addEventListener("change", async function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        setStatus("解析中…");
        try {
          bankRows = await parseBankExcel(file);
          document.getElementById("bankFileCount").textContent = bankRows.length + " 筆";
          renderBankPreview(bankRows);
          document.getElementById("bankPreviewWrap").style.display = "block";
          document.getElementById("bankPreviewTitle").textContent = "預覽（共 " + bankRows.length + " 筆）";
          document.getElementById("bankMatchResultWrap").style.display = "none";
          document.getElementById("bankImportResultWrap").style.display = "none";
          matchResults = [];
          setStatus("已讀取 " + bankRows.length + " 筆，點「開始比對」", true);
        } catch(err) {
          setStatus("❌ " + err.message, false);
        }
      });
    }

    var btnMatch   = document.getElementById("btnStartBankMatch");
    var btnConfirm = document.getElementById("btnConfirmBankImport");
    if (btnMatch)   btnMatch.addEventListener("click", startBankMatch);
    if (btnConfirm) btnConfirm.addEventListener("click", confirmBankImport);
  }

  // ── 主附卡管理 (v452) ─────────────────────────────────────────
  function initMainCardSection() {
    var btnQuery = document.getElementById("btnQueryAttached");
    var btnSet   = document.getElementById("btnSetMainCard");
    if (!btnQuery || !btnSet) return;

    btnQuery.addEventListener("click", async function() {
      var mainId = (document.getElementById("mainCardQueryId").value || "").trim().toUpperCase();
      if (!mainId) { alert("請輸入主卡卡號"); return; }
      btnQuery.disabled = true;
      btnQuery.textContent = "查詢中…";
      try {
        var res = await gasPost("adminGetAttachedCards", { main_card_id: mainId });
        var wrap  = document.getElementById("attachedCardsList");
        var table = document.getElementById("attachedCardsTable");
        if (!res.ok) throw new Error(res.error || "查詢失敗");
        if (res.cards.length === 0) {
          table.innerHTML = '<p style="font-size:13px;color:var(--ink3);">目前無附卡</p>';
        } else {
          var rows = res.cards.map(function(c) {
            return '<tr>' +
              '<td style="padding:5px 8px;">' + c.card_id + '</td>' +
              '<td style="padding:5px 8px;">' + (c.name||"") + '</td>' +
              '<td style="padding:5px 8px;">' + (c.unit||"") + '</td>' +
              '<td style="padding:5px 8px;">' + (c.status||"") + '</td>' +
              '<td style="padding:5px 8px;">' +
                '<button class="btn btn-soft btn-sm detach-btn" data-card="' + c.card_id + '">解除</button>' +
              '</td></tr>';
          }).join("");
          table.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
            '<thead><tr style="background:var(--surface2);">' +
            '<th style="padding:5px 8px;border-bottom:1px solid var(--border);">卡號</th>' +
            '<th style="padding:5px 8px;border-bottom:1px solid var(--border);">姓名</th>' +
            '<th style="padding:5px 8px;border-bottom:1px solid var(--border);">單位</th>' +
            '<th style="padding:5px 8px;border-bottom:1px solid var(--border);">狀態</th>' +
            '<th style="padding:5px 8px;border-bottom:1px solid var(--border);">操作</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';
          // 解除附卡按鈕
          table.querySelectorAll(".detach-btn").forEach(function(btn) {
            btn.addEventListener("click", async function() {
              var cardId = btn.dataset.card;
              if (!confirm("確定解除 " + cardId + " 的附卡關係？")) return;
              btn.disabled = true;
              try {
                var r = await gasPost("adminSetCardMainCard", { card_id: cardId, main_card_id: "" });
                if (r.ok) {
                  btn.closest("tr").remove();
                  showMainCardResult("✅ " + cardId + " 已解除附卡關係", true);
                } else { throw new Error(r.error || "解除失敗"); }
              } catch(e) {
                btn.disabled = false;
                showMainCardResult("❌ " + e.message, false);
              }
            });
          });
        }
        wrap.style.display = "block";
      } catch(e) {
        alert("❌ " + e.message);
      } finally {
        btnQuery.disabled = false;
        btnQuery.textContent = "🔍 查詢";
      }
    });

    btnSet.addEventListener("click", async function() {
      var subCard  = (document.getElementById("subCardId").value || "").trim().toUpperCase();
      var mainCard = (document.getElementById("mainCardSetId").value || "").trim().toUpperCase();
      if (!subCard) { alert("請輸入附卡卡號"); return; }
      var action = mainCard ? ("將 " + subCard + " 設為 " + mainCard + " 的附卡") : ("解除 " + subCard + " 的附卡關係");
      if (!confirm(action + "，確定？")) return;
      btnSet.disabled = true;
      try {
        var res = await gasPost("adminSetCardMainCard", { card_id: subCard, main_card_id: mainCard });
        if (!res.ok) throw new Error(res.error || "設定失敗");
        showMainCardResult("✅ " + action + " 完成", true);
        document.getElementById("subCardId").value = "";
        document.getElementById("mainCardSetId").value = "";
      } catch(e) {
        showMainCardResult("❌ " + e.message, false);
      } finally {
        btnSet.disabled = false;
      }
    });
  }

  function showMainCardResult(msg, ok) {
    var el = document.getElementById("mainCardResult");
    if (!el) return;
    el.style.display = "block";
    el.style.color = ok ? "var(--success)" : "var(--danger)";
    el.textContent = msg;
  }

  initMainCardSection();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ═══════════════════════════════════════════════════════════
// 🤖 AI 協作建卡轉換模組
// ═══════════════════════════════════════════════════════════
(function() {
  "use strict";

  var parsedCards = null;

  var PROMPT_TEMPLATE = [
    "你是資料轉換助手。請把下方「客戶資料」轉換為 JSON 陣列，用於建立幸福智慧名片。",
    "",
    "輸出格式：JSON 陣列，每筆物件包含以下欄位（沒有的資料填空字串 \"\"）：",
    "[",
    "  {",
    "    \"type\": \"負責人 或 員工\",",
    "    \"name\": \"姓名（必填）\",",
    "    \"title\": \"職稱\",",
    "    \"company\": \"公司名稱\",",
    "    \"phone\": \"手機號碼\",",
    "    \"email\": \"電子信箱\",",
    "    \"line_id\": \"LINE ID（如果有 @ 開頭是官方帳號也照填）\",",
    "    \"avatar_url\": \"\",",
    "    \"plan\": \"premium\",",
    "    \"color\": \"\",",
    "    \"region\": \"\",",
    "    \"price\": 0",
    "  }",
    "]",
    "",
    "規則：",
    "1. 第一個人設 type=\"負責人\"，其餘設 type=\"員工\"",
    "2. 若資料中有明確說明職位為主管、負責人、老闆，設為 type=\"負責人\"",
    "3. avatar_url、color、region 全部填 \"\"（空字串）",
    "4. plan 全部填 \"premium\"",
    "5. price 全部填數字 0（不加引號）",
    "6. 只輸出 JSON 陣列本身，不加任何說明文字，不加 markdown 程式碼標記",
    "",
    "客戶資料：",
    "===",
    "{RAW_DATA}",
    "==="
  ].join("\n");

  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("aiConvertStatus");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok === false ? "#e55" : (ok === true ? "var(--primary)" : "var(--ink2)");
  }

  function renderPreview(data) {
    var wrap  = document.getElementById("aiPreviewWrap");
    var head  = document.getElementById("aiPreviewHead");
    var body  = document.getElementById("aiPreviewBody");
    var title = document.getElementById("aiPreviewTitle");
    if (!wrap || !head || !body) return;

    if (title) title.textContent = "預覽（共 " + data.length + " 筆）";

    var cols = ["#","type","name","title","company","phone","email"];
    head.innerHTML = "<tr>" + cols.map(function(c) {
      return "<th style='padding:5px 8px;text-align:left;border:1px solid var(--border);white-space:nowrap;font-size:11px;'>" + c + "</th>";
    }).join("") + "</tr>";

    body.innerHTML = data.map(function(c, i) {
      var bg = c.type === "負責人" ? "background:#fff8e8;" : "";
      var vals = [i+1, "<strong>" + esc(c.type||"") + "</strong>",
        esc(c.name||""), esc(c.title||"-"), esc(c.company||"-"),
        esc(c.phone||"-"), esc(c.email||"-")];
      return "<tr style='" + bg + "'>" + vals.map(function(v) {
        return "<td style='padding:4px 8px;border:1px solid var(--border);font-size:11px;'>" + v + "</td>";
      }).join("") + "</tr>";
    }).join("");

    wrap.style.display = "";
  }

  function downloadExcel() {
    if (!parsedCards || !parsedCards.length) { setStatus("請先解析 JSON", false); return; }
    if (!window.XLSX) { setStatus("❌ XLSX 未載入", false); return; }
    var headers = ["type","name","title","company","phone","email","line_id","avatar_url","plan","color","region","price"];
    var rows = [headers].concat(parsedCards.map(function(c) {
      return headers.map(function(k) { return c[k] !== undefined ? c[k] : ""; });
    }));
    var ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [8,12,10,12,12,18,12,30,8,6,6,6].map(function(w) { return { wch: w }; });
    var wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "批次建卡");
    window.XLSX.writeFile(wb, "HSC批次建卡_AI轉換.xlsx");
  }

  function saveMasterInput(data) {
    try {
      localStorage.setItem("hsc_batch_master", JSON.stringify({
        data: data.map(function(c) { return Object.assign({}, c, { card_id: "" }); }),
        saved_at: new Date().toISOString(),
        source: "ai_convert"
      }));
      var statusEl = document.getElementById("masterFileStatus");
      if (statusEl) statusEl.textContent = "📋 主檔已儲存（" + data.length + " 筆，待建卡）";
    } catch(_) {}
  }

  function init() {
    var head = document.getElementById("aiConvertHead");
    var body = document.getElementById("aiConvertBody") ||
               (head && head.closest(".collapsible") && head.closest(".collapsible").querySelector(".collapsible-body"));
    if (!head) return;

    // Collapsible
    head.addEventListener("click", function() {
      if (!body) return;
      var open = body.style.display !== "none";
      body.style.display = open ? "none" : "";
      var ch = head.querySelector(".chevron");
      if (ch) ch.style.transform = open ? "" : "rotate(90deg)";
    });

    // ① 產生 Claude 指令
    var btnGen = document.getElementById("btnGenPrompt");
    if (btnGen) btnGen.addEventListener("click", function() {
      var raw = ((document.getElementById("aiRawInput") || {}).value || "").trim();
      if (!raw) { setStatus("請先貼上客戶資料", false); return; }
      var prompt = PROMPT_TEMPLATE.replace("{RAW_DATA}", raw);
      var out = document.getElementById("aiPromptOutput");
      if (out) out.value = prompt;
      var s2 = document.getElementById("aiStep2");
      var s3 = document.getElementById("aiStep3");
      if (s2) s2.style.display = "";
      if (s3) s3.style.display = "";
      setStatus("✅ 指令已產生，請複製後貼給 Claude", true);
    });

    // ② 複製指令
    var btnCopy = document.getElementById("btnCopyPrompt");
    if (btnCopy) btnCopy.addEventListener("click", function() {
      var out = document.getElementById("aiPromptOutput");
      if (!out) return;
      navigator.clipboard.writeText(out.value).then(function() {
        btnCopy.textContent = "✅ 已複製！";
        setTimeout(function() { btnCopy.textContent = "📋 一鍵複製"; }, 2500);
      });
    });

    // ③ 解析 Claude JSON
    var btnParse = document.getElementById("btnParseJson");
    if (btnParse) btnParse.addEventListener("click", function() {
      var json = ((document.getElementById("aiJsonInput") || {}).value || "").trim();
      if (!json) { setStatus("請貼上 Claude 回傳的 JSON", false); return; }

      var match = json.match(/\[[\s\S]*\]/);
      if (!match) { setStatus("❌ 找不到 JSON 陣列，請確認 Claude 有正確輸出（需要 [ ] 包起來的格式）", false); return; }

      var data;
      try { data = JSON.parse(match[0]); }
      catch(err) { setStatus("❌ JSON 格式有誤：" + err.message, false); return; }

      if (!Array.isArray(data) || !data.length) { setStatus("❌ 資料是空的", false); return; }

      parsedCards = data;
      renderPreview(data);
      setStatus("✅ 解析成功，共 " + data.length + " 筆。確認無誤後按「儲存主檔並載入建卡」", true);
    });

    // 下載 Excel
    var btnDl = document.getElementById("btnDownloadAiExcel");
    if (btnDl) btnDl.addEventListener("click", downloadExcel);

    // 儲存主檔並載入建卡
    var btnSave = document.getElementById("btnSaveAiMaster");
    if (btnSave) btnSave.addEventListener("click", function() {
      if (!parsedCards || !parsedCards.length) { setStatus("請先解析 Claude 回傳的 JSON", false); return; }
      saveMasterInput(parsedCards);
      if (window._hscBatchLoad) {
        var ok = window._hscBatchLoad(parsedCards);
        if (ok) setStatus("✅ 主檔已儲存，建卡預覽已載入！往下捲動確認預覽，再按「開始批次建卡」", true);
      } else {
        downloadExcel();
        setStatus("✅ 主檔已儲存，Excel 已下載，請至建卡區上傳", true);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
