/* wechat.js — v407.1 (COMPLETE OVERWRITE)
 * - 從 URL 取得 id / plan / p / c
 * - 套色：premium(p1~p7) 或 free(c1~c5)
 * - 打 GAS：?action=card&id=...
 * - 顯示：姓名/頭銜/服務/經歷/聯繫（微信/LINE/Email/電話）
 * - 圖片：優先用 data["個人照"]（GAS 已會優先 *_fast 回填到「個人照」）
 *         兼容 avatar_img / avatar
 * - 按鈕：
 *   - 開啟名片 → open.html?id=...
 *   - 複製名片網址 → BASE ?id=...
 *   - 聯繫開通 → LINE OA（只有 status 非 active 才顯示）
 * - ✅ QRCode 已拿掉
 */

const BASE = "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
const GAS  = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
const LINE_OA = "https://lin.ee/G3VJoRm";

// 你前面已定：可開啟狀態
const ALLOW_STATUSES = new Set(["active", "on", "enabled", "paid"]);

const qs = (id)=>document.getElementById(id);
const text = (v)=>(v==null?"":String(v)).trim();

function getParam(name){
  const u = new URL(location.href);
  return text(u.searchParams.get(name));
}

function toast(msg){
  const el = qs("toast");
  if(!el) return;
  el.textContent = msg || "";
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> el.classList.remove("show"), 1600);
}

function setThemeVars_(bg1,bg2){
  document.documentElement.style.setProperty("--bg1", bg1);
  document.documentElement.style.setProperty("--bg2", bg2);
}

/** premium p1~p7 */
function setPremiumColor(code){
  const map={
    p1:["#7A2E3A","#B5455C"], // 胭脂紅
    p2:["#5C1F2B","#9E364F"], // 酒紅
    p3:["#0F2A4A","#1F4C7C"], // 深藍
    p4:["#3E2F6F","#5E4B8B"], // 霧紫
    p5:["#3C4B6E","#64799C"], // 藍灰
    p6:["#9E8A5A","#D4B45F"], // 金箔
    p7:["#3C2F28","#5E463A"]  // 褐碳
  };
  if(map[code]) setThemeVars_(map[code][0], map[code][1]);
}

/** free c1~c5（給長圖也有一致感） */
function setFreeColor(code){
  const map={
    c1:["#C94B6A","#E07A96"], // 粉
    c2:["#245A9B","#3E7BC9"], // 藍
    c3:["#B85A2A","#E28A4E"], // 橘
    c4:["#5A3B8A","#7B5BC2"], // 紫
    c5:["#1F6B55","#3A9B7C"]  // 綠
  };
  if(map[code]) setThemeVars_(map[code][0], map[code][1]);
}

async function fetchJson(url){
  const res = await fetch(url, { method:"GET", cache:"no-store" });
  const txt = await res.text();
  try{ return JSON.parse(txt); }catch{ return null; }
}

function splitLines_(s){
  const t = text(s);
  if(!t) return [];
  return t.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean);
}

function setList_(boxId, lines){
  const box = qs(boxId);
  if(!box) return;
  box.innerHTML = "";
  lines.forEach(t=>{
    const p = document.createElement("p");
    p.textContent = "• " + t;
    box.appendChild(p);
  });
}

function pickAvatarUrl_(d){
  // 你舊版用 d.avatar_img；新版 GAS v402/v405 會回「個人照」與 avatar/logo
  return (
    text(d["個人照"]) ||
    text(d["avatar_img"]) ||
    text(d["avatar"]) ||
    ""
  );
}

function renderMeta_(d, plan, p, c){
  const meta = qs("meta");
  if(!meta) return;
  meta.innerHTML = "";

  const pills = [];

  const unit = text(d["單位"]);
  if(unit) pills.push(`單位：${unit}`);

  const wechat = text(d["微信ID"]) || text(d["微信"]);
  if(wechat) pills.push(`微信ID：${wechat}`);

  // 顯示方案（讓長圖更「被選擇」）
  if(plan === "2") pills.push(`精品：${p || "-"}`);
  else pills.push(`自由：${c || "-"}`);

  pills.slice(0, 4).forEach(t=>{
    const el = document.createElement("div");
    el.className = "pill";
    el.textContent = t;
    meta.appendChild(el);
  });
}

