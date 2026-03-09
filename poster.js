/* ==========================================
 * HSC Poster v705.5
 * COMPLETE OVERWRITE
 *
 * v705.5 重點：
 * 1) 修正打開我的智慧名片連結，改回 ?id=TWxxxx
 * 2) 海報截圖只截 posterCapture，不帶按鈕
 * 3) Firebase 圖片主線修正
 * 4) 取圖優先順序：
 *    avatar_url -> avatar_img_fast -> avatar_img -> avatar
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "705.5";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA = "https://lin.ee/3r2ZePN";

  const qs = new URLSearchParams(location.search);
  const CARD_ID = (qs.get("id") || "").trim();
  const REF_ID = (qs.get("ref") || "").trim();
  const DEBUG = (qs.get("debug") || "").trim() === "1";

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

  function log(...args) {
    if (DEBUG) console.log("[HSC Poster]", ...args);
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
    const base = getBaseUrl();
    const url = new URL(base);
    url.searchParams.set("id", id);
    if (REF_ID) url.searchParams.set("ref", REF_ID);
    return url.toString();
  }

  function buildRecommendUrl() {
    const url = new URL(getBaseUrl());
    if (CARD_ID) url.searchParams.set("ref", CARD_ID);
    return url.toString();
  }

  function buildConsultUrl(item) {
    const lineOA =
      text(item?.line_oa || item?.lineOA || item?.lineOa || item?.line_url || DEFAULT_LINE_OA);

    try {
      const url = new URL(lineOA);
      if (CARD_ID) url.searchParams.set("card", CARD_ID);
      if (REF_ID || CARD_ID) url.searchParams.set("ref", REF_ID || CARD_ID);
      return url.toString();
    } catch (_) {
      return lineOA || DEFAULT_LINE_OA;
    }
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

  function pickImage(item) {
    const candidates = [
      { key: "avatar_url", value: text(item.avatar_url) },
      { key: "avatar_img_fast", value: text(item.avatar_img_fast) },
      { key: "avatar_img", value: text(item.avatar_img) },
      { key: "avatar", value: text(item.avatar) }
    ].filter((x) => x.value);

    for (const row of candidates) {
      log("pickImage =>", row.key, row.value);
      if (row.value) return row.value;
    }

    log("pickImage => none");
    return "";
  }

  function waitForSingleImage(img, timeout = 6000) {
    if (!img) return Promise.resolve(false);
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);

    return new Promise((resolve) => {
      let done = false;

      const cleanup = () => {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
      };

      const finish = (ok) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(ok);
      };

      const onLoad = () => finish(true);
      const onError = () => finish(false);

      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onError, { once: true });

      setTimeout(() => finish(img.complete && img.naturalWidth > 0), timeout);
    });
  }

  async function setAvatar(src, name) {
    if (!avatarEl || !avatarFallbackEl) return false;

    const finalSrc = text(src);
    avatarFallbackEl.textContent = safeInitial(name);

    if (!finalSrc) {
      avatarEl.style.display = "none";
      avatarFallbackEl.style.display = "grid";
      currentAvatarUrl = "";
      return false;
    }

    avatarFallbackEl.style.display = "grid";
    avatarEl.style.display = "none";

    avatarEl.crossOrigin = "anonymous";
    avatarEl.referrerPolicy = "no-referrer";
    avatarEl.src = finalSrc;
    currentAvatarUrl = finalSrc;

    const ok = await waitForSingleImage(avatarEl, 6500);
    log("setAvatar loaded =>", ok, finalSrc);

    if (ok) {
      avatarEl.style.display = "block";
      avatarFallbackEl.style.display = "none";
      return true;
    }

    avatarEl.style.display = "none";
    avatarFallbackEl.style.display = "grid";
    return false;
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

    if (!res.ok) throw new Error(`讀取失敗（${res.status}）`);

    const json = await res.json();
    log("fetchCard =>", json);

    const payload = getCardPayload(json);
    if (!payload) throw new Error("找不到名片資料");

    return normalizeItem(payload);
  }

  function renderQrCode(url) {
    if (!qrCodeEl) return;
    qrCodeEl.innerHTML = "";

    new QRCode(qrCodeEl, {
      text: url,
      width: 196,
      height: 196,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
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

  async function waitForImages(root) {
    if (!root) return;
    const images = Array.from(root.querySelectorAll("img"));
    await Promise.all(images.map((img) => waitForSingleImage(img, 4000).catch(() => false)));
  }

  async function downloadPoster(item) {
    if (!posterCaptureEl) throw new Error("找不到海報區塊");

    if ((!avatarEl.complete || avatarEl.naturalWidth <= 0) && currentAvatarUrl) {
      await setAvatar(currentAvatarUrl, item.name);
    }

    await waitForImages(posterCaptureEl);

    const canvas = await html2canvas(posterCaptureEl, {
      backgroundColor: null,
      scale: Math.min(window.devicePixelRatio || 2, 3),
      useCORS: true,
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

    const avatarUrl = pickImage(item);
    await setAvatar(avatarUrl, item.name);

    renderQrCode(cardUrl);

    if (btnOpenCard) {
      btnOpenCard.disabled = false;
      btnOpenCard.onclick = () => {
        window.open(cardUrl, "_blank", "noopener");
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

    if (btnShareGuide) {
      btnShareGuide.disabled = false;
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