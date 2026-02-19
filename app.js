/* app.js (V386 complete overwrite) */

const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
    FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
    OG_IMG_NAME: "og-card.png", // GitHub 上的 OG 圖檔名
    DEFAULT_ID: "TW0001",
    ADMIN_PW: "888" // 隱形後台密碼
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let galleryUrls = [];
let galleryIndex = 0;

// ---------- [ 1. 核心工具 & 試算表讀取秘訣 ] ----------
const byId = (id) => document.getElementById(id);
const safeText = (el, v) => { if(el) el.innerText = (v ?? "").toString(); };

function getIdFromUrl() {
    try {
        const u = new URL(location.href);
        return (u.searchParams.get("id") || CONFIG.DEFAULT_ID).trim();
    } catch (e) { return CONFIG.DEFAULT_ID; }
}

// 關鍵秘訣：標準化所有欄位 Key，移除空白與特殊字元
function normKey(s) {
    return String(s || "").replace(/[\s\u200B-\u200D\uFEFF]/g, "").trim();
}

function buildRowIndex(rowObj) {
    const idx = new Map();
    Object.keys(rowObj || {}).forEach(k => {
        idx.set(normKey(k), rowObj[k]);
    });
    return idx;
}

// 支援模糊搜尋欄位（例如：只要包含「照片」兩字就抓取）
function findVal(indexMap, patterns) {
    const keys = Array.from(indexMap.keys());
    for (const p of patterns) {
        const target = normKey(p);
        for (const k of keys) {
            if (k.includes(target)) {
                const val = indexMap.get(k);
                if (val && String(val).trim() !== "") return val;
            }
        }
    }
    return "";
}

// ---------- [ 2. 圖片解析修復：確保圖進得來 ] ----------
function getImgUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    // 解析 Google Drive ID (支援 /d/, id=, file/d/ 等格式)
    const m = s.match(/[?&]id=([^&]+)/i) || s.match(/\/d\/([^/]+)/i) || s.match(/\/file\/d\/([^/]+)/i);
    if (m && m[1]) {
        // 使用縮圖 API 網址，這對各種權限設定的 Drive 圖片最穩定
        return `https://drive.google.com/thumbnail?id=${m[1].split('/')[0]}&sz=w1000`;
    }
    return s;
}

function setImg(id, url) {
    const el = byId(id);
    if (!el || !url) { if(el) el.style.display="none"; return; }
    el.src = getImgUrl(url);
    el.style.display = "block";
    el.onerror = () => el.style.display = "none";
}

