/* Angel Card PWA - V385.6_fix (Complete Overwrite)
 * Goals:
 * 1) Fix "buttons not working" by keeping JS zero-error + event delegation.
 * 2) Plan split:
 *    - Free: color dots (pink/blue/orange/purple/green) + layout (arch/flat/dawn) + paper (cotton_matte/fine_grain/linen)
 *    - Premium: premium_color p1~p7 only (no layout/paper interaction; hidden in UI)
 * 3) Load card data from GAS (including images) with robust field mapping + image URL normalization.
 * 4) Built-in big form (no jump to Google Form). Submit to GAS with graceful fallback.
 */
"use strict";

const APP = {
  VERSION: "385.6_fix",
  STORAGE_KEY: "angel_card_v385",
  GAS_URL: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  ADMIN_PASS: "angel385",
  ADMIN_LIST_LIMIT: 50,
};

const state = {
  plan: "free",                  // free | premium
  freeColor: "pink",             // pink | blue | orange | purple | green
  premiumColor: "p1",            // p1..p7
  layout: "arch",                // arch | flat | dawn
  paper: "cotton_matte",         // cotton_matte | fine_grain | linen
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
  const pre = $("#debugText");
  const box = $("#debugBox");
  if (!pre || !box) return;
  pre.textContent = state.debug.slice(-30).join("\n");
  box.hidden = false;
}

let toastTimer = null;
function toast(msg){
  let el = $("#toast");
  if (!el){
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

function savePrefs(){
  const v = {
    plan: state.plan,
    freeColor: state.freeColor,
    premiumColor: state.premiumColor,
    layout: state.layout,
    paper: state.paper,
  };
  localStorage.setItem(APP.STORAGE_KEY, JSON.stringify(v));
}

function loadPrefs(){
  try{
    const raw = localStorage.getItem(APP.STORAGE_KEY);
    if (!raw) return;
    const v = JSON.parse(raw);
    if (v.plan) state.plan = v.plan;
    if (v.freeColor) state.freeColor = v.freeColor;
    if (v.premiumColor) state.premiumColor = v.premiumColor;
    if (v.layout) state.layout = v.layout;
    if (v.paper) state.paper = v.paper;
  }catch(e){}
}

function applyTheme(){
  document.body.dataset.plan = state.plan;

  $all(".segBtn[data-plan]").forEach(b=> b.classList.toggle("is-on", b.dataset.plan===state.plan));
  $all(".dot[data-free-color]").forEach(b=> b.classList.toggle("is-on", b.dataset.freeColor===state.freeColor));
  $all(".segBtn[data-layout]").forEach(b=> b.classList.toggle("is-on", b.dataset.layout===state.layout));
  $all(".segBtn[data-paper]").forEach(b=> b.classList.toggle("is-on", b.dataset.paper===state.paper));
  $all(".sw[data-premium-color]").forEach(b=> b.classList.toggle("is-on", b.dataset.premiumColor===state.premiumColor));

  document.body.dataset.freeColor = state.freeColor;
  document.body.dataset.premiumColor = state.premiumColor;
  document.body.dataset.layout = state.layout;
  document.body.dataset.paper = state.paper;
}

function setPlan(plan){
  state.plan = (plan==="premium") ? "premium" : "free";
  savePrefs(); applyTheme();
}
function setFreeColor(c){ state.freeColor=c; savePrefs(); applyTheme(); }
function setPremiumColor(c){ state.premiumColor=c; savePrefs(); applyTheme(); }
function setLayout(l){ state.layout=l; savePrefs(); applyTheme(); }
function setPaper(p){ state.paper=p; savePrefs(); applyTheme(); }

function openUrl(url){
  try{ window.open(url, "_blank", "noopener"); }catch(e){ location.href = url; }
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand("copy"); }catch(_){}
    ta.remove();
    return true;
  }
}

function getUrlParams(){
  const u = new URL(location.href);
  return { token: u.searchParams.get("token") || "", id: u.searchParams.get("id") || "" };
}

/* -------- Image URL normalization -------- */
function normalizeDriveUrl(u){
  const url = String(u||"").trim();
  if (!url) return "";
  const m1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m1) return "https://drive.google.com/uc?export=view&id=" + m1[1];
  const m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (m2) return "https://drive.google.com/uc?export=view&id=" + m2[1];
  const m3 = url.match(/drive\.google\.com\/uc\?id=([^&]+)/);
  if (m3) return "https://drive.google.com/uc?export=view&id=" + m3[1];
  return url;
}

function parseGallery(val){
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  const s = String(val).trim();
  if (!s) return [];
  return s.split(/\n|\||,|；|;/).map(x=>x.trim()).filter(Boolean);
}

