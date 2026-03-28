
(() => {
  "use strict";
  const STORAGE_KEY = "HSC_LAST_QUOTE";
  const SERVICE_URL = "https://lin.ee/G3VJoRm";
  const el = {
    cardId: document.getElementById("cardId"),
    customerName: document.getElementById("customerName"),
    submittedAt: document.getElementById("submittedAt"),
    paymentNotice: document.getElementById("paymentNotice"),
    previewUrl: document.getElementById("previewUrl"),
    openPreviewBtn: document.getElementById("openPreviewBtn"),
    planName: document.getElementById("planName"),
    planAmount: document.getElementById("planAmount"),
    addonItems: document.getElementById("addonItems"),
    addonAmount: document.getElementById("addonAmount"),
    totalAmount: document.getElementById("totalAmount"),
    replyText: document.getElementById("replyText"),
    serviceBtn: document.getElementById("serviceBtn"),
    copyPreviewBtn: document.getElementById("copyPreviewBtn"),
    copyQuoteBtn: document.getElementById("copyQuoteBtn"),
    copyReplyBtn: document.getElementById("copyReplyBtn")
  };
  init();
  function init() {
    const data = readData();
    render(data);
    bind(data);
  }
  function readData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; }
  }
  function render(data) {
    const notice = formatPaymentNotice(data.payment_notice);
    el.cardId.textContent = data.card_id || "-";
    el.customerName.textContent = data.customer_name || "-";
    el.submittedAt.textContent = formatTime(data.submitted_at);
    el.paymentNotice.textContent = notice;
    el.previewUrl.value = data.preview_url || "";
    el.openPreviewBtn.href = data.preview_url || "#";
    el.planName.textContent = data.plan_name || "方案";
    el.planAmount.textContent = money(data.plan_amount);
    el.addonItems.textContent = formatAddonItems(data.addon_items);
    el.addonAmount.textContent = money(data.addon_amount);
    el.totalAmount.textContent = money(data.total_amount);
    el.replyText.value = buildReplyText(data, notice);
    el.serviceBtn.href = SERVICE_URL;
  }
  function bind(data) {
    el.copyPreviewBtn.addEventListener("click", async () => { await copyText(data.preview_url || ""); flash(el.copyPreviewBtn, "已複製預覽連結"); });
    el.copyQuoteBtn.addEventListener("click", async () => { await copyText(buildQuoteText(data)); flash(el.copyQuoteBtn, "已複製報價單"); });
    el.copyReplyBtn.addEventListener("click", async () => { await copyText(buildReplyText(data, formatPaymentNotice(data.payment_notice))); flash(el.copyReplyBtn, "已複製回覆文案"); });
  }
  function formatAddonItems(items) {
    if (!Array.isArray(items) || !items.length) return "未加購";
    return items.map(item => item.qty && item.unit_price ? `${item.name}｜${item.qty} × ${money(item.unit_price)}｜${money(item.amount)}` : `${item.name}｜${money(item.amount)}`).join("\n");
  }
  function buildQuoteText(data) {
    return [
      "【天使幸福智慧名片報價單】",
      `卡片編號：${data.card_id || "-"}`,
      `方案名稱：${data.plan_name || "方案"}`,
      `方案金額：${money(data.plan_amount)}`,
      `加購明細：${formatAddonItems(data.addon_items)}`,
      `加購金額：${money(data.addon_amount)}`,
      `總金額：${money(data.total_amount)}`,
      `成品預覽：${data.preview_url || "-"}`,
      `付款提醒：${formatPaymentNotice(data.payment_notice)}`
    ].join("\n");
  }
  function buildReplyText(data, notice) {
    return [
      "您好，我已送出智慧名片申請資料。",
      `卡片編號：${data.card_id || "-"}`,
      `方案：${data.plan_name || "方案"}`,
      `加購：${formatAddonItems(data.addon_items)}`,
      `總金額：${money(data.total_amount)}`,
      `成品預覽連結：${data.preview_url || "-"}`,
      `付款提醒：${notice}`,
      "我已確認報價與預覽內容，請提供付款資訊，謝謝。"
    ].join("\n");
  }
  function formatPaymentNotice(notice) {
    if (!notice) return "請於 3 天內完成付款";
    if (typeof notice === "string") return notice;
    try { return JSON.stringify(notice, null, 2); } catch { return "請於 3 天內完成付款"; }
  }
  function formatTime(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString("zh-TW", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }
  function money(v) { return `NT$ ${Number(v || 0).toLocaleString("zh-TW")}`; }
  async function copyText(str) {
    if (!str) return;
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(str);
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  function flash(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => btn.textContent = old, 1800);
  }
})();
