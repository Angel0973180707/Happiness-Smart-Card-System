/* app.js V386 - 系統工程師修正版 */
const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  OG_CARD_URL: "https://your-github-path/og-card.png" // 請根據實際 GitHub 路徑替換
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let galleryUrls = [];

const byId = (id) => document.getElementById(id);
const safeText = (el, v) => { if(el) el.innerText = (v ?? "").toString(); };

// --- 試算表讀取要訣：建立標準化索引 ---
function buildRowIndex(rowObj){
  const idx = new Map();
  Object.keys(rowObj||{}).forEach(k=>{
    const nk = k.replace(/[\s\u200B-\u200D\uFEFF]/g, "").trim(); // 移除空白
    idx.set(nk, rowObj[k]);
  });
  return idx;
}

function findVal(indexMap, patterns){
  for(let k of patterns){
    const nk = k.replace(/\s/g, "");
    if(indexMap.has(nk)) return indexMap.get(nk);
  }
  return "";
}

// --- 圖片網址處理 ---
function getImgUrl(url){
  const s = String(url||"").trim();
  const m = s.match(/[?&]id=([^&]+)/i) || s.match(/\/d\/([^/]+)/i) || s.match(/\/file\/d\/([^/]+)/i);
  if(m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
  return s;
}

function setImg(id, url){
  const el = byId(id);
  if(!el || !url) return;
  el.src = getImgUrl(url);
  el.style.display = "block";
}

// --- 主要載入邏輯 ---
async function loadCardData(){
  const params = new URLSearchParams(window.location.search);
  const id = (params.get("id") || CONFIG.DEFAULT_ID).trim();
  
  try {
    const res = await fetch(`${CONFIG.GAS}?action=list`, { cache: "no-store" });
    const json = await res.json();
    const rows = json.rows || [];
    const headers = json.headers || [];
    
    let rowData = rows.find(r => String(r[0]).trim() === id);
    if(!rowData) rowData = rows[0];

    const obj = {};
    headers.forEach((h, i) => obj[h] = rowData[i]);
    const idx = buildRowIndex(obj);

    // 填充資料
    const name = findVal(idx, ["姓名", "姓名（名片大標題）"]);
    const unit = findVal(idx, ["單位", "單位名稱"]);
    const slogan = findVal(idx, ["標語", "理念標語"]);
    const avatar = findVal(idx, ["形象照", "個人專業形象照", "照片"]);
    const logo = findVal(idx, ["Logo", "品牌Logo"]);

    safeText(byId("u-name"), name); safeText(byId("u-name-p"), name);
    safeText(byId("u-unit"), unit); safeText(byId("u-unit-p"), unit);
    safeText(byId("u-slogan"), slogan); safeText(byId("u-slogan-p"), slogan);
    
    if(avatar) setImg("u-img", avatar);
    if(logo) { byId("u-logo").style.display="block"; setImg("u-logo", logo); }

    // 服務項目與頭銜 (動態顯示)
    const sv = findVal(idx, ["服務項目", "核心業務"]);
    if(sv) { byId("sec-service").style.display="block"; byId("u-service").innerText = sv; }
    const tt = findVal(idx, ["重要頭銜/獎銜", "獎銜"]);
    if(tt) { byId("sec-title").style.display="block"; byId("u-title").innerText = tt; }

    // Q&A
    const q1 = findVal(idx, ["Q1", "客戶常見提問1"]);
    const a1 = findVal(idx, ["A1", "專業解答1"]);
    if(q1 || a1) {
      byId("sec-qa").style.display="block";
      byId("qa-box").innerHTML = `<div class="qa"><b>Q: ${q1}</b><br>${a1}</div>`;
    }

    // 相簿 (1-10張)
    const gUrls = [];
    for(let i=1; i<=10; i++){
      const u = findVal(idx, [`照片${i}`, `產品照片${i}`, `活動照片${i}`]);
      if(u) gUrls.push(u);
    }
    renderGallery(gUrls);

    // 按鈕行為
    const tel = findVal(idx, ["電話", "一鍵聯繫電話"]);
    byId("btn-tel").onclick = () => tel ? location.href=`tel:${tel}` : alert("未填電話");
    
    // 地圖導航行為修復
    const map = findVal(idx, ["地址", "地圖"]);
    byId("btn-map").onclick = () => {
      if(!map) return alert("未填地址");
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(map)}`, "_blank");
    };

    byId("btn-share-link").onclick = () => {
      const link = `${window.location.origin}${window.location.pathname}?id=${id}`;
      navigator.clipboard.writeText(link).then(()=>alert("名片連結已複製！"));
    };

  } catch (e) { console.error("Sync Error", e); }
}

function renderGallery(urls){
  const sec = byId("sec-gallery");
  const track = byId("g-track");
  if(!urls.length) { sec.style.display="none"; return; }
  sec.style.display="block";
  track.innerHTML = urls.map(u => `<div class="g-item"><img src="${getImgUrl(u)}"></div>`).join("");
}

// --- 方案與樣式控制 ---
window.setPlan = (plan) => {
  state.mode = plan;
  document.querySelectorAll(".plan-btn").forEach(b => b.classList.toggle("active", b.id.includes(plan)));
  document.querySelector(".free-only").style.display = plan === "free" ? "flex" : "none";
  byId("free-controls").style.display = plan === "free" ? "block" : "none";
  document.querySelector(".premium-only").style.display = plan === "premium" ? "flex" : "none";
  apply();
};

window.setV382 = (m, t, el) => {
  state.mode = m; state.theme = t;
  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  el.classList.add("active");
  apply();
};

window.setV382Style = (s, el) => {
  state.style = s;
  el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
  el.classList.add("active");
  apply();
};

window.setV382Paper = (p, el) => {
  state.paper = p;
  el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
  el.classList.add("active");
  apply();
};

function apply(){
  document.body.className = `mode-${state.mode} ${state.theme} style-${state.style} ${state.paper}`;
}

// --- 隱形後台邏輯 ---
let clicks = 0;
byId("footer-trigger").onclick = () => {
  clicks++;
  if(clicks === 3){
    const pass = prompt("請輸入管理密碼");
    if(pass === "888") byId("adminModal").classList.add("show");
    clicks = 0;
  }
  setTimeout(()=>clicks=0, 2000);
};

byId("adminClose").onclick = () => byId("adminModal").classList.remove("show");
byId("adminBackFront").onclick = () => byId("adminModal").classList.remove("show");

byId("adminCopyDeliver").onclick = () => {
  const id = byId("adminIdInput").value || "TW0001";
  const name = byId("adminNameInput").value || "客戶";
  const link = `${window.location.origin}${window.location.pathname}?id=${id}`;
  const text = `【幸福智慧名片製作完成】\n親愛的 ${name} 您好：\n名片：${link}\nOG圖：${CONFIG.OG_CARD_URL}\n歡迎點擊分享！`;
  navigator.clipboard.writeText(text).then(()=>alert("交貨訊息已複製！"));
};

byId("adminOpen").onclick = () => {
  const id = byId("adminIdInput").value;
  if(id) window.location.href = `?id=${id}`;
};

window.goFillForm = () => window.open(CONFIG.FORM, "_blank");
window.onload = loadCardData;
