/* ==========================================
 * HSC Poster v704.1
 * COMPLETE OVERWRITE
 *
 * v704.1 重點：
 * 1) 下載海報只截 #posterCapture，不把按鈕拍進去
 * 2) 保留既有交付卡功能：
 *    - 顯示頭像
 *    - 顯示姓名 / 單位 / 職稱
 *    - 生成 QRCode
 *    - 下載名片海報
 *    - 打開智慧名片
 *    - 複製名片連結
 *    - 推薦智慧名片
 *    - 聯繫 LINE 官方帳號
 * 3) 盡量相容既有 GAS payload 格式
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "704.1";

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

  const btnDownload = $("btnDownload");
  const btnOpenCard = $("btnOpenCard");
  const btnCopyCard = $("btnCopyCard");
  const btnRecommend = $("btnRecommend");
  const btnConsult = $("btnConsult");

  let currentItem = null;
  let cardUrl = "";

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
      (item && (item.line_oa || item.lineOA || item.lineOa || item.line_url)) ||
      DEFAULT_LINE_OA;

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

  function setStatus(message, type = "") {
    if (!statusEl) return;
    statusEl.dataset.type = type || "";
    statusEl.textContent = message || "";
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

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[m]));
  }

  function safeInitial(name) {
    const t = text(name, "名片");
    return t.slice(0, 2);
  }

  function setAvatar(src, name) {
    if (!avatarEl || !avatarFallbackEl) return;

    if (src) {
      avatarEl.onload = () => {
        avatarEl.style.display = "block";
        avatarFallbackEl.style.display = "none";
      };
      avatarEl.onerror = () => {
        avatarEl.style.display = "none";
        avatarFallbackEl.style.display = "grid";
        avatarFallbackEl.textContent = safeInitial(name);
      };
      avatarEl.src = src;
    } else {
      avatarEl.style.display = "none";
      avatarFallbackEl.style.display = "grid";
      avatarFallbackEl.textContent = safeInitial(name);
    }
  }

  function pickImage(item) {
    const candidates = [
      item.avatar_url,
      item.avatar_img_fast,
      item.avatar_img,
      item.avatar
    ].map(v => text(v)).filter(Boolean);

    return candidates[0] || "";
  }

  function normalizeItem(raw) {
    const item = raw || {};
    return {
      id: text(item.id),
      name: text(item.name, "智慧名片"),
      unit: text(item.unit),
      title: text(item.title),
      avatar_url: text(item.avatar_url || item.avatar_img_fast || item.avatar_img || item.avatar),
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

  function renderCard(item) {
    currentItem = item;
    cardUrl = buildCardUrl(item.id || CARD_ID);

    if (nameEl) nameEl.textContent = item.name || "智慧名片";
    if (unitEl) unitEl.textContent = item.unit || "　";
    if (titleEl) titleEl.textContent = item.title || "　";

    setAvatar(pickImage(item), item.name);

    if (qrTipEl) {
      qrTipEl.innerHTML = "掃描 QRCode 打開智慧名片";
    }

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
          setStatus("複製失敗，請稍後再試", "error");
        }
      };
    }

    if (btnRecommend) {
      btnRecommend.disabled = false;
      btnRecommend.onclick = async () => {
        const url = buildRecommendUrl();
        try {
          await copyText(url);
          setStatus("已複製推薦連結", "success");
        } catch (err) {
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

    setStatus("交付卡已載入完成", "success");
  }

  function renderQrCode(url) {
    if (!qrCodeEl) return;
    qrCodeEl.innerHTML = "";

    try {
      new QRCode(qrCodeEl, {
        text: url,
        width: 200,
        height: 200,
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

  async function downloadPoster(item) {
    const target = posterCaptureEl || $("poster");
    if (!target) throw new Error("找不到海報區塊");

    const canvas = await html2canvas(target, {
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

  async function init() {
    if (!CARD_ID) {
      setStatus("缺少名片 ID", "error");
      if (btnDownload) btnDownload.disabled = true;
      if (btnOpenCard) btnOpenCard.disabled = true;
      if (btnCopyCard) btnCopyCard.disabled = true;
      if (btnRecommend) btnRecommend.disabled = true;
      if (btnConsult) btnConsult.disabled = true;
      return;
    }

    setLoading("正在載入交付卡資料...");

    try {
      const item = await fetchCard(CARD_ID);
      renderCard(item);
    } catch (err) {
      console.error(err);
      setStatus(err.message || "交付卡載入失敗", "error");
    }
  }

  init();
})();