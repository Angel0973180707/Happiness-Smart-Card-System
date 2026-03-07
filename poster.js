const GAS="https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec"

const qs=new URLSearchParams(location.search)
const id=qs.get("id")

const status=document.getElementById("status")

async function init(){

if(!id){
status.innerText="缺少 id"
return
}

status.innerText="讀取名片..."

const url=`${GAS}?action=card&id=${id}&t=${Date.now()}`

const res=await fetch(url)
const data=await res.json()

if(!data.ok){
status.innerText="讀取失敗"
return
}

const item=data.item||data.data||data.card||{}

render(item)

}

function render(item){

document.getElementById("name").innerText=item.name||""
document.getElementById("unit").innerText=item.unit||""
document.getElementById("title").innerText=item.title||""

if(item.slogan){
document.getElementById("slogan").innerText=item.slogan
}

if(item.services){
document.getElementById("services").innerText=item.services
}

if(item.experience){
document.getElementById("exp").innerText=item.experience
}

if(item.avatar_img){
document.getElementById("avatar").src=item.avatar_img
}

const cardUrl=`index.html?id=${id}&view=1`

document.getElementById("openCard").href=cardUrl

QRCode.toCanvas(
document.getElementById("qrcode"),
location.origin+location.pathname.replace("poster.html","")+cardUrl,
{width:300}
)

document.getElementById("copyLink").onclick=()=>{
navigator.clipboard.writeText(cardUrl)
status.innerText="已複製名片連結"
}

document.getElementById("download").onclick=async()=>{

status.innerText="生成海報..."

const canvas=await html2canvas(document.getElementById("poster"),{scale:3})

const a=document.createElement("a")
a.href=canvas.toDataURL()
a.download=`${id}-poster.png`
a.click()

status.innerText="下載完成"

}

status.innerText="OK"

}

init()