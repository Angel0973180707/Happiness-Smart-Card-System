// 每次美化版面後，建議修改版本號 (如 v3.0)，強制手機更新快取
const CACHE_NAME = 'happy-card-v3.0';

const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// 安裝階段：將質感介面資源存入手機
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('幸福名片 V3：旗艦版介面資源已就緒');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 激活階段：清理舊版舊設計的快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('幸福名片：正在移除舊版設計...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 攔截請求：秒開介面，資料則即時抓取
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 介面檔案用快取 (秒開)，試算表資料則走網路
      return response || fetch(event.request);
    })
  );
});
