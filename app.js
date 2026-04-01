/* ============================================================
   天使幸福智慧名片館 app.js
   v7.7.1-premium-switch-fix
   完整覆蓋版
   - 門面固定只讀 TW0001
   - 門面樣品體驗切換獨立 facadeState
   - 修正無法切到精品設計：同步 body mode/theme class
   - 正式使用 card-renderer.js 渲染門面樣品
   - 保留 fetch / announcement / share / install / invite / QR
============================================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v7.7.1-premium-switch-fix",
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

/* 門面專用：固定樣品資料 + 體驗切換狀態 */
let facadeBaseData = null;

const facadeState = {
  plan: "free",       // free | premium
  color: "c1",        // free 顏色 c1~c5
  style: "s1",        // s1~s3
  paper: "f1",        // f1~f3
  premiumColor: "p1"  // premium 顏色 p1~p7
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

function getReferralSourceCode_(p){
  const urlRef = getRefFromUrl_();
  if(urlRef) return urlRef;
  if(p){
    const code =
      text(pick(p, ["agent_id"])) ||
      text(pick(p, ["service_agent"])) ||
      text(pick(p, ["referrer"])) ||
      text(pick(p, ["id"]));
    if(code) return code;
  }
  return FACADE_SAMPLE_ID;
}

function getCardIdForShare_(p){
  const payload = p || currentRow || null;
  return (
    normalizeId_(text(pick(payload, ["id"]))) ||
    FACADE_SAMPLE_ID
  );
}

function getAgentIdForShare_(p){
  const payload = p || currentRow || null;
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
    const code = getReferralSourceCode_(currentRow || facadeBaseData);
    if(code) u.searchParams.set("ref", code);
    return u.toString();
  }catch{
    const code = getReferralSourceCode_(currentRow || facadeBaseData);
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

  const refCode = getReferralSourceCode_(facadeBaseData || currentRow);
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
window.__getReferralSourceCode = function(){ return getReferralSourceCode_(facadeBaseData || currentRow); };

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
    useExistingDom: true,
    qrMode: "facade",
    allowActions: false
  });

  if(!result || result.ok !== true){
    throw new Error("門面 renderer 回傳失敗");
  }

  currentRow = buildNormalizedPayload_(data || {});
  currentReferralSourceCodeCache = getReferralSourceCode_(facadeBaseData);
  window.__CARD_DATA__ = currentRow;
  window.cardData = currentRow;
  window.payload = currentRow;

  const avatarInfo = pickAvatarInfo_(currentRow);
  currentAvatarUrlCache = avatarInfo.url || "";
  currentAvatarSourceKeyCache = avatarInfo.key || "";

  renderPostRendererUi_(currentRow);
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

