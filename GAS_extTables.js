/**
 * HSC GAS Ext Tables 輔助函式 v437
 *
 * 用途：處理超出 card_db 上限的 CTA 和照片
 *   - card_db 最多存 3 個 CTA（cta_text_1~3）
 *   - card_db 最多存 10 張照片（photo1_url~photo10_url）
 *   - CTA 第 4 個起 → card_cta_ext
 *   - 照片第 11 張起 → card_photo_ext
 *
 * 整合方式：
 *   1. 在 updateCardByToken_ 最後呼叫 saveOverflowCtas_ 和 saveOverflowPhotos_
 *   2. 在卡片載入函式（buildCardPayload 或 getCardPublicShell_ 等）最後呼叫
 *      mergeExtCtas_ 和 mergeExtPhotos_
 */

var CTA_DB_MAX   = 3;   // card_db 最多存幾個 CTA
var PHOTO_DB_MAX = 10;  // card_db 最多存幾張照片
var PHOTO_EXT_MAX = 30; // 照片牆總上限（含 ext）
var CTA_EXT_MAX   = 50; // CTA 總上限（含 ext）

// ─────────────────────────────────────────
//  儲存：把 CTA 4+ 寫入 card_cta_ext
// ─────────────────────────────────────────
function saveOverflowCtas_(cardId, params) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("card_cta_ext");
    if (!sheet) {
      console.warn("[extTables] card_cta_ext 不存在，略過");
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 1) return;
    var headers = data[0];
    var idCol = headers.indexOf("id");
    var seqCol = headers.indexOf("seq");
    if (idCol < 0 || seqCol < 0) return;

    // 從後往前刪除該卡 seq >= 4 的舊資料
    for (var r = data.length - 1; r >= 1; r--) {
      if (String(data[r][idCol]) === String(cardId) &&
          Number(data[r][seqCol]) >= CTA_DB_MAX + 1) {
        sheet.deleteRow(r + 1);
      }
    }

    // 寫入新的 overflow CTAs（seq 4 以上）
    for (var i = CTA_DB_MAX + 1; i <= CTA_EXT_MAX; i++) {
      var ctaText = String(params["cta_text_" + i] || "").trim();
      var ctaLink = String(params["cta_link_" + i] || "").trim();
      if (!ctaText && !ctaLink) continue;
      sheet.appendRow([cardId, i, ctaText, ctaLink]);
    }

    // 清快取（card_cta_ext 資料異動）
    try {
      var cache = CacheService.getScriptCache();
      cache.remove("sheet_card_cta_ext");
    } catch(_) {}

    console.log("[extTables] saveOverflowCtas_ 完成，cardId=" + cardId);
  } catch(e) {
    console.error("[extTables] saveOverflowCtas_ 失敗:", e.message);
  }
}

// ─────────────────────────────────────────
//  儲存：把照片 11+ 寫入 card_photo_ext
// ─────────────────────────────────────────
function saveOverflowPhotos_(cardId, params) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("card_photo_ext");

    // 如果 sheet 不存在，自動建立
    if (!sheet) {
      sheet = ss.insertSheet("card_photo_ext");
      sheet.appendRow(["id", "seq", "photo_url", "created_at"]);
      console.log("[extTables] 自動建立 card_photo_ext");
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf("id");
    var seqCol = headers.indexOf("seq");
    if (idCol < 0 || seqCol < 0) return;

    // 從後往前刪除該卡 seq >= 11 的舊資料
    for (var r = data.length - 1; r >= 1; r--) {
      if (String(data[r][idCol]) === String(cardId) &&
          Number(data[r][seqCol]) >= PHOTO_DB_MAX + 1) {
        sheet.deleteRow(r + 1);
      }
    }

    // 寫入新的 overflow 照片（seq 11 以上）
    var now = new Date().toISOString();
    for (var i = PHOTO_DB_MAX + 1; i <= PHOTO_EXT_MAX; i++) {
      var photoUrl = String(params["photo" + i + "_url"] || "").trim();
      if (!photoUrl) continue;
      sheet.appendRow([cardId, i, photoUrl, now]);
    }

    // 清快取
    try {
      var cache = CacheService.getScriptCache();
      cache.remove("sheet_card_photo_ext");
    } catch(_) {}

    console.log("[extTables] saveOverflowPhotos_ 完成，cardId=" + cardId);
  } catch(e) {
    console.error("[extTables] saveOverflowPhotos_ 失敗:", e.message);
  }
}

// ─────────────────────────────────────────
//  讀取：把 card_cta_ext 資料合併進 payload
// ─────────────────────────────────────────
function mergeExtCtas_(cardId, payload) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("card_cta_ext");
    if (!sheet) return payload;

    var rows = getSheetRowsByName_("card_cta_ext");
    rows.forEach(function(row) {
      if (String(row["id"]) !== String(cardId)) return;
      var seq = Number(row["seq"]);
      if (!seq || seq < 1 || seq > CTA_EXT_MAX) return;

      // seq 4+ 一定從 ext 補；seq 1-3 只在 card_db 沒有時才補
      var hasInDb = seq <= CTA_DB_MAX &&
                    payload["cta_text_" + seq] &&
                    String(payload["cta_text_" + seq]).trim() !== "";
      if (hasInDb) return;

      payload["cta_text_" + seq] = String(row["cta_text"] || "");
      payload["cta_link_" + seq] = String(row["cta_link"] || "");
    });
  } catch(e) {
    console.error("[extTables] mergeExtCtas_ 失敗:", e.message);
  }
  return payload;
}

// ─────────────────────────────────────────
//  讀取：把 card_photo_ext 資料合併進 payload
// ─────────────────────────────────────────
function mergeExtPhotos_(cardId, payload) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("card_photo_ext");
    if (!sheet) return payload;

    var rows = getSheetRowsByName_("card_photo_ext");
    rows.forEach(function(row) {
      if (String(row["id"]) !== String(cardId)) return;
      var seq = Number(row["seq"]);
      if (!seq || seq < PHOTO_DB_MAX + 1 || seq > PHOTO_EXT_MAX) return;
      var url = String(row["photo_url"] || "").trim();
      if (!url) return;
      payload["photo" + seq + "_url"] = url;
    });
  } catch(e) {
    console.error("[extTables] mergeExtPhotos_ 失敗:", e.message);
  }
  return payload;
}
