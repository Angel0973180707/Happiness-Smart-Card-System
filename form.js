/* ================================
 * Angel Smart Card Form v405 (PAID-GATE)
 * - Plan split: 1=free (c/s/f), 2=premium (p)
 * - Client resize->JPEG base64, POST FormData to GAS doPost
 * - PAID GATE:
 *   - Customer: NO card_url, NO copy/share.
 *   - Customer sees id + "請聯繫客服開通" + "聯繫開通" (go LINE OA)
 *   - Admin can enable ADMIN_MODE=true to reveal card_url/copy/share.
 * - Header compat:
 *   - WeChat: send both "微信ID" and "微信" (same value)
 *   - Media/Social: send both old and new header names
 * ================================ */

/** =============================
 * 你要寫死的內建參數（建議寫死，表單更乾淨）
 * ============================= */
const DEFAULT_GAS = "";      // ✅ 你的 GAS /exec（建議填死）
const DEFAULT_LINE_OA = "";  // ✅ 你的 LINE 官方帳號連結（https://lin.ee/xxxx）

/**
 * ✅ 收費閘門
 * - false：給客戶用（不顯示名片網址）
 * - true ：你自己內部建檔/交貨用（會顯示名片網址 + copy/share）
 */
const ADMIN_MODE = false;

const state = {
  plan: "1",
  c: "c1",
  s: "s1",
  f: "f1",
  p: "p1",
  cardUrl: "",
  token: "",
  id: ""
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null?"":String(v)).trim(); }

function setMsg(s){
  const el = qs("msg");
  if (el) el.textContent = s || "";
}

function setPlan(plan){
  state.plan = (plan === "2") ? "2" : "1";
  qs("btnPlan1")?.classList.toggle("active", state.plan==="1");
  qs("btnPlan2")?.classList.toggle("active", state.plan==="2");
  qs("freeBox").style.display = (state.plan==="1") ? "" : "none";
  qs("premiumBox").style.display = (state.plan==="2") ? "" : "none";
}

function setActiveChip(group, val){
  const chips = Array.from(document.querySelectorAll(`.chip[data-group="${group}"]`));
  chips.forEach(b=>b.classList.toggle("active", b.dataset.val===val));
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
  qs("btnPlan1").addEventListener("click", ()=> setPlan("1"));
  qs("btnPlan2").addEventListener("click", ()=> setPlan("2"));
}

function gasUrl_(){
  // 若你已寫死 DEFAULT_GAS，就不需要 UI 欄位
  const ui = qs("gasUrl") ? text(qs("gasUrl").value) : "";
  return ui || DEFAULT_GAS;
}

function lineOAUrl_(){
  // 以表單欄位（LINE官方帳號）優先，否則用預設
  const ui = qs("lineOA") ? text(qs("lineOA").value) : "";
  return ui || DEFAULT_LINE_OA;
}

