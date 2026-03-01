/* ================================
 * form.js — v494-FORM (COMPLETE OVERWRITE)
 * Goals:
 * - Plan split (free/premium)
 * - Required: appearance options (by plan) + name + avatar(file)
 * - Optional: other fields
 * - Show fields by plan counts (videos/socials/photos)
 * - Image upload (file) -> canvas compress -> base64 (dataURL)
 * - Submit primary: hidden-iframe form POST (_via_iframe=1)  (highest success, avoid CORS)
 * - Fallback: fetch POST (x-www-form-urlencoded, no custom headers)
 * - Draft autosave: localStorage (save/restore/clear)
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v494-FORM",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    ACTION: "create",

    PLAN_FREE: "free",
    PLAN_PREMIUM: "premium",

    LIMITS: {
      free: { videos: 1, socials: 1, photos: 2 },
      premium: { videos: 3, socials: 3, photos: 5 }
    },

    // Required (align with your latest spec)
    REQUIRED: {
      free: ["plan", "theme_color", "banner_style", "paper_style", "name", "avatar_img"],
      premium: ["plan", "premium_color", "name", "avatar_img"]
    },

    // Image compress targets (tune for success rate)
    // avatar/logo smaller; photos slightly larger
    IMG: {
      avatar: { maxPx: 900, quality: 0.82 },
      logo: { maxPx: 700, quality: 0.82 },
      photo: { maxPx: 1400, quality: 0.82 }
    },

    // Draft
    DRAFT_KEY: "HSC_FORM_DRAFT_v494",
    DRAFT_DEBOUNCE_MS: 450,

    // Selectors (adapt to your existing HTML; if missing, code still works)
    SEL: {
      planRadios: 'input[name="plan"]',
      planFreeBtn: "#planFree",
      planPremiumBtn: "#planPremium",

      sectionFree: "[data-plan='free']",
      sectionPremium: "[data-plan='premium']",

      submitBtn: "#btnSubmit, [data-action='submit']",
      debugBox: "#debugBox, [data-ui='debug']",
      toastBox: "#toast, [data-ui='toast']",

      // Optional: wrapper to show/hide by count
      fieldWrap: "[data-field-wrap]"
    },

    // Field naming convention (recommended)
    // plan: plan
    // free appearance: theme_color (c1~c5), banner_style (s1~s3), paper_style (f1~f3)
    // premium appearance: premium_color (p1~p7)
    // text: name unit title slogan services phone email line_url website_url address
    // files:
    //   avatar_file, logo_file
    //   photo1_file..photo5_file
    // links:
    //   video1_url..video3_url
    //   social1_url..social3_url
    // hidden outputs (base64):
    //   avatar_img, logo_img, photo1_img..photo5_img
  };

  let state = {
    plan: "",
    busy: false,
    lastBackend: null
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function safeStr(v) {
    return String(v == null ? "" : v).trim();
  }
  function nowIso() {
    return new Date().toISOString();
  }

  function showToast(msg, type = "info") {
    const box = $(CONFIG.SEL.toastBox);
    if (!box) return alert(msg);
    box.textContent = msg;
    box.setAttribute("data-type", type);
    box.style.display = "block";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (box.style.display = "none"), 2600);
  }

  function showDebug(obj) {
    const box = $(CONFIG.SEL.debugBox);
    if (!box) return;
    box.style.display = "block";
    box.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  }

  function disableSubmit(disabled) {
    const btn = $(CONFIG.SEL.submitBtn);
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.setAttribute("aria-busy", disabled ? "true" : "false");
    btn.classList.toggle("is-busy", !!disabled);
  }

  // ---------- Field get/set (name | data-field | id) ----------
  function getElByKey(key) {
    let el = document.querySelector(`[name="${CSS.escape(key)}"]`);
    if (!el) el = document.querySelector(`[data-field="${CSS.escape(key)}"]`);
    if (!el) el = document.getElementById(key);
    return el;
  }

  function getFieldValue(key) {
    const el = getElByKey(key);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "1" : "";
    if (el.type === "radio") {
      const checked = document.querySelector(`[name="${CSS.escape(key)}"]:checked`);
      return checked ? safeStr(checked.value) : "";
    }
    return safeStr(el.value);
  }

  function setFieldValue(key, val) {
    const el = getElByKey(key);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!val;
    else el.value = val;
  }

  // ---------- Plan ----------
  function readPlanFromUI() {
    const checked = document.querySelector(`${CONFIG.SEL.planRadios}:checked`);
    if (checked) return safeStr(checked.value);

    if ($(CONFIG.SEL.planFreeBtn)?.classList.contains("is-active")) return CONFIG.PLAN_FREE;
    if ($(CONFIG.SEL.planPremiumBtn)?.classList.contains("is-active")) return CONFIG.PLAN_PREMIUM;

    const hidden = getFieldValue("plan");
    return safeStr(hidden);
  }

  function applyPlanUI(plan) {
    state.plan = plan;
    setFieldValue("plan", plan);

    const bFree = $(CONFIG.SEL.planFreeBtn);
    const bPre = $(CONFIG.SEL.planPremiumBtn);
    if (bFree) bFree.classList.toggle("is-active", plan === CONFIG.PLAN_FREE);
    if (bPre) bPre.classList.toggle("is-active", plan === CONFIG.PLAN_PREMIUM);

    $$(CONFIG.SEL.sectionFree).forEach((el) => (el.style.display = plan === CONFIG.PLAN_FREE ? "" : "none"));
    $$(CONFIG.SEL.sectionPremium).forEach((el) => (el.style.display = plan === CONFIG.PLAN_PREMIUM ? "" : "none"));

    enforceCounts(plan);
    showDebug({ version: CONFIG.VERSION, plan, at: nowIso() });

    // persist
    saveDraftSoon_();
  }

  // Show/hide count-based fields (video/social/photo) by wrapper
  // Wrapper rule: any field can be inside [data-field-wrap="video2_url"] etc.
  function enforceCounts(plan) {
    const lim = CONFIG.LIMITS[plan] || CONFIG.LIMITS.free;

    // videos 1..3
    for (let i = 1; i <= 3; i++) {
      const key = `video${i}_url`;
      toggleFieldWrap_(key, i <= lim.videos, true);
    }

    // socials 1..3
    for (let i = 1; i <= 3; i++) {
      const key = `social${i}_url`;
      toggleFieldWrap_(key, i <= lim.socials, true);
    }

    // photos 1..5 (file + base64 hidden)
    for (let i = 1; i <= 5; i++) {
      toggleFieldWrap_(`photo${i}_file`, i <= lim.photos, true);
      toggleFieldWrap_(`photo${i}_img`, i <= lim.photos, false);
    }
  }

  function toggleFieldWrap_(key, show, clearIfHide) {
    const el = getElByKey(key);
    const wrap =
      el?.closest?.(CONFIG.SEL.fieldWrap) ||
      document.querySelector(`${CONFIG.SEL.fieldWrap}[data-field-wrap="${CSS.escape(key)}"]`);

    if (!wrap) return;
    wrap.style.display = show ? "" : "none";
    wrap.classList.toggle("is-hidden", !show);

    if (!show && clearIfHide) {
      if (el && el.type === "file") el.value = "";
      else if (el) el.value = "";
      // clear hidden base64 as well for photos
      if (key.endsWith("_file")) {
        const imgKey = key.replace("_file", "_img");
        setFieldValue(imgKey, "");
      }
    }
  }

  // ---------- Image: file -> compressed dataURL ----------
  function readFileAsDataURL_(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(fr.error || new Error("FileReader error"));
      fr.readAsDataURL(file);
    });
  }

  function loadImage_(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load fail"));
      img.src = src;
    });
  }

  async function compressImageFileToDataUrl_(file, kind) {
    if (!file) return "";
    const rule = kind === "avatar" ? CONFIG.IMG.avatar : kind === "logo" ? CONFIG.IMG.logo : CONFIG.IMG.photo;

    // Read
    const dataUrl = await readFileAsDataURL_(file);

    // Draw to canvas
    const img = await loadImage_(dataUrl);
    const w = img.naturalWidth || img.width || 1;
    const h = img.naturalHeight || img.height || 1;

    const maxSide = Math.max(w, h);
    const scale = Math.min(1, rule.maxPx / maxSide);
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, nw, nh);

    // JPEG output
    const out = canvas.toDataURL("image/jpeg", rule.quality);

    return out;
  }

  // Bind file inputs to hidden base64 fields
  function bindFileInputs() {
    // avatar
    const avatarFileEl = getElByKey("avatar_file");
    if (avatarFileEl) {
      avatarFileEl.addEventListener("change", async () => {
        const f = avatarFileEl.files && avatarFileEl.files[0];
        if (!f) {
          setFieldValue("avatar_img", "");
          saveDraftSoon_();
          return;
        }
        try {
          showToast("個人照處理中…", "info");
          const dataUrl = await compressImageFileToDataUrl_(f, "avatar");
          setFieldValue("avatar_img", dataUrl);
          showToast("✅ 個人照已就緒", "success");
          saveDraftSoon_();
        } catch (e) {
          setFieldValue("avatar_img", "");
          showToast("❌ 個人照處理失敗", "error");
          showDebug({ ok: false, stage: "avatar_compress_fail", error: String(e) });
        }
      });
    }

    // logo
    const logoFileEl = getElByKey("logo_file");
    if (logoFileEl) {
      logoFileEl.addEventListener("change", async () => {
        const f = logoFileEl.files && logoFileEl.files[0];
        if (!f) {
          setFieldValue("logo_img", "");
          saveDraftSoon_();
          return;
        }
        try {
          showToast("Logo 處理中…", "info");
          const dataUrl = await compressImageFileToDataUrl_(f, "logo");
          setFieldValue("logo_img", dataUrl);
          showToast("✅ Logo 已就緒", "success");
          saveDraftSoon_();
        } catch (e) {
          setFieldValue("logo_img", "");
          showToast("❌ Logo 處理失敗", "error");
          showDebug({ ok: false, stage: "logo_compress_fail", error: String(e) });
        }
      });
    }

    // photos
    for (let i = 1; i <= 5; i++) {
      const fileKey = `photo${i}_file`;
      const imgKey = `photo${i}_img`;
      const el = getElByKey(fileKey);
      if (!el) continue;

      el.addEventListener("change", async () => {
        const f = el.files && el.files[0];
        if (!f) {
          setFieldValue(imgKey, "");
          saveDraftSoon_();
          return;
        }
        try {
          showToast(`照片 ${i} 處理中…`, "info");
          const dataUrl = await compressImageFileToDataUrl_(f, "photo");
          setFieldValue(imgKey, dataUrl);
          showToast(`✅ 照片 ${i} 已就緒`, "success");
          saveDraftSoon_();
        } catch (e) {
          setFieldValue(imgKey, "");
          showToast(`❌ 照片 ${i} 處理失敗`, "error");
          showDebug({ ok: false, stage: `photo${i}_compress_fail`, error: String(e) });
        }
      });
    }
  }

  // ---------- Payload ----------
  function buildPayload() {
    const plan = readPlanFromUI() || state.plan;
    if (!plan) return { ok: false, error: "尚未選擇方案" };

    const payload = {
      action: CONFIG.ACTION,
      debug: "1",
      _via_iframe: "1", // primary route (iframe)
      plan
    };

    // Appearance
    if (plan === CONFIG.PLAN_FREE) {
      payload.theme_color = getFieldValue("theme_color");   // c1~c5
      payload.banner_style = getFieldValue("banner_style"); // s1~s3
      payload.paper_style = getFieldValue("paper_style");   // f1~f3
      payload.premium_color = "";
    } else {
      payload.premium_color = getFieldValue("premium_color"); // p1~p7
      payload.theme_color = "";
      payload.banner_style = "";
      payload.paper_style = "";
    }

    // Required
    payload.name = getFieldValue("name");
    payload.avatar_img = getFieldValue("avatar_img"); // base64 dataURL (from file)

    // Optional texts
    payload.unit = getFieldValue("unit");
    payload.title = getFieldValue("title");
    payload.slogan = getFieldValue("slogan");
    payload.services = getFieldValue("services");

    // Optional contacts
    payload.phone = getFieldValue("phone");
    payload.email = getFieldValue("email");
    payload.line_url = getFieldValue("line_url") || getFieldValue("line");
    payload.website_url = getFieldValue("website_url") || getFieldValue("website");
    payload.address = getFieldValue("address");

    // Optional logo (file->base64)
    payload.logo_img = getFieldValue("logo_img");

    // Links by plan count
    const lim = CONFIG.LIMITS[plan] || CONFIG.LIMITS.free;

    for (let i = 1; i <= 3; i++) {
      payload[`video${i}_url`] = i <= lim.videos ? safeStr(getFieldValue(`video${i}_url`)) : "";
      payload[`social${i}_url`] = i <= lim.socials ? safeStr(getFieldValue(`social${i}_url`)) : "";
    }
    for (let i = 1; i <= 5; i++) {
      payload[`photo${i}_img`] = i <= lim.photos ? safeStr(getFieldValue(`photo${i}_img`)) : "";
    }

    // normalize strings
    Object.keys(payload).forEach((k) => {
      if (typeof payload[k] === "string") payload[k] = payload[k].trim();
    });

    return { ok: true, payload };
  }

  function validatePayload(payload) {
    const plan = payload.plan;
    const req = CONFIG.REQUIRED[plan] || CONFIG.REQUIRED.free;

    const missing = [];
    for (const k of req) {
      if (!safeStr(payload[k])) missing.push(k);
    }
    if (missing.length) return { ok: false, error: `必填未填：${missing.join("、")}` };

    // Ensure avatar is dataURL (because you want upload, not link)
    if (!/^data:image\//i.test(payload.avatar_img || "")) {
      return { ok: false, error: "個人照請用上傳（file），不要貼連結" };
    }

    // Photos must be dataURL if provided
    for (let i = 1; i <= 5; i++) {
      const v = safeStr(payload[`photo${i}_img`]);
      if (v && !/^data:image\//i.test(v)) {
        return { ok: false, error: `照片${i} 請用上傳（file）` };
      }
    }
    // Logo must be dataURL if provided
    if (payload.logo_img && !/^data:image\//i.test(payload.logo_img)) {
      return { ok: false, error: "Logo 請用上傳（file）" };
    }

    return { ok: true };
  }

  // ---------- Submit: iframe primary ----------
  function ensureIframeForm_() {
    // hidden iframe
    let iframe = document.getElementById("hsc_iframe");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "hsc_iframe";
      iframe.name = "hsc_iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    // hidden form
    let form = document.getElementById("hsc_hidden_form");
    if (!form) {
      form = document.createElement("form");
      form.id = "hsc_hidden_form";
      form.method = "POST";
      form.action = CONFIG.GAS;
      form.target = "hsc_iframe";
      form.style.display = "none";
      document.body.appendChild(form);
    }

    return { iframe, form };
  }

  function setHiddenFormFields_(form, payload) {
    // clear
    while (form.firstChild) form.removeChild(form.firstChild);

    Object.keys(payload).forEach((k) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = payload[k] == null ? "" : String(payload[k]);
      form.appendChild(input);
    });
  }

  function waitForPostMessage_(timeoutMs = 20000) {
    return new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        resolve({ ok: false, error: "iframe 等候逾時（可能弱網或後端超時）" });
      }, timeoutMs);

      function onMsg(ev) {
        try {
          const d = ev && ev.data;
          if (!d || d.source !== "HSC_GAS") return;
          const payload = d.payload || d;
          done = true;
          cleanup();
          resolve(payload);
        } catch (e) {
          done = true;
          cleanup();
          resolve({ ok: false, error: "postMessage parse error", debug: { e: String(e) } });
        }
      }

      function cleanup() {
        clearTimeout(t);
        window.removeEventListener("message", onMsg);
      }

      window.addEventListener("message", onMsg);
    });
  }

  // ---------- Fallback: fetch urlencoded ----------
  function toFormUrlEncoded(obj) {
    const parts = [];
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      if (v === undefined || v === null) return;
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
    });
    return parts.join("&");
  }

  async function postUrlEncodedFetch_(payload) {
    // Important: do NOT set headers => keep it "simple request" to avoid preflight
    const body = toFormUrlEncoded(payload);
    const res = await fetch(CONFIG.GAS, { method: "POST", body });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: "後端回傳非 JSON", raw: String(text || "").slice(0, 800) };
    }
  }

  async function handleSubmit() {
    if (state.busy) return;
    state.busy = true;
    disableSubmit(true);

    try {
      showDebug({ stage: "submit_start", at: nowIso(), version: CONFIG.VERSION });

      const built = buildPayload();
      if (!built.ok) {
        showToast(built.error || "資料不完整", "error");
        showDebug({ ok: false, stage: "build_fail", error: built.error });
        return;
      }

      const payload = built.payload;
      const v = validatePayload(payload);
      if (!v.ok) {
        showToast(v.error || "必填未填", "error");
        showDebug({ ok: false, stage: "validate_fail", error: v.error, payload });
        return;
      }

      // Primary: iframe submit
      showToast("送出中…（高成功模式）", "info");
      const { form } = ensureIframeForm_();
      setHiddenFormFields_(form, payload);

      const wait = waitForPostMessage_(22000);
      form.submit();

      let data = await wait;
      state.lastBackend = data;

      // If iframe failed, fallback to fetch (optional)
      if (!data || data.ok !== true) {
        showToast("改用備援送出…", "info");
        const fallbackPayload = Object.assign({}, payload);
        delete fallbackPayload._via_iframe; // not needed for fetch
        try {
          const data2 = await postUrlEncodedFetch_(fallbackPayload);
          if (data2 && data2.ok === true) data = data2;
          else data = data2 || data;
        } catch (e2) {
          data = data || { ok: false, error: "fallback fetch failed", debug: { e2: String(e2) } };
        }
      }

      showDebug({ stage: "submit_result", at: nowIso(), response: data });

      if (data && data.ok) {
        showToast("✅ 已送出成功！", "success");
        clearDraft_();
      } else {
        const msg = (data && (data.error || data.message)) ? String(data.error || data.message) : "送出失敗";
        showToast("❌ " + msg, "error");
      }
    } finally {
      state.busy = false;
      disableSubmit(false);
    }
  }

  // ---------- Draft (localStorage autosave) ----------
  function collectDraft_() {
    // Save only text/select/hidden values (not raw File objects)
    const keys = [
      "plan",
      "theme_color", "banner_style", "paper_style",
      "premium_color",
      "name", "unit", "title", "slogan", "services",
      "phone", "email", "line_url", "website_url", "address",
      "video1_url", "video2_url", "video3_url",
      "social1_url", "social2_url", "social3_url",
      "avatar_img", "logo_img",
      "photo1_img", "photo2_img", "photo3_img", "photo4_img", "photo5_img"
    ];

    const draft = { _v: CONFIG.VERSION, _ts: Date.now() };
    keys.forEach((k) => (draft[k] = getFieldValue(k)));
    return draft;
  }

  function applyDraft_(draft) {
    if (!draft || typeof draft !== "object") return;
    // Plan first (so UI shows proper sections)
    const plan = safeStr(draft.plan);
    if (plan === CONFIG.PLAN_FREE || plan === CONFIG.PLAN_PREMIUM) applyPlanUI(plan);

    Object.keys(draft).forEach((k) => {
      if (k.startsWith("_")) return;
      setFieldValue(k, draft[k]);
    });

    enforceCounts(readPlanFromUI() || state.plan || CONFIG.PLAN_FREE);
  }

  function saveDraft_() {
    try {
      const draft = collectDraft_();
      localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      // ignore
    }
  }

  function loadDraft_() {
    try {
      const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && typeof d === "object" ? d : null;
    } catch {
      return null;
    }
  }

  function clearDraft_() {
    try {
      localStorage.removeItem(CONFIG.DRAFT_KEY);
    } catch {}
  }

  function saveDraftSoon_() {
    clearTimeout(saveDraftSoon_._t);
    saveDraftSoon_._t = setTimeout(saveDraft_, CONFIG.DRAFT_DEBOUNCE_MS);
  }

  function bindDraftAutosave() {
    // Any input change triggers autosave
    document.addEventListener("input", (e) => {
      const t = e && e.target;
      if (!t) return;
      // Avoid saving while busy
      if (state.busy) return;
      saveDraftSoon_();
    });

    document.addEventListener("change", (e) => {
      const t = e && e.target;
      if (!t) return;
      if (state.busy) return;
      saveDraftSoon_();
    });
  }

  // ---------- Bindings ----------
  function bindPlanControls() {
    $$(CONFIG.SEL.planRadios).forEach((r) => {
      r.addEventListener("change", () => applyPlanUI(readPlanFromUI()));
    });

    const bFree = $(CONFIG.SEL.planFreeBtn);
    const bPre = $(CONFIG.SEL.planPremiumBtn);
    if (bFree) bFree.addEventListener("click", () => applyPlanUI(CONFIG.PLAN_FREE));
    if (bPre) bPre.addEventListener("click", () => applyPlanUI(CONFIG.PLAN_PREMIUM));
  }

  function bindSubmit() {
    const btn = $(CONFIG.SEL.submitBtn);
    if (btn) btn.addEventListener("click", (e) => (e.preventDefault(), handleSubmit()));

    const form = btn ? btn.closest("form") : document.querySelector("form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSubmit();
      });
    }
  }

  function boot() {
    // restore draft first
    const draft = loadDraft_();
    if (draft) {
      applyDraft_(draft);
      showToast("已恢復上次未送出的草稿", "info");
    }

    // init plan display
    const plan = readPlanFromUI();
    if (plan === CONFIG.PLAN_FREE || plan === CONFIG.PLAN_PREMIUM) {
      applyPlanUI(plan);
    } else {
      $$(CONFIG.SEL.sectionFree).forEach((el) => (el.style.display = "none"));
      $$(CONFIG.SEL.sectionPremium).forEach((el) => (el.style.display = "none"));
      showDebug({ version: CONFIG.VERSION, hint: "請先選擇方案", at: nowIso() });
    }

    bindPlanControls();
    bindFileInputs();
    bindDraftAutosave();
    bindSubmit();

    showDebug({ version: CONFIG.VERSION, gas: CONFIG.GAS, at: nowIso() });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
