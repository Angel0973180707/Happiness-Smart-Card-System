/* ============================================================
   天使幸福智慧名片館 app.js
   v7.7.4.2-qr-expiry-fix
   完整覆蓋版（基於原始完整版修復）
   - 修復 QR 不顯示
   - 修復 到期倒數不顯示
   - 不刪功能、不重構
============================================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v7.7.4.2-qr-expiry-fix",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/"
};

const BUILTIN_ANNOUNCEMENTS = [
  {
    id: "builtin-feature",
    title: "產品特色",
    content: `天使幸福智慧名片是一個可分享的數位名片入口，
整合品牌介紹、聯絡方式、社群與CTA，讓客戶快速認識你。`
  }
];

/* ============================================================
   工具區
============================================================ */

function $(id){
  return document.getElementById(id);
}

function safeJsonParse_(txt){
  try{
    return JSON.parse(txt);
  }catch(e){
    return null;
  }
}

function sleep_(ms){
  return new Promise(r=>setTimeout(r,ms));
}

/* ============================================================
   ID 處理
============================================================ */

function normalizeCardId_(id){
  if(!id) return CONFIG.DEFAULT_ID;

  id = String(id).trim();

  if(/^\d+$/.test(id)){
    return "TW" + id.padStart(4,"0");
  }

  if(/^TW\d+$/i.test(id)){
    return "TW" + id.replace(/[^\d]/g,"").padStart(4,"0");
  }

  return id.toUpperCase();
}

function getCardId_(){
  const url = new URL(location.href);
  const raw = url.searchParams.get("id");
  return normalizeCardId_(raw || CONFIG.DEFAULT_ID);
}

/* ============================================================
   API
============================================================ */

async function fetchWithRetry_(url){
  let lastErr;

  for(let i=0;i<CONFIG.RETRY;i++){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);

      const res = await fetch(url,{signal:ctrl.signal});
      clearTimeout(t);

      const txt = await res.text();
      const data = safeJsonParse_(txt);

      if(data && data.ok) return data;

      throw new Error("invalid response");

    }catch(err){
      lastErr = err;
      await sleep_(400);
    }
  }

  throw lastErr;
}

async function fetchCard_(id){
  const url = CONFIG.GAS + "?action=getCard&id=" + encodeURIComponent(id);
  return await fetchWithRetry_(url);
}

/* ============================================================
   QR 工具（修復核心🔥）
============================================================ */

function buildTrackedShareUrl_(row){
  if(row && row.card_url) return row.card_url;

  const id = row?.id || getCardId_();

  return CONFIG.HUB_URL + "?id=" + id;
}

function renderQrImage_(box, url){
  if(!box || !url) return;

  box.innerHTML = "";

  const img = document.createElement("img");

  img.src = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=" + encodeURIComponent(url);

  img.onerror = function(){
    img.src = "https://quickchart.io/qr?size=240&text=" + encodeURIComponent(url);
  };

  box.appendChild(img);
}

/* ============================================================
   到期倒數（修復核心🔥）
============================================================ */

