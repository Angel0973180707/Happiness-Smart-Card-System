/**
 * Happiness Smart Card System - Frontend v1 (Complete Overwrite)
 * - Read GAS public endpoint: fixed TW0001 (小天使)
 * - Plan chooser A/B (stored)
 * - A: color/layout/paper controls -> facade changes immediately
 * - B: boutique color/style -> facade changes immediately
 * - Help modal: never stuck (hidden fix + overlay close using closest)
 * - Gallery: horizontal swipe + click full image viewer
 */

const FRONT_VERSION = 1;

// ✅ 你的 GAS（public / TW0001）
const API_BASE = "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";

// ✅ 你的 Google 表單（客人填寫）
const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

// localStorage keys
const STORAGE_KEY_PLAN = "ANGEL_CARD_PLAN"; // A / B
const STORAGE_KEY_A = "ANGEL_CARD_A_PREF";  // {color,layout,paper}
const STORAGE_KEY_B = "ANGEL_CARD_B_PREF";  // {bcolor,bstyle}

const els = {
  // plan
  planCards: Array.from(document.querySelectorAll(".planCard[data-plan]")),
  chosenPlan: document.getElementById("chosenPlan"),
  chosenNote: document.getElementById("chosenNote"),
  btnNext: document.getElementById("btnNext"),
  btnClear: document.getElementById("btnClear"),

  // panels
  panelA: document.getElementById("panelA"),
  panelB: document.getElementById("panelB"),

  // A controls
  aColorBtns: Array.from(document.querySelectorAll('[data-color]')),
  aLayoutBtns: Array.from(document.querySelectorAll('[data-layout]')),
  aPaperBtns: Array.from(document.querySelectorAll('[data-paper]')),

  // B controls
  bColorBtns: Array.from(document.querySelectorAll('[data-bcolor]')),
  bStyleBtns: Array.from(document.querySelectorAll('[data-bstyle]')),

  // facade
  facade: document.getElementById("facade"),
  logoImg: document.getElementById("logoImg"),
  avatarImg: document.getElementById("avatarImg"),
  nameText: document.getElementById("nameText"),
  orgText: document.getElementById("orgText"),
  sloganText: document.getElementById("sloganText"),
  servicesText: document.getElementById("servicesText"),
  titlesText: document.getElementById("titlesText"),
  gallery: document.getElementById("gallery"),
  videoLinks: document.getElementById("videoLinks"),
  socialLinks: document.getElementById("socialLinks"),
  btnLineOA: document.getElementById("btnLineOA"),
  btnLineDM: document.getElementById("btnLineDM"),
  btnEmail: document.getElementById("btnEmail"),
  btnPhone: document.getElementById("btnPhone"),
  qaBox: document.getElementById("qaBox"),

  // form buttons
  btnGoForm: document.getElementById("btnGoForm"),
  btnGoFormTop: document.getElementById("btnGoFormTop"),

  // help modal
  btnHelp: document.getElementById("btnHelp"),
  helpModal: document.getElementById("helpModal"),
  btnHelpClose: document.getElementById("btnHelpClose"),
  btnHelpOk: document.getElementById("btnHelpOk"),

  // viewer
  imgViewer: document.getElementById("imgViewer"),
  viewerImg: document.getElementById("viewerImg"),
  viewerCap: document.getElementById("viewerCap"),
};

