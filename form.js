/* ======================================
HSC Fill Form v520
create + update unified
====================================== */

const GAS =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec"

const tenant = "angel"

function qs(name){
  const url=new URL(location.href)
  return url.searchParams.get(name)||""
}

const sig = qs("sig")
const idFromUrl = qs("id")
const mode = qs("mode") || "create"

let reserveData=null
let storage=null

/* ===============================
Firebase init
=============================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js"

import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js"

const firebaseConfig = {
  apiKey: "AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
  authDomain: "happiness-smart-card-pro-7389a.firebaseapp.com",
  projectId: "happiness-smart-card-pro-7389a",
  storageBucket: "happiness-smart-card-pro-7389a.firebasestorage.app",
  messagingSenderId: "143313936007",
  appId: "1:143313936007:web:7c948563c51e8a47d3a222"
}

const app = initializeApp(firebaseConfig)
storage = getStorage(app)

/* ===============================
reserve (create only)
=============================== */

async function reserve(){

  if(mode==="update") return

  const params=new URLSearchParams({
    action:"reserve",
    tenant:tenant
  })

  if(sig) params.append("sig",sig)

  const r=await fetch(GAS+"?"+params.toString())
  const j=await r.json()

  if(!j.ok){
    alert("reserve error:"+j.error)
    return
  }

  reserveData=j
}

/* ===============================
load existing card (update mode)
=============================== */

async function loadCard(){

  if(mode!=="update") return

  const params=new URLSearchParams({
    action:"card",
    tenant:tenant,
    id:idFromUrl,
    sig:sig
  })

  const r=await fetch(GAS+"?"+params.toString())
  const j=await r.json()

  if(!j.ok){
    alert("load error:"+j.error)
    return
  }

  const item=j.item

  Object.keys(item).forEach(k=>{
    const el=document.querySelector(`[name="${k}"]`)
    if(el && item[k]) el.value=item[k]
  })
}

/* ===============================
upload image
=============================== */

async function uploadImage(file,cardId,name){

  if(!file) return ""

  const path=`hsc_cards/${tenant}/${cardId}/${name}`

  const r=ref(storage,path)

  await uploadBytes(r,file)

  const url=await getDownloadURL(r)

  return url
}

/* ===============================
submit
=============================== */

async function submitForm(){

  const fd=new FormData(document.querySelector("form"))

  let cardId = idFromUrl

  if(mode==="create"){
    cardId=reserveData.id
  }

  /* upload images */

  const avatarFile = document.querySelector('[name="avatar_img"]').files[0]

  if(avatarFile){
    const url = await uploadImage(avatarFile,cardId,"avatar.jpg")
    fd.set("avatar_img",url)
  }

  const data={}

  fd.forEach((v,k)=>data[k]=v)

  data.tenant=tenant
  data.id=cardId

  if(mode==="create"){
    data.action="create"
    data.token=reserveData.token
  }else{
    data.action="update"
    data.sig=sig
  }

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

  location.href="delivery.html?id="+cardId
}

/* ===============================
boot
=============================== */

window.addEventListener("DOMContentLoaded",async()=>{

  await reserve()

  await loadCard()

  document
  .querySelector("form")
  .addEventListener("submit",e=>{
    e.preventDefault()
    submitForm()
  })

})