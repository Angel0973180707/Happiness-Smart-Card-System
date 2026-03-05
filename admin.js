/* ======================================
 * HSC Admin v517 (COMPLETE OVERWRITE)
 * - Paste customer message -> auto parse -> adminFind
 * - Pick best match -> adminMakeUpdateLink (7 days)
 * - Copy link
 * ====================================== */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    gasUrl: $("gasUrl"),
    adminSecret: $("adminSecret"),
    customerMsg: $("customerMsg"),
    btnFind: $("btnFind"),
    btnMakeUpdate: $("btnMakeUpdate"),
    btnCopy: $("btnCopy"),
    updateLink: $("updateLink"),
    resultList: $("resultList"),
    statusPill: $("statusPill"),
  };

  let picked = null; // {id,name,unit,title,phone,...}

  function setStatus(text, type){
    els.statusPill.textContent = text;
    els.statusPill.classList.remove("ok","err");
    if(type) els.statusPill.classList.add(type);
  }

  function getCfg(){
    const gas = (els.gasUrl.value || "").trim();
    const admin_secret = (els.adminSecret.value || "").trim();
    if(!gas) throw new Error("請先貼 GAS Exec URL");
    if(!admin_secret) throw new Error("請輸入 ADMIN_SECRET");
    return { gas, admin_secret };
  }

  function parseCustomerMsg(msg){
    const t = String(msg || "").trim().replace(/\s+/g, " ");
    const parts = t.split(" ").filter(Boolean);

    // heuristic:
    // - if has 3 digits -> phone last3
    // - else use first token as name, rest as keyword
    let name = "";
    let last3 = "";
    let keyword = "";

    for(const p of parts){
      if(/^\d{3}$/.test(p)) last3 = p;
    }

    if(parts.length){
      name = parts[0];
      keyword = parts.slice(1).join(" ");
    }

    // if user only pasted one token (name), keyword===""
    // we will search by name first.
    return { raw:t, name, last3, keyword };
  }

  async function apiGet(gas, params){
    const url = gas + "?" + new URLSearchParams(params).toString();
    const r = await fetch(url, { method:"GET", cache:"no-store" });
    const j = await r.json();
    return j;
  }

  function renderList(items){
    els.resultList.innerHTML = "";
    if(!items || !items.length){
      els.resultList.innerHTML = `<div class="item"><small class="err">沒有找到符合的名片</small></div>`;
      return;
    }

    items.forEach((it, idx) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <strong>${it.name || "(無名)"} <span class="mono" style="opacity:.75">(${it.id})</span></strong>
        <small>${it.unit || ""} ${it.title ? "｜"+it.title : ""}</small>
        <small class="mono">phone: ${it.phone || "-"} ｜ status: ${it.status || "-"} ｜ updated: ${it.updated_at || "-"}</small>
        <div style="height:8px"></div>
        <button class="btn" data-pick="${idx}">選這筆</button>
      `;
      els.resultList.appendChild(div);
    });

    els.resultList.querySelectorAll("[data-pick]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-pick"));
        picked = items[idx];
        els.btnMakeUpdate.disabled = false;
        els.btnCopy.disabled = false;
        els.updateLink.value = "";
        setStatus(`picked ${picked.id}`, "ok");
      });
    });
  }

  async function onFind(){
    try{
      setStatus("finding...", null);
      picked = null;
      els.btnMakeUpdate.disabled = true;
      els.btnCopy.disabled = true;
      els.updateLink.value = "";

      const { gas, admin_secret } = getCfg();
      const parsed = parseCustomerMsg(els.customerMsg.value);

      // build query string:
      // prefer "name + last3" or "name + keyword"
      let q = parsed.name;
      if(parsed.last3) q += " " + parsed.last3;
      else if(parsed.keyword) q += " " + parsed.keyword;

      q = q.trim();
      if(!q) throw new Error("請貼上客戶訊息（至少要有姓名）");

      const j = await apiGet(gas, {
        action: "adminFind",
        admin_secret,
        tenant: "angel",
        q
      });

      if(!j.ok) throw new Error(j.error || "adminFind failed");

      // if last3 exists, client-side re-rank by last3 match
      let items = j.items || [];
      if(parsed.last3){
        const last3 = parsed.last3;
        items = items.sort((a,b)=>{
          const aHit = String(a.phone||"").endsWith(last3) ? 0 : 1;
          const bHit = String(b.phone||"").endsWith(last3) ? 0 : 1;
          return aHit - bHit;
        });
      }

      renderList(items);

      // auto-pick first when only 1 result
      if(items.length === 1){
        picked = items[0];
        els.btnMakeUpdate.disabled = false;
        els.btnCopy.disabled = false;
        setStatus(`auto picked ${picked.id}`, "ok");
      }else{
        setStatus(`found ${items.length}`, "ok");
      }

    }catch(e){
      setStatus(String(e.message || e), "err");
    }
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      setStatus("copied ✅", "ok");
      return true;
    }catch(_){
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setStatus("copied ✅", "ok");
      return true;
    }
  }

  async function onMakeUpdate(){
    try{
      if(!picked || !picked.id) throw new Error("請先選一筆名片");
      setStatus("making link...", null);

      const { gas, admin_secret } = getCfg();

      const j = await apiGet(gas, {
        action: "adminMakeUpdateLink",
        admin_secret,
        tenant: "angel",
        id: picked.id,
        days: "7"
      });

      if(!j.ok) throw new Error(j.error || "adminMakeUpdateLink failed");

      els.updateLink.value = j.link || "";
      if(!els.updateLink.value) throw new Error("link empty");

      await copyText(els.updateLink.value);
      setStatus("update link ready ✅", "ok");
    }catch(e){
      setStatus(String(e.message || e), "err");
    }
  }

  async function onCopy(){
    try{
      const link = (els.updateLink.value || "").trim();
      if(!link) throw new Error("目前沒有可複製的更新連結");
      await copyText(link);
    }catch(e){
      setStatus(String(e.message || e), "err");
    }
  }

  function boot(){
    // default GAS from your screenshot (you can change)
    if(!els.gasUrl.value){
      els.gasUrl.value = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
    }
    setStatus("ready", null);

    els.btnFind.addEventListener("click", onFind);
    els.btnMakeUpdate.addEventListener("click", onMakeUpdate);
    els.btnCopy.addEventListener("click", onCopy);
  }

  window.addEventListener("DOMContentLoaded", boot);
})();