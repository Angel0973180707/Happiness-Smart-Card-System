/************************************************
 * Happiness Smart Card System — Frontend v730.1
 * COMPLETE OVERWRITE
 *
 * v730.1 focus:
 * 1) 代理識別分享入口
 * 2) 門面按鈕重整
 * 3) 申請邀請碼前後台連動（leadCreate）
 * 4) 保留首頁模式 / 名片模式雙路徑
 ************************************************/

const CONFIG = {
  GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  CUSTOMER_SERVICE_URL: "https://lin.ee/3r2ZePN",
  DEFAULT_TENANT: "angel",
  VERSION: "v730.1",
  FETCH_TIMEOUT_MS: 15000,
  RETRY: 3,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/"
};

const FEATURE_ITEMS = [
  {
    title: "一頁整合聯絡方式",
    desc: "可整合電話、LINE、Email、地址、網站與社群，對方一頁就能找到你。"
  },
  {
    title: "可放照片牆與品牌形象",
    desc: "頭像、Logo、作品照片、品牌氛圍都能呈現，比紙本名片更有記憶點。"
  },
  {
    title: "可設定行動按鈕",
    desc: "依行業需求設定 CTA，例如報價諮詢、預約服務、查看作品、導航前往。"
  },
  {
    title: "分享方便",
    desc: "可用網址、QR、社群、聊天工具分享，也適合長期作為對外入口。"
  },
  {
    title: "適合創業者與服務業",
    desc: "講師、顧問、美業、餐飲、房仲、保險、水電電腦行等都可使用。"
  },
  {
    title: "可延伸推薦識別",
    desc: "代理名片可自帶來源識別分享入口，後續申請可追蹤推薦來源。"
  }
];

const FLOW_ITEMS = [
  {
    title: "了解智慧名片",
    desc: "先看功能、特色與實際呈現方式，確認這是不是你需要的入口頁。"
  },
  {
    title: "申請邀請碼",
    desc: "填寫申請資料，系統建立申請紀錄，客服後續協助提供邀請碼。"
  },
  {
    title: "客服確認需求",
    desc: "可透過 LINE 官方帳號與客服確認方案、內容與適合的呈現方式。"
  },
  {
    title: "填寫表單資料",
    desc: "收到邀請碼後進入表單填寫資料，上傳照片與設定名片內容。"
  },
  {
    title: "製作專屬名片",
    desc: "系統產出可分享的智慧名片，作為你的聯絡、展示與行動入口。"
  },
  {
    title: "完成後可分享使用",
    desc: "可分享給客戶、朋友、社群，也能作為後續推薦與延伸入口。"
  }
];

const state = {
  id: "",
  tenant: "",
  ref: "",
  currentCard: null,
  currentLeadId: ""
};

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function text(v){ return v == null ? "" : String(v).trim(); }
function escapeHtml(str){
  return text(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function getQueryParam(name){
  const url = new URL(window.location.href);
  return text(url.searchParams.get(name));
}
function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise((_, reject)=>setTimeout(()=>reject(new Error("timeout")), ms))
  ]);
}

async function fetchApi(params = {}, method = "GET"){
  let lastErr = null;

  for(let i=0;i<CONFIG.RETRY;i++){
    try{
      let url = CONFIG.GAS;
      const opts = { method };

      if(method === "GET"){
        const qsText = new URLSearchParams(params).toString();
        url += (url.includes("?") ? "&" : "?") + qsText;
      }else{
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(params);
      }

      const res = await withTimeout(fetch(url, opts), CONFIG.FETCH_TIMEOUT_MS);
      const data = await res.json();

      if(!data || !data.ok){
        throw new Error((data && data.error) || "api error");
      }
      return data;
    }catch(err){
      lastErr = err;
    }
  }

  throw lastErr || new Error("fetch failed");
}

async function copyText(value, doneText = "已複製"){
  const v = text(value);
  if(!v) return false;

  try{
    await navigator.clipboard.writeText(v);
    showToast(doneText);
    return true;
  }catch(_err){
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand("copy");
      showToast(doneText);
      document.body.removeChild(ta);
      return true;
    }catch(err){
      document.body.removeChild(ta);
      showToast("複製失敗");
      return false;
    }
  }
}

