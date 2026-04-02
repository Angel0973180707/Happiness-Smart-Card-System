/* ============================================================
   天使幸福智慧名片館 app.js
   v7.7.4.2-qr-expiry-fix-single
   完整單檔覆蓋版
   - 修復成品 QR code 不顯示
   - 修復到期倒數 / 付款期限不顯示
   - 保留門面樣品切換
   - 保留 share / install / invite / announcements
   - 與 card-renderer.js 配合使用
============================================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v7.7.4.2-qr-expiry-fix-single",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/"
};

const FACADE_SAMPLE_ID = "TW0001";

const BUILTIN_ANNOUNCEMENTS = [
  {
    id: "builtin-feature",
    title: "產品特色",
    content: `天使幸福智慧名片是一個可分享的數位名片入口，
整合品牌介紹、聯絡方式、社群與 CTA，讓客戶快速認識你。`,
    status: "active",
    priority: 10
  },
  {
    id: "builtin-flow",
    title: "申請流程",
    content: `申請表單邀請碼 → 聯繫客服 → 完成填表 → 建立智慧名片`,
    status: "active",
    priority: 9
  }
];

const PLAN_LIMITS = {
  free: { maxPhotos: 2, maxCtas: 1 },
  premium: { maxPhotos: 5, maxCtas: 3 }
};

const DEFAULT_PREVIEW_META = {
  theme: "",
  layout: "grid",
  aspect_ratio: "1:1",
  fit_mode: "cover"
};

const DEFAULT_PHOTO_META = {
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotate: 0
};

let currentRow = null;
let facadeCurrentRow = null;
let facadeBaseData = null;
let deferredInstallPrompt = null;

let currentAvatarUrlCache = "";
let currentAvatarSourceKeyCache = "";
let currentReferralSourceCodeCache = "";
let currentInviteApplyCodeCache = "";
let currentInviteCopyTextCache = "";

let announcementItems_ = [];
let announcementIndex_ = 0;
let announcementTimer_ = null;

const facadeState = {
  plan: "free",
  color: "c1",
  style: "s1",
  paper: "f1",
  premiumColor: "p1"
};

/* ============================================================
   基礎工具
============================================================ */
function qs(id) {
  return document.getElementById(id);
}

function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function text(v) {
  return v == null ? "" : String(v).trim();
}

function escapeHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeHtmlWithBreaks_(s) {
  return escapeHtml_(s).replace(/\n/g, "<br>");
}

