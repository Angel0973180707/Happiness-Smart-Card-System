#!/usr/bin/env node
// 智慧名片分享預覽修復（技術長 Codex 已確認根因，2026-08-13）
//
// 根因：index.html 的 <head> OG meta 是固定文字，每張卡的姓名/大頭照要等頁面載入後才由
// JS 從 GAS 抓回來填進畫面——但 LINE／Facebook／Messenger 等分享爬蟲通常不會執行 JS，
// 抓到的永遠是那份固定的通用 meta，所以分享出去只看得到「天使幸福智慧名片館」的通用預覽，
// 看不到本人大頭照。
//
// 解法：這支腳本讀取 api/cards/{card_id}.json（既有卡片 cache，update-card-cache.yml
// 已經在維護），只挑出 name／title／unit／slogan／avatar_url／updated_at 這幾個公開欄位
// （明確排除 phone／email／address／wechat_id／experience 等私人或大篇幅欄位，即使來源
// JSON 裡有這些欄位也不會被讀出來），產生一份「純靜態」的 share/{card_id}.html：
//   - <head> 裡的 OG/Twitter meta 是這張卡專屬的姓名／slogan／大頭照，寫死在 HTML 原始碼裡，
//     爬蟲不需要執行任何 JS 就能讀到。
//   - <body> 只有一小段 JS，用 location.replace() 立刻導去真正的互動名片頁
//     （index.html?id=...&view=1），真人點進來幾乎感覺不到有跳轉。
//   - 刻意不用 <meta http-equiv="refresh">：Facebook 的爬蟲有時候會主動跟隨 meta refresh
//     導到目標頁，那樣它讀到的就會是 index.html 那份通用 meta，等於白做——JS 導轉爬蟲不會
//     執行，正好保留這份專屬 meta 不被略過。
//
// 用法：node scripts/generate-share-page.js <card_id>
// 讀取：api/cards/<card_id>.json（getCardPublicLite 既有 cache 格式）
// 產生：share/<card_id>.html

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://angel-namecard.letssyncus.com/';
const DEFAULT_OG_IMAGE = BASE_URL + 'og-card.png';
const REPO_ROOT = path.join(__dirname, '..');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// OG description 只能是單行文字，slogan 原始資料常常帶換行（例如「讓好產品被看見\n，好服務
// 找到客戶」），這裡把換行換成中文頓號銜接，避免預覽卡片裡出現奇怪的斷行或被截斷。
function toSingleLine(str) {
  return String(str || '').replace(/\r?\n+/g, '　').trim();
}

// 只接受看起來像穩定公開圖片網址的 avatar_url：必須是 https，不是 blob:/data: 這種瀏覽器
// session 才有意義的網址。不對每張卡即時發 HTTP 請求驗證（避免拖慢產生流程、避免對外部
// 服務造成額外負擔），Firebase Storage 的 ?alt=media&token=... 下載網址本身就是長期公開、
// 不需要登入、不依賴 cookie 的穩定網址（已人工 curl 驗證過 Content-Type/Cache-Control）。
function isUsableImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https:\/\//i.test(url.trim());
}

function versionFromUpdatedAt(updatedAt) {
  const digits = String(updatedAt || '').replace(/[^0-9]/g, '');
  return digits || String(Date.now());
}

function buildDescription(card) {
  const slogan = toSingleLine(card.slogan || card.intro || '');
  if (slogan) return slogan;
  const title = toSingleLine(card.title || '');
  const unit = toSingleLine(card.unit || '');
  if (title && unit) return title + '｜' + unit;
  if (title || unit) return title || unit;
  return '智慧名片訂製｜打造可分享的專屬名片入口';
}

