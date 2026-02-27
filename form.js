/* ================================
 * form.js — v408 (COMPLETE OVERWRITE)
 * - 延續 v406.2 功能不變
 * - ✅ 隱形 Debug（長按版）：長按「v407-UI｜極簡精品表單」(brand-sub) 1.2 秒 → 開/關 Debug 面板
 *   - 也支援網址 ?debug=1 直接開
 * - Debug 面板：只給你自己看（顧客不會看到）
 * ================================ */

/** ====== 固定參數（已填好） ====== */
const BASE = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
const GAS  = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
const LINE_OA_DEFAULT = "https://lin.ee/G3VJoRm";

/** ====== 狀態 ====== */
const state = {
  plan: "1", // 1 free, 2 premium
  c: "c1",
  s: "s1",
  f: "f1",
  p: "p1",
};

/** ====== DOM helpers ====== */
const qs = (id) => document.getElementById(id);
const text = (v) => (v == null ? "" : String(v)).trim();

function toast_(msg){
  // 你目前表單有 msg 區塊就用它；沒有就用 alert
  const el = qs("msg");
  if (el){
    el.textContent = msg || "";
    return;
  }
  if (msg) alert(msg);
}

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
function buildCardUrl(id){
  return `${BASE}?id=${encodeURIComponent(id)}`;
}
function buildOpenUrl(id){
  return `${BASE}open.html?id=${encodeURIComponent(id)}`;
}
function buildWeChatUrl(id){
  const u = new URL(`${BASE}wechat.html`);
  u.searchParams.set("id", id);
  u.searchParams.set("plan", state.plan);
  if (state.plan === "2") u.searchParams.set("p", state.p);
  if (state.plan === "1") u.searchParams.set("c", state.c);
  return u.toString();
}

/** ====== payload fields (對齊你目前表頭命名) ====== */
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
    "微信": wechatId, // 相容舊欄位（保險）
    "LINE連結": text(qs("lineLink")?.value),
    "LINE官方帳號": text(qs("lineOA")?.value),
    "Email": text(qs("email")?.value),
    "電話": text(qs("phone")?.value),
    "地址": text(qs("addr")?.value),

    // 平台（保留欄位，不會壞）
    "影音平台1": text(qs("media1")?.value),
    "影音平台2": text(qs("media2")?.value),
    "影音平台3": text(qs("media3")?.value),
    "社群平台1": text(qs("social1")?.value),
    "社群平台2": text(qs("social2")?.value),
    "社群平台3": text(qs("social3")?.value),
  };
}

function must_(cond, msg){
  if(!cond) throw new Error(msg);
}

/** ====== Debug (隱形面板) ====== */
const DBG = (() => {
  const u = new URL(location.href);
  const q = (u.searchParams.get("debug") || "").trim();
  const fromQuery = (q === "1" || q.toLowerCase() === "true");
  const fromSession = sessionStorage.getItem("__angel_form_debug") === "1";
  return { on: fromQuery || fromSession };
})();

let __dbgPanel = null;
let __dbgLogBox = null;
let __dbgStateBox = null;
let __dbgLast = { url:"", req:null, resText:"", resJson:null, err:"" };

function dbgEnable_(on){
  DBG.on = !!on;
  sessionStorage.setItem("__angel_form_debug", DBG.on ? "1" : "0");
  if (DBG.on) dbgEnsurePanel_();
  if (__dbgPanel) __dbgPanel.style.display = DBG.on ? "" : "none";
  dbgState_();
  if (DBG.on) dbgLog_("DEBUG ON");
}

