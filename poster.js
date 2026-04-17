/* ==========================================
 * HSC Delivery Card v1.3-fixed
 * COMPLETE OVERWRITE
 *
 * 修正重點：
 * 1. 名片狀態改讀 activated_at / expires_at
 * 2. 下載海報優先支援 wechat_poster / wechat_url / poster_url
 * 3. 服務快記改為完整參數送出
 * 4. 服務荷包支援 delivery_guidance / agent / item fallback
 * 5. 名片分享（不帶 ref）與專屬入口（帶 ref）分流
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "v1.3-fixed";

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

  const qs = new URLSearchParams(location.search);
  const id      = (qs.get("id")     || "").trim();
  const gas     = (qs.get("gas")    || DEFAULT_GAS).trim();
  const baseUrl = normalizeBase(qs.get("base") || DEFAULT_BASE);
  const lineOA  = (qs.get("lineoa") || DEFAULT_LINE_OA).trim();

  const el = {
    avatarImg: q("avatarImg"),
    cardName: q("cardName"),
    cardTitle: q("cardTitle"),
    qrViewport: q("qrViewport"),
    qrCenterAvatar: q("qrCenterAvatar"),
    qrCenterAvatarImg: q("qrCenterAvatarImg"),
    qrLinkFallback: q("qrLinkFallback"),
    qrBox: q("qrBox"),
    statusText: q("statusText"),

    openCardBtn: q("openCardBtn"),
    shareCardBtn: q("shareCardBtn"),
    downloadBtn: q("downloadBtn"),
    updateEntryBtn: q("updateEntryBtn"),
    renewalBtn: q("renewalBtn"),

    walletAccordion: q("walletAccordion"),
    walletToggle: q("walletToggle"),
    walletTitle: q("walletTitle"),
    walletHint: q("walletHint"),
    walletNavHint: q("walletNavHint"),
    upgradeHintBar: q("upgradeHintBar"),
    upgradeHintText: q("upgradeHintText"),

    serviceLogBlock: q("serviceLogBlock"),
    logServiceBtn: q("logServiceBtn"),
    serviceLogsViewBlock: q("serviceLogsViewBlock"),
    viewServiceLogsBtn: q("viewServiceLogsBtn"),
    walletStatsBlock: q("walletStatsBlock"),
    statReferralCount: q("statReferralCount"),
    statRewardPoints: q("statRewardPoints"),
    statConvertedCount: q("statConvertedCount"),
    partnerEarningsBlock: q("partnerEarningsBlock"),
    statCommissionMonthly: q("statCommissionMonthly"),
    statCommissionTotal: q("statCommissionTotal"),

    referralEntryBlock: q("referralEntryBlock"),
    referralLinkDisplay: q("referralLinkDisplay"),
    copyReferralLinkBtn: q("copyReferralLinkBtn"),
    shareReferralBtn: q("shareReferralBtn"),
    openCollabBtn: q("openCollabBtn"),

    statusCardId: q("statusCardId"),
    statusBadge: q("statusBadge"),
    statusStartDate: q("statusStartDate"),
    statusExpireDate: q("statusExpireDate"),

    lineOABtn: q("lineOABtn"),

    statusViewCount:      q("statusViewCount"),
    expireCountdownItem:  q("expireCountdownItem"),
    statusExpireCountdown: q("statusExpireCountdown"),
    updateRenewalSection: q("updateRenewalSection"),
    updateStatusBadge:    q("updateStatusBadge"),
    updateStatusBody:     q("updateStatusBody"),
    goUpdateBtn:          q("goUpdateBtn"),
    renewalCard:          q("renewalCard"),
    renewalUrgencyDot:    q("renewalUrgencyDot"),
    renewalCardTitle:     q("renewalCardTitle"),
    renewalCardBody:      q("renewalCardBody"),
    goRenewalBtn:         q("goRenewalBtn"),
    askRenewalBtn:        q("askRenewalBtn"),
    updateFullDialog:     q("updateFullDialog"),
    updateFullLineBtn:    q("updateFullLineBtn"),
    updateFullCloseBtn:   q("updateFullCloseBtn"),
    cardLinkDisplay:      q("cardLinkDisplay"),
    copyCardLinkBtn2:     q("copyCardLinkBtn2"),
    shareCardLinkBtn2:    q("shareCardLinkBtn2"),
    refLinkTrialNote:     q("refLinkTrialNote"),
    refLinkFullNote:      q("refLinkFullNote"),
    refLinkDisplay:       q("refLinkDisplay"),
    refLinkBtnRow:        q("refLinkBtnRow"),
    refLinkMissingNote:   q("refLinkMissingNote"),
    copyRefLinkBtn2:      q("copyRefLinkBtn2"),
    shareRefLinkBtn2:     q("shareRefLinkBtn2"),

    collabDialog: q("collabDialog"),
    collabDialogCloseBtn: q("collabDialogCloseBtn"),
    shareCardDialog: q("shareCardDialog"),
    shareCardLinkDisplay: q("shareCardLinkDisplay"),
    shareCardCopyBtn: q("shareCardCopyBtn"),
    shareCardDialogCloseBtn: q("shareCardDialogCloseBtn"),
    serviceLogDialog: q("serviceLogDialog"),
    serviceTypeChips: q("serviceTypeChips"),
    serviceLogNote: q("serviceLogNote"),
    serviceLogStatus: q("serviceLogStatus"),
    serviceLogSubmitBtn: q("serviceLogSubmitBtn"),
    serviceLogCancelBtn: q("serviceLogCancelBtn")
  };

  let rawPayload = null;
  let currentItem = null;
  let currentWallet = null;
  let currentCardUrl = "";
  let currentRefUrl = "";
  let currentUpdateUrl = "";
  let currentRenewalUrl = "";
  let currentPosterUrl = "";
  let selectedServiceType = "";

  bindEvents();
  init();

  async function init() {
    try {
      if (!id) throw new Error("缺少名片 id");
      if (typeof window.QRCode === "undefined") throw new Error("缺少 qrcode.min.js");

      setStatus("正在載入…", false);

      rawPayload = await fetchCard(id);
      currentItem = rawPayload.card;

      currentCardUrl = buildCardUrl(currentItem);
      currentRefUrl = buildRefUrl(rawPayload, currentItem);
      currentUpdateUrl = resolveUpdateUrl(rawPayload, currentItem);
      currentRenewalUrl = resolveRenewalUrl(rawPayload, currentItem);
      currentPosterUrl = resolvePosterUrl(rawPayload, currentItem);
      currentWallet = buildWalletData(rawPayload, currentItem);

      renderPoster(currentItem);
      renderCardStatus(currentItem);
      renderViewCount(currentItem);
      renderExpireCountdown(currentItem);
      renderUpdateAndRenewal(currentItem, rawPayload);
      renderWallet(currentWallet);

      await renderQrLocal(currentCardUrl);
      await renderQrCenterAvatar(getAvatarUrl(currentItem));

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

  async function fetchCard(cardId) {
    const url = `${gas}?action=getCard&id=${encodeURIComponent(cardId)}&_=${Date.now()}`;
    const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`讀取失敗（HTTP ${res.status}）`);

    let raw;
    try {
      raw = await res.json();
    } catch {
      throw new Error("資料格式不正確");
    }

    const card = raw?.card || raw?.item || raw?.data || raw;
    if (!card || typeof card !== "object") throw new Error("名片資料格式不正確");

    return {
      raw,
      card,
      delivery_guidance: raw?.delivery_guidance || {},
      tracking_context: raw?.tracking_context || {},
      tracking: raw?.tracking || {}
    };
  }

  async function callGas(params) {
    const url = new URL(gas);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, String(v));
      }
    });
    url.searchParams.set("_", Date.now());

    const res = await fetch(url.toString(), { method: "GET", mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`操作失敗（HTTP ${res.status}）`);

    const json = await res.json();
    if (json && json.ok === false) throw new Error(json.error || "操作失敗");
    return json;
  }

  function bindEvents() {
    el.openCardBtn?.addEventListener("click", onOpenCard);
    el.shareCardBtn?.addEventListener("click", onShareCard);
    el.downloadBtn?.addEventListener("click", onDownloadPoster);
    el.updateEntryBtn?.addEventListener("click", onOpenUpdate);
    el.renewalBtn?.addEventListener("click", onOpenRenewal);

    el.qrBox?.addEventListener("click", () => {
      if (currentCardUrl) window.open(currentCardUrl, "_blank", "noopener");
    });

    el.walletToggle?.addEventListener("click", toggleWallet);
    el.logServiceBtn?.addEventListener("click", () => openDialog(el.serviceLogDialog));
    el.viewServiceLogsBtn?.addEventListener("click", onViewServiceLogs);
    el.copyReferralLinkBtn?.addEventListener("click", onCopyReferralLink);
    el.shareReferralBtn?.addEventListener("click", onShareReferral);
    el.openCollabBtn?.addEventListener("click", () => openDialog(el.collabDialog));

    el.lineOABtn?.addEventListener("click", () => openUrl(lineOA));

    el.collabDialogCloseBtn?.addEventListener("click", () => closeDialog(el.collabDialog));
    el.collabDialog?.addEventListener("click", (e) => {
      if (e.target === el.collabDialog) closeDialog(el.collabDialog);
    });

    el.shareCardCopyBtn?.addEventListener("click", onCopyCardLink);
    el.shareCardDialogCloseBtn?.addEventListener("click", () => closeDialog(el.shareCardDialog));
    el.shareCardDialog?.addEventListener("click", (e) => {
      if (e.target === el.shareCardDialog) closeDialog(el.shareCardDialog);
    });

    el.serviceTypeChips?.addEventListener("click", onServiceChipClick);
    el.serviceLogSubmitBtn?.addEventListener("click", onServiceLogSubmit);
    el.serviceLogCancelBtn?.addEventListener("click", () => closeDialog(el.serviceLogDialog));
    el.serviceLogDialog?.addEventListener("click", (e) => {
      if (e.target === el.serviceLogDialog) closeDialog(el.serviceLogDialog);
    });

    bindAllNewEvents();

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDialog(el.collabDialog);
        closeDialog(el.shareCardDialog);
        closeDialog(el.serviceLogDialog);
      }
    });
  }

  function renderPoster(item) {
    const name  = txt(item?.name)  || txt(item?.id) || "我的智慧名片";
    const title = txt(item?.title) || txt(item?.unit) || txt(item?.slogan) || "";

    setText(el.cardName, name);
    setText(el.cardTitle, title);

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

  function renderCardStatus(item) {
    setText(el.statusCardId, txt(item?.id) || "--");

    const raw = txt(item?.status).toLowerCase();
    let badgeClass = "active";
    let badgeText = "正常使用中";

    if (["pending", "preparing"].includes(raw)) {
      badgeClass = "preparing";
      badgeText = "準備中";
    } else if (["inactive", "locked", "disabled", "expired", "paused", "suspended"].includes(raw)) {
      badgeClass = "paused";
      badgeText = "暫時休息中";
    }

    if (el.statusBadge) {
      el.statusBadge.textContent = badgeText;
      el.statusBadge.className = `status-badge ${badgeClass}`;
    }

    setText(el.statusStartDate, fmtDate(item?.activated_at || item?.created_at) || "--");
    setText(el.statusExpireDate, fmtDate(item?.expires_at || item?.expired_at) || "--");
  }

  function renderWallet(wallet) {
    var mode      = resolveWalletMode(wallet);
    var isTrial   = mode === "trial";
    var isPartner = mode === "partner";

    setText(q("walletTitle"), isTrial ? "服務荷包（體驗中）" : "服務荷包");
    setText(q("walletHint"),  isTrial
      ? "分享連結，讓更多人認識你，同時累積點數"
      : "分享、推薦、成果，都在這裡");

    show(q("walletNavHint"), !isTrial);

    var cardLink = currentCardUrl || "";
    setText(q("cardLinkDisplay"), cardLink || "連結尚未建立");
    _setLinkBtns("copyCardLinkBtn2", "shareCardLinkBtn2", !!cardLink);

    var agentId    = txt(wallet?.agent_id);
    var backendRef = txt(wallet?.referral_link)
                  || txt(currentItem?.referral_link)
                  || txt(rawPayload?.delivery_guidance?.referral_link);
    var refUrl = backendRef || (agentId ? buildUrl("index.html", { ref: agentId }) : "");
    if (refUrl) currentRefUrl = refUrl;

    var hasRef = !!refUrl;
    setText(q("refLinkDisplay"), hasRef ? refUrl : "");
    show(q("refLinkDisplay"),     hasRef);
    show(q("refLinkBtnRow"),      hasRef);
    show(q("refLinkMissingNote"), !hasRef);
    _setLinkBtns("copyRefLinkBtn2", "shareRefLinkBtn2", hasRef);

    show(q("refLinkTrialNote"), isTrial);
    show(q("refLinkFullNote"),  !isTrial);

    show(q("trialProgressBlock"), isTrial);
    if (isTrial) {
      var pts       = toNum(wallet?.points_lifetime, 0);
      var remaining = Math.max(0, 5 - pts);
      var pct       = Math.min(100, Math.round((pts / 5) * 100));
      setText(q("trialPtsNow"), String(pts));
      var fill = q("trialProgressFill");
      if (fill) fill.style.width = pct + "%";
      setText(q("trialProgressCaption"), remaining > 0
        ? "再推薦 " + remaining + " 位朋友建卡，就能升級推薦代理"
        : "已達 5 點！請聯繫客服升級為推薦代理");
    }

    show(q("walletStatsBlock"),     !isTrial);
    show(q("partnerEarningsBlock"), isPartner);
    show(q("serviceLogBlock"),      !isTrial);
    show(q("serviceLogsViewBlock"), !isTrial);

    setText(q("statReferralCount"),     fmtInt(toNum(wallet?.referral_count, 0)));
    setText(q("statRewardPoints"),      fmtInt(toNum(wallet?.points_lifetime, 0)));
    setText(q("statConvertedCount"),    fmtInt(toNum(wallet?.converted_count, 0)));
    setText(q("statCommissionMonthly"), fmtInt(toNum(wallet?.commission_monthly, 0)));
    setText(q("statCommissionTotal"),   fmtInt(toNum(wallet?.commission_total, 0)));
  }

  function _setLinkBtns(copyId, shareId, enabled) {
    var c = q(copyId), s = q(shareId);
    [c, s].forEach(function (btn) {
      if (!btn) return;
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? "" : "0.5";
    });
  }

  function buildWalletData(payload, item) {
    const dg = payload?.delivery_guidance || {};
    const nested = item?.agent || item?.agent_info || item?.delivery_agent || {};

    const pointsLifetime =
      toNum(nested?.points_lifetime, NaN);
    const pointsFromGuidance =
      toNum(dg?.points_lifetime, NaN);

    const wallet = {
      wallet_mode: txt(nested?.wallet_mode || item?.wallet_mode),
      agent_type: txt(nested?.agent_type || item?.agent_type),
      agent_id: txt(nested?.agent_id || item?.agent_id || item?.service_agent || item?.owner_agent_id),
      referral_link: txt(nested?.referral_link || item?.referral_link),
      referral_count: toNum(nested?.referral_count ?? item?.referral_count, 0),
      converted_count: toNum(nested?.converted_count ?? item?.converted_count, 0),
      commission_monthly: toNum(nested?.commission_monthly ?? item?.commission_monthly, 0),
      commission_total: toNum(nested?.commission_total ?? item?.commission_total, 0),
      member_tier: txt(dg?.member_tier || nested?.member_tier || item?.member_tier),
      points_lifetime: Number.isFinite(pointsLifetime)
        ? pointsLifetime
        : (Number.isFinite(pointsFromGuidance) ? pointsFromGuidance : toNum(item?.points_lifetime, 0)),
      upgrade_hint: txt(dg?.upgrade_hint),
      points_rule: txt(dg?.points_rule),
      commission_rule: txt(dg?.commission_rule),
      upgrade_rule: txt(dg?.upgrade_rule),
      remaining_points_to_next_tier: toNum(dg?.remaining_points_to_next_tier, 5)
    };

    return wallet;
  }

  function resolveWalletMode(wallet) {
    const backendMode = txt(wallet?.wallet_mode).toLowerCase();
    if (["trial", "referral", "partner"].includes(backendMode)) return backendMode;

    const agentType = txt(wallet?.agent_type).toLowerCase();
    if (agentType === "partner") return "partner";
    if (agentType === "referral") return "referral";

    const tier = txt(wallet?.member_tier).toLowerCase();
    if (tier === "partner") return "partner";
    if (tier === "referral" || tier === "silver") return "referral";

    const pts = toNum(wallet?.points_lifetime, 0);
    if (pts >= 5) return "referral";

    return "trial";
  }

  function toggleWallet() {
    const isOpen = el.walletAccordion.classList.toggle("open");
    el.walletToggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

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
      hideQrCenterAvatar();
      return;
    }

    const ok = await loadImg(el.qrCenterAvatarImg, avatarUrl, defaultAvatarSvg());
    if (!ok) {
      hideQrCenterAvatar();
      return;
    }

    const pct = `${Math.round(QR_CONFIG.centerAvatarRatio * 100)}%`;
    Object.assign(el.qrCenterAvatar.style, {
      width: pct,
      height: pct,
      aspectRatio: "1/1",
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%,-50%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: "999px",
      background: "#fff",
      boxSizing: "border-box",
      border: `${QR_CONFIG.centerAvatarBorder}px solid #fff`,
      zIndex: "3"
    });

    Object.assign(el.qrCenterAvatarImg.style, {
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      borderRadius: "999px"
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
    if (el.qrLinkFallback) {
      el.qrLinkFallback.classList.remove("show");
      el.qrLinkFallback.textContent = "";
    }
  }

  async function buildQrCanvas(targetUrl, size) {
    const quietPx = Math.round(size * QR_CONFIG.quietZoneRatio);
    const innerSize = size - quietPx * 2;

    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position:"fixed",
      left:"-99999px",
      top:"-99999px",
      pointerEvents:"none",
      opacity:"0",
      width:`${innerSize}px`,
      height:`${innerSize}px`,
      overflow:"hidden"
    });
    document.body.appendChild(wrap);

    try {
      new window.QRCode(wrap, {
        text: targetUrl,
        width: innerSize,
        height: innerSize,
        colorDark: QR_CONFIG.dark,
        colorLight: QR_CONFIG.light,
        correctLevel: window.QRCode.CorrectLevel[QR_CONFIG.correctLevel] || window.QRCode.CorrectLevel.H
      });

      await wait(260);

      const inner = document.createElement("canvas");
      inner.width = innerSize;
      inner.height = innerSize;
      const ic = inner.getContext("2d");
      ic.fillStyle = "#fff";
      ic.fillRect(0, 0, innerSize, innerSize);

      const srcCanvas = wrap.querySelector("canvas");
      if (srcCanvas) {
        ic.drawImage(srcCanvas, 0, 0, innerSize, innerSize);
      } else {
        const img = wrap.querySelector("img");
        if (img?.src) {
          const loaded = await makeImage(img.src);
          ic.drawImage(loaded, 0, 0, innerSize, innerSize);
        } else {
          throw new Error("QR 生成失敗");
        }
      }

      const final = document.createElement("canvas");
      final.width = size;
      final.height = size;
      const fc = final.getContext("2d");
      fc.fillStyle = "#fff";
      fc.fillRect(0, 0, size, size);
      fc.drawImage(inner, quietPx, quietPx, innerSize, innerSize);
      return final;
    } finally {
      wrap.remove();
    }
  }

  function buildCardUrl(item) {
    return buildUrl("index.html", { id: txt(item?.id) || id });
  }

  function buildRefUrl(payload, item) {
    const backendLink =
      txt(item?.referral_link) ||
      txt(item?.agent?.referral_link) ||
      txt(payload?.delivery_guidance?.referral_link);

    if (backendLink) return backendLink;

    const agentId =
      txt(item?.agent_id) ||
      txt(item?.service_agent) ||
      txt(item?.owner_agent_id) ||
      txt(item?.referrer);

    if (!agentId) return "";

    return buildUrl("", { ref: agentId });
  }

  function resolveUpdateUrl(payload, item) {
    return (
      txt(item?.update_link) ||
      txt(item?.update_url) ||
      txt(item?.update_form_url) ||
      txt(payload?.raw?.update_link) ||
      ""
    );
  }

  function resolveRenewalUrl(payload, item) {
    return (
      txt(item?.renewal_link) ||
      txt(item?.renewal_url) ||
      txt(payload?.raw?.renewal_link) ||
      ""
    );
  }

  function resolvePosterUrl(payload, item) {
    return (
      txt(item?.wechat_poster) ||
      txt(item?.poster_url) ||
      txt(item?.wechat_url) ||
      txt(item?.poster_img) ||
      txt(item?.wechat_img) ||
      txt(payload?.raw?.wechat_poster) ||
      ""
    );
  }

  function buildUrl(path, params) {
    const url = new URL(path || ".", baseUrl);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, String(v));
      }
    });
    return url.toString();
  }

  function onOpenCard() {
    if (!currentCardUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }
    window.open(currentCardUrl, "_blank", "noopener");
  }

  function onShareCard() {
    setText(el.shareCardLinkDisplay, currentCardUrl || "連結尚未建立");

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

  async function onCopyCardLink() {
    if (!currentCardUrl) {
      setStatus("名片連結尚未建立", true);
      return;
    }

    const ok = await copyText(currentCardUrl);
    setStatus(ok ? "名片連結已複製" : "複製失敗", !ok);
    if (ok) closeDialog(el.shareCardDialog);
    clearStatusSoon();
  }

  async function onDownloadPoster() {
    if (currentPosterUrl) {
      window.open(currentPosterUrl, "_blank", "noopener");
      setStatus("海報已開啟，長按圖片即可保存", false);
      clearStatusSoon();
      return;
    }
    if (el.downloadBtn) el.downloadBtn.classList.add("loading");
    disableBtn(el.downloadBtn, true);
    setStatus("正在準備海報…", false);
    try {
      await waitForFonts();
      var dataUrl = await buildPosterCanvas();
      openPosterPage(dataUrl, currentItem?.name || currentItem?.id || "smart-card");
      setStatus("");
    } catch (err) {
      console.error("[HSC] download:", err);
      setStatus("海報產生失敗，請稍後再試", true);
      clearStatusSoon();
    } finally {
      if (el.downloadBtn) el.downloadBtn.classList.remove("loading");
      disableBtn(el.downloadBtn, false);
    }
  }

  async function buildPosterCanvas() {
    if (!currentCardUrl) throw new Error("名片連結尚未建立");

    const POSTER_QR = 880;
    const qrCanvas  = await buildQrCanvas(currentCardUrl, POSTER_QR);

    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法建立畫布");

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

    roundRectFill(ctx, 66, 74, W-132, H-148, 44, (() => {
      const g = ctx.createLinearGradient(0, 74, 0, H-74);
      g.addColorStop(0, "rgba(255,253,250,.98)");
      g.addColorStop(1, "rgba(255,248,241,.98)");
      return g;
    })());
    ctx.strokeStyle = "rgba(102,78,57,.09)";
    ctx.lineWidth = 2;
    ctx.stroke();

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

    const pillW = 420, pillH = 64, pillX = (W-pillW)/2, pillY = 312;
    roundRectFill(ctx, pillX, pillY, pillW, pillH, 999, (() => {
      const g = ctx.createLinearGradient(0, pillY, 0, pillY+pillH);
      g.addColorStop(0, "#fffefb");
      g.addColorStop(1, "#fbf3e9");
      return g;
    })());
    ctx.strokeStyle = "rgba(191,135,87,.13)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "900 24px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#9a6a44";
    ctx.fillText("一張名片，讓你被看見，也慢慢被懂得", W/2, pillY + pillH/2 + 1);

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
      } catch (_) {}
    }

    const name  = txt(currentItem?.name)  || txt(currentItem?.id) || "我的智慧名片";
    const title = txt(currentItem?.title) || txt(currentItem?.unit) || txt(currentItem?.slogan) || "";

    const nameY = avatarY + avatarR + 54;
    ctx.font = "900 56px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#433227";
    ctx.fillText(name, W/2, nameY);

    if (title) {
      ctx.font = "500 30px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
      ctx.fillStyle = "#6b5a4d";
      const lines = wrapText(ctx, title, W-280, 30);
      let ty = nameY + 60;
      lines.slice(0, 2).forEach((line) => {
        ctx.fillText(line, W/2, ty);
        ty += 46;
      });
    }

    const qrFrameX = 155, qrFrameY = 730, qrFrameW = 770, qrFrameH = 770;
    roundRectFill(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, 38, "#ffffff");
    ctx.strokeStyle = "rgba(0,0,0,.035)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const qrPad = 44;
    ctx.drawImage(qrCanvas, qrFrameX + qrPad, qrFrameY + qrPad, qrFrameW - qrPad*2, qrFrameH - qrPad*2);

    ctx.font = "800 28px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#6b5a4d";
    ctx.fillText("掃一下，帶你認識我", W/2, 1590);

    ctx.font = "500 22px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    ctx.fillStyle = "#8d7d70";
    ctx.fillText("存到手機，分享更方便 ✦ 長按圖片即可保存", W/2, 1680);

    return canvas.toDataURL("image/png", 0.96);
  }

  function openPosterPage(dataUrl, nameHint) {
    const safeName = String(nameHint || "poster")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
    const filename = `${safeName}-poster.png`;

    document.open();
    document.write(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${escHtml(filename)}</title>
  <style>
    html,body{margin:0;padding:0;background:#111;min-height:100%;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;}
    .wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px 28px;gap:18px;}
    .tip{text-align:center;color:rgba(255,255,255,.85);font-size:15px;line-height:1.8;}
    .tip strong{color:#e8c18a;}
    img{max-width:min(100%,480px);height:auto;display:block;border-radius:18px;box-shadow:0 16px 40px rgba(0,0,0,.45);background:#fff;}
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
    const link = currentRefUrl || "";
    if (!link) {
      setStatus("專屬入口尚未建立", true);
      clearStatusSoon();
      return;
    }

    const ok = await copyText(link);
    setStatus(ok ? "專屬入口已複製" : "複製失敗", !ok);
    clearStatusSoon();
  }

  async function onShareReferral() {
    const link = currentRefUrl || "";
    if (!link) {
      setStatus("專屬入口尚未建立", true);
      clearStatusSoon();
      return;
    }

    const name = txt(currentItem?.name) || "我";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} 的專屬入口`,
          text: "朋友從這裡進來，你的推薦與服務會被記錄。",
          url: link
        });
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
    const agentId = txt(currentWallet?.agent_id);
    const params = { action: "getServiceLogs", card_id: id };
    if (agentId) params.agent_id = agentId;
    window.open(buildGasUrl(params), "_blank", "noopener");
  }

  function onServiceChipClick(e) {
    const btn = e.target.closest(".service-chip");
    if (!btn) return;

    selectedServiceType = btn.dataset.type || "";

    el.serviceTypeChips?.querySelectorAll(".service-chip").forEach((chip) => {
      chip.classList.toggle("active", chip === btn);
    });
  }

  async function onServiceLogSubmit() {
    const agentId = txt(currentWallet?.agent_id);

    if (!selectedServiceType) {
      setText(el.serviceLogStatus, "請先選擇服務類型");
      return;
    }

    if (!agentId) {
      setText(el.serviceLogStatus, "目前尚未開通代理身份，暫時不能記錄服務");
      return;
    }

    disableBtn(el.serviceLogSubmitBtn, true);
    setText(el.serviceLogStatus, "記錄中…");

    try {
      await callGas({
        action: "createServiceLog",
        card_id: id,
        agent_id: agentId,
        service_type: selectedServiceType,
        service_date: new Date().toISOString(),
        related_payment_type: "",
        evidence_type: "text",
        evidence_ref: txt(el.serviceLogNote?.value) || ""
      });

      setText(el.serviceLogStatus, "✓ 已幫你記下來");
      setTimeout(() => {
        closeDialog(el.serviceLogDialog);
        resetServiceLog();
      }, 1200);
    } catch (err) {
      setText(el.serviceLogStatus, `記錄失敗：${err.message}`);
      disableBtn(el.serviceLogSubmitBtn, false);
    }
  }

  function resetServiceLog() {
    selectedServiceType = "";
    if (el.serviceLogNote) el.serviceLogNote.value = "";
    setText(el.serviceLogStatus, "");
    el.serviceTypeChips?.querySelectorAll(".service-chip").forEach((chip) => chip.classList.remove("active"));
    disableBtn(el.serviceLogSubmitBtn, false);
  }

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

  function q(id_) { return document.getElementById(id_); }
  function txt(v) { return String(v || "").trim(); }

  function show(node, visible) {
    if (!node) return;
    node.classList.toggle("hidden", !visible);
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function toNum(v, fallback = 0) {
    if (v === null || v === undefined || String(v).trim() === "") return fallback;
    const n = Number(String(v).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : fallback;
  }

  function fmtInt(n) {
    return Number(n || 0).toLocaleString("zh-TW");
  }

  function fmtDate(v) {
    const s = txt(v);
    if (!s || s === "0" || s === "undefined") return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
    } catch {
      return s;
    }
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
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, String(v));
      }
    });
    return url.toString();
  }

  function openUrl(url, fallbackMsg = "") {
    if (url) {
      window.open(url, "_blank", "noopener");
      return;
    }
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
    btn.style.cursor = disabled ? "wait" : "";
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return legacyCopy(value);
    } catch {
      return legacyCopy(value);
    }
  }

  function legacyCopy(value) {
    try {
      const ta = Object.assign(document.createElement("textarea"), {
        value,
        readOnly: true
      });
      Object.assign(ta.style, { position: "fixed", top: "-9999px", opacity: "0" });
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

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function waitForFonts() {
    return document.fonts?.ready?.catch?.(() => {}) || Promise.resolve();
  }

  function loadImg(imgEl, src, fallback = "") {
    return new Promise((resolve) => {
      if (!imgEl) return resolve(false);

      let tried = false;
      imgEl.onload = () => resolve(true);
      imgEl.onerror = () => {
        if (!tried && fallback) {
          tried = true;
          imgEl.src = fallback;
          return;
        }
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

  async function makeImageWithFallback(src, fallback) {
    try {
      return await makeImage(src);
    } catch {
      return await makeImage(fallback);
    }
  }

  function wrapText(ctx, text, maxWidth, fontSize) {
    const chars = Array.from(String(text || ""));
    const lines = [];
    let line = "";
    ctx.font = `500 ${fontSize}px 'Noto Sans TC','Microsoft JhengHei',sans-serif`;

    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }

    if (line) lines.push(line);
    return lines;
  }

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

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
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

  function renderViewCount(item) {
    var el_vc = q("statusViewCount");
    if (!el_vc) return;
    var count = toNum(item?.view_count, 0);
    if (count === 0) {
      el_vc.textContent = "尚無紀錄";
      el_vc.style.color = "";
    } else {
      el_vc.textContent = fmtInt(count) + " 次";
      el_vc.style.color = count >= 50 ? "var(--gold-deep)" : "";
      el_vc.style.fontWeight = count >= 50 ? "900" : "";
    }
  }

  function renderExpireCountdown(item) {
    var expiresAt     = txt(item?.expires_at);
    var countdownWrap = q("expireCountdownItem");
    var countdownEl   = q("statusExpireCountdown");
    var expireDateEl  = q("statusExpireDate");
    if (!countdownWrap || !countdownEl || !expiresAt) return;
    var expDate  = new Date(expiresAt);
    if (isNaN(expDate.getTime())) return;
    var now     = new Date();
    var diffDay = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);
    if (diffDay > 60) { countdownWrap.classList.add("hidden"); return; }
    countdownWrap.classList.remove("hidden");
    var isUrgent  = diffDay <= 30;
    var isExpired = diffDay <= 0;
    var color = isExpired ? "#b05a3d" : isUrgent ? "#c85a3a" : "var(--gold-deep)";
    var label = isExpired ? "已到期" : "還有 " + diffDay + " 天";
    countdownEl.textContent     = label;
    countdownEl.style.color     = color;
    countdownEl.style.fontWeight = "900";
    if (expireDateEl && isUrgent) expireDateEl.style.color = color;
  }

  function renderUpdateAndRenewal(item, payload) {
    var section = q("updateRenewalSection");
    if (!section || !item) return;
    section.classList.remove("hidden");

    var badge  = q("updateStatusBadge");
    var body   = q("updateStatusBody");
    var goBtn  = q("goUpdateBtn");

    var elig       = payload?.raw?.update_eligibility || {};
    var mode       = txt(elig?.update_mode || "");
    var freeRemain = toNum(elig?.remaining_free_updates, -1);
    var freeTotal  = toNum(elig?.free_update_limit_yearly, 3);
    var freeUsed   = toNum(elig?.used_update_count_yearly, 0);

    var isUnlimitedCard = txt(item?.update_limit_override_enabled) === "TRUE"
                          && txt(item?.update_limit_override_value) === "-1";
    if (!mode) {
      if (isUnlimitedCard) {
        mode = "unlimited";
      } else {
        if (freeRemain < 0) { freeRemain = 3; freeUsed = 0; }
        mode = freeRemain > 0 ? "quota" : "none";
      }
    }

    var expiresAt = txt(item?.expires_at);
    var expDate   = expiresAt ? new Date(expiresAt) : null;
    var now       = new Date();

    if (mode === "unlimited") {
      if (badge) { badge.textContent = "無限更新"; badge.className = "update-status-badge unlimited"; }
      var expStr = (expDate && !isNaN(expDate.getTime()))
        ? "到期日 <strong>" + fmtDate(expiresAt) + "</strong> 前有效"
        : "效期內有效";
      if (body) body.innerHTML = "已購買無限更新，" + expStr + "，更新不另收費。";
      if (expDate && !isNaN(expDate.getTime())) {
        var dLeft = Math.ceil((expDate - now) / 86400000);
        if (dLeft > 0 && dLeft <= 60) {
          var dColor = dLeft <= 30 ? "#c85a3a" : "var(--gold-deep)";
          if (body) body.innerHTML +=
            "<div style='margin-top:6px;font-size:12px;color:var(--muted)'>還有 <strong style='color:" +
            dColor + "'>" + dLeft + " 天</strong> 到期</div>";
        }
      }
      if (goBtn) { goBtn.style.display = ""; goBtn.onclick = null; goBtn.textContent = "更新名片內容"; }
    } else if (mode === "quota" || freeRemain > 0) {
      var remain = freeRemain >= 0 ? freeRemain : 3;
      var total  = freeTotal  >= 1 ? freeTotal  : 3;
      var used   = freeUsed   >= 0 ? freeUsed   : (total - remain);
      var pct    = total > 0 ? Math.round((remain / total) * 100) : 0;
      if (badge) { badge.textContent = "剩 " + remain + " / " + total + " 次"; badge.className = "update-status-badge has-quota"; }
      if (body)  body.innerHTML =
        "每年 <strong>" + total + " 次</strong> 免費更新，已使用 " + used + " 次。" +
        "<div class='update-progress-wrap'><div class='update-progress-fill' style='width:" + pct + "%'></div></div>";
      if (goBtn) { goBtn.style.display = ""; goBtn.onclick = null; goBtn.textContent = "更新名片內容"; }
    } else {
      if (badge) { badge.textContent = "次數已用完"; badge.className = "update-status-badge no-quota"; }
      if (body)  body.innerHTML =
        "今年免費更新次數已全部使用。" +
        "<div style='margin-top:6px;font-size:12px;color:var(--muted)'>需付費 NT$300，由客服協助開通。</div>";
      if (goBtn) {
        goBtn.textContent  = "需付費，聯繫客服開通";
        goBtn.style.display = "";
        goBtn.onclick = function () { openDialog(q("updateFullDialog")); };
      }
    }

    var renewalCard = q("renewalCard");
    if (!renewalCard || !expDate || isNaN(expDate.getTime())) return;
    var daysLeft = Math.ceil((expDate - now) / 86400000);
    if (daysLeft > 60) { renewalCard.classList.add("hidden"); return; }
    renewalCard.classList.remove("hidden");

    var dot       = q("renewalUrgencyDot");
    var cardTitle = q("renewalCardTitle");
    var cardBody  = q("renewalCardBody");
    var isExpired = daysLeft <= 0;
    var isUrgent  = daysLeft <= 30;

    if (dot) dot.classList.toggle("urgent", isUrgent || isExpired);
    renewalCard.classList.toggle("urgent", isUrgent || isExpired);

    if (isExpired) {
      setText(cardTitle, "名片已到期");
      if (cardBody) cardBody.innerHTML =
        "名片已到期，目前可能無法正常顯示。<br><strong style='color:#9a3e22'>請盡快續約</strong>，恢復正常使用。";
    } else if (isUrgent) {
      setText(cardTitle, "名片即將到期（" + daysLeft + " 天後）");
      if (cardBody) cardBody.innerHTML =
        "效期到 <strong>" + fmtDate(expiresAt) + "</strong>，還有 <strong style='color:#9a3e22'>" +
        daysLeft + " 天</strong>。<br>建議現在續約，無縫接續使用。";
    } else {
      setText(cardTitle, "效期提醒");
      if (cardBody) cardBody.innerHTML =
        "名片效期到 <strong>" + fmtDate(expiresAt) + "</strong>，還有 <strong style='color:var(--gold-deep)'>" +
        daysLeft + " 天</strong>。";
    }
  }

  function bindAllNewEvents() {
    q("copyCardLinkBtn2")?.addEventListener("click", async function () {
      if (!currentCardUrl) { setStatus("名片連結尚未建立", true); return; }
      var ok = await copyText(currentCardUrl);
      setStatus(ok ? "名片連結已複製" : "複製失敗", !ok);
      clearStatusSoon();
    });
    q("shareCardLinkBtn2")?.addEventListener("click", function () {
      _nativeShare(currentCardUrl, txt(currentItem?.name) + " 的智慧名片",
        "這是我的智慧名片，歡迎認識我。", "名片連結已複製");
    });
    q("copyRefLinkBtn2")?.addEventListener("click", async function () {
      if (!currentRefUrl) { setStatus("推薦連結尚未建立", true); return; }
      var ok = await copyText(currentRefUrl);
      setStatus(ok ? "推薦連結已複製" : "複製失敗", !ok);
      clearStatusSoon();
    });
    q("shareRefLinkBtn2")?.addEventListener("click", function () {
      _nativeShare(currentRefUrl, txt(currentItem?.name) + " 的推薦連結",
        "朋友從這裡進來建卡，推薦會自動記錄。", "推薦連結已複製");
    });
    q("goUpdateBtn")?.addEventListener("click", function () {
      if (this.onclick) return;
      onOpenUpdate();
    });
    q("goRenewalBtn")?.addEventListener("click", function () {
      if (currentRenewalUrl) window.open(currentRenewalUrl, "_blank", "noopener");
      else openUrl(lineOA);
    });
    q("askRenewalBtn")?.addEventListener("click", function () { openUrl(lineOA); });
    q("updateFullLineBtn")?.addEventListener("click", function () {
      closeDialog(q("updateFullDialog")); openUrl(lineOA);
    });
    q("updateFullCloseBtn")?.addEventListener("click", function () {
      closeDialog(q("updateFullDialog"));
    });
    q("updateFullDialog")?.addEventListener("click", function (e) {
      if (e.target === this) closeDialog(this);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDialog(q("updateFullDialog"));
    });
  }

  function _nativeShare(url, title, text, copySuccessMsg) {
    if (!url) { setStatus("連結尚未建立", true); clearStatusSoon(); return; }
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url })
        .catch(function (err) {
          if (err?.name !== "AbortError") _fallbackCopy(url, copySuccessMsg);
        });
      return;
    }
    _fallbackCopy(url, copySuccessMsg);
  }

  async function _fallbackCopy(url, successMsg) {
    var ok = await copyText(url);
    setStatus(ok ? successMsg : "複製失敗，請手動複製", !ok);
    clearStatusSoon();
  }

})();
