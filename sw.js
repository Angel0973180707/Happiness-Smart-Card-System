const CACHE_NAME = "hscs-front-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e)=>{
  const req = e.request;
  const url = new URL(req.url);

  // Always network for GAS (fresh)
  if (url.href.includes("script.google.com/macros/s/")) {
    e.respondWith(fetch(req).catch(()=>caches.match("./index.html")));
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }).catch(()=>cached))
  );
});