# form.html（完整覆蓋版）

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>天使幸福智慧名片｜申請表單</title>
  <link rel="stylesheet" href="./style.css" />
  <link rel="stylesheet" href="./form.css" />
</head>
<body class="hsc-form-page">
  <main class="form-shell">
    <header class="page-hero">
      <div>
        <p class="eyebrow">天使幸福智慧名片</p>
        <h1 id="page-title">智慧名片申請表</h1>
        <p class="hero-desc" id="page-desc">請填寫名片資料，送出後系統會建立申請與名片資訊。</p>
      </div>
      <div class="hero-actions">
        <span class="mode-ribbon" id="mode-ribbon">建卡申請</span>
        <button type="button" class="ghost-btn" id="btn-open-showcase">參考門面頁</button>
      </div>
    </header>

    <div class="status-strip" id="form-status-strip" role="status" aria-live="polite"></div>

    <form id="smart-card-form" novalidate>
      <input type="hidden" id="invite_code" name="invite_code" value="" />
      <input type="hidden" id="ref" name="ref" value="" />
      <input type="hidden" id="token" name="token" value="" />
      <input type="hidden" id="card_id" name="card_id" value="" />
      <input type="hidden" id="mode" name="mode" value="create" />

      <section class="form-card" id="mode-intro-card">
        <div class="section-head">
          <div>
            <p class="section-kicker">目前流程</p>
            <h2 id="mode-headline">建卡模式</h2>
            <p id="mode-copy">第一次建立智慧名片，請完整填寫資料與上傳圖片。</p>
          </div>
          <div class="mode-badges" id="mode-badges"></div>
        </div>
      </section>

      <section class="form-card" id="section-plan-addons">
        <div class="section-head">
          <div>
            <p class="section-kicker">步驟 1</p>
            <h2 id="step1-title">選方案與加購</h2>
            <p id="step1-desc">不同方案包含的照片張數與按鈕數不同，如有需要可再加購。</p>
          </div>
          <div class="limit-badges">
            <span class="pill" id="summary-plan-pill">請先選擇方案</span>
            <span class="pill" id="summary-photo-pill">照片牆：-</span>
            <span class="pill" id="summary-cta-pill">按鈕：-</span>
          </div>
        </div>

        <div class="plan-grid">
          <label class="plan-option" data-plan-card="free">
            <input type="radio" name="plan" value="free" />
            <span class="plan-card">
              <span class="plan-title-row">
                <span class="plan-title">自由搭配</span>
                <span class="plan-price-tag">NT$ 1,500</span>
              </span>
              <span class="plan-meta">可自選顏色、版型、紙感</span>
              <span class="plan-mini">個人照 1 ／ Logo 1 ／ 照片牆 2 ／ 按鈕 1</span>
            </span>
          </label>
          <label class="plan-option" data-plan-card="premium">
            <input type="radio" name="plan" value="premium" />
            <span class="plan-card premium-plan-card">
              <span class="plan-title-row">
                <span class="plan-title">精品設計</span>
                <span class="plan-price-tag">NT$ 2,000</span>
              </span>
              <span class="plan-meta">精品配色、玻璃質感、精品色系</span>
              <span class="plan-mini">個人照 1 ／ Logo 1 ／ 照片牆 5 ／ 按鈕 3</span>
            </span>
          </label>
        </div>

        <div class="addon-layout">
          <div class="addon-stack">
            <label class="addon-item"><input type="checkbox" id="addon_marquee_enabled" name="addons" value="addon_marquee" /><div class="addon-content"><strong>跑馬燈加購</strong><small>開啟重要訊息輪播區。</small></div><span class="addon-price-tag">NT$ 300</span></label>
            <label class="addon-item"><input type="checkbox" id="addon_photo_enabled" name="addons" value="addon_photo" /><div class="addon-content"><strong>照片牆加購</strong><small>每張 NT$ 100，可再增加照片牆張數。</small></div><span class="addon-price-tag">NT$ 100 / 張</span><span class="addon-number-wrap"><input type="number" id="addon_photo_qty" min="0" max="10" value="0" /></span></label>
            <label class="addon-item"><input type="checkbox" id="addon_cta_enabled" name="addons" value="addon_cta" /><div class="addon-content"><strong>快速按鈕加購</strong><small>每個 NT$ 100，可再增加行動按鈕。</small></div><span class="addon-price-tag">NT$ 100 / 個</span><span class="addon-number-wrap"><input type="number" id="addon_cta_qty" min="0" max="10" value="0" /></span></label>
            <label class="addon-item addon-item-gold"><input type="checkbox" id="addon_update_unlimited_enabled" name="addons" value="addon_update_unlimited" /><div class="addon-content"><strong>無限次更新加購 <span class="gold-badge">年度權益</span></strong><small>更新與續約模式都會清楚標示這項權益，新年度需重新加購後才生效。</small></div><span class="addon-price-tag">NT$ 300</span></label>
            <label class="addon-item"><input type="checkbox" id="addon_bundle_enabled" name="addons" value="addon_bundle" /><div class="addon-content"><strong>跑馬燈＋無限更新組合</strong><small>一次勾選兩項權益。</small></div><span class="addon-price-tag">NT$ 500</span></label>
          </div>

          <div class="quote-box">
            <div class="quote-head">
              <div>
                <h3>報價摘要</h3>
                <p class="section-copy">系統會依目前模式自動顯示建卡、更新或續約金額。</p>
              </div>
              <span class="quote-state" id="quote-state-text">尚未計價</span>
            </div>
            <div class="quote-lines">
              <div class="quote-line"><span>方案金額</span><strong id="quote-plan-amount">-</strong></div>
              <div class="quote-line"><span>加購金額</span><strong id="quote-addon-amount">-</strong></div>
              <div class="quote-line quote-total"><span>總價</span><strong id="quote-total-amount">-</strong></div>
            </div>
            <div class="quote-breakdown" id="quote-addon-breakdown"></div>
          </div>
        </div>
      </section>

      <section class="form-card" id="section-style">
        <div class="section-head">
          <div>
            <p class="section-kicker">步驟 2</p>
            <h2>名片樣式</h2>
          </div>
        </div>
        <div class="grid-two">
          <div id="free-theme-group" style="display:flex;flex-direction:column;gap:12px;">
            <div class="field-group"><label class="field-label" for="free_color">顏色</label><select id="free_color"><option value="c1">粉</option><option value="c2">藍</option><option value="c3">橘</option><option value="c4">紫</option><option value="c5">綠</option></select></div>
            <div class="field-group"><label class="field-label" for="free_style">版型</label><select id="free_style"><option value="s1">弧形</option><option value="s2">平版</option><option value="s3">聚光</option></select></div>
            <div class="field-group"><label class="field-label" for="free_paper">紙感</label><select id="free_paper"><option value="f1">紙感 1</option><option value="f2">紙感 2</option><option value="f3">紙感 3</option></select></div>
          </div>
          <div id="premium-theme-group" style="display:flex;flex-direction:column;gap:12px;">
            <div class="field-group"><label class="field-label" for="premium_color">精品色系</label><select id="premium_color"><option value="p1">玫瑰石英</option><option value="p2">勃艮第</option><option value="p3">午夜靛藍</option><option value="p4">薰衣草紫</option><option value="p5">月光銀</option><option value="p6">流金琉璃</option><option value="p7">可可棕</option></select><p class="field-hint">精品方案僅選色，版型與紙感由系統套用。</p></div>
          </div>
        </div>
      </section>

      <section class="form-card" id="section-basic-fields">
        <div class="section-head">
          <div>
            <p class="section-kicker">步驟 3</p>
            <h2 id="basic-fields-title">基本資料</h2>
            <p>✱ 為必填欄位</p>
          </div>
        </div>
        <div class="grid-two">
          <div class="field-group"><label class="field-label" for="display_name">✱ 姓名 ／ 品牌名稱</label><input type="text" id="display_name" required /></div>
          <div class="field-group"><label class="field-label" for="unit">單位 ／ 公司</label><input type="text" id="unit" /></div>
          <div class="field-group"><label class="field-label" for="title">職稱 ／ 副標</label><input type="text" id="title" /></div>
          <div class="field-group"><label class="field-label" for="phone">✱ 電話</label><input type="tel" id="phone" required /></div>
          <div class="field-group"><label class="field-label" for="email">Email</label><input type="email" id="email" /></div>
          <div class="field-group"><label class="field-label" for="website">網站</label><input type="url" id="website" /></div>
          <div class="field-group"><label class="field-label" for="line_url">LINE 個人頁</label><input type="url" id="line_url" /></div>
          <div class="field-group"><label class="field-label" for="line_oa">LINE 官方帳號</label><input type="text" id="line_oa" /></div>
          <div class="field-group"><label class="field-label" for="wechat_id">微信 ID</label><input type="text" id="wechat_id" /></div>
          <div class="field-group"><label class="field-label" for="experience">經歷</label><textarea id="experience" rows="4"></textarea></div>
          <div class="field-group full-width"><label class="field-label" for="services">服務項目</label><textarea id="services" rows="3"></textarea></div>
          <div class="field-group full-width"><label class="field-label" for="address">地址</label><input type="text" id="address" /></div>
          <div class="field-group full-width"><label class="field-label" for="intro">品牌金句 ／ 簡介</label><textarea id="intro" rows="4"></textarea></div>
          <div class="field-group"><label class="field-label" for="referrer">推薦人（選填）</label><input type="text" id="referrer" placeholder="若有推薦人或服務窗口，可填寫代號或姓名" /><p class="field-hint">若由代理、朋友或服務窗口協助，可填寫以便後續確認。</p></div>
        </div>
      </section>

      <section class="form-card" id="section-links">
        <div class="section-head"><div><p class="section-kicker">步驟 4</p><h2>影音／社群連結</h2><p>填入平台頁面網址，會顯示在名片的影音／社群區塊。</p></div></div>
        <div class="grid-two">
          <div class="field-group full-width"><p class="field-label">影音平台連結（最多 3 個）</p></div>
          <div class="field-group"><label class="field-label" for="video1">影音連結 1</label><input type="url" id="video1" /></div>
          <div class="field-group"><label class="field-label" for="video2">影音連結 2</label><input type="url" id="video2" /></div>
          <div class="field-group"><label class="field-label" for="video3">影音連結 3</label><input type="url" id="video3" /></div>
          <div class="field-group full-width"><p class="field-label">社群連結（最多 3 個）</p></div>
          <div class="field-group"><label class="field-label" for="social1">社群連結 1</label><input type="url" id="social1" /></div>
          <div class="field-group"><label class="field-label" for="social2">社群連結 2</label><input type="url" id="social2" /></div>
          <div class="field-group"><label class="field-label" for="social3">社群連結 3</label><input type="url" id="social3" /></div>
        </div>
      </section>

      <section class="form-card" id="section-photos">
        <div class="section-head"><div><p class="section-kicker">步驟 5</p><h2>圖片上傳</h2><p>個人照、Logo、橫幅圖、照片牆分區上傳；橫幅圖先作預覽用途。</p></div></div>
        <div id="photo-slots" class="photo-sections"></div>
      </section>

      <section class="form-card" id="section-cta">
        <div class="section-head"><div><p class="section-kicker">步驟 6</p><h2>快速行動按鈕</h2><p>每個按鈕可設定一段文字與對應連結。</p></div></div>
        <div id="cta-slots" class="cta-stack"></div>
      </section>

      <section id="marquee-section" class="form-card hidden">
        <div class="section-head"><div><p class="section-kicker">步驟 7</p><h2>跑馬燈訊息</h2><p>若有多段訊息，請用「｜」隔開，系統會自動輪播顯示。</p></div></div>
        <div class="field-group"><label class="field-label" for="marquee_text">跑馬燈內容</label><textarea id="marquee_text" rows="3"></textarea><p class="field-hint">每段以「｜」隔開，不需分行。</p></div>
      </section>

      <section class="form-card hidden" id="section-update-eligibility">
        <div class="section-head"><div><p class="section-kicker">更新權益</p><h2>更新方式說明</h2><p>系統會自動判斷：無限次更新、年度免費更新，或本次需建立付款資訊。</p></div></div>
        <div class="eligibility-box" id="eligibility-box"></div>
      </section>

      <section class="form-card hidden" id="section-renew">
        <div class="section-head"><div><p class="section-kicker">續約設定</p><h2>續約內容確認</h2><p>續約會帶出目前名片與既有加購。照片與按鈕數量預設沿用目前設定；若減少數量，差額不另退回。</p></div></div>
        <div class="grid-two">
          <div class="renew-option-stack">
            <div class="field-group"><label class="field-label" for="renew_target_plan">續約方案</label><select id="renew_target_plan"><option value="free">自由搭配</option><option value="premium">精品設計</option></select></div>
            <label class="addon-item"><input type="checkbox" id="renew_keep_marquee" /><div class="addon-content"><strong>延續跑馬燈</strong><small>若目前已有跑馬燈，可在新年度延續。</small></div></label>
            <label class="addon-item"><input type="checkbox" id="renew_update_unlimited" /><div class="addon-content"><strong>新年度無限次更新</strong><small>若要延續無限次更新，新年度需重新加購後才生效。</small></div><span class="addon-price-tag">NT$ 300</span></label>
            <div class="renew-addon-card">
              <div class="field-group"><label class="field-label" for="renew_photo_extra_qty">照片額外增加數量</label><input type="number" id="renew_photo_extra_qty" value="0" min="0" max="10" /></div>
              <div class="field-group"><label class="field-label" for="renew_cta_extra_qty">按鈕額外增加數量</label><input type="number" id="renew_cta_extra_qty" value="0" min="0" max="10" /></div>
            </div>
            <div class="renew-rule" id="renew-rule-text"></div>
          </div>
          <div class="summary-stack">
            <div class="summary-box" id="renew-summary-box"></div>
            <div class="summary-box" id="renew-addon-box"></div>
          </div>
        </div>
      </section>

      <section class="form-card hidden" id="section-renew-card-copy">
        <div class="section-head"><div><p class="section-kicker">目前資料</p><h2>目前名片與既有加購</h2><p>此區僅供確認續約內容，不會直接修改目前名片資料。</p></div></div>
        <div class="grid-two">
          <div class="renew-card-copy"><h3>目前名片資料</h3><div id="renew-card-data" class="read-card-grid"></div></div>
          <div class="renew-card-copy"><h3>目前加購摘要</h3><div id="renew-addon-data" class="summary-stack"></div></div>
        </div>
      </section>

      <section class="form-card" id="section-preview">
        <div class="section-head"><div><p class="section-kicker">成品預覽</p><h2>預覽畫面</h2><p>填寫內容後會即時顯示預覽，方便確認整體呈現。</p></div></div>
        <div class="preview-section">
          <div class="preview-card-board"><div id="livePreviewCard" class="hsc-render-root" aria-live="polite"></div></div>
          <div class="preview-card">
            <h3>預覽說明</h3>
            <p class="hint">建卡時可即時查看成品樣貌。</p>
            <p class="hint">更新時會先帶入原本內容，再顯示新的預覽。</p>
            <p class="hint">續約時會顯示目前名片摘要與續約內容。</p>
            <div class="section-divider"></div>
            <div id="renew-preview-summary" class="hint hidden"></div>
          </div>
        </div>
      </section>

      <section class="form-card">
        <div class="action-row">
          <button type="button" class="ghost-btn" id="btn-save-draft">暫存草稿</button>
          <button type="button" class="ghost-btn" id="btn-clear-draft">清除暫存</button>
          <button type="button" class="line-btn" id="btn-contact-service">聯繫客服</button>
          <button type="submit" class="primary-btn" id="btn-submit-form">送出申請</button>
        </div>
        <div class="progress-wrap hidden" id="submitProgressWrap">
          <div class="progress-head"><strong id="submitProgressTitle">送出中</strong><span id="submitProgressPercent">0%</span></div>
          <div class="progress-bar"><div class="progress-fill" id="submitProgressFill"></div></div>
          <div class="progress-text" id="submitProgressText">準備中…</div>
        </div>
        <div class="result-box hidden" id="successBox">
          <div class="result-copy-wrap">
            <div class="result-serial">序號：<span id="successId">-</span></div>
            <p class="hint" id="successDesc">以下內容可直接貼給客服，方便協助你快速確認與開通。</p>
            <textarea id="successCopyText" readonly></textarea>
            <div class="result-actions">
              <button id="btnCopyReply" type="button" class="ghost-btn">一鍵複製序號＋客服文案</button>
              <button id="btnLineOA" type="button" class="line-btn">回覆客服</button>
            </div>
          </div>
        </div>
      </section>
    </form>
  </main>

  <div id="submit-progress-overlay" class="progress-overlay hidden">
    <div class="progress-card">
      <h3 class="progress-title">資料送出中</h3>
      <p class="progress-text" id="progress-text">正在整理資料，請稍候。</p>
      <div class="progress-bar"><div id="progress-fill" class="progress-fill"></div></div>
      <ul class="progress-steps">
        <li>1. 整理表單與摘要</li>
        <li>2. 驗證更新或續約內容</li>
        <li>3. 建立資料或付款資訊</li>
        <li>4. 產出客服回覆內容</li>
      </ul>
      <div class="service-actions"><button type="button" class="line-btn" id="progress-contact-service">回覆客服</button></div>
    </div>
  </div>

  <template id="photo-slot-template">
    <article class="photo-card">
      <div class="photo-head"><strong class="photo-title"></strong><span class="badge" data-upload-state="idle">尚未上傳</span></div>
      <div class="preview-frame"><img class="preview-image hidden" alt="預覽圖" /><div class="preview-empty">尚未選擇圖片</div></div>
      <div class="photo-right-col">
        <input type="file" class="photo-file-input" accept="image/*" />
        <div class="photo-tools hidden">
          <div class="photo-tool-row"><button type="button" class="ghost-btn rotate-left">左轉</button><button type="button" class="ghost-btn rotate-right">右轉</button><button type="button" class="ghost-btn move-left">左移</button><button type="button" class="ghost-btn move-right">右移</button><button type="button" class="ghost-btn move-up">上移</button><button type="button" class="ghost-btn move-down">下移</button><button type="button" class="ghost-btn reset-photo">重設</button><button type="button" class="warn-btn clear-photo">清除</button></div>
          <input type="range" class="zoom-range" min="0.6" max="2" step="0.01" value="1" />
        </div>
      </div>
    </article>
  </template>

  <template id="cta-slot-template">
    <article class="cta-slot-card">
      <label class="cta-title-label"></label>
      <div class="field-group"><label class="field-label">按鈕文字</label><input type="text" class="cta-label-input" /></div>
      <div class="field-group"><label class="field-label">按鈕連結</label><input type="url" class="cta-url-input" /></div>
    </article>
  </template>

  <script src="./card-renderer.js"></script>
  <script type="module" src="./form.js"></script>
