/* ==========================================
 * HSC Admin Workspace — admin.js v520.1 (COMPLETE OVERWRITE)
 * Focus:
 * - Admin load prefers admin_secret (no token needed)
 * - One-click issue fill link (invite) with fallback:
 *   try adminIssueFill -> makeFillLink -> issueFill
 * - GET only (avoid CORS preflight)
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "520.1";

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
    TOKEN_MAP: "HSC_TOKEN_MAP",   // { [id]: token }
    LAST_ID: "HSC_ADMIN_LAST_ID"
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

    // invite / fill link
    inviteTenant: $("inviteTenant"),
    inviteDays: $("inviteDays"),
    inviteLink: $("inviteLink"),
    inviteExp: $("inviteExp"),
    inviteSig: $("inviteSig"),
    btnIssueInvite: $("btnIssueInvite"),
    btnCopyInviteLink: $("btnCopyInviteLink"),
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

  function safeText(v){ return (v === undefined || v === null) ? "" : String(v); }

  function setValue(el, v){
    if(!el) return;
    if("value" in el) el.value = safeText(v);
    else el.textContent = safeText(v);
  }

  function getValue(el){
    if(!el) return "";
    if("value" in el) return String(el.value || "").trim();
    return String(el.textContent || "").trim();
  }

  function loadTokenMap(){
    try { return JSON.parse(localStorage.getItem(STORAGE.TOKEN_MAP) || "{}") || {}; }
    catch(_e){ return {}; }
  }
  function saveTokenMap(map){
    localStorage.setItem(STORAGE.TOKEN_MAP, JSON.stringify(map || {}));
  }
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
      { action:"activate", id, admin_secret } // old compat
    ];
    let lastErr = null;
    for(const t of tries){
      try{ return await fetchJsonWithRetry(t); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("activate failed");
  }

  async function issueFillLink({ tenant, days, admin_secret }){
    // ✅ fallback list: your current GAS might use different action names
    const tries = [
      { action:"adminIssueFill", tenant, days, admin_secret },
      { action:"makeFillLink", tenant, days, admin_secret },
      { action:"issueFill", tenant, days, admin_secret },
      { action:"adminFill", tenant, days, admin_secret },
      { action:"issueInvite", tenant, days, admin_secret },
    ];
    let lastErr = null;
    for(const t of tries){
      try{ return await fetchJsonWithRetry(t); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("issue fill link failed");
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

    const text = [
      `HSC Admin v${VERSION}`,
      `GAS=${CONFIG.GAS}`,
      `BASE=${CONFIG.BASE_URL}`,
      "",
      `id=${id}`,
      `token(input)=${tokenInput ? tokenInput.slice(0,10) + (tokenInput.length>10?"...":"") : "-"}`,
      `token(mem)=${memTok ? memTok.slice(0,10) + "..." : "-"}`,
      `admin_secret=${admin_secret ? "yes" : "no"}`,
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

  async function onIssueInvite(){
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    if(!admin_secret) return alert("請先輸入 admin_secret（管理者密碼）");

    const tenant = (getValue(dom.inviteTenant) || "angel").trim() || "angel";
    const daysRaw = (getValue(dom.inviteDays) || "7").trim();
    const days = String(Math.max(1, Number(daysRaw || 7) || 7));

    try{
      toast("產生中…");
      log("issue invite", { tenant, days });

      const r = await issueFillLink({ tenant, days, admin_secret });

      // expected from makeFillLink_: {ok:true, tenant, exp, sig, link}
      const link = (r.link || r.url || "").trim();
      const exp = safeText(r.exp || "");
      const sig = safeText(r.sig || "");

      if(!link) throw new Error("GAS 回傳未包含 link（請確認 makeFillLink 回傳格式）");

      setValue(dom.inviteLink, link);
      setValue(dom.inviteExp, exp);
      setValue(dom.inviteSig, sig ? (sig.slice(0, 26) + (sig.length>26 ? "..." : "")) : "");

      toast("已產生 ✅");
    }catch(e){
      const msg = e && e.message ? e.message : String(e);
      toast("獲取邀請碼失敗 ❌");
      alert("獲取邀請碼失敗：\n" + msg + "\n\n（提示：你的 GAS 若只有 makeFillLink，本後臺會自動 fallback；若仍失敗，代表 GAS 未部署到你正在用的 exec。）");
      log("issue invite fail", msg);
    }
  }

  async function onCopyInviteLink(){
    const link = (getValue(dom.inviteLink) || "").trim();
    if(!link) return alert("目前沒有 link，請先按「一鍵產生邀請碼」");
    await copyText(link);
  }

  function bind(){
    if(dom.versionText) dom.versionText.textContent = VERSION;

    // preload admin_secret
    const savedSecret = localStorage.getItem(STORAGE.ADMIN_SECRET) || "";
    if(dom.adminSecretInput && savedSecret && !getValue(dom.adminSecretInput)){
      dom.adminSecretInput.value = savedSecret;
    }

    // preload id from URL or last
    const u = new URL(location.href);
    const idQS = (u.searchParams.get("id") || "").trim();
    const tokenQS = (u.searchParams.get("token") || "").trim();

    const lastId = localStorage.getItem(STORAGE.LAST_ID) || "";
    if(dom.idInput && !getValue(dom.idInput)){
      dom.idInput.value = idQS || lastId || "";
    }else if(dom.idInput && idQS){
      dom.idInput.value = idQS;
    }

    // preload token
    if(dom.tokenInput && !getValue(dom.tokenInput)){
      dom.tokenInput.value = tokenQS || recallToken(getValue(dom.idInput)) || "";
    }else if(dom.tokenInput && tokenQS){
      dom.tokenInput.value = tokenQS;
    }

    // save admin_secret
    if(dom.adminSecretInput){
      dom.adminSecretInput.addEventListener("change", ()=>{
        localStorage.setItem(STORAGE.ADMIN_SECRET, getValue(dom.adminSecretInput));
      });
    }

    // buttons
    dom.btnLoad?.addEventListener("click", onLoad);
    dom.btnRememberToken?.addEventListener("click", onRememberToken);

    dom.btnCopyCard?.addEventListener("click", ()=>onCopy("card"));
    dom.btnCopyShare?.addEventListener("click", ()=>onCopy("share"));
    dom.btnCopyDelivery?.addEventListener("click", ()=>onCopy("delivery"));
    dom.btnCopyWechat?.addEventListener("click", ()=>onCopy("wechat"));

    dom.btnConfirm?.addEventListener("click", onConfirm);
    dom.btnActivate?.addEventListener("click", onActivate);

    dom.btnIssueInvite?.addEventListener("click", onIssueInvite);
    dom.btnCopyInviteLink?.addEventListener("click", onCopyInviteLink);

    dom.btnDebug?.addEventListener("click", showDebug);

    // Enter to load
    dom.idInput?.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){ e.preventDefault(); onLoad(); }
    });
    dom.tokenInput?.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){ e.preventDefault(); onLoad(); }
    });

    toast("待命");
    log("boot ok", { VERSION, GAS: CONFIG.GAS, BASE: CONFIG.BASE_URL });
  }

  bind();
})();