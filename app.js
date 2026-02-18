/**
 * Angel Card Frontend v377.1 (Complete Overwrite)
 * - Ultra-robust fetch:
 *   1) ?action=card
 *   2) ?action=public
 *   3) ?action=list
 *   4) no action
 * - Accept multiple response shapes:
 *   {ok, card}
 *   {ok, data}
 *   {ok, rows, headers}
 *   {data} / {rows}
 * - Auto-pick "小天使/TW0001" row if list-style
 * - ✅ Fix "抓到但不顯示": Google Drive image URL direct conversion
 * - ✅ Better sample row picking (supports row.id / row.name)
 * - ✅ img.onerror fallback to avoid broken avatar
 */

const VERSION = 377.1;
const API_URL =
  "https://script.google.com/macros/s/AKfycby74ta4CUFzkWcEfyPfoOMV9K93f-sIUzAxP6yECiadpVEzFUmk_JiHCFG_s2-ePHvJ/exec";

// sample row id/name candidates
const SAMPLE_ID_CANDIDATES = ["TW0001", "小天使"];

const state = {
  plan: "free",
  theme: "arch",
  freeColor: "blue",
  paper: "cotton",
  proColor: "deepSeaBlue",
  dataRaw: null,
  card: null,
};

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $ = (sel, root = document) => root.querySelector(sel);

function normalize(v) {
  return v == null ? "" : String(v).trim();
}