function normalizeLongText_(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clampNumber_(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (Number.isFinite(min) && n < min) return min;
  if (Number.isFinite(max) && n > max) return max;
  return n;
}

function sleep_(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function safeJsonParse_(rawText) {
  let s = String(rawText || "").trim();
  if (!s) return null;
  s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
  try { return JSON.parse(s); } catch (_) {}
  const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  return null;
}

function normalizeId_(s) {
  const v = text(s).toUpperCase();
  if (!v) return "";
  if (/^TW\d{4}$/.test(v)) return v;
  if (/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if (/^TW\d{1,4}$/.test(v)) {
    const n = v.replace(/^TW/i, "");
    return "TW" + n.padStart(4, "0");
  }
  return v;
}

function getSearchParams_() {
  try {
    return new URLSearchParams(location.search || "");
  } catch (_) {
    return new URLSearchParams();
  }
}

function getIdFromUrl_() {
  const sp = getSearchParams_();
  return sp.get("id") || "";
}

function getRefFromUrl_() {
  const sp = getSearchParams_();
  return text(sp.get("ref") || "");
}

function normalizeUrl_(s) {
  let v = String(s || "").trim();
  if (!v) return "";
  if (/^(tel:|mailto:|sms:|line:|https?:\/\/)/i.test(v)) return v;
  if (/^www\./i.test(v)) return "https://" + v;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
  return v;
}

function normalizeImageUrl_(raw) {
  let url = normalizeUrl_(raw);
  if (!url) return "";

  if (url.includes("dropbox.com")) {
    url = url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }

  if (url.includes("drive.google.com") && url.includes("/file/d/")) {
    const m = url.match(/\/file\/d\/([^/]+)/i);
    if (m && m[1]) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;
    }
  }

  return url;
}

function buildImgCandidates_(raw) {
  const s = text(raw);
  if (!s) return [];
  const url = normalizeImageUrl_(s);
  const list = [url];

  if (url.includes("drive.google.com/uc?export=view&id=")) {
    const m = url.match(/id=([^&]+)/i);
    if (m && m[1]) {
      const id = decodeURIComponent(m[1]);
      list.push(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
      list.push(`https://drive.google.com/uc?export=download&id=${id}`);
    }
  }

  return [...new Set(list.filter(Boolean))];
}

function openUrl_(url) {
  const u = normalizeUrl_(url);
  if (!u) return;
  window.open(u, "_blank");
}

function openMapByAddress_(addr) {
  const a = text(addr);
  if (!a) return;
  const q = encodeURIComponent(a);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

/* ============================================================
   資料正規化
============================================================ */
function buildNormalizedPayload_(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  const lower = Object.create(null);

  Object.keys(obj).forEach(k => {
    const nk = String(k || "").trim();
    if (!nk) return;
    const v = obj[k];
    if (out[nk] == null || text(out[nk]) === "") out[nk] = v;
    lower[nk.toLowerCase()] = v;
  });

  out.__lower = lower;
  return out;
}

function pick(p, keys) {
  if (!p) return "";
  const lower = p.__lower || null;
  for (const k of keys) {
    const kk = String(k || "").trim();
    const v1 = p[kk];
    if (v1 != null && text(v1) !== "") return v1;
    if (lower) {
      const v2 = lower[kk.toLowerCase()];
      if (v2 != null && text(v2) !== "") return v2;
    }
  }
  return "";
}

function extractCardRow_(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.item && typeof payload.item === "object") return payload.item;
  if (payload.row && typeof payload.row === "object") return payload.row;
  if (payload.card && typeof payload.card === "object") return payload.card;
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    if (payload.data.item && typeof payload.data.item === "object") return payload.data.item;
    if (payload.data.row && typeof payload.data.row === "object") return payload.data.row;
    if (payload.data.card && typeof payload.data.card === "object") return payload.data.card;
    return payload.data;
  }
  if ("id" in payload || "name" in payload || "plan" in payload || "avatar_url" in payload) return payload;
  return {};
}

function normalizePreviewMeta_(raw) {
  const meta = raw && typeof raw === "object" ? raw : {};
  const theme = text(meta.theme).toLowerCase();
  const layout = text(meta.layout).toLowerCase();
  const aspectRatio = text(meta.aspect_ratio || meta.aspectRatio);
  const fitMode = text(meta.fit_mode || meta.fitMode).toLowerCase();

  return {
    theme: theme === "premium" || theme === "free" ? theme : DEFAULT_PREVIEW_META.theme,
    layout: layout === "single" ? "single" : DEFAULT_PREVIEW_META.layout,
    aspect_ratio: aspectRatio === "16:9" ? "16:9" : DEFAULT_PREVIEW_META.aspect_ratio,
    fit_mode: fitMode === "contain" ? "contain" : DEFAULT_PREVIEW_META.fit_mode
  };
}

function normalizeSinglePhotoMeta_(raw) {
  const meta = raw && typeof raw === "object" ? raw : {};
  return {
    x: clampNumber_(meta.x, 0, 1, DEFAULT_PHOTO_META.x),
    y: clampNumber_(meta.y, 0, 1, DEFAULT_PHOTO_META.y),
    scale: clampNumber_(meta.scale, 0.5, 3, DEFAULT_PHOTO_META.scale),
    rotate: clampNumber_(meta.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
  };
}

function normalizePhotoMetaMap_(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (let i = 1; i <= 10; i++) {
    const key = `photo${i}`;
    out[key] = normalizeSinglePhotoMeta_(src[key]);
  }
  return out;
}

function normalizeCardFeatures(card) {
  const src = card && typeof card === "object" ? card : {};
  let parsed = {};

  if (src.features && typeof src.features === "object") {
    parsed = src.features;
  } else {
    const fromJson = safeJsonParse_(src.features_json);
    if (fromJson && typeof fromJson === "object") parsed = fromJson;
  }

  const features = {
    photo_meta: normalizePhotoMetaMap_(parsed.photo_meta),
    preview_meta: normalizePreviewMeta_(parsed.preview_meta)
  };

  src.features = features;
  return src;
}

function normalizePlan_(v) {
  return text(v).toLowerCase() === "premium" ? "premium" : "free";
}

function getPreviewMeta_(p) {
  const features = p?.features || {};
  return normalizePreviewMeta_(features.preview_meta);
}

function getPhotoMeta_(p, key) {
  const features = p?.features || {};
  const map = normalizePhotoMetaMap_(features.photo_meta);
  return map[key] || { ...DEFAULT_PHOTO_META };
}

function getEffectiveTheme_(p) {
  const preview = getPreviewMeta_(p);
  if (preview.theme === "premium" || preview.theme === "free") return preview.theme;
  return normalizePlan_(pick(p, ["plan"]));
}

function getPhotoLimitFromPayload_(p) {
  const limit = Number(pick(p, ["photo_limit"]));
  if (!isNaN(limit) && limit > 0 && limit <= 10) return limit;
  const plan = getEffectiveTheme_(p);
  return PLAN_LIMITS[plan]?.maxPhotos || PLAN_LIMITS.free.maxPhotos;
}

/* ============================================================
   API
============================================================ */
async function fetchWithTimeout_(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal
    });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if (!json) throw new Error("Not JSON");
    return json;
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url) {
  let last = null;
  for (let i = 0; i <= CONFIG.RETRY; i++) {
    try {
      return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS);
    } catch (e) {
      last = e;
      await sleep_(500 + i * 400);
    }
  }
  throw last || new Error("Fetch failed");
}

