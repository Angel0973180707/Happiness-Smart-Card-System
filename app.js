const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777"
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

// 🔒 隱形後台解鎖邏輯
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
  } else { alert("驗證失敗"); }
};

window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';

// 🚀 V385 全自動數據載入
async function loadV385Data() {
  const id = document.getElementById('id-input').value.trim();
  if(!id) return;
  
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${id}`);
    const json = await res.json();
    const d = json.data;

    // 1. 文字映射
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"];
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"];

    // 2. 形象照
    if(d["個人專業形象照（名片主圖）"]) document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];

    // 3. 左右滑動展示區
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const pImgs = (d["產品或品牌或活動照片最多3張（內容區插圖）"] || "").split("\n");
    pImgs.forEach(img => { if(img.trim()) slider.innerHTML += `<img src="${img.trim()}" class="product-img">`; });

    // 4. 地圖導航自動化
    const addr = d["影音平台 3（或地址）"];
    if(addr && (addr.includes("路") || addr.includes("市"))) {
      document.getElementById('u-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }

    // 5. 自動判斷方案切換
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    window.setV382(isPremium ? 'premium' : 'free', isPremium ? 'p1' : 'color-1');

  } catch(e) { alert("讀取異常，請檢查試算表欄位名稱"); }
}

// 🔗 複製交貨網址
window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  if(!id) return alert("請先載入成品");
  const finalUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(finalUrl).then(() => alert("交貨網址已複製！"));
};

// ... 原 V384 之 setV382, setV382Style, setV382Paper 邏輯完全保留 ...
