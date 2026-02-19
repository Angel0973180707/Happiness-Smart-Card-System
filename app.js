
/* Angel Card PWA - V385.5_fix (Complete Overwrite)
 * Fix goal: JS zero errors -> all buttons clickable.
 * Features:
 * - Plan / color / layout / paper selection (saved to localStorage)
 * - Card preview (default / loaded via URL token or id)
 * - Contacts: LINE / WeChat / Tel / Email / Map
 * - Gallery with prev/next + lightbox
 * - Hidden Admin: click version text 3 times + password, then admin_list from GAS (if enabled)
 * - Copy share URL / copy id / copy token
 * - Service Worker register
 */
"use strict";

const APP = {
  VERSION: "385.5_fix",
  STORAGE_KEY: "angel_card_v385",
  GAS_URL: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  // ⚠️ If you already had a password in your old app.js, put it here.
  // Keeping a default (change anytime):
  ADMIN_PASS: "angel385",
  ADMIN_LIST_LIMIT: 50,
};

const state = {
  plan: "free",               // free | premium
  freeColor: "warm",          // warm | aurora | orange | mint | grape
  premiumBg: "champagne",     // 7 options
  layout: "classic",          // classic | compact | air
  paper: "smooth",            // smooth | linen | grain
  card: null,
  gallery: [],
  gIndex: 0,
  lastToken: "",
  lastId: "",
  debug: [],
};

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function logDebug(msg){
  state.debug.push(String(msg));
  const box = $("#debugBox");
  const pre = $("#debugText");
  if (!box || !pre) return;
  box.hidden = state.debug.length === 0;
  pre.textContent = state.debug.slice(-12).join("\n");
}

function safeJsonParse(str, fallback=null){
  try{ return JSON.parse(str); }catch(_){ return fallback; }
}

function loadPrefs(){
  const raw = localStorage.getItem(APP.STORAGE_KEY);
  const prefs = safeJsonParse(raw, {});
  if (!prefs) return;
  state.plan = prefs.plan || state.plan;
  state.freeColor = prefs.freeColor || state.freeColor;
  state.premiumBg = prefs.premiumBg || state.premiumBg;
  state.layout = prefs.layout || state.layout;
  state.paper = prefs.paper || state.paper;
}

function savePrefs(){
  const prefs = {
    plan: state.plan,
    freeColor: state.freeColor,
    premiumBg: state.premiumBg,
    layout: state.layout,
    paper: state.paper,
  };
  localStorage.setItem(APP.STORAGE_KEY, JSON.stringify(prefs));
}

function getUrlParams(){
  const u = new URL(location.href);
  return {
    token: u.searchParams.get("token") || u.searchParams.get("t") || "",
    id: u.searchParams.get("id") || "",
  };
}

function buildShareUrl(){
  const u = new URL(location.href);
  if (state.lastToken) u.searchParams.set("token", state.lastToken);
  if (state.lastId) u.searchParams.set("id", state.lastId);
  // keep cache busting out of share url
  u.searchParams.delete("v");
  return u.toString();
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast("已複製");
    return true;
  }catch(_){
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position="fixed";
    ta.style.left="-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try{
      document.execCommand("copy");
      toast("已複製");
      return true;
    }catch(e){
      toast("複製失敗");
      logDebug("copy fail: "+e);
      return false;
    }finally{
      ta.remove();
    }
  }
}