</body>
</html>
```

# form.js（完整覆蓋版）

```javascript
/* form.js v8.2.1-canvas-complete-overwrite */
import {
  initFirebase,
  ensureAuth,
  uploadAvatar,
  uploadLogo,
  uploadPhoto
} from "./firebase.js";

const CONFIG = {
  GAS:
    window.HSC_GAS_URL ||
    localStorage.getItem("HSC_GAS_URL") ||
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL:
    window.HSC_CUSTOMER_SERVICE_URL ||
    "https://lin.ee/G3VJoRm",
  HUB_BASE_URL:
    window.HSC_HUB_BASE_URL ||
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  VERSION: "v8.2.1-canvas-complete-overwrite",
  MAX_PHOTOS: 10,
  MAX_CTAS: 3,
  PLAN_PRICE: { free: 1500, premium: 2000 },
  BASE_LIMITS: {
    free: { photos: 2, ctas: 1 },
    premium: { photos: 5, ctas: 3 }
  },
  ADDON_PRICE: {
    marquee: 300,
    photo: 100,
    cta: 100,
    update_unlimited: 300,
    bundle: 500
  }
};

const state = {
  mode: "create",
  cardId: "",
  updateToken: "",
  currentCard: null,
  currentLead: null,
  updateEligibility: null,
  renewalSummary: null,
  planOptions: null,
  photoMeta: {},
  previewMeta: {},
  cropMeta: {},
  photoPreviewUrls: {},
  slotFiles: {},
  slotBlobs: {},
  slotRemoteUrls: {},
  slotKeys: {},
  slotTransforms: {},
  submitResult: null,
  submitting: false
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clean(v) {
  return String(v == null ? "" : v).trim();
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v) {
  const s = clean(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on" || v === true;
}

function normalizeBoolField(v) {
  return toBool(v) ? "TRUE" : "FALSE";
}

function getQuery(key) {
  return new URL(location.href).searchParams.get(key) || "";
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  if (el.type === "checkbox") return el.checked ? "TRUE" : "FALSE";
  return clean(el.value);
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") {
    el.checked = !!value && value !== "FALSE";
    return;
  }
  el.value = value == null ? "" : String(value);
}

function show(el, yes = true) {
  if (!el) return;
  el.classList.toggle("hidden", !yes);
  if (yes) el.style.display = "";
}

function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.style.display = "";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function pick(obj, ...keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v != null && clean(v) !== "") return v;
  }
  return "";
}

