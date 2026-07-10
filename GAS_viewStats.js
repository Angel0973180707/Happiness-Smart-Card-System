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

// ★ view_date 欄位寫入 "yyyy-MM-dd" 字串時，Google Sheets 常會自動判斷成日期格式，
// 讀回來變成 JS Date 物件（不是字串），直接 String() 會變成
// "Fri Jul 10 2026 00:00:00 GMT+0800..." 這種完整格式，跟 "today" 字串比對永遠對不上。
// 統一透過這個函式轉換，兩種情況都正確處理。
function normalizeViewDateCell_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, "Asia/Taipei", "yyyy-MM-dd");
  }
  return String(value || "").trim();
}

// ─────────────────────────────────────────
//  寫入：瀏覽當下只動 CacheService，不碰 Sheets
//  （原本每次瀏覽都同步讀寫整張表，高併發下會互相打架、拖慢名片載入；
//   改成瀏覽時只在快取裡 +1，實際落地寫進 Sheets 交給 flushCachedViewStatsToSheet_
//   這個排程批次處理）
//
//  CacheService 沒有原生的「原子遞增」操作，這裡用短時間 LockService(1.5秒)
//  包住「讀快取→+1→寫回」這段，讓它接近原子操作；搶不到鎖就直接放棄這次計數，
//  寧可少算一次瀏覽，也不要讓客戶等名片載入。
// ─────────────────────────────────────────
function recordCardView_(cardId) {
  if (!cardId) return;
  try {
    var today = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
    var cache = CacheService.getScriptCache();
    var countKey = "HSC:views:" + cardId + ":" + today;
    var dirtyKey = "HSC:views:dirty:" + today;

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(1500);
    } catch (lockErr) {
      return; // 短鎖搶不到就放棄，不影響名片載入速度
    }

    try {
      var current = Number(cache.get(countKey)) || 0;
      // CacheService 單一 key 最長只能存 6 小時（21600 秒），
      // 但排程每 10 分鐘就會 flush 一次，遠遠用不到這個上限
      cache.put(countKey, String(current + 1), 21600);

      // 記錄「今天有哪些卡有待寫入的瀏覽數」，flush 時才知道要撈哪些 key
      // （CacheService 沒有「列出所有 key」的功能，只能靠這份清單追蹤）
      var dirtyRaw = cache.get(dirtyKey);
      var dirtyList = dirtyRaw ? JSON.parse(dirtyRaw) : [];
      if (dirtyList.indexOf(cardId) === -1) {
        dirtyList.push(cardId);
        cache.put(dirtyKey, JSON.stringify(dirtyList), 21600);
      }
    } finally {
      try { lock.releaseLock(); } catch (releaseErr) {}
    }
  } catch(e) {
    console.warn("[viewStats] recordCardView_ 失敗:", e.message);
  }
}

