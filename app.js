/**
 * Angel Card Frontend v373 (Complete Overwrite)
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

const VERSION = 373;
const API_URL = "https://script.google.com/macros/s/AKfycby74ta4CUFzkWcEfyPfoOMV9K93f-sIUzAxP6yECiadpVEzFUmk_JiHCFG_s2-ePHvJ/exec";

const state = {
  plan: "free",           // free | pro
  theme: "dawn",          // arch | flat | dawn
  freeColor: "blue",      // pink | blue | orange | purple | green
  paper: "cotton",        // cotton | grain | linen | watercolor
  proColor: "deepSeaBlue",// 7 colors
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


/**
 * Normalize incoming GAS public payload.
 * Supports:
 *  - Standard keys (name/org/tagline/photo/logo/links/address/line_friend/line_oa/email/phone/q1/a1/q2/a2)
 *  - Raw Google Form headers (Chinese column names)
 */
function normalizeIncomingData(raw){
  const o = raw && typeof raw === "object" ? raw : {};
  const pick = (k)=> normalize(o[k]);
  const by = (candidates)=>{
    for(const k of candidates){
      const v = pick(k);
      if(v) return v;
    }
    return "";
  };

  // Standard keys first, then fallback to Chinese headers
  const name   = by(["name","姓名（名片大標題）"]);
  const org    = by(["org","單位名稱（如：幸福教養概念館）"]);
  const tagline= by(["tagline","理念標語（顯示在照片下方，精簡有力）"]);
  const services = by(["services","服務項目（核心業務，多項可條列換行）"]);
  const titles   = by(["titles","重要頭銜/獎銜（權威背書項目，多項可條列換行）"]);
  const photo  = by(["photo","個人專業形象照（名片主圖）"]);
  const logo   = by(["logo","品牌 Logo（右上角小圖標）"]);
  const wechat = by(["wechat","微信 ID"]);

  // address may be stored in "影音平台 3（或地址）" (as plain text)
  const v3 = by(["video3","影音平台 3（或地址）"]);
  const address = (()=>{
    const a = by(["address","地址","地點"]);
    if(a) return a;
    // If v3 is not a url, treat it as address
    if(v3 && !safeUrl(v3)) return v3;
    return "";
  })();

  // photos: may be comma-separated urls
  const photosRaw = by(["photos","產品或品牌或活動照片最多3張（內容區插圖）"]);
  const photos = photosRaw
    ? photosRaw.split(/[,
]/).map(x=>normalize(x)).filter(Boolean).slice(0,3)
    : [];

  // links: accept standard links array OR build from columns
  const linksStd = Array.isArray(o.links) ? o.links.map(x=>normalize(x)).filter(Boolean) : [];
  const video1 = by(["video1","影音平台 1（如：YouTube或其他連結）"]);
  const video2 = by(["video2","影音平台 2（如：TikTok / 抖音或其他連結）"]);
  // v3 as url only
  const video3 = safeUrl(v3) ? v3 : "";
  const social1 = by(["social1","社群平台 1（如：Facebook 粉絲專頁或其他連結）"]);
  const social2 = by(["social2","社群平台 2（如：Instagram或其他連結）"]);
  const social3 = by(["social3","社群平台 3（如：Thread / 部落格或其他連結）"]);

  const linksBuilt = [video1, video2, video3, social1, social2, social3]
    .map(x=>safeUrl(x) || "")
    .filter(Boolean);

  const links = (linksStd.length ? linksStd : linksBuilt).slice(0,6);

  const line_friend_raw = by(["line_friend","私訊 LINE 連結（第一行填連結，換行填line名稱）"]);
  const line_friend = (()=>{
    if(!line_friend_raw) return "";
    const first = line_friend_raw.split(/[

]/)[0];
    return safeUrl(first) || first;
  })();
  const line_oa = by(["line_oa","​LINE 官方帳號連結（綠色主按鈕）","LINE 官方帳號連結（綠色主按鈕）"]);

  const email  = by(["email","一鍵聯繫 Email"]);
  const phone  = by(["phone","一鍵聯繫電話"]);
  const q1 = by(["q1","客戶常見提問 1 (Q1)"]);
  const a1 = by(["a1","專業解答 1 (A1)"]);
  const q2 = by(["q2","客戶常見提問 2 (Q2)"]);
  const a2 = by(["a2","專業解答2（A2）","專業解答 2 (A2)"]);

  return {
    name, org, tagline, services, titles,
    photo, logo, wechat,
    photos,
    links,
    address,
    line_friend,
    line_oa,
    email, phone,
    q1, a1, q2, a2
  };
}
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
  return normalizeIncomingData(json.data || null);
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
  el.innerHTML = "";

  const links = (o && Array.isArray(o.links)) ? o.links : [];
  links.slice(0,6).forEach((u, i)=>{
    const url = safeUrl(u);
    if(!url) return;
    const a = document.createElement("a");
    a.className = "pbtn pbtn--mini";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<span class="pbtn__icon">${detectIcon(url)}</span><span class="pbtn__txt"><span class="pbtn__t">連結 ${i+1}</span><span class="pbtn__s">${url}</span></span>`;
    el.appendChild(a);
  });

  const addr = normalize(o?.address || "");
  const mapLink = safeUrl(o?.map || "") || toMapUrlFromAddress(addr);
  if(mapLink){
    const a = document.createElement("a");
    a.className = "pbtn pbtn--mini";
    a.href = mapLink;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<span class="pbtn__icon">🗺</span><span class="pbtn__txt"><span class="pbtn__t">導航</span><span class="pbtn__s">${addr || mapLink}</span></span>`;
    el.appendChild(a);
  }
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
  bindPlan();
  bindThemeFree();
  bindComposer();
  bindHiddenAdmin();

  // SW
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  try {
    state.data = await fetchPublic();
    renderCard();
  } catch (e) {
    // keep quiet: facade must be stable
  }
}

document.addEventListener("DOMContentLoaded", init);
