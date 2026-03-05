/* ==========================================
 * HSC Admin Workspace — admin.js v516.0 (COMPLETE OVERWRITE)
 * Add:
 * - Paste customer message -> find card -> issue 7-day update link
 * Requires GAS v514.4+ (adminFind + makeUpdateLink)
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "516.0";

  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

  const CONFIG = {
    GAS: DEFAULT_GAS,
    BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 1
  };

  const STORAGE = {
    ADMIN_SECRET: "HSC_ADMIN_SECRET",
    TOKEN_MAP: "HSC_TOKEN_MAP", // { [id]: token }
    LAST_ID: "HSC_ADMIN_LAST_ID",
    LAST_UPDATE_LINK: "HSC_LAST_UPDATE_LINK"
  };

  const $ = (id) => document.getElementById(id);

  const dom = {
    versionText: $("versionText"),
    pillMsg: $("pillMsg"),

    idInput: $("cardId"),
    tokenInput: $("token"),
    adminSecretInput: $("admin_secret"),

    btnLoad: $("btnLoad"),
    btnRememberToken: $("btnRememberToken"),
    btnCopyCard: $("btnCopyCard"),
    btnCopyShare: $("btnCopyShare"),
    btnCopyDelivery: $("btnCopyDelivery"),
    btnCopyWechat: $("btnCopyWechat"),
    btnDebug: $("btnDebug"),

    btnConfirm: $("btnConfirm"),
    btnActivate: $("btnActivate"),

    pvName: $("pvName"),
    pvUnit: $("pvUnit"),
    pvTitle: $("pvTitle"),
    pvStatus: $("pvStatus"),
    pvAvatar: $("pvAvatar"),

    // update link
    customerMsg: $("customerMsg"),
    btnMakeUpdateLink: $("btnMakeUpdateLink"),
    btnCopyUpdateLink: $("btnCopyUpdateLink"),
    pillUpdate: $("pillUpdate")
  };

  const logs = [];
  function nowISO(){ return new Date().toISOString(); }
  function log(...args){
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logs.push(`[${nowISO()}] ${msg}`);
    console.log("[HSC ADMIN]", ...args);
  }

  function toast(msg){
    if(dom.pillMsg) dom.pillMsg.textContent = String(msg || "");
  }
  function toastUpdate(msg){
    if(dom.pillUpdate) dom.pillUpdate.textContent = String(msg || "");
  }

  function safeText(v){ return (v === undefined || v === null) ? "" : String(v); }
  function setValue(el, v){ if(el && "value" in el) el.value = safeText(v); else if(el) el.textContent = safeText(v); }
  function getValue(el){ if(!el) return ""; return ("value" in el) ? String(el.value||"").trim() : String(el.textContent||"").trim(); }

  function loadTokenMap(){
    try { return JSON.parse(localStorage.getItem(STORAGE.TOKEN_MAP) || "{}") || {}; }
    catch(_e){ return {}; }
  }
  function saveTokenMap(map){ localStorage.setItem(STORAGE.TOKEN_MAP, JSON.stringify(map || {})); }
  function rememberToken(id, token){
    const _id = (id || "").trim();
    const _t = (token || "").trim();
    if(!_id || !_t) return;
    const m = loadTokenMap();
    m[_id] = _t;
    saveTokenMap(m);
  }
  function recallToken(id){
    const _id = (id || "").trim();
    if(!_id) return "";
    const m = loadTokenMap();
    return (m[_id] || "").trim();
  }

  function buildUrl(params){
    const u = new URL(CONFIG.GAS);
    Object.entries(params || {}).forEach(([k,v])=>{
      if(v === undefined || v === null) return;
      const s = String(v).trim();
      if(!s) return;
      u.searchParams.set(k, s);
    });
    return u.toString();
  }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function fetchJsonGET(params){
    const url = buildUrl(params);
    log("GET", url);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);
    try{
      const res = await fetch(url, { method:"GET", mode:"cors", cache:"no-store", signal: ctrl.signal });
      const txt = await res.text();
      let json;
      try{ json = JSON.parse(txt); }
      catch(_e){ throw new Error("GAS JSON parse fail: " + txt.slice(0, 220)); }
      if(!json || json.ok !== true) throw new Error((json && json.error) ? json.error : "GAS error");
      return json;
    }finally{
      clearTimeout(timer);
    }
  }

  async function fetchJsonWithRetry(params){
    let lastErr;
    for(let i=0; i<=CONFIG.RETRY; i++){
      try{ return await fetchJsonGET(params); }
      catch(e){
        lastErr = e;
        log("ERR", e && e.message ? e.message : String(e));
        if(i < CONFIG.RETRY) await sleep(350);
      }
    }
    throw lastErr;
  }

  // ---------- GAS adapters ----------
  async function adminReadCard({ id, admin_secret }){
    const tries = [
      { action:"card", id, admin_secret },
      { action:"adminCard", id, admin_secret },
      { action:"adminGet", id, admin_secret }
    ];
    let lastErr = null;
    for(const t of tries){
      try{ return await fetchJsonWithRetry(t); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("admin read failed");
  }

  async function tokenReadCard({ id, token }){
    return await fetchJsonWithRetry({ action:"card", id, token });
  }

  async function confirmCard({ id, admin_secret }){
    const tries = [
      { action:"confirm", id, admin_secret },
      { action:"adminConfirm", id, admin_secret }
    ];
    let lastErr = null;
    for(const t of tries){
      try{ return await fetchJsonWithRetry(t); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("confirm failed");
  }

  async function activateCard({ id, admin_secret }){
    const tries = [
      { action:"adminSetStatus", id, status:"active", admin_secret },
      { action:"activate", id, admin_secret }
    ];
    let lastErr = null;
    for(const t of tries){
      try{ return await fetchJsonWithRetry(t); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("activate failed");
  }

  async function adminFind({ admin_secret, name, phone3, unitOrTitle }){
    return await fetchJsonWithRetry({
      action: "adminFind",
      admin_secret,
      name: name || "",
      phone3: phone3 || "",
      unit_or_title: unitOrTitle || ""
    });
  }

  async function makeUpdateLink({ admin_secret, id, days }){
    const tries = [
      { action:"makeUpdateLink", admin_secret, id, days: String(days||7) },
      { action:"adminIssueUpdateLink", admin_secret, id, days: String(days||7) }
    ];
    let lastErr = null;
    for(const t of tries){
      try{ return await fetchJsonWithRetry(t); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("make update link failed");
  }

  // ---------- Link builders ----------
  function buildLinks(id){
    const _id = (id || "").trim();
    return {
      card: `${CONFIG.BASE_URL}index.html?id=${encodeURIComponent(_id)}`,
      share: `${CONFIG.BASE_URL}share.html?id=${encodeURIComponent(_id)}`,
      delivery: `${CONFIG.BASE_URL}delivery.html?id=${encodeURIComponent(_id)}`,
      wechat: `${CONFIG.BASE_URL}wechat.html?id=${encodeURIComponent(_id)}`
    };
  }

  async function copyText(text){
    const t = String(text || "");
    try{
      await navigator.clipboard.writeText(t);
      toast("已複製 ✅");
      return true;
    }catch(_e){
      try{
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast("已複製 ✅");
        return true;
      }catch(e2){
        alert("複製失敗，請手動複製：\n" + t);
        return false;
      }
    }
  }

  function renderCard(item){
    if(!item) return;
    setValue(dom.pvName, item.name || "-");
    setValue(dom.pvUnit, item.unit || "-");
    setValue(dom.pvTitle, item.title || "-");
    setValue(dom.pvStatus, `status：${item.status || "-"}`);
    if(dom.pvAvatar){
      const src = (item.avatar_img || item.avatar_url || "").trim();
      if(src) dom.pvAvatar.src = src;
      else dom.pvAvatar.removeAttribute("src");
    }
  }

  function showDebug(){
    const id = getValue(dom.idInput) || "-";
    const tokenInput = getValue(dom.tokenInput) || "";
    const admin_secret = getValue(dom.adminSecretInput) || "";
    const memTok = recallToken(id);
    const lastUpdate = localStorage.getItem(STORAGE.LAST_UPDATE_LINK) || "";

    const text = [
      `HSC Admin v${VERSION}`,
      `GAS=${CONFIG.GAS}`,
      `BASE=${CONFIG.BASE_URL}`,
      "",
      `id=${id}`,
      `token(input)=${tokenInput ? tokenInput.slice(0,10) + (tokenInput.length>10?"...":"") : "-"}`,
      `token(mem)=${memTok ? memTok.slice(0,10) + "..." : "-"}`,
      `admin_secret=${admin_secret ? "yes" : "no"}`,
      `last_update_link=${lastUpdate ? lastUpdate.slice(0,80) + "..." : "-"}`,
      "",
      "Logs (last 80):",
      ...logs.slice(-80)
    ].join("\n");

    alert(text);
  }

  // ---------- Actions ----------
  async function onLoad(){
    const id = (getValue(dom.idInput) || "").trim();
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    let token = (getValue(dom.tokenInput) || "").trim();

    if(!id){
      alert("請先輸入卡片 ID（例如 TW0007）");
      return;
    }

    localStorage.setItem(STORAGE.LAST_ID, id);

    if(!token){
      const mem = recallToken(id);
      if(mem){
        token = mem;
        setValue(dom.tokenInput, mem);
      }
    }

    try{
      toast("載入中…");
      log("load", { id, hasAdmin: !!admin_secret });

      if(admin_secret){
        const r = await adminReadCard({ id, admin_secret });
        const item = r.item || r.data || r.card || r.result || null;
        if(!item) throw new Error("GAS 回傳格式不含 item/data");

        const gotToken = (item.token || r.token || "").trim();
        if(gotToken){
          setValue(dom.tokenInput, gotToken);
          rememberToken(id, gotToken);
        }

        renderCard(item);
        toast(`已載入：${id} ✅`);
        return;
      }

      if(!token){
        throw new Error("此卡 inactive 時需要 token 才能讀；或輸入 admin_secret 用管理者載入。");
      }

      const r2 = await tokenReadCard({ id, token });
      const item2 = r2.item || r2.data || r2.card || r2.result || null;
      if(!item2) throw new Error("GAS 回傳格式不含 item/data");

      rememberToken(id, token);
      renderCard(item2);
      toast(`已載入：${id} ✅`);

    }catch(e){
      const msg = e && e.message ? e.message : String(e);
      toast("載入失敗 ❌");
      alert("載入失敗：\n" + msg);
      log("load fail", msg);
    }
  }

  function onRememberToken(){
    const id = (getValue(dom.idInput) || "").trim();
    const token = (getValue(dom.tokenInput) || "").trim();
    if(!id) return alert("請先輸入卡片 ID（TWxxxx）");
    if(!token) return alert("請先輸入 token");
    rememberToken(id, token);
    toast("token 已記住 ✅");
  }

  async function onCopy(which){
    const id = (getValue(dom.idInput) || "").trim();
    if(!id) return alert("請先輸入卡片 ID（TWxxxx）");
    const links = buildLinks(id);
    const text = links[which];
    if(!text) return;
    await copyText(text);
  }

  async function onConfirm(){
    const id = (getValue(dom.idInput) || "").trim();
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    if(!id) return alert("請先輸入卡片 ID（TWxxxx）");
    if(!admin_secret) return alert("confirm 需要 admin_secret");
    if(!confirm(`確認要將 ${id} 設為 confirmed（客戶確認）嗎？`)) return;

    try{
      toast("confirm 中…");
      await confirmCard({ id, admin_secret });
      toast("confirm 完成 ✅");
      await onLoad();
    }catch(e){
      alert("confirm 失敗：\n" + (e && e.message ? e.message : String(e)));
    }
  }

  async function onActivate(){
    const id = (getValue(dom.idInput) || "").trim();
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    if(!id) return alert("請先輸入卡片 ID（TWxxxx）");
    if(!admin_secret) return alert("啟用需要 admin_secret");
    if(!confirm(`要把 ${id} 啟用為 active 嗎？（啟用後客戶不需要 token）`)) return;

    try{
      toast("啟用中…");
      await activateCard({ id, admin_secret });
      toast("已啟用 ✅");
      await onLoad();
    }catch(e){
      alert("啟用失敗：\n" + (e && e.message ? e.message : String(e)));
    }
  }

  // ---------- Update link (7 days) ----------
  function parseCustomerMsg(raw){
    const s = String(raw || "").trim();
    const out = { raw: s, id:"", name:"", phone3:"", unitOrTitle:"" };

    // 1) try extract ID like TWxxxx... (you can adjust)
    const idMatch = s.match(/\b[A-Z]{2}[0-9A-Z]{6,}\b/);
    if(idMatch) out.id = idMatch[0];

    // 2) extract last 3 digits anywhere
    const m3 = s.match(/(\d{3})(?!\d)/);
    if(m3) out.phone3 = m3[1];

    // 3) guess name: first 2~5 Chinese chars
    const nm = s.match(/([\u4e00-\u9fff]{2,5})/);
    if(nm) out.name = nm[1];

    // 4) unit/title: rest of text after name (rough)
    if(out.name){
      const idx = s.indexOf(out.name);
      const rest = s.slice(idx + out.name.length).trim();
      if(rest && !out.phone3) out.unitOrTitle = rest.slice(0, 30);
      if(rest && out.phone3) {
        // if has phone3, still allow fallback keyword
        const cleaned = rest.replace(out.phone3, "").trim();
        if(cleaned) out.unitOrTitle = cleaned.slice(0, 30);
      }
    }
    return out;
  }

  async function onMakeUpdateLink(){
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    if(!admin_secret) return alert("請先輸入 admin_secret");

    const raw = getValue(dom.customerMsg);
    if(!raw) return alert("請先貼上客戶訊息");

    try{
      toastUpdate("解析中…");
      dom.btnCopyUpdateLink && (dom.btnCopyUpdateLink.disabled = true);

      const parsed = parseCustomerMsg(raw);
      log("parse", parsed);

      let id = parsed.id;

      // If no id in message -> adminFind
      if(!id){
        if(!parsed.name) throw new Error("解析不到姓名，請讓客戶回覆：姓名 + 手機末三碼 或 姓名 + 單位(或頭銜)");
        const r = await adminFind({
          admin_secret,
          name: parsed.name,
          phone3: parsed.phone3,
          unitOrTitle: parsed.unitOrTitle
        });

        const list = r.items || r.list || [];
        if(!Array.isArray(list) || list.length === 0){
          throw new Error("找不到符合的名片。請確認：姓名/手機末三碼/單位(或頭銜) 是否正確。");
        }
        if(list.length === 1){
          id = list[0].id;
        }else{
          const options = list.slice(0,5).map((it, i)=>{
            const phone = String(it.phone || "");
            const phoneMask = phone ? ("…"+phone.slice(-3)) : "";
            return `${i+1}) ${it.id}｜${it.name||"-"}｜${it.unit||it.title||"-"}｜${phoneMask}`;
          }).join("\n");
          const pick = prompt("找到多筆，請輸入編號：\n" + options, "1");
          const idx = Math.max(1, Number(pick||"1")) - 1;
          id = (list[idx] && list[idx].id) ? list[idx].id : list[0].id;
        }
      }

      // Issue 7-day update link
      toastUpdate("產生連結中…");
      const r2 = await makeUpdateLink({ admin_secret, id, days: 7 });
      const link = r2.link || "";

      if(!link) throw new Error("GAS 未回傳 link");

      localStorage.setItem(STORAGE.LAST_UPDATE_LINK, link);
      toastUpdate(`已產生：${id}（7天有效）✅`);

      // also fill cardId for convenience
      setValue(dom.idInput, id);

      // enable copy
      if(dom.btnCopyUpdateLink){
        dom.btnCopyUpdateLink.disabled = false;
        dom.btnCopyUpdateLink.onclick = () => copyText(link);
      }

      // auto copy once
      await copyText(link);

    }catch(e){
      const msg = e && e.message ? e.message : String(e);
      toastUpdate("失敗 ❌");
      alert("獲取更新連結失敗：\n" + msg);
      log("update link fail", msg);
    }
  }

  // ---------- Bind ----------
  function bind(){
    if(dom.versionText) dom.versionText.textContent = VERSION;

    const savedSecret = localStorage.getItem(STORAGE.ADMIN_SECRET) || "";
    if(dom.adminSecretInput && savedSecret && !getValue(dom.adminSecretInput)){
      dom.adminSecretInput.value = savedSecret;
    }

    const u = new URL(location.href);
    const idQS = (u.searchParams.get("id") || "").trim();
    const tokenQS = (u.searchParams.get("token") || "").trim();

    const lastId = localStorage.getItem(STORAGE.LAST_ID) || "";
    if(dom.idInput && !getValue(dom.idInput)){
      dom.idInput.value = idQS || lastId || "";
    }else if(dom.idInput && idQS){
      dom.idInput.value = idQS;
    }

    if(dom.tokenInput && !getValue(dom.tokenInput)){
      dom.tokenInput.value = tokenQS || recallToken(getValue(dom.idInput)) || "";
    }else if(dom.tokenInput && tokenQS){
      dom.tokenInput.value = tokenQS;
    }

    if(dom.adminSecretInput){
      dom.adminSecretInput.addEventListener("change", ()=>{
        localStorage.setItem(STORAGE.ADMIN_SECRET, getValue(dom.adminSecretInput));
      });
    }

    dom.btnLoad?.addEventListener("click", onLoad);
    dom.btnRememberToken?.addEventListener("click", onRememberToken);

    dom.btnCopyCard?.addEventListener("click", ()=>onCopy("card"));
    dom.btnCopyShare?.addEventListener("click", ()=>onCopy("share"));
    dom.btnCopyDelivery?.addEventListener("click", ()=>onCopy("delivery"));
    dom.btnCopyWechat?.addEventListener("click", ()=>onCopy("wechat"));

    dom.btnConfirm?.addEventListener("click", onConfirm);
    dom.btnActivate?.addEventListener("click", onActivate);

    dom.btnDebug?.addEventListener("click", showDebug);

    dom.btnMakeUpdateLink?.addEventListener("click", onMakeUpdateLink);

    const lastUpdate = localStorage.getItem(STORAGE.LAST_UPDATE_LINK) || "";
    if(lastUpdate && dom.btnCopyUpdateLink){
      dom.btnCopyUpdateLink.disabled = false;
      dom.btnCopyUpdateLink.onclick = () => copyText(lastUpdate);
    }

    toast("待命");
    toastUpdate("尚未產生");
    log("boot ok", { VERSION, GAS: CONFIG.GAS });
  }

  bind();
})();