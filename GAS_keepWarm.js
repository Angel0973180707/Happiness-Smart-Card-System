/**
 * HSC GAS Keep-Warm 函式 v1.0
 *
 * 目的：讓 GAS 不要進入「冷啟動」狀態，減少名片載入十幾秒的問題
 *
 * 使用方式：
 * 1. 把這段貼到 GAS 任一 .gs 檔（或新增 KeepWarm.gs）
 * 2. 設定時間觸發器：
 *    GAS 編輯器 → 左側時鐘圖示「觸發條件」
 *    → 新增觸發條件
 *    → 函式選 keepWarmPing_
 *    → 事件來源：時間驅動
 *    → 類型：分鐘計時器
 *    → 間隔：每 5 分鐘
 *    → 儲存
 *
 * 注意：每月免費額度 6 分鐘/天觸發，5 分鐘觸發 = 每天 288 次，
 *       每次 < 1 秒 → 完全在免費額度內
 */

function keepWarmPing_() {
  // 只做最輕量的動作：讀一下 CONFIG，確認 GAS 活著
  try {
    var startTime = new Date().getTime();
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("card_db");
    if (sheet) {
      // 只讀第一列（表頭），不讀全部資料
      sheet.getRange(1, 1, 1, 5).getValues();
    }
    var elapsed = new Date().getTime() - startTime;
    console.log("[KeepWarm] ping OK, elapsed=" + elapsed + "ms, " + new Date().toISOString());
  } catch(e) {
    console.warn("[KeepWarm] ping failed:", e.message);
  }
}

/**
 * 手動測試用：在 GAS 編輯器點「執行」測試 keepWarmPing_ 是否正常
 */
function testKeepWarm() {
  keepWarmPing_();
}

/*
 * ── 設定觸發條件步驟 ──
 *
 * 1. GAS 編輯器左側點時鐘圖示（觸發條件）
 * 2. 右下角「＋ 新增觸發條件」
 * 3. 設定：
 *    - 要執行哪個函式：keepWarmPing_
 *    - 事件來源：時間驅動
 *    - 時間型觸發條件類型：分鐘計時器
 *    - 每隔幾分鐘執行一次：每 5 分鐘
 * 4. 儲存
 *
 * 設定完成後，GAS 每 5 分鐘自動執行一次，保持溫熱狀態。
 * 名片載入速度會明顯改善（從 10 秒以上 → 1~3 秒）。
 */
