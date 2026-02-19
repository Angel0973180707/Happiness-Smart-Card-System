/**
 * 幸福智慧名片 V385.2 - 終極修正版
 * 修正：1. Token 驗證 2. Drive 圖片轉址 3. 欄位換行符號清洗
 */

const CONFIG = {
  // ✅ 您的 GAS 部署網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777",
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774" // 必須與試算表 TW0001 的 token 欄位一致
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

// ==========================================
// 1. 核心數據抓取 (連線與圖片修復)
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  
  // 優先級：輸入框 > 網址參數 > 預設值
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  // 🔴 關鍵：連線必須帶上 Token
  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;
  
  console.log("正在發起連線:", finalUrl);

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();

    if (!json.ok) {
      console.error("GAS 報錯:", json.message);
      return alert(`連線失敗：${json.message}\n(請確認 ID 與 Token 是否匹配)`);
    }

    const d = json.data;
    
    // 🔴 輔助函數：清洗試算表欄位名稱 (移除引號與換行)
    const getVal = (key) => {
      for (let k in d) {
        if (k.replace(/["\n\r]/g, "").trim() === key.replace(/["\n\r]/g, "").trim()) return d[k];
      }
      return "";
    };

    // A. 基礎文字映射
    document.getElementById('u-name').innerText = getVal("姓名（名片大標題）") || "小天使";
    document.getElementById('u-unit').innerText = getVal("單位名稱（如：幸福教養概念館）") || "";
    document.getElementById('u-slogan').innerText = getVal("理念標語（顯示在照片下方，精簡有力）") || "";
    document.getElementById('u-service').innerText = getVal("服務項目（核心業務，多項可條列換行）") || "";

    // B. Google Drive 圖片轉址 (重要：解決圖片裂開)
    const fixImg = (url) => {
      if(!url) return "";
      return url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=drivesdk", "").replace("open?id=", "uc?export=view&id=");
    };

    if (getVal("個人專業形象照（名片主圖）")) {
      document.getElementById('u-img').src = fixImg(getVal("個人專業形象照（名片主圖）"));
    }

    // C. 左右滑動展示相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const rawImgs = getVal("產品或品牌或活動照片最多3張（內容區插圖）") || "";
    const pImgs = rawImgs.split(","); // 您的試算表目前是以逗號隔開
    
    pImgs.forEach(src => {
      if(src.trim()) {
        const img = document.createElement('img');
        img.src = fixImg(src.trim());
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // D. 智能地圖導航
    const addr = getVal("影音平台 3（或地址）");
    if (addr && addr.includes("市")) {
      document.getElementById('u-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }

    // E. 自動方案判定與變色
    const isPremium = getVal("請選擇製作方案？") === "b.精品設計款";
    const pMap = { "酒紅":"p1", "深藍":"p2", "霧紫":"p3", "金箔":"p4", "藍灰":"p5", "胭脂":"p6", "褐碳":"p7" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3", "紫":"color-4", "綠":"color-5" };
    
    const mode = isPremium ? 'premium' : 'free';
    const theme = isPremium ? 
        (pMap[getVal("你喜歡的底色（精品設計款適用）")] || 'p4') : 
        (fMap[getVal("您喜歡的顏色（自由搭配款適用）")] || 'color-2');

    window.setV382(mode, theme);

  } catch (e) {
    alert("網路連線異常，請檢查 GAS 部署是否設為「所有人」。");
  }
}

// ==========================================
// 2. 樣式切換與行政工具 (維持原邏輯)
// ==========================================

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  applyV382Styles();
};

function applyV382Styles() {
  const isFree = state.mode === 'free';
  document.getElementById('free-controls').style.display = isFree ? 'block' : 'none';
  document.getElementById('premium-controls').style.display = isFree ? 'none' : 'block';
  document.body.className = `mode-${state.mode} ${state.theme} style-${state.style} ${state.paper}`;
}

let count = 0;
window.triggerLock = () => { if(++count >= 3) { document.getElementById('lock-mask').style.display='flex'; count=0; } };
window.verifyLock = () => {
  if(document.getElementById('pass-input').value === CONFIG.PASS) {
    document.getElementById('delivery-bar').style.display='flex';
    document.getElementById('lock-mask').style.display='none';
  } else { alert("密碼錯誤"); }
};
window.closeLock = () => document.getElementById('lock-mask').style.display='none';

window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  if(!id) return alert("請先載入");
  // 這裡建議您未來從 GAS API 獲取對應 token，目前暫以 ID 為主
  const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(url).then(() => alert("已複製基礎網址"));
};

window.onload = () => { loadV385Data(); };