function dbgEnsurePanel_(){
  if (__dbgPanel) return;

  const panel = document.createElement("div");
  panel.id = "dbgPanel";
  panel.style.cssText = [
    "position:fixed",
    "left:12px",
    "right:12px",
    "bottom:12px",
    "z-index:99999",
    "background:rgba(10,14,20,.92)",
    "border:1px solid rgba(255,255,255,.16)",
    "border-radius:16px",
    "padding:12px",
    "box-shadow:0 14px 50px rgba(0,0,0,.55)",
    "backdrop-filter:blur(10px)",
    "color:#e5e7eb",
    "font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    "display:none",
    "max-height:46vh",
    "overflow:hidden"
  ].join(";");

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-weight:800;letter-spacing:.4px;">Angel Debug</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
        <button type="button" data-act="copyReq" style="${dbgBtnCss_()}">Copy req</button>
        <button type="button" data-act="copyRes" style="${dbgBtnCss_()}">Copy res</button>
        <button type="button" data-act="clear"   style="${dbgBtnCss_()}">Clear</button>
        <button type="button" data-act="close"   style="${dbgBtnCss_()}">Close</button>
      </div>
    </div>
    <div id="dbgState" style="margin-top:8px;font-size:12px;opacity:.85;white-space:pre-wrap;"></div>
    <div id="dbgLog" style="margin-top:8px;font-size:12px;line-height:1.45;overflow:auto;max-height:26vh;border-top:1px dashed rgba(255,255,255,.16);padding-top:8px;"></div>
  `;

  document.body.appendChild(panel);
  __dbgPanel = panel;
  __dbgLogBox = panel.querySelector("#dbgLog");
  __dbgStateBox = panel.querySelector("#dbgState");

  panel.addEventListener("click", async (e)=>{
    const btn = e.target.closest("button[data-act]");
    if(!btn) return;
    const act = btn.getAttribute("data-act");

    if (act === "close"){
      dbgEnable_(false);
      return;
    }
    if (act === "clear"){
      if (__dbgLogBox) __dbgLogBox.textContent = "";
      return;
    }
    if (act === "copyReq"){
      const payload = __dbgLast?.req ? JSON.stringify(__dbgLast.req, null, 2) : "";
      await dbgCopy_(payload || "(empty req)");
      dbgLog_("copied req");
      return;
    }
    if (act === "copyRes"){
      const payload = __dbgLast?.resJson
        ? JSON.stringify(__dbgLast.resJson, null, 2)
        : (__dbgLast?.resText || "");
      await dbgCopy_(payload || "(empty res)");
      dbgLog_("copied res");
      return;
    }
  });
}

function dbgBtnCss_(){
  return [
    "appearance:none",
    "border:1px solid rgba(255,255,255,.18)",
    "background:rgba(255,255,255,.06)",
    "color:#e5e7eb",
    "padding:8px 10px",
    "border-radius:12px",
    "font-weight:800",
    "cursor:pointer",
    "font-size:12px"
  ].join(";");
}

async function dbgCopy_(txt){
  try{
    await navigator.clipboard.writeText(txt);
    return true;
  }catch{
    // fallback
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand("copy"); }catch{}
    ta.remove();
    return true;
  }
}

function dbgLog_(msg){
  if(!DBG.on) return;
  dbgEnsurePanel_();
  const line = document.createElement("div");
  const t = new Date();
  const hh = String(t.getHours()).padStart(2,"0");
  const mm = String(t.getMinutes()).padStart(2,"0");
  const ss = String(t.getSeconds()).padStart(2,"0");
  line.textContent = `[${hh}:${mm}:${ss}] ${msg}`;
  __dbgLogBox?.appendChild(line);
  if (__dbgLogBox) __dbgLogBox.scrollTop = __dbgLogBox.scrollHeight;
}

function dbgState_(){
  if(!DBG.on) return;
  dbgEnsurePanel_();
  const s = [
    `plan=${state.plan}  c=${state.c}  s=${state.s}  f=${state.f}  p=${state.p}`,
    `GAS=${GAS}`,
    `BASE=${BASE}`,
  ].join("\n");
  if (__dbgStateBox) __dbgStateBox.textContent = s;
}

/** 長按觸發（brand-sub） */
function bindLongPressDebug_(){
  const el = document.querySelector(".brand-sub");
  if(!el) return;

  let timer = null;
  const HOLD_MS = 1200;
  const start = (e)=>{
    if (timer) clearTimeout(timer);
    timer = setTimeout(()=>{
      dbgEnable_(!DBG.on);
    }, HOLD_MS);
  };
  const end = ()=>{
    if (timer) clearTimeout(timer);
    timer = null;
  };

  el.addEventListener("touchstart", start, { passive:true });
  el.addEventListener("touchend", end);
  el.addEventListener("touchcancel", end);

  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", end);
  el.addEventListener("mouseleave", end);
}

/** ====== POST helpers ====== */
async function postCreateJson_(fields){
  const url = `${GAS}?action=create`;
  const reqObj = { fields };
  __dbgLast.url = url;
  __dbgLast.req = reqObj;

  dbgLog_(`POST JSON → ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(reqObj),
  });

  const txt = await res.text();
  __dbgLast.resText = txt;

  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }
  __dbgLast.resJson = data;

  dbgLog_(`JSON res (${res.status}) parsed=${!!data}`);
  return data;
}

