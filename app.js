/* =========================================================
 * 幸福智慧名片｜app.js（V385.1｜Stable Complete Overwrite）
 * ========================================================= */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001"
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let current = { id: CONFIG.DEFAULT_ID, wechat: "", phone: "", email: "", map: "", line: "", lineText: "", lineOA: "" };

function byId_(id){ return document.getElementById(id); }

function toast_(msg){
  const t = byId_("toast");
  if (!t) return;
  t.textContent = String(msg || "");
  t.style.display = "block";
  clearTimeout(toast_._tm);
  toast_._tm = setTimeout(()=>{ t.style.display = "none"; }, 1600);
}

function safeText_(el, text){
  if (!el) return;
  el.textContent = (text === null || text === undefined) ? "" : String(text);
}
function safeHTML_(el, html){
  if (!el) return;
  el.innerHTML = html || "";
}

function getIdFromUrl_() {
  try {
    const u = new URL(location.href);
    return (u.searchParams.get("id") || CONFIG.DEFAULT_ID || "TW0001").trim();
  } catch (e) {
    return (CONFIG.DEFAULT_ID || "TW0001").trim();
  }
}

function stripZeroWidth_(s){ return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, ""); }
function normKey_(s){
  let t = stripZeroWidth_(s);
  t = t.replace(/"/g, "");
  t = t.replace(/\r?\n/g, " ");
  t = t.replace(/\s+/g, " ");
  return t.trim();
}
function buildRowIndex_(rowObj){
  const idx = new Map();
  Object.keys(rowObj || {}).forEach(k => {
    const nk = normKey_(k);
    if (!idx.has(nk)) idx.set(nk, rowObj[k]);
  });
  return idx;
}
function findByIncludes_(indexMap, patterns){
  if (!indexMap || !(indexMap instanceof Map)) return "";
  const keys = Array.from(indexMap.keys());
  for (const p of patterns) {
    const np = normKey_(p);
    for (const k of keys) {
      if (k.includes(np)) {
        const v = indexMap.get(k);
        if (v !== null && v !== undefined && String(v).trim() !== "") return v;
      }
    }
  }
  return "";
}
function rowToObject_(row, headers) {
  if (!row) return null;
  if (typeof row === "object" && !Array.isArray(row)) return row;
  if (Array.isArray(row) && Array.isArray(headers) && headers.length) {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h)] = row[i]; });
    return obj;
  }
  return null;
}