function debounce(fn, delay = 160) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function shallowClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function buildCardUrl(cardId) {
  const id = clean(cardId);
  if (!id) return "";
  const base = CONFIG.HUB_BASE_URL.replace(/\/+$/, "/");
  return `${base}?id=${encodeURIComponent(id)}`;
}

function getSelectedPlan() {
  const checked = document.querySelector('input[name="plan"]:checked');
  return checked ? clean(checked.value).toLowerCase() : "free";
}

function mapPlanTheme() {
  const plan = getSelectedPlan();
  if (plan === "premium") {
    return {
      plan: "premium",
      color: getVal("premium_color") || "p1",
      style: "",
      paper: ""
    };
  }
  return {
    plan: "free",
    color: getVal("free_color") || "c1",
    style: getVal("free_style") || "s1",
    paper: getVal("free_paper") || "f1"
  };
}

function getPhotoExtraQty() {
  const enabled = $("#addon_photo_enabled")?.checked;
  return enabled ? Math.max(0, num($("#addon_photo_qty")?.value, 0)) : 0;
}

function getCtaExtraQty() {
  const enabled = $("#addon_cta_enabled")?.checked;
  return enabled ? Math.max(0, num($("#addon_cta_qty")?.value, 0)) : 0;
}

function getPhotoLimit() {
  const plan = getSelectedPlan();
  const base = CONFIG.BASE_LIMITS[plan]?.photos || 0;
  return Math.min(CONFIG.MAX_PHOTOS, base + getPhotoExtraQty());
}

function getCtaLimit() {
  const plan = getSelectedPlan();
  const base = CONFIG.BASE_LIMITS[plan]?.ctas || 0;
  return Math.min(CONFIG.MAX_CTAS, base + getCtaExtraQty());
}

function isCreateMode() { return state.mode === "create"; }
function isUpdateMode() { return state.mode === "update"; }
function isRenewMode() { return state.mode === "renew"; }

function unwrapCard(res) {
  return res?.card || res?.data?.card || res?.result?.card || res?.data || null;
}

function unwrapLead(res) {
  return res?.lead || res?.data?.lead || res?.result?.lead || null;
}

function unwrapPayment(res) {
  return res?.payment || res?.data?.payment || res?.result?.payment || null;
}

function pickId(res, ...keys) {
  for (const key of keys) {
    const value = res?.[key] ?? res?.data?.[key] ?? res?.result?.[key];
    if (clean(value)) return clean(value);
  }
  return "";
}

function getDraftKey() {
  const mode = state.mode || "create";
  const token = clean(state.updateToken || getQuery("token"));
  const cardId = clean(state.cardId || getQuery("card_id"));
  return `HSC_FORM_DRAFT_${mode}_${token || cardId || "new"}`;
}

async function callApi(action, params = {}, method = "POST") {
  const url = CONFIG.GAS;
  const payload = new URLSearchParams();
  payload.set("action", action);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const str = String(value);
    if (str === "") return;
    payload.set(key, str);
  });

  let raw = "";
  try {
    if (String(method).toUpperCase() === "GET") {
      const qs = payload.toString();
      raw = await fetch(`${url}?${qs}`, { method: "GET", credentials: "omit" }).then(r => r.text());
    } else {
      raw = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: payload.toString(),
        credentials: "omit"
      }).then(r => r.text());
    }
  } catch (error) {
    return { ok: false, error: `Network Error: ${error?.message || "request failed"}` };
  }

  try {
    return JSON.parse(raw);
  } catch (_) {
    return { ok: false, error: "Invalid JSON", raw };
  }
}

function setStatus(text = "", isError = false) {
  const strip = $("#form-status-strip");
  if (!strip) return;
  strip.textContent = clean(text);
  strip.classList.toggle("is-error", !!isError);
}

function renderProgress(percent = 0, text = "處理中…", title = "資料處理中") {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));

  const fill1 = $("#submitProgressFill");
  const pct1 = $("#submitProgressPercent");
  const text1 = $("#submitProgressText");
  const title1 = $("#submitProgressTitle");
  const wrap1 = $("#submitProgressWrap");

  const fill2 = $("#progress-fill");
  const text2 = $("#progress-text");
  const overlay = $("#submit-progress-overlay");

  if (fill1) fill1.style.width = `${safe}%`;
  if (pct1) pct1.textContent = `${safe}%`;
  if (text1) text1.textContent = text;
  if (title1) title1.textContent = title;
  if (wrap1) show(wrap1, safe > 0 && safe < 100);

  if (fill2) fill2.style.width = `${safe}%`;
  if (text2) text2.textContent = text;
  if (overlay) show(overlay, safe > 0 && safe < 100);
}

function hideProgress() {
  renderProgress(0, "準備中…", "資料處理中");
  hide($("#submitProgressWrap"));
  hide($("#submit-progress-overlay"));
}

function showError(message, detail = "") {
  const text = [clean(message), clean(detail)].filter(Boolean).join("｜");
  setStatus(text || "發生錯誤，請稍後再試", true);
}

function applyModeText() {
  const title = $("#page-title");
  const desc = $("#page-desc");
  const ribbon = $("#mode-ribbon");
  const headline = $("#mode-headline");
  const copy = $("#mode-copy");
  const submitBtn = $("#btn-submit-form");
  const step1Title = $("#step1-title");
  const step1Desc = $("#step1-desc");
  const basicTitle = $("#basic-fields-title");

  if (isCreateMode()) {
    title.textContent = "智慧名片申請表";
    desc.textContent = "請填寫名片資料，送出後系統會建立申請與名片資訊。";
    ribbon.textContent = "建卡申請";
    headline.textContent = "建卡模式";
    copy.textContent = "第一次建立智慧名片，請完整填寫資料與上傳圖片。";
    submitBtn.textContent = "送出申請";
    step1Title.textContent = "選方案與加購";
    step1Desc.textContent = "不同方案包含的照片張數與按鈕數不同，如有需要可再加購。";
    basicTitle.textContent = "基本資料";
  } else if (isUpdateMode()) {
    title.textContent = "智慧名片資料更新";
    desc.textContent = "請確認並修改需要更新的內容，系統會依權益判斷是否需付費。";
    ribbon.textContent = "資料更新";
    headline.textContent = "更新模式";
    copy.textContent = "系統會先帶入原本資料，更新後可立即預覽。";
    submitBtn.textContent = "送出更新";
    step1Title.textContent = "確認方案與加購";
    step1Desc.textContent = "此區會顯示目前方案與相關加購，供你確認。";
    basicTitle.textContent = "名片資料";
  } else {
    title.textContent = "智慧名片續約申請";
    desc.textContent = "請確認目前名片與續約內容，系統會建立本次續約付款資訊。";
    ribbon.textContent = "續約申請";
    headline.textContent = "續約模式";
    copy.textContent = "這裡會帶出原卡資料與既有加購，方便確認本次續約內容。";
    submitBtn.textContent = "送出續約";
    step1Title.textContent = "續約內容";
    step1Desc.textContent = "請確認原方案、原加購與本次續約設定。";
    basicTitle.textContent = "名片資料摘要";
  }
}

function renderModeUI() {
  applyModeText();
  show($("#section-update-eligibility"), isUpdateMode());
  show($("#section-renew"), isRenewMode());
  show($("#section-renew-card-copy"), isRenewMode());

  show($("#section-plan-addons"), !isRenewMode());
  show($("#section-style"), !isRenewMode());
  show($("#section-basic-fields"), !isRenewMode());
  show($("#section-links"), !isRenewMode());
  show($("#section-photos"), !isRenewMode());
  show($("#section-cta"), !isRenewMode());
  show($("#marquee-section"), !isRenewMode() && !!$("#addon_marquee_enabled")?.checked);

  const modeBadges = $("#mode-badges");
  if (!modeBadges) return;
  modeBadges.innerHTML = "";
  const labels = isCreateMode()
    ? ["建立資料", "上傳圖片", "送出申請"]
    : isUpdateMode()
      ? ["載入原資料", "確認更新權益", "送出更新"]
      : ["帶出原卡", "確認續約內容", "建立付款資訊"];
  labels.forEach((label) => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = label;
    modeBadges.appendChild(span);
  });
}

function hydrateQueryParams() {
  const mode = getQuery("mode") || "create";
  const token = getQuery("token");
  const cardId = getQuery("card_id");
  const inviteCode = getQuery("invite_code");
  const ref = getQuery("ref");

  setVal("mode", mode);
  setVal("token", token);
  setVal("card_id", cardId);
  setVal("invite_code", inviteCode);
  setVal("ref", ref);

  if (ref && !clean($("#referrer")?.value)) {
    setVal("referrer", ref);
  }
}