function buildCardApiUrl_(id) {
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getCard");
  u.searchParams.set("id", cid);
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildAnnouncementApiUrl_() {
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getAnnouncements");
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildLeadCreateUrl_(refCode) {
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "leadCreate");
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  if (refCode) u.searchParams.set("ref", refCode);
  u.searchParams.set("source", "invite_gate_card");
  u.searchParams.set("note", "invite_gate_prelog");
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

/* ============================================================
   目前有效資料
============================================================ */
function getActiveCardPayload_() {
  return facadeCurrentRow || currentRow || facadeBaseData || null;
}

function getReferralSourceCode_(p) {
  const urlRef = getRefFromUrl_();
  if (urlRef) return urlRef;

  const active = p || getActiveCardPayload_();
  if (active) {
    const code =
      text(pick(active, ["agent_id"])) ||
      text(pick(active, ["service_agent"])) ||
      text(pick(active, ["referrer"])) ||
      text(pick(active, ["id"]));
    if (code) return code;
  }

  return FACADE_SAMPLE_ID;
}

function getCardIdForShare_(p) {
  const payload = p || getActiveCardPayload_();
  return normalizeId_(text(pick(payload, ["id"]))) || FACADE_SAMPLE_ID;
}

function getAgentIdForShare_(p) {
  const payload = p || getActiveCardPayload_();
  return (
    text(pick(payload, ["service_agent"])) ||
    text(pick(payload, ["agent_id"])) ||
    text(pick(payload, ["share_agent_id"])) ||
    text(pick(payload, ["referrer"])) ||
    ""
  );
}

function buildTrackedShareUrl_(p) {
  const cardId = getCardIdForShare_(p);
  const agentId = getAgentIdForShare_(p);

  try {
    const u = new URL(CONFIG.HUB_URL + "index.html");
    u.searchParams.set("id", cardId);
    u.searchParams.set("view", "1");
    u.searchParams.set("share_card_id", cardId);
    u.searchParams.set("share_agent_id", agentId);
    u.searchParams.set("share_source", "card_share");
    u.searchParams.set("share_channel", "product_card");
    u.searchParams.set("share_visit_id", "");
    return u.toString();
  } catch (_) {
    return (
      CONFIG.HUB_URL +
      "index.html?id=" + encodeURIComponent(cardId) +
      "&view=1" +
      "&share_card_id=" + encodeURIComponent(cardId) +
      "&share_agent_id=" + encodeURIComponent(agentId) +
      "&share_source=card_share&share_channel=product_card&share_visit_id="
    );
  }
}

function buildHubShareUrl_() {
  try {
    const u = new URL(CONFIG.HUB_URL);
    const code = getReferralSourceCode_(getActiveCardPayload_());
    if (code) u.searchParams.set("ref", code);
    return u.toString();
  } catch (_) {
    const code = getReferralSourceCode_(getActiveCardPayload_());
    return CONFIG.HUB_URL + (code ? ("?ref=" + encodeURIComponent(code)) : "");
  }
}

function pickAvatarInfo_(p) {
  const url = pick(p, ["avatar_url"]);
  if (text(url)) {
    return { key: "avatar_url", raw: url, url: normalizeImageUrl_(url) };
  }
  return { key: "", raw: "", url: "" };
}

/* ============================================================
   QR
============================================================ */
function hideCenterImg_(imgEl) {
  if (!imgEl) return;
  imgEl.removeAttribute("src");
  imgEl.style.display = "none";
  if (imgEl.parentElement) imgEl.parentElement.style.display = "none";
}

function setCenterImg_(imgEl, url, sizeRatio) {
  if (!imgEl || !url) {
    hideCenterImg_(imgEl);
    return;
  }

  imgEl.style.display = "";
  if (imgEl.parentElement) imgEl.parentElement.style.display = "";
  imgEl.style.width = `${Math.round((sizeRatio || 0.09) * 100)}%`;
  imgEl.style.height = `${Math.round((sizeRatio || 0.09) * 100)}%`;
  imgEl.style.objectFit = "cover";
  imgEl.style.borderRadius = "50%";
  imgEl.src = url;
}

function renderQr(config) {
  const {
    container,
    url,
    size = 220,
    centerImgEl = null,
    centerImgUrl = "",
    centerSizeRatio = 0.09
  } = config || {};

  if (!container) return false;

  container.innerHTML = "";

  const finalUrl = normalizeUrl_(url);
  if (!finalUrl) {
    if (centerImgEl) hideCenterImg_(centerImgEl);
    return false;
  }

  const img = document.createElement("img");
  img.alt = "QR Code";
  img.className = "qr-img";

  const primary =
    "https://api.qrserver.com/v1/create-qr-code/?size=" +
    encodeURIComponent(`${size}x${size}`) +
    "&data=" + encodeURIComponent(finalUrl);

  const fallback =
    "https://quickchart.io/qr?size=" +
    encodeURIComponent(size) +
    "&text=" + encodeURIComponent(finalUrl);

  img.onerror = function () {
    if (img.dataset.fallbackApplied === "1") {
      container.innerHTML = "";
      if (centerImgEl) hideCenterImg_(centerImgEl);
      return;
    }
    img.dataset.fallbackApplied = "1";
    img.src = fallback;
  };

  img.onload = function () {
    if (centerImgEl && centerImgUrl) {
      setCenterImg_(centerImgEl, centerImgUrl, centerSizeRatio);
    } else if (centerImgEl) {
      hideCenterImg_(centerImgEl);
    }
  };

  img.src = primary;
  container.appendChild(img);
  return true;
}

window.renderQr = renderQr;

function rerenderBottomQr_(p) {
  const box = qs("bottomQrBox");
  const section = qs("bottomQrSection");
  const centerImgEl = qs("bottomQrAvatar");
  const centerWrap = qs("bottomQrAvatarWrap");

  if (!box || !section) return;

  const payload = p || getActiveCardPayload_();
  const url = buildTrackedShareUrl_(payload);
  const avatarInfo = pickAvatarInfo_(payload);
  const centerImgUrl = avatarInfo.url || currentAvatarUrlCache || "";

  const ok = renderQr({
    container: box,
    url,
    size: 220,
    centerImgEl,
    centerImgUrl,
    centerSizeRatio: 0.09
  });

  if (ok) {
    section.style.display = "";
    section.classList.remove("is-hidden");
    section.style.visibility = "visible";
    section.style.opacity = "1";
    if (centerWrap) {
      centerWrap.style.display = centerImgUrl ? "" : "none";
      centerWrap.classList.toggle("is-hidden", !centerImgUrl);
    }
  } else {
    section.style.display = "none";
    section.classList.add("is-hidden");
    if (centerWrap) {
      centerWrap.style.display = "none";
      centerWrap.classList.add("is-hidden");
    }
  }
}

function rerenderFeatureQr_(p) {
  const box = qs("featureQrBox");
  const section = qs("featureQrSection");
  const centerImgEl = qs("featureQrAvatar");
  const centerWrap = qs("featureQrAvatarWrap");

  if (!box || !section) return;

  const payload = p || getActiveCardPayload_();
  const url = buildTrackedShareUrl_(payload);
  const avatarInfo = pickAvatarInfo_(payload);
  const centerImgUrl = avatarInfo.url || currentAvatarUrlCache || "";

  const ok = renderQr({
    container: box,
    url,
    size: 200,
    centerImgEl,
    centerImgUrl,
    centerSizeRatio: 0.09
  });

  if (ok) {
    section.style.display = "";
    section.classList.remove("is-hidden");
    section.style.visibility = "visible";
    section.style.opacity = "1";
    if (centerWrap) {
      centerWrap.style.display = centerImgUrl ? "" : "none";
      centerWrap.classList.toggle("is-hidden", !centerImgUrl);
    }
  } else {
    section.style.display = "none";
    section.classList.add("is-hidden");
    if (centerWrap) {
      centerWrap.style.display = "none";
      centerWrap.classList.add("is-hidden");
    }
  }
}

function rerenderFacadeQr_() {
  const box = qs("facadeQrBox");
  const section = qs("facadeQRSection") || qs("facadeQrSection");
  const centerImgEl = qs("facadeQrAvatar");
  const centerWrap = qs("facadeQrAvatarWrap");

  if (!box) return;

  const payload = getActiveCardPayload_();
  const url = buildHubShareUrl_();
  const avatarInfo = pickAvatarInfo_(payload);
  const centerImgUrl = avatarInfo.url || currentAvatarUrlCache || "";

  const ok = renderQr({
    container: box,
    url,
    size: 220,
    centerImgEl,
    centerImgUrl,
    centerSizeRatio: 0.09
  });

  if (ok) {
    if (section) {
      section.style.display = "";
      section.classList.remove("is-hidden");
    }
    if (centerWrap) {
      centerWrap.style.display = centerImgUrl ? "" : "none";
      centerWrap.classList.toggle("is-hidden", !centerImgUrl);
    }
  } else {
    if (section) {
      section.style.display = "none";
      section.classList.add("is-hidden");
    }
    if (centerWrap) {
      centerWrap.style.display = "none";
      centerWrap.classList.add("is-hidden");
    }
  }
}

function rerenderAllQrAfterFacade_() {
  const payload = getActiveCardPayload_();
  rerenderBottomQr_(payload);
  rerenderFeatureQr_(payload);
  rerenderFacadeQr_();
  updateQrCenterSizes_();
}

function updateQrCenterSizes_() {
  // 保留接口，避免舊流程呼叫時出錯
}

/* ============================================================
   到期日 / 付款期限
============================================================ */
function formatDateYmd_(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function parseDateSafe_(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  const normalized = s
    .replace(/\//g, "-")
    .replace(" ", "T")
    .replace(/(\.\d+)?Z$/i, "");

  let d = new Date(normalized);
  if (!isNaN(d.getTime())) return d;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
    if (!isNaN(d.getTime())) return d;
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0),
      0
    );
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function getExpiryInfo_(p) {
  const payload = p || {};
  const billingStatus = text(pick(payload, ["billing_status"])).toLowerCase();

  const expiresAtRaw = text(pick(payload, ["expires_at"]));
  const paymentDueRaw = text(pick(payload, ["payment_due_at"]));

  const expiresAt = parseDateSafe_(expiresAtRaw);
  const paymentDueAt = parseDateSafe_(paymentDueRaw);

  if (billingStatus === "unpaid" && paymentDueAt) {
    return { type: "payment_due", date: paymentDueAt, raw: paymentDueRaw };
  }

  if (expiresAt) {
    return { type: "expires_at", date: expiresAt, raw: expiresAtRaw };
  }

  if (paymentDueAt) {
    return { type: "payment_due", date: paymentDueAt, raw: paymentDueRaw };
  }

  return null;
}

function renderCardExpiry_(p) {
  const el = qs("cardExpiry");
  if (!el) return;

  const info = getExpiryInfo_(p);
  if (!info || !info.date) {
    el.style.display = "none";
    el.textContent = "";
    el.removeAttribute("title");
    el.classList.remove("is-expired");
    return;
  }

  const target = info.date;
  const now = new Date();

  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.floor((targetStart - nowStart) / 86400000);

  let label = "";

  if (info.type === "payment_due") {
    if (diffDays < 0) {
      label = `付款期限已過 ${Math.abs(diffDays)} 天`;
      el.classList.add("is-expired");
    } else if (diffDays === 0) {
      label = "付款期限今天截止";
      el.classList.remove("is-expired");
    } else if (diffDays === 1) {
      label = "付款期限剩 1 天";
      el.classList.remove("is-expired");
    } else {
      label = `付款期限剩 ${diffDays} 天`;
      el.classList.remove("is-expired");
    }
    el.title = `付款期限：${formatDateYmd_(target)}`;
  } else {
    if (diffDays < 0) {
      label = diffDays === -1 ? "EXPIRED 1 DAY AGO" : `EXPIRED ${Math.abs(diffDays)} DAYS AGO`;
      el.classList.add("is-expired");
    } else if (diffDays === 0) {
      label = "EXPIRES TODAY";
      el.classList.remove("is-expired");
    } else if (diffDays === 1) {
      label = "EXPIRES IN 1 DAY";
      el.classList.remove("is-expired");
    } else {
      label = `EXPIRES IN ${diffDays} DAYS`;
      el.classList.remove("is-expired");
    }
    el.title = `Expiry Date: ${formatDateYmd_(target)}`;
  }

  el.textContent = label;
  el.style.display = "block";
}

/* ============================================================
   公告
============================================================ */
function getMergedAnnouncements_(remoteItems) {
  const remote = Array.isArray(remoteItems) ? remoteItems : [];
  const merged = [...remote, ...BUILTIN_ANNOUNCEMENTS]
    .filter(item => String(item?.status || "active").toLowerCase() !== "inactive")
    .sort((a, b) => Number(b?.priority || 0) - Number(a?.priority || 0));
  return merged;
}

function paintAnnouncementList_(items) {
  const list = qs("announcementList");
  if (!list) return;

  list.innerHTML = "";
  const finalItems = Array.isArray(items) ? items : [];

  if (!finalItems.length) {
    list.innerHTML = `
      <article class="facade-announcement-item">
        <h3>目前沒有公告</h3>
        <p>後續若有活動、更新或服務說明，會顯示在這裡。</p>
      </article>
    `;
    return;
  }

  finalItems.forEach(item => {
    const article = document.createElement("article");
    article.className = "facade-announcement-item";
    article.innerHTML = `
      <h3>${escapeHtml_(item.title || "公告")}</h3>
      <p>${escapeHtml_((item.content || "").slice(0, 120))}${text(item.content).length > 120 ? "..." : ""}</p>
    `;
    article.addEventListener("click", () => openAnnouncementModal_(item));
    list.appendChild(article);
  });
}

function openAnnouncementModal_(item) {
  const modal = qs("announcementModal");
  const titleEl = qs("announcementModalTitle");
  const bodyEl = qs("announcementModalBody");
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = text(item?.title) || "公告";
  bodyEl.innerHTML = escapeHtmlWithBreaks_(text(item?.content) || "");

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  lockBodyScroll_();
}

function closeAnnouncementModal_() {
  const modal = qs("announcementModal");
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
  unlockBodyScroll_();
}

function bindAnnouncementModal_() {
  const closeBtn = qs("announcementModalClose");
  const modal = qs("announcementModal");
  if (closeBtn) closeBtn.onclick = closeAnnouncementModal_;
  if (modal) {
    modal.addEventListener("click", e => {
      const target = e.target;
      if (target && target.getAttribute("data-close-announcement") === "1") {
        closeAnnouncementModal_();
      }
    });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAnnouncementModal_();
  });
}

async function fetchAndRenderAnnouncements_() {
  try {
    const payload = await fetchJsonRobust_(buildAnnouncementApiUrl_());
    const remote = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.announcements)
      ? payload.announcements
      : [];
    announcementItems_ = getMergedAnnouncements_(remote);
  } catch (_) {
    announcementItems_ = getMergedAnnouncements_([]);
  }

  paintAnnouncementList_(announcementItems_);
}

/* ============================================================
   文字平衡 / expandable
============================================================ */
function applySmartBalanceAll_() {
  // 保留接口，避免舊流程呼叫出錯
}

function refreshAllExpandable_() {
  // 保留接口，避免舊流程呼叫出錯
}

/* ============================================================
   分享 / 安裝
============================================================ */
async function shareCurrentCard_() {
  const payload = getActiveCardPayload_();
  const title = text(pick(payload, ["name"])) || "天使幸福智慧名片";
  const shareUrl = buildTrackedShareUrl_(payload);

  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text: "這是我的智慧名片，歡迎查看。",
        url: shareUrl
      });
      return;
    }
  } catch (err) {
    console.warn("[HSC share] 系統分享失敗，改用複製連結", err);
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    alert("已複製成品連結");
  } catch (_) {
    window.prompt("請手動複製以下連結：", shareUrl);
  }
}

