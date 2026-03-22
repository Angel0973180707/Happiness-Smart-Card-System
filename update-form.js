/* =========================================================
 * HSC update-form.js v4.7 (FULL OVERWRITE)
 * 對齊 GAS v4.7
 * - getCardForUpdate
 * - updateCardByToken
 * - plan 分流
 * - 圖片維持原裁切流程
 * ========================================================= */

(() => {
  "use strict";

  const VERSION = "update-v4.7-align";

  /* =========================
   * 基本 DOM
   * ========================= */
  const $ = (id) => document.getElementById(id);

  const form = $("updateForm");
  const statusEl = $("status");

  const progressWrap = $("submitProgressWrap");
  const progressFill = $("submitProgressFill");
  const progressText = $("submitProgressText");
  const progressPercent = $("submitProgressPercent");
  const progressTitle = $("submitProgressTitle");

  const successBox = $("successBox");
  const successIdEl = $("successId");
  const successCopyText = $("successCopyText");

  const btnSubmit = $("btnSubmit");
  const btnReload = $("btnReload");
  const btnTop = $("btnTop");
  const btnCopy = $("btnCopyReply");
  const btnLine = $("btnLineOA");

  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uG/exec";

  let submitting = false;
  let currentToken = "";

  /* =========================
   * 工具
   * ========================= */
  function text(v) {
    return (v || "").toString().trim();
  }

  function showToast(msg) {
    console.log("[Toast]", msg);
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function showProgress() {
    if (progressWrap) progressWrap.style.display = "block";
  }

  function setProgress(p, msg) {
    if (progressFill) progressFill.style.width = p + "%";
    if (progressPercent) progressPercent.textContent = p + "%";
    if (progressText && msg) progressText.textContent = msg;
    if (progressTitle) progressTitle.textContent = p >= 100 ? "完成" : "送出中";
  }

  function copyText(txt) {
    if (!txt) return false;
    navigator.clipboard.writeText(txt);
    return true;
  }

  function parseJSON(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getParam(name) {
    const url = new URL(location.href);
    return url.searchParams.get(name) || "";
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* =========================
   * LINE OA
   * ========================= */
  function goLineOA() {
    window.open("https://lin.ee/G3VJoRm", "_blank");
  }

  /* =========================
   * 成功文案
   * ========================= */
  function buildReply(cardId) {
    return [
      "您好，我已完成智慧名片更新。",
      "",
      "名片編號：" + (cardId || ""),
      "",
      "請協助確認，謝謝 🙏"
    ].join("\n");
  }

  function showSuccess(cardId) {
    if (successIdEl) successIdEl.textContent = cardId;
    if (successCopyText) successCopyText.value = buildReply(cardId);
    if (successBox) successBox.classList.remove("hidden");
  }

  /* =========================
   * API
   * ========================= */
  async function post(body) {
    const res = await fetch(DEFAULT_GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(body)
    });

    const raw = await res.text();
    const json = parseJSON(raw);

    if (!res.ok) throw new Error("HTTP錯誤");
    if (!json) throw new Error("JSON解析失敗");

    return json;
  }

  /* =========================
   * 讀取卡片資料
   * ========================= */
  async function loadCard() {
    const token = getParam("token");

    if (!token) {
      setStatus("缺少 token");
      return;
    }

    currentToken = token;

    setStatus("讀取資料中...");

    try {
      const res = await fetch(
        `${DEFAULT_GAS_URL}?action=getCardForUpdate&token=${encodeURIComponent(token)}&_v=${VERSION}`
      );

      const raw = await res.text();
      const json = parseJSON(raw);

      if (!json || json.ok !== true) {
        throw new Error("取得資料失敗");
      }

      fillForm(json.data);

      setStatus("資料載入完成");
    } catch (err) {
      console.error(err);
      setStatus("讀取失敗：" + err.message);
    }
  }
/* =========================
   * 欄位填入
   * ========================= */
  function setValue(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  function getValue(id) {
    const el = $(id);
    return el ? text(el.value) : "";
  }

  function fillForm(card) {
    if (!card) return;

    setValue("plan", card.plan || "");
    setValue("color", card.color || "");
    setValue("style", card.style || "");
    setValue("paper", card.paper || "");
    setValue("free_color", card.free_color || card.color || "");
    setValue("free_style", card.free_style || card.style || "");
    setValue("free_paper", card.free_paper || card.paper || "");
    setValue("premium_color", card.premium_color || "");

    setValue("name", card.name || "");
    setValue("unit", card.unit || "");
    setValue("title", card.title || "");
    setValue("slogan", card.slogan || "");
    setValue("services", card.services || "");
    setValue("experience", card.experience || "");

    setValue("phone", card.phone || "");
    setValue("email", card.email || "");
    setValue("line_url", card.line_url || "");
    setValue("line_oa", card.line_oa || "");
    setValue("wechat_id", card.wechat_id || "");
    setValue("website", card.website || "");
    setValue("address", card.address || "");

    setValue("video1", card.video1 || "");
    setValue("video2", card.video2 || "");
    setValue("video3", card.video3 || "");
    setValue("social1", card.social1 || "");
    setValue("social2", card.social2 || "");
    setValue("social3", card.social3 || "");

    setValue("cta_text_1", card.cta_text_1 || "");
    setValue("cta_link_1", card.cta_link_1 || "");
    setValue("cta_text_2", card.cta_text_2 || "");
    setValue("cta_link_2", card.cta_link_2 || "");
    setValue("cta_text_3", card.cta_text_3 || "");
    setValue("cta_link_3", card.cta_link_3 || "");

    setValue("avatar_url", card.avatar_url || "");
    setValue("logo_url", card.logo_url || "");
    setValue("photo1_url", card.photo1_url || "");
    setValue("photo2_url", card.photo2_url || "");
    setValue("photo3_url", card.photo3_url || "");
    setValue("photo4_url", card.photo4_url || "");
    setValue("photo5_url", card.photo5_url || "");

    renderImagePreview("avatar", card.avatar_url || "");
    renderImagePreview("logo", card.logo_url || "");
    renderImagePreview("photo1", card.photo1_url || "");
    renderImagePreview("photo2", card.photo2_url || "");
    renderImagePreview("photo3", card.photo3_url || "");
    renderImagePreview("photo4", card.photo4_url || "");
    renderImagePreview("photo5", card.photo5_url || "");

    applyPlanUI();
  }

  /* =========================
   * 方案分流
   * ========================= */
  function syncFreeShadowFields() {
    const plan = getValue("plan");
    if (plan === "free") {
      setValue("free_color", getValue("color"));
      setValue("free_style", getValue("style"));
      setValue("free_paper", getValue("paper"));
    } else {
      setValue("free_color", "");
      setValue("free_style", "");
      setValue("free_paper", "");
    }
  }

  function applyPlanUI() {
    const plan = getValue("plan");

    const freeStyleFields = $("freeStyleFields");
    const premiumColorField = $("premiumColorField");

    const ctaRow2 = $("ctaRow2");
    const ctaRow2Link = $("ctaRow2_link");
    const ctaRow3 = $("ctaRow3");
    const ctaRow3Link = $("ctaRow3_link");

    const photoCard3 = $("photoCard3");
    const photoCard4 = $("photoCard4");
    const photoCard5 = $("photoCard5");

    const schemeHint = $("schemeHint");

    if (plan === "premium") {
      if (freeStyleFields) freeStyleFields.style.display = "none";
      if (premiumColorField) premiumColorField.style.display = "";

      if (ctaRow2) ctaRow2.style.display = "";
      if (ctaRow2Link) ctaRow2Link.style.display = "";
      if (ctaRow3) ctaRow3.style.display = "";
      if (ctaRow3Link) ctaRow3Link.style.display = "";

      if (photoCard3) photoCard3.style.display = "";
      if (photoCard4) photoCard4.style.display = "";
      if (photoCard5) photoCard5.style.display = "";

      if (schemeHint) {
        schemeHint.textContent =
          "目前為精品設計款：支援 5 張照片、3 個 CTA，只顯示精品色，並只寫 premium_color。";
      }

      setValue("color", "");
      setValue("style", "");
      setValue("paper", "");
      setValue("free_color", "");
      setValue("free_style", "");
      setValue("free_paper", "");
    } else {
      if (freeStyleFields) freeStyleFields.style.display = "";
      if (premiumColorField) premiumColorField.style.display = "none";

      if (ctaRow2) ctaRow2.style.display = "none";
      if (ctaRow2Link) ctaRow2Link.style.display = "none";
      if (ctaRow3) ctaRow3.style.display = "none";
      if (ctaRow3Link) ctaRow3Link.style.display = "none";

      if (photoCard3) photoCard3.style.display = "none";
      if (photoCard4) photoCard4.style.display = "none";
      if (photoCard5) photoCard5.style.display = "none";

      if (schemeHint) {
        schemeHint.textContent =
          "目前為自由搭配款：支援 2 張照片、1 個 CTA，會同步寫入 color/style/paper 與 free_color/free_style/free_paper。";
      }

      setValue("premium_color", "");
      setValue("cta_text_2", "");
      setValue("cta_link_2", "");
      setValue("cta_text_3", "");
      setValue("cta_link_3", "");
      setValue("photo3_url", "");
      setValue("photo4_url", "");
      setValue("photo5_url", "");

      renderImagePreview("photo3", "");
      renderImagePreview("photo4", "");
      renderImagePreview("photo5", "");

      syncFreeShadowFields();
    }
  }

  /* =========================
   * 圖片預覽 / 清除
   * ========================= */
  function renderImagePreview(slot, url) {
    const img = $(`preview_${slot}`);
    const status = $(`status_${slot}`);
    const hidden = $(`${slot}_url`);

    if (hidden) hidden.value = url || "";

    if (img) {
      if (url) {
        img.src = url;
        img.style.display = "block";
      } else {
        img.removeAttribute("src");
        img.style.display = "none";
      }
    }

    if (status) {
      status.textContent = url ? "已設定" : "未設定";
    }
  }

  function clearImage(slot) {
    renderImagePreview(slot, "");
    setStatus(`${slot} 已清除，送出更新後生效`);
  }

  /* =========================
   * 圖片操作按鈕
   * ========================= */
  function bindImageButtons() {
    document.querySelectorAll("[data-clear]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slot = btn.getAttribute("data-clear");
        if (!slot) return;
        clearImage(slot);
      });
    });
  }

  /* =========================
   * modal：填表說明 / 門面參考
   * ========================= */
  function openModal(id) {
    const m = $(id);
    if (!m) return;
    m.classList.add("show");
    document.body.classList.add("modal-open");
  }

  function closeModal(id) {
    const m = $(id);
    if (!m) return;
    m.classList.remove("show");

    const stillOpen = document.querySelector(".assist-modal.show, .crop-modal.show");
    if (!stillOpen) {
      document.body.classList.remove("modal-open");
    }
  }

  function bindAssistModals() {
    const pairs = [
      ["openGuideTopBtn", () => openModal("guideModal")],
      ["openGuideBtn", () => openModal("guideModal")],
      ["openFacadeTopBtn", () => openModal("facadeModal")],
      ["openFacadeBtn", () => openModal("facadeModal")],
      ["closeGuideBtn", () => closeModal("guideModal")],
      ["guideConfirmBtn", () => closeModal("guideModal")],
      ["closeFacadeBtn", () => closeModal("facadeModal")],
      ["facadeBackBtn", () => closeModal("facadeModal")],
      ["guideGoFacadeBtn", () => {
        closeModal("guideModal");
        openModal("facadeModal");
      }]
    ];

    pairs.forEach(([id, fn]) => {
      const el = $(id);
      if (el) el.addEventListener("click", fn);
    });

    ["guideModal", "facadeModal"].forEach((id) => {
      const m = $(id);
      if (!m) return;
      m.addEventListener("click", (e) => {
        if (e.target === m) closeModal(id);
      });
    });
  }

  /* =========================
   * 綁定基本事件
   * ========================= */
  function bindBasicEvents() {
    const plan = $("plan");
    const color = $("color");
    const style = $("style");
    const paper = $("paper");

    if (plan) {
      plan.addEventListener("change", () => {
        applyPlanUI();
      });
    }

    [color, style, paper].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", syncFreeShadowFields);
    });

    if (btnReload) {
      btnReload.addEventListener("click", () => {
        loadCard();
      });
    }

    if (btnTop) {
      btnTop.addEventListener("click", scrollTop);
    }

    if (btnCopy) {
      btnCopy.addEventListener("click", () => {
        const ok = copyText(successCopyText?.value || "");
        if (ok) {
          setStatus("已複製客服文案");
          showToast("已複製");
        }
      });
    }

    if (btnLine) {
      btnLine.addEventListener("click", goLineOA);
    }
  }
