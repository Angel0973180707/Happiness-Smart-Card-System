/* ================================
 * wechat.js — v490 (COMPLETE OVERWRITE)
 * - Read GAS URL from window.WECHAT_CFG.GAS_URL (fallback to DEFAULT_GAS)
 * - Compatible with BOTH payload shapes:
 *   A) { ok:true, id:"TW0001", data:{...row...} }
 *   B) { ...row... }  (legacy direct row)
 * - Status gate: inactive => show "請聯繫客服開通"
 * - Prefer *_fast image fields (個人照_fast / Logo_fast / 照片_fast)
 * - Zoom button
 * - Unified Debug: long press brand 1.2s
 * - action=card fetch
 * ================================ */

(() => {
  const VERSION = 490;

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec";

  const CONFIG = {
    GAS: (window.WECHAT_CFG && window.WECHAT_CFG.GAS_URL) ? String(window.WECHAT_CFG.GAS_URL).trim() : DEFAULT_GAS,
    DEFAULT_ID: "TW0001",
    LONGPRESS_MS: 1200
  };

  // p1~p7 background map (stable for WeChat)
  const P_BG = {
    p1: "radial-gradient(900px 700px at 15% 10%, rgba(255,140,165,.22), transparent 55%), #0b1220",
    p2: "radial-gradient(900px 700px at 15% 10%, rgba(160,35,60,.22), transparent 55%), #0b1220",
    p3: "radial-gradient(900px 700px at 15% 10%, rgba(70,125,255,.18), transparent 55%), #071025",
    p4: "radial-gradient(900px 700px at 15% 10%, rgba(190,140,255,.18), transparent 55%), #0b1220",
    p5: "radial-gradient(900px 700px at 15% 10%, rgba(145,165,190,.20), transparent 55%), #0b1220",
    p6: "radial-gradient(900px 700px at 15% 10%, rgba(255,210,120,.18), transparent 55%), #0b1220",
    p7: "radial-gradient(900px 700px at 15% 10%, rgba(120,90,70,.22), transparent 55%), #0b1220"
  };

  const el = (id) => document.getElementById(id);

  const brand = el("brand");
  const btnZoom = el("btnZoom");
  const panel = el("panel");
  const loading = el("loading");
  const card = el("card");

  const nameEl = el("name");
  const metaEl = el("meta");

  const secService = el("secService");
  const serviceEl = el("service");

  const secExp = el("secExp");
  const expEl = el("exp");

  const avImg = el("avImg");
  const avPh = el("avPh");

  const hint = el("hint");

  // Debug
  const dbg = el("dbg");
  const dbgMask = el("dbgMask");
  const dbgPre = el("dbgPre");
  const dbgClose = el("dbgClose");

  const state = {
    id: "",
    plan: "free",
    pcsf: { p: "", c: "", s: "", f: "" },
    gasUrl: "",
    fetchStatus: "loading",
    payloadMini: null,
    zoomed: false
  };

  function qs(key) {
    const v = new URLSearchParams(location.search).get(key);
    return v ? String(v).trim() : "";
  }
  function normalizeId(s) {
    if (!s) return "";
    return String(s).trim().toUpperCase();
  }
  function safeText(x) {
    if (x === null || x === undefined) return "";
    return String(x).trim();
  }

  // --- key normalize (keep Chinese headers usable) ---
  // Keep original keys AND provide normalized-lowercase keys.
  function normalizeKey(k) {
    return String(k || "")
      .trim()
      .replace(/^"+|"+$/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^\w\u4e00-\u9fff]+/g, "_")
      .toLowerCase();
  }
  function normalizeObjKeys(obj) {
    const out = {};
    if (!obj || typeof obj !== "object") return out;
    for (const [k, v] of Object.entries(obj)) {
      out[k] = v; // preserve original
      out[normalizeKey(k)] = v; // add normalized
    }
    return out;
  }

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      // allow original & normalized lookup
      if (k in obj && safeText(obj[k])) return safeText(obj[k]);
      const nk = normalizeKey(k);
      if (nk in obj && safeText(obj[nk])) return safeText(obj[nk]);
    }
    return fallback;
  }

  function parsePlan(obj) {
    const raw = pick(obj, ["plan", "plan_type", "package", "mode", "選擇名片製作方案"], "free").toLowerCase();
    if (raw.includes("premium") || raw.includes("pro") || raw.includes("精品") || raw.includes("b")) return "premium";
    return "free";
  }

  function parsePCSf(obj) {
    return {
      // premium bg code
      p: pick(obj, ["p", "p_code", "premium_bg", "bg_p", "選擇精品底色"], ""),
      // free color/style/paper
      c: pick(obj, ["c", "c_code", "color_c", "選擇名片顏色"], ""),
      s: pick(obj, ["s", "s_code", "style_s", "選擇版型風格"], ""),
      f: pick(obj, ["f", "f_code", "fiber_f", "選擇紙感質地"], "")
    };
  }

  function toBullets(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(safeText).filter(Boolean);
    const s = safeText(val);
    if (!s) return [];
    return s
      .split(/\r?\n|,|;|、|•|\u2022/g)
      .map((x) => safeText(x))
      .filter(Boolean);
  }

  function normalizeParagraph(val) {
    const s = safeText(val);
    if (!s) return "";
    return s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}$/);
      if (m) return JSON.parse(m[0]);
      throw new Error("Invalid JSON");
    }
  }

  function unwrapRowPayload(raw) {
    // Supports:
    // A) { ok:true, id, data:{...row...} }
    // B) {...row...} (legacy)
    if (!raw || typeof raw !== "object") return { ok: false, row: null, raw };
    if (raw.ok === false) return { ok: false, row: null, raw };
    if (raw.ok === true && raw.data && typeof raw.data === "object") return { ok: true, row: raw.data, raw };
    // If it looks like a row (has name/姓名 or id)
    const n = raw["姓名"] || raw.name || raw.id || raw["id"];
    if (n !== undefined) return { ok: true, row: raw, raw };
    return { ok: false, row: null, raw };
  }

  async function fetchCard(id) {
    const cid = normalizeId(id) || CONFIG.DEFAULT_ID;
    const base = CONFIG.GAS || DEFAULT_GAS;
    const url = `${base}?action=card&id=${encodeURIComponent(cid)}&v=${VERSION}&ts=${Date.now()}`;
    state.gasUrl = url;
    const raw = await fetchJson(url);
    return unwrapRowPayload(raw);
  }

  function setAvatar(url, name) {
    const u = safeText(url);
    avPh.textContent = (safeText(name) || "🙂").slice(0, 1);
    if (!u) {
      avImg.style.display = "none";
      return;
    }
    avImg.onload = () => (avImg.style.display = "block");
    avImg.onerror = () => (avImg.style.display = "none");
    avImg.src = u;
  }

  function applyBackground(pCode) {
    const p = (pCode || "").toLowerCase();
    const bg = P_BG[p] || "radial-gradient(900px 700px at 15% 10%, rgba(96,165,250,.18), transparent 55%), #0b1220";
    document.body.style.background = bg;
  }

  function showInactive(msgTop, msgBottom) {
    loading.style.display = "block";
    card.style.display = "none";
    loading.querySelector(".big").textContent = msgTop || "此名片尚未啟用";
    loading.querySelector(".small").textContent = msgBottom || "請聯繫客服開通";
  }

  function showCard() {
    loading.style.display = "none";
    card.style.display = "block";
  }

  // Debug
  function openDebug() {
    const info = {
      version: `v${VERSION}`,
      id: state.id,
      plan: state.plan,
      p: state.pcsf.p,
      c: state.pcsf.c,
      s: state.pcsf.s,
      f: state.pcsf.f,
      fetch: state.fetchStatus,
      gas_url: state.gasUrl,
      json: state.payloadMini
    };
    dbgPre.textContent = JSON.stringify(info, null, 2);
    dbgMask.style.display = "block";
    dbg.style.display = "block";
  }
  function closeDebug() {
    dbg.style.display = "none";
    dbgMask.style.display = "none";
  }
  function bindLongPress(node, ms, fn) {
    if (!node) return;
    let t = null;
    const start = () => {
      clearTimeout(t);
      t = setTimeout(() => fn(), ms);
    };
    const end = () => clearTimeout(t);

    node.addEventListener("touchstart", start, { passive: true });
    node.addEventListener("touchend", end);
    node.addEventListener("touchcancel", end);
    node.addEventListener("mousedown", start);
    node.addEventListener("mouseup", end);
    node.addEventListener("mouseleave", end);
  }

  function miniPayloadForDebug(raw, row) {
    const obj = normalizeObjKeys(row || raw || {});
    return {
      ok: !!raw,
      id: pick(obj, ["id", "ID", "名片ID"], ""),
      name: pick(obj, ["姓名", "name", "fullname", "u_name"], ""),
      status: pick(obj, ["status", "狀態"], ""),
      plan: parsePlan(obj),
      p: pick(obj, ["p", "p_code", "選擇精品底色"], ""),
      avatar: pick(obj, ["個人照_fast","個人照","avatar_fast","avatar_img","avatar"], ""),
      service: pick(obj, ["服務項目","service","services","u_service"], ""),
      exp: pick(obj, ["經歷","experience","exp","u_exp"], "")
    };
  }

  function setZoom(on) {
    state.zoomed = on;
    panel.style.transformOrigin = "top center";
    panel.style.transform = on ? "scale(1.15)" : "scale(1)";
    panel.style.transition = "transform .18s ease-out";
    btnZoom.textContent = on ? "縮小" : "放大";
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function boot() {
    state.id = normalizeId(qs("id")) || CONFIG.DEFAULT_ID;

    bindLongPress(brand, CONFIG.LONGPRESS_MS, openDebug);
    if (dbgClose) dbgClose.addEventListener("click", closeDebug);
    if (dbgMask) dbgMask.addEventListener("click", closeDebug);

    if (btnZoom) btnZoom.addEventListener("click", () => setZoom(!state.zoomed));
    setZoom(false);

    // WeChat hint
    const isWx = /MicroMessenger/i.test(navigator.userAgent);
    if (hint) {
      hint.textContent = isWx
        ? "微信長圖模式：可直接截圖分享（如仍空白，返回再重開一次通常會好）"
        : "非微信環境：此頁仍可用（長圖展示版）";
    }

    try {
      state.fetchStatus = "loading";
      const { ok, row, raw } = await fetchCard(state.id);

      // Debug mini
      state.payloadMini = miniPayloadForDebug(raw, row);

      if (!ok || !row) {
        state.fetchStatus = "not_found";
        showInactive("找不到此名片", "請確認 ID 是否正確，或請聯繫客服");
        return;
      }

      const obj = normalizeObjKeys(row);
      state.plan = parsePlan(obj);
      state.pcsf = parsePCSf(obj);

      // status gate
      const status = pick(obj, ["status","狀態"], "").toLowerCase();
      if (status && status !== "active") {
        state.fetchStatus = "inactive";
        showInactive("此名片尚未啟用", "請聯繫客服開通");
        return;
      }

      // background: premium use p1~p7
      applyBackground(state.pcsf.p);

      // fields: your sheet headers (Chinese first)
      const nm = pick(obj, ["姓名", "name", "fullname", "u_name"], "—");
      const unit = pick(obj, ["單位", "unit", "company", "org", "u_unit"], "");
      const title = pick(obj, ["頭銜", "title", "job_title", "position", "u_title"], "");

      // avatar prefer fast
      const av = pick(obj, ["個人照_fast","avatar_fast","個人照","avatar_img","avatar","photo","profile_img"], "");

      nameEl.textContent = nm;
      metaEl.textContent = [unit, title].filter(Boolean).join("\n");

      setAvatar(av, nm);

      const bullets = toBullets(pick(obj, ["服務項目","service","services","u_service"], ""));
      if (bullets.length) {
        secService.style.display = "block";
        serviceEl.innerHTML = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
      } else {
        secService.style.display = "none";
      }

      const exp = normalizeParagraph(pick(obj, ["經歷","experience","exp","u_exp"], ""));
      if (exp) {
        secExp.style.display = "block";
        expEl.textContent = exp;
      } else {
        secExp.style.display = "none";
      }

      state.fetchStatus = "ok";
      showCard();
    } catch (err) {
      state.fetchStatus = "error";
      state.payloadMini = { error: String(err && err.message ? err.message : err) };
      showInactive("載入失敗", "請返回再重開一次，或請聯繫客服");
    }
  }

  boot();
})();