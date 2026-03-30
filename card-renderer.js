/* ============================================================
   HSC card-renderer.js
   v7.3-shared-renderer
   完整覆蓋版 — 表單預覽 / 主程式共用同一套成品卡 renderer
============================================================ */
(function(){
  "use strict";

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
  const BODY_FREE_THEME_CLASSES = ["color-1", "color-2", "color-3", "color-4", "color-5"];
  const BODY_PREMIUM_THEME_CLASSES = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
  const BODY_STYLE_CLASSES = ["style-arch", "style-flat", "style-spot"];
  const BODY_PAPER_CLASSES = ["paper-1", "paper-2", "paper-3"];

  function text(v){ return (v == null ? "" : String(v)).trim(); }
  function normalizeUrl_(s){
    let v = String(s || "").trim();
    if(!v) return "";
    if(/^https?:\/\//i.test(v)) return v;
    if(/^www\./i.test(v)) return "https://" + v;
    if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
    return v;
  }
  function safeJsonParse_(rawText){
    let s = String(rawText || "").trim();
    if(!s) return null;
    s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
    try{ return JSON.parse(s); }catch{}
    const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if(m){ try{ return JSON.parse(m[0]); }catch{} }
    return null;
  }
  function clampNumber_(value, min, max, fallback){
    const n = Number(value);
    if(Number.isFinite(n)){
      if(Number.isFinite(min) && n < min) return min;
      if(Number.isFinite(max) && n > max) return max;
      return n;
    }
    return fallback;
  }
  function normalizePreviewMeta_(raw){
    const meta = raw && typeof raw === "object" ? raw : {};
    const theme = text(meta.theme).toLowerCase();
    const layout = text(meta.layout).toLowerCase();
    const aspectRatio = text(meta.aspect_ratio || meta.aspectRatio).trim();
    const fitMode = text(meta.fit_mode || meta.fitMode).toLowerCase();
    return {
      theme: theme === "premium" || theme === "free" ? theme : DEFAULT_PREVIEW_META.theme,
      layout: layout === "single" ? "single" : DEFAULT_PREVIEW_META.layout,
      aspect_ratio: aspectRatio === "16:9" ? "16:9" : DEFAULT_PREVIEW_META.aspect_ratio,
      fit_mode: fitMode === "contain" ? "contain" : DEFAULT_PREVIEW_META.fit_mode
    };
  }
  function normalizeSinglePhotoMeta_(raw){
    const meta = raw && typeof raw === "object" ? raw : {};
    return {
      x: clampNumber_(meta.x, 0, 1, DEFAULT_PHOTO_META.x),
      y: clampNumber_(meta.y, 0, 1, DEFAULT_PHOTO_META.y),
      scale: clampNumber_(meta.scale, 0.5, 3, DEFAULT_PHOTO_META.scale),
      rotate: clampNumber_(meta.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
    };
  }
  function normalizePhotoMetaMap_(raw){
    const src = raw && typeof raw === "object" ? raw : {};
    const out = {};
    for(let i = 1; i <= 10; i++) out[`photo${i}`] = normalizeSinglePhotoMeta_(src[`photo${i}`]);
    return out;
  }
  function normalizeCardFeatures(card){
    const src = card && typeof card === "object" ? card : {};
    let parsed = {};
    if(src.features && typeof src.features === "object") parsed = src.features;
    else {
      const fromJson = safeJsonParse_(src.features_json);
      if(fromJson && typeof fromJson === "object") parsed = fromJson;
    }
    src.features = {
      photo_meta: normalizePhotoMetaMap_(parsed.photo_meta),
      preview_meta: normalizePreviewMeta_(parsed.preview_meta)
    };
    return src;
  }
  function buildNormalizedPayload_(obj){
    if(!obj || typeof obj !== "object") return obj;
    const out = { __raw: obj };
    const lower = Object.create(null);
    for(const k of Object.keys(obj)){
      const nk = String(k || "").trim();
      if(!nk) continue;
      const v = obj[k];
      if(out[nk] == null || text(out[nk]) === "") out[nk] = v;
      lower[nk.toLowerCase()] = v;
    }
    out.__lower = lower;
    return out;
  }
  function pick(p, keys){
    if(!p) return "";
    const lower = p.__lower || null;
    for(const k of keys){
      const kk = String(k || "").trim();
      const v1 = p[kk];
      if(v1 != null && text(v1) !== "") return v1;
      if(lower){
        const v2 = lower[kk.toLowerCase()];
        if(v2 != null && text(v2) !== "") return v2;
      }
    }
    return "";
  }
  function normalizePlan_(v){ return text(v).toLowerCase() === "premium" ? "premium" : "free"; }
  function getPreviewMeta_(p){ return normalizePreviewMeta_(p?.features?.preview_meta); }
  function getPhotoMeta_(p, key){ return normalizePhotoMetaMap_(p?.features?.photo_meta)[key] || { ...DEFAULT_PHOTO_META }; }
  function getEffectiveTheme_(p){
    const preview = getPreviewMeta_(p);
    if(preview.theme === "premium" || preview.theme === "free") return preview.theme;
    return normalizePlan_(pick(p, ["plan"]));
  }
  function getPhotoLimitFromPayload_(p){
    const limit = Number(pick(p, ["photo_limit"]));
    if(!isNaN(limit) && limit > 0 && limit <= 10) return limit;
    const plan = getEffectiveTheme_(p);
    return PLAN_LIMITS[plan]?.maxPhotos || PLAN_LIMITS.free.maxPhotos;
  }
  function normalizeImageUrl_(raw){
    let url = normalizeUrl_(raw);
    if(!url) return "";
    if(url.includes("dropbox.com")){
      url = url.replace("dl=0", "raw=1");
      if(!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
      return url;
    }
    if(url.includes("drive.google.com") && url.includes("/file/d/")){
      const m = url.match(/\/file\/d\/([^/]+)/i);
      if(m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;
    }
    return url;
  }
  function buildImgCandidates_(raw){
    const s = text(raw);
    if(!s) return [];
    const url = normalizeImageUrl_(s);
    const list = [url];
    if(url.includes("drive.google.com/uc?export=view&id=")){
      const m = url.match(/id=([^&]+)/i);
      if(m && m[1]){
        const id = decodeURIComponent(m[1]);
        list.push(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
        list.push(`https://drive.google.com/uc?export=download&id=${id}`);
      }
    }
    return [...new Set(list.filter(Boolean))];
  }
  function setImgWithFallback_(imgEl, candidates, options = {}){
    const list = (candidates || []).filter(Boolean);
    if(!imgEl){ if(typeof options.onFail === "function") options.onFail(); return; }
    if(!list.length){ if(typeof options.onFail === "function") options.onFail(); return; }
    let idx = 0;
    let done = false;
    imgEl.referrerPolicy = options.referrerPolicy || "no-referrer";
    try{ imgEl.crossOrigin = options.crossOrigin || "anonymous"; }catch{}
    const buildSrc = (src) => {
      const sep = src.includes("?") ? "&" : "?";
      return src + sep + "t=" + Date.now();
    };
    const cleanup = () => { imgEl.onerror = null; imgEl.onload = null; };
    const failAll = () => {
      if(done) return;
      done = true;
      cleanup();
      if(typeof options.onFail === "function") options.onFail();
    };
    const tryNext = () => {
      if(done) return;
      idx++;
      if(idx >= list.length){ failAll(); return; }
      imgEl.src = buildSrc(list[idx]);
    };
    imgEl.onload = () => {
      if(done) return;
      done = true;
      cleanup();
      if(typeof options.onLoad === "function") options.onLoad();
    };
    imgEl.onerror = () => { tryNext(); };
    imgEl.src = buildSrc(list[0]);
  }
  function escapeHtml_(s){
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function escapeHtmlWithBreaks_(s){ return escapeHtml_(s).replace(/\n/g, "<br>"); }
  function normalizeLongText_(raw){
    return String(raw || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  function removeClasses_(el, classes){ if(!el) return; classes.forEach(c => el.classList.remove(c)); }
  function applyScopedClassSet_(scopes, classList, targetClass){
    (scopes || []).forEach(scope => {
      if(!scope) return;
      classList.forEach(cls => scope.classList.remove(cls));
      if(targetClass) scope.classList.add(targetClass);
    });
  }
  function mapFreeColorToTheme_(v){
    const raw = text(v).toLowerCase();
    const map = { c1:"color-1", c2:"color-2", c3:"color-3", c4:"color-4", c5:"color-5", "color-1":"color-1", "color-2":"color-2", "color-3":"color-3", "color-4":"color-4", "color-5":"color-5" };
    return map[raw] || "color-1";
  }
  function mapStyleToUi_(v){
    const raw = text(v).toLowerCase();
    const map = { s1:"arch", s2:"flat", s3:"spot", arch:"arch", flat:"flat", spot:"spot" };
    return map[raw] || "arch";
  }
  function mapPaperToUi_(v){
    const raw = text(v).toLowerCase();
    const map = { f1:"paper-1", f2:"paper-2", f3:"paper-3", "paper-1":"paper-1", "paper-2":"paper-2", "paper-3":"paper-3" };
    return map[raw] || "paper-1";
  }
  function mapPremiumToUi_(v){
    const raw = text(v).toLowerCase();
    return ["p1","p2","p3","p4","p5","p6","p7"].includes(raw) ? raw : "p1";
  }
  function setExpandableText_(contentEl, toggleEl, rawText, maxLines, options = {}){
    if(!contentEl) return;
    const value = normalizeLongText_(rawText);
    const hasText = text(value) !== "";
    const allowMultiline = !!options.allowMultiline;
    contentEl.dataset.raw = value;
    contentEl.dataset.maxLines = String(maxLines || 3);
    contentEl.dataset.expandable = "1";
    if(allowMultiline){ contentEl.innerHTML = escapeHtmlWithBreaks_(value); contentEl.classList.add("preline"); }
    else { contentEl.textContent = value; contentEl.classList.remove("preline"); }
    contentEl.classList.remove("is-expanded");
    contentEl.classList.add("is-collapsed");
    contentEl.style.setProperty("--max-lines", String(maxLines || 3));
    if(toggleEl){
      toggleEl.type = "button";
      toggleEl.textContent = "看更多";
      toggleEl.style.display = "none";
      toggleEl.setAttribute("aria-expanded", "false");
      toggleEl.onclick = () => {
        const expanded = contentEl.classList.contains("is-expanded");
        if(expanded){
          contentEl.classList.remove("is-expanded");
          contentEl.classList.add("is-collapsed");
          toggleEl.textContent = "看更多";
          toggleEl.setAttribute("aria-expanded", "false");
        }else{
          contentEl.classList.remove("is-collapsed");
          contentEl.classList.add("is-expanded");
          toggleEl.textContent = "收合";
          toggleEl.setAttribute("aria-expanded", "true");
        }
      };
    }
    if(!hasText){ if(toggleEl) toggleEl.style.display = "none"; return; }
    requestAnimationFrame(() => refreshExpandableItem_(contentEl, toggleEl));
  }
  function refreshExpandableItem_(contentEl, toggleEl){
    if(!contentEl) return;
    const maxLines = Number(contentEl.dataset.maxLines || 3);
    const wasExpanded = contentEl.classList.contains("is-expanded");
    contentEl.classList.remove("is-expanded");
    contentEl.classList.add("is-collapsed");
    contentEl.style.setProperty("--max-lines", String(maxLines));
    const needToggle = (contentEl.scrollHeight - contentEl.clientHeight) > 4;
    if(toggleEl){
      toggleEl.style.display = needToggle ? "inline-flex" : "none";
      if(!needToggle){ toggleEl.textContent = "看更多"; toggleEl.setAttribute("aria-expanded", "false"); }
    }
    if(needToggle && wasExpanded){
      contentEl.classList.remove("is-collapsed");
      contentEl.classList.add("is-expanded");
      if(toggleEl){ toggleEl.textContent = "收合"; toggleEl.setAttribute("aria-expanded", "true"); }
    }
  }
  function renderExpandableInfoBlock_(blockEl, title, rawText, maxLines){
    if(!blockEl) return;
    const value = normalizeLongText_(rawText);
    if(!text(value)){
      blockEl.style.display = "none";
      blockEl.innerHTML = "";
      return;
    }
    blockEl.style.display = "";
    blockEl.innerHTML = `\n      <div class="block-title">${escapeHtml_(title)}</div>\n      <div class="expandable-wrap">\n        <div class="block-body expandable-text is-collapsed preline" style="--max-lines:${Number(maxLines || 3)}"></div>\n        <button class="expand-toggle" type="button" style="display:none;">看更多</button>\n      </div>\n    `;
    const contentEl = blockEl.querySelector(".expandable-text");
    const toggleEl = blockEl.querySelector(".expand-toggle");
    setExpandableText_(contentEl, toggleEl, value, maxLines, { allowMultiline: true });
  }
  function extractDriveId_(url){
    const s = String(url || "");
    let m = s.match(/[?&]id=([^&]+)/i);
    if(m && m[1]) return decodeURIComponent(m[1]);
    m = s.match(/\/file\/d\/([^/]+)/i);
    if(m && m[1]) return decodeURIComponent(m[1]);
    m = s.match(/\/thumbnail\?id=([^&]+)/i);
    if(m && m[1]) return decodeURIComponent(m[1]);
    return "";
  }
  function stripQueryAndHash_(url){ const s = String(url || ""); return s.split("#")[0].split("?")[0]; }
  function extractFirebaseFingerprint_(url){
    const s = String(url || "");
    if(!/firebasestorage\.googleapis\.com/i.test(s)) return "";
    const noHash = s.split("#")[0];
    const m = noHash.match(/\/o\/([^?]+)/i);
    if(m && m[1]) return decodeURIComponent(m[1]).toLowerCase();
    return "";
  }
  function extractLastPathSeg_(url){
    const clean = stripQueryAndHash_(url);
    const arr = clean.split("/").filter(Boolean);
    return (arr[arr.length - 1] || "").toLowerCase();
  }
  function buildImageFingerprint_(raw){
    const url = normalizeImageUrl_(raw);
    if(!url) return "";
    const driveId = extractDriveId_(url);
    if(driveId) return "gdrive:" + driveId.toLowerCase();
    const firebaseKey = extractFirebaseFingerprint_(url);
    if(firebaseKey) return "firebase:" + firebaseKey;
    const noQuery = stripQueryAndHash_(url).toLowerCase();
    const lastSeg = extractLastPathSeg_(url);
    if(lastSeg) return "path:" + lastSeg + "|" + noQuery;
    return "url:" + noQuery;
  }
  function collectPhotos_(p){
    const photos = [];
    const seen = new Set();
    const limit = getPhotoLimitFromPayload_(p);
    function pushPhoto_(raw, idx){
      const s = String(raw || "").trim();
      if(!s) return;
      const url = normalizeImageUrl_(s);
      if(!url) return;
      const fp = buildImageFingerprint_(url) || url;
      if(seen.has(fp)) return;
      seen.add(fp);
      photos.push({ key: `photo${idx}`, url });
    }
    for(let i = 1; i <= limit; i++){
      const key = `photo${i}_url`;
      const v = pick(p, [key]);
      if(v != null && text(v) !== "") pushPhoto_(v, i);
    }
    return photos.slice(0, limit);
  }
  function applyPhotoMetaToImg_(img, meta, fitMode){
    if(!img) return;
    const x = clampNumber_(meta?.x, 0, 1, DEFAULT_PHOTO_META.x);
    const y = clampNumber_(meta?.y, 0, 1, DEFAULT_PHOTO_META.y);
    const scale = clampNumber_(meta?.scale, 0.5, 3, DEFAULT_PHOTO_META.scale);
    const rotate = clampNumber_(meta?.rotate, -180, 180, DEFAULT_PHOTO_META.rotate);
    img.style.objectPosition = `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
    img.style.transformOrigin = "center center";
    img.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    img.style.objectFit = fitMode === "contain" ? "contain" : "cover";
  }
  function openUrl_(url){
    const u = normalizeUrl_(url);
    if(!u) return;
    try{ window.open(u, "_blank"); }catch(_e){ location.href = u; }
  }
  function openMapByAddress_(addr){
    const a = text(addr);
    if(!a) return;
    const q = encodeURIComponent(a);
    openUrl_(`https://www.google.com/maps/search/?api=1&query=${q}`);
  }
  function buildDockBtn_({ label, icon, onClick, extraClass }){
    const b = document.createElement("button");
    b.className = "dock-btn" + (extraClass ? (" " + extraClass) : "");
    b.type = "button";
    b.innerHTML = `<i class="${icon}"></i><span>${escapeHtml_(label)}</span>`;
    if(typeof onClick === "function") b.addEventListener("click", onClick);
    return b;
  }
  function applyWideRule_(container){
    if(!container) return;
    const btns = Array.from(container.querySelectorAll(".dock-btn"));
    btns.forEach(b => b.classList.remove("wide"));
    if(btns.length % 2 === 1 && btns.length) btns[btns.length - 1].classList.add("wide");
  }
  function inferLinkMeta_(url, kind, idx){
    const u = String(url || "").toLowerCase();
    if(u.includes("youtube.com") || u.includes("youtu.be")) return { label:"YouTube", icon:"fa-brands fa-youtube", cls:"dock-yt" };
    if(u.includes("facebook.com") || u.includes("fb.com")) return { label:"FB", icon:"fa-brands fa-facebook", cls:"dock-fb" };
    if(u.includes("instagram.com")) return { label:"Instagram", icon:"fa-brands fa-instagram", cls:"dock-ig" };
    if(u.includes("threads.net")) return { label:"Threads", icon:"fa-solid fa-at", cls:"dock-web" };
    if(kind === "video") return { label:`影音 ${idx}`, icon:"fa-solid fa-play", cls:"dock-web" };
    return { label:`社群 ${idx}`, icon:"fa-solid fa-link", cls:"dock-web" };
  }

  function createContext(root, opts = {}){
    const doc = root.ownerDocument || document;
    const previewRoot = root;
    const cardEl = previewRoot.querySelector("#card") || previewRoot.querySelector(".card");
    return {
      root: previewRoot,
      cardEl,
      doc,
      options: opts,
      qs(id){ return previewRoot.querySelector(`#${id}`); },
      qsa(sel){ return Array.from(previewRoot.querySelectorAll(sel)); },
      getScopes(){ return opts.applyBodyClasses === false ? [previewRoot] : [doc.body, previewRoot].filter(Boolean); },
      applyClassSet(classList, target){ applyScopedClassSet_(this.getScopes(), classList, target); },
      refreshAllExpandable(){
        this.qsa("[data-expandable='1']").forEach(contentEl => {
          const wrap = contentEl.closest(".expandable-wrap") || contentEl.parentElement;
          const toggleEl = wrap ? wrap.querySelector(".expand-toggle") : null;
          refreshExpandableItem_(contentEl, toggleEl);
        });
      }
    };
  }

  function applyPreviewMetaUi_(ctx, p){
    const preview = getPreviewMeta_(p);
    const planFromPreview = preview.theme === "premium" ? "premium" : preview.theme === "free" ? "free" : "";
    const effectivePlan = planFromPreview || normalizePlan_(pick(p, ["plan"]));
    const ui = {
      plan: effectivePlan === "premium" ? "premium" : "free",
      theme: mapFreeColorToTheme_(pick(p, ["color"]) || "c1"),
      premiumTheme: mapPremiumToUi_(pick(p, ["color"]) || "p1"),
      style: mapStyleToUi_(pick(p, ["style"]) || "s1"),
      paper: mapPaperToUi_(pick(p, ["paper"]) || "f1")
    };

    ctx.applyClassSet(BODY_MODE_CLASSES, ui.plan === "premium" ? "mode-premium" : "mode-free");
    ctx.applyClassSet(BODY_FREE_THEME_CLASSES, ui.plan === "premium" ? "" : ui.theme);
    ctx.applyClassSet(BODY_PREMIUM_THEME_CLASSES, ui.plan === "premium" ? ui.premiumTheme : "");

    const scopes = ctx.getScopes();
    scopes.forEach(scope => {
      removeClasses_(scope, BODY_STYLE_CLASSES);
      scope.classList.add(`style-${ui.style}`);
      removeClasses_(scope, BODY_PAPER_CLASSES);
      scope.classList.add(ui.paper);
    });

    const freeControls = ctx.qs("free-controls");
    const premiumControls = ctx.qs("premium-controls");
    const badge = ctx.qs("premiumBadge");
    if(freeControls) freeControls.style.display = ui.plan === "premium" ? "none" : "";
    if(premiumControls) premiumControls.style.display = ui.plan === "premium" ? "" : "none";
    if(badge) badge.style.display = ui.plan === "premium" ? "" : "none";

    return ui;
  }
  function renderAvatar_(ctx, p){
    const img = ctx.qs("u-img");
    if(!img) return;
    const url = normalizeImageUrl_(pick(p, ["avatar_url"]));
    if(!url){ img.removeAttribute("src"); img.style.display = "none"; return; }
    img.style.display = "block";
    setImgWithFallback_(img, buildImgCandidates_(url), {
      onFail: () => { img.removeAttribute("src"); img.style.display = "none"; },
      onLoad: () => { img.style.display = "block"; }
    });
  }
  function renderLogo_(ctx, p){
    const wrap = ctx.qs("logoWrap");
    const img = ctx.qs("u-logo");
    if(!wrap || !img) return;
    const url = normalizeImageUrl_(pick(p, ["logo_url"]));
    if(!url){ wrap.style.display = "none"; img.removeAttribute("src"); return; }
    wrap.style.display = "flex";
    img.style.borderRadius = "18px";
    img.style.objectFit = "cover";
    img.style.display = "block";
    setImgWithFallback_(img, buildImgCandidates_(url), {
      onFail: () => { wrap.style.display = "none"; img.removeAttribute("src"); img.style.display = "none"; },
      onLoad: () => { wrap.style.display = "flex"; img.style.display = "block"; }
    });
  }
  function renderBlocks_(ctx, p){
    const service = pick(p, ["services","服務項目","service"]);
    const exp = pick(p, ["experience","經歷","exp"]);
    renderExpandableInfoBlock_(ctx.qs("block-service"), "服務項目", service, 2);
    renderExpandableInfoBlock_(ctx.qs("block-exp"), "經歷 / 品牌故事", exp, 3);
  }
  function getMarqueeText_(p){
    const direct = text(pick(p, ["marquee_text"]));
    if(direct) return direct;
    const fallback = text(p?.features?.preview_meta?.marquee_text || "");
    if(fallback) return fallback;
    return "";
  }
  function isMarqueeEnabled_(p){
    const v = text(pick(p, ["marquee_enabled"])).toLowerCase();
    if(v === "true" || v === "1" || v === "yes" || v === "y") return true;
    return false;
  }
  function renderMarquee_(ctx, p){
    const dock = ctx.qs("marqueeDock");
    const shell = ctx.qs("marqueeShell");
    const track = ctx.qs("marqueeTrack");
    const textEl = ctx.qs("marqueeText");
    if(!dock || !shell || !track || !textEl) return;
    const marqueeText = getMarqueeText_(p);
    const enabled = isMarqueeEnabled_(p) || !!marqueeText;
    if(!enabled || !marqueeText){
      dock.style.display = "none";
      textEl.textContent = "";
      track.style.removeProperty("--marquee-duration");
      dock.classList.remove("is-static");
      return;
    }
    textEl.textContent = marqueeText + "　｜　" + marqueeText + "　｜　";
    dock.style.display = "";
    requestAnimationFrame(() => {
      const shellWidth = shell.clientWidth || 280;
      const textWidth = textEl.scrollWidth || shellWidth;
      const distance = Math.max(textWidth, shellWidth);
      const duration = Math.max(10, Math.round(distance / 36));
      track.style.setProperty("--marquee-duration", `${duration}s`);
      if(textWidth <= shellWidth + 20) dock.classList.add("is-static");
      else dock.classList.remove("is-static");
    });
  }
  function renderContactDock_(ctx, p){
    const dock = ctx.qs("contactDock");
    const btns = ctx.qs("contactButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const phone = pick(p, ["phone","電話"]);
    const email = pick(p, ["email","Email"]);
    const address = pick(p, ["address","地址"]);
    const lineUrl = normalizeUrl_(pick(p, ["line_url","line_oa","LINE連結"]));
    const wechatId = text(pick(p, ["wechat_id","微信ID","微信"]));
    const list = [];
    if(lineUrl) list.push({ label:"私訊 LINE", icon:"fa-brands fa-line", cls:"dock-line", action: () => openUrl_(lineUrl) });
    if(wechatId) list.push({ label:"微信ID", icon:"fa-brands fa-weixin", cls:"dock-web", action: async () => {
      try{ if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(wechatId); }catch{}
      alert("✅ 已複製微信ID");
    }});
    if(phone) list.push({ label:"電話", icon:"fa-solid fa-phone", cls:"dock-web", action: () => { location.href = `tel:${text(phone)}`; } });
    if(email) list.push({ label:"Email", icon:"fa-solid fa-envelope", cls:"dock-web", action: () => { location.href = `mailto:${text(email)}`; } });
    if(address) list.push({ label:"地址導航", icon:"fa-solid fa-location-dot", cls:"dock-map", action: () => openMapByAddress_(address) });
    if(!list.length){ dock.style.display = "none"; return; }
    list.forEach(x => btns.appendChild(buildDockBtn_({ label: x.label, icon: x.icon, extraClass: x.cls, onClick: x.action })));
    dock.style.display = "";
    applyWideRule_(btns);
  }
  function renderPrimaryLinkDock_(ctx, p){
    const dock = ctx.qs("primaryLinkDock");
    const btns = ctx.qs("primaryLinkButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const website = normalizeUrl_(pick(p, ["website","網站","web","homepage"]));
    if(!website){ dock.style.display = "none"; return; }
    btns.appendChild(buildDockBtn_({ label:"官方網站", icon:"fa-solid fa-globe", extraClass:"dock-web wide", onClick: () => openUrl_(website) }));
    dock.style.display = "";
  }
  function renderMediaDock_(ctx, p){
    const dock = ctx.qs("mediaDock");
    const btns = ctx.qs("mediaButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const items = [];
    ["video1","video2","video3"].forEach((k, i) => {
      const u = normalizeUrl_(pick(p, [k, `影音連結${i+1}`]));
      if(u) items.push({ kind:"video", idx:i+1, url:u });
    });
    ["social1","social2","social3"].forEach((k, i) => {
      const u = normalizeUrl_(pick(p, [k, `社群連結${i+1}`]));
      if(u) items.push({ kind:"social", idx:i+1, url:u });
    });
    if(!items.length){ dock.style.display = "none"; return; }
    items.forEach(item => {
      const meta = inferLinkMeta_(item.url, item.kind, item.idx);
      btns.appendChild(buildDockBtn_({ label: meta.label, icon: meta.icon, extraClass: meta.cls, onClick: () => openUrl_(item.url) }));
    });
    dock.style.display = "";
    applyWideRule_(btns);
  }
  function renderCtaDock_(ctx, p){
    const dock = ctx.qs("ctaDock");
    const btns = ctx.qs("ctaButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const items = [];
    const limit = PLAN_LIMITS[getEffectiveTheme_(p)]?.maxCtas || 1;
    const ctaPairs = [
      { text: text(pick(p, ["cta_text_1","CTA文字1","ctaText1"])), link: normalizeUrl_(pick(p, ["cta_link_1","CTA連結1","ctaLink1"])) },
      { text: text(pick(p, ["cta_text_2","CTA文字2","ctaText2"])), link: normalizeUrl_(pick(p, ["cta_link_2","CTA連結2","ctaLink2"])) },
      { text: text(pick(p, ["cta_text_3","CTA文字3","ctaText3"])), link: normalizeUrl_(pick(p, ["cta_link_3","CTA連結3","ctaLink3"])) }
    ];
    ctaPairs.forEach(item => { if(item.text && item.link && items.length < limit) items.push(item); });
    if(!items.length){ dock.style.display = "none"; return; }
    items.forEach((item, idx) => {
      btns.appendChild(buildDockBtn_({ label: item.text, icon: idx === 0 ? "fa-solid fa-bolt" : "fa-solid fa-arrow-up-right-from-square", extraClass: items.length === 1 ? "dock-web wide" : "dock-web", onClick: () => openUrl_(item.link) }));
    });
    dock.style.display = "";
    applyWideRule_(btns);
  }
  function renderDocks_(ctx, p){
    renderContactDock_(ctx, p);
    renderMarquee_(ctx, p);
    renderPrimaryLinkDock_(ctx, p);
    renderMediaDock_(ctx, p);
    renderCtaDock_(ctx, p);
  }
  function renderPhotoWall_(ctx, p){
    const wall = ctx.qs("photoWall");
    const grid = ctx.qs("photoGrid");
    if(!wall || !grid) return;
    grid.innerHTML = "";
    wall.style.display = "none";
    const photos = collectPhotos_(p);
    const preview = getPreviewMeta_(p);
    const count = photos.length;
    if(!count) return;
    grid.className = "photo-grid";
    if(preview.layout === "single") grid.classList.add("layout-single");
    else if(count === 1) grid.classList.add("layout-1");
    else if(count === 2) grid.classList.add("layout-2");
    else if(count === 3) grid.classList.add("layout-3");
    else if(count === 4) grid.classList.add("layout-4");
    else grid.classList.add("layout-5");
    grid.classList.add(preview.aspect_ratio === "16:9" ? "ratio-16-9" : "ratio-1-1");
    grid.classList.add(preview.fit_mode === "contain" ? "fit-contain" : "fit-cover");
    let successCount = 0;
    let failCount = 0;
    const total = photos.length;
    photos.forEach((item, idx) => {
      const tile = document.createElement("div");
      tile.className = "photo-tile";
      tile.dataset.photoKey = item.key;
      const img = document.createElement("img");
      img.className = "wall-img";
      img.alt = `照片 ${idx + 1}`;
      img.loading = "lazy";
      img.decoding = "async";
      img.style.cursor = "pointer";
      const meta = getPhotoMeta_(p, item.key);
      applyPhotoMetaToImg_(img, meta, preview.fit_mode);
      setImgWithFallback_(img, buildImgCandidates_(item.url), {
        onLoad: () => { successCount++; wall.style.display = ""; },
        onFail: () => { failCount++; tile.remove(); if(successCount === 0 && failCount >= total) wall.style.display = "none"; }
      });
      img.addEventListener("click", () => openUrl_(item.url));
      tile.appendChild(img);
      grid.appendChild(tile);
    });
    wall.style.display = "";
  }
  function renderCardExpiry_(ctx, p){
    const el = ctx.qs("cardExpiry");
    if(!el) return;
    const raw = text(pick(p, ["expires_at"]));
    if(!raw){ el.style.display = "none"; el.textContent = ""; return; }
    const exp = new Date(raw.replace(/\//g, "-").replace(" ", "T"));
    if(isNaN(exp.getTime())){ el.style.display = "none"; el.textContent = ""; return; }
    const now = new Date();
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const expStart = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()).getTime();
    const diffDays = Math.floor((expStart - nowStart) / 86400000);
    let label = "";
    if(diffDays < 0) label = diffDays === -1 ? "EXPIRED 1 DAY AGO" : `EXPIRED ${Math.abs(diffDays)} DAYS AGO`;
    else if(diffDays === 0) label = "EXPIRES TODAY";
    else if(diffDays === 1) label = "EXPIRES IN 1 DAY";
    else label = `EXPIRES IN ${diffDays} DAYS`;
    el.textContent = label;
    el.style.display = "block";
  }
  function renderCard(data, root, opts = {}){
    if(!root) throw new Error("HSCCardRenderer.render: missing root");
    let sourceRow = data || {};
    if(sourceRow && typeof sourceRow === "object" && (!text(sourceRow.name)) && text(sourceRow.lead_snapshot)){
      try{
        const snap = safeJsonParse_(sourceRow.lead_snapshot);
        if(snap && typeof snap === "object") sourceRow = { ...snap, ...sourceRow };
      }catch(_e){}
    }
    sourceRow = normalizeCardFeatures(sourceRow);
    const p = buildNormalizedPayload_(sourceRow || {});
    const ctx = createContext(root, opts);

    applyPreviewMetaUi_(ctx, p);

    const nameEl = ctx.qs("u-name");
    const unitWrap = ctx.qs("u-unit-wrap");
    const unitEl = ctx.qs("u-unit");
    const unitToggle = ctx.qs("u-unit-toggle");
    const titleEl = ctx.qs("u-title");
    const sloganWrap = ctx.qs("u-slogan-wrap");
    const sloganEl = ctx.qs("u-slogan");
    const sloganToggle = ctx.qs("u-slogan-toggle");

    const nameVal = text(pick(p, ["name","姓名"])) || "未命名";
    const unitVal = normalizeLongText_(pick(p, ["unit","單位","公司"]));
    const titleVal = text(pick(p, ["title","職稱"])) || "";
    const sloganVal = normalizeLongText_(pick(p, ["slogan","一句話","簡介","intro"]));

    if(nameEl) nameEl.textContent = nameVal;
    if(unitWrap && unitEl){
      if(text(unitVal)){ unitWrap.style.display = ""; setExpandableText_(unitEl, unitToggle, unitVal, 2, { allowMultiline: true }); }
      else { unitWrap.style.display = "none"; unitEl.innerHTML = ""; if(unitToggle) unitToggle.style.display = "none"; }
    }
    if(titleEl) titleEl.textContent = titleVal;
    if(sloganWrap && sloganEl){
      if(text(sloganVal)){ sloganWrap.style.display = ""; setExpandableText_(sloganEl, sloganToggle, sloganVal, 3, { allowMultiline: true }); }
      else { sloganWrap.style.display = "none"; sloganEl.innerHTML = ""; if(sloganToggle) sloganToggle.style.display = "none"; }
    }

    renderAvatar_(ctx, p);
    renderLogo_(ctx, p);
    renderBlocks_(ctx, p);
    renderDocks_(ctx, p);
    renderPhotoWall_(ctx, p);
    renderCardExpiry_(ctx, p);

    requestAnimationFrame(() => ctx.refreshAllExpandable());
    return { payload: p, context: ctx };
  }

  window.HSCCardRenderer = {
    render: renderCard,
    normalizeCardFeatures,
    normalizePreviewMeta: normalizePreviewMeta_,
    getPreviewMeta: getPreviewMeta_,
    getPhotoMeta: getPhotoMeta_,
    collectPhotos: collectPhotos_
  };
})();
