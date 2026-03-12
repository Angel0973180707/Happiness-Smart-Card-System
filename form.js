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

  const VERSION = "711.3";
  const DEFAULT_GAS = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const DEFAULT_TENANT = "angel";
  const PAGE_TOTAL = 6;
  const SUBMIT_LOCK_MS = 15000;
  const CUSTOMER_SERVICE_URL = "https://lin.ee/3r2ZePN";

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
      { value: "f2", label: "象牙紙" },
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
    btnGuideToggle: $("btnGuideToggle"),
    guideCard: $("guideCard"),
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
    summaryBox: $("summaryBox"),

    cropModal: $("cropModal"),
    cropStage: $("cropStage"),
    cropCanvas: $("cropCanvas"),
    cropTitle: $("cropTitle"),
    cropDesc: $("cropDesc"),
    cropMeta: $("cropMeta"),
    cropZoomOut: $("cropZoomOut"),
    cropZoomIn: $("cropZoomIn"),
    cropCenter: $("cropCenter"),
    cropReset: $("cropReset"),
    cropCancel: $("cropCancel"),
    cropApply: $("cropApply"),

    livePreviewCard: $("livePreviewCard"),
    previewAvatarWrap: $("previewAvatarWrap"),
    previewAvatar: $("previewAvatar"),
    previewLogoWrap: $("previewLogoWrap"),
    previewLogo: $("previewLogo"),
    previewName: $("previewName"),
    previewUnit: $("previewUnit"),
    previewTitle: $("previewTitle"),
    previewSlogan: $("previewSlogan"),
    previewServicesBlock: $("previewServicesBlock"),
    previewServices: $("previewServices"),
    previewExperienceBlock: $("previewExperienceBlock"),
    previewExperience: $("previewExperience"),
    previewPhotoWall: $("previewPhotoWall"),
    previewEmptyPhotos: $("previewEmptyPhotos")
  };

  const fields = [
    "name","unit","title","slogan","services","experience","website",
    "phone","email","line_url","line_oa","wechat_id","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text","cta_link"
  ];

  const urlFields = [
    "website","line_url","line_oa",
    "video1","video2","video3",
    "social1","social2","social3",
    "cta_link"
  ];

  const qs = new URLSearchParams(location.search);

  const state = {
    tenant: (qs.get("tenant") || DEFAULT_TENANT).trim() || DEFAULT_TENANT,
    sig: (qs.get("sig") || "").trim(),
    invite: (qs.get("invite") || "").trim(),
    mode: (qs.get("mode") || "fill").trim(),
    id: (qs.get("id") || "").trim(),
    reserveId: "",
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
    lastSubmitFingerprint: "",
    prefilling: false,

    crop: {
      open: false,
      slotKey: "",
      slotLabel: "",
      ratio: 1,
      image: null,
      sourceFile: null,
      scale: 1,
      coverScale: 1,
      minScale: 1,
      maxScale: 4,
      x: 0,
      y: 0,
      dragging: false,
      pointerId: null,
      dragStartX: 0,
      dragStartY: 0,
      startX: 0,
      startY: 0,
      canvasW: 0,
      canvasH: 0,
      dpr: 1
    }
  };

  const UPLOAD_SLOTS = [
    {
      key: "avatar",
      label: "大頭照",
      mainField: CANON.avatar_img,
      fastField: CANON.avatar_img_fast,
      fileMain: "avatar.webp",
      fileFast: "avatar_fast.webp",
      ratio: 1,
      stageClass: "ratio-square",
      outputMain: 1200,
      outputFast: 480,
      bgFill: null
    },
    {
      key: "logo",
      label: "Logo",
      mainField: CANON.logo_img,
      fastField: CANON.logo_img_fast,
      fileMain: "logo.webp",
      fileFast: "logo_fast.webp",
      ratio: 1,
      stageClass: "ratio-logo",
      outputMain: 1200,
      outputFast: 480,
      bgFill: null
    },
    {
      key: "p1",
      label: "照片 1",
      mainField: CANON.photo1_img,
      fastField: CANON.photo1_img_fast,
      fileMain: "photo1.webp",
      fileFast: "photo1_fast.webp",
      ratio: 16 / 10,
      stageClass: "ratio-photo",
      outputMain: 1600,
      outputFast: 480,
      bgFill: "#f3ece3"
    },
    {
      key: "p2",
      label: "照片 2",
      mainField: CANON.photo2_img,
      fastField: CANON.photo2_img_fast,
      fileMain: "photo2.webp",
      fileFast: "photo2_fast.webp",
      ratio: 16 / 10,
      stageClass: "ratio-photo",
      outputMain: 1600,
      outputFast: 480,
      bgFill: "#f3ece3"
    },
    {
      key: "p3",
      label: "照片 3",
      mainField: CANON.photo3_img,
      fastField: CANON.photo3_img_fast,
      fileMain: "photo3.webp",
      fileFast: "photo3_fast.webp",
      ratio: 16 / 10,
      stageClass: "ratio-photo",
      outputMain: 1600,
      outputFast: 480,
      bgFill: "#f3ece3"
    },
    {
      key: "p4",
      label: "照片 4",
      mainField: CANON.photo4_img,
      fastField: CANON.photo4_img_fast,
      fileMain: "photo4.webp",
      fileFast: "photo4_fast.webp",
      ratio: 16 / 10,
      stageClass: "ratio-photo",
      outputMain: 1600,
      outputFast: 480,
      bgFill: "#f3ece3"
    },
    {
      key: "p5",
      label: "照片 5",
      mainField: CANON.photo5_img,
      fastField: CANON.photo5_img_fast,
      fileMain: "photo5.webp",
      fileFast: "photo5_fast.webp",
      ratio: 16 / 10,
      stageClass: "ratio-photo",
      outputMain: 1600,
      outputFast: 480,
      bgFill: "#f3ece3"
    }
  ];

  boot();

  async function boot(){
    el.ver.textContent = `v${VERSION}`;
    el.tenantText.textContent = state.tenant;
    el.inviteText.textContent = state.invite || "-";

    const savedGas = (localStorage.getItem("HSC_GAS_URL") || "").trim();
    el.gas.value = savedGas || DEFAULT_GAS;
    localStorage.setItem("HSC_GAS_URL", el.gas.value);

    normalizeMode_();
    updateHeaderUI_();
    renderOptions_();
    renderUploads_();
    bindEvents_();
    renderPage_();
    updateSummary_();
    renderLivePreview_();

    await initFirebase_();

    updateIntro_();
    logStatus_("已準備完成，請依序完成每一步。");

    if (state.mode === "update" && state.id && state.sig) {
      await prefillFromServer_();
    }
  }

  function normalizeMode_(){
    const m = (state.mode || "fill").toLowerCase();
    state.mode = (m === "update") ? "update" : "fill";
    el.mode.value = state.mode;
  }

  function updateHeaderUI_(){
    el.modeText.textContent = state.mode === "fill" ? "新建資料" : "更新資料";
    el.idText.textContent = state.id || state.reserveId || "-";
    el.dot.style.background = state.mode === "fill" ? "var(--warn)" : "var(--accent)";
  }

  function updateIntro_(){
    if(state.mode === "update"){
      el.pageIntro.textContent = "這是更新資料頁面。系統會先回填您原本的內容，您修改後再送出即可。";
    }else{
      el.pageIntro.textContent = "請一步一步完成您的資料。每完成一關，就會進入下一關。";
    }
  }

  function bindEvents_(){
    el.btnTest?.addEventListener("click", onPing_);
    el.btnSubmit?.addEventListener("click", onSubmit_);
    el.btnReset?.addEventListener("click", onReset_);
    el.btnPrev?.addEventListener("click", onPrevPage_);
    el.btnNext?.addEventListener("click", onNextPage_);

    if(el.btnGuideToggle && el.guideCard){
      el.btnGuideToggle.addEventListener("click", ()=>{
        const show = !el.guideCard.classList.contains("show");
        el.guideCard.classList.toggle("show", show);
        el.btnGuideToggle.textContent = show ? "收起填寫建議" : "填寫建議（必讀）";
      });
    }

    el.gas?.addEventListener("change", ()=>{
      const v = (el.gas.value || "").trim();
      el.gas.value = v || DEFAULT_GAS;
      localStorage.setItem("HSC_GAS_URL", el.gas.value);
    });

    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      node.addEventListener("input", ()=>{
        updateSummary_();
        renderLivePreview_();
      });
      node.addEventListener("change", ()=>{
        updateSummary_();
        renderLivePreview_();
      });
      node.addEventListener("blur", ()=>{
        if(urlFields.includes(id) && node.value.trim()){
          node.value = normalizeUrl_(node.value);
        }
      });
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

    bindCropEvents_();

    window.addEventListener("resize", ()=>{
      if(state.crop.open){
        setupCropCanvasSize_();
        clampCropPosition_();
        drawCrop_();
      }
    });
  }

  function bindCropEvents_(){
    const canvas = el.cropCanvas;
    if(!canvas) return;

    canvas.addEventListener("pointerdown", (ev)=>{
      if(!state.crop.open) return;
      state.crop.dragging = true;
      state.crop.pointerId = ev.pointerId;
      state.crop.dragStartX = ev.clientX;
      state.crop.dragStartY = ev.clientY;
      state.crop.startX = state.crop.x;
      state.crop.startY = state.crop.y;
      el.cropStage?.classList.add("dragging");
      try{ canvas.setPointerCapture(ev.pointerId); }catch(_){}
    });

    canvas.addEventListener("pointermove", (ev)=>{
      if(!state.crop.open || !state.crop.dragging) return;
      if(state.crop.pointerId !== null && ev.pointerId !== state.crop.pointerId) return;

      const dx = (ev.clientX - state.crop.dragStartX) * state.crop.dpr;
      const dy = (ev.clientY - state.crop.dragStartY) * state.crop.dpr;
      state.crop.x = state.crop.startX + dx;
      state.crop.y = state.crop.startY + dy;
      clampCropPosition_();
      drawCrop_();
    });

    const stopDrag = (ev)=>{
      if(state.crop.pointerId !== null && ev && ev.pointerId !== state.crop.pointerId) return;
      state.crop.dragging = false;
      state.crop.pointerId = null;
      el.cropStage?.classList.remove("dragging");
    };

    canvas.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointercancel", stopDrag);
    canvas.addEventListener("pointerleave", stopDrag);

    el.cropZoomIn?.addEventListener("click", ()=>{
      if(!state.crop.open) return;
      state.crop.scale = Math.min(state.crop.maxScale, state.crop.scale + 0.12);
      clampCropPosition_();
      drawCrop_();
    });

    el.cropZoomOut?.addEventListener("click", ()=>{
      if(!state.crop.open) return;
      state.crop.scale = Math.max(state.crop.minScale, state.crop.scale - 0.12);
      clampCropPosition_();
      drawCrop_();
    });

    el.cropCenter?.addEventListener("click", ()=>{
      if(!state.crop.open) return;
      state.crop.x = 0;
      state.crop.y = 0;
      drawCrop_();
    });

    el.cropReset?.addEventListener("click", ()=>{
      if(!state.crop.open) return;
      resetCropTransform_();
      drawCrop_();
    });

    el.cropCancel?.addEventListener("click", ()=>{
      closeCropModal_();
    });

    el.cropApply?.addEventListener("click", async ()=>{
      await applyCrop_();
    });
  }

  function renderOptions_(){
    if(!el.planChips || !el.colorChips || !el.styleChips || !el.paperChips || !el.premiumChips){
      throw new Error("表單選項容器缺失，請確認 form.html 已更新到 v711.2+");
    }

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

    const textNode = document.createElement("span");
    textNode.textContent = label;
    div.appendChild(textNode);

    div.addEventListener("click", ()=>{
      setChoice_(group, value);
      updateSummary_();
      renderLivePreview_();
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

    if (el.colorChips?.parentElement) el.colorChips.parentElement.style.opacity = isFree ? "1" : ".42";
    if (el.styleChips?.parentElement) el.styleChips.parentElement.style.opacity = isFree ? "1" : ".42";
    if (el.paperChips?.parentElement) el.paperChips.parentElement.style.opacity = isFree ? "1" : ".42";
    if (el.premiumChips?.parentElement) el.premiumChips.parentElement.style.opacity = isPremium ? "1" : ".42";

    if(el.planHint){
      if(isFree){
        el.planHint.textContent = "自由搭配：5 色 × 3 版型 × 3 紙感。照片最多 2 張。";
      }else if(isPremium){
        el.planHint.textContent = "精品設計：7 款精品底色。照片最多 5 張。";
      }else{
        el.planHint.textContent = "請先選方案。自由搭配與精品設計，會帶出不同外觀與照片張數。";
      }
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
    renderLivePreview_();
  }

  function renderUploads_(){
    if(!el.uploadGrid) return;

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
      small.textContent = disabled ? "目前方案不使用這格" : "可縮小、放大、左右上下移動";
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
        renderLivePreview_();
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
      file.disabled = disabled || state.submitting || state.prefilling;
      file.addEventListener("change", async (ev)=>{
        const f = ev.target.files && ev.target.files[0];
        if(!f) return;

        if(disabled){
          warnStatus_(`目前方案不包含 ${slot.label}`);
          file.value = "";
          return;
        }

        await openCropModal_(slot.key, f);
        file.value = "";
      });

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "ghost";
      btnEdit.textContent = "調整位置";
      btnEdit.disabled = !u || disabled || state.submitting || state.prefilling;
      btnEdit.addEventListener("click", async ()=>{
        const item = state.uploads[slot.key];
        if(!item || !item.sourceFile){
          warnStatus_("請先選圖片。");
          return;
        }
        await openCropModal_(slot.key, item.sourceFile, item.cropState || null);
      });

      mini.appendChild(file);
      mini.appendChild(btnEdit);

      wrap.appendChild(head);
      wrap.appendChild(thumb);
      wrap.appendChild(mini);
      el.uploadGrid.appendChild(wrap);
    });
  }

  async function prefillFromServer_(){
    state.prefilling = true;
    try{
      setBusy_(true);
      showProgress_(12, "正在讀取您原本的資料…");
      const data = await gasReadCardForUpdate_();
      showProgress_(40, "正在回填表單內容…");
      hydrateFormFromItem_(data);
      showProgress_(100, "已完成回填");
      logStatus_(`已載入您原本的資料。\n名片 ID：${state.id}`);
      el.dot.style.background = "var(--accent)";
    }catch(err){
      badStatus_("讀取舊資料失敗： " + String(err?.message || err));
      el.dot.style.background = "var(--bad)";
    }finally{
      setTimeout(hideProgress_, 600);
      setBusy_(false);
      state.prefilling = false;
      renderUploads_();
      updateSummary_();
      renderPage_();
      renderLivePreview_();
    }
  }

  async function gasReadCardForUpdate_(){
    const q = new URLSearchParams();
    q.set("action", "card");
    q.set("id", state.id);
    if(state.sig) q.set("sig", state.sig);
    if(state.tenant) q.set("tenant", state.tenant);

    const full = `${gasUrl_()}?${q.toString()}`;
    const r = await fetch(full, { method: "GET", cache: "no-store" });
    const j = await r.json();

    if(!j || !j.ok){
      throw new Error(j?.error || "card read failed");
    }

    return j.item || j.data || j.card || j;
  }

  function hydrateFormFromItem_(item){
    if(!item || typeof item !== "object") return;

    state.id = safeText_(item.id) || state.id;
    state.token = safeText_(item.token) || state.token;
    state.tenant = safeText_(item.tenant) || state.tenant;

    const plan = pickFirst_(item, ["plan"]);
    const color = pickFirst_(item, ["color", "free_color"]);
    const style = pickFirst_(item, ["style", "free_style"]);
    const paper = pickFirst_(item, ["paper", "free_paper"]);
    const premiumColor = pickFirst_(item, ["premium_color"]);

    state.plan = plan || inferPlan_(item);
    state.color = color || "";
    state.style = style || "";
    state.paper = paper || "";
    state.premium_color = premiumColor || "";

    if(state.plan === "free"){
      if(!state.color) state.color = "c1";
      if(!state.style) state.style = "s1";
      if(!state.paper) state.paper = "f1";
      state.premium_color = "";
    }else if(state.plan === "premium"){
      if(!state.premium_color) state.premium_color = "p1";
      state.color = "";
      state.style = "";
      state.paper = "";
    }

    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      node.value = pickFirst_(item, [id]) || "";
    });

    hydrateImagesFromItem_(item);

    if(el.tenantText) el.tenantText.textContent = state.tenant;
    if(el.inviteText) el.inviteText.textContent = state.invite || pickFirst_(item, ["invite_code", "invite"]) || "-";
    updateHeaderUI_();
    applyPlanLimits_();
    syncChipsUI_();
    renderLivePreview_();
  }

  function hydrateImagesFromItem_(item){
    UPLOAD_SLOTS.forEach(slot=>{
      const mainUrl = safeText_(item[slot.mainField]);
      const fastUrl = safeText_(item[slot.fastField]);
      const previewUrl = fastUrl || mainUrl;

      if(!previewUrl) return;

      if(state.uploads[slot.key]?.previewUrl && state.uploads[slot.key].previewUrl.startsWith("blob:")){
        revokePreviewUrl_(state.uploads[slot.key].previewUrl);
      }

      state.uploads[slot.key] = {
        sourceFile: null,
        previewUrl,
        mainBlob: null,
        fastBlob: null,
        mainUrl,
        fastUrl,
        cropState: null
      };
    });
  }

  function inferPlan_(item){
    const premium = pickFirst_(item, ["premium_color"]);
    if (premium) return "premium";
    return "free";
  }

  function pickFirst_(obj, keys){
    for (const k of keys){
      const v = safeText_(obj?.[k]);
      if (v) return v;
    }
    return "";
  }

  async function initFirebase_(){
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const storage = getStorage(app);
    state._fb = { app, auth, storage };

    try{
      await signInAnonymously(auth);
    }catch(_err){
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
    if(state.submitting || state.prefilling) return;
    state.page = Math.max(0, state.page - 1);
    renderPage_();
  }

  function onNextPage_(){
    if(state.submitting || state.prefilling) return;
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
    if(el.pageBadge) el.pageBadge.textContent = pageText;
    if(el.pageBadgeBottom) el.pageBadgeBottom.textContent = pageText;
    if(el.flowSub) el.flowSub.textContent = `目前在第 ${state.page + 1} 步，共 ${PAGE_TOTAL} 步。`;

    if(el.btnPrev) el.btnPrev.disabled = state.page === 0 || state.submitting || state.prefilling;

    if(el.btnNext){
      if(state.page === PAGE_TOTAL - 1){
        el.btnNext.textContent = "已到最後一步";
        el.btnNext.disabled = true;
        updateSummary_();
      }else{
        el.btnNext.textContent = "下一步";
        el.btnNext.disabled = state.submitting || state.prefilling;
      }
    }
  }

  function validatePage_(pageIndex, opt = {}){
    const silent = !!opt.silent;

    if(pageIndex === 0){
      if(!state.plan){
        if(!silent) warnStatus_("請先選方案，再進入下一步。");
        return false;
      }
      if(state.plan === "free" && (!state.color || !state.style || !state.paper)){
        if(!silent) warnStatus_("自由搭配請完成顏色、版型、紙感。");
        return false;
      }
      if(state.plan === "premium" && !state.premium_color){
        if(!silent) warnStatus_("精品設計請先選精品底色。");
        return false;
      }
    }

    if(pageIndex === 2){
      const email = safeText_($("email")?.value);
      if(email && !isValidEmail_(email)){
        if(!silent) warnStatus_("Email 格式看起來不正確，請再確認。");
        return false;
      }
    }

    if(pageIndex === 3){
      for(const id of urlFields){
        const v = safeText_($(id)?.value);
        if(v && !looksLikeUrl_(v)){
          if(!silent) warnStatus_("連結欄位請貼完整網址，例如：https://...");
          return false;
        }
      }
    }

    if(pageIndex === 5){
      if(state.mode === "fill"){
        if(!state.invite && !state.sig){
          if(!silent) warnStatus_("這個填單連結缺少 invite 或 sig，請使用正式填單連結進入。");
          return false;
        }
      }
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
    const mediaCount = ["website","video1","video2","video3","social1","social2","social3","cta_link"].filter(id => safeText_($(id)?.value)).length;

    el.summaryBox.innerHTML = [
      makeSummaryRow_("模式", state.mode === "fill" ? "新建資料" : "更新資料"),
      makeSummaryRow_("invite", state.invite || "未帶入"),
      makeSummaryRow_("方案外觀", planText),
      makeSummaryRow_("姓名 / 職稱", `${nameText} / ${titleText}`),
      makeSummaryRow_("單位", unitText),
      makeSummaryRow_("聯絡方式", `${phoneText}｜${lineText}`),
      makeSummaryRow_("可點擊連結", `${mediaCount} 筆`),
      makeSummaryRow_("已選圖片", `${photoCount} / ${photoLimit} 張`)
    ].join("");
  }

  function makeSummaryRow_(label, value){
    return `<div class="sumRow"><span>${escapeHtmlHtml_(label)}</span><strong>${escapeHtmlHtml_(value || "-")}</strong></div>`;
  }

  function labelOf_(list, value){
    const found = (list || []).find(x => x.value === value);
    return found ? found.label : "未選";
  }

  function countSelectedPhotos_(){
    let n = 0;
    for (const slot of UPLOAD_SLOTS){
      if (state.uploads[slot.key]?.mainBlob || state.uploads[slot.key]?.previewUrl) n++;
    }
    return n;
  }

  function gasUrl_(){
    const u = (el.gas?.value || "").trim() || DEFAULT_GAS;
    if(!u) throw new Error("GAS /exec URL 未設定");
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

  function getFinalCardId_(response){
    return safeText_(
      response?.formal_id ||
      response?.id ||
      response?.card_id ||
      state.id ||
      state.reserveId
    );
  }

  async function onPing_(){
    try{
      setBusy_(true);
      showProgress_(10, "正在測試連線…");
      const j = await gasPing_();
      showProgress_(100, "連線正常");
      logStatus_("連線正常。\n" + JSON.stringify(j, null, 2));
    }catch(err){
      badStatus_("連線失敗： " + String(err?.message || err));
    }finally{
      setTimeout(hideProgress_, 600);
      setBusy_(false);
    }
  }

  async function onSubmit_(){
    if(state.submitting || state.prefilling) return;

    if(Date.now() < state.submitLockedUntil){
      warnStatus_("系統正在保護這次送出，請不要連點，稍等一下再試。");
      return;
    }

    let finalOk = true;
    for(let i = 0; i < PAGE_TOTAL; i++){
      finalOk = finalOk && validatePage_(i, { silent: false });
    }
    if(!finalOk) return;

    const draftPayload = collectPayload_();
    const currentFingerprint = await fingerprintPayload_(draftPayload);

    if(state.lastSubmitFingerprint && state.lastSubmitFingerprint === currentFingerprint && Date.now() < state.submitLockedUntil){
      warnStatus_("偵測到剛剛送出的是同一份資料，請先不要重複送出。");
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

      if(state.mode === "fill" && !state.invite && !state.sig){
        warnStatus_("這個表單缺少 invite 或 sig，請使用正式填單連結。");
        return;
      }

      if(!state.authReady){
        warnStatus_("系統尚在準備中，請稍等一下再送出。");
        return;
      }

      showProgress_(10, "整理資料中…");

      const payload = collectPayload_();
      payload.tenant = state.tenant;
      payload.invite = state.invite || "";

      if(state.mode === "fill"){
        showProgress_(24, "確認送出資料中…");
        const rsv = await gasReserve_();

        if(!rsv || !rsv.ok){
          throw new Error(rsv?.error || "reserve failed");
        }

        state.reserveId = safeText_(rsv.reserve_id || rsv.draft_id || rsv.id);
        state.token = safeText_(rsv.token);
        updateHeaderUI_();

        showProgress_(42, "處理圖片中…");
        const uploadRes = await uploadAll_(state.reserveId);
        Object.assign(payload, uploadRes);

        payload.reserve_id = state.reserveId;
        payload.id = state.reserveId;
        payload.token = state.token;
        if(state.sig) payload.sig = state.sig;
        if(state.invite) payload.invite = state.invite;
        if(state.uid) payload.uid = state.uid;

        showProgress_(84, "建立名片資料中…");
        const created = await gasCreate_(payload);

        showProgress_(100, "已完成");

        if(created && created.ok){
          state.id = getFinalCardId_(created);
          updateHeaderUI_();
          if(el.dot) el.dot.style.background = "var(--ok)";
          state.lastSubmitFingerprint = currentFingerprint;

          logStatus_(buildSuccessMessage_("create", created));
          appendSuccessActions_();
        }else{
          if(el.dot) el.dot.style.background = "var(--bad)";
          logStatus_("已完成送出，但回傳結果不是 ok。\n" + JSON.stringify(created, null, 2));
        }
      }else{
        showProgress_(42, "處理圖片中…");
        const uploadRes = await uploadAll_(state.id);
        Object.assign(payload, uploadRes);

        payload.id = state.id;
        payload.sig = state.sig;
        if(state.invite) payload.invite = state.invite;
        if(state.uid) payload.uid = state.uid;

        showProgress_(84, "更新名片資料中…");
        const updated = await gasUpdate_(payload);

        showProgress_(100, "已完成");

        if(updated && updated.ok){
          state.id = getFinalCardId_(updated);
          updateHeaderUI_();
          if(el.dot) el.dot.style.background = "var(--ok)";
          state.lastSubmitFingerprint = currentFingerprint;

          logStatus_(buildSuccessMessage_("update", updated));
          appendSuccessActions_();
        }else{
          if(el.dot) el.dot.style.background = "var(--bad)";
          logStatus_("已完成更新，但回傳結果不是 ok。\n" + JSON.stringify(updated, null, 2));
        }
      }
    }catch(err){
      if(el.dot) el.dot.style.background = "var(--bad)";
      badStatus_("送出失敗： " + String(err?.message || err));
    }finally{
      setTimeout(hideProgress_, 900);
      setBusy_(false);
      state.submitting = false;
    }
  }

  function buildSuccessMessage_(kind, response){
    const finalId = getFinalCardId_(response) || "處理中";
    const actionLine = kind === "update"
      ? "您的智慧名片資料已更新完成"
      : "我們已收到您的智慧名片資料";

    return [
      actionLine,
      "",
      `您的資料序號：${finalId}`,
      "",
      "資料送出後，請複製 ID",
      "點進下方按鈕，回覆客服",
      "確認資料並製作您的名片。"
    ].join("\n");
  }

  function appendSuccessActions_(){
    removeSuccessActions_();
    if(!el.status) return;

    const wrap = document.createElement("div");
    wrap.id = "successActions";
    wrap.className = "btns";
    wrap.style.marginTop = "14px";

    const btnCopyId = document.createElement("button");
    btnCopyId.type = "button";
    btnCopyId.textContent = "複製 ID";
    btnCopyId.addEventListener("click", async ()=>{
      const finalId = safeText_(state.id || state.reserveId);
      if(!finalId){
        warnStatus_("目前尚未取得資料序號。");
        return;
      }
      try{
        await copyText_(finalId);
        logStatus_(
          [
            "✅ 已複製資料序號",
            "",
            `您的資料序號：${finalId}`,
            "",
            "資料送出後，請複製 ID",
            "點進下方按鈕，回覆客服",
            "確認資料並製作您的名片。"
          ].join("\n")
        );
      }catch(_){
        warnStatus_("複製失敗，請手動複製資料序號。");
      }
    });

    const btnService = document.createElement("button");
    btnService.type = "button";
    btnService.className = "secondary";
    btnService.textContent = "回覆客服";
    btnService.addEventListener("click", ()=>{
      window.open(CUSTOMER_SERVICE_URL, "_blank", "noopener");
    });

    wrap.appendChild(btnCopyId);
    wrap.appendChild(btnService);
    el.status.insertAdjacentElement("afterend", wrap);
  }

  function removeSuccessActions_(){
    const old = document.getElementById("successActions");
    if(old) old.remove();
  }

  function onReset_(){
    fields.forEach(id=>{
      const node = $(id);
      if(node) node.value = "";
    });

    Object.values(state.uploads).forEach(u=>{
      if(u?.previewUrl && u.previewUrl.startsWith("blob:")){
        revokePreviewUrl_(u.previewUrl);
      }
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

    if(state.mode === "fill"){
      state.reserveId = "";
      state.id = "";
      state.token = "";
    }

    renderUploads_();
    syncChipsUI_();
    updateSummary_();
    renderPage_();
    updateHeaderUI_();
    hideProgress_();
    removeSuccessActions_();
    renderLivePreview_();
    if(el.dot) el.dot.style.background = "var(--warn)";
    logStatus_("表單已重設。invite 參數仍保留在本次頁面流程中。");
  }

  function collectPayload_(){
    const p = {};

    p[CANON.plan] = state.plan || "";

    if(state.plan === "free"){
      p[CANON.color] = state.color || "";
      p[CANON.style] = state.style || "";
      p[CANON.paper] = state.paper || "";
      p.free_color = state.color || "";
      p.free_style = state.style || "";
      p.free_paper = state.paper || "";
      p[CANON.premium_color] = "";
    }else if(state.plan === "premium"){
      p[CANON.premium_color] = state.premium_color || "";
      p[CANON.color] = "";
      p[CANON.style] = "";
      p[CANON.paper] = "";
      p.free_color = "";
      p.free_style = "";
      p.free_paper = "";
    }else{
      p[CANON.color] = "";
      p[CANON.style] = "";
      p[CANON.paper] = "";
      p[CANON.premium_color] = "";
    }

    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      const val = String(node.value || "").trim();
      p[id] = urlFields.includes(id) ? normalizeUrl_(val) : val;
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
      if(!u) continue;

      if(u.mainBlob && u.fastBlob){
        tasks.push({ slot, item: u });
      }else if(u.mainUrl || u.fastUrl){
        out[slot.mainField] = u.mainUrl || "";
        out[slot.fastField] = u.fastUrl || "";
      }
    }

    if(!tasks.length) return out;

    let done = 0;
    for(const task of tasks){
      const { slot, item } = task;
      const safeCardId = cardId || state.id || state.reserveId || "draft";
      const mainPath = `hsc_cards/${state.tenant}/${safeCardId}/${slot.fileMain}`;
      const fastPath = `hsc_cards/${state.tenant}/${safeCardId}/${slot.fileFast}`;

      const { storage } = state._fb;

      const mainRef = sRef(storage, mainPath);
      await uploadBytes(mainRef, item.mainBlob, { contentType: "image/webp" });
      const mainUrl = await getDownloadURL(mainRef);

      const fastRef = sRef(storage, fastPath);
      await uploadBytes(fastRef, item.fastBlob, { contentType: "image/webp" });
      const fastUrl = await getDownloadURL(fastRef);

      out[slot.mainField] = mainUrl;
      out[slot.fastField] = fastUrl;

      item.mainUrl = mainUrl;
      item.fastUrl = fastUrl;

      done++;
      const percent = 42 + Math.round((done / tasks.length) * 28);
      showProgress_(percent, `處理圖片中：${slot.label}`);
    }

    return out;
  }

  async function openCropModal_(slotKey, file, restoreState = null){
    const slot = getSlotByKey_(slotKey);
    if(!slot) return;

    const image = await fileToImage_(file);

    state.crop.open = true;
    state.crop.slotKey = slotKey;
    state.crop.slotLabel = slot.label;
    state.crop.ratio = slot.ratio;
    state.crop.image = image;
    state.crop.sourceFile = file;
    state.crop.stageClass = slot.stageClass;
    state.crop.dragging = false;

    if(el.cropTitle) el.cropTitle.textContent = `調整 ${slot.label} 位置`;
    if(el.cropDesc) el.cropDesc.textContent = "現在可縮小、放大、左右上下移動，再套用。";
    if(el.cropMeta){
      el.cropMeta.innerHTML = slot.key === "avatar"
        ? "可左右、上下拖移圖片。<br>建議把人物臉部置中。<br>現在可縮小保留更多原圖畫面。"
        : slot.key === "logo"
          ? "Logo 建議置中，四周保留適當空間。<br>現在可縮小避免圖樣太貼邊。"
          : "可左右、上下拖移圖片。<br>現在可縮小保留更多原圖畫面。<br>套用後下方成品預覽會同步更新。";
    }

    el.cropStage?.classList.remove("ratio-square", "ratio-logo", "ratio-photo");
    el.cropStage?.classList.add(slot.stageClass);

    el.cropModal?.classList.add("show");

    await nextFrame_();
    setupCropCanvasSize_();

    if(restoreState){
      state.crop.coverScale = computeCoverScale_();
      state.crop.minScale = Math.max(state.crop.coverScale * 0.35, 0.08);
      state.crop.maxScale = Math.max(state.crop.coverScale * 4, state.crop.minScale + 3);
      state.crop.scale = clamp_(restoreState.scale, state.crop.minScale, state.crop.maxScale);
      state.crop.x = restoreState.x;
      state.crop.y = restoreState.y;
      clampCropPosition_();
    }else{
      resetCropTransform_();
    }

    drawCrop_();
  }

  function closeCropModal_(){
    state.crop.open = false;
    state.crop.dragging = false;
    state.crop.pointerId = null;
    state.crop.image = null;
    state.crop.sourceFile = null;
    el.cropModal?.classList.remove("show");
  }

  function setupCropCanvasSize_(){
    if(!el.cropStage || !el.cropCanvas) return;

    const rect = el.cropStage.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssW = Math.max(240, Math.round(rect.width));
    const cssH = Math.max(160, Math.round(rect.height));

    el.cropCanvas.width = Math.round(cssW * dpr);
    el.cropCanvas.height = Math.round(cssH * dpr);
    el.cropCanvas.style.width = `${cssW}px`;
    el.cropCanvas.style.height = `${cssH}px`;

    state.crop.canvasW = el.cropCanvas.width;
    state.crop.canvasH = el.cropCanvas.height;
    state.crop.dpr = dpr;
  }

  function resetCropTransform_(){
    state.crop.coverScale = computeCoverScale_();
    state.crop.minScale = Math.max(state.crop.coverScale * 0.35, 0.08);
    state.crop.maxScale = Math.max(state.crop.coverScale * 4, state.crop.minScale + 3);
    state.crop.scale = state.crop.coverScale;
    state.crop.x = 0;
    state.crop.y = 0;
  }

  function computeCoverScale_(){
    const img = state.crop.image;
    if(!img) return 1;

    const cw = state.crop.canvasW;
    const ch = state.crop.canvasH;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    return Math.max(cw / iw, ch / ih);
  }

  function clampCropPosition_(){
    const img = state.crop.image;
    if(!img) return;

    const cw = state.crop.canvasW;
    const ch = state.crop.canvasH;
    const iw = (img.naturalWidth || img.width) * state.crop.scale;
    const ih = (img.naturalHeight || img.height) * state.crop.scale;

    const maxX = Math.abs(iw - cw) / 2;
    const maxY = Math.abs(ih - ch) / 2;

    state.crop.x = clamp_(state.crop.x, -maxX, maxX);
    state.crop.y = clamp_(state.crop.y, -maxY, maxY);
  }

  function drawCrop_(){
    const img = state.crop.image;
    if(!img || !el.cropCanvas) return;

    const canvas = el.cropCanvas;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = (img.naturalWidth || img.width) * state.crop.scale;
    const ih = (img.naturalHeight || img.height) * state.crop.scale;

    ctx.clearRect(0, 0, cw, ch);

    const slot = getSlotByKey_(state.crop.slotKey);
    if(slot?.bgFill){
      ctx.fillStyle = slot.bgFill;
      ctx.fillRect(0, 0, cw, ch);
    }

    const x = (cw - iw) / 2 + state.crop.x;
    const y = (ch - ih) / 2 + state.crop.y;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, iw, ih);

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.30)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cw - 2, ch - 2);
    ctx.restore();
  }

  async function applyCrop_(){
    const slot = getSlotByKey_(state.crop.slotKey);
    if(!slot || !state.crop.image) return;

    const mainBlob = await exportCropBlob_(slot, slot.outputMain, 0.82);
    const fastBlob = await exportCropBlob_(slot, slot.outputFast, 0.78);

    const previewUrl = URL.createObjectURL(mainBlob);
    const old = state.uploads[slot.key];
    if(old?.previewUrl && old.previewUrl.startsWith("blob:")) revokePreviewUrl_(old.previewUrl);

    state.uploads[slot.key] = {
      sourceFile: state.crop.sourceFile,
      previewUrl,
      mainBlob,
      fastBlob,
      mainUrl: "",
      fastUrl: "",
      cropState: {
        scale: state.crop.scale,
        x: state.crop.x,
        y: state.crop.y
      }
    };

    closeCropModal_();
    renderUploads_();
    updateSummary_();
    renderLivePreview_();
    logStatus_(`已套用 ${slot.label} 圖片位置，成品預覽已同步更新。`);
  }

  async function exportCropBlob_(slot, longSide, quality){
    const img = state.crop.image;
    if(!img) throw new Error("crop image missing");

    const ratio = state.crop.ratio;
    const outW = longSide;
    const outH = Math.round(outW / ratio);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    if(!ctx) throw new Error("export canvas failed");

    if(slot.bgFill){
      ctx.fillStyle = slot.bgFill;
      ctx.fillRect(0, 0, outW, outH);
    }

    const stageW = state.crop.canvasW;
    const stageH = state.crop.canvasH;

    const iw = (img.naturalWidth || img.width) * state.crop.scale;
    const ih = (img.naturalHeight || img.height) * state.crop.scale;
    const x = (stageW - iw) / 2 + state.crop.x;
    const y = (stageH - ih) / 2 + state.crop.y;

    const scaleX = outW / stageW;
    const scaleY = outH / stageH;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x * scaleX, y * scaleY, iw * scaleX, ih * scaleY);

    return new Promise((resolve, reject)=>{
      canvas.toBlob((blob)=>{
        if(!blob){
          reject(new Error("export blob failed"));
          return;
        }
        resolve(blob);
      }, "image/webp", quality);
    });
  }

  function getSlotByKey_(key){
    return UPLOAD_SLOTS.find(s => s.key === key) || null;
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

  function setBusy_(on){
    const disabled = !!on;
    if(el.btnTest) el.btnTest.disabled = disabled;
    if(el.btnSubmit) el.btnSubmit.disabled = disabled;
    if(el.btnReset) el.btnReset.disabled = disabled;
    if(el.btnPrev) el.btnPrev.disabled = disabled || state.page === 0;
    if(el.btnNext) el.btnNext.disabled = disabled || state.page === PAGE_TOTAL - 1;

    document.querySelectorAll("input, textarea, button").forEach(node=>{
      if(node.id === "gas" || node.type === "hidden") return;
      if(
        node === el.btnPrev || node === el.btnNext || node === el.btnTest ||
        node === el.btnSubmit || node === el.btnReset ||
        node === el.btnGuideToggle ||
        node === el.cropZoomOut || node === el.cropZoomIn || node === el.cropCenter ||
        node === el.cropReset || node === el.cropCancel || node === el.cropApply
      ){
        return;
      }
      if(disabled){
        node.setAttribute("disabled", "disabled");
      }else{
        node.removeAttribute("disabled");
      }
    });

    renderUploads_();
    renderPage_();
  }

  function showProgress_(percent, text){
    if(!el.submitProgressWrap || !el.submitProgressFill || !el.submitProgressPercent || !el.submitProgressText || !el.submitProgressTitle) return;

    el.submitProgressWrap.style.display = "block";
    const pct = Math.max(0, Math.min(100, percent));
    el.submitProgressFill.style.width = `${pct}%`;
    el.submitProgressPercent.textContent = `${pct}%`;
    el.submitProgressText.textContent = text || "";
    el.submitProgressTitle.textContent = state.mode === "update" ? "更新中" : "送出中";
  }

  function hideProgress_(){
    if(!el.submitProgressWrap || !el.submitProgressFill || !el.submitProgressPercent || !el.submitProgressText) return;

    el.submitProgressWrap.style.display = "none";
    el.submitProgressFill.style.width = "0%";
    el.submitProgressPercent.textContent = "0%";
    el.submitProgressText.textContent = "";
  }

  function logStatus_(txt){
    if(el.status) el.status.textContent = String(txt || "");
  }

  function warnStatus_(txt){
    if(el.status) el.status.textContent = "⚠️ " + String(txt || "");
  }

  function badStatus_(txt){
    if(el.status) el.status.textContent = "❌ " + String(txt || "");
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
      reserveId: state.reserveId,
      payload
    });

    const enc = new TextEncoder().encode(json);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function escapeHtmlHtml_(s){
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function clamp_(n, min, max){
    return Math.min(max, Math.max(min, n));
  }

  function nextFrame_(){
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  function isValidEmail_(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function looksLikeUrl_(value){
    const v = safeText_(value);
    if(!v) return true;
    return /^https?:\/\/.+/i.test(v);
  }

  function normalizeUrl_(value){
    const v = safeText_(value);
    if(!v) return "";
    if(/^https?:\/\//i.test(v)) return v;
    if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
    return v;
  }

  async function copyText_(text){
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  /* ===== 成品預覽 ===== */

  function renderLivePreview_(){
    if(!el.livePreviewCard) return;

    const plan = state.plan || "free";
    const color = state.color || "c1";
    const style = state.style || "s1";
    const paper = state.paper || "f1";
    const premium = state.premium_color || "p1";

    el.livePreviewCard.dataset.plan = plan;
    el.livePreviewCard.dataset.color = color;
    el.livePreviewCard.dataset.style = style;
    el.livePreviewCard.dataset.paper = paper;
    el.livePreviewCard.dataset.premium = premium;

    const name = safeText_($("name")?.value) || "您的姓名";
    const unit = safeText_($("unit")?.value);
    const title = safeText_($("title")?.value);
    const slogan = safeText_($("slogan")?.value);
    const services = safeText_($("services")?.value);
    const experience = safeText_($("experience")?.value);

    el.previewName.textContent = name;
    el.previewUnit.textContent = unit;
    el.previewTitle.textContent = title;
    el.previewSlogan.textContent = slogan;

    if(services){
      el.previewServicesBlock.style.display = "";
      el.previewServices.textContent = services;
    }else{
      el.previewServicesBlock.style.display = "none";
      el.previewServices.textContent = "";
    }

    if(experience){
      el.previewExperienceBlock.style.display = "";
      el.previewExperience.textContent = experience;
    }else{
      el.previewExperienceBlock.style.display = "none";
      el.previewExperience.textContent = "";
    }

    const avatarUrl = getPreviewImageUrl_("avatar");
    if(avatarUrl){
      el.previewAvatar.src = avatarUrl;
      el.previewAvatar.style.display = "block";
    }else{
      el.previewAvatar.removeAttribute("src");
      el.previewAvatar.style.display = "none";
    }

    const logoUrl = getPreviewImageUrl_("logo");
    if(logoUrl){
      el.previewLogoWrap.style.display = "";
      el.previewLogo.src = logoUrl;
    }else{
      el.previewLogoWrap.style.display = "none";
      el.previewLogo.removeAttribute("src");
    }

    const limit = OPTIONS.photoLimitByPlan[plan] ?? 2;
    const photoKeys = ["p1","p2","p3","p4","p5"].slice(0, limit);
    const urls = photoKeys.map(getPreviewImageUrl_).filter(Boolean);

    el.previewPhotoWall.innerHTML = "";
    if(urls.length){
      el.previewEmptyPhotos.style.display = "none";
      urls.forEach((url)=>{
        const item = document.createElement("div");
        item.className = "hsc-preview-photoItem";
        const img = document.createElement("img");
        img.src = url;
        img.alt = "照片預覽";
        item.appendChild(img);
        el.previewPhotoWall.appendChild(item);
      });
    }else{
      el.previewEmptyPhotos.style.display = "";
    }
  }

  function getPreviewImageUrl_(slotKey){
    const item = state.uploads[slotKey];
    if(!item) return "";
    return item.previewUrl || item.fastUrl || item.mainUrl || "";
  }
})();