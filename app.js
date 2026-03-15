/*
HSC v731.1
app.js
COMPLETE OVERWRITE
Part 1 / 5
*/

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/3r2ZePN",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v731.1",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  REF_STORAGE_KEY: "HSC_REF"
};

let currentRow = null;
let deferredInstallPrompt = null;
let currentAvatarUrlCache = "";
let currentAvatarSourceKeyCache = "";
let lastBottomQrRenderKey = "";
let lastFacadeQrRenderKey = "";
let __scrollTop = 0;
let currentLeadId = "";

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v == null ? "" : String(v)).trim(); }

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if(/^TW\d{1,4}$/.test(v)){
    const n = v.replace(/^TW/i, "");
    return "TW" + n.padStart(4, "0");
  }
  return v;
}

function getSearchParams_(){
  try{ return new URLSearchParams(location.search || ""); }
  catch{ return new URLSearchParams(); }
}

function getIdFromUrl_(){
  try{
    return text(getSearchParams_().get("id") || "");
  }catch{
    return "";
  }
}

function getRefFromUrl_(){
  try{
    return text(getSearchParams_().get("ref") || "");
  }catch{
    return "";
  }
}

function persistRefIfAny_(){
  const ref = getRefFromUrl_();
  if(!ref) return;
  try{ localStorage.setItem(CONFIG.REF_STORAGE_KEY, ref); }catch{}
}

function getSavedRef_(){
  const ref = getRefFromUrl_();
  if(ref) return ref;
  try{
    return text(localStorage.getItem(CONFIG.REF_STORAGE_KEY) || "");
  }catch{
    return "";
  }
}

function isCleanMode_(){
  const sp = getSearchParams_();
  return sp.get("view") === "1" || sp.get("clean") === "1";
}

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
  if(m){
    try{ return JSON.parse(m[0]); }catch{}
  }
  return null;
}

async function fetchWithTimeout_(url, options = {}, timeoutMs = CONFIG.FETCH_TIMEOUT_MS){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      ...options
    });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if(!json) throw new Error("Not JSON");
    return json;
  }finally{
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url, options = {}){
  let last = null;
  for(let i = 0; i <= CONFIG.RETRY; i++){
    try{
      return await fetchWithTimeout_(url, options, CONFIG.FETCH_TIMEOUT_MS);
    }catch(e){
      last = e;
      await new Promise(r => setTimeout(r, 520 + i * 520));
    }
  }
  throw last || new Error("Fetch failed");
}

function buildCardApiUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "card");
  u.searchParams.set("id", cid);
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildLeadCreateUrl_(){
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "leadCreate");
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
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
      const v2 = lower[String(kk).toLowerCase()];
      if(v2 != null && text(v2) !== "") return v2;
    }
  }
  return "";
}

function escapeHtml_(s){
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeHtmlWithBreaks_(s){
  return escapeHtml_(s).replace(/\n/g, "<br>");
}

function copyText_(value, okMsg = "✅ 已複製"){
  const v = text(value);
  if(!v) return;
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(v).then(()=> alert(okMsg)).catch(()=>{
      prompt("請手動複製", v);
    });
    return;
  }
  prompt("請手動複製", v);
}
/*
HSC v731.1
app.js
COMPLETE OVERWRITE
Part 2 / 5
*/

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
  if(!imgEl){
    if(typeof options.onFail === "function") options.onFail();
    return;
  }

  if(!list.length){
    if(typeof options.onFail === "function") options.onFail();
    return;
  }

  let idx = 0;
  let done = false;

  imgEl.referrerPolicy = options.referrerPolicy || "no-referrer";
  try{ imgEl.crossOrigin = options.crossOrigin || "anonymous"; }catch{}

  const buildSrc = (src)=>{
    const sep = src.includes("?") ? "&" : "?";
    return src + sep + "t=" + Date.now() + "&v=" + encodeURIComponent(CONFIG.VERSION);
  };

  const cleanup = ()=>{
    imgEl.onerror = null;
    imgEl.onload = null;
  };

  const failAll = ()=>{
    if(done) return;
    done = true;
    cleanup();
    if(typeof options.onFail === "function") options.onFail();
  };

  const tryNext = ()=>{
    if(done) return;
    idx++;
    if(idx >= list.length){
      failAll();
      return;
    }
    imgEl.src = buildSrc(list[idx]);
  };

  imgEl.onload = ()=>{
    if(done) return;
    done = true;
    cleanup();
    if(typeof options.onLoad === "function") options.onLoad();
  };

  imgEl.onerror = ()=>{
    tryNext();
  };

  imgEl.src = buildSrc(list[0]);
}

