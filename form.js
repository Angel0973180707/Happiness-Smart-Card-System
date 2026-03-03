/* ================================
 * form.js — v498 (COMPLETE OVERWRITE)
 * - Success CTA only (LINE OA), no token/link shown
 * - Image compress + dynamic timeout
 * - Plan options show/hide (freeOptions/premiumOptions)
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v498",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    DEFAULT_LINE_OA: "https://lin.ee/G3VJoRm",

    FETCH_TIMEOUT_MS_NOIMG: 20000,
    FETCH_TIMEOUT_MS_IMG: 90000,
    RETRY: 1,

    DRAFT_KEY: "angel_card_draft_v498",
    AUTOSAVE_DEBOUNCE_MS: 380,

    MAX_ORIGINAL_BYTES: 12 * 1024 * 1024,

    COMPRESS: {
      avatar: { maxW: 900,  maxH: 900,  quality: 0.82 },
      logo:   { maxW: 900,  maxH: 900,  quality: 0.85 },
      photo:  { maxW: 1280, maxH: 1280, quality: 0.82 }
    }
  };

  const $ = (sel) => document.querySelector(sel);

  const elForm = $("#cardForm");
  const elStatus = $("#statusBox");

  const elBtnSubmit = $("#btnSubmit");
  const elBtnReset  = $("#btnReset");
  const elBtnPing   = $("#btnTestPing");
  const elBtnDemo   = $("#btnFillDemo");

  const segFree = $("#segFree");
  const segPremium = $("#segPremium");
  const elPlan = $("#plan");
  const planHint = $("#planHint");

  const freeOptions = $("#freeOptions");
  const premiumOptions = $("#premiumOptions");
  const photoRuleTip = $("#photoRuleTip");

  const elColor = $("#color");
  const elStyle = $("#style");
  const elPaper = $("#paper");
  const elPremiumColor = $("#premium_color");

  const successCta = $("#successCta");
  const btnLineOa = $("#btnLineOa");

  const FILE_FIELDS = [
    { key: "avatar", file: "#avatar_file", preview: "#avatarPreview" },
    { key: "logo",   file: "#logo_file",   preview: "#logoPreview"   },
    { key: "photo1", file: "#photo1_file", preview: "#photo1Preview" },
    { key: "photo2", file: "#photo2_file", preview: "#photo2Preview" },
    { key: "photo3", file: "#photo3_file", preview: "#photo3Preview" },
    { key: "photo4", file: "#photo4_file", preview: "#photo4Preview" },
    { key: "photo5", file: "#photo5_file", preview: "#photo5Preview" }
  ];

  const fileState = {}; // key -> {dataUrl, filename, mime, bytes, note}

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
    return s;
  }
  function normalizeUrl(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    return s;
  }

  function bytesToMB(n) { return (n / 1024 / 1024).toFixed(2); }

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

  function dataUrlByteLength_(dataUrl) {
    try {
      const i = dataUrl.indexOf(",");
      if (i < 0) return 0;
      const b64 = dataUrl.slice(i + 1);
      const pad = (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
      return Math.max(0, Math.floor(b64.length * 3 / 4) - pad);
    } catch (_) { return 0; }
  }

  async function loadImageBitmap_(file) {
    if ("createImageBitmap" in window) {
      try { return await createImageBitmap(file); } catch (_) {}
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("圖片載入失敗"));
        im.src = url;
      });
      return img;
    } finally { URL.revokeObjectURL(url); }
  }

  async function compressImageToDataURL_(file, preset) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      // fallback: as-is
      return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error("讀取圖片失敗"));
        fr.readAsDataURL(file);
      });
    }

    const bmp = await loadImageBitmap_(file);
    const sw = bmp.width || bmp.naturalWidth || 0;
    const sh = bmp.height || bmp.naturalHeight || 0;
    if (!sw || !sh) throw new Error("圖片尺寸讀取失敗");

    const scale = Math.min(1, preset.maxW / sw, preset.maxH / sh);
    const tw = Math.max(1, Math.round(sw * scale));
    const th = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, tw, th);

    return canvas.toDataURL("image/jpeg", preset.quality);
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

    if (f.size > CONFIG.MAX_ORIGINAL_BYTES) {
      throw new Error(`原圖太大（${bytesToMB(f.size)}MB），請換小一點（上限 ${bytesToMB(CONFIG.MAX_ORIGINAL_BYTES)}MB）。`);
    }

    const preset =
      fieldKey === "avatar" ? CONFIG.COMPRESS.avatar :
      fieldKey === "logo"   ? CONFIG.COMPRESS.logo :
      CONFIG.COMPRESS.photo;

    setStatus(`圖片處理中…（${fieldKey}）`, "info");

    const dataUrl = await compressImageToDataURL_(f, preset);
    const outBytes = dataUrlByteLength_(dataUrl);

    fileState[fieldKey] = {
      dataUrl,
      filename: (f.name || `${fieldKey}.jpg`).replace(/\.\w+$/, "") + ".jpg",
      mime: "image/jpeg",
      bytes: outBytes,
      note: `原圖 ${bytesToMB(f.size)}MB → 壓縮後 ${bytesToMB(outBytes)}MB`
    };

    setPreview(previewSel, dataUrl);
    setStatus(`已壓縮完成：${fileState[fieldKey].note}`, "ok");
    saveDraftSoon_();
  }

  function hasAnyImage_() {
    return Object.values(fileState).some(v => v && v.dataUrl);
  }

  function countPickedPhotos_() {
    const keys = ["photo1","photo2","photo3","photo4","photo5"];
    let n = 0;
    keys.forEach(k => { if (fileState[k]?.dataUrl) n++; });
    return n;
  }

  function clearExtraPhotosForFree_() {
    ["photo3","photo4","photo5"].forEach(k => {
      if (fileState[k]?.dataUrl) {
        const ff = FILE_FIELDS.find(x => x.key === k);
        if (ff) {
          const inp = $(ff.file);
          if (inp) inp.value = "";
          fileState[k] = null;
          setPreview(ff.preview, "");
        }
      }
    });
  }

  function setPlan(plan) {
    const p = (plan === "premium") ? "premium" : "free";
    elPlan.value = p;

    segFree.classList.toggle("on", p === "free");
    segPremium.classList.toggle("on", p === "premium");

    // options visible
    if (freeOptions) freeOptions.style.display = (p === "free") ? "" : "none";
    if (premiumOptions) premiumOptions.style.display = (p === "premium") ? "" : "none";

    // photo fields
    document.querySelectorAll(".morePhotos").forEach(el => {
      el.style.display = (p === "premium") ? "" : "none";
    });

    if (photoRuleTip) photoRuleTip.textContent = (p === "premium") ? "premium：最多 5 張" : "free：最多 2 張";

    // hint
    planHint.innerHTML = (p === "premium")
      ? "<b>精品設計：</b>7 底色；照片牆最多 5 張"
      : "<b>自由搭配：</b>5色 × 3版型 × 3紙感；照片牆最多 2 張";

    // ✅ free 時避免殘留多照片
    if (p === "free") clearExtraPhotosForFree_();

    setStatus("已切換方案：" + (p === "premium" ? "精品設計" : "自由搭配"), "ok");
    saveDraftSoon_();
  }

  function collectFormData_() {
    const plan = elPlan.value || "free";

    const payload = {
      plan,
      color: plan === "free" ? trimOrEmpty(elColor?.value) : "",
      style: plan === "free" ? trimOrEmpty(elStyle?.value) : "",
      paper: plan === "free" ? trimOrEmpty(elPaper?.value) : "",
      premium_color: plan === "premium" ? trimOrEmpty(elPremiumColor?.value) : "",

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

    const allowPhotos = (plan === "premium")
      ? ["photo1","photo2","photo3","photo4","photo5"]
      : ["photo1","photo2"];

    const files = {};
    ["avatar","logo"].forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    allowPhotos.forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    payload.files = files;

    // double channel for legacy GAS
    if (fileState.avatar?.dataUrl) payload.avatar_img = fileState.avatar.dataUrl;
    if (fileState.logo?.dataUrl) payload.logo_img = fileState.logo.dataUrl;
    allowPhotos.forEach(k => payload[`${k}_img`] = (fileState[k]?.dataUrl || ""));

    if (plan !== "premium") {
      payload.photo3_img = "";
      payload.photo4_img = "";
      payload.photo5_img = "";
    }

    return payload;
  }

  function validate_(payload) {
    if (!payload.name) return "請至少填寫：姓名";

    if (payload.plan === "premium") {
      if (!payload.premium_color) return "請選擇：精品底色（p1~p7）";
    } else {
      if (!payload.color) return "請選擇：顏色（c1~c5）";
      if (!payload.style) return "請選擇：版型（s1~s3）";
      if (!payload.paper) return "請選擇：紙感（f1~f3）";
    }

    const picked = countPickedPhotos_();
    const max = (payload.plan === "premium") ? 5 : 2;
    if (picked > max) return `照片牆最多 ${max} 張（你目前選了 ${picked} 張）。`;

    return "";
  }

  async function postCreate_(payload) {
    const body = new URLSearchParams();
    body.set("action", "create");
    body.set("data", JSON.stringify(payload));

    const timeoutMs = hasAnyImage_() ? CONFIG.FETCH_TIMEOUT_MS_IMG : CONFIG.FETCH_TIMEOUT_MS_NOIMG;
    const { signal, done } = withTimeout(timeoutMs);

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
    } finally { done(); }
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

  // Draft
  let _saveT = null;
  function saveDraftSoon_() {
    clearTimeout(_saveT);
    _saveT = setTimeout(saveDraftNow_, CONFIG.AUTOSAVE_DEBOUNCE_MS);
  }

  function saveDraftNow_() {
    const plan = elPlan.value || "free";
    const draft = {
      plan,
      options: {
        color: elColor?.value || "c3",
        style: elStyle?.value || "s3",
        paper: elPaper?.value || "f1",
        premium_color: elPremiumColor?.value || "p6"
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

      const o = d.options || {};
      if (elColor && o.color) elColor.value = o.color;
      if (elStyle && o.style) elStyle.value = o.style;
      if (elPaper && o.paper) elPaper.value = o.paper;
      if (elPremiumColor && o.premium_color) elPremiumColor.value = o.premium_color;

      const f = (d.fields || {});
      Object.keys(f).forEach(k => {
        const el = document.getElementById(k);
        if (el) el.value = f[k] || "";
      });

      setStatus("已載入上次草稿（不含圖片）。", "ok");
    } catch(_) {}
  }

  function clearAll_() {
    ["name","unit","title","phone","email","website","address","slogan","services","experience","line_url","line_oa"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    FILE_FIELDS.forEach(ff => {
      const inp = $(ff.file);
      if (inp) inp.value = "";
      fileState[ff.key] = null;
      setPreview(ff.preview, "");
    });

    try { localStorage.removeItem(CONFIG.DRAFT_KEY); } catch(_) {}

    if (successCta) successCta.style.display = "none";
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
    saveDraftSoon_();
    setStatus("已填入示範資料（圖片請自行選）。", "ok");
  }

  async function onSubmit_(ev) {
    ev.preventDefault();

    try {
      elBtnSubmit.disabled = true;

      // hide success block while submitting
      if (successCta) successCta.style.display = "none";

      const payload = collectFormData_();
      const err = validate_(payload);
      if (err) {
        setStatus(err, "err");
        elBtnSubmit.disabled = false;
        return;
      }

      const timeoutMs = hasAnyImage_() ? CONFIG.FETCH_TIMEOUT_MS_IMG : CONFIG.FETCH_TIMEOUT_MS_NOIMG;
      setStatus(`送出中…（${hasAnyImage_() ? "含圖片" : "無圖片"}｜${Math.round(timeoutMs/1000)}s）`, "info");

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

      // ✅ 成功後：只顯示 LINE OA 引導（token/link 不出現）
      const lineOa = payload.line_oa || CONFIG.DEFAULT_LINE_OA;
      if (btnLineOa) btnLineOa.href = lineOa;

      if (successCta) successCta.style.display = "";

      setStatus("建立成功 ✅ 請點擊加入 LINE 官方帳號確認資料", "ok");
      saveDraftNow_();

      try { successCta?.scrollIntoView({ behavior:"smooth", block:"start" }); } catch(_) {}

    } catch (err) {
      console.error(err);
      const msg = (err && err.name === "AbortError")
        ? "送出超時（手機網路/圖片仍偏大）。請再送一次（已壓縮），或只先送 1 張測試。"
        : ("送出失敗：" + (err && err.message ? err.message : String(err)));
      setStatus(msg, "err");
    } finally {
      elBtnSubmit.disabled = false;
    }
  }

  function bindFiles_() {
    FILE_FIELDS.forEach(ff => {
      const inp = $(ff.file);
      if (!inp) return;
      inp.addEventListener("change", () => {
        handlePickFile(ff.key, ff.file, ff.preview).catch(e => {
          console.error(e);
          setStatus(e.message || "讀取/壓縮圖片失敗", "err");
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
    segFree.addEventListener("click", () => setPlan("free"));
    segPremium.addEventListener("click", () => setPlan("premium"));

    // defaults
    setPlan("free");
    if ($("#line_oa") && !$("#line_oa").value) $("#line_oa").value = CONFIG.DEFAULT_LINE_OA;

    bindFiles_();
    bindTextAutosave_();
    elForm.addEventListener("submit", onSubmit_);

    elBtnReset.addEventListener("click", clearAll_);
    elBtnDemo.addEventListener("click", fillDemo_);

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

    loadDraft_();
  }

  document.addEventListener("DOMContentLoaded", boot_);
})();