async function postCreateFormData_(fields){
  // ✅ 不手動設定 multipart/form-data Content-Type（讓瀏覽器自己加 boundary）
  const fd = new FormData();
  fd.append("action", "create");
  Object.keys(fields).forEach(k => fd.append(k, fields[k] || ""));

  __dbgLast.url = GAS;
  __dbgLast.req = { action:"create", fields };

  dbgLog_(`POST FormData → ${GAS}`);

  const res = await fetch(GAS, { method:"POST", body: fd });
  const txt = await res.text();
  __dbgLast.resText = txt;

  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }
  __dbgLast.resJson = data;

  dbgLog_(`FormData res (${res.status}) parsed=${!!data}`);
  return data;
}

/** ====== UI result ====== */
function showResult_(id){
  const cardUrl   = buildCardUrl(id);
  const wechatUrl = buildWeChatUrl(id);
  const openUrl   = buildOpenUrl(id);

  qs("resultBox").style.display = "";

  const a1 = qs("rCardUrl");
  if (a1){
    a1.textContent = cardUrl;
    a1.href = cardUrl;
  }

  const a2 = qs("rWechatUrl");
  if (a2){
    a2.textContent = wechatUrl;
    a2.href = wechatUrl;
  }

  const a3 = qs("rOpenUrl");
  if (a3){
    a3.textContent = openUrl;
    a3.href = openUrl;
  }

  // 交貨按鈕（若你前端仍保留）
  qs("btnCopyCard")?.removeAttribute("disabled");
  qs("btnShareCard")?.removeAttribute("disabled");

  toast_("✅ 建立完成");
  dbgLog_(`OK id=${id}`);
}

/** ====== submit ====== */
async function submit_(){
  const btn = qs("btnSubmit");
  if (!btn) return;

  btn.disabled = true;
  toast_("");

  // 預設補 LINE OA（你要「幫我填」）
  if (qs("lineOA") && !text(qs("lineOA").value)) qs("lineOA").value = LINE_OA_DEFAULT;

  const fields = buildFields_();
  must_(!!fields["姓名"], "姓名為必填。");

  dbgState_();

  // 先 JSON
  let data = await postCreateJson_(fields);

  // fallback：FormData
  if(!data || data.ok !== true){
    dbgLog_("JSON failed → fallback FormData");
    data = await postCreateFormData_(fields);
  }

  if(!data || data.ok !== true){
    btn.disabled = false;
    const err = data?.error || "建立失敗：GAS 回傳非 ok 或非 JSON";
    __dbgLast.err = err;
    dbgLog_("ERROR: " + err);
    throw new Error(err);
  }

  const id = text(data.id) || "";
  must_(!!id, "建立成功但缺少 id（請檢查 GAS 回傳）");

  showResult_(id);
  btn.disabled = false;
}

/** ====== copy / share（如果你有按鈕就能用） ====== */
async function copyText_(t){
  await dbgCopy_(t);
}

async function copyCardUrl_(){
  const a = qs("rCardUrl");
  const u = a?.href || "";
  if(!u) return toast_("⚠️ 尚無名片網址");
  await copyText_(u);
  toast_("✅ 已複製名片網址");
}

async function shareCardUrl_(){
  const a = qs("rCardUrl");
  const u = a?.href || "";
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
  // plan / chips
  bindPlan();
  bindChips();

  // default
  setPlan("1");
  setActiveChip("c", "c1");
  setActiveChip("s", "s1");
  setActiveChip("f", "f1");
  setActiveChip("p", "p1");

  // default line OA
  if (qs("lineOA")) qs("lineOA").placeholder = LINE_OA_DEFAULT;

  // submit
  qs("btnSubmit")?.addEventListener("click", ()=>{
    submit_().catch(err=>{
      console.error(err);
      toast_("❌ " + (err?.message || String(err)));
      qs("btnSubmit").disabled = false;
    });
  });

  // copy/share (可選)
  qs("btnCopyCard")?.addEventListener("click", ()=>copyCardUrl_().catch(()=>{}));
  qs("btnShareCard")?.addEventListener("click", ()=>shareCardUrl_().catch(()=>{}));

  // 隱形 debug：長按 brand-sub
  bindLongPressDebug_();

  // 若 debug 原本就是開的（?debug=1 或 session），直接顯示面板
  if (DBG.on) dbgEnable_(true);
})();