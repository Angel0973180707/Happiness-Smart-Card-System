/* app.js (V386 complete overwrite) */

const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
    FORM: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
    OG_IMAGE_URL: "https://raw.githubusercontent.com/your-username/your-repo/main/og-card.png", // 請自行修改正確的路徑
    DEFAULT_ID: "TW0001",
    ADMIN_PW: "888" // 後台進入密碼
};

let state = { mode: "free", theme: "color-1", style: "arch", paper: "paper-1" };
let currentRow = null;
let galleryUrls = [];
let galleryIndex = 0;

// ---------- Helpers ----------
const byId = (id) => document.getElementById(id);
const safeText = (el, v) => { if(el) el.innerText = (v ?? "").toString(); };

function getIdFromUrl() {
    try {
        const u = new URL(location.href);
        return (u.searchParams.get("id") || CONFIG.DEFAULT_ID).trim();
    } catch (e) { return CONFIG.DEFAULT_ID; }
}

function stripZeroWidth(s){ return String(s||"").replace(/[\u200B-\u200D\uFEFF]/g, ""); }
function normKey(s){
    let t = stripZeroWidth(s);
    t = t.replace(/"/g, "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
    return t;
}

function buildRowIndex(rowObj){
    const idx = new Map();
    Object.keys(rowObj||{}).forEach(k=>{
        const nk = normKey(k);
        if(!idx.has(nk)) idx.set(nk, rowObj[k]);
    });
    return idx;
}

function findByIncludes(indexMap, patterns){
    if(!indexMap || !(indexMap instanceof Map)) return "";
    const keys = Array.from(indexMap.keys());
    for(const p of patterns){
        const np = normKey(p);
        for(const k of keys){
            if(k.includes(np)){
                const v = indexMap.get(k);
                if(v !== null && v !== undefined && String(v).trim() !== "") return v;
            }
        }
    }
    return "";
}

function rowToObject(row, headers){
    if(!row) return null;
    if(typeof row === "object" && !Array.isArray(row)) return row;
    if(Array.isArray(row) && Array.isArray(headers)){
        const obj = {};
        headers.forEach((h,i)=> obj[String(h)] = row[i]);
        return obj;
    }
    return null;
}

// ---------- Image & Drive ----------
function extractDriveId(url){
    const s = String(url||"").trim();
    const m = s.match(/[?&]id=([^&]+)/i) || s.match(/\/d\/([^/]+)/i) || s.match(/\/file\/d\/([^/]+)/i);
    return m ? m[1] : "";
}

function driveCandidates(url){
    const raw = String(url||"").trim();
    const id = extractDriveId(raw);
    if(!id) return [raw];
    return [
        `https://drive.google.com/uc?export=view&id=${id}`,
        `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
        raw
    ];
}

function setImgWithFallback(imgEl, url){
    if(!imgEl) return;
    const candidates = driveCandidates(url);
    let i=0;
    const tryNext = ()=>{
        if(i>=candidates.length) return;
        imgEl.src = candidates[i++];
    };
    imgEl.onerror = tryNext;
    tryNext();
}

// ---------- Plan & Style ----------
window.setPlan = function(plan){
    state.mode = plan;
    if(plan === "premium") {
        if(!/^p\d$/.test(state.theme)) state.theme = "p1";
        byId("free-controls").style.display = "none";
        byId("premium-controls").style.display = "block";
    } else {
        if(!/^color-\d$/.test(state.theme)) state.theme = "color-1";
        byId("free-controls").style.display = "block";
        byId("premium-controls").style.display = "none";
    }
    document.querySelectorAll(".plan-btn").forEach(b=>b.classList.toggle("active", b.id.includes(plan)));
    applyV382();
};

window.setV382 = function(mode, theme, el){
    state.mode = mode;
    state.theme = theme;
    document.querySelectorAll(".dot, .p-dot").forEach(d=>d.classList.remove("active"));
    if(el) el.classList.add("active");
    applyV382();
};

window.setV382Style = (style, el) => {
    state.style = style;
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
    applyV382();
};

window.setV382Paper = (paper, el) => {
    state.paper = paper;
    el.parentElement.querySelectorAll(".btn-neo").forEach(b=>b.classList.remove("active"));
    el.classList.add("active");
    applyV382();
};

function applyV382(){
    const classes = [
        `mode-${state.mode}`,
        state.theme,
        state.mode==='free' ? `style-${state.style}` : "",
        state.mode==='free' ? state.paper : ""
    ].filter(Boolean).join(" ");
    document.body.className = classes;
}

// ---------- Rendering ----------
function setMultiline(secId, elId, text){
    const sec = byId(secId);
    const el = byId(elId);
    const s = String(text||"").trim();
    if(!s) { sec.style.display = "none"; return; }
    sec.style.display = "block";
    el.innerHTML = s.split(/\r?\n/g).map(line => `• ${line.trim()}`).join("<br/>");
}

function renderQA(idx){
    const q1 = findByIncludes(idx, ["Q1","提問1"]);
    const a1 = findByIncludes(idx, ["A1","解答1"]);
    const box = byId("qa-box");
    const sec = byId("sec-qa");
    if(!q1 && !a1) { sec.style.display = "none"; return; }
    sec.style.display = "block";
    box.innerHTML = `<div class="qa"><div class="qa-q">Q：${q1}</div><div class="qa-a">${a1}</div></div>`;
}

function renderLinks(idx){
    const tel = findByIncludes(idx, ["電話"]);
    const email = findByIncludes(idx, ["Email"]);
    const addr = findByIncludes(idx, ["地址", "地圖"]);
    const lineOA = findByIncludes(idx, ["LINE 官方帳號連結"]);

    byId("btn-lineoa").onclick = () => lineOA ? window.open(lineOA, "_blank") : alert("未設定 LINE OA");
    byId("btn-tel").onclick = () => tel ? location.href = `tel:${tel}` : alert("未設定電話");
    byId("btn-email").onclick = () => email ? location.href = `mailto:${email}` : alert("未設定 Email");
    
    // 導航邏輯修正
    byId("btn-map").onclick = () => {
        if(!addr) return alert("未設定地址");
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
    };

    // 一鍵分享
    byId("btn-share").onclick = async () => {
        const url = window.location.href;
        await copyToClipboard(url, "名片連結已複製！");
    };
}

// ---------- Gallery (1-10 張) ----------
function renderGallery(idx){
    const sec = byId("sec-gallery");
    const track = byId("g-track");
    const dots = byId("g-dots");
    const urls = [];

    // 抓取 1-10 欄位或單一欄位多行
    const raw = findByIncludes(idx, ["產品照片", "活動照片"]);
    if(raw) String(raw).split(/\r?\n/g).forEach(u => urls.push(u.trim()));
    for(let i=1; i<=10; i++) {
        const u = findByIncludes(idx, [`照片${i}`, `產品${i}`]);
        if(u) urls.push(String(u).trim());
    }
    
    galleryUrls = [...new Set(urls)].filter(Boolean).slice(0, 10);
    if(galleryUrls.length === 0) { sec.style.display = "none"; return; }
    sec.style.display = "block";

    track.innerHTML = ""; dots.innerHTML = "";
    galleryUrls.forEach((u, i) => {
        const item = document.createElement("div");
        item.className = "g-item";
        const img = document.createElement("img");
        setImgWithFallback(img, u);
        img.onclick = () => openLightbox(i);
        item.appendChild(img);
        track.appendChild(item);

        const d = document.createElement("div");
        d.className = "g-dot" + (i===0?" active":"");
        d.onclick = () => scrollToGallery(i);
        dots.appendChild(d);
    });
}

function scrollToGallery(i){
    const track = byId("g-track");
    track.scrollTo({ left: track.clientWidth * i, behavior: "smooth" });
}

// ---------- Lightbox ----------
function openLightbox(i){
    galleryIndex = i;
    const lb = byId("lightbox");
    setImgWithFallback(byId("lb-img"), galleryUrls[i]);
    byId("lb-title").innerText = `第 ${i+1} / ${galleryUrls.length} 張`;
    lb.classList.add("show");
}

// ---------- Admin & Footer Entry ----------
let tapCount = 0;
byId("footer-trigger").onclick = () => {
    tapCount++;
    if(tapCount >= 3) {
        const pw = prompt("系統管理員驗證:");
        if(pw === CONFIG.ADMIN_PW) byId("adminModal").classList.add("show");
        else alert("密碼錯誤");
        tapCount = 0;
    }
    setTimeout(() => tapCount = 0, 2000);
};

byId("adminClose").onclick = () => byId("adminModal").classList.remove("show");
byId("adminBackFront").onclick = () => byId("adminModal").classList.remove("show");

byId("adminOpen").onclick = () => {
    const id = byId("adminIdInput").value.trim();
    if(id) location.search = `?id=${id}`;
};

byId("adminCopyUrl").onclick = () => {
    const id = byId("adminIdInput").value.trim() || getIdFromUrl();
    const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
    copyToClipboard(url, "分享連結已複製");
};

byId("adminDeliver").onclick = () => {
    const id = byId("adminIdInput").value.trim() || getIdFromUrl();
    const name = byId("u-name").innerText;
    const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
    const msg = `【幸福智慧名片 - 交貨通知】\n\n您好 ${name}，您的專屬智慧名片已製作完成！\n\n名片連結：\n${url}\n\n封面預覽圖：\n${CONFIG.OG_IMAGE_URL}`;
    copyToClipboard(msg, "交貨訊息已複製（含 OG 圖路徑）");
};

async function copyToClipboard(text, okMsg){
    try {
        await navigator.clipboard.writeText(text);
        byId("adminNote").innerText = okMsg;
        alert(okMsg);
    } catch (e) { alert(text); }
}

// ---------- Data Loading ----------
async function loadData(){
    const id = getIdFromUrl();
    try {
        const res = await fetch(`${CONFIG.GAS}?action=list`, { cache: "no-store" });
        const json = await res.json();
        const rowArr = json.rows.find(r => String(r[0]).trim() === id) || json.rows[0];
        const rowObj = rowToObject(rowArr, json.headers);
        const idx = buildRowIndex(rowObj);

        const name = findByIncludes(idx, ["姓名"]);
        const unit = findByIncludes(idx, ["單位"]);
        const slogan = findByIncludes(idx, ["標語"]);
        const avatar = findByIncludes(idx, ["照片", "形象照"]);
        const logo = findByIncludes(idx, ["Logo"]);

        safeText(byId("u-name"), name);
        safeText(byId("u-name-p"), name);
        safeText(byId("u-unit"), unit);
        safeText(byId("u-unit-p"), unit);
        safeText(byId("u-slogan"), slogan);
        safeText(byId("u-slogan-p"), slogan);

        if(avatar) setImgWithFallback(byId("u-img"), avatar);
        if(logo) { byId("u-logo").style.display="block"; setImgWithFallback(byId("u-logo"), logo); }
        
        setMultiline("sec-service", "u-service", findByIncludes(idx, ["服務項目"]));
        setMultiline("sec-title", "u-title", findByIncludes(idx, ["頭銜"]));
        
        renderLinks(idx);
        renderQA(idx);
        renderGallery(idx);
        applyV382();
    } catch (e) { console.error(e); }
}

window.goFillForm = () => window.open(CONFIG.FORM, "_blank");
window.onload = loadData;