function openUrl_(url){
  const u = normalizeUrl_(url);
  if(!u) return;
  window.open(u, "_blank");
}

function openMapByAddress_(addr){
  const a = text(addr);
  if(!a) return;
  const q = encodeURIComponent(a);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

function buildDockBtn_({label, icon, onClick, extraClass}){
  const b = document.createElement("button");
  b.className = "dock-btn" + (extraClass ? (" " + extraClass) : "");
  b.type = "button";
  b.innerHTML = `<i class="${icon}"></i><span>${escapeHtml_(label)}</span>`;
  b.addEventListener("click", onClick);
  return b;
}

function applyWideRule_(container){
  if(!container) return;
  const btns = Array.from(container.querySelectorAll(".dock-btn"));
  btns.forEach(b => b.classList.remove("wide"));
  if(btns.length % 2 === 1){
    btns[btns.length - 1].classList.add("wide");
  }
}

function pickAvatarInfo_(p){
  const keys = [
    "avatar_img_fast","avatar_img","avatar_url","avatar",
    "個人照_fast","個人照","個人照_url"
  ];
  for(const k of keys){
    const v = pick(p, [k]);
    if(text(v)){
      return { key: k, raw: v, url: normalizeImageUrl_(v) };
    }
  }
  return { key: "", raw: "", url: "" };
}

function renderAvatar_(p){
  const img = qs("u-img");
  if(!img) return;
  const info = pickAvatarInfo_(p);
  const u = info.url;
  currentAvatarUrlCache = u || "";
  currentAvatarSourceKeyCache = info.key || "";
  if(!u){
    img.removeAttribute("src");
    return;
  }
  setImgWithFallback_(img, buildImgCandidates_(u), {
    onFail: ()=> img.removeAttribute("src")
  });
}

function renderLogo_(p){
  const logoUrl = pick(p, ["logo_img_fast","logo_img","logo_url","Logo_fast","Logo"]);
  const wrap = qs("logoWrap");
  const img = qs("u-logo");
  if(!wrap || !img) return;

  const u = normalizeImageUrl_(logoUrl);
  if(!u){
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }

  wrap.style.display = "flex";
  img.style.borderRadius = "18px";
  img.style.objectFit = "cover";
  setImgWithFallback_(img, buildImgCandidates_(u), {
    onFail: ()=>{
      wrap.style.display = "none";
      img.removeAttribute("src");
    }
  });
}

function renderExpandableInfoBlock_(blockEl, title, rawText){
  if(!blockEl) return;
  const value = text(rawText);
  if(!value){
    blockEl.style.display = "none";
    blockEl.innerHTML = "";
    return;
  }
  blockEl.style.display = "";
  blockEl.innerHTML = `
    <div class="block-title">${escapeHtml_(title)}</div>
    <div class="block-body preline">${escapeHtmlWithBreaks_(value)}</div>
  `;
}

function renderBlocks_(p){
  const service = pick(p, ["services","服務項目","service"]);
  const exp = pick(p, ["experience","經歷","exp"]);

  renderExpandableInfoBlock_(qs("block-service"), "服務項目", service);
  renderExpandableInfoBlock_(qs("block-exp"), "經歷", exp);
}
/*
HSC v731.1
app.js
COMPLETE OVERWRITE
Part 3 / 5
*/

function renderContactDock_(p){
  const dock = qs("contactDock");
  const btns = qs("contactButtons");
  if(!dock || !btns) return;

  btns.innerHTML = "";

  const phone = pick(p, ["phone","電話"]);
  const email = pick(p, ["email","Email"]);
  const address = pick(p, ["address","地址"]);
  const lineUrl = normalizeUrl_(pick(p, ["line_url","line_oa","LINE連結"]));
  const wechatId = text(pick(p, ["wechat_id","微信ID","微信"]));

  const items = [];

  if(lineUrl){
    items.push(buildDockBtn_({
      label:"私訊 LINE",
      icon:"fa-brands fa-line",
      extraClass:"dock-line",
      onClick: ()=> openUrl_(lineUrl)
    }));
  }
  if(wechatId){
    items.push(buildDockBtn_({
      label:"微信ID",
      icon:"fa-brands fa-weixin",
      extraClass:"dock-web",
      onClick: ()=> copyText_(wechatId, "✅ 已複製微信ID")
    }));
  }
  if(phone){
    items.push(buildDockBtn_({
      label:"電話",
      icon:"fa-solid fa-phone",
      extraClass:"dock-web",
      onClick: ()=> { location.href = `tel:${text(phone)}`; }
    }));
  }
  if(email){
    items.push(buildDockBtn_({
      label:"Email",
      icon:"fa-solid fa-envelope",
      extraClass:"dock-web",
      onClick: ()=> { location.href = `mailto:${text(email)}`; }
    }));
  }
  if(address){
    items.push(buildDockBtn_({
      label:"地址導航",
      icon:"fa-solid fa-location-dot",
      extraClass:"dock-map",
      onClick: ()=> openMapByAddress_(address)
    }));
  }

  if(!items.length){
    dock.style.display = "none";
    return;
  }

  dock.style.display = "";
  items.forEach(el => btns.appendChild(el));
  applyWideRule_(btns);
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

function renderMediaDock_(p){
  const dock = qs("mediaDock");
  const btns = qs("mediaButtons");
  if(!dock || !btns) return;

  btns.innerHTML = "";
  const items = [];

  ["video1","video2","video3"].forEach((k, i)=>{
    const u = normalizeUrl_(pick(p, [k, `影音連結${i+1}`]));
    if(u) items.push({ kind:"video", idx:i+1, url:u });
  });
  ["social1","social2","social3"].forEach((k, i)=>{
    const u = normalizeUrl_(pick(p, [k, `社群連結${i+1}`]));
    if(u) items.push({ kind:"social", idx:i+1, url:u });
  });

  if(!items.length){
    dock.style.display = "none";
    return;
  }

  dock.style.display = "";
  items.forEach(item=>{
    const meta = inferLinkMeta_(item.url, item.kind, item.idx);
    btns.appendChild(buildDockBtn_({
      label: meta.label,
      icon: meta.icon,
      extraClass: meta.cls,
      onClick: ()=> openUrl_(item.url)
    }));
  });
  applyWideRule_(btns);
}

function renderCtaDock_(p){
  const dock = qs("ctaDock");
  const btns = qs("ctaButtons");
  if(!dock || !btns) return;

  btns.innerHTML = "";
  const pairs = [];

  for(let i = 1; i <= 3; i++){
    const t = text(pick(p, [`cta_text_${i}`]));
    const l = normalizeUrl_(pick(p, [`cta_link_${i}`]));
    if(t && l) pairs.push({ label:t, url:l });
  }

  if(!pairs.length){
    const ctaText = text(pick(p, ["cta_text","CTA文字","ctaText"]));
    const ctaLink = normalizeUrl_(pick(p, ["cta_link","CTA連結","ctaLink"]));
    if(ctaText && ctaLink) pairs.push({ label:ctaText, url:ctaLink });
  }

  if(!pairs.length){
    dock.style.display = "none";
    return;
  }

  dock.style.display = "";
  pairs.forEach(item=>{
    btns.appendChild(buildDockBtn_({
      label:item.label,
      icon:"fa-solid fa-bolt",
      extraClass:"dock-web",
      onClick: ()=> openUrl_(item.url)
    }));
  });
  applyWideRule_(btns);
}

function collectPhotos_(p){
  const slots = [
    ["photo1_img_fast","photo1_img","photo1_url"],
    ["photo2_img_fast","photo2_img","photo2_url"],
    ["photo3_img_fast","photo3_img","photo3_url"],
    ["photo4_img_fast","photo4_img","photo4_url"],
    ["photo5_img_fast","photo5_img","photo5_url"]
  ];
  const photos = [];
  const seen = new Set();

  slots.forEach(keys=>{
    for(const k of keys){
      const raw = pick(p, [k]);
      const url = normalizeImageUrl_(raw);
      if(!url) continue;
      const fp = url.split("?")[0].toLowerCase();
      if(seen.has(fp)) continue;
      seen.add(fp);
      photos.push(url);
      break;
    }
  });

  return photos;
}

function renderPhotoWall_(p){
  const wall = qs("photoWall");
  const grid = qs("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const photos = collectPhotos_(p);

  if(!photos.length){
    wall.style.display = "none";
    return;
  }

  wall.style.display = "";
  grid.className = "photo-grid";
  if(photos.length === 1) grid.classList.add("layout-1");
  else if(photos.length === 2) grid.classList.add("layout-2");
  else if(photos.length === 3) grid.classList.add("layout-3");
  else if(photos.length === 4) grid.classList.add("layout-4");
  else grid.classList.add("layout-5");

  photos.forEach((u, idx)=>{
    const img = document.createElement("img");
    img.className = "wall-img";
    img.alt = `照片 ${idx + 1}`;
    img.loading = "lazy";
    img.decoding = "async";
    setImgWithFallback_(img, buildImgCandidates_(u), {
      onFail: ()=> img.remove()
    });
    img.addEventListener("click", ()=> openUrl_(u));
    grid.appendChild(img);
  });
}

function buildCanonicalCleanCardUrl_(id){
  const cid = normalizeId_(id || getIdFromUrl_()) || CONFIG.DEFAULT_ID;
  try{
    const u = new URL(CONFIG.HUB_URL + "index.html");
    u.searchParams.set("id", cid);
    u.searchParams.set("view", "1");
    return u.toString();
  }catch{
    return CONFIG.HUB_URL + "index.html?id=" + encodeURIComponent(cid) + "&view=1";
  }
}

function buildCardShareUrl_(){
  return buildCanonicalCleanCardUrl_(getIdFromUrl_());
}

function buildHubShareUrl_(){
  const ref = getSavedRef_() || normalizeId_(getIdFromUrl_());
  try{
    const u = new URL(CONFIG.HUB_URL);
    if(ref) u.searchParams.set("ref", ref);
    return u.toString();
  }catch{
    return CONFIG.HUB_URL + (ref ? ("?ref=" + encodeURIComponent(ref)) : "");
  }
}

function buildBottomQrUrl_(){
  return buildCanonicalCleanCardUrl_(getIdFromUrl_());
}

function buildQrImageUrl_(url, size){
  const s = Number(size) || 220;
  return "https://api.qrserver.com/v1/create-qr-code/"
    + "?size=" + encodeURIComponent(`${s}x${s}`)
    + "&data=" + encodeURIComponent(String(url))
    + "&ecc=H"
    + "&margin=2";
}

function renderQr({ container, url, size = 160, renderKey = "" } = {}){
  if(!container || !url) return false;

  const key = renderKey || `${url}|${size}`;
  if(container.dataset.renderKey === key) return true;

  container.dataset.renderKey = key;
  container.innerHTML = "";

  const img = document.createElement("img");
  img.alt = "QR Code";
  img.loading = "eager";
  img.decoding = "sync";
  img.referrerPolicy = "no-referrer";
  img.src = buildQrImageUrl_(url, size) + "&t=" + Date.now();
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.display = "block";
  img.style.objectFit = "contain";
  container.appendChild(img);

  return true;
}
/*
HSC v731.1
app.js
COMPLETE OVERWRITE
Part 4 / 5
*/

function renderFacadeQrFromCurrent_(){
  const grid = qs("facadeQrGrid");
  if(!grid) return;
  const url = buildHubShareUrl_();
  const key = "facade|" + url;
  if(lastFacadeQrRenderKey === key && grid.dataset.renderKey === key) return;
  lastFacadeQrRenderKey = key;
  renderQr({
    container: grid,
    url,
    size: 148,
    renderKey: key
  });
}

function renderBottomQr_(p){
  const sec = qs("bottomQrSection");
  const grid = qs("bottomQrGrid");
  if(!sec || !grid) return;

  const qrUrl = buildBottomQrUrl_();
  const key = "bottom|" + qrUrl;
  if(lastBottomQrRenderKey !== key || grid.dataset.renderKey !== key){
    lastBottomQrRenderKey = key;
    renderQr({
      container: grid,
      url: qrUrl,
      size: 180,
      renderKey: key
    });
  }
  sec.style.display = "block";
}

async function shareUrl_(url, title, textMsg, okMsg){
  try{
    if(navigator.share){
      await navigator.share({ title: title || "天使幸福智慧名片", text: textMsg || "", url });
      return;
    }
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(url);
      alert(okMsg || "✅ 已複製連結");
      return;
    }
    prompt("請手動複製連結", url);
  }catch(_err){}
}

function lockScroll_(){
  try{
    __scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = (-__scrollTop) + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }catch(e){}
}

function unlockScroll_(){
  try{
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, __scrollTop || 0);
  }catch(e){}
}

function showMask_(el){
  if(!el) return;
  el.style.display = "flex";
  el.setAttribute("aria-hidden", "false");
  lockScroll_();
}

function hideMask_(el){
  if(!el) return;
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
  unlockScroll_();
}

function openFeatureModal_(){
  showMask_(qs("featureMask"));
}

function openInviteModal_(){
  showMask_(qs("inviteMask"));
  setTimeout(()=>{
    const input = qs("leadName");
    try{ input && input.focus(); }catch{}
  }, 60);
}

function bindAccordion_(){
  qsa(".accordion-item[data-acc-target]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const targetId = btn.getAttribute("data-acc-target");
      const panel = qs(targetId);
      if(!panel) return;
      const isOpen = btn.classList.contains("is-open");
      btn.classList.toggle("is-open", !isOpen);
      panel.style.display = isOpen ? "none" : "block";
    });
  });
}

