/* ============================================================
   天使幸福智慧名片館 app.js
   v8.3.5-perf-optimized

   效能優化項目（基於 v8.3.4）：
   1. 快取優先渲染（cache-first）
      - Shell 有快取時直接渲染，不等 GAS，首屏體感 < 200ms
      - 渲染後才背景 rehydrate（lite → full）
   2. 骨架屏（Skeleton UI）
      - 無快取時顯示 placeholder，避免空白閃爍
   3. 並行 fetch
      - 個人名片模式：shell fetch 與 announcements 並行
      - lite / full 也改為盡早發起，不等前一層完成
   4. fetch cache 策略
      - Shell / lite 改用 cache: "default"（瀏覽器可快取 GAS CDN response）
      - 寫入性 API 保留 no-store
   5. 門面模式：快取命中時跳過 loading mask
============================================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v8.3.5-perf-optimized",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel-namecard.letssyncus.com/",
  // 快取 TTL 設定
  CACHE_SHELL_MS:  5 * 60 * 1000,   // 5 分鐘
  CACHE_LITE_MS:   3 * 60 * 1000,   // 3 分鐘（更動較頻繁）
  CACHE_FULL_MS:   2 * 60 * 1000,   // 2 分鐘
};

const FACADE_SAMPLE_ID = "TW0001";

const BUILTIN_ANNOUNCEMENTS = [
  {
    id: "builtin-feature",
    title: "產品特色",
    content: `天使幸福智慧名片是一個專為創業者、講師、服務業與個人品牌打造的數位名片入口系統。

【核心特色】
1. 一頁整合：整合電話、LINE、網站、社群平台、影音與品牌介紹，一次呈現。
2. 行動門面：名片不只是聯絡資訊，而是你的品牌入口，讓客戶快速了解你。
3. 可分享可收藏：支援 QR Code、連結分享與手機收藏，讓客戶隨時找得到你。
4. 彈性設計：提供自由搭配款與精品設計款，依照個人風格打造專屬名片。
5. 持續更新：內容可隨時調整，讓名片永遠保持最新狀態。
6. 導流轉換：結合 CTA 按鈕，引導客戶聯繫、加 LINE 或前往服務頁。

天使幸福智慧名片館，幫你把「被看見」變成「被記住」。`,
    status: "active",
    priority: 10
  },
  {
    id: "builtin-flow",
    title: "申請流程",
    content: `【申請流程】
1. 先申請表單邀請碼
2. 複製申請內容
3. 加入 LINE 官方帳號提出申請
4. 客服提供邀請碼與表單連結
5. 完成填表後建立你的智慧名片

若想更快開始，也可直接先閱讀門面內容，再依指引完成申請。`,
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

/* ============================================================
   全域狀態
============================================================ */
let currentRow = null;
let facadeCurrentRow = null;
let deferredInstallPrompt = null;
let currentAvatarUrlCache = "";
let currentAvatarSourceKeyCache = "";
let currentReferralSourceCodeCache = "";
let currentInviteApplyCodeCache = "";
let currentInviteCopyTextCache = "";
let lastBottomQrRenderKey = "";
let lastFeatureQrRenderKey = "";
let lastFacadeQrRenderKey = "";

let announcementItems_ = [];
let announcementIndex_ = 0;
let announcementTimer_ = null;

let facadeBaseData = null;

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
function qs(id){ return document.getElementById(id); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v == null ? "" : String(v)).trim(); }

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if(/^TW\d{1,4}$/.test(v)){
    const n = v.replace(/^TW/i, "");
    return "TW" + n.padStart(4, "0");
  }
  return v;
}

function getSearchParams_(){
  try{ return new URLSearchParams(location.search || ""); }
  catch{ return new URLSearchParams(); }
}

function getIdFromUrl_(){
  try{
    const sp = getSearchParams_();
    return sp.get("id") || "";
  }catch{
    return "";
  }
}

function getRefFromUrl_(){
  try{
    const sp = getSearchParams_();
    return text(sp.get("ref") || "");
  }catch{
    return "";
  }
}

function normalizeUrl_(s){
  let v = String(s || "").trim();
  if(!v) return "";
  if(/^https?:\/\//i.test(v)) return v;
  if(/^www\./i.test(v)) return "https://" + v;
  if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
  return v;
}

function safeJsonParse_(rawText){
  let s = String(rawText || "").trim();
  if(!s) return null;
  s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
  try{ return JSON.parse(s); }catch{}
  const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if(m){ try{ return JSON.parse(m[0]); }catch{} }
  return null;
}

/* ──────────────────────────────────────────────────────────
   ★ 效能優化：fetchWithTimeout_ 加入 cache 策略參數
   - cacheMode: "default"（瀏覽器快取，適合 shell/lite）
   - cacheMode: "no-store"（強制新鮮，適合寫入後的確認）
────────────────────────────────────────────────────────── */
async function fetchWithTimeout_(url, timeoutMs, cacheMode = "no-store"){
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method: "GET",
      cache: cacheMode,
      redirect: "follow",
      signal: controller.signal
    });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if(!json) throw new Error("Not JSON");
    return json;
  }finally{
    clearTimeout(t);
  }
}

async function fetchJsonRobust_(url, { cacheMode = "no-store" } = {}){
  let last = null;
  for(let i = 0; i <= CONFIG.RETRY; i++){
    try{
      return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS, cacheMode);
    }catch(e){
      last = e;
      await new Promise(r => setTimeout(r, 520 + i * 520));
    }
  }
  throw last || new Error("Fetch failed");
}

