/* ==========================================
 * HSC Fill Form — form.js v514.5 (COMPLETE OVERWRITE)
 * Focus: Options <-> Preview/Product linkage (hard sync)
 * - Fix: premium selection flipping back to free
 * - Fix: next button sometimes "no move" + accidental backend jump (tap guard)
 * - Keep HTML/CSS unchanged
 * ========================================== */

(() => {
  const VERSION = "514.5";

  // ✅ your latest GAS
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_TENANT = "angel";
  const DRAFT_KEY = "HSC_FILL_DRAFT_v5145";

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
    8: "STEP 8｜確認送出"
  };

  // -----------------------------
  // DOM helpers
  // -----------------------------
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

    // (if you added these nodes in HTML later, JS will pick them automatically)
    submitProgress: $("#submitProgress"),
    submitProgressLabel: $("#submitProgressLabel"),
    submitProgressPct: $("#submitProgressPct"),
    submitProgressFill: $("#submitProgressFill"),
    submitProgressNote: $("#submitProgressNote")
  };

  const hidden = {
    plan: $("#plan"),
    color: $("#color"),
    style: $("#style"),
    paper: $("#paper"),
    premium_color: $("#premium_color")
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
    cta_link: $("#cta_link")
  };

  const files = {
    avatarFile: $("#avatarFile"),
    logoFile: $("#logoFile"),
    photo1File: $("#photo1File"),
    photo2File: $("#photo2File"),
    photo3File: $("#photo3File"),
    photo4File: $("#photo4File"),
    photo5File: $("#photo5File")
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
    cta_pair: $("#err_cta_pair")
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

    // guards
    navLockUntil: 0,
    lastNavAt: 0
  };

  // -----------------------------
  // Utilities
  // -----------------------------
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

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  // -----------------------------
  // ✅ Options <-> product linkage core
  // -----------------------------
  function planIsPremium() {
    return (hidden.plan?.value || "").trim() === "premium";
  }

  function normalizePlan_(v) {
    const x = (v || "").trim().toLowerCase();
    if (x === "premium") return "premium";
    if (x === "free") return "free";
    return "";
  }

  function setHidden_(key, value) {
    const input = hidden[key];
    if (!input) return;
    input.value = (value ?? "").toString();
  }

  function refreshPlanDependentUI_() {
    const premium = planIsPremium();

    if (el.freeThemeCard) el.freeThemeCard.classList.toggle("hide", premium);
    if (el.premiumThemeCard) el.premiumThemeCard.classList.toggle("hide", !premium);
    if (el.premiumPhotoRow) el.premiumPhotoRow.classList.toggle("hide", !premium);
    if (el.premiumCtaCard) el.premiumCtaCard.classList.toggle("hide", !premium);

    // ✅ When switching plan, clear irrelevant fields (avoid cross-contamination)
    if (!premium) {
      setHidden_("premium_color", "");
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

    if (el.pvTheme) {
      if (planIsPremium()) {
        el.pvTheme.textContent = (hidden.premium_color?.value || "").trim() || "p?";
      } else {
        const c = (hidden.color?.value || "").trim() || "c?";
        const s = (hidden.style?.value || "").trim() || "s?";
        const f = (hidden.paper?.value || "").trim() || "f?";
        el.pvTheme.textContent = `${c}/${s}/${f}`;
      }
    }
  }

  function refreshSummary_() {
    if (el.sumPlan) {
      el.sumPlan.textContent = planIsPremium()
        ? "精品設計"
        : hidden.plan?.value
          ? "自由搭配"
          : "-";
    }

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

  function refreshHeader_() {
    if (el.versionText) el.versionText.textContent = VERSION;
    if (el.tenantText) el.tenantText.textContent = state.tenant || DEFAULT_TENANT;
    if (el.cardIdText) el.cardIdText.textContent = state.id ? state.id : "-";
  }

  function restoreSelectionUI_() {
    // chips: plan/style/paper
    ["plan", "style", "paper"].forEach((g) => {
      const v = (hidden[g]?.value || "").trim();
      $$(`.chip[data-chip-group="${g}"]`).forEach((c) => {
        c.setAttribute("data-on", c.getAttribute("data-value") === v ? "1" : "0");
      });
    });

    // swatches: color/premium_color
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

  // -----------------------------
  // Draft (persist)
  // -----------------------------
  function saveDraft() {
    try {
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
          photo5_img: state.photo5_img
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
          cta_link: fields.cta_link?.value || ""
        }
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (_e) {}
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

      setHidden_("plan", normalizePlan_(v.plan || ""));
      setHidden_("color", (v.color || "").trim());
      setHidden_("style", (v.style || "").trim());
      setHidden_("paper", (v.paper || "").trim());
      setHidden_("premium_color", (v.premium_color || "").trim());

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
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_e) {}
  }

  // -----------------------------
  // Validation
  // -----------------------------
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
        if (!hidden.color?.value) {
          setErr("color", "請選擇顏色");
          return false;
        }
        if (!hidden.style?.value) {
          setErr("style", "請選擇版型");
          return false;
        }
        if (!hidden.paper?.value) {
          setErr("paper", "請選擇紙感");
          return false;
        }
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

  // -----------------------------
  // Step show
  // -----------------------------
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
    restoreSelectionUI_();
    refreshPreview_();
    refreshSummary_();
    refreshHeader_();
    saveDraft();

    if (opts && opts.scroll) {
      const sec = document.querySelector(`.step[data-step="${n}"]`);
      scrollToEl_(sec);
    }
  }

  // -----------------------------
  // Tap guards (avoid multi-click -> accidental route)
  // -----------------------------
  function navGuardOK_() {
    const now = Date.now();
    if (now < state.navLockUntil) return false;
    // lock 220ms to prevent double clicks & weird bubbling
    state.navLockUntil = now + 220;
    state.lastNavAt = now;
    return true;
  }

  function blockHeaderMultiTap_() {
    // If your ecosystem has "multi-tap to admin" on header/brand somewhere,
    // we block it in this fill form page (safety).
    const header = document.querySelector(".topbar");
    if (!header) return;

    let lastTap = 0;
    let tapCount = 0;

    header.addEventListener(
      "click",
      (e) => {
        // only protect when user is tapping the header/brand area (not Debug button)
        const isDebugBtn = e.target && (e.target.id === "openDebug" || e.target.closest("#openDebug"));
        if (isDebugBtn) return;

        const now = Date.now();
        if (now - lastTap < 420) tapCount++;
        else tapCount = 1;
        lastTap = now;

        if (tapCount >= 2) {
          // stop propagation so it won't trigger any hidden global handlers
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true // capture
    );
  }

  // -----------------------------
  // Bind chips/swatch (✅ 핵심：hard sync)
  // -----------------------------
  function bindChips_() {
    document.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip");
      if (!chip) return;

      const group = chip.getAttribute("data-chip-group");
      const val = chip.getAttribute("data-value");
      if (!group || !val) return;

      // ✅ hard write hidden value (this is the key fix)
      if (group === "plan") {
        const pv = normalizePlan_(val);
        setHidden_("plan", pv);
      } else {
        setHidden_(group, val);
      }

      // UI mark on
      $$(`.chip[data-chip-group="${group}"]`).forEach((c) => c.setAttribute("data-on", "0"));
      chip.setAttribute("data-on", "1");

      // plan switch must refresh UI & clear irrelevant fields
      if (group === "plan") {
        refreshPlanDependentUI_();
        // when switching plan, restore selection UI (so you won't see wrong on-state)
        restoreSelectionUI_();
      }

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

      // ✅ hard write hidden value
      setHidden_(group, val);

      // UI mark on
      row.querySelectorAll(".swatch").forEach((x) => x.setAttribute("data-on", "0"));
      sw.setAttribute("data-on", "1");

      saveDraft();
      refreshPreview_();
      refreshSummary_();
    });
  }

  // -----------------------------
  // Bind nav
  // -----------------------------
  function bindNav_() {
    if (el.prevBtn) {
      el.prevBtn.addEventListener("click", () => {
        if (!navGuardOK_()) return;
        showStep(Math.max(1, state.step - 1), { scroll: true });
      });
    }

    if (el.nextBtn) {
      el.nextBtn.addEventListener("click", () => {
        if (!navGuardOK_()) return;

        if (!validateStep_(state.step)) {
          setPill("請先完成本步驟必填");
          return;
        }
        showStep(Math.min(8, state.step + 1), { scroll: true });
      });
    }

    if (el.resetDraftBtn) {
      el.resetDraftBtn.addEventListener("click", () => {
        if (!confirm("確定要清除草稿嗎？")) return;
        clearDraft();
        location.reload();
      });
    }

    if (el.openDebug) {
      el.openDebug.addEventListener("click", () => {
        const text = [
          `HSC Fill Form v${VERSION}`,
          `tenant=${state.tenant}`,
          `id=${state.id || "-"}`,
          `token=${state.token ? state.token.slice(0, 8) + "..." : "-"}`,
          `sig=${state.sig ? "yes" : "no"}`,
          `plan=${hidden.plan?.value || "-"}`,
          `theme=${planIsPremium()
            ? (hidden.premium_color?.value || "-")
            : `${hidden.color?.value || "-"} / ${hidden.style?.value || "-"} / ${hidden.paper?.value || "-"}`}`,
          "",
          "Logs:",
          ...state.logs.slice(-50)
        ].join("\n");
        alert(text);
      });
    }
  }

  function bindLivePreview_() {
    if (!form) return;
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

  // -----------------------------
  // GAS GET helper (still used by submit pipeline in your other version)
  // (Submit pipeline not included here to keep this patch focused on linkage/nav bugs)
  // -----------------------------
  function getQS_() {
    const u = new URL(location.href);
    return {
      tenant: (u.searchParams.get("tenant") || DEFAULT_TENANT).trim() || DEFAULT_TENANT,
      sig: (u.searchParams.get("sig") || "").trim()
    };
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot() {
    if (!form) {
      console.error("[HSC] #hscForm not found");
      return;
    }

    const qs = getQS_();
    state.tenant = qs.tenant;
    state.sig = qs.sig;

    loadDraft();

    // ✅ if no plan chosen yet, keep empty (force user choose)
    // but if draft has plan, keep it
    if (!hidden.plan?.value) setHidden_("plan", "");

    bindChips_();
    bindNav_();
    bindLivePreview_();
    blockHeaderMultiTap_();

    // ✅ After bindings, refresh everything in correct order
    refreshPlanDependentUI_();
    restoreSelectionUI_();
    refreshPreview_();
    refreshSummary_();
    refreshHeader_();

    const st = clamp(Number(state.step || 1), 1, 8);
    showStep(st, { scroll: false });

    setPill("準備填寫");
    log("boot ok", { VERSION, tenant: state.tenant, sig: !!state.sig, step: st });
  }

  boot();
})();