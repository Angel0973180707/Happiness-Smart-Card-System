/* ================================
 * share.js (v399.1 COMPLETE OVERWRITE) 1/2
 * - share.html?id=TW0001
 * - OG meta uses fixed og-card.png (for LINE/FB crawler)
 * - Page overlays NAME + AVATAR for humans
 * - Buttons: open card / copy share link / copy card link
 * ================================ */

const SHARE_CONFIG = {
  // ✅ prefer window.CONFIG.GAS if exists (keep compatibility)
  GAS: (window.CONFIG && window.CONFIG.GAS)
    ? window.CONFIG.GAS
    : "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
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

function buildImageCandidates_(raw){
  const s = text(raw);
  if(!s) return [];
  const original = s.startsWith("http://") ? "https://" + s.slice(7) : s;

  if(original.includes("dropbox.com")) return [normalizeImageUrl(original)];

  let driveId = "";
  const mFile = original.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const mId = original.match(/(?:\?|&)id=([^&]+)/i);
  const mThumb = original.match(/thumbnail\?id=([^&]+)/i);
  if(mFile && mFile[1]) driveId = mFile[1];
  else if(mId && mId[1]) driveId = mId[1];
  else if(mThumb && mThumb[1]) driveId = mThumb[1];

  if(driveId){
    return [
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
      normalizeImageUrl(original)
    ].filter(Boolean);
  }
  return [normalizeImageUrl(original)].filter(Boolean);
}async function fetchWithTimeout(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", cache:"no-store", redirect:"follow", signal: controller.signal });
    const txt = await res.text();
    const body = (txt||"").trim();
    if(!body) throw new Error("Empty response");
    try{
      return JSON.parse(body);
    }catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
  }finally{
    clearTimeout(t);
  }
}

async function fetchJsonRobust(url){
  let last = null;
  for(let i=0;i<=SHARE_CONFIG.RETRY;i++){
    try{
      return await fetchWithTimeout(url, SHARE_CONFIG.FETCH_TIMEOUT_MS);
    }catch(e){
      last = e;
      warn("retry", i, e && e.message ? e.message : e);
      await new Promise(r=>setTimeout(r, 520 + i*520));
    }
  }
  throw last || new Error("Fetch failed");
}

function projectBase_(){
  try{
    const u = new URL(location.href);
    u.hash = "";
    u.search = "";
    const p = u.pathname;
    const dir = p.endsWith("/") ? p : p.substring(0, p.lastIndexOf("/") + 1);
    return u.origin + dir;
  }catch{
    return location.origin + "/";
  }
}
function buildCardUrl_(id){
  return projectBase_() + "index.html?id=" + encodeURIComponent(id);
}
function buildShareUrl_(id){
  return projectBase_() + "share.html?id=" + encodeURIComponent(id);
}

async function copyText_(s){
  const v = text(s);
  if(!v) return false;

  try{
    if(navigator.share){
      await navigator.share({ title:"幸福智慧名片", text:"點擊查看名片", url:v });
      return true;
    }
  }catch{}

  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(v);
      alert("✅ 已複製連結");
      return true;
    }
  }catch{}

  const ta = document.createElement("textarea");
  ta.value = v;
  ta.setAttribute("readonly","readonly");
  ta.style.position="fixed";
  ta.style.left="-9999px";
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand("copy"); }catch{}
  document.body.removeChild(ta);
  alert("✅ 已複製連結");
  return true;
}

function setImgWithFallback_(imgEl, candidates){
  if(!imgEl) return;
  const list = (candidates||[]).map(text).filter(Boolean);
  if(!list.length){ imgEl.removeAttribute("src"); return; }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;
  let idx = 0;

  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "eager";

  const tryNext = () => {
    if(imgEl.dataset.loadToken !== token) return;
    if(idx >= list.length){ imgEl.removeAttribute("src"); return; }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onerror = () => tryNext();
  tryNext();
}

async function boot(){
  const id = normalizeId_(getParam("id")) || SHARE_CONFIG.DEFAULT_ID;

  const loading = $("loadingLayer");
  const nameEl = $("nameText");
  const avatarBox = $("avatarBox");
  const avatarImg = $("avatarImg");
  const debug = $("debugText");

  const btnOpenCard = $("btnOpenCard");
  const btnCopyShare = $("btnCopyShare");
  const btnCopyCard = $("btnCopyCard");

  const cardUrl = buildCardUrl_(id);
  const shareUrl = buildShareUrl_(id);

  if(btnOpenCard) btnOpenCard.onclick = () => location.href = cardUrl;
  if(btnCopyShare) btnCopyShare.onclick = () => copyText_(shareUrl);
  if(btnCopyCard) btnCopyCard.onclick = () => copyText_(cardUrl);

  if(debug) debug.textContent = `id=${id}`;

  try{
    const url = `${SHARE_CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
    const data = await fetchJsonRobust(url);
    if(!data || typeof data !== "object") throw new Error("Invalid payload");
    if(data.ok === false) throw new Error(data.error || "Not found");

    const p = buildNormalizedPayload_(data);
    const name = text(pick(p, ["姓名","name","Name"]));
    const avatarRaw = pick(p, ["個人照_fast","個人照","形象照_fast","形象照","avatar_fast","avatar","photo_fast","photo","image"]);

    if(name){
      nameEl.style.display = "";
      nameEl.textContent = name;
    }
    if(text(avatarRaw)){
      avatarBox.style.display = "";
      setImgWithFallback_(avatarImg, buildImageCandidates_(avatarRaw));
    }

    if(loading) loading.style.display = "none";
  }catch(e){
    if(loading) loading.textContent = "交貨資料載入失敗（可直接點下方進入名片）";
    warn(e);
  }
}

document.addEventListener("DOMContentLoaded", boot, { once:true });