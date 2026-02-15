/* sw.js — Angel Card PWA v354
   - Offline-first (App Shell)
   - Network-first for Google Sheet CSV (fallback to cache)
   - Cache-busting via VERSION
*/

const VERSION = "354";
const CACHE_NAME = `angel-card-v${VERSION}`;
const RUNTIME_CACHE = `angel-card-runtime-v${VERSION}`;

// ✅ App Shell：你目前這個名片是單檔版（index 內嵌 CSS/JS）
// 如果你未來拆成 style.css / app.js，再把它們加進來即可。
const APP_SHELL = [
  "./",
  `./index.html?v=${VERSION}`,
  `./manifest.json?v=${VERSION}`,
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap"
];

// 你的 icons 路徑若不同，請自行調整；抓不到也不會壞，只是離線時 icon 可能空。
const ICONS = [
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 盡量預存 app shell
      await cache.addAll([...APP_SHELL, ...ICONS].map((u) => new Request(u, { cache: "reload" })));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) return caches.delete(key);
        })
      );
      await self.clients.claim();
    })()
  );
});

// --- helpers ---
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req, { ignoreSearch: false });
  if (hit) return hit;

  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

function isSheetCSV(url) {
  // 你 index.html 內的 CSV 來源：docs.google.com ... export?format=csv
  return (
    url.hostname.includes("docs.google.com") &&
    url.pathname.includes("/spreadsheets/") &&
    url.searchParams.get("format") === "csv"
  );
}

function isGoogleFonts(url) {
  return url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com");
}

function isCDN(url) {
  return url.hostname.includes("cdnjs.cloudflare.com");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 只處理 GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 同源：HTML / manifest / icons -> cache-first（秒開）
  if (url.origin === self.location.origin) {
    // index / root / manifest / icons
    if (
      url.pathname === "/" ||
      url.pathname.endsWith("/index.html") ||
      url.pathname.endsWith("/manifest.json") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".jpeg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".svg")
    ) {
      event.respondWith(cacheFirst(req));
      return;
    }
  }

  // Google Sheet CSV：network-first（確保最新），離線用快取頂上
  if (isSheetCSV(url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Fonts / CDN：cache-first（穩定）
  if (isGoogleFonts(url) || isCDN(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 其他：預設 network-first（避免舊資料）
  event.respondWith(networkFirst(req));
});