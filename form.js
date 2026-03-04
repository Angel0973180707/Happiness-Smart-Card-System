/* ======================================================
Happiness Smart Card System
form.js v505
GAS v500.3 aligned
Fix: CORS / Failed to fetch
====================================================== */

import { uploadAvatar, uploadCover } from "./firebase.js";
import { compressToJpeg } from "./image-compressor.js";

const VERSION = "v505";

const GAS_URL =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const PREVIEW_PAGE = "./card.html?id=";

const $ = (id)=>document.getElementById(id);

/* =========================
UTIL
========================= */

function setText(id,v){
  const el=$(id);
  if(el) el.textContent=v||"";
}

function setHTML(id,v){
  const el=$(id);
  if(el) el.innerHTML=v||"";
}

function log(msg){
  const el=$("log");
  if(!el) return;
  el.textContent="• "+msg+"\n"+el.textContent;
}

function setStatus(ok,msg){
  const el=$("status");
  if(!el) return;
  el.textContent=msg;
  el.style.color = ok ? "#3bd17f" : "#ff5e5e";
}

function qs(key){
  return new URL(location.href).searchParams.get(key)||"";
}

function readFile(id){
  const el=$(id);
  return el?.files?.[0]||null;
}

/* =========================
UID
========================= */

function getUID(){

  let uid=localStorage.getItem("hsc_uid");

  if(!uid){
    uid="guest_"+Math.random().toString(36).substring(2,10);
    localStorage.setItem("hsc_uid",uid);
  }

  return uid;
}

/* =========================
POST JSON
CORS SAFE
========================= */

async function postJSON(url,data){

  const r = await fetch(url,{
    method:"POST",
    headers:{
      "Content-Type":"text/plain;charset=utf-8"
    },
    body:JSON.stringify(data)
  });

  const txt = await r.text();

  let json;

  try{
    json = JSON.parse(txt);
  }catch(e){
    throw new Error("GAS not JSON: "+txt.slice(0,200));
  }

  if(!json.ok){
    throw new Error(json.error || "GAS error");
  }

  return json;
}

/* =========================
RESERVE
========================= */

async function doReserve(){

  const uid=getUID();

  setStatus(true,"Reserve...");
  log("reserve request");

  const payload={
    action:"reserve",
    uid:uid,
    tenant:"angel"
  };

  const sig=qs("sig");

  if(sig){
    payload.sig=sig;
  }

  const res=await postJSON(GAS_URL,payload);

  const id=res.id;
  const token=res.token;

  if(!id||!token){
    throw new Error("reserve missing id/token");
  }

  setText("cardId",id);

  log("reserve OK "+id);

  return{
    id,
    token,
    uid
  };
}

/* =========================
UPLOAD
========================= */

async function doUploadImages(cardId){

  const avatarFile=readFile("avatar");
  const coverFile=readFile("cover");

  let avatarURL="";
  let coverURL="";

  if(avatarFile){

    setStatus(true,"Compress avatar");

    const blob=await compressToJpeg(avatarFile,512);

    setStatus(true,"Upload avatar");

    avatarURL=await uploadAvatar(cardId,blob);

    setText("avatarURL",avatarURL);

    log("avatar uploaded");
  }

  if(coverFile){

    setStatus(true,"Compress cover");

    const blob=await compressToJpeg(coverFile,1200);

    setStatus(true,"Upload cover");

    coverURL=await uploadCover(cardId,blob);

    setText("coverURL",coverURL);

    log("cover uploaded");
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

/* =========================
CREATE
========================= */

async function doCreate(reserve,text,img){

  setStatus(true,"Create...");
  log("create request");

  const payload={

    action:"create",

    id:reserve.id,
    token:reserve.token,
    uid:reserve.uid,
    tenant:"angel",

    ...text,

    avatar_url:img.avatarURL||"",

    photos:[
      img.coverURL||""
    ]
  };

  const res=await postJSON(GAS_URL,payload);

  log("create OK");

  return res;
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

    const reserve=await doReserve();

    const text=readForm();

    const images=await doUploadImages(reserve.id);

    await doCreate(reserve,text,images);

    const preview=
      PREVIEW_PAGE+encodeURIComponent(reserve.id);

    setHTML(
      "result",
      `✅ 已建立<br>
      <a href="${preview}" target="_blank">打開成品</a>`
    );

    setStatus(true,"Done");

  }catch(err){

    console.error(err);

    setStatus(false,"Failed");

    setHTML("result","❌ "+err.message);

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

  setText("ver",VERSION);

  $("btnSubmit")?.addEventListener("click",(e)=>{
    e.preventDefault();
    mainSubmit();
  });

});