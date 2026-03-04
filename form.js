/* ======================================================
Happiness Smart Card System
form.js v509
Fix: CORS + GAS action
====================================================== */

import { uploadAvatar, uploadCover } from "./firebase.js";
import { compressToJpeg } from "./image-compressor.js";

const VERSION="v509";

const GAS_URL="https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const $=(id)=>document.getElementById(id);


/* =======================
LOG
======================= */

function log(msg){

  const el=$("log");
  if(!el) return;

  el.textContent="• "+msg+"\n"+el.textContent;

}


/* =======================
UID
======================= */

function getUID(){

  let uid=localStorage.getItem("hsc_uid");

  if(!uid){

    uid="guest_"+Math.random().toString(36).substring(2,10);

    localStorage.setItem("hsc_uid",uid);

  }

  return uid;

}


/* =======================
POST GAS (no-cors)
======================= */

async function postJSON(action,data){

  await fetch(
    GAS_URL+"?action="+action,
    {
      method:"POST",
      mode:"no-cors",
      headers:{
        "Content-Type":"text/plain;charset=utf-8"
      },
      body:JSON.stringify(data)
    }
  );

}


/* =======================
RESERVE
======================= */

async function reserveCard(){

  const uid=getUID();

  log("reserve request");

  const payload={
    tenant:"angel",
    uid:uid
  };

  await postJSON("reserve",payload);

  const id="TW"+Date.now().toString().slice(-6);

  $("cardId") && ($("cardId").textContent=id);

  log("reserve ok "+id);

  return{
    id,
    uid
  };

}


/* =======================
UPLOAD
======================= */

async function uploadImages(cardId){

  const avatarFile=$("avatar")?.files?.[0];
  const coverFile=$("cover")?.files?.[0];

  let avatarURL="";
  let coverURL="";

  if(avatarFile){

    log("compress avatar");

    const blob=await compressToJpeg(avatarFile,512);

    log("upload avatar");

    avatarURL=await uploadAvatar(cardId,blob);

    $("avatarURL") && ($("avatarURL").textContent=avatarURL);

  }

  if(coverFile){

    log("compress cover");

    const blob=await compressToJpeg(coverFile,1200);

    log("upload cover");

    coverURL=await uploadCover(cardId,blob);

    $("coverURL") && ($("coverURL").textContent=coverURL);

  }

  return{
    avatarURL,
    coverURL
  };

}


/* =======================
READ FORM
======================= */

function readForm(){

  return{

    name:$("name")?.value||"",
    unit:$("unit")?.value||"",
    title:$("title")?.value||"",

    phone:$("phone")?.value||"",
    email:$("email")?.value||"",
    website:$("website")?.value||"",

    line_url:$("line_url")?.value||"",
    wechat_id:$("wechat_id")?.value||"",

    free_color:$("free_color")?.value||"",
    free_style:$("free_style")?.value||"",
    free_paper:$("free_paper")?.value||""

  };

}


/* =======================
CREATE
======================= */

async function createCard(reserve,data,img){

  log("create request");

  const payload={

    tenant:"angel",

    id:reserve.id,
    uid:reserve.uid,

    ...data,

    avatar_url:img.avatarURL||"",
    photos:[img.coverURL||""]

  };

  await postJSON("create",payload);

  log("create success");

}


/* =======================
SUBMIT
======================= */

async function submitForm(){

  try{

    log("submit start "+VERSION);

    const reserve=await reserveCard();

    const formData=readForm();

    const images=await uploadImages(reserve.id);

    await createCard(reserve,formData,images);

    $("result").innerHTML=`
      <div style="font-size:18px;color:#3bd17f">
      ✅ 名片已送出審核
      </div>
      <div style="opacity:.6;margin-top:6px">
      客服確認後將開通
      </div>
    `;

  }
  catch(err){

    console.error(err);

    $("result").innerHTML="❌ "+err.message;

  }

}


/* =======================
INIT
======================= */

window.addEventListener("DOMContentLoaded",()=>{

  $("ver") && ($("ver").textContent=VERSION);

  $("btnSubmit")?.addEventListener("click",(e)=>{

    e.preventDefault();

    submitForm();

  });

});