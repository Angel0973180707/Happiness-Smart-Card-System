# HSC 維運總規範 v1.0

日期：2026-08-15

## 一、文件定位

這份不是開發日誌，也不是單次事故報告。

它是 HSC 之後長期使用的：

- 維運母文件
- 部署驗收標準
- P0 診斷 SOP
- 快取治理規範
- 團隊責任分界
- 真人驗收 Gate

未來遇到「正式站沒更新、名片載入失敗、GAS 403、分享預覽失效」等問題時，必須先依這份文件判斷，不要重新從零猜測。

---

## 二、正式站架構

正式站：

```text
https://angel-namecard.letssyncus.com
```

由 Empryon 代管。

正式站不是 GitHub Pages reverse proxy。

HTML / JS / CSS 採：

```text
GitHub main
→ 每 15 分鐘同步
→ 正式伺服器 static mirror
```

只有以下路徑使用 proxy：

```text
/api/
/gas-proxy/
/gas-usercontent/
/img/
```

目前確認：

```text
沒有 proxy_cache
```

不要再把 HTML / JS / CSS 的舊版問題先歸咎於 nginx proxy cache。

---

## 三、正式部署唯一判斷入口

正式端點：

```text
https://angel-namecard.letssyncus.com/_deploy.json
```

欄位至少包含：

```text
commit
commit_short
commit_message
deploy_status
deployed_at
last_checked_at
sync_interval_seconds
assets
```

### 正式判斷規則

遇到「正式站好像沒更新」時：

**Step 1** — 先 GET：

```text
/_deploy.json
```

**Step 2** — 比較：

```text
commit
vs
origin/main
```

**Step 3** — 看：

```text
last_checked_at
```

若超過 3 個同步週期（`> 45 分鐘`）才視為同步作業疑似異常。

**Step 4** — 必要時使用：

```text
assets SHA256
```

確認正式站內容。

### 禁止再使用的錯誤判準

- 不要再單靠 `Last-Modified` 判斷有沒有同步。
- 不要因為「不同 query string 仍得到相同 ETag」就判定 nginx cache 異常。ETag 目前由 `mtime + file size` 衍生，與 query string 無直接關係。

---

## 四、靜態資源 Cache Stamp 規則

目前 HSC 使用：

```html
app.js?v=...
card-renderer.js?v=...
style.css?v=...
```

作為瀏覽器 cache busting。

已確認歷史問題：多次修改 app.js，但 index.html 的 `app.js?v=` 沒更新，導致既有使用者仍可能取得舊版 JS。

已修正：

```text
app.js:     v8.3.9 → v8.4.0
style.css:  v1.7   → v1.8
```

`card-renderer.js`（`v8.4.5-cta-stability`）目前未過期。

### 正式規則

- 只要修改 `app.js`，必須同步改 `app.js?v=`
- 只要修改 `card-renderer.js`，必須同步改 `card-renderer.js?v=`
- 只要修改 `style.css`，必須同步改 `style.css?v=`

版本格式不強制 semantic version，只要求「跟上一版不同」。

---

## 五、CI Cache Stamp Gate

正式納入：

```text
.github/workflows/check-cache-stamp.yml
```

目的：若修改受版本戳管理檔案，但沒有同步更新 `?v=`，CI FAIL。不要再靠人工記憶。

CI 至少應驗證：

| Case | 情境 | 結果 |
|---|---|---|
| A | app.js 有改，stamp 沒改 | FAIL |
| B | app.js 有改，stamp 有改 | PASS |
| C | 非 stamp 管理檔案修改 | PASS |
| D | index.html 完全抓不到任何 `?v=` | FAIL |

> **狀態：Done**（2026-08-15）— 已建立並通過安全審查（無外部不可信腳本、無 secret 洩漏、不自動修改 production、不自動 deploy），四個情境 A/B/C/D 都用真的 GitHub Actions 執行驗證過（本機 git plumbing 建構合成 commit 測試，不污染 main）。已正式上線於 `main`，push 到 main／PR 都會跑。

---

## 六、Service Worker 規則

repo 目前沒有程式主動 `navigator.serviceWorker.register(...)`，所以新使用者正常情況不會新註冊 `sw.js`。

但歷史使用者可能曾經註冊過舊 SW。目前 `sw.js` 使用 `cacheFirst`，且 `SW_VERSION = v1.7.5`。舊瀏覽器若仍保留該 service worker，可能長期提供舊版 `app.js`。

