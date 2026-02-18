/**
 * Angel Card Frontend v374-clean (Complete Overwrite)
 * - Reads GAS public facade (fixed TW0001 by your GAS v364):
 *   API_URL?action=public
 * - A Free:
 *   - user can choose theme: arch / flat / dawn
 *   - user can choose freeColor(5) + paper(4)
 *   - avatar: fixed CIRCLE, no glow/float/rounded-square (CSS enforces)
 * - B Pro:
 *   - user can ONLY choose proColor(7)
 *   - theme + avatar frame + FX are auto-applied by proColor
 * - Hidden admin entry: tap version 7 times quickly -> ./admin.html (reserved)
 */

const VERSION = 374;

// ✅ your GAS exec
const API_URL = "https://script.google.com/macros/s/AKfycby74ta4CUFzkWcEfyPfoOMV9K93f-sIUzAxP6yECiadpVEzFUmk_JiHCFG_s2-ePHvJ/exec";

const state = {
  plan: "free",            // free | pro
  theme: "arch",           // arch | flat | dawn  (A only)
  freeColor: "blue",       // pink | blue | orange | purple | green
  paper: "cotton",         // cotton | grain | linen | watercolor
  proColor: "deepSeaBlue", // 7 colors
  dataRaw: null,
  data: null
};

