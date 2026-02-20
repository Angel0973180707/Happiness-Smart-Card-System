/* ================================
 * Angel Card Service Worker (FULL OVERWRITE) v3853
 * Fix Focus:
 * - Incognito / mobile cache issues
 * - Ensure CSS/JS updates always apply
 * - Avoid caching HTML (index.html) to prevent white screen / old shell
 * - Never cache GAS/API responses
 * ================================ */

const SW_VERSION = "v3853";
const CACHE_STATIC = `angel-card-static-${SW_VERSION}`;
const CACHE_RUNTIME = `angel-card-runtime-${SW_VERSION}`;

// ✅ 只快取「殼資源」：CSS/JS/manifest/icons（不快取 HTML）
const PRECACHE_URLS = [
  "./style.css?v=3853",
  "./app.js?v=3853",
  "./manifest.json?v=3853",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og-card.png"
];

// ---- helpers ----
function isHTML(req) {
  const url = new URL(req.url);
  return (
    req.mode === "navigate" ||
    req.destination === "document" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/index.html")
  );
}

function isGASorAPI(req) {
  const url = new URL(req.url);
  // GAS WebApp
  if (url.hostname.includes("script.google.com")) return true;
  // 你也可加上自己的 API host
  return false;
}

function isStaticAsset(req) {
  const dest = req.destination;
  return (
    dest === "style" ||
    dest === "script" ||
    dest === "manifest" ||
    dest === "image" ||
    dest === "font"
  );
}

async function cachePutSafe(cacheName, req, res) {
  try {
    if (!res || res.status !== 200) return;
    const cache = await caches.open(cacheName);
    await cache.put(req, res.clone());
  } catch (_) {}
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    await cache.addAll(PRECACHE_URLS);
    // ✅ 直接啟用新 SW（避免使用者卡在舊版）
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // ✅ 清掉舊版本快取
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => {
        if (k.startsWith("angel-card-") && ![CACHE_STATIC, CACHE_RUNTIME].includes(k)) {
          return caches.delete(k);
        }
      })
    );

    // ✅ 讓所有分頁立刻接新 SW
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 只處理 GET
  if (req.method !== "GET") return;

  // ✅ GAS/API 永遠走網路（不快取）
  if (isGASorAPI(req)) {
    event.respondWith((async () => {
      try {
        // no-store + 強制更新
        const fresh = await fetch(req, { cache: "no-store" });
        return fresh;
      } catch (e) {
        // API 失敗就原樣丟錯（前端會保底）
        return new Response("", { status: 504, statusText: "API Offline" });
      }
    })());
    return;
  }

  // ✅ HTML：network-first（不快取 HTML）
  if (isHTML(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        return fresh;
      } catch (e) {
        // 失敗時退回到快取中「最接近」的殼（若你有單獨 index.html 檔可改成那個）
        const cached = await caches.match("./");
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // ✅ 靜態資源：stale-while-revalidate（先快取秒開，再背景更新）
  if (isStaticAsset(req)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const fetchPromise = (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          await cachePutSafe(CACHE_RUNTIME, req, fresh);
          return fresh;
        } catch (e) {
          return cached || new Response("", { status: 504 });
        }
      })();
      return cached || fetchPromise;
    })());
    return;
  }

  // ✅ 其他：network-first + runtime fallback
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      await cachePutSafe(CACHE_RUNTIME, req, fresh);
      return fresh;
    } catch (e) {
      const cached = await caches.match(req);
      return cached || new Response("", { status: 504 });
    }
  })());
});