/* ============================================================
   天使幸福智慧名片館 form.js — v4.1 草稿綁邀請碼

   v4.1 改動:草稿 key 綁定邀請碼
   - 每個邀請碼有獨立草稿(互不干擾)
   - 新客戶看到的表單一定是空白的
   - 沒有邀請碼 → 不儲存、不還原(防止污染)
   - 自動清除舊版 legacy 草稿

   v4.0 改動:徹底修復續約模式
   1. ✅ 續約模式正常顯示(mode=renew 可辨識)
   2. ✅ 續約費固定 NT$ 500(不受方案差價影響)
   3. ✅ 加購不重複計費(跑馬燈/照片牆/CTA/金牌終身制)
   4. ✅ 已擁有加購自動隱藏 UI
   5. ✅ restoreDraft 跳過 update/renew 模式
   6. ✅ buildUpdatePayload theme bug 修復(用 card.plan)
   7. ✅ 所有舊版功能保留(建卡、照片、CTA、付款面板)
============================================================ */

(() => {
  "use strict";
// ═══════════════════════════════════════════════════════
  // R0a:新版定價結構(階梯式 + 不限數量)
  // 用於替換寫死的 addon_photo/addon_cta NT$100 單價
  // ═══════════════════════════════════════════════════════
  const PRICING_V2 = {
    addon_photo: {
      tiers: [
        { min: 10, perUnit: 50 },
        { min: 1,  perUnit: 80 }
      ],
      unlimited: 6000
    },
    addon_cta: {
      tiers: [
        { min: 10, perUnit: 50 },
        { min: 1,  perUnit: 80 }
      ],
      unlimited: 8000
    }
  };

  /**
   * 計算照片牆/CTA 加購金額(整單套折)
   * @param {number} qty - 加購數量
   * @param {object} config - PRICING_V2.addon_photo 或 PRICING_V2.addon_cta
   * @returns {object} { amount, perUnit, tier }
   */
   // ═══════════════════════════════════════════════════════
  // R0d 階段 4-B:從 GAS 動態取得 PRICING_V2
  // pricing_db 是唯一真相來源,改 spreadsheet 就改價
  // ═══════════════════════════════════════════════════════
  let PRICING_V2_LOADED = false;
  
  async function loadPricingV2FromGas() {
    try {
      const resp = await fetch(`${CONFIG.GAS_URL}?action=getPricingConfig&tenant=angel`);
      const data = await resp.json();
      
      if (data && data.ok && data.pricing_v2) {
        // 動態覆蓋寫死的 PRICING_V2(保留物件 reference 不變,只更新內容)
        if (data.pricing_v2.addon_photo) {
          PRICING_V2.addon_photo.tiers = data.pricing_v2.addon_photo.tiers || PRICING_V2.addon_photo.tiers;
          PRICING_V2.addon_photo.unlimited = data.pricing_v2.addon_photo.unlimited || PRICING_V2.addon_photo.unlimited;
        }
        if (data.pricing_v2.addon_cta) {
          PRICING_V2.addon_cta.tiers = data.pricing_v2.addon_cta.tiers || PRICING_V2.addon_cta.tiers;
          PRICING_V2.addon_cta.unlimited = data.pricing_v2.addon_cta.unlimited || PRICING_V2.addon_cta.unlimited;
        }
        PRICING_V2_LOADED = true;
        console.log("[R0d] PRICING_V2 已從 GAS 載入:", PRICING_V2);
      } else {
        console.warn("[R0d] getPricingConfig 回傳異常,使用前端預設 PRICING_V2");
      }
    } catch (err) {
      console.warn("[R0d] 取得 PRICING_V2 失敗(使用前端預設):", err.message);
    }
  }
function calcQuantityAddon(qty, config) {
    if (qty <= 0) return { amount: 0, perUnit: 0, tier: null };
    if (qty === "unlimited") return { amount: config.unlimited, perUnit: 0, tier: "unlimited" };
    const tier = config.tiers.find(t => qty >= t.min);
    if (!tier) return { amount: 0, perUnit: 0, tier: null };
    return { amount: qty * tier.perUnit, perUnit: tier.perUnit, tier: tier.min };
  }

  // ═══════════════════════════════════════════════════════
  // R0b:getFormSnapshot — 唯一 DOM 讀法(R3 會把 3 個 mode 統一過來)
  // ═══════════════════════════════════════════════════════
  function getFormSnapshot_R0b() {
    const planEl = document.querySelector('input[name="plan"]:checked');
    const isAddonOn = (code) => {
      const el = document.querySelector(`input[name="addons"][value="${code}"]`);
      return !!(el && el.checked);
    };
    const getQty = (id) => {
      const el = document.getElementById(id);
      const n = Number(el?.value || 0);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    };
    
    return {
      mode: document.body.getAttribute("data-form-mode") || "create",
      plan: planEl?.value || "",
      addons: {
        marquee:        { enabled: isAddonOn("addon_marquee") },
        photo:          { enabled: isAddonOn("addon_photo"), qty: getQty("addon_photo_qty") },
        cta:            { enabled: isAddonOn("addon_cta"),   qty: getQty("addon_cta_qty")   },
        unlimited:      { enabled: isAddonOn("addon_update_unlimited") },
        bundle:         { enabled: isAddonOn("addon_bundle") },
        agentUpgrade:   { enabled: isAddonOn("addon_agent_upgrade") }
      }
    };
  }

  // ═══════════════════════════════════════════════════════
  // R0b:calcQuote — 純函式報價計算(R3 會讓前後端共用同一份)
  // 輸入 snapshot + 設定檔,輸出 { items, planAmount, addonAmount, total }
  // ═══════════════════════════════════════════════════════
  function calcQuote_R0b(snapshot, config) {
    const items = [];
    let planAmount = 0;
    let addonAmount = 0;
    
    // 主費用
    if (snapshot.mode === "create") {
      const planConfig = config.BASE_LIMITS[snapshot.plan];
      if (planConfig) {
        planAmount = planConfig.price;
        items.push({ kind: "plan", code: snapshot.plan, label: planConfig.label, amount: planAmount });
      }
    } else if (snapshot.mode === "renew") {
      planAmount = config.RENEWAL_FEE;
      items.push({ kind: "renewal", code: "renewal", label: "續約費", amount: planAmount });
    }
    // update mode 主費用看資格,這個 R0b 先不處理(維持原邏輯)
    
    // 加購:跑馬燈/組合包(互斥)
    if (snapshot.addons.bundle?.enabled) {
      const a = config.ADDON_PRICES.addon_bundle;
      items.push({ kind: "addon", code: "addon_bundle", label: "跑馬燈+更新組合", amount: a });
      addonAmount += a;
    } else {
      if (snapshot.addons.marquee?.enabled) {
        const a = config.ADDON_PRICES.addon_marquee;
        items.push({ kind: "addon", code: "addon_marquee", label: "跑馬燈功能", amount: a });
        addonAmount += a;
      }
      if (snapshot.addons.unlimited?.enabled) {
        const a = config.ADDON_PRICES.addon_update_unlimited;
        items.push({ kind: "addon", code: "addon_update_unlimited", label: "無限更新", amount: a });
        addonAmount += a;
      }
    }
    
    // 加購:照片牆(階梯)
    if (snapshot.addons.photo?.enabled && snapshot.addons.photo.qty > 0) {
      const qty = snapshot.addons.photo.qty;
      const r = calcQuantityAddon(qty, PRICING_V2.addon_photo);
      items.push({
        kind: "addon",
        code: "addon_photo",
        label: `照片牆加購 × ${qty}`,
        sublabel: `每張 NT$ ${r.perUnit}`,
        qty,
        unit_price: r.perUnit,
        amount: r.amount
      });
      addonAmount += r.amount;
    }
    
    // 加購:CTA(階梯)
    if (snapshot.addons.cta?.enabled && snapshot.addons.cta.qty > 0) {
      const qty = snapshot.addons.cta.qty;
      const r = calcQuantityAddon(qty, PRICING_V2.addon_cta);
      items.push({
        kind: "addon",
        code: "addon_cta",
        label: `CTA 加購 × ${qty}`,
        sublabel: `每個 NT$ ${r.perUnit}`,
        qty,
        unit_price: r.perUnit,
        amount: r.amount
      });
      addonAmount += r.amount;
    }
    
    // 加購:金牌會員
    if (snapshot.addons.agentUpgrade?.enabled) {
      const a = config.ADDON_PRICES.addon_agent_upgrade;
      items.push({ kind: "addon", code: "addon_agent_upgrade", label: "金牌級會員", amount: a });
      addonAmount += a;
    }
    
    return {
      items,
      planAmount,
      addonAmount,
      total: planAmount + addonAmount
    };
  }

 // 🧪 R0a/R0b 暫時暴露給 console 測試
  window.__TEST_PRICING_V2 = PRICING_V2;
  window.__TEST_calcQuantityAddon = calcQuantityAddon;
  window.__TEST_getFormSnapshot = getFormSnapshot_R0b;
  window.__TEST_calcQuote = calcQuote_R0b;
  window.__TEST_CONFIG = null; // 等 CONFIG 定義後填,見下方 R0b-2
  const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    SERVICE_URL: "https://lin.ee/G3VJoRm",
    SHOWCASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    QUOTE_STORAGE_KEY: "HSC_LAST_QUOTE",
    // 🆕 v4.1: 動態草稿 key 前綴(會拼接邀請碼)
    DRAFT_KEY_PREFIX: "hsc_draft_",
    // 🔄 v4.1: 舊版 key,用於自動清除
    LEGACY_DRAFT_KEY: "hsc_form_draft_v834_v151",

    CREATE_ACTION: "createCardWithOfflinePayment",
    DELIVER_ACTION: "markCardDelivered",
    PAYMENT_NOTICE_ACTION: "buildPaymentNoticeText",

    UPDATE_LOAD_ACTION: "getCardForUpdate",
    UPDATE_ELIGIBILITY_ACTION: "getUpdateEligibility",
    UPDATE_SUBMIT_ACTION: "updateCardByToken",
    UPDATE_CREATE_PAYMENT_ACTION: "createUpdateFeePayment",

    RENEW_LOAD_CARD_ACTION: "getCardForRenewal",
    RENEW_PAYMENT_SUMMARY_ACTION: "getRenewalSummary",
    RENEW_ADDON_SUMMARY_ACTION: "getRenewalSummary",
    RENEW_QUOTE_ACTION: "getRenewalSummary",
    RENEW_CREATE_PAYMENT_ACTION: "createRenewalPayment",
    RENEW_MARK_RENEWED_ACTION: "",
    ADMIN_BUILD_BUNDLE_ACTION: "adminBuildBundleText",

    BANK_NAME: "玉山銀行",
    BANK_CODE: "808",
    BANK_ACCOUNT: "0738968051590",
    BANK_HOLDER: "李秀芳",
    PAYMENT_FORM_URL: "payment.html",

    BASE_LIMITS: {
      free:    { wallPhotos: 2, ctas: 1, price: 1500, label: "自由搭配" },
      premium: { wallPhotos: 5, ctas: 3, price: 2000, label: "精品設計" }
    },
    ADDON_PRICES: {
      addon_marquee:          300,
      addon_photo:            100,
      addon_cta:              100,
      addon_update_unlimited: 300,
      addon_bundle:           500,
      addon_agent_upgrade:  10000
    },
    RENEWAL_FEE: 500,
    UNLIMITED_UPDATE_FEE: 300,
    MAX_WALL_PHOTOS: 999,
    MAX_CTAS: 999,
    DEFAULT_PREVIEW_META: {
      layout: "grid",
      aspect_ratio: "1:1",
      fit_mode: "cover"
    },
    FIREBASE_MODULE: "./firebase.js"
  };
 // 🧪 R0b 把 CONFIG 也暴露給 console 測試
  window.__TEST_CONFIG = CONFIG;
  const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };

  const FLOW_STEP_MAP = {
    create:       "3 天內系統自動開通交付卡",
    renew:        "3 天內系統自動延長使用期限",
    update_paid:  "系統確認後自動套用更新"
  };

  function buildFlowStepsHtml(scenario) {
    const step4 = FLOW_STEP_MAP[scenario] || "系統確認後自動開通";
    return `
      <div style="margin-top:14px;padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#fff8ec,#fef3c7);border:1.5px solid rgba(217,119,6,.3);font-size:13px;font-weight:700;color:#78350f;line-height:2;">
        <div style="font-weight:900;font-size:14px;color:#92400e;margin-bottom:10px;">📋 付款流程(4 步驟)</div>
        <div style="margin-bottom:4px;"><span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:6px;">1</span> 點 <strong style="color:#d97706;">「複製付款資訊」</strong>貼到 LINE / 記事本</div>
        <div style="margin-bottom:4px;"><span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:6px;">2</span> 依資訊轉帳(<strong style="color:#d97706;">備註填卡號</strong>)</div>
        <div style="margin-bottom:4px;"><span style="background:#22c55e;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:6px;">3</span> 點 <strong style="color:#16a34a;">「填寫付款確認」</strong>送出末 5 碼</div>
        <div><span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:6px;">4</span> <strong style="color:#2563eb;">${escapeHtml(step4)}</strong></div>
      </div>
      <div style="margin-top:10px;padding:10px 14px;border-radius:12px;background:#f5fbff;border:1px solid rgba(37,99,235,.2);font-size:12px;font-weight:700;color:#1e3a8a;line-height:1.7;text-align:center;">
        🔒 請以本頁官方流程付款,避免被詐騙。
      </div>
    `;
  }

  const state = {
    mode: "create",
    query: {},
    modeContext: { cardId: "", inviteCode: "", updateToken: "", renewToken: "" },
    runtime: {
      createMeta: null,
      updateCard: null, updateEligibilityRaw: null, updateEligibility: null,
      renewCard: null, renewPaymentSummary: null, renewAddonSummary: null, renewQuote: null
    },
    identity: { tenant: "angel", cardId: "", leadId: "", paymentId: "", renewalId: "", addonOrderId: "" },
    quote: { mode: "", planAmount: 0, addonAmount: 0, totalAmount: 0, quoteItems: [] },
    updateFlow: {
      cardExpired: false, freeRemaining: 0, isUnlimited: false,
      requiresPayment: false, canSubmitDirectly: false,
      deductFreeCount: false, updateFeeAmount: 0, expiresAt: "", reasonText: "", updateMode: "quota"
    },
    renewFlow: { targetPlan: "", renewUnlimitedUpdate: false, renewTerm: 1 },
    photoMeta: { avatar: { ...DEFAULT_PHOTO_META }, logo: { ...DEFAULT_PHOTO_META } },
    photoPreviewUrls: {}, photoRealUrls: {}, photoFiles: {}, photoUploadTokens: {}, photoUploadState: {},
    wallPhotoCount: 0, ctaCount: 0, tempCardId: "",
    lastSubmitResult: null, draftValues: {}, urlPhotoLimitOverride: 0
  };

  const els = {};
  let _fb = null;

  document.addEventListener("DOMContentLoaded", init);

  // ── 日期工具 ─────────────────────────────────────────────
  function fallback3Days() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString();
  }

  function parseDateSafe(input) {
    if (!input) return null;
    const d = input instanceof Date ? input : new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDateTime(input) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d.getTime())) throw new Error();
      return d.getFullYear() + "/" +
        String(d.getMonth() + 1).padStart(2, "0") + "/" +
        String(d.getDate()).padStart(2, "0") + " " +
        String(d.getHours()).padStart(2, "0") + ":" +
        String(d.getMinutes()).padStart(2, "0");
    } catch (_) {
      const fb = new Date();
      fb.setDate(fb.getDate() + 3);
      return formatDateYMD(fb);
    }
  }

  function formatDateYMD(input) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d.getTime())) throw new Error();
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    } catch (_) {
      const fb = new Date();
      fb.setDate(fb.getDate() + 3);
      return `${fb.getFullYear()}/${String(fb.getMonth() + 1).padStart(2, "0")}/${String(fb.getDate()).padStart(2, "0")}`;
    }
  }

  // ── 工具函式 ─────────────────────────────────────────────
  function money(v) { return `NT$ ${Number(v || 0).toLocaleString("zh-TW")}`; }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (Number.isFinite(min) && n < min) return min;
    if (Number.isFinite(max) && n > max) return max;
    return n;
  }

  function normalizePhotoMeta(meta) {
    const s = meta && typeof meta === "object" ? meta : {};
    return {
      x:      clampNumber(s.x,      0,    1,   DEFAULT_PHOTO_META.x),
      y:      clampNumber(s.y,      0,    1,   DEFAULT_PHOTO_META.y),
      scale:  clampNumber(s.scale,  0.5,  3,   DEFAULT_PHOTO_META.scale),
      rotate: clampNumber(s.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
    };
  }

  function normalizePhone(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 9 && digits[0] !== "0") return `0${digits}`;
    return digits;
  }

  function valueOf(id) {
    const el = document.getElementById(id) || els[id];
    return (el?.value || "").trim();
  }

  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  }

  async function copyText(str) {
    if (!str) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(str);
        return;
      }
    } catch (_) {}
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function buildPaymentInfoText(result, mode) {
    const cardId = result.cardId || result.card_id || "—";
    const amount = result.totalAmount || result.updateFeeAmount || 0;
    const lines = [];
    if (mode === "create") lines.push(`【天使幸福智慧名片｜建卡付款資訊】`);
    else if (mode === "renew") lines.push(`【天使幸福智慧名片｜續約付款資訊】`);
    else lines.push(`【天使幸福智慧名片｜更新付款資訊】`);
    lines.push(`名片序號:${cardId}`);
    lines.push(`應付金額:${money(amount)}`);
    lines.push(``);
    lines.push(`【匯款資訊】`);
    lines.push(`銀行名稱:${CONFIG.BANK_NAME}(代碼 ${CONFIG.BANK_CODE})`);
    lines.push(`帳號:${CONFIG.BANK_ACCOUNT}`);
    lines.push(`戶名:${CONFIG.BANK_HOLDER}`);
    lines.push(``);
    lines.push(`⚠️ 付款備註請填寫:${cardId}`);
    lines.push(`(未填寫備註將無法自動辨識,請務必填寫)`);
    lines.push(``);
    lines.push(`完成付款後請填寫付款確認表單,系統將於 1~5 分鐘內自動開通。`);
    return lines.join("\n");
  }

  function buildPaymentConfirmUrl(cardId, amount, paymentType, targetId) {
    return `${CONFIG.PAYMENT_FORM_URL}` +
      `?card_id=${encodeURIComponent(cardId || "")}` +
      `&amount=${encodeURIComponent(amount || "")}` +
      `&payment_type=${encodeURIComponent(paymentType || "")}` +
      `&target_id=${encodeURIComponent(targetId || "")}`;
  }

  function openPaymentConfirm(cardId, amount, paymentType, targetId) {
    window.location.href = buildPaymentConfirmUrl(cardId, amount, paymentType, targetId);
  }

  function _buildFullBundleText(result, mode, cardId, amount, paymentType, targetId) {
    const paymentInfo = buildPaymentInfoText(result, mode);
    const confirmUrl = new URL(
      buildPaymentConfirmUrl(cardId, amount, paymentType, targetId),
      window.location.href
    ).href;
    const lines = [paymentInfo, "", "━━━━━━━━━━━━━━━━━━━━━",
      "【付款確認連結】", "完成轉帳後,請點此填寫確認:", confirmUrl,
      "", "【LINE 客服】", CONFIG.SERVICE_URL];
    return lines.join("\n");
  }

  function ensureUpgradeCreateButton(container) {
    if (!container) return null;
    let btn = container.querySelector(".btn-upgrade-create");
    if (btn) return btn;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "line-btn btn-upgrade-create";
    btn.style.cssText = "margin-top:10px;width:100%;";
    btn.textContent = "✨ 建立新名片(升級方案)";
    btn.addEventListener("click", () => {
      window.location.href = "form.html?mode=create";
    });
    container.appendChild(btn);
    return btn;
  }

  // ── DOM 相關 ─────────────────────────────────────────────
  function collectEls() {
    const ids = [
      "smart-card-form", "form-status-strip",
      "btn-open-showcase", "btn-toggle-mode", "btn-save-draft", "btn-clear-draft",
      "btn-contact-service", "btn-submit-form",
      "btn-gold-info", "btn-gold-copy", "btn-gold-contact",
      "progress-contact-service", "btn-copy-primary-notice", "btn-copy-secondary-notice",
      "invite_code", "ref",
      "addon_marquee_enabled", "addon_photo_enabled", "addon_photo_qty",
      "addon_cta_enabled", "addon_cta_qty",
      "addon_update_unlimited_enabled", "addon_bundle_enabled",
      "addon_agent_upgrade_enabled", "addon-photo-tip",
      "free-theme-group", "premium-theme-group",
      "free_color", "free_style", "free_paper", "premium_color",
      "display_name", "unit", "title", "phone", "email", "website",
      "line_url", "line_oa", "wechat_id", "experience", "services",
      "address", "intro",
      "video1", "video2", "video3",
      "social1", "social2", "social3",
      "marquee-section", "marquee_text",
      "photo-slots", "cta-slots",
      "preview-theme-scope",
      "summary-plan-pill", "summary-photo-pill", "summary-cta-pill",
      "summary-plan-name", "summary-photo-count", "summary-cta-count",
      "summary-marquee-status",
      "quote-kicker", "quote-title", "quote-state-text", "quote-plan-amount",
      "quote-addon-amount", "quote-addon-breakdown", "quote-total-amount",
      "submit-progress-overlay", "progress-text", "progress-fill",
      "progress-success-panel",
      "success-primary-id-label", "success-primary-id-value",
      "success-info-rows", "success-due-alert", "success-due-text",
      "success-countdown-box", "success-countdown-value", "success-countdown-note",
      "success-preview-row", "success-preview-label", "progress-preview-link",
      "success-summary-box", "success-summary-content",
      "success-actions", "success-footer-note",
      "success-header-icon", "success-header-title", "success-header-sub",
      "mode-info-card", "mode-info-kicker", "mode-info-title", "mode-info-desc",
      "mode-info-panel", "renew-controls-card", "renew-controls-panel",
      "mode-inline-tip",
      "dev-mode-switcher", "btn-mode-create", "btn-mode-update", "btn-mode-renew",
      "dev-current-mode-pill"
    ];
    ids.forEach(id => { els[id] = document.getElementById(id); });
    els.planRadios      = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.addonCheckboxes = Array.from(document.querySelectorAll('input[name="addons"]'));
    els.planCards       = Array.from(document.querySelectorAll("[data-plan-card]"));
    els.progressSteps   = Array.from(document.querySelectorAll(".progress-step"));
    els.photoTemplate   = document.getElementById("photo-slot-template");
    els.ctaTemplate     = document.getElementById("cta-slot-template");
  }

  function ensureRendererAlias() {
    if (!window.HSCCardRenderer && window.HscCardRenderer) window.HSCCardRenderer = window.HscCardRenderer;
  }

  // ── 初始化 ─────────────────────────────────────────────
  function init() {
    collectEls();
    ensureRendererAlias();
    hydrateQueryParams();
    hydrateModeFromQuery();
    applyModeUi();
    upgradeExperienceToTextarea();
    bindStaticEvents();
    // 🆕 v4.1: 清除舊版 legacy 草稿(避免跨版本污染)
    try { localStorage.removeItem(CONFIG.LEGACY_DRAFT_KEY); } catch(_){}
    restoreDraft();
    ensureDefaultPlan();
    state.tempCardId = "TEMP_" + Date.now();
    loadModeBootstrap();
    refreshAll();
  }

  function upgradeExperienceToTextarea() {
    const old = document.getElementById("experience");
    if (!old || old.tagName === "TEXTAREA") return;
    const existingValue = old.value || "";
    const parent = old.parentNode;
    const ta = document.createElement("textarea");
    ta.id = "experience";
    ta.rows = 4;
    ta.placeholder = "例:前 XX 公司品牌顧問、10 年業界資歷\n可換行填寫多段經歷";
    ta.style.cssText = "resize:vertical;min-height:96px;";
    ta.value = existingValue;
    parent.insertBefore(ta, old);
    parent.removeChild(old);
    els["experience"] = ta;
    ta.addEventListener("input", onLiveChange);
    ta.addEventListener("change", onLiveChange);
  }

  function hydrateQueryParams() {
    let search = "";
    try { search = window.location.search || ""; } catch (_) { return; }
    if (!search) return;
    const params = new URLSearchParams(search);
    state.query = Object.fromEntries(params.entries());

    const inviteCode = params.get("invite_code") || params.get("invite");
    if (inviteCode && els["invite_code"]) els["invite_code"].value = inviteCode.trim();
    const ref = params.get("ref");
    if (ref && els["ref"]) els["ref"].value = ref.trim();
    const planParam = params.get("plan");
    if (planParam === "free" || planParam === "premium") {
      const radio = document.querySelector(`input[name="plan"][value="${planParam}"]`);
      if (radio) radio.checked = true;
    }
    const photoLimitParam = Number(params.get("photo_limit") || 0);
    if (Number.isFinite(photoLimitParam) && photoLimitParam > 0) {
      state.urlPhotoLimitOverride = Math.min(CONFIG.MAX_WALL_PHOTOS, Math.max(0, Math.floor(photoLimitParam)));
    }
  }

  function hydrateModeFromQuery() {
    const mode = String(state.query.mode || "create").trim().toLowerCase();
    if (mode === "update" || mode === "renew") state.mode = mode;
    else state.mode = "create";

    state.modeContext.cardId      = String(state.query.card_id     || "").trim();
    state.modeContext.inviteCode  = String(state.query.invite_code || state.query.invite || "").trim();
    state.modeContext.updateToken = String(state.query.update_token || "").trim();
    state.modeContext.renewToken  = String(state.query.renew_token  || "").trim();

    if (state.mode === "update" && !state.modeContext.updateToken && state.modeContext.cardId)
      state.modeContext.updateToken = state.modeContext.cardId;
    if (state.mode === "renew" && !state.modeContext.renewToken && state.modeContext.cardId)
      state.modeContext.renewToken = state.modeContext.cardId;
  }

  function applyModeUi() {
    const h1 = document.getElementById("page-hero-title") || document.querySelector(".page-hero h1");
    const heroDesc = document.getElementById("hero-desc") || document.querySelector(".hero-desc");
    const submitBtn = els["btn-submit-form"];

    if (state.mode === "update") {
      if (h1) h1.textContent = "智慧名片更新表單";
      if (heroDesc) heroDesc.textContent = "系統會依卡片效期與更新資格,自動判斷可直接更新或需先聯繫客服。";
      if (submitBtn) submitBtn.textContent = "送出更新申請";
    } else if (state.mode === "renew") {
      if (h1) h1.textContent = "智慧名片續約表單";
      if (heroDesc) heroDesc.textContent = "可續約、調整方案與加購內容。";
      if (submitBtn) submitBtn.textContent = "送出續約申請";
    } else {
      if (h1) h1.textContent = "智慧名片申請表";
      if (heroDesc) heroDesc.textContent = "即時預覽｜照片編輯｜完整報價";
      if (submitBtn) submitBtn.textContent = "送出申請";
    }

    const isUpdate = state.mode === "update";
    const isRenew = state.mode === "renew";
    if (els["mode-info-card"]) els["mode-info-card"].classList.toggle("hidden", !(isUpdate || isRenew));
    if (els["renew-controls-card"]) els["renew-controls-card"].classList.toggle("hidden", !isRenew);

    const modePill = els["dev-current-mode-pill"];
    if (modePill) {
      if (state.mode === "update")      modePill.textContent = "目前模式:更新內容";
      else if (state.mode === "renew")  modePill.textContent = "目前模式:續約服務";
      else                              modePill.textContent = "目前模式:申請名片";
      modePill.setAttribute("data-mode", state.mode);
    }

    document.body.setAttribute("data-form-mode", state.mode);
    toggleUpdateAddonUi();
  }

  function toggleUpdateAddonUi() {
    const addonWrap = document.querySelector(".addon-layout");
    if (!addonWrap) return;
    addonWrap.classList.toggle("hidden", state.mode === "update");
  }

  function switchModeByUrl(mode) {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    if (mode === "create") {
      url.searchParams.delete("card_id");
      url.searchParams.delete("update_token");
      url.searchParams.delete("renew_token");
      if (!url.searchParams.get("invite_code")) url.searchParams.set("invite_code", "TEST001");
    }
    if (mode === "update") {
      url.searchParams.set("card_id", url.searchParams.get("card_id") || "TW0001");
      url.searchParams.set("update_token", url.searchParams.get("update_token") || "TEST123");
      url.searchParams.delete("renew_token");
    }
    if (mode === "renew") {
      url.searchParams.set("card_id", url.searchParams.get("card_id") || "TW0001");
      url.searchParams.set("renew_token", url.searchParams.get("renew_token") || "TEST456");
      url.searchParams.delete("update_token");
    }
    window.location.href = url.toString();
  }

  // ── 模式資料載入 ─────────────────────────────────────────
  async function loadModeBootstrap() {
    if (state.mode === "create")      await loadCreateBootstrap();
    else if (state.mode === "update") await loadUpdateBootstrap();
    else if (state.mode === "renew")  await loadRenewBootstrap();
    refreshAll();
  }

  async function loadCreateBootstrap() {
    state.runtime.createMeta = { mode: "create" };
    const params = new URLSearchParams(window.location.search || "");
    const inviteFromUrl = (params.get("invite_code") || params.get("invite") || "").trim();
    if (inviteFromUrl) {
      state.modeContext.inviteCode = inviteFromUrl;
      sessionStorage.setItem("hsc_last_invite_code", inviteFromUrl);
    }
    if (els["invite_code"]) {
      if (inviteFromUrl) {
        els["invite_code"].value = inviteFromUrl;
      } else if (!els["invite_code"].value && state.modeContext.inviteCode) {
        els["invite_code"].value = state.modeContext.inviteCode;
      } else if (!els["invite_code"].value) {
        const cachedInvite = sessionStorage.getItem("hsc_last_invite_code") || "";
        if (cachedInvite) {
          els["invite_code"].value = cachedInvite;
          state.modeContext.inviteCode = cachedInvite;
        }
      }
    }
    if (!getInviteCodeFromPage())
      setStatus("缺少邀請資訊,請重新從邀請連結進入。", "error");
  }

  async function loadUpdateBootstrap() {
    const cardId = state.modeContext.cardId;
    const token  = state.modeContext.updateToken;
    if (!cardId || !token) {
      setStatus("缺少更新所需資料,無法載入表單。", "error");
      return;
    }
    try {
      const [cardRes, eligRes] = await Promise.all([
        postToGas({ action: CONFIG.UPDATE_LOAD_ACTION, card_id: cardId, update_token: token }),
        postToGas({ action: CONFIG.UPDATE_ELIGIBILITY_ACTION, card_id: cardId })
      ]);
      if (!cardRes.ok) throw new Error(cardRes.error || "取得資料失敗");
      state.runtime.updateCard = cardRes.card || cardRes.data || cardRes;
      state.runtime.updateEligibilityRaw = eligRes;
      resolveUpdateEligibilityState(eligRes);
      state.runtime.updateEligibility = { ...state.updateFlow };
      hydrateFormFromCard(state.runtime.updateCard);
      setStatus(`已載入更新資料。${state.updateFlow.reasonText || ""}`, "info");
    } catch (err) {
      console.error(err);
      setStatus(`載入更新資料失敗:${err.message}`, "error");
    }
  }

  async function loadRenewBootstrap() {
    const cardId = state.modeContext.cardId;
    const token  = state.modeContext.renewToken;
    if (!cardId || !token) {
      setStatus("缺少續約所需資料,無法載入表單。", "error");
      return;
    }
    try {
      const [cardRes, paymentRes, addonRes] = await Promise.all([
        postToGas({ action: CONFIG.RENEW_LOAD_CARD_ACTION,      card_id: cardId, renew_token: token }),
        postToGas({ action: CONFIG.RENEW_PAYMENT_SUMMARY_ACTION, card_id: cardId }),
        postToGas({ action: CONFIG.RENEW_ADDON_SUMMARY_ACTION,   card_id: cardId })
      ]);
      if (!cardRes.ok) throw new Error(cardRes.error || "取得資料失敗");
      state.runtime.renewCard = cardRes.card || cardRes.data || cardRes;
      state.runtime.renewPaymentSummary = paymentRes;
      state.runtime.renewAddonSummary = addonRes;

      // === v7.18 偵測舊 pending 並詢問用戶 ===
      const pendingAmount = paymentRes?.pending_renewal_amount 
                         || paymentRes?.pending?.total_amount 
                         || paymentRes?.pending_total_amount
                         || 0;
      const pendingPaymentId = paymentRes?.pending_payment_id 
                            || paymentRes?.pending?.payment_id
                            || "";
      
      if (pendingAmount > 0 && pendingPaymentId) {
        const cardExpiry = state.runtime.renewCard?.expires_at 
                        ? formatDateYMD(state.runtime.renewCard.expires_at) 
                        : "—";
        const msg = `偵測到您已申請續約\n\n` +
                    `卡片到期日:${cardExpiry}\n` +
                    `待付款金額:NT$ ${pendingAmount}\n\n` +
                    `按「確定」→ 取消舊單,重新續約\n` +
                    `按「取消」→ 不重新續約,保留舊單`;
        const confirmed = window.confirm(msg);
        
        if (confirmed) {
          // 用戶選擇重新續約 → 呼叫後端取消舊 pending
          setStatus("取消舊續約單中…", "info");
          const cancelRes = await postToGas({
            action: "cancelPendingRenewal",
            card_id: cardId,
            renew_token: token
          });
          if (!cancelRes.ok) {
            setStatus("取消舊續約失敗:" + (cancelRes.error || "未知錯誤"), "error");
            return;
          }
          // 重新載入 paymentSummary(舊單已取消)
          const newPaymentRes = await postToGas({ 
            action: CONFIG.RENEW_PAYMENT_SUMMARY_ACTION, 
            card_id: cardId 
          });
          state.runtime.renewPaymentSummary = newPaymentRes;
          setStatus("舊續約單已取消,可重新填寫續約資訊。", "success");
        } else {
          // 用戶選擇不重續 → 顯示提示,但仍允許進入(可能只是要看資料)
          setStatus(`您有未完成續約 NT$ ${pendingAmount},送出將更新該筆而非新增。`, "info");
        }
      }
      // === v7.18 結束 ===

      hydrateFormFromCard(state.runtime.renewCard);
      state.renewFlow.targetPlan = state.runtime.renewCard?.plan || getSelectedPlan() || "free";
      const radio = document.querySelector(`input[name="plan"][value="${state.renewFlow.targetPlan}"]`);
      if (radio) radio.checked = true;
      hideOwnedAddons_();
      
      if (!state.runtime.renewPaymentSummary?.pending_renewal_amount) {
        setStatus("已載入續約資料,可加購新功能與延長效期。", "info");
      }
    } catch (err) {
      console.error(err);
      setStatus(`載入續約資料失敗:${err.message}`, "error");
    }
  }
  function hideOwnedAddons_() {
    const card = state.runtime.renewCard || {};
    if (card.marquee_enabled === "true" || card.marquee_enabled === true || card.marquee_enabled === "TRUE") {
      document.getElementById("addon_marquee_enabled")?.closest(".addon-item")?.classList.add("already-owned");
      document.getElementById("addon_bundle_enabled")?.closest(".addon-item")?.classList.add("already-owned");
    }
    const currentPhotoLimit = Number(card.photo_limit || 0);
    if (currentPhotoLimit >= 10) {
      document.getElementById("addon_photo_enabled")?.closest(".addon-item")?.classList.add("already-owned");
    }
    const currentCtaLimit = Number(card.cta_limit || 0);
    if (currentCtaLimit >= 10) {
      document.getElementById("addon_cta_enabled")?.closest(".addon-item")?.classList.add("already-owned");
    }
    const tier = String(card.member_tier || card.agent_type || "").toLowerCase();
    if (tier === "partner") {
      document.getElementById("addon_agent_upgrade_enabled")?.closest(".addon-item")?.classList.add("already-owned");
    }
    const unlimitedItem = document.getElementById("addon_update_unlimited_enabled")?.closest(".addon-item");
    if (unlimitedItem) {
      const small = unlimitedItem.querySelector(".addon-content small");
      if (small) {
        small.innerHTML = "⚠️ 續約必須重新加購,否則享 3 次免費更新";
        small.style.color = "#b45309";
        small.style.fontWeight = "800";
      }
    }
  }

  async function postToGas(payload) {
    const body = new URLSearchParams();
    body.append("payload", JSON.stringify(payload || {}));
    const res = await fetch(CONFIG.GAS_URL, { method: "POST", body });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (err) {
      console.error("[HSC] GAS non-json response:", text);
      throw new Error("系統回傳格式錯誤");
    }
    if (!res.ok || data?.ok === false)
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    return data;
  }

  function extractCardId(data) {
    return data?.card_id || data?.id || data?.card?.id || data?.card?.card_id || data?.data?.card_id || "";
  }

  function extractPaymentId(data) {
    return data?.payment?.payment_id || data?.payment_id || data?.data?.payment_id || "";
  }

  function getInviteCodeFromPage() {
    const params = new URLSearchParams(window.location.search || "");
    return (
      (document.getElementById("invite_code")?.value || "").trim() ||
      (state.modeContext.inviteCode || "").trim() ||
      (params.get("invite_code") || "").trim() ||
      (params.get("invite") || "").trim()
    );
  }

  // 🆕 v4.1: 動態草稿 key — 綁定邀請碼
  function getDraftKey() {
    const invite = getInviteCodeFromPage();
    if (!invite) return null; // 沒邀請碼不儲存
    return CONFIG.DRAFT_KEY_PREFIX + invite;
  }

  function buildSharedCardData() {
    return {
      name:       valueOf("display_name"),
      unit:       valueOf("unit"),
      title:      valueOf("title"),
      slogan:     valueOf("intro"),
      services:   valueOf("services"),
      experience: valueOf("experience"),
      wechat_id:  valueOf("wechat_id"),
      line_url:   valueOf("line_url"),
      line_oa:    valueOf("line_oa"),
      email:      valueOf("email"),
      phone:      normalizePhone(valueOf("phone")),
      address:    valueOf("address"),
      website:    valueOf("website"),
      social1:    valueOf("social1"),
      social2:    valueOf("social2"),
      social3:    valueOf("social3"),
      video1:     valueOf("video1"),
      video2:     valueOf("video2"),
      video3:     valueOf("video3")
    };
  }

  function hydrateFormFromCard(card) {
    if (!card) return;
    const map = {
      display_name: "name", unit: "unit", title: "title", intro: "slogan",
      services: "services", experience: "experience", wechat_id: "wechat_id",
      line_url: "line_url", line_oa: "line_oa", email: "email", phone: "phone",
      address: "address", website: "website", social1: "social1", social2: "social2",
      social3: "social3", video1: "video1", video2: "video2", video3: "video3"
    };
    for (const [field, prop] of Object.entries(map)) {
      if (card[prop] !== undefined) setInputValue(field, card[prop]);
    }
    if (card.plan) {
      const radio = document.querySelector(`input[name="plan"][value="${card.plan}"]`);
      if (radio) radio.checked = true;
    }
    const marqueeOn = String(card.marquee_enabled || "").toLowerCase() === "true";
    if (marqueeOn) {
      if (els["addon_marquee_enabled"]) els["addon_marquee_enabled"].checked = true;
      if (card.marquee_text) setInputValue("marquee_text", card.marquee_text);
    }
    hydrateThemeFromCard(card);
    hydrateMediaFromCard(card);
    hydrateCtasFromCard(card);
  }

  function hydrateThemeFromCard(card) {
    if (card.plan === "free") {
      if (card.color) setInputValue("free_color", card.color);
      if (card.style) setInputValue("free_style", card.style);
      if (card.paper) setInputValue("free_paper", card.paper);
    } else if (card.plan === "premium") {
      if (card.color) setInputValue("premium_color", card.color);
    }
  }

  function hydrateMediaFromCard(card) {
    if (!card) return;
    if (card.avatar_url) {
      state.photoRealUrls.avatar = card.avatar_url;
      state.photoPreviewUrls.avatar = card.avatar_url;
      state.photoUploadState.avatar = "done";
    }
    if (card.logo_url) {
      state.photoRealUrls.logo = card.logo_url;
      state.photoPreviewUrls.logo = card.logo_url;
      state.photoUploadState.logo = "done";
    }
    for (let i = 1; i <= CONFIG.MAX_WALL_PHOTOS; i++) {
      const url = card[`photo${i}_url`];
      if (url) {
        state.photoRealUrls[`photo${i}`] = url;
        state.photoPreviewUrls[`photo${i}`] = url;
        state.photoUploadState[`photo${i}`] = "done";
      }
    }
    const fj = card.features_json || card.features || null;
    if (fj && typeof fj === "object" && fj.photo_meta && typeof fj.photo_meta === "object") {
      Object.keys(fj.photo_meta).forEach(k => {
        state.photoMeta[k] = normalizePhotoMeta(fj.photo_meta[k]);
      });
    }
  }

  function hydrateCtasFromCard(card) {
    if (!card) return;
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const text = card[`cta_text_${i}`];
      const link = card[`cta_link_${i}`];
      if (text !== undefined) state.draftValues[`cta_text_${i}`] = text || "";
      if (link !== undefined) state.draftValues[`cta_link_${i}`] = link || "";
    }
  }

  function ensureDefaultPlan() {
    if (getSelectedPlan()) return;
    const defaultPlan = state.mode === "renew" ? "free" : "premium";
    const r = els.planRadios.find(radio => radio.value === defaultPlan) || els.planRadios[0];
    if (r) r.checked = true;
  }

  function getSelectedPlan() { return els.planRadios.find(r => r.checked)?.value || ""; }
  function isAddonChecked(code) { return !!document.querySelector(`input[name="addons"][value="${code}"]`)?.checked; }
  function getAddonQty(id) {
    const el = els[id];
    if (!el) return 0;
    const n = Number(el.value || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  function isMarqueeEnabled() { return isAddonChecked("addon_marquee") || isAddonChecked("addon_bundle"); }

  function getLimits() {
    if (state.mode === "create") return getLimitsCreate();
    if (state.mode === "update") return getLimitsUpdate();
    if (state.mode === "renew")  return getLimitsRenew();
    return getLimitsCreate();
  }

  function getLimitsCreate() {
    const plan = getSelectedPlan() || "premium";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;
    const urlOverride = Number(state.urlPhotoLimitOverride || 0);
    const effectiveBaseWallPhotos = urlOverride > 0 ? Math.min(urlOverride, CONFIG.MAX_WALL_PHOTOS) : base.wallPhotos;
    let ewp = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let ect = isAddonChecked("addon_cta")   ? getAddonQty("addon_cta_qty")   : 0;
    ewp = Math.min(ewp, CONFIG.MAX_WALL_PHOTOS - effectiveBaseWallPhotos);
    ect = Math.min(ect, CONFIG.MAX_CTAS - base.ctas);
    return {
      plan, planLabel: base.label, planPrice: base.price,
      baseWallPhotos: effectiveBaseWallPhotos,
      wallPhotos: effectiveBaseWallPhotos + ewp,
      ctas: base.ctas + ect,
      extraWallPhotos: ewp, extraCtas: ect
    };
  }

  function getLimitsUpdate() {
    const card = state.runtime.updateCard;
    const plan = card?.plan || getSelectedPlan() || "premium";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.premium;
    return {
      plan, planLabel: base.label, planPrice: base.price,
      baseWallPhotos: Number(card?.photo_limit ?? base.wallPhotos),
      wallPhotos:     Number(card?.photo_limit ?? base.wallPhotos),
      ctas:           Number(card?.cta_limit   ?? base.ctas),
      extraWallPhotos: 0, extraCtas: 0
    };
  }

function getLimitsRenew() {
    const plan = state.renewFlow.targetPlan || getSelectedPlan() || "free";
    const base = CONFIG.BASE_LIMITS[plan] || CONFIG.BASE_LIMITS.free;
    const card = state.runtime.renewCard || {};
    const currentWallPhotos = Math.max(base.wallPhotos, Number(card.photo_limit || 0));
    const currentCtas = Math.max(base.ctas, Number(card.cta_limit || 0));
    let ewp = isAddonChecked("addon_photo") ? getAddonQty("addon_photo_qty") : 0;
    let ect = isAddonChecked("addon_cta")   ? getAddonQty("addon_cta_qty")   : 0;
    
    // === DEBUG v7.20 ===
    window.__DEBUG_renewLimits = {
      plan: plan,
      base_ctas: base.ctas,
      card_cta_limit_raw: card.cta_limit,
      card_cta_limit_num: Number(card.cta_limit || 0),
      currentCtas: currentCtas,
      addon_cta_checked: isAddonChecked("addon_cta"),
      addon_cta_qty_raw: getAddonQty("addon_cta_qty"),
      ect_before_min: ect,
      MAX_CTAS: CONFIG.MAX_CTAS
    };
    // === DEBUG END ===
    
    ewp = Math.min(ewp, CONFIG.MAX_WALL_PHOTOS - currentWallPhotos);
    ect = Math.min(ect, CONFIG.MAX_CTAS - currentCtas);
    
    window.__DEBUG_renewLimits.ect_after_min = ect;
    
    return {
      plan, planLabel: base.label, planPrice: base.price,
      baseWallPhotos: currentWallPhotos,
      wallPhotos: currentWallPhotos + ewp,
      ctas: currentCtas + ect,
      extraWallPhotos: ewp, extraCtas: ect
    };
  }

  // ★ 核心:續約模式加購不重複計費
  function getAddonItemsForQuote(limits) {
    const items = [];
    const bundleChecked = isAddonChecked("addon_bundle");
    const photoChecked  = isAddonChecked("addon_photo");
    const ctaChecked    = isAddonChecked("addon_cta");
    const photoQty = photoChecked ? getAddonQty("addon_photo_qty") : 0;
    const ctaQty   = ctaChecked   ? getAddonQty("addon_cta_qty")   : 0;

    // 續約模式:已擁有的加購項目不重複計費(終身制)
    const isRenewMode = state.mode === "renew";
    const renewCard = state.runtime.renewCard || {};
    const ownedMarquee = isRenewMode && (
      renewCard.marquee_enabled === "true" ||
      renewCard.marquee_enabled === true ||
      renewCard.marquee_enabled === "TRUE"
    );
    const ownedPhotoMax = isRenewMode && Number(renewCard.photo_limit || 0) >= 10;
    const ownedCtaMax   = isRenewMode && Number(renewCard.cta_limit   || 0) >= 10;
    const ownedUpgrade  = isRenewMode && String(renewCard.member_tier || renewCard.agent_type || "").toLowerCase() === "partner";

    if (bundleChecked && !ownedMarquee) {
      items.push({ code: "addon_bundle", name: "跑馬燈＋更新組合", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_bundle, amount: CONFIG.ADDON_PRICES.addon_bundle });
    } else {
      if (isAddonChecked("addon_marquee") && !ownedMarquee)
        items.push({ code: "addon_marquee", name: "跑馬燈功能", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_marquee, amount: CONFIG.ADDON_PRICES.addon_marquee });
      if (isAddonChecked("addon_update_unlimited"))
        items.push({ code: "addon_update_unlimited", name: "無限更新", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_update_unlimited, amount: CONFIG.ADDON_PRICES.addon_update_unlimited });
    }
    if (photoChecked && photoQty > 0 && !ownedPhotoMax)
      items.push({ code: "addon_photo", name: "照片牆加購", qty: photoQty, unit_price: CONFIG.ADDON_PRICES.addon_photo, amount: photoQty * CONFIG.ADDON_PRICES.addon_photo });
    if (ctaChecked && ctaQty > 0 && !ownedCtaMax)
      items.push({ code: "addon_cta", name: "CTA 加購", qty: ctaQty, unit_price: CONFIG.ADDON_PRICES.addon_cta, amount: ctaQty * CONFIG.ADDON_PRICES.addon_cta });
    if (isAddonChecked("addon_agent_upgrade") && !ownedUpgrade)
      items.push({ code: "addon_agent_upgrade", name: "金牌級會員", qty: 1, unit_price: CONFIG.ADDON_PRICES.addon_agent_upgrade, amount: CONFIG.ADDON_PRICES.addon_agent_upgrade });

    return items;
  }

  // ── 刷新 UI ─────────────────────────────────────────────
  function refreshAll() {
    const limits = getLimits();
    syncPlanCards();
    syncThemeGroups(limits.plan);
    syncAddonInputs(limits);
    syncMarqueeSection();
    renderPhotoSections(limits.wallPhotos);
    renderCtas(limits.ctas);
    syncSummary(limits);
    syncQuoteByMode();
    syncModePanels();
    updatePreview();
    saveDraftSilently();
  }

  function syncPlanCards() {
    const plan = getSelectedPlan();
    els.planCards.forEach(c => c.classList.toggle("is-selected", c.getAttribute("data-plan-card") === plan));
  }

  function syncThemeGroups(plan) {
    els["free-theme-group"]?.classList.toggle("hidden", plan !== "free");
    els["premium-theme-group"]?.classList.toggle("hidden", plan !== "premium");
  }

  function syncAddonInputs(limits) {
    const bundleChecked = isAddonChecked("addon_bundle");
    const createOnly = state.mode === "create" || state.mode === "renew";
    if (els["addon_photo_qty"]) {
      const enabled = isAddonChecked("addon_photo");
      const maxExtra = Math.max(0, CONFIG.MAX_WALL_PHOTOS - limits.baseWallPhotos);
      els["addon_photo_qty"].disabled = !enabled || !createOnly;
      els["addon_photo_qty"].max = String(maxExtra);
      if (!enabled) els["addon_photo_qty"].value = "0";
    }
    if (els["addon_cta_qty"]) {
      const enabled = isAddonChecked("addon_cta");
      const maxExtra = Math.max(0, CONFIG.MAX_CTAS - (CONFIG.BASE_LIMITS[limits.plan]?.ctas || 3));
      els["addon_cta_qty"].disabled = !enabled || !createOnly;
      els["addon_cta_qty"].max = String(maxExtra);
      if (!enabled) els["addon_cta_qty"].value = "0";
    }
    if (els["addon_marquee_enabled"]) {
      els["addon_marquee_enabled"].disabled = bundleChecked || !createOnly;
      if (bundleChecked) els["addon_marquee_enabled"].checked = false;
    }
    if (els["addon_update_unlimited_enabled"]) {
      els["addon_update_unlimited_enabled"].disabled = bundleChecked || !createOnly;
      if (bundleChecked) els["addon_update_unlimited_enabled"].checked = false;
    }
    if (state.mode === "update") {
      ["addon_photo_enabled","addon_cta_enabled","addon_marquee_enabled",
       "addon_update_unlimited_enabled","addon_bundle_enabled","addon_agent_upgrade_enabled"]
        .forEach(id => { if (els[id]) els[id].disabled = true; });
    }
  }

  function syncMarqueeSection() {
    els["marquee-section"]?.classList.toggle("hidden", !isMarqueeEnabled());
  }

  function syncSummary(limits) {
    const set = (id, v) => { if (els[id]) els[id].textContent = v; };
    set("summary-plan-pill", limits.planLabel);
    set("summary-photo-pill", `照片牆:${limits.wallPhotos}`);
    set("summary-cta-pill", `CTA:${limits.ctas}`);
    set("summary-plan-name", limits.planLabel);
    set("summary-photo-count", String(limits.wallPhotos));
    set("summary-cta-count", String(limits.ctas));
    set("summary-marquee-status", isMarqueeEnabled() ? "已開啟" : "未開啟");
  }

  function syncQuoteByMode() {
    if (state.mode === "create")      syncCreateQuote();
    else if (state.mode === "update") syncUpdateQuote();
    else if (state.mode === "renew")  syncRenewQuote();
  }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // R0c 備份:舊版 syncCreateQuote(2026-04-30 改造前)
  // 如需 rollback:把下面新版 syncCreateQuote 整段刪掉,
  // 把這個 _OLD_R0c 改回原名 syncCreateQuote 即可
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function syncCreateQuote_OLD_R0c() {
    const limits = getLimitsCreate();
    const items = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const total = limits.planPrice + addonAmount;
    if (els["quote-kicker"]) els["quote-kicker"].textContent = "即時報價";
    if (els["quote-title"]) els["quote-title"].textContent = "目前費用";
    if (els["quote-state-text"]) els["quote-state-text"].textContent = `${limits.planLabel}｜${money(total)}`;
    if (els["quote-plan-amount"]) els["quote-plan-amount"].textContent = money(limits.planPrice);
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = money(addonAmount);
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = money(total);
    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!items.length) {
        const span = document.createElement("span");
        span.textContent = "尚未選擇加購";
        els["quote-addon-breakdown"].appendChild(span);
      } else {
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          row.innerHTML = `<span>${escapeHtml(item.name)}${item.qty > 1 ? ` × ${item.qty}` : ""}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
    state.quote = { mode: "create", planAmount: limits.planPrice, addonAmount, totalAmount: total, quoteItems: items };
  }

 
function syncCreateQuote() {
    // R0c:改用 calcQuote_R0b 計算,但保留舊的 limits 用於 UI 標籤
    const limits = getLimitsCreate();
    const snapshot = getFormSnapshot_R0b();
    const quote = calcQuote_R0b(snapshot, CONFIG);
    
    // 把 R0b 的 items 轉成舊格式給 UI 用(舊 UI 期望 item.name)
    const items = quote.items
      .filter(i => i.kind === "addon")
      .map(i => ({
        code: i.code,
        name: i.label.replace(/ × \d+$/, ""), // 去掉 "× N" 後綴,讓 UI 自己加
        qty: i.qty || 1,
        unit_price: i.unit_price || i.amount,
        amount: i.amount
      }));
    
    if (els["quote-kicker"]) els["quote-kicker"].textContent = "即時報價";
    if (els["quote-title"]) els["quote-title"].textContent = "目前費用";
    if (els["quote-state-text"]) els["quote-state-text"].textContent = `${limits.planLabel}｜${money(quote.total)}`;
    if (els["quote-plan-amount"]) els["quote-plan-amount"].textContent = money(quote.planAmount);
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = money(quote.addonAmount);
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = money(quote.total);
    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      if (!items.length) {
        const span = document.createElement("span");
        span.textContent = "尚未選擇加購";
        els["quote-addon-breakdown"].appendChild(span);
      } else {
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "quote-breakdown-row";
          row.innerHTML = `<span>${escapeHtml(item.name)}${item.qty > 1 ? ` × ${item.qty}` : ""}</span><strong>${money(item.amount)}</strong>`;
          els["quote-addon-breakdown"].appendChild(row);
        });
      }
    }
    state.quote = { mode: "create", planAmount: quote.planAmount, addonAmount: quote.addonAmount, totalAmount: quote.total, quoteItems: items };
  }

  function syncUpdateQuote() {
    const elig = state.updateFlow;
    if (els["quote-kicker"]) els["quote-kicker"].textContent = "更新資格";
    if (els["quote-title"]) els["quote-title"].textContent = elig.requiresPayment ? "本次更新費用" : "本次更新方式";
    if (els["quote-state-text"]) els["quote-state-text"].textContent = elig.reasonText || (elig.canSubmitDirectly ? "可直接更新" : "需付款後更新");
    if (els["quote-plan-amount"]) els["quote-plan-amount"].textContent = elig.requiresPayment ? money(elig.updateFeeAmount) : "NT$ 0";
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = "—";
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = elig.requiresPayment ? money(elig.updateFeeAmount) : "免費";
    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      const row = document.createElement("div");
      row.className = "quote-breakdown-row";
      row.innerHTML = `<span>${escapeHtml(elig.reasonText || "請確認更新方式")}</span><strong>${elig.requiresPayment ? money(elig.updateFeeAmount) : "免費"}</strong>`;
      els["quote-addon-breakdown"].appendChild(row);
    }
  }

  // ★ 核心:續約費固定 NT$ 500
  function syncRenewQuote() {
    const basePrice = CONFIG.RENEWAL_FEE; // 固定 500
    const addonItems = getAddonItemsForQuote(getLimitsRenew());
    const addonAmount = addonItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const unlimitedFee = state.renewFlow.renewUnlimitedUpdate ? CONFIG.UNLIMITED_UPDATE_FEE : 0;
    const total = basePrice + addonAmount + unlimitedFee;
    const targetPlan = state.renewFlow.targetPlan || state.runtime.renewCard?.plan || "free";

    if (els["quote-kicker"]) els["quote-kicker"].textContent = "續約報價";
    if (els["quote-title"]) els["quote-title"].textContent = "續約費用";
    if (els["quote-state-text"]) els["quote-state-text"].textContent = `${CONFIG.BASE_LIMITS[targetPlan]?.label || targetPlan} 續約`;
    if (els["quote-plan-amount"]) els["quote-plan-amount"].textContent = money(basePrice);
    if (els["quote-addon-amount"]) els["quote-addon-amount"].textContent = money(addonAmount + unlimitedFee);
    if (els["quote-total-amount"]) els["quote-total-amount"].textContent = money(total);

    if (els["quote-addon-breakdown"]) {
      els["quote-addon-breakdown"].innerHTML = "";
      addonItems.forEach(item => {
        const row = document.createElement("div");
        row.className = "quote-breakdown-row";
        row.innerHTML = `<span>${escapeHtml(item.name)}${item.qty > 1 ? ` × ${item.qty}` : ""}</span><strong>${money(item.amount)}</strong>`;
        els["quote-addon-breakdown"].appendChild(row);
      });
      if (unlimitedFee > 0) {
        const row = document.createElement("div");
        row.className = "quote-breakdown-row";
        row.innerHTML = `<span>續用無限更新</span><strong>${money(unlimitedFee)}</strong>`;
        els["quote-addon-breakdown"].appendChild(row);
      }
      if (!addonItems.length && !unlimitedFee) {
        const row = document.createElement("div");
        row.className = "quote-breakdown-row";
        row.innerHTML = `<span>續約主方案</span><strong>${money(basePrice)}</strong>`;
        els["quote-addon-breakdown"].appendChild(row);
      }
    }
    state.quote = { mode: "renew", planAmount: basePrice, addonAmount, totalAmount: total, quoteItems: addonItems };
  }

  function buildCreateQuoteSummary() {
    const limits = getLimitsCreate();
    const items = getAddonItemsForQuote(limits);
    const addonAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    return {
      plan: limits.plan,
      plan_label: limits.planLabel,
      plan_amount: limits.planPrice,
      addon_amount: addonAmount,
      total_amount: limits.planPrice + addonAmount,
      addon_items: items
    };
  }

  // ── Firebase 上傳 ─────────────────────────────────────────
  async function getFirebase() {
    if (_fb) return _fb;
    try {
      _fb = await import(CONFIG.FIREBASE_MODULE);
      return _fb;
    } catch (err) {
      console.error("[HSC] firebase.js import failed:", err);
      throw new Error("圖片上傳模組載入失敗");
    }
  }

  async function uploadPhotoToFirebase(key, file) {
    const token = Date.now() + "_" + Math.random().toString(36).slice(2);
    state.photoUploadTokens[key] = token;
    state.photoUploadState[key] = "uploading";
    updateUploadBadge(key, "uploading", "上傳中…");
    try {
      const fb = await getFirebase();
      await fb.ensureAuth();
      const fileName = `${key}.jpg`;
      const cardId = state.tempCardId;
      const url = await fb.uploadImage(cardId, file, fileName);
      if (state.photoUploadTokens[key] !== token) return;
      state.photoRealUrls[key] = url;
      state.photoUploadState[key] = "done";
      updateUploadBadge(key, "done", "已上傳 ✓");
      return url;
    } catch (err) {
      if (state.photoUploadTokens[key] !== token) return;
      state.photoUploadState[key] = "error";
      updateUploadBadge(key, "error", "上傳失敗");
      throw err;
    }
  }

  function updateUploadBadge(key, uploadState, text) {
    document.querySelectorAll("[data-photo-key]").forEach(card => {
      if (card.dataset.photoKey !== key) return;
      const badge = card.querySelector(".badge");
      if (!badge) return;
      badge.textContent = text;
      badge.dataset.uploadState = uploadState;
    });
  }

  async function waitAllUploads() {
    const keys = Object.keys(state.photoUploadState);
    for (const key of keys) {
      const s = state.photoUploadState[key];
      const hasFile = !!state.photoFiles[key];
      if (!hasFile) continue;
      if (s === "pending" || s === "uploading") {
        await new Promise((resolve, reject) => {
          const start = Date.now();
          const check = setInterval(() => {
            const cur = state.photoUploadState[key];
            if (cur === "done")  { clearInterval(check); resolve(); return; }
            if (cur === "error") { clearInterval(check); reject(new Error(`圖片上傳失敗:${key}`)); return; }
            if (Date.now() - start > 30000) { clearInterval(check); reject(new Error(`圖片上傳逾時:${key}`)); }
          }, 300);
        });
      }
      if (state.photoUploadState[key] === "error")
        throw new Error(`圖片 ${key} 上傳失敗,請重新選取後再送出。`);
    }
  }

  function ensurePhotoMetaKey(key) {
    if (!state.photoMeta[key]) state.photoMeta[key] = { ...DEFAULT_PHOTO_META };
    else state.photoMeta[key] = normalizePhotoMeta(state.photoMeta[key]);
  }

  // ── 照片渲染 ─────────────────────────────────────────────
  function renderPhotoSections(wallLimit) {
    if (!els["photo-slots"] || !els.photoTemplate) return;
    state.wallPhotoCount = wallLimit;
    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
    for (let i = 1; i <= wallLimit; i++) ensurePhotoMetaKey(`photo${i}`);
    els["photo-slots"].innerHTML = "";
    const sections = [
      { title: "個人照", desc: "固定 1 張,套用到成品卡頭像。", keys: ["avatar"] },
      { title: "Logo",   desc: "固定 1 張,套用到成品卡 logo。", keys: ["logo"] },
      { title: "照片牆", desc: `本次可上傳 ${wallLimit} 張(不含個人照與 Logo)`, keys: Array.from({ length: wallLimit }, (_, i) => `photo${i + 1}`) }
    ];
    sections.forEach(sec => {
      const wrapper = document.createElement("section");
      wrapper.className = "photo-section";
      const head = document.createElement("div");
      head.className = "photo-section-head";
      head.innerHTML = `<div><h3>${escapeHtml(sec.title)}</h3><p>${escapeHtml(sec.desc)}</p></div>`;
      const grid = document.createElement("div");
      grid.className = "photo-grid photo-grid-form";
      sec.keys.forEach((key, idx) => grid.appendChild(buildPhotoCard(key, sec.title, idx + 1)));
      wrapper.appendChild(head);
      wrapper.appendChild(grid);
      els["photo-slots"].appendChild(wrapper);
    });
  }

  function buildPhotoCard(key, sectionTitle, index) {
    void sectionTitle;
    const frag = els.photoTemplate.content.cloneNode(true);
    const card = frag.querySelector(".photo-card");
    const title = frag.querySelector(".photo-title");
    const badge = frag.querySelector(".badge");
    const fileInput = frag.querySelector(".photo-file-input");
    const previewImage = frag.querySelector(".preview-image");
    const previewEmpty = frag.querySelector(".preview-empty");
    const tools = frag.querySelector(".photo-tools");
    const zoomRange = frag.querySelector(".zoom-range");
    const rotateLeft = frag.querySelector(".rotate-left");
    const rotateRight = frag.querySelector(".rotate-right");
    const moveLeft = frag.querySelector(".move-left");
    const moveRight = frag.querySelector(".move-right");
    const moveUp = frag.querySelector(".move-up");
    const moveDown = frag.querySelector(".move-down");
    const resetBtn = frag.querySelector(".reset-photo");

    card.dataset.photoKey = key;
    title.textContent = ({ avatar: "個人照", logo: "Logo" })[key] || `照片牆 ${index}`;
    fileInput.dataset.photoKey = key;
    zoomRange.dataset.photoKey = key;
    zoomRange.value = String(state.photoMeta[key]?.scale || 1);

    fileInput.addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      state.photoFiles[key] = file;
      delete state.photoRealUrls[key];
      state.photoUploadState[key] = "pending";
      const b64 = await fileToDataURL(file);
      state.photoPreviewUrls[key] = b64;
      previewImage.src = b64;
      previewImage.classList.remove("hidden");
      previewEmpty.classList.add("hidden");
      tools.classList.remove("hidden");
      badge.textContent = "準備上傳…";
      badge.dataset.uploadState = "pending";
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
      uploadPhotoToFirebase(key, file).catch(err => { setStatus(`圖片上傳失敗(${key}):${err.message}`, "error"); });
    });

    zoomRange.addEventListener("input", () => {
      state.photoMeta[key].scale = clampNumber(zoomRange.value, 0.5, 3, 1);
      applyPhotoTransform(previewImage, state.photoMeta[key]);
      updatePreview();
      saveDraftSilently();
    });

    rotateLeft.addEventListener("click",  () => { state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate - 90, -180, 180, 0); applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); });
    rotateRight.addEventListener("click", () => { state.photoMeta[key].rotate = clampNumber(state.photoMeta[key].rotate + 90, -180, 180, 0); applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); });
    moveLeft.addEventListener("click",    () => { state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x - 0.05).toFixed(2), 0, 1, 0.5); applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); });
    moveRight.addEventListener("click",   () => { state.photoMeta[key].x = clampNumber(+(state.photoMeta[key].x + 0.05).toFixed(2), 0, 1, 0.5); applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); });
    moveUp.addEventListener("click",      () => { state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y - 0.05).toFixed(2), 0, 1, 0.5); applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); });
    moveDown.addEventListener("click",    () => { state.photoMeta[key].y = clampNumber(+(state.photoMeta[key].y + 0.05).toFixed(2), 0, 1, 0.5); applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); });
    resetBtn.addEventListener("click",    () => { state.photoMeta[key] = { ...DEFAULT_PHOTO_META }; zoomRange.value = "1"; applyPhotoTransform(previewImage, state.photoMeta[key]); updatePreview(); saveDraftSilently(); });

    // 移除按鈕
    let removeBtn = frag.querySelector(".remove-photo");
    if (!removeBtn && tools) {
      removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "ghost-btn mini remove-photo";
      removeBtn.textContent = "🗑️ 移除此照片";
      removeBtn.style.cssText = "margin-top:8px;width:100%;color:#dc2626;border-color:rgba(220,38,38,.35);background:#fef2f2;font-weight:700;";
      tools.appendChild(removeBtn);
    }
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        if (!window.confirm("確定要移除這張照片嗎?\n送出更新後,卡片上的這張照片會被清除。")) return;
        state.photoRealUrls[key] = "";
        state.photoPreviewUrls[key] = "";
        delete state.photoFiles[key];
        state.photoUploadState[key] = "removed";
        state.photoMeta[key] = { ...DEFAULT_PHOTO_META };
        if (fileInput) { try { fileInput.value = ""; } catch (_) {} }
        previewImage.removeAttribute("src");
        previewImage.classList.add("hidden");
        previewEmpty.classList.remove("hidden");
        tools.classList.add("hidden");
        if (zoomRange) zoomRange.value = "1";
        badge.textContent = "已移除";
        badge.dataset.uploadState = "removed";
        updatePreview();
        saveDraftSilently();
      });
    }

    hydratePhotoCardUi(key, { badge, previewImage, previewEmpty, tools, zoomRange });
    return card;
  }

  function hydratePhotoCardUi(key, { badge, previewImage, previewEmpty, tools, zoomRange }) {
    ensurePhotoMetaKey(key);
    const src = state.photoPreviewUrls[key];
    if (zoomRange) zoomRange.value = String(state.photoMeta[key].scale || 1);
    if (src) {
      previewImage.src = src;
      previewImage.classList.remove("hidden");
      previewEmpty.classList.add("hidden");
      tools.classList.remove("hidden");
      const us = state.photoUploadState[key];
      if      (us === "done")      { badge.textContent = "已上傳 ✓"; badge.dataset.uploadState = "done"; }
      else if (us === "uploading") { badge.textContent = "上傳中…";  badge.dataset.uploadState = "uploading"; }
      else if (us === "error")     { badge.textContent = "上傳失敗"; badge.dataset.uploadState = "error"; }
      else                         { badge.textContent = "已選擇";   badge.dataset.uploadState = "pending"; }
      applyPhotoTransform(previewImage, state.photoMeta[key]);
    } else {
      previewImage.removeAttribute("src");
      previewImage.classList.add("hidden");
      previewEmpty.classList.remove("hidden");
      tools.classList.add("hidden");
      if (state.photoUploadState[key] === "removed") {
        badge.textContent = "已移除";
        badge.dataset.uploadState = "removed";
      } else {
        badge.textContent = "尚未上傳";
        badge.dataset.uploadState = "idle";
      }
    }
  }

  function applyPhotoTransform(img, meta) {
    if (!img || !meta) return;
    const scale = clampNumber(meta.scale, 0.5, 3, 1);
    const rotate = clampNumber(meta.rotate, -180, 180, 0);
    const x = ((meta.x ?? 0.5) - 0.5) * 40;
    const y = ((meta.y ?? 0.5) - 0.5) * 40;
    img.style.transform = `translate(${x}px,${y}px) scale(${scale}) rotate(${rotate}deg)`;
  }

  // ── CTA 渲染 ─────────────────────────────────────────────
  function renderCtas(limit) {
    if (!els["cta-slots"] || !els.ctaTemplate) return;
    const currentDomValues = collectCurrentCtaValues();
    els["cta-slots"].innerHTML = "";
    state.ctaCount = limit;
    for (let i = 1; i <= limit; i++) {
      const frag = els.ctaTemplate.content.cloneNode(true);
      const label = frag.querySelector(".cta-title-label");
      const textInput = frag.querySelector(".cta-label-input");
      const urlInput = frag.querySelector(".cta-url-input");
      label.textContent = `CTA 按鈕 ${i}`;
      textInput.id = `cta_text_${i}`;
      urlInput.id = `cta_link_${i}`;
      textInput.value = currentDomValues[`cta_text_${i}`] || state.draftValues[`cta_text_${i}`] || "";
      urlInput.value = currentDomValues[`cta_link_${i}`] || state.draftValues[`cta_link_${i}`] || "";
      textInput.addEventListener("input", onLiveChange);
      textInput.addEventListener("change", onLiveChange);
      urlInput.addEventListener("input", onLiveChange);
      urlInput.addEventListener("change", onLiveChange);
      els["cta-slots"].appendChild(frag);
    }
  }

  function collectCurrentCtaValues() {
    const out = {};
    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const t = document.getElementById(`cta_text_${i}`);
      const u = document.getElementById(`cta_link_${i}`);
      if (t) out[`cta_text_${i}`] = t.value || "";
      if (u) out[`cta_link_${i}`] = u.value || "";
    }
    return out;
  }

  // ── 預覽 ─────────────────────────────────────────────
  function updatePreview() {
    const scope = els["preview-theme-scope"];
    if (!scope) return;
    ensureRendererAlias();
    const renderer = window.HSCCardRenderer || window.HscCardRenderer;
    if (!renderer || typeof renderer.renderCard !== "function") {
      scope.innerHTML = `<div class="renderer-error">預覽元件尚未載入完成,請重新整理頁面。</div>`;
      return;
    }
    try {
      renderer.renderCard(buildPreviewData(), {
        mode: "form",
        root: scope,
        useExistingDom: false,
        qrMode: "preview",
        allowActions: false,
        previewUrl: CONFIG.SHOWCASE_URL,
        shareUrl: CONFIG.SHOWCASE_URL,
        cardUrl: CONFIG.SHOWCASE_URL
      });
    } catch (err) {
      console.error("updatePreview error:", err);
      scope.innerHTML = `<div class="renderer-error">預覽顯示失敗:${escapeHtml(err.message || "請稍後再試")}</div>`;
    }
  }

  function buildPreviewData() {
    const limits = getLimits();
    const theme = getThemeSelection();
    const data = {
      name: valueOf("display_name"), unit: valueOf("unit"), title: valueOf("title"),
      slogan: valueOf("intro"), services: valueOf("services"), experience: valueOf("experience"),
      phone: normalizePhone(valueOf("phone")), email: valueOf("email"),
      address: valueOf("address"), website: valueOf("website"),
      line_url: valueOf("line_url"), line_oa: valueOf("line_oa"), wechat_id: valueOf("wechat_id"),
      video1: valueOf("video1"), video2: valueOf("video2"), video3: valueOf("video3"),
      social1: valueOf("social1"), social2: valueOf("social2"), social3: valueOf("social3"),
      plan: theme.plan, color: theme.color, style: theme.style, paper: theme.paper,
      marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",
      photo_limit: limits.wallPhotos, cta_limit: limits.ctas,
      preview_url: CONFIG.SHOWCASE_URL, share_url: CONFIG.SHOWCASE_URL, card_url: CONFIG.SHOWCASE_URL,
      features: {
        photo_meta: buildPhotoMetaMap(),
        preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        photo_preview_urls: { ...state.photoPreviewUrls }
      }
    };
    const avatarUrl = state.photoRealUrls.avatar || state.photoPreviewUrls.avatar || "";
    if (avatarUrl) { data.avatar_url = avatarUrl; data["u-img"] = avatarUrl; }
    const logoUrl = state.photoRealUrls.logo || state.photoPreviewUrls.logo || "";
    if (logoUrl) data.logo_url = logoUrl;
    for (let i = 1; i <= limits.wallPhotos; i++) {
      const url = state.photoRealUrls[`photo${i}`] || state.photoPreviewUrls[`photo${i}`] || "";
      if (url) data[`photo${i}_url`] = url;
    }
    for (let i = 1; i <= limits.ctas; i++) {
      data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      data[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return data;
  }

  function buildPhotoMetaMap() {
  const out = { 
    avatar: normalizePhotoMeta(state.photoMeta.avatar), 
    logo: normalizePhotoMeta(state.photoMeta.logo) 
  };
  // 🔧 R0c-fix:只輸出當前實際照片牆張數的 meta(不要全部 999 張)
  // 避免 features_json 超過 Google Sheets 50000 字元上限
  const currentLimit = state.wallPhotoCount || 0;
  for (let i = 1; i <= currentLimit; i++) {
    out[`photo${i}`] = normalizePhotoMeta(state.photoMeta[`photo${i}`]);
  }
  return out;
}

  // ── 驗證與 Payload ─────────────────────────────────────────
  function validateCreateBeforeSubmit() {
    if (!getInviteCodeFromPage()) { setStatus("缺少邀請資訊,請確認是從正確的邀請連結進入。", "error"); return false; }
    if (!valueOf("display_name")) { setStatus("請填寫姓名/品牌名稱。", "error"); return false; }
    if (!valueOf("phone")) { setStatus("請填寫電話。", "error"); return false; }
    const limits = getLimitsCreate();
    for (let i = 1; i <= limits.ctas; i++) {
      const textVal = valueOf(`cta_text_${i}`);
      const linkVal = valueOf(`cta_link_${i}`);
      if (textVal && !linkVal) { setStatus(`CTA 按鈕第 ${i} 組:請補上按鈕連結。`, "error"); return false; }
      if (!textVal && linkVal) { setStatus(`CTA 按鈕第 ${i} 組:請補上按鈕文字。`, "error"); return false; }
    }
    if (isMarqueeEnabled() && !valueOf("marquee_text")) { setStatus("已開啟跑馬燈功能,請填入跑馬燈內容。", "error"); return false; }
    if (isAddonChecked("addon_photo") && getAddonQty("addon_photo_qty") <= 0) { setStatus("已勾選照片牆加購,請輸入加購張數。", "error"); return false; }
    if (isAddonChecked("addon_cta") && getAddonQty("addon_cta_qty") <= 0) { setStatus("已勾選 CTA 按鈕加購,請輸入加購數量。", "error"); return false; }
    return true;
  }

  function validateUpdateBeforeSubmit() {
    if (state.updateFlow.cardExpired) { setStatus("卡片已到期,請先續約。", "error"); return false; }
    if (!state.updateFlow.canSubmitDirectly && !state.updateFlow.requiresPayment) {
      setStatus("目前無法判斷更新資格,請重新整理後再試。", "error");
      return false;
    }
    return true;
  }

  function validateRenewBeforeSubmit() {
    if (!state.renewFlow.targetPlan) { setStatus("請選擇續約方案。", "error"); return false; }
    return true;
  }

  function buildCreatePayload() {
    const limits = getLimitsCreate();
    const theme = getThemeSelection();
    
    // R0c-2:改用 calcQuote_R0b 確保 payload 跟即時報價框一致
    const snapshot = getFormSnapshot_R0b();
    const quote = calcQuote_R0b(snapshot, CONFIG);
    
    // 把 R0b 的 items 轉成舊格式給 GAS 端的 calcCreateCardAmount_ 使用
    // (GAS 期望 addon_items 每筆有 code/name/qty/unit_price/amount)
    const addonItems = quote.items
      .filter(i => i.kind === "addon")
      .map(i => ({
        code: i.code,
        name: i.label.replace(/ × \d+$/, ""),
        qty: i.qty || 1,
        unit_price: i.unit_price || i.amount,
        amount: i.amount
      }));
    const addonAmount = quote.addonAmount;
    const totalAmount = quote.total;
    
    const shared = buildSharedCardData();
    const refValue = valueOf("ref");
    const inviteCode = getInviteCodeFromPage();
    const payload = {
      action: CONFIG.CREATE_ACTION,
      tenant: "angel",
      invite_code: inviteCode,
      line_user_id: (document.getElementById("line_user_id")?.value || window.HSC_LINE_UID || "").trim(),
      line_display_name: (document.getElementById("line_display_name")?.value || window.HSC_LINE_NAME || "").trim(),
      referrer: refValue || "",
      service_agent: refValue || "SELF",
      agent_type: refValue ? "service" : "self",
      source: refValue ? "agent_form" : "form",
      share_source: refValue ? "agent_form" : "form",
      share_channel: "direct",
      ...shared,
      plan: theme.plan, color: theme.color, style: theme.style, paper: theme.paper,
      marquee_text: isMarqueeEnabled() ? valueOf("marquee_text") : "",
      marquee_enabled: isMarqueeEnabled() ? "true" : "",
      photo_limit: limits.wallPhotos,
      cta_limit: limits.ctas,
      amount: totalAmount,
      plan_amount: limits.planPrice,
      addon_amount: addonAmount,
      total_amount: totalAmount,
      addon_items: addonItems,
      features_json: {
        photo_meta: buildPhotoMetaMap(),
        preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: theme.plan },
        addon_items: addonItems,
        order_summary: buildCreateQuoteSummary()
      }
    };
    if (state.photoRealUrls.avatar) payload.avatar_url = state.photoRealUrls.avatar;
    if (state.photoRealUrls.logo) payload.logo_url = state.photoRealUrls.logo;
    for (let i = 1; i <= limits.wallPhotos; i++) {
      if (state.photoRealUrls[`photo${i}`]) payload[`photo${i}_url`] = state.photoRealUrls[`photo${i}`];
    }
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    return payload;
  }

  function buildUpdatePayload() {
    const shared = buildSharedCardData();
    const card = state.runtime.updateCard || {};
    const limits = getLimitsUpdate();
    const payload = {
      ...shared,
      plan: card.plan || "", color: card.color || "", style: card.style || "", paper: card.paper || "",
      marquee_text: card.marquee_enabled ? valueOf("marquee_text") : (card.marquee_text || ""),
      marquee_enabled: card.marquee_enabled || "",
      photo_limit: limits.wallPhotos,
      cta_limit: limits.ctas
    };
    for (let i = 1; i <= limits.ctas; i++) {
      payload[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      payload[`cta_link_${i}`] = valueOf(`cta_link_${i}`);
    }
    payload.avatar_url = state.photoRealUrls.avatar || "";
    payload.logo_url = state.photoRealUrls.logo || "";
    for (let i = 1; i <= limits.wallPhotos; i++) {
      payload[`photo${i}_url`] = state.photoRealUrls[`photo${i}`] || "";
    }
    payload.features_json = {
      photo_meta: buildPhotoMetaMap(),
      preview_meta: { ...CONFIG.DEFAULT_PREVIEW_META, theme: card.plan || "premium" }
    };
    return payload;
  }

  function collectRenewSelectedAddons() {
    const items = getAddonItemsForQuote(getLimitsRenew());
    return items.map(i => ({ addon_code: i.code, quantity: i.qty, price: i.unit_price }));
  }

async function requestRenewQuote() {
    const cardId = state.modeContext.cardId;
    const token = state.modeContext.renewToken;
    const originalPlan = state.runtime.renewCard?.plan || state.renewFlow.targetPlan;
    const renewLimits = getLimitsRenew();
    const keepMarquee = !!(state.runtime.renewCard?.marquee_enabled);
    const keepPhotoExtraQty = renewLimits.extraWallPhotos || 0;
    const keepCtaExtraQty = renewLimits.extraCtas || 0;
    const payload = {
      action: CONFIG.RENEW_QUOTE_ACTION,
      card_id: cardId,
      renew_token: token,
      target_plan: originalPlan,
      selected_addons: collectRenewSelectedAddons(),
     renew_unlimited_update: !!document.getElementById("addon_update_unlimited_enabled")?.checked,
     update_unlimited_renew: !!document.getElementById("addon_update_unlimited_enabled")?.checked,
      keep_photo_extra_qty: keepPhotoExtraQty,
      keep_cta_extra_qty: keepCtaExtraQty,
      renew_term: state.renewFlow.renewTerm
    };
    const res = await postToGas(payload);
    if (!res.ok) throw new Error(res.error || "取得續約報價失敗");
    state.runtime.renewQuote = res;
    return res;
  }
  // ── Submit ─────────────────────────────────────────────
  async function submit(e) {
    e.preventDefault();
    if      (state.mode === "create") await submitCreate();
    else if (state.mode === "update") await submitUpdate();
    else if (state.mode === "renew")  await submitRenew();
    else setStatus("目前模式不支援送出。", "error");
  }

  async function submitCreate() {
    if (!validateCreateBeforeSubmit()) return;
    const payload = buildCreatePayload();
    state.lastSubmitResult = null;
    showProgress(true);
    hideSuccessPanel();
    setProgressStep(1, "正在等待圖片上傳完成…");
    try {
      await waitAllUploads();
      setProgressStep(2, "正在送出申請資料…");
      const createRes = await postToGas(payload);
      if (!createRes.ok) throw new Error(createRes.error || "建立名片失敗");
      const cardId = extractCardId(createRes);
      const paymentId = extractPaymentId(createRes);
      if (!cardId) throw new Error("系統沒有回傳名片序號");
      setProgressStep(3, "正在建立付款期限…");
      try { await postToGas({ action: CONFIG.DELIVER_ACTION, card_id: cardId }); } catch (e) { console.warn(e); }
      setProgressStep(4, "正在整理付款通知…");
      const previewUrl = createRes?.card?.url || `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(cardId)}&view=1`;
      const dueAtRaw = createRes?.payment?.due_at || createRes?.card?.payment_due_at || fallback3Days();
      const dueAtObj = parseDateSafe(dueAtRaw) || parseDateSafe(fallback3Days());
      const result = {
        cardId, card_id: cardId, paymentId, previewUrl, url: previewUrl,
        paymentDueAt: dueAtObj.toISOString(), payment_due_at: dueAtObj.toISOString(),
        dueDateStr: formatDateTime(dueAtObj),
        totalAmount: payload.total_amount, price: payload.total_amount,
        plan: payload.plan, planLabel: CONFIG.BASE_LIMITS[payload.plan]?.label || payload.plan,
        customerName: payload.name, name: payload.name,
        addonAmount: payload.addon_amount
      };
      state.lastSubmitResult = result;
      setProgressStep(5, "✅ 申請完成");
      showCreateSuccessPanel(result);
      setStatus("名片已成功建立,請依下方步驟完成付款。", "success");
      // 🆕 v4.1: 提交成功後清除當前邀請碼的草稿
      const draftKey = getDraftKey();
      if (draftKey) { try { localStorage.removeItem(draftKey); } catch(_){} }
    } catch (err) {
      console.error(err);
      setStatus("送出失敗:" + err.message, "error");
    } finally {
      if (state.lastSubmitResult) {
        els.progressSteps?.forEach(s => s.classList.remove("is-active"));
        if (els["progress-fill"]) els["progress-fill"].style.width = "100%";
        if (els["progress-text"]) els["progress-text"].textContent = "✅ 申請完成。";
        if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
      } else {
        showProgress(false);
      }
    }
  }

  async function submitUpdate() {
    if (!validateUpdateBeforeSubmit()) return;

    // ═══════════════════════════════════════════════════════
    // 🆕 需付款的更新流程(流程 B:先填內容 → 再付費 → 自動套用)
    // ═══════════════════════════════════════════════════════
    if (state.updateFlow.requiresPayment) {
      state.lastSubmitResult = null;
      showProgress(true);
      hideSuccessPanel();
      setProgressStep(1, "等待圖片上傳完成…");

      try {
        const cardId = state.modeContext.cardId;
        const token = state.modeContext.updateToken;

        // Step 1:等圖片上傳完
        await waitAllUploads();

        // Step 2:產生 update_fee 付款單
        setProgressStep(2, "建立更新付款單…");
        const createPaymentRes = await postToGas({
          action: CONFIG.UPDATE_CREATE_PAYMENT_ACTION,
          card_id: cardId,
          update_token: token
        });
        if (!createPaymentRes.ok) throw new Error(createPaymentRes.error || "建立付款單失敗");

        const paymentObj = createPaymentRes.payment || {};
        const paymentId = paymentObj.payment_id || "";
        const feeAmount = Number(paymentObj.amount) || state.updateFlow.updateFeeAmount || 300;
        const dueAtRaw = paymentObj.due_at || fallback3Days();
        const dueAtObj = parseDateSafe(dueAtRaw) || parseDateSafe(fallback3Days());

        if (!paymentId) throw new Error("系統沒有回傳付款單號");

        // Step 3:把客戶填的新內容存到 update_pending_db
        setProgressStep(3, "暫存您的更新內容…");
        const updatePayload = buildUpdatePayload();
        const saveRes = await postToGas({
          action: "savePendingUpdate",
          card_id: cardId,
          payment_id: paymentId,
          ...updatePayload
        });
        if (!saveRes.ok) throw new Error(saveRes.error || "暫存更新內容失敗");

        // Step 4:顯示付款資訊
        setProgressStep(4, "產生付款資訊…");
        const result = {
          cardId,
          paymentId,
          updateFeeAmount: feeAmount,
          totalAmount: feeAmount,
          paymentDueAt: dueAtObj.toISOString(),
          dueDateStr: formatDateTime(dueAtObj),
          customerName: valueOf("display_name") || "您"
        };
        state.lastSubmitResult = result;

        setProgressStep(5, "✅ 已建立付款單");
        showUpdatePaymentRequiredPanel({
          cardId,
          updateFeeAmount: feeAmount,
          paymentId
        });
        setStatus("更新付款單已建立,完成付款後系統會自動套用新內容。", "success");

      } catch (err) {
        console.error(err);
        setStatus("建立付款單失敗:" + err.message, "error");
      } finally {
        if (state.lastSubmitResult) {
          els.progressSteps?.forEach(s => s.classList.remove("is-active"));
          if (els["progress-fill"]) els["progress-fill"].style.width = "100%";
          if (els["progress-text"]) els["progress-text"].textContent = "✅ 完成";
          if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
        } else {
          showProgress(false);
        }
      }
      return;
    }
    // ═══════════════════════════════════════════════════════
    // 免費更新流程(未變)
    // ═══════════════════════════════════════════════════════
    state.lastSubmitResult = null;
    showProgress(true);
    hideSuccessPanel();
    setProgressStep(1, "檢查更新資格…");
    try {
      const cardId = state.modeContext.cardId;
      const token = state.modeContext.updateToken;
      if (state.updateFlow.cardExpired) throw new Error("卡片已到期,無法更新。");
      setProgressStep(2, "等待圖片上傳完成…");
      await waitAllUploads();
      setProgressStep(3, "送出更新資料…");
      const updatePayload = buildUpdatePayload();
      const updateRes = await postToGas({ action: CONFIG.UPDATE_SUBMIT_ACTION, card_id: cardId, update_token: token, ...updatePayload });
      if (!updateRes.ok) throw new Error(updateRes.error || "更新失敗");
      const result = {
        cardId, updatedCard: updateRes.card || updateRes,
        deductFreeCount: state.updateFlow.deductFreeCount,
        isUnlimited: state.updateFlow.isUnlimited,
        customerName: valueOf("display_name") || "您"
      };
      state.lastSubmitResult = result;
      setProgressStep(5, "更新完成");
      showUpdateSuccessPanel(result);
      setStatus("名片已成功更新!", "success");
    } catch (err) {
      console.error(err);
      setStatus("更新失敗:" + err.message, "error");
    } finally {
      if (state.lastSubmitResult) {
        els.progressSteps?.forEach(s => s.classList.remove("is-active"));
        if (els["progress-fill"]) els["progress-fill"].style.width = "100%";
        if (els["progress-text"]) els["progress-text"].textContent = "✅ 完成";
        if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
      } else {
        showProgress(false);
      }
    }
  }
  async function submitRenew() {
    if (!validateRenewBeforeSubmit()) return;
    state.lastSubmitResult = null;
    showProgress(true);
    hideSuccessPanel();
    setProgressStep(1, "計算續約報價…");
    try {
      const quote = await requestRenewQuote();
      setProgressStep(2, "建立續約付款資訊…");
      const originalPlan = state.runtime.renewCard?.plan || state.renewFlow.targetPlan;
       const renewLimits = getLimitsRenew();
      const keepMarquee = !!(state.runtime.renewCard?.marquee_enabled);
      const keepPhotoExtraQty = renewLimits.extraWallPhotos || 0;
      const keepCtaExtraQty = renewLimits.extraCtas || 0;
      const paymentPayload = {
        action: CONFIG.RENEW_CREATE_PAYMENT_ACTION,
        card_id: state.modeContext.cardId,
        renew_token: state.modeContext.renewToken,
        target_plan: originalPlan,
        selected_addons: collectRenewSelectedAddons(),
      renew_unlimited_update: !!document.getElementById("addon_update_unlimited_enabled")?.checked,
      update_unlimited_renew: !!document.getElementById("addon_update_unlimited_enabled")?.checked,
        keep_photo_extra_qty: keepPhotoExtraQty,
        keep_cta_extra_qty: keepCtaExtraQty,
        quote_items: quote.quote_items || []
       
      };
      const paymentRes = await postToGas(paymentPayload);
      if (!paymentRes.ok) throw new Error(paymentRes.error || "建立續約付款資訊失敗");
      const renewalId = paymentRes.renewal_id || paymentRes.id;
      const paymentId = paymentRes.payment_id || "";
      const dueAt = paymentRes.due_at || fallback3Days();
      const dueAtObj = parseDateSafe(dueAt) || parseDateSafe(fallback3Days());
      const result = {
        cardId: state.modeContext.cardId,
        renewalId, paymentId,
        paymentDueAt: dueAtObj.toISOString(),
        dueDateStr: formatDateTime(dueAtObj),
     totalAmount: paymentRes.summary?.total_amount || paymentRes.payment?.total_amount || state.quote.totalAmount || 0,
        targetPlan: state.renewFlow.targetPlan,
        customerName: valueOf("display_name") || "您",
        quoteItems: quote.quote_items || []
      };
      state.lastSubmitResult = result;
      setProgressStep(5, "續約付款資訊已建立");
      showRenewSuccessPanel(result);
      setStatus("續約付款資訊已建立,請依下方步驟完成付款。", "success");
    } catch (err) {
      console.error(err);
      setStatus("續約失敗:" + err.message, "error");
    } finally {
      if (state.lastSubmitResult) {
        els.progressSteps?.forEach(s => s.classList.remove("is-active"));
        if (els["progress-fill"]) els["progress-fill"].style.width = "100%";
        if (els["progress-text"]) els["progress-text"].textContent = "✅ 完成";
        if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
      } else {
        showProgress(false);
      }
    }
  }

  // ── Success Panels (精簡) ─────────────────────────────────
  function resetSuccessPanel() {
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 編號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = "—";
    if (els["success-info-rows"]) els["success-info-rows"].innerHTML = "";
    if (els["success-due-alert"]) els["success-due-alert"].classList.add("hidden");
    if (els["success-countdown-box"]) els["success-countdown-box"].classList.add("hidden");
    if (els["success-preview-row"]) els["success-preview-row"].classList.add("hidden");
    if (els["success-summary-box"]) els["success-summary-box"].classList.add("hidden");
    if (els["success-footer-note"]) els["success-footer-note"].innerHTML = "";
    if (els["btn-copy-secondary-notice"]) els["btn-copy-secondary-notice"].classList.add("hidden");
    if (els["progress-contact-service"]) els["progress-contact-service"].textContent = "💬 LINE 客服";
    if (els["btn-copy-primary-notice"]) {
      els["btn-copy-primary-notice"].textContent = "📋 複製付款資訊(含確認連結)";
      els["btn-copy-primary-notice"].classList.remove("hidden");
    }
    const previewBtn = document.getElementById("btn-open-preview");
    if (previewBtn) previewBtn.classList.add("hidden");
    if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
  }

  function freshBtn(id) {
    const old = els[id];
    if (!old) return null;
    const clone = old.cloneNode(true);
    old.parentNode?.replaceChild(clone, old);
    els[id] = clone;
    return clone;
  }

  function ensurePreviewActionButton() {
    const wrap = els["success-actions"];
    if (!wrap) return;
    let btn = document.getElementById("btn-open-preview");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "btn-open-preview";
      btn.className = "ghost-btn mini hidden";
      btn.textContent = "🔗 查看成品";
      wrap.insertBefore(btn, wrap.firstChild);
    }
  }

  function renderPaymentInfoBlock(cardId, amount) {
    return `
      <div class="payment-bank-block" style="margin-top:16px;padding:16px;border-radius:14px;background:#fff8ec;border:1.5px solid rgba(240,160,75,.4);">
        <div style="font-size:13px;font-weight:900;margin-bottom:10px;color:#8b5b16;">💳 付款資訊</div>
        <div class="success-info-row"><span class="label">銀行</span><span class="value">${escapeHtml(CONFIG.BANK_NAME)}(${escapeHtml(CONFIG.BANK_CODE)})</span></div>
        <div class="success-info-row"><span class="label">帳號</span><span class="value" style="font-family:monospace;letter-spacing:1px;">${escapeHtml(CONFIG.BANK_ACCOUNT)}</span></div>
        <div class="success-info-row"><span class="label">戶名</span><span class="value">${escapeHtml(CONFIG.BANK_HOLDER)}</span></div>
        <div class="success-info-row"><span class="label">金額</span><span class="value" style="font-weight:900;color:#d97706;">${money(amount)}</span></div>
        <div style="margin-top:12px;padding:10px;background:#fef3c7;border-radius:10px;font-size:12px;font-weight:700;color:#92400e;line-height:1.7;">
          ⚠️ 付款備註請填寫:<strong style="font-size:14px;">${escapeHtml(cardId)}</strong><br>
          未填寫備註將無法自動辨識,請務必填寫!
        </div>
      </div>
    `;
  }

  function showCreateSuccessPanel(result) {
    resetSuccessPanel();
    ensurePreviewActionButton();
    if (els["success-header-icon"]) els["success-header-icon"].textContent = "🎉";
    if (els["success-header-title"]) els["success-header-title"].textContent = "名片申請成功!";
    if (els["success-header-sub"]) els["success-header-sub"].textContent = "請依下方資訊完成付款,系統將自動開通名片。";
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 名片序號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = result.cardId || "—";
    if (els["success-info-rows"]) {
      els["success-info-rows"].innerHTML = 
         `<div class="success-info-row" style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
      <span class="label" style="color:#991b1b;font-weight:900;">⚠️ 轉帳備註必填</span>
      <span class="value" style="color:#dc2626;font-weight:900;font-size:16px;letter-spacing:0.05em;">${escapeHtml(result.cardId || "—")}</span>
    </div>
        <div class="success-info-row"><span class="label">申請人</span><span class="value">${escapeHtml(result.customerName)}</span></div>
        <div class="success-info-row"><span class="label">方案</span><span class="value">${escapeHtml(result.planLabel)}</span></div>
        <div class="success-info-row"><span class="label">應付總額</span><span class="value" style="font-weight:900;color:#d97706;">${money(result.totalAmount)}</span></div>
        ${result.paymentId ? `<div class="success-info-row"><span class="label">付款單號</span><span class="value">${escapeHtml(result.paymentId)}</span></div>` : ""}
      `;
    }
    if (els["success-due-alert"]) {
      els["success-due-alert"].classList.remove("hidden");
      if (els["success-due-text"]) els["success-due-text"].textContent = `付款期限:${result.dueDateStr || "—"}`;
    }
    if (els["success-countdown-box"]) els["success-countdown-box"].classList.remove("hidden");
    if (els["success-preview-row"]) {
      els["success-preview-row"].classList.remove("hidden");
      if (els["progress-preview-link"]) {
        els["progress-preview-link"].href = result.previewUrl || "#";
        els["progress-preview-link"].textContent = result.previewUrl || "(建立後顯示)";
      }
    }
    if (els["success-summary-box"]) {
      els["success-summary-box"].classList.remove("hidden");
      if (els["success-summary-content"]) {
        els["success-summary-content"].innerHTML = `
          <div class="quote-breakdown-row"><span>主方案</span><strong>${money(result.totalAmount - (result.addonAmount || 0))}</strong></div>
          <div class="quote-breakdown-row"><span>加購小計</span><strong>${money(result.addonAmount || 0)}</strong></div>
          <div class="quote-breakdown-row"><span>應付總額</span><strong>${money(result.totalAmount)}</strong></div>
          ${renderPaymentInfoBlock(result.cardId, result.totalAmount)}
        `;
      }
    }
    if (els["success-footer-note"]) els["success-footer-note"].innerHTML = buildFlowStepsHtml("create");
    setSuccessActionLabels("create", result);
  }

  function showUpdateSuccessPanel(result) {
    resetSuccessPanel();
    if (els["success-header-icon"]) els["success-header-icon"].textContent = "🛠️";
    if (els["success-header-title"]) els["success-header-title"].textContent = "已送出更新資料";
    if (els["success-header-sub"]) els["success-header-sub"].textContent = "系統將自動整理並套用更新內容。";
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 名片序號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = result.cardId || "—";
    if (els["success-info-rows"]) {
      els["success-info-rows"].innerHTML = `
        <div class="success-info-row"><span class="label">更新方式</span><span class="value">${result.isUnlimited ? "不限次數更新" : "免費次數更新"}</span></div>
        <div class="success-info-row"><span class="label">需人工付款</span><span class="value">否</span></div>
      `;
    }
    if (els["success-preview-row"]) {
      els["success-preview-row"].classList.remove("hidden");
      const previewUrl = `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(result.cardId)}&view=1`;
      if (els["progress-preview-link"]) {
        els["progress-preview-link"].href = previewUrl;
        els["progress-preview-link"].textContent = previewUrl;
      }
    }
    setSuccessActionLabels("update_done", result);
  }

  function showUpdatePaymentRequiredPanel(params) {
    const cardId = params.cardId || state.modeContext.cardId || "—";
    const feeAmount = params.updateFeeAmount || state.updateFlow.updateFeeAmount || 300;
    resetSuccessPanel();
    if (els["progress-success-panel"]) els["progress-success-panel"].classList.remove("hidden");
    if (els["success-header-icon"]) els["success-header-icon"].textContent = "💳";
    if (els["success-header-title"]) els["success-header-title"].textContent = "本次更新需付款";
    if (els["success-header-sub"]) els["success-header-sub"].textContent = "完成付款後系統將套用更新內容。";
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 名片序號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = cardId;
    if (els["success-info-rows"]) {
      els["success-info-rows"].innerHTML = `
        <div class="success-info-row"><span class="label">更新費用</span><span class="value" style="font-weight:900;color:#d97706;">${money(feeAmount)}</span></div>
        <div class="success-info-row"><span class="label">付款後</span><span class="value">系統自動套用更新內容</span></div>
      `;
    }
    if (els["success-summary-box"]) {
      els["success-summary-box"].classList.remove("hidden");
      if (els["success-summary-content"]) els["success-summary-content"].innerHTML = renderPaymentInfoBlock(cardId, feeAmount);
    }
    if (els["success-footer-note"]) els["success-footer-note"].innerHTML = buildFlowStepsHtml("update_paid");
    setSuccessActionLabels("update_paid", { cardId, totalAmount: feeAmount });
  }

  function showRenewSuccessPanel(result) {
    resetSuccessPanel();
    if (els["success-header-icon"]) els["success-header-icon"].textContent = "🔄";
    if (els["success-header-title"]) els["success-header-title"].textContent = "續約付款資訊已建立";
    if (els["success-header-sub"]) els["success-header-sub"].textContent = "請依下方資訊完成付款,系統將自動開通續約。";
    if (els["success-primary-id-label"]) els["success-primary-id-label"].textContent = "📋 續約單號";
    if (els["success-primary-id-value"]) els["success-primary-id-value"].textContent = result.renewalId || "—";
    if (els["success-info-rows"]) {
      els["success-info-rows"].innerHTML = `
       <div class="success-info-row" style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
      <span class="label" style="color:#991b1b;font-weight:900;">⚠️ 轉帳備註必填</span>
      <span class="value" style="color:#dc2626;font-weight:900;font-size:16px;letter-spacing:0.05em;">${escapeHtml(result.cardId)}</span>
    </div>
        <div class="success-info-row"><span class="label">名片序號</span><span class="value">${escapeHtml(result.cardId)}</span></div>
        <div class="success-info-row"><span class="label">付款單號</span><span class="value">${escapeHtml(result.paymentId)}</span></div>
        <div class="success-info-row"><span class="label">應付金額</span><span class="value" style="font-weight:900;color:#d97706;">${money(result.totalAmount)}</span></div>
      `;
    }
    if (els["success-due-alert"]) {
      els["success-due-alert"].classList.remove("hidden");
      if (els["success-due-text"]) els["success-due-text"].textContent = `付款期限:${result.dueDateStr || "—"}`;
    }
    if (els["success-countdown-box"]) els["success-countdown-box"].classList.remove("hidden");
    if (els["success-summary-box"]) {
      els["success-summary-box"].classList.remove("hidden");
      if (els["success-summary-content"]) {
        let summaryHtml = "";
        if (result.quoteItems && result.quoteItems.length)
          summaryHtml = result.quoteItems.map(i => `<div class="quote-breakdown-row"><span>${escapeHtml(i.name)}</span><strong>${money(i.amount)}</strong></div>`).join("");
        summaryHtml += `<div class="quote-breakdown-row"><span>總計</span><strong>${money(result.totalAmount)}</strong></div>`;
        summaryHtml += renderPaymentInfoBlock(result.cardId, result.totalAmount);
        els["success-summary-content"].innerHTML = summaryHtml;
      }
    }
    if (els["success-footer-note"]) els["success-footer-note"].innerHTML = buildFlowStepsHtml("renew");
    setSuccessActionLabels("renew", result);
  }
  
// ═══════════════════════════════════════════════════════
  // L2 強制順序付款引導 v1.3 (移除填確認單按鈕,避免誤會)
  // - 複製按鈕(主)
  // - 完成付款流程清單(說明 4 步驟)
  // - 客戶從 LINE 訊息點連結進確認單
  // ═══════════════════════════════════════════════════════
  function setSuccessActionLabels(mode, result) {
    const wrap = els["success-actions"];
    if (!wrap) return;
    
    wrap.innerHTML = "";
    
    if (mode === "update_done") {
      renderUpdateDoneActions(wrap, result);
      return;
    }
    
    renderForcedSequenceActions(wrap, mode, result);
  }
  
  function renderUpdateDoneActions(wrap, result) {
    const previewUrl = result?.cardId 
      ? `${CONFIG.SHOWCASE_URL}index.html?id=${encodeURIComponent(result.cardId)}&view=1`
      : "#";
    
    wrap.innerHTML = `
      <button type="button" class="ghost-btn" id="btn-go-preview" style="margin-right:8px;">🔗 查看成品</button>
      <button type="button" class="line-btn" id="btn-go-service">💬 LINE 客服</button>
    `;
    
    document.getElementById("btn-go-preview")?.addEventListener("click", () => {
      window.open(previewUrl, "_blank", "noopener");
    });
    document.getElementById("btn-go-service")?.addEventListener("click", () => {
      window.open(CONFIG.SERVICE_URL, "_blank", "noopener");
    });
  }
  
  function renderForcedSequenceActions(wrap, mode, result) {
    const cardId = result.cardId || result.card_id || "—";
    const amount = result.totalAmount || result.updateFeeAmount || 0;
    let paymentType = "first_payment";
    let targetId = cardId;
    if (mode === "update_paid") { paymentType = "update_fee"; targetId = result.paymentId || ""; }
    if (mode === "renew") { paymentType = "renewal"; targetId = result.paymentId || result.renewalId || ""; }
    
    wrap.innerHTML = `
      <!-- Step 1:複製按鈕(大橘色脈動) -->
      <button type="button" class="primary-btn" id="hsc-btn-step1-copy" style="width:100%;animation:hsc-pulse 1.6s infinite;font-size:15px;padding:14px;margin-bottom:8px;">
        📋 複製付款資訊,貼到 LINE 儲存起來
      </button>
      <div style="text-align:center;font-size:12px;color:#78350f;font-weight:700;margin-bottom:18px;">
        💡 包含轉帳資訊與付款確認單連結
      </div>
      
      <!-- 完成付款流程說明 -->
      <div style="background:linear-gradient(135deg,#fff8ec,#fef3c7);border:1.5px solid #f59e0b;border-radius:14px;padding:14px 16px;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:900;color:#92400e;margin-bottom:10px;">
          📋 完成付款流程
        </div>
        <div style="font-size:13px;line-height:1.9;color:#78350f;font-weight:700;">
          <div style="margin-bottom:4px;">
            <span style="display:inline-block;background:#f59e0b;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-right:6px;font-weight:900;">1</span>
            點上方按鈕複製
          </div>
          <div style="margin-bottom:4px;">
            <span style="display:inline-block;background:#f59e0b;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-right:6px;font-weight:900;">2</span>
            貼到 LINE 給自己,儲存起來
          </div>
          <div style="margin-bottom:4px;">
            <span style="display:inline-block;background:#f59e0b;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-right:6px;font-weight:900;">3</span>
            隨時轉帳(3 天內完成)
          </div>
          <div style="margin-bottom:4px;">
            <span style="display:inline-block;background:#22c55e;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-right:6px;font-weight:900;">4</span>
            轉完帳 → 打開之前儲存的付款訊息<br>
            <span style="margin-left:24px;display:inline-block;margin-top:4px;">→ 點 
              <span style="font-size:14px;font-weight:900;color:#dc2626;background:#fff;padding:2px 8px;border-radius:6px;border:1.5px solid #dc2626;">📋 付款確認單</span>
              填寫送出
            </span>
          </div>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(180,131,9,.3);font-size:12px;color:#15803d;font-weight:800;text-align:center;">
          💚 系統比對自動開通您的卡片
        </div>
      </div>
      
      <!-- 客服 -->
      <div style="display:flex;gap:8px;">
        <button type="button" class="ghost-btn" id="hsc-btn-help" style="flex:1;">💬 需要幫忙</button>
      </div>
      
      <style>
        @keyframes hsc-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,.4); }
          50% { box-shadow: 0 0 0 12px rgba(245,158,11,0); }
        }
      </style>
    `;
    
    const step1Btn = document.getElementById("hsc-btn-step1-copy");
    
    if (step1Btn) {
      step1Btn.addEventListener("click", async () => {
        const bundleText = _buildFullBundleText(result, mode, cardId, amount, paymentType, targetId);
        await copyText(bundleText);
        // Step 1 變成完成狀態
        step1Btn.textContent = "✅ 已複製!請貼到 LINE 儲存";
        step1Btn.style.background = "linear-gradient(180deg,#22c55e,#16a34a)";
        step1Btn.style.animation = "none";
        setStatus("✅ 付款資訊已複製!請貼到 LINE 給自己存好,轉完帳後再從訊息進入確認單。", "success");
      });
    }
    
    document.getElementById("hsc-btn-help")?.addEventListener("click", () => {
      window.open(CONFIG.SERVICE_URL, "_blank", "noopener");
    });
  }
    
  

  // ── 更新資格處理 ─────────────────────────────────────────
  function resolveUpdateEligibilityState(eligData) {
    const card = state.runtime.updateCard;
    const expiresAt = card?.expires_at || card?.expiry_date;
    const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
    const freeRemaining = Number(eligData?.free_update_remaining ?? 0);
    const isUnlimited = !!eligData?.has_unlimited_update || !!card?.has_unlimited_update;
    let requiresPayment = false, canSubmitDirectly = false, deductFreeCount = false;
    let reasonText = "", updateFeeAmount = Number(eligData?.update_fee_amount || 300);
    let updateMode = "quota";
    if (expired) {
      updateMode = "expired"; reasonText = "卡片已到期,請先續約後再更新。";
    } else if (isUnlimited) {
      updateMode = "unlimited"; canSubmitDirectly = true;
      reasonText = "不限次數更新資格有效,可直接更新。";
    } else if (freeRemaining > 0) {
      updateMode = "quota"; canSubmitDirectly = true; deductFreeCount = true;
      reasonText = `尚有 ${freeRemaining} 次免費更新次數,可直接更新。`;
    } else {
      updateMode = "paid"; requiresPayment = true;
      reasonText = `免費更新次數已用完,本次更新需付費(${money(updateFeeAmount)})。`;
    }
    state.updateFlow = {
      cardExpired: expired, freeRemaining, isUnlimited,
      requiresPayment, canSubmitDirectly, deductFreeCount,
      updateFeeAmount, expiresAt: expiresAt || "", reasonText, updateMode
    };
  }

  function syncModePanels() {
    if (state.mode === "update" && state.runtime.updateEligibility) renderUpdateEligibilityPanel();
    else if (state.mode === "renew" && state.runtime.renewCard) {
      renderRenewSummaryPanel();
      renderRenewControls();
    }
  }

  function renderUpdateEligibilityPanel() {
    const panel = els["mode-info-panel"];
    if (!panel) return;
    const f = state.updateFlow;
    const updateModeLabel = f.updateMode === "expired" ? "需先續約"
      : f.updateMode === "unlimited" ? "不限次數更新"
      : f.updateMode === "quota" ? "免費次數更新" : "付費更新";
    const actionLabel = f.updateMode === "expired" ? "請先辦理續約"
      : f.updateMode === "paid" ? `本次更新需付費 ${money(f.updateFeeAmount)}`
      : "可直接送出更新";
    panel.innerHTML = `
      <div class="mode-info-block"><div class="mode-info-label">卡片狀態</div><div class="mode-info-value">${f.cardExpired ? "⚠️ 已到期" : "✅ 有效期內"}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">更新資格</div><div class="mode-info-value">${escapeHtml(updateModeLabel)}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">免費更新次數</div><div class="mode-info-value">${f.isUnlimited ? "不限次數" : String(f.freeRemaining)}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">建議操作</div><div class="mode-info-value">${escapeHtml(actionLabel)}</div></div>
    `;
    if (els["mode-info-kicker"]) els["mode-info-kicker"].textContent = "更新資訊";
    if (els["mode-info-title"]) els["mode-info-title"].textContent = "更新資格摘要";
    if (els["mode-info-desc"]) els["mode-info-desc"].textContent = f.reasonText;
  }

  function renderRenewSummaryPanel() {
    const panel = els["mode-info-panel"];
    if (!panel) return;
    const card = state.runtime.renewCard;
    panel.innerHTML = `
      <div class="mode-info-block"><div class="mode-info-label">原方案</div><div class="mode-info-value">${escapeHtml(card?.plan || "—")}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">原到期日</div><div class="mode-info-value">${card?.expires_at ? formatDateYMD(card.expires_at) : "—"}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">跑馬燈</div><div class="mode-info-value">${card?.marquee_enabled === "true" || card?.marquee_enabled === true ? "✅ 已啟用" : "❌ 未啟用"}</div></div>
      <div class="mode-info-block"><div class="mode-info-label">照片牆</div><div class="mode-info-value">${Number(card?.photo_limit || 0)} 張</div></div>
    `;
    if (els["mode-info-kicker"]) els["mode-info-kicker"].textContent = "續約資訊";
    if (els["mode-info-title"]) els["mode-info-title"].textContent = "原卡片摘要";
    if (els["mode-info-desc"]) els["mode-info-desc"].textContent = "續約固定 NT$ 500,可加購未擁有的功能。";
  }

function renderRenewControls() {
    const panel = els["renew-controls-panel"];
    if (!panel) return;
    
    const card = state.runtime.renewCard;
    const hasUnlimited = card?.update_unlimited === "true" 
                      || card?.update_unlimited === true 
                      || card?.update_unlimited_current === "true"
                      || card?.update_unlimited_current === true;
    
    // 原卡沒有無限更新 → 不顯示「續用」選項(讓用戶去「功能加購」區首次加購)
    if (!hasUnlimited) {
      panel.innerHTML = "";
      return;
    }
    
    // 原卡有無限更新 → 顯示「續用」選項
    panel.innerHTML = `
      <div class="renew-control-group">
        <label><input type="checkbox" id="renew-unlimited-update" /> 續用無限更新 (+NT$300)</label>
      </div>
    `;
    const unlimitedCheck = document.getElementById("renew-unlimited-update");
    if (unlimitedCheck) {
      unlimitedCheck.checked = state.renewFlow.renewUnlimitedUpdate;
      unlimitedCheck.addEventListener("change", e => {
        state.renewFlow.renewUnlimitedUpdate = e.target.checked;
        refreshAll();
      });
    }
  }

  // ── Progress UI ─────────────────────────────────────────
  function showProgress(show) {
    if (!els["submit-progress-overlay"]) return;
    els["submit-progress-overlay"].classList.toggle("hidden", !show);
    if (!show) {
      els.progressSteps.forEach(s => s.classList.remove("is-active", "is-done"));
      if (els["progress-fill"]) els["progress-fill"].style.width = "0%";
      if (els["progress-text"]) els["progress-text"].textContent = "正在整理資料,請稍候。";
    }
  }

  function setProgressStep(stepNo, text) {
    const total = 5;
    els.progressSteps.forEach(step => {
      const n = Number(step.dataset.step || 0);
      step.classList.toggle("is-active", n === stepNo);
      step.classList.toggle("is-done", n < stepNo);
    });
    if (els["progress-fill"]) els["progress-fill"].style.width = `${Math.round((stepNo / total) * 100)}%`;
    if (els["progress-text"] && text) els["progress-text"].textContent = text;
  }

  function setStatus(msg, stateName = "") {
    const el = els["form-status-strip"];
    if (!el) return;
    el.textContent = msg || "";
    if (msg) el.classList.add("visible"); else el.classList.remove("visible");
    if (stateName) el.dataset.state = stateName; else delete el.dataset.state;
  }

  function hideSuccessPanel() {
    if (els["progress-success-panel"]) els["progress-success-panel"].classList.add("hidden");
  }

  // ── Draft 管理 ─────────────────────────────────────────
  function collectFormValues() {
    const out = {};
    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "radio") { if (el.checked) out[el.name] = el.value; return; }
      if (!el.id) return;
      out[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return out;
  }

  function saveDraft() {
    // 🆕 v4.1: 沒邀請碼就不儲存(防止跨客戶污染)
    const key = getDraftKey();
    if (!key) return;
    const values = collectFormValues();
    try {
      localStorage.setItem(key, JSON.stringify({ values, photoMeta: state.photoMeta, mode: state.mode }));
    } catch (_) {}
  }

  function saveDraftSilently() { try { saveDraft(); } catch (_) {} }

  // ★ 關鍵:update/renew 模式不還原 localStorage 草稿
  function restoreDraft() {
    if (state.mode === "update" || state.mode === "renew") {
      const inviteOnly = getInviteCodeFromPage();
      if (inviteOnly && document.getElementById("invite_code")) {
        document.getElementById("invite_code").value = inviteOnly;
        state.modeContext.inviteCode = inviteOnly;
      }
      return;
    }
    let draft = null;
    // 🆕 v4.1: 用動態 key 還原
    const key = getDraftKey();
    if (!key) {
      // 沒邀請碼,不還原任何草稿
      const inviteOnly = getInviteCodeFromPage();
      if (inviteOnly && document.getElementById("invite_code")) {
        document.getElementById("invite_code").value = inviteOnly;
        state.modeContext.inviteCode = inviteOnly;
      }
      return;
    }
    try { draft = JSON.parse(localStorage.getItem(key) || "null"); } catch (_) {}
    if (!draft || typeof draft !== "object") {
      const inviteOnly = getInviteCodeFromPage();
      if (inviteOnly && document.getElementById("invite_code")) {
        document.getElementById("invite_code").value = inviteOnly;
        state.modeContext.inviteCode = inviteOnly;
      }
      return;
    }
    const values = draft.values || {};
    const params = new URLSearchParams(window.location.search || "");
    const inviteFromUrl = (params.get("invite_code") || params.get("invite") || "").trim();
    state.draftValues = { ...values };
    Object.keys(values).forEach(key => {
      if (/^cta_(text|link)_\d+$/.test(key)) return;
      if (key === "invite_code" && inviteFromUrl) return;
      const el = document.getElementById(key);
      if (el) {
        if (el.type === "checkbox") el.checked = !!values[key];
        else el.value = values[key];
        return;
      }
      if (key === "plan") {
        const r = document.querySelector(`input[name="plan"][value="${values[key]}"]`);
        if (r) r.checked = true;
      }
    });
    const finalInvite = inviteFromUrl || state.modeContext.inviteCode || sessionStorage.getItem("hsc_last_invite_code") || "";
    if (finalInvite && document.getElementById("invite_code")) {
      document.getElementById("invite_code").value = finalInvite;
      state.modeContext.inviteCode = finalInvite;
      sessionStorage.setItem("hsc_last_invite_code", finalInvite);
    }
    if (draft.photoMeta && typeof draft.photoMeta === "object") state.photoMeta = draft.photoMeta;
    ensurePhotoMetaKey("avatar");
    ensurePhotoMetaKey("logo");
  }

  function clearDraft() {
    // 🆕 v4.1: 清除當前邀請碼的草稿
    const key = getDraftKey();
    if (key) {
      try { localStorage.removeItem(key); } catch(_){}
    }
    localStorage.removeItem(CONFIG.QUOTE_STORAGE_KEY);
    location.reload();
  }

  // ── 事件綁定 ─────────────────────────────────────────────
  function bindStaticEvents() {
    if (els["smart-card-form"]) els["smart-card-form"].addEventListener("submit", submit);
    els.planRadios.forEach(r => r.addEventListener("change", () => {
      if (state.mode === "renew") state.renewFlow.targetPlan = r.value;
      refreshAll();
    }));
    els.addonCheckboxes.forEach(b => b.addEventListener("change", refreshAll));
    ["addon_photo_qty", "addon_cta_qty"].forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input", refreshAll);
        els[id].addEventListener("change", refreshAll);
      }
    });
    [
      "free_color","free_style","free_paper","premium_color",
      "display_name","unit","title","phone","email","website",
      "line_url","line_oa","wechat_id","experience","services",
      "address","intro","marquee_text",
      "video1","video2","video3","social1","social2","social3"
    ].forEach(id => {
      if (els[id]) {
        els[id].addEventListener("input", onLiveChange);
        els[id].addEventListener("change", onLiveChange);
      }
    });
    bindButton(els["btn-open-showcase"], () => window.open(CONFIG.SHOWCASE_URL, "_blank", "noopener"));
    bindButton(els["btn-toggle-mode"], () => els["dev-mode-switcher"]?.scrollIntoView({ behavior: "smooth", block: "start" }));
    bindButton(els["btn-contact-service"], () => window.open(CONFIG.SERVICE_URL, "_blank", "noopener"));
    bindButton(els["progress-contact-service"], () => window.open(CONFIG.SERVICE_URL, "_blank", "noopener"));
    bindButton(els["btn-gold-contact"], () => window.open(CONFIG.SERVICE_URL, "_blank", "noopener"));
    bindButton(els["btn-gold-info"], () => alert("金牌級會員請聯繫客服瞭解完整權益。"));
    bindButton(els["btn-save-draft"], () => { saveDraft(); setStatus("草稿已暫存。", "success"); });
    bindButton(els["btn-clear-draft"], clearDraft);
    bindButton(els["btn-gold-copy"], async () => {
      await copyText("您好,我想瞭解金牌級會員的完整權益與適合方案。");
      setStatus("已複製金牌會員詢問文案。", "success");
    });
    bindButton(els["btn-mode-create"], () => switchModeByUrl("create"));
    bindButton(els["btn-mode-update"], () => switchModeByUrl("update"));
    bindButton(els["btn-mode-renew"], () => switchModeByUrl("renew"));
  }

  function bindButton(btn, handler) {
    if (btn) btn.addEventListener("click", handler);
  }

  function onLiveChange() {
    updatePreview();
    saveDraftSilently();
  }

  function getThemeSelection() {
    const plan = state.mode === "renew"
      ? (state.renewFlow.targetPlan || getSelectedPlan() || "free")
      : (getSelectedPlan() || "premium");
    if (plan === "free") {
      return {
        plan,
        color: els["free_color"]?.value || "c1",
        style: els["free_style"]?.value || "s1",
        paper: els["free_paper"]?.value || "f1"
      };
    }
    return { plan, color: els["premium_color"]?.value || "p1", style: "", paper: "" };
  }

})();
