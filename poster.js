document.addEventListener("DOMContentLoaded", init);

const GAS =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const BASE =
"https://angel0973180707.github.io/Happiness-Smart-Card-System/";

async function init(){

const qs=new URLSearchParams(location.search);
const id=qs.get("id");

if(!id){
status("缺少 id");
return;
}

status("讀取名片...");

try{

const res=await fetch(`${GAS}?action=card&id=${id}`);
const data=await res.json();

if(!data.ok){
status("讀取失敗");
return;
}

const item=data.item||data.data;

render(item,id);

}catch(e){

console.error(e);
status("讀取失敗");

}

}

function status(t){

const el=document.getElementById("status");
if(el) el.innerText=t||"";

}

function safe(v){

return (v||"").toString().trim();

}

function driveToThumb(url){

if(!url) return "";

const m=url.match(/id=([^&]+)/);

if(m){
return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
}

return url;

}

function render(item,id){

const name=safe(item.name);
const unit=safe(item.unit);
const title=safe(item.title);

const avatar=item.avatar_img_fast||
item.avatar_img||
item.avatar_url||
item.avatar;

const avatarUrl=driveToThumb(avatar);

const cardUrl=`${BASE}?id=${id}&view=1`;

document.getElementById("name").innerText=name;
document.getElementById("unit").innerText=unit;
document.getElementById("title").innerText=title;

const avatarEl=document.getElementById("avatar");

if(avatarUrl){

avatarEl.src=avatarUrl;

}else{

avatarEl.style.display="none";

}

new QRCode(
document.getElementById("qrcode"),
{
text:cardUrl,
width:300,
height:300,
correctLevel:QRCode.CorrectLevel.H
}
);

document.getElementById("openCard").href=cardUrl;

document.getElementById("copyLink").onclick=()=>{

navigator.clipboard.writeText(cardUrl);
alert("已複製名片連結");

};

document.getElementById("copySystem").onclick=()=>{

navigator.clipboard.writeText(BASE);
alert("已複製推薦連結");

};

document.getElementById("download").onclick=downloadPoster;

status("");

}

async function downloadPoster(){

status("生成海報...");

try{

const poster=document.getElementById("poster");

const canvas=await html2canvas(poster,{
scale:2,
useCORS:true,
backgroundColor:"#ffffff"
});

const link=document.createElement("a");
link.download="poster.png";
link.href=canvas.toDataURL("image/png");

link.click();

status("");

}catch(e){

console.error(e);
status("下載失敗");

}

}