/* ================================
 * wechat.js (v408 COMPLETE OVERWRITE)
 * - WeChat UA detect -> long card mode
 * - Stable background mapping p1~p7 inside wechat.js (no dependency on card)
 * - Loading animation (avoid blank)
 * - Zoom button
 * - Unified Debug: long press brand 1.2s
 * - Compatible fetch: action=card
 * ================================ */

(() => {
  const VERSION = 407;

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec";

  const CONFIG = {
    GAS: DEFAULT_GAS,
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
    for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v;
    return out;
  }
  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      if (k in obj && safeText(obj[k])) return safeText(obj[k]);
    }
    return fallback;
  }
  function parsePlan(obj) {
    const raw = pick(obj, ["plan", "plan_type", "package", "mode"], "free").toLowerCase();
    if (raw.includes("premium") || raw.includes("pro") || raw.includes("精品")) return "premium";
    return "free";
  }
  function parsePCSf(obj) {
    return {
      p: pick(obj, ["p", "p_code", "premium_bg", "bg_p"], ""),
      c: pick(obj, ["c", "c_code", "color_c"], ""),
      s: pick(obj, ["s", "s_code", "style_s"], ""),
      f: pick(obj, ["f", "f_code", "fiber_f"], "")
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
  async function fetchCard(id) {
    const cid = normalizeId(id) || CONFIG.DEFAULT_ID;
    const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(cid)}&v=${VERSION}&ts=${Date.now()}`;
    state.gasUrl = url;
    const data = await fetchJson(url);
    return data;
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

  function showInactive() {
    loading.style.display = "block";
    card.style.display = "none";
    loading.querySelector(".big").textContent = "此名片尚未啟用";
    loading.querySelector(".small").textContent = "請聯繫客服開通";
  }

  function showCard() {
    loading.style.display = "none";
    card.style.display = "block";
  }

  // Debug
  function openDebug() {
    const info = {
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

  function miniPayloadForDebug(raw) {
    const obj = normalizeObjKeys(raw || {});
    return {
      ok: raw && raw.ok,
      id: pick(obj, ["id", "card_id"], ""),
      name: pick(obj, ["name", "u_name", "fullname"], ""),
      plan: parsePlan(obj),
      p: pick(obj, ["p", "p_code"], ""),
      avatar: pick(obj, ["avatar_img", "avatar", "photo", "profile_img"], ""),
      service: pick(obj, ["service", "services"], ""),
      exp: pick(obj, ["experience", "exp"], "")
    };
  }

  function setZoom(on) {
    state.zoomed = on;
    panel.style.transformOrigin = "top center";
    panel.style.transform = on ? "scale(1.15)" : "scale(1)";
    panel.style.transition = "transform .18s ease-out";
    btnZoom.textContent = on ? "縮小" : "放大";
  }

  async function boot() {
    state.id = normalizeId(qs("id")) || CONFIG.DEFAULT_ID;

    bindLongPress(brand, CONFIG.LONGPRESS_MS, openDebug);
    dbgClose.addEventListener("click", closeDebug);
    dbgMask.addEventListener("click", closeDebug);

    btnZoom.addEventListener("click", () => setZoom(!state.zoomed));
    setZoom(false);

    // WeChat hint
    const isWx = navigator.userAgent.includes("MicroMessenger");
    hint.textContent = isWx
      ? "微信長圖模式：可直接截圖分享（如需更穩定，建議用 open.html 開啟）"
      : "非微信環境：此頁仍可用（長圖展示版）";

    try {
      state.fetchStatus = "loading";
      const data = await fetchCard(state.id);
      if (!data || data.ok === false) {
        state.fetchStatus = "inactive";
        state.payloadMini = miniPayloadForDebug(data);
        showInactive();
        return;
      }

      const obj = normalizeObjKeys(data);
      state.plan = parsePlan(obj);
      state.pcsf = parsePCSf(obj);
      state.payloadMini = miniPayloadForDebug(data);

      applyBackground(state.pcsf.p);

      const nm = pick(obj, ["name", "fullname", "u_name"], "—");
      const unit = pick(obj, ["unit", "company", "org", "u_unit"], "");
      const title = pick(obj, ["title", "job_title", "position", "u_title"], "");
      const av = pick(obj, ["avatar_img", "avatar", "photo", "profile_img"], "");

      nameEl.textContent = nm;
      metaEl.textContent = [unit, title].filter(Boolean).join("\n");

      setAvatar(av, nm);

      const bullets = toBullets(pick(obj, ["service", "services", "u_service"], ""));
      if (bullets.length) {
        secService.style.display = "block";
        serviceEl.innerHTML = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
      } else {
        secService.style.display = "none";
      }

      const exp = normalizeParagraph(pick(obj, ["experience", "exp", "u_exp"], ""));
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
      showInactive();
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  boot();
})();