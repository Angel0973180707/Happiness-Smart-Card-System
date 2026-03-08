/* ==========================================
 * HSC Poster v702.4
 * COMPLETE OVERWRITE
 *
 * v702.4 重點：
 * 1) 只優化智慧排版，不改 UI / HTML / GAS
 * 2) 字級更穩定，避免忽大忽小
 * 3) 強化兩行平衡
 * 4) 加強避免最後一行孤字 / 兩字落單
 * 5) 下載前再次執行智慧排版
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "702.4";

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
  let resizeBound = false;
  let resizeHandler = null;

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

    runSmartLayoutSequence();

    if (!resizeBound) {
      resizeHandler = debounce(runSmartLayoutSequence, 120);
      window.addEventListener("resize", resizeHandler);
      resizeBound = true;
    }
  }

  function runSmartLayoutSequence() {
    smartLayoutAll();

    requestAnimationFrame(() => {
      smartLayoutAll();
      setTimeout(smartLayoutAll, 50);
      setTimeout(smartLayoutAll, 120);
      setTimeout(smartLayoutAll, 220);
    });
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

    runSmartLayoutSequence();
    await wait(120);
    smartLayoutAll();
    await wait(80);
    smartLayoutAll();

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
    setupTextBlock(nameEl);
    setupTextBlock(unitEl);
    setupTextBlock(titleEl);

    applySmartLayout(nameEl, {
      maxFont: 36,
      minFont: 20,
      maxLines: 2,
      preferTwoLines: true,
      shrinkStep: 1,
      role: "name"
    });

    applySmartLayout(unitEl, {
      maxFont: 21,
      minFont: 14,
      maxLines: 2,
      preferTwoLines: true,
      shrinkStep: 1,
      role: "unit"
    });

    applySmartLayout(titleEl, {
      maxFont: 24,
      minFont: 15,
      maxLines: 2,
      preferTwoLines: true,
      shrinkStep: 1,
      role: "title"
    });
  }

  function setupTextBlock(el) {
    if (!el) return;
    el.style.wordBreak = "keep-all";
    el.style.overflowWrap = "break-word";
    el.style.whiteSpace = "normal";
    el.style.textWrap = "balance";
  }

  function applySmartLayout(el, options) {
    if (!el) return;

    const text = safeText(el.textContent, "");
    if (!text.trim()) return;

    const maxFont = options.maxFont;
    const minFont = options.minFont;
    const maxLines = options.maxLines || 2;
    const shrinkStep = options.shrinkStep || 1;

    let best = {
      fontSize: maxFont,
      score: Number.POSITIVE_INFINITY,
      lines: [text]
    };

    for (let size = maxFont; size >= minFont; size -= shrinkStep) {
      el.style.fontSize = `${size}px`;

      if (isOverflowing(el, maxLines)) {
        continue;
      }

      const lines = estimateWrappedLines(el, text);
      if (!lines.length || lines.length > maxLines) {
        continue;
      }

      const score = scoreLayout(lines, size, maxFont, minFont, options);

      if (
        score < best.score ||
        (score === best.score && size > best.fontSize)
      ) {
        best = {
          fontSize: size,
          score,
          lines
        };
      }
    }

    el.style.fontSize = `${best.fontSize}px`;

    let guard = 0;
    while (guard < 6) {
      guard += 1;

      const lines = estimateWrappedLines(el, text);
      const last = lines[lines.length - 1] || "";

      if (lines.length <= maxLines && !isVeryBadLastLine(last)) {
        break;
      }

      const current = parseFloat(window.getComputedStyle(el).fontSize);
      if (current <= minFont) break;

      el.style.fontSize = `${current - 1}px`;
    }

    finalOverflowGuard(el, minFont, maxLines);
  }

  function scoreLayout(lines, fontSize, maxFont, minFont, options) {
    const lengths = lines.map((s) => visualLength(s));
    const lineCount = lines.length;
    const maxLen = Math.max(...lengths);
    const minLen = Math.min(...lengths);
    const lastLen = lengths[lengths.length - 1] || 0;
    const firstLen = lengths[0] || 0;

    let score = 0;

    // 行數偏好：能單行就單行，但如果兩行更平衡也可接受
    if (lineCount === 1) {
      score += 0;
    } else if (lineCount === 2) {
      score += 6;
    } else {
      score += 200;
    }

    // 兩行長度越接近越好
    score += Math.abs(maxLen - minLen) * 5;

    // 最後一行太短重罰
    if (lastLen <= 1) score += 300;
    else if (lastLen <= 2) score += 120;
    else if (lastLen <= 3) score += 36;

    // 第一行太長、第二行太短也罰
    if (lineCount === 2 && firstLen >= lastLen * 2.4) {
      score += 80;
    }

    // 名稱/職稱盡量保留大字感
    const shrink = maxFont - fontSize;
    if (options.role === "name") {
      score += shrink * 1.8;
    } else if (options.role === "title") {
      score += shrink * 1.2;
    } else {
      score += shrink * 1.0;
    }

    // 太接近最小字級，略罰
    if (fontSize <= minFont + 1) score += 18;
    if (fontSize <= minFont) score += 26;

    return score;
  }

  function finalOverflowGuard(el, minFont, maxLines) {
    if (!el) return;
    let size = parseFloat(window.getComputedStyle(el).fontSize);

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
    probe.style.width = `${Math.max(el.clientWidth, 1)}px`;
    probe.style.textWrap = "balance";

    document.body.appendChild(probe);

    const chars = Array.from(text);
    const lines = [];
    let current = "";

    for (const ch of chars) {
      probe.textContent = current + ch;
      const nextHeight = probe.offsetHeight;

      probe.textContent = current || " ";
      const currentHeight = probe.offsetHeight;

      const willWrap = current && nextHeight > currentHeight;

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

  function visualLength(text) {
    const chars = Array.from(text || "");
    let total = 0;

    for (const ch of chars) {
      if (/\s/.test(ch)) {
        total += 0.35;
      } else if (/[A-Za-z0-9]/.test(ch)) {
        total += 0.62;
      } else {
        total += 1;
      }
    }

    return total;
  }

  function isVeryBadLastLine(text) {
    const len = visualLength(text || "");
    return len <= 1.2;
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