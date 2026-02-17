/* Angel Smart Card Front v366 - FULL OVERWRITE
 * - Public facade preview reads fixed TW0001 from GAS (?action=public)
 * - Plan switching updates preview instantly (no reload)
 * - Free: 5 colors (light), 3 hero styles, 4 paper
 * - Premium: 7 colors (saturated), spotlight locked, glass cards
 * - Carousel: horizontal swipe + click to view full image
 * - Two small icons: "準備素材" + "Q&A" modals
 *
 * You can paste your GAS URL + Form URL below.
 */

const CONFIG = {
  VERSION: 366,
  BRAND_TITLE: "天使幸福智慧名片",
  BRAND_SUB: "成品預覽",
  // ✅ 你的 GAS 部署網址（你這支要支援 action=public）
  GAS_BASE: "https://script.google.com/macros/s/AKfycbxJYZB2F1AhkQ3Ch-LX85G7PhwBc5fc-fLHqpS5qEd2k9oeHbf4NFb0OnMGRm3GgTI/exec",
  // ✅ 客人填表的 Google 表單
  FORM_URL: "https://forms.gle/B13z5M2mwwv9ZKME8",
  PUBLIC_ACTION: "public",
  PUBLIC_FIXED_ID: "TW0001",
  STORAGE_KEY: "ANGEL_SMART_CARD_PREFS_V366",
};

const state = {
  plan: "free",               // free | premium
  free: {
    color: 1,                 // 1..5
    hero: "spotlight",        // arch | flat | spotlight (you want spotlight lock; still keep other two for free)
    paper: 2,                 // 1..4
  },
  premium: {
    color: 1,                 // 1..7
    layout: "spotlight",      // locked spotlight (future: arch/flat/spotlight variants)
    glass: true,
  },
  data: null,
};

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function savePrefs(){
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
    plan: state.plan,
    free: state.free,
    premium: state.premium,
  }));
}
function loadPrefs(){
  try{
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(!raw) return;
    const p = JSON.parse(raw);
    if(p && p.plan) state.plan = p.plan;
    if(p && p.free) state.free = Object.assign(state.free, p.free);
    if(p && p.premium) state.premium = Object.assign(state.premium, p.premium);
  }catch(e){}
}

