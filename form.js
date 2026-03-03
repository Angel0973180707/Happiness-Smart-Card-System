/* form.js — v499 (COMPLETE OVERWRITE)
 * - Auth: exp + sig (no invite)
 * - Flow: reserve -> create
 * - Plan split:
 *   free: color/style/paper required, photos <= 2
 *   premium: premium_color required, photos <= 5
 * - Reject base64 dataURL for images
 */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  VERSION: "v499"
};

const qs = (id) => document.getElementById(id);
const text = (v) => (v == null ? "" : String(v)).trim();

function getParam(name){
  try{
    const p = new URLSearchParams(location.search || "");
    return text(p.get(name));
  }catch{
    return "";
  }
}

function setMsg(type, msg){
  const el = qs("msg");
  el.className = "msg " + (type ? `msg--${type}` : "");
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function isDataUrl_(v){
  return /^data:image\//i.test(String(v || "").trim());
}
function rejectDataUrl_(v, field){
  const s = text(v);
  if(!s) return;
  if(isDataUrl_(s)) throw new Error(`❌ ${field} 禁止 base64（data:image）。請改貼 Firebase downloadURL`);
}

async function postJson_(bodyObj){
  const res = await fetch(`${CONFIG.GAS}?ts=${Date.now()}`, {
    method:"POST",
    cache:"no-store",
    redirect:"follow",
    headers:{ "Content-Type":"text/plain;charset=UTF-8" }, // avoid preflight
    body: JSON.stringify(bodyObj || {})
  });
  const raw = await res.text();
  // tolerate ")]}'" etc.
  const cleaned = raw.replace(/^\)\]\}'\s*\n?/, "").trim();
  return JSON.parse(cleaned);
}

/* ---------------- Plan UI ---------------- */
let currentPlan = "free";

function setPlan_(plan){
  currentPlan = plan === "premium" ? "premium" : "free";

  // chips
  qs("chipFree").setAttribute("data-on", currentPlan === "free" ? "1" : "0");
  qs("chipPremium").setAttribute("data-on", currentPlan === "premium" ? "1" : "0");

  // boxes
  qs("freeBox").classList.toggle("hide", currentPlan !== "free");
  qs("premiumBox").classList.toggle("hide", currentPlan !== "premium");

  // photo fields 3~5 lock
  const premiumOn = currentPlan === "premium";
  qs("p3Field").classList.toggle("hide", !premiumOn);
  qs("p4Field").classList.toggle("hide", !premiumOn);
  qs("p5Field").classList.toggle("hide", !premiumOn);

  // hint
  qs("photoLimitHint").textContent = premiumOn
    ? "精品設計款：最多 5 張（photo1~photo5）"
    : "自由搭配款：最多 2 張（photo1~photo2）";

  // when switch to free, clear photo3~5 to prevent accidental send
  if(!premiumOn){
    qs("photo3_img").value = "";
    qs("photo4_img").value = "";
    qs("photo5_img").value = "";
    qs("premium_color").value = "";
  }else{
    qs("color").value = "";
    qs("style").value = "";
    qs("paper").value = "";
  }
}

/* ---------------- Validation ---------------- */
function collectPayload_(){
  const tenant = text(getParam("tenant")) || "angel";
  const uid = text(getParam("uid"));
  const exp = text(getParam("exp"));
  const sig = text(getParam("sig"));

  if(!uid || !exp || !sig){
    throw new Error("連結無效或已過期（缺少 tenant/uid/exp/sig）");
  }

  const name = text(qs("name").value);
  if(!name) throw new Error("請填寫：姓名（必填）");

  const plan = currentPlan;

  // Plan specific required fields
  let color="", style="", paper="", premium_color="";

  if(plan === "free"){
    color = text(qs("color").value);
    style = text(qs("style").value);
    paper = text(qs("paper").value);
    if(!color) throw new Error("自由搭配款請選擇：color（c1~c5）");
    if(!style) throw new Error("自由搭配款請選擇：style（s1~s3）");
    if(!paper) throw new Error("自由搭配款請選擇：paper（f1~f3）");
  }else{
    premium_color = text(qs("premium_color").value);
    if(!premium_color) throw new Error("精品設計款請選擇：premium_color（p1~p7）");
  }

  // Images (downloadURL only)
  const avatar_img = text(qs("avatar_img").value);
  const logo_img   = text(qs("logo_img").value);

  const photo1_img = text(qs("photo1_img").value);
  const photo2_img = text(qs("photo2_img").value);
  const photo3_img = text(qs("photo3_img").value);
  const photo4_img = text(qs("photo4_img").value);
  const photo5_img = text(qs("photo5_img").value);

  rejectDataUrl_(avatar_img, "avatar_img");
  rejectDataUrl_(logo_img, "logo_img");
  rejectDataUrl_(photo1_img, "photo1_img");
  rejectDataUrl_(photo2_img, "photo2_img");
  rejectDataUrl_(photo3_img, "photo3_img");
  rejectDataUrl_(photo4_img, "photo4_img");
  rejectDataUrl_(photo5_img, "photo5_img");

  // Photo limits
  if(plan === "free"){
    if(photo3_img || photo4_img || photo5_img){
      throw new Error("自由搭配款照片牆最多 2 張（請清空 photo3~photo5）");
    }
  }

  const payload = {
    tenant, uid, exp, sig,
    plan,
    // plan fields
    color: plan === "free" ? color : "",
    style: plan === "free" ? style : "",
    paper: plan === "free" ? paper : "",
    premium_color: plan === "premium" ? premium_color : "",

    // text fields
    name,
    unit: text(qs("unit").value),
    title: text(qs("title").value),
    slogan: text(qs("slogan").value),
    services: text(qs("services").value),

    // contact
    phone: text(qs("phone").value),
    email: text(qs("email").value),
    address: text(qs("address").value),
    line_url: text(qs("line_url").value),
    wechat_id: text(qs("wechat_id").value),

    // images
    avatar_img,
    logo_img,
    photo1_img,
    photo2_img,
    photo3_img: plan === "premium" ? photo3_img : "",
    photo4_img: plan === "premium" ? photo4_img : "",
    photo5_img: plan === "premium" ? photo5_img : ""
  };

  return payload;
}

