/* ================================
 * form.js v491 (COMPLETE OVERWRITE)
 * - Avatar upload only + Canvas compress
 * - Fix "Failed to fetch": timeout + retry + smaller payload
 * - Required: plan + (free: color/style/paper) OR (premium: p1~p7)
 * - Draft autosave
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 2,
  VERSION: "v491",
  // avatar compress targets:
  MAX_W: 1200,
  MAX_H: 1200,
  TARGET_KB: 350,
  MIN_QUALITY: 0.55
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

const STATE = {
  plan: "free",               // free | premium
  color: "",                  // color-1..5 (required for free)
  style: "",                  // arch|flat|spot (required for free)
  paper: "",                  // paper-1..3 (required for free)
  premium: "",                // p1..p7 (required for premium)
  avatar: { file: null, blob: null, dataUrl: "", kb: 0, w: 0, h: 0 }
};

const DRAFT_KEY = "angel_card_form_draft_v491";

function setStatus(msg){
  const box = qs("statusBox");
  if(box) box.textContent = msg || "";
}

function backToCard(){
  // inside iframe form mode: call parent safe mode switch if exists
  try{
    if(window.parent && window.parent.__safeFormMode && typeof window.parent.__safeFormMode.setMode === "function"){
      window.parent.__safeFormMode.setMode("card");
      return;
    }
  }catch{}
  // fallback: go parent page without mode
  try{ location.href = "./index.html?v=491"; }catch{}
}

/* ---------- UI select helpers ---------- */
function setActive(btns, matchFn){
  btns.forEach(b=> b.classList.toggle("active", matchFn(b)));
}
function bySel(containerId, selector){
  const root = qs(containerId);
  if(!root) return [];
  return Array.from(root.querySelectorAll(selector));
}

function applyPlanUi(){
  const freeBox = qs("freeBox");
  const premiumBox = qs("premiumBox");
  if(freeBox) freeBox.style.display = (STATE.plan === "free") ? "" : "none";
  if(premiumBox) premiumBox.style.display = (STATE.plan === "premium") ? "" : "none";

  qs("planFree")?.classList.toggle("active", STATE.plan === "free");
  qs("planPremium")?.classList.toggle("active", STATE.plan === "premium");

  refreshStyleHint();
}

function refreshStyleHint(){
  const hint = qs("styleHint");
  if(!hint) return;

  if(STATE.plan === "free"){
    const ok = !!(STATE.color && STATE.style && STATE.paper);
    hint.textContent = ok
      ? "✅ 自由款樣式已完成，可送出。"
      : "請先完成：自由款 顏色 / 版型 / 紙感（皆必選），才能送出。";
  }else{
    const ok = !!STATE.premium;
    hint.textContent = ok
      ? "✅ 精品款底色已完成，可送出。"
      : "請先完成：精品款 底色（必選），才能送出。";
  }
}

/* ---------- Draft ---------- */
function saveDraft(){
  const payload = {
    plan: STATE.plan,
    color: STATE.color,
    style: STATE.style,
    paper: STATE.paper,
    premium: STATE.premium,
    name: text(qs("name")?.value),
    unit: text(qs("unit")?.value),
    title: text(qs("title")?.value),
    slogan: text(qs("slogan")?.value),
    phone: text(qs("phone")?.value),
    email: text(qs("email")?.value),
    address: text(qs("address")?.value),
    wechatId: text(qs("wechatId")?.value),
    lineAny: text(qs("lineAny")?.value),
    // avatar draft: store dataUrl (already compressed) to keep consistent
    avatarDataUrl: STATE.avatar?.dataUrl || ""
  };
  try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); }catch{}
}

function loadDraft(){
  try{
    const raw = localStorage.getItem(DRAFT_KEY);
    if(!raw) return;
    const d = JSON.parse(raw);
    if(!d || typeof d !== "object") return;

    STATE.plan = d.plan === "premium" ? "premium" : "free";
    STATE.color = d.color || "";
    STATE.style = d.style || "";
    STATE.paper = d.paper || "";
    STATE.premium = d.premium || "";

    qs("name").value = d.name || "";
    qs("unit").value = d.unit || "";
    qs("title").value = d.title || "";
    qs("slogan").value = d.slogan || "";
    qs("phone").value = d.phone || "";
    qs("email").value = d.email || "";
    qs("address").value = d.address || "";
    qs("wechatId").value = d.wechatId || "";
    qs("lineAny").value = d.lineAny || "";

    // restore avatar preview if exists
    if(d.avatarDataUrl){
      STATE.avatar.dataUrl = d.avatarDataUrl;
      const img = qs("avatarPreview");
      const meta = qs("avatarMeta");
      if(img){
        img.src = d.avatarDataUrl;
        img.style.display = "block";
      }
      if(meta){
        meta.textContent = "（草稿）已載入壓縮後個人照";
        meta.style.display = "block";
      }
    }

  }catch{}
}

function clearDraft(){
  try{ localStorage.removeItem(DRAFT_KEY); }catch{}
  setStatus("✅ 已清除草稿");
}

