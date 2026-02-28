/* form.js v1.1 (COMPLETE OVERWRITE)
 * ✅ 依你要求：
 * - POST to GAS action=create (JSON body)
 * - 保留所有欄位 schema（不改欄位名、不刪欄位）
 * - 成品連結欄「不出現」：不在表單提供任何 delivery_url / share_url 欄位
 * - 送出後提示：去 LINE 官網確認（可一鍵開啟）
 * - 大字好填/好滑動/好修改：這是 form.html 的事，但這支 JS 會避免 iOS 放大、並加草稿功能（可選）
 *
 * 🔧 你只要改一個地方：
 * - LINE_OFFICIAL_URL 改成你的 LINE 官網 / OA 連結
 */

const FORM_CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  TIMEOUT_MS: 15000,

  // ✅ 送出後提示去 LINE 官網確認（請改成你的連結）
  // 例：https://page.line.me/xxxxx 或 https://lin.ee/xxxxx
  LINE_OFFICIAL_URL: "https://line.me/R/ti/p/@YOUR_LINE_ID",

  // ✅ 可選：自動存草稿（若不想要，改成 false）
  ENABLE_DRAFT: true,
  DRAFT_KEY: "HSC_FORM_DRAFT_v1_1"
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

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

function setStatus_(msg){
  const box = qs("statusBox");
  if(!box) return;
  box.textContent = msg || "";
}

function openLineOfficial_(){
  const u = text(FORM_CONFIG.LINE_OFFICIAL_URL);
  if(!u || u.includes("@YOUR_LINE_ID")){
    alert("⚠️ 請先在 form.js 設定 LINE_OFFICIAL_URL（你的 LINE 官網連結）。");
    return;
  }
  window.open(u, "_blank");
}

function ensureGoLineButton_(){
  const box = qs("statusBox");
  if(!box) return;
  if(qs("btnGoLineAfterSubmit")) return;

  const btn = document.createElement("button");
  btn.id = "btnGoLineAfterSubmit";
  btn.type = "button";
  btn.textContent = "前往 LINE 官網確認";
  btn.style.marginTop = "10px";
  btn.style.width = "100%";
  btn.style.border = "0";
  btn.style.borderRadius = "16px";
  btn.style.padding = "14px 16px";
  btn.style.fontWeight = "900";
  btn.style.cursor = "pointer";
  btn.style.color = "#0f1218";
  btn.style.background = "rgba(255,255,255,0.92)";
  btn.style.boxShadow = "0 18px 40px rgba(0,0,0,0.26)";
  btn.addEventListener("click", openLineOfficial_);
  box.appendChild(btn);
}

/* ---------------- Draft (optional) ---------------- */
function saveDraft_(form){
  if(!FORM_CONFIG.ENABLE_DRAFT) return;
  try{
    const payload = formToObject_(form);
    delete payload["時間戳記"];
    localStorage.setItem(FORM_CONFIG.DRAFT_KEY, JSON.stringify(payload));
  }catch{}
}

function loadDraft_(form){
  if(!FORM_CONFIG.ENABLE_DRAFT) return false;
  try{
    const raw = localStorage.getItem(FORM_CONFIG.DRAFT_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(!data || typeof data !== "object") return false;

    for(const [k,v] of Object.entries(data)){
      const el = form.querySelector(`[name="${CSS.escape(k)}"]`);
      if(el) el.value = String(v ?? "");
    }
    return true;
  }catch{
    return false;
  }
}

function debounce_(fn, ms){
  let t = null;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this, args), ms);
  };
}

/* ---------------- Demo fill (keep) ---------------- */
function demoFill_(){
  const f = qs("cardForm");
  if(!f) return;
  const set = (name, val)=>{
    const el = f.querySelector(`[name="${CSS.escape(name)}"]`);
    if(el) el.value = val;
  };
  set("選擇名片製作方案","free");
  set("姓名","示範｜幸福緣烘焙工作室");
  set("單位","幸福緣");
  set("頭銜","主理人");
  set("理念標語","在外奔波，心裡有個家的惦記是幸福的。");
  set("服務項目","健康手作麵包\n親子早餐設計\n客製化禮盒");
  set("經歷","退休教師\n自學烘焙\n長時低溫發酵研究");
  set("LINE官方帳號","@angelshop");
  set("電話","0912-333-444");
  set("地址","高雄市（示範）");
  set("照片","https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg");
  setStatus_("✅ 已填入範例（可直接修改後送出）");
}

/* ---------------- Boot ---------------- */
(function boot(){
  const form = qs("cardForm");
  if(!form) return;

  // demo button optional
  qs("btnFillDemo")?.addEventListener("click", demoFill_);

  // load draft once
  const loaded = loadDraft_(form);
  if(loaded){
    setStatus_("✅ 已載入上次草稿（可直接修改後送出）");
  }

  // auto-save draft
  const saveDebounced = debounce_(()=>saveDraft_(form), 350);
  form.addEventListener("input", saveDebounced, { passive:true });
  form.addEventListener("change", saveDebounced, { passive:true });

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    setStatus_("⏳ 送出中…");

    const payload = formToObject_(form);

    // minimal validation
    if(!payload["姓名"]){
      setStatus_("⚠️ 請至少填寫「姓名（或商家名稱）」");
      return;
    }

    // Normalize plan values for backend
    const plan = (payload["選擇名片製作方案"] || "").toLowerCase();
    if(plan !== "free" && plan !== "premium") payload["選擇名片製作方案"] = "free";

    // ✅ 不送任何「成品連結」相關欄位（即使有人手動加在 DOM）
    delete payload["成品連結"];
    delete payload["delivery_url"];
    delete payload["share_url"];
    delete payload["成品網址"];
    delete payload["名片連結"];

    try{
      const resp = await postJson_(FORM_CONFIG.GAS, { action: "create", data: payload });

      if(resp && resp.ok !== false){
        // 成功：不顯示任何成品連結欄位，改為引導去 LINE 官網確認
        // （可保留 id/token 供你內部核對，但不顯示連結）
        const id = resp.id || resp.card_id || resp.data?.id || "";
        const token = resp.token || resp.data?.token || "";

        // 清草稿
        if(FORM_CONFIG.ENABLE_DRAFT){
          try{ localStorage.removeItem(FORM_CONFIG.DRAFT_KEY); }catch{}
        }

        setStatus_(
          "✅ 已送出成功！\n" +
          (id ? `名片序號：${id}\n` : "") +
          (token ? `token：${token}\n` : "") +
          "\n下一步：請到「LINE 官網」確認。\n" +
          "（若在 LINE/微信內建瀏覽器，建議用外部瀏覽器開啟）"
        );
        ensureGoLineButton_();
      }else{
        setStatus_("⚠️ 送出失敗：\n" + (resp?.message || resp?.raw || "unknown error"));
      }
    }catch(err){
      setStatus_("⚠️ 送出失敗（可能網路或後端超時）：\n" + String(err?.message || err));
    }
  });
})();