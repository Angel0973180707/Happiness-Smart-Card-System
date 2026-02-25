/* ================================
 * share.js (v399.x COMPLETE OVERWRITE)
 * Purpose:
 * - share.html?id=TW0001
 * - OG meta uses fixed og-card.png (for LINE/FB crawler)
 * - Page overlays NAME + AVATAR for humans
 * - Buttons: open card / copy share link / copy card link
 * ================================ */

const SHARE_CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  DEFAULT_ID: "TW0001",
  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,
  DEBUG: true
};

function $(id){ return document.getElementById(id); }
function text(v){ return (v==null?"":String(v)).trim(); }
function log(){ if(SHARE_CONFIG.DEBUG) console.log("[share]", ...arguments); }
function warn(){ if(SHARE_CONFIG.DEBUG) console.warn("[share]", ...arguments); }

function getParam(name){
  try { return new URLSearchParams(location.search).get(name); }
  catch { return null; }
}

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

function cleanKey_(k){
  return String(k ?? "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u202A-\u202E]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "")
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "")
    .trim();
}

function buildNormalizedPayload_(obj){
  if(!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  const lower = Object.create(null);
  for(const k of Object.keys(obj)){
    const nk = cleanKey_(k);
    if(!nk) continue;
    const v = obj[k];
    if(out[nk]==null || text(out[nk])==="") out[nk]=v;
    lower[nk.toLowerCase()] = v;
  }
  out.__lower = lower;
  return out;
}

function pick(p, keys){
  if(!p) return "";
  const lower = p.__lower || null;
  for(const k of keys){
    const kk = cleanKey_(k);
    const v1 = p[kk];
    if(v1!=null && text(v1)!=="") return v1;
    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2!=null && text(v2)!=="") return v2;
    }
  }
  return "";
}

function normalizeImageUrl(raw){
  if(!raw) return "";
  let url = String(raw).trim();
  if(!url) return "";
  if(url.startsWith("http://")) url = "https://" + url.slice(7);

  if(url.includes("dropbox.com")){
    url = url.replace("dl=0","raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?")?"&":"?")+"raw=1";
    return url;
  }

  const mFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if(mFile && mFile[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mFile[1])}`;

  const mId = url.match(/(?:\?|&)id=([^&]+)/i);
  if(mId && mId[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mId[1])}`;

  const mThumb = url.match(/thumbnail\?id=([^&]+)/i);
  if(mThumb && mThumb[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(mThumb[1])}`;

  return url;
}

async function fetchWithTimeout(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", mode:"cors", cache:"no-store", credentials:"omit", signal: controller.signal });
    const txt = await res.text();
    const body = (txt||"").trim();
    if(!body) throw new Error("Empty response");
    try { return JSON.parse(body); }
    catch {
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonRobust(url){
  let last = null;
  for(let i=0;i<=SHARE_CONFIG.RETRY;i++){
    try { return await fetchWithTimeout(url, SHARE_CONFIG.FETCH_TIMEOUT_MS); }
    catch(e){ last=e; warn("retry", i, e && e.message); await new Promise(r=>setTimeout(r, 520+i*520)); }
  }
  throw last || new Error("Fetch failed");
}

function buildCardUrl_(id){
  const u = new URL("index.html", window.location.href);
  u.searchParams.set("id", id);
  u.hash = "";
  return u.toString();
}

function buildShareUrl_(id){
  const u = new URL("share.html", window.location.href);
  u.searchParams.set("id", id);
  u.hash = "";
  return u.toString();
}

async function copyText_(s){
  const v = text(s);
  if(!v) return false;
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(v);
      return true;
    }
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = v;
  ta.setAttribute("readonly","readonly");
  ta.style.position="fixed";
  ta.style.left="-9999px";
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand("copy"); }catch{}
  document.body.removeChild(ta);
  return true;
}

function setLoading_(on, msg){
  const layer = $("loadingLayer");
  if(!layer) return;
  layer.style.display = on ? "flex" : "none";
  if(msg) layer.textContent = msg;
}

function applyToOverlay_(p){
  const name = text(pick(p, ["姓名"])) || "";
  const avatarRaw = pick(p, ["個人照_fast","個人照"]);
  const avatarUrl = normalizeImageUrl(avatarRaw);

  const nameEl = $("nameText");
  const avatarBox = $("avatarBox");
  const avatarImg = $("avatarImg");

  if(nameEl){
    if(name){
      nameEl.style.display = "";
      nameEl.textContent = name;
    }else{
      nameEl.style.display = "none";
      nameEl.textContent = "";
    }
  }

  if(avatarBox && avatarImg){
    if(avatarUrl){
      avatarBox.style.display = "";
      avatarImg.referrerPolicy = "no-referrer";
      avatarImg.decoding = "async";
      avatarImg.src = avatarUrl + (avatarUrl.includes("?")?"&":"?") + "t=" + Date.now();
    }else{
      avatarBox.style.display = "none";
      avatarImg.removeAttribute("src");
    }
  }
}

async function boot_(){
  const id = normalizeId_(getParam("id")) || SHARE_CONFIG.DEFAULT_ID;

  // buttons
  const btnOpen = $("btnOpenCard");
  const btnCopyShare = $("btnCopyShare");
  const btnCopyCard = $("btnCopyCard");
  const debug = $("debugText");

  const cardUrl = buildCardUrl_(id);
  const shareUrl = buildShareUrl_(id);

  if(btnOpen) btnOpen.onclick = ()=> window.location.href = cardUrl;
  if(btnCopyShare) btnCopyShare.onclick = async ()=>{ await copyText_(shareUrl); alert("✅ 已複製交貨連結（貼出去＝OG 卡）"); };
  if(btnCopyCard) btnCopyCard.onclick = async ()=>{ await copyText_(cardUrl); alert("✅ 已複製名片連結"); };

  if(debug) debug.textContent = `ID：${id}`;

  setLoading_(true, "載入交貨資料中…");

  try{
    const api = `${SHARE_CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
    const data = await fetchJsonRobust(api);
    if(!data || typeof data !== "object") throw new Error("Invalid payload");
    if(data.ok === false) throw new Error(data.error || "Not found");

    const norm = buildNormalizedPayload_(data);
    applyToOverlay_(norm);

    setLoading_(false);
    log("ok", { id });
  }catch(e){
    setLoading_(true, "交貨資料載入失敗（請回後臺確認 id / GAS）");
    warn(e);
  }
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });
