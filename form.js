/* ================================
 * form.js (v407 COMPLETE OVERWRITE)
 * - Submit button lock + "建立中..."
 * - Auto fill line_oa if empty: https://lin.ee/G3VJoRm
 * - After success: auto scroll to result
 * - Compatibility: try multiple GAS actions (no backend changes)
 * - Unified Debug: long press brand 1.2s
 * ================================ */

(() => {
  const VERSION = 407;

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbwALQLscdoompGvO3iphBgcgn3nYIhVfYghirifzu2PYBaeCZWWzSkw3SaGoJZRbKU/exec";

  const CONFIG = {
    GAS: DEFAULT_GAS,
    DEFAULT_LINE_OA: "https://lin.ee/G3VJoRm",
    LONGPRESS_MS: 1200
  };

  const el = (id) => document.getElementById(id);

  const brand = el("brand");
  const btn = el("btnSubmit");
  const hint = el("submitHint");

  const fields = {
    name: el("name"),
    plan: el("plan"),
    unit: el("unit"),
    title: el("title"),
    avatar: el("avatar"),
    service: el("service"),
    exp: el("exp"),
    phone: el("phone"),
    email: el("email"),
    line_oa: el("line_oa"),
    address: el("address")
  };

  const result = el("result");
  const rid = el("rid");
  const rcard = el("rcard");
  const rwechat = el("rwechat");
  const ropen = el("ropen");

  const copyAll = el("copyAll");
  const openOpen = el("openOpen");

  // Debug
  const dbg = el("dbg");
  const dbgMask = el("dbgMask");
  const dbgPre = el("dbgPre");
  const dbgClose = el("dbgClose");

  const state = {
    fetchStatus: "idle",
    gasUrl: "",
    lastRespMini: null
  };

  function safeText(x) {
    if (x === null || x === undefined) return "";
    return String(x).trim();
  }

  function getPayload() {
    // auto fill line_oa
    const line = safeText(fields.line_oa.value) || CONFIG.DEFAULT_LINE_OA;
    fields.line_oa.value = line;

    return {
      name: safeText(fields.name.value),
      plan: safeText(fields.plan.value) || "free",
      unit: safeText(fields.unit.value),
      title: safeText(fields.title.value),
      avatar_img: safeText(fields.avatar.value),
      service: safeText(fields.service.value),
      exp: safeText(fields.exp.value),
      phone: safeText(fields.phone.value),
      email: safeText(fields.email.value),
      line_oa: line,
      address: safeText(fields.address.value)
    };
  }

  function lock(on) {
    btn.disabled = on;
    btn.textContent = on ? "建立中..." : "建立";
  }

  function scrollToResult() {
    setTimeout(() => {
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function fetchJson(url, bodyObj) {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(bodyObj)
    });

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}$/);
      if (m) return JSON.parse(m[0]);
      throw new Error("Invalid JSON");
    }
  }

  async function submitToGAS(payload) {
    // ✅ Compatibility: try common actions without changing backend
    const actions = ["create", "form", "submit", "new"];
    let lastErr = null;

    for (const a of actions) {
      const url = `${CONFIG.GAS}?action=${encodeURIComponent(a)}&v=${VERSION}&ts=${Date.now()}`;
      state.gasUrl = url;
      try {
        const resp = await fetchJson(url, payload);
        // Accept if resp.ok true or has id
        if (resp && (resp.ok === true || resp.id || resp.card_id)) return resp;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("submit failed");
  }

  function buildUrls(id) {
    const base = location.origin + location.pathname.replace(/\/[^/]*$/, "/");
    const cardUrl = `${base}card.html?id=${encodeURIComponent(id)}`;
    const wechatUrl = `${base}wechat.html?id=${encodeURIComponent(id)}`;
    const openUrl = `${base}open.html?id=${encodeURIComponent(id)}`;
    return { cardUrl, wechatUrl, openUrl };
  }

  function miniResp(resp) {
    return {
      ok: resp && resp.ok,
      id: resp && (resp.id || resp.card_id),
      message: resp && (resp.message || resp.msg),
      card_url: resp && (resp.card_url || resp.cardUrl),
      wechat_url: resp && (resp.wechat_url || resp.wechatUrl),
      open_url: resp && (resp.open_url || resp.openUrl)
    };
  }

  async function onSubmit() {
    hint.textContent = "";
    result.style.display = "none";

    const payload = getPayload();
    if (!payload.name) {
      hint.textContent = "請先填姓名";
      return;
    }

    lock(true);
    state.fetchStatus = "loading";

    try {
      const resp = await submitToGAS(payload);
      state.fetchStatus = "ok";
      state.lastRespMini = miniResp(resp);

      const id = safeText(resp.id || resp.card_id);
      if (!id) throw new Error("No id returned");

      // URLs: prefer backend returned, else build front-end URLs
      const urls = {
        cardUrl: safeText(resp.card_url || resp.cardUrl),
        wechatUrl: safeText(resp.wechat_url || resp.wechatUrl),
        openUrl: safeText(resp.open_url || resp.openUrl)
      };

      if (!urls.cardUrl || !urls.wechatUrl || !urls.openUrl) {
        const built = buildUrls(id);
        urls.cardUrl = urls.cardUrl || built.cardUrl;
        urls.wechatUrl = urls.wechatUrl || built.wechatUrl;
        urls.openUrl = urls.openUrl || built.openUrl;
      }

      rid.textContent = id;
      rcard.textContent = urls.cardUrl;
      rwechat.textContent = urls.wechatUrl;
      ropen.textContent = urls.openUrl;

      result.style.display = "block";
      scrollToResult();
    } catch (err) {
      state.fetchStatus = "error";
      state.lastRespMini = { error: String(err && err.message ? err.message : err) };
      hint.textContent = "建立失敗：請檢查網路 / GAS 狀態，或稍後再試";
      result.style.display = "block";
      scrollToResult();
    } finally {
      lock(false);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      prompt("複製這段：", text);
      return false;
    }
  }

  // Debug
  function openDebug() {
    const info = {
      fetch: state.fetchStatus,
      gas_url: state.gasUrl,
      resp: state.lastRespMini
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

  // Bind
  btn.addEventListener("click", onSubmit);

  copyAll.addEventListener("click", async () => {
    const txt = `ID: ${rid.textContent}\ncard_url: ${rcard.textContent}\nwechat_url: ${rwechat.textContent}\nopen_url: ${ropen.textContent}`;
    const ok = await copyText(txt);
    copyAll.textContent = ok ? "已複製" : "複製";
    setTimeout(() => (copyAll.textContent = "一鍵複製三條連結"), 900);
  });

  openOpen.addEventListener("click", () => {
    const url = ropen.textContent.trim();
    if (url && url.startsWith("http")) location.href = url;
  });

  bindLongPress(brand, CONFIG.LONGPRESS_MS, openDebug);
  dbgClose.addEventListener("click", closeDebug);
  dbgMask.addEventListener("click", closeDebug);
})();