// ---------- utils ----------
function safeText(v){
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function splitLines(v){
  const s = safeText(v);
  if (!s) return "";
  // allow \n or 、 or ; as separators
  return s
    .replace(/\\n/g, "\n")
    .replace(/[；;]/g, "\n")
    .replace(/[、]/g, "\n");
}

function parseUrls(v){
  const s = safeText(v);
  if (!s) return [];
  // allow comma-separated
  return s.split(",").map(x=>x.trim()).filter(Boolean);
}

function isHttp(url){
  return /^https?:\/\//i.test(url || "");
}

function driveToDirect(url){
  const u = safeText(url);
  if (!u) return "";

  // open?id=XXXX
  let m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // /file/d/XXXX/view
  m = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
  if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // already direct
  return u;
}

function buildLink(label, url){
  if (!isHttp(url)) return null;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = label;
  return a;
}

// ---------- plan + UI ----------
function setSelectedPlan(plan){
  // UI selected
  els.planCards.forEach(btn=>{
    const p = btn.getAttribute("data-plan");
    btn.classList.toggle("selected", p === plan);
    if (plan) btn.classList.remove("breathe");
  });

  if (!plan){
    els.chosenPlan.textContent = "尚未選擇";
    els.chosenNote.textContent = "請先點選上方其中一個方案（卡片會跳動提醒你）。";

    els.btnNext.classList.add("disabled");
    els.btnNext.classList.remove("breathe-soft");
    els.btnNext.setAttribute("aria-disabled","true");
    els.btnNext.textContent = "請先選一個方案 ↑";

    els.planCards.forEach(btn=>btn.classList.add("breathe"));

    els.panelA.hidden = true;
    els.panelB.hidden = true;

    localStorage.removeItem(STORAGE_KEY_PLAN);
    return;
  }

  localStorage.setItem(STORAGE_KEY_PLAN, plan);

  els.chosenPlan.textContent = plan === "A" ? "A｜自由搭配款" : "B｜精品設計款";
  els.chosenNote.innerHTML = `已選擇：<b>${plan === "A" ? "自由搭配款" : "精品設計款"}</b>。<br/>下一步填表時，請選擇相同方案（請記住）。`;

  els.btnNext.classList.remove("disabled");
  els.btnNext.classList.add("breathe-soft");
  els.btnNext.setAttribute("aria-disabled","false");
  els.btnNext.textContent = `下一步：前往填寫表單（填「${plan}」）`;

  // show panel + apply mode
  if (plan === "A"){
    els.panelA.hidden = false;
    els.panelB.hidden = true;
    applyModeA();
  } else {
    els.panelA.hidden = true;
    els.panelB.hidden = false;
    applyModeB();
  }
}

function goForm(){
  const plan = localStorage.getItem(STORAGE_KEY_PLAN) || "";
  if (!plan){
    alert("請先選一個方案（自由搭配款 / 精品設計款）。\n選版是參考，但要記住名稱，下一步填表要填同一個方案。");
    return;
  }
  window.location.href = FORM_URL;
}

// ---------- Apply styles ----------
function clearFacadeClass(prefix){
  const cls = Array.from(els.facade.classList);
  cls.forEach(c=>{
    if (c.startsWith(prefix)) els.facade.classList.remove(c);
  });
}

function applyAState(state){
  // theme
  clearFacadeClass("theme-");
  els.facade.classList.add(`theme-${state.color}`);

  // layout
  clearFacadeClass("layout-");
  els.facade.classList.add(`layout-${state.layout}`);

  // paper
  clearFacadeClass("paper-");
  els.facade.classList.add(`paper-${state.paper}`);

  // ensure not boutique mode
  els.facade.classList.remove("mode-boutique");
  clearFacadeClass("bstyle-");

  // make paper more obvious (you asked)
  document.documentElement.style.setProperty("--paperOpacity", state.paper === "watercolor" ? ".26" : ".24");
  document.documentElement.style.setProperty("--paperContrast", state.paper === "linen" ? "1.15" : "1.05");
}

function applyBState(state){
  // boutique mode on
  els.facade.classList.add("mode-boutique");

  // remove A theme/layout/paper impacts but keep nice
  clearFacadeClass("theme-");
  clearFacadeClass("layout-");

  // paper subtle in boutique (still exists but less)
  clearFacadeClass("paper-");
  els.facade.classList.add("paper-cotton");
  document.documentElement.style.setProperty("--paperOpacity", ".14");
  document.documentElement.style.setProperty("--paperContrast", "1.0");

  // boutique colors
  const map = {
    midnight: { bg:"#0b1220", accent:"#e9c46a" },
    cream: { bg:"#fff3e6", accent:"#1f2937" },
    sage: { bg:"#dfeee6", accent:"#0f172a" },
    inkblue: { bg:"#0b2a4a", accent:"#ffe08a" },
    sunset: { bg:"#ffe1cc", accent:"#0f172a" },
  };
  const picked = map[state.bcolor] || map.midnight;

  // set CSS vars for boutique background + accent
  els.facade.style.background = picked.bg;
  els.facade.style.setProperty("--b-bg", picked.bg);
  els.facade.style.setProperty("--b-accent", picked.accent);

  // boutique style class
  clearFacadeClass("bstyle-");
  els.facade.classList.add(`bstyle-${state.bstyle}`);
}

// ---------- init default states ----------
function getDefaultA(){
  return { color:"blue", layout:"elegant", paper:"cotton" };
}
function getDefaultB(){
  return { bcolor:"midnight", bstyle:"editorial" };
}

function loadA(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_A);
    if (!raw) return getDefaultA();
    const obj = JSON.parse(raw);
    return {
      color: obj.color || "blue",
      layout: obj.layout || "elegant",
      paper: obj.paper || "cotton"
    };
  }catch(_){ return getDefaultA(); }
}
function saveA(state){
  localStorage.setItem(STORAGE_KEY_A, JSON.stringify(state));
}

