/* =========================================================
 * 幸福智慧名片｜app.js（V384.2｜Complete Overwrite）
 * ✅ GAS v1.1 action=list：從整表撈出指定 id
 * ✅ 欄位名容錯：去引號/換行/零寬字元
 * ✅ 功能：產品照左右滑動 + 點全圖、影音/社群/聯繫矩陣、Q&A
 * ========================================================= */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };

// ------------------------ helpers ------------------------
function byId_(id){ return document.getElementById(id); }

function safeText_(el, text){
  if (!el) return;
  el.innerText = (text === null || text === undefined) ? "" : String(text);
}

function getIdFromUrl_() {
  try {
    const u = new URL(location.href);
    return (u.searchParams.get("id") || CONFIG.ANGEL || "TW0001").trim();
  } catch (e) {
    return (CONFIG.ANGEL || "TW0001").trim();
  }
}

function stripZeroWidth_(s){
  return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function normKey_(s){
  let t = stripZeroWidth_(s);
  t = t.replace(/"/g, "");
  t = t.replace(/\r?\n/g, " ");
  t = t.replace(/\s+/g, " ");
  t = t.trim();
  return t;
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

// ------------------------ Drive image ------------------------
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
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
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

// ------------------------ UI controls ------------------------
window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  if (el) el.classList.add("active");
  applyV382();
};

window.setV382Style = function(style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }
  applyV382();
};

function applyV382() {
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

window.goFillForm = () => window.open(CONFIG.FORM, "_blank');

// ------------------------ link helpers ------------------------
function normalizeUrl_(s){
  const v = String(s || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  // allow line.me, www, etc.
  if (v.startsWith("www.")) return "https://" + v;
  if (v.startsWith("line.me/") || v.startsWith("lin.ee/")) return "https://" + v;
  if (v.startsWith("mailto:") || v.startsWith("tel:")) return v;
  // treat as plain
  return v;
}

function isProbablyAddress_(s){
  const v = String(s || "").trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return false;
  // 台灣地址常見特徵：市/區/路/街/號
  return /[市縣區鄉鎮村里路街大道巷弄號樓]/.test(v);
}

function mapUrlFromAddress_(addr){
  const q = encodeURIComponent(String(addr || "").trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function iconBtn_(href, iconClass, label){
  const a = document.createElement("a");
  a.className = "icon-btn";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  a.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
  return a;
}

// ------------------------ Lightbox ------------------------
function setupLightbox_(){
  const lb = byId_("lightbox");
  const img = byId_("lb-img");
  const closeBtn = byId_("lb-close");
  const backdrop = byId_("lb-backdrop");
  const close = () => { if (lb) lb.style.display = "none"; if (img) img.src = ""; };

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") close(); });

  return {
    open: (src) => {
      if (!lb || !img) return;
      img.src = src;
      lb.style.display = "block";
    }
  };
}

// ------------------------ Slider ------------------------
function setupSlider_(trackEl, dotsEl){
  let index = 0;
  let total = 0;
  let startX = 0;
  let currentX = 0;
  let dragging = false;

  const setIndex = (i) => {
    if (total <= 0) return;
    index = Math.max(0, Math.min(total - 1, i));
    trackEl.style.transform = `translateX(${-index * 100}%)`;
    if (dotsEl) {
      dotsEl.querySelectorAll(".dot2").forEach((d, di) => d.classList.toggle("active", di === index));
    }
  };

  const onStart = (x) => {
    dragging = true;
    startX = x;
    currentX = x;
    trackEl.style.transition = "none";
  };

  const onMove = (x) => {
    if (!dragging) return;
    currentX = x;
    const dx = currentX - startX;
    const pct = (dx / trackEl.clientWidth) * 100;
    trackEl.style.transform = `translateX(calc(${-index * 100}% + ${pct}%))`;
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    trackEl.style.transition = "";
    const dx = currentX - startX;
    const threshold = 40;
    if (dx < -threshold) setIndex(index + 1);
    else if (dx > threshold) setIndex(index - 1);
    else setIndex(index);
  };

  trackEl.addEventListener("touchstart", (e)=> onStart(e.touches[0].clientX), {passive:true});
  trackEl.addEventListener("touchmove", (e)=> onMove(e.touches[0].clientX), {passive:true});
  trackEl.addEventListener("touchend", onEnd);

  // mouse fallback
  trackEl.addEventListener("mousedown", (e)=> { e.preventDefault(); onStart(e.clientX); });
  window.addEventListener("mousemove", (e)=> onMove(e.clientX));
  window.addEventListener("mouseup", onEnd);

  return {
    mount: (n) => { total = n; setIndex(0); }
  };
}

// ------------------------ main loader ------------------------
async function loadCard_() {
  const id = getIdFromUrl_();

  const nameEl = byId_("u-name");
  const unitEl = byId_("u-unit");
  const imgEl = byId_("u-img");
  const sloganEl = byId_("u-slogan");
  const titlesEl = byId_("u-titles");
  const serviceEl = byId_("u-service");

  safeText_(nameEl, "載入中...");
  safeText_(unitEl, "同步中...");

  try {
    const res = await fetch(`${CONFIG.GAS}?action=list`, { cache: "no-store" });
    const json = await res.json();
    if (!json || json.ok !== true) throw new Error("GAS return not ok");

    const headers = Array.isArray(json.headers) ? json.headers : [];
    const rows = Array.isArray(json.rows) ? json.rows : [];

    let rowObj = null;
    for (const r of rows) {
      const obj = rowToObject_(r, headers);
      if (!obj) continue;
      const rid = String(obj.id || obj.ID || obj["id"] || obj["ID"] || "").trim();
      if (rid === id) { rowObj = obj; break; }
    }
    if (!rowObj) throw new Error("Row not found");

    const idx = buildRowIndex_(rowObj);

    const name = findByIncludes_(idx, ["姓名（名片大標題）", "姓名"]);
    const unit = findByIncludes_(idx, ["單位名稱", "單位"]);
    const slogan = findByIncludes_(idx, ["理念標語"]);
    const service = findByIncludes_(idx, ["服務項目"]);
    const titles = findByIncludes_(idx, ["重要頭銜", "獎銜"]);
    const avatar = findByIncludes_(idx, ["個人專業形象照", "名片主圖", "形象照", "頭像"]);

    safeText_(nameEl, name || "（未填姓名）");
    safeText_(unitEl, unit || "");
    safeText_(serviceEl, service || "");

    // slogan
    if (sloganEl) {
      const s = String(slogan || "").trim();
      if (s) { sloganEl.style.display = "block"; sloganEl.innerText = s; }
      else { sloganEl.style.display = "none"; }
    }

    // titles → badges
    if (titlesEl) {
      const t = String(titles || "").trim();
      if (t) {
        titlesEl.style.display = "flex";
        titlesEl.innerHTML = "";
        const parts = t.split(/\n|,|，|；|;/).map(x=>x.trim()).filter(Boolean);
        parts.forEach(p=>{
          const b = document.createElement("div");
          b.className = "badge";
          b.textContent = p;
          titlesEl.appendChild(b);
        });
      } else {
        titlesEl.style.display = "none";
      }
    }

    // avatar
    if (imgEl && avatar) setImgWithFallback_(imgEl, avatar);

    // product photos (up to 3)
    const productRaw = findByIncludes_(idx, ["產品或品牌或活動照片最多3張", "產品", "活動照片"]);
    const productBlock = byId_("product-block");
    const track = byId_("product-track");
    const dots = byId_("product-dots");
    const lb = setupLightbox_();
    const slider = (track && dots) ? setupSlider_(track, dots) : null;

    if (productBlock && track && dots) {
      const urls = String(productRaw || "")
        .split(/\n|,|，/)
        .map(s=>s.trim())
        .filter(Boolean)
        .slice(0,3);

      if (urls.length) {
        productBlock.style.display = "block";
        track.innerHTML = "";
        dots.innerHTML = "";

        urls.forEach((u, i)=>{
          const slide = document.createElement("div");
          slide.className = "slide";
          const img = document.createElement("img");
          // 用同一套 drive fallback 產出「最可能成功」的 src（先給 uc）
          const cand = driveImageCandidates_(u);
          img.src = cand[0];
          img.onerror = () => {
            // fallback chain
            let ci = 1;
            img.onerror = () => {
              if (ci < cand.length) img.src = cand[ci++];
            };
            if (ci < cand.length) img.src = cand[ci++];
          };

          img.addEventListener("click", ()=> {
            // 全圖：用 googleusercontent/thumbnail 優先，較適合大圖
            const big = cand[2] || cand[1] || cand[0] || u;
            lb.open(big);
          });

          slide.appendChild(img);
          track.appendChild(slide);

          const d = document.createElement("div");
          d.className = "dot2" + (i === 0 ? " active" : "");
          d.addEventListener("click", ()=> {
            track.style.transition = "";
            track.style.transform = `translateX(${-i * 100}%)`;
            dots.querySelectorAll(".dot2").forEach((x, xi)=>x.classList.toggle("active", xi===i));
          });
          dots.appendChild(d);
        });

        if (slider) slider.mount(urls.length);
      } else {
        productBlock.style.display = "none";
      }
    }

    // contact + links
    const linePrivateRaw = findByIncludes_(idx, ["私訊 LINE 連結"]);
    const lineOARaw = findByIncludes_(idx, ["LINE 官方帳號連結"]);
    const email = findByIncludes_(idx, ["一鍵聯繫 Email"]);
    const phone = findByIncludes_(idx, ["一鍵聯繫電話"]);
    const wechat = findByIncludes_(idx, ["微信 ID"]);
    const v1 = findByIncludes_(idx, ["影音平台 1"]);
    const v2 = findByIncludes_(idx, ["影音平台 2"]);
    const v3 = findByIncludes_(idx, ["影音平台 3"]);
    const s1 = findByIncludes_(idx, ["社群平台 1"]);
    const s2 = findByIncludes_(idx, ["社群平台 2"]);
    const s3 = findByIncludes_(idx, ["社群平台 3"]);

    // LINE OA big button
    const btnOA = byId_("btn-lineoa");
    const btnOAText = byId_("btn-lineoa-text");
    if (btnOA) {
      const oa = normalizeUrl_(lineOARaw);
      if (oa && /^https?:\/\//i.test(oa)) {
        btnOA.style.display = "flex";
        btnOA.href = oa;
        if (btnOAText) btnOAText.innerText = "LINE 官方帳號";
      } else {
        btnOA.style.display = "none";
      }
    }

    // Private LINE: first line link, second line name
    let privateLineLink = "";
    let privateLineName = "";
    if (linePrivateRaw) {
      const parts = String(linePrivateRaw).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      privateLineLink = normalizeUrl_(parts[0] || "");
      privateLineName = parts[1] || "私訊 LINE";
    }

    const contactMatrix = byId_("contact-matrix");
    if (contactMatrix) {
      contactMatrix.innerHTML = "";
      let any = false;

      if (privateLineLink && /^https?:\/\//i.test(privateLineLink)) {
        contactMatrix.appendChild(iconBtn_(privateLineLink, "fa-brands fa-line", privateLineName || "私訊 LINE"));
        any = true;
      }
      if (email) {
        const e = String(email).trim();
        if (e) { contactMatrix.appendChild(iconBtn_(`mailto:${e}`, "fa-solid fa-envelope", "Email")); any = true; }
      }
      if (phone) {
        const p = String(phone).trim();
        if (p) { contactMatrix.appendChild(iconBtn_(`tel:${p}`, "fa-solid fa-phone", "電話")); any = true; }
      }
      if (wechat) {
        const w = String(wechat).trim();
        if (w) {
          // wechat 沒有通用跳轉：用複製提示（開新頁顯示）
          const href = `data:text/plain;charset=utf-8,WeChat%20ID%3A%20${encodeURIComponent(w)}`;
          contactMatrix.appendChild(iconBtn_(href, "fa-brands fa-weixin", "微信"));
          any = true;
        }
      }

      contactMatrix.style.display = any ? "grid" : "none";
    }

    // links matrix (maps/video/social)
    const linksMatrix = byId_("links-matrix");
    if (linksMatrix) {
      linksMatrix.innerHTML = "";
      let any = false;

      // v3 might be address or url
      if (v3) {
        const vv3 = String(v3).trim();
        if (vv3) {
          if (isProbablyAddress_(vv3)) {
            linksMatrix.appendChild(iconBtn_(mapUrlFromAddress_(vv3), "fa-solid fa-map-location-dot", "導航"));
          } else {
            linksMatrix.appendChild(iconBtn_(normalizeUrl_(vv3), "fa-solid fa-link", "連結"));
          }
          any = true;
        }
      }

      const addVideo = (url, label, icon) => {
        const u = normalizeUrl_(url);
        if (u && /^https?:\/\//i.test(u)) {
          linksMatrix.appendChild(iconBtn_(u, icon, label));
          return true;
        }
        return false;
      };

      any = addVideo(v1, "影音1", "fa-brands fa-youtube") || any;
      any = addVideo(v2, "影音2", "fa-brands fa-tiktok") || any;

      const addSocial = (url, label, icon) => {
        const u = normalizeUrl_(url);
        if (u && /^https?:\/\//i.test(u)) {
          linksMatrix.appendChild(iconBtn_(u, icon, label));
          return true;
        }
        return false;
      };

      any = addSocial(s1, "社群1", "fa-brands fa-facebook") || any;
      any = addSocial(s2, "社群2", "fa-brands fa-instagram") || any;
      any = addSocial(s3, "社群3", "fa-brands fa-threads") || any;

      linksMatrix.style.display = any ? "grid" : "none";
    }

    // Q&A
    const q1 = findByIncludes_(idx, ["客戶常見提問 1"]);
    const a1 = findByIncludes_(idx, ["專業解答 1"]);
    const q2 = findByIncludes_(idx, ["客戶常見提問 2"]);
    const a2 = findByIncludes_(idx, ["專業解答2", "專業解答 2"]);

    const qaBlock = byId_("qa-block");
    const qa1 = byId_("qa1");
    const qa2 = byId_("qa2");
    const qa1q = byId_("qa1-q");
    const qa1a = byId_("qa1-a");
    const qa2q = byId_("qa2-q");
    const qa2a = byId_("qa2-a");

    let anyQA = false;

    if (qa1 && qa1q && qa1a) {
      const qq = String(q1||"").trim();
      const aa = String(a1||"").trim();
      if (qq || aa) {
        qa1.style.display = "block";
        qa1q.innerText = qq || "常見提問 1";
        qa1a.innerText = aa || "";
        anyQA = true;
      } else qa1.style.display = "none";
    }

    if (qa2 && qa2q && qa2a) {
      const qq = String(q2||"").trim();
      const aa = String(a2||"").trim();
      if (qq || aa) {
        qa2.style.display = "block";
        qa2q.innerText = qq || "常見提問 2";
        qa2a.innerText = aa || "";
        anyQA = true;
      } else qa2.style.display = "none";
    }

    if (qaBlock) qaBlock.style.display = anyQA ? "block" : "none";

  } catch (e) {
    console.error(e);
    safeText_(byId_("u-name"), "雲端同步異常");
    safeText_(byId_("u-unit"), "請稍後再試");
  }
}

// boot
window.addEventListener("load", () => {
  applyV382();
  loadCard_();
});
