/* app.js (V386 complete overwrite)
 * - Plan selector injected (free / premium)
 * - Free: color dots + style + paper
 * - Premium: p1~p7 dots only (hide free controls)
 * - Load card data from GAS (id/token) with robust fallbacks
 * - Inject Contact box (LINE / Website / Address / Email / Phone)
 * - Photo wall grid + lightbox (object-fit: contain)
 * - PWA SW register
 */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  DEFAULT_ID: "TW0001",
  DELIVERY_PAGE: "share.html",
  ADMIN_PASS: "angel385",
  OG_IMAGE: "og-card.png",
  CACHE_BUST: "386"
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let currentRow = null;
let galleryUrls = [];
let galleryIndex = 0;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc_(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function qs_() {
  const u = new URL(location.href);
  return Object.fromEntries(u.searchParams.entries());
}

function normalizeUrl_(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return "https:" + s;
  // allow line.me/xxx
  if (s.includes(".") || s.includes("/")) return "https://" + s;
  return s;
}

function openUrl_(url) {
  const u = normalizeUrl_(url);
  if (!u) return;
  window.open(u, "_blank", "noopener,noreferrer");
}

function copyText_(text) {
  const s = String(text || "");
  if (!s) return false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(s).catch(() => {});
    return true;
  }
  // fallback
  const ta = document.createElement("textarea");
  ta.value = s;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
  return true;
}

/* ================================
 * Public UI APIs (called by index.html onclick)
 * ================================ */

window.setV382 = function (mode, theme, el) {
  state.mode = mode;
  state.theme = theme;

  // defaults when switching
  if (mode === "free") {
    state.style = state.style || "arch";
    state.paper = state.paper || "paper-1";
    if (!/^color-/.test(state.theme)) state.theme = "color-1";
  } else {
    // premium hides free style/paper visually; keep in state but irrelevant
    if (!/^p\d$/.test(state.theme)) state.theme = "p1";
  }

  applyTheme_();
  syncActiveDots_(mode, theme, el);
  syncControlsVisibility_();
};

window.setV382Style = function (style, el) {
  state.style = style;
  applyTheme_();
  setActiveInRow_(el, ".controls-row .btn-neo:nth-child(-n+3)");
};

window.setV382Paper = function (paper, el) {
  state.paper = paper;
  applyTheme_();
  // paper buttons are after the 3 style buttons + spacer
  setActiveInRow_(el, ".controls-row .btn-neo:nth-last-child(-n+3)");
};

window.goFillForm = function () {
  // prefer row's form_url if present
  const rowForm =
    (currentRow && (currentRow.form_url || currentRow.form || currentRow.formLink)) || "";
  const form = normalizeUrl_(rowForm) || CONFIG.FORM;
  openUrl_(form);
};

