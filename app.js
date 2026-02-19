/**
 * 幸福智慧名片 V385.4 - 終極修復版
 * 修復：1. Token 自動帶入連線 2. Drive 圖片轉碼 3. 自由款樣式切換失效
 */

const CONFIG = {
  // ✅ 您的 GAS 部署網址
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  DEFAULT_ID: "TW0001",
  DEFAULT_TOKEN: "2d0e8ff827044774" // 🔴 這是關鍵！沒帶這串連線會被擋下
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };
let currentAdminRows = []; 

// ==========================================
// 1. 核心數據抓取 (修復連線與圖片)
// ==========================================

async function loadV385Data() {
  const urlParams = new URLSearchParams(window.location.search);
  const idInput = document.getElementById('id-input').value.trim();
  
  const targetID = idInput || urlParams.get('id') || CONFIG.DEFAULT_ID;
  const targetToken = urlParams.get('token') || (targetID === CONFIG.DEFAULT_ID ? CONFIG.DEFAULT_TOKEN : "");

  // 🔴 強制帶上 Token 與時間戳，確保 Google 後台放行
  const finalUrl = `${CONFIG.GAS}?id=${targetID}&token=${targetToken}&t=${Date.now()}`;
  console.log("正在嘗試連線至:", finalUrl);

  try {
    const res = await fetch(finalUrl);
    const json = await res.json();
    if (!json.ok) {
      console.error("連線錯誤:", json.message);
      return; 
    }

    const d = json.data;
    
    // 模糊匹配欄位 (解決引號與換行問題)
    const getSafeVal = (key) => {
      const target = key.replace(/["\n\r\s]/g, "");
      for (let k in d) {
        if (k.replace(/["\n\r\s]/g, "").includes(target)) return d[k];
      }
      return "";
    };

    // 填充文字
    document.getElementById('u-name').innerText = getSafeVal("姓名") || "小天使";
    document.getElementById('u-unit').innerText = getSafeVal("單位名稱") || "";
    document.getElementById('u-slogan').innerText = getSafeVal("理念標語") || "";
    document.getElementById('u-service').innerText = getSafeVal("服務項目") || "";

    // 🔴 圖片修復邏輯 (Google Drive 轉碼)
    const fixImg = (url) => {
      if(!url) return "";
      // 將 open?id= 轉為直接顯示的 uc?id=
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

    // 自動判斷方案與顏色
    const isPremium = getSafeVal("請選擇製作方案") === "b.精品設計款";
    const pMap = { "酒紅":"p1", "深藍":"p2", "金箔":"p4", "霧紫":"p3" };
    const fMap = { "藍":"color-2", "紅":"color-1", "橘":"color-3" };
    
    const theme = isPremium ? (pMap[getSafeVal("底色")] || 'p4') : (fMap[getSafeVal("顏色")] || 'color-2');
    window.setV382(isPremium ? 'premium' : 'free', theme);

  } catch (e) { console.error("連線過程出錯", e); }
}

// ==========================================
// 2. 修復：樣式切換失效問題 (按鈕連動)
// ==========================================

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  applyV382Styles();
};

window.setV382Style = function(style, el) {
  state.style = style; // 拱形、平直、晨曦
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper; // 紙質感
  if (el) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382Styles();
};

function applyV382Styles() {
  const isFree = state.mode === 'free';
  
  // 面板顯示連動
  document.getElementById('free-controls').style.display = isFree ? 'block' : 'none';
  const premPanel = document.getElementById('premium-controls');
  if(premPanel) premPanel.style.display = isFree ? 'none' : 'block';

  // 🔴 核心修復：精準清除並套用 Class
  const classesToRemove = [
    'mode-free', 'mode-premium', 'color-1', 'color-2', 'color-3', 'color-4', 'color-5',
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
    'style-arch', 'style-flat', 'style-spot', 'paper-1', 'paper-2', 'paper-3'
  ];
  document.body.classList.remove(...classesToRemove);

  document.body.classList.add(`mode-${state.mode}`);
  document.body.classList.add(state.theme);
  
  if (isFree) {
    document.body.classList.add(`style-${state.style}`);
    document.body.classList.add(state.paper);
  }
}

// ==========================================
// 3. 管理後台與交貨系統 (不寫死密碼)
// ==========================================

let tapCount = 0;
window.triggerLock = () => { if(++tapCount >= 3) { document.getElementById('lock-mask').style.display='flex'; tapCount=0; } };

window.verifyLock = async () => {
  const inputPass = document.getElementById('pass-input').value;
  const checkUrl = `${CONFIG.GAS}?action=admin_list&key=${inputPass}`;
  try {
    const res = await fetch(checkUrl);
    const json = await res.json();
    if (json.ok) {
      currentAdminRows = json.rows; 
      document.getElementById('delivery-bar').style.display = 'flex';
      document.getElementById('lock-mask').style.display = 'none';
      document.getElementById('pass-input').value = "";
      alert("管理員登入成功！");
    } else { alert("驗證失敗"); }
  } catch (e) { alert("連線驗證失敗"); }
};

window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';

window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  const row = currentAdminRows.find(r => r.id === id);
  const token = row ? row.token : "";
  const url = `${window.location.origin}${window.location.pathname}?id=${id}${token ? '&token='+token : ''}`;
  navigator.clipboard.writeText(url).then(() => alert("交貨網址已複製！"));
};

window.onload = () => { loadV385Data(); };
