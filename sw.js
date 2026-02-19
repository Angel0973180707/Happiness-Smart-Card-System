/* sw.js (V385.3 minimal) */
const CACHE_NAME = "angel-card-v3853";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./og-card.png",
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e)=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(()=>cached))
  );
});
