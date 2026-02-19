const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  PASS: "167777"
};

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
    document.getElementById('delivery-panel').style.display = 'flex';
    document.getElementById('lock-mask').style.display = 'none';
  } else { alert("驗證失敗"); }
};

window.closeLock = () => document.getElementById('lock-mask').style.display = 'none';

// --- 複製交貨網址邏輯 ---
window.copyUrl = () => {
  const id = document.getElementById('id-input').value.trim();
  if(!id) return alert("請先載入成品");
  // 這裡假設您的交貨網址格式如下，可根據實際部署微調
  const finalUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
  navigator.clipboard.writeText(finalUrl).then(() => {
    alert(`交貨網址已複製：\n${finalUrl}`);
  });
};

async function loadV385Data() {
  const id = document.getElementById('id-input').value.trim();
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${id}`);
    const json = await res.json();
    const d = json.data;

    // 映射所有欄位 (同 V385 邏輯)
    document.getElementById('u-name').innerText = d["姓名（名片大標題）"];
    document.getElementById('u-img').src = d["個人專業形象照（名片主圖）"];
    
    // 滑動相簿
    const slider = document.getElementById('u-slider');
    slider.innerHTML = "";
    const pImgs = (d["產品或品牌或活動照片最多3張（內容區插圖）"] || "").split("\n");
    pImgs.forEach(img => { if(img) slider.innerHTML += `<img src="${img}" class="product-img">`; });

    // 自動導航
    const addr = d["影音平台 3（或地址）"];
    if(addr) document.getElementById('u-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

  } catch(e) { alert("讀取異常"); }
}

window.setMode = (m) => {
  document.body.className = document.body.className.replace(/mode-\w+/g, '').trim();
  document.body.classList.add(`mode-${m}`);
  document.getElementById('free-ui').style.display = m==='free' ? 'block' : 'none';
  document.getElementById('premium-ui').style.display = m==='premium' ? 'block' : 'none';
};
window.setColor = (c, el) => {
  document.body.className = document.body.className.replace(/(color-\d|p\d)/g, '').trim();
  document.body.classList.add(c);
};
