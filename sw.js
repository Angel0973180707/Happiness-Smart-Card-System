// 版本號：每次修改介面設計時，請手動將 5.2 加 0.1，這會強制客戶手機更新
const CACHE_NAME = 'happy-smart-card-v5.2';

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
