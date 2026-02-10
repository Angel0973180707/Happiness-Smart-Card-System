// 每次更新 index.html 的介面時，建議修改版本號 (如 v3.1)，讓手機強制抓取新外觀
const CACHE_NAME = 'happy-smart-card-v3.1';

// 定義 PWA 需要存放的靜態資源
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json'
];

// 1. 安裝階段：將質感介面存入手機快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('幸福名片：旗艦版介面資源已成功快取');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 激活階段：移除舊版快取，確保客戶看到的是美化後的成果
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('幸福名片：正在更新為最新美感介面...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. 攔截請求：優先讀取快取（介面），動態資料（試算表）則走網路
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 如果快取有檔案就直接用，否則去網路抓取（如試算表資料）
      return response || fetch(event.request);
    })
  );
});
