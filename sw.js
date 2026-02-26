/* ================================
 * sw.js (v403 COMPLETE OVERWRITE)
 * - App shell cache
 * - Stale-while-revalidate for static assets
 * - Network-first for HTML navigations (fallback to cache)
 * - Force update support: SKIP_WAITING + SW_ACTIVATED broadcast
 * ================================ */

const SW_VERSION = "v403";
const CACHE_NAME = `hsc-cache-${SW_VERSION}`;

// ✅ 只快取「穩定不變」的殼（不要把 ?id 帶進去）
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./share.html",
  "./share.js",
  "./manifest.json",
  "./version.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og-card.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(APP_SHELL);
    } catch (e) {
      for (const url of APP_SHELL) {
        try { await cache.add(url); } catch {}
      }
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME && k.startsWith("hsc-cache-")) return caches.delete(k);
      return Promise.resolve();
    }));

    await self.clients.claim();

    // ✅ 通知所有頁面：SW 已啟用（可用來自動 reload）
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      try { client.postMessage({ type: "SW_ACTIVATED", sw: SW_VERSION }); } catch {}
    }
  })());
});

// ✅ 允許前端要求「跳過等待 → 立刻啟用新版 SW」
self.addEventListener("message", (event) => {
  const msg = event && event.data ? event.data : {};
  if (msg && msg.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNavigationRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function isSameOrigin(url) {
  try { return new URL(url).origin === self.location.origin; }
  catch { return false; }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && isSameOrigin(request.url)) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (isNavigationRequest(request)) {
      const shell = await cache.match("./index.html");
      if (shell) return shell;
    }
    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(request, { ignoreSearch: true });
  const fetchPromise = fetch(request).then((res) => {
    if (res && res.ok && isSameOrigin(request.url)) {
      cache.put(request, res.clone());
    }
    return res;
  }).catch(() => null);

  return cached || fetchPromise || cached;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(staleWhileRevalidate(req));
});