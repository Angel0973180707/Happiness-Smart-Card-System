/* ================================
 * form.js — v493-FORM (COMPLETE OVERWRITE)
 * Purpose:
 * - Plan split (free/premium)
 * - Field validation & limits per plan
 * - Submit via POST x-www-form-urlencoded (avoid CORS preflight)
 * - Fallback: POST text/plain JSON
 * - Debug panel show backend response (error/debug)
 * ================================ */

(() => {
  "use strict";

  // ========= CONFIG (align with your system) =========
  const CONFIG = {
    VERSION: "v493-FORM",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

    // actions
    ACTION_CREATE: "create", // default write

    // plan keys
    PLAN_FREE: "free",
    PLAN_PREMIUM: "premium",

    // UI selectors (optional; if missing, code still works)
    SEL: {
      planRadios: 'input[name="plan"]',
      planFreeBtn: "#planFree",
      planPremiumBtn: "#planPremium",

      sectionPlanFree: "[data-plan='free']",
      sectionPlanPremium: "[data-plan='premium']",

      submitBtn: "#btnSubmit, [data-action='submit']",
      debugBox: "#debugBox, [data-ui='debug']",
      toastBox: "#toast, [data-ui='toast']"
    },

    // limits per plan
    LIMITS: {
      free: { videos: 1, socials: 1, photos: 2 },
      premium: { videos: 3, socials: 3, photos: 5 }
    },

    // required fields per plan
    REQUIRED: {
      free: ["plan", "theme_color", "banner_style", "paper_style", "avatar_img", "name", "unit", "title", "slogan", "services"],
      premium: ["plan", "premium_color", "avatar_img", "name", "unit", "title", "slogan", "services"]
    }
  };

  // ========= State =========
  let state = {
    plan: "", // "free" | "premium"
    busy: false
  };

  // ========= Helpers =========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function nowIso() {
    return new Date().toISOString();
  }

  function safeStr(v) {
    return String(v == null ? "" : v).trim();
  }

  function normalizeUrl(u) {
    let s = safeStr(u);
    if (!s) return "";
    s = s.replace(/^http:\/\//i, "https://");
    // dropbox dl=0 -> raw=1
    if (/dropbox\.com/i.test(s)) {
      s = s.replace(/[?&]dl=0\b/i, (m) => m.replace("dl=0", "raw=1"));
      if (!/[?&]raw=1\b/i.test(s)) s += (s.includes("?") ? "&" : "?") + "raw=1";
    }
    return s;
  }

  function showToast(msg, type = "info") {
    const box = $(CONFIG.SEL.toastBox);
    if (!box) {
      alert(msg);
      return;
    }
    box.textContent = msg;
    box.setAttribute("data-type", type);
    box.style.display = "block";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (box.style.display = "none"), 2800);
  }

  function showDebug(obj) {
    const box = $(CONFIG.SEL.debugBox);
    if (!box) return;
    box.style.display = "block";
    box.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  }

  // get input value by: name OR data-field OR id
  function getFieldValue(key) {
    // 1) name
    let el = document.querySelector(`[name="${CSS.escape(key)}"]`);
    if (!el) el = document.querySelector(`[data-field="${CSS.escape(key)}"]`);
    if (!el) el = document.getElementById(key);
    if (!el) return "";

    if (el.type === "checkbox") return el.checked ? "1" : "";
    if (el.type === "radio") {
      const checked = document.querySelector(`[name="${CSS.escape(key)}"]:checked`);
      return checked ? safeStr(checked.value) : "";
    }
    return safeStr(el.value);
  }

  function setFieldValue(key, val) {
    let el = document.querySelector(`[name="${CSS.escape(key)}"]`);
    if (!el) el = document.querySelector(`[data-field="${CSS.escape(key)}"]`);
    if (!el) el = document.getElementById(key);
    if (!el) return;

    if (el.type === "checkbox") el.checked = !!val;
    else el.value = val;
  }

  function disableSubmit(disabled) {
    const btn = $(CONFIG.SEL.submitBtn);
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.setAttribute("aria-busy", disabled ? "true" : "false");
    btn.classList.toggle("is-busy", !!disabled);
  }

  // ========= Plan UI =========
  function readPlanFromUI() {
    // radio
    const checked = document.querySelector(`${CONFIG.SEL.planRadios}:checked`);
    if (checked) return safeStr(checked.value);

    // buttons fallback
    if ($(CONFIG.SEL.planFreeBtn)?.classList.contains("is-active")) return CONFIG.PLAN_FREE;
    if ($(CONFIG.SEL.planPremiumBtn)?.classList.contains("is-active")) return CONFIG.PLAN_PREMIUM;

    // hidden input fallback
    const hidden = getFieldValue("plan");
    return safeStr(hidden);
  }

  function applyPlanUI(plan) {
    state.plan = plan;

    // set hidden plan
    setFieldValue("plan", plan);

    // toggle plan buttons
    const bFree = $(CONFIG.SEL.planFreeBtn);
    const bPre = $(CONFIG.SEL.planPremiumBtn);
    if (bFree) bFree.classList.toggle("is-active", plan === CONFIG.PLAN_FREE);
    if (bPre) bPre.classList.toggle("is-active", plan === CONFIG.PLAN_PREMIUM);

    // toggle sections
    $$(CONFIG.SEL.sectionPlanFree).forEach((el) => (el.style.display = plan === CONFIG.PLAN_FREE ? "" : "none"));
    $$(CONFIG.SEL.sectionPlanPremium).forEach((el) => (el.style.display = plan === CONFIG.PLAN_PREMIUM ? "" : "none"));

    // enforce limits visually (optional hint)
    enforceLimitsSoft(plan);

    showDebug({ version: CONFIG.VERSION, plan, at: nowIso() });
  }

  function enforceLimitsSoft(plan) {
    // Optional: if you use inputs like video1_url..video3_url etc.
    const lim = CONFIG.LIMITS[plan] || CONFIG.LIMITS.free;

    // videos
    for (let i = lim.videos + 1; i <= 3; i++) {
      const key = `video${i}_url`;
      const el = document.querySelector(`[name="${CSS.escape(key)}"],[data-field="${CSS.escape(key)}"],#${CSS.escape(key)}`);
      if (el) {
        el.value = "";
        el.closest?.("[data-field-wrap]")?.classList?.add("is-hidden");
        if (el.closest?.("[data-field-wrap]")) el.closest("[data-field-wrap]").style.display = "none";
      }
    }
    for (let i = 1; i <= lim.videos; i++) {
      const key = `video${i}_url`;
      const el = document.querySelector(`[name="${CSS.escape(key)}"],[data-field="${CSS.escape(key)}"],#${CSS.escape(key)}`);
      if (el?.closest?.("[data-field-wrap]")) el.closest("[data-field-wrap]").style.display = "";
    }

    // socials
    for (let i = lim.socials + 1; i <= 3; i++) {
      const key = `social${i}_url`;
      const el = document.querySelector(`[name="${CSS.escape(key)}"],[data-field="${CSS.escape(key)}"],#${CSS.escape(key)}`);
      if (el) {
        el.value = "";
        if (el.closest?.("[data-field-wrap]")) el.closest("[data-field-wrap]").style.display = "none";
      }
    }
    for (let i = 1; i <= lim.socials; i++) {
      const key = `social${i}_url`;
      const el = document.querySelector(`[name="${CSS.escape(key)}"],[data-field="${CSS.escape(key)}"],#${CSS.escape(key)}`);
      if (el?.closest?.("[data-field-wrap]")) el.closest("[data-field-wrap]").style.display = "";
    }

    // photos
    for (let i = lim.photos + 1; i <= 5; i++) {
      const key = `photo${i}_img`;
      const el = document.querySelector(`[name="${CSS.escape(key)}"],[data-field="${CSS.escape(key)}"],#${CSS.escape(key)}`);
      if (el) {
        el.value = "";
        if (el.closest?.("[data-field-wrap]")) el.closest("[data-field-wrap]").style.display = "none";
      }
    }
    for (let i = 1; i <= lim.photos; i++) {
      const key = `photo${i}_img`;
      const el = document.querySelector(`[name="${CSS.escape(key)}"],[data-field="${CSS.escape(key)}"],#${CSS.escape(key)}`);
      if (el?.closest?.("[data-field-wrap]")) el.closest("[data-field-wrap]").style.display = "";
    }
  }

  // ========= Payload Build =========
  function buildPayload() {
    const plan = readPlanFromUI() || state.plan;
    if (!plan) return { ok: false, error: "尚未選擇方案（free/premium）" };

    const payload = {
      action: CONFIG.ACTION_CREATE,
      debug: "1", // keep debug on during stabilization; can remove later
      plan
    };

    // Common fields
    payload.name = getFieldValue("name");
    payload.unit = getFieldValue("unit");
    payload.title = getFieldValue("title");
    payload.slogan = getFieldValue("slogan");
    payload.services = getFieldValue("services");

    // contacts
    payload.phone = getFieldValue("phone");
    payload.email = getFieldValue("email");
    payload.line_url = getFieldValue("line_url") || getFieldValue("line") || getFieldValue("lineId");
    payload.website_url = getFieldValue("website_url") || getFieldValue("website") || getFieldValue("url");
    payload.address = getFieldValue("address");

    // images (urls)
    payload.avatar_img = normalizeUrl(getFieldValue("avatar_img") || getFieldValue("avatar") || getFieldValue("個人照"));
    payload.logo_img = normalizeUrl(getFieldValue("logo_img") || getFieldValue("logo") || getFieldValue("Logo"));

    // Plan-specific required and options
    if (plan === CONFIG.PLAN_FREE) {
      payload.theme_color = getFieldValue("theme_color") || getFieldValue("c") || getFieldValue("color"); // c1~c5
      payload.banner_style = getFieldValue("banner_style") || getFieldValue("s") || getFieldValue("style"); // s1~s3
      payload.paper_style = getFieldValue("paper_style") || getFieldValue("f") || getFieldValue("paper"); // f1~f3

      // limits
      payload.video1_url = normalizeUrl(getFieldValue("video1_url"));
      payload.social1_url = normalizeUrl(getFieldValue("social1_url"));
      payload.photo1_img = normalizeUrl(getFieldValue("photo1_img"));
      payload.photo2_img = normalizeUrl(getFieldValue("photo2_img"));

      // clear over-limit in case UI didn't hide
      payload.video2_url = "";
      payload.video3_url = "";
      payload.social2_url = "";
      payload.social3_url = "";
      payload.photo3_img = "";
      payload.photo4_img = "";
      payload.photo5_img = "";
      payload.premium_color = "";
    } else {
      payload.premium_color = getFieldValue("premium_color") || getFieldValue("p") || getFieldValue("premium"); // p1~p7

      // videos 1..3
      for (let i = 1; i <= 3; i++) payload[`video${i}_url`] = normalizeUrl(getFieldValue(`video${i}_url`));
      for (let i = 1; i <= 3; i++) payload[`social${i}_url`] = normalizeUrl(getFieldValue(`social${i}_url`));
      for (let i = 1; i <= 5; i++) payload[`photo${i}_img`] = normalizeUrl(getFieldValue(`photo${i}_img`));

      // clear free-only
      payload.theme_color = "";
      payload.banner_style = "";
      payload.paper_style = "";
    }

    // basic normalize empties
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
      const v = payload[k];
      if (!safeStr(v)) missing.push(k);
    }
    if (missing.length) {
      return { ok: false, error: `以下為必填未填：${missing.join("、")}` };
    }

    // per-plan limits
    const lim = CONFIG.LIMITS[plan] || CONFIG.LIMITS.free;

    // if free, ensure only 1 video/social, 2 photos (we already cleared but validate anyway)
    if (plan === CONFIG.PLAN_FREE) {
      if (safeStr(payload.video2_url) || safeStr(payload.video3_url)) return { ok: false, error: "自搭配款影音最多 1 則" };
      if (safeStr(payload.social2_url) || safeStr(payload.social3_url)) return { ok: false, error: "自搭配款社群最多 1 則" };
      if (safeStr(payload.photo3_img) || safeStr(payload.photo4_img) || safeStr(payload.photo5_img)) return { ok: false, error: "自搭配款照片最多 2 張" };
    } else {
      // premium: photos up to 5, videos/socials up to 3 (no extra fields)
      // nothing extra to check
    }

    // light sanity: avatar must be url-ish (if you use URL upload)
    if (payload.avatar_img && !/^https?:\/\//i.test(payload.avatar_img) && !/drive\.google\.com/i.test(payload.avatar_img)) {
      // still allow non-http if you later use other method, but warn
      // not failing
    }

    return { ok: true };
  }

  // ========= Submit (high success) =========
  function toFormUrlEncoded(obj) {
    const parts = [];
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      if (v === undefined || v === null) return;
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
    });
    return parts.join("&");
  }

  async function postUrlEncoded(payload) {
    // Avoid setting custom headers => keep it "simple request" (no preflight)
    const body = toFormUrlEncoded(payload);

    const res = await fetch(CONFIG.GAS, {
      method: "POST",
      body
      // do NOT set headers here
    });

    const text = await res.text();
    return safeJsonParse(text);
  }

  async function postTextPlainJson(payload) {
    // Another preflight-avoid approach
    const res = await fetch(CONFIG.GAS, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    return safeJsonParse(text);
  }

  function safeJsonParse(text) {
    const t = safeStr(text);
    try {
      return JSON.parse(t);
    } catch (e) {
      return { ok: false, error: "後端回傳非 JSON", raw: t.slice(0, 800) };
    }
  }

  async function handleSubmit() {
    if (state.busy) return;
    state.busy = true;
    disableSubmit(true);
    showDebug({ stage: "submit_start", at: nowIso(), version: CONFIG.VERSION });

    try {
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

      // 1) try urlencoded first (highest success)
      let data;
      try {
        data = await postUrlEncoded(payload);
      } catch (e1) {
        data = { ok: false, error: "urlencoded fetch failed", debug: { e1: String(e1) } };
      }

      // 2) fallback to text/plain JSON
      if (!data || data.ok !== true) {
        try {
          const data2 = await postTextPlainJson(payload);
          // prefer successful fallback
          if (data2 && data2.ok === true) data = data2;
          else data = data2 || data;
        } catch (e2) {
          data = data || { ok: false, error: "fallback failed", debug: { e2: String(e2) } };
        }
      }

      showDebug({ stage: "submit_result", at: nowIso(), requestPlan: payload.plan, response: data });

      if (data && data.ok) {
        showToast("✅ 已送出成功！", "success");
        // Optional: show returned id/token/urls
        // If your GAS returns {id, token, urls}, you can display them:
        if (data.id) setFieldValue("id", data.id);
        if (data.token) setFieldValue("token", data.token);
      } else {
        const msg = (data && (data.error || data.message)) ? String(data.error || data.message) : "送出失敗";
        showToast("❌ " + msg, "error");
      }
    } finally {
      state.busy = false;
      disableSubmit(false);
    }
  }

  // ========= Bindings =========
  function bindPlanControls() {
    // radio
    $$(CONFIG.SEL.planRadios).forEach((r) => {
      r.addEventListener("change", () => applyPlanUI(readPlanFromUI()));
    });

    // button fallback
    const bFree = $(CONFIG.SEL.planFreeBtn);
    const bPre = $(CONFIG.SEL.planPremiumBtn);
    if (bFree) bFree.addEventListener("click", () => applyPlanUI(CONFIG.PLAN_FREE));
    if (bPre) bPre.addEventListener("click", () => applyPlanUI(CONFIG.PLAN_PREMIUM));
  }

  function bindSubmit() {
    const btn = $(CONFIG.SEL.submitBtn);
    if (btn) btn.addEventListener("click", (e) => (e.preventDefault(), handleSubmit()));

    // allow form submit if wrapped in <form>
    const form = btn ? btn.closest("form") : document.querySelector("form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSubmit();
      });
    }
  }

  function boot() {
    // Initialize plan
    const plan = readPlanFromUI();
    if (plan === CONFIG.PLAN_FREE || plan === CONFIG.PLAN_PREMIUM) {
      applyPlanUI(plan);
    } else {
      // default: no plan chosen yet -> hide both plan sections until chosen
      $$(CONFIG.SEL.sectionPlanFree).forEach((el) => (el.style.display = "none"));
      $$(CONFIG.SEL.sectionPlanPremium).forEach((el) => (el.style.display = "none"));
      showDebug({ version: CONFIG.VERSION, hint: "請先選擇方案（free/premium）", at: nowIso() });
    }

    bindPlanControls();
    bindSubmit();

    // show version in debug
    showDebug({ version: CONFIG.VERSION, gas: CONFIG.GAS, at: nowIso() });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();