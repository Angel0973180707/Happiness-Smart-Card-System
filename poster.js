/* ==========================================
 * HSC Poster v5.6.5-delivery-upsell-safe-getCard
 * COMPLETE OVERWRITE
 *
 * 修正重點：
 * 1. fetchCard 改為 action=getCard
 * 2. 保留既有交付卡主功能
 * 3. 保留資訊區塊與導購區塊
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "v5.6.5-delivery-upsell-safe-getCard";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA =
    "https://lin.ee/3r2ZePN";

  const QR_CONFIG = {
    previewSize: 900,
    posterSize: 880,
    dark: "#2f241d",
    light: "#ffffff",
    correctLevel: "H",
    centerAvatarRatio: 0.16,
    centerAvatarBorder: 5,
    quietZoneRatio: 0.075,
    quietZoneColor: "#ffffff"
  };

  const qs = new URLSearchParams(location.search);

  const id = (qs.get("id") || "").trim();
  const gas = (qs.get("gas") || DEFAULT_GAS).trim();
  const baseUrl = normalizeBase(qs.get("base") || DEFAULT_BASE);
  const lineOA = (qs.get("lineoa") || DEFAULT_LINE_OA).trim();

  const incomingShareCardId = (qs.get("share_card_id") || "").trim();
  const incomingShareAgentId = (qs.get("share_agent_id") || "").trim();
  const incomingShareSource = (qs.get("share_source") || "").trim();
  const incomingShareChannel = (qs.get("share_channel") || "").trim();
  const incomingShareVisitId = (qs.get("share_visit_id") || "").trim();

  const el = {
    avatarImg: document.getElementById("avatarImg"),
    cardName: document.getElementById("cardName"),
    cardTitle: document.getElementById("cardTitle"),
    qrViewport: document.getElementById("qrViewport"),
    qrCenterAvatar: document.getElementById("qrCenterAvatar"),
    qrCenterAvatarImg: document.getElementById("qrCenterAvatarImg"),
    qrLinkFallback: document.getElementById("qrLinkFallback"),
    qrBox: document.getElementById("qrBox"),
    posterCapture: document.getElementById("posterCapture"),
    statusText: document.getElementById("statusText"),

    downloadBtn: document.getElementById("downloadBtn"),
    openCardBtn: document.getElementById("openCardBtn"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    shareCardBtn: document.getElementById("shareCardBtn"),
    recommendBtn: document.getElementById("recommendBtn"),
    helpBtn: document.getElementById("helpBtn"),
    lineOABtn: document.getElementById("lineOABtn"),

    shareDialog: document.getElementById("shareDialog"),
    dialogCloseBtn: document.getElementById("dialogCloseBtn"),

    updateRemainingText: document.getElementById("updateRemainingText"),
    photoLimitText: document.getElementById("photoLimitText"),
    ctaLimitText: document.getElementById("ctaLimitText"),
    marqueeStatusText: document.getElementById("marqueeStatusText"),
    updateEntryWrap: document.getElementById("updateEntryWrap"),
    updateEntryBtn: document.getElementById("updateEntryBtn"),

    agentRoleDisplayText: document.getElementById("agentRoleDisplayText"),
    referralCountText: document.getElementById("referralCountText"),
    convertedCountText: document.getElementById("convertedCountText"),
    rewardPointsText: document.getElementById("rewardPointsText"),
    referralCodeText: document.getElementById("referralCodeText"),
    referralLinkText: document.getElementById("referralLinkText"),
    copyReferralLinkBtn: document.getElementById("copyReferralLinkBtn"),

    partnerCommissionBlock: document.getElementById("partnerCommissionBlock"),
    commissionMonthlyText: document.getElementById("commissionMonthlyText"),
    commissionTotalText: document.getElementById("commissionTotalText"),

    updateExhaustedHint: document.getElementById("updateExhaustedHint"),
    photoUpsellHint: document.getElementById("photoUpsellHint"),
    ctaUpsellHint: document.getElementById("ctaUpsellHint"),
    marqueeUpsellHint: document.getElementById("marqueeUpsellHint"),
    comboUpsellHint: document.getElementById("comboUpsellHint"),
    manageUpsellBtn: document.getElementById("manageUpsellBtn"),

    agentUpgradeBlock: document.getElementById("agentUpgradeBlock"),
    agentUpgradeTitle: document.getElementById("agentUpgradeTitle"),
    agentUpgradeBtn: document.getElementById("agentUpgradeBtn")
  };

  let currentItem = null;
  let currentAvatarUrl = "";

  let currentPosterShareUrl = "";
  let currentPosterQrUrl = "";
  let currentProductCardUrl = "";
  let currentRecommendUrl = "";
  let currentUpdateUrl = "";

  let currentShareContext = {
    share_card_id: "",
    share_agent_id: "",
    share_source: "card_share",
    share_channel: "poster",
    share_visit_id: ""
  };

  window.__CARD_STATE__ = buildCardState(null);

  bindEvents();
  init();

  async function init() {
    try {
      if (!id) throw new Error("缺少名片 id");
      if (typeof window.QRCode === "undefined") {
        throw new Error("缺少 qrcode.min.js");
      }

      setStatus("正在載入資料…", false);

      const item = await fetchCard(id);
      currentItem = item;

      window.__CARD_STATE__ = buildCardState(item);

      currentShareContext = resolveShareContext(item);

      currentPosterShareUrl = buildPosterShareUrl(item, currentShareContext);
      currentPosterQrUrl = buildPosterQrUrl(item, currentShareContext);
      currentProductCardUrl = buildProductCardUrl(item, currentShareContext);
      currentRecommendUrl = buildRecommendUrl(item, currentShareContext);
      currentUpdateUrl = resolveUpdateUrl(item);
      currentAvatarUrl = getAvatarUrl(item);

      renderPoster(item);
      renderManagementSection(item, window.__CARD_STATE__);
      renderAgentSection(item, window.__CARD_STATE__);

      await renderQrLocal(currentPosterQrUrl);
      await renderQrCenterAvatar(currentAvatarUrl);

      setStatus("");
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] init error:`, err);
      window.__CARD_STATE__ = buildCardState(currentItem || null);
      renderPoster(null);
      renderManagementSection(null, window.__CARD_STATE__);
      renderAgentSection(null, window.__CARD_STATE__);
      renderQrFallback(currentPosterQrUrl || currentProductCardUrl || "");
      setStatus(err.message || "載入失敗", true);
    }
  }

  function bindEvents() {
    el.downloadBtn?.addEventListener("click", onGeneratePoster);
    el.openCardBtn?.addEventListener("click", onOpenCard);
    el.copyLinkBtn?.addEventListener("click", onCopyCardLink);
    el.shareCardBtn?.addEventListener("click", onShareCard);
    el.recommendBtn?.addEventListener("click", onRecommend);
    el.helpBtn?.addEventListener("click", openDialog);
    el.lineOABtn?.addEventListener("click", onOpenLineOA);

    el.dialogCloseBtn?.addEventListener("click", closeDialog);
    el.updateEntryBtn?.addEventListener("click", onOpenUpdateEntry);
    el.copyReferralLinkBtn?.addEventListener("click", onCopyReferralLink);
    el.manageUpsellBtn?.addEventListener("click", onManageUpsell);
    el.agentUpgradeBtn?.addEventListener("click", onAgentUpgrade);

    el.shareDialog?.addEventListener("click", (e) => {
      if (e.target === el.shareDialog) closeDialog();
    });

    el.qrBox?.addEventListener("click", () => {
      if (currentPosterQrUrl) {
        window.open(currentPosterQrUrl, "_blank", "noopener");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDialog();
    });
  }

  async function fetchCard(cardId) {
    const url = `${gas}?action=getCard&id=${encodeURIComponent(cardId)}&_=${Date.now()}`;

    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`讀取名片失敗（HTTP ${res.status}）`);
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error("名片資料不是有效 JSON");
    }

    const item = json?.item || json?.data || json;
    if (!item || typeof item !== "object") {
      throw new Error("名片資料格式不正確");
    }

    return item;
  }

  function renderPoster(item) {
    const name = text(item?.name) || text(item?.id) || "我的智慧名片";
    const title =
      text(item?.title) ||
      text(item?.unit) ||
      text(item?.slogan) ||
      "";

    if (el.cardName) el.cardName.textContent = name;
    if (el.cardTitle) el.cardTitle.textContent = title;

    const avatar = getAvatarUrl(item);

    if (el.avatarImg) {
      el.avatarImg.alt = `${name} 頭像`;
      el.avatarImg.onerror = () => {
        el.avatarImg.onerror = null;
        el.avatarImg.src = buildDefaultAvatarSvg();
      };
      el.avatarImg.src = avatar || buildDefaultAvatarSvg();
    }
  }

  function renderManagementSection(item, state) {
    if (el.updateRemainingText) {
      el.updateRemainingText.textContent = state.updateUnlimited
        ? "無限更新"
        : `剩餘 ${state.updateRemaining} 次`;
    }

    if (el.photoLimitText) {
      el.photoLimitText.textContent = `${state.photoLimit} 張`;
    }

    if (el.ctaLimitText) {
      el.ctaLimitText.textContent = `${state.ctaLimit} 個`;
    }

    if (el.marqueeStatusText) {
      el.marqueeStatusText.textContent = getMarqueeStatusText(state);
    }

    if (el.updateEntryWrap) {
      if (currentUpdateUrl) {
        el.updateEntryWrap.classList.remove("hidden");
      } else {
        el.updateEntryWrap.classList.add("hidden");
      }
    }

    const updateUsedOut =
      !state.updateUnlimited && Number(state.updateRemaining) <= 0;

    if (el.updateExhaustedHint) {
      el.updateExhaustedHint.classList.toggle("hidden", !updateUsedOut);
    }

    if (el.photoUpsellHint) {
      el.photoUpsellHint.classList.remove("hidden");
    }

    if (el.ctaUpsellHint) {
      el.ctaUpsellHint.classList.remove("hidden");
    }

    if (el.marqueeUpsellHint) {
      const showMarqueeUpsell = !state.marqueePurchased;
      el.marqueeUpsellHint.classList.toggle("hidden", !showMarqueeUpsell);
    }

    if (el.comboUpsellHint) {
      const showComboUpsell = !state.updateUnlimited || !state.marqueePurchased;
      el.comboUpsellHint.classList.toggle("hidden", !showComboUpsell);
    }
  }

  function renderAgentSection(item, state) {
    if (el.agentRoleDisplayText) {
      el.agentRoleDisplayText.textContent = state.agentRoleDisplay || "一般用戶";
    }

    if (el.referralCountText) {
      el.referralCountText.textContent = formatInt(state.referralCount);
    }

    if (el.convertedCountText) {
      el.convertedCountText.textContent = formatInt(state.convertedCount);
    }

    if (el.rewardPointsText) {
      el.rewardPointsText.textContent = formatInt(state.rewardPoints);
    }

    if (el.referralCodeText) {
      el.referralCodeText.textContent = state.referralCode || "尚未建立";
    }

    if (el.referralLinkText) {
      el.referralLinkText.textContent = state.referralLink || "尚未建立";
    }

    if (el.partnerCommissionBlock) {
      if (state.agentRole === "partner") {
        el.partnerCommissionBlock.classList.remove("hidden");
      } else {
        el.partnerCommissionBlock.classList.add("hidden");
      }
    }

    if (el.commissionMonthlyText) {
      el.commissionMonthlyText.textContent = formatMoneyLike(state.commissionMonthly);
    }

    if (el.commissionTotalText) {
      el.commissionTotalText.textContent = formatMoneyLike(state.commissionTotal);
    }

    if (el.copyReferralLinkBtn) {
      el.copyReferralLinkBtn.disabled = !state.referralLink;
      el.copyReferralLinkBtn.style.opacity = state.referralLink ? "" : "0.56";
      el.copyReferralLinkBtn.style.cursor = state.referralLink ? "" : "not-allowed";
    }

    if (el.agentUpgradeBlock) {
      const showUpgrade = state.agentRole !== "partner";
      el.agentUpgradeBlock.classList.toggle("hidden", !showUpgrade);
    }

    if (el.agentUpgradeTitle) {
      const remain = Math.max(0, normalizeNumberLike(state.upgradeRemainingPoints, 0));
      el.agentUpgradeTitle.textContent = `再累積 ${formatInt(remain)} 點可升級合作代理`;
    }
  }

  function getAvatarUrl(item) {
    return (
      text(item?.avatar_url) ||
      text(item?.avatar_img_fast) ||
      text(item?.avatar_img)
    );
  }

  function buildCardState(item) {
    const plan = normalizePlan(item?.plan);

    const updateUnlimited = toBool(item?.update_unlimited);
    const rawUpdateRemaining = item?.update_limit_remaining;
    const updateRemaining = updateUnlimited
      ? "∞"
      : normalizeCount(rawUpdateRemaining, 0);

    const photoLimit = hasValue(item?.photo_limit)
      ? normalizeCount(item?.photo_limit, plan === "premium" ? 5 : 2)
      : (plan === "premium" ? 5 : 2);

    const ctaLimit = hasValue(item?.cta_limit)
      ? normalizeCount(item?.cta_limit, plan === "premium" ? 3 : 1)
      : (plan === "premium" ? 3 : 1);

    const marqueePurchased = toBool(item?.marquee_purchased);
    const marqueeEnabled = marqueePurchased
      ? toBool(item?.marquee_enabled)
      : false;

    return {
      updateRemaining,
      updateUnlimited,
      photoLimit,
      ctaLimit,
      marqueeEnabled,
      marqueePurchased,
      agentRole: text(item?.agent_role),
      agentRoleDisplay: text(item?.agent_role_display),
      rewardPoints: normalizeNumberLike(item?.reward_points, 0),
      referralCount: normalizeNumberLike(item?.referral_count, 0),
      convertedCount: normalizeNumberLike(item?.converted_count, 0),
      commissionTotal: normalizeNumberLike(item?.commission_total, 0),
      commissionMonthly: normalizeNumberLike(item?.commission_monthly, 0),
      upgradeRemainingPoints: normalizeNumberLike(item?.upgrade_remaining_points, 0),
      referralCode: text(item?.referral_code),
      referralLink: text(item?.referral_link)
    };
  }

  function getMarqueeStatusText(state) {
    if (!state.marqueePurchased) return "尚未開通";
    if (state.marqueePurchased && !state.marqueeEnabled) return "已購買未啟用";
    return "已開通";
  }

  function resolveUpdateUrl(item) {
    return (
      text(item?.update_link) ||
      text(item?.update_url) ||
      text(item?.update_form_url) ||
      text(item?.form_url) ||
      ""
    );
  }

  function normalizePlan(plan) {
    const v = text(plan).toLowerCase();
    if (v === "premium") return "premium";
    return "free";
  }

  function hasValue(v) {
    return !(v === undefined || v === null || String(v).trim() === "");
  }

  function toBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    const s = String(v || "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on";
  }

  function normalizeCount(v, fallback = 0) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.floor(n));
  }

  function normalizeNumberLike(v, fallback = 0) {
    if (v === null || v === undefined || String(v).trim() === "") return fallback;
    const n = Number(String(v).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : fallback;
  }

  function resolveShareContext(item) {
    const cardId = text(item?.id) || id;
    const serviceAgent =
      text(item?.service_agent) ||
      text(item?.agent_id) ||
      "";

    return {
      share_card_id: incomingShareCardId || cardId,
      share_agent_id: incomingShareAgentId || serviceAgent || "",
      share_source: incomingShareSource || "card_share",
      share_channel: normalizeIncomingChannel(incomingShareChannel),
      share_visit_id: incomingShareVisitId || ""
    };
  }

  function normalizeIncomingChannel(channel) {
    const v = text(channel);
    if (v === "poster_qr") return "poster_qr";
    if (v === "poster") return "poster";
    if (v === "product_card") return "product_card";
    return "poster";
  }

  function buildPosterShareUrl(item, ctx) {
    const cardId = text(item?.id) || id;
    return buildUrl("poster.html", {
      id: cardId,
      share_card_id: ctx.share_card_id || cardId,
      share_agent_id: ctx.share_agent_id || "",
      share_source: ctx.share_source || "card_share",
      share_channel: "poster",
      share_visit_id: ctx.share_visit_id || ""
    });
  }

  function buildPosterQrUrl(item, ctx) {
    const cardId = text(item?.id) || id;
    return buildUrl("index.html", {
      id: cardId,
      view: "1",
      share_card_id: ctx.share_card_id || cardId,
      share_agent_id: ctx.share_agent_id || "",
      share_source: ctx.share_source || "card_share",
      share_channel: "poster_qr",
      share_visit_id: ctx.share_visit_id || ""
    });
  }

  function buildProductCardUrl(item, ctx) {
    const cardId = text(item?.id) || id;
    return buildUrl("index.html", {
      id: cardId,
      view: "1",
      share_card_id: ctx.share_card_id || cardId,
      share_agent_id: ctx.share_agent_id || "",
      share_source: ctx.share_source || "card_share",
      share_channel: "product_card",
      share_visit_id: ctx.share_visit_id || ""
    });
  }

  function buildRecommendUrl(item, ctx) {
    const cardId = text(item?.id) || id;
    const channelForForm = ctx.share_channel === "poster_qr" ? "poster_qr" : "poster";

    return buildUrl("form.html", {
      share_card_id: ctx.share_card_id || cardId,
      share_agent_id: ctx.share_agent_id || "",
      share_source: ctx.share_source || "card_share",
      share_channel: channelForForm,
      share_visit_id: ctx.share_visit_id || ""
    });
  }

  function buildUrl(path, params) {
    const url = new URL(path, baseUrl);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  async function renderQrLocal(targetUrl) {
    if (!el.qrViewport) return;

    hideQrFallback();
    el.qrViewport.innerHTML = "";

    try {
      const qrCanvas = await buildQrCanvasWithQuietZone(
        targetUrl,
        QR_CONFIG.previewSize,
        {
          includeQuietZone: true,
          quietZoneRatio: 0.04,
          centerAvatarUrl: "",
          centerAvatarRatio: 0
        }
      );

      qrCanvas.style.width = "100%";
      qrCanvas.style.height = "100%";
      qrCanvas.style.display = "block";
      qrCanvas.style.objectFit = "contain";
      qrCanvas.style.imageRendering = "pixelated";

      el.qrViewport.appendChild(qrCanvas);
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] renderQrLocal error:`, err);
      renderQrFallback(targetUrl);
      setStatus("QR 產生失敗，已改顯示名片連結", true);
    }
  }

  async function renderQrCenterAvatar(avatarUrl) {
    if (!el.qrCenterAvatar || !el.qrCenterAvatarImg) return;

    if (!avatarUrl) {
      hideQrCenterAvatar();
      return;
    }

    const ok = await loadImage(
      el.qrCenterAvatarImg,
      avatarUrl,
      buildDefaultAvatarSvg()
    );

    if (!ok) {
      hideQrCenterAvatar();
      return;
    }

    const ratioPercent = `${Math.round(QR_CONFIG.centerAvatarRatio * 100)}%`;

    el.qrCenterAvatar.style.width = ratioPercent;
    el.qrCenterAvatar.style.height = ratioPercent;
    el.qrCenterAvatar.style.aspectRatio = "1 / 1";
    el.qrCenterAvatar.style.position = "absolute";
    el.qrCenterAvatar.style.left = "50%";
    el.qrCenterAvatar.style.top = "50%";
    el.qrCenterAvatar.style.transform = "translate(-50%, -50%)";
    el.qrCenterAvatar.style.display = "flex";
    el.qrCenterAvatar.style.alignItems = "center";
    el.qrCenterAvatar.style.justifyContent = "center";
    el.qrCenterAvatar.style.overflow = "hidden";
    el.qrCenterAvatar.style.borderRadius = "999px";
    el.qrCenterAvatar.style.background = "#ffffff";
    el.qrCenterAvatar.style.boxSizing = "border-box";
    el.qrCenterAvatar.style.border = `${QR_CONFIG.centerAvatarBorder}px solid #ffffff`;
    el.qrCenterAvatar.style.zIndex = "3";

    el.qrCenterAvatarImg.style.display = "block";
    el.qrCenterAvatarImg.style.width = "100%";
    el.qrCenterAvatarImg.style.height = "100%";
    el.qrCenterAvatarImg.style.minWidth = "100%";
    el.qrCenterAvatarImg.style.minHeight = "100%";
    el.qrCenterAvatarImg.style.objectFit = "cover";
    el.qrCenterAvatarImg.style.borderRadius = "999px";
    el.qrCenterAvatarImg.style.border = "0";
    el.qrCenterAvatarImg.style.background = "transparent";
    el.qrCenterAvatarImg.style.flex = "0 0 100%";

    el.qrCenterAvatar.classList.add("show");
  }

  function hideQrCenterAvatar() {
    if (!el.qrCenterAvatar || !el.qrCenterAvatarImg) return;
    el.qrCenterAvatar.classList.remove("show");
    el.qrCenterAvatarImg.removeAttribute("src");
  }

  function renderQrFallback(url) {
    if (el.qrViewport) el.qrViewport.innerHTML = "";
    hideQrCenterAvatar();

    if (el.qrLinkFallback) {
      el.qrLinkFallback.classList.add("show");
      el.qrLinkFallback.textContent = url
        ? `名片連結：${url}`
        : "QR 暫時無法顯示";
    }
  }

  function hideQrFallback() {
    if (el.qrLinkFallback) {
      el.qrLinkFallback.classList.remove("show");
      el.qrLinkFallback.textContent = "";
    }
  }

  async function onGeneratePoster() {
    try {
      disableButton(el.downloadBtn, true);
      setStatus("正在產生海報圖片…", false);

      await waitForFonts();

      const dataUrl = await buildPosterImageDataUrl();

      const filename = `${safeFileName(
        currentItem?.name || currentItem?.id || "smart-card"
      )}-poster.png`;

      showImagePage(dataUrl, filename);

    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] generate error:`, err);
      setStatus(`海報產生失敗：${err.message || "請重試"}`, true);
      disableButton(el.downloadBtn, false);
    }
  }

  async function buildPosterImageDataUrl() {
    if (!currentPosterQrUrl) {
      throw new Error("名片連結尚未建立");
    }

    const qrCanvas = await buildQrCanvasWithQuietZone(
      currentPosterQrUrl,
      QR_CONFIG.posterSize,
      {
        includeQuietZone: true,
        quietZoneRatio: QR_CONFIG.quietZoneRatio,
        centerAvatarUrl: "",
        centerAvatarRatio: 0
      }
    );

    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("無法建立畫布");
    }

    drawBackground(ctx, width, height);
    drawMainCard(ctx, width, height);
    drawHeader(ctx, width);
    drawDeliveryPill(ctx, width);

    const name = text(currentItem?.name) || text(currentItem?.id) || "我的智慧名片";
    const title =
      text(currentItem?.title) ||
      text(currentItem?.unit) ||
      text(currentItem?.slogan) ||
      "";

    drawNameAndTitle(ctx, width, name, title);
    drawQrBlock(ctx, width, qrCanvas);
    drawFooterTips(ctx, width);

    return canvas.toDataURL("image/png", 0.96);
  }

  async function buildQrCanvasWithQuietZone(targetUrl, size = 880, options = {}) {
    const quietRatio = Number(options.quietZoneRatio || 0);
    const includeQuietZone = !!options.includeQuietZone;
    const centerAvatarUrl = text(options.centerAvatarUrl);
    const centerAvatarRatio = Number(options.centerAvatarRatio || 0);

    const innerSize = includeQuietZone
      ? Math.max(100, Math.round(size * (1 - quietRatio * 2)))
      : size;

    const rawCanvas = await buildRawQrCanvas(targetUrl, innerSize);

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = size;
    finalCanvas.height = size;

    const ctx = finalCanvas.getContext("2d");
    if (!ctx) throw new Error("無法建立 QR 畫布");

    ctx.fillStyle = QR_CONFIG.quietZoneColor;
    ctx.fillRect(0, 0, size, size);

    const offset = Math.round((size - innerSize) / 2);
    ctx.drawImage(rawCanvas, offset, offset, innerSize, innerSize);

    if (centerAvatarUrl && centerAvatarRatio > 0) {
      await drawQrCenterAvatarOnCanvas(
        ctx,
        size,
        centerAvatarUrl,
        centerAvatarRatio,
        QR_CONFIG.centerAvatarBorder
      );
    }

    return finalCanvas;
  }

  async function buildRawQrCanvas(targetUrl, size = 880) {
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-99999px";
    wrap.style.top = "-99999px";
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    wrap.style.pointerEvents = "none";
    wrap.style.opacity = "0";
    wrap.style.overflow = "hidden";
    document.body.appendChild(wrap);

    try {
      new window.QRCode(wrap, {
        text: targetUrl,
        width: size,
        height: size,
        colorDark: QR_CONFIG.dark,
        colorLight: QR_CONFIG.light,
        correctLevel: window.QRCode.CorrectLevel[QR_CONFIG.correctLevel] || window.QRCode.CorrectLevel.H
      });

      await wait(260);

      const nodeCanvas = wrap.querySelector("canvas");
      if (nodeCanvas) {
        const cloned = document.createElement("canvas");
        cloned.width = size;
        cloned.height = size;
        const clonedCtx = cloned.getContext("2d");
        if (!clonedCtx) throw new Error("無法複製 QR canvas");
        clonedCtx.fillStyle = "#ffffff";
        clonedCtx.fillRect(0, 0, size, size);
        clonedCtx.drawImage(nodeCanvas, 0, 0, size, size);
        return cloned;
      }

      const img = wrap.querySelector("img");
      if (img && img.src) {
        const loaded = await createImage(img.src);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("無法建立 QR image canvas");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(loaded, 0, 0, size, size);
        return canvas;
      }

      const table = wrap.querySelector("table");
      if (table) {
        return tableQrToCanvas(table, size);
      }

      throw new Error("QR 生成失敗");
    } finally {
      wrap.remove();
    }
  }

  function tableQrToCanvas(table, size) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法建立 table QR canvas");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    if (!rows.length) return canvas;

    const cols = rows[0].querySelectorAll("td").length || 1;
    const cellSize = size / Math.max(rows.length, cols);

    rows.forEach((tr, y) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      cells.forEach((td, x) => {
        const bg = getComputedStyle(td).backgroundColor;
        const dark = isDarkColor(bg);
        ctx.fillStyle = dark ? QR_CONFIG.dark : "#ffffff";
        ctx.fillRect(
          Math.round(x * cellSize),
          Math.round(y * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      });
    });

    return canvas;
  }

  function isDarkColor(color) {
    const s = String(color || "").toLowerCase();
    if (!s) return false;
    if (s === "black") return true;
    if (s === "rgb(0, 0, 0)") return true;
    if (s === "rgba(0, 0, 0, 1)") return true;

    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;

    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 140;
  }

  async function drawQrCenterAvatarOnCanvas(ctx, size, avatarUrl, ratio, borderWidth) {
    try {
      const img = await createImageWithFallback(avatarUrl, buildDefaultAvatarSvg());
      const avatarSize = Math.round(size * ratio);
      const x = Math.round((size - avatarSize) / 2);
      const y = Math.round((size - avatarSize) / 2);
      const radius = Math.round(avatarSize / 2);

      ctx.save();

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius + borderWidth, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, x, y, avatarSize, avatarSize);
      ctx.restore();
    } catch (err) {
      console.warn(`[HSC Poster ${VERSION}] drawQrCenterAvatarOnCanvas skipped:`, err);
    }
  }

  function drawBackground(ctx, width, height) {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#f8f4ee");
    bg.addColorStop(1, "#f3ece3");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width / 2, 150, 40, width / 2, 150, 620);
    glow.addColorStop(0, "rgba(255,255,255,.92)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, 520);
  }

  function drawMainCard(ctx, width, height) {
    roundRect(ctx, 66, 74, width - 132, height - 148, 44);
    const cardGrad = ctx.createLinearGradient(0, 74, 0, height - 74);
    cardGrad.addColorStop(0, "rgba(255,253,250,.98)");
    cardGrad.addColorStop(1, "rgba(255,248,241,.98)");
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(102,78,57,.09)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, 66, 74, width - 132, 220, 44);
    ctx.clip();

    const topGlow = ctx.createLinearGradient(0, 74, 0, 294);
    topGlow.addColorStop(0, "rgba(255,255,255,.76)");
    topGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(66, 74, width - 132, 220);
    ctx.restore();
  }

  function drawHeader(ctx, width) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "700 40px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#b6855e";
    ctx.fillText("☀", width / 2, 150);

    ctx.font = "900 50px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#433227";
    ctx.fillText("天使幸福智慧名片", width / 2, 220);

    ctx.font = "700 24px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#9c8b7f";
    ctx.fillText("Angel Smart Card", width / 2, 270);
  }

  function drawDeliveryPill(ctx, width) {
    const pillW = 360;
    const pillH = 68;
    const x = (width - pillW) / 2;
    const y = 315;

    roundRect(ctx, x, y, pillW, pillH, 999);
    const grad = ctx.createLinearGradient(0, y, 0, y + pillH);
    grad.addColorStop(0, "#fffefb");
    grad.addColorStop(1, "#fbf3e9");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(191,135,87,.13)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 28px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillStyle = "#9a6a44";
    ctx.fillText("智慧名片交付卡", width / 2, y + pillH / 2 + 1);
  }

  function drawNameAndTitle(ctx, width, name, title) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxNameWidth = width - 220;
    let nameFont = 64;
    while (nameFont > 40) {
      ctx.font = `900 ${nameFont}px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif`;
      if (ctx.measureText(name).width <= maxNameWidth) break;
      nameFont -= 2;
    }

    ctx.fillStyle = "#433227";
    ctx.font = `900 ${nameFont}px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif`;
    ctx.fillText(name, width / 2, 495);

    if (title) {
      const lines = wrapTextByWidth(ctx, title, width - 320, 32);
      ctx.fillStyle = "#6b5a4d";
      ctx.font = "500 32px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      let y = 575;
      lines.slice(0, 2).forEach((line) => {
        ctx.fillText(line, width / 2, y);
        y += 48;
      });
    }
  }

  function drawQrBlock(ctx, width, qrCanvas) {
    const frameX = 160;
    const frameY = 690;
    const frameW = 760;
    const frameH = 760;

    roundRect(ctx, frameX, frameY, frameW, frameH, 38);
    const frameGrad = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
    frameGrad.addColorStop(0, "#ffffff");
    frameGrad.addColorStop(1, "#fffdfb");
    ctx.fillStyle = frameGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,.035)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const qrBoxX = 205;
    const qrBoxY = 735;
    const qrBoxSize = 670;

    roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.035)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.drawImage(qrCanvas, qrBoxX + 10, qrBoxY + 10, qrBoxSize - 20, qrBoxSize - 20);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6b5a4d";

    ctx.font = "800 28px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillText("掃描 QR Code", width / 2, 1490);
    ctx.fillText("即可查看完整智慧名片", width / 2, 1536);
  }

  function drawFooterTips(ctx, width) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8d7d70";
    ctx.font = "500 23px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillText("分享海報給朋友或客戶掃描，即可快速查看名片。", width / 2, 1650);
  }

  function showImagePage(dataUrl, filename) {
    document.open();
    document.write(`
      <!doctype html>
      <html lang="zh-Hant">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
        <title>${escapeHtml(filename)}</title>
        <style>
          html,body{
            margin:0;
            padding:0;
            background:#121212;
            min-height:100%;
            font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;
          }
          .wrap{
            min-height:100vh;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            padding:24px 16px 28px;
            gap:18px;
          }
          .tip{
            text-align:center;
            color:rgba(255,255,255,.88);
            font-size:15px;
            line-height:1.75;
            white-space:normal;
          }
          img{
            max-width:100%;
            height:auto;
            display:block;
            border-radius:18px;
            box-shadow:0 16px 40px rgba(0,0,0,.42);
            background:#fff;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="tip">海報已開啟<br><br>長按圖片即可保存到相簿<br>可分享給朋友或客戶掃描查看</div>
          <img src="${dataUrl}" alt="poster">
        </div>
      </body>
      </html>
    `);
    document.close();
  }

  function onOpenCard() {
    if (!currentPosterQrUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }
    window.open(currentPosterQrUrl, "_blank", "noopener");
  }

  async function onCopyCardLink() {
    if (!currentPosterQrUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }
    const ok = await copyText(currentPosterQrUrl);
    setStatus(ok ? "名片連結已複製" : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

  async function onCopyReferralLink() {
    const referralLink = window.__CARD_STATE__?.referralLink || "";
    if (!referralLink) {
      setStatus("尚未建立推薦連結", true);
      clearStatusSoon();
      return;
    }

    const ok = await copyText(referralLink);
    setStatus(ok ? "推薦連結已複製" : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

  async function onShareCard() {
    const targetUrl = currentPosterQrUrl || currentProductCardUrl;
    if (!targetUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }

    const shareData = {
      title: currentItem?.name ? `${currentItem.name} 的智慧名片` : "我的智慧名片",
      text: "這是我的智慧名片，歡迎查看。",
      url: targetUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setStatus("已開啟分享");
        clearStatusSoon();
        return;
      }

      const ok = await copyText(targetUrl);
      setStatus(ok ? "已改為複製名片連結" : "分享失敗，請手動複製", !ok);
      clearStatusSoon();
    } catch (err) {
      if (err?.name === "AbortError") return;
      const ok = await copyText(targetUrl);
      setStatus(ok ? "已改為複製名片連結" : "分享失敗，請手動複製", !ok);
      clearStatusSoon();
    }
  }

  function onRecommend() {
    if (!currentRecommendUrl) {
      setStatus("推薦連結尚未建立", true);
      return;
    }
    window.open(currentRecommendUrl, "_blank", "noopener");
  }

  function onOpenUpdateEntry() {
    if (!currentUpdateUrl) {
      setStatus("目前沒有可用的更新入口", true);
      clearStatusSoon();
      return;
    }
    window.open(currentUpdateUrl, "_blank", "noopener");
  }

  function onManageUpsell() {
    console.log("[HSC upsell] manage upsell click", {
      id,
      cardId: currentItem?.id || "",
      state: window.__CARD_STATE__,
      type: "manage_upsell"
    });

    if (lineOA) {
      window.open(lineOA, "_blank", "noopener");
      return;
    }

    alert("請聯繫客服開通升級方案");
  }

  function onAgentUpgrade() {
    console.log("[HSC upsell] agent upgrade click", {
      id,
      cardId: currentItem?.id || "",
      state: window.__CARD_STATE__,
      type: "agent_upgrade"
    });

    if (lineOA) {
      window.open(lineOA, "_blank", "noopener");
      return;
    }

    alert("請聯繫客服了解合作代理升級方式");
  }

  function onOpenLineOA() {
    if (!lineOA) {
      setStatus("LINE 官方帳號連結未設定", true);
      return;
    }
    window.open(lineOA, "_blank", "noopener");
  }

  function openDialog() {
    if (!el.shareDialog) return;
    el.shareDialog.classList.add("show");
    el.shareDialog.setAttribute("aria-hidden", "false");
  }

  function closeDialog() {
    if (!el.shareDialog) return;
    el.shareDialog.classList.remove("show");
    el.shareDialog.setAttribute("aria-hidden", "true");
  }

  function setStatus(message, isError = false) {
    if (!el.statusText) return;
    el.statusText.textContent = message || "";
    el.statusText.classList.toggle("error", !!isError);
  }

  function clearStatusSoon() {
    window.clearTimeout(clearStatusSoon._timer);
    clearStatusSoon._timer = window.setTimeout(() => {
      setStatus("");
    }, 1800);
  }

  function formatInt(v) {
    const n = normalizeNumberLike(v, 0);
    return n.toLocaleString("zh-TW");
  }

  function formatMoneyLike(v) {
    const n = normalizeNumberLike(v, 0);
    return n.toLocaleString("zh-TW");
  }

  function text(v) {
    return String(v || "").trim();
  }

  function normalizeBase(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.endsWith("/") ? s : `${s}/`;
  }

  function safeFileName(v) {
    return String(v || "poster")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }

  function buildDefaultAvatarSvg() {
    return "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
        <rect width="320" height="320" rx="160" fill="#eadfd4"/>
        <circle cx="160" cy="122" r="58" fill="#d0b8a3"/>
        <rect x="72" y="202" width="176" height="84" rx="42" fill="#d0b8a3"/>
      </svg>
    `);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready.catch(() => {});
    }
    return Promise.resolve();
  }

  function loadImage(imgEl, src, fallback = "") {
    return new Promise((resolve) => {
      if (!imgEl) return resolve(false);

      let triedFallback = false;

      imgEl.onload = () => resolve(true);
      imgEl.onerror = () => {
        if (!triedFallback && fallback) {
          triedFallback = true;
          imgEl.src = fallback;
          return;
        }
        resolve(false);
      };

      imgEl.src = src;
    });
  }

  function createImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.src = src;
    });
  }

  async function createImageWithFallback(src, fallback = "") {
    try {
      return await createImage(src);
    } catch (err) {
      if (!fallback) throw err;
      return await createImage(fallback);
    }
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return legacyCopyText(value);
    } catch {
      return legacyCopyText(value);
    }
  }

  function legacyCopyText(value) {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }

  function wrapTextByWidth(ctx, textValue, maxWidth, fontSize) {
    const chars = Array.from(String(textValue || ""));
    const lines = [];
    let line = "";

    ctx.font = `500 ${fontSize}px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif`;

    for (const ch of chars) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    roundRectPath(ctx, x, y, w, h, r);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function disableButton(button, disabled) {
    if (!button) return;
    button.disabled = !!disabled;
    button.style.opacity = disabled ? "0.72" : "";
    button.style.cursor = disabled ? "wait" : "";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
/* ==========================================
 * HSC Poster v5.6.5-delivery-debug-getCard
 * COMPLETE OVERWRITE
 *
 * 用途：
 * - 專門除錯 getCard 讀取
 * - 畫面顯示 request / response / parsed item
 * - 快速定位推薦連結無法建立原因
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "v5.6.5-delivery-debug-getCard";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const DEFAULT_BASE =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const DEFAULT_LINE_OA =
    "https://lin.ee/3r2ZePN";

  const QR_CONFIG = {
    previewSize: 900,
    dark: "#2f241d",
    light: "#ffffff",
    correctLevel: "H",
    centerAvatarRatio: 0.16,
    centerAvatarBorder: 5,
    quietZoneRatio: 0.04,
    quietZoneColor: "#ffffff"
  };

  const qs = new URLSearchParams(location.search);

  const id = (qs.get("id") || "").trim();
  const gas = (qs.get("gas") || DEFAULT_GAS).trim();
  const baseUrl = normalizeBase(qs.get("base") || DEFAULT_BASE);
  const lineOA = (qs.get("lineoa") || DEFAULT_LINE_OA).trim();

  const el = {
    avatarImg: document.getElementById("avatarImg"),
    cardName: document.getElementById("cardName"),
    cardTitle: document.getElementById("cardTitle"),
    qrViewport: document.getElementById("qrViewport"),
    qrCenterAvatar: document.getElementById("qrCenterAvatar"),
    qrCenterAvatarImg: document.getElementById("qrCenterAvatarImg"),
    qrLinkFallback: document.getElementById("qrLinkFallback"),
    qrBox: document.getElementById("qrBox"),
    statusText: document.getElementById("statusText"),

    downloadBtn: document.getElementById("downloadBtn"),
    openCardBtn: document.getElementById("openCardBtn"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    shareCardBtn: document.getElementById("shareCardBtn"),
    recommendBtn: document.getElementById("recommendBtn"),
    helpBtn: document.getElementById("helpBtn"),
    lineOABtn: document.getElementById("lineOABtn"),

    shareDialog: document.getElementById("shareDialog"),
    dialogCloseBtn: document.getElementById("dialogCloseBtn")
  };

  let currentItem = null;
  let currentPosterQrUrl = "";
  let currentRecommendUrl = "";
  let currentProductCardUrl = "";
  let currentAvatarUrl = "";

  const debugState = {
    version: VERSION,
    requestUrl: "",
    httpStatus: "",
    rawResponse: null,
    parsedItem: null,
    error: "",
    built: {}
  };

  bindEvents();
  init();

  async function init() {
    ensureDebugPanel();

    try {
      if (!id) throw new Error("缺少名片 id");
      if (typeof window.QRCode === "undefined") {
        throw new Error("缺少 qrcode.min.js");
      }

      setStatus("正在載入資料…", false);
      renderDebug();

      const result = await fetchCard(id);
      currentItem = result.item;
      debugState.requestUrl = result.requestUrl;
      debugState.httpStatus = result.httpStatus;
      debugState.rawResponse = result.rawJson;
      debugState.parsedItem = result.item;

      currentAvatarUrl = getAvatarUrl(currentItem);
      currentProductCardUrl = buildProductCardUrl(currentItem);
      currentPosterQrUrl = currentProductCardUrl;
      currentRecommendUrl = buildRecommendUrl(currentItem);

      debugState.built = {
        id: currentItem?.id || "",
        name: currentItem?.name || "",
        referral_code: currentItem?.referral_code || "",
        referral_link: currentItem?.referral_link || "",
        agent_role: currentItem?.agent_role || "",
        agent_role_display: currentItem?.agent_role_display || "",
        reward_points: currentItem?.reward_points || "",
        referral_count: currentItem?.referral_count || "",
        converted_count: currentItem?.converted_count || "",
        service_agent: currentItem?.service_agent || "",
        agent_id: currentItem?.agent_id || "",
        productCardUrl: currentProductCardUrl,
        recommendUrl: currentRecommendUrl
      };

      renderPoster(currentItem);
      await renderQrLocal(currentPosterQrUrl);
      await renderQrCenterAvatar(currentAvatarUrl);

      setStatus("讀取成功");
      renderDebug();
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] init error:`, err);
      debugState.error = err?.message || String(err || "unknown error");
      renderPoster(null);
      renderQrFallback("");
      setStatus(debugState.error || "載入失敗", true);
      renderDebug();
    }
  }

  function bindEvents() {
    el.openCardBtn?.addEventListener("click", onOpenCard);
    el.copyLinkBtn?.addEventListener("click", onCopyCardLink);
    el.shareCardBtn?.addEventListener("click", onShareCard);
    el.recommendBtn?.addEventListener("click", onRecommend);
    el.helpBtn?.addEventListener("click", openDialog);
    el.lineOABtn?.addEventListener("click", onOpenLineOA);
    el.dialogCloseBtn?.addEventListener("click", closeDialog);

    el.shareDialog?.addEventListener("click", (e) => {
      if (e.target === el.shareDialog) closeDialog();
    });

    el.qrBox?.addEventListener("click", () => {
      if (currentPosterQrUrl) {
        window.open(currentPosterQrUrl, "_blank", "noopener");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDialog();
    });
  }

  async function fetchCard(cardId) {
    const requestUrl = `${gas}?action=getCard&id=${encodeURIComponent(cardId)}&_=${Date.now()}`;

    const res = await fetch(requestUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-store"
    });

    let rawText = "";
    try {
      rawText = await res.text();
    } catch (e) {
      throw new Error(`讀取 response text 失敗：${e?.message || e}`);
    }

    let rawJson = null;
    try {
      rawJson = rawText ? JSON.parse(rawText) : null;
    } catch (e) {
      throw new Error(`回傳不是有效 JSON。原始內容前 500 字：${rawText.slice(0, 500)}`);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}。JSON：${safeJsonPreview(rawJson)}`);
    }

    const item = rawJson?.item || rawJson?.data || rawJson;

    if (!item || typeof item !== "object") {
      throw new Error(`名片資料格式不正確。JSON：${safeJsonPreview(rawJson)}`);
    }

    return {
      requestUrl,
      httpStatus: `${res.status} ${res.statusText || ""}`.trim(),
      rawJson,
      item
    };
  }

  function renderPoster(item) {
    const name = text(item?.name) || text(item?.id) || "我的智慧名片";
    const title =
      text(item?.title) ||
      text(item?.unit) ||
      text(item?.slogan) ||
      "";

    if (el.cardName) el.cardName.textContent = name;
    if (el.cardTitle) el.cardTitle.textContent = title;

    const avatar = getAvatarUrl(item);

    if (el.avatarImg) {
      el.avatarImg.alt = `${name} 頭像`;
      el.avatarImg.onerror = () => {
        el.avatarImg.onerror = null;
        el.avatarImg.src = buildDefaultAvatarSvg();
      };
      el.avatarImg.src = avatar || buildDefaultAvatarSvg();
    }
  }

  function getAvatarUrl(item) {
    return (
      text(item?.avatar_url) ||
      text(item?.avatar_img_fast) ||
      text(item?.avatar_img)
    );
  }

  function buildProductCardUrl(item) {
    const cardId = text(item?.id) || id;
    return buildUrl("index.html", {
      id: cardId,
      view: "1"
    });
  }

  function buildRecommendUrl(item) {
    const explicitReferralLink = text(item?.referral_link);
    if (explicitReferralLink) return explicitReferralLink;

    const cardId = text(item?.id) || id;
    const shareAgentId =
      text(item?.service_agent) ||
      text(item?.agent_id) ||
      "";

    return buildUrl("form.html", {
      share_card_id: cardId,
      share_agent_id: shareAgentId,
      share_source: "card_share",
      share_channel: "poster"
    });
  }

  function buildUrl(path, params) {
    const url = new URL(path, baseUrl);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || String(value).trim() === "") return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  async function renderQrLocal(targetUrl) {
    if (!el.qrViewport) return;

    hideQrFallback();
    el.qrViewport.innerHTML = "";

    try {
      const qrCanvas = await buildQrCanvasWithQuietZone(targetUrl, QR_CONFIG.previewSize);
      qrCanvas.style.width = "100%";
      qrCanvas.style.height = "100%";
      qrCanvas.style.display = "block";
      qrCanvas.style.objectFit = "contain";
      qrCanvas.style.imageRendering = "pixelated";
      el.qrViewport.appendChild(qrCanvas);
    } catch (err) {
      console.error(`[HSC Poster ${VERSION}] renderQrLocal error:`, err);
      renderQrFallback(targetUrl);
      setStatus("QR 產生失敗，已改顯示名片連結", true);
    }
  }

  async function buildQrCanvasWithQuietZone(targetUrl, size = 880) {
    const innerSize = Math.max(100, Math.round(size * (1 - QR_CONFIG.quietZoneRatio * 2)));
    const rawCanvas = await buildRawQrCanvas(targetUrl, innerSize);

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = size;
    finalCanvas.height = size;

    const ctx = finalCanvas.getContext("2d");
    if (!ctx) throw new Error("無法建立 QR 畫布");

    ctx.fillStyle = QR_CONFIG.quietZoneColor;
    ctx.fillRect(0, 0, size, size);

    const offset = Math.round((size - innerSize) / 2);
    ctx.drawImage(rawCanvas, offset, offset, innerSize, innerSize);
    return finalCanvas;
  }

  async function buildRawQrCanvas(targetUrl, size = 880) {
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-99999px";
    wrap.style.top = "-99999px";
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    wrap.style.opacity = "0";
    document.body.appendChild(wrap);

    try {
      new window.QRCode(wrap, {
        text: targetUrl,
        width: size,
        height: size,
        colorDark: QR_CONFIG.dark,
        colorLight: QR_CONFIG.light,
        correctLevel: window.QRCode.CorrectLevel[QR_CONFIG.correctLevel] || window.QRCode.CorrectLevel.H
      });

      await wait(220);

      const nodeCanvas = wrap.querySelector("canvas");
      if (nodeCanvas) {
        const cloned = document.createElement("canvas");
        cloned.width = size;
        cloned.height = size;
        const clonedCtx = cloned.getContext("2d");
        if (!clonedCtx) throw new Error("無法複製 QR canvas");
        clonedCtx.fillStyle = "#ffffff";
        clonedCtx.fillRect(0, 0, size, size);
        clonedCtx.drawImage(nodeCanvas, 0, 0, size, size);
        return cloned;
      }

      const img = wrap.querySelector("img");
      if (img && img.src) {
        const loaded = await createImage(img.src);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("無法建立 QR image canvas");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(loaded, 0, 0, size, size);
        return canvas;
      }

      throw new Error("QR 生成失敗");
    } finally {
      wrap.remove();
    }
  }

  async function renderQrCenterAvatar(avatarUrl) {
    if (!el.qrCenterAvatar || !el.qrCenterAvatarImg) return;

    if (!avatarUrl) {
      hideQrCenterAvatar();
      return;
    }

    const ok = await loadImage(
      el.qrCenterAvatarImg,
      avatarUrl,
      buildDefaultAvatarSvg()
    );

    if (!ok) {
      hideQrCenterAvatar();
      return;
    }

    const ratioPercent = `${Math.round(QR_CONFIG.centerAvatarRatio * 100)}%`;

    el.qrCenterAvatar.style.width = ratioPercent;
    el.qrCenterAvatar.style.height = ratioPercent;
    el.qrCenterAvatar.style.aspectRatio = "1 / 1";
    el.qrCenterAvatar.style.position = "absolute";
    el.qrCenterAvatar.style.left = "50%";
    el.qrCenterAvatar.style.top = "50%";
    el.qrCenterAvatar.style.transform = "translate(-50%, -50%)";
    el.qrCenterAvatar.style.display = "flex";
    el.qrCenterAvatar.style.alignItems = "center";
    el.qrCenterAvatar.style.justifyContent = "center";
    el.qrCenterAvatar.style.overflow = "hidden";
    el.qrCenterAvatar.style.borderRadius = "999px";
    el.qrCenterAvatar.style.background = "#ffffff";
    el.qrCenterAvatar.style.boxSizing = "border-box";
    el.qrCenterAvatar.style.border = `${QR_CONFIG.centerAvatarBorder}px solid #ffffff`;
    el.qrCenterAvatar.style.zIndex = "3";

    el.qrCenterAvatarImg.style.display = "block";
    el.qrCenterAvatarImg.style.width = "100%";
    el.qrCenterAvatarImg.style.height = "100%";
    el.qrCenterAvatarImg.style.objectFit = "cover";
    el.qrCenterAvatarImg.style.borderRadius = "999px";

    el.qrCenterAvatar.classList.add("show");
  }

  function hideQrCenterAvatar() {
    if (!el.qrCenterAvatar || !el.qrCenterAvatarImg) return;
    el.qrCenterAvatar.classList.remove("show");
    el.qrCenterAvatarImg.removeAttribute("src");
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
    if (el.qrLinkFallback) {
      el.qrLinkFallback.classList.remove("show");
      el.qrLinkFallback.textContent = "";
    }
  }

  function onOpenCard() {
    if (!currentPosterQrUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }
    window.open(currentPosterQrUrl, "_blank", "noopener");
  }

  async function onCopyCardLink() {
    if (!currentPosterQrUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }
    const ok = await copyText(currentPosterQrUrl);
    setStatus(ok ? "名片連結已複製" : "複製失敗", !ok);
  }

  async function onShareCard() {
    const targetUrl = currentPosterQrUrl || currentProductCardUrl;
    if (!targetUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentItem?.name ? `${currentItem.name} 的智慧名片` : "我的智慧名片",
          text: "這是我的智慧名片，歡迎查看。",
          url: targetUrl
        });
        setStatus("已開啟分享");
        return;
      }

      const ok = await copyText(targetUrl);
      setStatus(ok ? "已改為複製名片連結" : "分享失敗", !ok);
    } catch (err) {
      if (err?.name === "AbortError") return;
      const ok = await copyText(targetUrl);
      setStatus(ok ? "已改為複製名片連結" : "分享失敗", !ok);
    }
  }

  function onRecommend() {
    if (!currentRecommendUrl) {
      setStatus("推薦連結尚未建立", true);
      return;
    }
    window.open(currentRecommendUrl, "_blank", "noopener");
  }

  function onOpenLineOA() {
    if (!lineOA) {
      setStatus("LINE 官方帳號連結未設定", true);
      return;
    }
    window.open(lineOA, "_blank", "noopener");
  }

  function openDialog() {
    if (!el.shareDialog) return;
    el.shareDialog.classList.add("show");
    el.shareDialog.setAttribute("aria-hidden", "false");
  }

  function closeDialog() {
    if (!el.shareDialog) return;
    el.shareDialog.classList.remove("show");
    el.shareDialog.setAttribute("aria-hidden", "true");
  }

  function setStatus(message, isError = false) {
    if (!el.statusText) return;
    el.statusText.textContent = message || "";
    el.statusText.classList.toggle("error", !!isError);
  }

  function text(v) {
    return String(v || "").trim();
  }

  function normalizeBase(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.endsWith("/") ? s : `${s}/`;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function loadImage(imgEl, src, fallback = "") {
    return new Promise((resolve) => {
      if (!imgEl) return resolve(false);

      let triedFallback = false;
      imgEl.onload = () => resolve(true);
      imgEl.onerror = () => {
        if (!triedFallback && fallback) {
          triedFallback = true;
          imgEl.src = fallback;
          return;
        }
        resolve(false);
      };
      imgEl.src = src;
    });
  }

  function createImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.src = src;
    });
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return legacyCopyText(value);
    } catch {
      return legacyCopyText(value);
    }
  }

  function legacyCopyText(value) {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }

  function buildDefaultAvatarSvg() {
    return "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
        <rect width="320" height="320" rx="160" fill="#eadfd4"/>
        <circle cx="160" cy="122" r="58" fill="#d0b8a3"/>
        <rect x="72" y="202" width="176" height="84" rx="42" fill="#d0b8a3"/>
      </svg>
    `);
  }

  function ensureDebugPanel() {
    if (document.getElementById("posterDebugPanel")) return;

    const panel = document.createElement("section");
    panel.id = "posterDebugPanel";
    panel.style.margin = "16px 0 0";
    panel.style.padding = "14px";
    panel.style.background = "#fffaf3";
    panel.style.border = "1px dashed rgba(154,106,68,.35)";
    panel.style.borderRadius = "18px";
    panel.style.fontSize = "12px";
    panel.style.lineHeight = "1.7";
    panel.style.color = "#433227";
    panel.innerHTML = `
      <div style="font-weight:900;margin-bottom:8px;">交付卡除錯面板</div>
      <pre id="posterDebugPre" style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;"></pre>
    `;

    const target =
      document.querySelector(".hero-body") ||
      document.body;

    target.appendChild(panel);
  }

  function renderDebug() {
    const pre = document.getElementById("posterDebugPre");
    if (!pre) return;

    pre.textContent = [
      `VERSION: ${debugState.version}`,
      ``,
      `REQUEST URL:`,
      `${debugState.requestUrl || "(尚未建立)"}`,
      ``,
      `HTTP STATUS:`,
      `${debugState.httpStatus || "(尚未收到)"}`,
      ``,
      `ERROR:`,
      `${debugState.error || "(無)"}`,
      ``,
      `RAW RESPONSE JSON:`,
      `${safeJson(debugState.rawResponse)}`,
      ``,
      `PARSED ITEM:`,
      `${safeJson(debugState.parsedItem)}`,
      ``,
      `BUILT VALUES:`,
      `${safeJson(debugState.built)}`
    ].join("\n");
  }

  function safeJson(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  function safeJsonPreview(obj) {
    try {
      return JSON.stringify(obj).slice(0, 500);
    } catch {
      return String(obj).slice(0, 500);
    }
  }
})();
