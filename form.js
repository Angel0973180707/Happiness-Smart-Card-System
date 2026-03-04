/* ======================================================
Happiness Smart Card System
form.js v508
Fix: GAS write to card_db
====================================================== */

import { uploadAvatar, uploadCover } from "./firebase.js";
import { compressToJpeg } from "./image-compressor.js";

const VERSION = "v508";

const GAS_URL =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const $ = (id) => document.getElementById(id);


/* ========================
UI LOG
======================== */

function log(msg){

  const el = $("log");
  if(!el) return;

  el.textContent = "• " + msg + "\n" + el.textContent;

}


/* ========================
UID
======================== */

function getUID(){

  let uid = localStorage.getItem("hsc_uid");

  if(!uid){

    uid = "guest_" + Math.random().toString(36).substring(2,10);

    localStorage.setItem("hsc_uid",uid);

  }

  return uid;

}


/* ========================
POST JSON → GAS
======================== */

async function postJSON(action,data){

  const res = await fetch(
    GAS_URL + "?action=" + action,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(data)
    }
  );

  const txt = await res.text();

  console.log("GAS:",txt);

  return txt;

}


/* ========================
RESERVE
======================== */

async function reserveCard(){

  const uid = getUID();

  log("reserve request");

  const payload = {

    tenant:"angel",
    uid:uid

  };

  await postJSON("reserve",payload);

  const cardId = "TW" + Date.now().toString().slice(-6);

  $("cardId") && ($("cardId").textContent = cardId);

  log("reserve ok " + cardId);

  return {

    id:cardId,
    uid:uid

  };

}


/* ========================
UPLOAD IMAGES
======================== */

async function uploadImages(cardId){

  const avatarFile = $("avatar")?.files?.[0];
  const coverFile = $("cover")?.files?.[0];

  let avatarURL="";
  let coverURL="";

  if(avatarFile){

    log("compress avatar");

    const blob = await compressToJpeg(avatarFile,512);

    log("upload avatar");

    avatarURL = await uploadAvatar(cardId,blob);

  }

  if(coverFile){

    log("compress cover");

    const blob = await compressToJpeg(coverFile,1200);

    log("upload cover");

    coverURL = await uploadCover(cardId,blob);

  }

  return {

    avatarURL,
    coverURL

  };

}


/* ========================
READ FORM
======================== */

function readForm(){

  return {

    plan: $("plan")?.value || "",

    name: $("name")?.value || "",
    unit: $("unit")?.value || "",
    title: $("title")?.value || "",

    phone: $("phone")?.value || "",
    email: $("email")?.value || "",
    website: $("website")?.value || "",

    line_url: $("line_url")?.value || "",
    wechat_id: $("wechat_id")?.value || "",

    free_color: $("free_color")?.value || "",
    free_style: $("free_style")?.value || "",
    free_paper: $("free_paper")?.value || ""

  };

}


/* ========================
CREATE CARD
======================== */

async function createCard(reserve,data,img){

  log("create request");

  const payload = {

    tenant:"angel",
    id:reserve.id,
    uid:reserve.uid,

    ...data,

    avatar_url: img.avatarURL || "",
    photos: [ img.coverURL || "" ]

  };

  await postJSON("create",payload);

  log("create success");

}


/* ========================
SUBMIT
======================== */

async function submitForm(){

  try{

    $("status").textContent="送出中...";

    log("submit start "+VERSION);

    const reserve = await reserveCard();

    const formData = readForm();

    const images = await uploadImages(reserve.id);

    await createCard(reserve,formData,images);

    $("result").innerHTML = `
      <div style="font-size:18px;color:#3bd17f">
      ✅ 名片已送出審核
      </div>
      <div style="opacity:.6;margin-top:6px">
      客服確認後將開通
      </div>
    `;

    $("status").textContent="完成";

  }
  catch(err){

    console.error(err);

    $("status").textContent="失敗";

    $("result").innerHTML="❌ "+err.message;

  }

}


/* ========================
INIT
======================== */

window.addEventListener("DOMContentLoaded",()=>{

  $("ver") && ($("ver").textContent = VERSION);

  $("btnSubmit")?.addEventListener("click",(e)=>{

    e.preventDefault();

    submitForm();

  });

});