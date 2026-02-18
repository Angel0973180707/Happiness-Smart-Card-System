/* Angel Smart Card Front v366 (Complete Overwrite)
 * - For index.html structure (facade DOM already exists)
 * - Fetch public data (TW0001) from GAS
 * - Plan chooser: A/B with breathe guide
 * - A Free: 5 colors (粉/藍/橘/紫/綠) + 3 avatar header shapes (拱門/平直/晨曦倒拱) + 4 papers (含亞麻紋/水彩紙)
 * - B Pro: 7 “氣質” colors + stronger glass + reserve 3 layouts (先穩定 P1)
 * - Minimal guide text
 */

(() => {
  const VERSION = 366;

  // ✅ GAS 最新部署（public 會固定 TW0001）
  const API_PUBLIC =
    "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";

  // ✅ 表單
  const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

  // ===== DOM =====
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const els = {
    // top
    btnHelp: $("#btnHelp"),
    btnGoFormTop: $("#btnGoFormTop"),

    // plan chooser
    planCards: $$(".planCard[data-plan]"),
    chosenPlan: $("#chosenPlan"),
    chosenNote: $("#chosenNote"),
    btnNext: $("#btnNext"),
    btnClear: $("#btnClear"),

    // panels
    panelA: $("#panelA"),
    panelB: $("#panelB"),

    // A controls
    aColorBtns: $$(".pill.color[data-color]"),
    aLayoutBtns: $$(".pill[data-layout]"),
    aPaperBtns: $$(".pill[data-paper]"),

    // B controls
    bColorBtns: $$(".pill.color[data-bcolor]"),
    bStyleBtns: $$(".pill[data-bstyle]"),

    // facade
    facade: $("#facade"),
    logoImg: $("#logoImg"),
    avatarImg: $("#avatarImg"),
    nameText: $("#nameText"),
    orgText: $("#orgText"),
    sloganText: $("#sloganText"),
    servicesText: $("#servicesText"),
    titlesText: $("#titlesText"),
    gallery: $("#gallery"),
    videoLinks: $("#videoLinks"),
    socialLinks: $("#socialLinks"),
    btnLineOA: $("#btnLineOA"),
    btnLineDM: $("#btnLineDM"),
    btnEmail: $("#btnEmail"),
    btnPhone: $("#btnPhone"),
    qaBox: $("#qaBox"),
    btnGoForm: $("#btnGoForm"),

    // modals
    helpModal: $("#helpModal"),
    btnHelpClose: $("#btnHelpClose"),
    btnHelpOk: $("#btnHelpOk"),

    imgViewer: $("#imgViewer"),
    viewerImg: $("#viewerImg"),
    viewerCap: $("#viewerCap"),
  };

  // ===== State =====
  const LS_KEY = "ANGEL_SMARTCARD_FRONT_V366";
  const state = {
    plan: "", // "A" | "B"
    // A
    aColor: "blue",       // red/blue/orange/purple/green
    aLayout: "elegant",   // elegant/clean/focus  (對應：拱門/平直/晨曦倒拱)
    aPaper: "cotton",     // cotton/grain/linen/watercolor
    // B
    bColor: "inkgreen",   // 7 colors (see map)
    bStyle: "editorial",  // editorial/gallery/bold (先穩定 P1，但先能切)
    // data
    data: null,
  };

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (s.plan === "A" || s.plan === "B") state.plan = s.plan;
      if (["red","blue","orange","purple","green"].includes(s.aColor)) state.aColor = s.aColor;
      if (["elegant","clean","focus"].includes(s.aLayout)) state.aLayout = s.aLayout;
      if (["cotton","grain","linen","watercolor"].includes(s.aPaper)) state.aPaper = s.aPaper;

      if (typeof s.bColor === "string") state.bColor = s.bColor;
      if (["editorial","gallery","bold"].includes(s.bStyle)) state.bStyle = s.bStyle;
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        plan: state.plan,
        aColor: state.aColor,
        aLayout: state.aLayout,
        aPaper: state.aPaper,
        bColor: state.bColor,
        bStyle: state.bStyle,
      }));
    } catch (_) {}
  }

  // ===== Data helpers =====
  function driveToViewUrl(url) {
    if (!url) return "";
    const u = String(url).trim();
    // open?id=FILEID
    const m1 = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    // /file/d/FILEID/
    const m2 = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    return u;
  }

  function pick(obj, keys) {
    for (const k of keys) {
      if (obj && obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
    }
    return "";
  }

  function splitListText(s) {
    if (!s) return [];
    return String(s)
      .split(/\n|，|,|、/g)
      .map(x => x.trim())
      .filter(Boolean);
  }

  function makeLink(label, url) {
    if (!url) return null;
    const a = document.createElement("a");
    a.className = "linkItem";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = label;
    return a;
  }

  function toMapsLink(address) {
    if (!address) return "";
    const q = encodeURIComponent(String(address).trim());
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  function normalizeCardData(raw) {
    const d = raw || {};
    // 你表單欄位（以你貼的欄名為主）
    const name = pick(d, ["姓名（名片大標題）","姓名"]);
    const org  = pick(d, ["單位名稱（如：幸福教養概念館）","單位名稱"]);
    const slogan = pick(d, ["理念標語（顯示在照片下方，精簡有力）","理念標語"]);

    const service = pick(d, ["服務項目（核心業務，多項可條列換行）","服務項目"]);
    const honors  = pick(d, ["重要頭銜/獎銜（權威背書項目，多項可條列換行）","重要頭銜/獎銜"]);

    const avatar = driveToViewUrl(pick(d, ["個人專業形象照（名片主圖）","形象照","頭像"]));
    const logo   = driveToViewUrl(pick(d, ["品牌 Logo（右上角小圖標）","Logo","品牌Logo"]));

    const phone = pick(d, ["一鍵聯繫電話","電話","手機"]);
    const email = pick(d, ["一鍵聯繫 Email","Email","信箱"]);
    const lineDm = pick(d, ["私訊 LINE 連結（第一行填連結，換行填line名稱）","私訊LINE"]);
    const lineOA = pick(d, ["​LINE 官方帳號連結（綠色主按鈕）","LINE官方帳號"]);

    const addr = pick(d, ["影音平台 3（或地址）","地址","住址"]);

    const video1 = pick(d, ["影音平台 1（如：YouTube或其他連結）"]);
    const video2 = pick(d, ["影音平台 2（如：TikTok / 抖音或其他連結）"]);

    const social1 = pick(d, ["社群平台 1（如：Facebook 粉絲專頁或其他連結）"]);
    const social2 = pick(d, ["社群平台 2（如：Instagram或其他連結）"]);
    const social3 = pick(d, ["社群平台 3（如：Thread / 部落格或其他連結）"]);

    // 產品照（你有可能是逗號分隔多個連結）
    const productRaw = pick(d, ["產品或品牌或活動照片最多3張（內容區插圖）","產品/活動照片","產品照片"]);
    const productLinks = productRaw
      ? productRaw.split(/[\n,，]/g).map(x => x.trim()).filter(Boolean).slice(0,3).map(driveToViewUrl)
      : [];

    // QA
    const q1 = pick(d, ["客戶常見提問 1 (Q1)"]);
    const a1 = pick(d, ["專業解答 1 (A1)"]);
    const q2 = pick(d, ["客戶常見提問 2 (Q2)"]);
    const a2 = pick(d, ["專業解答2（A2）","專業解答 2 (A2)"]);

    return {
      name, org, slogan,
      serviceLines: splitListText(service),
      honorLines: splitListText(honors),
      avatar, logo,
      phone, email,
      lineDm, lineOA,
      address: addr,
      mapLink: addr ? toMapsLink(addr) : "",
      videos: [video1, video2].filter(Boolean),
      socials: [social1, social2, social3].filter(Boolean),
      products: productLinks,
      qa: [
        q1 && a1 ? { q: q1, a: a1 } : null,
        q2 && a2 ? { q: q2, a: a2 } : null,
      ].filter(Boolean),
    };
  }

  async function fetchPublic() {
    const url = `${API_PUBLIC}?action=public&_=${Date.now()}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.message) || "API error");
    return normalizeCardData(j.data || {});
  }

  // ===== Theme maps =====
  // 自由款 5 色：飽滿
  const A_COLOR_CLASS = {
    red: "theme-red",
    blue: "theme-blue",
    orange: "theme-orange",
    purple: "theme-purple",
    green: "theme-green",
  };

  // 自由款 3 版型（只動 hero/頭像區）
  const A_LAYOUT_CLASS = {
    elegant: "layout-elegant", // 拱門
    clean: "layout-clean",     // 平直
    focus: "layout-focus",     // 晨曦/倒拱聚光（你要求鎖聚光型，先讓它可選）
  };

  // 紙感 4 種
  const A_PAPER_CLASS = {
    cotton: "paper-cotton",
    grain: "paper-grain",
    linen: "paper-linen",
    watercolor: "paper-watercolor",
  };

  // 精品七色（濃版）—用 data-bcolor 存，class 寫成 theme-pro-*
  // 你 index 目前只有 5 顆 bcolor，我這裡仍支援 7（你之後把按鈕補齊即可）
  const B_COLOR_CLASS = {
    inkgreen: "pro-inkgreen",   // 深墨綠
    bluegray: "pro-bluegray",   // 深藍灰
    wine: "pro-wine",           // 酒紅棕
    caramel: "pro-caramel",     // 焦糖暖棕
    morandi: "pro-morandi",     // 莫蘭迪藍
    fogpurple: "pro-fogpurple", // 霧紫灰
    graphite: "pro-graphite",   // 深石墨黑
  };

  const B_STYLE_CLASS = {
    editorial: "pro-style-editorial",
    gallery: "pro-style-gallery",
    bold: "pro-style-bold",
  };

  // ===== Apply style to facade =====
  function applyFacadeClass() {
    const f = els.facade;
    if (!f) return;

    // reset A classes
    Object.values(A_COLOR_CLASS).forEach(c => f.classList.remove(c));
    Object.values(A_LAYOUT_CLASS).forEach(c => f.classList.remove(c));
    Object.values(A_PAPER_CLASS).forEach(c => f.classList.remove(c));

    // reset B classes
    Object.values(B_COLOR_CLASS).forEach(c => f.classList.remove(c));
    Object.values(B_STYLE_CLASS).forEach(c => f.classList.remove(c));
    f.classList.remove("plan-pro");
    f.classList.remove("plan-free");

    if (state.plan === "B") {
      f.classList.add("plan-pro");
      f.classList.add(B_COLOR_CLASS[state.bColor] || B_COLOR_CLASS.inkgreen);
      f.classList.add(B_STYLE_CLASS[state.bStyle] || B_STYLE_CLASS.editorial);
    } else {
      // default A
      f.classList.add("plan-free");
      f.classList.add(A_COLOR_CLASS[state.aColor] || A_COLOR_CLASS.blue);
      f.classList.add(A_LAYOUT_CLASS[state.aLayout] || A_LAYOUT_CLASS.elegant);
      f.classList.add(A_PAPER_CLASS[state.aPaper] || A_PAPER_CLASS.cotton);
    }
  }

  function setActivePills() {
    // A
    els.aColorBtns.forEach(b => b.classList.toggle("on", b.dataset.color === state.aColor));
    els.aLayoutBtns.forEach(b => b.classList.toggle("on", b.dataset.layout === state.aLayout));
    els.aPaperBtns.forEach(b => b.classList.toggle("on", b.dataset.paper === state.aPaper));

    // B
    els.bColorBtns.forEach(b => b.classList.toggle("on", b.dataset.bcolor === state.bColor));
    els.bStyleBtns.forEach(b => b.classList.toggle("on", b.dataset.bstyle === state.bStyle));
  }

  function showPanels() {
    if (state.plan === "A") {
      els.panelA.hidden = false;
      els.panelB.hidden = true;
    } else if (state.plan === "B") {
      els.panelA.hidden = true;
      els.panelB.hidden = false;
    } else {
      els.panelA.hidden = true;
      els.panelB.hidden = true;
    }
  }

  // ===== Plan chooser UI =====
  function setSelectedPlan(plan) {
    state.plan = plan || "";
    saveState();

    // UI selected
    els.planCards.forEach(btn => {
      const p = btn.getAttribute("data-plan");
      btn.classList.toggle("selected", p === state.plan);
      if (state.plan) btn.classList.remove("breathe");
    });

    if (!state.plan) {
      els.chosenPlan.textContent = "尚未選擇";
      els.chosenNote.textContent = "請先點選上方其中一個方案。";
      els.btnNext.classList.add("disabled");
      els.btnNext.setAttribute("aria-disabled", "true");
      els.btnNext.textContent = "請先選一個方案 ↑";
      els.planCards.forEach(btn => btn.classList.add("breathe"));
      showPanels();
      applyFacadeClass();
      setActivePills();
      return;
    }

    els.chosenPlan.textContent = state.plan === "A" ? "A 自由搭配款" : "B 精品設計款";
    els.chosenNote.textContent = "已套用到下方門面預覽。下一步填表，請填同一方案。";

    els.btnNext.classList.remove("disabled");
    els.btnNext.setAttribute("aria-disabled", "false");
    els.btnNext.textContent = "下一步：前往填寫表單";

    showPanels();
    applyFacadeClass();
    setActivePills();
  }

  // ===== Render facade content =====
  function safeShow(elm, show) {
    if (!elm) return;
    elm.style.display = show ? "" : "none";
  }

  function setText(elm, text) {
    if (!elm) return;
    elm.textContent = text || "";
    safeShow(elm, !!text);
  }

  function setLines(elm, lines) {
    if (!elm) return;
    if (!lines || lines.length === 0) {
      elm.innerHTML = "";
      safeShow(elm, false);
      return;
    }
    elm.innerHTML = lines.map(x => `<div class="line">• ${escapeHtml(x)}</div>`).join("");
    safeShow(elm, true);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderLinksBox(container, urls, labelsFallback) {
    if (!container) return;
    container.innerHTML = "";
    const list = (urls || []).filter(Boolean);
    if (list.length === 0) {
      safeShow(container, false);
      return;
    }
    list.forEach((u, i) => {
      let label = (labelsFallback && labelsFallback[i]) || "";
      if (!label) {
        try {
          const host = new URL(u).host.replace(/^www\./, "");
          label = host;
        } catch (_) {
          label = `連結 ${i + 1}`;
        }
      }
      const a = document.createElement("a");
      a.className = "linkPill";
      a.href = u;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = label;
      container.appendChild(a);
    });
    safeShow(container, true);
  }

  function renderGallery(urls) {
    const box = els.gallery;
    if (!box) return;
    box.innerHTML = "";

    const list = (urls || []).filter(Boolean);
    if (list.length === 0) {
      box.innerHTML = `<div class="mutedSmall">（尚未提供照片）</div>`;
      return;
    }

    list.forEach((src, idx) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "gItem";
      item.innerHTML = `<img src="${src}" alt="photo${idx + 1}" loading="lazy" />`;
      item.addEventListener("click", () => openViewer(src, `照片 ${idx + 1}`));
      box.appendChild(item);
    });
  }

  function openViewer(src, cap) {
    els.viewerImg.src = src;
    els.viewerCap.textContent = cap || "";
    els.imgViewer.hidden = false;
  }

  function closeViewer() {
    els.imgViewer.hidden = true;
    els.viewerImg.src = "";
    els.viewerCap.textContent = "";
  }

  function renderQA(list) {
    const box = els.qaBox;
    if (!box) return;
    box.innerHTML = "";
    const qa = (list || []).filter(Boolean);
    if (qa.length === 0) {
      box.innerHTML = `<div class="mutedSmall">（尚未提供）</div>`;
      return;
    }
    qa.forEach(({ q, a }) => {
      const row = document.createElement("div");
      row.className = "qaItem";
      row.innerHTML = `
        <div class="q">${escapeHtml(q)}</div>
        <div class="a">${escapeHtml(a)}</div>
      `;
      box.appendChild(row);
    });
  }

  function applyContactButtons(d) {
    // LINE OA
    if (d.lineOA) {
      els.btnLineOA.href = d.lineOA;
      safeShow(els.btnLineOA, true);
    } else {
      safeShow(els.btnLineOA, false);
    }

    // LINE DM (可能是「連結\n名稱」)
    if (d.lineDm) {
      const parts = String(d.lineDm).split("\n").map(x => x.trim()).filter(Boolean);
      const link = parts[0] || "";
      if (link) {
        els.btnLineDM.href = link;
        safeShow(els.btnLineDM, true);
      } else {
        safeShow(els.btnLineDM, false);
      }
    } else {
      safeShow(els.btnLineDM, false);
    }

    // email
    if (d.email) {
      els.btnEmail.href = `mailto:${d.email}`;
      safeShow(els.btnEmail, true);
    } else {
      safeShow(els.btnEmail, false);
    }

    // phone
    if (d.phone) {
      els.btnPhone.href = `tel:${d.phone}`;
      safeShow(els.btnPhone, true);
    } else {
      safeShow(els.btnPhone, false);
    }
  }

  function renderFacade(d) {
    // logo
    if (d.logo) {
      els.logoImg.src = d.logo;
      els.logoImg.hidden = false;
    } else {
      els.logoImg.hidden = true;
      els.logoImg.removeAttribute("src");
    }

    // avatar
    if (d.avatar) {
      els.avatarImg.src = d.avatar;
      els.avatarImg.alt = "avatar";
      safeShow(els.avatarImg, true);
    } else {
      safeShow(els.avatarImg, false);
    }

    setText(els.nameText, d.name || "—");
    setText(els.orgText, d.org || "");
    setText(els.sloganText, d.slogan || "");

    setLines(els.servicesText, d.serviceLines || []);
    setLines(els.titlesText, d.honorLines || []);

    renderGallery(d.products || []);

    // 影音/社群
    renderLinksBox(els.videoLinks, d.videos || [], ["YouTube", "短影音"]);
    renderLinksBox(els.socialLinks, d.socials || [], ["Facebook", "Instagram", "其他"]);

    // 一鍵聯繫
    applyContactButtons(d);

    // QA
    renderQA(d.qa || []);

    // 地址：如果你想顯示在某處（目前 index 沒有地址卡片，先用「社群區」後面加一顆導航 pill）
    if (d.address && d.mapLink) {
      const nav = document.createElement("a");
      nav.className = "linkPill";
      nav.href = d.mapLink;
      nav.target = "_blank";
      nav.rel = "noopener";
      nav.textContent = "導航";
      // 放在社群 links 後面
      if (els.socialLinks) els.socialLinks.appendChild(nav);
    }
  }

  // ===== Help modal =====
  function bindHelpModal() {
    const open = () => { els.helpModal.hidden = false; };
    const close = () => { els.helpModal.hidden = true; };

    els.btnHelp?.addEventListener("click", open);
    els.btnHelpClose?.addEventListener("click", close);
    els.btnHelpOk?.addEventListener("click", close);

    // overlay close
    $$(".modalOverlay[data-close='1'], [data-close='1']", els.helpModal).forEach(n => {
      n.addEventListener("click", (e) => {
        // allow close button / overlay
        if (e.currentTarget.dataset.close === "1") close();
      });
    });
  }

  // ===== Viewer bind =====
  function bindViewer() {
    const closeEls = $$("[data-close='1']", els.imgViewer);
    closeEls.forEach(n => n.addEventListener("click", closeViewer));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.imgViewer.hidden) closeViewer();
    });
  }

  // ===== Bind controls =====
  function bindPlanChooser() {
    els.planCards.forEach(btn => {
      btn.addEventListener("click", () => {
        const p = btn.getAttribute("data-plan");
        setSelectedPlan(p);
      });
    });

    els.btnClear?.addEventListener("click", () => {
      setSelectedPlan("");
    });

    const goForm = () => window.open(FORM_URL, "_blank", "noopener");

    els.btnNext?.addEventListener("click", () => {
      if (els.btnNext.classList.contains("disabled")) return;
      if (!state.plan) return;
      goForm();
    });

    els.btnGoForm?.addEventListener("click", () => {
      if (!state.plan) {
        alert("請先選一個方案（A 或 B）。選好後門面會跟著變，再去填表。");
        return;
      }
      goForm();
    });

    els.btnGoFormTop?.addEventListener("click", () => {
      if (!state.plan) {
        alert("先選方案再填表，門面會照你剛選的走。");
        return;
      }
      goForm();
    });
  }

  function bindAControls() {
    els.aColorBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        state.aColor = btn.dataset.color;
        saveState();
        applyFacadeClass();
        setActivePills();
      });
    });
    els.aLayoutBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        state.aLayout = btn.dataset.layout;
        saveState();
        applyFacadeClass();
        setActivePills();
      });
    });
    els.aPaperBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        state.aPaper = btn.dataset.paper;
        saveState();
        applyFacadeClass();
        setActivePills();
      });
    });
  }

  function mapIndexBButtonsTo7Colors() {
    // 你 index 現在只有 5 顆 bcolor（midnight/cream/sage/inkblue/sunset）
    // 我先把它們對應到你精品七色的一部分，避免「按了不動」
    const map = {
      midnight: "graphite",  // 深石墨黑
      cream: "caramel",      // 先借焦糖暖棕（你之後可補真正奶油米）
      sage: "inkgreen",      // 深墨綠
      inkblue: "bluegray",   // 深藍灰
      sunset: "wine",        // 酒紅棕（暖）
    };
    return map;
  }

  function bindBControls() {
    const map5to7 = mapIndexBButtonsTo7Colors();
    els.bColorBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.bcolor;
        state.bColor = map5to7[k] || "inkgreen";
        saveState();
        applyFacadeClass();
        setActivePills();
      });
    });
    els.bStyleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        state.bStyle = btn.dataset.bstyle;
        saveState();
        applyFacadeClass();
        setActivePills();
      });
    });
  }

  // ===== Boot =====
  async function init() {
    // 讓「固定讀 TW0001」那句不出現：直接隱藏該 hint（你之後若要改文案再說）
    // 它在「門面預覽」panelHead 的 .hint，且含 TW0001 字樣
    $$(".panel .panelHead .hint").forEach(h => {
      if (h.innerText && h.innerText.includes("TW0001")) h.style.display = "none";
    });

    loadState();

    bindHelpModal();
    bindViewer();
    bindPlanChooser();
    bindAControls();
    bindBControls();

    // restore selected plan UI
    setSelectedPlan(state.plan);

    // fetch data
    try {
      const data = await fetchPublic();
      state.data = data;
      renderFacade(data);
    } catch (e) {
      console.error(e);
      els.nameText.textContent = "載入失敗";
      els.sloganText.textContent = "請稍後再試";
    }

    // apply style after data
    applyFacadeClass();
    setActivePills();

    // 在 title 或 console 標記版本
    document.title = `Happiness Smart Card System v${VERSION}`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();