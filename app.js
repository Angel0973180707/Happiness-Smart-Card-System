/* app.js (V385.3 complete overwrite) */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  ADMIN_PASS: "angel", // ⑤ 你要的密碼：可改成你自己的
  OG_IMAGE: "og-card.png", // ⑤ 已上傳 GitHub 的 OG 圖檔
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let currentRow = null;
let galleryUrls = [];
let galleryIndex = 0;

// ---------- helpers ----------
const byId = (id) => document.getElementById(id);
const safeText = (el, v) => { if(el) el.innerText = (v ?? "").toString(); };

function getIdFromUrl() {
  try {
    const u = new URL(location.href);
    return (u.searchParams.get("id") || CONFIG.DEFAULT_ID).trim();
  } catch (e) {
    return CONFIG.DEFAULT_ID;
  }
}

function stripZeroWidth(s){ return String(s||"").replace(/[\u200B-\u200D\uFEFF]/g, ""); }
function normKey(s){
  let t = stripZeroWidth(s);
  t = t.replace(/"/g, "");
  t = t.replace(/\r?\n/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}
function buildRowIndex(rowObj){
  const idx = new Map();
  Object.keys(rowObj||{}).forEach(k=>{
    const nk = normKey(k);
    if(!idx.has(nk)) idx.set(nk, rowObj[k]);
  });
  return idx;
}
function findByIncludes(indexMap, patterns){
  if(!indexMap || !(indexMap instanceof Map)) return "";
  const keys = Array.from(indexMap.keys());
  for(const p of patterns){
    const np = normKey(p);
    for(const k of keys){
      if(k.includes(np)){
        const v = indexMap.get(k);
        if(v !== null && v !== undefined && String(v).trim() !== "") return v;
      }
    }
  }
  return "";
}
function rowToObject(row, headers){
  if(!row) return null;
  if(typeof row === "object" && !Array.isArray(row)) return row;
  if(Array.isArray(row) && Array.isArray(headers) && headers.length){
    const obj = {};
    headers.forEach((h,i)=> obj[String(h)] = row[i]);
    return obj;
  }
  return null;
}

// ---------- Drive image ----------
function extractDriveId(url){
  const s = String(url||"").trim();
  if(!s) return "";
  const m1 = s.match(/[?&]id=([^&]+)/i);
  const m2 = s.match(/\/d\/([^/]+)/i);
  const m3 = s.match(/\/file\/d\/([^/]+)/i);
  if(m1) return m1[1];
  if(m3) return m3[1];
  if(m2) return m2[1];
  return "";
}
function driveCandidates(url){
  const raw = String(url||"").trim();
  const id = extractDriveId(raw);
  if(!id) return [raw];
  return [
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
    `https://lh3.googleusercontent.com/d/${id}`,
    raw
  ];
}
function setImgWithFallback(imgEl, url){
  if(!imgEl) return;
  const candidates = driveCandidates(url);
  let i=0;
  const tryNext = ()=>{
    if(i>=candidates.length) return;
    imgEl.src = candidates[i++];
  };
  imgEl.onerror = ()=> tryNext();
  tryNext();
}

// ---------- plan & theme ----------
window.setPlan = function(plan){
  if(plan === "premium"){
    state.mode = "premium";
    if(!/^p\d$/.test(state.theme)) state.theme = "p1";
  } else {
    state.mode = "free";
    if(!/^color-\d$/.test(state.theme)) state.theme = "color-1";
  }

  byId("btn-plan-free")?.classList.toggle("active", state.mode==="free");
  byId("btn-plan-premium")?.classList.toggle("active", state.mode==="premium");

  applyV382();
};

window.setV382 = function(mode, theme, el){
  state.mode = mode;
  state.theme = theme;

  document.querySelectorAll(".dot, .p-dot").forEach(d=>d.classList.remove("active"));
  if(el) el.classList.add("active");

  byId("btn-plan-free")?.classList.toggle("active", state.mode==="free");
  byId("btn-plan-premium")?.classList.toggle("active", state.mode==="premium");

  applyV382();
};

window.setV382Style = function(style, el){
  state.style = style;
  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

window.setV382Paper = function(paper, el){
  state.paper = paper;
  if(el && el.parentElement){
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

function applyV382(){
  const isFree = state.mode === "free";
  const freeControls = byId("free-controls");
  if(freeControls) freeControls.style.display = isFree ? "block" : "none";

  const classes = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ].filter(Boolean).join(" ");

  document.body.className = classes;
}

window.goFillForm = ()=> window.open(CONFIG.FORM, "_blank");

// ---------- render ----------
function setMultiline(el, text){
  if(!el) return;
  const s = String(text||"").trim();
  const html = s
    .split(/\r?\n/g)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `• ${escapeHtml(line)}`)
    .join("<br/>");
  el.innerHTML = html || "";
}

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function renderQA(idx){
  const q1 = findByIncludes(idx, ["客戶常見提問 1", "Q1"]);
  const a1 = findByIncludes(idx, ["專業解答 1", "A1"]);
  const q2 = findByIncludes(idx, ["客戶常見提問 2", "Q2"]);
  const a2 = findByIncludes(idx, ["專業解答2", "專業解答 2", "A2"]);

  const box = byId("qa-box");
  if(!box) return;

  const items = [];
  if(q1 || a1){
    items.push(`<div class="qa"><div class="qa-q">Q：${escapeHtml(q1||"")}</div><div class="qa-a">${escapeHtml(a1||"")}</div></div>`);
  }
  if(q2 || a2){
    items.push(`<div class="qa"><div class="qa-q">Q：${escapeHtml(q2||"")}</div><div class="qa-a">${escapeHtml(a2||"")}</div></div>`);
  }
  box.innerHTML = items.join("") || `<div class="qa"><div class="qa-q">（尚未填寫）</div><div class="qa-a">你可以在表單中補上 Q&A。</div></div>`;
}

function renderLinks(idx){
  const lineRaw = findByIncludes(idx, ["私訊 LINE 連結"]);
  let lineLink = "", lineName = "";
  if(lineRaw){
    const parts = String(lineRaw).split(/\r?\n/g).map(s=>s.trim()).filter(Boolean);
    lineLink = parts[0] || "";
    lineName = parts[1] || "";
  }

  const lineOA = findByIncludes(idx, ["LINE 官方帳號連結"]);
  const email = findByIncludes(idx, ["一鍵聯繫 Email", "Email"]);
  const tel = findByIncludes(idx, ["一鍵聯繫電話", "電話"]);
  const wechat = findByIncludes(idx, ["微信 ID"]);
  const addrOrMap = findByIncludes(idx, ["影音平台 3（或地址）", "地址", "地圖"]);

  const btnLineOA = byId("btn-lineoa");
  if(btnLineOA){
    btnLineOA.onclick = ()=>{
      if(lineOA) window.open(lineOA, "_blank");
      else alert("尚未填寫 LINE 官方帳號連結");
    };
  }

  const btnLine = byId("btn-line");
  if(btnLine){
    btnLine.onclick = ()=>{
      if(lineLink) window.open(lineLink, "_blank");
      else alert("尚未填寫 私訊 LINE 連結");
    };
  }

  const btnWechat = byId("btn-wechat");
  if(btnWechat){
    btnWechat.onclick = async ()=>{
      if(!wechat){ alert("尚未填寫 微信ID"); return; }
      try{
        await navigator.clipboard.writeText(String(wechat).trim());
        alert(`已複製微信ID：${String(wechat).trim()}`);
      }catch(e){
        alert(`微信ID：${String(wechat).trim()}`);
      }
    };
  }

  const btnEmail = byId("btn-email");
  if(btnEmail){
    btnEmail.onclick = ()=>{
      if(!email){ alert("尚未填寫 Email"); return; }
      location.href = `mailto:${String(email).trim()}`;
    };
  }

  const btnTel = byId("btn-tel");
  if(btnTel){
    btnTel.onclick = ()=>{
      if(!tel){ alert("尚未填寫電話"); return; }
      location.href = `tel:${String(tel).trim()}`;
    };
  }

  // ⑧ 地圖：改「導航」模式（目的地）
  const btnMap = byId("btn-map");
  if(btnMap){
    btnMap.onclick = ()=>{
      if(!addrOrMap){ alert("尚未填寫地址/地圖"); return; }
      const s = String(addrOrMap).trim();
      if(/^https?:\/\//i.test(s)) window.open(s, "_blank");
      else window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s)}`, "_blank");
    };
  }
}

// ---------- gallery (max 10) ----------
function parseGalleryUrls(idx){
  const raw = findByIncludes(idx, ["產品或品牌或活動照片最多3張", "產品或品牌或活動照片", "產品照片", "活動照片"]);
  const urls = [];
  if(raw){
    String(raw).split(/\r?\n/g).map(s=>s.trim()).filter(Boolean).forEach(u=>urls.push(u));
  }

  for(let i=1;i<=10;i++){
    const u = findByIncludes(idx, [`產品照片${i}`, `活動照片${i}`, `品牌照片${i}`]);
    if(u) urls.push(String(u).trim());
  }

  const uniq = [];
  for(const u of urls){
    if(u && !uniq.includes(u)) uniq.push(u);
  }
  return uniq.slice(0,10);
}

function renderGallery(urls){
  galleryUrls = urls || [];
  galleryIndex = 0;

  const track = byId("g-track");
  const dots = byId("g-dots");
  if(!track || !dots) return;

  track.innerHTML = "";
  dots.innerHTML = "";

  const buildDots = (n)=>{
    dots.innerHTML = "";
    for(let i=0;i<n;i++){
      const d = document.createElement("div");
      d.className = "g-dot" + (i===0 ? " active" : "");
      d.onclick = ()=> scrollToGallery(i);
      dots.appendChild(d);
    }
  };

  // ⑨ 沒照片 → 10 張動態佔位，畫面平衡、不黑框
  if(!galleryUrls.length){
    const n = 10;
    for(let i=0;i<n;i++){
      const item = document.createElement("div");
      item.className = "g-item";
      const ph = document.createElement("div");
      ph.className = "g-placeholder";
      item.appendChild(ph);
      track.appendChild(item);
    }
    buildDots(n);

    // 不讓左右箭頭亂跳
    byId("g-prev").onclick = ()=> scrollToGallery(Math.max(0, galleryIndex-1));
    byId("g-next").onclick = ()=> scrollToGallery(Math.min(n-1, galleryIndex+1));

    track.addEventListener("scroll", ()=>{
      const w = track.clientWidth;
      const idx = Math.round(track.scrollLeft / w);
      setGalleryActive(idx);
    });

    return;
  }

  galleryUrls.forEach((u, i)=>{
    const item = document.createElement("div");
    item.className = "g-item";
    const img = document.createElement("img");
    img.alt = `photo-${i+1}`;
    img.loading = "lazy";
    img.onclick = ()=> openLightbox(i);
    setImgWithFallback(img, u);
    item.appendChild(img);
    track.appendChild(item);
  });

  buildDots(galleryUrls.length);

  track.addEventListener("scroll", ()=>{
    const w = track.clientWidth;
    const idx = Math.round(track.scrollLeft / w);
    setGalleryActive(idx);
  });

  byId("g-prev").onclick = ()=> scrollToGallery(Math.max(0, galleryIndex-1));
  byId("g-next").onclick = ()=> scrollToGallery(Math.min(galleryUrls.length-1, galleryIndex+1));
}

function scrollToGallery(i){
  const track = byId("g-track");
  if(!track) return;
  const w = track.clientWidth || 1;
  track.scrollTo({ left: w*i, behavior:"smooth" });
  setGalleryActive(i);
}

function setGalleryActive(i){
  galleryIndex = i;
  const dots = byId("g-dots");
  if(!dots) return;
  dots.querySelectorAll(".g-dot").forEach((d, idx)=> d.classList.toggle("active", idx===i));
}

// ---------- lightbox ----------
function openLightbox(i){
  if(!galleryUrls.length) return;
  galleryIndex = i;
  const lb = byId("lightbox");
  const img = byId("lb-img");
  const title = byId("lb-title");
  if(!lb || !img) return;

  title && (title.innerText = `第 ${i+1} 張 / 共 ${galleryUrls.length} 張`);
  setImgWithFallback(img, galleryUrls[i]);
  lb.classList.add("show");

  byId("lb-open").onclick = ()=> window.open(galleryUrls[galleryIndex], "_blank");
}
function closeLightbox(){
  byId("lightbox")?.classList.remove("show");
}
function stepLightbox(dir){
  if(!galleryUrls.length) return;
  galleryIndex = (galleryIndex + dir + galleryUrls.length) % galleryUrls.length;
  openLightbox(galleryIndex);
}

// ---------- admin hidden backend ----------
let tapCount = 0;
let tapTimer = null;

function bindHiddenAdmin(){
  // ⑤ 改：版權處點 3 下 → 輸密碼 → 開後台
  const entry = byId("adminEntry");
  if(entry){
    entry.addEventListener("click", ()=>{
      tapCount++;
      if(tapTimer) clearTimeout(tapTimer);
      tapTimer = setTimeout(()=> tapCount=0, 800);

      if(tapCount >= 3){
        tapCount = 0;
        const p = prompt("輸入後臺密碼");
        if(p === null) return;
        if(String(p).trim() !== CONFIG.ADMIN_PASS){
          noteAdmin("密碼錯誤。");
          return;
        }
        openAdmin();
      }
    });
  }

  byId("adminClose").onclick = closeAdmin;
  byId("adminBack").onclick = closeAdmin;

  byId("adminModal").addEventListener("click", (e)=>{
    if(e.target && e.target.id === "adminModal") closeAdmin();
  });

  byId("adminPreset").onclick = ()=>{
    byId("adminIdInput").value = CONFIG.DEFAULT_ID;
  };

  byId("adminOpen").onclick = ()=>{
    const id = (byId("adminIdInput").value || "").trim() || CONFIG.DEFAULT_ID;
    location.href = withIdParam(id);
  };

  // ⑦（後台也放）複製名片分享連結
  byId("adminCopyShare").onclick = async ()=>{
    const id = (byId("adminIdInput").value || "").trim() || getIdFromUrl();
    const url = withIdParam(id);
    await copyToClipboard(url, "已複製名片連結");
  };

  // ⑤ 一鍵複製交貨（OG 圖連結）
  byId("adminCopyDeliver").onclick = async ()=>{
    const og = buildOgImageUrl();
    await copyToClipboard(og, "已複製交貨（OG 圖連結）");
  };

  byId("adminCopyId").onclick = async ()=>{
    const id = (byId("adminIdInput").value || "").trim() || getIdFromUrl();
    await copyToClipboard(id, "已複製ID");
  };

  byId("adminCopyToken").onclick = async ()=>{
    const id = (byId("adminIdInput").value || "").trim() || getIdFromUrl();
    const token = await getTokenByIdFromListAPI(id);
    if(!token){
      noteAdmin("該序號沒有 token（或尚未填寫 token 欄位）。");
      return;
    }
    await copyToClipboard(token, "已複製 Token");
  };
}

function openAdmin(){
  byId("adminModal")?.classList.add("show");
  byId("adminIdInput").value = getIdFromUrl();
  byId("adminNameInput").value = ""; // 只是給你交貨備註用
  noteAdmin("已進入後臺：可複製分享連結 / OG 圖交貨連結。");
}
function closeAdmin(){
  byId("adminModal")?.classList.remove("show");
}
function noteAdmin(msg){
  const el = byId("adminNote");
  if(el) el.innerText = msg || "";
}

function withIdParam(id){
  const u = new URL(location.href);
  u.searchParams.set("id", id);
  return u.toString();
}

function buildBaseDirUrl(){
  const u = new URL(location.href);
  u.hash = "";
  u.search = "";
  // ensure directory
  const path = u.pathname;
  if(path.endsWith("/")) return u.toString();
  const parts = path.split("/");
  parts.pop(); // remove file name
  u.pathname = parts.join("/") + "/";
  return u.toString();
}

function buildOgImageUrl(){
  return buildBaseDirUrl() + CONFIG.OG_IMAGE;
}

async function copyToClipboard(text, okMsg){
  try{
    await navigator.clipboard.writeText(text);
    noteAdmin(okMsg || "已複製");
  }catch(e){
    alert(text);
  }
}

// ---------- data load ----------
async function loadCardDataFromListAPI(){
  const id = getIdFromUrl();

  safeText(byId("u-name"), "載入中...");
  safeText(byId("u-unit"), "同步中...");

  try{
    const res = await fetch(`${CONFIG.GAS}?action=list`, { cache:"no-store" });
    const json = await res.json();
    if(!json || json.ok !== true){
      safeText(byId("u-name"), "雲端同步失敗");
      safeText(byId("u-unit"), "請確認 GAS 回傳");
      return;
    }

    const headers = Array.isArray(json.headers) ? json.headers : [];
    const rows = Array.isArray(json.rows) ? json.rows : [];

    let rowObj = null;
    for(const r of rows){
      const obj = rowToObject(r, headers);
      if(!obj) continue;
      const rid = String(obj.id || obj.ID || obj["id"] || obj["ID"] || "").trim();
      if(rid === id){ rowObj = obj; break; }
    }

    if(!rowObj){
      safeText(byId("u-name"), "找不到此序號");
      safeText(byId("u-unit"), id);
      safeText(byId("u-service"), "請確認該列是否有填入 id（例如 TW0001）。");
      return;
    }

    currentRow = rowObj;
    const idx = buildRowIndex(rowObj);

    const name = findByIncludes(idx, ["姓名（名片大標題）", "姓名"]);
    const unit = findByIncludes(idx, ["單位名稱", "單位"]);
    const slogan = findByIncludes(idx, ["理念標語", "標語"]);
    const service = findByIncludes(idx, ["服務項目", "核心業務"]);
    const titles = findByIncludes(idx, ["重要頭銜/獎銜", "獎銜", "頭銜"]);
    const avatar = findByIncludes(idx, ["個人專業形象照", "名片主圖", "形象照", "頭像", "照片"]);
    const logo = findByIncludes(idx, ["品牌 Logo", "Logo"]);

    safeText(byId("u-name"), name || "（未填姓名）");
    safeText(byId("u-unit"), unit || "");
    safeText(byId("u-slogan"), slogan || "");

    safeText(byId("u-name-p"), name || "（未填姓名）");
    safeText(byId("u-unit-p"), unit || "");
    safeText(byId("u-slogan-p"), slogan || "");

    if(avatar) setImgWithFallback(byId("u-img"), avatar);
    if(logo){
      const logoEl = byId("u-logo");
      logoEl.style.display = "block";
      setImgWithFallback(logoEl, logo);
    } else {
      const logoEl = byId("u-logo");
      logoEl.style.display = "none";
    }

    setMultiline(byId("u-service"), service);
    setMultiline(byId("u-title"), titles);

    renderQA(idx);
    renderLinks(idx);

    renderGallery(parseGalleryUrls(idx));

    const preferStyle = findByIncludes(idx, ["您喜歡的版型"]);
    const preferColor = findByIncludes(idx, ["您喜歡的顏色"]);
    const preferPaper = findByIncludes(idx, ["您喜歡的紙感"]);
    const preferPremium = findByIncludes(idx, ["你喜歡的底色（精品設計款適用）", "你喜歡的底色"]);

    if(state.mode === "free"){
      if(preferStyle && /arch|flat|spot/i.test(preferStyle)) state.style = preferStyle.toLowerCase();
      if(preferPaper && /paper-\d/i.test(preferPaper)) state.paper = preferPaper.toLowerCase();
      if(preferColor && /color-\d/i.test(preferColor)) state.theme = preferColor.toLowerCase();
    }
    if(state.mode === "premium" && preferPremium && /^p\d$/i.test(preferPremium.trim())) state.theme = preferPremium.trim().toLowerCase();

    applyV382();

  }catch(e){
    console.error(e);
    safeText(byId("u-name"), "雲端同步異常");
    safeText(byId("u-unit"), "請稍後再試");
  }
}

// 後台 copy token 用（從 list API 找 token）
async function getTokenByIdFromListAPI(id){
  try{
    const res = await fetch(`${CONFIG.GAS}?action=list`, { cache:"no-store" });
    const json = await res.json();
    if(!json || json.ok !== true) return "";
    const headers = Array.isArray(json.headers) ? json.headers : [];
    const rows = Array.isArray(json.rows) ? json.rows : [];
    for(const r of rows){
      const obj = rowToObject(r, headers);
      if(!obj) continue;
      const rid = String(obj.id || obj.ID || "").trim();
      if(rid === id){
        const idx = buildRowIndex(obj);
        const token = findByIncludes(idx, ["token", "Token"]);
        return String(token||"").trim();
      }
    }
    return "";
  }catch(e){
    return "";
  }
}

// ---------- share copy button ----------
function bindShareCopy(){
  const btn = byId("btnCopyShare");
  if(!btn) return;
  btn.onclick = async ()=>{
    const id = getIdFromUrl();
    const url = withIdParam(id);
    try{
      await navigator.clipboard.writeText(url);
      alert("已複製分享連結");
    }catch(e){
      alert(url);
    }
  };
}

// ---------- PWA ----------
function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js?v=3853").catch(()=>{});
}

// ---------- boot ----------
window.addEventListener("load", ()=>{
  byId("btn-plan-free")?.classList.add("active");
  byId("btn-plan-premium")?.classList.remove("active");

  byId("lb-close").onclick = closeLightbox;
  byId("lightbox").addEventListener("click", (e)=>{
    if(e.target && e.target.id === "lightbox") closeLightbox();
  });
  byId("lb-prev").onclick = ()=> stepLightbox(-1);
  byId("lb-next").onclick = ()=> stepLightbox(+1);

  bindHiddenAdmin();
  bindShareCopy();

  applyV382();
  loadCardDataFromListAPI();
  registerSW();
});
