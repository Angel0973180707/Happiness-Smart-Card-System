const GAS = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
const BASE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

const qs = new URLSearchParams(location.search);
const id = (qs.get("id") || "").trim();

const statusEl = document.getElementById("status");
const posterEl = document.getElementById("poster");
const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("name");
const unitEl = document.getElementById("unit");
const titleEl = document.getElementById("title");
const sloganEl = document.getElementById("slogan");
const servicesEl = document.getElementById("services");
const expEl = document.getElementById("exp");
const qrCanvasEl = document.getElementById("qrcode");
const openCardEl = document.getElementById("openCard");
const copyLinkEl = document.getElementById("copyLink");
const downloadEl = document.getElementById("download");

function setStatus(msg) {
  statusEl.innerText = msg || "";
}

function safeText(v) {
  return String(v || "").trim();
}

function getCardUrl(cardId) {
  return `${BASE_URL}?id=${encodeURIComponent(cardId)}&view=1`;
}

function normalizeImageUrl(url) {
  const s = safeText(url);
  if (!s) return "";

  // Google Drive: /file/d/FILE_ID/view
  const m1 = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m1 && m1[1]) {
    return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w1200`;
  }

  // Google Drive: open?id=FILE_ID 或 uc?id=FILE_ID
  const m2 = s.match(/[?&]id=([^&]+)/i);
  if (/drive\.google\.com/i.test(s) && m2 && m2[1]) {
    return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w1200`;
  }

  return s;
}

function getAvatar(item) {
  return normalizeImageUrl(
    safeText(item.avatar_img_fast) ||
    safeText(item.avatar_img) ||
    safeText(item.avatar_url) ||
    safeText(item.avatar) ||
    ""
  );
}

function setBlockText(el, value) {
  const text = safeText(value);
  if (text) {
    el.innerText = text;
    el.style.display = "";
  } else {
    el.innerText = "";
    el.style.display = "none";
  }
}

function bindAvatar(url) {
  avatarEl.onerror = null;

  if (!url) {
    avatarEl.removeAttribute("src");
    avatarEl.style.display = "";
    return;
  }

  avatarEl.style.display = "";
  avatarEl.src = url;

  avatarEl.onerror = () => {
    avatarEl.removeAttribute("src");
    avatarEl.style.display = "";
  };
}

async function renderQrCode(url) {
  if (!qrCanvasEl) return;

  await QRCode.toCanvas(qrCanvasEl, url, {
    width: 300,
    margin: 2
  });
}

async function loadCard() {
  if (!id) {
    setStatus("缺少 id");
    return null;
  }

  setStatus("讀取名片...");

  const url = `${GAS}?action=card&id=${encodeURIComponent(id)}&t=${Date.now()}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();
  let data = null;

  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("JSON parse error:", err, text);
    return null;
  }

  if (!data || !data.ok) {
    console.error("GAS data not ok:", data);
    return null;
  }

  return data.item || data.data || data.card || {};
}

async function render(item) {
  nameEl.innerText = safeText(item.name) || "未命名";
  unitEl.innerText = safeText(item.unit);
  titleEl.innerText = safeText(item.title);

  setBlockText(sloganEl, item.slogan);
  setBlockText(servicesEl, item.services);
  setBlockText(expEl, item.experience);

  bindAvatar(getAvatar(item));

  const cardUrl = getCardUrl(id);

  openCardEl.href = cardUrl;
  openCardEl.target = "_blank";
  openCardEl.rel = "noopener noreferrer";

  await renderQrCode(cardUrl);

  copyLinkEl.onclick = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setStatus("已複製名片連結");
    } catch (err) {
      console.error(err);
      setStatus("複製失敗");
    }
  };

  downloadEl.onclick = async () => {
    try {
      setStatus("生成海報...");

      const canvas = await html2canvas(posterEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${id}-poster.png`;
      a.click();

      setStatus("下載完成");
    } catch (err) {
      console.error(err);
      setStatus("下載失敗");
    }
  };

  setStatus("OK");
}

async function init() {
  try {
    const item = await loadCard();

    if (!item) {
      setStatus("讀取失敗");
      return;
    }

    await render(item);
  } catch (err) {
    console.error(err);
    setStatus("讀取失敗");
  }
}

init();