/* Angel Card SW v373 */
const CACHE = 'angel-card-v373';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  const url = new URL(req.url);

  // Network-first for API (GAS)
  if (url.origin.includes('script.google.com')) {
    e.respondWith(fetch(req).catch(()=>caches.match(req)));
    return;
  }

  // Cache-first for static
  e.respondWith(
    caches.match(req).then(res=>res || fetch(req).then(net=>{
      const copy = net.clone();
      caches.open(CACHE).then(c=>c.put(req, copy));
      return net;
    }).catch(()=>res))
  );
});