### 診斷方式

只有特定舊裝置異常時，優先查：

```javascript
navigator.serviceWorker.getRegistrations()
caches.keys()
```

必要時真人驗收 Unregister Service Worker / Clear site data。**但不要在抓證據前先清掉，避免把 root cause 洗掉。**

---

## 七、GAS 與 proxy 判斷規則

正式 Apps Script deployment：

```text
access = ANYONE_ANONYMOUS
executeAs = USER_DEPLOYING
```

### HEAD 特性

已驗證：

```text
HEAD → 403
GET  → 正常
POST → 正常
```

direct GAS 與 nginx gas-proxy 行為一致。

因此不要再使用 `curl -I` 來判斷 GAS Web App 是否正常。真正功能診斷必須使用 `GET` 或 `POST`。

---

## 八、Card Shell Single-Flight 原則

歷史架構中，`index.html` 的 manifest 注入腳本與 `app.js` 的 `renderPersonalCard_` 曾各打一筆 `getCardPublicShell`，造成同頁重複請求。

正式原則：同一時間同一卡片只允許 **1 個 in-flight `getCardPublicShell`**。

但不要再把標準錯誤定義為「整個頁面生命週期只能永遠 1 筆」——若第一次真的失敗，系統必須具備恢復能力。

正式 single-flight 要做到 **keyed by cardId**，例如概念：

```text
{ cardId, promise }
```

### Failure recovery

若 Promise reject／timeout／abort／network error，必須清除該 flight。下一個真正需要資料的 consumer 可以重新建立 1 個新的 single flight，但任一時刻不得有 concurrent duplicate。

禁止：

- 無限 retry
- setInterval retry
- manifest retry + app retry 同時發生
- request storm

---

## 九、個人名片分享 URL 建構原則（2026-08-15 新增，真人驗收通過）

### 事故摘要

CEO 真人測試發現：打開 `index.html?id=TW0110&view=1` 後**第一次**直接按浮動分享按鈕，分享出去的卻是 `share/TW0001.html`（別人的卡）；再按第二次才會變成 `share/TW0110.html`。其他非 TW0001 的正式卡都有同樣現象，且經真的 `navigator.share()`/`clipboard` 攔截證實：問題不只發生在「第一次」，錯誤結果甚至可能被永久快取住，不會自動修正。

### Root cause

`index.html` 的分享 URL 建構函式（`buildCardShareUrlFallback()`／`buildCardShareOgUrlCandidate()`）原本會問 app.js 的 `window.__getCardShareUrl`／`__getCardShareOgUrl`，這兩個函式用 `facadeCurrentRow || currentRow || facadeBaseData`（app.js 自己的 GAS 讀卡請求跑完才會有值）決定要分享哪張卡。使用者在資料載入完成前點分享，這幾個變數是 `null`，程式就落回寫死的 `FACADE_SAMPLE_ID`（`"TW0001"`）。更嚴重的是，這個錯誤結果會被背景 prefetch 存進一個不會重算的全域快取變數，導致錯誤結果被永久記住，不是「等一下就會自動修正」。

### 正式規則（往後任何分享/複製連結功能都適用）

> **「分享哪張名片」必須以當前網址的 card ID 為準（`?id=` 直接同步讀取），不得依賴尚未完成的非同步卡片資料（GAS 回傳、`currentRow`、`facadeCurrentRow` 等任何要等網路請求完成才有值的狀態）。**

原因：在個人成品卡模式（`view=1`）下，「這次要分享哪張卡」這件事，網址本身早就百分之百確定，不需要、也不應該問任何還在載入中的非同步資料。這條原則跟第八節「Card Shell Single-Flight」是同一種精神：**同步、確定的資訊來源，不能被非同步狀態污染或取代。**

### 正式修復

`index.html` 的分享 URL 一律直接用 `getCurrentCardId()`（同步讀 URL `?id=`）建構，不再問 app.js 那兩個依賴非同步 payload 的函式。追蹤參數（`share_card_id`／`share_source`／`share_channel`）改為這次分享動作的固定屬性，一律用目前卡號跟固定值覆蓋，不受載入時機影響；`share_agent_id`／`share_visit_id` 沿用網址上原本帶的值（跟原本邏輯一致，允許為空）。

Commit：`f177f78`（主要修復）、`4286c4c`（追蹤參數修正）。

### 回歸測試清單（往後改分享/複製連結相關功能，必須重跑）