function pickFirst(obj, keys){
  for (const k of keys){
    if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return "";
}

function normalizeCard(raw){
  const c = raw || {};
  const card = {
    id: pickFirst(c, ["id","ID","Id"]),
    token: pickFirst(c, ["token","Token"]),
    status: pickFirst(c, ["status","Status"]),
    name: pickFirst(c, ["name","姓名","暱稱"]),
    title: pickFirst(c, ["title","頭銜","定位","position"]),
    tagline: pickFirst(c, ["tagline","slogan","引言","一句話"]),
    phone: pickFirst(c, ["phone","tel","電話"]),
    email: pickFirst(c, ["email","Email","信箱"]),
    line: pickFirst(c, ["line","line_id","LINE","lineUrl","line_url"]),
    wechat: pickFirst(c, ["wechat","wechat_id","WeChat","微信"]),
    map_url: pickFirst(c, ["map_url","map","地圖","mapUrl"]),
    avatar: pickFirst(c, ["avatar","avatar_url","photo","頭像","image"]),
    gallery: [],
  };

  const g1 = pickFirst(c, ["gallery","gallery_urls","images","作品圖"]);
  let g = parseGallery(g1);
  for (let i=1;i<=12;i++){
    const v = pickFirst(c, [`gallery_${i}`, `gallery${i}`, `img${i}`, `image${i}`]);
    if (v) g.push(String(v));
  }

  card.avatar = normalizeDriveUrl(card.avatar) || "./icons/icon-512.png";
  card.gallery = Array.from(new Set(g.map(normalizeDriveUrl))).filter(Boolean);
  return card;
}

/* -------- Render Card -------- */
function renderCard(raw){
  const card = normalizeCard(raw);
  state.card = card;

  const id = card.id ? String(card.id) : "TW----";
  const token = card.token ? String(card.token) : "";
  state.lastId = id;
  state.lastToken = token;

  const idBadge = $("#idBadge");
  if (idBadge) idBadge.textContent = id;

  $("#name").textContent = card.name || "小天使";
  $("#title").textContent = card.title || "天使幸福智慧名片";
  $("#tagline").textContent = card.tagline || "一點，就看見彼此的價值";

  const avatarEl = $("#avatar");
  if (avatarEl) avatarEl.src = card.avatar || "./icons/icon-512.png";

  // gallery
  state.gallery = (card.gallery && card.gallery.length) ? card.gallery : ["./og-card.png"];
  state.gIndex = 0;
  renderGallery();

  // version text in card foot (for admin tap)
  const ver = $("#ver");
  if (ver) ver.textContent = "V" + APP.VERSION;
}

function renderGallery(){
  const img = $("#gImg");
  if (!img) return;
  const total = state.gallery.length;
  const i = Math.max(0, Math.min(state.gIndex, total-1));
  state.gIndex = i;
  img.src = state.gallery[i];
}

function openLightbox(){
  const lb = $("#lightbox");
  const lbImg = $("#lbImg");
  if (!lb || !lbImg) return;
  lbImg.src = state.gallery[state.gIndex] || "./og-card.png";
  lb.classList.add("is-on");
  lb.setAttribute("aria-hidden","false");
}
function closeLightbox(){
  const lb = $("#lightbox");
  if (!lb) return;
  lb.classList.remove("is-on");
  lb.setAttribute("aria-hidden","true");
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
    const raw = data.card || data.row || data.data || data;
    renderCard(raw);
    return true;
  }catch(e){
    logDebug("API load fail: " + e);
    toast("載入名片失敗（使用預設小卡）");
    return false;
  }
}

/* -------- Built-in Form -------- */
function openForm(){
  const modal = $("#formModal");
  const form = $("#cardForm");
  if (!modal || !form) return;

  form.plan.value = state.plan;
  form.free_color.value = state.freeColor;
  form.layout.value = state.layout;
  form.paper.value = state.paper;
  form.premium_color.value = state.premiumColor;

  const c = state.card || {};
  form.name.value = c.name || "";
  form.title.value = c.title || "";
  form.tagline.value = c.tagline || "";
  form.phone.value = c.phone || "";
  form.email.value = c.email || "";
  form.line.value = c.line || "";
  form.wechat.value = c.wechat || "";
  form.map_url.value = c.map_url || "";
  form.avatar.value = (c.avatar && !c.avatar.includes("./icons/")) ? c.avatar : "";
  form.gallery.value = (c.gallery && c.gallery.length) ? c.gallery.join("\n") : "";

  modal.hidden = false;
}

function closeForm(){
  const modal = $("#formModal");
  if (modal) modal.hidden = true;
}

function setFormHint(msg){
  const el = $("#formHint");
  if (!el) return;
  el.textContent = msg || "";
}

