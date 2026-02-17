/* Angel Smart Card System v363 (Complete Overwrite)
 * - Plan chooser (breathe guidance)
 * - Go to Google Form (customer fills)
 * - After form: input id + token to render card (includes video/social/navigation)
 */

const VERSION = 363;

/* ✅ 你的表單（你已給） */
const FORM_URL = "https://forms.gle/aCoV85GK5vcetbfH6";

/* ✅ 你的 GAS WebApp（你已給） */
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbym2-0m9RW71XZ3-Pr741MVYTBSQrXQirmDALB7wdhQvZz8v_bxXmZP9NRX78JJc_Yr/exec";

const STORAGE_KEY = "ANGEL_CARD_PLAN";

const els = {
  cards: Array.from(document.querySelectorAll(".planCard[data-plan]")),
  chosenPlan: document.getElementById("chosenPlan"),
  chosenNote: document.getElementById("chosenNote"),
  btnNext: document.getElementById("btnNext"),
  btnClear: document.getElementById("btnClear"),

  inputId: document.getElementById("inputId"),
  inputToken: document.getElementById("inputToken"),
  btnLoad: document.getElementById("btnLoad"),
  btnDemo: document.getElementById("btnDemo"),
  msg: document.getElementById("msg"),
  cardArea: document.getElementById("cardArea"),
};

function setMsg(text) {
  els.msg.textContent = text || "";
}

function setSelected(plan) {
  els.cards.forEach(btn => {
    const p = btn.getAttribute("data-plan");
    btn.classList.toggle("selected", p === plan);
    if (!plan) btn.classList.add("breathe");
    else btn.classList.remove("breathe");
  });

  if (!plan) {
    els.chosenPlan.textContent = "尚未選擇";
    els.chosenNote.textContent = "請先點選上方其中一個版型（卡片會跳動提醒你）。";

    els.btnNext.classList.add("disabled");
    els.btnNext.classList.remove("breathe-soft");
    els.btnNext.setAttribute("aria-disabled", "true");
    els.btnNext.textContent = "請先選一個版型 ↑";

    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, plan);
  els.chosenPlan.textContent = plan;
  els.chosenNote.innerHTML = `已選擇：<b>${plan}</b>。<br/>下一步填表時，請填相同版型名稱（請記住）。`;

  els.btnNext.classList.remove("disabled");
  els.btnNext.classList.add("breathe-soft");
  els.btnNext.setAttribute("aria-disabled", "false");
  els.btnNext.textContent = `下一步：前往填寫表單（填「${plan}」）`;
}

function goForm() {
  const plan = localStorage.getItem(STORAGE_KEY) || "";
  if (!plan) {
    alert("請先選一個版型（精品設計款 / 自由搭配款）。\n\n選版是參考，但「版型名稱」要記住，下一步填表要填一樣的款式。");
    return;
  }
  if (!FORM_URL || FORM_URL.includes("PASTE")) {
    alert("請先在 app.js 設定 FORM_URL 為你的 Google 表單連結。");
    return;
  }
  window.location.href = FORM_URL;
}

function norm(s){ return String(s || "").trim(); }

function isLikelyUrl(v){
  const s = String(v || "").trim();
  return /^https?:\/\//i.test(s) || /^line:\/\//i.test(s) || /^mailto:/i.test(s) || /^tel:/i.test(s);
}

function ensureUrl(v, kind){
  const s = String(v || "").trim();
  if (!s) return "";
  if (isLikelyUrl(s)) return s;

  // common patterns
  if (kind === "tel") return "tel:" + s.replace(/\s+/g,"");
  if (kind === "email") return "mailto:" + s.replace(/\s+/g,"");
  if (kind === "line") {
    // if user gives LINE ID, open line add friend (best-effort)
    // NOTE: if they paste full URL it's fine
    return "https://line.me/R/ti/p/@" + s.replace(/^@/,"");
  }
  if (kind === "wechat") {
    // no official universal deep link; show as copy-only
    return "";
  }
  return s;
}

