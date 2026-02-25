/* ================================
 * Happiness Smart Card System — app.js (v399.x COMPLETE OVERWRITE)
 * FIX / GOALS:
 * 1) Free vs Premium layout classes on body: is-free / is-premium
 * 2) Free: unit in banner; below banner: logo(circle)->name->title balanced
 * 3) Premium: name on right (banner-right); unit+title balanced (banner-text)
 * 4) Contacts: LINE + Video platforms show; WeChat = copy ID
 * 5) Hidden admin: bottom-right triple tap opens admin panel
 * ================================ */

const CONFIG = {
  VERSION: "399.x",
  DEFAULT_ID: "TW0001",
  // GAS should already exist in your project; keep your current one if present.
  GAS: (window.CONFIG && window.CONFIG.GAS) ? window.CONFIG.GAS : (window.__CFG && window.__CFG.GAS) ? window.__CFG.GAS : "",
  // GitHub Pages base path (auto)
  BASE_URL: location.origin + location.pathname.replace(/\/[^\/]*$/, "/"),
};

let __mode = "free"; // free | premium
let __card = null;

// ---------- tiny utils ----------
function qs(sel, root = document){ return root.querySelector(sel); }
function qsa(sel, root = document){ return [...root.querySelectorAll(sel)]; }

function normKey(k){
  return String(k||"")
    .trim()
    .toLowerCase()
    .replace(/\s+/g,"_")
    .replace(/[\u2018\u2019\u201c\u201d"']/g,"")
    .replace(/[^\w_]+/g,"_")
    .replace(/_+/g,"_")
    .replace(/^_|_$/g,"");
}
function pick(obj, keys){
  if(!obj) return "";
  for(const k of keys){
    const v = obj[k];
    if(v!==undefined && v!==null && String(v).trim()!=="") return String(v).trim();
  }
  return "";
}
function toArr(v){
  if(!v) return [];
  if(Array.isArray(v)) return v.filter(Boolean).map(String);
  const s = String(v).trim();
  if(!s) return [];
  return s.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean);
}
function safeUrl(u){
  if(!u) return "";
  let s = String(u).trim();
  if(!s) return "";
  if(/^https?:\/\//i.test(s)) return s;
  // allow line.me, www, etc
  if(/^www\./i.test(s)) return "https://" + s;
  return s;
}

function setMode(mode){
  __mode = (mode === "premium") ? "premium" : "free";
  document.body.classList.toggle("is-free", __mode === "free");
  document.body.classList.toggle("is-premium", __mode === "premium");

  // also mark buttons if exist
  const bA = qs("#btn-free") || qs("[data-mode='free']");
  const bB = qs("#btn-premium") || qs("[data-mode='premium']");
  if(bA) bA.classList.toggle("is-active", __mode==="free");
  if(bB) bB.classList.toggle("is-active", __mode==="premium");
}

function toast(msg){
  let t = qs(".toast");
  if(!t){
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("is-on");
  clearTimeout(toast.__t);
  toast.__t = setTimeout(()=>t.classList.remove("is-on"), 1200);
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast("已複製");
    return true;
  }catch(e){
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position="fixed";
    ta.style.left="-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand("copy");
      toast("已複製");
      return true;
    }catch(err){
      toast("複製失敗");
      return false;
    }finally{
      document.body.removeChild(ta);
    }
  }
}// ---------- data fetch ----------
function getIdFromUrl(){
  const u = new URL(location.href);
  const id = u.searchParams.get("id") || u.searchParams.get("cid") || "";
  return String(id).trim();
}

async function fetchCard(id){
  const cid = (id || CONFIG.DEFAULT_ID).trim();
  const gas = CONFIG.GAS || (window.CONFIG ? window.CONFIG.GAS : "");
  if(!gas){
    console.warn("GAS url missing");
    return null;
  }
  const url = `${gas}?action=card&id=${encodeURIComponent(cid)}&ts=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if(!data || data.ok === false) return null;

  // normalize keys (payload may be {row:{...}} or direct object)
  const raw = data.row || data.data || data.card || data;
  const out = {};
  Object.keys(raw||{}).forEach(k=>{
    out[normKey(k)] = raw[k];
  });
  return out;
}

// ---------- render helpers ----------
function setTextAny(selectors, text){
  const els = selectors.flatMap(sel => qsa(sel));
  els.forEach(el=>{ el.textContent = text || ""; });
}
function setImgAny(selectors, url){
  const els = selectors.flatMap(sel => qsa(sel));
  els.forEach(el=>{
    if(el.tagName === "IMG") el.src = url || "";
    else{
      const img = el.querySelector("img");
      if(img) img.src = url || "";
    }
    el.classList.toggle("is-hidden", !url);
  });
}

function ensureStructure(){
  // ensure banner-right exists for premium name
  const card = qs("#preview-card") || qs("#card") || qs(".card") || qs(".card-preview");
  if(!card) return;

  let banner = card.querySelector(".banner") || card.querySelector("#banner");
  if(!banner){
    banner = document.createElement("div");
    banner.className = "banner";
    card.prepend(banner);
  }

  let inner = banner.querySelector(".banner-inner");
  if(!inner){
    inner = document.createElement("div");
    inner.className = "banner-inner";
    banner.appendChild(inner);
  }

  let left = inner.querySelector(".banner-left");
  if(!left){
    left = document.createElement("div");
    left.className = "banner-left";
    inner.appendChild(left);
  }

  let right = inner.querySelector(".banner-right");
  if(!right){
    right = document.createElement("div");
    right.className = "banner-right";
    inner.appendChild(right);
  }

  // avatar wrap
  if(!left.querySelector(".avatar-wrap")){
    const aw = document.createElement("div");
    aw.className = "avatar-wrap";
    const img = document.createElement("img");
    img.id = "u-avatar";
    img.alt = "avatar";
    aw.appendChild(img);
    left.appendChild(aw);
  }

  // banner text block
  if(!left.querySelector(".banner-text")){
    const bt = document.createElement("div");
    bt.className = "banner-text";
    const u = document.createElement("div");
    u.className = "banner-unit";
    u.id = "u-unit";
    const t = document.createElement("div");
    t.className = "banner-title";
    t.id = "u-title";
    bt.appendChild(u);
    bt.appendChild(t);
    left.appendChild(bt);
  }

  // premium name right
  if(!right.querySelector(".name-right")){
    const nr = document.createElement("div");
    nr.className = "name-right";
    nr.id = "u-name-right";
    right.appendChild(nr);
  }

  // body
  let body = card.querySelector(".card-body") || card.querySelector("#card-body");
  if(!body){
    body = document.createElement("div");
    body.className = "card-body";
    card.appendChild(body);
  }

  // free stack (logo/name/title)
  if(!body.querySelector(".free-stack")){
    const fs = document.createElement("div");
    fs.className = "free-stack";
    fs.id = "free-stack";

    const logo = document.createElement("div");
    logo.className = "logo-circle";
    logo.id = "u-logo";
    const limg = document.createElement("img");
    limg.alt = "logo";
    logo.appendChild(limg);

    const name = document.createElement("div");
    name.className = "free-name";
    name.id = "u-name";

    const title = document.createElement("div");
    title.className = "free-title";
    title.id = "u-title-free";

    fs.appendChild(logo);
    fs.appendChild(name);
    fs.appendChild(title);

    body.prepend(fs);
  }

  // contacts container
  if(!body.querySelector("#contact-list")){
    const sec = document.createElement("div");
    sec.className = "section";
    sec.id = "sec-contacts";

    const hd = document.createElement("div");
    hd.className = "hd";
    hd.textContent = "聯繫方式";

    const bd = document.createElement("div");
    bd.className = "bd";
    const list = document.createElement("div");
    list.className = "contact-list";
    list.id = "contact-list";
    bd.appendChild(list);

    sec.appendChild(hd);
    sec.appendChild(bd);
    body.appendChild(sec);
  }
}function renderCard(data){
  __card = data || {};
  ensureStructure();

  // fields
  const name = pick(__card, ["name","full_name","display_name","nickname"]);
  const unit = pick(__card, ["unit","company","organization","org","department"]);
  const title = pick(__card, ["title","job_title","position","role"]);

  // images
  const avatar = safeUrl(pick(__card, ["avatar_img","avatar","photo","photo_img","profile_img","headshot","head_img"]));
  const logo = safeUrl(pick(__card, ["logo_img","logo","brand_logo","brand_img"]));

  // Apply by mode
  if(__mode === "premium"){
    // premium: name on right; unit+title near avatar
    setTextAny(["#u-name-right",".name-right"], name);
    setTextAny(["#u-unit",".banner-unit"], unit);
    setTextAny(["#u-title",".banner-title"], title);

    // free stack still exists but visually not primary; keep it consistent
    setTextAny(["#u-name",".free-name"], name);
    setTextAny(["#u-title-free",".free-title"], `${unit}${unit && title ? "｜" : ""}${title}`);

  }else{
    // free: unit in banner; below banner: logo -> name -> title
    setTextAny(["#u-unit",".banner-unit"], unit);
    setTextAny(["#u-title",".banner-title"], ""); // hidden by css in free
    setTextAny(["#u-name",".free-name"], name);
    setTextAny(["#u-title-free",".free-title"], title);
    setTextAny(["#u-name-right",".name-right"], ""); // hidden in free
  }

  // images
  setImgAny(["#u-avatar","#avatar","img#u-avatar"], avatar);
  // logo circle (below)
  const logoWrap = qs("#u-logo") || qs(".logo-circle");
  if(logoWrap){
    const img = logoWrap.querySelector("img");
    if(img) img.src = logo || "";
    logoWrap.classList.toggle("is-hidden", !logo);
  }

  // contacts
  renderContacts(__card);

  // hide contacts section if empty
  const list = qs("#contact-list");
  const sec = qs("#sec-contacts");
  if(sec) sec.classList.toggle("is-hidden", !list || list.children.length === 0);
}

function iconHtml(name){
  // FontAwesome already in your HTML in most versions; fallback to text if not
  const map = {
    line: "fa-brands fa-line",
    youtube: "fa-brands fa-youtube",
    instagram: "fa-brands fa-instagram",
    facebook: "fa-brands fa-facebook",
    tiktok: "fa-brands fa-tiktok",
    bilibili: "fa-brands fa-bilibili",
    website: "fa-solid fa-globe",
    phone: "fa-solid fa-phone",
    email: "fa-solid fa-envelope",
    wechat: "fa-brands fa-weixin",
    video: "fa-solid fa-play"
  };
  const cls = map[name] || "fa-solid fa-link";
  return `<i class="${cls}"></i>`;
}

function makeBtn({kind, title, subtitle, href, onClick}){
  const a = document.createElement(href ? "a" : "button");
  a.className = "contact-btn";
  if(href){
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
  }else{
    a.type = "button";
  }
  if(onClick) a.addEventListener("click", onClick);

  a.innerHTML = `
    <div class="contact-left">
      <div class="contact-ico">${iconHtml(kind)}</div>
      <div class="contact-text">
        <div class="t1">${title || ""}</div>
        <div class="t2">${subtitle || ""}</div>
      </div>
    </div>
    <div class="contact-arrow">→</div>
  `;
  return a;
}

function renderContacts(d){
  const list = qs("#contact-list");
  if(!list) return;
  list.innerHTML = "";

  // --- LINE: allow id or url ---
  const lineUrl = safeUrl(pick(d, ["line","line_url","line_oa","line_oa_url","line_official","line_link"]));
  const lineId = pick(d, ["line_id","line_account"]);
  if(lineUrl || lineId){
    const href = lineUrl
      ? (lineUrl.includes("line.me") || lineUrl.startsWith("http") ? lineUrl : `https://line.me/R/ti/p/${encodeURIComponent(lineUrl)}`)
      : `https://line.me/R/ti/p/${encodeURIComponent(lineId)}`;
    list.appendChild(makeBtn({
      kind:"line",
      title:"LINE",
      subtitle: lineId || (lineUrl ? "點擊開啟" : ""),
      href
    }));
  }

  // --- WeChat: copy ID (not link) ---
  const wx = pick(d, ["wechat","wechat_id","weixin","weixin_id","wx","wx_id"]);
  if(wx){
    list.appendChild(makeBtn({
      kind:"wechat",
      title:"微信（複製ID）",
      subtitle: wx,
      onClick: ()=>copyText(wx)
    }));
  }

  // Phone / Email / Website (optional but nice)
  const phone = pick(d, ["phone","mobile","tel"]);
  if(phone){
    list.appendChild(makeBtn({ kind:"phone", title:"電話", subtitle: phone, href:`tel:${phone.replace(/\s+/g,"")}` }));
  }
  const email = pick(d, ["email","mail"]);
  if(email){
    list.appendChild(makeBtn({ kind:"email", title:"Email", subtitle: email, href:`mailto:${email}` }));
  }
  const web = safeUrl(pick(d, ["website","site","url","homepage"]));
  if(web){
    list.appendChild(makeBtn({ kind:"website", title:"官方網站", subtitle:"點擊開啟", href:web }));
  }

  // --- Video platforms (影音平臺) ---
  // accept multiple keys / multiple URLs separated by newline/commas
  const videoKeys = [
    ["youtube","youtube_url","yt","yt_url"],
    ["instagram","ig","ig_url","instagram_url"],
    ["facebook","fb","fb_url","facebook_url"],
    ["tiktok","tiktok_url","tt","tt_url"],
    ["bilibili","bilibili_url","bili","bili_url"],
    ["douyin","douyin_url"],
    ["video","video_url","video_platform","media"]
  ];

  const added = new Set();
  function addVideo(kind, label, urls){
    urls.forEach(u=>{
      const href = safeUrl(u);
      if(!href) return;
      const key = label + "|" + href;
      if(added.has(key)) return;
      added.add(key);
      list.appendChild(makeBtn({
        kind,
        title: label,
        subtitle: "點擊開啟",
        href
      }));
    });
  }

  // youtube
  addVideo("youtube", "YouTube", toArr(pick(d, videoKeys[0])));
  addVideo("instagram", "Instagram", toArr(pick(d, videoKeys[1])));
  addVideo("facebook", "Facebook", toArr(pick(d, videoKeys[2])));
  addVideo("tiktok", "TikTok", toArr(pick(d, videoKeys[3])));
  addVideo("bilibili", "Bilibili", toArr(pick(d, videoKeys[4])));
  addVideo("video", "抖音", toArr(pick(d, videoKeys[5])));
  // generic media links
  addVideo("video", "影音平台", toArr(pick(d, videoKeys[6])));

  // if nothing added -> keep empty; CSS will auto hide section by renderCard()
}

