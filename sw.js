/* ================================
 * sw.js (v404 COMPLETE OVERWRITE)
 * - App shell cache
 * - Stale-while-revalidate for static assets
 * - Network-first for HTML navigations (fallback to cache)
 * - FORCE UPDATE:
 *   1) skipWaiting on install
 *   2) clients.claim on activate
 *   3) broadcast "SW_ACTIVATED" to all clients
 *   4) accept SKIP_WAITING message
 * ================================ */

const SW_VERSION = "v404";
const CACHE_NAME = `hsc-cache-${SW_VERSION}`;

// ✅ 只快取穩定殼（不要帶 ?id）
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./share.html",
  "./share.js",
  "./form.html",
  "./form.css",
  "./form.js",
  "./admin.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og-card.png",
];

// ---- install: cache shell + takeover ASAP
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(APP_SHELL);
    } catch (e) {
      // 防單檔不存在導致 install 失敗：逐一加入
      for (const url of APP_SHELL) {
        try { await cache.add(url); } catch {}
      }
    }
    // ✅ 新 SW 安裝完成立刻進 waiting→active
    self.skipWaiting();
  })());
});

// ---- activate: clean old caches + claim clients + notify reload
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME && k.startsWith("hsc-cache-")) return caches.delete(k);
      return Promise.resolve();
    }));

    // ✅ 立刻接管所有 tabs
    await self.clients.claim();

    // ✅ 通知所有開著的頁面：SW 已升級（讓前端自動 reload）
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of allClients) {
      client.postMessage({ type: "SW_ACTIVATED", version: SW_VERSION });
    }
  })());
});

// ---- allow page to request skipWaiting
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data && data.type === "SKIP_WAITING") {
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
    // ✅ ignoreSearch 讓 /index.html?id=TW0001 也能吃到快取
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (isNavigationRequest(request)) {
      const shell = await cache.match("./index.html", { ignoreSearch: true });
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

  // 第三方資源交給瀏覽器
  if (url.origin !== self.location.origin) return;

  // HTML 導航：network-first（確保更新快）
  if (isNavigationRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 靜態：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});