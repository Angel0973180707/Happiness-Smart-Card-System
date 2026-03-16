/* =========================================
 * 天使幸福智慧名片系統
 * form.js v803.0
 * COMPLETE OVERWRITE
 * -----------------------------------------
 * 主線：
 * 1. 保留 6 步驟表單 / 裁切 / 預覽體驗
 * 2. 送出前先上傳 Firebase Storage
 * 3. 正式圖片主欄位改為：
 *    - avatar_url
 *    - logo_url
 *    - photo1_url ~ photo5_url
 * 4. GAS 送出主線只送文字欄位 + *_url
 * 5. 保留 invite_code / reserved_uid / tenant
 * 6. 修正圖片裁切顯示透明棋盤格 / 套用白圖問題
 * 7. 成功送出後：下方明確顯示資料 ID + 客服回覆文案 + 一鍵複製 + LINE 客服按鈕
 * ========================================= */

import {
  initFirebase,
  ensureAuth,
  uploadAvatar,
  uploadLogo,
  uploadPhoto
} from "./firebase.js";

(() => {
  "use strict";

  const VERSION = "803.0";
  const DEFAULT_GAS = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const CUSTOMER_SERVICE_URL = "https://lin.ee/G3VJoRm";

  const MB = 1024 * 1024;
  const FILE_TIER_SMALL = 1 * MB;
  const FILE_TIER_MEDIUM = 4 * MB;
  const MAX_ACCEPT_FILE_SIZE = 20 * MB;

  const SMART_PROFILE = {
    small: {
      maxLong: 1800,
      maxShort: 1800,
      previewQuality: 0.90,
      outputQuality: 0.88,
      label: "輕壓縮"
    },
    medium: {
      maxLong: 1500,
      maxShort: 1500,
      previewQuality: 0.86,
      outputQuality: 0.82,
      label: "中壓縮"
    },
    large: {
      maxLong: 1200,
      maxShort: 1200,
      previewQuality: 0.82,
      outputQuality: 0.76,
      label: "強壓縮"
    }
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const text = (v) => (v == null ? "" : String(v)).trim();

  const state = {
    currentPage: 0,
    plan: "",
    color: "c1",
    style: "s1",
    paper: "f1",
    premiumColor: "p1",
    isSubmitting: false,
    submitResult: null,
    copiedId: "",
    files: Object.create(null),
    uploadOrder: [],
    firebaseReady: false,
    reservedUid: "",
    inviteCode: "",
    tenant: "angel",
    uploadCardId: "",
    uploadCardIdSource: "tmp"
  };

  const cropState = {
    targetKey: "",
    targetLabel: "",
    ratio: 1,
    outputWidth: 1200,
    outputHeight: 1200,
    sourceFile: null,
    sourceSize: 0,
    smartProfile: SMART_PROFILE.small,
    image: null,
    preparedWidth: 0,
    preparedHeight: 0,
    previewDataUrl: "",
    viewScale: 1,
    minScale: 1,
    baseFitScale: 1,
    offsetX: 0,
    offsetY: 0,
    drag: {
      active: false,
      startX: 0,
      startY: 0,
      baseX: 0,
      baseY: 0
    }
  };

  const els = {};

  const PLAN_OPTIONS = [
    { value: "free", label: "自由搭配" },
    { value: "premium", label: "精品設計" }
  ];

  const COLOR_OPTIONS = [
    { value: "c1", label: "粉", swatch: "linear-gradient(135deg,#ffd7ea,#f7a6c8)" },
    { value: "c2", label: "藍", swatch: "linear-gradient(135deg,#d8ecff,#87bfff)" },
    { value: "c3", label: "橘", swatch: "linear-gradient(135deg,#ffe6c9,#f6ae54)" },
    { value: "c4", label: "紫", swatch: "linear-gradient(135deg,#eadbff,#b594ff)" },
    { value: "c5", label: "綠", swatch: "linear-gradient(135deg,#ddf7dd,#86d69d)" }
  ];

  const STYLE_OPTIONS = [
    { value: "s1", label: "正拱" },
    { value: "s2", label: "平直" },
    { value: "s3", label: "晨曦" }
  ];

  const PAPER_OPTIONS = [
    { value: "f1", label: "棉紙" },
    { value: "f2", label: "顆粒" },
    { value: "f3", label: "亞麻" }
  ];

  const PREMIUM_OPTIONS = [
    { value: "p1", label: "胭脂紅", swatch: "linear-gradient(135deg,#8c3a4f,#5c2230)" },
    { value: "p2", label: "酒紅", swatch: "linear-gradient(135deg,#7a2230,#4c1520)" },
    { value: "p3", label: "深藍", swatch: "linear-gradient(135deg,#33527c,#17263d)" },
    { value: "p4", label: "霧紫", swatch: "linear-gradient(135deg,#8b76a3,#534166)" },
    { value: "p5", label: "藍灰", swatch: "linear-gradient(135deg,#7d92a3,#44515d)" },
    { value: "p6", label: "金箔", swatch: "linear-gradient(135deg,#e0c981,#b18b3f)" },
    { value: "p7", label: "褐碳", swatch: "linear-gradient(135deg,#6c564c,#403028)" }
  ];

  const IMAGE_FIELD_MAP = {
    avatar_img: "avatar_url",
    logo_img: "logo_url",
    photo1_img: "photo1_url",
    photo2_img: "photo2_url",
    photo3_img: "photo3_url",
    photo4_img: "photo4_url",
    photo5_img: "photo5_url"
  };

  document.addEventListener("DOMContentLoaded", init_);

  async function init_() {
    console.log("[HSC form] init ok", VERSION);

    cacheEls_();
    initMeta_();
    renderOptionChips_();
    bindEvents_();
    initTextareasAutoGrow_();
    initGuideCards_();
    initCropper_();
    injectSuccessBoxStyles_();
    setPlan_("free");
    renderUploadGrid_();
    renderSummary_();
    renderLivePreview_();
    syncPageUi_();
    setStatus_("尚未操作。");
    setProgress_(0, "請填寫資料");

    try {
      initFirebase();
      await ensureAuth();
      state.firebaseReady = true;
      setStatus_("表單已就緒，圖片將走 Firebase Storage。");
    } catch (err) {
      console.error(err);
      state.firebaseReady = false;
      setStatus_("Firebase 初始化失敗，圖片上傳可能無法進行。");
    }
  }

  function cacheEls_() {
    els.pages = $$(".page");
    els.stepDots = $$(".stepDot");
    els.flowSub = $("#flowSub");
    els.pageBadge = $("#pageBadge");
    els.pageBadgeBottom = $("#pageBadgeBottom");
    els.btnPrev = $("#btnPrev");
    els.btnNext = $("#btnNext");

    els.planChips = $("#planChips");
    els.colorChips = $("#colorChips");
    els.styleChips = $("#styleChips");
    els.paperChips = $("#paperChips");
    els.premiumChips = $("#premiumChips");
    els.planHint = $("#planHint");

    els.btnGuideToggle = $("#btnGuideToggle");
    els.guideCard = $("#guideCard");
    els.ctaRow2 = $("#ctaRow2");
    els.ctaRow3 = $("#ctaRow3");

    els.uploadGrid = $("#uploadGrid");

    els.previewCard = $("#livePreviewCard");
    els.previewAvatar = $("#previewAvatar");
    els.previewAvatarWrap = $("#previewAvatarWrap");
    els.previewLogo = $("#previewLogo");
    els.previewLogoWrap = $("#previewLogoWrap");
    els.previewName = $("#previewName");
    els.previewUnit = $("#previewUnit");
    els.previewTitle = $("#previewTitle");
    els.previewSlogan = $("#previewSlogan");
    els.previewServices = $("#previewServices");
    els.previewServicesBlock = $("#previewServicesBlock");
    els.previewExperience = $("#previewExperience");
    els.previewExperienceBlock = $("#previewExperienceBlock");
    els.previewPhotoWall = $("#previewPhotoWall");
    els.previewEmptyPhotos = $("#previewEmptyPhotos");

    els.summaryBox = $("#summaryBox");
    els.btnTest = $("#btnTest");
    els.btnSubmit = $("#btnSubmit");
    els.btnReset = $("#btnReset");

    els.progressWrap = $("#submitProgressWrap");
    els.progressFill = $("#submitProgressFill");
    els.progressText = $("#submitProgressText");
    els.progressPercent = $("#submitProgressPercent");
    els.progressTitle = $("#submitProgressTitle");

    els.status = $("#status");
    els.successBox = $("#submitSuccessBox");
    els.successTitle = $("#submitSuccessTitle");
    els.successBody = $("#submitSuccessBody");
    els.successActions = $("#submitSuccessActions");
    els.formBottomAnchor = $("#formBottomAnchor");

    els.modeText = $("#modeText");
    els.tenantText = $("#tenantText");
    els.idText = $("#idText");
    els.inviteText = $("#inviteText");
    els.ver = $("#ver");
    els.dot = $("#dot");
    els.gas = $("#gas");

    els.cropModal = $("#cropModal");
    els.cropStage = $("#cropStage");
    els.cropCanvas = $("#cropCanvas");
    els.cropTitle = $("#cropTitle");
    els.cropDesc = $("#cropDesc");
    els.cropMeta = $("#cropMeta");
    els.cropZoomOut = $("#cropZoomOut");
    els.cropZoomIn = $("#cropZoomIn");
    els.cropCenter = $("#cropCenter");
    els.cropReset = $("#cropReset");
    els.cropCancel = $("#cropCancel");
    els.cropApply = $("#cropApply");
  }

  function initMeta_() {
    const sp = new URLSearchParams(location.search || "");
    const invite = sp.get("invite") || sp.get("code") || "";
    const id = sp.get("id") || "";
    const reservedUid = sp.get("reserved_uid") || id || "";
    const tenant = sp.get("tenant") || "angel";
    const gas = sp.get("gas") || DEFAULT_GAS;

    state.reservedUid = normalizeCardId_(reservedUid);
    state.inviteCode = invite || "";
    state.tenant = tenant || "angel";
    syncUploadCardId_();

    if (els.ver) els.ver.textContent = `v${VERSION}`;
    if (els.tenantText) els.tenantText.textContent = tenant || "-";
    if (els.idText) els.idText.textContent = state.reservedUid || state.uploadCardId || "-";
    if (els.inviteText) els.inviteText.textContent = invite || "-";
    if (els.gas) els.gas.value = gas;

    if (els.modeText) els.modeText.textContent = "填表模式";
    if (els.dot) {
      els.dot.style.background = "var(--ok)";
      els.dot.style.boxShadow = "0 0 0 4px rgba(110,231,183,.14)";
    }
  }

  function bindEvents_() {
    if (els.btnPrev) els.btnPrev.addEventListener("click", () => goPrev_());
    if (els.btnNext) els.btnNext.addEventListener("click", () => goNext_());

    els.stepDots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const target = Number(dot.dataset.step || 0);
        if (target === state.currentPage) return;

        if (target < state.currentPage) {
          goToPage_(target);
          return;
        }

        for (let i = state.currentPage; i < target; i++) {
          const ok = validatePage_(i, true);
          if (!ok) {
            goToPage_(i);
            return;
          }
        }
        goToPage_(target);
      });
    });

    const allInputs = $$("input, textarea");
    allInputs.forEach((el) => {
      el.addEventListener("input", () => {
        if (el.tagName === "TEXTAREA") autoGrowTextarea_(el);
        if (el.id === "address") normalizeAddressTip_();
        renderLivePreview_();
        renderSummary_();
      });
      el.addEventListener("change", () => {
        renderLivePreview_();
        renderSummary_();
      });
    });

    if (els.btnTest) els.btnTest.addEventListener("click", onTestConnection_);
    if (els.btnSubmit) els.btnSubmit.addEventListener("click", onSubmit_);
    if (els.btnReset) els.btnReset.addEventListener("click", onReset_);

    window.addEventListener("resize", () => {
      if (els.cropModal?.classList.contains("show") && cropState.image) {
        renderCropCanvas_();
      }
    });

    window.addEventListener("beforeunload", cleanupAllObjectUrls_);
  }

  function initGuideCards_() {
    if (!els.btnGuideToggle || !els.guideCard) return;
    els.btnGuideToggle.addEventListener("click", () => {
      els.guideCard.classList.toggle("show");
    });
  }

  function renderOptionChips_() {
    renderChipGroup_(els.planChips, PLAN_OPTIONS, state.plan || "free", (value) => setPlan_(value), false);
    renderChipGroup_(els.colorChips, COLOR_OPTIONS, state.color, (value) => {
      state.color = value;
      renderSelectedChips_();
      renderLivePreview_();
      renderSummary_();
    }, true);
    renderChipGroup_(els.styleChips, STYLE_OPTIONS, state.style, (value) => {
      state.style = value;
      renderSelectedChips_();
      renderLivePreview_();
      renderSummary_();
    }, false);
    renderChipGroup_(els.paperChips, PAPER_OPTIONS, state.paper, (value) => {
      state.paper = value;
      renderSelectedChips_();
      renderLivePreview_();
      renderSummary_();
    }, false);
    renderChipGroup_(els.premiumChips, PREMIUM_OPTIONS, state.premiumColor, (value) => {
      state.premiumColor = value;
      renderSelectedChips_();
      renderLivePreview_();
      renderSummary_();
    }, true);
  }

  function renderChipGroup_(wrap, items, activeValue, onPick, useSwatch) {
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.value = item.value;
      btn.dataset.on = item.value === activeValue ? "1" : "0";
      btn.innerHTML = useSwatch
        ? `<span class="swatch" style="background:${escapeHtml_(item.swatch || "")};"></span><span>${escapeHtml_(item.label)}</span>`
        : `<span>${escapeHtml_(item.label)}</span>`;
      btn.addEventListener("click", () => onPick(item.value));
      wrap.appendChild(btn);
    });
  }

  function renderSelectedChips_() {
    syncChipState_(els.planChips, state.plan);
    syncChipState_(els.colorChips, state.color);
    syncChipState_(els.styleChips, state.style);
    syncChipState_(els.paperChips, state.paper);
    syncChipState_(els.premiumChips, state.premiumColor);
  }

  function syncChipState_(wrap, value) {
    if (!wrap) return;
    $$(".chip", wrap).forEach((chip) => {
      chip.dataset.on = chip.dataset.value === value ? "1" : "0";
    });
  }

  function setPlan_(plan) {
    state.plan = plan === "premium" ? "premium" : "free";
    renderSelectedChips_();
    syncPlanUi_();
    renderUploadGrid_();
    renderLivePreview_();
    renderSummary_();
  }

  function syncPlanUi_() {
    const isPremium = state.plan === "premium";
    if (els.planHint) {
      els.planHint.textContent = isPremium
        ? "目前為精品設計：可上傳 5 張照片，並可設定 3 個行動按鈕。"
        : "目前為自由搭配：可上傳 2 張照片，並可設定 1 個行動按鈕。";
    }

    if (els.colorChips?.parentElement) els.colorChips.parentElement.style.display = isPremium ? "none" : "";
    if (els.styleChips?.parentElement) els.styleChips.parentElement.style.display = isPremium ? "none" : "";
    if (els.paperChips?.parentElement?.parentElement) els.paperChips.parentElement.parentElement.style.display = isPremium ? "none" : "";
    if (els.premiumChips?.parentElement) els.premiumChips.parentElement.style.display = isPremium ? "" : "none";

    if (els.ctaRow2) els.ctaRow2.style.display = isPremium ? "" : "none";
    if (els.ctaRow3) els.ctaRow3.style.display = isPremium ? "" : "none";

    if (!isPremium) {
      setFieldValue_("cta_text_2", "");
      setFieldValue_("cta_link_2", "");
      setFieldValue_("cta_text_3", "");
      setFieldValue_("cta_link_3", "");
    }
  }

  function buildUploadItems_() {
    const items = [
      { key: "avatar_img", label: "大頭照", note: "正方形裁切，名片中央頭像", ratioClass: "ratio-square", thumbClass: "square", outputWidth: 1200, outputHeight: 1200 },
      { key: "logo_img", label: "Logo", note: "正方形裁切，品牌 Logo", ratioClass: "ratio-logo", thumbClass: "square", outputWidth: 1200, outputHeight: 1200 },
      { key: "photo1_img", label: "照片 1", note: "照片牆展示", ratioClass: "ratio-photo", thumbClass: "", outputWidth: 1600, outputHeight: 1000 },
      { key: "photo2_img", label: "照片 2", note: "照片牆展示", ratioClass: "ratio-photo", thumbClass: "", outputWidth: 1600, outputHeight: 1000 }
    ];

    if (state.plan === "premium") {
      items.push(
        { key: "photo3_img", label: "照片 3", note: "照片牆展示", ratioClass: "ratio-photo", thumbClass: "", outputWidth: 1600, outputHeight: 1000 },
        { key: "photo4_img", label: "照片 4", note: "照片牆展示", ratioClass: "ratio-photo", thumbClass: "", outputWidth: 1600, outputHeight: 1000 },
        { key: "photo5_img", label: "照片 5", note: "照片牆展示", ratioClass: "ratio-photo", thumbClass: "", outputWidth: 1600, outputHeight: 1000 }
      );
    }

    state.uploadOrder = items.map((x) => x.key);
    return items;
  }

  function renderUploadGrid_() {
    if (!els.uploadGrid) return;

    els.uploadGrid.innerHTML = "";
    const items = buildUploadItems_();
items.forEach((item) => {
      const box = document.createElement("div");
      box.className = "uItem";
      box.dataset.key = item.key;

      box.innerHTML = `
        <div class="uItemHead">
          <div>
            <strong>${escapeHtml_(item.label)}</strong>
            <small>${escapeHtml_(item.note)}</small>
          </div>
        </div>

        <div class="thumb ${item.thumbClass || ""}" id="thumb_${item.key}">
          尚未上傳圖片
        </div>

        <div class="miniRow">
          <input type="file" id="file_${item.key}" accept="image/*" />
          <button type="button" class="secondary" id="edit_${item.key}" disabled>調整位置</button>
          <button type="button" class="ghost" id="clear_${item.key}" disabled>清除</button>
        </div>
      `;

      els.uploadGrid.appendChild(box);

      const fileInput = $(`#file_${item.key}`, box);
      const editBtn = $(`#edit_${item.key}`, box);
      const clearBtn = $(`#clear_${item.key}`, box);

      if (fileInput) {
        fileInput.addEventListener("change", async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          if (file.size > MAX_ACCEPT_FILE_SIZE) {
            alert("照片過大，請改選較小的照片（建議 20MB 以下）。");
            fileInput.value = "";
            return;
          }

          try {
            await openCropperForFile_(item, file);
          } catch (err) {
            console.error(err);
            setStatus_(`載入圖片失敗：${err.message || err}`);
            fileInput.value = "";
          }
        }, { passive: true });
      }

      if (editBtn) {
        editBtn.addEventListener("click", async () => {
          const info = state.files[item.key];
          if (!info || !info.sourceFile) return;
          try {
            await openCropperForFile_(item, info.sourceFile, info.crop);
          } catch (err) {
            console.error(err);
            setStatus_(`重新載入圖片失敗：${err.message || err}`);
          }
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          clearUploadItem_(item.key);
        });
      }
    });

    Object.keys(state.files).forEach((key) => {
      if (!state.uploadOrder.includes(key)) {
        revokeFileUrls_(state.files[key]);
        delete state.files[key];
      }
    });

    refreshUploadThumbs_();
  }

  function refreshUploadThumbs_() {
    state.uploadOrder.forEach((key) => {
      const thumb = $(`#thumb_${key}`);
      const editBtn = $(`#edit_${key}`);
      const clearBtn = $(`#clear_${key}`);
      if (!thumb) return;

      const info = state.files[key];
      if (info && info.previewUrl) {
        thumb.innerHTML = `<img src="${escapeHtml_(info.previewUrl)}" alt="${escapeHtml_(key)}">`;
        if (editBtn) editBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = false;
      } else {
        thumb.textContent = "尚未上傳圖片";
        if (editBtn) editBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
      }
    });

    renderLivePreview_();
    renderSummary_();
  }

  function clearUploadItem_(key) {
    const info = state.files[key];
    if (info) revokeFileUrls_(info);
    delete state.files[key];

    const fileInput = $(`#file_${key}`);
    if (fileInput) fileInput.value = "";
    refreshUploadThumbs_();
  }

  function revokeFileUrls_(info) {
    if (!info) return;
    try {
      if (info.previewUrl && /^blob:/i.test(info.previewUrl)) {
        URL.revokeObjectURL(info.previewUrl);
      }
    } catch (_) {}
  }

  function cleanupAllObjectUrls_() {
    Object.keys(state.files).forEach((key) => {
      revokeFileUrls_(state.files[key]);
    });
    cleanupCropResources_();
  }

  function initTextareasAutoGrow_() {
    $$("textarea").forEach((ta) => {
      autoGrowTextarea_(ta);
      ta.addEventListener("input", () => autoGrowTextarea_(ta));
    });
  }

  function autoGrowTextarea_(ta) {
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(112, ta.scrollHeight)}px`;
  }

  function syncPageUi_() {
    els.pages.forEach((page, idx) => {
      page.classList.toggle("active", idx === state.currentPage);
    });

    els.stepDots.forEach((dot, idx) => {
      dot.dataset.current = idx === state.currentPage ? "1" : "0";
      dot.dataset.done = idx < state.currentPage ? "1" : "0";
    });

    const pageNum = state.currentPage + 1;
    const total = els.pages.length;

    if (els.flowSub) els.flowSub.textContent = `目前在第 ${pageNum} 步，共 ${total} 步。`;
    if (els.pageBadge) els.pageBadge.textContent = `第 ${pageNum} / ${total} 步`;
    if (els.pageBadgeBottom) els.pageBadgeBottom.textContent = `第 ${pageNum} / ${total} 步`;

    if (els.btnPrev) els.btnPrev.disabled = state.currentPage === 0;
    if (els.btnNext) els.btnNext.textContent = state.currentPage === total - 1 ? "回到上一步" : "下一步";

    renderSummary_();
  }

  function goToPage_(idx) {
    const total = els.pages.length;
    state.currentPage = Math.max(0, Math.min(total - 1, idx));
    syncPageUi_();
    requestAnimationFrame(() => {
      const active = els.pages[state.currentPage];
      if (active) active.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goPrev_() {
    if (state.currentPage > 0) goToPage_(state.currentPage - 1);
  }

  function goNext_() {
    if (state.currentPage === els.pages.length - 1) {
      goToPage_(state.currentPage - 1);
      return;
    }
    if (!validatePage_(state.currentPage, true)) return;
    goToPage_(state.currentPage + 1);
  }

  function validatePage_(pageIdx, showMessage) {
    const requiredByPage = {
      0: () => !!state.plan,
      1: () => !!text(getFieldValue_("name")),
      2: () => {
        const values = ["phone", "email", "line_url", "line_oa", "wechat_id"].map(getFieldValue_).map(text);
        return values.some(Boolean);
      },
      3: () => validateCtaFields_(showMessage),
      4: () => !!state.files.avatar_img,
      5: () => true
    };

    const fn = requiredByPage[pageIdx];
    const ok = fn ? fn() : true;
    if (!ok && showMessage) {
      const msgMap = {
        0: "請先選擇方案。",
        1: "請至少填寫姓名。",
        2: "請至少填寫一種聯絡方式。",
        3: "請檢查行動按鈕：有文字就要有連結，有連結也要有文字。",
        4: "請至少上傳並套用大頭照。",
        5: ""
      };
      if (msgMap[pageIdx]) setStatus_(msgMap[pageIdx]);
    }
    return ok;
  }

  function validateCtaFields_(showMessage) {
    const pairs = [
      ["cta_text_1", "cta_link_1"],
      ["cta_text_2", "cta_link_2"],
      ["cta_text_3", "cta_link_3"]
    ];

    const max = state.plan === "premium" ? 3 : 1;

    for (let i = 0; i < max; i++) {
      const [textId, linkId] = pairs[i];
      const t = text(getFieldValue_(textId));
      const l = text(getFieldValue_(linkId));
      if ((t && !l) || (!t && l)) {
        if (showMessage) setStatus_("行動按鈕請成對填寫：有文字就要有連結，有連結也要有文字。");
        return false;
      }
    }
    return true;
  }

  function getFieldValue_(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return text(el.value);
  }

  function setFieldValue_(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  function normalizeAddressTip_() {
    const address = getFieldValue_("address");
    if (/https?:\/\//i.test(address)) {
      setStatus_("地址欄請填完整地址文字，不需要貼地圖連結。系統會自動轉成導航。");
    }
  }

  function renderLivePreview_() {
    if (!els.previewCard) return;

    const plan = state.plan || "free";
    els.previewCard.dataset.plan = plan;
    els.previewCard.dataset.color = state.color;
    els.previewCard.dataset.style = state.style;
    els.previewCard.dataset.paper = state.paper;
    els.previewCard.dataset.premium = state.premiumColor;

    safeText_(els.previewName, getFieldValue_("name") || "您的姓名");
    safeText_(els.previewUnit, getFieldValue_("unit"));
    safeText_(els.previewTitle, getFieldValue_("title"));
    safeText_(els.previewSlogan, getFieldValue_("slogan"));

    const services = getFieldValue_("services");
    const experience = getFieldValue_("experience");

    if (els.previewServicesBlock) els.previewServicesBlock.style.display = services ? "" : "none";
    if (els.previewExperienceBlock) els.previewExperienceBlock.style.display = experience ? "" : "none";

    safeText_(els.previewServices, services);
    safeText_(els.previewExperience, experience);

    const avatarUrl = getPreviewUrl_("avatar_img");
    const logoUrl = getPreviewUrl_("logo_img");
if (els.previewAvatar) {
      if (avatarUrl) {
        els.previewAvatar.src = avatarUrl;
        els.previewAvatar.style.display = "block";
      } else {
        els.previewAvatar.removeAttribute("src");
        els.previewAvatar.style.display = "none";
      }
    }

    if (els.previewLogoWrap && els.previewLogo) {
      if (logoUrl) {
        els.previewLogoWrap.style.display = "";
        els.previewLogo.src = logoUrl;
      } else {
        els.previewLogoWrap.style.display = "none";
        els.previewLogo.removeAttribute("src");
      }
    }

    if (els.previewPhotoWall) {
      els.previewPhotoWall.innerHTML = "";
      const photoKeys = state.plan === "premium"
        ? ["photo1_img", "photo2_img", "photo3_img", "photo4_img", "photo5_img"]
        : ["photo1_img", "photo2_img"];

      const urls = photoKeys.map(getPreviewUrl_).filter(Boolean);

      urls.forEach((url) => {
        const item = document.createElement("div");
        item.className = "hsc-preview-photoItem";
        item.innerHTML = `<img src="${escapeHtml_(url)}" alt="照片預覽">`;
        els.previewPhotoWall.appendChild(item);
      });

      if (els.previewEmptyPhotos) {
        els.previewEmptyPhotos.style.display = urls.length ? "none" : "";
      }
    }
  }

  function safeText_(el, value) {
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  function getPreviewUrl_(key) {
    const info = state.files[key];
    return info && info.previewUrl ? info.previewUrl : "";
  }

  function renderSummary_() {
    if (!els.summaryBox) return;

    const maxPhotoOnly = state.plan === "premium" ? 5 : 2;
    const ctaCount = state.plan === "premium" ? 3 : 1;

    const items = [
      ["方案", state.plan === "premium" ? "精品設計" : "自由搭配"],
      ["外觀", state.plan === "premium"
        ? `精品底色：${labelOf_(PREMIUM_OPTIONS, state.premiumColor)}`
        : `顏色：${labelOf_(COLOR_OPTIONS, state.color)}\n版型：${labelOf_(STYLE_OPTIONS, state.style)}\n紙感：${labelOf_(PAPER_OPTIONS, state.paper)}`],
      ["姓名 / 職稱", `${getFieldValue_("name") || "-"}\n${getFieldValue_("title") || "-"}`],
      ["聯絡方式", buildContactSummary_() || "尚未填寫"],
      ["行動按鈕", buildCtaSummary_(ctaCount) || "尚未填寫"],
      ["圖片", `已處理 ${countUploadedPhotos_()} 張（含大頭照、Logo；照片牆上限 ${maxPhotoOnly} 張）`]
    ];

    els.summaryBox.innerHTML = items.map(([k, v]) => `
      <div class="sumRow">
        <span>${escapeHtml_(k)}</span>
        <strong>${escapeHtml_(v)}</strong>
      </div>
    `).join("");
  }

  function buildContactSummary_() {
    const list = [
      getFieldValue_("phone"),
      getFieldValue_("email"),
      getFieldValue_("line_url"),
      getFieldValue_("line_oa"),
      getFieldValue_("wechat_id"),
      getFieldValue_("address")
    ].filter(Boolean);
    return list.join("\n");
  }

  function buildCtaSummary_(count) {
    const lines = [];
    for (let i = 1; i <= count; i++) {
      const t = getFieldValue_(`cta_text_${i}`);
      const l = getFieldValue_(`cta_link_${i}`);
      if (t || l) lines.push(`${t || "（未填文字）"}｜${l || "（未填連結）"}`);
    }
    return lines.join("\n");
  }

  function countUploadedPhotos_() {
    return Object.keys(state.files).filter((k) => !!state.files[k]).length;
  }

  function labelOf_(list, value) {
    const found = list.find((x) => x.value === value);
    return found ? found.label : value;
  }

  async function onTestConnection_() {
    const endpoint = resolveSubmitEndpoint_();
    if (!endpoint) {
      setStatus_("找不到 GAS 端點。");
      return;
    }

    try {
      setProgress_(20, "測試連線中…");
      const url = new URL(endpoint);
      url.searchParams.set("action", "ping");
      url.searchParams.set("ts", String(Date.now()));
      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      const raw = await res.text();
      setStatus_(res.ok ? `連線成功\n${raw}` : `連線失敗\n${raw}`);
      setProgress_(100, "連線測試完成");
      keepViewAtProgress_();
    } catch (err) {
      console.error(err);
      setStatus_(`連線測試失敗：${err.message || err}`);
      setProgress_(100, "連線測試失敗");
      keepViewAtProgress_();
    }
  }

  async function onSubmit_() {
    if (state.isSubmitting) return;
    hideSuccessBox_();

    for (let i = 0; i < els.pages.length - 1; i++) {
      if (!validatePage_(i, true)) {
        goToPage_(i);
        return;
      }
    }

    const endpoint = resolveSubmitEndpoint_();
    if (!endpoint) {
      setStatus_("找不到送出 API。");
      return;
    }

    try {
      state.isSubmitting = true;
      if (els.btnSubmit) els.btnSubmit.disabled = true;

      setStatus_("開始送出資料…");
      setProgress_(8, "初始化 Firebase…");
      keepViewAtProgress_();

      initFirebase();
      await ensureAuth();
      state.firebaseReady = true;

      syncUploadCardId_();
      const cardIdForStorage = state.uploadCardId;

      setProgress_(18, `圖片上傳準備中（${cardIdForStorage}）…`);
      keepViewAtProgress_();

      const uploadedImageUrls = await uploadAllImages_(cardIdForStorage);

      setProgress_(72, "整理文字資料中…");
      keepViewAtProgress_();

      const payload = buildJsonPayload_(uploadedImageUrls, cardIdForStorage);

      setProgress_(82, "送出表單資料到 GAS…");
      keepViewAtProgress_();

      const result = await postJsonPayload_(endpoint, payload);

      setProgress_(100, "送出完成");
      state.submitResult = result;

      const cardId = resolveCardIdFromSubmit_(result, payload, cardIdForStorage);
      state.copiedId = cardId;

      if (els.idText && cardId) els.idText.textContent = cardId;
      setStatus_("資料已送出。");
      showSuccessBox_(cardId);
      keepViewAtProgress_();
    } catch (err) {
      console.error(err);
      setProgress_(100, "送出失敗");
      setStatus_(`送出失敗：${err.message || err}`);
      showErrorBox_(err.message || "送出失敗，請稍後再試");
      keepViewAtProgress_();
    } finally {
      state.isSubmitting = false;
      if (els.btnSubmit) els.btnSubmit.disabled = false;
    }
  }

  function resolveSubmitEndpoint_() {
    return text(els.gas?.value) || DEFAULT_GAS;
  }

  function normalizeCardId_(value) {
    return text(value).toUpperCase();
  }

  function buildTmpCardId_() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
      String(now.getMilliseconds()).padStart(3, "0")
    ].join("");
    return `TMP${stamp}`;
  }

  function syncUploadCardId_() {
    const reserved = normalizeCardId_(state.reservedUid);
    if (reserved) {
      state.uploadCardId = reserved;
      state.uploadCardIdSource = "reserved_uid";
      return reserved;
    }
    if (!state.uploadCardId || !/^TMP/i.test(state.uploadCardId)) {
      state.uploadCardId = buildTmpCardId_();
    }
    state.uploadCardIdSource = "tmp";
    return state.uploadCardId;
  }

  async function uploadAllImages_(cardId) {
    const uploaded = {};
    const activeKeys = state.uploadOrder.filter((key) => !!state.files[key]);

    if (!activeKeys.length) return uploaded;

    const total = activeKeys.length;
    let done = 0;

    for (const key of activeKeys) {
      const info = state.files[key];
      if (!info || !info.blob) continue;

      const label = keyLabel_(key);
      const startPercent = 18 + Math.round((done / total) * 42);
      setProgress_(startPercent, `上傳圖片：${label}…`);
      keepViewAtProgress_();
let url = "";
      if (key === "avatar_img") {
        url = await uploadAvatar(cardId, info.blob);
      } else if (key === "logo_img") {
        url = await uploadLogo(cardId, info.blob);
      } else if (/^photo[1-5]_img$/.test(key)) {
        const idx = Number(key.match(/^photo([1-5])_img$/)?.[1] || 0);
        url = await uploadPhoto(cardId, info.blob, idx);
      } else {
        throw new Error(`不支援的圖片欄位：${key}`);
      }

      info.remoteUrl = url || "";
      info.remoteCardId = cardId || "";

      const field = IMAGE_FIELD_MAP[key];
      if (field) uploaded[field] = url;

      done += 1;
      const progress = 18 + Math.round((done / total) * 42);
      setProgress_(progress, `圖片上傳完成：${label}`);
      keepViewAtProgress_();
    }

    return uploaded;
  }

  function buildJsonPayload_(uploadedImageUrls, cardIdForStorage) {
    const reservedUid = normalizeCardId_(state.reservedUid || cardIdForStorage || "");
    const payload = {
      action: "create",
      id: reservedUid || "",
      tenant: state.tenant || "angel",
      invite_code: state.inviteCode || "",
      reserved_uid: reservedUid || "",
      form_version: VERSION,

      plan: state.plan,
      color: state.color,
      style: state.style,
      paper: state.paper,
      premium_color: state.premiumColor,

      name: getFieldValue_("name"),
      unit: getFieldValue_("unit"),
      title: getFieldValue_("title"),
      slogan: getFieldValue_("slogan"),
      services: getFieldValue_("services"),
      experience: getFieldValue_("experience"),

      phone: getFieldValue_("phone"),
      email: getFieldValue_("email"),
      line_url: getFieldValue_("line_url"),
      line_oa: getFieldValue_("line_oa"),
      wechat_id: getFieldValue_("wechat_id"),
      address: getFieldValue_("address"),

      website: getFieldValue_("website"),
      video1: getFieldValue_("video1"),
      video2: getFieldValue_("video2"),
      video3: getFieldValue_("video3"),
      social1: getFieldValue_("social1"),
      social2: getFieldValue_("social2"),
      social3: getFieldValue_("social3"),

      cta_text_1: getFieldValue_("cta_text_1"),
      cta_link_1: getFieldValue_("cta_link_1"),
      cta_text_2: state.plan === "premium" ? getFieldValue_("cta_text_2") : "",
      cta_link_2: state.plan === "premium" ? getFieldValue_("cta_link_2") : "",
      cta_text_3: state.plan === "premium" ? getFieldValue_("cta_text_3") : "",
      cta_link_3: state.plan === "premium" ? getFieldValue_("cta_link_3") : "",

      cta_text: getFieldValue_("cta_text_1"),
      cta_link: getFieldValue_("cta_link_1"),

      avatar_url: uploadedImageUrls.avatar_url || "",
      logo_url: uploadedImageUrls.logo_url || "",
      photo1_url: uploadedImageUrls.photo1_url || "",
      photo2_url: uploadedImageUrls.photo2_url || "",
      photo3_url: uploadedImageUrls.photo3_url || "",
      photo4_url: uploadedImageUrls.photo4_url || "",
      photo5_url: uploadedImageUrls.photo5_url || "",

      source: "form",
      form_source: "self_form"
    };

    return payload;
  }

  async function postJsonPayload_(endpoint, payload) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const raw = await res.text();
    let json = null;

    try {
      json = raw ? JSON.parse(raw) : null;
    } catch (_) {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true, raw };
    }

    if (!res.ok || json?.ok === false) {
      throw new Error(
        json?.message ||
        json?.error ||
        json?.data?.message ||
        `HTTP ${res.status}`
      );
    }
    return json;
  }

  function resolveCardIdFromSubmit_(result, payload, cardIdForStorage) {
    const id = normalizeCardId_(
      result?.data?.id ||
      result?.id ||
      result?.item?.id ||
      result?.cardId ||
      result?.data?.cardId ||
      result?.item?.cardId ||
      result?.data?.item?.id ||
      result?.data?.item?.cardId ||
      payload?.reserved_uid ||
      payload?.id ||
      cardIdForStorage ||
      ""
    );
    return id;
  }

  function keyLabel_(key) {
    const map = {
      avatar_img: "大頭照",
      logo_img: "Logo",
      photo1_img: "照片 1",
      photo2_img: "照片 2",
      photo3_img: "照片 3",
      photo4_img: "照片 4",
      photo5_img: "照片 5"
    };
    return map[key] || key;
  }

  function setProgress_(percent, message) {
    const n = Math.max(0, Math.min(100, Number(percent) || 0));
    if (els.progressWrap) els.progressWrap.style.display = "";
    if (els.progressFill) els.progressFill.style.width = `${n}%`;
    if (els.progressPercent) els.progressPercent.textContent = `${Math.round(n)}%`;
    if (els.progressText) els.progressText.textContent = message || "";
    if (els.progressTitle) els.progressTitle.textContent = n >= 100 ? "處理完成" : "送出中";
  }

  function setStatus_(message) {
    if (els.status) els.status.textContent = message || "";
  }

  function keepViewAtProgress_() {
    if (!els.progressWrap) return;
    requestAnimationFrame(() => {
      els.progressWrap.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function hideSuccessBox_() {
    if (!els.successBox) return;
    els.successBox.style.display = "none";
    els.successBox.hidden = true;
    els.successBox.classList.remove("error");
    if (els.successActions) els.successActions.innerHTML = "";
    if (els.successBody) els.successBody.innerHTML = "";
  }

  function buildServiceReplyText_(cardId) {
    const lines = [
      "您好，我已送出天使幸福智慧名片申請資料。",
      `我的資料ID是：${cardId || "（請填入資料ID）"}`
    ];

    const name = getFieldValue_("name");
    const title = getFieldValue_("title");
    const unit = getFieldValue_("unit");

    if (name) lines.push(`姓名：${name}`);
    if (title) lines.push(`頭銜：${title}`);
    if (unit) lines.push(`單位：${unit.replace(/\n+/g, " / ")}`);
    lines.push("請協助後續製作，謝謝您。");

    return lines.join("\n");
  }

  function showSuccessBox_(cardId) {
    if (!els.successBox) return;

    const safeId = normalizeCardId_(cardId || "");
    const replyText = buildServiceReplyText_(safeId);

    els.successBox.hidden = false;
    els.successBox.style.display = "";
    els.successBox.classList.remove("error");

    if (els.successTitle) els.successTitle.textContent = "送出成功";

    if (els.successBody) {
      els.successBody.innerHTML = `
        <div class="hsc-success-main">
          <div class="hsc-success-ok">✅ 資料已送出成功</div>

          <div class="hsc-id-card">
            <div class="hsc-id-label">您的資料ID</div>
            <div class="hsc-id-value">${escapeHtml_(safeId || "未取得")}</div>
            <div class="hsc-id-tip">請複製此資料ID，並搭配下方客服文案回覆客服。</div>
          </div>

          <div class="hsc-reply-card">
            <div class="hsc-reply-label">可回覆客服文案</div>
            <textarea class="hsc-reply-text" id="serviceReplyText" readonly></textarea>
            <div class="hsc-reply-tip">建議：先按「一鍵複製客服文案」，再按「前往 LINE 官方帳號回覆客服」。</div>
          </div>
        </div>
      `;

      const ta = document.getElementById("serviceReplyText");
      if (ta) ta.value = replyText;
    }

    if (els.successActions) {
      els.successActions.innerHTML = "";

      const copyIdBtn = document.createElement("button");
      copyIdBtn.type = "button";
      copyIdBtn.className = "secondary";
      copyIdBtn.textContent = "複製資料ID";
      copyIdBtn.addEventListener("click", async () => {
        const ok = await copyText_(safeId || "");
        flashButtonText_(copyIdBtn, ok ? "已複製資料ID" : "複製失敗", "複製資料ID");
      });
const copyReplyBtn = document.createElement("button");
      copyReplyBtn.type = "button";
      copyReplyBtn.textContent = "一鍵複製客服文案";
      copyReplyBtn.addEventListener("click", async () => {
        const textArea = document.getElementById("serviceReplyText");
        if (textArea) {
          try {
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, textArea.value.length);
          } catch (_) {}
        }
        const ok = await copyText_(replyText);
        flashButtonText_(copyReplyBtn, ok ? "已複製客服文案" : "複製失敗", "一鍵複製客服文案");
      });

      const lineBtn = document.createElement("button");
      lineBtn.type = "button";
      lineBtn.className = "secondary";
      lineBtn.textContent = "前往 LINE 官方帳號回覆客服";
      lineBtn.addEventListener("click", () => {
        window.open(CUSTOMER_SERVICE_URL, "_blank", "noopener");
      });

      els.successActions.append(copyIdBtn, copyReplyBtn, lineBtn);
    }
  }

  function showErrorBox_(message) {
    if (!els.successBox) return;
    els.successBox.hidden = false;
    els.successBox.style.display = "";
    els.successBox.classList.add("error");

    if (els.successTitle) els.successTitle.textContent = "送出失敗";
    if (els.successBody) {
      els.successBody.innerHTML = `
        <div class="hsc-success-main">
          <div class="hsc-id-card" style="border-color:rgba(251,113,133,.22);background:rgba(251,113,133,.06);">
            <div class="hsc-id-label">送出狀態</div>
            <div class="hsc-id-tip" style="color:rgba(255,255,255,.92);">${escapeHtml_(message || "送出失敗，請稍後再試。")}</div>
          </div>
        </div>
      `;
    }

    if (els.successActions) {
      els.successActions.innerHTML = "";
      const replyBtn = document.createElement("button");
      replyBtn.type = "button";
      replyBtn.className = "secondary";
      replyBtn.textContent = "前往 LINE 官方帳號回覆客服";
      replyBtn.addEventListener("click", () => {
        window.open(CUSTOMER_SERVICE_URL, "_blank", "noopener");
      });
      els.successActions.appendChild(replyBtn);
    }
  }

  function flashButtonText_(btn, activeText, restoreText) {
    if (!btn) return;
    btn.textContent = activeText;
    setTimeout(() => {
      btn.textContent = restoreText;
    }, 1400);
  }

  function onReset_() {
    if (!confirm("確定要重設表單嗎？")) return;

    [
      "name","unit","title","slogan","services","experience",
      "phone","email","line_url","line_oa","wechat_id","address",
      "website","video1","video2","video3","social1","social2","social3",
      "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3"
    ].forEach((id) => setFieldValue_(id, ""));

    Object.keys(state.files).forEach((key) => clearUploadItem_(key));

    state.color = "c1";
    state.style = "s1";
    state.paper = "f1";
    state.premiumColor = "p1";
    state.submitResult = null;
    state.copiedId = "";
    state.uploadCardId = "";
    state.uploadCardIdSource = "tmp";

    syncUploadCardId_();
    setPlan_("free");
    goToPage_(0);
    hideSuccessBox_();
    setProgress_(0, "請填寫資料");
    setStatus_("表單已重設。");
    renderSummary_();
    renderLivePreview_();
  }

  function initCropper_() {
    if (!els.cropCanvas) return;

    const onPointerDown = (e) => {
      if (!cropState.image) return;
      cropState.drag.active = true;
      if (els.cropStage) els.cropStage.classList.add("dragging");
      const p = getPoint_(e);
      cropState.drag.startX = p.x;
      cropState.drag.startY = p.y;
      cropState.drag.baseX = cropState.offsetX;
      cropState.drag.baseY = cropState.offsetY;
      if (e.cancelable) e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!cropState.drag.active) return;
      const p = getPoint_(e);
      cropState.offsetX = cropState.drag.baseX + (p.x - cropState.drag.startX);
      cropState.offsetY = cropState.drag.baseY + (p.y - cropState.drag.startY);
      clampCropOffset_();
      renderCropCanvas_();
      if (e.cancelable) e.preventDefault();
    };

    const onPointerUp = () => {
      cropState.drag.active = false;
      if (els.cropStage) els.cropStage.classList.remove("dragging");
    };

    els.cropCanvas.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    els.cropCanvas.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);

    if (els.cropZoomOut) {
      els.cropZoomOut.addEventListener("click", () => {
        cropState.viewScale = Math.max(cropState.minScale, cropState.viewScale * 0.9);
        clampCropOffset_();
        renderCropCanvas_();
      });
    }

    if (els.cropZoomIn) {
      els.cropZoomIn.addEventListener("click", () => {
        cropState.viewScale = cropState.viewScale * 1.1;
        clampCropOffset_();
        renderCropCanvas_();
      });
    }

    if (els.cropCenter) {
      els.cropCenter.addEventListener("click", () => {
        cropState.offsetX = 0;
        cropState.offsetY = 0;
        renderCropCanvas_();
      });
    }

    if (els.cropReset) {
      els.cropReset.addEventListener("click", () => {
        resetCropView_();
        renderCropCanvas_();
      });
    }

    if (els.cropCancel) {
      els.cropCancel.addEventListener("click", closeCropper_);
    }

    if (els.cropApply) {
      els.cropApply.addEventListener("click", applyCrop_);
    }
  }

  async function openCropperForFile_(item, file, existingCrop = null) {
    if (!file) return;

    setStatus_("處理圖片中…");
    setProgress_(12, "讀取照片中…");

    cleanupCropResources_();
    const prepared = await prepareImageForCrop_(file);

    cropState.targetKey = item.key;
    cropState.targetLabel = item.label;
    cropState.ratio = item.outputWidth / item.outputHeight;
    cropState.outputWidth = item.outputWidth;
    cropState.outputHeight = item.outputHeight;
    cropState.sourceFile = file;
    cropState.sourceSize = file.size || 0;
    cropState.smartProfile = prepared.profile;
    cropState.image = prepared.image;
    cropState.preparedWidth = prepared.width;
    cropState.preparedHeight = prepared.height;
    cropState.previewDataUrl = prepared.previewDataUrl || "";

    if (els.cropTitle) els.cropTitle.textContent = `調整${item.label}位置`;
    if (els.cropDesc) {
      els.cropDesc.textContent = prepared.metaText
        ? `可拖移位置，並用按鈕放大、縮小、置中、重設後再套用。\n${prepared.metaText}`
        : "可拖移位置，並用按鈕放大、縮小、置中、重設後再套用。";
    }

    if (els.cropMeta) {
      els.cropMeta.textContent = prepared.metaText || "";
    }

    if (els.cropStage) {
      els.cropStage.classList.remove("ratio-square", "ratio-logo", "ratio-photo");
      els.cropStage.classList.add(item.ratioClass);
    }

    if (els.cropModal) els.cropModal.classList.add("show");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resetCropView_(existingCrop);
        renderCropCanvas_();
        setStatus_("圖片已載入，可開始裁切。");
      });
    });
  }

  function resetCropView_(existingCrop = null) {
    if (!cropState.image || !els.cropCanvas) return;

    const stageSize = getCropStageSize_();
    const img = cropState.image;
    const fitScale = Math.max(stageSize.w / img.width, stageSize.h / img.height);

    cropState.baseFitScale = fitScale;
    cropState.minScale = fitScale;
    cropState.viewScale = existingCrop?.viewScale ? Math.max(fitScale, existingCrop.viewScale) : fitScale;
    cropState.offsetX = Number(existingCrop?.offsetX || 0);
    cropState.offsetY = Number(existingCrop?.offsetY || 0);
    clampCropOffset_();
  }

  function getCropStageSize_() {
    const rect = els.cropStage.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    return {
      cssW: Math.max(1, Math.round(rect.width)),
      cssH: Math.max(1, Math.round(rect.height)),
      w: Math.max(1, Math.round(rect.width * dpr)),
      h: Math.max(1, Math.round(rect.height * dpr)),
      dpr
    };
  }

  function clampCropOffset_() {
    if (!cropState.image || !els.cropCanvas) return;

    const stage = getCropStageSize_();
    const img = cropState.image;
    const scaledW = img.width * cropState.viewScale;
    const scaledH = img.height * cropState.viewScale;

    const maxX = Math.max(0, (scaledW - stage.w) / 2);
    const maxY = Math.max(0, (scaledH - stage.h) / 2);

    cropState.offsetX = Math.max(-maxX, Math.min(maxX, cropState.offsetX));
    cropState.offsetY = Math.max(-maxY, Math.min(maxY, cropState.offsetY));
  }

  function renderCropCanvas_() {
    if (!cropState.image || !els.cropCanvas) return;

    const stage = getCropStageSize_();
    const canvas = els.cropCanvas;
    const ctx = canvas.getContext("2d");

    canvas.width = stage.w;
    canvas.height = stage.h;

    ctx.clearRect(0, 0, stage.w, stage.h);

    const img = cropState.image;
    if (!img.width || !img.height || !img.naturalWidth || !img.naturalHeight) {
      console.warn("[HSC form] crop image not ready");
      return;
    }

    const scaledW = img.width * cropState.viewScale;
    const scaledH = img.height * cropState.viewScale;
    const x = (stage.w - scaledW) / 2 + cropState.offsetX;
    const y = (stage.h - scaledH) / 2 + cropState.offsetY;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, scaledW, scaledH);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.88)";
    ctx.lineWidth = Math.max(2, 2 * stage.dpr);
    ctx.strokeRect(0, 0, stage.w, stage.h);
    ctx.restore();
  }

  async function applyCrop_() {
    if (!cropState.image || !cropState.targetKey) return;

    const stage = getCropStageSize_();
    const img = cropState.image;

    const stageCanvas = document.createElement("canvas");
    stageCanvas.width = stage.w;
    stageCanvas.height = stage.h;
    const stageCtx = stageCanvas.getContext("2d");

    const scaledW = img.width * cropState.viewScale;
    const scaledH = img.height * cropState.viewScale;
    const x = (stage.w - scaledW) / 2 + cropState.offsetX;
    const y = (stage.h - scaledH) / 2 + cropState.offsetY;

    stageCtx.clearRect(0, 0, stage.w, stage.h);
    stageCtx.fillStyle = "#ffffff";
    stageCtx.fillRect(0, 0, stage.w, stage.h);
    stageCtx.imageSmoothingEnabled = true;
    stageCtx.imageSmoothingQuality = "high";
    stageCtx.drawImage(img, x, y, scaledW, scaledH);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = cropState.outputWidth;
    outCanvas.height = cropState.outputHeight;
    const outCtx = outCanvas.getContext("2d");
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, cropState.outputWidth, cropState.outputHeight);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(stageCanvas, 0, 0, cropState.outputWidth, cropState.outputHeight);

    const quality = cropState.smartProfile.outputQuality;
    const blob = await canvasToBlob_(outCanvas, "image/jpeg", quality);
    if (!blob || !blob.size) throw new Error("裁切後輸出的圖片無效");

    const previewUrl = URL.createObjectURL(blob);

    const oldInfo = state.files[cropState.targetKey];
    if (oldInfo) revokeFileUrls_(oldInfo);

    state.files[cropState.targetKey] = {
      sourceFile: cropState.sourceFile,
      blob,
      previewUrl,
      remoteUrl: "",
      remoteCardId: "",
      crop: {
        viewScale: cropState.viewScale,
        offsetX: cropState.offsetX,
        offsetY: cropState.offsetY
      }
    };

    closeCropper_();
    refreshUploadThumbs_();
    setStatus_(`圖片已套用。壓縮模式：${cropState.smartProfile.label}｜輸出大小：約 ${(blob.size / MB).toFixed(2)} MB`);
  }

  function closeCropper_() {
    if (els.cropModal) els.cropModal.classList.remove("show");
    cropState.drag.active = false;
    cleanupCropResources_();
  }

  function cleanupCropResources_() {
    cropState.image = null;
    cropState.previewDataUrl = "";
    cropState.sourceFile = null;
    cropState.sourceSize = 0;
    cropState.targetKey = "";
    cropState.targetLabel = "";
    cropState.preparedWidth = 0;
    cropState.preparedHeight = 0;
    cropState.viewScale = 1;
    cropState.minScale = 1;
    cropState.baseFitScale = 1;
    cropState.offsetX = 0;
    cropState.offsetY = 0;
  }

  function getPoint_(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX || 0, y: e.touches[0].clientY || 0 };
    }
    return { x: e.clientX || 0, y: e.clientY || 0 };
  }

  async function prepareImageForCrop_(file) {
    const profile = getSmartProfile_(file.size || 0);

    const arrayBuffer = await file.arrayBuffer();
    const orientation = getJpegOrientation_(arrayBuffer);

    const rawDataUrl = await readFileAsDataURL_(file);
    const original = await loadImage_(rawDataUrl);

    const correctedCanvas = drawImageWithOrientation_(original, orientation);
    const normalizedCanvas = shrinkCanvasIfNeeded_(correctedCanvas, profile.maxLong, profile.maxShort);

    const previewBlob = await canvasToBlob_(normalizedCanvas, "image/jpeg", profile.previewQuality);
    const previewDataUrl = await blobToDataURL_(previewBlob);
    const finalImg = await loadImage_(previewDataUrl);

    const meta = [];
    meta.push(`智慧壓縮：${profile.label}`);
    if (orientation > 1) meta.push(`已修正照片方向（EXIF ${orientation}）`);
    if (original.naturalWidth !== finalImg.naturalWidth || original.naturalHeight !== finalImg.naturalHeight) {
      meta.push(`已預縮圖：${original.naturalWidth}×${original.naturalHeight} → ${finalImg.naturalWidth}×${finalImg.naturalHeight}`);
    }
    meta.push(`原始大小：約 ${(file.size / MB).toFixed(2)} MB`);

    return {
      image: finalImg,
      profile,
      previewDataUrl,
      width: finalImg.naturalWidth || finalImg.width,
      height: finalImg.naturalHeight || finalImg.height,
      metaText: meta.join("｜")
    };
  }

  function getSmartProfile_(size) {
    if (size <= FILE_TIER_SMALL) return SMART_PROFILE.small;
    if (size <= FILE_TIER_MEDIUM) return SMART_PROFILE.medium;
    return SMART_PROFILE.large;
  }

  function shrinkCanvasIfNeeded_(canvas, maxLong, maxShort) {
    const w = canvas.width;
    const h = canvas.height;
    const longSide = Math.max(w, h);
    const shortSide = Math.min(w, h);

    if (longSide <= maxLong && shortSide <= maxShort) return canvas;

    const ratio = Math.min(maxLong / longSide, maxShort / shortSide);
    const targetW = Math.max(1, Math.round(w * ratio));
    const targetH = Math.max(1, Math.round(h * ratio));

    const out = document.createElement("canvas");
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, targetW, targetH);
    return out;
  }

  function drawImageWithOrientation_(img, orientation) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if ([5, 6, 7, 8].includes(orientation)) {
      canvas.width = h;
      canvas.height = w;
    } else {
      canvas.width = w;
      canvas.height = h;
    }

    switch (orientation) {
      case 2:
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        ctx.translate(w, h);
        ctx.rotate(Math.PI);
        break;
      case 4:
        ctx.translate(0, h);
        ctx.scale(1, -1);
        break;
      case 5:
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -h);
        break;
      case 7:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(w, -h);
        ctx.scale(-1, 1);
        break;
      case 8:
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-w, 0);
        break;
      default:
        break;
    }

    ctx.drawImage(img, 0, 0);
    return canvas;
  }

  function getJpegOrientation_(arrayBuffer) {
    try {
      const view = new DataView(arrayBuffer);
      if (view.getUint16(0, false) !== 0xFFD8) return 1;

      let offset = 2;
      const length = view.byteLength;

      while (offset < length) {
        const marker = view.getUint16(offset, false);
        offset += 2;

        if (marker === 0xFFE1) {
          offset += 2;

          if (getString_(view, offset, 4) !== "Exif") return 1;
          offset += 6;

          const little = view.getUint16(offset, false) === 0x4949;
          const firstIFDOffset = view.getUint32(offset + 4, little);
          offset += firstIFDOffset;

          const tags = view.getUint16(offset, little);
          offset += 2;

          for (let i = 0; i < tags; i++) {
            const tagOffset = offset + i * 12;
            const tag = view.getUint16(tagOffset, little);
            if (tag === 0x0112) {
              return view.getUint16(tagOffset + 8, little);
            }
          }
          return 1;
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }

      return 1;
    } catch (_) {
      return 1;
    }
  }

  function getString_(view, start, length) {
    let out = "";
    for (let i = 0; i < length; i++) {
      out += String.fromCharCode(view.getUint8(start + i));
    }
    return out;
  }

  function loadImage_(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "sync";

      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight || !img.width || !img.height) {
          reject(new Error("Image load failed"));
          return;
        }
        resolve(img);
      };

      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.src = src;
    });
  }

  function readFileAsDataURL_(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("讀取圖片失敗"));
      reader.readAsDataURL(file);
    });
  }

  function blobToDataURL_(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("轉換圖片失敗"));
      reader.readAsDataURL(blob);
    });
  }

  function canvasToBlob_(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("無法輸出圖片"));
      }, type, quality);
    });
  }

  async function copyText_(value) {
    const v = text(value);
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
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
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

  function injectSuccessBoxStyles_() {
    if (document.getElementById("hsc-form-success-extra-style")) return;
    const style = document.createElement("style");
    style.id = "hsc-form-success-extra-style";
    style.textContent = `
      .hsc-success-main{display:grid;gap:12px;}
      .hsc-success-ok{font-weight:1000;font-size:13px;line-height:1.8;color:#fff;}
      .hsc-id-card,.hsc-reply-card{
        border:1px solid rgba(255,255,255,.12);
        border-radius:14px;
        background:rgba(255,255,255,.05);
        padding:12px;
      }
      .hsc-id-label,.hsc-reply-label{
        font-size:11px;
        color:rgba(255,255,255,.72);
        font-weight:1000;
        margin-bottom:6px;
      }
      .hsc-id-value{
        font-size:30px;
        line-height:1.2;
        font-weight:1000;
        letter-spacing:.04em;
        color:#7bdcff;
        word-break:break-word;
      }
      .hsc-id-tip,.hsc-reply-tip{
        margin-top:6px;
        font-size:11px;
        line-height:1.8;
        color:rgba(255,255,255,.78);
      }
      .hsc-reply-text{
        width:100%;
        min-height:132px;
        resize:none;
        background:rgba(255,255,255,.06);
        color:#fff;
        border:1px solid rgba(255,255,255,.12);
        border-radius:12px;
        padding:12px;
        font-size:13px;
        line-height:1.8;
        outline:none;
        margin:0;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml_(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.HSCForm = Object.assign(window.HSCForm || {}, {
    version: VERSION,
    getState: () => JSON.parse(JSON.stringify({
      currentPage: state.currentPage,
      plan: state.plan,
      color: state.color,
      style: state.style,
      paper: state.paper,
      premiumColor: state.premiumColor,
      isSubmitting: state.isSubmitting,
      reservedUid: state.reservedUid,
      inviteCode: state.inviteCode,
      tenant: state.tenant,
      uploadCardId: state.uploadCardId,
      uploadCardIdSource: state.uploadCardIdSource
    }))
  });
})();