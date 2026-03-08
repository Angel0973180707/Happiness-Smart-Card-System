/* ==========================================
 * HSC Poster v702.1
 * COMPLETE OVERWRITE
 *
 * v702.1 重點：
 * 1) 維持 v702 簡潔交付卡 UI
 * 2) 新增智慧排版：
 *    - 自動縮字
 *    - 平衡換行
 *    - 避免中文孤字落單
 * 3) 保留海報下載 / 打開名片 / 複製名片連結 / 推薦連結 / LINE 官方帳號
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "702.1";

  const GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const BASE = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
  const CARD_PAGE = `${BASE}index.html`;
  const CONSULT_URL = "https://lin.ee/3r2ZePN";

  const qs = new URLSearchParams(location.search);
  const id = (qs.get("id") || "").trim();

  const avatarEl = document.getElementById("avatar");
  const avatarFallbackEl = document.getElementById("avatarFallback");

  const nameEl = document.getElementById("name");
  const unitEl = document.getElementById("unit");
  const titleEl = document.getElementById("title");
  const qrTipEl = document.getElementById("qrTip");
  const statusEl = document.getElementById("status");

  const posterEl = document.getElementById("poster");
  const qrWrapEl = document.getElementById("qrcode");

  const btnDownload = document.getElementById("btnDownload");
  const btnOpenCard = document.getElementById("btnOpenCard");
  const btnCopyCard = document.getElementById("btnCopyCard");
  const btnRecommend = document.getElementById("btnRecommend");
  const btnConsult = document.getElementById("btnConsult");

  let itemData = null;
  let cardURL = "";
  let recommendURL = "";

  init();

  async function init() {
    try {
      setButtonsDisabled(true);

      if (!id) {
        throw new Error("缺少名片 id，請從正確交付卡連結進入。");
      }

      setStatus("loading", "正在載入交付卡資料...");

      const data = await fetchCard(id);
      const item = data && data.item ? data.item : null;

      if (!item || !item.id) {
        throw new Error("查無名片資料。");
      }

      itemData = item;
      cardURL = buildCardURL(item.id);
      recommendURL = buildRecommendURL(item.id);

      renderCard(item);
      bindActions();
      await renderQRCode(cardURL);

      setButtonsDisabled(false);
      setStatus("success", "交付卡已載入完成。");
    } catch (err) {
      console.error("[HSC Poster init error]", err);
      setButtonsDisabled(true);
      setStatus("error", err && err.message ? err.message : "交付卡載入失敗。");
    }
  }

  async function fetchCard(cardId) {
    const url = `${GAS}?action=card&id=${encodeURIComponent(cardId)}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });

    if (!res.ok) {
      throw new Error(`讀取名片失敗（HTTP ${res.status}）`);
    }

    const data = await res.json();

    if (!data || data.ok === false) {
      throw new Error((data && (data.error || data.message)) || "名片資料回傳失敗。");
    }

    return data;
  }

  function buildCardURL(cardId) {
    return `${CARD_PAGE}?id=${encodeURIComponent(cardId)}&view=1`;
  }

  function buildRecommendURL(cardId) {
    return `${BASE}?ref=${encodeURIComponent(cardId)}`;
  }

  function renderCard(item) {
    const name = safeText(item.name, "未命名");
    const unit = safeText(item.unit, "");
    const title = safeText(item.title, "");

    nameEl.textContent = name;
    unitEl.textContent = unit || " ";
    titleEl.textContent = title || " ";

    renderAvatar(item, name);

    requestAnimationFrame(() => {
      smartLayoutAll();
      setTimeout(smartLayoutAll, 80);
      setTimeout(smartLayoutAll, 180);
    });

    window.addEventListener("resize", debounce(smartLayoutAll, 120));
  }

  async function renderAvatar(item, nameText) {
    const fallbackText = getFallbackText(nameText);

    avatarFallbackEl.textContent = fallbackText;
    avatarFallbackEl.style.display = "grid";
    avatarEl.style.display = "none";
    avatarEl.removeAttribute("src");

    let candidates = [];

    try {
      if (typeof getAvatarCandidates === "function") {
        candidates = getAvatarCandidates(item);
      }
    } catch (err) {
      console.warn("[getAvatarCandidates error]", err);
    }

    if (!candidates || !candidates.length) {
      const single =
        (typeof getAvatar === "function" ? getAvatar(item) : "") ||
        item.avatar_img_fast ||
        item.avatar_img ||
        item.avatar_url ||
        item.avatar ||
        "";
      if (single) candidates = [single];
    }

    const loaded = await loadFirstAvailableImage(candidates);

    if (!loaded) return;

    avatarEl.crossOrigin = "anonymous";
    avatarEl.referrerPolicy = "no-referrer";
    avatarEl.src = loaded;
    avatarEl.style.display = "block";
    avatarFallbackEl.style.display = "none";
  }

  async function loadFirstAvailableImage(candidates) {
    const uniq = Array.from(new Set((candidates || []).filter(Boolean)));
    for (const src of uniq) {
      const ok = await testImage(src);
      if (ok) return src;
    }
    return "";
  }

  function testImage(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async function renderQRCode(text) {
    qrTipEl.textContent = "QR 產生中...";
    qrWrapEl.innerHTML = "";

    await wait(60);

    new QRCode(qrWrapEl, {
      text,
      width: 190,
      height: 190,
      correctLevel: QRCode.CorrectLevel.H
    });

    qrTipEl.textContent = "掃描 QRCode 打開智慧名片";
  }

  function bindActions() {
    btnDownload.onclick = async () => {
      try {
        btnDownload.disabled = true;
        setStatus("loading", "正在產生海報，請稍候...");
        await downloadPoster();
        setStatus("success", "海報已下載完成。");
      } catch (err) {
        console.error("[downloadPoster error]", err);
        setStatus("error", err && err.message ? err.message : "海報下載失敗。");
      } finally {
        btnDownload.disabled = false;
      }
    };

    btnOpenCard.onclick = () => {
      if (!cardURL) return;
      window.open(cardURL, "_blank", "noopener");
    };

    btnCopyCard.onclick = async () => {
      if (!cardURL) return;
      const ok = await copyText(cardURL);
      setStatus(ok ? "success" : "error", ok ? "智慧名片連結已複製。" : "複製失敗，請手動複製網址。");
    };

    btnRecommend.onclick = async () => {
      if (!recommendURL) return;
      const ok = await copyText(recommendURL);
      setStatus(
        ok ? "success" : "error",
        ok ? "推薦智慧名片連結已複製。" : "複製失敗，請手動複製網址。"
      );
    };

    btnConsult.onclick = () => {
      window.open(CONSULT_URL, "_blank", "noopener");
    };
  }

  async function downloadPoster() {
    if (!posterEl) {
      throw new Error("找不到海報區塊。");
    }

    await waitForImages(posterEl);
    await wait(120);
    smartLayoutAll();
    await wait(80);

    const canvas = await html2canvas(posterEl, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: Math.max(2, Math.min(window.devicePixelRatio || 1, 3))
    });

    const a = document.createElement("a");
    const fileNameBase = itemData && itemData.name ? itemData.name : "card";
    const safeName = String(fileNameBase).replace(/[\\/:*?"<>|]/g, "_");
    a.href = canvas.toDataURL("image/png");
    a.download = `hsc-poster-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function smartLayoutAll() {
    fitTextBlock(nameEl, 44, 24, 2);
    fitTextBlock(unitEl, 24, 16, 2);
    fitTextBlock(titleEl, 28, 18, 2);

    avoidLonelyLastLine(titleEl);
    avoidLonelyLastLine(unitEl);
    avoidSingleCharLastLine(titleEl);
    avoidSingleCharLastLine(unitEl);
    avoidSingleCharLastLine(nameEl);
  }

  function fitTextBlock(el, maxFont, minFont, maxLines) {
    if (!el) return;

    let size = maxFont;
    el.style.fontSize = `${size}px`;
    el.style.wordBreak = "keep-all";
    el.style.overflowWrap = "break-word";
    el.style.whiteSpace = "normal";

    while (size > minFont && isOverflowing(el, maxLines)) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }

  function isOverflowing(el, maxLines) {
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight);
    const maxHeight = lineHeight * maxLines + 1;
    return el.scrollHeight > maxHeight || el.scrollWidth > el.clientWidth + 1;
  }

  function avoidLonelyLastLine(el) {
    if (!el) return;
    const text = safeText(el.textContent, "");
    if (!text) return;

    const lines = estimateWrappedLines(el, text);
    if (lines.length < 2) return;

    const last = lines[lines.length - 1];
    if (last.length <= 2) {
      let current = parseFloat(window.getComputedStyle(el).fontSize);
      let min = Math.max(14, current - 8);

      while (current > min) {
        current -= 1;
        el.style.fontSize = `${current}px`;
        const retry = estimateWrappedLines(el, text);
        const lastRetry = retry[retry.length - 1] || "";
        if (lastRetry.length > 2) break;
      }
    }
  }

  function avoidSingleCharLastLine(el) {
    if (!el) return;
    const text = safeText(el.textContent, "");
    if (!text) return;

    const lines = estimateWrappedLines(el, text);
    if (!lines.length) return;

    const last = lines[lines.length - 1];
    if (last.length === 1) {
      let current = parseFloat(window.getComputedStyle(el).fontSize);
      let min = Math.max(14, current - 10);

      while (current > min) {
        current -= 1;
        el.style.fontSize = `${current}px`;
        const retry = estimateWrappedLines(el, text);
        const lastRetry = retry[retry.length - 1] || "";
        if (lastRetry.length !== 1) break;
      }
    }
  }

  function estimateWrappedLines(el, text) {
    const probe = document.createElement("span");
    const style = window.getComputedStyle(el);

    probe.style.position = "fixed";
    probe.style.left = "-99999px";
    probe.style.top = "-99999px";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.whiteSpace = "normal";
    probe.style.wordBreak = style.wordBreak;
    probe.style.overflowWrap = style.overflowWrap;
    probe.style.lineHeight = style.lineHeight;
    probe.style.fontSize = style.fontSize;
    probe.style.fontWeight = style.fontWeight;
    probe.style.fontFamily = style.fontFamily;
    probe.style.letterSpacing = style.letterSpacing;
    probe.style.width = `${el.clientWidth}px`;

    document.body.appendChild(probe);

    const chars = Array.from(text);
    const lines = [];
    let current = "";

    for (const ch of chars) {
      probe.textContent = current + ch;
      const beforeHeight = probe.offsetHeight;

      probe.textContent = current;
      const currentHeight = probe.offsetHeight;

      const willWrap = current && beforeHeight > currentHeight;

      if (willWrap) {
        lines.push(current);
        current = ch;
      } else {
        current += ch;
      }
    }

    if (current) lines.push(current);

    probe.remove();
    return lines;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (err) {
      console.warn("[copyText error]", err);
      return false;
    }
  }

  function setButtonsDisabled(disabled) {
    [
      btnDownload,
      btnOpenCard,
      btnCopyCard,
      btnRecommend,
      btnConsult
    ].forEach((btn) => {
      if (btn) btn.disabled = !!disabled;
    });
  }

  function setStatus(type, text) {
    if (!statusEl) return;

    if (type === "error") {
      statusEl.setAttribute("data-type", "error");
      statusEl.textContent = text;
      return;
    }

    if (type === "success") {
      statusEl.setAttribute("data-type", "success");
      statusEl.textContent = text;
      return;
    }

    statusEl.removeAttribute("data-type");
    statusEl.innerHTML = `
      <span class="loading">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </span>
      ${escapeHtml(text)}
    `;
  }

  function safeText(value, fallback = "") {
    const s = value === null || value === undefined ? "" : String(value).trim();
    return s || fallback;
  }

  function getFallbackText(name) {
    const s = safeText(name, "名片");
    return s.slice(0, 2);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForImages(root) {
    const imgs = Array.from(root.querySelectorAll("img"));
    const waits = imgs.map((img) => {
      if (img.complete) return Promise.resolve();

      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    });

    return Promise.all(waits);
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  console.log(`[HSC Poster v${VERSION}] ready`);
})();