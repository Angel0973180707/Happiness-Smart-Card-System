/**
 * 幸福智慧名片 V385.8 - 旗艦終極全量版
 * 功能：1.資料與圖片修復 2.版型顏色強連動 3.密碼隱身驗證 4.Token安全傳輸
 */

const CONFIG = {
  // ✅ 您的 GAS 部署網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774" // 必須與試算表內 token 一致
};

// 🔴 初始狀態 (持久化紀錄)
let state = { 
  mode: 'free', 
  theme: 'color-1', 
  style: 'arch', 
  paper: 'paper-1' 
};

let currentAdminRows = []; // 暫存 Token 清單

// ==========================================
// 1. 數據抓取引擎 (優先修復抓不到資料與圖片問題)
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  // 帶上 Token 通過 GAS 門禁
  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;
  console.log("正在發起資料連線:", finalUrl);

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();
    if (!json.ok) return console.error("GAS 報錯:", json.message);

    const d = json.data;
    
    // 模糊匹配欄位 (適應帶有引號、換行的標頭)
    const getSafeVal = (key) => {
      const target = key.replace(/["\n\r\s]/g, "");
      for (let k in d) {
        if (k.replace(/["\n\r\s]/g, "").includes(target)) return d[k];
      }
      return "";
    };

    // A. 文字映射
    document.getElementById('u-name').innerText = getSafeVal("姓名") || "載入中...";
    document.getElementById('u-unit').innerText = getSafeVal("單位名稱") || "";
    document.getElementById('u-slogan').innerText = getSafeVal("理念標語") || "";
    document.getElementById('u-service').innerText = getSafeVal("服務項目") || "";

    // B. 圖片修復 (Google Drive 轉碼)
    const fixImg = (url) => url ? url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=drivesdk", "").replace("open?id=", "uc?export=view&id=") : "";
    
    const mainImg = getSafeVal("個人專業形象照");
    if (mainImg) document.getElementById('u-img').src = fixImg(mainImg);

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

    // C. 自動連動樣式
    const isPremium = getSafeVal("請選擇製作方案") === "b.精品設計款";
    const pMap = { "酒紅":"p1", "深藍":"p2", "金箔":"p4", "霧紫":"p3" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3" };
    
    const targetTheme = isPremium ? (pMap[getSafeVal("底色")] || 'p4') : (fMap[getSafeVal("顏色")] || 'color-1');
    window.setV382(isPremium ? 'premium' : 'free', targetTheme);

  } catch (e) { console.error("連線錯誤", e); }
}

// ==========================================
// 2. 樣式切換引擎 (解決版型按鈕失效問題)
// ==========================================

// 套用總樣式
function applyV382Styles() {
  const isFree = (state.mode === 'free');
  
  // 面板顯隱
  const fCtrl = document.getElementById('free-controls');
  const pCtrl = document.getElementById('premium-controls');
  if (fCtrl) fCtrl.style.display = isFree ? 'block' : 'none';
  if (pCtrl) pCtrl.style.display = isFree ? 'none' : 'block';

  // 🔴 徹底重置 Body Class
  const classList = [
    'mode-free', 'mode-premium', 
    'color-1', 'color-2', 'color-3', 'color-4', 'color-5',
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
    'style-arch', 'style-flat', 'style-spot',
    'paper-1', 'paper-2', 'paper-3'
  ];
  document.body.classList.remove(...classList);

  // 重新裝填 state 內的最新值
  document.body.classList.add(`mode-${state.mode}`);
  document.body.classList.add(state.theme);
  
  if (isFree) {
    document.body.classList.add(`style-${state.style}`);
    document.body.classList.add(state.paper);
  }
}

// 切換模式與顏色
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  applyV382Styles();
};

// 切換版型 (拱形、平直、晨曦)
window.setV382Style = function(style, el) {
  state.style = style;
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

// ==========================================
// 3. 安全管理系統 (密碼隱身 + 交貨自動化)
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
    alert("管理員登入成功！");
  } else { alert("驗證失敗"); passEl.value = ""; }
};

window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';

window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  const row = currentAdminRows.find(r => r.id === id);
  const token = row ? row.token : "";
  const url = `${window.location.origin}${window.location.pathname}?id=${id}${token ? '&token='+token : ''}`;
  navigator.clipboard.writeText(url).then(() => alert("帶 Token 的交貨網址已複製！"));
};

window.onload = () => { loadV385Data(); };
