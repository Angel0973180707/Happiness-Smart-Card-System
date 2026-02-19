
/* sw.js - V385.6_fix (Complete Overwrite) */
"use strict";

const CACHE_NAME = "angel-card-v3856-fix";
const ASSETS = [
  "./",
  "./index.html?v=3856",
  "./style.css?v=3856",
  "./app.js?v=3856",
  "./manifest.json?v=3856",
  "./og-card.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k===CACHE_NAME)?null:caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Network-first for API requests
  if (req.url.includes("script.google.com/macros/s/")) {
    event.respondWith(fetch(req).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp)=>{
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req, copy)).catch(()=>{});
      return resp;
    }).catch(()=>cached))
  );
});
