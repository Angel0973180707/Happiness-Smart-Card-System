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

> **狀態：Pending** — 這份 workflow 尚未實際建立於 repo 內，內容需先經安全審查（不得含外部不可信腳本、不得洩漏 secret、不得自動修改 production、不得自動 deploy）才能納入 `.github/workflows/`。

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

## 九、正式名片 P0 驗收標準

主名片 `TW0001`，正式站驗收至少包含：

- normal reload
- hard reload
- incognito
- 原本曾使用過網站的舊瀏覽器

確認：姓名、大頭照、slogan、全部名片內容、QR、安裝、分享按鈕，且無「名片載入失敗」。

第二張真實卡 `TW0110`，確認：姓名正確、avatar 正確、不會拿到 TW0001 的 Promise / cache / 資料。

---

## 十、LINE / Open Graph 分享規則

LINE 分享問題必須與「主名片載入 / 正式部署 / GAS」分開診斷。

已建立 `share/{card_id}.html`，目的是讓社群 crawler 在原始 HTML `<head>` 就能讀到 `og:title` / `og:description` / `og:image` / `og:url`，不能只依賴 JS 動態修改 meta。

### 真人驗收最高優先

第三方工具（Microlink、Open Graph debugger、curl）只能作技術輔助。

最終完成標準是**真人 LINE 分享**，必須真的出現姓名、大頭照/OG 圖、描述。如果真人 LINE 仍只有 URL，不得宣稱完成。

---

## 十一、LINE A/B 診斷方式

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

> **狀態：Under Investigation** — A/B 兩條網址已建立並可供真人測試，尚未取得真人 LINE 分享結果。

---

## 十二、LINE OG 圖片規格

目前 TW0001 avatar：JPEG、512×512、約 28 KB、HTTP 200、`Content-Type: image/jpeg`，crawler 可直接 GET，不需 Cookie / 登入。

但 512×512 與常見 OG 建議 1200×630 存在差異。

> **狀態：Candidate** — 這目前只能列為候選因素，不能未驗證就當 root cause。

---

## 十三、團隊責任分界

| 角色 | 負責範圍 |
|---|---|
| **CEO（Angel）** | 真人使用、正式驗收、最終產品決策 |
| **總策長（ChatGPT）** | 問題分類、完成標準、團隊協調、避免重複錯誤、維運規則整合 |
| **技術長（Codex）** | 技術診斷、架構審查、找 root cause、技術驗收、反對未證實推論 |
| **開發長（Claude Code）** | 實際修改、測試、commit、push、deployment 前後驗證 |
| **Empryon** | 正式站伺服器、網域、憑證、nginx、自動同步、`_deploy.json` |

Empryon 不修改 HSC repo 程式碼。repo 仍是唯一 source of truth。

---

## 十四、P0 標準診斷順序

未來遇到任何「正式站沒更新 / 名片壞掉 / 載入失敗」，一律按照：

- **Gate 1 — Production manifest**：`/_deploy.json`
- **Gate 2 — Cache Stamp**：`?v=` 是否已變
- **Gate 3 — Client Cache**：normal / incognito / SW / Cache Storage
- **Gate 4 — Network**：真正 `GET` / `POST`
- **Gate 5 — Application**：Promise / cache / render / parsing
- **Gate 6 — 真人驗收**：最後才算完成

不要跳著猜。

---

## 十五、正式發布 Gate

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

## 十六、已證明無效／容易誤導的診斷方式（Lessons Learned）

1. **`curl -I GAS`** — HEAD 403 不代表 GAS 壞掉。
2. **單看 GitHub push** — push 成功不代表使用者已拿到新版。
3. **單看 GitHub Pages** — 正式站部署基準不是 GitHub Pages。
4. **單看 Last-Modified** — 不能證明整站是否同步。
5. **query string 不同但 ETag 相同** — 不代表 nginx stale cache。
6. **本機 20/20** — 不代表真人 Production Accepted。
7. **第三方 OG debugger 正常** — 不代表 LINE 真人分享正常。
8. **清 cache 後成功** — 不能直接當 root cause，可能只是把證據洗掉。

---

## 十七、文件維護規則

未來每次有新的 Production P0 / 部署事故 / 快取事故 / 分享事故 / GAS 行為差異 / 真人驗收 lesson，只有在**已驗證**之後，才更新這份文件。

不要把尚未證實的猜測寫成正式規則。尚未驗收的項目要明確標示：

```text
Pending / Candidate / Under Investigation
```
