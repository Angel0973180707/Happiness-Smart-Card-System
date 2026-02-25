/* ================================
 * Happiness Smart Card System — app.js (v399.5 COMPLETE OVERWRITE) 1/3
 * Fixes:
 * 1) Premium theme switching unstable (class fighting) ✅
 * 2) Logo / Photos not showing (payload + image loader) ✅
 * 3) Keep v382 hooks: setV382 / setV382Style / setV382Paper ✅
 * 4) Contact parsing (LINE官網/LINE/影音社群) unified (in 2/3) ✅
 * Keep:
 * - v393 dynamic-mask system (HTML/CSS)
 * - v398 blocks + dock + photo wall
 * ================================ */

const CONFIG = {
  VERSION: "399.5",
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  FORM: "https://forms.gle/6A6LoEdT7mpfPeNJ7",
  DEFAULT_ID: "TW0001",

  FETCH_TIMEOUT_MS: 12000,
  RETRY: 2,

  ADMIN_TRIPLETAP_WINDOW_MS: 650,
  ADMIN_TRIPLETAP_COUNT: 3,

  PHOTO_SLOT_MAX: 20,
  DEBUG: true
};

window.CONFIG = CONFIG; // ✅ 給 admin.html / 其他頁共用

let state = {
  mode: "free",          // free | premium
  theme: "color-1",      // free: color-1..5 / premium: p1..p7
  style: "arch",         // arch|flat|spot (free only)
  paper: "paper-1"       // paper-1.. (free only)
};

let __resolvedId = CONFIG.DEFAULT_ID;
let __payloadRaw = null;
let __payloadNorm = null;

/* --------------------------- basic helpers --------------------------- */
function $(id){ return document.getElementById(id); }
function q(sel, root=document){ return root.querySelector(sel); }
function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function text(v){ return (v==null? "" : String(v)).trim(); }

function log_(){ if(CONFIG.DEBUG) console.log("[HSC-v399.5]", ...arguments); }
function warn_(){ if(CONFIG.DEBUG) console.warn("[HSC-v399.5]", ...arguments); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function getParam(name){
  try{ return new URLSearchParams(location.search).get(name); }
  catch{ return null; }
}

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4,"0");
  if(/^TW\d{1,4}$/.test(v)){
    const n = v.replace(/^TW/,"");
    return "TW" + n.padStart(4,"0");
  }
  return v;
}

function getCardIdFromUrl_(){
  return normalizeId_(getParam("id")) || CONFIG.DEFAULT_ID;
}

/* --------------------------- fetch (robust) --------------------------- */
async function fetchWithTimeout_(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method:"GET",
      mode:"cors",
      cache:"no-store",
      credentials:"omit",
      signal: controller.signal
    });
    const body = (await res.text() || "").trim();
    if(!body) throw new Error(`Empty response (HTTP ${res.status})`);
    try{ return JSON.parse(body); }
    catch{
      const m = body.match(/\{[\s\S]*\}/);
      if(m) return JSON.parse(m[0]);
      throw new Error("Not JSON");
    }
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url){
  let lastErr = null;
  for(let i=0;i<=CONFIG.RETRY;i++){
    try{ return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS); }
    catch(e){
      lastErr = e;
      warn_("fetch retry", i, e && e.message ? e.message : e);
      await sleep(520 + i*520);
    }
  }
  throw lastErr || new Error("Fetch failed");
}

/* --------------------------- normalize + pick --------------------------- */
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
    const lk = nk.toLowerCase();
    if(lower[lk]==null || text(lower[lk])==="") lower[lk]=v;
  }

  out.__lower = lower;
  return out;
}

function pick(obj, keys){
  if(!obj) return "";
  const lower = obj.__lower || null;
  const raw = obj.__raw || null;

  for(const k of keys){
    if(k==null) continue;
    const kk = cleanKey_(k);

    const v1 = obj[kk];
    if(v1!=null && text(v1)!=="") return v1;

    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2!=null && text(v2)!=="") return v2;
    }
  }

  if(raw){
    for(const k of keys){
      const v = raw[k];
      if(v!=null && text(v)!=="") return v;
    }
  }
  return "";
}

