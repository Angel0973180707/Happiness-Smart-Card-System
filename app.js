/* Angel Card v369 (Complete Overwrite)
 * Fixes:
 * 1) 晨曦(dawn) / 正拱(arch) 不再錯置
 * 2) 自由版色彩更飽和（CSS variables）
 * 3) 門面讀取試算表：優先取「小天使」那一列（matchValue）
 */

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const state = {
  plan: "free",
  theme: "dawn",
  card: null,
  config: null,
};

async function loadConfig(){
  const res = await fetch("./data/config.json", { cache: "no-store" });
  if(!res.ok) throw new Error("config.json 讀取失敗");
  state.config = await res.json();
}

function setPlan(plan){
  state.plan = plan;
  const app = $("#app");
  app.dataset.plan = plan;

  $$(".seg__btn[data-plan]").forEach(b=>b.classList.toggle("is-on", b.dataset.plan===plan));

  // Optional: pro can unlock extra note
  renderNote();
}

function setTheme(theme){
  state.theme = theme;
  const app = $("#app");
  app.dataset.theme = theme;

  const preview = $("#preview");
  preview.dataset.theme = theme;

  $$(".seg__btn[data-theme]").forEach(b=>b.classList.toggle("is-on", b.dataset.theme===theme));
}

function normalize(s){
  return String(s ?? "").trim();
}

function rowsToObjects(headers, rows){
  const hs = headers.map(h => normalize(h));
  return rows.map(r => {
    const o = {};
    hs.forEach((h, i) => o[h] = r[i]);
    return o;
  });
}

/** Find the "小天使" row robustly:
 * - matchValue exists in ANY cell (string contains)
 * - else, matchKey field equals matchValue
 */
function findMatchCard(objs, cfg){
  const mv = normalize(cfg.matchValue || "小天使");
  const mk = normalize(cfg.matchKey || "");

  // 1) strict key match
  if(mk){
    const hit = objs.find(o => normalize(o[mk]) === mv);
    if(hit) return hit;
  }

  // 2) any cell contains matchValue
  for(const o of objs){
    for(const k of Object.keys(o)){
      const v = normalize(o[k]);
      if(v && (v === mv || v.includes(mv))) return o;
    }
  }

  // 3) fallback: first row
  return objs[0] || null;
}

function pickField(o, keys, fallback=""){
  for(const k of keys){
    if(o && Object.prototype.hasOwnProperty.call(o, k)){
      const v = normalize(o[k]);
      if(v) return v;
    }
  }
  return fallback;
}