function bindShareButton_() {
  const btn = qs("cleanShareFab");
  if (!btn) return;
  btn.style.display = "flex";
  btn.onclick = shareCurrentCard_;
}

function bindInstallPrompt_() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installFab = qs("installFab");
    if (installFab) installFab.style.display = "flex";
  });

  const installFab = qs("installFab");
  if (!installFab) return;

  installFab.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch (_) {}
    deferredInstallPrompt = null;
    installFab.style.display = "none";
  };
}

/* ============================================================
   客服 / 邀請 / 申請
============================================================ */
function createLocalApplyCode_() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `AP${yy}${mm}${dd}${hh}${mi}${ss}`;
}

function buildInviteApplyText_(refCode, applyCode) {
  return [
    "您好，我想申請天使幸福智慧名片邀請碼。",
    "",
    `推薦來源識別碼：${text(refCode) || "無"}`,
    `申請識別碼：${text(applyCode) || "-"}`,
    "",
    "請協助我申請開通表單，謝謝。"
  ].join("\n");
}

async function ensureInviteApplyData_() {
  if (currentInviteApplyCodeCache && currentInviteCopyTextCache) {
    return {
      refCode: currentReferralSourceCodeCache || "無",
      applyCode: currentInviteApplyCodeCache,
      copyText: currentInviteCopyTextCache
    };
  }

  const refCode = getReferralSourceCode_(getActiveCardPayload_());
  currentReferralSourceCodeCache = refCode || "";

  let applyCode = "";
  try {
    const payload = await fetchJsonRobust_(buildLeadCreateUrl_(refCode));
    applyCode = text(payload?.data?.lead_id || payload?.lead_id || "");
  } catch (_) {
    applyCode = "";
  }

  if (!applyCode) applyCode = createLocalApplyCode_();

  currentInviteApplyCodeCache = applyCode;
  currentInviteCopyTextCache = buildInviteApplyText_(refCode, applyCode);

  return {
    refCode: refCode || "無",
    applyCode,
    copyText: currentInviteCopyTextCache
  };
}

