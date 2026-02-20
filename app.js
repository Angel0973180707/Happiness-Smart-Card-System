const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

window.setV382 = function(mode, theme, el) {
  state.mode = mode;
  state.theme = theme;
  document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  applyV382();
};

window.setV382Style = function(style, el) {
  state.style = style;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382();
};

window.setV382Paper = function(paper, el) {
  state.paper = paper;
  if (el && el.parentElement) {
    el.parentElement.querySelectorAll('.btn-neo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  applyV382();
};

function applyV382() {
  const isFree = state.mode === 'free';
  const controlPanel = document.getElementById('free-controls');
  if (controlPanel) controlPanel.style.display = isFree ? 'block' : 'none';

  const classList = [
    `mode-${state.mode}`,
    state.theme,
    isFree ? `style-${state.style}` : '',
    isFree ? state.paper : ''
  ];
  document.body.className = classList.filter(Boolean).join(' ');
}

/* ===========================
   Image URL normalize + slider
   =========================== */

function normalizeImageUrl_(url) {
  if (!url) return "";
  let u = String(url).trim();
  if (!u) return "";
  // enforce https if possible
  if (u.startsWith("http://")) u = "https://" + u.slice(7);

  // Google Drive share -> direct view
  // patterns:
  // 1) https://drive.google.com/file/d/<ID>/view?...
  // 2) https://drive.google.com/open?id=<ID>
  // 3) https://drive.google.com/uc?id=<ID>&export=download
  try {
    const m1 = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2 = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    const m3 = u.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);
    const id = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || "";
    if (id) {
      // best-effort direct view
      return `https://drive.google.com/uc?export=view&id=${id}`;
    }
  } catch(e) {}

  // Basic allow-list: must be https or data
  if (!(u.startsWith("https://") || u.startsWith("data:image/"))) return "";

  return u;
}

function splitPhotoList_(raw) {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s) return [];
  // allow separators: newline, comma, pipe
  const parts = s.split(/\s*(?:\n|,|\|)\s*/).map(x => x.trim()).filter(Boolean);
  // normalize + dedupe
  const out = [];
  const seen = new Set();
  for (const p of parts) {
    const nu = normalizeImageUrl_(p);
    if (!nu) continue;
    if (seen.has(nu)) continue;
    seen.add(nu);
    out.push(nu);
  }
  return out;
}

function setPhotoSlider_(urls) {
  const rail = document.getElementById("photo-rail");
  const dots = document.getElementById("photo-dots");
  const firstImg = document.getElementById("u-img");
  if (!rail || !dots || !firstImg) return;

  // Clear extra slides, keep the first item (contains #u-img) as template
  const templateItem = rail.querySelector(".photo-item");
  rail.innerHTML = "";
  dots.innerHTML = "";

  const safeUrls = (urls && urls.length) ? urls : [""];

  safeUrls.forEach((u, idx) => {
    const item = document.createElement("div");
    item.className = "photo-item";
    const img = document.createElement("img");
    img.className = "avatar";
    img.alt = "形象照";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";

    if (idx === 0) img.id = "u-img";

    if (u) img.src = u;

    // fallback: keep circle clean (no broken icon)
    img.onerror = () => {
      img.removeAttribute("src");
      img.style.background = "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))";
    };

    item.appendChild(img);
    rail.appendChild(item);

    const d = document.createElement("div");
    d.className = "pd" + (idx === 0 ? " on" : "");
    dots.appendChild(d);
  });

  // Show dots only if >1
  dots.style.display = safeUrls.length > 1 ? "flex" : "none";

  // Update dots on scroll
  const updateDots = () => {
    const w = rail.clientWidth || 1;
    const idx = Math.round(rail.scrollLeft / w);
    [...dots.children].forEach((el, i) => el.classList.toggle("on", i === idx));
  };

  rail.onscroll = () => { window.requestAnimationFrame(updateDots); };
  // Reset to first
  rail.scrollLeft = 0;
  updateDots();
}

/* ===========================
   Dynamic balance (no data)
   =========================== */
function applyDataBalance_(data) {
  const b = document.body;

  const unit = (data && (data.單位 || data.unit)) ? String(data.單位 || data.unit).trim() : "";
  const svc  = (data && (data.服務項目 || data.service)) ? String(data.服務項目 || data.service).trim() : "";

  b.classList.toggle("has-no-unit", !unit);
  b.classList.toggle("has-no-service", !svc);
}

/* ===========================
   Data Loading
   =========================== */

async function loadV382Data() {
  try {
    const res = await fetch(`${CONFIG.GAS}?id=${CONFIG.ANGEL}`, { cache: "no-store" });
    const data = await res.json();

    if (data) {
      const name = String(data.姓名 || data.name || "小天使笑長").trim();
      const unit = String(data.單位 || data.unit || "").trim();
      const svc  = String(data.服務項目 || data.service || "").trim();

      document.getElementById('u-name').innerText = name || "小天使笑長";
      document.getElementById('u-unit').innerText = unit || "";
      document.getElementById('u-service').innerText = svc || "";

      // Dynamic balance
      applyDataBalance_(data);

      // Photos: support multi urls
      const photos = splitPhotoList_(data.形象照 || data.photo || data.photos || "");
      setPhotoSlider_(photos);

      // If only one photo and already exists, ensure it's normalized
      const img0 = document.getElementById("u-img");
      if (img0 && img0.getAttribute("src")) {
        const nu = normalizeImageUrl_(img0.getAttribute("src"));
        if (nu) img0.src = nu;
      }
    }
  } catch(e) {
    console.error("雲端同步異常", e);
    // keep layout stable even on failure
    applyDataBalance_({});
    setPhotoSlider_([]);
  }
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');

window.onload = () => {
  loadV382Data();
  applyV382();

  // basic PWA registration (safe; no logic change)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
};
