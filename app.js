/* Angel Smart Card Frontend v1 (Complete Overwrite)
 * - Plan chooser A/B with breathe guidance
 * - Public facade reads fixed TW0001 via GAS ?action=public
 * - A: color/layout/paper (v358-like)
 * - B: premium design layout variation
 * - Product images carousel (swipe) + full image viewer
 * - Help modal: what to prepare
 */

const VERSION = "front-v1";

// ✅ GAS exec（若你換部署網址，只改這一行）
const API_BASE = "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";

// ✅ 你的新表單
const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

// localStorage keys
const STORAGE_PLAN = "ANGEL_CARD_PLAN";
const STORAGE_A = "ANGEL_CARD_PREF_A";
const STORAGE_B = "ANGEL_CARD_PREF_B";

// DOM
const els = {
  planCards: Array.from(document.querySelectorAll(".planCard[data-plan]")),
  chosenPlan: document.getElementById("chosenPlan"),
  chosenNote: document.getElementById("chosenNote"),
  btnNext: document.getElementById("btnNext"),
  btnClear: document.getElementById("btnClear"),

  panelA: document.getElementById("panelA"),
  panelB: document.getElementById("panelB"),

  chipColors: document.getElementById("chipColors"),
  chipLayouts: document.getElementById("chipLayouts"),
  chipPapers: document.getElementById("chipPapers"),
  premiumSwatches: document.getElementById("premiumSwatches"),

  facade: document.getElementById("facade"),

  btnHelp: document.getElementById("btnHelp"),
  helpModal: document.getElementById("helpModal"),

  imgViewer: document.getElementById("imgViewer"),
  viewerImg: document.getElementById("viewerImg"),
};

// defaults
const A_DEFAULT = { color: "ocean", layout: "elegant", paper: "cotton" };
const B_DEFAULT = { premium: "noir" };

