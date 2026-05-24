/**
 * HSC GAS 瀏覽次數統計 v438
 *
 * 使用現有 tracking_log 表記錄瀏覽，action_type = "card_view"
 *
 * 整合方式：
 *   在 getCardPublicShell_ 的 cache.put 之後、return 之前加：
 *     try { recordCardView_(targetCardId, req); } catch(_e) {}
 *
 *   doPost switch 加：
 *     case "getCardViewStats":     result = getCardViewStats_(req);     break;
 *     case "adminGetAllViewStats": result = adminGetAllViewStats_(req); break;
 */

// ─────────────────────────────────────────
//  寫入：記錄一次瀏覽到 tracking_log
// ─────────────────────────────────────────
function recordCardView_(cardId, req) {
  if (!cardId) return;
  req = req || {};
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("tracking_log");
    if (!sheet) {
      console.warn("[viewStats] tracking_log 不存在，略過");
      return;
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
                       .map(function(h){ return String(h).trim(); });

    var now = new Date().toISOString();
    var row = new Array(headers.length).fill("");

    function set(field, val) {
      var i = headers.indexOf(field);
      if (i >= 0) row[i] = val;
    }

    set("tracking_logid", Utilities.getUuid());
    set("created_at",     now);
    set("card_id",        cardId);
    set("action_type",    "card_view");
    set("device",         sanitizeText_(req.device || req.ua || ""));
    set("referrer",       sanitizeText_(req.ref    || req.referrer || ""));
    set("share_source",   sanitizeText_(req.src    || ""));
    set("tenant",         sanitizeText_(req.tenant || ""));
    set("is_test",        "FALSE");

    sheet.appendRow(row);

  } catch(e) {
    console.warn("[viewStats] recordCardView_ 失敗:", e.message);
  }
}

// ─────────────────────────────────────────
//  查詢：單張卡的瀏覽統計（交付卡用）
// ─────────────────────────────────────────
function getCardViewStats_(req) {
  var cardId = sanitizeText_(req.card_id || req.cardId || "");
  if (!cardId) throw new Error("card_id 為必填");

  // 簡單驗證：update_token 或 card_id 是否存在
  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");
  var token = sanitizeText_(req.update_token || req.token || "");
  if (token && sanitizeText_(card.update_token) !== token) {
    throw new Error("Token mismatch");
  }

  var stats = _queryViewStats_(cardId);
  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardViewStats",
    card_id: cardId,
    stats: stats
  };
}

// ─────────────────────────────────────────
//  查詢：後台用（需 admin_key）
// ─────────────────────────────────────────
function adminGetAllViewStats_(req) {
  var adminKey = sanitizeText_(req.admin_key || req.adminKey || "");
  if (!validateAdminKey_(adminKey)) throw new Error("Admin Key 無效");

  var cardId = sanitizeText_(req.card_id || "");
  if (cardId) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminGetAllViewStats",
      card_id: cardId,
      stats: _queryViewStats_(cardId)
    };
  }

  // 所有卡的總覽
  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("tracking_log");
  if (!sheet) return { ok: true, action: "adminGetAllViewStats", summary: [] };

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return String(h).trim(); });
  var cardIdCol    = headers.indexOf("card_id");
  var actionCol    = headers.indexOf("action_type");
  var isTestCol    = headers.indexOf("is_test");

  var totals = {};
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][actionCol] || "") !== "card_view") continue;
    if (String(data[r][isTestCol] || "").toUpperCase() === "TRUE") continue;
    var id = String(data[r][cardIdCol] || "").trim();
    if (!id) continue;
    totals[id] = (totals[id] || 0) + 1;
  }

  var summary = Object.keys(totals).map(function(id) {
    return { card_id: id, total_views: totals[id] };
  });
  summary.sort(function(a, b) { return b.total_views - a.total_views; });

  return { ok: true, action: "adminGetAllViewStats", summary: summary };
}

// ─────────────────────────────────────────
//  內部：計算單張卡統計數字
// ─────────────────────────────────────────
function _queryViewStats_(cardId) {
  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("tracking_log");
  if (!sheet) return { total: 0, today: 0, last7days: 0, daily: [] };

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return String(h).trim(); });
  var cardIdCol  = headers.indexOf("card_id");
  var actionCol  = headers.indexOf("action_type");
  var createdCol = headers.indexOf("created_at");
  var isTestCol  = headers.indexOf("is_test");

  var today    = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
  var sevenAgo = Utilities.formatDate(
    new Date(Date.now() - 6 * 24 * 3600 * 1000), "Asia/Taipei", "yyyy-MM-dd"
  );

  var total = 0, todayCount = 0, last7 = 0;
  var dailyMap = {};

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][actionCol]  || "") !== "card_view") continue;
    if (String(data[r][cardIdCol]  || "").trim() !== String(cardId).trim()) continue;
    if (String(data[r][isTestCol]  || "").toUpperCase() === "TRUE") continue;

    total++;

    var rawDate = String(data[r][createdCol] || "").substring(0, 10); // "2026-05-24"
    if (rawDate === today)    todayCount++;
    if (rawDate >= sevenAgo) last7++;
    dailyMap[rawDate] = (dailyMap[rawDate] || 0) + 1;
  }

  var daily = Object.keys(dailyMap).map(function(d) {
    return { date: d, count: dailyMap[d] };
  });
  daily.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

  return {
    total:     total,
    today:     todayCount,
    last7days: last7,
    daily:     daily.slice(0, 30)
  };
}

/*
 * ── getCardPublicShell_ 的 cache.put 之後加 ──
 *
 *   try { recordCardView_(targetCardId, req); } catch(_e) {}
 *
 * ── doPost switch-case 加這兩段 ──
 *
 *   case "getCardViewStats":     result = getCardViewStats_(req);     break;
 *   case "adminGetAllViewStats": result = adminGetAllViewStats_(req); break;
 */
