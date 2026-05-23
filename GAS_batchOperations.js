/**
 * HSC 批次操作 GAS 函式 v1.0
 * 包含：批次交付查詢、批次更新、批次續約
 *
 * 步驟：
 * 1. GAS 新增檔案 BatchOperations.gs，貼入全部內容
 * 2. doPost 的 switch 加入以下三個 case：
 *
 *   case "adminGetCardsByReferrer": result = adminGetCardsByReferrer_(req); break;
 *   case "adminBatchUpdateCards":   result = adminBatchUpdateCards_(req);   break;
 *   case "adminBatchRenewCards":    result = adminBatchRenewCards_(req);    break;
 *
 * 3. 重新部署（新版本）
 */

// ─────────────────────────────────────────
// 📦 批次交付：查詢某負責人的所有員工卡
// ─────────────────────────────────────────
function adminGetCardsByReferrer_(params) {
  var adminKey = params.admin_key || params.adminKey || "";
  if (!validateAdminKey_(adminKey)) throw new Error("Admin Key 無效");

  var referrerId = String(params.referrer_id || "").trim().toUpperCase();
  if (!referrerId) throw new Error("referrer_id 為必填");

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("card_db");
  if (!sheet) throw new Error("找不到 card_db");

  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });

  var idIdx       = headers.indexOf("id");
  var referrerIdx = headers.indexOf("referrer");
  var nameIdx     = headers.indexOf("name");
  var titleIdx    = headers.indexOf("title");
  var companyIdx  = headers.indexOf("company");
  var expiresIdx  = headers.indexOf("expires_at");
  var statusIdx   = headers.indexOf("status");

  var cards = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[referrerIdx] || "").trim().toUpperCase() !== referrerId) continue;
    if (String(row[statusIdx] || "").trim().toLowerCase() === "deleted") continue;
    cards.push({
      id:         String(row[idIdx]       || ""),
      name:       String(row[nameIdx]     || ""),
      title:      String(row[titleIdx]    || ""),
      company:    String(row[companyIdx]  || ""),
      expires_at: String(row[expiresIdx]  || ""),
    });
  }

  return { ok: true, cards: cards };
}

// ─────────────────────────────────────────
// ✏️ 批次更新名片資料
// ─────────────────────────────────────────
function adminBatchUpdateCards_(params) {
  var adminKey = params.admin_key || params.adminKey || "";
  if (!validateAdminKey_(adminKey)) throw new Error("Admin Key 無效");

  var cards = params.cards;
  if (!Array.isArray(cards) || !cards.length) throw new Error("cards 為空");

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("card_db");
  if (!sheet) throw new Error("找不到 card_db");

  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });

  // 可更新的欄位清單
  var UPDATABLE = ["name","title","company","phone","email","line_id","avatar_url","color","style","paper"];
  var colIdx = {};
  headers.forEach(function(h, i) { colIdx[h] = i; });

  var results = [];

  cards.forEach(function(card) {
    var cardId = String(card.card_id || "").trim().toUpperCase();
    if (!cardId) { results.push({ card_id: cardId, ok: false, error: "card_id 為空" }); return; }

    // 找對應列
    var rowIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colIdx["id"]] || "").trim().toUpperCase() === cardId) {
        rowIdx = i; break;
      }
    }
    if (rowIdx === -1) { results.push({ card_id: cardId, ok: false, error: "找不到此卡號" }); return; }

    try {
      UPDATABLE.forEach(function(field) {
        var val = String(card[field] || "").trim();
        if (!val) return; // 空值不更新
        var col = colIdx[field];
        if (col === undefined) return;
        sheet.getRange(rowIdx + 1, col + 1).setValue(val);
        data[rowIdx][col] = val; // 更新本地快取
      });
      // 清快取
      try { CacheService.getScriptCache().remove("card_" + cardId); } catch(_) {}
      results.push({ card_id: cardId, name: card.name || data[rowIdx][colIdx["name"]], ok: true });
    } catch(err) {
      results.push({ card_id: cardId, ok: false, error: err.message });
    }
  });

  return { ok: true, results: results };
}

// ─────────────────────────────────────────
// 🔄 批次續約（延長 365 天）
// ─────────────────────────────────────────
function adminBatchRenewCards_(params) {
  var adminKey = params.admin_key || params.adminKey || "";
  if (!validateAdminKey_(adminKey)) throw new Error("Admin Key 無效");

  var cards = params.cards;
  if (!Array.isArray(cards) || !cards.length) throw new Error("cards 為空");

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var cardSheet = ss.getSheetByName("card_db");
  var paymentSheet = ss.getSheetByName("payment_db");
  if (!cardSheet) throw new Error("找不到 card_db");

  var data = cardSheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var colIdx = {};
  headers.forEach(function(h, i) { colIdx[h] = i; });

  // payment_db 欄位
  var payHeaders = paymentSheet ? paymentSheet.getRange(1,1,1,paymentSheet.getLastColumn()).getValues()[0].map(function(h){return String(h).trim();}) : [];
  var payColIdx = {};
  payHeaders.forEach(function(h, i) { payColIdx[h] = i; });

  var results = [];
  var now = new Date();

  cards.forEach(function(card) {
    var cardId = String(card.card_id || "").trim().toUpperCase();
    if (!cardId) { results.push({ card_id: cardId, ok: false, error: "card_id 為空" }); return; }

    var rowIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colIdx["id"]] || "").trim().toUpperCase() === cardId) {
        rowIdx = i; break;
      }
    }
    if (rowIdx === -1) { results.push({ card_id: cardId, ok: false, error: "找不到此卡號" }); return; }

    try {
      // 計算新到期日（從現有到期日 or 今天，取較大值，再加 365 天）
      var currentExpiry = data[rowIdx][colIdx["expires_at"]];
      var baseDate = currentExpiry ? new Date(currentExpiry) : now;
      if (baseDate < now) baseDate = now;
      var newExpiry = new Date(baseDate.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate());
      var newExpiryStr = Utilities.formatDate(newExpiry, "Asia/Taipei", "yyyy-MM-dd");

      // 更新 card_db
      cardSheet.getRange(rowIdx + 1, colIdx["expires_at"] + 1).setValue(newExpiryStr);
      if (colIdx["status"] !== undefined) cardSheet.getRange(rowIdx + 1, colIdx["status"] + 1).setValue("active");

      // 寫入 payment_db 記錄（如果有 payment_db）
      if (paymentSheet && payHeaders.length) {
        var payRow = new Array(payHeaders.length).fill("");
        function setPay(f, v) { if (payColIdx[f] !== undefined) payRow[payColIdx[f]] = v; }
        setPay("payment_id",  "PAY_" + cardId + "_" + now.getTime());
        setPay("card_id",     cardId);
        setPay("amount",      card.price || 0);
        setPay("type",        "renewal");
        setPay("status",      "paid");
        setPay("source",      "admin_batch");
        setPay("created_at",  now.toISOString());
        setPay("confirmed_at",now.toISOString());
        setPay("new_expires_at", newExpiryStr);
        paymentSheet.appendRow(payRow);
      }

      // 清快取
      try { CacheService.getScriptCache().remove("card_" + cardId); } catch(_) {}

      var cardName = String(data[rowIdx][colIdx["name"]] || "");
      results.push({ card_id: cardId, name: cardName, ok: true, new_expires_at: newExpiryStr });
    } catch(err) {
      results.push({ card_id: cardId, ok: false, error: err.message });
    }
  });

  return { ok: true, results: results };
}
