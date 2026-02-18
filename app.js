/* =========================
   Angel Smart Card v366
   Front Only Stable Version
========================= */

const API_BASE = "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";

let cardData = null;
let currentColor = "pink";
let currentLayout = "arch"; // arch | flat | dawn
let currentMode = "free";   // free | premium

/* =========================
   Init
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  await loadCard();
  bindUI();
});

/* =========================
   Fetch Data
========================= */

async function loadCard() {
  try {
    const res = await fetch(API_BASE);
    const json = await res.json();

    if (!json.ok) return;

    cardData = json.data;
    renderCard();

  } catch (err) {
    console.error("Load error:", err);
  }
}

/* =========================
   Render
========================= */

function renderCard() {
  if (!cardData) return;

  const root = document.getElementById("card");
  root.className = `card ${currentMode} ${currentColor} ${currentLayout}`;

  renderProfile();
  renderProducts();
  renderLinks();
}

/* =========================
   Profile
========================= */

function renderProfile() {
  const name = cardData["姓名（名片大標題）"] || "";
  const slogan = cardData["理念標語（顯示在照片下方，精簡有力）"] || "";
  const photo = convertDrive(cardData["個人專業形象照（名片主圖）"]);

  document.getElementById("profile").innerHTML = `
    ${photo ? `<img class="avatar" src="${photo}">` : ""}
    <h1>${name}</h1>
    ${slogan ? `<p class="slogan">${slogan}</p>` : ""}
  `;
}

/* =========================
   Product Photos
========================= */

function renderProducts() {
  const raw = cardData["產品或品牌或活動照片最多3張（內容區插圖）"];
  if (!raw) return;

  const arr = raw.split(",");
  const html = arr.map(url => {
    const img = convertDrive(url.trim());
    return `<img src="${img}" class="product-img">`;
  }).join("");

  document.getElementById("products").innerHTML = html;
}

/* =========================
   Links + Navigation
========================= */

function renderLinks() {
  const addr = cardData["影音平台 3（或地址）"];
  const container = document.getElementById("links");
  let html = "";

  if (addr) {
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    html += `<a href="${mapLink}" target="_blank" class="btn">導航</a>`;
  }

  container.innerHTML = html;
}

/* =========================
   Convert Google Drive Link
========================= */

function convertDrive(url) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[0]}`;
    }
  }
  return url;
}

/* =========================
   UI Controls
========================= */

function bindUI() {

  document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentColor = btn.dataset.color;
      renderCard();
    });
  });

  document.querySelectorAll(".layout-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentLayout = btn.dataset.layout;
      renderCard();
    });
  });

  document.getElementById("modeToggle").addEventListener("click", () => {
    currentMode = currentMode === "free" ? "premium" : "free";
    renderCard();
  });

}