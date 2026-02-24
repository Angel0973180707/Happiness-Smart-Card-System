/* sw.js (v392 FULL OVERWRITE) */
const SW_VERSION = "v392";
const CACHE_NAME = `hsc-${SW_VERSION}`;

const CORE = [
  "./",
  "./index.html?v=392",
  "./style.css?v=392",
  "./app.js?v=392",
  "./manifest.json?v=392",
  "./icons/icon-192.png?v=392",
  "./icons/icon-512.png?v=392"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE);
    } catch (e) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME && k.startsWith("hsc-")) return caches.delete(k);
    }));
    self.clients.claim();
  })());
});

// 網路優先，失敗才走 cache（避免永遠停在舊版）
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 只處理同源（GitHub Pages）資源；GAS / Drive 不接管
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(()=>{});
      return fresh;
    } catch (e) {
      const cached = await caches.match(req, { ignoreSearch: false });
      if (cached) return cached;

      // fallback：至少嘗試回首頁
      const cachedHome = await caches.match("./index.html?v=392");
      return cachedHome || new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});