/* Angel Smart Card Front v365 - Complete Overwrite
   - Reads GAS public endpoint (TW0001 fixed)
   - Free: 5 colors + 3 header shapes + 4 paper textures (applies to avatar zone)
   - Premium: 7 auras (same palette; free=light, premium=deep) + glass
   - Drive link -> direct image for display
   - Media carousel: up to 3 images (comma separated)
   - Minimal guide via icon button
*/

(() => {
  // ====== CONFIG ======
  const VERSION = 365;

  // Your GAS endpoint (public reads TW0001)
  // Example: https://script.google.com/macros/s/XXXXX/exec?action=public
  const API_BASE = (window.ANGEL_API_BASE || "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec");

  const LS_KEY = "angel_card_v365_pref";

  // Free 5 colors (light set)
  const FREE_COLORS = {
    red:    { name:"紅",  brand:"#ff5a6a", brand2:"#ff8a5a", bg:"#f5f7fb" },
    blue:   { name:"藍",  brand:"#49a4ff", brand2:"#2f7be6", bg:"#f4f7fb" },
    orange: { name:"橘",  brand:"#ff9a3c", brand2:"#ff6b3c", bg:"#f6f6fb" },
    purple: { name:"紫",  brand:"#7a6cff", brand2:"#5b49e6", bg:"#f6f5ff" },
    green:  { name:"綠",  brand:"#5fbf73", brand2:"#3aa85a", bg:"#f4fbf6" }
  };

  // Premium 7 auras (deep set) — same “palette idea” but upgraded
  const PREMIUM_AURAS = {
    inkGreen: { name:"深墨綠", brand:"#1f6b4a", brand2:"#0f3d2c" },   // 稳重型
    blueGray: { name:"深藍灰", brand:"#2f4a5e", brand2:"#142835" },   // 理性型
    wineBrown:{ name:"酒紅棕", brand:"#7a2d3a", brand2:"#2b1217" },   // 温暖高級型
    caramel:  { name:"焦糖暖棕", brand:"#a4632a", brand2:"#3b2312" }, // 人味型
    morandiBlue:{name:"莫蘭迪藍", brand:"#4d79a6", brand2:"#213b55" },// 清爽型
    mistPurple:{name:"霧紫灰", brand:"#6b5a7a", brand2:"#2b2430" },  // 氣質型
    graphite: { name:"深石墨黑", brand:"#1c1f26", brand2:"#090b10" }  // 極簡高端型
  };

  const SHAPES = [
    { key:"arch", name:"拱形" },
    { key:"flat", name:"平直" },
    { key:"spotlight", name:"聚光" }
  ];

  const PAPERS = [
    { key:"cotton", name:"霧面棉紙" },
    { key:"grain", name:"細顆粒紙" },
    { key:"linen", name:"亞麻紋" },
    { key:"watercolor", name:"水彩紙" }
  ];

  // ====== DOM bootstrap (works even if HTML is minimal) ======
  document.addEventListener("DOMContentLoaded", init);

  function init(){
    ensureFont();
    const root = document.documentElement;

    // Create minimal UI if missing
    const host = document.querySelector(".container") || createContainer_();

    // Topbar
    let topbar = host.querySelector(".topbar");
    if(!topbar){
      topbar = el("div","topbar");
      topbar.innerHTML = `
        <div class="brand-title">幸福智慧名片系統</div>
        <div class="pills">
          <a class="pill primary" id="btnForm" href="#" target="_blank" rel="noopener">立即填寫</a>
          <button class="pill icon" id="btnGuide" type="button" aria-label="填表前準備什麼">
            ${iconInfo_()}
          </button>
        </div>
      `;
      host.appendChild(topbar);
    }

    // Main card
    let main = host.querySelector(".card");
    if(!main){
      main = el("div","card");
      main.innerHTML = `
        <div class="controls" id="controls"></div>
        <div class="divider"></div>
        <div class="preview-title">成品預覽</div>
        <div class="preview" id="preview"></div>
      `;
      host.appendChild(main);
    }

    // Modal (guide)
    ensureGuideModal_();

    // Load prefs
    const pref = loadPref_();

    // Build controls (minimal, clear)
    const controls = document.getElementById("controls");
    controls.innerHTML = "";

    // Plan selector: A/B (free/premium)
    controls.appendChild(rowBlock_("方案", segButtons_([
      { key:"free", label:"A 自由款" },
      { key:"premium", label:"B 精品款" }
    ], pref.mode, (v)=>{ pref.mode=v; savePref_(pref); applyTheme_(pref); renderPreview_(state); }))));

    // Free controls
    const freeBlock = el("div","row");
    freeBlock.id = "freeBlock";
    freeBlock.style.gap = "12px";
    freeBlock.style.flexDirection = "column";

    // Color swatches (5)
    const sw = el("div","row");
    sw.appendChild(el("div","label", "顏色"));
    const swWrap = el("div","swatches");
    Object.keys(FREE_COLORS).forEach(k=>{
      const s = el("button","swatch");
      s.type="button";
      s.style.background = FREE_COLORS[k].brand;
      if(pref.freeColor===k) s.classList.add("active");
      s.addEventListener("click", ()=>{
        pref.freeColor = k;
        savePref_(pref);
        // UI active
        [...swWrap.querySelectorAll(".swatch")].forEach(x=>x.classList.remove("active"));
        s.classList.add("active");
        applyTheme_(pref);
        renderPreview_(state);
      });
      swWrap.appendChild(s);
    });
    sw.appendChild(swWrap);
    freeBlock.appendChild(sw);

    // Shape (3) - applies to header/头像區
    freeBlock.appendChild(rowBlock_("版型", segButtons_(
      SHAPES.map(x=>({key:x.key,label:x.name})),
      pref.shape,
      (v)=>{ pref.shape=v; savePref_(pref); applyTheme_(pref); renderPreview_(state); }
    )));

    // Paper (4)
    freeBlock.appendChild(rowBlock_("紙感", segButtons_(
      PAPERS.map(x=>({key:x.key,label:x.name})),
      pref.paper,
      (v)=>{ pref.paper=v; savePref_(pref); applyTheme_(pref); renderPreview_(state); }
    )));

    // Premium auras (7)
    const premBlock = el("div","row");
    premBlock.id = "premBlock";
    premBlock.style.gap = "12px";
    premBlock.style.flexDirection = "column";

    const premRow = el("div","row");
    premRow.appendChild(el("div","label","七色氣質"));
    const premWrap = el("div","swatches");
    Object.keys(PREMIUM_AURAS).forEach(k=>{
      const s = el("button","swatch");
      s.type="button";
      s.style.background = PREMIUM_AURAS[k].brand;
      if(pref.premiumAura===k) s.classList.add("active");
      s.addEventListener("click", ()=>{
        pref.premiumAura = k;
        savePref_(pref);
        [...premWrap.querySelectorAll(".swatch")].forEach(x=>x.classList.remove("active"));
        s.classList.add("active");
        applyTheme_(pref);
        renderPreview_(state);
      });
      premWrap.appendChild(s);
    });
    premRow.appendChild(premWrap);
    premBlock.appendChild(premRow);

    controls.appendChild(freeBlock);
    controls.appendChild(premBlock);

    // Hook buttons
    const btnGuide = document.getElementById("btnGuide");
    if(btnGuide){
      btnGuide.addEventListener("click", ()=>toggleGuide_(true));
    }
    const btnForm = document.getElementById("btnForm");

    // ====== DATA STATE ======
    const state = {
      data: null,
      ok: false,
      error: null
    };

    // apply UI visibility + theme
    applyTheme_(pref);
    refreshControlVisibility_(pref);

    // Load data + render
    loadPublicData_()
      .then(payload=>{
        state.ok = true;
        state.data = normalizeData_(payload);
        // Try to set form url if exists
        // If you want to hardcode your Google Form:
        const FALLBACK_FORM = "https://forms.gle/B13z5M2mwwv9ZKME8";
        if(btnForm){
          btnForm.href = FALLBACK_FORM;
        }
        renderPreview_(state);
      })
      .catch(err=>{
        state.ok = false;
        state.error = String(err || "load error");
        renderPreview_(state);
      });

    // Also allow closing modal by tapping backdrop
    document.getElementById("angelGuideModal")?.addEventListener("click", (e)=>{
      if(e.target && e.target.id === "angelGuideModal") toggleGuide_(false);
    });

    // ====== helpers bound to pref changes ======
    function applyTheme_(pref){
      // mode controls: B = icon guide already
      root.style.setProperty("--mode", pref.mode);

      // shape/paper always used (free selection affects header area; premium still allows paper overlay & shapes? — you要求：自由款3版在頭像區；精品以設計感為主，所以精品固定用 arch + spotlight 微光)
      const shapeToUse = (pref.mode === "premium") ? "arch" : pref.shape;
      root.dataset.shape = shapeToUse;
      root.style.setProperty("--header-shape", shapeToUse);

      // Paper: free uses chosen; premium can reuse chosen paper too (更有質感)
      root.style.setProperty("--paper", pref.paper);

      // paper classes handled in render
      // Colors:
      if(pref.mode === "premium"){
        const a = PREMIUM_AURAS[pref.premiumAura] || PREMIUM_AURAS.inkGreen;
        root.style.setProperty("--brand", a.brand);
        root.style.setProperty("--brand2", a.brand2);
        root.style.setProperty("--bg", "#0b0f14");
      }else{
        const c = FREE_COLORS[pref.freeColor] || FREE_COLORS.blue;
        root.style.setProperty("--brand", c.brand);
        root.style.setProperty("--brand2", c.brand2);
        root.style.setProperty("--bg", c.bg);
      }

      refreshControlVisibility_(pref);
    }

    function refreshControlVisibility_(pref){
      const free = document.getElementById("freeBlock");
      const prem = document.getElementById("premBlock");
      if(!free || !prem) return;
      if(pref.mode === "premium"){
        free.classList.add("hidden");
        prem.classList.remove("hidden");
      }else{
        prem.classList.add("hidden");
        free.classList.remove("hidden");
      }
    }
  }

  // ====== Render Preview ======
  function renderPreview_(state){
    const pref = loadPref_();
    const preview = document.getElementById("preview");
    if(!preview) return;

    // Build shell
    const shellMode = pref.mode === "premium" ? "premium" : "free";
    const paperClass = paperClass_(pref.paper);

    const d = state.data || {};
    const name = safeStr_(d["姓名（名片大標題）"] || d["姓名"] || "—");
    const org  = safeStr_(d["單位名稱（如：幸福教養概念館）"] || d["單位名稱"] || "");
    const tagline = safeStr_(d["理念標語（顯示在照片下方，精簡有力）"] || d["理念標語"] || "");
    const services = safeStr_(d["服務項目（核心業務，多項可條列換行）"] || d["服務項目"] || "");
    const titles = safeStr_(d["重要頭銜/獎銜（權威背書項目，多項可條列換行）"] || d["重要頭銜/獎銜"] || "");
    const avatarUrl = toImgUrl_(safeStr_(d["個人專業形象照（名片主圖）"] || d["個人專業形象照"] || ""));
    const logoUrl = toImgUrl_(safeStr_(d["品牌 Logo（右上角小圖標）"] || d["品牌 Logo"] || ""));
    const mediaRaw = safeStr_(d["產品或品牌或活動照片最多3張（內容區插圖）"] || "");
    const mediaList = splitMedia_(mediaRaw).map(toImgUrl_).filter(Boolean).slice(0,3);

    const yt1 = safeStr_(d["影音平台 1（如：YouTube或其他連結）"] || d["影音平台 1"] || "");
    const yt2 = safeStr_(d["影音平台 2（如：TikTok / 抖音或其他連結）"] || d["影音平台 2"] || "");
    const addr = safeStr_(d["影音平台 3（或地址）"] || d["影音平台 3"] || "");
    const soc1 = safeStr_(d["社群平台 1（如：Facebook 粉絲專頁或其他連結）"] || d["社群平台 1"] || "");
    const soc2 = safeStr_(d["社群平台 2（如：Instagram或其他連結）"] || d["社群平台 2"] || "");
    const soc3 = safeStr_(d["社群平台 3（如：Thread / 部落格或其他連結）"] || d["社群平台 3"] || "");
    const lineDM = safeStr_(d["私訊 LINE 連結（第一行填連結，換行填line名稱）"] || d["私訊 LINE 連結"] || "");
    const lineOA = safeStr_(d["​LINE 官方帳號連結（綠色主按鈕）"] || d["LINE 官方帳號連結（綠色主按鈕）"] || "");
    const email = safeStr_(d["一鍵聯繫 Email"] || "");
    const phone = safeStr_(d["一鍵聯繫電話"] || "");
    const wechat = safeStr_(d["微信 ID"] || "");

    const q1 = safeStr_(d["客戶常見提問 1 (Q1)"] || "");
    const a1 = safeStr_(d["專業解答 1 (A1)"] || "");
    const q2 = safeStr_(d["客戶常見提問 2 (Q2)"] || "");
    const a2 = safeStr_(d["專業解答2（A2）"] || d["專業解答 2 (A2)"] || "");

    // Chips: services + titles => show up to 5
    const chips = []
      .concat(splitLines_(services))
      .concat(splitLines_(titles))
      .filter(Boolean)
      .slice(0,5);

    const actions = [];
    // Primary action: LINE OA if exists else LINE DM else email
    if(lineOA) actions.push({ label:"LINE 官方帳號", href: lineOA, primary:true });
    else if(lineDM) actions.push({ label:"私訊 LINE", href: firstLine_(lineDM), primary:true });
    else if(email) actions.push({ label:"Email", href: "mailto:"+email, primary:true });

    // Secondary: phone + email
    if(phone) actions.push({ label:"電話聯繫", href: "tel:"+normalizePhone_(phone), primary:false });
    if(email && !actions.some(x=>x.href.startsWith("mailto:"))) actions.push({ label:"Email", href: "mailto:"+email, primary:false });

    // Links: video/social/address/wechat
    const links = [];
    if(yt1) links.push({title:"影音平台 1", sub: hostOf_(yt1), href: yt1});
    if(yt2) links.push({title:"影音平台 2", sub: hostOf_(yt2), href: yt2});
    if(soc1) links.push({title:"社群平台 1", sub: hostOf_(soc1), href: soc1});
    if(soc2) links.push({title:"社群平台 2", sub: hostOf_(soc2), href: soc2});
    if(soc3) links.push({title:"社群平台 3", sub: hostOf_(soc3), href: soc3});
    if(addr) links.push({title:"地址 / 資訊", sub: addr.length>14 ? addr.slice(0,14)+"…" : addr, href: maybeMap_(addr)});
    if(wechat) links.push({title:"微信 ID", sub: wechat, href: ""});

    // FAQ: keep concise in preview (optional)
    const faq = [];
    if(q1 && a1) faq.push({q:q1,a:a1});
    if(q2 && a2) faq.push({q:q2,a:a2});

    // Build HTML
    preview.innerHTML = `
      <div class="preview-shell ${shellMode}" data-shape="${(pref.mode==="premium")?"arch":pref.shape}">
        <div class="paper-layer ${paperClass}"></div>

        <div class="header">
          <div class="logo">${logoUrl ? `<img src="${esc_(logoUrl)}" alt="logo">` : `<div class="fallback"></div>`}</div>

          <div class="avatar">
            ${avatarUrl ? `<img src="${esc_(avatarUrl)}" alt="avatar" loading="lazy" referrerpolicy="no-referrer">`
                       : `<div class="fallback">${esc_(name.slice(0,1) || "A")}</div>`}
          </div>

          <div class="header-shape"></div>
        </div>

        <div class="body">
          <div class="identity">
            <h1>${esc_(name)}</h1>
            ${org ? `<h2>${esc_(org)}</h2>` : ``}
            ${tagline ? `<div class="tagline">${esc_(tagline)}</div>` : ``}
          </div>

          ${chips.length ? `
            <div class="chips">
              ${chips.map(t=>`<div class="chip">${esc_(t)}</div>`).join("")}
            </div>
          ` : ``}

          ${actions.length ? `
            <div class="actions">
              ${actions.slice(0,2).map(x=>`
                <a class="action ${x.primary ? "primary":""}" href="${esc_(x.href)}" target="_blank" rel="noopener">
                  ${esc_(x.label)} <span style="opacity:.9">→</span>
                </a>
              `).join("")}
            </div>
          `:``}

          ${mediaList.length ? `
            <div class="media">
              <h3>作品 / 活動</h3>
              <div class="carousel" id="mediaCarousel">
                ${mediaList.map((u,idx)=>`
                  <div class="slide" data-full="${esc_(u)}" role="button" tabindex="0">
                    <img src="${esc_(u)}" alt="media-${idx+1}" loading="lazy" referrerpolicy="no-referrer">
                    <div class="cap">點一下看大圖</div>
                  </div>
                `).join("")}
              </div>
            </div>
          `:``}

          ${links.length ? `
            <div class="links">
              ${links.map(l=>`
                <a class="link" ${l.href ? `href="${esc_(l.href)}" target="_blank" rel="noopener"` : `href="javascript:void(0)" onclick="return false;"`}>
                  <div>
                    <strong>${esc_(l.title)}</strong><br>
                    <span>${esc_(l.sub || "")}</span>
                  </div>
                  <div class="arrow">→</div>
                </a>
              `).join("")}
            </div>
          `:``}
        </div>
      </div>
    `;

    // Bind: click to view full image
    const slides = preview.querySelectorAll(".slide[data-full]");
    slides.forEach(sl=>{
      sl.addEventListener("click", ()=> openImage_(sl.getAttribute("data-full")));
      sl.addEventListener("keydown", (e)=>{ if(e.key==="Enter") openImage_(sl.getAttribute("data-full")); });
    });
  }

  // ====== Modal / Full image ======
  function openImage_(url){
    if(!url) return;
    // simple native viewer
    const w = window.open(url, "_blank", "noopener");
    if(!w) location.href = url;
  }

  function ensureGuideModal_(){
    if(document.getElementById("angelGuideModal")) return;
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "angelGuideModal";
    modal.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="填表前準備什麼">
        <div class="hd">
          <strong>填表前準備什麼</strong>
          <button class="close" type="button" id="angelGuideClose">✕</button>
        </div>
        <div class="bd">
          <ol class="list">
            <li>一張清晰的個人照片（有照片就行）</li>
            <li>可選：品牌 Logo</li>
            <li>最多 3 張作品 / 產品 / 活動照片</li>
            <li>想放的連結：影音平台、社群、LINE、Email、電話</li>
            <li>可選：兩題常見問題（Q&A）</li>
          </ol>
          <div class="note">精品款可加購：照片整理 / 轉檔 / 精修服務（之後再上）。</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("angelGuideClose")?.addEventListener("click", ()=>toggleGuide_(false));
  }

  function toggleGuide_(show){
    const m = document.getElementById("angelGuideModal");
    if(!m) return;
    m.classList.toggle("show", !!show);
  }

  // ====== Fetch ======
  async function loadPublicData_(){
    const url = withParam_(API_BASE, "action", "public");
    const res = await fetch(url, { cache:"no-store" });
    if(!res.ok) throw new Error("HTTP "+res.status);
    const json = await res.json();
    if(!json || json.ok !== true) throw new Error(json?.message || "API not ok");
    return json.data || {};
  }

  // ====== Data normalize ======
  function normalizeData_(data){
    // Keep as-is; just ensure strings
    return data || {};
  }

  // ====== Pref ======
  function loadPref_(){
    const raw = localStorage.getItem(LS_KEY);
    let p = null;
    try{ p = raw ? JSON.parse(raw) : null; }catch(_){}
    const def = {
      mode: "free",              // free | premium
      freeColor: "blue",         // 5 colors
      shape: "arch",             // arch | flat | spotlight
      paper: "cotton",           // 4 papers
      premiumAura: "inkGreen"    // 7 auras
    };
    return Object.assign(def, p || {});
  }
  function savePref_(p){
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  }

  // ====== UI builders ======
  function rowBlock_(label, contentEl){
    const row = el("div","row");
    row.appendChild(el("div","label", label));
    row.appendChild(contentEl);
    return row;
  }
  function segButtons_(items, activeKey, onPick){
    const wrap = el("div","seg");
    items.forEach(it=>{
      const b = el("button","btn", it.label);
      b.type="button";
      if(it.key===activeKey) b.classList.add("active");
      b.addEventListener("click", ()=>{
        [...wrap.querySelectorAll(".btn")].forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        onPick(it.key);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function createContainer_(){
    const c = el("div","container");
    document.body.appendChild(c);
    return c;
  }

  function ensureFont(){
    // if HTML didn't include google font
    if(document.querySelector('link[href*="fonts.googleapis.com"][href*="Noto+Sans+TC"]')) return;
    const link = document.createElement("link");
    link.rel="preconnect";
    link.href="https://fonts.googleapis.com";
    document.head.appendChild(link);

    const link2 = document.createElement("link");
    link2.rel="preconnect";
    link2.href="https://fonts.gstatic.com";
    link2.crossOrigin="anonymous";
    document.head.appendChild(link2);

    const css = document.createElement("link");
    css.rel="stylesheet";
    css.href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap";
    document.head.appendChild(css);
  }

  // ====== Paper class ======
  function paperClass_(k){
    switch(k){
      case "grain": return "paper-grain";
      case "linen": return "paper-linen";
      case "watercolor": return "paper-watercolor";
      default: return "paper-cotton";
    }
  }

  // ====== Drive link => direct image ======
  function toImgUrl_(url){
    if(!url) return "";
    url = String(url).trim();
    // if already looks like image direct
    if(/\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url)) return url;

    // open?id=XXXX
    const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if(m1 && m1[1]){
      return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    }

    // /file/d/XXXX/
    const m2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if(m2 && m2[1]){
      return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    }

    // /uc?id=XXXX
    const m3 = url.match(/drive\.google\.com\/uc\?[^#]*id=([a-zA-Z0-9_-]+)/);
    if(m3 && m3[1]){
      return `https://drive.google.com/uc?export=view&id=${m3[1]}`;
    }

    // fallback 그대로 (可能是外部圖床)
    return url;
  }

  function splitMedia_(raw){
    if(!raw) return [];
    return String(raw)
      .split(/[,，\n]/)
      .map(s=>s.trim())
      .filter(Boolean);
  }

  function splitLines_(s){
    if(!s) return [];
    return String(s)
      .split(/\n|\\n|，|,/)
      .map(x=>x.trim())
      .filter(Boolean);
  }

  function firstLine_(s){
    if(!s) return "";
    return String(s).split(/\n|\\n/)[0].trim();
  }

  function normalizePhone_(p){
    return String(p||"").replace(/[^\d+]/g,"");
  }

  function hostOf_(u){
    try{
      const url = new URL(u);
      return url.hostname.replace("www.","");
    }catch(_){
      return (u||"").slice(0,18) + ((u||"").length>18 ? "…" : "");
    }
  }

  function maybeMap_(text){
    const t = String(text||"").trim();
    if(!t) return "";
    // if already url
    if(/^https?:\/\//i.test(t)) return t;
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(t);
  }

  function withParam_(url, k, v){
    const u = new URL(url, location.href);
    u.searchParams.set(k, v);
    return u.toString();
  }

  // ====== misc ======
  function el(tag, cls, text){
    const n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text!=null) n.textContent = text;
    return n;
  }

  function esc_(s){
    return String(s??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function safeStr_(v){
    if(v==null) return "";
    if(typeof v === "string") return v.trim();
    return String(v).trim();
  }

  function iconInfo_(){
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 10v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `;
  }
})();