/* ---------------- Submit: reserve -> create ---------------- */
async function submit_(){
  try{
    setMsg("info", "⏳ 送出中：reserve → create ...");

    const payload = collectPayload_();

    // 1) reserve
    const r1 = await postJson_({
      action:"reserve",
      tenant: payload.tenant,
      uid: payload.uid,
      exp: payload.exp,
      sig: payload.sig
    });

    if(!r1 || r1.ok !== true){
      throw new Error("reserve 失敗：" + (r1?.message || "unknown"));
    }

    const cardId = text(r1.cardId || r1.card_id);
    const token  = text(r1.token);
    if(!cardId || !token){
      throw new Error("reserve 回傳缺少 cardId/token");
    }

    // 2) create (text + downloadURL only)
    const r2 = await postJson_({
      action:"create",
      tenant: payload.tenant,
      id: cardId,
      uid: payload.uid,
      exp: payload.exp,
      sig: payload.sig,
      token,

      plan: payload.plan,
      color: payload.color,
      style: payload.style,
      paper: payload.paper,
      premium_color: payload.premium_color,

      name: payload.name,
      unit: payload.unit,
      title: payload.title,
      slogan: payload.slogan,
      services: payload.services,

      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      line_url: payload.line_url,
      wechat_id: payload.wechat_id,

      avatar_img: payload.avatar_img,
      logo_img: payload.logo_img,
      photo1_img: payload.photo1_img,
      photo2_img: payload.photo2_img,
      photo3_img: payload.photo3_img,
      photo4_img: payload.photo4_img,
      photo5_img: payload.photo5_img
    });

    if(!r2 || r2.ok !== true){
      throw new Error("create 失敗：" + (r2?.message || "unknown"));
    }

    setMsg("ok", `✅ 送出成功！\n你的序號：${cardId}\n請把序號回傳給館長，安排預覽核對與交付。`);
  }catch(err){
    setMsg("err", "⚠️ " + (err?.message || String(err)));
  }
}

function reset_(){
  [
    "name","unit","title","slogan","services",
    "avatar_img","logo_img",
    "photo1_img","photo2_img","photo3_img","photo4_img","photo5_img",
    "phone","email","address","line_url","wechat_id",
    "color","style","paper","premium_color"
  ].forEach(id=>{
    const el = qs(id);
    if(el) el.value = "";
  });
  setPlan_("free");
  setMsg("", "");
}

/* ---------------- Boot ---------------- */
(function boot_(){
  // plan chips
  qs("chipFree").addEventListener("click", ()=> setPlan_("free"));
  qs("chipPremium").addEventListener("click", ()=> setPlan_("premium"));

  // buttons
  qs("btnSubmit").addEventListener("click", submit_);
  qs("btnReset").addEventListener("click", reset_);

  // default
  setPlan_("free");

  // basic link validity hint (no blocking here; submit will block)
  const uid = getParam("uid");
  const exp = getParam("exp");
  const sig = getParam("sig");
  if(!uid || !exp || !sig){
    setMsg("err", "連結無效或已過期（缺少 uid / exp / sig）。請向館長索取新的表單連結。");
  }
})();