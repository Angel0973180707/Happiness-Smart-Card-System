/* ==========================================
 * HSC Admin Workspace — admin.js v522.1
 * COMPLETE OVERWRITE
 *
 * Goal:
 * 1) TW0001 一定找得到
 * 2) 支援 name / phone / unit / title 模糊搜尋
 * 3) 相容多版 GAS action：
 *    - card (for exact id)
 *    - adminSearch
 *    - adminFind
 *    - searchCards
 *    - findCards
 * 4) 手機優先、穩定、只用 GET
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "522.1";
  const DEFAULT_GAS = "";
  const DEFAULT_BASE_URL = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";

  const $ = (id) => document.getElementById(id);

  const el = {
    gasUrl: $("gasUrl"),
    keyword: $("keyword"),
    btnSearch: $("btnSearch"),
    btnPing: $("btnPing"),
    status: $("status"),
    resultList: $("resultList"),
    ver: $("ver")
  };

  const state = {
    busy: false
  };

  boot();

  function boot() {
    if (el.ver) el.ver.textContent = `v${VERSION}`;

    if (el.gasUrl) {
      el.gasUrl.value = (localStorage.getItem("HSC_ADMIN_GAS_URL") || DEFAULT_GAS || "").trim();
      el.gasUrl.addEventListener("change", () => {
        localStorage.setItem("HSC_ADMIN_GAS_URL", (el.gasUrl.value || "").trim());
      });
    }

    if (el.btnPing) el.btnPing.addEventListener("click", onPing);
    if (el.btnSearch) el.btnSearch.addEventListener("click", onSearch);

    if (el.keyword) {
      el.keyword.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") onSearch();
      });
    }

    setStatus(`HSC Admin v${VERSION} 已就緒`);
    renderEmpty("請輸入 ID、姓名、電話、單位或職稱");
  }

  function gasUrl() {
    const url = String(el.gasUrl?.value || "").trim();
    if (!url) throw new Error("請先填入 GAS /exec URL");
    return url;
  }

  function setBusy(on) {
    state.busy = !!on;
    if (el.btnSearch) el.btnSearch.disabled = on;
    if (el.btnPing) el.btnPing.disabled = on;
  }

  function setStatus(text) {
    if (el.status) el.status.textContent = String(text || "");
  }

  function appendStatus(text) {
    if (!el.status) return;
    const prev = el.status.textContent || "";
    el.status.textContent = prev ? `${prev}\n${text}` : text;
  }

  function renderEmpty(msg = "尚未查詢") {
    if (!el.resultList) return;
    el.resultList.innerHTML = `<div class="empty">${escapeHtml(msg)}</div>`;
  }

  function renderError(msg) {
    if (!el.resultList) return;
    el.resultList.innerHTML = `
      <div class="empty" style="
        border-style:solid;
        border-color:rgba(251,113,133,.35);
        color:#ffd7df;
        background:rgba(251,113,133,.08);
      ">❌ ${escapeHtml(msg)}</div>
    `;
  }

  function renderItems(items) {
    if (!el.resultList) return;

    if (!items || !items.length) {
      renderEmpty("查無資料");
      return;
    }

    el.resultList.innerHTML = items.map(cardHtml).join("");
    bindResultActions();
  }

  function cardHtml(item) {
    const id = safe(item.id);
    const status = safe(item.status);
    const tenant = safe(item.tenant);
    const name = safe(item.name);
    const unit = safe(item.unit);
    const title = safe(item.title);
    const phone = safe(item.phone);
    const email = safe(item.email);
    const lineOa = safe(item.line_oa);
    const updatedAt = safe(item.updated_at);
    const plan = safe(item.plan);
    const color = safe(item.color || item.free_color);
    const style = safe(item.style || item.free_style);
    const paper = safe(item.paper || item.free_paper);
    const premiumColor = safe(item.premium_color);

    return `
      <div class="resultCard">
        <div class="resultHead">
          <div class="resultId">${escapeHtml(id || "-")}</div>
          <div class="badge">${escapeHtml(status || "-")}</div>
        </div>

        <div class="resultName">${escapeHtml(name || "未填姓名")}</div>
        <div class="resultSub">
          ${escapeHtml(unit || "-")}${title ? "｜" + escapeHtml(title) : ""}
        </div>

        <div class="gridInfo">
          <div class="infoLine"><strong>tenant：</strong>${escapeHtml(tenant || "-")}</div>
          <div class="infoLine"><strong>電話：</strong>${escapeHtml(phone || "-")}</div>
          <div class="infoLine"><strong>Email：</strong>${escapeHtml(email || "-")}</div>
          <div class="infoLine"><strong>LINE OA：</strong>${escapeHtml(lineOa || "-")}</div>
          <div class="infoLine"><strong>方案：</strong>${escapeHtml(plan || "-")}</div>
          <div class="infoLine"><strong>自由款：</strong>${escapeHtml([color, style, paper].filter(Boolean).join(" / ") || "-")}</div>
          <div class="infoLine"><strong>精品色：</strong>${escapeHtml(premiumColor || "-")}</div>
          <div class="infoLine"><strong>更新時間：</strong>${escapeHtml(updatedAt || "-")}</div>
        </div>

        <div class="resultActions">
          <button type="button" class="secondary hsc-copy-id" data-id="${escapeHtmlAttr(id)}">複製 ID</button>
          <button type="button" class="hsc-open-card" data-id="${escapeHtmlAttr(id)}">打開成品</button>
          <button type="button" class="ghost hsc-open-card-json" data-id="${escapeHtmlAttr(id)}">看 card JSON</button>
        </div>
      </div>
    `;
  }

  function bindResultActions() {
    if (!el.resultList) return;

    el.resultList.querySelectorAll(".hsc-copy-id").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id || "";
        try {
          await navigator.clipboard.writeText(id);
          appendStatus(`已複製 ID：${id}`);
        } catch {
          appendStatus(`請手動複製 ID：${id}`);
        }
      });
    });

    el.resultList.querySelectorAll(".hsc-open-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id || "";
        if (!id) return;
        const url = `${guessBaseUrl()}?id=${encodeURIComponent(id)}`;
        window.open(url, "_blank");
      });
    });

    el.resultList.querySelectorAll(".hsc-open-card-json").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id || "";
        if (!id) return;
        const url = `${gasUrl()}?action=card&id=${encodeURIComponent(id)}`;
        window.open(url, "_blank");
      });
    });
  }

  async function onPing() {
    if (state.busy) return;

    try {
      setBusy(true);
      setStatus("正在測試 GAS 連線…");
      const url = `${gasUrl()}?action=ping`;
      const j = await fetchJson(url);
      setStatus("✅ 連線成功\n" + pretty(j));
    } catch (err) {
      setStatus("❌ 連線失敗： " + String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function onSearch() {
    if (state.busy) return;

    const kw = String(el.keyword?.value || "").trim();
    if (!kw) {
      setStatus("請輸入搜尋關鍵字");
      renderEmpty("請輸入 ID、姓名、電話、單位或職稱");
      return;
    }

    try {
      setBusy(true);
      setStatus(`搜尋中：${kw}`);

      // 1) 如果像 TW0001，先直接用 card 精準查
      if (looksLikeCardId(kw)) {
        appendStatus("先用 action=card 精準查詢…");
        const exact = await tryExactCardById(kw);
        if (exact) {
          renderItems([exact]);
          appendStatus("✅ 已用 card 精準找到");
          return;
        }
        appendStatus("card 精準查詢沒找到，改試關鍵字搜尋…");
      }

      // 2) 關鍵字搜尋，多 action 依序嘗試
      const items = await trySearchActions(kw);

      if (items.length) {
        renderItems(items);
        appendStatus(`✅ 找到 ${items.length} 筆`);
      } else {
        renderEmpty(`查無資料：${kw}`);
        appendStatus("查無資料");
      }
    } catch (err) {
      renderError(String(err?.message || err));
      appendStatus("搜尋失敗");
    } finally {
      setBusy(false);
    }
  }

  async function tryExactCardById(id) {
    const url = `${gasUrl()}?action=card&id=${encodeURIComponent(id)}`;
    try {
      const j = await fetchJson(url);
      if (j?.ok && j?.item && safe(j.item.id)) return normalizeItem(j.item);
      return null;
    } catch {
      return null;
    }
  }

  async function trySearchActions(keyword) {
    const actions = ["adminSearch", "adminFind", "searchCards", "findCards"];
    const unique = new Map();

    for (const action of actions) {
      appendStatus(`嘗試 ${action} …`);

      const candidates = [
        `${gasUrl()}?action=${action}&q=${encodeURIComponent(keyword)}`,
        `${gasUrl()}?action=${action}&keyword=${encodeURIComponent(keyword)}`,
        `${gasUrl()}?action=${action}&query=${encodeURIComponent(keyword)}`,
        `${gasUrl()}?action=${action}&id=${encodeURIComponent(keyword)}`
      ];

      for (const url of candidates) {
        try {
          const j = await fetchJson(url);
          const items = extractItems(j);

          if (items.length) {
            for (const raw of items) {
              const item = normalizeItem(raw);
              const key = safe(item.id) || JSON.stringify(item);
              if (!unique.has(key)) unique.set(key, item);
            }
          }
        } catch {
          // 忽略單次錯誤，繼續試下一個
        }
      }

      if (unique.size) break;
    }

    // 3) 保底：若是 TWxxxx 但前面沒抓到，再補一次 card
    if (!unique.size && looksLikeCardId(keyword)) {
      const exact = await tryExactCardById(keyword);
      if (exact) unique.set(exact.id, exact);
    }

    return Array.from(unique.values());
  }

  function extractItems(j) {
    if (!j || typeof j !== "object") return [];

    if (Array.isArray(j.items)) return j.items;
    if (Array.isArray(j.list)) return j.list;
    if (Array.isArray(j.rows)) return j.rows;
    if (Array.isArray(j.data)) return j.data;

    if (j.ok && j.item && typeof j.item === "object") return [j.item];
    if (j.ok && j.data && typeof j.data === "object" && !Array.isArray(j.data)) return [j.data];

    return [];
  }

  function normalizeItem(raw) {
    const item = raw && typeof raw === "object" ? { ...raw } : {};

    if (!item.id && item.card_id) item.id = item.card_id;
    if (!item.name && item.姓名) item.name = item.姓名;
    if (!item.phone && item.電話) item.phone = item.電話;
    if (!item.unit && item.單位) item.unit = item.單位;
    if (!item.title && item.職稱) item.title = item.職稱;
    if (!item.tenant && item.brand) item.tenant = item.brand;

    return item;
  }

  function looksLikeCardId(v) {
    return /^TW\d+$/i.test(String(v || "").trim());
  }

  async function fetchJson(url) {
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await r.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`回傳不是 JSON：${text.slice(0, 200)}`);
    }

    return json;
  }

  function guessBaseUrl() {
    return DEFAULT_BASE_URL;
  }

  function safe(v) {
    return String(v || "").trim();
  }

  function pretty(v) {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeHtmlAttr(s) {
    return escapeHtml(s).replaceAll("`", "&#96;");
  }
})();