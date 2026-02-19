/**
 * 幸福智慧名片 V385.2 - 終極修正版
 * 特色：模糊匹配欄位名稱、Token 自動驗證、Drive 圖片轉址
 */

const CONFIG = {
  // ✅ 您的 GAS 部署網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777",
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774" // 對應您的試算表首筆資料
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

// ==========================================
// 1. 核心數據抓取 (欄位名稱清洗與連線修復)
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  // 帶上 Token 才能過 GAS 那一關
  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;
  console.log("正在嘗試連線至:", finalUrl);

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();

    if (!json.ok) {
      return alert(`連線失敗：${json.message}\n(請檢查 ID 是否正確)`);
    }

    const d = json.data;
    
    // 🔴 核心修復：欄位名稱清洗函數 (移除引號、換行、空格)
    const cleanKey = (key) => key.replace(/["\n\r\s]/g, "");
    const getSafeVal = (targetKey) => {
      const target = cleanKey(targetKey);
      for (let k in d) {
        if (cleanKey(k).includes(target) || target.includes(cleanKey(k))) return d[k];
      }
      return "";
    };

    // A. 基礎文字映射
    document.getElementById('u-name').innerText = getSafeVal("姓名（名片大標題）") || "小天使";
    document.getElementById('u-unit').innerText = getSafeVal("單位名稱") || "";
    document.getElementById('u-slogan').innerText = getSafeVal("理念標語") || "";
    document.getElementById('u-service').innerText = getSafeVal("服務項目") || "";

    // B. 圖片處理 (Drive 轉址)
    const fixImg = (url) => {
      if(!url) return "";
      return url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=drivesdk", "").replace("open?id=", "uc?export=view&id=");
    };

    if (getSafeVal("個人專業形象照")) {
      document.getElementById('u-img').src = fixImg(getSafeVal("個人專業形象照"));
    }

    // C. 產品滑動相簿 (處理逗號分隔的網址)
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const rawImgs = getSafeVal("產品或品牌或活動照片") || "";
    const pImgs = rawImgs.split(","); 
    pImgs.forEach(src => {
      if(src.trim()) {
        const img = document.createElement('img');
        img.src = fixImg(src.trim());
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // D. 自動變色連動
    const isPremium = getSafeVal("請選擇製作方案") === "b.精品設計款";
    const pMap = { "酒紅":"p1", "深藍":"p2", "金箔":"p4", "霧紫":"p3" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3", "綠":"color-5" };
    
    const mode = isPremium ? 'premium' : 'free';
    const theme = isPremium ? 
        (pMap[getSafeVal("精品設計款")] || 'p4') : 
        (fMap[getSafeVal("自由搭配款")] || 'color-2');

    window.setV382(mode, theme);

  } catch (e) {
    alert("網路異常，請確認 GAS 是否已部署為「所有人」可存取。");
  }
}

// ==========================================
// 2. 樣式切換與後台工具 (V384 基準)
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

// 隱形入口
let count = 0;
window.triggerLock = () => { if(++count >= 3) { document.getElementById('lock-mask').style.display='flex'; count=0; } };
window.verifyLock = () => {
  if(document.getElementById('pass-input').value === CONFIG.PASS) {
    document.getElementById('delivery-bar').style.display='flex';
    document.getElementById('lock-mask').style.display='none';
  } else { alert("密碼錯誤"); }
};

window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(url).then(() => alert("連結已複製"));
};

window.onload = () => { loadV385Data(); };
