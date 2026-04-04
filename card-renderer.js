/* ============================================================
   card-renderer.js
   HSC 唯一渲染模組
   v7.7.8-premium-banner-slogan-center
   - 精品款支援 premium_banner_url / photo_preview_urls.premium_banner
   - 沒有 premium banner 時自動隱藏
   - slogan 預覽同步置中（交由 style.css .slogan 規則處理）
   - 保留 base64 / blob 圖片支援
============================================================ */

(function (global) {
  "use strict";

  const DEFAULTS = {
    mode: "index",
    root: null,
    useExistingDom: true,
    qrMode: "card",
    allowActions: true
  };

  const PLAN_LIMITS = {
    free: { maxPhotos: 2, maxCtas: 1 },
    premium: { maxPhotos: 5, maxCtas: 3 }
  };

  const DEFAULT_PREVIEW_META = {
    theme: "",
    layout: "grid",
    aspect_ratio: "1:1",
    fit_mode: "cover"
  };

  const DEFAULT_PHOTO_META = {
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotate: 0
  };

  const BODY_MODE_CLASSES = ["mode-free", "mode-premium"];
  const FREE_THEME_CLASSES = ["color-1", "color-2", "color-3", "color-4", "color-5"];
  const PREMIUM_THEME_CLASSES = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
  const STYLE_CLASSES = ["style-arch", "style-flat", "style-spot"];
  const PAPER_CLASSES = ["paper-1", "paper-2", "paper-3"];
  const CARD_LAYOUT_CLASSES = ["layout-grid", "layout-single"];
  const CARD_ASPECT_CLASSES = ["ratio-1-1", "ratio-16-9"];
  const CARD_FIT_CLASSES = ["fit-cover", "fit-contain"];

  function text(v) { return v == null ? "" : String(v).trim(); }
  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (Number.isFinite(min) && n < min) return min;
    if (Number.isFinite(max) && n > max) return max;
    return n;
  }
  function safeJsonParse(raw) {
    let s = String(raw || "").trim();
    if (!s) return null;
    s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
    try { return JSON.parse(s); } catch (_) {}
    const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
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
    let v = String(raw || "").trim();
    if (!v) return "";
    if (/^(tel:|mailto:|sms:|line:|https?:\/\/|data:)/i.test(v)) return v;
    if (/^www\./i.test(v)) return "https://" + v;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
    return v;
  }
  function isDataUrl(url) { return typeof url === "string" && url.startsWith("data:"); }
  function isBlobUrl(url) { return typeof url === "string" && url.startsWith("blob:"); }
  function isLocalUrl(url) { return isDataUrl(url) || isBlobUrl(url); }

  function normalizeImageUrl(raw) {
    let url = normalizeUrl(raw);
    if (!url) return "";
    if (isLocalUrl(url)) return url;
    if (url.includes("dropbox.com")) {
      url = url.replace("dl=0", "raw=1");
      if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
      return url;
    }
    if (url.includes("drive.google.com") && url.includes("/file/d/")) {
      const m = url.match(/\/file\/d\/([^/]+)/i);
      if (m && m[1]) return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(m[1]);
    }
    return url;
  }

  function buildImgCandidates(raw) {
    const s = text(raw);
    if (!s) return [];
    const url = normalizeImageUrl(s);
    if (!url) return [];
    if (isLocalUrl(url)) return [url];
    const out = [url];
    if (url.includes("drive.google.com/uc?export=view&id=")) {
      const m = url.match(/id=([^&]+)/i);
      if (m && m[1]) {
        const id = decodeURIComponent(m[1]);
        out.push(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
        out.push(`https://drive.google.com/uc?export=download&id=${id}`);
      }
    }
    return [...new Set(out.filter(Boolean))];
  }

  function setImgWithFallback(imgEl, candidates, options) {
    const opts = options || {};
    const list = (candidates || []).filter(Boolean);
    if (!imgEl) { if (typeof opts.onFail === "function") opts.onFail(); return; }
    if (!list.length) { if (typeof opts.onFail === "function") opts.onFail(); return; }

    let idx = 0;
    let done = false;
    if (!isLocalUrl(list[0])) {
      imgEl.referrerPolicy = opts.referrerPolicy || "no-referrer";
      try { imgEl.crossOrigin = opts.crossOrigin || "anonymous"; } catch (_) {}
    }

    function buildSrc(src) {
      if (isLocalUrl(src)) return src;
      const sep = src.includes("?") ? "&" : "?";
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
    const u = normalizeUrl(url);
    if (!u) return;
    window.open(u, "_blank", "noopener");
  }
  function openMapByAddress(addr) {
    const a = text(addr);
    if (!a) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`, "_blank", "noopener");
  }

  function normalizeSinglePhotoMeta(raw) {
    const meta = raw && typeof raw === "object" ? raw : {};
    return {
      x: clampNumber(meta.x, 0, 1, DEFAULT_PHOTO_META.x),
      y: clampNumber(meta.y, 0, 1, DEFAULT_PHOTO_META.y),
      scale: clampNumber(meta.scale, 0.5, 3, DEFAULT_PHOTO_META.scale),
      rotate: clampNumber(meta.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
    };
  }
  function normalizePhotoMetaMap(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const out = { premium_banner: normalizeSinglePhotoMeta(src.premium_banner) };
    for (let i = 1; i <= 10; i++) out["photo" + i] = normalizeSinglePhotoMeta(src["photo" + i]);
    out.avatar = normalizeSinglePhotoMeta(src.avatar);
    out.logo = normalizeSinglePhotoMeta(src.logo);
    return out;
  }
  function normalizePreviewMeta(raw) {
    const meta = raw && typeof raw === "object" ? raw : {};
    const theme = text(meta.theme).toLowerCase();
    const layout = text(meta.layout).toLowerCase();
    const aspect = text(meta.aspect_ratio || meta.aspectRatio).trim();
    const fit = text(meta.fit_mode || meta.fitMode).toLowerCase();
    return {
      theme: theme === "premium" || theme === "free" ? theme : DEFAULT_PREVIEW_META.theme,
      layout: layout === "single" ? "single" : DEFAULT_PREVIEW_META.layout,
      aspect_ratio: aspect === "16:9" ? "16:9" : DEFAULT_PREVIEW_META.aspect_ratio,
      fit_mode: fit === "contain" ? "contain" : DEFAULT_PREVIEW_META.fit_mode
    };
  }

  function normalizeFeatures(card) {
    const src = card && typeof card === "object" ? card : {};
    let parsed = {};
    if (src.features && typeof src.features === "object") parsed = src.features;
    else {
      const fromJson = safeJsonParse(src.features_json);
      if (fromJson && typeof fromJson === "object") parsed = fromJson;
    }
    src.features = {
      photo_meta: normalizePhotoMetaMap(parsed.photo_meta),
      preview_meta: normalizePreviewMeta(parsed.preview_meta),
      photo_preview_urls: (parsed.photo_preview_urls && typeof parsed.photo_preview_urls === "object") ? parsed.photo_preview_urls : {}
    };
    return src;
  }

  function buildNormalizedPayload(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const out = { __raw: obj };
    const lower = Object.create(null);
    Object.keys(obj).forEach(k => {
      const nk = String(k || "").trim();
      if (!nk) return;
      const v = obj[k];
      if (out[nk] == null || text(out[nk]) === "") out[nk] = v;
      lower[nk.toLowerCase()] = v;
    });
    out.__lower = lower;
    return out;
  }

  function pick(p, keys) {
    if (!p) return "";
    const lower = p.__lower || null;
    for (const k of keys) {
      const kk = String(k || "").trim();
      const direct = p[kk];
      if (direct != null && text(direct) !== "") return direct;
      if (lower) {
        const v2 = lower[kk.toLowerCase()];
        if (v2 != null && text(v2) !== "") return v2;
      }
    }
    return "";
  }

  function getPreviewUrl(p, key) {
    const raw = p && p.__raw;
    const ppu = raw?.features?.photo_preview_urls;
    if (!ppu || typeof ppu !== "object") return "";
    return text(ppu[key]);
  }

  function normalizePlan(v) { return text(v).toLowerCase() === "premium" ? "premium" : "free"; }
  function mapFreeColorToTheme(v) {
    const raw = text(v).toLowerCase();
    return ({ c1:"color-1", c2:"color-2", c3:"color-3", c4:"color-4", c5:"color-5", "color-1":"color-1", "color-2":"color-2", "color-3":"color-3", "color-4":"color-4", "color-5":"color-5" })[raw] || "color-1";
  }
  function mapStyleToUi(v) {
    const raw = text(v).toLowerCase();
    return ({ s1:"arch", s2:"flat", s3:"spot", arch:"arch", flat:"flat", spot:"spot" })[raw] || "arch";
  }
  function mapPaperToUi(v) {
    const raw = text(v).toLowerCase();
    return ({ f1:"paper-1", f2:"paper-2", f3:"paper-3", "paper-1":"paper-1", "paper-2":"paper-2", "paper-3":"paper-3" })[raw] || "paper-1";
  }
  function mapPremiumToUi(v) {
    const raw = text(v).toLowerCase();
    return ["p1","p2","p3","p4","p5","p6","p7"].includes(raw) ? raw : "p1";
  }
  function getPreviewMeta(p) { return normalizePreviewMeta(p && p.__raw && p.__raw.features ? p.__raw.features.preview_meta : null); }
  function getPhotoMeta(p, key) {
    const map = normalizePhotoMetaMap(p && p.__raw && p.__raw.features ? p.__raw.features.photo_meta : null);
    return map[key] || { ...DEFAULT_PHOTO_META };
  }
  function getEffectiveTheme(p) {
    const preview = getPreviewMeta(p);
    if (preview.theme === "premium" || preview.theme === "free") return preview.theme;
    return normalizePlan(pick(p, ["plan"]));
  }
  function getPhotoLimitFromPayload(p) {
    const limit = Number(pick(p, ["photo_limit"]));
    if (Number.isFinite(limit) && limit > 0 && limit <= 10) return limit;
    return PLAN_LIMITS[getEffectiveTheme(p)]?.maxPhotos || PLAN_LIMITS.free.maxPhotos;
  }
  function getCtaLimitFromPayload(p) {
    const limit = Number(pick(p, ["cta_limit"]));
    if (Number.isFinite(limit) && limit > 0 && limit <= 10) return limit;
    return PLAN_LIMITS[getEffectiveTheme(p)]?.maxCtas || PLAN_LIMITS.free.maxCtas;
  }
  function getMarqueeText(p) { return text(pick(p, ["marquee_text"])); }
  function isMarqueeEnabled(p) {
    const v = text(pick(p, ["marquee_enabled"])).toLowerCase();
    if (["1", "true", "yes", "y"].includes(v)) return true;
    return !!getMarqueeText(p);
  }

  function pickAvatarInfo(p) {
    const url = pick(p, ["avatar_url"]);
    if (text(url)) return { key: "avatar_url", raw: url, url: normalizeImageUrl(url) };
    const b64 = getPreviewUrl(p, "avatar");
    if (b64) return { key: "avatar_preview", raw: b64, url: b64 };
    const uimg = pick(p, ["u-img"]);
    if (text(uimg)) return { key: "u-img", raw: uimg, url: normalizeImageUrl(uimg) };
    const fallback = pick(p, ["photo1_url"]);
    if (text(fallback)) return { key: "photo1_url", raw: fallback, url: normalizeImageUrl(fallback) };
    return { key: "", raw: "", url: "" };
  }
  function pickLogoInfo(p) {
    const url = pick(p, ["logo_url"]);
    if (text(url)) return { key: "logo_url", raw: url, url: normalizeImageUrl(url) };
    const b64 = getPreviewUrl(p, "logo");
    if (b64) return { key: "logo_preview", raw: b64, url: b64 };
    return { key: "", raw: "", url: "" };
  }
  function pickPremiumBannerInfo(p) {
    const url = pick(p, ["premium_banner_url"]);
    if (text(url)) return { key: "premium_banner_url", raw: url, url: normalizeImageUrl(url) };
    const b64 = getPreviewUrl(p, "premium_banner");
    if (b64) return { key: "premium_banner_preview", raw: b64, url: b64 };
    return { key: "", raw: "", url: "" };
  }

  function buildCtaItems(p) {
    const limit = getCtaLimitFromPayload(p);
    const items = [];
    for (let i = 1; i <= limit; i++) {
      const label = text(pick(p, [`cta_text_${i}`, `ctaText${i}`, `CTA文字${i}`]));
      const link = normalizeUrl(pick(p, [`cta_link_${i}`, `ctaLink${i}`, `CTA連結${i}`]));
      if (!label || !link) continue;
      items.push({ label, link });
    }
    return items;
  }
  function buildMediaItems(p) {
    const items = [];
    ["video1", "video2", "video3"].forEach((k, i) => {
      const u = normalizeUrl(pick(p, [k, `影音連結${i+1}`]));
      if (u) items.push({ kind: "video", idx: i + 1, url: u });
    });
    ["social1", "social2", "social3"].forEach((k, i) => {
      const u = normalizeUrl(pick(p, [k, `社群連結${i+1}`]));
      if (u) items.push({ kind: "social", idx: i + 1, url: u });
    });
    return items;
  }
  function inferLinkMeta(url, kind, idx) {
    const u = String(url || "").toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) return { label: "YouTube", icon: "fa-brands fa-youtube", cls: "dock-yt" };
    if (u.includes("facebook.com") || u.includes("fb.com")) return { label: "FB", icon: "fa-brands fa-facebook", cls: "dock-fb" };
    if (u.includes("instagram.com")) return { label: "Instagram", icon: "fa-brands fa-instagram", cls: "dock-ig" };
    if (u.includes("threads.net")) return { label: "Threads", icon: "fa-solid fa-at", cls: "dock-web" };
    if (kind === "video") return { label: `影音 ${idx}`, icon: "fa-solid fa-play", cls: "dock-web" };
    return { label: `社群 ${idx}`, icon: "fa-solid fa-link", cls: "dock-web" };
  }
  function createDockBtn(label, icon, extraClass, onClick) {
    const btn = document.createElement("button");
    btn.className = "dock-btn" + (extraClass ? " " + extraClass : "");
    btn.type = "button";
    btn.innerHTML = `<i class="${icon}"></i><span>${escapeHtml(label)}</span>`;
    if (typeof onClick === "function") btn.addEventListener("click", onClick);
    return btn;
  }
  function applyWideRule(container) {
    if (!container) return;
    const btns = Array.from(container.querySelectorAll(".dock-btn"));
    btns.forEach(b => b.classList.remove("wide"));
    if (btns.length % 2 === 1 && btns.length > 0) btns[btns.length - 1].classList.add("wide");
  }

  function buildQrImageUrl(url, size) {
    const s = Number(size) || 220;
    return "https://api.qrserver.com/v1/create-qr-code/" +
      "?size=" + encodeURIComponent(`${s}x${s}`) +
      "&data=" + encodeURIComponent(String(url)) +
      "&ecc=H&margin=2";
  }
  function hideCenterImg(imgEl) {
    if (!imgEl) return;
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    imgEl.style.background = "transparent";
    imgEl.style.padding = "0";
    imgEl.style.boxShadow = "none";
  }
  function setCenterImg(imgEl, centerImgUrl, sizeRatio) {
    if (!imgEl) return;
    const u = normalizeImageUrl(centerImgUrl);
    if (!u) { hideCenterImg(imgEl); return; }
    imgEl.style.position = "absolute";
    imgEl.style.left = "50%";
    imgEl.style.top = "50%";
    imgEl.style.width = `${Math.round((sizeRatio || 0.09) * 100)}%`;
    imgEl.style.height = `${Math.round((sizeRatio || 0.09) * 100)}%`;
    imgEl.style.transform = "translate(-50%, -50%)";
    imgEl.style.borderRadius = "999px";
    imgEl.style.objectFit = "cover";
    imgEl.style.zIndex = "3";
    imgEl.style.background = "transparent";
    imgEl.style.padding = "0";
    imgEl.style.boxShadow = "none";
    imgEl.style.display = "block";
    imgEl.style.pointerEvents = "none";
    const opts = isLocalUrl(u) ? { onLoad: () => { imgEl.style.display = "block"; }, onFail: () => hideCenterImg(imgEl) } : { crossOrigin: "anonymous", referrerPolicy: "no-referrer", onLoad: () => { imgEl.style.display = "block"; }, onFail: () => hideCenterImg(imgEl) };
    setImgWithFallback(imgEl, buildImgCandidates(u), opts);
  }
  function renderQr(options) {
    const opts = options || {};
    const container = opts.container;
    const url = opts.url;
    const size = opts.size || 160;
    const centerImgEl = opts.centerImgEl || null;
    const centerImgUrl = opts.centerImgUrl || "";
    const centerSizeRatio = opts.centerSizeRatio || 0.09;
    if (!container || !url) return false;
    const key = `${url}|${size}|${normalizeImageUrl(centerImgUrl)}|${centerSizeRatio}`;
    if (container.dataset.renderKey === key) {
      if (centerImgEl) setCenterImg(centerImgEl, centerImgUrl, centerSizeRatio);
      return true;
    }
    container.dataset.renderKey = key;
    container.innerHTML = "";
    const img = document.createElement("img");
    img.alt = "QR Code";
    img.loading = "eager";
    img.decoding = "sync";
    img.referrerPolicy = "no-referrer";
    try { img.crossOrigin = "anonymous"; } catch (_) {}
    img.src = buildQrImageUrl(url, size) + "&t=" + Date.now();
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.display = "block";
    img.style.objectFit = "contain";
    container.appendChild(img);
    if (centerImgEl) setCenterImg(centerImgEl, centerImgUrl, centerSizeRatio);
    return true;
  }

  function buildGeneratedTemplate(root, mode) {
    root.innerHTML = `
      <div class="hsc-render-root ${mode === "form" ? "hsc-render-form" : "hsc-render-index"}">
        <section class="card" data-card-root>
          <div class="premium-fx-layer"></div>
          <div class="banner" data-banner>
            <img class="banner-img" data-banner-img alt="精品 Banner" />
            <div class="dynamic-mask"></div>
          </div>
          <div class="paper-overlay"></div>

          <div class="avatar-wrap">
            <div class="avatar-circle">
              <img class="avatar" data-u-img alt="個人照" />
            </div>
          </div>

          <div class="premium-badge" data-premium-badge style="display:none;">
            <span class="badge-dot"></span>
            <span class="badge-text">精品設計</span>
          </div>

          <div class="logo-wrap" data-logo-wrap style="display:none;">
            <img class="logo-img" data-u-logo alt="Logo" />
          </div>

          <div class="info-scroll">
            <div class="name" data-u-name></div>
            <div class="text-toggle-wrap unit-wrap" data-u-unit-wrap style="display:none;"><div class="unit" data-u-unit></div></div>
            <div class="title" data-u-title></div>
            <div class="text-toggle-wrap slogan-wrap" data-u-slogan-wrap style="display:none;"><div class="slogan preline" data-u-slogan></div></div>
            <div class="info-block" data-block-service style="display:none;"></div>
            <div class="info-block" data-block-exp style="display:none;"></div>
            <div class="contact-dock" data-contact-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-address-card"></i> 聯繫方式</div><div class="dock-buttons" data-contact-buttons></div></div>
            <div class="contact-dock marquee-dock" data-marquee-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-bullhorn"></i> 重要訊息</div><div class="marquee-shell" data-marquee-shell><div class="marquee-track" data-marquee-track><span class="marquee-text" data-marquee-text></span></div></div></div>
            <div class="contact-dock primary-link-dock" data-primary-link-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-globe"></i> 主網站</div><div class="dock-buttons" data-primary-link-buttons></div></div>
            <div class="contact-dock" data-media-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-clapperboard"></i> 影音／社群</div><div class="dock-buttons" data-media-buttons></div></div>
            <div class="contact-dock cta-dock" data-cta-dock style="display:none;"><div class="dock-title"><i class="fa-solid fa-bolt"></i> 立即行動</div><div class="dock-buttons" data-cta-buttons></div></div>
            <div class="photo-wall" data-photo-wall style="display:none;"><div class="dock-title"><i class="fa-regular fa-images"></i> 照片</div><div class="photo-grid" data-photo-grid></div></div>
            <div class="card-expiry" id="cardExpiry" style="display:none;"></div>
            <div class="qr-bottom" data-bottom-qr-section style="display:none;"><div class="qr-bottom-head"><div class="qr-bottom-title">掃描 QRcode｜開啟我的智慧名片</div><div class="qr-bottom-sub">可收藏・可分享・可快速回看</div></div><div class="qr-bottom-wrap"><div class="qr-bottom-canvas" style="position:relative;"><div class="qr-bottom-grid" data-bottom-qr-grid></div><img data-bottom-qr-avatar alt="QR 頭像" /></div></div></div>
          </div>
        </section>
      </div>`;
    return getScope(root, false);
  }

  function getScope(root, useExistingDom) {
    const q = sel => root.querySelector(sel);
    if (useExistingDom) {
      return {
        root,
        cardRoot: q("#card") || q(".card"),
        banner: q("#banner") || q(".banner"),
        bannerImg: q("[data-banner-img]") || q(".banner-img"),
        paperOverlay: q("#paperOverlay") || q(".paper-overlay"),
        premiumBadge: q("#premiumBadge") || q(".premium-badge"),
        avatar: q("#u-img"),
        logoWrap: q("#logoWrap") || q(".logo-wrap"),
        logo: q("#u-logo") || q(".logo-img"),
        name: q("#u-name") || q("[data-u-name]"),
        unitWrap: q("#u-unit-wrap") || q("[data-u-unit-wrap]"),
        unit: q("#u-unit") || q("[data-u-unit]"),
        title: q("#u-title") || q("[data-u-title]"),
        sloganWrap: q("#u-slogan-wrap") || q("[data-u-slogan-wrap]"),
        slogan: q("#u-slogan") || q("[data-u-slogan]"),
        blockService: q("#block-service") || q("[data-block-service]"),
        blockExp: q("#block-exp") || q("[data-block-exp]"),
        contactDock: q("#contactDock") || q("[data-contact-dock]"),
        contactButtons: q("#contactButtons") || q("[data-contact-buttons]"),
        marqueeDock: q("#marqueeDock") || q("[data-marquee-dock]"),
        marqueeShell: q("#marqueeShell") || q("[data-marquee-shell]"),
        marqueeTrack: q("#marqueeTrack") || q("[data-marquee-track]"),
        marqueeText: q("#marqueeText") || q("[data-marquee-text]"),
        primaryLinkDock: q("#primaryLinkDock") || q("[data-primary-link-dock]"),
        primaryLinkButtons: q("#primaryLinkButtons") || q("[data-primary-link-buttons]"),
        mediaDock: q("#mediaDock") || q("[data-media-dock]"),
        mediaButtons: q("#mediaButtons") || q("[data-media-buttons]"),
        ctaDock: q("#ctaDock") || q("[data-cta-dock]"),
        ctaButtons: q("#ctaButtons") || q("[data-cta-buttons]"),
        photoWall: q("#photoWall") || q("[data-photo-wall]"),
        photoGrid: q("#photoGrid") || q("[data-photo-grid]"),
        cardExpiry: q("#cardExpiry"),
        bottomQrSection: q("#bottomQrSection") || q("[data-bottom-qr-section]"),
        bottomQrGrid: q("#bottomQrGrid") || q("[data-bottom-qr-grid]"),
        bottomQrAvatar: q("#bottomQrAvatar") || q("[data-bottom-qr-avatar]")
      };
    }
    return {
      root,
      cardRoot: q("[data-card-root]"),
      banner: q("[data-banner]"),
      bannerImg: q("[data-banner-img]"),
      paperOverlay: q(".paper-overlay"),
      premiumBadge: q("[data-premium-badge]"),
      avatar: q("[data-u-img]"),
      logoWrap: q("[data-logo-wrap]"),
      logo: q("[data-u-logo]"),
      name: q("[data-u-name]"),
      unitWrap: q("[data-u-unit-wrap]"),
      unit: q("[data-u-unit]"),
      title: q("[data-u-title]"),
      sloganWrap: q("[data-u-slogan-wrap]"),
      slogan: q("[data-u-slogan]"),
      blockService: q("[data-block-service]"),
      blockExp: q("[data-block-exp]"),
      contactDock: q("[data-contact-dock]"),
      contactButtons: q("[data-contact-buttons]"),
      marqueeDock: q("[data-marquee-dock]"),
      marqueeShell: q("[data-marquee-shell]"),
      marqueeTrack: q("[data-marquee-track]"),
      marqueeText: q("[data-marquee-text]"),
      primaryLinkDock: q("[data-primary-link-dock]"),
      primaryLinkButtons: q("[data-primary-link-buttons]"),
      mediaDock: q("[data-media-dock]"),
      mediaButtons: q("[data-media-buttons]"),
      ctaDock: q("[data-cta-dock]"),
      ctaButtons: q("[data-cta-buttons]"),
      photoWall: q("[data-photo-wall]"),
      photoGrid: q("[data-photo-grid]"),
      cardExpiry: q("#cardExpiry"),
      bottomQrSection: q("[data-bottom-qr-section]"),
      bottomQrGrid: q("[data-bottom-qr-grid]"),
      bottomQrAvatar: q("[data-bottom-qr-avatar]")
    };
  }

  function applyThemeClasses(p, scope) {
    const root = scope.root;
    const cardRoot = scope.cardRoot;
    const preview = getPreviewMeta(p);
    const effectivePlan = preview.theme || normalizePlan(pick(p, ["plan"]));
    const targets = [root];
    if (cardRoot && cardRoot !== root) targets.push(cardRoot);

    targets.forEach(el => {
      if (!el) return;
      BODY_MODE_CLASSES.forEach(c => el.classList.remove(c));
      FREE_THEME_CLASSES.forEach(c => el.classList.remove(c));
      PREMIUM_THEME_CLASSES.forEach(c => el.classList.remove(c));
      STYLE_CLASSES.forEach(c => el.classList.remove(c));
      PAPER_CLASSES.forEach(c => el.classList.remove(c));
    });

    const modeClass = effectivePlan === "premium" ? "mode-premium" : "mode-free";
    targets.forEach(el => el && el.classList.add(modeClass));

    if (effectivePlan === "premium") {
      const premiumClass = mapPremiumToUi(pick(p, ["color"]) || "p1");
      targets.forEach(el => el && el.classList.add(premiumClass));
    } else {
      const freeColor = mapFreeColorToTheme(pick(p, ["color"]) || "c1");
      const style = "style-" + mapStyleToUi(pick(p, ["style"]) || "s1");
      const paper = mapPaperToUi(pick(p, ["paper"]) || "f1");
      targets.forEach(el => {
        if (!el) return;
        el.classList.add(freeColor);
        el.classList.add(style);
        el.classList.add(paper);
      });
    }

    if (scope.premiumBadge) scope.premiumBadge.style.display = effectivePlan === "premium" ? "" : "none";
    if (cardRoot) {
      CARD_LAYOUT_CLASSES.forEach(c => cardRoot.classList.remove(c));
      CARD_ASPECT_CLASSES.forEach(c => cardRoot.classList.remove(c));
      CARD_FIT_CLASSES.forEach(c => cardRoot.classList.remove(c));
      cardRoot.classList.add(preview.layout === "single" ? "layout-single" : "layout-grid");
      cardRoot.classList.add(preview.aspect_ratio === "16:9" ? "ratio-16-9" : "ratio-1-1");
      cardRoot.classList.add(preview.fit_mode === "contain" ? "fit-contain" : "fit-cover");
    }
  }

  function renderPremiumBanner(p, scope) {
    const banner = scope.banner;
    const bannerImg = scope.bannerImg;
    if (!banner || !bannerImg) return;

    const plan = getEffectiveTheme(p);
    const info = pickPremiumBannerInfo(p);
    const u = info.url;
    banner.classList.remove("has-premium-banner", "no-premium-banner");

    if (plan !== "premium" || !u) {
      banner.classList.add("no-premium-banner");
      bannerImg.removeAttribute("src");
      bannerImg.style.display = "none";
      return;
    }

    banner.classList.add("has-premium-banner");
    bannerImg.style.display = "block";
    const meta = getPhotoMeta(p, "premium_banner");
    bannerImg.style.objectPosition = `${(meta.x * 100).toFixed(2)}% ${(meta.y * 100).toFixed(2)}%`;
    bannerImg.style.transform = `scale(${meta.scale}) rotate(${meta.rotate}deg)`;
    bannerImg.style.transformOrigin = "center center";

    if (isLocalUrl(u)) {
      bannerImg.src = u;
      return;
    }
    setImgWithFallback(bannerImg, buildImgCandidates(u), {
      onLoad: function () { bannerImg.style.display = "block"; },
      onFail: function () {
        banner.classList.remove("has-premium-banner");
        banner.classList.add("no-premium-banner");
        bannerImg.removeAttribute("src");
        bannerImg.style.display = "none";
      }
    });
  }

  function renderAvatar(p, scope) {
    const img = scope.avatar;
    if (!img) return;
    const info = pickAvatarInfo(p);
    const u = info.url;
    if (!u) {
      img.removeAttribute("src");
      img.style.display = "none";
      return;
    }
    img.style.display = "block";
    if (isLocalUrl(u)) { img.src = u; return; }
    setImgWithFallback(img, buildImgCandidates(u), {
      onLoad: function () { img.style.display = "block"; },
      onFail: function () { img.removeAttribute("src"); img.style.display = "none"; }
    });
  }

  function renderLogo(p, scope) {
    const wrap = scope.logoWrap;
    const img = scope.logo;
    if (!wrap || !img) return;
    const info = pickLogoInfo(p);
    const u = info.url;
    if (!u) {
      wrap.style.display = "none";
      img.removeAttribute("src");
      return;
    }
    wrap.style.display = "flex";
    img.style.display = "block";
    if (isLocalUrl(u)) { img.src = u; return; }
    setImgWithFallback(img, buildImgCandidates(u), {
      onLoad: function () { wrap.style.display = "flex"; img.style.display = "block"; },
      onFail: function () { wrap.style.display = "none"; img.removeAttribute("src"); img.style.display = "none"; }
    });
  }

  function renderTexts(p, scope) {
    const nameVal = text(pick(p, ["name", "display_name", "姓名"])) || "未命名";
    const unitVal = normalizeLongText(pick(p, ["unit", "單位", "公司"]));
    const titleVal = text(pick(p, ["title", "職稱"])) || "";
    const sloganVal = normalizeLongText(pick(p, ["slogan", "intro", "一句話", "簡介"]));
    if (scope.name) scope.name.textContent = nameVal;
    if (scope.unit) scope.unit.textContent = unitVal;
    if (scope.title) scope.title.textContent = titleVal;
    if (scope.slogan) scope.slogan.textContent = sloganVal;
    if (scope.unitWrap) scope.unitWrap.style.display = unitVal ? "" : "none";
    if (scope.sloganWrap) scope.sloganWrap.style.display = sloganVal ? "" : "none";
  }

  function renderInfoBlock(blockEl, title, body) {
    if (!blockEl) return;
    const value = normalizeLongText(body);
    if (!value) {
      blockEl.style.display = "none";
      blockEl.innerHTML = "";
      return;
    }
    blockEl.style.display = "";
    blockEl.innerHTML = `<div class="block-title">${escapeHtml(title)}</div><div class="block-body preline">${escapeHtml(value)}</div>`;
  }
  function renderBlocks(p, scope) {
    renderInfoBlock(scope.blockService, "服務項目", pick(p, ["services", "服務項目", "service"]));
    renderInfoBlock(scope.blockExp, "經歷 / 品牌故事", pick(p, ["experience", "經歷", "exp"]));
  }

  function renderMarquee(p, scope) {
    const dock = scope.marqueeDock, shell = scope.marqueeShell, track = scope.marqueeTrack, textEl = scope.marqueeText;
    if (!dock || !shell || !track || !textEl) return;
    const marqueeText = getMarqueeText(p);
    const enabled = isMarqueeEnabled(p);
    if (!enabled || !marqueeText) {
      dock.style.display = "none";
      textEl.textContent = "";
      track.style.removeProperty("--marquee-duration");
      dock.classList.remove("is-static");
      return;
    }
    const parts = marqueeText.split("｜").map(s => s.trim()).filter(Boolean);
    const joined = (parts.length ? parts : [marqueeText]).join("　｜　");
    textEl.textContent = joined + "　｜　" + joined + "　｜　";
    dock.style.display = "";
    requestAnimationFrame(function () {
      const shellWidth = shell.clientWidth || 280;
      const textWidth = textEl.scrollWidth || shellWidth;
      const distance = Math.max(textWidth, shellWidth);
      const duration = Math.max(10, Math.round(distance / 36));
      track.style.setProperty("--marquee-duration", `${duration}s`);
      if (textWidth <= shellWidth + 20) dock.classList.add("is-static");
      else dock.classList.remove("is-static");
    });
  }

  function renderContactDock(p, scope, options) {
    const dock = scope.contactDock, btns = scope.contactButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";
    const phone = pick(p, ["phone", "電話"]);
    const email = pick(p, ["email", "Email"]);
    const address = pick(p, ["address", "地址"]);
    const lineUrl = normalizeUrl(pick(p, ["line_url", "line_oa", "LINE連結"]));
    const wechatId = text(pick(p, ["wechat_id", "wechat", "微信ID", "微信"]));
    const allowActions = options.allowActions !== false;
    const list = [];
    if (lineUrl) list.push(createDockBtn("私訊 LINE", "fa-brands fa-line", "dock-line", () => { if (allowActions) openUrl(lineUrl); }));
    if (wechatId) list.push(createDockBtn("微信ID", "fa-brands fa-weixin", "dock-web", async () => { if (!allowActions) return; try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(wechatId); } catch (_) {} }));
    if (phone) list.push(createDockBtn("電話", "fa-solid fa-phone", "dock-web", () => { if (allowActions) location.href = `tel:${text(phone)}`; }));
    if (email) list.push(createDockBtn("Email", "fa-solid fa-envelope", "dock-web", () => { if (allowActions) location.href = `mailto:${text(email)}`; }));
    if (address) list.push(createDockBtn("地址導航", "fa-solid fa-location-dot", "dock-map", () => { if (allowActions) openMapByAddress(address); }));
    if (!list.length) { dock.style.display = "none"; return; }
    list.forEach(btn => btns.appendChild(btn));
    dock.style.display = "";
    applyWideRule(btns);
  }

  function renderPrimaryLinkDock(p, scope, options) {
    const dock = scope.primaryLinkDock, btns = scope.primaryLinkButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";
    const website = normalizeUrl(pick(p, ["website", "網站", "web", "homepage"]));
    const allowActions = options.allowActions !== false;
    if (!website) { dock.style.display = "none"; return; }
    btns.appendChild(createDockBtn("官方網站", "fa-solid fa-globe", "dock-web wide", () => { if (allowActions) openUrl(website); }));
    dock.style.display = "";
  }

  function renderMediaDock(p, scope, options) {
    const dock = scope.mediaDock, btns = scope.mediaButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";
    const items = buildMediaItems(p);
    const allowActions = options.allowActions !== false;
    if (!items.length) { dock.style.display = "none"; return; }
    items.forEach(item => {
      const meta = inferLinkMeta(item.url, item.kind, item.idx);
      btns.appendChild(createDockBtn(meta.label, meta.icon, meta.cls, () => { if (allowActions) openUrl(item.url); }));
    });
    dock.style.display = "";
    applyWideRule(btns);
  }

  function renderCtaDock(p, scope, options) {
    const dock = scope.ctaDock, btns = scope.ctaButtons;
    if (!dock || !btns) return;
    btns.innerHTML = "";
    const items = buildCtaItems(p);
    const allowActions = options.allowActions !== false;
    if (!items.length) { dock.style.display = "none"; return; }
    items.forEach((item, idx) => {
      btns.appendChild(createDockBtn(item.label, idx === 0 ? "fa-solid fa-bolt" : "fa-solid fa-arrow-up-right-from-square", items.length === 1 ? "dock-web wide" : "dock-web", () => { if (allowActions) openUrl(item.link); }));
    });
    dock.style.display = "";
    applyWideRule(btns);
  }

  function collectPhotos(p) {
    const photos = [];
    const limit = getPhotoLimitFromPayload(p);
    for (let i = 1; i <= limit; i++) {
      const raw = pick(p, [`photo${i}_url`, `photo_url_${i}`]);
      const url = raw ? normalizeImageUrl(raw) : "";
      if (url) { photos.push({ key: `photo${i}`, url }); continue; }
      const b64 = getPreviewUrl(p, `photo${i}`);
      if (b64) photos.push({ key: `photo${i}`, url: b64 });
    }
    return photos;
  }
  function applyPhotoMetaToImg(img, meta, fitMode) {
    if (!img) return;
    const x = clampNumber(meta?.x, 0, 1, DEFAULT_PHOTO_META.x);
    const y = clampNumber(meta?.y, 0, 1, DEFAULT_PHOTO_META.y);
    const scale = clampNumber(meta?.scale, 0.5, 3, DEFAULT_PHOTO_META.scale);
    const rotate = clampNumber(meta?.rotate, -180, 180, DEFAULT_PHOTO_META.rotate);
    img.style.objectPosition = `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
    img.style.objectFit = fitMode === "contain" ? "contain" : "cover";
    img.style.transformOrigin = "center center";
    img.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
  }
  function renderPhotoWall(p, scope, options) {
    const wall = scope.photoWall, grid = scope.photoGrid;
    if (!wall || !grid) return;
    grid.innerHTML = "";
    wall.style.display = "none";
    const photos = collectPhotos(p);
    const preview = getPreviewMeta(p);
    const allowActions = options.allowActions !== false;
    if (!photos.length) return;
    grid.className = "photo-grid";
    if (preview.layout === "single") grid.classList.add("layout-single");
    else if (photos.length === 1) grid.classList.add("layout-1");
    else if (photos.length === 2) grid.classList.add("layout-2");
    else if (photos.length === 3) grid.classList.add("layout-3");
    else if (photos.length === 4) grid.classList.add("layout-4");
    else grid.classList.add("layout-5");
    grid.classList.add(preview.aspect_ratio === "16:9" ? "ratio-16-9" : "ratio-1-1");
    grid.classList.add(preview.fit_mode === "contain" ? "fit-contain" : "fit-cover");

    photos.forEach((item, idx) => {
      const tile = document.createElement("div");
      tile.className = "photo-tile";
      tile.dataset.photoKey = item.key;
      const img = document.createElement("img");
      img.className = "wall-img";
      img.alt = `照片 ${idx + 1}`;
      img.loading = "lazy";
      img.decoding = "async";
      const meta = getPhotoMeta(p, item.key);
      applyPhotoMetaToImg(img, meta, preview.fit_mode);
      if (isLocalUrl(item.url)) {
        img.src = item.url;
        img.onload = function () { wall.style.display = ""; };
        img.onerror = function () { tile.remove(); if (!grid.children.length) wall.style.display = "none"; };
      } else {
        setImgWithFallback(img, buildImgCandidates(item.url), {
          onLoad: function () { wall.style.display = ""; },
          onFail: function () { tile.remove(); if (!grid.children.length) wall.style.display = "none"; }
        });
      }
      if (allowActions && !isLocalUrl(item.url)) {
        img.style.cursor = "pointer";
        img.addEventListener("click", () => openUrl(item.url));
      }
      tile.appendChild(img);
      grid.appendChild(tile);
    });
    if (grid.children.length) wall.style.display = "";
  }

  function resolveQrUrl(p, options) {
    const qrMode = options.qrMode || "card";
    if (qrMode === "facade") return normalizeUrl(pick(p, ["facade_url", "hub_url", "showcase_url", "website"]) || options.facadeUrl || options.hubUrl || "");
    if (qrMode === "preview") return normalizeUrl(pick(p, ["preview_url", "share_url", "card_url"]) || options.previewUrl || options.shareUrl || options.cardUrl || "");
    return normalizeUrl(pick(p, ["card_url", "share_url", "preview_url", "website"]) || options.cardUrl || options.shareUrl || "");
  }
  function renderBottomQr(p, scope, options) {
    const sec = scope.bottomQrSection, grid = scope.bottomQrGrid, avatar = scope.bottomQrAvatar;
    if (!sec || !grid || !avatar) return;
    const qrUrl = resolveQrUrl(p, options);
    const avatarUrl = pickAvatarInfo(p).url;
    if (!qrUrl) {
      sec.style.display = "none";
      grid.innerHTML = "";
      hideCenterImg(avatar);
      return;
    }
    sec.style.display = "";
    renderQr({ container: grid, url: qrUrl, size: 136, centerImgEl: avatar, centerImgUrl: avatarUrl, centerSizeRatio: 0.09 });
  }

  function renderCard(data, options) {
    const opts = Object.assign({}, DEFAULTS, options || {});
    if (!opts.root || !(opts.root instanceof HTMLElement)) throw new Error("renderCard(data, options) 需要提供 options.root HTMLElement");

    let sourceRow = data || {};
    if (sourceRow && typeof sourceRow === "object" && !text(sourceRow.name) && text(sourceRow.lead_snapshot)) {
      const snap = safeJsonParse(sourceRow.lead_snapshot);
      if (snap && typeof snap === "object") sourceRow = Object.assign({}, snap, sourceRow);
    }

    sourceRow = normalizeFeatures(sourceRow);
    const p = buildNormalizedPayload(sourceRow);
    const scope = opts.useExistingDom ? getScope(opts.root, true) : buildGeneratedTemplate(opts.root, opts.mode);
    if (!scope.cardRoot) throw new Error("card-renderer.js 找不到 card root，請確認 root 或 HTML 結構");

    applyThemeClasses(p, scope, opts);
    renderPremiumBanner(p, scope);
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
      scope,
      meta: {
        plan: getEffectiveTheme(p),
        photoLimit: getPhotoLimitFromPayload(p),
        ctaLimit: getCtaLimitFromPayload(p),
        previewMeta: getPreviewMeta(p)
      }
    };
  }

  const api = {
    renderCard,
    renderQr,
    version: "HSC-card-renderer-v7.7.8-premium-banner-slogan-center"
  };

  global.HscCardRenderer = api;
  global.HSCCardRenderer = api;
  global.renderCard = renderCard;
  global.renderQr = renderQr;
})(window);