function collectDraftData() {
  const ids = [
    "invite_code", "ref", "referrer", "token", "card_id", "mode",
    "display_name", "unit", "title", "phone", "email", "website",
    "line_url", "line_oa", "wechat_id", "experience", "services",
    "address", "intro", "video1", "video2", "video3", "social1",
    "social2", "social3", "marquee_text", "free_color", "free_style",
    "free_paper", "premium_color", "addon_photo_qty", "addon_cta_qty",
    "renew_target_plan", "renew_photo_extra_qty", "renew_cta_extra_qty"
  ];

  const out = {};
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") out[id] = !!el.checked;
    else out[id] = el.value;
  });

  $$('input[name="plan"]').forEach((radio) => {
    if (radio.checked) out[`plan__${radio.value}`] = radio.value;
  });

  [
    "addon_marquee_enabled",
    "addon_photo_enabled",
    "addon_cta_enabled",
    "addon_update_unlimited_enabled",
    "addon_bundle_enabled",
    "renew_keep_marquee",
    "renew_update_unlimited"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) out[id] = !!el.checked;
  });

  return out;
}

function saveDraft() {
  const payload = {
    mode: state.mode,
    data: collectDraftData(),
    slotTransforms: shallowClone(state.slotTransforms),
    photoPreviewUrls: shallowClone(state.photoPreviewUrls),
    previewMeta: shallowClone(state.previewMeta)
  };
  localStorage.setItem(getDraftKey(), JSON.stringify(payload));
  setStatus("草稿已暫存");
}

function saveDraftSilently() {
  try {
    localStorage.setItem(getDraftKey(), JSON.stringify({
      mode: state.mode,
      data: collectDraftData(),
      slotTransforms: shallowClone(state.slotTransforms),
      photoPreviewUrls: shallowClone(state.photoPreviewUrls),
      previewMeta: shallowClone(state.previewMeta)
    }));
  } catch (_) {}
}

function loadDraft() {
  const raw = localStorage.getItem(getDraftKey());
  if (!raw) return false;
  const saved = safeJsonParse(raw);
  if (!saved?.data) return false;

  Object.entries(saved.data).forEach(([id, value]) => {
    if (id.startsWith("plan__")) {
      const target = document.querySelector(`input[name="plan"][value="${value}"]`);
      if (target) target.checked = true;
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!value;
    else el.value = value ?? "";
  });

  state.slotTransforms = saved.slotTransforms || {};
  state.photoPreviewUrls = saved.photoPreviewUrls || {};
  state.previewMeta = saved.previewMeta || {};
  refreshAllPreviewThumbsFromState();
  return true;
}

function clearDraft() {
  localStorage.removeItem(getDraftKey());
  setStatus("已清除暫存草稿");
}

function getAddonBundleActive() {
  return !!$("#addon_bundle_enabled")?.checked;
}

function syncBundleCheckboxes() {
  const bundle = $("#addon_bundle_enabled");
  if (!bundle) return;
  if (bundle.checked) {
    if ($("#addon_marquee_enabled")) $("#addon_marquee_enabled").checked = true;
    if ($("#addon_update_unlimited_enabled")) $("#addon_update_unlimited_enabled").checked = true;
  }
}

function calcCreateOrUpdateQuote() {
  syncBundleCheckboxes();
  const plan = getSelectedPlan();
  const planAmount = CONFIG.PLAN_PRICE[plan] || 0;
  let addonAmount = 0;
  const breakdown = [];

  const marquee = !!$("#addon_marquee_enabled")?.checked;
  const photoQty = getPhotoExtraQty();
  const ctaQty = getCtaExtraQty();
  const updateUnlimited = !!$("#addon_update_unlimited_enabled")?.checked;
  const bundle = getAddonBundleActive();

  if (bundle) {
    addonAmount += CONFIG.ADDON_PRICE.bundle;
    breakdown.push(`跑馬燈＋無限次更新組合 NT$ ${CONFIG.ADDON_PRICE.bundle}`);
  } else {
    if (marquee) {
      addonAmount += CONFIG.ADDON_PRICE.marquee;
      breakdown.push(`跑馬燈 NT$ ${CONFIG.ADDON_PRICE.marquee}`);
    }
    if (updateUnlimited) {
      addonAmount += CONFIG.ADDON_PRICE.update_unlimited;
      breakdown.push(`無限次更新 NT$ ${CONFIG.ADDON_PRICE.update_unlimited}`);
    }
  }

  if (photoQty > 0) {
    const amount = photoQty * CONFIG.ADDON_PRICE.photo;
    addonAmount += amount;
    breakdown.push(`照片加購 ${photoQty} 張｜NT$ ${amount}`);
  }

  if (ctaQty > 0) {
    const amount = ctaQty * CONFIG.ADDON_PRICE.cta;
    addonAmount += amount;
    breakdown.push(`按鈕加購 ${ctaQty} 個｜NT$ ${amount}`);
  }

  return { planAmount, addonAmount, totalAmount: planAmount + addonAmount, breakdown };
}

function renderQuote() {
  if (isRenewMode()) {
    renderRenewSummary();
    return;
  }

  const quote = calcCreateOrUpdateQuote();
  $("#quote-plan-amount").textContent = `NT$ ${quote.planAmount}`;
  $("#quote-addon-amount").textContent = `NT$ ${quote.addonAmount}`;
  $("#quote-total-amount").textContent = `NT$ ${quote.totalAmount}`;
  $("#quote-state-text").textContent = isUpdateMode() ? "目前更新設定" : "目前建卡設定";

  const box = $("#quote-addon-breakdown");
  if (box) {
    box.innerHTML = quote.breakdown.length
      ? quote.breakdown.map((x) => `<div class="hint">${escapeHtml(x)}</div>`).join("")
      : `<div class="hint">目前沒有加購。</div>`;
  }

  $("#summary-plan-pill").textContent = getSelectedPlan() === "premium" ? "精品設計" : "自由搭配";
  $("#summary-photo-pill").textContent = `照片牆：${getPhotoLimit()} 張`;
  $("#summary-cta-pill").textContent = `按鈕：${getCtaLimit()} 個`;
}

function getAllSlotKeys() {
  const keys = ["avatar", "logo", "banner"];
  for (let i = 1; i <= CONFIG.MAX_PHOTOS; i++) keys.push(`photo${i}`);
  return keys;
}

function getVisiblePhotoKeys() {
  return getAllSlotKeys().filter((key) => {
    if (["avatar", "logo", "banner"].includes(key)) return true;
    const index = Number(key.replace("photo", ""));
    return index >= 1 && index <= getPhotoLimit();
  });
}

function initSlotDefaults(key) {
  if (!state.slotTransforms[key]) {
    state.slotTransforms[key] = { scale: 1, x: 0, y: 0, rotate: 0 };
  }
}

function createSlotTitle(key) {
  if (key === "avatar") return "個人照";
  if (key === "logo") return "Logo";
  if (key === "banner") return "橫幅圖（預覽用）";
  return `照片 ${key.replace("photo", "")}`;
}

function buildPhotoSlots() {
  const container = $("#photo-slots");
  const tpl = $("#photo-slot-template");
  if (!container || !tpl) return;
  container.innerHTML = "";

  getAllSlotKeys().forEach((key) => {
    initSlotDefaults(key);

    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.slotKey = key;
    node.querySelector(".photo-title").textContent = createSlotTitle(key);

    const fileInput = node.querySelector(".photo-file-input");
    const previewImage = node.querySelector(".preview-image");
    const empty = node.querySelector(".preview-empty");
    const badge = node.querySelector('[data-upload-state]');
    const tools = node.querySelector(".photo-tools");
    const zoomRange = node.querySelector(".zoom-range");

    if (fileInput) {
      fileInput.dataset.slotKey = key;
      fileInput.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await handleSelectSlotFile(key, file, { previewImage, empty, badge, tools, zoomRange });
        renderPreview();
      });
    }

    bindSlotTool(node, key, previewImage, empty, badge, zoomRange);
    container.appendChild(node);
  });

  updatePhotoSlotVisibility();
  refreshAllPreviewThumbsFromState();
}

function updatePhotoSlotVisibility() {
  const visible = new Set(getVisiblePhotoKeys());
  $$('[data-slot-key]', $("#photo-slots")).forEach((card) => {
    const key = card.dataset.slotKey;
    card.classList.toggle("hidden", !visible.has(key));
  });
}

async function handleSelectSlotFile(key, file, refs = {}) {
  if (!file || !/^image\//i.test(file.type)) {
    setStatus("請選擇圖片檔案", true);
    return;
  }

  initSlotDefaults(key);
  state.slotFiles[key] = file;
  state.slotBlobs[key] = file;
  state.slotRemoteUrls[key] = "";
  state.slotKeys[key] = "";

  const localUrl = URL.createObjectURL(file);
  state.photoPreviewUrls[key] = localUrl;
  state.previewMeta[key] = {
    kind: key,
    fileName: file.name,
    size: file.size,
    type: file.type,
    local: true
  };

  if (refs.previewImage) {
    refs.previewImage.src = localUrl;
    refs.previewImage.classList.remove("hidden");
    refs.previewImage.style.display = "block";
    applySlotPreviewTransform(key, refs.previewImage);
  }

  if (refs.empty) refs.empty.classList.add("hidden");
  if (refs.badge) refs.badge.textContent = key === "banner" ? "已載入預覽" : "待上傳";
  if (refs.tools) refs.tools.classList.remove("hidden");
  if (refs.zoomRange) refs.zoomRange.value = String(state.slotTransforms[key].scale || 1);
}

