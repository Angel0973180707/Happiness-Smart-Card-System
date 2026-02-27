/* ================================
 * Angel Smart Card Form v406 (PAID-GATE) — COMPLETE OVERWRITE
 * - Paid gate (customer default): NO card_url/copy/share
 * - Customer sees: id + "請聯繫客服開通" + button "聯繫開通" -> LINE OA
 * - Admin mode (optional): reveal card_url/copy/share
 * - Headers aligned to latest sheet:
 *   微信ID, 影音連結1~3, 社群連結1~3
 * - Also sends compatibility keys:
 *   微信, 影音平台1~3, 社群平台1~3
 * - Image resize: fit (no crop), JPEG base64
 * ================================ */

/** =============================
 * 內建參數（建議寫死，表單才乾淨）
 * ============================= */
const DEFAULT_GAS = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
const DEFAULT_LINE_OA = "https://lin.ee/G3VJoRm";

/**
 * ✅ 收費閘門
 * - false：客戶版（不顯示名片網址）
 * - true ：管理者版（顯示 card_url + copy/share）
 *
 * 小技巧：你要內部交貨時，不用改程式也行：
 * 在網址後面加 ?admin=1 會自動變管理者模式
 */
const ADMIN_MODE = (new URLSearchParams(location.search).get("admin") === "1") ? true : false;

// 你目前指定：精品預設 p4 霧紫
const DEFAULT_PREMIUM_P = "p4";

