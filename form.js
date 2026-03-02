/* ================================
 * form.js — v498 (COMPLETE OVERWRITE)
 * - Plan split: free / premium
 * - Free options: color(c1~c5) / style(s1~s3) / paper(f1~f3)
 * - Premium options: premium_color(p1~p7)
 * - Photos limit: free <=2, premium <=5 (UI + submit check)
 * - Image compress (Canvas) before upload (no external service)
 * - POST x-www-form-urlencoded: action=create & data=JSON (avoid preflight)
 * - Draft autosave (localStorage)
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

    // 你說「先穩穩收錢」：先把送出穩起來
    // 壓縮後目標：長邊 <= 1600，JPEG 品質 0.86（通常 < 700KB~1.5MB）
    IMG_MAX_DIM: 1600,
    IMG_QUALITY: 0.86,

    // ✅ 不用卡 2.8MB 了（因為前端壓縮），但仍做保護：
    // 原始檔如果極端巨大（>25MB）先擋一下
    MAX_ORIGINAL_BYTES: 25 * 1024 * 1024
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

  // v498 options
  const freeOptionsBox = $("#freeOptions");
  const premiumOptionsBox = $("#premiumOptions");

  const elColor = $("#color");
  const elStyle = $("#style");
  const elPaper = $("#paper");
  const elPremiumColor = $("#premium_color");

  // result fields
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

  // key -> {dataUrl, filename, mime, bytes, originalBytes}
  const fileState = {};

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

  function deriveUrls(id, token, planParams) {
    const base = CONFIG.BASE_URL.replace(/\/+$/, "/");

    // 成品：保留 view=1（你說不一定改檔名/URL）
    // ✅ 同時把 plan/theme 參數也帶上（為後續全鏈同步鋪路）
    const qp = new URLSearchParams({ id: id || "TW0001", view: "1" });
    if (planParams) {
      Object.keys(planParams).forEach(k => {
        if (planParams[k]) qp.set(k, planParams[k]);
      });
    }
    const clean_card_url = `${base}?${qp.toString()}`;

    // OG：share.html 一樣帶 plan 參數（同步）
    const qp2 = new URLSearchParams({ id: id || "TW0001" });
    if (token) qp2.set("token", token);
    if (planParams) {
      Object.keys(planParams).forEach(k => {
        if (planParams[k]) qp2.set(k, planParams[k]);
      });
    }
    const og_page_url = `${base}share.html?${qp2.toString()}`;
    return { clean_card_url, og_page_url };
  }

  // =========================
  // Image compress helpers
  // =========================
  function fileToImage_(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("圖片載入失敗"));
      };
      img.src = url;
    });
  }

  function canvasToDataURL_(canvas, mime, quality) {
    try {
      return canvas.toDataURL(mime, quality);
    } catch (_) {
      // fallback
      return canvas.toDataURL("image/jpeg", quality);
    }
  }

  async function compressImageToDataURL_(file, maxDim, quality) {
    if (!file) return null;

    if (file.size > CONFIG.MAX_ORIGINAL_BYTES) {
      throw new Error(`原始圖片過大（${(file.size/1024/1024).toFixed(1)}MB），請先縮小後再上傳。`);
    }

    const img = await fileToImage_(file);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // 不處理極端/壞檔
    if (!w || !h) throw new Error("圖片尺寸讀取失敗");

    const scale = Math.min(1, maxDim / Math.max(w, h));
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;

    const ctx = canvas.getContext("2d", { alpha: false });
    // iOS Safari 更穩：先填白底
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, nw, nh);

    // 高品質縮放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, nw, nh);

    // 優先輸出 jpeg（避免 png 過大）
    const dataUrl = canvasToDataURL_(canvas, "image/jpeg", quality);
    return dataUrl;
  }

  function dataUrlBytes_(dataUrl) {
    // approximate bytes
    const base64 = String(dataUrl || "").split(",")[1] || "";
    return Math.floor((base64.length * 3) / 4);
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

    setStatus("圖片處理中…（壓縮中）", "info");

    const dataUrl = await compressImageToDataURL_(f, CONFIG.IMG_MAX_DIM, CONFIG.IMG_QUALITY);

    fileState[fieldKey] = {
      dataUrl,
      filename: (f.name || `${fieldKey}.jpg`).replace(/\.(png|webp|jpeg)$/i, ".jpg"),
      mime: "image/jpeg",
      bytes: dataUrlBytes_(dataUrl),
      originalBytes: f.size || 0
    };

    setPreview(previewSel, dataUrl);
    saveDraftSoon_();
    setStatus("圖片已就緒 ✅", "ok");

    // 方案限制：free 若選了 photo3~5，立刻清掉提示
    enforcePhotoLimitUI_();
  }

  // =========================
  // Plan + options
  // =========================
  function setPlan(plan) {
    const p = (plan === "premium") ? "premium" : "free";
    elPlan.value = p;

    segFree.classList.toggle("on", p === "free");
    segPremium.classList.toggle("on", p === "premium");

    // 顯示選項區
    if (freeOptionsBox) freeOptionsBox.style.display = (p === "free") ? "" : "none";
    if (premiumOptionsBox) premiumOptionsBox.style.display = (p === "premium") ? "" : "none";

    // UI: premium 才顯示 photo3~5
    document.querySelectorAll(".morePhotos").forEach(el => {
      el.style.display = (p === "premium") ? "" : "none";
    });

    if (planHint) {
      planHint.innerHTML = (p === "premium")
        ? "<b>精品設計：</b>7 底色；照片牆最多 5 張"
        : "<b>自由搭配：</b>5色 × 3版型 × 3紙感；照片牆最多 2 張";
    }

    setStatus("已切換方案：" + (p === "premium" ? "精品設計" : "自由搭配"), "ok");
    saveDraftSoon_();

    enforcePhotoLimitUI_();
  }

  function enforcePhotoLimitUI_() {
    const plan = elPlan.value || "free";
    if (plan !== "free") return;

    // free: 清掉 photo3~5 的 file + state + preview
    ["photo3","photo4","photo5"].forEach(k => {
      const ff = FILE_FIELDS.find(x => x.key === k);
      if (!ff) return;
      const inp = $(ff.file);
      if (inp) inp.value = "";
      fileState[k] = null;
      setPreview(ff.preview, "");
    });
  }

  function collectPlanParams_() {
    const plan = elPlan.value || "free";

    if (plan === "premium") {
      return {
        plan: "premium",
        p: trimOrEmpty(elPremiumColor?.value || "p1")
      };
    }

    return {
      plan: "free",
      c: trimOrEmpty(elColor?.value || "c1"),
      s: trimOrEmpty(elStyle?.value || "s1"),
      f: trimOrEmpty(elPaper?.value || "f1")
    };
  }

  // =========================
  // Payload
  // =========================
  function collectFormData_() {
    const plan = elPlan.value || "free";
    const planParams = collectPlanParams_();

    const payload = {
      plan, // 必留
      // ✅ v498：寫入 DB 欄位（不改 GAS，只要前端 payload 有就能寫進 card_db）
      color: plan === "free" ? (elColor?.value || "c1") : "",
      style: plan === "free" ? (elStyle?.value || "s1") : "",
      paper: plan === "free" ? (elPaper?.value || "f1") : "",
      premium_color: plan === "premium" ? (elPremiumColor?.value || "p1") : "",

      // 基本欄位
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
      line_oa: normalizeUrl($("#line_oa")?.value) || CONFIG.DEFAULT_LINE_OA,

      // v498 可擴充（先留空，不傷 GAS）
      wechat_id: trimOrEmpty($("#wechat_id")?.value || "")
    };

    // 方案分流：free 只允許 photo1~2
    const allowPhotos = (plan === "premium")
      ? ["photo1","photo2","photo3","photo4","photo5"]
      : ["photo1","photo2"];

    const files = {};
    ["avatar","logo"].forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    allowPhotos.forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    payload.files = files;

    // 回傳給結果連結用（不進 DB 也沒差）
    payload.__planParams = planParams;

    return payload;
  }

  function validateBeforeSubmit_(payload) {
    if (!payload.name) return "請至少填寫：姓名";

    // free: 必須選 color/style/paper
    if (payload.plan === "free") {
      if (!payload.color || !payload.style || !payload.paper) {
        return "自由搭配需要選：顏色 / 版型 / 紙感";
      }
    }

    // premium: 必須選 premium_color
    if (payload.plan === "premium") {
      if (!payload.premium_color) {
        return "精品設計需要選：底色";
      }
    }

    // 照片限制：free 不得有 photo3~5
    if (payload.plan === "free") {
      const bad = ["photo3","photo4","photo5"].some(k => !!payload.files?.[k]);
      if (bad) return "自由搭配照片牆最多 2 張（照片1～2），請移除照片3～5";
    }

    // 頭像建議（非硬性）
    return "";
  }

  // =========================
  // Networking
  // =========================
  async function postCreate_(payload) {
    // 避免 preflight：x-www-form-urlencoded
    const body = new URLSearchParams();
    body.set("action", "create");

    // ⚠️ payload.__planParams 不送到 GAS（避免污染 DB）
    const clean = { ...payload };
    delete clean.__planParams;

    body.set("data", JSON.stringify(clean));

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

  // =========================
  // Draft (no images)
  // =========================
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
        color: elColor?.value || "c1",
        style: elStyle?.value || "s1",
        paper: elPaper?.value || "f1",
        premium_color: elPremiumColor?.value || "p1"
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
        line_oa: $("#line_oa")?.value || "",
        wechat_id: $("#wechat_id")?.value || ""
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

      const opt = d.options || {};
      if (elColor && opt.color) elColor.value = opt.color;
      if (elStyle && opt.style) elStyle.value = opt.style;
      if (elPaper && opt.paper) elPaper.value = opt.paper;
      if (elPremiumColor && opt.premium_color) elPremiumColor.value = opt.premium_color;

      const f = (d.fields || {});
      Object.keys(f).forEach(k => {
        const el = document.getElementById(k);
        if (el) el.value = f[k] || "";
      });

      setStatus("已載入上次草稿（不含圖片）。", "ok");
    } catch(_) {}
  }

  function clearAll_() {
    // clear text
    ["name","unit","title","phone","email","website","address","slogan","services","experience","line_url","line_oa","wechat_id"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // reset options
    if (elColor) elColor.value = "c1";
    if (elStyle) elStyle.value = "s1";
    if (elPaper) elPaper.value = "f1";
    if (elPremiumColor) elPremiumColor.value = "p1";

    // clear images
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

    // demo options
    setPlan("free");
    if (elColor) elColor.value = "c3";
    if (elStyle) elStyle.value = "s2";
    if (elPaper) elPaper.value = "f1";

    saveDraftSoon_();
    setStatus("已填入示範資料（圖片請自行選）。", "ok");
  }

  async function onSubmit_(ev) {
    ev.preventDefault();

    try {
      elBtnSubmit.disabled = true;
      setStatus("送出中…（圖片已壓縮，仍需一點時間）", "info");

      const payload = collectFormData_();
      const msg = validateBeforeSubmit_(payload);
      if (msg) {
        setStatus(msg, "err");
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

      const { clean_card_url, og_page_url } = deriveUrls(id || "TW0001", token, payload.__planParams || null);

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

      setStatus("建立成功 ✅（若你後台開通流程是 inactive 起步，屬正常）", "ok");
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
          setStatus(e.message || "圖片處理失敗", "err");
        });
      });
    });
  }

  function bindAutosave_() {
    document.querySelectorAll("input,textarea,select").forEach(el => {
      el.addEventListener("input", saveDraftSoon_);
      el.addEventListener("change", saveDraftSoon_);
    });
  }

  function boot_() {
    // plan buttons
    segFree?.addEventListener("click", () => setPlan("free"));
    segPremium?.addEventListener("click", () => setPlan("premium"));

    // defaults
    setPlan("free");
    if ($("#line_oa") && !$("#line_oa").value) $("#line_oa").value = CONFIG.DEFAULT_LINE_OA;

    // bind
    bindFiles_();
    bindAutosave_();
    elForm?.addEventListener("submit", onSubmit_);

    elBtnReset?.addEventListener("click", clearAll_);
    elBtnDemo?.addEventListener("click", fillDemo_);

    elBtnPing?.addEventListener("click", async () => {
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