function escapeHtml_(s){
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeHtmlWithBreaks_(s){
  return escapeHtml_(s).replace(/\n/g, "<br>");
}

function openUrl_(url){
  const u = normalizeUrl_(url);
  if(!u) return;
  window.open(u, "_blank");
}

function openMapByAddress_(addr){
  const a = text(addr);
  if(!a) return;
  const q = encodeURIComponent(a);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

function buildCardApiUrl_(id, opts = {}){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getCard");
  u.searchParams.set("id", cid);
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  if (opts.track_view !== undefined) u.searchParams.set("track_view", String(!!opts.track_view));
  if (opts.with_tracked_cta !== undefined) u.searchParams.set("with_tracked_cta", String(!!opts.with_tracked_cta));
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildCardPublicShellUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getCardPublicShell");
  u.searchParams.set("id", cid);
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  // ★ shell 不帶 ts（讓 GAS CDN 可快取相同 URL）
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildCardPublicLiteUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getCardPublicLite");
  u.searchParams.set("id", cid);
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function getCardCacheKey_(type, cardId){
  return `HSC_${type}_${normalizeId_(cardId) || CONFIG.DEFAULT_ID}`;
}

function readCardCache_(type, cardId, maxAgeMs){
  try{
    const raw = localStorage.getItem(getCardCacheKey_(type, cardId));
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(!parsed || !parsed.data) return null;
    if(maxAgeMs && Date.now() - Number(parsed.ts || 0) > maxAgeMs) return null;
    return parsed.data;
  }catch(_){ return null; }
}

function writeCardCache_(type, cardId, data){
  try{
    localStorage.setItem(getCardCacheKey_(type, cardId), JSON.stringify({ ts: Date.now(), data }));
  }catch(_){ }
}

function buildCreateRequestUrl_(refCode){
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "createRequest");
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  if(refCode) u.searchParams.set("ref", refCode);
  u.searchParams.set("source", "invite_gate_card");
  u.searchParams.set("note", "invite_gate_request");
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildLeadCreateUrl_(refCode){
  return buildCreateRequestUrl_(refCode);
}

function buildAnnouncementApiUrl_(){
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getAnnouncements");
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  // ★ 不帶 ts，讓瀏覽器可快取公告
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildNormalizedPayload_(obj){
  if(!obj || typeof obj !== "object") return obj;
  const out = { __raw: obj };
  const lower = Object.create(null);
  for(const k of Object.keys(obj)){
    const nk = String(k || "").trim();
    if(!nk) continue;
    const v = obj[k];
    if(out[nk] == null || text(out[nk]) === "") out[nk] = v;
    lower[nk.toLowerCase()] = v;
  }
  out.__lower = lower;
  return out;
}

function pick(p, keys){
  if(!p) return "";
  const lower = p.__lower || null;
  for(const k of keys){
    const kk = String(k || "").trim();
    const v1 = p[kk];
    if(v1 != null && text(v1) !== "") return v1;
    if(lower){
      const v2 = lower[String(kk).toLowerCase()];
      if(v2 != null && text(v2) !== "") return v2;
    }
  }
  return "";
}

function extractCardRow_(payload){
  if(!payload || typeof payload !== "object") return {};
  if(payload.item && typeof payload.item === "object") return payload.item;
  if(payload.row && typeof payload.row === "object") return payload.row;
  if(payload.card && typeof payload.card === "object") return payload.card;
  if(payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)){
    if(payload.data.item && typeof payload.data.item === "object") return payload.data.item;
    if(payload.data.row && typeof payload.data.row === "object") return payload.data.row;
    if(payload.data.card && typeof payload.data.card === "object") return payload.data.card;
    return payload.data;
  }
  if("id" in payload || "name" in payload || "plan" in payload || "avatar_url" in payload || "title" in payload){
    return payload;
  }
  return {};
}

function clampNumber_(value, min, max, fallback){
  const n = Number(value);
  if(Number.isFinite(n)){
    if(Number.isFinite(min) && n < min) return min;
    if(Number.isFinite(max) && n > max) return max;
    return n;
  }
  return fallback;
}

function normalizePreviewMeta_(raw){
  const meta = raw && typeof raw === "object" ? raw : {};
  const theme = text(meta.theme).toLowerCase();
  const layout = text(meta.layout).toLowerCase();
  const aspectRatio = text(meta.aspect_ratio || meta.aspectRatio).trim();
  const fitMode = text(meta.fit_mode || meta.fitMode).toLowerCase();
  return {
    theme: theme === "premium" || theme === "free" ? theme : DEFAULT_PREVIEW_META.theme,
    layout: layout === "single" ? "single" : DEFAULT_PREVIEW_META.layout,
    aspect_ratio: aspectRatio === "16:9" ? "16:9" : DEFAULT_PREVIEW_META.aspect_ratio,
    fit_mode: fitMode === "contain" ? "contain" : DEFAULT_PREVIEW_META.fit_mode
  };
}

function normalizeSinglePhotoMeta_(raw){
  const meta = raw && typeof raw === "object" ? raw : {};
  return {
    x: clampNumber_(meta.x, 0, 1, DEFAULT_PHOTO_META.x),
    y: clampNumber_(meta.y, 0, 1, DEFAULT_PHOTO_META.y),
    scale: clampNumber_(meta.scale, 0.5, 3, DEFAULT_PHOTO_META.scale),
    rotate: clampNumber_(meta.rotate, -180, 180, DEFAULT_PHOTO_META.rotate)
  };
}

function normalizePhotoMetaMap_(raw){
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for(let i = 1; i <= 10; i++){
    const key = `photo${i}`;
    out[key] = normalizeSinglePhotoMeta_(src[key]);
  }
  return out;
}

function normalizeCardFeatures(card){
  const src = card && typeof card === "object" ? card : {};
  let parsed = {};
  if(src.features && typeof src.features === "object"){
    parsed = src.features;
  }else{
    const fromJson = safeJsonParse_(src.features_json);
    if(fromJson && typeof fromJson === "object") parsed = fromJson;
  }
  const features = {
    photo_meta: normalizePhotoMetaMap_(parsed.photo_meta),
    preview_meta: normalizePreviewMeta_(parsed.preview_meta)
  };
  src.features = features;
  return src;
}

function normalizeForRenderer_(row){
  const out = { ...(row || {}) };
  if (!out.services && out.service) out.services = out.service;
  if (!out.slogan && out.subtitle) out.slogan = out.subtitle;
  if (!out.about && out.bio) out.about = out.bio;
  if (!out.experience && out.about) out.experience = out.about;
  if (!out.experience && out.bio) out.experience = out.bio;
  if (!out.line_url && out.line_id) out.line_url = out.line_id;
  if (!out.line_oa && out.line_id) out.line_oa = out.line_id;
  if (Array.isArray(out.photos)) {
    out.photos.forEach((url, idx) => {
      const n = idx + 1;
      if (n <= 10 && !out[`photo${n}_url`]) out[`photo${n}_url`] = url;
    });
  }
  if (Array.isArray(out.ctas)) {
    out.ctas.forEach((cta, idx) => {
      const n = idx + 1;
      if (n <= 3) {
        if (!out[`cta_text_${n}`]) out[`cta_text_${n}`] = cta?.text || "";
        if (!out[`cta_link_${n}`]) out[`cta_link_${n}`] = cta?.link || "";
      }
    });
  }
  if (typeof out.marquee_enabled === "boolean") {
    out.marquee_enabled = out.marquee_enabled ? "TRUE" : "";
  }
  return out;
}

function getPreviewMeta_(p){
  const features = p?.features || {};
  return normalizePreviewMeta_(features.preview_meta);
}

function getPhotoMeta_(p, key){
  const features = p?.features || {};
  const photoMetaMap = normalizePhotoMetaMap_(features.photo_meta);
  return photoMetaMap[key] || { ...DEFAULT_PHOTO_META };
}

function normalizePlan_(v){
  return text(v).toLowerCase() === "premium" ? "premium" : "free";
}

function getEffectiveTheme_(p){
  const preview = getPreviewMeta_(p);
  if(preview.theme === "premium" || preview.theme === "free") return preview.theme;
  return normalizePlan_(pick(p, ["plan"]));
}

function getPhotoLimitFromPayload_(p){
  const limit = Number(pick(p, ["photo_limit"]));
  if(!isNaN(limit) && limit > 0 && limit <= 10) return limit;
  const plan = getEffectiveTheme_(p);
  return PLAN_LIMITS[plan]?.maxPhotos || PLAN_LIMITS.free.maxPhotos;
}

/* ============================================================
   核心：目前有效資料來源
============================================================ */
function getActiveCardPayload_(){
  return facadeCurrentRow || currentRow || facadeBaseData || null;
}

function getReferralSourceCode_(p){
  const urlRef = getRefFromUrl_();
  if(urlRef) return urlRef;
  const active = p || getActiveCardPayload_();
  if(active){
    const code =
      text(pick(active, ["agent_id"])) ||
      text(pick(active, ["service_agent"])) ||
      text(pick(active, ["referrer"])) ||
      text(pick(active, ["id"]));
    if(code) return code;
  }
  return FACADE_SAMPLE_ID;
}

function getCardIdForShare_(p){
  const payload = p || getActiveCardPayload_();
  return (
    normalizeId_(text(pick(payload, ["id"]))) ||
    FACADE_SAMPLE_ID
  );
}

function getAgentIdForShare_(p){
  const payload = p || getActiveCardPayload_();
  return (
    text(pick(payload, ["service_agent"])) ||
    text(pick(payload, ["agent_id"])) ||
    text(pick(payload, ["share_agent_id"])) ||
    text(pick(payload, ["referrer"])) ||
    ""
  );
}

function buildTrackedShareUrl_(p){
  const cardId = getCardIdForShare_(p);
  const agentId = getAgentIdForShare_(p);
  try{
    const u = new URL(CONFIG.HUB_URL + "index.html");
    u.searchParams.set("id", cardId);
    u.searchParams.set("view", "1");
    u.searchParams.set("share_card_id", cardId);
    u.searchParams.set("share_agent_id", agentId);
    u.searchParams.set("share_source", "card_share");
    u.searchParams.set("share_channel", "product_card");
    u.searchParams.set("share_visit_id", "");
    return u.toString();
  }catch{
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

function buildHubShareUrl_(){
  try{
    const u = new URL(CONFIG.HUB_URL);
    const code = getReferralSourceCode_(getActiveCardPayload_());
    if(code) u.searchParams.set("ref", code);
    return u.toString();
  }catch{
    const code = getReferralSourceCode_(getActiveCardPayload_());
    return CONFIG.HUB_URL + (code ? ("?ref=" + encodeURIComponent(code)) : "");
  }
}

function buildInviteApplyText_(refCode, applyCode){
  const lines = [
    "您好，我想申請天使幸福智慧名片邀請碼。",
    "",
    `推薦來源識別碼：${text(refCode) || "無"}`,
    `申請單號：${text(applyCode) || "-"}`,
    "",
    "請協助我申請開通表單，謝謝。"
  ];
  return lines.join("\n");
}

async function ensureInviteApplyData_(){
  if(currentInviteApplyCodeCache && currentInviteCopyTextCache){
    return {
      refCode: currentReferralSourceCodeCache || "無",
      applyCode: currentInviteApplyCodeCache,
      copyText: currentInviteCopyTextCache
    };
  }
  const refCode = getReferralSourceCode_(getActiveCardPayload_());
  currentReferralSourceCodeCache = refCode || "";
  const payload = await fetchJsonRobust_(buildCreateRequestUrl_(refCode));
  if(!payload || payload.ok !== true){
    throw new Error(text(payload?.error) || "createRequest failed");
  }
  const applyCode = text(
    payload?.data?.request_id ||
    payload?.request_id ||
    payload?.data?.id ||
    payload?.id ||
    payload?.data?.request?.request_id ||
    payload?.request?.request_id ||
    ""
  );
  if(!applyCode){
    throw new Error("createRequest succeeded but request_id missing");
  }
  currentInviteApplyCodeCache = applyCode;
  currentInviteCopyTextCache = buildInviteApplyText_(refCode, applyCode);
  return {
    refCode: refCode || "無",
    applyCode,
    copyText: currentInviteCopyTextCache
  };
}

window.__ensureInviteApplyData = ensureInviteApplyData_;
window.__getReferralSourceCode = function(){ return getReferralSourceCode_(getActiveCardPayload_()); };

function normalizeImageUrl_(raw){
  let url = normalizeUrl_(raw);
  if(!url) return "";
  if(url.includes("dropbox.com")){
    url = url.replace("dl=0", "raw=1");
    if(!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
    return url;
  }
  if(url.includes("drive.google.com") && url.includes("/file/d/")){
    const m = url.match(/\/file\/d\/([^/]+)/i);
    if(m && m[1]) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;
  }
  return url;
}

function buildImgCandidates_(raw){
  const s = text(raw);
  if(!s) return [];
  const url = normalizeImageUrl_(s);
  const list = [url];
  if(url.includes("drive.google.com/uc?export=view&id=")){
    const m = url.match(/id=([^&]+)/i);
    if(m && m[1]){
      const id = decodeURIComponent(m[1]);
      list.push(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
      list.push(`https://drive.google.com/uc?export=download&id=${id}`);
    }
  }
  return [...new Set(list.filter(Boolean))];
}

function setImgWithFallback_(imgEl, candidates, options = {}){
  const list = (candidates || []).filter(Boolean);
  if(!imgEl){
    if(typeof options.onFail === "function") options.onFail();
    return;
  }
  if(!list.length){
    if(typeof options.onFail === "function") options.onFail();
    return;
  }
  let idx = 0;
  let done = false;
  imgEl.referrerPolicy = options.referrerPolicy || "no-referrer";
  try{ imgEl.crossOrigin = options.crossOrigin || "anonymous"; }catch{}
  const buildSrc = (src) => {
    const sep = src.includes("?") ? "&" : "?";
    return src + sep + "t=" + Date.now() + "&v=" + encodeURIComponent(CONFIG.VERSION);
  };
  const cleanup = () => { imgEl.onerror = null; imgEl.onload = null; };
  const failAll = () => {
    if(done) return;
    done = true;
    cleanup();
    if(typeof options.onFail === "function") options.onFail();
  };
  const tryNext = () => {
    if(done) return;
    idx++;
    if(idx >= list.length){ failAll(); return; }
    imgEl.src = buildSrc(list[idx]);
  };
  imgEl.onload = () => {
    if(done) return;
    done = true;
    cleanup();
    if(typeof options.onLoad === "function") options.onLoad();
  };
  imgEl.onerror = () => { tryNext(); };
  imgEl.src = buildSrc(list[0]);
}

/* ============================================================
   門面 state 對應工具（與原版相同，略）
============================================================ */
function mapFreeColorToTheme_(v){
  const raw = text(v).toLowerCase();
  const map = {
    "c1":"color-1","c2":"color-2","c3":"color-3","c4":"color-4","c5":"color-5",
    "color-1":"color-1","color-2":"color-2","color-3":"color-3","color-4":"color-4","color-5":"color-5"
  };
  return map[raw] || "color-1";
}
function mapStyleToUi_(v){
  const raw = text(v).toLowerCase();
  const map = { "s1":"arch","s2":"flat","s3":"spot","arch":"arch","flat":"flat","spot":"spot" };
  return map[raw] || "arch";
}
function mapPaperToUi_(v){
  const raw = text(v).toLowerCase();
  const map = { "f1":"paper-1","f2":"paper-2","f3":"paper-3","paper-1":"paper-1","paper-2":"paper-2","paper-3":"paper-3" };
  return map[raw] || "paper-1";
}
function mapPremiumToUi_(v){
  const raw = text(v).toLowerCase();
  const allow = ["p1","p2","p3","p4","p5","p6","p7"];
  return allow.includes(raw) ? raw : "p1";
}

/* ============================================================
   門面 UI 同步
============================================================ */
function syncThemeUI_(){
  const freeDots = qsa("#freeDotsRow .dot");
  const premiumDots = qsa("#premiumDotsRow .p-dot");
  if(facadeState.plan === "premium"){
    premiumDots.forEach(btn => {
      const expected = text(btn.getAttribute("aria-label"));
      if(expected === facadeState.premiumColor) btn.classList.add("active");
      else btn.classList.remove("active");
    });
    freeDots.forEach(btn => btn.classList.remove("active"));
  }else{
    freeDots.forEach(btn => {
      const map = { "dot-1":"c1","dot-2":"c2","dot-3":"c3","dot-4":"c4","dot-5":"c5" };
      const match = Object.keys(map).find(cls => btn.classList.contains(cls));
      if(match && map[match] === facadeState.color) btn.classList.add("active");
      else btn.classList.remove("active");
    });
    premiumDots.forEach(btn => btn.classList.remove("active"));
  }
}
function syncStyleUI_(){
  const buttons = qsa("#styleRow .btn-neo");
  buttons.forEach(btn => {
    const t = text(btn.textContent);
    const map = { "正拱":"s1","平直":"s2","晨曦":"s3" };
    const v = map[t] || "";
    if(v === facadeState.style) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}
function syncPaperUI_(){
  const buttons = qsa("#paperRow .btn-neo");
  buttons.forEach(btn => {
    const t = text(btn.textContent);
    const map = { "棉紙":"f1","象牙紙":"f2","霧灰":"f3" };
    const v = map[t] || "";
    if(v === facadeState.paper) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}
function applyFacadeBodyMode_(){
  const body = document.body;
  if(!body) return;
  body.classList.remove(
    "mode-free","mode-premium",
    "color-1","color-2","color-3","color-4","color-5",
    "p1","p2","p3","p4","p5","p6","p7",
    "style-arch","style-flat","style-spot",
    "paper-1","paper-2","paper-3"
  );
  if(facadeState.plan === "premium"){
    body.classList.add("mode-premium", mapPremiumToUi_(facadeState.premiumColor));
  }else{
    body.classList.add(
      "mode-free",
      mapFreeColorToTheme_(facadeState.color),
      "style-" + mapStyleToUi_(facadeState.style),
      mapPaperToUi_(facadeState.paper)
    );
  }
}
function syncPlanUI_(){
  const freeBtn = qs("btnPlanFree");
  const premBtn = qs("btnPlanPremium");
  const freeControls = qs("free-controls");
  const premiumControls = qs("premium-controls");
  if(facadeState.plan === "premium"){
    if(freeControls) freeControls.style.display = "none";
    if(premiumControls) premiumControls.style.display = "";
    if(freeBtn) freeBtn.classList.remove("active");
    if(premBtn) premBtn.classList.add("active");
  }else{
    if(premiumControls) premiumControls.style.display = "none";
    if(freeControls) freeControls.style.display = "";
    if(premBtn) premBtn.classList.remove("active");
    if(freeBtn) freeBtn.classList.add("active");
  }
  syncThemeUI_();
  syncStyleUI_();
  syncPaperUI_();
  applyFacadeBodyMode_();
}
function initSelectionState_(){ syncPlanUI_(); }

/* ──────────────────────────────────────────────────────────
   ★ 骨架屏：快取未命中時，先填入 placeholder 讓使用者感知頁面在動
────────────────────────────────────────────────────────── */
function renderSkeletonUI_(){
  const nameEl = qs("u-name");
  const titleEl = qs("u-title");
  const unitEl = qs("u-unit");
  if(nameEl && !nameEl.textContent.trim()){
    nameEl.textContent = "載入中…";
    nameEl.style.opacity = "0.4";
  }
  if(titleEl && !titleEl.textContent.trim()){
    titleEl.textContent = "—";
    titleEl.style.opacity = "0.3";
  }
  // 讓卡片容器有基礎高度，避免 layout shift
  const card = document.querySelector("#livePreviewCard .card");
  if(card) card.style.minHeight = "360px";
}

function clearSkeletonUI_(){
  const nameEl = qs("u-name");
  const titleEl = qs("u-title");
  if(nameEl) nameEl.style.opacity = "";
  if(titleEl) titleEl.style.opacity = "";
  const card = document.querySelector("#livePreviewCard .card");
  if(card) card.style.minHeight = "";
}

/* ============================================================
   門面資料：優先快取，背景 rehydrate
============================================================ */
async function loadFacadeBaseCard(){
  const cardId = FACADE_SAMPLE_ID;

  // ── 快取優先：有快取直接渲染，不等 GAS ──
  const cached = readCardCache_("shell", cardId, CONFIG.CACHE_SHELL_MS);
  if(cached){
    _applyShellToFacade_(cached, cardId);
    // 背景靜默更新快取（不 await，不阻塞渲染）
    _refreshShellInBackground_(cardId);
    return; // 快取命中，立即返回
  }

  // 無快取：顯示骨架屏，再等 GAS
  renderSkeletonUI_();
  const shellPayload = await fetchJsonRobust_(buildCardPublicShellUrl_(cardId), { cacheMode: "default" });
  const shell = extractCardRow_(shellPayload);
  if(!shell || typeof shell !== "object" || !Object.keys(shell).length){
    throw new Error("門面樣品卡 shell 資料為空");
  }
  writeCardCache_("shell", cardId, shell);
  clearSkeletonUI_();
  _applyShellToFacade_(shell, cardId);
}

// 將 shell 資料套用到 facadeBaseData 並同步 UI
function _applyShellToFacade_(shell, cardId){
  facadeBaseData = buildNormalizedPayload_(normalizeCardFeatures(shell));
  const basePlan = getEffectiveTheme_(facadeBaseData);
  if(basePlan === "premium"){
    facadeState.plan = "premium";
    facadeState.premiumColor = text(pick(facadeBaseData, ["color"])) || "p1";
  }else{
    facadeState.plan = "free";
    facadeState.color = text(pick(facadeBaseData, ["color"])) || "c1";
    facadeState.style = text(pick(facadeBaseData, ["style"])) || "s1";
    facadeState.paper = text(pick(facadeBaseData, ["paper"])) || "f1";
  }
  syncPlanUI_();

  // ★ 背景載入 lite，不阻塞首屏
  _loadLiteInBackground_(cardId);
}

// 背景重新抓 shell（更新快取，不觸發渲染，除非資料有變）
async function _refreshShellInBackground_(cardId){
  try{
    const shellPayload = await fetchJsonRobust_(buildCardPublicShellUrl_(cardId), { cacheMode: "default" });
    const shell = extractCardRow_(shellPayload);
    if(!shell || !Object.keys(shell).length) return;
    writeCardCache_("shell", cardId, shell);
    // 若核心欄位有變化，補渲染一次
    const merged = normalizeCardFeatures({ ...(facadeBaseData?.__raw || {}), ...shell });
    facadeBaseData = buildNormalizedPayload_(merged);
    // 靜默更新，不強制重渲染（避免畫面閃爍）
  }catch(_){ /* 背景失敗靜默 */ }
}

// 背景載入 lite，完成後 merge 並補渲染
async function _loadLiteInBackground_(cardId){
  try{
    const litePayload = await fetchJsonRobust_(buildCardPublicLiteUrl_(cardId), { cacheMode: "default" });
    const lite = extractCardRow_(litePayload);
    if(!lite || typeof lite !== "object" || !Object.keys(lite).length) return;
    writeCardCache_("lite", cardId, lite);
    const merged = normalizeCardFeatures({ ...(facadeBaseData?.__raw || facadeBaseData || {}), ...lite });
    facadeBaseData = buildNormalizedPayload_(merged);
    renderFacadePreview();
  }catch(err){
    console.warn("[HSC facade] lite load failed:", err);
  }
}

function buildFacadePreviewData(){
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

/* ============================================================
   ★ 個人名片模式（cache-first + 並行 fetch）
============================================================ */
async function loadCardById_(cardId, opts = {}){
  const useTracked = !!opts.useTracked;
  const url = buildCardApiUrl_(cardId, {
    track_view: useTracked,
    with_tracked_cta: useTracked
  });
  const payload = await fetchJsonRobust_(url);
  const row = extractCardRow_(payload);
  if(!row || typeof row !== "object" || !Object.keys(row).length){
    throw new Error("名片資料為空，id=" + cardId);
  }
  writeCardCache_("full", cardId, row);
  return normalizeCardFeatures(row);
}

async function renderPersonalCard_(cardId){
  const root = qs("livePreviewCard");
  if(!root) throw new Error("找不到 #livePreviewCard");
  const rendererApi = window.HscCardRenderer || window.HSCCardRenderer || null;
  if(!rendererApi || typeof rendererApi.renderCard !== "function") throw new Error("card-renderer.js 未正確載入");

  // ── ★ cache-first：有快取立即渲染，同時並行發起 shell fetch ──
  const cachedShell = readCardCache_("shell", cardId, CONFIG.CACHE_SHELL_MS);

  // shell fetch 與 announcements 並行發起（不互相等待）
  const shellFetchPromise = cachedShell
    ? Promise.resolve(cachedShell)
    : fetchJsonRobust_(buildCardPublicShellUrl_(cardId), { cacheMode: "default" })
        .then(p => {
          const r = extractCardRow_(p);
          if(r && Object.keys(r).length) writeCardCache_("shell", cardId, r);
          return r;
        });

  let shell;
  if(cachedShell){
    shell = cachedShell;
    // 快取命中，背景更新 shell
    shellFetchPromise.catch(() => {});
  }else{
    shell = await shellFetchPromise;
    if(!shell || typeof shell !== "object" || !Object.keys(shell).length){
      throw new Error("名片 shell 資料為空，id=" + cardId);
    }
  }

  // 首屏渲染（用 shell 資料）
  const shellP = buildNormalizedPayload_(normalizeCardFeatures(normalizeForRenderer_(shell)));
  const shareUrl = buildTrackedShareUrl_(shellP);
  shell.card_url = shareUrl;
  shell.share_url = shareUrl;
  shell.preview_url = shareUrl;
  const normalizedShell = buildNormalizedPayload_(normalizeCardFeatures(normalizeForRenderer_(shell)));

  const result = rendererApi.renderCard(normalizedShell, {
    mode: "index",
    root,
    useExistingDom: true,
    qrMode: "card",
    allowActions: true,
    cardUrl: shareUrl,
    shareUrl: shareUrl,
    previewUrl: shareUrl
  });
  if(!result || result.ok !== true) throw new Error("renderer 回傳失敗");

  currentRow = normalizedShell;
  facadeCurrentRow = normalizedShell;
  window.__CARD_DATA__ = normalizedShell;
  window.cardData = normalizedShell;
  const avatarInfo = pickAvatarInfo_(normalizedShell);
  currentAvatarUrlCache = avatarInfo.url || "";
  currentAvatarSourceKeyCache = avatarInfo.key || "";
  renderShellUiFriendly_(normalizedShell, root);

  // ── ★ lite & full 並行發起，不再串行等待 ──
  const cachedLite = readCardCache_("lite", cardId, CONFIG.CACHE_LITE_MS);
  const liteFetchPromise = cachedLite
    ? Promise.resolve(cachedLite)
    : fetchJsonRobust_(buildCardPublicLiteUrl_(cardId), { cacheMode: "default" })
        .then(p => {
          const r = extractCardRow_(p);
          if(r && Object.keys(r).length) writeCardCache_("lite", cardId, r);
          return r;
        });

  // full 在 lite 之後 60ms 發起，錯開 GAS 並發
  const fullFetchPromise = new Promise(resolve => {
    setTimeout(() => {
      loadCardById_(cardId, { useTracked: false })
        .then(resolve)
        .catch(() => resolve(null));
    }, 60);
  });

  // lite 完成後更新 UI
  liteFetchPromise.then(lite => {
    if(!lite || typeof lite !== "object" || !Object.keys(lite).length) return;
    const merged = normalizeForRenderer_({ ...shell, ...lite, card_url: shareUrl, share_url: shareUrl, preview_url: shareUrl });
    if(typeof rendererApi.mergeCardData === "function"){
      rendererApi.mergeCardData(merged, { mode:"index", root, useExistingDom:true, qrMode:"card", allowActions:true, cardUrl:shareUrl, shareUrl:shareUrl, previewUrl:shareUrl });
    }else{
      rendererApi.renderCard(merged, { mode:"index", root, useExistingDom:true, qrMode:"card", allowActions:true, cardUrl:shareUrl, shareUrl:shareUrl, previewUrl:shareUrl });
    }
    const normalizedMerged = buildNormalizedPayload_(normalizeCardFeatures(normalizeForRenderer_(merged)));
    currentRow = normalizedMerged;
    facadeCurrentRow = normalizedMerged;
    window.__CARD_DATA__ = normalizedMerged;
    window.cardData = normalizedMerged;
    renderPostRendererUi_(normalizedMerged, root);
  }).catch(err => { console.warn("[HSC card] lite load failed:", err); });

  // full 完成後補填詳細欄位
  fullFetchPromise.then(fullRow => {
    if(!fullRow) return;
    const liteMerged = { ...shell, ...fullRow, card_url: shareUrl, share_url: shareUrl, preview_url: shareUrl };
    const mergedFull = normalizeForRenderer_(liteMerged);
    if(typeof rendererApi.mergeCardData === "function"){
      rendererApi.mergeCardData(mergedFull, { mode:"index", root, useExistingDom:true, qrMode:"card", allowActions:true, cardUrl:shareUrl, shareUrl:shareUrl, previewUrl:shareUrl });
    }
    const normalizedFull = buildNormalizedPayload_(normalizeCardFeatures(normalizeForRenderer_(mergedFull)));
    currentRow = normalizedFull;
    facadeCurrentRow = normalizedFull;
    window.__CARD_DATA__ = normalizedFull;
    window.cardData = normalizedFull;
    renderPostRendererUi_(normalizedFull, root);

    const blockService = root.querySelector("#block-service") || qs("block-service");
    const blockExp = root.querySelector("#block-exp") || qs("block-exp");
    renderExpandableInfoBlock_(blockService, "服務項目", pick(normalizedFull, ["services","服務項目","service"]), 2);
    renderExpandableInfoBlock_(blockExp, "經歷 / 品牌故事", pick(normalizedFull, ["experience","經歷","exp"]), 3);
  });
}

/* ============================================================
   QR Slot
============================================================ */
const HSC_QR = (() => {
  const registry = new Map();

  function hasQrContent(el){
    if(!el) return false;
    return !!el.querySelector("canvas, img, table");
  }
  function clearHost(el){ if(!el) return; el.innerHTML = ""; }
  function resolveHost(slotKey){
    const hostIdMap = { "facadeQrGrid":"facadeQrGrid","featureQrGrid":"featureQrGrid","bottomQrGrid":"bottomQrGrid" };
    const fallbackIdMap = { "facadeQrGrid":"facadeQrFallback","featureQrGrid":"featureQrFallback","bottomQrGrid":"bottomQrFallback" };
    const hostId = hostIdMap[slotKey];
    const fallbackId = fallbackIdMap[slotKey];
    let host = hostId ? document.getElementById(hostId) : null;
    let fallback = fallbackId ? document.getElementById(fallbackId) : null;
    if(!host){
      const dataMap = { "featureQrGrid":"[data-feature-qr-grid]","bottomQrGrid":"[data-bottom-qr-grid]" };
      const sel = dataMap[slotKey];
      if(sel) host = document.querySelector(sel);
    }
    return { host, fallback };
  }
  function ensureSlot(slotKey){
    if(!registry.has(slotKey)){
      registry.set(slotKey, { slotKey, url: "", renderKey: "", renderVersion: 0, busy: false });
    }
    return registry.get(slotKey);
  }
  function bindSlot(slotKey){ return ensureSlot(slotKey); }
  function showFallback(fallbackEl){ if(!fallbackEl) return; fallbackEl.hidden = false; fallbackEl.style.display = ""; }
  function hideFallback(fallbackEl){ if(!fallbackEl) return; fallbackEl.hidden = true; fallbackEl.style.display = "none"; }
  function defaultRenderKey(scope, rowId, styleKey, url){ return [text(scope), text(rowId), text(styleKey), text(url)].join("::"); }

  function scheduleRender(slotKey, payload = {}){
    const slot = ensureSlot(slotKey);
    const { host, fallback } = resolveHost(slotKey);
    if(!host) return false;
    const url = text(payload.url);
    const renderKey = text(payload.renderKey);
    const force = !!payload.force;
    if(!url){ clearHost(host); showFallback(fallback); return false; }
    if(!force && slot.url === url && slot.renderKey === renderKey && hasQrContent(host)){ hideFallback(fallback); return true; }
    slot.url = url;
    slot.renderKey = renderKey;
    slot.renderVersion += 1;
    renderSlot_(slot, host, fallback, payload);
    return true;
  }

  function renderSlot_(slot, host, fallback, payload = {}){
    if(!host) return;
    if(slot.busy && !payload.force) return;
    slot.busy = true;
    const currentVersion = slot.renderVersion;
    try{
      hideFallback(fallback);
      clearHost(host);
      const centerImgEl = payload.centerImgEl || null;
      const centerImgUrl = payload.centerImgUrl || "";
      const centerSizeRatio = payload.centerSizeRatio || 0.09;
      const size = Number(payload.size || 160);
      const ok = renderQr({ container: host, url: slot.url, size, centerImgEl, centerImgUrl, centerSizeRatio, renderKey: slot.renderKey });
      if(!ok){ showFallback(fallback); }else{ hideFallback(fallback); }
      const checkAndRehydrate = (reason) => {
        if(slot.renderVersion !== currentVersion) return;
        const { host: freshHost, fallback: freshFallback } = resolveHost(slot.slotKey);
        if(!freshHost) return;
        if(!hasQrContent(freshHost)){
          showFallback(freshFallback);
          scheduleRender(slot.slotKey, { ...payload, url: slot.url, renderKey: slot.renderKey, force: true, reason });
        }else{ hideFallback(freshFallback); }
      };
      requestAnimationFrame(() => checkAndRehydrate("raf-rehydrate"));
      setTimeout(() => checkAndRehydrate("timeout-rehydrate-180"), 180);
      setTimeout(() => checkAndRehydrate("timeout-rehydrate-520"), 520);
    }catch(_err){ showFallback(fallback); }
    finally{ slot.busy = false; }
  }
  return { bindSlot, scheduleRender, hasQrContent, defaultRenderKey };
})();

/* ============================================================
   到期倒數
============================================================ */
function formatDateYmd_(date){
  if(!(date instanceof Date) || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}
function parseDateSafe_(value){
  if(!value) return null;
  const s = String(value).trim();
  if(!s) return null;
  const normalized = s.replace(/\//g, "-").replace(" ", "T").replace(/(\.\d+)?Z$/i, "");
  let d = new Date(normalized);
  if(!isNaN(d.getTime())) return d;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){ d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999); if(!isNaN(d.getTime())) return d; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if(m){ d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0), 0); if(!isNaN(d.getTime())) return d; }
  return null;
}
function getExpiryInfo_(p){
  const payload = p || {};
  const billingStatus = text(pick(payload, ["billing_status","billingStatus","payment_status","paymentStatus","付款狀態","狀態"])).toLowerCase();
  const expiresAtRaw = text(pick(payload, ["expires_at","expiresAt","expiry_date","expiryDate","expiry","expire_at","expireAt","到期日","有效期限"]));
  const paymentDueRaw = text(pick(payload, ["payment_due_at","paymentDueAt","payment_due","paymentDue","due_date","dueDate","付款期限","繳費期限"]));
  const expiresAt = parseDateSafe_(expiresAtRaw);
  const paymentDueAt = parseDateSafe_(paymentDueRaw);
  if(billingStatus === "unpaid" && paymentDueAt) return { type: "payment_due", date: paymentDueAt, raw: paymentDueRaw };
  if(expiresAt) return { type: "expires_at", date: expiresAt, raw: expiresAtRaw };
  if(paymentDueAt) return { type: "payment_due", date: paymentDueAt, raw: paymentDueRaw };
  return null;
}
function renderCardExpiry_(p, rootEl){
  let el = null;
  if(rootEl instanceof HTMLElement){
    el = rootEl.querySelector("#cardExpiry") || rootEl.querySelector(".card-expiry");
  }
  if(!el) el = qs("cardExpiry");
  if(!el){
    const infoScroll = rootEl ? rootEl.querySelector(".info-scroll") : document.querySelector("#livePreviewCard .info-scroll");
    if(infoScroll){
      el = document.createElement("div");
      el.className = "card-expiry";
      el.id = "cardExpiry";
      const qrBottom = infoScroll.querySelector(".qr-bottom, [data-bottom-qr-section]");
      if(qrBottom) infoScroll.insertBefore(el, qrBottom);
      else infoScroll.appendChild(el);
    }
  }
  if(!el) return;
  const info = getExpiryInfo_(p);
  if(!info || !info.date){ el.style.display = "none"; el.textContent = ""; el.removeAttribute("title"); el.classList.remove("is-expired"); return; }
  const target = info.date;
  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.floor((targetStart - nowStart) / 86400000);
  let label = "";
  if(info.type === "payment_due"){
    if(diffDays < 0){ label = `付款期限已過 ${Math.abs(diffDays)} 天`; el.classList.add("is-expired"); }
    else if(diffDays === 0){ label = "付款期限今天截止"; el.classList.remove("is-expired"); }
    else if(diffDays === 1){ label = "付款期限剩 1 天"; el.classList.remove("is-expired"); }
    else{ label = `付款期限剩 ${diffDays} 天`; el.classList.remove("is-expired"); }
    el.title = `付款期限：${formatDateYmd_(target)}`;
  }else{
    if(diffDays < 0){ label = diffDays === -1 ? "EXPIRED 1 DAY AGO" : `EXPIRED ${Math.abs(diffDays)} DAYS AGO`; el.classList.add("is-expired"); }
    else if(diffDays === 0){ label = "EXPIRES TODAY"; el.classList.remove("is-expired"); }
    else if(diffDays === 1){ label = "EXPIRES IN 1 DAY"; el.classList.remove("is-expired"); }
    else{ label = `EXPIRES IN ${diffDays} DAYS`; el.classList.remove("is-expired"); }
    el.title = `Expiry Date: ${formatDateYmd_(target)}`;
  }
  el.textContent = label;
  el.style.display = "block";
}

/* ============================================================
   門面樣品渲染
============================================================ */
function renderFacadePreview(){
  const root = qs("livePreviewCard");
  if(!root || !facadeBaseData) return;
  applyFacadeBodyMode_();
  const data = normalizeForRenderer_(buildFacadePreviewData());
  const renderer =
    window.HscCardRenderer && typeof window.HscCardRenderer.renderCard === "function"
      ? window.HscCardRenderer.renderCard
      : null;
  if(!renderer) throw new Error("card-renderer.js 尚未正確載入，找不到 HscCardRenderer.renderCard()");
  const result = renderer(data, { mode: "index", root, useExistingDom: true, qrMode: "facade", allowActions: true });
  if(!result || result.ok !== true) throw new Error("門面 renderer 回傳失敗");
  facadeCurrentRow = buildNormalizedPayload_(data || {});
  currentReferralSourceCodeCache = getReferralSourceCode_(facadeCurrentRow);
  window.__CARD_DATA__ = facadeCurrentRow;
  window.cardData = facadeCurrentRow;
  window.payload = facadeCurrentRow;
  const avatarInfo = pickAvatarInfo_(facadeCurrentRow);
  currentAvatarUrlCache = avatarInfo.url || "";
  currentAvatarSourceKeyCache = avatarInfo.key || "";
  window.__facadeQrUrl = buildHubShareUrl_();
  window.__facadeStyleKey = facadeState.plan === "premium"
    ? facadeState.premiumColor
    : `${facadeState.color}|${facadeState.style}|${facadeState.paper}`;
  renderPostRendererUi_(facadeCurrentRow, root);
  requestAnimationFrame(() => { try{ rerenderAllQrAfterFacade_(); }catch(_e){} });
}

/* ============================================================
   門面切換事件
============================================================ */
window.setPlan = function(plan, el){
  facadeState.plan = (plan === "premium") ? "premium" : "free";
  syncPlanUI_();
  if(el){
    const planBtns = [qs("btnPlanFree"), qs("btnPlanPremium")].filter(Boolean);
    planBtns.forEach(btn => { if(btn === el) btn.classList.add("active"); else btn.classList.remove("active"); });
  }
  renderFacadePreview();
};
window.setTheme = function(theme, el){
  const v = text(theme).toLowerCase();
  if(!v) return;
  const freeMap = { "color-1":"c1","color-2":"c2","color-3":"c3","color-4":"c4","color-5":"c5","c1":"c1","c2":"c2","c3":"c3","c4":"c4","c5":"c5" };
  if(v in freeMap){ facadeState.plan = "free"; facadeState.color = freeMap[v]; }
  else if(/^p\d+$/.test(v)){ facadeState.plan = "premium"; facadeState.premiumColor = v; }
  syncPlanUI_();
  if(el){
    const groupSel = facadeState.plan === "premium" ? "#premiumDotsRow .p-dot" : "#freeDotsRow .dot";
    qsa(groupSel).forEach(btn => { if(btn === el) btn.classList.add("active"); else btn.classList.remove("active"); });
  }
  renderFacadePreview();
};
window.setStyle = function(style, el){
  const raw = text(style).toLowerCase();
  const map = { "arch":"s1","flat":"s2","spot":"s3","s1":"s1","s2":"s2","s3":"s3" };
  if(!(raw in map)) return;
  facadeState.style = map[raw];
  syncStyleUI_();
  if(el){ qsa("#styleRow .btn-neo").forEach(btn => { if(btn === el) btn.classList.add("active"); else btn.classList.remove("active"); }); }
  renderFacadePreview();
};
window.setPaper = function(paper, el){
  const raw = text(paper).toLowerCase();
  const map = { "paper-1":"f1","paper-2":"f2","paper-3":"f3","f1":"f1","f2":"f2","f3":"f3" };
  if(!(raw in map)) return;
  facadeState.paper = map[raw];
  syncPaperUI_();
  if(el){ qsa("#paperRow .btn-neo").forEach(btn => { if(btn === el) btn.classList.add("active"); else btn.classList.remove("active"); }); }
  renderFacadePreview();
};

/* ============================================================
   展開文字
============================================================ */
function normalizeLongText_(raw){
  return String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function setExpandableText_(contentEl, toggleEl, rawText, maxLines, options = {}){
  if(!contentEl) return;
  const value = normalizeLongText_(rawText);
  const hasText = text(value) !== "";
  const allowMultiline = !!options.allowMultiline;
  contentEl.dataset.raw = value;
  contentEl.dataset.maxLines = String(maxLines || 3);
  contentEl.dataset.expandable = "1";
  if(allowMultiline){ contentEl.innerHTML = escapeHtmlWithBreaks_(value); contentEl.classList.add("preline"); }
  else{ contentEl.textContent = value; contentEl.classList.remove("preline"); }
  contentEl.classList.remove("is-expanded");
  contentEl.classList.add("is-collapsed");
  contentEl.style.setProperty("--max-lines", String(maxLines || 3));
  if(toggleEl){
    toggleEl.type = "button";
    toggleEl.textContent = "看更多";
    toggleEl.style.display = "none";
    toggleEl.setAttribute("aria-expanded", "false");
    toggleEl.onclick = null;
    toggleEl.onclick = () => {
      const expanded = contentEl.classList.contains("is-expanded");
      if(expanded){ contentEl.classList.remove("is-expanded"); contentEl.classList.add("is-collapsed"); toggleEl.textContent = "看更多"; toggleEl.setAttribute("aria-expanded", "false"); }
      else{ contentEl.classList.remove("is-collapsed"); contentEl.classList.add("is-expanded"); toggleEl.textContent = "收合"; toggleEl.setAttribute("aria-expanded", "true"); }
    };
  }
  if(!hasText){ if(toggleEl) toggleEl.style.display = "none"; return; }
  requestAnimationFrame(() => { refreshExpandableItem_(contentEl, toggleEl); });
}
function refreshExpandableItem_(contentEl, toggleEl){
  if(!contentEl) return;
  const maxLines = Number(contentEl.dataset.maxLines || 3);
  const wasExpanded = contentEl.classList.contains("is-expanded");
  contentEl.classList.remove("is-expanded"); contentEl.classList.add("is-collapsed");
  contentEl.style.setProperty("--max-lines", String(maxLines));
  const needToggle = (contentEl.scrollHeight - contentEl.clientHeight) > 4;
  if(toggleEl){
    toggleEl.style.display = needToggle ? "inline-flex" : "none";
    if(!needToggle){ toggleEl.textContent = "看更多"; toggleEl.setAttribute("aria-expanded", "false"); }
  }
  if(needToggle && wasExpanded){
    contentEl.classList.remove("is-collapsed"); contentEl.classList.add("is-expanded");
    if(toggleEl){ toggleEl.textContent = "收合"; toggleEl.setAttribute("aria-expanded", "true"); }
  }
}
function refreshAllExpandable_(){ qsa("[data-expandable='1']").forEach(contentEl => { const wrap = contentEl.closest(".expandable-wrap") || contentEl.parentElement; const toggleEl = wrap ? wrap.querySelector(".expand-toggle") : null; refreshExpandableItem_(contentEl, toggleEl); }); }

let __expandRefreshTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(__expandRefreshTimer);
  __expandRefreshTimer = setTimeout(() => { refreshAllExpandable_(); applySmartBalanceAll_(); updateQrCenterSizes_(); }, 120);
});

function renderExpandableInfoBlock_(blockEl, title, rawText, maxLines){
  if(!blockEl) return;
  const value = normalizeLongText_(rawText);
  if(!text(value)){ blockEl.style.display = "none"; blockEl.innerHTML = ""; return; }
  blockEl.style.display = "";
  blockEl.innerHTML = `
    <div class="block-title">${escapeHtml_(title)}</div>
    <div class="expandable-wrap">
      <div class="block-body expandable-text is-collapsed preline" style="--max-lines:${Number(maxLines || 3)}"></div>
      <button class="expand-toggle" type="button" style="display:none;">看更多</button>
    </div>`;
  const contentEl = blockEl.querySelector(".expandable-text");
  const toggleEl = blockEl.querySelector(".expand-toggle");
  setExpandableText_(contentEl, toggleEl, value, maxLines, { allowMultiline: true });
}

function pickAvatarInfo_(p){
  const url = pick(p, ["avatar_url"]);
  if(text(url)) return { key: "avatar_url", raw: url, url: normalizeImageUrl_(url) };
  return { key: "", raw: "", url: "" };
}

/* ============================================================
   公告（並行載入，不阻塞門面渲染）
============================================================ */
function parseDateLoose_(value){
  if(!value) return null;
  const s = String(value).trim();
  if(!s) return null;
  let d = new Date(s.replace(/\//g, "-").replace(" ", "T"));
  if(!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){ d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0); if(!isNaN(d.getTime())) return d; }
  return null;
}
function isAnnouncementActive_(item){
  const status = text(item.status || "active").toLowerCase();
  if(status && status !== "active") return false;
  const now = Date.now();
  const startAt = parseDateLoose_(item.start_at);
  const endAt = parseDateLoose_(item.end_at);
  if(startAt && now < startAt.getTime()) return false;
  if(endAt){ const endMs = new Date(endAt.getFullYear(), endAt.getMonth(), endAt.getDate(), 23, 59, 59, 999).getTime(); if(now > endMs) return false; }
  return true;
}
function sortAnnouncements_(items){
  return [...items].sort((a, b) => {
    const pa = Number(a.priority || 0), pb = Number(b.priority || 0);
    if(pb !== pa) return pb - pa;
    const ta = parseDateLoose_(a.updated_at || a.created_at || a.start_at || "")?.getTime() || 0;
    const tb = parseDateLoose_(b.updated_at || b.created_at || b.start_at || "")?.getTime() || 0;
    return tb - ta;
  });
}
function normalizeAnnouncementItems_(payload){
  if(Array.isArray(payload)) return payload.filter(x => x && typeof x === "object");
  if(!payload || typeof payload !== "object") return [];
  const arr =
    (Array.isArray(payload.announcements) ? payload.announcements : null) ||
    (Array.isArray(payload.items) ? payload.items : null) ||
    (Array.isArray(payload.data) ? payload.data : null) ||
    (Array.isArray(payload.rows) ? payload.rows : null) || [];
  return arr.filter(x => x && typeof x === "object");
}
function openAnnouncementModal_(item, currentIdx, total){
  if(!item) return;
  const mask = qs("announcementMask");
  const titleEl = qs("announcementModalTitle");
  const metaEl = qs("announcementModalMeta");
  const bodyEl = qs("announcementModalBody");
  if(!mask || !bodyEl) return;
  if(titleEl) titleEl.innerHTML = `<i class="fa-solid fa-bullhorn"></i> ${escapeHtml_(item.title || "公告")}`;
  if(metaEl){ let s = "門面公告"; if(total > 1) s += `　${(currentIdx||0)+1} / ${total}`; metaEl.textContent = s; }
  if(bodyEl) bodyEl.textContent = text(item.content || "（無內容）");
  mask.style.display = "flex";
  mask.setAttribute("aria-hidden", "false");
  if(typeof window.__lockBodyScroll === "function") window.__lockBodyScroll();
}
function closeAnnouncementModal_(){
  const mask = qs("announcementMask");
  if(!mask) return;
  mask.style.display = "none";
  mask.setAttribute("aria-hidden", "true");
  if(typeof window.__unlockBodyScroll === "function") window.__unlockBodyScroll();
}
function bindAnnouncementModal_(){
  const closeBtn = qs("announcementCloseBtn");
  const mask = qs("announcementMask");
  if(closeBtn) closeBtn.addEventListener("click", closeAnnouncementModal_);
  if(mask) mask.addEventListener("click", function(e){ if(e.target === mask) closeAnnouncementModal_(); });
}
function paintAnnouncementCards_(items, idx){
  const item = items[idx];
  if(!item) return;
  const total = items.length;
  qsa("[data-announcement-panel]").forEach(panel => {
    const titleEl = panel.querySelector("[data-announcement-title]");
    const textEl = panel.querySelector("[data-announcement-text]");
    const counterEl = panel.querySelector("[data-announcement-counter]");
    const trackBtn = panel.querySelector("[data-announcement-track]");
    if(titleEl) titleEl.textContent = text(item.title) || "公告";
    if(textEl){ const s = text(item.content || "").split("\n")[0].slice(0, 60); textEl.textContent = s + (text(item.content || "").length > 60 ? "⋯" : ""); }
    if(counterEl) counterEl.textContent = total > 1 ? `${idx + 1} / ${total}` : "";
    if(trackBtn){ trackBtn.onclick = null; trackBtn.onclick = () => openAnnouncementModal_(item, idx, total); }
  });
}
function stopAnnouncementRotation_(){
  if(announcementTimer_){ clearInterval(announcementTimer_); announcementTimer_ = null; }
}
function startAnnouncementRotation_(items){
  stopAnnouncementRotation_();
  announcementItems_ = items;
  announcementIndex_ = 0;
  paintAnnouncementCards_(items, 0);
  if(items.length > 1){
    announcementTimer_ = setInterval(() => {
      announcementIndex_ = (announcementIndex_ + 1) % items.length;
      paintAnnouncementCards_(items, announcementIndex_);
    }, 4000);
  }
}
function renderAnnouncementPanels_(items){
  const active = sortAnnouncements_(items.filter(isAnnouncementActive_));
  if(!active.length){ qsa("[data-announcement-panel]").forEach(p => { p.style.display = "none"; }); return; }
  qsa("[data-announcement-panel]").forEach(p => { p.style.display = ""; });
  startAnnouncementRotation_(active);
}

// ★ 公告：先顯示 BUILTIN，背景 fetch 後更新（不阻塞門面渲染）
async function fetchAndRenderAnnouncements_(){
  // 立即用 builtin 填充（0ms 延遲）
  renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS);
  // 背景 fetch（cache: "default" 允許瀏覽器快取）
  try{
    const payload = await fetchJsonRobust_(buildAnnouncementApiUrl_(), { cacheMode: "default" });
    const items = normalizeAnnouncementItems_(payload);
    if(items && items.length > 0) renderAnnouncementPanels_(items);
    // 若失敗保持 builtin，不做額外處理
  }catch(err){
    console.warn("[HSC announcement] GAS 請求失敗，保持內建公告:", err);
  }
}

/* ============================================================
   文字平衡
============================================================ */
function applySmartBalanceToEl_(el){
  if(!el) return;
  const raw = text(el.dataset.rawText || el.textContent);
  if(!raw) return;
  el.dataset.rawText = raw;
  if(window.innerWidth > 560){ el.textContent = raw; return; }
  if(el.dataset.balanceType === "hero-copy"){
    const parts = raw.split("|");
    el.innerHTML = "";
    if(parts.length >= 2){
      const first = document.createElement("span"); first.className = "balance-line"; first.textContent = parts[0] + "|"; el.appendChild(first);
      const rest = parts.slice(1).join("|");
      const idx = rest.indexOf("打造");
      if(idx > -1){
        const line2 = document.createElement("span"); line2.className = "balance-line"; line2.textContent = rest.slice(0, idx).trim(); el.appendChild(line2);
        const line3 = document.createElement("span"); line3.className = "balance-line"; line3.textContent = rest.slice(idx).trim(); el.appendChild(line3);
      }else{
        const line2 = document.createElement("span"); line2.className = "balance-line"; line2.textContent = rest.trim(); el.appendChild(line2);
      }
      return;
    }
  }
  if(el.dataset.balanceType === "qr-title" || el.dataset.balanceType === "product-qr-title"){
    if(raw.includes("|")){
      const arr = raw.split("|");
      el.innerHTML = `<span class="balance-line">${escapeHtml_(arr[0])}|</span><span class="balance-line">${escapeHtml_(arr.slice(1).join("|"))}</span>`;
      return;
    }
  }
  if(el.dataset.balanceType === "qr-sub" || el.dataset.balanceType === "product-qr-sub"){
    if(raw.includes("・")){
      const parts = raw.split("・").map(x => x.trim()).filter(Boolean);
      if(parts.length >= 2){
        const half = Math.ceil(parts.length / 2);
        const l1 = parts.slice(0, half).join("・");
        const l2 = parts.slice(half).join("・");
        el.innerHTML = `<span class="balance-line">${escapeHtml_(l1)}</span><span class="balance-line">${escapeHtml_(l2)}</span>`;
        return;
      }
    }
  }
  el.textContent = raw;
}
function applySmartBalanceAll_(){ qsa("[data-balance-type]").forEach(applySmartBalanceToEl_); }
let __balanceTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(__balanceTimer);
  __balanceTimer = setTimeout(() => { applySmartBalanceAll_(); updateQrCenterSizes_(); }, 120);
});

/* ============================================================
   QR
============================================================ */
function getQrCenterRatio_(baseRatio){
  const vw = window.innerWidth || 390;
  if(vw <= 360) return Math.max(0.06, baseRatio - 0.02);
  if(vw <= 520) return Math.max(0.07, baseRatio - 0.01);
  return baseRatio;
}
function buildQrImageUrl_(url, size, provider){
  const s = Number(size) || 220;
  const data = encodeURIComponent(String(url || ""));
  if(provider === "quickchart") return "https://quickchart.io/qr?size=" + encodeURIComponent(String(s)) + "&text=" + data + "&ecLevel=H&margin=2";
  return "https://api.qrserver.com/v1/create-qr-code/?size=" + encodeURIComponent(`${s}x${s}`) + "&data=" + data + "&ecc=H&margin=2";
}
function buildQrCandidates_(url, size){
  return [buildQrImageUrl_(url, size, "qrserver"), buildQrImageUrl_(url, size, "quickchart")];
}
function hideCenterImg_(imgEl){
  if(!imgEl) return;
  imgEl.removeAttribute("src");
  imgEl.style.display = "none";
  imgEl.style.background = "transparent";
  imgEl.style.padding = "0";
  imgEl.style.boxShadow = "none";
}
function setCenterImg_(imgEl, centerImgUrl, sizeRatio = 0.09){
  if(!imgEl) return;
  const u = normalizeImageUrl_(centerImgUrl);
  if(!u){ hideCenterImg_(imgEl); return; }
  const ratio = getQrCenterRatio_(sizeRatio);
  imgEl.dataset.baseRatio = String(sizeRatio);
  imgEl.dataset.centerUrl = u;
  imgEl.style.position = "absolute"; imgEl.style.left = "50%"; imgEl.style.top = "50%";
  imgEl.style.width = `${Math.round(ratio * 100)}%`; imgEl.style.height = `${Math.round(ratio * 100)}%`;
  imgEl.style.transform = "translate(-50%, -50%)";
  imgEl.style.borderRadius = "999px"; imgEl.style.objectFit = "cover"; imgEl.style.zIndex = "3";
  imgEl.style.background = "transparent"; imgEl.style.padding = "0"; imgEl.style.boxShadow = "none";
  imgEl.style.display = "block"; imgEl.style.pointerEvents = "none";
  imgEl.onerror = () => { hideCenterImg_(imgEl); };
  setImgWithFallback_(imgEl, buildImgCandidates_(u), {
    crossOrigin: "anonymous", referrerPolicy: "no-referrer",
    onLoad: () => { imgEl.style.display = "block"; imgEl.style.background = "transparent"; imgEl.style.padding = "0"; imgEl.style.boxShadow = "none"; },
    onFail: () => { hideCenterImg_(imgEl); }
  });
}
function updateQrCenterSizes_(){
  ["bottomQrAvatar","featureQrAvatar","facadeQrAvatar"].forEach(id => {
    const el = qs(id);
    if(!el || el.style.display === "none") return;
    const baseRatio = clampNumber_(el.dataset.baseRatio, 0.05, 0.2, 0.09);
    const ratio = getQrCenterRatio_(baseRatio);
    el.style.width = `${Math.round(ratio * 100)}%`;
    el.style.height = `${Math.round(ratio * 100)}%`;
  });
  document.querySelectorAll("[data-bottom-qr-avatar]").forEach(el => {
    if(el.style.display === "none") return;
    const baseRatio = clampNumber_(el.dataset.baseRatio, 0.05, 0.2, 0.09);
    const ratio = getQrCenterRatio_(baseRatio);
    el.style.width = `${Math.round(ratio * 100)}%`;
    el.style.height = `${Math.round(ratio * 100)}%`;
  });
}
function hasQrContent(el){ return HSC_QR.hasQrContent(el); }
function renderQr(options){
  const { container, url, size = 160, centerImgEl = null, centerImgUrl = "", centerSizeRatio = 0.09, renderKey = "" } = options || {};
  if(!container || !url) return false;
  const normalizedCenter = normalizeImageUrl_(centerImgUrl);
  const key = renderKey || `${url}|${size}|${normalizedCenter}|${centerSizeRatio}`;
  if(container.dataset.renderKey === key && hasQrContent(container)){
    if(centerImgEl) setCenterImg_(centerImgEl, normalizedCenter, centerSizeRatio);
    container.style.display = "block"; container.style.visibility = "visible"; container.style.opacity = "1";
    return true;
  }
  container.dataset.renderKey = key;
  container.innerHTML = "";
  container.style.display = "flex"; container.style.alignItems = "center"; container.style.justifyContent = "center";
  container.style.visibility = "visible"; container.style.opacity = "1";
  const img = document.createElement("img");
  img.alt = "QR Code"; img.loading = "eager"; img.decoding = "sync";
  img.referrerPolicy = "no-referrer";
  try{ img.crossOrigin = "anonymous"; }catch(_e){}
  img.style.width = "100%"; img.style.height = "100%"; img.style.display = "block"; img.style.objectFit = "contain";
  const candidates = buildQrCandidates_(url, size).map(src => {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}t=${Date.now()}&v=${encodeURIComponent(CONFIG.VERSION)}`;
  });
  let idx = 0;
  const tryNext = () => { idx += 1; if(idx >= candidates.length){ container.dataset.renderKey = ""; return; } img.src = candidates[idx]; };
  img.onerror = () => { tryNext(); };
  img.onload = () => { container.style.display = "flex"; container.style.alignItems = "center"; container.style.justifyContent = "center"; container.style.visibility = "visible"; container.style.opacity = "1"; };
  img.src = candidates[0];
  container.appendChild(img);
  if(centerImgEl) setCenterImg_(centerImgEl, normalizedCenter, centerSizeRatio);
  return true;
}
window.renderQr = renderQr;
window.__getCurrentAvatarUrl = function(){ return currentAvatarUrlCache || ""; };
window.__getHubShareUrl = buildHubShareUrl_;
window.__getCardShareUrl = function(){ return buildTrackedShareUrl_(getActiveCardPayload_()); };
window.__getTrackedShareUrl = function(){ return buildTrackedShareUrl_(getActiveCardPayload_()); };

function bindQrSlots_(){
  HSC_QR.bindSlot("facadeQrGrid");
  HSC_QR.bindSlot("featureQrGrid");
  HSC_QR.bindSlot("bottomQrGrid");
}
function renderFacadeQrStable(row, styleKey, url){
  const renderKey = HSC_QR.defaultRenderKey("facade", row?.id || FACADE_SAMPLE_ID, styleKey || "", url || "");
  lastFacadeQrRenderKey = renderKey;
  HSC_QR.scheduleRender("facadeQrGrid", { url, renderKey, force: true, reason: "facade-render", size: 148 });
}
function renderProductQrsStable(row, styleKey, featureUrl, bottomUrl){
  const info = pickAvatarInfo_(row || getActiveCardPayload_());
  const avatarUrl = info.url || currentAvatarUrlCache || "";
  const featureRenderKey = HSC_QR.defaultRenderKey("feature", row?.id || "", styleKey || "", featureUrl || "") + "::" + avatarUrl;
  const bottomRenderKey = HSC_QR.defaultRenderKey("bottom", row?.id || "", styleKey || "", bottomUrl || "") + "::" + avatarUrl;
  lastFeatureQrRenderKey = featureRenderKey;
  lastBottomQrRenderKey = bottomRenderKey;
  const featureAvatarEl = qs("featureQrAvatar") || document.querySelector("[data-feature-qr-avatar]");
  const bottomAvatarEl = qs("bottomQrAvatar") || document.querySelector("[data-bottom-qr-avatar]");
  HSC_QR.scheduleRender("featureQrGrid", { url: featureUrl, renderKey: featureRenderKey, force: true, reason: "feature-render", size: 152, centerImgEl: featureAvatarEl, centerImgUrl: avatarUrl, centerSizeRatio: 0.09 });
  HSC_QR.scheduleRender("bottomQrGrid", { url: bottomUrl, renderKey: bottomRenderKey, force: true, reason: "bottom-render", size: 136, centerImgEl: bottomAvatarEl, centerImgUrl: avatarUrl, centerSizeRatio: 0.09 });
}
function renderFacadeQrFromCurrent_(){
  const row = facadeCurrentRow || facadeBaseData;
  if(!row) return;
  const url = buildHubShareUrl_();
  const styleKey = window.__facadeStyleKey || (facadeState.plan === "premium" ? facadeState.premiumColor : `${facadeState.color}|${facadeState.style}|${facadeState.paper}`);
  window.__facadeQrUrl = url;
  renderFacadeQrStable(row, styleKey, url);
}
function renderBottomQr_(p){
  const sec = qs("bottomQrSection") || document.querySelector("#livePreviewCard [data-bottom-qr-section]");
  if(sec) sec.style.display = "block";
  const payload = p || getActiveCardPayload_();
  if(!payload) return;
  const qrUrl = buildTrackedShareUrl_(payload);
  window.__bottomQrUrl = qrUrl;
  window.__cardStyleKey = getEffectiveTheme_(payload) === "premium"
    ? text(pick(payload, ["color"])) || "p1"
    : `${text(pick(payload, ["color"]))}|${text(pick(payload, ["style"]))}|${text(pick(payload, ["paper"]))}`;
  renderProductQrsStable(payload, window.__cardStyleKey, window.__featureQrUrl || qrUrl, qrUrl);
}
function renderFeatureQrFromCurrent_(){
  const payload = getActiveCardPayload_();
  if(!payload) return;
  const url = buildTrackedShareUrl_(payload);
  window.__featureQrUrl = url;
  window.__cardStyleKey = getEffectiveTheme_(payload) === "premium"
    ? text(pick(payload, ["color"])) || "p1"
    : `${text(pick(payload, ["color"]))}|${text(pick(payload, ["style"]))}|${text(pick(payload, ["paper"]))}`;
  renderProductQrsStable(payload, window.__cardStyleKey, url, window.__bottomQrUrl || url);
}
window.__renderFeatureQrFromCurrent = renderFeatureQrFromCurrent_;

function rerenderAllQrAfterFacade_(){
  const active = getActiveCardPayload_();
  if(!active) return;
  const jobs = () => {
    try{ renderFacadeQrFromCurrent_(); }catch(_e){}
    try{ renderFeatureQrFromCurrent_(); }catch(_e){}
    try{ renderBottomQr_(active); }catch(_e){}
    try{ renderBottomHubShareBtn_(); }catch(_e){}
    try{ updateQrCenterSizes_(); }catch(_e){}
  };
  requestAnimationFrame(jobs);
  setTimeout(jobs, 120);
  setTimeout(jobs, 320);
  setTimeout(jobs, 680);
}
function reRenderAllQrStable(){
  try{
    if(facadeCurrentRow && window.__facadeQrUrl){
      renderFacadeQrStable(facadeCurrentRow, window.__facadeStyleKey || "", window.__facadeQrUrl);
    }else{ renderFacadeQrFromCurrent_(); }
    if(currentRow){
      renderProductQrsStable(currentRow, window.__cardStyleKey || "", window.__featureQrUrl || buildTrackedShareUrl_(currentRow), window.__bottomQrUrl || buildTrackedShareUrl_(currentRow));
    }else{ renderFeatureQrFromCurrent_(); renderBottomQr_(getActiveCardPayload_()); }
  }catch(e){ console.warn("QR re-render fail:", e); }
}

/* ============================================================
   分享 / invite
============================================================ */
async function shareUrl_(url, title, textMsg, okMsg){
  try{
    if(navigator.share){ await navigator.share({ title: title || "天使幸福智慧名片", text: textMsg || "", url }); return; }
    if(navigator.clipboard?.writeText){ await navigator.clipboard.writeText(url); alert(okMsg || "✅ 已複製連結"); return; }
    prompt("請手動複製連結", url);
  }catch(_err){}
}
function renderBottomHubShareBtn_(){
  const sec = qs("bottomQrSection") || document.querySelector("#livePreviewCard [data-bottom-qr-section]");
  if(!sec) return;
  let wrap = qs("bottomHubShareWrap");
  if(!wrap){
    wrap = document.createElement("div");
    wrap.id = "bottomHubShareWrap";
    wrap.style.marginTop = "12px"; wrap.style.display = "flex"; wrap.style.justifyContent = "center";
    const btn = document.createElement("button");
    btn.id = "btnShareHubBottom"; btn.type = "button"; btn.className = "dock-btn wide dock-web";
    btn.style.maxWidth = "260px"; btn.style.width = "100%"; btn.style.borderRadius = "999px";
    btn.style.fontWeight = "900"; btn.style.boxShadow = "0 10px 22px rgba(83,62,45,.08)";
    btn.innerHTML = `<i class="fa-solid fa-share-nodes"></i><span>分享智慧名片館</span>`;
    btn.addEventListener("click", async () => { const url = buildHubShareUrl_(); await shareUrl_(url, "天使幸福智慧名片館", "分享智慧名片館", "✅ 已複製智慧名片館連結"); });
    wrap.appendChild(btn);
    sec.insertAdjacentElement("afterend", wrap);
  }
}
function ensureBottomQrVisible_(){
  const payload = getActiveCardPayload_();
  if(!payload) return;
  try{ renderBottomQr_(payload); }catch(_e){}
  try{ renderBottomHubShareBtn_(); }catch(_e){}
  setTimeout(() => { try{ renderBottomQr_(getActiveCardPayload_()); }catch(_e){} try{ renderBottomHubShareBtn_(); }catch(_e){} }, 250);
  setTimeout(() => { try{ renderBottomQr_(getActiveCardPayload_()); }catch(_e){} try{ renderBottomHubShareBtn_(); }catch(_e){} }, 800);
}
function renderInstallDock_(){
  const dock = qs("installDock");
  const cleanMode = getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1";
  if(!dock) return;
  dock.style.display = cleanMode ? "" : "none";
}

function renderShellUiFriendly_(row, rootEl){
  const root = (rootEl instanceof HTMLElement) ? rootEl : (qs("livePreviewCard") || document.body);
  const unitVal = normalizeLongText_(pick(row, ["unit","單位","公司"]));
  const sloganVal = normalizeLongText_(pick(row, ["slogan","一句話","簡介"]));
  const unitEl = root.querySelector("#u-unit") || qs("u-unit");
  const unitToggle = root.querySelector("#u-unit-toggle") || qs("u-unit-toggle");
  const sloganEl = root.querySelector("#u-slogan") || qs("u-slogan");
  const sloganToggle = root.querySelector("#u-slogan-toggle") || qs("u-slogan-toggle");
  if(unitEl) setExpandableText_(unitEl, unitToggle, unitVal, 2, { allowMultiline: true });
  if(sloganEl) setExpandableText_(sloganEl, sloganToggle, sloganVal, 3, { allowMultiline: true });
  const vt = root.querySelector("#versionTag") || qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;
  renderCardExpiry_(row, root);
  renderInstallDock_();
  renderBottomQr_(row);
  renderBottomHubShareBtn_();
  renderFeatureQrFromCurrent_();
  renderFacadeQrFromCurrent_();
  applySmartBalanceAll_();
  updateQrCenterSizes_();
  requestAnimationFrame(() => { refreshAllExpandable_(); ensureBottomQrVisible_(); reRenderAllQrStable(); });
}

function renderPostRendererUi_(row, rootEl){
  const root = (rootEl instanceof HTMLElement) ? rootEl : (qs("livePreviewCard") || document.body);
  const unitVal = normalizeLongText_(pick(row, ["unit","單位","公司"]));
  const sloganVal = normalizeLongText_(pick(row, ["slogan","一句話","簡介"]));
  const unitEl = root.querySelector("#u-unit") || qs("u-unit");
  const unitToggle = root.querySelector("#u-unit-toggle") || qs("u-unit-toggle");
  const sloganEl = root.querySelector("#u-slogan") || qs("u-slogan");
  const sloganToggle = root.querySelector("#u-slogan-toggle") || qs("u-slogan-toggle");
  if(unitEl) setExpandableText_(unitEl, unitToggle, unitVal, 2, { allowMultiline: true });
  if(sloganEl) setExpandableText_(sloganEl, sloganToggle, sloganVal, 3, { allowMultiline: true });
  const b1 = root.querySelector("#block-service") || qs("block-service");
  const b2 = root.querySelector("#block-exp") || qs("block-exp");
  renderExpandableInfoBlock_(b1, "服務項目", pick(row, ["services","服務項目","service"]), 2);
  renderExpandableInfoBlock_(b2, "經歷 / 品牌故事", pick(row, ["experience","經歷","exp"]), 3);
  const vt = root.querySelector("#versionTag") || qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;
  renderCardExpiry_(row, root);
  renderInstallDock_();
  renderBottomQr_(row);
  renderBottomHubShareBtn_();
  renderFeatureQrFromCurrent_();
  renderFacadeQrFromCurrent_();
  applySmartBalanceAll_();
  updateQrCenterSizes_();
  requestAnimationFrame(() => { refreshAllExpandable_(); ensureBottomQrVisible_(); reRenderAllQrStable(); });
}

/* ============================================================
   PWA
============================================================ */
function isIos_(){
  var ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  if (!/android/i.test(ua)) return true;
  return false;
}
function isStandalone_(){ return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true; }
function updateInstallUi_(){
  const btn = qs("btnInstallCard");
  const fab = qs("installFab");
  const dock = qs("installDock");
  const cleanMode = getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1";
  const canInstall = !!deferredInstallPrompt || isIos_() || !isStandalone_();
  if(btn){ btn.disabled = false; btn.style.opacity = canInstall ? "1" : ".62"; }
  if(fab) fab.style.display = cleanMode ? "flex" : "none";
  if(dock) dock.style.display = cleanMode ? "" : "none";
}
async function triggerPwaInstall_(){
  if(isStandalone_()){ alert("✅ 已經在桌面上了"); return; }
  if(false && deferredInstallPrompt){
    try{ deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; }
    catch(err){ console.error(err); }
    finally{ deferredInstallPrompt = null; updateInstallUi_(); }
    return;
  }
if(isIos_()){ alert("📱 新增到主畫面的方法:\n\n1. 點下方「分享」鈕 ⬆\n2. 往下滑找「加入主畫面」\n3. 點右上角「新增」\n\n就會在桌面看到圖示囉 🎉"); return; }
 alert("📱 新增到主畫面的方法:\n\n1. 點右上角或右下角「⋮」三個點\n2. 選「新增到主畫面」\n3. 按「新增」確認\n\n就會在桌面看到圖示囉 🎉");
}
window.__triggerPwaInstall = triggerPwaInstall_;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstallPrompt = e; updateInstallUi_(); });
window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; updateInstallUi_(); });
window.addEventListener("load", () => { ensureBottomQrVisible_(); updateQrCenterSizes_(); }, { once: true });

/* ============================================================
   ★ boot_ v8.3.5（快取優先 + 並行）

   門面模式流程：
     1. 公告：立即顯示 BUILTIN，背景 fetch 更新
     2. Shell：快取命中 → 0ms 渲染；無快取 → 骨架屏 + 等 GAS
     3. renderFacadePreview：shell 完成後立即執行
     4. lite：背景載入，完成後補渲染（不阻塞步驟 3）
     5. QR：渲染後 300 / 900ms 補刷兩次

   個人名片模式流程：
     1. Shell：快取命中直接渲染；同時並行發起 fetch 更新快取
     2. lite / full：並行發起，各自完成後補渲染（不串行）
     3. 公告：與 shell fetch 並行，不互相等待
============================================================ */
(async function boot_(){
  try{
    bindQrSlots_();
    initSelectionState_();
    applySmartBalanceAll_();
    updateInstallUi_();
    bindAnnouncementModal_();

    // 公告立即顯示（不等 GAS）
    fetchAndRenderAnnouncements_();

    // ★ 個人名片模式判斷
    const sp = getSearchParams_();
    const urlId = text(sp.get("id") || "");
    const isViewMode = sp.get("view") === "1";

    if(urlId && isViewMode){
      try{
        await renderPersonalCard_(urlId);
      }catch(err){
        console.error("[HSC card] 個人名片載入失敗:", err);
        const root = qs("livePreviewCard") || document.body;
        const nameEl = root.querySelector("[data-u-name]") || root.querySelector("#u-name") || qs("u-name");
        const titleEl = root.querySelector("[data-u-title]") || root.querySelector("#u-title") || qs("u-title");
        if(nameEl) nameEl.textContent = "名片載入失敗";
        if(titleEl) titleEl.textContent = "請確認連結是否正確，或聯繫客服";
      }
      setTimeout(() => { try{ reRenderAllQrStable(); }catch(_e){} }, 300);
      setTimeout(() => { try{ reRenderAllQrStable(); }catch(_e){} }, 900);
      return;
    }

    // ★ 門面模式（快取優先）
    await loadFacadeBaseCard();   // 有快取時幾乎 0ms
    renderFacadePreview();        // 快取命中時極快首屏

    setTimeout(() => { try{ rerenderAllQrAfterFacade_(); }catch(_e){} }, 300);
    setTimeout(() => { try{ reRenderAllQrStable(); }catch(_e){} }, 900);

  }catch(err){
    console.error("[HSC facade] boot failed:", err);
    const root = qs("livePreviewCard") || document.body;
    const nameEl = root.querySelector("#u-name") || qs("u-name");
    const unitWrap = root.querySelector("#u-unit-wrap") || qs("u-unit-wrap");
    const titleEl = root.querySelector("#u-title") || qs("u-title");
    const unitEl = root.querySelector("#u-unit") || qs("u-unit");
    if(nameEl) nameEl.textContent = "資料載入失敗";
    if(unitWrap) unitWrap.style.display = "";
    if(unitEl) unitEl.textContent = "請稍後再試";
    if(titleEl) titleEl.textContent = "";
    try{ bindAnnouncementModal_(); renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS); }catch(_e){}
  }
})();

/* ============================================================
   HSC 版權顯示控制
============================================================ */
function shouldShowCopyright_(){
  try{
    const url = new URL(location.href);
    const cardId = (url.searchParams.get("id") || "").toUpperCase();
    const isViewMode = url.searchParams.get("view") === "1";
    if(isViewMode && cardId.startsWith("TW")) return false;
    return true;
  }catch(e){ return true; }
}
function renderCardWatermark_(){
  try{
    const cardRoot =
      document.querySelector("#livePreviewCard .card") ||
      document.querySelector("#livePreviewCard") ||
      document.querySelector(".card");
    if(!cardRoot) return;
    let wm = cardRoot.querySelector(".card-watermark");
    if(!wm){ wm = document.createElement("div"); wm.className = "card-watermark"; cardRoot.appendChild(wm); }
    if(!wm.querySelector(".wm-pattern")){ const pattern = document.createElement("div"); pattern.className = "wm-pattern"; wm.appendChild(pattern); }
  }catch(e){ console.warn("watermark error", e); }
}
function renderCopyright_(){
  try{
    if(!shouldShowCopyright_()) return;
    const cardRoot = document.querySelector("#livePreviewCard") || document.querySelector("#card-container");
    if(!cardRoot) return;
    if(cardRoot.querySelector(".copyright-block")) return;
    const el = document.createElement("div");
    el.className = "copyright-block";
    el.textContent = `© ${new Date().getFullYear()} 天使幸福智慧名片館 · All Rights Reserved`;
    cardRoot.appendChild(el);
  }catch(e){ console.warn("copyright error", e); }
}
function renderCopyrightSystem_(){ renderCardWatermark_(); renderCopyright_(); }

window.addEventListener("load", function(){ setTimeout(renderCopyrightSystem_, 800); });

let __hscObserverTimer = null;
const __hscCopyrightObserver = new MutationObserver(() => {
  if(__hscObserverTimer) return;
  __hscObserverTimer = setTimeout(() => { renderCopyrightSystem_(); __hscObserverTimer = null; }, 300);
});
__hscCopyrightObserver.observe(
  document.querySelector("#livePreviewCard") || document.body,
  { childList: true, subtree: true }
);
/* ============================================================
   HSC FRONTEND · 維護模式整合 PATCH for app.js
   ============================================================
   貼法:把這整段貼到 app.js 的最底下(在 `})();` 之類的結尾之後)
   即可生效。不用改動 app.js 其他部分。
============================================================ */

(function initMaintenanceGuard() {
  "use strict";

  // ── 配置(跟 app.js 用同一個 GAS) ──
  const MAINT_GAS_URL = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const MAINT_CHECK_INTERVAL_MS = 60000; // 每 60 秒背景檢查一次
  const MAINT_CACHE_KEY = "HSC_MAINT_STATUS";

  // ── 維護頁顯示 ──
  function showMaintenancePage(info, announcement) {
    const msg = (info && info.message) || (announcement && announcement.content) || "系統維護中,請稍後再試";
    const title = (announcement && announcement.title) || "系統維護中";
    const endAt = info && info.end_at ? formatMaintEndAt(info.end_at) : "";

    // 移除現有維護頁(如果有)
    const existing = document.getElementById("hscMaintenancePage");
    if (existing) existing.remove();

    const page = document.createElement("div");
    page.id = "hscMaintenancePage";
    page.className = "hsc-maint-page";
    page.innerHTML = `
      <div class="hsc-maint-card">
        <div class="hsc-maint-icon">
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="8" fill="#b08a6b"/>
            <line x1="32" y1="6" x2="32" y2="16" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
            <line x1="32" y1="48" x2="32" y2="58" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
            <line x1="6" y1="32" x2="16" y2="32" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
            <line x1="48" y1="32" x2="58" y2="32" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
            <line x1="14" y1="14" x2="20" y2="20" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
            <line x1="44" y1="44" x2="50" y2="50" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
            <line x1="14" y1="50" x2="20" y2="44" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
            <line x1="44" y1="20" x2="50" y2="14" stroke="#b08a6b" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="hsc-maint-brand">天使幸福智慧名片館</div>
        <div class="hsc-maint-title">🔧 ${escapeMaintHtml(title)}</div>
        <div class="hsc-maint-message">${escapeMaintHtml(msg).replace(/\n/g, "<br>")}</div>
        ${endAt ? `<div class="hsc-maint-endat">⏰ 預計恢復時間<br><strong>${escapeMaintHtml(endAt)}</strong></div>` : ""}
        <div class="hsc-maint-contact">
          <div class="hsc-maint-contact-label">急事請聯繫</div>
          <a class="hsc-maint-line-btn" href="https://lin.ee/G3VJoRm" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            LINE 官方帳號
          </a>
        </div>
      </div>`;
    document.body.appendChild(page);

    // 鎖定背景捲動
    document.body.style.overflow = "hidden";
  }

  function hideMaintenancePage() {
    const page = document.getElementById("hscMaintenancePage");
    if (page) page.remove();
    document.body.style.overflow = "";
  }

  function escapeMaintHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMaintEndAt(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${y}/${m}/${day} ${hh}:${mm}`;
    } catch (_e) {
      return iso;
    }
  }

  // ── 檢查維護狀態 ──
  async function checkMaintenanceStatus() {
    try {
      const url = `${MAINT_GAS_URL}?action=getMaintenanceStatus&_t=${Date.now()}`;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!data || !data.ok || !data.maintenance) return null;
      return data.maintenance;
    } catch (err) {
      console.warn("[HSC maint] check failed:", err);
      return null;
    }
  }

  async function fetchMaintAnnouncement() {
    try {
      const url = `${MAINT_GAS_URL}?action=getAnnouncements&_t=${Date.now()}`;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.announcements)) return null;
      const maintAnn = data.announcements.find(a => String(a.type || "").toLowerCase() === "maintenance" && String(a.status || "").toLowerCase() === "active");
      return maintAnn || null;
    } catch (_e) {
      return null;
    }
  }

  // ── 頁面進入點檢查 ──
  async function runMaintenanceCheckOnBoot() {
    const info = await checkMaintenanceStatus();
    if (!info || !info.enabled) return false;
    const ann = await fetchMaintAnnouncement();
    showMaintenancePage(info, ann);
    return true;
  }

  // ── 背景定期檢查(每 60 秒) ──
  function startBackgroundMaintenanceCheck() {
    setInterval(async () => {
      const info = await checkMaintenanceStatus();
      const currentlyShowing = !!document.getElementById("hscMaintenancePage");
      if (info && info.enabled) {
        if (!currentlyShowing) {
          const ann = await fetchMaintAnnouncement();
          showMaintenancePage(info, ann);
        }
      } else {
        if (currentlyShowing) {
          hideMaintenancePage();
          // 維護結束後重新整理頁面,確保乾淨載入
          setTimeout(() => window.location.reload(), 500);
        }
      }
    }, MAINT_CHECK_INTERVAL_MS);
  }

  // ── API 攔截:全域 fetch wrapper ──
  // 攔截所有對 GAS 的 fetch,偵測到 maintenance: true 就顯示維護頁
  const originalFetch = window.fetch;
  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch(input, init);
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (url.indexOf(MAINT_GAS_URL) === 0) {
        // clone 回應讓原 caller 仍能讀
        const clone = response.clone();
        clone.text().then(text => {
          try {
            const data = JSON.parse(text);
            if (data && data.maintenance === true && !document.getElementById("hscMaintenancePage")) {
              // 被維護攔下了,顯示維護頁
              fetchMaintAnnouncement().then(ann => {
                showMaintenancePage(data.maintenance_info || { message: data.error }, ann);
              });
            }
          } catch (_e) {}
        }).catch(() => {});
      }
    } catch (_e) {}
    return response;
  };

  // ── 啟動 ──
  async function boot() {
    const isMaint = await runMaintenanceCheckOnBoot();
    startBackgroundMaintenanceCheck();
    // 不論是否維護,都啟動背景檢查(維護結束能自動偵測)
    return isMaint;
  }

  // 立即執行(不等 DOMContentLoaded,越早越好)
  boot().catch(err => console.warn("[HSC maint] boot failed:", err));
})();