/* ---------- Image resize (no crop, keep ratio) -> JPEG base64 ---------- */
async function fileToJpegBase64Fit(file, maxW, maxH, quality=0.86){
  if(!file) return "";
  const img = await loadImage_(file);
  const {w,h} = getImageSize_(img);

  const scale = Math.min(maxW / w, maxH / h, 1);
  const nw = Math.max(1, Math.floor(w * scale));
  const nh = Math.max(1, Math.floor(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d", { alpha:false });
  ctx.drawImage(img, 0, 0, nw, nh);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1] || "";
}

function loadImage_(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function getImageSize_(img){
  return { w: img.naturalWidth || img.width || 1, h: img.naturalHeight || img.height || 1 };
}

/* ---------- Build payload (match your Sheet headers) ---------- */
function buildFields_(){
  const wechatId = text(qs("wechat")?.value);

  const media1 = text(qs("media1")?.value);
  const media2 = text(qs("media2")?.value);
  const media3 = text(qs("media3")?.value);

  const social1 = text(qs("social1")?.value);
  const social2 = text(qs("social2")?.value);
  const social3 = text(qs("social3")?.value);

  const out = {
    // 方案
    "選擇名片製作方案": state.plan,             // 1 or 2
    "選擇名片顏色": state.plan==="1" ? state.c : "",
    "選擇版型風格": state.plan==="1" ? state.s : "",
    "選擇紙感質地": state.plan==="1" ? state.f : "",
    "選擇精品底色": state.plan==="2" ? state.p : "",

    // 客戶資料
    "姓名": text(qs("name")?.value),
    "單位": text(qs("unit")?.value),
    "頭銜": text(qs("title")?.value),
    "理念標語": text(qs("slogan")?.value),
    "服務項目": text(qs("service")?.value),
    "經歷": text(qs("exp")?.value),

    // 聯繫（你改表頭成 微信ID 了）
    "微信ID": wechatId,
    // ✅ 相容舊表頭（你就算漏改 GAS/Sheet，也不會壞）
    "微信": wechatId,

    "LINE連結": text(qs("lineLink")?.value),
    "LINE官方帳號": text(qs("lineOA")?.value),
    "Email": text(qs("email")?.value),
    "電話": text(qs("phone")?.value),
    "地址": text(qs("addr")?.value),

    // 影音/社群：送新舊兩套表頭（你要不要改表頭都 OK）
    "影音平台1": media1,
    "影音平台2": media2,
    "影音平台3": media3,
    "影音平台連結1": media1,
    "影音平台連結2": media2,
    "影音平台連結3": media3,

    "社群平台1": social1,
    "社群平台2": social2,
    "社群平台3": social3,
    "社群平台連結1": social1,
    "社群平台連結2": social2,
    "社群平台連結3": social3,
  };

  return out;
}

function must_(cond, msg){
  if(!cond) throw new Error(msg);
}

/* ---------- UI: Paid gate output ---------- */
function showResultCustomer_(id){
  state.id = id || "";
  qs("resultBox").style.display = "";

  qs("rId").textContent = state.id || "-";
  qs("rToken").textContent = "—"; // 客戶不給 token（避免被當鑰匙）
  const a = qs("rCardUrl");
  a.textContent = "—";
  a.href = "#";

  // 交貨按鈕：關閉
  qs("btnCopyCard").disabled = true;
  qs("btnShareCard").disabled = true;

  // 顯示「請聯繫客服開通」
  setMsg("✅ 已送出。請聯繫客服開通。");

  // 若你在 HTML 有放「聯繫開通」按鈕（建議），這裡啟用
  const btnOpen = qs("btnOpenLineOA");
  if (btnOpen){
    btnOpen.style.display = "";
    btnOpen.disabled = false;
  }
}

function showResultAdmin_(data){
  state.id = data.id || "";
  state.token = data.token || "";
  state.cardUrl = data.card_url || "";

  qs("resultBox").style.display = "";
  qs("rId").textContent = state.id || "-";
  qs("rToken").textContent = state.token || "-";

  const a = qs("rCardUrl");
  a.textContent = state.cardUrl || "-";
  a.href = state.cardUrl || "#";

  qs("btnCopyCard").disabled = !state.cardUrl;
  qs("btnShareCard").disabled = !state.cardUrl;

  setMsg("✅ 建立完成（管理者模式：可交貨）。");
}

async function submit_(){
  setMsg("");
  const gas = gasUrl_();
  must_(!!gas, "請先設定 GAS WebApp URL（/exec）。");
  const fields = buildFields_();
  must_(!!fields["姓名"], "姓名為必填。");

  qs("btnSubmit").disabled = true;
  setMsg("⏳ 處理中…");

  // files
  const avatarFile = qs("avatarFile")?.files?.[0] || null;
  const logoFile   = qs("logoFile")?.files?.[0] || null;
  const photosList = Array.from(qs("photosFile")?.files || []).slice(0,5);

  // resize specs (match your GAS CFG)
  const avatar_b64 = avatarFile ? await fileToJpegBase64Fit(avatarFile, 1024, 1024, 0.86) : "";
  const logo_b64   = logoFile ? await fileToJpegBase64Fit(logoFile, 512, 512, 0.88) : "";
  const photo_b64s = [];
  for(const f of photosList){
    const b64 = await fileToJpegBase64Fit(f, 1200, 675, 0.86);
    if(b64) photo_b64s.push(b64);
  }

  const fd = new FormData();
  fd.append("action", "submit"); // GAS doPost 分流用

  Object.keys(fields).forEach(k=>{
    fd.append(k, fields[k] || "");
  });

  fd.append("avatar_b64", avatar_b64);
  fd.append("logo_b64", logo_b64);
  fd.append("photos_b64", JSON.stringify(photo_b64s));

  // 讓 GAS 可辨識這是內部/管理者送出（可選）
  fd.append("admin_mode", ADMIN_MODE ? "1" : "0");

  const res = await fetch(gas, { method:"POST", body: fd });
  const txt = await res.text();
  let data = null;
  try{ data = JSON.parse(txt); }catch{ data = null; }
  if(!data || data.ok !== true) throw new Error(data?.error || "GAS 回傳非 JSON 或失敗");

  // ✅ 收費閘門：客戶不顯示 card_url
  if (ADMIN_MODE){
    showResultAdmin_(data);
  } else {
    showResultCustomer_(data.id || "");
  }

  qs("btnSubmit").disabled = false;
}

async function copyCard_(){
  const u = state.cardUrl;
  if(!u) return;
  try{
    await navigator.clipboard.writeText(u);
    setMsg("✅ 已複製名片網址");
  }catch{
    setMsg("⚠️ 無法自動複製，請手動複製結果區網址");
  }
}

async function shareCard_(){
  const u = state.cardUrl;
  if(!u) return;

  if(navigator.share){
    try{
      await navigator.share({ title: "智慧名片", text: "這是智慧名片連結", url: u });
      setMsg("✅ 已呼叫系統分享");
      return;
    }catch{}
  }
  await copyCard_();
}

function openLineOA_(){
  const u = lineOAUrl_();
  if(!u){
    setMsg("⚠️ 尚未設定 LINE 官方帳號連結。請回填或由管理者寫死 DEFAULT_LINE_OA。");
    return;
  }
  window.open(u, "_blank", "noopener,noreferrer");
}

/* ---------- Boot ---------- */
(function boot(){
  setPlan("1");
  bindPlan();
  bindChips();

  setActiveChip("c","c1");
  setActiveChip("s","s1");
  setActiveChip("f","f1");
  setActiveChip("p","p1");

  // 若你想表單更乾淨：寫死 DEFAULT_GAS 後，把 UI 欄位隱藏
  if(DEFAULT_GAS && qs("gasUrl")) qs("gasUrl").value = DEFAULT_GAS;

  qs("btnSubmit").addEventListener("click", ()=>{
    submit_().catch(err=>{
      console.error(err);
      setMsg("❌ " + (err?.message || String(err)));
      qs("btnSubmit").disabled = false;
    });
  });

  qs("btnCopyCard").addEventListener("click", copyCard_);
  qs("btnShareCard").addEventListener("click", shareCard_);

  // 若你在 HTML 加一顆「聯繫開通」按鈕：id="btnOpenLineOA"
  const btnOpen = qs("btnOpenLineOA");
  if (btnOpen){
    btnOpen.addEventListener("click", openLineOA_);
    // 預設先隱藏，等送出成功再顯示
    btnOpen.style.display = "none";
  }
})();