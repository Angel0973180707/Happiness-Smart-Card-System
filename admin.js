/* =========================================
   HSC Admin Workspace — admin.js v521.6
   ========================================= */

const $ = (id)=>document.getElementById(id)

const S = {
  gas:"",
  adminSecret:"",
  selectedCard:null,
  updateLink:"",
  inviteCode:"",
  formLink:"",
  facadeLink:""
}

init()

/* =========================
   INIT
   ========================= */

function init(){

  const gas = localStorage.getItem("HSC_GAS_URL") || ""
  const sec = localStorage.getItem("HSC_ADMIN_SECRET") || ""

  $("gasUrl").value = gas
  $("adminSecret").value = sec

  S.gas = gas
  S.adminSecret = sec

  $("gasUrl").addEventListener("change",()=>{
    S.gas = $("gasUrl").value.trim()
    localStorage.setItem("HSC_GAS_URL",S.gas)
  })

  $("adminSecret").addEventListener("change",()=>{
    S.adminSecret = $("adminSecret").value.trim()
    localStorage.setItem("HSC_ADMIN_SECRET",S.adminSecret)
  })

  $("btnCreateInvite").onclick = createInvite

  $("btnCopyInvite").onclick = ()=>copy($("inviteCode").value)
  $("btnCopyFormLink").onclick = ()=>copy($("formLink").value)
  $("btnCopyFacadeLink").onclick = ()=>copy($("facadeLink").value)

  $("btnFind").onclick = findCards
  $("btnMakeUpdate").onclick = makeUpdateLink
  $("btnCopyUpdate").onclick = ()=>copy(S.updateLink)

  $("btnStats").onclick = loadStats

  $("btnCopyCard").onclick = ()=>copy($("cardLink").value)
  $("btnCopyShare").onclick = ()=>copy($("shareLink").value)
  $("btnCopyWeChat").onclick = ()=>copy($("wechatLink").value)

}

/* =========================
   API
   ========================= */

async function api(action,data={}){

  if(!S.gas){
    alert("請先設定 GAS URL")
    return
  }

  const url = new URL(S.gas)

  url.searchParams.set("action",action)
  url.searchParams.set("admin_secret",S.adminSecret)

  Object.keys(data).forEach(k=>{
    url.searchParams.set(k,data[k])
  })

  const res = await fetch(url)
  const j = await res.json()

  if(!j.ok){
    setStatus("❌ "+j.error,true)
    throw new Error(j.error)
  }

  return j
}

/* =========================
   STATUS
   ========================= */

function setStatus(msg,isErr){

  $("statusBox").textContent = msg

  if(isErr){
    $("statusPill").textContent="error"
    $("statusPill").style.color="#ff9aa2"
  }else{
    $("statusPill").textContent="ok"
    $("statusPill").style.color="#8cffc1"
  }

}

/* =========================
   COPY
   ========================= */

function copy(text){

  if(!text) return

  navigator.clipboard.writeText(text)
  setStatus("已複製：\n"+text,false)

}

/* =========================
   CREATE INVITE
   ========================= */

async function createInvite(){

  try{

    const j = await api("adminCreateInvite")

    S.inviteCode = j.invite_code
    S.formLink = j.form_link
    S.facadeLink = j.facade_link

    $("inviteCode").value = S.inviteCode
    $("formLink").value = S.formLink
    $("facadeLink").value = S.facadeLink

    $("btnCopyInvite").disabled=false
    $("btnCopyFormLink").disabled=false
    $("btnCopyFacadeLink").disabled=false

    setStatus(
`邀請碼已產生

invite_code:
${S.inviteCode}

填表連結:
${S.formLink}

門面連結:
${S.facadeLink}`
,false)

  }catch(e){}

}

/* =========================
   FIND CARDS
   ========================= */

async function findCards(){

  try{

    const q = $("customerMsg").value.trim()

    if(!q){
      alert("請輸入查找條件")
      return
    }

    const j = await api("adminFind",{q})

    const list = $("resultList")
    list.innerHTML=""

    if(!j.items.length){
      setStatus("查無名片",true)
      return
    }

    j.items.forEach(item=>{

      const div = document.createElement("div")
      div.className="item"

      div.innerHTML = `
<strong>${item.name || "未填姓名"} — ${item.title || ""}</strong>
<small>ID: ${item.id}</small>
<small>Phone: ${item.phone || "-"}</small>
<small>Status: ${item.status}</small>
`

      const btn = document.createElement("button")
      btn.className="btn secondary"
      btn.textContent="選擇此名片"

      btn.onclick = ()=>selectCard(item)

      div.appendChild(btn)

      list.appendChild(div)

    })

    setStatus(`找到 ${j.items.length} 張名片`,false)

  }catch(e){}

}

/* =========================
   SELECT CARD
   ========================= */

function selectCard(card){

  S.selectedCard = card

  $("btnMakeUpdate").disabled=false

  const id = card.id

  const base = location.origin + location.pathname.replace("admin.html","")

  const cardLink = `${base}index.html?id=${id}&view=1`
  const shareLink = `${base}share.html?id=${id}`
  const wechatLink = `${base}wechat.html?id=${id}`

  $("cardLink").value = cardLink
  $("shareLink").value = shareLink
  $("wechatLink").value = wechatLink

  $("btnCopyCard").disabled=false
  $("btnCopyShare").disabled=false
  $("btnCopyWeChat").disabled=false

  setStatus(`已選擇名片: ${card.name} (${card.id})`,false)

}

/* =========================
   UPDATE LINK
   ========================= */

async function makeUpdateLink(){

  try{

    if(!S.selectedCard){
      alert("請先選擇名片")
      return
    }

    const j = await api("adminMakeUpdateLink",{
      id:S.selectedCard.id
    })

    S.updateLink = j.link

    $("updateLink").value = j.link

    $("btnCopyUpdate").disabled=false

    setStatus("更新連結已產生",false)

  }catch(e){}

}

/* =========================
   STATS
   ========================= */

async function loadStats(){

  try{

    const j = await api("adminStats")

    $("stTotal").textContent = j.total
    $("stMonthNew").textContent = j.month_new
    $("stActive").textContent = j.active
    $("stExpired").textContent = j.expired

    setStatus("統計已更新",false)

  }catch(e){}

}