function generateSharePage(cardId) {
  const cachePath = path.join(REPO_ROOT, 'api', 'cards', cardId + '.json');
  if (!fs.existsSync(cachePath)) {
    throw new Error('找不到卡片 cache：' + cachePath + '（請先確認 api/cards/' + cardId + '.json 已存在）');
  }
  const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const card = (raw && raw.card) || {};

  // 白名單抽取：只拿這幾個公開欄位，來源 JSON 裡其餘欄位（phone/email/address/wechat_id/
  // experience/photos 等）一律不讀取，從結構上保證不會外洩進靜態分享頁。
  const name = String(card.name || '').trim() || '天使幸福智慧名片';
  const description = buildDescription(card);
  const avatarUrl = card.avatar_url;
  const updatedAt = card.updated_at;

  const ogImage = isUsableImageUrl(avatarUrl) ? avatarUrl : DEFAULT_OG_IMAGE;
  const version = versionFromUpdatedAt(updatedAt);
  const canonicalUrl = BASE_URL + 'share/' + encodeURIComponent(cardId) + '.html?v=' + version;
  const targetUrl = BASE_URL + 'index.html?id=' + encodeURIComponent(cardId) + '&view=1';

  const pageTitle = name + '｜天使幸福智慧名片';
  const escTitle = escapeHtml(pageTitle);
  const escDesc = escapeHtml(description);
  const escImage = escapeHtml(ogImage);
  const escCanonical = escapeHtml(canonicalUrl);
  const escTarget = escapeHtml(targetUrl);

  const html = '<!DOCTYPE html>\n' +
'<html lang="zh-Hant">\n' +
'<head>\n' +
'  <meta charset="UTF-8" />\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
'  <title>' + escTitle + '</title>\n' +
'  <link rel="canonical" href="' + escCanonical + '" />\n' +
'\n' +
'  <meta property="og:type" content="profile" />\n' +
'  <meta property="og:title" content="' + escTitle + '" />\n' +
'  <meta property="og:description" content="' + escDesc + '" />\n' +
'  <meta property="og:image" content="' + escImage + '" />\n' +
'  <meta property="og:image:secure_url" content="' + escImage + '" />\n' +
'  <meta property="og:url" content="' + escCanonical + '" />\n' +
'  <meta property="og:site_name" content="天使幸福智慧名片館" />\n' +
'\n' +
'  <meta name="twitter:card" content="summary_large_image" />\n' +
'  <meta name="twitter:title" content="' + escTitle + '" />\n' +
'  <meta name="twitter:description" content="' + escDesc + '" />\n' +
'  <meta name="twitter:image" content="' + escImage + '" />\n' +
'\n' +
'  <meta name="robots" content="noindex" />\n' +
'</head>\n' +
'<body>\n' +
'  <p><a id="fallbackLink" href="' + escTarget + '">' + escTitle + '</a></p>\n' +
'  <script>\n' +
'    // 只有真人瀏覽器會執行到這裡（分享爬蟲通常不執行 JS，只讀上面的 OG meta），\n' +
'    // 立刻換頁到真正的互動名片。分享按鈕原本會在網址上帶 share_card_id／share_agent_id／\n' +
'    // share_source／share_channel／share_visit_id 這幾個參數，後端分潤/推薦追蹤邏輯要靠\n' +
'    // 這些參數判斷歸戶——這裡原封不動把這幾個參數從這個中繼頁的網址接力帶到最終名片頁，\n' +
'    // 只拿掉這個中繼頁自己用的快取版號 v，追蹤邏輯完全不受影響。\n' +
'    (function () {\n' +
'      var target = new URL(' + JSON.stringify(targetUrl) + ');\n' +
'      try {\n' +
'        var incoming = new URLSearchParams(location.search);\n' +
'        var forwardKeys = ["share_card_id", "share_agent_id", "share_source", "share_channel", "share_visit_id", "ref"];\n' +
'        forwardKeys.forEach(function (k) {\n' +
'          var v = incoming.get(k);\n' +
'          if (v !== null && v !== "") target.searchParams.set(k, v);\n' +
'        });\n' +
'      } catch (e) {}\n' +
'      location.replace(target.toString());\n' +
'    })();\n' +
'  </script>\n' +
'</body>\n' +
'</html>\n';

  const outDir = path.join(REPO_ROOT, 'share');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, cardId + '.html');
  fs.writeFileSync(outPath, html, 'utf8');
  return { outPath, name, ogImage, description, canonicalUrl, targetUrl };
}

if (require.main === module) {
  const cardId = process.argv[2];
  if (!cardId) {
    console.error('用法：node scripts/generate-share-page.js <card_id>');
    process.exit(1);
  }
  try {
    const result = generateSharePage(cardId);
    console.log('已產生：' + result.outPath);
    console.log('  name: ' + result.name);
    console.log('  og:image: ' + result.ogImage);
    console.log('  og:description: ' + result.description);
    console.log('  og:url: ' + result.canonicalUrl);
    console.log('  redirect target: ' + result.targetUrl);
  } catch (err) {
    console.error('產生失敗：' + err.message);
    process.exit(1);
  }
}

module.exports = { generateSharePage, escapeHtml, toSingleLine, isUsableImageUrl, buildDescription, versionFromUpdatedAt };
