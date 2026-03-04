/* =========================================
 HSC form.js v509
 COMPLETE OVERWRITE
 ========================================= */

(() => {

const GAS_URL =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const VERSION = 509;

window.HSC_SUBMIT = async function(payload){

  const tenant = payload.tenant || "angel";

  /* ----------------------
     STEP 1 reserve
  ---------------------- */

  const reserve = await callGAS({
    action:"reserve",
    tenant,
    plan:payload.plan || ""
  });

  if(!reserve.ok){
    throw new Error("reserve failed");
  }

  const id = reserve.id;
  const token = reserve.token;

  /* ----------------------
     STEP 2 圖片上傳
  ---------------------- */

  const images = await uploadImages(payload,tenant,id);

  /* ----------------------
     STEP 3 create
  ---------------------- */

  const create = await callGAS({

    action:"create",
    tenant,

    id,
    token,

    plan:payload.plan || "",
    color:payload.color || "",
    style:payload.style || "",
    paper:payload.paper || "",

    name:payload.name || "",
    unit:payload.unit || "",
    title:payload.title || "",
    slogan:payload.slogan || "",

    services:payload.services || "",
    experience:payload.experience || "",

    phone:payload.phone || "",
    email:payload.email || "",
    website:payload.website || "",
    address:payload.address || "",

    line_id:payload.line_id || "",
    line_url:payload.line_url || "",
    line_oa:payload.line_oa || "",
    wechat_id:payload.wechat_id || "",

    video1:payload.video1 || "",
    video2:payload.video2 || "",
    video3:payload.video3 || "",

    social1:payload.social1 || "",
    social2:payload.social2 || "",
    social3:payload.social3 || "",

    avatar_img:images.avatar_img || "",
    logo_img:images.logo_img || "",
    photo1_img:images.photo1_img || "",
    photo2_img:images.photo2_img || "",
    photo3_img:images.photo3_img || "",
    photo4_img:images.photo4_img || "",
    photo5_img:images.photo5_img || ""

  });

  if(!create.ok){
    throw new Error("create failed");
  }

  return {
    ok:true,
    id,
    token
  };

};


/* =========================================
 GAS 呼叫器
 ========================================= */

async function callGAS(params){

  const qs = new URLSearchParams(params);

  const GET_URL = GAS_URL + "?" + qs.toString();

  try{

    const res = await fetch(GET_URL,{method:"GET"});

    return await res.json();

  }catch(err){

    /* fallback POST */

    const res = await fetch(GAS_URL,{
      method:"POST",
      headers:{
        "Content-Type":
        "application/x-www-form-urlencoded"
      },
      body:qs.toString()
    });

    return await res.json();

  }

}


/* =========================================
 Firebase 上傳
 ========================================= */

async function uploadImages(payload,tenant,id){

  const upload = window.HSC_FIREBASE_UPLOAD;

  if(!upload){
    return {};
  }

  const out={};

  if(payload.avatarFile){
    out.avatar_img =
    await upload(
      payload.avatarFile,
      `hsc_cards/${tenant}/${id}/avatar.jpg`
    );
  }

  if(payload.logoFile){
    out.logo_img =
    await upload(
      payload.logoFile,
      `hsc_cards/${tenant}/${id}/logo.jpg`
    );
  }

  if(payload.photoFiles){

    for(let i=0;i<payload.photoFiles.length;i++){

      const f = payload.photoFiles[i];

      const url =
      await upload(
        f,
        `hsc_cards/${tenant}/${id}/photo${i+1}.jpg`
      );

      out[`photo${i+1}_img`] = url;

    }

  }

  return out;

}

})();