async function submitToGAS(payload){
  // 1) Try POST JSON (requires GAS doPost)
  try{
    const r = await fetch(APP.GAS_URL + "?action=submit", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(()=>null);
    if (r.ok && j && j.ok!==false) return j;
  }catch(e){
    logDebug("POST submit fail: " + e);
  }

  // 2) Fallback GET query
  try{
    const u = new URL(APP.GAS_URL);
    u.searchParams.set("action","submit");
    Object.entries(payload).forEach(([k,v])=>{
      if (v==null) return;
      const s = String(v).trim();
      if (!s) return;
      u.searchParams.set(k, s);
    });
    const j = await fetchJson(u.toString());
    if (j && j.ok!==false) return j;
  }catch(e){
    logDebug("GET submit fail: " + e);
  }

  throw new Error("submit_failed");
}

/* -------- Contact Actions -------- */
function handleContact(action){
  const c = state.card || {};
  const phone = c.phone || "";
  const email = c.email || "";
  const line = c.line || c.line_url || "";
  const wechat = c.wechat || "";
  const map = c.map_url || "";

  if (action==="line"){
    if (!line) return toast("未設定 LINE");
    if (/^https?:\/\//i.test(line)) openUrl(line);
    else openUrl("https://line.me/R/ti/p/" + encodeURIComponent(line.replace(/^@/,"@")));
    return;
  }
  if (action==="wechat"){
    if (!wechat) return toast("未設定微信");
    copyText(wechat).then(()=>toast("已複製微信ID"));
    return;
  }
  if (action==="tel"){
    if (!phone) return toast("未設定電話");
    location.href = "tel:" + phone.replace(/\s/g,"");
    return;
  }
  if (action==="email"){
    if (!email) return toast("未設定 Email");
    location.href = "mailto:" + email;
    return;
  }
  if (action==="map"){
    if (!map) return toast("未設定地圖");
    openUrl(map);
    return;
  }
}

/* -------- Hidden Admin -------- */
let adminTap = 0;
let adminTapTimer = null;

function onVersionTap(){
  adminTap += 1;
  clearTimeout(adminTapTimer);
  adminTapTimer = setTimeout(()=>{ adminTap=0; }, 900);
  if (adminTap >= 3){
    adminTap = 0;
    openAdmin();
  }
}

async function openAdmin(){
  const pass = prompt("後台密碼：");
  if (!pass) return;
  if (String(pass) !== String(APP.ADMIN_PASS)){
    toast("密碼錯誤");
    return;
  }
  toast("載入後台…");
  const u = new URL(APP.GAS_URL);
  u.searchParams.set("action","admin_list");
  u.searchParams.set("key", APP.ADMIN_PASS);
  u.searchParams.set("limit", String(APP.ADMIN_LIST_LIMIT));
  try{
    const data = await fetchJson(u.toString());
    const list = data.rows || data.list || [];
    showAdminList(list);
  }catch(e){
    logDebug("admin fail: "+e);
    toast("後台載入失敗");
  }
}

function showAdminList(list){
  const panel = $("#admin");
  const box = $("#adminList");
  if (!panel || !box) return toast("後台區塊不存在");
  box.innerHTML = "";
  if (!Array.isArray(list) || list.length===0){
    box.innerHTML = `<div class="empty">沒有資料</div>`;
  }else{
    const frag = document.createDocumentFragment();
    list.forEach((row)=>{
      const c = normalizeCard(row);
      const div = document.createElement("div");
      div.className = "adminItem";
      div.innerHTML = `
        <div class="adminMeta">
          <div class="adminId">${c.id || ""}</div>
          <div class="adminName">${c.name || ""}</div>
        </div>
        <div class="adminBtns">
          <button class="btn ghost mini" data-admin="copy_share" data-id="${encodeURIComponent(c.id||"")}" data-token="${encodeURIComponent(c.token||"")}">複製交貨連結</button>
          <button class="btn ghost mini" data-admin="open" data-id="${encodeURIComponent(c.id||"")}" data-token="${encodeURIComponent(c.token||"")}">開啟</button>
        </div>
      `;
      frag.appendChild(div);
    });
    box.appendChild(frag);
  }
  panel.classList.add("is-on");
  panel.setAttribute("aria-hidden","false");
}

function closeAdmin(){
  const panel = $("#admin");
  if (panel){
    panel.classList.remove("is-on");
    panel.setAttribute("aria-hidden","true");
  }
}

/* -------- Share URL -------- */
function makeShareUrl(){
  const base = location.origin + location.pathname;
  const params = new URLSearchParams();
  if (state.lastToken) params.set("token", state.lastToken);
  else if (state.lastId) params.set("id", state.lastId);
  const q = params.toString();
  return q ? (base + "?" + q) : base;
}

/* -------- Wire Events -------- */
function wireEvents(){
  document.addEventListener("click", (ev)=>{
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

    // premium color buttons
    const sw = t.closest?.(".sw[data-premium-color]");
    if (sw){
      setPremiumColor(sw.dataset.premiumColor);
      return;
    }

    // layout
    const lay = t.closest?.(".segBtn[data-layout]");
    if (lay){
      setLayout(lay.dataset.layout);
      return;
    }

    // paper
    const pap = t.closest?.(".segBtn[data-paper]");
    if (pap){
      setPaper(pap.dataset.paper);
      return;
    }

    // top buttons
    if (t.id==="btnCopyShare"){
      copyText(makeShareUrl()).then(()=>toast("已複製名片網址"));
      return;
    }
    if (t.id==="btnOpenCard"){
      openUrl(makeShareUrl());
      return;
    }

    // form open/close
    if (t.id==="btnForm"){
      openForm();
      return;
    }
    if (t.dataset.close==="form"){
      closeForm();
      return;
    }

    // lightbox
    if (t.id==="gImg"){
      openLightbox();
      return;
    }
    if (t.dataset.lb==="close"){
      closeLightbox();
      return;
    }

    // gallery nav
    const gnav = t.closest?.("[data-g]");
    if (gnav){
      const dir = gnav.dataset.g;
      if (dir==="prev"){
        state.gIndex = (state.gIndex - 1 + state.gallery.length) % state.gallery.length;
      }else if (dir==="next"){
        state.gIndex = (state.gIndex + 1) % state.gallery.length;
      }
      renderGallery();
      return;
    }

    // contacts
    const act = t.closest?.("[data-action]");
    if (act){
      handleContact(act.dataset.action);
      return;
    }

    // version triple tap
    if (t.id==="ver"){
      onVersionTap();
      return;
    }

    // admin open/close
    if (t.dataset.admin==="close"){
      closeAdmin();
      return;
    }
    if (t.id==="btnAdminList"){
      openAdmin();
      return;
    }
    if (t.id==="btnAdminCopyShare"){
      copyText(makeShareUrl()).then(()=>toast("已複製目前交貨連結"));
      return;
    }
    const adminBtn = t.closest?.("button[data-admin]");
    if (adminBtn){
      const action = adminBtn.dataset.admin;
      const id = decodeURIComponent(adminBtn.dataset.id||"");
      const token = decodeURIComponent(adminBtn.dataset.token||"");
      if (action==="copy_share"){
        const base = location.origin + location.pathname;
        const u = new URL(base);
        if (token) u.searchParams.set("token", token);
        else if (id) u.searchParams.set("id", id);
        copyText(u.toString()).then(()=>toast("已複製交貨連結"));
      }else if (action==="open"){
        const base = location.origin + location.pathname;
        const u = new URL(base);
        if (token) u.searchParams.set("token", token);
        else if (id) u.searchParams.set("id", id);
        openUrl(u.toString());
      }
      return;
    }
  });

  // built-in form submit
  const form = $("#cardForm");
  if (form){
    form.addEventListener("submit", async (ev)=>{
      ev.preventDefault();
      setFormHint("送出中…");
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());

      payload.plan = state.plan;
      payload.free_color = state.freeColor;
      payload.layout = state.layout;
      payload.paper = state.paper;
      payload.premium_color = state.premiumColor;

      const gallery = parseGallery(payload.gallery);
      payload.gallery = gallery.join("|");

      try{
        const res = await submitToGAS(payload);
        if (res && (res.id || res.token)){
          state.lastId = res.id || state.lastId;
          state.lastToken = res.token || state.lastToken;
          const idBadge = $("#idBadge");
          if (idBadge) idBadge.textContent = state.lastId;
        }
        setFormHint("✅ 已送出！你可以按「一鍵複製名片網址」交給客戶。");
        toast("送出完成");
        closeForm();
      }catch(e){
        logDebug("submit error: " + e);
        setFormHint("❌ 送出失敗：請確認 GAS 有開啟 submit（doPost 或 doGet action=submit）。");
        toast("送出失敗");
      }
    });
  }
}

/* -------- SW -------- */
function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js?v=3856").catch(()=>{});
}

/* -------- Init -------- */
async function init(){
  try{
    loadPrefs();
    applyTheme();
    wireEvents();
    registerSW();

    // default card baseline
    renderCard({
      id: "TW----",
      name: "小天使",
      title: "天使幸福智慧名片",
      tagline: "一點，就看見彼此的價值",
      avatar: "./icons/icon-512.png",
      gallery: ["./og-card.png"],
    });

    await loadCardFromApi();
  }catch(e){
    console.error(e);
    logDebug("init fail: " + e);
  }
}

document.addEventListener("DOMContentLoaded", init);
