/* =========================================
 * HSC Service Worker v1.5.5
 * COMPLETE OVERWRITE
 *
 * Goal:
 * - 控制 GitHub Pages PWA 快取
 * - 新版上線可自動接管
 * - 避免 HTML 長期卡舊版
 * - 靜態資源走快取優先
 * - HTML / version.json 走網路優先
 * ========================================= */

const SW_VERSION = "v1.5.9";
const CACHE_NAME = `hsc-cache-${SW_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./poster.html",
  "./form.html",
  "./admin.html",
  "./style.css",
  "./app.js",
  "./card-renderer.js",
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

    for (const asset of CORE_ASSETS) {
      try {
        await cache.add(addCacheBust(asset));
      } catch (_err) {
        // 某些檔案暫時不存在時，不中斷整體安裝
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return Promise.resolve();
      })
    );

    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 只處理同源資源
  if (url.origin !== self.location.origin) return;

  // HTML：網路優先
  if (isHtmlRequest(req, url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // version.json：網路優先
  if (isVersionJsonRequest(url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 其他靜態資源：快取優先
  event.respondWith(cacheFirst(req));
});

function isHtmlRequest(req, url) {
  const accept = req.headers.get("accept") || "";
  return (
    req.mode === "navigate" ||
    accept.includes("text/html") ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/")
  );
}

function isVersionJsonRequest(url) {
  return (
    url.pathname.endsWith("/version.json") ||
    url.pathname.endsWith("version.json")
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
  } catch (_err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw _err;
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