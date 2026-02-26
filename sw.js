/* ================================
 * sw.js (v405 COMPLETE OVERWRITE)
 * - App shell cache
 * - Stale-while-revalidate for static assets
 * - Network-first for HTML navigations (fallback to cache)
 * - version.json: ALWAYS network (no cache)  ✅核心防呆
 * - FORCE UPDATE broadcast on activate
 * ================================ */

const SW_VERSION = "v405";
const CACHE_NAME = `hsc-cache-${SW_VERSION}`;

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
  // ❌ 不要把 version.json 加進 shell
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(APP_SHELL);
    } catch {
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

    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of allClients) {
      client.postMessage({ type: "SW_ACTIVATED", version: SW_VERSION });
    }
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
});

function isNavigationRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function isSameOrigin(url) {
  try { return new URL(url).origin === self.location.origin; }
  catch { return false; }
}

// ✅ version.json：永遠走網路、永遠不快取
function isVersionJson(urlObj) {
  return urlObj.pathname.endsWith("/version.json") || urlObj.pathname === "/version.json";
}

async function networkOnlyNoStore(request) {
  return fetch(request, { cache: "no-store" });
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

  // ✅ 核心：version.json 永遠 network-only no-store
  if (isVersionJson(url)) {
    event.respondWith(networkOnlyNoStore(req));
    return;
  }

  // HTML 導航：network-first
  if (isNavigationRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 靜態：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});