
(function(){
  "use strict";

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

  const PLAN_LIMITS = {
    free: { maxPhotos: 2, maxCtas: 1 },
    premium: { maxPhotos: 5, maxCtas: 3 }
  };

  function text(v){ return (v == null ? "" : String(v)).trim(); }
  function safeJsonParse_(raw){
    const s = String(raw || "").trim();
    if(!s) return null;
    try{ return JSON.parse(s); }catch(_e){}
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
    const aspectRatio = text(meta.aspect_ratio || meta.aspectRatio);
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
    for(let i=1;i<=10;i++){
      out["photo"+i] = normalizeSinglePhotoMeta_(src["photo"+i]);
    }
    if(src.avatar) out.avatar = normalizeSinglePhotoMeta_(src.avatar);
    if(src.logo) out.logo = normalizeSinglePhotoMeta_(src.logo);
    return out;
  }
  function normalizeCardFeatures(card){
    const src = card && typeof card === "object" ? card : {};
    let parsed = {};
    if(src.features && typeof src.features === "object"){
      parsed = src.features;
    }else{
      const j = safeJsonParse_(src.features_json);
      if(j && typeof j === "object") parsed = j;
    }
    src.features = {
      photo_meta: normalizePhotoMetaMap_(parsed.photo_meta),
      preview_meta: normalizePreviewMeta_(parsed.preview_meta)
    };
    return src;
  }
  function getPreviewMeta_(p){
    return normalizePreviewMeta_(p?.features?.preview_meta);
  }
  function getPhotoMeta_(p, key){
    const map = normalizePhotoMetaMap_(p?.features?.photo_meta);
    return map[key] || { ...DEFAULT_PHOTO_META };
  }
  function normalizePlan_(v){
    return text(v).toLowerCase() === "premium" ? "premium" : "free";
  }
  function getEffectiveTheme_(p){
    const preview = getPreviewMeta_(p);
    if(preview.theme === "premium" || preview.theme === "free") return preview.theme;
    return normalizePlan_(p.plan);
  }
  function normalizeUrl_(s){
    let v = String(s || "").trim();
    if(!v) return "";
    if(/^https?:\/\//i.test(v) || /^data:image\//i.test(v)) return v;
    if(/^www\./i.test(v)) return "https://" + v;
    if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
    return v;
  }
  function escapeHtml_(s){
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function openUrl_(url){
    const u = normalizeUrl_(url);
    if(!u) return;
    window.open(u, "_blank", "noopener");
  }
  function openMapByAddress_(addr){
    const a = text(addr);
    if(!a) return;
    window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(a), "_blank", "noopener");
  }
  function buildImgCandidates_(raw){
    const u = normalizeUrl_(raw);
    return u ? [u] : [];
  }
  function setImgWithFallback_(imgEl, candidates, options = {}){
    const list = (candidates || []).filter(Boolean);
    if(!imgEl){
      if(typeof options.onFail === "function") options.onFail();
      return;
    }
    if(!list.length){
      imgEl.removeAttribute("src");
      if(typeof options.onFail === "function") options.onFail();
      return;
    }
    let idx = 0;
    imgEl.onload = function(){ if(typeof options.onLoad === "function") options.onLoad(); };
    imgEl.onerror = function(){
      idx += 1;
      if(idx >= list.length){
        if(typeof options.onFail === "function") options.onFail();
        return;
      }
      imgEl.src = list[idx];
    };
    imgEl.src = list[0];
  }

  const CARD_TEMPLATE = `
    <section class="card" id="card">
      <div class="premium-fx-layer"></div>
      <div class="banner" id="banner"><div class="dynamic-mask"></div></div>
      <div class="paper-overlay" id="paperOverlay"></div>
      <div class="avatar-wrap">
        <div class="avatar-circle"><img class="avatar" id="u-img" alt="個人照" /></div>
      </div>
      <div class="premium-badge" id="premiumBadge" style="display:none;">
        <span class="badge-dot"></span><span class="badge-text">精品設計</span>
      </div>
      <div class="logo-wrap" id="logoWrap" style="display:none;"><img id="u-logo" class="logo-img" alt="Logo" /></div>
      <div class="info-scroll">
        <div class="name" id="u-name">載入中…</div>
        <div class="text-toggle-wrap unit-wrap" id="u-unit-wrap" style="display:none;">
          <div class="unit expandable-text is-collapsed preline" id="u-unit" style="--max-lines:2;"></div>
          <button class="expand-toggle" id="u-unit-toggle" type="button" style="display:none;">看更多</button>
        </div>
        <div class="title" id="u-title"></div>
        <div class="text-toggle-wrap slogan-wrap" id="u-slogan-wrap" style="display:none;">
          <div class="slogan expandable-text is-collapsed preline" id="u-slogan" style="--max-lines:3;"></div>
          <button class="expand-toggle" id="u-slogan-toggle" type="button" style="display:none;">看更多</button>
        </div>
        <div class="info-block" id="block-service" style="display:none;"></div>
        <div class="info-block" id="block-exp" style="display:none;"></div>
        <div class="contact-dock install-dock" id="installDock" style="display:none;">
          <div class="dock-title">一鍵安裝</div>
          <div class="dock-buttons"><button class="dock-btn wide dock-web" type="button" id="btnInstallCard"><span>安裝到手機桌面</span></button></div>
        </div>
        <div class="contact-dock" id="contactDock" style="display:none;"><div class="dock-title">聯繫方式</div><div class="dock-buttons" id="contactButtons"></div></div>
        <div class="contact-dock marquee-dock" id="marqueeDock" style="display:none;">
          <div class="dock-title">重要訊息</div>
          <div class="marquee-shell" id="marqueeShell"><div class="marquee-track" id="marqueeTrack"><span class="marquee-text" id="marqueeText"></span></div></div>
        </div>
        <div class="contact-dock primary-link-dock" id="primaryLinkDock" style="display:none;"><div class="dock-title">主網站</div><div class="dock-buttons" id="primaryLinkButtons"></div></div>
        <div class="contact-dock" id="mediaDock" style="display:none;"><div class="dock-title">影音／社群</div><div class="dock-buttons" id="mediaButtons"></div></div>
        <div class="contact-dock cta-dock" id="ctaDock" style="display:none;"><div class="dock-title">立即行動</div><div class="dock-buttons" id="ctaButtons"></div></div>
        <div class="photo-wall" id="photoWall" style="display:none;"><div class="dock-title">照片</div><div class="photo-grid" id="photoGrid"></div></div>
        <div class="card-expiry" id="cardExpiry" style="display:none;"></div>
        <div class="qr-bottom" id="bottomQrSection">
          <div class="qr-bottom-head">
            <div class="qr-bottom-title" id="bottomQrTitle">掃描 QRcode｜開啟我的智慧名片</div>
            <div class="qr-bottom-sub" id="bottomQrSub">可收藏・可分享・可快速回看</div>
          </div>
          <div class="qr-bottom-wrap">
            <div class="qr-bottom-canvas">
              <div class="qr-bottom-grid" id="bottomQrGrid"></div>
              <img id="bottomQrAvatar" alt="QR 頭像" />
            </div>
          </div>
        </div>
        <div class="version-tag" id="versionTag"></div>
      </div>
    </section>
    <div class="feature-qr-support" aria-hidden="true">
      <div class="feature-qr-canvas"><div class="feature-qr-grid" id="featureQrGrid"></div><img id="featureQrAvatar" alt="功能 QR 頭像" /></div>
    </div>
  `;

  function ensureRootMarkup_(root){
    if(!root) return null;
    if(!root.querySelector("#card")){
      root.innerHTML = CARD_TEMPLATE;
    }
    return root;
  }
  function qs(root, id){ return root ? root.querySelector("#"+id) : null; }
  function qsa(root, sel){ return root ? Array.from(root.querySelectorAll(sel)) : []; }

  function setExpandableText_(contentEl, toggleEl, rawText, maxLines, allowMultiline){
    if(!contentEl) return;
    const value = String(rawText || "").trim();
    if(!value){
      contentEl.textContent = "";
      if(toggleEl) toggleEl.style.display = "none";
      return;
    }
    if(allowMultiline){
      contentEl.innerHTML = escapeHtml_(value).replace(/\n/g, "<br>");
      contentEl.classList.add("preline");
    }else{
      contentEl.textContent = value;
      contentEl.classList.remove("preline");
    }
    if(toggleEl){
      const show = value.length > (maxLines * 28);
      toggleEl.style.display = show ? "inline-flex" : "none";
      toggleEl.onclick = function(){
        const expanded = contentEl.classList.contains("is-expanded");
        contentEl.classList.toggle("is-expanded", !expanded);
        contentEl.classList.toggle("is-collapsed", expanded);
        toggleEl.textContent = expanded ? "看更多" : "收合";
      };
      contentEl.classList.add("is-collapsed");
      contentEl.classList.remove("is-expanded");
      contentEl.style.setProperty("--max-lines", String(maxLines || 3));
    }
  }
  function applyPreviewMetaUi_(root, p){
    const preview = getPreviewMeta_(p);
    const host = root;
    const plan = getEffectiveTheme_(p);
    if(!host) return;
    host.classList.remove("mode-free","mode-premium","color-1","color-2","color-3","color-4","color-5","p1","p2","p3","p4","p5","p6","p7","style-arch","style-flat","style-spot","paper-1","paper-2","paper-3");
    host.classList.add(plan === "premium" ? "mode-premium" : "mode-free");
    if(plan === "premium"){
      host.classList.add(text(p.color || "p1").toLowerCase());
      const badge = qs(root, "premiumBadge");
      if(badge) badge.style.display = "";
    }else{
      const color = ({c1:"color-1",c2:"color-2",c3:"color-3",c4:"color-4",c5:"color-5"})[text(p.color).toLowerCase()] || "color-1";
      const style = ({s1:"style-arch",s2:"style-flat",s3:"style-spot"})[text(p.style).toLowerCase()] || "style-arch";
      const paper = ({f1:"paper-1",f2:"paper-2",f3:"paper-3"})[text(p.paper).toLowerCase()] || "paper-1";
      host.classList.add(color, style, paper);
      const badge = qs(root, "premiumBadge");
      if(badge) badge.style.display = "none";
    }
    const card = qs(root, "card");
    const grid = qs(root, "photoGrid");
    [card, grid].filter(Boolean).forEach(el=>{
      el.classList.remove("layout-grid","layout-single","ratio-1-1","ratio-16-9","fit-cover","fit-contain");
      el.classList.add(preview.layout === "single" ? "layout-single" : "layout-grid");
      el.classList.add(preview.aspect_ratio === "16:9" ? "ratio-16-9" : "ratio-1-1");
      el.classList.add(preview.fit_mode === "contain" ? "fit-contain" : "fit-cover");
    });
  }
  function pickAvatarInfo_(p){
    const url = normalizeUrl_(p.avatar_url || p.photo1_url || "");
    return { url };
  }
  function pickLogoInfo_(p){
    return { url: normalizeUrl_(p.logo_url || "") };
  }
  function renderAvatar_(root,p){
    const img = qs(root,"u-img");
    if(!img) return;
    const info = pickAvatarInfo_(p);
    if(!info.url){ img.style.display="none"; img.removeAttribute("src"); return; }
    img.style.display = "block";
    setImgWithFallback_(img, buildImgCandidates_(info.url), {
      onFail: ()=>{ img.style.display="none"; img.removeAttribute("src"); }
    });
  }
  function renderLogo_(root,p){
    const wrap = qs(root,"logoWrap");
    const img = qs(root,"u-logo");
    if(!wrap || !img) return;
    const info = pickLogoInfo_(p);
    if(!info.url){ wrap.style.display="none"; img.removeAttribute("src"); return; }
    wrap.style.display = "flex";
    setImgWithFallback_(img, buildImgCandidates_(info.url), {
      onFail: ()=>{ wrap.style.display="none"; img.removeAttribute("src"); }
    });
  }
  function renderExpandableInfoBlock_(root, blockId, title, rawText, maxLines){
    const blockEl = qs(root, blockId);
    if(!blockEl) return;
    const value = text(rawText);
    if(!value){ blockEl.style.display="none"; blockEl.innerHTML=""; return; }
    blockEl.style.display = "";
    blockEl.innerHTML = `<div class="block-title">${escapeHtml_(title)}</div><div class="expandable-wrap"><div class="block-body expandable-text is-collapsed preline" style="--max-lines:${maxLines};"></div><button class="expand-toggle" type="button" style="display:none;">看更多</button></div>`;
    const contentEl = blockEl.querySelector(".expandable-text");
    const toggleEl = blockEl.querySelector(".expand-toggle");
    setExpandableText_(contentEl, toggleEl, value, maxLines, true);
  }
  function renderBlocks_(root,p){
    renderExpandableInfoBlock_(root, "block-service", "服務項目", p.services || "", 2);
    renderExpandableInfoBlock_(root, "block-exp", "經歷 / 品牌故事", p.experience || "", 3);
  }
  function buildDockBtn_({label,onClick,extraClass}){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dock-btn" + (extraClass ? (" "+extraClass) : "");
    b.innerHTML = `<span>${escapeHtml_(label)}</span>`;
    b.addEventListener("click", onClick);
    return b;
  }
  function applyWideRule_(container){
    if(!container) return;
    const btns = Array.from(container.querySelectorAll(".dock-btn"));
    btns.forEach(b=>b.classList.remove("wide"));
    if(btns.length === 1 || btns.length % 2 === 1){
      const last = btns[btns.length - 1];
      if(last) last.classList.add("wide");
    }
  }
  function renderContactDock_(root,p){
    const dock = qs(root,"contactDock");
    const btns = qs(root,"contactButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const phone = text(p.phone);
    const email = text(p.email);
    const address = text(p.address);
    const lineUrl = normalizeUrl_(p.line_url || p.line_oa);
    const wechatId = text(p.wechat_id);
    const items = [];
    if(lineUrl) items.push({label:"私訊 LINE", action:()=>openUrl_(lineUrl)});
    if(wechatId) items.push({label:"微信ID", action:async()=>{ try{ await navigator.clipboard.writeText(wechatId); alert("✅ 已複製微信ID"); }catch(_e){} }});
    if(phone) items.push({label:"電話", action:()=>{ location.href = "tel:"+phone; }});
    if(email) items.push({label:"Email", action:()=>{ location.href = "mailto:"+email; }});
    if(address) items.push({label:"地址導航", action:()=>openMapByAddress_(address)});
    if(!items.length){ dock.style.display="none"; return; }
    items.forEach(item=>btns.appendChild(buildDockBtn_({label:item.label,onClick:item.action,extraClass:"dock-web"})));
    dock.style.display = "";
    applyWideRule_(btns);
  }
  function getMarqueeText_(p){
    return text(p.marquee_text || "");
  }
  function isMarqueeEnabled_(p){
    const v = text(p.marquee_enabled).toLowerCase();
    return !!getMarqueeText_(p) || ["1","true","yes","y"].includes(v);
  }
  function renderMarquee_(root,p){
    const dock = qs(root,"marqueeDock");
    const textEl = qs(root,"marqueeText");
    if(!dock || !textEl) return;
    const t = getMarqueeText_(p);
    if(!isMarqueeEnabled_(p) || !t){
      dock.style.display = "none";
      textEl.textContent = "";
      return;
    }
    dock.style.display = "";
    textEl.textContent = t + " ｜ " + t + " ｜ ";
  }
  function renderPrimaryLinkDock_(root,p){
    const dock = qs(root,"primaryLinkDock");
    const btns = qs(root,"primaryLinkButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const website = normalizeUrl_(p.website);
    if(!website){ dock.style.display = "none"; return; }
    btns.appendChild(buildDockBtn_({label:"官方網站", onClick:()=>openUrl_(website), extraClass:"wide dock-web"}));
    dock.style.display = "";
  }
  function inferLinkLabel_(url, kind, idx){
    const u = String(url || "").toLowerCase();
    if(u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
    if(u.includes("facebook.com")) return "Facebook";
    if(u.includes("instagram.com")) return "Instagram";
    if(u.includes("threads.net")) return "Threads";
    return kind === "video" ? ("影音 " + idx) : ("社群 " + idx);
  }
  function renderMediaDock_(root,p){
    const dock = qs(root,"mediaDock");
    const btns = qs(root,"mediaButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const items = [];
    ["video1","video2","video3"].forEach((k,i)=>{ const u = normalizeUrl_(p[k]); if(u) items.push({kind:"video",idx:i+1,url:u}); });
    ["social1","social2","social3"].forEach((k,i)=>{ const u = normalizeUrl_(p[k]); if(u) items.push({kind:"social",idx:i+1,url:u}); });
    if(!items.length){ dock.style.display = "none"; return; }
    items.forEach(item=>btns.appendChild(buildDockBtn_({label:inferLinkLabel_(item.url,item.kind,item.idx), onClick:()=>openUrl_(item.url), extraClass:"dock-web"})));
    dock.style.display = "";
    applyWideRule_(btns);
  }
  function renderCtaDock_(root,p){
    const dock = qs(root,"ctaDock");
    const btns = qs(root,"ctaButtons");
    if(!dock || !btns) return;
    btns.innerHTML = "";
    const limit = PLAN_LIMITS[getEffectiveTheme_(p)]?.maxCtas || 1;
    const items = [];
    for(let i=1;i<=10 && items.length<limit;i++){
      const label = text(p["cta_text_"+i]);
      const link = normalizeUrl_(p["cta_link_"+i]);
      if(label && link) items.push({label,link});
    }
    if(!items.length){ dock.style.display = "none"; return; }
    items.forEach(item=>btns.appendChild(buildDockBtn_({label:item.label,onClick:()=>openUrl_(item.link),extraClass:"dock-web"})));
    dock.style.display = "";
    applyWideRule_(btns);
  }
  function getPhotoLimitFromPayload_(p){
    const limit = Number(p.photo_limit || 0);
    if(Number.isFinite(limit) && limit > 0 && limit <= 10) return limit;
    return PLAN_LIMITS[getEffectiveTheme_(p)]?.maxPhotos || 2;
  }
  function applyPhotoMetaToImg_(img, meta, fitMode){
    if(!img) return;
    const x = clampNumber_(meta?.x, 0, 1, DEFAULT_PHOTO_META.x);
    const y = clampNumber_(meta?.y, 0, 1, DEFAULT_PHOTO_META.y);
    const scale = clampNumber_(meta?.scale, 0.5, 3, DEFAULT_PHOTO_META.scale);
    const rotate = clampNumber_(meta?.rotate, -180, 180, DEFAULT_PHOTO_META.rotate);
    img.style.objectPosition = `${(x*100).toFixed(2)}% ${(y*100).toFixed(2)}%`;
    img.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    img.style.objectFit = fitMode === "contain" ? "contain" : "cover";
  }
  function collectPhotos_(p){
    const photos = [];
    const limit = getPhotoLimitFromPayload_(p);
    for(let i=1;i<=limit;i++){
      const raw = p["photo"+i+"_url"];
      const url = normalizeUrl_(raw);
      if(url) photos.push({key:"photo"+i, url});
    }
    return photos;
  }
  function renderPhotoWall_(root,p){
    const wall = qs(root,"photoWall");
    const grid = qs(root,"photoGrid");
    if(!wall || !grid) return;
    grid.innerHTML = "";
    const photos = collectPhotos_(p);
    if(!photos.length){ wall.style.display = "none"; return; }
    wall.style.display = "";
    const preview = getPreviewMeta_(p);
    grid.className = "photo-grid";
    if(preview.layout === "single") grid.classList.add("layout-single");
    else if(photos.length === 1) grid.classList.add("layout-1");
    else if(photos.length === 2) grid.classList.add("layout-2");
    else if(photos.length === 3) grid.classList.add("layout-3");
    else if(photos.length === 4) grid.classList.add("layout-4");
    else grid.classList.add("layout-5");
    grid.classList.add(preview.aspect_ratio === "16:9" ? "ratio-16-9" : "ratio-1-1");
    grid.classList.add(preview.fit_mode === "contain" ? "fit-contain" : "fit-cover");
    photos.forEach((item,idx)=>{
      const tile = document.createElement("div");
      tile.className = "photo-tile";
      const img = document.createElement("img");
      img.className = "wall-img";
      img.alt = "照片 " + (idx + 1);
      applyPhotoMetaToImg_(img, getPhotoMeta_(p, item.key), preview.fit_mode);
      setImgWithFallback_(img, buildImgCandidates_(item.url), { onFail: ()=>tile.remove() });
      img.addEventListener("click", ()=>openUrl_(item.url));
      tile.appendChild(img);
      grid.appendChild(tile);
    });
  }
  function parseDateSafe_(value){
    if(!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  function renderCardExpiry_(root,p){
    const el = qs(root,"cardExpiry");
    if(!el) return;
    const exp = parseDateSafe_(p.expires_at);
    if(!exp){ el.style.display = "none"; el.textContent = ""; return; }
    const now = new Date();
    const diffDays = Math.floor((new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    el.textContent = diffDays < 0 ? `EXPIRED ${Math.abs(diffDays)} DAYS AGO` : diffDays === 0 ? "EXPIRES TODAY" : `EXPIRES IN ${diffDays} DAYS`;
    el.style.display = "block";
  }
  function buildTrackedShareUrl_(p){
    const id = text(p.id || "PREVIEW");
    const u = new URL(location.origin + location.pathname.replace(/[^/]+$/, "index.html"));
    u.searchParams.set("id", id);
    u.searchParams.set("view", "1");
    return u.toString();
  }
  function renderQrImage_(container, url, size){
    if(!container || !url) return;
    container.innerHTML = "";
    const img = document.createElement("img");
    img.alt = "QR";
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=" + encodeURIComponent((size||160)+"x"+(size||160)) + "&data=" + encodeURIComponent(url);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    container.appendChild(img);
  }
  function renderBottomQr_(root,p,options){
    const sec = qs(root,"bottomQrSection");
    const grid = qs(root,"bottomQrGrid");
    const avatar = qs(root,"bottomQrAvatar");
    if(!sec || !grid) return;
    if(options && options.disableShareQr){ sec.style.display = "none"; if(avatar) avatar.style.display = "none"; return; }
    sec.style.display = "block";
    renderQrImage_(grid, buildTrackedShareUrl_(p), 136);
    if(avatar){
      avatar.removeAttribute("src");
      avatar.style.display = "none";
    }
  }
  function renderCard(rootOrData, maybeData, maybeOptions){
    let root, data, options;
    if(rootOrData instanceof Element){
      root = rootOrData; data = maybeData || {}; options = maybeOptions || {};
    }else{
      data = rootOrData || {}; options = maybeData || {}; root = options.root || options.scopeRoot;
    }
    if(!root) return null;
    ensureRootMarkup_(root);
    const normalized = normalizeCardFeatures({ ...(data || {}) });
    applyPreviewMetaUi_(root, normalized);

    const nameEl = qs(root, "u-name");
    const unitWrap = qs(root, "u-unit-wrap");
    const unitEl = qs(root, "u-unit");
    const unitToggle = qs(root, "u-unit-toggle");
    const titleEl = qs(root, "u-title");
    const sloganWrap = qs(root, "u-slogan-wrap");
    const sloganEl = qs(root, "u-slogan");
    const sloganToggle = qs(root, "u-slogan-toggle");

    if(nameEl) nameEl.textContent = text(normalized.name) || "未命名";
    if(titleEl) titleEl.textContent = text(normalized.title);
    if(unitWrap && unitEl){
      const v = text(normalized.unit);
      unitWrap.style.display = v ? "" : "none";
      setExpandableText_(unitEl, unitToggle, v, 2, true);
    }
    if(sloganWrap && sloganEl){
      const v = text(normalized.slogan || normalized.intro);
      sloganWrap.style.display = v ? "" : "none";
      setExpandableText_(sloganEl, sloganToggle, v, 3, true);
    }

    renderAvatar_(root, normalized);
    renderLogo_(root, normalized);
    renderBlocks_(root, normalized);
    renderContactDock_(root, normalized);
    renderMarquee_(root, normalized);
    renderPrimaryLinkDock_(root, normalized);
    renderMediaDock_(root, normalized);
    renderCtaDock_(root, normalized);
    renderPhotoWall_(root, normalized);
    renderCardExpiry_(root, normalized);
    renderBottomQr_(root, normalized, options || {});
    const featureGrid = qs(root,"featureQrGrid");
    const featureAvatar = qs(root,"featureQrAvatar");
    if(featureGrid) featureGrid.innerHTML = "";
    if(featureAvatar){ featureAvatar.removeAttribute("src"); featureAvatar.style.display = "none"; }
    const versionTag = qs(root, "versionTag");
    if(versionTag) versionTag.textContent = options.version || "v7.4.1-card-renderer-stable";
    return { root, data: normalized };
  }

  window.HSCCardRenderer = {
    normalizeCardFeatures,
    getPreviewMeta_,
    getPhotoMeta_,
    applyPreviewMetaUi_,
    renderAvatar_,
    renderLogo_,
    renderBlocks_,
    renderContactDock_,
    renderMarquee_,
    renderPrimaryLinkDock_,
    renderMediaDock_,
    renderCtaDock_,
    renderPhotoWall_,
    renderCardExpiry_,
    renderBottomQr_,
    render: function(data, options){ return renderCard(options?.root || options?.scopeRoot, data, options); },
    renderCard
  };
})();