async function shareData({ title, text: shareText, url }){
  if(navigator.share){
    try{
      await navigator.share({ title, text: shareText, url });
      return true;
    }catch(_err){
      return false;
    }
  }
  return false;
}

function showToast(msg){
  const el = qs("#toast");
  if(!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>{
    el.hidden = true;
  }, 1800);
}

function appendRefToUrl(baseUrl, ref){
  const url = new URL(baseUrl, window.location.origin);
  if(ref) url.searchParams.set("ref", ref);
  if(!url.searchParams.get("tenant")) url.searchParams.set("tenant", state.tenant);
  return url.toString();
}

function hubEntryUrl(){
  const url = new URL(CONFIG.HUB_URL);
  url.searchParams.set("tenant", state.tenant);
  if(state.ref) url.searchParams.set("ref", state.ref);
  return url.toString();
}

function setCustomerServiceLinks(){
  const links = [
    "#btnCustomerService",
    "#btnLeadCustomerService",
    "#btnLeadSuccessCustomerService"
  ];
  links.forEach(sel => {
    const el = qs(sel);
    if(el) el.href = CONFIG.CUSTOMER_SERVICE_URL;
  });
}
function renderFacade(){
  qs("#facadeMode").hidden = false;
  qs("#cardMode").hidden = true;

  const refBadge = qs("#refBadge");
  if(refBadge){
    if(state.ref){
      refBadge.hidden = false;
      refBadge.textContent = `來源識別：${state.ref}`;
    }else{
      refBadge.hidden = true;
    }
  }

  const featureWrap = qs("#featureCards");
  const flowWrap = qs("#flowCards");

  if(featureWrap){
    featureWrap.innerHTML = FEATURE_ITEMS.map(item => `
      <article class="facade-feature-card">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.desc)}</p>
      </article>
    `).join("");
  }

  if(flowWrap){
    flowWrap.innerHTML = FLOW_ITEMS.map((item, idx) => `
      <article class="facade-flow-card">
        <div class="facade-flow-card__num">${idx + 1}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.desc)}</p>
      </article>
    `).join("");
  }

  bindFacadeEvents();
}

function bindFacadeEvents(){
  const introBtn = qs("#btnOpenIntro");
  const leadBtn = qs("#btnOpenLead");
  const shareTop = qs("#btnShareFacadeTop");
  const shareBottom = qs("#btnShareFacadeBottom");
  const closeLead = qs("#btnCloseLeadDialog");
  const leadBackdrop = qs("#leadDialogBackdrop");
  const leadForm = qs("#leadForm");
  const copyLeadIdBtn = qs("#btnCopyLeadId");

  if(introBtn){
    introBtn.onclick = () => {
      const target = qs("#introSection");
      if(target) target.scrollIntoView({ behavior:"smooth", block:"start" });
    };
  }

  if(leadBtn){
    leadBtn.onclick = openLeadDialog;
  }

  if(shareTop){
    shareTop.onclick = shareFacade;
  }

  if(shareBottom){
    shareBottom.onclick = shareFacade;
  }

  if(closeLead){
    closeLead.onclick = closeLeadDialog;
  }

  if(leadBackdrop){
    leadBackdrop.onclick = closeLeadDialog;
  }

  if(leadForm){
    leadForm.onsubmit = submitLeadForm;
  }

  if(copyLeadIdBtn){
    copyLeadIdBtn.onclick = () => copyText(state.currentLeadId, "申請編號已複製");
  }

  const leadRefHint = qs("#leadRefHint");
  if(leadRefHint){
    if(state.ref){
      leadRefHint.hidden = false;
      leadRefHint.textContent = `本次申請將自動記錄推薦來源：${state.ref}`;
    }else{
      leadRefHint.hidden = true;
    }
  }
}

function openLeadDialog(){
  const dialog = qs("#leadDialog");
  if(!dialog) return;
  dialog.hidden = false;
  document.body.style.overflow = "hidden";

  const form = qs("#leadForm");
  const success = qs("#leadSuccess");
  if(form) form.hidden = false;
  if(success) success.hidden = true;
}

function closeLeadDialog(){
  const dialog = qs("#leadDialog");
  if(!dialog) return;
  dialog.hidden = true;
  document.body.style.overflow = "";
}

