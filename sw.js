// 每次更新 index.html 建議修改版本號 (如 v1 改 v2)，手機才會強制更新
const CACHE_NAME = 'happy-smart-card-v1';

// 定義 PWA 需要離線存放的資源清單
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// 1. 安裝階段：將 10 色樣板與圖示寫入手機快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('幸福名片：正在同步 10 色樣板與 PWA 資源...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 讓新的 Service Worker 立即接管，不用等瀏覽器重啟
  self.skipWaiting();
});

// 2. 激活階段：清理舊版本檔案，確保客戶看到的是最新版
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('幸福名片：正在更新系統組件...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. 攔截請求：優先讀取手機快取，達到秒開效果
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 如果快取中有檔案就直接用，沒有才去網路抓
      return response || fetch(event.request).catch(() => {
        // 如果完全沒網路且是換頁請求，則回傳首頁作為預設畫面
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