function bindSlotTool(node, key, previewImage, empty, badge, zoomRange) {
  const mutate = (patch = {}) => {
    initSlotDefaults(key);
    state.slotTransforms[key] = { ...state.slotTransforms[key], ...patch };
    applySlotPreviewTransform(key, previewImage);
    renderPreview();
  };

  const by = (selector, fn) => {
    const el = node.querySelector(selector);
    if (el) el.addEventListener("click", fn);
  };

  by(".rotate-left", () => mutate({ rotate: (state.slotTransforms[key]?.rotate || 0) - 90 }));
  by(".rotate-right", () => mutate({ rotate: (state.slotTransforms[key]?.rotate || 0) + 90 }));
  by(".move-left", () => mutate({ x: (state.slotTransforms[key]?.x || 0) - 10 }));
  by(".move-right", () => mutate({ x: (state.slotTransforms[key]?.x || 0) + 10 }));
  by(".move-up", () => mutate({ y: (state.slotTransforms[key]?.y || 0) - 10 }));
  by(".move-down", () => mutate({ y: (state.slotTransforms[key]?.y || 0) + 10 }));
  by(".reset-photo", () => {
    state.slotTransforms[key] = { scale: 1, x: 0, y: 0, rotate: 0 };
    if (zoomRange) zoomRange.value = "1";
    applySlotPreviewTransform(key, previewImage);
    renderPreview();
  });
  by(".clear-photo", () => {
    if (state.photoPreviewUrls[key]?.startsWith("blob:")) URL.revokeObjectURL(state.photoPreviewUrls[key]);
    delete state.slotFiles[key];
    delete state.slotBlobs[key];
    delete state.slotRemoteUrls[key];
    delete state.slotKeys[key];
    delete state.photoPreviewUrls[key];
    delete state.previewMeta[key];
    delete state.cropMeta[key];
    state.slotTransforms[key] = { scale: 1, x: 0, y: 0, rotate: 0 };
    if (previewImage) {
      previewImage.removeAttribute("src");
      previewImage.classList.add("hidden");
    }
    if (empty) empty.classList.remove("hidden");
    if (badge) badge.textContent = "尚未上傳";
    if (zoomRange) zoomRange.value = "1";
    renderPreview();
  });

  if (zoomRange) {
    zoomRange.addEventListener("input", (e) => {
      mutate({ scale: Math.max(0.6, Math.min(2, Number(e.target.value) || 1)) });
    });
  }
}

function applySlotPreviewTransform(key, img) {
  if (!img) return;
  const t = state.slotTransforms[key] || { scale: 1, x: 0, y: 0, rotate: 0 };
  img.style.transform = `translate(${t.x || 0}px, ${t.y || 0}px) rotate(${t.rotate || 0}deg) scale(${t.scale || 1})`;
  img.style.transformOrigin = "center center";
}

function refreshAllPreviewThumbsFromState() {
  $$('[data-slot-key]', $("#photo-slots")).forEach((card) => {
    const key = card.dataset.slotKey;
    const img = $(".preview-image", card);
    const empty = $(".preview-empty", card);
    const badge = $('[data-upload-state]', card);
    const tools = $(".photo-tools", card);
    const zoomRange = $(".zoom-range", card);

    const url = state.photoPreviewUrls[key] || state.slotRemoteUrls[key];
    if (url) {
      img.src = url;
      img.classList.remove("hidden");
      applySlotPreviewTransform(key, img);
      empty.classList.add("hidden");
      if (badge) badge.textContent = state.slotRemoteUrls[key] ? "已上傳" : (key === "banner" ? "已載入預覽" : "待上傳");
      if (tools) tools.classList.remove("hidden");
      if (zoomRange) zoomRange.value = String(state.slotTransforms[key]?.scale || 1);
    } else {
      img.removeAttribute("src");
      img.classList.add("hidden");
      empty.classList.remove("hidden");
      if (badge) badge.textContent = "尚未上傳";
    }
  });
}

function buildCtaSlots() {
  const wrap = $("#cta-slots");
  const tpl = $("#cta-slot-template");
  if (!wrap || !tpl) return;
  wrap.innerHTML = "";
  for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.ctaIndex = String(i);
    const label = $(".cta-title-label", node);
    const textInput = $(".cta-label-input", node);
    const urlInput = $(".cta-url-input", node);
    label.textContent = `按鈕 ${i}`;
    textInput.id = `cta_text_${i}`;
    urlInput.id = `cta_link_${i}`;
    textInput.addEventListener("input", debouncedPreview);
    urlInput.addEventListener("input", debouncedPreview);
    wrap.appendChild(node);
  }
  updateCtaSlotVisibility();
}

function updateCtaSlotVisibility() {
  const limit = getCtaLimit();
  $$('[data-cta-index]', $("#cta-slots")).forEach((card) => {
    const index = Number(card.dataset.ctaIndex);
    card.classList.toggle("hidden", index > limit);
  });
}

function buildFeaturesJsonString() {
  const features = {
    photoMeta: shallowClone(state.photoMeta),
    preview_meta: shallowClone(state.previewMeta),
    cropMeta: shallowClone(state.cropMeta),
    photo_preview_urls: shallowClone(state.photoPreviewUrls)
  };
  return JSON.stringify(features);
}

function appendPhotoPayload(out, sourceUrls = {}, sourceKeys = {}) {
  for (let i = 1; i <= CONFIG.MAX_PHOTOS; i++) {
    out[`photo${i}_url`] = sourceUrls[`photo${i}`] || "";
    out[`photo${i}_key`] = sourceKeys[`photo${i}`] || "";
  }
}

function collectCurrentRemotePhotoUrls() {
  const out = {};
  for (let i = 1; i <= CONFIG.MAX_PHOTOS; i++) {
    out[`photo${i}`] = pick(state.currentCard || {}, `photo${i}_url`);
  }
  return out;
}

function buildCreateLeadPayload(source = {}) {
  const theme = mapPlanTheme();
  const out = {
    invite_code: getVal("invite_code"),
    ref: getVal("ref"),
    referrer: getVal("referrer"),
    plan: theme.plan,
    color: theme.color,
    style: theme.style,
    paper: theme.paper,
    name: getVal("display_name"),
    unit: getVal("unit"),
    title: getVal("title"),
    slogan: getVal("intro"),
    services: getVal("services"),
    experience: getVal("experience"),
    wechat_id: getVal("wechat_id"),
    line_url: getVal("line_url"),
    line_oa: getVal("line_oa"),
    email: getVal("email"),
    phone: getVal("phone"),
    address: getVal("address"),
    website: getVal("website"),
    social1: getVal("social1"),
    social2: getVal("social2"),
    social3: getVal("social3"),
    video1: getVal("video1"),
    video2: getVal("video2"),
    video3: getVal("video3"),
    source: isCreateMode() ? "form" : state.mode,
    service_agent: getVal("referrer"),
    agent_type: getVal("referrer") ? "agent" : "self",
    form_source: "form_create",
    is_test: "FALSE",
    avatar_url: source.avatar_url || "",
    logo_url: source.logo_url || "",
    avatar_key: source.avatar_key || "",
    logo_key: source.logo_key || "",
    cta_text_1: getVal("cta_text_1"),
    cta_link_1: getVal("cta_link_1"),
    cta_text_2: getVal("cta_text_2"),
    cta_link_2: getVal("cta_link_2"),
    cta_text_3: getVal("cta_text_3"),
    cta_link_3: getVal("cta_link_3"),
    features_json: buildFeaturesJsonString()
  };
  appendPhotoPayload(out, source.urls || {}, source.keys || {});
  if ($("#addon_marquee_enabled")?.checked && !isRenewMode()) {
    out.marquee_text = getVal("marquee_text");
  }
  return out;
}

function buildUpdatePayload(source = {}) {
  const out = {
    token: state.updateToken || getVal("token"),
    name: getVal("display_name"),
    unit: getVal("unit"),
    title: getVal("title"),
    slogan: getVal("intro"),
    services: getVal("services"),
    experience: getVal("experience"),
    wechat_id: getVal("wechat_id"),
    line_url: getVal("line_url"),
    line_oa: getVal("line_oa"),
    email: getVal("email"),
    phone: getVal("phone"),
    address: getVal("address"),
    website: getVal("website"),
    social1: getVal("social1"),
    social2: getVal("social2"),
    social3: getVal("social3"),
    video1: getVal("video1"),
    video2: getVal("video2"),
    video3: getVal("video3"),
    avatar_url: source.avatar_url || pick(state.currentCard || {}, "avatar_url"),
    logo_url: source.logo_url || pick(state.currentCard || {}, "logo_url"),
    avatar_key: source.avatar_key || "",
    logo_key: source.logo_key || "",
    cta_text_1: getVal("cta_text_1"),
    cta_link_1: getVal("cta_link_1"),
    cta_text_2: getVal("cta_text_2"),
    cta_link_2: getVal("cta_link_2"),
    cta_text_3: getVal("cta_text_3"),
    cta_link_3: getVal("cta_link_3"),
    features_json: buildFeaturesJsonString()
  };
  appendPhotoPayload(out, source.urls || collectCurrentRemotePhotoUrls(), source.keys || {});
  if ($("#addon_marquee_enabled")?.checked || pick(state.currentCard || {}, "marquee_text")) {
    out.marquee_text = getVal("marquee_text");
  }
  return out;
}

function buildRenewPayload() {
  return {
    card_id: state.cardId || getVal("card_id"),
    target_plan: getVal("renew_target_plan") || pick(state.currentCard || {}, "plan") || "free",
    keep_marquee: normalizeBoolField($("#renew_keep_marquee")?.checked),
    keep_photo_extra_qty: String(Math.max(0, num(getVal("renew_photo_extra_qty"), 0))),
    keep_cta_extra_qty: String(Math.max(0, num(getVal("renew_cta_extra_qty"), 0))),
    update_unlimited_renew: normalizeBoolField($("#renew_update_unlimited")?.checked),
    submitted_by: getVal("referrer") || "SELF",
    note: "form_renew"
  };
}

function buildPreviewPayload() {
  const theme = mapPlanTheme();
  const payload = {
    plan: theme.plan,
    color: theme.color,
    style: theme.style,
    paper: theme.paper,
    name: getVal("display_name"),
    unit: getVal("unit"),
    title: getVal("title"),
    slogan: getVal("intro"),
    services: getVal("services"),
    experience: getVal("experience"),
    wechat_id: getVal("wechat_id"),
    line_url: getVal("line_url"),
    line_oa: getVal("line_oa"),
    email: getVal("email"),
    phone: getVal("phone"),
    address: getVal("address"),
    website: getVal("website"),
    social1: getVal("social1"),
    social2: getVal("social2"),
    social3: getVal("social3"),
    video1: getVal("video1"),
    video2: getVal("video2"),
    video3: getVal("video3"),
    avatar_url: state.photoPreviewUrls.avatar || pick(state.currentCard || {}, "avatar_url"),
    logo_url: state.photoPreviewUrls.logo || pick(state.currentCard || {}, "logo_url"),
    banner_url: state.photoPreviewUrls.banner || "",
    marquee_text: (( $("#addon_marquee_enabled")?.checked || $("#renew_keep_marquee")?.checked)
      ? getVal("marquee_text") || pick(state.currentCard || {}, "marquee_text")
      : ""),
    cta_limit: getCtaLimit(),
    photo_limit: getPhotoLimit(),
    cta_text_1: getVal("cta_text_1"),
    cta_link_1: getVal("cta_link_1"),
    cta_text_2: getVal("cta_text_2"),
    cta_link_2: getVal("cta_link_2"),
    cta_text_3: getVal("cta_text_3"),
    cta_link_3: getVal("cta_link_3"),
    features_json: buildFeaturesJsonString()
  };

  for (let i = 1; i <= CONFIG.MAX_PHOTOS; i++) {
    payload[`photo${i}_url`] = state.photoPreviewUrls[`photo${i}`] || pick(state.currentCard || {}, `photo${i}_url`) || "";
  }
  return payload;
}

