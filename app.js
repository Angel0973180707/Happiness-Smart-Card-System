/* Angel Card Front (FULL OVERWRITE)
 * Fix:
 * 1) 自由款：選版型一定動（支援 data-layout 與文字辨識）
 * 2) 精品款：更飽滿質感（plan-premium）
 * 3) 圖片：Drive 連結轉直連；若仍不出＝Drive 權限問題
 */

const API_BASE = "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";
const STORE_LAYOUT = "ANGEL_FREE_LAYOUT";

const qsa = (s, root=document) => Array.from(root.querySelectorAll(s));

function findFacadeEl(){
  return (
    document.getElementById("facade") ||
    document.querySelector(".facade") ||
    document.querySelector("[data-facade]") ||
    document.getElementById("preview") ||
    document.getElementById("previewCard") ||
    document.querySelector(".previewCard") ||
    null
  );
}

function setSelected(btns, layout){
  btns.forEach(b=>b.classList.remove("selected"));
  const pick = btns.find(b => (b.dataset.layout||"") === layout);
  if (pick) pick.classList.add("selected");
}

function setLayout(layout){
  const facade = findFacadeEl();
  if (!facade) return;

  facade.classList.add("paper");
  facade.classList.remove("layout-arch","layout-flat","layout-spotlight");
  if (layout === "arch") facade.classList.add("layout-arch");
  if (layout === "flat") facade.classList.add("layout-flat");
  if (layout === "spotlight") facade.classList.add("layout-spotlight");

  localStorage.setItem(STORE_LAYOUT, layout);

  // 同步 selected（抓 data-layout 的按鈕）
  const btns = qsa("[data-layout]");
  if (btns.length) setSelected(btns, layout);
}

function normalizeDriveToDirect(url){
  const s = String(url || "").trim();
  if (!s) return "";

  // open?id=XXXX
  let m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // /file/d/XXXX or /d/XXXX
  m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // already direct or normal url
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

function detectPlanPremium(d){
  const plan = String(d["請選擇製作方案？"] || "").trim();
  // 只要包含「精品」就當精品款（你也可以改成更精準）
  return plan.includes("精品");
}

function buildLinkPills(d){
  const pills = [];

  const lineOA = String(d["​LINE 官方帳號連結（綠色主按鈕）"] || d["LINE 官方帳號連結（綠色主按鈕）"] || "").trim();
  if (lineOA) pills.push({href: lineOA, text:"LINE 官方帳號", primary:true});

  const linePrivate = String(d["私訊 LINE 連結（第一行填連結，換行填line名稱）"] || "").trim();
  if (linePrivate){
    const parts = linePrivate.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    if (parts[0]) pills.push({href: parts[0], text: parts[1] || "私訊 LINE", primary:false});
  }

  const v1 = String(d["影音平台 1（如：YouTube或其他連結）"] || "").trim();
  const v2 = String(d["影音平台 2（如：TikTok / 抖音或其他連結）"] || "").trim();
  const v3 = String(d["影音平台 3（或地址）"] || "").trim();
  if (v1) pills.push({href:v