/* ============================================================
   天使幸福智慧名片館 app.js
   v7.7.4.2-qr-expiry-fix
   完整覆蓋版
   - 門面固定只讀 TW0001
   - 門面樣品體驗切換獨立 facadeState
   - facadeCurrentRow / currentRow 正式分流
   - renderFacadePreview 改為 useExistingDom:false
   - 門面樣品卡恢復互動 allowActions:true
   - 補回 facade / feature / bottom QR 強制回補機制
   - QR 改為雙來源容錯（qrserver + quickchart）
   - 已付款：英文顯示倒數到期日
   - 未付款：中文顯示付款期限
   - 保留 fetch / announcement / share / install / invite / QR
============================================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v7.7.4.2-qr-expiry-fix",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/"
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

async function fetchWithTimeout_(url, timeoutMs){
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
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

async function fetchJsonRobust_(url){
  let last = null;
  for(let i = 0; i <= CONFIG.RETRY; i++){
    try{
      return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS);
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

function buildCardApiUrl_(id){
  const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getCard");
  u.searchParams.set("id", cid);
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildLeadCreateUrl_(refCode){
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "leadCreate");
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  if(refCode) u.searchParams.set("ref", refCode);
  u.searchParams.set("source", "invite_gate_card");
  u.searchParams.set("note", "invite_gate_prelog");
  u.searchParams.set("ts", String(Date.now()));
  u.searchParams.set("v", CONFIG.VERSION);
  return u.toString();
}

function buildAnnouncementApiUrl_(){
  const u = new URL(CONFIG.GAS);
  u.searchParams.set("action", "getAnnouncements");
  u.searchParams.set("tenant", CONFIG.DEFAULT_TENANT);
  u.searchParams.set("ts", String(Date.now()));
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

function createLocalApplyCode_(){
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `AP${yy}${mm}${dd}${hh}${mi}${ss}`;
}

function buildInviteApplyText_(refCode, applyCode){
  const lines = [
    "您好，我想申請天使幸福智慧名片邀請碼。",
    "",
    `推薦來源識別碼：${text(refCode) || "無"}`,
    `申請識別碼：${text(applyCode) || "-"}`,
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

  let applyCode = "";
  try{
    const payload = await fetchJsonRobust_(buildLeadCreateUrl_(refCode));
    applyCode = text(payload?.data?.lead_id || payload?.lead_id || "");
  }catch(_err){
    applyCode = "";
  }

  if(!applyCode) applyCode = createLocalApplyCode_();

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
   門面 state 對應工具
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

function initSelectionState_(){
  syncPlanUI_();
}

/* ============================================================
   門面資料：固定讀 TW0001
============================================================ */
async function loadFacadeBaseCard(){
  const url = buildCardApiUrl_(FACADE_SAMPLE_ID);
  const payload = await fetchJsonRobust_(url);
  const row = extractCardRow_(payload);

  if(!row || typeof row !== "object" || !Object.keys(row).length){
    throw new Error("門面樣品卡資料為空");
  }

  const merged = normalizeCardFeatures(row);
  facadeBaseData = buildNormalizedPayload_(merged);

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
   門面樣品渲染
============================================================ */
function renderFacadePreview(){
  const root = qs("livePreviewCard");
  if(!root || !facadeBaseData) return;

  applyFacadeBodyMode_();
  const data = buildFacadePreviewData();

  const renderer =
    window.HscCardRenderer &&
    typeof window.HscCardRenderer.renderCard === "function"
      ? window.HscCardRenderer.renderCard
      : null;

  if(!renderer){
    throw new Error("card-renderer.js 尚未正確載入，找不到 HscCardRenderer.renderCard()");
  }

  const result = renderer(data, {
    mode: "index",
    root,
    useExistingDom: false,
    qrMode: "facade",
    allowActions: true
  });

  if(!result || result.ok !== true){
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
   門面切換事件（只改 facadeState）
============================================================ */
window.setPlan = function(plan, el){
  facadeState.plan = (plan === "premium") ? "premium" : "free";
  syncPlanUI_();
  if(el){
    const planBtns = [qs("btnPlanFree"), qs("btnPlanPremium")].filter(Boolean);
    planBtns.forEach(btn => {
      if(btn === el) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }
  renderFacadePreview();
};

window.setTheme = function(theme, el){
  const v = text(theme).toLowerCase();
  if(!v) return;

  const freeMap = {
    "color-1":"c1","color-2":"c2","color-3":"c3","color-4":"c4","color-5":"c5",
    "c1":"c1","c2":"c2","c3":"c3","c4":"c4","c5":"c5"
  };

  if(v in freeMap){
    facadeState.plan = "free";
    facadeState.color = freeMap[v];
  }else if(/^p\d+$/.test(v)){
    facadeState.plan = "premium";
    facadeState.premiumColor = v;
  }

  syncPlanUI_();

  if(el){
    const groupSel = facadeState.plan === "premium" ? "#premiumDotsRow .p-dot" : "#freeDotsRow .dot";
    qsa(groupSel).forEach(btn => {
      if(btn === el) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }

  renderFacadePreview();
};

window.setStyle = function(style, el){
  const raw = text(style).toLowerCase();
  const map = { "arch":"s1", "flat":"s2", "spot":"s3", "s1":"s1", "s2":"s2", "s3":"s3" };
  if(!(raw in map)) return;
  facadeState.style = map[raw];
  syncStyleUI_();
  if(el){
    qsa("#styleRow .btn-neo").forEach(btn => {
      if(btn === el) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }
  renderFacadePreview();
};

window.setPaper = function(paper, el){
  const raw = text(paper).toLowerCase();
  const map = { "paper-1":"f1", "paper-2":"f2", "paper-3":"f3", "f1":"f1", "f2":"f2", "f3":"f3" };
  if(!(raw in map)) return;
  facadeState.paper = map[raw];
  syncPaperUI_();
  if(el){
    qsa("#paperRow .btn-neo").forEach(btn => {
      if(btn === el) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }
  renderFacadePreview();
};

/* ============================================================
   展開文字
============================================================ */
function normalizeLongText_(raw){
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function setExpandableText_(contentEl, toggleEl, rawText, maxLines, options = {}){
  if(!contentEl) return;
  const value = normalizeLongText_(rawText);
  const hasText = text(value) !== "";
  const allowMultiline = !!options.allowMultiline;
  contentEl.dataset.raw = value;
  contentEl.dataset.maxLines = String(maxLines || 3);
  contentEl.dataset.expandable = "1";
  if(allowMultiline){
    contentEl.innerHTML = escapeHtmlWithBreaks_(value);
    contentEl.classList.add("preline");
  }else{
    contentEl.textContent = value;
    contentEl.classList.remove("preline");
  }
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
      if(expanded){
        contentEl.classList.remove("is-expanded");
        contentEl.classList.add("is-collapsed");
        toggleEl.textContent = "看更多";
        toggleEl.setAttribute("aria-expanded", "false");
      }else{
        contentEl.classList.remove("is-collapsed");
        contentEl.classList.add("is-expanded");
        toggleEl.textContent = "收合";
        toggleEl.setAttribute("aria-expanded", "true");
      }
    };
  }
  if(!hasText){ if(toggleEl) toggleEl.style.display = "none"; return; }
  requestAnimationFrame(() => { refreshExpandableItem_(contentEl, toggleEl); });
}

function refreshExpandableItem_(contentEl, toggleEl){
  if(!contentEl) return;
  const maxLines = Number(contentEl.dataset.maxLines || 3);
  const wasExpanded = contentEl.classList.contains("is-expanded");
  contentEl.classList.remove("is-expanded");
  contentEl.classList.add("is-collapsed");
  contentEl.style.setProperty("--max-lines", String(maxLines));
  const needToggle = (contentEl.scrollHeight - contentEl.clientHeight) > 4;
  if(toggleEl){
    toggleEl.style.display = needToggle ? "inline-flex" : "none";
    if(!needToggle){
      toggleEl.textContent = "看更多";
      toggleEl.setAttribute("aria-expanded", "false");
    }
  }
  if(needToggle && wasExpanded){
    contentEl.classList.remove("is-collapsed");
    contentEl.classList.add("is-expanded");
    if(toggleEl){
      toggleEl.textContent = "收合";
      toggleEl.setAttribute("aria-expanded", "true");
    }
  }
}

function refreshAllExpandable_(){
  qsa("[data-expandable='1']").forEach(contentEl => {
    const wrap = contentEl.closest(".expandable-wrap") || contentEl.parentElement;
    const toggleEl = wrap ? wrap.querySelector(".expand-toggle") : null;
    refreshExpandableItem_(contentEl, toggleEl);
  });
}

let __expandRefreshTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(__expandRefreshTimer);
  __expandRefreshTimer = setTimeout(() => {
    refreshAllExpandable_();
    applySmartBalanceAll_();
    updateQrCenterSizes_();
  }, 120);
});

function renderExpandableInfoBlock_(blockEl, title, rawText, maxLines){
  if(!blockEl) return;
  const value = normalizeLongText_(rawText);
  if(!text(value)){
    blockEl.style.display = "none";
    blockEl.innerHTML = "";
    return;
  }
  blockEl.style.display = "";
  blockEl.innerHTML = `
    <div class="block-title">${escapeHtml_(title)}</div>
    <div class="expandable-wrap">
      <div class="block-body expandable-text is-collapsed preline" style="--max-lines:${Number(maxLines || 3)}"></div>
      <button class="expand-toggle" type="button" style="display:none;">看更多</button>
    </div>
  `;
  const contentEl = blockEl.querySelector(".expandable-text");
  const toggleEl = blockEl.querySelector(".expand-toggle");
  setExpandableText_(contentEl, toggleEl, value, maxLines, { allowMultiline: true });
}

function pickAvatarInfo_(p){
  const url = pick(p, ["avatar_url"]);
  if(text(url)){
    return { key: "avatar_url", raw: url, url: normalizeImageUrl_(url) };
  }
  return { key: "", raw: "", url: "" };
}

/* ============================================================
   到期日 / 付款期限
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

  const normalized = s
    .replace(/\//g, "-")
    .replace(" ", "T")
    .replace(/(\.\d+)?Z$/i, "");

  let d = new Date(normalized);
  if(!isNaN(d.getTime())) return d;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
    if(!isNaN(d.getTime())) return d;
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if(m){
    d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0),
      0
    );
    if(!isNaN(d.getTime())) return d;
  }

  return null;
}

function getExpiryInfo_(p){
  const payload = p || {};
  const billingStatus = text(pick(payload, ["billing_status"])).toLowerCase();

  const expiresAtRaw = text(pick(payload, ["expires_at"]));
  const paymentDueRaw = text(pick(payload, ["payment_due_at"]));

  const expiresAt = parseDateSafe_(expiresAtRaw);
  const paymentDueAt = parseDateSafe_(paymentDueRaw);

  if(billingStatus === "unpaid" && paymentDueAt){
    return {
      type: "payment_due",
      date: paymentDueAt,
      raw: paymentDueRaw
    };
  }

  if(expiresAt){
    return {
      type: "expires_at",
      date: expiresAt,
      raw: expiresAtRaw
    };
  }

  if(paymentDueAt){
    return {
      type: "payment_due",
      date: paymentDueAt,
      raw: paymentDueRaw
    };
  }

  return null;
}

function renderCardExpiry_(p){
  const el = qs("cardExpiry");
  if(!el) return;

  const info = getExpiryInfo_(p);
  if(!info || !info.date){
    el.style.display = "none";
    el.textContent = "";
    el.removeAttribute("title");
    el.classList.remove("is-expired");
    return;
  }

  const target = info.date;
  const now = new Date();

  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();

  const diffDays = Math.floor((targetStart - nowStart) / 86400000);

  let label = "";

  if(info.type === "payment_due"){
    if(diffDays < 0){
      label = `付款期限已過 ${Math.abs(diffDays)} 天`;
      el.classList.add("is-expired");
    }else if(diffDays === 0){
      label = "付款期限今天截止";
      el.classList.remove("is-expired");
    }else if(diffDays === 1){
      label = "付款期限剩 1 天";
      el.classList.remove("is-expired");
    }else{
      label = `付款期限剩 ${diffDays} 天`;
      el.classList.remove("is-expired");
    }
    el.title = `付款期限：${formatDateYmd_(target)}`;
  }else{
    if(diffDays < 0){
      label = diffDays === -1 ? "EXPIRED 1 DAY AGO" : `EXPIRED ${Math.abs(diffDays)} DAYS AGO`;
      el.classList.add("is-expired");
    }else if(diffDays === 0){
      label = "EXPIRES TODAY";
      el.classList.remove("is-expired");
    }else if(diffDays === 1){
      label = "EXPIRES IN 1 DAY";
      el.classList.remove("is-expired");
    }else{
      label = `EXPIRES IN ${diffDays} DAYS`;
      el.classList.remove("is-expired");
    }
    el.title = `Expiry Date: ${formatDateYmd_(target)}`;
  }

  el.textContent = label;
  el.style.display = "block";
}
      container.innerHTML = "";
      if(centerImgEl) hideCenterImg_(centerImgEl);
      return;
    }
    img.src = candidates[idx];
  };

  img.onerror = () => { tryNext(); };
  img.onload = () => {
    container.innerHTML = "";
    container.appendChild(img);
    if(centerImgEl) setCenterImg_(centerImgEl, normalizedCenter, centerSizeRatio);
  };

  img.src = candidates[0];
  return true;
}

window.renderQr = renderQr;

function rerenderBottomQr_(p){
  const box = qs("bottomQrBox");
  const section = qs("bottomQrSection");
  const centerImgEl = qs("bottomQrAvatar");
  const centerWrap = qs("bottomQrAvatarWrap");

  if(!box || !section) return;

  const payload = p || getActiveCardPayload_();
  const url = buildTrackedShareUrl_(payload);
  const avatarInfo = pickAvatarInfo_(payload);
  const centerImgUrl = avatarInfo.url || currentAvatarUrlCache || "";
  const renderKey = `bottom|${url}|${centerImgUrl}`;

  const ok = renderQr({
    container: box,
    url,
    size: 220,
    centerImgEl,
    centerImgUrl,
    centerSizeRatio: 0.09,
    renderKey
  });

  if(ok){
    section.style.display = "";
    section.classList.remove("is-hidden");
    section.style.visibility = "visible";
    section.style.opacity = "1";
    if(centerWrap){
      centerWrap.style.display = centerImgUrl ? "" : "none";
      centerWrap.classList.toggle("is-hidden", !centerImgUrl);
    }
    lastBottomQrRenderKey = renderKey;
  }else{
    section.style.display = "none";
    section.classList.add("is-hidden");
    if(centerWrap){
      centerWrap.style.display = "none";
      centerWrap.classList.add("is-hidden");
    }
    lastBottomQrRenderKey = "";
  }
}

function rerenderFeatureQr_(p){
  const box = qs("featureQrBox");
  const section = qs("featureQrSection");
  const centerImgEl = qs("featureQrAvatar");
  const centerWrap = qs("featureQrAvatarWrap");

  if(!box || !section) return;

  const payload = p || getActiveCardPayload_();
  const url = buildTrackedShareUrl_(payload);
  const avatarInfo = pickAvatarInfo_(payload);
  const centerImgUrl = avatarInfo.url || currentAvatarUrlCache || "";
  const renderKey = `feature|${url}|${centerImgUrl}`;

  const ok = renderQr({
    container: box,
    url,
    size: 200,
    centerImgEl,
    centerImgUrl,
    centerSizeRatio: 0.09,
    renderKey
  });

  if(ok){
    section.style.display = "";
    section.classList.remove("is-hidden");
    section.style.visibility = "visible";
    section.style.opacity = "1";
    if(centerWrap){
      centerWrap.style.display = centerImgUrl ? "" : "none";
      centerWrap.classList.toggle("is-hidden", !centerImgUrl);
    }
    lastFeatureQrRenderKey = renderKey;
  }else{
    section.style.display = "none";
    section.classList.add("is-hidden");
    if(centerWrap){
      centerWrap.style.display = "none";
      centerWrap.classList.add("is-hidden");
    }
    lastFeatureQrRenderKey = "";
  }
}

function rerenderFacadeQr_(){
  const box = qs("facadeQrBox");
  const section = qs("facadeQRSection") || qs("facadeQrSection");
  const centerImgEl = qs("facadeQrAvatar");
  const centerWrap = qs("facadeQrAvatarWrap");

  if(!box) return;

  const payload = getActiveCardPayload_();
  const url = buildHubShareUrl_();
  const avatarInfo = pickAvatarInfo_(payload);
  const centerImgUrl = avatarInfo.url || currentAvatarUrlCache || "";
  const renderKey = `facade|${url}|${centerImgUrl}`;

  const ok = renderQr({
    container: box,
    url,
    size: 220,
    centerImgEl,
    centerImgUrl,
    centerSizeRatio: 0.09,
    renderKey
  });

  if(ok){
    if(section){
      section.style.display = "";
      section.classList.remove("is-hidden");
    }
    if(centerWrap){
      centerWrap.style.display = centerImgUrl ? "" : "none";
      centerWrap.classList.toggle("is-hidden", !centerImgUrl);
    }
    lastFacadeQrRenderKey = renderKey;
  }else{
    if(section){
      section.style.display = "none";
      section.classList.add("is-hidden");
    }
    if(centerWrap){
      centerWrap.style.display = "none";
      centerWrap.classList.add("is-hidden");
    }
    lastFacadeQrRenderKey = "";
  }
}

function rerenderAllQrAfterFacade_(){
  const payload = getActiveCardPayload_();
  rerenderBottomQr_(payload);
  rerenderFeatureQr_(payload);
  rerenderFacadeQr_();
  updateQrCenterSizes_();
}

/* ============================================================
   分享 / 安裝
============================================================ */
async function shareCurrentCard_(){
  const payload = getActiveCardPayload_();
  const title =
    text(pick(payload, ["name"])) ||
    "天使幸福智慧名片";
  const shareUrl = buildTrackedShareUrl_(payload);

  try{
    if(navigator.share){
      await navigator.share({
        title,
        text: "這是我的智慧名片，歡迎查看。",
        url: shareUrl
      });
      return;
    }
  }catch(err){
    console.warn("[HSC share] 系統分享失敗，改用複製連結", err);
  }

  try{
    await navigator.clipboard.writeText(shareUrl);
    alert("已複製成品連結");
  }catch(_err){
    window.prompt("請手動複製以下連結：", shareUrl);
  }
}

function bindShareButton_(){
  const btn = qs("cleanShareFab");
  if(!btn) return;
  btn.style.display = "flex";
  btn.onclick = null;
  btn.onclick = shareCurrentCard_;
}

function bindInstallPrompt_(){
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installFab = qs("installFab");
    if(installFab) installFab.style.display = "flex";
  });

  const installFab = qs("installFab");
  if(!installFab) return;

  installFab.onclick = async () => {
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try{
      await deferredInstallPrompt.userChoice;
    }catch(_err){}
    deferredInstallPrompt = null;
    installFab.style.display = "none";
  };
}

/* ============================================================
   客服 / 邀請 / 申請
============================================================ */
function bindCustomerService_(){
  const ids = [
    "btnContactCustomerService",
    "btnContactService",
    "btnCustomerService"
  ];

  ids.forEach(id => {
    const btn = qs(id);
    if(!btn) return;
    btn.onclick = () => openUrl_(CONFIG.CUSTOMER_SERVICE_URL);
  });
}

function copyTextFallback_(txt){
  const ta = document.createElement("textarea");
  ta.value = txt;
  ta.setAttribute("readonly", "readonly");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  try{ document.execCommand("copy"); }catch(_e){}
  document.body.removeChild(ta);
}

async function copyText_(txt){
  try{
    await navigator.clipboard.writeText(txt);
  }catch(_err){
    copyTextFallback_(txt);
  }
}

async function openInviteApplyFlow_(){
  const info = await ensureInviteApplyData_();
  await copyText_(info.copyText);
  alert(`已複製申請內容\n申請識別碼：${info.applyCode}`);
  openUrl_(CONFIG.CUSTOMER_SERVICE_URL);
}

function bindInviteButtons_(){
  const ids = [
    "btnOpenRequestForm",
    "btnApplyNow",
    "btnInviteApply",
    "btnApplyInvite"
  ];

  ids.forEach(id => {
    const btn = qs(id);
    if(!btn) return;
    btn.onclick = openInviteApplyFlow_;
  });
}

/* ============================================================
   版面補強
============================================================ */
function ensureBottomQrVisible_(){
  const section = qs("bottomQrSection");
  const box = qs("bottomQrBox");
  if(!section || !box) return;
  if(box.children.length){
    section.style.display = "";
    section.classList.remove("is-hidden");
    section.style.visibility = "visible";
    section.style.opacity = "1";
  }
}

function ensureFeatureQrVisible_(){
  const section = qs("featureQrSection");
  const box = qs("featureQrBox");
  if(!section || !box) return;
  if(box.children.length){
    section.style.display = "";
    section.classList.remove("is-hidden");
    section.style.visibility = "visible";
    section.style.opacity = "1";
  }
}

function ensureCardExpiryVisible_(){
  const el = qs("cardExpiry");
  if(!el) return;
  if(text(el.textContent)){
    el.style.display = "block";
    el.classList.remove("is-hidden");
  }
}

function renderPostRendererUi_(row){
  const payload = row || getActiveCardPayload_();
  if(!payload) return;

  renderCardExpiry_(payload);
  rerenderBottomQr_(payload);
  rerenderFeatureQr_(payload);
  rerenderFacadeQr_();

  ensureBottomQrVisible_();
  ensureFeatureQrVisible_();
  ensureCardExpiryVisible_();

  applySmartBalanceAll_();
  refreshAllExpandable_();
  updateQrCenterSizes_();
}

/* ============================================================
   主卡讀取
============================================================ */
async function loadCardById_(id){
  const payload = await fetchJsonRobust_(buildCardApiUrl_(id));
  const row = extractCardRow_(payload);

  if(!row || typeof row !== "object" || !Object.keys(row).length){
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

function renderMainCard_(row){
  const root = qs("livePreviewCard") || qs("cardStage") || qs("cardRoot");
  if(!root) throw new Error("找不到 livePreviewCard / cardStage");

  const renderer =
    window.HscCardRenderer &&
    typeof window.HscCardRenderer.renderCard === "function"
      ? window.HscCardRenderer.renderCard
      : null;

  if(!renderer){
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

  if(!result || result.ok !== true){
    throw new Error("主卡 renderer 回傳失敗");
  }

  renderPostRendererUi_(buildNormalizedPayload_(payload));
}

/* ============================================================
   載入遮罩
============================================================ */
function hideLoadingMask_(){
  const mask = qs("loadingMask");
  if(!mask) return;
  mask.classList.add("is-hidden");
  setTimeout(() => {
    mask.style.display = "none";
  }, 260);
}

function showLoadingMask_(){
  const mask = qs("loadingMask");
  if(!mask) return;
  mask.style.display = "flex";
  mask.classList.remove("is-hidden");
}

/* ============================================================
   版本顯示
============================================================ */
function paintVersion_(){
  const el = qs("versionTag");
  if(el) el.textContent = CONFIG.VERSION;
}

/* ============================================================
   body scroll lock
============================================================ */
let __bodyScrollTop = 0;

function lockBodyScroll_(){
  __bodyScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${__bodyScrollTop}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockBodyScroll_(){
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
(async function boot_(){
  try{
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
  }catch(err){
    console.error("[HSC card] boot failed:", err);
    hideLoadingMask_();
    alert("載入資料失敗，請稍後再試");
  }
})();

