/* admin.js — v499 (COMPLETE OVERWRITE)
   - Align v499:
     - GET action=card: inactive/pending requires token
     - POST actions: reserve / confirm / activate
     - activate: uses ADMIN_SECRET (secret)
   - Backward compatible:
     - also sends admin_pin if provided
   - FIX v499 invite flow (IMPORTANT):
     - Copy Form Link / Copy Form Pack:
       if invite empty -> auto-generate -> fill field -> copy with invite
     - reserve:
       if invite empty -> auto-generate
       uid is optional (warn if empty, but allow)
*/

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  DEFAULT_ID: "TW0001",
  VERSION: "499",
  TIMEOUT_MS: 12000,
  RETRY: 2,

  POSTER_W: 1080,
  POSTER_H: 1920
};

let currentId = "";
let currentRow = null;
let posterObjectUrl = "";
let lastReserve = null;

const qs = (id) => document.getElementById(id);
const text = (v) => (v == null ? "" : String(v)).trim();

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4,"0");
  if(/^TW\d{1,4}$/.test(v)){
    const n = v.replace(/^TW/i,"");
    return "TW" + n.padStart(4,"0");
  }
  return v;
}

function getParams_(){
  try{ return new URLSearchParams(location.search || ""); }
  catch{ return new URLSearchParams(); }
}
function getIdFromUrl_(){
  const p = getParams_();
  return p.get("id") || p.get("cid") || "";
}

function baseDir_(){
  const u = new URL(location.href);
  u.hash = "";
  u.pathname = u.pathname.replace(/\/[^\/]*$/, "/");
  u.search = "";
  return u.toString().replace(/\/$/,"");
}

function homeUrl_(){ return `${baseDir_()}/index.html`; }

function cardCleanUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  return `${baseDir_()}/index.html?id=${encodeURIComponent(cid)}&view=1`;
}
function shareUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  return `${baseDir_()}/share.html?id=${encodeURIComponent(cid)}`;
}
function wechatUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  return `${baseDir_()}/wechat.html?id=${encodeURIComponent(cid)}`;
}
function formUrl_(tenant, invite, uid){
  const u = new URL(`${baseDir_()}/form.html`);
  if(text(tenant)) u.searchParams.set("tenant", text(tenant));
  if(text(invite)) u.searchParams.set("invite", text(invite));
  if(text(uid))    u.searchParams.set("uid", text(uid));
  return u.toString();
}

/* ---------- invite generator (v499) ---------- */
function rand36_(len){
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = new Uint8Array(len);
  try{
    crypto.getRandomValues(a);
    return Array.from(a).map(n => chars[n % chars.length]).join("");
  }catch{
    // fallback
    let out = "";
    for(let i=0;i<len;i++){
      out += chars[Math.floor(Math.random()*chars.length)];
    }
    return out;
  }
}
// Format: A9K3-7Q2M
function generateInvite_(){
  const p1 = rand36_(4);
  const p2 = rand36_(4);
  return `${p1}-${p2}`;
}
function ensureInvite_(){
  const el = qs("formInvite");
  if(!el) return "";
  let v = text(el.value);
  if(!v){
    v = generateInvite_();
    el.value = v;
  }else{
    // normalize: uppercase, keep dash if any
    v = v.toUpperCase();
    el.value = v;
  }
  return v;
}

/* ---------- robust parse ---------- */
function safeJsonParse_(rawText){
  let s = String(rawText||"").trim();
  if(!s) return null;
  s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
  try{ return JSON.parse(s); }catch{}
  const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if(m){ try{ return JSON.parse(m[0]); }catch{} }
  return null;
}

/* ---------- robust GET ---------- */
async function fetchWithTimeout_(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", cache:"no-store", redirect:"follow", signal: controller.signal });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if(!json) throw new Error("Not JSON");
    if(json && typeof json === "object" && !json.__raw) json.__raw = txt;
    return json;
  } finally {
    clearTimeout(t);
  }
}
async function fetchJsonRobust_(url){
  let last = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{ return await fetchWithTimeout_(url, CONFIG.TIMEOUT_MS); }
    catch(e){
      last = e;
      await new Promise(r=>setTimeout(r, 520 + i*520));
    }
  }
  throw last || new Error("Fetch failed");
}

