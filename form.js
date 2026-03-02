/* ================================
 * form.js — v497 (COMPLETE OVERWRITE)
 * - 清爽 UI / 分流明確（free / premium）
 * - 圖片：file -> dataURL(base64) -> GAS create
 * - POST: x-www-form-urlencoded (data=JSON) 避免 preflight
 * - Draft autosave (localStorage)
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v497",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    DEFAULT_LINE_OA: "https://lin.ee/G3VJoRm",
    FETCH_TIMEOUT_MS: 20000,
    RETRY: 1,
    DRAFT_KEY: "angel_card_draft_v497",
    AUTOSAVE_DEBOUNCE_MS: 380,
    MAX_FILE_BYTES: 2.8 * 1024 * 1024
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
    // allow @id (keep)
    return s;
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

  async function fileToDataURL(file) {
    if (!file) return null;
    if (file.size > CONFIG.MAX_FILE_BYTES) {
      throw new Error(`圖片太大（${(file.size/1024/1024).toFixed(1)}MB）。目前先限制 ${(CONFIG.MAX_FILE_BYTES/1024/1024).toFixed(1)}MB，避免送出失敗。`);
    }
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("讀取圖片失敗"));
      fr.readAsDataURL(file);
    });
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

    const dataUrl = await fileToDataURL(f);
    fileState[fieldKey] = {
      dataUrl,
      filename: f.name || `${fieldKey}.jpg`,
      mime: f.type || "image/jpeg",
      bytes: f.size || 0
    };
    setPreview(previewSel, dataUrl);
    saveDraftSoon_();
  }

  function setPlan(plan) {
    const p = (plan === "premium") ? "premium" : "free";
    elPlan.value = p;

    segFree.classList.toggle("on", p === "free");
    segPremium.classList.toggle("on", p === "premium");

    // UI: premium 才顯示 photo3~5
    document.querySelectorAll(".morePhotos").forEach(el => {
      el.style.display = (p === "premium") ? "" : "none";
    });

    planHint.innerHTML = (p === "premium")
      ? "<b>精品設計：</b>7 底色；照片牆最多 5 張"
      : "<b>自由搭配：</b>5色 × 3版型 × 3紙感；照片牆最多 2 張";

    setStatus("已切換方案：" + (p === "premium" ? "精品設計" : "自由搭配"), "ok");
    saveDraftSoon_();
  }

  function collectFormData_() {
    const plan = elPlan.value || "free";

    // 基本欄位
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

    // 方案分流：free 只允許 photo1~2
    const allowPhotos = (plan === "premium") ? ["photo1","photo2","photo3","photo4","photo5"] : ["photo1","photo2"];

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
    const plan = elPlan.value || "free";
    const draft = {
      plan,
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
    saveDraftSoon_();
    setStatus("已填入示範資料（圖片請自行選）。", "ok");
  }

  async function onSubmit_(ev) {
    ev.preventDefault();

    try {
      elBtnSubmit.disabled = true;
      setStatus("送出中…（包含圖片會稍久）", "info");

      const payload = collectFormData_();

      // 最基本檢查：free/premium 分流要明確
      if (!payload.name) {
        setStatus("請至少填寫：姓名", "err");
        elBtnSubmit.disabled = false;
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
      r_id.textContent = id || "—";
      r_token.textContent = token || "—";
      r_card.textContent = clean_card_url;
      r_og.textContent = og_page_url;
      elResultBox.style.display = "";

      btnCopyCard.onclick = async () => {
        const ok = await copyText_(clean_card_url);
        setStatus(ok ? "已複製乾淨成品連結 ✅" : "已取消", ok ? "ok" : "info");
      };
      btnCopyOg.onclick = async () => {
        const ok = await copyText_(og_page_url);
        setStatus(ok ? "已複製 OG 交付連結 ✅" : "已取消", ok ? "ok" : "info");
      };

      setStatus("建立成功 ✅（若你已設定後台開通流程，名片狀態可能先是 inactive）", "ok");
      saveDraftNow_();

    } catch (err) {
      console.error(err);
      setStatus("送出失敗：" + (err && err.message ? err.message : String(err)), "err");
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
          setStatus(e.message || "讀取圖片失敗", "err");
        });
      });
    });
  }

  function bindTextAutosave_() {
    // 所有 input/textarea 變動就 autosave
    document.querySelectorAll("input,textarea").forEach(el => {
      el.addEventListener("input", saveDraftSoon_);
      el.addEventListener("change", saveDraftSoon_);
    });
  }

  function boot_() {
    // plan buttons
    segFree.addEventListener("click", () => setPlan("free"));
    segPremium.addEventListener("click", () => setPlan("premium"));

    // defaults
    setPlan("free");
    if ($("#line_oa") && !$("#line_oa").value) $("#line_oa").value = CONFIG.DEFAULT_LINE_OA;

    // bind
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

    // load draft
    loadDraft_();
  }

  document.addEventListener("DOMContentLoaded", boot_);
})();