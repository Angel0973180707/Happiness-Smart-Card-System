// 版本號：每次修改介面設計時，請手動將 5.2 加 0.1，這會強制客戶手機更新
const CACHE_// 版本號升級至 7.0 (每次 index.html 大改，這裡就要換數字)
const CACHE_NAME = 'happy-smart-card-v63.0';

// 僅快取名片的「外殼」
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json'
];

// 1. 安裝階段：存入基本外殼
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('幸福名片：V7.0 外殼已就緒');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 激活階段：強制刪除所有舊版快取，解決「載入中」卡住的問題
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('清理舊版快取中...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 抓取階段：區分靜態外殼與動態資料
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 核心修正：只要是 Google 的資料（試算表、圖片），一律不准讀快取，必須抓最新的
  if (url.includes('google') || url.includes('drive') || url.includes('spreadsheets')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // 如果真的完全沒網路，才去快取找（雖然 Google 資料本來就不該快取）
        return caches.match(event.request);
      })
    );
  } else {
    // 網頁外殼（HTML/CSS）優先讀快取，達成秒開效果
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
NAME = 'happy-smart-card-v5.2';

// 需要存進手機快取的靜態資源（讓名片在沒網路時也能打開外框）
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  // 如果您有放置圖示檔案，也可以加在這裡
  'icon-192.png',
  'icon-512.png'
];

// 1. 安裝階段：將名片「骨架」存入手機
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('幸福名片：V5.2 旗艦版介面已存入快取');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 激活階段：清理舊版本的快取檔案
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('幸福名片：正在清理舊版快取資料...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. 抓取階段：區分「外殼」與「即時資料」
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 如果是抓取 Google 試算表或 Google Drive 圖片，我們不快取，確保內容永遠最新
  if (url.includes('docs.google.com') || url.includes('googleusercontent.com') || url.includes('drive.google.com')) {
    event.respondWith(fetch(event.request));
  } else {
    // 其餘靜態檔案（如 HTML, JSON）優先從快取讀取，達成「秒開」效果
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
