/* ==========================================
 * HSC Fill Form — form.js v514.4 (COMPLETE OVERWRITE)
 * - Fix: Next button stuck / multi-click triggers debug
 * - Root cause: duplicate init / duplicate listeners
 * - Solution:
 *   1) Global init lock (prevent running twice)
 *   2) Use .onclick instead of addEventListener for buttons (no stacking)
 * - Keep:
 *   ping → schemaCheck → reserve(GET) → compress/upload(Firebase) → create(GET)
 * ========================================== */

(() => {
  // ✅ HARD LOCK: prevent double init (most common on GH Pages + cache)
  if (window.__HSC_FORM_INIT__) {
    console.warn("[HSC] form.js already initialized — skip");
    return;
  }
  window.__HSC_FORM_INIT__ = true;

  const VERSION = "514.4";

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const DEFAULT_TENANT = "angel";
  const DRAFT_KEY = "HSC_FILL_DRAFT_v5144";

  const IMG_MAX_W = 1600;
  const IMG_QUALITY = 0.82;
  const IMG_MAX_MB = 5;

  const STEP_TITLES = {
    1: "STEP 1｜方案",
    2: "STEP 2｜外觀",
    3: "STEP 3｜主資訊",
    4: "STEP 4｜圖片",
    5: "STEP 5｜聯絡",
    6: "STEP 6｜影音社群",
    7: "STEP 7｜精品 CTA",
    8: "STEP 8｜確認送出",
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const form = $("#hscForm");
  if (!form) {
    console.error("[HSC] #hscForm not found");
    return;
  }

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

    pvName: $("#pvName"),
    pvTitle: $("#pvTitle"),
    pvUnit: $("#pvUnit"),
    pvTheme: $("#pvTheme"),

    sumPlan: $("#sumPlan"),
    sumTheme: $("#sumTheme"),
    sumName: $("#sumName"),
    sumUnit: $("#sumUnit"),
    sumTitle: $("#sumTitle"),
    sumVideo: $("#sumVideo"),
    sumSocial: $("#sumSocial"),

    submitBtn: $("#submitBtn"),

    // submit progress (optional; if you added in HTML later)
    submitProgress: $("#submitProgress"),
    submitProgressLabel: $("#submitProgressLabel"),
    submitProgressPct: $("#submitProgressPct"),
    submitProgressFill: $("#submitProgressFill"),
    submitProgressNote: $("#submitProgressNote"),
  };

  const hidden = {
    plan: $("#plan"),
    color: $("#color"),
    style: $("#style"),
    paper: $("#paper"),
    premium_color: $("#premium_color"),
  };

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

  const files = {
    avatarFile: $("#avatarFile"),
    logoFile: $("#logoFile"),
    photo1File: $("#photo1File"),
    photo2File: $("#photo2File"),
    photo3File: $("#photo3File"),
    photo4File: $("#photo4File"),
    photo5File: $("#photo5File"),
  };

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

  const state = {
    tenant: DEFAULT_TENANT,
    sig: "",
    step: 1,
    id: "",
    token: "",

    avatar_img: "",
    logo_img: "",
    photo1_img: "",
    photo2_img: "",
    photo3_img: "",
    photo4_img: "",
    photo5_img: "",

    logs: [],
  };

  function log(...args) {
    const msg = args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
      .join(" ");
    state.logs.push(`[${new Date().toISOString()}] ${msg}`);
    console.log("[HSC]", ...args);
  }

  function setPill(msg) {
    if (el.pillMsg) el.pillMsg.textContent = msg;
  }

  function scrollToEl_(dom) {
    if (!dom) return;
    try {
      dom.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (_e) {
      const top = dom.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo(0, Math.max(0, top));
    }
  }

  // ===== submit progress helpers (safe even if HTML not present) =====
  function spShow_() {
    if (!el.submitProgress) return;
    el.submitProgress.classList.remove("hide");
  }
  function spHide_() {
    if (!el.submitProgress) return;
    el.submitProgress.classList.add("hide");
  }
  function spSet_(pct, title, note) {
    if (!el.submitProgress) return; // ✅ if no HTML block, just no-op
    spShow_();
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (el.submitProgressPct) el.submitProgressPct.textContent = String(p);
    if (el.submitProgressFill) el.submitProgressFill.style.width = `${p}%`;
    if (el.submitProgressLabel) el.submitProgressLabel.textContent = title || "處理中…";
    if (el.submitProgressNote) el.submitProgressNote.textContent = note || "";
  }

  function refreshHeader_() {
    if (el.versionText) el.versionText.textContent = VERSION;
    if (el.tenantText) el.tenantText.textContent = state.tenant || DEFAULT_TENANT;
    if (el.cardIdText) el.cardIdText.textContent = state.id ? state.id : "-";
  }

  function planIsPremium() {
    return (hidden.plan?.value || "").trim() === "premium";
  }

  function refreshPlanDependentUI_() {
    const premium = planIsPremium();
    if (el.freeThemeCard) el.freeThemeCard.classList.toggle("hide", premium);
    if (el.premiumThemeCard) el.premiumThemeCard.classList.toggle("hide", !premium);
    if (el.premiumPhotoRow) el.premiumPhotoRow.classList.toggle("hide", !premium);
    if (el.premiumCtaCard) el.premiumCtaCard.classList.toggle("hide", !premium);

    if (!premium) {
      if (hidden.premium_color) hidden.premium_color.value = "";
      if (fields.cta_text) fields.cta_text.value = "";
      if (fields.cta_link) fields.cta_link.value = "";
      state.photo3_img = "";
      state.photo4_img = "";
      state.photo5_img = "";
    }
  }

  function refreshPreview_() {
    if (el.pvName) el.pvName.textContent = (fields.name?.value || "").trim() || "姓名";
    if (el.pvTitle) el.pvTitle.textContent = (fields.title?.value || "").trim() || "頭銜";
    if (el.pvUnit) el.pvUnit.textContent = (fields.unit?.value || "").trim() || "單位";

    if (!el.pvTheme) return;
    if (planIsPremium()) {
      el.pvTheme.textContent = (hidden.premium_color?.value || "").trim() || "p?";
    } else {
      const c = (hidden.color?.value || "").trim() || "c?";
      const s = (hidden.style?.value || "").trim() || "s?";
      const f = (hidden.paper?.value || "").trim() || "f?";
      el.pvTheme.textContent = `${c}/${s}/${f}`;
    }
  }

  function refreshSummary_() {
    if (el.sumPlan) el.sumPlan.textContent = planIsPremium() ? "精品設計" : (hidden.plan?.value ? "自由搭配" : "-");
    if (el.sumTheme) {
      el.sumTheme.textContent = planIsPremium()
        ? (hidden.premium_color?.value || "-")
        : `${hidden.color?.value || "-"} / ${hidden.style?.value || "-"} / ${hidden.paper?.value || "-"}`;
    }

    if (el.sumName) el.sumName.textContent = (fields.name?.value || "-").trim() || "-";
    if (el.sumUnit) el.sumUnit.textContent = (fields.unit?.value || "-").trim() || "-";
    if (el.sumTitle) el.sumTitle.textContent = (fields.title?.value || "-").trim() || "-";

    const vids = [fields.video1?.value, fields.video2?.value, fields.video3?.value].filter(Boolean).length;
    const socs = [fields.social1?.value, fields.social2?.value, fields.social3?.value].filter(Boolean).length;
    if (el.sumVideo) el.sumVideo.textContent = vids ? `${vids} 筆` : "-";
    if (el.sumSocial) el.sumSocial.textContent = socs ? `${socs} 筆` : "-";
  }

  function showStep(n, opts = { scroll: true }) {
    state.step = n;

    $$(".step").forEach((sec) => {
      const sn = Number(sec.getAttribute("data-step"));
      sec.classList.toggle("hide", sn !== n);
    });

    if (el.stepTitle) el.stepTitle.textContent = STEP_TITLES[n] || `STEP ${n}`;
    if (el.progressFill) el.progressFill.style.width = `${Math.round((n / 8) * 100)}%`;

    if (el.prevBtn) el.prevBtn.style.visibility = n <= 1 ? "hidden" : "visible";
    if (el.nextBtn) el.nextBtn.classList.toggle("hide", n >= 8);

    refreshPlanDependentUI_();
    refreshPreview_();
    refreshSummary_();
    refreshHeader_();
    saveDraft();

    if (opts && opts.scroll) {
      const sec = document.querySelector(`.step[data-step="${n}"]`);
      scrollToEl_(sec);
    }
  }

  function setErr(key, msg) {
    if (err[key]) err[key].textContent = msg || "";
  }

  function validateStep_(n) {
    Object.values(err).forEach((e) => {
      if (e) e.textContent = "";
    });

    if (n === 1) {
      if (!hidden.plan?.value) {
        setErr("plan", "請先選擇方案");
        return false;
      }
      return true;
    }

    if (n === 2) {
      if (planIsPremium()) {
        if (!hidden.premium_color?.value) {
          setErr("premium_color", "請選擇精品底色");
          return false;
        }
      } else {
        if (!hidden.color?.value) { setErr("color", "請選擇顏色"); return false; }
        if (!hidden.style?.value) { setErr("style", "請選擇版型"); return false; }
        if (!hidden.paper?.value) { setErr("paper", "請選擇紙感"); return false; }
      }
      return true;
    }

    if (n === 3) {
      const name = (fields.name?.value || "").trim();
      const unit = (fields.unit?.value || "").trim();
      const title = (fields.title?.value || "").trim();
      let ok = true;
      if (!name) { setErr("name", "姓名必填"); ok = false; }
      if (!unit) { setErr("unit", "單位必填"); ok = false; }
      if (!title) { setErr("title", "頭銜必填"); ok = false; }
      return ok;
    }

    if (n === 4) {
      const hasAvatarUrl = !!state.avatar_img;
      const hasAvatarFile = !!(files.avatarFile?.files && files.avatarFile.files[0]);
      if (!hasAvatarUrl && !hasAvatarFile) {
        setErr("avatar", "個人照必填（請選擇檔案）");
        return false;
      }
      return true;
    }

    if (n === 7 && planIsPremium()) {
      const t = (fields.cta_text?.value || "").trim();
      const l = (fields.cta_link?.value || "").trim();
      if ((t && !l) || (!t && l)) {
        setErr("cta_pair", "CTA 文字與連結要一起填（或都留空）");
        return false;
      }
      return true;
    }

    return true;
  }

  function saveDraft() {
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
      },
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft || !draft.state || !draft.values) return false;

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
      if (hidden.plan) hidden.plan.value = v.plan || "";
      if (hidden.color) hidden.color.value = v.color || "";
      if (hidden.style) hidden.style.value = v.style || "";
      if (hidden.paper) hidden.paper.value = v.paper || "";
      if (hidden.premium_color) hidden.premium_color.value = v.premium_color || "";

      if (fields.name) fields.name.value = v.name || "";
      if (fields.unit) fields.unit.value = v.unit || "";
      if (fields.title) fields.title.value = v.title || "";
      if (fields.slogan) fields.slogan.value = v.slogan || "";
      if (fields.services) fields.services.value = v.services || "";
      if (fields.experience) fields.experience.value = v.experience || "";

      if (fields.wechat_id) fields.wechat_id.value = v.wechat_id || "";
      if (fields.line_url) fields.line_url.value = v.line_url || "";
      if (fields.line_oa) fields.line_oa.value = v.line_oa || "";
      if (fields.email) fields.email.value = v.email || "";
      if (fields.phone) fields.phone.value = v.phone || "";
      if (fields.address) fields.address.value = v.address || "";

      if (fields.video1) fields.video1.value = v.video1 || "";
      if (fields.video2) fields.video2.value = v.video2 || "";
      if (fields.video3) fields.video3.value = v.video3 || "";

      if (fields.social1) fields.social1.value = v.social1 || "";
      if (fields.social2) fields.social2.value = v.social2 || "";
      if (fields.social3) fields.social3.value = v.social3 || "";

      if (fields.cta_text) fields.cta_text.value = v.cta_text || "";
      if (fields.cta_link) fields.cta_link.value = v.cta_link || "";

      return true;
    } catch (_e) {
      return false;
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function restoreSelectionUI_() {
    ["plan", "style", "paper"].forEach((g) => {
      const v = (hidden[g]?.value || "").trim();
      $$(`.chip[data-chip-group="${g}"]`).forEach((c) => {
        c.setAttribute("data-on", c.getAttribute("data-value") === v ? "1" : "0");
      });
    });

    const setSw = (group, val) => {
      const row = document.querySelector(`.swatch-row[data-swatch-group="${group}"]`);
      if (!row) return;
      row.querySelectorAll(".swatch").forEach((s) => {
        s.setAttribute("data-on", s.getAttribute("data-value") === val ? "1" : "0");
      });
    };

    setSw("color", (hidden.color?.value || "").trim());
    setSw("premium_color", (hidden.premium_color?.value || "").trim());
  }

  // ===== GAS GET =====
  async function gasGet_(params) {
    const u = new URL(GAS_URL);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      u.searchParams.set(k, String(v));
    });
    const url = u.toString();
    log("GET", url);

    const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
    const txt = await res.text();
    let json;
    try {
      json = JSON.parse(txt);
    } catch (_e) {
      throw new Error("GAS JSON parse fail: " + txt.slice(0, 180));
    }
    if (!json.ok) throw new Error(json.error || "GAS error");
    return json;
  }

  // ===== Firebase =====
  async function ensureFirebaseAuthed_() {
    if (!window.firebase) throw new Error("firebase not loaded");
    if (!firebase.auth) throw new Error("firebase-auth-compat.js not loaded");
    const auth = firebase.auth();
    if (auth.currentUser) return auth.currentUser;
    const cred = await auth.signInAnonymously();
    return cred.user;
  }

  function loadImage_(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
      img.src = url;
    });
  }

  function drawToCanvas_(img, maxW) {
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxW) {
      const r = maxW / w;
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    return { canvas, w, h };
  }

  function canvasToBlob_(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }

  async function fileToWebpBlob_(file) {
    if (!file) return null;
    if (file.size > IMG_MAX_MB * 1024 * 1024) {
      throw new Error(`檔案太大（>${IMG_MAX_MB}MB）：${file.name}`);
    }
    const img = await loadImage_(file);
    const { canvas } = drawToCanvas_(img, IMG_MAX_W);
    const blob = await canvasToBlob_(canvas, "image/webp", IMG_QUALITY);
    if (!blob) throw new Error("image convert failed");
    return blob;
  }

  async function uploadBlob_(tenant, cardId, fileName, blob) {
    await ensureFirebaseAuthed_();
    const storage = firebase.storage();
    const path = `hsc_cards/${tenant}/${cardId}/${fileName}`;
    const ref = storage.ref().child(path);

    log("uploading", { path, sizeKB: Math.round(blob.size / 1024) });
    const snap = await ref.put(blob, { contentType: "image/webp", cacheControl: "public,max-age=31536000" });
    const url = await snap.ref.getDownloadURL();
    log("upload ok", { path, url: url.slice(0, 80) + "..." });
    return url;
  }

  async function pingAndSchema_() {
    spSet_(8, "檢查系統", "ping…");
    setPill("檢查系統中…");
    await gasGet_({ action: "ping" });

    spSet_(14, "檢查系統", "schemaCheck…");
    await gasGet_({ action: "schemaCheck" });

    spSet_(18, "檢查系統", "OK ✅");
  }

  async function reserveIfNeeded_() {
    if (state.id && state.token) {
      spSet_(26, "建立草稿卡", `已存在：${state.id}`);
      return { id: state.id, token: state.token };
    }

    spSet_(22, "建立草稿卡", "reserve…");
    const params = {
      action: "reserve",
      tenant: state.tenant,
      plan: hidden.plan?.value || "free",
    };
    if (state.sig) params.sig = state.sig;

    const r = await gasGet_(params);
    state.id = r.id;
    state.token = r.token;
    refreshHeader_();
    saveDraft();

    spSet_(28, "建立草稿卡", `OK ✅ ${state.id}`);
    return { id: state.id, token: state.token };
  }

  async function uploadAllImages_() {
    const tenant = state.tenant;
    const cardId = state.id;

    if (!state.avatar_img && files.avatarFile?.files && files.avatarFile.files[0]) {
      spSet_(36, "圖片上傳", "個人照壓縮…");
      const blob = await fileToWebpBlob_(files.avatarFile.files[0]);

      spSet_(44, "圖片上傳", "個人照上傳…");
      state.avatar_img = await uploadBlob_(tenant, cardId, "avatar.webp", blob);
      saveDraft();
    }

    if (!state.logo_img && files.logoFile?.files && files.logoFile.files[0]) {
      spSet_(50, "圖片上傳", "Logo 壓縮上傳…");
      const blob = await fileToWebpBlob_(files.logoFile.files[0]);
      state.logo_img = await uploadBlob_(tenant, cardId, "logo.webp", blob);
      saveDraft();
    }

    for (const i of [1, 2]) {
      const key = `photo${i}_img`;
      const input = files[`photo${i}File`];
      if (!state[key] && input?.files && input.files[0]) {
        spSet_(56 + i * 4, "圖片上傳", `照片 ${i} 壓縮上傳…`);
        const blob = await fileToWebpBlob_(input.files[0]);
        state[key] = await uploadBlob_(tenant, cardId, `photo${i}.webp`, blob);
        saveDraft();
      }
    }

    if (planIsPremium()) {
      for (const i of [3, 4, 5]) {
        const key = `photo${i}_img`;
        const input = files[`photo${i}File`];
        if (!state[key] && input?.files && input.files[0]) {
          spSet_(70 + (i - 3) * 5, "圖片上傳", `照片 ${i} 壓縮上傳…`);
          const blob = await fileToWebpBlob_(input.files[0]);
          state[key] = await uploadBlob_(tenant, cardId, `photo${i}.webp`, blob);
          saveDraft();
        }
      }
    } else {
      state.photo3_img = "";
      state.photo4_img = "";
      state.photo5_img = "";
    }

    spSet_(82, "圖片上傳", "圖片處理完成 ✅");
  }

  async function createCard_() {
    spSet_(88, "寫入 card_db", "create…");
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

      name: (fields.name?.value || "").trim(),
      unit: (fields.unit?.value || "").trim(),
      title: (fields.title?.value || "").trim(),
      slogan: (fields.slogan?.value || "").trim(),
      services: (fields.services?.value || "").trim(),
      experience: (fields.experience?.value || "").trim(),

      avatar_img: state.avatar_img || "",
      logo_img: state.logo_img || "",
      photo1_img: state.photo1_img || "",
      photo2_img: state.photo2_img || "",
      photo3_img: state.photo3_img || "",
      photo4_img: state.photo4_img || "",
      photo5_img: state.photo5_img || "",

      wechat_id: (fields.wechat_id?.value || "").trim(),
      line_url: (fields.line_url?.value || "").trim(),
      line_oa: (fields.line_oa?.value || "").trim(),
      email: (fields.email?.value || "").trim(),
      phone: (fields.phone?.value || "").trim(),
      address: (fields.address?.value || "").trim(),

      video1: (fields.video1?.value || "").trim(),
      video2: (fields.video2?.value || "").trim(),
      video3: (fields.video3?.value || "").trim(),

      social1: (fields.social1?.value || "").trim(),
      social2: (fields.social2?.value || "").trim(),
      social3: (fields.social3?.value || "").trim(),

      cta_text: planIsPremium() ? (fields.cta_text?.value || "").trim() : "",
      cta_link: planIsPremium() ? (fields.cta_link?.value || "").trim() : "",
    };
    if (state.sig) p.sig = state.sig;

    await gasGet_(p);

    spSet_(100, "完成", "已寫入 card_db ✅");
    setPill("已寫入 card_db ✅");

    clearDraft();
    alert(`送出成功 ✅\n\n草稿卡ID：${state.id}\n（目前狀態預設 inactive）`);

    setTimeout(() => spHide_(), 1200);
  }

  function bindChips_() {
    // keep as event delegation (single)
    document.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip");
      if (!chip) return;
      const group = chip.getAttribute("data-chip-group");
      const val = chip.getAttribute("data-value");
      if (!group || !val) return;

      $$(`.chip[data-chip-group="${group}"]`).forEach((c) => c.setAttribute("data-on", "0"));
      chip.setAttribute("data-on", "1");
      if (hidden[group]) hidden[group].value = val;

      if (group === "plan") refreshPlanDependentUI_();

      saveDraft();
      refreshPreview_();
      refreshSummary_();
    });

    document.addEventListener("click", (ev) => {
      const sw = ev.target.closest(".swatch");
      if (!sw) return;

      const row = sw.closest(".swatch-row");
      if (!row) return;

      const group = row.getAttribute("data-swatch-group");
      const val = sw.getAttribute("data-value");
      if (!group || !val) return;

      row.querySelectorAll(".swatch").forEach((x) => x.setAttribute("data-on", "0"));
      sw.setAttribute("data-on", "1");
      if (hidden[group]) hidden[group].value = val;

      saveDraft();
      refreshPreview_();
      refreshSummary_();
    });
  }

  function bindButtonsOnce_() {
    // ✅ key change: use onclick to avoid stacking when something goes wrong
    if (el.prevBtn) {
      el.prevBtn.onclick = () => showStep(Math.max(1, state.step - 1), { scroll: true });
    }

    if (el.nextBtn) {
      el.nextBtn.onclick = () => {
        if (!validateStep_(state.step)) {
          setPill("請先完成本步驟必填");
          return;
        }
        showStep(Math.min(8, state.step + 1), { scroll: true });
      };
    }

    if (el.resetDraftBtn) {
      el.resetDraftBtn.onclick = () => {
        if (!confirm("確定要清除草稿嗎？")) return;
        clearDraft();
        location.reload();
      };
    }

    if (el.openDebug) {
      el.openDebug.onclick = () => {
        const text = [
          `HSC Fill Form v${VERSION}`,
          `tenant=${state.tenant}`,
          `id=${state.id || "-"}`,
          `token=${state.token ? state.token.slice(0, 8) + "..." : "-"}`,
          `sig=${state.sig ? "yes" : "no"}`,
          "",
          "Logs:",
          ...state.logs.slice(-50),
        ].join("\n");
        alert(text);
      };
    }
  }

  function bindLivePreview_() {
    ["input", "change"].forEach((evt) => {
      form.addEventListener(
        evt,
        () => {
          refreshPreview_();
          refreshSummary_();
          saveDraft();
        },
        { passive: true }
      );
    });
  }

  async function onSubmit_(ev) {
    ev.preventDefault();

    spSet_(0, "準備送出", "開始…");
    scrollToEl_(el.submitBtn);

    const must = [1, 2, 3, 4, 7];
    for (const s of must) {
      if (s === 7 && !planIsPremium()) continue;
      if (!validateStep_(s)) {
        showStep(s, { scroll: true });
        setPill("請先完成必填項目");
        spSet_(0, "請先補齊必填", `請完成 ${STEP_TITLES[s]}`);
        return;
      }
    }

    try {
      if (el.submitBtn) el.submitBtn.disabled = true;
      spShow_();

      await ensureFirebaseAuthed_();
      spSet_(5, "準備送出", "Firebase 登入 OK ✅");

      await pingAndSchema_();
      await reserveIfNeeded_();
      await uploadAllImages_();
      await createCard_();
    } catch (e) {
      console.error(e);
      setPill("送出失敗 ❌");
      spSet_(Math.max(5, Number(el.submitProgressPct?.textContent || "5")), "送出失敗 ❌", e?.message || String(e));
      alert("送出失敗：\n" + (e?.message || String(e)));
    } finally {
      if (el.submitBtn) el.submitBtn.disabled = false;
    }
  }

  function boot() {
    const u = new URL(location.href);
    state.tenant = (u.searchParams.get("tenant") || DEFAULT_TENANT).trim() || DEFAULT_TENANT;
    state.sig = (u.searchParams.get("sig") || "").trim();

    loadDraft();

    bindChips_();
    bindButtonsOnce_();
    bindLivePreview_();

    restoreSelectionUI_();
    refreshPlanDependentUI_();
    refreshPreview_();
    refreshSummary_();
    refreshHeader_();

    showStep(Math.min(8, Math.max(1, Number(state.step || 1))), { scroll: false });

    spHide_();
    setPill("準備填寫");
    log("boot ok", { VERSION, tenant: state.tenant, hasSig: !!state.sig });
  }

  form.onsubmit = onSubmit_; // ✅ avoid stacking too
  boot();
})();