用真的 `navigator.share()`/`clipboard.writeText` 攔截（不能只看程式碼推論）：

1. 至少 5 張正式卡（含 TW0001 本身），**全新開頁、完全不等待、立即按分享**，`share_card_id` 一律等於該卡自己。
2. 同一頁再按第二次，結果仍須一致正確。
3. 模擬慢網路／逾時（探測請求延遲 0ms／500ms／2.5s／永遠不回應），任何一種情境第一次點擊都必須正確，不得因網路時機退化成預設卡。
4. 追蹤參數（`share_card_id`／`share_source`／`share_channel`）確認存在且正確。

> **狀態：Resolved — Production Accepted**（2026-08-15，CEO 真人手機實測不同名片，第一次直接分享即正確顯示該張名片，不再跳成 TW0001）。

---

## 十、正式名片 P0 驗收標準

主名片 `TW0001`，正式站驗收至少包含：

- normal reload
- hard reload
- incognito
- 原本曾使用過網站的舊瀏覽器

確認：姓名、大頭照、slogan、全部名片內容、QR、安裝、分享按鈕，且無「名片載入失敗」。

第二張真實卡 `TW0110`，確認：姓名正確、avatar 正確、不會拿到 TW0001 的 Promise / cache / 資料。

---

## 十一、LINE / Open Graph 分享規則

LINE 分享問題必須與「主名片載入 / 正式部署 / GAS」分開診斷。

已建立 `share/{card_id}.html`，目的是讓社群 crawler 在原始 HTML `<head>` 就能讀到 `og:title` / `og:description` / `og:image` / `og:url`，不能只依賴 JS 動態修改 meta。

### 真人驗收最高優先

第三方工具（Microlink、Open Graph debugger、curl）只能作技術輔助。

最終完成標準是**真人 LINE 分享**，必須真的出現姓名、大頭照/OG 圖、描述。如果真人 LINE 仍只有 URL，不得宣稱完成。

> **狀態：Resolved — Production Accepted**（2026-08-15）。CEO 真人電腦版 LINE 分享 `share/TW0001.html`／`share/TW0110.html` 都正確顯示本人大頭照。後續發現且已修復的是「分享入口有沒有正確指到 `share/{cardId}.html`」這個獨立問題，見第九節。

---

## 十二、LINE A/B 診斷方式

已建立完全獨立的純靜態測試頁：

```text
/share-test-line.html
```

正式 A/B：

- **A**：`/share-test-line.html`（完全靜態：無 JS、無 redirect、無 GAS，使用 1200×630 公開 OG image）
- **B**：`/share/TW0001.html`

判讀：

- A 有預覽、B 沒預覽 → 查 share page / avatar / 圖片尺寸 / 頁面結構
- A、B 都沒預覽 → 查 LINE 對網域的 crawler / cache / 平台處理
- A、B 都有 → 原問題可能為舊 LINE cache / 舊部署版本

不要在 A/B 前持續疊新架構。

> **狀態：Resolved**（2026-08-15）— 真人結果：**A、B 都有預覽，而且 B 正確顯示本人大頭照**。依判讀規則，代表原本的「LINE 完全不分享這個網域」假設是錯的；真正的問題後來定位在「分享入口網址有沒有指到 `share/{cardId}.html`」（見第九節），不是 OG 架構或圖片規格本身。

---

## 十三、LINE OG 圖片規格

目前 TW0001 avatar：JPEG、512×512、約 28 KB、HTTP 200、`Content-Type: image/jpeg`，crawler 可直接 GET，不需 Cookie / 登入。

512×512 與常見 OG 建議 1200×630 存在差異，曾列為候選根因。

> **狀態：Resolved（非根因）**（2026-08-15）— 真人驗收證實 512×512 的 TW0001 avatar 本身可以被 LINE 正常抓取並顯示，**圖片尺寸不是造成分享失敗的原因**。真正問題是分享入口網址（見第九節）。1200×630 規格仍建議作為長期最佳實務保留（風險更低、跨平台相容性更好），但不再視為本次事故的必要修復項目。

---

## 十四、團隊責任分界

