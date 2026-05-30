/**
 * HSC 批次建卡 GAS 函式 v1.0
 *
 * 使用方式：
 * 1. 把這整份程式碼貼到 GAS 專案（新增一個檔案，例如 BatchCreate.gs）
 * 2. 在 doPost 的 switch-case 加入：
 *      case 'adminBatchCreateCards':
 *        result = adminBatchCreateCards_(params);
 *        break;
 * 3. 重新部署 GAS（版本號 +1）
 */

/**
 * 批次建卡主函式
 * @param {Object} params - { cards: Array, admin_key: string }
 */
function adminBatchCreateCards_(params) {
  requireAdminKey_(params);

  var cards = params.cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("cards 陣列為空");
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var cardSheet = ss.getSheetByName("card_db");
  var ctaExtSheet = ss.getSheetByName("card_cta_ext");

  if (!cardSheet) throw new Error("找不到 card_db 工作表");

  // 取得 card_db 欄位對應
  var cardHeaders = cardSheet.getRange(1, 1, 1, cardSheet.getLastColumn()).getValues()[0];
  var colIdx = {};
  cardHeaders.forEach(function(h, i) {
    if (h) colIdx[String(h).trim()] = i;
  });

  // 找目前最大卡號（TW####）
  var allData = cardSheet.getDataRange().getValues();
  var maxNum = 0;
  var idCol = colIdx["id"];
  if (idCol !== undefined) {
    allData.slice(1).forEach(function(row) {
      var id = String(row[idCol] || "");
      var m = id.match(/TW(\d+)/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
  }
  var nextNum = maxNum + 1;

  // 排序：負責人優先，然後區域卡，最後員工
  var typeOrder = { "負責人": 0, "北區": 1, "中區": 1, "南區": 1, "員工": 2 };
  cards.sort(function(a, b) {
    return (typeOrder[a.type] !== undefined ? typeOrder[a.type] : 2)
         - (typeOrder[b.type] !== undefined ? typeOrder[b.type] : 2);
  });

  var now = new Date();
  var expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  var expiresStr = Utilities.formatDate(expiresAt, "Asia/Taipei", "yyyy-MM-dd");
  var nowStr = now.toISOString();

  var results = [];
  var referrerId = null;             // 負責人卡 ID
  var employeesByRegion = {};        // { "北區": [{id, name}], ... }
  var regionCardIds = {};            // { "北區": "TW0200", ... }
  ["北區","中區","南區"].forEach(function(r) { employeesByRegion[r] = []; });

  // === 建卡迴圈 ===
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    try {
      var cardId = "TW" + pad4_(nextNum++);
      var plan   = (String(card.plan || "premium")).toLowerCase() === "free" ? "free" : "premium";
      var isPrem = plan === "premium";
      var color  = String(card.color || "").trim() || (isPrem ? "p1" : "c1");

      var row = new Array(cardHeaders.length).fill("");

      function setCol(field, val) {
        if (colIdx[field] !== undefined) row[colIdx[field]] = val;
      }

      setCol("id",           cardId);
      setCol("name",         String(card.name  || ""));
      setCol("title",        String(card.title || ""));
      setCol("company",      String(card.company || ""));
      setCol("phone",        String(card.phone || ""));
      setCol("email",        String(card.email || ""));
      setCol("line_id",      String(card.line_id || ""));
      setCol("avatar_url",   String(card.avatar_url || ""));
      setCol("plan",         plan);
      setCol("color",        color);
      setCol("style",        isPrem ? "" : (String(card.style || "s1")));
      setCol("paper",        isPrem ? "" : (String(card.paper || "f1")));
      setCol("status",       "active");
      setCol("created_at",   nowStr);
      setCol("expires_at",   expiresStr);
      setCol("owner_agent_id", cardId);
      setCol("is_test",      false);
      setCol("price",        card.price || 0);

      // 卡片類型額外設定
      var t = String(card.type || "員工");
      if (t === "負責人") {
        referrerId = cardId;
        setCol("service_agent", cardId);
      } else if (t === "員工") {
        setCol("referrer", referrerId || "");
        var region = String(card.region || "");
        if (employeesByRegion[region]) {
          employeesByRegion[region].push({ id: cardId, name: card.name });
        }
      } else if (["北區","中區","南區"].indexOf(t) >= 0) {
        setCol("referrer", referrerId || "");
        regionCardIds[t] = cardId;
      }

      cardSheet.appendRow(row);
      results.push({ card_id: cardId, name: card.name, type: t, ok: true });

    } catch(err) {
      results.push({ name: card.name || "", type: card.type || "", ok: false, error: err.message });
    }
  }

  // === 寫入 card_cta_ext（區域卡 ↔ 員工） ===
  if (ctaExtSheet) {
    var ctaHeaders = ctaExtSheet.getRange(1, 1, 1, ctaExtSheet.getLastColumn()).getValues()[0];
    var ctaIdx = {};
    ctaHeaders.forEach(function(h, i) { if (h) ctaIdx[String(h).trim()] = i; });

    ["北區","中區","南區"].forEach(function(region) {
      var regionCardId = regionCardIds[region];
      var employees    = employeesByRegion[region];
      if (!regionCardId || !employees.length) return;

      employees.forEach(function(emp, idx) {
        var ctaRow = new Array(ctaHeaders.length).fill("");
        function setCta(f, v) { if (ctaIdx[f] !== undefined) ctaRow[ctaIdx[f]] = v; }
        setCta("id",       regionCardId);
        setCta("seq",      idx + 1);
        setCta("cta_text", emp.name);
        setCta("cta_link", "https://angel-namecard.letssyncus.com/index.html?id=" + emp.id);
        ctaExtSheet.appendRow(ctaRow);
      });
    });
  }

  // 清快取（個別卡 + card_db 整體）
  try {
    var cache = CacheService.getScriptCache();
    var keysToRemove = ["hsc:sheet_rows:card_db", "hsc:sheet_rows:card_cta_ext"];
    results.filter(function(r) { return r.ok; }).forEach(function(r) {
      keysToRemove.push("card_" + r.card_id);
    });
    cache.removeAll(keysToRemove);
  } catch(_) {}

  return { ok: true, results: results };
}

/** 數字補零為 4 位 */
function pad4_(n) {
  return String(n).padStart ? String(n).padStart(4, "0") : ("000" + n).slice(-4);
}

/*
 * ── doPost 的 switch-case 要加這段 ──
 *
 *   case 'adminBatchCreateCards':
 *     result = adminBatchCreateCards_(params);
 *     break;
 *
 */
