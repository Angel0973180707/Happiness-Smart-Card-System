/* ================================
 * sw.js (v399.8 COMPLETE OVERWRITE)
 * - App shell cache
 * - Stale-while-revalidate for static assets
 * - Network-first for HTML navigations (fallback to cache)
 * - Works with ?id=TW0001 style URLs
 * ================================ */

const SW_VERSION = "v399.8";
const CACHE_NAME = `hsc-cache-${SW_VERSION}`;

// ✅ 只快取「穩定不變」的殼（不要把 ?id 帶進去）
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og-card.png"
  // 若你之後新增：admin.html / share.html / admin.js 等，記得加在這裡
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(APP_SHELL);
    } catch (e) {
      // 有些檔案（例如 og-card.png）若暫時不存在，別讓整個 install 失敗
      // 逐個嘗試
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
  })());
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
    // 只快取同源且成功回應
    if (fresh && fresh.ok && isSameOrigin(request.url)) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // 導航離線 fallback：回 index.html
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

  // 不處理非 GET
  if (req.method !== "GET") return;

  // 第三方資源（fonts/cdn）不快取，由瀏覽器自己處理
  if (url.origin !== self.location.origin) return;

  // HTML 導航：Network-first（確保更新快）
  if (isNavigationRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 靜態資源：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});