/* ==========================================
 * HSC Poster v704
 * COMPLETE OVERWRITE
 *
 * 修正：
 * 1) 海報產生失敗
 * 2) QRCode 載入等待
 * 3) Canvas clip crash
 * 4) 改用 toBlob 下載
 * ========================================== */

(() => {

"use strict";

const DEFAULT_GAS =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const BASE_URL =
"https://angel0973180707.github.io/Happiness-Smart-Card-System/";

const qs = new URLSearchParams(location.search);
const CARD_ID = (qs.get("id") || "").trim();

const $ = (id)=>document.getElementById(id);

const avatarEl = $("avatar");
const avatarFallbackEl = $("avatarFallback");

const nameEl = $("name");
const unitEl = $("unit");
const titleEl = $("title");

const qrCodeEl = $("qrcode");
const btnDownload = $("btnDownload");

const statusEl = $("status");

let currentItem = null;
let cardUrl = "";

/* ============================ */

function text(v,f=""){
return String(v==null?f:v).trim();
}

function setStatus(msg,type=""){
if(!statusEl) return;
statusEl.dataset.type = type;
statusEl.textContent = msg;
}

/* ============================ */

function resolveImage(url){

let out = text(url);

if(!out) return "";

if(out.includes("drive.google.com/file/d/")){
try{
const id = out.split("/d/")[1].split("/")[0];
out = `https://drive.google.com/uc?export=view&id=${id}`;
}catch{}
}

if(out.includes("firebasestorage.googleapis.com")){
out += (out.includes("?")?"&":"?")+"_ts="+Date.now();
}

return out;

}

/* ============================ */

function loadImage(src){

return new Promise((resolve)=>{

const img = new Image();

img.crossOrigin = "anonymous";

img.onload = ()=>resolve(img);
img.onerror = ()=>resolve(null);

img.src = src;

});

}

/* ============================ */

async function fetchCard(){

const url = new URL(DEFAULT_GAS);

url.searchParams.set("action","card");
url.searchParams.set("id",CARD_ID);

const res = await fetch(url);

const json = await res.json();

return json.item || json.data || json;

}

/* ============================ */

function renderQrCode(url){

qrCodeEl.innerHTML="";

new QRCode(qrCodeEl,{
text:url,
width:196,
height:196,
correctLevel:QRCode.CorrectLevel.H
});

}

/* ============================ */

function pickAvatar(item){

return (
item.avatar_url ||
item.avatar_img_fast ||
item.avatar_img ||
item.avatar ||
""
);

}

/* ============================ */

async function buildPosterCanvas(item){

const canvas = document.createElement("canvas");

canvas.width = 1080;
canvas.height = 1680;

const ctx = canvas.getContext("2d");

/* background */

ctx.fillStyle="#f7faf8";
ctx.fillRect(0,0,1080,1680);

/* card */

ctx.fillStyle="#ffffff";

ctx.shadowColor="rgba(0,0,0,.08)";
ctx.shadowBlur=40;

ctx.fillRect(80,80,920,1520);

ctx.shadowColor="transparent";

/* brand */

ctx.fillStyle="#3f6f57";
ctx.font="bold 48px sans-serif";
ctx.textAlign="center";

ctx.fillText("天使幸福智慧名片",540,150);

/* avatar */

const avatarUrl = resolveImage(pickAvatar(item));
const avatar = await loadImage(avatarUrl);

const avatarX = 540;
const avatarY = 380;
const avatarR = 120;

ctx.save();

ctx.beginPath();
ctx.arc(avatarX,avatarY,avatarR,0,Math.PI*2);
ctx.closePath();
ctx.clip();

if(avatar){

ctx.drawImage(
avatar,
avatarX-avatarR,
avatarY-avatarR,
avatarR*2,
avatarR*2
);

}else{

ctx.fillStyle="#6f8f7c";
ctx.font="bold 60px sans-serif";
ctx.textAlign="center";
ctx.textBaseline="middle";

ctx.fillText(
text(item.name).slice(0,2),
avatarX,
avatarY
);

}

ctx.restore();

/* name */

ctx.fillStyle="#3f6f57";
ctx.font="bold 64px sans-serif";
ctx.textAlign="center";

ctx.fillText(text(item.name,"智慧名片"),540,620);

/* title */

ctx.fillStyle="#6f8f7c";
ctx.font="36px sans-serif";

ctx.fillText(text(item.title),540,690);

/* 等待 QRCode */

await new Promise(r=>setTimeout(r,200));

const qrImg = qrCodeEl.querySelector("img");

if(qrImg){

const qr = await loadImage(qrImg.src);

if(qr){
ctx.drawImage(qr,360,900,360,360);
}

}

/* tip */

ctx.fillStyle="#567866";
ctx.font="30px sans-serif";

ctx.fillText("掃描 QRCode 打開智慧名片",540,1320);

return canvas;

}

/* ============================ */

async function downloadPoster(){

try{

setStatus("產生海報中...");

const canvas = await buildPosterCanvas(currentItem);

const safeId = text(CARD_ID).replace(/[^\w-]+/g,"_");

canvas.toBlob((blob)=>{

const url = URL.createObjectURL(blob);

const link = document.createElement("a");

link.href = url;
link.download = safeId+"_poster.png";

document.body.appendChild(link);

link.click();

setTimeout(()=>{
URL.revokeObjectURL(url);
link.remove();
},200);

},"image/png");

setStatus("海報下載完成");

}catch(err){

console.error(err);

setStatus("海報產生失敗，請稍後再試","error");

}

}

/* ============================ */

async function render(){

const item = await fetchCard();

currentItem = item;

cardUrl = BASE_URL+"index.html?id="+CARD_ID+"&view=1";

nameEl.textContent = item.name || "";
titleEl.textContent = item.title || "";
unitEl.textContent = item.unit || "";

const avatar = pickAvatar(item);

if(avatar){

avatarEl.src = resolveImage(avatar);

avatarEl.style.display="block";
avatarFallbackEl.style.display="none";

}

renderQrCode(cardUrl);

}

/* ============================ */

btnDownload.onclick = downloadPoster;

render();

})();