/* =========================================
 * Angel Happiness Smart Card - v366
 * Front P1 Stable (Public preview reads TW0001 via GAS action=public)
 * - Free: 5 colors + 3 avatar frames + 4 paper textures (avatar area only)
 * - Premium: 7 colors (strong) + glass
 * - Product carousel: swipe + tap to view
 * - Address: auto link to Google Maps navigation
 * - Minimal guidance: “成品預覽”
 * - Footer: version + copyright
 * ========================================= */

const VERSION = 366;

/* ✅ 換成你目前可用的 GAS /exec（一定要可 public） */
const API_BASE = "https://script.google.com/macros/s/AKfycbxJYZB2F1AhkQ3Ch-LX85G7PhwBc5fc-fLHqpS5qEd2k9oeHbf4NFb0OnMGRm3GgTI/exec";

/* ✅ Google 表單（客人填寫） */
const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

/* local storage */
const LS = {
  mode: "ANGEL_CARD_MODE",              // free | premium
  freeColor: "ANGEL_FREE_COLOR",        // pink blue orange purple green
  freeFrame: "ANGEL_FREE_FRAME",        // arch flat invert
  freePaper: "ANGEL_FREE_PAPER",        // linen watercolor matte smooth
  preColor: "ANGEL_PRE_COLOR",          // inkgreen bluegray winebrown caramel morandi lilac graphite
  preLayout: "ANGEL_PRE_LAYOUT",        // reserved (future)
};

const DEFAULTS = {
  mode: "free",
  freeColor: "pink",
  freeFrame: "arch",
  freePaper: "watercolor",
  preColor: "inkgreen",
  preLayout: "spotlight", // reserved (future)
};

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function safeText(el, v){
  if(!el) return;
  const s = (v===null || v===undefined) ? "" : String(v);
  el.textContent = s.trim();
}
function safeShow(el, ok){
  if(!el) return;
  el.classList.toggle("hidden", !ok);
}
function isUrl(s){
  try { new URL(s); return true; } catch { return false; }
}

function splitPhotos(v){
  if(!v) return [];
  const s = String(v).trim();
  if(!s) return [];
  return s.split(",").map(x=>x.trim()).filter(Boolean);
}

