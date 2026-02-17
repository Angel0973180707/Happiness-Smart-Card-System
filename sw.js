/* Angel Card SW v361
 * - App shell: cache-first
 * - Google Sheets CSV: network-only (avoid stale / stuck)
 */

const VERSION = '361';
const CACHE_NAME = `angel-card-v${VERSION}`;
const APP_SHELL = [
  './',
  './index.html?v=361',
  './manifest.json?v=361',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    self.clients.claim();
  })());
});

function isGoogleSheetsCsv(reqUrl){
  const u = reqUrl || '';
  return u.includes('docs.google.com/spreadsheets') && u.includes('export?format=csv');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ Google Sheets CSV 一律 network-only，避免快取導致「讀取中卡死」
  if (isGoogleSheetsCsv(url.href)) {
    event.respondWith((async () => {
      try{
        const fresh = await fetch(req, { cache: 'no-store' });
        return fresh;
      }catch(e){
        // 讀不到就直接丟出去讓前端顯示重試
        return new Response('', { status: 504, statusText: 'Sheets fetch failed' });
      }
    })());
    return;
  }

  // ✅ same-origin：cache-first（加速）
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: false });
      if (cached) return cached;

      try{
        const fresh = await fetch(req);
        // 只快取 GET
        if(req.method === 'GET' && fresh && fresh.ok){
          cache.put(req, fresh.clone());
        }
        return fresh;
      }catch(e){
        // fallback: 嘗試回首頁殼
        const fallback = await cache.match('./index.html?v=361');
        return fallback || new Response('offline', { status: 200 });
      }
    })());
    return;
  }

  // 其他來源：直接走網路
  event.respondWith(fetch(req));
});