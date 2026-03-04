/* ======================================================
Happiness Smart Card System
form.js v504 (GAS v500.3 aligned)

Flow
1 reserve
2 compress
3 upload firebase
4 create card
====================================================== */

import { uploadAvatar, uploadCover } from "./firebase.js";
import { compressToJpeg } from "./image-compressor.js";

const VERSION = "v504";

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

function log(t){
  const el=$("log");
  if(!el) return;
  el.textContent="• "+t+"\n"+el.textContent;
}

function setStatus(ok,t){
  const el=$("status");
  if(!el) return;
  el.textContent=t;
  el.style.color= ok ? "#3bd17f" : "#ff5e5e";
}

function qs(k){
  return new URL(location.href).searchParams.get(k)||"";
}

function readFile(id){
  const el=$(id);
  if(!el) return null;
  return el.files?.[0]||null;
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
========================= */

async function postJSON(url,data){

  const r=await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify(data)
  });

  const txt=await r.text();

  let j;

  try{
    j=JSON.parse(txt);
  }catch(e){
    throw new Error("GAS not JSON: "+txt.slice(0,200));
  }

  if(!j.ok){
    throw new Error(j.error||"GAS error");
  }

  return j;
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
    uid:uid
  };

  const sig=qs("sig");

  if(sig){
    payload.sig=sig;
  }

  const j=await postJSON(GAS_URL,payload);

  const id=j.id;
  const token=j.token;

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

  const avatar=readFile("avatar");
  const cover=readFile("cover");

  let avatarURL="";
  let coverURL="";

  if(avatar){

    setStatus(true,"Compress avatar");

    const blob=await compressToJpeg(avatar,512);

    setStatus(true,"Upload avatar");

    avatarURL=await uploadAvatar(cardId,blob);

    setText("avatarURL",avatarURL);

    log("avatar uploaded");
  }

  if(cover){

    setStatus(true,"Compress cover");

    const blob=await compressToJpeg(cover,1200);

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

    name: $("name")?.value||"",
    unit: $("unit")?.value||"",
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

  setStatus(true,"Create...");

  const j=await postJSON(GAS_URL,payload);

  log("create OK");

  return j;
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