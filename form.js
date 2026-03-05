/* ==========================================
 * HSC Fill Form — form.js v520-RF1 (COMPLETE OVERWRITE)
 * - TRUE ESM refactor (Firebase v12 modular)
 * - No compat mixing
 * - Supports mode=create | update
 * - reserve -> upload -> create/update (GET) -> delivery
 * - Step UI + validation + preview + draft localStorage
 * ========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

(() => {
  "use strict";

  /* ---------------- Config ---------------- */
  const VERSION = "520-RF1";

  // ✅ Your GAS endpoint
  const GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_TENANT = "angel";

  /* ---------------- Helpers ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function qs(name) {
    const url = new URL(location.href);
    return url.searchParams.get(name) || "";
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function safeJsonParse(s, fallback) {
    try { return JSON.parse(s); } catch { return fallback; }
  }

  function setText(id, text) {
    const el = typeof id === "string" ? $(id) : id;
    if (el) el.textContent = text;
  }

  function show(el, yes) {
    if (!el) return;
    el.classList.toggle("hide", !yes);
  }

  function setErr(id, msg) {
    const el = typeof id === "string" ? $(id) : id;
    if (el) el.textContent = msg || "";
  }

  function markInvalid(input, yes) {
    if (!input) return;
    input.classList.toggle("isInvalid", !!yes);
  }

  /* ---------------- State ---------------- */
  const state = {
    tenant: qs("tenant") || DEFAULT_TENANT,
    mode: (qs("mode") || "create").toLowerCase(),   // create | update
    id: qs("id") || "",
    sig: qs("sig") || "",
    step: 1,
    reserve: null,         // {ok:true,id,token,uploadPath?}
    firebaseReady: false,
    authReady: false,
    storage: null,
    draftKey: "",
    uploading: false
  };

  /* ---------------- DOM ---------------- */
  const dom = {
    versionText: $("#versionText"),
    tenantText: $("#tenantText"),
    cardIdText: $("#cardIdText"),
    pillMsg: $("#pillMsg"),
    stepTitle: $("#stepTitle"),
    progressFill: $("#progressFill"),

    prevBtn: $("#prevBtn"),
    nextBtn: $("#nextBtn"),
    resetDraftBtn: $("#resetDraftBtn"),
    openDebug: $("#openDebug"),

    form: $("#hscForm"),

    steps: $$(".step"),
    submitBtn: $("#submitBtn"),

    submitProgress: $("#submitProgress"),
    submitProgressFill: $("#submitProgressFill"),
    submitProgressPct: $("#submitProgressPct"),
    submitProgressLabel: $("#submitProgressLabel"),
    submitProgressNote: $("#submitProgressNote"),

    freeThemeCard: $("#freeThemeCard"),
    premiumThemeCard: $("#premiumThemeCard"),
    premiumPhotoRow: $("#premiumPhotoRow"),

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

    // required fields
    name: $("#name"),
    unit: $("#unit"),
    title: $("#title"),

    // files
    avatarFile: $("#avatarFile"),
    logoFile: $("#logoFile"),
    photo1File: $("#photo1File"),
    photo2File: $("#photo2File"),
    photo3File: $("#photo3File"),
    photo4File: $("#photo4File"),
    photo5File: $("#photo5File"),

    // hidden
    plan: $("#plan"),
    color: $("#color"),
    style: $("#style"),
    paper: $("#paper"),
    premium_color: $("#premium_color"),

    // CTA
    cta_text: $("#cta_text"),
    cta_link: $("#cta_link")
  };

  /* ---------------- Init UI texts ---------------- */
  setText(dom.versionText, VERSION);
  setText(dom.tenantText, state.tenant);

  /* ---------------- Draft key ---------------- */
  // Create: key by tenant+sig (if any)
  // Update: key by tenant+id
  state.draftKey = state.mode === "update"
    ? `HSC_FORM_DRAFT__${state.tenant}__${state.id}`
    : `HSC_FORM_DRAFT__${state.tenant}__${state.sig || "nosig"}`;

  /* ---------------- Firebase init (modular) ---------------- */
  async function initFirebase() {
    const cfg = window.HSC_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) {
      log("firebase config missing");
      return;
    }
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    const storage = getStorage(app);

    state.storage = storage;
    state.firebaseReady = true;

    // anonymous login
    try {
      await signInAnonymously(auth);
      state.authReady = true;
      log("firebase auth anonymous ✅");
    } catch (e) {
      state.authReady = false;
      log("firebase auth failed", e);
    }
  }

  /* ---------------- GAS fetch helpers ---------------- */
  async function gasGet(paramsObj) {
    const u = new URL(GAS);
    Object.entries(paramsObj || {}).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      u.searchParams.set(k, String(v));
    });

    const r = await fetch(u.toString(), { method: "GET" });
    const txt = await r.text();
    const j = safeJsonParse(txt, null);
    if (!j) throw new Error("GAS returned non-JSON");
    return j;
  }

  /* ---------------- Reserve (create mode) ---------------- */
  async function reserveIfNeeded() {
    if (state.mode !== "create") return;

    // If already have reserve in draft, reuse
    if (state.reserve && state.reserve.id && state.reserve.token) return;

    setPill("準備建立草稿卡…");
    const payload = { action: "reserve", tenant: state.tenant };
    if (state.sig) payload.sig = state.sig;

    const j = await gasGet(payload);
    if (!j.ok) throw new Error(j.error || "reserve failed");

    state.reserve = j;
    setText(dom.cardIdText, j.id || "-");
    setPill("草稿卡建立完成 ✅");
    saveDraft(); // store reserve
  }

  /* ---------------- Load card (update mode) ---------------- */
  async function loadCardIfUpdate() {
    if (state.mode !== "update") return;
    if (!state.id) throw new Error("update mode missing id");
    // sig may be required by your GAS rule; pass if present
    setPill("載入名片資料…");

    const j = await gasGet({
      action: "card",
      tenant: state.tenant,
      id: state.id,
      sig: state.sig || ""
    });
    if (!j.ok) throw new Error(j.error || "load card failed");
    const item = j.item || {};

    // Fill fields by name=
    Object.keys(item).forEach((k) => {
      const el = document.querySelector(`[name="${k}"]`);
      if (el && item[k] != null && item[k] !== "") el.value = String(item[k]);
    });

    // Sync hidden
    dom.plan.value = item.plan || dom.plan.value || "";
    dom.color.value = item.color || dom.color.value || "";
    dom.style.value = item.style || dom.style.value || "";
    dom.paper.value = item.paper || dom.paper.value || "";
    dom.premium_color.value = item.premium_color || dom.premium_color.value || "";

    setText(dom.cardIdText, state.id);
    setPill("已載入 ✅");
    applyPlanUI();
    syncSelectionsFromHidden();
    updatePreview();
    updateSummary();
  }

  /* ---------------- UI: steps ---------------- */
  const STEP_MAX = 8;
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

  function gotoStep(n) {
    state.step = clamp(n, 1, STEP_MAX);
    dom.steps.forEach((sec) => {
      const sn = Number(sec.getAttribute("data-step") || "0");
      sec.classList.toggle("hide", sn !== state.step);
    });

    setText(dom.stepTitle, STEP_TITLES[state.step] || `STEP ${state.step}`);
    dom.prevBtn.disabled = state.step <= 1;
    dom.nextBtn.disabled = state.step >= STEP_MAX;

    // progress (14% for step1, 100% for step8)
    const pct = Math.round(((state.step - 1) / (STEP_MAX - 1)) * 100);
    dom.progressFill.style.width = `${pct}%`;

    // step7 visibility depends on plan (but still count step flow)
    updatePreview();
    updateSummary();
    saveDraft();
  }

  /* ---------------- UI: plan/theme branching ---------------- */
  function applyPlanUI() {
    const plan = (dom.plan.value || "").trim();

    const isPremium = plan === "premium";

    show(dom.freeThemeCard, !isPremium);
    show(dom.premiumThemeCard, isPremium);
    show(dom.premiumPhotoRow, isPremium);

    // Step 7 only for premium
    const step7 = dom.steps.find(s => Number(s.getAttribute("data-step")) === 7);
    if (step7) show(step7, isPremium);

    // If plan switches, clean conflicting fields
    if (isPremium) {
      dom.color.value = "";
      dom.style.value = "";
      dom.paper.value = "";
    } else {
      dom.premium_color.value = "";
      dom.cta_text.value = "";
      dom.cta_link.value = "";
      setErr("#err_cta_pair", "");
    }

    syncSelectionsFromHidden();
  }

  function syncSelectionsFromHidden() {
    // chips
    $$(`.chip[data-chip-group]`).forEach((btn) => {
      const g = btn.getAttribute("data-chip-group");
      const v = btn.getAttribute("data-value");
      const hv = (dom[g] && dom[g].value) ? dom[g].value : "";
      btn.setAttribute("data-on", hv === v ? "1" : "0");
    });

    // swatches
    $$(`.swatch-row[data-swatch-group] .swatch`).forEach((b) => {
      const row = b.closest(".swatch-row");
      const g = row ? row.getAttribute("data-swatch-group") : "";
      const v = b.getAttribute("data-value") || "";
      const hv = (dom[g] && dom[g].value) ? dom[g].value : "";
      b.setAttribute("data-on", hv === v ? "1" : "0");
    });
  }

  /* ---------------- Preview + Summary ---------------- */
  function updatePreview() {
    const n = (dom.name.value || "姓名").trim();
    const t = (dom.title.value || "頭銜").trim();
    const u = (dom.unit.value || "單位").trim();

    setText(dom.pvName, n || "姓名");
    setText(dom.pvTitle, t || "頭銜");
    setText(dom.pvUnit, u || "單位");

    const plan = dom.plan.value || "";
    let themeText = "-";
    if (plan === "free") {
      themeText = `${dom.color.value || "c?"}/${dom.style.value || "s?"}/${dom.paper.value || "f?"}`;
    } else if (plan === "premium") {
      themeText = `${dom.premium_color.value || "p?"}`;
    }
    setText(dom.pvTheme, themeText);
  }

  function updateSummary() {
    const plan = dom.plan.value || "-";
    const planZh = plan === "free" ? "自由搭配" : (plan === "premium" ? "精品設計" : "-");
    setText(dom.sumPlan, planZh);

    let theme = "-";
    if (plan === "free") theme = `${dom.color.value || "-"} / ${dom.style.value || "-"} / ${dom.paper.value || "-"}`;
    if (plan === "premium") theme = `${dom.premium_color.value || "-"}`;
    setText(dom.sumTheme, theme);

    setText(dom.sumName, (dom.name.value || "-").trim() || "-");
    setText(dom.sumUnit, (dom.unit.value || "-").trim() || "-");
    setText(dom.sumTitle, (dom.title.value || "-").trim() || "-");

    const videos = [$("#video1")?.value, $("#video2")?.value, $("#video3")?.value].filter(Boolean).length;
    const socials = [$("#social1")?.value, $("#social2")?.value, $("#social3")?.value].filter(Boolean).length;
    setText(dom.sumVideo, videos ? `${videos} 筆` : "-");
    setText(dom.sumSocial, socials ? `${socials} 筆` : "-");
  }

  /* ---------------- Validation per step ---------------- */
  function validateStep(step) {
    // clear errs related
    if (step === 1) {
      setErr("#err_plan", "");
      if (!dom.plan.value) {
        setErr("#err_plan", "請先選擇方案");
        return false;
      }
      return true;
    }

    if (step === 2) {
      setErr("#err_color", "");
      setErr("#err_style", "");
      setErr("#err_paper", "");
      setErr("#err_premium_color", "");

      const plan = dom.plan.value;

      if (plan === "free") {
        let ok = true;
        if (!dom.color.value) { setErr("#err_color", "請選顏色"); ok = false; }
        if (!dom.style.value) { setErr("#err_style", "請選版型"); ok = false; }
        if (!dom.paper.value) { setErr("#err_paper", "請選紙感"); ok = false; }
        return ok;
      }

      if (plan === "premium") {
        if (!dom.premium_color.value) {
          setErr("#err_premium_color", "請選底色");
          return false;
        }
        return true;
      }

      return false;
    }

    if (step === 3) {
      setErr("#err_name", "");
      setErr("#err_unit", "");
      setErr("#err_title", "");

      markInvalid(dom.name, false);
      markInvalid(dom.unit, false);
      markInvalid(dom.title, false);

      let ok = true;
      if (!dom.name.value.trim()) { setErr("#err_name", "姓名必填"); markInvalid(dom.name, true); ok = false; }
      if (!dom.unit.value.trim()) { setErr("#err_unit", "單位必填"); markInvalid(dom.unit, true); ok = false; }
      if (!dom.title.value.trim()) { setErr("#err_title", "頭銜必填"); markInvalid(dom.title, true); ok = false; }
      return ok;
    }

    if (step === 4) {
      setErr("#err_avatar", "");
      const mustHaveAvatar = true;
      if (mustHaveAvatar) {
        // Update mode: allow if already has avatar_img value in draft (not in file input)
        const hasExisting = !!($("#avatar_img")?.value || "");
        const hasNew = !!(dom.avatarFile && dom.avatarFile.files && dom.avatarFile.files[0]);
        if (!hasExisting && !hasNew) {
          setErr("#err_avatar", "個人照必填");
          return false;
        }
      }
      return true;
    }

    if (step === 7) {
      setErr("#err_cta_pair", "");
      if (dom.plan.value === "premium") {
        const t = (dom.cta_text.value || "").trim();
        const l = (dom.cta_link.value || "").trim();
        if ((t && !l) || (!t && l)) {
          setErr("#err_cta_pair", "CTA 文字與連結需一起填，或一起留空");
          return false;
        }
      }
      return true;
    }

    return true;
  }

  /* ---------------- Draft save/load ---------------- */
  function collectDraft() {
    const data = {};

    // all inputs/textarea with name
    $$("input[name], textarea[name]").forEach((el) => {
      data[el.name] = el.value || "";
    });

    // hidden selects
    data.plan = dom.plan.value || "";
    data.color = dom.color.value || "";
    data.style = dom.style.value || "";
    data.paper = dom.paper.value || "";
    data.premium_color = dom.premium_color.value || "";

    data.__meta = {
      version: VERSION,
      tenant: state.tenant,
      mode: state.mode,
      id: state.id || "",
      sig: state.sig || "",
      step: state.step,
      reserved: state.reserve ? { id: state.reserve.id, token: state.reserve.token } : null,
      savedAt: Date.now()
    };

    return data;
  }

  function saveDraft() {
    const payload = collectDraft();
    try {
      localStorage.setItem(state.draftKey, JSON.stringify(payload));
    } catch {}
  }

  function loadDraft() {
    const raw = localStorage.getItem(state.draftKey);
    if (!raw) return;

    const data = safeJsonParse(raw, null);
    if (!data) return;

    // restore reserved
    if (data.__meta && data.__meta.reserved && data.__meta.reserved.id) {
      state.reserve = { ok: true, id: data.__meta.reserved.id, token: data.__meta.reserved.token };
      setText(dom.cardIdText, state.reserve.id);
    }

    // fill values
    $$("input[name], textarea[name]").forEach((el) => {
      if (data[el.name] != null) el.value = data[el.name];
    });

    dom.plan.value = data.plan || dom.plan.value || "";
    dom.color.value = data.color || dom.color.value || "";
    dom.style.value = data.style || dom.style.value || "";
    dom.paper.value = data.paper || dom.paper.value || "";
    dom.premium_color.value = data.premium_color || dom.premium_color.value || "";

    applyPlanUI();
    syncSelectionsFromHidden();
    updatePreview();
    updateSummary();

    if (data.__meta && data.__meta.step) {
      gotoStep(Number(data.__meta.step) || 1);
    }
  }

  function clearDraft() {
    localStorage.removeItem(state.draftKey);
    location.reload();
  }

  /* ---------------- Image compress ---------------- */
  async function compressImage(file, maxW = 1400, quality = 0.82) {
    if (!file) return null;

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = URL.createObjectURL(file);
    });

    const ratio = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });

    return blob;
  }

  /* ---------------- Upload ---------------- */
  async function uploadOne(file, cardId, filename, onNote) {
    if (!file) return "";

    if (!state.firebaseReady || !state.authReady || !state.storage) {
      throw new Error("firebase not ready");
    }

    onNote && onNote(`壓縮 ${filename}…`);
    const blob = await compressImage(file, 1400, 0.82);
    if (!blob) throw new Error("compress failed");

    onNote && onNote(`上傳 ${filename}…`);
    const path = `hsc_cards/${state.tenant}/${cardId}/${filename}`;
    const r = ref(state.storage, path);
    await uploadBytes(r, blob, { contentType: "image/jpeg" });
    const url = await getDownloadURL(r);
    return url;
  }

  /* ---------------- Submit progress UI ---------------- */
  function spShow(yes) { show(dom.submitProgress, yes); }
  function spSet(pct, label, note) {
    const p = clamp(Math.round(pct), 0, 100);
    if (dom.submitProgressPct) dom.submitProgressPct.textContent = String(p);
    if (dom.submitProgressFill) dom.submitProgressFill.style.width = `${p}%`;
    if (dom.submitProgressLabel) dom.submitProgressLabel.textContent = label || "處理中…";
    if (dom.submitProgressNote) dom.submitProgressNote.textContent = note || "";
  }

  /* ---------------- Final submit: create/update via GET ---------------- */
  async function submitAll() {
    if (state.uploading) return;
    state.uploading = true;

    try {
      // Validate all critical steps before submit
      for (const s of [1, 2, 3, 4, 7]) {
        if (!validateStep(s)) {
          gotoStep(s);
          throw new Error("請先完成必填項");
        }
      }

      spShow(true);
      spSet(2, "準備送出…", "建立名片資料中");

      // Ensure reserve / cardId
      let cardId = state.id;
      let token = "";
      if (state.mode === "create") {
        await reserveIfNeeded();
        cardId = state.reserve.id;
        token = state.reserve.token || "";
      } else {
        cardId = state.id;
      }

      setText(dom.cardIdText, cardId);

      // Upload images (only files user selected now)
      const plan = dom.plan.value;
      const allowPhotos = plan === "premium" ? 5 : 2;

      const files = [];
      files.push({ key: "avatar_img", file: dom.avatarFile?.files?.[0] || null, name: "avatar.jpg", required: true });
      files.push({ key: "logo_img", file: dom.logoFile?.files?.[0] || null, name: "logo.jpg", required: false });
      files.push({ key: "photo1_img", file: dom.photo1File?.files?.[0] || null, name: "photo1.jpg", required: false });
      files.push({ key: "photo2_img", file: dom.photo2File?.files?.[0] || null, name: "photo2.jpg", required: false });

      if (allowPhotos >= 5) {
        files.push({ key: "photo3_img", file: dom.photo3File?.files?.[0] || null, name: "photo3.jpg", required: false });
        files.push({ key: "photo4_img", file: dom.photo4File?.files?.[0] || null, name: "photo4.jpg", required: false });
        files.push({ key: "photo5_img", file: dom.photo5File?.files?.[0] || null, name: "photo5.jpg", required: false });
      }

      const uploaded = {};
      let done = 0;
      const total = files.filter(x => !!x.file).length;

      // If avatar not selected in update mode, allow existing (name input doesn't exist, but sheet has it)
      if (files[0].required && !files[0].file) {
        // keep existing if any
        uploaded.avatar_img = $("#avatar_img")?.value || "";
        if (!uploaded.avatar_img) {
          throw new Error("個人照必填");
        }
      }

      if (total > 0) {
        spSet(10, "上傳圖片…", "開始上傳");
        for (const f of files) {
          if (!f.file) continue;
          const pctBase = 10;
          const pctSpan = 55;
          const pct = pctBase + (done / Math.max(1, total)) * pctSpan;

          const url = await uploadOne(f.file, cardId, f.name, (note) => {
            spSet(pct, "上傳圖片…", note);
          });

          uploaded[f.key] = url;
          done++;
          spSet(pctBase + (done / Math.max(1, total)) * pctSpan, "上傳圖片…", `${f.name} ✅`);
        }
      } else {
        spSet(20, "略過圖片上傳", "未選擇新圖片");
      }

      // Collect text fields
      const data = collectDraft();

      // Map uploads into payload keys (align to your sheet headers used previously)
      // You can adjust these keys if your GAS expects different column names
      if (uploaded.avatar_img) data.avatar_img = uploaded.avatar_img;
      if (uploaded.logo_img) data.logo_img = uploaded.logo_img;
      if (uploaded.photo1_img) data.photo1_img = uploaded.photo1_img;
      if (uploaded.photo2_img) data.photo2_img = uploaded.photo2_img;
      if (uploaded.photo3_img) data.photo3_img = uploaded.photo3_img;
      if (uploaded.photo4_img) data.photo4_img = uploaded.photo4_img;
      if (uploaded.photo5_img) data.photo5_img = uploaded.photo5_img;

      // Core fields
      data.tenant = state.tenant;
      data.id = cardId;

      // Remove meta
      delete data.__meta;

      // Decide action
      const action = state.mode === "create" ? "create" : "update";

      // Build GET params (NO base64, NO images - only URLs)
      const params = {
        action,
        tenant: state.tenant,
        id: cardId
      };

      if (state.mode === "create") {
        params.token = token; // reserve token
        if (state.sig) params.sig = state.sig;
      } else {
        if (state.sig) params.sig = state.sig;
      }

      // attach data fields
      Object.keys(data).forEach((k) => {
        if (data[k] == null) return;
        const v = String(data[k]).trim();
        if (!v) return;
        params[k] = v;
      });

      spSet(78, "寫入資料…", "送到 card_db");
      const j = await gasGet(params);
      if (!j.ok) throw new Error(j.error || "submit failed");

      spSet(100, "完成 ✅", "即將前往交付頁");
      localStorage.removeItem(state.draftKey);

      // Go delivery
      location.href = `delivery.html?id=${encodeURIComponent(cardId)}`;

    } catch (e) {
      log("submit failed", e);
      alert(`送出失敗：${e && e.message ? e.message : e}`);
      spShow(false);
    } finally {
      state.uploading = false;
    }
  }

  /* ---------------- Bind events ---------------- */
  function bindUI() {
    // chips: plan/style/paper
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".chip");
      if (!btn) return;

      const g = btn.getAttribute("data-chip-group");
      const v = btn.getAttribute("data-value");
      if (!g || !v) return;

      if (dom[g]) dom[g].value = v;

      // plan changes branching
      if (g === "plan") applyPlanUI();

      syncSelectionsFromHidden();
      updatePreview();
      updateSummary();
      saveDraft();
    });

    // swatches: color / premium_color
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest(".swatch");
      if (!b) return;
      const row = b.closest(".swatch-row");
      if (!row) return;
      const g = row.getAttribute("data-swatch-group");
      const v = b.getAttribute("data-value");
      if (!g || !v) return;

      if (dom[g]) dom[g].value = v;

      syncSelectionsFromHidden();
      updatePreview();
      updateSummary();
      saveDraft();
    });

    // inputs update preview
    ["input", "change"].forEach((evtName) => {
      dom.form.addEventListener(evtName, () => {
        updatePreview();
        updateSummary();
        saveDraft();
      });
    });

    // step nav
    dom.prevBtn.addEventListener("click", () => gotoStep(state.step - 1));
    dom.nextBtn.addEventListener("click", () => {
      if (!validateStep(state.step)) return;
      gotoStep(state.step + 1);
    });

    // reset
    dom.resetDraftBtn.addEventListener("click", () => {
      if (confirm("確定要清除草稿？")) clearDraft();
    });

    // debug
    dom.openDebug.addEventListener("click", () => {
      const info = {
        version: VERSION,
        tenant: state.tenant,
        mode: state.mode,
        id: state.id || "(none)",
        sig: state.sig ? "(present)" : "(none)",
        step: state.step,
        reserve: state.reserve ? { id: state.reserve.id, token: !!state.reserve.token } : null,
        firebaseReady: state.firebaseReady,
        authReady: state.authReady
      };
      alert(JSON.stringify(info, null, 2));
    });

    // submit
    dom.form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitAll();
    });
  }

  /* ---------------- Pill ---------------- */
  function setPill(msg) {
    setText(dom.pillMsg, msg || "");
  }

  /* ---------------- Logger ---------------- */
  function log(...args) {
    console.log("[HSC form]", ...args);
  }

  /* ---------------- Boot ---------------- */
  async function boot() {
    try {
      setText(dom.cardIdText, state.id || (state.reserve?.id || "-"));
      loadDraft();                 // load draft first
      bindUI();
      gotoStep(state.step || 1);

      setPill("初始化中…");
      await initFirebase();
      setPill(state.authReady ? "已連線 ✅" : "Firebase 未登入（仍可填寫，但上傳會失敗）");

      if (state.mode === "create") {
        await reserveIfNeeded();
      } else {
        await loadCardIfUpdate();
      }

      applyPlanUI();
      syncSelectionsFromHidden();
      updatePreview();
      updateSummary();

      // if create and reserve obtained
      if (state.mode === "create" && state.reserve?.id) {
        setText(dom.cardIdText, state.reserve.id);
      }

    } catch (e) {
      log("boot error", e);
      alert(`初始化失敗：${e && e.message ? e.message : e}`);
      setPill("初始化失敗");
    }
  }

  boot();
})();