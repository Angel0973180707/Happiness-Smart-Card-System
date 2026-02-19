/**
 * 幸福智慧名片 V385.2 旗艦修正版
 * 修正重點：顏色連動失效、自動變色邏輯
 */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777",
  DEFAULT_ID: "TW0001"
};

let state = {
  mode: 'free',      // free | premium
  theme: 'color-1',  // color-1~5 或 p1~p7
  style: 'arch',     // arch | flat | spot
  paper: 'paper-1'   // paper-1~3
};

// ==========================================
// 1. 核心樣式切換與連動 (修正此處)
// ==========================================

// 統一顏色切換函數
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新點選球的 active 狀態
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  
  applyV382Styles();
};

window.setV382Style = function(style, el) {
  state.style = style;
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

function applyV382Styles() {
  const isFree = state.mode === 'free';
  
  // 控制控制面板顯示
  const freePanel = document.getElementById('free-controls');
  const premiumPanel = document.getElementById('premium-controls');
  if (freePanel) freePanel.style.display = isFree ? 'block' : 'none';
  if (premiumPanel) premiumPanel.style.display = isFree ? 'none' : 'block';

  // 🔴 核心修復：精準清除舊 Class 並套用新 Class
  // 移除所有可能的顏色和模式類別，避免連動失效
  document.body.classList.remove(
    'mode-free', 'mode-premium', 
    'color-1', 'color-2', 'color-3', 'color-4', 'color-5',
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
    'style-arch', 'style-flat', 'style-spot',
    'paper-1', 'paper-2', 'paper-3'
  );

  // 套用新類別
  document.body.classList.add(`mode-${state.mode}`);
  document.body.classList.add(state.theme);
  
  if (isFree) {
    document.body.classList.add(`style-${state.style}`);
    document.body.classList.add(state.paper);
  }
}

// ==========================================
// 2. 數據抓取與自動變色
// ==========================================

async function loadV385Data() {
  const idInput = document.getElementById('id-input').value.trim();
  const targetID = idInput || CONFIG.DEFAULT_ID;
  
  try {
    const response = await fetch(`${CONFIG.GAS}?id=${targetID}`);
    const result = await response.json();
    if (!result.ok) return alert("找不到序號");
    const d = result.data;

    // 映射文字
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"] || "";
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"] || "";
    if (d["個人專業形象照（名片主圖）"]) document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];

    // 展示圖滑動區
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const pImgs = (d["產品或品牌或活動照片最多3張（內容區插圖）"] || "").split("\n");
    pImgs.forEach(src => {
      if(src.trim()) {
        const img = document.createElement('img');
        img.src = src.trim();
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // 🔴 自動變色連動邏輯
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    const mode = isPremium ? 'premium' : 'free';
    
    // 中文對應表
    const pColorMap = { "酒紅":"p1", "深藍":"p2", "霧紫":"p3", "金箔":"p4", "藍灰":"p5", "胭脂":"p6", "褐碳":"p7" };
    const fColorMap = { "紅色":"color-1", "藍色":"color-2", "橘色":"color-3", "紫色":"color-4", "綠色":"color-5" };
    
    let theme = isPremium ? 
        (pColorMap[d["你喜歡的底色（精品設計款適用）"]] || 'p4') : 
        (fColorMap[d["您喜歡的顏色（自由搭配款適用）"]] || 'color-1');

    window.setV382(mode, theme);

  } catch (error) { console.error(error); }
}

// ==========================================
// 3. 隱形後台與工具 (不精簡)
// ==========================================
let count = 0;
window.triggerLock = () => {
  count++;
  if (count >= 3) {
    document.getElementById('lock-mask').style.display = 'flex';
    count = 0;
  }
};
window.verifyLock = () => {
  if (document.getElementById('pass-input').value === CONFIG.PASS) {
    document.getElementById('delivery-bar').style.display = 'flex';
    document.getElementById('lock-mask').style.display = 'none';
  } else { alert("密碼錯誤"); }
};
window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';
window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  if (!id) return alert("請先載入成品");
  const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(url).then(() => alert("交貨網址已複製"));
};

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('id')) {
    document.getElementById('id-input').value = urlParams.get('id');
    loadV385Data();
  }
  applyV382Styles();
};