// ---------- [ 3. 主要資料載入與渲染 ] ----------
async function loadCardData() {
    const id = getIdFromUrl();
    
    // 顯示預載入文字
    safeText(byId("u-name"), "資料同步中...");

    try {
        const res = await fetch(`${CONFIG.GAS}?action=list`, { cache: "no-store" });
        const json = await res.json();
        const headers = json.headers || [];
        const rows = json.rows || [];
        
        // 尋找符合 ID 的那一行
        let rowData = rows.find(r => String(r[0]).trim() === id);
        if (!rowData) rowData = rows[0]; // 若找不到則載入預設第一筆

        // 轉換成物件並建立 Map 索引
        const obj = {};
        headers.forEach((h, i) => obj[h] = rowData[i]);
        const idx = buildRowIndex(obj);

        // 映射資料到 HTML
        const name = findVal(idx, ["姓名", "名片大標題"]);
        const unit = findVal(idx, ["單位", "職稱"]);
        const slogan = findVal(idx, ["標語", "理念"]);
        const avatar = findVal(idx, ["照片", "形象照", "頭像"]);
        const logo = findVal(idx, ["Logo", "標誌"]);

        safeText(byId("u-name"), name); safeText(byId("u-name-p"), name);
        safeText(byId("u-unit"), unit); safeText(byId("u-unit-p"), unit);
        safeText(byId("u-slogan"), slogan); safeText(byId("u-slogan-p"), slogan);
        
        setImg("u-img", avatar);
        setImg("u-logo", logo);

        // 服務項目與頭銜：若無資料則隱藏區塊
        const sv = findVal(idx, ["服務項目", "業務"]);
        const secSv = byId("sec-service");
        if(sv) { secSv.style.display="block"; byId("u-service").innerText = sv; } else { secSv.style.display="none"; }

        const tt = findVal(idx, ["頭銜", "獎銜"]);
        const secTt = byId("sec-title");
        if(tt) { secTt.style.display="block"; byId("u-title").innerText = tt; } else { secTt.style.display="none"; }

        // Q&A
        const q1 = findVal(idx, ["Q1", "提問1"]);
        const a1 = findVal(idx, ["A1", "解答1"]);
        const secQa = byId("sec-qa");
        if(q1 || a1) {
            secQa.style.display="block";
            byId("qa-box").innerHTML = `<div class="qa"><b>Q: ${q1}</b><br>${a1}</div>`;
        } else { secQa.style.display="none"; }

        // 相簿動態平衡 (1-10張)
        const gUrls = [];
        for(let i=1; i<=10; i++){
            const u = findVal(idx, [`照片${i}`, `產品${i}`, `活動${i}`]);
            if(u) gUrls.push(u);
        }
        renderGallery(gUrls);

        // 功能按鈕綁定
        const tel = findVal(idx, ["電話", "聯繫電話"]);
        byId("btn-tel").onclick = () => tel ? location.href=`tel:${tel}` : alert("尚未填寫電話");
        
        const map = findVal(idx, ["地址", "地圖"]);
        byId("btn-map").onclick = () => {
            if(!map) return alert("尚未填寫地址");
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(map)}`, "_blank");
        };

        byId("btn-share-link").onclick = () => {
            const link = `${window.location.origin}${window.location.pathname}?id=${id}`;
            navigator.clipboard.writeText(link).then(() => alert("名片連結已複製，快去分享吧！"));
        };

    } catch (e) {
        console.error("載入失敗:", e);
        safeText(byId("u-name"), "載入異常");
    }
}

// ---------- [ 4. 相簿與 UI 互動 ] ----------
function renderGallery(urls) {
    const sec = byId("sec-gallery");
    const track = byId("g-track");
    const dots = byId("g-dots");
    if (!urls.length) { sec.style.display = "none"; return; }
    
    sec.style.display = "block";
    track.innerHTML = urls.map(u => `<div class="g-item"><img src="${getImgUrl(u)}" onclick="openLightboxSrc('${getImgUrl(u)}')"></div>`).join("");
    
    // 更新 Dots
    dots.innerHTML = urls.map((_, i) => `<div class="g-dot ${i===0?'active':''}"></div>`).join("");
}

function openLightboxSrc(src) {
    const lb = byId("lightbox");
    byId("lb-img").src = src;
    lb.classList.add("show");
}

// ---------- [ 5. 方案控制與隱形後台 ] ----------
window.setPlan = (plan) => {
    state.mode = plan;
    document.querySelectorAll(".plan-btn").forEach(b => b.classList.toggle("active", b.id.includes(plan)));
    byId("free-controls").style.display = plan === "free" ? "block" : "none";
    document.querySelector(".premium-dots").style.display = plan === "premium" ? "flex" : "none";
    apply();
};

window.setV382 = (m, t, el) => {
    state.mode = m; state.theme = t;
    document.querySelectorAll(".dot, .p-dot").forEach(d => d.classList.remove("active"));
    el.classList.add("active");
    apply();
};

window.setV382Style = (s, el) => {
    state.style = s;
    el.parentElement.querySelectorAll(".btn-neo").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
    apply();
};

function apply() {
    document.body.className = `mode-${state.mode} ${state.theme} style-${state.style} paper-1`;
}

// 後台入口：連點 3 下
let clicks = 0;
byId("footer-trigger").onclick = () => {
    clicks++;
    if (clicks === 3) {
        const p = prompt("請輸入管理密碼:");
        if (p === CONFIG.ADMIN_PW) byId("adminModal").classList.add("show");
        clicks = 0;
    }
    setTimeout(() => clicks = 0, 2000);
};

byId("adminClose").onclick = () => byId("adminModal").classList.remove("show");
byId("adminBackFront").onclick = () => byId("adminModal").classList.remove("show");

byId("adminCopyDeliver").onclick = () => {
    const id = byId("adminIdInput").value || CONFIG.DEFAULT_ID;
    const name = byId("adminNameInput").value || "客戶";
    const link = `${window.location.origin}${window.location.pathname}?id=${id}`;
    const deliverText = `【幸福智慧名片 - 製作完成】\n\n親愛的 ${name} 您好：\n您的名片已成功上線！\n連結：${link}\n預覽圖：https://github.com/your-username/your-repo/raw/main/${CONFIG.OG_IMG_NAME}\n\n歡迎轉發分享您的數位名片！`;
    navigator.clipboard.writeText(deliverText).then(() => alert("交貨訊息已複製！"));
};

byId("adminOpen").onclick = () => {
    const id = byId("adminIdInput").value;
    if (id) window.location.href = `?id=${id}`;
};

// 關閉 Lightbox
byId("lb-close").onclick = () => byId("lightbox").classList.remove("show");

window.onload = loadCardData;
