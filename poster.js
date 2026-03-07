/* =========================================
   HSC Poster
   poster.js v528
   COMPLETE OVERWRITE
========================================= */

const GAS =
"https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const BASE =
"https://angel0973180707.github.io/Happiness-Smart-Card-System/";

/* =========================
   圖片解析器
========================= */

function pickImage(...args) {
  for (const v of args) {
    if (v && String(v).trim()) {
      return String(v).trim();
    }
  }
  return "";
}

/* =========================
   DOM
========================= */

const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("name");
const unitEl = document.getElementById("unit");

const btnView = document.getElementById("btnView");
const btnCopy = document.getElementById("btnCopy");
const btnPoster = document.getElementById("btnPoster");

/* =========================
   讀取ID
========================= */

const qs = new URLSearchParams(location.search);
const id = qs.get("id") || "";

/* =========================
   載入資料
========================= */

async function load() {

  if (!id) return;

  const r = await fetch(`${GAS}?action=card&id=${id}`);
  const j = await r.json();

  if (!j.ok) return;

  const d = j.item || {};

  /* avatar */

  const avatar = pickImage(
    d.avatar_img_fast,
    d.avatar_img,
    d.avatar_url,
    d.avatar_key
  );

  if (avatar) avatarEl.src = avatar;

  /* name */

  nameEl.textContent = d.name || "";

  /* unit */

  unitEl.textContent = d.unit || "";

  /* 按鈕 */

  const cardUrl = `${BASE}?id=${id}`;

  btnView.onclick = () => {
    location.href = cardUrl;
  };

  btnCopy.onclick = () => {
    navigator.clipboard.writeText(cardUrl);
    alert("已複製名片連結");
  };

  btnPoster.onclick = () => {
    downloadPoster();
  };

}

/* =========================
   下載海報
========================= */

async function downloadPoster(){

  const node = document.getElementById("poster");

  const canvas = await html2canvas(node,{
    scale:2
  });

  const a = document.createElement("a");

  a.href = canvas.toDataURL("image/png");

  a.download = "smartcard.png";

  a.click();
}

/* ========================= */

load();