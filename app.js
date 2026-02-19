/**
 * 幸福智慧名片 V385.2 - GAS Token 安全對接版
 * 修正點：支援 Token 驗證、處理 Google Drive 圖片連結、智能導航
 */

const CONFIG = {
  // ✅ 您的 GAS 部署網址 (確認已部署為「所有人」)
  GAS: "https://script.google.com/macros/s/AKfycbxJYZB2F1AhkQ3Ch-LX85G7PhwBc5fc-fLHqpS5qEd2k9oeHbf4NFb0OnMGRm3GgTI/exec",
  // ✅ 管理密碼 (進入隱形後台用)
  PASS: "167777",
  // ✅ 預設展示 ID 與 Token (從您的試算表擷取)
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774" 
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

// ==========================================
// 1. 核心數據抓取 (修正 Token 邏輯)
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  
  // 優先級：1. 輸入框 2. 網址參數 3. 預設值
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  // 加上時間戳與 Token 進行連線
  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;
  
  console.log("正在連線至：", finalUrl);

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();

    if (!json.ok) {
      console.error("GAS 錯誤訊息：", json.message);
      return alert(`連線失敗：${json.message}\n(提示：Token 不符或序號錯誤)`);
    }

    const d = json.data;

    // A. 基礎文字映射 (精準對應您的試算表標題)
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"] || "小天使";
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"] || "";

    // B. 圖片處理 (自動轉換 Google Drive 預覽連結)
    const fixDriveUrl = (url) => {
      if(!url) return "";
      return url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=drivesdk", "").replace("open?id=", "uc?export=view&id=");
    };

    if (d["個人專業形象照（名片主圖）"]) {
      document.getElementById('u-img').src = fixDriveUrl(d["個人專業形象照（名片主圖）"]);
    }

    // C. 產品滑動相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const rawImgs = d["產品或品牌或活動照片最多3張（內容區插圖）"] || "";
    const pImgs = rawImgs.split(","); // 您的試算表是用逗號隔開
    pImgs.forEach(src => {
      if(src.trim()) {
        const img = document.createElement('img');
        img.src = fixDriveUrl(src.trim());
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // D. 智能地圖導航
    const addr = d["影音平台 3（或地址）"];
    if (addr && addr.includes("街")) {
      document.getElementById('u-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }

    // E. 版型顏色自動連動
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    const mode = isPremium ? 'premium' : 'free';
    
    // 顏色映射 (對應您的試算表選項)
    const pMap = { "酒紅":"p1", "深藍":"p2", "金箔":"p4" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3" };
    
    let theme = isPremium ? 
        (pMap[d["你喜歡的底色（精品設計款適用）"]] || 'p4') : 
        (fMap[d["您喜歡的顏色（自由搭配款適用）"]] || 'color-2');

    window.setV382(mode, theme);

  } catch (e) {
    console.error("連線過程發生錯誤：", e);
    alert("系統連線失敗，請檢查網路或 GAS 權限。");
  }
}

// ==========================================
// 2. 行政後台與交貨系統 (不精簡)
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
  const urlParams = new URLSearchParams(window.location.search);
  const id = document.getElementById('id-input').value.trim();
  // 這裡需要透過隱形方式取得該 ID 對應的 Token，建議您可以從 GAS Admin API 擴充，
  // 目前先產生 ID 網址，提醒您手動補上 Token 或在網址參數傳遞。
  const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(url).then(() => alert("基礎網址已複製，請確認該 ID 狀態為 Active"));
};

// ...其餘 setV382, applyStyles 等函數維持先前版本內容...
window.onload = () => { loadV385Data(); };