| 角色 | 負責範圍 |
|---|---|
| **CEO（Angel）** | 真人使用、正式驗收、最終產品決策 |
| **總策長（ChatGPT）** | 問題分類、完成標準、團隊協調、避免重複錯誤、維運規則整合 |
| **技術長（Codex）** | 技術診斷、架構審查、找 root cause、技術驗收、反對未證實推論 |
| **開發長（Claude Code）** | 實際修改、測試、commit、push、deployment 前後驗證 |
| **Empryon** | 正式站伺服器、網域、憑證、nginx、自動同步、`_deploy.json` |

Empryon 不修改 HSC repo 程式碼。repo 仍是唯一 source of truth。

---

## 十五、P0 標準診斷順序

未來遇到任何「正式站沒更新 / 名片壞掉 / 載入失敗」，一律按照：

- **Gate 1 — Production manifest**：`/_deploy.json`
- **Gate 2 — Cache Stamp**：`?v=` 是否已變
- **Gate 3 — Client Cache**：normal / incognito / SW / Cache Storage
- **Gate 4 — Network**：真正 `GET` / `POST`
- **Gate 5 — Application**：Promise / cache / render / parsing
- **Gate 6 — 真人驗收**：最後才算完成

不要跳著猜。

---

## 十六、正式發布 Gate

今後 HSC production release 固定走：

```text
程式修改
↓
相關 cache stamp 更新
↓
CI check-cache-stamp
↓
測試
↓
Commit
↓
Push main
↓
等待同步
↓
/_deploy.json 確認正式 commit
↓
assets fingerprint 必要時核對
↓
真人 Production 驗收
```

任何一關沒過，不得宣稱正式完成。

---

## 十七、已證明無效／容易誤導的診斷方式（Lessons Learned）

1. **`curl -I GAS`** — HEAD 403 不代表 GAS 壞掉。
2. **單看 GitHub push** — push 成功不代表使用者已拿到新版。
3. **單看 GitHub Pages** — 正式站部署基準不是 GitHub Pages。
4. **單看 Last-Modified** — 不能證明整站是否同步。
5. **query string 不同但 ETag 相同** — 不代表 nginx stale cache。
6. **本機 20/20** — 不代表真人 Production Accepted。
7. **第三方 OG debugger 正常** — 不代表 LINE 真人分享正常。
8. **清 cache 後成功** — 不能直接當 root cause，可能只是把證據洗掉。
9. **非同步資料當成「目前狀態」的來源** — 只要「這次要用哪個 ID／哪筆資料」這件事，網址或呼叫當下就已經百分之百確定，就不能改問一個要等網路請求才會有值的變數（`currentRow`／`facadeCurrentRow`／`facadeBaseData` 這類）。這類變數在請求完成前是 `null`，程式一旦在這個空窗期被使用者觸發，就會落回寫死的預設值（例如 `FACADE_SAMPLE_ID = "TW0001"`），而且錯誤結果還可能被背景 prefetch 存進不會重算的快取變數，變成「看起來已經修好，其實只是暫時沒被踩到」。判斷原則：同步、確定的資訊來源（URL 參數）優先於任何非同步狀態；只有在同步來源本身無法回答問題時，才允許退回非同步資料。詳見第九節。

---

## 十八、GAS 正式部署 Source of Truth 治理（2026-08-16 新增，真人驗收通過）

### 事故摘要

CEO 真人回報「一般文字欄位（服務項目／品牌故事等）清空後，內容還是會留著」的 P0。技術長／開發長追查後發現這不只是單一 bug，還牽出一個更大的既有風險：**正式站 GAS（Apps Script HEAD／deployment #506）跟 GitHub main 早就存在實質落差**——正式站程式碼裡有 27 個以上的函式因為過去有人直接在 Apps Script Editor 上編輯、沒有透過 `clasp push` 回存 repo，被重複宣告（含 `BankImport.js`／`BatchCreate.js`／`CtaManager.js` 這幾個舊檔名殘留檔案）；同時正式站缺少已經寫好、但從未真正部署的：LockService 併發鎖（`confirmPayment_`／`updateCardByToken_`／Ext表寫入）、v500 安全修復（`routeAction_` 錯誤處理曾外洩 stack trace 與原始 request）、system_error_db 錯誤監控＋斷路器＋Email雙軌備援、`resolveValidatedRequestRef_`（ref 防髒資料）、`GAS_batchMaster.js`（雲端主檔儲存）等一整批已完成但沒上線的修復。

### 逐項驗證，不是憑印象判斷

