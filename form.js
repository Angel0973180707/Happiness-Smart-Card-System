import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

(() => {
  "use strict";

  const VERSION = "521.7";
  const DEFAULT_GAS = "";
  const DEFAULT_TENANT = "angel";
  const PAGE_TOTAL = 5;
  const SUBMIT_LOCK_MS = 15000;

  const firebaseConfig = {
    apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
    authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
    projectId: "happiness-smart-card-pro-7389a",
    storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
    messagingSenderId: "143313936007",
    appId: "1:143313936007:web:7c948563c51e8a47d3a222"
  };

  const OPTIONS = {
    plan: [
      { value: "free", label: "自由搭配" },
      { value: "premium", label: "精品設計" }
    ],
    freeColors: [
      { value: "c1", label: "粉", swatch: "linear-gradient(135deg,#ffd1dc,#ff7aa8)" },
      { value: "c2", label: "藍", swatch: "linear-gradient(135deg,#bfe6ff,#4aa3ff)" },
      { value: "c3", label: "橘", swatch: "linear-gradient(135deg,#ffd7b5,#ff7a18)" },
      { value: "c4", label: "紫", swatch: "linear-gradient(135deg,#e7d2ff,#8b5cf6)" },
      { value: "c5", label: "綠", swatch: "linear-gradient(135deg,#c9f7d6,#22c55e)" }
    ],
    styles: [
      { value: "s1", label: "正拱" },
      { value: "s2", label: "平直" },
      { value: "s3", label: "晨曦" }
    ],
    papers: [
      { value: "f1", label: "棉紙" },
      { value: "f2", label: "顆粒" },
      { value: "f3", label: "亞麻" }
    ],
    premiumColors: [
      { value: "p1", label: "胭脂紅" },
      { value: "p2", label: "酒紅" },
      { value: "p3", label: "深藍" },
      { value: "p4", label: "霧紫" },
      { value: "p5", label: "藍灰" },
      { value: "p6", label: "金箔" },
      { value: "p7", label: "褐碳" }
    ],
    photoLimitByPlan: {
      free: 2,
      premium: 5
    }
  };

  const CANON = {
    plan: "plan",
    color: "color",
    style: "style",
    paper: "paper",
    premium_color: "premium_color",

    name: "name",
    unit: "unit",
    title: "title",
    slogan: "slogan",
    services: "services",
    experience: "experience",
    website: "website",

    wechat_id: "wechat_id",
    line_url: "line_url",
    line_oa: "line_oa",
    email: "email",
    phone: "phone",
    address: "address",

    video1: "video1",
    video2: "video2",
    video3: "video3",
    social1: "social1",
    social2: "social2",
    social3: "social3",

    cta_text: "cta_text",
    cta_link: "cta_link",
    wechat_poster: "wechat_poster",

    avatar_img: "avatar_img",
    logo_img: "logo_img",
    photo1_img: "photo1_img",
    photo2_img: "photo2_img",
    photo3_img: "photo3_img",
    photo4_img: "photo4_img",
    photo5_img: "photo5_img",

    avatar_img_fast: "avatar_img_fast",
    logo_img_fast: "logo_img_fast",
    photo1_img_fast: "photo1_img_fast",
    photo2_img_fast: "photo2_img_fast",
    photo3_img_fast: "photo3_img_fast",
    photo4_img_fast: "photo4_img_fast",
    photo5_img_fast: "photo5_img_fast"
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    dot: $("dot"),
    modeText: $("modeText"),
    tenantText: $("tenantText"),
    inviteText: $("inviteText"),
    idText: $("idText"),
    ver: $("ver"),
    mode: $("mode"),
    gas: $("gas"),
    btnTest: $("btnTest"),
    btnSubmit: $("btnSubmit"),
    btnReset: $("btnReset"),
    btnPrev: $("btnPrev"),
    btnNext: $("btnNext"),
    status: $("status"),
    planChips: $("planChips"),
    colorChips: $("colorChips"),
    styleChips: $("styleChips"),
    paperChips: $("paperChips"),
    premiumChips: $("premiumChips"),
    planHint: $("planHint"),
    uploadGrid: $("uploadGrid"),
    submitProgressWrap: $("submitProgressWrap"),
    submitProgressFill: $("submitProgressFill"),
    submitProgressText: $("submitProgressText"),
    submitProgressPercent: $("submitProgressPercent"),
    submitProgressTitle: $("submitProgressTitle"),
    pageIntro: $("pageIntro"),
    pageBadge: $("pageBadge"),
    pageBadgeBottom: $("pageBadgeBottom"),
    flowSub: $("flowSub"),
    summaryBox: $("summaryBox")
  };

  const fields = [
    "name","unit","title","slogan","services","experience","website",
    "phone","email","line_url","line_oa","wechat_id","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text","cta_link","wechat_poster"
  ];

  const qs = new URLSearchParams(location.search);

  const state = {
    tenant: (qs.get("tenant") || DEFAULT_TENANT).trim() || DEFAULT_TENANT,
    sig: (qs.get("sig") || "").trim(),
    invite: (qs.get("invite") || "").trim(),
    mode: (qs.get("mode") || "fill").trim(),
    id: (qs.get("id") || "").trim(),
    token: "",
    submitting: false,
    submitLockedUntil: 0,
    page: 0,

    plan: "",
    color: "",
    style: "",
    paper: "",
    premium_color: "",

    uploads: {},
    authReady: false,
    uid: "",
    lastSubmitFingerprint: ""
  };

  const UPLOAD_SLOTS = [
    { key: "avatar", label: "大頭照", mainField: CANON.avatar_img, fastField: CANON.avatar_img_fast, fileMain: "avatar.webp", fileFast: "avatar_fast.webp" },
    { key: "logo",   label: "Logo",   mainField: CANON.logo_img,   fastField: CANON.logo_img_fast,   fileMain: "logo.webp",   fileFast: "logo_fast.webp" },
    { key: "p1",     label: "照片 1", mainField: CANON.photo1_img, fastField: CANON.photo1_img_fast, fileMain: "photo1.webp", fileFast: "photo1_fast.webp" },
    { key: "p2",     label: "照片 2", mainField: CANON.photo2_img, fastField: CANON.photo2_img_fast, fileMain: "photo2.webp", fileFast: "photo2_fast.webp" },
    { key: "p3",     label: "照片 3", mainField: CANON.photo3_img, fastField: CANON.photo3_img_fast, fileMain: "photo3.webp", fileFast: "photo3_fast.webp" },
    { key: "p4",     label: "照片 4", mainField: CANON.photo4_img, fastField: CANON.photo4_img_fast, fileMain: "photo4.webp", fileFast: "photo4_fast.webp" },
    { key: "p5",     label: "照片 5", mainField: CANON.photo5_img, fastField: CANON.photo5_img_fast, fileMain: "photo5.webp", fileFast: "photo5_fast.webp" }
  ];

  boot();

  async function boot(){
    el.ver.textContent = `v${VERSION}`;
    el.tenantText.textContent = state.tenant;
    el.inviteText.textContent = state.invite || "-";
    el.gas.value = (localStorage.getItem("HSC_GAS_URL") || DEFAULT_GAS || "").trim();

    normalizeMode_();
    updateHeaderUI_();
    renderOptions_();
    renderUploads_();
    bindEvents_();
    renderPage_();
    updateSummary_();

    await initFirebase_();

    updateIntro_();
    logStatus_("已就緒，請依序完成每一步。");
  }

  function normalizeMode_(){
    const m = (state.mode || "fill").toLowerCase();
    state.mode = (m === "update") ? "update" : "fill";
    el.mode.value = state.mode;
  }

  function updateHeaderUI_(){
    el.modeText.textContent = state.mode === "fill" ? "新建資料" : "更新資料";
    el.idText.textContent = state.id || "-";
    el.dot.style.background = state.mode === "fill" ? "var(--warn)" : "var(--accent)";
  }

  function updateIntro_(){
    if(state.mode === "update"){
      el.pageIntro.textContent = "這是更新資料頁面。修改完成後送出即可。invite 參數會全程保留，不會中途掉失。";
    }else{
      el.pageIntro.textContent = "這是分頁式填寫流程。請一步一步完成，照片會先壓縮再上傳，送出時會自動建立你的智慧名片。";
    }
  }

  function bindEvents_(){
    el.btnTest.addEventListener("click", onPing_);
    el.btnSubmit.addEventListener("click", onSubmit_);
    el.btnReset.addEventListener("click", onReset_);
    el.btnPrev.addEventListener("click", onPrevPage_);
    el.btnNext.addEventListener("click", onNextPage_);

    el.gas.addEventListener("change", ()=>{
      localStorage.setItem("HSC_GAS_URL", (el.gas.value || "").trim());
    });

    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      node.addEventListener("input", updateSummary_);
      node.addEventListener("change", updateSummary_);
    });

    document.querySelectorAll(".stepDot").forEach(node=>{
      node.addEventListener("click", ()=>{
        const target = Number(node.dataset.step || 0);
        if (Number.isNaN(target)) return;
        if (target > state.page) {
          const ok = validatePage_(state.page, { silent: false });
          if (!ok) return;
        }
        state.page = Math.max(0, Math.min(PAGE_TOTAL - 1, target));
        renderPage_();
      });
    });
  }

  function renderOptions_(){
    el.planChips.innerHTML = "";
    OPTIONS.plan.forEach(p=>{
      el.planChips.appendChild(makeChip_(p.label, "plan", p.value));
    });

    el.colorChips.innerHTML = "";
    OPTIONS.freeColors.forEach(c=>{
      el.colorChips.appendChild(makeChip_(c.label, "color", c.value, { swatch: c.swatch }));
    });

    el.styleChips.innerHTML = "";
    OPTIONS.styles.forEach(s=>{
      el.styleChips.appendChild(makeChip_(s.label, "style", s.value));
    });

    el.paperChips.innerHTML = "";
    OPTIONS.papers.forEach(p=>{
      el.paperChips.appendChild(makeChip_(p.label, "paper", p.value));
    });

    el.premiumChips.innerHTML = "";
    OPTIONS.premiumColors.forEach(p=>{
      el.premiumChips.appendChild(makeChip_(p.label, "premium_color", p.value));
    });

    syncChipsUI_();
  }

  function makeChip_(label, group, value, opt={}){
    const div = document.createElement("div");
    div.className = "chip";
    div.dataset.group = group;
    div.dataset.value = value;
    div.dataset.on = "0";

    if(opt.swatch){
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = opt.swatch;
      div.appendChild(sw);
    }

    const text = document.createElement("span");
    text.textContent = label;
    div.appendChild(text);

    div.addEventListener("click", ()=>{
      setChoice_(group, value);
      updateSummary_();
    });

    return div;
  }

  function setChoice_(group, value){
    if(group === "plan"){
      state.plan = value;

      if(value === "free"){
        state.premium_color = "";
        if(!state.color) state.color = "c1";
        if(!state.style) state.style = "s1";
        if(!state.paper) state.paper = "f1";
      }else if(value === "premium"){
        state.color = "";
        state.style = "";
        state.paper = "";
        if(!state.premium_color) state.premium_color = "p1";
      }
      applyPlanLimits_();
    }else if(group === "color"){
      if(state.plan !== "free") state.plan = "free";
      state.color = value;
      if(!state.style) state.style = "s1";
      if(!state.paper) state.paper = "f1";
      state.premium_color = "";
      applyPlanLimits_();
    }else if(group === "style"){
      if(state.plan !== "free") state.plan = "free";
      state.style = value;
      if(!state.color) state.color = "c1";
      if(!state.paper) state.paper = "f1";
      state.premium_color = "";
      applyPlanLimits_();
    }else if(group === "paper"){
      if(state.plan !== "free") state.plan = "free";
      state.paper = value;
      if(!state.color) state.color = "c1";
      if(!state.style) state.style = "s1";
      state.premium_color = "";
      applyPlanLimits_();
    }else if(group === "premium_color"){
      if(state.plan !== "premium") state.plan = "premium";
      state.premium_color = value;
      state.color = "";
      state.style = "";
      state.paper = "";
      applyPlanLimits_();
    }

    syncChipsUI_();
  }

  function syncChipsUI_(){
    document.querySelectorAll(".chip").forEach(node=>{
      const g = node.dataset.group;
      const v = node.dataset.value;
      let on = false;

      if(g === "plan") on = state.plan === v;
      if(g === "color") on = state.color === v;
      if(g === "style") on = state.style === v;
      if(g === "paper") on = state.paper === v;
      if(g === "premium_color") on = state.premium_color === v;

      node.dataset.on = on ? "1" : "0";
    });

    const isFree = state.plan === "free";
    const isPremium = state.plan === "premium";

    if (el.colorChips.parentElement) el.colorChips.parentElement.style.opacity = isFree ? "1" : ".42";
    if (el.styleChips.parentElement) el.styleChips.parentElement.style.opacity = isFree ? "1" : ".42";
    if (el.paperChips.parentElement) el.paperChips.parentElement.style.opacity = isFree ? "1" : ".42";
    if (el.premiumChips.parentElement) el.premiumChips.parentElement.style.opacity = isPremium ? "1" : ".42";

    if(isFree){
      el.planHint.textContent = "自由搭配：5 色 × 3 版型 × 3 紙感，最多 2 張照片。";
    }else if(isPremium){
      el.planHint.textContent = "精品設計：7 款精品底色，最多 5 張照片。";
    }else{
      el.planHint.textContent = "請先選方案。";
    }
  }

  function applyPlanLimits_(){
    const limit = OPTIONS.photoLimitByPlan[state.plan] ?? 2;

    UPLOAD_SLOTS.forEach(slot=>{
      if(slot.key.startsWith("p")){
        const idx = Number(slot.key.slice(1));
        const enabled = idx <= limit;
        const box = document.querySelector(`[data-ukey="${slot.key}"]`);
        if(box){
          box.style.opacity = enabled ? "1" : ".40";
          box.dataset.disabled = enabled ? "0" : "1";
        }
        if(!enabled && state.uploads[slot.key]){
          revokePreviewUrl_(state.uploads[slot.key]?.previewUrl);
          delete state.uploads[slot.key];
        }
      }
    });

    renderUploads_();
    syncChipsUI_();
    updateSummary_();
  }

  function renderUploads_(){
    el.uploadGrid.innerHTML = "";
    const limit = OPTIONS.photoLimitByPlan[state.plan] ?? 2;

    UPLOAD_SLOTS.forEach(slot=>{
      const wrap = document.createElement("div");
      wrap.className = "uItem";
      wrap.dataset.ukey = slot.key;

      let disabled = false;
      if(slot.key.startsWith("p")){
        const idx = Number(slot.key.slice(1));
        disabled = idx > limit;
      }
      wrap.dataset.disabled = disabled ? "1" : "0";
      if(disabled) wrap.style.opacity = ".40";

      const head = document.createElement("div");
      head.className = "uItemHead";

      const left = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = slot.label;
      const smallWrap = document.createElement("div");
      const small = document.createElement("small");
      small.textContent = disabled ? "目前方案不使用這格" : "上傳後會先看到預覽";
      smallWrap.appendChild(small);
      left.appendChild(strong);
      left.appendChild(smallWrap);

      const right = document.createElement("div");
      const btnClear = document.createElement("button");
      btnClear.type = "button";
      btnClear.className = "secondary";
      btnClear.textContent = "清除";
      btnClear.disabled = disabled && !state.uploads[slot.key];
      btnClear.addEventListener("click", ()=>{
        if(state.uploads[slot.key]?.previewUrl){
          revokePreviewUrl_(state.uploads[slot.key].previewUrl);
        }
        delete state.uploads[slot.key];
        renderUploads_();
        updateSummary_();
      });
      right.appendChild(btnClear);

      head.appendChild(left);
      head.appendChild(right);

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      const u = state.uploads[slot.key];
      if(u && u.previewUrl){
        const img = document.createElement("img");
        img.src = u.previewUrl;
        thumb.innerHTML = "";
        thumb.appendChild(img);
      }else{
        thumb.textContent = disabled ? "此方案目前不使用這格" : "尚未選擇圖片";
      }

      const mini = document.createElement("div");
      mini.className = "miniRow";

      const file = document.createElement("input");
      file.type = "file";
      file.accept = "image/*";
      file.disabled = disabled;
      file.addEventListener("change", (ev)=>{
        const f = ev.target.files && ev.target.files[0];
        if(!f) return;

        if(disabled){
          warnStatus_(`目前方案不包含 ${slot.label}`);
          file.value = "";
          return;
        }

        if(state.uploads[slot.key]?.previewUrl){
          revokePreviewUrl_(state.uploads[slot.key].previewUrl);
        }

        const url = URL.createObjectURL(f);
        state.uploads[slot.key] = {
          file: f,
          previewUrl: url,
          mainUrl: "",
          fastUrl: ""
        };
        renderUploads_();
        updateSummary_();
      });

      mini.appendChild(file);
      wrap.appendChild(head);
      wrap.appendChild(thumb);
      wrap.appendChild(mini);
      el.uploadGrid.appendChild(wrap);
    });
  }

  async function initFirebase_(){
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const storage = getStorage(app);
    state._fb = { app, auth, storage };

    try{
      await signInAnonymously(auth);
    }catch(err){
      warnStatus_("Firebase 匿名登入失敗，請稍後重整再試。");
    }

    onAuthStateChanged(auth, (user)=>{
      if(user){
        state.authReady = true;
        state.uid = user.uid || "";
      }else{
        state.authReady = false;
        state.uid = "";
      }
    });
  }

  function onPrevPage_(){
    if(state.submitting) return;
    state.page = Math.max(0, state.page - 1);
    renderPage_();
  }

  function onNextPage_(){
    if(state.submitting) return;
    const ok = validatePage_(state.page, { silent: false });
    if(!ok) return;

    state.page = Math.min(PAGE_TOTAL - 1, state.page + 1);
    renderPage_();
  }

  function renderPage_(){
    document.querySelectorAll(".page").forEach(node=>{
      node.classList.toggle("active", Number(node.dataset.page) === state.page);
    });

    document.querySelectorAll(".stepDot").forEach(node=>{
      const idx = Number(node.dataset.step || 0);
      node.dataset.current = idx === state.page ? "1" : "0";
      node.dataset.done = idx < state.page ? "1" : "0";
    });

    const pageText = `第 ${state.page + 1} / ${PAGE_TOTAL} 步`;
    el.pageBadge.textContent = pageText;
    el.pageBadgeBottom.textContent = pageText;
    el.flowSub.textContent = `目前在第 ${state.page + 1} 步，共 ${PAGE_TOTAL} 步。`;

    el.btnPrev.disabled = state.page === 0 || state.submitting;

    if(state.page === PAGE_TOTAL - 1){
      el.btnNext.textContent = "已到最後一步";
      el.btnNext.disabled = true;
      updateSummary_();
    }else{
      el.btnNext.textContent = "下一步";
      el.btnNext.disabled = state.submitting;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validatePage_(pageIndex, opt = {}){
    const silent = !!opt.silent;

    if(pageIndex === 0){
      if(!state.plan){
        if(!silent) warnStatus_("請先選方案，再繼續下一步。");
        return false;
      }
      if(state.plan === "free"){
        if(!state.color || !state.style || !state.paper){
          if(!silent) warnStatus_("自由搭配請完成顏色、版型、紙感。");
          return false;
        }
      }
      if(state.plan === "premium"){
        if(!state.premium_color){
          if(!silent) warnStatus_("精品設計請先選精品底色。");
          return false;
        }
      }
    }

    if(pageIndex === 4){
      if(state.mode === "update"){
        if(!state.sig){
          if(!silent) warnStatus_("更新模式缺少 sig，請重新使用更新連結進入。");
          return false;
        }
        if(!state.id){
          if(!silent) warnStatus_("更新模式缺少名片 ID，請重新使用更新連結進入。");
          return false;
        }
      }
    }

    return true;
  }

  function updateSummary_(){
    if(!el.summaryBox) return;

    const planText = !state.plan
      ? "尚未選擇"
      : state.plan === "free"
        ? `自由搭配｜${labelOf_(OPTIONS.freeColors, state.color)}｜${labelOf_(OPTIONS.styles, state.style)}｜${labelOf_(OPTIONS.papers, state.paper)}`
        : `精品設計｜${labelOf_(OPTIONS.premiumColors, state.premium_color)}`;

    const photoCount = countSelectedPhotos_();
    const photoLimit = OPTIONS.photoLimitByPlan[state.plan] ?? 2;

    const nameText = safeText_($("name")?.value) || "未填寫";
    const titleText = safeText_($("title")?.value) || "未填寫";
    const unitText = safeText_($("unit")?.value) || "未填寫";
    const phoneText = safeText_($("phone")?.value) || "未填寫";
    const lineText = safeText_($("line_url")?.value || $("line_oa")?.value) || "未填寫";
    const mediaCount = ["video1","video2","video3","social1","social2","social3"].filter(id => safeText_($(id)?.value)).length;

    el.summaryBox.innerHTML = [
      makeSummaryRow_("模式", state.mode === "fill" ? "新建資料" : "更新資料"),
      makeSummaryRow_("invite", state.invite || "未帶入"),
      makeSummaryRow_("方案外觀", planText),
      makeSummaryRow_("姓名 / 職稱", `${nameText} / ${titleText}`),
      makeSummaryRow_("單位", unitText),
      makeSummaryRow_("聯絡方式", `${phoneText}｜${lineText}`),
      makeSummaryRow_("多媒體連結", `${mediaCount} 筆`),
      makeSummaryRow_("已選圖片", `${photoCount} / ${photoLimit} 張`)
    ].join("");
  }

  function makeSummaryRow_(label, value){
    return `<div class="sumRow"><span>${escapeHtml_(label)}</span><strong>${escapeHtml_(value || "-")}</strong></div>`;
  }

  function labelOf_(list, value){
    const found = (list || []).find(x => x.value === value);
    return found ? found.label : "未選";
  }

  function countSelectedPhotos_(){
    let n = 0;
    for (const slot of UPLOAD_SLOTS){
      if (state.uploads[slot.key]?.file) n++;
    }
    return n;
  }

  function gasUrl_(){
    const u = (el.gas.value || "").trim();
    if(!u) throw new Error("請先填入 GAS /exec URL");
    return u;
  }

  async function gasPing_(){
    const full = `${gasUrl_()}?action=ping`;
    const r = await fetch(full, { method: "GET", cache: "no-store" });
    return await r.json();
  }

  async function gasReserve_(){
    const q = new URLSearchParams();
    q.set("action", "reserve");
    q.set("tenant", state.tenant);
    q.set("plan", state.plan);
    if(state.sig) q.set("sig", state.sig);
    if(state.invite) q.set("invite", state.invite);
    if(state.uid) q.set("uid", state.uid);

    const full = `${gasUrl_()}?${q.toString()}`;
    const r = await fetch(full, { method: "GET", cache: "no-store" });
    return await r.json();
  }

  async function gasCreate_(payload){
    const full = `${gasUrl_()}?action=create`;
    const r = await fetch(full, {
      method: "POST",
      headers: { "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    return await r.json();
  }

  async function gasUpdate_(payload){
    const full = `${gasUrl_()}?action=update`;
    const r = await fetch(full, {
      method: "POST",
      headers: { "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    return await r.json();
  }

  async function onPing_(){
    try{
      setBusy_(true);
      showProgress_(10, "正在測試連線…");
      const j = await gasPing_();
      showProgress_(100, "連線成功");
      logStatus_("連線正常。\n" + JSON.stringify(j, null, 2));
    }catch(err){
      badStatus_("連線失敗： " + String(err?.message || err));
    }finally{
      setTimeout(hideProgress_, 600);
      setBusy_(false);
    }
  }

  async function onSubmit_(){
    if(state.submitting) return;

    if(Date.now() < state.submitLockedUntil){
      warnStatus_("系統正在保護這次送出，請不要連點，稍等一下再試。");
      return;
    }

    const finalOk = validatePage_(0, { silent: false })
      && validatePage_(4, { silent: false });

    if(!finalOk) return;

    const draftPayload = collectPayload_();
    const currentFingerprint = await fingerprintPayload_(draftPayload);

    if(state.lastSubmitFingerprint && state.lastSubmitFingerprint === currentFingerprint && Date.now() < state.submitLockedUntil){
      warnStatus_("偵測到剛剛送出的是同一份資料，先不要重複送出。");
      return;
    }

    try{
      state.submitting = true;
      state.submitLockedUntil = Date.now() + SUBMIT_LOCK_MS;
      setBusy_(true);
      state.page = PAGE_TOTAL - 1;
      renderPage_();

      if(!state.plan){
        warnStatus_("請先選方案。");
        return;
      }

      if(state.mode === "update"){
        if(!state.sig){
          warnStatus_("更新連結驗證失敗，請重新使用更新連結進入。");
          return;
        }
        if(!state.id){
          warnStatus_("缺少名片 ID，請重新使用更新連結進入。");
          return;
        }
      }

      if(!state.authReady){
        warnStatus_("系統尚在準備中，請稍等一下再送出。");
        return;
      }

      showProgress_(5, "開始整理資料…");

      const payload = collectPayload_();
      payload.invite = state.invite || "";
      payload.tenant = state.tenant;

      if(state.mode === "fill"){
        showProgress_(15, "建立名片保留資料中…");
        const rsv = await gasReserve_();

        if(!rsv || !rsv.ok){
          throw new Error("reserve failed: " + JSON.stringify(rsv));
        }

        state.id = rsv.id || state.id;
        state.token = rsv.token || state.token;
        updateHeaderUI_();

        showProgress_(35, "正在上傳照片…");
        const uploadRes = await uploadAll_(state.id);
        Object.assign(payload, uploadRes);

        payload.id = state.id;
        payload.token = state.token;
        if(state.sig) payload.sig = state.sig;
        if(state.invite) payload.invite = state.invite;
        if(state.uid) payload.uid = state.uid;

        showProgress_(78, "正在送出文字資料…");
        const created = await gasCreate_(payload);

        showProgress_(100, "送出完成");

        if(created && created.ok){
          el.dot.style.background = "var(--ok)";
          state.lastSubmitFingerprint = currentFingerprint;
          logStatus_(
            `✅ 已完成\n名片 ID：${created.id || state.id}\n` +
            `invite：${state.invite || "無"}\n` +
            (created.duplicate ? "系統判定這筆資料已存在，沒有重複建立。\n" : "") +
            "接下來可到後台查找名片。"
          );
        }else{
          el.dot.style.background = "var(--bad)";
          logStatus_("送出完成，但回傳結果不是 ok。\n" + JSON.stringify(created, null, 2));
        }
      }else{
        showProgress_(35, "正在上傳新照片…");
        const uploadRes = await uploadAll_(state.id);
        Object.assign(payload, uploadRes);

        payload.id = state.id;
        payload.sig = state.sig;
        if(state.invite) payload.invite = state.invite;
        if(state.uid) payload.uid = state.uid;

        showProgress_(78, "正在更新資料…");
        const updated = await gasUpdate_(payload);

        showProgress_(100, "更新完成");

        if(updated && updated.ok){
          el.dot.style.background = "var(--ok)";
          state.lastSubmitFingerprint = currentFingerprint;
          logStatus_(
            `✅ 更新成功\n名片 ID：${state.id}\ninvite：${state.invite || "無"}`
          );
        }else{
          el.dot.style.background = "var(--bad)";
          logStatus_("更新完成，但回傳結果不是 ok。\n" + JSON.stringify(updated, null, 2));
        }
      }
    }catch(err){
      el.dot.style.background = "var(--bad)";
      badStatus_("送出失敗： " + String(err?.message || err));
    }finally{
      setTimeout(hideProgress_, 800);
      setBusy_(false);
      state.submitting = false;
    }
  }

  function onReset_(){
    fields.forEach(id=>{
      const node = $(id);
      if(node) node.value = "";
    });

    Object.values(state.uploads).forEach(u=>{
      if(u?.previewUrl) revokePreviewUrl_(u.previewUrl);
    });

    state.plan = "";
    state.color = "";
    state.style = "";
    state.paper = "";
    state.premium_color = "";
    state.uploads = {};
    state.lastSubmitFingerprint = "";
    state.submitLockedUntil = 0;
    state.page = 0;

    renderUploads_();
    syncChipsUI_();
    updateSummary_();
    renderPage_();

    hideProgress_();
    el.dot.style.background = "var(--warn)";
    logStatus_("表單已重設。invite 參數仍保留在本次頁面流程中。");
  }

  function collectPayload_(){
    const p = {};

    p[CANON.plan] = state.plan || "";

    if(state.plan === "free"){
      p[CANON.color] = state.color || "";
      p[CANON.style] = state.style || "";
      p[CANON.paper] = state.paper || "";
      p["free_color"] = state.color || "";
      p["free_style"] = state.style || "";
      p["free_paper"] = state.paper || "";
      p[CANON.premium_color] = "";
    }else if(state.plan === "premium"){
      p[CANON.premium_color] = state.premium_color || "";
      p[CANON.color] = "";
      p[CANON.style] = "";
      p[CANON.paper] = "";
      p["free_color"] = "";
      p["free_style"] = "";
      p["free_paper"] = "";
    }else{
      p[CANON.color] = "";
      p[CANON.style] = "";
      p[CANON.paper] = "";
      p[CANON.premium_color] = "";
    }

    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      const v = String(node.value || "").trim();
      p[id] = v;
    });

    return p;
  }

  async function uploadAll_(cardId){
    const out = {};
    const limit = OPTIONS.photoLimitByPlan[state.plan] ?? 2;

    const tasks = [];
    for(const slot of UPLOAD_SLOTS){
      if(slot.key.startsWith("p")){
        const idx = Number(slot.key.slice(1));
        if(idx > limit) continue;
      }
      const u = state.uploads[slot.key];
      if(!u || !u.file) continue;
      tasks.push({ slot, file: u.file });
    }

    if(!tasks.length) return out;

    let done = 0;
    for(const task of tasks){
      const { slot, file } = task;
      const { mainBlob, fastBlob } = await compressToWebpPair_(file);

      const mainPath = `hsc_cards/${state.tenant}/${cardId}/${slot.fileMain}`;
      const fastPath = `hsc_cards/${state.tenant}/${cardId}/${slot.fileFast}`;

      const { storage } = state._fb;

      const mainRef = sRef(storage, mainPath);
      await uploadBytes(mainRef, mainBlob, { contentType: "image/webp" });
      const mainUrl = await getDownloadURL(mainRef);

      const fastRef = sRef(storage, fastPath);
      await uploadBytes(fastRef, fastBlob, { contentType: "image/webp" });
      const fastUrl = await getDownloadURL(fastRef);

      out[slot.mainField] = mainUrl;
      out[slot.fastField] = fastUrl;

      if(state.uploads[slot.key]){
        state.uploads[slot.key].mainUrl = mainUrl;
        state.uploads[slot.key].fastUrl = fastUrl;
      }

      done++;
      const percent = 35 + Math.round((done / tasks.length) * 35);
      showProgress_(percent, `正在上傳照片：${slot.label}`);
    }

    return out;
  }

  async function compressToWebpPair_(file){
    const img = await fileToImage_(file);
    const mainBlob = await renderToWebp_(img, 1600, 0.82);
    const fastBlob = await renderToWebp_(img, 480, 0.78);
    return { mainBlob, fastBlob };
  }

  function fileToImage_(file){
    return new Promise((resolve, reject)=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e)=>{
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  function renderToWebp_(img, maxSide, quality){
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if(!w0 || !h0) throw new Error("image read failed");

    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d", { alpha: true });
    if(!ctx) throw new Error("canvas context failed");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    return new Promise((resolve, reject)=>{
      canvas.toBlob((blob)=>{
        if(!blob){
          reject(new Error("toBlob failed"));
          return;
        }
        resolve(blob);
      }, "image/webp", quality);
    });
  }

  function setBusy_(on){
    const disabled = !!on;
    if(el.btnTest) el.btnTest.disabled = disabled;
    if(el.btnSubmit) el.btnSubmit.disabled = disabled;
    if(el.btnReset) el.btnReset.disabled = disabled;
    if(el.btnPrev) el.btnPrev.disabled = disabled || state.page === 0;
    if(el.btnNext) el.btnNext.disabled = disabled || state.page === PAGE_TOTAL - 1;

    document.querySelectorAll("input, textarea, button").forEach(node=>{
      if(node.id === "gas" || node.type === "hidden") return;
      if(node === el.btnPrev || node === el.btnNext || node === el.btnTest || node === el.btnSubmit || node === el.btnReset){
        return;
      }
      if(disabled){
        node.setAttribute("disabled", "disabled");
      }else{
        if(!(node.dataset && node.dataset.keepDisabled === "1")){
          node.removeAttribute("disabled");
        }
      }
    });

    renderUploads_();
    renderPage_();
  }

  function showProgress_(percent, text){
    el.submitProgressWrap.style.display = "block";
    const pct = Math.max(0, Math.min(100, percent));
    el.submitProgressFill.style.width = `${pct}%`;
    el.submitProgressPercent.textContent = `${pct}%`;
    el.submitProgressText.textContent = text || "";
    el.submitProgressTitle.textContent = state.mode === "update" ? "更新中" : "送出中";
  }

  function hideProgress_(){
    el.submitProgressWrap.style.display = "none";
    el.submitProgressFill.style.width = "0%";
    el.submitProgressPercent.textContent = "0%";
    el.submitProgressText.textContent = "";
  }

  function logStatus_(txt){
    el.status.textContent = String(txt || "");
  }

  function warnStatus_(txt){
    el.status.textContent = "⚠️ " + String(txt || "");
  }

  function badStatus_(txt){
    el.status.textContent = "❌ " + String(txt || "");
  }

  function safeText_(v){
    return String(v || "").trim();
  }

  function revokePreviewUrl_(url){
    try{
      if(url && typeof url === "string" && url.startsWith("blob:")){
        URL.revokeObjectURL(url);
      }
    }catch(_){}
  }

  async function fingerprintPayload_(payload){
    const json = JSON.stringify({
      tenant: state.tenant,
      invite: state.invite,
      mode: state.mode,
      id: state.id,
      payload
    });

    const enc = new TextEncoder().encode(json);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function escapeHtml_(s){
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();