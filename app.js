/* Angel Card Front v364 (FULL OVERWRITE)
 * Fix:
 * - “成品預覽”只顯示標題（不塞多餘文字）
 * - 顏色更飽滿
 * - 自由款 3 版型：拱形 / 平直 / 聚光 確實切換到門面預覽
 * - 讀 GAS ?action=public (TW0001 fixed in GAS)
 */

const API_BASE = "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";
const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

const STORE_LAYOUT = "ANGEL_FREE_LAYOUT"; // arch / flat / spotlight

const $ = (id) => document.getElementById(id);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const els = {
  facade: $("facade"),
  btnGoForm: $("btnGoForm"),
  // 你的三顆按鈕不一定有固定 id，所以我用「文字判斷」去抓
};

function setLayout(layout){
  const root = els.facade;
  if (!root) return;

  root.classList.remove("layout-arch","layout-flat","layout-spotlight");
  if (layout === "arch") root.classList.add("layout-arch");
  if (layout === "flat") root.classList.add("layout-flat");
  if (layout === "spotlight") root.classList.add("layout-spotlight");

  // 紙感永遠開
  root.classList.add("paper");

  localStorage.setItem(STORE_LAYOUT, layout);

  // 同步按鈕 selected 狀態（抓文字）
  const buttons = qsa("button, .pillBtn");
  buttons.forEach(b=>{
    const t = (b.innerText||"").trim();
    const isArch = t.includes("雜誌") || t.includes("拱形");
    const isFlat = t.includes("留白") || t.includes("平直");
    const isSpot = t.includes("聚光") || t.includes("強對比");
    b.classList.remove("selected");
    if (layout === "arch" && isArch) b.classList.add("selected");
    if (layout === "flat" && isFlat) b.classList.add("selected");
    if (layout === "spotlight" && isSpot) b.classList.add("selected");
  });
}

function bindLayoutButtons(){
  const buttons = qsa("button, .pillBtn");
  buttons.forEach(b=>{
    const t = (b.innerText||"").trim();

    // 依你截圖：雜誌編輯感 / 藝廊留白感 / 強對比主視覺
    if (t.includes("雜誌") || t.includes("拱形")) {
      b.addEventListener("click", ()=> setLayout("arch"));
      return;
    }
    if (t.includes("藝廊") || t.includes("留白") || t.includes("平直")) {
      b.addEventListener("click", ()=> setLayout("flat"));
      return;
    }
    if (t.includes("強對比") || t.includes("聚光")) {
      b.addEventListener("click", ()=> setLayout("spotlight"));
      return;
    }
  });
}

function driveToDirect(url){
  const s = String(url || "").trim();
  if (!s) return "";
  let m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return s;
}

function splitMulti(urls){
  const s = String(urls || "").trim();
  if (!s) return [];
  return s.split(",").map(x=>x.trim()).filter(Boolean);
}

