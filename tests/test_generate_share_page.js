// 智慧名片分享預覽修復｜generate-share-page.js targeted test
// 用兩張內容完全不同的合成卡片（含一張無 avatar_url）驗證：①各自輸出正確的 OG meta
// ②沒有互相污染（卡A看不到卡B的資料，反之亦然）③無頭像時正確 fallback 到 og-card.png
// ④私人欄位（phone/email/address 等）就算來源 JSON 有，也不會出現在輸出 HTML 裡
// ⑤HTML escaping 正確（名字/slogan 帶特殊字元不會破壞頁面結構）。
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateSharePage } = require('../scripts/generate-share-page.js');

function log(name, ok, extra) { console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }

// generate-share-page.js 用 __dirname/.. 當 REPO_ROOT 讀寫 api/cards 與 share，
// 這裡直接操作真正的 repo 目錄（用完會清掉測試專用的合成卡片與其輸出，不動 TW0001 既有資料）。
const REPO_ROOT = path.join(__dirname, '..');
const CARDS_DIR = path.join(REPO_ROOT, 'api', 'cards');
const SHARE_DIR = path.join(REPO_ROOT, 'share');

function writeFixtureCard(cardId, cardFields) {
  const payload = { ok: true, version: 'test', action: 'getCardPublicLite', card_id: cardId, cached: false, card: cardFields };
  fs.writeFileSync(path.join(CARDS_DIR, cardId + '.json'), JSON.stringify(payload), 'utf8');
}

function cleanup(cardId) {
  const cardPath = path.join(CARDS_DIR, cardId + '.json');
  const sharePath = path.join(SHARE_DIR, cardId + '.html');
  if (fs.existsSync(cardPath)) fs.unlinkSync(cardPath);
  if (fs.existsSync(sharePath)) fs.unlinkSync(sharePath);
}

const CARD_A = 'TESTSHAREA01';
const CARD_B = 'TESTSHAREB02';
const CARD_C = 'TESTSHAREC03';