async function submitLeadForm(e){
  e.preventDefault();

  const payload = {
    action: "leadCreate",
    tenant: state.tenant,
    ref: state.ref,
    customer_name: text(qs("#leadCustomerName")?.value),
    phone: text(qs("#leadPhone")?.value),
    email: text(qs("#leadEmail")?.value),
    line_id: text(qs("#leadLineId")?.value),
    note: text(qs("#leadNote")?.value)
  };

  if(!payload.customer_name || !payload.phone){
    showToast("請先填寫姓名與電話");
    return;
  }

  const submitBtn = qs("#btnSubmitLead");
  if(submitBtn){
    submitBtn.disabled = true;
    submitBtn.textContent = "送出中...";
  }

  try{
    const res = await fetchApi(payload, "POST");
    const leadId = text(res?.data?.lead_id);
    state.currentLeadId = leadId;

    const leadForm = qs("#leadForm");
    const leadSuccess = qs("#leadSuccess");
    const leadResultId = qs("#leadResultId");

    if(leadResultId) leadResultId.textContent = leadId || "-";
    if(leadForm) leadForm.hidden = true;
    if(leadSuccess) leadSuccess.hidden = false;

    showToast("申請已送出");
  }catch(err){
    showToast(text(err.message || err) || "送出失敗");
  }finally{
    if(submitBtn){
      submitBtn.disabled = false;
      submitBtn.textContent = "送出申請";
    }
  }
}

async function shareFacade(){
  const url = hubEntryUrl();
  const ok = await shareData({
    title: "天使幸福智慧名片館",
    text: "智慧名片訂製服務入口，適合創業者、講師與服務業。",
    url
  });

  if(!ok){
    await copyText(url, "智慧名片館連結已複製");
  }
}
function resolveReferralAgentId(card){
  const agentId = text(card.agent_id);
  const isAgent = ["1","true","yes","y"].includes(text(card.is_agent).toLowerCase());
  const serviceAgent = text(card.service_agent);

  if(agentId) return agentId;
  if(isAgent && serviceAgent) return serviceAgent;
  return "";
}

function renderCard(card){
  state.currentCard = card;
  qs("#facadeMode").hidden = true;
  qs("#cardMode").hidden = false;

  const avatar = text(card.avatar_url || card.avatar_img || "");
  const unit = text(card.unit);
  const name = text(card.name || card.id || "");
  const title = text(card.title);
  const slogan = text(card.slogan);
  const services = text(card.services);
  const experience = text(card.experience);

  const avatarEl = qs("#cardAvatar");
  if(avatarEl){
    avatarEl.src = avatar || "./icons/icon-192.png?v=730.1";
    avatarEl.alt = name || "avatar";
  }

  if(qs("#cardUnit")) qs("#cardUnit").textContent = unit;
  if(qs("#cardName")) qs("#cardName").textContent = name;
  if(qs("#cardTitle")) qs("#cardTitle").textContent = title;
  if(qs("#cardSlogan")) qs("#cardSlogan").textContent = slogan;

  if(qs("#cardServices")) qs("#cardServices").textContent = services;
  if(qs("#cardExperience")) qs("#cardExperience").textContent = experience;
  if(qs("#cardServicesBlock")) qs("#cardServicesBlock").hidden = !services;
  if(qs("#cardExperienceBlock")) qs("#cardExperienceBlock").hidden = !experience;

  renderContactList(card);
  renderCtaList(card);
  renderPhotos(card);
  renderVideos(card);
  renderReferral(card);
  bindCardEvents(card);
}