function bindDemoCards_(){
  qsa("#demoGrid [data-demo-id]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = normalizeId_(btn.getAttribute("data-demo-id"));
      if(!id) return;
      location.href = `./index.html?id=${encodeURIComponent(id)}`;
    });
  });
}

function bindModalBasics_(){
  const featureMask = qs("featureMask");
  const inviteMask = qs("inviteMask");

  const featureCloseBtn = qs("featureCloseBtn");
  if(featureCloseBtn) featureCloseBtn.addEventListener("click", ()=> hideMask_(featureMask));

  const inviteCloseBtn = qs("inviteCloseBtn");
  if(inviteCloseBtn) inviteCloseBtn.addEventListener("click", ()=> hideMask_(inviteMask));

  if(featureMask){
    featureMask.addEventListener("click", (e)=>{
      if(e.target === featureMask) hideMask_(featureMask);
    });
  }

  if(inviteMask){
    inviteMask.addEventListener("click", (e)=>{
      if(e.target === inviteMask) hideMask_(inviteMask);
    });
  }

  [
    "btnFeatureIntro",
    "btnFeatureCardMode"
  ].forEach(id=>{
    const b = qs(id);
    if(b) b.addEventListener("click", (e)=>{
      e.preventDefault();
      openFeatureModal_();
    });
  });

  [
    "btnLeadApply",
    "btnLeadApplyBottom",
    "btnLeadApplyMain2",
    "btnLeadApplyCardMode"
  ].forEach(id=>{
    const b = qs(id);
    if(b) b.addEventListener("click", (e)=>{
      e.preventDefault();
      openInviteModal_();
    });
  });

  const featureModalLeadBtn = qs("featureModalLeadBtn");
  if(featureModalLeadBtn){
    featureModalLeadBtn.addEventListener("click", (e)=>{
      e.preventDefault();
      hideMask_(featureMask);
      openInviteModal_();
    });
  }
}

