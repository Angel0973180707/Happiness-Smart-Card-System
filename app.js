const CONFIG = {
    // 您提供的 GAS 網址
    GAS_API: "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec",
    // 您提供的 Google 表單網址
    FORM_BASE: "https://docs.google.com/forms/d/e/1FAIpQLSfOk1W2cSInf5G94EaUGHXPNV054sCT20BVaPzD07aECGEfpA/viewform",
    // 指定讀取小天使 ID
    TARGET_ID: "TW0001" 
};

let state = {
    mode: 'free',
    theme: 'warm-pink',
    style: 'arch'
};

// 初始化：自動讀取小天使資料
async function fetchAngelData() {
    try {
        const response = await fetch(`${CONFIG.GAS_API}?id=${CONFIG.TARGET_ID}`);
        const data = await response.json();
        
        if (data) {
            document.getElementById('u-name').innerText = data.姓名 || "小天使笑長";
            document.getElementById('u-unit').innerText = data.單位 || "幸福智慧教養館";
            document.getElementById('u-service').innerText = data.服務項目 || "載入中...";
            if (data.形象照) document.getElementById('u-img').src = data.形象照;
        }
    } catch (error) {
        console.error("無法讀取雲端資料，改用預設值", error);
        document.getElementById('u-service').innerText = "致力推廣幸福教養，陪伴家長共好。";
    }
}

// 模式切換邏輯
function setAppMode(mode, theme, el) {
    state.mode = mode;
    state.theme = theme;
    
    // UI 反饋
    document.querySelectorAll('.dot, .p-dot').forEach(d => d.classList.remove('active'));
    el.classList.add('active');

    const styleSelector = document.getElementById('style-selector');

    if (mode === 'premium') {
        state.style = 'premium';
        styleSelector.style.display = 'none'; // 精品款鎖定版型
        document.body.className = `mode-premium ${theme}`;
    } else {
        state.style = localStorage.getItem('v358_style') || 'arch';
        styleSelector.style.display = 'block';
        document.body.className = `mode-free ${theme} style-${state.style}`;
    }
    updateThemeColor();
}

function setFreeStyle(style, el) {
    state.style = style;
    localStorage.setItem('v358_style', style);
    document.querySelectorAll('.btn-mini').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    document.body.className = `mode-free ${state.theme} style-${style}`;
}

function updateThemeColor() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}

function goFillForm() {
    // 根據目前選擇的氣質與版型，預填入表單
    const prefillUrl = `${CONFIG.FORM_BASE}?entry.12345=${state.theme}&entry.67890=${state.style}`;
    window.open(prefillUrl, '_blank');
}

window.onload = fetchAngelData;