function renderContactList(card){
  const list = qs("#cardContactList");
  if(!list) return;

  const items = [];

  if(text(card.phone)) items.push({ label:`電話聯絡｜${text(card.phone)}`, href:`tel:${text(card.phone)}` });
  if(text(card.line_url)) items.push({ label:"加 LINE 好友", href:text(card.line_url) });
  if(text(card.line_oa)) items.push({ label:"加入 LINE 官方帳號", href:text(card.line_oa) });
  if(text(card.email)) items.push({ label:`Email｜${text(card.email)}`, href:`mailto:${text(card.email)}` });
  if(text(card.website)) items.push({ label:"官方網站", href:text(card.website) });
  if(text(card.address)) items.push({
    label:`導航前往｜${text(card.address)}`,
    href:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text(card.address))}`
  });

  list.innerHTML = items.map(item => `
    <a class="contact-item" href="${escapeHtml(item.href)}" target="_blank" rel="noopener">
      ${escapeHtml(item.label)}
    </a>
  `).join("");
}

function renderCtaList(card){
  const list = qs("#cardCtaList");
  if(!list) return;

  const ctas = [];
  for(let i=1;i<=3;i++){
    const label = text(card[`cta_text_${i}`]);
    const link = text(card[`cta_link_${i}`]);
    if(label && link){
      ctas.push({ label, link });
    }
  }

  list.innerHTML = ctas.map(item => `
    <a class="cta-item" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">
      ${escapeHtml(item.label)}
    </a>
  `).join("");
}

function renderPhotos(card){
  const wrap = qs("#cardPhotoWall");
  const block = qs("#cardPhotosBlock");
  if(!wrap || !block) return;

  const photos = [
    card.photo1_url || card.photo1_img,
    card.photo2_url || card.photo2_img,
    card.photo3_url || card.photo3_img,
    card.photo4_url || card.photo4_img,
    card.photo5_url || card.photo5_img
  ].map(text).filter(Boolean);

  block.hidden = photos.length === 0;
  wrap.innerHTML = photos.map(src => `<img src="${escapeHtml(src)}" alt="photo" loading="lazy" />`).join("");
}

function renderVideos(card){
  const wrap = qs("#cardVideos");
  const block = qs("#cardVideosBlock");
  if(!wrap || !block) return;

  const videos = [card.video1, card.video2, card.video3].map(text).filter(Boolean);
  block.hidden = videos.length === 0;

  wrap.innerHTML = videos.map((url, idx) => `
    <a class="video-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">
      觀看影片 ${idx + 1}
    </a>
  `).join("");
}
function renderReferral(card){
  const block = qs("#referralBlock");
  const box = qs("#referralUrl");
  if(!block || !box) return;

  const agentId = resolveReferralAgentId(card);

  if(!agentId){
    block.hidden = true;
    return;
  }

  const url = new URL(CONFIG.HUB_URL);
  url.searchParams.set("tenant", text(card.tenant || state.tenant || CONFIG.DEFAULT_TENANT));
  url.searchParams.set("ref", agentId);

  box.value = url.toString();
  block.hidden = false;
}

function bindCardEvents(card){
  const cardUrl = new URL(CONFIG.HUB_URL);
  cardUrl.searchParams.set("id", text(card.id));

  const shareCardFn = async () => {
    const ok = await shareData({
      title: text(card.name || "智慧名片"),
      text: text(card.slogan || "這是我的智慧名片"),
      url: cardUrl.toString()
    });
    if(!ok){
      await copyText(cardUrl.toString(), "名片連結已複製");
    }
  };

  const btnShareCard = qs("#btnShareCard");
  const btnShareCardBottom = qs("#btnShareCardBottom");
  if(btnShareCard) btnShareCard.onclick = shareCardFn;
  if(btnShareCardBottom) btnShareCardBottom.onclick = shareCardFn;

  const referralUrl = text(qs("#referralUrl")?.value);
  const btnCopyReferralLink = qs("#btnCopyReferralLink");
  const btnShareReferralLink = qs("#btnShareReferralLink");

  if(btnCopyReferralLink){
    btnCopyReferralLink.onclick = () => copyText(referralUrl, "推薦入口已複製");
  }

  if(btnShareReferralLink){
    btnShareReferralLink.onclick = async () => {
      const ok = await shareData({
        title: "申請智慧名片入口",
        text: "這是我推薦的智慧名片申請入口。",
        url: referralUrl
      });
      if(!ok){
        await copyText(referralUrl, "推薦入口已複製");
      }
    };
  }
}

async function initCardMode(){
  try{
    const res = await fetchApi({
      action: "card",
      id: state.id
    }, "GET");

    const card = res?.data || {};
    renderCard(card);
  }catch(err){
    showToast(text(err.message || err) || "名片讀取失敗");
    qs("#facadeMode").hidden = false;
    qs("#cardMode").hidden = true;
  }
}

function init(){
  state.id = getQueryParam("id");
  state.tenant = getQueryParam("tenant") || CONFIG.DEFAULT_TENANT;
  state.ref = getQueryParam("ref");

  setCustomerServiceLinks();

  if(state.id){
    initCardMode();
  }else{
    renderFacade();
  }
}

document.addEventListener("DOMContentLoaded", init);