function bindLineButtons_(){
  [
    "btnLineOaCtaHome",
    "btnLineOaCtaHome2",
    "btnLineOaCtaCardMode",
    "goLineAfterLeadBtn"
  ].forEach(id=>{
    const b = qs(id);
    if(b){
      b.addEventListener("click", (e)=>{
        e.preventDefault();
        openUrl_(CONFIG.CUSTOMER_SERVICE_URL);
      });
    }
  });
}

function bindShareButtons_(){
  [
    "btnShareHub",
    "btnShareCardHub"
  ].forEach(id=>{
    const b = qs(id);
    if(!b) return;
    b.addEventListener("click", async (e)=>{
      e.preventDefault();
      await shareUrl_(buildHubShareUrl_(), "天使幸福智慧名片館", "分享智慧名片館", "✅ 已複製智慧名片館連結");
    });
  });

  const cleanFab = qs("cleanShareFab");
  if(cleanFab){
    cleanFab.addEventListener("click", async (e)=>{
      e.preventDefault();
      const url = getIdFromUrl_() ? buildCardShareUrl_() : buildHubShareUrl_();
      const title = getIdFromUrl_() ? "天使幸福智慧名片" : "天使幸福智慧名片館";
      const msg = getIdFromUrl_() ? "分享這張名片" : "分享智慧名片館";
      const ok = getIdFromUrl_() ? "✅ 已複製這張名片連結" : "✅ 已複製智慧名片館連結";
      await shareUrl_(url, title, msg, ok);
    });
  }
}
/*
HSC v731.1
app.js
COMPLETE OVERWRITE
Part 5 / 5
*/

