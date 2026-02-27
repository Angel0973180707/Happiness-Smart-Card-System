/* ================================
 * form.js — v406.2 (COMPLETE OVERWRITE)
 * - 固定 GAS / BASE / LINE_OA（不靠 UI）
 * - 方案分流：1=free (c/s/f), 2=premium (p)
 * - 送出：POST → 優先 JSON（?action=create）
 *   - 若 GAS 不吃 JSON，fallback：FormData（不手動設 Content-Type）
 * - 成功後：顯示三條交貨連結
 *   1) card_url   (GitHub ?id=)
 *   2) wechat_url (wechat.html?id=...&plan=...&p=...&c=...)
 *   3) open_url   (open.html?id=...)  ← 提高打開機率
 * - 隱形 debug：
 *   - 預設不顯示
 *   - ?debug=1 / true 顯示
 *   - 或長按 header brand 1.2s 切換顯示
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

/** ====== debug (hidden) ======
 * - URL ?debug=1|true 直接顯示
 * - 長按 header brand 1.2 秒切換
 */
function getParam_(name){
  try{
    const u = new URL(location.href);
    return (u.searchParams.get(name) || "").trim();
  }catch{
    return "";
  }
}
const DEBUG_FORCE = (() => {
  const v = getParam_("debug");
  return v === "1" || String(v).toLowerCase() === "true";
})();
let DEBUG_ON = DEBUG_FORCE;

let __debugLast = {
  at: "",
  phase: "",
  requestUrl: "",
  requestMode: "",
  requestBodyPreview: "",
  responseRaw: "",
  responseJson: null,
  error: ""
};

function ensureDebugPanel_(){
  if (qs("debugPanel")) return;

  const wrap = document.createElement("div");
  wrap.id = "debugPanel";
  wrap.style.cssText = `
    position:fixed; left:12px; right:12px; bottom:12px;
    background:rgba(0,0,0,.72); color:#fff;
    border:1px solid rgba(255,255,255,.18);
    border-radius:14px; padding:12px;
    z-index:9999; font-size:12px; line-height:1.5;
    max-height:42vh; overflow:auto;
    display:none;
  `;

  const hd = document.createElement("div");
  hd.style.cssText = `display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;`;
  hd.innerHTML = `
    <div style="font-weight:800; letter-spacing:.3px;">DEBUG（長按 header 切換）</div>
    <button id="debugCloseBtn" style="
      appearance:none;border:0;border-radius:10px;
      padding:6px 10px; font-weight:800; cursor:pointer;
    ">關閉</button>
  `;

  const pre = document.createElement("pre");
  pre.id = "debugPre";
  pre.style.cssText = `
    white-space:pre-wrap; word-break:break-word;
    margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  `;

  wrap.appendChild(hd);
  wrap.appendChild(pre);
  document.body.appendChild(wrap);

  qs("debugCloseBtn").addEventListener("click", ()=>{
    DEBUG_ON = false;
    renderDebug_();
  });
}

function setDebug_(patch){
  __debugLast = Object.assign({}, __debugLast, patch || {});
  renderDebug_();
}

function renderDebug_(){
  ensureDebugPanel_();
  const panel = qs("debugPanel");
  const pre = qs("debugPre");
  if(!panel || !pre) return;

  if(!DEBUG_ON){
    panel.style.display = "none";
    return;
  }
  panel.style.display = "block";

  const j = __debugLast.responseJson ? JSON.stringify(__debugLast.responseJson, null, 2) : "";
  pre.textContent =
`time: ${__debugLast.at}
phase: ${__debugLast.phase}

requestUrl: ${__debugLast.requestUrl}
requestMode: ${__debugLast.requestMode}

requestBodyPreview:
${__debugLast.requestBodyPreview}

responseRaw:
${__debugLast.responseRaw}

responseJson:
${j}

error:
${__debugLast.error}
`;
}

function bindHiddenDebugLongPress_(){
  // 長按 header brand 1.2 秒切換
  const brand = document.querySelector(".brand") || document.querySelector("header.top") || document.body;
  if(!brand) return;

  let t = null;
  const holdMs = 1200;

  const start = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      DEBUG_ON = !DEBUG_ON;
      renderDebug_();
      t = null;
    }, holdMs);
  };
  const end = () => {
    if (t) clearTimeout(t);
    t = null;
  };

  brand.addEventListener("touchstart", start, { passive:true });
  brand.addEventListener("touchend", end, { passive:true });
  brand.addEventListener("touchcancel", end, { passive:true });

  brand.addEventListener("mousedown", start);
  brand.addEventListener("mouseup", end);
  brand.addEventListener("mouseleave", end);
}

/** ====== UI ====== */
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

function must_(cond, msg){
  if(!cond) throw new Error(msg);
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

/** ====== payload fields（對齊你最新表頭） ====== */
function buildFields_(){
  const wechatId = text(qs("wechat")?.value);

  const fields = {
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

    // 聯繫（你表頭是 微信ID）
    "微信ID": wechatId,
    "微信": wechatId, // 相容舊欄位（保險）
    "LINE連結": text(qs("lineLink")?.value),
    "LINE官方帳號": text(qs("lineOA")?.value),
    "Email": text(qs("email")?.value),
    "電話": text(qs("phone")?.value),
    "地址": text(qs("addr")?.value),

    // 影音 / 社群（你表頭是 影音連結1/2/3、社群連結1/2/3）
    "影音連結1": text(qs("media1")?.value),
    "影音連結2": text(qs("media2")?.value),
    "影音連結3": text(qs("media3")?.value),
    "社群連結1": text(qs("social1")?.value),
    "社群連結2": text(qs("social2")?.value),
    "社群連結3": text(qs("social3")?.value),
  };

  return fields;
}

/** ====== POST helpers ====== */
async function postCreateJson_(fields){
  const url = `${GAS}?action=create`;
  const bodyObj = { fields };
  const bodyStr = JSON.stringify(bodyObj);

  setDebug_({
    at: new Date().toISOString(),
    phase: "POST JSON",
    requestUrl: url,
    requestMode: "json",
    requestBodyPreview: bodyStr.slice(0, 1500),
    responseRaw: "",
    responseJson: null,
    error: ""
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: bodyStr
  });

  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }

  setDebug_({
    responseRaw: txt.slice(0, 4000),
    responseJson: data
  });

  return data;
}