try {
  // ═══ 卡片 A：完整資料，含特殊字元（測試 HTML escaping） ═══
  writeFixtureCard(CARD_A, {
    name: '陳<測試>A"01', title: '職稱A01', unit: '單位A01',
    slogan: '這是卡A的slogan\n第二行内容', avatar_url: 'https://firebasestorage.googleapis.com/fake-avatar-A.jpg',
    updated_at: '2026-08-01T10:00:00',
    phone: '0900000001', email: 'a01@example.com', address: '卡A的私人地址', wechat_id: 'wechatA01'
  });
  const resultA = generateSharePage(CARD_A);
  const htmlA = fs.readFileSync(resultA.outPath, 'utf8');

  log('A1.卡A輸出檔案存在', fs.existsSync(resultA.outPath));
  log('A2.卡A的 og:title 含正確姓名', htmlA.indexOf('陳&lt;測試&gt;A&quot;01') !== -1);
  log('A3.卡A的 og:image 是卡A自己的 avatar_url', htmlA.indexOf('fake-avatar-A.jpg') !== -1);
  log('A4.卡A的 slogan 換行正確轉成單行（不含原始\\n）', htmlA.indexOf('這是卡A的slogan　第二行内容') !== -1 && !/slogan\\n/.test(htmlA));
  log('A5.卡A的 og:url 含正確 card_id 與 updated_at 版號', htmlA.indexOf('share/TESTSHAREA01.html?v=20260801100000') !== -1);
  log('A6.卡A的導轉目標是自己的 index.html?id=TESTSHAREA01&view=1', htmlA.indexOf('id=TESTSHAREA01&amp;view=1') !== -1 || htmlA.indexOf('id=TESTSHAREA01\\u0026view=1') !== -1 || /location\.replace\("https:\/\/angel-namecard\.letssyncus\.com\/index\.html\?id=TESTSHAREA01&view=1"\)/.test(htmlA));

  // ═══ 私人欄位絕對不能出現在輸出裡 ═══
  log('A7.卡A輸出完全不含 phone 欄位內容', htmlA.indexOf('0900000001') === -1);
  log('A8.卡A輸出完全不含 email 欄位內容', htmlA.indexOf('a01@example.com') === -1);
  log('A9.卡A輸出完全不含 address 欄位內容', htmlA.indexOf('卡A的私人地址') === -1);
  log('A10.卡A輸出完全不含 wechat_id 欄位內容', htmlA.indexOf('wechatA01') === -1);

  // ═══ 卡片 B：完全不同的資料，證明兩張卡互不污染 ═══
  writeFixtureCard(CARD_B, {
    name: '林測試B02', title: '職稱B02', unit: '單位B02',
    slogan: '卡B專屬slogan完全不同', avatar_url: 'https://firebasestorage.googleapis.com/fake-avatar-B.jpg',
    updated_at: '2026-08-05T15:30:00'
  });
  const resultB = generateSharePage(CARD_B);
  const htmlB = fs.readFileSync(resultB.outPath, 'utf8');

  log('B1.卡B的 og:title 是卡B自己的姓名', htmlB.indexOf('林測試B02') !== -1);
  log('B2.卡B的 og:image 是卡B自己的 avatar_url（不是卡A的）', htmlB.indexOf('fake-avatar-B.jpg') !== -1 && htmlB.indexOf('fake-avatar-A.jpg') === -1);
  log('B3.卡B完全不含卡A的姓名或slogan', htmlB.indexOf('陳') === -1 && htmlB.indexOf('這是卡A的slogan') === -1);
  log('B4.卡A完全不含卡B的姓名或slogan（反向確認）', htmlA.indexOf('林測試B02') === -1 && htmlA.indexOf('卡B專屬slogan') === -1);

  // ═══ 卡片 C：無 avatar_url，應 fallback 到 og-card.png，不可 broken image ═══
  writeFixtureCard(CARD_C, {
    name: '無頭像測試C03', title: '', unit: '', slogan: '', avatar_url: '', updated_at: '2026-08-10T08:00:00'
  });
  const resultC = generateSharePage(CARD_C);
  const htmlC = fs.readFileSync(resultC.outPath, 'utf8');

  log('C1.無avatar_url時，og:image正確fallback到og-card.png', htmlC.indexOf('og-card.png') !== -1);
  log('C2.fallback圖片網址是完整絕對https網址', /content="https:\/\/angel-namecard\.letssyncus\.com\/og-card\.png"/.test(htmlC));
  log('C3.無slogan/title/unit時，og:description有合理通用文案（不是空字串）', htmlC.indexOf('og:description content=""') === -1);

  // ═══ 危險 avatar_url 型態（blob:/data:）也必須 fallback，不可直接採用 ═══
  writeFixtureCard(CARD_C, {
    name: '危險網址測試', avatar_url: 'blob:https://angel-namecard.letssyncus.com/xxxx-xxxx', updated_at: '2026-08-10T08:00:00'
  });
  const resultC2 = generateSharePage(CARD_C);
  const htmlC2 = fs.readFileSync(resultC2.outPath, 'utf8');
  log('C4.blob: 開頭的 avatar_url 不被採用，仍fallback到og-card.png', htmlC2.indexOf('blob:') === -1 && htmlC2.indexOf('og-card.png') !== -1);

  writeFixtureCard(CARD_C, {
    name: '危險網址測試2', avatar_url: 'data:image/png;base64,AAAA', updated_at: '2026-08-10T08:00:00'
  });
  const resultC3 = generateSharePage(CARD_C);
  const htmlC3 = fs.readFileSync(resultC3.outPath, 'utf8');
  log('C5.data: 開頭的 avatar_url 不被採用，仍fallback到og-card.png', htmlC3.indexOf('data:image') === -1 && htmlC3.indexOf('og-card.png') !== -1);

  // ═══ 結構完整性：不能有殘留未閉合標籤、每張輸出都要有唯一的 og:title ═══
  log('D1.卡A輸出是合法的完整HTML（含開頭DOCTYPE與結尾</html>）', htmlA.trim().indexOf('<!DOCTYPE html>') === 0 && htmlA.trim().endsWith('</html>'));
  log('D2.卡A/卡B的 og:title 彼此不同', htmlA.match(/og:title" content="([^"]*)"/)[1] !== htmlB.match(/og:title" content="([^"]*)"/)[1]);

  console.log('--- cleanup ---');
} finally {
  cleanup(CARD_A);
  cleanup(CARD_B);
  cleanup(CARD_C);
  console.log('已清除測試用合成卡片與輸出（不影響 TW0001 既有資料）');
}