function parseDateSafe_(value){
  if(!value) return null;
  const s = String(value).trim();
  if(!s) return null;
  const normalized = s.replace(/\//g, "-").replace(" ", "T");
  let d = new Date(normalized);
  if(!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
    if(!isNaN(d.getTime())) return d;
  }
  return null;
}

function renderCardExpiry_(p){
  const el = qs("cardExpiry");
  if(!el) return;
  const raw = text(pick(p, ["expires_at"]));
  if(!raw){
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  const exp = parseDateSafe_(raw);
  if(!exp){
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const expStart = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()).getTime();
  const diffDays = Math.floor((expStart - nowStart) / 86400000);
  let label = "";
  if(diffDays < 0) label = diffDays === -1 ? "EXPIRED 1 DAY AGO" : `EXPIRED ${Math.abs(diffDays)} DAYS AGO`;
  else if(diffDays === 0) label = "EXPIRES TODAY";
  else if(diffDays === 1) label = "EXPIRES IN 1 DAY";
  else label = `EXPIRES IN ${diffDays} DAYS`;
  el.textContent = label;
  el.style.display = "block";
}

/* ============================================================
   公告
============================================================ */
function parseDateLoose_(value){
  if(!value) return null;
  const s = String(value).trim();
  if(!s) return null;
  let d = new Date(s.replace(/\//g, "-").replace(" ", "T"));
  if(!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    if(!isNaN(d.getTime())) return d;
  }
  return null;
}

function isAnnouncementActive_(item){
  const status = text(item.status || "active").toLowerCase();
  if(status && status !== "active") return false;
  const now = Date.now();
  const startAt = parseDateLoose_(item.start_at);
  const endAt = parseDateLoose_(item.end_at);
  if(startAt && now < startAt.getTime()) return false;
  if(endAt){
    const endMs = new Date(
      endAt.getFullYear(), endAt.getMonth(), endAt.getDate(), 23, 59, 59, 999
    ).getTime();
    if(now > endMs) return false;
  }
  return true;
}

function sortAnnouncements_(items){
  return [...items].sort((a, b) => {
    const pa = Number(a.priority || 0);
    const pb = Number(b.priority || 0);
    if(pb !== pa) return pb - pa;
    const ta = parseDateLoose_(a.updated_at || a.created_at || a.start_at || "")?.getTime() || 0;
    const tb = parseDateLoose_(b.updated_at || b.created_at || b.start_at || "")?.getTime() || 0;
    return tb - ta;
  });
}

function normalizeAnnouncementItems_(payload){
  if(Array.isArray(payload)){
    return payload.filter(x => x && typeof x === "object");
  }
  if(!payload || typeof payload !== "object") return [];
  const arr =
    (Array.isArray(payload.announcements) ? payload.announcements : null) ||
    (Array.isArray(payload.items) ? payload.items : null) ||
    (Array.isArray(payload.data) ? payload.data : null) ||
    (Array.isArray(payload.rows) ? payload.rows : null) ||
    [];
  return arr.filter(x => x && typeof x === "object");
}

function openAnnouncementModal_(item, currentIdx, total){
  if(!item) return;
  const mask = qs("announcementMask");
  const titleEl = qs("announcementModalTitle");
  const metaEl = qs("announcementModalMeta");
  const bodyEl = qs("announcementModalBody");
  if(!mask || !bodyEl) return;

  if(titleEl){
    titleEl.innerHTML = `<i class="fa-solid fa-bullhorn"></i> ${escapeHtml_(item.title || "公告")}`;
  }
  if(metaEl){
    let metaStr = "門面公告";
    if(total > 1) metaStr += `　${(currentIdx||0)+1} / ${total}`;
    metaEl.textContent = metaStr;
  }
  if(bodyEl){
    bodyEl.textContent = text(item.content || "（無內容）");
  }

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
  if(mask) mask.addEventListener("click", function(e){
    if(e.target === mask) closeAnnouncementModal_();
  });
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
    if(textEl){
      const summary = text(item.content || "").split("\n")[0].slice(0, 60);
      textEl.textContent = summary + (text(item.content || "").length > 60 ? "⋯" : "");
    }
    if(counterEl) counterEl.textContent = total > 1 ? `${idx + 1} / ${total}` : "";

    if(trackBtn){
      trackBtn.onclick = null;
      trackBtn.onclick = () => openAnnouncementModal_(item, idx, total);
    }
  });
}

function stopAnnouncementRotation_(){
  if(announcementTimer_){
    clearInterval(announcementTimer_);
    announcementTimer_ = null;
  }
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

  if(!active.length){
    qsa("[data-announcement-panel]").forEach(p => { p.style.display = "none"; });
    return;
  }

  qsa("[data-announcement-panel]").forEach(p => { p.style.display = ""; });
  startAnnouncementRotation_(active);
}

async function fetchAndRenderAnnouncements_(){
  try{
    const payload = await fetchJsonRobust_(buildAnnouncementApiUrl_());
    const items = normalizeAnnouncementItems_(payload);

    if(items && items.length > 0){
      renderAnnouncementPanels_(items);
    }else{
      renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS);
    }
  }catch(err){
    console.warn("[HSC announcement] GAS 請求失敗，使用內建公告:", err);
    renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS);
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
  if(window.innerWidth > 560){
    el.textContent = raw;
    return;
  }

  if(el.dataset.balanceType === "hero-copy"){
    const parts = raw.split("|");
    el.innerHTML = "";
    if(parts.length >= 2){
      const first = document.createElement("span");
      first.className = "balance-line";
      first.textContent = parts[0] + "|";
      el.appendChild(first);
      const rest = parts.slice(1).join("|");
      const idx = rest.indexOf("打造");
      if(idx > -1){
        const line2 = document.createElement("span");
        line2.className = "balance-line";
        line2.textContent = rest.slice(0, idx).trim();
        el.appendChild(line2);
        const line3 = document.createElement("span");
        line3.className = "balance-line";
        line3.textContent = rest.slice(idx).trim();
        el.appendChild(line3);
      }else{
        const line2 = document.createElement("span");
        line2.className = "balance-line";
        line2.textContent = rest.trim();
        el.appendChild(line2);
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

function applySmartBalanceAll_(){
  qsa("[data-balance-type]").forEach(applySmartBalanceToEl_);
}

let __balanceTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(__balanceTimer);
  __balanceTimer = setTimeout(() => {
    applySmartBalanceAll_();
    updateQrCenterSizes_();
  }, 120);
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

function buildQrImageUrl_(url, size){
  const s = Number(size) || 220;
  return "https://api.qrserver.com/v1/create-qr-code/"
    + "?size=" + encodeURIComponent(`${s}x${s}`)
    + "&data=" + encodeURIComponent(String(url))
    + "&ecc=H"
    + "&margin=2";
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
  if(!u){
    hideCenterImg_(imgEl);
    return;
  }
  const ratio = getQrCenterRatio_(sizeRatio);
  imgEl.dataset.baseRatio = String(sizeRatio);
  imgEl.dataset.centerUrl = u;
  imgEl.style.position = "absolute";
  imgEl.style.left = "50%";
  imgEl.style.top = "50%";
  imgEl.style.width = `${Math.round(ratio * 100)}%`;
  imgEl.style.height = `${Math.round(ratio * 100)}%`;
  imgEl.style.transform = "translate(-50%, -50%)";
  imgEl.style.borderRadius = "999px";
  imgEl.style.objectFit = "cover";
  imgEl.style.zIndex = "3";
  imgEl.style.background = "transparent";
  imgEl.style.padding = "0";
  imgEl.style.boxShadow = "none";
  imgEl.style.display = "block";
  imgEl.style.pointerEvents = "none";
  imgEl.onerror = () => { hideCenterImg_(imgEl); };
  setImgWithFallback_(imgEl, buildImgCandidates_(u), {
    crossOrigin: "anonymous",
    referrerPolicy: "no-referrer",
    onLoad: () => {
      imgEl.style.display = "block";
      imgEl.style.background = "transparent";
      imgEl.style.padding = "0";
      imgEl.style.boxShadow = "none";
    },
    onFail: () => { hideCenterImg_(imgEl); }
  });
}

function updateQrCenterSizes_(){
  ["bottomQrAvatar", "featureQrAvatar", "facadeQrAvatar"].forEach(id => {
    const el = qs(id);
    if(!el || el.style.display === "none") return;
    const baseRatio = clampNumber_(el.dataset.baseRatio, 0.05, 0.2, 0.09);
    const ratio = getQrCenterRatio_(baseRatio);
    el.style.width = `${Math.round(ratio * 100)}%`;
    el.style.height = `${Math.round(ratio * 100)}%`;
  });
}

function renderQr(options){
  const {
    container, url, size = 160,
    centerImgEl = null, centerImgUrl = "", centerSizeRatio = 0.09, renderKey = ""
  } = options || {};
  if(!container || !url) return false;
  const key = renderKey || `${url}|${size}|${normalizeImageUrl_(centerImgUrl)}|${centerSizeRatio}`;
  if(container.dataset.renderKey === key){
    if(centerImgEl) setCenterImg_(centerImgEl, centerImgUrl, centerSizeRatio);
    return true;
  }
  container.dataset.renderKey = key;
  container.innerHTML = "";
  const img = document.createElement("img");
  img.alt = "QR Code";
  img.loading = "eager";
  img.decoding = "sync";
  img.referrerPolicy = "no-referrer";
  try{ img.crossOrigin = "anonymous"; }catch{}
  img.src = buildQrImageUrl_(url, size) + "&t=" + Date.now();
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.display = "block";
  img.style.objectFit = "contain";
  container.appendChild(img);
  if(centerImgEl) setCenterImg_(centerImgEl, centerImgUrl, centerSizeRatio);
  return true;
}

window.renderQr = renderQr;
window.__getCurrentAvatarUrl = function(){ return currentAvatarUrlCache || ""; };
window.__getHubShareUrl = buildHubShareUrl_;
window.__getCardShareUrl = function(){ return buildTrackedShareUrl_(currentRow); };
window.__getTrackedShareUrl = function(){ return buildTrackedShareUrl_(currentRow); };

function renderFacadeQrFromCurrent_(){
  const grid = qs("facadeQrGrid");
  if(!grid) return;
  const url = buildHubShareUrl_();
  const key = "facade|" + url;
  if(lastFacadeQrRenderKey === key && grid.dataset.renderKey === key) return;
  lastFacadeQrRenderKey = key;
  renderQr({
    container: grid,
    url,
    size: 148,
    centerImgEl: null,
    centerImgUrl: "",
    renderKey: key
  });
}

function renderBottomQr_(p){
  const sec = qs("bottomQrSection");
  const grid = qs("bottomQrGrid");
  const avatar = qs("bottomQrAvatar");
  if(!sec || !grid || !avatar) return;
  const info = pickAvatarInfo_(p);
  const qrUrl = buildTrackedShareUrl_(p);
  const avatarUrl = info.url;
  const key = "bottom|" + qrUrl + "|" + avatarUrl;
  const canvas = avatar.parentElement;
  if(canvas) canvas.style.position = "relative";
  if(lastBottomQrRenderKey !== key || grid.dataset.renderKey !== key){
    lastBottomQrRenderKey = key;
    renderQr({
      container: grid,
      url: qrUrl,
      size: 136,
      centerImgEl: avatar,
      centerImgUrl: avatarUrl,
      centerSizeRatio: 0.09,
      renderKey: key
    });
  }else{
    setCenterImg_(avatar, avatarUrl, 0.09);
  }
  sec.style.display = "block";
}

function renderFeatureQrFromCurrent_(){
  const grid = qs("featureQrGrid");
  const avatar = qs("featureQrAvatar");
  if(!grid || !avatar) return;
  const url = buildTrackedShareUrl_(currentRow);
  const avatarUrl = currentAvatarUrlCache || "";
  const key = "feature|" + url + "|" + avatarUrl;
  const canvas = avatar.parentElement;
  if(canvas) canvas.style.position = "relative";
  if(lastFeatureQrRenderKey !== key || grid.dataset.renderKey !== key){
    lastFeatureQrRenderKey = key;
    renderQr({
      container: grid,
      url,
      size: 152,
      centerImgEl: avatar,
      centerImgUrl: avatarUrl,
      centerSizeRatio: 0.09,
      renderKey: key
    });
  }else{
    setCenterImg_(avatar, avatarUrl, 0.09);
  }
}
window.__renderFeatureQrFromCurrent = renderFeatureQrFromCurrent_;

/* ============================================================
   分享 / invite
============================================================ */
async function shareUrl_(url, title, textMsg, okMsg){
  try{
    if(navigator.share){
      await navigator.share({ title: title || "天使幸福智慧名片", text: textMsg || "", url });
      return;
    }
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(url);
      alert(okMsg || "✅ 已複製連結");
      return;
    }
    prompt("請手動複製連結", url);
  }catch(_err){}
}

function renderBottomHubShareBtn_(){
  const sec = qs("bottomQrSection");
  if(!sec) return;
  let wrap = qs("bottomHubShareWrap");
  if(!wrap){
    wrap = document.createElement("div");
    wrap.id = "bottomHubShareWrap";
    wrap.style.marginTop = "12px";
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    const btn = document.createElement("button");
    btn.id = "btnShareHubBottom";
    btn.type = "button";
    btn.className = "dock-btn wide dock-web";
    btn.style.maxWidth = "260px";
    btn.style.width = "100%";
    btn.style.borderRadius = "999px";
    btn.style.fontWeight = "900";
    btn.style.boxShadow = "0 10px 22px rgba(83,62,45,.08)";
    btn.innerHTML = `<i class="fa-solid fa-share-nodes"></i><span>分享智慧名片館</span>`;
    btn.addEventListener("click", async () => {
      const url = buildHubShareUrl_();
      await shareUrl_(url, "天使幸福智慧名片館", "分享智慧名片館", "✅ 已複製智慧名片館連結");
    });
    wrap.appendChild(btn);
    sec.insertAdjacentElement("afterend", wrap);
  }
}

function ensureBottomQrVisible_(){
  if(!currentRow) return;
  try{ renderBottomQr_(currentRow); }catch(_e){}
  try{ renderBottomHubShareBtn_(); }catch(_e){}
  setTimeout(() => {
    try{ renderBottomQr_(currentRow); }catch(_e){}
    try{ renderBottomHubShareBtn_(); }catch(_e){}
  }, 250);
  setTimeout(() => {
    try{ renderBottomQr_(currentRow); }catch(_e){}
    try{ renderBottomHubShareBtn_(); }catch(_e){}
  }, 800);
}

function renderInstallDock_(){
  const dock = qs("installDock");
  const cleanMode = getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1";
  if(!dock) return;
  dock.style.display = cleanMode ? "" : "none";
}

/* ============================================================
   renderer 後補 UI
============================================================ */
function renderPostRendererUi_(row){
  const unitVal = normalizeLongText_(pick(row, ["unit", "單位", "公司"]));
  const sloganVal = normalizeLongText_(pick(row, ["slogan", "一句話", "簡介"]));
  const unitEl = qs("u-unit");
  const unitToggle = qs("u-unit-toggle");
  const sloganEl = qs("u-slogan");
  const sloganToggle = qs("u-slogan-toggle");

  if(unitEl) setExpandableText_(unitEl, unitToggle, unitVal, 2, { allowMultiline: true });
  if(sloganEl) setExpandableText_(sloganEl, sloganToggle, sloganVal, 3, { allowMultiline: true });

  const b1 = qs("block-service");
  const b2 = qs("block-exp");
  renderExpandableInfoBlock_(b1, "服務項目", pick(row, ["services","服務項目","service"]), 2);
  renderExpandableInfoBlock_(b2, "經歷 / 品牌故事", pick(row, ["experience","經歷","exp"]), 3);

  const vt = qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;

  renderCardExpiry_(row);
  renderInstallDock_();
  renderBottomQr_(row);
  renderBottomHubShareBtn_();
  renderFeatureQrFromCurrent_();
  renderFacadeQrFromCurrent_();
  applySmartBalanceAll_();
  updateQrCenterSizes_();

  requestAnimationFrame(() => {
    refreshAllExpandable_();
    ensureBottomQrVisible_();
  });
}

/* ============================================================
   PWA
============================================================ */
function isIos_(){ return /iphone|ipad|ipod/i.test(navigator.userAgent || ""); }
function isStandalone_(){ return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true; }

function updateInstallUi_(){
  const btn = qs("btnInstallCard");
  const fab = qs("installFab");
  const dock = qs("installDock");
  const cleanMode = getSearchParams_().get("view") === "1" || getSearchParams_().get("clean") === "1";
  const canInstall = !!deferredInstallPrompt || isIos_() || !isStandalone_();
  if(btn){
    btn.disabled = false;
    btn.style.opacity = canInstall ? "1" : ".62";
  }
  if(fab) fab.style.display = cleanMode ? "flex" : "none";
  if(dock) dock.style.display = cleanMode ? "" : "none";
}

async function triggerPwaInstall_(){
  if(isStandalone_()){
    alert("✅ 已經安裝在桌面上了");
    return;
  }
  if(deferredInstallPrompt){
    try{
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    }catch(err){
      console.error(err);
    }finally{
      deferredInstallPrompt = null;
      updateInstallUi_();
    }
    return;
  }
  if(isIos_()){
    alert("請用 Safari 開啟，點分享，再選『加入主畫面』。\n\n若目前不是 Safari，請先複製此頁連結後改用 Safari 開啟。");
    return;
  }
  alert("目前裝置尚未出現系統安裝提示。\n\n你可以先用瀏覽器選單中的『安裝應用程式』或『加入主畫面』。");
}

window.__triggerPwaInstall = triggerPwaInstall_;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  updateInstallUi_();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallUi_();
});
window.addEventListener("load", () => {
  ensureBottomQrVisible_();
  updateQrCenterSizes_();
}, { once: true });

/* ============================================================
   啟動
============================================================ */
(async function boot_(){
  try{
    initSelectionState_();
    applySmartBalanceAll_();
    updateInstallUi_();
    bindAnnouncementModal_();
    fetchAndRenderAnnouncements_();

    await loadFacadeBaseCard();
    renderFacadePreview();
  }catch(err){
    console.error("[HSC facade] boot failed:", err);
    const nameEl = qs("u-name");
    const unitWrap = qs("u-unit-wrap");
    const titleEl = qs("u-title");
    const unitEl = qs("u-unit");
    if(nameEl) nameEl.textContent = "資料載入失敗";
    if(unitWrap) unitWrap.style.display = "";
    if(unitEl) unitEl.textContent = "請稍後再試";
    if(titleEl) titleEl.textContent = "";

    try{
      bindAnnouncementModal_();
      renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS);
    }catch(_e){}
  }
})();
