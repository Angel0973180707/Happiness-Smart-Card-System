/**
 * 幸福智慧名片 V385.5 - 旗艦終極修復版
 * 解決：1.圖片裂開 2.按鈕失效 3.Token驗證 4.欄位引號 5.密碼隱形
 */

const CONFIG = {
  // ✅ 您的 GAS 部署網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774" // 對應試算表 TW0001 的 token
};

// 初始狀態
let state = { 
  mode: 'free', 
  theme: 'color-1', 
  style: 'arch', 
  paper: 'paper-1' 
};

let currentAdminRows = []; // 暫存管理員抓取的 Token 清單

// ==========================================
// 1. 核心數據抓取 (解決圖片與連線問題)
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  // 帶上 Token 與時間戳，確保 GAS 放行
  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;
  console.log("正在連線:", finalUrl);

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();
    if (!json.ok) return console.error("GAS 報錯:", json.message);

    const d = json.data;
    
    // 模糊匹配欄位名稱 (適應帶有引號、換行或空格的標頭)
    const getSafeVal = (key) => {
      const target = key.replace(/["\n\r\s]/g, "");
      for (let k in d) {
        if (k.replace(/["\n\r\s]/g, "").includes(target)) return d[k];
      }
      return "";
    };

    // 填充文字內容
    document.getElementById('u-name').innerText = getSafeVal("姓名") || "載入中...";
    document.getElementById('u-unit').innerText = getSafeVal("單位名稱") || "";
    document.getElementById('u-slogan').innerText = getSafeVal("理念標語") || "";
    document.getElementById('u-service').innerText = getSafeVal("服務項目") || "";

    // 🔴 圖片修復邏輯 (Google Drive 連結轉為直接顯示網址)
    const fixImg = (url) => {
      if(!url) return "";
      return url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=drivesdk", "").replace("open?id=", "uc?export=view&id=");
    };

    if (getSafeVal("個人專業形象照")) {
      document.getElementById('u-img').src = fixImg(getSafeVal("個人專業形象照"));
    }

    // 展示相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const rawImgs = getSafeVal("產品或品牌或活動照片") || "";
    rawImgs.split(",").forEach(src => {
      if(src.trim()) {
        const img = document.createElement('img');
        img.src = fixImg(src.trim());
        img.className = 'product-img';
        slider.appendChild(img);
      }
    });

    // 自動判斷方案與顏色連動
    const isPremium = getSafeVal("請選擇製作方案") === "b.精品設計款";
    const pMap = { "酒紅":"p1", "深藍":"p2", "金箔":"p4", "霧紫":"p3", "藍灰":"p5", "胭脂":"p6", "褐碳":"p7" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3", "紫":"color-4", "綠":"color-5" };
    
    const targetTheme = isPremium ? 
        (pMap[getSafeVal("底色")] || 'p4') : 
        (fMap[getSafeVal("顏色")] || 'color-1');

    window.setV382(isPremium ? 'premium' : 'free', targetTheme);

  } catch (e) {
    console.error("連線出錯", e);
  }
}

// ==========================================
// 2. 樣式切換邏輯 (解決自由款按鈕失效)
// ==========================================

// 切換模式與主題 (顏色)
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  
  // 更新點選狀態 (Dots)
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  
  applyV382Styles();
};

// 切換版型 (拱形/平直/晨曦)
window.setV382Style = function(style, el) {
  state.style = style;
  console.log("切換版型為:", style);
  
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

// 切換紙感
window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

// 🔴 核心：強制重洗 Body Class (解決 CSS 衝突)
function applyV382Styles() {
  const isFree = (state.mode === 'free');
  
  // 控制面板顯隱
  const fCtrl = document.getElementById('free-controls');
  const pCtrl = document.getElementById('premium-controls');
  if (fCtrl) fCtrl.style.display = isFree ? 'block' : 'none';
  if (pCtrl) pCtrl.style.display = isFree ? 'none' : 'block';

  // 清除舊 Class
  const classList = [
    'mode-free', 'mode-premium', 
    'color-1', 'color-2', 'color-3', 'color-4', 'color-5',
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
    'style-arch', 'style-flat', 'style-spot',
    'paper-1', 'paper-2', 'paper-3'
  ];
  document.body.classList.remove(...classList);

  // 套用新 Class
  document.body.classList.add(`mode-${state.mode}`);
  document.body.classList.add(state.theme);
  
  if (isFree) {
    document.body.classList.add(`style-${state.style}`);
    document.body.classList.add(state.paper);
  }
}

// ==========================================
// 3. 安全管理與交貨系統
// ==========================================

let tapCount = 0;
window.triggerLock = () => { if(++tapCount >= 3) { document.getElementById('lock-mask').style.display='flex'; tapCount=0; } };

window.verifyLock = async () => {
  const passEl = document.getElementById('pass-input');
  const inputPass = passEl.value;
  
  // 向 GAS 發起驗證 (密碼為您在 GAS 設定的 ADMIN_KEY)
  const checkUrl = `${CONFIG.GAS}?action=admin_list&key=${inputPass}`;
  
  try {
    const res = await fetch(checkUrl);
    const json = await res.json();
    
    if (json.ok) {
      currentAdminRows = json.rows; 
      document.getElementById('delivery-bar').style.display = 'flex';
      document.getElementById('lock-mask').style.display = 'none';
      passEl.value = "";
      alert("管理員登入成功！");
    } else {
      alert("驗證失敗，請檢查密碼。");
      passEl.value = "";
    }
  } catch (e) { alert("連線驗證失敗"); }
};

window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';

window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  if (!id) return alert("請先載入 ID");

  // 從管理清單找對應 Token
  const row = currentAdminRows.find(r => r.id === id);
  const token = row ? row.token : "";
  
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const finalUrl = token ? `${baseUrl}?id=${id}&token=${token}` : `${baseUrl}?id=${id}`;
  
  navigator.clipboard.writeText(finalUrl).then(() => {
    alert(`【交貨網址已複製】\nID: ${id}\n(已包含安全密鑰)`);
  });
};

// 初始化載入
window.onload = () => { loadV385Data(); };
