/* form.js v491 (COMPLETE OVERWRITE)
 * - Plan split UI:
 *   free: show color/style/paper, photos max 2
 *   premium: show premium color, photos max 5
 * - Auto draft save/restore/clear
 * - Image pick -> Canvas compress (no crop) -> base64
 * - POST to GAS {action:"create", data:payload, images:{avatar,logo,photos}}
 * - After submit: only show "去 LINE 官網確認" (no delivery links, no product urls)
 * - Optional redirect to LINE confirm page (set LINE_CONFIRM_URL or let GAS return redirect_url)
 */

const FORM_CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  TIMEOUT_MS: 20000,

  // ✅ 你要導回「LINE 官網確認頁」：把這裡改成你的確認頁 URL
  // 例如：https://page.line.me/xxxx 或 你自己的 LINE 確認 landing page
  LINE_CONFIRM_URL: "",

  DRAFT_KEY: "hsc_form_draft_v491",
  AUTOSAVE_DEBOUNCE_MS: 450,

  // Image rules (Apps Script safe)
  MAX_EDGE: 1280,
  JPEG_QUALITY: 0.82,
  MAX_TOTAL_BASE64_CHARS: 2_500_000
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

function setStatus_(msg, type){
  const box = qs("statusBox");
  if(!box) return;
  box.classList.remove("ok","warn");
  if(type === "ok") box.classList.add("ok");
  if(type === "warn") box.classList.add("warn");
  box.textContent = msg || "";
}

/* ---------------------------
   Form <-> Object
--------------------------- */
function formToObject_(formEl){
  const fd = new FormData(formEl);
  const out = {};
  for(const [k,v] of fd.entries()){
    const key = String(k||"").trim();
    if(!key) continue;
    out[key] = text(v);
  }
  out["時間戳記"] = new Date().toISOString();
  return out;
}
function objectToForm_(formEl, obj){
  if(!obj || typeof obj !== "object") return;
  for(const [k,v] of Object.entries(obj)){
    if(k === "時間戳記") continue;
    const el = formEl.querySelector(`[name="${CSS.escape(k)}"]`);
    if(!el) continue;
    if(el.tagName === "SELECT"){
      const has = Array.from(el.options).some(o => o.value === String(v));
      if(has) el.value = String(v);
      continue;
    }
    el.value = String(v ?? "");
  }
}

/* ---------------------------
   Draft
--------------------------- */
function collectDraft_(formEl){
  const fd = new FormData(formEl);
  const out = {};
  for(const [k,v] of fd.entries()){
    const key = String(k||"").trim();
    if(!key) continue;
    out[key] = String(v ?? "");
  }
  out["__img_meta"] = getImageMeta_();
  return out;
}
function saveDraft_(formEl){
  try{
    const draft = collectDraft_(formEl);
    localStorage.setItem(FORM_CONFIG.DRAFT_KEY, JSON.stringify(draft));
    const hint = qs("draftHint");
    if(hint) hint.textContent = "已自動儲存草稿";
  }catch(e){}
}
function loadDraft_(formEl){
  try{
    const raw = localStorage.getItem(FORM_CONFIG.DRAFT_KEY);
    if(!raw) return false;
    const obj = JSON.parse(raw);
    if(!obj || typeof obj !== "object") return false;

    objectToForm_(formEl, obj);

    const hint = qs("draftHint");
    if(hint) hint.textContent = "已載入上次草稿（照片需重新選取）";
    return true;
  }catch(e){
    return false;
  }
}
function clearDraft_(formEl){
  try{ localStorage.removeItem(FORM_CONFIG.DRAFT_KEY); }catch(e){}
  try{ formEl.reset(); }catch(e){}
  clearImages_();
  applyPlanUi_(); // reset plan view
  setStatus_("已清除草稿", "warn");
  const hint = qs("draftHint");
  if(hint) hint.textContent = "";
}

/* ---------------------------
   Network
--------------------------- */
async function postJson_(url, body){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), FORM_CONFIG.TIMEOUT_MS);
  try{
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const txt = await res.text();
    try{ return JSON.parse(txt); }catch{ return { ok: res.ok, raw: txt }; }
  } finally {
    clearTimeout(t);
  }
}