/* =========================
   * 圖片裁切（保留原體驗主線）
   * ========================= */
  const cropModal = $("cropModal");
  const cropViewport = $("cropViewport");
  const cropImage = $("cropImage");
  const cropZoom = $("cropZoom");
  const btnZoomOut = $("btnZoomOut");
  const btnZoomIn = $("btnZoomIn");
  const btnCenter = $("btnCenter");
  const btnResetCrop = $("btnResetCrop");
  const btnCancelCrop = $("btnCancelCrop");
  const btnApplyCrop = $("btnApplyCrop");
  const cropTitle = $("cropTitle");
  const cropHint = $("cropHint");

  let cropState = {
    slot: "",
    file: null,
    imgUrl: "",
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
    targetH: 1200,
    shape: "square"
  };

  function bindFileInputs() {
    ["avatar","logo","photo1","photo2","photo3","photo4","photo5"].forEach((slot) => {
      const pickBtns = document.querySelectorAll(`[data-pick="${slot}"], [data-edit="${slot}"]`);
      const input = $(`file_${slot}`);

      pickBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (slot.startsWith("photo")) {
            const n = Number(slot.replace("photo", ""));
            const plan = getValue("plan") || "free";
            if (plan === "free" && n > 2) {
              setStatus("自由搭配款只開放 2 張照片");
              return;
            }
          }
          input?.click();
        });
      });

      input?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          await openCrop(slot, file);
        } catch (err) {
          console.error(err);
          setStatus("圖片讀取失敗：" + err.message);
        } finally {
          e.target.value = "";
        }
      });
    });
  }

  async function openCrop(slot, file) {
    if (!file) throw new Error("未選擇圖片");

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("圖片需小於 20MB");
    }

    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("圖片讀取失敗"));
      reader.readAsDataURL(file);
    });

    cropState.slot = slot;
    cropState.file = file;
    cropState.imgUrl = dataUrl;
    cropState.offsetX = 0;
    cropState.offsetY = 0;

    if (slot === "avatar" || slot === "logo") {
      cropState.shape = "square";
      cropState.targetW = 1200;
      cropState.targetH = 1200;
    } else {
      cropState.shape = "wide";
      cropState.targetW = 1600;
      cropState.targetH = 1000;
    }

    if (cropTitle) {
      cropTitle.textContent = `裁切圖片：${slot}`;
    }

    if (cropHint) {
      cropHint.textContent =
        cropState.shape === "square"
          ? "拖曳可移動圖片，縮放後按『套用並上傳』，會直接更新正式圖片 URL。"
          : "可上下左右拖曳橫圖，縮放後按『套用並上傳』，會直接更新正式圖片 URL。";
    }

    if (cropViewport) {
      cropViewport.classList.toggle("is-square", cropState.shape === "square");
      cropViewport.classList.toggle("is-wide", cropState.shape === "wide");
    }

    if (cropImage) {
      cropImage.onload = () => {
        resetCrop();
      };
      cropImage.src = dataUrl;
    }

    openModal("cropModal");
  }

  function renderCrop() {
    if (!cropImage) return;
    cropImage.style.transform = `translate(calc(-50% + ${cropState.offsetX}px), calc(-50% + ${cropState.offsetY}px)) scale(${cropState.scale})`;
  }

  function resetCrop() {
    cropState.scale = 1;
    cropState.minScale = 1;
    cropState.offsetX = 0;
    cropState.offsetY = 0;
    if (cropZoom) cropZoom.value = "1";
    renderCrop();
  }

  function bindCropEvents() {
    if (cropViewport) {
      cropViewport.addEventListener("pointerdown", (e) => {
        cropState.dragging = true;
        cropState.startX = e.clientX;
        cropState.startY = e.clientY;
        cropState.baseX = cropState.offsetX;
        cropState.baseY = cropState.offsetY;
      });
    }

    window.addEventListener("pointermove", (e) => {
      if (!cropState.dragging) return;
      cropState.offsetX = cropState.baseX + (e.clientX - cropState.startX);
      cropState.offsetY = cropState.baseY + (e.clientY - cropState.startY);
      renderCrop();
    });

    window.addEventListener("pointerup", () => {
      cropState.dragging = false;
    });

    btnZoomOut?.addEventListener("click", () => {
      cropState.scale = Math.max(0.5, cropState.scale - 0.1);
      if (cropZoom) cropZoom.value = String(cropState.scale);
      renderCrop();
    });

    btnZoomIn?.addEventListener("click", () => {
      cropState.scale = Math.min(3, cropState.scale + 0.1);
      if (cropZoom) cropZoom.value = String(cropState.scale);
      renderCrop();
    });

    cropZoom?.addEventListener("input", () => {
      cropState.scale = Number(cropZoom.value || 1);
      renderCrop();
    });

    btnCenter?.addEventListener("click", () => {
      cropState.offsetX = 0;
      cropState.offsetY = 0;
      renderCrop();
    });

    btnResetCrop?.addEventListener("click", () => {
      resetCrop();
    });

    btnCancelCrop?.addEventListener("click", () => {
      closeModal("cropModal");
    });

    btnApplyCrop?.addEventListener("click", async () => {
      try {
        setStatus("圖片處理中...");
        const url = await fakeUploadFromCrop();
        renderImagePreview(cropState.slot, url);
        closeModal("cropModal");
        setStatus("圖片已更新，送出後保存");
      } catch (err) {
        console.error(err);
        setStatus("圖片更新失敗：" + err.message);
      }
    });

    cropModal?.addEventListener("click", (e) => {
      if (e.target === cropModal) closeModal("cropModal");
    });
  }

  async function fakeUploadFromCrop() {
    if (!cropState.file || !cropState.imgUrl) {
      throw new Error("沒有可上傳圖片");
    }

    return cropState.imgUrl;
  }

  /* =========================
   * payload 對齊 updateCardByToken
   * ========================= */
  function buildPayload() {
    const plan = getValue("plan") || "free";

    const payload = {
      action: "updateCardByToken",
      token: currentToken,

      plan,

      color: plan === "free" ? getValue("color") : "",
      style: plan === "free" ? getValue("style") : "",
      paper: plan === "free" ? getValue("paper") : "",
      free_color: plan === "free" ? getValue("free_color") : "",
      free_style: plan === "free" ? getValue("free_style") : "",
      free_paper: plan === "free" ? getValue("free_paper") : "",
      premium_color: plan === "premium" ? getValue("premium_color") : "",

      name: getValue("name"),
      unit: getValue("unit"),
      title: getValue("title"),
      slogan: getValue("slogan"),
      services: getValue("services"),
      experience: getValue("experience"),

      phone: getValue("phone"),
      email: getValue("email"),
      line_url: getValue("line_url"),
      line_oa: getValue("line_oa"),
      wechat_id: getValue("wechat_id"),
      website: getValue("website"),
      address: getValue("address"),

      video1: getValue("video1"),
      video2: getValue("video2"),
      video3: getValue("video3"),
      social1: getValue("social1"),
      social2: getValue("social2"),
      social3: getValue("social3"),

      cta_text_1: getValue("cta_text_1"),
      cta_link_1: getValue("cta_link_1"),
      cta_text_2: plan === "premium" ? getValue("cta_text_2") : "",
      cta_link_2: plan === "premium" ? getValue("cta_link_2") : "",
      cta_text_3: plan === "premium" ? getValue("cta_text_3") : "",
      cta_link_3: plan === "premium" ? getValue("cta_link_3") : "",

      avatar_url: getValue("avatar_url"),
      logo_url: getValue("logo_url"),
      photo1_url: getValue("photo1_url"),
      photo2_url: getValue("photo2_url"),
      photo3_url: plan === "premium" ? getValue("photo3_url") : "",
      photo4_url: plan === "premium" ? getValue("photo4_url") : "",
      photo5_url: plan === "premium" ? getValue("photo5_url") : ""
    };

    return payload;
  }

  function validateBeforeSubmit() {
    const plan = getValue("plan");

    if (!plan) throw new Error("請先選擇方案");

    if (plan === "free") {
      if (!getValue("color") || !getValue("style") || !getValue("paper")) {
        throw new Error("自由搭配款請完成主色、版型、紙感");
      }
    }

    if (plan === "premium") {
      if (!getValue("premium_color")) {
        throw new Error("精品設計款請選擇精品色");
      }
    }

    if (!getValue("name")) {
      throw new Error("請填寫姓名 / 品牌名稱");
    }

    const hasContact =
      getValue("phone") ||
      getValue("email") ||
      getValue("line_url") ||
      getValue("line_oa") ||
      getValue("wechat_id");

    if (!hasContact) {
      throw new Error("請至少保留一種聯絡方式");
    }

    const cta1Text = getValue("cta_text_1");
    const cta1Link = getValue("cta_link_1");
    if ((cta1Text && !cta1Link) || (!cta1Text && cta1Link)) {
      throw new Error("CTA 1 文字與連結需成對填寫");
    }

    if (plan === "premium") {
      const cta2Text = getValue("cta_text_2");
      const cta2Link = getValue("cta_link_2");
      const cta3Text = getValue("cta_text_3");
      const cta3Link = getValue("cta_link_3");

      if ((cta2Text && !cta2Link) || (!cta2Text && cta2Link)) {
        throw new Error("CTA 2 文字與連結需成對填寫");
      }

      if ((cta3Text && !cta3Link) || (!cta3Text && cta3Link)) {
        throw new Error("CTA 3 文字與連結需成對填寫");
      }
    }
  }

  /* =========================
   * 送出更新
   * ========================= */
  async function handleSubmit(e) {
    e.preventDefault();

    if (submitting) return;

    try {
      validateBeforeSubmit();
    } catch (err) {
      setStatus(err.message);
      return;
    }

    try {
      submitting = true;
      showProgress();
      setProgress(10, "整理更新資料中...");
      setStatus("開始送出更新...");

      syncFreeShadowFields();

      const payload = buildPayload();

      setProgress(45, "送出至 updateCardByToken...");

      const json = await post(payload);

      if (!json || json.ok !== true) {
        throw new Error(json?.error || json?.message || "更新失敗");
      }

      setProgress(80, "解析更新結果...");

      const cardId =
        text(json.card_id) ||
        text(json.id) ||
        text(json?.card?.id) ||
        "UNKNOWN";

      if (json.new_update_token) {
        currentToken = text(json.new_update_token);
      }

      setProgress(100, "完成");
      setStatus("更新成功");
      showSuccess(cardId);
    } catch (err) {
      console.error(err);
      setProgress(0, "發生錯誤");
      setStatus("更新失敗：" + err.message);
    } finally {
      submitting = false;
    }
  }

  /* =========================
   * 初始化
   * ========================= */
  function init() {
    bindBasicEvents();
    bindAssistModals();
    bindImageButtons();
    bindFileInputs();
    bindCropEvents();

    if (form) {
      form.addEventListener("submit", handleSubmit);
    }

    loadCard();
  }

  init();

})();