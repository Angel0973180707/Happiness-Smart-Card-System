/* ================================
 * card.js (v407 COMPLETE OVERWRITE)
 * - Loading skeleton + fade-in
 * - Robust data key normalize
 * - Service -> bullet
 * - Experience -> paragraph
 * - Unified contact icons
 * - Inactive guard: !data || !data.ok
 * - Unified Debug: long press brand 1.2s
 * - Do NOT change GAS API format
 * - Compatibility: try multiple actions if needed
 * ================================ */

(() => {
  const VERSION = 407;

  // ✅ Use your real GAS from recent conversation (v406.2 era)
  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec";

  const CONFIG = {
    GAS: DEFAULT_GAS,
    DEFAULT_ID: "TW0001",
    SUPPORT_LINE: "https://lin.ee/G3VJoRm", // fallback support contact
    LONGPRESS_MS: 1200
  };

  // ---------- DOM ----------
  const el = (id) => document.getElementById(id);

  const heroSk = el("hero-skeleton");
  const hero = el("hero");
  const sections = el("sections");

  const empty = el("empty");
  const btnSupport = el("btn-open-support");

  const statusPill = el("status-pill");
  const pillText = el("pill-text");

  const avatarWrap = el("avatarWrap");
  const avatar = el("avatar");
  const avatarPh = el("avatarPh");

  const uName = el("u-name");
  const uUnit = el("u-unit");
  const uTitle = el("u-title");
  const planText = el("plan-text");
  const idText = el("id-text");

  const secService = el("sec-service");
  const uService = el("u-service");

  const secExp = el("sec-exp");
  const uExp = el("u-exp");

  const secContact = el("sec-contact");
  const uContact = el("u-contact");

  // Debug
  const brand = el("brand");
  const dbg = el("dbg");
  const dbgMask = el("dbgMask");
  const dbgPre = el("dbgPre");
  const dbgClose = el("dbgClose");

  // ---------- State ----------
  const state = {
    id: null,
    plan: "free",
    pcsf: { p: "", c: "", s: "", f: "" },
    gasUrl: "",
    fetchStatus: "loading",
    payloadMini: null
  };

  // ---------- Helpers ----------
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
    return String(x).replace(/\u0000/g, "").trim();
  }

  function isMicroMessenger() {
    return navigator.userAgent.includes("MicroMessenger");
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
    for (const [k, v] of Object.entries(obj)) {
      out[normalizeKey(k)] = v;
    }
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

  function setPill(text, good = false) {
    pillText.textContent = text;
    statusPill.style.borderColor = good ? "rgba(34,197,94,.35)" : "rgba(255,255,255,.10)";
  }

  function showInactive() {
    heroSk.style.display = "none";
    hero.style.display = "none";
    sections.style.display = "none";
    empty.style.display = "block";
    empty.classList.add("fade-in");
    setPill("inactive", false);

    const link = CONFIG.SUPPORT_LINE;
    btnSupport.href = link;
  }

  function showLoaded() {
    heroSk.style.display = "none";
    hero.style.display = "flex";
    sections.style.display = "grid";
    hero.classList.add("fade-in");
    sections.classList.add("fade-in");
  }

  function setAvatar(url, name) {
    const u = safeText(url);
    const n = safeText(name) || "🙂";
    avatarPh.textContent = n.slice(0, 1);
    if (!u) {
      avatar.style.display = "none";
      return;
    }
    avatar.onload = () => {
      avatar.style.display = "block";
    };
    avatar.onerror = () => {
      avatar.style.display = "none";
    };
    avatar.src = u;
  }

  function toBullets(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(safeText).filter(Boolean);

    const s = safeText(val);
    if (!s) return [];
    // Split by newline / comma / semicolon / 、 / •
    return s
      .split(/\r?\n|,|;|、|•|\u2022/g)
      .map((x) => safeText(x))
      .filter(Boolean);
  }

  function normalizeParagraph(val) {
    const s = safeText(val);
    if (!s) return "";
    // keep line breaks, but remove too many blank lines
    return s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function buildContactItems(obj) {
    // robust mapping
    const phone = pick(obj, ["phone", "mobile", "tel"], "");
    const email = pick(obj, ["email", "mail"], "");
    const line = pick(obj, ["line_oa", "line", "line_id", "line_url"], "");
    const wechat = pick(obj, ["wechat", "wechat_id", "weixin"], "");
    const website = pick(obj, ["website", "url", "web"], "");
    const address = pick(obj, ["address", "addr", "location"], "");

    const items = [];

    if (phone) items.push({ type: "phone", title: "Phone", value: phone, href: `tel:${phone}` });
    if (email) items.push({ type: "email", title: "Email", value: email, href: `mailto:${email}` });

    if (line) {
      const href = line.startsWith("http") ? line : `https://line.me/R/ti/p/${encodeURIComponent(line)}`;
      items.push({ type: "line", title: "LINE", value: line, href });
    }

    if (wechat) items.push({ type: "wechat", title: "WeChat", value: wechat, href: "" });

    if (website) {
      const href = website.startsWith("http") ? website : `https://${website}`;
      items.push({ type: "web", title: "Website", value: website, href });
    }

    if (address) {
      const q = encodeURIComponent(address);
      const href = `https://www.google.com/maps/search/?api=1&query=${q}`;
      items.push({ type: "addr", title: "Address", value: address, href });
    }

    return items;
  }

  function iconChar(type) {
    switch (type) {
      case "phone": return "☎";
      case "email": return "✉";
      case "line": return "L";
      case "wechat": return "W";
      case "web": return "⌁";
      case "addr": return "⌖";
      default: return "•";
    }
  }

  function renderContacts(items) {
    uContact.innerHTML = "";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "contact";

      const ico = document.createElement("div");
      ico.className = "ico";
      ico.textContent = iconChar(it.type);

      const body = document.createElement("div");
      body.className = "cBody";

      const t = document.createElement("div");
      t.className = "cTitle";
      t.textContent = it.title;

      const v = document.createElement("div");
      v.className = "cVal";
      v.textContent = it.value;

      body.appendChild(t);
      body.appendChild(v);

      const go = document.createElement("a");
      go.className = "cGo";
      go.textContent = it.href ? "開啟" : "複製";

      if (it.href) {
        go.href = it.href;
        go.target = "_blank";
        go.rel = "noopener";
      } else {
        go.href = "javascript:void(0)";
        go.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(it.value);
            go.textContent = "已複製";
            setTimeout(() => (go.textContent = "複製"), 900);
          } catch {
            // fallback
            prompt("複製這段：", it.value);
          }
        });
      }

      row.appendChild(ico);
      row.appendChild(body);
      row.appendChild(go);

      uContact.appendChild(row);
    });
  }

  function miniPayloadForDebug(raw) {
    const obj = normalizeObjKeys(raw || {});
    const out = {
      ok: raw && raw.ok,
      id: pick(obj, ["id", "card_id"], ""),
      name: pick(obj, ["name", "u_name", "fullname"], ""),
      plan: parsePlan(obj),
      p: pick(obj, ["p", "p_code"], ""),
      c: pick(obj, ["c", "c_code"], ""),
      s: pick(obj, ["s", "s_code"], ""),
      f: pick(obj, ["f", "f_code"], ""),
      avatar: pick(obj, ["avatar_img", "avatar", "photo", "profile_img"], ""),
      service: pick(obj, ["service", "services", "u_service"], ""),
      exp: pick(obj, ["experience", "exp", "u_exp"], "")
    };
    return out;
  }

  // ---------- Fetch ----------
  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // Some GAS returns JSON with leading junk - try to extract
      const m = text.match(/\{[\s\S]*\}$/);
      if (m) return JSON.parse(m[0]);
      throw new Error("Invalid JSON");
    }
  }

  async function fetchCard(id) {
    const cid = normalizeId(id) || CONFIG.DEFAULT_ID;
    const gas = CONFIG.GAS;
    const base = `${gas}?action=card&id=${encodeURIComponent(cid)}&v=${VERSION}&ts=${Date.now()}`;
    state.gasUrl = base;
    state.fetchStatus = "loading";
    setPill("Loading skeleton", false);

    const data = await fetchJson(base);
    return data;
  }

  // ---------- Render ----------
  function render(data) {
    if (!data || data.ok === false) {
      state.fetchStatus = "inactive";
      state.payloadMini = miniPayloadForDebug(data);
      showInactive();
      return;
    }

    // Normalize keys
    const obj = normalizeObjKeys(data);

    state.plan = parsePlan(obj);
    state.pcsf = parsePCSf(obj);

    const name = pick(obj, ["name", "fullname", "u_name"], "—");
    const unit = pick(obj, ["unit", "company", "org", "u_unit"], "");
    const title = pick(obj, ["title", "job_title", "position", "u_title"], "");
    const avatarUrl = pick(obj, ["avatar_img", "avatar", "photo", "profile_img"], "");

    // premium halo
    if (state.plan === "premium") avatarWrap.classList.add("premiumHalo");
    else avatarWrap.classList.remove("premiumHalo");

    uName.textContent = name;
    uUnit.textContent = unit ? unit : " ";
    uTitle.textContent = title ? title : " ";
    planText.textContent = state.plan === "premium" ? "premium" : "free";
    idText.textContent = normalizeId(pick(obj, ["id", "card_id"], state.id || "")) || state.id || "—";

    setAvatar(avatarUrl, name);

    // Service bullet
    const serviceRaw = pick(obj, ["service", "services", "u_service"], "");
    const bullets = toBullets(serviceRaw);
    if (bullets.length) {
      secService.style.display = "block";
      uService.innerHTML = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
    } else {
      secService.style.display = "none";
    }

    // Experience paragraphs
    const expRaw = pick(obj, ["experience", "exp", "u_exp", "career"], "");
    const exp = normalizeParagraph(expRaw);
    if (exp) {
      secExp.style.display = "block";
      uExp.textContent = exp;
    } else {
      secExp.style.display = "none";
    }

    // Contacts
    const contacts = buildContactItems(obj);
    if (contacts.length) {
      secContact.style.display = "block";
      renderContacts(contacts);
    } else {
      secContact.style.display = "none";
    }

    state.fetchStatus = "ok";
    state.payloadMini = miniPayloadForDebug(data);

    showLoaded();
    setPill("ready", true);

    // If opened inside WeChat, hint user to use open.html (optional)
    if (isMicroMessenger()) {
      // keep subtle: no popup, only pill
      setPill("ready (WeChat)", true);
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

  // ---------- Debug (Unified) ----------
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

  // ---------- Boot ----------
  async function boot() {
    // Determine id
    const id = normalizeId(qs("id")) || CONFIG.DEFAULT_ID;
    state.id = id;

    // init UI
    empty.style.display = "none";
    heroSk.style.display = "flex";
    hero.style.display = "none";
    sections.style.display = "none";
    setPill("Loading skeleton", false);

    // support link always available
    btnSupport.href = CONFIG.SUPPORT_LINE;

    // debug
    bindLongPress(brand, CONFIG.LONGPRESS_MS, openDebug);
    dbgClose.addEventListener("click", closeDebug);
    dbgMask.addEventListener("click", closeDebug);

    try {
      const data = await fetchCard(id);
      // Required guard per spec:
      // !data || !data.ok → inactive
      if (!data || data.ok === false) {
        showInactive();
        state.payloadMini = miniPayloadForDebug(data);
        state.fetchStatus = "inactive";
        return;
      }
      render(data);
    } catch (err) {
      state.fetchStatus = "error";
      state.payloadMini = { error: String(err && err.message ? err.message : err) };
      showInactive(); // fail-safe: treat as inactive to keep UX clean
      setPill("network/error", false);
    }
  }

  boot();
})();
