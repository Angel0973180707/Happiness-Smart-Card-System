/**
 * 幸福智慧名片 V385.2 旗艦完整架構版
 * 功能：全自動數據映射、隱形密碼後台、交貨網址複製、45+7種隨選版型
 */

const CONFIG = {
  // ✅ 您的 GAS API 網址 (已對接您提供的網址)
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  // ✅ 管理密碼
  PASS: "167777",
  // ✅ 預設展示 ID
  DEFAULT_ID: "TW0001",
  // ✅ 表單訂製連結
  FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform"
};

// 狀態管理：鎖定 V384 的視覺基準
let state = {
  mode: 'free',      // free | premium
  theme: 'color-1',  // color-1~5 或 p1~p7
  style: 'arch',     // arch | flat | spot
  paper: 'paper-1'   // paper-1~3
};

// ==========================================
// 1. 數據抓取與自動映射 (V385 核心)
// ==========================================

async function loadV385Data() {
  const idInput = document.getElementById('id-input').value.trim();
  const targetID = idInput || CONFIG.DEFAULT_ID;
  
  try {
    const response = await fetch(`${CONFIG.GAS}?id=${targetID}`);
    const result = await response.json();
    
    if (!result.ok) {
      alert("讀取失敗：找不到此序號，請確認試算表欄位名稱是否正確。");
      return;
    }

    const d = result.data; // 試算表原始資料映射

    // A. 基礎文字映射 (對標您的試算表表頭)
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"] || "姓名載入中";
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"] || "";

    // B. 個人影像映射
    if (d["個人專業形象照（名片主圖）"]) {
      document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];
    }
    
    // C. 左右滑動展示區 (處理最多 3 張產品圖)
    const slider = document.getElementById('u-slider');
    slider.innerHTML = ""; 
    const productImgs = [
      d["產品或品牌或活動照片最多3張（內容區插圖）"], // 支援換行分隔
      d["產品圖2"],
      d["產品圖3"]
    ];
    
    let allImgs = [];
    productImgs.forEach(item => {
      if (item) {
        const splitImgs = item.split("\n");
        allImgs = allImgs.concat(splitImgs);
      }
    });

    allImgs.forEach(src => {
      if (src.trim()) {
        const imgTag = document.createElement('img');
        imgTag.src = src.trim();
        imgTag.className = 'product-img';
        slider.appendChild(imgTag);
      }
    });

    // D. 重要頭銜背書區 (勳章式橫排)
    const titlesDiv = document.getElementById('u-titles');
    titlesDiv.innerHTML = "";
    const titles = (d["重要頭銜/獎銜（權威背書項目，多項可條列換行）"] || "").split("\n");
    titles.forEach(t => {
      if (t.trim()) {
        const span = document.createElement('span');
        span.className = 'title-tag'; 
        span.innerText = t.trim();
        titlesDiv.appendChild(span);
      }
    });

    // E. 智能地址導航轉換 (當欄位包含地址關鍵字時自動轉換)
    const addr = d["影音平台 3（或地址）"];
    const mapIcon = document.getElementById('u-map');
    if (addr && (addr.includes("路") || addr.includes("市") || addr.includes("街"))) {
      mapIcon.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }

    // F. 自動方案判定 (樣品製作神器)
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    const preferredColorName = isPremium ? (d["你喜歡的底色（精品設計款適用）"] || '金箔') : (d["您喜歡的顏色（自由搭配款適用）"] || 'color-1');
    
    // 中文顏色轉 CSS 類別映射
    const pColorMap = { "酒紅":"p1", "深藍":"p2", "霧紫":"p3", "金箔":"p4", "藍灰":"p5", "胭脂":"p6", "褐碳":"p7" };
    const finalTheme = pColorMap[preferredColorName] || preferredColorName;

    window.setV382(isPremium ? 'premium' : 'free', finalTheme);

  } catch (error) {
    console.error("GAS API Error:", error);
    alert("連線失敗，請檢查網路。");
  }
}

// ==========================================
// 2. 門面切換與樣式套用 (V384 經典邏輯)
// ==========================================

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新按鈕 active 樣式
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  
  applyStyles();
};

window.setV382Style = function(style, el) {
  state.style = style;
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyStyles();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyStyles();
};

function applyStyles() {
  const isFree = state.mode === 'free';
  // 前台控制面板聯動
  document.getElementById('free-controls').style.display = isFree ? 'block' : 'none';
  document.getElementById('premium-controls').style.display = isFree ? 'none' : 'block';

  // 封存版 45+7 種組合 Class 套用
  const classes = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];
  document.body.className = classes.filter(Boolean).join(' ');
}

// ==========================================
// 3. 隱形後台與交貨系統 (V385 功能)
// ==========================================

let clickCount = 0;
window.triggerLock = () => {
  clickCount++;
  if (clickCount >= 3) {
    document.getElementById('lock-mask').style.display = 'flex';
    clickCount = 0;
  }
};

window.verifyLock = () => {
  if (document.getElementById('pass-input').value === CONFIG.PASS) {
    document.getElementById('delivery-bar').style.display = 'flex';
    document.getElementById('lock-mask').style.display = 'none';
    document.getElementById('pass-input').value = "";
  } else {
    alert("密碼錯誤");
  }
};

window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';

window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  if (!id) return alert("請先載入成品 ID");
  const finalUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(finalUrl).then(() => {
    alert(`【交貨網址已複製】\n${finalUrl}`);
  });
};

window.goFillForm = () => window.open(CONFIG.FORM_URL, '_blank');

// ==========================================
// 4. 初始化啟動
// ==========================================

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlID = urlParams.get('id');
  if (urlID) {
    document.getElementById('id-input').value = urlID;
    loadV385Data();
  } else {
    loadV385Data(); // 載入預設 TW0001
  }
  applyStyles();
};