function setHomeMode_(){
  document.body.classList.remove("mode-free","mode-premium","mode-home");
  document.body.classList.add("home-mode");

  const home = qs("homeMode");
  const cardMode = qs("cardMode");
  const panel = qs("admin-panel");
  const cardContainer = qs("card-container");
  const cleanFab = qs("cleanShareFab");
  const installFab = qs("installFab");

  if(home){
    home.hidden = false;
    home.style.display = "";
  }

  if(cardMode){
    cardMode.hidden = true;
    cardMode.style.display = "none";
  }

  if(panel){
    panel.hidden = true;
    panel.style.display = "none";
  }

  if(cardContainer){
    cardContainer.style.display = "none";
  }

  if(cleanFab) cleanFab.style.display = "flex";
  if(installFab) installFab.style.display = "flex";

  bindAccordion_();
  bindDemoCards_();
  renderFacadeQrFromCurrent_();
}

function setCardMode_(){
  document.body.classList.remove("home-mode","mode-home");

  const home = qs("homeMode");
  const cardMode = qs("cardMode");
  const panel = qs("admin-panel");
  const cardContainer = qs("card-container");
  const cleanFab = qs("cleanShareFab");
  const installFab = qs("installFab");

  if(home){
    home.hidden = true;
    home.style.display = "none";
  }

  if(cardMode){
    cardMode.hidden = false;
    cardMode.style.display = "";
  }

  if(panel){
    panel.hidden = isCleanMode_();
    panel.style.display = isCleanMode_() ? "none" : "";
  }

  if(cardContainer){
    cardContainer.style.display = "";
  }

  if(cleanFab) cleanFab.style.display = "flex";
  if(installFab) installFab.style.display = "flex";
}

