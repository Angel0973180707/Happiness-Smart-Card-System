const CONFIG = {
  CUSTOMER_SERVICE_URL: 'https://lin.ee/G3VJoRm'
};

const goldInfoBtn = document.getElementById('btn-gold-info');
const goldContactBtn = document.getElementById('btn-gold-contact');

if (goldInfoBtn) {
  goldInfoBtn.onclick = () => {
    alert('金牌級會員包含高階設計與專屬服務，請洽客服了解');
  };
}

if (goldContactBtn) {
  goldContactBtn.onclick = () => {
    const msg = encodeURIComponent('我想了解金牌級會員方案');
    window.open(CONFIG.CUSTOMER_SERVICE_URL + '?text=' + msg);
  };
}