/* ---------------------------
   Plan split
--------------------------- */
function getPlan_(){
  const v = (qs("planSelect")?.value || "free").toLowerCase();
  return (v === "premium") ? "premium" : "free";
}
function getMaxPhotosByPlan_(plan){
  return (plan === "premium") ? 5 : 2;
}
function applyPlanUi_(){
  const plan = getPlan_();
  const freeBox = qs("looksFree");
  const premBox = qs("looksPremium");
  if(freeBox) freeBox.style.display = (plan === "free") ? "" : "none";
  if(premBox) premBox.style.display = (plan === "premium") ? "" : "none";

  const max = getMaxPhotosByPlan_(plan);
  const t = qs("maxPhotosText");
  if(t) t.textContent = String(max);

  // if user already selected photos > max, trim
  if(IMG_STATE.photos.length > max){
    IMG_STATE.photos = IMG_STATE.photos.slice(0, max);
    renderPreviews_();
  }
}

/* ---------------------------
   Image: compress (no crop)
--------------------------- */
const IMG_STATE = {
  avatar: null,
  logo: null,
  photos: []
};

function getImageMeta_(){
  return {
    avatar: IMG_STATE.avatar ? IMG_STATE.avatar.name : "",
    logo: IMG_STATE.logo ? IMG_STATE.logo.name : "",
    photos: IMG_STATE.photos.map(p=>p.name)
  };
}

function dataUrlToBase64_(dataUrl){
  const i = dataUrl.indexOf("base64,");
  if(i < 0) return "";
  return dataUrl.slice(i + 7);
}
function approxBytesFromBase64_(b64){
  return Math.floor((b64.length * 3) / 4);
}
function calcTotalBase64Chars_(){
  let n = 0;
  if(IMG_STATE.avatar?.dataUrl) n += dataUrlToBase64_(IMG_STATE.avatar.dataUrl).length;
  if(IMG_STATE.logo?.dataUrl) n += dataUrlToBase64_(IMG_STATE.logo.dataUrl).length;
  for(const p of IMG_STATE.photos){
    if(p?.dataUrl) n += dataUrlToBase64_(p.dataUrl).length;
  }
  return n;
}

async function fileToCompressedDataUrl_(file, opts){
  const maxEdge = opts?.maxEdge ?? FORM_CONFIG.MAX_EDGE;
  const quality = opts?.quality ?? FORM_CONFIG.JPEG_QUALITY;

  const img = await loadImageFromFile_(file);
  const { w, h } = fitSize_(img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha:false });
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const b64 = dataUrlToBase64_(dataUrl);
  const bytesApprox = approxBytesFromBase64_(b64);

  return {
    name: file.name || "image.jpg",
    mime: "image/jpeg",
    dataUrl,
    width: w,
    height: h,
    bytesApprox
  };
}

