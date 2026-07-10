/**
 * HSC 銀行對帳匯入 GAS 函式 v1.0
 *
 * 使用方式：
 * 1. GAS 新增檔案 BankImport.gs，貼入全部內容
 * 2. doPost 的 switch 加入以下兩個 case：
 *
 *   case "adminBatchBankMatch":   result = adminBatchBankMatch_(req);   break;
 *   case "adminConfirmBankImport": result = adminConfirmBankImport_(req); break;
 *
 * 3. 重新部署（新版本）
 */

// ─────────────────────────────────────────
// 🔍 Step 1：比對銀行明細（只查詢，不寫入）
// ─────────────────────────────────────────
/**
 * 傳入銀行轉帳記錄陣列，查詢 payment_inbox_db 中客戶已填的確認單，
 * 回傳每筆的比對結果（不做任何寫入）。
 *
 * params.entries = [{ date, amount, last5, note }]
 */
function adminBatchBankMatch_(params) {
  requireAdminKey_(params);

  var entries = params.entries;
  if (!Array.isArray(entries) || !entries.length) throw new Error("entries 為空");

  var ss     = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var inbox  = ss.getSheetByName("payment_inbox_db");
  var cardSh = ss.getSheetByName("card_db");
  if (!inbox) throw new Error("找不到 payment_inbox_db");

  // 讀取 payment_inbox_db
  var inboxData    = inbox.getDataRange().getValues();
  var inboxHeaders = inboxData[0].map(function(h) { return String(h).trim(); });
  var iIdx = {};
  inboxHeaders.forEach(function(h, i) { iIdx[h] = i; });

  // 讀取 card_db（取姓名用）
  var cardData    = cardSh ? cardSh.getDataRange().getValues() : [];
  var cardHeaders = cardData.length ? cardData[0].map(function(h) { return String(h).trim(); }) : [];
  var cIdx = {};
  cardHeaders.forEach(function(h, i) { cIdx[h] = i; });

  // 建立快速查找：card_id → name
  var cardNames = {};
  for (var ci = 1; ci < cardData.length; ci++) {
    var cid = String(cardData[ci][cIdx["id"]] || "").trim().toUpperCase();
    if (cid) cardNames[cid] = String(cardData[ci][cIdx["name"]] || "");
  }

  // 找出客戶已填、尚未比對成功的確認單
  // source = customer，status 不是 matched / confirmed / paid
  var customerEntries = [];
  for (var ii = 1; ii < inboxData.length; ii++) {
    var row = inboxData[ii];
    // 跳過空列
    if (!row.some(function(c) { return String(c || "").trim(); })) continue;

    var src    = String(row[iIdx["source"]] || "").trim().toLowerCase();
    var status = String(row[iIdx["status"]] || "").trim().toLowerCase();
    // 只要 source=customer 且尚未比對成功
    if (src !== "customer") continue;
    if (["matched", "confirmed", "paid"].indexOf(status) >= 0) continue;

    customerEntries.push({
      rowIdx:  ii,
      card_id: String(row[iIdx["card_id"]] || "").trim().toUpperCase(),
      amount:  Number(row[iIdx["amount"]]  || 0),
      last5:   String(row[iIdx["last5"]]   || "").trim(),
      status:  status
    });
  }

  // 比對每筆銀行記錄
  var results = [];
  entries.forEach(function(entry) {
    var bankAmt  = Number(entry.amount  || 0);
    var bankLast = String(entry.last5   || "").trim();
    var bankDate = String(entry.date    || "").trim();
    var bankNote = String(entry.note    || "").trim();

    if (!bankAmt || !bankLast) {
      results.push({ date: bankDate, amount: bankAmt, last5: bankLast, note: bankNote,
                     matched: false, reason: "金額或末五碼為空" });
      return;
    }

    // 找 amount + last5 都匹配的客戶確認單
    var matched = customerEntries.filter(function(ce) {
      return ce.amount === bankAmt && ce.last5 === bankLast;
    });

    if (!matched.length) {
      results.push({ date: bankDate, amount: bankAmt, last5: bankLast, note: bankNote,
                     matched: false, reason: "找不到對應確認單" });
    } else if (matched.length === 1) {
      var m = matched[0];
      results.push({ date: bankDate, amount: bankAmt, last5: bankLast, note: bankNote,
                     matched: true, card_id: m.card_id,
                     name: cardNames[m.card_id] || "",
                     customer_status: m.status });
    } else {
      // 多筆符合：全部列出，讓管理員選
      results.push({ date: bankDate, amount: bankAmt, last5: bankLast, note: bankNote,
                     matched: "multiple",
                     candidates: matched.map(function(m) {
                       return { card_id: m.card_id, name: cardNames[m.card_id] || "" };
                     }) });
    }
  });

  return { ok: true, results: results,
           summary: { total: results.length,
                      matched:   results.filter(function(r){ return r.matched === true; }).length,
                      multiple:  results.filter(function(r){ return r.matched === "multiple"; }).length,
                      unmatched: results.filter(function(r){ return r.matched === false; }).length } };
}

