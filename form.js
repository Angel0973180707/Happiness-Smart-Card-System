/* =========================================
 * 天使幸福智慧名片系統
 * form.js v4.7-align
 * COMPLETE OVERWRITE
 * -----------------------------------------
 * 對齊目標：
 * 1. form -> createLead
 * 2. 從網址讀 invite / reserved_uid / share_*
 * 3. 成功判斷改為 json.ok === true
 * 4. 成功後顯示 lead_id
 * 5. 暫不前端 createCard
 * 6. 保留圖片正式欄位：
 *    avatar_url / logo_url / photo1_url ~ photo5_url
 * 7. 保留圖片裁切 / 壓縮 / Firebase 上傳體驗
 * 8. 新增：
 *    - 填表說明 modal
 *    - 首頁門面參考 modal（不跳離表單）
 * 9. 方案分流：
 *    free = 2 photos / 1 CTA
 *    premium = 5 photos / 3 CTA
 * ========================================= */

(function () {
  "use strict";

  /* =========================
   * Helpers
   * ========================= */
  const $ = (id) => document.getElementById(id);
  const text = (v) => (v == null ? "" : String(v).trim());

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeSetText(el, value) {
    if (el) el.textContent = value == null ? "" : String(value);
  }

  function showEl(el, on = true, displayValue = "") {
    if (!el) return;
    el.style.display = on ? displayValue : "none";
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function normalizeUrl(v) {
    const s = text(v);
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (/^www\./i.test(s)) return "https://" + s;
    return s;
  }

  function toBoolean(v) {
    const s = String(v == null ? "" : v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(new Error("讀取圖片失敗"));
      fr.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("載入圖片失敗"));
      img.src = src;
    });
  }

  function canvasToBlob(canvas, type = "image/jpeg", quality = 0.9) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("輸出圖片失敗"));
      }, type, quality);
    });
  }

  async function copyText(value) {
    const v = String(value || "");
    if (!v) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(v);
        return true;
      }
    } catch (_) {}

    try {
      const ta = document.createElement("textarea");
      ta.value = v;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (_) {
      return false;
    }
  }

  function parseMaybeJson(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      const start = String(raw || "").indexOf("{");
      const end = String(raw || "").lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(String(raw).slice(start, end + 1));
        } catch (_) {
          return null;
        }
      }
      return null;
    }
  }

  /* =========================
   * Config
   * ========================= */
  const DEFAULT_GAS_URL =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const LINE_OA_URL = "https://lin.ee/G3VJoRm";
  const FACADE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const VERSION = "v4.7-align";

  const PLAN_RULES = {
    free: {
      maxPhotos: 2,
      maxCtas: 1,
      label: "自由搭配款"
    },
    premium: {
      maxPhotos: 5,
      maxCtas: 3,
      label: "精品設計款"
    }
  };

  const IMAGE_SLOTS = [
    { key: "avatar", label: "頭像", shape: "square", w: 1200, h: 1200 },
    { key: "logo", label: "Logo", shape: "square", w: 1200, h: 1200 },
    { key: "photo1", label: "照片 1", shape: "photo", w: 1600, h: 1000 },
    { key: "photo2", label: "照片 2", shape: "photo", w: 1600, h: 1000 },
    { key: "photo3", label: "照片 3", shape: "photo", w: 1600, h: 1000 },
    { key: "photo4", label: "照片 4", shape: "photo", w: 1600, h: 1000 },
    { key: "photo5", label: "照片 5", shape: "photo", w: 1600, h: 1000 }
  ];

  /* =========================
   * Firebase bridge
   * ========================= */
  let firebaseApi = null;
  let firebaseReady = false;

  async function ensureFirebaseBridge() {
    if (firebaseReady && firebaseApi) return firebaseApi;

    try {
      const mod = await import("./firebase.js");

      firebaseApi = {
        initFirebase: mod.initFirebase,
        ensureAuth: mod.ensureAuth,
        uploadAvatar: mod.uploadAvatar,
        uploadLogo: mod.uploadLogo,
        uploadPhoto: mod.uploadPhoto
      };

      if (!firebaseApi.initFirebase || !firebaseApi.ensureAuth) {
        throw new Error("firebase.js 缺少必要函式");
      }

      firebaseApi.initFirebase();
      await firebaseApi.ensureAuth();
      firebaseReady = true;
      return firebaseApi;
    } catch (err) {
      console.error("[form] Firebase bridge load failed:", err);
      throw new Error("Firebase 初始化失敗，請確認 firebase.js 是否正確部署");
    }
  }

  async function uploadBySlot(slotKey, blob, tempId) {
    const api = await ensureFirebaseBridge();

    if (slotKey === "avatar") return await api.uploadAvatar(tempId, blob);
    if (slotKey === "logo") return await api.uploadLogo(tempId, blob);
    if (/^photo\d+$/.test(slotKey)) {
      const idx = Number(slotKey.replace("photo", ""));
      return await api.uploadPhoto(tempId, blob, idx);
    }

    throw new Error("未知圖片欄位");
  }

  /* =========================
   * DOM
   * ========================= */
  const pages = document.querySelectorAll(".page");
  let currentPage = 0;

  const nextBtn = $("nextBtn");
  const prevBtn = $("prevBtn");
  const navDots = $("navDots");

  const planEl = $("plan");
  const colorEl = $("color");
  const styleEl = $("style");
  const paperEl = $("paper");
  const premiumColorEl = $("premium_color");
  const freeColorHidden = $("free_color");
  const freeStyleHidden = $("free_style");
  const freePaperHidden = $("free_paper");

  const freeStyleGroup = $("freeStyleGroup");
  const premiumColorCard = $("premiumColorCard");
  const ctaRow2 = $("ctaRow2");
  const ctaRow3 = $("ctaRow3");

  const uploadGrid = $("uploadGrid");
  const cropModal = $("cropModal");
  const cropCanvas = $("cropCanvas");
  const cropStage = $("cropStage");
  const cropZoomIn = $("cropZoomIn");
  const cropZoomOut = $("cropZoomOut");
  const cropCenter = $("cropCenter");
  const cropReset = $("cropReset");
  const cropCancel = $("cropCancel");
  const cropApply = $("cropApply");
  const cropTitle = $("cropTitle");
  const cropDesc = $("cropDesc");

  const btnSubmit = $("btnSubmit");
  const btnTest = $("btnTest");
  const btnReset = $("btnReset");

  const progressWrap = $("submitProgressWrap");
  const progressFill = $("submitProgressFill");
  const progressText = $("submitProgressText");
  const progressPercent = $("submitProgressPercent");
  const progressTitle = $("submitProgressTitle");

  const successBox = $("submitSuccessBox");
  const successIdEl = $("successCardId");
  const successCopyText = $("successCopyText");
  const copyBtn = $("copyBtn");

  const statusEl = $("status");
  const toastEl = $("toast");
  const loadingOverlay = $("loadingOverlay");

  const previewName = $("previewName");
  const previewUnit = $("previewUnit");
  const previewTitle = $("previewTitle");
  const previewSlogan = $("previewSlogan");
  const previewServices = $("previewServices");
  const previewExperience = $("previewExperience");
  const previewAvatar = $("previewAvatar");
  const previewLogo = $("previewLogo");
  const previewLogoWrap = $("previewLogoWrap");
  const previewPhotoWall = $("previewPhotoWall");
  const previewEmptyPhotos = $("previewEmptyPhotos");
  const previewServicesBlock = $("previewServicesBlock");
  const previewExperienceBlock = $("previewExperienceBlock");
  const livePreviewCard = $("livePreviewCard");

  const inviteCodeEl = $("invite_code");
  const reservedUidEl = $("reserved_uid");
  const tenantEl = $("tenant");

  const shareCardIdEl = $("share_card_id");
  const shareAgentIdEl = $("share_agent_id");
  const shareSourceEl = $("share_source");
  const shareChannelEl = $("share_channel");
  const shareVisitIdEl = $("share_visit_id");

  const guideModal = $("guideModal");
  const facadeModal = $("facadeModal");
  const openGuideTopBtn = $("openGuideTopBtn");
  const openGuideBtn = $("openGuideBtn");
  const closeGuideBtn = $("closeGuideBtn");
  const guideConfirmBtn = $("guideConfirmBtn");
  const guideGoFacadeBtn = $("guideGoFacadeBtn");

  const openFacadeTopBtn = $("openFacadeTopBtn");
  const openFacadeBtn = $("openFacadeBtn");
  const closeFacadeBtn = $("closeFacadeBtn");
  const facadeBackBtn = $("facadeBackBtn");
  const facadeFrame = $("facadeFrame");

  /* =========================
   * State
   * ========================= */
  let submitting = false;
  let tempUploadId = `TMP${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const imageState = {
    files: {
      avatar: null,
      logo: null,
      photo1: null,
      photo2: null,
      photo3: null,
      photo4: null,
      photo5: null
    },
    crop: {
      slot: "",
      file: null,
      img: null,
      scale: 1,
      minScale: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      startX: 0,
      startY: 0,
      baseX: 0,
      baseY: 0,
      targetW: 1200,
      targetH: 1200
    }
  };

  /* =========================
   * URL params / hidden fields
   * ========================= */
  function applyUrlParams() {
    const qs = new URLSearchParams(location.search);

    const invite = text(qs.get("invite"));
    const reservedUid = text(qs.get("reserved_uid") || qs.get("reservedUid"));
    const tenant = text(qs.get("tenant")) || "angel";

    const shareCardId = text(qs.get("share_card_id") || qs.get("shareCardId"));
    const shareAgentId = text(qs.get("share_agent_id") || qs.get("shareAgentId"));
    const shareSource = text(qs.get("share_source") || qs.get("shareSource"));
    const shareChannel = text(qs.get("share_channel") || qs.get("shareChannel"));
    const shareVisitId = text(qs.get("share_visit_id") || qs.get("shareVisitId"));

    if (inviteCodeEl) inviteCodeEl.value = invite;
    if (reservedUidEl) reservedUidEl.value = reservedUid;
    if (tenantEl) tenantEl.value = tenant || "angel";

    if (shareCardIdEl) shareCardIdEl.value = shareCardId;
    if (shareAgentIdEl) shareAgentIdEl.value = shareAgentId;
    if (shareSourceEl) shareSourceEl.value = shareSource;
    if (shareChannelEl) shareChannelEl.value = shareChannel;
    if (shareVisitIdEl) shareVisitIdEl.value = shareVisitId;

    if (facadeFrame && !facadeFrame.getAttribute("src")) {
      facadeFrame.setAttribute("src", FACADE_URL);
    }
  }

  /* =========================
   * Status / Toast / Loading
   * ========================= */
  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg || "";
    toastEl.style.position = "fixed";
    toastEl.style.left = "50%";
    toastEl.style.bottom = "24px";
    toastEl.style.transform = "translateX(-50%)";
    toastEl.style.background = "rgba(0,0,0,.82)";
    toastEl.style.color = "#fff";
    toastEl.style.padding = "10px 14px";
    toastEl.style.borderRadius = "999px";
    toastEl.style.fontSize = "13px";
    toastEl.style.zIndex = "9999";
    toastEl.style.display = "block";

    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toastEl.style.display = "none";
    }, 1800);
  }

  function setLoading(on, textValue) {
    if (!loadingOverlay) return;
    const textEl = loadingOverlay.querySelector(".loadingText");
    if (textEl && textValue) textEl.textContent = textValue;
    loadingOverlay.style.display = on ? "flex" : "none";
  }

  /* =========================
   * Modal helpers
   * ========================= */
  function openAssistModal(modal) {
    if (!modal) return;
    modal.classList.add("show");
    document.body.classList.add("modal-open");
  }

  function closeAssistModal(modal) {
    if (!modal) return;
    modal.classList.remove("show");
    if (!guideModal?.classList.contains("show") && !facadeModal?.classList.contains("show") && !cropModal?.classList.contains("show")) {
      document.body.classList.remove("modal-open");
    }
  }

  function bindAssistModals() {
    [openGuideTopBtn, openGuideBtn].forEach((btn) => {
      btn?.addEventListener("click", () => openAssistModal(guideModal));
    });

    [openFacadeTopBtn, openFacadeBtn].forEach((btn) => {
      btn?.addEventListener("click", () => openAssistModal(facadeModal));
    });

    closeGuideBtn?.addEventListener("click", () => closeAssistModal(guideModal));
    guideConfirmBtn?.addEventListener("click", () => closeAssistModal(guideModal));

    guideGoFacadeBtn?.addEventListener("click", () => {
      closeAssistModal(guideModal);
      openAssistModal(facadeModal);
    });

    closeFacadeBtn?.addEventListener("click", () => closeAssistModal(facadeModal));
    facadeBackBtn?.addEventListener("click", () => closeAssistModal(facadeModal));

    guideModal?.addEventListener("click", (e) => {
      if (e.target === guideModal) closeAssistModal(guideModal);
    });

    facadeModal?.addEventListener("click", (e) => {
      if (e.target === facadeModal) closeAssistModal(facadeModal);
    });
  }

  /* =========================
   * Page control
   * ========================= */
  function showPage(i) {
    const safeIndex = Math.max(0, Math.min(i, pages.length - 1));
    pages.forEach((p, idx) => p.classList.toggle("active", idx === safeIndex));
    currentPage = safeIndex;
    updateNav();
  }

  function updateNav() {
    if (prevBtn) prevBtn.style.display = currentPage === 0 ? "none" : "inline-block";
    if (nextBtn) nextBtn.style.display = currentPage === pages.length - 1 ? "none" : "inline-block";

    if (navDots) {
      navDots.innerHTML = "";
      pages.forEach((_, idx) => {
        const d = document.createElement("span");
        if (idx === currentPage) d.classList.add("active");
        navDots.appendChild(d);
      });
    }
  }

  nextBtn?.addEventListener("click", () => {
    if (currentPage < pages.length - 1) {
      showPage(currentPage + 1);
      if (currentPage + 1 === 5) renderSummary();
    }
  });

  prevBtn?.addEventListener("click", () => {
    if (currentPage > 0) showPage(currentPage - 1);
  });

  /* =========================
   * Plan rules
   * ========================= */
  function getCurrentPlan() {
    const p = text(planEl?.value).toLowerCase();
    return p === "premium" ? "premium" : p === "free" ? "free" : "";
  }

  function getPlanRules(plan) {
    return PLAN_RULES[plan] || PLAN_RULES.free;
  }

  function allowedPhotoCount() {
    return getPlanRules(getCurrentPlan() || "free").maxPhotos;
  }

  function slotEnabled(slotKey) {
    if (slotKey === "avatar" || slotKey === "logo") return true;
    const n = Number(String(slotKey).replace("photo", ""));
    return n <= allowedPhotoCount();
  }

  function syncFreeShadowFields() {
    if (freeColorHidden) freeColorHidden.value = text(colorEl?.value);
    if (freeStyleHidden) freeStyleHidden.value = text(styleEl?.value);
    if (freePaperHidden) freePaperHidden.value = text(paperEl?.value);
  }

  function applyPlanUI() {
    const plan = getCurrentPlan();
    const rules = getPlanRules(plan || "free");

    showEl(freeStyleGroup, plan !== "premium");
    showEl(premiumColorCard, plan === "premium");

    if (ctaRow2) ctaRow2.style.display = rules.maxCtas >= 2 ? "block" : "none";
    if (ctaRow3) ctaRow3.style.display = rules.maxCtas >= 3 ? "block" : "none";

    if (plan === "free") {
      if (premiumColorEl) premiumColorEl.value = "";
      syncFreeShadowFields();
    } else if (plan === "premium") {
      if (colorEl) colorEl.value = "";
      if (styleEl) styleEl.value = "";
      if (paperEl) paperEl.value = "";
      if (freeColorHidden) freeColorHidden.value = "";
      if (freeStyleHidden) freeStyleHidden.value = "";
      if (freePaperHidden) freePaperHidden.value = "";
    }

    if (rules.maxCtas < 2) {
      if ($("cta_text_2")) $("cta_text_2").value = "";
      if ($("cta_link_2")) $("cta_link_2").value = "";
    }

    if (rules.maxCtas < 3) {
      if ($("cta_text_3")) $("cta_text_3").value = "";
      if ($("cta_link_3")) $("cta_link_3").value = "";
    }

    ["photo3", "photo4", "photo5"].forEach((key) => {
      if (!slotEnabled(key) && imageState.files[key]) {
        clearSlot(key);
      }
    });

    renderUploadGrid();
    renderPreview();
    renderSummary();
  }

  planEl?.addEventListener("change", applyPlanUI);
  colorEl?.addEventListener("change", syncFreeShadowFields);
  styleEl?.addEventListener("change", syncFreeShadowFields);
  paperEl?.addEventListener("change", syncFreeShadowFields);

  /* =========================
   * Form data
   * ========================= */
  function getFormData() {
    const plan = text($("plan")?.value);
    const color = text($("color")?.value);
    const style = text($("style")?.value);
    const paper = text($("paper")?.value);
    const premiumColor = text($("premium_color")?.value);

    return {
      plan,

      color: plan === "free" ? color : "",
      style: plan === "free" ? style : "",
      paper: plan === "free" ? paper : "",

      free_color: plan === "free" ? color : "",
      free_style: plan === "free" ? style : "",
      free_paper: plan === "free" ? paper : "",

      premium_color: plan === "premium" ? premiumColor : "",

      name: text($("name")?.value),
      unit: text($("unit")?.value),
      title: text($("title")?.value),
      slogan: text($("slogan")?.value),

      phone: text($("phone")?.value),
      email: text($("email")?.value),
      line_url: normalizeUrl($("line_url")?.value),
      line_oa: normalizeUrl($("line_oa")?.value),
      wechat_id: text($("wechat_id")?.value),
      address: text($("address")?.value),
      website: normalizeUrl($("website")?.value),

      services: text($("services")?.value),
      experience: text($("experience")?.value),

      video1: normalizeUrl($("video1")?.value),
      video2: normalizeUrl($("video2")?.value),
      video3: normalizeUrl($("video3")?.value),

      social1: normalizeUrl($("social1")?.value),
      social2: normalizeUrl($("social2")?.value),
      social3: normalizeUrl($("social3")?.value),

      cta_text_1: text($("cta_text_1")?.value),
      cta_link_1: normalizeUrl($("cta_link_1")?.value),
      cta_text_2: text($("cta_text_2")?.value),
      cta_link_2: normalizeUrl($("cta_link_2")?.value),
      cta_text_3: text($("cta_text_3")?.value),
      cta_link_3: normalizeUrl($("cta_link_3")?.value),

      invite_code: text(inviteCodeEl?.value),
      reserved_uid: text(reservedUidEl?.value),
      tenant: text(tenantEl?.value) || "angel",

      share_card_id: text(shareCardIdEl?.value),
      share_agent_id: text(shareAgentIdEl?.value),
      share_source: text(shareSourceEl?.value),
      share_channel: text(shareChannelEl?.value),
      share_visit_id: text(shareVisitIdEl?.value),

      avatar_url: imageState.files.avatar?.url || "",
      logo_url: imageState.files.logo?.url || "",
      photo1_url: imageState.files.photo1?.url || "",
      photo2_url: imageState.files.photo2?.url || "",
      photo3_url: imageState.files.photo3?.url || "",
      photo4_url: imageState.files.photo4?.url || "",
      photo5_url: imageState.files.photo5?.url || ""
    };
  }

  function getLeadPayload() {
    const data = getFormData();

    return {
      action: "createLead",
      tenant: data.tenant,

      invite_code: data.invite_code,
      reserved_uid: data.reserved_uid,

      plan: data.plan,
      color: data.color,
      style: data.style,
      paper: data.paper,

      name: data.name,
      phone: data.phone,
      email: data.email,
      unit: data.unit,
      title: data.title,
      line_url: data.line_url,
      line_oa: data.line_oa,
      wechat_id: data.wechat_id,
      address: data.address,
      services: data.services,
      experience: data.experience,
      website: data.website,

      source: "form",
      form_source: "form",
      process_status: "submitted",

      share_card_id: data.share_card_id,
      share_agent_id: data.share_agent_id,
      share_source: data.share_source,
      share_channel: data.share_channel,
      share_visit_id: data.share_visit_id,

      note: "",

      /* 以下先保留，之後 createCard 可承接；
         v4.7 createLead 目前不會正式入 lead_db 主欄位，但前端先保留 */
      slogan: data.slogan,
      video1: data.video1,
      video2: data.video2,
      video3: data.video3,
      social1: data.social1,
      social2: data.social2,
      social3: data.social3,
      cta_text_1: data.cta_text_1,
      cta_link_1: data.cta_link_1,
      cta_text_2: data.cta_text_2,
      cta_link_2: data.cta_link_2,
      cta_text_3: data.cta_text_3,
      cta_link_3: data.cta_link_3,
      premium_color: data.premium_color,
      free_color: data.free_color,
      free_style: data.free_style,
      free_paper: data.free_paper,
      avatar_url: data.avatar_url,
      logo_url: data.logo_url,
      photo1_url: data.photo1_url,
      photo2_url: data.photo2_url,
      photo3_url: data.photo3_url,
      photo4_url: data.photo4_url,
      photo5_url: data.photo5_url
    };
  }
/* =========================
   * Summary
   * ========================= */
  function renderSummary() {
    const box = $("summaryBox");
    if (!box) return;

    const d = getFormData();
    const planLabel =
      d.plan === "premium"
        ? "精品設計款"
        : d.plan === "free"
        ? "自由搭配款"
        : "-";

    const schemeText =
      d.plan === "premium"
        ? `精品色：${escapeHtml(d.premium_color || "-")}｜照片：5 張｜CTA：3 個`
        : `主色：${escapeHtml(d.color || "-")}｜版型：${escapeHtml(d.style || "-")}｜紙感：${escapeHtml(d.paper || "-")}｜照片：2 張｜CTA：1 個`;

    const photoCount = [
      d.photo1_url,
      d.photo2_url,
      d.photo3_url,
      d.photo4_url,
      d.photo5_url
    ].filter(Boolean).length;

    box.innerHTML = `
      <div class="card">
        <strong>${escapeHtml(d.name || "未填姓名")}</strong><br/>
        ${escapeHtml(d.unit || "")} ${escapeHtml(d.title || "")}
        <div style="margin-top:6px;">${escapeHtml(d.slogan || "")}</div>
      </div>

      <div class="card">
        <div>方案：${escapeHtml(planLabel)}</div>
        <div style="margin-top:4px;">${schemeText}</div>
      </div>

      <div class="card">
        <div>電話：${escapeHtml(d.phone || "-")}</div>
        <div>Email：${escapeHtml(d.email || "-")}</div>
        <div>LINE：${escapeHtml(d.line_url || d.line_oa || "-")}</div>
        <div>微信：${escapeHtml(d.wechat_id || "-")}</div>
      </div>

      <div class="card">
        <div>頭像：${escapeHtml(d.avatar_url ? "已上傳" : "未上傳")}</div>
        <div>Logo：${escapeHtml(d.logo_url ? "已上傳" : "未上傳")}</div>
        <div>照片牆：${escapeHtml(String(photoCount) + " 張")}</div>
      </div>

      <div class="card">
        <div>invite_code：${escapeHtml(d.invite_code || "-")}</div>
        <div>reserved_uid：${escapeHtml(d.reserved_uid || "-")}</div>
        <div>share_source：${escapeHtml(d.share_source || "-")}</div>
      </div>
    `;
  }

  /* =========================
   * Preview
   * ========================= */
  function renderPreview() {
    const data = getFormData();

    safeSetText(previewName, data.name || "您的姓名");
    safeSetText(previewUnit, data.unit || "");
    safeSetText(previewTitle, data.title || "");
    safeSetText(previewSlogan, data.slogan || "");

    const services = data.services || "";
    const experience = data.experience || "";

    safeSetText(previewServices, services);
    safeSetText(previewExperience, experience);
    showEl(previewServicesBlock, !!services);
    showEl(previewExperienceBlock, !!experience);

    const avatar = imageState.files.avatar?.previewUrl || "";
    const logo = imageState.files.logo?.previewUrl || "";

    if (previewAvatar) {
      if (avatar) {
        previewAvatar.src = avatar;
        previewAvatar.style.display = "block";
      } else {
        previewAvatar.removeAttribute("src");
        previewAvatar.style.display = "none";
      }
    }

    if (previewLogo && previewLogoWrap) {
      if (logo) {
        previewLogo.src = logo;
        previewLogoWrap.style.display = "";
      } else {
        previewLogo.removeAttribute("src");
        previewLogoWrap.style.display = "none";
      }
    }

    if (previewPhotoWall) {
      previewPhotoWall.innerHTML = "";
      const photoKeys = ["photo1", "photo2", "photo3", "photo4", "photo5"].filter(slotEnabled);
      const urls = photoKeys
        .map((k) => imageState.files[k]?.previewUrl || "")
        .filter(Boolean);

      urls.forEach((url) => {
        const item = document.createElement("div");
        item.className = "hsc-preview-photoItem";
        item.innerHTML = `<img src="${escapeHtml(url)}" alt="圖片預覽">`;
        previewPhotoWall.appendChild(item);
      });

      showEl(previewEmptyPhotos, !urls.length);
    }

    if (livePreviewCard) {
      livePreviewCard.dataset.plan = data.plan || "free";
      livePreviewCard.dataset.color = data.free_color || data.color || "c1";
      livePreviewCard.dataset.style = data.free_style || data.style || "s1";
      livePreviewCard.dataset.paper = data.free_paper || data.paper || "f1";
      livePreviewCard.dataset.premium = data.premium_color || "p1";
    }
  }

  /* =========================
   * Upload grid
   * ========================= */
  function renderUploadGrid() {
    if (!uploadGrid) return;

    uploadGrid.innerHTML = "";

    IMAGE_SLOTS.forEach((slot) => {
      if (!slotEnabled(slot.key)) return;

      const wrap = document.createElement("div");
      wrap.className = "uItem";
      wrap.dataset.key = slot.key;

      const isSquare = slot.shape === "square" ? "square" : "";
      const fileObj = imageState.files[slot.key];
      const preview = fileObj?.previewUrl || "";

      wrap.innerHTML = `
        <div class="uItemHead">
          <div>
            <strong>${escapeHtml(slot.label)}</strong>
            <small>${slot.shape === "square" ? "正方形裁切，套用後正式寫入 URL" : "照片牆橫圖，套用後正式寫入 URL"}</small>
          </div>
        </div>

        <div class="thumb ${isSquare}" id="thumb_${slot.key}">
          ${preview ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(slot.label)}">` : "尚未上傳圖片"}
        </div>

        <div class="miniRow">
          <input type="file" id="file_${slot.key}" accept="image/*">
          <button type="button" class="secondary" id="edit_${slot.key}" ${preview ? "" : "disabled"}>調整位置</button>
          <button type="button" class="ghost" id="clear_${slot.key}" ${preview ? "" : "disabled"}>清除</button>
        </div>
      `;

      uploadGrid.appendChild(wrap);

      const fileInput = wrap.querySelector(`#file_${slot.key}`);
      const editBtn = wrap.querySelector(`#edit_${slot.key}`);
      const clearBtn = wrap.querySelector(`#clear_${slot.key}`);

      fileInput?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
          setStatus("圖片過大，請選擇 20MB 以下圖片。");
          e.target.value = "";
          return;
        }

        try {
          await openCropForSlot(slot.key, file);
        } catch (err) {
          console.error(err);
          setStatus(err.message || "圖片讀取失敗");
        } finally {
          e.target.value = "";
        }
      });

      editBtn?.addEventListener("click", async () => {
        const current = imageState.files[slot.key];
        if (!current?.sourceFile) return;

        try {
          await openCropForSlot(slot.key, current.sourceFile, current.cropData || null);
        } catch (err) {
          console.error(err);
          setStatus(err.message || "重新讀取圖片失敗");
        }
      });

      clearBtn?.addEventListener("click", () => clearSlot(slot.key));
    });
  }

  function clearSlot(slotKey) {
    const old = imageState.files[slotKey];
    if (old?.previewUrl?.startsWith("blob:")) {
      try { URL.revokeObjectURL(old.previewUrl); } catch (_) {}
    }

    imageState.files[slotKey] = null;
    renderUploadGrid();
    renderPreview();
    renderSummary();
  }

  /* =========================
   * Crop system
   * ========================= */
  function openCropModal() {
    if (cropModal) cropModal.classList.add("show");
    document.body.classList.add("modal-open");
  }

  function closeCropModal() {
    if (cropModal) cropModal.classList.remove("show");
    imageState.crop.dragging = false;

    if (!guideModal?.classList.contains("show") && !facadeModal?.classList.contains("show")) {
      document.body.classList.remove("modal-open");
    }
  }

  function getCanvasRect() {
    const rect = cropCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      cssW: rect.width || 300,
      cssH: rect.height || 300,
      pxW: Math.max(1, Math.round((rect.width || 300) * dpr)),
      pxH: Math.max(1, Math.round((rect.height || 300) * dpr)),
      dpr
    };
  }

  function cropPointer(e) {
    if (e.touches?.[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function clampCrop() {
    const c = imageState.crop;
    if (!c.img) return;

    const rect = getCanvasRect();
    const drawW = c.img.width * c.scale;
    const drawH = c.img.height * c.scale;

    const maxX = Math.max(0, (drawW - rect.pxW) / 2);
    const maxY = Math.max(0, (drawH - rect.pxH) / 2);

    c.offsetX = Math.max(-maxX, Math.min(maxX, c.offsetX));
    c.offsetY = Math.max(-maxY, Math.min(maxY, c.offsetY));
  }

  function resetCropView(existingCrop) {
    const c = imageState.crop;
    if (!c.img) return;

    const rect = getCanvasRect();
    const fitScale = Math.max(rect.pxW / c.img.width, rect.pxH / c.img.height);

    c.minScale = fitScale;
    c.scale = existingCrop?.scale ? Math.max(fitScale, existingCrop.scale) : fitScale;
    c.offsetX = Number(existingCrop?.offsetX || 0);
    c.offsetY = Number(existingCrop?.offsetY || 0);
    clampCrop();
  }

  function drawCropCanvas() {
    const c = imageState.crop;
    if (!cropCanvas || !c.img) return;

    const rect = getCanvasRect();
    cropCanvas.width = rect.pxW;
    cropCanvas.height = rect.pxH;

    const ctx = cropCanvas.getContext("2d");
    ctx.clearRect(0, 0, rect.pxW, rect.pxH);

    const drawW = c.img.width * c.scale;
    const drawH = c.img.height * c.scale;
    const x = (rect.pxW - drawW) / 2 + c.offsetX;
    const y = (rect.pxH - drawH) / 2 + c.offsetY;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(c.img, x, y, drawW, drawH);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 2 * rect.dpr;
    ctx.strokeRect(0, 0, rect.pxW, rect.pxH);
    ctx.restore();
  }

  async function prepareImage(file) {
    const dataUrl = await readFileAsDataURL(file);
    const rawImg = await loadImage(dataUrl);

    const resized = resizeSmart(rawImg, file.size || 0);
    const resizedBlob = await canvasToBlob(resized.canvas, "image/jpeg", resized.quality);
    const resizedUrl = await readFileAsDataURL(resizedBlob);
    const finalImg = await loadImage(resizedUrl);

    return {
      img: finalImg,
      quality: resized.quality
    };
  }

  function resizeSmart(img, size) {
    let maxLong = 1800;
    let quality = 0.9;

    if (size > 4 * 1024 * 1024) {
      maxLong = 1500;
      quality = 0.84;
    }
    if (size > 10 * 1024 * 1024) {
      maxLong = 1200;
      quality = 0.78;
    }

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const long = Math.max(w, h);

    if (long <= maxLong) {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      return { canvas, quality };
    }

    const ratio = maxLong / long;
    const nw = Math.round(w * ratio);
    const nh = Math.round(h * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, nw, nh);

    return { canvas, quality };
  }

  async function openCropForSlot(slotKey, file, existingCrop = null) {
    const slot = IMAGE_SLOTS.find((s) => s.key === slotKey);
    if (!slot) return;

    const prepared = await prepareImage(file);

    imageState.crop.slot = slotKey;
    imageState.crop.file = file;
    imageState.crop.img = prepared.img;
    imageState.crop.targetW = slot.w;
    imageState.crop.targetH = slot.h;

    const ratioClass = slot.shape === "square" ? "ratio-square" : "ratio-photo";
    if (cropStage) {
      cropStage.classList.remove("ratio-square", "ratio-logo", "ratio-photo");
      cropStage.classList.add(ratioClass);
    }

    if (cropTitle) cropTitle.textContent = `調整${slot.label}位置`;
    if (cropDesc) {
      cropDesc.textContent =
        slot.shape === "square"
          ? "可拖移位置，並用按鈕放大、縮小、置中、重設後再套用。套用後會直接上傳並寫入正式 URL。"
          : "照片牆橫圖支援上下左右拖移與縮放，套用後會直接上傳並寫入正式 URL。";
    }

    openCropModal();
    resetCropView(existingCrop);
    drawCropCanvas();
  }

  async function applyCrop() {
    const c = imageState.crop;
    const slot = IMAGE_SLOTS.find((s) => s.key === c.slot);
    if (!slot || !c.img) return;

    try {
      setLoading(true, `處理 ${slot.label} 中...`);
      setStatus(`正在上傳 ${slot.label}...`);

      const rect = getCanvasRect();
      const stageCanvas = document.createElement("canvas");
      stageCanvas.width = rect.pxW;
      stageCanvas.height = rect.pxH;
      const sctx = stageCanvas.getContext("2d");

      const drawW = c.img.width * c.scale;
      const drawH = c.img.height * c.scale;
      const x = (rect.pxW - drawW) / 2 + c.offsetX;
      const y = (rect.pxH - drawH) / 2 + c.offsetY;

      sctx.fillStyle = "#ffffff";
      sctx.fillRect(0, 0, rect.pxW, rect.pxH);
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(c.img, x, y, drawW, drawH);

      const out = document.createElement("canvas");
      out.width = slot.w;
      out.height = slot.h;
      const octx = out.getContext("2d");
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, slot.w, slot.h);
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = "high";
      octx.drawImage(stageCanvas, 0, 0, slot.w, slot.h);

      const blob = await canvasToBlob(out, "image/jpeg", 0.9);
      const previewUrl = URL.createObjectURL(blob);
      const url = await uploadBySlot(slot.key, blob, tempUploadId);

      const old = imageState.files[slot.key];
      if (old?.previewUrl?.startsWith("blob:")) {
        try { URL.revokeObjectURL(old.previewUrl); } catch (_) {}
      }

      imageState.files[slot.key] = {
        sourceFile: c.file,
        blob,
        url,
        previewUrl,
        cropData: {
          scale: c.scale,
          offsetX: c.offsetX,
          offsetY: c.offsetY
        }
      };

      closeCropModal();
      renderUploadGrid();
      renderPreview();
      renderSummary();
      setStatus(`${slot.label} 已套用並上傳完成`);
      showToast(`${slot.label} 已上傳完成`);
    } catch (err) {
      console.error(err);
      setStatus(`${slot.label} 上傳失敗：${err.message || "未知錯誤"}`);
      showToast("圖片上傳失敗");
    } finally {
      setLoading(false);
    }
  }

  function bindCropEvents() {
    if (!cropCanvas) return;

    const down = (e) => {
      if (!imageState.crop.img) return;
      const p = cropPointer(e);
      imageState.crop.dragging = true;
      imageState.crop.startX = p.x;
      imageState.crop.startY = p.y;
      imageState.crop.baseX = imageState.crop.offsetX;
      imageState.crop.baseY = imageState.crop.offsetY;
      e.preventDefault?.();
    };

    const move = (e) => {
      if (!imageState.crop.dragging) return;
      const p = cropPointer(e);
      imageState.crop.offsetX = imageState.crop.baseX + (p.x - imageState.crop.startX);
      imageState.crop.offsetY = imageState.crop.baseY + (p.y - imageState.crop.startY);
      clampCrop();
      drawCropCanvas();
      e.preventDefault?.();
    };

    const up = () => {
      imageState.crop.dragging = false;
    };

    cropCanvas.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

    cropCanvas.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);

    cropZoomIn?.addEventListener("click", () => {
      const c = imageState.crop;
      c.scale *= 1.1;
      clampCrop();
      drawCropCanvas();
    });

    cropZoomOut?.addEventListener("click", () => {
      const c = imageState.crop;
      c.scale = Math.max(c.minScale, c.scale * 0.9);
      clampCrop();
      drawCropCanvas();
    });

    cropCenter?.addEventListener("click", () => {
      imageState.crop.offsetX = 0;
      imageState.crop.offsetY = 0;
      drawCropCanvas();
    });

    cropReset?.addEventListener("click", () => {
      resetCropView();
      drawCropCanvas();
    });

    cropCancel?.addEventListener("click", () => {
      closeCropModal();
    });

    cropApply?.addEventListener("click", async () => {
      await applyCrop();
    });

    cropModal?.addEventListener("click", (e) => {
      if (e.target === cropModal) closeCropModal();
    });
  }
/* =========================
   * Submit helpers
   * ========================= */
  const GAS_URL = text($("gas")?.value) || DEFAULT_GAS_URL;

  function showProgress() {
    if (progressWrap) progressWrap.style.display = "block";
  }

  function setProgress(p, msg) {
    if (progressFill) progressFill.style.width = `${p}%`;
    if (progressPercent) progressPercent.textContent = `${p}%`;
    if (progressText && msg) progressText.textContent = msg;
    if (progressTitle) progressTitle.textContent = p >= 100 ? "完成" : "送出中";
  }

  function buildServiceReplyText(leadId) {
    const id = String(leadId || "").trim() || "（未取得申請編號）";
    return [
      "您好，我已完成天使幸福智慧名片資料填寫。",
      "",
      `我的申請編號是：${id}`,
      "",
      "請協助我確認並進入後續製作流程，謝謝 🙏"
    ].join("\n");
  }

  function fillSuccessBox(leadId) {
    if (successIdEl) successIdEl.textContent = leadId || "-";
    if (successCopyText) successCopyText.value = buildServiceReplyText(leadId);
    if (successBox) successBox.style.display = "block";
    showToast("已完成，可直接複製申請編號並回覆客服");
  }

  function enforcePlanRules(payload) {
    const plan = payload.plan || "";

    if (plan === "free") {
      payload.cta_text_2 = "";
      payload.cta_link_2 = "";
      payload.cta_text_3 = "";
      payload.cta_link_3 = "";

      payload.photo3_url = "";
      payload.photo4_url = "";
      payload.photo5_url = "";
      payload.premium_color = "";

      payload.color = payload.color || payload.free_color || "";
      payload.style = payload.style || payload.free_style || "";
      payload.paper = payload.paper || payload.free_paper || "";
      payload.free_color = payload.free_color || payload.color || "";
      payload.free_style = payload.free_style || payload.style || "";
      payload.free_paper = payload.free_paper || payload.paper || "";
    }

    if (plan === "premium") {
      payload.color = "";
      payload.style = "";
      payload.paper = "";
      payload.free_color = "";
      payload.free_style = "";
      payload.free_paper = "";

      if (!payload.premium_color) {
        throw new Error("請選擇精品設計款顏色");
      }
    }

    if (plan !== "free" && plan !== "premium") {
      throw new Error("請先選擇方案");
    }

    return payload;
  }

  function validateCTAGroup(data) {
    const max = data.plan === "premium" ? 3 : 1;

    for (let i = 1; i <= max; i++) {
      const t = text(data[`cta_text_${i}`]);
      const l = text(data[`cta_link_${i}`]);
      if ((t && !l) || (!t && l)) {
        showPage(3);
        throw new Error(`CTA ${i} 需同時填寫文字與連結`);
      }
    }
  }

  function validateBeforeSubmit(data) {
    if (!data.plan) {
      showPage(0);
      throw new Error("請先選擇方案");
    }

    if (data.plan === "free") {
      if (!data.color || !data.style || !data.paper) {
        showPage(0);
        throw new Error("自由搭配款請完成主色、版型、紙感選擇");
      }
    }

    if (data.plan === "premium") {
      if (!data.premium_color) {
        showPage(0);
        throw new Error("精品設計款請選擇精品顏色");
      }
    }

    if (!data.name) {
      showPage(1);
      throw new Error("請填寫姓名");
    }

    const contactOK = !!(
      data.phone ||
      data.email ||
      data.line_url ||
      data.line_oa ||
      data.wechat_id
    );

    if (!contactOK) {
      showPage(2);
      throw new Error("請至少填寫一種聯絡方式");
    }

    validateCTAGroup(data);
    return true;
  }

  async function ensureAllImagesUploaded() {
    await ensureFirebaseBridge();

    const keys = ["avatar", "logo", "photo1", "photo2", "photo3", "photo4", "photo5"];
    for (const key of keys) {
      if (!slotEnabled(key)) continue;
      const fileObj = imageState.files[key];
      if (!fileObj) continue;

      if (!fileObj.url && fileObj.blob) {
        setStatus(`補上傳 ${key} 中...`);
        fileObj.url = await uploadBySlot(key, fileObj.blob, tempUploadId);
      }
    }
  }

  async function postJson(url, bodyObj) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(bodyObj)
    });

    const raw = await res.text();
    const json = parseMaybeJson(raw);

    if (!res.ok) {
      throw new Error(`伺服器回應錯誤：${res.status}`);
    }
    if (!json) {
      throw new Error("回應解析失敗");
    }
    return json;
  }

  /* =========================
   * Actions
   * ========================= */
  btnTest?.addEventListener("click", async () => {
    setStatus("測試中...");
    try {
      const res = await fetch(`${GAS_URL}?action=ping&_v=${encodeURIComponent(VERSION)}`, {
        method: "GET",
        cache: "no-store"
      });
      const raw = await res.text();
      const json = parseMaybeJson(raw);

      if (!json || json.ok !== true) {
        throw new Error(json?.error || json?.message || "ping 失敗");
      }

      setStatus("連線成功：" + (json?.version || "OK"));
      showToast("連線成功");
    } catch (err) {
      setStatus("連線失敗：" + err.message);
      showToast("連線失敗");
    }
  });

  btnReset?.addEventListener("click", () => {
    if (confirm("確定要清空所有資料？")) {
      location.reload();
    }
  });

  copyBtn?.addEventListener("click", async () => {
    const ok = await copyText(successCopyText?.value || "");
    if (ok) {
      setStatus("已複製客服文案");
      showToast("已複製客服文案");
    } else {
      setStatus("複製失敗，請手動複製");
    }
  });

  btnSubmit?.addEventListener("click", async () => {
    if (submitting) {
      showToast("資料送出中，請稍候…");
      return;
    }

    let data;

    try {
      data = getFormData();
      validateBeforeSubmit(data);
    } catch (err) {
      setStatus(err.message);
      return;
    }

    try {
      submitting = true;

      setStatus("開始送出...");
      showProgress();
      setProgress(5, "初始化...");
      setLoading(true, "準備送出資料");

      setProgress(18, "初始化 Firebase...");
      await ensureFirebaseBridge();

      setProgress(32, "確認圖片 URL...");
      await ensureAllImagesUploaded();

      let payload = getLeadPayload();

      setProgress(48, "套用方案規則...");
      payload = enforcePlanRules(payload);

      setProgress(62, "送出至 createLead...");

      const json = await postJson(GAS_URL, payload);

      if (!json || json.ok !== true) {
        throw new Error(json?.error || json?.message || "建立 lead 失敗");
      }

      setProgress(82, "解析回應...");

      const leadId = text(json.lead_id) || text(json.id) || "UNKNOWN";

      setProgress(100, "完成");
      setLoading(false);
      setStatus("送出成功");
      fillSuccessBox(leadId);
      showPage(5);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setStatus("送出失敗：" + err.message);
      setProgress(0, "發生錯誤");
      showToast("送出失敗，請稍後再試");
    } finally {
      submitting = false;
    }
  });

  /* =========================
   * Live sync
   * ========================= */
  function bindLiveSync() {
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      el.addEventListener("input", () => {
        if (el.id === "color" || el.id === "style" || el.id === "paper") {
          syncFreeShadowFields();
        }
        renderPreview();
        renderSummary();
      });

      el.addEventListener("change", () => {
        if (el.id === "color" || el.id === "style" || el.id === "paper") {
          syncFreeShadowFields();
        }

        renderPreview();
        renderSummary();

        if (el.id === "plan") {
          applyPlanUI();
          renderUploadGrid();
        }
      });
    });
  }

  /* =========================
   * Init
   * ========================= */
  function init() {
    applyUrlParams();
    bindAssistModals();

    setStatus("尚未操作。");
    syncFreeShadowFields();
    renderSummary();
    renderPreview();
    renderUploadGrid();
    applyPlanUI();
    bindCropEvents();
    bindLiveSync();
    showPage(0);

    window.addEventListener("resize", () => {
      if (cropModal?.classList.contains("show")) {
        try {
          drawCropCanvas();
        } catch (_) {}
      }
    });
  }

  init();

})();