function loadB(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_B);
    if (!raw) return getDefaultB();
    const obj = JSON.parse(raw);
    return {
      bcolor: obj.bcolor || "midnight",
      bstyle: obj.bstyle || "editorial"
    };
  }catch(_){ return getDefaultB(); }
}
function saveB(state){
  localStorage.setItem(STORAGE_KEY_B, JSON.stringify(state));
}

function setActive(btns, key, val){
  btns.forEach(b=>{
    const v = b.getAttribute(key);
    b.classList.toggle("active", v === val);
  });
}

function applyModeA(){
  const st = loadA();
  setActive(els.aColorBtns, "data-color", st.color);
  setActive(els.aLayoutBtns, "data-layout", st.layout);
  setActive(els.aPaperBtns, "data-paper", st.paper);
  applyAState(st);
}

function applyModeB(){
  const st = loadB();
  setActive(els.bColorBtns, "data-bcolor", st.bcolor);
  setActive(els.bStyleBtns, "data-bstyle", st.bstyle);
  applyBState(st);
}

// ---------- modal ----------
function openHelp(){
  els.helpModal.hidden = false;
}
function closeHelp(){
  els.helpModal.hidden = true;
}

// viewer
function openViewer(src, cap){
  els.viewerImg.src = src;
  els.viewerCap.textContent = cap || "";
  els.imgViewer.hidden = false;
}
function closeViewer(){
  els.imgViewer.hidden = true;
  els.viewerImg.src = "";
  els.viewerCap.textContent = "";
}

