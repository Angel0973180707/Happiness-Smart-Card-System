/* ================================
 * form.js — v409 (COMPLETE OVERWRITE)
 * ✅ 目標：解決 LINE/微信內建瀏覽器「送不出去」
 * - 先嘗試 fetch(FormData) 走最快路徑
 * - 若 fetch 失敗/被擋 → 改用「真表單 POST」開新視窗提交（最穩）
 * - 搭配 GAS doPost 的 postMessage 回傳（你要做第2步）
 * ================================ */

/** ====== 固定參數 ====== */
const BASE = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
const GAS  = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
const LINE_OA_DEFAULT = "https://lin.ee/G3VJoRm";

/** ====== 狀態 ====== */
const state = { plan:"1", c:"c1", s:"s1", f:"f1", p:"p1" };

/** ====== DOM helpers ====== */
const qs = (id) => document.getElementById(id);
const text = (v) => (v == null ? "" : String(v)).trim();

function toast_(msg){
  const el = qs("msg");
  if (el){ el.textContent = msg || ""; return; }
  if (msg) alert(msg);
}

function must_(cond, msg){ if(!cond) throw new Error(msg); }

/** ====== UI: plan / chips ====== */
function setPlan(plan){
  state.plan = (plan === "2") ? "2" : "1";
  qs("btnPlan1")?.classList.toggle("active", state.plan === "1");
  qs("btnPlan2")?.classList.toggle("active", state.plan === "2");
  if (qs("freeBox")) qs("freeBox").style.display = (state.plan === "1") ? "" : "none";
  if (qs("premiumBox")) qs("premiumBox").style.display = (state.plan === "2") ? "" : "none";
}

function setActiveChip(group, val){
  const chips = Array.from(document.querySelectorAll(`.chip[data-group="${group}"]`));
  chips.forEach(b => b.classList.toggle("active", b.dataset.val === val));
  state[group] = val;
}

function bindChips(){
  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const g = btn.dataset.group;
      const v = btn.dataset.val;
      setActiveChip(g, v);
    });
  });
}

function bindPlan(){
  qs("btnPlan1")?.addEventListener("click", ()=>setPlan("1"));
  qs("btnPlan2")?.addEventListener("click", ()=>setPlan("2"));
}

/** ====== URL builders ====== */
function buildCardUrl(id){ return `${BASE}?id=${encodeURIComponent(id)}`; }
function buildOpenUrl(id){ return `${BASE}open.html?id=${encodeURIComponent(id)}`; }
function buildWeChatUrl(id){
  const u = new URL(`${BASE}wechat.html`);
  u.searchParams.set("id", id);
  u.searchParams.set("plan", state.plan);
  if (state.plan === "2") u.searchParams.set("p", state.p);
  if (state.plan === "1") u.searchParams.set("c", state.c);
  return u.toString();
}

/** ====== payload fields（對齊你的試算表表頭） ====== */
function buildFields_(){
  const wechatId = text(qs("wechat")?.value);

  return {
    // 方案
    "選擇名片製作方案": state.plan,
    "選擇名片顏色": state.plan === "1" ? state.c : "",
    "選擇版型風格": state.plan === "1" ? state.s : "",
    "選擇紙感質地": state.plan === "1" ? state.f : "",
    "選擇精品底色": state.plan === "2" ? state.p : "",

    // 基本資料
    "姓名": text(qs("name")?.value),
    "單位": text(qs("unit")?.value),
    "頭銜": text(qs("title")?.value),
    "理念標語": text(qs("slogan")?.value),
    "服務項目": text(qs("service")?.value),
    "經歷": text(qs("exp")?.value),

    // 聯繫
    "微信ID": wechatId,
    "微信": wechatId, // 舊欄位相容保險
    "LINE連結": text(qs("lineLink")?.value),
    "LINE官方帳號": text(qs("lineOA")?.value),
    "Email": text(qs("email")?.value),
    "電話": text(qs("phone")?.value),
    "地址": text(qs("addr")?.value),

    // 平台（你現在表頭是「影音連結/社群連結」，但 GAS 有兼容舊欄位）
    // 這裡照你的 GAS v406：先送新欄位名（更正確）
    "影音連結1": text(qs("media1")?.value),
    "影音連結2": text(qs("media2")?.value),
    "影音連結3": text(qs("media3")?.value),
    "社群連結1": text(qs("social1")?.value),
    "社群連結2": text(qs("social2")?.value),
    "社群連結3": text(qs("social3")?.value),
  };
}

/** ====== 結果顯示 ====== */
function showResult_(id){
  const cardUrl   = buildCardUrl(id);
  const wechatUrl = buildWeChatUrl(id);
  const openUrl   = buildOpenUrl(id);

  qs("resultBox").style.display = "";

  const a1 = qs("rCardUrl");
  if (a1){ a1.textContent = cardUrl; a1.href = cardUrl; }

  const a2 = qs("rWechatUrl");
  if (a2){ a2.textContent = wechatUrl; a2.href = wechatUrl; }

  const a3 = qs("rOpenUrl");
  if (a3){ a3.textContent = openUrl; a3.href = openUrl; }

  qs("btnCopyCard")?.removeAttribute("disabled");
  qs("btnShareCard")?.removeAttribute("disabled");

  toast_("✅ 建立完成");
}

