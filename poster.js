/* ==========================================
 * HSC Poster v706.2
 * COMPLETE OVERWRITE
 *
 * v706.2 重點：
 * 1) 專修「下載海報沒有大頭照」
 * 2) 頭像優先轉成 data URL，提升 html2canvas 成功率
 * 3) 打開我的智慧名片固定走 view=1
 * 4) 海報只截 #posterCapture
 * 5) 保留分享 / 複製 / 推薦 / LINE OA / 分享說明
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "706.2";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA = "https://lin.ee/3r2ZePN";

  const qs = new URLSearchParams(location.search);
  const CARD_ID = (qs.get("id") || "").trim();
  const REF_ID = (qs.get("ref") || CARD_ID).trim();

  const $ = (id) => document.getElementById(id);

  const posterCaptureEl = $("posterCapture");
  const avatarEl = $("avatar");
  const avatarFallbackEl = $("avatarFallback");
  const nameEl = $("name");
  const unitEl = $("unit");
  const titleEl = $("title");
  const qrCodeEl = $("qrcode");
  const qrTipEl = $("qrTip");
  const statusEl = $("status");

  const btnShare = $("btnShare");
  const btnCopyCard = $("btnCopyCard");
  const btnDownload = $("btnDownload");
  const btnOpenCard = $("btnOpenCard");
  const btnShareGuide = $("btnShareGuide");
  const btnRecommend = $("btnRecommend");
  const btnConsult = $("btnConsult");

  const shareDialogEl = $("shareDialog");
  const btnCloseDialog = $("btnCloseDialog");

  let currentItem = null;
  let cardUrl = "";
  let currentAvatarUrl = "";
  let currentAvatarDataUrl = "";

  function getGasUrl() {
    const qGas = (qs.get("gas") || "").trim();
    const savedGas = (localStorage.getItem("HSC_GAS_URL") || "").trim();
    return qGas || savedGas || DEFAULT_GAS;
  }

  function getBaseUrl() {
    const qBase = (qs.get("base") || "").trim();
    const savedBase = (localStorage.getItem("HSC_BASE_URL") || "").trim();
    let base = qBase || savedBase || DEFAULT_BASE;
    if (!base.endsWith("/")) base += "/";
    return base;
  }

  function buildCardUrl(id) {
    const url = new URL("index.html", getBaseUrl());
    url.searchParams.set("id", id);
    url.searchParams.set("view", "1");
    if (REF_ID) url.searchParams.set("ref", REF_ID);
    return url.toString();
  }

  function buildRecommendUrl() {
    const url = new URL(getBaseUrl());
    if (REF_ID) url.searchParams.set("ref", REF_ID);
    return url.toString();
  }

  function buildConsultUrl(item) {
    const lineOA =
      text(item?.line_oa || item?.lineOA || item?.lineOa || item?.line_url || DEFAULT_LINE_OA);

    try {
      const url = new URL(lineOA);
      if (CARD_ID) url.searchParams.set("card", CARD_ID);
      if (REF_ID) url.searchParams.set("ref", REF_ID);
      return url.toString();
    } catch (_) {
      return lineOA || DEFAULT_LINE_OA;
    }
  }

  function text(v, fallback = "") {
    return String(v == null ? fallback : v).trim();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  function setLoading(message) {
    if (!statusEl) return;
    statusEl.dataset.type = "";
    statusEl.innerHTML = `
      <span class="loading">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </span>
      ${escapeHtml(message || "載入中...")}
    `;
  }

  function setStatus(message, type = "") {
    if (!statusEl) return;
    statusEl.dataset.type = type || "";
    statusEl.textContent = message || "";
  }

  function safeInitial(name) {
    const t = text(name, "名片");
    return t.slice(0, 2);
  }

  function resolveImage(url) {
    let out = text(url);
    if (!out) return "";

    if (out.includes("drive.google.com/file/d/")) {
      try {
        const id = out.split("/d/")[1].split("/")[0];
        out = `https://drive.google.com/uc?export=view&id=${id}`;
      } catch (_) {}
    }

    if (out.includes("firebasestorage.googleapis.com")) {
      out += (out.includes("?") ? "&" : "?") + "_ts=" + Date.now();
    }

    return out;
  }

  async function urlToDataUrl(url) {
    const finalUrl = resolveImage(url);
    if (!finalUrl) return "";

    try {
      const res = await fetch(finalUrl, { mode: "cors", cache: "no-store" });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();

      return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => reject(new Error("FileReader failed"));
        fr.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("[HSC Poster] urlToDataUrl failed:", err);
      return "";
    }
  }

  function waitForImage(img, timeout = 8000) {
    if (!img) return Promise.resolve(false);
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);

    return new Promise((resolve) => {
      let done = false;

      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
        resolve(ok);
      };

      const onLoad = () => finish(true);
      const onError = () => finish(false);

      const timer = setTimeout(() => finish(img.complete && img.naturalWidth > 0), timeout);

      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onError, { once: true });
    });
  }

  async function applyAvatarToDom(src, name) {
    if (!avatarEl || !avatarFallbackEl) return false;

    const finalSrc = text(src);
    if (!finalSrc) {
      avatarEl.style.display = "none";
      avatarFallbackEl.style.display = "grid";
      avatarFallbackEl.textContent = safeInitial(name);
      return false;
    }

    avatarEl.style.display = "none";
    avatarFallbackEl.style.display = "grid";
    avatarFallbackEl.textContent = safeInitial(name);

    avatarEl.onload = () => {
      avatarEl.style.display = "block";
      avatarFallbackEl.style.display = "none";
    };

    avatarEl.onerror = () => {
      avatarEl.style.display = "none";
      avatarFallbackEl.style.display = "grid";
      avatarFallbackEl.textContent = safeInitial(name);
    };

    avatarEl.src = finalSrc;

    const ok = await waitForImage(avatarEl, 8000);
    if (ok) {
      avatarEl.style.display = "block";
      avatarFallbackEl.style.display = "none";
      return true;
    }

    avatarEl.style.display = "none";
    avatarFallbackEl.style.display = "grid";
    avatarFallbackEl.textContent = safeInitial(name);
    return false;
  }

  function pickImage(item) {
    const candidates = [
      item.avatar_url,
      item.avatar_img_fast,
      item.avatar_img,
      item.avatar,
      item.avatarUrl
    ].map(v => text(v)).filter(Boolean);

    return candidates[0] || "";
  }

  function normalizeItem(raw) {
    const item = raw || {};
    return {
      id: text(item.id || CARD_ID),
      name: text(item.name, "智慧名片"),
      unit: text(item.unit),
      title: text(item.title),
      avatar_url: text(item.avatar_url),
      avatar_img_fast: text(item.avatar_img_fast),
      avatar_img: text(item.avatar_img),
      avatar: text(item.avatar),
      avatarUrl: text(item.avatarUrl),
      line_oa: text(item.line_oa),
      line_url: text(item.line_url)
    };
  }

  function getCardPayload(json) {
    if (!json || typeof json !== "object") return null;
    if (json.item && typeof json.item === "object") return json.item;
    if (json.data && typeof json.data === "object") return json.data;
    if (json.card && typeof json.card === "object") return json.card;
    if (json.row && typeof json.row === "object") return json.row;
    if (json.ok && json.id) return json;
    return null;
  }

  async function fetchCard(id) {
    const gas = getGasUrl();
    const url = new URL(gas);
    url.searchParams.set("action", "card");
    url.searchParams.set("id", id);

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`讀取失敗（${res.status}）`);
    }

    const json = await res.json();
    const payload = getCardPayload(json);

    if (!payload) {
      throw new Error("找不到名片資料");
    }

    return normalizeItem(payload);
  }

  function renderQrCode(url) {
    if (!qrCodeEl) return;
    qrCodeEl.innerHTML = "";

    try {
      new QRCode(qrCodeEl, {
        text: url,
        width: 196,
        height: 196,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (err) {
      console.error("QRCode 產生失敗", err);
    }
  }

  async function copyText(value) {
    const textValue = String(value || "");
    if (!textValue) throw new Error("empty");

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textValue);
      return;
    }

    const ta = document.createElement("textarea");
    ta.value = textValue;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    if (!ok) throw new Error("copy failed");
  }

  async function shareCard() {
    if (!cardUrl) throw new Error("missing card url");

    const shareData = {
      title: "我的智慧名片",
      text: "歡迎查看我的智慧名片",
      url: cardUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setStatus("已開啟分享選單", "success");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") {
          setStatus("已取消分享", "");
          return;
        }
      }
    }

    await copyText(cardUrl);
    setStatus("此裝置不支援一鍵分享，已改為複製名片連結", "success");
  }

  function openDialog() {
    if (!shareDialogEl) return;
    shareDialogEl.classList.add("is-open");
    shareDialogEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeDialog() {
    if (!shareDialogEl) return;
    shareDialogEl.classList.remove("is-open");
    shareDialogEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  async function prepareAvatar(name) {
    const rawUrl = pickImage(currentItem || {});
    currentAvatarUrl = resolveImage(rawUrl);

    // 優先轉成 data URL，海報成功率最高
    currentAvatarDataUrl = await urlToDataUrl(currentAvatarUrl);

    if (currentAvatarDataUrl) {
      await applyAvatarToDom(currentAvatarDataUrl, name);
      return;
    }

    if (currentAvatarUrl) {
      await applyAvatarToDom(currentAvatarUrl, name);
      return;
    }

    await applyAvatarToDom("", name);
  }

  async function downloadPoster(item) {
    const target = posterCaptureEl || $("poster");
    if (!target) throw new Error("找不到海報區塊");

    // 截圖前再強制一次，避免海報漏頭像
    if (currentAvatarDataUrl) {
      await applyAvatarToDom(currentAvatarDataUrl, item.name);
    } else if (currentAvatarUrl) {
      const retryDataUrl = await urlToDataUrl(currentAvatarUrl);
      if (retryDataUrl) {
        currentAvatarDataUrl = retryDataUrl;
        await applyAvatarToDom(currentAvatarDataUrl, item.name);
      } else {
        await applyAvatarToDom(currentAvatarUrl, item.name);
      }
    }

    if (avatarEl) {
      await waitForImage(avatarEl, 8000);
    }

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(target, {
      backgroundColor: null,
      scale: Math.min(window.devicePixelRatio || 2, 3),
      useCORS: false,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight
    });

    const link = document.createElement("a");
    const safeId = text(item.id || CARD_ID || "card").replace(/[^\w-]+/g, "_");
    link.download = `${safeId}_poster.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function bindDialogEvents() {
    if (btnShareGuide) btnShareGuide.onclick = openDialog;
    if (btnCloseDialog) btnCloseDialog.onclick = closeDialog;

    if (shareDialogEl) {
      shareDialogEl.addEventListener("click", (e) => {
        const target = e.target;
        if (target && target.dataset && target.dataset.closeDialog === "1") {
          closeDialog();
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && shareDialogEl?.classList.contains("is-open")) {
        closeDialog();
      }
    });
  }

  async function renderCard(item) {
    currentItem = item;
    cardUrl = buildCardUrl(item.id || CARD_ID);

    if (nameEl) nameEl.textContent = item.name || "智慧名片";
    if (unitEl) unitEl.textContent = item.unit || "　";
    if (titleEl) titleEl.textContent = item.title || "　";
    if (qrTipEl) qrTipEl.textContent = "掃描 QRCode 打開智慧名片";

    await prepareAvatar(item.name);
    renderQrCode(cardUrl);

    if (btnShare) {
      btnShare.disabled = false;
      btnShare.onclick = async () => {
        try {
          await shareCard();
        } catch (err) {
          console.error(err);
          setStatus("分享失敗，請稍後再試", "error");
        }
      };
    }

    if (btnCopyCard) {
      btnCopyCard.disabled = false;
      btnCopyCard.onclick = async () => {
        try {
          await copyText(cardUrl);
          setStatus("已複製智慧名片連結", "success");
        } catch (err) {
          console.error(err);
          setStatus("複製失敗，請稍後再試", "error");
        }
      };
    }

    if (btnDownload) {
      btnDownload.disabled = false;
      btnDownload.onclick = async () => {
        try {
          setLoading("正在產生海報，請稍候...");
          await downloadPoster(item);
          setStatus("海報已下載", "success");
        } catch (err) {
          console.error(err);
          setStatus("海報產生失敗，請稍後再試", "error");
        }
      };
    }

    if (btnOpenCard) {
      btnOpenCard.disabled = false;
      btnOpenCard.onclick = () => {
        window.open(cardUrl, "_blank", "noopener");
      };
    }

    if (btnRecommend) {
      btnRecommend.disabled = false;
      btnRecommend.onclick = async () => {
        try {
          await copyText(buildRecommendUrl());
          setStatus("已複製推薦連結", "success");
        } catch (err) {
          console.error(err);
          setStatus("複製推薦連結失敗", "error");
        }
      };
    }

    if (btnConsult) {
      btnConsult.disabled = false;
      btnConsult.onclick = () => {
        window.open(buildConsultUrl(item), "_blank", "noopener");
      };
    }

    setStatus("交付卡已載入完成", "success");
  }

  function disableAllButtons() {
    [btnShare, btnCopyCard, btnDownload, btnOpenCard, btnShareGuide, btnRecommend, btnConsult]
      .filter(Boolean)
      .forEach((btn) => {
        btn.disabled = true;
      });
  }

  async function init() {
    bindDialogEvents();

    if (!CARD_ID) {
      disableAllButtons();
      setStatus("缺少名片 ID", "error");
      return;
    }

    setLoading("正在載入交付卡資料...");

    try {
      const item = await fetchCard(CARD_ID);
      await renderCard(item);
    } catch (err) {
      console.error(err);
      disableAllButtons();
      setStatus(err.message || "交付卡載入失敗", "error");
    }
  }

  init();
})();