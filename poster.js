document.addEventListener("DOMContentLoaded", function(){

const GAS = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
const BASE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

const qs = new URLSearchParams(location.search);
const id = (qs.get("id") || "").trim();

const statusEl = document.getElementById("status");
const posterEl = document.getElementById("poster");
const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("name");
const unitEl = document.getElementById("unit");
const titleEl = document.getElementById("title");
const sloganEl = document.getElementById("slogan");

const servicesWrapEl = document.getElementById("servicesWrap");
const servicesEl = document.getElementById("services");
const expWrapEl = document.getElementById("expWrap");
const expEl = document.getElementById("exp");

const qrWrapEl = document.getElementById("qrcode");
const openCardEl = document.getElementById("openCard");
const copyLinkEl = document.getElementById("copyLink");
const downloadEl = document.getElementById("download");


function setStatus(msg){
 if(!statusEl) return;
 statusEl.innerText = msg || "";
}


function safe(v){
 return String(v || "").trim();
}


function getCardUrl(id){
 return `${BASE_URL}?id=${encodeURIComponent(id)}&view=1`;
}


function driveImg(url){

 const s = safe(url);
 if(!s) return "";

 const m1 = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
 if(m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w1200`;

 const m2 = s.match(/[?&]id=([^&]+)/i);
 if(m2 && /drive\.google\.com/i.test(s))
 return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w1200`;

 return s;
}


function avatar(item){

 return driveImg(
 item.avatar_img_fast ||
 item.avatar_img ||
 item.avatar_url ||
 ""
 );

}


function twoLines(txt){

 const t = safe(txt);
 if(!t) return "";

 const arr = t.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).slice(0,2);

 return arr.length ? arr.join("\n") : t;
}


function setBlock(el,wrap,val){

 if(!el || !wrap) return;

 const t = safe(val);

 if(t){
  el.innerText = t;
  wrap.style.display="";
 }else{
  wrap.style.display="none";
 }

}


function bindAvatar(url){

 if(!avatarEl) return;

 avatarEl.onerror=null;

 if(!url){
  avatarEl.removeAttribute("src");
  return;
 }

 avatarEl.src=url;

 avatarEl.onerror=()=>{
  avatarEl.removeAttribute("src");
 };

}


async function renderQR(url){

 if(!qrWrapEl) return;

 qrWrapEl.innerHTML="";

 try{

  if(typeof QRCode !== "undefined"){

   new QRCode(qrWrapEl,{
    text:url,
    width:200,
    height:200
   });

   return;

  }

  qrWrapEl.innerHTML="QR";

 }catch(e){

  console.error(e);
 }

}


async function loadCard(){

 if(!id){

  setStatus("缺少 id");
  return null;

 }

 setStatus("讀取名片...");

 const url = `${GAS}?action=card&id=${encodeURIComponent(id)}&t=${Date.now()}`;

 const res = await fetch(url);

 if(!res.ok) throw new Error(res.status);

 const txt = await res.text();

 let data;

 try{

  data = JSON.parse(txt);

 }catch(e){

  console.error("JSON",txt);
  return null;

 }

 if(!data || !data.ok) return null;

 return data.item || data.data || {};

}


async function render(item){

 nameEl.innerText = safe(item.name) || "未命名";
 unitEl.innerText = safe(item.unit);
 titleEl.innerText = safe(item.title);

 const slogan = safe(item.slogan);

 if(slogan){
  sloganEl.innerText=slogan;
  sloganEl.style.display="";
 }else{
  sloganEl.style.display="none";
 }

 setBlock(servicesEl,servicesWrapEl,twoLines(item.services));
 setBlock(expEl,expWrapEl,twoLines(item.experience));

 bindAvatar(avatar(item));

 const cardUrl = getCardUrl(id);

 openCardEl.href = cardUrl;
 openCardEl.target="_blank";

 await renderQR(cardUrl);


 copyLinkEl.onclick = async ()=>{

  try{

   await navigator.clipboard.writeText(cardUrl);
   setStatus("已複製");

  }catch(e){

   setStatus("複製失敗");

  }

 };


 downloadEl.onclick = async ()=>{

  try{

   setStatus("生成海報");

   const canvas = await html2canvas(posterEl,{
    scale:3,
    useCORS:true,
    backgroundColor:"#fff"
   });

   const a=document.createElement("a");

   a.href=canvas.toDataURL("image/png");
   a.download=`${id}-poster.png`;
   a.click();

   setStatus("下載完成");

  }catch(e){

   console.error(e);
   setStatus("下載失敗");

  }

 };

 setStatus("");

}


async function init(){

 try{

  const item = await loadCard();

  if(!item){

   nameEl.innerText="讀取失敗";
   return;

  }

  await render(item);

 }catch(e){

  console.error(e);
  nameEl.innerText="讀取失敗";

 }

}


init();

});