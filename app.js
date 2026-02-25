/* ================================
 * Happiness Smart Card System
 * app.js v399.7 COMPLETE OVERWRITE
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  DEFAULT_ID: "TW0001"
};

window.CONFIG = CONFIG;

/* ---------- basic utils ---------- */

function text(v){
  return (v ?? "").toString().trim();
}

function ensureHttp_(u){
  let v = text(u);
  if(!v) return "";

  if(/^https?:\/\//i.test(v)) return v;

  if(v.startsWith("www.")) return "https://" + v;

  if(/[a-z0-9-]+\.[a-z]{2,}/i.test(v)) return "https://" + v;

  return v;
}

function splitList_(raw){
  const s = text(raw);
  if(!s) return [];

  return s
    .replace(/\r\n/g,"\n")
    .replace(/[，,]+/g,"\n")
    .replace(/[ \t]+/g,"\n")
    .split("\n")
    .map(x=>x.trim())
    .filter(Boolean);
}

function pick(obj, keys){
  for(const k of keys){
    if(obj[k]) return obj[k];
  }
  return "";
}

/* ---------- DOM helpers ---------- */

function el(id){ return document.getElementById(id); }

function show(id, yes=true){
  const e = el(id);
  if(e) e.style.display = yes ? "" : "none";
}/* ================================
 * app.js v399.7 (2/3)
 * - robust JSON fetch
 * - normalize payload keys
 * - image loader (avatar/logo/photos)
 * ================================ */

async function fetchJson_(url, timeoutMs=12000){
  const ctl = new AbortController();
  const t = setTimeout(()=>ctl.abort(), timeoutMs);
  try{
    const res = await fetch(url, { method:"GET", cache:"no-store", signal: ctl.signal });
    const body = (await res.text() || "").trim();
    if(!body) throw new Error("Empty response");
    try{
      return JSON.parse(body);
    }catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
  } finally {
    clearTimeout(t);
  }
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

function normalizePayload_(obj){
  const out = {};
  const lower = Object.create(null);

  for(const k of Object.keys(obj || {})){
    const nk = cleanKey_(k);
    const v = obj[k];
    if(nk && (out[nk]==null || text(out[nk])==="")) out[nk] = v;
    if(nk){
      const lk = nk.toLowerCase();
      if(lower[lk]==null || text(lower[lk])==="") lower[lk] = v;
    }
  }
  out.__lower = lower;
  return out;
}

function pickN(p, keys){
  if(!p) return "";
  const lower = p.__lower || null;

  for(const k of keys){
    const kk = cleanKey_(k);
    if(p[kk]!=null && text(p[kk])!=="") return p[kk];
    if(lower){
      const v = lower[String(kk).toLowerCase()];
      if(v!=null && text(v)!=="") return v;
    }
  }
  return "";
}

/* ---------- image loader ---------- */

function normalizeImageUrl_(raw){
  if(!raw) return "";
  let url = String(raw).trim();
  if(!url) return "";
  if(url.startsWith("http://")) url = "https://" + url.slice(7);

  if(url.includes("dropbox.com")){
    url = url.replace("dl=0", "raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
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

  if(original.includes("dropbox.com")) return [normalizeImageUrl_(original)];

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
      normalizeImageUrl_(original)
    ].filter(Boolean);
  }

  return [normalizeImageUrl_(original)].filter(Boolean);
}

function setImgWithFallback_(imgEl, candidates){
  if(!imgEl) return;
  const list = (candidates||[]).map(text).filter(Boolean);
  if(!list.length){ imgEl.removeAttribute("src"); return; }

  const token = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  imgEl.dataset.loadToken = token;

  imgEl.referrerPolicy = "no-referrer";
  imgEl.decoding = "async";
  imgEl.loading = "lazy";

  let idx = 0;
  const tryNext = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    if(idx >= list.length){
      imgEl.style.opacity="0";
      imgEl.removeAttribute("src");
      return;
    }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onload = ()=>{ if(imgEl.dataset.loadToken===token) imgEl.style.opacity="1"; };
  imgEl.onerror = ()=>{ if(imgEl.dataset.loadToken===token) tryNext(); };

  imgEl.style.opacity="0";
  imgEl.style.transition="opacity 420ms ease";
  tryNext();
}/* ================================
 * app.js v399.7 (3/3)
 * - apply data to DOM
 * - photo wall
 * - contact dock (stable order)
 * - loader + boot
 * ================================ */

function escapeHtml_(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

/* ---------- blocks ---------- */

function renderBlock_(rootId, title, body){
  const root = $(rootId);
  if(!root) return;

  const b = text(body);
  if(!b){
    root.innerHTML="";
    root.style.display="none";
    return;
  }
  root.style.display="";

  root.innerHTML = `
    <div class="block-title">${title}</div>
    <div class="block-body preline">${escapeHtml_(b)}</div>
  `;
}

/* ---------- avatar / logo ---------- */

function setAvatar_(p){
  const img = $("u-img");
  if(!img) return;

  const raw = pickN(p, [
    "個人照_fast","個人照",
    "形象照_fast","形象照",
    "avatar","photo","image"
  ]);

  const cands = buildImageCandidates_(raw);
  setImgWithFallback_(img, cands);
}

function setLogo_(p){
  const wrap = $("logoWrap");
  const img  = $("u-logo");
  if(!wrap || !img) return;

  const raw = pickN(p, [
    "logo_fast","logo","Logo",
    "品牌logo","品牌Logo"
  ]);

  const cands = buildImageCandidates_(raw);

  if(!cands.length){
    wrap.style.display="none";
    img.removeAttribute("src");
    return;
  }

  wrap.style.display="";
  setImgWithFallback_(img, cands);
}

/* ---------- photo wall ---------- */

function splitPhotos_(raw){
  const s = text(raw);
  if(!s) return [];
  return s
    .replace(/\r\n/g,"\n")
    .replace(/[,，]+/g,"\n")
    .split("\n")
    .map(x=>x.trim())
    .filter(Boolean);
}

function renderPhotos_(p){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML="";

  const urls = [
    ...splitPhotos_(pickN(p, ["照片","photos","images"])),
  ];

  if(!urls.length){
    wall.style.display="none";
    return;
  }

  wall.style.display="";

  for(const raw of urls){
    const img = document.createElement("img");
    const cands = buildImageCandidates_(raw);
    setImgWithFallback_(img, cands);

    const openUrl = normalizeImageUrl_(raw);
    img.onclick = ()=> window.open(openUrl || raw, "_blank");

    grid.appendChild(img);
  }
}

/* ---------- contact dock ---------- */

async function copyText_(s){
  const v = text(s);
  if(!v) return;

  try{
    await navigator.clipboard.writeText(v);
    toast_("已複製");
    return;
  }catch{}

  alert(v);
}

function addBtn_(wrap, label, handler){
  const btn = document.createElement("button");
  btn.className = "dock-btn";
  btn.textContent = label;
  btn.onclick = handler;
  wrap.appendChild(btn);
}

function renderDock_(p){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML="";

  const lineOA = pickN(p, ["line官網","line_oa","LINE官方"]);
  const lineID = pickN(p, ["line","LINE","line_id"]);
  const wechat = pickN(p, ["微信","wechat","weixin"]);
  const video  = pickN(p, ["影音平台","youtube","video"]);
  const web    = pickN(p, ["官網","網站","website","url"]);
  const phone  = pickN(p, ["電話","phone","mobile"]);
  const addr   = pickN(p, ["地址","address"]);

  if(text(lineOA)){
    const href = ensureHttp_(lineOA);
    addBtn_(wrap, "LINE官網", ()=>window.open(href,"_blank"));
  }

  if(text(lineID)){
    const href = lineID.includes("http")
      ? ensureHttp_(lineID)
      : `https://line.me/R/ti/p/${encodeURIComponent(lineID)}`;
    addBtn_(wrap, "LINE", ()=>window.open(href,"_blank"));
  }

  if(text(wechat)){
    addBtn_(wrap, "微信ID", ()=>copyText_(wechat));
  }

  if(text(video)){
    const href = video.includes("http")
      ? ensureHttp_(video)
      : `https://www.google.com/search?q=${encodeURIComponent(video)}`;
    addBtn_(wrap, "影音", ()=>window.open(href,"_blank"));
  }

  if(text(web)){
    const href = ensureHttp_(web);
    addBtn_(wrap, "官網", ()=>window.open(href,"_blank"));
  }

  if(text(phone)){
    const pnum = normalizePhone_(phone);
    addBtn_(wrap, "電話", ()=>window.open(`tel:${pnum}`));
  }

  if(text(addr)){
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    addBtn_(wrap, "導航", ()=>window.open(href,"_blank"));
  }

  dock.style.display = wrap.children.length ? "" : "none";
}

/* ---------- apply data ---------- */

function applyPayload_(raw){
  const p = normalizePayload_(raw);

  setText("u-name",  pickN(p, ["姓名","name"]) || "");
  setText("u-unit",  pickN(p, ["單位","unit"]) || "");
  setText("u-title", pickN(p, ["頭銜","title"]) || "");

  renderBlock_("block-service", "服務項目", pickN(p, ["服務項目","service"]));
  renderBlock_("block-exp",     "經歷",     pickN(p, ["經歷","experience"]));

  setAvatar_(p);
  setLogo_(p);
  renderPhotos_(p);
  renderDock_(p);
}

/* ---------- loader ---------- */

async function loadCard_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;

  try{
    const data = await fetchJson_(url, CONFIG.FETCH_TIMEOUT_MS);
    if(!data || data.ok===false) throw new Error("card not found");

    __resolvedId = cid;
    applyPayload_(data);

  }catch(e){
    console.error(e);
    setText("u-name","讀取失敗");
  }
}

/* ---------- boot ---------- */

function boot_(){
  const id = getCardIdFromUrl_();
  loadCard_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });