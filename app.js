const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777"
};

let clickCount = 0;
// 🔒 隱形入口觸發
window.triggerLock = () => {
  clickCount++;
  if (clickCount >= 3) {
    document.getElementById('lock-mask').style.display = 'flex';
    clickCount = 0;
  }
};

window.verifyLock = () => {
  if (document.getElementById('pass-input').value === CONFIG.PASS) {
    document.getElementById('admin-panel').style.display = 'block';
    document.getElementById('lock-mask').style.display = 'none';
    document.getElementById('pass-input').value = "";
  } else { alert('驗證失敗'); }
};

window.closeLock = () => {
  document.getElementById('lock-mask').style.display = 'none';
};

// 🚀 GAS 數據全自動載入 (V385 版)
async function loadV385Data() {
  const id = document.getElementById('id-input').value.trim();
  if(!id) return alert("請輸入序號");

  try {
    const res = await fetch(`${CONFIG.GAS}?id=${id}`);
    const json = await res.json();
    if(!json.ok) return alert("找不到序號");
    const d = json.data;

    // 1. 映射基礎欄位
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"];
    document.getElementById('u-unit').innerText = d["單位名稱（如：幸福教養概念館）"] || "";
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"] || "";
    document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];
    document.getElementById('u-service').innerText = d["服務項目（核心業務，多項可條列換行）"];

    // 2. 頭銜解析 (勳章標籤)
    const titlesDiv = document.getElementById('u-titles');
    titlesDiv.innerHTML = "";
    const titles = (d["重要頭銜/獎銜（權威背書項目，多項可條列換行）"] || "").split("\n");
    titles.forEach(t => { if(t) titlesDiv.innerHTML += `<span style="background:rgba(0,0,0,0.05); padding:4px 10px; border-radius:15px; font-size:10px; font-weight:700;">${t}</span>`; });

    // 3. 左右滑動展示圖 (3張)
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const imgs = [d["產品圖1"], d["產品圖2"], d["產品圖3"]]; // 假設欄位名
    imgs.forEach(src => { if(src) slider.innerHTML += `<img src="${src}" class="product-img">`; });

    // 4. 地址自動導航
    const addr = d["影音平台 3（或地址）"];
    if(addr && (addr.includes("市") || addr.includes("路"))) {
      document.getElementById('u-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }

    // 5. 自動切換方案
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    document.body.className = `mode-${isPremium ? 'premium' : 'free'} ${isPremium ? 'p4' : 'color-1'}`;

  } catch(e) { alert("讀取異常"); }
}

window.onload = () => { /* 預設載入 logic */ };
