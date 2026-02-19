const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
  OG_URL: "https://github.com/your-username/your-repo/raw/main/og-card.png"
};

let state = { mode: "free", theme: "color-1", style: "arch" };

// --- 讀取秘訣：強化版圖片解析 ---
function getSmartImg(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  // 匹配所有 Drive 格式 (包括分享連結)
  const driveId = s.match(/[-\w]{25,}/); 
  if (driveId && s.includes("drive.google")) {
    return `https://drive.google.com/thumbnail?id=${driveId[0]}&sz=w1000`;
  }
  return s;
}

function updateImg(id, url) {
  const el = document.getElementById(id);
  if (!el || !url) return;
  el.src = getSmartImg(url);
  el.onload = () => el.style.display = "block";
}

// --- 資料讀取 ---
async function initCard() {
  const id = new URLSearchParams(window.location.search).get("id") || "TW0001";
  try {
    const res = await fetch(`${CONFIG.GAS}?action=list`);
    const json = await res.json();
    const headers = json.headers;
    const row = json.rows.find(r => r[0] === id) || json.rows[0];
    
    // 建立索引
    const data = {};
    headers.forEach((h, i) => data[h.trim()] = row[i]);

    // 填入文字
    document.getElementById("u-name").innerText = data["姓名"] || "無姓名";
    document.getElementById("u-name-p").innerText = data["姓名"] || "無姓名";
    document.getElementById("u-unit").innerText = data["單位名稱"] || "";
    document.getElementById("u-unit-p").innerText = data["單位名稱"] || "";

    // 圖片載入 (改進點：絕對載入)
    updateImg("u-img", data["個人專業形象照"] || data["照片"]);
    updateImg("u-logo", data["品牌Logo"] || data["Logo"]);

    // 相簿邏輯 (動態隱藏)
    const gTrack = document.getElementById("g-track");
    const gUrls = [data["照片1"], data["照片2"], data["照片3"]].filter(Boolean);
    if (gUrls.length > 0) {
      document.getElementById("sec-gallery").style.display = "block";
      gTrack.innerHTML = gUrls.map(u => `<img src="${getSmartImg(u)}">`).join("");
    }

    // 服務與頭銜 (有資料才開)
    if(data["服務項目"]) {
      document.getElementById("sec-service").style.display = "block";
      document.getElementById("u-service").innerText = data["服務項目"];
    }

    // 分享按鈕
    document.getElementById("btn-share-link").onclick = () => {
      navigator.clipboard.writeText(window.location.href);
      alert("連結已複製！");
    };

    // 地圖導航修正
    document.getElementById("btn-map").onclick = () => {
      const addr = data["地址"] || data["地圖"];
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`);
    };

  } catch (e) { console.error("Sync Error", e); }
}

// --- 方案與版型同步 (解決精品款無法選版問題) ---
window.setPlan = (plan) => {
  state.mode = plan;
  document.querySelectorAll(".plan-btn").forEach(b => b.classList.toggle("active", b.id.includes(plan)));
  document.querySelector(".free-only").style.display = plan === "free" ? "flex" : "none";
  document.querySelector(".premium-only").style.display = plan === "premium" ? "flex" : "none";
  syncUI();
};

window.setV382 = (m, t, el) => {
  state.mode = m; state.theme = t;
  document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
  el.classList.add("active");
  syncUI();
};

window.setV382Style = (s, el) => {
  state.style = s;
  document.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  syncUI();
};

function syncUI() {
  document.body.className = `mode-${state.mode} ${state.theme} style-${state.style}`;
}

// 後台點擊 3 下進入
let clicks = 0;
document.getElementById("footer-trigger").onclick = () => {
  if (++clicks >= 3) {
    if (prompt("驗證:") === "888") document.getElementById("adminModal").style.display = "flex";
    clicks = 0;
  }
};

window.onload = initCard;