let toastTimer = null;
function toast(msg){
  let el = $("#toast");
  if(!el){
    el = document.createElement("div");
    el.id="toast";
    el.style.position="fixed";
    el.style.left="50%";
    el.style.bottom="18px";
    el.style.transform="translateX(-50%)";
    el.style.background="rgba(0,0,0,.72)";
    el.style.color="#fff";
    el.style.padding="10px 12px";
    el.style.borderRadius="14px";
    el.style.fontWeight="900";
    el.style.zIndex="9999";
    el.style.maxWidth="86vw";
    el.style.textAlign="center";
    el.style.backdropFilter="blur(10px)";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display="block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.style.display="none"; }, 1200);
}

function applyTheme(){
  // primary color is fixed for now; plan affects background flavor.
  document.body.dataset.plan = state.plan;

  // mark selected buttons
  $all(".segBtn[data-plan]").forEach(b=> b.classList.toggle("is-on", b.dataset.plan===state.plan));
  $all(".dot[data-free-color]").forEach(b=> b.classList.toggle("is-on", b.dataset.freeColor===state.freeColor));
  $all(".sw[data-premium-bg]").forEach(b=> b.classList.toggle("is-on", b.dataset.premiumBg===state.premiumBg));
  $all(".segBtn[data-layout]").forEach(b=> b.classList.toggle("is-on", b.dataset.layout===state.layout));
  $all(".segBtn[data-paper]").forEach(b=> b.classList.toggle("is-on", b.dataset.paper===state.paper));

  // subtle body background tweaks
  const root = document.documentElement;
  const map = {
    warm: ["#ee5253","#d63031"],
    aurora: ["#00a8ff","#0097e6"],
    orange: ["#f0932b","#e17055"],
    mint: ["#00b894","#00a884"],
    grape: ["#6c5ce7","#4834d4"],
  };
  const pick = map[state.freeColor] || map.warm;
  root.style.setProperty("--p", pick[0]);
  root.style.setProperty("--s", pick[1]);
}

function setDefaultCard(){
  // Default is your "小天使" card; can be overridden by API/card.json later.
  const placeholder = {
    id: "TW0000",
    token: "",
    status: "active",
    name: "小天使",
    title: "天使幸福智慧名片",
    tagline: "一點，就看見彼此的價值",
    avatar: "./icons/icon-512.png",
    line_url: "https://line.me/R/ti/p/@",   // replace with your OA if needed
    form_url: "#",                          // replace with your Google Form
    wechat: "",
    tel: "",
    email: "",
    map_url: "",
    gallery: ["./og-card.png"],
  };
  renderCard(placeholder);
}

function renderCard(card){
  state.card = card || state.card;

  const id = (card && card.id) ? String(card.id) : "TW----";
  const token = (card && card.token) ? String(card.token) : "";
  state.lastId = id;
  state.lastToken = token;

  $("#idBadge").textContent = id || "TW----";
  $("#name").textContent = card?.name || "小天使";
  $("#title").textContent = card?.title || "天使幸福智慧名片";
  $("#tagline").textContent = card?.tagline || "一點，就看見彼此的價值";

  const avatar = card?.avatar || "./icons/icon-512.png";
  $("#avatar").src = avatar;

  // links
  const lineUrl = card?.line_url || "https://line.me/R/ti/p/@";
  const formUrl = card?.form_url || "#";
  const btnLine = $("#btnLine");
  const btnForm = $("#btnForm");
  if (btnLine) btnLine.href = lineUrl;
  if (btnForm) btnForm.href = formUrl;

  // gallery
  const g = Array.isArray(card?.gallery) && card.gallery.length ? card.gallery : ["./og-card.png"];
  state.gallery = g.map(String);
  state.gIndex = 0;
  renderGallery();
}

function renderGallery(){
  const src = state.gallery[state.gIndex] || "./og-card.png";
  const gImg = $("#gImg");
  if (gImg) gImg.src = src;
}

function nextGallery(delta){
  if (!state.gallery.length) return;
  state.gIndex = (state.gIndex + delta + state.gallery.length) % state.gallery.length;
  renderGallery();
}

function openLightbox(){
  const lb = $("#lightbox");
  const img = $("#lbImg");
  if (!lb || !img) return;
  img.src = state.gallery[state.gIndex] || $("#gImg")?.src || "";
  lb.classList.add("is-on");
  lb.setAttribute("aria-hidden","false");
}

function closeLightbox(){
  const lb = $("#lightbox");
  if (!lb) return;
  lb.classList.remove("is-on");
  lb.setAttribute("aria-hidden","true");
}

function openUrl(url){
  if (!url) return;
  window.open(url, "_blank", "noopener");
}

function contactAction(action){
  const c = state.card || {};
  if (action==="tel"){
    if (!c.tel) return toast("未設定電話");
    location.href = "tel:" + String(c.tel).replace(/\s+/g,"");
    return;
  }
  if (action==="email"){
    if (!c.email) return toast("未設定 Email");
    location.href = "mailto:" + String(c.email);
    return;
  }
  if (action==="wechat"){
    // WeChat doesn't support universal deeplink well; copy it.
    const val = c.wechat || "";
    if (!val) return toast("未設定微信");
    copyText(String(val));
    toast("已複製微信ID");
    return;
  }
  if (action==="map"){
    const url = c.map_url || "";
    if (!url) return toast("未設定地圖");
    openUrl(String(url));
    return;
  }
}

async function fetchJson(url){
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

async function loadCardFromApi(){
  const {token, id} = getUrlParams();
  if (!token && !id) return false;

  const u = new URL(APP.GAS_URL);
  u.searchParams.set("action", "card");
  if (token) u.searchParams.set("token", token);
  if (id) u.searchParams.set("id", id);

  try{
    const data = await fetchJson(u.toString());
    if (!data || data.ok===false) throw new Error(data?.error || "API error");
    // accept either {card:{...}} or direct row
    const card = data.card || data.row || data;
    renderCard(card);
    return true;
  }catch(e){
    logDebug("API load fail: " + e);
    toast("載入名片失敗（使用預設小卡）");
    return false;
  }
}

function setPlan(plan){
  state.plan = plan;
  savePrefs();
  applyTheme();
}

function setFreeColor(c){
  state.freeColor = c;
  savePrefs();
  applyTheme();
}

function setPremiumBg(bg){
  state.premiumBg = bg;
  savePrefs();
  applyTheme();
}

function setLayout(layout){
  state.layout = layout;
  savePrefs();
  applyTheme();
}

function setPaper(paper){
  state.paper = paper;
  savePrefs();
  applyTheme();
}

function wireEvents(){
  // Delegation: one listener handles most clicks, preventing "buttons dead" due to binding timing.
  document.addEventListener("click", (ev) => {
    const t = ev.target;

    // plan
    const planBtn = t.closest?.(".segBtn[data-plan]");
    if (planBtn){
      setPlan(planBtn.dataset.plan);
      return;
    }

    // free color dots
    const dot = t.closest?.(".dot[data-free-color]");
    if (dot){
      setFreeColor(dot.dataset.freeColor);
      return;
    }

    // premium bg
    const sw = t.closest?.(".sw[data-premium-bg]");
    if (sw){
      setPremiumBg(sw.dataset.premiumBg);
      return;
    }

    // layout/paper
    const layoutBtn = t.closest?.(".segBtn[data-layout]");
    if (layoutBtn){
      setLayout(layoutBtn.dataset.layout);
      return;
    }
    const paperBtn = t.closest?.(".segBtn[data-paper]");
    if (paperBtn){
      setPaper(paperBtn.dataset.paper);
      return;
    }

    // contact icons
    const icon = t.closest?.(".iconBtn[data-action]");
    if (icon){
      contactAction(icon.dataset.action);
      return;
    }

    // gallery nav
    const gNav = t.closest?.(".gNav[data-g]");
    if (gNav){
      nextGallery(gNav.dataset.g === "next" ? 1 : -1);
      return;
    }

    // gallery open
    const gImg = t.closest?.("#gImg");
    if (gImg){
      openLightbox();
      return;
    }

    // lightbox close
    const lbClose = t.closest?.('[data-lb="close"]');
    if (lbClose){
      closeLightbox();
      return;
    }

    // admin open/close
    const adminClose = t.closest?.('[data-admin="close"]');
    if (adminClose){
      closeAdmin();
      return;
    }
  });

  // top actions
  $("#btnCopyShare")?.addEventListener("click", () => copyText(buildShareUrl()));
  $("#btnOpenCard")?.addEventListener("click", () => {
    // Scroll to preview card
    $("#card")?.scrollIntoView({behavior:"smooth", block:"center"});
  });

  $("#btnCopyId")?.addEventListener("click", () => copyText(state.lastId || ""));
  $("#btnCopyToken")?.addEventListener("click", () => copyText(state.lastToken || ""));

  $("#btnAdminCopyShare")?.addEventListener("click", () => copyText(buildShareUrl()));
  $("#btnAdminList")?.addEventListener("click", adminList);

  // hidden admin trigger: click version 3 times within 1.2s
  const ver = $("#ver");
  if (ver){
    let clicks = 0;
    let timer = null;
    ver.addEventListener("click", () => {
      clicks += 1;
      clearTimeout(timer);
      timer = setTimeout(()=>{ clicks = 0; }, 1200);
      if (clicks >= 3){
        clicks = 0;
        askAdminPassThenOpen();
      }
    }, {passive:true});
  }

  // Close lightbox with ESC
  document.addEventListener("keydown",(e)=>{
    if (e.key === "Escape"){
      closeLightbox();
      closeAdmin();
    }
  });
}

function openAdmin(){
  const el = $("#admin");
  if (!el) return;
  el.classList.add("is-on");
  el.setAttribute("aria-hidden","false");
}

function closeAdmin(){
  const el = $("#admin");
  if (!el) return;
  el.classList.remove("is-on");
  el.setAttribute("aria-hidden","true");
}

function askAdminPassThenOpen(){
  const pass = prompt("輸入後台密碼");
  if (pass === null) return;
  if (pass !== APP.ADMIN_PASS){
    toast("密碼錯誤");
    return;
  }
  openAdmin();
}

function rowHtml(row){
  const id = row.id || row.ID || row.card_id || "";
  const token = row.token || "";
  const status = row.status || "";
  const name = row.name || row.title || "";
  const url = new URL(location.href);
  url.searchParams.set("id", id);
  if (token) url.searchParams.set("token", token);
  url.searchParams.delete("v");
  const share = url.toString();

  return `
    <div class="rowItem">
      <div class="rowItemHd">
        <div class="rowItemId">${escapeHtml(id)} <span style="font-weight:700;color:#6b7280;">${escapeHtml(status)}</span></div>
        <div class="rowItemBtns">
          <button class="miniBtn" data-copy="${escapeAttr(share)}" type="button">複製交貨連結</button>
          <button class="miniBtn" data-open="${escapeAttr(share)}" type="button">開啟</button>
        </div>
      </div>
      <div class="rowItemMeta">token: ${escapeHtml(token)}<br>${escapeHtml(name)}</div>
    </div>
  `;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/"/g, "&quot;");
}

async function adminList(){
  const list = $("#adminList");
  if (!list) return;
  list.innerHTML = "<div class='rowItem'>載入中...</div>";

  const u = new URL(APP.GAS_URL);
  u.searchParams.set("action","admin_list");
  u.searchParams.set("limit", String(APP.ADMIN_LIST_LIMIT));

  try{
    const data = await fetchJson(u.toString());
    const rows = data.rows || data.data || [];
    if (!Array.isArray(rows)) throw new Error("rows not array");
    if (rows.length === 0){
      list.innerHTML = "<div class='rowItem'>（清單為空）</div>";
    }else{
      list.innerHTML = rows.map(rowHtml).join("");
    }

    // bind copy/open buttons in admin panel (simple)
    list.querySelectorAll("[data-copy]").forEach(btn=>{
      btn.addEventListener("click", ()=> copyText(btn.getAttribute("data-copy") || ""));
    });
    list.querySelectorAll("[data-open]").forEach(btn=>{
      btn.addEventListener("click", ()=> openUrl(btn.getAttribute("data-open") || ""));
    });

  }catch(e){
    list.innerHTML = "<div class='rowItem'>載入失敗（請確認 GAS admin_list 已啟用且允許 CORS）</div>";
    logDebug("admin_list fail: " + e);
  }
}

function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js?v=3855").catch(e=>logDebug("SW register fail: "+e));
}

function hardenTouchForiOS(){
  // iOS sometimes needs CSS pointer-events + prevent ghost clicks.
  // Here we only ensure buttons are not disabled by overlays.
  document.body.style.webkitTapHighlightColor = "transparent";
}

function boot(){
  try{
    loadPrefs();
    applyTheme();
    hardenTouchForiOS();
    setDefaultCard();
    wireEvents();
    registerSW();

    // try load from API (non-blocking)
    loadCardFromApi().then(()=>{ /* noop */ });

  }catch(e){
    // If anything goes wrong, show debug box so you can see the error quickly.
    logDebug("BOOT ERROR: " + e);
    $("#debugBox")?.removeAttribute("hidden");
  }
}

document.addEventListener("DOMContentLoaded", boot);
