/* app.js — Happiness Smart Card System v367 (Complete Overwrite)
   Based on v366 flow, fixes:
   - Free(A): color applies to layout area (hero overlay), avatar stays flat (CSS)
   - Layout mapping fixed (正拱=elegant, 平直=clean, 晨曦=focus)
   - Pro(B): full facade color classes, no overlay covering content (CSS)
   - Flow: Step 3 line first, Step 4 form second
*/
(() => {
  const VERSION = 367;

  // ✅ GAS public endpoint (public fixed to TW0001 on backend)
  const API_PUBLIC = "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";
  const FORM_URL   = "https://forms.gle/B13z5M2mwwv9ZKME8";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function driveToViewUrl(url){
    if(!url) return "";
    try{
      const u = String(url).trim();
      const m1 = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if(m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
      const m2 = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
      if(m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
      return u;
    }catch(e){ return String(url||""); }
  }
  function toMapsLink(address){
    if(!address) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  function splitTags(s){
    if(!s) return [];
    return String(s).split(/[,，、\n]/g).map(x=>x.trim()).filter(Boolean).slice(0,6);
  }
  function pick(data, keys){
    for(const k of keys){
      if(data && data[k]!=null && String(data[k]).trim()!=="") return String(data[k]).trim();
    }
    return "";
  }
  function normalizeCardData(raw){
    const data = raw || {};
    return {
      org: pick(data, ["單位名稱（如：幸福教養概念館）","單位名稱","品牌/單位","公司","組織"]),
      name: pick(data, ["姓名（名片大標題）","姓名","名字","稱呼"]),
      slogan: pick(data, ["理念標語（顯示在照片下方，精簡有力）","理念標語","標語","一句話"]),
      service: pick(data, ["服務項目（核心業務，多項可條列換行）","服務項目","核心服務"]),
      honors: pick(data, ["重要頭銜/獎銜（權威背書項目，多項可條列換行）","重要頭銜/獎銜","頭銜","獎項"]),
      avatarUrl: driveToViewUrl(pick(data, ["個人專業形象照（名片主圖）","形象照","頭像","照片","photo"])),
      logoUrl: driveToViewUrl(pick(data, ["Logo（可選）","logo","Logo"])),
      tags: splitTags(pick(data, ["標籤","標籤（可多個）","自我標籤","tag"])),
      phone: pick(data, ["電話","手機","聯絡電話"]),
      email: pick(data, ["Email","email","信箱","電子郵件"]),
      line: pick(data, ["LINE 官方帳號","LINE OA","LINE@","LINE","Line","line"]),
      website: pick(data, ["網站","個人網站","官網","Website"]),
      address: pick(data, ["地址","住址","工作地址","location"]),
      p1: driveToViewUrl(pick(data, ["產品或品牌或活動照片-1","產品照片1","產品照1","活動照1"])),
      p2: driveToViewUrl(pick(data, ["產品或品牌或活動照片-2","產品照片2","產品照2","活動照2"])),
      p3: driveToViewUrl(pick(data, ["產品或品牌或活動照片-3","產品照片3","產品照3","活動照3"])),
      youtube: pick(data, ["YouTube","Youtube","YT","youtube"]),
      ig: pick(data, ["IG","Instagram","instagram","ig"]),
      fb: pick(data, ["FB","Facebook","facebook","fb"]),
    };
  }

  async function fetchPublic(){
    const url = `${API_PUBLIC}?action=public&_=${Date.now()}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if(!j || !j.ok) throw new Error((j && (j.message||j.error)) || "API error");
    return normalizeCardData(j.data || {});
  }

  // ===== State =====
  const state = {
    plan: null, // "A" | "B"
    // Free(A)
    color: "blue",
    layout: "elegant",
    paper: "cotton",
    // Pro(B)
    proColor: "inkgreen",
    proStyle: "editorial",
    data: null,
  };

  // ===== DOM refs =====
  const dom = {};

  function cacheDom(){
    dom.facade = $("#facade");
    dom.panelA = $("#panelA");
    dom.panelB = $("#panelB");
    dom.chosenPlan = $("#chosenPlan");
    dom.chosenNote = $("#chosenNote");
    dom.btnNext = $("#btnNext");
    dom.btnClear = $("#btnClear");

    dom.btnHelp = $("#btnHelp");
    dom.helpModal = $("#helpModal");
    dom.btnHelpClose = $("#btnHelpClose");
    dom.btnHelpOk = $("#btnHelpOk");

    dom.btnGoLineTop = $("#btnGoLineTop");
    dom.btnGoLine = $("#btnGoLine");
    dom.btnGoForm = $("#btnGoForm");

    dom.logoImg = $("#logoImg");
    dom.avatarImg = $("#avatarImg");
    dom.nameText = $("#nameText");
    dom.orgText = $("#orgText");
    dom.sloganText = $("#sloganText");
    dom.servicesText = $("#servicesText");
    dom.titlesText = $("#titlesText");
    dom.gallery = $("#gallery");
    dom.videoLinks = $("#videoLinks");
    dom.socialLinks = $("#socialLinks");
    dom.btnLineOA = $("#btnLineOA");
    dom.btnEmail = $("#btnEmail");
    dom.btnPhone = $("#btnPhone");
    dom.btnMap = $("#btnMap");

    dom.imgViewer = $("#imgViewer");
    dom.viewerImg = $("#viewerImg");
    dom.viewerCap = $("#viewerCap");
  }

  // ===== UI helpers =====
  function openModal(el){
    if(!el) return;
    el.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal(el){
    if(!el) return;
    el.hidden = true;
    document.body.style.overflow = "";
  }

  function applyFacadeClasses(){
    const f = dom.facade;
    if(!f) return;

    // base classes keep: plan-*, theme-*, layout-*, paper-*
    f.classList.toggle("plan-free", state.plan !== "B");
    f.classList.toggle("plan-pro", state.plan === "B");

    // remove old theme/layout/paper/pro classes
    f.className = f.className
      .split(/\s+/)
      .filter(c => !c.startsWith("theme-") && !c.startsWith("layout-") && !c.startsWith("paper-") && !c.startsWith("pro-") && c !== "plan-free" && c !== "plan-pro")
      .concat([ state.plan === "B" ? "plan-pro" : "plan-free" ])
      .join(" ");

    if(state.plan === "B"){
      f.classList.add(`pro-${state.proColor}`);
      f.classList.add(`pro-style-${state.proStyle}`);
      // Pro still uses a layout (hero shape) but no color overlay there.
      f.classList.add(`layout-${state.layout}`);
      f.classList.add(`paper-${state.paper}`); // allow paper texture on Pro too (light)
    }else{
      f.classList.add(`theme-${state.color}`);
      f.classList.add(`layout-${state.layout}`);
      f.classList.add(`paper-${state.paper}`);
    }
  }

  function setSelected(rootSel, matchFn){
    $$(rootSel).forEach(btn => {
      btn.classList.toggle("on", matchFn(btn));
    });
  }

  function setPlan(plan){
    state.plan = plan;
    // show proper panel
    dom.panelA.hidden = plan !== "A";
    dom.panelB.hidden = plan !== "B";

    // chosen bar
    dom.chosenPlan.textContent = plan ? (plan === "A" ? "A｜自由搭配款" : "B｜精品設計款") : "尚未選擇";
    dom.chosenNote.textContent = plan ? "下一步：到下方選版型/顏色，再看門面預覽。" : "請先點選上方其中一個方案。";

    // next button
    dom.btnNext.classList.toggle("disabled", !plan);
    dom.btnNext.setAttribute("aria-disabled", plan ? "false" : "true");
    dom.btnNext.textContent = plan ? "下一步：往下選版型" : "請先選方案 ↑";

    // plan cards UI
    $$(".planCard").forEach(c => c.classList.toggle("selected", c.dataset.plan === plan));

    applyFacadeClasses();
  }

  function scrollToPreview(){
    const el = dom.facade;
    if(!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openLine(){
    const line = (state.data && state.data.line) ? String(state.data.line).trim() : "";
    if(line){
      window.open(line, "_blank", "noopener");
    }else{
      // fallback: do nothing but keep user in page
      alert("目前示範資料沒有提供 LINE 官方帳號連結。");
    }
  }

  function openForm(){
    window.open(FORM_URL, "_blank", "noopener");
  }

  // ===== Render data =====
  function renderLinks(container, items){
    container.innerHTML = "";
    const valid = items.filter(x => x && x.url);
    if(valid.length === 0){
      container.innerHTML = "<span class='muted'>（尚未提供）</span>";
      return;
    }
    for(const it of valid){
      const a = document.createElement("a");
      a.className = "linkPill";
      a.href = it.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = it.label;
      container.appendChild(a);
    }
  }

  function renderGallery(urls){
    dom.gallery.innerHTML = "";
    const list = urls.filter(Boolean);
    if(list.length === 0){
      dom.gallery.innerHTML = "<span class='muted'>（尚未提供）</span>";
      return;
    }
    list.forEach((u, idx) => {
      const div = document.createElement("div");
      div.className = "gItem";
      const img = document.createElement("img");
      img.src = u;
      img.alt = `photo-${idx+1}`;
      div.appendChild(img);
      div.addEventListener("click", () => {
        dom.viewerImg.src = u;
        dom.viewerCap.textContent = `照片 ${idx+1}`;
        openModal(dom.imgViewer);
      });
      dom.gallery.appendChild(div);
    });
  }

  function setContactButtons(data){
    const line = data.line || "";
    const email = data.email || "";
    const phone = data.phone || "";
    const map = data.address ? toMapsLink(data.address) : "";

    // LINE OA
    if(line){
      dom.btnLineOA.href = line;
      dom.btnGoLineTop.onclick = openLine;
      dom.btnGoLine.onclick = openLine;
    }else{
      dom.btnLineOA.href = "#";
      dom.btnGoLineTop.onclick = () => alert("目前示範資料沒有提供 LINE 官方帳號連結。");
      dom.btnGoLine.onclick = () => alert("目前示範資料沒有提供 LINE 官方帳號連結。");
    }

    // Email
    dom.btnEmail.href = email ? `mailto:${email}` : "#";
    dom.btnEmail.onclick = (e) => { if(!email){ e.preventDefault(); alert("尚未提供 Email"); } };

    // Phone
    dom.btnPhone.href = phone ? `tel:${phone}` : "#";
    dom.btnPhone.onclick = (e) => { if(!phone){ e.preventDefault(); alert("尚未提供電話"); } };

    // Map
    if(map){
      dom.btnMap.hidden = false;
      dom.btnMap.href = map;
    }else{
      dom.btnMap.hidden = true;
    }
  }

  function renderCard(data){
    dom.nameText.textContent = data.name || "（未提供姓名）";
    dom.orgText.textContent = data.org || "";
    dom.sloganText.textContent = data.slogan || "";
    dom.servicesText.textContent = data.service || "（尚未提供）";
    dom.titlesText.textContent = data.honors || "（尚未提供）";

    // images
    dom.avatarImg.src = data.avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Crect width='240' height='240' fill='%23eef2ff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23334155'%3EAvatar%3C/text%3E%3C/svg%3E";
    if(data.logoUrl){
      dom.logoImg.hidden = false;
      dom.logoImg.src = data.logoUrl;
    }else{
      dom.logoImg.hidden = true;
      dom.logoImg.removeAttribute("src");
    }

    renderGallery([data.p1, data.p2, data.p3]);

    renderLinks(dom.videoLinks, [
      { label: "YouTube", url: data.youtube || "" },
      { label: "網站", url: data.website || "" },
    ]);

    renderLinks(dom.socialLinks, [
      { label: "IG", url: data.ig || "" },
      { label: "FB", url: data.fb || "" },
      { label: "LINE", url: data.line || "" },
    ]);

    setContactButtons(data);
  }

  // ===== Bind events =====
  function bind(){
    // plan choose
    $$(".planCard").forEach(btn => {
      btn.addEventListener("click", () => setPlan(btn.dataset.plan));
    });

    dom.btnClear.addEventListener("click", () => {
      state.plan = null;
      setPlan(null);
    });

    dom.btnNext.addEventListener("click", () => {
      if(!state.plan) return;
      // scroll to controls panel
      const target = state.plan === "A" ? dom.panelA : dom.panelB;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // A: color
    $$("#panelA .pill.color").forEach(btn => {
      btn.addEventListener("click", () => {
        state.color = btn.dataset.color; // red/blue/orange/purple/green
        setSelected("#panelA .pill.color", b => b.dataset.color === state.color);
        applyFacadeClasses();
        scrollToPreview();
      });
    });

    // A: layout (mapping fixed)
    $$("#panelA .pill[data-layout]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.layout; // elegant/clean/focus
        state.layout = v;
        setSelected("#panelA .pill[data-layout]", b => b.dataset.layout === state.layout);
        applyFacadeClasses();
        scrollToPreview();
      });
    });

    // A: paper
    $$("#panelA .pill[data-paper]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.paper = btn.dataset.paper;
        setSelected("#panelA .pill[data-paper]", b => b.dataset.paper === state.paper);
        applyFacadeClasses();
        scrollToPreview();
      });
    });

    // B: pro color
    $$("#panelB .pill.color").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.procolor;
        if(!v) return;
        state.proColor = v;
        setSelected("#panelB .pill.color", b => b.dataset.procolor === state.proColor);
        applyFacadeClasses();
        scrollToPreview();
      });
    });

    // B: pro style
    $$("#panelB .pill[data-prostyle]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.proStyle = btn.dataset.prostyle;
        setSelected("#panelB .pill[data-prostyle]", b => b.dataset.prostyle === state.proStyle);
        applyFacadeClasses();
        scrollToPreview();
      });
    });

    // top/bottom CTAs
    dom.btnGoLineTop.addEventListener("click", openLine);
    dom.btnGoLine.addEventListener("click", openLine);
    dom.btnGoForm.addEventListener("click", openForm);

    // help modal
    dom.btnHelp.addEventListener("click", () => openModal(dom.helpModal));
    [dom.btnHelpClose, dom.btnHelpOk].forEach(b => b.addEventListener("click", () => closeModal(dom.helpModal)));
    dom.helpModal.addEventListener("click", (e) => {
      const t = e.target;
      if(t && t.dataset && t.dataset.close) closeModal(dom.helpModal);
    });

    // viewer close
    dom.imgViewer.addEventListener("click", (e) => {
      const t = e.target;
      if(t && t.dataset && t.dataset.close) closeModal(dom.imgViewer);
    });
    const closeBtn = $(".viewerClose");
    if(closeBtn) closeBtn.addEventListener("click", () => closeModal(dom.imgViewer));
  }

  function initDefaults(){
    // default plan A (so preview works immediately, but user can switch)
    setPlan("A");

    // default selections UI
    setSelected("#panelA .pill.color", b => b.dataset.color === state.color);
    setSelected("#panelA .pill[data-layout]", b => b.dataset.layout === state.layout);
    setSelected("#panelA .pill[data-paper]", b => b.dataset.paper === state.paper);

    setSelected("#panelB .pill.color", b => b.dataset.procolor === state.proColor);
    setSelected("#panelB .pill[data-prostyle]", b => b.dataset.prostyle === state.proStyle);

    applyFacadeClasses();
  }

  async function boot(){
    cacheDom();
    bind();
    initDefaults();

    try{
      const data = await fetchPublic();
      state.data = data;
      renderCard(data);
    }catch(err){
      console.error(err);
      dom.nameText.textContent = "載入失敗";
      dom.orgText.textContent = "請稍後再試";
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