async function postCreateFormData_(fields){
  // ✅ 不要手動設 Content-Type，讓瀏覽器自己帶 boundary
  const fd = new FormData();
  fd.append("action", "create");
  Object.keys(fields).forEach(k => fd.append(k, fields[k] || ""));

  // preview
  const preview = Object.keys(fields).slice(0, 50).map(k => `${k}=${String(fields[k] || "").slice(0, 60)}`).join("\n");

  setDebug_({
    at: new Date().toISOString(),
    phase: "POST FormData (fallback)",
    requestUrl: GAS,
    requestMode: "formdata",
    requestBodyPreview: preview,
    responseRaw: "",
    responseJson: null,
    error: ""
  });

  const res = await fetch(GAS, { method:"POST", body: fd });
  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }

  setDebug_({
    responseRaw: txt.slice(0, 4000),
    responseJson: data
  });

  return data;
}

/** ====== UI result ====== */
function showResult_(id){
  const cardUrl   = buildCardUrl(id);
  const wechatUrl = buildWeChatUrl(id);
  const openUrl   = buildOpenUrl(id);

  if (qs("resultBox")) qs("resultBox").style.display = "";

  // 你原本就有的
  const a1 = qs("rCardUrl");
  if (a1){
    a1.textContent = cardUrl;
    a1.href = cardUrl;
  }

  // 你要在 form.html 補這兩個 id（rWechatUrl / rOpenUrl）
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

  // 同時把 id/token 顯示（如果存在）
  if (qs("rId")) qs("rId").textContent = id;

  // 交貨按鈕（如果你有）
  if (qs("btnCopyCard")) qs("btnCopyCard").disabled = false;
  if (qs("btnShareCard")) qs("btnShareCard").disabled = false;
}

/** ====== copy / share ====== */
async function copyText_(t){
  try{
    await navigator.clipboard.writeText(t);
    return true;
  }catch{
    return false;
  }
}
async function copyCard_(){
  const a = qs("rCardUrl");
  const u = a ? (a.href || a.textContent || "") : "";
  if(!u) return alert("沒有名片網址可複製");
  const ok = await copyText_(u);
  alert(ok ? "✅ 已複製名片網址" : "⚠️ 無法自動複製，請手動複製");
}
async function shareCard_(){
  const a = qs("rCardUrl");
  const u = a ? (a.href || a.textContent || "") : "";
  if(!u) return alert("沒有名片網址可分享");
  if(navigator.share){
    try{
      await navigator.share({ title:"智慧名片", text:"這是智慧名片連結", url:u });
      return;
    }catch{}
  }
  await copyCard_();
}

/** ====== submit ====== */
async function submit_(){
  const btn = qs("btnSubmit");
  if (btn) btn.disabled = true;

  // 預設補 LINE OA
  if (qs("lineOA") && !text(qs("lineOA").value)) qs("lineOA").value = LINE_OA_DEFAULT;

  const fields = buildFields_();
  must_(!!fields["姓名"], "姓名為必填。");

  // 先 JSON
  let data = await postCreateJson_(fields);

  // fallback：JSON 不通 → FormData
  if(!data || data.ok !== true){
    data = await postCreateFormData_(fields);
  }

  if(!data || data.ok !== true){
    setDebug_({ phase:"ERROR", error: (data?.error || "建立失敗：GAS 回傳非 ok 或非 JSON") });
    if (btn) btn.disabled = false;
    throw new Error(data?.error || "建立失敗：GAS 回傳非 ok 或非 JSON");
  }

  const id = text(data.id) || "";
  must_(!!id, "建立成功但缺少 id（請檢查 GAS 回傳）");

  showResult_(id);

  // 如果你有 msg 區
  if (qs("msg")) qs("msg").textContent = "✅ 建立完成，可交貨。";

  if (btn) btn.disabled = false;
}

/** ====== boot ====== */
(function boot(){
  // hidden debug
  bindHiddenDebugLongPress_();
  renderDebug_();

  // bind
  bindPlan();
  bindChips();

  // default state
  setPlan("1");
  setActiveChip("c", "c1");
  setActiveChip("s", "s1");
  setActiveChip("f", "f1");
  setActiveChip("p", "p1");

  // placeholders
  if (qs("lineOA")) qs("lineOA").placeholder = LINE_OA_DEFAULT;

  qs("btnSubmit")?.addEventListener("click", ()=>{
    submit_().catch(err=>{
      console.error(err);
      setDebug_({ phase:"CATCH", error: (err?.message || String(err)) });
      alert("❌ " + (err?.message || String(err)));
      if (qs("btnSubmit")) qs("btnSubmit").disabled = false;
    });
  });

  // optional buttons if exist
  qs("btnCopyCard")?.addEventListener("click", copyCard_);
  qs("btnShareCard")?.addEventListener("click", shareCard_);
})();