/* --------------------------- apply body classes (single source of truth) --------------------------- */
function applyBodyClasses_(){
  const isFree = state.mode === "free";
  const cls = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ].filter(Boolean).join(" ");

  // ✅ 只在 class 真的不同時才寫入，避免「亂跳」
  if(document.body.className !== cls) document.body.className = cls;

  // 控制自由款 controls 是否顯示
  const freeControls = $("free-controls");
  if(freeControls) freeControls.style.display = isFree ? "block" : "none";

  // dots row 顯示切換
  const rows = qa(".dots-row");
  let freeRow=null, premiumRow=null;
  for(const r of rows){
    if(!freeRow && r.querySelector(".dot")) freeRow=r;
    if(!premiumRow && r.querySelector(".p-dot")) premiumRow=r;
  }
  if(freeRow) freeRow.style.display = isFree ? "flex" : "none";
  if(premiumRow) premiumRow.style.display = isFree ? "none" : "flex";

  // active 標記
  qa(".dot, .p-dot").forEach(d=>d.classList.remove("active"));
  const activeSel = isFree ? `.dot[data-theme="${state.theme}"]` : `.p-dot[data-theme="${state.theme}"]`;
  const active = q(activeSel);
  if(active) active.classList.add("active");

  // 方案按鈕 active
  const a = $("btnPlanFree");
  const b = $("btnPlanPremium");
  if(a && b){
    if(isFree){ a.classList.add("active"); b.classList.remove("active"); }
    else { b.classList.add("active"); a.classList.remove("active"); }
  }
}

/* --------------------------- keep v382 hooks (call into our single truth) --------------------------- */
window.setV382 = function(mode, theme, el){
  state.mode = mode === "premium" ? "premium" : "free";
  state.theme = text(theme) || (state.mode==="free" ? "color-1" : "p1");
  applyBodyClasses_();
};

window.setV382Style = function(style, el){
  state.style = text(style) || "arch";
  applyBodyClasses_();
};

window.setV382Paper = function(paper, el){
  state.paper = text(paper) || "paper-1";
  applyBodyClasses_();
};/* ================================
 * app.js (v399.5) 2/3
 * - Images must show: avatar / logo / photo wall (fallback candidates)
 * - Contact dock MUST show:
 *   LINE官網 / LINE / 微信(複製ID) / 電話 / Email / 影音社群 / 導航
 * - Blocks (服務/經歷)
 * ================================ */

/* --------------------------- images helpers --------------------------- */
function normalizeImageUrl_(raw){
  if(!raw) return "";
  let url = String(raw).trim();
  if(!url) return "";
  if(url.startsWith("http://")) url = "https://" + url.slice(7);

  // Dropbox
  if(url.includes("dropbox.com")){
    url = url.replace("dl=0", "raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }

  // Google Drive patterns
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

  // Drive id
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
      imgEl.style.opacity = "0";
      imgEl.removeAttribute("src");
      return;
    }
    const u = list[idx++];
    const sep = u.includes("?") ? "&" : "?";
    imgEl.src = u + sep + "t=" + Date.now();
  };

  imgEl.onload = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    requestAnimationFrame(()=> imgEl.style.opacity="1");
  };
  imgEl.onerror = ()=>{
    if(imgEl.dataset.loadToken !== token) return;
    tryNext();
  };

  imgEl.style.opacity="0";
  imgEl.style.transition="opacity 420ms ease";
  tryNext();
}

/* --------------------------- avatar / logo --------------------------- */
function getAvatarUrl_(p){
  return pick(p, [
    "個人照_fast","個人照","形象照_fast","形象照",
    "avatar_fast","avatar","photo_fast","photo",
    "image_fast","image"
  ]);
}

function setAvatar_(p){
  const img = $("u-img");
  if(!img) return;
  const raw = getAvatarUrl_(p);
  const cands = buildImageCandidates_(raw);
  if(!cands.length){ img.removeAttribute("src"); return; }
  setImgWithFallback_(img, cands);
}

