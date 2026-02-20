const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
  ANGEL: "TW0001"
};

let state = { mode: 'free', theme: 'color-1', style: 'arch', paper: 'paper-1' };

/* ===========================
   UI: mode/theme/style/paper
   =========================== */
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
   訂購流程彈窗
   =========================== */
window.openOrderHelp = () => {
  const m = document.getElementById("orderHelpModal");
  if (!m) return;
  m.classList.add("on");
  m.setAttribute("aria-hidden", "false");
};

window.closeOrderHelp = () => {
  const m = document.getElementById("orderHelpModal");
  if (!m) return;
  m.classList.remove("on");
  m.setAttribute("aria-hidden", "true");
};

document.addEventListener("click", (e) => {
  const m = document.getElementById("orderHelpModal");
  if (!m) return;
  if (m.classList.contains("on") && e.target === m) window.closeOrderHelp();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.closeOrderHelp();
});

/* ===========================
   Image URL normalize + slider
   =========================== */
function normalizeImageUrl_(url) {
  if (!url) return "";
  let u = String(url).trim();
  if (!u) return "";
  if (u.startsWith("http://")) u = "https://" + u.slice(7);

  // Google Drive share -> direct view
  try {
    const m1 = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2 = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    const m3 = u.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);
    const id = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || "";
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
  } catch (e) {}

  if (!(u.startsWith("https://") || u.startsWith("data:image/"))) return "";
  return u;
}

function splitPhotoList_(raw) {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s) return [];
  const parts = s.split(/\s*(?:\n|,|\|)\s*/).map(x => x.trim()).filter(Boolean);

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
  if (!rail || !dots) return;

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

  dots.style.display = safeUrls.length > 1 ? "flex" : "none";

  const updateDots = () => {
    const w = rail.clientWidth || 1;
    const idx = Math.round(rail.scrollLeft / w);
    [...dots.children].forEach((el, i) => el.classList.toggle("on", i === idx));
  };

  rail.onscroll = () => window.requestAnimationFrame(updateDots);
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
   Data Loading (強化：多路徑/不怕回傳格式不同)
   =========================== */
function getCardId_() {
  const sp = new URLSearchParams(location.search);
  return (sp.get("id") || sp.get("card") || CONFIG.ANGEL || "").trim();
}

async function fetchWithTimeout_(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      cache: "no-store",
      redirect: "follow"
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function unwrapData_(obj) {
  // 支援：data / row / result 包裝
  if (!obj || typeof obj !== "object") return obj;
  if (obj.data && typeof obj.data === "object") return obj.data;
  if (obj.row && typeof obj.row === "object") return obj.row;
  if (obj.result && typeof obj.result === "object") return obj.result;
  return obj;
}

async function loadV382Data() {
  const id = getCardId_();
  if (!id) return;

  const tries = [
    `${CONFIG.GAS}?id=${encodeURIComponent(id)}`,
    `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}`,
    `${CONFIG.GAS}?action=get&id=${encodeURIComponent(id)}`
  ];

  try {
    let data = null;

    for (const url of tries) {
      try {
        const res = await fetchWithTimeout_(url, 10000);
        if (!res.ok) continue;

        const ct = (res.headers.get("content-type") || "").toLowerCase();

        if (ct.includes("application/json")) {
          data = await res.json();
        } else {
          const txt = await res.text();
          // 有些 GAS 會回傳文字 JSON
          try { data = JSON.parse(txt); }
          catch { data = null; }
        }

        if (data) break;
      } catch (e) {
        // try next
      }
    }

    if (!data) throw new Error("No data");

    // unwrap + 兼容 ok: true
    data = unwrapData_(data);

    const name = String(data.姓名 || data.name || "小天使笑長").trim();
    const unit = String(data.單位 || data.unit || "").trim();
    const svc  = String(data.服務項目 || data.service || "").trim();

    document.getElementById('u-name').innerText = name || "小天使笑長";
    document.getElementById('u-unit').innerText = unit || "";
    document.getElementById('u-service').innerText = svc || "";

    applyDataBalance_(data);

    const photos = splitPhotoList_(data.形象照 || data.photo || data.photos || "");
    setPhotoSlider_(photos);

  } catch (e) {
    console.error("雲端同步異常", e);
    // 不讓版面崩
    applyDataBalance_({});
    setPhotoSlider_([]);
    document.getElementById('u-name').innerText = "載入失敗";
    document.getElementById('u-unit').innerText = "";
    document.getElementById('u-service').innerText = "請稍後重整，或檢查 GAS 是否正常。";
  }
}

window.goFillForm = () => window.open(CONFIG.FORM, '_blank');

window.onload = () => {
  loadV382Data();
  applyV382();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
};