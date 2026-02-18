/**
 * Angel Card Frontend v372 (Complete Overwrite)
 * - Facade reads GAS public: https://script.google.com/macros/s/AKfycby74ta4CUFzkWcEfyPfoOMV9K93f-sIUzAxP6yECiadpVEzFUmk_JiHCFG_s2-ePHvJ/exec?action=public
 * - Uses STANDARDIZED keys from GAS v365+:
 *   name, org, tagline, photo, logo, links[6], address/map,
 *   line_friend, line_oa, email, phone, q1/a1/q2/a2
 * - Facade sample = TW0001 (fixed by GAS), no URL params.
 * - Plan logic:
 *   A Free: user selects theme(arch/flat/dawn) + color(5) + paper(4); avatar fixed circle, no glow/floating.
 *   B Pro : user selects 7 colors; each color auto-picks theme + avatar frame + effects.
 * - Hidden admin entry reserved: tap version 7 times quickly -> /admin.html
 */

const VERSION = 374;
const API_URL = "https://script.google.com/macros/s/AKfycby74ta4CUFzkWcEfyPfoOMV9K93f-sIUzAxP6yECiadpVEzFUmk_JiHCFG_s2-ePHvJ/exec";

const state = {
  plan: "free",           // free | pro
  theme: "dawn",          // arch | flat | dawn
  freeColor: "blue",      // pink | blue | orange | purple | green
  paper: "cotton",        // cotton | grain | linen | watercolor
  proColor: "deepSeaBlue",// 7 colors
  data: null
};

// ===== Sheet field mapping (Chinese headers -> canonical) =====
function pickField_(row, testers){
  if(!row) return "";
  const keys = Object.keys(row);
  for(const t of testers){
    for(const k of keys){
      try{
        if(typeof t === "string"){
          if(k === t) { const v = row[k]; if(v!=null && String(v).trim()!=="") return v; }
        } else if(t instanceof RegExp){
          if(t.test(k)) { const v = row[k]; if(v!=null && String(v).trim()!=="") return v; }
        } else if(typeof t === "function"){
          if(t(k)) { const v = row[k]; if(v!=null && String(v).trim()!=="") return v; }
        }
      }catch(e){}
    }
  }
  return "";
}

function splitMulti_(v){
  const s = normalize(v);
  if(!s) return [];
  // allow newline or comma separated (drive links list)
  return s.split(/\n|\r|,\s*/).map(x=>x.trim()).filter(Boolean);
}

function mapRowToCard_(row){
  // row is json.data from GAS (public) with original headers
  const name = pickField_(row, [/姓名/]);
  const org = pickField_(row, [/單位名稱/, /單位/]);
  const tagline = pickField_(row, [/理念標語/, /標語/]);
  const services = pickField_(row, [/服務項目/]);
  const titles = pickField_(row, [/重要頭銜/, /獎銜/]);

  const photo = pickField_(row, [/個人專業形象照/, /形象照/, /主圖/]);
  const logo  = pickField_(row, [/品牌\s*Logo/, /Logo/]);
  const imgsRaw = pickField_(row, [/產品或品牌或活動照片最多3張/, /活動照片/, /最多3張/]);
  const imgs = splitMulti_(imgsRaw).slice(0,3);

  const wechat = pickField_(row, [/微信\s*ID/, /微信/]);

  const v1 = pickField_(row, [/影音平台\s*1/]);
  const v2 = pickField_(row, [/影音平台\s*2/]);
  const v3 = pickField_(row, [/影音平台\s*3/, /地址/]); // v3 might be address
  const s1 = pickField_(row, [/社群平台\s*1/]);
  const s2 = pickField_(row, [/社群平台\s*2/]);
  const s3 = pickField_(row, [/社群平台\s*3/]);

  // address: if v3 looks like address (contains 市 or 路 etc), treat as address; else treat as link
  let address = "";
  let link3 = "";
  const v3n = normalize(v3);
  if(v3n && !/^https?:\/\//i.test(v3n)){
    address = v3n;
  } else {
    link3 = v3n;
  }

  const links = [v1,v2,link3,s1,s2,s3].map(safeUrl).filter(Boolean).slice(0,6);

  const lineDM = pickField_(row, [/私訊\s*LINE\s*連結/, /私訊LINE/]);
  const lineOA = pickField_(row, [/LINE\s*官方帳號連結/, /官方帳號/]);

  const email = pickField_(row, [/一鍵聯繫\s*Email/, /Email/]);
  const phone = pickField_(row, [/一鍵聯繫電話/, /電話/]);

  const q1 = pickField_(row, [/客戶常見提問\s*1/, /Q1/]);
  const a1 = pickField_(row, [/專業解答\s*1/, /A1/]);
  const q2 = pickField_(row, [/客戶常見提問\s*2/, /Q2/]);
  const a2 = pickField_(row, [/專業解答2/, /A2/]);

  return {
    name, org, tagline,
    services, titles,
    photo, logo, imgs,
    wechat,
    links,
    address,
    lineDM: safeUrl(lineDM),
    lineOA: safeUrl(lineOA),
    email: normalize(email),
    phone: normalize(phone),
    qa: [{q:q1,a:a1},{q:q2,a:a2}].filter(x=>normalize(x.q)||normalize(x.a))
  };
}



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

