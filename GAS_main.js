 /************************************************
HSC GAS = "v7.12-clean-single-base";
- 修正1: Queue 唯一化建立 pending recognition
- 修正2: approveRecognition 必須驗證 event 已付款
- 修正3: applyRecognitionReward 防重複發獎 (recognition_id 為主鍵)
- 修正4: agent 分流判定以 agent_type 為主、member_tier 為輔
- 保留 v7.11.0 所有 recognition 架構與既有功能
************************************************/


const AGENT_ROLE_DEFAULT = "referral";
const AGENT_ROLE_PARTNER = "partner";
const AGENT_ROLE_REFERRAL = "referral";
const AGENT_UPGRADE_TARGET_POINTS = 10000;
const CUSTOMER_AUTO_UPGRADE_POINTS = 5;

const CONFIG = {
  SPREADSHEET_ID: "1k7LBTWKsTFtnhOC2Fgj0WqkJ0IO04ZBGHYyOnxoQnkg",
  BASE_URL: "https://angel-namecard.letssyncus.com/",
  DEFAULT_TENANT: "angel",
  DEFAULT_TIMEZONE: "Asia/Taipei",
  UPDATE_TOKEN_EXPIRE_HOURS: 72,
  INVITE_DEFAULT_EXPIRE_DAYS: 3,
  CARD_EXPIRE_DAYS: 365,
  PAYMENT_DUE_DAYS: 3,
  SYSTEM_EMAIL: "",
  SERVICE_LOG_WINDOW_DAYS: 7,
  // v7.13: 刪除所有 hardcode rate
  //   RENEWAL_SERVICE_AGENT_RATE / RENEWAL_REFERRER_POINTS_RATE(第 6 處)
  //   RECOGNITION_POINTS_RATE / RECOGNITION_CASH_RATE(第 8 處)
  //   全部改走 commission_rules 表,rate 來源統一
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
    RECOGNITION: "recognition_db",
    PAYMENT_INBOX: "payment_inbox_db",
     CARD_CTA_EXT: "card_cta_ext",
     CARD_PHOTO_EXT: "card_photo_ext"
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
    "features_json","cta_limit","update_unlimited_enabled","update_unlimited_expires_at",
    "main_card_id"
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
update_pending_db: [
    "pending_id",
    "card_id",
    "payment_id",
    "status",
    "payload_json",
    "created_at",
    "applied_at",
    "operator",
    "note"
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
    "bundle_items",
    "tier_config"
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
  "request_id","created_at","ref","status","assigned_invite_code","assigned_by","note","tenant","assigned_at","submitted_at"
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
  card_cta_ext: [
    "id", "seq", "cta_text", "cta_link"
  ],
   card_photo_ext: [
    "id", "seq", "photo_url", "photo_key", "photo_meta_json"
  ],

  payment_inbox_db: [
    "inbox_id", "created_at", "source", "card_id", "amount", "last5",
  "matched", "matched_card_id", "matched_payment_id", "status", "note"
]

};

const PHOTO_LIMIT_ABSOLUTE_MAX = 30;
const ADDON_ORDER_ALLOWED_STATUSES = ["pending","paid","cancelled"];

const ADDON_ITEM_CODES = [
  "addon_photo",
  "addon_cta",
  "addon_marquee",
  "addon_update_unlimited",
  "addon_agent_upgrade",
  "addon_direct_partner",
  "addon_combo_pro"
];
// v7.13: 不允許被 handleAgentUpgrade_ 自動升金或改動的系統帳戶
// TW0001 = 公司根代理,不能被客戶付款觸發升金動作
const SYSTEM_PROTECTED_UPGRADE_IDS = ["TW0001"];


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
  recognition_db: SCHEMA.recognition_db,
  payment_inbox_db: SCHEMA.payment_inbox_db,
  card_cta_ext: SCHEMA.card_cta_ext,
  card_photo_ext: SCHEMA.card_photo_ext
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
  "submitPaymentCheck",
  "getRequests",
  "assignInviteToRequest",
  "rebindLineUserId", 
  "createLead",
  "createCard",
  "markCardDelivered",
  "getCard",
  "getCardPublicLite",
  "getCardPublicShell",
  "getAdminBootstrap",
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
  "adminReassignServiceAgent", 
  "adminDeleteTestCard",
  "adminListTestCards",     
  "adminBuildBindUrl",          
  "bindCardLine",   
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
  "getTriggerStatus",
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
  "getAdminBootstrap",
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
  "getRequestTrace",
  "getUnmatchedPayments",
  "assignPaymentToCard",
  "repairPaymentInboxSchema",
  "adminBuildBundleText",
  "cancelPendingRenewal",
  "getPricingConfig",
   "submitAgentPaymentInbox",
   "adminGetCardDirect",
  "adminUpdateCardPhotoUrls",
  "adminDirectConfirmPayment",
  "adminSetCardMainCard",
  "adminGetAttachedCards",
  "adminBatchCreateCards",
  "adminGetCardsByReferrer",
  "adminBatchUpdateCards",
  "adminBatchRenewCards",
  "adminGetCardCtas",
  "adminSetCardCtas",
  "adminBatchBankMatch",
  "adminConfirmBankImport",
  "adminBatchDirectConfirmPayment",
  "adminSaveBatchMaster",
  "adminListBatchMasters",
  "adminGetBatchMaster",
  "adminDeleteBatchMaster",
  "adminGrantUnlimitedUpdate",
  "adminRepairCardLimits",
  "adminPreviewTestMarker",
  "adminCleanupTestMarker",
  "adminRecreatePermanentTestCards",
  "getCardViewStats",
  "adminGetAllViewStats",
  "adminFlushViewStats"
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
  "adminReassignServiceAgent",
  "adminBuildBindUrl",          
  "adminDeleteTestCard",    
  "adminListTestCards",
  "adminCancelAddonOrder",
  "adminCheckSchemaStatus",
  "repairAddonOrderStatuses",
  "confirmOfflinePayment",
  "getPendingOfflinePayments",
  "runDailyOps",
  "installCommercialTriggers",
  "getTriggerStatus",
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
  "getAdminBootstrap",
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
  "getRequestTrace",
  "getUnmatchedPayments",
  "assignPaymentToCard",
  "repairPaymentInboxSchema",
  "adminBuildBundleText",
  "submitAgentPaymentInbox",
  "adminGetCardDirect",
  "adminUpdateCardPhotoUrls",
  "adminDirectConfirmPayment",
  "adminBatchCreateCards",
  "adminGetCardsByReferrer",
  "adminBatchUpdateCards",
  "adminBatchRenewCards",
  "adminGetCardCtas",
  "adminSetCardCtas",
  "adminBatchBankMatch",
  "adminConfirmBankImport",
  "adminBatchDirectConfirmPayment",
  "adminSaveBatchMaster",
  "adminListBatchMasters",
  "adminGetBatchMaster",
  "adminDeleteBatchMaster",
  "adminGrantUnlimitedUpdate",
  "adminRepairCardLimits",
  "adminPreviewTestMarker",
  "adminCleanupTestMarker",
  "adminRecreatePermanentTestCards",
  "getCardViewStats",
  "adminGetAllViewStats",
  "adminFlushViewStats"
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
  val = val.replace(/^plan_/, "");
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
  if (_schemaCheckCache_[schemaName]) return _schemaCheckCache_[schemaName];
  var result = checkSchemaHeaders_(schemaName);
  _schemaCheckCache_[schemaName] = result;
  return result;
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
// v7.12 效能輔助
// ============================================================
var _schemaCheckCache_ = {};



function getSheetRowsScriptCacheKey_(schemaName) {
  return "hsc:sheet_rows:" + String(schemaName || "");
}

function clearSchemaCheckCache_(schemaName) {
  if (schemaName) delete _schemaCheckCache_[schemaName];
  else _schemaCheckCache_ = {};
}

function parseBoolClean_(value, fallback) {
  if (value === true || value === false) return value;
  var s = sanitizeText_(value).toLowerCase();
  if (!s) return !!fallback;
  return ["1", "true", "yes", "y", "on"].indexOf(s) !== -1;
}

function parseLimitClean_(value, def, max) {
  var n = Math.floor(Number(value || def));
  if (!isFinite(n) || n <= 0) n = def;
  if (max && n > max) n = max;
  return n;
}

function parseOffsetClean_(value) {
  var n = Math.floor(Number(value || 0));
  return (!isFinite(n) || n < 0) ? 0 : n;
}

function sliceRowsClean_(rows, req, defLimit, maxLimit) {
  var offset = parseOffsetClean_(req && req.offset);
  var limit = parseLimitClean_(req && req.limit, defLimit || 100, maxLimit || 500);
  return rows.slice(offset, offset + limit);
}

function toLightCardClean_(row) {
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

function toLightPaymentClean_(row) {
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

function toLightRequestClean_(row) {
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

function buildLatestPaymentMapFromRows_(payments) {
  var map = {};
  (payments || []).forEach(function(row) {
    var cardId = sanitizeText_(row.card_id);
    if (!cardId) return;
    var current = map[cardId];
    if (!current) { map[cardId] = row; return; }
    var currentTs = toTimestampMs_(current.updated_at || current.created_at || current.paid_at || current.due_at);
    var nextTs = toTimestampMs_(row.updated_at || row.created_at || row.paid_at || row.due_at);
    if (nextTs >= currentTs) map[cardId] = row;
  });
  return map;
}

// ============================================================
// v8.4.3 新增:CTA / 照片 加購擴充分頁讀取
// ============================================================
/**
 * 同步主表 cta_extra_purchased / photo_extra_purchased 旗標
 * 掃描擴充分頁,有任一筆資料就標 "TRUE",否則 "FALSE"
 * 用途:讓主表旗標始終反映真實狀態(給後台報表、篩選用)
 *
 * @param {string} cardId
 * @return {object}  { updated, cta_extra_purchased, photo_extra_purchased }
 */
function syncCardExtraPurchasedFlags_(cardId) {
  var id = sanitizeText_(cardId);
  if (!id) return { updated: false, error: "missing card_id" };

  var card = findRowByField_("card_db", "id", id);
  if (!card) return { updated: false, error: "card not found" };

  var hasCtaExt = getCardCtaExtensions_(id).length > 0;
  var hasPhotoExt = getCardPhotoExtensions_(id).length > 0;

  var ctaFlag = hasCtaExt ? "TRUE" : "FALSE";
  var photoFlag = hasPhotoExt ? "TRUE" : "FALSE";

  var currentCta = sanitizeText_(card.cta_extra_purchased).toUpperCase();
  var currentPhoto = sanitizeText_(card.photo_extra_purchased).toUpperCase();

  if (currentCta === ctaFlag && currentPhoto === photoFlag) {
    return {
      updated: false,
      unchanged: true,
      cta_extra_purchased: ctaFlag,
      photo_extra_purchased: photoFlag
    };
  }

  var updated = shallowClone_(card);
  updated.cta_extra_purchased = ctaFlag;
  updated.photo_extra_purchased = photoFlag;
  updated.updated_at = nowIso_();
  updateRowByName_("card_db", card.__rowNum, updated);
  invalidateCardPublicCache_(id);

  return {
    updated: true,
    cta_extra_purchased: ctaFlag,
    photo_extra_purchased: photoFlag
  };
}
/**
 * 讀取指定卡片的 CTA 加購清單(按 seq 由小到大排序)
 * @param {string} cardId  主卡 id(對應 card_cta_ext.id)
 * @return {Array<{seq:number, text:string, link:string}>}
 */
function getCardCtaExtensions_(cardId) {
  var id = sanitizeText_(cardId);
  if (!id) return [];
  try {
    ensureSchemasOrThrow_(["card_cta_ext"]);
  } catch (e) {
    Logger.log("getCardCtaExtensions_ ensureSchema failed: " + (e && e.message));
    return [];
  }
  var rows = getSheetRowsByName_("card_cta_ext").filter(function(row) {
    return sanitizeText_(row.id) === id;
  });
  rows.sort(function(a, b) {
    return toNumber_(a.seq) - toNumber_(b.seq);
  });
  return rows.map(function(row) {
    return {
      seq: toNumber_(row.seq),
      text: sanitizeText_(row.cta_text),
      link: sanitizeText_(row.cta_link)
    };
  }).filter(function(item) {
    return item.text || item.link;
  });
}

/**
 * 讀取指定卡片的照片加購清單(按 seq 由小到大排序)
 * @param {string} cardId  主卡 id(對應 card_photo_ext.id)
 * @return {Array<{seq:number, url:string, key:string, meta:object|null}>}
 */
function getCardPhotoExtensions_(cardId) {
  var id = sanitizeText_(cardId);
  if (!id) return [];
  try {
    ensureSchemasOrThrow_(["card_photo_ext"]);
  } catch (e) {
    Logger.log("getCardPhotoExtensions_ ensureSchema failed: " + (e && e.message));
    return [];
  }
  var rows = getSheetRowsByName_("card_photo_ext").filter(function(row) {
    return sanitizeText_(row.id) === id;
  });
  rows.sort(function(a, b) {
    return toNumber_(a.seq) - toNumber_(b.seq);
  });
  return rows.map(function(row) {
    var meta = null;
    var rawMeta = sanitizeText_(row.photo_meta_json);
    if (rawMeta) {
      meta = parseJsonSafe_(rawMeta, null);
    }
    return {
      seq: toNumber_(row.seq),
      url: sanitizeText_(row.photo_url),
      key: sanitizeText_(row.photo_key),
      meta: meta
    };
  }).filter(function(item) {
    return item.url;
  });
}
function getCardPublicShell_(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  var targetCardId = getTargetCardId_(req);
  if (!targetCardId) throw new Error("Missing card_id");
  var cache = CacheService.getScriptCache();
  var cacheKey = "hsc:card_shell:" + targetCardId;
  var rawCached = cache.get(cacheKey);
  if (rawCached) {
    try {
      var cached = JSON.parse(rawCached);
      // ★ 快取命中也要記瀏覽次數：recordCardView_ 現在走 CacheService，很快，
      // 不會拖慢回應。之前這裡直接 return，快取熱的時候瀏覽數完全不會被記到，
      // 熱門名片反而統計最不準。
      try { recordCardView_(targetCardId); } catch(_e) {}
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

  // === v8.4.3:取第一張加購照片與第一個加購 CTA(供 shell 顯示用)===
  var firstPhotoUrl = sanitizeText_(found.photo1_url);
  if (!firstPhotoUrl) {
    var photoExts = getCardPhotoExtensions_(getRowCardId_(found));
    if (photoExts.length > 0) firstPhotoUrl = photoExts[0].url;
  }
  var firstCtaText = sanitizeText_(found.cta_text_1);
  var firstCtaLink = sanitizeText_(found.cta_link_1);
  if (!firstCtaText && !firstCtaLink) {
    var ctaExts = getCardCtaExtensions_(getRowCardId_(found));
    if (ctaExts.length > 0) {
      firstCtaText = ctaExts[0].text;
      firstCtaLink = ctaExts[0].link;
    }
  }

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
    photo1_url: firstPhotoUrl,
    cta_text_1: firstCtaText,
    cta_link_1: firstCtaLink,
    marquee_text: sanitizeText_(found.marquee_text),
    marquee_enabled: toBooleanString_(found.marquee_enabled),
    payment_due_at: sanitizeText_(found.payment_due_at),
    payment_paid_at: sanitizeText_(found.payment_paid_at),
    expires_at: sanitizeText_(found.expires_at),
    experience: sanitizeText_(found.experience),
    services: sanitizeText_(found.services),
    phone: sanitizePhoneAsText_(found.phone),
    email: sanitizeText_(found.email),
    line_url: sanitizeText_(found.line_url),
    line_oa: sanitizeText_(found.line_oa),
    address: sanitizeText_(found.address),
    website: sanitizeText_(found.website)
  };
  cache.put(cacheKey, JSON.stringify(shell), 180);
   try { recordCardView_(targetCardId); } catch(_e) {}
  return { ok: true, version: HSC_VERSION, action: "getCardPublicShell", card_id: targetCardId, cached: false, card: shell };
}


// ============================================================
// 路由與主函式
// ============================================================

function doGet(e) {
  Logger.log("RAW GET e = " + JSON.stringify(e || {}));
  Logger.log("RAW GET e.parameter = " + JSON.stringify((e && e.parameter) ? e.parameter : {}));
  
  // ↓ v7.14.1 邀請碼驗證攔截(doGet)
  var _p = (e && e.parameter) || {};
  var _act = String(_p.action || "").trim();
  if (_act === "validateInviteCode" || _act === "checkInviteCode" ||
      _act === "getInviteByCode" || _act === "validateInvite" ||
      _act === "checkInvite" || _act === "getInvite") {
    var _result = __validateInviteCode_patch_({ params: _p, body: _p, action: _act });
    return ContentService
      .createTextOutput(JSON.stringify(_result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // ↓ OG 預覽（LINE/微信爬蟲用）
  if (_act === "ogPreview") {
    var _cardId = String(_p.id || "").trim();
    if (_cardId) {
      try {
        var _ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var _sheet = _ss.getSheetByName("card_db");
        var _data = _sheet.getDataRange().getValues();
        var _headers = _data[0];
        var _idIdx = _headers.indexOf("id");
        var _nameIdx = _headers.indexOf("name");
        var _titleIdx = _headers.indexOf("title");
        var _companyIdx = _headers.indexOf("company");
        var _avatarIdx = _headers.indexOf("avatar_url");
        var _card = null;
        for (var _i = 1; _i < _data.length; _i++) {
          if (String(_data[_i][_idIdx]) === _cardId) { _card = _data[_i]; break; }
        }
        if (_card) {
          var _name = _card[_nameIdx] || "天使幸福智慧名片";
          var _title = _card[_titleIdx] || "";
          var _company = _card[_companyIdx] || "";
          var _desc = [_title, _company].filter(Boolean).join(" | ") || "智慧名片訂製";
          var _avatarRaw = _card[_avatarIdx] || "";
          var _avatarM = _avatarRaw.match(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^\/]+\/o\/([^?]+)/i);
          var _avatar = _avatarM ? "https://angel-namecard.letssyncus.com/img/" + decodeURIComponent(_avatarM[1]) : _avatarRaw;
          var _url = "https://angel-namecard.letssyncus.com/index.html?id=" + _cardId + "&view=1&share_card_id=" + _cardId;
          var _html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<meta property="og:title" content="' + _name + '">' +
            '<meta property="og:description" content="' + _desc + '">' +
            '<meta property="og:image" content="' + _avatar + '">' +
            '<meta property="og:url" content="' + _url + '">' +
            '<meta property="og:type" content="website">' +
            '<meta http-equiv="refresh" content="0;url=' + _url + '">' +
            '</head><body></body></html>';
          return HtmlService.createHtmlOutput(_html);
        }
      } catch(_e) { Logger.log("ogPreview error: " + _e); }
    }
  }
  // ↑ OG 預覽結束/ ↑ v7.14.1 邀請碼驗證攔截結束
  
  return routeAction_(e || {}, "GET");
}
function doPost(e) {
  Logger.log("RAW POST e = " + JSON.stringify(e || {}));
  return routeAction_(e || {}, "POST");
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

// ★ 校驗 ref 是否對應真實存在的卡片或代理商，避免髒資料（例如系統保護卡、
// 前端 fallback 產生的錯誤值）流入推薦鏈路，最後污染分潤歸屬。
// 查無此人、空值、或系統保護卡一律回傳空字串（等同「無推薦來源」）。
function resolveValidatedRequestRef_(rawRef) {
  var ref = sanitizeText_(rawRef);
  if (!ref) return "";
  if (SYSTEM_PROTECTED_UPGRADE_IDS.indexOf(ref) !== -1) return "";
  if (findRowByField_("card_db", "id", ref)) return ref;
  if (findRowByField_("agent_db", "agent_id", ref)) return ref;
  return "";
}

function createRequest_(req) {
  var tenant = getTenant_(req);
  var now = new Date();
  var requestId = sanitizeText_(req.request_id || req.requestId) || generateRequestId_();
  ensureUniqueValue_("request_db", "request_id", requestId);
  var row = emptyRow_("request_db");
  row.request_id = requestId;
  row.created_at = toIso_(now);
  row.ref = resolveValidatedRequestRef_(req.ref);
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

function getRequests_(req) {
  ensureSchemasOrThrow_(["request_db"]);
  req = req || {};
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status).toLowerCase();
  var ref = sanitizeText_(req.ref).toLowerCase();
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var light = parseBoolClean_(req.light, false);
  var rows = getSheetRowsByName_("request_db").filter(function(row) { return sameTenant_(row.tenant, tenant); });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status).toLowerCase() === status; });
  if (ref) rows = rows.filter(function(row) { return sanitizeText_(row.ref).toLowerCase() === ref; });
  if (keyword) rows = rows.filter(function(row) {
    var hay = [row.request_id,row.ref,row.status,row.assigned_invite_code,row.note].map(function(x){ return sanitizeText_(x).toLowerCase(); }).join(" ");
    return hay.indexOf(keyword) !== -1;
  });
  rows.sort(function(a, b) { return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });
  rows = sliceRowsClean_(rows, req, 50, 500);
  if (light) rows = rows.map(toLightRequestClean_);
  return { ok: true, version: HSC_VERSION, action: "getRequests", requests: rows, limit: parseLimitClean_(req.limit,50,500), offset: parseOffsetClean_(req.offset), light: light };
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
    update_eligibility: evaluateUpdateEligibilityForCard_(displayCard),
    tracking_context: trackingContext,
    tracking: trackingResult
  };
}


function normalizePublicCardPayload_(card) {
  if (!card) return null;

  var cardId = getRowCardId_(card);

  // === v8.4.3:動態讀上限 + 合併擴充分頁 ===
  var PHOTO_HARD_CAP = 30;  // v459 對齊 PHOTO_EXT_MAX
  var CTA_HARD_CAP   = 50;  // v459 對齊 CTA_EXT_MAX

  var photoLimit = Math.min(PHOTO_HARD_CAP, Math.max(0, toNumber_(card.photo_limit, 10)));
  var ctaLimit   = Math.min(CTA_HARD_CAP,   Math.max(0, toNumber_(card.cta_limit,   3)));

  // 讀加購擴充(雙軌優先)
  var photoExts = getCardPhotoExtensions_(cardId);
  var ctaExts   = getCardCtaExtensions_(cardId);

  // ---- 組 photos(按 1~PHOTO_HARD_CAP 掃)----
  var photos = [];
  var photoMetaMap = {};  // 收集 photo_meta 合併到 features_json
  for (var i = 1; i <= PHOTO_HARD_CAP; i++) {
    var photoUrl = "";
    var photoKey = "";

    if (i <= 10) {
      // 主表優先(photo1~10)
      photoUrl = sanitizeText_(card["photo" + i + "_url"]);
      photoKey = sanitizeText_(card["photo" + i + "_key"]);
    }

    // 主表沒有 → 去擴充分頁找(按 seq 對應)
    if (!photoUrl) {
      var ext = null;
      for (var k = 0; k < photoExts.length; k++) {
        if (photoExts[k].seq === i) { ext = photoExts[k]; break; }
      }
      if (ext) {
        photoUrl = ext.url;
        photoKey = ext.key;
        if (ext.meta && typeof ext.meta === "object") {
          photoMetaMap[i] = ext.meta;
        }
      }
    }

    if (photoUrl) photos.push(photoUrl);
  }

  // ---- 組 ctas(按 1~CTA_HARD_CAP 掃)----
  var ctas = [];
  for (var j = 1; j <= CTA_HARD_CAP; j++) {
    var ctaText = "";
    var ctaLink = "";

    if (j <= 3) {
      // 主表優先(cta_text/link 1~3)
      ctaText = sanitizeText_(card["cta_text_" + j]);
      ctaLink = sanitizeText_(card["cta_link_" + j]);
    }

    // 主表沒有 → 去擴充分頁找
    if (!ctaText && !ctaLink) {
      var ctaExt = null;
      for (var m = 0; m < ctaExts.length; m++) {
        if (ctaExts[m].seq === j) { ctaExt = ctaExts[m]; break; }
      }
      if (ctaExt) {
        ctaText = ctaExt.text;
        ctaLink = ctaExt.link;
      }
    }

    if (ctaText || ctaLink) {
      ctas.push({ text: ctaText, link: ctaLink });
    }
  }

  // ---- 合併 photo_meta 到 features_json ----
  var featuresRaw = sanitizeText_(card.features_json);
  var features = featuresRaw ? parseJsonSafe_(featuresRaw, {}) : {};
  if (!features || typeof features !== "object") features = {};
  if (Object.keys(photoMetaMap).length > 0) {
    features.photo_meta = Object.assign({}, features.photo_meta || {}, photoMetaMap);
  }
  var featuresJsonOut = JSON.stringify(features);

  return {
    card_id: cardId,
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
    photo_limit: String(photoLimit),
    photos: photos,

    ctas: ctas,
    cta_limit: String(ctaLimit),

    marquee_purchased: toBooleanString_(card.marquee_purchased),
    marquee_enabled: toBooleanString_(card.marquee_enabled),
    marquee_text: sanitizeText_(card.marquee_text),

    features_json: featuresJsonOut,
    form_source: sanitizeText_(card.form_source),
    process_status: sanitizeText_(card.process_status)
  };
}
function getCardPublicLite_(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  var targetCardId = getTargetCardId_(req);
  if (!targetCardId) throw new Error("Missing card_id");
  var cached = getPublicCardCache_(targetCardId);
  if (cached) {
    return { ok: true, version: HSC_VERSION, action: "getCardPublicLite", card_id: targetCardId, cached: true, card: cached };
  }
  var rows = getSheetRowsByName_("card_db");
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || {};
    if (getRowCardId_(row) === targetCardId) { found = row; break; }
  }
  if (!found) throw new Error("Card not found");
  var cardStatus = sanitizeText_(found.status).toLowerCase();
  if (cardStatus && ["inactive", "draft", "deleted"].indexOf(cardStatus) !== -1) throw new Error("Card unavailable");
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
  if (publicSource.agent_type !== undefined) publicSource.agent_type = normalizeAgentTypeForDisplay_(publicSource.agent_type);
  
  var payload = normalizePublicCardPayload_(publicSource);
  // ★ 合併 ext 表（CTA 第4個起 / 照片第11張起）
    payload = mergeExtCtas_(targetCardId, payload);
    payload = mergeExtPhotos_(targetCardId, payload);
    setPublicCardCache_(targetCardId, payload, 180);
    return { ok: true, version: HSC_VERSION, action: "getCardPublicLite", card_id: targetCardId, cached: false, card:
  payload };
  }

function getCardForUpdate_(req) {
  var token  = sanitizeText_(req.update_token || req.token);
  var cardId = sanitizeText_(req.card_id);
  if (!token) throw new Error("Missing update token");

  // 先嘗試用 update_token 欄位找(正式流程)
  var card = findRowByField_("card_db", "update_token", token);

  // 找不到 → fallback:用 card_id 找,並驗證 token 是否等於 card_id
  // 過渡期相容:舊卡片 update_token 欄位為空時使用
  if (!card && cardId && token === cardId) {
    card = findRowByField_("card_db", "id", cardId);
  }

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
  mergeExtCtas_(displayCard.card_id, displayCard);
  mergeExtPhotos_(displayCard.card_id, displayCard);
  // 以實際 ext 資料上修 cta_limit / photo_limit（防 card_db 舊值偏低）
  var _uctaMax = 0;
  for (var _ui = 1; _ui <= 50; _ui++) {
    if (sanitizeText_(displayCard["cta_text_" + _ui]) || sanitizeText_(displayCard["cta_link_" + _ui])) _uctaMax = _ui;
  }
  if (_uctaMax > Number(displayCard.cta_limit || 0)) displayCard.cta_limit = String(_uctaMax);
  var _uphMax = 0;
  for (var _uj = 11; _uj <= 30; _uj++) {
    if (sanitizeText_(displayCard["photo" + _uj + "_url"])) _uphMax = _uj;
  }
  if (_uphMax > Number(displayCard.photo_limit || 0)) displayCard.photo_limit = String(_uphMax);
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
    // ★ 卡號一律轉大寫再比對，避免交付連結/表單傳入大小寫不一致時查不到卡
    // （真正的 update_token 是系統產生的 UUID，維持原樣比對，不受影響）
    var cardId = sanitizeText_(req.card_id).toUpperCase();
    if (!token) throw new Error("Missing update token");

    // 🔒 鎖定：保護「讀卡片 → clone → 套用欄位 → 寫回 card_db」整段，
    // 避免客戶在不同裝置/分頁併發送出更新時，後寫入的把先寫入的悄悄蓋掉（無聲吃單）。
    // saveOverflowCtas_ / saveOverflowPhotos_ 各自有獨立的鎖，故意放在這個鎖釋放「之後」
    // 才呼叫，不做巢狀鎖定。
    var updatedCard, eligibility, allowedFields;
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (lockErr) {
      throw new Error("系統忙碌，無法完成更新，請稍後再試。");
    }

    try {
      var card = findRowByField_("card_db", "update_token", token);
      if (!card && cardId && token.toUpperCase() === cardId) {
        card = findRowByField_("card_db", "id", cardId);
      }
      if (!card) throw new Error("Card not found for update token");

      eligibility = evaluateUpdateEligibilityForCard_(card);
      if (eligibility.charge_required && !eligibility.paid_ready) {
        throw new Error("Update fee payment required before update");
      }

      var plan = ensurePlanExists_(card.plan, card.tenant);
      var normalizedInput = normalizeUpdateCardReqFields_(req);
      allowedFields = resolveUpdateAllowedFields_(card, plan);
      updatedCard = shallowClone_(card);

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
    } finally {
      try {
        lock.releaseLock();
      } catch (releaseErr) {
        Logger.log("updateCardByToken_ lock release failed: " + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
      }
    }

    // ★ 儲存 overflow CTA（第4個起）和 overflow 照片（第11張起）到 ext 表
    // saveOverflowCtas_ / saveOverflowPhotos_ 內部有自己獨立的 LockService，
    // 而且現在失敗會 throw（不再吞掉錯誤），這裡不用額外 try/catch，讓錯誤自然往上拋，
    // 避免明明存失敗卻回傳「更新成功」給客戶。
    var _extCardId = updatedCard.id || updatedCard.card_id || cardId;
    saveOverflowCtas_(_extCardId, req);
    saveOverflowPhotos_(_extCardId, req);

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

// ============================================================
// 付款相關
// ============================================================

function hasAgentUpgradeAddonInPayment_(payment) {
  payment = payment || {};

  // v7.13: 擴充偵測來源與碼別
  //   新碼 addon_direct_partner(首次成交/續約/加購皆可用)
  //   舊碼 addon_agent_upgrade(已下架但歷史資料相容)

  // 來源 1: order_summary_json 裡的 addon_items(歷史資料、前端可能這樣送)
  var summaryObj = parseJsonSafe_(payment.order_summary_json, {});
  var addonItems = Array.isArray(summaryObj && summaryObj.addon_items) ? summaryObj.addon_items : [];
  if (addonItems.some(function(item) {
    var code = normalizeAddonItemCode_(item && (item.item_code || item.code));
    return code === "addon_direct_partner" || code === "addon_agent_upgrade";
  })) {
    return true;
  }

  // 來源 2: payment.note 裡的 addon=xxx 字串(v7.13 起主要來源,透過 composeAddonNoteFromItems_ 寫入)
  var parsedNoteItems = parseAddonItemsFromNote_(payment.note);
  if (parsedNoteItems.some(function(item) {
    var code = sanitizeText_(item && item.item_key).toLowerCase();
    return code === "addon_direct_partner" || code === "addon_agent_upgrade";
  })) {
    return true;
  }

  // 來源 3: addon_summary 文字欄(極舊歷史資料)
  var addonSummaryText = sanitizeText_(payment.addon_summary);
  if (addonSummaryText) {
    if (/(^|[\s,;|:/])agent_upgrade_fee($|[\s,;|:/])/.test(addonSummaryText)) return true;
    if (/(^|[\s,;|:/])addon_direct_partner($|[\s,;|:/])/.test(addonSummaryText)) return true;
  }

  return false;
}
/**
 * 付款確認後，將 addon_items 寫入 add_on_order_db
 * first_payment 和 renewal 都處理
 */
function createAddonOrdersFromPayment_(payment, card, eventType) {
  if (!payment || !card) return [];
  var paymentId = sanitizeText_(payment.payment_id);
  var cardId = sanitizeText_(card.id || card.card_id);
  if (!paymentId || !cardId) return [];

  var now = new Date();
  var nowIso = toIso_(now);
  var tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  var noteLabel = eventType || "first_payment";
  var created = [];

  // renewal 即使沒有 addon items，也必須繼續執行權益 reconciliation。
  var addonItems = parseAddonItemsFromNote_(payment.note);
  addonItems = Array.isArray(addonItems) ? addonItems : [];
  if (!addonItems.length && noteLabel !== "renewal") {
    return created;
  }

  addonItems.forEach(function(item) {
    var code = sanitizeText_(item.item_key || item.code || "");
    if (!code) return;

    // 防重複：同一付款同一 addon_key 已有 paid 紀錄就跳過（允許不同付款重複購買）
    try {
      var existing = getSheetRowsByName_("add_on_order_db").filter(function(row) {
        return sanitizeText_(row.card_id) === cardId &&
               sanitizeText_(row.payment_id) === paymentId &&
               sanitizeText_(row.addon_key || row.item_code || row.addon_type) === code &&
               sanitizeText_(row.status).toLowerCase() === "paid";
      });
      if (existing.length > 0) return;
    } catch(e) {}

    var row = emptyRow_("add_on_order_db");
    row.addon_order_id = "AO" + Utilities.formatDate(now, CONFIG.DEFAULT_TIMEZONE, "yyyyMMddHHmmss") +
                         Math.floor(Math.random() * 9000 + 1000);
    row.card_id = cardId;
    row.created_at = nowIso;
    row.updated_at = nowIso;
    row.addon_type = code;
    row.addon_key = code;
    row.qty = String(toNumber_(item.qty) || 1);
    row.unit_price = String(roundMoney_(toNumber_(item.amount) / Math.max(1, toNumber_(item.qty) || 1)));
    row.amount = String(roundMoney_(toNumber_(item.amount)));
    row.status = "paid";
    row.paid_at = nowIso;
    row.payment_id = paymentId;
    row.note = "auto_created_from_" + noteLabel;
    row.created_by = "system";
    row.tenant = tenant;
    row.is_test = sanitizeText_(card.is_test) || "FALSE";
    row.item_code = code;
    row.item_name = sanitizeText_(item.name || code);
    row.applied_at = nowIso;
    row.applied_note = noteLabel + "_confirmed";

    appendRowByName_("add_on_order_db", row);

    if (noteLabel === "first_payment") {
      created.push(code);
      return;
    }

     // ★ v448：確認加購後自動更新 card_db 的 photo_limit / cta_limit
      try {
        var addQty = Math.max(1, toNumber_(item.qty) || 1);
        var limitField = null;
        if (code === 'addon_photo' || code === 'photo_extra' || code === 'photo') limitField = 'photo_limit';
        else if (code === 'addon_cta' || code === 'cta_extra' || code === 'cta') limitField = 'cta_limit';
        if (limitField) {
          var freshCard = findRowByField_('card_db', 'id', cardId);
          if (freshCard) {
            var newVal = Math.max(0, toNumber_(freshCard[limitField]) || 0) + addQty;
            var cSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('card_db');
            var cData = cSheet.getDataRange().getValues();
            var cHeaders = cData[0];
            var cIdIdx = cHeaders.indexOf('id');
            var cFIdx  = cHeaders.indexOf(limitField);
            if (cIdIdx >= 0 && cFIdx >= 0) {
              for (var ri = 1; ri < cData.length; ri++) {
                if (String(cData[ri][cIdIdx]) === String(cardId)) {
                  cSheet.getRange(ri + 1, cFIdx + 1).setValue(String(newVal));
                  invalidateCacheOnWrite_("card_db");
                  invalidateCardPublicCache_(cardId);
                  Logger.log('[addon] ' + limitField + ' 更新: ' + cardId + ' → ' + newVal);
                  break;
                }
              }
            }
          }
        }
      } catch(eLim) { Logger.log('[addon] limit 更新失敗: ' + eLim.message); }

    created.push(code);
  });

  if (noteLabel === "renewal") {
    var renewal = findRowByField_("renewal_db", "payment_id", paymentId);
    if (!renewal) {
      Logger.log("[createAddonOrdersFromPayment_] renewal record missing: " + paymentId);
      return created;
    }

    var keepPhotoQty = Math.max(0, toNumber_(renewal.keep_photo_extra_qty) || 0);
    var keepCtaQty = Math.max(0, toNumber_(renewal.keep_cta_extra_qty) || 0);

    var freshCard = findRowByField_("card_db", "id", cardId);
    if (freshCard) {
      var currentPlanInfo = getPlanEntitlements_(freshCard.plan, tenant);
      var targetPlanCode = sanitizeText_(payment.plan) || sanitizeText_(freshCard.plan);
      var targetPlanInfo = getPlanEntitlements_(targetPlanCode, tenant);

      var currentBasePhoto = Math.max(0, toNumber_(currentPlanInfo.photo_limit_default));
      var currentBaseCta = Math.max(0, toNumber_(currentPlanInfo.cta_limit));
      var targetBasePhoto = Math.max(0, toNumber_(targetPlanInfo.photo_limit_default));
      var targetBaseCta = Math.max(0, toNumber_(targetPlanInfo.cta_limit));

      var manualPhotoDelta = Math.max(
        0,
        toNumber_(freshCard.photo_limit) - currentBasePhoto - Math.max(0, toNumber_(freshCard.photo_extra_purchased))
      );
      var manualCtaDelta = Math.max(
        0,
        toNumber_(freshCard.cta_limit) - currentBaseCta - Math.max(0, toNumber_(freshCard.cta_extra_purchased))
      );

      var reconciled = shallowClone_(freshCard);
      reconciled.photo_extra_purchased = String(keepPhotoQty);
      reconciled.cta_extra_purchased = String(keepCtaQty);
      reconciled.photo_limit = String(Math.min(PHOTO_LIMIT_ABSOLUTE_MAX, targetBasePhoto + keepPhotoQty + manualPhotoDelta));
      reconciled.cta_limit = String(targetBaseCta + keepCtaQty + manualCtaDelta);
      reconciled.updated_at = nowIso;

      try {
        updateRowByName_("card_db", freshCard.__rowNum, reconciled);
        invalidateCardPublicCache_(cardId);
      } catch (reconcileErr) {
        Logger.log("[createAddonOrdersFromPayment_] renewal reconciliation failed: " + reconcileErr.message);
      }
    }
  }

  return created;
}
function confirmPayment_(req) {
  var now = new Date();
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");

  // 🔒 鎖定：防止同一筆付款被併發請求（例如管理員手滑點兩下、或前端重試）重複確認、重複開卡
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    throw new Error("系統忙碌，無法完成付款確認，請稍後再試。");
  }

  try {
    return confirmPayment_locked_(req, paymentId, now);
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      Logger.log("confirmPayment_ lock release failed: " + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
    }
  }
}

// confirmPayment_ 的實際邏輯，全程在 LockService 保護下執行，不對外直接呼叫
function confirmPayment_locked_(req, paymentId, now) {
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
    // 🆕 v7.16.3:付款確認後,自動取消後續 LINE 推播提醒
  try {
    cancelPaymentReminders_(paymentId);
  } catch (cancelErr) {
    Logger.log("[reminder cancel] failed: " + cancelErr.message);
  }


  var cardResult = { card: null, agent_updates: [], renewal: null };
  // ★ 卡號一律轉大寫再比對，跟 updateCardByToken_ 同一套防呆標準
  var cardId = sanitizeText_(updatedPayment.card_id).toUpperCase();

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
      // 🆕 同步無限更新（首次建卡 + 續約都走這裡）
var addonItemsForUnlimited = parseAddonItemsFromNote_(updatedPayment.note);
var hasUnlimitedAddon = addonItemsForUnlimited.some(function(item) {
  var code = sanitizeText_(item.item_key || item.code || "");
  return code === "addon_bundle" || code === "update_unlimited";
});
if (hasUnlimitedAddon) {
  updatedCard.update_unlimited_enabled = "TRUE";
  updatedCard.update_unlimited_expires_at = sanitizeText_(updatedCard.expires_at);
} else if (eventType === "renewal" || orderType === "renewal") {
  updatedCard.update_unlimited_enabled = "FALSE";
  updatedCard.update_unlimited_expires_at = "";
}
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
        // ★ 續約時把顏色版型從 renewal_db 同步到 card_db
          var renewColor = sanitizeText_(renewal.color || "");
          var renewStyle = sanitizeText_(renewal.style || "");
          var renewPaper = sanitizeText_(renewal.paper || "");
          if (renewColor) updatedCard.color = renewColor;
          if (renewStyle) updatedCard.style = renewStyle;
          if (renewPaper) updatedCard.paper = renewPaper;
          updateRowByName_("card_db", card.__rowNum, updatedCard);
          invalidateCardPublicCache_(updatedCard.id || updatedCard.card_id);
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
  // v7.13: 擴充升金偵測條件
  //   first_payment: 首次成交同時買 addon_direct_partner(新客戶直升金)
  //   renewal: 續約同時買 addon_direct_partner(已有卡的客戶/代理升金)
  //   addon_payment: 獨立加購 addon_direct_partner(原本就支援)
  // hasAgentUpgradeAddonInPayment_ 會偵測 addon_direct_partner 或舊的 addon_agent_upgrade
  if ((eventType === "first_payment" || eventType === "renewal" || eventType === "addon_payment") &&
      hasAgentUpgradeAddonInPayment_(updatedPayment)) {
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
// 🆕 建卡付款確認 → 寫入 add_on_order_db
if (eventType === "first_payment" && cardResult.card) {
  try {
    createAddonOrdersFromPayment_(updatedPayment, cardResult.card);
  } catch (addonOrderErr) {
    Logger.log("[confirmPayment_] createAddonOrdersFromPayment_ failed: " + addonOrderErr.message);
  }
}
// 🆕 續約付款確認 → 寫入 add_on_order_db
if (eventType === "renewal" && cardResult.card) {
  try {
    createAddonOrdersFromPayment_(updatedPayment, cardResult.card, "renewal");
  } catch (addonOrderErr) {
    Logger.log("[confirmPayment_] createAddonOrdersFromPayment_ renewal failed: " + addonOrderErr.message);
  }
}
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

        // ─────────────────────────────────────────────
        // 🆕 付款確認後自動交付:推客戶新版文案 + 推管理員摘要
        // ─────────────────────────────────────────────
        try {
         var BASE = CONFIG.BASE_URL;
          var cardUrl     = BASE + "index.html?id=" + encodeURIComponent(targetId) + "&view=1";
          var deliveryUrl = BASE + "poster.html?id=" + encodeURIComponent(targetId);
         var hubUrl = BASE + "?ref=" + encodeURIComponent(targetId);
          var customerName = sanitizeText_(cardForNotify.name) || "您";
          var expiresAt    = sanitizeText_(cardForNotify.expires_at) || "—";
          var amount       = sanitizeText_(finalPayment.amount) || "—";
          var plan         = sanitizeText_(cardForNotify.plan) || "—";

          // ── 1. 推客戶(升級版:交付卡 + 三種分享) ──
          var customerLineUid = sanitizeText_(cardForNotify.line_user_id);
          var customerDelivered = false;
          var customerFailReason = "";

          if (customerLineUid && /^U[0-9a-f]{32}$/i.test(customerLineUid)) {
            var customerMsg =
              "✅ 付款確認完成,感謝 " + customerName + " 的信任 ❤️\n\n" +
              "服務使用期限:" + expiresAt + " 到期\n\n" +
              "━━━━━━━━━━━━━━━━━\n" +
              "🔐【您的專屬交付卡】\n" + deliveryUrl + "\n\n" +
              "⚠️ 這是個人管理入口,請勿轉傳\n" +
              "建議加到手機桌面,隨時使用 📱\n\n" +
              "打開可以:\n" +
              "✏️ 更新名片 / 🔄 辦理續約 / 📊 查推薦點數\n" +
              "━━━━━━━━━━━━━━━━━\n\n" +
              "💡 想讓朋友認識您?請用下面三種 👇\n\n" +
              "📇 我的智慧名片(主要分享連結)\n" + cardUrl + "\n" +
              "→ 放 LINE 簡介、IG、簽名檔、群組\n\n" +
              "🖼️ 名片海報\n" +
              "打開交付卡 → 點「下載海報」→ 存圖分享\n\n" +
              "🏛️ 智慧名片館(推薦服務用)\n" + hubUrl + "\n\n" +
              "━━━━━━━━━━━━━━━━━\n" +
              "有任何問題歡迎在此對話 🙏";

            var customerResult = notifyAdminLine_({
              title: "",
              message: customerMsg,
              to: customerLineUid
            });
            customerDelivered = !!(customerResult && customerResult.ok);
            if (!customerDelivered) customerFailReason = (customerResult && customerResult.reason) || "unknown";

            Logger.log("confirmPayment_ notify customer: "
              + JSON.stringify({ card_id: targetId, uid: customerLineUid, ok: customerDelivered }));

            writeOpsLog_({
              module: "delivery",
              action: "auto_delivered_to_customer",
              target_id: targetId,
              before_status: "paid",
              after_status: customerDelivered ? "delivered" : "delivery_failed",
              operator: "system",
              note: "LINE 自動交卡:" + (customerDelivered ? "成功" : "失敗:" + customerFailReason)
            });
          } else {
            customerFailReason = "no_line_user_id";
            Logger.log("confirmPayment_ no line_user_id for card: " + targetId);
          }

          // ── 1.5 雙軌並發：付款確認是最關鍵的一則通知，客戶只要有留信箱，
          //     不管 LINE 有沒有成功都額外寄一封 Email，不是等 LINE 失敗才寄 ──
          try {
            var customerEmailForNotify = sanitizeText_(cardForNotify.email || cardForNotify.owner_email);
            if (customerEmailForNotify) {
              var dualEmailHtml = buildBackupEmailHtml_(
                "✅ 付款確認完成，感謝 " + customerName + " 的信任",
                "服務使用期限：" + expiresAt + " 到期\n\n" +
                "【您的專屬交付卡】\n" + deliveryUrl + "\n（個人管理入口，請勿轉傳）\n\n" +
                "【您的智慧名片】\n" + cardUrl + "\n（可分享給朋友認識您）"
              );
              var dualEmailResult = sendBackupEmailNotification_(
                customerEmailForNotify,
                "✅ 付款確認完成 - 您的智慧名片已開通",
                dualEmailHtml
              );
              Logger.log("confirmPayment_ 雙軌 Email 通知結果: " + JSON.stringify(dualEmailResult));
            }
          } catch (dualEmailErr) {
            Logger.log("confirmPayment_ 雙軌 Email 通知失敗: " + (dualEmailErr && dualEmailErr.message ? dualEmailErr.message : String(dualEmailErr)));
          }

          // ── 2. 推管理員摘要(不論客戶有沒有綁 LINE 都推) ──
          var adminSummary;
          if (customerDelivered) {
            adminSummary =
              "📦 交付卡已自動發送\n\n" +
              "客戶:" + customerName + "(" + targetId + ")\n" +
              "付款:NT$ " + amount + "\n" +
              "方案:" + plan + "\n" +
              "到期:" + expiresAt + "\n\n" +
              "─────────────\n" +
              "🔐 交付卡(客戶管理頁):\n" + deliveryUrl + "\n\n" +
              "📇 名片(可分享):\n" + cardUrl;
          } else {
            adminSummary =
              "⚠️ 需手動交卡\n\n" +
              "客戶:" + customerName + "(" + targetId + ")\n" +
              "付款:NT$ " + amount + "\n" +
              "電話:" + sanitizeText_(cardForNotify.phone) + "\n" +
              "原因:" + (customerFailReason === "no_line_user_id" ? "客戶未綁 LINE" : customerFailReason) + "\n\n" +
              "─────────────\n" +
              "請手動聯繫客戶交付:\n" +
              "🔐 交付卡:\n" + deliveryUrl + "\n\n" +
              "📇 名片:\n" + cardUrl;
          }

          writeOpsLog_({
            module: "delivery",
            action: "admin_delivery_summary",
            target_id: targetId,
            after_status: customerDelivered ? "delivered" : "delivery_failed",
            operator: "system",
            note: adminSummary
          });
        } catch (customerErr) {
          Logger.log("confirmPayment_ delivery notify error: " + customerErr.message);
        }
        // ─────────────────────────────────────────────
      }
    } catch (err) {
      Logger.log("confirmPayment_ notification error: " + err.message);
    }
  }
  // ═══════════════════════════════════════════════════════
  // 🆕 續約付款確認 → 推播客戶 + 推播管理員
  // ═══════════════════════════════════════════════════════
  if ((eventType === "renewal" || orderType === "renewal") && finalPayment.status === "paid") {
    try {
      var cardForRenew = cardResult.card || findRowByField_("card_db", "id", cardId);
      if (cardForRenew) {
        var renewTargetId   = sanitizeText_(cardForRenew.id);
        var renewCustomerName = sanitizeText_(cardForRenew.name) || "您";
        var renewNewExpires = sanitizeText_(cardForRenew.expires_at) || "—";
        var renewAmount     = sanitizeText_(finalPayment.amount) || "—";
       var renewBASE = CONFIG.BASE_URL;
        var renewDeliveryUrl = renewBASE + "poster.html?id=" + encodeURIComponent(renewTargetId);
        var renewCardUrl     = renewBASE + "index.html?id=" + encodeURIComponent(renewTargetId) + "&view=1";

        // ── 1. 推客戶(續約成功通知) ──
        var renewCustomerUid = sanitizeText_(cardForRenew.line_user_id);
        var renewDelivered = false;
        var renewFailReason = "";

        if (renewCustomerUid && /^U[0-9a-f]{32}$/i.test(renewCustomerUid)) {
          var renewCustomerMsg =
            "🔄 續約成功\n" +
            "感謝 " + renewCustomerName + " 繼續使用 ❤️\n\n" +
            "📅 新到期日:" + renewNewExpires + "\n" +
            "💰 續約金額:NT$ " + renewAmount + "\n\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "🔐【您的交付卡】\n" + renewDeliveryUrl + "\n\n" +
            "您的名片內容完全保留\n" +
            "無需重新設定任何資料 ✨\n" +
            "━━━━━━━━━━━━━━━━━\n\n" +
            "📇 繼續分享您的名片:\n" + renewCardUrl + "\n\n" +
            "有任何問題歡迎在此對話 🙏";

          var renewResult = notifyAdminLine_({
            title: "",
            message: renewCustomerMsg,
            to: renewCustomerUid
          });
          renewDelivered = !!(renewResult && renewResult.ok);
          if (!renewDelivered) renewFailReason = (renewResult && renewResult.reason) || "unknown";

          Logger.log("confirmPayment_ notify renewal customer: "
            + JSON.stringify({ card_id: renewTargetId, uid: renewCustomerUid, ok: renewDelivered }));

          writeOpsLog_({
            module: "renewal",
            action: "auto_notify_customer",
            target_id: renewTargetId,
            before_status: "paid",
            after_status: renewDelivered ? "notified" : "notify_failed",
            operator: "system",
            note: "LINE 續約通知:" + (renewDelivered ? "成功" : "失敗:" + renewFailReason)
          });
        } else {
          renewFailReason = "no_line_user_id";
          Logger.log("confirmPayment_ no line_user_id for renewal: " + renewTargetId);
        }

        // ── 2. 推管理員續約摘要 ──
        var renewAdminMsg;
        if (renewDelivered) {
          renewAdminMsg =
            "🔄 續約成功\n\n" +
            "客戶:" + renewCustomerName + "(" + renewTargetId + ")\n" +
            "續約金額:NT$ " + renewAmount + "\n" +
            "新到期日:" + renewNewExpires + "\n" +
            "客戶通知:已自動發送\n\n" +
            "─────────────\n" +
            "📇 名片:\n" + renewCardUrl;
        } else {
          renewAdminMsg =
            "🔄 續約成功(需手動通知)\n\n" +
            "客戶:" + renewCustomerName + "(" + renewTargetId + ")\n" +
            "續約金額:NT$ " + renewAmount + "\n" +
            "新到期日:" + renewNewExpires + "\n" +
            "電話:" + sanitizeText_(cardForRenew.phone) + "\n" +
            "原因:" + (renewFailReason === "no_line_user_id" ? "客戶未綁 LINE" : renewFailReason) + "\n\n" +
            "─────────────\n" +
            "📇 名片:\n" + renewCardUrl;
        }

        writeOpsLog_({
          module: "renewal",
          action: "admin_renewal_summary",
          target_id: renewTargetId,
          after_status: renewDelivered ? "notified" : "notify_failed",
          operator: "system",
          note: renewAdminMsg
        });
      }
    } catch (renewErr) {
      Logger.log("confirmPayment_ renewal notify error: " + renewErr.message);
    }
  }
  // ═══════════════════════════════════════════════════════
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
// ═══════════════════════════════════════════════════════
// 🆕 暫存更新內容(付費更新流程用)
// 前端在提交更新但需付費時,先把要寫入的內容存到 update_pending_db
// ═══════════════════════════════════════════════════════
function savePendingUpdate_(req) {
  var now = new Date();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);

  if (!cardId) throw new Error("Missing card_id");
  if (!paymentId) throw new Error("Missing payment_id");

  // 確認卡片存在
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found: " + cardId);

  // 確認付款單存在
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) throw new Error("Payment not found: " + paymentId);

  // 取出要存的 payload(排除不該存的欄位)
  var payloadToSave = shallowClone_(req);
  delete payloadToSave.action;
  delete payloadToSave.card_id;
  delete payloadToSave.cardId;
  delete payloadToSave.payment_id;
  delete payloadToSave.paymentId;
  delete payloadToSave.update_token;
  delete payloadToSave.updateToken;

  // 檢查是否已有 pending 記錄(同 card_id + payment_id)
  var existing = null;
  try {
    var rows = getSheetRowsByName_("update_pending_db");
    for (var i = 0; i < rows.length; i++) {
      if (sanitizeText_(rows[i].card_id) === cardId &&
          sanitizeText_(rows[i].payment_id) === paymentId) {
        existing = rows[i];
        break;
      }
    }
  } catch (err) {
    Logger.log("savePendingUpdate_ check existing error: " + err.message);
  }

  var pendingId;
  if (existing) {
    // 已存在 → 覆蓋更新(客戶可能重複送出)
    pendingId = sanitizeText_(existing.pending_id);
    var updatedRow = shallowClone_(existing);
    updatedRow.payload_json = JSON.stringify(payloadToSave);
    updatedRow.status = "pending";
    updatedRow.created_at = toIso_(now);
    updatedRow.note = "updated at " + toIso_(now);
    updateRowByName_("update_pending_db", existing.__rowNum, updatedRow);
  } else {
    // 新增
    pendingId = "UP" + Utilities.formatDate(now, "Asia/Taipei", "yyyyMMddHHmmss") + 
                Math.random().toString(36).slice(2, 6).toUpperCase();
    var newRow = {
      pending_id: pendingId,
      card_id: cardId,
      payment_id: paymentId,
      status: "pending",
      payload_json: JSON.stringify(payloadToSave),
      created_at: toIso_(now),
      applied_at: "",
      operator: "system",
      note: "created"
    };
    appendRowByName_("update_pending_db", newRow);
  }

  writeOpsLog_({
    module: "update_fee",
    action: "pending_saved",
    target_id: cardId,
    before_status: "",
    after_status: "pending",
    operator: "system",
    note: "pending_id=" + pendingId + " payment_id=" + paymentId
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "savePendingUpdate",
    pending_id: pendingId,
    card_id: cardId,
    payment_id: paymentId
  };
}
// ═══════════════════════════════════════════════════════
// 🆕 套用暫存的更新內容(付款確認後由 confirmUpdateFeePaid_ 呼叫)
// ═══════════════════════════════════════════════════════
function applyPendingUpdate_(cardId, paymentId) {
  var now = new Date();
  cardId = sanitizeText_(cardId);
  paymentId = sanitizeText_(paymentId);

  if (!cardId) return { ok: false, reason: "missing_card_id" };
  if (!paymentId) return { ok: false, reason: "missing_payment_id" };

  // 找 pending 記錄
  var pending = null;
  try {
    var rows = getSheetRowsByName_("update_pending_db");
    for (var i = 0; i < rows.length; i++) {
      if (sanitizeText_(rows[i].card_id) === cardId &&
          sanitizeText_(rows[i].payment_id) === paymentId &&
          sanitizeText_(rows[i].status) === "pending") {
        pending = rows[i];
        break;
      }
    }
  } catch (err) {
    Logger.log("applyPendingUpdate_ lookup error: " + err.message);
    return { ok: false, reason: "lookup_failed" };
  }

  if (!pending) {
    Logger.log("applyPendingUpdate_ no pending found: card=" + cardId + " payment=" + paymentId);
    return { ok: false, reason: "no_pending_record" };
  }

  // 解析 payload
  var payload;
  try {
    payload = JSON.parse(pending.payload_json || "{}");
  } catch (err) {
    Logger.log("applyPendingUpdate_ JSON parse error: " + err.message);
    // 標記失敗
    var failRow = shallowClone_(pending);
    failRow.status = "failed";
    failRow.note = "JSON parse failed: " + err.message;
    updateRowByName_("update_pending_db", pending.__rowNum, failRow);
    return { ok: false, reason: "payload_parse_failed" };
  }

  // 找卡片
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) {
    var nfRow = shallowClone_(pending);
    nfRow.status = "failed";
    nfRow.note = "Card not found: " + cardId;
    updateRowByName_("update_pending_db", pending.__rowNum, nfRow);
    return { ok: false, reason: "card_not_found" };
  }

  // 覆蓋式更新卡片
  try {
    var updatedCard = shallowClone_(card);
    // 逐欄覆蓋(只覆蓋 payload 有帶的欄位,其他保留原值)
    Object.keys(payload).forEach(function(key) {
      // 跳過內部欄位
      if (key === "__rowNum") return;
      if (key === "id") return;
      if (key === "card_id") return;
      if (key === "tenant") return;
      if (key === "created_at") return;
      if (key === "plan") return;          // 更新時不能改方案
      if (key === "photo_limit") return;   // 不能改
      if (key === "cta_limit") return;     // 不能改
      if (key === "color") return;         // 不能改版型
      if (key === "style") return;
      if (key === "paper") return;

      // features_json 特別處理
      if (key === "features_json" || key === "features") {
        if (typeof payload[key] === "string") {
          updatedCard.features_json = payload[key];
        } else {
          updatedCard.features_json = JSON.stringify(payload[key]);
        }
        return;
      }

      updatedCard[key] = payload[key];
    });

    updatedCard.updated_at = toIso_(now);
    updateRowByName_("card_db", card.__rowNum, updatedCard);
    invalidateCardPublicCache_(updatedCard.id || updatedCard.card_id);

    // 標記 pending 為 applied
    var appliedRow = shallowClone_(pending);
    appliedRow.status = "applied";
    appliedRow.applied_at = toIso_(now);
    appliedRow.note = "applied successfully";
    updateRowByName_("update_pending_db", pending.__rowNum, appliedRow);

    writeOpsLog_({
      module: "update_fee",
      action: "pending_applied",
      target_id: cardId,
      before_status: "pending",
      after_status: "applied",
      operator: "system",
      note: "pending_id=" + pending.pending_id + " payment_id=" + paymentId
    });

    return {
      ok: true,
      pending_id: pending.pending_id,
      card_id: cardId,
      payment_id: paymentId,
      updated_card: updatedCard
    };

  } catch (err) {
    Logger.log("applyPendingUpdate_ apply error: " + err.message);
    var errRow = shallowClone_(pending);
    errRow.status = "failed";
    errRow.note = "Apply failed: " + err.message;
    updateRowByName_("update_pending_db", pending.__rowNum, errRow);
    return { ok: false, reason: "apply_failed", error: err.message };
  }
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
 if (sanitizeText_(payment.event_type) === "renewal" ||
    sanitizeText_(payment.payment_type) === "renewal") {
  try {
    refundRenewalPointsRedeem_(payment, sanitizeText_(req.operated_by || req.operatedBy || "system"));
  } catch (refundErr) {
    Logger.log("[markPaymentRefunded_] refund points failed: " + refundErr.message);
  }
  // R0e: 退款後還原到期日
  try {
    var renewalForRefund = findRowByField_("renewal_db", "payment_id", paymentId);
    if (renewalForRefund) {
      var updatedRenewal = shallowClone_(renewalForRefund);
      updatedRenewal.status = "refunded";
      updatedRenewal.billing_status = "refunded";
      updatedRenewal.updated_at = toIso_(now);
      updateRowByName_("renewal_db", renewalForRefund.__rowNum, updatedRenewal);
      var cardForRefund = findRowByField_("card_db", "id", sanitizeText_(renewalForRefund.card_id));
      if (cardForRefund) {
        var updatedCardForRefund = shallowClone_(cardForRefund);
        updatedCardForRefund.expires_at = sanitizeText_(renewalForRefund.current_expires_at);
        updatedCardForRefund.updated_at = toIso_(now);
        updateRowByName_("card_db", cardForRefund.__rowNum, updatedCardForRefund);
        invalidateCardPublicCache_(sanitizeText_(renewalForRefund.card_id));
      }
    }
  } catch (expiryErr) {
    Logger.log("[markPaymentRefunded_] restore expiry failed: " + expiryErr.message);
  }
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

function getCommissionByPayment_(req) {
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  var rows = findRowsByField_("commission_db", "payment_id", paymentId);
  return { ok: true, version: HSC_VERSION, action: "getCommissionByPayment", commissions: rows };
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
  var cache = CacheService.getScriptCache();
  cache.remove(getPublicCardCacheKey_(id));     // Lite 快取
  cache.remove("hsc:card_shell:" + id);         // ← v8.4.3:Shell 快取
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
  return toLiffUrl_(base + "form.html?ref=" + encodeURIComponent(agentId));
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

// ============================================================
// 請求層級 Sheet 快取
// ============================================================
var _sheetRowCache_ = {};
var _sheetRowCacheEnabled_ = true;




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
  try {
    invalidateCardPublicCache_(cardId);
  } catch (cacheErr) {
    Logger.log("[adminGrantAddon_] cache invalidation failed: " + cacheErr.message);
  }

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
   if (normalizeStatus_(row.status || "active") !== "active") continue;
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
// ═══════════════════════════════════════════════════════
// R0d:從 pricing_db 動態讀取 PRICING_V2 設定檔
// pricing_db 是「唯一真相來源」,改 spreadsheet 就改價
// 前端也透過 getPricingConfig action 取得這個設定
// ═══════════════════════════════════════════════════════

/**
 * 從 pricing_db 讀取階梯定價設定
 * 對特定 item_code(如 addon_photo / addon_cta)讀其 price + tier_config
 * tier_config 是 JSON 字串,描述階梯結構與不限數量價
 * 
 * @param {string} itemCode - 例如 "addon_photo" / "addon_cta"
 * @param {string} tenant - 租戶
 * @returns {object} { tiers: [...], unlimited: number } 或 null(該項無階梯)
 */
function getPricingV2ItemConfig_(itemCode, tenant) {
  var rowsCache = getPricingDbRows_(tenant);
  for (var i = 0; i < rowsCache.length; i++) {
    var row = rowsCache[i];
    if (sanitizeText_(row.item_code) === itemCode) {
      var basePrice = toNumber_(row.price);
      var tierConfigRaw = sanitizeText_(row.tier_config);
      
      if (!tierConfigRaw) {
        // 沒有階梯設定,只用基本單價
        return {
          tiers: [{ min: 1, perUnit: basePrice }],
          unlimited: 0
        };
      }
      
      try {
        var parsed = JSON.parse(tierConfigRaw);
        // 確保 base price 也作為最低階(min=1)
        var tiers = Array.isArray(parsed.tiers) ? parsed.tiers.slice() : [];
        // 補一個基準 tier(min=1)如果沒有的話
        var hasBaseTier = tiers.some(function(t) { return Number(t.min) === 1; });
        if (!hasBaseTier) {
          tiers.push({ min: 1, perUnit: basePrice });
        }
        // 排序:大的 min 在前(讓 calcQuantityAddon_ 找到最高符合的)
        tiers.sort(function(a, b) { return Number(b.min) - Number(a.min); });
        return {
          tiers: tiers,
          unlimited: toNumber_(parsed.unlimited) || 0
        };
      } catch (e) {
        Logger.log("getPricingV2ItemConfig_: JSON parse failed for " + itemCode + ": " + e.message);
        return {
          tiers: [{ min: 1, perUnit: basePrice }],
          unlimited: 0
        };
      }
    }
  }
  return null;
}

/**
 * 取得整個 PRICING_V2 設定(供前端透過 action getPricingConfig 讀取)
 * @param {string} tenant
 * @returns {object} { addon_photo: {tiers, unlimited}, addon_cta: {tiers, unlimited} }
 */
function getPricingConfigV2_(tenant) {
  return {
    addon_photo: getPricingV2ItemConfig_("addon_photo", tenant) || { tiers: [{ min: 1, perUnit: 80 }], unlimited: 6000 },
    addon_cta: getPricingV2ItemConfig_("addon_cta", tenant) || { tiers: [{ min: 1, perUnit: 80 }], unlimited: 8000 }
  };
}
/**
 * 公開 API:取得 PRICING_V2 設定檔(供前端呼叫)
 * 前端透過 action: "getPricingConfig" 取得階梯定價設定
 * 對應 routeAction_ 的 case "getPricingConfig"
 */
function getPricingConfig_(req) {
  var tenant = sanitizeText_(req.tenant) || CONFIG.DEFAULT_TENANT;
  var config = getPricingConfigV2_(tenant);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPricingConfig",
    tenant: tenant,
    pricing_v2: config
  };
}
/**
 * 工具:讀整個 pricing_db 表(每次都重讀,不 cache)
 */
function getPricingDbRows_(tenant) {
  var sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.PRICING) || "pricing_db";
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[String(headers[j])] = values[i][j];
    }
    if (sanitizeText_(row.tenant) === tenant && sanitizeText_(row.status) === "active") {
      rows.push(row);
    }
  }
  return rows;
}

/**
 * 階梯定價計算(GAS 端,跟前端 calcQuantityAddon 同邏輯)
 * @param {number} qty - 數量
 * @param {object} config - { tiers: [{min, perUnit}], unlimited: number }
 * @returns {object} { amount, perUnit, tier }
 */
function calcQuantityAddon_(qty, config) {
  if (qty <= 0) return { amount: 0, perUnit: 0, tier: null };
  if (qty === "unlimited") return { amount: config.unlimited || 0, perUnit: 0, tier: "unlimited" };
  var tiers = config.tiers || [];
  for (var i = 0; i < tiers.length; i++) {
    if (qty >= Number(tiers[i].min)) {
      return {
        amount: qty * Number(tiers[i].perUnit),
        perUnit: Number(tiers[i].perUnit),
        tier: Number(tiers[i].min)
      };
    }
  }
  return { amount: 0, perUnit: 0, tier: null };
}
function getRenewalSummary_(req) {
 clearSheetRowCache_(); // 清全部快取
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found: " + cardId);

  var eligibility = isCardEligibleForRenewal_(card);
  if (!eligibility.eligible) throw new Error("CARD_NOT_ELIGIBLE_FOR_RENEWAL: " + eligibility.reason);

  var tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
  var renewalPrice = getPricingValue_("renewal", 500, tenant);
  var targetPlan = sanitizeText_(req.target_plan || card.plan);
  var currentPlan = sanitizeText_(card.plan);
  var isUpgrade = targetPlan !== currentPlan;
  var upgradeDiff = 0;

  var addonOpts = {
    keep_marquee: toBoolean_(req.keep_marquee),
    keep_photo_extra_qty: toNumber_(req.keep_photo_extra_qty),
    keep_cta_extra_qty: toNumber_(req.keep_cta_extra_qty),
    update_unlimited_renew: toBoolean_(req.update_unlimited_renew || req.renew_unlimited_update),
    direct_partner_upgrade: toBoolean_(req.direct_partner_upgrade)
  };
  var addonAmount = calcRenewalAddonAmount_(addonOpts, tenant);
  var totalAmount = renewalPrice + upgradeDiff + addonAmount;

  // R0e: 讀取點數餘額
  var agentId = resolvePointsOwnerAgentIdForCard_(card);
  var agent = agentId ? findRowByField_("agent_db", "agent_id", agentId) : null;
  var pointsBalance = agent ? roundMoney_(toNumber_(agent.points_balance)) : 0;

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getRenewalSummary",
    card_id: cardId,
    current_plan: currentPlan,
    target_plan: targetPlan,
    is_upgrade: isUpgrade,
    is_downgrade: false,
    current_expires_at: sanitizeText_(card.expires_at),
    renewal_price: renewalPrice,
    upgrade_diff: upgradeDiff,
    downgrade_note: "",
    keep_marquee: addonOpts.keep_marquee,
    keep_photo_extra_qty: addonOpts.keep_photo_extra_qty,
    keep_cta_extra_qty: addonOpts.keep_cta_extra_qty,
    update_unlimited_current: toBoolean_(card.update_unlimited),
    update_unlimited_renew: addonOpts.update_unlimited_renew,
    direct_partner_upgrade: addonOpts.direct_partner_upgrade,
    direct_partner_upgrade_requested: addonOpts.direct_partner_upgrade,
    direct_partner_upgrade_blocked_reason: "",
    renewal_amount: renewalPrice + upgradeDiff,
    addon_amount: addonAmount,
    total_amount: totalAmount,
    points_used: 0,
    amount_before: totalAmount,
    amount_after: totalAmount,
    points_applied: false,
    points_balance: pointsBalance
  };
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// R0d 備份:舊版 calcRenewalAddonAmount_(2026-04-30 改造前)
// 如需 rollback:刪除新版,把這個改回原名
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function calcRenewalAddonAmount_OLD_R0d(opts, tenant) {
  var keepMarquee = !!opts.keep_marquee;
  var keepPhoto = Number(opts.keep_photo_extra_qty || 0);
  var keepCta = Number(opts.keep_cta_extra_qty || 0);
  var updateUnlimited = !!opts.update_unlimited_renew;
  var directPartnerUpgrade = !!opts.direct_partner_upgrade;

  var pricePhoto = getPricingValue_("addon_photo", 0, tenant);
  var priceCta = getPricingValue_("addon_cta", 0, tenant);
  var priceMarquee = getPricingValue_("addon_marquee", 0, tenant);
  var priceUpdateUnlimited = getPricingValue_("renewal_update_unlimited", 0, tenant);
  var priceBundle = getPricingValue_("addon_bundle", 0, tenant);
  var priceDirectPartner = getPricingValue_("addon_direct_partner", 10000, tenant);

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
  if (directPartnerUpgrade) {
    total += priceDirectPartner;
  }
  return total;
}

function calcRenewalAddonAmount_(opts, tenant) {
  var keepMarquee = !!opts.keep_marquee;
  var keepPhoto = Number(opts.keep_photo_extra_qty || 0);
  var keepCta = Number(opts.keep_cta_extra_qty || 0);
  var updateUnlimited = !!opts.update_unlimited_renew;
  var directPartnerUpgrade = !!opts.direct_partner_upgrade;

  // R0d:照片牆/CTA 改用階梯定價(從 pricing_db 動態讀取)
  var photoConfig = getPricingV2ItemConfig_("addon_photo", tenant);
  var ctaConfig = getPricingV2ItemConfig_("addon_cta", tenant);
  var photoResult = photoConfig ? calcQuantityAddon_(keepPhoto, photoConfig) : { amount: 0 };
  var ctaResult = ctaConfig ? calcQuantityAddon_(keepCta, ctaConfig) : { amount: 0 };

  // 跑馬燈、無限更新、bundle、金牌 partner 維持原邏輯(從 pricing_db 讀單價)
  
  var priceUpdateUnlimited = getPricingValue_("renewal_update_unlimited", 0, tenant);
 

  var total = 0;
// 跑馬燈、照片、CTA、直升金牌 → 終身免費，續約不收
// 只收無限更新續費
var updateCost = updateUnlimited ? priceUpdateUnlimited : 0;
total += updateCost;
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
  { fn: "keepWarmPing_",        type: "minutes", every: 5 },
  { fn: "flushCachedViewStatsToSheet_", type: "minutes", every: 10 },
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
   Logger.log("🔍 收到的 req: " + JSON.stringify(req));
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
// v7.17 Bug 1 Fix: 擴大 marquee 啟用判斷 — form.js 送的是 marquee_enabled,不是 marquee_purchased
var marqueePurchased = toBoolean_(req.marquee_purchased) || toBoolean_(req.marquee_enabled);
var features = parseJsonSafe_(req.features_json, {});
if (!features || typeof features !== "object") features = {};

if (!marqueePurchased) {
  marqueePurchased = toBoolean_(features.marquee_purchased) || toBoolean_(features.marquee_enabled);
}

// v7.17 Bug 1 Fix: 再從 addon_items 推導加購狀態(客戶買 addon_bundle 或 addon_marquee 即視為啟用)
if (!marqueePurchased && Array.isArray(req.addon_items)) {
  marqueePurchased = req.addon_items.some(function (item) {
    if (!item) return false;
    var code = String(item.code || "").toLowerCase();
    return code === "addon_bundle" || code === "addon_marquee";
  });
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
      line_user_id: req.line_user_id,
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

    // v7.13: 把 addon_items 組成 addon note 字串,附加到付款 note
    // 用意:讓 parseAddonItemsFromNote_ 能從 payment.note 解析出 addon 清單
    // 供 commission_rules 查規則、handleAgentUpgrade_ 偵測 addon_direct_partner 升金
    var originalNote = sanitizeText_(req.note);
    var addonNoteSuffix = composeAddonNoteFromItems_(createCardReq.addon_items);
    var paymentNote = originalNote;
    if (addonNoteSuffix && originalNote.indexOf("addon=") === -1) {
      paymentNote = originalNote ? (originalNote + " | " + addonNoteSuffix) : addonNoteSuffix;
    }

    // v7.13: 後端根據 addon_items 重算金額,確保 addon_direct_partner 的 $10000 算進來
    // 若前端已正確帶 amount,兩者一致就用 req.amount;否則用後端算的並記 warning
    var frontAmount = roundMoney_(toNumber_(req.amount));
    var backendAmount = calcCreateCardAmount_(req.plan, createCardReq.addon_items);
    var finalAmount = frontAmount;
    var amountWarning = "";
    if (backendAmount > 0 && Math.abs(frontAmount - backendAmount) > 0.5) {
      Logger.log("createCardWithOfflinePayment_ amount mismatch: front=" + frontAmount + " backend=" + backendAmount + " → use backend");
      finalAmount = backendAmount;
      amountWarning = "amount_recalc_by_backend: front=" + frontAmount + " backend=" + backendAmount;
    }

   // v7.13: 把 addon_items 組成 addon note 字串,附加到付款 note
    // 用意:讓 parseAddonItemsFromNote_ 能從 payment.note 解析出 addon 清單
    // 供 commission_rules 查規則、handleAgentUpgrade_ 偵測 addon_direct_partner 升金
    var originalNote = sanitizeText_(req.note);
    var addonNoteSuffix = composeAddonNoteFromItems_(createCardReq.addon_items);
    var paymentNote = originalNote;
    if (addonNoteSuffix && originalNote.indexOf("addon=") === -1) {
      paymentNote = originalNote ? (originalNote + " | " + addonNoteSuffix) : addonNoteSuffix;
    }

    // v7.13: 後端重算金額,防止前端 bug 或被繞過
    // 差距 > 0.5 元時,用後端算的值並記 log(避免浮點誤差誤判)
    var frontAmount = roundMoney_(toNumber_(req.amount));
    var backendAmount = calcCreateCardAmount_(req.plan, createCardReq.addon_items);
    var finalAmount = frontAmount;
    if (backendAmount > 0 && Math.abs(frontAmount - backendAmount) > 0.5) {
      Logger.log("createCardWithOfflinePayment_ amount mismatch: front=" + frontAmount + " backend=" + backendAmount + " → use backend");
      finalAmount = backendAmount;
    }

    var paymentResult = createOfflinePayment_({
      card_id: createdCardId,
      lead_id: leadId,
      amount: finalAmount,
      event_type: "first_payment",
      order_type: "offline_transfer",
      note: paymentNote,
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

  var planRow = findRowByField_("plan_db", "plan_id", normalizePlanValue_(planId));
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
    try {
      invalidateCardPublicCache_(cardId);
    } catch (cacheErr) {
      Logger.log("[triggerOverdueLock_] cache invalidation failed: " + cacheErr.message);
    }

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
/**
 * 定時任務:掃描逾期未付的 renewal payment，標記為 overdue
 * 建議每天執行一次(加到 GAS 時間觸發器)
 */
function expirePendingRenewals_() {
  var now = new Date();
  var nowIso = toIso_(now);
  var expired = [];

  var payments = getSheetRowsByName_("payment_db");
  payments.forEach(function(payment) {
    var eventType = sanitizeText_(payment.event_type);
    var status = sanitizeText_(payment.status).toLowerCase();
    if (eventType !== "renewal") return;
    if (status !== "pending") return;

    var dueAt = toDateSafe_(normalizeIsoDateTimeValue_(payment.due_at));
    if (!dueAt) return;
    if (now.getTime() <= dueAt.getTime()) return;

    // 標 payment 為 overdue
    var updatedPayment = shallowClone_(payment);
    updatedPayment.status = "overdue";
    updatedPayment.billing_status = "overdue";
    updatedPayment.updated_at = nowIso;
    updateRowByName_("payment_db", payment.__rowNum, updatedPayment);

    // 標 renewal_db 為 overdue
    var paymentId = sanitizeText_(payment.payment_id);
    var renewal = findRowByField_("renewal_db", "payment_id", paymentId);
    if (renewal) {
      var updatedRenewal = shallowClone_(renewal);
      updatedRenewal.status = "overdue";
      updatedRenewal.billing_status = "overdue";
      updatedRenewal.updated_at = nowIso;
      updateRowByName_("renewal_db", renewal.__rowNum, updatedRenewal);
    }

    expired.push({
      payment_id: paymentId,
      card_id: sanitizeText_(payment.card_id),
      due_at: toIso_(dueAt)
    });
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "expirePendingRenewals",
    expired_count: expired.length,
    expired: expired
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
     renewal_id: sanitizeText_(r.renewal_id), card_id: sanitizeText_(r.card_id), payment_id: sanitizeText_(r.payment_id), status: sanitizeText_(r.status), billing_status: sanitizeText_(r.billing_status),
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
  try {
    invalidateCardPublicCache_(updatedCard.id || updatedCard.card_id);
  } catch (cacheErr) {
    Logger.log("[confirmAddOnPayment_] cache invalidation failed: " + cacheErr.message);
  }

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

    // v7.13: 廢除 processRenewalCommission_ 的續約硬編碼分潤路徑
    // 續約/加購/升金統一走 processCommission_ + commission_rules(CR001~CR016)
    var result = processCommission_({ payment_id: cleanPaymentId });

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
    if (item.type === "minutes") {
      builder = builder.everyMinutes(item.every || 5);
    } else if (item.type === "daily") {
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
  ensureSchemasOrThrow_(["payment_db"]);
  req = req || {};
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status).toLowerCase();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var light = parseBoolClean_(req.light, false);
  var rows = getSheetRowsByName_("payment_db").filter(function(row) { return sameTenant_(row.tenant, tenant); });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status).toLowerCase() === status; });
  if (cardId) rows = rows.filter(function(row) { return sanitizeText_(row.card_id) === cardId; });
  if (paymentId) rows = rows.filter(function(row) { return sanitizeText_(row.payment_id) === paymentId; });
  if (keyword) rows = rows.filter(function(row) {
    var hay = [row.payment_id,row.card_id,row.status,row.event_type,row.order_type,row.method,row.agent_id].map(function(x){ return sanitizeText_(x).toLowerCase(); }).join(" ");
    return hay.indexOf(keyword) !== -1;
  });
  rows.sort(function(a, b) { return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });
  rows = sliceRowsClean_(rows, req, 100, 500);
  if (light) rows = rows.map(toLightPaymentClean_);
  return { ok: true, version: HSC_VERSION, action: "getPayments", rows: rows, payments: rows, limit: parseLimitClean_(req.limit,100,500), offset: parseOffsetClean_(req.offset), light: light };
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
    try {
      invalidateCardPublicCache_(cardId);
    } catch (cacheErr) {
      Logger.log(
        "[adminRepairDueAt_] cache invalidation failed: " +
        cacheErr.message
      );
    }
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
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  requireAdminKeyOrSystem_(req);
  var tenant = getTenant_(req);
  var keyword = sanitizeText_(req.keyword || req.q).toLowerCase();
  var status = sanitizeText_(req.status).toLowerCase();
  var billingStatus = sanitizeText_(req.billing_status || req.billingStatus).toLowerCase();
  var light = parseBoolClean_(req.light, false);
  var rows = getSheetRowsByName_("card_db").filter(function(row) { return sameTenant_(row.tenant, tenant); });
  if (status) rows = rows.filter(function(row) { return sanitizeText_(row.status).toLowerCase() === status; });
  if (billingStatus) rows = rows.filter(function(row) { return sanitizeText_(row.billing_status).toLowerCase() === billingStatus; });
  if (keyword) rows = rows.filter(function(row) {
    var hay = [row.id,row.name,row.phone,row.email,row.unit,row.title,row.referrer,row.service_agent,row.agent_id].map(function(x){ return sanitizeText_(x).toLowerCase(); }).join(" ");
    return hay.indexOf(keyword) !== -1;
  });
  rows.sort(function(a, b) { return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });
  rows = sliceRowsClean_(rows, req, 100, 500);
  if (light) rows = rows.map(toLightCardClean_);
  return { ok: true, version: HSC_VERSION, action: "getCards", cards: rows, limit: parseLimitClean_(req.limit,100,500), offset: parseOffsetClean_(req.offset), light: light };
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
  invalidateCardPublicCache_(cardId);
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
/**
 * 檢查 agent 是否達到升金條件，若符合則推 LINE 通知
 * 在 applyCommissionEffectToAgent_ 最後呼叫
 */
function checkAndNotifyUpgradeEligible_(agentId) {
  try {
    // 1. 讀取 agent 資料
    var agent = findRowByField_('agent_db', 'agent_id', agentId);
    if (!agent) {
      Logger.log('checkAndNotifyUpgradeEligible_: agent not found: ' + agentId);
      return;
    }

    var agentType = sanitizeText_(agent.agent_type);
    var balance   = parseFloat(agent.points_balance) || 0;
    var sentAt    = sanitizeText_(agent.tier_upgrade_reminder_sent_at);

    // 2. 三條件檢查
    if (balance < 10500)         return;
    if (agentType === 'partner') return;
    if (sentAt)                  return;

    // 3. 從 card_db 反查 LINE UID
    var lineUid = '';
    var cardId  = sanitizeText_(agent.card_id);
    if (cardId) {
      var card = findRowByField_('card_db', 'id', cardId);
      if (card) lineUid = sanitizeText_(card.line_user_id);
    }

    // 4. 推 LINE 通知
    var posterUrl = PropertiesService.getScriptProperties()
                      .getProperty('UPGRADE_POSTER_URL') || 'https://your-poster-url.com';
    var notifyResult = notifyAdminLine_({
      to:      lineUid || '',
      title:   '🎉 恭喜您累積點數已達 10,500 點！',
      message: '您可以提前續約並直升金牌合作代理，全額折抵費用（續約 NT$500 + 升金 NT$10,000）。\n點此辦理 → ' + posterUrl
    });
    Logger.log('checkAndNotifyUpgradeEligible_ notify result: ' + JSON.stringify(notifyResult));

    // 5. 寫回 agent_db
    var updated = shallowClone_(agent);
    updated.tier_upgrade_eligible        = true;
    updated.tier_upgrade_reminder_sent_at = toIso_(new Date());
    updateRowByName_('agent_db', agent.__rowNum, updated);

    Logger.log('checkAndNotifyUpgradeEligible_: 升金通知完成 agentId=' + agentId);

  } catch(e) {
    Logger.log('checkAndNotifyUpgradeEligible_ error: ' + e.message);
  }
}
/**
 * 推播 LINE 訊息
 * @param {object} payload - {
 *     title: "標題",
 *     message: "內容",
 *     to: "收件人 user_id(選填,不填則推給管理員)",
 *     backup_email: "LINE 送不出去時的備援 Email(選填)"
 *   }
 * @return {object} { ok: boolean, reason?: string }
 */
function notifyAdminLine_(payload) {
  var title = sanitizeText_(payload && payload.title);
  var message = sanitizeText_(payload && payload.message);
  var backupEmail = sanitizeText_(payload && payload.backup_email);

  // ★ LINE 送失敗時（配額用盡、token 失效等）自動觸發 Email 備援，避免整條通知斷線
  function tryEmailBackup(reason) {
    if (!backupEmail) return;
    try {
      var emailResult = sendBackupEmailNotification_(
        backupEmail,
        title || "幸福教養概念館 智慧名片系統通知",
        buildBackupEmailHtml_(title, message)
      );
      Logger.log("notifyAdminLine_ LINE 失敗(" + reason + ")，已觸發 Email 備援：" + JSON.stringify(emailResult));
    } catch (emailErr) {
      Logger.log("notifyAdminLine_ Email 備援也失敗: " + (emailErr && emailErr.message ? emailErr.message : String(emailErr)));
    }
  }

  try {
    var token = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");
    var adminUserId = PropertiesService.getScriptProperties().getProperty("LINE_ADMIN_USER_ID");
    var fallbackTo = PropertiesService.getScriptProperties().getProperty("LINE_NOTIFY_TO");

    // ── 收件人:優先使用 payload.to,否則推給管理員 ──
    var customTo = payload && payload.to ? String(payload.to).trim() : "";
    var to = customTo || adminUserId || fallbackTo;

    if (!token) {
      Logger.log("notifyAdminLine_ skipped: missing LINE_CHANNEL_ACCESS_TOKEN");
      tryEmailBackup("missing_token");
      return { ok: false, reason: "missing_token" };
    }
    if (!to) {
      Logger.log("notifyAdminLine_ skipped: no recipient");
      return { ok: false, reason: "missing_recipient" };
    }

    // ── 若是指定收件人,驗證 user_id 格式 ──
    if (customTo && !/^U[0-9a-f]{32}$/i.test(customTo)) {
      Logger.log("notifyAdminLine_ skipped: invalid user_id format: " + customTo);
      return { ok: false, reason: "invalid_user_id" };
    }

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
      Logger.log("notifyAdminLine_ error (to=" + to + "): " + response.getContentText());
      // ★ 429 = 超過配額，其他非 200 也一律視為送達失敗，觸發 Email 備援
      tryEmailBackup("http_" + responseCode);
      return { ok: false, reason: "http_" + responseCode };
    }
    return { ok: true };
  } catch (err) {
    Logger.log("notifyAdminLine_ failed: " + (err && err.message ? err.message : String(err)));
    tryEmailBackup("exception");
    return { ok: false, reason: "exception" };
  }
}

// ─────────────────────────────────────────
//  Email 備援通知：LINE 送不出去時的最後一道防線
//  用 GAS 內建免費的 MailApp，跟 LINE 配額完全獨立
// ─────────────────────────────────────────
function sendBackupEmailNotification_(toEmail, subject, htmlBody) {
  try {
    var to = sanitizeText_(toEmail);
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      Logger.log("sendBackupEmailNotification_ skipped: invalid email: " + to);
      return { ok: false, reason: "invalid_email" };
    }

    var remaining = 0;
    try {
      remaining = MailApp.getRemainingDailyQuota();
    } catch (quotaErr) {
      Logger.log("sendBackupEmailNotification_ 讀取配額失敗: " + quotaErr.message);
    }
    if (remaining <= 0) {
      Logger.log("sendBackupEmailNotification_ skipped: 今日 Email 配額已用完");
      return { ok: false, reason: "quota_exhausted" };
    }

    MailApp.sendEmail({
      to: to,
      subject: sanitizeText_(subject) || "幸福教養概念館 - 系統通知",
      htmlBody: htmlBody || "",
      name: "幸福教養概念館 智慧名片系統"
    });
    return { ok: true };
  } catch (e) {
    Logger.log("sendBackupEmailNotification_ failed: " + (e && e.message ? e.message : String(e)));
    return { ok: false, reason: "exception", error: e.message };
  }
}

function buildBackupEmailHtml_(title, message) {
  var safeTitle = escapeHtmlForEmail_(title || "幸福教養概念館 智慧名片系統通知");
  var safeMessage = escapeHtmlForEmail_(message || "").replace(/\n/g, "<br>");
  return (
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Microsoft JhengHei\',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff8f0;border-radius:12px;">' +
      '<div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #f5b942;margin-bottom:16px;">' +
        '<div style="font-size:20px;font-weight:900;color:#8a5a2b;">幸福教養概念館</div>' +
        '<div style="font-size:12px;color:#a08060;">智慧名片系統通知</div>' +
      '</div>' +
      '<div style="padding:0 4px 12px;font-size:16px;font-weight:700;color:#333;">' + safeTitle + '</div>' +
      '<div style="padding:0 4px 8px;font-size:14px;color:#555;line-height:1.8;">' + safeMessage + '</div>' +
      '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center;">此為系統自動發送的備援通知（LINE 暫時無法送達時啟用）</div>' +
    '</div>'
  );
}

function escapeHtmlForEmail_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function logAndNotifyEvent_(payload) {
  try {
    var logResult = writeOpsLog_(payload);
    if (!logResult) {
      Logger.log("logAndNotifyEvent_ writeOpsLog_ failed for payload: " + JSON.stringify(payload));
    }
  } catch (err) {
    Logger.log("logAndNotifyEvent_ error: " + (err && err.message ? err.message : String(err)));
  }
}
function getRecentOpsLogs_(req) {
  ensureSchemasOrThrow_(["ops_log_db"]);
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
  rows.sort(function(a, b) { return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at)); });
  if (rows.length > limit) rows = rows.slice(0, limit);
  return { ok: true, version: HSC_VERSION, action: "getRecentOpsLogs", items: rows };
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
      try {
        invalidateCardPublicCache_(updated.id || updated.card_id);
      } catch (cacheErr) {
        Logger.log("[runPaymentOverdueCheck_] cache invalidation failed: " + cacheErr.message);
      }
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
      try {
        invalidateCardPublicCache_(updated.id || updated.card_id);
      } catch (cacheErr) {
        Logger.log("[runCardExpiryCheck_] cache invalidation failed: " + cacheErr.message);
      }
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
    : Math.max(0, (Number(cardRow.photo_limit) || 0) - (sanitizeText_(cardRow.plan).toLowerCase() === 'premium' ? 5 : 2));
    summary.sources.push('card.photo_extra_purchased');
  }
  var cardCtaExtra = Math.max(0, Number(cardRow.cta_extra_purchased || 0));
  if (cardCtaExtra > 0 || toBoolean_(cardRow.cta_extra_purchased)) {
    summary.addon_cta_qty += cardCtaExtra > 0
      ? cardCtaExtra
      : Math.max(0, (Number(cardRow.cta_limit) || 0) - (sanitizeText_(cardRow.plan).toLowerCase() === 'premium' ? 3 : 1));
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
    year_bucket: getYearBucket_(sanitizeText_(card && card.id)),
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

const SCHEMA_DATE_FIELDS_MAP_ = {
  card_db: ["created_at","updated_at","activated_at","inactivated_at","expired_at","expires_at","form_ts","reserved_at","confirmed_at","update_token_created_at","update_token_expire","update_link_sent_at","payment_due_at","payment_paid_at","remind_at","reminded_at","delivered_at","update_unlimited_expires_at"],
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
    "addon_agent_upgrade": "addon_agent_upgrade",
    "direct_partner": "addon_direct_partner",
    "addon_direct_partner": "addon_direct_partner"
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
  var raw = sanitizeText_(planId).toLowerCase();
  // 白名單檢查: 只接受 free / premium / plan_free / plan_premium
  if (!/^(plan_)?(free|premium)$/.test(raw)) {
    throw new Error("Plan not found: " + planId);
  }
  var normalized = normalizePlanValue_(planId);
  var plan = findRowByField_("plan_db", "plan_id", normalized);
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

  var regex = /addon=([^|;]+)/ig;
  var match;
  while ((match = regex.exec(text))) {
    var raw = sanitizeText_(match[1]);
    if (!raw) continue;
    var parts = raw.split(":");
    var code = normalizeAddonItemCode_(sanitizeText_(parts[0]).toLowerCase()) || sanitizeText_(parts[0]).toLowerCase();
    var qty = parts.length > 1 ? toNumber_(parts[1]) : 0;
    var amount = parts.length > 2 ? roundMoney_(toNumber_(parts[2])) : 0;
    if (!code || amount <= 0) continue;
    items.push({
      item_key: code,
      eventType: "addon_payment",
      targetType: resolveAddonTargetType_(code),
      orderType: "addon",
      plan: "both",
      qty: qty,
      amount: amount,
      note_suffix: code
    });
  }
  return items;
}
/**
 * 把 addon_items 陣列組成 payment note 用的 addon 字串
 * 格式：addon=addon_photo:1:500;addon=addon_direct_partner:1:10000
 * 供後續 parseAddonItemsFromNote_ 解析、查 commission_rules 算分潤、偵測升金
 */
function composeAddonNoteFromItems_(addonItems) {
  if (!Array.isArray(addonItems) || addonItems.length === 0) return "";
  var parts = [];
  for (var i = 0; i < addonItems.length; i++) {
    var item = addonItems[i];
    if (!item) continue;
    var rawCode = sanitizeText_(item.code || item.item_code || item.item_key || "").toLowerCase();
    var code = normalizeAddonItemCode_(rawCode) || rawCode;
    if (!code) continue;
    var qty = toNumber_(item.qty || item.quantity || 1);
    if (qty <= 0) qty = 1;
    var amount = roundMoney_(toNumber_(item.amount || item.total || item.price || 0));
    if (amount <= 0) continue;
    parts.push("addon=" + code + ":" + qty + ":" + amount);
  }
  return parts.join(";");
}
/**
 * 根據 plan + addon_items 計算建卡總額
 * plan_free=1500, plan_premium=2000, 各 addon 照 pricing_db 加總
 * 回傳 0 表示無法計算(例如 pricing_db 未設定),呼叫端自行 fallback
 */
/**
 * 根據 plan + addon_items 計算建卡總額（後端防線,前後端金額不一致時用這個）
 * TODO: 未來若有 pricing_db 查詢 helper,改查表會更彈性
 *   目前 hardcode: plan_free=1500, plan_premium=2000, addon 照 items 帶的 amount 加總
 * 回傳 0 表示無法識別 plan,呼叫端自行 fallback 使用前端值
 */
function calcCreateCardAmount_(plan, addonItems) {
  var base = 0;
  var planCode = sanitizeText_(plan).toLowerCase();
  if (planCode === "plan_free" || planCode === "free") {
    base = 1500;
  } else if (planCode === "plan_premium" || planCode === "premium") {
    base = 2000;
  } else {
    return 0;
  }

  var addonTotal = 0;
  if (Array.isArray(addonItems)) {
    for (var i = 0; i < addonItems.length; i++) {
      var item = addonItems[i];
      if (!item) continue;
      var amt = roundMoney_(toNumber_(item.amount || item.total || item.price || 0));
      if (amt > 0) addonTotal += amt;
    }
  }

  return roundMoney_(base + addonTotal);
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
  var renewalItems = [];
  
  // 解析 addon items(直升金、加購等)
  var renewalAddonItems = parseAddonItemsFromNote_(payment && payment.note);
  var renewalAddonTotal = renewalAddonItems.reduce(function(sum, item) {
    return sum + roundMoney_(toNumber_(item.amount));
  }, 0);
  
  // 續約本身金額 = 總額 - addon 加總
  var renewalAmount = totalAmount - renewalAddonTotal;
  if (renewalAmount < 0) renewalAmount = 0;
  
  if (renewalAmount > 0) {
    renewalItems.push({
      item_key: "renewal",
      eventType: "renewal",
      targetType: "renewal_order",
      orderType: sanitizeText_(payment && payment.order_type).toLowerCase(),
      plan: plan || "both",
      amount: renewalAmount,
      note_suffix: "renewal"
    });
  }
  
  if (renewalAddonItems.length) {
    renewalItems = renewalItems.concat(renewalAddonItems);
  }
  
  // fallback:如果完全沒拆出 items,還是回 1 個 renewal item
  if (!renewalItems.length && totalAmount > 0) {
    renewalItems.push({
      item_key: "renewal",
      eventType: "renewal",
      targetType: "renewal_order",
      orderType: sanitizeText_(payment && payment.order_type).toLowerCase(),
      plan: plan || "both",
      amount: totalAmount,
      note_suffix: "renewal"
    });
  }
  
  return renewalItems;
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

  var hasCash = (commissionMode === "percent" && commissionValue > 0) || 
                (commissionMode === "fixed" && commissionValue > 0);
  var hasPoints = (bonusMode === "points" && bonusValue > 0) || 
                  (bonusMode === "percent_points" && bonusValue > 0) ||
                  (bonusMode === "percent" && bonusValue > 0);
  return hasCash || hasPoints;
}


  function resolveCommissionBeneficiaryAgentId_(rule, payment) {
    var sourceType = sanitizeText_(rule.source_type).toLowerCase();
    if (sourceType === "service") {
      // source_type=service 取卡的 service_agent（該卡的服務代理）
      var card = findRowByField_("card_db", "id", sanitizeText_(payment.card_id));
      if (card && sanitizeText_(card.service_agent)) {
        return sanitizeText_(card.service_agent);
      }
      // fallback: v440 修正，share_agent_id 優先（referrer），再取 agent_id
      return sanitizeText_(payment.share_agent_id) || sanitizeText_(payment.agent_id);
    }

    var agentId = sanitizeText_(payment.share_agent_id) || sanitizeText_(payment.agent_id);

    // v452 主附卡：若推薦人的卡設有 main_card_id，分潤轉給主卡持有人
    if (agentId) {
      var referrerCard = findRowByField_("card_db", "id", agentId);
      var mainCardId = referrerCard ? sanitizeText_(referrerCard.main_card_id) : "";
      if (mainCardId) {
        var mainCard = findRowByField_("card_db", "id", mainCardId);
        if (mainCard) {
          return sanitizeText_(mainCard.owner_agent_id || mainCard.agent_id || mainCardId);
        }
      }
    }

    return agentId;
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
} else if ((bonusMode === "percent_points" || bonusMode === "percent") && bonusValue > 0) {
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
  // 升金資格檢查與通知
  checkAndNotifyUpgradeEligible_(agentId);
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
 row.agent_id = sanitizeText_(req.agent_id || req.agentId) || "";
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
 // 🆕 自動標 is_test：name 含「測試」或「test」
if (!toBoolean_(row.is_test)) {
  var leadNameStr = sanitizeText_(row.name).toLowerCase();
  if (leadNameStr.indexOf("測試") !== -1 || leadNameStr.indexOf("test") !== -1) {
    row.is_test = "TRUE";
  }
}
  if (row.referrer) ensureAgentExists_(row.referrer, { lead: row, source: "lead_referrer", tenant: row.tenant });
  if (row.service_agent) ensureAgentExists_(row.service_agent, { lead: row, source: "lead_service_agent", tenant: row.tenant });
  if (row.agent_id) ensureAgentExists_(row.agent_id, { lead: row, source: "lead_agent_id", tenant: row.tenant });
  
  appendRowByName_("lead_db", row);

// 更新 request_db status → submitted
var requestRow = findRowByField_("request_db", "assigned_invite_code", inviteCode);
if (requestRow) {
  var updatedReq = shallowClone_(requestRow);
  updatedReq.status = "submitted";
  updatedReq.submitted_at = row.created_at;
  updateRowByName_("request_db", requestRow.__rowNum, updatedReq);
}

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
  var agentType = sanitizeText_(updated.agent_type).toLowerCase();
  var alreadyPartner = sanitizeText_(updated.partner_status).toLowerCase() === "active" ||
                       agentType === "partner";

  // 只有 referral（銀牌）+ 點數達標 + self_renewal_ok 才算達到金牌資格
  // partner 已經升金了，不再評估 eligible 旗標
  var eligible = !alreadyPartner &&
                 agentType === "referral" &&
                 pointsBalance >= AGENT_UPGRADE_TARGET_POINTS &&
                 selfRenewalOk;

  updated.tier_upgrade_eligible = eligible ? "TRUE" : "FALSE";
  updated.eligible_for_upgrade = eligible ? "TRUE" : "FALSE";

  if (eligible) {
    if (!sanitizeText_(updated.upgrade_eligible_at)) {
      updated.upgrade_eligible_at = toIso_(when);
    }
  } else if (!alreadyPartner) {
    // 已經是 partner 的話，保留 upgrade_eligible_at 當歷史紀錄
    // 只有還沒升金、又失去資格時才清空
    updated.upgrade_eligible_at = "";
  }

  if (alreadyPartner) {
    updated.partner_status = "active";
    if (!sanitizeText_(updated.partner_qualified_at)) {
      updated.partner_qualified_at = toIso_(when);
    }
    // partner 不需要 eligible 旗標
    updated.tier_upgrade_eligible = "FALSE";
    updated.eligible_for_upgrade = "FALSE";
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
/**
 * v7.13: 從 commission_rules 表找到採認對應的規則
 * 映射: recognition event_type → commission_rules event_type + target_type
 *   renewal → renewal + renewal_order
 *   addon → addon_payment + addon_order
 *   update_fee → update_fee + single_update
 * 
 * 過濾條件:
 *   - status = "active"
 *   - tenant 相符
 *   - event_type + target_type 映射相符
 *   - plan 符合(規則 plan="both" 或完全相符)
 *   - agent_type 符合(規則 agent_type="all" 或完全相符)
 * 
 * 多筆時照 priority 排序(值小優先)
 */


/**
 * v7.13 重寫(修正版):
 *   1. 不再用 hardcode rate
 *   2. 改用既有 selectBestCommissionRule_ + calcCommission_
 *      - matching 複用 getApplicableCommissionRules_(含日期/plan/share_source/agent 驗證)
 *      - rate 計算複用 calcCommission_(正確讀 commission_mode/commission_value/bonus_mode/bonus_value)
 *   3. 保留 getRecognitionRewardMode_ 決定 cash/points(依 agent_type)
 */
function applyRecognitionReward_(recognitionRow, eventRow, serviceLogRow) {
  var agentId = sanitizeText_(recognitionRow.agent_id);
  var agent = findRowByField_("agent_db", "agent_id", agentId);
  if (!agent) {
    return { reward_mode: "none", error: "Agent not found" };
  }

  var recognitionId = sanitizeText_(recognitionRow.recognition_id);
  var eventType = sanitizeText_(recognitionRow.event_type);
  var eventId = sanitizeText_(recognitionRow.event_id);

  // ============ 重複發獎檢查(邏輯不變) ============
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

  // ============ 決定 cash / points mode (依 agent_type) ============
  var rewardMode = getRecognitionRewardMode_(agent);
  if (rewardMode.mode === "none") {
    return {
      reward_mode: "none",
      error: "Agent not eligible for recognition reward",
      agent_type: normalizeAgentTypeForSheet_(agent.agent_type),
      member_tier: sanitizeText_(agent.member_tier),
      reason: rewardMode.reason
    };
  }

  // ============ 算基礎金額 ============
  var baseAmount = 0;
  if (eventType === "renewal") {
    baseAmount = toNumber_(eventRow.total_amount || eventRow.amount || 0);
  } else if (eventType === "addon") {
    baseAmount = toNumber_(eventRow.amount || 0);
  } else if (eventType === "update_fee") {
    baseAmount = toNumber_(eventRow.amount || eventRow.total_amount || 0);
  }

  if (baseAmount <= 0) {
    return { reward_mode: rewardMode.mode, error: "Base amount is zero", base_amount: baseAmount };
  }

  // ============ v7.13: 用既有 selectBestCommissionRule_ 查規則 ============
  var tenant = sanitizeText_(recognitionRow.tenant) || sanitizeText_(agent.tenant) || CONFIG.DEFAULT_TENANT;
  var plan = sanitizeText_(eventRow.plan || eventRow.target_plan || eventRow.plan_code || "").toLowerCase();

  // 映射 recognition event_type → commission_rules rule_type
  // renewal → renewal, addon → addon_payment, update_fee → update_fee
  var ruleEventType, ruleTargetType;
  if (eventType === "renewal") {
    ruleEventType = "renewal";
    ruleTargetType = "renewal_order";
  } else if (eventType === "addon") {
    ruleEventType = "addon_payment";
    ruleTargetType = "addon_order";
  } else if (eventType === "update_fee") {
    ruleEventType = "update_fee";
    ruleTargetType = "single_update";
  } else {
    return { reward_mode: rewardMode.mode, error: "Unknown event_type: " + eventType };
  }

  // 偽造 payment + item 餵給 selectBestCommissionRule_
  // 關鍵欄位: tenant, event_type, agent_id, share_agent_id(用於 matchAgent),
  //          plan, card_id, paid_at(日期驗證)
  var fakePayment = {
    tenant: tenant,
    event_type: ruleEventType,
    order_type: ruleTargetType,
    plan: plan,
    card_id: sanitizeText_(recognitionRow.card_id),
    agent_id: agentId,
    share_agent_id: "",  // recognition 不經 share,所以不給
    share_source: "service",  // recognition 屬於 service 類型
    share_channel: "",
    paid_at: nowIso_(),
    created_at: nowIso_(),
    member_tier: sanitizeText_(agent.member_tier),
    // 關鍵:把 agent_type 寫進 payment 讓 resolveCommissionBeneficiaryAgentType_ 能讀到
    agent_type: sanitizeText_(agent.agent_type)
  };

  var fakeItem = {
    eventType: ruleEventType,
    targetType: ruleTargetType,
    orderType: ruleTargetType,
    plan: plan
  };

  var rule = selectBestCommissionRule_(fakePayment, fakeItem);
  if (!rule) {
    Logger.log("applyRecognitionReward_ no matching rule: event=" + ruleEventType + " target=" + ruleTargetType + " plan=" + plan + " agent_type=" + agent.agent_type);
    return {
      reward_mode: "none",
      error: "No matching commission_rule",
      recognition_id: recognitionId,
      event_type: eventType,
      plan: plan,
      agent_type: sanitizeText_(agent.agent_type)
    };
  }

  // ============ 用既有 calcCommission_ 計算獎金 ============
  var calcResult = calcCommission_(rule, baseAmount, fakeItem);
  var rewardAmount = toNumber_(calcResult && calcResult.rewardAmount);
  var rewardPoints = toNumber_(calcResult && calcResult.rewardPoints);

  // 根據 mode 決定實際發什麼(cash 優先 points)
  var ruleId = sanitizeText_(rule.rule_id);

  // ============ 發獎(points) ============
  if (rewardMode.mode === "points") {
    if (rewardPoints <= 0) {
      return {
        reward_mode: "points",
        error: "No points reward in rule",
        rule_id: ruleId,
        base_amount: baseAmount
      };
    }

    var pointsResult = changeAgentPointsBalanceInternal_({
      agent_id: agentId,
      points: rewardPoints,
      bucket: "balance",
      type: eventType === "renewal" ? "renewal_recognition_reward" : "addon_recognition_reward",
      ref_id: recognitionId,
      note: "recognition approved for " + eventType + " " + eventId + " | rule_id=" + ruleId,
      operator: sanitizeText_(recognitionRow.recognized_by) || "system"
    });

    return {
      reward_mode: "points",
      points_added: rewardPoints,
      points_result: pointsResult,
      agent_type: rewardMode.mode,
      reason: rewardMode.reason,
      base_amount: baseAmount,
      rule_id: ruleId,
      recognition_id: recognitionId
    };
  }

  // ============ 發獎(cash) ============
  if (rewardMode.mode === "cash") {
    if (rewardAmount <= 0) {
      return {
        reward_mode: "cash",
        error: "No cash reward in rule",
        rule_id: ruleId,
        base_amount: baseAmount
      };
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
    commissionRow.reward_rate = String(toNumber_(rule.commission_value));
    commissionRow.reward_amount = String(rewardAmount);
    commissionRow.reward_points = "0";
    commissionRow.status = "pending";
    commissionRow.rule_id = ruleId;
    commissionRow.calculated_at = nowIso_();
    commissionRow.paid_at = "";
    commissionRow.frozen_at = "";
    commissionRow.unfrozen_at = "";
    commissionRow.freeze_reason = "";
    commissionRow.commission_batch_id = "";
    commissionRow.is_reversal = "FALSE";
    commissionRow.reversal_of = "";
    commissionRow.reversal_at = "";
    commissionRow.note = "recognition approved for " + eventType + " " + eventId + " | service_log_id=" + sanitizeText_(recognitionRow.service_log_id) + " | recognition_id=" + recognitionId + " | rule_id=" + ruleId;
    commissionRow.tenant = tenant;
    appendRowByName_("commission_db", commissionRow);

    var agentUpdated = shallowClone_(agent);
    var newTotal = roundMoney_(toNumber_(agentUpdated.total_commission) + rewardAmount);
    agentUpdated.total_commission = String(newTotal);
    agentUpdated.last_commission_at = nowIso_();
    agentUpdated.updated_at = nowIso_();
    updateRowByName_("agent_db", agent.__rowNum, agentUpdated);

    appendAgentCommissionLog_({
      agent_id: agentId,
      type: eventType === "renewal" ? "renewal_recognition_cash" : "addon_recognition_cash",
      amount: rewardAmount,
      before_total: roundMoney_(toNumber_(agent.total_commission)),
      after_total: newTotal,
      ref_id: recognitionId,
      note: "recognition approved for " + eventType + " | rule_id=" + ruleId,
      created_at: nowIso_(),
      tenant: tenant,
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
      amount: rewardAmount,
      agent_type: rewardMode.mode,
      reason: rewardMode.reason,
      base_amount: baseAmount,
      rule_id: ruleId,
      recognition_id: recognitionId
    };
  }

  return {
    reward_mode: "none",
    error: "Unexpected reward mode",
    mode: rewardMode.mode
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
function createInviteCodeValue_() {
  return ensureUniqueGeneratedValue_("invite_db", "invite_code", function() {
    return "IC" + Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, "yyMMddHHmmss") + generateRandomCode_(4);
  }, 20);
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

  var cardId = ensureUniqueGeneratedValue_("card_db", "id", generateCardId_, 200);
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
  card.line_user_id = sanitizeText_(resolveFieldFromReqOrLead_(req, lead, "line_user_id"));
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
  card.owner_agent_id = cardId;
  card.owner_agent_type = normalizeAgentTypeForSheet_(sanitizeText_(card.agent_type));
  card.source = sanitizeText_(lead.source);
  card.form_ts = sanitizeText_(lead.form_ts);
  card.form_source = sanitizeText_(lead.source);
  card.process_status = sanitizeText_(req.process_status || lead.process_status);
  card.is_test = sanitizeText_(req.is_test || lead.is_test);
 // 🆕 自動標 is_test：name 含「測試」或「test」
if (!toBoolean_(card.is_test)) {
  var nameStr = sanitizeText_(card.name).toLowerCase();
  if (nameStr.indexOf("測試") !== -1 || nameStr.indexOf("test") !== -1) {
    card.is_test = "TRUE";
  }
}

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
  row.year_bucket =getYearBucket_(sanitizeText_(card.id));
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

    // 🆕 找不到 renewal → fallback:若 renew_token === card_id,用 card_id 找卡
    // 過渡期相容:舊卡沒有 renewal 紀錄時使用
    if (!renewal && cardId && renewToken === cardId) {
      card = findRowByField_(CONFIG.SHEETS.CARD || "card_db", "id", cardId);
      if (card) renewal = findLatestRenewalByCardId_(sanitizeText_(card.id));
    } else if (!renewal) {
      throw new Error("Renewal token not found");
    } else {
      card = findRowByField_(CONFIG.SHEETS.CARD || "card_db", "id", sanitizeText_(renewal.card_id));
    }
  } else {
    card = findRowByField_(CONFIG.SHEETS.CARD || "card_db", "id", cardId);
    if (card) renewal = findLatestRenewalByCardId_(sanitizeText_(card.id));
  }

  if (!card) {
    throw new Error("Card not found for renewal");
  }

  var eligibility = isCardEligibleForRenewal_(card);
  var renewAccess = ensureRenewalTokenRecordForCard_(card, renewal);

  // ★ v461 補強：合併 ext 表並修正 cta_limit / photo_limit
  var renewCardId = sanitizeText_(card.id) || sanitizeText_(card.card_id);
  card.photo_limit = String(getEffectivePhotoLimit_(card));
  card.cta_limit   = String(getEffectiveCtaLimit_(card));
  mergeExtCtas_(renewCardId, card);
  mergeExtPhotos_(renewCardId, card);
  // 以實際 ext 資料為準，若 ext 有更多則上修 limit
  var actualCtaMax = 0;
  for (var _ci = 1; _ci <= 50; _ci++) {
    if (sanitizeText_(card["cta_text_" + _ci]) || sanitizeText_(card["cta_link_" + _ci])) actualCtaMax = _ci;
  }
  if (actualCtaMax > Number(card.cta_limit || 0)) card.cta_limit = String(actualCtaMax);
  var actualPhotoMax = 0;
  for (var _pi = 11; _pi <= 30; _pi++) {
    if (sanitizeText_(card["photo" + _pi + "_url"])) actualPhotoMax = _pi;
  }
  if (actualPhotoMax > Number(card.photo_limit || 0)) card.photo_limit = String(actualPhotoMax);

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
  if (code === "addon_direct_partner") return "agent_upgrade_fee";
  if (code === "addon_agent_upgrade") return "agent_upgrade_fee";
  if (code === "addon_marquee") return "marquee";
  if (code === "addon_update_unlimited") return "update_unlimited";
  return "addon_order";
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
/**
 * v7.13: 從 renewal summary 組出 payment.note 用的 addon 字串
 * 格式 addon=addon_xxx:qty:amount;addon=addon_yyy:qty:amount
 * 用於:
 *   1. 續約加購每一項各自查 commission_rules 算分潤
 *   2. addon_direct_partner 觸發升金偵測(handleAgentUpgrade_)
 */
function composeAddonNoteFromRenewalSummary_(summary, tenant) {
  if (!summary) return "";
  var parts = [];

  // 跑馬燈 + 無限更新若達套裝條件,用 addon_bundle 單項;否則各自記
  var keepMarquee = !!summary.keep_marquee;
  var updateUnlimitedRenew = !!summary.update_unlimited_renew;
  var priceBundle = getPricingValue_("addon_bundle", 0, tenant);

  if (keepMarquee && updateUnlimitedRenew && priceBundle > 0) {
    parts.push("addon=addon_bundle:1:" + roundMoney_(priceBundle));
  } else {
    if (keepMarquee) {
      var priceMarquee = getPricingValue_("addon_marquee", 0, tenant);
      if (priceMarquee > 0) parts.push("addon=addon_marquee:1:" + roundMoney_(priceMarquee));
    }
    if (updateUnlimitedRenew) {
      var priceUpd = getPricingValue_("renewal_update_unlimited", 0, tenant);
      if (priceUpd > 0) parts.push("addon=addon_update_unlimited:1:" + roundMoney_(priceUpd));
    }
  }

  var keepPhoto = Number(summary.keep_photo_extra_qty || 0);
  if (keepPhoto > 0) {
    var pricePhoto = getPricingValue_("addon_photo", 0, tenant);
    if (pricePhoto > 0) parts.push("addon=addon_photo:" + keepPhoto + ":" + roundMoney_(pricePhoto * keepPhoto));
  }

  var keepCta = Number(summary.keep_cta_extra_qty || 0);
  if (keepCta > 0) {
    var priceCta = getPricingValue_("addon_cta", 0, tenant);
    if (priceCta > 0) parts.push("addon=addon_cta:" + keepCta + ":" + roundMoney_(priceCta * keepCta));
  }

  if (summary.direct_partner_upgrade) {
    var priceDp = getPricingValue_("addon_direct_partner", 10000, tenant);
    parts.push("addon=addon_direct_partner:1:" + roundMoney_(priceDp));
  }

  return parts.join(";");
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
  // v7.13: 把 addon 資訊寫進 payment.note,供 parseAddonItemsFromNote_ 解析
  // 關鍵:讓 commission_rules 能對每個 addon 分開算分潤
  //      讓 handleAgentUpgrade_ 能偵測 addon_direct_partner 觸發升金
  
  var addonNote = composeAddonNoteFromRenewalSummary_(summary, tenant);
  payment.note = addonNote ? ("renewal_order | " + addonNote) : "renewal_order";
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

  // v7.13: 若 req 要加購直升金牌,但 summary 已擋下(例如已是金牌),拒絕下單
  if (toBoolean_(req.direct_partner_upgrade) && !summary.direct_partner_upgrade) {
    throw new Error("CANNOT_ADD_DIRECT_PARTNER: " + (summary.direct_partner_upgrade_blocked_reason || "unknown"));
  }

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
  var doubleCheckPending = findPendingRenewalPaymentByCardId_(cardId);
if (doubleCheckPending) {
  return {
    ok: true,
    version: HSC_VERSION,
    action: "createRenewalPayment",
    reused_existing_pending: true,
    rebuilt_missing_renewal: false,
    message: "Pending renewal already exists, skipped duplicate creation",
    payment: doubleCheckPending,
    renewal: findRowByField_("renewal_db", "payment_id", sanitizeText_(doubleCheckPending.payment_id)),
    summary: summary,
    points_redeem: pointsRedeem
  };
}
  var renewal = buildRenewalPendingRecord_(card, summary, tenant, payment.payment_id, effectiveTotalAmount, pointsRedeem, nowIso, dueAtIso);
  // ★ 儲存前端選取的顏色版型到 renewal 記錄
renewal.color = sanitizeText_(req.color || "");
renewal.style = sanitizeText_(req.style || "");
renewal.paper = sanitizeText_(req.paper || "");
  appendRowByName_(CONFIG.SHEETS.PAYMENT || "payment_db", payment);
  appendRowByName_(CONFIG.SHEETS.RENEWAL || "renewal_db", renewal);

  // 🆕 全額折抵點數 → amount=0 → 立刻確認付款
  if (effectiveTotalAmount <= 0 && pointsRedeem.applied) {
    try {
      confirmPayment_({
        payment_id: payment.payment_id,
        paid_at: nowIso,
        method: "points",
        operated_by: "system",
        note: "全額點數折抵,自動確認"
      });
      // 重新讀最新狀態
      var confirmedPayment = findRowByField_("payment_db", "payment_id", payment.payment_id) || payment;
      var confirmedRenewal = findRowByField_("renewal_db", "payment_id", payment.payment_id) || renewal;
      return {
        ok: true,
        version: HSC_VERSION,
        action: "createRenewalPayment",
        reused_existing_pending: false,
        rebuilt_missing_renewal: false,
        auto_confirmed: true,
        payment: confirmedPayment,
        renewal: confirmedRenewal,
        summary: summary,
        points_redeem: pointsRedeem
      };
    } catch (autoConfirmErr) {
      Logger.log("[createRenewalPayment_] auto confirm failed: " + autoConfirmErr.message);
      // 繼續正常 return，不擋流程
    }
  }
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

/**
 * v7.13 重寫: 偵測 addon_direct_partner 或 addon_agent_upgrade(相容舊資料),
 * 升「卡主」為 partner(不是升 service_agent)
 * 
 * 關鍵改動:
 *   1. 偵測 payment.note 裡的 addon_direct_partner(新)或 addon_agent_upgrade(舊)
 *      取代原本看 payment.addon_summary 字串
 *   2. 升金對象改為「卡主」: card.owner_agent_id,空則 fallback 用 card.id
 *   3. customer + referral 都能升 partner(customer 跳銀牌直升金)
 *   4. 取消 eligible_for_upgrade 旗標門檻(付 $10000 就能升)
 *   5. owner_agent 不存在時,透過 ensureAgentExists_ 自動建檔
 *   6. 系統保護帳戶(TW0001)雙層防護
 */
function handleAgentUpgrade_(payment) {
  // ============ Step 1: 偵測 addon_direct_partner / addon_agent_upgrade ============
  var addonItems = parseAddonItemsFromNote_(payment.note);
  var hasDirectPartner = false;
  for (var i = 0; i < addonItems.length; i++) {
    var itemKey = sanitizeText_(addonItems[i].item_key).toLowerCase();
    if (itemKey === "addon_direct_partner" || itemKey === "addon_agent_upgrade") {
      hasDirectPartner = true;
      break;
    }
  }
  // 相容舊資料: 若 payment.addon_summary 有 agent_upgrade_fee 字串也算(歷史資料)
  if (!hasDirectPartner) {
    var addonSummary = sanitizeText_(payment.addon_summary);
    if (addonSummary.indexOf("agent_upgrade_fee") !== -1) hasDirectPartner = true;
  }
  if (!hasDirectPartner) return null;

  // ============ Step 2: 找卡 ============
  var card = findRowByField_("card_db", "id", sanitizeText_(payment.card_id));
  if (!card) {
    Logger.log("handleAgentUpgrade_ skip: card not found, payment_id=" + payment.payment_id);
    return null;
  }

  // ============ Step 3: 系統保護帳戶 - 卡層 ============
  if (SYSTEM_PROTECTED_UPGRADE_IDS.indexOf(card.id) !== -1) {
    Logger.log("handleAgentUpgrade_ blocked: system protected card " + card.id);
    return null;
  }

  // ============ Step 4: 決定升金對象(卡主) ============
  var ownerAgentId = sanitizeText_(card.owner_agent_id);
  if (!ownerAgentId) {
    // fallback: 用 card.id 當 agent_id(系統慣例,卡號和 agent_id 共用 ID 空間)
    ownerAgentId = sanitizeText_(card.id);
  }
  if (!ownerAgentId) {
    Logger.log("handleAgentUpgrade_ skip: no owner_agent_id and no card.id");
    return null;
  }

  // ============ Step 5: 找或建卡主 agent(方案 A 延遲綁定)============
  var agent = ensureAgentExists_(ownerAgentId, { card: card, source: "direct_partner_upgrade" });
  if (!agent) {
    Logger.log("handleAgentUpgrade_ failed: ensureAgentExists_ returned null for " + ownerAgentId);
    return null;
  }

  // ============ Step 6: 系統保護帳戶 - agent 層 ============
  if (SYSTEM_PROTECTED_UPGRADE_IDS.indexOf(agent.agent_id) !== -1) {
    Logger.log("handleAgentUpgrade_ blocked: system protected agent " + agent.agent_id);
    return null;
  }

  // ============ Step 7: 升金資格驗證 ============
  var oldAgentType = sanitizeText_(agent.agent_type).toLowerCase();
  // 已是 partner -> 擋下(避免重複升金、避免破壞公司根代理狀態)
  if (oldAgentType === "partner") {
    Logger.log("handleAgentUpgrade_ skip: agent " + agent.agent_id + " already partner");
    return null;
  }
  // 只接受 customer + referral(其他 agent_type 例如 service 擋下)
  if (oldAgentType !== "customer" && oldAgentType !== "referral") {
    Logger.log("handleAgentUpgrade_ skip: agent_type " + oldAgentType + " not upgradable for " + agent.agent_id);
    return null;
  }

  // ============ Step 8: 執行升金 ============
  var now = nowIso_();
  var updated = shallowClone_(agent);
  updated.agent_type = "partner";
  updated.member_tier = mapAgentTypeToTier_("partner");
  updated.partner_status = "active";
  updated.upgrade_status = "approved"; 
  updated.partner_qualified_at = sanitizeText_(updated.partner_qualified_at) || now;
  updated.eligible_for_upgrade = "FALSE";
  updated.tier_upgrade_eligible = "FALSE";
  // 升金後保留 upgrade_eligible_at 作為歷史(第 2 處 syncAgentUpgradeFields_ 也這樣)
  if (!sanitizeText_(updated.upgrade_eligible_at)) {
    updated.upgrade_eligible_at = now;
  }
  // 金牌預設可做續約分潤
  if (!sanitizeText_(updated.self_renewal_ok) || sanitizeText_(updated.self_renewal_ok).toUpperCase() !== "TRUE") {
    updated.self_renewal_ok = "TRUE";
  }
 updated.updated_at = now;
  
  // ============ R0e:升金後點數歸零 ============
  // 業務規則:升金牌後拿現金分潤,不再累積點數
  // 把舊的 points_balance 清零,但保留 points_lifetime 作歷史
  var pointsBeforeUpgrade = roundMoney_(toNumber_(updated.points_balance));
  if (pointsBeforeUpgrade > 0) {
    updated.points_balance = "0";
    updated.points_redeemed = String(roundMoney_(toNumber_(updated.points_redeemed) + pointsBeforeUpgrade));
    updated.last_points_at = now;
    
    // 寫 agent_points_log 審計
    try {
      appendAgentPointsLog_({
        agent_id: updated.agent_id,
        type: "upgrade_zero",
        points: -pointsBeforeUpgrade,
        before_balance: pointsBeforeUpgrade,
        after_balance: 0,
        ref_id: payment.payment_id,
        note: "升金牌後點數歸零(payment_id=" + payment.payment_id + ")",
        created_at: now,
        tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT,
        operator: "system",
        bucket: "balance",
        before_frozen: roundMoney_(toNumber_(updated.points_frozen)),
        after_frozen: roundMoney_(toNumber_(updated.points_frozen)),
        before_redeemed: pointsBeforeUpgrade,
        after_redeemed: roundMoney_(toNumber_(updated.points_redeemed))
      });
    } catch (logErr) {
      Logger.log("handleAgentUpgrade_ points zero log failed (non-fatal): " + (logErr && logErr.message ? logErr.message : logErr));
    }
  }
  
  updateRowByName_("agent_db", agent.__rowNum, updated);

  // ============ Step 9: 同步 card.owner_agent_id / owner_agent_type ============
  try {
    var cardUpdated = false;
    var cardPatch = {};
    if (sanitizeText_(card.owner_agent_id) !== updated.agent_id) {
      cardPatch.owner_agent_id = updated.agent_id;
      cardUpdated = true;
    }
    if (sanitizeText_(card.owner_agent_type).toLowerCase() !== "partner") {
      cardPatch.owner_agent_type = "partner";
      cardUpdated = true;
    }
    if (cardUpdated && card.__rowNum) {
      cardPatch.updated_at = now;
      updateRowByName_("card_db", card.__rowNum, Object.assign(shallowClone_(card), cardPatch));
    }
  } catch (cardSyncErr) {
    // card 同步失敗不影響升金事實,只記錄
    Logger.log("handleAgentUpgrade_ card sync failed (non-fatal): " + (cardSyncErr && cardSyncErr.message ? cardSyncErr.message : cardSyncErr));
  }

  // ============ Step 10: 寫 agent_policy_log ============
  appendAgentPolicyLog_({
    agent_id: updated.agent_id,
    card_id: card.id,
    action_type: "upgrade_to_partner",
    old_value: oldAgentType,
    new_value: "partner",
    reason: "direct_partner_paid",
    created_by: "system",
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT
  });

  Logger.log("handleAgentUpgrade_ success: " + updated.agent_id + " " + oldAgentType + " -> partner (via payment " + payment.payment_id + ")");
  return updated;
}
/**
 * v7.13: 後台管理員換服務代理 API
 * 
 * 功能:
 *   1. 把 card.service_agent 換成新代理
 *   2. 把該卡所有 pending recognition 轉給新代理
 *   3. 寫 agent_policy_log 審計紀錄
 *   4. 不動已發放 commission(過去不改)
 *   5. 不動 approved/rejected recognition(歷史結果保留)
 * 
 * 業務規則:
 *   - 新代理必須是 referral/partner/TW0001 才能服務
 *   - 新代理 status 必須 active
 *   - 新代理 tenant 必須和卡的 tenant 一致
 *   - 不檢查 self_renewal_ok(指派時不卡,分潤時才卡)
 * 
 * @param {Object} req 
 *   req.card_id: string 必填
 *   req.new_service_agent_id: string 必填
 *   req.reason: string 必填,換代理原因(審計用)
 *   req.operated_by: string 必填,誰操作
 *   req.note: string 選填,額外備註
 * 
 * @return {Object}
 *   ok: true
 *   card_id, old_service_agent, new_service_agent,
 *   pending_recognitions_reassigned: 轉了幾筆,
 *   operated_by, operated_at, reason
 */
function adminReassignServiceAgent_(req) {
  req = req || {};
  
  // ============ Step 1: 參數驗證 ============
  var cardId = sanitizeText_(req.card_id);
  if (!cardId) throw new Error("MISSING_CARD_ID");
  
  var newAgentId = sanitizeText_(req.new_service_agent_id);
  if (!newAgentId) throw new Error("MISSING_NEW_SERVICE_AGENT_ID");
  
  var reason = sanitizeText_(req.reason);
  if (!reason) throw new Error("MISSING_REASON");
  
  var operatedBy = sanitizeText_(req.operated_by || req.operatedBy);
  if (!operatedBy) throw new Error("MISSING_OPERATED_BY");
  
  var note = sanitizeText_(req.note);
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    throw new Error("SYSTEM_BUSY_RETRY_LATER");
  }
  
  try {
    // ============ Step 2: 查找資料 + 業務驗證 ============
    var card = findRowByField_("card_db", "id", cardId);
    if (!card) throw new Error("CARD_NOT_FOUND: " + cardId);
    
    var newAgent = findRowByField_("agent_db", "agent_id", newAgentId);
    if (!newAgent) throw new Error("AGENT_NOT_FOUND: " + newAgentId);
    
    var newAgentStatus = sanitizeText_(newAgent.status).toLowerCase();
    if (newAgentStatus !== "active") {
      throw new Error("AGENT_NOT_ACTIVE: " + newAgentId + " status=" + newAgentStatus);
    }
    
    var newAgentType = sanitizeText_(newAgent.agent_type).toLowerCase();
    var isSystemRoot = (newAgentId === "TW0001");
    var isEligibleType = (newAgentType === "referral" || newAgentType === "partner");
    if (!isSystemRoot && !isEligibleType) {
      throw new Error("AGENT_NOT_ELIGIBLE_FOR_SERVICE: " + newAgentId + " agent_type=" + newAgentType);
    }
    
    var cardTenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
    var agentTenant = sanitizeText_(newAgent.tenant) || CONFIG.DEFAULT_TENANT;
    if (cardTenant !== agentTenant) {
      throw new Error("TENANT_MISMATCH: card=" + cardTenant + " agent=" + agentTenant);
    }
    
    var oldAgentId = sanitizeText_(card.service_agent);
    if (oldAgentId && oldAgentId === newAgentId) {
      throw new Error("SAME_SERVICE_AGENT: card already assigned to " + newAgentId);
    }
    
    var now = new Date();
    var nowIso = toIso_(now);
    
    // ============ Step 3: 更新 card.service_agent ============
    var updatedCard = shallowClone_(card);
    updatedCard.service_agent = newAgentId;
    updatedCard.updated_at = nowIso;
    updateRowByName_("card_db", card.__rowNum, updatedCard);
    
    try { invalidateCardPublicCache_(cardId); } catch (cacheErr) {}
    
    // ============ Step 4: 轉移 pending recognition ============
    // 只轉 recognition_result=pending 的紀錄,approved/rejected 不動(歷史結果保留)
    // 只轉屬於舊代理的 pending 紀錄(避免把其他代理的 pending 一起搬走)
    var pendingRecognitions = findRowsByField_("recognition_db", "card_id", cardId).filter(function(row) {
      return sanitizeText_(row.recognition_result).toLowerCase() === "pending";
    });
    
    var reassignedCount = 0;
    var skippedForeignCount = 0;
    for (var i = 0; i < pendingRecognitions.length; i++) {
      var rec = pendingRecognitions[i];
      var recAgent = sanitizeText_(rec.agent_id);
      
      // 如果這筆 recognition 不是屬於舊代理的,不動(例如首次成交的 customer 推薦人 recognition)
      if (oldAgentId && recAgent !== oldAgentId) {
        skippedForeignCount++;
        continue;
      }
      // 若 card 原本沒 service_agent(首次指派),也跳過不屬於這次目標的 recognition
      if (!oldAgentId && recAgent) {
        skippedForeignCount++;
        continue;
      }
      
      var updatedRec = shallowClone_(rec);
      updatedRec.agent_id = newAgentId;
      updatedRec.note = mergeNote_(updatedRec.note, "reassigned from " + (oldAgentId || "(none)") + " to " + newAgentId + " at " + nowIso);
      updatedRec.updated_at = nowIso;
      updateRowByName_("recognition_db", rec.__rowNum, updatedRec);
      reassignedCount++;
    }
    
    // ============ Step 5: 寫 agent_policy_log ============
    appendAgentPolicyLog_({
      agent_id: newAgentId,
      card_id: cardId,
      action_type: "reassign_service_agent",
      old_value: oldAgentId || "(none)",
      new_value: newAgentId,
      reason: reason + (note ? " | note=" + note : "") + " | pending_reassigned=" + reassignedCount + " | pending_skipped=" + skippedForeignCount,
      created_by: operatedBy,
      tenant: cardTenant,
      created_at: nowIso
    });
    
    // ============ Step 6: 寫 ops_log(非關鍵,失敗不阻斷) ============
    try {
      writeOpsLog_({
        module: "admin",
        action: "reassign_service_agent",
        target_id: cardId,
        before_status: "service_agent=" + (oldAgentId || "(none)"),
        after_status: "service_agent=" + newAgentId,
        operator: operatedBy,
        note: reason + " | pending_reassigned=" + reassignedCount
      });
    } catch (opsErr) {
      Logger.log("adminReassignServiceAgent_ ops_log write failed: " + (opsErr && opsErr.message ? opsErr.message : opsErr));
    }
    
    Logger.log("adminReassignServiceAgent_ success: card=" + cardId + " " + (oldAgentId || "(none)") + " -> " + newAgentId + " (by " + operatedBy + ")");
    
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminReassignServiceAgent",
      card_id: cardId,
      old_service_agent: oldAgentId,
      new_service_agent: newAgentId,
      pending_recognitions_reassigned: reassignedCount,
      pending_recognitions_skipped: skippedForeignCount,
      tenant: cardTenant,
      operated_by: operatedBy,
      operated_at: nowIso,
      reason: reason
    };
    
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}
/**
 * v7.13: 後台管理員清除測試卡資料 API
 * 
 * 功能:
 *   完整清除一張測試卡相關的 14 張表紀錄(只清這張卡相關,不影響其他卡)
 * 
 * 嚴格防呆:
 *   1. confirm 必須是 "YES_DELETE_FOREVER"
 *   2. card.is_test 必須是 TRUE
 *   3. dryRun=true 時只列不刪
 *   4. LockService 保護
 *   5. ops_log 永久保留(不刪 + 寫一筆 delete_test_card 紀錄)
 * 
 * @param {Object} req
 *   req.card_id: string 必填
 *   req.confirm: string 必填,必須是 "YES_DELETE_FOREVER"
 *   req.operated_by: string 必填
 *   req.reason: string 必填
 *   req.dryRun: boolean 選填,預設 false
 */
function adminDeleteTestCard_(req) {
  req = req || {};
  
  // ============ Step 1: 參數驗證 ============
  var cardId = sanitizeText_(req.card_id);
  if (!cardId) throw new Error("MISSING_CARD_ID");
  
  if (sanitizeText_(req.confirm) !== "YES_DELETE_FOREVER") {
    throw new Error("MISSING_CONFIRMATION: pass confirm='YES_DELETE_FOREVER'");
  }
  
  var operatedBy = sanitizeText_(req.operated_by);
  if (!operatedBy) throw new Error("MISSING_OPERATED_BY");
  
  var reason = sanitizeText_(req.reason);
  if (!reason) throw new Error("MISSING_REASON");
  
  var dryRun = req.dryRun === true || sanitizeText_(req.dryRun).toLowerCase() === "true";
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {
    throw new Error("SYSTEM_BUSY_RETRY_LATER");
  }
  
  try {
    // ============ Step 2: 找卡 + is_test 防呆 ============
    var card = findRowByField_("card_db", "id", cardId);
    if (!card) throw new Error("CARD_NOT_FOUND: " + cardId);
    
    if (sanitizeText_(card.is_test).toUpperCase() !== "TRUE") {
      throw new Error("REFUSE_DELETE_NON_TEST_CARD: card " + cardId + " is_test=" + card.is_test);
    }
    
    var cardTenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
    var nowIso = nowIso_();
    
    // ============ Step 3: 蒐集所有相關紀錄 ============
    var payments = findRowsByField_("payment_db", "card_id", cardId);
    var paymentIds = payments.map(function(p) { return sanitizeText_(p.payment_id); });
    
    var recognitions = findRowsByField_("recognition_db", "card_id", cardId);
    var recognitionIds = recognitions.map(function(r) { return sanitizeText_(r.recognition_id); });
    
    // commission_db: card_id 或 source_card_id 任一相符
    var commissions = getSheetRowsByName_("commission_db").filter(function(c) {
      return sanitizeText_(c.card_id) === cardId || sanitizeText_(c.source_card_id) === cardId;
    });
    
    var serviceLogs = findRowsByField_("service_log", "card_id", cardId);
    var addonOrders = findRowsByField_("add_on_order_db", "card_id", cardId);
    var renewals = findRowsByField_("renewal_db", "card_id", cardId);
    var leads = findRowsByField_("lead_db", "card_id", cardId);
    var invites = findRowsByField_("invite_db", "card_id", cardId);
    var policyLogs = findRowsByField_("agent_policy_log", "card_id", cardId);
    
    // log 用三層 OR 篩選
    var pointsLogToDelete = getSheetRowsByName_("agent_points_log").filter(function(log) {
      var refId = sanitizeText_(log.ref_id);
      var note = sanitizeText_(log.note);
      return (refId && (paymentIds.indexOf(refId) >= 0 || recognitionIds.indexOf(refId) >= 0)) ||
             note.indexOf("card_id=" + cardId) >= 0;
    });
    
    var commissionLogToDelete = getSheetRowsByName_("agent_commission_log").filter(function(log) {
      var refId = sanitizeText_(log.ref_id);
      var note = sanitizeText_(log.note);
      return (refId && (paymentIds.indexOf(refId) >= 0 || recognitionIds.indexOf(refId) >= 0)) ||
             note.indexOf("card_id=" + cardId) >= 0;
    });
    
    // ============ Step 4: 計算 agent 累計回扣 ============
    var agentAdjustments = {};
    commissions.forEach(function(c) {
      var agentId = sanitizeText_(c.beneficiary_agent_id);
      if (!agentId) return;
      var amount = toNumber_(c.reward_amount);
      if (amount <= 0) return;
      if (!agentAdjustments[agentId]) {
        agentAdjustments[agentId] = { commission: 0, points: 0 };
      }
      agentAdjustments[agentId].commission += amount;
    });
    
    pointsLogToDelete.forEach(function(log) {
      var agentId = sanitizeText_(log.agent_id);
      if (!agentId) return;
      var amount = toNumber_(log.amount);
      var type = sanitizeText_(log.type).toLowerCase();
      if (amount <= 0) return;
      if (type.indexOf("redeem") >= 0 || type.indexOf("deduct") >= 0) return;
      if (!agentAdjustments[agentId]) {
        agentAdjustments[agentId] = { commission: 0, points: 0 };
      }
      agentAdjustments[agentId].points += amount;
    });
    
    // ============ Step 5: 判斷 agent_db 哪些 agent 該刪除 ============
    var agentsToDelete = [];
    var allCardsCache = null;
    
    Object.keys(agentAdjustments).forEach(function(agentId) {
      var agent = findRowByField_("agent_db", "agent_id", agentId);
      if (!agent) return;
      
      // 4 個條件全部成立才刪
      if (sanitizeText_(agent.is_test).toUpperCase() !== "TRUE") return;
      if (sanitizeText_(agent.note).indexOf("auto_created_by_ensureAgentExists") < 0) return;
      if (sanitizeText_(agent.card_id) !== cardId) return;
      
      // 檢查是否被其他卡使用
      if (allCardsCache === null) {
        allCardsCache = getSheetRowsByName_("card_db");
      }
      var stillUsed = allCardsCache.some(function(c) {
        if (sanitizeText_(c.id) === cardId) return false;
        return sanitizeText_(c.service_agent) === agentId ||
               sanitizeText_(c.owner_agent_id) === agentId;
      });
      if (stillUsed) return;
      
      agentsToDelete.push(agent);
    });
    
    // ============ Step 6: 統計 + dryRun return ============
    var counts = {
      card_db: 1,
      payment_db: payments.length,
      commission_db: commissions.length,
      service_log_db: serviceLogs.length,
      recognition_db: recognitions.length,
      add_on_order_db: addonOrders.length,
      renewal_db: renewals.length,
      lead_db_modified: leads.length,
      invite_db: invites.length,
      agent_points_log: pointsLogToDelete.length,
      agent_commission_log: commissionLogToDelete.length,
      agent_policy_log: policyLogs.length,
      agent_db_deleted: agentsToDelete.length,
      agent_db_adjusted: Object.keys(agentAdjustments).length - agentsToDelete.length
    };
    
    if (dryRun) {
      Logger.log("adminDeleteTestCard_ DRY RUN for " + cardId + ": " + JSON.stringify(counts));
      return {
        ok: true,
        dryRun: true,
        card_id: cardId,
        is_test: card.is_test,
        tenant: cardTenant,
        would_delete_counts: counts,
        would_adjust_agents: agentAdjustments,
        would_delete_agents: agentsToDelete.map(function(a) { return a.agent_id; }),
        sample_payment_ids: paymentIds.slice(0, 5),
        sample_commission_ids: commissions.slice(0, 5).map(function(c) { return c.commission_id; }),
        operated_by: operatedBy,
        reason: reason,
        message: "DRY RUN - nothing was deleted. Re-call without dryRun to actually delete."
      };
    }
    
    // ============ Step 7: 真實刪除(批次處理) ============
    deleteRowsByName_("agent_points_log", pointsLogToDelete);
    deleteRowsByName_("agent_commission_log", commissionLogToDelete);
    deleteRowsByName_("agent_policy_log", policyLogs);
    deleteRowsByName_("commission_db", commissions);
    deleteRowsByName_("recognition_db", recognitions);
    deleteRowsByName_("service_log", serviceLogs);
    deleteRowsByName_("add_on_order_db", addonOrders);
    deleteRowsByName_("renewal_db", renewals);
    deleteRowsByName_("invite_db", invites);
    deleteRowsByName_("payment_db", payments);
    
    // lead_db: 修改不刪
    leads.forEach(function(lead) {
      var updated = shallowClone_(lead);
      updated.card_id = "";
      updated.note = mergeNote_(updated.note, "[card_deleted_" + nowIso + "]");
      updated.updated_at = nowIso;
      updateRowByName_("lead_db", lead.__rowNum, updated);
    });
    
    // agent_db 處理
    var agentAdjustResults = [];
    var agentsActuallyToDelete = [];  // 收集後一起批次刪除
    
    Object.keys(agentAdjustments).forEach(function(agentId) {
      var agent = findRowByField_("agent_db", "agent_id", agentId);
      if (!agent) return;
      
      var adjust = agentAdjustments[agentId];
      var shouldDelete = agentsToDelete.some(function(a) { return a.agent_id === agentId; });
      
      if (shouldDelete) {
        agentsActuallyToDelete.push(agent);
        agentAdjustResults.push({
          agent_id: agentId,
          action: "deleted",
          reason: "auto_created_test_agent_no_longer_used"
        });
      } else {
        var updated = shallowClone_(agent);
        var oldTotalCommission = toNumber_(updated.total_commission);
        var oldPointsBalance = toNumber_(updated.points_balance);
        var oldPointsLifetime = toNumber_(updated.points_lifetime);
        
        var newTotalCommission = roundMoney_(Math.max(0, oldTotalCommission - adjust.commission));
        var newPointsBalance = roundMoney_(Math.max(0, oldPointsBalance - adjust.points));
        var newPointsLifetime = roundMoney_(Math.max(0, oldPointsLifetime - adjust.points));
        
        updated.total_commission = String(newTotalCommission);
        updated.points_balance = String(newPointsBalance);
        updated.points_lifetime = String(newPointsLifetime);
        updated.updated_at = nowIso;
        updateRowByName_("agent_db", agent.__rowNum, updated);
        
        agentAdjustResults.push({
          agent_id: agentId,
          action: "adjusted",
          commission_reverted: adjust.commission,
          points_reverted: adjust.points,
          before: { total_commission: oldTotalCommission, points_balance: oldPointsBalance },
          after: { total_commission: newTotalCommission, points_balance: newPointsBalance }
        });
      }
    });
    
    // 批次刪除符合條件的 agent
    deleteRowsByName_("agent_db", agentsActuallyToDelete);
    
    // 最後刪 card_db
    deleteRowsByName_("card_db", [card]);
    
    try { invalidateCardPublicCache_(cardId); } catch (cacheErr) {}
    
    // 寫 ops_log(永久保留)
    try {
      writeOpsLog_({
        module: "admin",
        action: "delete_test_card",
        target_id: cardId,
        before_status: "card existed (is_test=TRUE)",
        after_status: "card and " + (counts.payment_db + counts.commission_db + counts.recognition_db) + " related records deleted",
        operator: operatedBy,
        note: reason + " | counts=" + JSON.stringify(counts)
      });
    } catch (opsErr) {
      Logger.log("delete_test_card ops_log write failed: " + (opsErr && opsErr.message ? opsErr.message : opsErr));
    }
    
    Logger.log("adminDeleteTestCard_ success: " + cardId + " (by " + operatedBy + ") counts=" + JSON.stringify(counts));
    
    return {
      ok: true,
      dryRun: false,
      version: HSC_VERSION,
      action: "adminDeleteTestCard",
      card_id: cardId,
      tenant: cardTenant,
      deleted_counts: counts,
      agent_adjustments: agentAdjustResults,
      operated_by: operatedBy,
      operated_at: nowIso,
      reason: reason
    };
    
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

function adminUpdateCardPhotoUrls_(req) {
  req = req || {};
  var cardId = sanitizeText_(req.card_id);
  if (!cardId) throw new Error("MISSING_CARD_ID");

  var updates = req.updates || {};
  var fields = Object.keys(updates);
  if (!fields.length) throw new Error("MISSING_UPDATES");

  var sheet = getSheetByName_("card_db");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getDataRange().getValues();

  var rowIdx = -1;
  var cardIdCol = headers.indexOf("id");
  if (cardIdCol < 0) cardIdCol = headers.indexOf("card_id");

  for (var i = 1; i < data.length; i++) {
    if (sanitizeText_(data[i][cardIdCol]) === cardId) {
      rowIdx = i + 1;
      break;
    }
  }
  if (rowIdx < 0) throw new Error("CARD_NOT_FOUND: " + cardId);

  var updatedFields = [];
  fields.forEach(function(field) {
    var colIdx = headers.indexOf(field);
    if (colIdx < 0) return;
    sheet.getRange(rowIdx, colIdx + 1).setValue(sanitizeText_(updates[field]));
    updatedFields.push(field);
  });

  try { invalidateCacheOnWrite_("card_db"); } catch(e) {}
  try { invalidateCardPublicCache_(cardId); } catch(e) {}

  return {
    ok: true,
    card_id: cardId,
    updated_fields: updatedFields,
    updated_count: updatedFields.length
  };
}

// 新增：直接從 Sheets 讀卡片（不走快取）
function adminGetCardDirect_(req) {
  req = req || {};
  var cardId = sanitizeText_(req.card_id);
  if (!cardId) throw new Error("MISSING_CARD_ID");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("CARD_NOT_FOUND: " + cardId);

  return { ok: true, card: card };
}
function buildDeliveryCardGuidance_(card) {
  var agentId = resolvePointsOwnerAgentIdForCard_(card);
  var agent = agentId ? findRowByField_("agent_db", "agent_id", agentId) : null;
  var points = agent ? roundMoney_(toNumber_(agent.points_balance)) : 0;
  var lifetimePoints = agent ? roundMoney_(toNumber_(agent.points_lifetime)) : 0;
  var memberTier = agent ? sanitizeText_(agent.member_tier) : (sanitizeText_(card.owner_agent_type) || "customer");
  var eligibleForPartner = agent && sanitizeText_(agent.eligible_for_upgrade) === "TRUE";
  var isPartner = memberTier === "partner";

  // v451：補充服務荷包所需欄位
  var stats = agentId ? computeAgentReferralStats_(agentId) : { referral_count: 0, converted_count: 0 };
  var walletMode = isPartner ? "partner"
    : (memberTier === "referral" ? "referral"
    : (lifetimePoints >= 5 ? "referral" : "trial"));

  var guidance = {
    member_tier: memberTier,
    points_balance: points,
    points_lifetime: lifetimePoints,
    upgrade_hint: "",
    points_rule:  "銅牌會員每推薦 1 位客戶成交可得 1 點，不含本人自購；累積 5 點自動升級為銀牌會員。1 點可折抵 1 元，適用於續約、加購或升級合作代理。",
    commission_rule: "銀牌與金牌會員依方案、續約、加購與更新項目，享有不同分潤比例；本人自購不發放任何分潤。",
    upgrade_rule: "",
    remaining_points_to_next_tier: 0,
    // 服務荷包欄位
    wallet_mode:        walletMode,
    agent_id:           agentId || "",
    referral_link:      agentId ? buildReferralLink_(agentId) : "",
    referral_count:     stats.referral_count,
    converted_count:    stats.converted_count,
    commission_monthly: roundMoney_(agentId ? computeAgentMonthlyCommission_(agentId) : 0),
    commission_total:   roundMoney_(toNumber_(agent ? agent.total_commission : 0))
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
  } else if ((bonusMode === "percent_points" || bonusMode === "percent") && bonusValue > 0) {
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
/**
 * 取得當前 year_bucket
 * v7.16.5:改為「卡片週期制」
 * - 帶 cardId:bucket = cardId + "-" + paid_at_year_month
 * - 沒帶 cardId(向後相容):用日曆年(legacy)
 */
function getYearBucket_(cardId) {
  // v7.16.5:有 cardId 就用卡片週期制
  if (cardId) {
    var card = findRowByField_("card_db", "id", cardId);
    if (card) {
      // 取最新的 paid_at(優先順序:card.payment_paid_at > 找最新付款單)
      var paidAtText = sanitizeText_(card.payment_paid_at);
      
      if (!paidAtText) {
        // 找最新一筆 paid 的付款單
        try {
          var payments = getSheetRowsByName_("payment_db").filter(function(row) {
            return sanitizeText_(row.card_id) === cardId && 
                   sanitizeText_(row.status) === "paid" &&
                   sanitizeText_(row.paid_at);
          });
          if (payments.length) {
            payments.sort(function(a, b) { 
              return sanitizeText_(b.paid_at).localeCompare(sanitizeText_(a.paid_at)); 
            });
            paidAtText = sanitizeText_(payments[0].paid_at);
          }
        } catch (e) {
          Logger.log("getYearBucket_ payment lookup failed: " + e.message);
        }
      }
      
      if (paidAtText) {
        var paidDate = toDateSafe_(paidAtText);
        if (paidDate) {
          var year = paidDate.getFullYear();
          var month = String(paidDate.getMonth() + 1).padStart(2, '0');
          return cardId + "-" + year + "-" + month;
        }
      }
    }
  }
  
  // Fallback:沒卡片資訊或新卡尚未付款 → 用日曆年(legacy 相容)
  var now = new Date();
  var fallbackYear = now.getFullYear();
  return fallbackYear + "-" + (fallbackYear + 1);
}

function getCurrentYearUpdateCount_(cardId) {
  // v7.16.5:傳 cardId 給 getYearBucket_,得到卡片週期 bucket
  var bucket = getYearBucket_(cardId);
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

  // 不限次數更新有效時，跳過方案欄位數量限制檢查
  // 判斷邏輯與 buildEffectiveEntitlements_ 一致
  var unlimitedEnabledRaw = sanitizeText_(card.update_unlimited_enabled).toUpperCase() === 'TRUE';
  var unlimitedExpireAt = sanitizeText_(card.update_unlimited_expires_at) || sanitizeText_(card.expires_at);
  var unlimitedExpireDate = toDateSafe_(unlimitedExpireAt);
  var unlimitedActive = !!(unlimitedEnabledRaw && unlimitedExpireDate && unlimitedExpireDate.getTime() >= new Date().getTime());
  if (unlimitedActive) return;

  var ctaLimit = toNumber_(card.cta_limit);
    // ★ v450：cta_limit 含加購，只檢查絕對上限 50，不比對方案預設值
    if (ctaLimit > 50) throw new Error("cta_limit exceeds absolute max (50)");
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
    "cta_limit","photo_limit",
    "marquee_text","marquee_enabled",
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
      "cta_limit","photo_limit",
      "marquee_text","marquee_enabled",
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

  // v3.3：照片相關欄位允許空字串穿透
  // 代表客戶主動「移除照片」，要讓空字串真的寫回 card_db
  // 涵蓋：avatar_url, avatar_key, logo_url, logo_key,
  //       photo1_url ~ photo10_url, photo1_key ~ photo10_key
  if (/^(avatar|logo|photo([1-9]|10))_(url|key)$/.test(field)) {
    return true;
  }

  // v458：CTA 欄位允許空字串穿透（讓用戶能清空 CTA 文字/連結）
  if (/^cta_(text|link)_\d+$/.test(field)) {
    return true;
  }

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
// ===== v7.12.2 payment-type-routing START =====
// ============================================================

/**
 * 一次性 Schema 修復工具
 * 用途：讀取 Google Sheet 的 payment_inbox_db 實際表頭，比對 SCHEMA 定義，
 *       自動把缺少的欄位補到最右邊（payment_type / target_id / matched_payment_id）
 * 使用：只要呼叫一次 action=repairPaymentInboxSchema 即可
 */
function repairPaymentInboxSchema_(req) {
  requireAdminKeyOrSystem_(req || {});

  var ss = getSpreadsheet_();
  var sheetName = "payment_inbox_db";
  var sheet = ss.getSheetByName(sheetName);
  var created = false;

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    created = true;
  }

  var expected = SCHEMA.payment_inbox_db;
  var currentLastCol = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = [];
  if (sheet.getLastRow() >= 1) {
    currentHeaders = sheet.getRange(1, 1, 1, currentLastCol).getValues()[0]
      .map(function(v) { return String(v || "").trim(); });
  }

  var missing = [];
  expected.forEach(function(h) {
    if (currentHeaders.indexOf(h) === -1) missing.push(h);
  });

  if (missing.length === 0 && !created) {
    // 表頭順序可能不一致，強制改成 expected
    var orderChanged = false;
    for (var i = 0; i < expected.length; i++) {
      if (String(currentHeaders[i] || "") !== expected[i]) {
        orderChanged = true;
        break;
      }
    }
    if (!orderChanged) {
      return {
        ok: true,
        version: HSC_VERSION,
        action: "repairPaymentInboxSchema",
        status: "already_ok",
        headers: currentHeaders
      };
    }
  }

  // 直接寫入完整 expected 表頭
  sheet.getRange(1, 1, 1, expected.length).setValues([expected]);

  // 移除多餘欄位
  var maxCols = sheet.getMaxColumns();
  if (maxCols > expected.length) {
    sheet.deleteColumns(expected.length + 1, maxCols - expected.length);
  }

  clearSheetRowCache_("payment_inbox_db");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "repairPaymentInboxSchema",
    status: created ? "sheet_created_and_headers_written" : "repaired",
    added_columns: missing,
    final_headers: expected
  };
}

/**
 * 客戶付款回報 API（v7.12.2 付款類型分流版）
 * 客戶端需傳：card_id, amount, last5, note, payment_type, target_id, raw_text(optional)
 */
function submitPaymentCheck_(req) {
  ensureSchemasOrThrow_(["payment_inbox_db"]);

  var now = new Date();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var amount = Number(req.amount || 0);
  var last5  = sanitizeText_(req.last5);

  if (!cardId) throw new Error("Missing card_id");
  if (!amount) throw new Error("Missing amount");
  if (!last5)  throw new Error("Missing last5");
// ★ 防重複：同一張卡已有 pending customer 記錄，不重複寫入
  var existingCustomer = getSheetRowsByName_("payment_inbox_db").find(function(r) {
    return sanitizeText_(r.source) === "customer" &&
           sanitizeText_(r.card_id) === cardId &&
           sanitizeText_(r.matched).toUpperCase() !== "TRUE" &&
           sanitizeText_(r.status) === "pending";
  });
  if (existingCustomer) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "submitPaymentCheck",
      inbox_id: sanitizeText_(existingCustomer.inbox_id),
      status: "pending",
      reused: true,
      message: "已有待比對記錄，不重複寫入"
    };
  }
  // 寫入客戶自報（source=customer）
  var row = emptyRow_("payment_inbox_db");
  row.inbox_id           = "IN" + Date.now();
  row.created_at         = toIso_(now);
  row.source             = "customer";
  row.card_id            = cardId;
  row.amount             = String(amount);
  row.last5              = last5;
  row.matched            = "FALSE";
  row.matched_card_id    = "";
  row.matched_payment_id = "";
  row.status             = "pending";
  row.note               = sanitizeText_(req.note || "");

  appendRowByName_("payment_inbox_db", row);

  // 觸發比對
  try {
    autoMatchPayments_();
  } catch (err) {
    Logger.log("submitPaymentCheck_ autoMatch error: " + err.message);
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "submitPaymentCheck",
    inbox_id: row.inbox_id,
    status: "pending"
  };
}

/**
 * 自動比對付款（新版）
 * 同表內找 source=customer + source=agent 配對
 * 嚴格3條件：card_id + amount + last5 全符合才算
 * 嚴格禁止跨表比對
 */function autoMatchPayments_() {
  ensureSchemasOrThrow_(["payment_inbox_db", "payment_db"]);

  var inboxList = getSheetRowsByName_("payment_inbox_db");

  var customerList = inboxList.filter(function(r) {
    return sanitizeText_(r.source) === "customer" &&
           sanitizeText_(r.matched).toUpperCase() !== "TRUE";
  });
  var agentList = inboxList.filter(function(r) {
    return sanitizeText_(r.source) === "agent" &&
           sanitizeText_(r.matched).toUpperCase() !== "TRUE";
  });

  customerList.forEach(function(customer) {
    var cCardId = sanitizeText_(customer.card_id).toUpperCase();
    var cAmount = Number(customer.amount || 0);
    var cLast5  = sanitizeText_(customer.last5);

    // 🛡️ 保護1：同卡已有 paid 記錄，跳過
    var payments = getSheetRowsByName_("payment_db");
    var alreadyPaid = payments.some(function(p) {
      return sanitizeText_(p.card_id).toUpperCase() === cCardId &&
             sanitizeText_(p.status).toLowerCase() === "paid";
    });
    if (alreadyPaid) {
      Logger.log("autoMatchPayments_: skip " + cCardId + " already paid");
      return;
    }

    // 🛡️ 保護2：直接查 Sheet 確認 inbox 真實狀態（不信快取）
    var freshInbox = findRowByField_("payment_inbox_db", "inbox_id", sanitizeText_(customer.inbox_id));
    if (freshInbox && sanitizeText_(freshInbox.matched).toUpperCase() === "TRUE") {
      Logger.log("autoMatchPayments_: skip inbox already matched " + customer.inbox_id);
      return;
    }

    var matched = agentList.find(function(agent) {
      return sanitizeText_(agent.card_id).toUpperCase() === cCardId &&
             Number(agent.amount || 0) === cAmount &&
             sanitizeText_(agent.last5) === cLast5 &&
             sanitizeText_(agent.matched).toUpperCase() !== "TRUE";
    });

    if (!matched) return;

    try {
      var paymentRow = payments.find(function(p) {
        return sanitizeText_(p.card_id) === sanitizeText_(customer.card_id) &&
               sanitizeText_(p.status).toLowerCase() === "pending";
      });

      if (!paymentRow) {
        Logger.log("autoMatchPayments_: no pending payment for card_id=" + cCardId);
        return;
      }

      confirmPayment_({
        payment_id:  sanitizeText_(paymentRow.payment_id),
        paid_at:     toIso_(new Date()),
        method:      "bank_transfer",
        note:        "auto_match_from_inbox:" + sanitizeText_(customer.inbox_id),
        operated_by: "system"
      });

      var matchedPaymentId = sanitizeText_(paymentRow.payment_id);

      // 標記 customer 筆
      var updatedCustomer = shallowClone_(customer);
      updatedCustomer.matched            = "TRUE";
      updatedCustomer.matched_card_id    = sanitizeText_(customer.card_id);
      updatedCustomer.matched_payment_id = matchedPaymentId;
      updatedCustomer.status             = "auto_matched";
      updateRowByName_("payment_inbox_db", customer.__rowNum, updatedCustomer);

      // 標記 agent 筆
      var updatedAgent = shallowClone_(matched);
      updatedAgent.matched            = "TRUE";
      updatedAgent.matched_card_id    = sanitizeText_(customer.card_id);
      updatedAgent.matched_payment_id = matchedPaymentId;
      updatedAgent.status             = "auto_matched";
      updateRowByName_("payment_inbox_db", matched.__rowNum, updatedAgent);

      // 避免重複比對
      matched.matched = "TRUE";

      Logger.log("autoMatchPayments_: matched card_id=" + cCardId + " payment_id=" + matchedPaymentId);

    } catch (err) {
      Logger.log("autoMatchPayments_ error card_id=" + cCardId + " : " + err.message);
    }
  });

  // 補：customer 已 manual_matched，agent 後來才進來
  agentList.forEach(function(agent) {
    var aCardId = sanitizeText_(agent.card_id).toUpperCase();
    var aAmount = Number(agent.amount || 0);
    var aLast5  = sanitizeText_(agent.last5);

    var matchedCustomer = inboxList.find(function(r) {
      return sanitizeText_(r.source) === "customer" &&
             sanitizeText_(r.matched).toUpperCase() === "TRUE" &&
             sanitizeText_(r.card_id).toUpperCase() === aCardId &&
             Number(r.amount || 0) === aAmount &&
             sanitizeText_(r.last5) === aLast5;
    });

    if (!matchedCustomer) return;

    try {
      var updatedAgent = shallowClone_(agent);
      updatedAgent.matched            = "TRUE";
      updatedAgent.matched_card_id    = sanitizeText_(matchedCustomer.matched_card_id);
      updatedAgent.matched_payment_id = sanitizeText_(matchedCustomer.matched_payment_id);
      updatedAgent.status             = "auto_matched";
      updateRowByName_("payment_inbox_db", agent.__rowNum, updatedAgent);
      agent.matched = "TRUE";
      Logger.log("autoMatchPayments_ late-agent matched card_id=" + aCardId);
    } catch (err) {
      Logger.log("autoMatchPayments_ late-agent error: " + err.message);
    }
  });

  return { ok: true, version: HSC_VERSION, action: "autoMatchPayments" };
}
/**
 * 客服填入銀行入帳資料（admin panel 呼叫）
 * source=agent，填完立刻觸發比對
 */
function submitAgentPaymentInbox_(req) {
  requireAdminKeyOrSystem_(req || {});
  ensureSchemasOrThrow_(["payment_inbox_db"]);

  var now    = new Date();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var amount = Number(req.amount || 0);
  var last5  = sanitizeText_(req.last5);

  if (!cardId) throw new Error("Missing card_id");
  if (!amount) throw new Error("Missing amount");
  if (!last5)  throw new Error("Missing last5");
var existing = getSheetRowsByName_("payment_inbox_db").find(function(r) {
    return sanitizeText_(r.source) === "agent" &&
           sanitizeText_(r.card_id) === cardId &&
           sanitizeText_(r.status) === "pending";
  });
  if (existing) {
    throw new Error("已有待比對的存入紀錄：" + sanitizeText_(existing.inbox_id) + "，請勿重複送出");
  }
  var row = emptyRow_("payment_inbox_db");
  row.inbox_id           = "IN" + Date.now();
  row.created_at         = toIso_(now);
  row.source             = "agent";
  row.card_id            = cardId;
  row.amount             = String(amount);
  row.last5              = last5;
  row.matched            = "FALSE";
  row.matched_card_id    = "";
  row.matched_payment_id = "";
  row.status             = "pending";
  row.note               = sanitizeText_(req.note || "");

  appendRowByName_("payment_inbox_db", row);

  try {
    autoMatchPayments_();
  } catch (err) {
    Logger.log("submitAgentPaymentInbox_ autoMatch error: " + err.message);
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "submitAgentPaymentInbox",
    inbox_id: row.inbox_id,
    status: "pending"
  };
}

/**
 * 付款類型分流主函式
 * 依 paymentType 分三條路處理：
 *   - first_payment：找/建立 pending payment → 呼叫 confirmPayment_（會正確處理 expires_at = paid_at+365）
 *   - renewal：已有 paymentRow → 呼叫 confirmPayment_（內部續約邏輯會判斷未到期/已過期）
 *   - update_fee：已有 paymentRow → 呼叫 confirmUpdateFeePaid_（只改 payment，不動 card 方案/效期）
 */
function markPaymentPaidAuto_(card, inbox, paymentType, paymentRow) {
  if (!card || !card.__rowNum) throw new Error("markPaymentPaidAuto_: invalid card");
  if (!inbox) throw new Error("markPaymentPaidAuto_: invalid inbox");

  paymentType = sanitizeText_(paymentType).toLowerCase() || "first_payment";

  var now = new Date();
  var nowIso = toIso_(now);
  var inboxId = sanitizeText_(inbox.inbox_id);
  var inboxTag = "auto_match_from_inbox:" + inboxId;

  if (paymentType === "first_payment") {
    return autoFirstPaymentPaid_(card, inbox, now, nowIso, inboxTag);
  }

  if (paymentType === "renewal") {
    if (!paymentRow || !paymentRow.payment_id) {
      throw new Error("markPaymentPaidAuto_: missing payment row for renewal");
    }

    // 標記 source=auto_match
    if (paymentRow.__rowNum) {
      var rp = shallowClone_(paymentRow);
      rp.source = "auto_match";
      rp.note = mergeNote_(rp.note, inboxTag);
      rp.updated_at = nowIso;
      updateRowByName_("payment_db", paymentRow.__rowNum, rp);
    }

    // confirmPayment_ 內部對 renewal 的 expires_at 邏輯：
    //   若 currentExpire > paidAt（未到期）→ baseDate = currentExpire
    //   否則 → baseDate = paidAt
    //   新 expires_at = baseDate + 365
    // 完全符合 v7.12.2 spec
    confirmPayment_({
      payment_id: sanitizeText_(paymentRow.payment_id),
      paid_at: nowIso,
      method: "bank_transfer",
      note: inboxTag,
      operated_by: "system"
    });

    return {
      ok: true,
      version: HSC_VERSION,
      action: "markPaymentPaidAuto",
      payment_type: "renewal",
      card_id: sanitizeText_(card.id),
      payment_id: sanitizeText_(paymentRow.payment_id)
    };
  }

  if (paymentType === "update_fee") {
    if (!paymentRow || !paymentRow.payment_id) {
      throw new Error("markPaymentPaidAuto_: missing payment row for update_fee");
    }

    if (paymentRow.__rowNum) {
      var uf = shallowClone_(paymentRow);
      uf.source = "auto_match";
      uf.note = mergeNote_(uf.note, inboxTag);
      uf.updated_at = nowIso;
      updateRowByName_("payment_db", paymentRow.__rowNum, uf);
    }

    // 只把 payment 標記為 paid，不動 card expires_at / plan
    confirmUpdateFeePaid_({
      payment_id: sanitizeText_(paymentRow.payment_id),
      paid_at: nowIso,
      method: "bank_transfer",
      note: inboxTag,
      operated_by: "system"
    });

    // Card 僅更新 updated_at + note
    var latestCard = findRowByField_("card_db", "id", sanitizeText_(card.id)) || card;
    if (latestCard && latestCard.__rowNum) {
      var cu = shallowClone_(latestCard);
      cu.updated_at = nowIso;
      cu.note = mergeNote_(cu.note, "update_fee_paid_auto:" + inboxId);
      updateRowByName_("card_db", latestCard.__rowNum, cu);
      invalidateCardPublicCache_(cu.id || cu.card_id);
    }

    return {
      ok: true,
      version: HSC_VERSION,
      action: "markPaymentPaidAuto",
      payment_type: "update_fee",
      card_id: sanitizeText_(card.id),
      payment_id: sanitizeText_(paymentRow.payment_id)
    };
  }

  throw new Error("markPaymentPaidAuto_: unsupported payment_type: " + paymentType);
}

/**
 * first_payment 的自動付款處理：
 *  1. 找既有 pending first_payment → 有就重用、沒有就建立新的 pending payment
 *  2. 打上 source=auto_match
 *  3. 呼叫 confirmPayment_ 完成開通（會自動設 expires_at=paid_at+365、status=active、billing_status=paid）
 */
function autoFirstPaymentPaid_(card, inbox, now, nowIso, inboxTag) {
  var cardId = sanitizeText_(card.id);
  var amount = Number(inbox.amount || 0);
  if (!amount) {
    amount = sanitizeText_(card.plan).toLowerCase() === "premium" ? 2000 : 1500;
  }

  var pending = getSheetRowsByName_("payment_db").find(function(p) {
    return sanitizeText_(p.card_id) === cardId &&
           sanitizeText_(p.event_type) === "first_payment" &&
           sanitizeText_(p.status).toLowerCase() === "pending";
  });

  var paymentId;

  if (pending) {
    // 既有 pending → 標記 source、然後讓 confirmPayment_ 處理
    var reused = shallowClone_(pending);
    reused.source = "auto_match";
    reused.note = mergeNote_(reused.note, inboxTag);
    reused.updated_at = nowIso;
    updateRowByName_("payment_db", pending.__rowNum, reused);
    paymentId = sanitizeText_(pending.payment_id);
  } else {
    // 沒有 pending → 建立一筆
    var newPayment = emptyRow_("payment_db");
    newPayment.payment_id = generatePaymentId_();
    newPayment.card_id = cardId;
    newPayment.lead_id = findLeadIdByCardId_(cardId);
    newPayment.created_at = nowIso;
    newPayment.updated_at = nowIso;
    newPayment.event_type = "first_payment";
    newPayment.order_type = "offline_transfer";
    newPayment.plan = sanitizeText_(card.plan);
    newPayment.amount = String(amount);
    newPayment.status = "pending";
    newPayment.due_at = sanitizeText_(card.payment_due_at);
    newPayment.method = "bank_transfer";
    newPayment.payment_channel = "offline_transfer";
    newPayment.note = inboxTag;
    newPayment.created_by = "system";
    newPayment.is_test = sanitizeText_(card.is_test) || "FALSE";
    newPayment.tenant = sanitizeText_(card.tenant) || CONFIG.DEFAULT_TENANT;
    newPayment.agent_id = sanitizeText_(card.agent_id);
    newPayment.agent_type = normalizeAgentTypeForSheet_(sanitizeText_(card.agent_type));
    newPayment.member_tier = mapAgentTypeToTier_(newPayment.agent_type);
    newPayment.share_card_id = sanitizeText_(card.share_card_id || cardId);
    newPayment.share_agent_id = sanitizeText_(card.share_agent_id || card.referrer || card.service_agent);
    newPayment.share_source = sanitizeText_(card.share_source || "auto_match");
    newPayment.share_channel = sanitizeText_(card.share_channel || "payment_form");
    newPayment.commission_status = "pending";
    newPayment.card_status_before = sanitizeText_(card.status);
    newPayment.card_status_after = "active";
    newPayment.operated_by = "system";
    newPayment.risk_flag = "FALSE";
    newPayment.source = "auto_match";
    appendRowByName_("payment_db", newPayment);
    paymentId = newPayment.payment_id;
  }

  // confirmPayment_ 會把 pending 轉 paid、設 card.expires_at=paid_at+365、開通卡片、觸發分潤
  confirmPayment_({
    payment_id: paymentId,
    paid_at: nowIso,
    method: "bank_transfer",
    note: inboxTag,
    operated_by: "system"
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "markPaymentPaidAuto",
    payment_type: "first_payment",
    card_id: cardId,
    payment_id: paymentId
  };
}

/**
 * 異常中心：列出所有未比對成功的 inbox 項目
 * 回傳 payment_type / target_id / matched_payment_id 方便後台判斷
 */
function getUnmatchedPayments_(req) {
  requireAdminKeyOrSystem_(req || {});
  ensureSchemasOrThrow_(["payment_inbox_db"]);

  var list = getSheetRowsByName_("payment_inbox_db");
  var items = list.filter(function(r) {
   return sanitizeText_(r.inbox_id) !== "" &&
       sanitizeText_(r.matched).toUpperCase() !== "TRUE";
  }).map(function(r) {
    return {
      inbox_id: sanitizeText_(r.inbox_id),
      created_at: sanitizeText_(r.created_at),
      amount: sanitizeText_(r.amount),
      last5: sanitizeText_(r.last5),
      note: sanitizeText_(r.note),
      raw_text: sanitizeText_(r.raw_text),
      matched: sanitizeText_(r.matched),
      matched_card_id: sanitizeText_(r.matched_card_id),
      matched_payment_id: sanitizeText_(r.matched_payment_id),
      status: sanitizeText_(r.status),
      payment_type: sanitizeText_(r.payment_type),
      target_id: sanitizeText_(r.target_id)
    };
  }).sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getUnmatchedPayments",
    count: items.length,
    items: items
  };
}

/**
 * 異常中心：人工指派 inbox → card（依 payment_type 分流）
 * 必要參數：inbox_id, card_id
 * 選用參數：payment_type（若 inbox 裡沒有就補）、payment_id（renewal / update_fee 必要）、admin_key
 */
function assignPaymentToCard_(req) {
  requireAdminKeyOrSystem_(req || {});
  ensureSchemasOrThrow_(["payment_inbox_db", "card_db", "payment_db", "renewal_db"]);

  var inboxId = sanitizeText_(req.inbox_id || req.inboxId);
  var cardId = sanitizeText_(req.card_id || req.cardId);

  if (!inboxId) throw new Error("Missing inbox_id");
  if (!cardId) throw new Error("Missing card_id");

  var inbox = findRowByField_("payment_inbox_db", "inbox_id", inboxId);
  if (!inbox) throw new Error("Inbox not found");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var resolvedPaymentType = sanitizeText_(req.payment_type || req.paymentType).toLowerCase() ||
                            sanitizeText_(inbox.payment_type).toLowerCase() ||
                            "first_payment";

  var paymentRow = null;
  var reqPaymentId = sanitizeText_(req.payment_id || req.paymentId);
  var targetId = reqPaymentId || sanitizeText_(inbox.target_id);

  if (resolvedPaymentType === "renewal" || resolvedPaymentType === "update_fee") {
    if (!targetId) throw new Error("Missing payment_id / target_id for " + resolvedPaymentType);

    paymentRow = findRowByField_("payment_db", "payment_id", targetId);

    if (!paymentRow && resolvedPaymentType === "renewal") {
      var renewal = findRowByField_("renewal_db", "renewal_id", targetId);
      if (renewal) {
        var rpid = sanitizeText_(renewal.payment_id);
        if (rpid) paymentRow = findRowByField_("payment_db", "payment_id", rpid);
      }
    }

    if (!paymentRow) throw new Error("Payment row not found for target_id: " + targetId);
  }

  var result = markPaymentPaidAuto_(card, inbox, resolvedPaymentType, paymentRow);

  var finalPaymentId = paymentRow ? sanitizeText_(paymentRow.payment_id) : sanitizeText_((result || {}).payment_id);

  var updatedInbox = shallowClone_(inbox);
  updatedInbox.matched = "TRUE";
  updatedInbox.matched_card_id = cardId;
  updatedInbox.matched_payment_id = finalPaymentId;
  updatedInbox.status = "manual_matched";
  updatedInbox.payment_type = resolvedPaymentType;
  if (!sanitizeText_(updatedInbox.target_id)) {
    updatedInbox.target_id = targetId || cardId;
  }
  updateRowByName_("payment_inbox_db", inbox.__rowNum, updatedInbox);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "assignPaymentToCard",
    inbox_id: inboxId,
    card_id: cardId,
    payment_type: resolvedPaymentType,
    payment_id: finalPaymentId,
    result: result
  };
}

/************************************************************
 * HSC GAS v7.13.0 · PATCH FILE
 * ----------------------------------------------------------
 * 對應原檔:v7.12.2-payment-type-routing
 * 本檔所有函式都用 [REPLACE]/[ADD]/[DELETE] 標記
 *   [REPLACE] = 原檔已存在,整個函式/常數用本檔取代
 *   [ADD]     = 原檔沒有,整段新增(建議放在檔案尾端 util 區)
 *   [DELETE]  = 原檔有,請刪除
 *
 * 修正摘要:
 *   A1 電話號碼遺失前導零 — PHONE_COLUMNS_BY_SCHEMA_ + restorePhoneLeadingZero_
 *   A2 __system_call 資安漏洞 — normalizeRequest_ 過濾外部傳入
 *   A3 路由缺函式 — createInviteCode_ / rejectRecognition_
 *   A4 commission list 無 tenant 過濾
 *   A5 未路由的 admin url builder(保留但補進 ACTIONS,可選)
 *   B1 findRowByField_ 線性掃描 — 加 request-scoped primary key index
 *   B2 ScriptCache 覆蓋擴大
 *   B3 Batch 寫入取代逐筆
 *   B4 schema 驗證 per-request 只跑一次
 *   B5 clearSheetRowCache_(undefined) 瘦身
 *   C1 createAddonOrder_ 升級金分流錯誤
 *   C2 C3 C4 C5 一致性調整
 ************************************************************/


/* ============================================================
 * ============ [REPLACE] 檔頂常數:版本號更新 =================
 * ============================================================ */
// 原檔:
//   const HSC_VERSION = "v7.12.2-payment-type-routing";
// 改為:
const HSC_VERSION = "v507";

/* ============================================================
 * ======= [ADD] LIFF URL 轉換工具(v7.15 LINE 整合)==========
 * ============================================================ */
const HSC_LIFF_ID = "2009864519-odP1LSn7";
function toLiffUrl_(formUrl) {
  if (!formUrl) return formUrl;
  var questionIndex = String(formUrl).indexOf("?");
  var queryString = questionIndex >= 0 ? formUrl.substring(questionIndex) : "";
  return "https://liff.line.me/" + HSC_LIFF_ID + queryString;
}

/* ============================================================
 * ========= [ADD] 電話欄位定義與處理(A1 修正) ===============
 * ============================================================ */

// 每個 schema 中的「電話欄位」清單
// 這些欄位會被強制以文字格式儲存,讀出時會補回前導零
var PHONE_COLUMNS_BY_SCHEMA_ = {
  card_db: ["phone", "owner_phone"],
  lead_db: ["phone"],
  agent_db: ["owner_phone"]
};

/**
 * 針對 Taiwan 常見號碼,嘗試把因 Sheet 自動轉數字而失去的前導零補回來
 *  - 9xxxxxxxx (9 碼,開頭 9)         → 0 + 原字串  (手機)
 *  - 2xxxxxxx~8xxxxxxxx (8~9 碼,開頭 2-8) → 0 + 原字串 (市話)
 *  - 已經有前導 0 或含非數字字元,維持原樣
 */
function restorePhoneLeadingZero_(value) {
  if (value === null || value === undefined) return "";
  var s = String(value).trim();
  if (!s) return "";
  // 非純數字(e.g. 已含 "+886"、"-"、空白)不處理
  if (!/^\d+$/.test(s)) return s;
  // 已經有前導 0
  if (s.charAt(0) === "0") return s;
  // Taiwan 手機:9 碼,首位 9
  if (/^9\d{8}$/.test(s)) return "0" + s;
  // Taiwan 市話:8~9 碼,首位 2–8
  if (/^[2-8]\d{7,8}$/.test(s)) return "0" + s;
  return s;
}

/**
 * 對指定 schema 的電話欄位,強制儲存格文字格式(@)
 * 設為一次性初始化動作(schema check 時順便做),之後寫入就不會被自動轉數字
 */
function ensurePhoneColumnTextFormat_(schemaName, sheet) {
  var cols = PHONE_COLUMNS_BY_SCHEMA_[schemaName];
  if (!cols || !cols.length) return;
  var headers = SCHEMA[schemaName];
  if (!headers) return;
  var lastRow = Math.max(sheet.getMaxRows(), 2);
  cols.forEach(function(col) {
    var idx = headers.indexOf(col);
    if (idx === -1) return;
    try {
      sheet.getRange(1, idx + 1, lastRow, 1).setNumberFormat("@");
    } catch (e) {
      // 靜默失敗,不影響主流程
    }
  });
}

/**
 * 在寫入前,對 row 物件中所有電話欄位做標準化:
 *  1. 確保是字串
 *  2. 如果原本是帶前導零的完整號碼,保留
 *  3. 如果偵測到缺少前導零,補回來
 */
function applyPhoneNormalizationToRow_(schemaName, rowObj) {
  var cols = PHONE_COLUMNS_BY_SCHEMA_[schemaName];
  if (!cols || !cols.length) return rowObj;
  cols.forEach(function(col) {
    if (rowObj[col] !== undefined && rowObj[col] !== null && rowObj[col] !== "") {
      rowObj[col] = restorePhoneLeadingZero_(String(rowObj[col]).trim());
    }
  });
  return rowObj;
}


/* ============================================================
 * ========== [REPLACE] sanitizePhoneAsText_ ==================
 * ============================================================ */
// 原函式只做 trim + 去空白。新版加入前導零還原。
function sanitizePhoneAsText_(value) {
  if (value === null || value === undefined) return "";
  var s = String(value).replace(/\s+/g, "").trim();
  if (!s) return "";
  // 移除 Excel/Sheet 前置的單引號(如果有)
  if (s.charAt(0) === "'") s = s.substring(1);
  return restorePhoneLeadingZero_(s);
}


/* ============================================================
 * ============ [REPLACE] normalizeCell_ ======================
 * ============================================================ */
// 這個函式會被 getSheetRowsByName_ 呼叫,是把 Sheet cell 轉字串的核心
// 數字型別一律轉字串(原本就是),但對於「被判定是電話的」保留可能的前導零
// 注意:這裡不知道 schema/field,所以真正的前導零補回在讀完整張表後做
// (在 getSheetRowsByName_ 裡做 per-column 修正)
function normalizeCell_(value) {
  if (value === null || value === undefined) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return isNaN(value.getTime()) ? "" : toIso_(value);
  }

  if (typeof value === "number") {
    // 保留整數不要出現科學記號
    if (!isFinite(value)) return "";
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return sanitizeText_(value);
}


/* ============================================================
 * ============ [REPLACE] getSheetRowsByName_ =================
 * ============================================================ */


/* ============================================================
 * ============ [REPLACE] appendRowByName_ ====================
 * ============================================================ */
// 1. 寫入前套用電話標準化
// 2. 首次寫入時,確保電話欄位是文字格式(避免 appendRow 自動轉 number)
// 3. 維持原本 schema invalidate 行為
function appendRowByName_(schemaName, rowObj) {
  var sheet = getSheetByName_(schemaName);
  var headers = SCHEMA[schemaName];
  validateHeaders_(schemaName, sheet.getRange(1, 1, 1, headers.length).getValues()[0]);

  // A1 修正:確保電話欄位文字格式(一次性,用 SchemaCheckCache 去重)
  ensurePhoneFormatOnce_(schemaName, sheet);

  var normalizedRow = ensureRequiredDueFieldsForSchema_(
    schemaName,
    normalizeRowDateFieldsForSchema_(
      schemaName,
      applyPhoneNormalizationToRow_(schemaName, rowObj)
    )
  );
  var values = headers.map(function(h) {
    return normalizedRow[h] !== undefined ? normalizedRow[h] : "";
  });
  sheet.appendRow(values);
  invalidateCacheOnWrite_(schemaName);
  return sheet.getLastRow();
}


/* ============================================================
 * ============ [REPLACE] updateRowByName_ ====================
 * ============================================================ */
function updateRowByName_(schemaName, rowNum, rowObj) {
  var sheet = getSheetByName_(schemaName);
  var headers = SCHEMA[schemaName];
  validateHeaders_(schemaName, sheet.getRange(1, 1, 1, headers.length).getValues()[0]);

  ensurePhoneFormatOnce_(schemaName, sheet);

  var normalizedRow = ensureRequiredDueFieldsForSchema_(
    schemaName,
    normalizeRowDateFieldsForSchema_(
      schemaName,
      applyPhoneNormalizationToRow_(schemaName, rowObj)
    )
  );
  var values = headers.map(function(h) {
    return normalizedRow[h] !== undefined ? normalizedRow[h] : "";
  });
  sheet.getRange(rowNum, 1, 1, headers.length).setValues([values]);
  invalidateCacheOnWrite_(schemaName);
}


/* ============================================================
 * ============ [ADD] ensurePhoneFormatOnce_ ==================
 * ============================================================ */
// 每個 schema 在本次 execution 中只設定一次電話欄位文字格式,避免每次寫入都重設
var _phoneFormatApplied_ = {};
function ensurePhoneFormatOnce_(schemaName, sheet) {
  if (_phoneFormatApplied_[schemaName]) return;
  ensurePhoneColumnTextFormat_(schemaName, sheet);
  _phoneFormatApplied_[schemaName] = true;
}


/* ============================================================
 * ============ [REPLACE] updateRowsByNameBatch_ ==============
 * ============================================================ */
// 同樣加入電話正規化
function updateRowsByNameBatch_(schemaName, rowsToWrite) {
  rowsToWrite = Array.isArray(rowsToWrite) ? rowsToWrite : [];
  if (!rowsToWrite.length) return 0;

  var sheet = getSheetByName_(schemaName);
  var headers = SCHEMA[schemaName];
  validateHeaders_(schemaName, sheet.getRange(1, 1, 1, headers.length).getValues()[0]);

  ensurePhoneFormatOnce_(schemaName, sheet);

  rowsToWrite.forEach(function(entry) {
    if (!entry || !entry.rowNum || !entry.rowObj) return;
    var normalizedRow = ensureRequiredDueFieldsForSchema_(
      schemaName,
      normalizeRowDateFieldsForSchema_(
        schemaName,
        applyPhoneNormalizationToRow_(schemaName, entry.rowObj)
      )
    );
    var values = headers.map(function(h) {
      return normalizedRow[h] !== undefined ? normalizedRow[h] : "";
    });
    sheet.getRange(entry.rowNum, 1, 1, headers.length).setValues([values]);
  });

  invalidateCacheOnWrite_(schemaName);
  return rowsToWrite.length;
}


/* ============================================================
 * ========== [REPLACE] normalizeRequest_(A2 資安修正) =======
 * ============================================================ */
// 核心修正:刪除外部傳入的 __system_call,防止繞過 admin 檢查
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

  // === A2 資安修正:任何外部傳入的 __system_call 一律移除 ===
  // 只有 GAS 內部函式呼叫時才可以自己加上這個 flag
  if (Object.prototype.hasOwnProperty.call(req, "__system_call")) {
    delete req.__system_call;
  }
  if (Object.prototype.hasOwnProperty.call(req, "__systemCall")) {
    delete req.__systemCall;
  }

  req.action = String(req.action || "").trim();
  req.card_id = String(req.card_id || "").trim();
  req.payment_id = String(req.payment_id || "").trim();
  req.invite_code = String(req.invite_code || "").trim();
  req.ref = String(req.ref || "").trim();
  req.plan = String(req.plan || "").trim();

  if (!req.action && payloadObj && typeof payloadObj === "object" && payloadObj.action) {
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

  Logger.log("normalizeRequest_ req (after security filter) = " + JSON.stringify(req));
  return req;
}


/* ============================================================
 * ============ [REPLACE] invalidateCacheOnWrite_ =============
 * ============================================================ */
/* ============================================================
 * ============ [REPLACE] clearSheetRowCache_(瘦身) ==========
 * ============================================================ */
// 原本沒給 schemaName 時會跑迴圈 remove 全部 SCHEMA key,改成一次 removeAll
function clearSheetRowCache_(schemaName) {
  var cache = CacheService.getScriptCache();
  if (schemaName) {
    delete _sheetRowCache_[schemaName];
    clearSchemaCheckCache_(schemaName);
    try { cache.remove(getSheetRowsScriptCacheKey_(schemaName)); } catch (_e) {}
  } else {
    _sheetRowCache_ = {};
    clearSchemaCheckCache_();
    // 批次 removeAll 一次清掉
    try {
      var keys = Object.keys(SCHEMA).map(getSheetRowsScriptCacheKey_);
      if (keys.length) cache.removeAll(keys);
    } catch (_e) {}
  }
}


/* ============================================================
 * ====== [ADD] Request-scoped primary key index(B1 效能) ===
 * ============================================================ */
var _requestIndexCache_ = {};

// 對哪些欄位自動建立 index(primary key 或常被查詢的欄位)
var INDEX_FIELDS_BY_SCHEMA_ = {
  card_db: ["id", "token", "update_token", "invite_code"],
  lead_db: ["lead_id", "invite_code"],
  invite_db: ["invite_code"],
  plan_db: ["plan_id"],
  payment_db: ["payment_id"],
  renewal_db: ["renewal_id", "renew_token", "payment_id"],
  pricing_db: ["item_code"],
  commission_db: ["commission_id", "payment_id"],
  commission_rules: ["rule_id"],
  agent_db: ["agent_id"],
  announcement_db: ["id"],
  update_log_db: ["update_id"],
  request_db: ["request_id"],
  service_log: ["service_log_id"],
  add_on_order_db: ["addon_order_id"],
  recognition_db: ["recognition_id"],
   payment_inbox_db: ["inbox_id"]
};

/**
 * 取得/建立某張表在某欄位上的索引
 * 回傳 { row } 形式,O(1) 查詢
 */
function getSchemaIndex_(schemaName, field) {
  var key = schemaName + ":" + field;
  if (_requestIndexCache_[key]) return _requestIndexCache_[key];
  var rows = getSheetRowsByName_(schemaName);
  var index = {};
  for (var i = 0; i < rows.length; i++) {
    var v = normalizeCell_(rows[i][field]);
    if (v) index[v] = rows[i];
  }
  _requestIndexCache_[key] = index;
  return index;
}

function isIndexedField_(schemaName, field) {
  var list = INDEX_FIELDS_BY_SCHEMA_[schemaName];
  return list && list.indexOf(field) !== -1;
}


/* ============================================================
 * ============ [REPLACE] findRowByField_(B1 效能) ===========
 * ============================================================ */
// 對主鍵欄位採 O(1) index 查詢,否則 fallback 線性掃描
function findRowByField_(schemaName, field, value) {
  var target = normalizeCell_(value);
  if (!target) return null;

  if (isIndexedField_(schemaName, field)) {
    var idx = getSchemaIndex_(schemaName, field);
    return idx[target] || null;
  }

  var rows = getSheetRowsByName_(schemaName);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeCell_(rows[i][field]) === target) return rows[i];
  }
  return null;
}
/**
 * v7.13: 從 sheet 批次刪除多筆 row(降序刪除避免 index 跑掉)
 * 
 * @param {string} sheetName - 試算表名稱
 * @param {Array<Object>} rows - 要刪除的 row 物件陣列,每筆必須含 __rowNum 欄位
 * @return {number} 實際刪除的筆數
 */
function deleteRowsByName_(sheetName, rows) {
  if (!rows || rows.length === 0) return 0;
  
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("deleteRowsByName_ sheet not found: " + sheetName);
    return 0;
  }
  
  // 降序排序(從大到小),從最底部開始刪,避免 index 跑掉
  var rowNums = rows
    .map(function(r) { return toNumber_(r.__rowNum); })
    .filter(function(n) { return n > 0; })
    .sort(function(a, b) { return b - a; });
  
  var deletedCount = 0;
  rowNums.forEach(function(rowNum) {
    try {
      sheet.deleteRow(rowNum);
      deletedCount++;
    } catch (e) {
      Logger.log("deleteRowsByName_ failed at row " + rowNum + ": " + e.message);
    }
  });

  if (deletedCount > 0) {
    invalidateCacheOnWrite_(sheetName);
  }

  return deletedCount;
}

/* ============================================================
 * ========== [REPLACE] isSheetRowsScriptCacheable_ ==========
 * ============================================================ */


/* ============================================================
 * ========== [ADD] Request-level schema gating(B4) =========
 * ============================================================ */
// 在一個 request 生命週期內,ensureAllSchemasOrThrow_ 只做一次
var _allSchemasEnsuredInRequest_ = false;

/**
 * 在 request 入口先呼叫一次,之後各函式內的 ensureAllSchemasOrThrow_ 就變 no-op
 */
function markAllSchemasEnsuredForRequest_() {
  _allSchemasEnsuredInRequest_ = true;
}


/* ============================================================
 * ========= [REPLACE] ensureAllSchemasOrThrow_(B4) ==========
 * ============================================================ */


/* ============================================================
 * ============ [ADD] createInviteCode_(A3 修正) =============
 * ============================================================ */
// 路由 createInviteCode 呼叫的是 createInviteCode_,原本只有 Optimized 版,補回主版本
function createInviteCode_(req) {
  req = req || {};
  return createInviteCodeOptimized_({
    tenant: sanitizeText_(req.tenant) || CONFIG.DEFAULT_TENANT,
    plan: sanitizeText_(req.plan),
    referrer: sanitizeText_(req.referrer),
    service_agent: sanitizeText_(req.service_agent),
    agent_type: sanitizeText_(req.agent_type),
    source: sanitizeText_(req.source) || "invite",
    max_use: Number(req.max_use || 1),
    note: sanitizeText_(req.note),
    created_by: sanitizeText_(req.created_by || req.operated_by || "admin"),
    status: sanitizeText_(req.status) || "active",
    is_test: sanitizeText_(req.is_test) || "FALSE",
    expire_days: Number(req.expire_days || CONFIG.INVITE_DEFAULT_EXPIRE_DAYS),
    invite_code: sanitizeText_(req.invite_code) || ""
  });
}


/* ============================================================
 * ============ [ADD] rejectRecognition_(A3 修正) ============
 * ============================================================ */
function rejectRecognition_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var recognitionId = sanitizeText_(req.recognition_id);
  var eventType = sanitizeText_(req.event_type);
  var eventId = sanitizeText_(req.event_id);
  var agentId = sanitizeText_(req.agent_id);
  var note = sanitizeText_(req.note);
  var recognizedBy = sanitizeText_(req.recognized_by || req.operated_by || "system");

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

  var currentResult = sanitizeText_(recognition.recognition_result);
  if (currentResult === "approved") {
    throw new Error("Recognition already approved, cannot reject");
  }
  if (currentResult === "rejected") {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "rejectRecognition",
      recognition: recognition,
      unchanged: true
    };
  }

  var nowIso = toIso_(new Date());
  var updated = shallowClone_(recognition);
  updated.recognition_result = "rejected";
  updated.recognized_by = recognizedBy;
  updated.recognized_at = nowIso;
  updated.note = mergeNote_(updated.note, note || "rejected_by_admin");
  updated.updated_at = nowIso;
  updateRowByName_("recognition_db", recognition.__rowNum, updated);

  writeOpsLog_({
    module: "recognition",
    action: "rejected",
    target_id: sanitizeText_(updated.recognition_id),
    before_status: currentResult || "pending",
    after_status: "rejected",
    note: "event_type=" + sanitizeText_(updated.event_type) + "|event_id=" + sanitizeText_(updated.event_id) + "|agent_id=" + sanitizeText_(updated.agent_id),
    tenant: sanitizeText_(updated.tenant) || CONFIG.DEFAULT_TENANT,
    operator: recognizedBy
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "rejectRecognition",
    recognition: updated
  };
}


/* ============================================================
 * ========== [REPLACE] getCommissionList_(A4 修正) ==========
 * ============================================================ */
function getCommissionList_(req) {
  var tenant = getTenant_(req);
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  var rows = getSheetRowsByName_("commission_db").filter(function(r) {
    if (!sameTenant_(r.tenant, tenant)) return false;
    if (agentId && sanitizeText_(r.beneficiary_agent_id) !== agentId) return false;
    return true;
  });
  return { ok: true, version: HSC_VERSION, action: "getCommissionList", tenant: tenant, commissions: rows };
}


/* ============================================================
 * ========= [REPLACE] adminGetCommissionList_(A4 修正) ======
 * ============================================================ */
function adminGetCommissionList_(req) {
  var tenant = getTenant_(req);
  var status = sanitizeText_(req.status).toLowerCase();
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  var agentId = sanitizeText_(req.agent_id || req.agentId);
  var limit = Math.max(1, Math.min(1000, parseInt(req.limit || "500", 10) || 500));

  var rows = getSheetRowsByName_("commission_db").filter(function(r) {
    if (!sameTenant_(r.tenant, tenant)) return false;
    if (status && sanitizeText_(r.status).toLowerCase() !== status) return false;
    if (cardId && sanitizeText_(r.card_id) !== cardId) return false;
    if (paymentId && sanitizeText_(r.payment_id) !== paymentId) return false;
    if (agentId && sanitizeText_(r.beneficiary_agent_id) !== agentId) return false;
    return true;
  }).sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  if (rows.length > limit) rows = rows.slice(0, limit);

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminGetCommissionList",
    tenant: tenant,
    count: rows.length,
    commissions: rows
  };
}


/* ============================================================
 * ========= [REPLACE] createAddonOrder_(C1 分流修正) ========
 * ============================================================ */
// 原本升級金(agent_upgrade_fee)的分流條件寫成
//   if (targetType !== "agent_upgrade_fee" || canUsePointsForPaymentType_("addon_payment"))
// 邏輯錯亂。改成:明確分流
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

  // === C1 修正:明確分流 ===
  // agent_upgrade_fee 本身的 payment_type 就是 "agent_upgrade_fee",要用這個判斷
  // 其他加購類則用 "addon_payment"
  var paymentTypeForRedeem = (targetType === "agent_upgrade_fee") ? "agent_upgrade_fee" : "addon_payment";
  var pointsRedeem = { applied: false, points_used: 0, amount_after: amountBefore, reason: "not_applied" };
  if (canUsePointsForPaymentType_(paymentTypeForRedeem)) {
    pointsRedeem = applyPointsRedemptionToAmount_({
      card: card,
      requested_points: req.points_to_apply || req.pointsApply || req.use_points || 0,
      amount_before: amountBefore,
      ref_id: orderId,
      type: targetType === "agent_upgrade_fee" ? "agent_upgrade_redeem" : "addon_redeem",
      note: targetType === "agent_upgrade_fee" ? "agent_upgrade_points_redeem" : "addon_points_redeem",
      operator: sanitizeText_(req.created_by || req.createdBy || "system"),
      payment_type: paymentTypeForRedeem
    });
  } else {
    pointsRedeem.reason = "payment_type_not_allowed:" + paymentTypeForRedeem;
  }

  // 升級金需檢查代理資格
  if (targetType === "agent_upgrade_fee") {
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


/* ============================================================
 * ========= [REPLACE] getPaymentCommissionStatus_(C5) =======
 * ============================================================ */
// 原本 payment 不存在時回 "",但應該明確回報錯誤
function getPaymentCommissionStatus_(req) {
  var paymentId = sanitizeText_(req.payment_id || req.paymentId);
  if (!paymentId) throw new Error("Missing payment_id");
  var payment = findRowByField_("payment_db", "payment_id", paymentId);
  if (!payment) {
    return {
      ok: false,
      version: HSC_VERSION,
      action: "getPaymentCommissionStatus",
      error: "Payment not found",
      payment_id: paymentId,
      status: ""
    };
  }
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getPaymentCommissionStatus",
    payment_id: paymentId,
    status: sanitizeText_(payment.commission_status)
  };
}


/* ============================================================
 * ============ [REPLACE] routeAction_(核心整合) =============
 * ============================================================ */
// 核心改動:
//   1. 在入口呼叫 markAllSchemasEnsuredForRequest_() 前先清 request-level flag
//      (新的 execution 會自己重新初始化,但為了保險在這裡 reset)
//   2. 在 try 的一開始 reset 所有 request-scoped 狀態
//   3. 其餘 switch 邏輯保持不變

/* ============================================================
 * ====== [REPLACE] triggerExpiryCheck_(B3 batch 寫入) ======
 * ============================================================ */
function triggerExpiryCheck_(req) {
  var now = new Date();
  var cards = getSheetRowsByName_("card_db");
  var results = { locked_overdue: 0, expired: 0, touched: 0 };
  var batch = [];

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
      batch.push({ rowNum: card.__rowNum, rowObj: updated });
      results.touched++;
    }
  });

  if (batch.length) {
    updateRowsByNameBatch_("card_db", batch);
    batch.forEach(function(entry) {
      var cardId = sanitizeText_(
        entry && entry.rowObj && (entry.rowObj.id || entry.rowObj.card_id)
      );
      if (!cardId) return;

      try {
        invalidateCardPublicCache_(cardId);
      } catch (cacheErr) {
        Logger.log(
          "[triggerExpiryCheck_] cache invalidation failed for " +
          cardId + ": " + cacheErr.message
        );
      }
    });
  }

  return { ok: true, version: HSC_VERSION, action: "triggerExpiryCheck", result: results };
}


/* ============================================================
 * ========== [REPLACE] runInviteExpireSweep(B3) =============
 * ============================================================ */
// 原本就已經 batch,但加個 log 保持一致
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
      Logger.log("runInviteExpireSweep error: " + err);
    }
  });

  if (pendingWrites.length) {
    updateRowsByNameBatch_("invite_db", pendingWrites);
  }

  Logger.log("runInviteExpireSweep expired=" + expired.length);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "runInviteExpireSweep",
    expired_count: expired.length,
    expired: expired
  };
}


/* ============================================================
 * ============ [ADD] __V713_FINAL_READY__ ====================
 * ============================================================ */
function __V713_FINAL_READY__() {
  return {
    ok: true,
    version: HSC_VERSION,
    status: "v7.13.0-phone-fix-perf",
    fixes: [
      "A1: 電話號碼前導零保留 — text 格式 + 讀寫雙向還原",
      "A2: __system_call 資安 — 外部傳入強制剝離",
      "A3: createInviteCode_ / rejectRecognition_ 補回",
      "A4: 佣金列表加入 tenant 過濾",
      "B1: findRowByField_ primary key index — O(1) 查詢",
      "B2: 更多只讀表納入 ScriptCache",
      "B3: 批次寫入(triggerExpiryCheck / runInviteExpireSweep)",
      "B4: schema 驗證每個 request 只跑一次",
      "B5: clearSheetRowCache_(undefined) 改用 removeAll",
      "C1: createAddonOrder_ 升級金分流邏輯修正",
      "C5: getPaymentCommissionStatus_ payment 不存在時明確回報"
    ]
  };
}
function runRepairPhoneLeadingZero() {
  var schemas = ["card_db", "lead_db", "agent_db"];
  var total = 0;
  schemas.forEach(function(schema) {
    var sheet = getSheetByName_(schema);
    var headers = SCHEMA[schema];
    var phoneCols = PHONE_COLUMNS_BY_SCHEMA_[schema];
    if (!phoneCols || !phoneCols.length) return;
    ensurePhoneColumnTextFormat_(schema, sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    phoneCols.forEach(function(col) {
      var colIdx = headers.indexOf(col);
      if (colIdx === -1) return;
      var range = sheet.getRange(2, colIdx + 1, lastRow - 1, 1);
      var values = range.getValues();
      var changed = false;
      for (var r = 0; r < values.length; r++) {
        var original = values[r][0];
        if (original === null || original === undefined || original === "") continue;
        var fixed = restorePhoneLeadingZero_(String(original).trim());
        if (String(original) !== fixed) {
          values[r][0] = fixed;
          changed = true;
          total++;
        }
      }
      if (changed) range.setValues(values);
    });
    clearSheetRowCache_(schema);
  });
  Logger.log("runRepairPhoneLeadingZero fixed count: " + total);
  return { ok: true, fixed_count: total };
}
/************************************************************
 * HSC GAS v7.14.0 · 維護模式 + 公告整合 PATCH
 * ----------------------------------------------------------
 * 貼到 GAS 檔案最下方(接在 v7.13.0 patch 後面)→ 重新部署
 *
 * 新功能:
 *   1. 維護模式(全站攔截客戶端 API)
 *   2. 後台一鍵開關維護模式
 *   3. 自動排程(到期自動關閉)
 *   4. 管理員可繞過維護模式
 *   5. 維護模式啟動時自動建立「maintenance」類型公告
 *
 * 新增 actions:
 *   - adminSetMaintenance  啟用/停用維護模式
 *   - getMaintenanceStatus 查詢目前維護狀態(公開)
 *   - adminQuickAnnounce   快速新增公告(簡化版 adminSaveAnnouncement)
 ************************************************************/

// 維護模式所用的 Script Property key
var MAINTENANCE_PROP_KEY_ = "HSC_MAINTENANCE_CONFIG";

// 維護模式下也「可以」通過的 action 白名單(不分是否有 admin_key)
// 這些 action 必須永遠能跑:ping 檢查、查維護狀態、所有 admin 操作
var MAINTENANCE_BYPASS_ACTIONS_ = [
  "ping",
  "getMaintenanceStatus",
  "getAnnouncements",
  "getAnnouncementDetail"
];


/* ============================================================
 * ======= [ADD] 取得/設定維護模式狀態 ==========================
 * ============================================================ */

function getMaintenanceConfig_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(MAINTENANCE_PROP_KEY_);
    if (!raw) return { enabled: false };
    var cfg = JSON.parse(raw);
    if (!cfg || typeof cfg !== "object") return { enabled: false };

    // 如果有結束時間且已過期,自動視為關閉
    if (cfg.enabled && cfg.end_at) {
      var endDate = new Date(cfg.end_at);
      if (!isNaN(endDate.getTime()) && endDate.getTime() < Date.now()) {
        // 過期了,自動關閉但保留訊息供記錄
        cfg.enabled = false;
        cfg.auto_ended_at = new Date().toISOString();
        PropertiesService.getScriptProperties().setProperty(MAINTENANCE_PROP_KEY_, JSON.stringify(cfg));
      }
    }

    return cfg;
  } catch (e) {
    Logger.log("getMaintenanceConfig_ error: " + e);
    return { enabled: false };
  }
}

function setMaintenanceConfig_(cfg) {
  cfg = cfg || {};
  var toStore = {
    enabled: !!cfg.enabled,
    message: sanitizeText_(cfg.message || ""),
    start_at: sanitizeText_(cfg.start_at || ""),
    end_at: sanitizeText_(cfg.end_at || ""),
    updated_at: new Date().toISOString(),
    updated_by: sanitizeText_(cfg.updated_by || "admin")
  };
  PropertiesService.getScriptProperties().setProperty(MAINTENANCE_PROP_KEY_, JSON.stringify(toStore));
  return toStore;
}

function isMaintenanceActive_() {
  var cfg = getMaintenanceConfig_();
  return !!cfg.enabled;
}


/* ============================================================
 * ======= [ADD] adminSetMaintenance(啟用/停用) ===============
 * ============================================================ */

function adminSetMaintenance_(req) {
  req = req || {};
  // 管理員專屬功能,且不可被 __system_call 偽造
  requireAdminKey_(req);

  var enabledParam = sanitizeText_(req.enabled).toLowerCase();
  var enabled = enabledParam === "true" || enabledParam === "1" || enabledParam === "yes";

  var cfg = {
    enabled: enabled,
    message: sanitizeText_(req.message) || (enabled ? "系統維護中,請稍後再試" : ""),
    start_at: sanitizeText_(req.start_at) || (enabled ? new Date().toISOString() : ""),
    end_at: sanitizeText_(req.end_at) || "",
    updated_by: sanitizeText_(req.operated_by || req.operator || "admin")
  };

  var saved = setMaintenanceConfig_(cfg);

  // 啟用時順便建立一則 maintenance 類型公告(方便前端用現有 API 讀取)
  var announcementId = "";
  if (enabled && sanitizeText_(req.create_announcement || "true").toLowerCase() === "true") {
    try {
      var ann = adminSaveAnnouncement_({
        title: sanitizeText_(req.title) || "系統維護通知",
        content: saved.message + (saved.end_at ? "\n預計恢復時間:" + saved.end_at : ""),
        type: "maintenance",
        status: "active",
        priority: 999,
        start_at: saved.start_at,
        end_at: saved.end_at,
        tenant: sanitizeText_(req.tenant) || CONFIG.DEFAULT_TENANT,
        admin_key: req.admin_key,
        created_by: saved.updated_by
      });
      announcementId = sanitizeText_(ann && ann.announcement && ann.announcement.id);
    } catch (e) {
      Logger.log("adminSetMaintenance_ auto announcement failed: " + e);
    }
  }

  // 記錄到 ops_log
  try {
    writeOpsLog_({
      module: "maintenance",
      action: enabled ? "enabled" : "disabled",
      target_id: "system",
      before_status: "",
      after_status: enabled ? "maintenance" : "normal",
      operator: saved.updated_by,
      note: JSON.stringify(saved)
    });
  } catch (e) {}

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminSetMaintenance",
    maintenance: saved,
    announcement_id: announcementId
  };
}


/* ============================================================
 * ======= [ADD] getMaintenanceStatus(公開查詢) ===============
 * ============================================================ */

function getMaintenanceStatus_(req) {
  var cfg = getMaintenanceConfig_();
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getMaintenanceStatus",
    maintenance: {
      enabled: !!cfg.enabled,
      message: sanitizeText_(cfg.message),
      start_at: sanitizeText_(cfg.start_at),
      end_at: sanitizeText_(cfg.end_at)
    }
  };
}


/* ============================================================
 * ======= [ADD] adminQuickAnnounce(簡化版公告) ===============
 * ============================================================ */

function adminQuickAnnounce_(req) {
  req = req || {};
  requireAdminKey_(req);

  return adminSaveAnnouncement_({
    title: sanitizeText_(req.title) || "系統公告",
    content: sanitizeText_(req.content),
    type: sanitizeText_(req.type) || "info",
    status: "active",
    priority: Number(req.priority || 50),
    start_at: sanitizeText_(req.start_at) || new Date().toISOString(),
    end_at: sanitizeText_(req.end_at) || "",
    tenant: sanitizeText_(req.tenant) || CONFIG.DEFAULT_TENANT,
    admin_key: req.admin_key,
    created_by: sanitizeText_(req.operated_by || "admin")
  });
}


/* ============================================================
 * ======= [ADD] maintenanceGuard_(請求攔截器) ================
 * ============================================================ */

// 判斷一個 action 是不是被維護模式攔下,回傳攔截結果 / null
function maintenanceGuard_(req, action) {
  if (!isMaintenanceActive_()) return null;

  // 這些 action 永遠放行
  if (MAINTENANCE_BYPASS_ACTIONS_.indexOf(action) !== -1) return null;

  // 管理員 admin_key 正確 → 放行(維護期間後台要能操作)
  var providedKey = sanitizeText_(req.admin_key || req.adminKey);
  if (providedKey) {
    try {
      var expected = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
      if (expected && providedKey === sanitizeText_(expected)) {
        return null;
      }
    } catch (e) {}
  }

  // 其他一律攔下
  var cfg = getMaintenanceConfig_();
  return {
    ok: false,
    version: HSC_VERSION,
    maintenance: true,
    action: action,
    error: sanitizeText_(cfg.message) || "系統維護中,請稍後再試",
    maintenance_info: {
      enabled: true,
      message: sanitizeText_(cfg.message),
      start_at: sanitizeText_(cfg.start_at),
      end_at: sanitizeText_(cfg.end_at)
    }
  };
}


/* ============================================================
 * ======= [REPLACE] routeAction_(加入維護模式攔截) ==========
 * ============================================================
 * 這是最重要的一步,維護模式要在 routeAction_ 入口處攔下。
 * 注意:這裡定義的 routeAction_ 會覆蓋 v7.13.0 patch 裡的版本
 * ============================================================ */



/* ============================================================
 * ======= [REPLACE] 擴展 ACTIONS / ADMIN_PROTECTED_ACTIONS ===
 * ============================================================
 * 注意:這裡直接 push 到陣列,避免整個重寫
 * ============================================================ */

// 新增 3 個 action 到允許清單
(function() {
 var newActions = ["adminSetMaintenance", "getMaintenanceStatus", "adminQuickAnnounce", "adminUpdateOpsLog", "adminDeleteOpsLog", "getCardOpsLogs"];
  newActions.forEach(function(a) {
    if (ACTIONS.indexOf(a) === -1) ACTIONS.push(a);
  });
  var protectedActions = ["adminSetMaintenance", "adminQuickAnnounce", "adminUpdateOpsLog", "adminDeleteOpsLog"];
  protectedActions.forEach(function(a) {
    if (ADMIN_PROTECTED_ACTIONS.indexOf(a) === -1) ADMIN_PROTECTED_ACTIONS.push(a);
  });
})();
/* ============================================================
 * ======= [REPLACE] HSC_VERSION(更新版本號) =================
 * ============================================================ */
// 把原本的 const HSC_VERSION 在這段 patch 被讀到之後,覆蓋成新版
// 但 const 不能重新宣告,所以這裡不能直接寫 const...
// 改用 Property 或就不改版本號,只記在 fixes 裡
// 若要改,請手動把檔案開頭的 const HSC_VERSION 改為 "v7.14.0-maintenance-mode"


/* ============================================================
 * ======= [ADD] __V714_FINAL_READY__ =========================
 * ============================================================ */

function __V714_FINAL_READY__() {
  return {
    ok: true,
    version: HSC_VERSION,
    status: "v7.14.0-maintenance-mode",
    fixes: [
      "新增:adminSetMaintenance 啟用/停用維護模式",
      "新增:getMaintenanceStatus 查詢維護狀態(公開)",
      "新增:adminQuickAnnounce 快速發公告",
      "新增:maintenanceGuard_ 自動攔截客戶端 API",
      "新增:維護啟用時自動建立 maintenance 類型公告",
      "新增:自動到期機制(end_at 到期自動關閉)",
      "覆蓋:routeAction_ 加入維護模式攔截"
    ]
  };
}
/* ============================================================
   HSC PATCH · 邀請碼驗證函式(配合 3 個路由表的 case)
   ============================================================
   貼法:把這整段貼到 GAS 檔案**最下方**(只貼 1 次即可)
   然後在 3 個路由表都加上 case(詳見步驟指示)
============================================================ */

function __validateInviteCode_patch_(req){
  try{
    var params = (req && (req.params || req.body || req)) || {};
    var code = String(params.code || params.invite_code || params.invite || '').trim();
    var tenant = String(params.tenant || 'angel').trim();

    if (!code){
      return { ok: false, error: 'Missing invite code' };
    }

    var ss = SpreadsheetApp.openById('1k7LBTWKsTFtnhOC2Fgj0WqkJ0IO04ZBGHYyOnxoQnkg');
    var sheet = ss.getSheetByName('invite_db');
    if (!sheet){
      return { ok: false, error: 'invite_db sheet not found' };
    }

    var values = sheet.getDataRange().getValues();
    if (values.length < 2){
      return { ok: false, error: 'Invite not found' };
    }

    var headers = values[0];
    var colIndex = {};
    for (var i = 0; i < headers.length; i++){
      colIndex[String(headers[i]).trim()] = i;
    }

    var codeCol = colIndex['invite_code'];
    var tenantCol = colIndex['tenant'];
    if (codeCol === undefined){
      return { ok: false, error: 'invite_code column missing' };
    }

    var targetRow = null;
    for (var r = 1; r < values.length; r++){
      var rowCode = String(values[r][codeCol] || '').trim();
      var rowTenant = tenantCol !== undefined
        ? String(values[r][tenantCol] || '').trim()
        : 'angel';
      if (rowCode === code && rowTenant === tenant){
        targetRow = values[r];
        break;
      }
    }

    if (!targetRow){
      return { ok: false, error: 'Invite not found', code: code };
    }

    var invite = {};
    for (var k in colIndex){
      invite[k] = targetRow[colIndex[k]];
    }

    var status = String(invite.status || '').toLowerCase();
    if (status === 'disabled' || status === 'revoked' || status === 'cancelled'){
      return { ok: false, error: 'Invite disabled', status: status };
    }

    var expireAt = invite.expire_at || invite.expired_at || '';
    if (expireAt){
      var expireDate = new Date(expireAt);
      if (!isNaN(expireDate.getTime()) && expireDate < new Date()){
        return { ok: false, error: 'Invite expired', expire_at: expireAt };
      }
    }

    var usedCount = Number(invite.used_count || 0);
    var maxUse = Number(invite.max_use || 1);
    if (maxUse > 0 && usedCount >= maxUse){
      return { ok: false, error: 'Invite already used', used_count: usedCount, max_use: maxUse };
    }

    return {
      ok: true,
      invite: {
        invite_code: String(invite.invite_code || ''),
        status: String(invite.status || 'active'),
        plan: String(invite.plan || 'free'),
        tenant: String(invite.tenant || 'angel'),
        agent_type: String(invite.agent_type || 'customer'),
        referrer: String(invite.referrer || ''),
        service_agent: String(invite.service_agent || ''),
        used_count: usedCount,
        max_use: maxUse,
        expire_at: String(expireAt || ''),
        created_at: String(invite.created_at || ''),
        note: String(invite.note || ''),
        source: String(invite.source || '')
      }
    };

  }catch(err){
    return {
      ok: false,
      error: 'validateInviteCode failed: ' + (err && err.message || String(err))
    };
  }
}
/***********************
 * 測試用：列出前 5 張卡片
 ***********************/
function __listCards() {
  var cards = getSheetRowsByName_("card_db");
  Logger.log("總卡片數: " + cards.length);
  cards.slice(0, 5).forEach(function(c, i) {
    Logger.log("=== 卡片 " + (i+1) + " ===");
    Logger.log("c.id 原始值: [" + c.id + "]");
    Logger.log("c.id 長度: " + String(c.id || "").length);
    Logger.log("c.card_id: [" + c.card_id + "]");
    Logger.log("c.name: " + c.name);
    Logger.log("所有欄位: " + Object.keys(c).slice(0, 10).join(", "));
  });
}
/***********************
 * 測試用：直接呼叫 adminBuildBundleText_（不走 URL）
 ***********************/
function __testBundleNow() {
  try {
    var result = adminBuildBundleText_({
      admin_key: "ANGEL20261972070707",
      card_id: "請改成真實卡號"  // ← 跑 __listCards 後改這裡
    });
    Logger.log("✅ 成功！");
    Logger.log(JSON.stringify(result, null, 2));
  } catch (err) {
    Logger.log("❌ 失敗：" + err.message);
    Logger.log(err.stack);
  }
}
/***********************
 * 客服後台：一鍵重發三鍵套
 ***********************/
function adminBuildBundleText_(req) {
  ensureAllSchemasOrThrow_();
  requireAdminKeyOrSystem_(req);

  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  if (!cardId) throw new Error("Missing card_id");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  var payments = getSheetRowsByName_("payment_db").filter(function(row) {
    if (sanitizeText_(row.card_id) !== cardId) return false;
    var st = sanitizeText_(row.status).toLowerCase();
    if (st === "cancelled" || st === "refunded") return false;
    return true;
  }).sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  var latestPayment = payments.length ? payments[0] : null;
  var isPaid = latestPayment && sanitizeText_(latestPayment.status).toLowerCase() === "paid";

  if (isPaid) {
    var deliveryPayload = buildDeliveryNoticePayload_(card);
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminBuildBundleText",
      bundle_type: "delivery",
      card_id: cardId,
      payment_id: sanitizeText_(latestPayment.payment_id),
      card_status: sanitizeText_(card.status),
      billing_status: sanitizeText_(card.billing_status),
      amount: sanitizeText_(latestPayment.amount),
      copy_text: deliveryPayload.copy_text,
      preview_url: deliveryPayload.preview_url,
      delivery_url: deliveryPayload.delivery_url,
      update_url: deliveryPayload.update_url,
      renew_url: deliveryPayload.renew_url
    };
  }

  if (latestPayment) {
    var noticePayload = buildPaymentNoticePayload_(card, latestPayment);
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminBuildBundleText",
      bundle_type: "payment_notice",
      card_id: cardId,
      payment_id: sanitizeText_(latestPayment.payment_id),
      card_status: sanitizeText_(card.status),
      billing_status: sanitizeText_(card.billing_status),
      amount: sanitizeText_(latestPayment.amount),
      due_at: sanitizeText_(latestPayment.due_at),
      copy_text: noticePayload.copy_text,
      preview_url: noticePayload.preview_url
    };
  }

  // 沒有付款紀錄但卡片存在（例如手動建的測試卡 / 客服直接開通）
  // → 回傳交付卡三鍵套（已付款邏輯）
  if (sanitizeText_(card.billing_status).toLowerCase() === "paid") {
    var fallbackPayload = buildDeliveryNoticePayload_(card);
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminBuildBundleText",
      bundle_type: "delivery",
      card_id: cardId,
      payment_id: "",
      card_status: sanitizeText_(card.status),
      billing_status: sanitizeText_(card.billing_status),
      amount: "",
      copy_text: fallbackPayload.copy_text,
      preview_url: fallbackPayload.preview_url,
      delivery_url: fallbackPayload.delivery_url,
      update_url: fallbackPayload.update_url,
      renew_url: fallbackPayload.renew_url,
      note: "no_payment_record_fallback"
    };
  }
  
  throw new Error("No payment record found for this card");
}
function __findCardDebug() {
  // 方法 1：用 findRowByField_
  var card1 = findRowByField_("card_db", "id", "TW0001");
  Logger.log("方法 1 (findRowByField_ id): " + (card1 ? "找到" : "找不到"));
  
  // 方法 2：改用 card_id 欄位
  var card2 = findRowByField_("card_db", "card_id", "TW0001");
  Logger.log("方法 2 (findRowByField_ card_id): " + (card2 ? "找到" : "找不到"));
  
  // 方法 3：手動找
  var cards = getSheetRowsByName_("card_db");
  var found = null;
  cards.forEach(function(c) {
    var idStr = String(c.id || "").trim();
    if (idStr === "TW0001") {
      found = c;
      Logger.log("方法 3 找到！欄位: " + JSON.stringify(c).substring(0, 200));
    }
  });
  if (!found) Logger.log("方法 3 也找不到");
  
  // 方法 4：列出所有可能是 id 的欄位
  if (cards.length > 0) {
    var firstCard = cards[0];
    Logger.log("第一張卡的所有欄位名: " + Object.keys(firstCard).join(", "));
    Logger.log("第一張卡 id 值: [" + firstCard.id + "]");
    Logger.log("第一張卡 card_id 值: [" + firstCard.card_id + "]");
  }
}
function __testBundleDebug() {
  var req = {
    admin_key: "ANGEL20261972070707",
    card_id: "TW0001"
  };
  
  Logger.log("=== req 原始 ===");
  Logger.log("req.card_id: [" + req.card_id + "]");
  Logger.log("req.card_id 長度: " + req.card_id.length);
  
  var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
  Logger.log("=== sanitizeText_ 後 ===");
  Logger.log("cardId: [" + cardId + "]");
  Logger.log("cardId 長度: " + cardId.length);
  
  var card = findRowByField_("card_db", "id", cardId);
  Logger.log("=== findRowByField_ 結果 ===");
  Logger.log("找到卡片？ " + (card ? "是" : "否"));
  if (card) {
    Logger.log("卡片姓名: " + card.name);
  }
}
function __testBundleDebug2() {
  try {
    Logger.log("=== 步驟 1：進入 adminBuildBundleText_ 邏輯 ===");
    var req = {
      admin_key: "ANGEL20261972070707",
      card_id: "TW0001"
    };
    Logger.log("req 初始: " + JSON.stringify(req));
    
    Logger.log("=== 步驟 2：ensureAllSchemasOrThrow_ ===");
    ensureAllSchemasOrThrow_();
    Logger.log("req 在 ensureAllSchemas 後: " + JSON.stringify(req));
    Logger.log("req.card_id: [" + req.card_id + "]");
    
    Logger.log("=== 步驟 3：requireAdminKeyOrSystem_ ===");
    requireAdminKeyOrSystem_(req);
    Logger.log("req 在 requireAdminKey 後: " + JSON.stringify(req));
    Logger.log("req.card_id: [" + req.card_id + "]");
    
    Logger.log("=== 步驟 4：sanitize cardId ===");
    var cardId = sanitizeText_(req.card_id || req.cardId || req.id);
    Logger.log("cardId: [" + cardId + "] 長度: " + cardId.length);
    
    Logger.log("=== 步驟 5：findRowByField_ ===");
    var card = findRowByField_("card_db", "id", cardId);
    Logger.log("card: " + (card ? "找到" : "找不到"));
    
    if (card) {
      Logger.log("✅ 全部步驟成功！");
    }
  } catch (err) {
    Logger.log("❌ 失敗：" + err.message);
    Logger.log(err.stack);
  }
}
function __testBundleFinal() {
  // 強制重置所有 request-scoped 快取
  try {
    _requestIndexCache_ = {};
    _phoneFormatApplied_ = {};
    _allSchemasEnsuredInRequest_ = false;
  } catch (e) {
    Logger.log("重置快取時出錯（可能是變數不存在）: " + e.message);
  }
  
  try {
    var result = adminBuildBundleText_({
      admin_key: "ANGEL20261972070707",
      card_id: "TW0001"
    });
    Logger.log("✅ 成功！");
    Logger.log(JSON.stringify(result, null, 2));
  } catch (err) {
    Logger.log("❌ 失敗：" + err.message);
    Logger.log(err.stack);
  }
}
function __listPayments() {
  var payments = getSheetRowsByName_("payment_db");
  Logger.log("總付款筆數: " + payments.length);
  
  // 篩 TW0001 的
  var tw0001 = payments.filter(function(p) {
    return String(p.card_id || "").trim() === "TW0001";
  });
  Logger.log("TW0001 的付款筆數: " + tw0001.length);
  tw0001.forEach(function(p, i) {
    Logger.log("--- 付款 " + (i+1) + " ---");
    Logger.log("payment_id: " + p.payment_id);
    Logger.log("status: " + p.status);
    Logger.log("event_type: " + p.event_type);
    Logger.log("amount: " + p.amount);
  });
  
  // 印前 5 筆全部付款的 card_id
  Logger.log("=== 前 5 筆付款的 card_id ===");
  payments.slice(0, 5).forEach(function(p) {
    Logger.log("card_id: [" + p.card_id + "] status: " + p.status);
  });
}
/************************************************************
 * HSC GAS v7.14.1 · Dashboard Performance Patch
 * 針對:card_db < 200 筆,但 dashboard 載入 10 秒+
 * ----------------------------------------------------------
 * 真正的瓶頸不是資料量,是:
 *   1. 每次請求跑全 schema header 驗證(28 張表 × getRange)
 *   2. ScriptCache 白名單太窄,大表每次都重讀
 *   3. 每次寫入 clearSchemaCheckCache_ 清掉所有 schema 快取
 *   4. Dashboard 裡面對 allCards 多次 filter + sort
 * ----------------------------------------------------------
 * 風險:低 - 不改 API 形狀、不動商業邏輯
 * 前端:不用改
 ************************************************************/


/* ============================================================
 * [REPLACE P1] 快取白名單 - 把 dashboard 需要的所有表納入
 * ============================================================ */
function isSheetRowsScriptCacheable_(schemaName) {
  return [
    "plan_db",
    "pricing_db",
    "commission_rules",
    "announcement_db",
    "promo_rules",
    "card_db",
    "payment_db",
    "agent_db",
    "add_on_order_db",
    "renewal_db",
    "update_log_db",
    "commission_db",
    "request_db",
    "ops_log_db",
    "invite_db",
    "lead_db"
  ].indexOf(String(schemaName || "")) !== -1;
}


/* ============================================================
 * [REPLACE P2] getSheetRowsByName_ - TTL 縮短為 60 秒
 * 小量資料不用擔心快取爆,但要確保寫入後很快失效
 * ============================================================ */
function getSheetRowsByName_(schemaName) {
  if (_sheetRowCacheEnabled_ && _sheetRowCache_[schemaName]) {
    return _sheetRowCache_[schemaName];
  }

  var useScriptCache = isSheetRowsScriptCacheable_(schemaName);
  var scriptCache = useScriptCache ? CacheService.getScriptCache() : null;
  var cacheKey = useScriptCache ? getSheetRowsScriptCacheKey_(schemaName) : "";

  if (useScriptCache) {
    var cached = scriptCache.get(cacheKey);
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (_sheetRowCacheEnabled_) _sheetRowCache_[schemaName] = parsed;
        return parsed;
      } catch (_e) {}
    }
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
    if (useScriptCache) {
      try { scriptCache.put(cacheKey, JSON.stringify([]), 60); } catch (_e) {}
    }
    return [];
  }

  var phoneCols = PHONE_COLUMNS_BY_SCHEMA_[schemaName] || [];

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var rowObj = {};
    for (var c = 0; c < expectedHeaders.length; c++) {
      rowObj[expectedHeaders[c]] = normalizeCell_(values[r][c]);
    }
    for (var pi = 0; pi < phoneCols.length; pi++) {
      var pcol = phoneCols[pi];
      if (rowObj[pcol]) {
        rowObj[pcol] = restorePhoneLeadingZero_(rowObj[pcol]);
      }
    }
    rowObj = normalizeRowDateFieldsForSchema_(schemaName, rowObj);
    rowObj.__rowNum = r + 1;
    rows.push(rowObj);
  }

  if (_sheetRowCacheEnabled_) _sheetRowCache_[schemaName] = rows;
  if (useScriptCache) {
    try { scriptCache.put(cacheKey, JSON.stringify(rows),300); } catch (_e) {}
  }
  return rows;
}


/* ============================================================
 * [REPLACE P3] ensureAllSchemasOrThrow_
 * 這是最大的隱藏殺手 - 每個請求都跑 28 張表的 header 驗證
 * 改成走 ScriptCache,驗證過就 10 分鐘內不再驗證
 * ============================================================ */
function ensureAllSchemasOrThrow_() {
  if (_allSchemasEnsuredInRequest_) return [];

  var scriptCache = CacheService.getScriptCache();
  var cacheKey = "hsc:schema_ensured_v714_all";
  var cached = scriptCache.get(cacheKey);
  if (cached === "ok") {
    _allSchemasEnsuredInRequest_ = true;
    return [];
  }

  var results = ensureSchemasOrThrow_(Object.keys(SCHEMA));
  _allSchemasEnsuredInRequest_ = true;

  try {
    scriptCache.put(cacheKey, "ok", 600);
  } catch (_e) {}

  return results;
}


/* ============================================================
 * [REPLACE P4] ensureSchemasOrThrow_ - 單表版也走 ScriptCache
 * ============================================================ */
function ensureSchemasOrThrow_(schemaNames) {
  var names = Array.isArray(schemaNames) ? schemaNames : [schemaNames];
  var results = [];
  var seen = {};
  var scriptCache = CacheService.getScriptCache();

  for (var i = 0; i < names.length; i++) {
    var schemaName = normalizeSchemaNameArg_(names[i]);
    if (!schemaName || seen[schemaName]) continue;
    seen[schemaName] = true;
    if (!SCHEMA[schemaName]) throw new Error("Schema not defined: " + schemaName);

    var singleCacheKey = "hsc:schema_ok:" + schemaName;
    var singleCached = scriptCache.get(singleCacheKey);
    if (singleCached === "ok") {
      results.push({ schema: schemaName, cached: true });
      continue;
    }

    var res = ensureSchemaHeaders_(schemaName);
    results.push(res);
    if (res.missing_columns.length > 0) {
      throw new Error("Missing required columns in " + schemaName + ": " + res.missing_columns.join(", "));
    }

    try {
      scriptCache.put(singleCacheKey, "ok", 600);
    } catch (_e) {}
  }
  return results;
}


/* ============================================================
 * [REPLACE P5] invalidateCacheOnWrite_
 * 寫入時只清自己那張表,不要整個清
 * ============================================================ */

/* ============================================================
 * [REPLACE P6] getAdminCardDashboard_
 * 小量資料版:不分頁、不過濾日期,只優化計算邏輯
 *   - 一次讀所有表(此時快取會生效)
 *   - 減少重複 filter/sort
 *   - 索引化 latest payment / update count
 * ============================================================ */

/* ============================================================
 * [REPLACE P7] buildUpdateCountMapFromRows_
 * 用字串比對年份,避免 new Date() 開銷
 * ============================================================ */
function buildUpdateCountMapFromRows_(rows, tenant) {
  var yearStr = String(new Date().getFullYear());
  var map = {};
  if (!Array.isArray(rows)) return map;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!sameTenant_(row.tenant, tenant)) continue;
    var createdStr = sanitizeText_(row.created_at);
    if (!createdStr || createdStr.substring(0, 4) !== yearStr) continue;
    var cid = sanitizeText_(row.card_id);
    if (!cid) continue;
    map[cid] = (map[cid] || 0) + 1;
  }
  return map;
}


/* ============================================================
 * [ADD] __V7141_FINAL_READY__
 * ============================================================ */
function __V7141_FINAL_READY__() {
  return {
    ok: true,
    version: HSC_VERSION,
    status: "v7.14.1-dashboard-perf-small-data",
    fixes: [
      "P1: 快取白名單擴展至所有 dashboard 用表",
      "P2: ScriptCache TTL 60 秒",
      "P3: ensureAllSchemasOrThrow_ 走 ScriptCache(600 秒)- 最大隱藏殺手",
      "P4: 單表 schema 驗證也走 ScriptCache",
      "P5: invalidateCacheOnWrite_ 不再整個清",
      "P6: getAdminCardDashboard_ 改為單次 pass + 索引化",
      "P7: buildUpdateCountMapFromRows_ 用字串比對年份"
    ]
  };
}
/**
 * 重新綁定卡片的 LINE user_id
 * 適用情境:
 *   1. 初次綁定(line_user_id 原本是空的)
 *   2. 重綁(line_user_id 原本有值,現在要換)
 *   3. 轉賣(舊主人轉給新主人)
 */
function rebindLineUserId_(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};

  var cardId = sanitizeText_(req.card_id || req.cardId);
  var newUid = sanitizeText_(req.line_user_id || req.lineUserId);

  if (!cardId) throw new Error("Missing card_id");
  if (!newUid) throw new Error("Missing line_user_id");

  // 驗證 UID 格式
  if (!/^U[0-9a-f]{32}$/i.test(newUid)) {
    throw new Error("Invalid line_user_id format");
  }

  // 找卡片
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found: " + cardId);

  var oldUid = sanitizeText_(card.line_user_id);
  var isFirstBind = !oldUid;
  var isRebind = !!oldUid && oldUid !== newUid;
  var isSame = !!oldUid && oldUid === newUid;

  // 同一個 UID 不做事
  if (isSame) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "rebindLineUserId",
      card_id: cardId,
      line_user_id: newUid,
      status: "unchanged",
      message: "Already bound to this UID"
    };
  }

  // 更新卡片的 line_user_id
  var updatedCard = shallowClone_(card);
  updatedCard.line_user_id = newUid;
  updateRowByName_("card_db", card.__rowNum, updatedCard);

  // 通知新主人
  try {
    var title, message;
    if (isFirstBind) {
      title = "✅ LINE 綁定成功";
      message = "卡片 " + cardId + " 已成功綁定你的 LINE\n從現在起,系統通知會推給你";
    } else {
      title = "🔄 LINE 綁定成功";
      message = "卡片 " + cardId + " 已綁定到你的 LINE\n從現在起,系統通知會推給你";
    }
    notifyAdminLine_({
      to: newUid,
      title: title,
      message: message
    });
  } catch (e) {
    Logger.log("notify new binder failed: " + e);
  }

  // 如果是重綁(有舊 UID),通知舊主人
  if (isRebind) {
    try {
      notifyAdminLine_({
        to: oldUid,
        title: "🔄 卡片已轉移",
        message: "卡片 " + cardId + " 已轉移給其他人\n你不再會收到此卡的通知"
      });
    } catch (e) {
      Logger.log("notify old binder failed: " + e);
    }
  }

// 綁定記錄寫入 ops_log
  writeOpsLog_({
    module: "line_bind",
    action: isFirstBind ? "first_bind" : "rebind",
    target_id: cardId,
    after_status: isFirstBind ? "first_bind" : "rebound",
    operator: "system",
    note: "舊UID:" + (oldUid || "(無)") + " 新UID:" + newUid
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "rebindLineUserId",
    card_id: cardId,
    line_user_id: newUid,
    status: isFirstBind ? "first_bind" : "rebound",
    old_uid: oldUid || null
  };
}

/**
 * 產生重綁/綁定 LIFF URL(給管理員操作台用)
 * 用法: 在 admin 後台對某張卡片產生綁定連結
 * 客戶在 LINE 內點該連結 → 自動補綁
 */
function adminBuildRebindUrl_(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  requireAdminKeyOrSystem_(req);
  
  var cardId = sanitizeText_(req.card_id || req.cardId);
  if (!cardId) throw new Error("Missing card_id");
  
  // 確認卡片存在
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found: " + cardId);
  
  // 產生短期 token (10 分鐘有效),避免被亂玩
  var now = Date.now();
  var expireAt = now + 10 * 60 * 1000;  // 10 分鐘
  var token = Utilities.base64EncodeWebSafe(
    Utilities.newBlob(cardId + ":" + expireAt + ":" + Math.random().toString(36).substring(2, 10)).getBytes()
  ).replace(/=/g, "");
  
  // 把 token 存進 Property (10 分鐘失效)
  var props = PropertiesService.getScriptProperties();
  var key = "REBIND_TOKEN_" + token;
  props.setProperty(key, JSON.stringify({
    card_id: cardId,
    expire_at: expireAt,
    created_by: sanitizeText_(req.operated_by || req.operator || "admin")
  }));
  
  // 產生 LIFF URL
  var url = CONFIG.BASE_URL + "rebind.html?card_id=" + encodeURIComponent(cardId) + 
            "&token=" + encodeURIComponent(token);
  var liffUrl = toLiffUrl_(url);
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminBuildRebindUrl",
    card_id: cardId,
    rebind_url: liffUrl,
    plain_url: url,  // 也提供原始 URL (可用於非 LINE 客戶,但綁不到 UID)
    expire_at: new Date(expireAt).toISOString(),
    expires_in_minutes: 10
  };
}


/**
 * 驗證 rebind token 並執行綁定
 * 客戶在 rebind.html 裡 LIFF 取得 UID 後呼叫
 */
function applyRebindWithToken_(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  
  var token = sanitizeText_(req.token);
  var lineUserId = sanitizeText_(req.line_user_id || req.lineUserId);
  
  if (!token) throw new Error("Missing token");
  if (!lineUserId) throw new Error("Missing line_user_id");
  
  // 驗證 token
  var props = PropertiesService.getScriptProperties();
  var key = "REBIND_TOKEN_" + token;
  var raw = props.getProperty(key);
  if (!raw) throw new Error("Invalid or expired token");
  
  var data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error("Token data corrupted");
  }
  
  // 檢查過期
  if (Date.now() > data.expire_at) {
    props.deleteProperty(key);
    throw new Error("Token expired");
  }
  
  var cardId = sanitizeText_(data.card_id);
  if (!cardId) throw new Error("Token missing card_id");
  
  // 呼叫 rebindLineUserId_
  var result = rebindLineUserId_({
    card_id: cardId,
    line_user_id: lineUserId
  });
  
  // 用過就刪掉 token
  props.deleteProperty(key);
  
  return result;
}
/**
 * 產生重綁/綁定 LIFF URL(給管理員操作台用)
 */
function buildBindUrl_(cardId) {
  cardId = sanitizeText_(cardId);
  if (!cardId) return "";
  return "https://liff.line.me/" + HSC_LIFF_ID + "?bind=" + encodeURIComponent(cardId);
}
/************************************************************
 * 效能量測腳本 · BEFORE patch baseline
 * ----------------------------------------------------------
 * 用法:
 *   1. 貼到 GAS 編輯器任何位置
 *   2. 執行 __benchmarkDashboard() 看 Dashboard 幾秒
 *   3. 執行 __benchmarkCreateCard() 模擬建卡(會真的建一張測試卡)
 *   4. 把 Logger.log 輸出貼給我看
 *
 * 跑完記得把結果拍下來或記錄,之後比對用
 ************************************************************/

function __benchmarkDashboard() {
  Logger.log("=== Dashboard 效能量測開始 ===");

  // 先清掉 ScriptCache,模擬「冷啟動」最糟情況
  try {
    var cache = CacheService.getScriptCache();
    var allKeys = Object.keys(SCHEMA).map(function(s) {
      return "hsc:sheet_rows:" + s;
    });
    cache.removeAll(allKeys);
    cache.remove("hsc:schema_ensured_v714_all");
    Logger.log("已清除 ScriptCache (模擬冷啟動)");
  } catch (e) {
    Logger.log("清除快取失敗: " + e.message);
  }

  // --- 冷啟動第一次 ---
  var t1 = new Date().getTime();
  var r1 = getAdminBootstrap_({
    admin_key: "ANGEL20261972070707",
    __system_call: true
  });
  var t2 = new Date().getTime();
  Logger.log("🥶 冷啟動 getAdminBootstrap_: " + (t2 - t1) + " ms");
  Logger.log("   cards: " + (r1.cards || []).length +
             " | payments: " + (r1.payments || []).length +
             " | renewals: " + (r1.renewals || []).length +
             " | agents: " + (r1.agents || []).length);

  // --- 熱啟動第二次(應該命中快取) ---
  var t3 = new Date().getTime();
  var r2 = getAdminBootstrap_({
    admin_key: "ANGEL20261972070707",
    __system_call: true
  });
  var t4 = new Date().getTime();
  Logger.log("🔥 熱啟動 getAdminBootstrap_: " + (t4 - t3) + " ms");

  // --- 單獨量 Dashboard ---
  var t5 = new Date().getTime();
  var r3 = getAdminCardDashboard_({
    admin_key: "ANGEL20261972070707",
    __system_call: true
  });
  var t6 = new Date().getTime();
  Logger.log("📊 getAdminCardDashboard_: " + (t6 - t5) + " ms");
  Logger.log("   summary: " + JSON.stringify(r3.summary));

  Logger.log("=== 量測結束 ===");
  Logger.log("把上面三個數字記下來,貼 patch 後再跑一次比對");
}

function __benchmarkCreateCard() {
  Logger.log("=== 建卡效能量測開始 ===");
  Logger.log("⚠️ 這會真的建一張測試卡,卡 ID 開頭 TEST");

  // 先找一張可用的邀請碼
  var invites = getSheetRowsByName_("invite_db").filter(function(r) {
    return sanitizeText_(r.status).toLowerCase() === "active" &&
           toNumber_(r.used_count) < toNumber_(r.max_use || 1);
  });

  if (!invites.length) {
    Logger.log("❌ 找不到可用邀請碼,請先建一個 active 的邀請碼");
    return;
  }

  var invite = invites[0];
  Logger.log("使用邀請碼: " + invite.invite_code);

  var t1 = new Date().getTime();
  try {
    var result = createCardWithOfflinePayment_({
      invite_code: invite.invite_code,
      name: "效能測試_" + Utilities.formatDate(new Date(), "Asia/Taipei", "HHmmss"),
      phone: "0912345678",
      email: "perf-test@example.com",
      plan: sanitizeText_(invite.plan) || "free",
      color: "c1",
      style: "s1",
      paper: "f1",
      is_test: "TRUE",
      note: "perf_benchmark_before_patch"
    });
    var t2 = new Date().getTime();
    Logger.log("✅ createCardWithOfflinePayment_: " + (t2 - t1) + " ms");
    Logger.log("   card_id: " + result.card_id);
    Logger.log("   lead_id: " + result.lead_id);
    Logger.log("   payment_id: " + result.payment_id);
  } catch (err) {
    var t2e = new Date().getTime();
    Logger.log("❌ 失敗 ( " + (t2e - t1) + " ms ): " + err.message);
  }

  Logger.log("=== 量測結束 ===");
}

// 一鍵兩個都跑
function __benchmarkAll() {
  __benchmarkDashboard();
  Logger.log("");
  Logger.log("--- 30 秒後跑建卡(避免 Lock 衝突)---");
  Utilities.sleep(2000);
  __benchmarkCreateCard();
}
/************************************************************
 * 緊急修復:update_pending_db schema 註冊
 * ----------------------------------------------------------
 * 問題:SCHEMA 裡有定義 update_pending_db,但 CONFIG.SHEETS、
 *       SHEET_HEADERS、schemaNameToConfigKey_ 都沒註冊,
 *       導致任何讀寫 update_pending_db 的操作都會炸。
 *
 * 影響範圍:
 *   - savePendingUpdate_() 完全無法運作
 *   - applyPendingUpdate_() 完全無法運作
 *   - 付費更新流程(confirmUpdateFeePaid_)會失敗
 *   - 我的 benchmark 腳本建卡時也會炸(但實際上建卡流程
 *     本身不會 hit 這個,是 ensureAllSchemasOrThrow_ 先炸)
 *
 * 修復:三個地方各補一行
 * ----------------------------------------------------------
 * 貼法:把這整段貼到 GAS 檔案最下方(任何位置都可以)
 *      然後重新部署
 ************************************************************/

// ===============================================
// Fix 1: 補 CONFIG.SHEETS.UPDATE_PENDING
// ===============================================
// 在 runtime 用 JS 動態補進 CONFIG 物件
if (typeof CONFIG !== "undefined" && CONFIG && CONFIG.SHEETS) {
  if (!CONFIG.SHEETS.UPDATE_PENDING) {
    CONFIG.SHEETS.UPDATE_PENDING = "update_pending_db";
  }
}

// ===============================================
// Fix 2: 補 SHEET_HEADERS.update_pending_db
// ===============================================
if (typeof SHEET_HEADERS !== "undefined" && SHEET_HEADERS) {
  if (!SHEET_HEADERS.update_pending_db) {
    SHEET_HEADERS.update_pending_db = SCHEMA.update_pending_db;
  }
}

// ===============================================
// Fix 3: 覆寫 schemaNameToConfigKey_ 支援 update_pending_db
// ===============================================
// 原函式的 map 裡沒有 update_pending_db
// 這裡整個覆寫,加入這筆
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
    "update_pending_db": "UPDATE_PENDING",   // ← 新增這筆
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
    "recognition_db": "RECOGNITION",
    "payment_inbox_db": "PAYMENT_INBOX",
    "card_cta_ext": "CARD_CTA_EXT",
    "card_photo_ext": "CARD_PHOTO_EXT"
  };
  if (!map[schemaName]) throw new Error("Unknown schema name: " + schemaName);
  return map[schemaName];
}

// ===============================================
// 一次性初始化:建立 update_pending_db 分頁
// ===============================================
// 部署後手動跑一次這個函式,會:
//   1. 在 Google Sheet 建立 update_pending_db 分頁
//   2. 寫入正確的 header
//   3. 之後 savePendingUpdate_ / applyPendingUpdate_ 就能正常運作
function __initUpdatePendingDb() {
  try {
    var result = ensureSchemaHeaders_("update_pending_db");
    Logger.log("✅ update_pending_db 初始化完成");
    Logger.log("結果: " + JSON.stringify(result, null, 2));
    return { ok: true, result: result };
  } catch (err) {
    Logger.log("❌ 失敗: " + err.message);
    Logger.log(err.stack);
    return { ok: false, error: err.message };
  }
}

// ===============================================
// 驗證函式:檢查 update_pending_db 是否真的註冊成功
// ===============================================
function __verifyUpdatePendingFix() {
  var checks = {
    "SCHEMA.update_pending_db": !!(SCHEMA && SCHEMA.update_pending_db),
    "CONFIG.SHEETS.UPDATE_PENDING": !!(CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.UPDATE_PENDING),
    "SHEET_HEADERS.update_pending_db": !!(SHEET_HEADERS && SHEET_HEADERS.update_pending_db),
    "schemaNameToConfigKey_ works": false,
    "Sheet exists": false
  };

  try {
    var key = schemaNameToConfigKey_("update_pending_db");
    checks["schemaNameToConfigKey_ works"] = key === "UPDATE_PENDING";
  } catch (e) {}

  try {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName("update_pending_db");
    checks["Sheet exists"] = !!sheet;
  } catch (e) {}

  Logger.log("=== update_pending_db 修復驗證 ===");
  Object.keys(checks).forEach(function(key) {
    Logger.log((checks[key] ? "✅" : "❌") + " " + key);
  });

  var allOk = Object.keys(checks).every(function(k) { return checks[k]; });
  Logger.log(allOk ? "\n🎉 全部通過,可以繼續量測了" : "\n⚠️ 有問題,請檢查上面哪項失敗");
  return checks;
}/************************************************************
 * HSC GAS v7.15.0 · Performance Mega Patch
 * ----------------------------------------------------------
 * 目標:
 *   Dashboard 冷啟動從 10 秒 → 2 秒以下
 *   建卡流程從 10+ 秒 → 3 秒以下(順便優化)
 *
 * 修改策略:
 *   P1. Request-Scoped 記憶體快取強化(同請求同表不重讀)
 *   P2. getAdminBootstrap_ 預載入所有表
 *   P3. ensureAgentExists_ 用 Script Properties 布隆過濾
 *   P4. generateCardId_ 改純序號(不掃全表)
 *   P5. 移除多餘的 clearSheetRowCache_ 與 Lock
 *   P6. getAdminCardDashboard_ 傳入已預載資料
 *
 * 風險:
 *   - 不改任何 API 回傳格式
 *   - 不改商業邏輯
 *   - 前端完全不用改
 *
 * 貼法:
 *   把整個檔案附加到 GAS 最下方(在 v7.14.1 patch 之後)
 *   然後重新部署
 ************************************************************/

/* ============================================================
 * [REPLACE] 版本號標記 - 僅供回傳使用,原 const 不動
 * ============================================================ */
function __V715_FINAL_READY__() {
  return {
    ok: true,
    version: HSC_VERSION,
    status: "v7.15.0-perf-mega",
    fixes: [
      "P1: Request-scoped memory cache 強化",
      "P2: getAdminBootstrap_ 一次預載所有表",
      "P3: ensureAgentExists_ Script Properties 布隆過濾",
      "P4: generateCardId_ 純序號,不掃全表",
      "P5: 移除 createCardWithOfflinePayment_ 多餘 clearCache",
      "P5: 移除 incrementInviteUsage_ 多餘 clearCache",
      "P6: getAdminCardDashboard_ 支援預載資料"
    ]
  };
}


/* ============================================================
 * ============== P1. Request-Scoped Cache 強化 ==============
 * ============================================================
 * 原本的 _sheetRowCache_ 雖然存在,但被一堆 clearSheetRowCache_
 * 清掉了。這裡引入一個「不可清除的 session cache」,只在同一個
 * execution 內有效(execution 結束自動消失),避免同一個 request
 * 內重複讀表。
 * ============================================================ */

// 這個 cache 只在本次 execution 記憶體中,不寫 ScriptCache
// 也不會被 clearSheetRowCache_ 動到
var _sessionRowCache_ = {};

// 在 routeAction_ 入口會 reset 這個
function __resetSessionCache_() {
  _sessionRowCache_ = {};
}

/**
 * 高階讀表函式:優先從 session cache 讀,miss 才走舊 getSheetRowsByName_
 * 外部呼叫這個,取代 getSheetRowsByName_ 可拿到最大加速
 *
 * 注意:寫入後 invalidateCacheOnWrite_ 會清掉同表 session cache
 */
function getSheetRowsCached_(schemaName) {
  if (_sessionRowCache_[schemaName]) {
    return _sessionRowCache_[schemaName];
  }
  var rows = getSheetRowsByName_(schemaName);
  _sessionRowCache_[schemaName] = rows;
  return rows;
}

/**
 * 預載入多張表到 session cache
 * 給 getAdminBootstrap_ 用
 */
function prewarmSessionCache_(schemaNames) {
  if (!Array.isArray(schemaNames)) return;
  for (var i = 0; i < schemaNames.length; i++) {
    var name = schemaNames[i];
    if (!_sessionRowCache_[name]) {
      try {
        _sessionRowCache_[name] = getSheetRowsByName_(name);
      } catch (e) {
        // 靜默失敗,單張表讀不到不影響其他
        Logger.log("prewarmSessionCache_ skip " + name + ": " + e.message);
      }
    }
  }
}


/* ============================================================
 * [REPLACE] invalidateCacheOnWrite_ - 同步清 session cache
 * ============================================================ */
function invalidateCacheOnWrite_(schemaName) {
  if (!schemaName) {
    _sheetRowCache_ = {};
    _sessionRowCache_ = {};
    _requestIndexCache_ = {};
    return;
  }

  delete _sheetRowCache_[schemaName];
  delete _sessionRowCache_[schemaName];  // ← 新增:同步清 session
  clearSchemaCheckCache_(schemaName);

  try {
    var cache = CacheService.getScriptCache();
    cache.remove(getSheetRowsScriptCacheKey_(schemaName));
  } catch (_e) {}

  if (_requestIndexCache_) {
    var prefix = schemaName + ":";
    Object.keys(_requestIndexCache_).forEach(function(key) {
      if (key.indexOf(prefix) === 0) {
        delete _requestIndexCache_[key];
      }
    });
  }
}


/* ============================================================
 * [REPLACE] routeAction_ 開頭加 session cache reset
 * ============================================================
 * 只改入口那一行,其他邏輯完全不動
 * ============================================================ */
function routeAction_(e, method) {
  // === v7.15: reset session cache ===
  __resetSessionCache_();

  // 原本的 reset
  _requestIndexCache_ = {};
  _phoneFormatApplied_ = {};
  _allSchemasEnsuredInRequest_ = false;

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

    // 維護模式攔截
    var guardResult = maintenanceGuard_(req, action);
    if (guardResult) {
      return jsonOutput_(guardResult);
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
      // 維護模式相關
      case "adminSetMaintenance": result = adminSetMaintenance_(req); break;
      case "getMaintenanceStatus": result = getMaintenanceStatus_(req); break;
      case "adminQuickAnnounce": result = adminQuickAnnounce_(req); break;

      // 邀請碼驗證
      case "validateInviteCode":
      case "checkInviteCode":
      case "getInviteByCode":
      case "validateInvite":
      case "checkInvite":
      case "getInvite":
        result = __validateInviteCode_patch_(req); break;

      case "ping": result = ping_(req); break;
      case "trackEvent": result = trackEvent_(req); break;
      case "trackRedirect": result = trackRedirect_(req); break;
      case "getTrackingSummary": result = getTrackingSummary_(req); break;
      case "getCardTrackingStats": result = getCardTrackingStats_(req); break;
      case "getAgentTrackingStats": result = getAgentTrackingStats_(req); break;
      case "getPlanOptions": result = getPlanOptions_(req); break;
      case "getPricingConfig": result = getPricingConfig_(req); break;

      case "createInviteCode": result = createInviteCode_(req); break;
      case "getInviteFormUrl": result = getInviteFormUrl_(req); break;
      case "createRequest": result = createRequest_(req); break;
      case "submitPaymentCheck": result = submitPaymentCheck_(req); break;
      case "submitAgentPaymentInbox": result = submitAgentPaymentInbox_(req); break;
      case "getUnmatchedPayments": result = getUnmatchedPayments_(req); break;
      case "assignPaymentToCard": result = assignPaymentToCard_(req); break;
      case "repairPaymentInboxSchema": result = repairPaymentInboxSchema_(req); break;
      case "adminBuildBundleText": result = adminBuildBundleText_(req); break;
      case "getRequests": result = getRequests_(req); break;
      case "getRequestTrace": result = getRequestTrace_(req); break;
      case "assignInviteToRequest": result = assignInviteToRequest_(req); break;
      case "rebindLineUserId": result = rebindLineUserId_(req); break;
      case "createLead": result = createLead_(req); break;
      case "createCard": result = createCard_(req); break;
      case "markCardDelivered": result = markCardDelivered_(req); break;
      case "getCard": result = getCard_(req); break;
      case "getCardPublicLite": result = getCardPublicLite_(req); break;
      case "getCardPublicShell": result = getCardPublicShell_(req); break;
      case "getAdminBootstrap": result = getAdminBootstrap_(req); break;
      case "getCardForUpdate": result = getCardForUpdate_(req); break;
      case "getUpdateEligibility": result = getUpdateEligibility_(req); break;
      case "getRenewalByCardId": result = adminGetRenewalByCardId_(req); break;
      case "adminGetRenewalDetail": result = adminGetRenewalDetail_(req); break;
      case "getRenewalDetail": result = adminGetRenewalDetail_(req); break;
      case "adminGrantAddon": result = adminGrantAddon_(req); break;
      case "adminGrantUnlimitedUpdate": result = adminGrantUnlimitedUpdate_(req); break;
      case "adminRepairCardLimits": result = adminRepairCardLimits_(req); break;
      case "adminPreviewTestMarker": result = adminPreviewTestMarker_(req); break;
      case "adminCleanupTestMarker": result = adminCleanupTestMarker_(req); break;
      case "adminRecreatePermanentTestCards": result = adminRecreatePermanentTestCards_(req); break;
      case "adminReassignServiceAgent": result = adminReassignServiceAgent_(req); break;  
      case "adminBuildBindUrl": result = adminBuildBindUrl_(req); break;
      case "adminListTestCards": result = adminListTestCards_(req); break;
     
      case "bindCardLine": result = bindCardLine_(req); break;
      case "adminDeleteTestCard": result = adminDeleteTestCard_(req); break; 
      case "adminGetCardDirect": result = adminGetCardDirect_(req); break;
      case "adminUpdateCardPhotoUrls": result = adminUpdateCardPhotoUrls_(req); break;
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
      case "adminToggleAnnouncement": result = adminToggleAnnouncement_(req); break;
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
      case "getTriggerStatus": result = getTriggerStatus_(req); break;
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
        case "getCardForRenewal": result = getCardForRenewal_(req); break;
case "getRenewalSummary": result = getRenewalSummary_(req); break;
case "createRenewalPayment": result = createRenewalPayment_(req); break;
case "cancelPendingRenewal": result = cancelPendingRenewal_(req); break;
case "adminUpdateOpsLog": result = adminUpdateOpsLog_(req); break;
case "adminDeleteOpsLog": result = adminDeleteOpsLog_(req); break;
case "getCardOpsLogs": result = getCardOpsLogs_(req); break;
case "adminDirectConfirmPayment": result = adminDirectConfirmPayment_(req);break;

  case 'adminBatchCreateCards':
    result = adminBatchCreateCards_(req);
    break;
    
  case "adminGetCardsByReferrer": result = adminGetCardsByReferrer_(req); break;
  case "adminBatchUpdateCards":   result = adminBatchUpdateCards_(req);   break;
  case "adminBatchRenewCards":    result = adminBatchRenewCards_(req);    break;

  case "adminGetCardCtas": result = adminGetCardCtas_(req); break;
   case "getCardViewStats":     result = getCardViewStats_(req);     break;
  case "adminGetAllViewStats": result = adminGetAllViewStats_(req); break;
  case "adminFlushViewStats":  result = adminFlushViewStats_(req);  break;
  case "adminSetCardCtas": result = adminSetCardCtas_(req); break;

  case "adminBatchBankMatch":             result = adminBatchBankMatch_(req);             break;
  case "adminConfirmBankImport":          result = adminConfirmBankImport_(req);          break;
  case "adminBatchDirectConfirmPayment":  result = adminBatchDirectConfirmPayment_(req);  break;
  case "adminSetCardMainCard":   result = adminSetCardMainCard_(req);   break;
  case "adminGetAttachedCards":  result = adminGetAttachedCards_(req);  break;

  case "adminSaveBatchMaster":   result = adminSaveBatchMaster_(req);   break;
  case "adminListBatchMasters":  result = adminListBatchMasters_(req);  break;
  case "adminGetBatchMaster":    result = adminGetBatchMaster_(req);    break;
  case "adminDeleteBatchMaster": result = adminDeleteBatchMaster_(req); break;


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
/**
 * v420 直接確認付款
 * 收現金 / 贈送 / 跳過比對直接啟用
 * amount = 0：跳過分潤、不推 LINE，照常啟用名片
 */function adminDirectConfirmPayment_(req) {
  requireAdminKeyOrSystem_(req);

  var cardId      = sanitizeText_(req.cardId || '').toUpperCase();
  var amount      = Number(req.amount) || 0;
  var note        = sanitizeText_(req.note || 'admin_direct_confirm');
  var paymentType = sanitizeText_(req.paymentType || '');

  if (!cardId)    return { ok: false, error: '卡號不可空白' };
  if (amount < 0) return { ok: false, error: '金額不可為負數' };

  // --- 1. 確認卡片存在 ---
  var card = findRowByField_('card_db', 'id', cardId);
  if (!card) return { ok: false, error: '找不到卡片：' + cardId };

  // --- 2. 自動判斷付款類型 ---
  var currentStatus = sanitizeText_(card.status || '');
  if (!paymentType) {
    paymentType = (currentStatus === 'pending_first' || currentStatus === 'pending')
      ? 'first_payment' : 'renewal';
  }

  var now = new Date();

  // 🔒 鎖定：保護「找現有 pending 單／建立新 pending 單」這段，避免同一張卡被併發請求
  // 重複建立兩筆 pending 付款。confirmPayment_ 自己有獨立的鎖，這裡的鎖在呼叫它之前就先釋放，
  // 不做巢狀鎖定，兩段各自保護各自的關鍵區。
  var paymentId;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    throw new Error('系統忙碌，無法完成付款確認，請稍後再試。');
  }

  try {
    // --- 3. 找現有 pending 單 ---
    var payments = getSheetRowsByName_('payment_db');
    var pendingRow = null;
    for (var j = 0; j < payments.length; j++) {
      if (sanitizeText_(payments[j].card_id).toUpperCase() === cardId &&
          sanitizeText_(payments[j].status).toLowerCase() === 'pending') {
        pendingRow = payments[j];
        break;
      }
    }

    if (pendingRow) {
      // 有 pending 單：補金額和備註
      paymentId = sanitizeText_(pendingRow.payment_id);
      var updatedPending = shallowClone_(pendingRow);
      updatedPending.amount = amount;
      updatedPending.note   = mergeNote_(updatedPending.note, note);
      updateRowByName_('payment_db', pendingRow.__rowNum, updatedPending);

      // 🛡️ 把同卡其他 pending 單全部取消
      for (var k = 0; k < payments.length; k++) {
        var op = payments[k];
        if (sanitizeText_(op.card_id).toUpperCase() === cardId &&
            sanitizeText_(op.status).toLowerCase() === 'pending' &&
            sanitizeText_(op.payment_id) !== paymentId) {
          var cancelled = shallowClone_(op);
          cancelled.status = 'cancelled';
          cancelled.note   = mergeNote_(op.note, 'cancelled_by_admin_direct_confirm');
          updateRowByName_('payment_db', op.__rowNum, cancelled);
          Logger.log('adminDirectConfirmPayment_: cancelled pending ' + op.payment_id);
        }
      }

    } else {
      // 沒有 pending 單：建一筆新的
      paymentId = 'PAY-DIRECT-' + cardId + '-' + now.getTime();
      var eventType = (paymentType === 'first_payment') ? 'first_payment' : 'renewal';
      var newRow = {
        payment_id:  paymentId,
        card_id:     cardId,
        amount:      amount,
        status:      'pending',
        event_type:  eventType,
        order_type:  paymentType,
        method:      'offline_transfer',
        note:        note,
        created_at:  toIso_(now),
        operated_by: 'admin'
      };
      appendRowByName_('payment_db', newRow);
      Logger.log('adminDirectConfirmPayment_: created new pending ' + paymentId);
    }
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      Logger.log('adminDirectConfirmPayment_ lock release failed: ' + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
    }
  }

  // --- 4. 統一走 confirmPayment_（confirmPayment_ 內部會自己再上鎖保護實際確認/開卡邏輯）---
  var result = confirmPayment_({
    payment_id:  paymentId,
    paid_at:     toIso_(now),
    method:      'offline_transfer',
    note:        note,
    operated_by: sanitizeText_(req.operatedBy || req.operated_by || 'admin')
  });

  // 清快取
  try {
    CacheService.getScriptCache().removeAll([
      'hsc:sheet_rows:payment_db',
      'hsc:sheet_rows:payment_inbox_db'
    ]);
  } catch(e) { Logger.log('清快取失敗：' + e.message); }

  return result;
}
/* ============================================================
 * ============== P2. getAdminBootstrap_ 預載入 ==============
 * ============================================================
 * 原本這支會依序呼叫 8 支 API,每支內部都 getSheetRowsByName_
 * 造成同一張表被重複掃。
 *
 * 新版:開頭一次把所有需要的表都讀進 session cache,後續 8 支
 * 子 API 雖然還是呼叫同一個 getSheetRowsByName_,但第二次起
 * 都命中 _sessionRowCache_,不用再跑 getRange().getValues()
 * ============================================================ */
function getAdminBootstrap_(req) {
  req = req || {};
  requireAdminKeyOrSystem_(req);

  var tenant = getTenant_(req);
  var includeRenewals = String(req.include_renewals || "").toLowerCase() !== "false";
  var includeAddons = String(req.include_addons || "").toLowerCase() !== "false";
  var includeAgents = String(req.include_agents || "").toLowerCase() !== "false";
  var includeAnnouncements = String(req.include_announcements || "").toLowerCase() !== "false";
  var paymentsLimit = Number(req.payments_limit || 200) || 200;

  // === v7.15: 一次預載所有表 ===
  var tablesToPreload = [
    "request_db",
    "card_db",
    "payment_db",
    "ops_log_db"
  ];
  if (includeAnnouncements) tablesToPreload.push("announcement_db");
  if (includeRenewals) tablesToPreload.push("renewal_db");
  if (includeAddons) tablesToPreload.push("add_on_order_db");
  if (includeAgents) tablesToPreload.push("agent_db");

  var preloadStart = new Date().getTime();
  prewarmSessionCache_(tablesToPreload);
  var preloadMs = new Date().getTime() - preloadStart;

  var result = {
    ok: true,
    version: HSC_VERSION,
    action: "getAdminBootstrap",
    tenant: tenant,
    generated_at: nowIso_(),
    _perf: { preload_ms: preloadMs, preloaded_tables: tablesToPreload }
  };

  try {
    result.requests = getRequests_({
      tenant: tenant,
      admin_key: req.admin_key,
      __system_call: req.__system_call,
      limit: req.requests_limit || 50,
      offset: 0,
      light: true
    }).requests || [];
  } catch (e) {
    result.requests = [];
    result._err_requests = e.message;
  }

  try {
    result.cards = getCards_({
      tenant: tenant,
      admin_key: req.admin_key,
      __system_call: req.__system_call,
      limit: req.cards_limit || 100,
      offset: 0,
      light: true
    }).cards || [];
  } catch (e) {
    result.cards = [];
    result._err_cards = e.message;
  }

  try {
    var paymentRows = getPayments_({
      tenant: tenant,
      admin_key: req.admin_key,
      __system_call: req.__system_call,
      limit: paymentsLimit,
      offset: 0,
      light: true
    }).payments || [];
    result.payments = paymentRows;
    result.payment_list = paymentRows;
  } catch (e) {
    result.payments = [];
    result.payment_list = [];
    result._err_payments = e.message;
  }

  try {
    var opsResult = getRecentOpsLogs_({
      tenant: tenant,
      admin_key: req.admin_key,
      __system_call: req.__system_call,
      limit: req.ops_limit || 20
    }) || {};
    result.ops_logs = opsResult.items || opsResult.logs || [];
  } catch (e) {
    result.ops_logs = [];
    result._err_ops = e.message;
  }

  if (includeAnnouncements) {
    try {
      result.announcements = getAnnouncements_({ tenant: tenant }).announcements || [];
    } catch (e) {
      result.announcements = [];
    }
  }

  if (includeRenewals) {
    try {
      result.renewals = adminGetRenewalList_({
        tenant: tenant,
        admin_key: req.admin_key,
        __system_call: req.__system_call
      }).renewals || [];
    } catch (e) {
      result.renewals = [];
      result._err_renewals = e.message;
    }
  }

  if (includeAddons) {
    try {
      result.addons = getAddonOrders_({
        tenant: tenant,
        admin_key: req.admin_key,
        __system_call: req.__system_call
      }).addon_orders || [];
    } catch (e) {
      result.addons = [];
      result._err_addons = e.message;
    }
  }

  if (includeAgents) {
    try {
      result.agents = adminListAgents_({
        tenant: tenant,
        admin_key: req.admin_key,
        __system_call: req.__system_call,
        limit: 200
      }).agents || [];
    } catch (e) {
      result.agents = [];
      result._err_agents = e.message;
    }
  }

  result._perf.total_ms = new Date().getTime() - preloadStart;
  return result;
}


/* ============================================================
 * =========== P3. ensureAgentExists_ Property 快取 ==========
 * ============================================================
 * 原本每次呼叫都會 findRowByField_("agent_db", "agent_id", id)
 * 即使加了快取,也要跑索引查詢。建卡流程會呼叫 9 次!
 *
 * 新版:用 Script Properties 存一個「已知存在的 agent_id 集合」
 * 布隆過濾,99% 的情況下直接命中不查表。
 *
 * 注意:這個 Property 是選擇性的快取,即使失效也不會錯,
 * 因為 ensureAgentExists_ 本來就會 double-check,
 * 只是省掉一次讀表的成本。
 * ============================================================ */

var AGENT_EXISTS_PROP_KEY_ = "HSC_AGENT_EXISTS_SET_V715";
var _agentExistsMemo_ = null;  // 同 execution 內用

function getAgentExistsSet_() {
  if (_agentExistsMemo_) return _agentExistsMemo_;
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(AGENT_EXISTS_PROP_KEY_);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        _agentExistsMemo_ = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  _agentExistsMemo_ = {};
  return _agentExistsMemo_;
}

function markAgentExists_(agentId) {
  var id = sanitizeText_(agentId);
  if (!id) return;
  var set = getAgentExistsSet_();
  if (set[id]) return;
  set[id] = 1;
  try {
    PropertiesService.getScriptProperties().setProperty(AGENT_EXISTS_PROP_KEY_, JSON.stringify(set));
  } catch (e) {
    // Property 寫失敗就算了,下次還會再檢查
  }
}

/**
 * 一次初始化:把 agent_db 裡所有現有的 agent_id 都灌進 Property
 * 建議手動跑一次
 */
function __rebuildAgentExistsSet() {
  var agents = getSheetRowsByName_("agent_db");
  var set = {};
  agents.forEach(function(a) {
    var id = sanitizeText_(a.agent_id);
    if (id) set[id] = 1;
  });
  PropertiesService.getScriptProperties().setProperty(AGENT_EXISTS_PROP_KEY_, JSON.stringify(set));
  _agentExistsMemo_ = set;
  Logger.log("重建 agent_exists_set 完成,共 " + Object.keys(set).length + " 個 agent");
  return { ok: true, count: Object.keys(set).length };
}

/**
 * [REPLACE] ensureAgentExists_ - 改用 Property 布隆過濾
 * 核心邏輯不變,只是加了一層快取檢查
 */
function ensureAgentExists_(agentId, context) {
  var id = sanitizeText_(agentId);
  if (!id) return null;
  
  // 先查 sheet(快取會回殘缺物件,不可靠)
  var existing = findRowByField_("agent_db", "agent_id", id);
  if (existing) return existing;
  
  // 需要建立新 agent
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (e) {
    Logger.log("ensureAgentExists_ lock timeout for: " + id);
    var retry = findRowByField_("agent_db", "agent_id", id);
    if (retry) return retry;
    return null;
  }
  
  try {
    existing = findRowByField_("agent_db", "agent_id", id);
    if (existing) return existing;
    
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
      ownerName = sanitizeText_(lead.name);
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
    
    // v7.13 修正: 重新查 sheet 拿到真實 row(含 __rowNum),避免 caller 後續 update 失敗
    var newAgent = findRowByField_("agent_db", "agent_id", id);
    Logger.log("ensureAgentExists_ created: " + id + " from: " + source);
    return newAgent || row;
    
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}
/* ============================================================
 * ============ P4. generateCardId_ 純序號版本 ===============
 * ============================================================
 * 原本會 clearSheetRowCache_ + getSheetRowsByName_("card_db")
 * + 掃所有 TW*** 找 max,還要 Lock 30 秒。
 *
 * 新版:純走 Script Properties,不碰 sheet
 * 一開始先跑 __initCardIdSequence() 初始化,之後就是 O(1)
 * ============================================================ */

/**
 * 一次性初始化:掃 card_db 找出目前最大的 TW 序號,寫進 Property
 * 部署 v7.15 patch 之後,請手動跑這個一次
 */
function __initCardIdSequence() {
  var rows = getSheetRowsByName_("card_db");
  var maxNum = 0;
  rows.forEach(function(r) {
    var m = /^TW(\d{4,})$/.exec(sanitizeText_(r.id));
    if (m) {
      var n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  PropertiesService.getScriptProperties().setProperty("HSC_CARD_SEQ_TW", String(maxNum));
  Logger.log("卡號序號初始化完成,目前最大序號: TW" + String(maxNum).padStart(4, "0"));
  return { ok: true, max_seq: maxNum };
}

/**
 * [REPLACE] generateCardId_ - 序號版（完全自給自足）
 * 1. Property 未設定 → 掃 card_db 找最大現有卡號初始化
 * 2. 內部自己跳過已存在的卡號，不依賴外層 ensureUniqueGeneratedValue_ 重試
 * 3. 無論 card_db 有幾張卡，都能正確產出下一個未使用的 ID
 */
function generateCardId_() {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(5000);
  } catch (lockErr) {
    var now = new Date();
    var millis6 = String(now.getTime()).slice(-6);
    var rand4 = String(Math.floor(Math.random() * 9000 + 1000));
    var fallbackId = "TW" + millis6 + rand4.slice(0, 2);
    Logger.log("generateCardId_ lock failed, fallback: " + fallbackId);
    return fallbackId;
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var key = "HSC_CARD_SEQ_TW";
    var rawProp = props.getProperty(key);
    var currentSeq = (rawProp !== null) ? Number(rawProp) : -1;

    // Property 未設定或無效 → 掃 card_db 找目前最大卡號
    if (currentSeq < 0 || !isFinite(currentSeq)) {
      var allRows = getSheetRowsByName_("card_db");
      var maxNum = 0;
      allRows.forEach(function(r) {
        var m = /^TW(\d{4,})$/i.exec(sanitizeText_(r.id || ""));
        if (m) { var n = Number(m[1]); if (n > maxNum) maxNum = n; }
      });
      currentSeq = maxNum;
      Logger.log("generateCardId_: HSC_CARD_SEQ_TW 自動初始化為 " + maxNum);
    }

    // 從 currentSeq+1 開始往上找，直到找到不存在的卡號
    var nextSeq = currentSeq + 1;
    while (findRowByField_("card_db", "id", "TW" + String(nextSeq).padStart(4, "0"))) {
      nextSeq++;
    }

    var nextId = "TW" + String(nextSeq).padStart(4, "0");
    props.setProperty(key, String(nextSeq));
    Logger.log("generateCardId_: 產出 " + nextId);
    return nextId;

  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


/* ============================================================
 * ========= P5. 移除多餘的 clearSheetRowCache_ ==============
 * ============================================================
 * createCardWithOfflinePayment_ 開頭的 clearSheetRowCache_("invite_db")
 * 和 incrementInviteUsage_ 開頭的 clearSheetRowCache_("invite_db")
 * 都是多餘的——快取本來就在寫入後會自動失效,開頭清沒意義,
 * 只會把 session cache 一起搞掉。
 *
 * 但我們不直接改那兩個函式(風險高),而是把 clearSheetRowCache_
 * 包裝成:如果是 invite_db 的無意義清除,就跳過
 * ============================================================ */

// 原本 clearSheetRowCache_ 在 v7.14.1 patch 裡是:
//   function clearSheetRowCache_(schemaName) { ... }
// 我們在這裡 wrap,但要確保 invalidateCacheOnWrite_ 還能清
// 方法:invalidateCacheOnWrite_ 不走 clearSheetRowCache_
// 改走直接操作
//
// 但觀察程式碼,clearSheetRowCache_ 被呼叫的地方:
//   1. invalidateCacheOnWrite_(schemaName) → 正常清一張表(必要)
//   2. clearSheetRowCache_(undefined) → 清全部(batch import 時)
//   3. createCardWithOfflinePayment_ → clearSheetRowCache_("invite_db")(多餘)
//   4. incrementInviteUsage_ → clearSheetRowCache_("invite_db")(多餘)
//   5. generateCardId_ → clearSheetRowCache_("card_db")(舊版,新版已移除)
//
// 第 3、4 那兩個是「讀之前先清」,其實快取該是新的(因為上次寫入已清過),
// 清了反而讓 session cache 失效,增加重讀成本。
//
// 策略:既然 invalidateCacheOnWrite_ 已經能正確處理寫入失效,
// 這兩處的 clearSheetRowCache_ 可以直接改成 no-op。
// 但為了避免連鎖改動,我們提供一個「正確的 invalidate」函式,
// 然後手動在 createCardWithOfflinePayment_ / incrementInviteUsage_
// 裡把那行刪掉。
//
// → 做法:patch 裡不改原函式,而是提供 __applyPerfTweaks 工具,
//   說明哪幾行要手動刪。
// → 實際上這兩行的負面影響很小(只讓該次請求少一層命中),
//   所以這個 patch 先不動,等量測真的還是慢再手動刪。

// 保留提示:如果量測發現建卡還是 > 5 秒,建議手動刪這兩行:
// 1. createCardWithOfflinePayment_ 裡的 `clearSheetRowCache_("invite_db");`(第 1 行)
// 2. incrementInviteUsage_ 裡的 `clearSheetRowCache_("invite_db");`(第 1 行)


/* ============================================================
 * ============ P6. getAdminCardDashboard_ 加速 ==============
 * ============================================================
 * v7.14.1 已經做過最佳化(單次 pass、索引化)
 * 但還可以進一步:把讀表改成走 session cache
 *
 * 這裡直接 REPLACE v7.14.1 的版本
 * ============================================================ */
function getAdminCardDashboard_(req) {
  ensureSchemasOrThrow_([
    "card_db", "payment_db", "commission_db",
    "add_on_order_db", "renewal_db", "update_log_db"
  ]);
  req = req || {};
  requireAdminKeyOrSystem_(req);

  var tenant = getTenant_(req);
  var nowMs = Date.now();

  // === v7.15: 一次預載,後續全命中 session cache ===
  prewarmSessionCache_([
    "card_db", "payment_db", "add_on_order_db",
    "renewal_db", "update_log_db"
  ]);

  var allCards = getSheetRowsCached_("card_db");
  var allPayments = getSheetRowsCached_("payment_db");
  var allAddons = getSheetRowsCached_("add_on_order_db");
  var allRenewals = getSheetRowsCached_("renewal_db");
  var allUpdateLogs = getSheetRowsCached_("update_log_db");

  // === 一次 pass 過濾 cards ===
  var cards = [];
  for (var i = 0; i < allCards.length; i++) {
    if (sameTenant_(allCards[i].tenant, tenant)) cards.push(allCards[i]);
  }
  cards.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  // === 一次 pass 過濾 payments 並建 latest map ===
  var payments = [];
  var latestPaymentMap = {};
  for (var j = 0; j < allPayments.length; j++) {
    var pay = allPayments[j];
    if (!sameTenant_(pay.tenant, tenant)) continue;
    payments.push(pay);

    var payCardId = sanitizeText_(pay.card_id);
    if (!payCardId) continue;

    var payTs = toTimestampMs_(pay.updated_at || pay.created_at || pay.paid_at || pay.due_at);
    var existing = latestPaymentMap[payCardId];
    if (!existing || payTs >= existing.__ts) {
      pay.__ts = payTs;
      latestPaymentMap[payCardId] = pay;
    }
  }
  Object.keys(latestPaymentMap).forEach(function(k) { delete latestPaymentMap[k].__ts; });

  // === commissions ===
  var commissions = [];
  for (var k = 0; k < payments.length; k++) {
    var p = payments[k];
    if (sanitizeText_(p.status).toLowerCase() !== "paid") continue;
    var pEvent = sanitizeText_(p.event_type);
    var pOrder = sanitizeText_(p.order_type);
    var pCommission = sanitizeText_(p.commission_status).toLowerCase();
    var pRelevant = pEvent === "first_payment" || pEvent === "renewal" ||
                    pOrder === "renewal" || pEvent === "addon_payment";
    if (!pRelevant) continue;
    if (pCommission && pCommission !== "pending") continue;

    commissions.push({
      payment_id: sanitizeText_(p.payment_id),
      card_id: sanitizeText_(p.card_id),
      amount: Number(p.amount || 0),
      event_type: pEvent,
      order_type: pOrder,
      commission_status: sanitizeText_(p.commission_status),
      paid_at: sanitizeText_(p.paid_at),
      created_at: sanitizeText_(p.created_at)
    });
  }
  commissions.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  // === pending addons ===
  var pendingAddons = [];
  for (var m = 0; m < allAddons.length; m++) {
    var ao = allAddons[m];
    if (!sameTenant_(ao.tenant, tenant)) continue;
    if (sanitizeText_(ao.status).toLowerCase() !== "pending") continue;
    var countdown = buildAddonOrderCountdown_(ao, nowMs);
    pendingAddons.push({
      addon_order_id: sanitizeText_(ao.addon_order_id),
      card_id: sanitizeText_(ao.card_id),
      addon_type: sanitizeText_(ao.addon_type),
      addon_key: sanitizeText_(ao.addon_key),
      item_code: sanitizeText_(ao.item_code),
      item_name: sanitizeText_(ao.item_name),
      qty: Number(ao.qty || 0),
      amount: Number(ao.amount || 0),
      status: sanitizeText_(ao.status),
      created_at: sanitizeText_(ao.created_at),
      due_at: countdown.due_at,
      countdown_label: countdown.label,
      is_overdue: countdown.is_overdue,
      is_today: countdown.is_today
    });
  }
  pendingAddons.sort(function(a, b) {
    return toTimestampMs_(a.due_at) - toTimestampMs_(b.due_at);
  });

  // === pending renewals ===
  var pendingRenewals = [];
  for (var n = 0; n < allRenewals.length; n++) {
    var rn = allRenewals[n];
    if (!sameTenant_(rn.tenant, tenant)) continue;
    var rnStatus = sanitizeText_(rn.status).toLowerCase();
    var rnBilling = sanitizeText_(rn.billing_status).toLowerCase();
    if (rnStatus === "paid" || rnBilling === "paid") continue;
    if (rnStatus !== "pending" && rnStatus !== "overdue" &&
        rnStatus !== "unpaid" && rnStatus) continue;

    var rnInfo = buildRenewalCountdownInfo_(rn, nowMs);
    pendingRenewals.push({
      renewal_id: sanitizeText_(rn.renewal_id),
      card_id: sanitizeText_(rn.card_id),
      status: sanitizeText_(rn.status),
      billing_status: sanitizeText_(rn.billing_status),
      total_amount: toNumber_(rn.total_amount),
      due_at: rnInfo.due_at || formatRenewalDateForDisplay_(rn.due_at),
      countdown_label: rnInfo.label,
      is_overdue: !!rnInfo.is_overdue,
      is_today: !!rnInfo.is_today,
      reminder_stage: resolveRenewalReminderStageByCountdown_(rnInfo),
      last_reminded_at: formatRenewalDateForDisplay_(rn.last_reminded_at)
    });
  }
  pendingRenewals.sort(function(a, b) {
    return toTimestampMs_(a.due_at) - toTimestampMs_(b.due_at);
  });

  // === update count map ===
  var updateCountMap = buildUpdateCountMapFromRows_(allUpdateLogs, tenant);

  // === enrich + summary ===
  var summary = {
    cards_total: cards.length,
    unpaid_cards: 0,
    due_today_cards: 0,
    overdue_cards: 0,
    pending_commission_count: commissions.length,
    pending_addon_count: pendingAddons.length,
    pending_addon_due_today_count: 0,
    pending_addon_overdue_count: 0,
    renewal_pending_count: pendingRenewals.length,
    renewal_due_today_count: 0,
    renewal_overdue_count: 0
  };

  for (var ai = 0; ai < pendingAddons.length; ai++) {
    if (pendingAddons[ai].is_today) summary.pending_addon_due_today_count++;
    if (pendingAddons[ai].is_overdue) summary.pending_addon_overdue_count++;
  }
  for (var ri = 0; ri < pendingRenewals.length; ri++) {
    if (pendingRenewals[ri].is_today) summary.renewal_due_today_count++;
    if (pendingRenewals[ri].is_overdue) summary.renewal_overdue_count++;
  }

  var dueToday = [];
  var overdue = [];
  var enrichedCards = [];
  for (var ci = 0; ci < cards.length; ci++) {
    var card = cards[ci];
    var latestPayment = latestPaymentMap[sanitizeText_(card.id)] || null;
    var enriched = enrichAdminDashboardCard_(card, latestPayment, nowMs, updateCountMap);
    var cardBillingStatus = sanitizeText_(enriched.billing_status).toLowerCase();
    var latestPaymentStatus = sanitizeText_(enriched.latest_payment_status).toLowerCase();

    if (cardBillingStatus !== "paid") summary.unpaid_cards++;

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
    enrichedCards.push(enriched);
  }

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
      pending_commissions: commissions,
      pending_addons: pendingAddons,
      pending_renewals: pendingRenewals
    }
  };
}


/* ============================================================
 * =============== 部署後初始化 Checklist ====================
 * ============================================================
 * 1. 貼完整個 patch 後,重新部署
 * 2. 在 GAS 編輯器手動跑一次 __initCardIdSequence()
 *    → 會把目前最大 TW 序號寫進 Property
 * 3. 在 GAS 編輯器手動跑一次 __rebuildAgentExistsSet()
 *    → 會把目前所有 agent_id 寫進 Property 布隆過濾
 * 4. 跑 __benchmarkDashboard() 量新的速度
 * 5. 跑 __benchmarkCreateCard() 量新的建卡速度
 *
 * 預期:
 *   Dashboard 冷啟動 10s → 2-3s(3x-5x 提升)
 *   Dashboard 熱啟動 5s  → 0.5s 以下(10x 提升)
 *   建卡流程    10s → 3-5s(2-3x 提升)
 * ============================================================ */
/************************************************************
 * HSC GAS v7.16.0 · Referral Chain Fix
 * ----------------------------------------------------------
 * 問題:
 *   1. assignInviteToRequest_ 把 request.ref 只寫在 note 裡,
 *      沒有寫進 invite.referrer → 邀請碼沒綁推薦人
 *   2. form URL 只有 ?invite=xxx,沒有 &ref=xxx
 *      → 朋友點連結填表時,form.js 讀不到 ref
 *   3. createCardWithOfflinePayment_ 依賴前端傳 referrer,
 *      如果前面兩步都斷,分潤就永遠遺失
 *
 * 修復策略(4 道防線):
 *   Fix 1: invite.referrer 在派碼時自動寫入 request.ref
 *   Fix 2: form_url 自動帶上 &ref=xxx
 *   Fix 3: buildFormUrl_ / buildSpecialFormUrl_ 支援 ref 參數
 *   Fix 4: createCardWithOfflinePayment_ 如果前端沒傳 referrer,
 *          從邀請碼 fallback
 *
 * 貼法:
 *   整段貼到 GAS 檔案最下方,然後重新部署
 *
 * 注意:
 *   部署後,跑一次 __migrateInviteRefererFromRequests()
 *   把歷史 request 的 ref 回寫到對應的 invite.referrer
 ************************************************************/


/* ============================================================
 * [REPLACE] buildFormUrl_ - 支援 ref 參數
 * ============================================================ */
function buildFormUrl_(inviteCode, refCode) {
  var url = CONFIG.BASE_URL + "form.html?invite=" + encodeURIComponent(inviteCode);
  var ref = sanitizeText_(refCode);
  if (ref) {
    url += "&ref=" + encodeURIComponent(ref);
  }
  return toLiffUrl_(url);
}


/* ============================================================
 * [REPLACE] buildSpecialFormUrl_ - 支援 ref 參數
 * ============================================================ */
function buildSpecialFormUrl_(inviteCode, mode, photoLimit, refCode) {
  var url = CONFIG.BASE_URL + "form.html?invite=" + encodeURIComponent(sanitizeText_(inviteCode));
  if (mode) url += "&mode=" + encodeURIComponent(sanitizeText_(mode));
  if (photoLimit !== null && photoLimit !== undefined && !isNaN(photoLimit)) {
    url += "&photo_limit=" + encodeURIComponent(String(photoLimit));
  }
  var ref = sanitizeText_(refCode);
  if (ref) {
    url += "&ref=" + encodeURIComponent(ref);
  }
  return toLiffUrl_(url);
}


/* ============================================================
 * [REPLACE] assignInviteToRequest_ - 把 ref 寫入 invite.referrer
 * ============================================================ */
function assignInviteToRequest_(req) {
  ensureSchemasOrThrow_(["request_db", "invite_db"]);

  req = req || {};
  requireAdminKey_(req);

  var now = new Date();
  var nowIso = toIso_(now);

  var requestId = sanitizeText_(req.request_id || req.requestId);
  if (!requestId) throw new Error("Missing request_id");

  var request = findRowByField_("request_db", "request_id", requestId);
  if (!request) throw new Error("Request not found");

  // === v7.16: 取出 request 的 ref(推薦來源)===
  var ref = sanitizeText_(request.ref);

  var currentStatus = sanitizeText_(request.status).toLowerCase();
  if (currentStatus === "assigned" && sanitizeText_(request.assigned_invite_code)) {
    var existingCode = sanitizeText_(request.assigned_invite_code);

    // === v7.16: 即使是重複呼叫,也要把 URL 帶上 ref ===
    // 先從 invite_db 查一次 referrer(怕歷史資料沒綁)
    var existingInvite = findRowByField_("invite_db", "invite_code", existingCode);
    var existingRef = sanitizeText_(existingInvite && existingInvite.referrer) || ref;

    return {
      ok: true,
      version: HSC_VERSION,
      action: "assignInviteToRequest",
      request: request,
      invite_code: existingCode,
      form_url: buildFormUrl_(existingCode, existingRef),  // ← v7.16 帶 ref
      unchanged: true
    };
  }

  var inviteCode = createInviteCodeValue_();

  var invite = emptyRow_("invite_db");
  invite.invite_code = inviteCode;
  invite.created_at = nowIso;
  invite.expired_at = "";
  invite.status = "active";

  // === v7.16: 關鍵修復 - 把 request.ref 寫入 invite.referrer ===
  invite.referrer = ref;                  // ← 原本是 ""
  invite.service_agent = "";
  invite.agent_type = "customer";

  invite.used_count = "0";
  invite.max_use = "1";
  invite.note = "request:" + requestId + (ref ? (" ref:" + ref) : "");
  invite.tenant = sanitizeText_(request.tenant) || CONFIG.DEFAULT_TENANT;
  invite.plan = "free";
  invite.source = ref ? "request_assigned_with_ref" : "request_assigned";  // ← 區分來源
  invite.expire_at = toIso_(addDays_(now, 3));
  invite.used_at = "";
  invite.used_by_id = "";
  invite.disabled_at = "";
  invite.last_editor = sanitizeText_(req.operated_by || req.operator || "admin");
  invite.process_status = "ready";
  invite.is_test = "FALSE";

  appendRowByName_("invite_db", invite);
var updatedRequest = shallowClone_(request);
updatedRequest.status = "assigned";
updatedRequest.assigned_invite_code = inviteCode;
updatedRequest.assigned_by = sanitizeText_(req.operated_by || req.operator || "admin");
updatedRequest.assigned_at = nowIso;
updatedRequest.note = mergeNote_(updatedRequest.note, ref ? ("ref=" + ref) : "");
updateRowByName_("request_db", request.__rowNum, updatedRequest);

 // 派碼記錄寫入 ops_log
  writeOpsLog_({
    module: "invite",
    action: "invite_assigned",
    target_id: requestId,
    after_status: "assigned",
    operator: sanitizeText_(req.operated_by || req.operator || "admin"),
    note: "邀請碼:" + inviteCode + (ref ? (" 推薦人:" + ref) : "")
  });

  return {
    ok: true,
    version: HSC_VERSION,
    action: "assignInviteToRequest",
    request: updatedRequest,
    invite: invite,
    invite_code: inviteCode,
    form_url: buildFormUrl_(inviteCode, ref)  // ← v7.16 帶 ref
  };
}


/* ============================================================
 * [NEW] 建卡時從邀請碼 fallback 撈 referrer
 * ============================================================
 * 這是最終保險。如果前端因為任何原因沒傳 referrer,
 * 就從邀請碼上綁的 referrer 自動填補。
 *
 * 用法:在 createCardWithOfflinePayment_ 裡呼叫
 *      resolveReferrerFromInvite_(payload)
 * 這會 mutate payload,自動填入 referrer 相關欄位
 * ============================================================ */
function resolveReferrerFromInvite_(payload) {
  payload = payload || {};

  // 如果前端已經傳了 referrer,尊重前端
  var frontReferrer = sanitizeText_(payload.referrer);
  if (frontReferrer) {
    return {
      source: "frontend",
      referrer: frontReferrer
    };
  }

  // 沒傳 → 從邀請碼撈
  var inviteCode = sanitizeText_(payload.invite_code);
  if (!inviteCode) {
    return { source: "none", referrer: "" };
  }

  var invite = findRowByField_("invite_db", "invite_code", inviteCode);
  if (!invite) {
    return { source: "none", referrer: "" };
  }

  var inviteRef = sanitizeText_(invite.referrer);
  if (!inviteRef) {
    return { source: "invite_no_ref", referrer: "" };
  }

  // 把邀請碼綁的 referrer 填進 payload
  payload.referrer = inviteRef;
  payload.service_agent = inviteRef;
  payload.agent_type = "service";
  payload.source = payload.source || "invite_bound";
  payload.share_source = payload.share_source || "invite_bound";

  Logger.log("[resolveReferrerFromInvite_] fallback: invite=" + inviteCode + " ref=" + inviteRef);

  return {
    source: "invite_fallback",
    referrer: inviteRef
  };
}
/**
 * Admin 操作台用:取得綁定連結
 * 用法: action=adminBuildBindUrl, card_id=TW0099
 * 回傳: bind_url(LIFF) 給 admin 複製給客戶
 */
function adminBuildBindUrl_(req) {
  ensureSchemasOrThrow_(["card_db"]);
  req = req || {};
  requireAdminKeyOrSystem_(req);
  
  var cardId = sanitizeText_(req.card_id || req.cardId);
  if (!cardId) throw new Error("Missing card_id");
  
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found: " + cardId);
  
  // 🔐 v7.16.4:產生一次性 token(24 小時過期)
  var token = generateBindToken_(cardId);
  
  // 在 buildBindUrl_ 回傳的 URL 上加 token 參數
  var baseUrl = buildBindUrl_(cardId);
  var separator = baseUrl.indexOf("?") >= 0 ? "&" : "?";
  var bindUrl = baseUrl + separator + "token=" + encodeURIComponent(token);
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminBuildBindUrl",
    card_id: cardId,
    card_name: sanitizeText_(card.name),
    current_line_user_id: sanitizeText_(card.line_user_id) || "",
    bind_url: bindUrl,
    token_expires_in_hours: 24,
    instruction: "請將此 URL 傳給客戶,客戶在 LINE 內點即可綁定(連結 24 小時內有效)"
  };
}
function bindCardLine_(req) {
  req = req || {};
  
  var cardId = sanitizeText_(req.card_id || req.cardId);
  var lineUserId = sanitizeText_(req.line_user_id || req.lineUserId);
  var token = sanitizeText_(req.token);
  
  if (!cardId) throw new Error("Missing card_id");
  if (!lineUserId) throw new Error("Missing line_user_id");
  if (!token) throw new Error("Missing token");
  
  // 🔐 v7.16.4:驗證 token(過期 / 無效 / 對不上 card_id 都會 throw)
  verifyBindToken_(token, cardId);
  
  // 驗證通過 → 執行綁定
  var result = rebindLineUserId_({
    card_id: cardId,
    line_user_id: lineUserId
  });
  
  // 綁定成功 → 立即消費 token(防重放)
  if (result && result.ok) {
    consumeBindToken_(token);
  }
  
  return result;
}
function testBindUrlAPI() {
  var result = adminBuildBindUrl_({
    card_id: "TW0002",
    admin_key: "ANGEL2026" + "1972070707"  // 你的完整 admin key
  });
  Logger.log(JSON.stringify(result, null, 2));
}

function buildReminderText_(stage, customerName, cardId, amount, dueAt, orderLabel) {
  var dueStr = Utilities.formatDate(dueAt, CONFIG.DEFAULT_TIMEZONE || "Asia/Taipei", "yyyy/MM/dd HH:mm");
  var amountStr = "NT$ " + Number(amount).toLocaleString("zh-TW");
  
  var stageMessages = {
    "30min": 
      customerName + " 您好 💛\n\n" +
      "提醒您,剛才送出的" + orderLabel + "申請,\n" +
      "需在 " + dueStr + " 前完成付款喔。\n\n" +
      "📋 名片編號:" + cardId + "\n" +
      "💰 應付金額:" + amountStr + "\n\n" +
      "完成付款 = 3 步驟:\n" +
      "1️⃣ 複製付款資訊\n" +
      "2️⃣ 用銀行 App / ATM 轉帳\n" +
      "3️⃣ 回到表單填寫付款確認\n\n" +
      "❤️ 期待為您服務",
    
    "24h": 
      customerName + " 您好 💛\n\n" +
      "您的" + orderLabel + "申請已送出 24 小時,\n" +
      "還有 2 天就要截止了!\n\n" +
      "📋 名片編號:" + cardId + "\n" +
      "💰 應付金額:" + amountStr + "\n" +
      "⏰ 截止時間:" + dueStr + "\n\n" +
      "如果已轉帳但忘了填確認單,\n" +
      "請趕快回到表單完成第 3 步驟,\n" +
      "系統才能自動開通您的名片喔。\n\n" +
      "需要協助請聯繫客服 ❤️",
    
    "48h": 
      "🚨 緊急提醒\n\n" +
      customerName + " 您好,\n\n" +
      "您的" + orderLabel + "申請\n" +
      "明天 " + dueStr + " 就要截止了!\n\n" +
      "📋 名片編號:" + cardId + "\n" +
      "💰 應付金額:" + amountStr + "\n\n" +
      "為了確保您的名片順利開通,\n" +
      "請今日完成轉帳並填寫付款確認。\n\n" +
      "❤️ 期待為您服務,\n" +
      "如有任何問題請立即聯繫客服。",
    
    "72h": 
      "⏰ 最後通知\n\n" +
      customerName + " 您好,\n\n" +
      "您的" + orderLabel + "申請今日截止。\n" +
      "若已轉帳請立即填寫付款確認,\n" +
      "若尚未付款,請聯繫客服協助。\n\n" +
      "📋 名片編號:" + cardId + "\n" +
      "💰 應付金額:" + amountStr + "\n" +
      "⏰ 截止時間:" + dueStr + "\n\n" +
      "錯過時限將需重新申請喔 🙏"
  };
  
  return stageMessages[stage] || "";
}

/**
 * 取消某筆付款的所有後續提醒
 * 在以下時機呼叫:
 * - 客戶填寫付款確認單時
 * - admin 標記為已付款時
 * - 系統收到匯款匹配成功時
 */
function cancelPaymentReminders_(paymentId) {
  if (!paymentId) return { ok: false, error: "no_payment_id" };
  
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName("payment_db");
  if (!sheet) return { ok: false, error: "payment_db not found" };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var pidCol = headers.indexOf("payment_id");
  var cancelCol = headers.indexOf("reminders_cancelled_at");
  
  if (pidCol < 0 || cancelCol < 0) return { ok: false, error: "missing columns" };
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][pidCol]).trim() === String(paymentId).trim()) {
      sheet.getRange(i + 1, cancelCol + 1).setValue(new Date());
      Logger.log("[reminder] cancelled: " + paymentId);
      return { ok: true };
    }
  }
  
  return { ok: false, error: "payment_not_found" };
}

/**
 * 安裝排程觸發器(每小時跑一次)
 * 手動執行一次即可,不需重複跑
 */
function installReminderTrigger_() {
  // 先清掉舊的
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === "runPaymentReminderScheduler_") {
      ScriptApp.deleteTrigger(t);
      Logger.log("[reminder] 已刪除舊 trigger");
    }
  });
  
  // 安裝新的(每小時)
  ScriptApp.newTrigger("runPaymentReminderScheduler_")
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log("[reminder] ✅ 已安裝每小時排程");
}

/**
 * 移除排程觸發器(緊急停用時用)
 */
function uninstallReminderTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === "runPaymentReminderScheduler_") {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log("[reminder] 已移除 " + removed + " 個 trigger");
}
/* =============================================================
   公開函式 - GAS 編輯器選擇器才看得到
============================================================= */

// 公開:安裝排程觸發器(在編輯器跑一次即可)
function installPaymentReminderTrigger() {
  return installReminderTrigger_();
}

// 公開:手動測試掃描器
function manualRunPaymentReminderScheduler() {
  return runPaymentReminderScheduler_();
}

// 公開:卸載排程觸發器
function uninstallPaymentReminderTrigger() {
  return uninstallReminderTrigger_();
}

/* =============================================================
   Bind Token 機制 v1.0
   - admin 產生綁定連結時,夾帶一次性 token(24 小時過期)
   - 客戶綁定時驗證 token,綁定後立即刪除
   - 防止攻擊者用 card_id 惡意搶綁
============================================================= */

/**
 * 產生 bind token,有效期 24 小時
 */
function generateBindToken_(cardId) {
  if (!cardId) throw new Error("cardId required");
  
  var token = Utilities.getUuid().replace(/-/g, "");
  var expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  var data = {
    card_id: cardId,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };
  
  PropertiesService.getScriptProperties()
    .setProperty("bindtoken_" + token, JSON.stringify(data));
  
  return token;
}

/**
 * 驗證 bind token,有效就回傳 card_id,無效就 throw
 */
function verifyBindToken_(token, claimedCardId) {
  if (!token) throw new Error("INVALID_TOKEN: missing_token");
  
  var key = "bindtoken_" + token;
  var raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) throw new Error("INVALID_TOKEN: not_found_or_used");
  
  var data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error("INVALID_TOKEN: corrupt_data");
  }
  
  var expiresAt = new Date(data.expires_at);
  if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    PropertiesService.getScriptProperties().deleteProperty(key);
    throw new Error("INVALID_TOKEN: expired");
  }
  
  if (claimedCardId && String(data.card_id).trim() !== String(claimedCardId).trim()) {
    throw new Error("INVALID_TOKEN: card_id_mismatch");
  }
  
  return data.card_id;
}

/**
 * 消費 token(綁定成功後刪除,確保單次有效)
 */
function consumeBindToken_(token) {
  if (!token) return;
  PropertiesService.getScriptProperties().deleteProperty("bindtoken_" + token);
}

/**
 * 清理過期 token(可選,定期手動跑)
 */
function manualCleanupExpiredBindTokens() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var now = new Date();
  var cleaned = 0;
  
  Object.keys(props).forEach(function(key) {
    if (key.indexOf("bindtoken_") !== 0) return;
    try {
      var data = JSON.parse(props[key]);
      var expiresAt = new Date(data.expires_at);
      if (isNaN(expiresAt.getTime()) || expiresAt < now) {
        PropertiesService.getScriptProperties().deleteProperty(key);
        cleaned++;
      }
    } catch (err) {
      PropertiesService.getScriptProperties().deleteProperty(key);
      cleaned++;
    }
  });
  
  Logger.log("[bindtoken cleanup] removed " + cleaned + " expired tokens");
  return { ok: true, cleaned: cleaned };
}
function testNewBucket() {
  // 用一張現有卡片來測
  const cardId = "TW0002";
  
  console.log("\n=== v7.16.5 新 bucket 邏輯測試 ===\n");
  
  // 1. 看新 bucket 長相
  const bucket = getYearBucket_(cardId);
  console.log("📌 新 bucket:", bucket);
  console.log("   預期格式:" + cardId + "-YYYY-MM");
  
  // 2. 看當前 used 計數
  const used = getCurrentYearUpdateCount_(cardId);
  console.log("📊 當前 used:", used);
  
  // 3. 看完整 entitlements
  const card = findRowByField_("card_db", "id", cardId);
  if (!card) {
    console.log("❌ 找不到卡片");
    return;
  }
  
  console.log("\n--- 卡片資訊 ---");
  console.log("Plan:", card.plan);
  console.log("Status:", card.status);
  console.log("Paid_at (card):", card.payment_paid_at || "(empty)");
  console.log("Expires_at:", card.expires_at);
  
  const ent = buildEffectiveEntitlements_(card);
  console.log("\n--- Entitlements ---");
  console.log("Quota:", ent.free_update_quota);
  console.log("Used:", ent.free_update_used);
  console.log("Remaining:", ent.free_update_remaining);
  console.log("Mode:", ent.update_mode);
  console.log("Unlimited:", ent.update_unlimited_enabled);
  
  // 4. 測試:不同卡片同一天 bucket 應不同
  console.log("\n--- 不同卡片的 bucket(應該不同)---");
  const card2 = "TW0057";
  console.log("TW0002 bucket:", getYearBucket_("TW0002"));
  console.log(card2 + " bucket:", getYearBucket_(card2));
  
  console.log("\n=== 測試完成 ===");
}
/**
 * HSC 管理工具集(已整理 - 凌晨清理版)
 *
 * 內容:
 *   ── Production trigger 安裝/卸載
 *   ── 測試資料還原工具(fix 系列)
 *
 * 已刪除(2026-04-30):
 *   ── debugRecentPaymentConfirm
 *   ── debugRecentPaymentConfirm7days
 *   ── debugTW0081
 *   ── debugWhoMarkedPaid
 *   ── findRawTextOrigin
 *   ── debugTW0002
 *   ── checkUpdateRowSignature
 *   (上述都是一次性 debug,問題已解決)
 */


// =====================================================
// 🟢 Production:bind token 自動清理 trigger
// =====================================================

/**
 * 公開:安裝每日清理 token 排程
 * 在 GAS 編輯器跑一次即可
 */
function installBindTokenCleanupTrigger() {
  // 先清舊的 trigger(避免重複安裝)
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === "manualCleanupExpiredBindTokens") {
      ScriptApp.deleteTrigger(t);
      Logger.log("[bindtoken trigger] 已刪除舊 trigger");
    }
  });

  // 安裝新的(每日 1 次)
  ScriptApp.newTrigger("manualCleanupExpiredBindTokens")
    .timeBased()
    .everyDays(1)
    .atHour(4)  // 凌晨 4 點跑(避開業務尖峰)
    .create();

  Logger.log("[bindtoken trigger] ✅ 已安裝每日凌晨 4 點清理");
}

/**
 * 公開:卸載清理 trigger(緊急停用時用)
 */
function uninstallBindTokenCleanupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === "manualCleanupExpiredBindTokens") {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log("[bindtoken trigger] 已移除 " + removed + " 個 trigger");
}


// =====================================================
// 🟡 測試資料還原工具(以後做「維護按鈕」時可呼叫)
// =====================================================

/**
 * 一次還原 4 張測試卡(TW0072 / TW0073 / TW0074 / TW0081)
 * 用途:測試付款流程後,把卡片狀態回到 unpaid
 */
function fixAllTestCards() {
  const testList = ["TW0072", "TW0073", "TW0074", "TW0081"];

  testList.forEach(id => {
    console.log(`\n=== 處理 ${id} ===`);

    const card = findRowByField_("card_db", "id", id);
    if (!card) { console.log(`  ❌ 跳過(卡片不存在)`); return; }
    if (sanitizeText_(card.billing_status) === "unpaid") {
      console.log(`  ⏭️ 跳過(已是 unpaid)`);
      return;
    }

    card.billing_status = "unpaid";
    card.activated_at = "";
    card.payment_paid_at = "";
    card.expires_at = "";
    updateRowByName_("card_db", card.__rowNum, card);
    console.log(`  ✅ 還原 card → unpaid`);

    const payments = getSheetRowsByName_("payment_db");
    let pCount = 0;
    payments.forEach(p => {
      if (sanitizeText_(p.card_id) === id && sanitizeText_(p.status) === "paid") {
        p.status = "cancelled_test";
        p.paid_at = "";
        p.note = "Test residue cleanup";
        updateRowByName_("payment_db", p.__rowNum, p);
        pCount++;
      }
    });
    console.log(`  ✅ 還原 ${pCount} 筆 payment`);
  });

  console.log("\n=== 全部完成 ===");
}

/**
 * 還原 TW0002 測試殘留
 * 把續約後 expires_at 改回 2027-03-27,還原 5 筆 paid 為 cancelled_test
 */
function fixTW0002() {
  console.log("=== 還原 TW0002 ===");
  const card = findRowByField_("card_db", "id", "TW0002");
  if (!card) { console.log("❌ TW0002 不存在"); return; }
  card.expires_at = "2027-03-27T12:36:48";
  updateRowByName_("card_db", card.__rowNum, card);
  console.log(`✅ 改 expires_at: 2032 → 2027-03-27`);

  const renewals = getSheetRowsByName_("renewal_db");
  let cancelled = 0;
  renewals.forEach(r => {
    if (sanitizeText_(r.card_id) === "TW0002" && sanitizeText_(r.status) === "paid") {
      r.status = "cancelled_test";
      r.note = "Test residue cleanup";
      updateRowByName_("renewal_db", r.__rowNum, r);
      cancelled++;
    }
  });
  console.log(`✅ 還原 ${cancelled} 筆續約`);

  const payments = getSheetRowsByName_("payment_db");
  let pCancelled = 0;
  payments.forEach(p => {
    if (sanitizeText_(p.card_id) === "TW0002" && sanitizeText_(p.status) === "paid" && Number(p.amount) === 10500) {
      p.status = "cancelled_test";
      p.paid_at = "";
      p.note = "Test residue cleanup";
      updateRowByName_("payment_db", p.__rowNum, p);
      pCancelled++;
    }
  });
  console.log(`✅ 還原 ${pCancelled} 筆 payment`);
}

/**
 * 清 TW0001 示範卡的 pending 殘留
 * 用途:示範卡測試續約後會留 pending,跑這個清掉
 */
function cleanupTW0001() {
  console.log("=== 清 TW0001 測試殘留 ===");
  const cardId = "TW0001";

  const renewals = getSheetRowsByName_("renewal_db");
  let rCancelled = 0;
  renewals.forEach(r => {
    if (sanitizeText_(r.card_id) === cardId && sanitizeText_(r.status) === "pending") {
      r.status = "cancelled_test";
      r.note = "TW0001 demo card cleanup";
      updateRowByName_("renewal_db", r.__rowNum, r);
      rCancelled++;
    }
  });
  console.log(`✅ 取消 ${rCancelled} 筆 pending renewal`);

  const payments = getSheetRowsByName_("payment_db");
  let pCancelled = 0;
  payments.forEach(p => {
    if (sanitizeText_(p.card_id) === cardId && sanitizeText_(p.status) === "pending") {
      p.status = "cancelled_test";
      p.note = "TW0001 demo card cleanup";
      updateRowByName_("payment_db", p.__rowNum, p);
      pCancelled++;
    }
  });
  console.log(`✅ 取消 ${pCancelled} 筆 pending payment`);

  console.log("=== 完成 ===");
}
/**
 * 作廢卡片所有 pending 續約 / 付款
 * 用於客戶選擇重新續約時
 */
function cancelPendingRenewal_(req) {
  ensureSchemasOrThrow_(["card_db", "payment_db", "renewal_db"]);
  
  var cardId = normalizeCardId_(req.card_id || req.id);
  if (!cardId) throw new Error("Missing card_id");
  
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");
  
  var nowIso = toIso_(new Date());
  
  var renewals = getSheetRowsByName_("renewal_db");
  var rCancelled = 0;
  renewals.forEach(function(r) {
    if (sanitizeText_(r.card_id) === cardId && sanitizeText_(r.status) === "pending") {
      r.status = "cancelled_replaced";
      r.note = "Cancelled by user re-renewal at " + nowIso;
      updateRowByName_("renewal_db", r.__rowNum, r);
      rCancelled++;
    }
  });
  
  var payments = getSheetRowsByName_("payment_db");
  var pCancelled = 0;
  payments.forEach(function(p) {
    if (sanitizeText_(p.card_id) === cardId 
        && sanitizeText_(p.status) === "pending"
       && (sanitizeText_(p.payment_type) === "renewal" || sanitizeText_(p.event_type) === "renewal")) {
      try {
  refundRenewalPointsRedeem_(p, "system_cancel");
} catch (refundErr) {
  Logger.log("[cancelPendingRenewal_] refund points failed: " + refundErr.message);
}    
      p.status = "cancelled_replaced";
      p.note = "Cancelled by user re-renewal at " + nowIso;
      updateRowByName_("payment_db", p.__rowNum, p);
      pCancelled++;
    }
  });
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "cancelPendingRenewal",
    card_id: cardId,
    renewal_cancelled: rCancelled,
    payment_cancelled: pCancelled
  };
}
/**
 * 退還續約折抵的點數
 * 呼叫時機:cancelPendingRenewal_ / markPaymentRefunded_
 * 從 payment.note 的 order_summary_json 解析 points_used
 * 若找不到就從 pointsRedeem 參數讀(可選)
 */
function refundRenewalPointsRedeem_(payment, operatedBy) {
  if (!payment) return { ok: false, reason: "no_payment" };

  var paymentId = sanitizeText_(payment.payment_id);
  if (!paymentId) return { ok: false, reason: "no_payment_id" };

  // 從 agent_points_log 找對應的 redeem 紀錄
 var cardId = sanitizeText_(payment.card_id);
  var logs = getSheetRowsByName_("agent_points_log");
  var redeemLog = null;
  for (var i = 0; i < logs.length; i++) {
    var log = logs[i];
    if ((sanitizeText_(log.ref_id) === paymentId ||
         sanitizeText_(log.ref_id) === "card_" + cardId) &&
        sanitizeText_(log.type) === "renewal_redeem") {
      redeemLog = log;
    }
  }

  if (!redeemLog) {
    return { ok: true, reason: "no_redeem_log_found", points_refunded: 0 };
  }

  var agentId = sanitizeText_(redeemLog.agent_id);
  var pointsUsed = Math.abs(roundMoney_(toNumber_(redeemLog.points)));

  if (!pointsUsed || !agentId) {
    return { ok: true, reason: "no_points_to_refund", points_refunded: 0 };
  }

  // 檢查是否已經退過（避免重複退點）
  var alreadyRefunded = logs.some(function(log) {
    return sanitizeText_(log.ref_id) === paymentId &&
           sanitizeText_(log.type) === "renewal_refund";
  });
  if (alreadyRefunded) {
    return { ok: true, reason: "already_refunded", points_refunded: 0 };
  }

  try {
    changeAgentPointsBalanceInternal_({
      agent_id: agentId,
      points: pointsUsed,
      bucket: "balance",
      type: "renewal_refund",
      ref_id: paymentId,
      note: "退還續約折抵點數(payment=" + paymentId + ")",
      operator: sanitizeText_(operatedBy || "system")
    });

    // 補減 points_redeemed（bucket=balance 不會動這欄）
    var agent = findRowByField_("agent_db", "agent_id", agentId);
    if (agent) {
      var updated = shallowClone_(agent);
      updated.points_redeemed = String(Math.max(0, roundMoney_(toNumber_(updated.points_redeemed) - pointsUsed)));
      updated.updated_at = toIso_(new Date());
      updateRowByName_("agent_db", agent.__rowNum, updated);
    }

    return { ok: true, points_refunded: pointsUsed, agent_id: agentId };
  } catch (e) {
    Logger.log("[refundRenewalPointsRedeem_] failed: " + e.message);
    return { ok: false, reason: e.message, points_refunded: 0 };
  }
}
/**
 * 取卡片完整 CTA 列表(主表 1-3 + ext 4+)
 * 回傳:[{seq, cta_text, cta_link}, ...]
 */
function getCardCtaList_(cardId) {
  if (!cardId) return [];
  var list = [];
  
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) return list;
  
  // 主表 1-3
  for (var i = 1; i <= 3; i++) {
    var text = sanitizeText_(card["cta_text_" + i]);
    var link = sanitizeText_(card["cta_link_" + i]);
    if (text || link) {
      list.push({ seq: i, cta_text: text, cta_link: link });
    }
  }
  
  // ext 4+
  try {
    var ext = getSheetRowsByName_("card_cta_ext");
    ext.forEach(function(r) {
      if (sanitizeText_(r.id) === cardId) {
        list.push({
          seq: Number(r.seq) || 0,
          cta_text: sanitizeText_(r.cta_text),
          cta_link: sanitizeText_(r.cta_link)
        });
      }
    });
  } catch(e) {
    console.log("card_cta_ext read failed: " + e.message);
  }
  
  list.sort(function(a, b) { return a.seq - b.seq; });
  return list;
}

/**
 * 取卡片完整照片列表(主表 1-10 + ext 11+)
 * 回傳:[{seq, photo_url, photo_key, photo_meta_json}, ...]
 */
function getCardPhotoList_(cardId) {
  if (!cardId) return [];
  var list = [];
  
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) return list;
  
  // 主表 1-10
  for (var i = 1; i <= 10; i++) {
    var url = sanitizeText_(card["photo" + i + "_url"]);
    var key = sanitizeText_(card["photo" + i + "_key"]);
    if (url || key) {
      list.push({
        seq: i,
        photo_url: url,
        photo_key: key,
        photo_meta_json: ""
      });
    }
  }
  
  // ext 11+
  try {
    var ext = getSheetRowsByName_("card_photo_ext");
    ext.forEach(function(r) {
      if (sanitizeText_(r.id) === cardId) {
        list.push({
          seq: Number(r.seq) || 0,
          photo_url: sanitizeText_(r.photo_url),
          photo_key: sanitizeText_(r.photo_key),
          photo_meta_json: sanitizeText_(r.photo_meta_json)
        });
      }
    });
  } catch(e) {
    console.log("card_photo_ext read failed: " + e.message);
  }
  
  list.sort(function(a, b) { return a.seq - b.seq; });
  return list;
}
/**
 * v7.16: 列出所有測試卡(供 admin 清理介面使用)
 * 篩選:is_test=TRUE 或 name 含「測試」/「test」(寬鬆)
 * 排除 SYSTEM_PROTECTED_UPGRADE_IDS(TW0001 等)
 * 
 * @param {Object} req
 *   req.admin_key - 必填
 * @return {Object} { ok: true, count, cards: [...] }
 */
function adminListTestCards_(req) {
  req = req || {};
  requireAdminKeyOrSystem_(req);
  
  var cards = getSheetRowsByName_("card_db") || [];
  var testCards = [];
  
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardId = sanitizeText_(card.id);
    if (!cardId) continue;
    
    // 系統保護帳戶跳過
    if (SYSTEM_PROTECTED_UPGRADE_IDS.indexOf(cardId) !== -1) continue;
    
    var isTest = String(card.is_test || "").toUpperCase() === "TRUE";
    var nameStr = String(card.name || "").toLowerCase();
    var hasTestKeyword = nameStr.indexOf("測試") !== -1 || nameStr.indexOf("test") !== -1;
    
    if (isTest || hasTestKeyword) {
      testCards.push({
        id: cardId,
        name: sanitizeText_(card.name) || "",
        phone: sanitizeText_(card.phone) || "",
        plan: sanitizeText_(card.plan) || "",
        billing_status: sanitizeText_(card.billing_status) || "",
        created_at: sanitizeText_(card.created_at) || "",
        is_test: isTest,
        match_reason: isTest ? "is_test=TRUE" : "name_has_test_keyword",
        agent_id: sanitizeText_(card.agent_id) || "",
        owner_agent_id: sanitizeText_(card.owner_agent_id) || ""
      });
    }
  }
  
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminListTestCards",
    count: testCards.length,
    cards: testCards
  };
}
function inspectRequestDb() {
  const ss = SpreadsheetApp.openById('1k7LBTWKsTFtnhOC2Fgj0WqkJ0IO04ZBGHYyOnxoQnkg');
  const sheet = ss.getSheetByName('request_db');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  console.log(JSON.stringify(headers));
}
/* ============================================================
 * [NEW] adminUpdateOpsLog_ — 編輯 ops_log 某一筆
 * ============================================================ */
function adminUpdateOpsLog_(req) {
  ensureSchemasOrThrow_(["ops_log_db"]);
  req = req || {};
  requireAdminKey_(req);

  var logId = sanitizeText_(req.log_id);
  if (!logId) throw new Error("Missing log_id");

  var row = findRowByField_("ops_log_db", "log_id", logId);
  if (!row) throw new Error("Log not found: " + logId);

  var updated = shallowClone_(row);
  if (req.note !== undefined) updated.note = sanitizeText_(req.note);
  if (req.action !== undefined) updated.action = sanitizeText_(req.action);
  if (req.after_status !== undefined) updated.after_status = sanitizeText_(req.after_status);
  if (req.operator !== undefined) updated.operator = sanitizeText_(req.operator);

  updateRowByName_("ops_log_db", row.__rowNum, updated);

  return { ok: true, version: HSC_VERSION, action: "adminUpdateOpsLog", log: updated };
}

/* ============================================================
 * [NEW] adminDeleteOpsLog_ — 刪除 ops_log 某一筆
 * ============================================================ */
function adminDeleteOpsLog_(req) {
  ensureSchemasOrThrow_(["ops_log_db"]);
  req = req || {};
  requireAdminKey_(req);

  var logId = sanitizeText_(req.log_id);
  if (!logId) throw new Error("Missing log_id");

  var row = findRowByField_("ops_log_db", "log_id", logId);
  if (!row) throw new Error("Log not found: " + logId);

  deleteRowByRowNum_("ops_log_db", row.__rowNum);

  return { ok: true, version: HSC_VERSION, action: "adminDeleteOpsLog", log_id: logId };
}
/* ============================================================
 * [NEW] getCardOpsLogs_ — 查詢某張卡的 ops_log
 * ============================================================ */
function getCardOpsLogs_(req) {
  ensureSchemasOrThrow_(["ops_log_db"]);
  req = req || {};
  requireAdminKey_(req);

  var cardId = sanitizeText_(req.card_id);
  if (!cardId) throw new Error("Missing card_id");

  var rows = getSheetRowsByName_("ops_log_db").filter(function(row) {
    return sanitizeText_(row.target_id) === cardId;
  });

  rows.sort(function(a, b) {
    return sanitizeText_(b.created_at).localeCompare(sanitizeText_(a.created_at));
  });

  return { ok: true, version: HSC_VERSION, action: "getCardOpsLogs", items: rows };
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

  var freeQuota = normalizeEntitlementNumber_(cardRow && cardRow.annual_free_update_quota, planInfo.free_update_limit_yearly || 3);
  if (sanitizeText_(cardRow && cardRow.update_limit_override_enabled) === 'TRUE' && sanitizeText_(cardRow && cardRow.update_limit_override_value) !== '') {
    var legacyQuota = normalizeEntitlementNumber_(cardRow && cardRow.update_limit_override_value, freeQuota);
    if (legacyQuota >= 0) freeQuota = legacyQuota;
  }
  if (freeQuota < 0) freeQuota = 0;

  var freeUsed = normalizeEntitlementNumber_(cardRow && cardRow.annual_free_update_used, 0);
  if (!freeUsed && sanitizeText_(cardRow && cardRow.id)) {
    try {
      freeUsed = getCurrentYearUpdateCount_(cardRow.id);
    } catch (e) {
      Logger.log("buildEffectiveEntitlements_ getCurrentYearUpdateCount_ failed: " + e.message);
    }
  }
  if (freeUsed < 0) freeUsed = 0;
  var freeRemaining = Math.max(0, freeQuota - freeUsed);

  var unlimitedEnabledRaw = sanitizeText_(cardRow && cardRow.update_unlimited_enabled).toUpperCase() === 'TRUE' || addonSummary.update_unlimited_purchased;
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
      addon_photo_qty: addonSummary.addon_photo_qty,
      addon_cta_qty: addonSummary.addon_cta_qty,
      addon_sources: addonSummary.sources
    }
  };
}
function testDirectConfirm() {
  var result = adminDirectConfirmPayment_({
    admin_key: 'ANGEL20261972070707',
    cardId: 'TW0108',
    amount: 0,
    paymentType: '',
    note: '測試'
  });
  Logger.log(JSON.stringify(result));
}
function diagCard() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName('card_db');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colIdx = headers.indexOf('card_id');
  Logger.log('card_id 欄位索引：' + colIdx);
  for (var i = 1; i <= 5; i++) {
    Logger.log('row ' + i + ': [' + data[i][colIdx] + ']');
  }
}
function diagHeaders() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName('card_db');
  var headers = sheet.getDataRange().getValues()[0];
  Logger.log(JSON.stringify(headers.slice(0, 10)));
}
function runCommissionTests_() {
  var cases = [
    { label: 'CR001 銅牌首次+1點',         id: 'TPMT_CR001', expect_bronze_pts: 1  },
    { label: 'CR002 銀牌自由款首次20%',    id: 'TPMT_CR002', expect_silver_pts: 200 },
    { label: 'CR003 銀牌精品款首次15%',    id: 'TPMT_CR003', expect_silver_pts: 300 },
    { label: 'CR004 銀牌續約20%',          id: 'TPMT_CR004', expect_silver_pts: 100 },
    { label: 'CR007 金牌自由款首次30%',    id: 'TPMT_CR007', expect_gold_cash: 300  },
    { label: 'CR008 金牌精品款首次25%',    id: 'TPMT_CR008', expect_gold_cash: 500  },
    { label: 'CR009 金牌續約30%',          id: 'TPMT_CR009', expect_gold_cash: 150  },
    { label: 'CR011 金牌更新10%',          id: 'TPMT_CR011', expect_gold_cash: 30   },
    { label: 'CR014 銀牌更新5%',           id: 'TPMT_CR014', expect_silver_pts: 15  },
  { label: 'CR005 銀牌加購5%',      id: 'TPMT_CR005', expect_silver_pts: 4    },
    { label: 'CR010 金牌加購10%',     id: 'TPMT_CR010', expect_gold_cash: 8     },
    { label: 'CR013 金牌推薦升金20%', id: 'TPMT_CR013', expect_gold_cash: 2000  },
    { label: 'CR015 銀牌推薦升金10%', id: 'TPMT_CR015', expect_silver_pts: 1000 },
    { label: 'CR016 銅牌推薦升金1%',  id: 'TPMT_CR016', expect_bronze_pts: 100  },];

  Logger.log('=== 分潤驗證開始 ===');

  cases.forEach(function(c) {
    var before = {
      bronze: getAgentSnapshot_('TAGENT_BRONZE'),
      silver: getAgentSnapshot_('TAGENT_SILVER'),
      gold:   getAgentSnapshot_('TAGENT_GOLD')
    };

    try {
      var result = autoProcessCommissionAfterPayment_(c.id);
      var after = {
        bronze: getAgentSnapshot_('TAGENT_BRONZE'),
        silver: getAgentSnapshot_('TAGENT_SILVER'),
        gold:   getAgentSnapshot_('TAGENT_GOLD')
      };

      var delta = {
        bronze_pts: after.bronze.points_balance - before.bronze.points_balance,
        silver_pts: after.silver.points_balance - before.silver.points_balance,
        gold_pts:   after.gold.points_balance   - before.gold.points_balance,
        gold_cash:  after.gold.total_commission - before.gold.total_commission
      };

      Logger.log('');
      Logger.log('[' + c.label + ']');
      Logger.log('  result.ok=' + result.ok + ' skipped=' + result.skipped + ' reason=' + result.reason);
      Logger.log('  銅牌點數Δ=' + delta.bronze_pts + '  銀牌點數Δ=' + delta.silver_pts + '  金牌現金Δ=' + delta.gold_cash);
      if (result.commissions) {
        result.commissions.forEach(function(cm) {
          Logger.log('  → commission: beneficiary=' + cm.beneficiary_agent_id + ' pts=' + cm.reward_points + ' cash=' + cm.reward_amount + ' rule=' + cm.rule_id);
        });
      }
    } catch(e) {
      Logger.log('[FAIL] ' + c.label + ' → ' + e.message);
    }
  });

  Logger.log('');
  Logger.log('=== 完成 ===');
}
function runCommissionTests() {
  runCommissionTests_();
}
function getAgentSnapshot_(agentId) {
  var row = findRowByField_('agent_db', 'agent_id', agentId);
  if (!row) return { points_balance: 0, total_commission: 0 };
  return {
    points_balance:   toNumber_(row.points_balance),
    total_commission: toNumber_(row.total_commission)
  };
}
function diagnoseCR002() {
  var payment = findRowByField_("payment_db", "payment_id", "TPMT_CR002");
  Logger.log("payment.agent_id=" + payment.agent_id);
  Logger.log("payment.share_agent_id=" + payment.share_agent_id);
  Logger.log("payment.card_id=" + payment.card_id);
  
  var card = findRowByField_("card_db", "id", payment.card_id);
  Logger.log("card.service_agent=" + (card ? card.service_agent : "card not found"));
  
  var agent = findRowByField_("agent_db", "agent_id", payment.agent_id);
  Logger.log("agent.agent_type=" + (agent ? agent.agent_type : "agent not found"));
  
  var rules = getApplicableCommissionRules_(payment, { eventType: "first_payment", targetType: "card_plan", plan: "free", amount: 1000 });
  Logger.log("matched rules count=" + rules.length);
  rules.forEach(function(r) {
    Logger.log("  rule=" + r.rule_id + " agent_type=" + r.agent_type + " source_type=" + r.source_type);
  });
}
function diagnoseCR002Rules() {
  var rules = getSheetRowsByName_("commission_rules");
  Logger.log("總規則數=" + rules.length);
  
  rules.forEach(function(r) {
    Logger.log(
      r.rule_id + 
      " status=" + r.status +
      " rule_type=" + r.rule_type +
      " plan=" + r.plan +
      " agent_type=" + r.agent_type +
      " source_type=" + r.source_type +
      " target_type=" + r.target_type +
      " commission_mode=" + r.commission_mode +
      " commission_value=" + r.commission_value +
      " bonus_mode=" + r.bonus_mode +
      " bonus_value=" + r.bonus_value +
      " tenant=" + r.tenant
    );
  });
}

// 🆕 依「備註關鍵字」預覽/清理測試資料（例如 Claude 測試腳本留下的 claude_test_ 開頭備註）
// 只掃 payment_db / payment_inbox_db / ops_log_db 的 note 欄位，只讀不刪；
// 實際刪除要另外呼叫 adminCleanupTestMarker_，且限定 marker 長度避免誤刪。
function adminPreviewTestMarker_(req) {
  req = req || {};
  requireAdminKeyOrSystem_(req);
  var marker = sanitizeText_(req.marker) || "claude_test_";

  var result = { ok: true, version: HSC_VERSION, action: "adminPreviewTestMarker", marker: marker, matches: {} };

  ["payment_db", "payment_inbox_db", "ops_log_db", "request_db"].forEach(function(sheetName) {
    var rows = getSheetRowsByName_(sheetName) || [];
    var matched = rows.filter(function(row) {
      return sanitizeText_(row.note).indexOf(marker) !== -1;
    });
    result.matches[sheetName] = {
      count: matched.length,
      rows: matched.map(function(row) {
        return {
          __rowNum: row.__rowNum,
          card_id: sanitizeText_(row.card_id || row.target_id),
          note: sanitizeText_(row.note),
          created_at: sanitizeText_(row.created_at)
        };
      })
    };
  });

  return result;
}

function adminCleanupTestMarker_(req) {
  req = req || {};
  requireAdminKeyOrSystem_(req);
  var marker = sanitizeText_(req.marker) || "claude_test_";
  if (marker.length < 6) throw new Error("marker 太短，避免誤刪，請用更明確的標記");

  var deleted = {};
  ["payment_db", "payment_inbox_db", "ops_log_db", "request_db"].forEach(function(sheetName) {
    var rows = getSheetRowsByName_(sheetName) || [];
    var matched = rows.filter(function(row) {
      return sanitizeText_(row.note).indexOf(marker) !== -1;
    });
    deleted[sheetName] = deleteRowsByName_(sheetName, matched);
  });

  try {
    CacheService.getScriptCache().removeAll([
      "hsc:sheet_rows:payment_db",
      "hsc:sheet_rows:payment_inbox_db",
      "hsc:sheet_rows:ops_log_db",
      "hsc:sheet_rows:request_db"
    ]);
  } catch (e) { Logger.log("清快取失敗：" + e.message); }

  return { ok: true, version: HSC_VERSION, action: "adminCleanupTestMarker", marker: marker, deleted: deleted };
}

// 🆕 補建常駐測試卡（TESTADMIN001 / PERFTEST001 / TESTREF，CLAUDE.md 文件記錄的固定測試工具）
// 只在「查無此卡」時才建立，已存在就跳過，不會覆蓋既有資料。
function adminRecreatePermanentTestCards_(req) {
  req = req || {};
  requireAdminKeyOrSystem_(req);

  var now = new Date();
  var defs = [
    { id: "TESTADMIN001", name: "測試管理員卡", expires_at: "2030-12-31T23:59:59" },
    { id: "PERFTEST001",  name: "效能基準測試卡", expires_at: "2030-12-31T23:59:59" },
    { id: "TESTREF",      name: "推薦流程測試卡", expires_at: "2030-12-31T23:59:59" }
  ];

  var result = { ok: true, version: HSC_VERSION, action: "adminRecreatePermanentTestCards", created: [], skipped: [], healed: [] };

  defs.forEach(function(def) {
    var existing = findRowByField_("card_db", "id", def.id);
    if (existing) {
      // 自我修復：已存在但缺 plan（例如舊資料或補建時漏設），補上 premium 讓更新/續約等功能能正常測試
      if (!sanitizeText_(existing.plan)) {
        var healedCard = shallowClone_(existing);
        healedCard.plan = "premium";
        updateRowByName_("card_db", existing.__rowNum, healedCard);
        result.healed.push(def.id);
      }
      result.skipped.push(def.id);
      return;
    }

    var card = emptyRow_("card_db");
    card.id = def.id;
    card.token = Utilities.getUuid();
    card.tenant = CONFIG.DEFAULT_TENANT;
    card.status = "active";
    card.billing_status = "paid";
    card.created_at = toIso_(now);
    card.updated_at = toIso_(now);
    card.activated_at = toIso_(now);
    card.expires_at = def.expires_at;
    card.payment_paid_at = toIso_(now);
    card.name = def.name;
    card.plan = "premium";
    card.is_test = "TRUE";
    card.agent_type = "customer";
    card.owner_agent_id = def.id;
    card.owner_agent_type = "customer";

    appendRowByName_("card_db", card);
    result.created.push(def.id);
  });

  return result;
}

function resetTestCommissions() {
  // 清 ScriptCache
  var scriptCache = CacheService.getScriptCache();
  scriptCache.removeAll([
    "hsc:sheet_rows:commission_db",
    "hsc:sheet_rows:payment_db",
    "hsc:sheet_rows:agent_db"
  ]);
  Logger.log("ScriptCache 清完");

  // 1. 清 payment_db commission_status
  var payments = getSheetRowsByName_("payment_db");
  payments.forEach(function(row) {
    if (sanitizeText_(row.payment_id).indexOf("TPMT_") === 0) {
      var updated = shallowClone_(row);
      updated.commission_status = "";
      updated.commission_processed_at = "";
      updateRowByName_("payment_db", row.__rowNum, updated);
    }
  });
  Logger.log("payment_db 清完");

  // 2. 刪 commission_db 測試記錄
  var commissions = getSheetRowsByName_("commission_db");
  var toDelete = commissions.filter(function(row) {
    return sanitizeText_(row.payment_id).indexOf("TPMT_") === 0;
  });
  if (toDelete.length > 0) {
    deleteRowsByName_("commission_db", toDelete);
  }
  Logger.log("commission_db 清完，刪了 " + toDelete.length + " 筆");
  
  // 刪完立刻清快取，避免讀到舊資料
  CacheService.getScriptCache().removeAll([
    "hsc:sheet_rows:commission_db",
    "hsc:sheet_rows:payment_db",
    "hsc:sheet_rows:agent_db"
  ]);

  // 3. 清 agent_db 測試代理數值
  ["TAGENT_BRONZE", "TAGENT_SILVER", "TAGENT_GOLD"].forEach(function(agentId) {
    var agent = findRowByField_("agent_db", "agent_id", agentId);
    if (agent) {
      var updated = shallowClone_(agent);
      updated.points_balance = "0";
      updated.points_lifetime = "0";
      updated.points_redeemed = "0";
      updated.total_commission = "0";
      updateRowByName_("agent_db", agent.__rowNum, updated);
    }
  });
  Logger.log("agent_db 清完");

  // 診斷確認
  scriptCache.removeAll([
    "hsc:sheet_rows:commission_db",
    "hsc:sheet_rows:payment_db",
    "hsc:sheet_rows:agent_db"
  ]);
  var check = getSheetRowsByName_("commission_db").filter(function(row) {
    return sanitizeText_(row.payment_id).indexOf("TPMT_") === 0;
  });
  Logger.log("清完後 TPMT_ commission 剩餘筆數=" + check.length);

  Logger.log("=== 重置完成，可以重跑 runCommissionTests ===");
}
function diagnoseCommissionDb() {
  var rows = getSheetRowsByName_("commission_db");
  Logger.log("commission_db 總筆數=" + rows.length);
  rows.forEach(function(r) {
    Logger.log("payment_id=" + r.payment_id + " beneficiary=" + r.beneficiary_agent_id);
  });
}
function diagnosePaymentDb() {
  var rows = getSheetRowsByName_("payment_db");
  rows.forEach(function(r) {
    if (sanitizeText_(r.payment_id).indexOf("TPMT_") === 0) {
      Logger.log("payment_id=" + r.payment_id + " commission_status=" + r.commission_status);
    }
  });
}
function diagnoseCR005() {
  var payment = findRowByField_("payment_db", "payment_id", "TPMT_CR005");
  Logger.log("event_type=" + payment.event_type);
  Logger.log("note=" + payment.note);
  Logger.log("amount=" + payment.amount);
  Logger.log("agent_id=" + payment.agent_id);
  Logger.log("card_id=" + payment.card_id);
  
  var card = findRowByField_("card_db", "id", payment.card_id);
  Logger.log("card.service_agent=" + (card ? card.service_agent : "not found"));
  
  var items = splitPaymentCommissionItems_(payment);
  Logger.log("items count=" + items.length);
  items.forEach(function(item) {
    Logger.log("  item: eventType=" + item.eventType + " targetType=" + item.targetType + " amount=" + item.amount);
    var rule = selectBestCommissionRule_(payment, item);
    Logger.log("  matched rule=" + (rule ? rule.rule_id : "none"));
  });
}
function diagnoseCR005_CR010_CR016() {
  ["TPMT_CR005", "TPMT_CR010", "TPMT_CR016"].forEach(function(pmtId) {
    Logger.log("=== " + pmtId + " ===");
    var payment = findRowByField_("payment_db", "payment_id", pmtId);
    Logger.log("agent_id=" + payment.agent_id + " card_id=" + payment.card_id);
    var card = findRowByField_("card_db", "id", payment.card_id);
    Logger.log("card.service_agent=" + (card ? card.service_agent : "not found"));
    var items = splitPaymentCommissionItems_(payment);
    Logger.log("items count=" + items.length);
    items.forEach(function(item) {
      Logger.log("  eventType=" + item.eventType + " targetType=" + item.targetType + " amount=" + item.amount);
      var rule = selectBestCommissionRule_(payment, item);
      Logger.log("  matched rule=" + (rule ? rule.rule_id : "none"));
      if (!rule) {
        var allRules = getApplicableCommissionRules_(payment, item);
        Logger.log("  applicable rules count=" + allRules.length);
      }
    });
  });
}
function diagnoseCR016() {
  var payment = findRowByField_("payment_db", "payment_id", "TPMT_CR016");
  Logger.log("agent_id=" + payment.agent_id + " card_id=" + payment.card_id);
  var card = findRowByField_("card_db", "id", payment.card_id);
  Logger.log("card.service_agent=" + (card ? card.service_agent : "not found"));
  var items = splitPaymentCommissionItems_(payment);
  items.forEach(function(item) {
    Logger.log("eventType=" + item.eventType + " targetType=" + item.targetType + " amount=" + item.amount);
    var rule = selectBestCommissionRule_(payment, item);
    Logger.log("matched rule=" + (rule ? rule.rule_id : "none"));
    if (!rule) {
      // 逐條規則診斷
      var allRules = getSheetRowsByName_("commission_rules");
      allRules.forEach(function(r) {
        if (r.rule_id !== "CR016") return;
        Logger.log("CR016 rule_type=" + r.rule_type + " target_type=" + r.target_type + " agent_type=" + r.agent_type + " source_type=" + r.source_type);
        var beneficiary = resolveCommissionBeneficiaryAgentId_(r, payment);
        Logger.log("beneficiary=" + beneficiary);
        var agent = beneficiary ? findRowByField_("agent_db", "agent_id", beneficiary) : null;
        Logger.log("agent.agent_type=" + (agent ? agent.agent_type : "not found"));
        Logger.log("isSelfConsumption=" + checkIsSelfConsumption_(payment, beneficiary));
      });
    }
  });
}
function testUpgradeNotify() {
  checkAndNotifyUpgradeEligible_('TAGENT_SILVER');
}
 function testSaveOverflowCtas() {
    saveOverflowCtas_("TW0001", {
      cta_text_4: "測試CTA4",
      cta_link_4: "https://example.com/test4"
    });
    Logger.log("完成，請檢查 card_cta_ext");
  }

// ─── 主附卡管理（v452）────────────────────────────────────────────
function adminSetCardMainCard_(req) {
  requireAdminKey_(req);
  var cardId     = sanitizeText_(req.card_id || req.cardId || "").toUpperCase();
  var mainCardId = sanitizeText_(req.main_card_id || req.mainCardId || "").toUpperCase();
  if (!cardId) throw new Error("Missing card_id");

  // 防止自己設定自己為主卡
  if (mainCardId && mainCardId === cardId) throw new Error("不能把自己設為主卡");

  // 確認附卡存在
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found: " + cardId);

  // 若要設定主卡，確認主卡存在
  if (mainCardId) {
    var mainCard = findRowByField_("card_db", "id", mainCardId);
    if (!mainCard) throw new Error("主卡不存在: " + mainCardId);
    // 防止主卡本身也是附卡（不支援巢狀）
    if (sanitizeText_(mainCard.main_card_id)) throw new Error("主卡不能是另一張卡的附卡");
  }

  var updated = shallowClone_(card);
  updated.main_card_id = mainCardId; // 空字串 = 解除附卡關係
  updated.updated_at   = nowIso_();
  updateRowByName_("card_db", card.__rowNum, updated);

  // 清快取
  invalidateCardPublicCache_(cardId);

  return {
    ok: true,
    card_id:      cardId,
    main_card_id: mainCardId,
    action:       mainCardId ? "attached" : "detached"
  };
}

function adminGetAttachedCards_(req) {
  requireAdminKey_(req);
  var mainCardId = sanitizeText_(req.main_card_id || req.mainCardId || req.card_id || req.cardId || "").toUpperCase();
  if (!mainCardId) throw new Error("Missing main_card_id");

  var rows = getSheetRowsByName_("card_db").filter(function(row) {
    return sanitizeText_(row.main_card_id).toUpperCase() === mainCardId;
  });

  var list = rows.map(function(row) {
    return {
      card_id:      getRowCardId_(row),
      name:         sanitizeText_(row.name),
      title:        sanitizeText_(row.title),
      unit:         sanitizeText_(row.unit),
      status:       sanitizeText_(row.status),
      plan:         sanitizeText_(row.plan),
      main_card_id: sanitizeText_(row.main_card_id)
    };
  });

  return { ok: true, main_card_id: mainCardId, count: list.length, cards: list };
}

// ─── 測試代理修復工具（v451）───────────────────────────────────────
function diagnoseTestAgentTypes() {
  ["TAGENT_BRONZE", "TAGENT_SILVER", "TAGENT_GOLD", "TAGENT_CUST"].forEach(function(id) {
    var row = findRowByField_("agent_db", "agent_id", id);
    if (!row) {
      Logger.log(id + " → 不存在");
    } else {
      Logger.log(id + " → agent_type=" + row.agent_type + "  member_tier=" + row.member_tier + "  points=" + row.points_balance);
    }
  });
}

function fixTestAgentTypes() {
  var targets = [
    { id: "TAGENT_BRONZE", agent_type: "customer",  member_tier: "bronze"  },
    { id: "TAGENT_SILVER", agent_type: "referral",  member_tier: "silver"  },
    { id: "TAGENT_GOLD",   agent_type: "partner",   member_tier: "gold"    },
    { id: "TAGENT_CUST",   agent_type: "customer",  member_tier: "bronze"  }
  ];

  targets.forEach(function(t) {
    var row = findRowByField_("agent_db", "agent_id", t.id);
    if (!row) {
      Logger.log(t.id + " → 不存在，略過");
      return;
    }
    var updated = shallowClone_(row);
    updated.agent_type  = t.agent_type;
    updated.member_tier = t.member_tier;
    updated.updated_at  = nowIso_();
    updateRowByName_("agent_db", row.__rowNum, updated);
    Logger.log(t.id + " → 已修正為 agent_type=" + t.agent_type + "  member_tier=" + t.member_tier);
  });

  // 清快取，確保後續讀取不走舊資料
  CacheService.getScriptCache().removeAll(["hsc:sheet_rows:agent_db"]);
  Logger.log("=== fixTestAgentTypes 完成，快取已清除 ===");
}

// ─── 補開無限更新（v460）────────────────────────────────────────────
function adminGrantUnlimitedUpdate_(req) {
  requireAdminKey_(req);
  var cardId = normalizeCardId_(req.card_id || req.cardId || "");
  if (!cardId) throw new Error("card_id 為必填");

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("找不到卡片：" + cardId);

  var expiresAt = sanitizeText_(card.expires_at);
  if (!expiresAt) throw new Error("卡片缺少 expires_at，無法設定無限更新到期日");

  var updated = shallowClone_(card);
  updated.update_unlimited_enabled   = "TRUE";
  updated.update_unlimited_expires_at = expiresAt;
  updated.updated_at = nowIso_();

  updateRowByName_("card_db", card.__rowNum, updated);
  invalidateCardPublicCache_(cardId);
  clearSheetRowCache_("card_db");

  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminGrantUnlimitedUpdate",
    card_id: cardId,
    update_unlimited_enabled: true,
    update_unlimited_expires_at: expiresAt
  };
}

// ─── 修復所有卡片的 cta_limit / photo_limit（v461）───────────────────
// 掃描 card_cta_ext 和 card_photo_ext，把偏低的 limit 補正到實際數量
function adminRepairCardLimits_(req) {
  requireAdminKey_(req);

  var ctaRows = [];
  var photoRows = [];
  try { ctaRows   = getSheetRowsByName_("card_cta_ext"); }   catch(e) {}
  try { photoRows = getSheetRowsByName_("card_photo_ext"); } catch(e) {}

  // 統計每張卡的實際最大 CTA seq 和 photo seq
  var ctaMaxMap   = {};
  var photoMaxMap = {};
  ctaRows.forEach(function(row) {
    var id  = sanitizeText_(row.id || "").toUpperCase();
    var seq = Number(row.seq || 0);
    if (id && seq > (ctaMaxMap[id] || 0)) ctaMaxMap[id] = seq;
  });
  photoRows.forEach(function(row) {
    var id  = sanitizeText_(row.id || "").toUpperCase();
    var seq = Number(row.seq || 0);
    if (id && seq > (photoMaxMap[id] || 0)) photoMaxMap[id] = seq;
  });

  var cards = getSheetRowsByName_("card_db");
  var fixed = 0;
  var nowStr = nowIso_();

  cards.forEach(function(card) {
    var id = sanitizeText_(card.id || "").toUpperCase();
    if (!id) return;
    var changed = false;
    var updated = shallowClone_(card);

    var actualCta   = ctaMaxMap[id]   || 0;
    var actualPhoto = photoMaxMap[id] || 0;

    if (actualCta > Number(card.cta_limit || 0)) {
      updated.cta_limit = String(actualCta);
      changed = true;
    }
    if (actualPhoto > Number(card.photo_limit || 0)) {
      updated.photo_limit = String(actualPhoto);
      changed = true;
    }
    if (changed) {
      updated.updated_at = nowStr;
      updateRowByName_("card_db", card.__rowNum, updated);
      invalidateCardPublicCache_(id);
      fixed++;
    }
  });

  clearSheetRowCache_("card_db");
  return {
    ok: true,
    version: HSC_VERSION,
    action: "adminRepairCardLimits",
    fixed_count: fixed,
    message: "已修復 " + fixed + " 張卡片的 cta_limit / photo_limit"
  };
}

// ─── 查詢目前 GAS 排程狀態（v463）─────────────────────────────────
function getTriggerStatus_(req) {
  requireAdminKey_(req);
  var triggers = ScriptApp.getProjectTriggers();
  var list = triggers.map(function(t) {
    return {
      handler:    t.getHandlerFunction(),
      event_type: String(t.getEventType()),
      trigger_id: t.getUniqueId()
    };
  });
  var hasKeepWarm = list.some(function(t) { return t.handler === "keepWarmPing_"; });
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getTriggerStatus",
    keep_warm_active: hasKeepWarm,
    total: list.length,
    triggers: list
  };
}