/* ---------- Canvas compress ---------- */
function readFileAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = ()=>resolve(String(fr.result||""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function loadImageFromDataUrl(dataUrl){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function calcFitSize(w,h,maxW,maxH){
  const r = Math.min(1, maxW / w, maxH / h);
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}

function blobToDataUrl(blob){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = ()=>resolve(String(fr.result||""));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

async function compressImageToJpegBlob(file, opts){
  const maxW = opts.maxW || 1200;
  const maxH = opts.maxH || 1200;
  const targetKB = opts.targetKB || 350;
  const minQ = opts.minQ || 0.55;

  // read -> draw -> iterative quality
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImageFromDataUrl(dataUrl);

  const fit = calcFitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxW, maxH);

  const canvas = document.createElement("canvas");
  canvas.width = fit.w;
  canvas.height = fit.h;
  const ctx = canvas.getContext("2d", { alpha:false, desynchronized:true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, fit.w, fit.h);

  let q = 0.86;
  let blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", q));
  if(!blob) throw new Error("Canvas toBlob failed");

  // try reduce until <= targetKB or reach minQ
  while((blob.size/1024) > targetKB && q > minQ){
    q = Math.max(minQ, q - 0.08);
    blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", q));
    if(!blob) break;
  }

  return { blob, w: fit.w, h: fit.h, kb: Math.round(blob.size/1024) };
}

async function handleAvatarFile(file){
  if(!file) return;

  setStatus("⏳ 正在壓縮個人照…");
  const { blob, w, h, kb } = await compressImageToJpegBlob(file, {
    maxW: CONFIG.MAX_W, maxH: CONFIG.MAX_H,
    targetKB: CONFIG.TARGET_KB, minQ: CONFIG.MIN_QUALITY
  });

  const dataUrl = await blobToDataUrl(blob);

  STATE.avatar = { file, blob, dataUrl, w, h, kb };

  const img = qs("avatarPreview");
  const meta = qs("avatarMeta");
  if(img){
    img.src = dataUrl;
    img.style.display = "block";
  }
  if(meta){
    meta.textContent = `已壓縮：${w}×${h}，約 ${kb}KB`;
    meta.style.display = "block";
  }

  setStatus("✅ 個人照已壓縮完成（送出時會使用壓縮後版本）");
  saveDraft();
}

/* ---------- Fetch robust ---------- */
async function fetchWithTimeout(url, options, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { ...options, signal: controller.signal, cache:"no-store", redirect:"follow" });
    const txt = await res.text();
    let json = null;
    try{ json = JSON.parse(txt); }catch{
      const m = String(txt||"").match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if(m){ try{ json = JSON.parse(m[0]); }catch{} }
    }
    if(!json) throw new Error("Not JSON");
    return json;
  }finally{
    clearTimeout(t);
  }
}

async function postJsonRobust(url, bodyObj){
  let last = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{
      const json = await fetchWithTimeout(url, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(bodyObj)
      }, CONFIG.FETCH_TIMEOUT_MS);
      return json;
    }catch(e){
      last = e;
      await new Promise(r=>setTimeout(r, 600 + i*600));
    }
  }
  throw last || new Error("Fetch failed");
}

/* ---------- Validate (required) ---------- */
function validateRequired(){
  if(STATE.plan === "free"){
    if(!STATE.color) return "請先選：自由款顏色（必選）";
    if(!STATE.style) return "請先選：自由款版型（必選）";
    if(!STATE.paper) return "請先選：自由款紙感（必選）";
  }else{
    if(!STATE.premium) return "請先選：精品款底色（必選）";
  }
  return "";
}

/* ---------- Submit ---------- */
function buildPayload(){
  // 你後端欄位是 snake_case（你截圖 JSON 顯示 name/unit/title/...）
  // 這裡用 snake_case 送，避免表頭對不上
  const payload = {
    action: "create",
    version: CONFIG.VERSION,

    // plan & theme
    plan: STATE.plan,
    color: STATE.plan === "free" ? STATE.color : "",
    style: STATE.plan === "free" ? STATE.style : "",
    paper: STATE.plan === "free" ? STATE.paper : "",
    premium: STATE.plan === "premium" ? STATE.premium : "",

    // fields
    name: text(qs("name")?.value),
    unit: text(qs("unit")?.value),
    title: text(qs("title")?.value),
    slogan: text(qs("slogan")?.value),

    phone: text(qs("phone")?.value),
    email: text(qs("email")?.value),
    address: text(qs("address")?.value),

    wechat_id: text(qs("wechatId")?.value),
    line_any: text(qs("lineAny")?.value),

    // avatar: send compressed dataURL (jpeg)
    avatar_dataurl: STATE.avatar?.dataUrl || ""
  };

  return payload;
}

