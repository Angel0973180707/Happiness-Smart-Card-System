const GAS="https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const BASE="https://angel0973180707.github.io/Happiness-Smart-Card-System/";

const qs=new URLSearchParams(location.search);
const id=qs.get("id");

const avatar=document.getElementById("avatar");
const nameEl=document.getElementById("name");
const titleEl=document.getElementById("title");

const openBtn=document.getElementById("openBtn");
const downloadBtn=document.getElementById("downloadBtn");
const copyBtn=document.getElementById("copyBtn");

let cardURL="";

init();

async function init(){

const url=GAS+"?action=card&id="+id;

const res=await fetch(url);
const data=await res.json();

const item=data.item;

nameEl.innerText=item.name||"";
titleEl.innerText=item.title||"";

avatar.src=
item.avatar_img_fast||
item.avatar_img||
item.avatar_url||
"";

cardURL=BASE+"?id="+item.id;

new QRCode(document.getElementById("qrcode"),{
text:cardURL,
width:200,
height:200
});

openBtn.onclick=()=>{
window.open(cardURL);
};

copyBtn.onclick=async()=>{
await navigator.clipboard.writeText(cardURL);
alert("名片連結已複製");
};

downloadBtn.onclick=downloadPoster;

}

async function downloadPoster(){

const canvas=await html2canvas(
document.getElementById("poster"),
{
useCORS:true,
scale:2
}
);

const a=document.createElement("a");

a.href=canvas.toDataURL("image/png");

a.download="smart-card.png";

a.click();

}