function esc(str){
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function buildLinkPills(d){
  const pills = [];

  const lineOA = (d["​LINE 官方帳號連結（綠色主按鈕）"] || d["LINE 官方帳號連結（綠色主按鈕）"] || "").trim();
  if (lineOA) pills.push({href: lineOA, text:"LINE 官方帳號", primary:true});

  const linePrivate = (d["私訊 LINE 連結（第一行填連結，換行填line名稱）"] || "").trim();
  if (linePrivate){
    const parts = linePrivate.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    if (parts[0]) pills.push({href: parts[0], text: parts[1] || "私訊 LINE", primary:false});
  }

  const v1 = (d["影音平台 1（如：YouTube或其他連結）"] || "").trim();
  const v2 = (d["影音平台 2（如：TikTok / 抖音或其他連結）"] || "").trim();
  const v3 = (d["影音平台 3（或地址）"] || "").trim();
  if (v1) pills.push({href:v1, text:"影音平台 1"});
  if (v2) pills.push({href:v2, text:"影音平台 2"});
  if (v3) pills.push({href:v3, text:"影音平台 3"});

  const s1 = (d["社群平台 1（如：Facebook 粉絲專頁或其他連結）"] || "").trim();
  const s2 = (d["社群平台 2（如：Instagram或其他連結）"] || "").trim();
  const s3 = (d["社群平台 3（如：Thread / 部落格或其他連結）"] || "").trim();
  if (s1) pills.push({href:s1, text:"社群平台 1"});
  if (s2) pills.push({href:s2, text:"社群平台 2"});
  if (s3) pills.push({href:s3, text:"社群平台 3"});

  const email = (d["一鍵聯繫 Email"] || "").trim();
  const phone = (d["一鍵聯繫電話"] || "").trim();
  if (email) pills.push({href:`mailto:${email}`, text:"Email"});
  if (phone) pills.push({href:`tel:${phone}`, text:"電話"});

  const wechat = (d["微信 ID"] || "").trim();
  if (wechat) pills.push({href:"", text:`微信：${wechat}`});

  return pills;
}

function renderFacade(payload){
  const root = els.facade;
  if (!root) return;

  const d = payload?.data || {};

  const title = (d["姓名（名片大標題）"] || "名片示範").trim();
  const org   = (d["單位名稱（如：幸福教養概念館）"] || "").trim();
  const tag   = (d["理念標語（顯示在照片下方，精簡有力）"] || "").trim();
  const svc   = (d["服務項目（核心業務，多項可條列換行）"] || "").trim();
  const honor = (d["重要頭銜/獎銜（權威背書項目，多項可條列換行）"] || "").trim();

  const avatarUrl = driveToDirect(d["個人專業形象照（名片主圖）"]);
  const logoUrl   = driveToDirect(d["品牌 Logo（右上角小圖標）"]);

  const imgs = splitMulti(d["產品或品牌或活動照片最多3張（內容區插圖）"]).map(driveToDirect);

  const pills = buildLinkPills(d);

  root.innerHTML = `
    <div class="hero">
      <div class="heroTop">
        <div class="avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="photo">` : ""}</div>
        <div class="logo">${logoUrl ? `<img src="${logoUrl}" alt="logo">` : ""}</div>
      </div>

      <div class="heroText">
        <h2 class="h2">${esc(title)}</h2>
        ${org ? `<div class="h3">${esc(org)}</div>` : ""}
        ${tag ? `<div class="tagline">${esc(tag)}</div>` : ""}
      </div>
    </div>

    ${svc ? `<div class="section"><h4>服務</h4><p class="kv">${esc(svc)}</p></div>` : ""}

    ${imgs.length ? `
      <div class="section">
        <h4>內容</h4>
        <div class="carousel">
          ${imgs.map(u=>`
            <div class="carouselItem" data-full="${u}">
              <img src="${u}" alt="img">
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    ${honor ? `<div class="section"><h4>頭銜</h4><p class="kv">${esc(honor)}</p></div>` : ""}

    ${pills.length ? `
      <div class="section">
        <h4>連結</h4>
        <div class="links">
          ${pills.map(p=>{
            if (!p.href) return `<span class="pill">${esc(p.text)}</span>`;
            return `<a class="pill ${p.primary ? "primary":""}" href="${p.href}" target="_blank" rel="noopener noreferrer">${esc(p.text)}</a>`;
          }).join("")}
        </div>
      </div>
    ` : ""}
  `;

  // 圖片點擊開大圖
  qsa(".carouselItem").forEach(el=>{
    el.addEventListener("click", ()=>{
      const u = el.getAttribute("data-full");
      if (u) window.open(u, "_blank", "noopener,noreferrer");
    });
  });

  // 保底：如果 hero 背景沒套到，補 layout class
  const saved = localStorage.getItem(STORE_LAYOUT) || "arch";
  setLayout(saved);
}

async function loadPublic(){
  const url = `${API_BASE}?action=public&_=${Date.now()}`;
  const res = await fetch(url, { cache:"no-store" });
  const json = await res.json();
  if (!json || !json.ok) throw new Error(json?.message || "API failed");
  return json;
}

function bindFormBtn(){
  if (!els.btnGoForm) return;
  els.btnGoForm.addEventListener("click", ()=> {
    window.location.href = FORM_URL;
  });
}

(async function init(){
  try{
    // 綁自由款三版型
    bindLayoutButtons();

    // 先套一個預設 layout（避免你說的「沒出現」）
    const saved = localStorage.getItem(STORE_LAYOUT) || "arch";
    setLayout(saved);

    // 綁表單按鈕（若有）
    bindFormBtn();

    // 載入 TW0001 公開示範資料
    const payload = await loadPublic();
    renderFacade(payload);

  } catch (err){
    console.error(err);
    alert("前臺載入失敗：\n" + (err?.message || err));
  }
})();