function detectIcon(url){
  const u = normalize(url).toLowerCase();
  if(!u) return "🔗";
  if(u.includes("youtube.com") || u.includes("youtu.be") || u.includes("shorts") ||
     u.includes("vimeo.com") || u.includes("bilibili") || u.includes("tiktok.com") || u.includes("douyin")) return "▶";
  if(u.includes("facebook.com") || u.includes("fb.com")) return "f";
  if(u.includes("instagram.com")) return "◎";
  if(u.includes("line.me") || u.startsWith("line://")) return "💚";
  if(u.includes("google.com/maps") || u.includes("goo.gl/maps") || u.includes("maps.app.goo.gl")) return "🗺";
  return "🔗";
}

function toMapUrlFromAddress(addr){
  const a = normalize(addr);
  if(!a) return "";
  if(/^https?:\/\//i.test(a)) return a;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}

// ===== Visual state =====
function applyVisualState(){
  const app = $("#app");
  if(!app) return;
  app.dataset.plan = state.plan;
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
  // clear
  ["fx-glow","fx-rounded","fx-float","fx-glass","fx-stage","fx-magazine"].forEach(c=>app.classList.remove(c));

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

  // sync theme segment buttons (visual only)
  $$(".seg__btn[data-theme]").forEach(b=>b.classList.toggle("is-on", b.dataset.theme===state.theme));
}

// ===== Data fetch =====
async function fetchPublic(){
  const url = API_URL + "?action=public";
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if(!json || !json.ok) throw new Error("public not ok");
  return json.data || null;
}

// ===== Render =====
function setText(id, v){
  const el = $(id);
  if(el) el.textContent = normalize(v) || "—";
}
function setImg(sel, url){
  const el = $(sel);
  const u = normalize(url);
  if(!el) return;
  if(u){
    el.src = u;
    el.style.display = "";
  } else {
    el.removeAttribute("src");
    el.style.display = "none";
  }
}

function renderPlatforms(o){
  const el = $("#platforms");
  if(!el) return;

  const links = (o && o.links) ? o.links.filter(Boolean) : [];
  const chips = [];

  const esc = (s)=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  for(let i=0;i<links.length && i<6;i++){
    const url = links[i];
    const label = (i<3) ? `影音 ${i+1}` : `社群 ${i-2}`;
    chips.push(`<a class="linkchip" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`);
  }

  el.innerHTML = chips.join("");
}



function renderContacts(o){
  const lineOA = safeUrl(o?.line_oa || "");
  const lineFriend = safeUrl(o?.line_friend || "");
  const email = normalize(o?.email || "");
  const phone = normalize(o?.phone || "");

  const btnOA = $("#btnLineOA");
  const btnFriend = $("#btnLineFriend");
  const btnEmail = $("#btnEmail");
  const btnPhone = $("#btnPhone");

  if(btnOA){
    if(lineOA){ btnOA.href = lineOA; btnOA.style.display=""; $("#txtLineOA").textContent = "點我加入"; }
    else { btnOA.style.display="none"; }
  }
  if(btnFriend){
    if(lineFriend){ btnFriend.href = lineFriend; btnFriend.style.display=""; $("#txtLineFriend").textContent = "點我私訊"; }
    else { btnFriend.style.display="none"; }
  }
  if(btnEmail){
    if(email){ btnEmail.href = "mailto:" + email; btnEmail.style.display=""; $("#txtEmail").textContent = email; }
    else { btnEmail.style.display="none"; }
  }
  if(btnPhone){
    if(phone){ btnPhone.href = "tel:" + phone; btnPhone.style.display=""; $("#txtPhone").textContent = phone; }
    else { btnPhone.style.display="none"; }
  }
}

function renderCard(){
  const o = state.data || {};

  // Basic fields (best-effort selectors; keep existing classnames)
  const nameEl = $(".pname");
  if(nameEl) nameEl.textContent = normalize(o.name) || "—";
  const orgEl = $(".porg");
  if(orgEl) orgEl.textContent = normalize(o.org) || "—";
  const tagEl = $(".ptagline");
  if(tagEl) tagEl.textContent = normalize(o.tagline) || "";

  // Images: try common ids/classes
  setImg("#avatarImg", o.photo);
  setImg("#logoImg", o.logo);

  renderPlatforms(o);
  renderContacts(o);

  // FAQ
  setText("#q1", o.q1);
  setText("#a1", o.a1);
  setText("#q2", o.q2);
  setText("#a2", o.a2);
}

// ===== Controls =====
function bindPlan(){
  $$(".seg__btn[data-plan]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.plan = btn.dataset.plan;
      $$(".seg__btn[data-plan]").forEach(b=>b.classList.toggle("is-on", b===btn));
      if(state.plan === "pro") applyPremiumPack();
      applyVisualState();
      renderCard();
    });
  });
}

