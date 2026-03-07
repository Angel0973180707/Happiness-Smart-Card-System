document.addEventListener("DOMContentLoaded", function () {
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

  const servicesWrapEl = document.getElementById("servicesWrap");
  const servicesEl = document.getElementById("services");
  const expWrapEl = document.getElementById("expWrap");
  const expEl = document.getElementById("exp");

  const qrWrapEl = document.getElementById("qrcode");
  const openCardEl = document.getElementById("openCard");
  const copyLinkEl = document.getElementById("copyLink");
  const downloadEl = document.getElementById("download");

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.innerText = msg || "";
  }

  function safe(v) {
    return String(v || "").trim();
  }

  function getCardUrl(cardId) {
    return `${BASE_URL}?id=${encodeURIComponent(cardId)}&view=1`;
  }

  function normalizeImageUrl(url) {
    const s = safe(url);
    if (!s) return "";

    const m1 = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (m1 && m1[1]) {
      return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w1200`;
    }

    const m2 = s.match(/[?&]id=([^&]+)/i);
    if (/drive\.google\.com/i.test(s) && m2 && m2[1]) {
      return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w1200`;
    }

    return s;
  }

  function getAvatar(item) {
    return normalizeImageUrl(
      safe(item.avatar_img_fast) ||
      safe(item.avatar_img) ||
      safe(item.avatar_url) ||
      safe(item.avatar) ||
      ""
    );
  }

  function firstTwoLines(text) {
    const t = safe(text);
    if (!t) return "";

    const arr = t
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 2);

    return arr.length ? arr.join("\n") : t;
  }

  function setBlock(el, wrapEl, value) {
    if (!el || !wrapEl) return;

    const t = safe(value);
    if (t) {
      el.innerText = t;
      wrapEl.style.display = "";
    } else {
      el.innerText = "";
      wrapEl.style.display = "none";
    }
  }

  function bindAvatar(url) {
    if (!avatarEl) return;

    avatarEl.onerror = null;

    if (!url) {
      avatarEl.removeAttribute("src");
      return;
    }

    avatarEl.src = url;
    avatarEl.onerror = () => {
      avatarEl.removeAttribute("src");
    };
  }

  function getQrCenterImageUrl(item) {
    return getAvatar(item);
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  async function renderQrWithCenter(url, centerImageUrl) {
    if (!qrWrapEl) return;

    qrWrapEl.innerHTML = "";

    const size = 300;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    qrWrapEl.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      if (typeof QRCode !== "undefined" && typeof QRCode.toCanvas === "function") {
        await QRCode.toCanvas(canvas, url, {
          width: size,
          margin: 2,
          color: {
            dark: "#111111",
            light: "#ffffff"
          }
        });
      } else if (typeof QRCode !== "undefined") {
        // qrcodejs fallback: 先生成到暫存容器，再畫到主 canvas
        const temp = document.createElement("div");
        temp.style.position = "fixed";
        temp.style.left = "-99999px";
        temp.style.top = "-99999px";
        document.body.appendChild(temp);

        new QRCode(temp, {
          text: url,
          width: size,
          height: size
        });

        await new Promise((r) => setTimeout(r, 120));

        const img = temp.querySelector("img");
        const qrCanvas = temp.querySelector("canvas");

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);

        if (qrCanvas) {
          ctx.drawImage(qrCanvas, 0, 0, size, size);
        } else if (img) {
          const qrImg = await loadImage(img.src);
          ctx.drawImage(qrImg, 0, 0, size, size);
        }

        temp.remove();
      } else {
        qrWrapEl.innerHTML = `<div style="font-size:14px;color:#666;">QR 載入失敗</div>`;
        return;
      }

      if (centerImageUrl) {
        try {
          const centerImg = await loadImage(centerImageUrl);

          const boxSize = 68;
          const innerSize = 56;
          const x = (size - boxSize) / 2;
          const y = (size - boxSize) / 2;
          const ix = (size - innerSize) / 2;
          const iy = (size - innerSize) / 2;

          ctx.save();

          // 白底框
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(0,0,0,.10)";
          ctx.shadowBlur = 12;
          roundRect(ctx, x, y, boxSize, boxSize, 18);
          ctx.fill();

          // 內部圓形裁切
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, innerSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(centerImg, ix, iy, innerSize, innerSize);

          ctx.restore();
        } catch (e) {
          console.warn("center image fail", e);
        }
      }
    } catch (err) {
      console.error("QRCode render error:", err);
      qrWrapEl.innerHTML = `<div style="font-size:14px;color:#666;">QR 生成失敗</div>`;
    }
  }

  async function loadCard() {
    if (!id) {
      setStatus("缺少 id");
      return null;
    }

    setStatus("讀取名片...");

    const url = `${GAS}?action=card&id=${encodeURIComponent(id)}&t=${Date.now()}`;
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const txt = await res.text();
    let data;

    try {
      data = JSON.parse(txt);
    } catch (e) {
      console.error("JSON parse error:", txt);
      return null;
    }

    if (!data || !data.ok) return null;

    return data.item || data.data || {};
  }

  async function render(item) {
    if (nameEl) nameEl.innerText = safe(item.name) || "未命名";
    if (unitEl) unitEl.innerText = safe(item.unit);
    if (titleEl) titleEl.innerText = safe(item.title);

    const slogan = safe(item.slogan);
    if (sloganEl) {
      if (slogan) {
        sloganEl.innerText = slogan;
        sloganEl.style.display = "";
      } else {
        sloganEl.innerText = "";
        sloganEl.style.display = "none";
      }
    }

    setBlock(servicesEl, servicesWrapEl, firstTwoLines(item.services));
    setBlock(expEl, expWrapEl, firstTwoLines(item.experience));

    const avatarUrl = getAvatar(item);
    bindAvatar(avatarUrl);

    const cardUrl = getCardUrl(id);

    if (openCardEl) {
      openCardEl.href = cardUrl;
      openCardEl.target = "_blank";
      openCardEl.rel = "noopener noreferrer";
    }

    await renderQrWithCenter(cardUrl, getQrCenterImageUrl(item));

    if (copyLinkEl) {
      copyLinkEl.onclick = async () => {
        try {
          await navigator.clipboard.writeText(cardUrl);
          setStatus("");
        } catch (e) {
          console.error(e);
        }
      };
    }

    if (downloadEl) {
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

          setStatus("");
        } catch (e) {
          console.error(e);
          setStatus("");
        }
      };
    }

    setStatus("");
  }

  async function init() {
    try {
      const item = await loadCard();

      if (!item) {
        if (nameEl) nameEl.innerText = "讀取失敗";
        return;
      }

      await render(item);
    } catch (e) {
      console.error(e);
      if (nameEl) nameEl.innerText = "讀取失敗";
    }
  }

  init();
});