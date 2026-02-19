/**
 * 幸福智慧名片 V385.7 - 數據抓取強化版
 * 優先解決：1. GAS 連線驗證 2. 圖片載入 3. 欄位匹配
 */

const CONFIG = {
  // ✅ 1. 請確保這是您最新的 /exec 網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  
  // ✅ 2. 預設 ID 與 Token (必須與試算表 TW0001 的資料完全一致)
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774" 
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };
let currentAdminRows = [];

// ==========================================
// 核心函數：抓取雲端資料
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  
  // 優先級：1.輸入框 2.網址參數 3.預設值
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  // 🔴 關鍵點：必須帶上 Token 才能通過您的 GAS 驗證門檻
  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;
  
  console.log("嘗試連線至 API:", finalUrl);

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();

    if (!json.ok) {
      console.error("API 回傳錯誤:", json.message);
      // 如果失敗，嘗試不帶 token 請求一次 (處理手動輸入 ID 的情況)
      return alert(`連線失敗：${json.message}\n提示：請確認 ID 是否正確或已啟用。`);
    }

    const d = json.data;
    
    // 🔴 欄位名稱清洗 (解決試算表標頭引號與換行問題)
    const getVal = (targetKey) => {
      const cleanTarget = targetKey.replace(/["\n\r\s]/g, "");
      for (let k in d) {
        if (k.replace(/["\n\r\s]/g, "").includes(cleanTarget)) return d[k];
      }
      return "";
    };

    // A. 填充文字
    document.getElementById('u-name').innerText = getVal("姓名") || "小天使笑長";
    document.getElementById('u-unit').innerText = getVal("單位名稱") || "";
    document.getElementById('u-slogan').innerText = getVal("理念標語") || "";
    document.getElementById('u-service').innerText = getVal("服務項目") || "";

    // B. 圖片轉碼 (解決 Drive 連結裂開問題)
    const fixImg = (url) => {
      if(!url) return "";
      // 自動轉換 Google Drive 的分享連結為直接顯示格式
      return url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=drivesdk", "").replace("open?id=", "uc?export=view&id=");
    };

    const mainImg = getVal("個人專業形象照");
    if (mainImg) {
      document.getElementById('u-img').src = fixImg(mainImg);
    }

    // C. 產品相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const album = getVal("產品或品牌或活動照片") || "";
    album.split(",").forEach(src => {
      if(src.trim()) {
        const img = document.createElement('img');
        img.src = fixImg(src.trim());
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // D. 方案與樣式連動 (觸發重繪)
    const isPremium = getVal("請選擇製作方案") === "b.精品設計款";
    const pMap = { "酒紅":"p1", "深藍":"p2", "金箔":"p4", "霧紫":"p3" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3" };
    
    const theme = isPremium ? (pMap[getVal("底色")] || 'p4') : (fMap[getVal("顏色")] || 'color-1');
    window.setV382(isPremium ? 'premium' : 'free', theme);

  } catch (e) {
    console.error("連線發生異常:", e);
    alert("系統連線異常，請確認您的 GAS 部署設定為「所有人」。");
  }
}

// 其餘樣式控制函數 (setV382, applyStyles) 維持 V385.6 邏輯...
// [此處省略部分重複的樣式函數，請與前一版保持一致]

window.onload = () => { loadV385Data(); };