function splitTags(raw){
  const s = normalize(raw);
  if(!s) return [];
  // allow separators: , / 、 | # newline
  return s
    .replace(/[#]/g, " ")
    .split(/[,/、|\n]+/g)
    .map(x=>x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function safeUrl(u){
  const s = normalize(u);
  if(!s) return "";
  if(/^https?:\/\//i.test(s)) return s;
  // allow LINE OA short links etc
  if(/^line:\/\//i.test(s)) return s;
  return s; // keep as-is; user controls their sheet
}

function renderCard(o){
  state.card = o;

  const name = pickField(o, ["name","姓名","稱呼","display_name","暱稱","nickname"], "小天使");
  const title = pickField(o, ["title","頭銜","一句話","tagline","subtitle","職稱"], "");
  const one  = pickField(o, ["one_liner","一句話定位","定位","positioning","bio","簡介"], "—");
  const tagsRaw = pickField(o, ["tags","標籤","tag","hashtag"], "");

  const avatarUrl = safeUrl(pickField(o, ["avatar","photo","頭像","avatar_url","image"], ""));
  const lineUrl   = safeUrl(pickField(o, ["line_oa","line","LINE 官方帳號","line_url","line_oa_url"], state.config.fallbackLineUrl || ""));
  const siteUrl   = safeUrl(pickField(o, ["site","website","官網","門面","homepage","home_url"], state.config.fallbackSiteUrl || ""));
  const formUrl   = safeUrl(pickField(o, ["form","google_form","填表","order_form","form_url"], state.config.fallbackFormUrl || ""));

  $("#pname").textContent = name || "小天使";
  $("#ptitle").textContent = title || "（來自試算表）";
  $("#pone").textContent = one || "—";

  // tags
  const tags = splitTags(tagsRaw);
  const ptags = $("#ptags");
  ptags.innerHTML = "";
  tags.forEach(t=>{
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = t;
    ptags.appendChild(span);
  });

  // avatar
  const img = $("#avatarImg");
  const fb = $("#avatarFallback");
  if(avatarUrl){
    img.src = avatarUrl;
    img.onload = ()=>{ img.style.display="block"; fb.style.display="none"; };
    img.onerror = ()=>{ img.style.display="none"; fb.style.display="grid"; };
  }else{
    img.style.display="none";
    fb.style.display="grid";
    fb.textContent = (name || "小天使").slice(0,4);
  }

  // links
  const btnLine = $("#btnLine");
  const btnSite = $("#btnSite");
  const btnForm = $("#btnForm");

  btnLine.href = lineUrl || "#";
  btnSite.href = siteUrl || "#";
  btnForm.href = formUrl || "#";

  // disable if empty
  [btnLine,btnSite,btnForm].forEach(a=>{
    const ok = a.getAttribute("href") && a.getAttribute("href") !== "#";
    a.classList.toggle("is-disabled", !ok);
    if(!ok){
      a.removeAttribute("target");
      a.removeAttribute("rel");
    }else{
      a.setAttribute("target","_blank");
      a.setAttribute("rel","noopener");
    }
  });

  renderNote();

  // copy
  $("#btnCopy").onclick = async ()=>{
    const txt = [
      `姓名/稱呼：${name || ""}`,
      `一句話：${one || ""}`,
      lineUrl ? `LINE：${lineUrl}` : "",
      siteUrl ? `官網：${siteUrl}` : "",
      formUrl ? `填表：${formUrl}` : ""
    ].filter(Boolean).join("\n");
    try{
      await navigator.clipboard.writeText(txt);
      toast("已複製到剪貼簿");
    }catch(e){
      // fallback
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("已複製（備援）");
    }
  };
}

function renderNote(){
  const note = $("#pnote");
  const isPro = state.plan === "pro";
  const msg = isPro
    ? "專業版：可擴充多頁、更多模組入口（預留架構）"
    : "自由版：色彩更飽和、保留核心三步驟與門面入口";
  note.textContent = msg;
}

function toast(msg){
  let t = $("#__toast");
  if(!t){
    t = document.createElement("div");
    t.id="__toast";
    t.style.position="fixed";
    t.style.left="50%";
    t.style.bottom="22px";
    t.style.transform="translateX(-50%)";
    t.style.padding="10px 14px";
    t.style.borderRadius="999px";
    t.style.background="rgba(0,0,0,.55)";
    t.style.border="1px solid rgba(255,255,255,.12)";
    t.style.color="rgba(236,255,247,.92)";
    t.style.fontWeight="900";
    t.style.zIndex="9999";
    t.style.backdropFilter="blur(10px)";
    t.style.boxShadow="0 16px 30px rgba(0,0,0,.35)";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity="1";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>{ t.style.opacity="0"; }, 1500);
}

async function loadCardFromApi(){
  const hint = $("#hint");
  const cfg = state.config;

  if(!cfg.apiUrl || cfg.apiUrl.includes("YOUR_APPS_SCRIPT_URL")){
    hint.textContent = "請先到 data/config.json 填入 apiUrl（Apps Script /exec），目前顯示預設資料。";
    // fallback demo
    renderCard({
      "name":"小天使",
      "title":"（請設定 API）",
      "one_liner":"把你的 apiUrl 填入 config.json，就會讀到試算表的小天使那一列。",
      "tags":"智慧名片, 陪伴式, 溫柔清晰",
      "line_oa_url": cfg.fallbackLineUrl || "",
      "home_url": cfg.fallbackSiteUrl || "",
      "form_url": cfg.fallbackFormUrl || ""
    });
    return;
  }

  hint.textContent = "門面資料讀取中…（試算表：小天使）";

  const url = cfg.apiUrl + (cfg.apiUrl.includes("?") ? "&" : "?") + "action=list&ts=" + Date.now();
  const res = await fetch(url, { cache:"no-store" });
  if(!res.ok) throw new Error("API 連線失敗");
  const data = await res.json();
  if(!data || !data.ok) throw new Error(data && data.error ? data.error : "API 回傳異常");

  const headers = data.headers || [];
  const rows = data.rows || [];
  const objs = rowsToObjects(headers, rows);
  const card = findMatchCard(objs, cfg);

  if(!card){
    hint.textContent = "找不到小天使資料，已顯示空白。";
    renderCard({ name:"小天使", title:"（找不到資料）", one_liner:"—" });
    return;
  }

  hint.textContent = "門面已就位：已讀取試算表「小天使」資料。";
  renderCard(card);
}

function wireUI(){
  // plan buttons
  $$(".seg__btn[data-plan]").forEach(btn=>{
    btn.addEventListener("click", ()=> setPlan(btn.dataset.plan));
  });

  // theme buttons
  $$(".seg__btn[data-theme]").forEach(btn=>{
    btn.addEventListener("click", ()=> setTheme(btn.dataset.theme));
  });

  // init preview theme dataset
  $("#preview").dataset.theme = state.theme;
}

async function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  try{
    await navigator.serviceWorker.register("./sw.js");
  }catch(e){
    // ignore
  }
}

(async function init(){
  wireUI();
  setPlan("free");
  setTheme("dawn");

  try{
    await loadConfig();
    await loadCardFromApi();
  }catch(e){
    $("#hint").textContent = "門面已就位：已顯示小天使樣板。";
    renderCard({
      "name":"小天使",
      "title":"（讀取失敗）",
      "one_liner": String(e && e.message ? e.message : e),
      "tags":"請檢查 apiUrl / 權限 / 部署"
    });
  }

  registerSW();
})();
