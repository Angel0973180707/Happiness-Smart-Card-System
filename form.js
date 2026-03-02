/* ================================
 * form.js — v495 (COMPLETE OVERWRITE)
 * A1 Stable Flow (Best for weak mobile network):
 * - Frontend only: build Google Form prefill URL -> load in iframe
 * - No direct GAS create (avoid CORS/preflight/timeout)
 * - File uploads (avatar/photos/logo) cannot be prefilled -> user uploads inside Google Form
 *
 * Rules (per user):
 * - Plan REQUIRED
 * - LINE link NOT required
 * - Free requires: color/shape/paper
 * - Premium requires: premiumColor
 *
 * Google Form entry mapping (CONFIRMED):
 * - plan                entry.2073123905
 * - color               entry.899536690
 * - shape               entry.592720036
 * - paper               entry.828167336
 * - premiumColor        entry.451721166
 * - name                entry.1846399517
 * - unit                entry.201959359
 * - title               entry.1104496974
 * - slogan              entry.1290724918
 * - services            entry.352462771
 * - experience          entry.541223865   (multiline)
 * - wechat_id           entry.945116102
 * - line_link           entry.1670617576  (optional)
 * - line_oa             entry.1578950478
 * - email               entry.761610421
 * - phone               entry.1884717686
 * - address             entry.484337571
 * - video1              entry.1314883527
 * - video2              entry.1543530124
 * - video3              entry.1080795785
 * - social1             entry.1200061658
 * - social2             entry.1872322138
 * - social3             entry.243633274
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v495",
    FORM_BASE:
      "https://docs.google.com/forms/d/e/1FAIpQLSeCKY_oLKUMgnQUaJmCUfxIBRv0JdwQO7t3KAi5tJvLMKUGSQ/viewform?usp=pp_url",
    STORAGE_KEY: "HSC_FORM_DRAFT_V495"
  };

  // ===== Frontend DOM ids (your facade inputs/selects should use these ids) =====
  // Selects:
  // - planSelect, freeColorSelect, freeShapeSelect, freePaperSelect, premiumColorSelect
  // Inputs:
  // - nameInput, unitInput, titleInput, sloganInput
  // - servicesInput, experienceInput (textarea)
  // - wechatIdInput, lineLinkInput, lineOaInput
  // - emailInput, phoneInput, addressInput
  // - video1Input, video2Input, video3Input
  // - social1Input, social2Input, social3Input

  const FIELD_MAP = [
    // Core
    { key: "plan",         entry: "entry.2073123905", dom: "planSelect" },          // required
    { key: "name",         entry: "entry.1846399517", dom: "nameInput" },           // required

    // Free appearance (required when plan=free)
    { key: "color",        entry: "entry.899536690",  dom: "freeColorSelect" },
    { key: "shape",        entry: "entry.592720036",  dom: "freeShapeSelect" },
    { key: "paper",        entry: "entry.828167336",  dom: "freePaperSelect" },

    // Premium appearance (required when plan=premium)
    { key: "premiumColor", entry: "entry.451721166",  dom: "premiumColorSelect" },

    // Profile
    { key: "unit",         entry: "entry.201959359",  dom: "unitInput" },
    { key: "title",        entry: "entry.1104496974", dom: "titleInput" },
    { key: "slogan",       entry: "entry.1290724918", dom: "sloganInput" },
    { key: "services",     entry: "entry.352462771",  dom: "servicesInput" },
    { key: "experience",   entry: "entry.541223865",  dom: "experienceInput" }, // multiline textarea

    // Contacts
    { key: "wechat_id",    entry: "entry.945116102",  dom: "wechatIdInput" },
    { key: "line_link",    entry: "entry.1670617576", dom: "lineLinkInput" },   // optional
    { key: "line_oa",      entry: "entry.1578950478", dom: "lineOaInput" },
    { key: "email",        entry: "entry.761610421",  dom: "emailInput" },
    { key: "phone",        entry: "entry.1884717686", dom: "phoneInput" },
    { key: "address",      entry: "entry.484337571",  dom: "addressInput" },

    // Video links
    { key: "video1",       entry: "entry.1314883527", dom: "video1Input" },
    { key: "video2",       entry: "entry.1543530124", dom: "video2Input" },
    { key: "video3",       entry: "entry.1080795785", dom: "video3Input" },

    // Social links
    { key: "social1",      entry: "entry.1200061658", dom: "social1Input" },
    { key: "social2",      entry: "entry.1872322138", dom: "social2Input" },
    { key: "social3",      entry: "entry.243633274",  dom: "social3Input" }
  ];

  const DOM = {
    form: "innerForm",
    iframe: "formIframe",
    panelFill: "formArea",
    panelDone: "doneArea",
    doneLink: "doneLink",
    btnReset: "btnResetDraft"
  };

  const $id = (id) => document.getElementById(id);

  function planType(planText) {
    const t = (planText || "").toLowerCase();
    if (!t) return "";
    if (t.includes("自由") || t.includes("free") || t.startsWith("1")) return "free";
    if (t.includes("精品") || t.includes("premium") || t.startsWith("2")) return "premium";
    return "";
  }

  function getVal(domId) {
    const el = $id(domId);
    if (!el) return "";
    return String(el.value || "").trim();
  }

  function setVal(domId, v) {
    const el = $id(domId);
    if (!el) return;
    el.value = v ?? "";
  }

  function collect() {
    const out = {};
    for (const f of FIELD_MAP) out[f.key] = getVal(f.dom);
    return out;
  }

  function saveDraft(vals) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        v: CONFIG.VERSION, ts: Date.now(), data: vals
      }));
    } catch (_) {}
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return null;
      const j = JSON.parse(raw);
      return j && j.data ? j.data : null;
    } catch (_) { return null; }
  }

  function clearDraft() {
    try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (_) {}
  }

  function applyDraft(vals) {
    if (!vals) return;
    for (const f of FIELD_MAP) {
      if (Object.prototype.hasOwnProperty.call(vals, f.key)) setVal(f.dom, vals[f.key]);
    }
  }

  function validate(vals) {
    if (!vals.plan) return "請先選擇名片製作方案（必填）";
    if (!vals.name) return "請填寫姓名（必填）";

    const type = planType(vals.plan);

    if (type === "free") {
      if (!vals.color) return "自由搭配款：請選擇名片顏色（必填）";
      if (!vals.shape) return "自由搭配款：請選擇版型風格（必填）";
      if (!vals.paper) return "自由搭配款：請選擇紙感質地（必填）";
    }

    if (type === "premium") {
      if (!vals.premiumColor) return "精品設計款：請選擇精品底色（必填）";
    }

    // LINE link is optional now -> no validation

    return "";
  }

  function buildPrefillUrl(vals) {
    const params = [];

    for (const f of FIELD_MAP) {
      const v = (vals[f.key] || "").trim();
      if (!v) continue;
      params.push(`${encodeURIComponent(f.entry)}=${encodeURIComponent(v)}`);
    }

    return params.length ? `${CONFIG.FORM_BASE}&${params.join("&")}` : CONFIG.FORM_BASE;
  }

  function loadIframe(url) {
    const iframe = $id(DOM.iframe);
    if (iframe) iframe.src = url;
  }

  function showDone(url) {
    const fill = $id(DOM.panelFill);
    const done = $id(DOM.panelDone);
    const link = $id(DOM.doneLink);

    if (fill) fill.style.display = "none";
    if (done) done.style.display = "";

    if (link) {
      link.href = url;
      link.target = "_blank";
      link.textContent = "打開已預填表單（可檢查/修改 + 上傳照片）";
    }
  }

  function wireAutosave() {
    const handler = () => saveDraft(collect());
    for (const f of FIELD_MAP) {
      const el = $id(f.dom);
      if (!el) continue;
      el.addEventListener("change", handler);
      el.addEventListener("input", handler);
    }
  }

  function init() {
    const draft = loadDraft();
    if (draft) applyDraft(draft);

    wireAutosave();

    const form = $id(DOM.form);
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        const vals = collect();
        saveDraft(vals);

        const err = validate(vals);
        if (err) return alert(err);

        const url = buildPrefillUrl(vals);
        loadIframe(url);
        showDone(url);
      });
    }

    const reset = $id(DOM.btnReset);
    if (reset) {
      reset.addEventListener("click", () => {
        if (!confirm("要清除草稿嗎？")) return;
        clearDraft();
        // clear UI
        for (const f of FIELD_MAP) setVal(f.dom, "");
        alert("草稿已清除");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
