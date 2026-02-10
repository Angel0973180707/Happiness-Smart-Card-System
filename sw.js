// 每次版面美化或邏輯更新，請手動將版本號加 0.1 (例如 v3.2 -> v3.3)，手機才會更新外觀
const CACHE_NAME = 'happy-smart-card-v3.3';

// 這是需要存進手機的「基礎骨架」
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json'
];

// 1. 安裝：把名片框架存入手機
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('幸福名片：框架快取成功！');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 激活：刪除舊版快取，避免新舊設計衝突
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('幸福名片：正在清理舊版快取...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. 抓取：介面檔案用快取 (秒開)，但試算表資料 (CSV) 則永遠抓最新的
self.addEventListener('fetch', (event) => {
  // 如果是抓取 Google 試算表的 CSV 資料，我們不緩存，確保資料即時
  if (event.request.url.includes('docs.google.com/spreadsheets')) {
    event.respondWith(fetch(event.request));
  } else {
    // 其他檔案（如 HTML, JSON）則優先從快取讀取，達成秒開
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