function safeText(v){
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function splitLines(v){
  const s = safeText(v);
  if (!s) return [];
  // Allow both \n and commas for user convenience
  const parts = s
    .replace(/\r/g, "")
    .split(/\n|，|,/)
    .map(x => x.trim())
    .filter(Boolean);
  return parts;
}

function splitUrls(v){
  const s = safeText(v);
  if (!s) return [];
  return s
    .split(/\s*,\s*|\n+/g)
    .map(x => x.trim())
    .filter(Boolean);
}

function getPrefA(){
  try{
    const raw = localStorage.getItem(STORAGE_A);
    if (!raw) return { ...A_DEFAULT };
    const obj = JSON.parse(raw);
    return { ...A_DEFAULT, ...obj };
  }catch(e){
    return { ...A_DEFAULT };
  }
}

function setPrefA(p){
  localStorage.setItem(STORAGE_A, JSON.stringify(p));
}

function getPrefB(){
  try{
    const raw = localStorage.getItem(STORAGE_B);
    if (!raw) return { ...B_DEFAULT };
    const obj = JSON.parse(raw);
    return { ...B_DEFAULT, ...obj };
  }catch(e){
    return { ...B_DEFAULT };
  }
}

function setPrefB(p){
  localStorage.setItem(STORAGE_B, JSON.stringify(p));
}

function setSelectedPlan(plan){
  // UI selection
  els.planCards.forEach(btn => {
    const p = btn.getAttribute("data-plan");
    btn.classList.toggle("selected", p === plan);
    if (plan) btn.classList.remove("breathe");
  });

  // show panels
  els.panelA.hidden = plan !== "A-自由搭配款";
  els.panelB.hidden = plan !== "B-精品設計款";

  if (!plan){
    els.chosenPlan.textContent = "尚未選擇";
    els.chosenNote.textContent = "請先點選上方其中一個版型（版型卡片會跳動提醒你）。";

    els.btnNext.classList.add("disabled");
    els.btnNext.classList.remove("breathe-soft");
    els.btnNext.setAttribute("aria-disabled", "true");
    els.btnNext.textContent = "請先選一個版型 ↑";

    els.planCards.forEach(btn => btn.classList.add("breathe"));
    localStorage.removeItem(STORAGE_PLAN);

    // re-render as neutral (use A defaults)
    renderFacade();
    return;
  }

  localStorage.setItem(STORAGE_PLAN, plan);

  els.chosenPlan.textContent = plan;
  els.chosenNote.innerHTML = `已選擇：<b>${plan}</b>。<br/>下一步填表時，請選擇相同版型名稱（請記住）。`;

  els.btnNext.classList.remove("disabled");
  els.btnNext.classList.add("breathe-soft");
  els.btnNext.setAttribute("aria-disabled", "false");
  els.btnNext.textContent = `下一步：前往填寫表單（填「${plan}」）`;

  // stop breathing for all plan cards
  els.planCards.forEach(btn => btn.classList.remove("breathe"));

  // render facade with this plan
  renderFacade();
}

function goForm(){
  const plan = localStorage.getItem(STORAGE_PLAN) || "";
  if (!plan){
    alert("請先選一個版型（A-自由搭配款 / B-精品設計款）。\n選版是參考，但需要記住名稱，下一步填表要填一樣的款式。");
    return;
  }
  window.location.href = FORM_URL;
}

async function fetchPublic(){
  const url = `${API_BASE}?action=public&t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("API error: " + res.status);
  const j = await res.json();
  if (!j || !j.ok) throw new Error(j && j.message ? j.message : "API not ok");
  return j.data || {};
}

/* ---------- Facade Rendering ---------- */

function getActiveTheme(){
  const plan = localStorage.getItem(STORAGE_PLAN) || "";
  if (plan === "B-精品設計款"){
    return { plan, ...getPrefB() };
  }
  // default to A theme even if not selected
  return { plan: "A-自由搭配款", ...getPrefA() };
}

function colorTokens(color){
  switch(color){
    case "sunrise": return { a:"#ff6b6b", b:"#ee5253" };
    case "mango": return { a:"#ffb545", b:"#f0932b" };
    case "grape": return { a:"#7c6cff", b:"#5b54d6" };
    case "leaf": return { a:"#5ac878", b:"#2fb65d" };
    case "ocean":
    default: return { a:"#4da3ff", b:"#2d6cdf" };
  }
}

function paperClass(paper){
  switch(paper){
    case "grain": return "paper-grain";
    case "linen": return "paper-linen";
    case "watercolor": return "paper-watercolor";
    case "cotton":
    default: return "paper-cotton";
  }
}

function premiumTokens(p){
  switch(p){
    case "ivory": return { bg:"#fff6e9", ink:"#1f2937", accent:"#d97706" };
    case "forest": return { bg:"#0f3d2e", ink:"#ecfeff", accent:"#34d399" };
    case "royal": return { bg:"#1d4ed8", ink:"#eff6ff", accent:"#93c5fd" };
    case "noir":
    default: return { bg:"#111827", ink:"#f9fafb", accent:"#9ca3af" };
  }
}

function asLink(label, url){
  const u = safeText(url);
  if (!u) return "";
  const t = safeText(label) || "連結";
  return `<a class="link" href="${u}" target="_blank" rel="noopener">${escapeHtml(t)}</a>`;
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function buildCarousel(urls){
  const arr = (urls || []).filter(Boolean);
  if (!arr.length) return "";

  const slides = arr.map((u, i) => {
    const safeU = escapeHtml(u);
    return `
      <div class="slide">
        <img src="${safeU}" alt="img-${i+1}" data-view="${safeU}" loading="lazy" />
      </div>
    `;
  }).join("");

  const dots = arr.map((_, i) => `<span class="dot" data-dot="${i}"></span>`).join("");

  return `
    <div class="carousel" data-carousel="1">
      <div class="track" data-track="1">
        ${slides}
      </div>
      <div class="dots" data-dots="1">${dots}</div>
    </div>
  `;
}

function attachCarouselBehavior(root){
  const car = root.querySelector(".carousel");
  if (!car) return;

  const track = car.querySelector(".track");
  const dotsWrap = car.querySelector(".dots");
  const dots = Array.from(dotsWrap.querySelectorAll(".dot"));
  const slides = Array.from(track.querySelectorAll(".slide"));

  let idx = 0;
  function setIdx(n){
    idx = Math.max(0, Math.min(slides.length - 1, n));
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
  }
  setIdx(0);

  dotsWrap.addEventListener("click", (e) => {
    const d = e.target.closest(".dot");
    if (!d) return;
    const n = parseInt(d.getAttribute("data-dot"), 10);
    if (!isNaN(n)) setIdx(n);
  });

  // simple swipe
  let startX = 0, dx = 0, isDown = false;
  track.addEventListener("touchstart", (e)=>{
    isDown = true;
    startX = e.touches[0].clientX;
    dx = 0;
  }, {passive:true});
  track.addEventListener("touchmove", (e)=>{
    if (!isDown) return;
    dx = e.touches[0].clientX - startX;
  }, {passive:true});
  track.addEventListener("touchend", ()=>{
    isDown = false;
    if (Math.abs(dx) < 30) return;
    if (dx < 0) setIdx(idx + 1);
    else setIdx(idx - 1);
  });

  // image viewer
  track.addEventListener("click", (e)=>{
    const img = e.target.closest("img[data-view]");
    if (!img) return;
    openViewer(img.getAttribute("data-view"));
  });
}

function openViewer(src){
  els.viewerImg.src = src;
  els.imgViewer.hidden = false;
}

function closeViewer(){
  els.imgViewer.hidden = true;
  els.viewerImg.src = "";
}

function renderFacadeA(data, pref){
  const tokens = colorTokens(pref.color);
  const paper = paperClass(pref.paper);

  const name = safeText(data['姓名（名片大標題）'] || data['姓名 (名片大標題)'] || data['姓名'] || "");
  const org  = safeText(data['單位名稱（如：幸福教養概念館）'] || data['單位名稱'] || "");
  const slogan = safeText(data['理念標語（顯示在照片下方，精簡有力）'] || data['理念標語'] || "");
  const services = splitLines(data['服務項目（核心業務，多項可條列換行）'] || data['服務項目'] || "");
  const titles = splitLines(data['重要頭銜/獎銜（權威背書項目，多項可條列換行）'] || data['重要頭銜/獎銜'] || "");

  const photo = safeText(data['個人專業形象照（名片主圖）'] || data['個人專業形象照'] || "");
  const logo = safeText(data['品牌 Logo（右上角小圖標）'] || data['品牌 Logo'] || "");

  const imgs = splitUrls(data['產品或品牌或活動照片最多3張（內容區插圖）'] || data['產品或品牌或活動照片最多3張'] || "");
  const carousel = buildCarousel(imgs);

  const yt1 = safeText(data['影音平台 1（如：YouTube或其他連結）'] || data['影音平台 1'] || "");
  const yt2 = safeText(data['影音平台 2（如：TikTok / 抖音或其他連結）'] || data['影音平台 2'] || "");
  const yt3 = safeText(data['影音平台 3（或地址）'] || data['影音平台 3'] || "");

  const s1 = safeText(data['社群平台 1（如：Facebook 粉絲專頁或其他連結）'] || data['社群平台 1'] || "");
  const s2 = safeText(data['社群平台 2（如：Instagram或其他連結）'] || data['社群平台 2'] || "");
  const s3 = safeText(data['社群平台 3（如：Thread / 部落格或其他連結）'] || data['社群平台 3'] || "");

  const lineLink = safeText(data['私訊 LINE 連結（第一行填連結，換行填line名稱）'] || data['私訊 LINE 連結'] || "");
  const lineOA = safeText(data['​LINE 官方帳號連結（綠色主按鈕）'] || data['LINE 官方帳號連結（綠色主按鈕）'] || data['LINE 官方帳號連結'] || "");
  const email = safeText(data['一鍵聯繫 Email'] || "");
  const phone = safeText(data['一鍵聯繫電話'] || "");

  const q1 = safeText(data['客戶常見提問 1 (Q1)'] || "");
  const a1 = safeText(data['專業解答 1 (A1)'] || "");
  const q2 = safeText(data['客戶常見提問 2 (Q2)'] || "");
  const a2 = safeText(data['專業解答2（A2）'] || data['專業解答 2 (A2)'] || "");

  // layout variants
  const shapeClass =
    pref.layout === "clean" ? "layout-clean" :
    pref.layout === "focus" ? "layout-focus" : "layout-elegant";

  const servicesHtml = services.length
    ? `<ul class="list">${services.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`
    : `<div class="empty">（服務項目尚未填寫）</div>`;

  const titlesHtml = titles.length
    ? `<ul class="list subtle">${titles.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`
    : "";

  const linksHtml = `
    <div class="linkRow">
      ${asLink("YouTube/影音 1", yt1)}
      ${asLink("影音 2", yt2)}
      ${asLink("影音 3/地址", yt3)}
    </div>
    <div class="linkRow">
      ${asLink("社群 1", s1)}
      ${asLink("社群 2", s2)}
      ${asLink("社群 3", s3)}
    </div>
  `;

  const contactHtml = `
    <div class="contactRow">
      ${lineOA ? `<a class="pill green" href="${escapeHtml(lineOA)}" target="_blank" rel="noopener">加入 LINE 官方帳號</a>` : ""}
      ${lineLink ? `<a class="pill" href="${escapeHtml(lineLink)}" target="_blank" rel="noopener">私訊 LINE</a>` : ""}
      ${email ? `<a class="pill" href="mailto:${escapeHtml(email)}">Email</a>` : ""}
      ${phone ? `<a class="pill" href="tel:${escapeHtml(phone)}">電話</a>` : ""}
    </div>
  `;

  const qaHtml = (q1 || a1 || q2 || a2) ? `
    <div class="qa">
      ${q1 ? `<div class="q">Q：${escapeHtml(q1)}</div>` : ""}
      ${a1 ? `<div class="a">A：${escapeHtml(a1)}</div>` : ""}
      ${(q2 || a2) ? `<div class="hr"></div>` : ""}
      ${q2 ? `<div class="q">Q：${escapeHtml(q2)}</div>` : ""}
      ${a2 ? `<div class="a">A：${escapeHtml(a2)}</div>` : ""}
    </div>
  ` : "";

  const html = `
  <style>
    .facA{
      --a:${tokens.a};
      --b:${tokens.b};
      padding: 0;
    }
    .facA .hero{
      position:relative;
      padding: 18px 16px 16px;
      color:#fff;
      background: linear-gradient(180deg, var(--a), var(--b));
      overflow:hidden;
    }
    .facA .hero::after{
      content:"";
      position:absolute; inset:-60px -60px auto auto;
      width:260px; height:260px;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 55%);
      transform: rotate(22deg);
    }
    .facA .logo{
      position:absolute; top:14px; right:14px;
      width:44px; height:44px; border-radius: 14px;
      background: rgba(255,255,255,.16);
      border: 1px solid rgba(255,255,255,.25);
      display:flex; align-items:center; justify-content:center;
      overflow:hidden;
      backdrop-filter: blur(10px);
      z-index:2;
    }
    .facA .logo img{ width:100%; height:100%; object-fit: cover; }
    .facA .avatarWrap{
      display:flex; justify-content:center;
      margin-top: 6px;
      position:relative;
      z-index: 2;
    }
    .facA .avatar{
      width:108px; height:108px; border-radius: 999px;
      background: rgba(255,255,255,.18);
      border: 1px solid rgba(255,255,255,.35);
      overflow:hidden;
      box-shadow: 0 18px 50px rgba(0,0,0,.18);
    }
    .facA .avatar img{ width:100%; height:100%; object-fit: cover; }
    .facA .title{
      text-align:center;
      margin-top: 12px;
      font-weight: 950;
      font-size: 28px;
      letter-spacing: .6px;
      position:relative;
      z-index: 2;
    }
    .facA .org{
      text-align:center;
      margin-top: 6px;
      font-weight: 900;
      font-size: 16px;
      opacity:.95;
      position:relative;
      z-index: 2;
    }
    .facA .slogan{
      text-align:center;
      margin-top: 8px;
      font-weight: 800;
      font-size: 14px;
      opacity:.95;
      position:relative;
      z-index: 2;
    }

    .facA .body{
      padding: 14px;
      background: rgba(255,255,255,.92);
    }

    .facA .card{
      border: 1px solid rgba(20,32,51,.10);
      border-radius: 22px;
      background: rgba(255,255,255,.88);
      box-shadow: 0 14px 34px rgba(16,24,40,.10);
      overflow:hidden;
    }
    .facA .inner{
      padding: 14px;
    }
    .facA .sectionTitle{
      font-weight: 950;
      margin: 2px 0 10px;
      color: rgba(20,32,51,.92);
      display:flex; align-items:center; justify-content:space-between;
    }
    .facA .list{ margin:0; padding-left: 18px; line-height: 1.65; }
    .facA .list.subtle{ color: rgba(20,32,51,.75); }
    .facA .empty{ color: rgba(20,32,51,.55); font-weight: 700; }

    .facA .link{
      display:inline-flex;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(20,32,51,.12);
      background: rgba(255,255,255,.72);
      text-decoration:none;
      font-weight: 900;
      color: rgba(20,32,51,.9);
      margin: 6px 8px 0 0;
    }
    .facA .linkRow{ margin-top: 6px; }

    .facA .contactRow{ display:flex; flex-wrap:wrap; gap:10px; margin-top: 12px; }
    .facA .pill{
      text-decoration:none;
      font-weight: 950;
      padding: 12px 14px;
      border-radius: 999px;
      border: 1px solid rgba(20,32,51,.12);
      background: rgba(255,255,255,.72);
      color: rgba(20,32,51,.92);
    }
    .facA .pill.green{
      background: linear-gradient(180deg, #22c55e, #16a34a);
      border-color: rgba(255,255,255,.25);
      color: #fff;
      box-shadow: 0 16px 36px rgba(34,197,94,.22);
    }

    .facA .qa{
      margin-top: 12px;
      padding: 12px;
      border-radius: 18px;
      background: rgba(20,32,51,.04);
      border: 1px solid rgba(20,32,51,.08);
      line-height: 1.65;
    }
    .facA .q{ font-weight: 950; margin: 2px 0 4px; }
    .facA .a{ color: rgba(20,32,51,.85); font-weight: 700; }
    .facA .hr{ height:1px; background: rgba(20,32,51,.10); margin: 10px 0; }

    /* Carousel */
    .carousel{ margin-top: 12px; }
    .track{
      display:flex;
      width:100%;
      transition: transform .28s ease;
    }
    .slide{
      min-width:100%;
      padding: 0;
      position:relative;
    }
    .slide img{
      width:100%;
      height: 240px;
      object-fit: cover;
      display:block;
      border-radius: 18px;
      border: 1px solid rgba(20,32,51,.10);
      box-shadow: 0 14px 34px rgba(16,24,40,.12);
    }
    .dots{
      display:flex; gap:8px; justify-content:center;
      margin-top: 10px;
    }
    .dots .dot{
      width:8px; height:8px; border-radius: 999px;
      background: rgba(20,32,51,.18);
      cursor:pointer;
    }
    .dots .dot.active{ background: rgba(45,108,223,.85); }

    /* Paper texture stronger */
    .paper{
      padding: 14px;
    }

    /* Layout variants */
    .layout-elegant .card{ border-radius: 26px; }
    .layout-clean .hero{ border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
    .layout-focus .hero{
      background:
        radial-gradient(700px 220px at 50% -40px, rgba(255,255,255,.35), transparent 55%),
        linear-gradient(180deg, var(--a), var(--b));
    }
  </style>

  <div class="facA ${shapeClass}">
    <div class="hero">
      ${logo ? `<div class="logo"><img src="${escapeHtml(logo)}" alt="logo" /></div>` : ""}
      <div class="avatarWrap">
        <div class="avatar">
          ${photo ? `<img src="${escapeHtml(photo)}" alt="photo" />` : ""}
        </div>
      </div>
      <div class="title">${escapeHtml(name || "（未填姓名）")}</div>
      <div class="org">${escapeHtml(org)}</div>
      <div class="slogan">${escapeHtml(slogan)}</div>
    </div>

    <div class="body ${paper} paper">
      <div class="card">
        <div class="inner">
          <div class="sectionTitle">服務項目</div>
          ${servicesHtml}
          ${titlesHtml ? `<div style="margin-top:12px"><div class="sectionTitle">頭銜 / 背書</div>${titlesHtml}</div>` : ""}

          ${carousel ? `<div style="margin-top:12px"><div class="sectionTitle">產品 / 活動照片</div>${carousel}</div>` : ""}

          <div style="margin-top:14px">
            <div class="sectionTitle">影音 / 社群</div>
            ${linksHtml}
          </div>

          ${contactHtml}

          ${qaHtml}
        </div>
      </div>
    </div>
  </div>
  `;

  return html;
}

function renderFacadeB(data, pref){
  const t = premiumTokens(pref.premium);

  const name = safeText(data['姓名（名片大標題）'] || data['姓名'] || "");
  const org  = safeText(data['單位名稱（如：幸福教養概念館）'] || data['單位名稱'] || "");
  const slogan = safeText(data['理念標語（顯示在照片下方，精簡有力）'] || data['理念標語'] || "");

  const services = splitLines(data['服務項目（核心業務，多項可條列換行）'] || data['服務項目'] || "");
  const titles = splitLines(data['重要頭銜/獎銜（權威背書項目，多項可條列換行）'] || data['重要頭銜/獎銜'] || "");

  const photo = safeText(data['個人專業形象照（名片主圖）'] || data['個人專業形象照'] || "");
  const logo = safeText(data['品牌 Logo（右上角小圖標）'] || data['品牌 Logo'] || "");

  const imgs = splitUrls(data['產品或品牌或活動照片最多3張（內容區插圖）'] || "");
  const carousel = buildCarousel(imgs);

  const lineOA = safeText(data['​LINE 官方帳號連結（綠色主按鈕）'] || data['LINE 官方帳號連結（綠色主按鈕）'] || "");
  const email = safeText(data['一鍵聯繫 Email'] || "");
  const phone = safeText(data['一鍵聯繫電話'] || "");

  const servicesHtml = services.length
    ? services.slice(0, 6).map(x=>`<div class="svc">${escapeHtml(x)}</div>`).join("")
    : `<div class="empty">（服務項目尚未填寫）</div>`;

  const titlesHtml = titles.length
    ? titles.slice(0, 6).map(x=>`<div class="tag">${escapeHtml(x)}</div>`).join("")
    : "";

  const html = `
  <style>
    .facB{
      background: ${t.bg};
      color: ${t.ink};
    }
    .facB .frame{
      padding: 16px;
      border-radius: 26px;
      overflow:hidden;
      position:relative;
    }
    .facB .frame::before{
      content:"";
      position:absolute; inset:-120px -120px auto auto;
      width: 320px; height:320px;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.14), transparent 55%);
      transform: rotate(20deg);
      pointer-events:none;
    }
    .facB .top{
      display:flex;
      gap: 14px;
      align-items:center;
      position:relative;
      z-index:2;
    }
    .facB .avatar{
      width: 86px; height: 86px;
      border-radius: 26px;
      overflow:hidden;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.14);
      box-shadow: 0 18px 40px rgba(0,0,0,.18);
      flex: 0 0 auto;
    }
    .facB .avatar img{ width:100%; height:100%; object-fit: cover; }
    .facB .meta .name{
      font-size: 22px;
      font-weight: 950;
      letter-spacing: .6px;
    }
    .facB .meta .org{
      margin-top: 4px;
      font-weight: 800;
      opacity:.9;
    }
    .facB .meta .slogan{
      margin-top: 8px;
      font-weight: 800;
      opacity:.9;
    }
    .facB .logo{
      margin-left:auto;
      width: 42px; height: 42px;
      border-radius: 16px;
      overflow:hidden;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.06);
      display:flex; align-items:center; justify-content:center;
    }
    .facB .logo img{ width:100%; height:100%; object-fit: cover; }

    .facB .grid{
      margin-top: 14px;
      display:grid;
      grid-template-columns: 1fr;
      gap: 12px;
      position:relative;
      z-index:2;
    }
    @media(min-width:720px){
      .facB .grid{ grid-template-columns: 1.1fr .9fr; }
    }
    .facB .card{
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.06);
      backdrop-filter: blur(12px);
      box-shadow: 0 18px 50px rgba(0,0,0,.20);
      overflow:hidden;
    }
    .facB .card .inner{ padding: 14px; }
    .facB .h{
      font-weight: 950;
      letter-spacing:.6px;
      display:flex; align-items:center; gap:10px;
      margin-bottom: 10px;
    }
    .facB .h .bar{
      width: 10px; height: 10px; border-radius: 999px;
      background: ${t.accent};
      box-shadow: 0 14px 30px rgba(255,255,255,.10);
    }
    .facB .svc{
      padding: 10px 12px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.10);
      margin: 10px 0;
      font-weight: 850;
      line-height: 1.35;
    }
    .facB .empty{ opacity:.75; font-weight: 800; }
    .facB .tags{
      display:flex; flex-wrap:wrap; gap:10px;
    }
    .facB .tag{
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.10);
      font-weight: 850;
      opacity:.95;
    }

    .facB a{ color: inherit; }
    .facB .contact{
      display:flex; flex-wrap:wrap; gap:10px;
      margin-top: 10px;
    }
    .facB .pill{
      text-decoration:none;
      font-weight: 950;
      padding: 12px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(255,255,255,.08);
      color: ${t.ink};
    }
    .facB .pill.main{
      background: linear-gradient(180deg, rgba(34,197,94,.95), rgba(22,163,74,.95));
      border-color: rgba(255,255,255,.25);
      color:#fff;
      box-shadow: 0 18px 44px rgba(34,197,94,.18);
    }

    /* Carousel (reuse styles) */
    .carousel{ margin-top: 10px; }
    .track{ display:flex; width:100%; transition: transform .28s ease; }
    .slide{ min-width:100%; }
    .slide img{
      width:100%;
      height: 230px;
      object-fit: cover;
      display:block;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.14);
      box-shadow: 0 18px 50px rgba(0,0,0,.22);
    }
    .dots{ display:flex; gap:8px; justify-content:center; margin-top: 10px; }
    .dots .dot{ width:8px; height:8px; border-radius:999px; background: rgba(255,255,255,.25); }
    .dots .dot.active{ background: rgba(255,255,255,.75); }
  </style>

  <div class="facB">
    <div class="frame">
      <div class="top">
        <div class="avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="photo" />` : ""}</div>
        <div class="meta">
          <div class="name">${escapeHtml(name || "（未填姓名）")}</div>
          <div class="org">${escapeHtml(org)}</div>
          <div class="slogan">${escapeHtml(slogan)}</div>
        </div>
        ${logo ? `<div class="logo"><img src="${escapeHtml(logo)}" alt="logo" /></div>` : ""}
      </div>

      <div class="grid">
        <div class="card">
          <div class="inner">
            <div class="h"><span class="bar"></span>服務亮點</div>
            ${servicesHtml}
            ${carousel ? `<div style="margin-top:12px"><div class="h"><span class="bar"></span>作品 / 活動</div>${carousel}</div>` : ""}
          </div>
        </div>

        <div class="card">
          <div class="inner">
            <div class="h"><span class="bar"></span>背書 / 頭銜</div>
            <div class="tags">
              ${titlesHtml || `<div class="empty">（可不填）</div>`}
            </div>

            <div style="margin-top:14px">
              <div class="h"><span class="bar"></span>一鍵聯繫</div>
              <div class="contact">
                ${lineOA ? `<a class="pill main" href="${escapeHtml(lineOA)}" target="_blank" rel="noopener">加入 LINE 官方帳號</a>` : ""}
                ${email ? `<a class="pill" href="mailto:${escapeHtml(email)}">Email</a>` : ""}
                ${phone ? `<a class="pill" href="tel:${escapeHtml(phone)}">電話</a>` : ""}
              </div>
            </div>

            <div style="margin-top:14px; opacity:.75; font-weight:800; line-height:1.45">
              精品款會更看重照片質感；若照片想更專業，可加購轉檔／精修服務。
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
  return html;
}

