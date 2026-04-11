/* ==========================================
 * HSC Delivery Card v1.2-final
 *
 * 重構重點：
 * 1. 首頁結構依規格重組（名片交付區 / 服務荷包 / 狀態區）
 * 2. 分享功能拆成兩個入口：
 *    - 名片分享（不帶 ref，交流用，名片交付區）
 *    - 專屬入口（帶 ref，經營用，服務荷包內）
 * 3. 服務荷包由 GAS 回傳 wallet_mode 控制分流
 *    trial / referral / partner
 * 4. 全面移除工程語言，改為生活引導語
 * 5. 手機操作優先
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "v1.2-final";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA = "https://lin.ee/3r2ZePN";

  const QR_CONFIG = {
    previewSize: 900,
    dark: "#2f241d",
    light: "#ffffff",
    correctLevel: "H",
    centerAvatarRatio: 0.16,
    centerAvatarBorder: 5,
    quietZoneRatio: 0.04
  };

  /* ── URL 參數 ── */
  const qs = new URLSearchParams(location.search);
  const id      = (qs.get("id")     || "").trim();
  const gas     = (qs.get("gas")    || DEFAULT_GAS).trim();
  const baseUrl = normalizeBase(qs.get("base") || DEFAULT_BASE);
  const lineOA  = (qs.get("lineoa") || DEFAULT_LINE_OA).trim();

  /* ── DOM refs ── */
  const el = {
    avatarImg:          q("avatarImg"),
    cardName:           q("cardName"),
    cardTitle:          q("cardTitle"),
    qrViewport:         q("qrViewport"),
    qrCenterAvatar:     q("qrCenterAvatar"),
    qrCenterAvatarImg:  q("qrCenterAvatarImg"),
    qrLinkFallback:     q("qrLinkFallback"),
    qrBox:              q("qrBox"),
    statusText:         q("statusText"),

    /* 名片交付區 */
    openCardBtn:        q("openCardBtn"),
    shareCardBtn:       q("shareCardBtn"),
    downloadBtn:        q("downloadBtn"),
    updateEntryBtn:     q("updateEntryBtn"),
    renewalBtn:         q("renewalBtn"),

    /* 服務荷包 */
    walletAccordion:    q("walletAccordion"),
    walletToggle:       q("walletToggle"),
    walletBody:         q("walletBody"),
    walletTitle:        q("walletTitle"),
    walletHint:         q("walletHint"),
    walletNavHint:      q("walletNavHint"),
    upgradeHintBar:     q("upgradeHintBar"),
    upgradeHintText:    q("upgradeHintText"),

    serviceLogBlock:    q("serviceLogBlock"),
    logServiceBtn:      q("logServiceBtn"),
    serviceLogsViewBlock: q("serviceLogsViewBlock"),
    viewServiceLogsBtn: q("viewServiceLogsBtn"),
    walletStatsBlock:   q("walletStatsBlock"),
    statReferralCount:  q("statReferralCount"),
    statRewardPoints:   q("statRewardPoints"),
    statConvertedCount: q("statConvertedCount"),
    partnerEarningsBlock: q("partnerEarningsBlock"),
    statCommissionMonthly: q("statCommissionMonthly"),
    statCommissionTotal: q("statCommissionTotal"),

    referralEntryBlock: q("referralEntryBlock"),
    referralLinkDisplay: q("referralLinkDisplay"),
    copyReferralLinkBtn: q("copyReferralLinkBtn"),
    shareReferralBtn:   q("shareReferralBtn"),

    openCollabBtn:      q("openCollabBtn"),

    /* 名片狀態 */
    statusCardId:       q("statusCardId"),
    statusBadge:        q("statusBadge"),
    statusStartDate:    q("statusStartDate"),
    statusExpireDate:   q("statusExpireDate"),

    /* 客服 */
    lineOABtn:          q("lineOABtn"),

    /* Dialogs */
    collabDialog:       q("collabDialog"),
    collabDialogCloseBtn: q("collabDialogCloseBtn"),
    shareCardDialog:    q("shareCardDialog"),
    shareCardLinkDisplay: q("shareCardLinkDisplay"),
    shareCardCopyBtn:   q("shareCardCopyBtn"),
    shareCardDialogCloseBtn: q("shareCardDialogCloseBtn"),
    serviceLogDialog:   q("serviceLogDialog"),
    serviceTypeChips:   q("serviceTypeChips"),
    serviceLogNote:     q("serviceLogNote"),
    serviceLogStatus:   q("serviceLogStatus"),
    serviceLogSubmitBtn: q("serviceLogSubmitBtn"),
    serviceLogCancelBtn: q("serviceLogCancelBtn")
  };

  /* ── 狀態 ── */
  let currentItem     = null;
  let currentAgent    = null;   // 代理資訊（含 wallet_mode）
  let currentCardUrl  = "";     // 純名片連結（不帶 ref）
  let currentRefUrl   = "";     // 專屬推薦連結（帶 ref）
  let currentUpdateUrl = "";
  let currentRenewalUrl = "";
  let selectedServiceType = "";

  /* ════════════════════════════════════
     初始化
  ════════════════════════════════════ */
  bindEvents();
  init();

  async function init() {
    try {
      if (!id) throw new Error("缺少名片 id");
      if (typeof window.QRCode === "undefined") throw new Error("缺少 qrcode.min.js");

      setStatus("正在載入…", false);

      const item = await fetchCard(id);
      currentItem = item;

      /* 建立 URL */
      currentCardUrl   = buildCardUrl(item);       // 不帶 ref
      currentRefUrl    = buildRefUrl(item);         // 帶 ref
      currentUpdateUrl = resolveUpdateUrl(item);
      currentRenewalUrl = resolveRenewalUrl(item);

      /* 渲染各區 */
      renderPoster(item);
      renderCardStatus(item);

      /* QR（指向純名片 URL） */
      await renderQrLocal(currentCardUrl);
      await renderQrCenterAvatar(getAvatarUrl(item));

      /* 服務荷包 */
      const agentData = extractAgentData(item);
      currentAgent = agentData;
      renderWallet(agentData);

      setStatus("");
    } catch (err) {
      console.error(`[HSC ${VERSION}] init:`, err);
      renderPoster(null);
      renderCardStatus(null);
      renderWallet(null);
      renderQrFallback("");
      setStatus(err.message || "載入失敗，請重新整理", true);
    }
  }

  /* ════════════════════════════════════
     事件綁定
  ════════════════════════════════════ */
  function bindEvents() {
    /* 名片交付區 */
    el.openCardBtn?.addEventListener("click", onOpenCard);
    el.shareCardBtn?.addEventListener("click", onShareCard);
    el.downloadBtn?.addEventListener("click", onDownloadPoster);
    el.updateEntryBtn?.addEventListener("click", onOpenUpdate);
    el.renewalBtn?.addEventListener("click", onOpenRenewal);

    /* QR 點擊 */
    el.qrBox?.addEventListener("click", () => {
      if (currentCardUrl) window.open(currentCardUrl, "_blank", "noopener");
    });

    /* 服務荷包 toggle */
    el.walletToggle?.addEventListener("click", toggleWallet);

    /* 服務荷包功能 */
    el.logServiceBtn?.addEventListener("click", () => openDialog(el.serviceLogDialog));
    el.viewServiceLogsBtn?.addEventListener("click", onViewServiceLogs);
    el.copyReferralLinkBtn?.addEventListener("click", onCopyReferralLink);
    el.shareReferralBtn?.addEventListener("click", onShareReferral);
    el.openCollabBtn?.addEventListener("click", () => openDialog(el.collabDialog));

    /* 客服 */
    el.lineOABtn?.addEventListener("click", () => openUrl(lineOA));

    /* Dialog：合作說明 */
    el.collabDialogCloseBtn?.addEventListener("click", () => closeDialog(el.collabDialog));
    el.collabDialog?.addEventListener("click", (e) => { if (e.target === el.collabDialog) closeDialog(el.collabDialog); });

    /* Dialog：分享名片 */
    el.shareCardCopyBtn?.addEventListener("click", onCopyCardLink);
    el.shareCardDialogCloseBtn?.addEventListener("click", () => closeDialog(el.shareCardDialog));
    el.shareCardDialog?.addEventListener("click", (e) => { if (e.target === el.shareCardDialog) closeDialog(el.shareCardDialog); });

    /* Dialog：服務快記 */
    el.serviceTypeChips?.addEventListener("click", onServiceChipClick);
    el.serviceLogSubmitBtn?.addEventListener("click", onServiceLogSubmit);
    el.serviceLogCancelBtn?.addEventListener("click", () => closeDialog(el.serviceLogDialog));
    el.serviceLogDialog?.addEventListener("click", (e) => { if (e.target === el.serviceLogDialog) closeDialog(el.serviceLogDialog); });

    /* Esc 關閉 */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDialog(el.collabDialog);
        closeDialog(el.shareCardDialog);
        closeDialog(el.serviceLogDialog);
      }
    });
  }

  /* ════════════════════════════════════
     API 呼叫
  ════════════════════════════════════ */
  async function fetchCard(cardId) {
    const url = `${gas}?action=getCard&id=${encodeURIComponent(cardId)}&_=${Date.now()}`;
    const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`讀取失敗（HTTP ${res.status}）`);
    let raw;
    try { raw = await res.json(); } catch { throw new Error("資料格式不正確"); }
    const item = raw?.card || raw?.item || raw?.data || raw;
    if (!item || typeof item !== "object") throw new Error("名片資料格式不正確");
    return item;
  }

  async function callGas(params) {
    const url = new URL(gas);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    url.searchParams.set("_", Date.now());
    const res = await fetch(url.toString(), { method: "GET", mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`操作失敗（HTTP ${res.status}）`);
    return res.json();
  }

  /* ════════════════════════════════════
     渲染：海報主視覺
  ════════════════════════════════════ */
  function renderPoster(item) {
    const name  = txt(item?.name)  || txt(item?.id) || "我的智慧名片";
    const title = txt(item?.title) || txt(item?.unit) || txt(item?.slogan) || "";
    if (el.cardName)  el.cardName.textContent  = name;
    if (el.cardTitle) el.cardTitle.textContent = title;

    const avatar = getAvatarUrl(item);
    if (el.avatarImg) {
      el.avatarImg.alt = `${name} 頭像`;
      el.avatarImg.onerror = () => {
        el.avatarImg.onerror = null;
        el.avatarImg.src = defaultAvatarSvg();
      };
      el.avatarImg.src = avatar || defaultAvatarSvg();
    }
  }

  /* ════════════════════════════════════
     渲染：名片狀態區
  ════════════════════════════════════ */
  function renderCardStatus(item) {
    if (el.statusCardId) {
      el.statusCardId.textContent = txt(item?.id) || "--";
    }

    /* 狀態文案 */
    const raw = txt(item?.status || item?.card_status).toLowerCase();
    let badgeClass = "active";
    let badgeText  = "正常使用中";
    if (raw === "preparing" || raw === "pending") {
      badgeClass = "preparing"; badgeText = "準備中";
    } else if (raw === "paused" || raw === "inactive" || raw === "suspended") {
      badgeClass = "paused"; badgeText = "暫時休息中";
    }
    if (el.statusBadge) {
      el.statusBadge.textContent = badgeText;
      el.statusBadge.className = `status-badge ${badgeClass}`;
    }

    if (el.statusStartDate) {
      el.statusStartDate.textContent = fmtDate(item?.start_date || item?.created_at) || "--";
    }
    if (el.statusExpireDate) {
      el.statusExpireDate.textContent = fmtDate(item?.expire_date || item?.expiry_date) || "--";
    }
  }

  /* ════════════════════════════════════
     渲染：服務荷包（依 wallet_mode 分流）
  ════════════════════════════════════ */
  function renderWallet(agent) {
    /* wallet_mode 由 GAS 決定；fallback 前端推算 */
    const mode = resolveWalletMode(agent);

    /* 標題與提示語 */
    if (el.walletTitle) el.walletTitle.textContent = walletTitle(mode);
    if (el.walletHint)  el.walletHint.textContent  = walletHint(mode, agent);

    /* 升級提示條 */
    const isTrial = mode === "trial";
    show(el.upgradeHintBar, isTrial);
    if (isTrial && el.upgradeHintText) {
      const pts = toNum(agent?.points_lifetime, 0);
      const remaining = Math.max(0, 5 - pts);
      el.upgradeHintText.textContent = remaining > 0
        ? `再累積 ${remaining} 點，就能開啟完整服務荷包。`
        : "完成 5 次分享成交，累積 5 點後，就能開啟完整服務荷包。";
    }

    /* 導引提示 */
    show(el.walletNavHint, !isTrial);

    /* 服務紀錄功能（完整版） */
    const canLog      = !isTrial;
    const canViewLogs = !isTrial;
    const canStats    = !isTrial;
    show(el.serviceLogBlock,      canLog);
    show(el.serviceLogsViewBlock, canViewLogs);
    show(el.walletStatsBlock,     canStats);

    /* 成果統計數字 */
    if (canStats) {
      setText(el.statReferralCount,  fmtInt(toNum(agent?.referral_count,   0)));
      setText(el.statRewardPoints,   fmtInt(toNum(agent?.points_lifetime,  0)));
      setText(el.statConvertedCount, fmtInt(toNum(agent?.converted_count,  0)));
    }

    /* 金牌收益（partner 專用） */
    const isPartner = mode === "partner";
    show(el.partnerEarningsBlock, isPartner);
    if (isPartner) {
      setText(el.statCommissionMonthly, fmtInt(toNum(agent?.commission_monthly, 0)));
      setText(el.statCommissionTotal,   fmtInt(toNum(agent?.commission_total,   0)));
    }

    /* 分享專屬入口（trial 也可顯示） */
    const canShare = true; // 所有模式都顯示
    show(el.referralEntryBlock, canShare);
    const refLink = currentRefUrl || txt(agent?.referral_link) || "";
    if (el.referralLinkDisplay) {
      el.referralLinkDisplay.textContent = refLink || "專屬入口尚未建立，請聯繫客服";
    }
    if (el.copyReferralLinkBtn) {
      el.copyReferralLinkBtn.disabled = !refLink;
      el.copyReferralLinkBtn.style.opacity = refLink ? "" : "0.5";
    }
    if (el.shareReferralBtn) {
      el.shareReferralBtn.disabled = !refLink;
      el.shareReferralBtn.style.opacity = refLink ? "" : "0.5";
    }
  }

  function resolveWalletMode(agent) {
    /* 優先用後端回傳的 wallet_mode */
    const backendMode = txt(agent?.wallet_mode).toLowerCase();
    if (backendMode === "partner")  return "partner";
    if (backendMode === "referral") return "referral";
    if (backendMode === "trial")    return "trial";

    /* fallback：前端推算 */
    if (!agent) return "trial";
    const agentType = txt(agent?.agent_type).toLowerCase();
    if (agentType === "partner")  return "partner";
    if (agentType === "referral") return "referral";
    const pts = toNum(agent?.points_lifetime, 0);
    if (pts >= 5) return "referral";
    return "trial";
  }

  function walletTitle(mode) {
    if (mode === "trial") return "服務荷包（體驗中）";
    return "服務荷包";
  }

  function walletHint(mode, agent) {
    if (mode === "trial") {
      return "當你開始分享與幫助他人，這裡會慢慢累積你的成果";
    }
    return "服務、推薦、成果，都在這裡慢慢累積";
  }

  /* ════════════════════════════════════
     服務荷包 accordion toggle
  ════════════════════════════════════ */
  function toggleWallet() {
    const isOpen = el.walletAccordion.classList.toggle("open");
    el.walletToggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  /* ════════════════════════════════════
     QR 產生
  ════════════════════════════════════ */
  async function renderQrLocal(targetUrl) {
    if (!el.qrViewport || !targetUrl) return;
    hideQrFallback();
    el.qrViewport.innerHTML = "";
    try {
      const canvas = await buildQrCanvas(targetUrl, QR_CONFIG.previewSize);
      canvas.style.cssText = "width:100%;height:100%;display:block;object-fit:contain;image-rendering:pixelated;";
      el.qrViewport.appendChild(canvas);
    } catch (err) {
      console.error(`[HSC ${VERSION}] QR:`, err);
      renderQrFallback(targetUrl);
    }
  }

  async function renderQrCenterAvatar(avatarUrl) {
    if (!el.qrCenterAvatar || !el.qrCenterAvatarImg || !avatarUrl) {
      hideQrCenterAvatar(); return;
    }
    const ok = await loadImg(el.qrCenterAvatarImg, avatarUrl, defaultAvatarSvg());
    if (!ok) { hideQrCenterAvatar(); return; }

    const pct = `${Math.round(QR_CONFIG.centerAvatarRatio * 100)}%`;
    Object.assign(el.qrCenterAvatar.style, {
      width: pct, height: pct, aspectRatio: "1/1",
      position: "absolute", left: "50%", top: "50%",
      transform: "translate(-50%,-50%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", borderRadius: "999px",
      background: "#fff", boxSizing: "border-box",
      border: `${QR_CONFIG.centerAvatarBorder}px solid #fff`, zIndex: "3"
    });
    Object.assign(el.qrCenterAvatarImg.style, {
      display: "block", width: "100%", height: "100%",
      objectFit: "cover", borderRadius: "999px"
    });
    el.qrCenterAvatar.classList.add("show");
  }

  function hideQrCenterAvatar() {
    el.qrCenterAvatar?.classList.remove("show");
    if (el.qrCenterAvatarImg) el.qrCenterAvatarImg.removeAttribute("src");
  }

  function renderQrFallback(url) {
    if (el.qrViewport) el.qrViewport.innerHTML = "";
    hideQrCenterAvatar();
    if (el.qrLinkFallback) {
      el.qrLinkFallback.classList.add("show");
      el.qrLinkFallback.textContent = url ? `名片連結：${url}` : "QR 暫時無法顯示";
    }
  }

  function hideQrFallback() {
    if (el.qrLinkFallback) { el.qrLinkFallback.classList.remove("show"); el.qrLinkFallback.textContent = ""; }
  }

  async function buildQrCanvas(targetUrl, size) {
    const quietPx  = Math.round(size * QR_CONFIG.quietZoneRatio);
    const innerSize = size - quietPx * 2;

    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position:"fixed", left:"-99999px", top:"-99999px",
      pointerEvents:"none", opacity:"0",
      width:`${innerSize}px`, height:`${innerSize}px`, overflow:"hidden"
    });
    document.body.appendChild(wrap);

    try {
      new window.QRCode(wrap, {
        text: targetUrl, width: innerSize, height: innerSize,
        colorDark: QR_CONFIG.dark, colorLight: QR_CONFIG.light,
        correctLevel: window.QRCode.CorrectLevel[QR_CONFIG.correctLevel] || window.QRCode.CorrectLevel.H
      });
      await wait(260);

      const inner = document.createElement("canvas");
      inner.width = innerSize; inner.height = innerSize;
      const ic = inner.getContext("2d");
      ic.fillStyle = "#fff";
      ic.fillRect(0, 0, innerSize, innerSize);

      const src = wrap.querySelector("canvas");
      if (src) { ic.drawImage(src, 0, 0, innerSize, innerSize); }
      else {
        const img = wrap.querySelector("img");
        if (img?.src) {
          const loaded = await makeImage(img.src);
          ic.drawImage(loaded, 0, 0, innerSize, innerSize);
        }
      }

      const final = document.createElement("canvas");
      final.width = size; final.height = size;
      const fc = final.getContext("2d");
      fc.fillStyle = "#fff";
      fc.fillRect(0, 0, size, size);
      fc.drawImage(inner, quietPx, quietPx, innerSize, innerSize);
      return final;
    } finally {
      wrap.remove();
    }
  }

  /* ════════════════════════════════════
     URL 建立
     名片 URL：不帶 ref（交流用）
     推薦 URL：帶 ref（經營用）
  ════════════════════════════════════ */
  function buildCardUrl(item) {
    /* 純名片連結，僅帶 id，不帶任何 ref */
    return buildUrl("index.html", { id: txt(item?.id) || id });
  }

  function buildRefUrl(item) {
    /* 推薦連結，優先用後端提供的 referral_link */
    const backendLink = txt(item?.referral_link) || txt(item?.agent?.referral_link) || "";
    if (backendLink) return backendLink;

    /* fallback：自行組建（帶 ref） */
    const agentId  = txt(item?.agent_id) || txt(item?.service_agent) || "";
    const cardId   = txt(item?.id) || id;
    if (!agentId) return "";
    return buildUrl("index.html", { id: cardId, ref: agentId });
  }

  function resolveUpdateUrl(item) {
    return txt(item?.update_link) || txt(item?.update_url) || txt(item?.update_form_url) || "";
  }

  function resolveRenewalUrl(item) {
    return txt(item?.renewal_link) || txt(item?.renewal_url) || "";
  }

  function buildUrl(path, params) {
    const url = new URL(path, baseUrl);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, String(v));
      }
    });
    return url.toString();
  }

  /* ════════════════════════════════════
     代理資料提取（相容多種後端結構）
  ════════════════════════════════════ */
  function extractAgentData(item) {
    /* 優先取巢狀 agent 物件 */
    const nested = item?.agent || item?.agent_info || item?.delivery_agent;
    if (nested && typeof nested === "object") return nested;
    /* fallback：item 本身就包含代理欄位 */
    if (item?.wallet_mode || item?.agent_type || item?.referral_code) return item;
    return null;
  }

  /* ════════════════════════════════════
     按鈕事件
  ════════════════════════════════════ */
  function onOpenCard() {
    if (!currentCardUrl) { setStatus("名片連結尚未建立", true); return; }
    window.open(currentCardUrl, "_blank", "noopener");
  }

  function onShareCard() {
    /* 使用 dialog 展示純名片連結（不帶 ref） */
    if (el.shareCardLinkDisplay) {
      el.shareCardLinkDisplay.textContent = currentCardUrl || "連結尚未建立";
    }

    /* 嘗試直接 Web Share */
    if (navigator.share && currentCardUrl) {
      const name = txt(currentItem?.name) || "我";
      navigator.share({
        title: `${name} 的智慧名片`,
        text: "這是我的智慧名片，歡迎認識我。",
        url: currentCardUrl
      }).catch((err) => {
        if (err?.name !== "AbortError") openDialog(el.shareCardDialog);
      });
      return;
    }
    openDialog(el.shareCardDialog);
  }

  /* ════════════════════════════════════
     下載名片海報
     優先路徑：
       1. item.poster_url / wechat_url（後端預產好的圖）→ 直接開新頁
       2. 無後端資源 → 前端 Canvas 即時產生，開圖片頁讓使用者長按保存
  ════════════════════════════════════ */
  async function onDownloadPoster() {
    if (el.downloadBtn) el.downloadBtn.classList.add("loading");
    disableBtn(el.downloadBtn, true);
    setStatus("正在準備海報…", false);

    try {
      /* 路徑 1：後端預產圖 */
      const prebuilt =
        txt(currentItem?.poster_url)  ||
        txt(currentItem?.wechat_url)  ||
        txt(currentItem?.poster_img)  ||
        txt(currentItem?.wechat_img)  ||
        "";

      if (prebuilt) {
        window.open(prebuilt, "_blank", "noopener");
        setStatus("海報已開啟，長按圖片即可保存", false);
        clearStatusSoon();
        return;
      }

      /* 路徑 2：前端 Canvas 產生 */
      await waitForFonts();
      const dataUrl = await buildPosterCanvas();
      openPosterPage(dataUrl, currentItem?.name || currentItem?.id || "smart-card");
      setStatus("");
    } catch (err) {
      console.error(`[HSC ${VERSION}] download:`, err);
      setStatus("海報產生失敗，請稍後再試", true);
      clearStatusSoon();
    } finally {
      if (el.downloadBtn) el.downloadBtn.classList.remove("loading");
      disableBtn(el.downloadBtn, false);
    }
  }

  /* 產生 1080×1920 海報 canvas，回傳 dataUrl */
  async function buildPosterCanvas() {
    if (!currentCardUrl) throw new Error("名片連結尚未建立");

    /* QR（海報用，880px） */
    const POSTER_QR = 880;
    const qrCanvas  = await buildQrCanvas(currentCardUrl, POSTER_QR);

    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法建立畫布");

    /* ── 背景 ── */
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#f8f4ee");
    bgGrad.addColorStop(1, "#f3ece3");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W/2, 160, 50, W/2, 160, 640);
    glow.addColorStop(0, "rgba(255,255,255,.92)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 560);

    /* ── 主卡片 ── */
    roundRectFill(ctx, 66, 74, W-132, H-148, 44,
      (() => {
        const g = ctx.createLinearGradient(0, 74, 0, H-74);
        g.addColorStop(0, "rgba(255,253,250,.98)");
        g.addColorStop(1, "rgba(255,248,241,.98)");
        return g;
      })()
    );
    ctx.strokeStyle = "rgba(102,78,57,.09)";
    ctx.lineWidth = 2;
    ctx.stroke();

    /* ── Header ── */
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "700 40px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#b6855e";
    ctx.fillText("☀", W/2, 152);

    ctx.font = "900 50px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#433227";
    ctx.fillText("天使幸福智慧名片", W/2, 222);

    ctx.font = "700 24px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#9c8b7f";
    ctx.fillText("Angel Smart Card", W/2, 270);

    /* ── Delivery pill ── */
    const pillW = 340, pillH = 64, pillX = (W-pillW)/2, pillY = 312;
    roundRectFill(ctx, pillX, pillY, pillW, pillH, 999,
      (() => {
        const g = ctx.createLinearGradient(0, pillY, 0, pillY+pillH);
        g.addColorStop(0, "#fffefb"); g.addColorStop(1, "#fbf3e9"); return g;
      })()
    );
    ctx.strokeStyle = "rgba(191,135,87,.13)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "900 26px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#9a6a44";
    ctx.fillText("一張名片，讓你被看見", W/2, pillY + pillH/2 + 1);

    /* ── 頭像 ── */
    const avatarY = 430;
    const avatarR = 86;
    const avatarUrl = getAvatarUrl(currentItem);
    if (avatarUrl) {
      try {
        const avatarImg = await makeImageWithFallback(avatarUrl, defaultAvatarSvg());
        ctx.save();
        ctx.beginPath();
        ctx.arc(W/2, avatarY, avatarR, 0, Math.PI*2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, W/2-avatarR, avatarY-avatarR, avatarR*2, avatarR*2);
        ctx.restore();
      } catch (_) { /* 忽略頭像失敗 */ }
    }

    /* ── 姓名 ── */
    const name  = txt(currentItem?.name)  || txt(currentItem?.id)    || "我的智慧名片";
    const title = txt(currentItem?.title) || txt(currentItem?.unit)  || txt(currentItem?.slogan) || "";

    const nameY = avatarY + avatarR + 54;
    ctx.font = "900 56px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#433227";
    ctx.textAlign = "center";
    ctx.fillText(name, W/2, nameY);

    if (title) {
      ctx.font = "500 30px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
      ctx.fillStyle = "#6b5a4d";
      const lines = wrapText(ctx, title, W-280, 30);
      let ty = nameY + 60;
      lines.slice(0, 2).forEach((line) => { ctx.fillText(line, W/2, ty); ty += 46; });
    }

    /* ── QR 區塊 ── */
    const qrFrameX = 155, qrFrameY = 730, qrFrameW = 770, qrFrameH = 770;
    roundRectFill(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, 38, "#ffffff");
    ctx.strokeStyle = "rgba(0,0,0,.035)"; ctx.lineWidth = 2; ctx.stroke();

    const qrPad = 44;
    ctx.drawImage(qrCanvas,
      qrFrameX + qrPad, qrFrameY + qrPad,
      qrFrameW - qrPad*2, qrFrameH - qrPad*2
    );

    /* QR 說明 */
    ctx.font = "800 28px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#6b5a4d";
    ctx.fillText("掃一下，帶你認識我", W/2, 1590);

    /* ── 頁尾提示 ── */
    ctx.font = "500 22px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#8d7d70";
    ctx.fillText("存到手機，分享更方便 ✦ 長按圖片即可保存", W/2, 1680);

    return canvas.toDataURL("image/png", 0.96);
  }

  /* 開啟海報圖片頁，讓使用者長按保存 */
  function openPosterPage(dataUrl, nameHint) {
    const safeName = String(nameHint || "poster")
      .replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-").slice(0, 60);
    const filename = `${safeName}-poster.png`;

    document.open();
    document.write(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${escHtml(filename)}</title>
  <style>
    html,body{margin:0;padding:0;background:#111;min-height:100%;
      font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;}
    .wrap{min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:24px 16px 28px;gap:18px;}
    .tip{text-align:center;color:rgba(255,255,255,.85);font-size:15px;line-height:1.8;}
    .tip strong{color:#e8c18a;}
    img{max-width:min(100%,480px);height:auto;display:block;
      border-radius:18px;box-shadow:0 16px 40px rgba(0,0,0,.45);background:#fff;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="tip">海報已準備好<br><strong>長按圖片</strong>即可保存到相簿<br>存好後可以傳 LINE、微信或群組</div>
    <img src="${dataUrl}" alt="名片海報">
  </div>
</body>
</html>`);
    document.close();
  }

  /* Canvas 工具：圓角矩形填色 */
  function roundRectFill(ctx, x, y, w, h, r, fillStyle) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  /* 文字自動換行 */
  function wrapText(ctx, text, maxWidth, fontSize) {
    const chars = Array.from(String(text || ""));
    const lines = [];
    let line = "";
    ctx.font = `500 ${fontSize}px 'Noto Sans TC','Microsoft JhengHei',sans-serif`;
    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line); line = ch;
      } else { line = test; }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* 等待字型載入 */
  function waitForFonts() {
    return document.fonts?.ready?.catch?.(() => {}) || Promise.resolve();
  }

  async function makeImageWithFallback(src, fallback) {
    try { return await makeImage(src); }
    catch (_) { return await makeImage(fallback); }
  }

  function escHtml(s) {
    return String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  async function onCopyCardLink() {
    if (!currentCardUrl) { setStatus("名片連結尚未建立", true); return; }
    const ok = await copyText(currentCardUrl);
    setStatus(ok ? "名片連結已複製" : "複製失敗", !ok);
    if (ok) closeDialog(el.shareCardDialog);
    clearStatusSoon();
  }

  function onOpenUpdate() {
    if (!currentUpdateUrl) {
      openUrl(lineOA, "請聯繫客服進行資料更新");
      return;
    }
    window.open(currentUpdateUrl, "_blank", "noopener");
  }

  function onOpenRenewal() {
    if (!currentRenewalUrl) {
      openUrl(lineOA, "請聯繫客服辦理續用");
      return;
    }
    window.open(currentRenewalUrl, "_blank", "noopener");
  }

  async function onCopyReferralLink() {
    const link = currentRefUrl || txt(currentAgent?.referral_link) || "";
    if (!link) { setStatus("專屬入口尚未建立", true); clearStatusSoon(); return; }
    const ok = await copyText(link);
    setStatus(ok ? "專屬入口已複製" : "複製失敗", !ok);
    clearStatusSoon();
  }

  async function onShareReferral() {
    const link = currentRefUrl || txt(currentAgent?.referral_link) || "";
    if (!link) { setStatus("專屬入口尚未建立", true); clearStatusSoon(); return; }

    const name = txt(currentItem?.name) || "我";
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} 的推薦入口`, url: link });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    const ok = await copyText(link);
    setStatus(ok ? "已複製專屬入口" : "複製失敗", !ok);
    clearStatusSoon();
  }

  function onViewServiceLogs() {
    /* 呼叫 GAS getServiceLogs，暫以客服入口代替 */
    const logsUrl = buildGasUrl({ action: "getServiceLogs", id });
    window.open(logsUrl, "_blank", "noopener");
  }

  /* ── 服務快記 ── */
  function onServiceChipClick(e) {
    const btn = e.target.closest(".service-chip");
    if (!btn) return;
    selectedServiceType = btn.dataset.type || "";
    el.serviceTypeChips?.querySelectorAll(".service-chip").forEach((b) => {
      b.style.background = b === btn
        ? "linear-gradient(180deg,#c38a5c,#b67b4f)"
        : "";
      b.style.color = b === btn ? "#fffaf6" : "";
    });
  }

  async function onServiceLogSubmit() {
    if (!selectedServiceType) {
      if (el.serviceLogStatus) el.serviceLogStatus.textContent = "請先選擇服務類型";
      return;
    }
    if (el.serviceLogSubmitBtn) disableBtn(el.serviceLogSubmitBtn, true);
    if (el.serviceLogStatus) el.serviceLogStatus.textContent = "記錄中…";

    try {
      await callGas({
        action: "createServiceLog",
        id,
        service_type: selectedServiceType,
        note: el.serviceLogNote?.value?.trim() || ""
      });
      if (el.serviceLogStatus) el.serviceLogStatus.textContent = "✓ 已幫你記下來";
      setTimeout(() => {
        closeDialog(el.serviceLogDialog);
        resetServiceLog();
      }, 1200);
    } catch (err) {
      if (el.serviceLogStatus) el.serviceLogStatus.textContent = `記錄失敗：${err.message}`;
      if (el.serviceLogSubmitBtn) disableBtn(el.serviceLogSubmitBtn, false);
    }
  }

  function resetServiceLog() {
    selectedServiceType = "";
    if (el.serviceLogNote) el.serviceLogNote.value = "";
    if (el.serviceLogStatus) el.serviceLogStatus.textContent = "";
    el.serviceTypeChips?.querySelectorAll(".service-chip").forEach((b) => {
      b.style.background = ""; b.style.color = "";
    });
    if (el.serviceLogSubmitBtn) disableBtn(el.serviceLogSubmitBtn, false);
  }

  /* ════════════════════════════════════
     Dialog 控制
  ════════════════════════════════════ */
  function openDialog(dialogEl) {
    if (!dialogEl) return;
    dialogEl.classList.add("show");
    dialogEl.setAttribute("aria-hidden", "false");
  }

  function closeDialog(dialogEl) {
    if (!dialogEl) return;
    dialogEl.classList.remove("show");
    dialogEl.setAttribute("aria-hidden", "true");
  }

  /* ════════════════════════════════════
     工具函式
  ════════════════════════════════════ */
  function q(id_) { return document.getElementById(id_); }
  function txt(v) { return String(v || "").trim(); }

  function show(el_, visible) {
    if (!el_) return;
    el_.classList.toggle("hidden", !visible);
  }

  function setText(el_, value) {
    if (el_) el_.textContent = value;
  }

  function toNum(v, fallback = 0) {
    const n = Number(String(v || "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }

  function fmtInt(n) { return Number(n).toLocaleString("zh-TW"); }

  function fmtDate(v) {
    const s = txt(v);
    if (!s || s === "0" || s === "undefined") return "";
    /* 若已是 YYYY-MM-DD 格式直接回傳 */
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    try {
      const d = new Date(s);
      if (isNaN(d)) return s;
      return d.toLocaleDateString("zh-TW", { year:"numeric", month:"2-digit", day:"2-digit" });
    } catch { return s; }
  }

  function getAvatarUrl(item) {
    return txt(item?.avatar_url) || txt(item?.avatar_img_fast) || txt(item?.avatar_img);
  }

  function normalizeBase(v) {
    const s = txt(v);
    return s ? (s.endsWith("/") ? s : `${s}/`) : "";
  }

  function buildGasUrl(params) {
    const url = new URL(gas);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    return url.toString();
  }

  function openUrl(url, fallbackMsg = "") {
    if (url) { window.open(url, "_blank", "noopener"); return; }
    if (fallbackMsg) setStatus(fallbackMsg, true);
  }

  function setStatus(msg, isError = false) {
    if (!el.statusText) return;
    el.statusText.textContent = msg || "";
    el.statusText.classList.toggle("error", !!isError);
  }

  function clearStatusSoon() {
    clearTimeout(clearStatusSoon._t);
    clearStatusSoon._t = setTimeout(() => setStatus(""), 2000);
  }

  function disableBtn(btn, disabled) {
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.style.opacity = disabled ? "0.7" : "";
    btn.style.cursor  = disabled ? "wait" : "";
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value); return true;
      }
      return legacyCopy(value);
    } catch { return legacyCopy(value); }
  }

  function legacyCopy(value) {
    try {
      const ta = Object.assign(document.createElement("textarea"), {
        value, readOnly: true
      });
      Object.assign(ta.style, { position:"fixed", top:"-9999px", opacity:"0" });
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch { return false; }
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function loadImg(imgEl, src, fallback = "") {
    return new Promise((resolve) => {
      if (!imgEl) return resolve(false);
      let tried = false;
      imgEl.onload = () => resolve(true);
      imgEl.onerror = () => {
        if (!tried && fallback) { tried = true; imgEl.src = fallback; return; }
        resolve(false);
      };
      imgEl.src = src;
    });
  }

  function makeImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("圖片載入失敗"));
      img.src = src;
    });
  }

  function defaultAvatarSvg() {
    return "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
        <rect width="320" height="320" rx="160" fill="#eadfd4"/>
        <circle cx="160" cy="122" r="58" fill="#d0b8a3"/>
        <rect x="72" y="202" width="176" height="84" rx="42" fill="#d0b8a3"/>
      </svg>
    `);
  }

})();
