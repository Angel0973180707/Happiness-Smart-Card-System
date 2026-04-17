(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v6.5.4-fixed-v1.5.1",
    GAS_BASE_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FORM_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/form.html",
    DEFAULT_RENEW_DAYS: 365,
    API_TIMEOUT_MS: 10000,
    API_RETRY: 1,
    // 銀行資訊
    BANK_NAME: "玉山銀行",
    BANK_CODE: "808",
    BANK_ACCOUNT: "0738968051590",
    BANK_HOLDER: "李秀芳",
    BANK_ACCOUNT_LAST5: "51590",
    CONTACT_LINE: "@hsc_service",
  };

  // ── KEY STORAGE ──
  const KEY_STORAGE = "hsc_admin_key";
  function getAdminKey() { return localStorage.getItem(KEY_STORAGE) || ""; }
  function saveAdminKey(key) { if (!key || !key.trim()) return false; localStorage.setItem(KEY_STORAGE, key.trim()); return true; }
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
    // 避免重複（同 payment_id）
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
    ledgerRecords: []
  };

  // expose state globally for shell script access
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
  function setLoading(show) { const el = $("#loadingMask"); if (el) el.classList.toggle("hidden", !show); }
  function setBtnLoading(btnEl, isLoading) {
    if (!btnEl) return;
    if (isLoading) { btnEl.dataset.originalText = btnEl.dataset.originalText || btnEl.textContent; btnEl.textContent = "處理中…"; btnEl.disabled = true; }
    else { btnEl.textContent = btnEl.dataset.originalText || btnEl.textContent; btnEl.disabled = false; delete btnEl.dataset.originalText; }
  }

  function on(selector, event, handler) {
    const el = $(selector);
    if (el) el.addEventListener(event, handler);
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

  // 建卡完成通知（第一次發送）
  function buildCardCreatedNotice(card) {
    const name = textOf(card.name || card.owner_name) || '您';
    const cardId = textOf(card.id || card.card_id);
    const deadline = formatDeadlineStr(card);
    const amount = card.amount || card.plan_price || '請洽客服';
    const previewUrl = `${CONFIG.HUB_URL}index.html?id=${encodeURIComponent(cardId)}`;

    return `您好 ${name}，

🎉 您的 HSC 智慧名片已建立完成！

請依照以下步驟完成付款，名片即可正式啟用：

━━━━━━━━━━━━━━━━━
💳【付款資訊】
銀行：${CONFIG.BANK_NAME}（${CONFIG.BANK_CODE}）
帳號：${CONFIG.BANK_ACCOUNT}
戶名：${CONFIG.BANK_HOLDER}
金額：NT$ ${amount}
━━━━━━━━━━━━━━━━━

📋【付款注意事項】
1. 付款後請提供後 5 碼（${CONFIG.BANK_ACCOUNT_LAST5}）對帳確認
2. 付款截止時間：${deadline || '請盡快完成'}
3. 付款確認後 1 個工作天內啟用
4. 啟用後將發送名片連結至您

🔗 名片預覽：
${previewUrl}

📩 如有任何問題，請透過 LINE 官方帳號聯繫：
${CONFIG.CONTACT_LINE}

感謝您的支持！`;
  }

  // 催繳提醒文案
  function buildPaymentReminderNotice(card) {
    const name = textOf(card.name || card.owner_name) || '您';
    const cardId = textOf(card.id || card.card_id);
    const deadline = formatDeadlineStr(card);
    const amount = card.amount || card.plan_price || '請洽客服';
    const payUrl = `${CONFIG.HUB_URL}renew.html?id=${encodeURIComponent(cardId)}`;
    const base = calcDeadline(card);
    let urgencyPrefix = '';
    if (base) {
      const hLeft = Math.floor((base - new Date()) / 3600000);
      if (hLeft < 0) urgencyPrefix = '⚠️ 您的付款已逾期，';
      else if (hLeft < 24) urgencyPrefix = `🔴 付款截止時間剩不到 ${hLeft} 小時，`;
      else urgencyPrefix = '';
    }

    return `您好 ${name}，

${urgencyPrefix}提醒您完成 HSC 智慧名片付款以正式啟用服務。

━━━━━━━━━━━━━━━━━
💳【付款資訊】
銀行：${CONFIG.BANK_NAME}（${CONFIG.BANK_CODE}）
帳號：${CONFIG.BANK_ACCOUNT}
戶名：${CONFIG.BANK_HOLDER}
金額：NT$ ${amount}
━━━━━━━━━━━━━━━━━

⏰ 付款截止：${deadline || '請盡快完成'}

📋【注意事項】
・付款後請回覆帳號後 5 碼（${CONFIG.BANK_ACCOUNT_LAST5}）
・確認後 1 個工作天內啟用
・如需延期請提前告知

📩 聯繫客服：${CONFIG.CONTACT_LINE}`;
  }

  // ── INVITE HELPERS ──
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
    return `您好，這是您的申請入口\n\n申請編號：${requestId}\n邀請碼：${code}\n\n👉 點擊填寫：\n${formUrl}`;
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
    copyText(buildInviteFormUrl(r.assigned_invite_code, r.form_url), "已複製申請連結");
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

  // ── RENDER CARDS ──
  function renderCards() {
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

  // ── CARDS LIST (new UI with countdown + notice buttons) ──
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

    container.innerHTML = rows.map(c => {
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
            <div class="action-strip" style="flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" data-action="cardDetail" data-cid="${id}">完整詳情</button>
              <button class="btn btn-soft btn-sm" data-action="goDelivery" data-cid="${id}">前往交付</button>
              ${unpaid ? `
              <button class="btn btn-ok btn-sm" data-action="copyCardCreated" data-cid="${id}">🎉 建卡通知</button>
              <button class="btn btn-warn btn-sm" data-action="copyPayNotice" data-cid="${id}">📋 催繳文案</button>
              ` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.list-row-head[data-type="card"]').forEach(head => {
      head.addEventListener('click', () => {
        const row = document.getElementById(`crow-${head.dataset.row}`);
        if (row) row.classList.toggle('open');
      });
    });

    container.addEventListener('click', e => {
      // 完整詳情
      const detailBtn = e.target.closest('[data-action="cardDetail"]');
      if (detailBtn) {
        e.stopPropagation();
        if (typeof window.loadCardDetail === 'function') window.loadCardDetail(detailBtn.dataset.cid);
        return;
      }
      // 前往交付
      const goBtn = e.target.closest('[data-action="goDelivery"]');
      if (goBtn) {
        e.stopPropagation();
        const cid = goBtn.dataset.cid;
        const inp = $('#deliveryCardIdInput');
        if (inp) inp.value = cid;
        if (typeof window.activateAdminSection === 'function') window.activateAdminSection('deliverySection');
        if (typeof window.loadCardDetail === 'function') window.loadCardDetail(cid);
        const dc = $('#deliveryContent'); if (dc) dc.style.display = 'block';
        const de = $('#deliveryEmpty'); if (de) de.style.display = 'none';
        return;
      }
      // 建卡通知
      const createdBtn = e.target.closest('[data-action="copyCardCreated"]');
      if (createdBtn) {
        e.stopPropagation();
        const cid = createdBtn.dataset.cid;
        const card = state.cards.find(c => String(c.id || c.card_id) === cid) || {};
        copyText(buildCardCreatedNotice(card), '✅ 已複製建卡通知文案');
        return;
      }
      // 催繳文案
      const payBtn = e.target.closest('[data-action="copyPayNotice"]');
      if (payBtn) {
        e.stopPropagation();
        const cid = payBtn.dataset.cid;
        const card = state.cards.find(c => String(c.id || c.card_id) === cid) || {};
        copyText(buildPaymentReminderNotice(card), '✅ 已複製催繳文案');
        return;
      }
    });
  };

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
        ${unpaid ? `
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ok btn-sm" id="btnDeliveryCardCreated">🎉 複製建卡通知</button>
          <button class="btn btn-warn btn-sm" id="btnDeliveryPayReminder">📋 複製催繳文案</button>
        </div>` : ''}
      </div>`;

      summaryEl.querySelector('#btnDeliveryCardCreated')?.addEventListener('click', () => {
        copyText(buildCardCreatedNotice(card), '✅ 已複製建卡通知文案');
      });
      summaryEl.querySelector('#btnDeliveryPayReminder')?.addEventListener('click', () => {
        copyText(buildPaymentReminderNotice(card), '✅ 已複製催繳文案');
      });
    }

    if (typeof window.renderDeliveryLinks === 'function') {
      window.renderDeliveryLinks(id, meta.referral_link);
    }

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
    const todayPayments = state.payments.filter(p => textOf(p.paid_at || p.created_at || "").startsWith(todayStr)).length;

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

  // ── PAYMENTS ──
  function renderPayments() {
    const container = $('#paymentsListContainer');
    if (!container) return;
    if (!state.paymentList.length) { container.innerHTML = '<div class="empty-state">尚無付款資料</div>'; return; }
    container.innerHTML = state.paymentList.map(p => {
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
              ${status === 'paid' ? `<button class="btn btn-danger btn-sm btn-pay-refund" data-pid="${pid}">退款</button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.list-row-head[data-type="payment"]').forEach(head => {
      head.addEventListener('click', () => document.getElementById(`prow-${head.dataset.row}`)?.classList.toggle('open'));
    });
    container.querySelectorAll('.btn-pay-confirm').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); confirmPaymentFromUi(btn.dataset.pid); }));
    container.querySelectorAll('.btn-pay-refund').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); markPaymentRefundedFromUi(btn.dataset.pid); }));
  }

  async function confirmPaymentFromUi(paymentId) {
    if (!confirm(`確認付款單 ${paymentId} 已付款？`)) return;
    if (!doubleConfirmId(paymentId, "付款單")) return;
    try {
      const res = await apiPost("confirmPayment", { payment_id: paymentId });
      toast("✅ 付款已確認");
      const paidAt = res?.payment?.paid_at || new Date().toISOString();
      patchListItem(state.paymentList, "payment_id", paymentId, { status: "paid", billing_status: "paid", paid_at: paidAt });
      patchListItem(state.payments, "payment_id", paymentId, { status: "paid", billing_status: "paid", paid_at: paidAt });
      const cardId = res?.card?.id || res?.card_id;
      const amount = res?.payment?.amount || res?.amount;
      if (cardId) patchListItem(state.cards, "id", cardId, { billing_status: "paid", payment_paid_at: paidAt });

      // 自動記帳
      const card = cardId ? state.cards.find(c => String(c.id || c.card_id) === String(cardId)) : null;
      addLedgerRecord({
        type: 'income',
        payment_id: paymentId,
        card_id: cardId || '',
        card_name: card ? (card.name || card.owner_name || '') : '',
        amount: amount || 0,
        paid_at: paidAt,
        note: '付款確認自動記帳',
        commission: 0,
        withdrawn: 0,
      });

      // 若記帳頁面正在顯示，更新它
      const ledgerSection = $('#ledgerSection');
      if (ledgerSection?.classList.contains('active')) renderLedger();

      renderPayments(); renderCards(); renderDashboard();
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
      renderPayments();
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
            <div class="list-row-right">
              <span class="badge ${badgeClass}">${escapeHtml(status || '-')}</span>
            </div>
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
              <div class="list-row-title">${escapeHtml(textOf(item.agent_id))}</div>
              <div class="list-row-sub">${cid} · $${escapeHtml(formatValue(item.amount))}</div>
            </div>
            <div class="list-row-right">
              <span class="badge ${status === 'paid' ? 'badge-ok' : 'badge-warn'}">${escapeHtml(status || 'pending')}</span>
            </div>
            <span class="chevron" style="margin-left:6px;">›</span>
          </div>
          <div class="list-row-body">
            <div class="detail-grid" style="margin-top:0;">
              ${renderDetailItem("分潤ID", item.commission_id || item.id)}
              ${renderDetailItem("代理ID", item.agent_id)}
              ${renderDetailItem("金額", item.amount)}
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

      // 記帳：分潤取款紀錄
      const item = state.commissionItems.find(c => String(c.commission_id || c.id) === commissionId);
      if (item) {
        addLedgerRecord({
          type: 'commission_paid',
          payment_id: item.payment_id || '',
          card_id: item.card_id || '',
          card_name: '',
          amount: item.amount || 0,
          paid_at: new Date().toISOString(),
          note: `分潤付款 代理：${item.agent_id || ''}`,
          commission: item.amount || 0,
          withdrawn: item.amount || 0,
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
            <div class="list-row-right">
              <span class="badge ${status === 'active' ? 'badge-ok' : 'badge-neutral'}">${escapeHtml(status)}</span>
            </div>
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

  // ══════════════════════════════════════════
  // ── 記帳功能 ──
  // ══════════════════════════════════════════

  function formatMoney(v) {
    const n = Number(v || 0);
    return 'NT$ ' + n.toLocaleString('zh-TW');
  }

  function renderLedger() {
    const container = $('#ledgerSection');
    if (!container) return;

    // 合併 localStorage + commission 資料
    const localRecords = getLedgerRecords();

    // 從 commission state 補入分潤紀錄（避免重複）
    const commissionRecords = state.commissionItems
      .filter(c => textOf(c.status).toLowerCase() === 'paid')
      .map(c => ({
        ledger_id: `CM_${c.commission_id || c.id}`,
        type: 'commission_paid',
        payment_id: c.payment_id || '',
        card_id: c.card_id || '',
        card_name: '',
        amount: 0,
        commission: Number(c.amount || 0),
        withdrawn: Number(c.amount || 0),
        paid_at: c.paid_at || c.created_at || '',
        note: `分潤 代理：${c.agent_id || ''}`,
        created_at: c.created_at || '',
      }));

    // 合併，local 優先（有相同 ledger_id 不重複）
    const allLocalIds = new Set(localRecords.map(r => r.ledger_id));
    const merged = [
      ...localRecords,
      ...commissionRecords.filter(r => !allLocalIds.has(r.ledger_id))
    ].sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at));

    // 統計
    const totalIncome = merged.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalCommission = merged.reduce((s, r) => s + Number(r.commission || 0), 0);
    const totalWithdrawn = merged.reduce((s, r) => s + Number(r.withdrawn || 0), 0);
    const totalManual = merged.filter(r => r.type === 'manual').reduce((s, r) => s + Number(r.amount || 0), 0);

    // 月報 map
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
      <!-- 統計磚 -->
      <div class="stats-row" style="margin-bottom:16px;">
        <div class="stat-tile ok">
          <div class="stat-label">總收款</div>
          <div class="stat-value" style="font-size:18px;">${formatMoney(totalIncome)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">總分潤</div>
          <div class="stat-value" style="font-size:18px;">${formatMoney(totalCommission)}</div>
        </div>
        <div class="stat-tile warn">
          <div class="stat-label">已取款</div>
          <div class="stat-value" style="font-size:18px;">${formatMoney(totalWithdrawn)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">手動調整</div>
          <div class="stat-value" style="font-size:18px;">${formatMoney(totalManual)}</div>
        </div>
      </div>

      <!-- 月報 -->
      <div class="section-label">📅 月報表</div>
      <div class="card" style="margin-bottom:14px;overflow:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--surface2);border-bottom:1px solid var(--border);">
              <th style="padding:10px 12px;text-align:left;font-weight:900;color:var(--ink2);">月份</th>
              <th style="padding:10px 12px;text-align:right;font-weight:900;color:var(--ok);">收款</th>
              <th style="padding:10px 12px;text-align:right;font-weight:900;color:var(--ink3);">分潤</th>
              <th style="padding:10px 12px;text-align:right;font-weight:900;color:var(--warn);">取款</th>
            </tr>
          </thead>
          <tbody>
            ${months.length ? months.map(([month, d]) => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:9px 12px;font-weight:800;">${escapeHtml(month)}</td>
                <td style="padding:9px 12px;text-align:right;color:var(--ok);font-weight:700;">${formatMoney(d.income)}</td>
                <td style="padding:9px 12px;text-align:right;color:var(--ink2);font-weight:700;">${formatMoney(d.commission)}</td>
                <td style="padding:9px 12px;text-align:right;color:var(--warn);font-weight:700;">${formatMoney(d.withdrawn)}</td>
              </tr>`).join('') : '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--ink3);">尚無資料</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- 手動新增 -->
      <div class="collapsible" id="ledgerAddCollapsible">
        <div class="collapsible-head" id="ledgerAddHead">
          <span>➕ 手動新增記錄</span>
          <span class="chevron">›</span>
        </div>
        <div class="collapsible-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="field">
              <label>類型</label>
              <select id="ledgerAddType">
                <option value="income">收款</option>
                <option value="commission_paid">分潤取款</option>
                <option value="manual">手動調整</option>
                <option value="withdrawal">取款</option>
              </select>
            </div>
            <div class="field">
              <label>金額</label>
              <input type="number" id="ledgerAddAmount" placeholder="0" min="0">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="field">
              <label>分潤金額</label>
              <input type="number" id="ledgerAddCommission" placeholder="0" min="0">
            </div>
            <div class="field">
              <label>取款金額</label>
              <input type="number" id="ledgerAddWithdrawn" placeholder="0" min="0">
            </div>
          </div>
          <div class="field">
            <label>卡片 ID（選填）</label>
            <input type="text" id="ledgerAddCardId" placeholder="選填">
          </div>
          <div class="field">
            <label>日期</label>
            <input type="datetime-local" id="ledgerAddDate">
          </div>
          <div class="field">
            <label>備註</label>
            <input type="text" id="ledgerAddNote" placeholder="選填">
          </div>
          <button class="btn btn-primary btn-full" id="btnLedgerAdd">新增</button>
        </div>
      </div>

      <!-- 明細列表 -->
      <div class="section-label">📋 收支明細</div>
      <div id="ledgerDetailList">
        ${merged.length === 0 ? '<div class="empty-state">尚無記帳資料</div>' :
          merged.map(r => renderLedgerRow(r)).join('')}
      </div>
    `;

    // 綁定月報收合
    wrap.querySelector('#ledgerAddHead')?.addEventListener('click', () => {
      wrap.querySelector('#ledgerAddCollapsible')?.classList.toggle('open');
    });

    // 預設日期為現在
    const dateInput = wrap.querySelector('#ledgerAddDate');
    if (dateInput) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      dateInput.value = local;
    }

    // 新增按鈕
    wrap.querySelector('#btnLedgerAdd')?.addEventListener('click', () => {
      const type = wrap.querySelector('#ledgerAddType')?.value || 'income';
      const amount = Number(wrap.querySelector('#ledgerAddAmount')?.value || 0);
      const commission = Number(wrap.querySelector('#ledgerAddCommission')?.value || 0);
      const withdrawn = Number(wrap.querySelector('#ledgerAddWithdrawn')?.value || 0);
      const cardId = textOf(wrap.querySelector('#ledgerAddCardId')?.value);
      const note = textOf(wrap.querySelector('#ledgerAddNote')?.value);
      const dateVal = wrap.querySelector('#ledgerAddDate')?.value;
      const paid_at = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();
      if (!amount && !commission && !withdrawn) return toast('請輸入金額');
      addLedgerRecord({ type, amount, commission, withdrawn, card_id: cardId, note, paid_at });
      toast('✅ 已新增記錄');
      renderLedger();
    });

    // 編輯 / 刪除 事件委派
    wrap.querySelector('#ledgerDetailList')?.addEventListener('click', e => {
      const editBtn = e.target.closest('[data-ledger-edit]');
      if (editBtn) { openLedgerEditModal(editBtn.dataset.ledgerEdit); return; }
      const delBtn = e.target.closest('[data-ledger-del]');
      if (delBtn) {
        if (!confirm('確定刪除此筆記錄？')) return;
        const records = getLedgerRecords().filter(r => r.ledger_id !== delBtn.dataset.ledgerDel);
        saveLedgerRecords(records);
        toast('已刪除');
        renderLedger();
      }
    });
  }

  function renderLedgerRow(r) {
    const typeLabel = { income: '💰 收款', commission_paid: '💵 分潤取款', manual: '✏️ 手動', withdrawal: '🏦 取款' }[r.type] || r.type;
    const typeColor = { income: 'var(--ok)', commission_paid: 'var(--warn)', manual: 'var(--info)', withdrawal: 'var(--ink3)' }[r.type] || 'var(--ink)';
    const dt = (r.paid_at || r.created_at || '').slice(0, 10);
    const isLocal = !r.ledger_id?.startsWith('CM_');
    return `
      <div class="list-row" style="margin-bottom:6px;">
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
          ${isLocal ? `
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button class="btn btn-soft btn-sm" style="padding:0 8px;height:32px;" data-ledger-edit="${escapeHtml(r.ledger_id)}">編輯</button>
            <button class="btn btn-danger btn-sm" style="padding:0 8px;height:32px;" data-ledger-del="${escapeHtml(r.ledger_id)}">刪</button>
          </div>` : ''}
        </div>
      </div>`;
  }

  function openLedgerEditModal(ledgerId) {
    const records = getLedgerRecords();
    const record = records.find(r => r.ledger_id === ledgerId);
    if (!record) return toast('找不到記錄');

    // 簡易 inline 編輯：用 prompt 系列
    const newAmount = prompt('收款金額', record.amount || 0);
    if (newAmount === null) return;
    const newCommission = prompt('分潤金額', record.commission || 0);
    if (newCommission === null) return;
    const newWithdrawn = prompt('取款金額', record.withdrawn || 0);
    if (newWithdrawn === null) return;
    const newNote = prompt('備註', record.note || '');
    if (newNote === null) return;

    const idx = records.findIndex(r => r.ledger_id === ledgerId);
    if (idx >= 0) {
      records[idx] = {
        ...records[idx],
        amount: Number(newAmount) || 0,
        commission: Number(newCommission) || 0,
        withdrawn: Number(newWithdrawn) || 0,
        note: newNote,
      };
      saveLedgerRecords(records);
      toast('✅ 已更新');
      renderLedger();
    }
  }

  // 注入記帳 section 到 DOM（若不存在）
  function injectLedgerSection() {
    if (document.getElementById('ledgerSection')) return;

    // 新增 section
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
      await loadCommissionList();
      renderLedger();
    });

    // 注入 tab 按鈕
    const tabnav = document.getElementById('tabNav');
    if (tabnav) {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'tab-btn';
      tabBtn.dataset.section = 'ledgerSection';
      tabBtn.textContent = '📒 記帳';
      // 插入在「更多」按鈕前
      const moreBtn = document.getElementById('btnMore');
      tabnav.insertBefore(tabBtn, moreBtn);
      tabBtn.addEventListener('click', () => {
        if (typeof window.activateAdminSection === 'function') window.activateAdminSection('ledgerSection');
        renderLedger();
      });
    }

    // 也加入 more menu
    const moreGrid = document.querySelector('.more-menu-grid');
    if (moreGrid) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'more-menu-btn';
      moreBtn.dataset.section = 'ledgerSection';
      moreBtn.textContent = '📒 記帳';
      moreBtn.addEventListener('click', () => {
        if (typeof window.activateAdminSection === 'function') window.activateAdminSection('ledgerSection');
        renderLedger();
        document.getElementById('moreMenu')?.classList.remove('open');
      });
      moreGrid.appendChild(moreBtn);
    }
  }

  // ── LOAD DATA ──
  async function loadCards() {
    try { const data = await apiGet("getCards", { limit: 100, offset: 0, light: true }); state.cards = normalizeList(data, ["cards", "items"]); renderCards(); }
    catch { state.cards = []; renderCards(); }
  }
  async function loadPayments() {
    try { const data = await apiGet("getPayments", { limit: 100, offset: 0, light: true }); state.payments = normalizeList(data, ["payments", "items"]); }
    catch { state.payments = []; }
  }
  async function loadPaymentList() {
    try { const data = await apiGet("getPayments", { limit: 200, light: true }); state.paymentList = normalizeList(data, ["payments", "rows", "items"]); renderPayments(); }
    catch { state.paymentList = []; renderPayments(); }
  }
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
    } catch (err) {
      state.requests = [];
      renderRequests();
      toast('載入申請單失敗：' + err.message);
    }
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
    } catch (err) {
      toast("派碼失敗：" + err.message);
    } finally {
      setBtnLoading(btn, false);
    }
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

  // ── REFRESH ALL ──
  async function refreshAll() {
    try {
      setLoading(true);
      let boot = null;
      try {
        boot = await apiGet("getAdminBootstrap", {
          requests_limit: 50,
          cards_limit: 100,
          payments_limit: 100,
          ops_limit: 20,
          include_renewals: true,
          include_addons: true,
          include_agents: true,
          include_announcements: true
        });
      } catch (bootErr) {
        console.warn("[refreshAll] bootstrap failed, fallback:", bootErr);
        await Promise.allSettled([loadRequests(), loadCards(), loadPayments(), loadAddons(), loadAgents()]);
        renderRequests(); renderCards(); renderDashboard();
        return;
      }

      if (boot.requests)      state.requests          = normalizeList(boot.requests,       ["requests", "items"]);
      if (boot.cards)         state.cards             = normalizeList(boot.cards,          ["cards", "items"]);
      if (boot.payments)      state.payments          = normalizeList(boot.payments,       ["payments", "items"]);
      if (boot.announcements) state.announcementItems = normalizeList(boot.announcements,  ["announcements", "items"]);
      if (boot.ops_logs)      state.opsLogs           = normalizeList(boot.ops_logs,       ["ops_logs", "items"]);
      if (boot.renewals)      state.renewalItems      = normalizeList(boot.renewals,       ["renewals", "items"]);
      if (boot.addons)        state.addons            = normalizeList(boot.addons,         ["addon_orders", "addons", "items"]);
      if (boot.agents)        state.agents            = normalizeList(boot.agents,         ["agents", "items"]);

      renderRequests();
      renderCards();
      if (state.renewalItems?.length)      renderRenewalList();
      if (state.announcementItems?.length) renderAnnouncements();
      if (state.addons?.length)            renderAddons();
      if (state.agents?.length)            renderAgents();
      renderDashboard();
      renderDashboardOpsLogs();

      const lazyLoads = [];
      if (!state.renewalItems?.length)      lazyLoads.push(loadRenewalList());
      if (!state.announcementItems?.length) lazyLoads.push(loadAnnouncements());
      if (!state.addons?.length)            lazyLoads.push(loadAddons());
      if (!state.agents?.length)            lazyLoads.push(loadAgents());
      if (!state.commissionItems?.length)   lazyLoads.push(loadCommissionList());
      if (lazyLoads.length) {
        await Promise.allSettled(lazyLoads);
        renderDashboard();
      }
    } finally { setLoading(false); }
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

    window.renderCards = renderCards;
    window.renderAddons = renderAddons;
    window.renderAgents = renderAgents;
  }

  function init() {
    injectLedgerSection();
    bindEvents();
    renderKeyStatus();
    if (getAdminKey()) refreshAll();
    else toast("⚠️ 請先設定 Admin Key");
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
          <div class="field" style="margin-top:10px;"><label>service_log_id（選填）</label>
            <input type="text" id="rLogId-${rid}" placeholder="service_log_id"></div>
          <div class="field"><label>備註（選填）</label>
            <input type="text" id="rNote-${rid}" placeholder="備註"></div>
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
      <div class="field">
        <label>目標等級（target_tier）</label>
        <input type="text" id="editTargetTier" placeholder="例如：silver / gold" value="${escapeHtml(String(agent.target_tier || ''))}">
      </div>
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
        ${pRows.length ? pRows.map(r => `<div class="risk-item" style="background:var(--surface2);border-left-color:var(--border);color:var(--ink2);margin-bottom:4px;">
          <span style="color:var(--ink3);font-size:11px;">${escapeHtml(formatValue(fvk(r, ["created_at", "time"])))}</span>
          <span style="margin-left:6px;">${escapeHtml(formatValue(fvk(r, ["type", "action"])))} ${escapeHtml(formatValue(fvk(r, ["before_balance", "before"])))}→${escapeHtml(formatValue(fvk(r, ["after_balance", "after"])))}</span>
        </div>`).join("") : "<div class='empty-state'>沒有點數紀錄</div>"}
        <div style="font-size:12px;font-weight:900;color:var(--ink3);margin:10px 0 6px;">分潤紀錄</div>
        ${cRows.length ? cRows.map(r => `<div class="risk-item" style="background:var(--surface2);border-left-color:var(--border);color:var(--ink2);margin-bottom:4px;">
          <span style="color:var(--ink3);font-size:11px;">${escapeHtml(formatValue(fvk(r, ["created_at", "time"])))}</span>
          <span style="margin-left:6px;">$${escapeHtml(formatValue(fvk(r, ["amount"])))} ${escapeHtml(formatValue(fvk(r, ["note", "memo"])))}</span>
        </div>`).join("") : "<div class='empty-state'>沒有分潤紀錄</div>"}`;
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