window.__ensureInviteApplyData = ensureInviteApplyData_;
window.__getReferralSourceCode = function () {
  return getReferralSourceCode_(getActiveCardPayload_());
};

function copyTextFallback_(txt) {
  const ta = document.createElement("textarea");
  ta.value = txt;
  ta.setAttribute("readonly", "readonly");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  try { document.execCommand("copy"); } catch (_) {}
  document.body.removeChild(ta);
}

async function copyText_(txt) {
  try {
    await navigator.clipboard.writeText(txt);
  } catch (_) {
    copyTextFallback_(txt);
  }
}

async function openInviteApplyFlow_() {
  const info = await ensureInviteApplyData_();
  await copyText_(info.copyText);
  alert(`已複製申請內容\n申請識別碼：${info.applyCode}`);
  openUrl_(CONFIG.CUSTOMER_SERVICE_URL);
}

function bindCustomerService_() {
  ["btnContactCustomerService", "btnContactService", "btnCustomerService"].forEach(id => {
    const btn = qs(id);
    if (!btn) return;
    btn.onclick = () => openUrl_(CONFIG.CUSTOMER_SERVICE_URL);
  });
}

function bindInviteButtons_() {
  ["btnOpenRequestForm", "btnApplyNow", "btnInviteApply", "btnApplyInvite"].forEach(id => {
    const btn = qs(id);
    if (!btn) return;
    btn.onclick = openInviteApplyFlow_;
  });
}

