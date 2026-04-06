/* ============================================================
   HSC form.js
   v8.2-real-submit
   COMPLETE OVERWRITE (PART 1/3)
============================================================ */

(() => {
"use strict";

/* ============================================================
   CONFIG
============================================================ */
const CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
  SERVICE_URL: "https://lin.ee/G3VJoRm",
  SHOWCASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
};

/* ============================================================
   STATE（升級）
============================================================ */
const state = {
  mode: "create",
  cardId: "",
  updateToken: "",
  currentCard: null,
  updateEligibility: null,
  renewalSummary: null,
  planOptions: null,

  photoMeta: {},
  previewMeta: {},
  cropMeta: {},
  photoPreviewUrls: {}
};

/* ============================================================
   BOOT
============================================================ */
document.addEventListener("DOMContentLoaded", bootForm);

function bootForm() {
  const mode = getQuery("mode") || "create";
  state.mode = mode;

  if (mode === "create") bootCreateMode();
  if (mode === "update") bootUpdateMode();
  if (mode === "renew")  bootRenewMode();
}

/* ============================================================
   CREATE MODE
============================================================ */
async function bootCreateMode() {
  try {
    const res = await callApi("getPlanOptions", {});
    state.planOptions = res?.plans || [];
  } catch (e) {
    console.warn("getPlanOptions fail", e);
  }
}

/* ============================================================
   UPDATE MODE
============================================================ */
async function bootUpdateMode() {
  const token = getQuery("token");
  state.updateToken = token;

  if (!token) return showError("缺少 token");

  try {
    const card = await callApi("getCardForUpdate", { token });
    state.currentCard = card;

    const eligibility = await callApi("getUpdateEligibility", { token });
    state.updateEligibility = eligibility;

  } catch (e) {
    showError("載入更新資料失敗");
  }
}

/* ============================================================
   RENEW MODE
============================================================ */
async function bootRenewMode() {
  const cardId = getQuery("card_id");
  state.cardId = cardId;

  if (!cardId) return showError("缺少 card_id");

  try {
    const card = await callApi("getCardForRenewal", { card_id: cardId });
    state.currentCard = card;

    const summary = await callApi("getRenewalSummary", { card_id: cardId });
    state.renewalSummary = summary;

  } catch (e) {
    showError("載入續約資料失敗");
  }
}

/* ============================================================
   API（核心）
============================================================ */
async function callApi(action, params = {}, method = "POST") {
  const clean = {};

  Object.keys(params || {}).forEach(k => {
    const v = params[k];
    if (v === undefined || v === null || v === "") return;
    clean[k] = v;
  });

  clean.action = action;

  const body = new URLSearchParams(clean).toString();

  const res = await fetch(CONFIG.GAS_URL, {
    method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok:false, error:"Invalid JSON", raw:text };
  }
}

/* ============================================================
   工具
============================================================ */
function getQuery(key) {
  return new URLSearchParams(location.search).get(key);
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? (el.value || "").trim() : "";
}

function showError(msg) {
  alert(msg);
}

})();
/* ============================================================
   HSC form.js
   v8.2-real-submit
   COMPLETE OVERWRITE (PART 2/3)
============================================================ */

/* ============================================================
   FEATURES JSON（統一來源）
============================================================ */
function buildFeaturesJsonString() {
  return JSON.stringify({
    photo_meta: state.photoMeta || {},
    preview_meta: state.previewMeta || {},
    crop_meta: state.cropMeta || {},
    photo_preview_urls: state.photoPreviewUrls || {}
  });
}