function fitSize_(w, h, maxEdge){
  if(!w || !h) return { w: maxEdge, h: maxEdge };
  const long = Math.max(w, h);
  if(long <= maxEdge) return { w, h };
  const scale = maxEdge / long;
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function loadImageFromFile_(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e)=>{
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/* ---------------------------
   Image UI
--------------------------- */
function renderPreviews_(){
  const grid = qs("previewGrid");
  const meta = qs("uploadMeta");
  if(!grid || !meta) return;

  grid.innerHTML = "";

  const items = [];
  if(IMG_STATE.avatar) items.push({ ...IMG_STATE.avatar, tag:"個人照" });
  if(IMG_STATE.logo) items.push({ ...IMG_STATE.logo, tag:"Logo" });
  IMG_STATE.photos.forEach((p,i)=>items.push({ ...p, tag:`照片${i+1}` }));

  for(const it of items){
    const div = document.createElement("div");
    div.className = "thumb";
    const img = document.createElement("img");
    img.src = it.dataUrl;
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = it.tag;
    div.appendChild(img);
    div.appendChild(badge);
    grid.appendChild(div);
  }

  const plan = getPlan_();
  const max = getMaxPhotosByPlan_(plan);

  const totalChars = calcTotalBase64Chars_();
  const totalKB = Math.round((totalChars * 0.75) / 1024);

  const note = [];
  note.push(`已選：個人照 ${IMG_STATE.avatar? "1":"0"}｜Logo ${IMG_STATE.logo? "1":"0"}｜照片 ${IMG_STATE.photos.length}/${max}`);
  note.push(`預估：約 ${totalKB} KB`);
  if(totalChars > FORM_CONFIG.MAX_TOTAL_BASE64_CHARS){
    note.push("⚠️ 照片總量偏大：請減少張數或換小一點的照片");
  }
  meta.textContent = note.join("｜");
}

function clearImages_(){
  IMG_STATE.avatar = null;
  IMG_STATE.logo = null;
  IMG_STATE.photos = [];

  const fa = qs("fileAvatar"); if(fa) fa.value = "";
  const fl = qs("fileLogo"); if(fl) fl.value = "";
  const fp = qs("filePhotos"); if(fp) fp.value = "";

  renderPreviews_();
}

async function handlePickAvatar_(file){
  if(!file) return;
  setStatus_("處理個人照中…");
  IMG_STATE.avatar = await fileToCompressedDataUrl_(file);
  setStatus_("個人照已選取", "ok");
  renderPreviews_();
}
async function handlePickLogo_(file){
  if(!file) return;
  setStatus_("處理 Logo 中…");
  IMG_STATE.logo = await fileToCompressedDataUrl_(file);
  setStatus_("Logo 已選取", "ok");
  renderPreviews_();
}
async function handlePickPhotos_(files){
  if(!files || !files.length) return;

  const plan = getPlan_();
  const max = getMaxPhotosByPlan_(plan);
  const arr = Array.from(files).slice(0, max);

  setStatus_(`處理照片中（${arr.length} 張）…`);

  const out = [];
  for(let i=0;i<arr.length;i++){
    const item = await fileToCompressedDataUrl_(arr[i]);
    out.push(item);
  }
  IMG_STATE.photos = out;

  setStatus_("照片已選取", "ok");
  renderPreviews_();
}

/* ---------------------------
   Submit
--------------------------- */
function normalizePlan_(payload){
  const plan = (payload["選擇名片製作方案"] || "").toLowerCase();
  payload["選擇名片製作方案"] = (plan === "premium") ? "premium" : "free";
}

function buildImagesPayload_(){
  const pack = {};
  if(IMG_STATE.avatar?.dataUrl){
    pack.avatar = { name: IMG_STATE.avatar.name, mime: IMG_STATE.avatar.mime, base64: dataUrlToBase64_(IMG_STATE.avatar.dataUrl) };
  }
  if(IMG_STATE.logo?.dataUrl){
    pack.logo = { name: IMG_STATE.logo.name, mime: IMG_STATE.logo.mime, base64: dataUrlToBase64_(IMG_STATE.logo.dataUrl) };
  }
  if(IMG_STATE.photos?.length){
    pack.photos = IMG_STATE.photos.map(p=>({ name: p.name, mime: p.mime, base64: dataUrlToBase64_(p.dataUrl) }));
  }
  return pack;
}

function computeLineConfirmUrl_(resp){
  const fromResp = resp?.redirect_url || resp?.data?.redirect_url || "";
  return text(fromResp) || text(FORM_CONFIG.LINE_CONFIRM_URL);
}

async function submit_(form){
  setStatus_("送出中…");

  const payload = formToObject_(form);

  if(!payload["姓名"]){
    setStatus_("請填寫「姓名（或商家名稱）」", "warn");
    const nameEl = form.querySelector(`[name="姓名"]`);
    nameEl?.scrollIntoView?.({ behavior:"smooth", block:"center" });
    nameEl?.focus?.();
    return;
  }

  normalizePlan_(payload);

  const totalChars = calcTotalBase64Chars_();
  if(totalChars > FORM_CONFIG.MAX_TOTAL_BASE64_CHARS){
    setStatus_("照片總量偏大，請減少張數或換小一點的照片後再送出。", "warn");
    return;
  }

  const images = buildImagesPayload_();

  const btn = qs("btnSubmit");
  const btnClear = qs("btnClearDraft");
  const btnClearImg = qs("btnClearImages");
  if(btn) btn.disabled = true;
  if(btnClear) btnClear.disabled = true;
  if(btnClearImg) btnClearImg.disabled = true;

  try{
    const resp = await postJson_(FORM_CONFIG.GAS, {
      action: "create",
      data: payload,
      images
    });

    const ok = (resp && resp.ok !== false);
    if(ok){
      // ✅ 不顯示任何成品網址、不顯示交貨連結、不顯示序號
      try{ localStorage.removeItem(FORM_CONFIG.DRAFT_KEY); }catch(e){}
      clearImages_();

      setStatus_("✅ 已送出成功。\n請到 LINE 官網確認 LINE / LINE OA 是否正確。", "ok");
      qs("statusBox")?.scrollIntoView?.({ behavior:"smooth", block:"center" });

      // ✅ 自動導回 LINE 確認頁（你只要設定 URL 或讓 GAS 回 redirect_url）
      const go = computeLineConfirmUrl_(resp);
      if(go){
        setTimeout(()=>{ window.location.href = go; }, 1200);
      }
    }else{
      setStatus_("送出失敗：\n" + (resp?.message || resp?.raw || "unknown error"), "warn");
    }
  }catch(err){
    setStatus_("送出失敗（可能網路或後端超時）：\n" + String(err?.message || err), "warn");
  }finally{
    if(btn) btn.disabled = false;
    if(btnClear) btnClear.disabled = false;
    if(btnClearImg) btnClearImg.disabled = false;
  }
}

/* ---------------------------
   Boot
--------------------------- */
(function boot(){
  const form = qs("cardForm");
  if(!form) return;

  loadDraft_(form);

  let t = null;
  const scheduleSave = ()=>{
    clearTimeout(t);
    t = setTimeout(()=>saveDraft_(form), FORM_CONFIG.AUTOSAVE_DEBOUNCE_MS);
  };
  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);

  // buttons
  qs("btnSubmit")?.addEventListener("click", ()=>submit_(form));
  qs("btnClearDraft")?.addEventListener("click", ()=>clearDraft_(form));

  // plan split
  qs("planSelect")?.addEventListener("change", ()=>{
    applyPlanUi_();
    renderPreviews_();
    scheduleSave();
  });
  applyPlanUi_();

  // Enter submit (except textarea)
  form.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter") return;
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
    if(tag === "TEXTAREA") return;
    e.preventDefault();
    submit_(form);
  });
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    submit_(form);
  });

  // image pick wiring
  const fileAvatar = qs("fileAvatar");
  const fileLogo = qs("fileLogo");
  const filePhotos = qs("filePhotos");

  qs("pickAvatar")?.addEventListener("click", ()=>fileAvatar?.click());
  qs("pickLogo")?.addEventListener("click", ()=>fileLogo?.click());
  qs("pickPhotos")?.addEventListener("click", ()=>filePhotos?.click());

  fileAvatar?.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    try{ await handlePickAvatar_(f); }catch(err){
      setStatus_("個人照處理失敗：" + String(err?.message || err), "warn");
    }
  });

  fileLogo?.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    try{ await handlePickLogo_(f); }catch(err){
      setStatus_("Logo 處理失敗：" + String(err?.message || err), "warn");
    }
  });

  filePhotos?.addEventListener("change", async (e)=>{
    const fs = e.target.files;
    if(!fs || !fs.length) return;
    try{ await handlePickPhotos_(fs); }catch(err){
      setStatus_("照片處理失敗：" + String(err?.message || err), "warn");
    }
  });

  qs("btnClearImages")?.addEventListener("click", ()=>{
    clearImages_();
    setStatus_("已清除已選照片", "warn");
  });

  renderPreviews_();
})();