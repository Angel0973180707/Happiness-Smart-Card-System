/************************************************
HSC GAS = "v7.11.1-recognition-stable";
- 修正1: Queue 唯一化建立 pending recognition
- 修正2: approveRecognition 必須驗證 event 已付款
- 修正3: applyRecognitionReward 防重複發獎 (recognition_id 為主鍵)
- 修正4: agent 分流判定以 agent_type 為主、member_tier 為輔
- 保留 v7.11.0 所有 recognition 架構與既有功能
************************************************/

const HSC_VERSION = "v7.11.1-recognition-stable";

const AGENT_ROLE_DEFAULT = "referral";
const AGENT_ROLE_PARTNER = "partner";
const AGENT_ROLE_REFERRAL = "referral";
const AGENT_UPGRADE_TARGET_POINTS = 10000;
const CUSTOMER_AUTO_UPGRADE_POINTS = 5;

const CONFIG = {
  SPREADSHEET_ID: "1k7LBTWKsTFtnhOC2Fgj0WqkJ0IO04ZBGHYyOnxoQnkg",
  BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  DEFAULT_TENANT: "angel",
  DEFAULT_TIMEZONE: "Asia/Taipei",
  UPDATE_TOKEN_EXPIRE_HOURS: 72,
  INVITE_DEFAULT_EXPIRE_DAYS: 3,
  CARD_EXPIRE_DAYS: 365,
  PAYMENT_DUE_DAYS: 3,
  SYSTEM_EMAIL: "",
  SERVICE_LOG_WINDOW_DAYS: 7,
  RENEWAL_SERVICE_AGENT_RATE: 0.4,
  RENEWAL_REFERRER_POINTS_RATE: 0.2,
  RECOGNITION_POINTS_RATE: 0.2,
  RECOGNITION_CASH_RATE: 0.4,
    SHEETS: {
    CARD: "card_db",
    LEAD: "lead_db",
    INVITE: "invite_db",
    PLAN: "plan_db",
    PAYMENT: "payment_db",
    COMMISSION: "commission_db",
    COMMISSION_RULES: "commission_rules",
    AGENT: "agent_db",
    ANNOUNCEMENT: "announcement_db",
    UPDATE_LOG: "update_log_db",
    AGENT_POLICY_LOG: "agent_policy_log",
    PROMO_RULES: "promo_rules",
    REQUEST: "request_db",
    SERVICE_LOG: "service_log",
    ADDON_ORDER: "add_on_order_db",
    OPS_LOG: "ops_log_db",
    AGENT_SETTLEMENT_REPORT: "agent_settlement_report",
    AGENT_POINTS_LOG: "agent_points_log",
    AGENT_COMMISSION_LOG: "agent_commission_log",
    RENEWAL: "renewal_db",
    PRICING: "pricing_db",
    TRACKING: "tracking_log",
    RECOGNITION: "recognition_db"
  }
};

const SCHEMA = {
  card_db: [
    "id","token","status","tenant","billing_status",
    "created_at","updated_at","activated_at","inactivated_at",
    "expired_at","expires_at","form_ts",

    "plan","color","style","paper",
    "name","unit","title","slogan",
    "services","experience",

    "wechat_id","line_url","line_oa","email","phone","address",

    "video1","video2","video3",
    "social1","social2","social3",

    "avatar_url","logo_url",
    "photo_limit",

    "photo1_url","photo2_url","photo3_url","photo4_url","photo5_url",
    "photo6_url","photo7_url","photo8_url","photo9_url","photo10_url",

    "avatar_key","logo_key",
    "photo1_key","photo2_key","photo3_key","photo4_key","photo5_key",
    "photo6_key","photo7_key","photo8_key","photo9_key","photo10_key",

    "invite_code","reserved_uid","reserved_at","confirmed_at","confirm_note",

    "website","uid",

    "cta_text_1","cta_link_1",
    "cta_text_2","cta_link_2",
    "cta_text_3","cta_link_3",

    "wechat_poster",

    "view_count","last_view_at",

    "referrer","service_agent","agent_type","is_agent","agent_id","source",

    "update_token","update_token_created_at","update_token_expire","update_link_sent_at",

    "form_source","lead_snapshot",

    "process_status","is_test",

    "share_card_id","share_agent_id","share_source","share_channel","share_visit_id",

    "owner_email","owner_phone","owner_agent_id","owner_agent_type",

    "notify_line_enabled","line_user_id","email_enabled",

    "update_limit_override_enabled","update_limit_override_value",
    "update_fee_override","update_fee_override_enabled",

    "payment_due_at","payment_paid_at",
    "remind_at","reminded_at","renewal_owner","delivered_at",

    "marquee_purchased","marquee_enabled","marquee_text",
    "cta_extra_purchased","photo_extra_purchased",
    "features_json","cta_limit"
  ],

  lead_db: [
    "lead_id","created_at","name","phone","email","plan","color","style","paper","referrer","service_agent","agent_type","source","status","note","tenant","updated_at","form_ts","unit","title","line_url","line_oa","wechat_id","address","services","experience","website","invite_code","uid","reserved_uid","is_agent","agent_id","renewal_owner","form_source","lead_snapshot","process_status","is_test","share_card_id","share_agent_id","share_source","share_channel","share_visit_id","converted_card_id","converted_at"
  ],

  invite_db: [
    "invite_code","created_at","expired_at","status","referrer","service_agent","agent_type","used_count","max_use","note","tenant","plan","source","expire_at","used_at","used_by_id","disabled_at","last_editor","process_status","is_test"
  ],

  plan_db: [
    "plan_id","plan_name","status","sort_order","price","description","cta_limit","photo_limit_default","photo_limit_max","extra_photo_purchase_enabled","color_options","style_options","paper_options","is_premium_style","hide_style","hide_paper","update_limit_enabled","free_update_limit_yearly","extra_update_fee","extra_update_fee_enabled","created_at","updated_at","note","tenant","renewal_price"
  ],

  payment_db: [
    "payment_id","card_id","lead_id","created_at","updated_at","event_type","order_type","plan","amount","status","paid_at","due_at","method","transaction_id","billing_status_after","note","created_by","is_test","tenant","agent_id","agent_type","member_tier","share_card_id","share_agent_id","share_source","share_channel","commission_status","card_status_before","card_status_after","operated_by","risk_flag","risk_reason","review_status","reviewed_at","refund_at","refund_reason","commission_processed_at","commission_reversed_at","plan_code","plan_name","plan_amount","addon_amount","total_amount","currency","addon_summary","order_summary_json","billing_status","payment_channel"
  ],

  renewal_db: [
    "renewal_id",
    "card_id",
    "created_at",
    "updated_at",
    "tenant",
    "status",
    "current_plan",
    "target_plan",
    "is_upgrade",
    "is_downgrade",
    "current_expires_at",
    "new_expires_at",
    "renewal_price",
    "upgrade_diff",
    "downgrade_note",
    "keep_marquee",
    "keep_photo_extra_qty",
    "keep_cta_extra_qty",
    "update_unlimited_current",
    "update_unlimited_renew",
    "renewal_amount",
    "addon_amount",
    "total_amount",
    "payment_id",
    "due_at",
    "paid_at",
    "billing_status",
    "renew_token",
    "renew_token_created_at",
    "renew_token_expire",
    "submitted_by",
    "reminder_stage",
    "last_reminded_at",
    "note",
    "is_test",
    "order_summary_json"
  ],

  pricing_db: [
    "item_code",
    "item_name",
    "price",
    "status",
    "tenant",
    "bundle_items"
  ],

  commission_db: [
    "commission_id","payment_id","card_id","lead_id","created_at","updated_at","beneficiary_agent_id","source_agent_id","source_card_id","reward_type","item","base_amount","reward_rate","reward_amount","reward_points","status","rule_id","calculated_at","paid_at","frozen_at","unfrozen_at","freeze_reason","commission_batch_id","is_reversal","reversal_of","reversal_at","note","tenant"
  ],

  commission_rules: [
    "rule_id","tenant","status","rule_name","rule_type","target_type","plan","source_type","agent_type","share_source","share_channel","is_first_payment_only","is_renewal_allowed","commission_mode","commission_value","bonus_mode","bonus_value","priority","start_at","end_at","note","created_at","updated_at"
  ],

  agent_db: [
    "agent_id","card_id","created_at","updated_at","status","agent_type","owner_name","owner_email","owner_phone","parent_agent_id","referrer_agent_id","points_balance","points_lifetime","points_redeemed","points_frozen","total_commission","commission_paid_total","commission_frozen","eligible_for_upgrade","upgrade_status","upgrade_eligible_at","partner_status","partner_qualified_at","partner_revoked_at","partner_revoke_reason","self_renewal_required","self_renewal_ok","reward_freeze_flag","reward_freeze_reason","reward_freeze_at","reward_unfreeze_at","last_points_at","last_commission_at","last_reversed_at","agent_source","note","is_test","tenant","member_tier","tier_upgrade_eligible","tier_upgrade_reminder_sent_at"
  ],

  announcement_db: [
    "id","title","content","type","status","priority","start_at","end_at","created_at","updated_at","created_by","tenant"
  ],

  update_log_db: [
    "update_id","card_id","created_at","updated_at","update_type","is_free","charge_required","charge_amount","payment_id","status","updated_by","rule_source","year_bucket","effective_period_key","note","is_test","tenant"
  ],

  agent_policy_log: [
    "log_id","agent_id","card_id","created_at","action_type","old_value","new_value","reason","created_by","tenant"
  ],

  promo_rules: [
    "promo_id","status","promo_name","plan","event_type","promo_type","discount_type","discount_value","bonus_reward_type","bonus_reward_rate","stackable","priority","start_at","end_at","note","created_at","updated_at","tenant"
  ],

  request_db: [
    "request_id","created_at","ref","status","assigned_invite_code","assigned_by","note","tenant"
  ],

  service_log: [
    "service_log_id","card_id","agent_id","service_type","service_date","related_payment_type","evidence_type","evidence_ref","status","validated_by","validated_at","created_at","updated_at","tenant","is_test"
  ],

  add_on_order_db: [
    "addon_order_id","card_id","created_at","updated_at","addon_type","addon_key","qty","unit_price","amount","status","paid_at","cancelled_at","payment_id","transaction_id","note","created_by","tenant","is_test","item_code","item_name","bundle_parent_code","applied_at","applied_note","due_at"
  ],

  ops_log_db: [
    "log_id","module","action","target_id","before_status","after_status","operator","created_at","note","tenant"
  ],

  agent_settlement_report: [
    "settlement_id","settlement_month","agent_id","agent_name","tenant","currency","commission_count","gross_commission_amount","reversal_amount","frozen_amount","adjustment_amount","net_payable_amount","status","batch_id","calculated_at","approved_at","paid_at","paid_by","note"


  ],

  agent_points_log: [
  "log_id","agent_id","type","points",
  "before_balance","after_balance",
  "ref_id","note","created_at","tenant","operator",
  "bucket","before_frozen","after_frozen","before_redeemed","after_redeemed"
],

 agent_commission_log: [
  "log_id","agent_id","type","amount",
  "before_total","after_total",
  "ref_id","note","created_at","tenant","operator",
  "bucket","before_frozen","after_frozen","before_paid","after_paid"
],

 tracking_log: [
  "id","created_at","card_id","agent_id","share_agent_id","share_card_id","share_source","share_channel","share_visit_id","action_type","target_type","target_value","device","referrer","note","tenant","is_test"
],

 recognition_db: [
  "recognition_id",
  "event_type",
  "event_id",
  "card_id",
  "agent_id",
  "service_log_id",
  "recognition_result",
  "recognized_by",
  "recognized_at",
  "note",
  "tenant",
  "is_test",
  "created_at",
  "updated_at"
],
};

const PHOTO_LIMIT_ABSOLUTE_MAX = 10;
const ADDON_ORDER_ALLOWED_STATUSES = ["pending","paid","cancelled"];

const ADDON_ITEM_CODES = [
  "addon_photo",
  "addon_cta",
  "addon_marquee",
  "addon_update_unlimited",
  "addon_agent_upgrade",
  "addon_combo_pro"
];

const SHEET_HEADERS = {
  card_db: SCHEMA.card_db,
  lead_db: SCHEMA.lead_db,
  invite_db: SCHEMA.invite_db,
  plan_db: SCHEMA.plan_db,
  payment_db: SCHEMA.payment_db,
  renewal_db: SCHEMA.renewal_db,
  pricing_db: SCHEMA.pricing_db,
  commission_db: SCHEMA.commission_db,
  commission_rules: SCHEMA.commission_rules,
  agent_db: SCHEMA.agent_db,
  announcement_db: SCHEMA.announcement_db,
  update_log_db: SCHEMA.update_log_db,
  agent_policy_log: SCHEMA.agent_policy_log,
  promo_rules: SCHEMA.promo_rules,
  request_db: SCHEMA.request_db,
  service_log: SCHEMA.service_log,
  add_on_order_db: SCHEMA.add_on_order_db,
  ops_log_db: SCHEMA.ops_log_db,
  agent_settlement_report: SCHEMA.agent_settlement_report,
  agent_points_log: SCHEMA.agent_points_log,
  agent_commission_log: SCHEMA.agent_commission_log,
  tracking_log: SCHEMA.tracking_log,
  recognition_db: SCHEMA.recognition_db
};

function appendNote_(oldNote, extra) {
  return mergeNote_(oldNote, extra);
}

function cardHasMarqueeAddon_(cardId, tenant) {
  var card = findRowByField_("card_db", "id", sanitizeText_(cardId));
  if (!card) return false;
  if (toBoolean_(card.marquee_purchased)) return true;
  var cardTenant = sanitizeText_(tenant) || sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  return getSheetRowsByName_("add_on_order_db").some(function(row) {
    if (sanitizeText_(row.card_id) !== sanitizeText_(cardId)) return false;
    if (!sameTenant_(row.tenant, cardTenant)) return false;
    if (sanitizeText_(row.status).toLowerCase() !== "paid") return false;
    return normalizeAddonItemCode_(row.item_code || row.addon_key || row.addon_type) === "addon_marquee";
  });
}

function saveCardMarquee_(req) {
  req = req || {};
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");
  var updated = shallowClone_(card);
  var enabled = String(req.enabled).toUpperCase() === "TRUE" || req.enabled === true;
  updated.marquee_purchased = "TRUE";
  updated.marquee_enabled = enabled ? "TRUE" : "FALSE";
  updated.marquee_text = sanitizeText_(req.marquee_text || req.text);
  updated.updated_at = nowIso_();
  if (req.note) updated.note = mergeNote_(updated.note, sanitizeText_(req.note));
  updateRowByName_("card_db", card.__rowNum, updated);
  invalidateCardPublicCache_(updated.id || updated.card_id);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "saveCardMarquee",
    marquee: {
      enabled: updated.marquee_enabled === "TRUE",
      marquee_text: updated.marquee_text
    },
    card: updated
  };
}

const ACTIONS = [
  "ping",
  "trackEvent",
  "trackRedirect",
  "getTrackingSummary",
  "getCardTrackingStats",
  "getAgentTrackingStats",
  "getPlanOptions",
  "createInviteCode",
  "getInviteFormUrl",
  "createRequest",
  "getRequests",
  "assignInviteToRequest",
  "createLead",
  "createCard",
  "markCardDelivered",
  "getCard",
  "getCardPublicLite",
  "getCardForUpdate",
  "getUpdateEligibility",
  "createUpdateFeePayment",
  "updateCardByToken",
  "confirmUpdateFeePaid",
  "confirmPayment",
  "getPaymentDetail",
  "getCardPaymentSummary",
  "markPaymentPaid",
  "adminMarkPaid",
  "markPaymentRefunded",
  "processCommission",
  "reverseCommission",
  "getCommissionList",
  "getCommissionByPayment",
  "adminGetCommissionList",
  "getPaymentCommissionStatus",
  "adminGetPaymentList",
  "createServiceLog",
  "getServiceLogs",
  "approveServiceLog",
  "rejectServiceLog",
  "getAgentSummary",
  "getDeliveryAgentInfo",
  "getAgentCommissionStats",
  "getAgentUpgradeStatus",
  "adminFreezeAgent",
  "adminUnfreezeAgent",
  "adminUpdateAgentType",
  "adminSetAgentUpgrade",
  "getExpiringCards",
  "getExpiredCards",
  "markCardRenewed",
  "triggerExpiryCheck",
  "getAnnouncements",
  "getAnnouncementDetail",
  "adminGetAnnouncements",
  "adminSaveAnnouncement",
  "adminToggleAnnouncement",
  "installSystemTriggers",
  "adminSavePlan",
  "adminSaveCardOverrides",
  "adminGetCardSettings",
  "adminBuildSpecialFormUrl",
  "adminNormalizeCardThemeFields",
  "adminAuditCardThemeFields",
  "createAddonOrder",
  "createAddOnOrder",
  "adminCancelAddonOrder",
  "adminCheckSchemaStatus",
  "repairAddonOrderStatuses",
  "createOfflinePayment",
  "submitOfflinePaymentProof",
  "confirmOfflinePayment",
  "buildPaymentNoticeText",
  "buildDeliveryNoticeText",
  "buildPaidNoticeText",
  "createCardWithOfflinePayment",
  "getPendingOfflinePayments",
  "runDailyOps",
  "installCommercialTriggers",
  "getCommissions",
  "approveCommission",
  "markCommissionPaid",
  "confirmAddonOrderPaid",
  "confirmAddOnPayment",
  "adminMarkAddonPaid",
  "adminBackfillAddonDueAt",
  "getAddonOrders",
  "triggerAddonPaymentReminder",
  "expirePendingAddonOrders",
  "submitAddonPaymentProof",
  "buildAddonPaymentNoticeText",
  "runInviteExpireSweep",
  "runPaymentReminderSweep",
  "runPaymentLockSweep",
  "triggerPaymentReminder",
  "triggerRenewalReminder",
  "triggerOverdueLock",
  "getPayments",
  "getPayment",
  "updatePayment",
  "adminRepairDueAt",
  "getCards",
  "adminUpdateCard",
  "adminGetRenewalList",
  "adminMarkRenewalPaid",
  "triggerRenewalPaymentReminder",
  "getAddonOrder",
  "adminGetOrderDetail",
  "adminListOrders",
  "adminCreateAddonOrder",
  "getOpsLogs",
  "getPendingCommissionPayments",
  "getAdminCardDashboard",
  "runCommissionEngineSweep",
  "adminGetAgent",
  "adminListAgents",
  "adminUpdateAgent",
  "adminAdjustPoints",
  "adminAdjustCommission",
  "getAgentPointsLog",
  "getAgentCommissionLog",
  "buildMonthlySettlement",
  "markSettlementPaid",
  "getCardForRenewal",
  "getRenewalSummary",
  "createRenewalPayment",
  "adminGetRenewalByCardId",
  "adminGrantAddon",
  "adminGetRenewalDetail",
  "adminRepairMissingAgents",
  "adminNormalizeAgentMemberTier",
  "adminNormalizeAgentTypeAndTier",
  "adminRepairAgentPointsLog",
  "adminRepairAgentTypeEnum",
  "adminRepairDataValidation",
  "getRecentOpsLogs",
  "getRenewalRecognitionQueue",
  "getAddonRecognitionQueue",
  "approveRecognition",
  "rejectRecognition",
  "getRecognitionDetail",
  "getPaymentList",
  "getAgents",
  "getRecognitionQueue",
  "getRenewalList",
  "getRenewalByCardId",
  "getRenewalDetail",
  "getAddonOrderDetail",
  "getAgentDetail",
  "checkSchemaStatus",
  "getRequestTrace"
];
const ADMIN_PROTECTED_ACTIONS = [
  "getTrackingSummary",
  "getCardTrackingStats",
  "getAgentTrackingStats",
  "confirmPayment",
  "markPaymentPaid",
  "adminMarkPaid",
  "markPaymentRefunded",
  "reverseCommission",
  "approveServiceLog",
  "rejectServiceLog",
  "adminSaveAnnouncement",
  "adminToggleAnnouncement",
  "adminFreezeAgent",
  "adminUnfreezeAgent",
  "adminUpdateAgentType",
  "adminSetAgentUpgrade",
  "installSystemTriggers",
  "createInviteCode",
  "assignInviteToRequest",
  "getPaymentDetail",
  "adminGetPaymentList",
  "adminGetCommissionList",
  "adminGetAnnouncements",
  "adminSavePlan",
  "adminSaveCardOverrides",
  "adminGetCardSettings",
  "adminBuildSpecialFormUrl",
  "adminNormalizeCardThemeFields",
  "adminAuditCardThemeFields",
  "adminCancelAddonOrder",
  "adminCheckSchemaStatus",
  "repairAddonOrderStatuses",
  "confirmOfflinePayment",
  "getPendingOfflinePayments",
  "runDailyOps",
  "installCommercialTriggers",
  "approveCommission",
  "markCommissionPaid",
  "confirmAddonOrderPaid",
  "confirmAddOnPayment",
  "adminMarkAddonPaid",
  "getAddonOrders",
  "triggerAddonPaymentReminder",
  "expirePendingAddonOrders",
  "getPayments",
  "getPayment",
  "updatePayment",
  "adminRepairDueAt",
  "getCards",
  "adminUpdateCard",
  "adminGetRenewalList",
  "adminMarkRenewalPaid",
  "triggerRenewalPaymentReminder",
  "getAddonOrder",
  "adminGetOrderDetail",
  "adminListOrders",
  "adminCreateAddonOrder",
  "getOpsLogs",
  "getPendingCommissionPayments",
  "getAdminCardDashboard",
  "runCommissionEngineSweep",
  "adminGetAgent",
  "adminListAgents",
  "adminUpdateAgent",
  "adminAdjustPoints",
  "adminAdjustCommission",
  "getAgentPointsLog",
  "getAgentCommissionLog",
  "buildMonthlySettlement",
  "markSettlementPaid",
  "adminGetRenewalByCardId",
  "adminGetRenewalDetail",
  "adminGrantAddon",
  "adminRepairMissingAgents",
  "adminNormalizeAgentMemberTier",
  "adminNormalizeAgentTypeAndTier",
  "adminRepairAgentPointsLog",
  "adminRepairAgentTypeEnum",
  "adminRepairDataValidation",
  "getRecentOpsLogs",
  "getRenewalRecognitionQueue",
  "getAddonRecognitionQueue",
  "approveRecognition",
  "rejectRecognition",
  "getRecognitionDetail",
  "getPaymentList",
  "getAgents",
  "getRecognitionQueue",
  "getRenewalList",
  "getRenewalByCardId",
  "getRenewalDetail",

  "getAddonOrderDetail",
  "getAgentDetail",
  "checkSchemaStatus",
  "getRequestTrace"
];
// ============================================================
// 主題欄位驗證與標準化 (清洗用)
// ============================================================

function isValidFreeColor_(v) {
  var val = String(v || "").trim().toLowerCase();
  return /^c[1-5]$/.test(val);
}

function isValidStyle_(v) {
  var val = String(v || "").trim().toLowerCase();
  return /^s[1-3]$/.test(val);
}

function isValidPaper_(v) {
  var val = String(v || "").trim().toLowerCase();
  return /^f[1-3]$/.test(val);
}

function isValidPremiumColor_(v) {
  var val = String(v || "").trim().toLowerCase();
  return /^p[1-7]$/.test(val);
}

function normalizePlanValue_(v) {
  var val = String(v || "").trim().toLowerCase();
  if (val === "premium") return "premium";
  if (val === "free") return "free";
  return "free";
}

function normalizeFreeColor_(v) {
  var val = String(v || "").trim().toLowerCase();
  if (isValidFreeColor_(val)) return val;
  return "c1";
}

function normalizeStyleValue_(v) {
  var val = String(v || "").trim().toLowerCase();
  if (isValidStyle_(val)) return val;
  return "s1";
}

function normalizePaperValue_(v) {
  var val = String(v || "").trim().toLowerCase();
  if (isValidPaper_(val)) return val;
  return "f1";
}

function normalizePremiumColor_(v) {
  var val = String(v || "").trim().toLowerCase();
  if (isValidPremiumColor_(val)) return val;
  return "p1";
}

function safeParseJson_(raw) {
  if (!raw || typeof raw !== "string") return null;
  var s = String(raw).trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function getSnapshotValue_(snapshot, key) {
  if (!snapshot || typeof snapshot !== "object") return "";
  var val = snapshot[key];
  return val != null ? String(val).trim() : "";
}

function normalizeCardThemeFields_(row) {
  if (!row || typeof row !== "object") {
    return { changed: false, updatedRow: row, changes: {} };
  }

  var snapshot = safeParseJson_(row.lead_snapshot);
  var before = {
    plan: String(row.plan || "").trim(),
    color: String(row.color || "").trim(),
    style: String(row.style || "").trim(),
    paper: String(row.paper || "").trim()
  };

  var after = { plan: before.plan, color: before.color, style: before.style, paper: before.paper };
  var changed = false;

  var targetPlan = normalizePlanValue_(row.plan);
  if (after.plan !== targetPlan) {
    after.plan = targetPlan;
    changed = true;
  }

  if (targetPlan === "premium") {
    var colorValue = "";
    if (isValidPremiumColor_(before.color)) {
      colorValue = before.color.toLowerCase();
    } else {
      var snapshotColor = getSnapshotValue_(snapshot, "color");
      if (isValidPremiumColor_(snapshotColor)) {
        colorValue = snapshotColor.toLowerCase();
      }
    }
    var normalizedColor = normalizePremiumColor_(colorValue);
    if (after.color !== normalizedColor) {
      after.color = normalizedColor;
      changed = true;
    }
    if (after.style !== "") {
      after.style = "";
      changed = true;
    }
    if (after.paper !== "") {
      after.paper = "";
      changed = true;
    }
  } else {
    var freeColorValue = "";
    if (isValidFreeColor_(before.color)) {
      freeColorValue = before.color.toLowerCase();
    } else {
      var snapshotFreeColor = getSnapshotValue_(snapshot, "color");
      if (isValidFreeColor_(snapshotFreeColor)) {
        freeColorValue = snapshotFreeColor.toLowerCase();
      }
    }
    var normalizedFreeColor = normalizeFreeColor_(freeColorValue);
    if (after.color !== normalizedFreeColor) {
      after.color = normalizedFreeColor;
      changed = true;
    }

    var styleValue = "";
    if (isValidStyle_(before.style)) {
      styleValue = before.style.toLowerCase();
    } else {
      var snapshotStyle = getSnapshotValue_(snapshot, "style");
      if (isValidStyle_(snapshotStyle)) {
        styleValue = snapshotStyle.toLowerCase();
      }
    }
    var normalizedStyle = normalizeStyleValue_(styleValue);
    if (after.style !== normalizedStyle) {
      after.style = normalizedStyle;
      changed = true;
    }

    var paperValue = "";
    if (isValidPaper_(before.paper)) {
      paperValue = before.paper.toLowerCase();
    } else {
      var snapshotPaper = getSnapshotValue_(snapshot, "paper");
      if (isValidPaper_(snapshotPaper)) {
        paperValue = snapshotPaper.toLowerCase();
      }
    }
    var normalizedPaper = normalizePaperValue_(paperValue);
    if (after.paper !== normalizedPaper) {
      after.paper = normalizedPaper;
      changed = true;
    }
  }

  var updatedRow = shallowClone_(row);
  updatedRow.plan = after.plan;
  updatedRow.color = after.color;
  updatedRow.style = after.style;
  updatedRow.paper = after.paper;
  updatedRow.updated_at = nowIso_();

  return {
    changed: changed,
    updatedRow: updatedRow,
    changes: { before: before, after: after }
  };
}

function normalizeCardThemeFieldsForDisplay_(card) {
  var row = card || {};
  var snapshot = safeParseJson_(row.lead_snapshot);
  var plan = normalizePlanValue_(row.plan);
  var color = String(row.color || "").trim();
  var style = String(row.style || "").trim();
  var paper = String(row.paper || "").trim();

  if (plan === "premium") {
    if (!isValidPremiumColor_(color)) {
      var fromSnapshot = getSnapshotValue_(snapshot, "color");
      if (isValidPremiumColor_(fromSnapshot)) color = fromSnapshot;
      else color = "p1";
    }
    return { plan: plan, color: color.toLowerCase(), style: "", paper: "" };
  } else {
    if (!isValidFreeColor_(color)) {
      var fromSnapshotColor = getSnapshotValue_(snapshot, "color");
      if (isValidFreeColor_(fromSnapshotColor)) color = fromSnapshotColor;
      else color = "c1";
    }
    if (!isValidStyle_(style)) {
      var fromSnapshotStyle = getSnapshotValue_(snapshot, "style");
      if (isValidStyle_(fromSnapshotStyle)) style = fromSnapshotStyle;
      else style = "s1";
    }
    if (!isValidPaper_(paper)) {
      var fromSnapshotPaper = getSnapshotValue_(snapshot, "paper");
      if (isValidPaper_(fromSnapshotPaper)) paper = fromSnapshotPaper;
      else paper = "f1";
    }
    return { plan: plan, color: color.toLowerCase(), style: style.toLowerCase(), paper: paper.toLowerCase() };
  }
}

function adminNormalizeCardThemeFields(params) {
  if (!params) {
    return {
      ok: false,
      version: HSC_VERSION,
      action: "adminNormalizeCardThemeFields",
      error: "Missing params"
    };
  }

  requireAdminKey_(params);

  var dryRun = String(params.dry_run || "").toLowerCase() === "true";
  var sheet = getSheetByName_("card_db");
  if (!sheet) {
    return {
      ok: false,
      version: HSC_VERSION,
      action: "adminNormalizeCardThemeFields",
      error: "Sheet 'card_db' not found"
    };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    var stats = {
      total_rows: 0,
      message: "No data rows found"
    };
    stats.ok = true;
    stats.version = HSC_VERSION;
    stats.action = "adminNormalizeCardThemeFields";
    stats.dry_run = dryRun;
    stats.sheet = "card_db";
    return stats;
  }

  var headers = data[0];
  var headerIndex = {};
  var schemaHeaders = SCHEMA.card_db;
  for (var i = 0; i < schemaHeaders.length; i++) {
    headerIndex[schemaHeaders[i]] = i;
  }

  var stats = {
    total_rows: data.length - 1,
    checked_rows: 0,
    changed_rows: 0,
    skipped_rows: 0,
    premium_fixed_count: 0,
    free_fixed_count: 0,
    invalid_plan_fixed_count: 0,
    errors: [],
    change_logs: []
  };

  var newData = data.slice();
  var changesToLog = [];

  for (var r = 1; r < data.length; r++) {
    var row = {};
    for (var key in headerIndex) {
      var idx = headerIndex[key];
      if (idx !== undefined && idx < data[r].length) {
        row[key] = data[r][idx];
      } else {
        row[key] = "";
      }
    }

    var cardId = sanitizeText_(row.id);
    if (!cardId) {
      stats.skipped_rows++;
      continue;
    }

    stats.checked_rows++;

    try {
      var rawPlan = sanitizeText_(row.plan).toLowerCase();
      var result = normalizeCardThemeFields_(row);

      if (result.changed) {
        stats.changed_rows++;

        if (result.changes.after.plan === "premium") {
          stats.premium_fixed_count++;
        } else {
          stats.free_fixed_count++;
        }

        if (rawPlan !== result.changes.after.plan) {
          stats.invalid_plan_fixed_count++;
        }

        if (changesToLog.length < 20) {
          changesToLog.push({
            id: cardId,
            before: result.changes.before,
            after: result.changes.after
          });
        }

        if (!dryRun) {
          var newRow = newData[r];
          for (var field in result.updatedRow) {
            var fieldIdx = headerIndex[field];
            if (fieldIdx !== undefined && fieldIdx < newRow.length) {
              newRow[fieldIdx] = result.updatedRow[field];
            }
          }
        } else {
          var previewRow = data[r].slice();
          for (var f in result.updatedRow) {
            var idxF = headerIndex[f];
            if (idxF !== undefined && idxF < previewRow.length) {
              previewRow[idxF] = result.updatedRow[f];
            }
          }
          if (!stats.previewRows) stats.previewRows = [];
          stats.previewRows.push(previewRow);
        }
      }
    } catch (err) {
      stats.errors.push({
        row: r + 1,
        id: cardId,
        error: err.message
      });
      stats.skipped_rows++;
    }
  }

  if (!dryRun && stats.changed_rows > 0) {
    sheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
  }

  if (dryRun && stats.previewRows && stats.previewRows.length > 0) {
    var previewSheetName = "theme_migration_preview_" + Date.now();
    var previewSheet = getSpreadsheet_().insertSheet(previewSheetName);

    var previewHeaders = [headers];
    var previewData = previewHeaders.concat(stats.previewRows);
    previewSheet.getRange(1, 1, previewData.length, previewData[0].length).setValues(previewData);
    stats.preview_sheet = previewSheetName;
    stats.preview_mode = "changed_rows_only";
    stats.preview_row_count = stats.previewRows.length;
  }

  stats.change_logs = changesToLog;

  if (stats.previewRows) {
    delete stats.previewRows;
  }

  stats.ok = true;
  stats.version = HSC_VERSION;
  stats.action = "adminNormalizeCardThemeFields";
  stats.dry_run = dryRun;
  stats.sheet = "card_db";
  return stats;
}

function adminAuditCardThemeFields(params) {
  if (!params) {
    return {
      ok: false,
      version: HSC_VERSION,
      action: "adminAuditCardThemeFields",
      error: "Missing params"
    };
  }

  requireAdminKey_(params);

  var sheet = getSheetByName_("card_db");
  if (!sheet) {
    return {
      ok: false,
      version: HSC_VERSION,
      action: "adminAuditCardThemeFields",
      error: "Sheet 'card_db' not found"
    };
  }


  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminAuditCardThemeFields",
      total: 0,
      invalid_rows: [],
      summary: {
        invalid_plan: 0,
        invalid_color: 0,
        invalid_style: 0,
        invalid_paper: 0
      }
    };
  }

  var headerIndex = {};
  var schemaHeaders = SCHEMA.card_db;
  for (var i = 0; i < schemaHeaders.length; i++) {
    headerIndex[schemaHeaders[i]] = i;
  }

  var invalidRows = [];
  var summary = {
    invalid_plan: 0,
    invalid_color: 0,
    invalid_style: 0,
    invalid_paper: 0
  };

  for (var r = 1; r < data.length; r++) {
    var row = {};
    for (var key in headerIndex) {
      var idx = headerIndex[key];
      if (idx !== undefined && idx < data[r].length) {
        row[key] = data[r][idx];
      } else {
        row[key] = "";
      }
    }

    var cardId = sanitizeText_(row.id);
    if (!cardId) continue;

    var issues = [];
    var plan = sanitizeText_(row.plan);
    var color = sanitizeText_(row.color);
    var style = sanitizeText_(row.style);
    var paper = sanitizeText_(row.paper);

    var normalizedPlan = normalizePlanValue_(plan);
    if (normalizedPlan !== plan) {
      issues.push({ field: "plan", value: plan, expected: normalizedPlan });
      summary.invalid_plan++;
    }

    if (normalizedPlan === "premium") {
      if (!isValidPremiumColor_(color)) {
        var expectedColor = normalizePremiumColor_(color);
        issues.push({ field: "color", value: color, expected: expectedColor });
        summary.invalid_color++;
      }
      if (style !== "") {
        issues.push({ field: "style", value: style, expected: "" });
        summary.invalid_style++;
      }
      if (paper !== "") {
        issues.push({ field: "paper", value: paper, expected: "" });
        summary.invalid_paper++;
      }
    } else {
      if (!isValidFreeColor_(color)) {
        var expectedFreeColor = normalizeFreeColor_(color);
        issues.push({ field: "color", value: color, expected: expectedFreeColor });
        summary.invalid_color++;
      }
      if (!isValidStyle_(style)) {
        var expectedStyle = normalizeStyleValue_(style);
        issues.push({ field: "style", value: style, expected: expectedStyle });
        summary.invalid_style++;
      }
      if (!isValidPaper_(paper)) {
        var expectedPaper = normalizePaperValue_(paper);
        issues.push({ field: "paper", value: paper, expected: expectedPaper });
        summary.invalid_paper++;
      }
    }

    if (issues.length > 0) {
      invalidRows.push({
        row_num: r + 1,
        card_id: cardId,
        issues: issues
      });
    }
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminAuditCardThemeFields",
    total: invalidRows.length,
    invalid_rows: invalidRows.slice(0, 100),
    summary: summary
  };
}

function ensureSchemaSheet_(schemaName) {
  if (!SCHEMA[schemaName]) throw new Error("Schema not defined: " + schemaName);
  var ss = getSpreadsheet_();
  var sheetName = CONFIG.SHEETS[schemaNameToConfigKey_(schemaName)] || schemaName;
  var sheet = ss.getSheetByName(sheetName);
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    created = true;
  }
  return { created: created, sheet: sheet, sheet_name: sheetName };
}

function checkSchemaHeaders_(schemaName) {
  var result = ensureSchemaSheet_(schemaName);
  var sheet = result.sheet;
  var expectedHeaders = SCHEMA[schemaName];
  if (!expectedHeaders || !expectedHeaders.length) {
    throw new Error("Schema headers missing: " + schemaName);
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = [];
  if (sheet.getLastRow() >= 1) {
    currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(function(v) { return String(v || "").trim(); });
  }

  var missing = [];
  var extra = [];
  var mismatch = false;

  expectedHeaders.forEach(function(h) {
    if (currentHeaders.indexOf(h) === -1) missing.push(h);
  });
  currentHeaders.forEach(function(h) {
    if (expectedHeaders.indexOf(h) === -1) extra.push(h);
  });
  if (currentHeaders.length !== expectedHeaders.length) mismatch = true;
  else {
    for (var i = 0; i < expectedHeaders.length; i++) {
      if (currentHeaders[i] !== expectedHeaders[i]) {
        mismatch = true;
        break;
      }
    }
  }

  return {
    schema: schemaName,
    sheet_name: result.sheet_name,
    created: result.created,
    header_mismatch: mismatch,
    missing_columns: missing,
    extra_columns: extra
  };
}

function repairSchemaHeaders_(schemaName) {
  var result = ensureSchemaSheet_(schemaName);
  var sheet = result.sheet;
  var expectedHeaders = SCHEMA[schemaName];
  if (!expectedHeaders || !expectedHeaders.length) {
    throw new Error("Schema headers missing: " + schemaName);
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = [];
  if (sheet.getLastRow() >= 1) {
    currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(function(v) { return String(v || "").trim(); });
  }

  var sameLength = currentHeaders.length === expectedHeaders.length;
  var sameHeaders = sameLength && expectedHeaders.every(function(h, i) {
    return String(currentHeaders[i] || "").trim() === String(h || "").trim();
  });

  if (!sameHeaders) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);

    var maxCols = sheet.getMaxColumns();
    if (maxCols > expectedHeaders.length) {
      sheet.deleteColumns(expectedHeaders.length + 1, maxCols - expectedHeaders.length);
    }

    return {
      schema: schemaName,
      created: result.created,
      changed: true,
      status: "rewritten",
      header_mismatch: false,
      sheet_name: result.sheet_name
    };
  }

  return {
    schema: schemaName,
    created: result.created,
    changed: false,
    status: "ok",
    header_mismatch: false,
    sheet_name: result.sheet_name
  };
}

function ensureSchemaHeaders_(schemaName) {
  return checkSchemaHeaders_(schemaName);
}

function ensureAllSchemasOrThrow_() {
  var names = Object.keys(SCHEMA);
  var results = [];

  for (var i = 0; i < names.length; i++) {
    var res = ensureSchemaHeaders_(names[i]);
    results.push(res);

    if (res.missing_columns.length > 0) {
      throw new Error("Missing required columns in " + names[i] + ": " + res.missing_columns.join(", "));
    }
  }

  return results;
}

function normalizeSchemaNameArg_(schemaName) {
  var raw = sanitizeText_(schemaName);
  if (!raw) return "";
  if (SCHEMA[raw]) return raw;

  var keys = Object.keys(CONFIG.SHEETS || {});
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (sanitizeText_(CONFIG.SHEETS[key]) === raw) {
      var lowerKey = String(key || "").toUpperCase();
      for (var schemaKey in SCHEMA) {
        if (schemaNameToConfigKey_(schemaKey) === lowerKey) return schemaKey;
      }
    }
  }
  return raw;
}

function ensureSchemasOrThrow_(schemaNames) {
  var names = Array.isArray(schemaNames) ? schemaNames : [schemaNames];
  var results = [];

  for (var i = 0; i < names.length; i++) {
    var schemaName = normalizeSchemaNameArg_(names[i]);
    if (!schemaName) continue;
    if (!SCHEMA[schemaName]) throw new Error("Schema not defined: " + schemaName);

    var res = ensureSchemaHeaders_(schemaName);
    results.push(res);

    if (res.missing_columns.length > 0) {
      throw new Error("Missing required columns in " + schemaName + ": " + res.missing_columns.join(", "));
    }
  }

  return results;
}

function installAddonModule_() {
  var sheetResult = ensureSchemaSheet_("add_on_order_db");
  var headerResult = ensureSchemaHeaders_("add_on_order_db");
  return {
    ok: !headerResult.header_mismatch,
    sheet_created: sheetResult.created,
    header_status: headerResult.status,
    header_mismatch: !!headerResult.header_mismatch,
    detail: headerResult
  };
}

function resolveAddonOrderDueAtForWrite_(req, baseDate) {
  req = req || {};
  var explicitDueAt = sanitizeText_(req.due_at || req.dueAt || req.expire_at || req.expireAt || req.payment_due_at || req.paymentDueAt);
  if (explicitDueAt) return explicitDueAt;
  var startAt = baseDate || new Date();
  return toIso_(addDays_(startAt, CONFIG.PAYMENT_DUE_DAYS));
}

function backfillAddonDueAtRows_(options) {
  options = options || {};
  ensureAllSchemasOrThrow_();
  var nowIso = nowIso_();
  var dryRun = toBoolean_(options.dry_run || options.dryRun);
  var touched = [];

  getSheetRowsByName_("add_on_order_db").forEach(function(order) {
    if (sanitizeText_(order.due_at)) return;
    var createdAt = toDateSafe_(order.created_at);
    if (!createdAt) return;

    var updated = shallowClone_(order);
    updated.due_at = toIso_(addDays_(createdAt,
 CONFIG.PAYMENT_DUE_DAYS));
    updated.updated_at = nowIso;

    if (!dryRun) {
      updateRowByName_("add_on_order_db", order.__rowNum, updated);
    }

    touched.push({
      addon_order_id: sanitizeText_(order.addon_order_id),
      card_id: sanitizeText_(order.card_id),
      due_at: updated.due_at,
      status: sanitizeText_(order.status)
    });
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminBackfillAddonDueAt",
    dry_run: dryRun,
    backfilled_count: touched.length,
    rows: touched.slice(0, 200)
  };
}

function adminBackfillAddonDueAt_(req) {
  req = req || {};
  return backfillAddonDueAtRows_(req);
}

function createAddonOrder_(req) {
  ensureAllSchemasOrThrow_();
  ensureItemDbSchema_();
  var installResult = installAddonModule_();
  if (installResult.header_mismatch) throw new Error("add_on_order_db header mismatch");

  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  var code = normalizeAddonItemCode_(req.item_code || req.itemCode || req.add_on_type || req.addOnType || req.addon_type || req.addonType || req.addon_key);
  if (!code) throw new Error("Missing add_on_type");
  var qty = Number(req.qty || req.quantity || 1);
  if (!isFinite(qty) || qty <= 0) qty = 1;
  var unitPrice = resolveAddOnPrice_(code, { tenant: tenant, price: req.price, unit_price: req.unit_price, unitPrice: req.unitPrice });
  var amountBefore = roundMoney_(unitPrice * qty);
  var payment = getOrderPaymentByCardId_(cardId);
  var now = new Date();
  var row = emptyRow_("add_on_order_db");
  var orderId = "AO" + Utilities.formatDate(now, CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);

  var targetType = resolveAddonTargetType_(code);
  var pointsRedeem = { applied: false, points_used: 0, amount_after: amountBefore, reason: "not_applied" };
  if (targetType !== "agent_upgrade_fee" || canUsePointsForPaymentType_("addon_payment")) {
    pointsRedeem = applyPointsRedemptionToAmount_({
      card: card,
      requested_points: req.points_to_apply || req.pointsApply || req.use_points || 0,
      amount_before: amountBefore,
      ref_id: orderId,
      type: "addon_redeem",
      note: "addon_points_redeem",
      operator: sanitizeText_(req.created_by || req.createdBy || "system")
    });
  }

  if (targetType === "agent_upgrade_fee")
 {
    var agentId = resolvePointsOwnerAgentIdForCard_(card);
    var agent = getAgentById_(agentId);
    if (!agent || sanitizeText_(agent.agent_type) !== "referral" || sanitizeText_(agent.eligible_for_upgrade) !== "TRUE") {
      throw new Error("Not eligible for partner upgrade");
    }
  }

  row.addon_order_id = orderId;
  row.card_id = cardId;
  row.created_at = toIso_(now);
  row.updated_at = toIso_(now);
  row.addon_type = normalizeAddonTypeLabel_(code);
  row.addon_key = code;
  row.item_code = code;
  row.item_name = getAddonItemNameByCode_(code);
  row.qty = String(qty);
  row.unit_price = String(unitPrice);
  row.amount = String(pointsRedeem.amount_after);
  row.status = "pending";
  row.due_at = resolveAddonOrderDueAtForWrite_(req, now);
  row.paid_at = "";
  row.cancelled_at = "";
  row.payment_id = payment ? sanitizeText_(payment.payment_id) : "";
  row.transaction_id = "";
  row.note = sanitizeText_(req.note);
  if (pointsRedeem.applied || pointsRedeem.reason) {
    row.note = mergeNote_(row.note, "points_redeem=" + JSON.stringify(pointsRedeem));
  }
  row.created_by = sanitizeText_(req.created_by || req.createdBy || "system");
  row.tenant = tenant;
  row.is_test = sanitizeText_(req.is_test || card.is_test) || "FALSE";
  row.bundle_parent_code = "";
  row.applied_at = "";
  row.applied_note = "";
  appendRowByName_("add_on_order_db", row);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "createAddOnOrder",
    add_on_order: row,
    addon_order: row,
    order: row,
    points_redeem: pointsRedeem,
    target_type: targetType
  };
}

function adminCancelAddonOrder_(req) {
  ensureAllSchemasOrThrow_();
  var installResult = installAddonModule_();
  if (installResult.header_mismatch) throw new Error("add_on_order_db header mismatch");
  var addonOrderId = sanitizeText_(req.addon_order_id || req.addonOrderId);
  if (!addonOrderId) throw new Error("Missing addon_order_id");
  var row = findRowByField_("add_on_order_db", "addon_order_id", addonOrderId);
  if (!row) throw new Error("Addon order not found");
  var status = sanitizeText_(row.status).toLowerCase();
  if (status === "paid") throw new Error("Paid addon order cannot be cancelled");
  if (status === "cancelled") return { ok: true, version: HSC_VERSION, action: "adminCancelAddonOrder", addon_order: row, unchanged: true };
  var updated = shallowClone_(row);
  updated.status = "cancelled";
  updated.cancelled_at = nowIso_();
  updated.updated_at = nowIso_();
  updated.note = mergeNote_(updated.note, sanitizeText_(req.note));
  updateRowByName_("add_on_order_db", row.__rowNum, updated);
  return { ok: true, version: HSC_VERSION, action: "adminCancelAddonOrder", addon_order: updated };
}

function adminCheckSchemaStatus_(req) {
  req = req || {};
  requireAdminKeyOrSystem_(req);

  var summary = {
    ok: true,
    version: HSC_VERSION,
    action: "adminCheckSchemaStatus",
    schemas: [],
    error: "",
    internal_call: canBypassAdminProtection_(req)
  };
  var names = Object.keys(SCHEMA);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    try {
      var res = checkSchemaHeaders_(name);
      summary.schemas.push(res);
      if (res.header_mismatch || res.missing_columns.length > 0 || res.extra_columns.length > 0) summary.ok = false;
    } catch (err) {
      summary.ok = false;
      var msg = name + ": " + (err && err.message ? err.message : String(err));
      summary.schemas.push({ schema: name, status: "error", error: msg });
      summary.error = summary.error ? (summary.error + " | " + msg) : msg;
    }
  }
  return summary;
}

function repairAddonOrderStatuses_() {
  ensureAllSchemasOrThrow_();
  var rows = getSheetRowsByName_("add_on_order_db");
  var repaired = 0;
  var now = nowIso_();
  rows.forEach(function(row) {
    var status = sanitizeText_(row.status).toLowerCase();
    var target = status;
    if (ADDON_ORDER_ALLOWED_STATUSES.indexOf(target) === -1) {
      if (sanitizeText_(row.paid_at)) target = "paid";
      else if (sanitizeText_(row.cancelled_at)) target = "cancelled";
      else target = "pending";
    }
    if (target !== status || !sanitizeText_(row.updated_at)) {
      var updated = shallowClone_(row);
      updated.status = target;
      updated.updated_at = now;
      updateRowByName_("add_on_order_db", row.__rowNum, updated);
      repaired++;
    }
  });
  return { ok: true, version: HSC_VERSION, action: "repairAddonOrderStatuses", repaired: repaired, updated_at: now };
}

// ============================================================
// 路由與主函式
// ============================================================

function doGet(e) {
  Logger.log("RAW GET e = " + JSON.stringify(e || {}));
  Logger.log("RAW GET e.parameter = " + JSON.stringify((e && e.parameter) ? e.parameter : {}));
  return routeAction_(e || {}, "GET");
}

function doPost(e) {
  Logger.log("RAW e = " + JSON.stringify(e || {}));
  Logger.log("RAW e.parameter = " + JSON.stringify((e && e.parameter) ? e.parameter : {}));
  Logger.log("RAW e.postData = " + JSON.stringify((e && e.postData) ? e.postData : {}));
  return routeAction_(e || {}, "POST");
}

function normalizeRequest_(e, method) {
  var params = (e && e.parameter) ? e.parameter : {};
  var req = {};
  var payloadText = "";
  var payloadObj = {};

  payloadText = params.payload || "";
  if (payloadText) {
    payloadObj = parseJsonSafe_(payloadText, {});
    if (payloadObj && typeof payloadObj === "object") {
      Object.keys(payloadObj).forEach(function(key) {
        req[key] = payloadObj[key];
      });
    }
  }

  Object.keys(params).forEach(function(key) {
    if (key === "payload") return;
    if (req[key] === undefined || req[key] === null || req[key] === "") {
      req[key] = params[key];
    }
  });

  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    if (raw) {
      if (raw.charAt(0) === "{") {
        var rawObj = parseJsonSafe_(raw, {});
        if (rawObj && typeof rawObj === "object") {
          Object.keys(rawObj).forEach(function(key) {
            if (req[key] === undefined || req[key] === null || req[key] === "") {
              req[key] = rawObj[key];
            }
          });
        }
      } else if (raw.indexOf("payload=") > -1 && (!req.action || String(req.action).trim() === "")) {
        var decoded = decodeURIComponent(String(raw).replace(/\+/g, "%20"));
        var m = decoded.match(/(?:^|&)payload=(\{.*\})(?:&|$)/);
        if (m && m[1]) {
          var rawPayloadObj = parseJsonSafe_(m[1], {});
          if (rawPayloadObj && typeof rawPayloadObj === "object") {
            Object.keys(rawPayloadObj).forEach(function(key) {
              if (req[key] === undefined || req[key] === null || req[key] === "") {
                req[key] = rawPayloadObj[key];
              }
            });
          }
        }
      }
    }
  } catch (err) {
    Logger.log("normalizeRequest_ postData parse failed: " + err);
  }

  req.action = String(req.action || "").trim();
  req.card_id = String(req.card_id || "").trim();
  req.payment_id = String(req.payment_id || "").trim();
  req.invite_code = String(req.invite_code || "").trim();
  req.ref = String(req.ref || "").trim();
  req.plan = String(req.plan || "").trim();

  if (!req.action && payloadObj && typeof payloadObj === "object" && payloadObj.action)
 {
    req.action = String(payloadObj.action || "").trim();
  }

  if (typeof req.features_json === "string") {
    var featuresText = String(req.features_json || "").trim();
    if (featuresText) {
      var parsedFeatures = parseJsonSafe_(featuresText, null);
      if (parsedFeatures === null) {
        req.__invalid_features_json = true;
        req.__invalid_features_json_raw = featuresText;
        req.features_json = "{}";
      } else {
        req.features_json = featuresText;
      }
    } else {
      req.features_json = "{}";
    }
  }

  if (typeof req.addon_items === "string") {
    var addonItemsText = String(req.addon_items || "").trim();
    if (addonItemsText) {
      var parsedAddonItems = parseJsonSafe_(addonItemsText, null);
      if (parsedAddonItems === null) {
        req.__invalid_addon_items = true;
        req.__invalid_addon_items_raw = addonItemsText;
        req.addon_items = [];
      } else {
        req.addon_items = parsedAddonItems;
      }
    } else {
      req.addon_items = [];
    }
  }

  Logger.log("normalizeRequest_ req = " + JSON.stringify(req));
  return req;
}
function isAdminProtectedAction_(action) {
  return ADMIN_PROTECTED_ACTIONS.indexOf(sanitizeText_(action)) !== -1;
}

function requireAdminKey_(req) {
  var incoming = sanitizeText_(req.admin_key || req.adminKey);

  if (!incoming) {
    throw new Error("Missing admin_key");
  }

  var expected = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");

  if (!expected) {
    throw new Error("ADMIN_KEY not configured");
  }

  if (incoming !== sanitizeText_(expected)) {
    throw new Error("Unauthorized");
  }

  return true;
}

function canBypassAdminProtection_(req) {
  req = req || {};
  return toBoolean_(req.__system_call) === true;
}

function requireAdminKeyOrSystem_(req) {
  if (canBypassAdminProtection_(req)) return true;
  return requireAdminKey_(req || {});
}

function ping_(req) {
  return {
    ok: true,
    version: HSC_VERSION,
    action: "ping",
    now: nowIso_(),
    timezone: CONFIG.DEFAULT_TIMEZONE,
    spreadsheet_id: CONFIG.SPREADSHEET_ID,
    sheets: CONFIG.SHEETS
  };
}

function getPlanOptions_(req) {
  var tenant = getTenant_(req);
  var rows = getSheetRowsByName_("plan_db");
  var plans = rows
    .filter(function(row) {
      return isActiveStatus_(row.status) && sameTenant_(row.tenant, tenant);
    })
    .sort(function(a, b) {
      return toNumber_(a.sort_order) - toNumber_(b.sort_order);

    })
    .map(function(row) {
      return {
        plan_id: row.plan_id,
        plan_name: row.plan_name,
        status: row.status,
        sort_order: toNumber_(row.sort_order),
        price: toNumber_(row.price),
        renewal_price: toNumber_(row.renewal_price),
        description: row.description,
        cta_limit: toNumber_(row.cta_limit),
        photo_limit_default: toNumber_(row.photo_limit_default),
        photo_limit_max: toNumber_(row.photo_limit_max),
        extra_photo_purchase_enabled: toBoolean_(row.extra_photo_purchase_enabled),
        color_options: splitCsv_(row.color_options),
        style_options: splitCsv_(row.style_options),
        paper_options: splitCsv_(row.paper_options),
        is_premium_style: toBoolean_(row.is_premium_style),
        hide_style: toBoolean_(row.hide_style),
        hide_paper: toBoolean_(row.hide_paper),
        update_limit_enabled: toBoolean_(row.update_limit_enabled),
        free_update_limit_yearly: toNumber_(row.free_update_limit_yearly),
        extra_update_fee: toNumber_(row.extra_update_fee),
        extra_update_fee_enabled: toBoolean_(row.extra_update_fee_enabled),
        note: row.note || ""
      };
    });
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPlanOptions",
    tenant: tenant,
    plans: plans
  };
}

function adminSavePlan_(req) {
  var now = new Date();
  var planId = sanitizeText_(req.plan_id || req.planId);
  if (!planId) throw new Error("Missing plan_id");
  var planRow = findRowByField_("plan_db", "plan_id", planId);
  if (!planRow) throw new Error("Plan not found: " + planId);
  if (req.tenant !== undefined) {
    var incomingTenant = sanitizeText_(req.tenant);
    var originalTenant = sanitizeText_(planRow.tenant) || CONFIG.DEFAULT_TENANT;
    if (incomingTenant && incomingTenant !== originalTenant) {
      throw new Error("tenant mismatch: cannot change plan tenant");
    }
  }
  var PLAN_UPDATABLE_FIELDS = [
    "plan_name","status","sort_order","price","renewal_price","description","cta_limit",
    "photo_limit_default","photo_limit_max","extra_photo_purchase_enabled",
    "color_options","style_options","paper_options",
    "is_premium_style","hide_style","hide_paper",
    "update_limit_enabled","free_update_limit_yearly",
    "extra_update_fee","extra_update_fee_enabled","note"
  ];
  var updated = shallowClone_(planRow);
  PLAN_UPDATABLE_FIELDS.forEach(function(field) {
    if (req[field] !== undefined) {
      updated[field] = sanitizeText_(req[field]);
    }
  });
  validatePlanRowForSave_(updated);
  updated.plan_id = planRow.plan_id;
  updated.tenant = sanitizeText_(planRow.tenant) || CONFIG.DEFAULT_TENANT;
  updated.created_at = sanitizeText_(planRow.created_at);
  updated.updated_at = toIso_(now);
  updateRowByName_("plan_db", planRow.__rowNum, updated);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminSavePlan",
    plan: updated
  };
}

function shouldValidateCardPlanOnAdminOverride_(req) {
  var planRelatedFields = [
    "plan", "color", "style", "paper",
    "photo_limit",
    "cta_text_1", "cta_link_1",
    "cta_text_2", "cta_link_2",
    "cta_text_3", "cta_link_3"
  ];
  
  for (var i = 0; i < planRelatedFields.length; i++) {
    if (req[planRelatedFields[i]] !== undefined) {
      return true;
    }
  }
  return false;
}

function adminSaveCardOverrides_(req) {
  var now = new Date();
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");
  var cardRow = findRowByField_("card_db", "id", cardId);
  if (!cardRow) throw new Error("Card not found: " + cardId);
  
  var CARD_OVERRIDE_FIELDS = [
    "owner_email",
    "owner_phone",
    "owner_agent_id",
    "owner_agent_type",
    "process_status",
    "confirm_note"
  ];
  var updated = shallowClone_(cardRow);
  CARD_OVERRIDE_FIELDS.forEach(function(field) {
    if (req[field] !== undefined) {
      updated[field] = (field === "owner_phone")
        ? sanitizePhoneAsText_(req[field])
        : sanitizeText_(req[field]);
    }
  });
  if (req.update_limit_override_enabled !== undefined) {
    updated.update_limit_override_enabled = toBooleanString_(req.update_limit_override_enabled);
  }
  if (req.update_fee_override_enabled !== undefined) {
    updated.update_fee_override_enabled = toBooleanString_(req.update_fee_override_enabled);
  }
  if (req.notify_line_enabled !== undefined) {
    updated.notify_line_enabled = toBooleanString_(req.notify_line_enabled);
  }
  if (req.email_enabled !== undefined) {
    updated.email_enabled = toBooleanString_(req.email_enabled);
  }
  if (req.photo_limit !== undefined && req.photo_limit !== null && String(req.photo_limit).trim() !== "") {
    var newLimit = parseOptionalNonNegativeInt_(req.photo_limit, "photo_limit", PHOTO_LIMIT_ABSOLUTE_MAX, false);
    updated.photo_limit = String(newLimit);
  }
  if (req.update_limit_override_value !== undefined) {
    updated.update_limit_override_value = parseUpdateLimitOverrideValue_(req.update_limit_override_value);
  }
  if (req.update_fee_override !== undefined) {
    var parsedFee = parseOptionalNonNegativeInt_(
      req.update_fee_override,
      "update_fee_override",
      9999999,
      true
    );
    updated.update_fee_override = parsedFee === null ? "" : String(parsedFee);
  }
  
  if (req.plan !== undefined) updated.plan = sanitizeText_(req.plan);
  if (req.color !== undefined) updated.color = sanitizeText_(req.color);
  if (req.style !== undefined) updated.style = sanitizeText_(req.style);
  if (req.paper !== undefined) updated.paper = sanitizeText_(req.paper);
  
  if (req.cta_text_1 !== undefined) updated.cta_text_1 = sanitizeText_(req.cta_text_1);
  if (req.cta_link_1 !== undefined) updated.cta_link_1 = sanitizeText_(req.cta_link_1);
  if (req.cta_text_2 !== undefined) updated.cta_text_2 = sanitizeText_(req.cta_text_2);
  if (req.cta_link_2 !== undefined) updated.cta_link_2 = sanitizeText_(req.cta_link_2);
  if (req.cta_text_3 !== undefined) updated.cta_text_3 = sanitizeText_(req.cta_text_3);
  if (req.cta_link_3 !== undefined) updated.cta_link_3 = sanitizeText_(req.cta_link_3);
  
  updated.id = cardRow.id;
  updated.updated_at = toIso_(now);

  var themeChanged = (req.plan !== undefined || req.color !== undefined || req.style !== undefined || req.paper !== undefined);
  if (themeChanged) {
    var normalized = normalizeCardThemeFields_(updated);
    updated = normalized.updatedRow;
  }

  var needPlanValidation = shouldValidateCardPlanOnAdminOverride_(req);
  
  var targetPlan = null;
  if (needPlanValidation) {
    targetPlan = ensurePlanExists_(updated.plan, updated.tenant || CONFIG.DEFAULT_TENANT);
    validateCardAgainstPlan_(updated, targetPlan);
  }

  updateRowByName_("card_db", cardRow.__rowNum, updated);
  invalidateCardPublicCache_(updated.id || updated.card_id);
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminSaveCardOverrides",
    plan_validation_applied: needPlanValidation,
    card: updated
  };
}

function adminGetCardSettings_(req) {
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found: " + cardId);
  var plan = card.plan ? findRowByField_("plan_db", "plan_id", sanitizeText_(card.plan)) : null;
  var eligibility = evaluateUpdateEligibilityForCard_(card);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminGetCardSettings",
    card_id: cardId,
    photo_limit: toNumber_(card.photo_limit),
    photo_limit_absolute_max: PHOTO_LIMIT_ABSOLUTE_MAX,
    plan_photo_limit_max: plan ? toNumber_(plan.photo_limit_max) : null,
    is_custom_photo_limit: plan ? toNumber_(card.photo_limit) > toNumber_(plan.photo_limit_max) : false,
    update_limit_override_enabled: sanitizeText_(card.update_limit_override_enabled),
    update_limit_override_value: sanitizeText_(card.update_limit_override_value),
    update_fee_override: sanitizeText_(card.update_fee_override),
    update_fee_override_enabled: sanitizeText_(card.update_fee_override_enabled),
    owner_email: sanitizeText_(card.owner_email),
    owner_phone: sanitizePhoneAsText_(card.owner_phone),
    owner_agent_id: sanitizeText_(card.owner_agent_id),
    owner_agent_type: sanitizeText_(card.owner_agent_type),
    notify_line_enabled: sanitizeText_(card.notify_line_enabled),
    email_enabled: sanitizeText_(card.email_enabled),
    process_status: sanitizeText_(card.process_status),
    confirm_note: sanitizeText_(card.confirm_note),
    update_eligibility: eligibility,
    card: card
  };
}

function adminBuildSpecialFormUrl_(req) {
  var inviteCode = sanitizeText_(req.invite_code || req.inviteCode);
  if (!inviteCode) throw new Error("Missing invite_code");
  var invite = findInviteByCode_(inviteCode);
  if (!invite) throw new Error("Invite code not found");
  var mode = sanitizeText_(req.mode);
  var photoLimit = req.photo_limit !== undefined ? toNumber_(req.photo_limit) : null;
  if (photoLimit !== null) {
    if (photoLimit < 0) throw new Error("photo_limit cannot be negative");
    if (photoLimit > PHOTO_LIMIT_ABSOLUTE_MAX) {
      throw new Error("photo_limit cannot exceed " + PHOTO_LIMIT_ABSOLUTE_MAX);
    }
  }
  var formUrl = buildSpecialFormUrl_(inviteCode, mode, photoLimit);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminBuildSpecialFormUrl",
    invite_code: inviteCode,
    mode: mode || "",
    photo_limit: photoLimit,
    form_url: formUrl
  };
}

function buildSpecialFormUrl_(inviteCode, mode, photoLimit) {
  var url = CONFIG.BASE_URL + "form.html?invite=" + encodeURIComponent(sanitizeText_(inviteCode));
  if (mode) url += "&mode=" + encodeURIComponent(sanitizeText_(mode));
  if (photoLimit !== null && photoLimit !== undefined && !isNaN(photoLimit)) {
    url += "&photo_limit=" + encodeURIComponent(String(photoLimit));
  }

  return url;
}

// ============================================================
// 邀請碼相關
// ============================================================


function createInviteCodeOptimized_(params) {
  const tenant = params.tenant;
  const plan = params.plan;
  const referrer = params.referrer;
  const serviceAgent = params.service_agent;
  const agentType = params.agent_type;
  const source = params.source || "invite";
  const maxUse = params.max_use || 1;
  const note = params.note;
  const createdBy = params.created_by || "system";
  const status = params.status || "active";
  const isTest = params.is_test || "FALSE";
  const expireDays = params.expire_days || CONFIG.INVITE_DEFAULT_EXPIRE_DAYS;
  
  const inviteCode = params.invite_code || generateUniqueInviteCodeOptimized_();
  
  const now = new Date();
  const expiresAt = addDays_(now, expireDays);
  
  const inviteSheet = getSheetByName_("invite_db");
  const inviteHeaders = SCHEMA.invite_db;
  
  const inviteRowValues = inviteHeaders.map(header => {
    switch(header) {
      case "invite_code": return inviteCode;
      case "created_at": return toIso_(now);
      case "expired_at": return "";
      case "status": return status;
      case "referrer": return referrer;
      case "service_agent": return serviceAgent;
      case "agent_type": return normalizeAgentType_(agentType);
      case "used_count": return "0";
      case "max_use": return String(maxUse);
      case "note": return note;
      case "tenant": return tenant;
      case "plan": return plan || "";
      case "source": return source;
      case "expire_at": return toIso_(expiresAt);
      case "used_at": return "";
      case "used_by_id": return "";
      case "disabled_at": return "";
      case "last_editor": return createdBy;
      case "process_status": return "ready";
      case "is_test": return isTest;
      default: return "";
    }
  });
  
  inviteSheet.appendRow(inviteRowValues);
  
  const inviteRow = {};
  inviteHeaders.forEach((header, idx) => {
    inviteRow[header] = inviteRowValues[idx];
  });
  inviteRow.__rowNum = inviteSheet.getLastRow();
  
  if (referrer) ensureAgentExistsOptimized_(referrer, { source: "invite", role: "referrer", tenant: tenant, note: "auto_created_from_invite" });
  if (serviceAgent) ensureAgentExistsOptimized_(serviceAgent, { source: "invite", role: "service_agent", tenant: tenant, note: "auto_created_from_invite" });
  
  clearSheetRowCache_("invite_db");
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "createInviteCode",
    invite: inviteRow,
    form_url: buildFormUrl_(inviteCode)
  };
}

/**
 * 高效產生唯一 invite_code
 */
function generateUniqueInviteCodeOptimized_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(3000);
  
  try {
    const props = PropertiesService.getScriptProperties();
    const key = "HSC_INVITE_SEQ";
    let seq = Number(props.getProperty(key) || 0);
    seq++;
    props.setProperty(key, String(seq));
    
    const timestamp = Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyMMddHHmmss");
    const randomPart = Math.floor(Math.random() * 900 + 100);
    return `IC${timestamp}${seq}${randomPart}`.slice(0, 20);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 優化版 ensureAgentExists - 減少重複查詢
 */
function ensureAgentExistsOptimized_(agentId, context) {
  const id = sanitizeText_(agentId);
  if (!id) return null;
  
  const cacheKey = `agent_exists_${id}`;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached === "exists") return { agent_id: id, from_cache: true };
  
  const agentSheet = getSheetByName_("agent_db");
  const agentHeaders = SCHEMA.agent_db;
  const lastRow = agentSheet.getLastRow();
  if (lastRow >= 2) {
    const agentIds = agentSheet.getRange(2, agentHeaders.indexOf("agent_id") + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < agentIds.length; i++) {
      if (sanitizeText_(agentIds[i][0]) === id) {
        cache.put(cacheKey, "exists", 300);
        return { agent_id: id, from_cache: true };
      }
    }
  }
  
  const now = new Date();
  const nowIso = toIso_(now);
  const tenant = sanitizeText_(context && context.tenant) || CONFIG.DEFAULT_TENANT;
  const source = sanitizeText_(context && context.source) || "auto_ensure";
  
  const agentRowValues = agentHeaders.map(header => {
    switch(header) {
      case "agent_id": return id;
      case "created_at": return nowIso;
      case "updated_at": return nowIso;
      case "status": return "active";
      case "agent_type": return AGENT_ROLE_DEFAULT;
      case "tenant": return tenant;
      case "agent_source": return source;
      case "member_tier": return "bronze";
      case "self_renewal_ok": return "TRUE";
      default: return "";
    }
  });
  
  agentSheet.appendRow(agentRowValues);
  cache.put(cacheKey, "exists", 300);
  clearSheetRowCache_("agent_db");
  
  return { agent_id: id, created: true };
}
function getInviteFormUrl_(req) {
  var inviteCode = sanitizeText_(req.invite_code || req.inviteCode);
  var row = findInviteByCode_(inviteCode);
  if (!row) throw new Error("Invite code not found");
  var validity = evaluateInviteValidity_(row);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getInviteFormUrl",
    invite_code: inviteCode,
    valid: validity.valid,
    reason: validity.reason,
    form_url: buildFormUrl_(inviteCode),
    invite: row
  };
}

function getRequestTrace_(req) {
  ensureSchemasOrThrow_(["request_db", "invite_db", "lead_db", "card_db"]);
  req = req || {};
  var requestId = sanitizeText_(req.request_id || req.requestId || req.id);
  if (!requestId) throw new Error("Missing request_id");

  var request = findRowByField_("request_db", "request_id", requestId);
  if (!request) throw new Error("Request not found");

  var inviteCode = sanitizeText_(request.assigned_invite_code);
  var invite = inviteCode ? findRowByField_("invite_db", "invite_code", inviteCode) : null;

  var lead = null;
  if (inviteCode) {
    lead = getSheetRowsByName_("lead_db").find(function(row) {
      return sanitizeText_(row.invite_code) === inviteCode;
    }) || null;
  }

  var card = null;
  if (lead && sanitizeText_(lead.converted_card_id)) {
    card = findRowByField_("card_db", "id", sanitizeText_(lead.converted_card_id));
  }
  if (!card && inviteCode) {
    card = getSheetRowsByName_("card_db").find(function(row) {
      return sanitizeText_(row.invite_code) === inviteCode;
    }) || null;
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getRequestTrace",
    request_id: requestId,
    request: request,
    invite: invite,
    lead: lead,
    card: card
  };
}

function createRequest_(req) {
  var tenant = getTenant_(req);
  var now = new Date();
  var requestId = sanitizeText_(req.request_id || req.requestId) || generateRequestId_();
  ensureUniqueValue_("request_db", "request_id", requestId);
  var row = emptyRow_("request_db");
  row.request_id = requestId;
  row.created_at = toIso_(now);
  row.ref = sanitizeText_(req.ref);
  row.status = "pending";
  row.assigned_invite_code = "";
  row.assigned_by = "";
  row.note = sanitizeText_(req.note);
  row.tenant = tenant;
  appendRowByName_("request_db", row);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "createRequest",
    request_id: requestId,
    request: row
  };
}

function getRequests_(req)
 {
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status);
  var ref = sanitizeText_(req.ref);
  var rows = getSheetRowsByName_("request_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status) === status; });
  if (ref) rows = rows.filter(function(row) { return sanitizeText_(row.ref) === ref; });
  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });
  return { ok: true, version: HSC_VERSION, action: "getRequests", requests: rows };
}
/**
 * 優化版 assignInviteToRequest_
 * 目標：縮短派發邀請碼 API 回應時間
 */

// ============================================================
// Lead 相關
// ============================================================

function getPlanExpireDays(plan) {
  var planValue = sanitizeText_(plan).toLowerCase();
  if (planValue === "premium") return 365;
  if (planValue === "free") return 365;
  return 365;
}

function unlockCardIfNeeded(card, paidAtText, expiresAtText) {
  if (!card) return null;
  var updated = shallowClone_(card);
  var changed = false;
  var nowText = nowIso_();

  if (sanitizeText_(updated.status) !== "active") {
    updated.status = "active";
    changed = true;
  }
  if (sanitizeText_(updated.billing_status) !== "paid") {
    updated.billing_status = "paid";
    changed = true;
  }
  if (sanitizeText_(updated.payment_paid_at) !== sanitizeText_(paidAtText)) {
    updated.payment_paid_at = sanitizeText_(paidAtText);
    changed = true;
  }
  if (sanitizeText_(expiresAtText) && sanitizeText_(updated.expires_at) !== sanitizeText_(expiresAtText)) {
    updated.expires_at = sanitizeText_(expiresAtText);
    changed = true;
  }
  if (sanitizeText_(updated.payment_due_at)) {
    updated.payment_due_at = "";
    changed = true;
  }
  if (sanitizeText_(updated.inactivated_at)) {
    updated.inactivated_at = "";
    changed = true;
  }
  if (sanitizeText_(updated.expired_at)) {
    updated.expired_at = "";
    changed = true;
  }
  if (sanitizeText_(updated.remind_at)) {
    updated.remind_at = "";
    changed = true;
  }
  if (sanitizeText_(updated.reminded_at)) {
    updated.reminded_at = "";
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(updated, "lock_reason") && sanitizeText_(updated.lock_reason)) {
    updated.lock_reason = "";
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(updated, "payment_lock_at") && sanitizeText_(updated.payment_lock_at)) {
    updated.payment_lock_at = "";
    changed = true;
  }
  if (!sanitizeText_(updated.activated_at)) {
    updated.activated_at = sanitizeText_(paidAtText) || nowText;
    changed = true;
  }
  if (changed) {
    updated.updated_at = nowText;
  }
  return updated;
}

// ============================================================
// 卡片相關
// ============================================================

function markCardDelivered_(req) {
  ensureAllSchemasOrThrow_();

  var now = new Date();
  var nowText = toIso_(now);
  var card = requireCardByIdOrToken_(req);
  var deliveredAt = sanitizeText_(card.delivered_at);
  var dueAtText = toIso_(addDays_(now, CONFIG.PAYMENT_DUE_DAYS));

  if (deliveredAt) {
    var patchedCard = shallowClone_(card);
    var changed = false;

    if (!sanitizeText_(patchedCard.payment_due_at)) {
      patchedCard.payment_due_at = dueAtText;
      changed = true;
    }
    if (!sanitizeText_(patchedCard.updated_at) || changed) {
      patchedCard.updated_at = nowText;
    }
    if (changed) {
      updateRowByName_("card_db", card.__rowNum, patchedCard);
      invalidateCardPublicCache_(patchedCard.id || patchedCard.card_id);
    }

    var pendingPayments1 = getSheetRowsByName_("payment_db").filter(function(row) {
      return sanitizeText_(row.card_id) === sanitizeText_(card.id) &&
             sanitizeText_(row.status) === "pending";
    });

    var patchedPayments = [];
    pendingPayments1.forEach(function(payment) {
      if (!sanitizeText_(payment.due_at)) {
        var updatedPayment1 = shallowClone_(payment);
        updatedPayment1.due_at = sanitizeText_(patchedCard.payment_due_at) || dueAtText;
        updatedPayment1.updated_at = nowText;
        updateRowByName_("payment_db", payment.__rowNum, updatedPayment1);
        patchedPayments.push(updatedPayment1.payment_id);
      }
    });

    return {
      ok: true,
      version: HSC_VERSION,
      action: "markCardDelivered",
      repaired: changed,
      card_id: sanitizeText_(patchedCard.id || patchedCard.card_id),
      delivered_at: sanitizeText_(patchedCard.delivered_at || deliveredAt),
      payment_due_at: sanitizeText_(patchedCard.payment_due_at),
      patched_payments: patchedPayments
    };
  }

  var updatedCard = shallowClone_(card);
  updatedCard.delivered_at = nowText;
  updatedCard.payment_due_at = dueAtText;
  updatedCard.updated_at = nowText;
  updateRowByName_("card_db", card.__rowNum, updatedCard);
  invalidateCardPublicCache_(updatedCard.id || updatedCard.card_id);

  var pendingPayments = getSheetRowsByName_("payment_db").filter(function(row) {
    return sanitizeText_(row.card_id) === sanitizeText_(card.id) &&
           sanitizeText_(row.status) === "pending";
  });

  var updatedPaymentIds = [];
  pendingPayments.forEach(function(payment) {
    if (!sanitizeText_(payment.due_at)) {
      var updatedPayment = shallowClone_(payment);
      updatedPayment.due_at = dueAtText;
      updatedPayment.updated_at = nowText;
      updateRowByName_("payment_db", payment.__rowNum, updatedPayment);
      updatedPaymentIds.push(updatedPayment.payment_id);
    }
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "markCardDelivered",
    repaired: false,
    card_id: sanitizeText_(updatedCard.id || updatedCard.card_id),
    delivered_at: sanitizeText_(updatedCard.delivered_at),
    payment_due_at: sanitizeText_(updatedCard.payment_due_at),
    updated_payments: updatedPaymentIds
  };
}

function getCard_(req) {
  req = req || {};
  var targetCardId = getTargetCardId_(req);
  var token = sanitizeText_(req.token);
  var card = null;

  if (targetCardId) {
    var rows = getSheetRowsByName_("card_db");
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      if (getRowCardId_(row) === targetCardId) {
        card = row;
        break;
      }
    }
  }
  if (!card && token) card = findRowByField_("card_db", "token", token);
  if (!card) throw new Error("Card not found");

  var cardStatus = sanitizeText_(card.status).toLowerCase();
  if (cardStatus && ["inactive", "draft", "deleted"].indexOf(cardStatus) !== -1) {
    throw new Error("Card unavailable");
  }

  var normalizedTheme = normalizeCardThemeFieldsForDisplay_(card);
  var displayCard = shallowClone_(card);
  displayCard.id = sanitizeText_(displayCard.id) || getRowCardId_(displayCard);
  displayCard.card_id = getRowCardId_(displayCard);
  displayCard.plan = normalizedTheme.plan;
  displayCard.color = normalizedTheme.color;
  displayCard.style = normalizedTheme.style;
  displayCard.paper = normalizedTheme.paper;
  displayCard.photo_limit = String(getEffectivePhotoLimit_(displayCard));
  displayCard.cta_limit = String(getEffectiveCtaLimit_(displayCard));
  displayCard.marquee_purchased = toBooleanString_(displayCard.marquee_purchased);
  displayCard.marquee_enabled = toBooleanString_(displayCard.marquee_enabled);
  displayCard.marquee_text = sanitizeText_(displayCard.marquee_text);
  displayCard.phone = sanitizePhoneAsText_(displayCard.phone);
  displayCard.owner_phone = sanitizePhoneAsText_(displayCard.owner_phone);
  if (displayCard.agent_type !== undefined) {
    displayCard.agent_type = normalizeAgentTypeForDisplay_(displayCard.agent_type);
  }
  if (displayCard.owner_agent_type !== undefined) {
    displayCard.owner_agent_type = normalizeAgentTypeForDisplay_(displayCard.owner_agent_type);
  }

  var deliveryGuidance = buildDeliveryCardGuidance_(displayCard);
  var trackingContext = buildTrackingContextForCard_(displayCard, req);
  displayCard = applyTrackedCtaLinksToCard_(displayCard, trackingContext);
  var trackingResult = tryTrackCardView_(displayCard, req, trackingContext);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCard",
    card_id: getRowCardId_(displayCard),
    card: displayCard,
    delivery_guidance: deliveryGuidance,
    tracking_context: trackingContext,
    tracking: trackingResult
  };
}


function normalizePublicCardPayload_(card) {
  if (!card) return null;

  var photos = [];
  for (var i = 1; i <= 10; i++) {
    var photoUrl = sanitizeText_(card["photo" + i + "_url"]);
    if (photoUrl) photos.push(photoUrl);
  }

  var ctas = [];
  for (var j = 1; j <= 3; j++) {
    var ctaText = sanitizeText_(card["cta_text_" + j]);
    var ctaLink = sanitizeText_(card["cta_link_" + j]);
    if (ctaText || ctaLink) {
      ctas.push({ text: ctaText, link: ctaLink });
    }
  }

  return {
    card_id: getRowCardId_(card),
    token: sanitizeText_(card.token),
    status: sanitizeText_(card.status),
    tenant: sanitizeText_(card.tenant),
    billing_status: sanitizeText_(card.billing_status),
    created_at: sanitizeText_(card.created_at),
    updated_at: sanitizeText_(card.updated_at),
    activated_at: sanitizeText_(card.activated_at),
    expires_at: sanitizeText_(card.expires_at),

    plan: sanitizeText_(card.plan),
    color: sanitizeText_(card.color),
    style: sanitizeText_(card.style),
    paper: sanitizeText_(card.paper),

    name: sanitizeText_(card.name),
    unit: sanitizeText_(card.unit),
    title: sanitizeText_(card.title),
    slogan: sanitizeText_(card.slogan),
    services: sanitizeText_(card.services),
    experience: sanitizeText_(card.experience),

    wechat_id: sanitizeText_(card.wechat_id),
    line_url: sanitizeText_(card.line_url),
    line_oa: sanitizeText_(card.line_oa),
    email: sanitizeText_(card.email),
    phone: sanitizePhoneAsText_(card.phone),
    address: sanitizeText_(card.address),
    website: sanitizeText_(card.website),

    video1: sanitizeText_(card.video1),
    video2: sanitizeText_(card.video2),
    video3: sanitizeText_(card.video3),
    social1: sanitizeText_(card.social1),
    social2: sanitizeText_(card.social2),
    social3: sanitizeText_(card.social3),

    avatar_url: sanitizeText_(card.avatar_url),
    logo_url: sanitizeText_(card.logo_url),
    photo_limit: sanitizeText_(card.photo_limit),
    photos: photos,

    ctas: ctas,

    marquee_purchased: toBooleanString_(card.marquee_purchased),
    marquee_enabled: toBooleanString_(card.marquee_enabled),
    marquee_text: sanitizeText_(card.marquee_text),

    cta_limit: sanitizeText_(card.cta_limit),
    form_source: sanitizeText_(card.form_source),
    process_status: sanitizeText_(card.process_status)
  };
}

function getCardPublicLite_(req) {
  req = req || {};
  var targetCardId = getTargetCardId_(req);
  if (!targetCardId) throw new Error("Missing card_id");

  var cached = getPublicCardCache_(targetCardId);
  if (cached) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "getCardPublicLite",
      card_id: targetCardId,
      cached: true,
      card: cached
    };
  }

  var rows = getSheetRowsByName_("card_db");
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || {};
    if (getRowCardId_(row) === targetCardId) {
      found = row;
      break;
    }
  }

  if (!found) throw new Error("Card not found");

  var cardStatus = sanitizeText_(found.status).toLowerCase();

  if (cardStatus && ["inactive", "draft", "deleted"].indexOf(cardStatus) !== -1) {
    throw new Error("Card unavailable");
  }

  var normalizedTheme = normalizeCardThemeFieldsForDisplay_(found);
  var publicSource = shallowClone_(found);
  publicSource.id = sanitizeText_(publicSource.id) || getRowCardId_(publicSource);
  publicSource.card_id = getRowCardId_(publicSource);
  publicSource.plan = normalizedTheme.plan;
  publicSource.color = normalizedTheme.color;
  publicSource.style = normalizedTheme.style;
  publicSource.paper = normalizedTheme.paper;
  publicSource.photo_limit = String(getEffectivePhotoLimit_(publicSource));
  publicSource.cta_limit = String(getEffectiveCtaLimit_(publicSource));
  if (publicSource.agent_type !== undefined) {
    publicSource.agent_type = normalizeAgentTypeForDisplay_(publicSource.agent_type);
  }

  var payload = normalizePublicCardPayload_(publicSource);
  setPublicCardCache_(targetCardId, payload, 180);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardPublicLite",
    card_id: targetCardId,
    cached: false,
    card: payload
  };
}

function getCardForUpdate_(req) {
  var token = sanitizeText_(req.update_token || req.token);
  if (!token) throw new Error("Missing update token");
  var card = findRowByField_("card_db", "update_token", token);
  if (!card) throw new Error("Card not found for update token");
  var eligibility = evaluateUpdateEligibilityForCard_(card);

  var normalizedTheme = normalizeCardThemeFieldsForDisplay_(card);
  var displayCard = shallowClone_(card);
  displayCard.id = sanitizeText_(displayCard.id) || getRowCardId_(displayCard);
  displayCard.card_id = getRowCardId_(displayCard);
  displayCard.plan = normalizedTheme.plan;
  displayCard.color = normalizedTheme.color;
  displayCard.style = normalizedTheme.style;
  displayCard.paper = normalizedTheme.paper;
  displayCard.photo_limit = String(getEffectivePhotoLimit_(displayCard));
  displayCard.cta_limit = String(getEffectiveCtaLimit_(displayCard));
  displayCard.marquee_purchased = toBooleanString_(displayCard.marquee_purchased);
  displayCard.marquee_enabled = toBooleanString_(displayCard.marquee_enabled);
  displayCard.marquee_text = sanitizeText_(displayCard.marquee_text);
  displayCard.phone = sanitizePhoneAsText_(displayCard.phone);
  displayCard.owner_phone = sanitizePhoneAsText_(displayCard.owner_phone);
  if (displayCard.agent_type !== undefined) {
    displayCard.agent_type = normalizeAgentTypeForDisplay_(displayCard.agent_type);
  }
  if (displayCard.owner_agent_type !== undefined) {
    displayCard.owner_agent_type = normalizeAgentTypeForDisplay_(displayCard.owner_agent_type);
  }

  var deliveryGuidance = buildDeliveryCardGuidance_(displayCard);

  var trackingContext = buildTrackingContextForCard_(displayCard, req);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardForUpdate",
    card_id: getRowCardId_(displayCard),
    card: displayCard,
    update_eligibility: eligibility,
    delivery_guidance: deliveryGuidance,
    tracking_context: trackingContext
  };
}

function getUpdateEligibility_(req) {
  var card = requireCardByIdOrToken_(req);
  var eligibility = evaluateUpdateEligibilityForCard_(card);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getUpdateEligibility",
    card_id: card.id,
    eligibility: eligibility
  };
}

function createUpdateFeePayment_(req) {
  ensureAllSchemasOrThrow_();
  var now = new Date();
  var card = requireCardByIdOrToken_(req);
  var eligibility = evaluateUpdateEligibilityForCard_(card);
  if (!eligibility.charge_required) throw new Error("This card does not require update fee");
  var existingPending = getSheetRowsByName_("payment_db").find(function(row) {
    return (
      sanitizeText_(row.card_id) === sanitizeText_(card.id) &&
      sanitizeText_(row.event_type) === "update_fee" &&
      sanitizeText_(row.status) === "pending"
    );
  });
  if (existingPending) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "createUpdateFeePayment",
      created: false,
      payment: existingPending,
      message: "Pending update fee payment already exists"
    };
  }
  var payment = emptyRow_("payment_db");
  payment.payment_id = generatePaymentId_();
  payment.card_id = card.id;
  payment.lead_id = "";
  payment.created_at = toIso_(now);
  payment.updated_at = toIso_(now);
  payment.event_type = "update_fee";
  payment.order_type = "update";
  payment.plan = sanitizeText_(card.plan);
  payment.amount = String(eligibility.charge_amount);
  payment.status = "pending";
  payment.paid_at = "";
  payment.due_at = toIso_(addDays_(now, CONFIG.PAYMENT_DUE_DAYS));
  payment.method = "";
  payment.transaction_id = "";
  payment.billing_status_after = "";
  payment.note = "update_fee";
  payment.created_by = sanitizeText_(req.created_by || req.createdBy || "system");
  payment.is_test = sanitizeText_(card.is_test) || "FALSE";
  payment.tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  payment.agent_id = sanitizeText_(card.agent_id);
  payment.share_card_id = sanitizeText_(card.share_card_id);
  payment.share_agent_id = sanitizeText_(card.share_agent_id);
  payment.share_source = sanitizeText_(card.share_source);
  payment.share_channel = sanitizeText_(card.share_channel);
  payment.commission_status = "not_applicable";
  payment.card_status_before = sanitizeText_(card.status);
  payment.card_status_after = sanitizeText_(card.status);
  payment.operated_by = sanitizeText_(req.operated_by || req.operatedBy || "system");
  payment.risk_flag = "FALSE";
  payment.risk_reason = "";
  payment.review_status = "";
  payment.reviewed_at = "";
  payment.refund_at = "";
  payment.refund_reason = "";
  payment.commission_processed_at = "";
  payment.commission_reversed_at = "";
  appendRowByName_("payment_db", payment);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "createUpdateFeePayment",
    created: true,
    payment: payment,
    eligibility: eligibility
  };
}

function updateCardByToken_(req) {
  var now = new Date();
  var token = sanitizeText_(req.update_token || req.token);
  if (!token) throw new Error("Missing update token");
  var card = findRowByField_("card_db", "update_token", token);
  if (!card) throw new Error("Card not found for update token");

  var eligibility = evaluateUpdateEligibilityForCard_(card);
  if (eligibility.charge_required && !eligibility.paid_ready) {
    throw new Error("Update fee payment required before update");
  }

  var plan = ensurePlanExists_(card.plan, card.tenant);
  var normalizedInput = normalizeUpdateCardReqFields_(req);
  var allowedFields = resolveUpdateAllowedFields_(card, plan);
  var updatedCard = shallowClone_(card);

  Object.keys(normalizedInput).forEach(function(field) {
    if (allowedFields.indexOf(field) === -1) return;
    var candidate = normalizedInput[field];
    if (!shouldApplyUpdateValue_(field, candidate)) return;
    updatedCard[field] = normalizeUpdateValue_(field, candidate);
  });

  updatedCard.style = resolveStyleForPlan_(plan, updatedCard.style);
  updatedCard.paper = resolvePaperForPlan_(plan, updatedCard.paper);

  var normalized = normalizeCardThemeFields_(updatedCard);
  updatedCard = normalized.updatedRow;

  validateCardAgainstPlan_(updatedCard, plan);
  updatedCard.updated_at = toIso_(now);
  updatedCard.process_status = sanitizeText_(updatedCard.process_status) || "ready";
  if (!sanitizeText_(updatedCard.update_token)) {
    updatedCard.update_token = token;
  }
  if (!sanitizeText_(updatedCard.update_token_created_at)) {
    updatedCard.update_token_created_at = sanitizeText_(card.update_token_created_at) || toIso_(now);
  }
  updatedCard.update_token_expire = "";

  updateRowByName_("card_db", card.__rowNum, updatedCard);
  invalidateCardPublicCache_(updatedCard.id || updatedCard.card_id);
  logCardUpdate_(updatedCard, req, eligibility.charge_required, eligibility.charge_amount, eligibility.payment_id);
  if (eligibility.charge_required) {
    closePaidUpdateFeePayment_(updatedCard.id, now);
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "updateCardByToken",
    card_id: updatedCard.id,
    update_token: updatedCard.update_token,
    charge_required: eligibility.charge_required,
    allowed_fields: allowedFields,
    card: updatedCard
  };
}

function confirmUpdateFeePaid_(req) {
  ensureAllSchemasOrThrow_();
  var now = new Date();
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  if (sanitizeText_(payment.event_type) !== "update_fee") throw new Error("Payment is not an update fee payment");
  var txId = sanitizeText_(req.transaction_id || req.transactionId);
  validateTransactionIdUnique_(txId, paymentId);
  var updatedPayment = shallowClone_(payment);
  updatedPayment.status = "paid";
  updatedPayment.updated_at = toIso_(now);
  updatedPayment.paid_at = sanitizeText_(req.paid_at) || toIso_(now);
  updatedPayment.method = sanitizeText_(req.method);
  updatedPayment.transaction_id = txId;
  updatedPayment.operated_by = sanitizeText_(req.operated_by || req.operatedBy || "system");
  updateRowByName_("payment_db", payment.__rowNum, updatedPayment);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "confirmUpdateFeePaid",
    payment: updatedPayment
  };
}

// ============================================================
// 付款相關
// ============================================================

function hasAgentUpgradeAddonInPayment_(payment) {
  payment = payment || {};

  var summaryObj = parseJsonSafe_(payment.order_summary_json, {});
  var addonItems = Array.isArray(summaryObj && summaryObj.addon_items) ? summaryObj.addon_items : [];
  if (addonItems.some(function(item)
 {
    return normalizeAddonItemCode_(item && item.item_code) === "addon_agent_upgrade";
  })) {
    return true;
  }

  var addonSummaryText = sanitizeText_(payment.addon_summary);
  if (addonSummaryText) {
    return /(^|[\s,;|:/])agent_upgrade_fee($|[\s,;|:/])/.test(addonSummaryText);
  }

  return false;
}

function confirmPayment_(req) {
  var now = new Date();
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");

  var currentStatus = sanitizeText_(payment.status);
  if (currentStatus === "paid") throw new Error("Payment already paid");
  if (currentStatus === "refunded") throw new Error("Refunded payment cannot be confirmed");

  var txId = sanitizeText_(req.transaction_id || req.transactionId);
  validateTransactionIdUnique_(txId, paymentId);

  var paidAtText = sanitizeText_(req.paid_at || req.paidAt) || toIso_(now);
  var paidAt = toDateSafe_(paidAtText);
  if (!paidAt) throw new Error("Invalid paid_at");

  var updatedPayment = shallowClone_(payment);
  updatedPayment.status = "paid";
  updatedPayment.billing_status = "paid";
  updatedPayment.updated_at = toIso_(now);
  updatedPayment.paid_at = paidAtText;
  updatedPayment.method = sanitizeText_(req.method);
  updatedPayment.transaction_id = txId;
  updatedPayment.operated_by = sanitizeText_(req.operated_by || req.operatedBy || "system");
  updatedPayment.note = mergeNote_(updatedPayment.note, sanitizeText_(req.note));

  var eventType = sanitizeText_(updatedPayment.event_type);
  var orderType = sanitizeText_(updatedPayment.order_type);

  if (eventType === "first_payment" || eventType === "renewal" || eventType === "update_fee" || eventType === "addon_payment") {
    updatedPayment.commission_status = "pending";
  }

  updateRowByName_("payment_db", payment.__rowNum, updatedPayment);

  var cardResult = { card: null, agent_updates: [], renewal: null };
  var cardId = sanitizeText_(updatedPayment.card_id);

  if (cardId) {
    var card = findRowByField_("card_db", "id", cardId);
    if (card) {
      var planValue = sanitizeText_(updatedPayment.plan) || sanitizeText_(card.plan);
      var expireDays = getPlanExpireDays(planValue);
      var expiresAtText = sanitizeText_(card.expires_at);

      if (eventType === "first_payment" || (!sanitizeText_(card.payment_paid_at) && !sanitizeText_(expiresAtText))) {
        expiresAtText = toIso_(addDays_(paidAt, expireDays));
      } else if (eventType === "renewal" || orderType === "renewal") {
        var currentExpire = toDateSafe_(card.expires_at);
        var baseDate = currentExpire && currentExpire > paidAt ? currentExpire : paidAt;
        expiresAtText = toIso_(addDays_(baseDate, expireDays));
      } else if (!sanitizeText_(card.payment_paid_at) && sanitizeText_(card.expires_at)) {
        expiresAtText = sanitizeText_(card.expires_at);
      }

      var updatedCard = unlockCardIfNeeded(card, paidAtText, expiresAtText) || shallowClone_(card);
      updateRowByName_("card_db", card.__rowNum, updatedCard);
      invalidateCardPublicCache_(updatedCard.id || updatedCard.card_id);
      cardResult.card = updatedCard;

      if (eventType === "renewal" || orderType === "renewal") {
        var renewal = findRowByField_("renewal_db", "payment_id", paymentId);
        if (renewal) {
          var updatedRenewal = shallowClone_(renewal);
          updatedRenewal.status = "paid";
          updatedRenewal.billing_status = "paid";
          updatedRenewal.paid_at = paidAtText;
          updatedRenewal.new_expires_at = sanitizeText_(updatedCard.expires_at);
          updatedRenewal.updated_at = toIso_(now);
          updateRowByName_("renewal_db", renewal.__rowNum, updatedRenewal);
          cardResult.renewal = updatedRenewal;
        }
      }

      if (eventType === "first_payment" || eventType === "renewal" || orderType === "renewal") {
        cardResult.agent_updates = syncAgentSelfRenewalByCard_(cardId, true, now, "");
      }
    }
  }

  var commissionResult = autoProcessCommissionAfterPayment_(paymentId);
  if (eventType === "addon_payment" && hasAgentUpgradeAddonInPayment_(updatedPayment)) {
    handleAgentUpgrade_(updatedPayment);
  }

  var finalPayment = findRowByField_("payment_db", "payment_id", paymentId) || updatedPayment;

  writeOpsLog_({
    module: "payment",
    action: "confirm_paid",
    target_id: updatedPayment.payment_id,
    before_status: payment.status,
    after_status: finalPayment.status,
    note: "card_id=" + updatedPayment.card_id
  });

  if (eventType === "first_payment" && finalPayment.status === "paid") {
    try {
      var cardForNotify = cardResult.card || findRowByField_("card_db", "id", cardId);
      if (cardForNotify) {
        var targetId = sanitizeText_(cardForNotify.id);
        var noteMsg = "🎉 " + targetId + " " + sanitizeText_(cardForNotify.name || "客戶") + " 完成付款成交（payment_id=" + finalPayment.payment_id + "）";
        var conversionPayload = {
          module: "sales",
          action: "new_conversion",
          target_id: targetId,
          before_status: "",
          after_status: "paid",
          operator: "system",
          note: noteMsg,
          tenant: sanitizeText_(cardForNotify.tenant) || CONFIG.DEFAULT_TENANT
        };
        var alreadyNotified = false;
        try {
          var existingLogs = getSheetRowsByName_("ops_log_db").filter(function(row) {
            return sanitizeText_(row.module) === "sales" &&
                   sanitizeText_(row.action) === "new_conversion" &&
                   sanitizeText_(row.target_id) === targetId &&
                   (sanitizeText_(row.note).indexOf(finalPayment.payment_id) !== -1);
          });
          alreadyNotified = existingLogs.length > 0;
        } catch (err) {
          Logger.log("confirmPayment_ duplicate check failed: " + err.message);
        }
        if (!alreadyNotified) {
          logAndNotifyEvent_(conversionPayload);
        }
      }
    } catch (err) {
      Logger.log("confirmPayment_ notification error: " + err.message);
    }
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "confirmPayment",
    payment: finalPayment,
    card_id: sanitizeText_(cardResult.card && (cardResult.card.id || cardResult.card.card_id) || cardId),
    payment_paid_at: paidAtText,
    expires_at: sanitizeText_(cardResult.card && cardResult.card.expires_at),
    billing_status: "paid",
    card: cardResult.card || null,
    renewal: cardResult.renewal || null,
    agent_updates: cardResult.agent_updates || [],
    commission_result: commissionResult,
    paid_notice: cardResult.card ? buildPaidNoticePayload_(cardResult.card, finalPayment) : null
  };
}

function markPaymentPaid_(req) {
  return confirmPayment_(req);
}
function adminMarkPaid_(req) {
  var nextReq = shallowClone_(req || {});
  if (!sanitizeText_(nextReq.operated_by) && !sanitizeText_(nextReq.operatedBy)) {
    nextReq.operated_by = sanitizeText_(req && (req.admin_id || req.adminId || req.operator || req.operator_id)) || "admin";
  }
  return confirmPayment_(nextReq);
}

function markPaymentRefunded_(req) {
  var now = new Date();
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  if (sanitizeText_(payment.status) === "refunded") throw new Error("Payment already refunded");
  var updated = shallowClone_(payment);
  updated.status = "refunded";
  updated.updated_at = toIso_(now);
  updated.refund_at = toIso_(now);
  updated.refund_reason = sanitizeText_(req.refund_reason || req.refundReason);
  updated.operated_by = sanitizeText_(req.operated_by || req.operatedBy || "system");
  updateRowByName_("payment_db", payment.__rowNum, updated);
  if (sanitizeText_(payment.commission_status) === "processed") {
    try {
      reverseCommission_({
        payment_id: paymentId,
        operated_by: sanitizeText_(req.operated_by || req.operatedBy || "system"),
        admin_key: sanitizeText_(req.admin_key || req.adminKey)
      });
    } catch (e) {}
  }
  if (sanitizeText_(payment.event_type) === "first_payment") {
    var cardId = sanitizeText_(payment.card_id);
    if (cardId) {
      var card = findRowByField_("card_db", "id", cardId);
      if (card) {
        var updatedCard = shallowClone_(card);
        updatedCard.status = "locked";
        updatedCard.billing_status = "refunded";
        updatedCard.updated_at = toIso_(now);
        updatedCard.inactivated_at = toIso_(now);
        updatedCard.expires_at = "";
        updatedCard.payment_paid_at = "";
        updateRowByName_("card_db", card.__rowNum, updatedCard);
        invalidateCardPublicCache_(updatedCard.id || updatedCard.card_id);
        syncAgentSelfRenewalByCard_(cardId, false, now, "first_payment_refunded");
      }
    }
  }
  return {
    ok: true,
    version: HSC_VERSION,
    action: "markPaymentRefunded",
    payment: updated
  };
}

function getPaymentDetail_(req) {
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  var card = payment.card_id ? findRowByField_("card_db", "id", payment.card_id) : null;
  var lead = payment.lead_id ? findRowByField_("lead_db", "lead_id", payment.lead_id) : null;
  var commissions = findRowsByField_("commission_db", "payment_id", paymentId);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPaymentDetail",
    payment: payment,
    card: card,
    lead: lead,
    commission_status:
 sanitizeText_(payment.commission_status),
    commissions: commissions
  };
}

function getCardPaymentSummary_(req) {
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");
  var payments = getSheetRowsByName_("payment_db")
    .filter(function(row) {
      return sanitizeText_(row.card_id) === cardId;
    })
    .sort(function(a, b) {
      return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
    });
  var latest = payments.length ? payments[0] : null;
  var pendingFirst = payments.some(function(row) {
    return sanitizeText_(row.event_type) === "first_payment" && sanitizeText_(row.status) === "pending";
  });
  var pendingRenewal = payments.some(function(row) {
    return sanitizeText_(row.event_type) === "renewal" && sanitizeText_(row.status) === "pending";
  });
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardPaymentSummary",
    card_id: cardId,
    card_billing_status: sanitizeText_(card.billing_status),
    expires_at: sanitizeText_(card.expires_at),
    latest_payment_status: latest ? sanitizeText_(latest.status) : "",
    latest_paid_at: latest ? sanitizeText_(latest.paid_at) : "",
    latest_event_type: latest ? sanitizeText_(latest.event_type) : "",
    has_pending_first_payment: pendingFirst,
    has_pending_renewal: pendingRenewal,
    payments: payments
  };
}

function adminGetPaymentList_(req) {
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status);
  var eventType = sanitizeText_(req.event_type || req.eventType);
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var limit = toNumber_(req.limit || 0);
  var rows = getSheetRowsByName_("payment_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status) === status; });
  if (eventType) rows = rows.filter(function(row) { return sanitizeText_(row.event_type) === eventType; });
  if (cardId) rows = rows.filter(function(row) { return sanitizeText_(row.card_id) === cardId; });
  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));

  });
  if (limit > 0) rows = rows.slice(0, limit);
  return { ok: true, version: HSC_VERSION, action: "adminGetPaymentList", payments: rows };
}

// ============================================================
// 佣金相關
// ============================================================

function getActiveCommissionRules_(payment) {
  return getApplicableCommissionRules_(payment);
}

function updatePaymentCommissionStatus_(paymentId, status, processedAt, note) {
  var payment = findRowByField_("payment_db", "payment_id", sanitizeText_(paymentId));
  if (!payment) throw new Error("Payment not found");

  var updated = shallowClone_(payment);
  updated.commission_status = sanitizeText_(status);
  updated.commission_processed_at = sanitizeText_(processedAt);
  updated.updated_at = nowIso_();
  if (note) updated.note = mergeNote_(updated.note, note);
  updateRowByName_("payment_db", payment.__rowNum, updated);
  return updated;
}

function addAgentPoints_(params) {
  params = params || {};
  return changeAgentPointsBalanceInternal_({
    agent_id: params.agent_id,
    card: params.card || null,
    points: Math.abs(roundMoney_(toNumber_(params.points))),
    bucket: "balance",
    type: sanitizeText_(params.type) || "earn",
    ref_id: sanitizeText_(params.ref_id || params.refId),
    note: sanitizeText_(params.note) || "commission_points_earn",
    operator: sanitizeText_(params.operator) || "system"
  });
}

function getTrueCardOwnerAgentId_(card) {
  if (!card || typeof card !== "object") return "";
  var owner = sanitizeText_(card.owner_agent_id);
  if (owner) return owner;
  var agentId = sanitizeText_(card.agent_id);
  if (agentId) return agentId;
  return "";
}

function getCardConsumerAgentId_(card) {
  return getTrueCardOwnerAgentId_(card);
}

function checkIsSelfConsumption_(payment, beneficiaryAgentId) {
  if (!payment) return false;

  var paymentCardId = sanitizeText_(payment.card_id);
  if (!paymentCardId) return false;

  var card = findRowByField_("card_db", "id", paymentCardId);
  if (!card) {
    Logger.log("checkIsSelfConsumption_: card not found for payment " + paymentCardId);
    return false;
  }

  var consumerId = getCardConsumerAgentId_(card);
  if (!consumerId) return false;

  var checkId = sanitizeText_(beneficiaryAgentId);
  if (!checkId) return false;

  return checkId === consumerId;
}

function processCommission_(req) {
  var now = new Date();
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  if (sanitizeText_(payment.status) !== "paid") throw new Error("Payment not paid yet");
  if (sanitizeText_(payment.commission_status) === "processed") throw new Error("Commission already processed");
  if (sanitizeText_(payment.commission_status) === "reversed") throw new Error("Commission already reversed");

  var existing = findRowsByField_("commission_db", "payment_id", paymentId).filter(function(r) {
    return sanitizeText_(r.is_reversal).toUpperCase() !== "TRUE";
  });
  if (existing.length) throw new Error("Commission already exists for this payment");

  var items = splitPaymentCommissionItems_(payment);
  if (!items.length) {
    var noItemPayment = updatePaymentCommissionStatus_(paymentId, "no_rule", "", "commission_no_items");
    return {
      ok: true,
      version: HSC_VERSION,
      action: "processCommission",
      commissions: [],
      payment: noItemPayment,
      message: "No commission items derived"
    };
  }

  var commissions = [];
  var matchedRules = [];
  var anyCommissionCreated = false;

  items.forEach(function(item) {
    var matchedRule = selectBestCommissionRule_(payment, item);
    if (!matchedRule) return;

    var beneficiaryId = resolveCommissionBeneficiaryAgentId_(matchedRule, payment);
    if (!beneficiaryId) return;

    if (checkIsSelfConsumption_(payment, beneficiaryId)) return;

    var commission = buildCommissionFromRule_(payment, matchedRule, now, item);
    if (!commission) return;
    ensureAgentExists_(commission.beneficiary_agent_id, { source: "commission", payment_id: paymentId, tenant: payment.tenant });
    appendRowByName_("commission_db", commission);
    applyCommissionEffectToAgent_(commission, now);
    commissions.push(commission);
    matchedRules.push(matchedRule);
    anyCommissionCreated = true;
  });

  if (!anyCommissionCreated) {
    var skippedPayment = updatePaymentCommissionStatus_(paymentId, "skipped", "", "commission_skipped_self_consumption");
    return {
      ok: true,
      version: HSC_VERSION,
      action: "processCommission",
      commissions: [],
      payment: skippedPayment,
      message: "All items skipped due to self consumption"
    };
  }

  var processedAt = toIso_(now);
  var uniqueRuleIds = matchedRules.map(function(r){ return sanitizeText_(r.rule_id); }).filter(Boolean)
    .filter(function(v, i, arr){ return arr.indexOf(v) === i; });
  var updatedPayment = updatePaymentCommissionStatus_(
    paymentId,
    "processed",
    processedAt,
    "commission_processed=" + String(commissions.length) + "|rule_ids=" + uniqueRuleIds.join(",")
  );

  return {
    ok: true,
    version: HSC_VERSION,
    action: "processCommission",
    commissions: commissions,
    payment: updatedPayment,
    matched_rules: matchedRules,
    message: ""
  };
}

function processRenewalCommission_(payment, now) {
  if (sanitizeText_(payment && payment.commission_status) === "processed") {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "processCommission",
      commissions: [],
      message: "already_processed"
    };
  }

  var commissions = [];
  var baseAmount = toNumber_(payment.amount);
  var paidAt = sanitizeText_(payment.paid_at);
  var serviceAgentId = getRenewalServiceAgentId_(payment);
  var referrerAgentId = getRenewalReferrerAgentId_(payment);

  var serviceIsSelf = serviceAgentId ? checkIsSelfConsumption_(payment, serviceAgentId) : false;
  var referrerIsSelf = referrerAgentId ? checkIsSelfConsumption_(payment, referrerAgentId) : false;

  if (serviceAgentId && !serviceIsSelf) {
    var agent = findRowByField_("agent_db", "agent_id", serviceAgentId);
    var selfRenewalOk = agent && toBoolean_(agent.self_renewal_ok);
    var hasApprovedService = hasValidApprovedServiceLog_(payment, serviceAgentId);
    if (selfRenewalOk && hasApprovedService) {
      var commission = emptyRow_("commission_db");
      commission.commission_id = generateCommissionId_();
      commission.payment_id = payment.payment_id;
      commission.card_id = payment.card_id;
      commission.lead_id = payment.lead_id;
      commission.created_at = toIso_(now);
      commission.updated_at = toIso_(now);
      commission.beneficiary_agent_id = serviceAgentId;
      commission.source_agent_id = serviceAgentId;
      commission.source_card_id = payment.card_id;
      commission.reward_type = "cash";
      commission.item = "renewal_service_agent";
      commission.base_amount = String(baseAmount);
      commission.reward_rate = String(CONFIG.RENEWAL_SERVICE_AGENT_RATE);
      commission.reward_amount = String(roundMoney_(baseAmount * CONFIG.RENEWAL_SERVICE_AGENT_RATE));
      commission.reward_points = "0";
      commission.status = "pending";
      commission.rule_id = "SYSTEM_RENEWAL_SERVICE_40";
      commission.calculated_at = paidAt || toIso_(now);
      commission.paid_at = "";
      commission.frozen_at = "";
      commission.unfrozen_at = "";
 
     commission.freeze_reason = "";
      commission.commission_batch_id = "";
      commission.is_reversal = "FALSE";
      commission.reversal_of = "";
      commission.reversal_at = "";
      commission.note = "service_log approved";
      commission.tenant = payment.tenant;
      appendRowByName_("commission_db", commission);
      commissions.push(commission);
      applyCommissionEffectToAgent_(commission, now);
    }
  }

  if (referrerAgentId && !referrerIsSelf) {
    var referrerAgent = findRowByField_("agent_db", "agent_id", referrerAgentId);
    var referrerSelfRenewalOk = referrerAgent && toBoolean_(referrerAgent.self_renewal_ok);
    if (referrerSelfRenewalOk) {
      var commission2 = emptyRow_("commission_db");
      commission2.commission_id = generateCommissionId_();
      commission2.payment_id = payment.payment_id;
      commission2.card_id = payment.card_id;
      commission2.lead_id = payment.lead_id;
      commission2.created_at = toIso_(now);
      commission2.updated_at = toIso_(now);
      commission2.beneficiary_agent_id = referrerAgentId;
      commission2.source_agent_id = referrerAgentId;
      commission2.source_card_id = payment.card_id;
      commission2.reward_type = "points";
      commission2.item = "renewal_referrer_points";
      commission2.base_amount = String(baseAmount);
      commission2.reward_rate = String(CONFIG.RENEWAL_REFERRER_POINTS_RATE);
      commission2.reward_amount = "0";
      commission2.reward_points = String(roundMoney_(baseAmount * CONFIG.RENEWAL_REFERRER_POINTS_RATE));
      commission2.status = "pending";
      commission2.rule_id = "SYSTEM_RENEWAL_REFERRER_POINTS_20";
      commission2.calculated_at = paidAt || toIso_(now);
      commission2.paid_at = "";
      commission2.frozen_at = "";
      commission2.unfrozen_at = "";
      commission2.freeze_reason = "";
      commission2.commission_batch_id = "";
      commission2.is_reversal = "FALSE";
      commission2.reversal_of = "";
      commission2.reversal_at = "";
      commission2.note = "self_renewal_ok";
      commission2.tenant = payment.tenant;
      appendRowByName_("commission_db", commission2);
      commissions.push(commission2);
      applyCommissionEffectToAgent_(commission2, now);
    }
  }

  var updatedPayment = shallowClone_(payment);
  if (commissions.length) {
    updatedPayment.commission_status = "processed";
    updatedPayment.commission_processed_at = toIso_(now);
  } else {
    updatedPayment.commission_status = "skipped";
    updatedPayment.commission_processed_at = toIso_(now);
    updatedPayment.note = mergeNote_(updatedPayment.note, "commission_skipped_self_consumption");
  }
  updatedPayment.updated_at = toIso_(now);

  clearSheetRowCache_("payment_db");
  var freshPayment = findRowByField_("payment_db", "payment_id", sanitizeText_(payment.payment_id));
  if (!freshPayment || !freshPayment.__rowNum) {
    throw new Error("processRenewalCommission_: cannot locate payment row: " + sanitizeText_(payment.payment_id));
  }
  updatedPayment.__rowNum = freshPayment.__rowNum;
  updateRowByName_("payment_db", freshPayment.__rowNum, updatedPayment);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "processCommission",
    commissions: commissions,
    message: commissions.length ? "" : "No commission generated (self consumption or missing self_renewal_ok for referrer)"
  };
}

function reverseCommission_(req) {
  var now = new Date();
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  if (sanitizeText_(payment.commission_status) === "reversed") throw new Error("Commission already reversed");
  var rows = findRowsByField_("commission_db", "payment_id", paymentId).filter(function(row) {
    return sanitizeText_(row.is_reversal) !== "TRUE";
  });
  if (!rows.length) throw new Error("No commission found for payment");
  var reversalExists = getSheetRowsByName_("commission_db").some(function(row) {
    if (sanitizeText_(row.is_reversal) !== "TRUE") return false;
    return rows.some(function(src) {
      return sanitizeText_(row.reversal_of) === sanitizeText_(src.commission_id);
    });
  });
  if (reversalExists) throw new Error("Commission reversal already exists");
  var reversals = [];
  rows.forEach(function(row) {
    var reversal = emptyRow_("commission_db");
    reversal.commission_id = generateCommissionId_();
    reversal.payment_id = row.payment_id;
    reversal.card_id = row.card_id;
    reversal.lead_id = row.lead_id;
    reversal.created_at = toIso_(now);
    reversal.updated_at = toIso_(now);
    reversal.beneficiary_agent_id = row.beneficiary_agent_id;
    reversal.source_agent_id = row.source_agent_id;
    reversal.source_card_id = row.source_card_id;
    reversal.reward_type = row.reward_type;
    reversal.item = row.item;
    reversal.base_amount = String(-1 * toNumber_(row.base_amount));
    reversal.reward_rate = row.reward_rate;
    reversal.reward_amount = String(-1 * toNumber_(row.reward_amount));
    reversal.reward_points = String(-1 * toNumber_(row.reward_points));
    reversal.status = "reversed";
    reversal.rule_id = row.rule_id;
    reversal.calculated_at = toIso_(now);
    reversal.paid_at = "";
    reversal.frozen_at = "";
    reversal.unfrozen_at = "";
    reversal.freeze_reason = "";
    reversal.commission_batch_id = "";
    reversal.is_reversal = "TRUE";
    reversal.reversal_of = row.commission_id;
    reversal.reversal_at = toIso_(now);
    reversal.note = sanitizeText_(req.note) || "auto reversal";
    reversal.tenant = row.tenant;
    appendRowByName_("commission_db", reversal);
    reversals.push(reversal);
    applyCommissionEffectToAgent_(reversal, now);
  });
  var updatedPayment = shallowClone_(payment);
  updatedPayment.commission_status = "reversed";
  updatedPayment.commission_reversed_at = toIso_(now);
  updatedPayment.updated_at = toIso_(now);
  updateRowByName_("payment_db", payment.__rowNum, updatedPayment);
  return { ok: true, version: HSC_VERSION, action: "reverseCommission", reversals: reversals };
}

function getCommissionList_(req) {
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  var rows = getSheetRowsByName_("commission_db").filter(function(r) {
    return sanitizeText_(r.beneficiary_agent_id) === agentId;
  });
  return { ok: true, version: HSC_VERSION, action: "getCommissionList", commissions: rows };
}

function getCommissionByPayment_(req) {
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  var rows = findRowsByField_("commission_db", "payment_id", paymentId);
  return { ok: true, version: HSC_VERSION, action: "getCommissionByPayment", commissions: rows };
}

function adminGetCommissionList_(req) {
  return { ok: true, version: HSC_VERSION, action: "adminGetCommissionList", commissions: getSheetRowsByName_("commission_db") };
}

function getPaymentCommissionStatus_(req) {
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  return { ok: true, version: HSC_VERSION, action: "getPaymentCommissionStatus", status: payment ? payment.commission_status : "" };
}

// ============================================================
// 服務記錄相關
// ============================================================

function createServiceLog_(req) {
  var tenant = getTenant_(req);
  var now = new Date();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!cardId) throw new Error("Missing card_id");
  if (!agentId) throw new Error("Missing agent_id");
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) throw new Error("Agent not found");
  var serviceLogId = sanitizeText_(req.service_log_id || req.serviceLogId) || generateServiceLogId_();
  ensureUniqueValue_("service_log", "service_log_id", serviceLogId);
  var row = emptyRow_("service_log");
  row.service_log_id = serviceLogId;
  row.card_id = cardId;
  row.agent_id = agentId;
  row.service_type = sanitizeText_(req.service_type || req.serviceType) || "service";
  row.service_date = sanitizeText_(req.service_date || req.serviceDate) || toIso_(now);
  row.related_payment_type = sanitizeText_(req.related_payment_type || req.relatedPaymentType) || "";
  row.evidence_type = sanitizeText_(req.evidence_type || req.evidenceType);
  row.evidence_ref = sanitizeText_(req.evidence_ref || req.evidenceRef);
  row.status = sanitizeText_(req.status) || "pending";
  row.validated_by = "";
  row.validated_at = "";
  row.created_at = toIso_(now);
  row.updated_at = toIso_(now);
  row.tenant = tenant;
  row.is_test = toBooleanString_(req.is_test || agent.is_test || card.is_test);
  appendRowByName_("service_log", row);
  return { ok: true, version: HSC_VERSION, action: "createServiceLog", service_log: row };
}

function getServiceLogs_(req) {
  var tenant = getTenant_(req);
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  var status = sanitizeText_(req.status);
  var relatedPaymentType = sanitizeText_(req.related_payment_type || req.relatedPaymentType);
  var rows = getSheetRowsByName_("service_log").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });
  if (cardId) rows = rows.filter(function(row) { return sanitizeText_(row.card_id) === cardId; });
  if (agentId) rows = rows.filter(function(row) { return sanitizeText_(row.agent_id) === agentId; });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status) === status; });
  if (relatedPaymentType) rows = rows.filter(function(row)
 { return sanitizeText_(row.related_payment_type) === relatedPaymentType; });
  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });
  return { ok: true, version: HSC_VERSION, action: "getServiceLogs", service_logs: rows };
}

function approveServiceLog_(req) {
  return updateServiceLogStatus_(req, "approved");
}

function rejectServiceLog_(req) {
  return updateServiceLogStatus_(req, "rejected");
}

function updateServiceLogStatus_(req, nextStatus) {
  var now = new Date();
  var id = sanitizeText_(req.service_log_id || req.serviceLogId);
  if (!id) throw new Error("Missing service_log_id");
  var row = findRowByField_("service_log", "service_log_id", id);
  if (!row) throw new Error("Service log not found");
  var updated = shallowClone_(row);
  updated.status = nextStatus;
  updated.validated_by = sanitizeText_(req.validated_by || req.operated_by || "system");
  updated.validated_at = toIso_(now);
  updated.updated_at = toIso_(now);
  updateRowByName_("service_log", row.__rowNum, updated);
  return {
    ok: true,
    version: HSC_VERSION,
    action: nextStatus === "approved" ? "approveServiceLog" : "rejectServiceLog",
    service_log: updated
  };
}

// ============================================================
// 代理商相關
// ============================================================

function getAgentSummary_(req) {
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var card = null;
  if (!agentId && cardId) {
    card = findRowByField_("card_db", "id", cardId);
    if (card) agentId = sanitizeText_(card.owner_agent_id || card.agent_id);
  }
  var agent = agentId ? findRowByField_("agent_db", "agent_id", agentId) : null;
  
  if (!agent && agentId) {
    var anyCommission = findRowsByField_("commission_db", "beneficiary_agent_id", agentId).length > 0;
    if (anyCommission) {
      ensureAgentExists_(agentId, { source: "agent_summary_fallback", reason: "commission_exists" });
      agent = findRowByField_("agent_db", "agent_id", agentId);
    }
    if (!agent && cardId) {
      var cardRef = findRowByField_("card_db", "id", cardId);
      if (cardRef) {
        ensureAgentExists_(agentId, { card: cardRef, source: "agent_summary_fallback", reason: "card_owner" });
        agent = findRowByField_("agent_db", "agent_id", agentId);
      }
    }
  }
  
  if (!agent && !card && cardId) card = findRowByField_("card_db", "id", cardId);
  if (!agent && !card) {
    return {
      ok: false,
      version: HSC_VERSION,
      action: "getAgentSummary",
      missing_agent_record: true,
      error: "Agent not found and could not be auto-repaired",
      agent_id: agentId,
      card_id: cardId
    };
  }
  var agentInfo = buildDeliveryAgentInfoByAgent_(agent, card);
  return { ok: true, version: HSC_VERSION, action: "getAgentSummary", agent: agent || {}, agent_info: agentInfo };
}

function getAgentCommissionStats_(req) {
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  var rows = getSheetRowsByName_("commission_db").filter(function(r) {
    return sanitizeText_(r.beneficiary_agent_id) === agentId;
  });
  var totalCash = rows.reduce(function(sum, r) { return sum + toNumber_(r.reward_amount); }, 0);
  var totalPoints = rows.reduce(function(sum, r) { return sum + toNumber_(r.reward_points); }, 0);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAgentCommissionStats",
    total_commission: roundMoney_(totalCash),
    points_earned_total: roundMoney_(totalPoints),
    count: rows.length
  };
}

function getAgentUpgradeStatus_(req) {
  var agent = findRowByField_("agent_db", "agent_id", sanitizeText_(req.agent_id || req.agentId));
  if (!agent) throw new Error("Agent not found");
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAgentUpgradeStatus",
    upgrade_status: agent.upgrade_status,
    eligible: agent.eligible_for_upgrade,
    tier_upgrade_eligible: agent.tier_upgrade_eligible,
    member_tier: agent.member_tier,
    agent: agent
  };
}

function normalizeAgentTypeForSheet_(agentType) {
  var t = String(agentType || "").trim().toLowerCase();
  if (t === "partner") return "partner";
  if (t === "referral" || t === "agent") return "referral";
  if (t === "customer" || t === "self" || t === "service") return "customer";
  return "customer";
}

function getTargetCardId_(req) {
  return String(req && (req.card_id || req.id || req.cardId || "") || "")
    .trim()
    .toUpperCase();
}

function getRowCardId_(row) {
  return String(row && (row.card_id || row.id || "") || "")
    .trim()
    .toUpperCase();
}

function validateAgentType_(val) {
  var v = normalizeAgentTypeForSheet_(val);
  return v === "customer" || v === "referral" || v === "partner";
}

function normalizeAgentTypeForDisplay_(val) {
  return normalizeAgentTypeForSheet_(val);
}

function getPublicCardCacheKey_(cardId) {
  return "hsc:public:card:" + String(cardId || "").trim().toUpperCase();
}

function getPublicCardCache_(cardId) {
  var raw = CacheService.getScriptCache().get(getPublicCardCacheKey_(cardId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function setPublicCardCache_(cardId, payload, ttlSeconds) {
  CacheService.getScriptCache().put(
    getPublicCardCacheKey_(cardId),
    JSON.stringify(payload || {}),
    ttlSeconds || 180
  );
}

function invalidateCardPublicCache_(cardId) {
  var id = String(cardId || "").trim().toUpperCase();
  if (!id) return;
  CacheService.getScriptCache().remove(getPublicCardCacheKey_(id));
}

function mapAgentTypeToTier_(agentType) {
  var t = normalizeAgentTypeForSheet_(agentType);
  if (t === "partner") return "gold";
  if (t === "referral") return "silver";
  return "bronze";
}

function normalizeAgentType_(agentType) {
  return normalizeAgentTypeForSheet_(agentType);
}

function getAgentRoleDisplay_(agentType) {
  return normalizeAgentType_(agentType) === AGENT_ROLE_PARTNER ? "合作代理" : "推薦代理";
}

function buildReferralLink_(agentId) {
  var base = sanitizeText_(CONFIG.BASE_URL || "");
  if (!base) return "";
  if (base.slice(-1) !== "/") base += "/";
  return base + "form.html?ref=" + encodeURIComponent(agentId);
}

function computeAgentReferralStats_(agentId) {
  var leads = getSheetRowsByName_("lead_db").filter(function(row) {
    return sanitizeText_(row.service_agent) === agentId || sanitizeText_(row.referrer) === agentId || sanitizeText_(row.agent_id) === agentId;
  });
  var referralCount = leads.length;
  var convertedCount = leads.filter(function(row) {
    return !!sanitizeText_(row.converted_card_id);
  }).length;
  return {
    referral_count: referralCount,
    converted_count: convertedCount
  };
}

function computeAgentMonthlyCommission_(agentId) {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  return roundMoney_(getSheetRowsByName_("commission_db").filter(function(row) {
    if (sanitizeText_(row.beneficiary_agent_id) !== agentId) return false;
    if (sanitizeText_(row.status) !== "paid" && sanitizeText_(row.status) !== "approved" && sanitizeText_(row.status) !== "pending") return false;
    var d = sanitizeText_(row.paid_at || row.calculated_at || row.created_at);
    if (!d) return false;
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return false;
    return dt.getFullYear() === year && dt.getMonth() === month;
  }).reduce(function(sum, row) {
    return sum + toNumber_(row.reward_amount);
  }, 0));
}

function buildDeliveryAgentInfoByAgent_(agent, card) {
  var role = normalizeAgentTypeForSheet_(agent ? agent.agent_type : (card ? card.owner_agent_type || card.agent_type : ""));
  var agentId = sanitizeText_(agent ? agent.agent_id : (card ? card.owner_agent_id || card.agent_id : ""));
  var stats = agentId ? computeAgentReferralStats_(agentId) : { referral_count: 0, converted_count: 0 };
  var points = toNumber_(agent ? agent.points_balance : 0);
  var upgradeRemaining = Math.max(0, AGENT_UPGRADE_TARGET_POINTS - points);
  return {
    agent_role: role,
    agent_role_display: getAgentRoleDisplay_(role),
    agent_id: agentId,
    referral_code: agentId,
    referral_link: agentId ? buildReferralLink_(agentId) : "",
    reward_points: String(points),
    referral_count: String(stats.referral_count),
    converted_count: String(stats.converted_count),
    commission_total: String(roundMoney_(toNumber_(agent ? agent.total_commission : 0))),
    commission_monthly: String(computeAgentMonthlyCommission_(agentId)),
    upgrade_target_points: String(AGENT_UPGRADE_TARGET_POINTS),
    upgrade_remaining_points: String(upgradeRemaining),
    eligible_for_upgrade: upgradeRemaining <= 0 ? "TRUE" : sanitizeText_(agent ? agent.eligible_for_upgrade : ""),
    upgrade_status: sanitizeText_(agent ? agent.upgrade_status : ""),
    partner_status: sanitizeText_(agent ? agent.partner_status : (role === AGENT_ROLE_PARTNER ? "active" : "")),
    service_hint: role === AGENT_ROLE_PARTNER ? "可查看分潤與推薦客戶資訊，方便服務。" : "可推薦客戶累積點數，升級合作代理。"
  };
}

function buildDeliveryAgentInfoByCard_(card) {
  var ownerAgentId = sanitizeText_(card.owner_agent_id || card.agent_id);
  var agent = ownerAgentId ? findRowByField_("agent_db", "agent_id", ownerAgentId) : null;
  return buildDeliveryAgentInfoByAgent_(agent, card);
}

function getDeliveryAgentInfo_(req) {
  var card = null;
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (cardId) card = findRowByField_("card_db", "id", cardId);
  if (!card && sanitizeText_(req.token)) card = findRowByField_("card_db", "token", sanitizeText_(req.token));
  if (!card && sanitizeText_(req.update_token)) card = findRowByField_("card_db", "update_token", sanitizeText_(req.update_token));
  if (!card) throw new Error("Card not found");
  return {
    ok: true,
    version: HSC_VERSION,
    action:
 "getDeliveryAgentInfo",
    card_id: sanitizeText_(card.id),
    agent: buildDeliveryAgentInfoByCard_(card)
  };
}

function adminFreezeAgent_(req) {
  return updateAgentFreezeState_(req, true);
}

function adminUnfreezeAgent_(req) {
  return updateAgentFreezeState_(req, false);
}

function updateAgentFreezeState_(req, freeze) {
  var now = new Date();
  var agent = findRowByField_("agent_db", "agent_id", sanitizeText_(req.agent_id || req.agentId));
  if (!agent) throw new Error("Agent not found");
  var updated = shallowClone_(agent);
  updated.reward_freeze_flag = freeze ? "TRUE" : "FALSE";
  updated.reward_freeze_reason = freeze ? (sanitizeText_(req.reason) || "manual_freeze") : "";
  updated.reward_freeze_at = freeze ? toIso_(now) : sanitizeText_(updated.reward_freeze_at);
  updated.reward_unfreeze_at = freeze ? "" : toIso_(now);
  updated.updated_at = toIso_(now);
  updateRowByName_("agent_db", agent.__rowNum, updated);
  return {
    ok: true,
    version: HSC_VERSION,
    action: freeze ? "adminFreezeAgent" : "adminUnfreezeAgent",
    agent: updated
  };
}

function adminUpdateAgentType_(req) {
  var now = new Date();
  var agent = findRowByField_("agent_db", "agent_id", sanitizeText_(req.agent_id || req.agentId));
  if (!agent) throw new Error("Agent not found");
  var updated = shallowClone_(agent);
  var rawType = sanitizeText_(req.agent_type || req.agentType || AGENT_ROLE_DEFAULT);
  updated.agent_type = normalizeAgentTypeForSheet_(rawType);
  updated.partner_status = updated.agent_type === AGENT_ROLE_PARTNER ? "active" : "";
  if (updated.agent_type === AGENT_ROLE_PARTNER && !sanitizeText_(updated.partner_qualified_at)) updated.partner_qualified_at = toIso_(now);
  updated.member_tier = mapAgentTypeToTier_(updated.agent_type);
  syncAgentTierStatusFields_(updated, now);
  updated.updated_at = toIso_(now);
  updateRowByName_("agent_db", agent.__rowNum, updated);
  var card = sanitizeText_(updated.card_id) ? findRowByField_("card_db", "id", sanitizeText_(updated.card_id)) : null;
  if (card) {
    var updatedCard = shallowClone_(card);
    updatedCard.owner_agent_type = updated.agent_type;
    if (sanitizeText_(updatedCard.is_agent) === "TRUE") updatedCard.agent_type = updated.agent_type;
    updatedCard.updated_at = toIso_(now);
    updateRowByName_("card_db", card.__rowNum, updatedCard);
  }
  return { ok: true, version: HSC_VERSION, action: "adminUpdateAgentType", agent: updated };
}

function adminSetAgentUpgrade_(req) {
  var now = new Date();
  var agent = findRowByField_("agent_db", "agent_id", sanitizeText_(req.agent_id || req.agentId));
  if (!agent) throw new Error("Agent not found");
  var updated = shallowClone_(agent);

  updated.upgrade_status = sanitizeText_(req.upgrade_status || req.upgradeStatus);
  updated.tier_upgrade_eligible = sanitizeText_(req.tier_upgrade_eligible || req.tierUpgradeEligible || req.eligible || req.eligible_for_upgrade || req.eligibleForUpgrade);
  updated.eligible_for_upgrade = sanitizeText_(updated.tier_upgrade_eligible);
  if (sanitizeText_(updated.eligible_for_upgrade) === "TRUE" && !sanitizeText_(updated.upgrade_eligible_at)) {
    updated.upgrade_eligible_at = toIso_(now);
  }
  if (req.tier_upgrade_reminder_sent_at !== undefined || req.tierUpgradeReminderSentAt !== undefined) {
    updated.tier_upgrade_reminder_sent_at = sanitizeText_(req.tier_upgrade_reminder_sent_at || req.tierUpgradeReminderSentAt);
  } else if (!sanitizeText_(updated.tier_upgrade_reminder_sent_at)) {
    updated.tier_upgrade_reminder_sent_at = "";
  }
  syncAgentTierStatusFields_(updated, now);
  updated.updated_at = toIso_(now);
  updateRowByName_("agent_db", agent.__rowNum, updated);
  return { ok: true, version: HSC_VERSION, action: "adminSetAgentUpgrade", agent: updated };
}

// ============================================================
// 到期管理相關
// ============================================================

function getExpiringCards_(req) {
  var days = toNumber_(req.days || 30);
  var now = new Date();
  var end = addDays_(now, days);
  var rows = getSheetRowsByName_("card_db").filter(function(row) {
    var cardStatus = sanitizeText_(row.status).toLowerCase();
    var expiresAt = sanitizeText_(row.expires_at);
    if (!expiresAt) return false;
    var exp = new Date(expiresAt);
    if (isNaN(exp.getTime())) return false;
    return cardStatus === "active" && exp.getTime() >= now.getTime() && exp.getTime() <= end.getTime();
  });
  return { ok: true, version: HSC_VERSION, action: "getExpiringCards", days: days, cards: rows };
}

function getExpiredCards_(req) {
  var now = new Date();
  var rows = getSheetRowsByName_("card_db").filter(function(row) {
    var expiresAt = sanitizeText_(row.expires_at);
    if (!expiresAt) return false;
    var exp = new Date(expiresAt);
    if (isNaN(exp.getTime())) return false;
    return exp.getTime() < now.getTime() || sanitizeText_(row.expired_at) !== "";
  });
  return { ok: true, version: HSC_VERSION, action: "getExpiredCards", cards: rows };
}

function markCardRenewed_(req) {
  var now = new Date();
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");
  var plan = ensurePlanExists_(sanitizeText_(card.plan), sanitizeText_(card.tenant));
  var payment = emptyRow_("payment_db");
  payment.payment_id = generatePaymentId_();
  payment.card_id = card.id;
  payment.lead_id = findLeadIdByCardId_(card.id);
  payment.created_at = toIso_(now);
  payment.updated_at = toIso_(now);
  payment.event_type = sanitizeText_(req.event_type) || "renewal";
  payment.order_type = "renewal";
  payment.plan = card.plan;
  payment.amount = String(resolveRenewalAmount_(plan));
  payment.status = "pending";
  payment.paid_at = "";
  payment.due_at = sanitizeText_(req.due_at) || sanitizeText_(card.payment_due_at) || "";
  payment.method = "";
  payment.transaction_id = "";
  payment.billing_status_after = "";
  payment.note = sanitizeText_(req.note) || "renewal_pending";
  payment.created_by = sanitizeText_(req.created_by || req.createdBy || "system");
  payment.is_test = sanitizeText_(card.is_test) || "FALSE";
  payment.tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  payment.agent_id = sanitizeText_(card.agent_id);
  payment.share_card_id = sanitizeText_(card.share_card_id);
  payment.share_agent_id = sanitizeText_(card.share_agent_id);
  payment.share_source = sanitizeText_(card.share_source);
  payment.share_channel = sanitizeText_(card.share_channel);
  payment.commission_status = "pending";
  payment.card_status_before = sanitizeText_(card.status);
  payment.card_status_after = "active";
  payment.operated_by = sanitizeText_(req.operated_by || req.operatedBy || "system");
  payment.risk_flag = "FALSE";
  payment.risk_reason = "";
  payment.review_status = "";
  payment.reviewed_at = "";
  payment.refund_at = "";
  payment.refund_reason = "";
  payment.commission_processed_at = "";
  payment.commission_reversed_at = "";
  appendRowByName_("payment_db", payment);
  invalidateCardPublicCache_(card.id || card.card_id);
  return { ok: true, version: HSC_VERSION, action: "markCardRenewed", card_id: card.id, payment: payment };
}

function triggerExpiryCheck_(req) {
  var now = new Date();
  var cards = getSheetRowsByName_("card_db");
  var results = { locked_overdue: 0, expired: 0, touched: 0 };
  cards.forEach(function(card) {
    var changed = false;
    var updated = shallowClone_(card);
    var deliveredAt = toDateSafe_(card.delivered_at);
    var paymentPaidAt = sanitizeText_(card.payment_paid_at);
    var expiresAt = toDateSafe_(card.expires_at);
    if (deliveredAt && !paymentPaidAt) {
      var overdueLimit = addDays_(deliveredAt, CONFIG.PAYMENT_DUE_DAYS);
      if (now.getTime() > overdueLimit.getTime() && sanitizeText_(card.status) !== "locked") {
        updated.status = "locked";
        updated.billing_status = "overdue";
        updated.inactivated_at = toIso_(now);
        updated.updated_at = toIso_(now);
        changed = true;
        results.locked_overdue++;
      }
    }
    if (expiresAt && now.getTime() > expiresAt.getTime()) {
      if (sanitizeText_(updated.status) !== "expired") {
        updated.status = "expired";
        updated.billing_status = "expired";
        updated.expired_at = sanitizeText_(updated.expired_at) || toIso_(now);
        updated.updated_at = toIso_(now);
        changed = true;
        results.expired++;
      }
      syncAgentSelfRenewalByCard_(card.id, false, now, "card_expired");
    }
    if (changed) {
      updateRowByName_("card_db", card.__rowNum, updated);
      results.touched++;
    }
  });
  return { ok: true, version: HSC_VERSION, action: "triggerExpiryCheck", result: results };
}

function scheduledExpiryCheck_() {
  return triggerExpiryCheck_({ action: "triggerExpiryCheck" });
}

function scheduledExpiryCheck() {
  return triggerExpiryCheck_({ action: "triggerExpiryCheck" });
}

// ============================================================
// 公告相關
// ============================================================

function getAnnouncements_(req) {
  var tenant = getTenant_(req);
  var now = new Date();
  var rows = getSheetRowsByName_("announcement_db")
    .filter(function(row) { return isAnnouncementVisible_(row, tenant, now); })
    .sort(function(a, b) { return toNumber_(b.priority) - toNumber_(a.priority); });
  return { ok: true, version: HSC_VERSION, action: "getAnnouncements", announcements: rows };
}

function getAnnouncementDetail_(req) {
  var id = sanitizeText_(req.id);
  if (!id) throw new Error("Missing announcement id");
  var row = findRowByField_("announcement_db", "id", id);
  if (!row) throw new Error("Announcement not found");
  return { ok: true, version: HSC_VERSION, action: "getAnnouncementDetail", announcement:
 row };
}

function adminGetAnnouncements_(req) {
  var tenant = getTenant_(req);
  var rows = getSheetRowsByName_("announcement_db")
    .filter(function(row) { return sameTenant_(row.tenant, tenant); })
    .sort(function(a, b) { return toNumber_(b.priority) - toNumber_(a.priority); });
  return { ok: true, version: HSC_VERSION, action: "adminGetAnnouncements", announcements: rows };
}

function adminSaveAnnouncement_(req) {
  var now = new Date();
  var tenant = getTenant_(req);
  var id = sanitizeText_(req.id) || generateAnnouncementId_();
  var row = findRowByField_("announcement_db", "id", id);
  var isNew = !row;
  var target = row ? shallowClone_(row) : emptyRow_("announcement_db");
  target.id = id;
  target.title = sanitizeText_(req.title);
  target.content = sanitizeText_(req.content);
  target.type = sanitizeText_(req.type) || "general";
  target.status = sanitizeText_(req.status) || "draft";
  target.priority = String(toNumber_(req.priority));
  target.start_at = sanitizeText_(req.start_at || req.startAt);
  target.end_at = sanitizeText_(req.end_at || req.endAt);
  target.created_at = isNew ? toIso_(now) : sanitizeText_(target.created_at);
  target.updated_at = toIso_(now);
  target.created_by = sanitizeText_(req.created_by || req.createdBy || "system");
  target.tenant = tenant;
  if (isNew) {
    appendRowByName_("announcement_db", target);
  } else {
    updateRowByName_("announcement_db", row.__rowNum, target);
  }
  return { ok: true, version: HSC_VERSION, action: "adminSaveAnnouncement", created: isNew, announcement: target };
}

function adminToggleAnnouncement_(req) {
  var now = new Date();
  var id = sanitizeText_(req.id);
  if (!id) throw new Error("Missing announcement id");
  var row = findRowByField_("announcement_db", "id", id);
  if (!row) throw new Error("Announcement not found");
  var target = shallowClone_(row);
  var nextStatus = sanitizeText_(req.status) || (sanitizeText_(row.status) === "active" ? "inactive" : "active");
  target.status = nextStatus;
  target.updated_at = toIso_(now);
  updateRowByName_("announcement_db", row.__rowNum, target);
  return { ok: true, version: HSC_VERSION, action: "adminToggleAnnouncement", announcement: target };
}

function isAnnouncementVisible_(row, tenant, now) {
  if (!sameTenant_(row.tenant, tenant)) return false;
  if (sanitizeText_(row.status) !== "active") return false;
  if (sanitizeText_(row.start_at)) {
    var start = new Date(row.start_at);
    if (!isNaN(start.getTime()) && start.getTime() > now.getTime()) return false;
  }
  if (sanitizeText_(row.end_at)) {
    var end = new Date(row.end_at);
    if (!isNaN(end.getTime()) && end.getTime() < now.getTime()) return false;
  }
  return true;
}

// ============================================================
// 系統定時任務
// ============================================================

function installSystemTriggers_(req) {
  var projectTriggers = ScriptApp.getProjectTriggers();
  var existing = projectTriggers.map(function(t) {
    return { handler: t.getHandlerFunction(), event_type: String(t.getEventType()) };
  });
  var handlersNeeded = ["scheduledExpiryCheck"];
  var created = [];
  handlersNeeded.forEach(function(handlerName) {
    var found = projectTriggers.some(function(t) { return t.getHandlerFunction() === handlerName; });
    if (!found) {
      ScriptApp.newTrigger(handlerName).timeBased().everyDays(1).atHour(2).create();
      created.push(handlerName);
    }
  });
  return { ok: true, version: HSC_VERSION, action: "installSystemTriggers", existing: existing, created: created };
}

// ============================================================
// 核心輔助函式
// ============================================================

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheetByName_(schemaName) {
  var sheetName = CONFIG.SHEETS[schemaNameToConfigKey_(schemaName)] || schemaName;
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function schemaNameToConfigKey_(schemaName) {
  var map = {
    "card_db": "CARD",
    "lead_db": "LEAD",
    "invite_db": "INVITE",
    "plan_db": "PLAN",
    "payment_db": "PAYMENT",
    "renewal_db": "RENEWAL",
    "pricing_db": "PRICING",
    "commission_db": "COMMISSION",
    "commission_rules": "COMMISSION_RULES",
    "agent_db": "AGENT",
    "announcement_db": "ANNOUNCEMENT",
    "update_log_db": "UPDATE_LOG",
    "agent_policy_log": "AGENT_POLICY_LOG",
    "promo_rules": "PROMO_RULES",
    "request_db": "REQUEST",
    "service_log": "SERVICE_LOG",
    "add_on_order_db": "ADDON_ORDER",
    "ops_log_db": "OPS_LOG",
    "agent_settlement_report": "AGENT_SETTLEMENT_REPORT",
    "agent_points_log": "AGENT_POINTS_LOG",
    "agent_commission_log": "AGENT_COMMISSION_LOG",
    "tracking_log": "TRACKING",
    "recognition_db": "RECOGNITION"
  };
  if (!map[schemaName]) throw new Error("Unknown schema name: " + schemaName);
  return map[schemaName];
}
// ============================================================
// 請求層級 Sheet 快取
// ============================================================
var _sheetRowCache_ = {};
var _sheetRowCacheEnabled_ = true;

function clearSheetRowCache_(schemaName) {
  if (schemaName) {
    delete _sheetRowCache_[schemaName];
  } else {
    _sheetRowCache_ = {};
  }
}

function invalidateCacheOnWrite_(schemaName) {
  clearSheetRowCache_(schemaName);
}

function getSheetRowsByName_(schemaName) {
  if (_sheetRowCacheEnabled_ && _sheetRowCache_[schemaName]) {
    return _sheetRowCache_[schemaName];
  }

  var sheet = getSheetByName_(schemaName);
  var expectedHeaders = SCHEMA[schemaName];
  if (!expectedHeaders) throw new Error("Schema not defined: " + schemaName);

  var lastRow = sheet.getLastRow();
  var lastCol = expectedHeaders.length;
  var values = sheet.getRange(1, 1, Math.max(lastRow, 1), lastCol).getValues();
  var actualHeaders = values[0] || [];
  validateHeaders_(schemaName, actualHeaders);

  if (lastRow <= 1) {
    if (_sheetRowCacheEnabled_) _sheetRowCache_[schemaName] = [];
    return [];
  }

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var rowObj = {};
    for (var c = 0; c < expectedHeaders.length; c++) {
      rowObj[expectedHeaders[c]] = normalizeCell_(values[r][c]);
    }
    rowObj = normalizeRowDateFieldsForSchema_(schemaName, rowObj);
    rowObj.__rowNum = r + 1;
    rows.push(rowObj);
  }

  if (_sheetRowCacheEnabled_) _sheetRowCache_[schemaName] = rows;
  return rows;
}

function appendRowByName_(schemaName, rowObj) {
  var sheet = getSheetByName_(schemaName);
  var headers = SCHEMA[schemaName];
  validateHeaders_(schemaName, sheet.getRange(1, 1, 1, headers.length).getValues()[0]);
  var normalizedRow = ensureRequiredDueFieldsForSchema_(schemaName, normalizeRowDateFieldsForSchema_(schemaName, rowObj));
  var values = headers.map(function(h) {
    return normalizedRow[h] !== undefined ? normalizedRow[h] : "";
  });
  sheet.appendRow(values);
  invalidateCacheOnWrite_(schemaName);
  return sheet.getLastRow();
}

function updateRowByName_(schemaName, rowNum, rowObj) {
  var sheet = getSheetByName_(schemaName);
  var headers = SCHEMA[schemaName];
  validateHeaders_(schemaName, sheet.getRange(1, 1, 1, headers.length).getValues()[0]);
  var normalizedRow = ensureRequiredDueFieldsForSchema_(schemaName, normalizeRowDateFieldsForSchema_(schemaName, rowObj));
  var values = headers.map(function(h) {
    return normalizedRow[h] !== undefined ? normalizedRow[h] : "";
  });
  sheet.getRange(rowNum, 1, 1, headers.length).setValues([values]);
  invalidateCacheOnWrite_(schemaName);
}

function updateRowsByNameBatch_(schemaName, rowsToWrite) {
  rowsToWrite = Array.isArray(rowsToWrite) ? rowsToWrite : [];
  if (!rowsToWrite.length) return 0;

  var sheet = getSheetByName_(schemaName);
  var headers = SCHEMA[schemaName];
  validateHeaders_(schemaName, sheet.getRange(1, 1, 1, headers.length).getValues()[0]);

  rowsToWrite.forEach(function(entry) {
    if (!entry || !entry.rowNum || !entry.rowObj) return;
    var normalizedRow = ensureRequiredDueFieldsForSchema_(schemaName, normalizeRowDateFieldsForSchema_(schemaName, entry.rowObj));
    var values = headers.map(function(h) {
      return normalizedRow[h] !== undefined ? normalizedRow[h] : "";
    });
    sheet.getRange(entry.rowNum, 1, 1, headers.length).setValues([values]);
  });

  invalidateCacheOnWrite_(schemaName);
  return rowsToWrite.length;
}

function emptyRow_(schemaName) {
  var headers = SCHEMA[schemaName];
  var obj = {};
  headers.forEach(function(h) { obj[h] = ""; });
  return obj;
}

function writeOpsLog_(payload) {
  ensureAllSchemasOrThrow_();

  var now = new Date();
  var row = emptyRow_("ops_log_db");

  row.log_id = "OP" + Utilities.formatDate(now, CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);
  row.module = sanitizeText_(payload.module);
  row.action = sanitizeText_(payload.action);
  row.target_id = sanitizeText_(payload.target_id);
  row.before_status = sanitizeText_(payload.before_status);
  row.after_status = sanitizeText_(payload.after_status);
  row.operator = sanitizeText_(payload.operator || "system");
  row.created_at = sanitizeText_(payload.created_at) || toIso_(now);
  row.note = sanitizeText_(payload.note);
  row.tenant = sanitizeText_(payload.tenant) || CONFIG.DEFAULT_TENANT;

  appendRowByName_("ops_log_db", row);
  return row;
}

function opsLog_(module, action, targetId, beforeStatus, afterStatus, note) {
  return writeOpsLog_({
    module: module,
    action: action,
    target_id: targetId,
    before_status: beforeStatus,
    after_status: afterStatus,
    note: note
  });
}

function adminGrantAddon_(req)
 {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var now = new Date();
  var nowIso = toIso_(now);

  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var operator = sanitizeText_(req.operator || req.admin || req.operated_by || req.operatedBy || "admin");
  var note = sanitizeText_(req.note || "admin_grant_addon");
  var tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;

  var giftPhotoQty = Number(req.gift_photo_qty || req.photo_qty || 0);
  var giftCtaQty = Number(req.gift_cta_qty || req.cta_qty || 0);

  var giftMarquee = String(req.gift_marquee || req.marquee || "").toUpperCase() === "TRUE";
  var giftUpdateUnlimited = String(req.gift_update_unlimited || req.update_unlimited || "").toUpperCase() === "TRUE";

  if (isNaN(giftPhotoQty) || giftPhotoQty < 0) throw new Error("gift_photo_qty must be >= 0");
  if (isNaN(giftCtaQty) || giftCtaQty < 0) throw new Error("gift_cta_qty must be >= 0");

  if (!giftPhotoQty && !giftCtaQty && !giftMarquee && !giftUpdateUnlimited) {
    throw new Error("No addon gift specified");
  }

  var updated = shallowClone_(card);
  var changes = [];

  function pushChange_(field, beforeVal, afterVal) {
    if (String(beforeVal) === String(afterVal)) return;
    changes.push({ field: field, before: beforeVal, after: afterVal });
  }

  if (giftPhotoQty > 0) {
    var beforePhotoExtra = Number(updated.photo_extra_purchased || 0);
    var afterPhotoExtra = beforePhotoExtra + giftPhotoQty;
    updated.photo_extra_purchased = String(afterPhotoExtra);

    var basePhotoLimit = Number(updated.photo_limit || 0);
    var nextPhotoLimit = Math.min(PHOTO_LIMIT_ABSOLUTE_MAX, basePhotoLimit + giftPhotoQty);
    updated.photo_limit = String(nextPhotoLimit);

    pushChange_("photo_extra_purchased", beforePhotoExtra, afterPhotoExtra);
    pushChange_("photo_limit", basePhotoLimit, nextPhotoLimit);
  }

  if (giftCtaQty > 0) {
    var beforeCtaExtra = Number(updated.cta_extra_purchased || 0);
    var afterCtaExtra = beforeCtaExtra + giftCtaQty;
    var planBaseCta = sanitizeText_(updated.plan) === "premium" ? 3 : 1;
    var beforeCtaLimit = planBaseCta + beforeCtaExtra;
    var nextCtaLimit = planBaseCta + afterCtaExtra;

    updated.cta_extra_purchased = String(afterCtaExtra);
    updated.cta_limit = String(nextCtaLimit);

    pushChange_("cta_extra_purchased", beforeCtaExtra, afterCtaExtra);
    pushChange_("cta_limit", beforeCtaLimit, nextCtaLimit);
  }

  if (giftMarquee) {
    var beforeMarqueePurchased = sanitizeText_(updated.marquee_purchased);
    var beforeMarqueeEnabled = sanitizeText_(updated.marquee_enabled);
    updated.marquee_purchased = "TRUE";
    if (!sanitizeText_(updated.marquee_enabled)) updated.marquee_enabled = "TRUE";
    pushChange_("marquee_purchased", beforeMarqueePurchased, updated.marquee_purchased);
    pushChange_("marquee_enabled", beforeMarqueeEnabled, updated.marquee_enabled);

  }

  if (giftUpdateUnlimited) {
    var beforeOverrideEnabled = sanitizeText_(updated.update_limit_override_enabled);
    var beforeOverrideValue = sanitizeText_(updated.update_limit_override_value);
    updated.update_limit_override_enabled = "TRUE";
    updated.update_limit_override_value = "-1";
    pushChange_("update_limit_override_enabled", beforeOverrideEnabled, updated.update_limit_override_enabled);
    pushChange_("update_limit_override_value", beforeOverrideValue, updated.update_limit_override_value);
  }

  if (!changes.length) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminGrantAddon",
      unchanged: true,
      card_id: cardId,
      card: card
    };
  }

  updated.updated_at = nowIso;
  updateRowByName_("card_db", card.__rowNum, updated);

  for (var i = 0; i < changes.length; i++) {
    writeOpsLog_({
      module: "addon_gift",
      action: "grant",
      target_id: cardId,
      before_status: changes[i].field + ":" + String(changes[i].before),
      after_status: changes[i].field + ":" + String(changes[i].after),
      operator: operator,
      created_at: nowIso,
      note: note,
      tenant: tenant
    });
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminGrantAddon",
    card_id: cardId,
    changes: changes,
    card: updated
  };
}
function validateHeaders_(schemaName, actualHeaders) {
  var expected = SCHEMA[schemaName];
  var actual = actualHeaders.slice(0, expected.length).map(function(v) {
    return String(v || "").trim();
  });
  if (actual.length !== expected.length) {
    throw new Error("Header length mismatch in " + schemaName);
  }
  for (var i = 0; i < expected.length; i++) {
    if (expected[i] !== actual[i]) {
      throw new Error("Header mismatch in " + schemaName + " at col " + (i + 1) + ": expected [" + expected[i] + "] but got [" + actual[i] + "]");
    }
  }
}

function findRowByField_(schemaName, field, value) {
  var rows = getSheetRowsByName_(schemaName);
  var target = normalizeCell_(value);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeCell_(rows[i][field]) === target) return rows[i];
  }
  return null;
}

function findRowsByField_(schemaName, field, value) {
  var rows = getSheetRowsByName_(schemaName);
  var target = normalizeCell_(value);
  return rows.filter(function(row) {
    return normalizeCell_(row[field]) === target;
  });
}

function ensureUniqueValue_(schemaName, field, value) {
  if (!value) return;
  var exists = findRowByField_(schemaName, field, value);
  if (exists) throw new Error(schemaName + "." + field + " already exists: " + value);
}

function ensureUniqueGeneratedValue_(schemaName, field, generatorFn, maxTry) {
  var maxLoop = maxTry || 10;
  for (var i = 0; i < maxLoop; i++) {
    var value = generatorFn();
    var exists = findRowByField_(schemaName, field, value);
    if (!exists) return value;
  }
  throw new Error("Failed to generate unique value for " + schemaName + "." + field);
}

function getTenant_(req) {
  return sanitizeText_(req.tenant) || CONFIG.DEFAULT_TENANT;
}

function validateTransactionIdUnique_(txId, currentPaymentId) {
  var clean = sanitizeText_(txId);
  if (!clean) return;
  var exists = getSheetRowsByName_("payment_db").some(function(row) {
    if (sanitizeText_(row.transaction_id) !== clean) return false;
    if (currentPaymentId && sanitizeText_(row.payment_id) === sanitizeText_(currentPaymentId)) return false;
    return true;
  });
  if (exists) throw new Error("transaction_id already exists");
}

function mergeNote_(oldNote, extra) {
  var a = sanitizeText_(oldNote);
  var b = sanitizeText_(extra);
  if (!a) return b;
  if (!b) return a;
  return a + " | " + b;
}

function nowIso_() {
  return toIso_(new Date());
}

function toIso_(dateObj) {
  return Utilities.formatDate(dateObj, CONFIG.DEFAULT_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
}

function addDays_(dateObj, days) {
  var d = new Date(dateObj.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function addHours_(dateObj, hours) {
  var d = new Date(dateObj.getTime());
  d.setHours(d.getHours() + hours);
  return d;
}

function findPricingRowByItemCode_(itemCode, tenant) {
  var code = sanitizeText_(itemCode);
  var t = sanitizeText_(tenant) || CONFIG.DEFAULT_TENANT;
  if (!code) return null;

  var rows = getSheetRowsByName_(CONFIG.SHEETS.PRICING || "pricing_db");
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (sanitizeText_(row.item_code) !== code) continue;
    if (!sameTenant_(row.tenant, t)) continue;
    if (normalizeStatus_(row.status || "active") !== "active") return;
    return row;
  }
  return null;
}

function getPricingValue_(itemCode, fallbackValue, tenant) {
  var row = findPricingRowByItemCode_(itemCode, tenant);
  if (!row) return fallbackValue;
  return Number(row.price) || fallbackValue || 0;
}

function getPlanOriginalPrice_(planId, tenant) {
  var planNorm = normalizePlanValue_(planId);
  if (planNorm === "premium") return getPricingValue_("plan_premium", 0, tenant);
  return getPricingValue_("plan_free", 0, tenant);
}

function getPlanRenewalPrice_(planId, tenant) {
  var planNorm = normalizePlanValue_(planId);

  if (planNorm === "premium") {
    return getPricingValue_("renewal_premium", 0, tenant);
  }

  return getPricingValue_("renewal_free", 0, tenant);
}

function getPlanUpgradeDiff_(currentPlan, targetPlan, tenant) {
  if (!isPlanUpgrade_(currentPlan, targetPlan)) return 0;

  var currentPrice = getPlanOriginalPrice_(currentPlan, tenant);
  var targetPrice = getPlanOriginalPrice_(targetPlan, tenant);

  return Math.max(0, targetPrice - currentPrice);
}

function calcRenewalAddonAmount_(opts, tenant) {
  var keepMarquee = !!opts.keep_marquee;
  var keepPhoto = Number(opts.keep_photo_extra_qty || 0);
  var keepCta = Number(opts.keep_cta_extra_qty || 0);
  var updateUnlimited = !!opts.update_unlimited_renew;

  var pricePhoto = getPricingValue_("addon_photo", 0, tenant);
  var priceCta = getPricingValue_("addon_cta", 0, tenant);
  var priceMarquee = getPricingValue_("addon_marquee", 0, tenant);
  var priceUpdateUnlimited = getPricingValue_("renewal_update_unlimited", 0, tenant);
  var priceBundle = getPricingValue_("addon_bundle", 0, tenant);

  var total = 0;

  var marqueeCost = keepMarquee ? priceMarquee : 0;
  var updateCost = updateUnlimited ? priceUpdateUnlimited : 0;

  total += keepPhoto * pricePhoto;
  total += keepCta * priceCta;

  if (keepMarquee && updateUnlimited && priceBundle > 0) {
    total += priceBundle;
  } else {
    total += marqueeCost + updateCost;
  }

  return total;
}

function parseJsonSafe_(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  var text = String(value).trim();

  if (!text || text === "null" || text === "undefined") {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    Logger.log("parseJsonSafe_ failed: " + err + " / value = " + text);
    return fallback;
  }
}

const OFFLINE_PAYMENT_INFO = {
  bank_name: "請改成你的銀行名稱",
  bank_code: "請改成你的銀行代碼",
  account_name: "請改成你的戶名",
  account_no_masked: "請改成你的帳號",
  note: "匯款後請回覆付款單編號、帳號末五碼、匯款時間、匯款金額。"
};

const COMMERCIAL_TRIGGER_PLAN = [
  { fn: "triggerExpiryCheck_", type: "daily", hour: 1 },
  { fn: "triggerOverdueLock_", type: "daily", hour: 1, minute: 10 },
  { fn: "adminCheckSchemaStatus_", type: "daily", hour: 2 },
  { fn: "repairAddonOrderStatuses_", type: "daily", hour: 2, minute: 10 },
  { fn: "expirePendingAddonOrders_", type: "daily", hour: 2, minute: 20 },
  { fn: "triggerPaymentReminder_", type: "daily", hour: 9 },
  { fn: "triggerAddonPaymentReminder_", type: "daily", hour: 9, minute: 5 },
  { fn: "triggerRenewalReminder_", type: "daily", hour: 9, minute: 10 },
  { fn: "triggerRenewalPaymentReminder_", type: "daily", hour: 9, minute: 20 },
  { fn: "runCommissionEngineSweep_", type: "daily", hour: 23, minute: 40 },
  { fn: "runDailyOps_", type: "daily", hour: 23, minute: 50 }
];

const COMMISSION_STATUS_ALLOWED = ["pending", "approved", "paid", "frozen", "reversed", "rejected"];

/***********************
 * 一鍵建立：建卡＋線下付款
 ***********************/
function createCardWithOfflinePayment_(req) {
  ensureAllSchemasOrThrow_();

  req = req || {};

  var inviteCode = sanitizeText_(req.invite_code || req.inviteCode);
  if (!inviteCode) throw new Error("Missing invite_code");

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    throw new Error("系統忙碌，無法完成建卡流程，請稍後再試。");
  }

  try {
    clearSheetRowCache_("invite_db");

    var invite = findInviteByCode_(inviteCode);
    if (!invite) throw new Error("Invite not found");

    var validity = evaluateInviteValidity_(invite);
    if (!validity.valid) throw new Error(validity.reason);

    req.invite_code = inviteCode;
    req.referrer = sanitizeText_(invite.referrer) || "";
    req.service_agent = sanitizeText_(invite.service_agent) || "";
    req.agent_type = normalizeAgentType_(invite.agent_type || "customer");

    var marqueeText = sanitizeText_(req.marquee_text);
    var marqueePurchased = toBoolean_(req.marquee_purchased);
    var features = parseJsonSafe_(req.features_json, {});
    if (!features || typeof features !== "object") features = {};

    if (!marqueePurchased) {
      marqueePurchased = toBoolean_(features.marquee_purchased) || toBoolean_(features.marquee_enabled);
    }

    var shouldEnableMarquee = !!marqueePurchased && marqueeText !== "" && marqueeText !== "0" && marqueeText !== "false";

    var createCardReq = {
      lead_id: req.lead_id,
      invite_code: inviteCode,
      referrer: req.referrer,
      service_agent: req.service_agent,
      agent_type: req.agent_type,
      plan: req.plan,
      name: req.name,
      phone: sanitizePhoneAsText_(req.phone),
      email: req.email,

      color: req.color,
      style: req.style,
      paper: req.paper,
      note: req.note,
      process_status: "pending",
      is_test: req.is_test,
      unit: req.unit,
      title: req.title,
      slogan: req.slogan,
      services: req.services,
      experience: req.experience,
      wechat_id: req.wechat_id,
      line_url: req.line_url,
      line_oa: req.line_oa,
      address: req.address,
      website: req.website,
      video1: req.video1,
      video2: req.video2,
      video3: req.video3,
      social1: req.social1,
      social2: req.social2,
      social3: req.social3,
      avatar_url: req.avatar_url,
      logo_url: req.logo_url,
      photo1_url: req.photo1_url,
      photo2_url: req.photo2_url,
      photo3_url: req.photo3_url,
      photo4_url: req.photo4_url,
      photo5_url: req.photo5_url,
      photo6_url: req.photo6_url,
      photo7_url: req.photo7_url,
      photo8_url: req.photo8_url,
      photo9_url: req.photo9_url,
      photo10_url: req.photo10_url,
      avatar_key: req.avatar_key,
      logo_key: req.logo_key,
      photo1_key: req.photo1_key,
      photo2_key: req.photo2_key,
      photo3_key: req.photo3_key,
      photo4_key: req.photo4_key,
      photo5_key: req.photo5_key,
      photo6_key: req.photo6_key,
      photo7_key: req.photo7_key,
      photo8_key: req.photo8_key,
      photo9_key: req.photo9_key,
      photo10_key: req.photo10_key,
      cta_text_1: req.cta_text_1,
      cta_link_1: req.cta_link_1,
      cta_text_2: req.cta_text_2,
      cta_link_2: req.cta_link_2,
      cta_text_3: req.cta_text_3,
      cta_link_3: req.cta_link_3,
      addon_items: Array.isArray(req.addon_items) ? req.addon_items : [],
      features_json: req.features_json ? (typeof req.features_json === "string" ? req.features_json : JSON.stringify(req.features_json)) : "",
      form_ts: sanitizeText_(req.form_ts || req.formTs)
    };

    if (shouldEnableMarquee) {
      createCardReq.marquee_purchased = "TRUE";
      createCardReq.marquee_enabled = "TRUE";
      createCardReq.marquee_text = marqueeText;
    }

    var leadResult = sanitizeText_(req.lead_id || req.leadId) ? null : createLead_(req);
    var leadId = sanitizeText_(req.lead_id || req.leadId) ||
      sanitizeText_(leadResult && leadResult.lead_id) ||
      sanitizeText_(leadResult && leadResult.id) ||
      sanitizeText_(leadResult && leadResult.lead && leadResult.lead.lead_id) ||
      sanitizeText_(leadResult && leadResult.lead && leadResult.lead.id) ||
      "";

    if (!leadId) {
      throw new Error("createCardWithOfflinePayment_: createLead_ succeeded but no lead_id was returned");
    }
    createCardReq.lead_id = leadId;

    var cardResult = createCard_(createCardReq);

    var createdCardId = sanitizeText_(cardResult && cardResult.card_id) ||
      sanitizeText_(cardResult && cardResult.id) ||
      sanitizeText_(cardResult && cardResult.card && cardResult.card.card_id) ||
      sanitizeText_(cardResult && cardResult.card && cardResult.card.id) ||
      "";

    if (!createdCardId) {
      throw new Error("createCardWithOfflinePayment_: createCard_ succeeded but no card_id was returned");
    }

    var paymentResult = createOfflinePayment_({
      card_id: createdCardId,
      lead_id: leadId,
      amount: req.amount,
      event_type: "first_payment",
      order_type: "offline_transfer",
      note: req.note,
      due_at: req.due_at
    });

    incrementInviteUsage_(inviteCode, createdCardId);

    var createdPaymentId = sanitizeText_(paymentResult && paymentResult.payment_id) ||
      sanitizeText_(paymentResult && paymentResult.id) ||
      sanitizeText_(paymentResult && paymentResult.payment && paymentResult.payment.payment_id) ||
      sanitizeText_(paymentResult && paymentResult.payment && paymentResult.payment.id) ||
      "";

    if (cardResult && cardResult.card && paymentResult && paymentResult.payment) {
      cardResult.card.payment_due_at = paymentResult.payment.due_at || "";
      cardResult.card.url = CONFIG.BASE_URL + "index.html?id=" + encodeURIComponent(createdCardId) + "&view=1";
    }

    var marqueeWarning = marqueePurchased && !shouldEnableMarquee ? "marquee_purchased=true but marquee_text is empty, marquee not enabled" : "";

    return {
      ok: true,
      version: HSC_VERSION,
      action: "createCardWithOfflinePayment",
      lead_id: leadId,
      card_id: createdCardId,
      payment_id: createdPaymentId,
      card: (cardResult && cardResult.card) ? cardResult.card : cardResult,
      payment: (paymentResult && paymentResult.payment) ? paymentResult.payment : paymentResult,
      payment_notice: paymentResult ? paymentResult.payment_notice : null,
      marquee: {
        enabled: !!shouldEnableMarquee,
        marquee_text: shouldEnableMarquee ? marqueeText : "",
        warning: marqueeWarning
      },
      marquee_result: {
        ok: true,
        handled_in_create_card: true,
        enabled: !!shouldEnableMarquee,
        marquee_text: shouldEnableMarquee ? marqueeText : "",
        warning: marqueeWarning
      }
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      Logger.log("createCardWithOfflinePayment_ lock release failed: " + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
    }
  }
}

function requireCardByIdOrToken_(req) {
  req = req || {};

  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  var token = sanitizeText_(req.token || req.update_token || req.updateToken);

  var card = null;

  if (cardId) {
    card = findRowByField_("card_db", "id", cardId);
  }

  if (!card && token) {
    card = findRowByField_("card_db", "token", token);
    if (!card) card = findRowByField_("card_db", "update_token", token);
  }

  if (!card) {
    throw new Error("Card not found");
  }

  return card;
}

/***********************
 * 線下付款單建立
 ***********************/
function parseOptionalNonNegativeInt_(value, fieldName, maxValue, allowBlank) {
  var raw = (value === null || value === undefined) ? "" : String(value).trim();

  if (raw === "") {
    if (allowBlank) return "";
    throw new Error("Missing " + (fieldName || "value"));
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error((fieldName || "value") + " must be a non-negative integer");
  }

  var n = Number(raw);
  if (!isFinite(n)) {
    throw new Error((fieldName || "value") + " must be a valid number");
  }

  if (n < 0) {
    throw new Error((fieldName || "value") + " must be a non-negative integer");
  }

  if (maxValue !== null && maxValue !== undefined && maxValue !== "" && n > Number(maxValue)) {
    throw new Error((fieldName || "value") + " exceeds max allowed");
  }

  return Math.floor(n);
}

function parseUpdateLimitOverrideValue_(value) {
  var raw = (value === null || value === undefined) ? "" : String(value).trim();

  if (raw === "") return "";
  if (raw === "-1") return "-1";

  var parsed = parseOptionalNonNegativeInt_(raw,
 "update_limit_override_value", 9999, false);
  return String(parsed);
}

function resolvePaymentAmount_(req, card) {
  var rawAmount = sanitizeText_(req.amount);

  if (rawAmount !== "") {
    return parseOptionalNonNegativeInt_(rawAmount, "amount", 9999999, false);
  }

  var planId = sanitizeText_(card && card.plan);
  if (!planId) {
    throw new Error("Missing amount");
  }

  var planRow = findRowByField_("plan_db", "plan_id", planId);
  if (!planRow) {
    throw new Error("Plan not found for amount fallback: " + planId);
  }

  var planPrice = sanitizeText_(planRow.price);
  if (planPrice === "") {
    throw new Error("Plan price missing: " + planId);
  }

  return parseOptionalNonNegativeInt_(planPrice, "amount", 9999999, false);
}

function findLeadIdByCardId_(cardId) {
  var id = sanitizeText_(cardId);
  if (!id) return "";

  var rows = getSheetRowsByName_("lead_db");
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || {};
    if (sanitizeText_(row.converted_card_id) === id) {
      return sanitizeText_(row.lead_id || row.id);
    }
  }

  return "";
}
function updateCardPaymentDueAt_(cardId, dueAt) {
  var id = sanitizeText_(cardId);
  var due = sanitizeText_(dueAt);
  if (!id || !due) return;

  var card = findRowByField_("card_db", "id", id);
  if (!card) return;

  var updated = shallowClone_(card);
  updated.payment_due_at = due;
  updated.updated_at = nowIso_();
  updateRowByName_("card_db", card.__rowNum, updated);
  invalidateCardPublicCache_(updated.id || updated.card_id);
}

function updateLeadConvertedCardId_(leadId, cardId) {
  var id = sanitizeText_(leadId);
  var cid = sanitizeText_(cardId);
  if (!id || !cid) return;

  var lead = findRowByField_("lead_db", "lead_id", id);
  if (!lead) return;

  var updated = shallowClone_(lead);
  updated.converted_card_id = cid;
  if (!sanitizeText_(updated.converted_at)) {
    updated.converted_at = nowIso_();
  }
  updated.updated_at = nowIso_();
  updateRowByName_("lead_db", lead.__rowNum, updated);
}

function getPaymentAgentSnapshot_(card, preferredAgentId) {
  card = card || {};

  var resolvedAgentId =
    sanitizeText_(preferredAgentId) ||
    sanitizeText_(card.owner_agent_id) ||
    sanitizeText_(card.agent_id);

  var snapshot = {
    agent_id: resolvedAgentId,
    agent_type: "",
    member_tier: ""
  };

  var agent = null;
  if (resolvedAgentId) {
    try {
      agent = findRowByField_(CONFIG.SHEETS.AGENT || "agent_db", "agent_id", resolvedAgentId);
    } catch (e) {
      agent = null;
    }
  }

  snapshot.agent_type = sanitizeText_((agent || {}).agent_type) || sanitizeText_(card.owner_agent_type) || sanitizeText_(card.agent_type);
  snapshot.agent_type = normalizeAgentTypeForSheet_(snapshot.agent_type);
  snapshot.member_tier = mapAgentTypeToTier_(snapshot.agent_type);

  return snapshot;
}

function resolvePaymentShareAgentId_(card, req) {
  card = card || {};
  req = req || {};
  return (
    sanitizeText_(req.share_agent_id || req.shareAgentId) ||
    sanitizeText_(card.share_agent_id) ||
    sanitizeText_(card.referrer) ||
    sanitizeText_(card.service_agent)

  );
}

function resolvePaymentShareSource_(card, req) {
  card = card || {};
  req = req || {};
  return (
    sanitizeText_(req.share_source || req.shareSource) ||
    sanitizeText_(card.share_source) ||
    sanitizeText_(card.source) ||
    "invite"
  );
}

function resolvePaymentShareChannel_(card, req, snapshot) {
  card = card || {};
  req = req || {};
  snapshot = snapshot || {};
  return (
    sanitizeText_(req.share_channel || req.shareChannel) ||
    sanitizeText_(card.share_channel) ||
    sanitizeText_(card.owner_agent_type) ||
    sanitizeText_(snapshot.agent_type) ||
    sanitizeText_(card.agent_type) ||
    "service"
  );
}

function createOfflinePayment_(req) {
  ensureAllSchemasOrThrow_();

  var now = new Date();
  var card = requireCardByIdOrToken_(req);
  var eventType = sanitizeText_(req.event_type) || "first_payment";
  if (hasPendingOfflinePaymentByCard_(card.id, eventType)) {
    throw new Error("Pending offline payment already exists for this card");
  }

  var amount = resolvePaymentAmount_(req, card);
  if (amount <= 0) throw new Error("amount must be greater than 0");

  var dueAt = normalizeIsoDateTimeValue_(
    sanitizeText_(req.due_at) ||
    sanitizeText_(card.payment_due_at) ||
    toIso_(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
  );
  if (!dueAt) throw new Error("payment due_at is required");

  var payment = emptyRow_("payment_db");
  payment.payment_id = generatePaymentId_();
  payment.card_id = sanitizeText_(card.id);
  payment.lead_id =
    sanitizeText_(req.lead_id || req.leadId) ||
    findLeadIdByCardId_(card.id);

  payment.created_at = toIso_(now);
  payment.updated_at = toIso_(now);
  payment.event_type = eventType;
  payment.order_type = sanitizeText_(req.order_type) || "offline_transfer";
  payment.plan = sanitizeText_(card.plan);
  payment.amount = String(amount);
  payment.status = "pending";
  payment.paid_at = "";
  payment.due_at = dueAt;
  payment.method = "bank_transfer";
  payment.payment_channel = "offline_transfer";
  payment.transaction_id = "";
  payment.billing_status_after = "";
  payment.note = sanitizeText_(req.note);
  payment.created_by = sanitizeText_(req.created_by || req.createdBy || "system");
  payment.is_test = sanitizeText_(req.is_test || card.is_test) || "FALSE";
  payment.tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;

  var paymentAgentSnapshot = getPaymentAgentSnapshot_(card, req.agent_id || req.agentId);

  payment.agent_id = paymentAgentSnapshot.agent_id;
  payment.agent_type = paymentAgentSnapshot.agent_type;
  payment.member_tier = paymentAgentSnapshot.member_tier;

  payment.share_card_id =
    sanitizeText_(req.share_card_id || req.shareCardId) ||
    sanitizeText_(card.share_card_id) ||
    sanitizeText_(card.id);

  payment.share_agent_id = resolvePaymentShareAgentId_(card, req);
  payment.share_source = resolvePaymentShareSource_(card, req);
  payment.share_channel = resolvePaymentShareChannel_(card, req, paymentAgentSnapshot);

  payment.commission_status = "pending";
  payment.card_status_before = sanitizeText_(card.status);
  payment.card_status_after = "active";
  payment.operated_by = sanitizeText_(req.operated_by || req.operatedBy || "system");
  payment.risk_flag = "FALSE";
  payment.risk_reason = "";
  payment.review_status = "";
  payment.reviewed_at = "";
  payment.refund_at = "";
  payment.refund_reason = "";
  payment.commission_processed_at = "";
  payment.commission_reversed_at = "";

  if (payment.agent_id) ensureAgentExists_(payment.agent_id, { card: card, source: "offline_payment_agent", tenant: payment.tenant });
  if (payment.share_agent_id) ensureAgentExists_(payment.share_agent_id, { card: card, source: "offline_payment_share_agent", tenant: payment.tenant });

  appendRowByName_("payment_db", payment);
  updateCardPaymentDueAt_(card.id, payment.due_at);
  card.payment_due_at = payment.due_at;

  return {
    ok: true,
    version: HSC_VERSION,
    action: "createOfflinePayment",
    payment: payment,
    payment_notice: buildPaymentNoticePayload_(card, payment)
  };
}
/***********************
 * 客戶提交付款回報
 ***********************/
function submitOfflinePaymentProof_(req) {
  ensureAllSchemasOrThrow_();

  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  if (sanitizeText_(payment.status) === "paid") throw new Error("Payment already paid");
  if (hasPaymentProofSubmitted_(payment)) throw new Error("Payment proof already submitted");

  var proofNote = [
    "payer_name=" + sanitizeText_(req.payer_name || req.payerName),
    "account_last5=" + sanitizeText_(req.transfer_account_last5 || req.account_last5 || req.accountLast5),
    "transfer_amount=" + sanitizeText_(req.transfer_amount || req.transferAmount),
    "transfer_time=" + sanitizeText_(req.transfer_time || req.transferTime),
    "proof_image_url=" + sanitizeText_(req.proof_image_url || req.proofImageUrl),
    "proof_submitted_at=" + nowIso_(),
    "review_status=submitted"
  ].join(" ; ");

  var updated = shallowClone_(payment);
  updated.note = mergeNote_(updated.note, proofNote);
  updated.updated_at = nowIso_();
  updateRowByName_("payment_db", payment.__rowNum, updated);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "submitOfflinePaymentProof",
    payment: updated
  };
}

/***********************
 * 客服確認線下付款
 ***********************/
function confirmOfflinePayment_(req) {
  ensureAllSchemasOrThrow_();

  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  if (!hasPaymentProofSubmitted_(payment)) throw new Error("Payment proof not submitted");
  var result = confirmPayment_({
    payment_id: req.payment_id || req.paymentId,
    transaction_id: req.transaction_id || req.transactionId,
    paid_at: req.paid_at || req.paidAt || nowIso_(),
    method: "bank_transfer",
    note: mergeNote_(sanitizeText_(req.note), "offline_confirmed"),
    operated_by: req.operated_by || req.operatedBy || "system"
  });

  var card = result.card;
  return {
    ok: true,
    version: HSC_VERSION,
    action: "confirmOfflinePayment",
    payment: result.payment,
    card: card,
    commission_result: result.commission_result,
    paid_notice: buildPaidNoticePayload_(card, result.payment),
    delivery_notice: buildDeliveryNoticePayload_(card)
  };
}

/***********************
 * 付款通知文案
 ***********************/

function buildCardAccessUrls_(card) {
  card = card || {};
  var cardId = sanitizeText_(card.id
 || card.card_id);
  var base = normalizeBaseUrl_(CONFIG.BASE_URL);
  return {
    card_id: cardId,
    preview_url: base + "card.html?id=" + encodeURIComponent(cardId) + "&mode=preview",
    delivery_url: base + "card.html?id=" + encodeURIComponent(cardId),
    update_url: sanitizeText_(card.update_token)
      ? (base + "form.html?mode=update&token=" + encodeURIComponent(sanitizeText_(card.update_token)))
      : (base + "form.html?mode=update&card_id=" + encodeURIComponent(cardId)),
    renew_url: base + "form.html?mode=renew&card_id=" + encodeURIComponent(cardId),
    poster_hint: "交付卡內可查看名片、分享名片與下載海報"
  };
}

function buildPaymentNoticeText_(req) {
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");

  var card = findRowByField_("card_db", "id", sanitizeText_(payment.card_id));
  if (!card) throw new Error("Card not found");

  return buildPaymentNoticePayload_(card, payment);
}

function buildPaymentNoticePayload_(card, payment) {
  var urls = buildCardAccessUrls_(card);
  var copyText = [
    "您好，您的智慧名片成品已完成，這是成品預覽連結：",
    urls.preview_url,
    "",
    "請先確認內容是否正確。",
    "若內容無誤，請於 " + sanitizeText_(payment.due_at || card.payment_due_at) + " 前完成繳款。",
    "",
    "【付款資訊】",
    "付款單編號：" + sanitizeText_(payment.payment_id),
    "付款金額：NT$" + sanitizeText_(payment.amount),
    "付款方式：銀行轉帳",
    "銀行名稱：" + OFFLINE_PAYMENT_INFO.bank_name,
    "銀行代碼：" + OFFLINE_PAYMENT_INFO.bank_code,
    "帳號：" + OFFLINE_PAYMENT_INFO.account_no_masked,
    "戶名：" + OFFLINE_PAYMENT_INFO.account_name,
    "",
    "【權益說明】",
    "1. 目前提供的是成品預覽連結，方便您先確認內容。",
    "2. 確認收到款項後，才會提供正式交付卡連結。",
    "3. 正式使用效期 365 天，將自確認付款日起算。",
    "4. 若超過付款期限未完成繳款，預覽連結與開通資格將依系統規則調整。",
    "",
    "匯款後請回覆以下資訊：",
    "1. 付款單編號：" + sanitizeText_(payment.payment_id),
    "2. 匯款帳號末五碼：",
    "3. 匯款時間：",
    "4. 匯款金額：",
    "",
    OFFLINE_PAYMENT_INFO.note
  ].join("\n");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "buildPaymentNoticeText",
    payment_id: sanitizeText_(payment.payment_id),
    card_id: sanitizeText_(card.id),
    preview_url: urls.preview_url,
    delivery_url: "",
    update_url: "",
    renew_url: "",
    copy_text: copyText
  };
}

/***********************
 * 交付卡通知文案
 ***********************/
function buildDeliveryNoticeText_(req) {
  var card = requireCardByIdOrToken_(req);
  return buildDeliveryNoticePayload_(card);
}

function buildDeliveryNoticePayload_(card) {
  var urls = buildCardAccessUrls_(card);
  var copyText = [
    "已確認收到您的款項，智慧名片正式開通完成。",
    "這是您的交付卡連結：",
    urls.delivery_url,
    "",
    "【同步提供】",
    "成品預覽：" + urls.preview_url,
    "更新表單：" + urls.update_url,
    "續約表單：" + urls.renew_url,
    "",
    "您的名片使用效期自今日起算 365 天。",
    urls.poster_hint
  ].join("\n");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "buildDeliveryNoticeText",
    card_id: sanitizeText_(card.id),
    preview_url: urls.preview_url,
    delivery_url: urls.delivery_url,

    update_url: urls.update_url,
    renew_url: urls.renew_url,
    copy_text: copyText
  };
}

function buildPaidNoticeText_(req) {
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  if (sanitizeText_(payment.status) !== "paid") throw new Error("Payment not paid yet");

  var card = findRowByField_("card_db", "id", sanitizeText_(payment.card_id));
  if (!card) throw new Error("Card not found");

  return buildPaidNoticePayload_(card, payment);
}

function buildPaidNoticePayload_(card, payment) {
  var urls = buildCardAccessUrls_(card);
  var copyText = [
    "已確認收到您的款項，智慧名片正式開通完成。",
    "付款單編號：" + sanitizeText_(payment.payment_id),
    "卡片編號：" + sanitizeText_(card.id),
    "",
    "【交付卡】",
    urls.delivery_url,
    "",
    "【同步提供】",
    "成品預覽：" + urls.preview_url,
    "更新表單：" + urls.update_url,
    "續約表單：" + urls.renew_url,
    "",
    "您的名片使用效期自付款確認日起算 365 天。",
    urls.poster_hint
  ].join("\n");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "buildPaidNoticeText",
    payment_id: sanitizeText_(payment.payment_id),
    card_id: sanitizeText_(card.id),
    preview_url: urls.preview_url,
    delivery_url: urls.delivery_url,
    update_url: urls.update_url,
    renew_url: urls.renew_url,
    copy_text: copyText
  };
}

/***********************
 * 未付款單查詢
 ***********************/
function isOfflineTransferPayment_(payment) {
  var row = payment || {};
  var orderType = sanitizeText_(row.order_type).toLowerCase();
  var method = sanitizeText_(row.method).toLowerCase();
  var channel = sanitizeText_(row.payment_channel).toLowerCase();
  return (
    orderType === "offline_transfer" ||
    method === "bank_transfer" ||
    channel === "offline_transfer"
  );
}

function getAddonOrderDueAt_(order) {
  order = order || {};
  var explicitDueAt = sanitizeText_(order.due_at || order.expire_at || order.payment_due_at);
  if (explicitDueAt) return explicitDueAt;

  var createdAt = toDateSafe_(order.created_at);
  if (!createdAt) return "";
  return toIso_(addDays_(createdAt, CONFIG.PAYMENT_DUE_DAYS));
}

function isAddonOrderOverdue_(order, nowMs) {
  order = order || {};
  if (sanitizeText_(order.status).toLowerCase() !== "pending") return false;
  var dueAt = toDateSafe_(getAddonOrderDueAt_(order));
  if (!dueAt) return false;
  nowMs = nowMs || Date.now();
  return dueAt.getTime() < nowMs;
}

function buildAddonOrderCountdown_(order, nowMs) {
  order = order || {};
  var dueAtText = getAddonOrderDueAt_(order);
  var dueAt = toDateSafe_(dueAtText);
  nowMs = nowMs || Date.now();

  if (sanitizeText_(order.status).toLowerCase() === "paid") {
    return {
      status: "paid",
      label: "已付款",
      is_overdue: false,
      is_today: false,
      days_remaining: 0,
      due_at: dueAtText
    };
  }

  if (sanitizeText_(order.status).toLowerCase() === "cancelled") {
    return {
      status: "cancelled",
      label: "已取消",
      is_overdue: false,
      is_today: false,
      days_remaining: null,
      due_at: dueAtText
    };
  }

  if (!dueAt) {
    return {
      status: "",
      label: "",
      is_overdue: false,
      is_today: false,
      days_remaining: null,
      due_at: ""
    };
  }

  var diffMs = dueAt.getTime() - nowMs;
  var dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < 0) {
    var overdueDays = Math.ceil(Math.abs(diffMs) / dayMs);
    if (overdueDays < 1) overdueDays = 1;
    return {
      status: "overdue",
      label: "已逾期 " + overdueDays + " 天",
      is_overdue: true,
      is_today: false,
      days_remaining: -overdueDays,
      due_at: dueAtText
    };
  }

  var remainingDays = Math.ceil(diffMs / dayMs);
  if (remainingDays <= 1) {
    return {
      status: "due_today",
      label: "今日到期",
      is_overdue: false,
      is_today: true,
      days_remaining: 0,
      due_at: dueAtText
    };
  }

  return {
    status: "counting",
    label: "剩餘 " + remainingDays + " 天",
    is_overdue: false,
    is_today: false,
    days_remaining: remainingDays,
    due_at: dueAtText
  };
}

function getPendingOfflinePayments_(req) {
  var tenant = getTenant_(req);
  var rows = getSheetRowsByName_("payment_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant) &&
      sanitizeText_(row.status).toLowerCase() === "pending" &&
      isOfflineTransferPayment_(row);
  }).sort(function(a, b) {
    return sanitizeText_(a.due_at).localeCompare(sanitizeText_(b.due_at));
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPendingOfflinePayments",
    payments: rows
  };
}

/***********************
 * 自動付款提醒
 ***********************/
/***********************
 * 自動付款提醒
 ***********************/
function triggerPaymentReminder_() {
  var now = new Date().getTime();
  var payments = getSheetRowsByName_("payment_db");
  var dueSoon = [];

  payments.forEach(function(row) {
    if (sanitizeText_(row.status).toLowerCase() !== "pending") return;
    if (!isOfflineTransferPayment_(row)) return;
    var dueAt = toDateSafe_(row.due_at);
    if (!dueAt) return;
    var diff = dueAt.getTime() - now;
    if (diff > 0 && diff <= 24 * 60 * 60 * 1000) {
      dueSoon.push({
        payment_id: row.payment_id,
        card_id: row.card_id,
        due_at: row.due_at,
        amount: row.amount
      });
    }
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "triggerPaymentReminder",
    count: dueSoon.length,
    due_soon: dueSoon
  };
}

/***********************
 * 未付款逾期自動停卡
 ***********************/
/***********************
 * 未付款逾期自動停卡
 ***********************/
function triggerOverdueLock_() {
  var now = new Date();
  var nowIso = toIso_(now);

  var payments = getSheetRowsByName_("payment_db");
  var locked = [];

  payments.forEach(function(payment) {
    var eventType = sanitizeText_(payment.event_type);
    var paymentStatus = sanitizeText_(payment.status).toLowerCase();
    var billingStatus = sanitizeText_(payment.billing_status).toLowerCase();
    var cardId = sanitizeText_(payment.card_id);
    var dueAtText = normalizeIsoDateTimeValue_(payment.due_at);
    var dueAt = toDateSafe_(dueAtText);

    if (eventType !== "first_payment") return;
    if (!cardId) return;
    if (!dueAtText || !dueAt) return;
    if (paymentStatus === "paid" || billingStatus === "paid" || sanitizeText_(payment.paid_at)) return;
    if (now.getTime() <= dueAt.getTime()) return;

    var card = findRowByField_("card_db", "id", cardId);
    if (!card) return;
    if (sanitizeText_(card.payment_paid_at)) return;

    var cardStatus = sanitizeText_(card.status).toLowerCase();
    if (cardStatus === "locked" || cardStatus
 === "inactive") return;

    var updatedCard = shallowClone_(card);
    updatedCard.status = "locked";
    updatedCard.billing_status = "overdue";
    updatedCard.payment_due_at = dueAtText;
    updatedCard.inactivated_at = nowIso;
    updatedCard.updated_at = nowIso;
    updateRowByName_("card_db", card.__rowNum, updatedCard);

    var updatedPayment = shallowClone_(payment);
    updatedPayment.status = "overdue";
    updatedPayment.billing_status = "overdue";
    updatedPayment.due_at = dueAtText;
    updatedPayment.updated_at = nowIso;
    updateRowByName_("payment_db", payment.__rowNum, updatedPayment);

    locked.push({
      card_id: updatedCard.id,
      payment_id: updatedPayment.payment_id,
      due_at: updatedPayment.due_at,
      card_status: updatedCard.status,
      billing_status: updatedCard.billing_status
    });
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "triggerOverdueLock",
    locked_count: locked.length,
    locked: locked
  };
}

/***********************
 * 續約收款引擎 helpers
 ***********************/
function computeRenewalDueAtIso_(currentExpiresAt, fallbackIso) {
  var fallback = toDateSafe_(fallbackIso) || new Date();
  return toIso_(addDays_(fallback, CONFIG.PAYMENT_DUE_DAYS || 3));
}

function formatRenewalDateForDisplay_(value) {
  var dt = toDateSafe_(value);
  if (!dt) return sanitizeText_(value);
  return toIso_(dt);
}

function normalizeRenewalReminderStage_(stage) {
  stage = sanitizeText_(stage).toLowerCase();
  var allowed = ["none", "pre_due_2d", "due_today", "overdue_1d", "overdue_3d", "paid"];
  return allowed.indexOf(stage) !== -1 ? stage : "none";
}

function resolveRenewalEffectiveDueAt_(renewal, fallbackIso) {
  renewal = renewal || {};

  var paymentId = sanitizeText_(renewal.payment_id);
  if (paymentId) {
    var payment = findRowByField_(CONFIG.SHEETS.PAYMENT || "payment_db", "payment_id", paymentId);
    var paymentDueAt = normalizeIsoDateTimeValue_(payment && payment.due_at);
    if (paymentDueAt) return paymentDueAt;
  }

  var renewalDueAt = normalizeIsoDateTimeValue_(renewal.due_at);
  if (renewalDueAt) return renewalDueAt;

  return normalizeIsoDateTimeValue_(fallbackIso);
}

function buildRenewalCountdownInfo_(renewal, nowMs) {
  nowMs = nowMs || Date.now();
  var effectiveDueAt = resolveRenewalEffectiveDueAt_(renewal, renewal && renewal.due_at);
  var due = toDateSafe_(effectiveDueAt);
  var paidAt = sanitizeText_((renewal || {}).paid_at);
  var status = sanitizeText_((renewal || {}).status).toLowerCase();
  var billing = sanitizeText_((renewal || {}).billing_status).toLowerCase();
  if (paidAt || status === "paid" || billing === "paid") {
    return { status: "paid", label: "已付款", is_today: false, is_overdue: false, days_remaining: 0, due_at: effectiveDueAt };
  }
  if (!due) {
    return { status: "", label: "", is_today: false, is_overdue: false, days_remaining: null, due_at: effectiveDueAt };
  }
  var dueMs = due.getTime();
  var diffDays = Math.ceil((dueMs - nowMs) / 86400000);
  if (nowMs > dueMs) {
    var overdueDays = Math.max(1, Math.ceil((nowMs - dueMs) / 86400000));

    return { status: "overdue", label: "已逾期 " + overdueDays + " 天", is_today: false, is_overdue: true, days_remaining: -overdueDays, due_at: toIso_(due) };
  }
  if (diffDays <= 0) {
    return { status: "due_today", label: "今日到期", is_today: true, is_overdue: false, days_remaining: 0, due_at: toIso_(due) };
  }
  return { status: "counting", label: "剩餘 " + diffDays + " 天", is_today: false, is_overdue: false, days_remaining: diffDays, due_at: toIso_(due) };
}

function resolveRenewalReminderStageByCountdown_(info) {
  if (!info) return "none";
  if (info.status === "paid") return "paid";
  if (info.is_today) return "due_today";
  if (info.is_overdue) return info.days_remaining <= -3 ? "overdue_3d" : "overdue_1d";
  if (info.days_remaining !== null && info.days_remaining <= 2) return "pre_due_2d";
  return "none";
}

function listPendingRenewals_(tenant) {
  return getSheetRowsByName_(CONFIG.SHEETS.RENEWAL || "renewal_db").filter(function(row) {
    if (!sameTenant_(row.tenant, tenant)) return false;
    var status = sanitizeText_(row.status).toLowerCase();
    var billing = sanitizeText_(row.billing_status).toLowerCase();
    if (status === "paid" || billing === "paid") return false;
    return status === "pending" || status === "overdue" || status === "unpaid" || !status;
  });
}

function triggerRenewalPaymentReminder_(req) {
  req = req || {};
  var tenant = getTenant_(req);
  var nowMs = Date.now();
  var renewals = listPendingRenewals_(tenant);
  var dueSoon = [];
  renewals.forEach(function(row) {
    var info = buildRenewalCountdownInfo_(row, nowMs);
    var stage = resolveRenewalReminderStageByCountdown_(info);
    if (stage === "none" || stage === "paid") return;
    dueSoon.push({
      renewal_id: sanitizeText_(row.renewal_id),
      card_id: sanitizeText_(row.card_id),
      total_amount: toNumber_(row.total_amount),
      due_at: info.due_at,
      reminder_stage: stage,
      countdown_label: info.label,
      last_reminded_at: sanitizeText_(row.last_reminded_at)
    });
    if (row.__rowNum && normalizeRenewalReminderStage_(row.reminder_stage) !== stage) {
      var updated = shallowClone_(row);
      updated.reminder_stage = stage;
      updated.last_reminded_at = toIso_(new Date());
      updated.updated_at = toIso_(new Date());
      updateRowByName_(CONFIG.SHEETS.RENEWAL || "renewal_db", updated.__rowNum, updated);
    }
  });
  return { ok: true, version: HSC_VERSION, action: "triggerRenewalPaymentReminder", count: dueSoon.length, due_soon: dueSoon };
}

function adminGetRenewalList_(req) {
  req = req || {};
  var tenant = getTenant_(req);
  var nowMs = Date.now();
  var rows = getSheetRowsByName_(CONFIG.SHEETS.RENEWAL || "renewal_db").filter(function(r) { return sameTenant_(r.tenant, tenant); });
  var statusFilter = sanitizeText_(req.status).toLowerCase();
  if (statusFilter) rows = rows.filter(function(r){ return sanitizeText_(r.status).toLowerCase() === statusFilter; });
  rows = rows.map(function(r){
    var info = buildRenewalCountdownInfo_(r, nowMs);
    return {
      renewal_id: sanitizeText_(r.renewal_id), card_id: sanitizeText_(r.card_id), status: sanitizeText_(r.status), billing_status: sanitizeText_(r.billing_status),
      current_plan: sanitizeText_(r.current_plan), target_plan: sanitizeText_(r.target_plan), total_amount: toNumber_(r.total_amount),
      current_expires_at: formatRenewalDateForDisplay_(r.current_expires_at), due_at: info.due_at || formatRenewalDateForDisplay_(r.due_at), paid_at: formatRenewalDateForDisplay_(r.paid_at),
      reminder_stage: normalizeRenewalReminderStage_(r.reminder_stage), countdown_label: info.label, last_reminded_at: formatRenewalDateForDisplay_(r.last_reminded_at)
    };
  }).sort(function(a,b){ return toTimestampMs_(a.due_at) - toTimestampMs_(b.due_at); });
  return { ok:true, version:HSC_VERSION, action:"adminGetRenewalList", count: rows.length, renewals: rows };
}

function adminMarkRenewalPaid_(req) {
  req = req || {};
  var renewalId = sanitizeText_(req.renewal_id || req.renewalId);
  if (!renewalId) throw new Error("Missing renewal_id");
  var renewal = findRowByField_(CONFIG.SHEETS.RENEWAL || "renewal_db", "renewal_id", renewalId);
  if (!renewal || !renewal.__rowNum) throw new Error("Renewal not found");
  var nowIso = toIso_(new Date());
  var updated = shallowClone_(renewal);
  updated.status = "paid";
  updated.billing_status = "paid";
  updated.paid_at = nowIso;
  updated.reminder_stage = "paid";
  updated.last_reminded_at = sanitizeText_(updated.last_reminded_at) || nowIso;
  updated.updated_at = nowIso;
  updateRowByName_(CONFIG.SHEETS.RENEWAL || "renewal_db", updated.__rowNum, updated);
  return { ok:true, version:HSC_VERSION, action:"adminMarkRenewalPaid", renewal_id: renewalId, renewal: updated };
}

/***********************
 * 續約提醒
 ***********************/
function triggerRenewalReminder_() {
  var now = new Date().getTime();
  var cards = getSheetRowsByName_("card_db");
  var remind = [];

  cards.forEach(function(card) {
    var exp = toDateSafe_(card.expires_at);
    if (!exp) return;
    var diff = exp.getTime() - now;
    if (diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000) {
      remind.push({
        card_id: card.id,
        expires_at: card.expires_at,
        owner_phone: card.owner_phone || card.phone
      });
    }
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "triggerRenewalReminder",
    count: remind.length,
    cards: remind
  };
}

/***********************
 * 自動分潤
 ***********************/
function createCommissionFromPayment_(payment, item, rewardType, rewardRate) {
  if (commissionExistsByPaymentId_(payment.payment_id)) return null;
  var card = findRowByField_("card_db", "id", sanitizeText_(payment.card_id));
  if (!card) return null;

  var beneficiaryAgentId = sanitizeText_(card.agent_id || payment.share_agent_id || payment.agent_id);
  if (!beneficiaryAgentId) return null;

  var baseAmount = toNumber_(payment.amount);
  var rewardAmount = rewardType === "cash" ? roundMoney_(baseAmount * rewardRate) : 0;
  var rewardPoints = rewardType === "points" ? roundMoney_(baseAmount * rewardRate) : 0;

  var row = emptyRow_("commission_db");
  row.commission_id = generateCommissionId_();
  row.payment_id = payment.payment_id;
  row.card_id = payment.card_id;
  row.lead_id = payment.lead_id;
  row.created_at = nowIso_();
  row.updated_at = nowIso_();
  row.beneficiary_agent_id = beneficiaryAgentId;
  row.source_agent_id = sanitizeText_(payment.agent_id);
  row.source_card_id = sanitizeText_(payment.card_id);
  row.reward_type = rewardType;
  row.item = item;
  row.base_amount = String(baseAmount);
  row.reward_rate = String(rewardRate);
  row.reward_amount = String(rewardAmount);
  row.reward_points = String(rewardPoints);
  row.status
 = "pending";
  row.rule_id = "";
  row.calculated_at = nowIso_();
  row.paid_at = "";
  row.frozen_at = "";
  row.unfrozen_at = "";
  row.freeze_reason = "";
  row.commission_batch_id = "";
  row.is_reversal = "FALSE";
  row.reversal_of = "";
  row.reversal_at = "";
  row.note = "";
  row.tenant = sanitizeText_(payment.tenant) || CONFIG.DEFAULT_TENANT;

  appendRowByName_("commission_db", row);
  return row;
}

function createCommissionFromAddonOrder_(order) {
  if (commissionExistsByAddonOrderId_(order.addon_order_id)) return null;
  var card = findRowByField_("card_db", "id", sanitizeText_(order.card_id));
  if (!card) return null;

  var beneficiaryAgentId = sanitizeText_(card.agent_id);
  if (!beneficiaryAgentId) return null;

  var baseAmount = toNumber_(order.amount);
  var rewardRate = 0.10;

  var row = emptyRow_("commission_db");
  row.commission_id = generateCommissionId_();
  row.payment_id = "";
  row.card_id = order.card_id;
  row.lead_id = findLeadIdByCardId_(order.card_id);
  row.created_at = nowIso_();
  row.updated_at = nowIso_();
  row.beneficiary_agent_id = beneficiaryAgentId;
  row.source_agent_id = sanitizeText_(card.agent_id);
  row.source_card_id = sanitizeText_(card.id);
  row.reward_type = "cash";
  row.item = "addon_photo";
  row.base_amount = String(baseAmount);
  row.reward_rate = String(rewardRate);
  row.reward_amount = String(roundMoney_(baseAmount * rewardRate));
  row.reward_points = "0";
  row.status = "pending";
  row.rule_id = "";
  row.calculated_at = nowIso_();
  row.paid_at = "";
  row.frozen_at = "";
  row.unfrozen_at = "";
  row.freeze_reason = "";
  row.commission_batch_id = "";
  row.is_reversal = "FALSE";
  row.reversal_of = "";
  row.reversal_at = "";
  row.note = "addon_order_id=" + sanitizeText_(order.addon_order_id);
  row.tenant = sanitizeText_(order.tenant) || CONFIG.DEFAULT_TENANT;

  appendRowByName_("commission_db", row);
  return row;
}

function getCommissions_(req) {
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status).toLowerCase();
  var agentId = sanitizeText_(req.agent_id || req.agentId);

  var rows = getSheetRowsByName_("commission_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });

  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status).toLowerCase() === status; });
  if (agentId) rows = rows.filter(function(row) { return sanitizeText_(row.beneficiary_agent_id) === agentId; });

  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCommissions",
    commissions: rows
  };
}

function approveCommission_(req) {
  var commissionId = sanitizeText_(req.commission_id || req.commissionId);
  if (!commissionId) throw new Error("Missing commission_id");

  var row = findRowByField_("commission_db", "commission_id", commissionId);
  if (!row) throw new Error("Commission not found");

  if (sanitizeText_(row.status) === "paid") throw new Error("Commission already paid");
  if (sanitizeText_(row.status) === "reversed") throw new Error("Commission already reversed");

  var updated = shallowClone_(row);
  updated.status = "approved";
  updated.updated_at = nowIso_();
  updateRowByName_("commission_db", row.__rowNum, updated);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "approveCommission",
    commission: updated
  };
}

function markCommissionPaid_(req) {
  var commissionId = sanitizeText_(req.commission_id || req.commissionId);
  if (!commissionId) throw new Error("Missing commission_id");

  var row = findRowByField_("commission_db", "commission_id", commissionId);
  if (!row) throw new Error("Commission not found");

  if (sanitizeText_(row.status) === "paid") throw new Error("Commission already paid");
  if (sanitizeText_(row.status) === "reversed") throw new Error("Commission already reversed");

  var updated = shallowClone_(row);
  updated.status = "paid";
  updated.paid_at = nowIso_();
  updated.updated_at = nowIso_();
  updateRowByName_("commission_db", row.__rowNum, updated);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "markCommissionPaid",
    commission: updated
  };
}

/***********************
 * 加購完整流程
 ***********************/
const ADDON_PRODUCT_RULES = {
  photo_pack_3: { addon_type: "photo", qty: 3, unit_price: 100, label: "照片加購 3 張" },
  photo_pack_5: { addon_type: "photo", qty: 5, unit_price: 150, label: "照片加購 5 張" },
  photo_pack_10: { addon_type: "photo", qty: 10, unit_price: 250, label: "照片加購 10 張" }
};

function getAddonOrders_(req) {
  req = req || {};

  var tenant = getTenant_(req);
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var status = sanitizeText_(req.status).toLowerCase();
  var nowMs = Date.now();
  var rows = getSheetRowsByName_("add_on_order_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });
  if (cardId) rows = rows.filter(function(row) { return sanitizeText_(row.card_id) === cardId; });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status).toLowerCase() === status; });
  rows.sort(function(a, b) { return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });

  rows = rows.map(function(row) {
    var enriched = shallowClone_(row);
    enriched.due_at = getAddonOrderDueAt_(row);
    enriched.countdown = buildAddonOrderCountdown_(row, nowMs);
    enriched.is_overdue = enriched.countdown.is_overdue;
    return enriched;
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAddonOrders",
    addon_orders: rows
  };
}
function getAdminCardDashboard_(req) {
  ensureAllSchemasOrThrow_();

  req = req || {};
  requireAdminKeyOrSystem_(req);

  var tenant = getTenant_(req);
  var nowMs = Date.now();

  var cards = getDashboardCards_(tenant);
  var payments = getDashboardPayments_(tenant);
  var pendingCommissions = getDashboardPendingCommissions_(tenant);
  var pendingAddons = getDashboardPendingAddons_(tenant);
  var pendingRenewals = getDashboardPendingRenewals_(tenant);

  var latestPaymentMap = buildLatestPaymentMap_(payments);
  var updateCountMap = buildUpdateCountMap_(tenant);

  var summary = {
    cards_total: cards.length,
    unpaid_cards: 0,
    due_today_cards: 0,
    overdue_cards: 0,
    pending_commission_count: pendingCommissions.length,
    pending_addon_count: pendingAddons.length,
    pending_addon_due_today_count: pendingAddons.filter(function(item) { return !!item.is_today; }).length,
    pending_addon_overdue_count: pendingAddons.filter(function(item) { return !!item.is_overdue; }).length,
    renewal_pending_count: pendingRenewals.length,
    renewal_due_today_count: pendingRenewals.filter(function(item){ return !!item.is_today; }).length,
    renewal_overdue_count: pendingRenewals.filter(function(item){ return !!item.is_overdue; }).length
  };

  var dueToday = [];
  var overdue = [];

  var enrichedCards = cards.map(function(card) {
    var latestPayment = latestPaymentMap[sanitizeText_(card.id)] || null;
    var enriched = enrichAdminDashboardCard_(card, latestPayment, nowMs, updateCountMap);
    var cardBillingStatus = sanitizeText_(enriched.billing_status).toLowerCase();
    var latestPaymentStatus = sanitizeText_(enriched.latest_payment_status).toLowerCase();
    var countAsCardUnpaid = cardBillingStatus !== "paid";

    if (countAsCardUnpaid) {
      summary.unpaid_cards++;
    }

    if (!enriched.renewal_payment_pending && latestPaymentStatus !== "paid") {
      if (enriched.payment_countdown && enriched.payment_countdown.is_today) {
        summary.due_today_cards++;
        dueToday.push(buildAdminDashboardAlertItem_(card, latestPayment, enriched.payment_countdown.label, enriched));
      }

      if (isDashboardCardOverdue_(enriched)) {
        summary.overdue_cards++;
        overdue.push(buildAdminDashboardAlertItem_(card, latestPayment, resolveDashboardOverdueLabel_(enriched), enriched));
      }
    }

    return enriched;
  });

  enrichedCards = sortDashboardCards_(enrichedCards);
  dueToday = sortDashboardAlertItems_(dueToday);
  overdue = sortDashboardAlertItems_(overdue);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAdminCardDashboard",
    summary: summary,
    cards: enrichedCards,
    alerts: {
      due_today: dueToday,
      overdue: overdue,
      pending_commissions: pendingCommissions,
      pending_addons: pendingAddons,
      pending_renewals: pendingRenewals
    }
  };
}

function getDashboardCards_(tenant) {
  return getSheetRowsByName_("card_db")
    .filter(function(row) {
      return sameTenant_(row.tenant, tenant);
    })
    .sort(function(a, b) {
      return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
    });
}

function getDashboardPayments_(tenant) {
  return getSheetRowsByName_("payment_db")
    .filter(function(row) {
      return sameTenant_(row.tenant, tenant);
    })
    .sort(function(a, b) {
      var aTs = toTimestampMs_(a.updated_at || a.created_at || a.paid_at || a.due_at);
      var bTs = toTimestampMs_(b.updated_at || b.created_at || b.paid_at || b.due_at);
      return bTs - aTs;
    });
}

function getDashboardPendingCommissions_(tenant) {
  return getSheetRowsByName_("payment_db")
    .filter(function(row) {
      if (!sameTenant_(row.tenant, tenant)) return false;
      if (sanitizeText_(row.status).toLowerCase() !== "paid") return false;

      var eventType = sanitizeText_(row.event_type);
      var orderType = sanitizeText_(row.order_type);
      var commissionStatus = sanitizeText_(row.commission_status).toLowerCase();

      var isCommissionRelevant =
        eventType === "first_payment" ||
        eventType === "renewal" ||
        orderType === "renewal" ||
        eventType === "addon_payment";

      if (!isCommissionRelevant) return false;


      return !commissionStatus || commissionStatus === "pending";
    })
    .sort(function(a, b) {
      return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
    })
    .map(function(row) {
      return {
        payment_id: sanitizeText_(row.payment_id),
        card_id: sanitizeText_(row.card_id),
        amount: Number(row.amount || 0),
        event_type: sanitizeText_(row.event_type),
        order_type: sanitizeText_(row.order_type),
        commission_status: sanitizeText_(row.commission_status),
        paid_at: sanitizeText_(row.paid_at),
        created_at: sanitizeText_(row.created_at)
      };
    });
}

function getDashboardPendingAddons_(tenant) {
  var nowMs = Date.now();
  return getSheetRowsByName_("add_on_order_db")
    .filter(function(row) {
      return sameTenant_(row.tenant, tenant) &&
        sanitizeText_(row.status).toLowerCase() === "pending";
    })
    .sort(function(a, b) {
      var aCountdown = buildAddonOrderCountdown_(a, nowMs);
      var bCountdown = buildAddonOrderCountdown_(b, nowMs);
      if (!!aCountdown.is_overdue !== !!bCountdown.is_overdue) {
        return aCountdown.is_overdue ? -1 : 1;
      }
      return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
    })
    .map(function(row) {
      var countdown = buildAddonOrderCountdown_(row, nowMs);
      return {
        addon_order_id: sanitizeText_(row.addon_order_id),
        card_id: sanitizeText_(row.card_id),
        addon_type: sanitizeText_(row.addon_type),
        addon_key: sanitizeText_(row.addon_key),
        item_code: sanitizeText_(row.item_code),
        item_name: sanitizeText_(row.item_name),
        qty: Number(row.qty || 0),
        amount: Number(row.amount || 0),
        status: sanitizeText_(row.status),
        created_at: sanitizeText_(row.created_at),
        due_at: countdown.due_at,
        countdown_label: countdown.label,
        is_overdue: countdown.is_overdue,
        is_today: countdown.is_today
      };
    });
}

function buildLatestPaymentMap_(payments) {
  var map = {};

  (payments || []).forEach(function(row) {
    var cardId = sanitizeText_(row.card_id);
    if (!cardId) return;

    var current = map[cardId];
    if (!current) {
      map[cardId] = row;
      return;
    }

    var currentTs = toTimestampMs_(current.updated_at || current.created_at || current.paid_at || current.due_at);
    var nextTs = toTimestampMs_(row.updated_at || row.created_at || row.paid_at || row.due_at);

    if (nextTs >= currentTs) {
      map[cardId] = row;
    }
  });

  return map;
}

function getDashboardCardSortPriority_(card) {
  card = card || {};
  var countdown = card.payment_countdown || {};
  var latestPaymentStatus = sanitizeText_(card.latest_payment_status).toLowerCase();
  var billingStatus = sanitizeText_(card.billing_status).toLowerCase();

  if (card.renewal_payment_pending) return 0;
  if (countdown && countdown.is_overdue) return 1;
  if (countdown && countdown.is_today) return 2;
  if (latestPaymentStatus === "pending" || billingStatus === "unpaid" || billingStatus === "overdue")
 {
    if (countdown && countdown.days_remaining !== null && countdown.days_remaining !== undefined) return 3;
    return 4;
  }
  return 5;
}

function sortDashboardCards_(cards) {
  return (cards || []).slice().sort(function(a, b) {
    var pa = getDashboardCardSortPriority_(a);
    var pb = getDashboardCardSortPriority_(b);
    if (pa !== pb) return pa - pb;

    var aDue = toTimestampMs_(a && a.payment_due_at);
    var bDue = toTimestampMs_(b && b.payment_due_at);
    if (aDue !== bDue) {
      if (!aDue) return 1;
      if (!bDue) return -1;
      return aDue - bDue;
    }

    var aCreate = toTimestampMs_(a && a.created_at);
    var bCreate = toTimestampMs_(b && b.created_at);
    return bCreate - aCreate;
  });
}

function sortDashboardAlertItems_(items) {
  return (items || []).slice().sort(function(a, b) {
    var aDue = toTimestampMs_(a && a.payment_due_at);
    var bDue = toTimestampMs_(b && b.payment_due_at);
    if (aDue !== bDue) {
      if (!aDue) return 1;
      if (!bDue) return -1;
      return aDue - bDue;
    }
    return sanitizeText_(a && a.card_id).localeCompare(sanitizeText_(b && b.card_id));
  });
}

function getDashboardPendingRenewals_(tenant) {
  var nowMs = Date.now();
  return listPendingRenewals_(tenant)
    .map(function(row) {
      var info = buildRenewalCountdownInfo_(row, nowMs);
      return {
        renewal_id: sanitizeText_(row.renewal_id),
        card_id: sanitizeText_(row.card_id),
        status: sanitizeText_(row.status),
        billing_status: sanitizeText_(row.billing_status),
        total_amount: toNumber_(row.total_amount),
        due_at: info.due_at || formatRenewalDateForDisplay_(row.due_at),
        countdown_label: info.label,
        is_overdue: !!info.is_overdue,
        is_today: !!info.is_today,
        reminder_stage: resolveRenewalReminderStageByCountdown_(info),
        last_reminded_at: formatRenewalDateForDisplay_(row.last_reminded_at)
      };
    })
    .sort(function(a, b) {
      return toTimestampMs_(a.due_at) - toTimestampMs_(b.due_at);
    });
}

function enrichAdminDashboardCard_(card, latestPayment, nowMs, updateCountMap) {
  var cardId = sanitizeText_(card.id);
  var latestPaymentStatus =
    sanitizeText_(latestPayment && latestPayment.status).toLowerCase() ||
    sanitizeText_(card.billing_status).toLowerCase() ||
    "unpaid";
  var latestPaymentEventType = sanitizeText_(latestPayment && latestPayment.event_type).toLowerCase();
  var latestPaymentOrderType = sanitizeText_(latestPayment && latestPayment.order_type).toLowerCase();
  var renewalPaymentPending = !!latestPayment &&
    latestPaymentStatus === "pending" &&
    (latestPaymentEventType === "renewal" || latestPaymentOrderType === "renewal");

  var paymentDueAt = resolveDashboardPaymentDueAt_(card, latestPayment);
  var paymentPaidAt =
    renewalPaymentPending ? "" : normalizeIsoDateTimeValue_((latestPayment ? sanitizeText_(latestPayment.paid_at) : "") ||
    sanitizeText_(card.payment_paid_at));

  var countdown = buildDashboardCountdown_(paymentDueAt, paymentPaidAt, nowMs);
  countdown = normalizeDashboardCountdownByCardState_(countdown, card, latestPayment, nowMs);

  return {
    card_id: cardId,
    name: sanitizeText_(card.name),
    plan: sanitizeText_(card.plan),
    status: sanitizeText_(card.status),
    billing_status: sanitizeText_(card.billing_status),

    created_at: sanitizeText_(card.created_at),
    delivered_at: sanitizeText_(card.delivered_at),
    expires_at: formatRenewalDateForDisplay_(card.expires_at),

    payment_due_at: formatRenewalDateForDisplay_(paymentDueAt),
    payment_paid_at: formatRenewalDateForDisplay_(paymentPaidAt),

    latest_payment_id: latestPayment ? sanitizeText_(latestPayment.payment_id || latestPayment.id) : "",
    latest_payment_amount: latestPayment ? Number(latestPayment.amount || 0) : 0,
    latest_payment_status: latestPaymentStatus,
    latest_payment_event_type: latestPaymentEventType,
    latest_payment_order_type: latestPaymentOrderType,
    renewal_payment_pending: renewalPaymentPending,

    referrer: sanitizeText_(card.referrer),
    service_agent: sanitizeText_(card.service_agent),
    agent_type: sanitizeText_(card.agent_type),

    free_update_remaining: getDashboardFreeUpdateRemaining_(card, updateCountMap),
    unlimited_update_flag: isDashboardUnlimitedUpdate_(card),

    preview_url: buildDashboardPreviewUrl_(cardId),
    delivery_url: buildDashboardDeliveryUrl_(cardId),
    update_form_url: buildDashboardUpdateUrl_(cardId),
    renew_form_url: buildDashboardRenewUrl_(cardId),

    payment_countdown: countdown
  };
}

function resolveDashboardPaymentDueAt_(card, latestPayment) {
  var latestPaymentStatus = sanitizeText_(latestPayment && latestPayment.status).toLowerCase();
  var latestPaymentEventType = sanitizeText_(latestPayment && latestPayment.event_type).toLowerCase();
  var latestPaymentOrderType = sanitizeText_(latestPayment && latestPayment.order_type).toLowerCase();
  var cardBillingStatus = sanitizeText_(card && card.billing_status).toLowerCase();
  var cardPaidAt = normalizeIsoDateTimeValue_(card && card.payment_paid_at);
  var renewalPaymentPending =
    !!latestPayment &&
    latestPaymentStatus === "pending" &&
    (latestPaymentEventType === "renewal" || latestPaymentOrderType === "renewal");

  var hasPaidState = latestPaymentStatus === "paid" || cardBillingStatus === "paid" || !!cardPaidAt;

  if (hasPaidState && !renewalPaymentPending) {
    return "";
  }

  var latestDueAt = normalizeIsoDateTimeValue_(latestPayment && latestPayment.due_at);
  if (latestDueAt) return latestDueAt;

  var cardDueAt = normalizeIsoDateTimeValue_(card && card.payment_due_at);
  if (cardDueAt) return cardDueAt;

  var shouldRequireDueAt =
    latestPaymentStatus === "pending" || latestPaymentStatus === "overdue" ||
    cardBillingStatus === "unpaid" || cardBillingStatus === "overdue" ||
    !cardPaidAt;

  if (!shouldRequireDueAt) return "";

  return resolveRequiredDueAtFromBase_((card && card.delivered_at) || (latestPayment && latestPayment.created_at) || (card && card.created_at));
}

function buildDashboardCountdown_(dueAt, paidAt, nowMs) {
  if (sanitizeText_(paidAt)) {
    return {
      status: "paid",
      label: "已付款",
      is_overdue: false,
      is_today: false,
      days_remaining: 0
    };
  }

  var dueMs = toTimestampMs_(dueAt);
  if (!dueMs) {
    return {
      status: "",
      label: "",
      is_overdue: false,
      is_today: false,
      days_remaining: null
    };
  }

  nowMs = nowMs || Date.now();

  var diffMs = dueMs - nowMs;
  var dayMs = 24 * 60 * 60 * 1000;

  if (diffMs < 0) {
    var overdueDays = Math.ceil(Math.abs(diffMs) / dayMs);
    if (overdueDays < 1) overdueDays = 1;

    return {
      status: "overdue",
      label:
 "已逾期 " + overdueDays + " 天",
      is_overdue: true,
      is_today: false,
      days_remaining: -overdueDays
    };
  }

  var remainingDays = Math.ceil(diffMs / dayMs);

  if (remainingDays <= 1) {
    return {
      status: "due_today",
      label: "今日到期",
      is_overdue: false,
      is_today: true,
      days_remaining: 0
    };
  }

  return {
    status: "counting",
    label: "剩餘 " + remainingDays + " 天",
    is_overdue: false,
    is_today: false,
    days_remaining: remainingDays
  };
}

function normalizeDashboardCountdownByCardState_(countdown, card, latestPayment, nowMs) {
  var base = countdown || {
    status: "",
    label: "",
    is_overdue: false,
    is_today: false,
    days_remaining: null
  };

  var cardStatus = sanitizeText_(card && card.status).toLowerCase();
  var billingStatus = sanitizeText_(card && card.billing_status).toLowerCase();
  var latestPaymentStatus = sanitizeText_(latestPayment && latestPayment.status).toLowerCase();

  if (base.status === "paid") return base;

  if (base.is_overdue) return base;

  var hasDueAt = !!resolveDashboardPaymentDueAt_(card, latestPayment);
  if (hasDueAt && (billingStatus === "overdue" || latestPaymentStatus === "overdue" || cardStatus === "locked")) {
    return buildDashboardOverdueCountdownFromCard_(card, latestPayment, nowMs, base);
  }

  return base;
}

function buildDashboardOverdueCountdownFromCard_(card, latestPayment, nowMs, fallbackCountdown) {
  nowMs = nowMs || Date.now();

  var dueText =
    sanitizeText_(latestPayment && latestPayment.due_at) ||
    sanitizeText_(card && card.payment_due_at) ||
    "";

  var dueMs = toTimestampMs_(dueText);
  if (dueMs) {
    var dayMs = 24 * 60 * 60 * 1000;
    var overdueDays = Math.ceil(Math.abs(nowMs - dueMs) / dayMs);
    if (overdueDays < 1) overdueDays = 1;

    return {
      status: "overdue",
      label: "已逾期 " + overdueDays + " 天",
      is_overdue: true,
      is_today: false,
      days_remaining: -overdueDays
    };
  }

  return {
    status: sanitizeText_((fallbackCountdown || {}).status),
    label: sanitizeText_((fallbackCountdown || {}).label),
    is_overdue: false,
    is_today: !!(fallbackCountdown && fallbackCountdown.is_today),
    days_remaining: (fallbackCountdown && fallbackCountdown.days_remaining !== undefined) ? fallbackCountdown.days_remaining : null
  };
}

function isDashboardCardOverdue_(enrichedCard) {
  if (!enrichedCard) return false;

  var countdown = enrichedCard.payment_countdown || {};
  if (countdown.is_overdue) return true;

  if (!sanitizeText_(enrichedCard.payment_due_at)) return false;

  var status = sanitizeText_(enrichedCard.status).toLowerCase();
  var billingStatus = sanitizeText_(enrichedCard.billing_status).toLowerCase();
  var latestPaymentStatus = sanitizeText_(enrichedCard.latest_payment_status).toLowerCase();

  return billingStatus === "overdue" || latestPaymentStatus === "overdue" || status === "locked";
}

function resolveDashboardOverdueLabel_(enrichedCard) {
  if (!enrichedCard) return "已逾期";
  if (!sanitizeText_(enrichedCard.payment_due_at)) return "";

  var countdown = enrichedCard.payment_countdown || {};
  if (sanitizeText_(countdown.label)) return sanitizeText_(countdown.label);

  var billingStatus = sanitizeText_(enrichedCard.billing_status).toLowerCase();
  var latestPaymentStatus = sanitizeText_(enrichedCard.latest_payment_status).toLowerCase();
  if (billingStatus === "overdue" || latestPaymentStatus === "overdue") return "已逾期";

  if (sanitizeText_(enrichedCard.status).toLowerCase() === "locked") return "已鎖卡";

  return "已逾期";
}

function buildAdminDashboardAlertItem_(card, payment, label, enrichedCard) {
  return {
    card_id: sanitizeText_(card && card.id),
    name: sanitizeText_(card && card.name),
    payment_id: payment ? sanitizeText_(payment.payment_id || payment.id) : "",
    amount: payment ? Number(payment.amount || 0) : 0,
    payment_due_at:
      (payment ? sanitizeText_(payment.due_at) : "") ||
      sanitizeText_(card && card.payment_due_at) ||
      sanitizeText_(enrichedCard && enrichedCard.payment_due_at),
    countdown_label: sanitizeText_(label)
  };
}

function buildDashboardPreviewUrl_(cardId) {
  return normalizeBaseUrl_(CONFIG.BASE_URL) + "card.html?id=" + encodeURIComponent(sanitizeText_(cardId)) + "&mode=preview";
}

function buildDashboardDeliveryUrl_(cardId) {
  return normalizeBaseUrl_(CONFIG.BASE_URL) + "card.html?id=" + encodeURIComponent(sanitizeText_(cardId));
}

function buildDashboardUpdateUrl_(cardId) {
  return normalizeBaseUrl_(CONFIG.BASE_URL) + "form.html?mode=update&card_id=" + encodeURIComponent(sanitizeText_(cardId));
}

function buildDashboardRenewUrl_(cardId) {
  return normalizeBaseUrl_(CONFIG.BASE_URL) + "form.html?mode=renew&card_id=" + encodeURIComponent(sanitizeText_(cardId));
}

function normalizeBaseUrl_(url) {
  var base = sanitizeText_(url);
  if (!base) return "";
  if (base.slice(-1) !== "/") base += "/";
  return base;
}

function toTimestampMs_(value) {
  var text = sanitizeText_(value);
  if (!text) return 0;

  if (/^\d+$/.test(text)) {
    var num = Number(text);
    if (isFinite(num)) return num;
  }

  var d = new Date(text);
  if (isNaN(d.getTime())) return 0;
  return d.getTime();
}

function getDashboardFreeUpdateRemaining_(card, updateCountMap) {
  var unlimited = isDashboardUnlimitedUpdate_(card);
  if (unlimited) return -1;

  var planId = sanitizeText_(card.plan);
  var tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  var plan = planId ? findRowByField_("plan_db", "plan_id", planId) : null;

  var defaultLimit = plan ? toNumber_(plan.free_update_limit_yearly) : 0;

  if (sanitizeText_(card.update_limit_override_enabled).toUpperCase() === "TRUE") {
    var overrideVal = sanitizeText_(card.update_limit_override_value);
    if (overrideVal === "-1") return -1;
    if (overrideVal !== "") return Number(overrideVal || 0);
  }

  var usedCount = countDashboardYearlyUpdates_(sanitizeText_(card.id), tenant, updateCountMap);
  var remain = defaultLimit - usedCount;
  return remain < 0 ? 0 : remain;
}

function isDashboardUnlimitedUpdate_(card) {
  if (sanitizeText_(card.update_limit_override_enabled).toUpperCase() === "TRUE" &&
      sanitizeText_(card.update_limit_override_value) === "-1") {
    return true;
  }

  var features = parseJsonSafe_(card.features_json, {});
  if (features && String(features.update_unlimited || "").toUpperCase() === "TRUE") {
    return true;
  }

  return false;
}

function buildUpdateCountMap_(tenant) {
  var now = new Date();
  var thisYear = now.getFullYear();
  var map = {};

  getSheetRowsByName_("update_log_db").forEach(function(row) {
    if (!sameTenant_(row.tenant, tenant)) return;

    var d = new Date(sanitizeText_(row.created_at));
    if (isNaN(d.getTime())) return;
    if (d.getFullYear() !== thisYear) return;

    var cid = sanitizeText_(row.card_id);
    if (!cid) return;
    map[cid] = (map[cid] || 0) + 1;
  });

  return map;
}

function countDashboardYearlyUpdates_(cardId, tenant, updateCountMap) {
  var cid = sanitizeText_(cardId);
  if (!cid) return 0;

  if (updateCountMap && typeof updateCountMap === "object") {
    return Number(updateCountMap[cid] || 0);
  }

  var now = new Date();
  var thisYear = now.getFullYear();

  return getSheetRowsByName_("update_log_db").filter(function(row) {
    if (!sameTenant_(row.tenant, tenant)) return false;
    if (sanitizeText_(row.card_id) !== cid) return false;

    var d = new Date(sanitizeText_(row.created_at));
    if (isNaN(d.getTime())) return false;

    return d.getFullYear() === thisYear;
  }).length;
}
function submitAddonPaymentProof_(req) {
  ensureAllSchemasOrThrow_();

  var addonOrderId = sanitizeText_(req.addon_order_id || req.addonOrderId);
  if (!addonOrderId) throw new Error("Missing addon_order_id");

  var row = findRowByField_("add_on_order_db", "addon_order_id", addonOrderId);
  if (!row) throw new Error("Addon order not found");

  var status = sanitizeText_(row.status).toLowerCase();
  if (status === "paid") throw new Error("Addon order already paid");
  if (status === "cancelled") throw new Error("Cancelled addon order cannot submit proof");

  var proofNote = [
    "payer_name=" + sanitizeText_(req.payer_name || req.payerName),
    "account_last5=" + sanitizeText_(req.transfer_account_last5 || req.account_last5 || req.accountLast5),
    "transfer_amount=" + sanitizeText_(req.transfer_amount || req.transferAmount),
    "transfer_time=" + sanitizeText_(req.transfer_time || req.transferTime),
    "proof_image_url=" + sanitizeText_(req.proof_image_url || req.proofImageUrl),
    "proof_submitted_at=" + nowIso_(),
    "review_status=submitted"
  ].join(" ; ");

  var updated = shallowClone_(row);
  updated.note = mergeNote_(updated.note, proofNote);
  updated.updated_at = nowIso_();
  updateRowByName_("add_on_order_db", row.__rowNum, updated);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "submitAddonPaymentProof",
    addon_order: updated
  };
}

function buildAddonPaymentNoticeText_(req) {
  var addonOrderId = sanitizeText_(req.addon_order_id || req.addonOrderId);
  if (!addonOrderId) throw new Error("Missing addon_order_id");

  var order = findRowByField_("add_on_order_db", "addon_order_id", addonOrderId);
  if (!order) throw new Error("Addon order not found");

  var card = findRowByField_("card_db", "id", sanitizeText_(order.card_id));
  if (!card) throw new Error("Card not found");

  return buildAddonPaymentNoticePayload_(order, card);
}

function buildAddonPaymentNoticePayload_(order, card) {
  var dueText = getAddonOrderDueAt_(order) || sanitizeText_(card.payment_due_at);
  var countdown = buildAddonOrderCountdown_(order, Date.now());
  var preset = ADDON_PRODUCT_RULES[sanitizeText_(order.addon_key)] || null;
  var itemLabel = preset ? preset.label : (sanitizeText_(order.addon_type) + " x " + sanitizeText_(order.qty));


  var copyText = [
    "您好，您已申請加購項目：",
    itemLabel,
    "",
    "加購單號：" + sanitizeText_(order.addon_order_id),
    "名片編號：" + sanitizeText_(order.card_id),
    "應付金額：NT$" + sanitizeText_(order.amount),
    dueText ? ("建議請於：" + dueText + " 前完成繳款") : "",
    countdown && countdown.label ? ("目前狀態：" + countdown.label) : "",
    "",
    "匯款後請回覆以下資訊：",
    "1. 加購單號：" + sanitizeText_(order.addon_order_id),
    "2. 匯款帳號末五碼：",
    "3. 匯款時間：",
    "4. 匯款金額：",
    "",
    "確認入帳後，系統會自動套用對應加購項目。"
  ].filter(function(x){ return x !== ""; }).join("\n");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "buildAddonPaymentNoticeText",
    addon_order_id: sanitizeText_(order.addon_order_id),
    due_at: dueText,
    countdown: countdown,
    copy_text: copyText
  };
}

function triggerAddonPaymentReminder_() {
  var nowMs = Date.now();
  var rows = getSheetRowsByName_("add_on_order_db");
  var dueSoon = [];

  rows.forEach(function(order) {
    if (sanitizeText_(order.status).toLowerCase() !== "pending") return;
    var countdown = buildAddonOrderCountdown_(order, nowMs);
    if (countdown.is_overdue) return;
    if (!countdown.is_today && !(countdown.days_remaining > 0 && countdown.days_remaining <= 1)) return;

    dueSoon.push({
      addon_order_id: sanitizeText_(order.addon_order_id),
      card_id: sanitizeText_(order.card_id),
      amount: Number(order.amount || 0),
      due_at: countdown.due_at,
      countdown_label: countdown.label
    });
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "triggerAddonPaymentReminder",
    count: dueSoon.length,
    due_soon: dueSoon
  };
}

function expirePendingAddonOrders_(req) {
  req = req || {};
  var nowMs = Date.now();
  var nowIso = nowIso_();
  var changed = [];

  getSheetRowsByName_("add_on_order_db").forEach(function(order) {
    if (sanitizeText_(order.status).toLowerCase() !== "pending") return;
    var countdown = buildAddonOrderCountdown_(order, nowMs);
    if (!countdown.is_overdue) return;

    var updated = shallowClone_(order);
    updated.status = "cancelled";
    updated.cancelled_at = nowIso;
    updated.updated_at = nowIso;
    updated.note = mergeNote_(updated.note, "auto_cancelled_overdue_addon");
    updateRowByName_("add_on_order_db", order.__rowNum, updated);

    changed.push({
      addon_order_id: sanitizeText_(updated.addon_order_id),
      card_id: sanitizeText_(updated.card_id),
      due_at: countdown.due_at,
      countdown_label: countdown.label
    });

    writeOpsLog_({
      module: "addon_order",
      action: "auto_cancel_overdue",
      target_id: sanitizeText_(updated.addon_order_id),
      before_status: order.status,
      after_status: updated.status,
      note: "card_id=" + sanitizeText_(updated.card_id)
    });
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "expirePendingAddonOrders",
    cancelled_count: changed.length,
    cancelled: changed
  };
}

function confirmAddOnPayment_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var orderId = sanitizeText_(req.addon_order_id || req.addonOrderId || req.order_id || req.orderId);
  if (!orderId) throw new Error("Missing addon_order_id");

  var order = findRowByField_("add_on_order_db", "addon_order_id", orderId);
  if (!order) throw new Error("Addon order not found");

  var status = sanitizeText_(order.status).toLowerCase();
  if (status === "paid") {
    return { ok: true, version: HSC_VERSION, action: "confirmAddOnPayment", unchanged: true, add_on_order: order, addon_order: order };
  }
  if (status === "cancelled") throw new Error("Cancelled addon order cannot be paid");

  var txId = sanitizeText_(req.transaction_id || req.transactionId);
  if (txId) validateAddonTransactionUnique_(txId, sanitizeText_(order.addon_order_id));

  var card = findRowByField_("card_db", "id", sanitizeText_(order.card_id));
  if (!card) throw new Error("Card not found");

  var updatedCard = applySingleAddonToCard_(card, order);
  updatedCard.updated_at = nowIso_();
  updateRowByName_("card_db", card.__rowNum, updatedCard);

  var updatedOrder = shallowClone_(order);
  updatedOrder.status = "paid";
  updatedOrder.paid_at = nowIso_();
  updatedOrder.updated_at = nowIso_();
  updatedOrder.transaction_id = txId;
  updatedOrder.note = mergeNote_(updatedOrder.note, sanitizeText_(req.note));
  updateRowByName_("add_on_order_db", order.__rowNum, updatedOrder);

  writeOpsLog_({
    module: "addon_order",
    action: "confirm_paid",
    target_id: sanitizeText_(updatedOrder.addon_order_id),
    before_status: order.status,
    after_status: updatedOrder.status,
    note: "card_id=" + updatedCard.id + "|addon=" + sanitizeText_(order.item_code || order.addon_key || order.addon_type) + "|qty=" + sanitizeText_(order.qty)
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "confirmAddOnPayment",
    add_on_order: updatedOrder,
    addon_order: updatedOrder,
    card: updatedCard
  };
}

function confirmAddonOrderPaid_(req) {
  return confirmAddOnPayment_(req);
}

function adminMarkAddonPaid_(req) {
  return confirmAddOnPayment_(req);
}

function validateAddonTransactionUnique_(txId, currentAddonOrderId) {
  var clean = sanitizeText_(txId);
  if (!clean) return;

  var exists = getSheetRowsByName_("add_on_order_db").some(function(row) {
    if (sanitizeText_(row.transaction_id) !== clean) return false;
    if (currentAddonOrderId && sanitizeText_(row.addon_order_id) === sanitizeText_(currentAddonOrderId)) return false;
    return true;
  });

  if (exists) throw new Error("addon transaction_id already exists");
}

function shouldAutoProcessCommissionForPayment_(payment) {
  if (!payment) return false;
  if (sanitizeText_(payment.status) !== "paid") return false;
  var eventType = sanitizeText_(payment.event_type);
  if (eventType !== "first_payment" && eventType !== "renewal") return false;
  var commissionStatus = sanitizeText_(payment.commission_status);
  if (!commissionStatus) return true;
  return commissionStatus === "pending";
}

function listPendingCommissionPayments_(tenant, limit) {
  var rows = getSheetRowsByName_("payment_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant) && shouldAutoProcessCommissionForPayment_(row);
  }).sort(function(a, b) {
    return sanitizeText_(a.created_at).localeCompare(sanitizeText_(b.created_at));
  });
  if (limit > 0) rows = rows.slice(0, limit);
  return rows;
}

function autoProcessCommissionAfterPayment_(paymentId) {
  if (!paymentId) return { ok: false, skipped: true, reason: "missing_payment_id" };

  try {
    var cleanPaymentId = sanitizeText_(paymentId);
    var payment = findRowByField_("payment_db", "payment_id", cleanPaymentId);
    if (!payment) {
      return { ok: false, skipped: true, reason: "payment_not_found", payment_id: cleanPaymentId };
    }

    var paymentCommissionStatus = sanitizeText_(payment.commission_status).toLowerCase();
    var existingCommissions = findRowsByField_("commission_db", "payment_id", cleanPaymentId).filter(function(row) {
      return sanitizeText_(row.is_reversal).toUpperCase() !== "TRUE";
    });

    if (paymentCommissionStatus === "processed") {
      return {
        ok: true,
        skipped: true,
        reason: "already_processed",
        mode: "auto",
        payment_id: cleanPaymentId,
        commissions: existingCommissions,
        message: "commission_already_processed"
      };
    }

    if (existingCommissions.length > 0) {
      if (paymentCommissionStatus !== "processed") {
        try {
          updatePaymentCommissionStatus_(cleanPaymentId, "processed", sanitizeText_(payment.commission_processed_at) || nowIso_(), "commission_already_exists");
        } catch (syncErr) {
          Logger.log("autoProcessCommissionAfterPayment_ sync status failed: " + (syncErr && syncErr.message ? syncErr.message : String(syncErr)));
        }
      }
      return {
        ok: true,
        skipped: true,
        reason: "commission_already_exists",
        mode: "auto",
        payment_id: cleanPaymentId,
        commissions: existingCommissions,
        message: "commission_already_exists"
      };
    }

    var result;
    if (sanitizeText_(payment.event_type) === "renewal" || sanitizeText_(payment.order_type) === "renewal") {
      result = processRenewalCommission_(payment, new Date());
    } else {
      result = processCommission_({ payment_id: cleanPaymentId });
    }

    return {
      ok: true,
      mode: "auto",
      payment_id: cleanPaymentId,
      commissions: result && result.commissions ? result.commissions : [],
      message: result && result.message ? result.message : ""
    };
  } catch (e) {
    return {
      ok: false,
      mode: "auto",
      payment_id: paymentId,
      error: e && e.message ? e.message : String(e)
    };
  }
}

function getPendingCommissionPayments_(req) {
  var tenant = getTenant_(req || {});
  var limit = toNumber_(req && req.limit);
  if (limit <= 0) limit = 100;
  var rows = listPendingCommissionPayments_(tenant, limit);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPendingCommissionPayments",
    count: rows.length,
    payments: rows
  };
}

function runCommissionEngineSweep_(req) {
  var tenant = getTenant_(req || {});
  var limit = toNumber_(req && req.limit);
  if (limit <= 0) limit = 100;
  var payments = listPendingCommissionPayments_(tenant, limit);
  var results = [];
  var successCount = 0;
  var failCount = 0;

  payments.forEach(function(payment) {
    var result = autoProcessCommissionAfterPayment_(sanitizeText_(payment.payment_id));
    results.push(result);
    if (result.ok) successCount++;
    else failCount++;
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "runCommissionEngineSweep",
    tenant: tenant,
    scanned: payments.length,
    success_count: successCount,
    fail_count: failCount,
    results:
 results
  };
}

/***********************
 * 每日營運總整理
 ***********************/
function runDailyOps_(req) {
  req = req || {};
  var results = {
    ok: true,
    version: HSC_VERSION,
    action: "runDailyOps"
  };

  var opsLogReady = false;
  try {
    ensureSchemasOrThrow_(["ops_log_db"]);
    opsLogReady = true;
  } catch (opsSchemaErr) {
    Logger.log("runDailyOps_ ops_log schema check failed: " + (opsSchemaErr && opsSchemaErr.message ? opsSchemaErr.message : String(opsSchemaErr)));
  }

  var tasks = [
    { key: "expiry", fn: function() { return triggerExpiryCheck_(); } },
    { key: "overdue", fn: function() { return triggerOverdueLock_(); } },
    { key: "schema", fn: function() { return adminCheckSchemaStatus_({ __system_call: true }); } },
    { key: "addon_repair", fn: function() { return repairAddonOrderStatuses_(); } },
    { key: "addon_dueat_backfill", fn: function() { return backfillAddonDueAtRows_({ __system_call: true }); } },
    { key: "addon_expire", fn: function() { return expirePendingAddonOrders_({ __system_call: true }); } },
    { key: "agent_tier_sweep", fn: function() { return runAgentTierSweep_(); } },
    { key: "payment_reminder", fn: function() { return triggerPaymentReminder_(); } },
    { key: "addon_payment_reminder", fn: function() { return triggerAddonPaymentReminder_(); } },
    { key: "renewal_reminder", fn: function() { return triggerRenewalReminder_(); } },
    { key: "renewal_payment_reminder", fn: function() { return triggerRenewalPaymentReminder_({ __system_call: true }); } },
    { key: "commission_engine", fn: function() { return runCommissionEngineSweep_({ limit: 200, __system_call: true }); } }
  ];

  var failCount = 0;

  tasks.forEach(function(task) {
    try {
      results[task.key] = task.fn();
    } catch (err) {
      var errMsg = err && err.message ? err.message : String(err);
      failCount++;
      results[task.key] = {
        ok: false,
        error: errMsg
      };
      Logger.log("runDailyOps_ task failed [" + task.key + "]: " + errMsg);
      if (opsLogReady) {
        try {
          writeOpsLog_({
            module: "daily_ops",
            action: "task_failed",
            target_id: task.key,
            before_status: "",
            after_status: "error",
            note: errMsg
          });
        } catch (opsErr) {
          Logger.log("runDailyOps_ opsLog failed [" + task.key + "]: " + (opsErr && opsErr.message ? opsErr.message : String(opsErr)));
        }
      }
    }
  });

  if (failCount > 0) {
    results.ok = false;
    results.fail_count = failCount;
  }

  return results;
}

/***********************
 * 自動觸發器安裝
 ***********************/
function getLegacyCompatibleTriggerHandlers_() {
  return [
    "runCommercialTriggerSuite_",
    "runDailyMaintenance",
    "runPaymentReminderSweep",
    "runPaymentLockSweep",
    "runInviteExpireSweep"
  ];
}

function deleteTriggersByHandlerNames_(handlerNames) {
  var targets = Array.isArray(handlerNames) ? handlerNames : [handlerNames];
  var deleted = [];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    var handler = trigger.getHandlerFunction();
    if (targets.indexOf(handler) === -1) return;
    ScriptApp.deleteTrigger(trigger);
    deleted.push(handler);
  });
  return deleted;
}

function installCommercialTriggers_(req) {
  req = req || {};
  var existing = ScriptApp.getProjectTriggers();
  var created = [];
  var removed_legacy = [];

  if (toBoolean_(req.cleanup_legacy) || sanitizeText_(req.cleanup_legacy).toLowerCase() === "true" || req.cleanup_legacy === undefined) {
    removed_legacy = deleteTriggersByHandlerNames_(getLegacyCompatibleTriggerHandlers_());
    existing = ScriptApp.getProjectTriggers();
  }

  COMMERCIAL_TRIGGER_PLAN.forEach(function(item) {
    var found = existing.some(function(t) {
      return t.getHandlerFunction() === item.fn;
    });
    if (found) return;

    var builder = ScriptApp.newTrigger(item.fn).timeBased();
    if (item.type === "daily") {
      builder = builder.everyDays(1).atHour(item.hour || 0);
      if (typeof item.minute === "number") {
        builder = builder.nearMinute(item.minute);
      }
    }
    builder.create();
    created.push(item.fn + (typeof item.minute === "number" ? ("@" + String(item.hour || 0).padStart(2, "0") + ":" + String(item.minute).padStart(2, "0")) : ("@" + String(item.hour || 0).padStart(2, "0") + ":00")));
    existing = ScriptApp.getProjectTriggers();
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "installCommercialTriggers",
    created: created,
    removed_legacy: removed_legacy,
    cleanup_legacy: true
  };
}

/***********************
 * 付款查詢
 ***********************/

function extractTaggedValue_(textValue, key) {
  var text = sanitizeText_(textValue);
  if (!text || !key) return "";
  var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re = new RegExp("(?:^|\\s*;\\s*)" + escaped + "=([^;]*)");
  var m = text.match(re);
  return m ? sanitizeText_(m[1]) : "";
}

function hasPendingOfflinePaymentByCard_(cardId, eventType) {
  var targetEvent = sanitizeText_(eventType) || "first_payment";
  return getSheetRowsByName_("payment_db").some(function(row) {
    return sanitizeText_(row.card_id) === sanitizeText_(cardId) &&
      sanitizeText_(row.status) === "pending" &&
      sanitizeText_(row.method) === "bank_transfer" &&
      sanitizeText_(row.event_type) === targetEvent;
  });
}

function hasPaymentProofSubmitted_(payment) {
  var note = sanitizeText_(payment.note);
  if (!note) return false;
  var reviewStatus = extractTaggedValue_(note, "review_status");
  var proofSubmittedAt = extractTaggedValue_(note, "proof_submitted_at");
  return !!reviewStatus || !!proofSubmittedAt;
}

function commissionExistsByPaymentId_(paymentId) {
  if (!paymentId) return false;
  return getSheetRowsByName_("commission_db").some(function(row) {
    return sanitizeText_(row.payment_id) === sanitizeText_(paymentId) &&
      sanitizeText_(row.is_reversal) !== "TRUE";
  });
}

function commissionExistsByAddonOrderId_(addonOrderId) {
  if (!addonOrderId) return false;
  return getSheetRowsByName_("commission_db").some(function(row) {
    return extractTaggedValue_(row.note, "addon_order_id") === sanitizeText_(addonOrderId) &&
      sanitizeText_(row.is_reversal) !== "TRUE";
  });
}

function getPayments_(req) {
  ensureAllSchemasOrThrow_();

  req = req || {};

  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status).toLowerCase();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);

  var rows = getSheetRowsByName_("payment_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });

  if (status) {
    rows = rows.filter(function(row) {
      return sanitizeText_(row.status).toLowerCase() === status;
    });
  }

  if (cardId) {
    rows = rows.filter(function(row) {
      return sanitizeText_(row.card_id) === cardId;
    });
  }

  if (paymentId) {
    rows = rows.filter(function(row) {
      return sanitizeText_(row.payment_id) === paymentId;
    });
  }

  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPayments",
    rows: rows,
    payments: rows
  };
}
function getPayment_(req) {
  ensureAllSchemasOrThrow_();

  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  var row = findRowByField_("payment_db", "payment_id", paymentId);
  if (!row) throw new Error("Payment not found");

  var pointsRedeem = extractRedeemSummaryFromNote_(row.note);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPayment",
    payment: row,
    points_redeem: pointsRedeem
  };
}

function updatePayment_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");

  var updated = shallowClone_(payment);
  var beforeStatus = sanitizeText_(payment.status);

  if ("due_at" in req || "dueAt" in req) {
    updated.due_at = sanitizeText_(req.due_at || req.dueAt);
  }
  if ("note" in req) {
    updated.note = sanitizeText_(req.note);
  }
  if ("review_status" in req || "reviewStatus" in req) {
    updated.review_status = sanitizeText_(req.review_status || req.reviewStatus);
  }
  if ("risk_flag" in req || "riskFlag" in req) {
    updated.risk_flag = sanitizeText_(req.risk_flag || req.riskFlag);
  }
  if ("risk_reason" in req || "riskReason" in req) {
    updated.risk_reason = sanitizeText_(req.risk_reason || req.riskReason);
  }
  if ("status" in req) {
    var nextStatus = sanitizeText_(req.status);
    if (nextStatus && ["pending","paid","refunded","cancelled"].indexOf(nextStatus) === -1) {
      throw new Error("Invalid payment status");
    }
    if (nextStatus) updated.status = nextStatus;
  }

  updated.updated_at = nowIso_();
  updateRowByName_("payment_db", payment.__rowNum, updated);
  writeOpsLog_({
    module: "payment",
    action: "updatePayment",
    target_id: paymentId,
    before_status: beforeStatus,
    after_status: sanitizeText_(updated.status),
    note: sanitizeText_(req.note)
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "updatePayment",
    payment: updated
  };
}

function adminRepairDueAt_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var cardId = sanitizeText_(req.card_id || req.cardId);
  if (!cardId) throw new Error("Missing card_id");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var deliveredAt
 = toDateSafe_(card.delivered_at);
  if (!deliveredAt) throw new Error("Card not delivered yet");

  var dueAtText = toIso_(addDays_(deliveredAt, CONFIG.PAYMENT_DUE_DAYS));
  var repaired = [];

  var payments = getSheetRowsByName_("payment_db").filter(function(row) {
    return sanitizeText_(row.card_id) === cardId &&
           sanitizeText_(row.status) === "pending";
  });

  payments.forEach(function(payment) {
    if (!sanitizeText_(payment.due_at)) {
      var updated = shallowClone_(payment);
      updated.due_at = dueAtText;
      updated.updated_at = nowIso_();
      updateRowByName_("payment_db", payment.__rowNum, updated);
      repaired.push(updated.payment_id);
    }
  });

  var patchedCard = shallowClone_(card);
  if (!sanitizeText_(patchedCard.payment_due_at)) {
    patchedCard.payment_due_at = dueAtText;
    patchedCard.updated_at = nowIso_();
    updateRowByName_("card_db", card.__rowNum, patchedCard);
  }

  writeOpsLog_({
    module: "payment",
    action: "adminRepairDueAt",
    target_id: cardId,
    before_status: "",
    after_status: dueAtText,
    note: "repaired payments=" + repaired.join(",")
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminRepairDueAt",
    repaired: repaired.length > 0,
    card_id: cardId,
    payment_due_at: sanitizeText_(patchedCard.payment_due_at || dueAtText),
    repaired_payments: repaired
  };
}

function getCards_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var tenant = getTenant_(req);
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var status = sanitizeText_(req.status).toLowerCase();
  var billingStatus = sanitizeText_(req.billing_status || req.billingStatus).toLowerCase();

  var rows = getSheetRowsByName_("card_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });

  if (status) {
    rows = rows.filter(function(row) {
      return sanitizeText_(row.status).toLowerCase() === status;
    });
  }
  if (billingStatus) {
    rows = rows.filter(function(row) {
      return sanitizeText_(row.billing_status).toLowerCase() === billingStatus;
    });
  }
  if (keyword) {
    rows = rows.filter(function(row) {
      var hay = [
        row.id, row.name, row.phone, row.email, row.unit, row.title,
        row.referrer, row.service_agent, row.agent_id
      ].map(function(x){ return sanitizeText_(x).toLowerCase(); }).join(" ");
      return hay.indexOf(keyword) !== -1;
    });
  }

  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCards",
    cards: rows
  };
}

function adminUpdateCard_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var updated = shallowClone_(card);
  var beforeStatus = sanitizeText_(card.status);

  var allow = [
    "status","billing_status","payment_due_at","expires_at",
    "referrer","service_agent","agent_id","renewal_owner"
  ];

  allow.forEach(function(key) {
    if (key in req) updated[key] = sanitizeText_(req[key]);
  });

  if ("status" in req) {
    var nextStatus = sanitizeText_(req.status);
    if (nextStatus && ["draft","active","inactive","expired","locked"].indexOf(nextStatus) === -1) {
      throw new Error("Invalid card status");
    }
  }

  if ("billing_status" in req) {
    var nextBilling = sanitizeText_(req.billing_status);
    if (nextBilling && ["unpaid","active","overdue","paid","cancelled","refunded"].indexOf(nextBilling) === -1) {
      throw new Error("Invalid billing_status");
    }
  }

  updated.updated_at = nowIso_();
  updateRowByName_("card_db", card.__rowNum, updated);
  writeOpsLog_({
    module: "card",
    action: "adminUpdateCard",
    target_id: cardId,
    before_status: beforeStatus,
    after_status: sanitizeText_(updated.status),
    note: ""
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminUpdateCard",
    card: updated
  };
}

function getAddonOrder_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var addonOrderId = sanitizeText_(req.addon_order_id || req.addonOrderId);
  if (!addonOrderId) throw new Error("Missing addon_order_id");

  var order = findRowByField_("add_on_order_db", "addon_order_id", addonOrderId);
  if (!order) throw new Error("Addon order not found");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAddonOrder",
    addon_order: order
  };
}

function getOpsLogs_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKey_(req);

  var tenant = getTenant_(req);
  var module = sanitizeText_(req.module).toLowerCase();
  var action = sanitizeText_(req.log_action || req.action_name).toLowerCase();

  var rows = getSheetRowsByName_("ops_log_db").filter(function(row) {
    return sameTenant_(row.tenant, tenant);
  });

  if (module) {
    rows = rows.filter(function(row) {
      return sanitizeText_(row.module).toLowerCase() === module;
    });
  }
  if (action) {
    rows = rows.filter(function(row) {
      return sanitizeText_(row.action).toLowerCase() === action;
    });
  }

  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getOpsLogs",
    logs: rows
  };
}

// ============================================================
// 新增通知機制函式
// ============================================================

function notifyAdminLine_(payload) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");
    var adminUserId = PropertiesService.getScriptProperties().getProperty("LINE_ADMIN_USER_ID");
    var fallbackTo = PropertiesService.getScriptProperties().getProperty("LINE_NOTIFY_TO");
    var to = adminUserId || fallbackTo;

    if (!token) {
      Logger.log("notifyAdminLine_ skipped: missing LINE_CHANNEL_ACCESS_TOKEN");
      return { ok: false, reason: "missing_token" };
    }
    if (!to) {
      Logger.log("notifyAdminLine_ skipped: no recipient (LINE_ADMIN_USER_ID / LINE_NOTIFY_TO)");
      return { ok: false, reason: "missing_recipient" };
    }

    var title = sanitizeText_(payload && payload.title);
    var message = sanitizeText_(payload && payload.message);
    if (!title && !message) {
      Logger.log("notifyAdminLine_ skipped: empty title and message");
      return { ok: false, reason: "empty_content" };
    }

    var msg = "";
    if (title) msg += title + "\n";
    if (message) msg += message;
    msg = msg.trim();
    if (!msg) return { ok: false, reason: "empty_after_trim" };

    var url = "https://api.line.me/v2/bot/message/push";
    var options = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      payload: JSON.stringify({
        to: to,
        messages: [{ type: "text", text: msg }]
      }),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      Logger.log("notifyAdminLine_ error: " + response.getContentText());
      return { ok: false, reason: "http_" + responseCode };
    }
    return { ok: true };
  } catch (err) {
    Logger.log("notifyAdminLine_ failed: " + (err && err.message ? err.message : String(err)));
    return { ok: false, reason: "exception" };
  }
}

function logAndNotifyEvent_(payload) {
  try {
    var logResult = writeOpsLog_(payload);
    if (!logResult) {
      Logger.log("logAndNotifyEvent_ writeOpsLog_ failed for payload: " + JSON.stringify(payload));
    }
    var title = "";
    var message = sanitizeText_(payload.note);
    if (payload.action === "new_conversion") {
      title = "新客戶完成成交";
    } else if (payload.action === "agent_upgraded") {
      title = "客戶升級為銀牌推薦代理";
    } else {
      title = "重要通知";
    }
    notifyAdminLine_({
      title: title,
      message: message
    });
  } catch (err) {
    Logger.log("logAndNotifyEvent_ error: " + (err && err.message ? err.message : String(err)));
  }
}

function getRecentOpsLogs_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  req = req || {};
  var tenant = sanitizeText_(req.tenant) || CONFIG.DEFAULT_TENANT;
  var limit = toNumber_(req.limit);
  if (limit <= 0) limit = 10;
  var module = sanitizeText_(req.module);
  var eventAction = sanitizeText_(req.event_action);

  var rows = getSheetRowsByName_("ops_log_db").filter(function(row) {
    if (!sameTenant_(row.tenant, tenant)) return false;
    if (module && sanitizeText_(row.module) !== module) return false;
    if (eventAction && sanitizeText_(row.action) !== eventAction) return false;
    return true;
  });

  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  if (rows.length > limit) rows = rows.slice(0, limit);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getRecentOpsLogs",
    items: rows
  };
}

/************************************************
* System language dictionary & validation
************************************************/

const LANGUAGE_DEFINITIONS = {
  plan_display: {
    free: "基礎方案",
    premium: "精品方案"
  },
  payment_event_type: [
    "first_payment",
    "addon_payment",
    "renewal",
    "update_fee"
  ],
  payment_order_type: [
    "new",
    "renewal",
    "addon",
    "update",
    "upgrade",
    "manual",
    "offline_transfer"
  ],
  payment_method: [
    "bank_transfer",
    "cash",
    "credit_card",
    "line_pay",
    "manual"
  ],
  payment_status: [
    "pending",
    "paid",
  
  "overdue",
    "refunded",
    "failed",
    "cancelled"
  ],
  card_status: [
    "active",
    "locked",
    "inactive",
    "expired"
  ],
  card_billing_status: [
    "unpaid",
    "active",
    "paid",
    "overdue",
    "expired",
    "refunded",
    "cancelled"
  ],
  commission_status: [
    "pending",
    "approved",
    "paid",
    "frozen",
    "reversed",
    "rejected"
  ],
  service_type: [
    "renewal_reminder",
    "renewal_followup",
    "payment_assist",
    "update_help",
    "customer_support",
    "onboarding",
    "general_support"
  ],
  service_evidence_type: [
    "line",
    "phone",
    "meeting",
    "form",
    "manual",
    "manual_other"
  ],
  service_status: [
    "pending",
    "approved",
    "rejected",
    "cancelled"
  ],
  addon_order_status: [
    "pending",
    "paid",
    "cancelled"
  ],
  request_status: [
    "pending",
    "assigned",
    "converted",
    "cancelled"
  ],
  settlement_status: [
    "draft",
    "calculated",
    "approved",
    "paid",
    "cancelled"
  ]
};

const PAYMENT_EVENT_TYPE_ALLOWED = LANGUAGE_DEFINITIONS.payment_event_type;
const PAYMENT_ORDER_TYPE_ALLOWED = LANGUAGE_DEFINITIONS.payment_order_type;
const PAYMENT_METHOD_ALLOWED = LANGUAGE_DEFINITIONS.payment_method;
const PAYMENT_STATUS_ALLOWED = LANGUAGE_DEFINITIONS.payment_status;
const CARD_STATUS_ALLOWED = LANGUAGE_DEFINITIONS.card_status;
const CARD_BILLING_STATUS_ALLOWED = LANGUAGE_DEFINITIONS.card_billing_status;
const SERVICE_TYPE_ALLOWED = LANGUAGE_DEFINITIONS.service_type;
const SERVICE_EVIDENCE_TYPE_ALLOWED = LANGUAGE_DEFINITIONS.service_evidence_type;
const SERVICE_STATUS_ALLOWED = LANGUAGE_DEFINITIONS.service_status;
const ADDON_ORDER_STATUS_ALLOWED_V2 = LANGUAGE_DEFINITIONS.addon_order_status;
const REQUEST_STATUS_ALLOWED = LANGUAGE_DEFINITIONS.request_status;
const SETTLEMENT_STATUS_ALLOWED = LANGUAGE_DEFINITIONS.settlement_status;

function validateAllowed_(label, value, allowed) {
  var clean = sanitizeText_(value);
  if (!clean) return;
  if (allowed.indexOf(clean) === -1) {
    throw new Error("Invalid " + label + ": " + clean + " ; allowed: " + allowed.join(", "));
  }
}
function validatePaymentEventType_(value) { validateAllowed_("event_type", value, PAYMENT_EVENT_TYPE_ALLOWED); }
function validatePaymentOrderType_(value) { validateAllowed_("order_type", value, PAYMENT_ORDER_TYPE_ALLOWED); }
function validatePaymentMethod_(value) { validateAllowed_("method", value, PAYMENT_METHOD_ALLOWED); }
function validatePaymentStatus_(value) { validateAllowed_("payment status", value, PAYMENT_STATUS_ALLOWED); }
function validateCardStatus_(value) { validateAllowed_("card status", value, CARD_STATUS_ALLOWED); }
function validateCardBillingStatus_(value) { validateAllowed_("billing_status", value, CARD_BILLING_STATUS_ALLOWED); }
function validateCommissionStatusV2_(value) { validateAllowed_("commission status", value, COMMISSION_STATUS_ALLOWED); }
function validateServiceType_(value) { validateAllowed_("service_type", value, SERVICE_TYPE_ALLOWED); }
function validateServiceEvidenceType_(value) { validateAllowed_("evidence_type", value, SERVICE_EVIDENCE_TYPE_ALLOWED); }
function validateServiceStatus_(value) { validateAllowed_("service_log status", value, SERVICE_STATUS_ALLOWED); }
function validateAddonOrderStatusV2_(value) { validateAllowed_("addon status", value, ADDON_ORDER_STATUS_ALLOWED_V2); }
function validateRequestStatus_(value) { validateAllowed_("request status", value, REQUEST_STATUS_ALLOWED); }
function validateSettlementStatus_(value) { validateAllowed_("settlement status", value, SETTLEMENT_STATUS_ALLOWED); }

function validatePaymentStatusTransition_(from, to) {
  var allowed = {
    pending: ["paid", "cancelled", "failed", "overdue", "refunded"],
    overdue: ["paid", "cancelled", "refunded"],
    paid: ["refunded"],
    failed: [],
    refunded: [],
    cancelled: []
  };
  if (!to) return;
  if (!from) {
    validatePaymentStatus_(to);
    return;
  }
  if (!allowed[from] || allowed[from].indexOf(to) === -1) {
    throw new Error("Invalid payment status transition: " + from + " → " + to);
  }
}

function validateCardStatusTransition_(from, to) {
  var allowed = {
    active: ["locked", "expired", "inactive"],
    locked: ["active", "expired", "inactive"],
    inactive: ["active", "locked"],
    expired: []
  };
  if (!to) return;
  if (!from) {
    validateCardStatus_(to);
    return;
  }
  if (!allowed[from] || allowed[from].indexOf(to) === -1) {
    throw new Error("Invalid card status transition: " + from + " → " + to);
  }
}

function validateCommissionStatusTransition_(from, to) {
  var allowed = {
    pending: ["approved", "rejected", "frozen", "reversed"],
    approved: ["paid", "frozen", "reversed"],
    frozen: ["approved", "paid", "reversed"],
    paid: ["reversed"],
    reversed: [],
    rejected: []
  };
  if (!to) return;
  if (!from) {
    validateCommissionStatusV2_(to);
    return;
  }
  if (!allowed[from] || allowed[from].indexOf(to) === -1) {
    throw new Error("Invalid commission status transition: " + from + " → " + to);
  }
}

function isCommissionableEvent_(eventType) {
  var clean = sanitizeText_(eventType);
  return ["first_payment", "renewal", "renewal_payment", "recovery_payment", "addon_payment"].indexOf(clean) !== -1;
}

function normalizePlanLabel_(planId, planName) {
  var pid = sanitizeText_(planId || planName).toLowerCase();
  if (pid === "free") return LANGUAGE_DEFINITIONS.plan_display.free;
  if (pid === "premium") return LANGUAGE_DEFINITIONS.plan_display.premium;
  return sanitizeText_(planName || planId);
}

/************************************************
* Trigger runtime helpers
************************************************/

function validateCommissionStatus_(value) {
  var clean = sanitizeText_(value);
  if (!clean) return;
  if (COMMISSION_STATUS_ALLOWED.indexOf(clean) === -1) throw new Error("Invalid commission status: " + clean);
}
function runPaymentOverdueCheck_() {
  ensureSchemasOrThrow_(["card_db"]);
  var now = new Date();
  var cards = getSheetRowsByName_("card_db");
  var locked = [];
  cards.forEach(function(card) {
    try {
      var dueAt = toDateSafe_(card.payment_due_at);
      if (!dueAt) return;
      if (sanitizeText_(card.payment_paid_at)) return;
      if (["paid","active"].indexOf(sanitizeText_(card.billing_status)) !== -1) return;
      var status = sanitizeText_(card.status);
      if (status === "expired" || status === "inactive") return;
      if (now.getTime() <= dueAt.getTime()) return;
      var updated = shallowClone_(card);
      if (status !== "locked")
 {
        validateCardStatusTransition_(status || "active", "locked");
        updated.status = "locked";
      }
      updated.billing_status = "overdue";
      validateCardBillingStatus_(updated.billing_status);
      updated.inactivated_at = nowIso_();
      updated.updated_at = nowIso_();
      updateRowByName_("card_db", card.__rowNum, updated);
      locked.push({ card_id: updated.id, payment_due_at: updated.payment_due_at });
    } catch (err) {}
  });
  return { ok:true, version:HSC_VERSION, action:"runPaymentOverdueCheck", locked_count:locked.length, locked:locked };
}
function runCardExpiryCheck_() {
  ensureAllSchemasOrThrow_();
  var now = new Date();
  var cards = getSheetRowsByName_("card_db");
  var expired = [];
  cards.forEach(function(card) {
    try {
      var exp = toDateSafe_(card.expires_at);
      if (!exp) return;
      if (now.getTime() <= exp.getTime()) return;
      var currentStatus = sanitizeText_(card.status);
      if (currentStatus === "expired" || currentStatus === "inactive") return;
      var updated = shallowClone_(card);
      validateCardStatusTransition_(currentStatus || "active", "expired");
      updated.status = "expired";
      updated.expired_at = nowIso_();
      updated.updated_at = nowIso_();
      updateRowByName_("card_db", card.__rowNum, updated);
      expired.push({ card_id: updated.id, expires_at: updated.expires_at });
    } catch (err) {}
  });
  return { ok:true, version:HSC_VERSION, action:"runCardExpiryCheck", expired_count:expired.length, expired:expired };
}
function runCommissionCalculation_() {
  ensureAllSchemasOrThrow_();
  var result = runCommissionEngineSweep_({ limit: 500, __system_call: true });
  return {
    ok: true,
    version: HSC_VERSION,
    action: "runCommissionCalculation",
    created_count: toNumber_(result && result.success_count),
    skipped_count: Math.max(0, toNumber_(result && result.scanned) - toNumber_(result && result.success_count) - toNumber_(result && result.fail_count)),
    fail_count: toNumber_(result && result.fail_count),
    created: (result && result.results) ? result.results.filter(function(row) { return row && row.ok; }) : [],
    delegated_to: "runCommissionEngineSweep"
  };
}
function runMonthlySettlement_() {
  ensureAllSchemasOrThrow_();
  if (!SCHEMA.agent_settlement_report) throw new Error("agent_settlement_report schema not defined");
  var now = new Date();
  var target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var settlementMonth = Utilities.formatDate(target, CONFIG.DEFAULT_TIMEZONE, "yyyy-MM");
  return buildMonthlySettlement_({ settlement_month:settlementMonth });
}
function buildMonthlySettlement_(req) {
  ensureAllSchemasOrThrow_();
  if (!SCHEMA.agent_settlement_report) throw new Error("agent_settlement_report schema not defined");
  var settlementMonth = sanitizeText_(req && (req.settlement_month || req.settlementMonth));
  if (!settlementMonth) throw new Error("Missing settlement_month");
  var commissions = getSheetRowsByName_("commission_db");
  var groups = {};
  commissions.forEach(function(row) {
    if (sanitizeText_(row.status) !== "approved") return;
    if (sanitizeText_(row.is_reversal).toUpperCase() === "TRUE") return;
    if (sanitizeText_(row.paid_at)) return;
    if (sanitizeText_(row.frozen_at))
 return;
    var refDate = sanitizeText_(row.approved_at || row.calculated_at || row.updated_at || row.created_at);
    if (!refDate || refDate.slice(0, 7) !== settlementMonth) return;
    var agentId = sanitizeText_(row.beneficiary_agent_id);
    if (!agentId) return;
    if (!groups[agentId]) {
      groups[agentId] = { agent_id:agentId, agent_name:"", tenant:sanitizeText_(row.tenant) || CONFIG.DEFAULT_TENANT, currency:"TWD", commission_count:0, gross_commission_amount:0, reversal_amount:0, frozen_amount:0, adjustment_amount:0, net_payable_amount:0, items:[] };
    }
    groups[agentId].commission_count += 1;
    groups[agentId].gross_commission_amount += toNumber_(row.reward_amount);
    groups[agentId].items.push(row.commission_id);
  });
  var created = [];
  Object.keys(groups).forEach(function(agentId) {
    var g = groups[agentId];
    g.net_payable_amount = roundMoney_(g.gross_commission_amount - g.reversal_amount - g.frozen_amount + g.adjustment_amount);
    var exists = getSheetRowsByName_("agent_settlement_report").some(function(row) {
      return sanitizeText_(row.settlement_month) === settlementMonth && sanitizeText_(row.agent_id) === agentId;
    });
    if (exists) return;
    var row = emptyRow_("agent_settlement_report");
    row.settlement_id = "ST" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);
    row.settlement_month = settlementMonth;
    row.agent_id = agentId;
    row.agent_name = g.agent_name;
    row.tenant = g.tenant;
    row.currency = g.currency;
    row.commission_count = String(g.commission_count);
    row.gross_commission_amount = String(roundMoney_(g.gross_commission_amount));
    row.reversal_amount = String(roundMoney_(g.reversal_amount));
    row.frozen_amount = String(roundMoney_(g.frozen_amount));
    row.adjustment_amount = String(roundMoney_(g.adjustment_amount));
    row.net_payable_amount = String(roundMoney_(g.net_payable_amount));
    row.status = "calculated";
    row.batch_id = "";
    row.calculated_at = nowIso_();
    row.approved_at = "";
    row.paid_at = "";
    row.paid_by = "";
    row.note = "commission_ids=" + g.items.join(",");
    appendRowByName_("agent_settlement_report", row);
    created.push({ settlement_id:row.settlement_id, settlement_month:row.settlement_month, agent_id:row.agent_id, commission_count:row.commission_count, net_payable_amount:row.net_payable_amount });
  });
  return { ok:true, version:HSC_VERSION, action:"buildMonthlySettlement", settlement_month:settlementMonth, created_count:created.length, settlements:created };
}
function markSettlementPaid_(req) {
  ensureAllSchemasOrThrow_();
  var settlementId = sanitizeText_(req.settlement_id || req.settlementId);
  if (!settlementId) throw new Error("Missing settlement_id");
  var row = findRowByField_("agent_settlement_report", "settlement_id", settlementId);
  if (!row) throw new Error("Settlement not found");
  var updated = shallowClone_(row);
  updated.status = "paid";
  updated.paid_at = nowIso_();
  updated.paid_by = sanitizeText_(req.paid_by || req.paidBy || "system");
  updated.note = mergeNote_(updated.note, sanitizeText_(req.note));
  updateRowByName_("agent_settlement_report", row.__rowNum, updated);
  var note = sanitizeText_(row.note);
  var m = note.match(/commission_ids=([A-Z0-9,]+)/);
  if (m && m[1]) {
    m[1].split(",").forEach(function(id) {
      var c = findRowByField_("commission_db", "commission_id", sanitizeText_(id));
      if (!c) return;
      var curr = sanitizeText_(c.status);
      if (curr === "approved") {
        validateCommissionStatusTransition_(curr, "paid");
        var uc = shallowClone_(c);
        uc.status = "paid";
        uc.paid_at = nowIso_();
        uc.updated_at = nowIso_();
        updateRowByName_("commission_db", c.__rowNum, uc);
      }
    });
  }
  return { ok:true, version:HSC_VERSION, action:"markSettlementPaid", settlement:updated };
}
function adminGetAgent_(req) {
  ensureAllSchemasOrThrow_();
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!agentId) throw new Error("Missing agent_id");
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) throw new Error("Agent not found");
  var referralStats = computeAgentReferralStats_(agentId);
  var settlements = getSheetRowsByName_("agent_settlement_report").filter(function(r) {
    return sanitizeText_(r.agent_id) === agentId;
  }).sort(function(a, b) {
    return String(b.calculated_at || "").localeCompare(String(a.calculated_at || ""));
  }).slice(0, 12);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminGetAgent",
    agent: agent,
    delivery_agent_info: buildDeliveryAgentInfoByAgent_(agent, null),
    referral_stats: referralStats,
    settlements: settlements
  };
}

function adminListAgents_(req) {
  ensureAllSchemasOrThrow_();
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var status = sanitizeText_(req.status).toLowerCase();
  var agentType = sanitizeText_(req.agent_type || req.agentType).toLowerCase();
  var memberTier = sanitizeText_(req.member_tier || req.memberTier).toLowerCase();
  var eligible = sanitizeText_(req.tier_upgrade_eligible || req.eligible || "").toLowerCase();
  var includeTest = sanitizeText_(req.include_test || req.includeTest).toUpperCase() === "TRUE";
  var limit = Math.max(1, Math.min(500, parseInt(req.limit || "100", 10) || 100));
  var rows = getSheetRowsByName_("agent_db").filter(function(row) {
    if (!includeTest && sanitizeText_(row.is_test).toUpperCase() === "TRUE") return false;
    if (status && sanitizeText_(row.status).toLowerCase() !== status) return false;
    if (agentType && sanitizeText_(row.agent_type).toLowerCase() !== agentType) return false;
    if (memberTier && sanitizeText_(row.member_tier).toLowerCase() !== memberTier) return false;
    if (eligible && sanitizeText_(row.tier_upgrade_eligible).toLowerCase() !== eligible) return false;
    if (keyword) {
      var hay = [row.agent_id, row.owner_name, row.owner_email, row.owner_phone, row.card_id, row.note].join(" ").toLowerCase();
      if (hay.indexOf(keyword) === -1) return false;
    }
    return true;
  }).sort(function(a, b) {
    return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
  });
  return { ok: true, version: HSC_VERSION, action: "adminListAgents", count: rows.length, agents: rows.slice(0, limit) };
}

function adminUpdateAgent_(req) {
  ensureAllSchemasOrThrow_();

  var now = new Date();
  var nowIso = toIso_(now);

  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!agentId) throw new Error("Missing agent_id");

  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) throw new Error("Agent not found");

  var operator = sanitizeText_(req.operator || req.admin || req.operated_by || req.operatedBy || "admin");
  var reason = sanitizeText_(req.reason || req.note || "admin_update_agent");

  if (Object.prototype.hasOwnProperty.call(req, "tenant")) {
    var incomingTenant = sanitizeText_(req.tenant);
    var originalTenant = sanitizeText_(agent.tenant) || CONFIG.DEFAULT_TENANT;
    if (incomingTenant && incomingTenant !== originalTenant) {
      throw new Error("tenant mismatch: cannot change tenant via adminUpdateAgent");
    }
  }

  var updated = shallowClone_(agent);

  var normalFields = [
    "status",
    "owner_name",
    "owner_email",
    "owner_phone",
    "parent_agent_id",
    "referrer_agent_id",
    "agent_source",
    "note"
  ];

  var sensitiveFields = [
    "agent_type",
    "partner_status",
    "partner_revoke_reason",
    "self_renewal_required",
    "self_renewal_ok",
    "reward_freeze_flag",
    "reward_freeze_reason",
    "member_tier",
    "tier_upgrade_eligible",
    "eligible_for_upgrade",
    "upgrade_status",
    "upgrade_eligible_at",
    "partner_qualified_at",
    "partner_revoked_at",
    "tier_upgrade_reminder_sent_at"
  ];

  if (Object.prototype.hasOwnProperty.call(req, "agentType")) {
    req.agent_type = req.agentType;
  }
  if (Object.prototype.hasOwnProperty.call(req, "memberTier")) {
    req.member_tier = req.memberTier;
  }
  if (Object.prototype.hasOwnProperty.call(req, "upgradeStatus")) {
    req.upgrade_status = req.upgradeStatus;
  }

  var changeLogs = [];

  function applyFieldUpdate_(field, value) {
    var oldValue = sanitizeText_(updated[field]);
    var newValue = sanitizeText_(value);

    if (field === "owner_phone") {
      newValue = sanitizeText_(value);
    }

    if (field === "agent_type") {
      newValue = normalizeAgentTypeForSheet_(newValue || AGENT_ROLE_DEFAULT);
    }

    if (oldValue === newValue) return;

    updated[field] = newValue;
    changeLogs.push({
      field: field,
      old_value: oldValue,
      new_value: newValue
    });
  }

  normalFields.forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(req, field)) {
      applyFieldUpdate_(field, req[field]);
    }
  });

  sensitiveFields.forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(req, field)) {
      applyFieldUpdate_(field, req[field]);
    }
  });

  if (!changeLogs.length) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminUpdateAgent",
      unchanged: true,
      agent: agent
    };
  }

  updated.agent_type = normalizeAgentTypeForSheet_(updated.agent_type || AGENT_ROLE_DEFAULT);
  updated.member_tier = mapAgentTypeToTier_(updated.agent_type);
  syncAgentTierStatusFields_(updated, now);
  updated.updated_at = nowIso;

  updateRowByName_("agent_db", agent.__rowNum, updated);

 changeLogs.forEach(function(item) {
  appendAgentPolicyLog_({
    agent_id: agentId,
    card_id: sanitizeText_(updated.card_id),
    action_type: "admin_update_agent:" + item.field,
    old_value: item.old_value,
    new_value: item.new_value,
    reason: reason,

    created_by: operator,
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT,
    created_at: nowIso
  });
});
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminUpdateAgent",
    updated_fields: changeLogs.map(function(x) { return x.field; }),
    change_count: changeLogs.length,
    agent: updated
  };
}
function adminAdjustPoints_(req) {
  ensureAllSchemasOrThrow_();
  var now = new Date();
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!agentId) throw new Error("Missing agent_id");

  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) throw new Error("Agent not found");

  var points = toNumber_(req.points || req.amount);
  if (!points) throw new Error("Points adjustment cannot be 0");

  var type = sanitizeText_(req.type || (points >= 0 ? "manual_add" : "manual_deduct"));
  var bucket = sanitizeText_(req.bucket || "balance").toLowerCase();
  var operator = sanitizeText_(req.operator || req.admin || "admin");
  var note = sanitizeText_(req.note);
  var refId = sanitizeText_(req.ref_id || req.refId);

  var updated = shallowClone_(agent);

  var beforeBalance = roundMoney_(toNumber_(agent.points_balance));
  var beforeFrozen = roundMoney_(toNumber_(agent.points_frozen));
  var beforeRedeemed = roundMoney_(toNumber_(agent.points_redeemed));

  if (bucket === "freeze") {
    var nextFrozen = roundMoney_(toNumber_(updated.points_frozen) + points);
    var nextBalance = roundMoney_(toNumber_(updated.points_balance) - points);
    if (nextFrozen < 0 || nextBalance < 0) throw new Error("Insufficient points for freeze adjustment");
    updated.points_frozen = String(nextFrozen);
    updated.points_balance = String(nextBalance);

  } else if (bucket === "unfreeze") {
    var unfreezePoints = Math.abs(points);
    var unfrozen = roundMoney_(toNumber_(updated.points_frozen) - unfreezePoints);
    if (unfrozen < 0) throw new Error("Insufficient frozen points");
    updated.points_frozen = String(unfrozen);
    updated.points_balance = String(roundMoney_(toNumber_(updated.points_balance) + unfreezePoints));
    points = unfreezePoints;

  } else if (bucket === "redeem") {
    var redeem = Math.abs(points);
    var nextBal = roundMoney_(toNumber_(updated.points_balance) - redeem);
    if (nextBal < 0) throw new Error("Insufficient points balance");
    updated.points_balance = String(nextBal);
    updated.points_redeemed = String(roundMoney_(toNumber_(updated.points_redeemed) + redeem));
    points = -redeem;

  } else {
    var finalBalance = roundMoney_(toNumber_(updated.points_balance) + points);
    if (finalBalance < 0) throw new Error("Insufficient points balance");
    updated.points_balance = String(finalBalance);
    if (points > 0) updated.points_lifetime = String(roundMoney_(toNumber_(updated.points_lifetime) + points));
    if (points < 0) updated.points_redeemed = String(roundMoney_(toNumber_(updated.points_redeemed) + Math.abs(points)));
  }

  updated.last_points_at = toIso_(now);
  syncAgentTierStatusFields_(updated, now);
  updated.updated_at = toIso_(now);

  updateRowByName_("agent_db", agent.__rowNum, updated);

  appendAgentPointsLog_({
    agent_id: agentId,
    type: type,
    points: points,

    before_balance: beforeBalance,
    after_balance: roundMoney_(toNumber_(updated.points_balance)),

    ref_id: refId,
    note: note,
    created_at: toIso_(now),
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT,
    operator: operator,

    bucket: bucket,
    before_frozen: beforeFrozen,
    after_frozen: roundMoney_(toNumber_(updated.points_frozen)),
    before_redeemed: beforeRedeemed,
    after_redeemed: roundMoney_(toNumber_(updated.points_redeemed))
  });

  return { ok: true, version: HSC_VERSION, action: "adminAdjustPoints", agent: updated };
}

function adminAdjustCommission_(req) {
  ensureAllSchemasOrThrow_();
  var now = new Date();
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!agentId) throw new Error("Missing agent_id");

  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) throw new Error("Agent not found");

  var amount = roundMoney_(toNumber_(req.amount));
  if (!amount) throw new Error("Commission adjustment cannot be 0");

  var type = sanitizeText_(req.type || (amount >= 0 ? "manual_add" : "manual_deduct"));
  var bucket = sanitizeText_(req.bucket || "total").toLowerCase();
  var operator = sanitizeText_(req.operator || req.admin || "admin");
  var note = sanitizeText_(req.note);
  var refId = sanitizeText_(req.ref_id || req.refId);

  var updated = shallowClone_(agent);

  var beforeTotal = roundMoney_(toNumber_(agent.total_commission));
  var beforeFrozen = roundMoney_(toNumber_(agent.commission_frozen));
  var beforePaid = roundMoney_(toNumber_(agent.commission_paid_total));

  if (bucket === "frozen") {
    var frozen = roundMoney_(toNumber_(updated.commission_frozen) + amount);
    if (frozen < 0) throw new Error("Frozen commission cannot be negative");
    updated.commission_frozen = String(frozen);

  } else if (bucket === "paid") {
    var paid = roundMoney_(toNumber_(updated.commission_paid_total) + amount);
    if (paid < 0) throw new Error("Paid commission cannot be negative");
    updated.commission_paid_total = String(paid);

  } else {
    var total = roundMoney_(toNumber_(updated.total_commission) + amount);
    if (total < 0) throw new Error("Total commission cannot be negative");
    updated.total_commission = String(total);
  }

  updated.last_commission_at = toIso_(now);
  updated.updated_at = toIso_(now);
  updateRowByName_("agent_db", agent.__rowNum, updated);

  appendAgentCommissionLog_({
    agent_id: agentId,
    type: type,
    amount: amount,

    before_total: beforeTotal,
    after_total: roundMoney_(toNumber_(updated.total_commission)),

    ref_id: refId,
    note: note,
    created_at: toIso_(now),
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT,
    operator: operator,

    bucket: bucket,
    before_frozen: beforeFrozen,
    after_frozen: roundMoney_(toNumber_(updated.commission_frozen)),
    before_paid: beforePaid,
    after_paid: roundMoney_(toNumber_(updated.commission_paid_total))
  });

  return { ok: true, version: HSC_VERSION, action: "adminAdjustCommission", agent: updated };
}
function getAgentPointsLog_(req) {
  ensureAllSchemasOrThrow_();
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!agentId) throw new Error("Missing agent_id");
  var limit = Math.max(1, Math.min(500, parseInt(req.limit || "100", 10) || 100));
  var rows = getSheetRowsByName_("agent_points_log").filter(function(r) {
    return sanitizeText_(r.agent_id) === agentId;
  }).sort(function(a, b) {
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  }).slice(0, limit);
  return { ok: true, version: HSC_VERSION, action: "getAgentPointsLog", count: rows.length, logs: rows };
}

function getAgentCommissionLog_(req) {
  ensureAllSchemasOrThrow_();
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!agentId) throw new Error("Missing agent_id");
  var limit = Math.max(1, Math.min(500, parseInt(req.limit || "100", 10) || 100));
  var rows = getSheetRowsByName_("agent_commission_log").filter(function(r) {
    return sanitizeText_(r.agent_id) === agentId;
  }).sort(function(a, b) {
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  }).slice(0, limit);
  return { ok: true, version: HSC_VERSION, action: "getAgentCommissionLog", count: rows.length, logs: rows };
}

function appendAgentPointsLog_(data) {
  var row = emptyRow_("agent_points_log");
  row.log_id = sanitizeText_(data.log_id) || ("APL" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4));
  row.agent_id = sanitizeText_(data.agent_id);
  row.type = sanitizeText_(data.type);
  row.points = String(roundMoney_(toNumber_(data.points)));
  row.before_balance = String(roundMoney_(toNumber_(data.before_balance)));
  row.after_balance = String(roundMoney_(toNumber_(data.after_balance)));
  row.ref_id = sanitizeText_(data.ref_id);
  row.note = sanitizeText_(data.note);
  row.created_at = sanitizeText_(data.created_at) || nowIso_();
  row.tenant = sanitizeText_(data.tenant) || CONFIG.DEFAULT_TENANT;
  row.operator = sanitizeText_(data.operator);
  row.bucket = sanitizeText_(data.bucket);
  row.before_frozen = String(roundMoney_(toNumber_(data.before_frozen)));
  row.after_frozen = String(roundMoney_(toNumber_(data.after_frozen)));
  row.before_redeemed = String(roundMoney_(toNumber_(data.before_redeemed)));
  row.after_redeemed = String(roundMoney_(toNumber_(data.after_redeemed)));
  appendRowByName_("agent_points_log", row);
  return row;
}

function appendAgentCommissionLog_(data) {
  var row = emptyRow_("agent_commission_log");
  row.log_id = sanitizeText_(data.log_id) || ("ACL" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4));
  row.agent_id = sanitizeText_(data.agent_id);
  row.type = sanitizeText_(data.type);
  row.amount = String(roundMoney_(toNumber_(data.amount)));
  row.before_total = String(roundMoney_(toNumber_(data.before_total)));
  row.after_total = String(roundMoney_(toNumber_(data.after_total)));
  row.ref_id = sanitizeText_(data.ref_id);
  row.note = sanitizeText_(data.note);
  row.created_at = sanitizeText_(data.created_at) || nowIso_();
  row.tenant = sanitizeText_(data.tenant) || CONFIG.DEFAULT_TENANT;
  row.operator = sanitizeText_(data.operator);
  row.bucket = sanitizeText_(data.bucket);
  row.before_frozen = String(roundMoney_(toNumber_(data.before_frozen)));
  row.after_frozen = String(roundMoney_(toNumber_(data.after_frozen)));
  row.before_paid = String(roundMoney_(toNumber_(data.before_paid)));
  row.after_paid = String(roundMoney_(toNumber_(data.after_paid)));

  appendRowByName_("agent_commission_log", row);
  return row;
}

function runAgentTierSweep_() {
  ensureAllSchemasOrThrow_();
  var now = new Date();
  var changed = 0;
  getSheetRowsByName_("agent_db").forEach(function(agent) {
    var updated = shallowClone_(agent);
    syncAgentTierStatusFields_(updated, now);
    if (JSON.stringify(agent) !== JSON.stringify(updated)) {
      updated.updated_at = toIso_(now);
      updateRowByName_("agent_db", agent.__rowNum, updated);
      changed += 1;
    }
  });
  return { ok: true, version: HSC_VERSION, action: "runAgentTierSweep", changed_count: changed };
}

function runCommercialTriggerSuite_() {
  var result = runDailyOps_({ __system_call: true });
  return {
    ok: !!result.ok,
    version: HSC_VERSION,
    action: "runCommercialTriggerSuite",
    delegated_to: "runDailyOps_",
    daily_ops: result,
    overdue: result.overdue,
    expiry: result.expiry,
    schema: result.schema,
    addon_repair: result.addon_repair,
    payment_reminder: result.payment_reminder,
    renewal_reminder: result.renewal_reminder,
    commission: result.commission_engine
  };
}

/************************************************
* Compatibility trigger bridge
************************************************/

function ensureTimeBasedTrigger_(handlerName, everyDays, hour, minute) {
  var triggers = ScriptApp.getProjectTriggers();
  var exists = triggers.some(function(t) {
    return t.getHandlerFunction() === handlerName;
  });
  if (exists) return false;

  var builder = ScriptApp.newTrigger(handlerName).timeBased().everyDays(everyDays || 1);
  if (typeof minute === "number") {
    builder.atHour(hour || 0).nearMinute(minute);
  } else {
    builder.atHour(hour || 0);
  }
  builder.create();
  return true;
}

function installHSCTriggers() {
  var result = installCommercialTriggers_({ cleanup_legacy: true, __system_call: true });
  Logger.log("✅ installHSCTriggers delegated to installCommercialTriggers_");
  return {
    ok: !!result.ok,
    version: HSC_VERSION,
    action: "installHSCTriggers",
    delegated_to: "installCommercialTriggers_",
    created: result.created || [],
    removed_legacy: result.removed_legacy || []
  };
}

function runDailyMaintenance() {
  var result = runDailyOps_({ __system_call: true });
  Logger.log("✅ runDailyMaintenance delegated to runDailyOps_");
  return {
    ok: !!result.ok,
    version: HSC_VERSION,
    action: "runDailyMaintenance",
    delegated_to: "runDailyOps_",
    payment_reminder: result.payment_reminder,
    payment_lock: result.overdue,
    invite_expire: runInviteExpireSweep(),
    daily_ops: result
  };
}

function runPaymentReminderSweep() {
  var result = triggerPaymentReminder_();
  Logger.log("📢 runPaymentReminderSweep delegated to triggerPaymentReminder_");
  return {
    ok: !!result.ok,
    version: HSC_VERSION,
    action: "runPaymentReminderSweep",
    delegated_to: "triggerPaymentReminder_",
    count: toNumber_(result.count),
    due_soon: result.due_soon || []
  };
}

function runPaymentLockSweep() {
  var result = triggerOverdueLock_();
  Logger.log("🔒 runPaymentLockSweep delegated to triggerOverdueLock_");
  return {
    ok: !!result.ok,
    version: HSC_VERSION,
    action: "runPaymentLockSweep",
    delegated_to: "triggerOverdueLock_",
    locked_count: sanitizeText_(result.locked_count),
    locked: result.locked || []
  };
}

function runInviteExpireSweep() {
  ensureSchemasOrThrow_(["invite_db"]);

  var now = new Date();
  var nowIso = nowIso_();
  var invites = getSheetRowsByName_("invite_db");
  var expired = [];
  var pendingWrites = [];

  invites.forEach(function(invite) {
    try {
      var status = sanitizeText_(invite.status).toLowerCase();
      if (status === "expired" || status === "disabled" || status === "used") return;

      var expiresAt = toDateSafe_(getInviteExpireAtValue_(invite));
      if (!expiresAt) return;
      if (now.getTime() <= expiresAt.getTime()) return;

      var updated = shallowClone_(invite);
      updated.status = "expired";
      updated.expired_at = sanitizeText_(updated.expired_at) || nowIso;
      updated.updated_at = nowIso;

      if (invite.__rowNum) {
        pendingWrites.push({
          rowNum: invite.__rowNum,
          rowObj: updated
        });
      }

      expired.push({
        invite_code: sanitizeText_(updated.invite_code),
        expire_at: getInviteExpireAtValue_(updated)
      });
    } catch (err) {
      Logger.log("⚠️ runInviteExpireSweep error: " + err);
    }
  });

  if (pendingWrites.length) {
    updateRowsByNameBatch_("invite_db", pendingWrites);
  }

  Logger.log("🧹 runInviteExpireSweep executed");
  return {
    ok: true,
    version: HSC_VERSION,
    action: "runInviteExpireSweep",
    delegated_to: "invite_db direct sweep",
    expired_count: expired.length,
    expired: expired
  };
}

// ============================================================
// Update limit override integration
// ============================================================

function isUnlimitedUpdate_(card) {
  return sanitizeText_(card.update_limit_override_enabled) === "TRUE";
}

function getUpdateLimitRemaining_(card) {
  if (isUnlimitedUpdate_(card)) return "UNLIMITED";
  var raw = sanitizeText_(card.update_limit_override_value);
  var n = Number(raw);
  if (!isFinite(n) || raw === "") return 0;
  return Math.max(0, n);
}

function consumeOneUpdateCredit_(card) {
  var updated = shallowClone_(card);
  if (isUnlimitedUpdate_(updated)) return updated;
  var remaining = getUpdateLimitRemaining_(updated);
  if (remaining === "UNLIMITED") return updated;
  if (remaining <= 0) throw new Error("更新次數已用完");
  updated.update_limit_override_value = String(remaining - 1);
  return updated;
}

function grantSingleUpdateCredit_(card, qty) {
  var updated = shallowClone_(card);
  var count = Number(qty || 1);
  if (!isFinite(count) || count <= 0) count = 1;
  if (isUnlimitedUpdate_(updated)) return updated;
  var remaining = getUpdateLimitRemaining_(updated);
  if (remaining === "UNLIMITED") remaining = 0;
  updated.update_limit_override_enabled = "FALSE";
  updated.update_limit_override_value = String(Number(remaining || 0) + count);
  return updated;
}

function grantUnlimitedUpdate_(card) {
  var updated = shallowClone_(card);
  updated.update_limit_override_enabled = "TRUE";
  if (!sanitizeText_(updated.features_json)) updated.features_json = "{}";
  return updated;
}

function normalizeAddOnType_(value) {
  var v = sanitizeText_(value).toLowerCase();
  if (v === "marquee" || v === "addon_marquee") return "marquee";
  if (v === "cta_extra" || v === "cta" || v === "ctaextra" || v === "addon_cta") return "cta_extra";
  if (v === "photo_extra" || v === "photo" || v === "photoextra" || v === "addon_photo") return "photo_extra";
  if (v === "update_unlimited" || v === "addon_update_unlimited") return "update_unlimited";
  if (v === "update_once" || v === "addon_update_once") return "update_once";
  throw new Error("Unsupported add_on_type: " + value);
}

function getAddOnPriceMap_() {
  return {
    marquee: 300,
    cta_extra: 100,
    photo_extra: 100,
    update_unlimited: 300,
    update_once: 300
  };
}

function applyAddOnEntitlementsToCard_(card, addOnType) {
  var updatedCard = shallowClone_(card);
  var currentPhotoExtra = Math.max(0, Number(updatedCard.photo_extra_purchased || 0));
  var currentCtaExtra = Math.max(0, Number(updatedCard.cta_extra_purchased || 0));
  var currentPhotoLimit = Math.max(0, Number(updatedCard.photo_limit || 0));
  var currentCtaLimit = Math.max(0, Number(updatedCard.cta_limit || 0));

  if (addOnType === "marquee") {
    updatedCard.marquee_purchased = "TRUE";
    if (!sanitizeText_(updatedCard.marquee_enabled)) updatedCard.marquee_enabled = "TRUE";
  } else if (addOnType === "cta_extra") {
    updatedCard.cta_extra_purchased = String(currentCtaExtra + 1);
    updatedCard.cta_limit = String(currentCtaLimit + 1);
  } else if (addOnType === "photo_extra") {
    updatedCard.photo_extra_purchased = String(currentPhotoExtra + 1);
    updatedCard.photo_limit = String(Math.min(PHOTO_LIMIT_ABSOLUTE_MAX, currentPhotoLimit + 1));
  } else if (addOnType === "update_unlimited") {
    updatedCard = grantUnlimitedUpdate_(updatedCard);
  } else if (addOnType === "update_once") {
    updatedCard = grantSingleUpdateCredit_(updatedCard, 1);
  } else {
    throw new Error("Unsupported add_on_type: " + addOnType);
  }
  return updatedCard;
}

// ============================================================
// Entitlement sync
// ============================================================

function normalizeEntitlementNumber_(value, fallback) {
  var n = Number(value);
  if (!isFinite(n) || isNaN(n)) return Number(fallback || 0);
  return n;
}

function getCommercialPriceConfig_() {
  var defaults = {
    plan_free: 1500,
    plan_premium: 2000,
    addon_update_unlimited: 300,
    addon_cta: 100,
    addon_photo: 100,
    addon_marquee: 300,
    addon_bundle: 500,
    renewal_price: 500,
    renewal_update_price: 200,
    single_update_price: 300,
    midterm_update_min_price: 100
  };
  try {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName('pricing_db');
    if (!sheet) return defaults;
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return defaults;
    var headers = values[0].map(function(v){ return String(v || '').trim(); });
    var idx = {};
    headers.forEach(function(h, i){ idx[h] = i; });
    var codeIdx = idx.item_code;
    var priceIdx = idx.price;
    if (codeIdx === undefined || priceIdx === undefined) return defaults;
    for (var r = 1; r < values.length; r++) {
      var code = String(values[r][codeIdx] || '').trim();
      if (!code) continue;
      var price = Number(values[r][priceIdx]);
      if (!isFinite(price) || isNaN(price)) continue;
      if (Object.prototype.hasOwnProperty.call(defaults,
 code)) {
        defaults[code] = price;
      }
    }
  } catch (e) {}
  return defaults;
}

function getPlanEntitlements_(planCode, tenant) {
  var cleanPlan = sanitizeText_(planCode) || 'free';
  var info = {
    plan_id: cleanPlan,
    plan_price: cleanPlan === 'premium' ? 2000 : 1500,
    cta_limit: cleanPlan === 'premium' ? 3 : 1,
    photo_limit_default: cleanPlan === 'premium' ? 5 : 2,
    photo_limit_max: cleanPlan === 'premium' ? 5 : 2,
    free_update_limit_yearly: 1,
    renewal_price: 500,
    extra_update_fee: 300,
    update_limit_enabled: 'TRUE',
    extra_update_fee_enabled: 'TRUE'
  };
  try {
    var plan = ensurePlanExists_(cleanPlan, tenant || CONFIG.DEFAULT_TENANT);
    if (plan) {
      info.plan_id = sanitizeText_(plan.plan_id) || info.plan_id;
      info.plan_price = normalizeEntitlementNumber_(plan.price, info.plan_price);
      info.cta_limit = Math.max(0, normalizeEntitlementNumber_(plan.cta_limit, info.cta_limit));
      info.photo_limit_default = Math.max(0, normalizeEntitlementNumber_(plan.photo_limit_default, info.photo_limit_default));
      info.photo_limit_max = Math.max(info.photo_limit_default, normalizeEntitlementNumber_(plan.photo_limit_max, info.photo_limit_max));
      info.free_update_limit_yearly = Math.max(0, normalizeEntitlementNumber_(plan.free_update_limit_yearly, info.free_update_limit_yearly));
      info.renewal_price = Math.max(0, normalizeEntitlementNumber_(plan.renewal_price, info.renewal_price));
      info.extra_update_fee = Math.max(0, normalizeEntitlementNumber_(plan.extra_update_fee, info.extra_update_fee));
      info.update_limit_enabled = sanitizeText_(plan.update_limit_enabled) || info.update_limit_enabled;
      info.extra_update_fee_enabled = sanitizeText_(plan.extra_update_fee_enabled) || info.extra_update_fee_enabled;
    }
  } catch (e) {}
  return info;
}

function getCardAddonSummary_(cardRow) {
  var summary = {
    addon_photo_qty: 0,
    addon_cta_qty: 0,
    update_unlimited_purchased: false,
    marquee_purchased: false,
    marquee_enabled: false,
    bundle_purchased: false,
    sources: []
  };

  if (!cardRow) return summary;

  var cardPhotoExtra = Math.max(0, Number(cardRow.photo_extra_purchased || 0));
  if (cardPhotoExtra > 0 || toBoolean_(cardRow.photo_extra_purchased)) {
    summary.addon_photo_qty += cardPhotoExtra > 0
      ? cardPhotoExtra
      : Math.max(0, getEffectivePhotoLimit_(cardRow) -  (sanitizeText_(cardRow.plan).toLowerCase() === 'premium' ? 5 : 2));
    summary.sources.push('card.photo_extra_purchased');
  }
  var cardCtaExtra = Math.max(0, Number(cardRow.cta_extra_purchased || 0));
  if (cardCtaExtra > 0 || toBoolean_(cardRow.cta_extra_purchased)) {
    summary.addon_cta_qty += cardCtaExtra > 0
      ? cardCtaExtra
      : Math.max(0, getEffectiveCtaLimit_(cardRow) - (sanitizeText_(cardRow.plan).toLowerCase() === 'premium' ? 3 : 1));
    summary.sources.push('card.cta_extra_purchased');
  }
  if (toBoolean_(cardRow.marquee_purchased)) {
    summary.marquee_purchased = true;
    summary.sources.push('card.marquee_purchased');
  }
  if (toBoolean_(cardRow.marquee_enabled)) {
    summary.marquee_enabled = true;
    summary.sources.push('card.marquee_enabled');
  }
  if (sanitizeText_(cardRow.update_unlimited_enabled) === 'TRUE') {
    summary.update_unlimited_purchased = true;
    summary.sources.push('card.update_unlimited_enabled');
  }
  if (!summary.update_unlimited_purchased && sanitizeText_(cardRow.update_limit_override_enabled) === 'TRUE') {
    summary.update_unlimited_purchased = true;
    summary.sources.push('legacy.update_limit_override_enabled');
  }

  try {
    var rows = getSheetRowsByName_('add_on_order_db').filter(function(row) {
      return sanitizeText_(row.card_id) === sanitizeText_(cardRow.id);
    });
    rows.forEach(function(row) {
      var status = sanitizeText_(row.status).toLowerCase();
      if (['paid','approved','active','effective'].indexOf(status) === -1) return;
      var qty = Math.max(1, normalizeEntitlementNumber_(row.qty, 1));
      var key = sanitizeText_(row.addon_key || row.addon_type).toLowerCase();
      if (key === 'addon_bundle' || key === 'bundle') {
        summary.bundle_purchased = true;
        summary.update_unlimited_purchased = true;
        summary.marquee_purchased = true;
        summary.sources.push('addon_order.bundle');
        return;
      }
      if (key === 'addon_update_unlimited' || key === 'update_unlimited' || key === 'unlimited_update') {
        summary.update_unlimited_purchased = true;
        summary.sources.push('addon_order.update_unlimited');
        return;
      }
      if (key === 'addon_photo' || key === 'photo' || key === 'photo_extra') {
        summary.addon_photo_qty += qty;
        summary.sources.push('addon_order.photo');
        return;
      }
      if (key === 'addon_cta' || key === 'cta' || key === 'cta_extra') {
        summary.addon_cta_qty += qty;
        summary.sources.push('addon_order.cta');
        return;
      }
      if (key === 'addon_marquee' || key === 'marquee') {
        summary.marquee_purchased = true;
        summary.sources.push('addon_order.marquee');
      }
    });
  } catch (e) {}

  return summary;
}

function computeMidtermUnlimitedPrice_(cardRow, fullPrice, minPrice) {
  var full = Math.max(0, normalizeEntitlementNumber_(fullPrice, 300));
  var minimum = Math.max(0, normalizeEntitlementNumber_(minPrice, 100));
  var exp = toDateSafe_(cardRow && (cardRow.expires_at || cardRow.card_expires_at));
  if (!exp) return full;
  var now = new Date();
  var remainingMs = exp.getTime() - now.getTime();
  if (remainingMs <= 0) return minimum;
  var remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  var price = Math.round(full * (remainingDays / 365));
  if (price < minimum) price = minimum;
  if (price > full) price = full;
  return price;
}

function getMarqueeStatus_(cardRow, addonSummary) {
  var purchased = !!(addonSummary && addonSummary.marquee_purchased);
  var enabled = !!(addonSummary && addonSummary.marquee_enabled);
  if (enabled) return 'active';
  if (purchased) return 'purchased_pending';
  return 'not_purchased';
}

function buildEffectiveEntitlements_(cardRow, options) {
  var opts = options || {};
  var tenant = sanitizeText_(cardRow && cardRow.tenant) || CONFIG.DEFAULT_TENANT;
  var planCode = sanitizeText_(cardRow && cardRow.plan) || 'free';
  var planInfo = getPlanEntitlements_(planCode, tenant);
  var addonSummary = getCardAddonSummary_(cardRow || {});
  var priceConfig = getCommercialPriceConfig_();
  var isPremium = sanitizeText_(planCode).toLowerCase() === 'premium';

  var overridePhoto = sanitizeText_(cardRow && (cardRow.photo_limit_override || ''));
  var overrideCta = sanitizeText_(cardRow && (cardRow.cta_limit_override || ''));
  var legacyPhoto = normalizeEntitlementNumber_(cardRow && cardRow.photo_limit, 0);
  var legacyCta = normalizeEntitlementNumber_(cardRow && cardRow.cta_limit, 0);

  var planPhoto = Math.max(0, normalizeEntitlementNumber_(planInfo.photo_limit_default, isPremium ? 5 : 2));
  var planCta = Math.max(0, normalizeEntitlementNumber_(planInfo.cta_limit, isPremium ? 3 : 1));

  var effectivePhoto = 0;
  if (overridePhoto !== '') {
    effectivePhoto = Math.max(0, normalizeEntitlementNumber_(overridePhoto, planPhoto));
  } else if (legacyPhoto > 0) {
    effectivePhoto = legacyPhoto;
  } else if (addonSummary.addon_photo_qty > 0) {
    effectivePhoto = planPhoto + addonSummary.addon_photo_qty;
  } else {
    effectivePhoto = planPhoto;
  }

  var effectiveCta = 0;
  if (overrideCta !== '') {
    effectiveCta = Math.max(0, normalizeEntitlementNumber_(overrideCta, planCta));
  } else if (legacyCta > 0) {
    effectiveCta = legacyCta;
  } else if (addonSummary.addon_cta_qty > 0) {
    effectiveCta = planCta + addonSummary.addon_cta_qty;
  } else {
    effectiveCta = planCta;
  }

  if (effectivePhoto <= 0) effectivePhoto = isPremium ? 5 : 2;
  if (effectiveCta <= 0) effectiveCta = isPremium ? 3 : 1;

  var freeQuota = normalizeEntitlementNumber_(cardRow && cardRow.annual_free_update_quota, planInfo.free_update_limit_yearly || 1);
  if (sanitizeText_(cardRow && cardRow.update_limit_override_enabled) === 'TRUE' && sanitizeText_(cardRow && cardRow.update_limit_override_value) !== '') {
    var legacyQuota = normalizeEntitlementNumber_(cardRow && cardRow.update_limit_override_value, freeQuota);
    if (legacyQuota >= 0 && !sanitizeText_(cardRow && cardRow.update_unlimited_enabled)) freeQuota = legacyQuota;
  }
  if (freeQuota < 0) freeQuota = 0;

  var freeUsed = normalizeEntitlementNumber_(cardRow && cardRow.annual_free_update_used, 0);
  if (!freeUsed && sanitizeText_(cardRow && cardRow.id)) {
    try {
      freeUsed = getCurrentYearUpdateCount_(cardRow.id);
    } catch (e) {
      Logger.log("buildEffectiveEntitlements_ getCurrentYearUpdateCount_ failed for card " + sanitizeText_(cardRow && cardRow.id) + ": " + (e && e.message ? e.message : String(e)));
    }
  }
  if (freeUsed < 0) freeUsed = 0;
  var freeRemaining = Math.max(0, freeQuota - freeUsed);

  var unlimitedEnabledRaw = sanitizeText_(cardRow && cardRow.update_unlimited_enabled) === 'TRUE' || addonSummary.update_unlimited_purchased;
  var unlimitedExpireAt = sanitizeText_(cardRow && cardRow.update_unlimited_expires_at) || sanitizeText_(cardRow && cardRow.expires_at);
  var unlimitedExpireDate = toDateSafe_(unlimitedExpireAt);
  var unlimitedActive = !!(unlimitedEnabledRaw && unlimitedExpireDate && unlimitedExpireDate.getTime() >= new Date().getTime());

  var updateMode = 'none';
  if (unlimitedActive) updateMode = 'unlimited';
  else if (freeRemaining > 0) updateMode = 'quota';

  var marqueeStatus = getMarqueeStatus_(cardRow || {}, addonSummary);
  var marqueeEnabled = marqueeStatus === 'active';

  return {
    effective_photo_limit: effectivePhoto,
    effective_cta_limit: effectiveCta,
   
 update_mode: updateMode,
    free_update_quota: freeQuota,
    free_update_used: freeUsed,
    free_update_remaining: freeRemaining,
    update_unlimited_enabled: unlimitedActive,
    update_unlimited_expire_at: unlimitedExpireAt,
    update_unlimited_source: sanitizeText_(cardRow && cardRow.update_unlimited_source) || (addonSummary.update_unlimited_purchased ? 'addon_or_legacy' : ''),
    marquee_status: marqueeStatus,
    marquee_enabled: marqueeEnabled,
    marquee_purchased: marqueeStatus !== 'not_purchased',
    pricing: {
      create_update_price: Math.max(0, normalizeEntitlementNumber_(priceConfig.addon_update_unlimited, 300)),
      renewal_update_price: Math.max(0, normalizeEntitlementNumber_(priceConfig.renewal_update_price, 200)),
      single_update_price: Math.max(0, normalizeEntitlementNumber_(priceConfig.single_update_price, planInfo.extra_update_fee || 300)),
      midterm_unlimited_price: computeMidtermUnlimitedPrice_(cardRow || {}, Math.max(0, normalizeEntitlementNumber_(priceConfig.addon_update_unlimited, 300)), Math.max(0, normalizeEntitlementNumber_(priceConfig.midterm_update_min_price, 100))),
      renewal_price: Math.max(0, normalizeEntitlementNumber_(priceConfig.renewal_price, planInfo.renewal_price || 500))
    },
    source: {
      plan_photo_limit: planPhoto,
      plan_cta_limit: planCta,
      override_photo_limit: overridePhoto !== '' ? normalizeEntitlementNumber_(overridePhoto, 0) : '',
      override_cta_limit: overrideCta !== '' ? normalizeEntitlementNumber_(overrideCta, 0) : '',
      addon_photo_qty: addonSummary.addon_photo_qty,
      addon_cta_qty: addonSummary.addon_cta_qty,
      addon_sources: addonSummary.sources
    }
  };
}

function evaluateUpdateEligibilityForCard_(card) {
  var ent = buildEffectiveEntitlements_(card || {});
  return {
    card_id: sanitizeText_(card && card.id),
    plan: sanitizeText_(card && card.plan),
    limit_enabled: ent.update_mode !== 'unlimited',
    free_update_limit_yearly: ent.free_update_quota,
    used_update_count_yearly: ent.free_update_used,
    remaining_free_updates: ent.free_update_remaining,
    charge_required: ent.update_mode === 'none',
    charge_amount: ent.update_mode === 'none' ? ent.pricing.single_update_price : 0,
    paid_ready: ent.update_mode !== 'none' ? true : !!getLatestPaidUpdateFeePayment_(sanitizeText_(card && card.id)),
    latest_paid_update_fee_payment_id: (getLatestPaidUpdateFeePayment_(sanitizeText_(card && card.id)) || {}).payment_id || '',
    year_bucket: getYearBucket_(),
    rule_source: 'entitlement_sync',
    update_mode: ent.update_mode,
    update_unlimited_enabled: ent.update_unlimited_enabled,
    update_unlimited_expire_at: ent.update_unlimited_expire_at
  };
}

function getEffectivePhotoLimit_(card) {
  return buildEffectiveEntitlements_(card || {}).effective_photo_limit;
}

function getEffectiveCtaLimit_(card) {
  return buildEffectiveEntitlements_(card || {}).effective_cta_limit;
}

/************************************************
 * v6.3 addon-order-payment patch
 ************************************************/

  function uniqueKeepOrder_(arr) {
    var out = [];
    var seen = {};
    (arr || []).forEach(function(v) {
      var key = String(v || "").trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  if (!CONFIG.SHEETS.PRICING) CONFIG.SHEETS.PRICING = "pricing_db";

  if (ACTIONS.indexOf("adminGetOrderDetail") === -1) ACTIONS.push("adminGetOrderDetail");
  if (ACTIONS.indexOf("adminListOrders") === -1) ACTIONS.push("adminListOrders");
  if (ACTIONS.indexOf("adminCreateAddonOrder") === -1) ACTIONS.push("adminCreateAddonOrder");
  if (ADMIN_PROTECTED_ACTIONS.indexOf("adminGetOrderDetail") === -1) ADMIN_PROTECTED_ACTIONS.push("adminGetOrderDetail");
  if (ADMIN_PROTECTED_ACTIONS.indexOf("adminListOrders") === -1) ADMIN_PROTECTED_ACTIONS.push("adminListOrders");
  if (ADMIN_PROTECTED_ACTIONS.indexOf("adminCreateAddonOrder") === -1) ADMIN_PROTECTED_ACTIONS.push("adminCreateAddonOrder");

  function getItemDbSheet_() {
    var ss = getSpreadsheet_();
    var name = "pricing_db";
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    return sheet;
  }
    function getItemMap_(tenant) {
    ensureItemDbSchema_();
    var rows = getItemDbSheet_().getDataRange().getValues();
    if (!rows || rows.length < 2) return {};
    var headers = rows[0].map(function(v){ return String(v || "").trim(); });
    var map = {};
    for (var i = 1; i < rows.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) row[headers[j]] = rows[i][j];
      var code = sanitizeText_(row.item_code);
      if (!code) continue;
      var rowTenant = sanitizeText_(row.tenant) || CONFIG.DEFAULT_TENANT;
      if (tenant && rowTenant && rowTenant !== tenant) continue;
      map[code] = {
        item_code: code,
        item_name: sanitizeText_(row.item_name),
        price: Number(row.price || 0),
        status: sanitizeText_(row.status) || "active",
        tenant: rowTenant,
        bundle_items: sanitizeText_(row.bundle_items)
      };
    }
    return map;
  }

  function getItemByCode_(itemCode, tenant) {
    var code = sanitizeText_(itemCode);
    if (!code) throw new Error("Missing item_code");
    var item = getItemMap_(tenant)[code];
    if (!item) throw new Error("Item not found: " + code);
    if (!isActiveStatus_(item.status)) throw new Error("Item inactive: " + code);
    return item;
  }

  function resolvePlanItem_(planCode, tenant) {
    var raw = sanitizeText_(planCode);
    if (!raw) throw new Error("Missing plan");
    var code = raw.indexOf("plan_") === 0 ? raw : ("plan_" + raw);
    if (code !== "plan_free" && code !== "plan_premium") throw new Error("Unsupported plan: " + raw);
    return getItemByCode_(code, tenant);
  }

  function normalizeAddonItems_(input) {
    var arr = [];
    if (!input) return arr;
    if (Array.isArray(input)) {
      arr = input;
    } else if (typeof input === "string") {
      var s = String(input || "").trim();
      if (!s) return [];
      if (/^\s*\[/.test(s)) {
        try { arr = JSON.parse(s); } catch (e) { throw new Error("Invalid addon JSON"); }
      } else {
        arr = s.split(",").map(function(part) {
          var seg = String(part || "").trim();
          if (!seg) return null;

          var p = seg.split(":");
          return { item_code: sanitizeText_(p[0]), qty: p.length > 1 ? Number(p[1]) : 1 };
        }).filter(Boolean);
      }
    } else if (typeof input === "object") {
      arr = [input];
    } else {
      return [];
    }

    var merged = {};
    arr.forEach(function(item) {
      if (!item) return;
      var code = normalizeAddonItemCode_(item.item_code || item.code || item.addon_code || item.addon_type || item.add_on_type || item.addon_key);
      if (!code) return;
      if (code === "plan_free" || code === "plan_premium") throw new Error("Plan item cannot appear in addon items: " + code);
      var qty = Number(item.qty || item.quantity || 1);
      if (!isFinite(qty) || qty <= 0) return;
      merged[code] = (merged[code] || 0) + qty;
    });

    return Object.keys(merged).map(function(code) {
      return {
        item_code: code,
        item_name: getAddonItemNameByCode_(code),
        qty: merged[code]
      };
    });
  }

  function expandBundleItems_(addonItems, tenant) {
    var normalized = normalizeAddonItems_(addonItems);
    var expanded = [];
    normalized.forEach(function(entry) {
      var item = getItemByCode_(entry.item_code, tenant);
      var bundle = sanitizeText_(item.bundle_items);
      if (bundle) {
        bundle.split(",").map(function(v){ return sanitizeText_(v); }).filter(Boolean).forEach(function(child) {
          expanded.push({ item_code: child, qty: entry.qty, bundle_parent_code: entry.item_code });
        });
      } else {
        expanded.push({ item_code: entry.item_code, qty: entry.qty, bundle_parent_code: "" });
      }
    });

    var merged = {};
    expanded.forEach(function(entry) {
      var key = entry.item_code + "||" + (entry.bundle_parent_code || "");
      if (!merged[key]) merged[key] = { item_code: entry.item_code, qty: 0, bundle_parent_code: entry.bundle_parent_code || "" };
      merged[key].qty += entry.qty;
    });
    return Object.keys(merged).map(function(k){ return merged[k]; });
  }

  function calculateAddonSummary_(addonItems, tenant) {
    var expanded = expandBundleItems_(addonItems, tenant);
    var items = [];
    var total = 0;
    expanded.forEach(function(entry) {
      var item = getItemByCode_(entry.item_code, tenant);
      var row = {
        item_code: entry.item_code,
        item_name: item.item_name,
        unit_price: Number(item.price || 0),
        qty: Number(entry.qty || 0),
        amount: Number(item.price || 0) * Number(entry.qty || 0),
        bundle_parent_code: entry.bundle_parent_code || ""
      };
      total += row.amount;
      items.push(row);
    });
    return { addon_items: items, addon_amount: total };
  }

  function getOrderAddonSummaryText_(addonItems) {
    var parts = (addonItems || []).map(function(item) {
      return sanitizeText_(item.item_name || item.item_code) + " x" + Number(item.qty || 0) + " = " + Number(item.amount || 0);
    });
    return parts.join(" / ");
  }

/************************************************
Commission engine helpers
************************************************/

/************************************************
* HSC GAS v7.11.1-recognition-stable
************************************************/

function getSs_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function sanitizeText_(value) {
  return value == null ? "" : String(value).trim();
}

function normalizeCell_(value) {
  if (value === null || value === undefined) return "";

  if (Object.prototype.toString.call(value)
 === "[object Date]") {
    return isNaN(value.getTime()) ? "" : toIso_(value);
  }

  if (typeof value === "number") {
    return isFinite(value) ? String(value) : "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return sanitizeText_(value);
}

const SCHEMA_DATE_FIELDS_MAP_ = {
  card_db: ["created_at","updated_at","activated_at","inactivated_at","expired_at","expires_at","form_ts","reserved_at","confirmed_at","update_token_created_at","update_token_expire","update_link_sent_at","payment_due_at","payment_paid_at","remind_at","reminded_at","delivered_at"],
  lead_db: ["created_at","updated_at","form_ts","converted_at"],
  invite_db: ["created_at","expired_at","expire_at","used_at","disabled_at"],
  plan_db: ["created_at","updated_at"],
  payment_db: ["created_at","updated_at","paid_at","due_at","reviewed_at","refund_at","commission_processed_at","commission_reversed_at"],
  renewal_db: ["created_at","updated_at","current_expires_at","new_expires_at","due_at","paid_at","renew_token_created_at","renew_token_expire","last_reminded_at"],
  commission_db: ["created_at","updated_at","calculated_at","paid_at","frozen_at","unfrozen_at","reversal_at"],
  commission_rules: ["start_at","end_at","created_at","updated_at"],
  agent_db: ["created_at","updated_at","upgrade_eligible_at","partner_qualified_at","partner_revoked_at","reward_freeze_at","reward_unfreeze_at","last_points_at","last_commission_at","last_reversed_at","tier_upgrade_reminder_sent_at"],
  announcement_db: ["start_at","end_at","created_at","updated_at"],
  update_log_db: ["created_at","updated_at"],
  agent_policy_log: ["created_at"],
  promo_rules: ["start_at","end_at","created_at","updated_at"],
  request_db: ["created_at"],
  service_log: ["service_date","validated_at","created_at","updated_at"],
  add_on_order_db: ["created_at","updated_at","paid_at","cancelled_at","applied_at","due_at"],
  ops_log_db: ["created_at"],
  agent_settlement_report: ["calculated_at","approved_at","paid_at"],
  agent_points_log: ["created_at"],
  agent_commission_log: ["created_at"],
  recognition_db: ["created_at","updated_at","recognized_at"]
};

function normalizeIsoDateTimeValue_(value) {
  if (value === null || value === undefined || value === "") return "";
  var dt = toDateSafe_(value);
  if (!dt) return sanitizeText_(value);
  return toIso_(dt);
}

function resolveRequiredDueAtFromBase_(baseValue) {
  var baseDate = toDateSafe_(baseValue) || new Date();
  return toIso_(addDays_(baseDate, CONFIG.PAYMENT_DUE_DAYS || 3));
}

function normalizeRowDateFieldsForSchema_(schemaName, rowObj) {
  var cloned = shallowClone_(rowObj || {});
  var fields = SCHEMA_DATE_FIELDS_MAP_[schemaName] || [];
  fields.forEach(function(field) {
    if (!Object.prototype.hasOwnProperty.call(cloned, field)) return;
    cloned[field] = normalizeIsoDateTimeValue_(cloned[field]);
  });
  return cloned;
}

function ensureRequiredDueFieldsForSchema_(schemaName, rowObj) {
  var cloned = shallowClone_(rowObj || {});
  var status = sanitizeText_(cloned.status).toLowerCase();
  var billingStatus = sanitizeText_(cloned.billing_status).toLowerCase();

  if (schemaName === "payment_db") {
    if (!sanitizeText_(cloned.paid_at) && status === "pending" && !sanitizeText_(cloned.due_at)) {
      cloned.due_at = resolveRequiredDueAtFromBase_(cloned.created_at || cloned.updated_at);
    }
  }

  if (schemaName === "renewal_db") {
    var renewalPending = status === "pending" || status === "unpaid" || billingStatus === "unpaid" || billingStatus === "pending";
    if (!sanitizeText_(cloned.paid_at) && renewalPending && !sanitizeText_(cloned.due_at)) {
      cloned.due_at = resolveRequiredDueAtFromBase_(cloned.created_at || cloned.updated_at || cloned.current_expires_at);
    }
  }

  if (schemaName === "add_on_order_db") {
    if (status === "pending" && !sanitizeText_(cloned.paid_at) && !sanitizeText_(cloned.cancelled_at) && !sanitizeText_(cloned.due_at)) {
      cloned.due_at = resolveRequiredDueAtFromBase_(cloned.created_at || cloned.updated_at);
    }
  }

  if (schemaName === "card_db") {
    var unpaidCard = (billingStatus === "unpaid" || billingStatus === "overdue" || billingStatus === "pending" || (!billingStatus && !sanitizeText_(cloned.payment_paid_at)));
    if (unpaidCard && !sanitizeText_(cloned.payment_paid_at) && !sanitizeText_(cloned.payment_due_at)) {
      cloned.payment_due_at = resolveRequiredDueAtFromBase_(cloned.delivered_at || cloned.created_at || cloned.updated_at);
    }
  }

  return cloned;
}

function getInviteExpireAtValue_(invite) {
  invite = invite || {};
  return sanitizeText_(invite.expire_at) || sanitizeText_(invite.expired_at) || "";
}
function normalizeCardId_(input) {
  var raw = sanitizeText_(input).toUpperCase();
  if (!raw) return "";

  if (/^TW\d{4,}$/.test(raw)) return raw;

  if (/^\d+$/.test(raw)) {
    return "TW" + ("0000" + raw).slice(-4);
  }

  if (/^TW\d+$/.test(raw)) {
    var num = raw.replace("TW", "");
    return "TW" + ("0000" + num).slice(-4);
  }

  return raw;
}
function isCardEligibleForRenewal_(card) {
  if (!card) {
    return { eligible: false, reason: "CARD_NOT_FOUND" };
  }

  var activatedAt = sanitizeText_(card.activated_at);
  var expiresAt = sanitizeText_(card.expires_at);
  var billingStatus = sanitizeText_(card.billing_status).toLowerCase();
  var paidAt = sanitizeText_(card.payment_paid_at);
  var deliveredAt = sanitizeText_(card.delivered_at);

  var hasEverActivated = !!activatedAt || !!expiresAt;
  var firstPaymentDone = !!paidAt || hasEverActivated || billingStatus === "paid" || billingStatus === "active";

  if (!firstPaymentDone) {
    return { eligible: false, reason: "FIRST_PAYMENT_NOT_COMPLETED" };
  }

  if (!activatedAt && !expiresAt) {
    return { eligible: false, reason: "CARD_NEVER_ACTIVATED" };
  }

  if (billingStatus === "overdue" && !hasEverActivated) {
    return { eligible: false, reason: "OVERDUE_NEVER_ACTIVATED" };
  }

  if (!deliveredAt && !hasEverActivated && !paidAt) {
    return { eligible: false, reason: "CARD_NOT_DELIVERED" };
  }

  return { eligible: true, reason: "" };
}
function isPlanUpgrade_(currentPlan, targetPlan) {
  var currentNorm = sanitizeText_(currentPlan).toLowerCase();
  var targetNorm = sanitizeText_(targetPlan).toLowerCase();

  if (!currentNorm || !targetNorm) return false;
  if (currentNorm === targetNorm) return false;

  var rank = {
    free: 1,
    premium: 2
  };

  return (rank[targetNorm] || 0) > (rank[currentNorm] || 0);
}
function normalizeStatus_(value) {
  return sanitizeText_(value).toLowerCase();
}
function sanitizePhoneAsText_(value) {
  var s = sanitizeText_(value);
  return s ? s.replace(/\s+/g, "") : "";
}

function toBoolean_(value) {
  if (typeof value === "boolean") return value;
  var s = sanitizeText_(value).toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function toNumber_(value, fallback) {
  var n = Number(value);
  return isFinite(n) ? n : (typeof fallback === "number" ? fallback : 0);
}

function safeStringify_(obj) {
  try {
    return JSON.stringify(obj || {});
  } catch (err) {
    return "{}";
  }
}

function shallowClone_(obj) {
  var out = {};
  Object.keys(obj || {}).forEach(function(k) { out[k] = obj[k]; });
  return out;
}

function sameTenant_(a, b) {
  return sanitizeText_(a || CONFIG.DEFAULT_TENANT) === sanitizeText_(b || CONFIG.DEFAULT_TENANT);
}

function getHeaders_(sheetName) {
  var sheet = getSheetByName_(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(v) { return sanitizeText_(v); });
}

function ensureSheetHeaders_(sheetName) {
  var expected = SHEET_HEADERS[sheetName];
  if (!expected) throw new Error("Unknown sheet header config: " + sheetName);
  var ss = getSs_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  var existing = [];
  if (sheet.getLastColumn() > 0) {
    existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(v) { return sanitizeText_(v); });
  }
  var changed = false;
  expected.forEach(function(h, idx) {
    if (existing[idx] !== h) {
      existing[idx] = h;
      changed = true;
    }
  });
  if (changed || sheet.getLastColumn() < expected.length) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
  }
  return sheet;
}

function ensureItemDbSchema_() {
  Object.keys(SHEET_HEADERS).forEach(function(sheetName) {
    ensureSheetHeaders_(sheetName);
  });
}

function ensurePaymentDbSchema_() {
  ensureSheetHeaders_("payment_db");
}

function ensureAddonOrderDbSchema_() {
  ensureSheetHeaders_("add_on_order_db");
}

function getAllObjects_(sheetOrName) {
  var sheet = typeof sheetOrName === "string" ? getSheetByName_(sheetOrName) : sheetOrName;
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0].map(function(v) { return sanitizeText_(v); });
  return values.slice(1).map(function(row, idx) {
    var obj = { __rowNum: idx + 2 };
    headers.forEach(function(h, colIdx) {
      obj[h] = row[colIdx];
    });
    return obj;
  });
}

function appendObject_(sheetOrName, obj) {
  var sheet = typeof sheetOrName === "string" ? getSheetByName_(sheetOrName) : sheetOrName;
  if (!sheet) throw new Error("Sheet not found");
  var headers = getHeaders_(sheet.getName());
  var row = headers.map(function(h) { return obj[h] == null ? "" : obj[h]; });
  sheet.appendRow(row);
}

function updateRowByIndex_(sheetName, rowNum, obj) {
  var sheet = getSheetByName_(sheetName);
  var headers = getHeaders_(sheetName);
  var row = headers.map(function(h) { return obj[h] == null ? "" : obj[h]; });
  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
}

function
 generateRandomCode_(len) {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var out = "";
  var n = Number(len) || 4;
  for (var i = 0; i < n; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
function generateInviteCode_() {
  return "IC" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + Math.floor(Math.random() * 900 + 100);
}

function generateLeadId_() {
  return "LD" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + Math.floor(Math.random() * 900 + 100);
}

function generateCardId_() {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    lock.waitLock(30000);
    hasLock = true;
  } catch (lockErr) {
    clearSheetRowCache_("card_db");
    var MAX_FALLBACK_TRIES = 5;
    for (var attempt = 0; attempt < MAX_FALLBACK_TRIES; attempt++) {
      var now = new Date();
      var millis6 = String(now.getTime()).slice(-6);
      var rand4 = String(Math.floor(Math.random() * 9000 + 1000));
      var fallbackId = "TW" + millis6 + rand4.slice(0, 2);

      if (!findRowByField_("card_db", "id", fallbackId)) {
        Logger.log("generateCardId_ lock failed, using fallback: " + fallbackId + " ; detail=" + (lockErr && lockErr.message ? lockErr.message : String(lockErr)));
        return fallbackId;
      }
    }

    throw new Error("generateCardId_ fallback failed: unable to generate unique ID after " + MAX_FALLBACK_TRIES + " attempts");
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var key = "HSC_CARD_SEQ_TW";
    var currentSeq = Number(props.getProperty(key) || 0);
    clearSheetRowCache_("card_db");
    var rows = getSheetRowsByName_("card_db");
    var maxNum = 0;
    var existingIds = {};
    var MAX_TRIES = 100;
    var tries = 0;

    rows.forEach(function(r) {
      var cardId = sanitizeText_(r.id);
      if (cardId) existingIds[cardId] = true;
      var m = /^TW(\d{4,})$/.exec(cardId);
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    });

    if (!isFinite(currentSeq) || currentSeq < maxNum) {
      currentSeq = maxNum;
    }

    var nextSeq = currentSeq;
    var nextId = "";

    do {
      nextSeq += 1;
      nextId = "TW" + String(nextSeq).padStart(4, "0");
      tries += 1;
      if (tries > MAX_TRIES) {
        throw new Error("generateCardId_ exceeded max tries (" + MAX_TRIES + ")");
      }
    } while (existingIds[nextId]);

    props.setProperty(key, String(nextSeq));
    return nextId;

  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (releaseErr) {
        Logger.log("generateCardId_ lock release failed: " + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
      }
    }
  }
}

function generatePaymentId_() {
  return "PM" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + Math.floor(Math.random() * 900 + 100);
}
function makeRenewalId_() {
  var now = new Date();
  var ts = Utilities.formatDate(now, CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss");
  var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return "RN" + ts + rand;
}
function findPendingRenewalPaymentByCardId_(cardId) {
  var id = normalizeCardId_(cardId);
  if (!id) return null;

  var rows = getSheetRowsByName_("payment_db").filter(function(row) {
    var rowCardId = normalizeCardId_(row.card_id || row.cardId || row.id);
    var eventType = sanitizeText_(row.event_type).toLowerCase();
    var orderType = sanitizeText_(row.order_type).toLowerCase();
    var status = sanitizeText_(row.status).toLowerCase();
    var billingStatus = sanitizeText_(row.billing_status).toLowerCase();

    if (rowCardId !== id) return false;
    if (eventType !== "renewal" && orderType !== "renewal") return false;
    if (status && status !== "pending") return false;
    if (billingStatus && billingStatus !== "unpaid" && billingStatus !== "pending") return false;
    return true;
  });

  rows.sort(function(a, b) {
    return toTimestampMs_(b.updated_at || b.created_at || b.due_at) - toTimestampMs_(a.updated_at || a.created_at || a.due_at);
  });

  return rows.length ? rows[0] : null;
}
function generateCommissionId_() {
  return "CM" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + Math.floor(Math.random() * 900 + 100);
}

function generateUpdateId_() {
  return "UP" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + Math.floor(Math.random() * 900 + 100);
}

function generateUpdateToken_() {
  return Utilities.getUuid().replace(/-/g, "");
}

function genAddonOrderId_() {
  return "AO" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);
}

function normalizePaymentMethodForStorage_(method) {
  var s = sanitizeText_(method).toLowerCase();
  if (!s) return "manual";
  return s;
}

function normalizeCommissionStatusForStorage_(status) {
  var s = sanitizeText_(status);
  return COMMISSION_STATUS_ALLOWED.indexOf(s) >= 0 ? s : "pending";
}

function normalizeAddonItemCode_(code) {
  var s = sanitizeText_(code).toLowerCase();
  if (!s) return "";
  var map = {
    "photo": "addon_photo",
    "photo_extra": "addon_photo",
    "addon_photo": "addon_photo",
    "cta": "addon_cta",
    "cta_extra": "addon_cta",
    "addon_cta": "addon_cta",
    "marquee": "addon_marquee",
    "marquee_extra": "addon_marquee",
    "addon_marquee": "addon_marquee",
    "update_unlimited": "addon_update_unlimited",
    "addon_update_unlimited": "addon_update_unlimited",
    "agent_upgrade": "addon_agent_upgrade",
    "partner_upgrade": "addon_agent_upgrade",
    "addon_agent_upgrade": "addon_agent_upgrade"
  };
  return map[s] || (ADDON_ITEM_CODES.indexOf(s) >= 0 ? s : "");
}

function normalizeAddonTypeLabel_(code) {
  var s = normalizeAddonItemCode_(code);
  if (s === "addon_photo") return "photo";
  if (s === "addon_cta") return "cta";
  if (s === "addon_marquee") return "marquee";
  if (s === "addon_update_unlimited") return "update_unlimited";
  if (s === "addon_agent_upgrade") return "agent_upgrade";
  if (s === "addon_combo_pro") return "combo";
  return "";
}

function getAddonItemNameByCode_(code) {
  switch (normalizeAddonItemCode_(code)) {
    case "addon_photo": return "照片一張";
    case "addon_cta": return "CTA 一個";
    case "addon_marquee": return "跑馬燈";
    case "addon_update_unlimited": return "無限更新";
    case "addon_agent_upgrade": return "合作代理權金";
    case "addon_combo_pro": return "組合包";
    default: return sanitizeText_(code);
  }
}

function roundMoney_(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function toDateSafe_(value) {
  if (value === null || value === undefined || value === "") return null;
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return isNaN(value.getTime()) ? null : value;
  }

  var raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{10,13}$/.test(raw)) {
    var ts = Number(raw);
    if (!isFinite(ts)) return null;
    if (raw.length === 10) ts = ts * 1000;
    var fromTs = new Date(ts);
    return isNaN(fromTs.getTime()) ? null : fromTs;
  }

  var d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function ensurePlanExists_(planId, tenant) {
  var plan = findRowByField_("plan_db", "plan_id", sanitizeText_(planId));
  if (!plan) throw new Error("Plan not found: " + planId);
  if (!sameTenant_(plan.tenant, tenant)) throw new Error("Plan tenant mismatch");
  return plan;
}

function findInviteByCode_(inviteCode) {
  return findRowByField_("invite_db", "invite_code", inviteCode);
}

function evaluateInviteValidity_(inviteRow) {
  if (!inviteRow) return { valid: false, reason: "Invite not found" };
  var status = sanitizeText_(inviteRow.status);
  if (status !== "active") return { valid: false, reason: "Invite not active" };
  var expiresAt = toDateSafe_(getInviteExpireAtValue_(inviteRow));
  if (expiresAt && expiresAt.getTime() < Date.now()) return { valid: false, reason: "Invite expired" };
  return { valid: true };
}

function resolveFieldFromReqOrLead_(req, lead, fieldName) {
  return sanitizeText_(req[fieldName]) || sanitizeText_(lead[fieldName]);
}

function resolveStyleForPlan_(plan, style) {
  return sanitizeText_(style);
}

function resolvePaperForPlan_(plan, paper) {
  return sanitizeText_(paper);
}

function getOrderPaymentByCardId_(cardId) {
  var rows = getSheetRowsByName_("payment_db").filter(function(r) {
    return sanitizeText_(r.card_id) === sanitizeText_(cardId) &&
           sanitizeText_(r.status).toLowerCase() === "pending";
  }).sort(function(a, b) {
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
  return rows.length ? rows[0] : null;
}

function createPaymentRecord_(payload) {
  ensurePaymentDbSchema_();
  var payment = emptyRow_("payment_db");
  var p = payload || {};
  var nowIso = p.now_iso || toIso_(new Date());
  var planCode = sanitizeText_(p.plan_code || p.plan || p.plan_key).replace(/^plan_/, "");
  payment.payment_id = sanitizeText_(p.payment_id) || generatePaymentId_();
  payment.card_id = sanitizeText_(p.card_id);
  payment.lead_id = sanitizeText_(p.lead_id);
  payment.created_at = sanitizeText_(p.created_at) || nowIso;
  payment.updated_at = sanitizeText_(p.updated_at) || nowIso;
  payment.event_type = sanitizeText_(p.event_type) || "first_payment";
  payment.order_type = sanitizeText_(p.order_type) || "new";
  payment.plan = planCode;
  payment.amount = String(Number(p.total_amount || p.amount || 0));
  payment.status = sanitizeText_(p.status) || "pending";
  payment.paid_at = sanitizeText_(p.paid_at);
  payment.due_at = sanitizeText_(p.due_at);
  payment.method = sanitizeText_(p.method);
  payment.transaction_id = sanitizeText_(p.transaction_id);
  payment.billing_status_after = (sanitizeText_(payment.status) === "paid") ? (sanitizeText_(p.billing_status_after)
 || "paid") : "";
  payment.note = sanitizeText_(p.note);
  payment.created_by = sanitizeText_(p.created_by) || "system";
  payment.is_test = sanitizeText_(p.is_test) || "FALSE";
  payment.tenant = sanitizeText_(p.tenant) || CONFIG.DEFAULT_TENANT;
  payment.agent_id = sanitizeText_(p.agent_id);
  payment.share_card_id = sanitizeText_(p.share_card_id);
  payment.share_agent_id = sanitizeText_(p.share_agent_id);
  payment.share_source = sanitizeText_(p.share_source);
  payment.share_channel = sanitizeText_(p.share_channel);
  payment.commission_status = sanitizeText_(p.commission_status) || ((payment.event_type === "addon_payment" || payment.event_type === "update_fee") ? "not_applicable" : "pending");
  payment.card_status_before = sanitizeText_(p.card_status_before);
  payment.card_status_after = sanitizeText_(p.card_status_after);
  payment.operated_by = sanitizeText_(p.operated_by) || "system";
  payment.risk_flag = sanitizeText_(p.risk_flag) || "FALSE";
  payment.risk_reason = sanitizeText_(p.risk_reason);
  payment.review_status = sanitizeText_(p.review_status);
  payment.reviewed_at = sanitizeText_(p.reviewed_at);
  payment.refund_at = sanitizeText_(p.refund_at);
  payment.refund_reason = sanitizeText_(p.refund_reason);
  payment.commission_processed_at = sanitizeText_(p.commission_processed_at);
  payment.commission_reversed_at = sanitizeText_(p.commission_reversed_at);
  payment.plan_code = sanitizeText_(p.plan_code) || (planCode ? ("plan_" + planCode) : "");
  payment.plan_name = sanitizeText_(p.plan_name);
  payment.plan_amount = String(Number(p.plan_amount || 0));
  payment.addon_amount = String(Number(p.addon_amount || 0));
  payment.total_amount = String(Number(p.total_amount || p.amount || 0));
  payment.currency = sanitizeText_(p.currency) || "TWD";
  payment.addon_summary = sanitizeText_(p.addon_summary);
  payment.order_summary_json = sanitizeText_(p.order_summary_json);
  payment.billing_status = sanitizeText_(p.billing_status);
  payment.payment_channel = sanitizeText_(p.payment_channel);
  appendRowByName_("payment_db", payment);
  return payment;
}

function calculateOrderAmount_(planCode, addonItems, tenant) {
  var planItem = resolvePlanItem_(planCode, tenant);
  var addonSummary = calculateAddonSummary_(addonItems, tenant);
  return {
    plan_code: planItem.item_code,
    plan_name: planItem.item_name,
    plan_amount: Number(planItem.price || 0),
    addon_amount: Number(addonSummary.addon_amount || 0),
    total_amount: Number(planItem.price || 0) + Number(addonSummary.addon_amount || 0),
    addon_items: addonSummary.addon_items,
    expanded_addon_items: addonSummary.addon_items
  };
}

function applyPlanAndAddonsToCard_(planCode, addonItems, tenant) {
  var normalizedPlan = sanitizeText_(planCode).replace(/^plan_/, "");
  var ent = {
    plan: normalizedPlan,
    photo_limit: normalizedPlan === "premium" ? 5 : 2,
    cta_limit: normalizedPlan === "premium" ? 3 : 1,
    has_marquee: false,
    has_unlimited_update: false,
    update_credit_delta: 0,
    cta_extra_purchased: 0,
    photo_extra_purchased: 0,
    marquee_purchased: false,
    marquee_enabled: false
  };
  var expanded = expandBundleItems_(addonItems, tenant);
  expanded.forEach(function(entry) {
    var qty = Number(entry.qty || 0);
    if (!isFinite(qty) || qty <= 0) return;
    switch (normalizeAddonItemCode_(entry.item_code)) {
      case "addon_photo":
        ent.photo_limit += qty;
        ent.photo_extra_purchased += qty;
        break;
      case "addon_cta":
        ent.cta_limit += qty;
        ent.cta_extra_purchased += qty;
        break;
      case "addon_update_unlimited":
        ent.has_unlimited_update = true;
        break;
      case "addon_marquee":
        ent.has_marquee = true;
        ent.marquee_purchased = true;
        ent.marquee_enabled = true;
        break;
    }
  });
  if (ent.photo_limit > PHOTO_LIMIT_ABSOLUTE_MAX) ent.photo_limit = PHOTO_LIMIT_ABSOLUTE_MAX;
  return ent;
}

function parseCommissionAmountHints_(payment) {
  var hints = { plan_amount: 0, addon_amount: 0 };
  var note = sanitizeText_(payment && payment.note);
  var m1 = note.match(/plan_amount\s*=\s*(\d+(?:\.\d+)?)/i);
  var m2 = note.match(/addon_amount\s*=\s*(\d+(?:\.\d+)?)/i);
  if (m1) hints.plan_amount = roundMoney_(toNumber_(m1[1]));
  if (m2) hints.addon_amount = roundMoney_(toNumber_(m2[1]));
  return hints;
}

function parseAddonItemsFromNote_(note) {
  var items = [];
  var text = sanitizeText_(note);
  if (!text) return items;

  var regex = /addon=([^;]+)/ig;
  var match;
  while ((match = regex.exec(text))) {
    var raw = sanitizeText_(match[1]);
    if (!raw) continue;
    var parts = raw.split(":");
    var code = sanitizeText_(parts[0]).toLowerCase();
    var qty = parts.length > 1 ? toNumber_(parts[1]) : 0;
    var amount = parts.length > 2 ? roundMoney_(toNumber_(parts[2])) : 0;
    if (!code || amount <= 0) continue;
    items.push({
      item_key: code,
      eventType: "addon_payment",
      targetType: "addon_order",
      orderType: "addon",
      plan: "both",
      qty: qty,
      amount: amount,
      note_suffix: code
    });
  }
  return items;
}

function splitPaymentCommissionItems_(payment) {
  var totalAmount = roundMoney_(toNumber_(payment && payment.amount));
  var eventType = sanitizeText_(payment && payment.event_type).toLowerCase();
  var plan = sanitizeText_(payment && payment.plan).toLowerCase();
  var hints = parseCommissionAmountHints_(payment);
  var items = [];

  if (eventType === "first_payment") {
    var planAmount = hints.plan_amount;
    var addonAmount = hints.addon_amount;
    var addonItems = parseAddonItemsFromNote_(payment && payment.note);
    var addonItemsTotal = addonItems.reduce(function(sum, item) {
      return sum + roundMoney_(toNumber_(item.amount));
    }, 0);

    if (planAmount <= 0 && totalAmount > 0) {
      var knownAddonAmount = addonItemsTotal > 0 ? addonItemsTotal : addonAmount;
      planAmount = totalAmount - knownAddonAmount;
      if (planAmount < 0) planAmount = totalAmount;
    }
    if (planAmount > 0) {
      items.push({ item_key: "plan", eventType: "first_payment", targetType: "card_plan", orderType: sanitizeText_(payment && payment.order_type).toLowerCase(), plan: plan, amount: planAmount, note_suffix: "plan" });
    }

    if (addonItems.length) {
      items = items.concat(addonItems);
    } else if (addonAmount > 0) {
      items.push({ item_key: "addon", eventType: "addon_payment", targetType: "addon_order", orderType: "addon", plan: "both", amount: addonAmount, note_suffix: "addon" });
    }

    if (!items.length && totalAmount > 0) {
      items.push({ item_key: "plan", eventType: "first_payment", targetType: "card_plan", orderType: sanitizeText_(payment && payment.order_type).toLowerCase(), plan: plan, amount: totalAmount, note_suffix: "plan" });
    }
    return items;
  }

  if (eventType === "renewal") {
    return [{ item_key: "renewal", eventType: "renewal", targetType: "renewal_order", orderType: sanitizeText_(payment && payment.order_type).toLowerCase(), plan: plan || "both", amount: totalAmount, note_suffix: "renewal" }];
  }
  if (eventType === "update_fee") {
    return [{ item_key: "update", eventType: "update_fee", targetType: "single_update", orderType: sanitizeText_(payment && payment.order_type).toLowerCase(), plan: plan || "both", amount: totalAmount, note_suffix: "update" }];
  }
  if (eventType === "addon_payment") {
    var parsedAddonItems = parseAddonItemsFromNote_(payment && payment.note);
    if (parsedAddonItems.length) return parsedAddonItems;
    return [{ item_key: "addon", eventType: "addon_payment", targetType: "addon_order", orderType: "addon", plan: "both", amount: totalAmount, note_suffix: "addon" }];
  }
  if (totalAmount > 0) {
    return [{ item_key: "default", eventType: eventType, targetType: "card_plan", orderType: sanitizeText_(payment && payment.order_type).toLowerCase(), plan: plan || "both", amount: totalAmount, note_suffix: "default" }];
  }
  return items;
}

function getApplicableCommissionRules_(payment, item) {
  var context = resolveCommissionContext_(payment, item);
  if (!context.autoEligible) return [];

  return getSheetRowsByName_("commission_rules")
    .filter(function(rule) {
      if (sanitizeText_(rule.status).toLowerCase() !== "active") return false;
      if (!sameTenant_(rule.tenant, payment.tenant)) return false;
      if (!isCommissionRuleDateActive_(rule, context.ruleAt || context.now)) return false;
      if (!commissionRuleMatchesEvent_(rule, context)) return false;
      if (!commissionRuleMatchesPlan_(rule, payment, item)) return false;
      if (!commissionRuleMatchesShareSource_(rule, payment)) return false;
      if (!commissionRuleMatchesShareChannel_(rule, payment)) return false;
      if (!commissionRuleMatchesAgent_(rule, payment, item)) return false;
      if (!commissionRuleHasEffectiveReward_(rule)) return false;
      return true;
    })
    .sort(sortCommissionRules_);
}

function selectBestCommissionRule_(payment, item) {
  var rules = getApplicableCommissionRules_(payment, item);
  return rules.length ? rules[0] : null;
}

function sortCommissionRules_(a, b) {
  var pa = toNumber_(a.priority);
  var pb = toNumber_(b.priority);
  if (pb !== pa) return pb - pa;
  return sanitizeText_(a.rule_id).localeCompare(sanitizeText_(b.rule_id));
}

function resolveCommissionContext_(payment, item) {
  var eventType = sanitizeText_(item && item.eventType || payment.event_type).toLowerCase();
  var orderType = sanitizeText_(item && item.orderType || payment.order_type).toLowerCase();
  var targetType = sanitizeText_(item && item.targetType).toLowerCase();
  var autoEligible = true;
  var ruleAt = toDateSafe_(sanitizeText_(payment.paid_at)) ||
               toDateSafe_(sanitizeText_(payment.created_at)) ||
               new Date();

  if (!targetType) {
    if (eventType
 === "first_payment") {
      targetType = "card_plan";
    } else if (eventType === "renewal" || orderType === "renewal") {
      targetType = "renewal_order";
    } else if (eventType === "update_fee" || orderType === "update") {
      targetType = "single_update";
    } else if (eventType === "addon_payment" || orderType === "addon") {
      targetType = sanitizeText_(payment.target_type) || "addon_order";
    } else {
      autoEligible = false;
    }
  }

  return {
    now: new Date(),
    ruleAt: ruleAt,
    eventType: eventType,
    orderType: orderType,
    targetType: targetType,
    autoEligible: autoEligible
  };
}

function isCommissionRuleDateActive_(rule, now) {
  var startAt = toDateSafe_(sanitizeText_(rule.start_at));
  var endAt = toDateSafe_(sanitizeText_(rule.end_at));
  if (startAt && startAt.getTime() > now.getTime()) return false;
  if (endAt && endAt.getTime() < now.getTime()) return false;
  return true;
}

function commissionRuleMatchesEvent_(rule, context) {
  var ruleType = sanitizeText_(rule.rule_type).toLowerCase();
  var targetType = sanitizeText_(rule.target_type).toLowerCase();
  if (!ruleType) return false;
  if (ruleType !== context.eventType) return false;
  if (targetType && targetType !== "both" && targetType !== context.targetType) return false;

  var firstOnly = sanitizeText_(rule.is_first_payment_only).toUpperCase() === "TRUE";
  var renewalAllowed = sanitizeText_(rule.is_renewal_allowed).toUpperCase() === "TRUE";
  if (firstOnly && context.eventType !== "first_payment") return false;
  if (!renewalAllowed && context.eventType === "renewal") return false;
  if (ruleType === "manual_reward") return false;
  return true;
}

function commissionRuleMatchesPlan_(rule, payment, item) {
  var planRule = sanitizeText_(rule.plan).toLowerCase();
  var plan = sanitizeText_(item && item.plan || payment.plan).toLowerCase();
  return !planRule || planRule === "both" || planRule === plan;
}

function commissionRuleMatchesShareSource_(rule, payment) {
  var expected = sanitizeText_(rule.share_source).toLowerCase();
  var actual = sanitizeText_(payment.share_source).toLowerCase();
  return !expected || expected === "all" || expected === actual;
}

function commissionRuleMatchesShareChannel_(rule, payment) {
  var expected = sanitizeText_(rule.share_channel).toLowerCase();
  var actual = sanitizeText_(payment.share_channel).toLowerCase();
  return !expected || expected === "all" || expected === actual;
}

function commissionRuleMatchesAgent_(rule, payment, item) {
  var beneficiaryAgentId = resolveCommissionBeneficiaryAgentId_(rule, payment);
  if (!beneficiaryAgentId) return false;

  if (isSelfConsumptionCommission_(payment, beneficiaryAgentId)) return false;

  var ruleAgentType = sanitizeText_(rule.agent_type).toLowerCase();
  if (!ruleAgentType || ruleAgentType === "all" || ruleAgentType === "both") return true;

  var actualType = resolveCommissionBeneficiaryAgentType_(rule, payment, beneficiaryAgentId, item);
  return actualType === ruleAgentType;
}

function resolveCommissionBeneficiaryAgentType_(rule, payment, beneficiaryAgentId) {
  var sourceType = sanitizeText_(rule && rule.source_type).toLowerCase();
  var shareAgentId = sanitizeText_(payment && payment.share_agent_id);
  if (sourceType === "share" && !shareAgentId) {
    return "customer";
  }

  var agent = beneficiaryAgentId ? findRowByField_("agent_db", "agent_id", beneficiaryAgentId) : null;
  var actualType = sanitizeText_(agent && (agent.agent_type || agent.member_tier)).toLowerCase();

  if (!actualType) {
    var card = findRowByField_("card_db", "id", sanitizeText_(payment && payment.card_id));
    actualType = sanitizeText_(card && (card.owner_agent_type || card.agent_type || card.member_tier)).toLowerCase();
  }

  if (!actualType) {
    actualType = sanitizeText_(payment && (payment.member_tier || payment.agent_type)).toLowerCase();
  }

  if (!actualType && sourceType === "share" && shareAgentId) {
    actualType = "referral";
  }

  if (actualType === "upgrade_ready") actualType = "referral";
  var norm = normalizeAgentTypeForSheet_(actualType);
  if (norm === "customer") return "customer";
  if (norm === "referral") return "referral";
  if (norm === "partner") return "partner";
  return sourceType === "share" && shareAgentId ? "referral" : "customer";
}

function isSelfConsumptionCommission_(payment, beneficiaryAgentId) {
  return checkIsSelfConsumption_(payment, beneficiaryAgentId);
}

function commissionRuleHasEffectiveReward_(rule) {
  var commissionMode = sanitizeText_(rule.commission_mode).toLowerCase();
  var commissionValue = toNumber_(rule.commission_value);
  var bonusMode = sanitizeText_(rule.bonus_mode).toLowerCase();
  var bonusValue = toNumber_(rule.bonus_value);

  var hasCash = (commissionMode === "percent" && commissionValue > 0) || (commissionMode === "fixed" && commissionValue > 0);
  var hasPoints = (bonusMode === "points" && bonusValue > 0) || (bonusMode === "percent_points" && bonusValue > 0);
  return hasCash || hasPoints;
}

function resolveCommissionBeneficiaryAgentId_(rule, payment) {
  var sourceType = sanitizeText_(rule.source_type).toLowerCase();
  if (sourceType === "service") {
    return sanitizeText_(payment.agent_id);
  }
  return sanitizeText_(payment.share_agent_id) || sanitizeText_(payment.agent_id);
}

function buildCommissionFromRule_(payment, rule, now, item) {
  var beneficiaryAgentId = resolveCommissionBeneficiaryAgentId_(rule, payment);
  if (!beneficiaryAgentId) return null;

  if (isSelfConsumptionCommission_(payment, beneficiaryAgentId)) return null;

  var beneficiaryAgentType = resolveCommissionBeneficiaryAgentType_(rule, payment, beneficiaryAgentId);

  var baseAmount = roundMoney_(toNumber_(item && item.amount || payment.amount));
  var commissionMode = sanitizeText_(rule.commission_mode).toLowerCase();
  var commissionValue = toNumber_(rule.commission_value);
  var bonusMode = sanitizeText_(rule.bonus_mode).toLowerCase();
  var bonusValue = toNumber_(rule.bonus_value);

  var rewardAmount = 0;
  var rewardPoints = 0;
  var rewardRate = "";

  if (commissionMode === "percent" && commissionValue > 0) {
    rewardRate = String(commissionValue);
    rewardAmount = roundMoney_(baseAmount * commissionValue / 100);
  } else if (commissionMode === "fixed" && commissionValue > 0) {
    rewardRate = String(commissionValue);
    rewardAmount = roundMoney_(commissionValue);
  }

  if (bonusMode === "points" && bonusValue > 0) {
    rewardPoints = roundMoney_(bonusValue);
  } else if (bonusMode === "percent_points" && bonusValue > 0) {
    rewardPoints = roundMoney_(baseAmount * bonusValue / 100);
  }

  if (beneficiaryAgentType === "referral" && rewardAmount > 0) {
    rewardPoints += rewardAmount;
    rewardAmount = 0;
  }

  if (beneficiaryAgentType === "partner" && rewardPoints > 0 && rewardAmount <= 0) {
    return null;
  }

  if (rewardAmount <= 0 && rewardPoints <= 0) return null;

  var commission = emptyRow_("commission_db");
  commission.commission_id = generateCommissionId_();
  commission.payment_id = sanitizeText_(payment.payment_id);
  commission.card_id = sanitizeText_(payment.card_id);
  commission.lead_id = sanitizeText_(payment.lead_id);
  commission.created_at = toIso_(now);
  commission.updated_at = toIso_(now);
  commission.beneficiary_agent_id = beneficiaryAgentId;
  commission.source_agent_id = sanitizeText_(payment.agent_id) || sanitizeText_(payment.share_agent_id);
  commission.source_card_id = sanitizeText_(payment.card_id);
  commission.reward_type = rewardAmount > 0 && rewardPoints > 0 ? "mixed" : (rewardPoints > 0 ? "points" : "cash");
  commission.item = sanitizeText_(rule.rule_name) || sanitizeText_(rule.rule_id) || "default";
  if (item && item.item_key) commission.item += "|" + sanitizeText_(item.item_key);
  commission.base_amount = String(baseAmount);
  commission.reward_rate = rewardRate;
  commission.reward_amount = String(rewardAmount);
  commission.reward_points = String(rewardPoints);
  commission.status = "pending";
  commission.rule_id = sanitizeText_(rule.rule_id);
  commission.calculated_at = sanitizeText_(payment.paid_at) || toIso_(now);
  commission.paid_at = "";
  commission.frozen_at = "";
  commission.unfrozen_at = "";
  commission.freeze_reason = "";
  commission.commission_batch_id = "";
  commission.is_reversal = "FALSE";
  commission.reversal_of = "";
  commission.reversal_at = "";
  commission.note = sanitizeText_(rule.note);
  if (item && item.note_suffix) commission.note = (commission.note ? commission.note + " | " : "") + "item=" + sanitizeText_(item.note_suffix);
  commission.tenant = sanitizeText_(payment.tenant) || CONFIG.DEFAULT_TENANT;
  return commission;
}
function applyCommissionEffectToAgent_(commission, now) {
  var agentId = sanitizeText_(commission.beneficiary_agent_id);
  ensureAgentExists_(agentId, { source: "commission_effect", commission_id: commission.commission_id, tenant: commission.tenant });
  
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) return;

  var rewardAmount = roundMoney_(toNumber_(commission.reward_amount));
  var rewardPoints = roundMoney_(toNumber_(commission.reward_points));
  var isReversal = sanitizeText_(commission.is_reversal).toUpperCase() === "TRUE";
  var refId = sanitizeText_(commission.payment_id) || sanitizeText_(commission.commission_id);
  var tenant = sanitizeText_(commission.tenant) || CONFIG.DEFAULT_TENANT;

  if (rewardPoints !== 0) {
    changeAgentPointsBalanceInternal_({
      agent_id: agentId,
      points: rewardPoints,
      bucket: rewardPoints < 0 ? "redeem" : "balance",
      type: isReversal ? "reverse_points" : "earn",
      ref_id: refId,
      note: sanitizeText_(commission.item) || "commission_points",
      operator: "system"
    });
    agent = findRowByField_("agent_db", "agent_id", agentId) || agent;
    autoPromoteAgentTierByPoints_(agentId,
 now);
    agent = findRowByField_("agent_db", "agent_id", agentId) || agent;
  }

  if (rewardAmount !== 0) {
    var updated = shallowClone_(agent);
    var beforeTotal = roundMoney_(toNumber_(updated.total_commission));
    var afterTotal = roundMoney_(beforeTotal + rewardAmount);
    if (afterTotal < 0) afterTotal = 0;
    updated.total_commission = String(afterTotal);
    updated.last_commission_at = toIso_(now);
    updated.updated_at = toIso_(now);
    updateRowByName_("agent_db", agent.__rowNum, updated);

    appendAgentCommissionLog_({
      agent_id: agentId,
      type: isReversal ? "reverse_cash" : "earn_cash",
      amount: rewardAmount,
      before_total: beforeTotal,
      after_total: afterTotal,
      ref_id: refId,
      note: sanitizeText_(commission.item) || "commission_cash",
      created_at: toIso_(now),
      tenant: tenant,
      operator: "system",
      bucket: "total",
      before_frozen: roundMoney_(toNumber_(agent.commission_frozen)),
      after_frozen: roundMoney_(toNumber_(updated.commission_frozen)),
      before_paid: roundMoney_(toNumber_(agent.commission_paid_total)),
      after_paid: roundMoney_(toNumber_(updated.commission_paid_total))
    });
  }
}

function hasValidApprovedServiceLog_(payment, agentId) {
  return getSheetRowsByName_("service_log").some(function(r) {
    return sanitizeText_(r.agent_id) === sanitizeText_(agentId) &&
           sanitizeText_(r.card_id) === sanitizeText_(payment.card_id) &&
           sanitizeText_(r.status) === "approved";
  });
}

function getRenewalServiceAgentId_(payment) {
  var card = findRowByField_("card_db", "id", sanitizeText_(payment && payment.card_id));
  if (!card) return "";
  return sanitizeText_(card.service_agent);
}

function getRenewalReferrerAgentId_(payment) {
  var card = findRowByField_("card_db", "id", sanitizeText_(payment && payment.card_id));
  if (!card) return "";
  return sanitizeText_(card.referrer);
}

function findExistingLeadByFormTs_(formTs, phone, inviteCode, tenant) {
  var targetFormTs = sanitizeText_(formTs);
  var targetPhone = sanitizePhoneAsText_(phone);
  var targetInviteCode = sanitizeText_(inviteCode);
  var targetTenant = sanitizeText_(tenant) || CONFIG.DEFAULT_TENANT;

  if (!targetFormTs || !targetPhone) return null;

  var rows = getSheetRowsByName_("lead_db");
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || {};
    if (!sameTenant_(row.tenant, targetTenant)) continue;
    if (sanitizeText_(row.form_ts) !== targetFormTs) continue;
    if (sanitizePhoneAsText_(row.phone) !== targetPhone) continue;
    if (targetInviteCode && sanitizeText_(row.invite_code) !== targetInviteCode) continue;
    return row;
  }

  return null;
}

function createLead_(req) {
  req = req || {};

  var inviteCode = sanitizeText_(req.invite_code || req.inviteCode);
  if (!inviteCode) throw new Error("Missing invite_code");

  var invite = findInviteByCode_(inviteCode);
  if (!invite) throw new Error("Invite not found");

  var validity = evaluateInviteValidity_(invite);
  if (!validity.valid) throw new Error(validity.reason);

  var row = emptyRow_("lead_db");
  row.lead_id = generateLeadId_();
  row.tenant = sanitizeText_(invite.tenant) || CONFIG.DEFAULT_TENANT;
  row.invite_code = inviteCode;
  row.referrer = sanitizeText_(req.referrer) || sanitizeText_(invite.referrer);
  row.service_agent = sanitizeText_(req.service_agent) || sanitizeText_(invite.service_agent);
  row.agent_type = normalizeAgentType_(req.agent_type || invite.agent_type || "customer");
  row.agent_id = sanitizeText_(req.agent_id || req.agentId) || row.service_agent || row.referrer || "";
  row.created_at = toIso_(new Date());
  row.updated_at = row.created_at;
  row.name = sanitizeText_(req.name);
  row.phone = sanitizePhoneAsText_(req.phone);
  row.email = sanitizeText_(req.email);
  row.plan = sanitizeText_(req.plan) || sanitizeText_(invite.plan);
  if (!row.plan) throw new Error("Missing plan");
  row.source = sanitizeText_(req.source || "form");
  row.status = "new";
  row.form_ts = sanitizeText_(req.form_ts || req.formTs) || row.created_at;

  var existingLead = findExistingLeadByFormTs_(row.form_ts, row.phone, inviteCode, row.tenant);
  if (existingLead) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "createLead",
      lead_id: sanitizeText_(existingLead.lead_id),
      lead: existingLead,
      reused: true
    };
  }
  row.services = sanitizeText_(req.services);
  row.experience = sanitizeText_(req.experience);
  row.is_test = sanitizeText_(req.is_test || "FALSE");
  
  if (row.referrer) ensureAgentExists_(row.referrer, { lead: row, source: "lead_referrer", tenant: row.tenant });
  if (row.service_agent) ensureAgentExists_(row.service_agent, { lead: row, source: "lead_service_agent", tenant: row.tenant });
  if (row.agent_id) ensureAgentExists_(row.agent_id, { lead: row, source: "lead_agent_id", tenant: row.tenant });
  
  appendRowByName_("lead_db", row);
  return { ok: true, version: HSC_VERSION, action: "createLead", lead_id: row.lead_id, lead: row };
}

function getAgentByCardForRenewalSync_(card) {
  if (!card) return null;

  var ownerAgentId = sanitizeText_(card.owner_agent_id);
  var agentId = sanitizeText_(card.agent_id);
  var targetAgentId = ownerAgentId || agentId;

  if (!targetAgentId) return null;

  return findRowByField_("agent_db", "agent_id", targetAgentId);
}

function deriveMemberTierByAgentRow_(agent) {
  var agentType = sanitizeText_(agent.agent_type).toLowerCase();
  var partnerStatus = sanitizeText_(agent.partner_status).toLowerCase();
  var eligible = sanitizeText_(agent.eligible_for_upgrade).toUpperCase() === "TRUE";
  var selfRenewalOk = sanitizeText_(agent.self_renewal_ok).toUpperCase() === "TRUE";

  if (agentType === "partner" || partnerStatus === "active") {
    return "gold";
  }

  if (eligible && selfRenewalOk) {
    return "silver";
  }

  return "bronze";
}

function syncAgentUpgradeFields_(agent, now) {
  var updated = shallowClone_(agent);
  var when = now instanceof Date ? now : new Date();

  var pointsBalance = toNumber_(updated.points_balance, 0);
  var selfRenewalOk = sanitizeText_(updated.self_renewal_ok).toUpperCase() === "TRUE";
  var alreadyPartner = sanitizeText_(updated.partner_status).toLowerCase() === "active" ||
                       sanitizeText_(updated.agent_type).toLowerCase() === "partner";

  var eligible = pointsBalance >= AGENT_UPGRADE_TARGET_POINTS && selfRenewalOk;

  updated.tier_upgrade_eligible = eligible ? "TRUE" : "FALSE";
  updated.eligible_for_upgrade = eligible ? "TRUE" : "FALSE";

  if (eligible) {
    if (!sanitizeText_(updated.upgrade_eligible_at)) {
      updated.upgrade_eligible_at = toIso_(when);
    }
  } else {
    updated.upgrade_eligible_at = "";
  }

  if (alreadyPartner) {
    updated.partner_status = "active";
    if (!sanitizeText_(updated.partner_qualified_at)) {
      updated.partner_qualified_at = toIso_(when);
    }
  }

  updated.member_tier = mapAgentTypeToTier_(updated.agent_type);
  updated.updated_at = toIso_(when);

  return updated;
}

function syncAgentSelfRenewalByCard_(cardId, isPaid, now, note) {
  var id = normalizeCardId_(cardId);
  if (!id) return [];

  var card = findRowByField_("card_db", "id", id);
  if (!card) return [];

  var agent = getAgentByCardForRenewalSync_(card);
  if (!agent) return [];

  var when = now instanceof Date ? now : new Date();
  var updatedAgent = shallowClone_(agent);

  var paidFlag = !!isPaid;
  updatedAgent.self_renewal_required = "TRUE";
  updatedAgent.self_renewal_ok = paidFlag ? "TRUE" : "FALSE";

  var extraNote = sanitizeText_(note);
  var syncNote = paidFlag ? "self_renewal_synced_paid" : "self_renewal_synced_unpaid";
  if (extraNote) syncNote += ":" + extraNote;
  updatedAgent.note = mergeNote_(updatedAgent.note, syncNote);

  updatedAgent.agent_type = normalizeAgentTypeForSheet_(updatedAgent.agent_type);
  updatedAgent.member_tier = mapAgentTypeToTier_(updatedAgent.agent_type);

  updatedAgent = syncAgentUpgradeFields_(updatedAgent, when);

  updateRowByName_("agent_db", agent.__rowNum, updatedAgent);

  return [updatedAgent];
}

function adminNormalizeAgentMemberTier_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var dryRun = String(req.dry_run || "").toLowerCase() === "true";
  var repaired = [];
  var agents = getSheetRowsByName_("agent_db");
  var changed = 0;

  agents.forEach(function(agent) {
    var currentTier = sanitizeText_(agent.member_tier).toLowerCase();
    var expectedTier = mapAgentTypeToTier_(agent.agent_type);
    if (currentTier === expectedTier) return;

    changed++;
    if (!dryRun) {
      var updated = shallowClone_(agent);
      updated.member_tier = expectedTier;
      updated.updated_at = nowIso_();
      updateRowByName_("agent_db", agent.__rowNum, updated);
      repaired.push({
        agent_id: sanitizeText_(agent.agent_id),
        old_tier: currentTier,
        new_tier: expectedTier
      });
    } else {
      repaired.push({
        agent_id: sanitizeText_(agent.agent_id),
        old_tier: currentTier,
        new_tier: expectedTier
      });
    }
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminNormalizeAgentMemberTier",
    dry_run: dryRun,
    repaired_count: changed,
    repaired_agents: repaired.slice(0, 100)
  };
}
function adminNormalizeAgentTypeAndTier_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var dryRun = String(req.dry_run || "").toLowerCase() === "true";
  var repairedAgents = [];
  var agents = getSheetRowsByName_("agent_db");
  var changed = 0;

  agents.forEach(function(agent) {
    var originalAgentType = sanitizeText_(agent.agent_type);
    var normalizedAgentType = normalizeAgentTypeForSheet_(originalAgentType);
    var currentTier = sanitizeText_(agent.member_tier).toLowerCase();
    var expectedTier = mapAgentTypeToTier_(normalizedAgentType);

    var agentChanged = false;
    var updates = {};

    if (originalAgentType !== normalizedAgentType) {
      agentChanged = true;
      updates.agent_type = normalizedAgentType;
    }
    if (currentTier !== expectedTier) {
      agentChanged = true;
      updates.member_tier = expectedTier;
    }

    if (!agentChanged) return;

    changed++;
    if (!dryRun) {
      var updated = shallowClone_(agent);
      updated.agent_type = updates.agent_type !== undefined ? updates.agent_type : updated.agent_type;
      updated.member_tier = updates.member_tier !== undefined ? updates.member_tier : updated.member_tier;
      updated.updated_at = nowIso_();
      updateRowByName_("agent_db", agent.__rowNum, updated);
      repairedAgents.push({
        agent_id: sanitizeText_(agent.agent_id),
        old_agent_type: originalAgentType,
        new_agent_type: updated.agent_type,
        old_tier: currentTier,
        new_tier: updated.member_tier
      });
    } else {
      repairedAgents.push({
        agent_id: sanitizeText_(agent.agent_id),
        old_agent_type: originalAgentType,
        new_agent_type: normalizedAgentType,
        old_tier: currentTier,
        new_tier: expectedTier
      });
    }
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminNormalizeAgentTypeAndTier",
    dry_run: dryRun,
    repaired_count: changed,
    repaired_agents: repairedAgents.slice(0, 100)
  };
}
function adminRepairAgentPointsLog_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var dryRun = String(req.dry_run || "").toLowerCase() === "true";
  var targetAgentId = sanitizeText_(req.agent_id || req.agentId);
  var results = [];

  var agentsToProcess = [];
  if (targetAgentId) {
    var agent = findRowByField_("agent_db", "agent_id", targetAgentId);
    if (!agent) throw new Error("Agent not found: " + targetAgentId);
    agentsToProcess = [agent];
  } else {
    var allLogs = getSheetRowsByName_("agent_points_log");
    var agentIdSet = {};
    allLogs.forEach(function(log) {
      var aid = sanitizeText_(log.agent_id);
      if (aid) agentIdSet[aid] = true;
    });
    agentsToProcess = getSheetRowsByName_("agent_db").filter(function(agent) {
      var aid = sanitizeText_(agent.agent_id);
      return aid && agentIdSet[aid];
    });
  }

  var summary = {
    agents_processed: 0,
    agents_updated: 0,
    logs_repaired: 0,
    errors: []
  };

  for (var idx = 0; idx < agentsToProcess.length; idx++) {
    var agent = agentsToProcess[idx];
    var agentId = sanitizeText_(agent.agent_id);
    if (!agentId) continue;
    summary.agents_processed++;

    try {
      var logs = getSheetRowsByName_("agent_points_log")
        .filter(function(log) {
          return sanitizeText_(log.agent_id) === agentId;
        })
        .sort(function(a, b) {
          return (a.created_at || "").localeCompare(b.created_at || "");
        });

      if (!logs.length) {
        continue;
      }

      var runningBalance = 0;
      var runningLifetime = 0;
      var lastLogCreatedAt = "";
      var anyChange = false;

      for (var i = 0; i < logs.length; i++) {
        var log = logs[i];
        var points = roundMoney_(toNumber_(log.points));
        var beforeBalance = runningBalance;
        var afterBalance = roundMoney_(runningBalance + points);
        var currentBefore = roundMoney_(toNumber_(log.before_balance));
        var currentAfter = roundMoney_(toNumber_(log.after_balance));

        if (currentBefore !== beforeBalance || currentAfter !== afterBalance) {
          anyChange = true;
          if (!dryRun) {
            var updatedLog = shallowClone_(log);
            updatedLog.before_balance = String(beforeBalance);
            updatedLog.after_balance = String(afterBalance);
            if (!updatedLog.created_at && log.created_at) updatedLog.created_at = log.created_at;
            updateRowByName_("agent_points_log", log.__rowNum, updatedLog);
            summary.logs_repaired++;
          }
        }

        runningBalance = afterBalance;
        if (points > 0) {
          runningLifetime = roundMoney_(runningLifetime + points);
        }
        if (log.created_at && log.created_at > lastLogCreatedAt) {
          lastLogCreatedAt = log.created_at;
        }
      }

      var finalBalance = runningBalance;
      var finalLifetime = runningLifetime;
      var lastPointsAt = lastLogCreatedAt || "";

      var agentCurrentBalance = roundMoney_(toNumber_(agent.points_balance));
      var agentCurrentLifetime = roundMoney_(toNumber_(agent.points_lifetime));
      var agentCurrentLastPointsAt = sanitizeText_(agent.last_points_at);

      if (finalBalance !== agentCurrentBalance ||
          finalLifetime !== agentCurrentLifetime ||
          lastPointsAt !== agentCurrentLastPointsAt) {
        anyChange = true;
        if (!dryRun) {
          var updatedAgent = shallowClone_(agent);
          updatedAgent.points_balance = String(finalBalance);
          updatedAgent.points_lifetime = String(finalLifetime);
          updatedAgent.last_points_at = lastPointsAt;
          syncAgentTierStatusFields_(updatedAgent, new Date());
          updatedAgent.updated_at = nowIso_();
          updateRowByName_("agent_db", agent.__rowNum, updatedAgent);
          summary.agents_updated++;
        }
      }

      results.push({
        agent_id: agentId,
        logs_count: logs.length,
        balance_before: agentCurrentBalance,
        balance_after: finalBalance,
        lifetime_before: agentCurrentLifetime,
        lifetime_after: finalLifetime,
        last_points_at_before: agentCurrentLastPointsAt,
        last_points_at_after: lastPointsAt,
        repaired: anyChange,
        dry_run: dryRun
      });

    } catch (err) {
      summary.errors.push({
        agent_id: agentId,
        error: err.message
      });
    }
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminRepairAgentPointsLog",
    dry_run: dryRun,
    target_agent: targetAgentId || "all",
  
  summary: summary,
    details: results.slice(0, 200)
  };
}

function adminRepairAgentTypeEnum_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var dryRun = String(req.dry_run || "").toLowerCase() === "true";
  var targetSheet = sanitizeText_(req.sheet);
  var results = [];

  var sheetsToProcess = targetSheet ? [targetSheet] : ["agent_db", "card_db", "lead_db", "payment_db", "renewal_db"];
  var processedCount = 0;
  var updatedCount = 0;

  sheetsToProcess.forEach(function(sheetName) {
    if (!SCHEMA[sheetName]) return;
    var rows = getSheetRowsByName_(sheetName);
    var changedRows = [];

    rows.forEach(function(row) {
      var originalAgentType = sanitizeText_(row.agent_type);
      var originalMemberTier = sanitizeText_(row.member_tier);
      var normalizedAgentType = normalizeAgentTypeForSheet_(originalAgentType);
      var expectedMemberTier = mapAgentTypeToTier_(normalizedAgentType);
      var rowChanged = false;

      if (originalAgentType !== normalizedAgentType) {
        rowChanged = true;
        if (!dryRun) row.agent_type = normalizedAgentType;
      }
      if (originalMemberTier !== expectedMemberTier) {
        rowChanged = true;
        if (!dryRun) row.member_tier = expectedMemberTier;
      }

      if (rowChanged) {
        changedRows.push({
          row_num: row.__rowNum,
          agent_type_before: originalAgentType,
          agent_type_after: normalizedAgentType,
          member_tier_before: originalMemberTier,
          member_tier_after: expectedMemberTier
        });
        if (!dryRun) {
          updateRowByName_(sheetName, row.__rowNum, row);
        }
      }
    });

    processedCount += rows.length;
    updatedCount += changedRows.length;
    results.push({
      sheet: sheetName,
      total_rows: rows.length,
      changed_count: changedRows.length,
      details: changedRows.slice(0, 50)
    });
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminRepairAgentTypeEnum",
    dry_run: dryRun,
    target_sheet: targetSheet || "all",
    processed_total: processedCount,
    updated_total: updatedCount,
    results: results
  };
}

function adminRepairDataValidation_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var dryRun = String(req.dry_run || "").toLowerCase() === "true";
  var targetSheet = sanitizeText_(req.sheet);
  var targetColumn = sanitizeText_(req.column);
  var results = [];

  var sheetsToProcess = targetSheet ? [targetSheet] : ["agent_db", "card_db", "lead_db", "payment_db", "renewal_db"];

  sheetsToProcess.forEach(function(sheetName) {
    if (!SCHEMA[sheetName]) return;
    var sheet = getSheetByName_(sheetName);
    var headers = getHeaders_(sheetName);
    var colIndex = -1;
    if (targetColumn && targetColumn === "agent_type") {
      colIndex = headers.indexOf("agent_type");
    } else if (targetColumn && targetColumn === "member_tier") {
      colIndex = headers.indexOf("member_tier");
    } else {
      var agentTypeIdx = headers.indexOf("agent_type");
      var memberTierIdx = headers.indexOf("member_tier");
      if (agentTypeIdx !== -1) {
        var agentTypeResult = fixColumnDataValidation_(sheet, agentTypeIdx + 1, ["customer", "referral", "partner"], dryRun);
        var agentTypeEntry = { sheet: sheetName, column: "agent_type" };
        agentTypeEntry.status = agentTypeResult.status;
        agentTypeEntry.allowed_values = agentTypeResult.allowed_values;
        if (agentTypeResult.error !== undefined) agentTypeEntry.error = agentTypeResult.error;
        if (agentTypeResult.applied !== undefined) agentTypeEntry.applied = agentTypeResult.applied;
        if (agentTypeResult.dry_run !== undefined) agentTypeEntry.dry_run = agentTypeResult.dry_run;
        results.push(agentTypeEntry);
      }
      if (memberTierIdx !== -1) {
        var memberTierResult =
 fixColumnDataValidation_(sheet, memberTierIdx + 1, ["bronze", "silver", "gold"], dryRun);
        var memberTierEntry = { sheet: sheetName, column: "member_tier" };
        memberTierEntry.status = memberTierResult.status;
        memberTierEntry.allowed_values = memberTierResult.allowed_values;
        if (memberTierResult.error !== undefined) memberTierEntry.error = memberTierResult.error;
        if (memberTierResult.applied !== undefined) memberTierEntry.applied = memberTierResult.applied;
        if (memberTierResult.dry_run !== undefined) memberTierEntry.dry_run = memberTierResult.dry_run;
        results.push(memberTierEntry);
      }
      return;
    }

    if (colIndex === -1) {
      results.push({ sheet: sheetName, column: targetColumn, error: "Column not found" });
      return;
    }

    var allowedValues = targetColumn === "agent_type" ? ["customer", "referral", "partner"] : ["bronze", "silver", "gold"];
    var result = fixColumnDataValidation_(sheet, colIndex + 1, allowedValues, dryRun);
    var validationEntry = { sheet: sheetName, column: targetColumn };
    validationEntry.status = result.status;
    validationEntry.allowed_values = result.allowed_values;
    if (result.error !== undefined) validationEntry.error = result.error;
    if (result.applied !== undefined) validationEntry.applied = result.applied;
    if (result.dry_run !== undefined) validationEntry.dry_run = result.dry_run;
    results.push(validationEntry);
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminRepairDataValidation",
    dry_run: dryRun,
    results: results
  };
}

function fixColumnDataValidation_(sheet, columnNumber, allowedValues, dryRun) {
  var totalRows = sheet.getMaxRows();
  var startRow = 2;
  var numRows = Math.max(totalRows - 1, 1);
  var range = sheet.getRange(startRow, columnNumber, numRows, 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedValues, true)
    .setAllowInvalid(false)
    .build();

  if (!dryRun) {
    range.setDataValidation(rule);
    return { status: "fixed", allowed_values: allowedValues };
  } else {
    return { status: "dry_run", allowed_values: allowedValues };
  }
}

// ============================================================
// Tracking Core
// ============================================================

function generateTrackingLogId_() {
  return "TRK" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmssSSS") + randomDigits_(2);
}

function randomDigits_(n) {
  var out = "";
  for (var i = 0; i < n; i++) out += String(Math.floor(Math.random() * 10));
  return out;
}

function normalizeTrackingActionType_(value) {
  var v = sanitizeText_(value).toLowerCase();
  return ["view","click","conversion"].indexOf(v) !== -1 ? v : "";
}

function normalizeTrackingTargetType_(value) {
  var v = sanitizeText_(value).toLowerCase();
  return ["cta","product","link"].indexOf(v) !== -1 ? v : "";
}

function detectTrackingDevice_(req) {
  var explicit = sanitizeText_(req.device);
  if (explicit) return explicit;
  var ua = sanitizeText_(req.user_agent || req.userAgent || req.ua).toLowerCase();
  if (!ua) return "";
  if (ua.indexOf("ipad") !== -1 || ua.indexOf("tablet") !== -1) return "tablet";
  if (ua.indexOf("mobi") !== -1 || ua.indexOf("iphone") !== -1 || ua.indexOf("android") !== -1) return "mobile";
  return "desktop";
}

function generateShareVisitId_() {
  return "VISIT" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + randomDigits_(4);
}

function resolveOrCreateTrackingVisitId_(req) {
  var visitId = sanitizeText_(req.share_visit_id || req.shareVisitId || req.visit_id || req.visitId);
  if (visitId) return visitId;
  return generateShareVisitId_();
}

function buildTrackingContextForCard_(card, req) {
  req = req || {};
  card = card || {};
  var visitId = resolveOrCreateTrackingVisitId_(req);
  return {
    share_visit_id: visitId,
    card_id: sanitizeText_(card.id),
    share_agent_id: sanitizeText_(req.share_agent_id || req.shareAgentId) || sanitizeText_(card.share_agent_id) || sanitizeText_(card.service_agent) || sanitizeText_(card.referrer),
    share_card_id: sanitizeText_(req.share_card_id || req.shareCardId) || sanitizeText_(card.share_card_id) || sanitizeText_(card.id),
    share_source: sanitizeText_(req.share_source || req.shareSource) || sanitizeText_(card.share_source) || "card_view",
    share_channel: sanitizeText_(req.share_channel || req.shareChannel) || sanitizeText_(card.share_channel) || "card_page",
    tenant: sanitizeText_(req.tenant || card.tenant) || CONFIG.DEFAULT_TENANT,
    device: detectTrackingDevice_(req)
  };
}

function getWebAppUrl_() {
  try {
    return ScriptApp.getService().getUrl() || "";
  } catch (err) {
    Logger.log("getWebAppUrl_ failed: " + err.message);
    return "";
  }
}

function buildQueryStringFromObject_(obj) {
  obj = obj || {};
  var parts = [];
  Object.keys(obj).forEach(function(key) {
    var val = obj[key];
    if (val === null || val === undefined) return;
    var s = String(val);
    if (!s) return;
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(s));
  });
  return parts.join("&");
}

function buildTrackedCtaLink_(card, trackingContext, slot, rawLink, ctaText) {
  rawLink = sanitizeText_(rawLink);
  if (!rawLink) return "";
  var webAppUrl = getWebAppUrl_();
  if (!webAppUrl) return rawLink;
  var params = {
    action: "trackRedirect",
    card_id: sanitizeText_(card && card.id),
    agent_id: resolveTrackingCardAgentId_(card, {}),
    share_agent_id: sanitizeText_(trackingContext && trackingContext.share_agent_id),
    share_card_id: sanitizeText_(trackingContext && trackingContext.share_card_id) || sanitizeText_(card && card.id),
    share_source: "card_click",
    share_channel: sanitizeText_(trackingContext && trackingContext.share_channel) || "card_page",
    share_visit_id: sanitizeText_(trackingContext && trackingContext.share_visit_id),
    action_type: "click",
    target_type: "cta",
    target_value: rawLink,
    target_url: rawLink,
    cta_slot: sanitizeText_(slot),
    cta_text: sanitizeText_(ctaText),
    device: sanitizeText_(trackingContext && trackingContext.device),
    tenant: sanitizeText_(trackingContext && trackingContext.tenant) || sanitizeText_(card && card.tenant) || CONFIG.DEFAULT_TENANT,
    is_test: (card && (card.is_test || card.isTest)) || ""
  };
  var qs = buildQueryStringFromObject_(params);
  return webAppUrl + (webAppUrl.indexOf("?") === -1 ? "?" : "&") + qs;
}

function applyTrackedCtaLinksToCard_(displayCard, trackingContext) {
  displayCard = displayCard || {};
  trackingContext = trackingContext || {};
  for (var i = 1; i <= 3; i++) {
    var textKey = "cta_text_" + i;
    var linkKey = "cta_link_" + i;
    var rawKey = "cta_original_link_" + i;
    var trackedKey = "cta_tracked_link_" + i;
    var rawLink = sanitizeText_(displayCard[linkKey]);
    displayCard[rawKey] = rawLink;
    if (rawLink) {
      var tracked = buildTrackedCtaLink_(displayCard, trackingContext, String(i), rawLink, sanitizeText_(displayCard[textKey]));
      displayCard[trackedKey] = tracked;
      displayCard[linkKey] = tracked;
    } else {
      displayCard[trackedKey] = "";
    }
  }
  return displayCard;
}

function redirectOutput_(targetUrl) {
  var safe = sanitizeText_(targetUrl);
  if (!safe) safe = "about:blank";
  var escaped = safe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  var html = ''
    + '<!doctype html><html><head>'
    + '<meta charset="utf-8">'
    + '<meta http-equiv="refresh" content="0; url=' + escaped + '">'
    + '<script>window.location.replace(' + JSON.stringify(safe) + ');</script>'
    + '</head><body>'
    + '<a href="' + escaped + '">Continue</a>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function trackRedirect_(req) {
  req = req || {};
  var targetUrl = sanitizeText_(req.target_url || req.targetUrl || req.url || req.target_value || req.targetValue);
  if (!targetUrl) {
    return jsonOutput_({ ok: false, version: HSC_VERSION, action: "trackRedirect", error: "Missing target_url" });
  }
  try {
    var trackReq = shallowClone_(req);
    trackReq.action_type = normalizeTrackingActionType_(req.action_type || req.actionType) || "click";
    trackReq.target_type = normalizeTrackingTargetType_(req.target_type || req.targetType) || "cta";
    trackReq.target_value = sanitizeText_(req.target_value || req.targetValue) || targetUrl;
    trackReq.note = sanitizeText_(req.note) || "cta_redirect_click";
    trackEvent_(trackReq);
  } catch (err) {
    Logger.log("trackRedirect_ tracking failed: " + err.message);
  }
  return redirectOutput_(targetUrl);
}

function shouldAutoTrackCardView_(req) {
  req = req || {};
  if (toBoolean_(req.disable_tracking) || toBoolean_(req.skip_tracking) || toBoolean_(req.no_track)) return false;
  var mode = sanitizeText_(req.mode).toLowerCase();
  if (mode === "preview" || mode === "update" || mode === "admin") return false;
  return true;
}

function tryTrackCardView_(card, req, trackingContext) {
  if (!shouldAutoTrackCardView_(req)) {
    return { auto_view_tracked: false, skipped: true, reason: "tracking_disabled" };
  }
  try {
    var trackReq = {
      card_id: sanitizeText_(card.id),
      agent_id: sanitizeText_(card.agent_id) || sanitizeText_(card.owner_agent_id) || sanitizeText_(card.service_agent) || sanitizeText_(card.referrer),
      share_agent_id: sanitizeText_(trackingContext.share_agent_id),
      share_card_id: sanitizeText_(trackingContext.share_card_id),
      share_source: sanitizeText_(trackingContext.share_source),
      share_channel: sanitizeText_(trackingContext.share_channel),
      share_visit_id: sanitizeText_(trackingContext.share_visit_id),

      action_type: "view",
      target_type: "cta",
      target_value: "card_open",
      device: sanitizeText_(trackingContext.device),
      referrer: sanitizeText_(req.referrer),
      tenant: sanitizeText_(trackingContext.tenant),
      is_test: req.is_test || req.isTest || card.is_test,
      note: "auto_card_view"
    };
    var result = trackEvent_(trackReq);
    return {
      auto_view_tracked: true,
      tracked_event_id: result && result.event ? sanitizeText_(result.event.id) : "",
      share_visit_id: sanitizeText_(trackingContext.share_visit_id)
    };
  } catch (err) {
    Logger.log("tryTrackCardView_ failed: " + err.message);
    return {
      auto_view_tracked: false,
      share_visit_id: sanitizeText_(trackingContext.share_visit_id),
      error: sanitizeText_(err && err.message)
    };
  }
}

function resolveTrackingCardAgentId_(card, req) {
  var explicit = sanitizeText_(req.agent_id || req.agentId);
  if (explicit) return explicit;
  if (!card) return "";
  return sanitizeText_(card.agent_id) || sanitizeText_(card.owner_agent_id) || sanitizeText_(card.service_agent) || sanitizeText_(card.referrer);
}

function resolveTrackingShareAgentId_(card, req) {
  return sanitizeText_(req.share_agent_id || req.shareAgentId) || (card ? sanitizeText_(card.share_agent_id) || sanitizeText_(card.service_agent) || sanitizeText_(card.referrer) : "");
}

function resolveTrackingShareCardId_(card, req) {
  return sanitizeText_(req.share_card_id || req.shareCardId) || (card ? sanitizeText_(card.share_card_id) || sanitizeText_(card.id) : "");
}

function buildTrackingRow_(req) {
  ensureAllSchemasOrThrow_();
  req = req || {};

  var cardId = sanitizeText_(req.card_id || req.cardId);
  if (!cardId) throw new Error("Missing card_id");

  var actionType = normalizeTrackingActionType_(req.action_type || req.actionType);
  if (!actionType) throw new Error("Invalid action_type");

  var targetType = normalizeTrackingTargetType_(req.target_type || req.targetType);
  if (actionType !== "view" && !targetType) throw new Error("Invalid target_type");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var row = emptyRow_("tracking_log");
  row.id = generateTrackingLogId_();
  row.created_at = nowIso_();
  row.card_id = cardId;
  row.agent_id = resolveTrackingCardAgentId_(card, req);
  row.share_agent_id = resolveTrackingShareAgentId_(card, req);
  row.share_card_id = resolveTrackingShareCardId_(card, req);
  row.share_source = sanitizeText_(req.share_source || req.shareSource || card.share_source);
  row.share_channel = sanitizeText_(req.share_channel || req.shareChannel || card.share_channel);
  row.share_visit_id = resolveOrCreateTrackingVisitId_(req);
  row.action_type = actionType;
  row.target_type = targetType;
  row.target_value = sanitizeText_(req.target_value || req.targetValue);
  row.device = detectTrackingDevice_(req);
  row.referrer = sanitizeText_(req.referrer);
  row.note = sanitizeText_(req.note);
  row.tenant = sanitizeText_(req.tenant || card.tenant) || CONFIG.DEFAULT_TENANT;
  row.is_test = toBooleanString_(req.is_test || req.isTest || card.is_test);
  return row;
}

function trackEvent_(req) {
  var row = buildTrackingRow_(req);
  appendRowByName_("tracking_log", row);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "trackEvent",
    tracked: true,
    event: row
  };
}

function getTrackingRowsByReq_(req) {
  ensureAllSchemasOrThrow_();
  req = req || {};
  var tenant = sanitizeText_(req.tenant) || CONFIG.DEFAULT_TENANT;
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  var actionType = normalizeTrackingActionType_(req.action_type || req.actionType);
  var targetType = normalizeTrackingTargetType_(req.target_type || req.targetType);
  var shareVisitId = sanitizeText_(req.share_visit_id || req.shareVisitId || req.visit_id || req.visitId);
  var startAt = sanitizeText_(req.start_at || req.startAt);
  var endAt = sanitizeText_(req.end_at || req.endAt);

  return getSheetRowsByName_("tracking_log").filter(function(row) {
    if (!sameTenant_(row.tenant, tenant)) return false;
    if (cardId && sanitizeText_(row.card_id) !== cardId) return false;
    if (agentId && sanitizeText_(row.agent_id) !== agentId && sanitizeText_(row.share_agent_id) !== agentId) return false;
    if (actionType && sanitizeText_(row.action_type) !== actionType) return false;
    if (targetType && sanitizeText_(row.target_type) !== targetType) return false;
    if (shareVisitId && sanitizeText_(row.share_visit_id) !== shareVisitId) return false;
    var createdAt = sanitizeText_(row.created_at);
    if (startAt && createdAt && createdAt < startAt) return false;
    if (endAt && createdAt && createdAt > endAt) return false;
    return true;
  }).sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });
}

function summarizeTrackingRows_(rows) {
  rows = rows || [];
  var summary = {
    total_events: rows.length,
    views: 0,
    clicks: 0,
    conversions: 0,
    unique_visits: 0,
    ctr: 0,
    conversion_rate: 0,
    top_targets: []
  };
  var visitSet = {};
  var targetCount = {};
  rows.forEach(function(row) {
    var actionType = sanitizeText_(row.action_type);
    if (actionType === "view") summary.views++;
    if (actionType === "click") summary.clicks++;
    if (actionType === "conversion") summary.conversions++;
    var visitId = sanitizeText_(row.share_visit_id);
    if (visitId) visitSet[visitId] = true;
    var key = sanitizeText_(row.target_type) + "::" + sanitizeText_(row.target_value);
    if (sanitizeText_(row.target_value)) targetCount[key] = (targetCount[key] || 0) + 1;
  });
  summary.unique_visits = Object.keys(visitSet).length;
  summary.ctr = summary.views > 0 ? roundMoney_((summary.clicks / summary.views) * 100) : 0;
  summary.conversion_rate = summary.clicks > 0 ? roundMoney_((summary.conversions / summary.clicks) * 100) : 0;
  summary.top_targets = Object.keys(targetCount).map(function(key) {
    var parts = key.split("::");
    return { target_type: parts[0], target_value: parts.slice(1).join("::"), count: targetCount[key] };
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10);
  return summary;
}

function getTrackingSummary_(req) {
  requireAdminKeyOrSystem_(req);
  var rows = getTrackingRowsByReq_(req);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getTrackingSummary",
    filters: {
      card_id: sanitizeText_(req.card_id || req.cardId),
      agent_id: sanitizeText_(req.agent_id || req.agentId),
      start_at: sanitizeText_(req.start_at || req.startAt),
      end_at: sanitizeText_(req.end_at || req.endAt)
    },
    summary: summarizeTrackingRows_(rows),
    recent_events: rows.slice(0, 100)
  };
}

function getCardTrackingStats_(req) {
  requireAdminKeyOrSystem_(req);
  var cardId = sanitizeText_(req.card_id || req.cardId);
  if (!cardId) throw new Error("Missing card_id");
  var rows = getTrackingRowsByReq_({
    tenant: sanitizeText_(req.tenant),
    card_id: cardId,
    start_at: sanitizeText_(req.start_at || req.startAt),
    end_at: sanitizeText_(req.end_at || req.endAt)
  });
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardTrackingStats",
    card_id: cardId,
    summary: summarizeTrackingRows_(rows),
    recent_events: rows.slice(0, 100)
  };
}

function getAgentTrackingStats_(req) {
  requireAdminKeyOrSystem_(req);
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  if (!agentId) throw new Error("Missing agent_id");
  var rows = getTrackingRowsByReq_({
    tenant: sanitizeText_(req.tenant),
    agent_id: agentId,
    start_at: sanitizeText_(req.start_at || req.startAt),
    end_at: sanitizeText_(req.end_at || req.endAt)
  });
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAgentTrackingStats",
    agent_id: agentId,
    summary: summarizeTrackingRows_(rows),
    recent_events: rows.slice(0, 100)
  };
}

// ============================================================
// Recognition Core Helpers (v7.11.1-stable)
// ============================================================

function generateRecognitionId_() {
  return "RC" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(6);
}

function isRecognitionEventType_(value) {
  var v = sanitizeText_(value).toLowerCase();
  return v === "renewal" || v === "addon";
}

function isRecognitionResultAllowed_(value) {
  var v = sanitizeText_(value).toLowerCase();
  return v === "pending" || v === "approved" || v === "rejected";
}

function getRecognitionById_(recognitionId) {
  return findRowByField_("recognition_db", "recognition_id", sanitizeText_(recognitionId));
}

function getRecognitionByEvent_(eventType, eventId, agentId) {
  var rows = getSheetRowsByName_("recognition_db").filter(function(row) {
    return sanitizeText_(row.event_type) === sanitizeText_(eventType) &&
           sanitizeText_(row.event_id) === sanitizeText_(eventId) &&
           sanitizeText_(row.agent_id) === sanitizeText_(agentId);
  });
  return rows.length ? rows[0] : null;
}

function getRecognitionRowsByEvent_(eventType, eventId) {
  return getSheetRowsByName_("recognition_db").filter(function(row) {
    return sanitizeText_(row.event_type) === sanitizeText_(eventType) &&
           sanitizeText_(row.event_id) === sanitizeText_(eventId);
  });
}

function recognitionExistsApproved_(eventType, eventId, agentId) {
  var rows = getSheetRowsByName_("recognition_db").filter(function(row) {
    return sanitizeText_(row.event_type) === sanitizeText_(eventType) &&
           sanitizeText_(row.event_id) === sanitizeText_(eventId) &&
           sanitizeText_(row.agent_id) === sanitizeText_(agentId) &&
           sanitizeText_(row.recognition_result) === "approved";

  });
  return rows.length > 0;
}

function resolveRecognitionTargetAgentId_(eventType, eventRow) {
  var serviceAgent = sanitizeText_(eventRow.service_agent);
  if (serviceAgent) return serviceAgent;
  
  var cardId = sanitizeText_(eventRow.card_id);
  if (cardId) {
    var card = findRowByField_("card_db", "id", cardId);
    if (card) {
      var ownerAgentId = sanitizeText_(card.owner_agent_id);
      if (ownerAgentId) return ownerAgentId;
      var agentId = sanitizeText_(card.agent_id);
      if (agentId) return agentId;
    }
  }
  
  return sanitizeText_(eventRow.agent_id);
}

function resolveRecognitionAgentTier_(agentRow) {
  if (!agentRow) return { agent_type: "customer", member_tier: "bronze" };
  
  var agentType = sanitizeText_(agentRow.agent_type).toLowerCase();
  var memberTier = sanitizeText_(agentRow.member_tier).toLowerCase();
  
  if (agentType === "partner" || memberTier === "gold") {
    return { agent_type: "partner", member_tier: "gold" };
  }
  if (agentType === "referral" || memberTier === "silver") {
    return { agent_type: "referral", member_tier: "silver" };
  }
  return { agent_type: "customer", member_tier: "bronze" };
}

function getAddonRecognitionPointsRate_() {
  return CONFIG.RECOGNITION_POINTS_RATE || 0.2;
}

function getRenewalRecognitionPointsRate_() {
  return CONFIG.RECOGNITION_POINTS_RATE || 0.2;
}

function getAddonRecognitionCashRate_() {
  return CONFIG.RECOGNITION_CASH_RATE || 0.4;
}

function getRenewalRecognitionCashRate_() {
  return CONFIG.RECOGNITION_CASH_RATE || 0.4;
}

function createRecognitionRow_(payload) {
  ensureAllSchemasOrThrow_();
  
  var eventType = sanitizeText_(payload.event_type);
  var eventId = sanitizeText_(payload.event_id);
  var agentId = sanitizeText_(payload.agent_id);
  
  if (!isRecognitionEventType_(eventType)) {
    throw new Error("Invalid event_type: " + eventType);
  }
  if (!eventId) throw new Error("Missing event_id");
  if (!agentId) throw new Error("Missing agent_id");
  
  var existing = getRecognitionByEvent_(eventType, eventId, agentId);
  if (existing) {
    throw new Error("Recognition already exists for event_type=" + eventType + " event_id=" + eventId + " agent_id=" + agentId);
  }
  
  var nowIso = toIso_(new Date());
  var row = emptyRow_("recognition_db");
  row.recognition_id = generateRecognitionId_();
  row.event_type = eventType;
  row.event_id = eventId;
  row.card_id = sanitizeText_(payload.card_id);
  row.agent_id = agentId;
  row.service_log_id = sanitizeText_(payload.service_log_id) || "";
  row.recognition_result = "pending";
  row.recognized_by = "";
  row.recognized_at = "";
  row.note = sanitizeText_(payload.note);
  row.tenant = sanitizeText_(payload.tenant) || CONFIG.DEFAULT_TENANT;
  row.is_test = toBooleanString_(payload.is_test);
  row.created_at = nowIso;
  row.updated_at = nowIso;
  
  appendRowByName_("recognition_db", row);
  return findRowByField_("recognition_db", "recognition_id", row.recognition_id) || row;
}

function ensureRecognitionPending_(eventType, eventId, agentId, cardId, tenant, isTest) {
  var existing = getRecognitionByEvent_(eventType, eventId, agentId);
  if (existing) {
    var result = sanitizeText_(existing.recognition_result);
    if (result === "pending") return existing;
    if (result === "approved") throw new Error("Recognition already approved for this event");
    if (result === "rejected") throw new Error("Recognition already rejected for this event");
  }
  return createRecognitionRow_({
    event_type: eventType,
    event_id: eventId,
    agent_id: agentId,
    card_id: cardId,
    tenant: tenant,
    is_test: isTest,
    note: "auto_created_from_approve"
  });
}

// 修正4: 分流順序固定以 agent_type 為主、member_tier 為輔
function getRecognitionRewardMode_(agentRow) {
  if (!agentRow) return { mode: "none", reason: "agent_not_found" };
  
  var agentType = sanitizeText_(agentRow.agent_type).toLowerCase();
  
  if (agentType === "partner") {
    return { mode: "cash", reason: "agent_type_partner" };
  }
  if (agentType === "referral") {
    return { mode: "points", reason: "agent_type_referral" };
  }
  
  var memberTier = sanitizeText_(agentRow.member_tier).toLowerCase();
  if (memberTier === "gold") {
    return { mode: "cash", reason: "member_tier_gold_fallback" };
  }
  if (memberTier === "silver") {
    return { mode: "points", reason: "member_tier_silver_fallback" };
  }
  
  return { mode: "none", reason: "no_eligible_tier" };
}

function applyRecognitionReward_(recognitionRow, eventRow, serviceLogRow) {
  var agentId = sanitizeText_(recognitionRow.agent_id);
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) {
    return { reward_mode: "none", error: "Agent not found" };
  }
  
  // 修正3: 以 recognition_id 為主鍵防重複發獎
  var recognitionId = sanitizeText_(recognitionRow.recognition_id);
  var eventType = sanitizeText_(recognitionRow.event_type);
  var eventId = sanitizeText_(recognitionRow.event_id);
  
  // 檢查點數獎勵是否已存在
  var existingPointsLog = getSheetRowsByName_("agent_points_log").filter(function(row) {
    return sanitizeText_(row.ref_id) === recognitionId &&
           (sanitizeText_(row.type) === "renewal_recognition_reward" || 
            sanitizeText_(row.type) === "addon_recognition_reward");
  });
  
  if (existingPointsLog.length > 0) {
    return {
      reward_mode: "points",
      points_added: 0,
      commission_id: "",
      amount: 0,
      skipped: true,
      reason: "reward_already_applied_points",
      existing_log_id: existingPointsLog[0].log_id
    };
  }
  
  // 檢查現金分潤是否已存在 (透過 commission note 中的 recognition_id)
  var existingCommission = getSheetRowsByName_("commission_db").filter(function(row) {
    var note = sanitizeText_(row.note);
    return note.indexOf("recognition_id=" + recognitionId) !== -1;
  });
  
  if (existingCommission.length > 0) {
    return {
      reward_mode: "cash",
      points_added: 0,
      commission_id: sanitizeText_(existingCommission[0].commission_id),
      amount: toNumber_(existingCommission[0].reward_amount),
      skipped: true,
      reason: "reward_already_applied_cash"
    };
  }
  
  // 修正4: 使用新的分流函數
  var rewardMode = getRecognitionRewardMode_(agent);
  
  var baseAmount = 0;
  if (eventType === "renewal") {
    baseAmount = toNumber_(eventRow.total_amount || eventRow.amount || 0);
  } else if (eventType === "addon") {
    baseAmount = toNumber_(eventRow.amount || 0);
  }
  
  if (baseAmount <= 0) {
    return { reward_mode: "none", error: "Base amount is zero", base_amount: baseAmount };
  }
  
  if (rewardMode.mode === "points") {
    var pointsRate = eventType === "renewal" ? getRenewalRecognitionPointsRate_() : getAddonRecognitionPointsRate_();
    var pointsEarned = roundMoney_(baseAmount * pointsRate);
    
    if (pointsEarned <= 0) {
      return { reward_mode: "none", error: "Points earned is zero", base_amount: baseAmount, rate: pointsRate };
    }
    
    var pointsResult = changeAgentPointsBalanceInternal_({
      agent_id: agentId,
      points: pointsEarned,
      bucket: "balance",
      type: eventType === "renewal" ? "renewal_recognition_reward" : "addon_recognition_reward",
      ref_id: recognitionId,
      note: "recognition approved for " + eventType + " " + eventId,
      operator: sanitizeText_(recognitionRow.recognized_by) || "system"
    });
    
    return {
      reward_mode: "points",
      points_added: pointsEarned,
      points_result: pointsResult,
      agent_type: rewardMode.mode,
      reason: rewardMode.reason,
      base_amount: baseAmount,
      rate: pointsRate,
      recognition_id: recognitionId
    };
  }
  
  if (rewardMode.mode === "cash") {
    var cashRate = eventType === "renewal" ? getRenewalRecognitionCashRate_() : getAddonRecognitionCashRate_();
    var cashEarned = roundMoney_(baseAmount * cashRate);
    
    if (cashEarned <= 0) {
      return { reward_mode: "none", error: "Cash earned is zero", base_amount: baseAmount, rate: cashRate };
    }
    
    var commissionRow = emptyRow_("commission_db");
    commissionRow.commission_id = generateCommissionId_();
    commissionRow.payment_id = "";
    commissionRow.card_id = sanitizeText_(recognitionRow.card_id);
    commissionRow.lead_id = "";
    commissionRow.created_at = nowIso_();
    commissionRow.updated_at = nowIso_();
    commissionRow.beneficiary_agent_id = agentId;
    commissionRow.source_agent_id = agentId;
    commissionRow.source_card_id = sanitizeText_(recognitionRow.card_id);
    commissionRow.reward_type = "cash";
    commissionRow.item = eventType === "renewal" ? "renewal_service_recognition" : "addon_service_recognition";
    commissionRow.base_amount = String(baseAmount);
    commissionRow.reward_rate = String(cashRate);
    commissionRow.reward_amount = String(cashEarned);
    commissionRow.reward_points = "0";
    commissionRow.status = "pending";
    commissionRow.rule_id = "RECOGNITION_" + eventType.toUpperCase();
    commissionRow.calculated_at = nowIso_();
    commissionRow.paid_at = "";
    commissionRow.frozen_at = "";
    commissionRow.unfrozen_at = "";
    commissionRow.freeze_reason = "";
    commissionRow.commission_batch_id = "";
    commissionRow.is_reversal = "FALSE";
    commissionRow.reversal_of = "";
    commissionRow.reversal_at = "";
    commissionRow.note = "recognition approved for " + eventType + " " + eventId + " | service_log_id=" + sanitizeText_(recognitionRow.service_log_id) + " | recognition_id=" + recognitionId;
    commissionRow.tenant = sanitizeText_(recognitionRow.tenant) || CONFIG.DEFAULT_TENANT;
    
    appendRowByName_("commission_db", commissionRow);
    
    var agentUpdated = shallowClone_(agent);
    var newTotal = roundMoney_(toNumber_(agentUpdated.total_commission) + cashEarned);
    agentUpdated.total_commission = String(newTotal);
    agentUpdated.last_commission_at = nowIso_();
    agentUpdated.updated_at = nowIso_();
    updateRowByName_("agent_db",
 agent.__rowNum, agentUpdated);
    
    appendAgentCommissionLog_({
      agent_id: agentId,
      type: eventType === "renewal" ? "renewal_recognition_cash" : "addon_recognition_cash",
      amount: cashEarned,
      before_total: roundMoney_(toNumber_(agent.total_commission)),
      after_total: newTotal,
      ref_id: recognitionId,
      note: "recognition approved for " + eventType,
      created_at: nowIso_(),
      tenant: sanitizeText_(recognitionRow.tenant) || CONFIG.DEFAULT_TENANT,
      operator: sanitizeText_(recognitionRow.recognized_by) || "system",
      bucket: "total",
      before_frozen: roundMoney_(toNumber_(agent.commission_frozen)),
      after_frozen: roundMoney_(toNumber_(agentUpdated.commission_frozen)),
      before_paid: roundMoney_(toNumber_(agent.commission_paid_total)),
      after_paid: roundMoney_(toNumber_(agentUpdated.commission_paid_total))
    });
    
    return {
      reward_mode: "cash",
      commission_id: commissionRow.commission_id,
      amount: cashEarned,
      agent_type: rewardMode.mode,
      reason: rewardMode.reason,
      base_amount: baseAmount,
      rate: cashRate,
      recognition_id: recognitionId
    };
  }
  
  return {
    reward_mode: "none",
    error: "Agent not eligible for recognition reward",
    agent_type: normalizeAgentTypeForSheet_(agent.agent_type),
    member_tier: sanitizeText_(agent.member_tier),
    reason: rewardMode.reason
  };
}

function buildRecognitionQueueItem_(eventType, eventRow, recognitionRow, agentRow) {
  var tier = resolveRecognitionAgentTier_(agentRow);
  var baseItem = {
    recognition_id: sanitizeText_(recognitionRow ? recognitionRow.recognition_id : ""),
    event_type: eventType,
    event_id: sanitizeText_(eventRow.renewal_id || eventRow.addon_order_id || eventRow.event_id),
    card_id: sanitizeText_(eventRow.card_id),
    agent_id: sanitizeText_(recognitionRow ? recognitionRow.agent_id : ""),
    agent_type: tier.agent_type,
    member_tier: tier.member_tier,
    service_log_id: sanitizeText_(recognitionRow ? recognitionRow.service_log_id : ""),
    recognition_result: sanitizeText_(recognitionRow ? recognitionRow.recognition_result : "pending"),
    paid_at: sanitizeText_(eventRow.paid_at || ""),
    note: sanitizeText_(recognitionRow ? recognitionRow.note : "")
  };
  
  if (eventType === "renewal") {
    baseItem.renewal_id = sanitizeText_(eventRow.renewal_id);
    baseItem.payment_id = sanitizeText_(eventRow.payment_id);
    baseItem.total_amount = toNumber_(eventRow.total_amount);
  } else if (eventType === "addon") {
    baseItem.addon_order_id = sanitizeText_(eventRow.addon_order_id);
    baseItem.payment_id = sanitizeText_(eventRow.payment_id);
    baseItem.addon_type = sanitizeText_(eventRow.addon_type || eventRow.item_code);
    baseItem.amount = toNumber_(eventRow.amount);
  }
  
  return baseItem;
}

function getRenewalRecognitionQueue_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);
  
  var tenant = getTenant_(req);
  var items = [];
  
  var renewals = getSheetRowsByName_("renewal_db").filter(function(row) {
    if (!sameTenant_(row.tenant, tenant)) return false;
    if (sanitizeText_(row.status).toLowerCase() !== "paid") return false;
    return true;
  });
  
  for (var i = 0; i < renewals.length; i++) {
    var renewal = renewals[i];
    var eventId = sanitizeText_(renewal.renewal_id);
    
    var agentId = resolveRecognitionTargetAgentId_("renewal", renewal);
    if (!agentId) continue;
    
    // 修正1: 確保每個事件有唯一 pending recognition
    var recognition = null;
    try {
      recognition = ensureRecognitionPending_(
        "renewal",
        eventId,
        agentId,
        sanitizeText_(renewal.card_id),
        tenant,
        sanitizeText_(renewal.is_test)
      );
    } catch (e) {
      // 如果已 approved/rejected，跳過
      if (e.message.indexOf("already approved") !== -1 || e.message.indexOf("already rejected") !== -1) {
        continue;
      }
      Logger.log("getRenewalRecognitionQueue_ ensureRecognitionPending_ error: " + e.message);
      continue;
    }
    
    if (!recognition) continue;
    
    // 只加入 pending 的 queue items
    if (sanitizeText_(recognition.recognition_result) !== "pending") continue;
    
    var agent = findRowByField_("agent_db", "agent_id", agentId);
    items.push(buildRecognitionQueueItem_("renewal", renewal, recognition, agent));
  }
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getRenewalRecognitionQueue",
    count: items.length,
    items: items
  };
}

function getAddonRecognitionQueue_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);
  
  var tenant = getTenant_(req);
  var items = [];
  
  var addons = getSheetRowsByName_("add_on_order_db").filter(function(row) {
    if (!sameTenant_(row.tenant, tenant)) return false;
    if (sanitizeText_(row.status).toLowerCase() !== "paid") return false;
    return true;
  });
  
  for (var i = 0; i < addons.length; i++) {
    var addon = addons[i];
    var eventId = sanitizeText_(addon.addon_order_id);
    
    var agentId = resolveRecognitionTargetAgentId_("addon", addon);
    if (!agentId) continue;
    
    // 修正1: 確保每個事件有唯一 pending recognition
    var recognition = null;
    try {
      recognition = ensureRecognitionPending_(
        "addon",
        eventId,
        agentId,
        sanitizeText_(addon.card_id),
        tenant,
        sanitizeText_(addon.is_test)
      );
    } catch (e) {
      if (e.message.indexOf("already approved") !== -1 || e.message.indexOf("already rejected") !== -1) {
        continue;
      }
      Logger.log("getAddonRecognitionQueue_ ensureRecognitionPending_ error: " + e.message);
      continue;
    }
    
    if (!recognition) continue;
    
    if (sanitizeText_(recognition.recognition_result) !== "pending") continue;
    
    var agent = findRowByField_("agent_db", "agent_id", agentId);
    items.push(buildRecognitionQueueItem_("addon", addon, recognition, agent));
  }
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAddonRecognitionQueue",
    count: items.length,
    items: items
  };
}

function getRecognitionDetail_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);
  
  var recognitionId = sanitizeText_(req.recognition_id);
  var eventType = sanitizeText_(req.event_type);
  var eventId = sanitizeText_(req.event_id);
  var agentId = sanitizeText_(req.agent_id);
  
  var recognition = null;
  if (recognitionId) {
    recognition = getRecognitionById_(recognitionId);
  } else if (eventType && eventId && agentId) {
    recognition = getRecognitionByEvent_(eventType, eventId, agentId);
  } else {
    throw new Error("Missing recognition_id or (event_type + event_id + agent_id)");
  }
  
  if (!recognition) throw new Error("Recognition not found");
  
  var eventRow = null;
  var eventTypeClean = sanitizeText_(recognition.event_type);
  var eventIdClean = sanitizeText_(recognition.event_id);
  
  if (eventTypeClean === "renewal") {
    eventRow = findRowByField_("renewal_db", "renewal_id", eventIdClean);
  } else if (eventTypeClean === "addon") {
    eventRow = findRowByField_("add_on_order_db", "addon_order_id", eventIdClean);
  }
  
  var serviceLog = null;
  var serviceLogId = sanitizeText_(recognition.service_log_id);
  if (serviceLogId) {
    serviceLog = findRowByField_("service_log", "service_log_id", serviceLogId);
  }
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getRecognitionDetail",
    recognition: recognition,
    event: eventRow,
    service_log: serviceLog
  };
}

function approveRecognition_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);
  
  var recognitionId = sanitizeText_(req.recognition_id);
  var eventType = sanitizeText_(req.event_type);
  var eventId = sanitizeText_(req.event_id);
  var agentId = sanitizeText_(req.agent_id);
  var serviceLogId = sanitizeText_(req.service_log_id);
  var note = sanitizeText_(req.note);
  var recognizedBy = sanitizeText_(req.recognized_by || req.operated_by || "system");
  
  if (!serviceLogId) throw new Error("Missing service_log_id");
  
  var recognition = null;
  if (recognitionId) {
    recognition = getRecognitionById_(recognitionId);
    if (!recognition) throw new Error("Recognition not found");
  } else if (eventType && eventId && agentId) {
    if (!isRecognitionEventType_(eventType)) throw new Error("Invalid event_type: " + eventType);
    recognition = getRecognitionByEvent_(eventType, eventId, agentId);
    if (!recognition) {
      var cardId = "";
      var tenant = CONFIG.DEFAULT_TENANT;
      var isTest = "FALSE";
      
      if (eventType === "renewal") {
        var renewalRow = findRowByField_("renewal_db", "renewal_id", eventId);
        if (renewalRow) {
          cardId = sanitizeText_(renewalRow.card_id);
          tenant = sanitizeText_(renewalRow.tenant) || tenant;
          isTest = sanitizeText_(renewalRow.is_test) || isTest;
        }
      } else if (eventType === "addon") {
        var addonRow = findRowByField_("add_on_order_db", "addon_order_id", eventId);
        if (addonRow) {
          cardId = sanitizeText_(addonRow.card_id);
          tenant = sanitizeText_(addonRow.tenant) || tenant;
          isTest = sanitizeText_(addonRow.is_test) || isTest;
        }
      }
      
      recognition = ensureRecognitionPending_(eventType, eventId, agentId, cardId, tenant, isTest);
    }
  } else {
    throw new Error("Missing recognition_id or (event_type + event_id + agent_id)");
  }
  
  if (sanitizeText_(recognition.recognition_result) === "approved") {
    throw new Error("Recognition already approved");
  }
  if (sanitizeText_(recognition.recognition_result) === "rejected") {
    throw new Error("Recognition already rejected, cannot approve");
  }
  
  var serviceLog = findRowByField_("service_log", "service_log_id", serviceLogId);
  if (!serviceLog)
 throw new Error("Service log not found");
  if (sanitizeText_(serviceLog.status).toLowerCase() !== "approved") {
    throw new Error("Service log not approved");
  }
  if (sanitizeText_(serviceLog.card_id) !== sanitizeText_(recognition.card_id)) {
    throw new Error("Service log card_id mismatch");
  }
  if (sanitizeText_(serviceLog.agent_id) !== sanitizeText_(recognition.agent_id)) {
    throw new Error("Service log agent_id mismatch");
  }
  
  if (recognitionExistsApproved_(sanitizeText_(recognition.event_type), sanitizeText_(recognition.event_id), sanitizeText_(recognition.agent_id))) {
    throw new Error("Recognition already approved for this event and agent");
  }
  
  var eventRow = null;
  var eventTypeClean = sanitizeText_(recognition.event_type);
  var eventIdClean = sanitizeText_(recognition.event_id);
  
  if (eventTypeClean === "renewal") {
    eventRow = findRowByField_("renewal_db", "renewal_id", eventIdClean);
    // 修正2: 驗證 renewal 已付款
    if (!eventRow) throw new Error("Renewal event not found: " + eventIdClean);
    if (sanitizeText_(eventRow.status).toLowerCase() !== "paid") {
      throw new Error("Renewal event is not paid");
    }
  } else if (eventTypeClean === "addon") {
    eventRow = findRowByField_("add_on_order_db", "addon_order_id", eventIdClean);
    if (!eventRow) throw new Error("Addon event not found: " + eventIdClean);
    if (sanitizeText_(eventRow.status).toLowerCase() !== "paid") {
      throw new Error("Addon event is not paid");
    }
  } else {
    throw new Error("Invalid event_type: " + eventTypeClean);
  }
  
var nowIso = toIso_(new Date());
var updatedRecognition = shallowClone_(recognition);
updatedRecognition.service_log_id = serviceLogId;
updatedRecognition.recognition_result = "approved";
updatedRecognition.recognized_by = recognizedBy;
updatedRecognition.recognized_at = nowIso;
updatedRecognition.note = mergeNote_(updatedRecognition.note, note);
updatedRecognition.updated_at = nowIso;

updateRowByName_("recognition_db", recognition.__rowNum, updatedRecognition);

// 🔒 防止已發獎但重跑（idempotent 保護）
var rewardResult;
var recognitionIdClean = sanitizeText_(updatedRecognition.recognition_id);
var existingReward = findRewardByRecognitionId_(recognitionIdClean);

if (existingReward) {
  rewardResult = {
    skipped: true,
    reason: "reward already exists"
  };
} else {
  rewardResult = applyRecognitionReward_(updatedRecognition, eventRow, serviceLog);
}

writeOpsLog_({
  module: "recognition",
  action: "approved",
  target_id: sanitizeText_(updatedRecognition.recognition_id),
  before_status: sanitizeText_(recognition.recognition_result),
  after_status: "approved",
  note: "event_type=" + eventTypeClean + "|event_id=" + eventIdClean + "|service_log_id=" + serviceLogId + "|agent_id=" + sanitizeText_(recognition.agent_id),
  tenant: sanitizeText_(recognition.tenant) || CONFIG.DEFAULT_TENANT
});

return {
  ok: true,
  version: HSC_VERSION,
  action: "approveRecognition",
  recognition: updatedRecognition,
  reward_result: rewardResult
};
}
// ============================================================
// 路由主函式
// ============================================================

function routeAction_(e, method) {
  try {
    var req = normalizeRequest_(e, method);
    var action = sanitizeText_(req.action);

    if (!action) {
      return jsonOutput_({
        ok: false,
        version: HSC_VERSION,
        error: "Missing action",
        req: req,
        parameter: e && e.parameter ? e.parameter : {},
        postData: e && e.postData && e.postData.contents ? e.postData.contents : ""
      });
    }

    if (ACTIONS.indexOf(action) === -1) {
      return jsonOutput_({
        ok: false,
        version: HSC_VERSION,
        error: "Unsupported action",
        action: action
      });
    }

    if (ADMIN_PROTECTED_ACTIONS.indexOf(action) !== -1) {
      requireAdminKeyOrSystem_(req);
    }

    if (req.__invalid_features_json) {
      return jsonOutput_({
        ok: false,
        version: HSC_VERSION,
        error: "Invalid features_json: " + sanitizeText_(req.__invalid_features_json_raw).substring(0, 100),
        action: action
      });
    }

    if (req.__invalid_addon_items) {
      return jsonOutput_({
        ok: false,
        version: HSC_VERSION,
        error: "Invalid addon_items JSON: " + sanitizeText_(req.__invalid_addon_items_raw).substring(0, 100),
        action: action
      });
    }

    var result;

    switch (action) {

      case "ping": result = ping_(req); break;
      case "trackEvent": result = trackEvent_(req); break;
      case "trackRedirect": result = trackRedirect_(req); break;
      case "getTrackingSummary": result = getTrackingSummary_(req); break;
      case "getCardTrackingStats": result = getCardTrackingStats_(req); break;
      case "getAgentTrackingStats": result = getAgentTrackingStats_(req); break;
      case "getPlanOptions": result = getPlanOptions_(req); break;
      case "createInviteCode": result = createInviteCode_(req); break;
      case "getInviteFormUrl": result = getInviteFormUrl_(req); break;
      case "createRequest": result = createRequest_(req); break;
      case "getRequests": result = getRequests_(req); break;
      case "getRequestTrace": result = getRequestTrace_(req); break;
      case "assignInviteToRequest": result = assignInviteToRequest_(req); break;
      case "createLead": result = createLead_(req); break;
      case "createCard": result = createCard_(req); break;
      case "markCardDelivered": result = markCardDelivered_(req); break;
      case "getCard": result = getCard_(req); break;
      case "getCardPublicLite": result = getCardPublicLite_(req); break;
      case "getCardForUpdate": result = getCardForUpdate_(req); break;
      case "getUpdateEligibility": result = getUpdateEligibility_(req); break;
      case "createUpdateFeePayment": result = createUpdateFeePayment_(req); break;

      case "getCardForRenewal": result = getCardForRenewal_(req); break;
      case "getRenewalSummary": result = getRenewalSummary_(req); break;
      case "createRenewalPayment": result = createRenewalPayment_(req); break;
      case "adminGetRenewalByCardId": result = adminGetRenewalByCardId_(req); break;
      case "getRenewalByCardId": result = adminGetRenewalByCardId_(req); break;
      case "adminGetRenewalDetail": result = adminGetRenewalDetail_(req); break;
      case "getRenewalDetail": result = adminGetRenewalDetail_(req); break;

      case "adminGrantAddon": result = adminGrantAddon_(req); break;
      case "updateCardByToken": result = updateCardByToken_(req); break;
      case "confirmUpdateFeePaid": result = confirmUpdateFeePaid_(req); break;

      case "confirmPayment": result = confirmPayment_(req); break;
      case "getPaymentDetail": result = getPaymentDetail_(req); break;
      case "getCardPaymentSummary": result = getCardPaymentSummary_(req); break;
      case "markPaymentPaid": result = markPaymentPaid_(req); break;
      case "adminMarkPaid": result = adminMarkPaid_(req); break;
      case "markPaymentRefunded": result = markPaymentRefunded_(req); break;

      case "processCommission": result = processCommission_(req); break;
      case "reverseCommission": result = reverseCommission_(req); break;
      case "getCommissionList": result = getCommissionList_(req); break;
      case "getCommissionByPayment": result = getCommissionByPayment_(req); break;
      case "adminGetCommissionList": result = adminGetCommissionList_(req); break;
      case "getPaymentCommissionStatus": result = getPaymentCommissionStatus_(req); break;
      case "adminGetPaymentList": result = adminGetPaymentList_(req); break;
      case "getPaymentList": result = adminGetPaymentList_(req); break;

      case "createServiceLog": result = createServiceLog_(req); break;
      case "getServiceLogs": result = getServiceLogs_(req); break;
      case "approveServiceLog": result = approveServiceLog_(req); break;
      case "rejectServiceLog": result = rejectServiceLog_(req); break;

      case "getAgentSummary": result = getAgentSummary_(req); break;
      case "getAgentCommissionStats": result = getAgentCommissionStats_(req); break;
      case "getAgentUpgradeStatus": result = getAgentUpgradeStatus_(req); break;
      case "getDeliveryAgentInfo": result = getDeliveryAgentInfo_(req); break;
      case "adminFreezeAgent": result = adminFreezeAgent_(req); break;
      case "adminUnfreezeAgent": result = adminUnfreezeAgent_(req); break;
      case "adminUpdateAgentType": result = adminUpdateAgentType_(req); break;
      case "adminSetAgentUpgrade": result = adminSetAgentUpgrade_(req); break;
      case "adminGetAgent": result = adminGetAgent_(req); break;
      case "getAgentDetail": result = adminGetAgent_(req); break;
      case "adminListAgents": result = adminListAgents_(req); break;
      case "getAgents": result = adminListAgents_(req); break;
      case "adminUpdateAgent": result = adminUpdateAgent_(req); break;
      case "adminAdjustPoints": result = adminAdjustPoints_(req); break;
      case "adminAdjustCommission": result = adminAdjustCommission_(req); break;
      case "getAgentPointsLog": result = getAgentPointsLog_(req); break;
      case "getAgentCommissionLog": result = getAgentCommissionLog_(req); break;

      case "getExpiringCards": result = getExpiringCards_(req); break;
      case "getExpiredCards": result = getExpiredCards_(req); break;
      case "markCardRenewed": result = markCardRenewed_(req); break;
      case "triggerExpiryCheck": result = triggerExpiryCheck_(req); break;

      case "getAnnouncements": result = getAnnouncements_(req); break;
      case "getAnnouncementDetail": result = getAnnouncementDetail_(req); break;
      case "adminGetAnnouncements": result = adminGetAnnouncements_(req); break;
      case "adminSaveAnnouncement": result = adminSaveAnnouncement_(req); break;
      case "adminToggleAnnouncement":
 result = adminToggleAnnouncement_(req); break;

      case "installSystemTriggers": result = installSystemTriggers_(req); break;
      case "adminSavePlan": result = adminSavePlan_(req); break;
      case "adminSaveCardOverrides": result = adminSaveCardOverrides_(req); break;
      case "adminGetCardSettings": result = adminGetCardSettings_(req); break;
      case "adminBuildSpecialFormUrl": result = adminBuildSpecialFormUrl_(req); break;
      case "adminNormalizeCardThemeFields": result = adminNormalizeCardThemeFields(req); break;
      case "adminAuditCardThemeFields": result = adminAuditCardThemeFields(req); break;

      case "createAddonOrder": result = createAddonOrder_(req); break;
      case "createAddOnOrder": result = createAddonOrder_(req); break;
      case "adminCancelAddonOrder": result = adminCancelAddonOrder_(req); break;
      case "adminCheckSchemaStatus": result = adminCheckSchemaStatus_(req); break;
      case "checkSchemaStatus": result = adminCheckSchemaStatus_(req); break;
      case "repairAddonOrderStatuses": result = repairAddonOrderStatuses_(); break;

      case "createOfflinePayment": result = createOfflinePayment_(req); break;
      case "submitOfflinePaymentProof": result = submitOfflinePaymentProof_(req); break;
      case "confirmOfflinePayment": result = confirmOfflinePayment_(req); break;
      case "buildPaymentNoticeText": result = buildPaymentNoticeText_(req); break;
      case "buildDeliveryNoticeText": result = buildDeliveryNoticeText_(req); break;

      case "buildPaidNoticeText": result = buildPaidNoticeText_(req); break;
      case "createCardWithOfflinePayment": result = createCardWithOfflinePayment_(req); break;

      case "runInviteExpireSweep": result = runInviteExpireSweep(); break;
      case "runPaymentReminderSweep": result = runPaymentReminderSweep(); break;
      case "runPaymentLockSweep": result = runPaymentLockSweep(); break;
      case "getPendingOfflinePayments": result = getPendingOfflinePayments_(req); break;
      case "runDailyOps": result = runDailyOps_(req); break;
      case "installCommercialTriggers": result = installCommercialTriggers_(req); break;

      case "getCommissions": result = getCommissions_(req); break;
      case "approveCommission": result = approveCommission_(req); break;
      case "markCommissionPaid": result = markCommissionPaid_(req); break;
      case "confirmAddonOrderPaid": result = confirmAddonOrderPaid_(req); break;
      case "confirmAddOnPayment": result = confirmAddOnPayment_(req); break;
      case "adminMarkAddonPaid": result = adminMarkAddonPaid_(req); break;
      case "adminBackfillAddonDueAt": result = adminBackfillAddonDueAt_(req); break;
      case "getAddonOrders": result = getAddonOrders_(req); break;
      case "submitAddonPaymentProof": result = submitAddonPaymentProof_(req); break;
      case "buildAddonPaymentNoticeText": result = buildAddonPaymentNoticeText_(req); break;

      case "triggerPaymentReminder": result = triggerPaymentReminder_(); break;
      case "triggerAddonPaymentReminder": result = triggerAddonPaymentReminder_(); break;
      case "triggerRenewalPaymentReminder": result = triggerRenewalPaymentReminder_(req); break;
      case "adminGetRenewalList": result = adminGetRenewalList_(req); break;
      case "getRenewalList": result = adminGetRenewalList_(req); break;
      case "adminMarkRenewalPaid": result = adminMarkRenewalPaid_(req); break;
      case "triggerRenewalReminder": result = triggerRenewalReminder_(); break;
      case "triggerOverdueLock": result = triggerOverdueLock_(); break;
      case "expirePendingAddonOrders": result = expirePendingAddonOrders_(req); break;

      case "getPayments": result = getPayments_(req); break;
      case "getPayment": result = getPayment_(req); break;
      case "updatePayment": result = updatePayment_(req); break;
      case "adminRepairDueAt": result = adminRepairDueAt_(req); break;

      case "getCards": result = getCards_(req); break;
      case "adminUpdateCard": result = adminUpdateCard_(req); break;

      case "getAddonOrder": result = getAddonOrder_(req); break;
      case "adminGetOrderDetail": result = getAddonOrder_(req); break;
      case "getAddonOrderDetail": result = getAddonOrder_(req); break;
      case "adminListOrders": result = getAddonOrders_(req); break;
      case "adminCreateAddonOrder": result = createAddonOrder_(req); break;
      case "getOpsLogs": result = getOpsLogs_(req); break;
      case "getPendingCommissionPayments": result = getPendingCommissionPayments_(req); break;
      case "getAdminCardDashboard": result = getAdminCardDashboard_(req); break;
      case "runCommissionEngineSweep": result = runCommissionEngineSweep_(req); break;
      case "buildMonthlySettlement": result = buildMonthlySettlement_(req); break;
      case "markSettlementPaid": result = markSettlementPaid_(req); break;

      case "adminRepairMissingAgents": result = adminRepairMissingAgents_(req); break;
      case "adminNormalizeAgentMemberTier": result = adminNormalizeAgentMemberTier_(req); break;
      case "adminNormalizeAgentTypeAndTier": result = adminNormalizeAgentTypeAndTier_(req); break;
      case "adminRepairAgentPointsLog": result = adminRepairAgentPointsLog_(req); break;

      case "adminRepairAgentTypeEnum": result = adminRepairAgentTypeEnum_(req); break;

      case "adminRepairDataValidation": result = adminRepairDataValidation_(req); break;

      case "getRecentOpsLogs": result = getRecentOpsLogs_(req); break;

      case "getRenewalRecognitionQueue": result = getRenewalRecognitionQueue_(req); break;
      case "getAddonRecognitionQueue": result = getAddonRecognitionQueue_(req); break;
      case "approveRecognition": result = approveRecognition_(req); break;
      case "rejectRecognition": result = rejectRecognition_(req); break;
      case "getRecognitionDetail": result = getRecognitionDetail_(req); break;
      case "getRecognitionQueue":
        result = sanitizeText_(req.type).toLowerCase() === "addon"
          ? getAddonRecognitionQueue_(req)
          : getRenewalRecognitionQueue_(req);
        break;

      default:
        throw new Error("Action router mismatch: " + action);
    }

    return jsonOutput_(result);

  } catch (err) {
    return jsonOutput_({
      ok: false,
      version: HSC_VERSION,
      error: err && err.message ? err.message : String(err),
      stack: err && err.stack ? String(err.stack) : ""
    });
  }
}
/* ============================================================
   第2段｜商業閉環核心（createCard / addon / confirmPayment）
============================================================ */

/* =========================
   createCard（完整閉環）
========================= */
function createCard_(req) {
  var leadId = sanitizeText_(req.lead_id);
  if (!leadId) throw new Error("Missing lead_id");

  var lead = findRowByField_("lead_db", "lead_id", leadId);
  if (!lead) throw new Error("Lead not found");

  var now = new Date();
  var tenant = sanitizeText_(lead.tenant) || CONFIG.DEFAULT_TENANT;

  var cardId = ensureUniqueGeneratedValue_("card_db", "id", generateCardId_);
  var token = Utilities.getUuid();

  var planId = sanitizeText_(lead.plan);
  var plan = ensurePlanExists_(planId, tenant);
  var addonItems = Array.isArray(req.addon_items) ? req.addon_items : [];
  var applied = applyPlanAndAddonsToCard_(planId, addonItems, tenant);

  var card = emptyRow_("card_db");
  card.id = cardId;
  card.token = token;
  card.tenant = tenant;
  card.status = "active";
  card.billing_status = "unpaid";
  card.created_at = toIso_(now);
  card.updated_at = card.created_at;
  card.plan = planId;
  card.payment_due_at = resolveRequiredDueAtFromBase_(card.created_at);

  card.name = sanitizeText_(lead.name);
  card.unit = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "unit"));
  card.title = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "title"));
  card.slogan = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "slogan"));
  card.phone = sanitizePhoneAsText_(lead.phone);
  card.email = sanitizeText_(lead.email);
  card.services = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "services"));
  card.experience = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "experience"));
  card.wechat_id = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "wechat_id"));
  card.line_url = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "line_url"));
  card.line_oa = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "line_oa"));
  card.address = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "address"));
  card.website = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "website"));
  card.video1 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "video1"));
  card.video2 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "video2"));
  card.video3 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "video3"));
  card.social1 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "social1"));
  card.social2 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "social2"));
  card.social3 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "social3"));
  card.avatar_url = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "avatar_url"));
  card.logo_url = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "logo_url"));
  card.avatar_key = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "avatar_key"));
  card.logo_key = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "logo_key"));
  for (var i = 1; i <= 10; i++) {
    card["photo" + i + "_url"] = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "photo" + i + "_url"));
    card["photo" + i + "_key"] = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "photo" + i + "_key"));
  }
  card.cta_text_1 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "cta_text_1"));
  card.cta_link_1 = sanitizeText_(resolveFieldFromReqOrLead_(req,
 lead, "cta_link_1"));
  card.cta_text_2 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "cta_text_2"));
  card.cta_link_2 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "cta_link_2"));
  card.cta_text_3 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "cta_text_3"));
  card.cta_link_3 = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "cta_link_3"));
  card.features_json = req.features_json ? (typeof req.features_json === "string" ? req.features_json : JSON.stringify(req.features_json)) : sanitizeText_(lead.features_json);

  card.invite_code = sanitizeText_(req.invite_code) || sanitizeText_(lead.invite_code);
  card.referrer = sanitizeText_(req.referrer) || sanitizeText_(lead.referrer);
  card.service_agent = sanitizeText_(req.service_agent) || sanitizeText_(lead.service_agent);
  card.agent_type = normalizeAgentType_(req.agent_type || lead.agent_type || "customer");
  card.agent_id = sanitizeText_(lead.agent_id) || card.service_agent || card.referrer;
  card.owner_agent_id = sanitizeText_(card.agent_id);
  card.owner_agent_type = normalizeAgentTypeForSheet_(sanitizeText_(card.agent_type));
  card.source = sanitizeText_(lead.source);
  card.form_ts = sanitizeText_(lead.form_ts);
  card.form_source = sanitizeText_(lead.source);
  card.process_status = sanitizeText_(req.process_status || lead.process_status);
  card.is_test = sanitizeText_(req.is_test || lead.is_test);

  card.color = sanitizeText_(req.color || lead.color);
  card.style = sanitizeText_(resolveStyleForPlan_(plan, req.style || lead.style));
  card.paper = sanitizeText_(resolvePaperForPlan_(plan, req.paper || lead.paper));

  card.photo_limit = String(applied.photo_limit);
  card.cta_limit = String(applied.cta_limit !== undefined && applied.cta_limit !== null && String(applied.cta_limit) !== "" ? applied.cta_limit : (planId === "premium" ? 3 : 1));
  card.photo_extra_purchased = String(Math.max(0, Number(applied.photo_extra_purchased || 0)));
  card.cta_extra_purchased = String(Math.max(0, Number(applied.cta_extra_purchased || 0)));
  if (applied.has_unlimited_update) {
    card.update_limit_override_enabled = "TRUE";
    card.update_limit_override_value = "-1";
  }
  if (applied.has_marquee) {
    card.marquee_purchased = "TRUE";
    card.marquee_enabled = "TRUE";
  }

  if (req.marquee_purchased !== undefined) card.marquee_purchased = toBooleanString_(req.marquee_purchased);
  if (req.marquee_enabled !== undefined) card.marquee_enabled = toBooleanString_(req.marquee_enabled);
  if (req.marquee_text !== undefined) card.marquee_text = sanitizeText_(req.marquee_text);

  if (card.referrer) ensureAgentExists_(card.referrer, { card: card, source: "card_referrer", tenant: tenant });
  if (card.service_agent) ensureAgentExists_(card.service_agent, { card: card, source: "card_service_agent", tenant: tenant });
  if (card.agent_id) ensureAgentExists_(card.agent_id, { card: card, source: "card_agent_id", tenant: tenant });
  if (req.share_agent_id) ensureAgentExists_(req.share_agent_id, { card: card, source: "card_share_agent", tenant: tenant });

  appendRowByName_("card_db", card);
  invalidateCardPublicCache_(cardId);
  updateLeadConvertedCardId_(leadId, cardId);

  return {
    ok: true,
    version: HSC_VERSION,
    card_id: cardId,
    card: card
  };
}

/* =========================
   addon 建單
========================= */
function createAddonOrderRows_(cardId, items, tenant) {
  var now = new Date();
  return items.map(function(item) {
    var row = emptyRow_("add_on_order_db");
    row.addon_order_id = genAddonOrderId_();
    row.card_id = cardId;
    row.created_at = toIso_(now);
    row.updated_at = row.created_at;
    row.item_code = item.item_code;
    row.item_name = getAddonItemNameByCode_(item.item_code);
    row.qty = item.qty;
    row.unit_price = item.unit_price;
    row.amount = item.amount;
    row.status = "pending";
    row.tenant = tenant;
    appendRowByName_("add_on_order_db", row);
    return row;
  });
}

/* =========================
   套用 addon → 卡片
========================= */
function applySingleAddonToCard_(card, addon) {
  var updated = shallowClone_(card);

  var code = sanitizeText_(addon.item_code || addon.addon_key || addon.addon_type);
  var qty = Math.max(0, Number(addon.qty || 0));

  if (code === "addon_photo") {
    updated.photo_limit = String(Math.min(PHOTO_LIMIT_ABSOLUTE_MAX, Number(card.photo_limit || 0) + qty));
    updated.photo_extra_purchased = String(Math.max(0, Number(card.photo_extra_purchased || 0)) + qty);
  }

  if (code === "addon_cta") {
    updated.cta_limit = String(Math.max(0, Number(card.cta_limit || 0) + qty));
    updated.cta_extra_purchased = String(Math.max(0, Number(card.cta_extra_purchased || 0)) + qty);
  }

  if (code === "addon_marquee") {
    updated.marquee_purchased = "TRUE";
    updated.marquee_enabled = "TRUE";
  }

  if (code === "addon_update_unlimited") {
    updated.update_limit_override_enabled = "TRUE";
    updated.update_limit_override_value = "-1";
  }

  return updated;
}

function applyPaidAddonOrdersToCard_(cardId) {
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) return;

  var addons = findRowsByField_("add_on_order_db", "card_id", cardId)
    .filter(function(a) { return sanitizeText_(a.status) === "paid"; });

  var updated = shallowClone_(card);

  addons.forEach(function(a) {
    updated = applySingleAddonToCard_(updated, a);
  });

  updateRowByName_("card_db", card.__rowNum, updated);
  invalidateCardPublicCache_(updated.id || updated.card_id);
}

/* =========================
   confirmPayment（閉環）
========================= */
function logCardUpdate_(card, req, chargeRequired, chargeAmount, paymentId) {
  var now = new Date();
  var row = emptyRow_("update_log_db");
  row.update_id = generateUpdateId_();
  row.card_id = sanitizeText_(card.id);
  row.created_at = toIso_(now);
  row.updated_at = row.created_at;
  row.update_type = sanitizeText_(req.update_type) || "manual";
  row.is_free = chargeRequired ? "FALSE" : "TRUE";
  row.charge_required = chargeRequired ? "TRUE" : "FALSE";
  row.charge_amount = String(Number(chargeAmount || 0));
  row.payment_id = sanitizeText_(paymentId);
  row.status = "done";
  row.updated_by = sanitizeText_(req.updated_by || req.operated_by || "system");
  row.rule_source = "effective_period";
  row.year_bucket = getYearBucket_();
  row.effective_period_key = resolveEffectivePeriodKey_(card);
  row.note = sanitizeText_(req.note);
  row.is_test = sanitizeText_(card.is_test) || "FALSE";
  row.tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  appendRowByName_("update_log_db", row);
  return row;
}

/* =========================
   renewal
========================= */
function getCardForRenewal_(req) {
  ensureSchemasOrThrow_([
    CONFIG.SHEETS.CARD || "card_db",
    CONFIG.SHEETS.PAYMENT || "payment_db",
    CONFIG.SHEETS.RENEWAL || "renewal_db"
  ]);

  var renewToken = sanitizeText_(req.renew_token || req.token);
  var cardId = normalizeCardId_(req.card_id || req.id);

  var renewal = null;
  var card = null;

  if (renewToken) {
    renewal = findRenewalByToken_(renewToken);
    if (!renewal) throw new Error("Renewal token not found");
    card = findRowByField_(CONFIG.SHEETS.CARD || "card_db", "id", sanitizeText_(renewal.card_id));
  } else {
    card = findRowByField_(CONFIG.SHEETS.CARD || "card_db", "id", cardId);
    if (card) renewal = findLatestRenewalByCardId_(sanitizeText_(card.id));
  }

  if (!card) {
    throw new Error("Card not found for renewal");
  }

  var eligibility = isCardEligibleForRenewal_(card);
  var renewAccess = ensureRenewalTokenRecordForCard_(card, renewal);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardForRenewal",
    card: card,
    renewal: {
      eligible: eligibility.eligible,
      reason: eligibility.reason || "",
      current_plan: normalizePlanValue_(card.plan),
      current_expires_at: sanitizeText_(card.expires_at),
      renew_token: sanitizeText_((renewAccess.renewal || {}).renew_token),
      renewal_id: sanitizeText_((renewAccess.renewal || {}).renewal_id),
      due_at: resolveRenewalEffectiveDueAt_(renewAccess.renewal || {}, sanitizeText_((renewAccess.renewal || {}).due_at)),
      status: sanitizeText_((renewAccess.renewal || {}).status),
      billing_status: sanitizeText_((renewAccess.renewal || {}).billing_status)
    }
  };
}

function resolvePointsOwnerAgentIdForCard_(card) {
  if (!card || typeof card !== "object") return "";
  return sanitizeText_(card.owner_agent_id) || sanitizeText_(card.agent_id);
}

function ensurePointsOwnerAgentAccount_(card, agentId) {
  var id = sanitizeText_(agentId);
  if (!id) return null;

  var agent = findRowByField_("agent_db", "agent_id", id);
  if (agent) return agent;

  var nowIso = nowIso_();
  var row = emptyRow_("agent_db");
  row.agent_id = id;
  row.card_id = sanitizeText_(card && card.id);
  row.created_at = nowIso;
  row.updated_at = nowIso;
  row.status = "active";
  row.agent_type = normalizeAgentTypeForSheet_(sanitizeText_(card && (card.owner_agent_type || card.agent_type)) || AGENT_ROLE_DEFAULT);
  row.owner_name = sanitizeText_(card && card.name);
  row.owner_email = sanitizeText_(card && (card.owner_email || card.email));
  row.owner_phone = sanitizePhoneAsText_(card && (card.owner_phone || card.phone));
  row.parent_agent_id = "";
  row.referrer_agent_id = sanitizeText_(card && card.referrer);
  if (row.referrer_agent_id === id) row.referrer_agent_id = "";
  row.points_balance = "0";
  row.points_lifetime = "0";
  row.points_redeemed = "0";
  row.points_frozen = "0";
  row.total_commission = "0";
  row.commission_paid_total = "0";
  row.commission_frozen = "0";
  row.eligible_for_upgrade = "FALSE";
  row.upgrade_status = "";
  row.upgrade_eligible_at = "";
  row.partner_status = row.agent_type === AGENT_ROLE_PARTNER ? "active" : "";
  row.partner_qualified_at
 = row.agent_type === AGENT_ROLE_PARTNER ? nowIso : "";
  row.partner_revoked_at = "";
  row.partner_revoke_reason = "";
  row.self_renewal_required = "FALSE";
  row.self_renewal_ok = "TRUE";
  row.reward_freeze_flag = "FALSE";
  row.reward_freeze_reason = "";
  row.reward_freeze_at = "";
  row.reward_unfreeze_at = "";
  row.last_points_at = "";
  row.last_commission_at = "";
  row.last_reversed_at = "";
  row.agent_source = sanitizeText_(card && card.source) || "card_sync";
  row.note = "auto_created_for_points_owner";
  row.is_test = sanitizeText_(card && card.is_test) || "FALSE";
  row.tenant = sanitizeText_(card && card.tenant) || CONFIG.DEFAULT_TENANT;
  row.member_tier = mapAgentTypeToTier_(row.agent_type);
  row.tier_upgrade_eligible = "FALSE";
  row.tier_upgrade_reminder_sent_at = "";
  appendRowByName_("agent_db", row);
  return findRowByField_("agent_db", "agent_id", id) || row;
}

function getAgentPointsBalance_(agentId) {
  var id = sanitizeText_(agentId);
  if (!id) return 0;
  var agent = findRowByField_("agent_db", "agent_id", id);
  if (!agent) return 0;
  return Math.max(0, roundMoney_(toNumber_(agent.points_balance)));
}

function maybeAutoUpgradeAgentTierByPoints_(agent, now) {
  if (!agent) return agent;
  var when = now instanceof Date ? now : new Date();
  var updated = shallowClone_(agent);
  var currentType = sanitizeText_(updated.agent_type).toLowerCase();
  var lifetimePoints = roundMoney_(toNumber_(updated.points_lifetime));
  var upgraded = false;
  var oldType = currentType;
  var newType = currentType;

  if ((currentType === "customer" || !currentType) && lifetimePoints >= CUSTOMER_AUTO_UPGRADE_POINTS) {
    updated.agent_type = "referral";
    updated.member_tier = mapAgentTypeToTier_("referral");
    updated.status = sanitizeText_(updated.status) || "active";
    updated.note = mergeNote_(sanitizeText_(updated.note), "auto_upgrade_customer_to_referral_at_" + CUSTOMER_AUTO_UPGRADE_POINTS + "_points");
    updated.updated_at = toIso_(when);
    upgraded = true;
    newType = "referral";

    var targetId = sanitizeText_(updated.agent_id || updated.card_id);
    try {
      var alreadyNotified = false;
      var existingLogs = getSheetRowsByName_("ops_log_db").filter(function(row) {
        return sanitizeText_(row.module) === "notification" &&
               sanitizeText_(row.action) === "agent_upgraded" &&
               sanitizeText_(row.target_id) === targetId &&
               sanitizeText_(row.after_status) === "referral";
      });
      alreadyNotified = existingLogs.length > 0;

      if (!alreadyNotified) {
        var noteMsg = "🌟 " + (sanitizeText_(updated.card_id) || sanitizeText_(updated.agent_id)) + " " + (sanitizeText_(updated.owner_name) || "客戶") + " 已累積 " + CUSTOMER_AUTO_UPGRADE_POINTS + " 點，升級為銀牌推薦代理";
        var upgradePayload = {
          module: "notification",
          action: "agent_upgraded",
          target_id: targetId,
          before_status: "customer",
          after_status: "referral",
          operator: "system",
          note: noteMsg,
          tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
        };
        logAndNotifyEvent_(upgradePayload);
      }
    } catch (err) {
      Logger.log("maybeAutoUpgradeAgentTierByPoints_ notification error: " + err.message);
    }
  }

  if (upgraded) {
    updateRowByName_("agent_db", agent.__rowNum, updated);
    return findRowByField_("agent_db", "agent_id", sanitizeText_(updated.agent_id)) || updated;
  }

  return syncAgentUpgradeFields_(updated, when);
}
function changeAgentPointsBalanceInternal_(params) {
  params = params || {};
  var agentId = sanitizeText_(params.agent_id);
  if (!agentId) throw new Error("Missing agent_id");

  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent && params.card) {
    agent = ensurePointsOwnerAgentAccount_(params.card, agentId);
  }
  if (!agent) throw new Error("Agent not found");

  var now = new Date();
  var bucket = sanitizeText_(params.bucket || "balance").toLowerCase();
  var type = sanitizeText_(params.type || "system_adjust");
  var refId = sanitizeText_(params.ref_id || params.refId);
  var note = sanitizeText_(params.note);
  var operator = sanitizeText_(params.operator || "system");
  var points = roundMoney_(toNumber_(params.points));
  if (!points) {
    return { ok: true, agent: agent, unchanged: true };
  }

  var updated = shallowClone_(agent);
  var beforeBalance = roundMoney_(toNumber_(updated.points_balance));
  var beforeFrozen = roundMoney_(toNumber_(updated.points_frozen));
  var beforeRedeemed = roundMoney_(toNumber_(updated.points_redeemed));

  if (bucket === "redeem") {
    var redeem = Math.abs(points);
    var afterBalance = roundMoney_(beforeBalance - redeem);
    if (afterBalance < 0) throw new Error("Insufficient points balance");
    updated.points_balance = String(afterBalance);
    updated.points_redeemed = String(roundMoney_(beforeRedeemed + redeem));
    points = -redeem;
  } else {
    var nextBalance = roundMoney_(beforeBalance + points);
    if (nextBalance < 0) throw new Error("Insufficient points balance");
    updated.points_balance = String(nextBalance);
    if (points > 0) updated.points_lifetime = String(roundMoney_(toNumber_(updated.points_lifetime) + points));
    if (points < 0) updated.points_redeemed = String(roundMoney_(toNumber_(updated.points_redeemed) + Math.abs(points)));
  }

  updated.last_points_at = toIso_(now);
  updated.updated_at = toIso_(now);
  updateRowByName_("agent_db", agent.__rowNum, updated);

  appendAgentPointsLog_({
    agent_id: agentId,
    type: type,
    points: points,
    before_balance: beforeBalance,
    after_balance: roundMoney_(toNumber_(updated.points_balance)),
    ref_id: refId,
    note: note,
    created_at: toIso_(now),
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT,
    operator: operator,
    bucket: bucket,
    before_frozen: beforeFrozen,
    after_frozen: roundMoney_(toNumber_(updated.points_frozen)),
    before_redeemed: beforeRedeemed,
    after_redeemed: roundMoney_(toNumber_(updated.points_redeemed))
  });

  updated = maybeAutoUpgradeAgentTierByPoints_(updated, now);
  return { ok: true, agent: updated, changed: true, points: points };
}

function applyPointsRedemptionToAmount_(params) {
  params = params || {};
  var card = params.card || null;
  var amountBefore = Math.max(0, roundMoney_(toNumber_(params.amount_before || params.amount || 0)));
  var requestedPoints = Math.max(0, parseInt(params.requested_points || params.points_to_apply || params.pointsApply || params.use_points || 0, 10) || 0);
  var agentId = sanitizeText_(params.agent_id) || resolvePointsOwnerAgentIdForCard_(card);
  var paymentType = sanitizeText_(params.payment_type || params.event_type || "unknown");

  if (!requestedPoints) {
    return {
      agent_id: agentId || "",
      requested_points: 0,
      points_used: 0,
      amount_before: amountBefore,
      amount_after: amountBefore,
      applied: false,
      reason: "no_points_requested"
    };
  }

  if (!agentId) {
    return {
      agent_id: "",
      requested_points: requestedPoints,
      points_used: 0,
      amount_before: amountBefore,
      amount_after: amountBefore,
      applied: false,
      reason: "no_points_owner"
    };
  }

  if (!canUsePointsForPaymentType_(paymentType)) {
    return {
      agent_id: agentId,
      requested_points: requestedPoints,
      points_used: 0,
      amount_before: amountBefore,
      amount_after: amountBefore,
      applied: false,
      reason: "payment_type_not_allowed"
    };
  }

  var agent = ensurePointsOwnerAgentAccount_(card, agentId);
  var available = getAgentPointsBalance_(agentId);
  var existingApplied = toBoolean_(params.already_applied) || toNumber_(params.existing_points_used || 0) > 0;
  if (existingApplied) {
    return {
      agent_id: agentId,
      requested_points: requestedPoints,
      points_used: 0,
      amount_before: amountBefore,
      amount_after: amountBefore,
      applied: false,
      reason: "already_applied"
    };
  }

  var usable = Math.max(0, Math.min(requestedPoints, available, amountBefore));
  if (!usable) {
    return {
      agent_id: agentId,
      requested_points: requestedPoints,
      points_used: 0,
      amount_before: amountBefore,
      amount_after: amountBefore,
      applied: false,
      reason: "insufficient_points"
    };
  }

  changeAgentPointsBalanceInternal_({
    agent_id: agentId,
    card: card,
    points: usable,
    bucket: "redeem",
    type: sanitizeText_(params.type) || "redeem",
    ref_id: sanitizeText_(params.ref_id || params.source_id),
    note: sanitizeText_(params.note) || "points_redeem",
    operator: sanitizeText_(params.operator) || "system"
  });

  return {
    agent_id: agentId,
    requested_points: requestedPoints,
    points_used: usable,
    amount_before: amountBefore,
    amount_after: roundMoney_(amountBefore - usable),
    applied: true,
    reason: ""
  };
}

function canUsePointsForPaymentType_(paymentType) {
  var pt = sanitizeText_(paymentType).toLowerCase();
  if (pt === "first_payment" || pt === "first_payment") return false;
  if (pt === "renewal" || pt === "addon_payment" || pt === "agent_upgrade_fee") return true;
  return false;
}

function buildRedeemSummaryNote_(redeem) {
  if (!redeem || !redeem.applied) return "";
  return "points_used=" + redeem.points_used + ";redeem_applied=" + (redeem.applied ? "true" : "false") + ";reason=" + redeem.reason;
}

function applyRenewalPointsRedemption_(card, payment, summary, requestedPoints) {
  if (!canUsePointsForPaymentType_("renewal")) {
    return {
      points_used: 0,
      amount_after: summary.total_amount,
      applied: false,
      reason: "renewal_not_allowed"
    };
  }

  var refId = (payment && sanitizeText_(payment.payment_id)) ||
              (card && sanitizeText_(card.id)
 ? "card_" + sanitizeText_(card.id) : "") ||
              "renewal_preview";

  var pointsRedeem = applyPointsRedemptionToAmount_({
    card: card,
    requested_points: requestedPoints,
    amount_before: summary.total_amount,
    ref_id: refId,
    type: "renewal_redeem",
    note: "renewal_points_redeem",
    operator: "system",
    payment_type: "renewal"
  });

  return pointsRedeem;
}

function resolveAddonTargetType_(addonCode) {
  var code = normalizeAddonItemCode_(addonCode);
  if (code === "addon_agent_upgrade") return "agent_upgrade_fee";
  if (code === "addon_photo") return "extra_photo";
  if (code === "addon_cta") return "extra_cta";
  if (code === "addon_marquee") return "marquee";
  if (code === "addon_update_unlimited") return "update_unlimited";
  return "addon_other";
}

function extractRedeemSummaryFromNote_(note) {
  var text = sanitizeText_(note);
  var m = text.match(/points_used=(\d+)/);
  var pointsUsed = m ? Number(m[1]) : 0;
  var applied = text.indexOf("redeem_applied=true") !== -1;
  return { points_used: pointsUsed, applied: applied };
}

function getAgentUpgradeFeePrice_(tenant) {
  return getPricingValue_("addon_agent_upgrade", 1000, tenant);
}

function getRenewalSummary_(req) {
  ensureSchemasOrThrow_([
    CONFIG.SHEETS.CARD || "card_db",
    CONFIG.SHEETS.PLAN || "plan_db",
    CONFIG.SHEETS.PRICING || "pricing_db",
    CONFIG.SHEETS.PAYMENT || "payment_db",
    CONFIG.SHEETS.RENEWAL || "renewal_db"
  ]);

  var cardId = normalizeCardId_(req.card_id || req.id);
  if (!cardId) throw new Error("Missing card_id");

  var card = findRowByField_(CONFIG.SHEETS.CARD || "card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var eligibility = isCardEligibleForRenewal_(card);
  if (!eligibility.eligible) {
    throw new Error("CARD_NOT_ELIGIBLE_FOR_RENEWAL: " + eligibility.reason);
  }

  var tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  var currentPlan = normalizePlanValue_(card.plan);
  var targetPlan = normalizePlanValue_(req.target_plan || currentPlan);

  var isUpgrade = isPlanUpgrade_(currentPlan, targetPlan);
  var isDowngrade = currentPlan !== targetPlan && !isUpgrade;

  var keepMarquee = toBoolean_(req.keep_marquee);
  var keepPhotoExtraQty = Math.max(0, Number(req.keep_photo_extra_qty || 0));
  var keepCtaExtraQty = Math.max(0, Number(req.keep_cta_extra_qty || 0));
  var updateUnlimitedRenew = toBoolean_(req.update_unlimited_renew);
  var updateUnlimitedCurrent = toBoolean_(card.update_unlimited_current || card.update_unlimited || false);

  var renewalPrice = getPlanRenewalPrice_(targetPlan, tenant);
  var upgradeDiff = isUpgrade ? getPlanUpgradeDiff_(currentPlan, targetPlan, tenant) : 0;
  var downgradeNote = isDowngrade ? "續約改低方案，續約費不退差額" : "";

  var addonAmount = calcRenewalAddonAmount_({
    keep_marquee: keepMarquee,
    keep_photo_extra_qty: keepPhotoExtraQty,
    keep_cta_extra_qty: keepCtaExtraQty,
    update_unlimited_renew: updateUnlimitedRenew
  }, tenant);

  var renewalAmount = renewalPrice + upgradeDiff;
  var totalAmount = renewalAmount + addonAmount;

  var pendingPayment = findPendingRenewalPaymentByCardId_(card.id);
  var pointsRedeem = null;
  var effectiveTotalAmount = totalAmount;

  if (pendingPayment) {
    var paymentRedeem = extractPointsRedeemFromPaymentOrRenewal_(pendingPayment, null);
    if (paymentRedeem && paymentRedeem.applied && paymentRedeem.amount_after !== undefined) {
      pointsRedeem = paymentRedeem;
      effectiveTotalAmount = paymentRedeem.amount_after;
    } else {
      var renewal = findRowByField_(CONFIG.SHEETS.RENEWAL || "renewal_db", "payment_id", pendingPayment.payment_id);
      if (renewal) {
        var renewalRedeem = extractPointsRedeemFromPaymentOrRenewal_(null, renewal);
        if (renewalRedeem && renewalRedeem.applied && renewalRedeem.amount_after !== undefined) {
          pointsRedeem = renewalRedeem;
          effectiveTotalAmount = renewalRedeem.amount_after;
        }
      }
    }
  }

  if (pointsRedeem === null) {
    pointsRedeem = {
      applied: false,
      points_used: 0,
      amount_before: totalAmount,
      amount_after: totalAmount,
      reason: "no_pending_renewal_or_no_discount"
    };
  } else {
    if (pointsRedeem.amount_before === undefined) pointsRedeem.amount_before = totalAmount;
    if (pointsRedeem.amount_after === undefined) pointsRedeem.amount_after = effectiveTotalAmount;
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getRenewalSummary",
    card_id: card.id,
    current_plan: currentPlan,
    target_plan: targetPlan,
    is_upgrade: isUpgrade,
    is_downgrade: isDowngrade,
    current_expires_at: sanitizeText_(card.expires_at),
    renewal_price: renewalPrice,
    upgrade_diff: upgradeDiff,
    downgrade_note: downgradeNote,
    keep_marquee: keepMarquee,
    keep_photo_extra_qty: keepPhotoExtraQty,
    keep_cta_extra_qty: keepCtaExtraQty,
    update_unlimited_current: updateUnlimitedCurrent,
    update_unlimited_renew: updateUnlimitedRenew,
    renewal_amount: renewalAmount,
    addon_amount: addonAmount,
    total_amount: effectiveTotalAmount,
    points_used: pointsRedeem.points_used,
    amount_before: pointsRedeem.amount_before,
    amount_after: pointsRedeem.amount_after,
    points_applied: pointsRedeem.applied
  };
}

function extractPointsRedeemFromPaymentOrRenewal_(payment, renewal) {
  var obj = payment || renewal;
  if (!obj) return null;
  var orderSummary = parseJsonSafe_(obj.order_summary_json, null);
  if (orderSummary && typeof orderSummary === "object") {
    if (orderSummary.applied !== undefined || orderSummary.points_used !== undefined) {
      return {
        applied: !!orderSummary.applied,
        points_used: toNumber_(orderSummary.points_used, 0),
        amount_before: toNumber_(orderSummary.amount_before, 0),
        amount_after: toNumber_(orderSummary.amount_after, 0),
        reason: "from_order_summary_json"
      };
    }
  }
  var note = sanitizeText_(obj.note);
  var m = note.match(/points_used=(\d+)/);
  if (m) {
    return {
      applied: true,
      points_used: Number(m[1]),
      amount_before: toNumber_(obj.total_amount || obj.amount, 0),
      amount_after: toNumber_(obj.total_amount || obj.amount, 0) - Number(m[1]),
      reason: "from_note"
    };
  }
  return null;
}

function isPointsOwnerSelfForCard_(pointsOwnerAgentId, card) {
  if (!pointsOwnerAgentId) return false;
  var cardOwnerAgentId = sanitizeText_(card.owner_agent_id || card.agent_id);
  if (cardOwnerAgentId && cardOwnerAgentId === pointsOwnerAgentId) return true;
  var renewalOwner = sanitizeText_(card.renewal_owner);
  if (renewalOwner && renewalOwner === pointsOwnerAgentId) return true;
  return false;
}

function buildDefaultRenewalPointsRedeem_(agentId, requestedPoints, originalTotal, reason) {
  return {
    agent_id: sanitizeText_(agentId),
    requested_points: Math.max(0, toNumber_(requestedPoints)),
    points_used: 0,
    amount_before: toNumber_(originalTotal),
    amount_after: toNumber_(originalTotal),
    applied: false,
    reason: sanitizeText_(reason)
  };
}

function resolveRenewalExistingPendingContext_(existingPendingPayment, originalTotal) {
  var context = {
    original_total: toNumber_(originalTotal),
    payment: existingPendingPayment || null,
    points_redeem: null,
    renewal: null
  };

  if (!existingPendingPayment) return context;

  if (!existingPendingPayment.__rowNum) {
    Logger.log("resolveRenewalExistingPendingContext_: payment missing __rowNum, payment_id=" + sanitizeText_(existingPendingPayment.payment_id));
  }

  var existingPendingAmount = toNumber_(existingPendingPayment.total_amount || existingPendingPayment.amount);
  if (existingPendingAmount > 0) {
    context.original_total = existingPendingAmount;
  }

  context.points_redeem = extractPointsRedeemFromPaymentOrRenewal_(existingPendingPayment, null);

  if ((!context.points_redeem || !context.points_redeem.applied) && sanitizeText_(existingPendingPayment.payment_id)) {
    var renewal = findRowByField_(CONFIG.SHEETS.RENEWAL || "renewal_db", "payment_id", sanitizeText_(existingPendingPayment.payment_id));
    if (renewal) {
      context.renewal = renewal;
      var renewalPointsRedeem = extractPointsRedeemFromPaymentOrRenewal_(null, renewal);
      if (renewalPointsRedeem) context.points_redeem = renewalPointsRedeem;
    }
  }

  return context;
}

function resolveRenewalPointsRedeem_(card, resolvedAgentId, requestedPoints, originalTotal, existingPendingContext) {
  var isSelf = isPointsOwnerSelfForCard_(resolvedAgentId, card);
  if (requestedPoints <= 0) {
    return buildDefaultRenewalPointsRedeem_(resolvedAgentId, 0, originalTotal, "no_points_requested");
  }
  if (!isSelf) {
    return buildDefaultRenewalPointsRedeem_(resolvedAgentId, requestedPoints, originalTotal, "points_can_only_be_used_for_self");
  }
  if (existingPendingContext && existingPendingContext.payment && existingPendingContext.points_redeem && existingPendingContext.points_redeem.applied) {
    return {
      agent_id: sanitizeText_(resolvedAgentId),
      requested_points: requestedPoints,
      points_used: toNumber_(existingPendingContext.points_redeem.points_used, 0),
      amount_before: toNumber_(existingPendingContext.points_redeem.amount_before, originalTotal),
      amount_after: toNumber_(existingPendingContext.points_redeem.amount_after, originalTotal),
      applied: true,
      reason: "reuse_existing_pending_points_redeem"
    };
  }
  return applyRenewalPointsRedemption_(card, null, { total_amount: originalTotal }, requestedPoints);
}

function buildRenewalSyncSnapshot_(card) {
  var paymentAgentSnapshot = getPaymentAgentSnapshot_(card);
  return {
    agent_id: paymentAgentSnapshot.agent_id,
    agent_type: paymentAgentSnapshot.agent_type,
    member_tier: paymentAgentSnapshot.member_tier,
    share_card_id: sanitizeText_(card.id)
 || sanitizeText_(card.share_card_id),
    share_agent_id: sanitizeText_(card.service_agent) || sanitizeText_(card.share_agent_id) || sanitizeText_(card.referrer),
    share_source: sanitizeText_(card.source) || sanitizeText_(card.share_source) || "renewal",
    share_channel: sanitizeText_(card.agent_type) || sanitizeText_(card.share_channel) || "service"
  };
}

function buildRenewalPendingRecord_(card, summary, tenant, paymentId, totalAmount, pointsRedeem, nowIso, dueAtIso) {
  var renewal = emptyRow_(CONFIG.SHEETS.RENEWAL || "renewal_db");
  renewal.renewal_id = makeRenewalId_();
  renewal.card_id = card.id;
  renewal.created_at = nowIso;
  renewal.updated_at = nowIso;
  renewal.tenant = tenant;
  renewal.status = "pending";
  renewal.current_plan = summary.current_plan;
  renewal.target_plan = summary.target_plan;
  renewal.is_upgrade = summary.is_upgrade ? "TRUE" : "FALSE";
  renewal.is_downgrade = summary.is_downgrade ? "TRUE" : "FALSE";
  renewal.current_expires_at = summary.current_expires_at;
  renewal.new_expires_at = "";
  renewal.renewal_price = String(summary.renewal_price);
  renewal.upgrade_diff = String(summary.upgrade_diff);
  renewal.downgrade_note = summary.downgrade_note;
  renewal.keep_marquee = summary.keep_marquee ? "TRUE" : "FALSE";
  renewal.keep_photo_extra_qty = String(summary.keep_photo_extra_qty);
  renewal.keep_cta_extra_qty = String(summary.keep_cta_extra_qty);
  renewal.update_unlimited_current = summary.update_unlimited_current ? "TRUE" : "FALSE";
  renewal.update_unlimited_renew = summary.update_unlimited_renew ? "TRUE" : "FALSE";
  renewal.renewal_amount = String(summary.renewal_amount);
  renewal.addon_amount = String(summary.addon_amount);
  renewal.total_amount = String(totalAmount);
  renewal.payment_id = sanitizeText_(paymentId);
  renewal.due_at = sanitizeText_(dueAtIso) || computeRenewalDueAtIso_(summary.current_expires_at, nowIso);
  renewal.paid_at = "";
  renewal.billing_status = "unpaid";
  renewal.renew_token = generateUpdateToken_();
  renewal.renew_token_created_at = nowIso;
  renewal.renew_token_expire = toIso_(addHours_(toDateSafe_(nowIso) || new Date(), CONFIG.UPDATE_TOKEN_EXPIRE_HOURS || 72));
  renewal.submitted_by = "";
  renewal.reminder_stage = "none";
  renewal.last_reminded_at = "";
  if (pointsRedeem.applied) {
    renewal.note = mergeNote_(renewal.note, "points_used=" + pointsRedeem.points_used);
    renewal.order_summary_json = JSON.stringify(pointsRedeem);
  } else if (pointsRedeem.reason) {
    renewal.note = mergeNote_(renewal.note, "points_redeem_skipped: " + pointsRedeem.reason);
  }
  return renewal;
}

function syncExistingPendingRenewalArtifacts_(existingPendingPayment, existingRenewal, card, summary, syncSnapshot, pointsRedeem, effectiveTotalAmount, tenant) {
  if (!existingPendingPayment || !existingPendingPayment.__rowNum) {
    Logger.log("syncExistingPendingRenewalArtifacts_: existingPendingPayment missing __rowNum, skip entire sync. payment_id=" + sanitizeText_((existingPendingPayment || {}).payment_id));
    return {
      rebuilt: false,
      need_fix: false,
      skipped: true,
      skip_reason: "payment_missing_rownum",
      payment: existingPendingPayment || null,
      renewal: existingRenewal || null
    };
  }

  var rebuilt = false;
  if (!existingRenewal) {
    var rebuildNowIso = toIso_(new Date());
    var rebuiltDueAtIso = sanitizeText_(existingPendingPayment.due_at) || computeRenewalDueAtIso_(summary.current_expires_at, rebuildNowIso);
    existingRenewal = buildRenewalPendingRecord_(card, summary, tenant, sanitizeText_(existingPendingPayment.payment_id), effectiveTotalAmount, pointsRedeem, rebuildNowIso, rebuiltDueAtIso);
    appendRowByName_(CONFIG.SHEETS.RENEWAL || "renewal_db", existingRenewal);
    existingRenewal = findRowByField_(CONFIG.SHEETS.RENEWAL || "renewal_db", "renewal_id", sanitizeText_(existingRenewal.renewal_id)) || existingRenewal;
    rebuilt = true;
  }

  var updatedPayment = shallowClone_(existingPendingPayment);
  var updatedRenewal = existingRenewal ? shallowClone_(existingRenewal) : null;
  var paymentChanged = false;
  var renewalChanged = false;

  function setPay(field, value) {
    value = sanitizeText_(value);
    if (sanitizeText_(updatedPayment[field]) !== value) {
      updatedPayment[field] = value;
      paymentChanged = true;
    }
  }

  setPay("agent_id", syncSnapshot.agent_id);
  setPay("agent_type", syncSnapshot.agent_type);
  setPay("member_tier", syncSnapshot.member_tier);
  setPay("share_card_id", syncSnapshot.share_card_id);
  setPay("share_agent_id", syncSnapshot.share_agent_id);
  setPay("share_source", syncSnapshot.share_source);
  setPay("share_channel", syncSnapshot.share_channel);

  var expectedDueAt = sanitizeText_(existingPendingPayment.due_at) || computeRenewalDueAtIso_(summary.current_expires_at, toIso_(new Date()));
  if (sanitizeText_(updatedPayment.due_at) !== expectedDueAt) {
    updatedPayment.due_at = expectedDueAt;
    paymentChanged = true;
  }

  if (updatedRenewal && sanitizeText_(updatedRenewal.due_at) !== expectedDueAt) {
    updatedRenewal.due_at = expectedDueAt;
    renewalChanged = true;
  }

  if (!sanitizeText_(updatedPayment.commission_status)) {
    updatedPayment.commission_status = "pending";
    paymentChanged = true;
  }
  if (!sanitizeText_(updatedPayment.card_status_before)) {
    updatedPayment.card_status_before = sanitizeText_(card.status);
    paymentChanged = true;
  }
  if (!sanitizeText_(updatedPayment.card_status_after)) {
    updatedPayment.card_status_after = sanitizeText_(card.status) || "active";
    paymentChanged = true;
  }

  var existingRedeem = parseJsonSafe_(updatedPayment.order_summary_json, null);
  var existingApplied = !!(existingRedeem && existingRedeem.applied);
  var existingPointsUsed = (existingRedeem && toNumber_(existingRedeem.points_used)) || 0;

  if (!existingApplied && existingPointsUsed === 0) {
    var noteMatch = (updatedPayment.note || "").match(/points_used=(\d+)/);
    if (noteMatch) {
      existingApplied = true;
      existingPointsUsed = Number(noteMatch[1]);
    }
  }

  var needFix = false;
  if (existingApplied && !pointsRedeem.applied) needFix = true;
  else if (!existingApplied && pointsRedeem.applied) needFix = true;
  else if (existingApplied && pointsRedeem.applied && existingPointsUsed !== pointsRedeem.points_used) needFix = true;
  else if (!existingApplied && !pointsRedeem.applied && Number(updatedPayment.total_amount) !== effectiveTotalAmount) needFix = true;

  if (needFix) {
    var newAmountStr = String(effectiveTotalAmount);

    if (sanitizeText_(updatedPayment.amount) !== newAmountStr) {
      updatedPayment.amount = newAmountStr;
      paymentChanged = true;
    }
    if (sanitizeText_(updatedPayment.total_amount) !== newAmountStr) {
      updatedPayment.total_amount = newAmountStr;
      paymentChanged = true;
    }

    var cleanNote = sanitizeText_(updatedPayment.note) || "";
    cleanNote = cleanNote.replace(/points_used=\d+/g, "").replace(/points_redeem_skipped:[^;]*;?/g, "").replace(/\s{2,}/g, " ").trim();
    if (pointsRedeem.applied) cleanNote = mergeNote_(cleanNote, "points_used=" + pointsRedeem.points_used);
    else if (pointsRedeem.reason) cleanNote = mergeNote_(cleanNote, "points_redeem_skipped: " + pointsRedeem.reason);
    if (sanitizeText_(updatedPayment.note) !== cleanNote) {
      updatedPayment.note = cleanNote;
      paymentChanged = true;
    }

    var newSummaryJson = JSON.stringify(pointsRedeem);
    if (sanitizeText_(updatedPayment.order_summary_json) !== newSummaryJson) {
      updatedPayment.order_summary_json = newSummaryJson;
      paymentChanged = true;
    }

    if (updatedRenewal) {
      if (sanitizeText_(updatedRenewal.total_amount) !== newAmountStr) {
        updatedRenewal.total_amount = newAmountStr;
        renewalChanged = true;
      }
      var cleanRenewalNote = sanitizeText_(updatedRenewal.note) || "";
      cleanRenewalNote = cleanRenewalNote.replace(/points_used=\d+/g, "").replace(/points_redeem_skipped:[^;]*;?/g, "").replace(/\s{2,}/g, " ").trim();
      if (pointsRedeem.applied) cleanRenewalNote = mergeNote_(cleanRenewalNote, "points_used=" + pointsRedeem.points_used);
      else if (pointsRedeem.reason) cleanRenewalNote = mergeNote_(cleanRenewalNote, "points_redeem_skipped: " + pointsRedeem.reason);
      if (sanitizeText_(updatedRenewal.note) !== cleanRenewalNote) {
        updatedRenewal.note = cleanRenewalNote;
        renewalChanged = true;
      }
      if (sanitizeText_(updatedRenewal.order_summary_json) !== newSummaryJson) {
        updatedRenewal.order_summary_json = newSummaryJson;
        renewalChanged = true;
      }
    }
  }

  if (paymentChanged) {
    updatedPayment.updated_at = toIso_(new Date());
    updateRowByName_(CONFIG.SHEETS.PAYMENT || "payment_db", updatedPayment.__rowNum, updatedPayment);
  }

  var renewal_write_skipped = false;
  var renewal_skip_reason = "";
  if (updatedRenewal && renewalChanged) {
    if (!updatedRenewal.__rowNum) {
      renewal_write_skipped = true;
      renewal_skip_reason = "renewal_missing_rownum";
      Logger.log("syncExistingPendingRenewalArtifacts_: renewal missing __rowNum, cannot write renewal update. renewal_id=" + sanitizeText_(updatedRenewal.renewal_id) + " ; changes will NOT be persisted.");
    } else {
      updatedRenewal.updated_at = toIso_(new Date());
      updateRowByName_(CONFIG.SHEETS.RENEWAL || "renewal_db", updatedRenewal.__rowNum, updatedRenewal);
    }
  }

  return {
    rebuilt: rebuilt,
    need_fix: needFix,
    skipped: false,
    skip_reason: "",
    renewal_write_skipped: renewal_write_skipped,
    renewal_skip_reason: renewal_skip_reason,
    payment: updatedPayment,
    renewal: updatedRenewal || null
  };
}

function buildRenewalPaymentRow_(card, summary, tenant, syncSnapshot, effectiveTotalAmount, pointsRedeem, req, nowIso, dueAtIso) {
  var payment
 = emptyRow_(CONFIG.SHEETS.PAYMENT || "payment_db");
  payment.payment_id = generatePaymentId_();
  payment.card_id = card.id;
  payment.lead_id = findLeadIdByCardId_(card.id);
  payment.created_at = nowIso;
  payment.updated_at = nowIso;
  payment.event_type = "renewal";
  payment.order_type = "renewal";
  payment.plan = summary.target_plan;
  payment.plan_code = summary.target_plan;
  payment.plan_name = summary.target_plan;
  payment.plan_amount = String(summary.renewal_amount);
  payment.addon_amount = String(summary.addon_amount);
  payment.total_amount = String(effectiveTotalAmount);
  payment.amount = String(effectiveTotalAmount);
  payment.status = "pending";
  payment.billing_status = "unpaid";
  payment.paid_at = "";
  payment.due_at = dueAtIso;
  payment.tenant = tenant;
  payment.currency = "TWD";
  payment.note = "renewal_order";
  payment.agent_id = syncSnapshot.agent_id;
  payment.agent_type = syncSnapshot.agent_type;
  payment.member_tier = syncSnapshot.member_tier;
  payment.share_card_id = syncSnapshot.share_card_id;
  payment.share_agent_id = syncSnapshot.share_agent_id;
  payment.share_source = syncSnapshot.share_source;
  payment.share_channel = syncSnapshot.share_channel;
  payment.commission_status = "pending";
  payment.card_status_before = sanitizeText_(card.status);
  payment.card_status_after = sanitizeText_(card.status) || "active";
  payment.operated_by = sanitizeText_(req.operated_by || req.operatedBy || "system");
  payment.risk_flag = "FALSE";
  payment.risk_reason = "";
  payment.review_status = "";
  payment.reviewed_at = "";
  payment.refund_at = "";
  payment.refund_reason = "";
  payment.commission_processed_at = "";
  payment.commission_reversed_at = "";
  if (pointsRedeem.applied) {
    payment.note = mergeNote_(payment.note, "points_used=" + pointsRedeem.points_used);
    payment.order_summary_json = JSON.stringify(pointsRedeem);
  } else if (pointsRedeem.reason) {
    payment.note = mergeNote_(payment.note, "points_redeem_skipped: " + pointsRedeem.reason);
  }
  return payment;
}

function createRenewalPayment_(req) {
  ensureSchemasOrThrow_([
    "card_db",
    "payment_db",
    "renewal_db",
    "agent_db",
    "agent_points_log"
  ]);

  req = req || {};
  var cardId = normalizeCardId_(req.card_id || req.id);
  if (!cardId) throw new Error("Missing card_id");

  var card = findRowByField_(CONFIG.SHEETS.CARD || "card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var eligibility = isCardEligibleForRenewal_(card);
  if (!eligibility.eligible) {
    throw new Error("CARD_NOT_ELIGIBLE_FOR_RENEWAL: " + eligibility.reason);
  }

  var tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  var summary = getRenewalSummary_(req);
  if (!summary || !summary.ok) throw new Error("RENEWAL_SUMMARY_FAILED");

  var requestedPoints = Math.max(0, parseInt(req.points_to_apply || req.pointsApply || req.use_points || 0, 10) || 0);
  var existingPendingContext = resolveRenewalExistingPendingContext_(findPendingRenewalPaymentByCardId_(card.id), summary.amount_before || summary.total_amount);
  var resolvedAgentId = resolvePointsOwnerAgentIdForCard_(card);
  var syncSnapshot = buildRenewalSyncSnapshot_(card);
  var pointsRedeem = resolveRenewalPointsRedeem_(card, resolvedAgentId, requestedPoints, existingPendingContext.original_total, existingPendingContext);
  var effectiveTotalAmount = pointsRedeem.applied ? pointsRedeem.amount_after : existingPendingContext.original_total;

  if (existingPendingContext.payment) {
    var synced = syncExistingPendingRenewalArtifacts_(
      existingPendingContext.payment,
      existingPendingContext.renewal,
      card,
      summary,
      syncSnapshot,
      pointsRedeem,
      effectiveTotalAmount,
      tenant
    );

    return {
      ok: true,
      version: HSC_VERSION,
      action: "createRenewalPayment",
      reused_existing_pending: true,
      rebuilt_missing_renewal: synced.rebuilt,
      message: "Existing unpaid renewal payment found" + (synced.need_fix ? " (fixed points redemption)" : ""),
      payment: synced.payment,
      renewal: synced.renewal,
      summary: {
        current_plan: sanitizeText_((synced.renewal || {}).current_plan || summary.current_plan),
        target_plan: sanitizeText_((synced.renewal || {}).target_plan || summary.target_plan),
        renewal_price: toNumber_((synced.renewal || {}).renewal_price || summary.renewal_price),
        upgrade_diff: toNumber_((synced.renewal || {}).upgrade_diff || summary.upgrade_diff),
        renewal_amount: toNumber_((synced.renewal || {}).renewal_amount || summary.renewal_amount),
        addon_amount: toNumber_((synced.renewal || {}).addon_amount || summary.addon_amount),
        total_amount: toNumber_((synced.renewal || {}).total_amount || synced.payment.total_amount || effectiveTotalAmount)
      },
      points_redeem: pointsRedeem
    };
  }

  var now = new Date();
  var nowIso = toIso_(now);
  var dueAtIso = toIso_(addDays_(now, CONFIG.PAYMENT_DUE_DAYS || 3));
  var payment = buildRenewalPaymentRow_(card, summary, tenant, syncSnapshot, effectiveTotalAmount, pointsRedeem, req, nowIso, dueAtIso);
  appendRowByName_(CONFIG.SHEETS.PAYMENT || "payment_db", payment);

  var renewal = buildRenewalPendingRecord_(card, summary, tenant, payment.payment_id, effectiveTotalAmount, pointsRedeem, nowIso, dueAtIso);
  appendRowByName_(CONFIG.SHEETS.RENEWAL || "renewal_db", renewal);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "createRenewalPayment",
    reused_existing_pending: false,
    rebuilt_missing_renewal: false,
    payment: payment,
    renewal: renewal,
    summary: summary,
    points_redeem: pointsRedeem
  };
}

/* =========================
   update / renew URLs
========================= */
function adminBuildUpdateFormUrl_(req) {
  var card = findRowByField_("card_db", "id", sanitizeText_(req.card_id || req.id));
  if (!card) throw new Error("Card not found");

  if (!sanitizeText_(card.update_token)) {
    var updated = shallowClone_(card);
    updated.update_token = generateUpdateToken_();
    updated.update_token_created_at = toIso_(new Date());
    updated.updated_at = updated.update_token_created_at;
    updateRowByName_("card_db", card.__rowNum, updated);
    card = updated;
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminBuildUpdateFormUrl",
    card_id: card.id,
    url: CONFIG.BASE_URL + "form.html?action=getCardForUpdate&update_token=" + encodeURIComponent(sanitizeText_(card.update_token))
  };
}

function adminBuildRenewFormUrl_(req) {
  var card = findRowByField_("card_db", "id", sanitizeText_(req.card_id || req.id));
  if (!card) throw new Error("Card not found");

  var access = ensureRenewalTokenRecordForCard_(card);
  var renewal = access.renewal;
  if (!renewal) throw new Error("Failed to prepare renewal access token");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminBuildRenewFormUrl",
    card_id: card.id,
    renewal_id: sanitizeText_(renewal.renewal_id),
    renew_token: sanitizeText_(renewal.renew_token),
    url: CONFIG.BASE_URL + "renew.html?action=getCardForRenewal&renew_token=" + encodeURIComponent(sanitizeText_(renewal.renew_token))
  };
}

/* =========================
   schema ensure（v7.3）
========================= */
function ensureRenewalDbSchema_() {
  return ensureSchemaHeaders_("renewal_db");
}

function ensurePricingDbSchema_() {
  return ensureSchemaHeaders_("pricing_db");
}

function ensureCommercialSchemasV73_() {
  ensureItemDbSchema_();
  ensurePaymentDbSchema_();
  ensureAddonOrderDbSchema_();
  ensureRenewalDbSchema_();
  ensurePricingDbSchema_();
  return {
    ok: true,
    version: HSC_VERSION,
    action: "ensureCommercialSchemasV73"
  };
}

function autoPromoteAgentTierByPoints_(agentId, now) {
  var id = sanitizeText_(agentId);
  if (!id) return null;
  var agent = findRowByField_("agent_db", "agent_id", id);
  if (!agent) return null;

  var currentType = sanitizeText_(agent.agent_type || agent.member_tier).toLowerCase() || "customer";
  var lifetimePoints = roundMoney_(toNumber_(agent.points_lifetime));
  if (currentType !== "customer") return agent;
  if (lifetimePoints < 5) return agent;

  var updated = shallowClone_(agent);
  updated.agent_type = "referral";
  updated.member_tier = mapAgentTypeToTier_("referral");
  updated.tier_upgrade_eligible = "TRUE";
  updated.eligible_for_upgrade = "TRUE";
  if (!sanitizeText_(updated.upgrade_eligible_at)) updated.upgrade_eligible_at = toIso_(now || new Date());
  updated.note = appendNote_(sanitizeText_(updated.note), "auto_promoted_to_referral");
  updated.updated_at = toIso_(now || new Date());
  updateRowByName_("agent_db", agent.__rowNum, updated);

  appendAgentPolicyLog_({
    agent_id: id,
    created_at: toIso_(now || new Date()),
    action_type: "auto_tier_upgrade",
    old_value: currentType,
    new_value: "referral",
    reason: "points_lifetime>=5",
    created_by: "system",
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
  });

  return updated;
}

/************************************************
* v7.6 新增函式區
************************************************/

function parseOrderItems_(payment, paymentNote) {
  var items = [];
  var note = sanitizeText_(paymentNote || payment.note);
  var totalAmount = roundMoney_(toNumber_(payment.amount));
  var planCode = sanitizeText_(payment.plan_code || payment.plan);
  var planAmount = roundMoney_(toNumber_(payment.plan_amount));
  var addonAmount = roundMoney_(toNumber_(payment.addon_amount));

  if (planAmount > 0 && planCode) {
    items.push({
      item_key: "plan",
      target_type: "card_plan",
      amount: planAmount,
      plan: planCode,
      order_type: payment.order_type,
      event_type: payment.event_type
    });
  }

  if (addonAmount > 0) {
    var addonMatches = note.match(/addon=([^;]+)/g)
 || [];
    if (addonMatches.length) {
      addonMatches.forEach(function(match) {
        var parts = match.split(":");
        var code = sanitizeText_(parts[0]).replace("addon=", "");
        var qty = parts[1] ? Number(parts[1]) : 1;
        var amt = parts[2] ? roundMoney_(Number(parts[2])) : 0;
        if (amt > 0) {
          items.push({
            item_key: code,
            target_type: mapAddonType_(code),
            amount: amt,
            qty: qty,
            plan: "both",
            order_type: "addon",
            event_type: "addon_payment"
          });
        }
      });
    } else {
      items.push({
        item_key: "addon_other",
        target_type: "addon_order",
        amount: addonAmount,
        plan: "both",
        order_type: "addon",
        event_type: "addon_payment"
      });
    }
  }

  if (!items.length && totalAmount > 0) {
    items.push({
      item_key: "plan",
      target_type: "card_plan",
      amount: totalAmount,
      plan: planCode,
      order_type: payment.order_type,
      event_type: payment.event_type
    });
  }

  return items;
}

function mapAddonType_(addonCode) {
  var code = normalizeAddonItemCode_(addonCode);
  switch (code) {
    case "addon_photo": return "extra_photo";
    case "addon_cta": return "extra_cta";
    case "addon_marquee": return "marquee";
    case "addon_update_unlimited": return "update_unlimited";
    case "addon_agent_upgrade": return "agent_upgrade_fee";
    default: return "addon_order";
  }
}

function addPoints_(agentId, points, refId, note, operator) {
  return changeAgentPointsBalanceInternal_({
    agent_id: agentId,
    points: points,
    bucket: "balance",
    type: "earn",
    ref_id: refId,
    note: note,
    operator: operator
  });
}

function checkUpgradeToReferral_(agentId, refId) {
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) return null;
  if (sanitizeText_(agent.agent_type) === "referral") return agent;
  var lifetimePoints = roundMoney_(toNumber_(agent.points_lifetime));
  if (lifetimePoints >= 5) {
    var updated = shallowClone_(agent);
    updated.agent_type = "referral";
    updated.member_tier = mapAgentTypeToTier_("referral");
    updated.tier_upgrade_eligible = "TRUE";
    updated.eligible_for_upgrade = "TRUE";
    updated.upgrade_status = "auto_upgraded_to_referral";
    if (!sanitizeText_(updated.upgrade_eligible_at)) updated.upgrade_eligible_at = nowIso_();
    updated.updated_at = nowIso_();
    updateRowByName_("agent_db", agent.__rowNum, updated);
    appendAgentPolicyLog_({
      agent_id: agentId,
      action_type: "auto_tier_upgrade",
      old_value: "customer",
      new_value: "referral",
      reason: "points_lifetime>=5",
      created_by: "system",
      tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
    });
    return updated;
  }
  return agent;
}

function checkEligibleForPartner_(agentId, refId) {
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) return null;
  if (sanitizeText_(agent.agent_type) !== "referral") return agent;
  var lifetimePoints = roundMoney_(toNumber_(agent.points_lifetime));
  if (lifetimePoints >= 10000 && sanitizeText_(agent.eligible_for_upgrade) !== "TRUE") {
    var updated = shallowClone_(agent);
    updated.eligible_for_upgrade = "TRUE";
    updated.tier_upgrade_eligible = "TRUE";
    updated.upgrade_status = "eligible_for_partner";
    if (!sanitizeText_(updated.upgrade_eligible_at)) updated.upgrade_eligible_at = nowIso_();
    updated.updated_at = nowIso_();
    updateRowByName_("agent_db", agent.__rowNum, updated);
    appendAgentPolicyLog_({
      agent_id: agentId,
      action_type: "eligible_for_partner",
      old_value: "FALSE",
      new_value: "TRUE",
      reason: "points_lifetime>=10000",
      created_by: "system",
      tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
    });
    return updated;
  }
  return agent;
}

function handleAgentUpgrade_(payment) {
  var addonSummary = sanitizeText_(payment.addon_summary);
  if (addonSummary.indexOf("agent_upgrade_fee") === -1) return null;
  var card = findRowByField_("card_db", "id", sanitizeText_(payment.card_id));
  if (!card) return null;
  var agentId = resolvePointsOwnerAgentIdForCard_(card);
  if (!agentId) return null;
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) return null;
  if (sanitizeText_(agent.agent_type) !== "referral" || sanitizeText_(agent.eligible_for_upgrade) !== "TRUE") return null;
  var updated = shallowClone_(agent);
  updated.agent_type = "partner";
  updated.member_tier = mapAgentTypeToTier_("partner");
  updated.partner_status = "active";
  updated.upgrade_status = "upgraded_to_partner";
  updated.partner_qualified_at = sanitizeText_(updated.partner_qualified_at) || nowIso_();
  updated.eligible_for_upgrade = "FALSE";
  updated.tier_upgrade_eligible = "FALSE";
  updated.updated_at = nowIso_();
  updateRowByName_("agent_db", agent.__rowNum, updated);
  appendAgentPolicyLog_({
    agent_id: agentId,
    action_type: "upgrade_to_partner",
    old_value: "referral",
    new_value: "partner",
    reason: "agent_upgrade_fee_paid",
    created_by: "system",
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
  });
  return updated;
}

function buildDeliveryCardGuidance_(card) {
  var agentId = resolvePointsOwnerAgentIdForCard_(card);
  var agent = agentId ? findRowByField_("agent_db", "agent_id", agentId) : null;
  var points = agent ? roundMoney_(toNumber_(agent.points_balance)) : 0;
  var lifetimePoints = agent ? roundMoney_(toNumber_(agent.points_lifetime)) : 0;
  var memberTier = agent ? sanitizeText_(agent.member_tier) : (sanitizeText_(card.owner_agent_type) || "customer");
  var eligibleForPartner = agent && sanitizeText_(agent.eligible_for_upgrade) === "TRUE";
  var isPartner = memberTier === "partner";

  var guidance = {
    member_tier: memberTier,
    points_balance: points,
    points_lifetime: lifetimePoints,
    upgrade_hint: "",
    points_rule:  "銅牌會員每推薦 1 位客戶成交可得 1 點，不含本人自購；累積 5 點自動升級為銀牌會員。1 點可折抵 1 元，適用於續約、加購或升級合作代理。",
    commission_rule: "銀牌與金牌會員依方案、續約、加購與更新項目，享有不同分潤比例；本人自購不發放任何分潤。",
    upgrade_rule: "",
    remaining_points_to_next_tier: 0
  };

  if (memberTier === "customer") {
    var need = 5 - lifetimePoints;
    guidance.upgrade_rule = "累積 5 點即可升級為推薦代理（銀牌）。";
    guidance.remaining_points_to_next_tier = need > 0 ? need : 0;
    if (lifetimePoints >= 5) {
      guidance.upgrade_hint = "恭喜！你已累積 " + lifetimePoints + " 點，符合升級資格，請聯繫客服協助升級。";
    } else {
      guidance.upgrade_hint = "再獲得 " + need + " 點，即可升級為推薦代理（銀牌）。";
    }
  } else if (memberTier === "referral") {
    var needPartner = 10000 - lifetimePoints;
    guidance.upgrade_rule = "累積 10000 點可取得合作代理（金牌）資格，購買合作代理權金完成付款後即可升金牌。";
    guidance.remaining_points_to_next_tier = needPartner > 0 ? needPartner : 0;
    if (eligibleForPartner) {
      guidance.upgrade_hint = "你已累積 " + lifetimePoints + " 點，符合金牌資格！請購買合作代理權金完成升級。";
    } else {
      guidance.upgrade_hint = "再獲得 " + needPartner + " 點，即可取得金牌資格。";
    }
  } else if (memberTier === "partner") {
    guidance.upgrade_rule = "你已是合作代理（金牌），可享現金分潤。";
    guidance.upgrade_hint = "感謝你的支持，繼續推薦客戶可獲得更多分潤。";
  }

  return guidance;
}

function buildAgentIdentityBlock_(card) {
  var agentId = resolvePointsOwnerAgentIdForCard_(card);
  var agent = agentId ? findRowByField_("agent_db", "agent_id", agentId) : null;
  var memberTier = agent ? sanitizeText_(agent.member_tier) : (sanitizeText_(card.owner_agent_type) || "customer");
  var display = "";
  if (memberTier === "customer") display = "銅牌會員";
  else if (memberTier === "referral") display = "銀牌會員（推薦代理）";
  else if (memberTier === "partner") display = "金牌會員（合作代理）";
  else display = "一般客戶";
  return { member_tier: memberTier, display: display };
}

function buildCustomerUpgradeBlock_(card) {
  var agentId = resolvePointsOwnerAgentIdForCard_(card);
  var agent = agentId ? findRowByField_("agent_db", "agent_id", agentId) : null;
  var lifetimePoints = agent ? roundMoney_(toNumber_(agent.points_lifetime)) : 0;
  if (lifetimePoints >= 5) {
    return { eligible: true, message: "您已符合升級銀牌資格，請聯繫客服升級。" };
  }
  var need = 5 - lifetimePoints;
  return { eligible: false, message: "再獲得 " + need + " 點即可升級銀牌。" };
}

function buildReferralUpgradeBlock_(card) {
  var agentId = resolvePointsOwnerAgentIdForCard_(card);
  var agent = agentId ? findRowByField_("agent_db", "agent_id", agentId) : null;
  if (!agent || sanitizeText_(agent.agent_type) !== "referral") return { eligible: false, message: "非推薦代理，無升級金牌資格。" };
  var lifetimePoints = roundMoney_(toNumber_(agent.points_lifetime));
  if (lifetimePoints >= 10000 && sanitizeText_(agent.eligible_for_upgrade) === "TRUE") {
    return { eligible: true, message: "您已符合金牌資格，請購買合作代理權金完成升級。" };
  }
  var need = 10000 - lifetimePoints;
  return { eligible: false, message: "再獲得 " + need + " 點即可取得金牌資格。" };
}

function buildPartnerBenefitBlock_() {
  return {
    benefit: "金牌會員可享現金分潤，分潤比例依訂單類型不同，最高 20%。",
    upgrade_fee: getAgentUpgradeFeePrice_(CONFIG.DEFAULT_TENANT)
  };
}

function buildPointsRuleBlock_() {
  return {
    earn_rate: "每推薦一位客戶完成開卡可獲得 5 點。",
    redeem_rate: "1 點 = 1 元，可折抵續約、加購或升級合作代理權金。",
    expiry: "點數有效期限與卡片效期相同。"
  };
}

function buildCommissionRuleBlock_() {
  return {
    referral: "推薦代理（銀牌）可獲得訂單金額 10% 的點數回饋。",
    partner: "合作代理（金牌）可獲得訂單金額 10% 的現金分潤。",
    self_consumption: "自用卡不分潤。"
  };
}

function getAgentById_(agentId) {
  return findRowByField_("agent_db", "agent_id", sanitizeText_(agentId));
}

function updateAgentType_(agentId, newType, reason, operator) {
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) throw new Error("Agent not found");
  var oldType = sanitizeText_(agent.agent_type);
  var normalizedNew = normalizeAgentTypeForSheet_(newType);
  if (oldType === normalizedNew) return
 agent;
  var updated = shallowClone_(agent);
  updated.agent_type = normalizedNew;
  updated.member_tier = mapAgentTypeToTier_(normalizedNew);
  if (normalizedNew === "partner") updated.partner_status = "active";
  updated.updated_at = nowIso_();
  updateRowByName_("agent_db", agent.__rowNum, updated);
  appendAgentPolicyLog_({
    agent_id: agentId,
    action_type: "admin_update_agent_type",
    old_value: oldType,
    new_value: normalizedNew,
    reason: reason,
    created_by: operator,
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
  });
  return updated;
}

function updateAgentFields_(agentId, fields, reason, operator) {
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) throw new Error("Agent not found");
  var updated = shallowClone_(agent);
  var changes = [];
  for (var key in fields) {
    var oldVal = sanitizeText_(agent[key]);
    var newVal = sanitizeText_(fields[key]);
    if (oldVal !== newVal) {
      updated[key] = newVal;
      changes.push({ field: key, old: oldVal, new: newVal });
    }
  }
  if (!changes.length) return agent;
  updated.updated_at = nowIso_();
  updateRowByName_("agent_db", agent.__rowNum, updated);
  changes.forEach(function(change) {
    appendAgentPolicyLog_({
      agent_id: agentId,
      action_type: "admin_update_agent_field:" + change.field,
      old_value: change.old,
      new_value: change.new,
      reason: reason,
      created_by: operator,
      tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
    });
  });
  return updated;
}

function insertAgentPolicyLog_(data) {
  return appendAgentPolicyLog_(data);
}

function insertPointsLog_(data) {
  return appendAgentPointsLog_(data);
}

function updateAgentPoints_(agentId, pointsDelta, refId, note, operator) {
  return changeAgentPointsBalanceInternal_({
    agent_id: agentId,
    points: pointsDelta,
    bucket: "balance",
    type: "system_adjust",
    ref_id: refId,
    note: note,
    operator: operator
  });
}

function markPaymentCommissionSkipped_(paymentId, reason, operator) {
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found");
  var updated = shallowClone_(payment);
  updated.commission_status = "skipped";
  updated.commission_processed_at = nowIso_();
  updated.note = mergeNote_(updated.note, "commission_skipped:" + reason + ";by:" + operator);
  updated.updated_at = nowIso_();
  updateRowByName_("payment_db", payment.__rowNum, updated);
  return updated;
}

function insertCommission_(commissionData) {
  var row = emptyRow_("commission_db");
  for (var k in commissionData) row[k] = commissionData[k];
  row.commission_id = row.commission_id || generateCommissionId_();
  row.created_at = row.created_at || nowIso_();
  row.updated_at = row.updated_at || row.created_at;
  appendRowByName_("commission_db", row);
  return row;
}

function matchCommissionRule_(payment, item) {
  return selectBestCommissionRule_(payment, item);
}

function calcCommission_(rule, baseAmount, item) {
  var commissionMode = sanitizeText_(rule.commission_mode).toLowerCase();
  var commissionValue = toNumber_(rule.commission_value);
  var bonusMode = sanitizeText_(rule.bonus_mode).toLowerCase();
  var bonusValue = toNumber_(rule.bonus_value);
  var rewardAmount = 0;
  var rewardPoints = 0;
  if (commissionMode === "percent" && commissionValue > 0) {
    rewardAmount = roundMoney_(baseAmount * commissionValue / 100);
  } else if (commissionMode === "fixed" && commissionValue > 0) {
    rewardAmount = roundMoney_(commissionValue);
  }
  if (bonusMode === "points" && bonusValue > 0) {
    rewardPoints = roundMoney_(bonusValue);
  } else if (bonusMode === "percent_points" && bonusValue > 0) {
    rewardPoints = roundMoney_(baseAmount * bonusValue / 100);
  }
  return { rewardAmount: rewardAmount, rewardPoints: rewardPoints };
}

function syncAgentTierStatusFields_(agent, now) {
  return syncAgentUpgradeFields_(agent, now);
}

function resolveAddOnPrice_(code, options) {
  var tenant = options.tenant || CONFIG.DEFAULT_TENANT;
  var fallback = Number(options.price || options.unit_price || options.unitPrice || 0);
  if (fallback > 0) return fallback;
  var codeNorm = normalizeAddonItemCode_(code);
  return getPricingValue_(codeNorm, 100, tenant);
}

function getYearBucket_() {
  var now = new Date();
  var year = now.getFullYear();
  return year + "-" + (year + 1);
}

function getCurrentYearUpdateCount_(cardId) {
  var bucket = getYearBucket_();
  var rows = getSheetRowsByName_("update_log_db").filter(function(row) {
    return sanitizeText_(row.card_id) === cardId && sanitizeText_(row.year_bucket) === bucket;
  });
  return rows.length;
}

function getLatestPaidUpdateFeePayment_(cardId) {
  var payments = getSheetRowsByName_("payment_db").filter(function(row) {
    return sanitizeText_(row.card_id) === cardId && sanitizeText_(row.event_type) === "update_fee" && sanitizeText_(row.status) === "paid";
  });
  if (!payments.length) return null;
  payments.sort(function(a, b) { return sanitizeText_(b.paid_at).localeCompare(sanitizeText_(a.paid_at)); });
  return payments[0];
}

function closePaidUpdateFeePayment_(cardId, now) {
  var payments = getSheetRowsByName_("payment_db").filter(function(row) {
    return sanitizeText_(row.card_id) === cardId && sanitizeText_(row.event_type) === "update_fee" && sanitizeText_(row.status) === "pending";
  });
  payments.forEach(function(payment) {
    var updated = shallowClone_(payment);
    updated.status = "closed";
    updated.updated_at = toIso_(now);
    updateRowByName_("payment_db", payment.__rowNum, updated);
  });
  invalidateCacheOnWrite_("payment_db");
}

function resolveEffectivePeriodKey_(card) {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  return year + "-" + month;
}

function splitCsv_(value) {
  var s = sanitizeText_(value);
  if (!s) return [];
  return s.split(",").map(function(v) { return v.trim(); }).filter(Boolean);
}

function isActiveStatus_(status) {
  return sanitizeText_(status).toLowerCase() === "active";
}

function toBooleanString_(value) {
  return toBoolean_(value) ? "TRUE" : "FALSE";
}

function validatePlanRowForSave_(plan) {
  var price = toNumber_(plan.price);
  if (price < 0) throw new Error("Price cannot be negative");
  var renewalPrice = toNumber_(plan.renewal_price);
  if (renewalPrice < 0) throw new Error("Renewal price cannot be negative");
  var ctaLimit = toNumber_(plan.cta_limit);
  if (ctaLimit < 0) throw new Error("cta_limit cannot be negative");
  var photoLimitDefault = toNumber_(plan.photo_limit_default);
  if (photoLimitDefault < 0) throw new Error("photo_limit_default cannot be negative");
  var photoLimitMax = toNumber_(plan.photo_limit_max);
  if (photoLimitMax < photoLimitDefault) throw new Error("photo_limit_max must be >= photo_limit_default");
  var freeUpdateLimitYearly = toNumber_(plan.free_update_limit_yearly);
  if (freeUpdateLimitYearly < 0) throw new Error("free_update_limit_yearly cannot be negative");
  var extraUpdateFee = toNumber_(plan.extra_update_fee);
  if (extraUpdateFee < 0) throw new Error("extra_update_fee cannot be negative");
}

function validateCardAgainstPlan_(card, plan) {
  var photoLimit = toNumber_(card.photo_limit);
  if (photoLimit > PHOTO_LIMIT_ABSOLUTE_MAX) throw new Error("photo_limit exceeds absolute max");

  var ctaLimit = toNumber_(card.cta_limit);
  var maxCta = toNumber_(plan.cta_limit);
  if (ctaLimit > maxCta) throw new Error("cta_limit exceeds plan limit");
}

function normalizeUpdateCardReqFields_(req) {
  var out = {};
  var fields = [
    "name","unit","title","slogan","services","experience",
    "wechat_id","line_url","line_oa","email","phone","address","website",
    "video1","video2","video3","social1","social2","social3",
    "avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url",
    "photo6_url","photo7_url","photo8_url","photo9_url","photo10_url",
    "avatar_key","logo_key","photo1_key","photo2_key","photo3_key","photo4_key","photo5_key",
    "photo6_key","photo7_key","photo8_key","photo9_key","photo10_key",
    "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3",
    "features_json","color","style","paper","plan"
  ];
  fields.forEach(function(f) {
    if (req[f] !== undefined) out[f] = req[f];
  });
  return out;
}

function resolveUpdateAllowedFields_(card, plan) {
  var allowed = [
    "name","unit","title","slogan","services","experience",
    "wechat_id","line_url","line_oa","email","phone","address","website",
    "video1","video2","video3","social1","social2","social3",
    "avatar_url","logo_url",
    "photo1_url","photo2_url","photo3_url","photo4_url","photo5_url",
    "photo6_url","photo7_url","photo8_url","photo9_url","photo10_url",
    "avatar_key","logo_key","photo1_key","photo2_key","photo3_key","photo4_key","photo5_key",
    "photo6_key","photo7_key","photo8_key","photo9_key","photo10_key",
    "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3",
    "features_json"
  ];
  if (card.plan === "premium") {
    allowed.push("color");
  } else {
    allowed.push("color","style","paper");
  }
  return allowed;
}

function shouldApplyUpdateValue_(field, value) {
  var s = sanitizeText_(value);
  if (field === "features_json") return s !== "" && s !== "{}";
  return s !== "";
}

function normalizeUpdateValue_(field, value) {
  var s = sanitizeText_(value);
  if (field === "features_json") {
    if (s === "" || s === "{}") return "{}";
    try {
      JSON.parse(s);
      return s;
    } catch (e) {
      return "{}";
    }
  }
  return s;
}

function incrementInviteUsage_(inviteCode, usedById) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    throw new Error("系統忙碌，無法更新邀請碼使用次數，請稍後再試。");

  }

  try {
    clearSheetRowCache_("invite_db");
    var invite = findInviteByCode_(inviteCode);
    if (!invite) throw new Error("Invite not found");

    var usedCount = toNumber_(invite.used_count);
    var maxUse = toNumber_(invite.max_use);

    if (maxUse > 0 && usedCount >= maxUse) {
      throw new Error("Invite usage limit reached");
    }

    var updated = shallowClone_(invite);
    updated.used_count = String(usedCount + 1);
    if (maxUse > 0 && usedCount + 1 >= maxUse) updated.status = "used";
    updated.used_at = toIso_(new Date());
    updated.used_by_id = sanitizeText_(usedById);
    updated.updated_at = toIso_(new Date());

    updateRowByName_("invite_db", invite.__rowNum, updated);
    return updated;

  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      Logger.log("incrementInviteUsage_ lock release failed: " + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
    }
  }
}

function buildFormUrl_(inviteCode) {
  var url = CONFIG.BASE_URL + "form.html?invite=" + encodeURIComponent(inviteCode);
  return url;
}

function generateRequestId_() {
  return "RQ" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);
}

function generateAnnouncementId_() {
  return "AN" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);
}

function generateServiceLogId_() {
  return "SL" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);
}

function appendAgentPolicyLog_(data) {
  data = data || {};
  var row = emptyRow_("agent_policy_log");
  row.log_id = "APL" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") + generateRandomCode_(4);
  row.agent_id = sanitizeText_(data.agent_id);
  row.card_id = sanitizeText_(data.card_id);
  row.created_at = sanitizeText_(data.created_at) || nowIso_();
  row.action_type = sanitizeText_(data.action_type || data.action);
  row.old_value = sanitizeText_(data.old_value || data.before_value);
  row.new_value = sanitizeText_(data.new_value || data.after_value);
  row.reason = sanitizeText_(data.reason);
  row.created_by = sanitizeText_(data.created_by || data.operator);
  row.tenant = sanitizeText_(data.tenant) || CONFIG.DEFAULT_TENANT;
  appendRowByName_("agent_policy_log", row);
  return row;
}

function resolveRenewalAmount_(plan) {
  return toNumber_(plan.renewal_price, 0);
}

function findLatestRenewalByCardId_(cardId) {
  var id = sanitizeText_(cardId);
  if (!id) return null;
  var renewals = getSheetRowsByName_("renewal_db").filter(function(row) {
    return sanitizeText_(row.card_id) === id;
  }).sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });
  return renewals.length ? renewals[0] : null;
}

function findRenewalByToken_(renewToken) {
  return findRowByField_("renewal_db", "renew_token", sanitizeText_(renewToken));
}

function ensureRenewalTokenRecordForCard_(card, existingRenewal) {
  if (!card) throw new Error("Card not found");

  var renewal = existingRenewal || findLatestRenewalByCardId_(card.id);
  var now = new Date();
  var nowIso = toIso_(now);

  if (!renewal) {
    renewal = emptyRow_("renewal_db");
    renewal.renewal_id = makeRenewalId_();
    renewal.card_id = sanitizeText_(card.id);
    renewal.created_at = nowIso;
    renewal.updated_at = nowIso;
    renewal.tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
    renewal.status = "draft";
    renewal.current_plan = normalizePlanValue_(card.plan);
    renewal.target_plan = normalizePlanValue_(card.plan);
    renewal.is_upgrade = "FALSE";
    renewal.is_downgrade = "FALSE";
    renewal.current_expires_at = sanitizeText_(card.expires_at);
    renewal.new_expires_at = "";
    renewal.renewal_price = "0";
    renewal.upgrade_diff = "0";
    renewal.downgrade_note = "";
    renewal.keep_marquee = toBooleanString_(card.marquee_purchased);
    renewal.keep_photo_extra_qty = String(Math.max(0, toNumber_(card.photo_extra_purchased)));
    renewal.keep_cta_extra_qty = String(Math.max(0, toNumber_(card.cta_extra_purchased)));
    renewal.update_unlimited_current = toBooleanString_(sanitizeText_(card.update_limit_override_value) === "-1");
    renewal.update_unlimited_renew = renewal.update_unlimited_current;
    renewal.renewal_amount = "0";
    renewal.addon_amount = "0";
    renewal.total_amount = "0";
    renewal.payment_id = "";
    renewal.due_at = computeRenewalDueAtIso_(sanitizeText_(card.expires_at), nowIso);
    renewal.paid_at = "";
    renewal.billing_status = sanitizeText_(card.billing_status) || "unpaid";
    renewal.reminder_stage = "none";
    renewal.last_reminded_at = "";
    renewal.note = "auto_created_for_renewal_access";
    renewal.is_test = sanitizeText_(card.is_test) || "FALSE";
    renewal.order_summary_json = "";
    renewal.renew_token = generateUpdateToken_();
    renewal.renew_token_created_at = nowIso;
    renewal.renew_token_expire = toIso_(addHours_(now, CONFIG.UPDATE_TOKEN_EXPIRE_HOURS || 72));
    renewal.submitted_by = "";
    appendRowByName_("renewal_db", renewal);
    renewal = findRowByField_("renewal_db", "renewal_id", sanitizeText_(renewal.renewal_id)) || renewal;
    return { created: true, updated: false, renewal: renewal };
  }

  var changed = false;
  var updated = shallowClone_(renewal);

  if (!sanitizeText_(updated.renew_token)) {
    updated.renew_token = generateUpdateToken_();
    changed = true;
  }
  if (!sanitizeText_(updated.renew_token_created_at)) {
    updated.renew_token_created_at = nowIso;
    changed = true;
  }
  if (!sanitizeText_(updated.renew_token_expire)) {
    updated.renew_token_expire = toIso_(addHours_(now, CONFIG.UPDATE_TOKEN_EXPIRE_HOURS || 72));
    changed = true;
  }

  if (changed && updated.__rowNum) {
    updated.updated_at = nowIso;
    updateRowByName_("renewal_db", updated.__rowNum, updated);
    renewal = updated;
  }

  return { created: false, updated: changed, renewal: renewal };
}

function findCardByRenewToken_(renewToken) {
  var renewal = findRenewalByToken_(renewToken);
  if (!renewal) return null;
  return findRowByField_("card_db", "id", sanitizeText_(renewal.card_id));
}

function adminGetRenewalByCardId_(req) {
  requireAdminKey_(req);
  var cardId = normalizeCardId_(req.card_id || req.id);
  if (!cardId) throw new Error("Missing card_id");
  var renewals = getSheetRowsByName_("renewal_db").filter(function(r) {
    return sanitizeText_(r.card_id) === cardId;
  }).sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });
  return { ok: true, version: HSC_VERSION, action: "adminGetRenewalByCardId", card_id: cardId, renewals: renewals };
}

function adminGetRenewalDetail_(req) {
  requireAdminKey_(req);
  var renewalId = sanitizeText_(req.renewal_id || req.renewalId);
  if (!renewalId) throw new Error("Missing renewal_id");
  var renewal = findRowByField_("renewal_db", "renewal_id", renewalId);
  if (!renewal) throw new Error("Renewal not found");
  var payment = renewal.payment_id ? findRowByField_("payment_db", "payment_id", renewal.payment_id) : null;
  var card = renewal.card_id ? findRowByField_("card_db", "id", renewal.card_id) : null;
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminGetRenewalDetail",
    renewal: renewal,
    payment: payment,
    card: card
  };
}

/**
 * 確保 agent 存在（優化版 - 加入快取支援）
 * 如果找不到 agent，會自動建立
 */
function ensureAgentExists_(agentId, context) {
  var id = sanitizeText_(agentId);
  if (!id) return null;
  
  // === 新增：使用快取加速 ===
  var cacheKey = "agent_exists_" + id;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached === "exists") {
    // 快取命中，快速返回（但還是要確認 agent 真的存在，避免快取不一致）
    var quickCheck = findRowByField_("agent_db", "agent_id", id);
    if (quickCheck) return quickCheck;
    // 快取失效，繼續正常流程
    cache.remove(cacheKey);
  }
  // =========================

  var existing = findRowByField_("agent_db", "agent_id", id);
  if (existing) {
    // 將結果存入快取
    try {
      cache.put(cacheKey, "exists", 300);
    } catch(e) {}
    return existing;
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (e) {
    Logger.log("ensureAgentExists_ lock timeout for: " + id + " ; error=" + (e && e.message ? e.message : e));
    var retry = findRowByField_("agent_db", "agent_id", id);
    if (retry) {
      try { cache.put(cacheKey, "exists", 300); } catch(e) {}
      return retry;
    }
    return null;
  }

  try {
    existing = findRowByField_("agent_db", "agent_id", id);
    if (existing) {
      try { cache.put(cacheKey, "exists", 300); } catch(e) {}
      return existing;
    }

    var now = new Date();
    var nowIso = toIso_(now);
    var tenant = sanitizeText_(context && context.tenant) || CONFIG.DEFAULT_TENANT;
    var source = sanitizeText_(context && context.source) || "auto_ensure";
    var note = sanitizeText_(context && context.note) || "auto_created_by_ensureAgentExists";

    var card = (context && context.card) || null;
    var lead = (context && context.lead) || null;

    var rawAgentType = AGENT_ROLE_DEFAULT;
    var ownerName = "";
    var ownerEmail = "";
    var ownerPhone = "";
    var referrerAgentId = "";

    if (card) {
      if (sanitizeText_(card.owner_agent_type)) rawAgentType = card.owner_agent_type;
      else if (sanitizeText_(card.agent_type)) rawAgentType = card.agent_type;
      ownerName = sanitizeText_(card.name);
      ownerEmail = sanitizeText_(card.owner_email || card.email);
      ownerPhone = sanitizePhoneAsText_(card.owner_phone || card.phone);
      referrerAgentId = sanitizeText_(card.referrer);
    } else if (lead) {
      if (sanitizeText_(lead.agent_type)) rawAgentType = lead.agent_type;
      ownerName
 = sanitizeText_(lead.name);
      ownerEmail = sanitizeText_(lead.email);
      ownerPhone = sanitizePhoneAsText_(lead.phone);
      referrerAgentId = sanitizeText_(lead.referrer);
    }

    var agentType = normalizeAgentTypeForSheet_(rawAgentType);
    if (referrerAgentId === id) referrerAgentId = "";

    var row = emptyRow_("agent_db");
    row.agent_id = id;
    row.card_id = sanitizeText_(card && card.id);
    row.created_at = nowIso;
    row.updated_at = nowIso;
    row.status = "active";
    row.agent_type = normalizeAgentType_(agentType);
    row.owner_name = ownerName;
    row.owner_email = ownerEmail;
    row.owner_phone = ownerPhone;
    row.parent_agent_id = "";
    row.referrer_agent_id = referrerAgentId;
    row.points_balance = "0";
    row.points_lifetime = "0";
    row.points_redeemed = "0";
    row.points_frozen = "0";
    row.total_commission = "0";
    row.commission_paid_total = "0";
    row.commission_frozen = "0";
    row.eligible_for_upgrade = "FALSE";
    row.upgrade_status = "";
    row.upgrade_eligible_at = "";
    row.partner_status = agentType === AGENT_ROLE_PARTNER ? "active" : "";
    row.partner_qualified_at = agentType === AGENT_ROLE_PARTNER ? nowIso : "";
    row.partner_revoked_at = "";
    row.partner_revoke_reason = "";
    row.self_renewal_required = "FALSE";
    row.self_renewal_ok = "TRUE";
    row.reward_freeze_flag = "FALSE";
    row.reward_freeze_reason = "";
    row.reward_freeze_at = "";
    row.reward_unfreeze_at = "";
    row.last_points_at = "";
    row.last_commission_at = "";
    row.last_reversed_at = "";
    row.agent_source = source;
    row.note = note;
    row.is_test = "FALSE";
    row.tenant = tenant;
    row.member_tier = mapAgentTypeToTier_(agentType);
    row.tier_upgrade_eligible = "FALSE";
    row.tier_upgrade_reminder_sent_at = "";

    appendRowByName_("agent_db", row);
    Logger.log("ensureAgentExists_ created agent: " + id + " from source: " + source);
    
    var newAgent = findRowByField_("agent_db", "agent_id", id) || row;
    try { cache.put(cacheKey, "exists", 300); } catch(e) {}
    return newAgent;
    
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}
function adminRepairMissingAgents_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var dryRun = String(req.dry_run || "").toLowerCase() === "true";
  var repaired = {
    agents_created: [],
    agents_fixed: [],
    rows_scanned: {
      invite_db: 0,
      card_db: 0,
      payment_db: 0,
      commission_db: 0,
      lead_db: 0
    }
  };

  var allAgentIds = {};
  var existingAgents = {};
  getSheetRowsByName_("agent_db").forEach(function(agent) {
    var aid = sanitizeText_(agent.agent_id);
    if (aid) existingAgents[aid] = true;
  });

  getSheetRowsByName_("invite_db").forEach(function(row) {
    repaired.rows_scanned.invite_db++;
    var referrer = sanitizeText_(row.referrer);
    var serviceAgent = sanitizeText_(row.service_agent);
    if (referrer) allAgentIds[referrer] = true;
    if (serviceAgent) allAgentIds[serviceAgent] = true;
  });

  getSheetRowsByName_("lead_db").forEach(function(row) {
    repaired.rows_scanned.lead_db++;
    var referrer = sanitizeText_(row.referrer);
    var serviceAgent = sanitizeText_(row.service_agent);
    var agentId = sanitizeText_(row.agent_id);
    if (referrer) allAgentIds[referrer] = true;
    if (serviceAgent) allAgentIds[serviceAgent] = true;
    if (agentId) allAgentIds[agentId] = true;
  });

  getSheetRowsByName_("card_db").forEach(function(row) {
    repaired.rows_scanned.card_db++;
    var referrer = sanitizeText_(row.referrer);
    var serviceAgent = sanitizeText_(row.service_agent);
    var agentId = sanitizeText_(row.agent_id);
    var ownerAgentId = sanitizeText_(row.owner_agent_id);
    var shareAgentId = sanitizeText_(row.share_agent_id);
    if (referrer) allAgentIds[referrer] = true;
    if (serviceAgent) allAgentIds[serviceAgent] = true;
    if (agentId) allAgentIds[agentId] = true;
    if (ownerAgentId) allAgentIds[ownerAgentId] = true;
    if (shareAgentId) allAgentIds[shareAgentId] = true;
  });

  getSheetRowsByName_("payment_db").forEach(function(row) {
    repaired.rows_scanned.payment_db++;
    var agentId = sanitizeText_(row.agent_id);
    var shareAgentId = sanitizeText_(row.share_agent_id);
    if (agentId) allAgentIds[agentId] = true;
    if (shareAgentId) allAgentIds[shareAgentId] = true;
  });

  getSheetRowsByName_("commission_db").forEach(function(row) {
    repaired.rows_scanned.commission_db++;
    var beneficiary = sanitizeText_(row.beneficiary_agent_id);
    var sourceAgent = sanitizeText_(row.source_agent_id);

    if (beneficiary) allAgentIds[beneficiary] = true;
    if (sourceAgent) allAgentIds[sourceAgent] = true;
  });

  var missing = Object.keys(allAgentIds).filter(function(aid) { return !existingAgents[aid]; });
  if (!dryRun) {
    missing.forEach(function(aid) {
      var context = { source: "adminRepairMissingAgents", tenant: CONFIG.DEFAULT_TENANT, note: "repaired_missing_agent" };
      var created = ensureAgentExists_(aid, context);
      if (created) repaired.agents_created.push(aid);
    });
  } else {
    repaired.agents_created = missing;
  }

  var agentsToFix = getSheetRowsByName_("agent_db").filter(function(agent) {
    var aid = sanitizeText_(agent.agent_id);
    var ref = sanitizeText_(agent.referrer_agent_id);
    return aid && ref && aid === ref;
  });

  if (!dryRun) {
    agentsToFix.forEach(function(agent) {
      var updated = shallowClone_(agent);
      updated.referrer_agent_id = "";
      updated.updated_at = nowIso_();
      updated.note = mergeNote_(updated.note, "fixed_self_referrer_by_adminRepair");
      updateRowByName_("agent_db", agent.__rowNum, updated);
      repaired.agents_fixed.push(sanitizeText_(agent.agent_id));
    });
  } else {
    repaired.agents_fixed = agentsToFix.map(function(a) { return sanitizeText_(a.agent_id); });
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminRepairMissingAgents",
    dry_run: dryRun,
    repaired: repaired
  };
}

function __V73_FINAL_READY__() {
  return {
    ok: true,
    version: HSC_VERSION,
    status: "v7.11.1-recognition-stable"
  };
}

function __V77_FINAL_READY__() {
  return {
    ok: true,
    version: HSC_VERSION,
    status: "v7.11.1-recognition-stable",
    fixes: [
      "FIX#1: self_consumption - strict owner_agent_id only",
      "FIX#2: routeAction_ - getAdminCardDashboard case already present, version note aligned",
      "FIX#3: createCardWithOfflinePayment_ - marquee rejects empty/0/false text",
      "FIX#4: ensureAgentExists_ - LockService double-check added",
      "FIX#5: generateCardId_ - ScriptProperties sequence + Lock + fallback cache clear",
      "FIX#6: processCommission_ & processRenewalCommission_ - strict self-consumption",
      "FIX#7: toBoolean_ / toBooleanString_ - unified boolean handling",
      "FIX#8: runDailyOps_ - task failures also written to ops_log",
      "FIX#9: recognition layer - renewal/addon queue, approve/reject, points/cash split"
    ]
  };
}
function findRewardByRecognitionId_(recognitionId) {
  if (!recognitionId) return null;
  var rows = getSheetRowsByName_("agent_points_log");
  for (var i = 0; i < rows.length; i++) {
    if (sanitizeText_(rows[i].ref_id) === recognitionId) return rows[i];
  }
  rows = getSheetRowsByName_("agent_commission_log");
  for (var j = 0; j < rows.length; j++) {
    if (sanitizeText_(rows[j].ref_id) === recognitionId) return rows[j];
  }
  return null;
}

// ============================================================
// Part 1: agent_type 標準化核心函式
// ============================================================

/**
 * 將任意 agent_type 值標準化為試算表允許的值
 * 允許值: customer, referral, partner
 * 映射規則:
 *   - self → customer
 *   - service → customer (或依商業語意調整，此處保守轉 customer)
 *   - agent → referral
 *   - 空值/非法值 → customer
 * @param {any} val 原始 agent_type 值
 * @return {string} 標準化後的值 (customer/referral/partner)
 */
function normalizeAgentType_(val) {
  var t = String(val == null ? "" : val).trim().toLowerCase();
  
  // 已合法值直接保留
  if (t === "customer") return "customer";
  if (t === "referral") return "referral";
  if (t === "partner") return "partner";
  
  // 映射規則
  if (t === "self") return "customer";
  if (t === "service") return "customer";
  if (t === "agent") return "referral";
  
  // 其他非法值 → customer
  return "customer";
}

/**
 * 從物件中讀取 agent_type 並標準化
 * @param {Object} obj 包含 agent_type 欄位的物件
 * @param {string} defaultValue 預設值
 * @return {string} 標準化後的值
 */
function getNormalizedAgentType_(obj, defaultValue) {
  var raw = obj && obj.agent_type != null ? obj.agent_type : defaultValue;
  return normalizeAgentType_(raw);
}

/**
 * 更新物件的 agent_type 為標準化值 (in-place)
 * @param {Object} obj 要更新的物件
 * @param {string} defaultValue 若無 agent_type 時的預設值
 * @return {Object} 更新後的物件 (同引用)
 */
function applyNormalizedAgentType_(obj, defaultValue) {
  if (!obj) return obj;
  obj.agent_type = getNormalizedAgentType_(obj, defaultValue);
  return obj;
}

// ============================================================
// Part 2: 覆蓋所有寫入 agent_type 的地方
// ============================================================

// 2.1 覆蓋 createRequest_ 中的 agent_type
var originalCreateRequest_ = createRequest_;
createRequest_ = function(req) {
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }
  return originalCreateRequest_.call(this, req);
};

// 2.2 覆蓋 createLead_ 中的 agent_type
var originalCreateLead_ = createLead_;
createLead_ = function(req) {
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }
  var result = originalCreateLead_.call(this, req);
  if (result && result.lead && result.lead.agent_type) {
    result.lead.agent_type = normalizeAgentType_(result.lead.agent_type);
  }
  return result;
};

// 2.3 覆蓋 createCard_ 中的 agent_type
var originalCreateCard_ = createCard_;

createCard_ = function(req) {
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }

  return originalCreateCard_(req);
};

// 2.4 覆蓋 updateCardByToken_ 中的 agent_type (若有更新)
var originalUpdateCardByToken_ = updateCardByToken_;
updateCardByToken_ = function(req) {
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }
  return originalUpdateCardByToken_.call(this, req);
};

// 2.5 覆蓋 markCardRenewed_ 中的 agent_type
var originalMarkCardRenewed_ = markCardRenewed_;
markCardRenewed_ = function(req) {
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }
  return originalMarkCardRenewed_.call(this, req);
};

// 2.6 覆蓋 adminSaveCardOverrides_ 中的 owner_agent_type
var originalAdminSaveCardOverrides_ = adminSaveCardOverrides_;
adminSaveCardOverrides_ = function(req) {
  if (req && req.owner_agent_type !== undefined) {
    req.owner_agent_type = normalizeAgentType_(req.owner_agent_type);
  }
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }
  return originalAdminSaveCardOverrides_.call(this, req);
};

// 2.7 優化版 createInviteCode_（直接取代原函式，不需要覆蓋包裝）
function createInviteCode_(req) {
  var tenant = getTenant_(req);
  var plan = sanitizeText_(req.plan);
  if (plan) ensurePlanExists_(plan, tenant);
  var referrer = sanitizeText_(req.referrer);
  var serviceAgent = sanitizeText_(req.service_agent || req.serviceAgent);
  var agentType = sanitizeText_(req.agent_type || req.agentType);
  var source = sanitizeText_(req.source) || "invite";
  var maxUse = toNumber_(req.max_use || req.maxUse || 1) || 1;
  var note = sanitizeText_(req.note);
  var createdBy = sanitizeText_(req.last_editor || req.created_by || req.createdBy || "system");
  var status = sanitizeText_(req.status) || "active";
  var isTest = toBooleanString_(req.is_test);
  var expireDays = toNumber_(req.expire_days || req.expireDays || CONFIG.INVITE_DEFAULT_EXPIRE_DAYS);
  
  // 標準化 agent_type
  agentType = normalizeAgentType_(agentType);
  
  // 使用高效生成器，避免 ensureUniqueValue_ 全表掃描
  var inviteCode = sanitizeText_(req.invite_code || req.inviteCode) || generateUniqueInviteCodeOptimized_();
  
  var now = new Date();
  var expiresAt = addDays_(now, expireDays);
  
  // 直接操作 sheet，避免 appendRowByName_ 的額外開銷
  var inviteSheet = getSheetByName_("invite_db");
  var inviteHeaders = SCHEMA.invite_db;
  
  var rowValues = inviteHeaders.map(function(header) {
    switch(header) {
      case "invite_code": return inviteCode;
      case "created_at": return toIso_(now);
      case "expired_at": return "";
      case "status": return status;
      case "referrer": return referrer;
      case "service_agent": return serviceAgent;
      case "agent_type": return agentType;
      case "used_count": return "0";
      case "max_use": return String(maxUse);
      case "note": return note;
      case "tenant": return tenant;
      case "plan": return plan || "";
      case "source": return source;
      case "expire_at": return toIso_(expiresAt);
      case "used_at": return "";
      case "used_by_id": return "";
      case "disabled_at": return "";
      case "last_editor": return createdBy;
      case "process_status": return "ready";
      case "is_test": return isTest;
      default: return "";
    }
  });
  
  inviteSheet.appendRow(rowValues);
  
  // 建立回傳用的 row 物件
  var row = {};
  inviteHeaders.forEach(function(header, idx) {
    row[header] = rowValues[idx];
  });
  row.__rowNum = inviteSheet.getLastRow();
  
  // 確保 agent 存在（使用優化版）
  if (referrer) ensureAgentExistsOptimized_(referrer, { source: "invite", role: "referrer", tenant: tenant, note: "auto_created_from_invite" });
  if (serviceAgent) ensureAgentExistsOptimized_(serviceAgent, { source: "invite", role: "service_agent", tenant: tenant, note: "auto_created_from_invite" });
  
  // 清除快取
  clearSheetRowCache_("invite_db");
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "createInviteCode",
    invite: row,
    form_url: buildFormUrl_(inviteCode)
  };
}

/**
 * 高效產生唯一 invite_code（使用 ScriptProperties 序號）
 * 避免全表掃描檢查唯一性
 */
function generateUniqueInviteCodeOptimized_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(3000);
  
  try {
    var props = PropertiesService.getScriptProperties();
    var key = "HSC_INVITE_SEQ";
    var seq = Number(props.getProperty(key) || 0);
    seq++;
    props.setProperty(key, String(seq));
    
    var timestamp = Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyMMddHHmmss");
    var randomPart = Math.floor(Math.random() * 900 + 100);
    var code = "IC" + timestamp + seq + randomPart;
    return code.slice(0, 20);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 優化版 ensureAgentExists - 使用快取減少重複查詢
 */
function ensureAgentExistsOptimized_(agentId, context) {
  var id = sanitizeText_(agentId);
  if (!id) return null;
  
  // 使用 CacheService 快取檢查結果
  var cacheKey = "agent_exists_" + id;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached === "exists") {
    return { agent_id: id, from_cache: true };
  }
  
  // 快速檢查：只讀取 agent_id 欄位
  var agentSheet = getSheetByName_("agent_db");
  var agentHeaders = SCHEMA.agent_db;
  var lastRow = agentSheet.getLastRow();
  
  if (lastRow >= 2) {
    var agentIdColIndex = agentHeaders.indexOf("agent_id") + 1;
    var agentIds = agentSheet.getRange(2, agentIdColIndex, lastRow - 1, 1).getValues();
    for (var i = 0; i < agentIds.length; i++) {
      if (sanitizeText_(agentIds[i][0]) === id) {
        cache.put(cacheKey, "exists", 300);
        return { agent_id: id, from_cache: true };
      }
    }
  }
  
  // 不存在則建立新 agent
  var now = new Date();
  var nowIso = toIso_(now);
  var tenant = sanitizeText_(context && context.tenant) || CONFIG.DEFAULT_TENANT;
  var source = sanitizeText_(context && context.source) || "auto_ensure";
  
  var agentRowValues = agentHeaders.map(function(header) {
    switch(header) {
      case "agent_id": return id;
      case "created_at": return nowIso;
      case "updated_at": return nowIso;
      case "status": return "active";
      case "agent_type": return AGENT_ROLE_DEFAULT;
      case "tenant": return tenant;
      case "agent_source": return source;
      case "member_tier": return "bronze";
      case "self_renewal_ok": return "TRUE";
      default: return "";
    }
  });
  
  agentSheet.appendRow(agentRowValues);
  cache.put(cacheKey, "exists", 300);
  clearSheetRowCache_("agent_db");
  
  return { agent_id: id, created: true };
}

// 2.8 極速版 assignInviteToRequest_（invite_code 優先寫入）
function assignInviteToRequest_(req) {
  const t0 = Date.now();
  
  // 標準化 agent_type
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }

  const tenant = getTenant_(req);
  const requestId = sanitizeText_(req.request_id || req.requestId);
  if (!requestId) throw new Error("Missing request_id");

  // ========== 快速查找 request（只讀必要欄位） ==========
  const requestSheet = getSheetByName_("request_db");
  const requestHeaders = SCHEMA.request_db;
  const lastRow = requestSheet.getLastRow();
  if (lastRow < 2) throw new Error("Request not found");
  
  // 預先取得欄位索引
  const reqIdIdx = requestHeaders.indexOf("request_id");
  const statusIdx = requestHeaders.indexOf("status");
  const assignedCodeIdx = requestHeaders.indexOf("assigned_invite_code");
  const tenantIdx = requestHeaders.indexOf("tenant");
  const noteIdx = requestHeaders.indexOf("note");
  
  const allData = requestSheet.getRange(2, 1, lastRow - 1, requestHeaders.length).getValues();
  
  let targetRowNum = null;
  let currentStatus = "";
  let currentAssignedCode = "";
  let currentTenant = "";
  let currentNote = "";
  
  for (let i = 0; i < allData.length; i++) {
    if (sanitizeText_(allData[i][reqIdIdx]) === requestId) {
      targetRowNum = i + 2;
      currentStatus = sanitizeText_(allData[i][statusIdx]);
      currentAssignedCode = sanitizeText_(allData[i][assignedCodeIdx]);
      currentTenant = sanitizeText_(allData[i][tenantIdx]);
      currentNote = sanitizeText_(allData[i][noteIdx]);
      break;
    }
  }
  
  if (!targetRowNum) throw new Error("Request not found");
  if (!sameTenant_(currentTenant, tenant)) throw new Error("Request tenant mismatch");
  if (currentStatus === "converted") throw new Error("Request already converted");
  if (currentStatus === "assigned") throw new Error("Request already assigned");
  if (currentAssignedCode) throw new Error("Request already assigned invite_code");
  
  // ========== 準備 invite 參數 ==========
  const plan = sanitizeText_(req.plan);
  const referrer = sanitizeText_(req.referrer);
  const serviceAgent = sanitizeText_(req.service_agent || req.serviceAgent);
  const agentType = req.agent_type;
  const source = sanitizeText_(req.source) || "request_assigned";
  const maxUse = toNumber_(req.max_use || 1) || 1;
  const note = sanitizeText_(req.note) || ("request:" + requestId);
  const createdBy = sanitizeText_(req.assigned_by || req.created_by || "system");
  const isTest = toBooleanString_(req.is_test);
  const expireDays = CONFIG.INVITE_DEFAULT_EXPIRE_DAYS;
  
  // 生成唯一 invite_code
  const inviteCode = generateUniqueInviteCodeOptimized_();
  
  const now = new Date();
  const expiresAt = addDays_(now, expireDays);
  
  // ========== 立即寫入 invite_db ==========
  const inviteSheet = getSheetByName_("invite_db");
  const inviteHeaders = SCHEMA.invite_db;
  
  const inviteRowValues = inviteHeaders.map(function(header) {
    switch(header) {
      case "invite_code":
 return inviteCode;
      case "created_at": return toIso_(now);
      case "expired_at": return "";
      case "status": return "active";
      case "referrer": return referrer;
      case "service_agent": return serviceAgent;
      case "agent_type": return agentType;
      case "used_count": return "0";
      case "max_use": return String(maxUse);
      case "note": return note;
      case "tenant": return tenant;
      case "plan": return plan || "";
      case "source": return source;
      case "expire_at": return toIso_(expiresAt);
      case "used_at": return "";
      case "used_by_id": return "";
      case "disabled_at": return "";
      case "last_editor": return createdBy;
      case "process_status": return "ready";
      case "is_test": return isTest;
      default: return "";
    }
  });
  
  inviteSheet.appendRow(inviteRowValues);
  
  // 建立 invite 回傳物件
  const inviteRow = {};
  inviteHeaders.forEach(function(header, idx) {
    inviteRow[header] = inviteRowValues[idx];
  });
  inviteRow.__rowNum = inviteSheet.getLastRow();
  
  // ========== 立即更新 request 的 assigned_invite_code ==========
  requestSheet.getRange(targetRowNum, assignedCodeIdx + 1, 1, 1).setValue(inviteCode);
  requestSheet.getRange(targetRowNum, statusIdx + 1, 1, 1).setValue("assigned");
  
  // ========== 立即回傳 ==========
  const totalTime = Date.now() - t0;
  Logger.log("[assignInviteToRequest_] FAST: " + totalTime + "ms, invite_code=" + inviteCode);
  
  const updatedRequest = {
    request_id: requestId,
    status: "assigned",
    assigned_invite_code: inviteCode,
    assigned_by: createdBy,
    note: mergeNote_(currentNote, sanitizeText_(req.assign_note || req.note)),
    tenant: tenant
  };
  
  // ========== 非同步處理非必要操作（不阻塞） ==========
  try {
    // 更新其餘欄位
    const assignedByColIdx = requestHeaders.indexOf("assigned_by");
    const updatedAtColIdx = requestHeaders.indexOf("updated_at");
    if (assignedByColIdx !== -1) {
      requestSheet.getRange(targetRowNum, assignedByColIdx + 1, 1, 1).setValue(createdBy);
    }
    if (updatedAtColIdx !== -1) {
      requestSheet.getRange(targetRowNum, updatedAtColIdx + 1, 1, 1).setValue(nowIso_());
    }
    if (noteIdx !== -1) {
      requestSheet.getRange(targetRowNum, noteIdx + 1, 1, 1).setValue(mergeNote_(currentNote, sanitizeText_(req.assign_note || req.note)));
    }
    
    // 確保 agent 存在
    if (referrer) ensureAgentExistsOptimized_(referrer, { source: "invite", role: "referrer", tenant: tenant });
    if (serviceAgent) ensureAgentExistsOptimized_(serviceAgent, { source: "invite", role: "service_agent", tenant: tenant });
    
    clearSheetRowCache_("invite_db");
  } catch(e) {
    Logger.log("[assignInviteToRequest_] background error: " + e.message);
  }
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "assignInviteToRequest",
    request: updatedRequest,
    invite: inviteRow,
    form_url: buildFormUrl_(inviteCode)
  };
}
// ============================================================
// Part 3: 讀取時 normalize agent_type (display 層)
// ============================================================

// 3.1 覆蓋 getCard_ - 輸出前標準化 agent_type
var originalGetCard_ = getCard_;
getCard_ = function(req) {
  var result = originalGetCard_.call(this, req);
  if (result && result.card && result.card.agent_type) {
    result.card.agent_type = normalizeAgentType_(result.card.agent_type);
  }
  if (result && result.card && result.card.owner_agent_type) {
    result.card.owner_agent_type = normalizeAgentType_(result.card.owner_agent_type);
  }
  return result;
};

// 3.2 覆蓋 getCardForUpdate_ - 輸出前標準化 agent_type
var originalGetCardForUpdate_ = getCardForUpdate_;
getCardForUpdate_ = function(req) {
  var result = originalGetCardForUpdate_.call(this, req);
  if (result && result.card && result.card.agent_type) {
    result.card.agent_type = normalizeAgentType_(result.card.agent_type);
  }
  if (result && result.card && result.card.owner_agent_type) {
    result.card.owner_agent_type = normalizeAgentType_(result.card.owner_agent_type);
  }
  return result;
};

// 3.3 覆蓋 getAgentSummary_ - 輸出前標準化 agent_type
var originalGetAgentSummary_ = getAgentSummary_;
getAgentSummary_ = function(req) {
  var result = originalGetAgentSummary_.call(this, req);
  if (result && result.agent && result.agent.agent_type) {
    result.agent.agent_type = normalizeAgentType_(result.agent.agent_type);
  }
  if (result && result.agent_info && result.agent_info.agent_role) {
    result.agent_info.agent_role = normalizeAgentType_(result.agent_info.agent_role);
  }
  return result;
};

// 3.4 覆蓋 buildDeliveryAgentInfoByAgent_ - 輸出前標準化
var originalBuildDeliveryAgentInfoByAgent_ = buildDeliveryAgentInfoByAgent_;
buildDeliveryAgentInfoByAgent_ = function(agent, card) {
  var result = originalBuildDeliveryAgentInfoByAgent_.call(this, agent, card);
  if (result && result.agent_role) {
    result.agent_role = normalizeAgentType_(result.agent_role);
  }
  return result;
};

// ============================================================
// Part 4: Public Lite API - 公開門面輕量讀卡
// ============================================================

/**
 * 快取服務 (使用 CacheService.getScriptCache())
 * TTL: 120~300 秒 (預設 180 秒)
 */
function getPublicCardCache_() {
  return CacheService.getScriptCache();
}

/**
 * 生成 Public Card 快取 Key
 * @param {string} cardId 卡片 ID
 * @return {string} 快取 Key
 */
function getPublicCardCacheKey_(cardId) {
  return "hsc:public:card:" + String(cardId || "").trim();
}

/**
 * 使 Public Card 快取失效
 * @param {string} cardId 卡片 ID
 */
function invalidateCardPublicCache_(cardId) {
  if (!cardId) return;
  var cache = getPublicCardCache_();
  var key = getPublicCardCacheKey_(cardId);
  cache.remove(key);
  Logger.log("Public cache invalidated for card: " + cardId);
}

/**
 * 標準化 Public Card 輸出 Payload
 * 只回傳前台真正需要的欄位，不包含 admin/private/internal 欄位
 * @param {Object} row 原始卡片資料
 * @return {Object} 精簡後的公開卡片資料
 */
function normalizePublicCardPayload_(row) {
  if (!row || typeof row !== "object") return null;
  
  // 公開允許的欄位 (白名單)
  var publicFields = [
    "card_id", "id",           // 卡片識別
    "slug",                    // 若有 slug 欄位
    "name", "title", "subtitle", "slogan",
    "company",                 // 若有 company 欄位
    "brand_name",              // 若有 brand_name 欄位
    "avatar_url", "logo_url",
    "photos",                  // 若有 photos 陣列，否則用 photo1_url~photo10_url
    "ctas",                    // CTA 列表 (由 cta_text_* / cta_link_* 組合)
    "plan", "color", "style", "paper",
    "theme",                   // 若有 theme 欄位
    "bio", "about", "intro", "service",
    "phone", "email", "line_id", "website",
    "address", "map_url",
    "marquee_enabled", "marquee_text",
    "status", "billing_status",
    "expires_at", "updated_at"
  ];
  
  var result = {};
  
  // 基本欄位映射
  result.card_id = sanitizeText_(row.id || row.card_id);
  result.id = result.card_id;  // 相容舊版
  
  result.name = sanitizeText_(row.name);
  result.title = sanitizeText_(row.title);
  result.subtitle = sanitizeText_(row.subtitle || row.slogan);
  result.slogan = sanitizeText_(row.slogan);
  
  result.avatar_url = sanitizeText_(row.avatar_url);
  result.logo_url = sanitizeText_(row.logo_url);
  
  // 方案與主題
  result.plan = normalizePlanValue_(row.plan);
  var normalizedTheme = normalizeCardThemeFieldsForDisplay_(row);
  result.color = normalizedTheme.color;
  result.style = normalizedTheme.style;
  result.paper = normalizedTheme.paper;
  
  // 跑馬燈
  result.marquee_enabled = toBoolean_(row.marquee_enabled);
  result.marquee_text = sanitizeText_(row.marquee_text);
  
  // 狀態
  result.status = sanitizeText_(row.status);
  result.billing_status = sanitizeText_(row.billing_status);
  result.expires_at = sanitizeText_(row.expires_at);
  result.updated_at = sanitizeText_(row.updated_at);
  
  // 聯絡資訊
  result.phone = sanitizePhoneAsText_(row.phone);
  result.email = sanitizeText_(row.email);
  result.line_id = sanitizeText_(row.line_id || row.line_url || row.line_oa);
  result.website = sanitizeText_(row.website);
  result.address = sanitizeText_(row.address);
  
  // 照片列表 (photo1_url ~ photo10_url)
  var photos = [];
  for (var i = 1; i <= 10; i++) {
    var photoUrl = row["photo" + i + "_url"];
    if (photoUrl) photos.push(sanitizeText_(photoUrl));
  }
  result.photos = photos;
  
  // CTA 列表 (最多3個)
  var ctas = [];
  for (var j = 1; j <= 3; j++) {
    var ctaText = row["cta_text_" + j];
    var ctaLink = row["cta_link_" + j];
    if (ctaText || ctaLink) {
      ctas.push({
        text: sanitizeText_(ctaText),
        link: sanitizeText_(ctaLink)
      });
    }
  }
  result.ctas = ctas;
  
  // 描述性欄位
  result.bio = sanitizeText_(row.bio || row.about || row.intro);
  result.about = sanitizeText_(row.about);
  result.intro = sanitizeText_(row.intro);
  result.service = sanitizeText_(row.service || row.services);
  
  return result;
}

/**
 * 公開門面輕量讀卡 API
 * 僅查 card_db 單筆資料，不做 payment/commission/addon/renewal/admin 等重邏輯
 * @param {Object} req 請求參數，需包含 card_id
 * @return {Object} 精簡後的公開卡片資料
 */
function getCardPublicLite_(req) {
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) {
    throw new Error("Missing card_id");
  }
  
  // 檢查快取
  var cache = getPublicCardCache_();
  var cacheKey = getPublicCardCacheKey_(cardId);
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.card_id === cardId) {
        Logger.log("Public cache HIT for card: " + cardId);
        return {
          ok: true,
          version: HSC_VERSION,
          action: "getCardPublicLite",
          from_cache: true,
          card: parsed
        };
      }
    } catch (e) {
      // 快取解析失敗，繼續從資料庫讀取
      Logger.log("Public cache parse error: " + e.message);
    }
  }
  
  // 從資料庫讀取卡片
 var card = findRowByField_("card_db", "id", cardId);
if (!card) {
  throw new Error("Card not found: " + cardId);
}
  
  // 標準化公開輸出
  var publicCard = normalizePublicCardPayload_(card);
  if (!publicCard) {
    throw new Error("Failed to normalize card data");
  }
  
  // 寫入快取 (TTL: 180秒)
  try {
    cache.put(cacheKey, JSON.stringify(publicCard), 180);
  } catch (e) {
    Logger.log("Public cache write failed: " + e.message);
  }
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardPublicLite",
    from_cache: false,
    card: publicCard
  };
}

// ============================================================
// Part 5: 在修改卡片的流程中加入快取失效
// ============================================================

// 5.1 覆蓋 createCard_ - 建立卡片後失效快取
var originalCreateCardForCache_ = createCard_;
createCard_ = function(req) {
  var result = originalCreateCardForCache_.call(this, req);
  if (result && result.card_id) {
    invalidateCardPublicCache_(result.card_id);
  }
  return result;
};

// 5.2 覆蓋 updateCardByToken_ - 更新卡片後失效快取
var originalUpdateCardByTokenForCache_ = updateCardByToken_;
updateCardByToken_ = function(req) {
  var result = originalUpdateCardByTokenForCache_.call(this, req);
  if (result && result.card_id) {
    invalidateCardPublicCache_(result.card_id);
  }
  return result;
};

// 5.3 覆蓋 adminSaveCardOverrides_ - 管理員更新卡片後失效快取
var originalAdminSaveCardOverridesForCache_ = adminSaveCardOverrides_;
adminSaveCardOverrides_ = function(req) {
  var result = originalAdminSaveCardOverridesForCache_.call(this, req);
  if (result && result.card && result.card.id) {
    invalidateCardPublicCache_(result.card.id);
  }
  return result;
};

// 5.4 覆蓋 markCardDelivered_ - 交付卡片後失效快取
var originalMarkCardDeliveredForCache_ = markCardDelivered_;
markCardDelivered_ = function(req) {
  var result = originalMarkCardDeliveredForCache_.call(this, req);
  if (result && result.card_id) {
    invalidateCardPublicCache_(result.card_id);
  }
  return result;
};

// 5.5 覆蓋 markCardRenewed_ - 續約後失效快取
var originalMarkCardRenewedForCache_ = markCardRenewed_;
markCardRenewed_ = function(req) {
  var result = originalMarkCardRenewedForCache_.call(this, req);
  if (result && result.card_id) {
    invalidateCardPublicCache_(result.card_id);
  }
  return result;
};

// 5.6 覆蓋 confirmPayment_ - 付款確認後失效快取
var originalConfirmPaymentForCache_ = confirmPayment_;
confirmPayment_ = function(req) {
  var result = originalConfirmPaymentForCache_.call(this, req);
  if (result && result.card && result.card.id) {
    invalidateCardPublicCache_(result.card.id);
  }
  return result;
};

// 5.7 覆蓋 createRenewalPayment_ - 建立續約付款後失效快取 (若有影響公開欄位)
if (typeof createRenewalPayment_ === 'function') {
  var originalCreateRenewalPaymentForCache_ = createRenewalPayment_;
  createRenewalPayment_ = function(req) {
    var result = originalCreateRenewalPaymentForCache_.call(this, req);
    if (result && result.card_id) {
      invalidateCardPublicCache_(result.card_id);
    }
    return result;
  };
}

// ============================================================
// Part 6: 新增路由 getCardPublicLite
// ============================================================

// 6.1 擴充 ACTIONS 陣列 (如果尚未包含)
if (ACTIONS.indexOf("getCardPublicLite") === -1) {
  ACTIONS.push("getCardPublicLite");
}

// 6.2 在 routeAction_ 的 switch 中加入 case (需覆蓋原 routeAction_)
var originalRouteAction_ = routeAction_;
routeAction_ = function(e, method) {
  try {
    var req = normalizeRequest_(e, method);
    var action = sanitizeText_(req.action);
    
    // 處理 getCardPublicLite
    if (action === "getCardPublicLite") {
      // 不需要 admin_key，公開 API
      var result = getCardPublicLite_(req);
      return jsonOutput_(result);
    }
    
    // 其他 action 走原路由
    return originalRouteAction_.call(this, e, method);
    
  } catch (err) {
    return jsonOutput_({
      ok: false,
      version: HSC_VERSION,
      error: err && err.message ? err.message : String(err),
      stack: err && err.stack ? String(err.stack) : ""
    });
  }
};

// ============================================================
// Part 7: ref 參數 mapping 修正 (若 ref 代表推薦來源)
// ============================================================

/**
 * 根據 ref 參數解析推薦來源的 agent_type
 * 商業語意:
 *   - ref 存在且有效 → referral (推薦代理)
 *   - 無 ref → customer (本人自來客)
 *   - 特殊 case 可依需求調整
 * @param {string} ref ref 參數值
 * @return {string} 標準化後的 agent_type
 */
function resolveAgentTypeByRef_(ref) {
  var hasValidRef = ref && String(ref).trim().length > 0;
  if (hasValidRef) {
    // 若有推薦來源，視為 referral
    return "referral";
  }
  // 無推薦來源，視為 customer
  return "customer";
}

// 覆蓋 createRequest_ 中的 ref 處理
var originalCreateRequestWithRef_ = createRequest_;
createRequest_ = function(req) {
  if (req && req.ref !== undefined && req.agent_type === undefined) {
    req.agent_type = resolveAgentTypeByRef_(req.ref);
  }
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }
  return originalCreateRequestWithRef_.call(this, req);
};

// 覆蓋 createLead_ 中的 ref 處理
var originalCreateLeadWithRef_ = createLead_;
createLead_ = function(req) {
  if (req && req.ref !== undefined && req.agent_type === undefined) {
    req.agent_type = resolveAgentTypeByRef_(req.ref);
  }
  if (req && req.agent_type !== undefined) {
    req.agent_type = normalizeAgentType_(req.agent_type);
  }
  return originalCreateLeadWithRef_.call(this, req);
};

// ============================================================
// Part 8: 輔助函式 - 批次標準化現有資料 (供管理員呼叫)
// ============================================================

/**
 * 批次標準化資料庫中所有 agent_type 欄位
 * 適用於 card_db, lead_db, agent_db, payment_db
 * @param {Object} req 請求參數 (需含 admin_key)
 * @return {Object} 執行結果統計
 */
function adminNormalizeAllAgentTypes_(req) {
  requireAdminKey_(req);
  var dryRun = String(req.dry_run || "").toLowerCase() === "true";
  var stats = {
    card_db: { scanned: 0, changed: 0 },
    lead_db: { scanned: 0, changed: 0 },
    agent_db: { scanned: 0, changed: 0 },
    payment_db: { scanned: 0, changed: 0 },
    total_changed: 0
  };
  
  // 處理 card_db
  var cards = getSheetRowsByName_("card_db");
  stats.card_db.scanned = cards.length;
  cards.forEach(function(card) {
    var original = sanitizeText_(card.agent_type);
    var normalized = normalizeAgentType_(original);
    if (original !== normalized) {
      stats.card_db.changed++;
      if (!dryRun) {
        var updated = shallowClone_(card);
        updated.agent_type = normalized;
        updated.updated_at = nowIso_();
        updateRowByName_("card_db", card.__rowNum, updated);
      }
    }
  });
  
  // 處理 lead_db
  var leads = getSheetRowsByName_("lead_db");
  stats.lead_db.scanned = leads.length;
  leads.forEach(function(lead) {
    var original = sanitizeText_(lead.agent_type);
    var normalized = normalizeAgentType_(original);
    if (original !== normalized) {
      stats.lead_db.changed++;
      if (!dryRun) {
        var updated = shallowClone_(lead);
        updated.agent_type = normalized;
        updated.updated_at = nowIso_();
        updateRowByName_("lead_db", lead.__rowNum, updated);
      }
    }
  });
  
  // 處理 agent_db
  var agents = getSheetRowsByName_("agent_db");
  stats.agent_db.scanned = agents.length;
  agents.forEach(function(agent) {
    var original = sanitizeText_(agent.agent_type);
    var normalized = normalizeAgentType_(original);
    if (original !== normalized) {
      stats.agent_db.changed++;
      if (!dryRun) {
        var updated = shallowClone_(agent);
        updated.agent_type = normalized;
        updated.member_tier = mapAgentTypeToTier_(normalized);
        updated.updated_at = nowIso_();
        updateRowByName_("agent_db", agent.__rowNum, updated);
      }
    }
  });
  
  // 處理 payment_db
  var payments = getSheetRowsByName_("payment_db");
  stats.payment_db.scanned = payments.length;
  payments.forEach(function(payment) {
    var original = sanitizeText_(payment.agent_type);
    var normalized = normalizeAgentType_(original);
    if (original !== normalized) {
      stats.payment_db.changed++;
      if (!dryRun) {
        var updated = shallowClone_(payment);
        updated.agent_type = normalized;
        updated.updated_at = nowIso_();
        updateRowByName_("payment_db", payment.__rowNum, updated);
      }
    }
  });
  
  stats.total_changed = stats.card_db.changed + stats.lead_db.changed + stats.agent_db.changed + stats.payment_db.changed;
  stats.dry_run = dryRun;
  stats.ok = true;
  stats.version = HSC_VERSION;
  stats.action = "adminNormalizeAllAgentTypes";
  
  return stats;
}

// 將 adminNormalizeAllAgentTypes 加入 ACTIONS (如果尚未)
if (ACTIONS.indexOf("adminNormalizeAllAgentTypes") === -1) {
  ACTIONS.push("adminNormalizeAllAgentTypes");
  ADMIN_PROTECTED_ACTIONS.push("adminNormalizeAllAgentTypes");
}

// ============================================================
// 修正完成標記
// ============================================================
function __V7112_AGENT_TYPE_FIX_AND_PUBLIC_LITE_READY__() {
  return {
    ok: true,
    version: HSC_VERSION,
    status: "v7.11.2-agent-type-fix-and-public-lite",
    fixes: [
      "normalizeAgentType_ - 統一轉換 self/service/agent 為合法值",
      "覆蓋所有寫入 agent_type 的函式 (createRequest/createLead/createCard/updateCardByToken/renew/admin)",
      "覆蓋所有讀取 agent_type 的函式 (getCard/getCardForUpdate/getAgentSummary)",
      "新增 getCardPublicLite 公開輕量 API + CacheService 快取",
      "在 create/update/deliver/renew/confirmPayment 流程加入快取失效",
      "ref 參數 mapping: 有 ref → referral, 無 ref → customer"
    ]
  };
} 

/************************************************
 * v1.5.1 performance compatibility pack
 * - add getCardPublicShell / getAdminBootstrap
 * - light list support for getCards/getPayments/getRequests
 * - narrow schema checks on hot read actions
 * - keep legacy route fallback
 ************************************************/
var __routeAction_v151_base = routeAction_;
var __getCards_v151_base = getCards_;
var __getPayments_v151_base = getPayments_;
var __getRequests_v151_base = getRequests_;
var __getCard_v151_base = getCard_;
var __getCardPublicLite_v151_base = getCardPublicLite_;
var __getAnnouncements_v151_base = getAnnouncements_;
var __getRecentOpsLogs_v151_base = getRecentOpsLogs_;

function parseBoolV151_(v, fallback) {
  if (v === true || v === false) return v;
  var s = sanitizeText_(v).toLowerCase();
  if (!s) return !!fallback;
  return ["1","true","yes","y","on"].indexOf(s) !== -1;
}
function parseLimitV151_(v, def, max) {
  var n = Math.floor(Number(v || def));
  if (!isFinite(n) || n <= 0) n = def;
  if (max && n > max) n = max;
  return n;
}
function parseOffsetV151_(v) {
  var n = Math.floor(Number(v || 0));
  return (!isFinite(n) || n < 0) ? 0 : n;
}
function sliceListV151_(rows, req) {
  var offset = parseOffsetV151_(req && req.offset);
  var limit = parseLimitV151_(req && req.limit, 100, 500);
  return rows.slice(offset, offset + limit);
}
function toLightCardV151_(row) {
  return {
    id: sanitizeText_(row.id) || getRowCardId_(row),
    card_id: getRowCardId_(row),
    name: sanitizeText_(row.name),
    phone: sanitizePhoneAsText_(row.phone),
    email: sanitizeText_(row.email),
    plan: sanitizeText_(row.plan),
    color: sanitizeText_(row.color),
    style: sanitizeText_(row.style),
    paper: sanitizeText_(row.paper),
    status: sanitizeText_(row.status),
    billing_status: sanitizeText_(row.billing_status),
    expires_at: sanitizeText_(row.expires_at),
    payment_due_at: sanitizeText_(row.payment_due_at),
    payment_paid_at: sanitizeText_(row.payment_paid_at),
    service_agent: sanitizeText_(row.service_agent),
    referrer: sanitizeText_(row.referrer),
    created_at: sanitizeText_(row.created_at),
    updated_at: sanitizeText_(row.updated_at)
  };
}
function toLightPaymentV151_(row) {
  return {
    payment_id: sanitizeText_(row.payment_id),
    card_id: sanitizeText_(row.card_id),
    created_at: sanitizeText_(row.created_at),
    updated_at: sanitizeText_(row.updated_at),
    event_type: sanitizeText_(row.event_type),
    order_type: sanitizeText_(row.order_type),
    amount: sanitizeText_(row.amount),
    status: sanitizeText_(row.status),
    paid_at: sanitizeText_(row.paid_at),
    due_at: sanitizeText_(row.due_at),
    method: sanitizeText_(row.method),
    billing_status: sanitizeText_(row.billing_status),
    agent_id: sanitizeText_(row.agent_id),
    agent_type: sanitizeText_(row.agent_type)
  };
}
function toLightRequestV151_(row) {
  return {
    request_id: sanitizeText_(row.request_id),
    created_at: sanitizeText_(row.created_at),
    ref: sanitizeText_(row.ref),
    status: sanitizeText_(row.status),
    assigned_invite_code: sanitizeText_(row.assigned_invite_code),
    assigned_by: sanitizeText_(row.assigned_by),
    note: sanitizeText_(row.note),
    tenant: sanitizeText_(row.tenant)
  };
}
function getCardPublicShell_(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  var targetCardId = getTargetCardId_(req);
  if (!targetCardId) throw new Error("Missing card_id");
  var cache = CacheService.getScriptCache();
  var cacheKey = "card_shell_" + targetCardId;
  var rawCached = cache.get(cacheKey);
  if (rawCached) {
    try {
      var cached = JSON.parse(rawCached);
      return { ok: true, version: HSC_VERSION, action: "getCardPublicShell", card_id: targetCardId, cached: true, card: cached };
    } catch (_e) {}
  }
  var rows = getSheetRowsByName_("card_db");
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (getRowCardId_(rows[i]) === targetCardId) { found = rows[i]; break; }
  }
  if (!found) throw new Error("Card not found");
  var cardStatus = sanitizeText_(found.status).toLowerCase();
  if (cardStatus && ["inactive","draft","deleted"].indexOf(cardStatus) !== -1) throw new Error("Card unavailable");
  var normalizedTheme = normalizeCardThemeFieldsForDisplay_(found);
  var shell = {
    id: sanitizeText_(found.id) || getRowCardId_(found),
    card_id: getRowCardId_(found),
    name: sanitizeText_(found.name),
    unit: sanitizeText_(found.unit),
    title: sanitizeText_(found.title),
    slogan: sanitizeText_(found.slogan),
    intro: sanitizeText_(found.slogan || found.intro),
    avatar_url: sanitizeText_(found.avatar_url),
    logo_url: sanitizeText_(found.logo_url),
    plan: normalizedTheme.plan,
    color: normalizedTheme.color,
    style: normalizedTheme.style,
    paper: normalizedTheme.paper,
    photo_limit: String(getEffectivePhotoLimit_(found)),
    cta_limit: String(getEffectiveCtaLimit_(found)),
    photo1_url: sanitizeText_(found.photo1_url),
    cta_text_1: sanitizeText_(found.cta_text_1),
    cta_link_1: sanitizeText_(found.cta_link_1),
    marquee_text: sanitizeText_(found.marquee_text),
    marquee_enabled: toBooleanString_(found.marquee_enabled),
    payment_due_at: sanitizeText_(found.payment_due_at),
    payment_paid_at: sanitizeText_(found.payment_paid_at),
    expires_at: sanitizeText_(found.expires_at)
  };
  cache.put(cacheKey, JSON.stringify(shell), 180);
  return { ok: true, version: HSC_VERSION, action: "getCardPublicShell", card_id: targetCardId, card: shell };
}
getCardPublicLite_ = function(req) {
  ensureSchemasOrThrow_(["card_db"]);
  return __getCardPublicLite_v151_base(req);
};
getCard_ = function(req) {
  req = req || {};
  var trackView = parseBoolV151_(req.track_view, true);
  var withTrackedCta = parseBoolV151_(req.with_tracked_cta, true);
  if (trackView && withTrackedCta) {
    return __getCard_v151_base(req);
  }
  ensureSchemasOrThrow_(["card_db"]);
  var targetCardId = getTargetCardId_(req);
  var token = sanitizeText_(req.token);
  var card = null;
  if (targetCardId) {
    var rows = getSheetRowsByName_("card_db");
    for (var i = 0; i < rows.length; i++) {
      if (getRowCardId_(rows[i]) === targetCardId) { card = rows[i]; break; }
    }
  }
  if (!card && token) card = findRowByField_("card_db", "token", token);
  if (!card) throw new Error("Card not found");
  var normalizedTheme = normalizeCardThemeFieldsForDisplay_(card);
  var displayCard = shallowClone_(card);
  displayCard.id = sanitizeText_(displayCard.id) || getRowCardId_(displayCard);
  displayCard.card_id = getRowCardId_(displayCard);
  displayCard.plan = normalizedTheme.plan;
  displayCard.color = normalizedTheme.color;
  displayCard.style = normalizedTheme.style;
  displayCard.paper = normalizedTheme.paper;
  displayCard.photo_limit = String(getEffectivePhotoLimit_(displayCard));
  displayCard.cta_limit = String(getEffectiveCtaLimit_(displayCard));
  displayCard.marquee_purchased = toBooleanString_(displayCard.marquee_purchased);
  displayCard.marquee_enabled = toBooleanString_(displayCard.marquee_enabled);
  displayCard.marquee_text = sanitizeText_(displayCard.marquee_text);
  displayCard.phone = sanitizePhoneAsText_(displayCard.phone);
  displayCard.owner_phone = sanitizePhoneAsText_(displayCard.owner_phone);
  return { ok: true, version: HSC_VERSION, action: "getCard", track_view: false, with_tracked_cta: false, card: displayCard };
};
getCards_ = function(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  requireAdminKeyOrSystem_(req);
  var tenant = getTenant_(req);
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var status = sanitizeText_(req.status).toLowerCase();
  var billingStatus = sanitizeText_(req.billing_status || req.billingStatus).toLowerCase();
  var light = parseBoolV151_(req.light, false);
  var rows = getSheetRowsByName_("card_db").filter(function(row) { return sameTenant_(row.tenant, tenant); });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status).toLowerCase() === status; });
  if (billingStatus) rows = rows.filter(function(row) { return sanitizeText_(row.billing_status).toLowerCase() === billingStatus; });
  if (keyword) rows = rows.filter(function(row) {
    var hay = [row.id,row.name,row.phone,row.email,row.unit,row.title,row.referrer,row.service_agent,row.agent_id].map(function(x){ return sanitizeText_(x).toLowerCase(); }).join(" ");
    return hay.indexOf(keyword) !== -1;
  });
  rows.sort(function(a, b) { return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });
  rows = sliceListV151_(rows, { limit: req.limit || 100, offset: req.offset || 0 });
  if (light) rows = rows.map(toLightCardV151_);
  return { ok: true, version: HSC_VERSION, action: "getCards", cards: rows, limit: parseLimitV151_(req.limit,100,500), offset: parseOffsetV151_(req.offset), light: light };
};
getPayments_ = function(req) {
  ensureSchemasOrThrow_(["payment_db"]);
  req = req || {};
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status).toLowerCase();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var light = parseBoolV151_(req.light, false);
  var rows = getSheetRowsByName_("payment_db").filter(function(row) { return sameTenant_(row.tenant, tenant); });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status).toLowerCase() === status; });
  if (cardId) rows = rows.filter(function(row) { return sanitizeText_(row.card_id) === cardId; });
  if (paymentId) rows = rows.filter(function(row) { return sanitizeText_(row.payment_id) === paymentId; });
  if (keyword) rows = rows.filter(function(row) {
    var hay = [row.payment_id,row.card_id,row.status,row.event_type,row.order_type,row.method,row.agent_id].map(function(x){ return sanitizeText_(x).toLowerCase(); }).join(" ");
    return hay.indexOf(keyword) !== -1;
  });
  rows.sort(function(a,b){ return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });
  rows = sliceListV151_(rows, { limit: req.limit || 100, offset: req.offset || 0 });
  if (light) rows = rows.map(toLightPaymentV151_);
  return { ok: true, version: HSC_VERSION, action: "getPayments", rows: rows, payments: rows, limit: parseLimitV151_(req.limit,100,500), offset: parseOffsetV151_(req.offset), light: light };
};
getRequests_ = function(req) {
  ensureSchemasOrThrow_(["request_db"]);
  req = req || {};
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status).toLowerCase();
  var ref = sanitizeText_(req.ref).toLowerCase();
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var light = parseBoolV151_(req.light, false);
  var rows = getSheetRowsByName_("request_db").filter(function(row){ return sameTenant_(row.tenant, tenant); });
  if (status) rows = rows.filter(function(row){ return sanitizeText_(row.status).toLowerCase() === status; });
  if (ref) rows = rows.filter(function(row){ return sanitizeText_(row.ref).toLowerCase() === ref; });
  if (keyword) rows = rows.filter(function(row){
    var hay = [row.request_id,row.ref,row.status,row.assigned_invite_code,row.note].map(function(x){ return sanitizeText_(x).toLowerCase(); }).join(" ");
    return hay.indexOf(keyword) !== -1;
  });
  rows.sort(function(a,b){ return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });
  rows = rows.slice(parseOffsetV151_(req.offset), parseOffsetV151_(req.offset) + parseLimitV151_(req.limit, 50, 500));
  if (light) rows = rows.map(toLightRequestV151_);
  return { ok:true, version:HSC_VERSION, action:"getRequests", requests: rows, limit: parseLimitV151_(req.limit,50,500), offset: parseOffsetV151_(req.offset), light: light };
};
getAnnouncements_ = function(req) {
  ensureSchemasOrThrow_(["announcement_db"]);
  return __getAnnouncements_v151_base(req);
};
getRecentOpsLogs_ = function(req) {
  ensureSchemasOrThrow_(["ops_log_db"]);
  return __getRecentOpsLogs_v151_base(req);
};
function getAdminBootstrap_(req) {
  req = req || {};
  requireAdminKeyOrSystem_(req);
  var tenant = getTenant_(req);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getAdminBootstrap",
    tenant: tenant,
    requests: getRequests_({ tenant: tenant, admin_key: req.admin_key, __system_call: req.__system_call, limit: req.requests_limit || 50, offset: 0 }).requests,
    cards: getCards_({ tenant: tenant, admin_key: req.admin_key, __system_call: req.__system_call, limit: req.cards_limit || 100, offset: 0, light: true }).cards,
    payments: getPayments_({ tenant: tenant, admin_key: req.admin_key, __system_call: req.__system_call, limit: req.payments_limit || 100, offset: 0, light: true }).payments,
    announcements: getAnnouncements_({ tenant: tenant }).announcements || [],
    ops_logs: getRecentOpsLogs_({ tenant: tenant, admin_key: req.admin_key, __system_call: req.__system_call, limit: req.ops_limit || 20 }).items || []
  };
}
routeAction_ = function(e, method) {
  var req = normalizeRequest_(e, method);
  var action = sanitizeText_(req.action);
  if (action === "getCardPublicShell") return jsonOutput_(getCardPublicShell_(req));
  if (action === "getAdminBootstrap") return jsonOutput_(getAdminBootstrap_(req));
  if (["getCards","getPayments","getRequests","getCard","getCardPublicLite","getAnnouncements","getRecentOpsLogs"].indexOf(action) !== -1) {
    try {
      var result;
      if (["getAdminBootstrap","getCards","getRecentOpsLogs"].indexOf(action) !== -1) requireAdminKeyOrSystem_(req);
      switch (action) {
        case "getCards": result = getCards_(req); break;
        case "getPayments": result = getPayments_(req); break;
        case "getRequests": result = getRequests_(req); break;
        case "getCard": result = getCard_(req); break;
        case "getCardPublicLite": result = getCardPublicLite_(req); break;
        case "getAnnouncements": result = getAnnouncements_(req); break;
        case "getRecentOpsLogs": result = getRecentOpsLogs_(req); break;
      }
      return jsonOutput_(result);
    } catch (err) {
      return jsonOutput_({ ok: false, version: HSC_VERSION, action: action, error: err && err.message ? err.message : String(err) });
    }
  }
  return __routeAction_v151_base(e, method);
};
