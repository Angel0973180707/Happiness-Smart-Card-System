/* ================================
 * Happiness Smart Card System — sw.js (v3983COMPLETE OVERWRITE)
 * - Safe cache-first for static assets
 * - Network-first for GAS API (avoid stale card data)
 * - Auto cleanup old caches
 * ================================ */

const VERSION = "v3983";
const CACHE_NAME = `hsc-cache-${VERSION}`;
const RUNTIME_CACHE = `hsc-runtime-${VERSION}`;

// ✅ 需要預快取的靜態檔（只放你專案內、且不會常變的）
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 判斷是否為 GAS API 請求（避免把名片資料快取住）
function isGASRequest(url) {
  try {
    const u = new URL(url);
    return u.hostname.includes("script.google.com") || u.hostname.includes("script.googleusercontent.com");
  } catch {
    return false;
  }
}

// 判斷是否為同源靜態檔
function isSameOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 預快取失敗也不要阻擋安裝（避免某些檔不存在就卡死）
    await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => {
        if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
        return Promise.resolve();
      })
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  // 只處理 GET
  if (req.method !== "GET") return;

  // ✅ GAS：Network-first（永遠拿最新名片資料，不快取）
  if (isGASRequest(url)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: "no-store" });
        return res;
      } catch (e) {
        // 失敗就回傳一個清楚的 JSON（避免前端拿到 HTML/空白）
        return new Response(JSON.stringify({ ok: false, error: "network_error" }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    })());
    return;
  }

  // ✅ 同源靜態資源：Cache-first（提升速度）
  if (isSameOrigin(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // 成功才寫入快取
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        // 最後保底：離線時至少給首頁
        const fallback = await cache.match("./index.html", { ignoreSearch: true });
        return fallback || new Response("offline", { status: 503 });
      }
    })());
    return;
  }

  // ✅ 其他跨網域（字體/CDN）：stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) return cached;

    const net = await fetchPromise;
    return net || new Response("offline", { status: 503 });
  })());
});