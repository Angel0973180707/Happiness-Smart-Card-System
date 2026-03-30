/* ============================================================
   天使幸福智慧名片館 app.js
   v7.3-main-use-shared-renderer
   完整覆蓋版 — 主程式改為呼叫 HSCCardRenderer
============================================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm",
  DEFAULT_ID: "TW0001",
  DEFAULT_TENANT: "angel",
  VERSION: "v7.3-main-use-shared-renderer",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/"
};

const BUILTIN_ANNOUNCEMENTS = [
  {
    id: "builtin-feature",
    title: "產品特色",
    content: `天使幸福智慧名片是一個專為創業者、講師、服務業與個人品牌打造的數位名片入口系統。\n\n【核心特色】\n1. 一頁整合：整合電話、LINE、網站、社群平台、影音與品牌介紹，一次呈現。\n2. 行動門面：名片不只是聯絡資訊，而是你的品牌入口，讓客戶快速了解你。\n3. 可分享可收藏：支援 QR Code、連結分享與手機收藏，讓客戶隨時找得到你。\n4. 彈性設計：提供自由搭配款與精品設計款，依照個人風格打造專屬名片。\n5. 持續更新：內容可隨時調整，讓名片永遠保持最新狀態。\n6. 導流轉換：結合 CTA 按鈕，引導客戶聯繫、加 LINE 或前往服務頁。\n\n天使幸福智慧名片館，幫你把「被看見」變成「被記住」。`,
    status: "active",
    priority: 10
  },
  {
    id: "builtin-flow",
    title: "申請流程",
    content: `【申請流程】\n1. 先申請表單邀請碼\n2. 複製申請內容\n3. 加入 LINE 官方帳號提出申請\n4. 客服提供邀請碼與表單連結\n5. 完成填表後建立你的智慧名片\n\n若想更快開始，也可直接先閱讀門面內容，再依指引完成申請。`,
    status: "active",
    priority: 9
  }
];

let currentRow = null;
let deferredInstallPrompt = null;
let currentReferralSourceCodeCache = "";
let currentInviteApplyCodeCache = "";
let currentInviteCopyTextCache = "";
let announcementItems_ = [];
let announcementIndex_ = 0;
let announcementTimer_ = null;

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return (v == null ? "" : String(v)).trim(); }

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(!v) return "";
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
  if(/^TW\d{1,4}$/.test(v)) return "TW" + v.replace(/^TW/i, "").padStart(4, "0");
  return v;
}
function getSearchParams_(){ try{ return new URLSearchParams(location.search || ""); } catch { return new URLSearchParams(); } }
function getIdFromUrl_(){ try{ return getSearchParams_().get("id") || ""; }catch{ return ""; } }
function getRefFromUrl_(){ try{ return text(getSearchParams_().get("ref") || ""); }catch{ return ""; } }
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
    const res = await fetch(url, { method: "GET", cache: "no-store", redirect: "follow", signal: controller.signal });
    const txt = await res.text();
    const json = safeJsonParse_(txt);
    if(!json) throw new Error("Not JSON");
    return json;
  } finally { clearTimeout(t); }
}
async function fetchJsonRobust_(url){
  let last = null;
  for(let i = 0; i <= CONFIG.RETRY; i++){
    try{ return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS); }
    catch(e){ last = e; await new Promise(r => setTimeout(r, 520 + i * 520)); }
  }
  throw last || new Error("Fetch failed");
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
  if("id" in payload || "name" in payload || "plan" in payload || "avatar_url" in payload || "title" in payload) return payload;
  return {};
}
function getReferralSourceCode_(p){
  const urlRef = getRefFromUrl_();
  if(urlRef) return urlRef;
  if(p){
    const keys = ["agent_id","service_agent","referrer","id"];
    for(const k of keys){ const v = text(p[k]); if(v) return v; }
  }
  return normalizeId_(getIdFromUrl_()) || "";
}
function createLocalApplyCode_(){
  const d = new Date();
  return `AP${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
}
function buildInviteApplyText_(refCode, applyCode){
  return [
    "您好，我想申請天使幸福智慧名片邀請碼。",
    "",
    `推薦來源識別碼：${text(refCode) || "無"}`,
    `申請識別碼：${text(applyCode) || "-"}`,
    "",
    "請協助我申請開通表單，謝謝。"
  ].join("\n");
}
async function ensureInviteApplyData_(){
  if(currentInviteApplyCodeCache && currentInviteCopyTextCache){
    return { refCode: currentReferralSourceCodeCache || "無", applyCode: currentInviteApplyCodeCache, copyText: currentInviteCopyTextCache };
  }
  const refCode = getReferralSourceCode_(currentRow);
  currentReferralSourceCodeCache = refCode || "";
  let applyCode = "";
  try{
    const payload = await fetchJsonRobust_(buildLeadCreateUrl_(refCode));
    applyCode = text(payload?.data?.lead_id || payload?.lead_id || "");
  }catch(_err){ applyCode = ""; }
  if(!applyCode) applyCode = createLocalApplyCode_();
  currentInviteApplyCodeCache = applyCode;
  currentInviteCopyTextCache = buildInviteApplyText_(refCode, applyCode);
  return { refCode: refCode || "無", applyCode, copyText: currentInviteCopyTextCache };
}
window.__ensureInviteApplyData = ensureInviteApplyData_;
window.__getReferralSourceCode = function(){ return getReferralSourceCode_(currentRow); };

function parseDateLoose_(value){
  if(!value) return null;
  const s = String(value).trim();
  if(!s) return null;
  let d = new Date(s.replace(/\//g, "-").replace(" ", "T"));
  if(!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
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
    const endMs = new Date(endAt.getFullYear(), endAt.getMonth(), endAt.getDate(), 23, 59, 59, 999).getTime();
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
  if(Array.isArray(payload)) return payload.filter(x => x && typeof x === "object");
  if(!payload || typeof payload !== "object") return [];
  const arr = (Array.isArray(payload.announcements) ? payload.announcements : null) || (Array.isArray(payload.items) ? payload.items : null) || (Array.isArray(payload.data) ? payload.data : null) || (Array.isArray(payload.rows) ? payload.rows : null) || [];
  return arr.filter(x => x && typeof x === "object");
}
function openAnnouncementModal_(item, currentIdx, total){
  if(!item) return;
  const mask = qs("announcementMask");
  const titleEl = qs("announcementModalTitle");
  const metaEl = qs("announcementModalMeta");
  const bodyEl = qs("announcementModalBody");
  if(!mask || !bodyEl) return;
  if(titleEl) titleEl.innerHTML = `<i class="fa-solid fa-bullhorn"></i> ${item.title || "公告"}`;
  if(metaEl){ let metaStr = "門面公告"; if(total > 1) metaStr += `　${(currentIdx||0)+1} / ${total}`; metaEl.textContent = metaStr; }
  bodyEl.textContent = text(item.content || "（無內容）");
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
    if(textEl){
      const summary = text(item.content || "").split("\n")[0].slice(0, 60);
      textEl.textContent = summary + (text(item.content || "").length > 60 ? "⋯" : "");
    }
    if(counterEl) counterEl.textContent = total > 1 ? `${idx + 1} / ${total}` : "";
    if(trackBtn){ trackBtn.onclick = () => openAnnouncementModal_(item, idx, total); }
  });
}
function stopAnnouncementRotation_(){ if(announcementTimer_){ clearInterval(announcementTimer_); announcementTimer_ = null; } }
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
async function fetchAndRenderAnnouncements_(){
  try{
    const payload = await fetchJsonRobust_(buildAnnouncementApiUrl_());
    const items = normalizeAnnouncementItems_(payload);
    renderAnnouncementPanels_(items && items.length > 0 ? items : BUILTIN_ANNOUNCEMENTS);
  }catch(err){
    console.warn("[HSC announcement] fallback to built-in:", err);
    renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS);
  }
}

function isIos_(){ return /iphone|ipad|ipod/i.test(navigator.userAgent || ""); }
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
  if(isStandalone_()){ alert("✅ 已經安裝在桌面上了"); return; }
  if(deferredInstallPrompt){
    try{ deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; }
    catch(err){ console.error(err); }
    finally{ deferredInstallPrompt = null; updateInstallUi_(); }
    return;
  }
  if(isIos_()){ alert("請用 Safari 開啟，點分享，再選『加入主畫面』。\n\n若目前不是 Safari，請先複製此頁連結後改用 Safari 開啟。"); return; }
  alert("目前裝置尚未出現系統安裝提示。\n\n你可以先用瀏覽器選單中的『安裝應用程式』或『加入主畫面』。");
}
window.__triggerPwaInstall = triggerPwaInstall_;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstallPrompt = e; updateInstallUi_(); });
window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; updateInstallUi_(); });

function renderMainCard_(row){
  const root = qs("livePreviewCard");
  if(!root) throw new Error("#livePreviewCard 不存在");
  if(!window.HSCCardRenderer) throw new Error("HSCCardRenderer 尚未載入");
  currentRow = row || {};
  currentReferralSourceCodeCache = getReferralSourceCode_(currentRow);
  const result = window.HSCCardRenderer.render(currentRow, root, { applyBodyClasses: true });
  window.__CARD_DATA__ = result.payload;
  window.cardData = result.payload;
  window.payload = result.payload;
  const vt = qs("versionTag");
  if(vt) vt.textContent = CONFIG.VERSION;
}

(async function boot_(){
  try{
    if(!window.HSCCardRenderer) throw new Error("缺少 card-renderer.js");
    bindAnnouncementModal_();
    fetchAndRenderAnnouncements_();
    updateInstallUi_();
    const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
    const payload = await fetchJsonRobust_(buildCardApiUrl_(id));
    const row = extractCardRow_(payload);
    if(!row || typeof row !== "object" || !Object.keys(row).length) throw new Error("卡片資料為空");
    renderMainCard_(row);
  }catch(err){
    console.error("[HSC card] boot failed:", err);
    const nameEl = qs("u-name");
    const unitWrap = qs("u-unit-wrap");
    const titleEl = qs("u-title");
    const unitEl = qs("u-unit");
    if(nameEl) nameEl.textContent = "資料載入失敗";
    if(unitWrap) unitWrap.style.display = "";
    if(unitEl) unitEl.textContent = "請稍後再試";
    if(titleEl) titleEl.textContent = "";
    bindAnnouncementModal_();
    renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS);
  }
})();
