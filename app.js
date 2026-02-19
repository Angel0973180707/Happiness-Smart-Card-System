/**
 * 幸福智慧名片 V385.6 - 強連動修正版
 * 解決：顏色切換後版型消失、按鈕狀態不連動問題
 */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774"
};

// 🔴 核心狀態管理
let state = { 
  mode: 'free', 
  theme: 'color-1', 
  style: 'arch', 
  paper: 'paper-1' 
};

let currentAdminRows = [];

// ==========================================
// 1. 樣式套用引擎 (解決不連動的關鍵)
// ==========================================

function applyV382Styles() {
  const isFree = (state.mode === 'free');
  
  // A. 切換控制面板顯隱
  const fCtrl = document.getElementById('free-controls');
  const pCtrl = document.getElementById('premium-controls');
  if (fCtrl) fCtrl.style.display = isFree ? 'block' : 'none';
  if (pCtrl) pCtrl.style.display = isFree ? 'none' : 'block';

  // B. 🔴 徹底清空所有樣式類別 (包含模式、顏色、版型、紙感)
  const allPossibleClasses = [
    'mode-free', 'mode-premium', 
    'color-1', 'color-2', 'color-3', 'color-4', 'color-5',
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
    'style-arch', 'style-flat', 'style-spot',
    'paper-1', 'paper-2', 'paper-3'
  ];
  document.body.classList.remove(...allPossibleClasses);

  // C. 重新依序套用當前狀態 (確保兩者共存)
  document.body.classList.add(`mode-${state.mode}`);
  document.body.classList.add(state.theme); // 套用顏色
  
  if (isFree) {
    document.body.classList.add(`style-${state.style}`); // 🔴 確保版型被套用
    document.body.classList.add(state.paper); // 套用紙感
  }

  console.log("當前樣式組合:", state);
}

// ==========================================
// 2. 使用者操作函數 (OnClick 連動)
// ==========================================

// 點擊圓點切換主題 (顏色)
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新圓點 active 狀態
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  
  applyV382Styles(); // 🔴 執行時會保留目前的 state.style
};

// 切換版型 (拱形/平直/晨曦)
window.setV382Style = function(style, el) {
  state.style = style;
  
  // 更新按鈕 active 狀態
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

// 切換紙質感
window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

// ==========================================
// 3. 數據抓取 (維持 V385.5 穩定邏輯)
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();
    if (!json.ok) return;

    const d = json.data;
    const getSafeVal = (key) => {
      const target = key.replace(/["\n\r\s]/g, "");
      for (let k in d) {
        if (k.replace(/["\n\r\s]/g, "").includes(target)) return d[k];
      }
      return "";
    };

    // 填充內容
    document.getElementById('u-name').innerText = getSafeVal("姓名") || "載入中...";
    document.getElementById('u-unit').innerText = getSafeVal("單位名稱") || "";
    document.getElementById('u-slogan').innerText = getSafeVal("理念標語") || "";
    document.getElementById('u-service').innerText = getSafeVal("服務項目") || "";

    // 圖片轉碼
    const fixImg = (url) => url ? url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=drivesdk", "").replace("open?id=", "uc?export=view&id=") : "";
    document.getElementById('u-img').src = fixImg(getSafeVal("個人專業形象照"));

    // 相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    (getSafeVal("產品或品牌或活動照片") || "").split(",").forEach(src => {
      if(src.trim()) {
        const img = document.createElement('img');
        img.src = fixImg(src.trim());
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // 🔴 初始方案自動套用 (這會觸發第一次 applyV382Styles)
    const isPremium = getSafeVal("請選擇製作方案") === "b.精品設計款";
    const pMap = { "酒紅":"p1", "深藍":"p2", "金箔":"p4", "霧紫":"p3" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3" };
    
    const theme = isPremium ? (pMap[getSafeVal("底色")] || 'p4') : (fMap[getSafeVal("顏色")] || 'color-1');
    window.setV382(isPremium ? 'premium' : 'free', theme);

  } catch (e) { console.error(e); }
}

// ==========================================
// 4. 安全鎖與交貨 (維持原邏輯)
// ==========================================

let tapCount = 0;
window.triggerLock = () => { if(++tapCount >= 3) { document.getElementById('lock-mask').style.display='flex'; tapCount=0; } };
window.verifyLock = async () => {
  const passEl = document.getElementById('pass-input');
  const res = await fetch(`${CONFIG.GAS}?action=admin_list&key=${passEl.value}`);
  const json = await res.json();
  if (json.ok) {
    currentAdminRows = json.rows;
    document.getElementById('delivery-bar').style.display = 'flex';
    document.getElementById('lock-mask').style.display = 'none';
    passEl.value = "";
  } else { alert("驗證失敗"); }
};
window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';
window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  const row = currentAdminRows.find(r => r.id === id);
  const token = row ? row.token : "";
  const url = `${window.location.origin}${window.location.pathname}?id=${id}${token ? '&token='+token : ''}`;
  navigator.clipboard.writeText(url).then(() => alert("交貨網址已複製"));
};

window.onload = () => { loadV385Data(); };
