/**
 * 幸福智慧名片 V385.2 旗艦修正版
 * 修正重點：1.顏色連動精準化 2.GAS自動變色映射 3.URL參數自動讀取
 */

const CONFIG = {
  // ✅ 您的 GAS API 網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  // ✅ 管理密碼
  PASS: "167777",
  // ✅ 預設展示 ID
  DEFAULT_ID: "TW0001"
};

// 初始狀態
let state = {
  mode: 'free',
  theme: 'color-1',
  style: 'arch',
  paper: 'paper-1'
};

// ==========================================
// 1. 樣式切換核心 (解決連動失效)
// ==========================================

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新色球 UI 狀態
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  
  applyAllStyles();
};

window.setV382Style = function(style, el) {
  state.style = style;
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyAllStyles();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyAllStyles();
};

function applyAllStyles() {
  const isFree = state.mode === 'free';
  
  // A. 切換控制面板顯示
  const fCtrl = document.getElementById('free-controls');
  const pCtrl = document.getElementById('premium-controls');
  if (fCtrl) fCtrl.style.display = isFree ? 'block' : 'none';
  if (pCtrl) pCtrl.style.display = isFree ? 'none' : 'block';

  // B. 🔴 徹底清除 Body 上的舊 Class (解決顏色連動失效關鍵)
  // 我們先移除所有可能的樣式類別，再重新加上去
  const classesToRemove = [
    'mode-free', 'mode-premium',
    'color-1', 'color-2', 'color-3', 'color-4', 'color-5',
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
    'style-arch', 'style-flat', 'style-spot',
    'paper-1', 'paper-2', 'paper-3'
  ];
  document.body.classList.remove(...classesToRemove);

  // C. 重新套用當前狀態
  document.body.classList.add(`mode-${state.mode}`);
  document.body.classList.add(state.theme);
  
  if (isFree) {
    document.body.classList.add(`style-${state.style}`);
    document.body.classList.add(state.paper);
  }
}

// ==========================================
// 2. 雲端數據抓取 (自動變色邏輯)
// ==========================================

async function loadV385Data() {
  const idInput = document.getElementById('id-input').value.trim();
  const targetID = idInput || CONFIG.DEFAULT_ID;
  
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${targetID}`);
    const json = await res.json();
    if (!json.ok) return alert("找不到此序號，請檢查試算表。");
    const d = json.data;

    // 映射內容
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"] || "";
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"] || "";
    if (d["個人專業形象照（名片主圖）"]) document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];

    // 處理滑動相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const imgs = (d["產品或品牌或活動照片最多3張（內容區插圖）"] || "").split("\n");
    imgs.forEach(src => {
      if(src.trim()){
        const img = document.createElement('img');
        img.src = src.trim();
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // 🔵 自動變色對應 (GAS 欄位文字 -> CSS Class)
    const isPrem = d["請選擇製作方案？"] === "b.精品設計款";
    const mode = isPrem ? 'premium' : 'free';
    
    // 顏色映射表
    const pMap = { "酒紅":"p1", "深藍":"p2", "霧紫":"p3", "金箔":"p4", "藍灰":"p5", "胭脂":"p6", "褐碳":"p7" };
    const fMap = { "紅色":"color-1", "藍色":"color-2", "橘色":"color-3", "紫色":"color-4", "綠色":"color-5" };
    
    let theme = isPrem ? 
        (pMap[d["你喜歡的底色（精品設計款適用）"]] || 'p4') : 
        (fMap[d["您喜歡的顏色（自由搭配款適用）"]] || 'color-1');

    window.setV382(mode, theme);

  } catch (e) { console.error("抓取失敗", e); }
}

// ==========================================
// 3. 行政與交貨工具
// ==========================================
let tapCount = 0;
window.triggerLock = () => {
  tapCount++;
  if (tapCount >= 3) {
    document.getElementById('lock-mask').style.display = 'flex';
    tapCount = 0;
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
  if(!id) return alert("請先載入成品 ID");
  const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(url).then(() => alert("專屬交貨網址已複製！"));
};

// 啟動
window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('id')) {
    document.getElementById('id-input').value = urlParams.get('id');
    loadV385Data();
  } else {
    applyAllStyles();
  }
};