async function renderFacade(){
  const theme = getActiveTheme();
  els.facade.classList.add("loading");
  els.facade.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton small"></div>
    <div class="skeleton small"></div>
  `;

  try{
    const data = await fetchPublic();

    if (theme.plan === "B-精品設計款"){
      els.facade.className = "facade";
      els.facade.innerHTML = renderFacadeB(data, theme);
      attachCarouselBehavior(els.facade);
      return;
    }

    // A
    els.facade.className = "facade";
    els.facade.innerHTML = renderFacadeA(data, theme);
    attachCarouselBehavior(els.facade);

  }catch(err){
    els.facade.className = "facade";
    els.facade.innerHTML = `
      <div style="padding:14px">
        <div style="font-weight:950; margin-bottom:6px">門面載入失敗</div>
        <div style="color:rgba(20,32,51,.75); font-weight:700; line-height:1.6">
          ${escapeHtml(String(err || ""))}
        </div>
        <div style="margin-top:10px; color:rgba(20,32,51,.6); font-size:13px">
          請檢查 app.js 的 API_BASE 是否為你最新的 GAS 部署網址。
        </div>
      </div>
    `;
  }finally{
    els.facade.classList.remove("loading");
  }
}

/* ---------- Picker UI ---------- */

function setActiveChip(groupEl, selector, key, value){
  const chips = Array.from(groupEl.querySelectorAll(selector));
  chips.forEach(ch => ch.classList.toggle("active", ch.getAttribute(`data-${key}`) === value));
}

function bindPickers(){
  // A - colors
  els.chipColors.addEventListener("click", (e)=>{
    const btn = e.target.closest(".chip.color[data-color]");
    if (!btn) return;
    const color = btn.getAttribute("data-color");
    const pref = getPrefA();
    pref.color = color;
    setPrefA(pref);
    setActiveChip(els.chipColors, ".chip.color", "color", color);
    renderFacade();
  });

  // A - layouts
  els.chipLayouts.addEventListener("click", (e)=>{
    const btn = e.target.closest(".chip[data-layout]");
    if (!btn) return;
    const layout = btn.getAttribute("data-layout");
    const pref = getPrefA();
    pref.layout = layout;
    setPrefA(pref);
    setActiveChip(els.chipLayouts, ".chip", "layout", layout);
    renderFacade();
  });

  // A - papers
  els.chipPapers.addEventListener("click", (e)=>{
    const btn = e.target.closest(".chip[data-paper]");
    if (!btn) return;
    const paper = btn.getAttribute("data-paper");
    const pref = getPrefA();
    pref.paper = paper;
    setPrefA(pref);
    setActiveChip(els.chipPapers, ".chip", "paper", paper);
    renderFacade();
  });

  // B - premium background
  els.premiumSwatches.addEventListener("click", (e)=>{
    const btn = e.target.closest(".swatch[data-premium]");
    if (!btn) return;
    const premium = btn.getAttribute("data-premium");
    const pref = getPrefB();
    pref.premium = premium;
    setPrefB(pref);

    Array.from(els.premiumSwatches.querySelectorAll(".swatch")).forEach(b=>{
      b.classList.toggle("active", b.getAttribute("data-premium") === premium);
    });

    renderFacade();
  });
}

function restorePickersUI(){
  const a = getPrefA();
  setActiveChip(els.chipColors, ".chip.color", "color", a.color);
  setActiveChip(els.chipLayouts, ".chip", "layout", a.layout);
  setActiveChip(els.chipPapers, ".chip", "paper", a.paper);

  const b = getPrefB();
  Array.from(els.premiumSwatches.querySelectorAll(".swatch")).forEach(btn=>{
    btn.classList.toggle("active", btn.getAttribute("data-premium") === b.premium);
  });
}

/* ---------- Modal & Viewer ---------- */

function openHelp(){
  els.helpModal.hidden = false;
}
function closeHelp(){
  els.helpModal.hidden = true;
}

function bindModal(){
  els.btnHelp.addEventListener("click", openHelp);

  els.helpModal.addEventListener("click", (e)=>{
    if (e.target && e.target.getAttribute("data-close") === "1") closeHelp();
  });

  els.imgViewer.addEventListener("click", (e)=>{
    if (e.target && e.target.getAttribute("data-close") === "1") closeViewer();
  });
}

/* ---------- Plan chooser binding ---------- */

function bindPlan(){
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
}

/* ---------- init ---------- */

(function init(){
  bindPlan();
  bindPickers();
  bindModal();
  restorePickersUI();

  const savedPlan = localStorage.getItem(STORAGE_PLAN) || "";
  if (savedPlan) setSelectedPlan(savedPlan);
  else setSelectedPlan(""); // triggers breathe + render

})();