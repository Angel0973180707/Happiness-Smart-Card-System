/* Angel Card Service Worker — V385.1 (cache-safe) */
const VERSION = '385.1';
const CACHE_NAME = `angel-card-v${VERSION.replace(/\./g,'_')}`;
const CORE_ASSETS = ['./','./index.html','./style.css','./app.js','./manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try{
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS.map(u => new Request(u, { cache: 'reload' })));
    }catch(e){}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

function isHtml(req){
  const accept = req.headers.get('accept') || '';
  return req.mode === 'navigate' || accept.includes('text/html');
}
function isStatic(url){
  const p = url.pathname.toLowerCase();
  return p.endsWith('.css')||p.endsWith('.js')||p.endsWith('.png')||p.endsWith('.jpg')||p.endsWith('.jpeg')||p.endsWith('.webp')||p.endsWith('.svg')||p.endsWith('.ico')||p.endsWith('.json')||p.includes('/icons/')||p.includes('/assets/');
}

async function networkFirst(request){
  const cache = await caches.open(CACHE_NAME);
  try{
    const fresh = await fetch(request, { cache: 'no-store' });
    if(fresh && fresh.ok){
      try{ await cache.put(request, fresh.clone()); }catch(e){}
    }
    return fresh;
  }catch(e){
    const cached = await cache.match(request, { ignoreSearch: true });
    if(cached) return cached;
    if(request.mode === 'navigate'){
      const fallback = await cache.match('./index.html', { ignoreSearch: true });
      if(fallback) return fallback;
    }
    throw e;
  }
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if(cached){
    fetch(request).then(r=>{ if(r&&r.ok) cache.put(request, r.clone()).catch(()=>{}); }).catch(()=>{});
    return cached;
  }
  const fresh = await fetch(request);
  if(fresh && fresh.ok){
    try{ await cache.put(request, fresh.clone()); }catch(e){}
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  if(isHtml(req)) { event.respondWith(networkFirst(req)); return; }
  if(isStatic(url)) { event.respondWith(cacheFirst(req)); return; }
  event.respondWith(networkFirst(req));
});
