/* Angel Smart Card Front v366 (Complete Overwrite)
   - based on v365 green front
   - Fetch public data (TW0001) from GAS
   - Free(A): 5 colors + 3 header shapes + 4 paper textures (ONLY header area changes)
   - Pro(B): 7 “氣質” colors + stronger glass + reserve 3 layouts
   - Minimal guide text, no “固定讀 TW0001” text shown
*/

(() => {
  const VERSION = 366;

  // ✅ 你指定的最新部署（public 固定 TW0001）
  const API_PUBLIC =
    "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec";

  // ✅ 你的表單
  const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

  // ===== Helpers =====
  const $ = (sel, root = document) => root.querySelector(sel);

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

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

  function toMapsLink(address) {
    if (!address) return "";
    const q = encodeURIComponent(String(address).trim());
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  function splitTags(s) {
    if (!s) return [];
    return String(s)
      .split(/[,，、\n]/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  // ===== Data mapping (Chinese column titles) =====
  function pick(data, keys) {
    for (const k of keys) {
      if (data && data[k] != null && String(data[k]).trim() !== "")
        return String(data[k]).trim();
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
      avatarUrl: driveToViewUrl(
        pick(data, ["個人專業形象照（名片主圖）", "形象照", "頭像", "照片", "photo"])
      ),
      tags: splitTags(pick(data, ["標籤", "標籤（可多個）", "自我標籤", "tag"])),
      phone: pick(data, ["電話", "手機", "聯絡電話"]),
      email: pick(data, ["Email", "email", "信箱", "電子郵件"]),
      line: pick(data, ["LINE", "Line", "line"]),
      website: pick(data, ["網站", "個人網站", "官網", "Website"]),
      address: pick(data, ["地址", "住址", "工作地址", "location"]),
      p1: driveToViewUrl(pick(data, ["產品或品牌或活動照片-1", "產品照片1", "產品照1", "活動照1"])),
      p2: driveToViewUrl(pick(data, ["產品或品牌或活動照片-2", "產品照片2", "產品照2", "活動照2"])),
      p3: driveToViewUrl(pick(data, ["產品或品牌或活動照片-3", "產品照片3", "產品照3", "活動照3"])),
    };
  }

  async function fetchPublic() {
    const url = `${API_PUBLIC}?action=public&_=${Date.now()}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.message) || "API error");
    return normalizeCardData(j.data || {});
  }

  // ===== Options =====
  // 自由款五色（飽滿）
  const FREE_COLORS = [
    { key: "粉", css: "linear-gradient(180deg,#ff6b7d,#ff3f57)" },
    { key: "藍", css: "linear-gradient(180deg,#4ea7ff,#1f7dff)" },
    { key: "橘", css: "linear-gradient(180deg,#ffb24a,#ff7a1a)" },
    { key: "紫", css: "linear-gradient(180deg,#8a7cff,#5a4bff)" },
    { key: "綠", css: "linear-gradient(180deg,#57d48b,#14b86a)" },
  ];

  // 自由款頭像區三款（只動頭像區）
  const FREE_HEADERS = [
    { key: "拱門形", cls: "arch" },
    { key: "平直形", cls: "flat" },
    { key: "晨曦倒拱", cls: "invert" },
  ];

  // 自由款紙感四種
  const PAPERS = [
    { key: "霧面棉紙", cls: "paper-cotton" },
    { key: "細顆粒紙", cls: "paper-grain" },
    { key: "亞麻紋", cls: "paper-linen" },
    { key: "水彩紙", cls: "paper-watercolor" },
  ];

  // 精品七色（濃版 + 設計語言）
  const PRO_COLORS = [
    { key: "深墨綠", css: "linear-gradient(180deg,#1b6a49,#0b2f1f)" },
    { key: "深藍灰", css: "linear-gradient(180deg,#334b5f,#18222c)" },
    { key: "酒紅棕", css: "linear-gradient(180deg,#6d2332,#2c0e14)" },
    { key: "焦糖暖棕", css: "linear-gradient(180deg,#8c5a2d,#3c2311)" },
    { key: "莫蘭迪藍", css: "linear-gradient(180deg,#3a6e8b,#173243)" },
    { key: "霧紫灰", css: "linear-gradient(180deg,#5c4f74,#251f31)" },
    { key: "深石墨黑", css: "linear-gradient(180deg,#22262b,#0b0c0e)" },
  ];

  // ===== State =====
  const state = {
    plan: null, // "A" | "B"
    freeColor: "藍",
    freeHeader: "拱門形",
    paper: "霧面棉紙",
    proColor: "深墨綠",
    proLayout: 1, // reserve 1..3
    data: null,
  };

  // ===== Persistence =====
  const LS_KEY = "angel_smartcard_front_v366";
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (s.plan === "A" || s.plan === "B") state.plan = s.plan;
      if (FREE_COLORS.some((x) => x.key === s.freeColor)) state.freeColor = s.freeColor;
      if (FREE_HEADERS.some((x) => x.key === s.freeHeader)) state.freeHeader = s.freeHeader;
      if (PAPERS.some((x) => x.key === s.paper)) state.paper = s.paper;
      if (PRO_COLORS.some((x) => x.key === s.proColor)) state.proColor = s.proColor;
      if ([1, 2, 3].includes(Number(s.proLayout))) state.proLayout = Number(s.proLayout);
    } catch (_) {}
  }
  function saveState() {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          plan: state.plan,
          freeColor: state.freeColor,
          freeHeader: state.freeHeader,
          paper: state.paper,
          proColor: state.proColor,
          proLayout: state.proLayout,
        })
      );
    } catch (_) {}
  }

  // ===== Modal =====
  function openModal(title, bodyNode) {
    const mask = el("div", "modalMask");
    const box = el("div", "modalBox");
    const head = el("div", "modalHead", `<div class="modalTitle">${title}</div>`);
    const close = el("button", "modalClose", "✕");
    close.onclick = () => mask.remove();
    head.appendChild(close);

    const body = el("div", "modalBody");
    body.appendChild(bodyNode);

    box.append(head, body);
    mask.appendChild(box);
    document.body.appendChild(mask);

    mask.addEventListener("click", (e) => {
      if (e.target === mask) mask.remove();
    });
  }

  function renderPrep() {
    const n = el("div", "modalContent");
    n.innerHTML = `
      <ul class="list">
        <li>準備：形象照（正面清楚）、聯絡方式、服務一句話</li>
        <li>若有地址：可直接貼「完整地址」讓導航更準</li>
        <li>產品/活動照：最多 3 張（可先不填）</li>
      </ul>
      <div class="hint">先在這裡選方案與風格，記住名稱，再去填表。</div>
    `;
    return n;
  }

  function renderQA() {
    const n = el("div", "modalContent");
    n.innerHTML = `
      <div class="qa">
        <div class="q">這是什麼？</div>
        <div class="a">一張可分享、可更新的「智慧名片」門面。</div>

        <div class="q">我需要會設計嗎？</div>
        <div class="a">不用。先選方案與風格，再填表就能生成。</div>

        <div class="q">自由款跟精品差在哪？</div>
        <div class="a">自由：清爽留白、只在頭像區變化。精品：七色濃版、玻璃質感更明顯，並預留更多排版。</div>

        <div class="q">地址可以導航嗎？</div>
        <div class="a">可以。填了地址就會變成 Google 導航連結。</div>
      </div>
    `;
    return n;
  }

  // ===== UI Build =====
  function mount() {
    const host = $("#app") || document.body;
    host.innerHTML = "";

    const wrap = el("div", "wrap");

    // Topbar (v365 green vibe)
    const top = el("div", "topbar");
    const brand = el("div", "brand");
    brand.appendChild(el("h1", "", "幸福智慧名片系統"));
    brand.appendChild(el("p", "sub", "先選方案 → 再填表"));

    const actions = el("div", "actions");
    const btnPrep = el("button", "btn ghost icon", "🛈 填表前準備");
    const btnForm = el("button", "btn primary icon", "✍️ 立即填寫表單");
    const btnQA = el("button", "btn ghost icon", "❓ Q&A");
    btnForm.onclick = () => window.open(FORM_URL, "_blank", "noopener");
    btnPrep.onclick = () => openModal("填表前準備", renderPrep());
    btnQA.onclick = () => openModal("Q&A", renderQA());
    actions.append(btnPrep, btnForm, btnQA);

    top.append(brand, actions);
    wrap.appendChild(top);

    const grid = el("div", "grid2");

    // Left panel
    const left = el("div", "panel");
    left.appendChild(el("h2", "", "先選方案"));

    const choiceRow = el("div", "choiceRow");
    const aCard = el("button", "choiceCard", `
      <div class="t">A 自由搭配款</div>
      <div class="d">選色・頭像版型・紙感</div>
    `);
    const bCard = el("button", "choiceCard", `
      <div class="t">B 精品設計款</div>
      <div class="d">七色・玻璃感・三排版</div>
    `);

    function refreshChoiceUI() {
      aCard.classList.toggle("on", state.plan === "A");
      bCard.classList.toggle("on", state.plan === "B");
      $("#pickedPlan").textContent = state.plan ? (state.plan === "A" ? "A 自由搭配款" : "B 精品設計款") : "尚未選擇";
      $("#controlsA").style.display = state.plan === "A" ? "" : "none";
      $("#controlsB").style.display = state.plan === "B" ? "" : "none";
      renderPreview();
    }

    aCard.onclick = () => {
      state.plan = "A";
      saveState();
      refreshChoiceUI();
      document.getElementById("previewTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    bCard.onclick = () => {
      state.plan = "B";
      saveState();
      refreshChoiceUI();
      document.getElementById("previewTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    choiceRow.append(aCard, bCard);
    left.appendChild(choiceRow);

    // Picked plan row
    const picked = el("div", "pickedRow", `
      <div class="k">已選方案：</div>
      <div class="v" id="pickedPlan">尚未選擇</div>
    `);
    left.appendChild(picked);

    // Controls A
    const controlsA = el("div", "controls", "");
    controlsA.id = "controlsA";

    controlsA.appendChild(el("h3", "", "自由款設定"));

    const colorRow = el("div", "pillRow");
    FREE_COLORS.forEach((c) => {
      const b = el("button", "dotBtn", `<span class="dot" style="background:${c.css}"></span><span>${c.key}</span>`);
      b.onclick = () => {
        state.freeColor = c.key;
        saveState();
        renderPreview();
        refreshPills();
      };
      b.dataset.k = c.key;
      colorRow.appendChild(b);
    });
    controlsA.appendChild(el("div", "label", "顏色"));
    controlsA.appendChild(colorRow);

    const headerRow = el("div", "pillRow");
    FREE_HEADERS.forEach((h) => {
      const b = el("button", "pill", h.key);
      b.onclick = () => {
        state.freeHeader = h.key;
        saveState();
        renderPreview();
        refreshPills();
      };
      b.dataset.k = h.key;
      headerRow.appendChild(b);
    });
    controlsA.appendChild(el("div", "label", "頭像版型"));
    controlsA.appendChild(headerRow);

    const paperRow = el("div", "pillRow");
    PAPERS.forEach((p) => {
      const b = el("button", "pill", p.key);
      b.onclick = () => {
        state.paper = p.key;
        saveState();
        renderPreview();
        refreshPills();
      };
      b.dataset.k = p.key;
      paperRow.appendChild(b);
    });
    controlsA.appendChild(el("div", "label", "紙感"));
    controlsA.appendChild(paperRow);

    controlsA.appendChild(el("div", "miniHint", "自由款：排版固定，只在頭像區變化。"));
    left.appendChild(controlsA);

    // Controls B
    const controlsB = el("div", "controls", "");
    controlsB.id = "controlsB";

    controlsB.appendChild(el("h3", "", "精品款設定"));

    const proColorRow = el("div", "pillRow");
    PRO_COLORS.forEach((c) => {
      const b = el(
        "button",
        "dotBtn",
        `<span class="dot" style="background:${c.css}"></span><span>${c.key}</span>`
      );
      b.onclick = () => {
        state.proColor = c.key;
        saveState();
        renderPreview();
        refreshPills();
      };
      b.dataset.k = c.key;
      proColorRow.appendChild(b);
    });
    controlsB.appendChild(el("div", "label", "七色"));
    controlsB.appendChild(proColorRow);

    const layoutRow = el("div", "pillRow");
    [1, 2, 3].forEach((i) => {
      const b = el("button", "pill", `排版 ${i}`);
      b.onclick = () => {
        state.proLayout = i;
        saveState();
        renderPreview();
        refreshPills();
      };
      b.dataset.k = String(i);
      layoutRow.appendChild(b);
    });
    controlsB.appendChild(el("div", "label", "排版（預留）"));
    controlsB.appendChild(layoutRow);

    controlsB.appendChild(el("div", "miniHint", "精品：玻璃感更明顯；排版 2/3 先預留。"));
    left.appendChild(controlsB);

    // Right: preview
    const right = el("div", "panel");
    right.appendChild(el("h2", "", "成品預覽"));
    right.querySelector("h2").id = "previewTitle";

    const previewWrap = el("div", "previewWrap");
    previewWrap.id = "previewWrap";

    const foot = el("div", "footer", `
      <div class="v">Front v${VERSION}</div>
      <div class="c">© Angel Smart Card</div>
      <div class="adminHint" title="reserved">admin</div>
    `);

    right.append(previewWrap, foot);

    grid.append(left, right);
    wrap.appendChild(grid);
    host.appendChild(wrap);

    // after mount
    refreshChoiceUI();
    refreshPills();
    renderPreview();
  }

  function refreshPills() {
    // Free
    const a = $("#controlsA");
    if (a) {
      a.querySelectorAll(".dotBtn").forEach((b) => {
        b.classList.toggle("on", b.dataset.k === state.freeColor);
      });
      a.querySelectorAll(".pill").forEach((b) => {
        b.classList.toggle("on", b.dataset.k === state.freeHeader || b.dataset.k === state.paper);
      });
    }
    // Pro
    const b = $("#controlsB");
    if (b) {
      b.querySelectorAll(".dotBtn").forEach((x) => x.classList.toggle("on", x.dataset.k === state.proColor));
      b.querySelectorAll(".pill").forEach((x) => x.classList.toggle("on", x.dataset.k === String(state.proLayout)));
    }
  }

  // ===== Preview Renderer =====
  function renderPreview() {
    const wrap = $("#previewWrap");
    if (!wrap) return;

    const d = state.data;

    // skeleton / loading
    if (!d) {
      wrap.innerHTML = `
        <div class="card skeleton">
          <div class="skHead"></div>
          <div class="skBody"></div>
        </div>
      `;
      return;
    }

    // pick theme
    const freeColor = FREE_COLORS.find((x) => x.key === state.freeColor) || FREE_COLORS[1];
    const freeHeader = FREE_HEADERS.find((x) => x.key === state.freeHeader) || FREE_HEADERS[0];
    const paper = PAPERS.find((x) => x.key === state.paper) || PAPERS[0];

    const proColor = PRO_COLORS.find((x) => x.key === state.proColor) || PRO_COLORS[0];
    const proLayout = state.proLayout || 1;

    const plan = state.plan || "A"; // default preview as A if not chosen
    const isPro = plan === "B";

    const headerShapeCls = isPro ? "spotlight" : freeHeader.cls;
    const headerBg = isPro ? proColor.css : freeColor.css;

    const paperCls = isPro ? "proPaper" : paper.cls;
    const glassCls = isPro ? "glassStrong" : "glassSoft";

    const avatar = d.avatarUrl
      ? `<img class="avatarImg" src="${escapeHtmlAttr(d.avatarUrl)}" alt="avatar" loading="lazy" />`
      : `<div class="avatarFallback">No Photo</div>`;

    const tags = (d.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    const addrLink = d.address ? toMapsLink(d.address) : "";
    const addr = d.address
      ? `<a class="linkRow" href="${escapeHtmlAttr(addrLink)}" target="_blank" rel="noopener">
           <span class="ico">📍</span><span class="txt">${escapeHtml(d.address)}</span>
         </a>`
      : "";

    const phone = d.phone
      ? `<a class="linkRow" href="tel:${escapeHtmlAttr(d.phone)}"><span class="ico">📞</span><span class="txt">${escapeHtml(d.phone)}</span></a>`
      : "";
    const email = d.email
      ? `<a class="linkRow" href="mailto:${escapeHtmlAttr(d.email)}"><span class="ico">✉️</span><span class="txt">${escapeHtml(d.email)}</span></a>`
      : "";
    const line = d.line
      ? `<div class="linkRow"><span class="ico">💬</span><span class="txt">${escapeHtml(d.line)}</span></div>`
      : "";
    const web = d.website
      ? `<a class="linkRow" href="${escapeHtmlAttr(d.website)}" target="_blank" rel="noopener">
          <span class="ico">🔗</span><span class="txt">${escapeHtml(d.website)}</span>
         </a>`
      : "";

    const service = d.service ? `<div class="block"><div class="blockT">服務</div><div class="blockC">${toLines(d.service)}</div></div>` : "";
    const honors = d.honors ? `<div class="block"><div class="blockT">頭銜</div><div class="blockC">${toLines(d.honors)}</div></div>` : "";

    const products = [d.p1, d.p2, d.p3].filter(Boolean);
    const productHtml =
      products.length > 0
        ? `<div class="block">
             <div class="blockT">作品 / 產品</div>
             <div class="gallery">
               ${products
                 .map(
                   (src) =>
                     `<div class="gItem"><img src="${escapeHtmlAttr(src)}" alt="product" loading="lazy"/></div>`
                 )
                 .join("")}
             </div>
           </div>`
        : "";

    // layout reserve for Pro
    const proLayoutCls = isPro ? `proLayout${proLayout}` : "";

    wrap.innerHTML = `
      <div class="card ${paperCls} ${glassCls} ${proLayoutCls}">
        <div class="header ${headerShapeCls}" style="background:${headerBg}">
          <div class="org">${escapeHtml(d.org || "")}</div>
          <div class="avatarRing">${avatar}</div>
          <div class="shine"></div>
        </div>

        <div class="body">
          <div class="nameRow">
            <div class="name">${escapeHtml(d.name || "")}</div>
            ${isPro ? `<div class="badge">精品</div>` : `<div class="badge soft">自由</div>`}
          </div>
          ${d.slogan ? `<div class="slogan">${escapeHtml(d.slogan)}</div>` : ""}

          ${tags ? `<div class="tags">${tags}</div>` : ""}

          <div class="links">
            ${phone}${email}${line}${web}${addr}
          </div>

          ${service}
          ${honors}
          ${productHtml}
        </div>
      </div>
    `;
  }

  function toLines(s) {
    return escapeHtml(String(s)).replace(/\n/g, "<br/>");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  function escapeHtmlAttr(s) {
    return escapeHtml(s).replaceAll("`", "&#96;");
  }

  // ===== Init =====
  async function init() {
    loadState();
    mount();

    try {
      const data = await fetchPublic();
      state.data = data;
      renderPreview();
    } catch (e) {
      const wrap = $("#previewWrap");
      if (wrap) {
        wrap.innerHTML = `
          <div class="errorBox">
            <div class="t">資料讀取失敗</div>
            <div class="d">${escapeHtml(String(e && e.message ? e.message : e))}</div>
            <button class="btn primary" id="retryBtn">重試</button>
          </div>
        `;
        $("#retryBtn").onclick = () => location.reload();
      }
      console.error(e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();