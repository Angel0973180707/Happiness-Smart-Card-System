/**
 * 幸福智慧名片 V385 旗艦完整架構版
 * 功能：全自動數據映射、隱形密碼後台、交貨網址複製
 */

const CONFIG = {
  // ✅ 您的 GAS API 網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  // ✅ 管理密碼
  PASS: "167777",
  // ✅ 預設展示 ID
  DEFAULT_ID: "TW0001"
};

// 狀態管理：記錄目前的版型配置
let state = {
  mode: 'free',      // free | premium
  theme: 'color-1',  // color-1~5 或 p1~p7
  style: 'arch',     // arch | flat | spot
  paper: 'paper-1'   // paper-1~3
};

// ==========================================
// 1. 數據抓取與映射邏輯 (核心功能)
// ==========================================

async function loadV385Data() {
  const idInput = document.getElementById('id-input').value.trim();
  const targetID = idInput || CONFIG.DEFAULT_ID;
  
  console.log("正在從雲端抓取 ID:", targetID);
  
  try {
    const response = await fetch(`${CONFIG.GAS}?id=${targetID}`);
    const result = await response.json();
    
    if (!result.ok) {
      alert("讀取失敗：找不到此序號，請確認試算表資料。");
      return;
    }

    const d = result.data; // 試算表原始資料

    // A. 基礎文字映射
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"] || "姓名載入中";
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"] || "";

    // B. 形象照與 Logo
    if (d["個人專業形象照（名片主圖）"]) {
      document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];
    }
    
    // C. 左右滑動展示區 (處理最多 3 張產品圖)
    const slider = document.getElementById('u-slider');
    slider.innerHTML = ""; // 清空舊圖
    const productImgs = [
      d["產品或品牌或活動照片最多3張（內容區插圖）"], // 假設試算表將多張圖網址放在同一格換行
      d["產品圖2"], // 或是分開欄位
      d["產品圖3"]
    ];
    
    // 支援單欄位換行分隔或多欄位
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
        span.className = 'title-badge'; // 需搭配 CSS 樣式
        span.innerText = t.trim();
        titlesDiv.appendChild(span);
      }
    });

    // E. 智能地址轉導航
    const addr = d["影音平台 3（或地址）"];
    const mapIcon = document.getElementById('u-map');
    if (addr && (addr.includes("路") || addr.includes("市") || addr.includes("縣"))) {
      mapIcon.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
      mapIcon.style.display = "flex";
    }

    // F. 自動判斷方案並套用版型 (樣品自動化)
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    const preferredColor = isPremium ? (d["你喜歡的底色（精品設計款適用）"] || 'p4') : (d["您喜歡的顏色（自由搭配款適用）"] || 'color-1');
    
    // 映射中文顏色名稱至 CSS Class (如果是中文的話)
    const colorMap = { "酒紅":"p1", "深藍":"p2", "霧紫":"p3", "金箔":"p4", "藍灰":"p5", "胭脂":"p6", "褐碳":"p7" };
    const themeClass = colorMap[preferredColor] || preferredColor;

    window.setV382(isPremium ? 'premium' : 'free', themeClass);

  } catch (error) {
    console.error("GAS API 連接錯誤:", error);
    alert("連線異常，請檢查網路或 GAS 網址。");
  }
}

// ==========================================
// 2. 門面選版與樣式切換邏輯
// ==========================================

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新按鈕 active 狀態
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  
  applyStyles();
};

window.setV382Style = function(style, el) {
  state.style = style;
  if (el) {
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyStyles();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el) {
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyStyles();
};

function applyStyles() {
  const isFree = state.mode === 'free';
  // 切換前台控制項顯示
  const freeCtrl = document.getElementById('free-controls');
  if (freeCtrl) freeCtrl.style.display = isFree ? 'block' : 'none';

  // 組合所有 Class 套用到 body
  const finalClasses = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];
  document.body.className = finalClasses.filter(Boolean).join(' ');
}

// ==========================================
// 3. 隱形後台與交貨系統邏輯
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
  const inputPass = document.getElementById('pass-input').value;
  if (inputPass === CONFIG.PASS) {
    document.getElementById('delivery-bar').style.display = 'flex';
    document.getElementById('lock-mask').style.display = 'none';
    document.getElementById('pass-input').value = ""; // 清空
  } else {
    alert("密碼錯誤，請重新輸入。");
  }
};

window.closeLock = () => {
  document.getElementById('lock-mask').style.display = 'none';
};

// 🔗 一鍵複製交貨網址
window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  if (!id) return alert("請先載入成品序號");
  
  // 建立參數化網址
  const currentUrl = window.location.origin + window.location.pathname;
  const finalDeliveryUrl = `${currentUrl}?id=${id}`;
  
  navigator.clipboard.writeText(finalDeliveryUrl).then(() => {
    alert(`【交貨網址已複製】\n網址：${finalDeliveryUrl}\n一貼上 LINE 就會自動讀取資料。`);
  }).catch(err => {
    alert("複製失敗，請手動選取網址。");
  });
};

// ==========================================
// 4. 初始化
// ==========================================

window.onload = () => {
  // 檢查 URL 是否帶有 ?id=XXXX
  const urlParams = new URLSearchParams(window.location.search);
  const urlID = urlParams.get('id');
  
  if (urlID) {
    document.getElementById('id-input').value = urlID;
    loadV385Data(); // 自動讀取該名片
  } else {
    loadV385Data(); // 載入預設 ID
  }
  
  applyStyles();
};