// ---------- data render ----------
async function fetchPublic(){
  const url = `${API_BASE}?action=public&_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Fetch failed: " + res.status);
  return await res.json();
}

function renderFacade(data){
  // Map your sheet headers (Chinese)
  const name = safeText(data['姓名（名片大標題）']);
  const org  = safeText(data['單位名稱（如：幸福教養概念館）']);
  const slogan = safeText(data['理念標語（顯示在照片下方，精簡有力）']);
  const services = splitLines(data['服務項目（核心業務，多項可條列換行）']);
  const titles = splitLines(data['重要頭銜/獎銜（權威背書項目，多項可條列換行）']);

  const avatar = driveToDirect(safeText(data['個人專業形象照（名片主圖）']));
  const logo = driveToDirect(safeText(data['品牌 Logo（右上角小圖標）']));

  const galleryRaw = safeText(data['產品或品牌或活動照片最多3張（內容區插圖）']);
  const galleryUrls = parseUrls(galleryRaw).slice(0,3).map(driveToDirect).filter(isHttp);

  const yt1 = safeText(data['影音平台 1（如：YouTube或其他連結）']);
  const yt2 = safeText(data['影音平台 2（如：TikTok / 抖音或其他連結）']);
  const yt3 = safeText(data['影音平台 3（或地址）']);

  const so1 = safeText(data['社群平台 1（如：Facebook 粉絲專頁或其他連結）']);
  const so2 = safeText(data['社群平台 2（如：Instagram或其他連結）']);
  const so3 = safeText(data['社群平台 3（如：Thread / 部落格或其他連結）']);

  const lineDM = safeText(data['私訊 LINE 連結（第一行填連結，換行填line名稱）']);
  const lineOA = safeText(data['​LINE 官方帳號連結（綠色主按鈕）']);
  const email  = safeText(data['一鍵聯繫 Email']);
  const phone  = safeText(data['一鍵聯繫電話']);

  const q1 = safeText(data['客戶常見提問 1 (Q1)']);
  const a1 = safeText(data['專業解答 1 (A1)']);
  const q2 = safeText(data['客戶常見提問 2 (Q2)']);
  const a2 = safeText(data['專業解答2（A2）']);

  els.nameText.textContent = name || "（未填姓名）";
  els.orgText.textContent = org || "";
  els.sloganText.textContent = slogan || "";

  els.servicesText.textContent = services || "（未填）";
  els.titlesText.textContent = titles || "（未填）";

  // images
  if (isHttp(avatar)){
    els.avatarImg.src = avatar;
  } else {
    // fallback placeholder
    els.avatarImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
        <rect width="100%" height="100%" fill="#eef2ff"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="18">請上傳清晰照片</text>
      </svg>`
    );
  }

  if (isHttp(logo)){
    els.logoImg.hidden = false;
    els.logoImg.src = logo;
  } else {
    els.logoImg.hidden = true;
    els.logoImg.src = "";
  }

  // gallery
  els.gallery.innerHTML = "";
  if (!galleryUrls.length){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "（未提供產品/活動照片）";
    els.gallery.appendChild(empty);
  } else {
    galleryUrls.forEach((src, i)=>{
      const item = document.createElement("div");
      item.className = "gItem";
      item.innerHTML = `<img alt="photo${i+1}" src="${src}"><div class="gCap">圖片 ${i+1}</div>`;
      item.addEventListener("click", ()=>{
        openViewer(src, `圖片 ${i+1}`);
      });
      els.gallery.appendChild(item);
    });
  }

  // links
  els.videoLinks.innerHTML = "";
  [
    { label:"影音平台 1", url: yt1 },
    { label:"影音平台 2", url: yt2 },
    { label:"影音平台 3 / 地址", url: yt3 },
  ].forEach(x=>{
    const a = buildLink(x.label, x.url);
    if (a) els.videoLinks.appendChild(a);
  });
  if (!els.videoLinks.children.length){
    const t = document.createElement("div");
    t.className = "muted";
    t.textContent = "（未提供）";
    els.videoLinks.appendChild(t);
  }

  els.socialLinks.innerHTML = "";
  [
    { label:"社群平台 1", url: so1 },
    { label:"社群平台 2", url: so2 },
    { label:"社群平台 3", url: so3 },
  ].forEach(x=>{
    const a = buildLink(x.label, x.url);
    if (a) els.socialLinks.appendChild(a);
  });
  if (!els.socialLinks.children.length){
    const t = document.createElement("div");
    t.className = "muted";
    t.textContent = "（未提供）";
    els.socialLinks.appendChild(t);
  }

  // contact buttons
  els.btnLineOA.href = isHttp(lineOA) ? lineOA : "#";
  els.btnLineOA.style.opacity = isHttp(lineOA) ? "1" : ".45";
  els.btnLineOA.style.pointerEvents = isHttp(lineOA) ? "auto" : "none";

  // line DM: sometimes "link\nname"
  let dmLink = lineDM;
  if (lineDM.includes("\n")) dmLink = lineDM.split("\n")[0].trim();
  els.btnLineDM.href = isHttp(dmLink) ? dmLink : "#";
  els.btnLineDM.style.opacity = isHttp(dmLink) ? "1" : ".45";
  els.btnLineDM.style.pointerEvents = isHttp(dmLink) ? "auto" : "none";

  els.btnEmail.href = email ? `mailto:${email}` : "#";
  els.btnEmail.style.opacity = email ? "1" : ".45";
  els.btnEmail.style.pointerEvents = email ? "auto" : "none";

  els.btnPhone.href = phone ? `tel:${phone}` : "#";
  els.btnPhone.style.opacity = phone ? "1" : ".45";
  els.btnPhone.style.pointerEvents = phone ? "auto" : "none";

  // QA
  els.qaBox.innerHTML = "";
  const qa = [];
  if (q1 || a1) qa.push({q:q1 || "（未填）", a:a1 || ""});
  if (q2 || a2) qa.push({q:q2 || "（未填）", a:a2 || ""});

  if (!qa.length){
    const t = document.createElement("div");
    t.className = "muted";
    t.textContent = "（未提供）";
    els.qaBox.appendChild(t);
  } else {
    qa.forEach((x)=>{
      const box = document.createElement("div");
      box.className = "qaItem";
      box.innerHTML = `<div class="q">Q：${x.q}</div><div class="a">A：${x.a}</div>`;
      els.qaBox.appendChild(box);
    });
  }
}

