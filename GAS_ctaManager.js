/**
 * HSC CTA 管理 GAS 函式 v1.0
 * 包含：查詢 CTA、整批儲存 CTA
 *
 * 步驟：
 * 1. GAS 新增檔案 CtaManager.gs，貼入全部內容
 * 2. doPost 的 switch 加入以下兩個 case：
 *
 *   case "adminGetCardCtas": result = adminGetCardCtas_(req); break;
 *   case "adminSetCardCtas": result = adminSetCardCtas_(req); break;
 *
 * 3. 重新部署（新版本）
 */

// ─────────────────────────────────────────
// 🔍 查詢某張卡的所有 CTA
// ─────────────────────────────────────────
function adminGetCardCtas_(params) {
  requireAdminKey_(params);

  var cardId = String(params.card_id || "").trim().toUpperCase();
  if (!cardId) throw new Error("card_id 為必填");

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("card_cta_ext");
  if (!sheet) throw new Error("找不到 card_cta_ext");

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, card_id: cardId, ctas: [] };

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var colIdx  = {};
  headers.forEach(function(h, i) { colIdx[h] = i; });

  var ctas = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[colIdx["id"]] || "").trim().toUpperCase() !== cardId) continue;
    ctas.push({
      seq:      Number(row[colIdx["seq"]]      || 0),
      cta_text: String(row[colIdx["cta_text"]] || ""),
      cta_link: String(row[colIdx["cta_link"]] || "")
    });
  }

  // 按 seq 排序
  ctas.sort(function(a, b) { return a.seq - b.seq; });

  return { ok: true, card_id: cardId, ctas: ctas };
}

// ─────────────────────────────────────────
// 💾 整批儲存（取代該卡所有 CTA）
// ─────────────────────────────────────────
function adminSetCardCtas_(params) {
  requireAdminKey_(params);

  var cardId = String(params.card_id || "").trim().toUpperCase();
  if (!cardId) throw new Error("card_id 為必填");

  var ctas = params.ctas;
  if (!Array.isArray(ctas)) throw new Error("ctas 需為陣列");

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("card_cta_ext");
  if (!sheet) throw new Error("找不到 card_cta_ext");

  // 讀取所有資料
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0].map(function(h) { return String(h).trim(); });
  var colIdx  = {};
  headers.forEach(function(h, i) { colIdx[h] = i; });

  // 保留其他卡的資料，過濾掉這張卡的舊 CTA
  var remaining = [allData[0]]; // 保留 header
  for (var i = 1; i < allData.length; i++) {
    var rowId = String(allData[i][colIdx["id"]] || "").trim().toUpperCase();
    // 過濾空列與目標卡的舊資料
    var hasData = allData[i].some(function(cell) { return String(cell || "").trim() !== ""; });
    if (hasData && rowId !== cardId) {
      remaining.push(allData[i]);
    }
  }

  // 清空工作表，寫回保留的資料
  sheet.clearContents();
  if (remaining.length > 0) {
    sheet.getRange(1, 1, remaining.length, headers.length).setValues(remaining);
  }

  // 寫入新的 CTA
  var written = 0;
  ctas.forEach(function(cta, idx) {
    var text = String(cta.cta_text || "").trim();
    var link = String(cta.cta_link || "").trim();
    if (!text && !link) return; // 跳過空行

    var row = new Array(headers.length).fill("");
    function set(f, v) { if (colIdx[f] !== undefined) row[colIdx[f]] = v; }
    set("id",       cardId);
    set("seq",      idx + 1);
    set("cta_text", text);
    set("cta_link", link);
    sheet.appendRow(row);
    written++;
  });

  // 清 ScriptCache
  try { CacheService.getScriptCache().remove("card_" + cardId); } catch(_) {}

  return { ok: true, card_id: cardId, count: written };
}

/*
 * ── doPost 的 switch-case 要加這段 ──
 *
 *   case "adminGetCardCtas": result = adminGetCardCtas_(req); break;
 *   case "adminSetCardCtas": result = adminSetCardCtas_(req); break;
 *
 */