window.openOrderHelp = function () {
  const m = $("#orderHelpModal");
  if (!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden", "false");
};

window.closeOrderHelp = function () {
  const m = $("#orderHelpModal");
  if (!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
};

/* ================================
 * Theme / visibility
 * ================================ */

function applyTheme_() {
  const body = document.body;
  // clear old
  body.className = "";

  if (state.mode === "free") {
    body.classList.add("mode-free");
    body.classList.add(state.theme);
    body.classList.add(`style-${state.style}`);
    body.classList.add(state.paper);
  } else {
    body.classList.add("mode-premium");
    body.classList.add(state.theme);
    // premium still benefits from style class for internal spacing if needed
    body.classList.add(`style-${state.style || "arch"}`);
    body.classList.add(state.paper || "paper-1");
  }
}

function syncControlsVisibility_() {
  const freeDots = $("#rowFreeDots");
  const premiumDots = $("#rowPremiumDots");
  const freeControls = $("#free-controls");

  if (!freeDots || !premiumDots || !freeControls) return;

  if (state.mode === "free") {
    freeDots.style.display = "flex";
    premiumDots.style.display = "none";
    freeControls.style.display = "block";
  } else {
    freeDots.style.display = "none";
    premiumDots.style.display = "flex";
    freeControls.style.display = "none";
  }

  // also sync plan selector buttons if exist
  const btnFree = $("#planBtnFree");
  const btnPremium = $("#planBtnPremium");
  if (btnFree && btnPremium) {
    btnFree.classList.toggle("active", state.mode === "free");
    btnPremium.classList.toggle("active", state.mode === "premium");
  }
}

function syncActiveDots_(mode, theme, clickedEl) {
  // clear active on all dots for that group, set active
  if (mode === "free") {
    $$("#rowFreeDots .dot").forEach((b) => b.classList.remove("active"));
    const pick =
      clickedEl ||
      $$("#rowFreeDots .dot").find((b) => (b.getAttribute("onclick") || "").includes(`'${theme}'`));
    if (pick) pick.classList.add("active");
  } else {
    $$("#rowPremiumDots .p-dot").forEach((b) => b.classList.remove("active"));
    const pick =
      clickedEl ||
      $$("#rowPremiumDots .p-dot").find((b) => (b.getAttribute("onclick") || "").includes(`'${theme}'`));
    if (pick) pick.classList.add("active");
  }
}

function setActiveInRow_(clickedEl, selector) {
  if (!clickedEl) return;
  const group = $$(selector);
  group.forEach((b) => b.classList.remove("active"));
  clickedEl.classList.add("active");
}

/* ================================
 * Plan selector injected UI
 * ================================ */

function ensurePlanSelectorUi_() {
  const panel = $("#admin-panel");
  if (!panel) return;

  if ($("#plan-selector")) return;

  const wrap = document.createElement("div");
  wrap.id = "plan-selector";
  wrap.style.padding = "10px 12px 4px";
  wrap.innerHTML = `
    <button id="planBtnFree" class="btn-neo ${state.mode === "free" ? "active" : ""}" type="button">
      自由搭配款
    </button>
    <button id="planBtnPremium" class="btn-neo ${state.mode === "premium" ? "active" : ""}" type="button">
      精品設計款
    </button>
  `;

  // Insert at top inside admin panel
  panel.insertBefore(wrap, panel.firstChild);

  $("#planBtnFree").addEventListener("click", () => {
    state.mode = "free";
    if (!/^color-/.test(state.theme)) state.theme = "color-1";
    applyTheme_();
    syncControlsVisibility_();
  });

  $("#planBtnPremium").addEventListener("click", () => {
    state.mode = "premium";
    if (!/^p\d$/.test(state.theme)) state.theme = "p1";
    applyTheme_();
    syncControlsVisibility_();
  });
}

/* ================================
 * Data loading
 * ================================ */

async function fetchCard_(id, token) {
  const base = CONFIG.GAS;
  const tryUrls = [];

  // primary (action=card)
  {
    const u = new URL(base);
    u.searchParams.set("action", "card");
    u.searchParams.set("id", id);
    if (token) u.searchParams.set("token", token);
    tryUrls.push(u.toString());
  }

  // fallback (no action)
  {
    const u = new URL(base);
    u.searchParams.set("id", id);
    if (token) u.searchParams.set("token", token);
    tryUrls.push(u.toString());
  }

  // fallback (action=list then filter) – only if your GAS supports list
  {
    const u = new URL(base);
    u.searchParams.set("action", "list");
    tryUrls.push(u.toString());
  }

  let lastErr = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // normalize
      if (json && json.ok && json.row) return json.row;
      if (json && json.row) return json.row;
      if (json && json.data) return json.data;

      // list fallback
      if (json && json.ok && Array.isArray(json.rows)) {
        const rows = json.rows;
        const found = rows.find((r) => String(r.id || r.ID || "").trim() === id);
        if (found) return found;
      }
      if (Array.isArray(json)) {
        const found = json.find((r) => String(r.id || r.ID || "").trim() === id);
        if (found) return found;
      }

      // if this response is not usable, continue
      lastErr = new Error("JSON not matched expected shape");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Fetch failed");
}

function pickRowField_(row, keys) {
  for (const k of keys) {
    if (row && row[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function buildGalleryUrls_(row) {
  const urls = [];

  // direct array
  const direct = row && (row.photos || row.gallery || row.images);
  if (Array.isArray(direct)) {
    direct.forEach((x) => {
      const u = normalizeUrl_(x);
      if (u) urls.push(u);
    });
  } else if (typeof direct === "string") {
    // comma / newline separated
    direct
      .split(/[\n,]+/g)
      .map((s) => normalizeUrl_(s))
      .filter(Boolean)
      .forEach((u) => urls.push(u));
  }

  // scan fields photo1..photo20, img1.., image1.., gallery1..
  if (row && typeof row === "object") {
    const entries = Object.entries(row);
    const photoLike = entries
      .filter(([k, v]) => {
        const key = String(k).toLowerCase();
        if (!v) return false;
        return (
          key.startsWith("photo") ||
          key.startsWith("img") ||
          key.startsWith("image") ||
          key.startsWith("gallery") ||
          key.includes("photo_url")
        );
      })
      .map(([k, v]) => normalizeUrl_(v))
      .filter(Boolean);

    photoLike.forEach((u) => urls.push(u));
  }

  // de-dupe while preserving order
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }

  return out;
}

/* ================================
 * Render
 * ================================ */

function renderCard_(row) {
  currentRow = row || {};

  const name = pickRowField_(row, ["name", "姓名", "title", "Name"]);
  const unit = pickRowField_(row, ["unit", "單位", "company", "Company", "brand"]);
  const avatar = normalizeUrl_(
    pickRowField_(row, ["avatar", "photo", "headshot", "image", "img", "頭像", "照片"])
  );

  const service =
    pickRowField_(row, ["service", "服務項目", "services", "內容", "bio", "簡介"]) || "";

  const elName = $("#u-name");
  const elUnit = $("#u-unit");
  const elImg = $("#u-img");
  const elService = $("#u-service");

  if (elName) elName.textContent = name || "（未填姓名）";
  if (elUnit) elUnit.textContent = unit || "";
  if (elService) elService.textContent = service || "";

  if (elImg) {
    if (avatar) elImg.src = avatar;
    else elImg.removeAttribute("src");
  }

  // Photos
  galleryUrls = buildGalleryUrls_(row);
  ensurePhotoWall_(galleryUrls);

  // Contact
  ensureContactBox_(row);

  // Optional: update CTA box to open LINE if you want (keep fill-form by default)
  // leave as is: goFillForm()
}

function ensureContactBox_(row) {
  const scroll = $(".info-scroll");
  if (!scroll) return;

  // remove old
  const old = $("#contactBox");
  if (old) old.remove();

  // pick contacts
  const lineOA = pickRowField_(row, ["line_oa", "LINE官方帳號", "lineOfficial", "lineoa", "line_id"]);
  const lineUrl = normalizeUrl_(pickRowField_(row, ["line_url", "line", "LINE", "lineLink"]));
  const website = normalizeUrl_(pickRowField_(row, ["website", "site", "官網", "url"]));
  const phone = pickRowField_(row, ["phone", "電話", "tel", "mobile"]);
  const email = pickRowField_(row, ["email", "信箱", "mail"]);
  const address = pickRowField_(row, ["address", "地址", "location"]);

  // if none, skip
  if (!lineOA && !lineUrl && !website && !phone && !email && !address) return;

  const box = document.createElement("div");
  box.id = "contactBox";
  box.className = "content-box";
  box.style.marginTop = "12px";

  // main actions: first time = LINE OA, second = website
  const mainBtns = [];
  if (lineUrl || lineOA) {
    mainBtns.push(`
      <button class="btn-cta mini" type="button" onclick="window.__openLine()">
        LINE 官方帳號
      </button>
    `);
  }
  if (website) {
    mainBtns.push(`
      <button class="btn-cta mini" type="button" onclick="window.__openWebsite()">
        官方網站
      </button>
    `);
  }

  // sub links
  const subLinks = [];
  if (phone) subLinks.push(`<a href="tel:${esc_(phone)}" style="display:block;text-decoration:none;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,0.04);color:inherit;">📞 ${esc_(phone)}</a>`);
  if (email) subLinks.push(`<a href="mailto:${esc_(email)}" style="display:block;text-decoration:none;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,0.04);color:inherit;">✉️ ${esc_(email)}</a>`);
  if (address) subLinks.push(`<div style="padding:10px 12px;border-radius:14px;background:rgba(0,0,0,0.04);">📍 ${esc_(address)}</div>`);

  // copy share link
  const shareUrl = location.href;
  const copyBtn = `
    <button class="btn-help" type="button" onclick="window.__copyLink()">
      🔗 一鍵複製名片網址
    </button>
  `;

  box.innerHTML = `
    <div style="font-weight:900;margin-bottom:10px;">聯繫方式</div>

    <div id="contactMain" style="display:grid;gap:10px;margin-bottom:10px;">
      ${mainBtns.join("")}
    </div>

    <div style="display:flex;justify-content:center;margin-bottom:10px;">
      ${copyBtn}
    </div>

    <div id="contactSub" style="display:grid;gap:8px;">
      ${subLinks.join("")}
    </div>
  `;

  // attach helpers
  window.__openLine = () => {
    // priority: lineUrl; fallback: lineOA as text to copy
    if (lineUrl) return openUrl_(lineUrl);
    if (lineOA) {
      copyText_(lineOA);
      alert("已複製 LINE 官方帳號（可貼到 LINE 搜尋）");
    }
  };
  window.__openWebsite = () => openUrl_(website);
  window.__copyLink = () => {
    copyText_(shareUrl);
    alert("已複製名片網址");
  };

  // insert after "服務項目" box if possible, else append
  const boxes = $$(".info-scroll .content-box");
  const serviceBox = boxes.find((b) => (b.textContent || "").includes("服務項目"));
  if (serviceBox && serviceBox.nextSibling) {
    serviceBox.parentNode.insertBefore(box, serviceBox.nextSibling);
  } else {
    scroll.appendChild(box);
  }
}

/* ================================
 * Photo wall + lightbox
 * ================================ */

function ensurePhotoWall_(urls) {
  const container = $("#card-container");
  if (!container) return;

  // remove old
  const old = $("#photoWall");
  if (old) old.remove();

  if (!urls || !urls.length) return;

  const wall = document.createElement("section");
  wall.id = "photoWall";
  wall.style.margin = "10px auto 0";
  wall.style.width = "min(92vw,520px)";
  wall.style.borderRadius = "16px";
  wall.style.overflow = "hidden";

  const head = document.createElement("div");
  head.textContent = "照片牆";
  head.style.padding = "12px 12px 6px";
  head.style.fontWeight = "900";

  const grid = document.createElement("div");
  grid.id = "photoWallGrid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3,1fr)";
  grid.style.gap = "10px";
  grid.style.padding = "10px 12px 14px";

  urls.slice(0, 30).forEach((u, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.border = "none";
    btn.style.padding = "0";
    btn.style.borderRadius = "14px";
    btn.style.overflow = "hidden";
    btn.style.background = "rgba(255,255,255,0.1)";
    btn.style.cursor = "pointer";
    btn.style.aspectRatio = "1 / 1";

    const img = document.createElement("img");
    img.src = u;
    img.alt = `照片 ${idx + 1}`;
    img.loading = "lazy";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.background = "rgba(255,255,255,0.06)";

    btn.appendChild(img);
    btn.addEventListener("click", () => openLightbox_(idx));
    grid.appendChild(btn);
  });

  wall.appendChild(head);
  wall.appendChild(grid);

  // insert above card
  container.parentNode.insertBefore(wall, container);
  ensureLightbox_();
}

function ensureLightbox_() {
  if ($("#imgLightbox")) return;

  const lb = document.createElement("div");
  lb.id = "imgLightbox";
  lb.style.position = "fixed";
  lb.style.inset = "0";
  lb.style.background = "rgba(0,0,0,0.72)";
  lb.style.display = "none";
  lb.style.alignItems = "center";
  lb.style.justifyContent = "center";
  lb.style.zIndex = "99999";
  lb.style.padding = "16px";

  lb.innerHTML = `
    <div style="position:relative; width:min(92vw,900px); height:min(82vh,700px); display:flex; align-items:center; justify-content:center;">
      <img id="imgLightboxImg" alt="照片預覽"
        style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; border-radius:16px;" />
      <button id="lbClose" type="button"
        style="position:absolute; top:-10px; right:-10px; width:44px; height:44px; border:none; border-radius:14px; background:rgba(255,255,255,0.16); color:#fff; font-weight:900; cursor:pointer;">×</button>

      <button id="lbPrev" type="button"
        style="position:absolute; left:-10px; top:50%; transform:translateY(-50%); width:44px; height:44px; border:none; border-radius:14px; background:rgba(255,255,255,0.16); color:#fff; font-weight:900; cursor:pointer;">‹</button>

      <button id="lbNext" type="button"
        style="position:absolute; right:-10px; top:50%; transform:translateY(-50%); width:44px; height:44px; border:none; border-radius:14px; background:rgba(255,255,255,0.16); color:#fff; font-weight:900; cursor:pointer;">›</button>
    </div>
  `;

  document.body.appendChild(lb);

  $("#lbClose").addEventListener("click", closeLightbox_);
  $("#lbPrev").addEventListener("click", () => stepLightbox_(-1));
  $("#lbNext").addEventListener("click", () => stepLightbox_(+1));

  // click backdrop close
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox_();
  });

  // keyboard
  window.addEventListener("keydown", (e) => {
    if (!$("#imgLightbox") || $("#imgLightbox").style.display !== "flex") return;
    if (e.key === "Escape") closeLightbox_();
    if (e.key === "ArrowLeft") stepLightbox_(-1);
    if (e.key === "ArrowRight") stepLightbox_(+1);
  });
}

function openLightbox_(idx) {
  if (!galleryUrls.length) return;
  galleryIndex = Math.max(0, Math.min(idx, galleryUrls.length - 1));
  const lb = $("#imgLightbox");
  const img = $("#imgLightboxImg");
  if (!lb || !img) return;
  img.src = galleryUrls[galleryIndex];
  lb.style.display = "flex";
}

function closeLightbox_() {
  const lb = $("#imgLightbox");
  if (!lb) return;
  lb.style.display = "none";
}

function stepLightbox_(delta) {
  if (!galleryUrls.length) return;
  galleryIndex = (galleryIndex + delta + galleryUrls.length) % galleryUrls.length;
  const img = $("#imgLightboxImg");
  if (img) img.src = galleryUrls[galleryIndex];
}

/* ================================
 * Init
 * ================================ */

function initDefaultsFromDom_() {
  // read initial active states (free side)
  // default mode free, theme color-1 already in body in index.html
  applyTheme_();
  syncControlsVisibility_();
}

async function initLoad_() {
  const q = qs_();
  const id = (q.id || q.ID || CONFIG.DEFAULT_ID).trim();
  const token = (q.token || q.t || "").trim();

  // show loading placeholders
  const elName = $("#u-name");
  const elUnit = $("#u-unit");
  const elService = $("#u-service");
  if (elName) elName.textContent = "載入中...";
  if (elUnit) elUnit.textContent = "同步中...";
  if (elService) elService.textContent = "正在同步雲端服務項目...";

  try {
    const row = await fetchCard_(id, token);
    renderCard_(row);
  } catch (e) {
    console.warn("Load failed:", e);
    if (elName) elName.textContent = "暫時無法讀取資料";
    if (elUnit) elUnit.textContent = "請稍後再試";
    if (elService) elService.textContent = "（連線失敗）";
  }
}

function registerSW_() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`./sw.js?v=${CONFIG.CACHE_BUST}`)
      .catch((e) => console.warn("SW register failed:", e));
  });
}

/* ================================
 * Boot
 * ================================ */

(function boot() {
  ensurePlanSelectorUi_();
  initDefaultsFromDom_();
  initLoad_();
  registerSW_();
})();