/* ============================================================
   card-renderer.js
   HSC 唯一渲染模組
   v8.4.2-photo-wall-carousel-ratio-fix + v1.5.1-compat-bridge

   修正與升級項目：
   - v7.7.7: 修正 base64 DataURL 圖片無法顯示的問題
   - v8.4.1: applyThemeClasses 同步更新 document.body，
             修正預覽成品吃不到 style.css 主程式樣式顏色的問題
   - v8.4.1: 照片牆智慧排版升級
     * shouldUsePhotoCarousel_(photoCount, plan) 決策函式
     * buildPhotoCarousel_(photos, p, preview, allowActions) carousel HTML
     * initPhotoCarousel_(wall, options) 自動播放 + dots + touch + hover
     * free 5+ 張 → carousel；premium 4+ 張 → carousel
     * 1~4 張（free）/ 1~3 張（premium）維持原本 grid
     * 不影響既有 CTA / QR / 公告 / 跑馬燈 / grid 樣式
   - v8.4.2: 修正 premium / carousel 照片牆撐爆預覽高度問題
     * 新增 applyCarouselRatioStyles_()
     * carousel 視窗鎖定 1:1 / 16:9 比例
     * 每張 slide 固定為 100% viewport，不再被原圖尺寸撐開
     * 保留 cover / contain 與 photo_meta 裁切定位
   - v1.5.1: 相容橋接層
     * 新增 renderShell(root, shellData, options)
     * 新增 mergeLite(root, liteData, options)
     * 新增 mergeCardData(root, fullData, options)
     * 不破壞原本 renderCard(data, options) 用法
     * 讓新 app.js 可直接對接舊完整 renderer

   設計原則
   - 不依賴 form.js
   - 不依賴 app.js
   - 可直接給 index / form 共用
   - 支援 useExistingDom = true / false
   - 支援 photo_meta / preview_meta / QR / CTA / Dock / 跑馬燈
============================================================ */