function pickFirst(data, keys){
  for (const k of keys){
    if (data && Object.prototype.hasOwnProperty.call(data, k)){
      const v = data[k];
      if (String(v || "").trim()) return v;
    }
  }
  return "";
}

/* Render card
 * - we do "best-effort" mapping:
 *   title/name/slogan/org/phone/email/line/youtube/tiktok/douyin/ig/fb/website/address/map
 * - and also show "all fields" in kv list (so "表單內容" 會完整包含)
 */
function renderCard(id, data){
  const chosenPlan = localStorage.getItem(STORAGE_KEY) || "";

  const title =
    pickFirst(data, ["姓名（名片大標題）","姓名","名稱","name","title"]) ||
    pickFirst(data, ["主標題","名片大標題"]) ||
    id;

  const subtitle =
    pickFirst(data, ["一句話定位","標語","理念","slogan","一句話"]) ||
    pickFirst(data, ["你希望對方得到什麼","希望對方得到什麼"]) ||
    "";

  const org =
    pickFirst(data, ["單位","公司","組織","org"]) || "";

  const phone = pickFirst(data, ["電話","手機","phone","tel"]);
  const email = pickFirst(data, ["Email","email","信箱","電子郵件"]);
  const line = pickFirst(data, ["LINE","Line","line","LINE ID","Line ID"]);
  const lineOA = pickFirst(data, ["LINE官方帳號","LINE OA","Line OA","官方Line","官方帳號"]);
  const wechat = pickFirst(data, ["微信","WeChat","wechat","微信ID","微信 ID"]);

  const youtube = pickFirst(data, ["YouTube","youtube","YT","YouTube連結"]);
  const tiktok = pickFirst(data, ["抖音","TikTok","tiktok","douyin","Douyin","抖音連結"]);
  const ig = pickFirst(data, ["IG","Instagram","instagram","IG連結"]);
  const fb = pickFirst(data, ["FB","Facebook","facebook","FB連結"]);
  const website = pickFirst(data, ["網站","官網","Website","website","連結","網址"]);

  const address = pickFirst(data, ["地址","地點","Address","address"]);
  const map = pickFirst(data, ["地圖","GoogleMap","Map","map","導航連結","Google 地圖"]);

  // actions
  const actions = [];
  if (phone) actions.push({ label:"電話", href: ensureUrl(phone,"tel") });
  if (email) actions.push({ label:"Email", href: ensureUrl(email,"email") });
  if (lineOA) actions.push({ label:"LINE 官方", href: isLikelyUrl(lineOA) ? lineOA : ensureUrl(lineOA,"line") });
  else if (line) actions.push({ label:"LINE", href: isLikelyUrl(line) ? line : ensureUrl(line,"line") });

  // video/social links
  const links = [];
  if (youtube) links.push({ label:"YouTube", href: youtube });
  if (tiktok) links.push({ label:"抖音 / TikTok", href: tiktok });
  if (ig) links.push({ label:"Instagram", href: ig });
  if (fb) links.push({ label:"Facebook", href: fb });
  if (website) links.push({ label:"網站 / 官網", href: website });

  // navigation
  const navHref = map ? map : (address ? ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address)) : "");

  // all fields (full form content)
  const allKVs = [];
  const keys = Object.keys(data || {});
  for (const k of keys){
    if (!k) continue;
    const v = data[k];
    if (v === null || typeof v === "undefined") continue;
    const str = String(v);
    if (!str.trim()) continue;
    allKVs.push([k, str]);
  }

  const badges = [];
  if (chosenPlan) badges.push(chosenPlan);
  if (org) badges.push(org);

  const headerBadges = badges.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("");

  const actionsHtml = actions.length
    ? `<div class="actions">${actions.map(a => `<a class="aBtn" href="${escapeAttr(a.href)}" target="_blank" rel="noopener">${escapeHtml(a.label)}</a>`).join("")}</div>`
    : `<div class="hint">（尚未填聯絡方式）</div>`;

  const linksHtml = links.length
    ? `<div class="links">${links.map(l => `
        <div class="linkCard">
          <div class="linkLabel">${escapeHtml(l.label)}</div>
          <div class="linkValue"><a href="${escapeAttr(l.href)}" target="_blank" rel="noopener">開啟</a></div>
        </div>
      `).join("")}</div>`
    : `<div class="hint">（尚未填影音/社群連結）</div>`;

  const navHtml = navHref
    ? `<a class="aBtn" href="${escapeAttr(navHref)}" target="_blank" rel="noopener">前往導航</a>`
    : `<div class="hint">（尚未提供地址/地圖連結）</div>`;

  const wechatHtml = wechat
    ? `<div class="kv"><div class="k">微信</div><div class="v">${escapeHtml(String(wechat))}</div></div>`
    : "";

  const kvHtml = allKVs.map(([k,v]) => {
    // show url as clickable
    const vv = String(v);
    const isUrl = /^https?:\/\//i.test(vv);
    const valueHtml = isUrl
      ? `<a href="${escapeAttr(vv)}" target="_blank" rel="noopener">${escapeHtml(vv)}</a>`
      : `${escapeHtml(vv)}`;
    return `<div class="kv"><div class="k">${escapeHtml(k)}</div><div class="v">${valueHtml}</div></div>`;
  }).join("");

  els.cardArea.innerHTML = `
    <div class="cardHeader">
      <div class="cardTitle">${escapeHtml(String(title))}</div>
      <div class="cardSub">
        ${subtitle ? escapeHtml(String(subtitle)) : "（可在表單補一句話定位/理念）"}
      </div>
      <div class="badgeRow">${headerBadges}</div>
    </div>

    <div class="block">
      <div class="blockTitle">快速聯繫</div>
      ${actionsHtml}
      ${wechatHtml}
    </div>

    <div class="block">
      <div class="blockTitle">影音 / 社群</div>
      ${linksHtml}
    </div>

    <div class="block">
      <div class="blockTitle">導航</div>
      ${navHtml}
      ${address ? `<div class="hint" style="margin-top:10px;">地址：${escapeHtml(String(address))}</div>` : ""}
    </div>

    <div class="block">
      <div class="blockTitle">表單內容（完整）</div>
      ${kvHtml || `<div class="hint">（沒有可顯示的欄位）</div>`}
    </div>
  `;

  els.cardArea.classList.remove("hidden");
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/"/g,"&quot;");
}

