/* ================================
 * form.js — v498 (COMPLETE OVERWRITE)
 * - 表單端壓縮（Canvas）
 * - 送出「三種相容格式」避免 GAS 忽略照片
 * - 結果區置底 + 自動滑到底
 * - 成功後不顯示 token/連結，改顯示 LINE OA 按鈕引導確認
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v498",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_LINE_OA: "https://lin.ee/G3VJoRm",
    FETCH_TIMEOUT_MS: 45000,
    RETRY: 1,

    // 壓縮策略（手機友善）
    MAX_EDGE: 1600,          // 最長邊
    JPEG_QUALITY: 0.84,      // 品質
    MAX_OUT_BYTES: 900 * 1024, // 目標 <= 900KB/張（降低 fetch 中斷）
    HARD_LIMIT_BYTES: 2.8 * 1024 * 1024, // 仍做保護，避免超爆

    AUTOSAVE_DEBOUNCE_MS: 380,
    DRAFT_KEY: "hsc_form_draft_v498"
  };

  const $ = (sel) => document.querySelector(sel);

  // 容錯：有些元素可能不存在，不要整支 JS 爆掉
  const elForm = $("#cardForm") || document.querySelector("form");
  const elStatus = $("#statusBox");
  const elResultBox = $("#resultBox");

  const elBtnSubmit = $("#btnSubmit") || document.querySelector('[type="submit"]');
  const elBtnReset  = $("#btnReset");
  const elBtnPing   = $("#btnTestPing");
  const elBtnDemo   = $("#btnFillDemo");

  const segFree = $("#segFree");
  const segPremium = $("#segPremium");
  const elPlan = $("#plan");

  const planHint = $("#planHint");

  // 結果區（你若 HTML 沒有這些 id，也不會報錯）
  const r_id = $("#r_id");
  const r_token = $("#r_token");
  const r_card = $("#r_card");
  const r_og = $("#r_og");
  const btnCopyCard = $("#btnCopyCard");
  const btnCopyOg = $("#btnCopyOg");

  // ✅ 成功後顯示 LINE OA 引導確認（HTML 可先不用改，只要有這個容器就會顯示）
  const confirmBox = $("#confirmBox");      // 建議你在 form.html 加一個 <div id="confirmBox"></div>
  const confirmBtn = $("#confirmLineOaBtn"); // 或 <a id="confirmLineOaBtn"></a>

  const FILE_KEYS = ["avatar","logo","photo1","photo2","photo3","photo4","photo5"];

  // 支援多種 selector（避免你 HTML id 有一點差，就整個收不到）
  const FILE_SELECTOR_MAP = {
    avatar: ["#avatar_file","#avatar","input[name='avatar']","input[data-key='avatar']"],
    logo:   ["#logo_file","#logo","input[name='logo']","input[data-key='logo']"],
    photo1: ["#photo1_file","#photo1","input[name='photo1']","input[data-key='photo1']"],
    photo2: ["#photo2_file","#photo2","input[name='photo2']","input[data-key='photo2']"],
    photo3: ["#photo3_file","#photo3","input[name='photo3']","input[data-key='photo3']"],
    photo4: ["#photo4_file","#photo4","input[name='photo4']","input[data-key='photo4']"],
    photo5: ["#photo5_file","#photo5","input[name='photo5']","input[data-key='photo5']"],
  };

  const PREVIEW_SELECTOR_MAP = {
    avatar: ["#avatarPreview","img[data-preview='avatar']"],
    logo:   ["#logoPreview","img[data-preview='logo']"],
    photo1: ["#photo1Preview","img[data-preview='photo1']"],
    photo2: ["#photo2Preview","img[data-preview='photo2']"],
    photo3: ["#photo3Preview","img[data-preview='photo3']"],
    photo4: ["#photo4Preview","img[data-preview='photo4']"],
    photo5: ["#photo5Preview","img[data-preview='photo5']"],
  };

  const fileState = {}; // key -> {dataUrl, filename, mime, bytes}

  function pickEl_(selectors) {
    for (const s of selectors || []) {
      const el = $(s);
      if (el) return el;
    }
    return null;
  }

  function setStatus(msg, type = "info") {
    if (!elStatus) return;
    elStatus.classList.remove("ok","err");
    if (type === "ok") elStatus.classList.add("ok");
    if (type === "err") elStatus.classList.add("err");
    elStatus.textContent = msg;
  }

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function withTimeout(ms){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), ms);
    return { signal: ctrl.signal, done: () => clearTimeout(t) };
  }

  function trimOrEmpty(v){ return (v ?? "").toString().trim(); }

  function normalizeUrl(raw){
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    return s;
  }

  function normalizeLineUrl(raw){
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    return s; // allow @id
  }

  // ============ 壓縮核心 ============
  async function fileToCompressedDataURL(file){
    if (!file) return null;
    if (file.size > CONFIG.HARD_LIMIT_BYTES) {
      throw new Error(`圖片太大（${(file.size/1024/1024).toFixed(1)}MB）。請先換小一點或壓縮後再傳。`);
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("讀取圖片失敗"));
      fr.readAsDataURL(file);
    });

    // 非圖片直接回傳
    if (!/^data:image\//i.test(dataUrl)) return dataUrl;

    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("圖片解析失敗"));
      im.src = dataUrl;
    });

    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return dataUrl;

    let scale = 1;
    const maxEdge = Math.max(w0, h0);
    if (maxEdge > CONFIG.MAX_EDGE) scale = CONFIG.MAX_EDGE / maxEdge;

    let w = Math.max(1, Math.round(w0 * scale));
    let h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    // 先用既定品質
    let q = CONFIG.JPEG_QUALITY;
    let out = canvas.toDataURL("image/jpeg", q);

    // 如果還太大，逐步降品質（最多 6 次）
    for (let i=0; i<6; i++){
      const bytes = approxDataUrlBytes_(out);
      if (bytes <= CONFIG.MAX_OUT_BYTES) break;
      q = Math.max(0.62, q - 0.06);
      out = canvas.toDataURL("image/jpeg", q);
    }

    return out;
  }

  function approxDataUrlBytes_(dataUrl){
    if (!dataUrl) return 0;
    const i = dataUrl.indexOf(",");
    const b64 = (i>=0) ? dataUrl.slice(i+1) : dataUrl;
    return Math.floor(b64.length * 0.75);
  }

  function setPreview_(key, dataUrl){
    const img = pickEl_(PREVIEW_SELECTOR_MAP[key]);
    if (!img) return;
    if (!dataUrl){
      img.style.display = "none";
      img.removeAttribute("src");
      return;
    }
    img.src = dataUrl;
    img.style.display = "";
  }

  async function handlePickFile_(key){
    const inp = pickEl_(FILE_SELECTOR_MAP[key]);
    const f = inp && inp.files ? inp.files[0] : null;

    if (!f) {
      fileState[key] = null;
      setPreview_(key, "");
      saveDraftSoon_();
      return;
    }

    setStatus(`圖片處理中：${key}…`, "info");
    const outDataUrl = await fileToCompressedDataURL(f);
    const bytes = approxDataUrlBytes_(outDataUrl);

    fileState[key] = {
      dataUrl: outDataUrl,
      filename: f.name || `${key}.jpg`,
      mime: "image/jpeg",
      bytes
    };

    setPreview_(key, outDataUrl);
    setStatus(`已選取並壓縮：${key}（${Math.round(bytes/1024)}KB）`, "ok");
    saveDraftSoon_();
  }

  function setPlan_(plan){
    const p = (plan === "premium") ? "premium" : "free";
    if (elPlan) elPlan.value = p;

    if (segFree) segFree.classList.toggle("on", p === "free");
    if (segPremium) segPremium.classList.toggle("on", p === "premium");

    // premium 才顯示 photo3~5（如果你 HTML 有用 class morePhotos）
    document.querySelectorAll(".morePhotos").forEach(el=>{
      el.style.display = (p === "premium") ? "" : "none";
    });

    if (planHint){
      planHint.innerHTML = (p === "premium")
        ? "<b>精品設計：</b>7 底色；照片牆最多 5 張"
        : "<b>自由搭配：</b>5色 × 3版型 × 3紙感；照片牆最多 2 張";
    }

    saveDraftSoon_();
  }

  function getVal_(id){ return trimOrEmpty(document.getElementById(id)?.value); }

  function collectPayload_(){
    const plan = (elPlan && elPlan.value) ? elPlan.value : "free";

    // ✅ 你表單裡「外觀」欄位要送到 GAS，才能讓成品連動
    // 若你的 HTML id 不同也不會爆，只是會送空字串
    const theme_color = getVal_("theme_color") || getVal_("color") || getVal_("c");
    const style_banner = getVal_("style_banner") || getVal_("style") || getVal_("s");
    const paper_texture = getVal_("paper_texture") || getVal_("paper") || getVal_("f");
    const premium_bg = getVal_("premium_bg") || getVal_("p");

    // 基本文字欄位
    const payload = {
      plan,
      name: getVal_("name"),
      unit: getVal_("unit"),
      title: getVal_("title"),
      phone: getVal_("phone"),
      email: getVal_("email"),
      website: normalizeUrl(getVal_("website")),
      address: getVal_("address"),
      slogan: getVal_("slogan"),
      services: getVal_("services"),
      experience: getVal_("experience"),
      line_url: normalizeLineUrl(getVal_("line_url")),
      line_oa: normalizeUrl(getVal_("line_oa")) || CONFIG.DEFAULT_LINE_OA,

      // 外觀（free: c/s/f；premium: p）
      theme_color,
      style_banner,
      paper_texture,
      premium_bg
    };

    // 允許照片張數
    const allowPhotos = (plan === "premium")
      ? ["photo1","photo2","photo3","photo4","photo5"]
      : ["photo1","photo2"];

    // ✅ 三種相容格式同時送（避免 GAS 忽略）
    const images = {};            // images[key] = dataUrl (string)
    const files_obj = {};         // files[key] = {dataUrl, filename...}
    const files_str = {};         // files_str[key] = dataUrl (string)
    const direct = {};            // direct avatar/logo/photo1... (string)

    // avatar/logo 永遠允許
    ["avatar","logo"].forEach(k=>{
      if (fileState[k]?.dataUrl){
        images[k] = fileState[k].dataUrl;
        files_obj[k] = fileState[k];
        files_str[k] = fileState[k].dataUrl;
        direct[k] = fileState[k].dataUrl;
      }
    });

    allowPhotos.forEach(k=>{
      if (fileState[k]?.dataUrl){
        images[k] = fileState[k].dataUrl;
        files_obj[k] = fileState[k];
        files_str[k] = fileState[k].dataUrl;
        direct[k] = fileState[k].dataUrl;
      }
    });

    payload.images = images;       // ✅ 常見 GAS 期待
    payload.files = files_obj;     // ✅ 你舊版格式
    payload.files_str = files_str; // ✅ 若 GAS 只吃字串版
    Object.assign(payload, direct); // ✅ 若 GAS 直接讀 payload.photo1

    // 附上簡短 debug（不影響 GAS）
    payload._client = { v: CONFIG.VERSION, img_keys: Object.keys(images) };

    return payload;
  }

  async function postCreate_(payload){
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
      try { json = JSON.parse(text); } catch(_) { json = { ok:false, raw:text }; }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json;
    } finally {
      done();
    }
  }

  async function ping_(){
    const url = `${CONFIG.GAS}?action=ping&ts=${Date.now()}`;
    const { signal, done } = withTimeout(12000);
    try {
      const res = await fetch(url, { method:"GET", cache:"no-store", signal });
      const text = await res.text();
      let json=null; try{ json=JSON.parse(text); }catch(_){ json={raw:text}; }
      return json;
    } finally { done(); }
  }

  // Draft（不存圖片）
  let _saveT=null;
  function saveDraftSoon_(){
    clearTimeout(_saveT);
    _saveT=setTimeout(saveDraftNow_, CONFIG.AUTOSAVE_DEBOUNCE_MS);
  }
  function saveDraftNow_(){
    const plan = (elPlan && elPlan.value) ? elPlan.value : "free";
    const draft = {
      plan,
      fields: {
        name: getVal_("name"),
        unit: getVal_("unit"),
        title: getVal_("title"),
        phone: getVal_("phone"),
        email: getVal_("email"),
        website: getVal_("website"),
        address: getVal_("address"),
        slogan: getVal_("slogan"),
        services: document.getElementById("services")?.value || "",
        experience: document.getElementById("experience")?.value || "",
        line_url: getVal_("line_url"),
        line_oa: getVal_("line_oa"),
        theme_color: getVal_("theme_color") || getVal_("color") || getVal_("c"),
        style_banner: getVal_("style_banner") || getVal_("style") || getVal_("s"),
        paper_texture: getVal_("paper_texture") || getVal_("paper") || getVal_("f"),
        premium_bg: getVal_("premium_bg") || getVal_("p")
      },
      savedAt: Date.now()
    };
    try { localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(draft)); } catch(_) {}
  }
  function loadDraft_(){
    try{
      const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
      if(!raw) return;
      const d = JSON.parse(raw);
      if(!d) return;

      setPlan_(d.plan || "free");

      const f = d.fields || {};
      for (const k of Object.keys(f)){
        const el = document.getElementById(k);
        if (el) el.value = f[k] || "";
      }
      setStatus("已載入上次草稿（不含圖片）。", "ok");
    }catch(_){}
  }

  function scrollToBottom_(){
    // 讓「送出狀態/結果」永遠直觀
    requestAnimationFrame(()=>{
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }

  function showConfirmLineOa_(lineOaUrl){
    const url = lineOaUrl || CONFIG.DEFAULT_LINE_OA;

    // 如果你 HTML 有 confirmBox / confirmLineOaBtn：會顯示
    if (confirmBox) confirmBox.style.display = "";
    if (confirmBtn) {
      confirmBtn.style.display = "";
      confirmBtn.setAttribute("href", url);
    }

    // 沒有也沒關係：至少提示文字
    setStatus("建立成功 ✅ 請點 LINE 官方帳號確認資料", "ok");
  }

  async function onSubmit_(ev){
    ev.preventDefault();

    try{
      if (elBtnSubmit) elBtnSubmit.disabled = true;

      setStatus("送出中…（含圖片會比較久）", "info");
      scrollToBottom_();

      const payload = collectPayload_();
      if (!payload.name){
        setStatus("請至少填寫：姓名", "err");
        if (elBtnSubmit) elBtnSubmit.disabled = false;
        scrollToBottom_();
        return;
      }

      // ✅ 快速自檢：你現在有沒有真的帶到照片
      const imgKeys = Object.keys(payload.images || {});
      console.log("[v498 submit] images keys =", imgKeys);

      let lastErr=null, json=null;
      for (let i=0; i<=CONFIG.RETRY; i++){
        try{
          json = await postCreate_(payload);
          break;
        }catch(e){
          lastErr=e;
          await sleep(650*(i+1));
        }
      }
      if (!json) throw (lastErr || new Error("create failed"));
      if (!json.ok) throw new Error(json.error || json.message || "create ok=false");

      // 成功：只顯示引導確認（不顯示 token/連結）
      const item = json.item || json.data || {};
      const lineOa = payload.line_oa || CONFIG.DEFAULT_LINE_OA;

      // 如果你還想留著 resultBox 做後台用，可以改成隱藏 token/links
      if (elResultBox) {
        // 你如果仍想顯示 id（可選），就只顯示 id，不顯示 token/links
        elResultBox.style.display = "";
        if (r_id) r_id.textContent = item.id || item.card_id || item.cardId || "—";

        if (r_token) r_token.textContent = ""; // 清空
        if (r_card) r_card.textContent = "";   // 清空
        if (r_og) r_og.textContent = "";       // 清空
        if (btnCopyCard) btnCopyCard.style.display = "none";
        if (btnCopyOg) btnCopyOg.style.display = "none";
      }

      showConfirmLineOa_(lineOa);
      saveDraftNow_();
      scrollToBottom_();

    }catch(err){
      console.error(err);
      setStatus("送出失敗：" + (err?.message || String(err)), "err");
      scrollToBottom_();
    }finally{
      if (elBtnSubmit) elBtnSubmit.disabled = false;
    }
  }

  function bindFiles_(){
    FILE_KEYS.forEach(key=>{
      const inp = pickEl_(FILE_SELECTOR_MAP[key]);
      if (!inp) return;
      inp.addEventListener("change", ()=>{
        handlePickFile_(key).catch(e=>{
          console.error(e);
          setStatus(e?.message || "圖片處理失敗", "err");
          scrollToBottom_();
        });
      });
    });
  }

  function bindAutosave_(){
    document.querySelectorAll("input,textarea,select").forEach(el=>{
      el.addEventListener("input", saveDraftSoon_);
      el.addEventListener("change", saveDraftSoon_);
    });
  }

  function clearAll_(){
    // 清文字
    ["name","unit","title","phone","email","website","address","slogan","services","experience","line_url","line_oa",
     "theme_color","style_banner","paper_texture","premium_bg","color","style","paper","c","s","f","p"
    ].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // 清圖片
    FILE_KEYS.forEach(key=>{
      const inp = pickEl_(FILE_SELECTOR_MAP[key]);
      if (inp) inp.value = "";
      fileState[key] = null;
      setPreview_(key, "");
    });

    try { localStorage.removeItem(CONFIG.DRAFT_KEY); } catch(_){}
    setStatus("已清空。", "ok");
    scrollToBottom_();
  }

  function fillDemo_(){
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
    set("name","小天使");
    set("unit","天使幸福智慧名片館");
    set("title","館長");
    set("phone","0973180707");
    set("line_oa", CONFIG.DEFAULT_LINE_OA);
    set("services","打造個人品牌智慧名片\n名片交付／代管");
    set("slogan","把心站穩，活得自在。");
    saveDraftSoon_();
    setStatus("已填入示範資料（圖片請自行選）。", "ok");
    scrollToBottom_();
  }

  function boot_(){
    // plan
    if (segFree) segFree.addEventListener("click", ()=>setPlan_("free"));
    if (segPremium) segPremium.addEventListener("click", ()=>setPlan_("premium"));
    setPlan_("free");

    // default line oa
    const lo = document.getElementById("line_oa");
    if (lo && !trimOrEmpty(lo.value)) lo.value = CONFIG.DEFAULT_LINE_OA;

    bindFiles_();
    bindAutosave_();
    if (elForm) elForm.addEventListener("submit", onSubmit_);

    if (elBtnReset) elBtnReset.addEventListener("click", clearAll_);
    if (elBtnDemo) elBtnDemo.addEventListener("click", fillDemo_);

    if (elBtnPing) elBtnPing.addEventListener("click", async ()=>{
      try{
        setStatus("測試連線中…", "info");
        scrollToBottom_();
        const j = await ping_();
        setStatus((j && (j.ok || j.status)) ? "連線正常 ✅" : "已回應（請看 console）", "ok");
        console.log("PING:", j);
      }catch(e){
        console.error(e);
        setStatus("連線失敗：" + (e?.message || e), "err");
        scrollToBottom_();
      }
    });

    loadDraft_();
  }

  document.addEventListener("DOMContentLoaded", boot_);
})();