(function (global) {
  "use strict";

  var DEFAULTS = {
    mode: "index",
    root: null,
    useExistingDom: true,
    qrMode: "card",
    allowActions: true
  };

  var PLAN_LIMITS = {
    free: { maxPhotos: 2, maxCtas: 1 },
    premium: { maxPhotos: 5, maxCtas: 3 }
  };

  var DEFAULT_PREVIEW_META = {
    theme: "",
    layout: "grid",
    aspect_ratio: "1:1",
    fit_mode: "cover"
  };

  var DEFAULT_PHOTO_META = {
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotate: 0
  };

  var BODY_MODE_CLASSES     = ["mode-free", "mode-premium"];
  var FREE_THEME_CLASSES    = ["color-1", "color-2", "color-3", "color-4", "color-5"];
  var PREMIUM_THEME_CLASSES = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
  var STYLE_CLASSES         = ["style-arch", "style-flat", "style-spot"];
  var PAPER_CLASSES         = ["paper-1", "paper-2", "paper-3"];
  var CARD_LAYOUT_CLASSES   = ["layout-grid", "layout-single"];
  var CARD_ASPECT_CLASSES   = ["ratio-1-1", "ratio-16-9"];
  var CARD_FIT_CLASSES      = ["fit-cover", "fit-contain"];

  function text(v) {
    return v == null ? "" : String(v).trim();
  }

  function clampNumber(value, min, max, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (Number.isFinite(min) && n < min) return min;
    if (Number.isFinite(max) && n > max) return max;
    return n;
  }

  function safeJsonParse(raw) {
    var s = String(raw || "").trim();
    if (!s) return null;
    s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
    try { return JSON.parse(s); } catch (_) {}
    var m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (_) {}
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeLongText(raw) {
    return String(raw || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function normalizeUrl(raw) {
    var v = String(raw || "").trim();
    if (!v) return "";
    if (/^(tel:|mailto:|sms:|line:|https?:\/\/|data:)/i.test(v)) return v;
    if (/^www\./i.test(v)) return "https://" + v;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
    return v;
  }

  function isDataUrl(url) {
    return typeof url === "string" && url.startsWith("data:");
  }

  function isBlobUrl(url) {
    return typeof url === "string" && url.startsWith("blob:");
  }

  function isLocalUrl(url) {
    return isDataUrl(url) || isBlobUrl(url);
  }

  function normalizeImageUrl(raw) {
    var url = normalizeUrl(raw);
    if (!url) return "";
    if (isLocalUrl(url)) return url;

    if (url.includes("dropbox.com")) {
      url = url.replace("dl=0", "raw=1");
      if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
      return url;
    }

    if (url.includes("drive.google.com") && url.includes("/file/d/")) {
      var m = url.match(/\/file\/d\/([^/]+)/i);
      if (m && m[1]) {
        return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(m[1]);
      }
    }

    return url;
  }

  function buildImgCandidates(raw) {
    var s = text(raw);
    if (!s) return [];
    var url = normalizeImageUrl(s);
    if (!url) return [];
    if (isLocalUrl(url)) return [url];

    var out = [url];
    if (url.includes("drive.google.com/uc?export=view&id=")) {
      var m = url.match(/id=([^&]+)/i);
      if (m && m[1]) {
        var id = decodeURIComponent(m[1]);
        out.push("https://drive.google.com/thumbnail?id=" + id + "&sz=w1200");
        out.push("https://drive.google.com/uc?export=download&id=" + id);
      }
    }
    return out.filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function setImgWithFallback(imgEl, candidates, options) {
    var opts = options || {};
    var list = (candidates || []).filter(Boolean);

    if (!imgEl) { if (typeof opts.onFail === "function") opts.onFail(); return; }
    if (!list.length) { if (typeof opts.onFail === "function") opts.onFail(); return; }

    var idx = 0;
    var done = false;

    if (!isLocalUrl(list[0])) {
      imgEl.referrerPolicy = opts.referrerPolicy || "no-referrer";
      try { imgEl.crossOrigin = opts.crossOrigin || "anonymous"; } catch (_) {}
    }

    function buildSrc(src) {
      if (isLocalUrl(src)) return src;
      var sep = src.includes("?") ? "&" : "?";
      return src + sep + "t=" + Date.now();
    }

    function cleanup() { imgEl.onerror = null; imgEl.onload = null; }
    function failAll() {
      if (done) return;
      done = true;
      cleanup();
      if (typeof opts.onFail === "function") opts.onFail();
    }

    function tryNext() {
      if (done) return;
      idx += 1;
      if (idx >= list.length) { failAll(); return; }
      imgEl.src = buildSrc(list[idx]);
    }

    imgEl.onload = function () {
      if (done) return;
      done = true;
      cleanup();
      if (typeof opts.onLoad === "function") opts.onLoad();
    };
    imgEl.onerror = function () { tryNext(); };
    imgEl.src = buildSrc(list[0]);
  }

  function openUrl(url) {
    var u = normalizeUrl(url);
    if (!u) return;
    window.open(u, "_blank", "noopener");
  }

  function openMapByAddress(addr) {
    var a = text(addr);
    if (!a) return;
    var q = encodeURIComponent(a);
    window.open("https://www.google.com/maps/search/?api=1&query=" + q, "_blank", "noopener");
  }

  function normalizeSinglePhotoMeta(raw) {
    var meta = raw && typeof raw === "object" ? raw : {};
    return {
      x:      clampNumber(meta.x,      0,    1,    DEFAULT_PHOTO_META.x),
      y:      clampNumber(meta.y,      0,    1,    DEFAULT_PHOTO_META.y),
      scale:  clampNumber(meta.scale,  0.5,  3,    DEFAULT_PHOTO_META.scale),
      rotate: clampNumber(meta.rotate, -180, 180,  DEFAULT_PHOTO_META.rotate)
    };
  }

  function normalizePhotoMetaMap(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    var out = {};
    for (var i = 1; i <= 10; i++) {
      out["photo" + i] = normalizeSinglePhotoMeta(src["photo" + i]);
    }
    return out;
  }

  function normalizePreviewMeta(raw) {
    var meta   = raw && typeof raw === "object" ? raw : {};
    var theme  = text(meta.theme).toLowerCase();
    var layout = text(meta.layout).toLowerCase();
    var aspect = text(meta.aspect_ratio || meta.aspectRatio).trim();
    var fit    = text(meta.fit_mode || meta.fitMode).toLowerCase();
    return {
      theme:        theme === "premium" || theme === "free" ? theme : DEFAULT_PREVIEW_META.theme,
      layout:       layout === "single" ? "single" : DEFAULT_PREVIEW_META.layout,
      aspect_ratio: aspect === "16:9" ? "16:9" : DEFAULT_PREVIEW_META.aspect_ratio,
      fit_mode:     fit === "contain" ? "contain" : DEFAULT_PREVIEW_META.fit_mode
    };
  }

  function normalizeFeatures(card) {
    var src = card && typeof card === "object" ? card : {};
    var parsed = {};

    if (src.features && typeof src.features === "object") {
      parsed = src.features;
    } else {
      var fromJson = safeJsonParse(src.features_json);
      if (fromJson && typeof fromJson === "object") parsed = fromJson;
    }

    src.features = {
      photo_meta:         normalizePhotoMetaMap(parsed.photo_meta),
      preview_meta:       normalizePreviewMeta(parsed.preview_meta),
      photo_preview_urls: (parsed.photo_preview_urls && typeof parsed.photo_preview_urls === "object")
                            ? parsed.photo_preview_urls
                            : {}
    };

    return src;
  }

  function buildNormalizedPayload(obj) {
    if (!obj || typeof obj !== "object") return obj;
    var out   = { __raw: obj };
    var lower = Object.create(null);

    Object.keys(obj).forEach(function (k) {
      var nk = String(k || "").trim();
      if (!nk) return;
      var v = obj[k];
      if (out[nk] == null || text(out[nk]) === "") out[nk] = v;
      lower[nk.toLowerCase()] = v;
    });

    out.__lower = lower;
    return out;
  }

  function pick(p, keys) {
    if (!p) return "";
    var lower = p.__lower || null;
    for (var i = 0; i < keys.length; i++) {
      var kk = String(keys[i] || "").trim();
      var direct = p[kk];
      if (direct != null && text(direct) !== "") return direct;
      if (lower) {
        var v2 = lower[kk.toLowerCase()];
        if (v2 != null && text(v2) !== "") return v2;
      }
    }
    return "";
  }

  function getPreviewUrl(p, key) {
    var raw = p && p.__raw;
    if (!raw) return "";
    var features = raw.features;
    if (!features || typeof features !== "object") return "";
    var ppu = features.photo_preview_urls;
    if (!ppu || typeof ppu !== "object") return "";
    return text(ppu[key]);
  }

  function normalizePlan(v) {
    return text(v).toLowerCase() === "premium" ? "premium" : "free";
  }

  function mapFreeColorToTheme(v) {
    var raw = text(v).toLowerCase();
    var map = {
      c1: "color-1", c2: "color-2", c3: "color-3", c4: "color-4", c5: "color-5",
      "color-1": "color-1", "color-2": "color-2", "color-3": "color-3",
      "color-4": "color-4", "color-5": "color-5"
    };
    return map[raw] || "color-1";
  }

  function mapStyleToUi(v) {
    var raw = text(v).toLowerCase();
    var map = { s1: "arch", s2: "flat", s3: "spot", arch: "arch", flat: "flat", spot: "spot" };
    return map[raw] || "arch";
  }

  function mapPaperToUi(v) {
    var raw = text(v).toLowerCase();
    var map = {
      f1: "paper-1", f2: "paper-2", f3: "paper-3",
      "paper-1": "paper-1", "paper-2": "paper-2", "paper-3": "paper-3"
    };
    return map[raw] || "paper-1";
  }

  function mapPremiumToUi(v) {
    var raw = text(v).toLowerCase();
    return ["p1", "p2", "p3", "p4", "p5", "p6", "p7"].includes(raw) ? raw : "p1";
  }

  function getPreviewMeta(p) {
    return normalizePreviewMeta(
      p && p.__raw && p.__raw.features ? p.__raw.features.preview_meta : null
    );
  }

  function getPhotoMeta(p, key) {
    var map = normalizePhotoMetaMap(
      p && p.__raw && p.__raw.features ? p.__raw.features.photo_meta : null
    );
    return map[key] || Object.assign({}, DEFAULT_PHOTO_META);
  }

  function getEffectiveTheme(p) {
    var preview = getPreviewMeta(p);
    if (preview.theme === "premium" || preview.theme === "free") return preview.theme;
    return normalizePlan(pick(p, ["plan"]));
  }

  function getPhotoLimitFromPayload(p) {
    var limit = Number(pick(p, ["photo_limit"]));
    if (Number.isFinite(limit) && limit > 0 && limit <= 10) return limit;
    var theme = getEffectiveTheme(p);
    return PLAN_LIMITS[theme] ? PLAN_LIMITS[theme].maxPhotos : PLAN_LIMITS.free.maxPhotos;
  }

  function getCtaLimitFromPayload(p) {
    var limit = Number(pick(p, ["cta_limit"]));
    if (Number.isFinite(limit) && limit > 0 && limit <= 10) return limit;
    var theme = getEffectiveTheme(p);
    return PLAN_LIMITS[theme] ? PLAN_LIMITS[theme].maxCtas : PLAN_LIMITS.free.maxCtas;
  }

  function getMarqueeText(p) {
    return text(pick(p, ["marquee_text"]));
  }

  function isMarqueeEnabled(p) {
    var v = text(pick(p, ["marquee_enabled"])).toLowerCase();
    if (["1", "true", "yes", "y"].includes(v)) return true;
    return !!getMarqueeText(p);
  }

  function pickAvatarInfo(p) {
    var url = pick(p, ["avatar_url"]);
    if (text(url)) return { key: "avatar_url", raw: url, url: normalizeImageUrl(url) };

    var b64 = getPreviewUrl(p, "avatar");
    if (b64) return { key: "avatar_preview", raw: b64, url: b64 };

    var uimg = pick(p, ["u-img"]);
    if (text(uimg)) return { key: "u-img", raw: uimg, url: normalizeImageUrl(uimg) };

    var fallback = pick(p, ["photo1_url"]);
    if (text(fallback)) return { key: "photo1_url", raw: fallback, url: normalizeImageUrl(fallback) };

    return { key: "", raw: "", url: "" };
  }

  function pickLogoInfo(p) {
    var url = pick(p, ["logo_url"]);
    if (text(url)) return { key: "logo_url", raw: url, url: normalizeImageUrl(url) };

    var b64 = getPreviewUrl(p, "logo");
    if (b64) return { key: "logo_preview", raw: b64, url: b64 };

    return { key: "", raw: "", url: "" };
  }

  function buildCtaItems(p) {
    var limit = getCtaLimitFromPayload(p);
    var items = [];
    for (var i = 1; i <= 3; i++) {
      var label = text(pick(p, ["cta_text_" + i, "ctaText" + i, "CTA文字" + i]));
      var link  = normalizeUrl(pick(p, ["cta_link_" + i, "ctaLink" + i, "CTA連結" + i]));
      if (!label || !link) continue;
      if (items.length >= limit) break;
      items.push({ label: label, link: link });
    }
    return items;
  }

  function buildMediaItems(p) {
    var items = [];
    ["video1", "video2", "video3"].forEach(function (k, i) {
      var u = normalizeUrl(pick(p, [k, "影音連結" + (i + 1)]));
      if (u) items.push({ kind: "video", idx: i + 1, url: u });
    });
    ["social1", "social2", "social3"].forEach(function (k, i) {
      var u = normalizeUrl(pick(p, [k, "社群連結" + (i + 1)]));
      if (u) items.push({ kind: "social", idx: i + 1, url: u });
    });
    return items;
  }

  function inferLinkMeta(url, kind, idx) {
    var u = String(url || "").toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be"))
      return { label: "YouTube",   icon: "fa-brands fa-youtube",   cls: "dock-yt" };
    if (u.includes("facebook.com") || u.includes("fb.com"))
      return { label: "FB",        icon: "fa-brands fa-facebook",  cls: "dock-fb" };
    if (u.includes("instagram.com"))
      return { label: "Instagram", icon: "fa-brands fa-instagram", cls: "dock-ig" };
    if (u.includes("threads.net"))
      return { label: "Threads",   icon: "fa-solid fa-at",         cls: "dock-web" };
    if (kind === "video") return { label: "影音 " + idx, icon: "fa-solid fa-play",  cls: "dock-web" };
    return { label: "社群 " + idx, icon: "fa-solid fa-link", cls: "dock-web" };
  }

  function createDockBtn(label, icon, extraClass, onClick) {
    var btn = document.createElement("button");
    btn.className = "dock-btn" + (extraClass ? " " + extraClass : "");
    btn.type = "button";
    btn.innerHTML = "<i class=\"" + icon + "\"></i><span>" + escapeHtml(label) + "</span>";
    if (typeof onClick === "function") btn.addEventListener("click", onClick);
    return btn;
  }

  function applyWideRule(container) {
    if (!container) return;
    var btns = Array.from(container.querySelectorAll(".dock-btn"));
    btns.forEach(function (b) { b.classList.remove("wide"); });
    if (btns.length % 2 === 1 && btns.length > 0) {
      btns[btns.length - 1].classList.add("wide");
    }
  }

  function getQrCenterRatio(baseRatio) {
    var vw = window.innerWidth || 390;
    if (vw <= 360) return Math.max(0.06, baseRatio - 0.02);
    if (vw <= 520) return Math.max(0.07, baseRatio - 0.01);
    return baseRatio;
  }

  function buildQrImageUrl(url, size) {
    var s = Number(size) || 220;
    return "https://api.qrserver.com/v1/create-qr-code/"
      + "?size=" + encodeURIComponent(s + "x" + s)
      + "&data=" + encodeURIComponent(String(url))
      + "&ecc=H&margin=2";
  }

  function hideCenterImg(imgEl) {
    if (!imgEl) return;
    imgEl.removeAttribute("src");
    imgEl.style.display    = "none";
    imgEl.style.background = "transparent";
    imgEl.style.padding    = "0";
    imgEl.style.boxShadow  = "none";
  }

  function setCenterImg(imgEl, centerImgUrl, sizeRatio) {
    if (!imgEl) return;
    var u = normalizeImageUrl(centerImgUrl);
    if (!u) { hideCenterImg(imgEl); return; }

    var ratio = getQrCenterRatio(sizeRatio || 0.09);
    imgEl.dataset.baseRatio  = String(sizeRatio || 0.09);
    imgEl.dataset.centerUrl  = u;
    imgEl.style.position     = "absolute";
    imgEl.style.left         = "50%";
    imgEl.style.top          = "50%";
    imgEl.style.width        = Math.round(ratio * 100) + "%";
    imgEl.style.height       = Math.round(ratio * 100) + "%";
    imgEl.style.transform    = "translate(-50%, -50%)";
    imgEl.style.borderRadius = "999px";
    imgEl.style.objectFit    = "cover";
    imgEl.style.zIndex       = "3";
    imgEl.style.background   = "transparent";
    imgEl.style.padding      = "0";
    imgEl.style.boxShadow    = "none";
    imgEl.style.display      = "block";
    imgEl.style.pointerEvents = "none";

    var loadOpts = isLocalUrl(u)
      ? {
          onLoad: function () { imgEl.style.display = "block"; },
          onFail: function () { hideCenterImg(imgEl); }
        }
      : {
          crossOrigin:    "anonymous",
          referrerPolicy: "no-referrer",
          onLoad: function () { imgEl.style.display = "block"; },
          onFail: function () { hideCenterImg(imgEl); }
        };

    setImgWithFallback(imgEl, buildImgCandidates(u), loadOpts);
  }

  function renderQr(options) {
    var opts          = options || {};
    var container     = opts.container;
    var url           = opts.url;
    var size          = opts.size || 160;
    var centerImgEl   = opts.centerImgEl || null;
    var centerImgUrl  = opts.centerImgUrl || "";
    var centerSizeRatio = opts.centerSizeRatio || 0.09;

    if (!container || !url) return false;

    var key = url + "|" + size + "|" + normalizeImageUrl(centerImgUrl) + "|" + centerSizeRatio;
    if (container.dataset.renderKey === key) {
      if (centerImgEl) setCenterImg(centerImgEl, centerImgUrl, centerSizeRatio);
      return true;
    }

    container.dataset.renderKey = key;
    container.innerHTML = "";

    var img = document.createElement("img");
    img.alt           = "QR Code";
    img.loading       = "eager";
    img.decoding      = "sync";
    img.referrerPolicy = "no-referrer";
    try { img.crossOrigin = "anonymous"; } catch (_) {}
    img.src = buildQrImageUrl(url, size) + "&t=" + Date.now();
    img.style.cssText = "width:100%;height:100%;display:block;object-fit:contain;";
    container.appendChild(img);

    if (centerImgEl) setCenterImg(centerImgEl, centerImgUrl, centerSizeRatio);
    return true;
  }

  function buildGeneratedTemplate(root, mode) {
    root.innerHTML = [
      '<div class="hsc-render-root ' + (mode === "form" ? "hsc-render-form" : "hsc-render-index") + '">',
      '  <section class="card" data-card-root>',
      '    <div class="premium-fx-layer"></div>',
      '    <div class="banner"><div class="dynamic-mask"></div></div>',
      '    <div class="paper-overlay"></div>',
      '    <div class="avatar-wrap">',
      '      <div class="avatar-circle">',
      '        <img class="avatar" data-u-img alt="個人照" />',
      '      </div>',
      '    </div>',
      '    <div class="premium-badge" data-premium-badge style="display:none;">',
      '      <span class="badge-dot"></span><span class="badge-text">精品設計</span>',
      '    </div>',
      '    <div class="logo-wrap" data-logo-wrap style="display:none;">',
      '      <img class="logo-img" data-u-logo alt="Logo" />',
      '    </div>',
      '    <div class="info-scroll">',
      '      <div class="name" data-u-name></div>',
      '      <div class="text-toggle-wrap unit-wrap" data-u-unit-wrap style="display:none;">',
      '        <div class="unit" data-u-unit></div>',
      '      </div>',
      '      <div class="title" data-u-title></div>',
      '      <div class="text-toggle-wrap slogan-wrap" data-u-slogan-wrap style="display:none;">',
      '        <div class="slogan preline" data-u-slogan></div>',
      '      </div>',
      '      <div class="info-block" data-block-service style="display:none;"></div>',
      '      <div class="info-block" data-block-exp style="display:none;"></div>',
      '      <div class="contact-dock" data-contact-dock style="display:none;">',
      '        <div class="dock-title"><i class="fa-solid fa-address-card"></i> 聯繫方式</div>',
      '        <div class="dock-buttons" data-contact-buttons></div>',
      '      </div>',
      '      <div class="contact-dock marquee-dock" data-marquee-dock style="display:none;">',
      '        <div class="dock-title"><i class="fa-solid fa-bullhorn"></i> 重要訊息</div>',
      '        <div class="marquee-shell" data-marquee-shell>',
      '          <div class="marquee-track" data-marquee-track>',
      '            <span class="marquee-text" data-marquee-text></span>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="contact-dock primary-link-dock" data-primary-link-dock style="display:none;">',
      '        <div class="dock-title"><i class="fa-solid fa-globe"></i> 主網站</div>',
      '        <div class="dock-buttons" data-primary-link-buttons></div>',
      '      </div>',
      '      <div class="contact-dock" data-media-dock style="display:none;">',
      '        <div class="dock-title"><i class="fa-solid fa-clapperboard"></i> 影音／社群</div>',
      '        <div class="dock-buttons" data-media-buttons></div>',
      '      </div>',
      '      <div class="contact-dock cta-dock" data-cta-dock style="display:none;">',
      '        <div class="dock-title"><i class="fa-solid fa-bolt"></i> 立即行動</div>',
      '        <div class="dock-buttons" data-cta-buttons></div>',
      '      </div>',
      '      <div class="photo-wall" data-photo-wall style="display:none;">',
      '        <div class="dock-title"><i class="fa-regular fa-images"></i> 照片</div>',
      '        <div class="photo-grid" data-photo-grid></div>',
      '      </div>',
      '      <div class="card-expiry" id="cardExpiry" style="display:none;"></div>',
      '      <div class="qr-bottom" data-bottom-qr-section style="display:none;">',
      '        <div class="qr-bottom-head">',
      '          <div class="qr-bottom-title">掃描 QRcode｜開啟我的智慧名片</div>',
      '          <div class="qr-bottom-sub">可收藏・可分享・可快速回看</div>',
      '        </div>',
      '        <div class="qr-bottom-wrap">',
      '          <div class="qr-bottom-canvas" style="position:relative;">',
      '            <div class="qr-bottom-grid" data-bottom-qr-grid></div>',
      '            <img data-bottom-qr-avatar alt="QR 頭像" />',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </section>',
      '</div>'
    ].join("\n");

    return getScope(root, false);
  }

  function getScope(root, useExistingDom) {
    var q = function (sel) { return root.querySelector(sel); };

    if (useExistingDom) {
      return {
        root:               root,
        cardRoot:           q("#card") || q(".card"),
        banner:             q("#banner") || q(".banner"),
        paperOverlay:       q("#paperOverlay") || q(".paper-overlay"),
        premiumBadge:       q("#premiumBadge") || q(".premium-badge"),
        avatar:             q("#u-img"),
        logoWrap:           q("#logoWrap"),
        logo:               q("#u-logo"),
        name:               q("#u-name"),
        unitWrap:           q("#u-unit-wrap"),
        unit:               q("#u-unit"),
        title:              q("#u-title"),
        sloganWrap:         q("#u-slogan-wrap"),
        slogan:             q("#u-slogan"),
        blockService:       q("#block-service") || q("[data-block-service]"),
        blockExp:           q("#block-exp") || q("[data-block-exp]"),
        contactDock:        q("#contactDock") || q("[data-contact-dock]"),
        contactButtons:     q("#contactButtons") || q("[data-contact-buttons]"),
        marqueeDock:        q("#marqueeDock") || q("[data-marquee-dock]"),
        marqueeShell:       q("#marqueeShell") || q("[data-marquee-shell]"),
        marqueeTrack:       q("#marqueeTrack") || q("[data-marquee-track]"),
        marqueeText:        q("#marqueeText") || q("[data-marquee-text]"),
        primaryLinkDock:    q("#primaryLinkDock") || q("[data-primary-link-dock]"),
        primaryLinkButtons: q("#primaryLinkButtons") || q("[data-primary-link-buttons]"),
        mediaDock:          q("#mediaDock") || q("[data-media-dock]"),
        mediaButtons:       q("#mediaButtons") || q("[data-media-buttons]"),
        ctaDock:            q("#ctaDock") || q("[data-cta-dock]"),
        ctaButtons:         q("#ctaButtons") || q("[data-cta-buttons]"),
        photoWall:          q("#photoWall") || q("[data-photo-wall]"),
        photoGrid:          q("#photoGrid") || q("[data-photo-grid]"),
        cardExpiry:         q("#cardExpiry"),
        bottomQrSection:    q("#bottomQrSection"),
        bottomQrGrid:       q("#bottomQrGrid"),
        bottomQrAvatar:     q("#bottomQrAvatar")
      };
    }

    return {
      root:               root,
      cardRoot:           q("[data-card-root]"),
      banner:             q(".banner"),
      paperOverlay:       q(".paper-overlay"),
      premiumBadge:       q("[data-premium-badge]"),
      avatar:             q("[data-u-img]"),
      logoWrap:           q("[data-logo-wrap]"),
      logo:               q("[data-u-logo]"),
      name:               q("[data-u-name]"),
      unitWrap:           q("[data-u-unit-wrap]"),
      unit:               q("[data-u-unit]"),
      title:              q("[data-u-title]"),
      sloganWrap:         q("[data-u-slogan-wrap]"),
      slogan:             q("[data-u-slogan]"),
      blockService:       q("[data-block-service]"),
      blockExp:           q("[data-block-exp]"),
      contactDock:        q("[data-contact-dock]"),
      contactButtons:     q("[data-contact-buttons]"),
      marqueeDock:        q("[data-marquee-dock]"),
      marqueeShell:       q("[data-marquee-shell]"),
      marqueeTrack:       q("[data-marquee-track]"),
      marqueeText:        q("[data-marquee-text]"),
      primaryLinkDock:    q("[data-primary-link-dock]"),
      primaryLinkButtons: q("[data-primary-link-buttons]"),
      mediaDock:          q("[data-media-dock]"),
      mediaButtons:       q("[data-media-buttons]"),
      ctaDock:            q("[data-cta-dock]"),
      ctaButtons:         q("[data-cta-buttons]"),
      photoWall:          q("[data-photo-wall]"),
      photoGrid:          q("[data-photo-grid]"),
      cardExpiry:         q("#cardExpiry"),
      bottomQrSection:    q("[data-bottom-qr-section]"),
      bottomQrGrid:       q("[data-bottom-qr-grid]"),
      bottomQrAvatar:     q("[data-bottom-qr-avatar]")
    };
  }

  function applyThemeClasses(p, scope, options) {
    var root     = scope.root;
    var cardRoot = scope.cardRoot;
    var preview  = getPreviewMeta(p);
    var effectivePlan = preview.theme || normalizePlan(pick(p, ["plan"]));

    var classTargets = [document.body];
    if (root && root !== document.body) classTargets.push(root);
    if (cardRoot && cardRoot !== root && cardRoot !== document.body) classTargets.push(cardRoot);

    classTargets.forEach(function (el) {
      if (!el) return;
      BODY_MODE_CLASSES.forEach(function (c)     { el.classList.remove(c); });
      FREE_THEME_CLASSES.forEach(function (c)    { el.classList.remove(c); });
      PREMIUM_THEME_CLASSES.forEach(function (c) { el.classList.remove(c); });
      STYLE_CLASSES.forEach(function (c)         { el.classList.remove(c); });
      PAPER_CLASSES.forEach(function (c)         { el.classList.remove(c); });
    });

    var modeClass = effectivePlan === "premium" ? "mode-premium" : "mode-free";
    classTargets.forEach(function (el) { if (el) el.classList.add(modeClass); });

    if (effectivePlan === "premium") {
      var premiumClass = mapPremiumToUi(pick(p, ["color"]) || "p1");
      classTargets.forEach(function (el) { if (el) el.classList.add(premiumClass); });
    } else {
      var freeColor = mapFreeColorToTheme(pick(p, ["color"]) || "c1");
      var styleClass = "style-" + mapStyleToUi(pick(p, ["style"]) || "s1");
      var paperClass = mapPaperToUi(pick(p, ["paper"]) || "f1");
      classTargets.forEach(function (el) {
        if (!el) return;
        el.classList.add(freeColor);
        el.classList.add(styleClass);
        el.classList.add(paperClass);
      });
    }

    if (scope.premiumBadge) {
      scope.premiumBadge.style.display = effectivePlan === "premium" ? "" : "none";
    }

    if (cardRoot) {
      CARD_LAYOUT_CLASSES.forEach(function (c) { cardRoot.classList.remove(c); });
      CARD_ASPECT_CLASSES.forEach(function (c) { cardRoot.classList.remove(c); });
      CARD_FIT_CLASSES.forEach(function (c)    { cardRoot.classList.remove(c); });
      cardRoot.classList.add(preview.layout === "single"      ? "layout-single" : "layout-grid");
      cardRoot.classList.add(preview.aspect_ratio === "16:9"  ? "ratio-16-9"    : "ratio-1-1");
      cardRoot.classList.add(preview.fit_mode === "contain"   ? "fit-contain"   : "fit-cover");
    }
  }

  function renderAvatar(p, scope) {
    var img = scope.avatar;
    if (!img) return;
    var info = pickAvatarInfo(p);
    var u = info.url;
    if (!u) { img.removeAttribute("src"); img.style.display = "none"; return; }
    img.style.display = "block";
    if (isLocalUrl(u)) { img.src = u; return; }
    setImgWithFallback(img, buildImgCandidates(u), {
      onLoad: function () { img.style.display = "block"; },
      onFail: function () { img.removeAttribute("src"); img.style.display = "none"; }
    });
  }

  function renderLogo(p, scope) {
    var wrap = scope.logoWrap;
    var img  = scope.logo;
    if (!wrap || !img) return;
    var info = pickLogoInfo(p);
    var u = info.url;
    if (!u) { wrap.style.display = "none"; img.removeAttribute("src"); return; }
    wrap.style.display = "flex";
    img.style.display  = "block";
    if (isLocalUrl(u)) { img.src = u; return; }
    setImgWithFallback(img, buildImgCandidates(u), {
      onLoad:  function () { wrap.style.display = "flex"; img.style.display = "block"; },
      onFail:  function () { wrap.style.display = "none"; img.removeAttribute("src"); img.style.display = "none"; }
    });
  }

  function renderTexts(p, scope) {
    var nameVal   = text(pick(p, ["name", "display_name", "姓名"])) || "未命名";
    var unitVal   = normalizeLongText(pick(p, ["unit", "單位", "公司"]));
    var titleVal  = text(pick(p, ["title", "職稱"])) || "";
    var sloganVal = normalizeLongText(pick(p, ["slogan", "intro", "一句話", "簡介"]));

    if (scope.name)   scope.name.textContent   = nameVal;
    if (scope.unit)   scope.unit.textContent   = unitVal;
    if (scope.title)  scope.title.textContent  = titleVal;
    if (scope.slogan) scope.slogan.textContent = sloganVal;

    if (scope.unitWrap)   scope.unitWrap.style.display   = unitVal   ? "" : "none";
    if (scope.sloganWrap) scope.sloganWrap.style.display = sloganVal ? "" : "none";
  }

  function renderInfoBlock(blockEl, title, body) {
    if (!blockEl) return;
    var value = normalizeLongText(body);
    if (!value) { blockEl.style.display = "none"; blockEl.innerHTML = ""; return; }
    blockEl.style.display = "";
    blockEl.innerHTML =
      '<div class="block-title">' + escapeHtml(title) + '</div>' +
      '<div class="block-body preline">' + escapeHtml(value) + '</div>';
  }

  function renderBlocks(p, scope) {
    renderInfoBlock(scope.blockService, "服務項目",
      pick(p, ["services", "服務項目", "service"]));
    renderInfoBlock(scope.blockExp, "經歷 / 品牌故事",
      pick(p, ["experience", "經歷", "exp"]));
  }

  function renderMarquee(p, scope) {
    var dock   = scope.marqueeDock;
    var shell  = scope.marqueeShell;
    var track  = scope.marqueeTrack;
    var textEl = scope.marqueeText;
    if (!dock || !shell || !track || !textEl) return;

    var marqueeText = getMarqueeText(p);
    var enabled = isMarqueeEnabled(p);

    if (!enabled || !marqueeText) {
      dock.style.display = "none";
      textEl.textContent = "";
      track.style.removeProperty("--marquee-duration");
      dock.classList.remove("is-static");
      return;
    }

    var parts = marqueeText.split("｜").map(function (s) { return s.trim(); }).filter(Boolean);
    var joined = (parts.length ? parts : [marqueeText]).join("　｜　");
    textEl.textContent = joined + "　｜　" + joined + "　｜　";
    dock.style.display = "";

    requestAnimationFrame(function () {
      var shellWidth = shell.clientWidth || 280;
      var textWidth  = textEl.scrollWidth || shellWidth;
      var distance   = Math.max(textWidth, shellWidth);
      var duration   = Math.max(10, Math.round(distance / 36));
      track.style.setProperty("--marquee-duration", duration + "s");
      if (textWidth <= shellWidth + 20) dock.classList.add("is-static");
      else dock.classList.remove("is-static");
    });
  }

  function renderContactDock(p, scope, options) {
    var dock = scope.contactDock;
    var btns = scope.contactButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";

    var phone    = pick(p, ["phone", "電話"]);
    var email    = pick(p, ["email", "Email"]);
    var address  = pick(p, ["address", "地址"]);
    var lineUrl  = normalizeUrl(pick(p, ["line_url", "line_oa", "LINE連結"]));
    var wechatId = text(pick(p, ["wechat_id", "wechat", "微信ID", "微信"]));
    var allowActions = options.allowActions !== false;
    var list = [];

    if (lineUrl) {
      list.push(createDockBtn("私訊 LINE", "fa-brands fa-line", "dock-line", function () {
        if (allowActions) openUrl(lineUrl);
      }));
    }
    if (wechatId) {
      list.push(createDockBtn("微信ID", "fa-brands fa-weixin", "dock-web", function () {
        if (!allowActions) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText)
            navigator.clipboard.writeText(wechatId);
        } catch (_) {}
      }));
    }
    if (phone) {
      list.push(createDockBtn("電話", "fa-solid fa-phone", "dock-web", function () {
        if (!allowActions) return;
        location.href = "tel:" + text(phone);
      }));
    }
    if (email) {
      list.push(createDockBtn("Email", "fa-solid fa-envelope", "dock-web", function () {
        if (!allowActions) return;
        location.href = "mailto:" + text(email);
      }));
    }
    if (address) {
      list.push(createDockBtn("地址導航", "fa-solid fa-location-dot", "dock-map", function () {
        if (!allowActions) return;
        openMapByAddress(address);
      }));
    }

    if (!list.length) { dock.style.display = "none"; return; }
    list.forEach(function (btn) { btns.appendChild(btn); });
    dock.style.display = "";
    applyWideRule(btns);
  }

  function renderPrimaryLinkDock(p, scope, options) {
    var dock = scope.primaryLinkDock;
    var btns = scope.primaryLinkButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";
    var website = normalizeUrl(pick(p, ["website", "網站", "web", "homepage"]));
    if (!website) { dock.style.display = "none"; return; }
    var allowActions = options.allowActions !== false;
    btns.appendChild(createDockBtn("官方網站", "fa-solid fa-globe", "dock-web wide", function () {
      if (allowActions) openUrl(website);
    }));
    dock.style.display = "";
  }

  function renderMediaDock(p, scope, options) {
    var dock = scope.mediaDock;
    var btns = scope.mediaButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";
    var items = buildMediaItems(p);
    var allowActions = options.allowActions !== false;
    if (!items.length) { dock.style.display = "none"; return; }
    items.forEach(function (item) {
      var meta = inferLinkMeta(item.url, item.kind, item.idx);
      btns.appendChild(createDockBtn(meta.label, meta.icon, meta.cls, function () {
        if (allowActions) openUrl(item.url);
      }));
    });
    dock.style.display = "";
    applyWideRule(btns);
  }

  function renderCtaDock(p, scope, options) {
    var dock = scope.ctaDock;
    var btns = scope.ctaButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";
    var items = buildCtaItems(p);
    var allowActions = options.allowActions !== false;
    if (!items.length) { dock.style.display = "none"; return; }
    items.forEach(function (item, idx) {
      btns.appendChild(createDockBtn(
        item.label,
        idx === 0 ? "fa-solid fa-bolt" : "fa-solid fa-arrow-up-right-from-square",
        items.length === 1 ? "dock-web wide" : "dock-web",
        function () { if (allowActions) openUrl(item.link); }
      ));
    });
    dock.style.display = "";
    applyWideRule(btns);
  }

  function collectPhotos(p) {
    var photos = [];
    var limit  = getPhotoLimitFromPayload(p);

    for (var i = 1; i <= limit; i++) {
      var raw = pick(p, ["photo" + i + "_url", "photo_url_" + i]);
      var url = raw ? normalizeImageUrl(raw) : "";

      if (url) {
        photos.push({ key: "photo" + i, url: url });
        continue;
      }

      var b64 = getPreviewUrl(p, "photo" + i);
      if (b64) photos.push({ key: "photo" + i, url: b64 });
    }

    return photos;
  }

  function applyPhotoMetaToImg(img, meta, fitMode) {
    if (!img) return;
    var x      = clampNumber(meta && meta.x,      0,    1,   DEFAULT_PHOTO_META.x);
    var y      = clampNumber(meta && meta.y,      0,    1,   DEFAULT_PHOTO_META.y);
    var scale  = clampNumber(meta && meta.scale,  0.5,  3,   DEFAULT_PHOTO_META.scale);
    var rotate = clampNumber(meta && meta.rotate, -180, 180, DEFAULT_PHOTO_META.rotate);
    img.style.objectPosition = (x * 100).toFixed(2) + "% " + (y * 100).toFixed(2) + "%";
    img.style.objectFit      = fitMode === "contain" ? "contain" : "cover";
    img.style.transformOrigin = "center center";
    img.style.transform       = "scale(" + scale + ") rotate(" + rotate + "deg)";
  }

  function shouldUsePhotoCarousel_(photoCount, plan) {
    var normalizedPlan = String(plan || "").toLowerCase() === "premium" ? "premium" : "free";
    if (normalizedPlan === "premium") return photoCount >= 4;
    return photoCount >= 5;
  }

  function buildPhotoCarousel_(photos, p, preview, allowActions) {
    var carousel = document.createElement("div");
    carousel.className = "photo-carousel";
    carousel.setAttribute("data-photo-carousel", "");

    var track = document.createElement("div");
    track.className = "carousel-track";
    track.setAttribute("data-carousel-track", "");

    photos.forEach(function (item, idx) {
      var tile = document.createElement("div");
      tile.className = "photo-tile";
      tile.setAttribute("data-carousel-index", String(idx));
      tile.setAttribute("data-photo-key", item.key);

      var img = document.createElement("img");
      img.className  = "wall-img";
      img.alt        = "照片 " + (idx + 1);
      img.loading    = idx === 0 ? "eager" : "lazy";
      img.decoding   = "async";

      var meta = getPhotoMeta(p, item.key);
      applyPhotoMetaToImg(img, meta, preview.fit_mode);

      if (isLocalUrl(item.url)) {
        img.src = item.url;
      } else {
        setImgWithFallback(img, buildImgCandidates(item.url), {
          onFail: function () { tile.style.display = "none"; }
        });
      }

      if (allowActions && !isLocalUrl(item.url)) {
        img.style.cursor = "pointer";
        img.addEventListener("click", function () { openUrl(item.url); });
      }

      tile.appendChild(img);
      track.appendChild(tile);
    });

    carousel.appendChild(track);
    applyCarouselRatioStyles_(carousel, track, preview);

    var dotsWrap = document.createElement("div");
    dotsWrap.className = "carousel-dots";
    dotsWrap.setAttribute("data-carousel-dots", "");

    photos.forEach(function (_, idx) {
      var dot = document.createElement("button");
      dot.type      = "button";
      dot.className = "carousel-dot" + (idx === 0 ? " active" : "");
      dot.setAttribute("data-dot-index", String(idx));
      dot.setAttribute("aria-label", "照片 " + (idx + 1));
      dotsWrap.appendChild(dot);
    });

    return { carousel: carousel, dotsWrap: dotsWrap };
  }

  function initPhotoCarousel_(wall, options) {
    var opts     = options || {};
    var interval = opts.interval ||4500;

    var carousel = wall.querySelector("[data-photo-carousel]");
    var track    = wall.querySelector("[data-carousel-track]");
    var dotsWrap = wall.querySelector("[data-carousel-dots]");
    if (!carousel || !track || !dotsWrap) return;

    var tiles   = Array.from(track.querySelectorAll(".photo-tile"));
    var dots    = Array.from(dotsWrap.querySelectorAll(".carousel-dot"));
    if (!tiles.length) return;

    var total   = tiles.length;
    var current = 0;
    var timer   = null;
    var paused  = false;

    function syncDots(idx) {
      dots.forEach(function (d, i) {
        d.classList.toggle("active", i === idx);
      });
    }

    function goTo(idx) {
      idx = ((idx % total) + total) % total;
      current = idx;
      var tile = tiles[idx];
      if (tile) {
        carousel.scrollTo({ left: tile.offsetLeft, behavior: "smooth" });
      }
      syncDots(idx);
    }

    function next() { goTo(current + 1); }
    function startAuto() {
      if (timer) return;
      timer = setInterval(function () {
        if (!paused) next();
      }, interval);
    }

    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var idx = parseInt(dot.getAttribute("data-dot-index"), 10);
        goTo(idx);
        stopAuto();
        startAuto();
      });
    });

    var scrollTimer = null;
    carousel.addEventListener("scroll", function () {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var cx = carousel.scrollLeft + carousel.clientWidth / 2;
        var best = 0;
        var bestDist = Infinity;
        tiles.forEach(function (tile, i) {
          var tc   = tile.offsetLeft + tile.offsetWidth / 2;
          var dist = Math.abs(cx - tc);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        if (best !== current) { current = best; syncDots(best); }
      }, 80);
    }, { passive: true });

    carousel.addEventListener("mouseenter", function () { paused = true; });
    carousel.addEventListener("mouseleave", function () { paused = false; });
    carousel.addEventListener("touchstart", function () { paused = true;  stopAuto();  }, { passive: true });
    carousel.addEventListener("touchend",   function () { paused = false; startAuto(); }, { passive: true });

    startAuto();
  }

  function renderPhotoWall(p, scope, options) {
    var wall = scope.photoWall;
    var grid = scope.photoGrid;
    if (!wall || !grid) return;

    grid.innerHTML = "";
    var oldCarousel = wall.querySelector("[data-photo-carousel]");
    var oldDots     = wall.querySelector("[data-carousel-dots]");
    if (oldCarousel) oldCarousel.parentNode.removeChild(oldCarousel);
    if (oldDots)     oldDots.parentNode.removeChild(oldDots);
    wall.style.display = "none";

    var photos       = collectPhotos(p);
    var preview      = getPreviewMeta(p);
    var plan         = getEffectiveTheme(p);
    var allowActions = options.allowActions !== false;

    if (!photos.length) return;

    var useCarousel = shouldUsePhotoCarousel_(photos.length, plan);

    if (useCarousel) {
      grid.style.display = "none";
      var built = buildPhotoCarousel_(photos, p, preview, allowActions);
      wall.appendChild(built.carousel);
      wall.appendChild(built.dotsWrap);
      wall.style.display = "";

      applyCarouselRatioStyles_(
        built.carousel,
        built.carousel.querySelector("[data-carousel-track]"),
        preview
      );

      initPhotoCarousel_(wall, { interval:4500});

    } else {
      grid.style.display = "";
      grid.className = "photo-grid";

      if (preview.layout === "single")   grid.classList.add("layout-single");
      else if (photos.length === 1)      grid.classList.add("layout-1");
      else if (photos.length === 2)      grid.classList.add("layout-2");
      else if (photos.length === 3)      grid.classList.add("layout-3");
      else if (photos.length === 4)      grid.classList.add("layout-4");
      else                               grid.classList.add("layout-5");

      grid.classList.add(preview.aspect_ratio === "16:9" ? "ratio-16-9" : "ratio-1-1");
      grid.classList.add(preview.fit_mode === "contain"  ? "fit-contain" : "fit-cover");

      photos.forEach(function (item, idx) {
        var tile = document.createElement("div");
        tile.className           = "photo-tile";
        tile.dataset.photoKey    = item.key;

        var img = document.createElement("img");
        img.className  = "wall-img";
        img.alt        = "照片 " + (idx + 1);
        img.loading    = "lazy";
        img.decoding   = "async";

        var meta = getPhotoMeta(p, item.key);
        applyPhotoMetaToImg(img, meta, preview.fit_mode);

        if (isLocalUrl(item.url)) {
          img.src = item.url;
          img.onload  = function () { wall.style.display = ""; };
          img.onerror = function () {
            tile.remove();
            if (!grid.children.length) wall.style.display = "none";
          };
        } else {
          setImgWithFallback(img, buildImgCandidates(item.url), {
            onLoad: function () { wall.style.display = ""; },
            onFail: function () {
              tile.remove();
              if (!grid.children.length) wall.style.display = "none";
            }
          });
        }

        if (allowActions && !isLocalUrl(item.url)) {
          img.style.cursor = "pointer";
          img.addEventListener("click", function () { openUrl(item.url); });
        }

        tile.appendChild(img);
        grid.appendChild(tile);
      });

      if (grid.children.length) wall.style.display = "";
    }
  }

  function resolveQrUrl(p, options) {
    var qrMode = options.qrMode || "card";
    if (qrMode === "facade") {
      return normalizeUrl(
        pick(p, ["facade_url", "hub_url", "showcase_url", "website"]) ||
        options.facadeUrl || options.hubUrl || ""
      );
    }
    if (qrMode === "preview") {
      return normalizeUrl(
        pick(p, ["preview_url", "share_url", "card_url"]) ||
        options.previewUrl || options.shareUrl || options.cardUrl || ""
      );
    }
    return normalizeUrl(
      pick(p, ["card_url", "share_url", "preview_url", "website"]) ||
      options.cardUrl || options.shareUrl || ""
    );
  }

  function renderBottomQr(p, scope, options) {
    var sec    = scope.bottomQrSection;
    var grid   = scope.bottomQrGrid;
    var avatar = scope.bottomQrAvatar;
    if (!sec || !grid || !avatar) return;

    var qrUrl     = resolveQrUrl(p, options);
    var avatarUrl = pickAvatarInfo(p).url;

    if (!qrUrl) {
      sec.style.display = "none";
      grid.innerHTML = "";
      hideCenterImg(avatar);
      return;
    }

    sec.style.display = "";
    renderQr({
      container:      grid,
      url:            qrUrl,
      size:           136,
      centerImgEl:    avatar,
      centerImgUrl:   avatarUrl,
      centerSizeRatio: 0.09
    });
  }

 function applyCarouselRatioStyles_(carousel, track, preview) {
  if (!carousel || !track) return;

  var is169 = preview && preview.aspect_ratio === "16:9";
  var fitMode = preview && preview.fit_mode === "contain" ? "contain" : "cover";

  carousel.classList.remove("ratio-1-1", "ratio-16-9", "fit-cover", "fit-contain");
  carousel.classList.add(is169 ? "ratio-16-9" : "ratio-1-1");
  carousel.classList.add(fitMode === "contain" ? "fit-contain" : "fit-cover");

  carousel.style.position = "relative";
  carousel.style.width = "100%";
  carousel.style.maxWidth = "100%";
  carousel.style.overflowX = "auto";
  carousel.style.overflowY = "hidden";
  carousel.style.borderRadius = "18px";
  carousel.style.aspectRatio = is169 ? "16 / 9" : "1 / 1";
  carousel.style.scrollSnapType = "x mandatory";
  carousel.style.WebkitOverflowScrolling = "touch";
  carousel.style.scrollBehavior = "smooth";
  carousel.style.scrollbarWidth = "none";
  carousel.style.msOverflowStyle = "none";

  track.style.display = "flex";
  track.style.width = "100%";
  track.style.height = "100%";
  track.style.minHeight = "100%";
  track.style.overflow = "hidden";
  track.style.margin = "0";
  track.style.padding = "0";
  track.style.alignItems = "stretch";

  Array.from(track.children).forEach(function (tile) {
    tile.style.flex = "0 0 100%";
    tile.style.width = "100%";
    tile.style.maxWidth = "100%";
    tile.style.height = "100%";
    tile.style.minHeight = "100%";
    tile.style.position = "relative";
    tile.style.overflow = "hidden";
    tile.style.scrollSnapAlign = "start";
    tile.style.margin = "0";
    tile.style.padding = "0";
    tile.style.borderRadius = "18px";

    var img = tile.querySelector(".wall-img");
    if (img) {
      img.style.position = "absolute";
      img.style.inset = "0";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.display = "block";
      img.style.objectFit = fitMode;
      img.style.margin = "0";
    }
  });
}

  function renderCard(data, options) {
    var opts = Object.assign({}, DEFAULTS, options || {});
    if (!opts.root || !(opts.root instanceof HTMLElement)) {
      throw new Error("renderCard(data, options) 需要提供 options.root HTMLElement");
    }

    var sourceRow = data || {};
    if (
      sourceRow &&
      typeof sourceRow === "object" &&
      !text(sourceRow.name) &&
      text(sourceRow.lead_snapshot)
    ) {
      var snap = safeJsonParse(sourceRow.lead_snapshot);
      if (snap && typeof snap === "object") {
        sourceRow = Object.assign({}, snap, sourceRow);
      }
    }

    sourceRow = normalizeFeatures(sourceRow);
    var p = buildNormalizedPayload(sourceRow);

    var scope = opts.useExistingDom
      ? getScope(opts.root, true)
      : buildGeneratedTemplate(opts.root, opts.mode);

    if (!scope.cardRoot) {
      throw new Error("card-renderer.js 找不到 card root，請確認 root 或 HTML 結構");
    }

    applyThemeClasses(p, scope, opts);
    renderAvatar(p, scope);
    renderLogo(p, scope);
    renderTexts(p, scope);
    renderBlocks(p, scope);
    renderContactDock(p, scope, opts);
    renderMarquee(p, scope);
    renderPrimaryLinkDock(p, scope, opts);
    renderMediaDock(p, scope, opts);
    renderCtaDock(p, scope, opts);
    renderPhotoWall(p, scope, opts);
    renderBottomQr(p, scope, opts);

    return {
      ok: true,
      data: p,
      scope: scope,
      meta: {
        plan:        getEffectiveTheme(p),
        photoLimit:  getPhotoLimitFromPayload(p),
        ctaLimit:    getCtaLimitFromPayload(p),
        previewMeta: getPreviewMeta(p)
      }
    };
  }

  var __bridgeState = {
    shell: null,
    lite: null,
    full: null
  };

  function __mergeObjects(a, b) {
    var out = {};
    var srcA = a && typeof a === "object" ? a : {};
    var srcB = b && typeof b === "object" ? b : {};
    Object.keys(srcA).forEach(function (k) { out[k] = srcA[k]; });
    Object.keys(srcB).forEach(function (k) { out[k] = srcB[k]; });
    return out;
  }

  function __resolveBridgeArgs(arg1, arg2, arg3) {
    var root = null;
    var data = null;
    var options = {};

    if (arg1 instanceof HTMLElement) {
      root = arg1;
      data = arg2 || {};
      options = arg3 || {};
    } else {
      data = arg1 || {};
      options = arg2 || {};
      root = options.root || null;
    }

    options = Object.assign({}, options);
    if (root) options.root = root;
    if (!options.root || !(options.root instanceof HTMLElement)) {
      throw new Error("card-renderer bridge 需要 root HTMLElement");
    }
    if (typeof options.useExistingDom === "undefined") {
      options.useExistingDom = true;
    }
    return { root: options.root, data: data || {}, options: options };
  }

  function renderShell(arg1, arg2, arg3) {
    var ctx = __resolveBridgeArgs(arg1, arg2, arg3);
    __bridgeState.shell = ctx.data || {};
    var merged = __mergeObjects({}, __bridgeState.shell);
    return renderCard(merged, ctx.options);
  }

  function mergeLite(arg1, arg2, arg3) {
    var ctx = __resolveBridgeArgs(arg1, arg2, arg3);
    __bridgeState.lite = ctx.data || {};
    var merged = __mergeObjects(__bridgeState.shell, __bridgeState.lite);
    return renderCard(merged, ctx.options);
  }

  function mergeCardData(arg1, arg2, arg3) {
    var ctx = __resolveBridgeArgs(arg1, arg2, arg3);
    __bridgeState.full = ctx.data || {};
    var merged = __mergeObjects(__mergeObjects(__bridgeState.shell, __bridgeState.lite), __bridgeState.full);
    return renderCard(merged, ctx.options);
  }

  var api = {
    renderCard:              renderCard,
    renderQr:                renderQr,
    shouldUsePhotoCarousel_: shouldUsePhotoCarousel_,
    initPhotoCarousel_:      initPhotoCarousel_,
    renderShell:             renderShell,
    mergeLite:               mergeLite,
    mergeCardData:           mergeCardData,
    version: "HSC-card-renderer-v8.4.2-photo-wall-carousel-ratio-fix+v1.5.2-dom-fallback-fix"
  };

  global.HscCardRenderer  = api;
  global.HSCCardRenderer  = api;
  global.renderCard       = renderCard;
  global.renderQr         = renderQr;

})(window);