function bindThemeFree(){
  $$(".seg__btn[data-theme]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(state.plan !== "free") return; // pro 不讓選
      state.theme = btn.dataset.theme;
      $$(".seg__btn[data-theme]").forEach(b=>b.classList.toggle("is-on", b===btn));
      applyVisualState();
    });
  });
}

function bindComposer(){
  // Free colors
  $$(".sw[data-free-color]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.freeColor = btn.dataset.freeColor;
      $$(".sw[data-free-color]").forEach(b=>b.classList.toggle("is-on", b===btn));
      applyVisualState();
    });
  });

  // Papers
  $$(".chip[data-paper]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.paper = btn.dataset.paper;
      $$(".chip[data-paper]").forEach(b=>b.classList.toggle("is-on", b===btn));
      applyVisualState();
    });
  });

  // Pro colors
  $$(".sw[data-pro-color]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.proColor = btn.dataset.proColor;
      $$(".sw[data-pro-color]").forEach(b=>b.classList.toggle("is-on", b===btn));
      applyPremiumPack();
      applyVisualState();
    });
  });
}

// Extra-safe delegated binding (fixes "buttons not clickable" on some mobile browsers)
function bindDelegatedControls(){
  document.addEventListener('click', (ev)=>{
    const planBtn = ev.target.closest('.seg__btn[data-plan]');
    if(planBtn){
      state.plan = planBtn.dataset.plan;
      $$('.seg__btn[data-plan]').forEach(b=>b.classList.toggle('is-on', b===planBtn));
      if(state.plan === 'pro') applyPremiumPack();
      applyVisualState();
      renderCard();
      return;
    }

    const themeBtn = ev.target.closest('.seg__btn[data-theme]');
    if(themeBtn){
      if(state.plan !== 'free') return;
      state.theme = themeBtn.dataset.theme;
      $$('.seg__btn[data-theme]').forEach(b=>b.classList.toggle('is-on', b===themeBtn));
      applyVisualState();
      return;
    }

    const freeColorBtn = ev.target.closest('.sw[data-free-color]');
    if(freeColorBtn){
      state.freeColor = freeColorBtn.dataset.freeColor;
      $$('.sw[data-free-color]').forEach(b=>b.classList.toggle('is-on', b===freeColorBtn));
      applyVisualState();
      return;
    }

    const paperBtn = ev.target.closest('.chip[data-paper]');
    if(paperBtn){
      state.paper = paperBtn.dataset.paper;
      $$('.chip[data-paper]').forEach(b=>b.classList.toggle('is-on', b===paperBtn));
      applyVisualState();
      return;
    }

    const proColorBtn = ev.target.closest('.sw[data-pro-color]');
    if(proColorBtn){
      state.proColor = proColorBtn.dataset.proColor;
      $$('.sw[data-pro-color]').forEach(b=>b.classList.toggle('is-on', b===proColorBtn));
      applyPremiumPack();
      applyVisualState();
      return;
    }
  }, true);
}

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
      // reserved backend entry
      location.href = "./admin.html";
    }
  });
}

async function init(){
  applyVisualState();
  bindDelegatedControls();
  bindPlan();
  bindThemeFree();
  bindComposer();
  bindHiddenAdmin();

  try {
    state.dataRaw = await fetchPublic();
    state.data = mapRowToCard_(state.dataRaw);
    renderCard();
  } catch (e) {
    // keep quiet: facade must be stable
  }
}

document.addEventListener("DOMContentLoaded", init);
