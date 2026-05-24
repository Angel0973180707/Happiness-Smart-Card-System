/**
 * HSC GAS 瀏覽次數統計 v438
 *
 * 使用 view_stats_db 表（每日彙整），不寫 tracking_log
 * → 每張卡每天只有一筆，不會爆表
 *
 * view_stats_db 表頭：
 *   id    view_date    count    updated_at
 *
 * 整合方式：
 *   在 getCardPublicShell_ 的 cache.put 之後、return 之前加：
 *     try { recordCardView_(targetCardId); } catch(_e) {}
 *
 *   doPost switch 加：
 *     case "getCardViewStats":     result = getCardViewStats_(req);     break;
 *     case "adminGetAllViewStats": result = adminGetAllViewStats_(req); break;
 */

// ─────────────────────────────────────────
//  寫入：每日累加（不新增列，只更新 count）
// ─────────────────────────────────────────
function recordCardView_(cardId) {
  if (!cardId) return;
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("view_stats_db");

    // 自動建立（第一次使用時）
    if (!sheet) {
      sheet = ss.insertSheet("view_stats_db");
      sheet.appendRow(["id", "view_date", "count", "updated_at"]);
    }

    var today = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
    var data  = sheet.getDataRange().getValues();
    var h     = data[0].map(function(x){ return String(x).trim(); });
    var idCol      = h.indexOf("id");
    var dateCol    = h.indexOf("view_date");
    var countCol   = h.indexOf("count");
    var updatedCol = h.indexOf("updated_at");
    var now        = new Date().toISOString();

    // 找今天這張卡的那一列 → 直接 +1
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][idCol])   === String(cardId) &&
          String(data[r][dateCol]) === today) {
        var newCount = (Number(data[r][countCol]) || 0) + 1;
        sheet.getRange(r + 1, countCol + 1).setValue(newCount);
        if (updatedCol >= 0) {
          sheet.getRange(r + 1, updatedCol + 1).setValue(now);
        }
        return; // 找到就結束，不新增
      }
    }

    // 今天還沒有這張卡的記錄 → 新增一列
    var newRow = new Array(h.length).fill("");
    if (idCol      >= 0) newRow[idCol]      = cardId;
    if (dateCol    >= 0) newRow[dateCol]    = today;
    if (countCol   >= 0) newRow[countCol]   = 1;
    if (updatedCol >= 0) newRow[updatedCol] = now;
    sheet.appendRow(newRow);

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

  var card = findRowByField_("card_db", "id", cardId);
  if (!card) throw new Error("Card not found");

  // 驗證 token（有帶才驗）
  var token = sanitizeText_(req.update_token || req.token || "");
  if (token && sanitizeText_(card.update_token) !== token) {
    throw new Error("Token mismatch");
  }

  return {
    ok: true,
    version: HSC_VERSION,
    action: "getCardViewStats",
    card_id: cardId,
    stats: _queryViewStats_(cardId)
  };
}

// ─────────────────────────────────────────
//  查詢：後台用（需 admin_key）
// ─────────────────────────────────────────
function adminGetAllViewStats_(req) {
  var adminKey = sanitizeText_(req.admin_key || req.adminKey || "");
  if (!validateAdminKey_(adminKey)) throw new Error("Admin Key 無效");

  var cardId = sanitizeText_(req.card_id || "");

  // 查單張
  if (cardId) {
    return {
      ok: true,
      version: HSC_VERSION,
      action: "adminGetAllViewStats",
      card_id: cardId,
      stats: _queryViewStats_(cardId)
    };
  }

  // 查所有卡的總瀏覽數
  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("view_stats_db");
  if (!sheet) return { ok: true, action: "adminGetAllViewStats", summary: [] };

  var data    = sheet.getDataRange().getValues();
  var h       = data[0].map(function(x){ return String(x).trim(); });
  var idCol   = h.indexOf("id");
  var countCol= h.indexOf("count");

  var totals = {};
  for (var r = 1; r < data.length; r++) {
    var id  = String(data[r][idCol]   || "").trim();
    var cnt = Number(data[r][countCol]) || 0;
    if (!id) continue;
    totals[id] = (totals[id] || 0) + cnt;
  }

  var summary = Object.keys(totals).map(function(id) {
    return { card_id: id, total_views: totals[id] };
  });
  summary.sort(function(a, b) { return b.total_views - a.total_views; });

  return { ok: true, action: "adminGetAllViewStats", summary: summary };
}

// ─────────────────────────────────────────
//  內部：計算單張卡統計
// ─────────────────────────────────────────
function _queryViewStats_(cardId) {
  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("view_stats_db");
  if (!sheet) return { total: 0, today: 0, last7days: 0, daily: [] };

  var data    = sheet.getDataRange().getValues();
  var h       = data[0].map(function(x){ return String(x).trim(); });
  var idCol   = h.indexOf("id");
  var dateCol = h.indexOf("view_date");
  var countCol= h.indexOf("count");

  var today    = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
  var sevenAgo = Utilities.formatDate(
    new Date(Date.now() - 6 * 24 * 3600 * 1000), "Asia/Taipei", "yyyy-MM-dd"
  );

  var total = 0, todayCount = 0, last7 = 0;
  var daily = [];

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol]).trim() !== String(cardId).trim()) continue;
    var date  = String(data[r][dateCol]  || "").trim();
    var count = Number(data[r][countCol]) || 0;
    total += count;
    if (date === today)    todayCount = count;
    if (date >= sevenAgo) last7     += count;
    daily.push({ date: date, count: count });
  }

  daily.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

  return {
    total:     total,
    today:     todayCount,
    last7days: last7,
    daily:     daily.slice(0, 30)   // 最近 30 天
  };
}

/*
 * ── 需要做的事 ──
 *
 * 1. Google Sheets 新增工作表「view_stats_db」，表頭：
 *    id    view_date    count    updated_at
 *
 * 2. getCardPublicShell_ 的 cache.put(...) 之後加：
 *    try { recordCardView_(targetCardId); } catch(_e) {}
 *
 * 3. doPost switch 加：
 *    case "getCardViewStats":     result = getCardViewStats_(req);     break;
 *    case "adminGetAllViewStats": result = adminGetAllViewStats_(req); break;
 *
 * 4. 重新部署 v438
 */
