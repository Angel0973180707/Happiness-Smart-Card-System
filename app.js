/* Happiness Smart Card System — sw.js (v393 COMPLETE OVERWRITE) */

const VERSION = "393";
const CACHE_NAME = `hsc-cache-v${VERSION}`;
const RUNTIME_CACHE = `hsc-runtime-v${VERSION}`;

// 你實際的 GitHub Pages 子路徑（很重要：repo 名就是這個資料夾）
const BASE = "/Happiness-Smart-Card-System/";

// 只快取「必要的殼」；資料(API) 不要快取（避免讀到舊資料）
const PRECACHE_URLS = [
  `${BASE}`,
  `${BASE}index.html?v=${VERSION}`,
  `${BASE}style.css?v=${VERSION}`,
  `${BASE}app.js?v=${VERSION}`,
  `${BASE}manifest.json?v=${VERSION}`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
];

// --- install: pre-cache + skipWaiting
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

// --- activate: clean old caches + claim
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith("hsc-cache-v") || k.startsWith("hsc-runtime-v"))
        .filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// --- fetch strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只處理同源（你的 GitHub Pages）
  if (url.origin !== self.location.origin) return;

  // API/GAS 一律不快取（你前端已經加 ts=Date.now() 了）
  if (url.searchParams.get("action")) return;

  // HTML：Network First（確保更新）
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req) || await caches.match(`${BASE}index.html?v=${VERSION}`) || await caches.match(BASE);
        return cached || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  // CSS/JS/圖片：Cache First（速度快）
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});