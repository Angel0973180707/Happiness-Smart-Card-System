const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777"
};

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
  } else { alert('密碼錯誤'); }
};

async function loadV385Data() {
  const id = document.getElementById('id-input').value;
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${id}`);
    const json = await res.json();
    const d = json.data;

    document.getElementById('u-name').innerText = d["姓名（名片大標題）"];
    document.getElementById('u-slogan').innerText = d["理念標語（顯示在照片下方，精簡有力）"];
    document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];
    
    // 左右滑動相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const pImgs = (d["產品或品牌或活動照片最多3張（內容區插圖）"] || "").split("\n");
    pImgs.forEach(img => { if(img) slider.innerHTML += `<img src="${img}" class="product-img">`; });

    // 自動導航
    const addr = d["影音平台 3（或地址）"];
    if(addr) document.getElementById('u-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

    // 自動判斷方案切換版型
    const isPremium = d["請選擇製作方案？"] === "b.精品設計款";
    window.setV382(isPremium ? 'premium' : 'free', isPremium ? 'p1' : 'color-1');
  } catch(e) { alert("讀取異常，請檢查網路或 ID"); }
}
