/* 天使幸福智慧名片 SW v338*/
const CACHE_VERSION = "v338";
const CACHE_NAME = `angel-card-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("angel-card-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只處理同源（GitHub Pages）
  if (url.origin !== self.location.origin) return;

  // 導覽請求（/ 或 /?id=...）：network-first，失敗回快取的 index.html
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match("./index.html");
          return cached || caches.match("./");
        }
      })()
    );
    return;
  }

  // 靜態檔：cache-first + 背景更新
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        event.waitUntil(
          (async () => {
            try {
              const fresh = await fetch(req);
              const cache = await caches.open(CACHE_NAME);
              cache.put(req, fresh.clone());
            } catch (e) {}
          })()
        );
        return cached;
      }

      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // 真的離線且無快取，就放掉
        return cached;
      }
    })()
  );
});