/* ==========================================
 * HSC Poster v707
 * COMPLETE OVERWRITE
 *
 * Fix:
 * 1. avatar_key resolver support
 * 2. avatar_url / fast image support
 * 3. avatar preload stability
 * 4. html2canvas cross-origin fix
 * ========================================== */

(() => {

"use strict";

const VERSION="707";

const DEFAULT_GAS=
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const DEFAULT_BASE=
"https://angel0973180707.github.io/Happiness-Smart-Card-System/";

const DEFAULT_LINE_OA="https://lin.ee/3r2ZePN";

const qs=new URLSearchParams(location.search);

const CARD_ID=(qs.get("id")||"").trim();
const REF_ID=(qs.get("ref")||CARD_ID).trim();

const $=id=>document.getElementById(id);

const posterCaptureEl=$("posterCapture");
const avatarEl=$("avatar");
const avatarFallbackEl=$("avatarFallback");

const nameEl=$("name");
const unitEl=$("unit");
const titleEl=$("title");

const qrCodeEl=$("qrcode");
const statusEl=$("status");

const btnShare=$("btnShare");
const btnCopyCard=$("btnCopyCard");
const btnDownload=$("btnDownload");
const btnOpenCard=$("btnOpenCard");

let currentItem=null;
let cardUrl="";

function text(v,fallback=""){
return String(v==null?fallback:v).trim();
}

function getGasUrl(){
return DEFAULT_GAS;
}

function getBaseUrl(){
let base=DEFAULT_BASE;
if(!base.endsWith("/")) base+="/";
return base;
}

function buildCardUrl(id){

const url=new URL("index.html",getBaseUrl());

url.searchParams.set("id",id);

if(REF_ID) url.searchParams.set("ref",REF_ID);

return url.toString();

}

function safeInitial(name){
const t=text(name,"名片");
return t.slice(0,2);
}

function showAvatarFallback(name){

avatarEl.style.display="none";

avatarFallbackEl.style.display="grid";

avatarFallbackEl.textContent=safeInitial(name);

}

function resolveAvatar(item){

// 1 Firebase key

if(item.avatar_key){

try{

if(window.resolveImageUrl){

const r=window.resolveImageUrl(item.avatar_key);
if(r) return r;

}

if(window.HSCImageResolver?.resolveImageUrl){

const r=window.HSCImageResolver.resolveImageUrl(item.avatar_key);
if(r) return r;

}

}catch(e){

console.warn("resolver error",e);

}

}

// 2 direct url

const list=[
item.avatar_url,
item.avatar_img_fast,
item.avatar_img,
item.avatar,
item.avatarUrl
];

for(let v of list){

const t=text(v);
if(t) return t;

}

return "";

}

function setAvatar(src,name){

if(!src){

showAvatarFallback(name);
return;

}

avatarEl.onload=()=>{

avatarEl.style.display="block";
avatarFallbackEl.style.display="none";

};

avatarEl.onerror=()=>{

showAvatarFallback(name);

};

avatarEl.crossOrigin="anonymous";

const bust=src.includes("?")?"&":"?";

avatarEl.src=src+bust+"v="+Date.now();

}

function normalizeItem(raw){

const item=raw||{};

return{

id:text(item.id||CARD_ID),

name:text(item.name,"智慧名片"),

unit:text(item.unit),

title:text(item.title),

avatar_url:text(item.avatar_url),

avatar_img_fast:text(item.avatar_img_fast),

avatar_img:text(item.avatar_img),

avatar_key:text(item.avatar_key),

line_oa:text(item.line_oa)

};

}

function getCardPayload(json){

if(!json||typeof json!=="object") return null;

if(json.item) return json.item;

if(json.data) return json.data;

if(json.card) return json.card;

if(json.row) return json.row;

return null;

}

async function fetchCard(id){

const gas=getGasUrl();

const url=new URL(gas);

url.searchParams.set("action","card");

url.searchParams.set("id",id);

const res=await fetch(url.toString());

if(!res.ok) throw new Error("讀取失敗");

const json=await res.json();

const payload=getCardPayload(json);

if(!payload) throw new Error("找不到名片資料");

return normalizeItem(payload);

}

function renderQrCode(url){

qrCodeEl.innerHTML="";

new QRCode(qrCodeEl,{

text:url,

width:196,

height:196,

colorDark:"#000000",

colorLight:"#ffffff",

correctLevel:QRCode.CorrectLevel.H

});

}

async function copyText(value){

await navigator.clipboard.writeText(value);

}

async function shareCard(){

if(navigator.share){

await navigator.share({

title:"我的智慧名片",

text:"歡迎查看我的智慧名片",

url:cardUrl

});

}else{

await copyText(cardUrl);

}

}

async function toDataURL(src){

if(!src) return null;

if(src.startsWith("data:")) return src;

try{

const res=await fetch(src);

const blob=await res.blob();

return await new Promise(resolve=>{

const fr=new FileReader();

fr.onload=()=>resolve(fr.result);

fr.readAsDataURL(blob);

});

}catch(e){

return null;

}

}

async function downloadPoster(item){

const target=posterCaptureEl;

const originalSrc=avatarEl.getAttribute("src");

let injected=false;

if(originalSrc){

const dataUrl=await toDataURL(originalSrc);

if(dataUrl){

avatarEl.src=dataUrl;
injected=true;

}

}

let canvas=await html2canvas(target,{

backgroundColor:null,

scale:2,

useCORS:true,

allowTaint:true

});

if(injected){

avatarEl.src=originalSrc;

}

const link=document.createElement("a");

link.download=item.id+"_poster.png";

link.href=canvas.toDataURL("image/png");

link.click();

}

async function renderCard(item){

currentItem=item;

cardUrl=buildCardUrl(item.id);

nameEl.textContent=item.name;

unitEl.textContent=item.unit||"　";

titleEl.textContent=item.title||"　";

const avatarSrc=resolveAvatar(item);

setAvatar(avatarSrc,item.name);

renderQrCode(cardUrl);

btnShare.onclick=shareCard;

btnCopyCard.onclick=()=>copyText(cardUrl);

btnOpenCard.onclick=()=>window.open(cardUrl);

btnDownload.onclick=()=>downloadPoster(item);

statusEl.textContent="交付卡已載入完成 ✓";

}

async function init(){

if(!CARD_ID){

statusEl.textContent="缺少名片ID";
return;

}

statusEl.textContent="正在載入...";

try{

const item=await fetchCard(CARD_ID);

renderCard(item);

}catch(err){

console.error(err);

statusEl.textContent="載入失敗";

}

}

init();

})();