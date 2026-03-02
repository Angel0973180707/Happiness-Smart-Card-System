/* ================================
 * form.js — v498 (COMPLETE OVERWRITE)
 * - ✅ 保留 v497 全部功能：UI/分流、base64→GAS、避 preflight、Draft autosave、Result 複製、Ping、Timeout/Retry
 * - ⭐ 新增：前端 Canvas 壓縮（不裁切、等比縮放）
 * - ⭐ 新增：版型欄位寫入 plan/color/style/paper/premium_color（Draft 也記）
 * - ⭐ 文案：乾淨成品 → 智慧名片成品
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v498",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    DEFAULT_LINE_OA: "https://lin.ee/G3VJoRm",
    FETCH_TIMEOUT_MS: 20000,
    RETRY: 1,
    DRAFT_KEY: "angel_card_draft_v498",
    AUTOSAVE_DEBOUNCE_MS: 380,

    // ✅ 原檔 2.8MB 是「未壓縮」時用來避免爆炸
    // v498 已壓縮後再送，因此可放寬原檔限制（仍保守）
    MAX_ORIGINAL_FILE_BYTES: 10 * 1024 * 1024, // 10MB 原檔上限（避免手機超大圖）
    MAX_EDGE: 1200,                             // 壓縮最大邊長
    JPEG_QUALITY: 0.82                          // JPEG 品質（商業穩定值）
  };

  const $ = (sel) => document.querySelector(sel);

  const elForm = $("#cardForm");
  const elStatus = $("#statusBox");
  const elResultBox = $("#resultBox");

  const elBtnSubmit = $("#btnSubmit");
  const elBtnReset  = $("#btnReset");
  const elBtnPing   = $("#btnTestPing");
  const elBtnDemo   = $("#btnFillDemo");

  const segFree = $("#segFree");
  const segPremium = $("#segPremium");
  const elPlan = $("#plan");
  const planHint = $("#planHint");

  const r_id = $("#r_id");
  const r_token = $("#r_token");
  const r_card = $("#r_card");
  const r_og = $("#r_og");

  const btnCopyCard = $("#btnCopyCard");
  const btnCopyOg = $("#btnCopyOg");

  // v498：方案選項區（若 HTML 有）
  const freeOptionsBox = $("#freeOptions");
  const premiumOptionsBox = $("#premiumOptions");

  const FILE_FIELDS = [
    { key: "avatar", file: "#avatar_file", preview: "#avatarPreview" },
    { key: "logo",   file: "#logo_file",   preview: "#logoPreview"   },
    { key: "photo1", file: "#photo1_file", preview: "#photo1Preview" },
    { key: "photo2", file: "#photo2_file", preview: "#photo2Preview" },
    { key: "photo3", file: "#photo3_file", preview: "#photo3Preview" },
    { key: "photo4", file: "#photo4_file", preview: "#photo4Preview" },
    { key: "photo5", file: "#photo5_file", preview: "#photo5Preview" }
  ];

  const fileState = {}; // key -> {dataUrl, filename, mime, bytes}

  function setStatus(msg, type = "info") {
    if (!elStatus) return;
    elStatus.classList.remove("ok", "err");
    if (type === "ok") elStatus.classList.add("ok");
    if (type === "err") elStatus.classList.add("err");
    elStatus.textContent = msg;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function withTimeout(ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return { signal: ctrl.signal, done: () => clearTimeout(t) };
  }

  function trimOrEmpty(v) { return (v ?? "").toString().trim(); }

  function normalizeLineUrl(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    return s; // allow @id
  }

  function normalizeUrl(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    return s;
  }

  function deriveUrls(id, token) {
    const base = CONFIG.BASE_URL.replace(/\/+$/, "/");
    const clean_card_url = `${base}?id=${encodeURIComponent(id)}&view=1`;
    const og_page_url = `${base}share.html?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token || "")}`;
    return { clean_card_url, og_page_url };
  }

  // ================================
  // ⭐ v498：Canvas 壓縮（不裁切、等比）
  // - avatar / photos：轉 JPEG（較省）
  // - logo：若是 PNG，保留 PNG（避免透明背景變黑）
  // ================================
  async function compressToDataURL_(file, fieldKey) {
    if (!file) return null;

    if (file.size > CONFIG.MAX_ORIGINAL_FILE_BYTES) {
      throw new Error(`原圖太大（${(file.size/1024/1024).toFixed(1)}MB）。目前上限 ${(CONFIG.MAX_ORIGINAL_FILE_BYTES/1024/1024).toFixed(0)}MB，請換小一點的圖。`);
    }

    const srcDataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("讀取圖片失敗"));
      fr.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("圖片載入失敗"));
      i.src = srcDataUrl;
    });

    const ow = img.naturalWidth || img.width || 0;
    const oh = img.naturalHeight || img.height || 0;
    if (!ow || !oh) throw new Error("圖片尺寸讀取失敗");

    const max = CONFIG.MAX_EDGE;
    const ratio = Math.min(1, max / ow, max / oh);
    const w = Math.max(1, Math.round(ow * ratio));
    const h = Math.max(1, Math.round(oh * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const isPng = (file.type || "").toLowerCase() === "image/png";
    const wantPng = (fieldKey === "logo" && isPng);

    let outDataUrl;
    if (wantPng) {
      outDataUrl = canvas.toDataURL("image/png");
    } else {
      outDataUrl = canvas.toDataURL("image/jpeg", CONFIG.JPEG_QUALITY);
    }
    return outDataUrl;
  }

  // v498：取代 v497 的 fileToDataURL（改為壓縮後的 dataURL）
  async function fileToDataURL(file, fieldKey) {
    return compressToDataURL_(file, fieldKey);
  }

  function setPreview(previewSel, dataUrl) {
    const img = $(previewSel);
    if (!img) return;
    if (!dataUrl) {
      img.style.display = "none";
      img.removeAttribute("src");
      return;
    }
    img.src = dataUrl;
    img.style.display = "";
  }

  async function handlePickFile(fieldKey, fileInputSel, previewSel) {
    const el = $(fileInputSel);
    const f = el && el.files ? el.files[0] : null;

    if (!f) {
      fileState[fieldKey] = null;
      setPreview(previewSel, "");
      saveDraftSoon_();
      return;
    }

    setStatus("圖片處理中…（壓縮）", "info");

    const dataUrl = await fileToDataURL(f, fieldKey);
    fileState[fieldKey] = {
      dataUrl,
      filename: f.name || `${fieldKey}.jpg`,
      mime: (fieldKey === "logo" && (f.type || "").toLowerCase() === "image/png") ? "image/png" : "image/jpeg",
      bytes: dataUrl ? dataUrl.length : (f.size || 0)
    };

    setPreview(previewSel, dataUrl);
    setStatus("圖片已處理完成 ✅", "ok");
    saveDraftSoon_();
  }

  function setPlan(plan) {
    const p = (plan === "premium") ? "premium" : "free";
    if (elPlan) elPlan.value = p;

    if (segFree) segFree.classList.toggle("on", p === "free");
    if (segPremium) segPremium.classList.toggle("on", p === "premium");

    // UI: premium 才顯示 photo3~5
    document.querySelectorAll(".morePhotos").forEach(el => {
      el.style.display = (p === "premium") ? "" : "none";
    });

    // v498：方案選項區同步顯示
    if (freeOptionsBox) freeOptionsBox.style.display = (p === "free") ? "" : "none";
    if (premiumOptionsBox) premiumOptionsBox.style.display = (p === "premium") ? "" : "none";

    if (planHint) {
      planHint.innerHTML = (p === "premium")
        ? "<b>精品設計：</b>7 底色；照片牆最多 5 張"
        : "<b>自由搭配：</b>5色 × 3版型 × 3紙感；照片牆最多 2 張";
    }

    setStatus("已切換方案：" + (p === "premium" ? "精品設計" : "自由搭配"), "ok");
    saveDraftSoon_();
  }

  function getSelectValue_(id, fallback = "") {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = trimOrEmpty(el.value);
    return v || fallback;
  }

  function collectFormData_() {
    const plan = (elPlan && elPlan.value) ? elPlan.value : "free";

    // 基本欄位（保留 v497）
    const payload = {
      plan,
      name: trimOrEmpty($("#name")?.value),
      unit: trimOrEmpty($("#unit")?.value),
      title: trimOrEmpty($("#title")?.value),
      phone: trimOrEmpty($("#phone")?.value),
      email: trimOrEmpty($("#email")?.value),
      website: normalizeUrl($("#website")?.value),
      address: trimOrEmpty($("#address")?.value),
      slogan: trimOrEmpty($("#slogan")?.value),
      services: trimOrEmpty($("#services")?.value),
      experience: trimOrEmpty($("#experience")?.value),
      line_url: normalizeLineUrl($("#line_url")?.value),
      line_oa: normalizeUrl($("#line_oa")?.value) || CONFIG.DEFAULT_LINE_OA
    };

    // ⭐ v498：版型欄位寫入
    if (plan === "premium") {
      payload.premium_color = getSelectValue_("premium_color", "");
      // 兼容：有些人會叫 p
      if (!payload.premium_color) payload.premium_color = getSelectValue_("p", "");
    } else {
      payload.color = getSelectValue_("color", "");
      payload.style = getSelectValue_("style", "");
      payload.paper = getSelectValue_("paper", "");
      // 兼容：有些人會叫 c/s/f
      if (!payload.color) payload.color = getSelectValue_("c", "");
      if (!payload.style) payload.style = getSelectValue_("s", "");
      if (!payload.paper) payload.paper = getSelectValue_("f", "");
    }

    // 方案分流：free 只允許 photo1~2；premium 允許 photo1~5
    const allowPhotos = (plan === "premium")
      ? ["photo1","photo2","photo3","photo4","photo5"]
      : ["photo1","photo2"];

    const files = {};
    // avatar/logo 一直允許
    ["avatar","logo"].forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    allowPhotos.forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });

    payload.files = files;
    return payload;
  }

  async function postCreate_(payload) {
    // 為避免 preflight：x-www-form-urlencoded
    const body = new URLSearchParams();
    body.set("action", "create");
    body.set("data", JSON.stringify(payload));

    const { signal, done } = withTimeout(CONFIG.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(CONFIG.GAS, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString(),
        cache: "no-store",
        signal
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (_) { json = { ok:false, raw:text }; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json;
    } finally {
      done();
    }
  }

  async function ping_() {
    const url = `${CONFIG.GAS}?action=ping&ts=${Date.now()}`;
    const { signal, done } = withTimeout(12000);
    try {
      const res = await fetch(url, { method:"GET", cache:"no-store", signal });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (_) { json = { raw:text }; }
      return json;
    } finally { done(); }
  }

  async function copyText_(t) {
    const s = String(t || "");
    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch (_) {
      const ok = prompt("請手動複製：", s);
      return ok !== null;
    }
  }

  // Draft
  let _saveT = null;
  function saveDraftSoon_() {
    clearTimeout(_saveT);
    _saveT = setTimeout(saveDraftNow_, CONFIG.AUTOSAVE_DEBOUNCE_MS);
  }

  function saveDraftNow_() {
    const plan = (elPlan && elPlan.value) ? elPlan.value : "free";
    const draft = {
      plan,

      // ⭐ v498：把版型欄位也存進草稿
      styleFields: {
        color: getSelectValue_("color", "c1"),
        style: getSelectValue_("style", "s1"),
        paper: getSelectValue_("paper", "f1"),
        premium_color: getSelectValue_("premium_color", "p1")
      },

      fields: {
        name: $("#name")?.value || "",
        unit: $("#unit")?.value || "",
        title: $("#title")?.value || "",
        phone: $("#phone")?.value || "",
        email: $("#email")?.value || "",
        website: $("#website")?.value || "",
        address: $("#address")?.value || "",
        slogan: $("#slogan")?.value || "",
        services: $("#services")?.value || "",
        experience: $("#experience")?.value || "",
        line_url: $("#line_url")?.value || "",
        line_oa: $("#line_oa")?.value || ""
      },
      // file dataURL 很大，不進 draft（避免爆 localStorage）
      savedAt: Date.now()
    };
    try { localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(draft)); } catch(_) {}
  }

  function loadDraft_() {
    try {
      const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== "object") return;

      setPlan(d.plan || "free");

      // 先回填版型欄位
      const sf = d.styleFields || {};
      if (document.getElementById("color") && sf.color) document.getElementById("color").value = sf.color;
      if (document.getElementById("style") && sf.style) document.getElementById("style").value = sf.style;
      if (document.getElementById("paper") && sf.paper) document.getElementById("paper").value = sf.paper;
      if (document.getElementById("premium_color") && sf.premium_color) document.getElementById("premium_color").value = sf.premium_color;

      const f = (d.fields || {});
      Object.keys(f).forEach(k => {
        const el = document.getElementById(k);
        if (el) el.value = f[k] || "";
      });

      setStatus("已載入上次草稿（不含圖片）。", "ok");
    } catch(_) {}
  }

  function clearAll_() {
    // 清欄位
    ["name","unit","title","phone","email","website","address","slogan","services","experience","line_url","line_oa"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // 清版型欄位（回到預設）
    if (document.getElementById("color")) document.getElementById("color").value = "c1";
    if (document.getElementById("style")) document.getElementById("style").value = "s1";
    if (document.getElementById("paper")) document.getElementById("paper").value = "f1";
    if (document.getElementById("premium_color")) document.getElementById("premium_color").value = "p1";

    // 清圖片
    FILE_FIELDS.forEach(ff => {
      const inp = $(ff.file);
      if (inp) inp.value = "";
      fileState[ff.key] = null;
      setPreview(ff.preview, "");
    });

    try { localStorage.removeItem(CONFIG.DRAFT_KEY); } catch(_) {}
    setStatus("已清空。", "ok");
  }

  function fillDemo_() {
    $("#name").value = "小天使";
    $("#unit").value = "天使幸福智慧名片館";
    $("#title").value = "館長";
    $("#phone").value = "0973180707";
    $("#website").value = CONFIG.BASE_URL;
    $("#line_oa").value = CONFIG.DEFAULT_LINE_OA;
    $("#services").value = "打造個人品牌智慧名片\n名片交付／代管";
    $("#slogan").value = "把心站穩，活得自在。";

    // v498：示範也填版型
    if (document.getElementById("color")) document.getElementById("color").value = "c3";
    if (document.getElementById("style")) document.getElementById("style").value = "s2";
    if (document.getElementById("paper")) document.getElementById("paper").value = "f1";
    if (document.getElementById("premium_color")) document.getElementById("premium_color").value = "p6";

    saveDraftSoon_();
    setStatus("已填入示範資料（圖片請自行選）。", "ok");
  }

  async function onSubmit_(ev) {
    ev.preventDefault();

    try {
      if (elBtnSubmit) elBtnSubmit.disabled = true;
      setStatus("送出中…（包含圖片會稍久）", "info");

      const payload = collectFormData_();

      // 最基本檢查
      if (!payload.name) {
        setStatus("請至少填寫：姓名", "err");
        if (elBtnSubmit) elBtnSubmit.disabled = false;
        return;
      }

      // ⭐ v498：照片張數硬性限制（以「已選且壓縮成功」為準）
      const plan = payload.plan || "free";
      const selectedPhotos = ["photo1","photo2","photo3","photo4","photo5"].filter(k => !!payload.files?.[k]);
      if (plan !== "premium" && selectedPhotos.length > 2) {
        setStatus("自由搭配：照片牆最多 2 張（請移除照片 3~5）", "err");
        if (elBtnSubmit) elBtnSubmit.disabled = false;
        return;
      }
      if (plan === "premium" && selectedPhotos.length > 5) {
        setStatus("精品設計：照片牆最多 5 張", "err");
        if (elBtnSubmit) elBtnSubmit.disabled = false;
        return;
      }

      // 送出
      let lastErr = null;
      let json = null;
      for (let i = 0; i <= CONFIG.RETRY; i++) {
        try {
          json = await postCreate_(payload);
          break;
        } catch (e) {
          lastErr = e;
          await sleep(550 * (i + 1));
        }
      }
      if (!json) throw (lastErr || new Error("create failed"));
      if (!json.ok) throw new Error(json.error || json.message || "create ok=false");

      const item = json.item || json.data || {};
      const id = item.id || item.card_id || item.cardId || "";
      const token = item.token || "";

      const { clean_card_url, og_page_url } = deriveUrls(id || "TW0001", token);

      // 顯示結果
      if (r_id) r_id.textContent = id || "—";
      if (r_token) r_token.textContent = token || "—";
      if (r_card) r_card.textContent = clean_card_url;
      if (r_og) r_og.textContent = og_page_url;
      if (elResultBox) elResultBox.style.display = "";

      if (btnCopyCard) {
        btnCopyCard.onclick = async () => {
          const ok = await copyText_(clean_card_url);
          setStatus(ok ? "已複製智慧名片成品連結 ✅" : "已取消", ok ? "ok" : "info");
        };
      }
      if (btnCopyOg) {
        btnCopyOg.onclick = async () => {
          const ok = await copyText_(og_page_url);
          setStatus(ok ? "已複製 OG 交付連結 ✅" : "已取消", ok ? "ok" : "info");
        };
      }

      setStatus("建立成功 ✅（若你已設定後台開通流程，名片狀態可能先是 inactive）", "ok");
      saveDraftNow_();

    } catch (err) {
      console.error(err);
      setStatus("送出失敗：" + (err && err.message ? err.message : String(err)), "err");
    } finally {
      if (elBtnSubmit) elBtnSubmit.disabled = false;
    }
  }

  function bindFiles_() {
    FILE_FIELDS.forEach(ff => {
      const inp = $(ff.file);
      if (!inp) return;
      inp.addEventListener("change", () => {
        handlePickFile(ff.key, ff.file, ff.preview).catch(e => {
          console.error(e);
          setStatus(e.message || "讀取圖片失敗", "err");
        });
      });
    });
  }

  function bindTextAutosave_() {
    document.querySelectorAll("input,textarea,select").forEach(el => {
      el.addEventListener("input", saveDraftSoon_);
      el.addEventListener("change", saveDraftSoon_);
    });
  }

  function boot_() {
    // plan buttons
    if (segFree) segFree.addEventListener("click", () => setPlan("free"));
    if (segPremium) segPremium.addEventListener("click", () => setPlan("premium"));

    // defaults
    setPlan("free");
    if ($("#line_oa") && !$("#line_oa").value) $("#line_oa").value = CONFIG.DEFAULT_LINE_OA;

    // bind
    bindFiles_();
    bindTextAutosave_();
    if (elForm) elForm.addEventListener("submit", onSubmit_);

    if (elBtnReset) elBtnReset.addEventListener("click", clearAll_);
    if (elBtnDemo) elBtnDemo.addEventListener("click", fillDemo_);

    if (elBtnPing) {
      elBtnPing.addEventListener("click", async () => {
        try {
          setStatus("測試連線中…", "info");
          const j = await ping_();
          setStatus((j && (j.ok || j.status)) ? "連線正常 ✅" : "已回應（請看 console）", "ok");
          console.log("PING:", j);
        } catch (e) {
          console.error(e);
          setStatus("連線失敗：" + (e.message || e), "err");
        }
      });
    }

    // load draft
    loadDraft_();
  }

  document.addEventListener("DOMContentLoaded", boot_);
})();