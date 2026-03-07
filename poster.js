/* =========================================
   HSC Poster
   poster.js v529.0
   COMPLETE OVERWRITE
========================================= */

document.addEventListener("DOMContentLoaded", init);

const GAS =
  "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

const BASE =
  "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

const qs = new URLSearchParams(location.search);
const id = (qs.get("id") || "").trim();

const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("name");
const unitEl = document.getElementById("unit");
const titleEl = document.getElementById("title");
const sloganEl = document.getElementById("slogan");
const servicesWrapEl = document.getElementById("servicesWrap");
const servicesEl = document.getElementById("services");
const expWrapEl = document.getElementById("expWrap");
const expEl = document.getElementById("exp");
const qrEl = document.getElementById("qrcode");
const openCardEl = document.getElementById("openCard");
const copyLinkEl = document.getElementById("copyLink");
const downloadEl = document.getElementById("download");
const posterEl = document.getElementById("poster");
const statusEl = document.getElementById("status");

let isDownloading = false;

function safe(v) {
  return String(v || "").trim();
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

function getCardUrl(cardId) {
  return `${BASE}?id=${encodeURIComponent(cardId)}&view=1`;
}

function firstTwoLines(text) {
  const t = safe(text);
  if (!t) return "";

  const arr = t
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, 2);

  return arr.join("\n");
}

function setBlock(el, wrapEl, value) {
  if (!el || !wrapEl) return;

  const t = safe(value);
  if (t) {
    el.textContent = t;
    wrapEl.style.display = "";
  } else {
    el.textContent = "";
    wrapEl.style.display = "none";
  }
}

function setBtnBusy(el, busy, busyText) {
  if (!el) return;

  if (busy) {
    if (!el.dataset.originText) {
      el.dataset.originText = el.textContent || "";
    }
    el.disabled = true;
    el.style.pointerEvents = "none";
    el.style.opacity = "0.78";
    if (busyText) el.textContent = busyText;
  } else {
    el.disabled = false;
    el.style.pointerEvents = "";
    el.style.opacity = "";
    if (el.dataset.originText) el.textContent = el.dataset.originText;
  }
}

function buildAvatarCandidates(item) {
  const list = [];

  if (typeof getAvatar === "function") {
    const main = safe(getAvatar(item));
    if (main) list.push(main);
  }

  const rawFast = safe(item.avatar_img_fast);
  const rawImg = safe(item.avatar_img);
  const rawUrl = safe(item.avatar_url);

  if (rawFast) list.push(rawFast);
  if (rawImg) list.push(rawImg);
  if (rawUrl) list.push(rawUrl);

  const m1 = rawImg.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const m2 = rawImg.match(/[?&]id=([^&]+)/i);
  const m3 = rawUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const m4 = rawUrl.match(/[?&]id=([^&]+)/i);

  const driveId =
    (m1 && m1[1]) ||
    (m2 && m2[1]) ||
    (m3 && m3[1]) ||
    (m4 && m4[1]) ||
    "";

  if (driveId) {
    list.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`);
    list.push(`https://drive.google.com/uc?export=view&id=${driveId}`);
  }

  return [...new Set(list.filter(Boolean))];
}

function loadImageInto(imgEl, candidates) {
  return new Promise((resolve) => {
    if (!imgEl) {
      resolve("");
      return;
    }

    const urls = (candidates || []).map(safe).filter(Boolean);
    if (!urls.length) {
      imgEl.style.visibility = "hidden";
      resolve("");
      return;
    }

    let idx = 0;

    const tryNext = () => {
      if (idx >= urls.length) {
        imgEl.style.visibility = "hidden";
        resolve("");
        return;
      }

      const src = urls[idx++];
      imgEl.onload = () => {
        imgEl.style.visibility = "visible";
        resolve(src);
      };
      imgEl.onerror = () => {
        tryNext();
      };
      imgEl.referrerPolicy = "no-referrer";
      imgEl.crossOrigin = "anonymous";
      imgEl.src = src;
    };

    tryNext();
  });
}

function renderQr(url) {
  if (!qrEl) return;

  qrEl.innerHTML = "";
  new QRCode(qrEl, {
    text: url,
    width: 300,
    height: 300,
    colorDark: "#111111",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    alert(okMsg);
  } catch (e) {
    prompt("請手動複製：", text);
  }
}

async function waitForImagesIn(el) {
  if (!el) return;

  const imgs = Array.from(el.querySelectorAll("img"));
  if (!imgs.length) return;

  await Promise.all(
    imgs.map((img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve(true);
          return;
        }
        img.onload = () => resolve(true);
        img.onerror = () => resolve(true);
      });
    })
  );
}

async function downloadPoster() {
  if (isDownloading) return;

  isDownloading = true;
  setBtnBusy(downloadEl, true, "生成中...");
  setStatus("正在生成海報...");

  try {
    await waitForImagesIn(posterEl);

    const canvas = await html2canvas(posterEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      allowTaint: false,
      logging: false
    });

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${id || "smartcard"}-poster.png`;
    a.click();

    setStatus("已生成海報");
  } catch (e) {
    console.error(e);
    setStatus("海報下載失敗");
  } finally {
    isDownloading = false;
    setBtnBusy(downloadEl, false);
  }
}

async function init() {
  if (!id) {
    setStatus("缺少 id");
    return;
  }

  setStatus("讀取名片...");

  try {
    const res = await fetch(`${GAS}?action=card&id=${encodeURIComponent(id)}&t=${Date.now()}`);
    const data = await res.json();

    if (!data || !data.ok) {
      setStatus("讀取失敗");
      if (nameEl) nameEl.textContent = "讀取失敗";
      return;
    }

    const item = data.item || data.data || {};

    if (nameEl) nameEl.textContent = safe(item.name) || "未命名";
    if (unitEl) unitEl.textContent = safe(item.unit);
    if (titleEl) titleEl.textContent = safe(item.title);

    const slogan = safe(item.slogan);
    if (sloganEl) {
      if (slogan) {
        sloganEl.textContent = slogan;
        sloganEl.style.display = "";
      } else {
        sloganEl.textContent = "";
        sloganEl.style.display = "none";
      }
    }

    setBlock(servicesEl, servicesWrapEl, firstTwoLines(item.services));
    setBlock(expEl, expWrapEl, firstTwoLines(item.experience));

    const avatarCandidates = buildAvatarCandidates(item);
    await loadImageInto(avatarEl, avatarCandidates);

    const cardUrl = getCardUrl(id);
    renderQr(cardUrl);

    if (openCardEl) {
      openCardEl.href = cardUrl;
      openCardEl.target = "_blank";
      openCardEl.rel = "noopener noreferrer";
    }

    if (copyLinkEl) {
      copyLinkEl.onclick = () => copyText(cardUrl, "已複製我的名片連結");
    }

    if (downloadEl) {
      downloadEl.onclick = downloadPoster;
    }

    setStatus("");
  } catch (e) {
    console.error(e);
    if (nameEl) nameEl.textContent = "讀取失敗";
    setStatus("讀取失敗");
  }
}