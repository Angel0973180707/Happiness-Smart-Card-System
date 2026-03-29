(() => {
  const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec"
  };

  const state = {
    photoMeta: {}
  };

  document.addEventListener("DOMContentLoaded", init);

  function init(){
    renderPhotos();
    document.getElementById("smart-card-form").addEventListener("submit", submit);
  }

  function renderPhotos(){
    const container = document.getElementById("photo-slots");
    const tpl = document.getElementById("photo-slot-template");

    for(let i=1;i<=3;i++){
      const frag = tpl.content.cloneNode(true);
      const file = frag.querySelector(".photo-file-input");

      state.photoMeta["photo"+i] = { x:0.5, y:0.5, scale:1, rotate:0 };

      frag.querySelector(".move-left").onclick = ()=>{
        state.photoMeta["photo"+i].x -= 0.1;
      };
      frag.querySelector(".move-right").onclick = ()=>{
        state.photoMeta["photo"+i].x += 0.1;
      };

      container.appendChild(frag);
    }
  }

  async function submit(e){
    e.preventDefault();

    const payload = {
      action:"createCardWithOfflinePayment",
      name: document.getElementById("display_name").value,
      phone: document.getElementById("phone").value,
      plan: document.querySelector('input[name="plan"]:checked').value,

      features_json:{
        photo_meta: state.photoMeta,
        preview_meta:{
          layout:"grid",
          aspect_ratio:"1:1",
          fit_mode:"cover",
          theme: document.querySelector('input[name="plan"]:checked').value
        }
      }
    };

    const res = await fetch(CONFIG.GAS_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });

    const data = await res.json();
    alert("完成："+data.card?.id);
  }
})();