/* ============================================================
   門面樣式 state
============================================================ */
function mapFreeColorToTheme_(v) {
  const raw = text(v).toLowerCase();
  const map = {
    c1: "color-1", c2: "color-2", c3: "color-3", c4: "color-4", c5: "color-5",
    "color-1": "color-1", "color-2": "color-2", "color-3": "color-3", "color-4": "color-4", "color-5": "color-5"
  };
  return map[raw] || "color-1";
}

function mapStyleToUi_(v) {
  const raw = text(v).toLowerCase();
  const map = { s1: "arch", s2: "flat", s3: "spot", arch: "arch", flat: "flat", spot: "spot" };
  return map[raw] || "arch";
}

function mapPaperToUi_(v) {
  const raw = text(v).toLowerCase();
  const map = { f1: "paper-1", f2: "paper-2", f3: "paper-3", "paper-1": "paper-1", "paper-2": "paper-2", "paper-3": "paper-3" };
  return map[raw] || "paper-1";
}

function mapPremiumToUi_(v) {
  const raw = text(v).toLowerCase();
  const allow = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
  return allow.includes(raw) ? raw : "p1";
}

function applyFacadeBodyMode_() {
  const body = document.body;
  if (!body) return;

  body.classList.remove(
    "mode-free", "mode-premium",
    "color-1", "color-2", "color-3", "color-4", "color-5",
    "p1", "p2", "p3", "p4", "p5", "p6", "p7",
    "style-arch", "style-flat", "style-spot",
    "paper-1", "paper-2", "paper-3"
  );

  if (facadeState.plan === "premium") {
    body.classList.add("mode-premium", mapPremiumToUi_(facadeState.premiumColor));
  } else {
    body.classList.add(
      "mode-free",
      mapFreeColorToTheme_(facadeState.color),
      "style-" + mapStyleToUi_(facadeState.style),
      mapPaperToUi_(facadeState.paper)
    );
  }
}

