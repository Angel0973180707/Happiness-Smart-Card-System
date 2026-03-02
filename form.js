/* ================================
 * form.js — v497 (COMPLETE OVERWRITE)
 * ✅ Plan split UI (free/premium)
 * ✅ Draft autosave (localStorage)
 * ✅ Image: file -> canvas compress -> dataURL -> GAS create
 * ✅ POST: x-www-form-urlencoded (data=JSON) (avoid preflight)
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

    // ✅ Canvas compress strategy (stable for mobile)
    MAX_EDGE: 1400,        // longest edge px
    JPEG_QUALITY: 0.82,    // 0~1
    MAX_DATAURL_KB: 620    // after encode (rough guard)
  };

  const $ = (sel) => document.querySelector(sel);

  const elForm = $("#cardForm");
  const elStatus = $("#statusBox");
  const elResultBox = $("#resultBox");
  const elBtnSubmit = $("#btnSubmit");
  const elBtnReset = $("#btnReset");
  const elBtnPing = $("#btnTestPing");
  const elBtnDemo = $("#btnFillDemo");

  // plan UI
  const segFree = $("#segFree");
  const segPremium = $("#segPremium");
  const boxFree = $("#boxFree");
  const boxPremium = $("#boxPremium");
  const morePhotos = $("#morePhotos");
  const elPlan = $("#plan");

  // result
  const r_id = $("#r_id");
  const r_token = $("#r_token");
  const r_card = $("#r_card");
  const r_og = $("#r_og");

  // file inputs + previews + url inputs
  const FILE_FIELDS = [
    { key: "avatar_img", file: "#avatar_file", preview: "#avatarPreview", url: "#avatar_img" },
    { key: "logo_img",   file: "#logo_file",   preview: "#logoPreview",   url: "#logo_img" },
    { key: "photo1_img", file: "#photo1_file", preview: "#photo1Preview", url: "#photo1_img" },
    { key: "photo2_img", file: "#photo2_file", preview: "#photo2Preview", url: "#photo2_img" },
    { key: "photo3_img", file: "#photo3_file", preview: "#photo3Preview", url: "#photo3_img" },
    { key: "photo4_img", file: "#photo4_file", preview: "#photo4Preview", url: "#photo4_img" },
    { key: "photo5_img", file: "#photo5_file", preview: "#photo5Preview", url: "#photo5_img" }
  ];

  // store compressed dataURL here (NOT original file)
  const imgData = {}; // { avatar_img: "data:image/jpeg;base64,...", ... }

  function setStatus(msg, type = "info") {
    elStatus.classList.remove("ok", "err");
    if (type === "ok") elStatus.classList.add("ok");
    if (type === "err") elStatus.classList.add("err");
    elStatus.textContent = msg;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function withTimeout(promise, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return {
      promise: Promise.race([
        promise,
        new Promise((_, rej) => ctrl.signal.addEventListener("abort", () => rej(new Error("Fetch timeout"))))
      ]).finally(() => clearTimeout(t))
    };
  }

  function trimOrEmpty(v) { return (v ?? "").toString().trim(); }

  function normalizeHttp_(s) {
    const v = trimOrEmpty(s);
    if (!v) return "";
    if (/^http:\/\//i.test(v)) return v.replace(/^http:\/\//i, "https://");
    return v;
  }

  function normalizeImageInput(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^data:image\//i.test(s)) return s; // keep dataURL
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[a-zA-Z0-9_-]{15,}$/.test(s)) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(s)}`;
    }
    return s;
  }

  function normalizeLineUrl(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    return s;
  }

  function deriveUrls(id, token) {
    const base = CONFIG.BASE_URL.replace(/\/+$/, "/");
    const clean_card_url = `${base}?id=${encodeURIComponent(id)}`;
    const og_page_url = `${base}share.html?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token || "")}`;
    return { clean_card_url, og_page_url };
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

  // ✅ Canvas compress (mobile-safe)
  async function compressToDataUrl(file) {
    if (!file) return "";

    const img = await readFileAsImage_(file);
    const { w, h } = fitContain_(img.naturalWidth, img.naturalHeight, CONFIG.MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(img, 0, 0, w, h);

    let q = CONFIG.JPEG_QUALITY;
    let out = canvas.toDataURL("image/jpeg", q);

    // rough guard: if still huge, lower quality gradually
    for (let i = 0; i < 4; i++) {
      const kb = Math.round(out.length / 1024);
      if (kb <= CONFIG.MAX_DATAURL_KB) break;
      q = Math.max(0.62, q - 0.08);
      out = canvas.toDataURL("image/jpeg", q);
    }
    return out;
  }

  function readFileAsImage_(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("圖片讀取失敗"));
      };
      img.src = url;
    });
  }

  function fitContain_(w, h, maxEdge) {
    if (!w || !h) return { w: 1, h: 1 };
    const max = Math.max(w, h);
    if (max <= maxEdge) return { w, h };
    const scale = maxEdge / max;
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }

  async function handlePickFile(fieldKey, fileInputSel, previewSel, urlSel) {
    const el = $(fileInputSel);
    const f = el && el.files ? el.files[0] : null;

    if (!f) {
      imgData[fieldKey] = "";
      setPreview(previewSel, "");
      saveDraftSoon_();
      return;
    }

    setStatus("處理圖片中（壓縮）...");
    const dataUrl = await compressToDataUrl(f);

    // preview uses compressed
    imgData[fieldKey] = dataUrl;
    setPreview(previewSel, dataUrl);

    // show hint in url input (optional)
    const urlEl = $(urlSel);
    if (urlEl) urlEl.value = "（已選圖片，送出會自動上傳）";

    setStatus("✅ 圖片已就緒（會在送出時上傳）", "ok");
    saveDraftSoon_();
  }

  function applyPlanUI(plan) {
    const isPremium = plan === "premium";
    elPlan.value = isPremium ? "premium" : "free";

    segFree.classList.toggle("active", !isPremium);
    segPremium.classList.toggle("active", isPremium);

    boxFree.style.display = isPremium ? "none" : "";
    boxPremium.style.display = isPremium ? "" : "none";

    // photos limit UI
    morePhotos.style.display = isPremium ? "" : "none";

    if (!isPremium) {
      // free: clear photo3~5
      ["photo3_img","photo4_img","photo5_img"].forEach(k => {
        imgData[k] = "";
        const urlEl = document.getElementById(k);
        if (urlEl) urlEl.value = "";
        const preview = document.getElementById(k.replace("_img","Preview"));
        if (preview) { preview.style.display="none"; preview.removeAttribute("src"); }
        const file = document.getElementById(k.replace("_img","_file"));
        if (file) file.value = "";
      });
    }

    saveDraftSoon_();
  }

  function buildPayload() {
    const plan = trimOrEmpty(elPlan.value) || "free";
    const isPremium = plan === "premium";

    const payload = {
      id: "",
      token: "",
      status: "inactive",
      tenant: trimOrEmpty($("#tenant").value),
      billing_status: "unpaid",
      created_at: "",
      updated_at: "",
      activated_at: "",
      inactivated_at: "",
      expired_at: "",
      expires_at: "",
      remind_at: "",
      reminded_at: "",
      form_ts: new Date().toISOString(),

      plan,
      color: isPremium ? "" : trimOrEmpty($("#color").value) || "c1",
      style: isPremium ? "" : trimOrEmpty($("#style").value) || "s1",
      paper: isPremium ? "" : trimOrEmpty($("#paper").value) || "f1",
      premium_color: isPremium ? (trimOrEmpty($("#premium_color").value) || "p1") : "",

      name: trimOrEmpty($("#name").value),
      unit: trimOrEmpty($("#unit").value),
      title: trimOrEmpty($("#title").value),
      slogan: trimOrEmpty($("#slogan").value),
      services: trimOrEmpty($("#services").value),
      experience: trimOrEmpty($("#experience").value),

      // Images: prefer selected file(compressed dataURL); else accept manual url/id
      avatar_img: imgData.avatar_img || normalizeImageInput($("#avatar_img").value),
      logo_img:   imgData.logo_img   || normalizeImageInput($("#logo_img").value),

      photo1_img: imgData.photo1_img || normalizeImageInput($("#photo1_img").value),
      photo2_img: imgData.photo2_img || normalizeImageInput($("#photo2_img").value),
      photo3_img: isPremium ? (imgData.photo3_img || normalizeImageInput($("#photo3_img").value)) : "",
      photo4_img: isPremium ? (imgData.photo4_img || normalizeImageInput($("#photo4_img").value)) : "",
      photo5_img: isPremium ? (imgData.photo5_img || normalizeImageInput($("#photo5_img").value)) : "",

      wechat_id: trimOrEmpty($("#wechat_id").value),
      line_url: normalizeLineUrl($("#line_url").value),
      line_oa: trimOrEmpty($("#line_oa").value) || CONFIG.DEFAULT_LINE_OA,
      email: trimOrEmpty($("#email").value),
      phone: trimOrEmpty($("#phone").value),
      address: trimOrEmpty($("#address").value),

      video1: normalizeHttp_($("#video1").value),
      video2: normalizeHttp_($("#video2").value),
      video3: normalizeHttp_($("#video3").value),
      social1: normalizeHttp_($("#social1").value),
      social2: normalizeHttp_($("#social2").value),
      social3: normalizeHttp_($("#social3").value)
    };

    if (!payload.name) throw new Error("姓名（name）必填");
    return payload;
  }

  async function postCreate(payload) {
    const gas = trimOrEmpty(CONFIG.GAS);
    if (!gas) throw new Error("請先設定 CONFIG.GAS 為你的 GAS WebApp /exec");

    const url = `${gas}${gas.includes("?") ? "&" : "?"}action=create`;

    const body = new URLSearchParams();
    body.append("data", JSON.stringify(payload));

    for (let attempt = 0; attempt <= CONFIG.RETRY; attempt++) {
      try {
        const req = withTimeout(fetch(url, {
          method: "POST",
          body
        }), CONFIG.FETCH_TIMEOUT_MS);

        const res = await req.promise;
        const text = await res.text();

        let data;
        try { data = JSON.parse(text); }
        catch { throw new Error(`回應不是 JSON：${text.slice(0, 220)}`); }

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${data?.message || "Request failed"}`);
        if (!data || data.ok !== true) throw new Error(data?.message || "create 失敗（ok!=true）");

        return data;
      } catch (err) {
        if (attempt < CONFIG.RETRY) { await sleep(350); continue; }
        throw err;
      }
    }
    throw new Error("create 失敗（unknown）");
  }

  function showResult({ id, token, clean_card_url, og_page_url }) {
    r_id.textContent = id || "-";
    r_token.textContent = token || "-";
    r_card.textContent = clean_card_url || "-";
    r_og.textContent = og_page_url || "-";
    elResultBox.style.display = "";
  }

  async function copyText(text) {
    const s = trimOrEmpty(text);
    if (!s) return false;

    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  }

  function wireCopyPills() {
    document.addEventListener("click", async (e) => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      const sel = pill.getAttribute("data-copy");
      if (!sel) return;
      const el = $(sel);
      if (!el) return;
      const ok = await copyText(el.textContent || "");
      setStatus(ok ? "✅ 已複製到剪貼簿" : "⚠️ 複製失敗（請手動複製）", ok ? "ok" : "err");
    });
  }

  function fillDefaultLineOA() {
    const el = $("#line_oa");
    if (el && !trimOrEmpty(el.value)) el.value = CONFIG.DEFAULT_LINE_OA;
  }

  function fillDemo() {
    applyPlanUI("free");
    $("#tenant").value = "T001";
    $("#name").value = "王小明";
    $("#unit").value = "天使幸福智慧名片館";
    $("#title").value = "館長";
    $("#slogan").value = "心裡有愛，家永遠在";
    $("#services").value = "幸福教養, 智慧名片, 顧問";
    $("#experience").value = "把幸福感做成可被分享的日常。\n用一張名片，把信賴與接納帶回家。";
    $("#line_url").value = "@mylineid";
    $("#wechat_id").value = "a0973180707";
    $("#phone").value = "0973-180-707";
    $("#address").value = "高雄市";
    $("#video1").value = "https://www.youtube.com/";
    $("#social1").value = "https://www.facebook.com/";
    fillDefaultLineOA();
    setStatus("已填入示範資料。你可直接選圖後送出。");
    saveDraftSoon_();
  }

  async function ping() {
    const gas = trimOrEmpty(CONFIG.GAS);
    if (!gas) { setStatus("請先設定 CONFIG.GAS。", "err"); return; }
    const url = `${gas}${gas.includes("?") ? "&" : "?"}action=ping`;
    try {
      setStatus("測試 ping 中...");
      const req = withTimeout(fetch(url, { method: "GET" }), 12000);
      const res = await req.promise;
      const t = await res.text();
      setStatus(`ping 回應：\n${t.slice(0, 500)}`, "ok");
    } catch (e) {
      setStatus(`ping 失敗：${e.message}`, "err");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      elBtnSubmit.disabled = true;
      elBtnSubmit.textContent = "送出中...";

      fillDefaultLineOA();
      const payload = buildPayload();

      setStatus(
        "送出 create 中...\n" +
        "（v497：圖片先壓縮，再以 dataURL 送出；GAS 會存到 Drive 並回填 URL）"
      );

      const data = await postCreate(payload);

      const item = data.item || {};
      const id = item.id || data.id || "";
      const token = item.token || data.token || "";

      const derived = deriveUrls(id, token);
      const clean_card_url = data.clean_card_url || item.clean_card_url || derived.clean_card_url;
      const og_page_url = data.og_page_url || item.og_page_url || derived.og_page_url;

      showResult({ id, token, clean_card_url, og_page_url });

      // create success -> clear draft (optional)
      localStorage.removeItem(CONFIG.DRAFT_KEY);

      setStatus(
        "✅ 建立成功（create）\n" +
        `id: ${id}\n` +
        `token: ${token}\n` +
        `名片: ${clean_card_url}\n` +
        `OG頁: ${og_page_url}`,
        "ok"
      );
    } catch (err) {
      setStatus(`❌ 建立失敗：${err.message}`, "err");
    } finally {
      elBtnSubmit.disabled = false;
      elBtnSubmit.textContent = "送出建立";
    }
  }

  function handleReset() {
    elForm.reset();
    fillDefaultLineOA();
    elResultBox.style.display = "none";

    // clear previews + imgData
    FILE_FIELDS.forEach(f => {
      imgData[f.key] = "";
      setPreview(f.preview, "");
      const u = $(f.url);
      if (u) u.value = "";
      const fi = $(f.file);
      if (fi) fi.value = "";
    });

    localStorage.removeItem(CONFIG.DRAFT_KEY);
    applyPlanUI("free");
    setStatus("已清空。");
  }

  // ===================== Draft autosave =====================
  let __saveT = null;

  function collectDraft_() {
    const ids = [
      "plan","name","tenant","unit","title","slogan","services","experience",
      "color","style","paper","premium_color",
      "line_url","wechat_id","email","phone","address","line_oa",
      "video1","video2","video3","social1","social2","social3",
      "avatar_img","logo_img","photo1_img","photo2_img","photo3_img","photo4_img","photo5_img"
    ];

    const draft = { _v: CONFIG.VERSION, _ts: Date.now() };

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      draft[id] = el.value ?? "";
    });

    // store compressed images (dataURL) too (so draft can restore)
    draft.__imgData = {};
    Object.keys(imgData).forEach(k => {
      draft.__imgData[k] = imgData[k] || "";
    });

    return draft;
  }

  function applyDraft_(draft) {
    if (!draft || typeof draft !== "object") return;

    const plan = (draft.plan || "free").toString();
    applyPlanUI(plan);

    Object.keys(draft).forEach(k => {
      if (k === "__imgData" || k.startsWith("_")) return;
      const el = document.getElementById(k);
      if (!el) return;
      el.value = draft[k];
    });

    // restore previews from saved compressed images
    const saved = draft.__imgData || {};
    FILE_FIELDS.forEach(f => {
      const d = saved[f.key] || "";
      imgData[f.key] = d;
      setPreview(f.preview, d);
      if (d) {
        const u = $(f.url);
        if (u) u.value = "（已暫存圖片，送出會自動上傳）";
      }
    });

    fillDefaultLineOA();
  }

  function saveDraftSoon_() {
    clearTimeout(__saveT);
    __saveT = setTimeout(() => {
      try {
        const d = collectDraft_();
        localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(d));
      } catch {}
    }, CONFIG.AUTOSAVE_DEBOUNCE_MS);
  }

  function wireAutosave_() {
    elForm.addEventListener("input", saveDraftSoon_);
    elForm.addEventListener("change", saveDraftSoon_);
  }

  function loadDraft_() {
    try {
      const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      applyDraft_(d);
      setStatus("✅ 已載入上次未完成內容（已暫存）", "ok");
    } catch {}
  }

  // ===================== Init =====================
  function init() {
    fillDefaultLineOA();
    wireCopyPills();
    wireAutosave_();

    // plan buttons
    segFree.addEventListener("click", () => applyPlanUI("free"));
    segPremium.addEventListener("click", () => applyPlanUI("premium"));

    // file pick handlers
    FILE_FIELDS.forEach(f => {
      const el = $(f.file);
      if (!el) return;
      el.addEventListener("change", () => handlePickFile(f.key, f.file, f.preview, f.url).catch(err => {
        setStatus(`❌ 圖片處理失敗：${err.message}`, "err");
      }));
    });

    elForm.addEventListener("submit", handleSubmit);
    elBtnReset.addEventListener("click", handleReset);
    elBtnPing.addEventListener("click", ping);
    elBtnDemo.addEventListener("click", fillDemo);

    loadDraft_();

    setStatus(
      "準備就緒。\n" +
      `版本：${CONFIG.VERSION}\n` +
      "你可直接「選圖片」→「送出建立」。"
    );
  }

  document.addEventListener("DOMContentLoaded", init);
})();