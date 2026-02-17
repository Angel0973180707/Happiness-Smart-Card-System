/* Angel Card Service Worker v361 */
const VERSION = "361";
const CACHE_NAME = `angel-card-v${VERSION}`;

const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./icons/icon.svg"
];

// 安裝：預先快取核心檔
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 同時快取「帶版本」與「不帶版本」，避免你用 ?v=361 讀不到
      const withV = CORE.map((u) => (u.includes("?") ? u : `${u}?v=${VERSION}`));
      await cache.addAll([...new Set([...CORE, ...withV])]);
    })().catch(() => {})
  );
});

// 啟用：清掉舊版 cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// 抓取：先 cache；同時背景更新；離線回 index.html
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 不攔外部資源

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      const cached = await cache.match(req, { ignoreSearch: false });
      if (cached) {
        event.waitUntil(
          fetch(req)
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone());
            })
            .catch(() => {})
        );
        return cached;
      }

      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const fallback = await cache.match("./index.html", { ignoreSearch: true });
        return (
          fallback ||
          new Response("Offline", {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          })
        );
      }
    })()
  );
});