function buildRenewPreviewPayload() {
  const card = state.currentCard || {};
  return {
    ...card,
    card_url: buildCardUrl(state.cardId || card.id),
    name: pick(card, "name", "display_name"),
    services: pick(card, "services"),
    experience: pick(card, "experience")
  };
}

function renderRenewPreviewSummary() {
  const el = $("#renew-preview-summary");
  if (!el) return;
  if (!isRenewMode()) {
    hide(el);
    return;
  }
  const summary = state.renewalSummary || {};
  const parts = [];
  if (clean(summary.current_plan)) parts.push(`目前方案：${summary.current_plan}`);
  if (clean(summary.target_plan || getVal("renew_target_plan"))) parts.push(`續約方案：${summary.target_plan || getVal("renew_target_plan")}`);
  if (clean(summary.total_amount)) parts.push(`續約金額：NT$ ${summary.total_amount}`);
  el.innerHTML = parts.length
    ? parts.map((x) => `<div>${escapeHtml(x)}</div>`).join("")
    : "<div>請先確認續約設定。</div>";
  show(el, true);
}

function renderPreview() {
  const root = $("#livePreviewCard");
  if (!root || typeof window.renderCard !== "function") return;
  const payload = isRenewMode() ? buildRenewPreviewPayload() : buildPreviewPayload();
  try {
    window.renderCard(payload, { root, mode: "form", allowActions: false });
  } catch (error) {
    console.error(error);
  }
  renderRenewPreviewSummary();
}

const debouncedPreview = debounce(() => {
  updatePhotoSlotVisibility();
  updateCtaSlotVisibility();
  renderQuote();
  renderPreview();
  saveDraftSilently();
});

function renderUpdateEligibility() {
  const box = $("#eligibility-box");
  if (!box) return;
  const e = state.updateEligibility || {};
  const chargeRequired = toBool(pick(e, "charge_required", "need_charge", "is_charge_required"));
  const isUnlimited = toBool(pick(e, "update_unlimited", "has_unlimited_update", "is_unlimited"));
  const freeRemaining = num(pick(e, "free_remaining", "remaining_free_updates", "remaining"), -1);

  let headline = "更新權益資訊";
  let lines = [];

  if (isUnlimited) {
    headline = "本卡享有無限次更新";
    lines = ["此卡目前享有年度無限次更新。", "本次更新可直接送出，不需另建付款資訊。"];
  } else if (freeRemaining > 0) {
    headline = "本卡享有年度免費更新";
    lines = [`本年度尚餘 ${freeRemaining} 次免費更新。`, "本次更新可直接送出，不需另建付款資訊。"];
  } else if (chargeRequired) {
    headline = "本次更新需建立付款資訊";
    lines = ["本次更新將先建立付款資訊。", "付款確認後，再進行正式更新。"];
  } else {
    headline = "本次更新可直接送出";
    lines = ["本次更新不需另建付款資訊。"];
  }

  box.innerHTML = `
    <div class="summary-box">
      <h3>${escapeHtml(headline)}</h3>
      ${lines.map((x) => `<div class="hint">${escapeHtml(x)}</div>`).join("")}
    </div>
  `;
}

function hydrateUpdateForm(card = {}) {
  const plan = clean(pick(card, "plan", "target_plan")).toLowerCase() || "free";
  const radio = document.querySelector(`input[name="plan"][value="${plan}"]`);
  if (radio) radio.checked = true;

  if (plan === "premium") {
    setVal("premium_color", pick(card, "color") || "p1");
  } else {
    setVal("free_color", pick(card, "color") || "c1");
    setVal("free_style", pick(card, "style") || "s1");
    setVal("free_paper", pick(card, "paper") || "f1");
  }

  setVal("display_name", pick(card, "name", "display_name"));
  setVal("unit", pick(card, "unit"));
  setVal("title", pick(card, "title"));
  setVal("phone", pick(card, "phone"));
  setVal("email", pick(card, "email"));
  setVal("website", pick(card, "website"));
  setVal("line_url", pick(card, "line_url"));
  setVal("line_oa", pick(card, "line_oa"));
  setVal("wechat_id", pick(card, "wechat_id"));
  setVal("experience", pick(card, "experience"));
  setVal("services", pick(card, "services"));
  setVal("address", pick(card, "address"));
  setVal("intro", pick(card, "slogan", "intro"));
  setVal("video1", pick(card, "video1"));
  setVal("video2", pick(card, "video2"));
  setVal("video3", pick(card, "video3"));
  setVal("social1", pick(card, "social1"));
  setVal("social2", pick(card, "social2"));
  setVal("social3", pick(card, "social3"));
  setVal("marquee_text", pick(card, "marquee_text"));

  if (!clean($("#referrer")?.value)) {
    setVal("referrer", pick(card, "referrer", "service_agent", "agent_id"));
  }

  for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
    setVal(`cta_text_${i}`, pick(card, `cta_text_${i}`));
    setVal(`cta_link_${i}`, pick(card, `cta_link_${i}`));
  }

  if (pick(card, "avatar_url")) {
    state.photoPreviewUrls.avatar = pick(card, "avatar_url");
    state.slotRemoteUrls.avatar = pick(card, "avatar_url");
  }
  if (pick(card, "logo_url")) {
    state.photoPreviewUrls.logo = pick(card, "logo_url");
    state.slotRemoteUrls.logo = pick(card, "logo_url");
  }
  for (let i = 1; i <= CONFIG.MAX_PHOTOS; i++) {
    const key = `photo${i}`;
    const url = pick(card, `${key}_url`);
    if (url) {
      state.photoPreviewUrls[key] = url;
      state.slotRemoteUrls[key] = url;
    }
  }

  refreshAllPreviewThumbsFromState();
  renderQuote();
}

function countExistingPhotos(card) {
  let c = 0;
  for (let i = 1; i <= CONFIG.MAX_PHOTOS; i++) {
    if (clean(pick(card, `photo${i}_url`))) c++;
  }
  return c;
}

function countExistingCtas(card) {
  let c = 0;
  for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
    if (clean(pick(card, `cta_text_${i}`)) && clean(pick(card, `cta_link_${i}`))) c++;
  }
  return c;
}

function renderRenewCardData() {
  const card = state.currentCard || {};
  const dataBox = $("#renew-card-data");
  const addonBox = $("#renew-addon-data");

  if (dataBox) {
    const rows = [
      ["名片編號", pick(card, "id", "card_id")],
      ["姓名", pick(card, "name", "display_name")],
      ["方案", pick(card, "plan")],
      ["顏色", pick(card, "color")],
      ["版型", pick(card, "style")],
      ["紙感", pick(card, "paper")],
      ["電話", pick(card, "phone")],
      ["Email", pick(card, "email")]
    ].filter(([, v]) => clean(v));

    dataBox.innerHTML = rows.map(([k, v]) => `
      <div class="hint"><strong>${escapeHtml(k)}：</strong>${escapeHtml(v)}</div>
    `).join("");
  }

  if (addonBox) {
    const rows = [
      `跑馬燈：${pick(card, "marquee_text") ? "有" : "無"}`,
      `照片數：${countExistingPhotos(card)} 張`,
      `按鈕數：${countExistingCtas(card)} 個`,
      `無限次更新：${toBool(pick(card, "update_unlimited")) ? "有" : "無"}`
    ];

    addonBox.innerHTML = `
      <div class="summary-box">
        ${rows.map((x) => `<div class="hint">${escapeHtml(x)}</div>`).join("")}
        <div class="hint">無限次更新為年度權益，新年度需重新加購後才生效。</div>
      </div>
    `;
  }

  setVal("renew_target_plan", pick(card, "plan") || "free");
  if ($("#renew_keep_marquee")) $("#renew_keep_marquee").checked = !!pick(card, "marquee_text");
}

async function refreshRenewSummary() {
  if (!isRenewMode() || !state.cardId) return;
  renderProgress(45, "正在計算續約內容…", "資料載入中");
  const payload = buildRenewPayload();
  const res = await callApi("getRenewalSummary", payload, "GET");
  if (res?.ok) {
    state.renewalSummary = res?.summary || res?.data?.summary || res?.data || res;
  }
  renderRenewSummary();
  hideProgress();
}

