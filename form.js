/* ==========================================
 * HSC Fill Form — form.js v514 (COMPLETE OVERWRITE)
 * - GAS v514 compatible
 * - reserve/create use GET (avoid CORS preflight)
 * - Firebase anonymous auth (compat)
 * - Upload path: hsc_cards/{tenant}/{cardId}/{fileName}
 * - NEVER send base64 to GAS
 * - UX: Click submit -> jump to STEP 8 + smooth scroll to submit area
 * ========================================== */

(() => {
  const VERSION = "514.0";

  // ✅ LOCKED to your current exec URL
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_TENANT = "angel";
  const DRAFT_KEY = "HSC_FILL_DRAFT_v5140";

  // image policy
  const IMG_MAX_W = 1600;
  const IMG_QUALITY = 0.82; // webp quality
  const IMG_MAX_MB = 5;

  // step meta
  const STEP_TITLES = {
    1: "STEP 1｜方案",
    2: "STEP 2｜外觀",
    3: "STEP 3｜主資訊",
    4: "STEP 4｜圖片",
    5: "STEP 5｜聯絡",
    6: "STEP 6｜影音社群",
    7: "STEP 7｜精品 CTA",
    8: "STEP 8｜確認送出"
  };

  // dom
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const form = $("#hscForm");

  const el = {
    versionText: $("#versionText"),
    tenantText: $("#tenantText"),
    stepTitle: $("#stepTitle"),
    progressFill: $("#progressFill"),
    pillMsg: $("#pillMsg"),
    cardIdText: $("#cardIdText"),

    prevBtn: $("#prevBtn"),
    nextBtn: $("#nextBtn"),
    resetDraftBtn: $("#resetDraftBtn"),
    openDebug: $("#openDebug"),

    freeThemeCard: $("#freeThemeCard"),
    premiumThemeCard: $("#premiumThemeCard"),
    premiumPhotoRow: $("#premiumPhotoRow"),
    premiumCtaCard: $("#premiumCtaCard"),

    previewBanner: $("#previewBanner"),
    pvName: $("#pvName"),
    pvTitle: $("#pvTitle"),
    pvUnit: $("#pvUnit"),
    pvTheme: $("#pvTheme"),

    // summary
    sumPlan: $("#sumPlan"),
    sumTheme: $("#sumTheme"),
    sumName: $("#sumName"),
    sumUnit: $("#sumUnit"),
    sumTitle: $("#sumTitle"),
    sumVideo: $("#sumVideo"),
    sumSocial: $("#sumSocial"),

    submitBtn: $("#submitBtn"),
  };

  // hidden inputs
  const hidden = {
    plan: $("#plan"),
    color: $("#color"),
    style: $("#style"),
    paper: $("#paper"),
    premium_color: $("#premium_color"),
  };

  // fields
  const fields = {
    name: $("#name"),
    unit: $("#unit"),
    title: $("#title"),
    slogan: $("#slogan"),
    services: $("#services"),
    experience: $("#experience"),

    wechat_id: $("#wechat_id"),
    line_url: $("#line_url"),
    line_oa: $("#line_oa"),
    email: $("#email"),
    phone: $("#phone"),
    address: $("#address"),

    video1: $("#video1"),
    video2: $("#video2"),
    video3: $("#video3"),
    social1: $("#social1"),
    social2: $("#social2"),
    social3: $("#social3"),

    cta_text: $("#cta_text"),
    cta_link: $("#cta_link"),
  };

  // file inputs
  const files = {
    avatarFile: $("#avatarFile"),
    logoFile: $("#logoFile"),
    photo1File: $("#photo1File"),
    photo2File: $("#photo2File"),
    photo3File: $("#photo3File"),
    photo4File: $("#photo4File"),
    photo5File: $("#photo5File"),
  };

  // errors
  const err = {
    plan: $("#err_plan"),
    color: $("#err_color"),
    style: $("#err_style"),
    paper: $("#err_paper"),
    premium_color: $("#err_premium_color"),
    name: $("#err_name"),
    unit: $("#err_unit"),
    title: $("#err_title"),
    avatar: $("#err_avatar"),
    cta_pair: $("#err_cta_pair"),
  };

  // runtime state
  const state = {
    tenant: DEFAULT_TENANT,
    sig: "",

    step: 1,

    // reserve result
    id: "",
    token: "",

    // uploaded URLs
    avatar_img: "",
    logo_img: "",
    photo1_img: "",
    photo2_img: "",
    photo3_img: "",
    photo4_img: "",
    photo5_img: "",

    // UI logs
    logs: [],
  };

  /* -------------------------
   * Utils
   * ------------------------- */
  function log(...args){
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    state.logs.push(`[${new Date().toISOString()}] ${msg}`);
    console.log("[HSC]", ...args);
  }

  function setPill(msg){
    if(el.pillMsg) el.pillMsg.textContent = msg;
  }

  function setErr(key, msg){
    if(err[key]) err[key].textContent = msg || "";
  }

  function markInvalid(inputEl, yes){
    if(!inputEl) return;
    inputEl.classList.toggle("isInvalid", !!yes);
  }

  function getQS(){
    const u = new URL(location.href);
    return {
      tenant: (u.searchParams.get("tenant") || DEFAULT_TENANT).trim() || DEFAULT_TENANT,
      sig: (u.searchParams.get("sig") || "").trim(),
      exp: (u.searchParams.get("exp") || "").trim(), // ignored by GAS for security (payload inside sig)
    };
  }

  function saveDraft(){
    const draft = {
      v: VERSION,
      ts: Date.now(),
      state: {
        tenant: state.tenant,
        sig: state.sig,
        step: state.step,
        id: state.id,
        token: state.token,
        avatar_img: state.avatar_img,
        logo_img: state.logo_img,
        photo1_img: state.photo1_img,
        photo2_img: state.photo2_img,
        photo3_img: state.photo3_img,
        photo4_img: state.photo4_img,
        photo5_img: state.photo5_img,
      },
      values: {
        plan: hidden.plan?.value || "",
        color: hidden.color?.value || "",
        style: hidden.style?.value || "",
        paper: hidden.paper?.value || "",
        premium_color: hidden.premium_color?.value || "",

        name: fields.name?.value || "",
        unit: fields.unit?.value || "",
        title: fields.title?.value || "",
        slogan: fields.slogan?.value || "",
        services: fields.services?.value || "",
        experience: fields.experience?.value || "",

        wechat_id: fields.wechat_id?.value || "",
        line_url: fields.line_url?.value || "",
        line_oa: fields.line_oa?.value || "",
        email: fields.email?.value || "",
        phone: fields.phone?.value || "",
        address: fields.address?.value || "",

        video1: fields.video1?.value || "",
        video2: fields.video2?.value || "",
        video3: fields.video3?.value || "",
        social1: fields.social1?.value || "",
        social2: fields.social2?.value || "",
        social3: fields.social3?.value || "",

        cta_text: fields.cta_text?.value || "",
        cta_link: fields.cta_link?.value || "",
      }
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function loadDraft(){
    try{
      const raw = localStorage.getItem(DRAFT_KEY);
      if(!raw) return false;
      const draft = JSON.parse(raw);
      if(!draft || !draft.state || !draft.values) return false;

      const s = draft.state;
      state.tenant = s.tenant || DEFAULT_TENANT;
      state.sig = s.sig || "";
      state.step = Number(s.step || 1);
      state.id = s.id || "";
      state.token = s.token || "";

      state.avatar_img = s.avatar_img || "";
      state.logo_img = s.logo_img || "";
      state.photo1_img = s.photo1_img || "";
      state.photo2_img = s.photo2_img || "";
      state.photo3_img = s.photo3_img || "";
      state.photo4_img = s.photo4_img || "";
      state.photo5_img = s.photo5_img || "";

      const v = draft.values;

      if(hidden.plan) hidden.plan.value = v.plan || "";
      if(hidden.color) hidden.color.value = v.color || "";
      if(hidden.style) hidden.style.value = v.style || "";
      if(hidden.paper) hidden.paper.value = v.paper || "";
      if(hidden.premium_color) hidden.premium_color.value = v.premium_color || "";

      if(fields.name) fields.name.value = v.name || "";
      if(fields.unit) fields.unit.value = v.unit || "";
      if(fields.title) fields.title.value = v.title || "";
      if(fields.slogan) fields.slogan.value = v.slogan || "";
      if(fields.services) fields.services.value = v.services || "";
      if(fields.experience) fields.experience.value = v.experience || "";

      if(fields.wechat_id) fields.wechat_id.value = v.wechat_id || "";
      if(fields.line_url) fields.line_url.value = v.line_url || "";
      if(fields.line_oa) fields.line_oa.value = v.line_oa || "";
      if(fields.email) fields.email.value = v.email || "";
      if(fields.phone) fields.phone.value = v.phone || "";
      if(fields.address) fields.address.value = v.address || "";

      if(fields.video1) fields.video1.value = v.video1 || "";
      if(fields.video2) fields.video2.value = v.video2 || "";
      if(fields.video3) fields.video3.value = v.video3 || "";
      if(fields.social1) fields.social1.value = v.social1 || "";
      if(fields.social2) fields.social2.value = v.social2 || "";
      if(fields.social3) fields.social3.value = v.social3 || "";

      if(fields.cta_text) fields.cta_text.value = v.cta_text || "";
      if(fields.cta_link) fields.cta_link.value = v.cta_link || "";

      return true;
    }catch(e){
      return false;
    }
  }

  function clearDraft(){
    localStorage.removeItem(DRAFT_KEY);
  }

  function getStepEl_(n){
    return document.querySelector(`.step[data-step="${n}"]`);
  }

  function scrollToSubmit_(){
    // Prefer scroll to submit button; fallback to STEP 8 section
    const target =
      el.submitBtn ||
      $("#submitBtn") ||
      getStepEl_(8) ||
      $("#step8") ||
      $("#step8Card") ||
      form;

    if(!target) return;
    try{
      target.scrollIntoView({ behavior:"smooth", block:"start" });
    }catch(_){
      // old browsers
      const rect = target.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + rect.top - 16);
    }
  }

  function showStep(n){
    state.step = n;
    $$(".step").forEach(sec => {
      const sn = Number(sec.getAttribute("data-step"));
      sec.classList.toggle("hide", sn !== n);
    });

    if(el.stepTitle) el.stepTitle.textContent = STEP_TITLES[n] || `STEP ${n}`;
    const pct = Math.round((n / 8) * 100);
    if(el.progressFill) el.progressFill.style.width = `${pct}%`;

    if(el.prevBtn) el.prevBtn.style.visibility = (n <= 1) ? "hidden" : "visible";
    if(el.nextBtn) el.nextBtn.classList.toggle("hide", n >= 8);
    saveDraft();

    refreshPlanDependentUI_();
    refreshPreview_();
    refreshSummary_();
    refreshHeader_();
  }

  function refreshHeader_(){
    if(el.versionText) el.versionText.textContent = VERSION;
    if(el.tenantText) el.tenantText.textContent = state.tenant || DEFAULT_TENANT;
    if(el.cardIdText) el.cardIdText.textContent = state.id ? state.id : "-";
  }

  function planIsPremium(){
    return (hidden.plan?.value || "").trim() === "premium";
  }

  function refreshPlanDependentUI_(){
    const premium = planIsPremium();

    if(el.freeThemeCard) el.freeThemeCard.classList.toggle("hide", premium);
    if(el.premiumThemeCard) el.premiumThemeCard.classList.toggle("hide", !premium);

    if(el.premiumPhotoRow) el.premiumPhotoRow.classList.toggle("hide", !premium);
    if(el.premiumCtaCard) el.premiumCtaCard.classList.toggle("hide", !premium);

    // If free, clear premium-only choices
    if(!premium){
      if(hidden.premium_color) hidden.premium_color.value = "";
      if(fields.cta_text) fields.cta_text.value = "";
      if(fields.cta_link) fields.cta_link.value = "";
      state.photo3_img = "";
      state.photo4_img = "";
      state.photo5_img = "";
    }
  }

  function refreshPreview_(){
    if(!el.pvName || !el.pvTitle || !el.pvUnit || !el.pvTheme) return;

    const nm = (fields.name?.value || "").trim() || "姓名";
    const tt = (fields.title?.value || "").trim() || "頭銜";
    const un = (fields.unit?.value || "").trim() || "單位";
    el.pvName.textContent = nm;
    el.pvTitle.textContent = tt;
    el.pvUnit.textContent = un;

    if(planIsPremium()){
      const pc = (hidden.premium_color?.value || "").trim() || "p?";
      el.pvTheme.textContent = `${pc}`;
    }else{
      const c = (hidden.color?.value || "").trim() || "c?";
      const s = (hidden.style?.value || "").trim() || "s?";
      const f = (hidden.paper?.value || "").trim() || "f?";
      el.pvTheme.textContent = `${c}/${s}/${f}`;
    }
  }

  function refreshSummary_(){
    if(!el.sumPlan) return;

    el.sumPlan.textContent = planIsPremium() ? "精品設計" : (hidden.plan?.value ? "自由搭配" : "-");
    if(el.sumTheme){
      el.sumTheme.textContent = planIsPremium()
        ? (hidden.premium_color?.value || "-")
        : `${hidden.color?.value || "-"} / ${hidden.style?.value || "-"} / ${hidden.paper?.value || "-"}`;
    }

    if(el.sumName) el.sumName.textContent = (fields.name?.value || "-").trim() || "-";
    if(el.sumUnit) el.sumUnit.textContent = (fields.unit?.value || "-").trim() || "-";
    if(el.sumTitle) el.sumTitle.textContent = (fields.title?.value || "-").trim() || "-";

    const vids = [fields.video1?.value, fields.video2?.value, fields.video3?.value].filter(Boolean).length;
    const socs = [fields.social1?.value, fields.social2?.value, fields.social3?.value].filter(Boolean).length;
    if(el.sumVideo) el.sumVideo.textContent = vids ? `${vids} 筆` : "-";
    if(el.sumSocial) el.sumSocial.textContent = socs ? `${socs} 筆` : "-";
  }

  /* -------------------------
   * Selection binding (chips / swatches)
   * ------------------------- */
  function bindChips_(){
    document.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip");
      if(!chip) return;
      const group = chip.getAttribute("data-chip-group");
      const val = chip.getAttribute("data-value");
      if(!group || !val) return;

      const groupChips = $$(`.chip[data-chip-group="${group}"]`);
      groupChips.forEach(c => c.setAttribute("data-on", "0"));
      chip.setAttribute("data-on", "1");

      if(hidden[group]){
        hidden[group].value = val;
      }

      if(group === "plan"){
        refreshPlanDependentUI_();
      }

      saveDraft();
      refreshPreview_();
      refreshSummary_();
    });

    document.addEventListener("click", (ev) => {
      const sw = ev.target.closest(".swatch");
      if(!sw) return;
      const row = sw.closest(".swatch-row");
      if(!row) return;
      const group = row.getAttribute("data-swatch-group");
      const val = sw.getAttribute("data-value");
      if(!group || !val) return;

      row.querySelectorAll(".swatch").forEach(x => x.setAttribute("data-on", "0"));
      sw.setAttribute("data-on", "1");

      if(hidden[group]){
        hidden[group].value = val;
      }

      saveDraft();
      refreshPreview_();
      refreshSummary_();
    });
  }

  function restoreSelectionUI_(){
    // chips
    ["plan","style","paper"].forEach(g=>{
      const v = (hidden[g]?.value || "").trim();
      $$(`.chip[data-chip-group="${g}"]`).forEach(c=>{
        c.setAttribute("data-on", (c.getAttribute("data-value") === v) ? "1" : "0");
      });
    });

    // swatches
    const setSw = (group, val) => {
      const row = document.querySelector(`.swatch-row[data-swatch-group="${group}"]`);
      if(!row) return;
      row.querySelectorAll(".swatch").forEach(s=>{
        s.setAttribute("data-on", (s.getAttribute("data-value") === val) ? "1" : "0");
      });
    };

    setSw("color", (hidden.color?.value||"").trim());
    setSw("premium_color", (hidden.premium_color?.value||"").trim());
  }

  /* -------------------------
   * GAS calls (GET)
   * ------------------------- */
  async function gasGet_(params){
    const u = new URL(GAS_URL);
    Object.entries(params).forEach(([k,v])=>{
      if(v === undefined || v === null || v === "") return;
      u.searchParams.set(k, String(v));
    });
    const url = u.toString();
    log("GET", url);

    const res = await fetch(url, { method:"GET", mode:"cors", cache:"no-store" });
    const txt = await res.text();
    let json;
    try{ json = JSON.parse(txt); }catch(e){
      throw new Error("GAS JSON parse fail: " + txt.slice(0, 180));
    }
    if(!json.ok){
      throw new Error(json.error || "GAS error");
    }
    return json;
  }

  async function pingAndSchema_(){
    setPill("檢查系統中…");
    const ping = await gasGet_({ action:"ping" });
    log("ping ok", ping);

    const sch = await gasGet_({ action:"schemaCheck" });
    log("schema ok", sch);

    setPill("系統正常 ✅");
  }

  /* -------------------------
   * Firebase auth + upload
   * ------------------------- */
  async function ensureFirebaseAuthed_(){
    if(!window.firebase) throw new Error("firebase not loaded");
    if(!firebase.auth) throw new Error("firebase-auth-compat.js not loaded");

    const auth = firebase.auth();
    const cur = auth.currentUser;
    if(cur){
      log("firebase already authed", cur.uid);
      return cur;
    }
    log("firebase signing in anonymously...");
    const cred = await auth.signInAnonymously();
    log("firebase anon ok", cred.user && cred.user.uid);
    return cred.user;
  }

  async function fileToWebpBlob_(file){
    if(!file) return null;
    if(file.size > IMG_MAX_MB * 1024 * 1024){
      throw new Error(`檔案太大（>${IMG_MAX_MB}MB）：${file.name}`);
    }

    const img = await loadImage_(file);
    const { canvas } = drawToCanvas_(img, IMG_MAX_W);

    const blob = await canvasToBlob_(canvas, "image/webp", IMG_QUALITY);
    if(!blob) throw new Error("image convert failed");
    return blob;
  }

  function loadImage_(file){
    return new Promise((resolve, reject)=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
      img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error("image load failed")); };
      img.src = url;
    });
  }

  function drawToCanvas_(img, maxW){
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if(w > maxW){
      const ratio = maxW / w;
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, w, h };
  }

  function canvasToBlob_(canvas, type, quality){
    return new Promise((resolve)=>{
      canvas.toBlob((blob)=>resolve(blob), type, quality);
    });
  }

  async function uploadBlob_(tenant, cardId, fileName, blob){
    await ensureFirebaseAuthed_();

    const storage = firebase.storage();
    const path = `hsc_cards/${tenant}/${cardId}/${fileName}`;
    const ref = storage.ref().child(path);

    log("uploading", { path, sizeKB: Math.round(blob.size/1024) });

    const snap = await ref.put(blob, {
      contentType: "image/webp",
      cacheControl: "public,max-age=31536000"
    });
    const url = await snap.ref.getDownloadURL();
    log("upload ok", { path, url: url.slice(0,80) + "..." });
    return url;
  }

  /* -------------------------
   * Validation by step
   * ------------------------- */
  function validateStep_(n){
    // clear errs
    Object.values(err).forEach(e => { if(e) e.textContent = ""; });
    // remove invalid styles
    [fields.name, fields.unit, fields.title].forEach(i => markInvalid(i,false));

    if(n === 1){
      if(!hidden.plan?.value){
        setErr("plan", "請先選擇方案");
        return false;
      }
      return true;
    }

    if(n === 2){
      if(planIsPremium()){
        if(!hidden.premium_color?.value){
          setErr("premium_color", "請選擇精品底色");
          return false;
        }
      }else{
        if(!hidden.color?.value){ setErr("color", "請選擇顏色"); return false; }
        if(!hidden.style?.value){ setErr("style", "請選擇版型"); return false; }
        if(!hidden.paper?.value){ setErr("paper", "請選擇紙感"); return false; }
      }
      return true;
    }

    if(n === 3){
      const name = (fields.name?.value||"").trim();
      const unit = (fields.unit?.value||"").trim();
      const title = (fields.title?.value||"").trim();

      let ok = true;
      if(!name){ setErr("name", "姓名必填"); markInvalid(fields.name,true); ok=false; }
      if(!unit){ setErr("unit", "單位必填"); markInvalid(fields.unit,true); ok=false; }
      if(!title){ setErr("title", "頭銜必填"); markInvalid(fields.title,true); ok=false; }
      return ok;
    }

    if(n === 4){
      const hasAvatarUrl = !!state.avatar_img;
      const hasAvatarFile = !!(files.avatarFile?.files && files.avatarFile.files[0]);
      if(!hasAvatarUrl && !hasAvatarFile){
        setErr("avatar", "個人照必填（請選擇檔案）");
        return false;
      }
      return true;
    }

    if(n === 7 && planIsPremium()){
      const t = (fields.cta_text?.value||"").trim();
      const l = (fields.cta_link?.value||"").trim();
      if((t && !l) || (!t && l)){
        setErr("cta_pair", "CTA 文字與連結要一起填（或都留空）");
        return false;
      }
      return true;
    }

    return true;
  }

  /* -------------------------
   * Reserve / Upload / Create
   * ------------------------- */
  async function reserveIfNeeded_(){
    if(state.id && state.token){
      return { id: state.id, token: state.token };
    }
    setPill("建立草稿卡中…");

    const params = {
      action: "reserve",
      tenant: state.tenant,
      plan: hidden.plan?.value || "free",
    };
    if(state.sig) params.sig = state.sig;

    const r = await gasGet_(params);
    state.id = r.id;
    state.token = r.token;

    refreshHeader_();
    saveDraft();

    setPill("草稿卡已建立 ✅");
    return { id: state.id, token: state.token };
  }

  async function uploadAllImages_(){
    const tenant = state.tenant;
    const cardId = state.id;

    // avatar (required)
    if(!state.avatar_img && files.avatarFile?.files && files.avatarFile.files[0]){
      setPill("個人照壓縮上傳中…");
      const blob = await fileToWebpBlob_(files.avatarFile.files[0]);
      state.avatar_img = await uploadBlob_(tenant, cardId, "avatar.webp", blob);
      saveDraft();
    }

    // logo
    if(!state.logo_img && files.logoFile?.files && files.logoFile.files[0]){
      setPill("Logo 壓縮上傳中…");
      const blob = await fileToWebpBlob_(files.logoFile.files[0]);
      state.logo_img = await uploadBlob_(tenant, cardId, "logo.webp", blob);
      saveDraft();
    }

    // photos 1..2
    for(const i of [1,2]){
      const key = `photo${i}_img`;
      const input = files[`photo${i}File`];
      if(!state[key] && input?.files && input.files[0]){
        setPill(`照片 ${i} 壓縮上傳中…`);
        const blob = await fileToWebpBlob_(input.files[0]);
        state[key] = await uploadBlob_(tenant, cardId, `photo${i}.webp`, blob);
        saveDraft();
      }
    }

    // premium photos 3..5
    if(planIsPremium()){
      for(const i of [3,4,5]){
        const key = `photo${i}_img`;
        const input = files[`photo${i}File`];
        if(!state[key] && input?.files && input.files[0]){
          setPill(`照片 ${i} 壓縮上傳中…`);
          const blob = await fileToWebpBlob_(input.files[0]);
          state[key] = await uploadBlob_(tenant, cardId, `photo${i}.webp`, blob);
          saveDraft();
        }
      }
    }else{
      state.photo3_img = "";
      state.photo4_img = "";
      state.photo5_img = "";
    }

    setPill("圖片處理完成 ✅");
  }

  async function createCard_(){
    setPill("寫入 card_db 中…");

    const p = {
      action: "create",
      tenant: state.tenant,
      id: state.id,
      token: state.token,

      plan: hidden.plan?.value || "free",
      color: hidden.color?.value || "",
      style: hidden.style?.value || "",
      paper: hidden.paper?.value || "",
      premium_color: hidden.premium_color?.value || "",

      name: (fields.name?.value||"").trim(),
      unit: (fields.unit?.value||"").trim(),
      title: (fields.title?.value||"").trim(),
      slogan: (fields.slogan?.value||"").trim(),
      services: (fields.services?.value||"").trim(),
      experience: (fields.experience?.value||"").trim(),

      avatar_img: state.avatar_img || "",
      logo_img: state.logo_img || "",
      photo1_img: state.photo1_img || "",
      photo2_img: state.photo2_img || "",
      photo3_img: state.photo3_img || "",
      photo4_img: state.photo4_img || "",
      photo5_img: state.photo5_img || "",

      wechat_id: (fields.wechat_id?.value||"").trim(),
      line_url: (fields.line_url?.value||"").trim(),
      line_oa: (fields.line_oa?.value||"").trim(),
      email: (fields.email?.value||"").trim(),
      phone: (fields.phone?.value||"").trim(),
      address: (fields.address?.value||"").trim(),

      video1: (fields.video1?.value||"").trim(),
      video2: (fields.video2?.value||"").trim(),
      video3: (fields.video3?.value||"").trim(),

      social1: (fields.social1?.value||"").trim(),
      social2: (fields.social2?.value||"").trim(),
      social3: (fields.social3?.value||"").trim(),

      cta_text: planIsPremium() ? (fields.cta_text?.value||"").trim() : "",
      cta_link: planIsPremium() ? (fields.cta_link?.value||"").trim() : "",
    };

    if(state.sig) p.sig = state.sig;

    const r = await gasGet_(p);

    setPill("已寫入 card_db ✅");
    log("create ok", r);

    clearDraft();

    alert(`送出成功 ✅\n\n草稿卡ID：${state.id}\n（目前狀態預設 inactive）`);
  }

  /* -------------------------
   * Handlers
   * ------------------------- */
  async function onSubmit_(ev){
    ev.preventDefault();

    // ✅ UX: always jump to STEP 8 and scroll to submit info area
    showStep(8);
    requestAnimationFrame(() => scrollToSubmit_());

    // Validate all needed steps
    const must = [1,2,3,4,7];
    for(const s of must){
      if(s === 7 && !planIsPremium()) continue;
      if(!validateStep_(s)){
        showStep(s);
        setPill("請先完成必填項目");
        requestAnimationFrame(() => {
          const stepEl = getStepEl_(s);
          if(stepEl) stepEl.scrollIntoView({ behavior:"smooth", block:"start" });
        });
        return;
      }
    }

    try{
      if(el.submitBtn) el.submitBtn.disabled = true;

      await pingAndSchema_();      // quick server sanity
      await reserveIfNeeded_();    // must have id/token
      await uploadAllImages_();    // upload images to Firebase
      await createCard_();         // create write to sheet

    }catch(e){
      console.error(e);
      setPill("送出失敗 ❌");
      alert("送出失敗：\n" + (e && e.message ? e.message : String(e)));
    }finally{
      if(el.submitBtn) el.submitBtn.disabled = false;
    }
  }

  function bindNav_(){
    if(el.prevBtn){
      el.prevBtn.addEventListener("click", ()=>{
        const n = Math.max(1, state.step - 1);
        showStep(n);
        requestAnimationFrame(() => {
          const stepEl = getStepEl_(n);
          if(stepEl) stepEl.scrollIntoView({ behavior:"smooth", block:"start" });
        });
      });
    }

    if(el.nextBtn){
      el.nextBtn.addEventListener("click", ()=>{
        if(!validateStep_(state.step)){
          setPill("請先完成本步驟必填");
          return;
        }
        const n = Math.min(8, state.step + 1);
        showStep(n);

        requestAnimationFrame(() => {
          const stepEl = getStepEl_(n);
          if(stepEl) stepEl.scrollIntoView({ behavior:"smooth", block:"start" });
        });
      });
    }

    if(el.resetDraftBtn){
      el.resetDraftBtn.addEventListener("click", ()=>{
        if(!confirm("確定要清除草稿嗎？（會清掉已保留的卡ID/token 與已上傳URL）")) return;
        clearDraft();
        location.reload();
      });
    }

    if(el.openDebug){
      el.openDebug.addEventListener("click", ()=>{
        const text = [
          `HSC Fill Form v${VERSION}`,
          `tenant=${state.tenant}`,
          `id=${state.id || "-"}`,
          `token=${state.token ? state.token.slice(0,8)+"..." : "-"}`,
          `sig=${state.sig ? "yes" : "no"}`,
          "",
          "Logs:",
          ...state.logs.slice(-40)
        ].join("\n");
        alert(text);
      });
    }
  }

  function bindLivePreview_(){
    if(!form) return;
    ["input","change"].forEach(evt=>{
      form.addEventListener(evt, ()=>{
        refreshPreview_();
        refreshSummary_();
        saveDraft();
      }, { passive:true });
    });
  }

  /* -------------------------
   * Boot
   * ------------------------- */
  async function boot(){
    if(el.versionText) el.versionText.textContent = VERSION;

    const qs = getQS();
    state.tenant = qs.tenant;
    state.sig = qs.sig;

    const had = loadDraft();
    if(!had){
      if(hidden.plan) hidden.plan.value = "";
      if(hidden.color) hidden.color.value = "";
      if(hidden.style) hidden.style.value = "";
      if(hidden.paper) hidden.paper.value = "";
      if(hidden.premium_color) hidden.premium_color.value = "";
    }

    refreshHeader_();

    bindChips_();
    bindNav_();
    bindLivePreview_();

    restoreSelectionUI_();
    refreshPlanDependentUI_();
    refreshPreview_();
    refreshSummary_();

    showStep(Math.min(8, Math.max(1, Number(state.step || 1))));

    try{
      await pingAndSchema_();
    }catch(e){
      console.warn(e);
      setPill("伺服器未就緒（可按 Debug 看錯誤）");
    }

    try{
      await ensureFirebaseAuthed_();
    }catch(e){
      console.warn(e);
      setPill("Firebase 未登入（請按 Debug 查看）");
    }
  }

  if(!form) {
    console.error("[HSC] #hscForm not found");
    return;
  }

  form.addEventListener("submit", onSubmit_);
  boot();
})();