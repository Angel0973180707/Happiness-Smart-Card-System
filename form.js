/* ================================
 * form.js — v498 (COMPLETE OVERWRITE)
 * FIX v498:
 * 1) Mobile 上傳圖常超時 -> 改「前端壓縮」+「有圖時 timeout 拉長」
 * 2) 圖片：file -> (compress) -> dataURL(base64) -> GAS create
 * 3) POST: x-www-form-urlencoded (data=JSON) 避免 preflight
 * 4) Draft autosave（不存圖片 dataURL）
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v498",

    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    DEFAULT_LINE_OA: "https://lin.ee/G3VJoRm",

    // ✅ 沒圖：20s；有圖：90s（手機才不會被 abort）
    FETCH_TIMEOUT_MS_NOIMG: 20000,
    FETCH_TIMEOUT_MS_IMG: 90000,
    RETRY: 1,

    DRAFT_KEY: "angel_card_draft_v498",
    AUTOSAVE_DEBOUNCE_MS: 380,

    // ✅ 原始檔容許更大（會壓縮），避免你手機照片常常 > 2.8MB
    MAX_ORIGINAL_BYTES: 12 * 1024 * 1024, // 12MB

    // ✅ 壓縮輸出目標（可再調）
    COMPRESS: {
      avatar: { maxW: 900,  maxH: 900,  quality: 0.82 },
      logo:   { maxW: 900,  maxH: 900,  quality: 0.85 },
      photo:  { maxW: 1280, maxH: 1280, quality: 0.82 }
    }
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

  // v498 options (如果你的 form.html 沒有這些 select，也不會壞)
  const elColor = $("#color");
  const elStyle = $("#style");
  const elPaper = $("#paper");
  const elPremiumColor = $("#premium_color");

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

  // key -> {dataUrl, filename, mime, bytes, note}
  const fileState = {};

  function setStatus(msg, type = "info") {
    if (!elStatus) return;
    elStatus.classList.remove("ok", "err");
    if (type === "ok") elStatus.classList.add("ok");
    if (type === "err") elStatus.classList.add("err");
    elStatus.textContent = msg;
    try { elStatus.scrollIntoView({ behavior:"smooth", block:"center" }); } catch(_) {}
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

  function hasAnyImage_() {
    return Object.values(fileState).some(v => v && v.dataUrl);
  }

  function countPickedPhotos_() {
    const keys = ["photo1","photo2","photo3","photo4","photo5"];
    let n = 0;
    keys.forEach(k => { if (fileState[k]?.dataUrl) n++; });
    return n;
  }

  // ---------- Image compress ----------
  function dataUrlByteLength_(dataUrl) {
    try {
      const i = dataUrl.indexOf(",");
      if (i < 0) return 0;
      const b64 = dataUrl.slice(i + 1);
      // base64 -> bytes approx
      const pad = (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
      return Math.max(0, Math.floor(b64.length * 3 / 4) - pad);
    } catch (_) { return 0; }
  }

  async function readFileAsDataURL_(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("讀取圖片失敗"));
      fr.readAsDataURL(file);
    });
  }

  async function loadImageBitmap_(file) {
    // Prefer createImageBitmap (faster, less memory)
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file);
      } catch (_) {}
    }
    // Fallback: Image + objectURL
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("圖片載入失敗"));
        im.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function compressImageToDataURL_(file, preset) {
    // 若不是圖片，直接原樣
    if (!file || !file.type || !file.type.startsWith("image/")) {
      return await readFileAsDataURL_(file);
    }

    const bmp = await loadImageBitmap_(file);
    const sw = bmp.width || bmp.naturalWidth || 0;
    const sh = bmp.height || bmp.naturalHeight || 0;
    if (!sw || !sh) return await readFileAsDataURL_(file);

    const maxW = preset.maxW;
    const maxH = preset.maxH;
    const scale = Math.min(1, maxW / sw, maxH / sh);
    const tw = Math.max(1, Math.round(sw * scale));
    const th = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d", { alpha: false });

    // 更穩定的縮圖品質
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // draw
    ctx.drawImage(bmp, 0, 0, tw, th);

    // 統一輸出 JPEG（更小）
    const q = preset.quality;
    const dataUrl = canvas.toDataURL("image/jpeg", q);

    return dataUrl;
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
      throw new Error(`原圖太大（${bytesToMB(f.size)}MB），請換小一點的檔案（上限 ${bytesToMB(CONFIG.MAX_ORIGINAL_BYTES)}MB）。`);
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

  // ---------- Plan ----------
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

    // free 模式時，保險清掉 photo3~5（避免送出夾帶）
    if (p !== "premium") {
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

    setStatus("已切換方案：" + (p === "premium" ? "精品設計" : "自由搭配"), "ok");
    saveDraftSoon_();
  }

  function collectFormData_() {
    const plan = elPlan.value || "free";

    const payload = {
      plan,

      // ✅ 外觀參數：一定帶（成品連動靠它）
      color: plan === "free" ? trimOrEmpty(elColor?.value) : "",
      style: plan === "free" ? trimOrEmpty(elStyle?.value) : "",
      paper: plan === "free" ? trimOrEmpty(elPaper?.value) : "",
      premium_color: plan === "premium" ? trimOrEmpty(elPremiumColor?.value) : "",

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
      line_oa: normalizeUrl($("#line_oa")?.value) || CONFIG.DEFAULT_LINE_OA
    };

    const allowPhotos = (plan === "premium")
      ? ["photo1","photo2","photo3","photo4","photo5"]
      : ["photo1","photo2"];

    const files = {};
    // avatar/logo always
    ["avatar","logo"].forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    allowPhotos.forEach(k => { if (fileState[k]?.dataUrl) files[k] = fileState[k]; });
    payload.files = files;

    // ✅ 雙通道：同時提供 *_img（有些 GAS 只吃這種欄位）
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
      options: {
        color: elColor?.value || "c3",
        style: elStyle?.value || "s1",
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
    if (elResultBox) elResultBox.style.display = "none";
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

      const payload = collectFormData_();
      const err = validate_(payload);
      if (err) {
        setStatus(err, "err");
        elBtnSubmit.disabled = false;
        return;
      }

      const timeoutMs = hasAnyImage_() ? CONFIG.FETCH_TIMEOUT_MS_IMG : CONFIG.FETCH_TIMEOUT_MS_NOIMG;
      setStatus(`送出中…（${hasAnyImage_() ? "含圖片" : "無圖片"}｜timeout=${Math.round(timeoutMs/1000)}s）`, "info");

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

      if (r_id) r_id.textContent = id || "—";
      if (r_token) r_token.textContent = token || "—";
      if (r_card) r_card.textContent = clean_card_url;
      if (r_og) r_og.textContent = og_page_url;
      if (elResultBox) elResultBox.style.display = "";

      if (btnCopyCard) btnCopyCard.onclick = async () => {
        const ok = await copyText_(clean_card_url);
        setStatus(ok ? "已複製智慧名片成品連結 ✅" : "已取消", ok ? "ok" : "info");
      };
      if (btnCopyOg) btnCopyOg.onclick = async () => {
        const ok = await copyText_(og_page_url);
        setStatus(ok ? "已複製 OG 交付連結 ✅" : "已取消", ok ? "ok" : "info");
      };

      setStatus("建立成功 ✅（已壓縮圖片並送出）", "ok");
      saveDraftNow_();

      try { elResultBox.scrollIntoView({ behavior:"smooth", block:"start" }); } catch(_) {}

    } catch (err) {
      console.error(err);
      // ✅ AbortError 友善提示
      const msg = (err && err.name === "AbortError")
        ? "送出超時（手機網路/圖片仍偏大）。已改壓縮後，請再送一次。"
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