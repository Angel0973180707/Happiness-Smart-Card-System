/* ==========================================
 * HSC Admin Workspace — admin.js v515.1 (COMPLETE OVERWRITE)
 * Goal: Minimal + Buttons always work
 * - Admin load prefers admin_secret (no token needed)
 * - Auto fill token back + remember token map
 * - Tries action=card / adminCard / adminGet (compat)
 * - GET only (avoid CORS preflight)
 *
 * ✅ v515.1 add:
 * - 一鍵取得邀請碼（填表連結 exp+sig）
 *   action=adminIssueFill&tenant=...&days=...&admin_secret=...
 * ========================================== */

(() => {
  "use strict";

  const VERSION = "515.1";

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
    TOKEN_MAP: "HSC_TOKEN_MAP",      // { [id]: token }
    LAST_ID: "HSC_ADMIN_LAST_ID",

    // ✅ invite pack cache
    LAST_INVITE_PACK: "HSC_LAST_INVITE_PACK"
  };

  const $ = (id) => document.getElementById(id);

  const dom = {
    versionText: $("versionText"),
    pillMsg: $("pillMsg"),

    idInput: $("cardId"),
    tokenInput: $("token"),
    adminSecretInput: $("admin_secret"),

    // ✅ invite fields
    tenantInput: $("tenant"),
    daysInput: $("invite_days"),
    inviteOut: $("invite_out"),
    pillInvite: $("pillInvite"),
    btnGetInvite: $("btnGetInvite"),
    btnCopyInvite: $("btnCopyInvite"),

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
    pvAvatar: $("pvAvatar")
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
  function toastInvite(msg){
    if(dom.pillInvite) dom.pillInvite.textContent = String(msg || "");
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

  // ✅ NEW: issue fill link (invite)
  async function adminIssueFill({ tenant, days, admin_secret }){
    const tries = [
      { action:"adminIssueFill", tenant, days, admin_secret },
      // 兼容：如果你未來改名，也能加在這裡
    ];
    let lastErr = null;
    for(const t of tries){
      try{ return await fetchJsonWithRetry(t); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("adminIssueFill failed");
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

  // ✅ invite pack helpers
  function setInvitePack_(packText){
    const t = String(packText || "").trim();
    setValue(dom.inviteOut, t);
    if(t){
      localStorage.setItem(STORAGE.LAST_INVITE_PACK, t);
      toastInvite("已取得 ✅");
    }else{
      localStorage.removeItem(STORAGE.LAST_INVITE_PACK);
      toastInvite("未取得");
    }
  }
  function getInvitePack_(){
    const t = getValue(dom.inviteOut);
    if(t) return t;
    return (localStorage.getItem(STORAGE.LAST_INVITE_PACK) || "").trim();
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

    const tenant = getValue(dom.tenantInput) || "angel";
    const days = getValue(dom.daysInput) || "3";
    const pack = getInvitePack_();

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
      `invite.tenant=${tenant}`,
      `invite.days=${days}`,
      `invite.pack=${pack ? "yes" : "no"}`,
      "",
      "Logs (last 120):",
      ...logs.slice(-120)
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

        // auto fill token if provided
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

  // ✅ NEW: invite actions
  async function onGetInvite(){
    const admin_secret = (getValue(dom.adminSecretInput) || "").trim();
    if(!admin_secret) return alert("取得邀請碼需要 admin_secret");

    const tenant = (getValue(dom.tenantInput) || "angel").trim() || "angel";
    let days = Number((getValue(dom.daysInput) || "3").trim());
    if(!Number.isFinite(days)) days = 3;
    days = Math.max(1, Math.min(30, days));
    setValue(dom.daysInput, String(days));

    try{
      toastInvite("取得中…");
      toast("取得邀請碼中…");
      log("invite.issue", { tenant, days });

      const r = await adminIssueFill({ tenant, days, admin_secret });

      const inviteCode = (r.invite_code || "").trim();
      const fillUrl = (r.fill_url || "").trim();
      if(!fillUrl) throw new Error("GAS 未回傳 fill_url（請確認 action=adminIssueFill 已上線）");

      const pack = [
        inviteCode ? `邀請碼：${inviteCode}` : "",
        `填表連結：${fillUrl}`
      ].filter(Boolean).join("\n");

      setInvitePack_(pack);

      // auto copy
      await copyText(pack);
      toast("邀請碼已複製 ✅");
      toastInvite("已取得 ✅");

    }catch(e){
      const msg = e && e.message ? e.message : String(e);
      toastInvite("取得失敗 ❌");
      toast("待命");
      alert("取得邀請碼失敗：\n" + msg);
      log("invite.fail", msg);
    }
  }

  async function onCopyInvite(){
    const pack = getInvitePack_();
    if(!pack) return alert("尚未取得邀請碼，請先按『一鍵取得邀請碼』");
    setValue(dom.inviteOut, pack);
    await copyText(pack);
    toastInvite("已複製 ✅");
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

    // preload invite pack
    const lastPack = (localStorage.getItem(STORAGE.LAST_INVITE_PACK) || "").trim();
    if(dom.inviteOut && lastPack && !getValue(dom.inviteOut)){
      dom.inviteOut.value = lastPack;
      toastInvite("已取得 ✅");
    }else{
      toastInvite(getValue(dom.inviteOut) ? "已取得 ✅" : "未取得");
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

    // ✅ invite binds
    dom.btnGetInvite?.addEventListener("click", onGetInvite);
    dom.btnCopyInvite?.addEventListener("click", onCopyInvite);

    dom.btnDebug?.addEventListener("click", showDebug);

    // Enter to load
    dom.idInput?.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){ e.preventDefault(); onLoad(); }
    });
    dom.tokenInput?.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){ e.preventDefault(); onLoad(); }
    });
    dom.adminSecretInput?.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){ e.preventDefault(); onLoad(); }
    });

    // Enter to get invite (on days)
    dom.daysInput?.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){ e.preventDefault(); onGetInvite(); }
    });

    // auto-load if id exists
    const idNow = (getValue(dom.idInput) || "").trim();
    if(idNow){
      setTimeout(()=> onLoad().catch(()=>{}), 200);
    }

    toast("待命");
    log("boot ok", { VERSION, GAS: CONFIG.GAS });
  }

  bind();
})();