function getLogoUrl_(p){
  return pick(p, [
    "logo_fast","logo",
    "品牌logo_fast","品牌logo",
    "品牌Logo_fast","品牌Logo",
    "公司logo_fast","公司logo",
    "公司Logo_fast","公司Logo",
    "LOGO_fast","LOGO",
    "商標_fast","商標",
    "mark_fast","mark"
  ]);
}

function setLogo_(p){
  const wrap = $("logoWrap");
  const img = $("u-logo");
  if(!wrap || !img) return;

  const raw = getLogoUrl_(p);
  const cands = buildImageCandidates_(raw);
  if(!cands.length){
    wrap.style.display = "none";
    img.removeAttribute("src");
    return;
  }
  wrap.style.display = "";
  setImgWithFallback_(img, cands);
}

/* --------------------------- photo wall --------------------------- */
function splitList_(raw){
  const s = text(raw);
  if(!s) return [];
  return s
    .replace(/\r\n/g,"\n")
    .replace(/[，,]+/g,"\n")
    .split("\n")
    .map(x=>x.trim())
    .filter(Boolean);
}

function collectPhotoUrls_(p){
  const urls = [];
  const main = pick(p, ["照片_fast","照片","照片牆","相片牆","相簿","圖片","images","photos"]);
  urls.push(...splitList_(main));

  for(let i=1;i<=CONFIG.PHOTO_SLOT_MAX;i++){
    urls.push(...splitList_(p[`照片${i}`]));
    urls.push(...splitList_(p[`圖片${i}`]));
    urls.push(...splitList_(p[`photo${i}`]));
    urls.push(...splitList_(p[`image${i}`]));
  }

  const out = [];
  const seen = new Set();
  for(const raw of urls){
    const u = normalizeImageUrl_(raw);
    const key = (u||raw).toLowerCase();
    if(!key) continue;
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

function renderPhotoWall_(p){
  const wall = $("photoWall");
  const grid = $("photoGrid");
  if(!wall || !grid) return;

  grid.innerHTML = "";
  const list = collectPhotoUrls_(p);

  if(!list.length){
    wall.style.display = "none";
    return;
  }
  wall.style.display = "";

  for(const raw of list){
    const img = document.createElement("img");
    img.alt = "照片";
    setImgWithFallback_(img, buildImageCandidates_(raw));
    const openUrl = normalizeImageUrl_(raw) || raw;
    img.onclick = ()=> window.open(openUrl, "_blank");
    grid.appendChild(img);
  }
}

/* --------------------------- blocks (service/exp) --------------------------- */
function escapeHtml_(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function renderBlock_(rootId, title, body){
  const root = $(rootId);
  if(!root) return;
  const b = text(body);
  if(!b){
    root.innerHTML = "";
    root.style.display = "none";
    return;
  }
  root.style.display = "";
  root.innerHTML = `
    <div class="block-title">${title}</div>
    <div class="block-body preline">${escapeHtml_(b)}</div>
  `;
}

/* --------------------------- toast + clipboard --------------------------- */
function toast_(msg){
  const m = text(msg);
  if(!m) return;
  let t = $("__toast");
  if(!t){
    t = document.createElement("div");
    t.id="__toast";
    t.style.position="fixed";
    t.style.left="50%";
    t.style.bottom="18px";
    t.style.transform="translateX(-50%)";
    t.style.background="rgba(0,0,0,0.78)";
    t.style.color="#fff";
    t.style.padding="10px 14px";
    t.style.borderRadius="999px";
    t.style.fontSize="13px";
    t.style.fontWeight="800";
    t.style.zIndex="99999";
    t.style.opacity="0";
    t.style.transition="opacity 180ms ease";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.style.opacity="1";
  clearTimeout(toast_._timer);
  toast_._timer = setTimeout(()=>{ t.style.opacity="0"; }, 1100);
}

async function copyText_(s){
  const v = text(s);
  if(!v) return false;
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(v);
      return true;
    }
  }catch{}
  try{
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.setAttribute("readonly","readonly");
    ta.style.position="fixed";
    ta.style.left="-9999px";
    ta.style.top="0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  }catch{}
  return false;
}

/* --------------------------- url helpers --------------------------- */
function normalizePhone_(s){
  const v = text(s);
  if(!v) return "";
  return v.replace(/[^\d+]/g, "");
}
function ensureHttp_(u){
  let v = text(u);
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith("www.")) return "https://" + v;
  return v;
}

/* --------------------------- social/video helpers --------------------------- */
function guessLabelByUrl_(u){
  const v = String(u||"").toLowerCase();
  if(v.includes("youtube.com") || v.includes("youtu.be")) return "YouTube";
  if(v.includes("instagram.com")) return "IG";
  if(v.includes("facebook.com") || v.includes("fb.com")) return "FB";
  if(v.includes("tiktok.com")) return "TikTok";
  if(v.includes("bilibili.com")) return "Bilibili";
  return "影音/社群";
}
function guessIconByUrl_(u){
  const v = String(u||"").toLowerCase();
  if(v.includes("youtube.com") || v.includes("youtu.be")) return "fa-brands fa-youtube";
  if(v.includes("instagram.com")) return "fa-brands fa-instagram";
  if(v.includes("facebook.com") || v.includes("fb.com")) return "fa-brands fa-facebook";
  if(v.includes("tiktok.com")) return "fa-brands fa-tiktok";
  if(v.includes("bilibili.com")) return "fa-brands fa-bilibili";
  return "fa-solid fa-circle-play";
}

/* --------------------------- contact dock (ORDERED) --------------------------- */
function addDockBtn_(wrap, label, href, iconClass, onClickOverride){
  if(!wrap) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dock-btn";
  btn.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  btn.onclick = onClickOverride ? onClickOverride : ()=> window.open(href, "_blank");
  wrap.appendChild(btn);
}

async function copyWeChatId_(wxId){
  const ok = await copyText_(wxId);
  toast_(ok ? "已複製微信ID" : "無法自動複製，請手動複製");
  if(!ok) alert(wxId);
}

function renderContactDock_(p){
  const wrap = $("contactButtons");
  const dock = $("contactDock");
  if(!wrap || !dock) return;

  wrap.innerHTML = "";

  // ✅ 主欄位（你指定的）
  const lineOfficial = pick(p, [
    "line官網","line官網預約","line官方網站","line官方帳號網址",
    "line_oa_url","lineoa_url","line_oa","line_oa_link","LINE_OA_URL","LINE_OA"
  ]);
  const lineIdOrUrl  = pick(p, ["line","line_id","Line","LINE","line_id_or_url","line網址","line連結"]);
  const wechat       = pick(p, ["wechat","weixin","微信","微信號","weixin_id","wx","wxid"]);
  const phone        = pick(p, ["電話","手機","phone","mobile","tel"]);
  const email        = pick(p, ["Email","email","電子郵件","信箱","mail"]);
  const addr         = pick(p, ["地址","address","所在地","location"]);

  // ✅ 影音/社群/個人網頁：多欄位 + 多連結（一定吃得到）
  const socialRaw = []
    .concat(splitList_(pick(p, ["影音平台","影音連結","video","video_url","影片","video_link"])))
    .concat(splitList_(pick(p, ["YouTube","youtube","yt","頻道","channel"])))
    .concat(splitList_(pick(p, ["IG","ig","Instagram","instagram"])))
    .concat(splitList_(pick(p, ["FB","fb","Facebook","facebook"])))
    .concat(splitList_(pick(p, ["TikTok","tiktok","抖音","douyin"])))
    .concat(splitList_(pick(p, ["bilibili","B站","哔哩哔哩"])))
    .concat(splitList_(pick(p, ["網站","官網","website","url","link","個人網頁","homepage"])));

  const seen = new Set();
  const socialLinks = [];
  for(const item of socialRaw){
    const u = ensureHttp_(item);
    if(!u) continue;
    const key = u.toLowerCase();
    if(seen.has(key)) continue;
    seen.add(key);
    socialLinks.push(u);
  }

  // 1) LINE官網
  const lo = text(lineOfficial);
  if(lo){
    let href = "";
    if(/https?:\/\//i.test(lo) || lo.startsWith("www.")) href = ensureHttp_(lo);
    else href = `https://line.me/R/ti/p/${encodeURIComponent(lo)}`;
    addDockBtn_(wrap, "LINE官網", href, "fa-solid fa-globe");
  }

  // 2) LINE
  const lv = text(lineIdOrUrl);
  if(lv){
    let href = "";
    if(/https?:\/\//i.test(lv) || lv.startsWith("www.")) href = ensureHttp_(lv);
    else href = `https://line.me/R/ti/p/${encodeURIComponent(lv)}`;
    addDockBtn_(wrap, "LINE", href, "fa-brands fa-line");
  }

  // 3) 微信：複製ID
  const wx = text(wechat);
  if(wx){
    addDockBtn_(wrap, "微信ID", "", "fa-brands fa-weixin", ()=>copyWeChatId_(wx));
  }

  // 4) 電話
  const ph = normalizePhone_(phone);
  if(ph){
    addDockBtn_(wrap, "電話", `tel:${ph}`, "fa-solid fa-phone");
  }

  // 5) Email
  const em = text(email);
  if(em){
    addDockBtn_(wrap, "Email", `mailto:${em}`, "fa-solid fa-envelope");
  }

  // 6) 影音/社群（多顆，放在導航前）
  for(const u of socialLinks){
    addDockBtn_(wrap, guessLabelByUrl_(u), u, guessIconByUrl_(u));
  }

  // 7) 導航（最後）
  const a = text(addr);
  if(a){
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
    addDockBtn_(wrap, "導航", href, "fa-solid fa-location-dot");
  }

  dock.style.display = wrap.children.length ? "" : "none";
}/* ================================
 * app.js (v399.5) 3/3
 * - Apply data to card (name/unit/title/service/exp/slogan)
 * - Fix: premium/free dots click binding (NO class fighting)
 * - Hidden admin hotspot (triple tap top)
 * - window.copyCardUrl()
 * - Boot
 * ================================ */

function setText_(id, v){
  const el = $(id);
  if(!el) return;
  el.textContent = text(v);
}

function setLoadingUi_(){
  setText_("u-name", "載入中...");
  setText_("u-unit", "同步中...");
  setText_("u-title", "");

  const sl = $("u-slogan");
  if(sl){ sl.style.display="none"; sl.textContent=""; }

  const dock = $("contactDock");
  if(dock) dock.style.display="none";

  const wall = $("photoWall");
  if(wall) wall.style.display="none";

  const logo = $("logoWrap");
  if(logo) logo.style.display="none";
}

function setFailUi_(msg){
  setText_("u-name", "（同步失敗）");
  setText_("u-unit", msg || "請確認 id 或 GAS 權限");
  setText_("u-title", "");

  const dock = $("contactDock");
  if(dock) dock.style.display="none";
  const wall = $("photoWall");
  if(wall) wall.style.display="none";
  const logo = $("logoWrap");
  if(logo) logo.style.display="none";
}

/* --------------------------- premium name left alignment hook --------------------------- */
function applyPremiumNameLayoutHook_(){
  // ✅ 讓 CSS 可以用 .premium-name-left 做動態平衡（你要的：姓名移左邊、和 logo 平衡）
  // 這裡只負責加 class，不動樣貌；你要怎麼排，交給 style.css 的 premium header 規則
  if(state.mode === "premium") document.body.classList.add("premium-name-left");
  else document.body.classList.remove("premium-name-left");
}

/* --------------------------- apply data --------------------------- */
function applyDataToCard_(p){
  const name    = pick(p, ["姓名","name","Name"]);
  const unit    = pick(p, ["單位","unit","Unit"]);
  const title   = pick(p, ["頭銜","職稱","title","Title"]);
  const slogan  = pick(p, ["理念","標語","slogan","Slogan"]);
  const service = pick(p, ["服務項目","經營項目","service","Service"]);
  const exp     = pick(p, ["經歷","experience","Experience","簡歷","履歷"]);

  setText_("u-name",  name || "（尚未讀到姓名）");
  setText_("u-unit",  unit || "");
  setText_("u-title", title || "");

  const sl = $("u-slogan");
  if(sl){
    const s = text(slogan);
    if(s){ sl.style.display=""; sl.textContent=s; }
    else { sl.style.display="none"; sl.textContent=""; }
  }

  renderBlock_("block-service", "服務項目", service);
  renderBlock_("block-exp", "經歷", exp);

  // ✅ images must show
  setAvatar_(p);
  setLogo_(p);
  renderPhotoWall_(p);

  // ✅ contact must show (ordered)
  renderContactDock_(p);

  // ✅ premium hook
  applyPremiumNameLayoutHook_();
}

/* --------------------------- load card --------------------------- */
async function loadCardById_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  __resolvedId = cid;

  setLoadingUi_();

  try{
    const data = await fetchJsonRobust_(url);
    if(!data || typeof data !== "object") throw new Error("Invalid payload");
    if(data.ok === false) throw new Error(data.error || "Not found");

    __payloadRaw = data;
    __payloadNorm = buildNormalizedPayload_(data);

    applyDataToCard_(__payloadNorm);

    try{
      const u = new URL(location.href);
      u.searchParams.set("id", cid);
      history.replaceState({}, "", u.toString());
    }catch{}

    return cid;
  }catch(e){
    console.error(e);
    setFailUi_(e && e.message ? e.message : "同步失敗");
    return "";
  }
}

/* --------------------------- dots click binding (stable) --------------------------- */
function bindDots_(){
  // free dots
  qa(".dot").forEach(dot=>{
    dot.addEventListener("click", ()=>{
      const th = dot.dataset.theme || "";
      state.mode = "free";
      state.theme = th || state.theme || "color-1";
      applyBodyClasses_();
      applyPremiumNameLayoutHook_();
    }, { passive:true });
  });

  // premium dots
  qa(".p-dot").forEach(dot=>{
    dot.addEventListener("click", ()=>{
      const th = dot.dataset.theme || "";
      state.mode = "premium";
      state.theme = th || state.theme || "p1";
      applyBodyClasses_();
      applyPremiumNameLayoutHook_();
    }, { passive:true });
  });
}

/* --------------------------- share url API --------------------------- */
window.copyCardUrl = async function(){
  const id = __resolvedId || getCardIdFromUrl_() || CONFIG.DEFAULT_ID;
  let url = "";
  try{
    const u = new URL(location.href);
    u.searchParams.set("id", id);
    url = u.toString();
  }catch{
    url = `${location.origin}${location.pathname}?id=${encodeURIComponent(id)}`;
  }
  const ok = await copyText_(url);
  toast_(ok ? "已複製名片連結" : "無法自動複製，請手動複製");
  if(!ok) alert(url);
  return ok;
};

/* --------------------------- hidden admin (top triple tap) --------------------------- */
function openAdmin_(){
  const id = __resolvedId || CONFIG.DEFAULT_ID;
  window.open(`admin.html?id=${encodeURIComponent(id)}`, "_blank");
}

function ensureAdminHotspotTop_(){
  // ✅ 你 style.css 裡有 #adminHotspotTop 也行；這裡保底「沒有就自動補」
  let hs = $("adminHotspotTop");
  if(!hs){
    hs = document.createElement("div");
    hs.id = "adminHotspotTop";
    hs.style.position="fixed";
    hs.style.top="0";
    hs.style.left="0";
    hs.style.width="100%";
    hs.style.height="44px";
    hs.style.opacity="0";
    hs.style.zIndex="99999";
    hs.style.background="transparent";
    hs.style.pointerEvents="auto";
    document.body.appendChild(hs);
  }

  let taps = 0;
  let timer = null;

  hs.addEventListener("click", ()=>{
    taps++;
    clearTimeout(timer);
    timer = setTimeout(()=>{ taps=0; }, CONFIG.ADMIN_TRIPLETAP_WINDOW_MS);

    if(taps >= CONFIG.ADMIN_TRIPLETAP_COUNT){
      taps=0;
      openAdmin_();
    }
  });
}

/* --------------------------- boot --------------------------- */
function boot_(){
  applyBodyClasses_();         // init classes once
  applyPremiumNameLayoutHook_();
  ensureAdminHotspotTop_();    // top invisible triple tap
  bindDots_();                 // fix premium dots unstable

  const id = getCardIdFromUrl_();
  loadCardById_(id);
}

document.addEventListener("DOMContentLoaded", boot_, { once:true });