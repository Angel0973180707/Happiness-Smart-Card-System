/* app.js — Angel Smart Card Front v366.1 (Complete Overwrite)
   Fix: Facade preview + control buttons always in sync
*/

(() => {
  const VERSION = "366.1";

  // ✅ 你的最新部署（public 固定 TW0001）
  const API_PUBLIC =
    "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";

  const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const addOn = (btn) => btn && btn.classList.add("on");
  const removeOn = (btn) => btn && btn.classList.remove("on");

  function driveToViewUrl(url) {
    if (!url) return "";
    const u = String(url).trim();
    const m1 = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    const m2 = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    return u;
  }

  function toMapsLink(address) {
    if (!address) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  function splitLines(s) {
    if (!s) return "";
    return String(s).replace(/\r/g, "").trim();
  }

  function splitTags(s) {
    if (!s) return [];
    return String(s)
      .split(/[,，、\n]/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  function pick(data, keys) {
    for (const k of keys) {
      if (data && data[k] != null && String(data[k]).trim() !== "") return String(data[k]).trim();
    }
    return "";
  }

  function normalizeCardData(raw) {
    const data = raw || {};
    return {
      org: pick(data, ["單位名稱（如：幸福教養概念館）", "單位名稱", "品牌/單位", "公司", "組織"]),
      name: pick(data, ["姓名（名片大標題）", "姓名", "名字", "稱呼"]),
      slogan: pick(data, ["理念標語（顯示在照片下方，精簡有力）", "理念標語", "標語", "一句話"]),
      service: pick(data, ["服務項目（核心業務，多項可條列換行）", "服務項目", "核心服務"]),
      honors: pick(data, ["重要頭銜/獎銜（權威背書項目，多項可條列換行）", "重要頭銜/獎銜", "頭銜", "獎項"]),
      avatarUrl: driveToViewUrl(pick(data, ["個人專業形象照（名片主圖）", "形象照", "頭像", "照片", "photo"])),
      logoUrl: driveToViewUrl(pick(data, ["Logo（可選）", "Logo", "logo"])),
      tags: splitTags(pick(data, ["標籤", "標籤（可多個）", "自我標籤", "tag"])),
      phone: pick(data, ["電話", "手機", "聯絡電話"]),
      email: pick(data, ["Email", "email", "信箱", "電子郵件"]),
      line: pick(data, ["LINE", "Line", "line"]),
      website: pick(data, ["網站", "個人網站", "官網", "Website"]),
      address: pick(data, ["地址", "住址", "工作地址", "location"]),
      p1: driveToViewUrl(pick(data, ["產品或品牌或活動照片-1", "產品照片1", "產品照1", "活動照1"])),
      p2: driveToViewUrl(pick(data, ["產品或品牌或活動照片-2", "產品照片2", "產品照2", "活動照2"])),
      p3: driveToViewUrl(pick(data, ["產品或品牌或活動照片-3", "產品照片3", "產品照3", "活動照3"])),
      youtube: pick(data, ["YouTube", "youtube", "YT"]),
      ig: pick(data, ["IG", "Instagram", "instagram"]),
      fb: pick(data, ["FB", "Facebook", "facebook"]),
      lineoa: pick(data, ["LINE官方帳號", "LINE OA", "Line OA", "官方LINE"]),
    };
  }

  async function fetchPublic() {
    const url = `${API_PUBLIC}?action=public&_=${Date.now()}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.message) || "API error");
    return normalizeCardData(j.data || {});
  }

  // ---------- state ----------
  const state = {
    plan: null, // "A" | "B"
    // A
    aColor: "blue", // red|blue|orange|purple|green (對應 .theme-xxx)
    aLayout: "elegant", // elegant|clean|focus
    aPaper: "cotton", // cotton|grain|linen|watercolor
    // B
    bColor: "midnight", // midnight|cream|sage|inkblue|sunset (你 index 目前 5 顆)
    bStyle: "editorial", // editorial|gallery|bold (你 index 3 顆)
    // data
    data: null,
  };

  // ---------- DOM ----------
  const dom = {
    // plan chooser
    planCards: $$(".planCard"),
    chosenPlan: $("#chosenPlan"),
    chosenNote: $("#chosenNote"),
    btnClear: $("#btnClear"),
    btnNext: $("#btnNext"),
    panelA: $("#panelA"),
    panelB: $("#panelB"),

    // facade
    facade: $("#facade"),
    avatarImg: $("#avatarImg"),
    logoImg: $("#logoImg"),
    nameText: $("#nameText"),
    orgText: $("#orgText"),
    sloganText: $("#sloganText"),
    servicesText: $("#servicesText"),
    titlesText: $("#titlesText"),
    gallery: $("#gallery"),
    videoLinks: $("#videoLinks"),
    socialLinks: $("#socialLinks"),
    qaBox: $("#qaBox"),
    btnLineOA: $("#btnLineOA"),
    btnLineDM: $("#btnLineDM"),
    btnEmail: $("#btnEmail"),
    btnPhone: $("#btnPhone"),

    // top buttons
    btnGoFormTop: $("#btnGoFormTop"),
    btnGoForm: $("#btnGoForm"),
    btnHelp: $("#btnHelp"),

    // modal
    helpModal: $("#helpModal"),
    btnHelpClose: $("#btnHelpClose"),
    btnHelpOk: $("#btnHelpOk"),

    // viewer
    imgViewer: $("#imgViewer"),
    viewerImg: $("#viewerImg"),
    viewerCap: $("#viewerCap"),
  };

  // ---------- sync (THE KEY) ----------
  function syncControlsUI() {
    // Plan cards selected
    dom.planCards.forEach((b) => {
      const isSel = b.getAttribute("data-plan") === state.plan;
      b.classList.toggle("selected", isSel);
    });

    // Panels show/hide
    dom.panelA.hidden = state.plan !== "A";
    dom.panelB.hidden = state.plan !== "B";

    // Next button enabled
    const ok = !!state.plan;
    dom.btnNext.classList.toggle("disabled", !ok);
    dom.btnNext.setAttribute("aria-disabled", ok ? "false" : "true");
    dom.btnNext.textContent = ok ? "下一步：看門面預覽 ↓" : "請先選一個方案 ↑";

    // chosen text
    dom.chosenPlan.textContent =
      state.plan === "A" ? "A｜自由搭配款" : state.plan === "B" ? "B｜精品設計款" : "尚未選擇";
    dom.chosenNote.textContent =
      state.plan ? "已套用到下方門面預覽。" : "請先點選上方其中一個方案（卡片會跳動提醒你）。";

    // Pills ON states (A)
    $$('#panelA .pill[data-color]').forEach((p) => {
      p.classList.toggle("on", p.getAttribute("data-color") === state.aColor);
    });
    $$('#panelA .pill[data-layout]').forEach((p) => {
      p.classList.toggle("on", p.getAttribute("data-layout") === state.aLayout);
    });
    $$('#panelA .pill[data-paper]').forEach((p) => {
      p.classList.toggle("on", p.getAttribute("data-paper") === state.aPaper);
    });

    // Pills ON states (B)
    $$('#panelB .pill[data-bcolor]').forEach((p) => {
      p.classList.toggle("on", p.getAttribute("data-bcolor") === state.bColor);
    });
    $$('#panelB .pill[data-bstyle]').forEach((p) => {
      p.classList.toggle("on", p.getAttribute("data-bstyle") === state.bStyle);
    });
  }

  function clearFacadeClasses(prefixes) {
    prefixes.forEach((pre) => {
      dom.facade.classList.forEach((c) => {
        if (c.startsWith(pre)) dom.facade.classList.remove(c);
      });
    });
  }

  function syncFacadeUI() {
    if (!dom.facade) return;

    // remove old
    clearFacadeClasses(["plan-", "theme-", "layout-", "paper-", "pro-", "pro-style-"]);

    if (state.plan === "A") {
      dom.facade.classList.add("plan-free");
      dom.facade.classList.add(`theme-${state.aColor}`); // theme-red/blue/orange/purple/green
      dom.facade.classList.add(`layout-${state.aLayout}`); // layout-elegant/clean/focus
      dom.facade.classList.add(`paper-${state.aPaper}`); // paper-cotton/...
    } else if (state.plan === "B") {
      dom.facade.classList.add("plan-pro");

      // ✅B：整張覆蓋底色（用你 CSS 的 pro-7 類名）
      // 你 index 目前只有 5 顆 bcolor，我先做映射到 7 色其中 5 個
      const map = {
        midnight: "pro-graphite",
        cream: "pro-caramel",
        sage: "pro-inkgreen",
        inkblue: "pro-bluegray",
        sunset: "pro-wine",
      };
      dom.facade.classList.add(map[state.bColor] || "pro-graphite");
      dom.facade.classList.add(`pro-style-${state.bStyle}`); // pro-style-editorial/...
      // B 不用紙感
    }

    // ✅如果你要「選擇後立即看到」：滾到門面
    // （不強制，避免一直跳；只在有 plan 時才可能被 Next 觸發）
  }

  function syncAll() {
    syncControlsUI();
    syncFacadeUI();
  }

  // ---------- render facade content ----------
  function renderLinkPill(href, label) {
    if (!href) return null;
    const a = document.createElement("a");
    a.className = "linkPill";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = label;
    return a;
  }

  function setElText(el, text) {
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "" : "none";
  }

  function renderFacadeData(d) {
    dom.nameText.textContent = d.name || "（未填姓名）";
    setElText(dom.orgText, d.org);
    setElText(dom.sloganText, d.slogan);

    dom.servicesText.textContent = splitLines(d.service) || "（尚未填寫）";
    dom.titlesText.textContent = splitLines(d.honors) || "（可留空）";

    // avatar
    if (d.avatarUrl) dom.avatarImg.src = d.avatarUrl;

    // logo
    if (d.logoUrl) {
      dom.logoImg.hidden = false;
      dom.logoImg.src = d.logoUrl;
    } else {
      dom.logoImg.hidden = true;
    }

    // gallery
    dom.gallery.innerHTML = "";
    const photos = [
      { url: d.p1, cap: "產品/活動照片 1" },
      { url: d.p2, cap: "產品/活動照片 2" },
      { url: d.p3, cap: "產品/活動照片 3" },
    ].filter((x) => x.url);

    if (!photos.length) {
      const empty = document.createElement("div");
      empty.className = "cardBody muted";
      empty.textContent = "（尚未提供照片）";
      dom.gallery.appendChild(empty);
    } else {
      photos.forEach((p) => {
        const item = document.createElement("div");
        item.className = "gItem";
        const img = document.createElement("img");
        img.src = p.url;
        img.alt = p.cap;
        item.appendChild(img);
        item.onclick = () => openViewer(p.url, p.cap);
        dom.gallery.appendChild(item);
      });
    }

    // links
    dom.videoLinks.innerHTML = "";
    dom.socialLinks.innerHTML = "";

    const v1 = renderLinkPill(d.youtube, "YouTube");
    if (v1) dom.videoLinks.appendChild(v1);

    const w = renderLinkPill(d.website, "網站");
    if (w) dom.videoLinks.appendChild(w);

    const ig = renderLinkPill(d.ig, "IG");
    if (ig) dom.socialLinks.appendChild(ig);

    const fb = renderLinkPill(d.fb, "FB");
    if (fb) dom.socialLinks.appendChild(fb);

    const maps = renderLinkPill(toMapsLink(d.address), "地址導航");
    if (maps) dom.socialLinks.appendChild(maps);

    // contact buttons
    dom.btnLineOA.href = d.lineoa || "#";
    dom.btnLineOA.style.display = d.lineoa ? "" : "none";

    // LINE 私訊：如果你表單填的是 line id，可組連結；如果本來就是網址也可直接用
    const lineHref = d.line
      ? (d.line.startsWith("http") ? d.line : `https://line.me/ti/p/${encodeURIComponent(d.line)}`)
      : "";
    dom.btnLineDM.href = lineHref || "#";
    dom.btnLineDM.style.display = lineHref ? "" : "none";

    dom.btnEmail.href = d.email ? `mailto:${d.email}` : "#";
    dom.btnEmail.style.display = d.email ? "" : "none";

    dom.btnPhone.href = d.phone ? `tel:${d.phone}` : "#";
    dom.btnPhone.style.display = d.phone ? "" : "none";

    // QA（示範用：先固定幾題，之後你要改成從表單/試算表讀也行）
    dom.qaBox.innerHTML = "";
    const qa = [
      { q: "怎麼開始？", a: "先選方案 → 再填表。提交後會依你選的方案製作。" },
      { q: "照片一定要很專業嗎？", a: "清楚就好；精品版更吃照片質感。" },
      { q: "地址可以導航嗎？", a: "有填地址會自動變成 Google 導航連結。" },
    ];
    qa.forEach((x) => {
      const box = document.createElement("div");
      box.className = "qaItem";
      const q = document.createElement("div");
      q.className = "q";
      q.textContent = x.q;
      const a = document.createElement("div");
      a.className = "a";
      a.textContent = x.a;
      box.append(q, a);
      dom.qaBox.appendChild(box);
    });
  }

  // ---------- modal / viewer ----------
  function openHelp(open) {
    dom.helpModal.hidden = !open;
  }

  function openViewer(src, cap) {
    dom.viewerImg.src = src;
    dom.viewerCap.textContent = cap || "";
    dom.imgViewer.hidden = false;
  }
  function closeViewer() {
    dom.imgViewer.hidden = true;
    dom.viewerImg.src = "";
    dom.viewerCap.textContent = "";
  }

  // ---------- events ----------
  function bindEvents() {
    // plan choose
    dom.planCards.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.plan = btn.getAttribute("data-plan");

        // 初始預設（避免切換後殘留造成「看起來不同步」）
        if (state.plan === "A") {
          state.aColor ||= "blue";
          state.aLayout ||= "elegant";
          state.aPaper ||= "cotton";
        }
        if (state.plan === "B") {
          state.bColor ||= "midnight";
          state.bStyle ||= "editorial";
        }
        syncAll();
      });
    });

    // clear
    dom.btnClear.addEventListener("click", () => {
      state.plan = null;
      syncAll();
    });

    // next -> scroll to facade
    dom.btnNext.addEventListener("click", () => {
      if (!state.plan) return;
      dom.facade?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // A controls
    $$('#panelA .pill[data-color]').forEach((p) => {
      p.addEventListener("click", () => {
        state.aColor = p.getAttribute("data-color");
        syncAll();
      });
    });
    $$('#panelA .pill[data-layout]').forEach((p) => {
      p.addEventListener("click", () => {
        state.aLayout = p.getAttribute("data-layout");
        syncAll();
      });
    });
    $$('#panelA .pill[data-paper]').forEach((p) => {
      p.addEventListener("click", () => {
        state.aPaper = p.getAttribute("data-paper");
        syncAll();
      });
    });

    // B controls
    $$('#panelB .pill[data-bcolor]').forEach((p) => {
      p.addEventListener("click", () => {
        state.bColor = p.getAttribute("data-bcolor");
        syncAll();
      });
    });
    $$('#panelB .pill[data-bstyle]').forEach((p) => {
      p.addEventListener("click", () => {
        state.bStyle = p.getAttribute("data-bstyle");
        syncAll();
      });
    });

    // go form
    const goForm = () => window.open(FORM_URL, "_blank", "noopener");
    dom.btnGoFormTop?.addEventListener("click", goForm);
    dom.btnGoForm?.addEventListener("click", goForm);

    // help modal
    dom.btnHelp?.addEventListener("click", () => openHelp(true));
    dom.btnHelpClose?.addEventListener("click", () => openHelp(false));
    dom.btnHelpOk?.addEventListener("click", () => openHelp(false));
    dom.helpModal?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-close") === "1") openHelp(false);
    });

    // viewer close
    dom.imgViewer?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeViewer();
    });
    $$(".viewer [data-close='1']").forEach((x) => x.addEventListener("click", closeViewer));
  }

  // ---------- init ----------
  async function init() {
    // 預設：先讓畫面「不會不同步」→ 先同步 UI 再取資料
    syncAll();
    bindEvents();

    // load data
    try {
      const d = await fetchPublic();
      state.data = d;
      renderFacadeData(d);
    } catch (err) {
      console.error(err);
      // fallback text
      dom.nameText.textContent = "載入失敗（請稍後再試）";
    }
  }

  init();
})();