// ---------- hidden admin (triple tap bottom-right) ----------
function ensureAdminGhost(){
  if(qs("#admin-ghost")) return;
  const g = document.createElement("div");
  g.id = "admin-ghost";
  g.className = "admin-ghost";
  document.body.appendChild(g);

  let taps = 0;
  let t0 = 0;
  g.addEventListener("click", ()=>{
    const now = Date.now();
    if(now - t0 > 900){ taps = 0; }
    t0 = now;
    taps += 1;
    if(taps >= 3){
      taps = 0;
      openAdmin();
    }
  }, {passive:true});
}

function openAdmin(){
  let modal = qs("#admin-modal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "admin-modal";
    modal.className = "admin-modal";
    modal.innerHTML = `
      <div class="admin-panel">
        <div class="hd">
          <div class="ttl">隱形後臺｜交貨工作區</div>
          <button class="x" type="button" id="admin-close">✕</button>
        </div>
        <div class="bd">
          <div class="admin-row">
            <input class="admin-input" id="admin-id" placeholder="輸入序號（例如 TW0001）" />
          </div>
          <div class="admin-actions">
            <button class="abtn" id="admin-load" type="button">載入預覽</button>
            <button class="abtn" id="admin-copy-link" type="button">複製名片連結</button>
            <button class="abtn primary" id="admin-copy-og" type="button">複製交貨OG連結</button>
          </div>
          <div style="color:rgba(0,0,0,.55);font-weight:800;line-height:1.5;font-size:13px;">
            提醒：微信按鈕為複製 ID；LINE / 影音平台會自動顯示（若資料有填）。
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    qs("#admin-close").addEventListener("click", ()=>modal.classList.remove("is-open"));
    modal.addEventListener("click", (e)=>{
      if(e.target === modal) modal.classList.remove("is-open");
    });

    qs("#admin-load").addEventListener("click", async ()=>{
      const id = (qs("#admin-id").value || "").trim() || CONFIG.DEFAULT_ID;
      const data = await fetchCard(id);
      if(!data){ toast("找不到資料"); return; }
      renderCard(data);
      toast("已載入");
    });

    qs("#admin-copy-link").addEventListener("click", async ()=>{
      const id = (qs("#admin-id").value || "").trim() || getIdFromUrl() || CONFIG.DEFAULT_ID;
      const link = `${CONFIG.BASE_URL}index.html?id=${encodeURIComponent(id)}`;
      await copyText(link);
    });

    qs("#admin-copy-og").addEventListener("click", async ()=>{
      // If you have share.html as delivery page, use it; otherwise copy main link
      const id = (qs("#admin-id").value || "").trim() || getIdFromUrl() || CONFIG.DEFAULT_ID;
      const og = `${CONFIG.BASE_URL}share.html?id=${encodeURIComponent(id)}`;
      await copyText(og);
    });
  }
  modal.classList.add("is-open");
}

// ---------- boot ----------
(async function boot(){
  // mode buttons if exist
  const bA = qs("#btn-free") || qs("[data-mode='free']");
  const bB = qs("#btn-premium") || qs("[data-mode='premium']");
  if(bA) bA.addEventListener("click", ()=>setMode("free"));
  if(bB) bB.addEventListener("click", ()=>setMode("premium"));

  // default mode (try keep existing selection)
  setMode(document.body.classList.contains("is-premium") ? "premium" : "free");

  ensureAdminGhost();

  const id = getIdFromUrl() || CONFIG.DEFAULT_ID;
  const data = await fetchCard(id);
  if(data){
    renderCard(data);
  }else{
    // still ensure structure so UI doesn't drift
    ensureStructure();
    toast("資料讀取失敗");
  }
})();