/** ✅ tolerant URL normalize + Google Drive image direct */
function safeUrl(u) {
  let s = normalize(u);
  if (!s) return "";

  // trim quotes / spaces
  s = s.replace(/^["']|["']$/g, "").trim();

  // If user pasted just domain/path
  if (/^www\./i.test(s)) s = "https://" + s;

  // common link shortforms
  if (/^line\.me\//i.test(s)) s = "https://" + s;
  if (/^lin\.ee\//i.test(s)) s = "https://" + s;
  if (/^t\.me\//i.test(s)) s = "https://" + s;

  // mail/tel/line schemes
  if (/^mailto:/i.test(s) || /^tel:/i.test(s) || /^line:/i.test(s)) return s;

  // must be http(s) after this point
  if (!/^https?:\/\//i.test(s)) return "";

  // ✅ Google Drive: open?id=FILE_ID  -> uc?export=view&id=FILE_ID
  let m = s.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // ✅ Google Drive: file/d/FILE_ID/... -> uc?export=view&id=FILE_ID
  m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // ✅ Google Drive: uc?id=FILE_ID -> uc?export=view&id=FILE_ID
  m = s.match(/drive\.google\.com\/uc\?(.+)/i);
  if (m) {
    const idm = s.match(/[?&]id=([^&]+)/i);
    if (idm) return `https://drive.google.com/uc?export=view&id=${idm[1]}`;
  }

  return s;
}

function splitMulti_(v) {
  const s = normalize(v);
  if (!s) return [];
  return s
    .split(/\n|\r|,\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** pickField_: find first non-empty value by matching header keys */
function pickField_(row, testers) {
  if (!row) return "";
  const keys = Object.keys(row);
  for (const t of testers) {
    for (const k of keys) {
      try {
        if (typeof t === "string") {
          if (k === t) {
            const val = row[k];
            if (val != null && normalize(val) !== "") return val;
          }
        } else if (t instanceof RegExp) {
          if (t.test(k)) {
            const val = row[k];
            if (val != null && normalize(val) !== "") return val;
          }
        } else if (typeof t === "function") {
          if (t(k)) {
            const val = row[k];
            if (val != null && normalize(val) !== "") return val;
          }
        }
      } catch (e) {}
    }
  }
  return "";
}

/** Address -> map url */
function toMapUrlFromAddress(addr) {
  const a = normalize(addr);
  if (!a) return "";
  if (/^https?:\/\//i.test(a)) return a;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    a
  )}`;
}

/** Map sheet row (Chinese headers) -> UI card (fallback only) */
function mapRowToCard_(row) {
  const name = pickField_(row, [/姓名/, /暱稱/, /稱呼/]) || normalize(row.name);
  const title =
    pickField_(row, [/重要頭銜/, /頭銜/, /職稱/, /身份/]) || normalize(row.title);
  const org =
    pickField_(row, [/單位名稱/, /單位/, /機構/, /品牌/]) || normalize(row.org);

  const oneLine = pickField_(row, [
    /一句話定位/,
    /理念標語/,
    /標語/,
    /定位/,
    /一句話/,
    /你想服務誰/,
    /我想服務誰/,
  ]);

  const tagsRaw = pickField_(row, [/服務項目/, /關鍵字/, /標籤/]);
  const tags = splitMulti_(tagsRaw).slice(0, 6);

  const photo = safeUrl(
    pickField_(row, [/個人專業形象照/, /形象照/, /頭像/, /主圖/]) ||
      row.photo ||
      row.avatar
  );
  const note =
    pickField_(row, [/備註/, /補充說明/, /簡介/, /自我介紹/]) ||
    normalize(row.note || "");

  const lineOA = safeUrl(
    pickField_(row, [
      /LINE\s*官方帳號連結/,
      /LINE.*官方/,
      /官方帳號/,
      /LINE\s*OA/,
    ]) ||
      row.lineOA ||
      row.line_oa ||
      row.line
  );

  const site = safeUrl(
    pickField_(row, [/官網/, /網站/, /首頁/, /概念館/, /入口/]) ||
      row.site ||
      row.home
  );

  const form = safeUrl(
    pickField_(row, [/表單/, /訂製表單/, /預約表單/, /填表/, /Google\s*Form/]) ||
      row.form ||
      row.orderForm
  );

  const v1 = safeUrl(pickField_(row, [/影音平台\s*1/, /YouTube/]) || "");
  const v2 = safeUrl(pickField_(row, [/影音平台\s*2/, /抖音/, /TikTok/]) || "");
  const v3 = pickField_(row, [/影音平台\s*3/, /地址/, /地點/]) || "";

  const s1 = safeUrl(pickField_(row, [/社群平台\s*1/, /Facebook/]) || "");
  const s2 = safeUrl(pickField_(row, [/社群平台\s*2/, /Instagram/]) || "");
  const s3 = safeUrl(pickField_(row, [/社群平台\s*3/, /Thread/, /部落格/]) || "");

  let address = "";
  let link3 = "";
  const v3n = normalize(v3);
  if (v3n && !/^https?:\/\//i.test(v3n)) address = v3n;
  else link3 = safeUrl(v3n);

  const links = [v1, v2, link3, s1, s2, s3].filter(Boolean).slice(0, 6);

  return {
    name,
    title,
    org,
    oneLine,
    tags,
    photo,
    note,
    lineOA,
    site,
    form,
    address,
    mapUrl: toMapUrlFromAddress(address),
    links,
  };
}

/** ---------- Ultra-robust fetch ---------- */

async function fetchJson_(url) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `JSON parse failed. url=${url}\n${text.slice(0, 200)}`
    );
  }
}

/** Turn list-style {headers, rows} into array of objects */
function rowsToObjects_(headers, rows) {
  if (!Array.isArray(headers) || !Array.isArray(rows)) return [];
  return rows.map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r && r[i] != null ? r[i] : "";
    });
    return obj;
  });
}

/** ✅ select sample row by id/name heuristics (supports row.id / row.name) */
function pickSampleRow_(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;

  const hit = arr.find((row) => {
    const id =
      normalize(pickField_(row, [/編號/, /^id$/i, /ID/])) || normalize(row.id);
    const name =
      normalize(pickField_(row, [/姓名/, /暱稱/, /稱呼/])) || normalize(row.name);
    return (
      SAMPLE_ID_CANDIDATES.includes(id) || SAMPLE_ID_CANDIDATES.includes(name)
    );
  });

  return hit || arr[0];
}

/** Normalize any response to:
 * - { mode:"card", payload: cardObj }
 * - { mode:"row",  payload: rowObj }   (Chinese headers row OR mixed)
 */
function normalizeApiResponse_(json) {
  if (!json) return null;

  const ok = json.ok === undefined ? true : !!json.ok;
  if (!ok) return null;

  if (json.card && typeof json.card === "object") {
    return { mode: "card", payload: json.card, raw: json };
  }

  if (json.data && typeof json.data === "object" && !Array.isArray(json.data)) {
    return { mode: "row", payload: json.data, raw: json };
  }

  if (Array.isArray(json.data)) {
    const row = pickSampleRow_(json.data);
    if (row) return { mode: "row", payload: row, raw: json };
  }

  if (Array.isArray(json.headers) && Array.isArray(json.rows)) {
    const arr = rowsToObjects_(json.headers, json.rows);
    const row = pickSampleRow_(arr);
    if (row) return { mode: "row", payload: row, raw: json };
  }

  if (Array.isArray(json.rows) && json.rows.length && typeof json.rows[0] === "object") {
    const row = pickSampleRow_(json.rows);
    if (row) return { mode: "row", payload: row, raw: json };
  }

  if (
    typeof json === "object" &&
    !Array.isArray(json) &&
    (json.name || json.lineOA || json.site || json.form || json.tagline)
  ) {
    return { mode: "card", payload: json, raw: json };
  }

  return null;
}

async function fetchCardPreferred() {
  const tries = [
    API_URL + "?action=card",
    API_URL + "?action=public",
    API_URL + "?action=list",
    API_URL,
  ];

  const errors = [];

  for (const url of tries) {
    try {
      const json = await fetchJson_(url);
      const norm = normalizeApiResponse_(json);
      if (norm) return norm;
      errors.push(`no usable payload: ${url}`);
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }

  throw new Error("All fetch attempts failed:\n" + errors.join("\n---\n"));
}

/** ---------- Visual state ---------- */

function applyVisualState() {
  const app = $("#app");
  const preview = $("#preview");

  if (app) {
    app.dataset.plan = state.plan;
    app.dataset.theme = state.theme;

    if (state.plan === "free") {
      app.dataset.freeColor = state.freeColor;
      app.dataset.paper = state.paper;
      app.removeAttribute("data-pro-color");
      app.classList.remove(
        "fx-glow",
        "fx-rounded",
        "fx-float",
        "fx-glass",
        "fx-stage",
        "fx-magazine"
      );
    } else {
      app.dataset.proColor = state.proColor;
      app.removeAttribute("data-free-color");
      app.removeAttribute("data-paper");
    }
  }

  if (preview) preview.dataset.theme = state.theme;
}

function applyPremiumPack() {
  const app = $("#app");
  if (app) {
    [
      "fx-glow",
      "fx-rounded",
      "fx-float",
      "fx-glass",
      "fx-stage",
      "fx-magazine",
    ].forEach((c) => app.classList.remove(c));
  }

  const map = {
    deepSeaBlue: { theme: "arch", fx: ["fx-glow", "fx-stage"] },
    creamyMist: { theme: "flat", fx: ["fx-rounded", "fx-magazine"] },
    graphiteGray: { theme: "flat", fx: ["fx-float"] },
    mistPurpleGray: { theme: "dawn", fx: ["fx-glow"] },
    caramelBrown: { theme: "arch", fx: ["fx-rounded", "fx-magazine"] },
    inkGreen: { theme: "dawn", fx: ["fx-glow", "fx-glass"] },
    warmGrayBlue: { theme: "flat", fx: ["fx-float", "fx-glass"] },
  };

  const pack = map[state.proColor] || map.deepSeaBlue;
  state.theme = pack.theme;

  if (app) {
    app.dataset.theme = state.theme;
    pack.fx.forEach((c) => app.classList.add(c));
  }

  const preview = $("#preview");
  if (preview) preview.dataset.theme = state.theme;

  $$(".seg__btn[data-theme]").forEach((b) => {
    b.classList.toggle("is-on", b.dataset.theme === state.theme);
  });
}

/** ---------- Render ---------- */

function renderCard() {
  const o = state.card || {};

  const pname = $("#pname");
  if (pname) pname.textContent = normalize(o.name) || "—";

  const ptitle = $("#ptitle");
  if (ptitle) {
    const t = [normalize(o.title), normalize(o.org)]
      .filter(Boolean)
      .join("｜");
    ptitle.textContent = t || "—";
  }

  const ptags = $("#ptags");
  if (ptags) {
    ptags.innerHTML = (o.tags || [])
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");
  }

  const pone = $("#pone");
  if (pone) pone.textContent = normalize(o.oneLine) || "—";

  const img = $("#avatarImg");
  const fb = $("#avatarFallback");

  if (img) {
    img.onerror = () => {
      img.removeAttribute("src");
      img.style.display = "none";
      if (fb) fb.style.display = "";
    };

    const u = normalize(o.photo);
    if (u) {
      img.src = u;
      img.style.display = "";
      if (fb) fb.style.display = "none";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
      if (fb) fb.style.display = "";
    }
  }

  const btnLine = $("#btnLine");
  if (btnLine) {
    if (o.lineOA) {
      btnLine.href = o.lineOA;
      btnLine.style.display = "";
    } else btnLine.style.display = "none";
  }

  const btnSite = $("#btnSite");
  if (btnSite) {
    if (o.site) {
      btnSite.href = o.site;
      btnSite.style.display = "";
    } else btnSite.style.display = "none";
  }

  const btnForm = $("#btnForm");
  if (btnForm) {
    if (o.form) {
      btnForm.href = o.form;
      btnForm.style.display = "";
    } else btnForm.style.display = "none";
  }

  const btnMap = $("#btnMap");
  if (btnMap) {
    if (o.mapUrl) {
      btnMap.style.display = "";
      btnMap.onclick = () => window.open(o.mapUrl, "_blank", "noopener");
    } else {
      btnMap.style.display = "none";
      btnMap.onclick = null;
    }
  }

  const platforms = $("#platforms");
  if (platforms) {
    const links = (o.links || []).filter(Boolean).slice(0, 6);
    platforms.innerHTML = links
      .map((url, i) => {
        const label = i < 3 ? `影音 ${i + 1}` : `社群 ${i - 2}`;
        return `<a class="linkchip" href="${escapeAttr(
          url
        )}" target="_blank" rel="noopener">${label}</a>`;
      })
      .join("");
  }

  const pnote = $("#pnote");
  if (pnote) pnote.textContent = normalize(o.note) || "";
}

/** Copy */
function bindCopy() {
  const btn = $("#btnCopy");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const o = state.card || {};
    const lines = [
      normalize(o.name),
      normalize(o.oneLine),
      o.lineOA ? `LINE OA：${o.lineOA}` : "",
      o.site ? `官網：${o.site}` : "",
      o.form ? `填表：${o.form}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(lines);
      btn.classList.add("is-copied");
      setTimeout(() => btn.classList.remove("is-copied"), 900);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = lines;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  });
}

/** Delegated controls */
function bindDelegatedControls() {
  document.addEventListener(
    "click",
    (ev) => {
      const planBtn = ev.target.closest(".seg__btn[data-plan]");
      if (planBtn) {
        state.plan = planBtn.dataset.plan;
        $$(".seg__btn[data-plan]").forEach((b) =>
          b.classList.toggle("is-on", b === planBtn)
        );
        if (state.plan === "pro") applyPremiumPack();
        applyVisualState();
        renderCard();
        return;
      }

      const themeBtn = ev.target.closest(".seg__btn[data-theme]");
      if (themeBtn) {
        if (state.plan !== "free") return;
        state.theme = themeBtn.dataset.theme;
        $$(".seg__btn[data-theme]").forEach((b) =>
          b.classList.toggle("is-on", b === themeBtn)
        );
        applyVisualState();
        return;
      }

      const freeColorBtn = ev.target.closest(".sw[data-free-color]");
      if (freeColorBtn) {
        state.freeColor = freeColorBtn.dataset.freeColor;
        $$(".sw[data-free-color]").forEach((b) =>
          b.classList.toggle("is-on", b === freeColorBtn)
        );
        applyVisualState();
        return;
      }

      const paperBtn = ev.target.closest(".chip[data-paper]");
      if (paperBtn) {
        state.paper = paperBtn.dataset.paper;
        $$(".chip[data-paper]").forEach((b) =>
          b.classList.toggle("is-on", b === paperBtn)
        );
        applyVisualState();
        return;
      }

      const proColorBtn = ev.target.closest(".sw[data-pro-color]");
      if (proColorBtn) {
        state.proColor = proColorBtn.dataset.proColor;
        $$(".sw[data-pro-color]").forEach((b) =>
          b.classList.toggle("is-on", b === proColorBtn)
        );
        applyPremiumPack();
        applyVisualState();
        return;
      }
    },
    true
  );
}

/** Hidden admin tap */
function bindHiddenAdmin() {
  const el = $("#versionTap");
  if (!el) return;
  let taps = 0;
  let t0 = 0;
  el.addEventListener("click", () => {
    const now = Date.now();
    if (now - t0 > 1500) taps = 0;
    t0 = now;
    taps += 1;
    if (taps >= 7) {
      taps = 0;
      location.href = "./admin.html";
    }
  });
}

/** Utilities */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/** Init */
async function init() {
  const app = $("#app");
  if (app) {
    state.plan = app.dataset.plan || state.plan;
    state.theme = app.dataset.theme || state.theme;
    state.freeColor = app.dataset.freeColor || state.freeColor;
    state.paper = app.dataset.paper || state.paper;
    state.proColor = app.dataset.proColor || state.proColor;
  }

  applyVisualState();
  bindDelegatedControls();
  bindHiddenAdmin();
  bindCopy();

  const hint = $("#hint");

  try {
    if (hint) hint.textContent = "門面資料讀取中…（試算表：小天使）";

    const got = await fetchCardPreferred();
    state.dataRaw = got.payload;

    if (got.mode === "card") {
      const c = got.payload || {};
      state.card = {
        name: normalize(c.name),
        org: normalize(c.org),
        title: normalize(c.titles || c.title || ""),
        oneLine: normalize(c.tagline || c.oneLine || ""),
        tags: splitMulti_(c.services || "").slice(0, 6),
        photo: safeUrl(c.photo),
        note: normalize(c.note || ""),
        lineOA: safeUrl(c.lineOA || c.line_oa || ""),
        site: safeUrl(c.site || c.home || ""),
        form: safeUrl(c.form || c.orderForm || ""),
        address: normalize(c.address || ""),
        mapUrl: toMapUrlFromAddress(c.address || ""),
        links: (c.links || []).map(safeUrl).filter(Boolean).slice(0, 6),
      };
    } else {
      // row mode (Chinese headers / mixed)
      state.card = mapRowToCard_(state.dataRaw);
    }

    renderCard();
    if (hint) hint.textContent = "門面資料已載入（樣版＝小天使）";
  } catch (e) {
    console.error(e);
    if (hint) hint.textContent = "門面讀取失敗（請開 F12 Console 看錯誤）";
  }
}

document.addEventListener("DOMContentLoaded", init);
