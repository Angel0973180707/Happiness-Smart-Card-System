/* Angel Card DEV RESET Service Worker
 * 目的：徹底禁止快取，強制永遠讀取最新 GitHub 檔案
 * 適用：頻繁改版 / debug / UI 調整期
 */

const CACHE_NAME = 'DEV_RESET_FORCE_NETWORK_ONLY';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* 🚨 核心策略：永遠 network only */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => fetch(event.request))
  );
});