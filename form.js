/* form.js (v1 COMPLETE OVERWRITE)
 * - POST to GAS action=create (JSON body)
 * - keeps all fields as-is (shared schema)
 */

const FORM_CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  TIMEOUT_MS: 15000
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
    // best-effort json
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

(function boot(){
  const form = qs("cardForm");
  if(!form) return;

  qs("btnFillDemo")?.addEventListener("click", demoFill_);

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

    try{
      const resp = await postJson_(FORM_CONFIG.GAS, { action: "create", data: payload });
      if(resp && resp.ok !== false){
        const id = resp.id || resp.card_id || resp.data?.id || "";
        const token = resp.token || resp.data?.token || "";
        setStatus_(
          "✅ 已送出成功！\n" +
          (id ? `名片序號：${id}\n` : "") +
          (token ? `token：${token}\n` : "") +
          "你可以返回名片頁預覽（若剛送出，可能需要等資料寫入完成再刷新）。"
        );
      }else{
        setStatus_("⚠️ 送出失敗：\n" + (resp?.message || resp?.raw || "unknown error"));
      }
    }catch(err){
      setStatus_("⚠️ 送出失敗（可能網路或後端超時）：\n" + String(err?.message || err));
    }
  });
})();