const state = {
  plan: "1",
  c: "c1",
  s: "s1",
  f: "f1",
  p: DEFAULT_PREMIUM_P,
  cardUrl: "",
  token: "",
  id: ""
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

function setMsg(s){
  const el = qs("msg");
  if (el) el.textContent = s || "";
}

function setPlan(plan){
  state.plan = (plan === "2") ? "2" : "1";
  qs("btnPlan1")?.classList.toggle("active", state.plan==="1");
  qs("btnPlan2")?.classList.toggle("active", state.plan==="2");
  if (qs("freeBox")) qs("freeBox").style.display = (state.plan==="1") ? "" : "none";
  if (qs("premiumBox")) qs("premiumBox").style.display = (state.plan==="2") ? "" : "none";
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
  qs("btnPlan1")?.addEventListener("click", ()=> setPlan("1"));
  qs("btnPlan2")?.addEventListener("click", ()=> setPlan("2"));
}

function gasUrl_(){
  // 表單乾淨：預設直接用寫死的
  // 若你保留了 <input id="gasUrl"> 也能吃（以 UI 優先）
  const ui = qs("gasUrl") ? text(qs("gasUrl").value) : "";
  return ui || DEFAULT_GAS;
}

function lineOAUrl_(){
  // 以客戶自己填的「LINE官方帳號」優先，否則用你預設的客服 OA
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

  // ✅ 對齊新表頭 + 兼容舊表頭（兩套一起送，永遠不怕）
  return {
    // 方案
    "選擇名片製作方案": state.plan,
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

    // 聯繫（新表頭）
    "微信ID": wechatId,
    // 舊相容
    "微信": wechatId,

    "LINE連結": text(qs("lineLink")?.value),
    "LINE官方帳號": text(qs("lineOA")?.value),
    "Email": text(qs("email")?.value),
    "電話": text(qs("phone")?.value),
    "地址": text(qs("addr")?.value),

    // ✅ 新表頭：影音連結 / 社群連結
    "影音連結1": media1,
    "影音連結2": media2,
    "影音連結3": media3,
    "社群連結1": social1,
    "社群連結2": social2,
    "社群連結3": social3,

    // ✅ 舊相容：影音平台 / 社群平台
    "影音平台1": media1,
    "影音平台2": media2,
    "影音平台3": media3,
    "社群平台1": social1,
    "社群平台2": social2,
    "社群平台3": social3,
  };
}

function must_(cond, msg){
  if(!cond) throw new Error(msg);
}

/* ---------- UI: Paid gate output ---------- */
function showResultCustomer_(id){
  state.id = id || "";
  state.cardUrl = "";
  state.token = "";

  qs("resultBox") && (qs("resultBox").style.display = "");

  qs("rId") && (qs("rId").textContent = state.id || "-");
  qs("rToken") && (qs("rToken").textContent = "—");

  const a = qs("rCardUrl");
  if (a){
    a.textContent = "—";
    a.href = "#";
  }

  qs("btnCopyCard") && (qs("btnCopyCard").disabled = true);
  qs("btnShareCard") && (qs("btnShareCard").disabled = true);

  // ✅ 定錨文案
  setMsg("✅ 已送出。請聯繫客服開通。");

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

  qs("resultBox") && (qs("resultBox").style.display = "");
  qs("rId") && (qs("rId").textContent = state.id || "-");
  qs("rToken") && (qs("rToken").textContent = state.token || "-");

  const a = qs("rCardUrl");
  if (a){
    a.textContent = state.cardUrl || "-";
    a.href = state.cardUrl || "#";
  }

  qs("btnCopyCard") && (qs("btnCopyCard").disabled = !state.cardUrl);
  qs("btnShareCard") && (qs("btnShareCard").disabled = !state.cardUrl);

  setMsg("✅ 建立完成（管理者模式：可交貨）。");

  // 管理者模式，不需要顯示「聯繫開通」
  const btnOpen = qs("btnOpenLineOA");
  if (btnOpen){
    btnOpen.style.display = "none";
    btnOpen.disabled = true;
  }
}

async function submit_(){
  setMsg("");
  const gas = gasUrl_();
  must_(!!gas, "系統未設定 GAS WebApp URL。");
  const fields = buildFields_();
  must_(!!fields["姓名"], "姓名為必填。");

  qs("btnSubmit") && (qs("btnSubmit").disabled = true);
  setMsg("⏳ 處理中…");

  // files
  const avatarFile = qs("avatarFile")?.files?.[0] || null;
  const logoFile   = qs("logoFile")?.files?.[0] || null;
  const photosList = Array.from(qs("photosFile")?.files || []).slice(0,5);

  // resize specs (match your GAS CFG)
  setMsg("⏳ 壓縮照片中…");
  const avatar_b64 = avatarFile ? await fileToJpegBase64Fit(avatarFile, 1024, 1024, 0.86) : "";
  const logo_b64   = logoFile ? await fileToJpegBase64Fit(logoFile, 512, 512, 0.88) : "";

  const photo_b64s = [];
  for (const f of photosList){
    const b64 = await fileToJpegBase64Fit(f, 1200, 675, 0.86);
    if (b64) photo_b64s.push(b64);
  }

  setMsg("⏳ 上傳與建檔中…");

  const fd = new FormData();
  fd.append("action", "submit"); // 你 GAS doPost 用這個分流

  Object.keys(fields).forEach(k => fd.append(k, fields[k] || ""));

  fd.append("avatar_b64", avatar_b64);
  fd.append("logo_b64", logo_b64);
  fd.append("photos_b64", JSON.stringify(photo_b64s));
  fd.append("admin_mode", ADMIN_MODE ? "1" : "0");

  // ✅ 不要手動 set Content-Type（讓瀏覽器自處理 multipart boundary）1
  const res = await fetch(gas, { method:"POST", body: fd });
  const txt = await res.text();

  let data = null;
  try { data = JSON.parse(txt); } catch { data = null; }
  if (!data || data.ok !== true) throw new Error(data?.error || "GAS 回傳非 JSON 或失敗");

  if (ADMIN_MODE) showResultAdmin_(data);
  else showResultCustomer_(data.id || "");

  qs("btnSubmit") && (qs("btnSubmit").disabled = false);
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

  if (navigator.share){
    try{
      await navigator.share({ title: "智慧名片", text: "智慧名片連結", url: u });
      setMsg("✅ 已呼叫系統分享");
      return;
    }catch{}
  }
  await copyCard_();
}

function openLineOA_(){
  const u = lineOAUrl_();
  if(!u){
    setMsg("⚠️ 尚未設定 LINE 官方帳號連結。");
    return;
  }
  window.open(u, "_blank", "noopener,noreferrer");
}

/* ---------- Boot ---------- */
(function boot(){
  // init plan
  setPlan("1");
  bindPlan();
  bindChips();

  // init chip state (HTML 哪顆 active 不重要，這裡會覆蓋成一致狀態)
  setActiveChip("c","c1");
  setActiveChip("s","s1");
  setActiveChip("f","f1");
  setActiveChip("p", DEFAULT_PREMIUM_P);

  // 若你仍保留 gasUrl input，就幫你塞值（但建議你乾脆拿掉）
  if (DEFAULT_GAS && qs("gasUrl")) qs("gasUrl").value = DEFAULT_GAS;

  qs("btnSubmit")?.addEventListener("click", ()=>{
    submit_().catch(err=>{
      console.error(err);
      setMsg("❌ " + (err?.message || String(err)));
      qs("btnSubmit") && (qs("btnSubmit").disabled = false);
    });
  });

  qs("btnCopyCard")?.addEventListener("click", copyCard_);
  qs("btnShareCard")?.addEventListener("click", shareCard_);

  // 「聯繫開通」按鈕（送出成功後才顯示）
  const btnOpen = qs("btnOpenLineOA");
  if (btnOpen){
    btnOpen.addEventListener("click", openLineOA_);
    btnOpen.style.display = "none";
    btnOpen.disabled = true;
  }
})();