function syncPlanUI_() {
  const freeControls = qs("freeControls") || qs("free-controls");
  const premiumControls = qs("premiumControls") || qs("premium-controls");

  if (facadeState.plan === "premium") {
    if (freeControls) freeControls.style.display = "none";
    if (premiumControls) premiumControls.style.display = "";
  } else {
    if (premiumControls) premiumControls.style.display = "none";
    if (freeControls) freeControls.style.display = "";
  }

  applyFacadeBodyMode_();
}

function initSelectionState_() {
  syncPlanUI_();
}

window.setPlan = function (plan) {
  facadeState.plan = plan === "premium" ? "premium" : "free";
  syncPlanUI_();
  renderFacadePreview();
};

window.setTheme = function (theme) {
  const v = text(theme).toLowerCase();
  const freeMap = {
    "color-1": "c1", "color-2": "c2", "color-3": "c3", "color-4": "c4", "color-5": "c5",
    c1: "c1", c2: "c2", c3: "c3", c4: "c4", c5: "c5"
  };

  if (freeMap[v]) {
    facadeState.plan = "free";
    facadeState.color = freeMap[v];
  } else if (/^p\d+$/.test(v)) {
    facadeState.plan = "premium";
    facadeState.premiumColor = v;
  }

  syncPlanUI_();
  renderFacadePreview();
};

window.setStyle = function (style) {
  const raw = text(style).toLowerCase();
  const map = { arch: "s1", flat: "s2", spot: "s3", s1: "s1", s2: "s2", s3: "s3" };
  if (!map[raw]) return;
  facadeState.style = map[raw];
  renderFacadePreview();
};

window.setPaper = function (paper) {
  const raw = text(paper).toLowerCase();
  const map = { "paper-1": "f1", "paper-2": "f2", "paper-3": "f3", f1: "f1", f2: "f2", f3: "f3" };
  if (!map[raw]) return;
  facadeState.paper = map[raw];
  renderFacadePreview();
};

/* ============================================================
   載入資料
============================================================ */
async function loadFacadeBaseCard() {
  const payload = await fetchJsonRobust_(buildCardApiUrl_(FACADE_SAMPLE_ID));
  const row = extractCardRow_(payload);

  if (!row || typeof row !== "object" || !Object.keys(row).length) {
    throw new Error("門面樣品卡資料為空");
  }

  const merged = normalizeCardFeatures(row);
  facadeBaseData = buildNormalizedPayload_(merged);

  const basePlan = getEffectiveTheme_(facadeBaseData);
  if (basePlan === "premium") {
    facadeState.plan = "premium";
    facadeState.premiumColor = text(pick(facadeBaseData, ["color"])) || "p1";
  } else {
    facadeState.plan = "free";
    facadeState.color = text(pick(facadeBaseData, ["color"])) || "c1";
    facadeState.style = text(pick(facadeBaseData, ["style"])) || "s1";
    facadeState.paper = text(pick(facadeBaseData, ["paper"])) || "f1";
  }

  syncPlanUI_();
}

function buildFacadePreviewData() {
  const baseRaw = facadeBaseData?.__raw || facadeBaseData || {};
  const base = JSON.parse(JSON.stringify(baseRaw || {}));
  const isPremium = facadeState.plan === "premium";

  const baseFeatures = (base.features && typeof base.features === "object")
    ? base.features
    : (safeJsonParse_(base.features_json) || {});

  const previewMeta = {
    ...(baseFeatures.preview_meta || {}),
    theme: isPremium ? "premium" : "free"
  };

  const features = {
    ...(baseFeatures || {}),
    preview_meta: previewMeta,
    photo_meta: normalizePhotoMetaMap_(baseFeatures.photo_meta)
  };

  base.plan = isPremium ? "premium" : "free";
  base.color = isPremium ? facadeState.premiumColor : facadeState.color;
  base.style = isPremium ? "" : facadeState.style;
  base.paper = isPremium ? "" : facadeState.paper;
  base.photo_limit = isPremium ? 5 : 2;
  base.cta_limit = isPremium ? 3 : 1;
  base.features = features;
  base.features_json = JSON.stringify(features);

  base.card_url = buildTrackedShareUrl_(facadeBaseData || base);
  base.share_url = base.card_url;
  base.preview_url = base.card_url;
  base.hub_url = buildHubShareUrl_();
  base.facade_url = base.hub_url;

  return base;
}

async function loadCardById_(id) {
  const payload = await fetchJsonRobust_(buildCardApiUrl_(id));
  const row = extractCardRow_(payload);

  if (!row || typeof row !== "object" || !Object.keys(row).length) {
    throw new Error("成品名片資料為空");
  }

  const merged = normalizeCardFeatures(row);
  currentRow = buildNormalizedPayload_(merged);

  window.__CARD_DATA__ = currentRow;
  window.cardData = currentRow;
  window.payload = currentRow;

  const avatarInfo = pickAvatarInfo_(currentRow);
  currentAvatarUrlCache = avatarInfo.url || "";
  currentAvatarSourceKeyCache = avatarInfo.key || "";
  currentReferralSourceCodeCache = getReferralSourceCode_(currentRow);

  return currentRow;
}

