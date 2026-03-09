/* =========================================
 * HSC Service Worker v705.8
 * COMPLETE OVERWRITE
 *
 * Goal:
 * - 控制 GitHub Pages PWA 快取
 * - 新版上線可自動接管
 * - 避免 HTML 長期卡舊版
 * - 靜態資源走快取優先
 * - HTML / version.json 走網路優先
 * ========================================= */

const SW_VERSION = "v705.8";
const CACHE_NAME = `hsc-cache-${SW_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./poster.html",
  "./form.html",
  "./admin.html",
  "./app.js",
  "./poster.js",
  "./form.js",
  "./admin.js",
  "./imageResolver.js",
  "./update.js",
  "./manifest.json",
  "./version.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS.map(addCacheBust));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // 只處理同源
  if (url.origin !== self.location.origin) return;

  // HTML：網路優先，避免一直卡舊版
  if (isHtmlRequest(req, url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // version.json：一定網路優先
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("version.json")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // JS / CSS / JSON / 圖片：快取優先，失敗再網路
  event.respondWith(cacheFirst(req));
});

function isHtmlRequest(req, url) {
  return (
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/")
  );
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.ok) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  if (fresh && fresh.ok) {
    cache.put(req, fresh.clone());
  }
  return fresh;
}

function addCacheBust(url) {
  const hasQuery = url.includes("?");
  return `${url}${hasQuery ? "&" : "?"}cache=${encodeURIComponent(SW_VERSION)}`;
}
