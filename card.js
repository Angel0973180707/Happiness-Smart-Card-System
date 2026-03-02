/* ================================
 * card.js — v497 (COMPLETE OVERWRITE)
 * - Fetch: GAS action=card&id=TWxxxx
 * - Robust render for your v407 HTML ids
 * - Drive image URL normalize (file/d, open?id, pure id)
 * - Inactive handling (show empty CTA)
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v497",

    // ✅ 改成你現在這支（你貼的 /exec）
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",

    // 你前台的固定客服開通（你之前定錨）
    SUPPORT_URL: "https://lin.ee/G3VJoRm",

    FETCH_TIMEOUT_MS: 20000
  };

  const $ = (sel) => document.querySelector(sel);

  // UI nodes (match your HTML)
  const elHeroSk = $("#hero-skeleton");
  const elHero = $("#hero");
  const elSections = $("#sections");
  const elEmpty = $("#empty");

  const pillText = $("#pill-text");
  const pill = $("#status-pill");

  const elName = $("#u-name");
  const elUnit = $("#u-unit");
  const elTitle = $("#u-title");

  const planText = $("#plan-text");
  const idText = $("#id-text");

  const avatarWrap = $("#avatarWrap");
  const avatar = $("#avatar");
  const avatarPh = $("#avatarPh");

  const secService = $("#sec-service");
  const secExp = $("#sec-exp");
  const secContact = $("#sec-contact");

  const uService = $("#u-service");
  const uExp = $("#u-exp");
  const uContact = $("#u-contact");

  const btnSupport = $("#btn-open-support");

  // debug (optional)
  const brand = $("#brand");
  const dbg = $("#dbg");
  const dbgMask = $("#dbgMask");
  const dbgPre = $("#dbgPre");
  const dbgClose = $("#dbgClose");

  const state = {
    last: null
  };

  function setPill(msg) {
    if (pillText) pillText.textContent = msg;
  }

  function getIdFromUrl() {
    const sp = new URLSearchParams(location.search);
    return (sp.get("id") || "").trim();
  }

  function withTimeout(fetchPromise, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return {
      signal: ctrl.signal,
      promise: fetchPromise.finally(() => clearTimeout(t))
    };
  }

  function trimOrEmpty(v) {
    return (v ?? "").toString().trim();
  }

  function normalizeDriveImageUrl(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";

    // http -> https
    let u = s.replace(/^http:\/\//i, "https://");

    // pure fileId
    if (/^[a-zA-Z0-9_-]{15,}$/.test(u)) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(u)}`;
    }

    // extract id from /file/d/ID or ?id=ID
    const m =
      u.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i) ||
      u.match(/[?&]id=([a-zA-Z0-9_-]{15,})/i);

    if (m && m[1]) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(m[1])}`;
    }

    // otherwise keep url
    if (/^https?:\/\//i.test(u)) return u;
    return s;
  }

  function safeShow(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function setLine(el, text) {
    if (!el) return;
    const t = trimOrEmpty(text);
    el.textContent = t;
    el.style.display = t ? "" : "none";
  }

  function renderServices(services) {
    const s = trimOrEmpty(services);
    if (!uService || !secService) return;

    uService.innerHTML = "";
    if (!s) {
      safeShow(secService, false);
      return;
    }

    // support comma / newline
    const items = s
      .split(/[,，\n]/g)
      .map((x) => x.trim())
      .filter(Boolean);

    if (!items.length) {
      safeShow(secService, false);
      return;
    }

    for (const it of items) {
      const li = document.createElement("li");
      li.textContent = it;
      uService.appendChild(li);
    }
    safeShow(secService, true);
  }

  function renderExp(exp) {
    const s = trimOrEmpty(exp);
    if (!uExp || !secExp) return;

    if (!s) {
      safeShow(secExp, false);
      return;
    }
    uExp.textContent = s;
    safeShow(secExp, true);
  }

  function addContact(title, value, href) {
    if (!uContact) return;

    const wrap = document.createElement("a");
    wrap.className = "contact";
    wrap.href = href || "#";
    wrap.rel = "noopener";
    wrap.target = href ? "_blank" : "_self";

    const ico = document.createElement("div");
    ico.className = "ico";
    ico.textContent = title.slice(0, 1);

    const body = document.createElement("div");
    body.className = "cBody";

    const t = document.createElement("div");
    t.className = "cTitle";
    t.textContent = title;

    const v = document.createElement("div");
    v.className = "cVal";
    v.textContent = value;

    const go = document.createElement("div");
    go.className = "cGo";
    go.textContent = "開啟";

    body.appendChild(t);
    body.appendChild(v);

    wrap.appendChild(ico);
    wrap.appendChild(body);
    wrap.appendChild(go);

    uContact.appendChild(wrap);
  }

  function normalizeLine(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";
    // allow @id
    if (s.startsWith("@")) return `https://line.me/R/ti/p/${encodeURIComponent(s)}`;
    // url
    return s.replace(/^http:\/\//i, "https://");
  }

  function renderContacts(item) {
    if (!uContact || !secContact) return;

    uContact.innerHTML = "";

    const line = normalizeLine(item.line_url || "");
    const wechat = trimOrEmpty(item.wechat_id || "");
    const email = trimOrEmpty(item.email || "");
    const phone = trimOrEmpty(item.phone || "");
    const address = trimOrEmpty(item.address || "");
    const lineOA = trimOrEmpty(item.line_oa || CONFIG.SUPPORT_URL);

    let count = 0;

    if (line) {
      addContact("LINE", line, line);
      count++;
    }
    if (wechat) {
      // wechat can't open directly; copy-like UX not in this v407 UI, so just show
      addContact("微信", wechat, "");
      count++;
    }
    if (email) {
      addContact("Email", email, `mailto:${email}`);
      count++;
    }
    if (phone) {
      const p = phone.replace(/\s+/g, "");
      addContact("Phone", phone, `tel:${p}`);
      count++;
    }
    if (address) {
      const q = encodeURIComponent(address);
      addContact("地址", address, `https://www.google.com/maps/search/?api=1&query=${q}`);
      count++;
    }

    // always provide support OA when inactive (or when nothing)
    if (!count && lineOA) {
      addContact("客服", lineOA, lineOA);
      count++;
    }

    safeShow(secContact, count > 0);
  }

  function renderAvatar(item) {
    const url = normalizeDriveImageUrl(item.avatar_img_fast || item.avatar_img || "");
    if (!avatar || !avatarPh) return;

    if (url) {
      avatar.src = url;
      avatar.style.display = "";
      avatarPh.style.display = "none";
      avatar.onerror = () => {
        avatar.style.display = "none";
        avatarPh.style.display = "";
      };
    } else {
      avatar.style.display = "none";
      avatarPh.style.display = "";
    }
  }

  function render(item) {
    const id = trimOrEmpty(item.id || "");
    const status = trimOrEmpty(item.status || "");
    const plan = trimOrEmpty(item.plan || "");

    setText(idText, id || "—");
    setText(planText, plan || "—");

    setText(elName, trimOrEmpty(item.name) || "—");
    setLine(elUnit, item.unit || "");
    setLine(elTitle, item.title || "");

    renderAvatar(item);
    renderServices(item.services || "");
    renderExp(item.experience || "");
    renderContacts(item);

    // sections visible if active
    const isActive = status.toLowerCase() === "active";

    // 你現在 create 預設 inactive，所以會進 empty
    // ✅ 如果你希望 inactive 也能預覽內容，把下面改成 true
    const allowPreviewWhenInactive = false;

    if (isActive || allowPreviewWhenInactive) {
      safeShow(elEmpty, false);
      safeShow(elHero, true);
      safeShow(elSections, true);
      setPill(isActive ? "Active" : "Inactive preview");
    } else {
      safeShow(elHero, true);       // 仍顯示頭部基本資料（你比較好辨識）
      safeShow(elSections, false);  // 不給內容
      safeShow(elEmpty, true);
      setPill("Inactive");
    }

    safeShow(elHeroSk, false);

    if (btnSupport) {
      btnSupport.href = CONFIG.SUPPORT_URL;
    }
  }

  async function fetchCard(id) {
    const url = `${CONFIG.GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;

    const { signal, promise } = withTimeout(fetch(url, { method: "GET", signal }), CONFIG.FETCH_TIMEOUT_MS);

    const res = await promise;
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("JSON parse failed: " + text.slice(0, 180));
    }
    state.last = { url, json };
    if (!json || json.ok !== true || !json.item) {
      throw new Error("Card not found or invalid payload");
    }
    return json.item;
  }

  function openDebug() {
    if (!dbg || !dbgPre || !dbgMask) return;
    dbgPre.textContent = JSON.stringify(state.last, null, 2);
    dbg.style.display = "";
    dbgMask.style.display = "";
  }

  function closeDebug() {
    if (!dbg || !dbgMask) return;
    dbg.style.display = "none";
    dbgMask.style.display = "none";
  }

  async function boot() {
    const id = getIdFromUrl() || "TW0001";

    setPill("Loading…");
    safeShow(elHeroSk, true);
    safeShow(elHero, false);
    safeShow(elSections, false);
    safeShow(elEmpty, false);

    try {
      const item = await fetchCard(id);
      render(item);
      pill.classList.add("fade-in");
    } catch (err) {
      safeShow(elHeroSk, false);
      safeShow(elHero, false);
      safeShow(elSections, false);
      safeShow(elEmpty, true);
      setPill("Load failed");
      if ($("#empty p")) $("#empty p").textContent = "載入失敗\n請確認名片序號與 GAS action=card 可用";
      state.last = { error: String(err) };
    }

    // long press brand to open debug
    if (brand) {
      let t = null;
      brand.addEventListener("touchstart", () => {
        t = setTimeout(openDebug, 900);
      }, { passive: true });
      brand.addEventListener("touchend", () => {
        if (t) clearTimeout(t);
      }, { passive: true });

      brand.addEventListener("mousedown", () => {
        t = setTimeout(openDebug, 900);
      });
      brand.addEventListener("mouseup", () => {
        if (t) clearTimeout(t);
      });
    }

    if (dbgClose) dbgClose.addEventListener("click", closeDebug);
    if (dbgMask) dbgMask.addEventListener("click", closeDebug);
  }

  boot();
})();