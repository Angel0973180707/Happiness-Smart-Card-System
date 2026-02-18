/**
 * Angel Card Frontend v375 (Complete Overwrite)
 * - Reads GAS public (fixed TW0001)
 * - A Free: user chooses theme + color + paper (NO pro FX)
 * - B Pro : user chooses 7 colors; color auto decides theme + fx
 * - Sync theme to BOTH #app and #preview (fix "樣版和版型沒聯動")
 * - Robust sheet-field mapping (fix "小天使資料沒完全讀取")
 */

const VERSION = 375;
const API_URL = "https://script.google.com/macros/s/AKfycby74ta4CUFzkWcEfyPfoOMV9K93f-sIUzAxP6yECiadpVEzFUmk_JiHCFG_s2-ePHvJ/exec";

const state = {
  plan: "free",            // free | pro
  theme: "dawn",           // arch | flat | dawn
  freeColor: "blue",       // pink | blue | orange | purple | green
  paper: "cotton",         // cotton | grain | linen | watercolor
  proColor: "deepSeaBlue", // 7 colors
  dataRaw: null,
  card: null
};

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $  = (sel, root = document) => root.querySelector(sel);

function normalize(v){ return (v == null ? "" : String(v)).trim(); }
function safeUrl(u){
  const s = normalize(u);
  if(!s) return "";
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

/** Heuristic: treat non-url as address (for map) */
function toMapUrlFromAddress(addr){
  const a = normalize(addr);
  if(!a) return "";
  if(/^https?:\/\//i.test(a)) return a;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}

/** Map sheet row (Chinese headers) -> UI card */
function mapRowToCard_(row){
  // 基本
  const name = pickField_(row, [/姓名/, /暱稱/, /稱呼/]);
  const title = pickField_(row, [/重要頭銜/, /頭銜/, /職稱/, /身份/]);
  const org = pickField_(row, [/單位名稱/, /單位/, /機構/, /品牌/]);

  // 一句話定位（你要放在「一句話定位」區）
  const oneLine =
    pickField_(row, [
      /一句話定位/,
      /定位/,
      /理念標語/,
      /標語/,
      /一句話/,
      /我想服務誰/,
      /你想服務誰/
    ]);

  // 服務/補充
  const tagsRaw = pickField_(row, [/服務項目/, /關鍵字/, /標籤/]);
  const tags = splitMulti_(tagsRaw).slice(0, 6);

  // 圖片
  const photo = pickField_(row, [/個人專業形象照/, /形象照/, /頭像/, /主圖/]);
  const note = pickField_(row, [/備註/, /補充說明/, /簡介/, /自我介紹/]);

  // 連結：你前台固定需要三個：LINE OA / 官網 / 表單
  const lineOA = safeUrl(pickField_(row, [
    /LINE\s*官方帳號連結/,
    /官方帳號/,
    /LINE\s*OA/,
    /LINEOA/
  ]));

  const site = safeUrl(pickField_(row, [
    /門面.*官網/,
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

  // 額外平台連結（最多 6 個 chip）
  const v1 = safeUrl(pickField_(row, [/影音平台\s*1/, /影片連結\s*1/, /YouTube/]));
  const v2 = safeUrl(pickField_(row, [/影音平台\s*2/, /影片連結\s*2/]));
  const v3 = pickField_(row, [/影音平台\s*3/, /地址/, /地點/]); // 這欄你之前混用
  const s1 = safeUrl(pickField_(row, [/社群平台\s*1/, /社群\s*1/]));
  const s2 = safeUrl(pickField_(row, [/社群平台\s*2/, /社群\s*2/]));
  const s3 = safeUrl(pickField_(row, [/社群平台\s*3/, /社群\s*3/]));

  let address = "";
  let link3 = "";
  const v3n = normalize(v3);
  if(v3n && !/^https?:\/\//i.test(v3n)){
    address = v3n;       // 非 URL 視為地址
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

/** Fetch GAS public */
async function fetchPublic(){
  const url = API_URL + "?action=public";
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if(!json || !json.ok) throw new Error("public not ok");
  return json.data || null;
}

/** Apply visual state to BOTH app + preview (critical fix) */
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
  if(preview){
    preview.dataset.theme = state.theme; // ✅ 版型聯動就是靠這一行
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

  // sync theme buttons UI（僅視覺）
  $$(".seg__btn[data-theme]").forEach(b=>{
    b.classList.toggle("is-on", b.dataset.theme === state.theme);
  });
}

/** Render to your current HTML (pname/ptitle/pone/btnLine/btnSite/btnForm/btnMap/platforms/pnote) */
function renderCard(){
  const o = state.card || {};

  // name + title
  const pname = $("#pname");
  if(pname) pname.textContent = normalize(o.name) || "—";

  const ptitle = $("#ptitle");
  if(ptitle){
    const t = [normalize(o.title), normalize(o.org)].filter(Boolean).join("｜");
    ptitle.textContent = t || "—";
  }

  // tags
  const ptags = $("#ptags");
  if(ptags){
    ptags.innerHTML = (o.tags || []).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
  }

  // one line
  const pone = $("#pone");
  if(pone) pone.textContent = normalize(o.oneLine) || "—";

  // avatar
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

  // primary buttons
  const btnLine = $("#btnLine");
  if(btnLine){
    if(o.lineOA){
      btnLine.href = o.lineOA;
      btnLine.style.display = "";
    }else{
      btnLine.style.display = "none";
    }
  }

  const btnSite = $("#btnSite");
  if(btnSite){
    if(o.site){
      btnSite.href = o.site;
      btnSite.style.display = "";
    }else{
      btnSite.style.display = "none";
    }
  }

  const btnForm = $("#btnForm");
  if(btnForm){
    if(o.form){
      btnForm.href = o.form;
      btnForm.style.display = "";
    }else{
      btnForm.style.display = "none";
    }
  }

  // map button (optional)
  const btnMap = $("#btnMap");
  if(btnMap){
    if(o.mapUrl){
      btnMap.style.display = "";
      btnMap.onclick = ()=> window.open(o.mapUrl, "_blank", "noopener");
    }else{
      btnMap.style.display = "none";
    }
  }

  // links chips
  const platforms = $("#platforms");
  if(platforms){
    const links = (o.links || []).filter(Boolean).slice(0,6);
    platforms.innerHTML = links.map((url, i)=>{
      const label = (i < 3) ? `影音 ${i+1}` : `社群 ${i-2}`;
      return `<a class="linkchip" href="${escapeAttr(url)}" target="_blank" rel="noopener">${label}</a>`;
    }).join("");
  }

  // note
  const pnote = $("#pnote");
  if(pnote) pnote.textContent = normalize(o.note) || "";
}

/** Copy facade info (name/oneLine/links) */
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
      // fallback
      const ta = document.createElement("textarea");
      ta.value = lines;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  });
}

/** One delegated click handler for ALL controls (most stable on mobile) */
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
      if(state.plan !== "free") return; // Pro 不給手動選版型
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

/** Hidden admin tap (keep your behavior) */
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
  applyVisualState();
  bindDelegatedControls();
  bindHiddenAdmin();
  bindCopy();

  const hint = $("#hint");
  try{
    if(hint) hint.textContent = "門面資料讀取中…（試算表：小天使）";
    state.dataRaw = await fetchPublic();
    state.card = mapRowToCard_(state.dataRaw);
    renderCard();
    if(hint) hint.textContent = "門面資料已載入（樣版＝小天使）";
  }catch(e){
    if(hint) hint.textContent = "門面讀取失敗（請檢查 GAS / 試算表欄位）";
  }
}

document.addEventListener("DOMContentLoaded", init);