// ─────────────────────────────────────────
//  批次寫入：把快取裡累積的瀏覽數一次性沖進 view_stats_db
//  建議設定每 10 分鐘一次的時間觸發器（COMMERCIAL_TRIGGER_PLAN 已內建這筆設定，
//  呼叫一次 installCommercialTriggers_ 就會自動裝上）
// ─────────────────────────────────────────
function flushCachedViewStatsToSheet_() {
  try {
    var today = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
    var cache = CacheService.getScriptCache();
    var dirtyKey = "HSC:views:dirty:" + today;

    // 🔒 鎖定：全程鎖住，避免 flush 進行中，recordCardView_ 又在同一批 key 上動作
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (lockErr) {
      Logger.log("[viewStats] flushCachedViewStatsToSheet_ 取得鎖失敗，跳過這次批次寫入");
      return { ok: false, reason: "lock_timeout" };
    }

    try {
      var dirtyRaw = cache.get(dirtyKey);
      var dirtyList = dirtyRaw ? JSON.parse(dirtyRaw) : [];
      if (!dirtyList.length) return { ok: true, flushed: 0 };

      var pending = {};
      dirtyList.forEach(function(cardId) {
        var count = Number(cache.get("HSC:views:" + cardId + ":" + today)) || 0;
        if (count > 0) pending[cardId] = count;
      });

      if (!Object.keys(pending).length) {
        cache.remove(dirtyKey);
        return { ok: true, flushed: 0 };
      }

      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sheet = ss.getSheetByName("view_stats_db");
      if (!sheet) {
        sheet = ss.insertSheet("view_stats_db");
        sheet.appendRow(["id", "view_date", "count", "updated_at"]);
      }

      var data = sheet.getDataRange().getValues();
      var h = data[0].map(function(x){ return String(x).trim(); });
      var idCol = h.indexOf("id");
      var dateCol = h.indexOf("view_date");
      var countCol = h.indexOf("count");
      var updatedCol = h.indexOf("updated_at");
      var now = new Date().toISOString();

      // 先找出今天已經有列的卡（記行號），沒有的之後統一 setValues 批次寫入
      var existingRowByCardId = {};
      for (var r = 1; r < data.length; r++) {
        if (normalizeViewDateCell_(data[r][dateCol]) === today) {
          existingRowByCardId[String(data[r][idCol])] = r + 1;
        }
      }

      var newRows = [];
      Object.keys(pending).forEach(function(cardId) {
        var addCount = pending[cardId];
        var rowNum = existingRowByCardId[cardId];
        if (rowNum) {
          // 已有今天的列：讀 Sheets 上目前的值，累加這批快取裡的量再寫回
          var sheetCurrent = Number(sheet.getRange(rowNum, countCol + 1).getValue()) || 0;
          sheet.getRange(rowNum, countCol + 1).setValue(sheetCurrent + addCount);
          if (updatedCol >= 0) sheet.getRange(rowNum, updatedCol + 1).setValue(now);
        } else {
          var newRow = new Array(h.length).fill("");
          if (idCol      >= 0) newRow[idCol]      = cardId;
          if (dateCol    >= 0) newRow[dateCol]    = today;
          if (countCol   >= 0) newRow[countCol]   = addCount;
          if (updatedCol >= 0) newRow[updatedCol] = now;
          newRows.push(newRow);
        }
      });

      // ★ 新卡一次性批次寫入，不要一列一列 appendRow
      if (newRows.length) {
        var startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, newRows.length, h.length).setValues(newRows);
      }

      // 清掉這批已經落地的快取 key，避免下次重複計算
      dirtyList.forEach(function(cardId) {
        cache.remove("HSC:views:" + cardId + ":" + today);
      });
      cache.remove(dirtyKey);

      try {
        CacheService.getScriptCache().remove("hsc:sheet_rows:view_stats_db");
      } catch(_) {}

      Logger.log("[viewStats] flushCachedViewStatsToSheet_ 完成，寫入 " + Object.keys(pending).length + " 張卡");
      return { ok: true, flushed: Object.keys(pending).length };
    } finally {
      try { lock.releaseLock(); } catch (releaseErr) {}
    }
  } catch(e) {
    Logger.log("[viewStats] flushCachedViewStatsToSheet_ 失敗: " + e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * 手動測試用：在 GAS 編輯器點「執行」測試 flushCachedViewStatsToSheet_
 */
function testFlushCachedViewStats() {
  Logger.log(JSON.stringify(flushCachedViewStatsToSheet_()));
}

/**
 * 後台可呼叫版本：手動觸發一次批次寫入（測試/緊急情況用，不用等排程）
 */
function adminFlushViewStats_(req) {
  requireAdminKeyOrSystem_(req || {});
  return Object.assign({ version: HSC_VERSION, action: "adminFlushViewStats" }, flushCachedViewStatsToSheet_());
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
  requireAdminKey_(req);

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
    var date  = normalizeViewDateCell_(data[r][dateCol]);
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

// ─────────────────────────────────────────
//  清理：刪除 tracking_log 超過 N 個月的舊記錄
//  建議設定每月時間觸發器執行 cleanupTrackingLog_
// ─────────────────────────────────────────
function cleanupTrackingLog_() {
  var KEEP_MONTHS = 12; // 保留幾個月，超過的刪除
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("tracking_log");
    if (!sheet) return;

    var cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - KEEP_MONTHS);
    var cutoffStr = Utilities.formatDate(cutoff, "Asia/Taipei", "yyyy-MM-dd");

    var data    = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h){ return String(h).trim(); });
    var dateCol = headers.indexOf("created_at");
    if (dateCol < 0) return;

    // 從後往前掃，超過門檻的列刪除
    var deleted = 0;
    for (var r = data.length - 1; r >= 1; r--) {
      var rowDate = String(data[r][dateCol] || "").substring(0, 10);
      if (rowDate && rowDate < cutoffStr) {
        sheet.deleteRow(r + 1);
        deleted++;
      }
    }

    console.log("[cleanupTrackingLog_] 刪除 " + deleted + " 筆，cutoff=" + cutoffStr);
    writeOpsLog_({
      module: "system",
      action: "cleanup_tracking_log",
      after_status: "done",
      operator: "system",
      note: "刪除 " + deleted + " 筆（超過 " + KEEP_MONTHS + " 個月）"
    });
  } catch(e) {
    console.error("[cleanupTrackingLog_] 失敗:", e.message);
  }
}

/**
 * 手動測試用：在 GAS 編輯器點「執行」
 */
function testCleanupTrackingLog() {
  cleanupTrackingLog_();
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
 * 4. 設定每月時間觸發器執行 cleanupTrackingLog_：
 *    GAS 觸發條件 → 新增 → cleanupTrackingLog_ → 時間驅動 → 月計時器 → 每月 1 日
 *
 * 5. 重新部署 v438
 */
