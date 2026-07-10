/**
 * HSC CTA 管理 GAS 函式 v2.0
 *
 * v2.0 修正：
 *  - adminGetCardCtas_：同時讀取 card_db CTA 1-3 + card_cta_ext，合併完整回傳
 *  - adminSetCardCtas_：seq 1-3 同步更新 card_db；seq 4+ 寫 card_cta_ext；同步更新 cta_limit
 *  - 清快取：使用正確 key（hsc:sheet_rows:card_cta_ext / card_db）
 */

// ─────────────────────────────────────────
// 🔍 查詢某張卡的所有 CTA（card_db 1-3 + card_cta_ext 全部）
// ─────────────────────────────────────────
function adminGetCardCtas_(params) {
  requireAdminKey_(params);

  var cardId = String(params.card_id || "").trim().toUpperCase();
  if (!cardId) throw new Error("card_id 為必填");

  // 1. 讀取 card_db 的 CTA 1-3
  var cardRow = findRowByField_("card_db", "id", cardId);
  var merged = {};
  for (var i = 1; i <= 3; i++) {
    var t = String((cardRow && cardRow["cta_text_" + i]) || "").trim();
    var l = String((cardRow && cardRow["cta_link_" + i]) || "").trim();
    if (t || l) merged[i] = { seq: i, cta_text: t, cta_link: l };
  }

  // 2. 讀取 card_cta_ext（所有 seq）
  var extRows = [];
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    if (ss.getSheetByName("card_cta_ext")) {
      extRows = getSheetRowsByName_("card_cta_ext").filter(function(row) {
        return String(row.id || "").trim().toUpperCase() === cardId;
      });
    }
  } catch(e) {
    console.error("[ctaManager] 讀取 card_cta_ext 失敗:", e.message);
  }

  extRows.forEach(function(row) {
    var seq = Number(row.seq);
    if (!seq || seq < 1) return;
    var t = String(row.cta_text || "").trim();
    var l = String(row.cta_link || "").trim();
    // seq 1-3：card_db 優先；只有 card_db 沒有時才補 ext
    if (seq <= 3 && merged[seq]) return;
    if (t || l) merged[seq] = { seq: seq, cta_text: t, cta_link: l };
  });

  // 3. 排序後回傳
  var ctas = Object.keys(merged).map(function(k) { return merged[Number(k)]; });
  ctas.sort(function(a, b) { return a.seq - b.seq; });

  return { ok: true, card_id: cardId, ctas: ctas };
}

// ─────────────────────────────────────────
// 💾 整批儲存（取代該卡所有 CTA）
//   seq 1-3 → card_db；seq 4+ → card_cta_ext；同步更新 cta_limit
// ─────────────────────────────────────────
function adminSetCardCtas_(params) {
  requireAdminKey_(params);

  var cardId = String(params.card_id || "").trim().toUpperCase();
  if (!cardId) throw new Error("card_id 為必填");

  var ctas = params.ctas;
  if (!Array.isArray(ctas)) throw new Error("ctas 需為陣列");

  // 過濾空行，按位置重新編 seq（1-indexed）
  var valid = [];
  ctas.forEach(function(c, idx) {
    var t = String(c.cta_text || "").trim();
    var l = String(c.cta_link || "").trim();
    if (t || l) valid.push({ seq: idx + 1, cta_text: t, cta_link: l });
  });

  // 🔒 鎖定：card_db 的這張卡 + 全部卡片共用的 card_cta_ext，
  // 「讀取→刪除→appendRow」整段鎖住，避免跟客戶自行更新（saveOverflowCtas_）撞在一起把資料弄亂。
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    throw new Error("系統忙碌，無法儲存 CTA 資料，請稍後再試。");
  }

  try {
    // ── 1. 更新 card_db（CTA 1~3 + cta_limit）──
    var cardRow = findRowByField_("card_db", "id", cardId);
    if (!cardRow) throw new Error("找不到卡片：" + cardId);

    var dbPatch = {};
    for (var i = 1; i <= 3; i++) {
      var found = null;
      for (var j = 0; j < valid.length; j++) {
        if (valid[j].seq === i) { found = valid[j]; break; }
      }
      dbPatch["cta_text_" + i] = found ? found.cta_text : "";
      dbPatch["cta_link_" + i] = found ? found.cta_link : "";
    }
    dbPatch.cta_limit = String(valid.length);

    var updatedRow = Object.assign({}, cardRow, dbPatch);
    updateRowByName_("card_db", cardRow.__rowNum, updatedRow);

    // ── 2. 更新 card_cta_ext（seq 4+）──
    var overflow = valid.filter(function(c) { return c.seq > 3; });
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("card_cta_ext");
    if (!sheet) {
      sheet = ss.insertSheet("card_cta_ext");
      sheet.appendRow(["id", "seq", "cta_text", "cta_link"]);
    }

    // 從後往前刪除這張卡所有舊記錄
    var allData = sheet.getDataRange().getValues();
    var headers = allData[0].map(function(h) { return String(h).trim(); });
    var idCol = headers.indexOf("id");
    for (var r = allData.length - 1; r >= 1; r--) {
      if (String(allData[r][idCol] || "").trim().toUpperCase() === cardId) {
        sheet.deleteRow(r + 1);
      }
    }

    // 寫入 seq 4+
    overflow.forEach(function(c) {
      sheet.appendRow([cardId, c.seq, c.cta_text, c.cta_link]);
    });

    // ── 3. 清快取（兩張表都異動了）──
    try {
      var cache = CacheService.getScriptCache();
      cache.remove("hsc:sheet_rows:card_cta_ext");
      cache.remove("hsc:sheet_rows:card_db");
    } catch(_) {}

    return { ok: true, card_id: cardId, count: valid.length };
  } catch(e) {
    console.error("[ctaManager] adminSetCardCtas_ 失敗:", e.message);
    throw e; // ★ 不再吞掉錯誤：ext 表寫入失敗要讓管理員知道，不能謊報成功
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      Logger.log("adminSetCardCtas_ lock release failed: " + (releaseErr && releaseErr.message ? releaseErr.message : String(releaseErr)));
    }
  }
}