/* ============================================================
   Renderer 串接
============================================================ */
function renderPostRendererUi_(row) {
  const payload = row || getActiveCardPayload_();
  if (!payload) return;

  renderCardExpiry_(payload);
  rerenderBottomQr_(payload);
  rerenderFeatureQr_(payload);
  rerenderFacadeQr_();

  applySmartBalanceAll_();
  refreshAllExpandable_();
  updateQrCenterSizes_();
}

function renderMainCard_(row) {
  const root = qs("livePreviewCard") || qs("cardStage") || qs("cardRoot");
  if (!root) throw new Error("找不到 livePreviewCard / cardStage");

  const renderer =
    window.HscCardRenderer &&
    typeof window.HscCardRenderer.renderCard === "function"
      ? window.HscCardRenderer.renderCard
      : null;

  if (!renderer) {
    throw new Error("card-renderer.js 尚未正確載入");
  }

  const raw = row?.__raw || row || {};
  const payload = {
    ...raw,
    card_url: buildTrackedShareUrl_(row),
    share_url: buildTrackedShareUrl_(row),
    preview_url: buildTrackedShareUrl_(row),
    hub_url: buildHubShareUrl_(),
    facade_url: buildHubShareUrl_()
  };

  const result = renderer(payload, {
    mode: "index",
    root,
    useExistingDom: false,
    qrMode: "card",
    allowActions: true,
    cardUrl: payload.card_url,
    shareUrl: payload.share_url,
    previewUrl: payload.preview_url,
    hubUrl: payload.hub_url,
    facadeUrl: payload.facade_url
  });

  if (!result || result.ok !== true) {
    throw new Error("主卡 renderer 回傳失敗");
  }

  renderPostRendererUi_(buildNormalizedPayload_(payload));
}

function renderFacadePreview() {
  const root = qs("livePreviewCard");
  if (!root || !facadeBaseData) return;

  applyFacadeBodyMode_();
  const data = buildFacadePreviewData();

  const renderer =
    window.HscCardRenderer &&
    typeof window.HscCardRenderer.renderCard === "function"
      ? window.HscCardRenderer.renderCard
      : null;

  if (!renderer) {
    throw new Error("card-renderer.js 尚未正確載入，找不到 HscCardRenderer.renderCard()");
  }

  const result = renderer(data, {
    mode: "index",
    root,
    useExistingDom: false,
    qrMode: "facade",
    allowActions: true,
    cardUrl: data.card_url,
    shareUrl: data.share_url,
    previewUrl: data.preview_url,
    hubUrl: data.hub_url,
    facadeUrl: data.facade_url
  });

  if (!result || result.ok !== true) {
    throw new Error("門面 renderer 回傳失敗");
  }

  facadeCurrentRow = buildNormalizedPayload_(data || {});
  currentReferralSourceCodeCache = getReferralSourceCode_(facadeCurrentRow);

  window.__CARD_DATA__ = facadeCurrentRow;
  window.cardData = facadeCurrentRow;
  window.payload = facadeCurrentRow;

  const avatarInfo = pickAvatarInfo_(facadeCurrentRow);
  currentAvatarUrlCache = avatarInfo.url || "";
  currentAvatarSourceKeyCache = avatarInfo.key || "";

  renderPostRendererUi_(facadeCurrentRow);
  rerenderAllQrAfterFacade_();
}

/* ============================================================
   Loading / body scroll / version
============================================================ */
function showLoadingMask_() {
  const mask = qs("loadingMask");
  if (!mask) return;
  mask.style.display = "flex";
  mask.classList.remove("is-hidden");
}

function hideLoadingMask_() {
  const mask = qs("loadingMask");
  if (!mask) return;
  mask.classList.add("is-hidden");
  setTimeout(() => {
    mask.style.display = "none";
  }, 260);
}

function paintVersion_() {
  const el = qs("versionTag");
  if (el) el.textContent = CONFIG.VERSION;
}

let __bodyScrollTop = 0;

function lockBodyScroll_() {
  __bodyScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${__bodyScrollTop}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockBodyScroll_() {
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, __bodyScrollTop || 0);
}

window.__lockBodyScroll = lockBodyScroll_;
window.__unlockBodyScroll = unlockBodyScroll_;

/* ============================================================
   啟動
============================================================ */
(async function boot_() {
  try {
    showLoadingMask_();
    paintVersion_();
    bindShareButton_();
    bindInstallPrompt_();
    bindCustomerService_();
    bindInviteButtons_();
    bindAnnouncementModal_();
    initSelectionState_();

    await loadFacadeBaseCard();

    const cardId = normalizeId_(getIdFromUrl_()) || CONFIG.DEFAULT_ID;
    await loadCardById_(cardId);

    renderMainCard_(currentRow);
    renderFacadePreview();
    await fetchAndRenderAnnouncements_();

    hideLoadingMask_();
  } catch (err) {
    console.error("[HSC card] boot failed:", err);
    hideLoadingMask_();
    alert("載入資料失敗，請稍後再試");
  }
})();
