/* ================================
 * Happiness Smart Card System
 * app.js v401.1 (COMPLETE OVERWRITE) 1/3
 * - Theme State Engine (NO SIMPLIFY)
 * - Free / Premium fully linked
 * ================================ */

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  DEFAULT_ID: "TW0001",
  VERSION: "v401.1"
};

let STATE = {
  mode: "free",     // free | premium
  color: "c1",      // c1..c5
  style: "s1",      // s1..s3
  paper: "f1",      // f1..f3
  premium: "p1"     // p1..p7
};

function qs(id){ return document.getElementById(id); }
function text(v){ return (v==null ? "" : String(v)).trim(); }

/* ---------- Mode Switch ---------- */

function applyStateToBody_(){
  const b = document.body;

  b.classList.remove(
    "mode-free","mode-premium",
    "c1","c2","c3","c4","c5",
    "p1","p2","p3","p4","p5","p6","p7",
    "style-s1","style-s2","style-s3",
    "paper-f1","paper-f2","paper-f3"
  );

  if(STATE.mode === "free"){
    b.classList.add("mode-free", STATE.color, "style-" + STATE.style, "paper-" + STATE.paper);
  }else{
    b.classList.add("mode-premium", STATE.premium);
  }
}

/* ---------- Public API (HTML onclick) ---------- */

function setV382(mode, theme){
  if(mode === "free"){
    STATE.mode = "free";
    STATE.color = theme || STATE.color;
  }else{
    STATE.mode = "premium";
    STATE.premium = theme || STATE.premium;
  }

  applyStateToBody_();
}

function setV382Style(style){
  STATE.style = style;
  applyStateToBody_();
}

function setV382Paper(paper){
  STATE.paper = paper;
  applyStateToBody_();
}

window.setV382 = setV382;
window.setV382Style = setV382Style;
window.setV382Paper = setV382Paper;
/* ================================
 * app.js v401.1 (2/3)
 * - Data Load + Render
 * ================================ */

function normalizeId_(s){
  const v = text(s).toUpperCase();
  if(/^TW\d{4}$/.test(v)) return v;
  if(/^\d+$/.test(v)) return "TW" + v.padStart(4,"0");
  return v || CONFIG.DEFAULT_ID;
}

async function fetchCard_(id){
  const cid = normalizeId_(id);
  const url = `${CONFIG.GAS}?action=card&id=${cid}&ts=${Date.now()}`;
  const res = await fetch(url, { cache:"no-store" });
  const txt = await res.text();
  return JSON.parse(txt);
}

function pick_(obj, keys){
  for(const k of keys){
    if(obj[k] && text(obj[k]) !== "") return obj[k];
  }
  return "";
}

function setImg_(id, url){
  const img = qs(id);
  if(!img) return;
  img.src = url;
}

/* ---------- Render ---------- */

function renderCard_(row){

  const name  = pick_(row, ["姓名","name"]);
  const unit  = pick_(row, ["單位","unit"]);
  const title = pick_(row, ["頭銜","title"]);

  qs("u-name").textContent = name || "未命名";
  qs("u-unit").textContent = unit;
  qs("u-title").textContent = title;

  const avatar = pick_(row, ["個人照_fast","個人照"]);
  if(avatar) setImg_("u-img", avatar);

  const logo = pick_(row, ["Logo_fast","Logo"]);
  if(logo){
    qs("logoWrap").style.display = "flex";
    setImg_("u-logo", logo);
  }

  qs("versionTag").textContent = CONFIG.VERSION;
}
/* ================================
 * app.js v401.1 (3/3)
 * - Photo Wall + Boot
 * ================================ */

function renderPhotos_(row){

  const bulk = row["照片"] || row["photos"] || "";
  if(!bulk) return;

  const grid = qs("photoGrid");
  const wall = qs("photoWall");

  grid.innerHTML = "";

  const urls = bulk.split(/[\n,，;]/g).map(s=>s.trim()).filter(Boolean);

  urls.forEach(u=>{
    const img = document.createElement("img");
    img.className = "wall-img";
    img.src = u;
    grid.appendChild(img);
  });

  wall.style.display = "";
}

/* ---------- Boot ---------- */

(async function boot_(){
  try{
    applyStateToBody_();

    const id = new URLSearchParams(location.search).get("id");
    const payload = await fetchCard_(id);

    const row = payload.data || payload;
    renderCard_(row);
    renderPhotos_(row);

  }catch(e){
    console.error(e);
    qs("u-name").textContent = "載入失敗";
  }
})();