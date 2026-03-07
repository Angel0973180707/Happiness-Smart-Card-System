document.addEventListener("DOMContentLoaded", function () {
  const GAS = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const BASE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
  const SYSTEM_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

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
  const copySystemEl = document.getElementById("copySystem");
  const downloadEl = document.getElementById("download");
  const downloadRecommendEl = document.getElementById("downloadRecommend");

  const recPosterEl = document.getElementById("recommendPoster");
  const recAvatarEl = document.getElementById("recAvatar");
  const recNameEl = document.getElementById("recName");
  const recRoleEl = document.getElementById("recRole");
  const recCopyEl = document.getElementById("recCopy");
  const recommendQrEl = document.getElementById("recommendQr");

  let currentItem = null;
  let currentAvatarUrl = "";
  let isDownloadingMain = false;
  let isDownloadingRecommend = false;

  function setStatus(msg) {
    if (statusEl) statusEl.innerText = msg || "";
  }

  function safe(v) {
    return String(v || "").trim();
  }

  function getCardUrl(cardId) {
    return `${BASE_URL}?id=${encodeURIComponent(cardId)}&view=1`;
  }

  function extractDriveFileId(url) {
    const s = safe(url);
    if (!s) return "";

    let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (m && m[1]) return m[1];

    m = s.match(/[?&]id=([^&]+)/i);
    if (/drive\.google\.com/i.test(s) && m && m[1]) return m[1];

    return "";
  }

  function normalizeImageUrl(url) {
    const s = safe(url);
    if (!s) return "";

    const driveId = extractDriveFileId(s);
    if (driveId) {
      return `https://drive.google.com/uc?export=view&id=${driveId}`;
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
      .map(v => v.trim())
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

  function hideBrokenImage(imgEl) {
    if (!imgEl) return;
    imgEl.removeAttribute("src");
    imgEl.alt = "";
    imgEl.style.display = "none";
    imgEl.style.visibility = "hidden";
  }

  function showImage(imgEl) {
    if (!imgEl) return;
    imgEl.style.display = "block";
    imgEl.style.visibility = "visible";
  }

  function setBtnBusy(el, busy, busyText) {
    if (!el) return;

    if (busy) {
      if (!el.dataset.originText) {
        el.dataset.originText = el.textContent || "";
      }
      el.disabled = true;
      el.style.pointerEvents = "none";
      el.style.opacity = "0.72";
      if (busyText) el.textContent = busyText;
      return;
    }

    el.disabled = false;
    el.style.pointerEvents = "";
    el.style.opacity = "";
    if (el.dataset.originText) el.textContent = el.dataset.originText;
  }

  function tryImageCandidates(imgEl, candidates) {
    return new Promise((resolve) => {
      if (!imgEl) {
        resolve("");
        return;
      }

      const list = candidates.map(safe).filter(Boolean);
      if (!list.length) {
        hideBrokenImage(imgEl);
        resolve("");
        return;
      }

      let idx = 0;

      const tryNext = () => {
        if (idx >= list.length) {
          hideBrokenImage(imgEl);
          resolve("");
          return;
        }

        const url = list[idx++];
        imgEl.onload = () => {
          showImage(imgEl);
          resolve(url);
        };
        imgEl.onerror = () => {
          tryNext();
        };
        imgEl.crossOrigin = "anonymous";
        imgEl.referrerPolicy = "no-referrer";
        imgEl.src = url;
      };

      tryNext();
    });
  }

  function bindAvatar(imgEl, item) {
    const rawFast = safe(item.avatar_img_fast);
    const rawImg = safe(item.avatar_img);
    const rawUrl = safe(item.avatar_url);
    const rawAvatar = safe(item.avatar);

    const candidates = [];

    if (rawFast) candidates.push(normalizeImageUrl(rawFast));
    if (rawImg) candidates.push(normalizeImageUrl(rawImg));
    if (rawUrl) candidates.push(normalizeImageUrl(rawUrl));
    if (rawAvatar) candidates.push(normalizeImageUrl(rawAvatar));

    const driveId =
      extractDriveFileId(rawFast) ||
      extractDriveFileId(rawImg) ||
      extractDriveFileId(rawUrl) ||
      extractDriveFileId(rawAvatar);

    if (driveId) {
      candidates.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`);
    }

    return tryImageCandidates(imgEl, candidates);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) {
        reject(new Error("empty image src"));
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image load fail"));
      img.src = src;
    });
  }

  function makeBaseQrCanvas(url, size) {
    return new Promise((resolve, reject) => {
      try {
        const temp = document.createElement("div");
        temp.style.position = "fixed";
        temp.style.left = "-99999px";
        temp.style.top = "-99999px";
        temp.style.width = `${size}px`;
        temp.style.height = `${size}px`;
        document.body.appendChild(temp);

        new QRCode(temp, {
          text: url,
          width: size,
          height: size,
          colorDark: "#111111",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
          try {
            const qrCanvas = temp.querySelector("canvas");
            const qrImg = temp.querySelector("img");

            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              temp.remove();
              reject(new Error("canvas context fail"));
              return;
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size, size);

            if (qrCanvas) {
              ctx.drawImage(qrCanvas, 0, 0, size, size);
              temp.remove();
              resolve(canvas);
              return;
            }

            if (qrImg) {
              loadImage(qrImg.src)
                .then((img) => {
                  ctx.drawImage(img, 0, 0, size, size);
                  temp.remove();
                  resolve(canvas);
                })
                .catch((err) => {
                  temp.remove();
                  reject(err);
                });
              return;
            }

            temp.remove();
            reject(new Error("qr not generated"));
          } catch (e) {
            temp.remove();
            reject(e);
          }
        }, 220);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function renderQrInto(wrapEl, url) {
    if (!wrapEl) return;

    wrapEl.innerHTML = "";

    try {
      const size = 300;
      const canvas = await makeBaseQrCanvas(url, size);
      wrapEl.innerHTML = "";
      wrapEl.appendChild(canvas);
    } catch (e) {
      console.error("QRCode render error:", e);
      wrapEl.innerHTML = `<div style="font-size:14px;color:#666;">QR 生成失敗</div>`;
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

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      alert(okMsg);
    } catch (e) {
      console.error(e);
      prompt("請手動複製連結：", text);
    }
  }

  function buildRecommendRole(item) {
    const arr = [safe(item.unit), safe(item.title)].filter(Boolean);
    return arr.join("\n");
  }

  function buildRecommendCopy(item) {
    const name = safe(item.name) || "我";
    return `${name}正在使用智慧名片，\n把個人介紹、服務資訊與分享入口整理在同一張名片裡。\n\n你也可以看看這個系統。`;
  }

  async function renderRecommendPoster(item, avatarUrl) {
    if (recNameEl) recNameEl.innerText = safe(item.name) || "推薦者";
    if (recRoleEl) recRoleEl.innerText = buildRecommendRole(item);
    if (recCopyEl) recCopyEl.innerText = buildRecommendCopy(item);

    if (avatarUrl) {
      await tryImageCandidates(recAvatarEl, [avatarUrl]);
    } else {
      hideBrokenImage(recAvatarEl);
    }

    await renderQrInto(recommendQrEl, SYSTEM_URL);
  }

  async function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("blob create fail"));
            return;
          }

          const blobUrl = URL.createObjectURL(blob);

          try {
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 3000);

            resolve(true);
          } catch (e) {
            try {
              window.open(blobUrl, "_blank");
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 10000);
              resolve(true);
            } catch (err) {
              URL.revokeObjectURL(blobUrl);
              reject(err);
            }
          }
        }, "image/png");
      } catch (e) {
        reject(e);
      }
    });
  }

  async function waitForImagesIn(el) {
    if (!el) return;

    const images = Array.from(el.querySelectorAll("img"));
    if (!images.length) return;

    await Promise.all(
      images.map((img) => {
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

  async function captureAndDownload(targetEl, filename, bgColor) {
    await waitForImagesIn(targetEl);

    const canvas = await html2canvas(targetEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: bgColor,
      allowTaint: false,
      logging: false
    });

    await downloadCanvas(canvas, filename);
  }

  async function render(item) {
    currentItem = item;

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

    currentAvatarUrl = await bindAvatar(avatarEl, item);

    const cardUrl = getCardUrl(id);

    if (openCardEl) {
      openCardEl.href = cardUrl;
      openCardEl.target = "_blank";
      openCardEl.rel = "noopener noreferrer";
    }

    await renderQrInto(qrWrapEl, cardUrl);
    await renderRecommendPoster(item, currentAvatarUrl);

    if (copyLinkEl) {
      copyLinkEl.onclick = () => copyText(cardUrl, "已複製我的名片連結");
    }

    if (copySystemEl) {
      copySystemEl.onclick = () => copyText(SYSTEM_URL, "已複製推薦連結");
    }

    if (downloadEl) {
      downloadEl.onclick = async () => {
        if (isDownloadingMain) return;
        isDownloadingMain = true;
        setBtnBusy(downloadEl, true, "生成中...");

        try {
          setStatus("生成我的名片海報...");
          await captureAndDownload(posterEl, `${id}-poster.png`, "#ffffff");
          setStatus("已生成，若未自動下載，請到新開圖片頁手動另存");
        } catch (e) {
          console.error(e);
          setStatus("名片海報下載失敗");
        } finally {
          isDownloadingMain = false;
          setBtnBusy(downloadEl, false);
        }
      };
    }

    if (downloadRecommendEl) {
      downloadRecommendEl.onclick = async () => {
        if (isDownloadingRecommend) return;
        isDownloadingRecommend = true;
        setBtnBusy(downloadRecommendEl, true, "生成中...");

        try {
          setStatus("生成推薦海報...");
          await captureAndDownload(recPosterEl, `${id}-recommend.png`, "#fffaf2");
          setStatus("已生成，若未自動下載，請到新開圖片頁手動另存");
        } catch (e) {
          console.error(e);
          setStatus("推薦海報下載失敗");
        } finally {
          isDownloadingRecommend = false;
          setBtnBusy(downloadRecommendEl, false);
        }
      };
    }

    setTimeout(() => {
      if (safe(statusEl && statusEl.innerText).includes("已生成")) {
        setStatus("");
      }
    }, 4000);
  }

  async function init() {
    try {
      const item = await loadCard();

      if (!item) {
        if (nameEl) nameEl.innerText = "讀取失敗";
        setStatus("讀取失敗");
        return;
      }

      await render(item);
    } catch (e) {
      console.error(e);
      if (nameEl) nameEl.innerText = "讀取失敗";
      setStatus("讀取失敗");
    }
  }

  init();
});