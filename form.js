/* ======================================================
Happiness Smart Card System
form.js v506
Fix: GAS CORS (Failed to fetch)
====================================================== */

import { uploadAvatar, uploadCover } from "./firebase.js";
import { compressToJpeg } from "./image-compressor.js";

const VERSION = "v506";

const GAS_URL =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const PREVIEW_PAGE = "./card.html?id=";

const $ = (id)=>document.getElementById(id);

/* =========================
UI
========================= */

function log(msg){
  const el=$("log");
  if(!el) return;
  el.textContent="• "+msg+"\n"+el.textContent;
}

function setText(id,v){
  const el=$(id);
  if(el) el.textContent=v||"";
}

function setStatus(ok,msg){
  const el=$("status");
  if(!el) return;
  el.textContent=msg;
  el.style.color = ok ? "#3bd17f" : "#ff5e5e";
}

function readFile(id){
  return $(id)?.files?.[0] || null;
}

/* =========================
UID
========================= */

function getUID(){

  let uid = localStorage.getItem("hsc_uid");

  if(!uid){
    uid="guest_"+Math.random().toString(36).substring(2,10);
    localStorage.setItem("hsc_uid",uid);
  }

  return uid;
}

/* =========================
POST GAS
========================= */

async function postJSON(data){

  await fetch(GAS_URL,{
    method:"POST",
    mode:"no-cors",
    headers:{
      "Content-Type":"text/plain;charset=utf-8"
    },
    body:JSON.stringify(data)
  });

}

/* =========================
RESERVE
========================= */

async function doReserve(){

  const uid = getUID();

  log("reserve request");

  const payload={
    action:"reserve",
    uid:uid,
    tenant:"angel"
  };

  await postJSON(payload);

  const id="TW"+Date.now().toString().slice(-6);

  setText("cardId",id);

  log("reserve OK "+id);

  return{
    id,
    uid
  };

}

/* =========================
UPLOAD
========================= */

async function doUploadImages(cardId){

  const avatarFile = readFile("avatar");
  const coverFile = readFile("cover");

  let avatarURL="";
  let coverURL="";

  if(avatarFile){

    log("compress avatar");

    const blob = await compressToJpeg(avatarFile,512);

    log("upload avatar");

    avatarURL = await uploadAvatar(cardId,blob);

    setText("avatarURL",avatarURL);
  }

  if(coverFile){

    log("compress cover");

    const blob = await compressToJpeg(coverFile,1200);

    log("upload cover");

    coverURL = await uploadCover(cardId,blob);

    setText("coverURL",coverURL);
  }

  return{
    avatarURL,
    coverURL
  };
}

/* =========================
READ FORM
========================= */

function readForm(){

  return{

    name: $("name")?.value||"",
    unit: $("unit")?.value||"",
    title: $("title")?.value||"",

    phone: $("phone")?.value||"",
    email: $("email")?.value||"",
    website: $("website")?.value||"",

    line_url: $("line_url")?.value||"",
    wechat_id: $("wechat_id")?.value||"",

    free_color: $("free_color")?.value||"",
    free_style: $("free_style")?.value||"",
    free_paper: $("free_paper")?.value||""
  };
}

/* =========================
CREATE
========================= */

async function doCreate(reserve,text,img){

  log("create request");

  const payload={

    action:"create",

    id:reserve.id,
    uid:reserve.uid,
    tenant:"angel",

    ...text,

    avatar_url:img.avatarURL||"",
    photos:[img.coverURL||""]
  };

  await postJSON(payload);

  log("create OK");

}

/* =========================
MAIN
========================= */

async function mainSubmit(){

  try{

    const btn=$("btnSubmit");
    if(btn) btn.disabled=true;

    setStatus(true,"Submitting "+VERSION);

    log("start submit "+VERSION);

    const reserve = await doReserve();

    const text = readForm();

    const images = await doUploadImages(reserve.id);

    await doCreate(reserve,text,images);

    const preview =
      PREVIEW_PAGE + encodeURIComponent(reserve.id);

    $("result").innerHTML =
      `✅ 已建立<br>
       <a href="${preview}" target="_blank">打開名片</a>`;

    setStatus(true,"Done");

  }catch(err){

    console.error(err);

    setStatus(false,"Failed");

    $("result").innerHTML="❌ "+err.message;

    log("ERROR "+err.message);

  }finally{

    const btn=$("btnSubmit");
    if(btn) btn.disabled=false;

  }

}

/* =========================
INIT
========================= */

window.addEventListener("DOMContentLoaded",()=>{

  $("ver") && ($("ver").textContent = VERSION);

  $("btnSubmit")?.addEventListener("click",(e)=>{
    e.preventDefault();
    mainSubmit();
  });

});