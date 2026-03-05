/* ==========================================
 * HSC Form — form.js v520.3 (COMPLETE OVERWRITE)
 * - Firebase v12.10.0 (module)
 * - Flow:
 *   fill:   reserve(GET) -> upload(firebase) -> create(POST JSON)
 *   update: upload(firebase optional) -> update(POST JSON + sig)
 * - Default update mode = PATCH (no overwrite if empty)
 * - Supports clear_fields and replace=1 (manual usage)
 * ========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

(() => {
  "use strict";

  const VERSION = "520.3";
  const DEFAULT_GAS = ""; // you can prefill here if you want
  const DEFAULT_TENANT = "angel";

  // ✅ Your firebase config (as provided)
  const firebaseConfig = {
    apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
    authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
    projectId: "happiness-smart-card-pro-7389a",
    storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
    messagingSenderId: "143313936007",
    appId: "1:143313936007:web:7c948563c51e8a47d3a222"
  };

  /* -----------------------------
   * OPTIONS (Single Source of Truth for form)
   * ----------------------------- */
  const OPTIONS = {
    plan: [
      { value: "free",   label: "自由搭配（Free）" },
      { value: "pro",    label: "進階（Pro）" },
      { value: "premium",label: "精品設計（Premium）" },
    ],
    // 自由搭配色球（c1~c5）
    freeColors: [
      { value: "c1", label: "粉", swatch: "linear-gradient(135deg,#ffd1dc,#ff7aa8)" },
      { value: "c2", label: "藍", swatch: "linear-gradient(135deg,#bfe6ff,#4aa3ff)" },
      { value: "c3", label: "橘", swatch: "linear-gradient(135deg,#ffd7b5,#ff7a18)" },
      { value: "c4", label: "紫", swatch: "linear-gradient(135deg,#e7d2ff,#8b5cf6)" },
      { value: "c5", label: "綠", swatch: "linear-gradient(135deg,#c9f7d6,#22c55e)" },
    ],
    // 版型（s1~s3）
    styles: [
      { value: "s1", label: "正拱" },
      { value: "s2", label: "平直" },
      { value: "s3", label: "晨曦" },
    ],
    // 紙感（f1~f3）
    papers: [
      { value: "f1", label: "棉紙" },
      { value: "f2", label: "顆粒" },
      { value: "f3", label: "亞麻" },
    ],
    // 精品底色（p1~p7）
    premiumColors: [
      { value: "p1", label: "胭脂紅" },
      { value: "p2", label: "酒紅" },
      { value: "p3", label: "深藍" },
      { value: "p4", label: "霧紫" },
      { value: "p5", label: "藍灰" },
      { value: "p6", label: "金箔" },
      { value: "p7", label: "褐碳" },
    ],
    // plan -> photo limits
    photoLimitByPlan: {
      free: 2,
      pro: 4,
      premium: 5
    }
  };

  /* -----------------------------
   * Canonical fields (write only these to GAS)
   * ----------------------------- */
  const CANON = {
    plan: "plan",
    color: "color",
    style: "style",
    paper: "paper",
    premium_color: "premium_color",

    name: "name",
    unit: "unit",
    title: "title",
    slogan: "slogan",
    services: "services",
    experience: "experience",
    website: "website",

    wechat_id: "wechat_id",
    line_url: "line_url",
    line_oa: "line_oa",
    email: "email",
    phone: "phone",
    address: "address",

    video1: "video1",
    video2: "video2",
    video3: "video3",
    social1: "social1",
    social2: "social2",
    social3: "social3",

    cta_text: "cta_text",
    cta_link: "cta_link",
    wechat_poster: "wechat_poster",

    avatar_img: "avatar_img",
    logo_img: "logo_img",
    photo1_img: "photo1_img",
    photo2_img: "photo2_img",
    photo3_img: "photo3_img",
    photo4_img: "photo4_img",
    photo5_img: "photo5_img",

    avatar_img_fast: "avatar_img_fast",
    logo_img_fast: "logo_img_fast",
    photo1_img_fast: "photo1_img_fast",
    photo2_img_fast: "photo2_img_fast",
    photo3_img_fast: "photo3_img_fast",
    photo4_img_fast: "photo4_img_fast",
    photo5_img_fast: "photo5_img_fast",
  };

  /* -----------------------------
   * DOM
   * ----------------------------- */
  const $ = (id) => document.getElementById(id);

  const el = {
    dot: $("dot"),
    modeText: $("modeText"),
    tenantText: $("tenantText"),
    idText: $("idText"),
    ver: $("ver"),
    mode: $("mode"),
    gas: $("gas"),
    btnTest: $("btnTest"),
    btnSubmit: $("btnSubmit"),
    btnReset: $("btnReset"),
    status: $("status"),

    planChips: $("planChips"),
    colorChips: $("colorChips"),
    styleChips: $("styleChips"),
    paperChips: $("paperChips"),
    premiumChips: $("premiumChips"),

    uploadGrid: $("uploadGrid"),
  };

  const fields = [
    "name","unit","title","slogan","services","experience","website",
    "phone","email","line_url","line_oa","wechat_id","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text","cta_link","wechat_poster"
  ];

  /* -----------------------------
   * State
   * ----------------------------- */
  const qs = new URLSearchParams(location.search);
  const state = {
    tenant: (qs.get("tenant") || DEFAULT_TENANT).trim() || DEFAULT_TENANT,
    sig: (qs.get("sig") || "").trim(),
    mode: (qs.get("mode") || "fill").trim(), // fill | update
    id: (qs.get("id") || "").trim(),         // update needs id
    // fill runtime values:
    token: "",
    // selections:
    plan: "",
    color: "",
    style: "",
    paper: "",
    premium_color: "",
    // uploads:
    uploads: {}, // key -> {file, previewUrl, mainUrl, fastUrl}
    // firebase:
    authReady: false,
    uid: "",
  };

  /* -----------------------------
   * Upload slots
   * ----------------------------- */
  const UPLOAD_SLOTS = [
    { key: "avatar", label: "大頭照 Avatar", mainField: CANON.avatar_img, fastField: CANON.avatar_img_fast, fileMain: "avatar.webp", fileFast: "avatar_fast.webp" },
    { key: "logo",   label: "Logo",         mainField: CANON.logo_img,   fastField: CANON.logo_img_fast,   fileMain: "logo.webp",   fileFast: "logo_fast.webp" },
    { key: "p1",     label: "照片 1",        mainField: CANON.photo1_img, fastField: CANON.photo1_img_fast, fileMain: "photo1.webp", fileFast: "photo1_fast.webp" },
    { key: "p2",     label: "照片 2",        mainField: CANON.photo2_img, fastField: CANON.photo2_img_fast, fileMain: "photo2.webp", fileFast: "photo2_fast.webp" },
    { key: "p3",     label: "照片 3",        mainField: CANON.photo3_img, fastField: CANON.photo3_img_fast, fileMain: "photo3.webp", fileFast: "photo3_fast.webp" },
    { key: "p4",     label: "照片 4",        mainField: CANON.photo4_img, fastField: CANON.photo4_img_fast, fileMain: "photo4.webp", fileFast: "photo4_fast.webp" },
    { key: "p5",     label: "照片 5",        mainField: CANON.photo5_img, fastField: CANON.photo5_img_fast, fileMain: "photo5.webp", fileFast: "photo5_fast.webp" },
  ];

  /* -----------------------------
   * Init
   * ----------------------------- */
  boot();

  async function boot(){
    el.ver.textContent = `v${VERSION}`;
    el.tenantText.textContent = state.tenant;

    // gas endpoint
    el.gas.value = (localStorage.getItem("HSC_GAS_URL") || DEFAULT_GAS || "").trim();

    // mode / label
    normalizeMode_();
    renderOptions_();
    renderUploads_();
    bindEvents_();

    // firebase init
    await initFirebase_();

    // update UI
    updateHeaderUI_();
    logStatus_(`已就緒。\n模式=${state.mode}\ntenant=${state.tenant}\nsig=${state.sig ? "YES" : "NO"}`);

    // basic validation hints
    if(state.mode === "update"){
      if(!state.sig) warnStatus_("update 模式缺少 sig，無法送出 update。");
      if(!state.id) warnStatus_("update 模式缺少 id，無法送出 update。");
    }
  }

  function normalizeMode_(){
    const m = (state.mode || "fill").toLowerCase();
    state.mode = (m === "update") ? "update" : "fill";
    el.mode.value = state.mode;
  }

  function updateHeaderUI_(){
    $("modeText").textContent = state.mode === "fill" ? "新建 fill" : "更新 update";
    $("idText").textContent = state.id || "-";
    el.dot.style.background = state.mode === "fill" ? "var(--warn)" : "var(--accent)";
  }

  function bindEvents_(){
    el.btnTest.addEventListener("click", onPing_);
    el.btnSubmit.addEventListener("click", onSubmit_);
    el.btnReset.addEventListener("click", onReset_);

    // save gas
    el.gas.addEventListener("change", ()=>{
      localStorage.setItem("HSC_GAS_URL", (el.gas.value||"").trim());
    });

    // input listeners
    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      node.addEventListener("input", ()=>{/* noop */});
    });
  }

  /* -----------------------------
   * Options UI
   * ----------------------------- */
  function renderOptions_(){
    // plan chips
    el.planChips.innerHTML = "";
    OPTIONS.plan.forEach(p=>{
      const chip = makeChip_(p.label, "plan", p.value);
      el.planChips.appendChild(chip);
    });

    // color chips (free colors)
    el.colorChips.innerHTML = "";
    OPTIONS.freeColors.forEach(c=>{
      const chip = makeChip_(c.label, "color", c.value, { swatch: c.swatch });
      el.colorChips.appendChild(chip);
    });

    // style chips
    el.styleChips.innerHTML = "";
    OPTIONS.styles.forEach(s=>{
      const chip = makeChip_(s.label, "style", s.value);
      el.styleChips.appendChild(chip);
    });

    // paper chips
    el.paperChips.innerHTML = "";
    OPTIONS.papers.forEach(f=>{
      const chip = makeChip_(f.label, "paper", f.value);
      el.paperChips.appendChild(chip);
    });

    // premium color chips
    el.premiumChips.innerHTML = "";
    OPTIONS.premiumColors.forEach(p=>{
      const chip = makeChip_(p.label, "premium_color", p.value);
      el.premiumChips.appendChild(chip);
    });
  }

  function makeChip_(label, group, value, opt={}){
    const div = document.createElement("div");
    div.className = "chip";
    div.dataset.group = group;
    div.dataset.value = value;
    div.dataset.on = "0";

    if(opt.swatch){
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = opt.swatch;
      div.appendChild(sw);
    }

    const t = document.createElement("span");
    t.textContent = label;
    div.appendChild(t);

    div.addEventListener("click", ()=>{
      setChoice_(group, value);
    });

    return div;
  }

  function setChoice_(group, value){
    if(group === "plan"){
      state.plan = value;
      // auto-limit photo slots by plan
      applyPlanLimits_();
    }else if(group === "color"){
      state.color = value;
    }else if(group === "style"){
      state.style = value;
    }else if(group === "paper"){
      state.paper = value;
    }else if(group === "premium_color"){
      state.premium_color = value;
    }
    syncChipsUI_();
  }

  function syncChipsUI_(){
    const all = document.querySelectorAll(".chip");
    all.forEach(node=>{
      const g = node.dataset.group;
      const v = node.dataset.value;
      let on = false;
      if(g==="plan") on = (state.plan === v);
      if(g==="color") on = (state.color === v);
      if(g==="style") on = (state.style === v);
      if(g==="paper") on = (state.paper === v);
      if(g==="premium_color") on = (state.premium_color === v);
      node.dataset.on = on ? "1" : "0";
    });

    // premium hint by plan
    const isPremiumPlan = (state.plan === "premium");
    el.premiumChips.parentElement.style.opacity = isPremiumPlan ? "1" : ".85";
  }

  function applyPlanLimits_(){
    const limit = OPTIONS.photoLimitByPlan[state.plan] ?? 2;

    // disable upload slots beyond limit
    UPLOAD_SLOTS.forEach((slot)=>{
      if(slot.key.startsWith("p")){
        const idx = Number(slot.key.slice(1));
        const enabled = idx <= limit;
        const box = document.querySelector(`[data-ukey="${slot.key}"]`);
        if(box){
          box.style.opacity = enabled ? "1" : ".45";
          box.dataset.disabled = enabled ? "0" : "1";
        }
        // if now disabled, clear it
        if(!enabled && state.uploads[slot.key]){
          delete state.uploads[slot.key];
          renderUploads_(); // re-render to reflect
        }
      }
    });

    // if plan selected, ensure default selections exist (optional)
    syncChipsUI_();
  }

  /* -----------------------------
   * Upload UI
   * ----------------------------- */
  function renderUploads_(){
    el.uploadGrid.innerHTML = "";

    const limit = OPTIONS.photoLimitByPlan[state.plan] ?? 5;

    UPLOAD_SLOTS.forEach((slot)=>{
      const isPhoto = slot.key.startsWith("p");
      if(isPhoto){
        const idx = Number(slot.key.slice(1));
        // still show but can be disabled
        // (we'll control by dataset)
        void idx;
      }

      const wrap = document.createElement("div");
      wrap.className = "uItem";
      wrap.dataset.ukey = slot.key;
      wrap.dataset.disabled = "0";

      const head = document.createElement("div");
      head.className = "uItemHead";

      const left = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = slot.label;
      const small = document.createElement("small");
      small.textContent = "webp / fast 小圖";
      left.appendChild(strong);
      left.appendChild(document.createElement("div")).appendChild(small);

      const right = document.createElement("div");
      const btnClear = document.createElement("button");
      btnClear.type = "button";
      btnClear.className = "secondary";
      btnClear.textContent = "清除";
      btnClear.addEventListener("click", ()=>{
        delete state.uploads[slot.key];
        renderUploads_();
        syncChipsUI_();
      });
      right.appendChild(btnClear);

      head.appendChild(left);
      head.appendChild(right);

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      const u = state.uploads[slot.key];
      if(u && u.previewUrl){
        const img = document.createElement("img");
        img.src = u.previewUrl;
        thumb.innerHTML = "";
        thumb.appendChild(img);
      }else{
        thumb.textContent = "尚未選擇圖片";
      }

      const mini = document.createElement("div");
      mini.className = "miniRow";

      const file = document.createElement("input");
      file.type = "file";
      file.accept = "image/*";
      file.addEventListener("change", async (ev)=>{
        const f = ev.target.files && ev.target.files[0];
        if(!f) return;

        // if disabled by plan, refuse
        const disabled = (wrap.dataset.disabled === "1");
        if(disabled){
          warnStatus_(`此方案目前不包含 ${slot.label}。請升級方案或先取消此圖。`);
          file.value = "";
          return;
        }

        // preview + store
        const url = URL.createObjectURL(f);
        state.uploads[slot.key] = { file: f, previewUrl: url, mainUrl: "", fastUrl: "" };
        renderUploads_();
      });

      const note = document.createElement("div");
      note.className = "hint";
      note.textContent = "送出時自動壓縮並上傳。";

      mini.appendChild(file);

      wrap.appendChild(head);
      wrap.appendChild(thumb);
      wrap.appendChild(mini);
      wrap.appendChild(note);

      el.uploadGrid.appendChild(wrap);
    });

    // apply plan limits after render
    if(state.plan){
      const limitNow = OPTIONS.photoLimitByPlan[state.plan] ?? 2;
      UPLOAD_SLOTS.forEach(slot=>{
        if(slot.key.startsWith("p")){
          const idx = Number(slot.key.slice(1));
          const enabled = idx <= limitNow;
          const box = document.querySelector(`[data-ukey="${slot.key}"]`);
          if(box) box.dataset.disabled = enabled ? "0" : "1";
        }
      });
    }
  }

  /* -----------------------------
   * Firebase init
   * ----------------------------- */
  async function initFirebase_(){
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const storage = getStorage(app);

    state._fb = { app, auth, storage };

    // anonymous login
    try{
      await signInAnonymously(auth);
    }catch(err){
      warnStatus_("Firebase 匿名登入失敗： " + String(err?.message || err));
    }

    onAuthStateChanged(auth, (user)=>{
      if(user){
        state.authReady = true;
        state.uid = user.uid || "";
        logStatus_(`Firebase 已登入（匿名）。uid=${state.uid}`);
      }else{
        state.authReady = false;
        state.uid = "";
      }
    });
  }

  /* -----------------------------
   * GAS calls
   * ----------------------------- */
  function gasUrl_(){
    const u = (el.gas.value || "").trim();
    if(!u) throw new Error("請先填入 GAS /exec URL");
    return u;
  }

  async function gasPing_(){
    const url = gasUrl_();
    const full = `${url}?action=ping`;
    const r = await fetch(full, { method:"GET" });
    const j = await r.json();
    return j;
  }

  async function gasReserve_(){
    const url = gasUrl_();
    const q = new URLSearchParams();
    q.set("action","reserve");
    q.set("tenant", state.tenant);
    if(state.sig) q.set("sig", state.sig);

    // optional: if you want to store uid in reserve cache
    if(state.uid) q.set("uid", state.uid);

    // plan is required on UI; still pass
    q.set("plan", state.plan);

    const full = `${url}?${q.toString()}`;
    const r = await fetch(full, { method:"GET" });
    const j = await r.json();
    return j;
  }

  async function gasCreate_(payload){
    const url = gasUrl_();
    const full = `${url}?action=create`;
    const r = await fetch(full, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    return j;
  }

  async function gasUpdate_(payload){
    const url = gasUrl_();
    const full = `${url}?action=update`;
    const r = await fetch(full, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    return j;
  }

  /* -----------------------------
   * Actions
   * ----------------------------- */
  async function onPing_(){
    try{
      setBusy_(true);
      logStatus_("ping 中…");
      const j = await gasPing_();
      logStatus_("ping 回應：\n" + JSON.stringify(j, null, 2));
    }catch(err){
      badStatus_("ping 失敗： " + String(err?.message || err));
    }finally{
      setBusy_(false);
    }
  }

  async function onSubmit_(){
    try{
      setBusy_(true);

      // validate
      if(!state.plan){
        warnStatus_("請先選擇方案（必選）。");
        return;
      }

      if(state.mode === "fill" && !state.sig){
        warnStatus_("fill 需要 sig（你目前網址沒有 sig）。請用後台產出的填表連結進入。");
        return;
      }

      if(state.mode === "update"){
        if(!state.sig){
          warnStatus_("update 需要 sig。");
          return;
        }
        if(!state.id){
          warnStatus_("update 需要 id。");
          return;
        }
      }

      // ensure firebase auth
      if(!state.authReady){
        warnStatus_("Firebase 尚未登入完成，請稍等或重整再試。");
        return;
      }

      // collect text fields
      const payload = collectPayload_();

      if(state.mode === "fill"){
        logStatus_("1/3 reserve 中…");
        const rsv = await gasReserve_();
        if(!rsv || !rsv.ok) throw new Error("reserve failed: " + JSON.stringify(rsv));
        state.id = rsv.id;
        state.token = rsv.token;
        updateHeaderUI_();

        logStatus_("2/3 上傳圖片中…（會壓縮）");
        const uploadRes = await uploadAll_(state.id);
        Object.assign(payload, uploadRes);

        payload.tenant = state.tenant;
        payload.sig = state.sig;
        payload.id = state.id;
        payload.token = state.token;

        logStatus_("3/3 create 寫入 card_db…");
        const created = await gasCreate_(payload);
        logStatus_("create 回應：\n" + JSON.stringify(created, null, 2));

        if(created && created.ok){
          el.dot.style.background = "var(--ok)";
          logStatus_(
            `✅ 建立成功\nid=${state.id}\n` +
            `（你可以到後台用 adminFind 找這筆，或用成品頁測）`
          );
        }else{
          el.dot.style.background = "var(--bad)";
        }
      }else{
        // update
        logStatus_("1/2 上傳圖片中…（若有選）");
        const uploadRes = await uploadAll_(state.id);
        Object.assign(payload, uploadRes);

        payload.tenant = state.tenant;
        payload.sig = state.sig;
        payload.id = state.id;

        // Default PATCH: only send fields that exist + images uploaded.
        // If you need clear: manually add payload.clear_fields = "email,address"
        // If you need replace: payload.replace = "1"
        logStatus_("2/2 update 寫入 card_db…");
        const updated = await gasUpdate_(payload);
        logStatus_("update 回應：\n" + JSON.stringify(updated, null, 2));

        if(updated && updated.ok){
          el.dot.style.background = "var(--ok)";
          logStatus_(`✅ 更新成功\nid=${state.id}\nmode=${updated.mode || "patch"}`);
        }else{
          el.dot.style.background = "var(--bad)";
        }
      }

    }catch(err){
      el.dot.style.background = "var(--bad)";
      badStatus_("送出失敗： " + String(err?.message || err));
    }finally{
      setBusy_(false);
    }
  }

  function onReset_(){
    // reset only client inputs, not query-mode
    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      node.value = "";
    });

    state.plan = "";
    state.color = "";
    state.style = "";
    state.paper = "";
    state.premium_color = "";
    state.uploads = {};
    renderUploads_();
    syncChipsUI_();

    logStatus_("已重設（不影響網址參數）。");
    el.dot.style.background = "var(--warn)";
  }

  /* -----------------------------
   * Payload builder
   * ----------------------------- */
  function collectPayload_(){
    const p = {};

    // selections
    p[CANON.plan] = state.plan;
    p[CANON.color] = state.color;
    p[CANON.style] = state.style;
    p[CANON.paper] = state.paper;
    p[CANON.premium_color] = state.premium_color;

    // text inputs
    fields.forEach(id=>{
      const node = $(id);
      if(!node) return;
      const v = String(node.value || "").trim();
      if(v) p[id] = v; // PATCH behavior: only send if not empty
    });

    return p;
  }

  /* -----------------------------
   * Upload pipeline
   * ----------------------------- */
  async function uploadAll_(cardId){
    // returns { avatar_img, avatar_img_fast, ... } only for uploaded files
    const out = {};

    const limit = OPTIONS.photoLimitByPlan[state.plan] ?? 2;

    for(const slot of UPLOAD_SLOTS){
      // plan limits for photos
      if(slot.key.startsWith("p")){
        const idx = Number(slot.key.slice(1));
        if(idx > limit) continue;
      }

      const u = state.uploads[slot.key];
      if(!u || !u.file) continue;

      const { mainBlob, fastBlob } = await compressToWebpPair_(u.file);

      const mainPath = `hsc_cards/${state.tenant}/${cardId}/${slot.fileMain}`;
      const fastPath = `hsc_cards/${state.tenant}/${cardId}/${slot.fileFast}`;

      const { storage } = state._fb;

      // upload main
      const mainRef = sRef(storage, mainPath);
      await uploadBytes(mainRef, mainBlob, { contentType: "image/webp" });
      const mainUrl = await getDownloadURL(mainRef);

      // upload fast
      const fastRef = sRef(storage, fastPath);
      await uploadBytes(fastRef, fastBlob, { contentType: "image/webp" });
      const fastUrl = await getDownloadURL(fastRef);

      out[slot.mainField] = mainUrl;
      out[slot.fastField] = fastUrl;

      // store status
      state.uploads[slot.key].mainUrl = mainUrl;
      state.uploads[slot.key].fastUrl = fastUrl;

      logStatus_(`已上傳：${slot.label}\n- ${slot.mainField}\n- ${slot.fastField}`);
    }

    return out;
  }

  async function compressToWebpPair_(file){
    // main: max 1600px
    // fast: max 480px
    const img = await fileToImage_(file);

    const mainBlob = await renderToWebp_(img, 1600, 0.82);
    const fastBlob = await renderToWebp_(img, 480, 0.78);

    return { mainBlob, fastBlob };
  }

  function fileToImage_(file){
    return new Promise((resolve, reject)=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = (e)=> reject(e);
      img.src = url;
    });
  }

  function renderToWebp_(img, maxSide, quality){
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if(!w0 || !h0) throw new Error("image read failed");

    let w = w0, h = h0;
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    w = Math.max(1, Math.round(w0 * scale));
    h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    return new Promise((resolve)=>{
      canvas.toBlob((blob)=>{
        if(!blob) throw new Error("toBlob failed");
        resolve(blob);
      }, "image/webp", quality);
    });
  }

  /* -----------------------------
   * UI helpers
   * ----------------------------- */
  function setBusy_(on){
    el.btnTest.disabled = on;
    el.btnSubmit.disabled = on;
    el.btnReset.disabled = on;
  }

  function logStatus_(txt){
    el.status.textContent = String(txt || "");
  }
  function warnStatus_(txt){
    el.status.textContent = "⚠️ " + String(txt || "");
  }
  function badStatus_(txt){
    el.status.textContent = "❌ " + String(txt || "");
  }

})();