function applyThemeFromPayload_(p){
  const planRaw = text(pick(p, ["plan"])) || "free";
  const body = document.body;

  body.classList.remove(
    "mode-free","mode-premium",
    "color-1","color-2","color-3","color-4","color-5",
    "style-arch","style-flat","style-spot",
    "paper-1","paper-2","paper-3",
    "p1","p2","p3","p4","p5","p6","p7"
  );

  if(planRaw === "premium"){
    body.classList.add("mode-premium");
    const premium = text(pick(p, ["premium_color"])).toLowerCase();
    body.classList.add(["p1","p2","p3","p4","p5","p6","p7"].includes(premium) ? premium : "p1");
  }else{
    body.classList.add("mode-free");
    const color = text(pick(p, ["color","free_color"])).toLowerCase();
    const style = text(pick(p, ["style","free_style"])).toLowerCase();
    const paper = text(pick(p, ["paper","free_paper"])).toLowerCase();

    const cmap = { c1:"color-1", c2:"color-2", c3:"color-3", c4:"color-4", c5:"color-5" };
    const smap = { s1:"style-arch", s2:"style-flat", s3:"style-spot", arch:"style-arch", flat:"style-flat", spot:"style-spot" };
    const pmap = { f1:"paper-1", f2:"paper-2", f3:"paper-3" };

    body.classList.add(cmap[color] || color || "color-1");
    body.classList.add(smap[style] || "style-arch");
    body.classList.add(pmap[paper] || paper || "paper-1");
  }
}

