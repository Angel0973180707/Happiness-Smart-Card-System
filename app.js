
const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/3r2ZePN",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v524.1",
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/"
};

window.__triggerPwaInstall = async function(){
  if (window.matchMedia('(display-mode: standalone)').matches) {
    alert("已經安裝在桌面");
    return;
  }
  alert("請使用瀏覽器選單 → 安裝應用程式 / 加入主畫面");
};

window.renderQr = function({container,url,size=160}){
  if(!container) return;
  container.innerHTML="";
  if(window.QRCode){
    new QRCode(container,{text:url,width:size,height:size});
  }else{
    const img=document.createElement("img");
    img.src="https://quickchart.io/qr?size="+size+"&text="+encodeURIComponent(url);
    img.style.width="100%";
    container.appendChild(img);
  }
};
