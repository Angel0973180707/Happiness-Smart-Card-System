/* ================================
 * form.js — v498 (COMPLETE OVERWRITE)
 * - Free/Premium 分流（照片牆：free<=2 / premium<=5）
 * - ✅ 表單端圖片壓縮（Canvas）→ 降低 aborted / timeout
 * - 圖片：file -> (compress) -> dataURL(base64) -> GAS create
 * - POST: x-www-form-urlencoded (data=JSON) 避免 preflight
 * - Draft autosave (localStorage)（不存圖片）
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

    // 仍保留硬上限（避免極端大檔）
    HARD_MAX_FILE_BYTES: 12 * 1024 * 1024, // 12MB（原圖超大就先擋）
    // 壓縮後目標（非硬性，但作為提示）
    SOFT_MAX_IMAGE_BYTES: 900 * 1024 // 900KB
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

  const elImgTip = $("#imgTip");

  const FILE_FIELDS = [
    { key: "avatar", file: "#avatar_file", preview: "#avatarPreview" },
    { key: "logo",   file: "#logo_file",   preview: "#logoPreview"   },
    { key: "photo1", file: "#photo1_file", preview: "#photo1Preview" },
    { key: "photo2", file: "#photo2_file", preview: "#photo2Preview" },
    { key: "photo3", file: "#photo3_file", preview: "#photo3Preview" },
    { key: "photo4", file: "#photo4_file", preview: "#photo4Preview" },
    { key: "photo5", file: "#photo5_file", preview: "#photo5Preview" }
  ];

  // key -> {dataUrl, filename, mime, bytes, rawBytes, note}
  const fileState = {};

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
    const clean_card_url = `${base}?id=${encodeURIComponent(id)}&view=1`; // v498: 智慧名片成品
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

  function fmtBytes_(n) {
    const x = Number(n || 0);
    if (!isFinite(x) || x <= 0) return "0KB";
    const kb = x / 1024;
    if (kb < 1024) return `${kb.toFixed(kb < 100 ? 1 : 0)}KB`;
    return `${(kb / 1024).toFixed(1)}MB`;
  }

  function dataUrlBytes_(dataUrl) {
    try {
      if (!dataUrl || typeof dataUrl !== "string") return 0;
      const i = dataUrl.indexOf(",");
      if (i < 0) return 0;
      const b64 = dataUrl.slice(i + 1);
      // base64 size -> bytes (approx exact)
      const pad = (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
      return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
    } catch (_) {
      return 0;
    }
  }

  function updateImgTip_() {
    if (!elImgTip) return;
    const keys = Object.keys(fileState);
    let rawSum = 0;
    let outSum = 0;
    let count = 0;

    keys.forEach(k => {
      const st = fileState[k];
      if (!st || !st.dataUrl) return;
      count += 1;
      rawSum += Number(st.rawBytes || 0);
      outSum += Number(st.bytes || 0);
    });

    if (count <= 0) {
      elImgTip.textContent = "建議單張 ≤ 2.8MB（避免送出失敗）";
      return;
    }

    const hint =
      `已選 ${count} 張｜原始 ${fmtBytes_(rawSum)} → 壓縮後 ${fmtBytes_(outSum)}（越小越穩）`;
    elImgTip.textContent = hint;
  }

  // ---------- Image compress (Canvas) ----------
  function getCompressProfile_(fieldKey) {
    // ✅ 你要的：分角色壓縮，讓上傳穩
    if (fieldKey === "avatar") {
      return { maxEdge: 1080, quality: 0.85, mime: "image/jpeg" };
    }
    if (fieldKey === "logo") {
      return { maxEdge: 900, quality: 0.90, mime: "image/jpeg" };
    }
    // photo1~5
    return { maxEdge: 1600, quality: 0.82, mime: "image/jpeg" };
  }

  function loadImageFromBlob_(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("圖片載入失敗（無法解碼）"));
      };
      img.src = url;
    });
  }

  function canvasToBlob_(canvas, mime, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
  }

  function fileToDataURL_(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("轉換圖片失敗"));
      fr.readAsDataURL(blob);
    });
  }

  async function compressImageFile_(file, profile) {
    if (!file) return null;

    if (file.size > CONFIG.HARD_MAX_FILE_BYTES) {
      throw new Error(`圖片太大（${fmtBytes_(file.size)}）。請先壓縮或換小張一點再上傳。`);
    }

    // 直接載入原圖
    const img = await loadImageFromBlob_(file);

    // 計算縮放
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (!w || !h) throw new Error("讀取圖片尺寸失敗");

    const maxEdge = Math.max(1, Number(profile.maxEdge || 1600));
    const longEdge = Math.max(w, h);
    const scale = longEdge > maxEdge ? (maxEdge / longEdge) : 1;

    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    // Canvas 繪製
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 不支援");

    // 讓縮放更平滑
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 白底（避免透明 PNG 壓成 JPG 變黑）
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outW, outH);

    ctx.drawImage(img, 0, 0, outW, outH);

    // 先用 profile quality 轉 blob
    let mime = profile.mime || "image/jpeg";
    let quality = Math.min(0.95, Math.max(0.55, Number(profile.quality || 0.82)));

    let blob = await canvasToBlob_(canvas, mime, quality);
    if (!blob) throw new Error("壓縮輸出失敗");

    // 若仍過大：降品質再壓 2 次（不縮小尺寸，避免糊太多）
    for (let i = 0; i < 2; i++) {
      if (blob.size <= CONFIG.SOFT_MAX_IMAGE_BYTES) break;
      quality = Math.max(0.62, quality - 0.08);
      const b2 = await canvasToBlob_(canvas, mime, quality);
      if (b2) blob = b2;
    }

    const dataUrl = await fileToDataURL_(blob);

    return {
      dataUrl,
      outBytes: blob.size,
      outMime: mime,
      note: `scaled ${w}x${h} -> ${outW}x${outH}, q=${quality.toFixed(2)}`
    };
  }

  // ---------- UI + pick files ----------
  async function handlePickFile(fieldKey, fileInputSel, previewSel) {
    const el = $(fileInputSel);
    const f = el && el.files ? el.files[0] : null;

    if (!f) {
      fileState[fieldKey] = null;
      setPreview(previewSel, "");
      saveDraftSoon_();
      updateImgTip_();
      return;
    }

    // 壓縮提示
    setStatus("圖片處理中…（壓縮中）", "info");

    const profile = getCompressProfile_(fieldKey);
    const out = await compressImageFile_(f, profile);

    // out.dataUrl 是壓縮後
    const bytes = dataUrlBytes_(out.dataUrl);

    fileState[fieldKey] = {
      dataUrl: out.dataUrl,
      filename: (f.name || `${fieldKey}.jpg`).replace(/\.(png|webp|jpeg|jpg|heic|heif)$/i, ".jpg"),
      mime: out.outMime || "image/jpeg",
      bytes: bytes || out.outBytes || 0,
      rawBytes: f.size || 0,
      note: out.note || ""
    };

    setPreview(previewSel, out.dataUrl);
    saveDraftSoon_();
    updateImgTip_();

    // 若還是很大，提示但不阻擋
    if ((fileState[fieldKey].bytes || 0) > (CONFIG.SOFT_MAX_IMAGE_BYTES * 1.2)) {
      setStatus(`已壓縮，但仍偏大（${fmtBytes_(fileState[fieldKey].bytes)}）。建議換小張或再壓一次更穩。`, "info");
    } else {
      setStatus(`已處理：${fmtBytes_(fileState[fieldKey].rawBytes)} → ${fmtBytes_(fileState[fieldKey].bytes)}`, "ok");
    }
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

    // free 時若已選了 photo3~5：清掉（避免送出誤帶）
    if (p === "free") {
      ["photo3","photo4","photo5"].forEach(k => {
        const ff = FILE_FIELDS.find(x => x.key === k);
        if (!ff) return;
        const inp = $(ff.file);
        if (inp) inp.value = "";
        fileState[k] = null;
        setPreview(ff.preview, "");
      });
      updateImgTip_();
    }

    setStatus("已切換方案：" + (p === "premium" ? "精品設計" : "自由搭配"), "ok");
    saveDraftSoon_();
  }

  function collectFormData_() {
    const plan = elPlan.value || "free";

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

    const allowPhotos = (plan === "premium")
      ? ["photo1","photo2","photo3","photo4","photo5"]
      : ["photo1","photo2"];

    const files = {};
    ["avatar","logo"].forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    allowPhotos.forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });

    payload.files = files;
    return payload;
  }

  async function postCreate_(payload) {
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
    updateImgTip_();
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

  function validatePhotoCount_(payload) {
    const plan = payload.plan || "free";
    const files = payload.files || {};
    const photoKeys = ["photo1","photo2","photo3","photo4","photo5"].filter(k => !!files[k]?.dataUrl);
    const max = (plan === "premium") ? 5 : 2;
    if (photoKeys.length > max) {
      return `照片太多：已選 ${photoKeys.length} 張，但 ${plan === "premium" ? "精品" : "自由"}最多 ${max} 張。`;
    }
    return "";
  }

  async function onSubmit_(ev) {
    ev.preventDefault();

    try {
      elBtnSubmit.disabled = true;
      setStatus("送出中…（包含圖片會稍久）", "info");

      const payload = collectFormData_();

      if (!payload.name) {
        setStatus("請至少填寫：姓名", "err");
        elBtnSubmit.disabled = false;
        return;
      }

      const msg = validatePhotoCount_(payload);
      if (msg) {
        setStatus(msg, "err");
        elBtnSubmit.disabled = false;
        return;
      }

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
        setStatus(ok ? "已複製「智慧名片成品」連結 ✅" : "已取消", ok ? "ok" : "info");
      };
      btnCopyOg.onclick = async () => {
        const ok = await copyText_(og_page_url);
        setStatus(ok ? "已複製 OG 交付連結 ✅" : "已取消", ok ? "ok" : "info");
      };

      setStatus("建立成功 ✅", "ok");
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

  function bindTextAutosave_() {
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
    updateImgTip_();
  }

  document.addEventListener("DOMContentLoaded", boot_);
})();