/* ---------- POST (avoid preflight) + GET fallback ---------- */
async function postPlainJson_(bodyObj){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), CONFIG.TIMEOUT_MS);
  try{
    const res = await fetch(`${CONFIG.GAS}?ts=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
      redirect: "follow",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(bodyObj || {}),
      signal: controller.signal
    });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if(!json) throw new Error("Not JSON");
    if(json && typeof json === "object" && !json.__raw) json.__raw = txt;
    return json;
  } finally { clearTimeout(t); }
}
async function getFallback_(bodyObj){
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("ts", String(Date.now()));
  Object.keys(bodyObj || {}).forEach(k=>{
    const v = bodyObj[k];
    if(v==null) return;
    u.searchParams.set(k, String(v));
  });
  return await fetchJsonRobust_(u.toString());
}
async function callAction_(bodyObj){
  let lastErr = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{ return await postPlainJson_(bodyObj); }
    catch(e){
      lastErr = e;
      await new Promise(r=>setTimeout(r, 520 + i*520));
    }
  }
  try{ return await getFallback_(bodyObj); }
  catch(e){
    throw new Error(`POST失敗(${lastErr?.message || "unknown"}); GET也失敗(${e?.message || "unknown"})`);
  }
}

/* ---------- payload extract ---------- */
function extractRow_(payload){
  if(!payload || typeof payload !== "object") return null;
  if(payload.ok === true){
    const cand = payload.item || payload.data || payload.row || payload.card || null;
    if(cand && typeof cand === "object") return cand;
  }
  if(payload.id || payload.name || payload["姓名"]) return payload;
  if(payload.data && typeof payload.data === "object") return payload.data;
  if(payload.row && typeof payload.row === "object") return payload.row;
  return null;
}

function pick_(obj, keys){
  if(!obj) return "";
  for(const k of keys){
    const v = obj[k];
    if(v!=null && text(v)!=="") return v;
  }
  const lower = Object.create(null);
  Object.keys(obj).forEach(k=> lower[String(k).toLowerCase()] = obj[k]);
  for(const k of keys){
    const v = lower[String(k).toLowerCase()];
    if(v!=null && text(v)!=="") return v;
  }
  return "";
}

/* ---------- image normalize (keep old robustness) ---------- */
function isUrl_(s){ return /^https?:\/\//i.test(String(s||"").trim()); }
function normalizeUrl_(s){
  let v = String(s||"").trim();
  if(!v) return "";
  if(v.startsWith("http://")) v = "https://" + v.slice(7);
  if(isUrl_(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  return v;
}
function driveIdFromUrl_(u){
  const s = String(u||"").trim();
  if(!s) return "";
  const mFile = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return mFile[1];
  const mUc = s.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
  if(mUc && mUc[1]) return decodeURIComponent(mUc[1]);
  const mThumb = s.match(/thumbnail\?id=([^&]+)/i);
  if(mThumb && mThumb[1]) return decodeURIComponent(mThumb[1]);
  const mOpen = s.match(/drive\.google\.com\/open\?[^#]*id=([^&]+)/i);
  if(mOpen && mOpen[1]) return decodeURIComponent(mOpen[1]);
  const mId = s.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return decodeURIComponent(mId[1]);
  return "";
}
function normalizeImageUrl_(raw){
  let url = normalizeUrl_(raw);
  if(!url) return "";
  if(url.includes("dropbox.com")){
    url = url.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }
  const did = driveIdFromUrl_(url);
  if(did) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(did)}`;
  return url;
}
function buildImgCandidates_(raw){
  const s = text(raw);
  if(!s) return [];
  const did = driveIdFromUrl_(s);
  if(did){
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(did)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(did)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(did)}`,
      normalizeUrl_(s)
    ].filter(Boolean);
  }
  return [normalizeImageUrl_(s)].filter(Boolean);
}
function loadImageWithFallback_(candidates){
  const list = (candidates||[]).filter(Boolean);
  return new Promise((resolve, reject)=>{
    if(!list.length) return reject(new Error("no candidates"));
    let idx = 0;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    const tryNext = ()=>{
      idx++;
      if(idx >= list.length) return reject(new Error("all failed"));
      img.src = list[idx] + (list[idx].includes("?") ? "&" : "?") + "t=" + Date.now();
    };

    img.onload = ()=> resolve(img);
    img.onerror = tryNext;
    img.src = list[0] + (list[0].includes("?") ? "&" : "?") + "t=" + Date.now();
  });
}

/* ---------- UI helpers ---------- */
function setHint_(html){
  const el = qs("adminHint");
  if(el) el.innerHTML = html || "";
}
function setFormHint_(html){
  const el = qs("formHint");
  if(el) el.innerHTML = html || "";
}
function setStatusView_(row){
  const st = text(pick_(row, ["status","狀態"]));
  const el = qs("txtStatus");
  if(!el) return;
  el.textContent = st || "—";
  el.removeAttribute("data-st");
  if(st) el.setAttribute("data-st", st);
}
function fillPreview_(row){
  const name  = text(pick_(row, ["姓名","name"])) || "—";
  const unit  = text(pick_(row, ["單位","unit"]));
  const title = text(pick_(row, ["頭銜","職稱","title"]));
  const slogan = text(pick_(row, ["理念標語","slogan","簡介","一句話","引言"]));

  if(qs("pvName"))  qs("pvName").textContent = name;
  if(qs("pvUnit"))  qs("pvUnit").textContent = unit;
  if(qs("pvTitle")) qs("pvTitle").textContent = title;

  const sEl = qs("pvSlogan");
  if(sEl){
    if(slogan){
      sEl.style.display = "";
      sEl.textContent = slogan;
    }else{
      sEl.style.display = "none";
      sEl.textContent = "";
    }
  }

  const aRaw = pick_(row, ["個人照_fast","個人照","avatar_img_fast","avatar_img","avatar_fast","avatar","形象照","photo"]);
  const aUrl = normalizeImageUrl_(aRaw);
  const pv = qs("pvAvatar");
  if(pv){
    if(aUrl) pv.src = aUrl;
    else pv.removeAttribute("src");
  }

  if(qs("txtCardUrl"))  qs("txtCardUrl").textContent = cardCleanUrl_(currentId);
  if(qs("txtShareUrl")) qs("txtShareUrl").textContent = shareUrl_(currentId);

  const tk = text(pick_(row, ["token","TOKEN"]));
  if(tk && qs("adminToken") && !text(qs("adminToken").value)){
    qs("adminToken").value = tk;
  }

  setStatusView_(row);
}

/* ---------- Clipboard ---------- */
async function copyText_(s){
  const v = String(s||"");
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(v);
      return true;
    }
  }catch{}
  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }catch{
    return false;
  }
}

/* ---------- Overlay ---------- */
function showOverlay_(on, title, hint){
  const ov = qs("posterOverlay");
  if(!ov) return;
  ov.style.display = on ? "flex" : "none";
  ov.setAttribute("aria-hidden", on ? "false" : "true");
  if(title && qs("posterStatus")) qs("posterStatus").textContent = title;
  if(hint && qs("posterHint")) qs("posterHint").textContent = hint;
}

/* ---------- Secrets / Token ---------- */
function getToken_(){ return text(qs("adminToken")?.value); }
function getSecret_(){ return text(qs("adminSecret")?.value); }
function getPinCompat_(){ return text(qs("adminSecret")?.value); }

function rememberSecret_(){
  const v = getSecret_();
  if(!v){ alert("請先輸入 ADMIN_SECRET（或舊版 PIN）"); return; }
  localStorage.setItem("HSC_ADMIN_SECRET", v);
  alert("✅ 已記住（存在本機）");
}
function rememberToken_(){
  const v = getToken_();
  if(!v){ alert("請先輸入 token"); return; }
  localStorage.setItem("HSC_ADMIN_TOKEN", v);
  alert("✅ 已記住（存在本機）");
}

/* ---------- Load row (v499 gate) ---------- */
async function loadRowById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  currentId = cid;
  if(qs("adminInput")) qs("adminInput").value = cid;

  const token = getToken_();
  setHint_(`⏳ 讀取中：<b>${cid}</b>`);

  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "card");
  u.searchParams.set("id", cid);
  if(token) u.searchParams.set("token", token);
  u.searchParams.set("ts", String(Date.now()));

  try{
    const payload = await fetchJsonRobust_(u.toString());
    const row = extractRow_(payload);

    if(payload && payload.ok === false){
      const msg = text(payload.message || payload.error || "");
      if(msg && /token required/i.test(msg)){
        setHint_(`⚠️ 需要 token：<b>${cid}</b>（請填 token 再載入）`);
        currentRow = null;
        setStatusView_({ status: payload.status || "" });
        return;
      }
    }

    if(!row) throw new Error("Invalid payload (missing item/data/row)");
    currentRow = row;

    setHint_(`✅ 已載入：<b>${cid}</b>`);
    fillPreview_(row);
  }catch(e){
    console.error(e);
    currentRow = null;
    setHint_(`⚠️ 載入失敗：<b>${cid}</b>（請確認 GAS action=card 可用；或需要 token）`);
    if(qs("pvName"))  qs("pvName").textContent = "載入失敗";
    if(qs("pvUnit"))  qs("pvUnit").textContent = "";
    if(qs("pvTitle")) qs("pvTitle").textContent = "";
    setStatusView_({});
  }
}

async function requireLoaded_(){
  if(!/^TW\d{4}$/.test(currentId)) {
    alert("⚠️ 請先載入序號");
    return false;
  }
  return true;
}

function unwrapOk_(r){
  if(!r || typeof r !== "object") return { ok:false, msg:"No response" };
  if(r.ok === true) return { ok:true, msg:"ok" };
  if(r.success === true) return { ok:true, msg:"success" };
  return { ok:false, msg: String(r.error || r.message || "unknown") };
}

/* ---------- v499 actions ---------- */
async function doConfirm_(){
  if(!(await requireLoaded_())) return;

  const token = getToken_();
  if(!token){
    alert("⚠️ confirm 需要 token（請先填 token）");
    return;
  }
  if(!confirm(`確定要「confirm（客戶確認）」？\n${currentId}`)) return;

  setHint_(`⏳ confirm 中：<b>${currentId}</b>`);
  try{
    const r = await callAction_({ action:"confirm", id: currentId, token });
    const u = unwrapOk_(r);
    if(u.ok){
      setHint_(`✅ confirm 完成：<b>${currentId}</b>`);
      await loadRowById_(currentId);
    }else{
      setHint_(`⚠️ confirm 失敗：<b>${currentId}</b>`);
      alert("confirm 失敗：" + u.msg);
    }
  }catch(e){
    console.error(e);
    setHint_(`⚠️ confirm 失敗：<b>${currentId}</b>`);
    alert("confirm 失敗：" + e.message);
  }
}

async function doActivate_(){
  if(!(await requireLoaded_())) return;

  const secret = getSecret_();
  const pinCompat = getPinCompat_();
  if(!secret && !pinCompat){
    alert("⚠️ 請輸入 ADMIN_SECRET（或舊版 PIN）");
    return;
  }
  if(!confirm(`確定要「activate（交付開卡）」？\n${currentId}`)) return;

  setHint_(`⏳ activate 中：<b>${currentId}</b>`);
  try{
    const r = await callAction_({
      action:"activate",
      id: currentId,
      secret: secret || "",
      admin_secret: secret || "",
      admin_pin: pinCompat || ""
    });

    const u = unwrapOk_(r);
    if(u.ok){
      setHint_(`✅ 已開卡：<b>${currentId}</b>`);
      await loadRowById_(currentId);
    }else{
      setHint_(`⚠️ 開卡失敗：<b>${currentId}</b>`);
      alert("activate 失敗：" + u.msg);
    }
  }catch(e){
    console.error(e);
    setHint_(`⚠️ 開卡失敗：<b>${currentId}</b>`);
    alert("activate 失敗：" + e.message);
  }
}

/* ---------- Delivery ---------- */
async function doCopyCard_(){
  if(!/^TW\d{4}$/.test(currentId)){ alert("⚠️ 請先載入序號"); return; }
  const ok = await copyText_(cardCleanUrl_(currentId));
  alert(ok ? "✅ 已複製「智慧名片成品」連結" : "⚠️ 複製失敗");
}
async function doCopyShare_(){
  if(!/^TW\d{4}$/.test(currentId)){ alert("⚠️ 請先載入序號"); return; }
  const ok = await copyText_(shareUrl_(currentId));
  alert(ok ? "✅ 已複製分享連結" : "⚠️ 複製失敗");
}
async function doCopyDelivery_(){
  if(!/^TW\d{4}$/.test(currentId)){ alert("⚠️ 請先載入序號"); return; }
  const share = shareUrl_(currentId);
  const card  = cardCleanUrl_(currentId);
  const wechat = wechatUrl_(currentId);

  const pack =
`【智慧名片成品交付】（ID：${currentId}）
✅ 分享卡（貼社群 / 有OG圖卡）：
${share}

✅ 智慧名片成品（自己收藏）：
${card}

✅ 微信長圖（Poster）：
${wechat}
`;
  const ok = await copyText_(pack);
  alert(ok ? "✅ 已一鍵交貨（文字+連結已複製）" : "⚠️ 複製失敗");
}
function doPreview_(){
  if(!/^TW\d{4}$/.test(currentId)){ alert("⚠️ 請先載入序號"); return; }
  window.open(cardCleanUrl_(currentId), "_blank");
}
async function doCopyStatus_(){
  const st = text(qs("txtStatus")?.textContent);
  const ok = await copyText_(st || "");
  alert(ok ? "✅ 已複製 status" : "⚠️ 複製失敗");
}
function doBackHome_(){ location.href = homeUrl_(); }

/* ---------- Form link + reserve ---------- */
function getFormFields_(){
  const tenant = text(qs("formTenant")?.value) || "angel";
  const invite = text(qs("formInvite")?.value);
  const uid    = text(qs("formUid")?.value);
  return { tenant, invite, uid };
}

async function doCopyFormLink_(){
  const { tenant, uid } = getFormFields_();
  const invite = ensureInvite_(); // ✅ auto-generate if empty

  const link = formUrl_(tenant, invite, uid);
  const ok = await copyText_(link);
  alert(ok ? `✅ 已複製表單連結（invite：${invite}）` : "⚠️ 複製失敗");
}

async function doCopyFormPack_(){
  const { tenant, uid } = getFormFields_();
  const invite = ensureInvite_(); // ✅ auto-generate if empty
  const link = formUrl_(tenant, invite, uid);

  const msg =
`【智慧名片訂製表單】
請用下面連結填寫資料（含照片上傳）：
${link}

注意：
1) 填完送出後，請把「邀請碼」回傳給我：${invite}
2) 你送出後，我會先做成品給你預覽核對；確認無誤後才會正式開卡交付。
`;
  const ok = await copyText_(msg);
  alert(ok ? `✅ 已複製給客戶（含說明＋invite：${invite}）` : "⚠️ 複製失敗");
}

async function doReserve_(){
  let { tenant, uid } = getFormFields_();
  const invite = ensureInvite_(); // ✅ auto-generate if empty

  // uid optional: warn but allow
  if(!uid){
    const go = confirm("⚠️ 你目前未填 uid。\n\nuid 可用於 reserve 綁定與上傳路徑更精準。\n若你暫時沒有 uid，也可先 reserve（之後再補）。\n\n仍要繼續 reserve 嗎？");
    if(!go) return;
  }

  setFormHint_(`⏳ reserve 中：<b>${invite}</b>${uid ? ` · uid=<b>${uid}</b>` : " · uid=<b>—</b>"}`);
  try{
    const r = await callAction_({ action:"reserve", tenant, invite, uid: uid || "" });
    const u = unwrapOk_(r);
    if(u.ok){
      lastReserve = r;
      const cardId = text(r.cardId || r.card_id || "");
      const uploadPath = text(r.uploadPath || r.upload_path || "");
      setFormHint_(`✅ reserve 成功：cardId=<b>${cardId || "—"}</b> · uploadPath=<b>${uploadPath || "—"}</b>`);
      if(cardId){
        qs("adminInput").value = cardId;
      }
      if(qs("btnCopyUploadPath")) qs("btnCopyUploadPath").disabled = !uploadPath;
    }else{
      setFormHint_(`⚠️ reserve 失敗：<b>${invite}</b>`);
      alert("reserve 失敗：" + u.msg);
    }
  }catch(e){
    console.error(e);
    setFormHint_(`⚠️ reserve 失敗：<b>${invite}</b>`);
    alert("reserve 失敗：" + e.message);
  }
}

async function doCopyUploadPath_(){
  const uploadPath = text(lastReserve?.uploadPath || lastReserve?.upload_path || "");
  if(!uploadPath){
    alert("⚠️ 先 reserve 才會有 uploadPath");
    return;
  }
  const ok = await copyText_(uploadPath);
  alert(ok ? "✅ 已複製 uploadPath" : "⚠️ 複製失敗");
}

/* ---------- WeChat Poster (kept) ---------- */
function pickPosterPhotos_(row){
  const urls = [];
  const bulkFast = pick_(row, ["照片_fast","photos_fast","photos_img_fast","photo_wall_fast"]);
  const bulkSlow = pick_(row, ["照片","photos_img","photos","photo_wall"]);
  const bulk = text(bulkFast) ? bulkFast : bulkSlow;

  if(text(bulk)){
    String(bulk).split(/[\n,，;]/g).map(s=>s.trim()).filter(Boolean).forEach(u=>urls.push(u));
  }
  for(let i=1;i<=6;i++){
    const vFast = pick_(row, [`photo_fast${i}`,`photo${i}_fast`,`照片_fast${i}`,`照片${i}_fast`]);
    const v = text(vFast) ? vFast : pick_(row, [`photo${i}_img`,`photo${i}`,`photo_${i}`,`照片${i}`,`相片${i}`]);
    if(text(v)) urls.push(v);
  }

  const seen = new Set();
  const out = [];
  for(const u of urls){
    const nu = normalizeImageUrl_(u);
    if(!nu) continue;
    const key = nu.replace(/[?#].*$/,"").toLowerCase();
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(nu);
    if(out.length >= 3) break;
  }
  return out;
}
function roundRect_(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

async function generateWeChatPoster_(){
  if(!currentRow){
    alert("⚠️ 請先載入資料");
    return;
  }
  if(!window.QRious){
    alert("⚠️ 缺少 QRious（admin.html 需要引入）");
    return;
  }

  showOverlay_(true, "正在生成微信長圖…", "照片多時會慢一點，請稍候。");

  const W = CONFIG.POSTER_W, H = CONFIG.POSTER_H;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,W,H);

  const g = ctx.createLinearGradient(0,0,0,520);
  g.addColorStop(0, "rgba(123,220,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,520);

  const pad = 70;
  const cardX = pad, cardY = 110, cardW = W - pad*2, cardH = 1580;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#ffffff";
  roundRect_(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 2;
  roundRect_(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.stroke();

  const name  = text(pick_(currentRow, ["姓名","name"])) || "未命名";
  const unit  = text(pick_(currentRow, ["單位","unit"]));
  const title = text(pick_(currentRow, ["頭銜","職稱","title"]));
  const slogan = text(pick_(currentRow, ["理念標語","slogan","簡介","一句話","引言"]));

  const aRaw = pick_(currentRow, ["個人照_fast","個人照","avatar_img_fast","avatar_img","avatar_fast","avatar","形象照","photo"]);
  const avatarCandidates = buildImgCandidates_(aRaw);

  const ax = cardX + 56;
  const ay = cardY + 56;
  const ar = 92;

  ctx.save();
  ctx.beginPath();
  ctx.arc(ax+ar, ay+ar, ar, 0, Math.PI*2);
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  ctx.fillRect(ax, ay, ar*2, ar*2);
  ctx.restore();

  try{
    const aimg = await loadImageWithFallback_(avatarCandidates);
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax+ar, ay+ar, ar, 0, Math.PI*2);
    ctx.clip();
    const iw = aimg.naturalWidth, ih = aimg.naturalHeight;
    const scale = Math.max((ar*2)/iw, (ar*2)/ih);
    const dw = iw*scale, dh = ih*scale;
    const dx = ax + (ar*2 - dw)/2;
    const dy = ay + (ar*2 - dh)/2;
    ctx.drawImage(aimg, dx, dy, dw, dh);
    ctx.restore();

    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ax+ar, ay+ar, ar, 0, Math.PI*2);
    ctx.stroke();
  }catch{}

  const tx = ax + ar*2 + 40;
  const ty = ay + 10;

  ctx.fillStyle = "#111318";
  ctx.font = "900 64px 'Noto Sans TC', sans-serif";
  ctx.fillText(name, tx, ty + 64);

  ctx.fillStyle = "rgba(17,19,24,0.72)";
  ctx.font = "800 34px 'Noto Sans TC', sans-serif";
  if(unit) ctx.fillText(unit, tx, ty + 120);

  ctx.fillStyle = "rgba(17,19,24,0.58)";
  ctx.font = "800 32px 'Noto Sans TC', sans-serif";
  if(title) ctx.fillText(title, tx, ty + 170);

  let yCursor = ay + ar*2 + 48;

  if(slogan){
    const bx = cardX + 56;
    const bw = cardW - 112;
    const by = yCursor;
    const bh = 150;

    ctx.fillStyle = "rgba(123,220,255,0.10)";
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 2;
    roundRect_(ctx, bx, by, bw, bh, 28);
    ctx.fill();
    roundRect_(ctx, bx, by, bw, bh, 28);
    ctx.stroke();

    ctx.fillStyle = "rgba(17,19,24,0.86)";
    ctx.font = "800 34px 'Noto Sans TC', sans-serif";

    const maxW = bw - 44;
    const chars = slogan.split("");
    let line = "";
    const lines = [];
    for(const ch of chars){
      const t = line + ch;
      if(ctx.measureText(t).width > maxW){
        lines.push(line);
        line = ch;
        if(lines.length >= 2) break;
      }else{
        line = t;
      }
    }
    if(lines.length < 2 && line) lines.push(line);

    ctx.fillText(lines[0] || "", bx + 22, by + 62);
    if(lines[1]) ctx.fillText(lines[1], bx + 22, by + 112);

    yCursor = by + bh + 44;
  }

  const photos = pickPosterPhotos_(currentRow);
  const px = cardX + 56;
  const pw = cardW - 112;
  const ph = 760;
  const py = yCursor;

  ctx.fillStyle = "rgba(0,0,0,0.03)";
  roundRect_(ctx, px, py, pw, ph, 34);
  ctx.fill();

  const n = photos.length || 0;
  const cols = n >= 3 ? 3 : (n === 2 ? 2 : 1);
  const gap = 18;
  const cellW = (pw - gap*(cols-1)) / cols;
  const cellH = ph;

  for(let i=0;i<cols;i++){
    const u = photos[i];
    const cx = px + i*(cellW + gap);
    const cy = py;

    ctx.save();
    roundRect_(ctx, cx, cy, cellW, cellH, 26);
    ctx.clip();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(cx,cy,cellW,cellH);

    if(u){
      try{
        const img = await loadImageWithFallback_(buildImgCandidates_(u));
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const scale = Math.max(cellW/iw, cellH/ih);
        const dw = iw*scale, dh = ih*scale;
        const dx = cx + (cellW - dw)/2;
        const dy = cy + (cellH - dh)/2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }catch{}
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 2;
    roundRect_(ctx, cx, cy, cellW, cellH, 26);
    ctx.stroke();
  }

  const qrSize = 300;
  const qx = cardX + 56;
  const qy = cardY + cardH - 56 - qrSize;
  const cardUrl = cardCleanUrl_(currentId);

  const qrCanvas = document.createElement("canvas");
  new QRious({
    element: qrCanvas,
    value: cardUrl,
    size: qrSize,
    level: "H",
    background: "white",
    foreground: "#111318"
  });

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.03)";
  roundRect_(ctx, qx - 18, qy - 18, qrSize + 36, qrSize + 36, 28);
  ctx.fill();
  ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize);
  ctx.restore();

  const rx = qx + qrSize + 46;
  const ry = qy + 26;

  ctx.fillStyle = "#111318";
  ctx.font = "900 40px 'Noto Sans TC', sans-serif";
  ctx.fillText("長按辨識 QR", rx, ry + 42);

  ctx.fillStyle = "rgba(17,19,24,0.70)";
  ctx.font = "800 30px 'Noto Sans TC', sans-serif";
  ctx.fillText("掃描進入智慧名片成品", rx, ry + 92);

  ctx.fillStyle = "rgba(17,19,24,0.55)";
  ctx.font = "700 26px 'Noto Sans TC', sans-serif";
  ctx.fillText(`序號：${currentId}`, rx, ry + 138);

  ctx.fillStyle = "rgba(17,19,24,0.35)";
  ctx.font = "700 22px 'Noto Sans TC', sans-serif";
  ctx.fillText("Happiness Smart Card System", cardX + 56, cardY + cardH - 26);

  const blob = await new Promise((resolve)=> canvas.toBlob(resolve, "image/png", 0.92));
  if(!blob){
    showOverlay_(false);
    alert("⚠️ 生成失敗（瀏覽器不支援 toBlob）");
    return;
  }

  if(posterObjectUrl){
    try{ URL.revokeObjectURL(posterObjectUrl); }catch{}
  }
  posterObjectUrl = URL.createObjectURL(blob);
  if(qs("btnOpenPoster")) qs("btnOpenPoster").disabled = false;

  const filename = `wechat-poster-${currentId}.png`;
  let downloaded = false;
  try{
    const a = document.createElement("a");
    a.href = posterObjectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    downloaded = true;
  }catch{}

  showOverlay_(false);
  alert(downloaded
    ? "✅ 已生成微信長圖（若未自動存檔，請點「開啟長圖」再長按存圖）"
    : "✅ 已生成微信長圖（請點「開啟長圖」→ 長按圖片存圖）"
  );
}

function openPoster_(){
  if(!posterObjectUrl){ alert("⚠️ 先生成微信長圖"); return; }
  window.open(posterObjectUrl, "_blank");
}

/* ---------- apply input ---------- */
async function applyInput_(){
  const raw = text(qs("adminInput")?.value);
  if(!raw){
    setHint_("⚠️ 請輸入 TW0001 / 0001");
    return;
  }
  const nid = normalizeId_(raw);
  if(!/^TW\d{4}$/.test(nid)){
    setHint_(`⚠️ 請輸入序號格式（TW0001 / 0001）。`);
    return;
  }
  try{
    const u = new URL(location.href);
    u.searchParams.set("id", nid);
    history.replaceState({}, "", u.toString());
  }catch{}
  await loadRowById_(nid);
}

/* ---------- boot ---------- */
(function boot_(){
  try{
    const savedSecret = localStorage.getItem("HSC_ADMIN_SECRET") || "";
    const savedToken  = localStorage.getItem("HSC_ADMIN_TOKEN") || "";
    if(qs("adminSecret")) qs("adminSecret").value = savedSecret;
    if(qs("adminToken"))  qs("adminToken").value  = savedToken;

    if(qs("formTenant") && !text(qs("formTenant").value)) qs("formTenant").value = "angel";
  }catch{}

  if(qs("btnBackHome")) qs("btnBackHome").addEventListener("click", doBackHome_);

  // Form tools
  if(qs("btnCopyFormLink")) qs("btnCopyFormLink").addEventListener("click", doCopyFormLink_);
  if(qs("btnCopyFormPack")) qs("btnCopyFormPack").addEventListener("click", doCopyFormPack_);
  if(qs("btnReserve")) qs("btnReserve").addEventListener("click", doReserve_);
  if(qs("btnCopyUploadPath")) qs("btnCopyUploadPath").addEventListener("click", doCopyUploadPath_);

  // Load tools
  if(qs("btnApply")) qs("btnApply").addEventListener("click", applyInput_);
  if(qs("adminInput")) qs("adminInput").addEventListener("keydown", (e)=>{ if(e.key==="Enter") applyInput_(); });
  if(qs("btnLoad")) qs("btnLoad").addEventListener("click", ()=> loadRowById_(normalizeId_(qs("adminInput")?.value) || currentId || CONFIG.DEFAULT_ID));

  // remember
  if(qs("btnRememberSecret")) qs("btnRememberSecret").addEventListener("click", rememberSecret_);
  if(qs("btnRememberToken")) qs("btnRememberToken").addEventListener("click", rememberToken_);

  // Delivery
  if(qs("btnPreview")) qs("btnPreview").addEventListener("click", doPreview_);
  if(qs("btnCopyCard")) qs("btnCopyCard").addEventListener("click", doCopyCard_);
  if(qs("btnCopyShare")) qs("btnCopyShare").addEventListener("click", doCopyShare_);
  if(qs("btnCopyDelivery")) qs("btnCopyDelivery").addEventListener("click", doCopyDelivery_);

  if(qs("btnCopyCard2")) qs("btnCopyCard2").addEventListener("click", doCopyCard_);
  if(qs("btnCopyShare2")) qs("btnCopyShare2").addEventListener("click", doCopyShare_);
  if(qs("btnCopyStatus")) qs("btnCopyStatus").addEventListener("click", doCopyStatus_);

  // v499 actions
  if(qs("btnConfirm")) qs("btnConfirm").addEventListener("click", doConfirm_);
  if(qs("btnActivate")) qs("btnActivate").addEventListener("click", doActivate_);

  // Poster
  if(qs("btnWeChatPoster")) qs("btnWeChatPoster").addEventListener("click", generateWeChatPoster_);
  if(qs("btnOpenPoster")) qs("btnOpenPoster").addEventListener("click", openPoster_);
  if(qs("btnCancelOverlay")) qs("btnCancelOverlay").addEventListener("click", ()=> showOverlay_(false));

  const id = normalizeId_(getIdFromUrl_() || CONFIG.DEFAULT_ID);
  loadRowById_(id);
})();