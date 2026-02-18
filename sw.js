// sw.js — v367 (minimal)
const CACHE = "hsc-v367";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(res => res || fetch(req).then(net => {
      const copy = net.clone();
      if (req.method === "GET" && req.url.startsWith(self.location.origin)) {
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      }
      return net;
    }).catch(()=>caches.match("./index.html")))
  );
});
