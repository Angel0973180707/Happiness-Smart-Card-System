/* =========================================
   Happiness Smart Card System
   poster.js v523.0 (COMPLETE OVERWRITE)

   功能：
   1. 讀取 ?id=TW0001
   2. 呼叫 GAS action=card
   3. 產生微信名片海報
   4. 生成 QR Code（指向乾淨名片）
   5. 下載 PNG
   6. 提供：
      - 查看智慧名片
      - 複製名片連結
      - 智慧名片首頁
========================================= */

(()=>{
"use strict";

const VERSION = "523.0";

const DEFAULTS = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  HOME: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  INDEX: "index.html",
  DEFAULT_AVATAR: "./assets/avatar-default.png"
};

const $ = (id)=>document.getElementById(id);
const qs = (k)=>new URLSearchParams(location.search).get(k);

const el = {
  statusBadge:$("statusBadge"),
  statusBox:$("statusBox"),

  posterCard:$("posterCard"),
  posterAvatar:$("posterAvatar"),
  posterLogo:$("posterLogo"),
  posterName:$("posterName"),
  posterUnit:$("posterUnit"),
  posterTitle:$("posterTitle"),

  posterSloganBox:$("posterSloganBox"),
  posterSlogan:$("posterSlogan"),

  posterServicesBox:$("posterServicesBox"),
  posterServices:$("posterServices"),

  posterExpBox:$("posterExpBox"),
  posterExp:$("posterExp"),

  posterQrBox:$("posterQrBox"),

  btnDownloadPoster:$("btnDownloadPoster"),
  btnOpenCard:$("btnOpenCard"),
  btnCopyCardLink:$("btnCopyCardLink"),
  btnHome:$("btnHome")
};

let currentId = "";
let currentItem = null;
let currentCardUrl = "";

boot();

async function boot(){
  try{
    setStatus("loading…");
    setBox("準備讀取名片資料…");

    currentId = String(qs("id") || "").trim();

    if(!currentId){
      setStatus("missing id");
      setBox("缺少名片 ID\n請使用 poster.html?id=TW0001");
      return;
    }

    currentCardUrl = buildCleanCardUrl(currentId);
    bindStaticActions();

    const data = await fetchCard(currentId);
    if(!data || !data.ok){
      throw new Error((data && (data.error || data.message)) || "無法讀取名片資料");
    }

    currentItem = data.item || data.data || {};
    renderPoster(currentItem, currentId);
    await renderQr(currentCardUrl);

    setStatus("ok");
    setBox("海報已生成完成\n可直接下載、複製名片連結或打開智慧名片。", true);
  }catch(err){
    console.error(err);
    setStatus("error");
    setBox("載入失敗\n" + (err?.message || String(err)), false, true);
  }
}

function bindStaticActions(){
  if(el.btnOpenCard){
    el.btnOpenCard.href = currentCardUrl || "./index.html";
  }

  if(el.btnHome){
    el.btnHome.href = DEFAULTS.HOME;
  }

  if(el.btnCopyCardLink){
    el.btnCopyCardLink.addEventListener("click", async ()=>{
      const ok = await copyText(currentCardUrl);
      if(ok){
        setBox("已複製名片連結", true);
      }
    });
  }

  if(el.btnDownloadPoster){
    el.btnDownloadPoster.addEventListener("click", async ()=>{
      await downloadPoster();
    });
  }
}

function baseUrl(){
  const path = location.pathname.replace(/\/[^\/]*$/, "/");
  return location.origin + path;
}

function buildCleanCardUrl(id){
  const u = new URL(baseUrl() + DEFAULTS.INDEX);
  u.searchParams.set("id", id);
  u.searchParams.set("view", "1");
  return u.toString();
}

async function fetchCard(id){
  const gas = localStorage.getItem("HSC_GAS") || DEFAULTS.GAS;
  const u = new URL(gas);
  u.searchParams.set("action","card");
  u.searchParams.set("id", id);
  u.searchParams.set("ts", Date.now());

  const res = await fetch(u.toString(), { cache:"no-store" });
  const j = await res.json().catch(()=>null);
  return j;
}

function renderPoster(item, id){
  const name = safe(item.name) || "你的名字";
  const unit = safe(item.unit) || "你的單位";
  const title = safe(item.title) || "你的頭銜";
  const slogan = safe(item.slogan);
  const services = normalizeServices(safe(item.services));
  const exp = normalizeExp(safe(item.experience));
  const avatar = safe(item.avatar_img);
  const logo = safe(item.logo_img);

  if(el.posterName) el.posterName.textContent = name;
  if(el.posterUnit) el.posterUnit.textContent = unit || "你的單位";
  if(el.posterTitle) el.posterTitle.textContent = title || "你的頭銜";

  if(el.posterAvatar){
    el.posterAvatar.src = avatar || DEFAULTS.DEFAULT_AVATAR;
  }

  if(slogan){
    el.posterSloganBox.style.display = "";
    el.posterSlogan.textContent = slogan;
  }else{
    el.posterSloganBox.style.display = "none";
  }

  if(services){
    el.posterServicesBox.style.display = "";
    el.posterServices.textContent = services;
  }else{
    el.posterServicesBox.style.display = "none";
  }

  if(exp){
    el.posterExpBox.style.display = "";
    el.posterExp.textContent = exp;
  }else{
    el.posterExpBox.style.display = "none";
  }

  if(el.posterLogo){
    if(logo){
      el.posterLogo.src = logo;
      el.posterLogo.style.display = "block";
    }else{
      el.posterLogo.removeAttribute("src");
      el.posterLogo.style.display = "none";
    }
  }

  document.title = `${name}｜微信名片海報`;
  if(el.btnOpenCard){
    el.btnOpenCard.href = buildCleanCardUrl(id);
  }
}

function normalizeServices(v){
  if(!v) return "";
  return compactText(v, 54);
}

function normalizeExp(v){
  if(!v) return "";
  return compactText(v, 88);
}

function compactText(v, max){
  const s = String(v || "")
    .replace(/[｜|]/g, "｜")
    .replace(/\s+/g, " ")
    .trim();

  if(s.length <= max) return s;
  return s.slice(0, max).trim() + "…";
}

async function renderQr(url){
  if(!el.posterQrBox || !window.QRCode) return;
  el.posterQrBox.innerHTML = "";

  const canvas = document.createElement("canvas");
  el.posterQrBox.appendChild(canvas);

  await QRCode.toCanvas(canvas, url, {
    width: 240,
    margin: 1,
    color: {
      dark: "#17202b",
      light: "#ffffff"
    }
  });
}

async function downloadPoster(){
  try{
    if(!el.posterCard){
      throw new Error("找不到海報區塊");
    }

    setBox("正在生成海報圖片…");

    const canvas = await html2canvas(el.posterCard, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false
    });

    const a = document.createElement("a");
    const safeId = currentId || "poster";
    a.href = canvas.toDataURL("image/png");
    a.download = `${safeId}-poster.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setBox("已下載名片海報 ✅", true);
  }catch(err){
    console.error(err);
    setBox("海報生成失敗\n" + (err?.message || String(err)), false, true);
  }
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(String(text || ""));
    return true;
  }catch(err){
    const v = prompt("請手動複製連結：", String(text || ""));
    return v !== null;
  }
}

function setStatus(text){
  if(el.statusBadge){
    el.statusBadge.textContent = text;
  }
}

function setBox(text, ok=false, bad=false){
  if(!el.statusBox) return;
  el.statusBox.textContent = text;
  el.statusBox.classList.remove("ok","bad");
  if(ok) el.statusBox.classList.add("ok");
  if(bad) el.statusBox.classList.add("bad");
}

function safe(v){
  return String(v || "").trim();
}

})();