async function fetchCard(id, token){
  if (!GAS_WEBAPP_URL) throw new Error("GAS_WEBAPP_URL 未設定");
  const url = `${GAS_WEBAPP_URL}?action=card&id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method:"GET" });
  const json = await res.json();
  return json;
}

async function loadCard(){
  const id = norm(els.inputId.value);
  const token = norm(els.inputToken.value);

  if (!id || !token){
    setMsg("請輸入 id + token。");
    return;
  }

  setMsg("讀取中…");
  els.cardArea.classList.add("hidden");
  els.cardArea.innerHTML = "";

  try{
    const json = await fetchCard(id, token);

    if (!json || !json.ok){
      const msg = (json && (json.message || json.error)) ? (json.message || json.error) : "讀取失敗";
      setMsg(`讀取失敗：${msg}`);
      return;
    }

    setMsg(`OK：${id}（已載入）`);
    renderCard(id, json.data || {});
  }catch(err){
    setMsg(`讀取失敗：${String(err)}`);
  }
}

function bind(){
  // plan cards
  els.cards.forEach(btn => {
    btn.addEventListener("click", () => {
      const plan = btn.getAttribute("data-plan");
      setSelected(plan);
    });
  });

  els.btnNext.addEventListener("click", () => {
    if (els.btnNext.classList.contains("disabled")) return;
    goForm();
  });

  els.btnClear.addEventListener("click", () => setSelected(""));

  els.btnLoad.addEventListener("click", loadCard);

  els.btnDemo.addEventListener("click", () => {
    els.inputId.value = "TW0001";
    els.inputToken.value = "2d0e8ff827044774";
    loadCard();
  });
}

(function init(){
  bind();

  const saved = localStorage.getItem(STORAGE_KEY) || "";
  if (saved) setSelected(saved);
  else setSelected("");

  setMsg("");
})();