// ─────────────────────────────────────────
// ✅ Step 2：確認匯入（寫入 + 觸發 autoMatch）
// ─────────────────────────────────────────
/**
 * 傳入已確認的比對結果，寫入 payment_inbox_db（source: bank_import），
 * 再觸發 autoMatchPayments_。
 *
 * params.entries = [{ date, amount, last5, note, card_id }]
 */
function adminConfirmBankImport_(params) {
  requireAdminKey_(params);

  var entries = params.entries;
  if (!Array.isArray(entries) || !entries.length) throw new Error("entries 為空");

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var inbox = ss.getSheetByName("payment_inbox_db");
  if (!inbox) throw new Error("找不到 payment_inbox_db");

  // 讀取欄位結構
  var headers = inbox.getRange(1, 1, 1, inbox.getLastColumn()).getValues()[0]
    .map(function(h) { return String(h).trim(); });
  var idx = {};
  headers.forEach(function(h, i) { idx[h] = i; });

  var now     = new Date();
  var nowStr  = now.toISOString();
  var written = [];
  var rowsToAppend = []; // 🚀 二維陣列，迴圈中先 push，迴圈結束後一次性 setValues 寫入

  entries.forEach(function(entry, entryIndex) {
    var cardId = String(entry.card_id || "").trim().toUpperCase();
    var amt    = Number(entry.amount  || 0);
    var last5  = String(entry.last5   || "").trim();
    if (!cardId || !amt || !last5) { written.push({ card_id: cardId, ok: false, error: "資料不完整" }); return; }

    try {
      var row = new Array(headers.length).fill("");
      function set(f, v) { if (idx[f] !== undefined) row[idx[f]] = v; }

      // 產生唯一 id（加上批次內序號，避免同一批同卡號多筆匯入時 id 撞號）
      var inboxId = "BANK_" + cardId + "_" + now.getTime() + "_" + entryIndex;
      set("id",         inboxId);
      set("card_id",    cardId);
      set("amount",     amt);
      set("last5",      last5);
      set("source",     "bank_import");
      set("status",     "pending");
      set("note",       String(entry.note || "").trim() || "銀行對帳匯入");
      set("created_at", nowStr);
      // 有些欄位名稱可能不同，保險起見也嘗試常見別名
      set("payment_inbox_id", inboxId);
      set("transaction_date", String(entry.date || "").trim());

      rowsToAppend.push(row);
      written.push({ card_id: cardId, ok: true });
    } catch(err) {
      written.push({ card_id: cardId, ok: false, error: err.message });
    }
  });

  // 🔒 鎖定：保護「計算寫入位置 + 批次寫入」這段，避免併發匯入時互相蓋掉彼此的資料列
  if (rowsToAppend.length) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (lockErr) {
      throw new Error("系統忙碌，無法完成銀行對帳匯入，請稍後再試。");
    }

    try {
      // 一次性批次寫入：計算目前最後一列之後的起始位置，寫入整個二維陣列
      var startRow = inbox.getLastRow() + 1;
      inbox.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    } finally {
      try {
        lock.releaseLock();
      } catch (releaseErr) {
        Logger.log("adminConfirmBankImport_ lock release failed: " + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
      }
    }
  }

  // 觸發自動比對
  var matchResult = { ok: false, message: "autoMatch 未執行" };
  try {
    matchResult = autoMatchPayments_({});
  } catch(e) {
    matchResult = { ok: false, message: e.message };
  }

  var successCount = written.filter(function(r) { return r.ok; }).length;

  return {
    ok: true,
    written: successCount,
    results: written,
    auto_match: matchResult
  };
}

/*
 * ── doPost 的 switch-case 要加這段 ──
 *
 *   case "adminBatchBankMatch":    result = adminBatchBankMatch_(req);    break;
 *   case "adminConfirmBankImport": result = adminConfirmBankImport_(req); break;
 *
 */