/** ====== fetch(FormData) 提交（快） ====== */
async function submitByFetch_(fields){
  const fd = new FormData();
  fd.append("action", "submit");               // ✅ 對齊你的 GAS：doPost(action=submit)
  fd.append("return_mode", "json");            // ✅ 我們希望拿到 JSON

  Object.keys(fields).forEach(k => fd.append(k, fields[k] || ""));

  const res = await fetch(GAS, { method:"POST", body: fd });
  const txt = await res.text();

  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }

  if (!data || data.ok !== true) {
    const err = (data && data.error) ? data.error : `fetch 回傳非 JSON/非 ok（HTTP ${res.status}）`;
    throw new Error(err);
  }
  return data;
}

/** ====== 真表單 POST（最穩，給 LINE/微信）+ postMessage 回傳 ====== */
function submitByRealForm_(fields){
  return new Promise((resolve, reject)=>{
    // 1) 先掛 message listener 等 GAS 回來
    const onMsg = (ev) => {
      // 你也可以加嚴格 origin 檢查，但 GAS 會是 google.com，且不同區會變，先用資料判斷最穩
      const data = ev?.data;
      if (!data || typeof data !== "object") return;
      if (data.__angel !== "submit_result") return;

      window.removeEventListener("message", onMsg);
      if (data.ok === true) resolve(data);
      else reject(new Error(data.error || "提交失敗"));
    };
    window.addEventListener("message", onMsg);

    // 2) 開新視窗（避免內建瀏覽器擋住）
    const w = window.open("", "_blank");
    if (!w) {
      window.removeEventListener("message", onMsg);
      reject(new Error("瀏覽器阻擋彈出視窗：請允許彈出視窗後再送出一次"));
      return;
    }

    // 3) 動態建立 form → submit 到 GAS
    const form = document.createElement("form");
    form.method = "POST";
    form.action = GAS;
    form.target = w.name || "_blank";

    const add = (k, v) => {
      const inp = document.createElement("input");
      inp.type = "hidden";
      inp.name = k;
      inp.value = v == null ? "" : String(v);
      form.appendChild(inp);
    };

    add("action", "submit");                   // ✅ 對齊 GAS
    add("return_mode", "pm");                  // ✅ 要求 GAS 回 HTML + postMessage
    add("pm_tag", "__angel_submit_v1");        // ✅ 防呆 tag（可選）

    Object.keys(fields).forEach(k => add(k, fields[k] || ""));

    document.body.appendChild(form);
    form.submit();

    // 4) 安全：35 秒還沒回來就當失敗
    setTimeout(()=>{
      window.removeEventListener("message", onMsg);
      try { w.close(); } catch {}
      reject(new Error("等待逾時：LINE/微信 內建瀏覽器若太慢，請改用外部瀏覽器重試"));
    }, 35000);

    // 清掉表單節點
    setTimeout(()=>{ try{ form.remove(); }catch{} }, 1200);
  });
}

/** ====== submit 主流程 ====== */
async function submit_(){
  const btn = qs("btnSubmit");
  must_(!!btn, "找不到送出按鈕");

  btn.disabled = true;
  toast_("");

  if (qs("lineOA") && !text(qs("lineOA").value)) qs("lineOA").value = LINE_OA_DEFAULT;

  const fields = buildFields_();
  must_(!!fields["姓名"], "姓名為必填。");

  toast_("送出中…");

  // 先用 fetch（快），失敗就用真表單（穩）
  let data = null;
  try {
    data = await submitByFetch_(fields);
  } catch (e) {
    // 改用真表單（LINE/微信最常走這條）
    data = await submitByRealForm_(fields);
  }

  const id = text(data.id || "");
  must_(!!id, "建立成功但缺少 id（請檢查 GAS 回傳）");

  showResult_(id);
  btn.disabled = false;
}

/** ====== copy / share ====== */
async function copyText_(t){
  try{
    await navigator.clipboard.writeText(t);
    return true;
  }catch{
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand("copy"); }catch{}
    ta.remove();
    return true;
  }
}

async function copyCardUrl_(){
  const u = qs("rCardUrl")?.href || "";
  if(!u) return toast_("⚠️ 尚無名片網址");
  await copyText_(u);
  toast_("✅ 已複製名片網址");
}

async function shareCardUrl_(){
  const u = qs("rCardUrl")?.href || "";
  if(!u) return toast_("⚠️ 尚無名片網址");

  if (navigator.share){
    try{
      await navigator.share({ title:"智慧名片", text:"這是你的智慧名片連結", url:u });
      toast_("✅ 已呼叫系統分享");
      return;
    }catch{}
  }
  await copyText_(u);
  toast_("✅ 已複製名片網址（可直接貼出）");
}

/** ====== boot ====== */
(function boot(){
  bindPlan();
  bindChips();

  setPlan("1");
  setActiveChip("c", "c1");
  setActiveChip("s", "s1");
  setActiveChip("f", "f1");
  setActiveChip("p", "p1");

  if (qs("lineOA")) qs("lineOA").placeholder = LINE_OA_DEFAULT;

  qs("btnSubmit")?.addEventListener("click", ()=>{
    submit_().catch(err=>{
      console.error(err);
      toast_("❌ " + (err?.message || String(err)));
      qs("btnSubmit").disabled = false;
    });
  });

  qs("btnCopyCard")?.addEventListener("click", ()=>copyCardUrl_().catch(()=>{}));
  qs("btnShareCard")?.addEventListener("click", ()=>shareCardUrl_().catch(()=>{}));
})();