function renderContact_(d){
  const parts = [];

  const wechat = text(d["微信ID"]) || text(d["微信"]);
  const lineLink = text(d["LINE連結"]) || text(d["LINE官方帳號"]);
  const email = text(d["Email"]);
  const phone = text(d["電話"]);

  if(wechat) parts.push(`微信ID：${wechat}`);
  if(lineLink) parts.push(`LINE：${lineLink}`);
  if(email) parts.push(`Email：${email}`);
  if(phone) parts.push(`電話：${phone}`);

  if(parts.length){
    qs("contactSection").style.display = "";
    qs("contactContent").innerHTML = parts.map(x=>`<div>${escapeHtml_(x)}</div>`).join("");
  }else{
    qs("contactSection").style.display = "none";
  }
}

function escapeHtml_(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setButtons_(id){
  const openUrl = `${BASE}open.html?id=${encodeURIComponent(id)}`;
  const cardUrl = `${BASE}?id=${encodeURIComponent(id)}`;

  const btnOpen = qs("btnOpen");
  if(btnOpen) btnOpen.href = openUrl;

  const btnCopy = qs("btnCopy");
  if(btnCopy){
    btnCopy.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(cardUrl);
        toast("✅ 已複製名片網址");
      }catch{
        toast("⚠️ 無法自動複製，請手動複製網址");
      }
    });
  }

  const btnContact = qs("btnContact");
  if(btnContact) btnContact.href = LINE_OA;
}

function applyThemeFromParams_(){
  const plan = getParam("plan"); // "1" or "2"
  const p = getParam("p");
  const c = getParam("c");

  if(plan === "2" && p) setPremiumColor(p);
  else if(plan === "1" && c) setFreeColor(c);

  return { plan, p, c };
}

(async function boot(){
  const id = getParam("id");
  const { plan, p, c } = applyThemeFromParams_();

  // badge
  const badge = qs("badge");
  if(badge){
    badge.textContent = (plan === "2")
      ? `Premium WeChat Card · ${p || ""}`.trim()
      : `Free WeChat Card · ${c || ""}`.trim();
  }

  setButtons_(id || "");

  if(!id){
    qs("name").textContent = "缺少名片代碼";
    qs("title").textContent = "請從分享連結重新開啟（需要帶 ?id=TW0001）";
    qs("btnOpen").setAttribute("aria-disabled","true");
    qs("btnOpen").href = "#";
    qs("btnContact").style.display = "";
    toast("網址缺少 id");
    return;
  }

  // 拉資料
  const url = `${GAS}?action=card&id=${encodeURIComponent(id)}&ts=${Date.now()}`;
  const data = await fetchJson(url);

  if(!data || data.ok === false){
    qs("name").textContent = "資料尚未可用";
    qs("title").textContent = "請稍後再試，或聯繫客服協助。";
    qs("btnContact").style.display = "";
    return;
  }

  // 渲染
  const d = data;

  if(text(d["姓名"])) qs("name").textContent = text(d["姓名"]);
  if(text(d["頭銜"])) qs("title").textContent = text(d["頭銜"]);

  // avatar
  const av = pickAvatarUrl_(d);
  const box = qs("avatarBox");
  if(box){
    box.innerHTML = "";
    if(av){
      const img = document.createElement("img");
      img.src = av;
      img.alt = "avatar";
      img.loading = "lazy";
      box.appendChild(img);
    }
  }

  // service
  const svc = text(d["服務項目"]);
  if(svc){
    qs("serviceSection").style.display = "";
    setList_("serviceContent", splitLines_(svc));
  }else{
    qs("serviceSection").style.display = "none";
  }

  // exp
  const exp = text(d["經歷"]);
  if(exp){
    qs("expSection").style.display = "";
    setList_("expContent", splitLines_(exp));
  }else{
    qs("expSection").style.display = "none";
  }

  // meta + contact
  renderMeta_(d, plan, p, c);
  renderContact_(d);

  // 鎖定判斷：若 status 非可開啟 → 顯示「聯繫開通」
  const status = text(d.status).toLowerCase();
  const okOpen = ALLOW_STATUSES.has(status);

  const btnOpen = qs("btnOpen");
  const btnContact = qs("btnContact");

  if(!okOpen){
    if(btnOpen){
      btnOpen.textContent = "尚未開通";
      btnOpen.setAttribute("aria-disabled","true");
      btnOpen.href = "#";
    }
    if(btnContact) btnContact.style.display = "";
  }else{
    if(btnOpen){
      btnOpen.textContent = "開啟名片";
      btnOpen.removeAttribute("aria-disabled");
      btnOpen.href = `${BASE}open.html?id=${encodeURIComponent(id)}`;
    }
    if(btnContact) btnContact.style.display = "none";
  }

})().catch(()=>{
  // 靜默失敗：保持頁面可用（聯繫開通）
  const btnContact = qs("btnContact");
  if(btnContact) btnContact.style.display = "";
});