/* Google Drive open links: try to turn into direct view */
function normalizeDriveUrl(u){
  const s = String(u||"").trim();
  if(!s) return "";
  // allow non-drive URLs as-is
  if(!s.includes("drive.google.com")) return s;

  // patterns
  // open?id=FILEID
  const m1 = s.match(/[?&]id=([^&]+)/);
  if(m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;

  // /file/d/FILEID/
  const m2 = s.match(/\/file\/d\/([^/]+)/);
  if(m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;

  // fallback
  return s;
}

function getVal(data, key){
  // keys in your sheet include quotes & spaces sometimes; match by includes
  const entries = Object.entries(data||{});
  const norm = (x)=>String(x||"").replace(/"/g,"").trim();
  const target = norm(key);
  for(const [k,v] of entries){
    if(norm(k) === target) return v;
  }
  // tolerant includes
  for(const [k,v] of entries){
    if(norm(k).includes(target)) return v;
  }
  return "";
}

async function fetchPublic(){
  const url = `${API_BASE}?action=public&_=${Date.now()}`;
  const res = await fetch(url, { cache:"no-store" });
  const j = await res.json();
  if(!j || !j.ok) throw new Error(j?.message || "API error");
  return j.data || {};
}

/* ---------- DOM mapping (best-effort, non-breaking) ---------- */
function dom(){
  return {
    // plan buttons (if exist)
    btnModeFree: $("#btnModeFree"),
    btnModePremium: $("#btnModePremium"),
    btnGoForm: $("#btnGoForm"),

    // free controls (if exist)
    freeSwatches: $all("[data-free-color]"),
    freeFrames: $all("[data-free-frame]"),
    freePapers: $all("[data-free-paper]"),

    // premium controls (if exist)
    preSwatches: $all("[data-pre-color]"),
    preLayouts: $all("[data-pre-layout]"), // reserved

    // preview container (must exist)
    previewShell: $("#previewShell"),
    // inside preview: best effort IDs
    elName: $("#pvName"),
    elOrg: $("#pvOrg"),
    elSlogan: $("#pvSlogan"),
    elServices: $("#pvServices"),
    elTitles: $("#pvTitles"),
    elWeChat: $("#pvWeChat"),
    elAddress: $("#pvAddress"),

    avatarImg: $("#pvAvatarImg"),
    logoImg: $("#pvLogoImg"),

    // links
    linksBox: $("#pvLinks"),
    lineBtn: $("#pvLineBtn"),
    oaBtn: $("#pvOABtn"),
    emailBtn: $("#pvEmailBtn"),
    phoneBtn: $("#pvPhoneBtn"),

    // product photos
    carousel: $("#pvCarousel"),

    // Q&A
    qaBox: $("#pvQA"),
    // mini icons
    iconHelp: $("#iconHelp"),
    iconQA: $("#iconQA"),

    // modal viewer
    modal: $("#imgModal"),
    modalImg: $("#imgModalImg"),
    modalTitle: $("#imgModalTitle"),
    modalClose: $("#imgModalClose"),

    // footer
    footerVersion: $("#footerVersion"),
    footerCopyright: $("#footerCopyright"),
  };
}

/* ---------- state ---------- */
function readState(){
  const mode = localStorage.getItem(LS.mode) || DEFAULTS.mode;
  return {
    mode: (mode === "premium") ? "premium" : "free",
    freeColor: localStorage.getItem(LS.freeColor) || DEFAULTS.freeColor,
    freeFrame: localStorage.getItem(LS.freeFrame) || DEFAULTS.freeFrame,
    freePaper: localStorage.getItem(LS.freePaper) || DEFAULTS.freePaper,
    preColor: localStorage.getItem(LS.preColor) || DEFAULTS.preColor,
    preLayout: localStorage.getItem(LS.preLayout) || DEFAULTS.preLayout,
  };
}
function saveState(s){
  localStorage.setItem(LS.mode, s.mode);
  localStorage.setItem(LS.freeColor, s.freeColor);
  localStorage.setItem(LS.freeFrame, s.freeFrame);
  localStorage.setItem(LS.freePaper, s.freePaper);
  localStorage.setItem(LS.preColor, s.preColor);
  localStorage.setItem(LS.preLayout, s.preLayout);
}

/* ---------- apply theme to preview ---------- */
function applyTheme(state){
  const d = dom();
  const shell = d.previewShell;
  if(!shell) return;

  // reset classes
  shell.className = "previewShell";
  shell.classList.add(state.mode);

  // frames + paper apply always (free focused)
  shell.classList.add(`frame-${state.freeFrame}`);
  shell.classList.add(`paper-${state.freePaper}`);

  if(state.mode === "free"){
    shell.classList.add(`theme-${state.freeColor}`);
  }else{
    shell.classList.add(`theme-${state.preColor}`);
  }

  // set active UI (if exists)
  if(d.btnModeFree) d.btnModeFree.classList.toggle("active", state.mode==="free");
  if(d.btnModePremium) d.btnModePremium.classList.toggle("active", state.mode==="premium");

  d.freeSwatches.forEach(x=>{
    x.classList.toggle("active", x.getAttribute("data-free-color") === state.freeColor);
  });
  d.freeFrames.forEach(x=>{
    x.classList.toggle("active", x.getAttribute("data-free-frame") === state.freeFrame);
  });
  d.freePapers.forEach(x=>{
    x.classList.toggle("active", x.getAttribute("data-free-paper") === state.freePaper);
  });
  d.preSwatches.forEach(x=>{
    x.classList.toggle("active", x.getAttribute("data-pre-color") === state.preColor);
  });
}

/* ---------- build links ---------- */
function makeLink(title, url){
  if(!url || !isUrl(url)) return null;
  const a = document.createElement("a");
  a.className = "linkBtn";
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = title;
  return a;
}

function navGoogle(address){
  const s = String(address||"").trim();
  if(!s) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`;
}

/* ---------- render preview from sheet ---------- */
function render(data){
  const d = dom();

  // core fields
  const name = getVal(data, '姓名（名片大標題）');
  const org  = getVal(data, '單位名稱（如：幸福教養概念館）');
  const slogan = getVal(data, '理念標語（顯示在照片下方，精簡有力）');
  const services = getVal(data, '服務項目（核心業務，多項可條列換行）');
  const titles = getVal(data, '重要頭銜/獎銜（權威背書項目，多項可條列換行）');

  safeText(d.elName, name);
  safeText(d.elOrg, org);
  safeText(d.elSlogan, slogan);
  safeText(d.elServices, services);
  safeText(d.elTitles, titles);

  // wechat / address
  const wechat = getVal(data, '微信 ID');
  safeText(d.elWeChat, wechat);

  const address = getVal(data, '影音平台 3（或地址）');
  if(d.elAddress){
    const addr = String(address||"").trim();
    d.elAddress.textContent = addr;
    if(addr){
      d.elAddress.style.cursor = "pointer";
      d.elAddress.onclick = ()=> window.open(navGoogle(addr), "_blank", "noopener");
      d.elAddress.title = "點我開啟導航";
    }else{
      d.elAddress.onclick = null;
      d.elAddress.style.cursor = "default";
      d.elAddress.title = "";
    }
  }

  // images
  const avatar = normalizeDriveUrl(getVal(data, '個人專業形象照（名片主圖）'));
  const logo = normalizeDriveUrl(getVal(data, '品牌 Logo（右上角小圖標）'));

  if(d.avatarImg){
    d.avatarImg.src = avatar || "";
    safeShow(d.avatarImg, !!avatar);
  }
  if(d.logoImg){
    d.logoImg.src = logo || "";
    safeShow(d.logoImg, !!logo);
  }

  // product photos
  const productsRaw = getVal(data, '產品或品牌或活動照片最多3張（內容區插圖）');
  const productUrls = splitPhotos(productsRaw).map(normalizeDriveUrl).filter(Boolean);

  if(d.carousel){
    d.carousel.innerHTML = "";
    if(productUrls.length){
      productUrls.forEach((u, idx)=>{
        const box = document.createElement("div");
        box.className = "pic";
        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = u;
        img.alt = `產品圖 ${idx+1}`;
        box.appendChild(img);
        box.addEventListener("click", ()=> openModal(u, `產品圖 ${idx+1}`));
        d.carousel.appendChild(box);
      });
      safeShow(d.carousel, true);
    }else{
      safeShow(d.carousel, false);
    }
  }

  // links (video/social)
  if(d.linksBox){
    d.linksBox.innerHTML = "";
    const y1 = getVal(data, '影音平台 1（如：YouTube或其他連結）');
    const y2 = getVal(data, '影音平台 2（如：TikTok / 抖音或其他連結）');
    const s1 = getVal(data, '社群平台 1（如：Facebook 粉絲專頁或其他連結）');
    const s2 = getVal(data, '社群平台 2（如：Instagram或其他連結）');
    const s3 = getVal(data, '社群平台 3（如：Thread / 部落格或其他連結）');

    const items = [
      ["影音平台 1", y1],
      ["影音平台 2", y2],
      ["社群平台 1", s1],
      ["社群平台 2", s2],
      ["社群平台 3", s3],
      ["導航", address ? navGoogle(address) : ""],
    ];
    items.forEach(([t,u])=>{
      const a = makeLink(t, u);
      if(a) d.linksBox.appendChild(a);
    });
    safeShow(d.linksBox, d.linksBox.childElementCount>0);
  }

  // line / OA / email / phone (3D buttons)
  const lineRaw = getVal(data, '私訊 LINE 連結（第一行填連結，換行填line名稱）');
  const lineLink = String(lineRaw||"").split("\n")[0]?.trim() || "";
  const oaLink = getVal(data, '​LINE 官方帳號連結（綠色主按鈕）');
  const email = getVal(data, '一鍵聯繫 Email');
  const phone = getVal(data, '一鍵聯繫電話');

  if(d.lineBtn){
    if(isUrl(lineLink)){
      d.lineBtn.href = lineLink;
      d.lineBtn.classList.remove("hidden");
    }else d.lineBtn.classList.add("hidden");
  }
  if(d.oaBtn){
    if(isUrl(oaLink)){
      d.oaBtn.href = oaLink;
      d.oaBtn.classList.remove("hidden");
    }else d.oaBtn.classList.add("hidden");
  }
  if(d.emailBtn){
    const em = String(email||"").trim();
    if(em){
      d.emailBtn.href = `mailto:${em}`;
      d.emailBtn.classList.remove("hidden");
    }else d.emailBtn.classList.add("hidden");
  }
  if(d.phoneBtn){
    const ph = String(phone||"").trim();
    if(ph){
      d.phoneBtn.href = `tel:${ph.replace(/\s+/g,"")}`;
      d.phoneBtn.classList.remove("hidden");
    }else d.phoneBtn.classList.add("hidden");
  }

  // Q&A (minimal)
  const q1 = getVal(data, '客戶常見提問 1 (Q1)');
  const a1 = getVal(data, '專業解答 1 (A1)');
  const q2 = getVal(data, '客戶常見提問 2 (Q2)');
  const a2 = getVal(data, '專業解答2（A2）');

  if(d.qaBox){
    const parts = [];
    if(String(q1||"").trim()) parts.push(`Q1：${String(q1).trim()}\nA1：${String(a1||"").trim()}`);
    if(String(q2||"").trim()) parts.push(`Q2：${String(q2).trim()}\nA2：${String(a2||"").trim()}`);
    d.qaBox.textContent = parts.join("\n\n");
    safeShow(d.qaBox, parts.length>0);
  }

  // footer
  if(d.footerVersion) d.footerVersion.textContent = `v${VERSION}`;
  if(d.footerCopyright) d.footerCopyright.textContent = `© Angel Happiness Smart Card System`;
}

/* ---------- modal viewer ---------- */
function openModal(url, title){
  const d = dom();
  if(!d.modal || !d.modalImg) return;
  d.modalImg.src = url;
  if(d.modalTitle) d.modalTitle.textContent = title || "圖片";
  d.modal.classList.add("show");
}
function closeModal(){
  const d = dom();
  if(!d.modal) return;
  d.modal.classList.remove("show");
  if(d.modalImg) d.modalImg.src = "";
}

/* ---------- help / qa icons ---------- */
function bindIcons(){
  const d = dom();
  if(d.iconHelp){
    d.iconHelp.addEventListener("click", ()=>{
      alert(
        "填表前準備：\n" +
        "1) 一張清晰照片（手機拍也可以）\n" +
        "2) Logo（有就放，沒有可不放）\n" +
        "3) 產品/活動照片（最多3張，可選填）\n" +
        "4) 你的連結：影音/社群/LINE/Email/電話\n\n" +
        "提醒：選版型是參考，請記住你選的款式與顏色。"
      );
    });
  }
  if(d.iconQA){
    d.iconQA.addEventListener("click", ()=>{
      // 只做輕提示，不塞字
      alert("這張名片把：影音/社群/導航/一鍵聯繫整合在同一頁。\n分享一個網址，就能成為你的品牌門面。");
    });
  }
}

/* ---------- bind UI controls ---------- */
function bindControls(state){
  const d = dom();

  // mode switch (if exists)
  if(d.btnModeFree){
    d.btnModeFree.addEventListener("click", ()=>{
      state.mode = "free";
      saveState(state);
      applyTheme(state);
    });
  }
  if(d.btnModePremium){
    d.btnModePremium.addEventListener("click", ()=>{
      state.mode = "premium";
      saveState(state);
      applyTheme(state);
    });
  }

  // free swatches / frames / papers
  d.freeSwatches.forEach(el=>{
    el.addEventListener("click", ()=>{
      state.mode = "free";
      state.freeColor = el.getAttribute("data-free-color") || DEFAULTS.freeColor;
      saveState(state);
      applyTheme(state);
    });
  });
  d.freeFrames.forEach(el=>{
    el.addEventListener("click", ()=>{
      state.mode = "free";
      state.freeFrame = el.getAttribute("data-free-frame") || DEFAULTS.freeFrame;
      saveState(state);
      applyTheme(state);
    });
  });
  d.freePapers.forEach(el=>{
    el.addEventListener("click", ()=>{
      state.mode = "free";
      state.freePaper = el.getAttribute("data-free-paper") || DEFAULTS.freePaper;
      saveState(state);
      applyTheme(state);
    });
  });

  // premium swatches
  d.preSwatches.forEach(el=>{
    el.addEventListener("click", ()=>{
      state.mode = "premium";
      state.preColor = el.getAttribute("data-pre-color") || DEFAULTS.preColor;
      saveState(state);
      applyTheme(state);
    });
  });

  // go form
  if(d.btnGoForm){
    d.btnGoForm.addEventListener("click", ()=>{
      if(!FORM_URL || !FORM_URL.startsWith("https://forms.gle/")){
        alert("請先設定 Google 表單連結（FORM_URL）。");
        return;
      }
      window.location.href = FORM_URL;
    });
  }

  // modal close
  if(d.modal){
    d.modal.addEventListener("click", (ev)=>{
      if(ev.target === d.modal) closeModal();
    });
  }
  if(d.modalClose){
    d.modalClose.addEventListener("click", closeModal);
  }
  document.addEventListener("keydown", (ev)=>{
    if(ev.key === "Escape") closeModal();
  });

  bindIcons();
}

/* ---------- init ---------- */
(async function init(){
  const state = readState();
  applyTheme(state);
  bindControls(state);

  try{
    const data = await fetchPublic(); // fixed TW0001 from GAS
    render(data);
  }catch(err){
    console.error(err);
    // 不塞文字，只用最小提示
    alert("成品預覽讀取失敗：請確認 GAS /exec 可用，以及 action=public 正常。");
  }
})();