const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));
const $  = (sel, root=document)=> root.querySelector(sel);
function normalize(s){ return (s==null?"":String(s)).trim(); }
function safeUrl(u){
  const s = normalize(u);
  if(!s) return "";
  if(/^https?:\/\//i.test(s)) return s;
  if(/^mailto:/i.test(s) || /^tel:/i.test(s)) return s;
  return "";
}

/* ========= Sheet field mapping (Chinese headers -> canonical) ========= */
function pickField_(row, testers){
  if(!row) return "";
  const keys = Object.keys(row);
  for(const t of testers){
    for(const k of keys){
      try{
        if(typeof t === "string"){
          if(k === t) { const v=row[k]; if(v!=null && String(v).trim()!=="") return v; }
        } else if(t instanceof RegExp){
          if(t.test(k)) { const v=row[k]; if(v!=null && String(v).trim()!=="") return v; }
        } else if(typeof t === "function"){
          if(t(k)) { const v=row[k]; if(v!=null && String(v).trim()!=="") return v; }
        }
      }catch(e){}
    }
  }
  return "";
}

function splitMulti_(v){
  const s = normalize(v);
  if(!s) return [];
  return s.split(/\n|\r|,\s*/).map(x=>x.trim()).filter(Boolean);
}

function toMapUrlFromAddress(addr){
  const a = normalize(addr);
  if(!a) return "";
  if(/^https?:\/\//i.test(a)) return a;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}

function mapRowToCard_(row){
  // row is json.data from GAS (public) with original headers
  const name    = pickField_(row, [/姓名/]);
  const org     = pickField_(row, [/單位名稱/, /單位/]);
  const tagline = pickField_(row, [/理念標語/, /標語/]);

  const photo = pickField_(row, [/個人專業形象照/, /形象照/, /主圖/]);
  const logo  = pickField_(row, [/品牌\s*Logo/, /Logo/]);

  const v1 = pickField_(row, [/影音平台\s*1/]);
  const v2 = pickField_(row, [/影音平台\s*2/]);
  const v3 = pickField_(row, [/影音平台\s*3/]); // might be address or link
  const s1 = pickField_(row, [/社群平台\s*1/]);
  const s2 = pickField_(row, [/社群平台\s*2/]);
  const s3 = pickField_(row, [/社群平台\s*3/]);

  // address detection: if not url and contains typical address chars, treat as address
  let address = "";
  let link3 = "";
  const v3n = normalize(v3);
  if(v3n && !/^https?:\/\//i.test(v3n)) address = v3n;
  else link3 = v3n;

  const links = [v1, v2, link3, s1, s2, s3].map(safeUrl).filter(Boolean).slice(0, 6);

  const lineOA   = pickField_(row, [/LINE\s*官方帳號連結/, /官方帳號/]);
  const site     = pickField_(row, [/官網/, /網站/, /門面/]);
  const formLink = pickField_(row, [/表單/, /填表/]);
  const oneLine  = pickField_(row, [/一句話定位/, /定位/]);

  return {
    name: normalize(name),
    org: normalize(org),
    tagline: normalize(tagline),
    oneLine: normalize(oneLine),
    photo: normalize(photo),
    logo: normalize(logo),
    links,
    address,
    mapUrl: toMapUrlFromAddress(address),
    lineOA: safeUrl(lineOA),
    site: safeUrl(site),
    form: safeUrl(formLink)
  };
}

/* ========= Visual state ========= */
function applyVisualState(){
  const app = $("#app");
  if(!app) return;

  app.dataset.plan = state.plan;

  // A Free can set theme; B Pro theme is auto
  app.dataset.theme = state.theme;

  if(state.plan === "free"){
    app.dataset.freeColor = state.freeColor;
    app.dataset.paper = state.paper;
    app.removeAttribute("data-pro-color");

    app.classList.remove("fx-glow","fx-rounded","fx-float","fx-glass","fx-stage","fx-magazine");
  } else {
    app.dataset.proColor = state.proColor;
    app.removeAttribute("data-free-color");
    app.removeAttribute("data-paper");
  }
}

function applyPremiumPack(){
  const app = $("#app");
  if(!app) return;

  ["fx-glow","fx-rounded","fx-float","fx-glass","fx-stage","fx-magazine"].forEach(c=>app.classList.remove(c));

  // ✅ Pro: each color auto decides theme + fx (3 base structures still: arch/flat/dawn)
  const map = {
    deepSeaBlue:    { theme:"arch", fx:["fx-glow","fx-stage"] },
    creamyMist:     { theme:"flat", fx:["fx-rounded","fx-magazine"] },
    graphiteGray:   { theme:"flat", fx:["fx-float"] },
    mistPurpleGray: { theme:"dawn", fx:["fx-glow"] },
    caramelBrown:   { theme:"arch", fx:["fx-rounded","fx-magazine"] },
    inkGreen:       { theme:"dawn", fx:["fx-glow","fx-glass"] },
    warmGrayBlue:   { theme:"flat", fx:["fx-float","fx-glass"] },
  };

  const pack = map[state.proColor] || map.deepSeaBlue;

  state.theme = pack.theme;
  app.dataset.theme = state.theme;

  pack.fx.forEach(c=>app.classList.add(c));

  // sync theme segment buttons (visual only; still not user-selectable in B)
  $$(".seg__btn[data-theme]").forEach(b=>{
    b.classList.toggle("is-on", b.dataset.theme === state.theme);
  });
}

/* ========= Data fetch ========= */
async function fetchPublic(){
  const url = API_URL + "?action=public";
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if(!json || !json.ok) throw new Error("public not ok");
  return json.data || null;
}

/* ========= Render ========= */
function setText(sel, v, fallback="—"){
  const el = $(sel);
  if(!el) return;
  const s = normalize(v);
  el.textContent = s || fallback;
}

function setImg(sel, url){
  const el = $(sel);
  if(!el) return;
  const u = normalize(url);
  if(u){
    el.src = u;
    el.style.display = "";
    // hide fallback
    const fb = $("#avatarFallback");
    if(fb) fb.style.display = "none";
  } else {
    el.removeAttribute("src");
    el.style.display = "none";
    const fb = $("#avatarFallback");
    if(fb) fb.style.display = "";
  }
}

function renderLinks(o){
  const el = $("#platforms");
  if(!el) return;
  const links = (o && o.links) ? o.links.filter(Boolean) : [];
  const esc = (s)=>String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const chips = [];
  for(let i=0;i<links.length && i<6;i++){
    const url = links[i];
    const label = (i<3) ? `影音 ${i+1}` : `社群 ${i-2}`;
    chips.push(`<a class="linkchip" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`);
  }
  el.innerHTML = chips.join("");
}

function renderCard(){
  const o = state.data || {};

  setText("#pname", o.name || "小天使", "小天使");
  setText("#ptitle", o.org || "—", "—");
  setText("#pone", o.oneLine || "—", "—");

  setImg("#avatarImg", o.photo);

  // buttons: LINE OA / site / form
  const btnLine = $("#btnLine");
  const btnSite = $("#btnSite");
  const btnForm = $("#btnForm");
  if(btnLine){
    if(o.lineOA){ btnLine.href = o.lineOA; btnLine.style.display=""; }
    else { btnLine.style.display="none"; }
  }
  if(btnSite){
    if(o.site){ btnSite.href = o.site; btnSite.style.display=""; }
    else { btnSite.style.display="none"; }
  }
  if(btnForm){
    if(o.form){ btnForm.href = o.form; btnForm.style.display=""; }
    else { btnForm.style.display="none"; }
  }

  // map button (only if address)
  const btnMap = $("#btnMap");
  if(btnMap){
    if(o.mapUrl){
      btnMap.style.display="";
      btnMap.onclick = ()=> window.open(o.mapUrl, "_blank", "noopener");
    } else {
      btnMap.style.display="none";
      btnMap.onclick = null;
    }
  }

  renderLinks(o);

  const hint = $("#hint");
  if(hint){
    hint.textContent = `已載入樣版：${o.name || "小天使"}（TW0001）`;
  }
}

/* ========= Copy ========= */
function bindCopy(){
  const btn = $("#btnCopy");
  if(!btn) return;
  btn.addEventListener("click", async ()=>{
    const o = state.data || {};
    const lines = [
      `姓名：${o.name || ""}`,
      `一句話：${o.oneLine || ""}`,
      o.lineOA ? `LINE 官方帳號：${o.lineOA}` : "",
      o.site   ? `官網入口：${o.site}` : "",
      o.form   ? `填表：${o.form}` : ""
    ].filter(Boolean).join("\n");

    try{
      await navigator.clipboard.writeText(lines);
      const note = $("#pnote");
      if(note) note.textContent = "已複製";
      setTimeout(()=>{ if(note) note.textContent=""; }, 900);
    }catch(e){
      // fallback
      const ta = document.createElement("textarea");
      ta.value = lines;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      const note = $("#pnote");
      if(note) note.textContent = "已複製";
      setTimeout(()=>{ if(note) note.textContent=""; }, 900);
    }
  });
}

/* ========= Controls (delegated; prevent “buttons not clickable”) ========= */
function bindDelegatedControls(){
  document.addEventListener("click", (ev)=>{
    const planBtn = ev.target.closest(".seg__btn[data-plan]");
    if(planBtn){
      state.plan = planBtn.dataset.plan;
      $$(".seg__btn[data-plan]").forEach(b=>b.classList.toggle("is-on", b===planBtn));

      if(state.plan === "pro"){
        applyPremiumPack();
      } else {
        // Free: keep current theme user chosen
        $$(".seg__btn[data-theme]").forEach(b=>b.classList.toggle("is-on", b.dataset.theme===state.theme));
      }

      applyVisualState();
      return;
    }

    const themeBtn = ev.target.closest(".seg__btn[data-theme]");
    if(themeBtn){
      // ✅ A only
      if(state.plan !== "free") return;
      state.theme = themeBtn.dataset.theme;
      $$(".seg__btn[data-theme]").forEach(b=>b.classList.toggle("is-on", b===themeBtn));
      applyVisualState();
      return;
    }

    const freeColorBtn = ev.target.closest(".sw[data-free-color]");
    if(freeColorBtn){
      if(state.plan !== "free") return;
      state.freeColor = freeColorBtn.dataset.freeColor;
      $$(".sw[data-free-color]").forEach(b=>b.classList.toggle("is-on", b===freeColorBtn));
      applyVisualState();
      return;
    }

    const paperBtn = ev.target.closest(".chip[data-paper]");
    if(paperBtn){
      if(state.plan !== "free") return;
      state.paper = paperBtn.dataset.paper;
      $$(".chip[data-paper]").forEach(b=>b.classList.toggle("is-on", b===paperBtn));
      applyVisualState();
      return;
    }

    const proColorBtn = ev.target.closest(".sw[data-pro-color]");
    if(proColorBtn){
      if(state.plan !== "pro") return;
      state.proColor = proColorBtn.dataset.proColor;
      $$(".sw[data-pro-color]").forEach(b=>b.classList.toggle("is-on", b===proColorBtn));
      applyPremiumPack();
      applyVisualState();
      return;
    }
  }, true);
}

/* ========= Hidden admin entry ========= */
function bindHiddenAdmin(){
  const el = $("#versionTap");
  if(!el) return;
  let taps = 0;
  let t0 = 0;
  el.addEventListener("click", ()=>{
    const now = Date.now();
    if(now - t0 > 1500) taps = 0;
    t0 = now;
    taps += 1;
    if(taps >= 7){
      taps = 0;
      location.href = "./admin.html"; // reserved
    }
  });
}

/* ========= init ========= */
async function init(){
  applyVisualState();
  bindDelegatedControls();
  bindHiddenAdmin();
  bindCopy();

  try{
    state.dataRaw = await fetchPublic();      // GAS public fixed TW0001
    state.data = mapRowToCard_(state.dataRaw);
    renderCard();
  }catch(e){
    const hint = $("#hint");
    if(hint) hint.textContent = "門面資料讀取失敗（請確認 GAS public 是否可開啟）";
  }
}

document.addEventListener("DOMContentLoaded", init);