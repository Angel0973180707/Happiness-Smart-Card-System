/* sw.js (V386.2 complete overwrite) */

const CACHE_NAME = "angel-card-v386.2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS.map(u => u + "?v=386"));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Only cache same-origin (GitHub Pages). Avoid caching GAS / fonts / drive images.
  if (!sameOrigin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // cache only ok responses
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      // fallback: try cached index for navigations
      if (req.mode === "navigate") {
        const fallback = await cache.match("./index.html", { ignoreSearch: true });
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});