/* =========================================
 * 天使幸福智慧名片系統
 * form.js v711.4
 * COMPLETE OVERWRITE
 * -----------------------------------------
 * 本版修正：
 * 1. 送出成功後不再顯示預覽按鈕
 * 2. 成功文案固定為指定三行
 * 3. 成功區只保留：複製 ID / 回覆客服
 * 4. 送出中不自動捲到頁面最上方
 * 5. renderLivePreview_() 全面防呆
 * ========================================= */

(() => {
  "use strict";

  const VERSION = "711.4";

  /* -----------------------------------------
   * 基本設定
   * ----------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const noop = () => {};

  const state = {
    isSubmitting: false,
    submitResult: null,
    copiedId: "",
    lastPreviewUrlMap: Object.create(null)
  };

  const els = {
    form: null,
    submitBtn: null,
    progressWrap: null,
    progressBar: null,
    progressText: null,
    successBox: null,
    successTitle: null,
    successBody: null,
    successActions: null,
    bottomAnchor: null,
    livePreviewRoot: null,
    replyServiceBtn: null
  };

  document.addEventListener("DOMContentLoaded", init_);

  function init_() {
    cacheEls_();
    bindGlobalEvents_();
    initLivePreview_();
    initImageInputs_();
    initTextareasAutoGrow_();
    initReadonlyVersionBadge_();
    hideSuccessBox_();
    updateProgressText_("請填寫資料");
  }

  function cacheEls_() {
    els.form = $("#smartCardForm") || $("form");
    els.submitBtn =
      $("#submitBtn") ||
      $('[data-role="submit"]') ||
      $('button[type="submit"]');

    els.progressWrap =
      $("#submitProgressWrap") ||
      $(".submit-progress-wrap") ||
      $('[data-role="submit-progress-wrap"]');

    els.progressBar =
      $("#submitProgressBar") ||
      $(".submit-progress-bar > span") ||
      $('[data-role="submit-progress-bar"]');

    els.progressText =
      $("#submitProgressText") ||
      $(".submit-progress-text") ||
      $('[data-role="submit-progress-text"]');

    els.successBox =
      $("#submitSuccessBox") ||
      $(".submit-success-box") ||
      $('[data-role="submit-success"]');

    els.successTitle =
      $("#submitSuccessTitle") ||
      $(".submit-success-title") ||
      $('[data-role="submit-success-title"]');

    els.successBody =
      $("#submitSuccessBody") ||
      $(".submit-success-body") ||
      $('[data-role="submit-success-body"]');

    els.successActions =
      $("#submitSuccessActions") ||
      $(".submit-success-actions") ||
      $('[data-role="submit-success-actions"]');

    els.bottomAnchor =
      $("#formBottomAnchor") ||
      $('[data-role="form-bottom-anchor"]') ||
      $("#customerServiceZone") ||
      $(".customer-service-zone") ||
      document.body;

    els.livePreviewRoot =
      $("#livePreview") ||
      $(".live-preview") ||
      $('[data-role="live-preview"]');

    els.replyServiceBtn =
      $("#replyServiceBtn") ||
      $('[data-role="reply-service"]');
  }

  function bindGlobalEvents_() {
    if (!els.form) return;

    els.form.addEventListener("submit", onSubmit_);

    els.form.addEventListener("input", () => {
      renderLivePreview_();
    });

    els.form.addEventListener("change", (e) => {
      const target = e.target;
      if (!target) return;

      if (target.matches('input[type="file"]')) {
        handleFilePreview_(target);
      }
      renderLivePreview_();
    });
  }

  /* -----------------------------------------
   * 初始化：版本註記
   * ----------------------------------------- */
  function initReadonlyVersionBadge_() {
    const badge =
      $("#formVersionBadge") ||
      $('[data-role="form-version"]');

    if (badge) {
      badge.textContent = `form.js v${VERSION}`;
    }
  }

  /* -----------------------------------------
   * 進度列
   * ----------------------------------------- */
  function setProgress_(percent) {
    const n = Math.max(0, Math.min(100, Number(percent) || 0));
    if (els.progressBar) {
      els.progressBar.style.width = `${n}%`;
      els.progressBar.setAttribute("aria-valuenow", String(n));
    }
  }

  function updateProgressText_(text) {
    if (els.progressText) els.progressText.textContent = text || "";
  }

  function setSubmittingUi_(flag) {
    state.isSubmitting = !!flag;

    if (els.submitBtn) {
      els.submitBtn.disabled = !!flag;
      els.submitBtn.dataset.loading = flag ? "1" : "0";
      if (flag) {
        els.submitBtn.dataset.originText =
          els.submitBtn.dataset.originText || els.submitBtn.textContent || "送出";
        els.submitBtn.textContent = "送出中...";
      } else if (els.submitBtn.dataset.originText) {
        els.submitBtn.textContent = els.submitBtn.dataset.originText;
      }
    }

    if (flag) {
      setProgress_(66);
      updateProgressText_("資料送出中，請稍候…");
    } else {
      setProgress_(100);
      updateProgressText_("送出完成");
    }
  }

  /* -----------------------------------------
   * 成功訊息區
   * ----------------------------------------- */
  function hideSuccessBox_() {
    if (!els.successBox) return;
    els.successBox.hidden = true;
    els.successBox.style.display = "none";
  }

  function showSuccessBox_(cardId) {
    if (!els.successBox) return;

    els.successBox.hidden = false;
    els.successBox.style.display = "";

    if (els.successTitle) {
      els.successTitle.textContent = "送出成功";
    }

    if (els.successBody) {
      els.successBody.innerHTML = [
        "資料送出後，請複製 ID",
        "點進下方按鈕，回覆客服",
        "確認資料並製作您的名片"
      ]
        .map(line => `<div>${escapeHtml_(line)}</div>`)
        .join("");
    }

    if (els.successActions) {
      els.successActions.innerHTML = "";
      els.successActions.appendChild(createCopyIdButton_(cardId));
      els.successActions.appendChild(createReplyServiceButton_());
    }
  }

  function createCopyIdButton_(cardId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary";
    btn.textContent = "複製 ID";
    btn.addEventListener("click", async () => {
      const ok = await copyText_(cardId || "");
      btn.textContent = ok ? "已複製 ID" : "複製失敗，請手動複製";
      setTimeout(() => {
        btn.textContent = "複製 ID";
      }, 1600);
    });
    return btn;
  }

  function createReplyServiceButton_() {
    const proto =
      els.replyServiceBtn ||
      $('[data-role="reply-service-template"]') ||
      $("#replyServiceTemplateBtn");

    if (proto) {
      const btn = proto.cloneNode(true);
      btn.hidden = false;
      btn.style.display = "";
      btn.removeAttribute("id");
      btn.removeAttribute("data-role");
      btn.classList.add("btn");
      btn.classList.add("btn-secondary");
      btn.textContent = "回覆客服";

      btn.addEventListener("click", (e) => {
        const href =
          proto.getAttribute("href") ||
          proto.dataset.href ||
          proto.dataset.link ||
          proto.value ||
          "";
        if (href) {
          window.open(href, "_blank", "noopener");
          return;
        }

        const form = els.form;
        const lineUrl =
          getFieldValue_("line_oa", form) ||
          getFieldValue_("line_url", form) ||
          getFieldValue_("service_url", form) ||
          btn.getAttribute("href") ||
          "";
        if (lineUrl) {
          window.open(lineUrl, "_blank", "noopener");
        }
      });

      return btn;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary";
    btn.textContent = "回覆客服";
    btn.addEventListener("click", () => {
      const form = els.form;
      const lineUrl =
        getFieldValue_("line_oa", form) ||
        getFieldValue_("line_url", form) ||
        getFieldValue_("service_url", form) ||
        "";
      if (lineUrl) {
        window.open(lineUrl, "_blank", "noopener");
      }
    });
    return btn;
  }

  /* -----------------------------------------
   * 送出流程
   * ----------------------------------------- */
  async function onSubmit_(e) {
    e.preventDefault();
    e.stopPropagation();

    if (state.isSubmitting || !els.form) return;

    hideSuccessBox_();

    const fd = collectFormData_(els.form);

    try {
      setSubmittingUi_(true);

      // 不捲回最上方，維持目前所在區塊
      preserveScrollPositionDuringSubmit_();

      const endpoint = resolveSubmitEndpoint_();
      if (!endpoint) {
        throw new Error("找不到送出 API");
      }

      const payload = buildPayload_(fd);

      const result = await postForm_(endpoint, payload);

      const cardId =
        result?.id ||
        result?.item?.id ||
        result?.data?.id ||
        result?.cardId ||
        "";

      if (!result || result.ok === false) {
        throw new Error(result?.message || result?.error || "送出失敗");
      }

      state.submitResult = result;
      state.copiedId = cardId;

      setSubmittingUi_(false);
      showSuccessBox_(cardId);

      // 成功後維持在底部客服區附近，不自動跳頂
      keepViewNearBottomArea_();

    } catch (err) {
      console.error("[form.js] submit error:", err);
      setSubmittingUi_(false);
      showSubmitError_(err?.message || "送出失敗，請稍後再試");
      keepViewNearBottomArea_();
    }
  }

  function preserveScrollPositionDuringSubmit_() {
    const x = window.scrollX || 0;
    const y = window.scrollY || 0;
    requestAnimationFrame(() => {
      window.scrollTo(x, y);
    });
  }

  function keepViewNearBottomArea_() {
    const anchor = els.bottomAnchor;
    if (!anchor || anchor === document.body) return;

    // 不滑到最上面，只做輕量定位到底部區域
    requestAnimationFrame(() => {
      const rect = anchor.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const offset = 24;
      window.scrollTo({
        top: Math.max(0, absoluteTop - offset),
        behavior: "smooth"
      });
    });
  }

  function showSubmitError_(message) {
    if (!els.successBox) {
      alert(message);
      return;
    }

    els.successBox.hidden = false;
    els.successBox.style.display = "";

    if (els.successTitle) {
      els.successTitle.textContent = "送出失敗";
    }

    if (els.successBody) {
      els.successBody.innerHTML = `<div>${escapeHtml_(message)}</div>`;
    }

    if (els.successActions) {
      els.successActions.innerHTML = "";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary";
      btn.textContent = "回覆客服";
      btn.addEventListener("click", () => {
        const form = els.form;
        const lineUrl =
          getFieldValue_("line_oa", form) ||
          getFieldValue_("line_url", form) ||
          getFieldValue_("service_url", form) ||
          "";
        if (lineUrl) {
          window.open(lineUrl, "_blank", "noopener");
        }
      });
      els.successActions.appendChild(btn);
    }
  }

  /* -----------------------------------------
   * API / Payload
   * ----------------------------------------- */
  function resolveSubmitEndpoint_() {
    const form = els.form;
    return (
      form?.dataset?.api ||
      form?.getAttribute("action") ||
      window.FORM_API_URL ||
      window.API_URL ||
      window.__FORM_API__ ||
      ""
    );
  }

  function collectFormData_(form) {
    const fd = new FormData(form);
    return fd;
  }

  function buildPayload_(fd) {
    const obj = {};

    for (const [key, value] of fd.entries()) {
      if (value instanceof File) {
        if (!value || !value.name) continue;
        obj[key] = value;
      } else {
        obj[key] = typeof value === "string" ? value.trim() : value;
      }
    }

    obj.form_version = VERSION;
    return obj;
  }

  async function postForm_(endpoint, payload) {
    const hasFile = Object.values(payload).some(v => v instanceof File);

    if (hasFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v == null) return;
        fd.append(k, v);
      });

      const res = await fetch(endpoint, {
        method: "POST",
        body: fd,
        credentials: "omit"
      });

      return parseResponse_(res);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      credentials: "omit"
    });

    return parseResponse_(res);
  }

  async function parseResponse_(res) {
    const text = await res.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch (err) {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return { ok: true, raw: text };
    }

    if (!res.ok) {
      throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
    }

    return json;
  }

  /* -----------------------------------------
   * Live Preview
   * ----------------------------------------- */
  function initLivePreview_() {
    renderLivePreview_();
  }

  function renderLivePreview_() {
    const root = els.livePreviewRoot;
    if (!root) return;

    try {
      const form = els.form;
      if (!form) return;

      // 任何節點缺失都不能整段報錯
      safeSetText_(
        root,
        [
          '[data-preview="name"]',
          ".preview-name",
          "#previewName"
        ],
        getFieldValue_("name", form) || "您的姓名"
      );

      safeSetText_(
        root,
        [
          '[data-preview="unit"]',
          ".preview-unit",
          "#previewUnit"
        ],
        getFieldValue_("unit", form) || "您的單位 / 品牌"
      );

      safeSetText_(
        root,
        [
          '[data-preview="title"]',
          ".preview-title",
          "#previewTitle"
        ],
        getFieldValue_("title", form) || "您的身份 / 職稱"
      );

      safeSetText_(
        root,
        [
          '[data-preview="slogan"]',
          ".preview-slogan",
          "#previewSlogan"
        ],
        getFieldValue_("slogan", form) || "一句讓人記得住的定位文案"
      );

      safeSetMultiline_(
        root,
        [
          '[data-preview="services"]',
          ".preview-services",
          "#previewServices"
        ],
        getFieldValue_("services", form) || "服務項目"
      );

      safeSetMultiline_(
        root,
        [
          '[data-preview="experience"]',
          ".preview-experience",
          "#previewExperience"
        ],
        getFieldValue_("experience", form) || "品牌介紹 / 經歷"
      );

      safeSetLink_(
        root,
        [
          '[data-preview-link="website"]',
          ".preview-website",
          "#previewWebsite"
        ],
        getFieldValue_("website", form)
      );

      safeSetLink_(
        root,
        [
          '[data-preview-link="line"]',
          ".preview-line",
          "#previewLine"
        ],
        getFieldValue_("line_url", form) || getFieldValue_("line_oa", form)
      );

      safeSetLink_(
        root,
        [
          '[data-preview-link="email"]',
          ".preview-email",
          "#previewEmail"
        ],
        normalizeEmailLink_(getFieldValue_("email", form))
      );

      safeSetLink_(
        root,
        [
          '[data-preview-link="phone"]',
          ".preview-phone",
          "#previewPhone"
        ],
        normalizeTelLink_(getFieldValue_("phone", form))
      );

      safeSetText_(
        root,
        [
          '[data-preview="address"]',
          ".preview-address",
          "#previewAddress"
        ],
        getFieldValue_("address", form) || ""
      );

      safeSetImage_(
        root,
        [
          '[data-preview-img="avatar"]',
          ".preview-avatar img",
          "#previewAvatar"
        ],
        resolvePreviewFileUrl_("avatar_img") ||
          getFieldValue_("avatar_url", form) ||
          ""
      );

      safeSetImage_(
        root,
        [
          '[data-preview-img="logo"]',
          ".preview-logo img",
          "#previewLogo"
        ],
        resolvePreviewFileUrl_("logo_img") ||
          getFieldValue_("logo_url", form) ||
          ""
      );

      for (let i = 1; i <= 5; i++) {
        safeSetImage_(
          root,
          [
            `[data-preview-img="photo${i}"]`,
            `.preview-photo${i} img`,
            `#previewPhoto${i}`
          ],
          resolvePreviewFileUrl_(`photo${i}_img`) ||
            getFieldValue_(`photo${i}_url`, form) ||
            ""
        );
      }
    } catch (err) {
      console.error("[form.js] renderLivePreview_ error:", err);
      // 這裡只記錄，不讓頁面功能中斷
    }
  }

  function safeSetText_(root, selectors, value) {
    const el = findFirst_(root, selectors);
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  function safeSetMultiline_(root, selectors, value) {
    const el = findFirst_(root, selectors);
    if (!el) return;
    const text = value == null ? "" : String(value);
    el.innerHTML = escapeHtml_(text).replace(/\n/g, "<br>");
  }

  function safeSetLink_(root, selectors, href) {
    const el = findFirst_(root, selectors);
    if (!el) return;

    const url = (href || "").trim();

    if (!url) {
      if ("href" in el) el.removeAttribute("href");
      el.textContent = "";
      el.style.display = "none";
      return;
    }

    el.style.display = "";
    if ("href" in el) {
      el.setAttribute("href", url);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
    if (!el.textContent.trim()) {
      el.textContent = url.replace(/^mailto:/, "").replace(/^tel:/, "");
    }
  }

  function safeSetImage_(root, selectors, src) {
    const el = findFirst_(root, selectors);
    if (!el) return;

    const url = (src || "").trim();
    if (!url) {
      el.removeAttribute("src");
      el.style.visibility = "hidden";
      return;
    }

    el.style.visibility = "";
    el.src = url;
  }

  function findFirst_(root, selectors) {
    if (!root) return null;
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  /* -----------------------------------------
   * 圖片預覽
   * ----------------------------------------- */
  function initImageInputs_() {
    if (!els.form) return;
    $$('input[type="file"]', els.form).forEach(input => {
      handleFilePreview_(input);
    });
  }

  function handleFilePreview_(input) {
    if (!input || !input.name) return;

    const file = input.files && input.files[0];
    if (!file) return;

    try {
      const oldUrl = state.lastPreviewUrlMap[input.name];
      if (oldUrl) URL.revokeObjectURL(oldUrl);
    } catch (_) {}

    const nextUrl = URL.createObjectURL(file);
    state.lastPreviewUrlMap[input.name] = nextUrl;

    renderLivePreview_();
  }

  function resolvePreviewFileUrl_(fieldName) {
    return state.lastPreviewUrlMap[fieldName] || "";
  }

  /* -----------------------------------------
   * Textarea 自動增高
   * ----------------------------------------- */
  function initTextareasAutoGrow_() {
    if (!els.form) return;

    $$("textarea", els.form).forEach((ta) => {
      autoGrowTextarea_(ta);
      ta.addEventListener("input", () => autoGrowTextarea_(ta));
    });
  }

  function autoGrowTextarea_(ta) {
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  /* -----------------------------------------
   * 欄位取值
   * ----------------------------------------- */
  function getFieldValue_(name, root = document) {
    if (!name || !root) return "";

    const field =
      root.querySelector(`[name="${cssEscape_(name)}"]`) ||
      root.querySelector(`#${cssEscape_(name)}`);

    if (!field) return "";

    if (field.type === "checkbox") {
      return field.checked ? (field.value || "1") : "";
    }

    if (field.type === "radio") {
      const checked = root.querySelector(`[name="${cssEscape_(name)}"]:checked`);
      return checked ? checked.value || "" : "";
    }

    return (field.value || "").trim();
  }

  /* -----------------------------------------
   * 複製
   * ----------------------------------------- */
  async function copyText_(text) {
    const val = String(text || "").trim();
    if (!val) return false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(val);
        return true;
      }
    } catch (_) {}

    try {
      const ta = document.createElement("textarea");
      ta.value = val;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (_) {
      return false;
    }
  }

  /* -----------------------------------------
   * 工具
   * ----------------------------------------- */
  function normalizeEmailLink_(email) {
    const val = (email || "").trim();
    if (!val) return "";
    return /^mailto:/i.test(val) ? val : `mailto:${val}`;
  }

  function normalizeTelLink_(phone) {
    const val = (phone || "").trim();
    if (!val) return "";
    return /^tel:/i.test(val) ? val : `tel:${val.replace(/\s+/g, "")}`;
  }

  function escapeHtml_(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cssEscape_(s) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(s);
    }
    return String(s).replace(/["\\#.;?+*~':^$[\]()=>|/@]/g, "\\$&");
  }

  /* -----------------------------------------
   * 對外保留：方便後續串接
   * ----------------------------------------- */
  window.HSCForm = Object.assign(window.HSCForm || {}, {
    version: VERSION,
    renderLivePreview_,
    copyText: copyText_,
    getState: () => ({ ...state })
  });
})();