function renderRenewSummary() {
  if (!isRenewMode()) return;
  const box = $("#renew-summary-box");
  const addonBox = $("#renew-addon-box");
  const ruleText = $("#renew-rule-text");
  const s = state.renewalSummary || {};
  const card = state.currentCard || {};

  if (ruleText) {
    ruleText.textContent = "照片與按鈕數量會先沿用目前設定；若續約時選擇減少數量，差額不另退回。";
  }

  if (box) {
    box.innerHTML = `
      <h3>續約摘要</h3>
      <div class="hint">原方案：${escapeHtml(pick(card, "plan") || "-")}</div>
      <div class="hint">續約方案：${escapeHtml(pick(s, "target_plan") || getVal("renew_target_plan") || "-")}</div>
      <div class="hint">續約金額：NT$ ${escapeHtml(pick(s, "renewal_amount", "renewal_price") || "0")}</div>
      <div class="hint">加購金額：NT$ ${escapeHtml(pick(s, "addon_amount") || "0")}</div>
      <div class="hint"><strong>總金額：NT$ ${escapeHtml(pick(s, "total_amount") || "0")}</strong></div>
    `;
  }

  if (addonBox) {
    const rows = [
      `原照片數：${countExistingPhotos(card)} 張`,
      `原按鈕數：${countExistingCtas(card)} 個`,
      `原跑馬燈：${pick(card, "marquee_text") ? "有" : "無"}`,
      `原無限更新：${toBool(pick(card, "update_unlimited")) ? "有" : "無"}`
    ];
    addonBox.innerHTML = `
      <h3>原加購摘要</h3>
      ${rows.map((x) => `<div class="hint">${escapeHtml(x)}</div>`).join("")}
      <div class="hint">無限次更新為年度權益，新年度需重新加購後才生效。</div>
    `;
  }

  $("#quote-plan-amount").textContent = `NT$ ${pick(s, "renewal_amount", "renewal_price") || "0"}`;
  $("#quote-addon-amount").textContent = `NT$ ${pick(s, "addon_amount") || "0"}`;
  $("#quote-total-amount").textContent = `NT$ ${pick(s, "total_amount") || "0"}`;
  $("#quote-state-text").textContent = "續約試算";
}

async function ensureFirebaseReady() {
  initFirebase();
  await ensureAuth();
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

async function buildTransformedBlob(key, originalBlob) {
  const blob = originalBlob || state.slotBlobs[key];
  if (!blob) return null;
  const img = await loadImageFromBlob(blob);
  const t = state.slotTransforms[key] || { scale: 1, x: 0, y: 0, rotate: 0 };

  const canvas = document.createElement("canvas");
  const size = key === "banner" ? { w: 1200, h: 420 } : { w: 1200, h: 1200 };
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2 + (t.x || 0), canvas.height / 2 + (t.y || 0));
  ctx.rotate(((t.rotate || 0) * Math.PI) / 180);

  const naturalW = img.naturalWidth || img.width || size.w;
  const naturalH = img.naturalHeight || img.height || size.h;
  const coverScale = Math.max(canvas.width / naturalW, canvas.height / naturalH) * (t.scale || 1);
  const drawW = naturalW * coverScale;
  const drawH = naturalH * coverScale;

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  return await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
  });
}

async function uploadImagesForCard(cardId) {
  const safeCardId = clean(cardId);
  if (!safeCardId) throw new Error("缺少名片編號，無法上傳圖片");

  await ensureFirebaseReady();
  const urls = {};
  const keys = {};

  renderProgress(65, "正在上傳圖片…", "資料送出中");

  if (state.slotBlobs.avatar) {
    const blob = await buildTransformedBlob("avatar", state.slotBlobs.avatar);
    urls.avatar = await uploadAvatar(safeCardId, blob);
    keys.avatar = `cards/${safeCardId}/avatar.jpg`;
    state.slotRemoteUrls.avatar = urls.avatar;
  } else if (state.slotRemoteUrls.avatar) {
    urls.avatar = state.slotRemoteUrls.avatar;
  }

  if (state.slotBlobs.logo) {
    const blob = await buildTransformedBlob("logo", state.slotBlobs.logo);
    urls.logo = await uploadLogo(safeCardId, blob);
    keys.logo = `cards/${safeCardId}/logo.jpg`;
    state.slotRemoteUrls.logo = urls.logo;
  } else if (state.slotRemoteUrls.logo) {
    urls.logo = state.slotRemoteUrls.logo;
  }

  for (let i = 1; i <= CONFIG.MAX_PHOTOS; i++) {
    const key = `photo${i}`;
    if (!state.slotBlobs[key]) {
      if (state.slotRemoteUrls[key]) urls[key] = state.slotRemoteUrls[key];
      continue;
    }
    const blob = await buildTransformedBlob(key, state.slotBlobs[key]);
    urls[key] = await uploadPhoto(safeCardId, blob, i);
    keys[key] = `cards/${safeCardId}/photo${i}.jpg`;
    state.slotRemoteUrls[key] = urls[key];
  }

  return { urls, keys };
}

function validateBeforeSubmit() {
  if (isCreateMode() || isUpdateMode()) {
    if (!clean(getVal("display_name"))) {
      showError("請填寫姓名或品牌名稱");
      return false;
    }
    if (!clean(getVal("phone"))) {
      showError("請填寫電話");
      return false;
    }

    for (let i = 1; i <= CONFIG.MAX_CTAS; i++) {
      const textVal = clean(getVal(`cta_text_${i}`));
      const linkVal = clean(getVal(`cta_link_${i}`));
      if ((textVal && !linkVal) || (!textVal && linkVal)) {
        showError(`按鈕 ${i} 請同時填寫文字與連結`);
        return false;
      }
    }
  }

  if (isRenewMode() && !clean(state.cardId)) {
    showError("缺少名片編號，無法續約");
    return false;
  }

  return true;
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return clean(value);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildServiceCopy(result) {
  const cardId = clean(result.card_id || result.cardId);
  const leadId = clean(result.lead_id || result.leadId);
  const paymentId = clean(result.payment_id || result.paymentId);
  const amount = clean(result.amount || result.total_amount);
  const dueAt = clean(result.due_at || result.dueAt);
  const referrer = getVal("referrer") || "無";
  const name = getVal("display_name") || pick(state.currentCard || {}, "name") || "未填寫";
  const phone = getVal("phone") || pick(state.currentCard || {}, "phone") || "未填寫";

  const lines = [];
  if (isCreateMode()) {
    lines.push("您好，我已完成智慧名片申請：");
    if (leadId) lines.push(`📌 申請序號：${leadId}`);
    if (cardId) lines.push(`📌 名片編號：${cardId}`);
  } else if (isUpdateMode()) {
    lines.push("您好，我已送出智慧名片更新：");
    if (cardId) lines.push(`📌 名片編號：${cardId}`);
    if (paymentId) lines.push(`📌 更新付款單：${paymentId}`);
  } else {
    lines.push("您好，我已送出智慧名片續約：");
    if (cardId) lines.push(`📌 名片編號：${cardId}`);
    if (paymentId) lines.push(`📌 續約付款單：${paymentId}`);
  }
  lines.push(`📌 姓名：${name}`);
  lines.push(`📌 電話：${phone}`);
  lines.push(`📌 推薦人：${referrer}`);
  if (paymentId) lines.push(`📌 付款單號：${paymentId}`);
  if (amount) lines.push(`📌 金額：NT$ ${amount}`);
  if (dueAt) lines.push(`📌 付款期限：${formatDateTime(dueAt)}`);
  lines.push("再請協助確認與後續開通，謝謝🙏");
  return lines.join("\n");
}

function renderResult(result = {}) {
  state.submitResult = result;
  const box = $("#successBox");
  const successId = $("#successId");
  const successDesc = $("#successDesc");
  const copyText = $("#successCopyText");

  const serial = clean(result.card_id || result.payment_id || result.lead_id || result.cardId || result.paymentId || result.leadId || "-");
  if (successId) successId.textContent = serial;
  if (successDesc) {
    successDesc.textContent = result.ok === false
      ? "送出未完成，請將訊息回傳客服協助確認。"
      : "以下內容可直接貼給客服，方便協助你快速確認與開通。";
  }
  if (copyText) copyText.value = buildServiceCopy(result);
  show(box, true);

  const btnLine = $("#btnLineOA");
  if (btnLine) {
    btnLine.onclick = () => window.open(CONFIG.CUSTOMER_SERVICE_URL, "_blank", "noopener");
  }

  const btnCopy = $("#btnCopyReply");
  if (btnCopy) {
    btnCopy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(copyText.value || "");
        setStatus("已複製客服回覆內容");
      } catch (_) {
        copyText.select();
        document.execCommand("copy");
        setStatus("已複製客服回覆內容");
      }
    };
  }
}

async function loadPlanOptions() {
  const res = await callApi("getPlanOptions", {}, "GET");
  if (res?.ok) state.planOptions = res?.plans || res?.data?.plans || res?.data || res;
}

async function bootCreateMode() {
  renderModeUI();
  await loadPlanOptions();
}

async function bootUpdateMode() {
  renderModeUI();
  if (!state.updateToken) {
    showError("缺少更新憑證", "請由正確的更新連結進入");
    return;
  }

  renderProgress(15, "正在讀取原卡資料…", "資料載入中");
  const cardRes = await callApi("getCardForUpdate", { token: state.updateToken }, "GET");
  if (!cardRes?.ok) {
    hideProgress();
    showError("讀取原卡資料失敗", cardRes?.error || "");
    return;
  }

  const card = unwrapCard(cardRes);
  state.currentCard = card || {};
  state.cardId = clean(pick(card, "id", "card_id"));
  setVal("card_id", state.cardId);
  hydrateUpdateForm(state.currentCard);

  renderProgress(45, "正在確認更新權益…", "資料載入中");
  const eligibilityRes = await callApi("getUpdateEligibility", {
    token: state.updateToken,
    card_id: state.cardId
  }, "GET");

  if (eligibilityRes?.ok) {
    state.updateEligibility = eligibilityRes?.eligibility || eligibilityRes?.data?.eligibility || eligibilityRes?.data || eligibilityRes;
    renderUpdateEligibility();
  }

  await loadPlanOptions();
  hideProgress();
}

async function bootRenewMode() {
  renderModeUI();
  if (!state.cardId) {
    showError("缺少名片編號", "請由正確的續約連結進入");
    return;
  }

  renderProgress(15, "正在讀取原卡資料…", "資料載入中");
  const cardRes = await callApi("getCardForRenewal", { card_id: state.cardId }, "GET");
  if (!cardRes?.ok) {
    hideProgress();
    showError("讀取續約資料失敗", cardRes?.error || "");
    return;
  }

  state.currentCard = cardRes?.card || cardRes?.data?.card || cardRes?.data || {};
  renderRenewCardData();
  await refreshRenewSummary();
  hideProgress();
}