async function submit(){
  const err = validateRequired();
  if(err){
    setStatus("⚠️ " + err);
    return;
  }

  const btn = qs("btnSubmit");
  btn.disabled = true;

  try{
    saveDraft();

    setStatus("⏳ 送出中…（若在 LINE/微信 內建瀏覽器較慢，請稍候）");

    const payload = buildPayload();
    const url = CONFIG.GAS; // GAS should route by action in body

    const res = await postJsonRobust(url, payload);

    // Expect {ok:true, id:"TW0001", ...}
    if(!res || res.ok !== true){
      const msg = (res && (res.message || res.error)) ? (res.message || res.error) : "未知錯誤";
      throw new Error(msg);
    }

    const id = res.id || (res.data && res.data.id) || "";
    setStatus(`✅ 送出成功！\nID：${id || "（未回傳）"}\n你可以回到名片預覽。`);

    // optional: clear draft on success
    // clearDraft();

  }catch(e){
    // ✅ 這裡把「Failed to fetch」轉成人話
    const msg = String(e?.message || e || "");
    let human = msg;

    if(/Failed to fetch/i.test(msg) || /NetworkError/i.test(msg) || /abort/i.test(msg)){
      human =
        "送出失敗（網路或後端超時 / 內建瀏覽器限制）。\n" +
        "建議：\n" +
        "1) 改用 Chrome/Safari 外部瀏覽器開啟再送\n" +
        "2) 先等 5 秒再重試\n" +
        "3) 個人照已壓縮，若仍失敗，多半是內建瀏覽器攔截跨網域\n";
    }

    setStatus("❌ " + human);
  }finally{
    btn.disabled = false;
  }
}

/* ---------- Bind ---------- */
function bindPlan(){
  qs("planFree")?.addEventListener("click", ()=>{
    STATE.plan = "free";
    applyPlanUi();
    saveDraft();
  });
  qs("planPremium")?.addEventListener("click", ()=>{
    STATE.plan = "premium";
    applyPlanUi();
    saveDraft();
  });
}

function bindFreeRequired(){
  // colors
  const dots = bySel("freeColors", ".dot");
  dots.forEach(d=>{
    d.addEventListener("click", ()=>{
      STATE.color = d.getAttribute("data-color") || "";
      setActive(dots, x => x === d);
      refreshStyleHint();
      saveDraft();
    });
  });

  // styles
  const styles = bySel("freeStyles", ".btn");
  styles.forEach(b=>{
    b.addEventListener("click", ()=>{
      STATE.style = b.getAttribute("data-style") || "";
      setActive(styles, x => x === b);
      refreshStyleHint();
      saveDraft();
    });
  });

  // papers
  const papers = bySel("freePapers", ".btn");
  papers.forEach(b=>{
    b.addEventListener("click", ()=>{
      STATE.paper = b.getAttribute("data-paper") || "";
      setActive(papers, x => x === b);
      refreshStyleHint();
      saveDraft();
    });
  });
}

function bindPremiumRequired(){
  const dots = bySel("premiumThemes", ".p-dot");
  dots.forEach(d=>{
    d.addEventListener("click", ()=>{
      STATE.premium = d.getAttribute("data-premium") || "";
      setActive(dots, x => x === d);
      refreshStyleHint();
      saveDraft();
    });
  });
}

function bindInputsAutosave(){
  ["name","unit","title","slogan","phone","email","address","wechatId","lineAny"].forEach(id=>{
    qs(id)?.addEventListener("input", ()=>{
      saveDraft();
    });
  });
}

function applyDraftToUI(){
  applyPlanUi();

  // free ui
  const freeDots = bySel("freeColors", ".dot");
  setActive(freeDots, b => (b.getAttribute("data-color") === STATE.color));

  const freeStyles = bySel("freeStyles", ".btn");
  setActive(freeStyles, b => (b.getAttribute("data-style") === STATE.style));

  const freePapers = bySel("freePapers", ".btn");
  setActive(freePapers, b => (b.getAttribute("data-paper") === STATE.paper));

  // premium ui
  const premDots = bySel("premiumThemes", ".p-dot");
  setActive(premDots, b => (b.getAttribute("data-premium") === STATE.premium));

  refreshStyleHint();
}

function bindAvatar(){
  const input = qs("avatarFile");
  input?.addEventListener("change", async ()=>{
    try{
      const f = input.files?.[0];
      if(!f) return;
      await handleAvatarFile(f);
    }catch(e){
      console.error(e);
      setStatus("❌ 個人照處理失敗（請換一張或重新選取）");
    }
  });
}

function bindButtons(){
  qs("btnBack")?.addEventListener("click", backToCard);
  qs("btnClear")?.addEventListener("click", clearDraft);
  qs("btnSubmit")?.addEventListener("click", submit);
}

/* ---------- Boot ---------- */
(function boot(){
  try{
    loadDraft();
    bindPlan();
    bindFreeRequired();
    bindPremiumRequired();
    bindInputsAutosave();
    bindAvatar();
    bindButtons();
    applyDraftToUI();

    setStatus("✅ 表單已就緒（樣式必選 + 個人照自動壓縮）");
  }catch(e){
    console.error(e);
    setStatus("❌ 表單初始化失敗");
  }
})();