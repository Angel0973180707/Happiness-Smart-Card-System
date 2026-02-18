/**
 * Angel Card Frontend v376 (Complete Overwrite)
 * - Prefer GAS action=card (clean keys) ✅
 * - Fallback to action=public + robust mapping
 * - Sync theme to BOTH #app and #preview
 * - Better URL normalization (fix "讀到但連結消失")
 */

const VERSION = 376;
const API_URL = "https://script.google.com/macros/s/AKfycby74ta4CUFzkWcEfyPfoOMV9K93f-sIUzAxP6yECiadpVEzFUmk_JiHCFG_s2-ePHvJ/exec";

const state = {
  plan: "free",            // free | pro
  theme: "arch",           // arch | flat | dawn
  freeColor: "blue",       // pink | blue | orange | purple | green
  paper: "cotton",         // cotton | grain | linen | watercolor
  proColor: "deepSeaBlue", // 7 colors
  dataRaw: null,
  card: null
};

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $  = (sel, root = document) => root.querySelector(sel);

function normalize(v){ return (v == null ? "" : String(v)).trim(); }

/** More tolerant URL normalize */
function safeUrl(u){
  let s = normalize(u);
  if(!s) return "";

  // If user pasted just domain/path
  if(/^www\./i.test(s)) s = "https://" + s;

  // common link shortforms
  if(/^line\.me\//i.test(s)) s = "https://" + s;
  if(/^lin\.ee\//i.test(s)) s = "https://" + s;
  if(/^t\.me\//i.test(s)) s = "https://" + s;

  // accept
  if(/^https?:\/\//i.test(s)) return s;
  if(/^mailto:/i.test(s) || /^tel:/i.test(s) || /^line:/i.test(s)) return s;

  return "";
}

function splitMulti_(v){
  const s = normalize(v);
  if(!s) return [];
  return s.split(/\n|\r|,\s*/).map(x=>x.trim()).filter(Boolean);
}

/** pickField_: find first non-empty value by matching header keys */
function pickField_(row, testers){
  if(!row) return "";
  const keys = Object.keys(row);
  for(const t of testers){
    for(const k of keys){
      try{
        if(typeof t === "string"){
          if(k === t){
            const val = row[k];
            if(val != null && normalize(val) !== "") return val;
          }
        }else if(t instanceof RegExp){
          if(t.test(k)){
            const val = row[k];
            if(val != null && normalize(val) !== "") return val;
          }
        }else if(typeof t === "function"){
          if(t(k)){
            const val = row[k];
            if(val != null && normalize(val) !== "") return val;
          }
        }
      }catch(e){}
    }
  }
  return "";
}

/** Address -> map url */
function toMapUrlFromAddress(addr){
  const a = normalize(addr);
  if(!a) return "";
  if(/^https?:\/\//i.test(a)) return a;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}

/** Map sheet row (Chinese headers) -> UI card (fallback only) */
function mapRowToCard_(row){
  const name = pickField_(row, [/姓名/, /暱稱/, /稱呼/]);
  const title = pickField_(row, [/重要頭銜/, /頭銜/, /職稱/, /身份/]);
  const org = pickField_(row, [/單位名稱/, /單位/, /機構/, /品牌/]);

  const oneLine = pickField_(row, [
    /一句話定位/,
    /理念標語/,
    /標語/,
    /定位/,
    /一句話/,
    /你想服務誰/,
    /我想服務誰/
  ]);

  const tagsRaw = pickField_(row, [/服務項目/, /關鍵字/, /標籤/]);
  const tags = splitMulti_(tagsRaw).slice(0, 6);

  const photo = pickField_(row, [/個人專業形象照/, /形象照/, /頭像/, /主圖/]);
  const note = pickField_(row, [/備註/, /補充說明/, /簡介/, /自我介紹/]);

  const lineOA = safeUrl(pickField_(row, [
    /LINE\s*官方帳號連結/,
    /LINE.*官方/,
    /官方帳號/,
    /LINE\s*OA/
  ]));

  const site = safeUrl(pickField_(row, [
    /官網/,
    /網站/,
    /首頁/,
    /概念館/,
    /入口/
  ]));

  const form = safeUrl(pickField_(row, [
    /表單/,
    /訂製表單/,
    /預約表單/,
    /填表/,
    /Google\s*Form/
  ]));

  const v1 = safeUrl(pickField_(row, [/影音平台\s*1/, /YouTube/]));
  const v2 = safeUrl(pickField_(row, [/影音平台\s*2/, /抖音/, /TikTok/]));
  const v3 = pickField_(row, [/影音平台\s*3/, /地址/, /地點/]);
  const s1 = safeUrl(pickField_(row, [/社群平台\s*1/, /Facebook/]));
  const s2 = safeUrl(pickField_(row, [/社群平台\s*2/, /Instagram/]));
  const s3 = safeUrl(pickField_(row, [/社群平台\s*3/, /Thread/, /部落格/]));

  let address = "";
  let link3 = "";
  const v3n = normalize(v3);
  if(v3n && !/^https?:\/\//i.test(v3n)){
    address = v3n;
  }else{
    link3 = safeUrl(v3n);
  }

  const links = [v1, v2, link3, s1, s2, s3].filter(Boolean).slice(0, 6);

  return {
    name, title, org,
    oneLine,
    tags,
    photo,
    note,
    lineOA,
    site,
    form,
    address,
    mapUrl: toMapUrlFromAddress(address),
    links
  };
}

/** Fetch: prefer action=card */
async function fetchCardPreferred(){
  // 1) preferred clean endpoint
  {
    const url = API_URL + "?action=card";
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if(json && json.ok && json.card){
      return { mode:"card", payload: json.card, raw: json };
    }
  }

  // 2) fallback to public + mapping
  {
    const url = API_URL + "?action=public";
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if(!json || !json.ok) throw new Error("public not ok");
    return { mode:"public", payload: json.data || null, raw: json };
  }
}

/** Apply visual state to BOTH app + preview */
function applyVisualState(){
  const app = $("#app");
  const preview = $("#preview");

  if(app){
    app.dataset.plan = state.plan;
    app.dataset.theme = state.theme;

    if(state.plan === "free"){
      app.dataset.freeColor = state.freeColor;
      app.dataset.paper = state.paper;
      app.removeAttribute("data-pro-color");
      app.classList.remove("fx-glow","fx-rounded","fx-float","fx-glass","fx-stage","fx-magazine");
    }else{
      app.dataset.proColor = state.proColor;
      app.removeAttribute("data-free-color");
      app.removeAttribute("data-paper");
    }
  }

  // ✅ theme sync for structure layer (curve)
  if(preview){
    preview.dataset.theme = state.theme;
  }
}

/** Pro pack: color -> auto theme + effects */
function applyPremiumPack(){
  const app = $("#app");
  if(app){
    ["fx-glow","fx-rounded","fx-float","fx-glass","fx-stage","fx-magazine"].forEach(c=>app.classList.remove(c));
  }

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

  if(app){
    app.dataset.theme = state.theme;
    pack.fx.forEach(c=>app.classList.add(c));
  }

  const preview = $("#preview");
  if(preview) preview.dataset.theme = state.theme;

  $$(".seg__btn[data-theme]").forEach(b=>{
    b.classList.toggle("is-on", b.dataset.theme === state.theme);
  });
}

/** Render */
function renderCard(){
  const o = state.card || {};

  const pname = $("#pname");
  if(pname) pname.textContent = normalize(o.name) || "—";

  const ptitle = $("#ptitle");
  if(ptitle){
    const t = [normalize(o.title), normalize(o.org)].filter(Boolean).join("｜");
    ptitle.textContent = t || "—";
  }

  const ptags = $("#ptags");
  if(ptags){
    ptags.innerHTML = (o.tags || []).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
  }

  const pone = $("#pone");
  if(pone) pone.textContent = normalize(o.oneLine) || "—";

  const img = $("#avatarImg");
  const fb = $("#avatarFallback");
  if(img){
    const u = normalize(o.photo);
    if(u){
      img.src = u;
      img.style.display = "";
      if(fb) fb.style.display = "none";
    }else{
      img.removeAttribute("src");
      img.style.display = "none";
      if(fb) fb.style.display = "";
    }
  }

  const btnLine = $("#btnLine");
  if(btnLine){
    if(o.lineOA){
      btnLine.href = o.lineOA;
      btnLine.style.display = "";
    }else btnLine.style.display = "none";
  }

  const btnSite = $("#btnSite");
  if(btnSite){
    if(o.site){
      btnSite.href = o.site;
      btnSite.style.display = "";
    }else btnSite.style.display = "none";
  }

  const btnForm = $("#btnForm");
  if(btnForm){
    if(o.form){
      btnForm.href = o.form;
      btnForm.style.display = "";
    }else btnForm.style.display = "none";
  }

  const btnMap = $("#btnMap");
  if(btnMap){
    if(o.mapUrl){
      btnMap.style.display = "";
      btnMap.onclick = ()=> window.open(o.mapUrl, "_blank", "noopener");
    }else{
      btnMap.style.display = "none";
      btnMap.onclick = null;
    }
  }

  const platforms = $("#platforms");
  if(platforms){
    const links = (o.links || []).filter(Boolean).slice(0,6);
    platforms.innerHTML = links.map((url, i)=>{
      const label = (i < 3) ? `影音 ${i+1}` : `社群 ${i-2}`;
      return `<a class="linkchip" href="${escapeAttr(url)}" target="_blank" rel="noopener">${label}</a>`;
    }).join("");
  }

  const pnote = $("#pnote");
  if(pnote) pnote.textContent = normalize(o.note) || "";
}

/** Copy */
function bindCopy(){
  const btn = $("#btnCopy");
  if(!btn) return;
  btn.addEventListener("click", async ()=>{
    const o = state.card || {};
    const lines = [
      normalize(o.name),
      normalize(o.oneLine),
      o.lineOA ? `LINE OA：${o.lineOA}` : "",
      o.site ? `官網：${o.site}` : "",
      o.form ? `填表：${o.form}` : ""
    ].filter(Boolean).join("\n");

    try{
      await navigator.clipboard.writeText(lines);
      btn.classList.add("is-copied");
      setTimeout(()=>btn.classList.remove("is-copied"), 900);
    }catch(e){
      const ta = document.createElement("textarea");
      ta.value = lines;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  });
}

/** Delegated controls */
function bindDelegatedControls(){
  document.addEventListener("click", (ev)=>{
    const planBtn = ev.target.closest(".seg__btn[data-plan]");
    if(planBtn){
      state.plan = planBtn.dataset.plan;
      $$(".seg__btn[data-plan]").forEach(b=>b.classList.toggle("is-on", b === planBtn));
      if(state.plan === "pro") applyPremiumPack();
      applyVisualState();
      renderCard();
      return;
    }

    const themeBtn = ev.target.closest(".seg__btn[data-theme]");
    if(themeBtn){
      if(state.plan !== "free") return;
      state.theme = themeBtn.dataset.theme;
      $$(".seg__btn[data-theme]").forEach(b=>b.classList.toggle("is-on", b === themeBtn));
      applyVisualState();
      return;
    }

    const freeColorBtn = ev.target.closest(".sw[data-free-color]");
    if(freeColorBtn){
      state.freeColor = freeColorBtn.dataset.freeColor;
      $$(".sw[data-free-color]").forEach(b=>b.classList.toggle("is-on", b === freeColorBtn));
      applyVisualState();
      return;
    }

    const paperBtn = ev.target.closest(".chip[data-paper]");
    if(paperBtn){
      state.paper = paperBtn.dataset.paper;
      $$(".chip[data-paper]").forEach(b=>b.classList.toggle("is-on", b === paperBtn));
      applyVisualState();
      return;
    }

    const proColorBtn = ev.target.closest(".sw[data-pro-color]");
    if(proColorBtn){
      state.proColor = proColorBtn.dataset.proColor;
      $$(".sw[data-pro-color]").forEach(b=>b.classList.toggle("is-on", b === proColorBtn));
      applyPremiumPack();
      applyVisualState();
      return;
    }
  }, true);
}

/** Hidden admin tap */
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
      location.href = "./admin.html";
    }
  });
}

/** Utilities */
function escapeHtml(s){
  return String(s ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}
function escapeAttr(s){ return escapeHtml(s).replace(/'/g,"&#39;"); }

/** Init */
async function init(){
  // read initial dataset (avoid mismatch)
  const app = $("#app");
  if(app){
    state.plan = app.dataset.plan || state.plan;
    state.theme = app.dataset.theme || state.theme;
    state.freeColor = app.dataset.freeColor || state.freeColor;
    state.paper = app.dataset.paper || state.paper;
    state.proColor = app.dataset.proColor || state.proColor;
  }

  applyVisualState();
  bindDelegatedControls();
  bindHiddenAdmin();
  bindCopy();

  const hint = $("#hint");
  try{
    if(hint) hint.textContent = "門面資料讀取中…（試算表：小天使）";

    const got = await fetchCardPreferred();
    state.dataRaw = got.payload;

    if(got.mode === "card"){
      // ✅ clean keys directly
      const c = got.payload || {};
      state.card = {
        name: normalize(c.name),
        org: normalize(c.org),
        title: normalize(c.titles || c.title || ""),
        oneLine: normalize(c.tagline || c.oneLine || ""),
        tags: splitMulti_(c.services || "").slice(0, 6),
        photo: safeUrl(c.photo),
        note: normalize(c.note || ""),
        lineOA: safeUrl(c.lineOA || c.line_oa || ""),
        site: safeUrl(c.site || c.home || ""),
        form: safeUrl(c.form || c.orderForm || ""),
        address: normalize(c.address || ""),
        mapUrl: toMapUrlFromAddress(c.address || ""),
        links: (c.links || []).map(safeUrl).filter(Boolean).slice(0, 6)
      };
    }else{
      // fallback mapping
      state.card = mapRowToCard_(state.dataRaw);
    }

    renderCard();
    if(hint) hint.textContent = "門面資料已載入（樣版＝小天使）";
  }catch(e){
    if(hint) hint.textContent = "門面讀取失敗（請檢查 GAS / 試算表欄位）";
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", init);