async function submitCreate() {
  renderProgress(10, "正在整理建卡資料…", "資料送出中");
  const leadPayload = buildCreateLeadPayload();
  const leadRes = await callApi("createLead", leadPayload);
  if (!leadRes?.ok) {
    renderResult({ ok: false, lead_id: "", card_id: "", error: leadRes?.error || "建立申請失敗" });
    throw new Error(leadRes?.error || "建立申請失敗");
  }

  renderProgress(25, "正在建立名片資料…", "資料送出中");
  const lead = unwrapLead(leadRes) || {};
  state.currentLead = lead;
  const leadId = clean(pick(lead, "lead_id", "id") || pickId(leadRes, "lead_id", "id"));

  const cardPayload = { ...buildCreateLeadPayload(), lead_id: leadId };
  const cardRes = await callApi("createCard", cardPayload);
  if (!cardRes?.ok) {
    renderResult({ ok: false, lead_id: leadId, card_id: "", error: cardRes?.error || "建立名片失敗" });
    throw new Error(cardRes?.error || "建立名片失敗");
  }

  renderProgress(45, "名片已建立，準備上傳圖片…", "資料送出中");
  const card = unwrapCard(cardRes) || {};
  const cardId = clean(pick(card, "id", "card_id") || pickId(cardRes, "card_id", "id"));
  const token = clean(pick(card, "update_token", "token")) || clean(pickId(cardRes, "update_token", "token"));
  state.cardId = cardId;
  state.updateToken = token;

  let finalPayload = buildUpdatePayload();
  const hasUploadableImage = ["avatar", "logo", ...Array.from({ length: CONFIG.MAX_PHOTOS }, (_, i) => `photo${i + 1}`)].some((k) => !!state.slotBlobs[k]);

  if (hasUploadableImage && token && cardId) {
    const uploaded = await uploadImagesForCard(cardId);
    finalPayload = buildUpdatePayload({
      avatar_url: uploaded.urls.avatar || "",
      logo_url: uploaded.urls.logo || "",
      avatar_key: uploaded.keys.avatar || "",
      logo_key: uploaded.keys.logo || "",
      urls: uploaded.urls,
      keys: uploaded.keys
    });

    renderProgress(85, "正在寫入圖片資料…", "資料送出中");
    const updateRes = await callApi("updateCardByToken", finalPayload);
    if (!updateRes?.ok) throw new Error(updateRes?.error || "圖片寫回失敗");
  }

  renderProgress(100, "已完成送出", "送出完成");
  hideProgress();

  const payment = unwrapPayment(cardRes) || {};
  renderResult({
    ok: true,
    lead_id: leadId,
    card_id: cardId,
    payment_id: clean(pick(payment, "payment_id")) || pickId(cardRes, "payment_id"),
    due_at: clean(pick(payment, "due_at")) || pickId(cardRes, "due_at"),
    amount: clean(pick(payment, "amount")) || pickId(cardRes, "amount"),
    card_url: buildCardUrl(cardId)
  });
  setStatus("已完成申請送出");
}

async function submitUpdate() {
  if (!state.updateToken) throw new Error("缺少更新憑證");
  const eligibility = state.updateEligibility || {};
  const chargeRequired = toBool(pick(eligibility, "charge_required", "need_charge", "is_charge_required"));

  if (chargeRequired) {
    renderProgress(25, "正在建立更新付款資訊…", "資料送出中");
    const paymentPayload = buildUpdatePayload();
    const payRes = await callApi("createUpdateFeePayment", paymentPayload);
    if (!payRes?.ok) throw new Error(payRes?.error || "建立更新付款單失敗");

    renderProgress(100, "已建立付款資訊", "送出完成");
    hideProgress();
    const payment = unwrapPayment(payRes) || {};
    renderResult({
      ok: true,
      card_id: state.cardId,
      payment_id: clean(pick(payment, "payment_id")) || pickId(payRes, "payment_id"),
      due_at: clean(pick(payment, "due_at")) || pickId(payRes, "due_at"),
      amount: clean(pick(payment, "amount")) || pickId(payRes, "amount")
    });
    setStatus("已建立付款資訊，待付款確認後處理更新");
    return;
  }

  renderProgress(25, "正在整理更新資料…", "資料送出中");
  let uploaded = { urls: collectCurrentRemotePhotoUrls(), keys: {} };
  const hasUploadableImage = ["avatar", "logo", ...Array.from({ length: CONFIG.MAX_PHOTOS }, (_, i) => `photo${i + 1}`)].some((k) => !!state.slotBlobs[k]);

  if (hasUploadableImage) {
    uploaded = await uploadImagesForCard(state.cardId);
  }

  const updatePayload = buildUpdatePayload({
    avatar_url: uploaded.urls.avatar || state.slotRemoteUrls.avatar || pick(state.currentCard || {}, "avatar_url"),
    logo_url: uploaded.urls.logo || state.slotRemoteUrls.logo || pick(state.currentCard || {}, "logo_url"),
    avatar_key: uploaded.keys.avatar || "",
    logo_key: uploaded.keys.logo || "",
    urls: uploaded.urls || collectCurrentRemotePhotoUrls(),
    keys: uploaded.keys || {}
  });

  renderProgress(85, "正在送出更新資料…", "資料送出中");
  const updateRes = await callApi("updateCardByToken", updatePayload);
  if (!updateRes?.ok) throw new Error(updateRes?.error || "更新失敗");

  renderProgress(100, "已完成更新", "送出完成");
  hideProgress();
  renderResult({ ok: true, card_id: state.cardId, card_url: buildCardUrl(state.cardId) });
  setStatus("已完成資料更新");
}

async function submitRenew() {
  renderProgress(25, "正在建立續約付款資訊…", "資料送出中");
  const payload = buildRenewPayload();
  const res = await callApi("createRenewalPayment", payload);
  if (!res?.ok) throw new Error(res?.error || "建立續約付款單失敗");

  renderProgress(100, "已建立續約付款資訊", "送出完成");
  hideProgress();

  const payment = unwrapPayment(res) || {};
  const totalAmount = clean(pick(payment, "amount")) || clean(pick(state.renewalSummary || {}, "total_amount")) || pickId(res, "total_amount");
  renderResult({
    ok: true,
    card_id: state.cardId,
    payment_id: clean(pick(payment, "payment_id")) || pickId(res, "payment_id"),
    due_at: clean(pick(payment, "due_at")) || pickId(res, "due_at"),
    total_amount: totalAmount
  });
  setStatus("已建立續約付款資訊");
}

async function handleSubmit(event) {
  event.preventDefault();
  if (state.submitting) return;
  if (!validateBeforeSubmit()) return;

  state.submitting = true;
  hide($("#successBox"));
  setStatus("");

  try {
    if (isCreateMode()) await submitCreate();
    else if (isUpdateMode()) await submitUpdate();
    else await submitRenew();
  } catch (error) {
    hideProgress();
    showError(error?.message || "送出失敗");
    renderResult({ ok: false, card_id: state.cardId, error: error?.message || "送出失敗" });
  } finally {
    state.submitting = false;
  }
}

function bindPageEvents() {
  const form = $("#smart-card-form");
  if (form) form.addEventListener("submit", handleSubmit);

  $("#btn-save-draft")?.addEventListener("click", saveDraft);
  $("#btn-clear-draft")?.addEventListener("click", clearDraft);
  $("#btn-contact-service")?.addEventListener("click", () => window.open(CONFIG.CUSTOMER_SERVICE_URL, "_blank", "noopener"));
  $("#progress-contact-service")?.addEventListener("click", () => window.open(CONFIG.CUSTOMER_SERVICE_URL, "_blank", "noopener"));
  $("#btn-open-showcase")?.addEventListener("click", () => window.open(CONFIG.HUB_BASE_URL, "_blank", "noopener"));

  $$('input[name="plan"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      updatePhotoSlotVisibility();
      updateCtaSlotVisibility();
      renderQuote();
      renderPreview();
    });
  });

  [
    "free_color", "free_style", "free_paper", "premium_color",
    "display_name", "unit", "title", "phone", "email", "website",
    "line_url", "line_oa", "wechat_id", "experience", "services",
    "address", "intro", "video1", "video2", "video3",
    "social1", "social2", "social3", "marquee_text", "referrer"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", debouncedPreview);
    el.addEventListener("change", debouncedPreview);
  });

  [
    "addon_marquee_enabled",
    "addon_photo_enabled",
    "addon_cta_enabled",
    "addon_update_unlimited_enabled",
    "addon_bundle_enabled",
    "renew_keep_marquee",
    "renew_update_unlimited"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", async () => {
      if (id === "addon_bundle_enabled") syncBundleCheckboxes();
      show($("#marquee-section"), !isRenewMode() && !!$("#addon_marquee_enabled")?.checked);
      renderQuote();
      renderPreview();
      if (isRenewMode()) await refreshRenewSummary();
    });
  });

  [
    "addon_photo_qty",
    "addon_cta_qty",
    "renew_target_plan",
    "renew_photo_extra_qty",
    "renew_cta_extra_qty"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", async () => {
      updatePhotoSlotVisibility();
      updateCtaSlotVisibility();
      renderQuote();
      renderPreview();
      if (isRenewMode()) await refreshRenewSummary();
    });
    el.addEventListener("change", async () => {
      updatePhotoSlotVisibility();
      updateCtaSlotVisibility();
      renderQuote();
      renderPreview();
      if (isRenewMode()) await refreshRenewSummary();
    });
  });
}

async function bootForm() {
  hydrateQueryParams();
  initFirebase();

  state.mode = clean(getVal("mode") || getQuery("mode") || "create").toLowerCase();
  state.updateToken = getVal("token") || getQuery("token");
  state.cardId = getVal("card_id") || getQuery("card_id");

  buildPhotoSlots();
  buildCtaSlots();
  renderModeUI();
  bindPageEvents();
  renderQuote();
  loadDraft();

  if (isCreateMode()) await bootCreateMode();
  else if (isUpdateMode()) await bootUpdateMode();
  else if (isRenewMode()) await bootRenewMode();

  renderPreview();
  setStatus("請確認資料後送出");
}

document.addEventListener("DOMContentLoaded", () => {
  bootForm().catch((error) => {
    console.error(error);
    showError("初始化失敗", error?.message || "");
  });
});
```

> 補充：你的 `firebase.js` 仍需把 `uploadPhoto()` 的上限從 5 改成 10，這份 `form.js` 才能完整吃到 `photo1 ~ photo10`。
