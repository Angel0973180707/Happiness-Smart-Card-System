/**
 * HSC 批次主檔雲端儲存 v1.0
 *
 * batch_master_db 表頭：
 *   batch_id  label  card_count  data_json  saved_at
 *
 * doPost switch 加：
 *   case "adminSaveBatchMaster":   result = adminSaveBatchMaster_(req);   break;
 *   case "adminListBatchMasters":  result = adminListBatchMasters_(req);  break;
 *   case "adminGetBatchMaster":    result = adminGetBatchMaster_(req);    break;
 *   case "adminDeleteBatchMaster": result = adminDeleteBatchMaster_(req); break;
 */

// ─────────────────────────────────────────
//  儲存主檔到雲端
// ─────────────────────────────────────────
function adminSaveBatchMaster_(params) {
  requireAdminKey_(params);

  var label = sanitizeText_(params.label) || ("批次-" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd"));
  var cards = params.cards;
  if (!Array.isArray(cards) || !cards.length) throw new Error("cards 為空");

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("batch_master_db");
  if (!sheet) {
    sheet = ss.insertSheet("batch_master_db");
    sheet.appendRow(["batch_id","label","card_count","data_json","saved_at"]);
  }

  var batchId  = "BM" + new Date().getTime();
  var dataJson = JSON.stringify(cards);
  var now      = new Date().toISOString();

  sheet.appendRow([batchId, label, cards.length, dataJson, now]);

  try { CacheService.getScriptCache().remove("hsc:sheet_rows:batch_master_db"); } catch(_) {}

  return { ok: true, batch_id: batchId, label: label, card_count: cards.length };
}

// ─────────────────────────────────────────
//  列出所有已儲存的主檔（最新在前）
// ─────────────────────────────────────────
function adminListBatchMasters_(params) {
  requireAdminKey_(params);

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("batch_master_db");
  if (!sheet) return { ok: true, batches: [] };

  var data = sheet.getDataRange().getValues();
  var h    = data[0].map(function(x) { return String(x).trim(); });
  var iId    = h.indexOf("batch_id");
  var iLabel = h.indexOf("label");
  var iCount = h.indexOf("card_count");
  var iSaved = h.indexOf("saved_at");

  var batches = [];
  for (var r = 1; r < data.length; r++) {
    var bid = String(data[r][iId] || "").trim();
    if (!bid) continue;
    batches.push({
      batch_id:   bid,
      label:      String(data[r][iLabel] || ""),
      card_count: Number(data[r][iCount]) || 0,
      saved_at:   String(data[r][iSaved] || "")
    });
  }
  batches.reverse();
  return { ok: true, batches: batches };
}

// ─────────────────────────────────────────
//  讀取單筆主檔
// ─────────────────────────────────────────
function adminGetBatchMaster_(params) {
  requireAdminKey_(params);

  var batchId = sanitizeText_(params.batch_id);
  if (!batchId) throw new Error("batch_id 為必填");

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("batch_master_db");
  if (!sheet) throw new Error("找不到 batch_master_db");

  var data  = sheet.getDataRange().getValues();
  var h     = data[0].map(function(x) { return String(x).trim(); });
  var iId   = h.indexOf("batch_id");
  var iJson = h.indexOf("data_json");
  var iLabel= h.indexOf("label");

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iId]).trim() !== batchId) continue;
    var cards = [];
    try { cards = JSON.parse(String(data[r][iJson] || "[]")); } catch(_) {}
    return { ok: true, batch_id: batchId, label: String(data[r][iLabel] || ""), cards: cards };
  }
  throw new Error("找不到 batch_id: " + batchId);
}

// ─────────────────────────────────────────
//  刪除主檔
// ─────────────────────────────────────────
function adminDeleteBatchMaster_(params) {
  requireAdminKey_(params);

  var batchId = sanitizeText_(params.batch_id);
  if (!batchId) throw new Error("batch_id 為必填");

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("batch_master_db");
  if (!sheet) throw new Error("找不到 batch_master_db");

  var data = sheet.getDataRange().getValues();
  var h    = data[0].map(function(x) { return String(x).trim(); });
  var iId  = h.indexOf("batch_id");

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iId]).trim() === batchId) {
      sheet.deleteRow(r + 1);
      try { CacheService.getScriptCache().remove("hsc:sheet_rows:batch_master_db"); } catch(_) {}
      return { ok: true, deleted: batchId };
    }
  }
  throw new Error("找不到 batch_id: " + batchId);
}
