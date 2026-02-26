/* ================================
 * Angel Smart Card Form v402
 * - Plan split: 1=free (c/s/f), 2=premium (p)
 * - Client resize->JPEG base64, POST FormData to GAS doPost
 * - GAS returns {ok,id,token,card_url}
 * ================================ */

const DEFAULT_GAS = ""; // 你也可以直接把 GAS /exec 寫死在這裡

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
  qs("msg").textContent = s || "";
}

function setPlan(plan){
  state.plan = (plan === "2") ? "2" : "1";
  qs("btnPlan1").classList.toggle("active", state.plan==="1");
  qs("btnPlan2").classList.toggle("active", state.plan==="2");
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
  const ui = text(qs("gasUrl").value);
  return ui || DEFAULT_GAS;
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
  const out = {
    "選擇名片製作方案": state.plan,             // 1 or 2
    "選擇名片顏色": state.plan==="1" ? state.c : "",
    "選擇版型風格": state.plan==="1" ? state.s : "",
    "選擇紙感質地": state.plan==="1" ? state.f : "",
    "選擇精品底色": state.plan==="2" ? state.p : "",

    "姓名": text(qs("name").value),
    "單位": text(qs("unit").value),
    "頭銜": text(qs("title").value),
    "理念標語": text(qs("slogan").value),
    "服務項目": text(qs("service").value),
    "經歷": text(qs("exp").value),

    "微信": text(qs("wechat").value),
    "LINE連結": text(qs("lineLink").value),
    "LINE官方帳號": text(qs("lineOA").value),
    "Email": text(qs("email").value),
    "電話": text(qs("phone").value),
    "地址": text(qs("addr").value),

    "影音平台1": text(qs("media1").value),
    "影音平台2": text(qs("media2").value),
    "影音平台3": text(qs("media3").value),
    "社群平台1": text(qs("social1").value),
    "社群平台2": text(qs("social2").value),
    "社群平台3": text(qs("social3").value),
  };
  return out;
}

function must_(cond, msg){
  if(!cond) throw new Error(msg);
}

async function submit_(){
  setMsg("");
  const gas = gasUrl_();
  must_(!!gas, "請先填入 GAS WebApp URL（/exec）。");
  const fields = buildFields_();
  must_(!!fields["姓名"], "姓名為必填。");

  qs("btnSubmit").disabled = true;
  setMsg("⏳ 壓縮照片中…");

  // files
  const avatarFile = qs("avatarFile").files?.[0] || null;
  const logoFile   = qs("logoFile").files?.[0] || null;
  const photosList = Array.from(qs("photosFile").files || []).slice(0,5);

  // resize specs (match your GAS CFG)
  const avatar_b64 = avatarFile ? await fileToJpegBase64Fit(avatarFile, 1024, 1024, 0.86) : "";
  const logo_b64   = logoFile ? await fileToJpegBase64Fit(logoFile, 512, 512, 0.88) : "";
  const photo_b64s = [];
  for(const f of photosList){
    const b64 = await fileToJpegBase64Fit(f, 1200, 675, 0.86);
    if(b64) photo_b64s.push(b64);
  }

  setMsg("⏳ 上傳與建檔中…");

  const fd = new FormData();
  fd.append("action", "submit"); // GAS doPost 分流用
  // fields
  Object.keys(fields).forEach(k=>{
    fd.append(k, fields[k] || "");
  });

  // images base64
  fd.append("avatar_b64", avatar_b64);
  fd.append("logo_b64", logo_b64);
  fd.append("photos_b64", JSON.stringify(photo_b64s)); // array string

  // NOTE: 使用 FormData 可避免 CORS preflight（通常更穩）
  const res = await fetch(gas, { method:"POST", body: fd });
  const txt = await res.text();
  let data = null;
  try{ data = JSON.parse(txt); }catch{ data = null; }
  if(!data || data.ok !== true) throw new Error(data?.error || "GAS 回傳非 JSON 或失敗");

  // show result
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

  setMsg("✅ 建立完成，可以交貨了。");

  qs("btnSubmit").disabled = false;
}

async function copyCard_(){
  const u = state.cardUrl;
  if(!u) return;
  try{
    await navigator.clipboard.writeText(u);
    setMsg("✅ 已複製名片網址");
  }catch{
    setMsg("⚠️ 你的瀏覽器不支援剪貼簿，請手動複製結果區的網址");
  }
}

async function shareCard_(){
  const u = state.cardUrl;
  if(!u) return;

  if(navigator.share){
    try{
      await navigator.share({ title: "智慧名片", text: "這是我的智慧名片", url: u });
      setMsg("✅ 已呼叫系統分享");
      return;
    }catch{}
  }

  // fallback: copy
  await copyCard_();
}

/* ---------- Boot ---------- */
(function boot(){
  // init plan
  setPlan("1");
  bindPlan();
  bindChips();

  // set initial actives to state (already in HTML as active)
  setActiveChip("c","c1");
  setActiveChip("s","s1");
  setActiveChip("f","f1");
  setActiveChip("p","p1");

  // init gas input
  if(DEFAULT_GAS) qs("gasUrl").value = DEFAULT_GAS;

  qs("btnSubmit").addEventListener("click", ()=>{
    submit_().catch(err=>{
      console.error(err);
      setMsg("❌ " + (err?.message || String(err)));
      qs("btnSubmit").disabled = false;
    });
  });

  qs("btnCopyCard").addEventListener("click", copyCard_);
  qs("btnShareCard").addEventListener("click", shareCard_);
})();
