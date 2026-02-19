const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777"
};

let clickCount = 0;
// 🔒 喚醒驗證層
window.triggerLock = () => {
  clickCount++;
  if (clickCount >= 3) {
    document.getElementById('lock-mask').style.display = 'flex';
    clickCount = 0;
  }
};

// 🔓 驗證並開啟後台
window.verifyLock = () => {
  const val = document.getElementById('pass-input').value;
  if (val === CONFIG.PASS) {
    document.getElementById('admin-panel').style.display = 'block';
    document.getElementById('lock-mask').style.display = 'none';
    document.getElementById('pass-input').value = ""; // 歸還隱形
  } else {
    alert("驗證失敗");
  }
};

window.closeLock = () => {
  document.getElementById('lock-mask').style.display = 'none';
  document.getElementById('pass-input').value = "";
};

// 🚀 GAS 數據對接載入
async function loadV385Data() {
  const id = document.getElementById('id-input').value.trim();
  if(!id) return alert("請輸入序號");

  try {
    const res = await fetch(`${CONFIG.GAS}?id=${id}`);
    const json = await res.json();
    if(!json.ok) return alert("找不到資料，請檢查試算表欄位名稱");
    const d = json.data;

    // 映射所有欄位 (根據截圖 JSON 結構)
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"];
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"] || "";

    // 左右滑動展示區
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const pImgs = (d["產品或品牌或活動照片最多3張（內容區插圖）"] || "").split("\n");
    pImgs.forEach(img => { if(img.trim()) slider.innerHTML += `<img src="${img.trim()}" class="product-img">`; });

    // 自動導覽
    const addr = d["影音平台 3（或地址）"];
    if(addr && (addr.includes("路") || addr.includes("市"))) {
      document.getElementById('u-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }

    // 自動切換方案
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    window.setV382(isPremium ? 'premium' : 'free', isPremium ? 'p1' : 'color-1');

  } catch(e) { console.error(e); alert("連線失敗，請檢查 GAS API 權限"); }
}

window.setV382 = function(mode, theme) {
  document.body.className = `mode-${mode} ${theme}`;
};