/* ============================================================
   CREATE PAYLOAD
============================================================ */
function buildCreateLeadPayload() {
  const payload = {
    invite_code: getVal("invite_code"),
    ref: getVal("ref"),
    referrer: getVal("referrer"), // ⭐ 新增推薦人

    plan: getVal("plan"),
    color: getVal("free_color") || getVal("premium_color"),
    style: getVal("free_style"),
    paper: getVal("free_paper"),

    name: getVal("display_name"),
    unit: getVal("unit"),
    title: getVal("title"),
    slogan: getVal("intro"),
    services: getVal("services"),
    experience: getVal("experience"),

    wechat_id: getVal("wechat_id"),
    line_url: getVal("line_url"),
    line_oa: getVal("line_oa"),
    email: getVal("email"),
    phone: getVal("phone"),
    address: getVal("address"),
    website: getVal("website"),

    video1: getVal("video1"),
    video2: getVal("video2"),
    video3: getVal("video3"),

    social1: getVal("social1"),
    social2: getVal("social2"),
    social3: getVal("social3"),

    form_source: "form_create",

    avatar_url: state.photoPreviewUrls?.avatar || "",
    logo_url: state.photoPreviewUrls?.logo || "",

    features_json: buildFeaturesJsonString()
  };

  // 動態照片
  for (let i = 1; i <= 10; i++) {
    const url = state.photoPreviewUrls?.[`photo${i}`];
    if (url) payload[`photo${i}_url`] = url;
  }

  // CTA
  for (let i = 1; i <= 10; i++) {
    const t = getVal(`cta_text_${i}`);
    const l = getVal(`cta_link_${i}`);
    if (t) payload[`cta_text_${i}`] = t;
    if (l) payload[`cta_link_${i}`] = l;
  }

  return payload;
}

/* ============================================================
   UPDATE PAYLOAD
============================================================ */
function buildUpdatePayload() {
  const payload = {
    token: state.updateToken,

    name: getVal("display_name"),
    unit: getVal("unit"),
    title: getVal("title"),
    slogan: getVal("intro"),
    services: getVal("services"),
    experience: getVal("experience"),

    wechat_id: getVal("wechat_id"),
    line_url: getVal("line_url"),
    line_oa: getVal("line_oa"),
    email: getVal("email"),
    phone: getVal("phone"),
    address: getVal("address"),
    website: getVal("website"),

    video1: getVal("video1"),
    video2: getVal("video2"),
    video3: getVal("video3"),

    social1: getVal("social1"),
    social2: getVal("social2"),
    social3: getVal("social3"),

    avatar_url: state.photoPreviewUrls?.avatar || "",
    logo_url: state.photoPreviewUrls?.logo || "",

    features_json: buildFeaturesJsonString()
  };

  for (let i = 1; i <= 10; i++) {
    const url = state.photoPreviewUrls?.[`photo${i}`];
    if (url) payload[`photo${i}_url`] = url;
  }

  for (let i = 1; i <= 10; i++) {
    const t = getVal(`cta_text_${i}`);
    const l = getVal(`cta_link_${i}`);
    if (t) payload[`cta_text_${i}`] = t;
    if (l) payload[`cta_link_${i}`] = l;
  }

  return payload;
}

/* ============================================================
   RENEW PAYLOAD
============================================================ */
function buildRenewPayload() {
  return {
    card_id: state.cardId,
    target_plan: getVal("plan"),

    keep_marquee: "1",
    keep_photo_extra_qty: "1",
    keep_cta_extra_qty: "1",

    update_unlimited_renew: "1",

    submitted_by: getVal("display_name"),
    note: "form_renew"
  };
}

/* ============================================================
   SUBMIT CREATE
============================================================ */
async function submitCreate() {
  renderProgress("建立申請中...");

  const leadPayload = buildCreateLeadPayload();

  const leadRes = await callApi("createLead", leadPayload);

  if (!leadRes?.ok) throw new Error(leadRes?.error || "createLead 失敗");

  const cardRes = await callApi("createCard", {
    lead_id: leadRes.lead_id
  });

  if (!cardRes?.ok) throw new Error(cardRes?.error || "createCard 失敗");

  renderResult({
    type: "create",
    data: {
      lead_id: leadRes.lead_id,
      card_id: cardRes.card_id,
      payment_id: cardRes.payment_id,
      due_at: cardRes.due_at,
      amount: cardRes.amount
    }
  });
}

/* ============================================================
   SUBMIT UPDATE
============================================================ */
async function submitUpdate() {
  renderProgress("更新資料中...");

  const payload = buildUpdatePayload();

  const needCharge = state.updateEligibility?.charge_required;

  if (!needCharge) {
    const res = await callApi("updateCardByToken", payload);

    if (!res?.ok) throw new Error(res?.error || "update 失敗");

    renderResult({
      type: "update_free",
      data: res
    });

  } else {
    const pay = await callApi("createUpdateFeePayment", payload);

    if (!pay?.ok) throw new Error(pay?.error || "建立更新付款失敗");

    renderResult({
      type: "update_paid",
      data: pay
    });
  }
}

