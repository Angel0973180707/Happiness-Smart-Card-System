
/* ============================================================
   天使幸福智慧名片館 app.js
   v7.4.1-site-wrapper-stable
   完整覆蓋版 — 資料取得 + 呼叫唯一 renderer
============================================================ */
(function(){
  "use strict";

  const CONFIG = {
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    DEFAULT_ID: "TW0001",
    DEFAULT_TENANT: "angel",
    VERSION: "v7.4.1-site-wrapper-stable",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 3
  };

  const BUILTIN_ANNOUNCEMENTS = [
    { id:"builtin-feature", title:"產品特色", content:"天使幸福智慧名片是一個專為創業者、講師、服務業與個人品牌打造的數位名片入口系統。", status:"active", priority:10 },
    { id:"builtin-flow", title:"申請流程", content:"先申請表單邀請碼，再由客服提供表單連結與後續開通。", status:"active", priority:9 }
  ];

  function qs(id){ return document.getElementById(id); }
  function text(v){ return (v == null ? "" : String(v)).trim(); }
  function normalizeId_(s){
    const v = text(s).toUpperCase();
    if(!v) return "";
    if(/^TW\d{4}$/.test(v)) return v;
    if(/^\d{1,4}$/.test(v)) return "TW" + v.padStart(4, "0");
    if(/^TW\d{1,4}$/.test(v)) return "TW" + v.replace(/^TW/i, "").padStart(4, "0");
    return v;
  }
  function getSearchParams_(){ try{return new URLSearchParams(location.search || "");}catch(_e){return new URLSearchParams();} }
  function getIdFromUrl_(){ return getSearchParams_().get("id") || ""; }
  function safeJsonParse_(raw){
    let s = String(raw || "").trim();
    if(!s) return null;
    s = s.replace(/^\)\]\}'\s*\n?/, "").trim();
    try{ return JSON.parse(s); }catch(_e){}
    const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if(m){ try{ return JSON.parse(m[0]); }catch(_e){} }
    return null;
  }
  async function fetchWithTimeout_(url, timeoutMs){
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try{
      const res = await fetch(url, { method:"GET", cache:"no-store", redirect:"follow", signal:controller.signal });
      const txt = await res.text();
      const json = safeJsonParse_(txt);
      if(!json) throw new Error("Not JSON");
      return json;
    }finally{
      clearTimeout(timer);
    }
  }
  async function fetchJsonRobust_(url){
    let lastErr = null;
    for(let i=0;i<=CONFIG.RETRY;i++){
      try{ return await fetchWithTimeout_(url, CONFIG.FETCH_TIMEOUT_MS); }
      catch(err){ lastErr = err; await new Promise(r=>setTimeout(r, 480 + i * 420)); }
    }
    throw lastErr || new Error("Fetch failed");
  }
  function buildCardApiUrl_(id){
    const cid = normalizeId_(id) || CONFIG.DEFAULT_ID;
    const u = new URL(CONFIG.GAS);
    u.searchParams.set("action","getCard");
    u.searchParams.set("id",cid);
    u.searchParams.set("tenant",CONFIG.DEFAULT_TENANT);
    u.searchParams.set("ts",String(Date.now()));
    u.searchParams.set("v",CONFIG.VERSION);
    return u.toString();
  }
  function buildAnnouncementApiUrl_(){
    const u = new URL(CONFIG.GAS);
    u.searchParams.set("action","getAnnouncements");
    u.searchParams.set("tenant",CONFIG.DEFAULT_TENANT);
    u.searchParams.set("ts",String(Date.now()));
    u.searchParams.set("v",CONFIG.VERSION);
    return u.toString();
  }
  function extractCardRow_(payload){
    return payload?.item || payload?.row || payload?.card || payload?.data || null;
  }
  function normalizeAnnouncementItems_(payload){
    if(Array.isArray(payload)) return payload;
    if(!payload || typeof payload !== "object") return [];
    return payload.announcements || payload.items || payload.data || payload.rows || [];
  }
  function renderAnnouncementPanels_(items){
    const panels = Array.from(document.querySelectorAll("[data-announcement-panel]"));
    if(!panels.length) return;
    if(!items || !items.length){
      panels.forEach(p=>p.style.display="none");
      return;
    }
    const item = items[0];
    panels.forEach(panel=>{
      panel.style.display = "";
      const titleEl = panel.querySelector("[data-announcement-title]");
      const textEl = panel.querySelector("[data-announcement-text]");
      const counterEl = panel.querySelector("[data-announcement-counter]");
      if(titleEl) titleEl.textContent = item.title || "公告";
      if(textEl) textEl.textContent = text(item.content || "").slice(0, 60);
      if(counterEl) counterEl.textContent = `1 / ${items.length}`;
    });
  }
  async function fetchAndRenderAnnouncements_(){
    try{
      const payload = await fetchJsonRobust_(buildAnnouncementApiUrl_());
      const items = normalizeAnnouncementItems_(payload);
      renderAnnouncementPanels_(items.length ? items : BUILTIN_ANNOUNCEMENTS);
    }catch(_e){
      renderAnnouncementPanels_(BUILTIN_ANNOUNCEMENTS);
    }
  }
  function renderCard_(row){
    const root = qs("livePreviewCard");
    if(!root || !window.HSCCardRenderer) return;
    window.HSCCardRenderer.render(row, {
      root,
      mode: "site",
      disableRemote: false,
      disableShareQr: false,
      disableInvite: false,
      version: CONFIG.VERSION
    });
  }
  async function boot_(){
    try{
      fetchAndRenderAnnouncements_();
      const id = getIdFromUrl_() || CONFIG.DEFAULT_ID;
      const payload = await fetchJsonRobust_(buildCardApiUrl_(id));
      const row = extractCardRow_(payload);
      if(!row || typeof row !== "object") throw new Error("卡片資料為空");
      renderCard_(row);
    }catch(err){
      console.error("[HSC] boot failed:", err);
      const root = qs("livePreviewCard");
      if(root && window.HSCCardRenderer){
        window.HSCCardRenderer.render({
          id:"ERROR",
          name:"資料載入失敗",
          unit:"請稍後再試",
          title:"",
          plan:"free",
          color:"c1",
          style:"s1",
          paper:"f1"
        }, {
          root,
          mode:"site",
          disableShareQr:true,
          version: CONFIG.VERSION
        });
      }
    }
  }
  document.addEventListener("DOMContentLoaded", boot_);
})();