// ---------- events ----------
function bind(){
  // plan card click
  els.planCards.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const plan = btn.getAttribute("data-plan");
      setSelectedPlan(plan);
    });
  });

  els.btnNext.addEventListener("click", ()=>{
    if (els.btnNext.classList.contains("disabled")) return;
    goForm();
  });

  els.btnClear.addEventListener("click", ()=>{
    setSelectedPlan("");
  });

  // form buttons
  els.btnGoForm.addEventListener("click", goForm);
  els.btnGoFormTop.addEventListener("click", goForm);

  // help
  els.btnHelp.addEventListener("click", openHelp);
  els.btnHelpClose.addEventListener("click", closeHelp);
  els.btnHelpOk.addEventListener("click", closeHelp);

  // ✅ overlay close (robust): use closest
  els.helpModal.addEventListener("click", (e)=>{
    const hit = e.target && e.target.closest && e.target.closest('[data-close="1"]');
    if (hit) closeHelp();
  });

  els.imgViewer.addEventListener("click", (e)=>{
    const hit = e.target && e.target.closest && e.target.closest('[data-close="1"]');
    if (hit) closeViewer();
  });

  // A controls
  els.aColorBtns.forEach(b=>{
    b.addEventListener("click", ()=>{
      const st = loadA();
      st.color = b.getAttribute("data-color");
      saveA(st);
      applyModeA();
    });
  });
  els.aLayoutBtns.forEach(b=>{
    b.addEventListener("click", ()=>{
      const st = loadA();
      st.layout = b.getAttribute("data-layout");
      saveA(st);
      applyModeA();
    });
  });
  els.aPaperBtns.forEach(b=>{
    b.addEventListener("click", ()=>{
      const st = loadA();
      st.paper = b.getAttribute("data-paper");
      saveA(st);
      applyModeA();
    });
  });

  // B controls
  els.bColorBtns.forEach(b=>{
    b.addEventListener("click", ()=>{
      const st = loadB();
      st.bcolor = b.getAttribute("data-bcolor");
      saveB(st);
      applyModeB();
    });
  });
  els.bStyleBtns.forEach(b=>{
    b.addEventListener("click", ()=>{
      const st = loadB();
      st.bstyle = b.getAttribute("data-bstyle");
      saveB(st);
      applyModeB();
    });
  });
}

// ---------- init ----------
async function init(){
  bind();

  // restore plan
  const savedPlan = localStorage.getItem(STORAGE_KEY_PLAN) || "";
  if (savedPlan){
    setSelectedPlan(savedPlan);
  } else {
    setSelectedPlan("");
  }

  // fetch demo data (TW0001)
  try{
    const json = await fetchPublic();
    if (!json || !json.ok || !json.data) throw new Error("Bad JSON");
    renderFacade(json.data);
  }catch(err){
    els.nameText.textContent = "載入失敗";
    els.orgText.textContent = "請檢查 GAS API";
    els.sloganText.textContent = String(err);
  }

  // register sw
  if ("serviceWorker" in navigator){
    try{ await navigator.serviceWorker.register("./sw.js"); }catch(_){}
  }
}

init();