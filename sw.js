/* ================================
 * sw.js (v403 FORCE UPDATE)
 * COMPLETE OVERWRITE
 * ================================ */

const SW_VERSION = "v403";
const CACHE_NAME = `hsc-cache-${SW_VERSION}`;

// ✅ 只快取殼（不帶 ?id）
const APP_SHELL = [
  "./",
  "./index.html",
  "./share.html",
  "./style.css",
  "./app.js",
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
    for (const url of APP_SHELL) {
      try { await cache.add(url); } catch {}
    }
    self.skipWaiting(); // ✅ 強制進入 waiting->active 流程
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // 清舊 cache
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME && k.startsWith("hsc-cache-")) return caches.delete(k);
      return Promise.resolve();
    }));

    await self.clients.claim();

    // ✅ 主動通知所有頁面：SW 已更新到哪一版
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => {
      try { c.postMessage({ type: "SW_VERSION", value: SW_VERSION }); } catch {}
    });
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
    const fresh = await fetch(request, { cache: "no-store" });
    if (fresh && fresh.ok && isSameOrigin(request.url)) cache.put(request, fresh.clone());
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
    if (res && res.ok && isSameOrigin(request.url)) cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  return cached || fetchPromise || cached;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // HTML：Network-first
  if (isNavigationRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 靜態：SWR
  event.respondWith(staleWhileRevalidate(req));
});