function normalizeMultiline_(s){
  return String(s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}
function toLines_(s){
  const t = normalizeMultiline_(s);
  if (!t) return [];
  return t.split(/\n+/).map(x => x.trim()).filter(Boolean);
}
function escapeHtml_(s){
  return String(s || "").replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toBulletsHTML_(s){
  const lines = toLines_(s);
  if (!lines.length) return "";
  if (lines.length === 1) return `<div style="line-height:1.7;">${escapeHtml_(lines[0])}</div>`;
  return `<ul style="margin:0; padding-left:18px; line-height:1.7;">` + lines.map(li => `<li>${escapeHtml_(li)}</li>`).join("") + `</ul>`;
}
function escapeAttr_(s){
  return String(s || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function extractDriveId_(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  const m1 = s.match(/[?&]id=([^&]+)/i);
  const m2 = s.match(/\/d\/([^/]+)/i);
  const m3 = s.match(/\/file\/d\/([^/]+)/i);
  if (m1) return m1[1];
  if (m3) return m3[1];
  if (m2) return m2[1];
  return "";
}
function driveImageCandidates_(url) {
  const raw = String(url || "").trim();
  const id = extractDriveId_(raw);
  if (!id) return [raw];
  return [
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${id}`,
    raw
  ];
}
function setImgWithFallback_(imgEl, url) {
  if (!imgEl) return;
  const candidates = driveImageCandidates_(url);
  let idx = 0;
  const tryNext = () => {
    if (idx >= candidates.length) return;
    imgEl.src = candidates[idx++];
  };
  imgEl.onerror = () => tryNext();
  tryNext();
}

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");
  applyV382_();
};

window.setV382Style = function(style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382_();
};

function applyV382_() {
  const isFree = state.mode === "free";
  const controlPanel = byId_("free-controls");
  if (controlPanel) controlPanel.style.display = isFree ? "block" : "none";
  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : "",
    isFree ? state.paper : ""
  ];
  document.body.className = classList.filter(Boolean).join(" ");
}

function syncPanelActive_(){
  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  const sel = document.querySelector(`[data-mode="${state.mode}"][data-theme="${state.theme}"]`);
  if (sel) sel.classList.add("active");
  document.querySelectorAll('#free-controls .control-row:first-child .btn-neo').forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-style") === state.style);
  });
  document.querySelectorAll('#free-controls .control-row:nth-child(2) .btn-neo').forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-paper") === state.paper);
  });
}

window.goFillForm = () => window.open(CONFIG.FORM, "_blank");
window.goLineOA = () => { if (current.lineOA) window.open(current.lineOA, "_blank"); };
window.goLine = () => { if (current.line) window.open(current.line, "_blank"); };
window.goMap = () => { if (current.map) window.open(current.map, "_blank"); };
window.callPhone = () => { if (current.phone) window.location.href = `tel:${current.phone}`; };
window.sendEmail = () => { if (current.email) window.location.href = `mailto:${current.email}`; };

window.copyWeChat = async () => {
  if (!current.wechat) return;
  try {
    await navigator.clipboard.writeText(current.wechat);
    toast_("已複製微信ID");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = current.wechat;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast_("已複製微信ID");
  }
};

function setVisible_(el, yes){ if (el) el.style.display = yes ? "" : "none"; }

function setThemeFromPrefs_(idx){
  const prefStyle = findByIncludes_(idx, ["您喜歡的版型","你喜歡的版型"]);
  const prefColor = findByIncludes_(idx, ["您喜歡的顏色","你喜歡的顏色"]);
  const prefPaper = findByIncludes_(idx, ["您喜歡的紙感","你喜歡的紙感"]);
  const prefPremium = findByIncludes_(idx, ["你喜歡的底色","您喜歡的底色"]);

  const styleMap = { "優雅正拱":"arch", "簡潔平直":"flat", "晨曦款":"spot", "arch":"arch", "flat":"flat", "spot":"spot" };
  const paperMap = { "棉紙":"paper-1", "顆粒":"paper-2", "亞麻":"paper-3", "paper-1":"paper-1", "paper-2":"paper-2", "paper-3":"paper-3" };
  const colorMap = { "紅":"color-1", "藍":"color-2", "橘":"color-3", "紫":"color-4", "綠":"color-5", "color-1":"color-1", "color-2":"color-2", "color-3":"color-3", "color-4":"color-4", "color-5":"color-5" };
  const premiumMap = { "p1":"p1","p2":"p2","p3":"p3","p4":"p4","p5":"p5","p6":"p6","p7":"p7" };

  if (prefPremium && premiumMap[prefPremium]) {
    state.mode = "premium";
    state.theme = premiumMap[prefPremium];
  } else {
    state.mode = "free";
    const c = colorMap[prefColor] || (prefColor ? colorMap[prefColor.trim()] : "");
    if (c) state.theme = c;
    const st = styleMap[prefStyle] || (prefStyle ? styleMap[prefStyle.trim()] : "");
    if (st) state.style = st;
    const pa = paperMap[prefPaper] || (prefPaper ? paperMap[prefPaper.trim()] : "");
    if (pa) state.paper = pa;
  }
  applyV382_();
  syncPanelActive_();
}

function renderLinks_(links){
  const box = byId_("u-links");
  if (!box) return;
  const items = [];
  for (const it of links) {
    if (!it.url) continue;
    items.push(`
      <div class="link-pill" onclick="window.open('${escapeAttr_(it.url)}','_blank')">
        <div class="left">
          <i class="${escapeAttr_(it.icon || 'fa-solid fa-link')}"></i>
          <div>
            <div style="font-weight:900;">${escapeHtml_(it.label)}</div>
            ${it.tag ? `<div class="tag">${escapeHtml_(it.tag)}</div>` : ``}
          </div>
        </div>
        <i class="fa-solid fa-chevron-right" style="opacity:.55;"></i>
      </div>
    `);
  }
  if (!items.length) { setVisible_(box, false); return; }
  safeHTML_(box, `<h3>影音 / 社群</h3><div class="links-grid">${items.join("")}</div>`);
  setVisible_(box, true);
}

function renderFAQ_(q1,a1,q2,a2){
  const box = byId_("u-faq");
  if (!box) return;
  const pairs = [];
  if (q1 && a1) pairs.push([q1,a1]);
  if (q2 && a2) pairs.push([q2,a2]);
  if (!pairs.length) { setVisible_(box,false); return; }

  const html = pairs.map((p, i) => `
    <div class="faq-item">
      <button class="faq-q" data-i="${i}">
        <span>${escapeHtml_(p[0])}</span>
        <i class="fa-solid fa-plus"></i>
      </button>
      <div class="faq-a">${toBulletsHTML_(p[1])}</div>
    </div>
  `).join("");

  safeHTML_(box, `<h3>常見提問</h3>${html}`);
  setVisible_(box,true);

  box.querySelectorAll(".faq-q").forEach(btn => {
    btn.addEventListener("click", () => {
      const a = btn.parentElement.querySelector(".faq-a");
      const icon = btn.querySelector("i");
      const open = a.style.display === "block";
      a.style.display = open ? "none" : "block";
      icon.className = open ? "fa-solid fa-plus" : "fa-solid fa-minus";
    });
  });
}


function splitUrls_(v){
  const s = String(v || "").trim();
  if (!s) return [];
  // 支援：換行、逗號、全形逗號、分號
  return s.split(/\r?\n|,|，|;|；/g).map(x=>String(x||"").trim()).filter(Boolean);
}

function collectProductImages_(idx){
  // 允許：同一欄位多行、或多個欄位（照片1~照片5 / 任意包含關鍵字）
  const out = [];
  const pushMany = (val)=>{
    splitUrls_(val).forEach(u=>{
      if (u && !out.includes(u)) out.push(u);
    });
  };

  // 1) 任何「包含」產品照片字樣的欄位（可能同一欄位多行）
  const keys = Array.from(idx.keys());
  keys.forEach(k=>{
    if (k.includes("產品或品牌或活動照片")) pushMany(idx.get(k));
  });

  // 2) 兼容：產品照片1~5（你未來可能拆欄）
  keys.forEach(k=>{
    if (/產品.*照片\s*\d+/i.test(k) || /活動.*照片\s*\d+/i.test(k)) pushMany(idx.get(k));
  });

  return out.slice(0,5);
}

// ------------------------ gallery + lightbox ------------------------
let __lb = null;
function ensureLightbox_(){
  if (__lb) return __lb;
  const el = document.createElement("div");
  el.id = "lightbox";
  el.className = "lightbox hidden";
  el.innerHTML = `
    <div class="lb-backdrop"></div>
    <div class="lb-shell" role="dialog" aria-modal="true">
      <button class="lb-close" aria-label="關閉"><i class="fa-solid fa-xmark"></i></button>
      <button class="lb-nav lb-prev" aria-label="上一張"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="lb-nav lb-next" aria-label="下一張"><i class="fa-solid fa-chevron-right"></i></button>
      <div class="lb-stage">
        <img class="lb-img" alt="原尺寸圖片" />
      </div>
      <div class="lb-count"></div>
    </div>
  `;
  document.body.appendChild(el);

  const close = ()=> el.classList.add("hidden");
  el.querySelector(".lb-backdrop").addEventListener("click", close);
  el.querySelector(".lb-close").addEventListener("click", close);

  // ESC 關閉
  window.addEventListener("keydown", (e)=>{
    if (!el.classList.contains("hidden") && e.key === "Escape") close();
  });

  __lb = { el, img: el.querySelector(".lb-img"), count: el.querySelector(".lb-count"), close };
  return __lb;
}

function openLightbox_(urls, startIndex){
  const lb = ensureLightbox_();
  const list = (urls || []).filter(Boolean);
  if (!list.length) return;

  let i = Math.max(0, Math.min(list.length-1, Number(startIndex)||0));

  const set = ()=>{
    lb.el.classList.remove("hidden");
    lb.count.textContent = `${i+1} / ${list.length}`;
    setImgWithFallback_(lb.img, list[i]);
  };

  const prev = ()=>{ i = (i - 1 + list.length) % list.length; set(); };
  const next = ()=>{ i = (i + 1) % list.length; set(); };

  lb.el.querySelector(".lb-prev").onclick = prev;
  lb.el.querySelector(".lb-next").onclick = next;

  // 簡單滑動：左右切換
  let x0 = null;
  const stage = lb.el.querySelector(".lb-stage");
  stage.ontouchstart = (e)=>{ x0 = e.touches && e.touches[0] ? e.touches[0].clientX : null; };
  stage.ontouchend = (e)=>{
    if (x0 === null) return;
    const x1 = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null;
    if (x1 === null) return;
    const dx = x1 - x0;
    if (Math.abs(dx) > 40) (dx > 0 ? prev() : next());
    x0 = null;
  };

  set();
}

function renderGallery_(urls){
  const box = byId_("u-gallery");
  if (!box) return;

  const u = (urls || []).filter(Boolean).slice(0,5);
  if (!u.length) { setVisible_(box,false); return; }

  setVisible_(box,true);
  const isFree = state.mode === "free";

  // layout class for premium (1~5)
  box.classList.remove("layout-1","layout-2","layout-3","layout-4","layout-5","free-carousel","premium-grid");
  if (isFree) {
    box.classList.add("free-carousel");
  } else {
    box.classList.add("premium-grid", `layout-${u.length}`);
  }

  box.innerHTML = "";

  u.forEach((url, idx)=>{
    const item = document.createElement("button");
    item.type = "button";
    item.className = "g-item";
    item.setAttribute("aria-label", `查看圖片 ${idx+1}`);
    item.innerHTML = `<img class="g-img" alt="產品照片" />`;
    const img = item.querySelector("img");
    setImgWithFallback_(img, url);
    item.addEventListener("click", ()=> openLightbox_(u, idx));
    box.appendChild(item);
  });
}


function renderCard_(idx){
  const nameEl = byId_("u-name");
  const unitEl = byId_("u-unit");
  const sloganEl = byId_("u-slogan");
  const serviceEl = byId_("u-service");
  const titlesEl = byId_("u-titles");
  const logoEl = byId_("u-logo");
  const avatarEl = byId_("u-img");

  const name = findByIncludes_(idx, ["姓名（名片大標題）","姓名"]);
  const unit = findByIncludes_(idx, ["單位名稱（如：幸福教養概念館）","單位名稱","單位"]);
  const slogan = findByIncludes_(idx, ["理念標語（顯示在照片下方，精簡有力）","理念標語","標語"]);
  const service = findByIncludes_(idx, ["服務項目（核心業務，多項可條列換行）","服務項目","核心業務"]);
  const titles = findByIncludes_(idx, ["重要頭銜/獎銜（權威背書項目，多項可條列換行）","重要頭銜","獎銜","頭銜"]);
  const avatar = findByIncludes_(idx, ["個人專業形象照（名片主圖）","個人專業形象照","名片主圖","形象照","頭像","照片"]);
  const logo = findByIncludes_(idx, ["品牌 Logo（右上角小圖標）","品牌 Logo","Logo"]);

  current.wechat = findByIncludes_(idx, ["微信 ID","微信ID"]);
  current.lineOA = findByIncludes_(idx, ["LINE 官方帳號連結（綠色主按鈕）","LINE 官方帳號連結","LINE官方帳號"]);
  const lineMulti = findByIncludes_(idx, ["私訊 LINE 連結（第一行填連結，換行填line名稱）","私訊 LINE 連結","私訊LINE"]);
  const lineLines = toLines_(lineMulti);
  current.line = lineLines[0] || "";
  current.lineText = lineLines[1] || "";
  current.email = findByIncludes_(idx, ["一鍵聯繫 Email","Email","電子郵件"]);
  current.phone = findByIncludes_(idx, ["一鍵聯繫電話","電話"]);
  current.map = findByIncludes_(idx, ["影音平台 3（或地址）","地址","地圖","地圖連結","Google 地圖","Google Map"]);

  safeText_(nameEl, name || "（未填姓名）");
  safeText_(unitEl, unit || "");

  if (slogan && sloganEl) { safeText_(sloganEl, slogan); setVisible_(sloganEl, true); }
  else setVisible_(sloganEl, false);

  if (serviceEl) safeHTML_(serviceEl, `<h3>服務項目</h3>${toBulletsHTML_(service) || '<div style="opacity:.6;">（未填）</div>'}`);
  if (titles && titlesEl) { safeHTML_(titlesEl, `<h3>重要頭銜 / 獎銜</h3>${toBulletsHTML_(titles)}`); setVisible_(titlesEl, true); }
  else setVisible_(titlesEl, false);

  if (avatarEl && avatar) setImgWithFallback_(avatarEl, avatar);
  if (logoEl && logo) { setVisible_(logoEl, true); setImgWithFallback_(logoEl, logo); } else setVisible_(logoEl, false);

  const btnRow = byId_("btn-row");
  const btnLineOA = byId_("btn-lineoa");
  const btnLine = byId_("btn-line");
  const btnWe = byId_("btn-wechat");
  const btnPhone = byId_("btn-phone");
  const btnEmail = byId_("btn-email");
  const btnMap = byId_("btn-map");

  setVisible_(btnLineOA, !!current.lineOA);
  setVisible_(btnLine, !!current.line);
  setVisible_(btnWe, !!current.wechat);
  setVisible_(btnPhone, !!current.phone);
  setVisible_(btnEmail, !!current.email);
  setVisible_(btnMap, !!current.map);

  const anyMini = (!!current.line) || (!!current.wechat) || (!!current.phone) || (!!current.email) || (!!current.map);
  setVisible_(btnRow, anyMini);

  const v1 = findByIncludes_(idx, ["影音平台 1（如：YouTube或其他連結）","影音平台 1","影音平台1"]);
  const v2 = findByIncludes_(idx, ["影音平台 2（如：TikTok / 抖音或其他連結）","影音平台 2","影音平台2"]);
  const v3 = findByIncludes_(idx, ["影音平台 3（或地址）","影音平台 3","影音平台3"]);
  const s1 = findByIncludes_(idx, ["社群平台 1（如：Facebook 粉絲專頁或其他連結）","社群平台 1","社群平台1"]);
  const s2 = findByIncludes_(idx, ["社群平台 2（如：Instagram或其他連結）","社群平台 2","社群平台2"]);
  const s3 = findByIncludes_(idx, ["社群平台 3（如：Thread / 部落格或其他連結）","社群平台 3","社群平台3"]);

  const links = [];
  if (v1) links.push({ label: "影音平台 1", url: v1, icon: "fa-brands fa-youtube", tag: "YouTube/影音" });
  if (v2) links.push({ label: "影音平台 2", url: v2, icon: "fa-brands fa-tiktok", tag: "TikTok/抖音" });
  if (v3) links.push({ label: "影音平台 3", url: v3, icon: "fa-solid fa-link", tag: "其他/地址" });
  if (s1) links.push({ label: "社群平台 1", url: s1, icon: "fa-brands fa-facebook", tag: "Facebook" });
  if (s2) links.push({ label: "社群平台 2", url: s2, icon: "fa-brands fa-instagram", tag: "Instagram" });
  if (s3) links.push({ label: "社群平台 3", url: s3, icon: "fa-brands fa-threads", tag: "Threads/部落格" });

  renderLinks_(links);

  const q1 = findByIncludes_(idx, ["客戶常見提問 1 (Q1)","Q1","提問 1"]);
  const a1 = findByIncludes_(idx, ["專業解答 1 (A1)","A1","解答 1"]);
  const q2 = findByIncludes_(idx, ["客戶常見提問 2 (Q2)","Q2","提問 2"]);
  const a2 = findByIncludes_(idx, ["專業解答2（A2）","專業解答 2","A2","解答 2"]);
  renderFAQ_(q1,a1,q2,a2);

  const imgs = collectProductImages_(idx);
  renderGallery_(imgs);

  if (current.lineText) toast_(`LINE：${current.lineText}`);
}

async function loadCardDataFromListAPI_() {
  current.id = getIdFromUrl_();
  safeText_(byId_("u-name"), "載入中...");
  safeText_(byId_("u-unit"), "同步中...");
  safeText_(byId_("u-service"), "正在同步雲端服務項目...");

  try {
    const res = await fetch(`${CONFIG.GAS}?action=list`, { cache: "no-store" });
    const json = await res.json();

    if (!json || json.ok !== true) {
      console.warn("GAS return:", json);
      safeText_(byId_("u-name"), "雲端同步失敗");
      safeText_(byId_("u-unit"), "請確認 GAS 回傳");
      return;
    }

    const headers = Array.isArray(json.headers) ? json.headers : [];
    const rows = Array.isArray(json.rows) ? json.rows : [];

    let rowObj = null;
    for (const r of rows) {
      const obj = rowToObject_(r, headers);
      if (!obj) continue;
      const rid = String(obj.id || obj.ID || obj["id"] || obj["ID"] || "").trim();
      if (rid === current.id) { rowObj = obj; break; }
    }

    if (!rowObj) {
      safeText_(byId_("u-name"), "找不到此序號");
      safeText_(byId_("u-unit"), current.id);
      safeText_(byId_("u-service"), "請確認該列是否有填入 id（例如 TW0001）。");
      return;
    }

    const idx = buildRowIndex_(rowObj);
    setThemeFromPrefs_(idx);
    renderCard_(idx);

  } catch (e) {
    console.error(e);
    safeText_(byId_("u-name"), "雲端同步異常");
    safeText_(byId_("u-unit"), "請稍後再試");
  }
}

window.addEventListener("load", () => {
  applyV382_();
  syncPanelActive_();
  loadCardDataFromListAPI_();
});
