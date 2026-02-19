/* Angel Card Service Worker — V384.2 (cache-safe)
 * 目的：解決手機上「一開始正常，後來又回到舊版(384)」的幽靈快取問題
 * 做法：
 *  - 用全新 Cache Name（v384.2）
 *  - activate 時刪掉所有舊 cache
 *  - HTML/導航：Network First（永遠優先拿最新）
 *  - 靜態資源：Cache First + 背景更新（快又能自動更新）
 */

const VERSION = '384.2';
const CACHE_NAME = `angel-card-v${VERSION.replace(/\./g, '_')}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

// ---- Install: 預快取核心資源（best-effort）----
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS.map(u => new Request(u, { cache: 'reload' })));
    } catch (e) {
      // 不阻擋安裝
    }
  })());
});

// ---- Activate: 立刻接管 + 清掉所有舊快取 ----
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

// ---- Helpers ----
function isHtmlRequest(req) {
  const accept = req.headers.get('accept') || '';
  return req.mode === 'navigate' || accept.includes('text/html');
}

function isCacheableStatic(url) {
  const p = url.pathname.toLowerCase();
  return (
    p.endsWith('.css') ||
    p.endsWith('.js')  ||
    p.endsWith('.png') ||
    p.endsWith('.jpg') ||
    p.endsWith('.jpeg')||
    p.endsWith('.webp')||
    p.endsWith('.svg') ||
    p.endsWith('.ico') ||
    p.endsWith('.json')||
    p.endsWith('.mp3') ||
    p.endsWith('.wav') ||
    p.endsWith('.ogg') ||
    p.includes('/icons/') ||
    p.includes('/assets/')
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.ok) {
      try { await cache.put(request, fresh.clone()); } catch (e) {}
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // 導航失敗時，退回 index.html（離線可用）
    if (request.mode === 'navigate') {
      const fallback = await cache.match('./index.html', { ignoreSearch: true });
      if (fallback) return fallback;
    }
    throw e;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    // 背景更新（stale-while-revalidate）
    fetch(request).then(resp => {
      if (resp && resp.ok) cache.put(request, resp.clone()).catch(()=>{});
    }).catch(()=>{});
    return cached;
  }
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    try { await cache.put(request, fresh.clone()); } catch (e) {}
  }
  return fresh;
}

// ---- Fetch strategy ----
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只處理同網域（GitHub Pages）
  if (url.origin !== self.location.origin) return;

  // HTML / 導航：永遠優先拿最新
  if (isHtmlRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 靜態檔：快取優先 + 背景更新
  if (isCacheableStatic(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 其他：Network First
  event.respondWith(networkFirst(req));
});

// ---- Optional：手動清快取（除錯用）----
// console: navigator.serviceWorker.controller.postMessage({type:'PURGE_CACHES'})
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'PURGE_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })());
  }
});