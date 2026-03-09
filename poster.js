/* ==========================================
 * HSC Poster v706
 * COMPLETE OVERWRITE
 *
 * v706 重點：
 * 1) 修正 html2canvas 無法載入跨域頭像問題
 *    → 下載前先將頭像轉為 base64 DataURL 注入
 * 2) 保留所有 v705 功能
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "706";

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

  /* ── 工具 ── */

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
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
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

  /* ── 頭像 ── */

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
    return [
      item.avatar_url,
      item.avatar_img_fast,
      item.avatar_img,
      item.avatar,
      item.avatarUrl
    ].map(v => text(v)).find(Boolean) || "";
  }

  /**
   * 將任意圖片 URL 轉為 base64 DataURL
   * 先嘗試 fetch → 若跨域 CORS 不允許，改用 Image + canvas taint fallback
   */
  async function toDataURL(src) {
    if (!src) return null;

    // 若已是 DataURL 直接回傳
    if (src.startsWith("data:")) return src;

    // 方法一：fetch（需伺服器允許 CORS）
    try {
      const res = await fetch(src, { mode: "cors", cache: "force-cache" });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      }
    } catch (_) { /* ignore, fallback below */ }

    // 方法二：Image + canvas（allowTaint 模式，海報 canvas 同樣允許）
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        } catch (_) {
          resolve(null); // taint，仍無法
        }
      };
      img.onerror = () => resolve(null);
      img.src = src + (src.includes("?") ? "&" : "?") + "_cb=" + Date.now();
    });
  }

  /* ── 資料 ── */

  function normalizeItem(raw) {
    const item = raw || {};
    return {
      id: text(item.id || CARD_ID),
      name: text(item.name, "智慧名片"),
      unit: text(item.unit),
      title: text(item.title),
      avatar_url: text(item.avatar_url || item.avatar_img_fast || item.avatar_img || item.avatar || item.avatarUrl),
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

    const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`讀取失敗（${res.status}）`);

    const json = await res.json();
    const payload = getCardPayload(json);
    if (!payload) throw new Error("找不到名片資料");

    return normalizeItem(payload);
  }

  /* ── QRCode ── */

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

  /* ── 複製 ── */

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
    Object.assign(ta.style, { position: "fixed", top: "-9999px", opacity: "0" });
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("copy failed");
  }

  /* ── 分享 ── */

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

  /* ── Dialog ── */

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

  function bindDialogEvents() {
    if (btnShareGuide) btnShareGuide.onclick = openDialog;
    if (btnCloseDialog) btnCloseDialog.onclick = closeDialog;

    if (shareDialogEl) {
      shareDialogEl.addEventListener("click", (e) => {
        if (e.target?.dataset?.closeDialog === "1") closeDialog();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && shareDialogEl?.classList.contains("is-open")) closeDialog();
    });
  }

  /* ── ★ 核心修正：下載海報時先把頭像換成 base64 ── */

  async function downloadPoster(item) {
    const target = posterCaptureEl || $("poster");
    if (!target) throw new Error("找不到海報區塊");

    // 1. 取得頭像原始 src
    const originalSrc = avatarEl ? avatarEl.getAttribute("src") : null;
    let injected = false;

    if (originalSrc && avatarEl && avatarEl.style.display !== "none") {
      const dataUrl = await toDataURL(originalSrc);
      if (dataUrl) {
        avatarEl.src = dataUrl;   // 暫時換成 base64
        injected = true;
        // 等瀏覽器 repaint
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
    }

    // 2. 截圖
    let canvas;
    try {
      canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: Math.min(window.devicePixelRatio || 2, 3),
        useCORS: true,
        allowTaint: true,           // 允許 taint，搭配 base64 使用
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight
      });
    } finally {
      // 3. 還原原始 src（不管有沒有出錯）
      if (injected && originalSrc && avatarEl) {
        avatarEl.src = originalSrc;
      }
    }

    // 4. 觸發下載
    const link = document.createElement("a");
    const safeId = text(item.id || CARD_ID || "card").replace(/[^\w-]+/g, "_");
    link.download = `${safeId}_poster.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  /* ── 渲染卡片 ── */

  function renderCard(item) {
    currentItem = item;
    cardUrl = buildCardUrl(item.id || CARD_ID);

    if (nameEl) nameEl.textContent = item.name || "智慧名片";
    if (unitEl) unitEl.textContent = item.unit || "　";
    if (titleEl) titleEl.textContent = item.title || "　";
    if (qrTipEl) qrTipEl.textContent = "掃描 QRCode 打開智慧名片";

    setAvatar(pickImage(item), item.name);
    renderQrCode(cardUrl);

    if (btnShare) {
      btnShare.disabled = false;
      btnShare.onclick = async () => {
        try { await shareCard(); }
        catch (err) { console.error(err); setStatus("分享失敗，請稍後再試", "error"); }
      };
    }

    if (btnCopyCard) {
      btnCopyCard.disabled = false;
      btnCopyCard.onclick = async () => {
        try { await copyText(cardUrl); setStatus("已複製智慧名片連結", "success"); }
        catch (err) { console.error(err); setStatus("複製失敗，請稍後再試", "error"); }
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
      btnOpenCard.onclick = () => window.open(cardUrl, "_blank", "noopener");
    }

    if (btnRecommend) {
      btnRecommend.disabled = false;
      btnRecommend.onclick = async () => {
        try { await copyText(buildRecommendUrl()); setStatus("已複製推薦連結", "success"); }
        catch (err) { console.error(err); setStatus("複製推薦連結失敗", "error"); }
      };
    }

    if (btnConsult) {
      btnConsult.disabled = false;
      btnConsult.onclick = () => window.open(buildConsultUrl(item), "_blank", "noopener");
    }

    setStatus("交付卡已載入完成 ✓", "success");
  }

  function disableAllButtons() {
    [btnShare, btnCopyCard, btnDownload, btnOpenCard, btnShareGuide, btnRecommend, btnConsult]
      .filter(Boolean)
      .forEach(btn => { btn.disabled = true; });
  }

  /* ── 入口 ── */

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
      renderCard(item);
    } catch (err) {
      console.error(err);
      disableAllButtons();
      setStatus(err.message || "交付卡載入失敗", "error");
    }
  }

  init();
})();