function renderCard(row){
  const p = buildNormalizedPayload_(row || {});
  currentRow = p;

  applyThemeFromPayload_(p);

  const nameEl = qs("u-name");
  const unitWrap = qs("u-unit-wrap");
  const unitEl = qs("u-unit");
  const titleEl = qs("u-title");
  const sloganWrap = qs("u-slogan-wrap");
  const sloganEl = qs("u-slogan");

  const nameVal = text(pick(p, ["name","姓名"])) || "未命名";
  const unitVal = text(pick(p, ["unit","單位","公司"]));
  const titleVal = text(pick(p, ["title","職稱"]));
  const sloganVal = text(pick(p, ["slogan","一句話","簡介"]));

  if(nameEl) nameEl.textContent = nameVal;

  if(unitWrap && unitEl){
    unitWrap.style.display = unitVal ? "" : "none";
    unitEl.innerHTML = escapeHtmlWithBreaks_(unitVal);
  }

  if(titleEl) titleEl.textContent = titleVal;

  if(sloganWrap && sloganEl){
    sloganWrap.style.display = sloganVal ? "" : "none";
    sloganEl.innerHTML = escapeHtmlWithBreaks_(sloganVal);
  }

  renderAvatar_(p);
  renderLogo_(p);
  renderBlocks_(p);
  renderContactDock_(p);
  renderMediaDock_(p);
  renderCtaDock_(p);
  renderPhotoWall_(p);
  renderBottomQr_(p);

  const vt = qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;
}

