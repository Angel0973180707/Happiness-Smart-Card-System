/* form.js v2 (COMPLETE OVERWRITE)
 * Goal:
 * - Big, easy, clear flow (pairs with form.html v2)
 * - Auto draft save/restore/clear (localStorage)
 * - Submit via sticky button (#btnSubmit) or Enter
 * - After submit: show message + "go LINE official site to confirm"
 * - NO "delivery link" field shown/created
 */

const FORM_CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  TIMEOUT_MS: 15000,
  DRAFT_KEY: "hsc_form_draft_v2",
  AUTOSAVE_DEBOUNCE_MS: 450
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
  // timestamp (client)
  out["時間戳記"] = new Date().toISOString();
  return out;
}

function objectToForm_(formEl, obj){
  if(!obj || typeof obj !== "object") return;
  for(const [k,v] of Object.entries(obj)){
    // skip timestamp when restoring to inputs
    if(k === "時間戳記") continue;
    const el = formEl.querySelector(`[name="${CSS.escape(k)}"]`);
    if(!el) continue;

    // for selects: set only if option exists, else keep default
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
  return out;
}

function saveDraft_(formEl){
  try{
    const draft = collectDraft_(formEl);
    localStorage.setItem(FORM_CONFIG.DRAFT_KEY, JSON.stringify(draft));
    const hint = qs("draftHint");
    if(hint) hint.textContent = "提示：已自動儲存草稿（可隨時回來修改）。";
  }catch(e){
    // ignore
  }
}

function loadDraft_(formEl){
  try{
    const raw = localStorage.getItem(FORM_CONFIG.DRAFT_KEY);
    if(!raw) return false;
    const obj = JSON.parse(raw);
    if(!obj || typeof obj !== "object") return false;

    objectToForm_(formEl, obj);

    const hint = qs("draftHint");
    if(hint) hint.textContent = "提示：已載入上次草稿（可直接修改後送出）。";
    return true;
  }catch(e){
    return false;
  }
}

function clearDraft_(formEl){
  try{ localStorage.removeItem(FORM_CONFIG.DRAFT_KEY); }catch(e){}
  try{
    // reset form to defaults
    formEl.reset();
    // keep plan default to free (as your HTML first option already)
  }catch(e){}
  setStatus_("🧹 已清除草稿。你可以重新填寫。","warn");

  const hint = qs("draftHint");
  if(hint) hint.textContent = "提示：草稿已清除（系統會在你輸入時再次自動儲存）。";
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
   Submit
--------------------------- */
function normalizePlan_(payload){
  const plan = (payload["選擇名片製作方案"] || "").toLowerCase();
  if(plan !== "free" && plan !== "premium"){
    payload["選擇名片製作方案"] = "free";
  }
}

async function submit_(form){
  setStatus_("⏳ 送出中…");

  const payload = formToObject_(form);

  // minimal validation
  if(!payload["姓名"]){
    setStatus_("⚠️ 請至少填寫「姓名（或商家名稱）」","warn");
    // scroll to name field
    const nameEl = form.querySelector(`[name="姓名"]`);
    nameEl?.scrollIntoView?.({ behavior:"smooth", block:"center" });
    nameEl?.focus?.();
    return;
  }

  normalizePlan_(payload);

  // lock UI
  const btn = qs("btnSubmit");
  const btnClear = qs("btnClearDraft");
  if(btn) btn.disabled = true;
  if(btnClear) btnClear.disabled = true;

  try{
    const resp = await postJson_(FORM_CONFIG.GAS, { action: "create", data: payload });

    // interpret success (best-effort)
    const ok = (resp && resp.ok !== false);
    if(ok){
      // success: clear draft (optional but recommended after create)
      try{ localStorage.removeItem(FORM_CONFIG.DRAFT_KEY); }catch(e){}

      const id = resp.id || resp.card_id || resp.data?.id || "";
      // token is sensitive-ish; you can decide to show or not.
      // Here we DO NOT display token by default to keep UX simple.
      const lines = [];
      lines.push("✅ 已送出成功！");
      if(id) lines.push(`名片序號：${id}`);
      lines.push("");
      lines.push("📌 請到 LINE 官網確認你的 LINE 官方帳號 / LINE 連結是否正確。");
      lines.push("若剛送出，名片資料寫入可能需要一點點時間，回到名片頁預覽時請刷新一次。");

      setStatus_(lines.join("\n"), "ok");

      // optional: scroll to status
      qs("statusBox")?.scrollIntoView?.({ behavior:"smooth", block:"center" });
    }else{
      setStatus_("⚠️ 送出失敗：\n" + (resp?.message || resp?.raw || "unknown error"), "warn");
    }
  }catch(err){
    setStatus_("⚠️ 送出失敗（可能網路或後端超時）：\n" + String(err?.message || err), "warn");
  }finally{
    if(btn) btn.disabled = false;
    if(btnClear) btnClear.disabled = false;
  }
}

/* ---------------------------
   Boot
--------------------------- */
(function boot(){
  const form = qs("cardForm");
  if(!form) return;

  // Load draft if exists
  loadDraft_(form);

  // Autosave draft on input/change (debounced)
  let t = null;
  const scheduleSave = ()=>{
    clearTimeout(t);
    t = setTimeout(()=>saveDraft_(form), FORM_CONFIG.AUTOSAVE_DEBOUNCE_MS);
  };
  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);

  // Submit by sticky button
  qs("btnSubmit")?.addEventListener("click", ()=>{
    submit_(form);
  });

  // Clear draft
  qs("btnClearDraft")?.addEventListener("click", ()=>{
    clearDraft_(form);
  });

  // Enter key submit (except in textarea)
  form.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter") return;
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
    if(tag === "TEXTAREA") return;
    // prevent accidental submits in select/input
    e.preventDefault();
    submit_(form);
  });

  // Also allow native submit if user triggers it (safety)
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    submit_(form);
  });
})();