/* ============================================================
   SUBMIT RENEW
============================================================ */
async function submitRenew() {
  renderProgress("建立續約中...");

  const payload = buildRenewPayload();

  const res = await callApi("createRenewalPayment", payload);

  if (!res?.ok) throw new Error(res?.error || "續約失敗");

  renderResult({
    type: "renew",
    data: res
  });
}

/* ============================================================
   主 submit 分流
============================================================ */
async function submit(e) {
  e.preventDefault();

  try {
    if (state.mode === "create") await submitCreate();
    if (state.mode === "update") await submitUpdate();
    if (state.mode === "renew")  await submitRenew();
  } catch (err) {
    showError(err.message || "送出失敗");
  }
}
/* ============================================================
   HSC form.js
   v8.2-real-submit
   COMPLETE OVERWRITE (PART 3/3)
============================================================ */

/* ============================================================
   PROGRESS UI
============================================================ */
function renderProgress(text) {
  const overlay = document.getElementById("submit-progress-overlay");
  const txt = document.getElementById("progress-text");

  if (overlay) overlay.classList.remove("hidden");
  if (txt) txt.textContent = text || "處理中...";
}

/* ============================================================
   RESULT RENDER（核心🔥）
============================================================ */
function renderResult({ type, data }) {
  const panel = document.getElementById("progress-success-panel");
  if (!panel) return;

  panel.classList.remove("hidden");

  const cardId =
    data.card_id ||
    data.card?.id ||
    "";

  const paymentId =
    data.payment_id ||
    data.payment?.payment_id ||
    "";

  const dueAt =
    data.due_at ||
    data.payment?.due_at ||
    "";

  const amount =
    data.amount ||
    data.total_amount ||
    data.payment?.amount ||
    "";

  const previewUrl = cardId
    ? `${location.origin}${location.pathname.replace("form.html","")}index.html?id=${cardId}&view=1`
    : "";

  /* ===== 填 UI ===== */

  setText("#progress-card-id-display", cardId || "—");
  setText(".success-name", getVal("display_name"));
  setText(".success-plan", getVal("plan"));

  if (amount) {
    setText(".success-total", `NT$ ${Number(amount).toLocaleString("zh-TW")}`);
  }

  if (dueAt) {
    setText(".success-due", formatDate(dueAt));
  }

  const linkEl = document.getElementById("progress-preview-link");
  if (linkEl && previewUrl) {
    linkEl.href = previewUrl;
    linkEl.textContent = previewUrl;
  }

  /* ===== 客服文案 ===== */

  const notice = buildCustomerMessage({
    cardId,
    paymentId,
    dueAt,
    amount,
    previewUrl
  });

  const copyBtn = document.getElementById("btn-copy-card-notice");

  if (copyBtn) {
    copyBtn.onclick = async () => {
      await copyText(notice);
      copyBtn.textContent = "✅ 已複製";
      setTimeout(() => copyBtn.textContent = "📋 複製序號＋回覆文案", 2000);
    };
  }

  /* ===== 客服按鈕 ===== */

  const serviceBtn = document.getElementById("progress-contact-service");
  if (serviceBtn) {
    serviceBtn.onclick = () => {
      window.open("https://lin.ee/G3VJoRm", "_blank");
    };
  }
}

/* ============================================================
   客服文案生成
============================================================ */
function buildCustomerMessage({ cardId, paymentId, dueAt, amount, previewUrl }) {
  return (
`您好，我已完成智慧名片申請 🙌

📋 名片序號：${cardId || ""}
🧾 訂單編號：${paymentId || ""}
💰 金額：NT$ ${Number(amount || 0).toLocaleString("zh-TW")}
⏰ 付款期限：${formatDate(dueAt)}

🔗 預覽連結：
${previewUrl}

麻煩協助確認並開通，謝謝 🙏`
  );
}

/* ============================================================
   工具函式
============================================================ */
function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text || "";
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`;
  } catch {
    return d;
  }
}

async function copyText(str) {
  if (!str) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(str);
      return;
    }
  } catch (_) {}

  const ta = document.createElement("textarea");
  ta.value = str;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