async function submitLeadForm_(e){
  e.preventDefault();
  const form = e.currentTarget;
  if(!form) return;

  const btn = qs("leadSubmitBtn");
  const errorMsg = qs("leadErrorMsg");
  if(btn) btn.disabled = true;
  if(errorMsg){
    errorMsg.style.display = "none";
    errorMsg.textContent = "";
  }

  const name = text((qs("leadName") || {}).value);
  const phone = text((qs("leadPhone") || {}).value);
  const email = text((qs("leadEmail") || {}).value);
  const lineId = text((qs("leadLineId") || {}).value);
  const note = text((qs("leadNote") || {}).value);
  const ref = getSavedRef_();

  if(!name || !phone){
    if(errorMsg){
      errorMsg.style.display = "block";
      errorMsg.textContent = "請先填寫姓名與電話。";
    }
    if(btn) btn.disabled = false;
    return;
  }

  try{
    const payload = await fetchJsonRobust_(buildLeadCreateUrl_(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        customer_name: name,
        phone,
        email,
        line_id: lineId,
        note,
        referrer: ref || "",
        service_agent: ref || "SELF",
        agent_type: ref ? "service" : "self",
        source: ref ? "agent_form" : "form"
      })
    });

    const leadId = text(payload?.lead_id || payload?.id || payload?.data?.lead_id || payload?.item?.lead_id);
    if(!leadId) throw new Error("lead_id missing");

    currentLeadId = leadId;

    const success = qs("leadSuccess");
    const leadIdValue = qs("leadIdValue");
    if(leadIdValue) leadIdValue.textContent = leadId;
    if(success) success.style.display = "block";

    const copyBtn = qs("copyLeadBtn");
    if(copyBtn){
      copyBtn.onclick = ()=> copyText_(leadId, "✅ 已複製申請編號");
    }

    form.style.display = "none";
    alert("✅ 已收到申請");
  }catch(err){
    console.error(err);
    if(errorMsg){
      errorMsg.style.display = "block";
      errorMsg.textContent = "資料送出失敗，請稍後再試，或直接加入 LINE 官方帳號聯繫客服。";
    }
  }finally{
    if(btn) btn.disabled = false;
  }
}

function bindLeadForm_(){
  const form = qs("leadForm");
  if(form){
    form.addEventListener("submit", submitLeadForm_);
  }
}

function bindInstall_(){
  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener("appinstalled", ()=>{
    deferredInstallPrompt = null;
  });

  ["btnInstallCard","installFab"].forEach(id=>{
    const btn = qs(id);
    if(!btn) return;
    btn.addEventListener("click", async (e)=>{
      e.preventDefault();
      if(deferredInstallPrompt){
        try{
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice;
        }catch(err){
          console.error(err);
        }finally{
          deferredInstallPrompt = null;
        }
        return;
      }
      alert("請使用瀏覽器的『加入主畫面』或『安裝應用程式』功能。");
    });
  });
}

function bindHiddenAdminEntry_(){
  const hot = qs("adminHotspotBR");
  if(!hot || isCleanMode_()) return;

  let taps = 0;
  let firstTapAt = 0;
  let resetTimer = null;
  const WINDOW_MS = 1800;
  const NEED_TAPS = 5;

  function resetTapState(){
    taps = 0;
    firstTapAt = 0;
    if(resetTimer){
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  }

  function onTap(e){
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if(!firstTapAt || (now - firstTapAt > WINDOW_MS)){
      taps = 0;
      firstTapAt = now;
    }
    taps += 1;
    if(resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(resetTapState, WINDOW_MS + 120);
    if(taps >= NEED_TAPS){
      resetTapState();
      location.href = "./admin.html?v=" + encodeURIComponent(CONFIG.VERSION);
    }
  }

  hot.addEventListener("click", onTap, { passive:false });
  hot.addEventListener("touchstart", onTap, { passive:false });
}

async function boot_(){
  try{
    persistRefIfAny_();
    bindModalBasics_();
    bindLineButtons_();
    bindShareButtons_();
    bindLeadForm_();
    bindInstall_();
    bindHiddenAdminEntry_();

    const id = getIdFromUrl_();
    if(id){
      setCardMode_();
      const payload = await fetchJsonRobust_(buildCardApiUrl_(id));
      const row = payload?.item || payload?.data || payload;
      renderCard(row);
    }else{
      setHomeMode_();
    }
  }catch(err){
    console.error(err);
    if(!getIdFromUrl_()){
      setHomeMode_();
      return;
    }
    setCardMode_();
    const nameEl = qs("u-name");
    const unitEl = qs("u-unit");
    const titleEl = qs("u-title");
    if(nameEl) nameEl.textContent = "資料載入失敗";
    if(unitEl) unitEl.textContent = "請稍後再試";
    if(titleEl) titleEl.textContent = "";
  }
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });