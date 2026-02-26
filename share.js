/* ================================
 * share.js v401.1 (COMPLETE OVERWRITE) 1/3
 * - Load by id from GAS
 * - Render name/unit/title + avatar
 * - Copy card link / OG url
 * - FIX: DOM ready + null-guard
 * - FIX: safe JSON parse (handle XSSI prefix)
 * ================================ */

const SHARE = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  INDEX_PAGE: "index.html",
  OG_DEFAULT: "og-card.png",
  DEFAULT_ID: "TW0001",
  TIMEOUT: 12000
};

function $(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

function normalizeId(s){
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

function getParams(){
  try{
    const sp = new URLSearchParams(location.search);
    return {
      id: sp.get("id") || "",
      mode: sp.get("mode") || "",
      theme: sp.get("theme") || ""
    };
  }catch{
    return { id:"", mode:"", theme:"" };
  }
}

function originBase(){
  const o = location.origin;
  const path = location.pathname.replace(/\/[^\/]*$/, "/");
  return o + path;
}

function buildCardUrl(id){
  return originBase() + SHARE.INDEX_PAGE + "?id=" + encodeURIComponent(id);
}

function buildOgUrl(){
  return originBase() + SHARE.OG_DEFAULT;
}

async function copyText(t){
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(t);
      return true;
    }
  }catch{}
  const ta = document.createElement("textarea");
  ta.value = t;
  ta.setAttribute("readonly","readonly");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand("copy"); }catch{}
  document.body.removeChild(ta);
  return true;
}

function safeJsonParse_(rawText){
  let s = String(rawText || "").trim();
  if(!s) return null;

  // GAS / some proxies may prepend XSSI guard like: )]}'
  s = s.replace(/^\)\]\}'\s*\n?/, "").trim();

  // First try direct parse
  try{ return JSON.parse(s); }catch{}

  // Fallback: try extracting first JSON object/array block
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  if(firstObj >= 0 && firstArr >= 0) start = Math.min(firstObj, firstArr);
  else start = Math.max(firstObj, firstArr);

  if(start >= 0){
    const sliced = s.slice(start).trim();
    try{ return JSON.parse(sliced); }catch{}
  }
  return null;
}

async function fetchJsonWithTimeout(url, timeout){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeout);
  try{
    const res = await fetch(url, { cache:"no-store", signal: controller.signal });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if(!json) throw new Error("JSON parse failed");
    return json;
  }finally{
    clearTimeout(t);
  }
}
/* ================================
 * share.js v401.1 (COMPLETE OVERWRITE) 2/3
 * - key picker + image url normalize
 * - extract row payload
 * ================================ */

/* lightweight key picker */
function pick(obj, keys){
  if(!obj) return "";
  for(const k of keys){
    if(obj[k]!=null && text(obj[k])!=="") return obj[k];
  }
  // try lower
  const lower = {};
  try{
    Object.keys(obj).forEach(k=> lower[String(k).toLowerCase()] = obj[k]);
  }catch{}
  for(const k of keys){
    const v = lower[String(k).toLowerCase()];
    if(v!=null && text(v)!=="") return v;
  }
  return "";
}

function driveIdFromUrl(u){
  const s = String(u||"").trim();
  if(!s) return "";
  const mFile = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return mFile[1];
  const mUc = s.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
  if(mUc && mUc[1]) return decodeURIComponent(mUc[1]);
  const mId = s.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return decodeURIComponent(mId[1]);
  return "";
}