依技術長指令，逐函式（不是逐行）比對正式站實際生效版本跟 repo：確認**沒有任何一個正式站正在使用的活躍功能，會因為改用 repo 覆蓋而遺失**（production-only 函式清單為零）；27 個重複函式裡，26 個「正式站真正生效的那一份（後面宣告蓋掉前面）」跟 repo 逐字相同，純粹是清理不乾淨的死碼。

### 正式結案

1. **一般文字欄位無法清空 P0**：Root cause 是 `shouldApplyUpdateValue_`（`GAS_main.js`）把「欄位沒送」跟「欄位送了空字串」當成同一件事，一般文字欄位只要送空字串就被跳過、舊值原封不動——不是內容復活，是從一開始就沒被真正清空過。修正比照既有照片／CTA 欄位的正確語意（一律允許套用，不新增第二套規則）。Commit `663a672`。Case A～E（欄位未送／清空／改新值／原值已空／多欄互不干擾）**全部直接對 `card_db` 真值驗證**，不是只看 API 回傳 success。
2. **GAS Production Baseline Catch-up**：部署前跑完整 Gate（名片讀寫／快取失效、付款 LockService 併發不死鎖、referral ref 驗證、`routeAction_` 安全性、663a672 Case A-E），全數通過、零 Blocker，才正式：`clasp push` 清掉舊檔名孤兒檔案 → 建立新 immutable version #507 → 既有正式 deployment（`AKfycbycjN-...`，deployment ID 不變，nginx 代理設定不用改）改指向 #507。部署後 smoke test（ping／getCardPublicShell TW0001／getCardPublicLite TW0110／測試卡更新清空／前台立即反映）全數通過。

> **狀態：Resolved — Production Accepted**（2026-08-16，CEO 正式收下：663a672 已實際進入 GAS #507，Case A-E 對 `card_db` 真值驗證；GAS Production Baseline Catch-up 部署前後 Gate 都驗證過，不是整包直接覆蓋）。

### 正式規則（往後任何 GAS 部署都適用）

> **GAS 正式部署以 GitHub main 為唯一程式來源；不得再直接在 Apps Script Editor 做正式功能修改後不回存 repo。Apps Script deployment version、`HSC_VERSION`、Git commit hash 是三種獨立編號，不可互相取代判斷「正式站現在到底在跑什麼」——Git commit hash 才是主要 source trace。**

原因：這次「正式站跟 repo 分岔」的根源，就是曾經有人繞過 `clasp push` 直接在 Apps Script Editor 上動正式程式碼，導致修改沒有回存 git，長期累積成一批「repo 不知道、正式站默默在跑」的內容，也讓 `HSC_VERSION` 字串（人工維護的標記）跟實際部署內容脫鉤（正式站曾經回報 `HSC_VERSION="v465"`，但實際內容已經包含後續好幾輪修復）。往後每次要改 GAS，一律：改 `GAS_main.js`／`GAS_*.js` → commit → `clasp push` → 驗證 → `clasp deploy`／`redeploy` 更新既有 deployment，不允許任何「先在 Apps Script Editor 上改、之後有空再回補 git」的操作順序。

### Rollback 點記錄

- 舊 deployment version：**#506**（immutable，內容已在本機備份保存，一行指令即可切回：`clasp update-deployment AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E --versionNumber 506`）
- 新 deployment version：**#507**（= GitHub main，含 commit `663a672`）

### Cleanup / Must Remove（收尾追蹤，不影響業務但不該長期留著）

1. **LINE 系統例外警示（誤報說明，非事故）**：Gate F 驗收時故意觸發 `updateCardByToken` 錯誤來測試安全修復，該 action 在 `CRITICAL_ACTIONS_` 名單內，會觸發真的 LINE 警示推播。**這則警示是這次驗收測試造成的，不是正式事故**，往後看到同一時間點的警示可以對照這份記錄排除。
2. **`request_db` 測試資料待人工清除**：3 筆備註為 `HSC_BASELINE_GATE_TEST_DELETE_ME` 的申請記錄，狀態 pending、沒有連結任何邀請碼或卡片，不影響任何業務邏輯或分潤計算。目前沒有對應的刪除 API，需要後台人工從試算表刪除。

---

## 十九、文件維護規則

未來每次有新的 Production P0 / 部署事故 / 快取事故 / 分享事故 / GAS 行為差異 / 真人驗收 lesson，只有在**已驗證**之後，才更新這份文件。

不要把尚未證實的猜測寫成正式規則。尚未驗收的項目要明確標示：

```text
Pending / Candidate / Under Investigation
```
