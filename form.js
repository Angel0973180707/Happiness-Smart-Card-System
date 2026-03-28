
(() => {
  "use strict";

  const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
    DRAFT_KEY: "hsc_form_draft_v687",
    RESULT_KEY: "HSC_LAST_QUOTE",
    PLAN_PRICES: { free: 1500, premium: 2000 },
    BASE_LIMITS: { free: { photos: 2, ctas: 1 }, premium: { photos: 5, ctas: 3 } }
  };

  const els = {};
  const state = {
    plan:null, addons:new Set(), photoQty:0, ctaQty:0, photoLimit:0, ctaLimit:0,
    planAmount:0, addonAmount:0, totalAmount:0, submitting:false,
    photoStates:{}
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cache();
    bind();
    restoreDraft();
    syncAll();
    setStatus("目前版本：v6.8.7｜照片位置與預覽設定正式存檔版");
  }

  function cache() {
    const ids = [
      "smart-card-form","form-status-strip","btn-open-showcase","btn-save-draft","btn-clear-draft","btn-contact-service","btn-submit-form",
      "btn-gold-info","btn-gold-copy","btn-gold-contact","summary-plan-pill","summary-photo-pill","summary-cta-pill",
      "summary-plan-name","summary-photo-count","summary-cta-count","summary-marquee-status","quote-state-text",
      "quote-plan-amount","quote-addon-amount","quote-total-amount","quote-addon-breakdown",
      "addon_photo_enabled","addon_photo_qty","addon_cta_enabled","addon_cta_qty","addon-photo-tip",
      "free-theme-group","premium-theme-group","free_color","free_style","free_paper","premium_color",
      "display_name","unit","title","phone","email","website","line_url","line_oa","wechat_id","experience","services","address","intro",
      "marquee-section","marquee_1","marquee_2","marquee_3","photo-slots","cta-slots","photo-slot-template","cta-slot-template","invite_code","ref",
      "preview-card-board","preview-avatar-img","preview-avatar-empty","preview-name","preview-unit","preview-title","preview-contact",
      "preview-marquee","preview-services","preview-ctas","preview-photos","submit-progress-overlay","progress-fill","progress-text","progress-contact-service"
    ];
    ids.forEach(id => els[id.replace(/-/g,"_")] = document.getElementById(id));
    els.planRadios = [...document.querySelectorAll('input[name="plan"]')];
    els.addonBoxes = [...document.querySelectorAll('input[name="addons"]')];
    els.progressSteps = [...document.querySelectorAll(".progress-step")];
  }

  function bind() {
    els.planRadios.forEach(r => r.addEventListener("change", syncAll));
    els.addonBoxes.forEach(b => b.addEventListener("change", syncAll));
    els.addon_photo_qty.addEventListener("input", syncAll);
    els.addon_cta_qty.addEventListener("input", syncAll);
    els.smart_card_form.addEventListener("submit", submitForm);

    [
      els.display_name, els.unit, els.title, els.phone, els.email, els.website,
      els.line_url, els.line_oa, els.wechat_id, els.experience, els.services,
      els.address, els.intro, els.marquee_1, els.marquee_2, els.marquee_3,
      els.free_color, els.free_style, els.free_paper, els.premium_color
    ].forEach(el => el && el.addEventListener("input", renderLivePreview));

    els.btn_open_showcase.addEventListener("click", () => window.open(CONFIG.HUB_URL + "index.html?view=1","_blank","noopener"));
    els.btn_contact_service.addEventListener("click", () => openService(""));
    els.progress_contact_service.addEventListener("click", () => openService("我已送出表單，想確認目前進度"));
    els.btn_gold_contact.addEventListener("click", () => openService("想瞭解金牌會員"));
    els.btn_gold_info.addEventListener("click", () => alert("瞭解金牌會員權益，請在客服區輸入：想瞭解金牌會員"));
    els.btn_gold_copy.addEventListener("click", async () => { await copyText("想瞭解金牌會員"); setStatus("已複製詢問文案：想瞭解金牌會員"); });

    els.btn_save_draft.addEventListener("click", () => saveDraft(false));
    els.btn_clear_draft.addEventListener("click", () => { localStorage.removeItem(CONFIG.DRAFT_KEY); setStatus("已清除暫存草稿。"); });
    els.smart_card_form.addEventListener("input", debounce(() => saveDraft(true), 250));
  }

  function syncAll() {
    state.plan = getPlan();
    state.addons = new Set(els.addonBoxes.filter(b => b.checked).map(b => b.value));
    syncTheme();
    syncAddonQty();
    calcTotals();
    renderSummary();
    renderQuote();
    renderPhotos();
    renderCtas();
    renderLivePreview();
    els.marquee_section.classList.toggle("hidden", !(state.addons.has("addon_marquee") || state.addons.has("addon_bundle")));
  }

  function getPlan() {
    const checked = els.planRadios.find(r => r.checked);
    return checked ? checked.value : null;
  }

  function syncTheme() {
    els.free_theme_group.classList.toggle("hidden", state.plan !== "free");
    els.premium_theme_group.classList.toggle("hidden", state.plan !== "premium");
    document.querySelectorAll("[data-plan-card]").forEach(node => node.classList.toggle("is-selected", !!node.querySelector("input")?.checked));
    els.preview_card_board.classList.toggle("plan-premium", state.plan === "premium");
  }

  function syncAddonQty() {
    const photoMax = state.plan === "free" ? 8 : state.plan === "premium" ? 5 : 0;
    const ctaMax = state.plan ? 10 : 0;
    els.addon_photo_qty.disabled = !(state.plan && els.addon_photo_enabled.checked);
    els.addon_cta_qty.disabled = !(state.plan && els.addon_cta_enabled.checked);
    els.addon_photo_qty.max = String(photoMax);
    els.addon_cta_qty.max = String(ctaMax);
    els.addon_photo_qty.value = String(clampInt(els.addon_photo_qty.value, 0, photoMax));
    els.addon_cta_qty.value = String(clampInt(els.addon_cta_qty.value, 0, ctaMax));
    els.addon_photo_tip.textContent = !state.plan ? "先選方案後可輸入張數" : (state.plan === "free" ? "自由搭配可加購 1-8 張" : "精品設計可加購 1-5 張");
  }

  function calcTotals() {
    state.photoQty = els.addon_photo_enabled.checked ? clampInt(els.addon_photo_qty.value, 0, state.plan === "free" ? 8 : state.plan === "premium" ? 5 : 0) : 0;
    state.ctaQty = els.addon_cta_enabled.checked ? clampInt(els.addon_cta_qty.value, 0, state.plan ? 10 : 0) : 0;
    const base = state.plan ? CONFIG.BASE_LIMITS[state.plan] : { photos:0, ctas:0 };
    state.photoLimit = state.plan ? base.photos + state.photoQty : 0;
    state.ctaLimit = state.plan ? base.ctas + state.ctaQty : 0;
    state.planAmount = state.plan ? CONFIG.PLAN_PRICES[state.plan] : 0;

    let addon = 0;
    if (state.addons.has("addon_bundle")) addon += 500;
    else {
      if (state.addons.has("addon_marquee")) addon += 300;
      if (state.addons.has("addon_update_unlimited")) addon += 300;
    }
    addon += state.photoQty * 100;
    addon += state.ctaQty * 100;
    if (state.addons.has("addon_agent_upgrade")) addon += 10000;

    state.addonAmount = addon;
    state.totalAmount = state.planAmount + addon;
  }

  function renderSummary() {
    els.summary_plan_name.textContent = state.plan ? (state.plan === "premium" ? "精品設計" : "自由搭配") : "請先選擇方案";
    els.summary_photo_count.textContent = state.plan ? String(state.photoLimit) : "-";
    els.summary_cta_count.textContent = state.plan ? String(state.ctaLimit) : "-";
    els.summary_marquee_status.textContent = (state.addons.has("addon_marquee") || state.addons.has("addon_bundle")) ? "已開啟" : "未開啟";
    els.summary_plan_pill.textContent = state.plan ? "目前方案：" + (state.plan === "premium" ? "精品設計" : "自由搭配") : "請先選擇方案";
    els.summary_photo_pill.textContent = "照片上限：" + (state.plan ? state.photoLimit : "-");
    els.summary_cta_pill.textContent = "CTA 上限：" + (state.plan ? state.ctaLimit : "-");
  }

  function renderQuote() {
    els.quote_state_text.textContent = state.plan ? "已選擇 " + (state.plan === "premium" ? "精品設計" : "自由搭配") : "請先選擇方案";
    els.quote_plan_amount.textContent = state.plan ? money(state.planAmount) : "-";
    els.quote_addon_amount.textContent = money(state.addonAmount);
    els.quote_total_amount.textContent = state.plan ? money(state.totalAmount) : "-";
    const rows = [];
    if (state.addons.has("addon_bundle")) rows.push(["跑馬燈＋更新組合", 500]);
    else {
      if (state.addons.has("addon_marquee")) rows.push(["跑馬燈功能", 300]);
      if (state.addons.has("addon_update_unlimited")) rows.push(["無限更新", 300]);
    }
    if (state.photoQty) rows.push([`照片加購 x ${state.photoQty}`, state.photoQty * 100]);
    if (state.ctaQty) rows.push([`CTA 加購 x ${state.ctaQty}`, state.ctaQty * 100]);
    if (state.addons.has("addon_agent_upgrade")) rows.push(["金牌級會員", 10000]);
    els.quote_addon_breakdown.innerHTML = rows.length ? rows.map(([a,b]) => `<div class="quote-breakdown-row"><span>${a}</span><strong>${money(b)}</strong></div>`).join("") : "<span>尚未選擇加購</span>";
  }

  function renderPhotos() {
    els.photo_slots.innerHTML = "";
    if (!state.plan) return;
    for (let i = 1; i <= state.photoLimit; i++) {
      const key = "photo" + i;
      if (!state.photoStates[key]) state.photoStates[key] = { file:null, url:"", rotation:0, scale:1, offsetX:0 };
      const photoState = state.photoStates[key];

      const frag = els.photo_slot_template.content.cloneNode(true);
      const title = frag.querySelector(".photo-title");
      const badge = frag.querySelector(".badge");
      const file = frag.querySelector(".photo-file-input");
      const img = frag.querySelector(".preview-image");
      const empty = frag.querySelector(".preview-empty");
      const tools = frag.querySelector(".photo-tools");
      const zoom = frag.querySelector(".zoom-range");
      const left = frag.querySelector(".rotate-left");
      const right = frag.querySelector(".rotate-right");
      const moveLeft = frag.querySelector(".move-left");
      const moveRight = frag.querySelector(".move-right");
      const reset = frag.querySelector(".reset-photo");

      title.textContent = "照片 " + i;
      file.name = `photo${i}_file`;
      zoom.value = String(photoState.scale);

      const apply = () => {
        img.style.transform = `translateX(${photoState.offsetX}px) scale(${photoState.scale}) rotate(${photoState.rotation}deg)`;
      };

      if (photoState.url) {
        img.src = photoState.url;
        img.classList.remove("hidden");
        empty.classList.add("hidden");
        tools.classList.remove("hidden");
        badge.textContent = "已選圖片";
        apply();
      }

      file.addEventListener("change", () => {
        const f = file.files && file.files[0];
        if (!f) return;
        if (photoState.url) URL.revokeObjectURL(photoState.url);
        photoState.file = f;
        photoState.url = URL.createObjectURL(f);
        photoState.rotation = 0;
        photoState.scale = 1;
        photoState.offsetX = 0;
        zoom.value = "1";
        img.src = photoState.url;
        img.classList.remove("hidden");
        empty.classList.add("hidden");
        tools.classList.remove("hidden");
        badge.textContent = "已選圖片";
        apply();
        renderLivePreview();
      });

      zoom.addEventListener("input", () => { photoState.scale = parseFloat(zoom.value) || 1; apply(); renderLivePreview(); });
      left.addEventListener("click", () => { photoState.rotation -= 90; apply(); renderLivePreview(); });
      right.addEventListener("click", () => { photoState.rotation += 90; apply(); renderLivePreview(); });
      moveLeft.addEventListener("click", () => { photoState.offsetX -= 12; apply(); renderLivePreview(); });
      moveRight.addEventListener("click", () => { photoState.offsetX += 12; apply(); renderLivePreview(); });
      reset.addEventListener("click", () => { photoState.rotation = 0; photoState.scale = 1; photoState.offsetX = 0; zoom.value = "1"; apply(); renderLivePreview(); });

      els.photo_slots.appendChild(frag);
    }
  }

  function renderCtas() {
    const prev = [...els.cta_slots.querySelectorAll(".cta-slot-card")].map(card => ({
      label: card.querySelector(".cta-label-input")?.value || "",
      url: card.querySelector(".cta-url-input")?.value || ""
    }));
    els.cta_slots.innerHTML = "";
    if (!state.plan) return;
    for (let i = 1; i <= state.ctaLimit; i++) {
      const frag = els.cta_slot_template.content.cloneNode(true);
      const title = frag.querySelector(".cta-title-label");
      const label = frag.querySelector(".cta-label-input");
      const url = frag.querySelector(".cta-url-input");
      title.textContent = `CTA ${i} 文字`;
      label.name = `cta${i}_label`;
      url.name = `cta${i}_url`;
      label.value = prev[i-1]?.label || "";
      url.value = prev[i-1]?.url || "";
      label.addEventListener("input", renderLivePreview);
      url.addEventListener("input", renderLivePreview);
      els.cta_slots.appendChild(frag);
    }
  }

  function buildAddonItems() {
    const items = [];
    if (state.addons.has("addon_bundle")) items.push({ item_code:"addon_bundle", name:"跑馬燈＋更新組合", amount:500 });
    else {
      if (state.addons.has("addon_marquee")) items.push({ item_code:"addon_marquee", name:"跑馬燈功能", amount:300 });
      if (state.addons.has("addon_update_unlimited")) items.push({ item_code:"addon_update_unlimited", name:"無限更新", amount:300 });
    }
    if (state.photoQty) items.push({ item_code:"addon_photo", name:"照片加購", qty:state.photoQty, unit_price:100, amount:state.photoQty*100 });
    if (state.ctaQty) items.push({ item_code:"addon_cta", name:"CTA 加購", qty:state.ctaQty, unit_price:100, amount:state.ctaQty*100 });
    if (state.addons.has("addon_agent_upgrade")) items.push({ item_code:"addon_agent_upgrade", name:"金牌級會員", amount:10000 });
    return items;
  }

  function collectCtas() {
    return [...els.cta_slots.querySelectorAll(".cta-slot-card")].map(card => ({
      label: card.querySelector(".cta-label-input")?.value?.trim() || "",
      url: card.querySelector(".cta-url-input")?.value?.trim() || ""
    })).filter(v => v.label || v.url);
  }

  function collectMarquee() {
    return [els.marquee_1.value.trim(), els.marquee_2.value.trim(), els.marquee_3.value.trim()].filter(Boolean);
  }

  function buildPhotoMeta() {
    const meta = {};
    Object.keys(state.photoStates).forEach(key => {
      const p = state.photoStates[key];
      if (!p) return;
      meta[key] = {
        rotation: p.rotation || 0,
        scale: p.scale || 1,
        offsetX: p.offsetX || 0,
        hasFile: !!p.file
      };
    });
    return meta;
  }

  function buildPreviewMeta() {
    return {
      plan: state.plan || "",
      previewTheme: state.plan === "premium" ? "premium" : "free",
      ctaCount: state.ctaLimit,
      photoCount: state.photoLimit,
      marqueeEnabled: (state.addons.has("addon_marquee") || state.addons.has("addon_bundle")),
      photoMeta: buildPhotoMeta()
    };
  }

  function buildFeaturesJson() {
    return {
      preview_meta: buildPreviewMeta(),
      photo_meta: buildPhotoMeta(),
      live_preview_saved_at: new Date().toISOString()
    };
  }

  function renderLivePreview() {
    els.preview_name.textContent = els.display_name.value.trim() || "請先填寫姓名";
    els.preview_unit.textContent = els.unit.value.trim() || "單位 / 公司";
    els.preview_title.textContent = els.title.value.trim() || "職稱 / 副標";
    const contact = [els.phone.value.trim(), els.email.value.trim(), els.address.value.trim()].filter(Boolean).join("｜");
    els.preview_contact.textContent = contact || "電話 / Email / 地址";
    const services = [els.services.value.trim(), els.experience.value.trim(), els.website.value.trim()].filter(Boolean).join("｜");
    els.preview_services.textContent = services || "服務項目 / 經歷 / 網站";
    const marquee = collectMarquee();
    els.preview_marquee.textContent = marquee.join("｜");
    els.preview_marquee.classList.toggle("hidden", marquee.length === 0);
    const ctas = collectCtas();
    els.preview_ctas.innerHTML = ctas.length ? ctas.map(c => `<div class="preview-cta">${escapeHtml(c.label || c.url || "連結")}</div>`).join("") : '<div class="preview-cta">CTA 預覽區</div>';

    const firstPhoto = state.photoStates["photo1"];
    if (firstPhoto && firstPhoto.url) {
      els.preview_avatar_img.src = firstPhoto.url;
      els.preview_avatar_img.style.transform = `translateX(${firstPhoto.offsetX}px) scale(${firstPhoto.scale}) rotate(${firstPhoto.rotation}deg)`;
      els.preview_avatar_img.classList.remove("hidden");
      els.preview_avatar_empty.classList.add("hidden");
    } else {
      els.preview_avatar_img.classList.add("hidden");
      els.preview_avatar_empty.classList.remove("hidden");
    }

    const photoKeys = Object.keys(state.photoStates).filter(k => state.photoStates[k]?.url).slice(0, 6);
    els.preview_photos.innerHTML = photoKeys.length
      ? photoKeys.map(k => {
          const p = state.photoStates[k];
          return `<div class="preview-photo"><img src="${p.url}" style="transform:translateX(${p.offsetX}px) scale(${p.scale}) rotate(${p.rotation}deg)"></div>`;
        }).join("")
      : '<div class="preview-photo"><div class="preview-photo-empty">照片預覽區</div></div>';
  }

  function buildNote() {
    const lines = [];
    if (els.intro.value.trim()) lines.push("簡介：" + els.intro.value.trim());
    if (els.services.value.trim()) lines.push("服務項目：" + els.services.value.trim());
    if (els.experience.value.trim()) lines.push("經歷：" + els.experience.value.trim());
    const addons = buildAddonItems();
    if (addons.length) {
      lines.push("加購：");
      addons.forEach(item => lines.push(`- ${item.name}｜${money(item.amount)}`));
    }
    const ctas = collectCtas();
    if (ctas.length) {
      lines.push("CTA：");
      ctas.forEach((item, i) => lines.push(`- CTA ${i+1}｜${item.label}｜${item.url}`));
    }
    const marquee = collectMarquee();
    if (marquee.length) {
      lines.push("跑馬燈：");
      marquee.forEach((item, i) => lines.push(`- 第 ${i+1} 則：${item}`));
    }
    return lines.join("\n");
  }

  async function submitForm(e) {
    e.preventDefault();
    if (state.submitting) return;
    if (!state.plan) return setStatus("請先選擇方案。", "error");
    if (!els.display_name.value.trim()) return setStatus("請填寫姓名／品牌名稱。", "error");
    if (!els.phone.value.trim()) return setStatus("請填寫電話。", "error");

    state.submitting = true;
    els.btn_submit_form.disabled = true;
    els.btn_submit_form.textContent = "送出中…";
    showProgress();

    try {
      updateProgress(1, "正在整理表單資料與預覽設定…");
      const payload = {
        action: "createCardWithOfflinePayment",
        plan: state.plan,
        plan_code: state.plan === "premium" ? "plan_premium" : "plan_free",
        name: els.display_name.value.trim(),
        unit: els.unit.value.trim(),
        title: els.title.value.trim(),
        phone: els.phone.value.trim(),
        email: els.email.value.trim(),
        website: els.website.value.trim(),
        line_url: els.line_url.value.trim(),
        line_oa: els.line_oa.value.trim(),
        wechat_id: els.wechat_id.value.trim(),
        address: els.address.value.trim(),
        services: els.services.value.trim(),
        experience: els.experience.value.trim(),
        color: state.plan === "free" ? els.free_color.value : els.premium_color.value,
        style: state.plan === "free" ? els.free_style.value : "",
        paper: state.plan === "free" ? els.free_paper.value : "",
        invite_code: els.invite_code.value.trim(),
        ref: els.ref.value.trim(),
        source: "form",
        form_source: "web_form",
        note: buildNote(),
        addon_items: buildAddonItems(),
        ctas: collectCtas(),
        marquee: collectMarquee(),
        amount: state.totalAmount,
        features_json: JSON.stringify(buildFeaturesJson()),
        preview_meta: buildPreviewMeta(),
        photo_meta: buildPhotoMeta(),
        is_test: "FALSE"
      };

      updateProgress(2, "正在送出至系統，建立 lead…");
      const res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      updateProgress(3, "系統正在建立 card 並寫入設定…");
      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("GAS 回傳不是有效 JSON");
      }
      if (!data.ok) throw new Error(data.error || "送出失敗");

      updateProgress(4, "系統正在建立付款單…");
      const cardId = data.card?.id || data.card_id || "";
      const previewUrl = cardId ? `${CONFIG.HUB_URL}card.html?id=${encodeURIComponent(cardId)}` : "";
      const paymentNotice = typeof data.payment_notice === "string"
        ? data.payment_notice
        : (data.payment_notice?.message || data.payment_notice?.notice || "請於 3 天內完成付款");

      localStorage.setItem(CONFIG.RESULT_KEY, JSON.stringify({
        card_id: cardId,
        lead_id: data.lead_id || "",
        customer_name: payload.name,
        submitted_at: new Date().toISOString(),
        plan_name: state.plan === "premium" ? "精品設計" : "自由搭配",
        plan_amount: state.planAmount,
        addon_amount: state.addonAmount,
        total_amount: state.totalAmount,
        addon_items: buildAddonItems(),
        preview_url: previewUrl,
        payment_notice: paymentNotice,
        payment: data.payment || {},
        card: data.card || {},
        preview_meta: buildPreviewMeta(),
        photo_meta: buildPhotoMeta(),
        features_json: buildFeaturesJson()
      }));
      localStorage.removeItem(CONFIG.DRAFT_KEY);

      updateProgress(5, "即將導向報價與預覽頁…");
      setTimeout(() => { window.location.href = "./quote-success.html"; }, 450);
    } catch (err) {
      hideProgress();
      setStatus("送出失敗：" + (err?.message || "未知錯誤"), "error");
      state.submitting = false;
      els.btn_submit_form.disabled = false;
      els.btn_submit_form.textContent = "送出申請";
    }
  }

  function saveDraft(silent) {
    const draft = {
      plan: state.plan,
      addons: [...state.addons],
      addon_photo_qty: els.addon_photo_qty.value,
      addon_cta_qty: els.addon_cta_qty.value,
      display_name: els.display_name.value,
      unit: els.unit.value,
      title: els.title.value,
      phone: els.phone.value,
      email: els.email.value,
      website: els.website.value,
      line_url: els.line_url.value,
      line_oa: els.line_oa.value,
      wechat_id: els.wechat_id.value,
      address: els.address.value,
      services: els.services.value,
      experience: els.experience.value,
      intro: els.intro.value,
      free_color: els.free_color.value,
      free_style: els.free_style.value,
      free_paper: els.free_paper.value,
      premium_color: els.premium_color.value,
      marquee_1: els.marquee_1.value,
      marquee_2: els.marquee_2.value,
      marquee_3: els.marquee_3.value,
      invite_code: els.invite_code.value,
      ref: els.ref.value,
      photo_meta: buildPhotoMeta()
    };
    localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(draft));
    if (!silent) setStatus("已暫存目前表單內容。");
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(CONFIG.DRAFT_KEY) || "{}");
      if (!draft || typeof draft !== "object") return;
      if (draft.plan) els.planRadios.forEach(r => r.checked = r.value === draft.plan);
      if (Array.isArray(draft.addons)) els.addonBoxes.forEach(b => b.checked = draft.addons.includes(b.value));
      Object.entries(draft).forEach(([k,v]) => {
        const el = document.getElementById(k);
        if (el && k !== "plan" && k !== "addons" && k !== "photo_meta") el.value = v;
      });
      if (draft.photo_meta && typeof draft.photo_meta === "object") {
        Object.keys(draft.photo_meta).forEach(key => {
          state.photoStates[key] = Object.assign({ file:null, url:"" }, draft.photo_meta[key]);
        });
      }
    } catch {}
  }

  function showProgress() {
    els.submit_progress_overlay.classList.remove("hidden");
    updateProgress(1, "正在整理表單資料與預覽設定…");
  }

  function hideProgress() {
    els.submit_progress_overlay.classList.add("hidden");
  }

  function updateProgress(step, text) {
    const pct = Math.min(100, Math.max(0, step * 20));
    els.progress_fill.style.width = pct + "%";
    els.progress_text.textContent = text;
    els.progressSteps.forEach(node => {
      const n = Number(node.dataset.step || "0");
      node.classList.toggle("is-active", n === step);
      node.classList.toggle("is-done", n < step);
    });
  }

  function setStatus(msg, type="ok") {
    els.form_status_strip.textContent = msg;
    els.form_status_strip.dataset.state = type;
  }

  function openService(message) {
    const url = message ? CONFIG.CUSTOMER_SERVICE_URL + "?text=" + encodeURIComponent(message) : CONFIG.CUSTOMER_SERVICE_URL;
    window.open(url, "_blank", "noopener");
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function clampInt(v, min, max) {
    const n = parseInt(v, 10);
    return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  }

  function money(v) {
    return "NT$ " + Number(v || 0).toLocaleString("zh-TW");
  }

  function escapeHtml(str) {
    return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }
})();