function normalizeImageUrl(raw){
  const s = String(raw||"").trim();
  if(!s) return "";

  if(s.includes("dropbox.com")){
    let url = s.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }

  const did = driveIdFromUrl(s);
  if(did) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(did)}`;

  if(s.startsWith("http://")) return "https://" + s.slice(7);
  return s;
}

function extractRow(data){
  if(!data || typeof data !== "object") return null;
  if(data.data && typeof data.data === "object") return data.data;
  if(data.row && typeof data.row === "object") return data.row;
  if(data.id || data["姓名"] || data.name) return data;
  return null;
}

function setMetaForHumanPreview_(name, desc){
  // ⚠️ 只對“人看的”有效，爬蟲不吃 JS 改 meta
  try{
    document.title = `交貨卡｜${name || "幸福智慧名片"}`;
    const ogt = document.querySelector('meta[property="og:title"]');
    const ogd = document.querySelector('meta[property="og:description"]');
    if(ogt) ogt.setAttribute("content", `幸福智慧名片｜${name || ""}`.trim());
    if(ogd) ogd.setAttribute("content", desc || "一點，就看見彼此的價值");
  }catch{}
}

function mustGetEls_(){
  const els = {
    cardUrlBox: $("cardUrlBox"),
    btnBack: $("btnBack"),
    btnCopyCard: $("btnCopyCard"),
    btnOpenCard: $("btnOpenCard"),
    btnCopyOg: $("btnCopyOg"),
    name: $("name"),
    sub: $("sub"),
    avaImg: $("avaImg")
  };
  // allow missing btnCopyOg (optional), but most are required
  const required = ["cardUrlBox","btnBack","btnCopyCard","btnOpenCard","name","sub","avaImg"];
  for(const k of required){
    if(!els[k]) throw new Error(`Missing element: #${k}`);
  }
  return els;
}
/* ================================
 * share.js v401.1 (COMPLETE OVERWRITE) 3/3
 * - main load + DOM ready boot
 * ================================ */

async function load(){
  const els = mustGetEls_();

  const p = getParams();
  const id = normalizeId(p.id) || SHARE.DEFAULT_ID;

  const cardUrl = buildCardUrl(id);
  els.cardUrlBox.textContent = cardUrl;

  // back button (go back to index with same id)
  els.btnBack.addEventListener("click", ()=>{
    location.href = SHARE.INDEX_PAGE + "?id=" + encodeURIComponent(id);
  });

  els.btnCopyCard.addEventListener("click", async ()=>{
    await copyText(cardUrl);
    alert("✅ 已複製名片連結");
  });

  els.btnOpenCard.addEventListener("click", ()=>{
    window.open(cardUrl, "_blank");
  });

  if(els.btnCopyOg){
    els.btnCopyOg.addEventListener("click", async ()=>{
      const og = buildOgUrl();
      await copyText(og);
      alert("✅ 已複製 OG 圖網址（預留）");
    });
  }

  // fetch data for name/avatar
  const url = `${SHARE.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  try{
    const payload = await fetchJsonWithTimeout(url, SHARE.TIMEOUT);
    const row = extractRow(payload);
    if(!row) throw new Error("Invalid payload");

    const name = pick(row, ["姓名","name"]);
    const unit = pick(row, ["單位","unit"]);
    const title = pick(row, ["頭銜","職稱","title"]);

    els.name.textContent = text(name) || "未命名";
    els.sub.textContent = [text(unit), text(title)].filter(Boolean).join("\n");

    setMetaForHumanPreview_(text(name), [text(unit), text(title)].filter(Boolean).join("｜"));

    const avatar = pick(row, ["個人照_fast","個人照","avatar_fast","avatar","形象照","photo"]);
    const u = normalizeImageUrl(avatar);

    if(u){
      els.avaImg.referrerPolicy = "no-referrer";
      els.avaImg.src = u + (u.includes("?") ? "&" : "?") + "t=" + Date.now();
    }else{
      // keep default avatar if share.html provides placeholder
    }

  }catch(e){
    console.error(e);
    els.name.textContent = "載入失敗";
    els.sub.textContent = "請確認序號與 GAS 連線";
  }
}

(function boot(){
  function start(){
    load().catch(err=>console.error(err));
  }
  try{
    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", start);
    }else{
      start();
    }
  }catch(e){
    console.error(e);
  }
})();