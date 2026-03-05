/* ======================================
HSC Fill Form v514.4
support update link
====================================== */

const GAS =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec"

function qs(name){
  const url=new URL(location.href)
  return url.searchParams.get(name)||""
}

const tenant = qs("tenant") || "angel"
const sig = qs("sig")
const idFromUrl = qs("id")
const mode = qs("mode")

let reserveData=null

async function reserve(){

  const params=new URLSearchParams({
    action:"reserve",
    tenant:tenant
  })

  if(sig) params.append("sig",sig)
  if(idFromUrl) params.append("id",idFromUrl)

  const r=await fetch(GAS+"?"+params.toString())
  const j=await r.json()

  if(!j.ok){
    alert("reserve error:"+j.error)
    return
  }

  reserveData=j
}

async function submitForm(){

  const fd=new FormData(document.querySelector("form"))

  const data={
    action:"create",
    tenant:tenant,
    id:reserveData.id,
    token:reserveData.token,
    overwrite:1
  }

  if(sig) data.sig=sig

  fd.forEach((v,k)=>data[k]=v)

  const r=await fetch(GAS,{
    method:"POST",
    body:JSON.stringify(data),
    headers:{
      "Content-Type":"application/json"
    }
  })

  const j=await r.json()

  if(!j.ok){
    alert("submit error:"+j.error)
    return
  }

  location.href="delivery.html?id="+reserveData.id
}

window.addEventListener("DOMContentLoaded",async()=>{

  await reserve()

  document
    .querySelector("form")
    .addEventListener("submit",e=>{
      e.preventDefault()
      submitForm()
    })

})