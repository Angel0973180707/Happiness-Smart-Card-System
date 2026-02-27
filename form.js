/* ================================
 * form.js — v406.2 (COMPLETE OVERWRITE)
 * - 固定 GAS / BASE / LINE_OA（不靠 UI）
 * - 方案分流：1=free (c/s/f), 2=premium (p)
 * - 送出：POST → 優先 action=create（JSON body）
 *   - 若 GAS 不吃 JSON，fallback：FormData（不手動設 Content-Type）
 * - 成功後：顯示三條交貨連結
 *   1) card_url   (GitHub ?id=)
 *   2) wechat_url (wechat.html?id=...&plan=...&p=...&c=...)
 *   3) open_url   (open.html?id=...)  ← 你說要「提高打開機率」
 * ================================ */

/** ====== 你給我的固定參數（已填好） ====== */
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

function setPlan(plan){
  state.plan = (plan === "2") ? "2" : "1";
  qs("btnPlan1")?.classList.toggle("active", state.plan === "1");
  qs("btnPlan2")?.classList.toggle("active", state.plan === "2");
  qs("freeBox").style.display = (state.plan === "1") ? "" : "none";
  qs("premiumBox").style.display = (state.plan === "2") ? "" : "none";
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
  // wechat 長圖：跟方案聯動（free 用 c；premium 用 p）
  const u = new URL(`${BASE}wechat.html`);
  u.searchParams.set("id", id);
  u.searchParams.set("plan", state.plan);
  if (state.plan === "2") u.searchParams.set("p", state.p);
  if (state.plan === "1") u.searchParams.set("c", state.c);
  return u.toString();
}

/** ====== payload fields (對齊你貼的最新表頭命名) ====== */
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
    "服務項目": text(qs("service")?.value),
    "經歷": text(qs("exp")?.value),

    // 聯繫
    "微信ID": wechatId,
    "微信": wechatId, // 相容舊欄位（保險）
    "LINE官方帳號": text(qs("lineOA")?.value),
    "Email": text(qs("email")?.value),
    "電話": text(qs("phone")?.value),
  };

  return fields;
}

function must_(cond, msg){
  if(!cond) throw new Error(msg);
}

/** ====== POST helpers ====== */
async function postCreateJson_(fields){
  // 走你 v405 風格：POST ?action=create body={fields:{...}}
  const url = `${GAS}?action=create`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ fields })
  });
  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }
  return data;
}

async function postCreateFormData_(fields){
  // fallback：若你 GAS doPost 是用 FormData (multipart) 解析
  // ✅ 這裡「不要手動設定 Content-Type」，瀏覽器會自動加 boundary
  const fd = new FormData();
  fd.append("action", "create"); // 有些 doPost 會用這個分流
  Object.keys(fields).forEach(k => fd.append(k, fields[k] || ""));

  const res = await fetch(GAS, { method:"POST", body: fd });
  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }
  return data;
}

/** ====== UI result ====== */
function showResult_(id){
  const cardUrl  = buildCardUrl(id);
  const wechatUrl = buildWeChatUrl(id);
  const openUrl  = buildOpenUrl(id);

  qs("resultBox").style.display = "";

  const a1 = qs("rCardUrl");
  a1.textContent = cardUrl;
  a1.href = cardUrl;

  const a2 = qs("rWechatUrl");
  a2.textContent = wechatUrl;
  a2.href = wechatUrl;

  const a3 = qs("rOpenUrl");
  a3.textContent = openUrl;
  a3.href = openUrl;
}

/** ====== submit ====== */
async function submit_(){
  const btn = qs("btnSubmit");
  btn.disabled = true;

  // 預設補 LINE OA（你要「幫我填」）
  if (qs("lineOA") && !text(qs("lineOA").value)) qs("lineOA").value = LINE_OA_DEFAULT;

  const fields = buildFields_();
  must_(!!fields["姓名"], "姓名為必填。");

  // 先 JSON（符合你 v405 的 createCardRow_ 解析方式）
  let data = await postCreateJson_(fields);

  // fallback：若 JSON 不通，再試 FormData
  if(!data || data.ok !== true){
    data = await postCreateFormData_(fields);
  }

  if(!data || data.ok !== true){
    btn.disabled = false;
    throw new Error(data?.error || "建立失敗：GAS 回傳非 ok 或非 JSON");
  }

  const id = text(data.id) || "";
  must_(!!id, "建立成功但缺少 id（請檢查 GAS 回傳）");

  showResult_(id);
  btn.disabled = false;
}

/** ====== boot ====== */
(function boot(){
  // plan
  bindPlan();
  bindChips();

  // default state
  setPlan("1");
  setActiveChip("c", "c1");
  setActiveChip("s", "s1");
  setActiveChip("f", "f1");
  setActiveChip("p", "p1");

  // default line OA
  if (qs("lineOA")) qs("lineOA").placeholder = LINE_OA_DEFAULT;

  qs("btnSubmit")?.addEventListener("click", ()=>{
    submit_().catch(err=>{
      console.error(err);
      alert("❌ " + (err?.message || String(err)));
      qs("btnSubmit").disabled = false;
    });
  });
})();