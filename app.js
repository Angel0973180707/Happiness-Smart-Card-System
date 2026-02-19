
(function(){
  const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
    DEFAULT_ID: "TW0001",
    DEFAULT_TOKEN: ""
  };

  function qs(name){
    return new URLSearchParams(location.search).get(name);
  }

  async function load(){
    const id = qs("id") || CONFIG.DEFAULT_ID;
    const token = qs("token") || CONFIG.DEFAULT_TOKEN;

    try{
      const url = CONFIG.GAS + "?action=card&id=" + id + (token ? "&token=" + token : "");
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if(!json.ok) return;

      const d = json.data || {};

      setText("u-name", d["姓名（名片大標題）"] || "");
      setText("u-unit", d["單位名稱（如：幸福教養概念館）"] || "");
      setText("u-service", d["服務項目（核心業務，多項可條列換行）"] || "");

      const img = d["個人專業形象照（名片主圖）"];
      if(img) document.getElementById("u-img").src = normalizeImg(img);

    }catch(e){
      console.log("load fail", e);
    }
  }

  function normalizeImg(u){
    if(u.includes("drive.google.com")) return u.replace("open?id=", "uc?export=view&id=");
    return u;
  }

  function setText(id, txt){
    const el = document.getElementById(id);
    if(el) el.innerText = txt;
  }

  window.addEventListener("load", load);
})();