function iconSvg(name){
  // tiny inline icons
  if(name==="bag"){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M7 9V7a5 5 0 0 1 10 0v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 9h12l1 12H5L6 9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }
  if(name==="qa"){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M7 9.5a4.5 4.5 0 0 1 9 0c0 3-4.5 2.5-4.5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M11.5 19.5h1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M21 12a9 9 0 1 1-4.2-7.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  if(name==="mail"){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4V6Z" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if(name==="phone"){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h4l2 5-3 2c1.3 2.6 3.4 4.7 6 6l2-3 5 2v4c0 1.1-.9 2-2 2C10.4 21 3 13.6 3 5c0-1.1.9-2 2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }
  if(name==="link"){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  return "";
}

function buildUI(){
  document.body.innerHTML = `
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          <div class="brandMark"></div>
          <div class="brandTitle">
            <b>${CONFIG.BRAND_TITLE}</b>
            <span>${CONFIG.BRAND_SUB} · v${CONFIG.VERSION}</span>
          </div>
        </div>
        <div class="topIcons">
          <button class="iconBtn" id="btnPrep" title="準備素材">${iconSvg("bag")}</button>
          <button class="iconBtn" id="btnQA" title="Q&A">${iconSvg("qa")}</button>
        </div>
      </div>

      <div class="grid">
        <!-- Left: chooser -->
        <div class="panel">
          <div class="panelHd">
            <h2>選方案</h2>
            <div class="mini">選完就會變</div>
          </div>

          <div class="planRow">
            <div class="planTabs">
              <div class="tab" data-plan="free">
                <b>自由搭配款</b>
                <span>清爽 / 直覺</span>
              </div>
              <div class="tab" data-plan="premium">
                <b>精品設計款</b>
                <span>飽滿 / 玻璃感</span>
              </div>
            </div>

            <div class="opts" id="optsFree"></div>
            <div class="opts" id="optsPremium" style="display:none;"></div>

            <div class="ctaRow">
              <button class="btn breatheSoft" id="btnGoForm">填表</button>
              <button class="btn btnGhost" id="btnReset">重設</button>
            </div>
          </div>
        </div>

        <!-- Right: preview -->
        <div class="panel">
          <div class="panelHd">
            <h2>成品預覽</h2>
            <div class="mini" id="miniHint">點左邊切換</div>
          </div>
          <div class="preview" id="preview"></div>
        </div>
      </div>

      <div class="foot">（示範資料：固定讀取小天使 TW0001）</div>
    </div>

    <!-- text modal -->
    <div class="modalMask" id="modalMask">
      <div class="modal" id="modalText" style="display:none;">
        <div class="modalHd">
          <b id="modalTitle"> </b>
          <button id="modalClose">✕</button>
        </div>
        <div class="modalBody" id="modalBody"></div>
      </div>

      <div class="modalImg" id="modalImg" style="display:none;">
        <div class="modalHd">
          <b id="imgTitle">圖片</b>
          <button id="imgClose">✕</button>
        </div>
        <div class="imgBox">
          <img id="imgBig" alt="preview"/>
        </div>
      </div>
    </div>
  `;

  injectOptionBlocks();
}

function injectOptionBlocks(){
  const free = $("#optsFree");
  const prem = $("#optsPremium");

  free.innerHTML = `
    <div class="optGroup">
      <div class="optTitle"><b>自由款｜顏色</b><span>淡版 5 色</span></div>
      <div class="pills" data-scope="free" data-key="color">
        ${[1,2,3,4,5].map(i=>`<div class="pill" data-val="${i}">色 ${i}</div>`).join("")}
      </div>
    </div>

    <div class="optGroup">
      <div class="optTitle"><b>自由款｜頭像區</b><span>3 版</span></div>
      <div class="pills" data-scope="free" data-key="hero">
        <div class="pill" data-val="arch">拱形</div>
        <div class="pill" data-val="flat">平直</div>
        <div class="pill" data-val="spotlight">聚光</div>
      </div>
    </div>

    <div class="optGroup">
      <div class="optTitle"><b>自由款｜紙感</b><span>4 種</span></div>
      <div class="pills" data-scope="free" data-key="paper">
        ${[1,2,3,4].map(i=>`<div class="pill" data-val="${i}">紙 ${i}</div>`).join("")}
      </div>
    </div>
  `;

  prem.innerHTML = `
    <div class="optGroup">
      <div class="optTitle"><b>精品款｜七色</b><span>濃版 7 色</span></div>
      <div class="pills" data-scope="premium" data-key="color">
        ${[1,2,3,4,5,6,7].map(i=>`<div class="pill" data-val="${i}">色 ${i}</div>`).join("")}
      </div>
    </div>

    <div class="optGroup">
      <div class="optTitle"><b>精品款｜排版</b><span>已鎖：中央聚光</span></div>
      <div class="pills" data-scope="premium" data-key="layout">
        <div class="pill active" data-val="spotlight">中央聚光</div>
      </div>
    </div>

    <div class="optGroup">
      <div class="optTitle"><b>精品款｜質感</b><span>玻璃感</span></div>
      <div class="pills" data-scope="premium" data-key="glass">
        <div class="pill active" data-val="true">開</div>
        <div class="pill" data-val="false">關</div>
      </div>
    </div>
  `;

  // bind pills
  $all(".pills").forEach(group=>{
    group.addEventListener("click", (ev)=>{
      const pill = ev.target.closest(".pill");
      if(!pill) return;
      const scope = group.dataset.scope;
      const key = group.dataset.key;
      const val = pill.dataset.val;

      if(scope === "free"){
        if(key === "color") state.free.color = parseInt(val,10);
        if(key === "hero") state.free.hero = val;
        if(key === "paper") state.free.paper = parseInt(val,10);
      }else{
        if(key === "color") state.premium.color = parseInt(val,10);
        if(key === "layout") state.premium.layout = val; // locked
        if(key === "glass") state.premium.glass = (val === "true");
      }
      savePrefs();
      refreshUI();
    });
  });

  // bind tabs
  $all(".tab").forEach(t=>{
    t.addEventListener("click", ()=>{
      state.plan = t.dataset.plan;
      savePrefs();
      refreshUI();
    });
  });

  // buttons
  $("#btnGoForm").addEventListener("click", ()=>{
    // no blocking overlay; direct open
    if(!CONFIG.FORM_URL) return toast("請先設定表單連結");
    window.location.href = CONFIG.FORM_URL;
  });
  $("#btnReset").addEventListener("click", ()=>{
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    state.plan = "free";
    state.free = { color: 1, hero: "spotlight", paper: 2 };
    state.premium = { color: 1, layout: "spotlight", glass: true };
    refreshUI();
  });

  // icon modals
  $("#btnPrep").addEventListener("click", ()=>openPrep());
  $("#btnQA").addEventListener("click", ()=>openQA());

  // modal closes
  $("#modalClose").addEventListener("click", closeModal);
  $("#imgClose").addEventListener("click", closeModal);
  $("#modalMask").addEventListener("click", (e)=>{
    if(e.target.id === "modalMask") closeModal();
  });
}

function refreshUI(){
  // tabs active + show correct option blocks
  $all(".tab").forEach(t=>t.classList.toggle("active", t.dataset.plan===state.plan));
  $("#optsFree").style.display = (state.plan==="free") ? "" : "none";
  $("#optsPremium").style.display = (state.plan==="premium") ? "" : "none";

  // mark active pills
  markPills("free","color", String(state.free.color));
  markPills("free","hero", state.free.hero);
  markPills("free","paper", String(state.free.paper));

  markPills("premium","color", String(state.premium.color));
  markPills("premium","layout", state.premium.layout);
  markPills("premium","glass", String(state.premium.glass));

  renderPreview();
}

function markPills(scope,key,val){
  $all(`.pills[data-scope="${scope}"][data-key="${key}"] .pill`).forEach(p=>{
    p.classList.toggle("active", p.dataset.val === val);
  });
}

function toast(msg){
  // super simple
  alert(msg);
}

/* -------------------------
   Data fetch
--------------------------*/
async function fetchPublic(){
  const url = new URL(CONFIG.GAS_BASE);
  url.searchParams.set("action", CONFIG.PUBLIC_ACTION);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();

  if(!json || !json.ok) throw new Error(json?.message || "Fetch failed");
  return json;
}

/* -------------------------
   Drive URL helpers
--------------------------*/
function extractDriveId(u){
  const s = String(u||"").trim();
  if(!s) return "";
  // open?id=XXXX
  let m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  // /d/XXXX/
  m = s.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if(m) return m[1];
  // file/d/XXXX/view
  m = s.match(/file\/d\/([a-zA-Z0-9_-]+)\//);
  if(m) return m[1];
  return "";
}

function toDirectImage(u){
  const s = String(u||"").trim();
  if(!s) return "";
  // if already normal image url
  if(/^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(s)) return s;

  const id = extractDriveId(s);
  if(id){
    // use uc export
    return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  return s; // fallback
}

function splitPhotos(s){
  const raw = String(s||"").trim();
  if(!raw) return [];
  // Google Form may store comma-separated urls
  return raw.split(",").map(x=>x.trim()).filter(Boolean).map(toDirectImage);
}

/* -------------------------
   Preview render
--------------------------*/
function renderPreview(){
  const root = $("#preview");
  const data = state.data?.data || {};

  // map your sheet headers (exact strings from your screenshot)
  const H = {
    name: '姓名（名片大標題）',
    org: '單位名稱（如：幸福教養概念館）',
    tagline: '理念標語（顯示在照片下方，精簡有力）',
    services: '服務項目（核心業務，多項可條列換行）',
    titles: '重要頭銜/獎銜（權威背書項目，多項可條列換行）',
    photo: '個人專業形象照（名片主圖）',
    photos: '產品或品牌或活動照片最多3張（內容區插圖）',
    logo: '品牌 Logo（右上角小圖標）',
    wechat: '微信 ID',
    v1: '影音平台 1（如：YouTube或其他連結）',
    v2: '影音平台 2（如：TikTok / 抖音或其他連結）',
    v3: '影音平台 3（或地址）',
    s1: '社群平台 1（如：Facebook 粉絲專頁或其他連結）',
    s2: '社群平台 2（如：Instagram或其他連結）',
    s3: '社群平台 3（如：Thread / 部落格或其他連結）',
    line: '私訊 LINE 連結（第一行填連結，換行填line名稱）',
    lineOA:'​LINE 官方帳號連結（綠色主按鈕）',
    email: '一鍵聯繫 Email',
    phone: '一鍵聯繫電話',
    q1:'客戶常見提問 1 (Q1)',
    a1:'專業解答 1 (A1)',
    q2:'客戶常見提問 2 (Q2)',
    a2:'專業解答2（A2）',
  };

  const name = String(data[H.name]||"").trim() || "（未填姓名）";
  const org = String(data[H.org]||"").trim();
  const tagline = String(data[H.tagline]||"").trim();
  const services = String(data[H.services]||"").trim();
  const titles = String(data[H.titles]||"").trim();
  const avatar = toDirectImage(data[H.photo]);
  const logo = toDirectImage(data[H.logo]);
  const wechat = String(data[H.wechat]||"").trim();
  const email = String(data[H.email]||"").trim();
  const phone = String(data[H.phone]||"").trim();

  const lineRaw = String(data[H.line]||"").trim();
  const lineParts = lineRaw.split("\n").map(x=>x.trim()).filter(Boolean);
  const lineLink = lineParts[0] || "";
  const lineName = lineParts[1] || "";

  const lineOA = String(data[H.lineOA]||"").trim();

  const links = [
    { label:"影音 1", url:String(data[H.v1]||"").trim() },
    { label:"影音 2", url:String(data[H.v2]||"").trim() },
    { label:"影音 3", url:String(data[H.v3]||"").trim() },
    { label:"社群 1", url:String(data[H.s1]||"").trim() },
    { label:"社群 2", url:String(data[H.s2]||"").trim() },
    { label:"社群 3", url:String(data[H.s3]||"").trim() },
  ].filter(x=>x.url);

  const photos = splitPhotos(data[H.photos]);

  // theme classes
  const planClass = (state.plan==="premium") ? "premium" : "free";

  let themeClass = "";
  if(state.plan==="free") themeClass = `theme-free-${state.free.color}`;
  else themeClass = `theme-prem-${state.premium.color}`;

  const paperClass = (state.plan==="free") ? `paper-${state.free.paper}` : "";
  const heroStyle = (state.plan==="free") ? state.free.hero : "spotlight"; // premium locked
  const heroClass = `hero ${heroStyle}`;

  // build html
  root.innerHTML = `
    <div class="previewCard ${planClass} ${themeClass} ${paperClass}" data-theme="1">
      <div class="${heroClass} spotlight">
        ${logo ? `<div class="logoSmall"><img src="${logo}" alt="logo"/></div>` : ``}

        <div class="avatarGlow"></div>
        <div class="avatarWrap">
          ${avatar ? `<img src="${avatar}" alt="avatar" onerror="this.style.display='none'"/>` : ``}
        </div>

        <div class="titleBlock">
          <div class="name">${escapeHtml(name)}</div>
          ${org ? `<div class="org">${escapeHtml(org)}</div>` : ``}
          ${tagline ? `<div class="tagline">${escapeHtml(tagline)}</div>` : ``}
        </div>
      </div>

      <div class="content">
        ${(services || titles) ? `
          <div class="glassCard">
            ${services ? `
              <div class="sec">
                <div class="secHd"><b>服務</b><span></span></div>
                <div class="lines">${escapeHtml(services)}</div>
              </div>` : ``}
            ${titles ? `
              <div class="sec" style="border-top:1px solid rgba(255,255,255,.10);">
                <div class="secHd"><b>頭銜</b><span></span></div>
                <div class="lines">${escapeHtml(titles)}</div>
              </div>` : ``}
          </div>
        ` : ``}

        ${(lineOA || lineLink || email || phone) ? `
          <div class="glassCard">
            <div class="sec">
              <div class="secHd"><b>一鍵聯繫</b><span></span></div>
              <div class="linkGrid">
                ${lineOA ? `<a class="linkBtn primary" href="${safeUrl(lineOA)}" target="_blank" rel="noreferrer">${iconSvg("link")} LINE 官方</a>` : ``}
                ${lineLink ? `<a class="linkBtn" href="${safeUrl(lineLink)}" target="_blank" rel="noreferrer">${iconSvg("link")} 私訊 LINE${lineName ? `（${escapeHtml(lineName)}）` : ``}</a>` : ``}
                ${email ? `<a class="linkBtn" href="mailto:${encodeURIComponent(email)}">${iconSvg("mail")} Email</a>` : ``}
                ${phone ? `<a class="linkBtn" href="tel:${escapeHtml(phone)}">${iconSvg("phone")} 電話</a>` : ``}
              </div>
              ${wechat ? `<div style="margin-top:10px;color:rgba(255,255,255,.78);font-size:12px;">微信：${escapeHtml(wechat)}</div>` : ``}
            </div>
          </div>
        ` : ``}

        ${links.length ? `
          <div class="glassCard">
            <div class="sec">
              <div class="secHd"><b>平台導航</b><span>${links.length} 個</span></div>
              <div class="linkGrid">
                ${links.map(x=>`<a class="linkBtn" href="${safeUrl(x.url)}" target="_blank" rel="noreferrer">${iconSvg("link")} ${escapeHtml(x.label)}</a>`).join("")}
              </div>
            </div>
          </div>
        ` : ``}

        ${photos.length ? `
          <div class="glassCard">
            <div class="secHd" style="padding:12px 12px 0;"><b>產品圖片</b><span>左右滑</span></div>
            <div class="carouselWrap">
              <div class="carousel">
                ${photos.map((u,idx)=>`
                  <div class="slide" data-img="${escapeAttr(u)}" data-title="圖片 ${idx+1}">
                    <img src="${escapeAttr(u)}" alt="photo ${idx+1}" onerror="this.style.display='none'"/>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        ` : ``}

        ${(data[H.q1] || data[H.a1] || data[H.q2] || data[H.a2]) ? `
          <div class="glassCard">
            <div class="sec">
              <div class="secHd"><b>Q&A</b><span></span></div>
              ${data[H.q1] ? `<div class="lines"><b>Q1</b> ${escapeHtml(String(data[H.q1]))}\n${data[H.a1] ? `<b>A1</b> ${escapeHtml(String(data[H.a1]))}` : ``}</div>` : ``}
              ${data[H.q2] ? `<div class="lines" style="margin-top:10px;"><b>Q2</b> ${escapeHtml(String(data[H.q2]))}\n${data[H.a2] ? `<b>A2</b> ${escapeHtml(String(data[H.a2]))}` : ``}</div>` : ``}
            </div>
          </div>
        ` : ``}
      </div>
    </div>
  `;

  // apply classes on container for CSS
  const card = $(".previewCard", root);
  if(card){
    card.classList.remove("free","premium");
    card.classList.add(planClass);

    // theme
    $all('[class*="theme-free-"]', card).forEach(()=>{});
    // just ensure theme class is present on card itself
    // remove old theme classes
    for(let i=1;i<=5;i++) card.classList.remove(`theme-free-${i}`);
    for(let i=1;i<=7;i++) card.classList.remove(`theme-prem-${i}`);
    if(state.plan==="free") card.classList.add(`theme-free-${state.free.color}`);
    else card.classList.add(`theme-prem-${state.premium.color}`);

    // paper
    for(let i=1;i<=4;i++) card.classList.remove(`paper-${i}`);
    if(state.plan==="free") card.classList.add(`paper-${state.free.paper}`);

    // hero
    const hero = $(".hero", card);
    if(hero){
      hero.classList.remove("arch","flat","spotlight");
      hero.classList.add(heroStyle);
      // always spotlight glow overlay on (you asked to lock spotlight feel)
      hero.classList.add("spotlight");
    }
  }

  // bind slides -> image modal
  $all(".slide", root).forEach(sl=>{
    sl.addEventListener("click", ()=>{
      const img = sl.dataset.img;
      const title = sl.dataset.title || "圖片";
      openImage(title, img);
    });
  });
}

function safeUrl(u){
  const s = String(u||"").trim();
  if(!s) return "#";
  // allow http(s) only
  if(/^https?:\/\//i.test(s)) return s;
  // if user pasted domain without protocol
  return "https://" + s.replace(/^\/+/, "");
}

function escapeHtml(str){
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}
function escapeAttr(str){ return escapeHtml(str).replaceAll("\n"," "); }

/* -------------------------
   Modals
--------------------------*/
function openModal(title, body){
  $("#modalTitle").textContent = title;
  $("#modalBody").textContent = body;
  $("#modalMask").classList.add("show");
  $("#modalText").style.display = "";
  $("#modalImg").style.display = "none";
}
function openImage(title, src){
  $("#imgTitle").textContent = title;
  $("#imgBig").src = src;
  $("#modalMask").classList.add("show");
  $("#modalImg").style.display = "";
  $("#modalText").style.display = "none";
}
function closeModal(){
  $("#modalMask").classList.remove("show");
  $("#modalText").style.display = "none";
  $("#modalImg").style.display = "none";
  $("#imgBig").src = "";
}

function openPrep(){
  // 超精簡：不講規格，只講「清晰、有就行」
  openModal(
    "準備素材",
`1) 一張清晰的個人照片（有就行）
2) Logo（有就放，沒有也可以）
3) 產品/活動照片（最多 3 張）
4) 平台連結（YouTube/抖音/IG/網站…）
5) 聯絡方式（LINE / Email / 電話）

精品款：如果你想更專業，我們也能協助轉檔/修圖（加購）。`
  );
}

function openQA(){
  openModal(
    "Q&A",
`這張不是「一般電子名片」，
它是你的「品牌入口」。

你可以把：
平台、聯絡方式、產品圖、常見問答
全部放在同一張門面裡。

網址丟到任何自介，
對方點進來就能看懂你是誰、做什麼、怎麼聯絡。`
  );
}

/* -------------------------
   Init
--------------------------*/
async function init(){
  loadPrefs();
  buildUI();
  refreshUI();

  // fetch preview data
  try{
    $("#miniHint").textContent = "載入中…";
    const json = await fetchPublic();
    state.data = json; // {ok, id, data}
    $("#miniHint").textContent = "點左邊切換";
    renderPreview();
  }catch(err){
    $("#miniHint").textContent = "資料載入失敗";
    openModal("載入失敗", `請檢查 GAS 部署網址是否正確，並確認支援 action=public。\n\n錯誤：${String(err.message || err)}`);
  }
}

init();