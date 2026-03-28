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
  const data = readData();
  render(data); bind(data);

  function readData(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{};}catch(_){return {};}}
  function render(data){
    const notice = formatPaymentNotice(data.payment_notice);
    if(el.cardId) el.cardId.textContent = data.card_id || "-";
    if(el.customerName) el.customerName.textContent = data.customer_name || "-";
    if(el.submittedAt) el.submittedAt.textContent = formatTime(data.submitted_at);
    if(el.paymentNotice) el.paymentNotice.textContent = notice;
    if(el.previewUrl) el.previewUrl.value = data.preview_url || "";
    if(el.openPreviewBtn) el.openPreviewBtn.href = data.preview_url || "#";
    if(el.planName) el.planName.textContent = data.plan_name || "方案";
    if(el.planAmount) el.planAmount.textContent = money(data.plan_amount);
    if(el.addonItems) el.addonItems.textContent = formatAddonItems(data.addon_items);
    if(el.addonAmount) el.addonAmount.textContent = money(data.addon_amount);
    if(el.totalAmount) el.totalAmount.textContent = money(data.total_amount);
    if(el.replyText) el.replyText.value = buildReply(data, notice);
    if(el.serviceBtn) el.serviceBtn.href = SERVICE_URL;
  }
  function bind(data){
    el.copyPreviewBtn?.addEventListener("click", async ()=>{ await copyText(data.preview_url || ""); flash(el.copyPreviewBtn, "已複製預覽連結"); });
    el.copyQuoteBtn?.addEventListener("click", async ()=>{ await copyText(buildQuote(data)); flash(el.copyQuoteBtn, "已複製報價單"); });
    el.copyReplyBtn?.addEventListener("click", async ()=>{ await copyText(buildReply(data, formatPaymentNotice(data.payment_notice))); flash(el.copyReplyBtn, "已複製回覆文案"); });
  }
  function formatAddonItems(items){ if(!Array.isArray(items)||!items.length) return "未加購"; return items.map(i=>i.qty&&i.unit_price?`${i.name}｜${i.qty} × ${money(i.unit_price)}｜${money(i.amount)}`:`${i.name}｜${money(i.amount)}`).join("\n");}
  function buildQuote(data){ return ["【天使幸福智慧名片報價單】",`卡片編號：${data.card_id||"-"}`,`方案名稱：${data.plan_name||"方案"}`,`方案金額：${money(data.plan_amount)}`,`加購明細：${formatAddonItems(data.addon_items)}`,`加購金額：${money(data.addon_amount)}`,`總金額：${money(data.total_amount)}`,`成品預覽：${data.preview_url||"-"}`,`付款提醒：${formatPaymentNotice(data.payment_notice)}`].join("\n");}
  function buildReply(data, notice){ return ["您好，我已送出智慧名片申請資料。",`卡片編號：${data.card_id||"-"}`,`方案：${data.plan_name||"方案"}`,`加購：${formatAddonItems(data.addon_items)}`,`總金額：${money(data.total_amount)}`,`成品預覽連結：${data.preview_url||"-"}`,`付款提醒：${notice}`,"我已確認報價與預覽內容，請提供付款資訊，謝謝。"].join("\n");}
  function formatPaymentNotice(v){ if(!v) return "請於 3 天內完成付款"; return typeof v === "string" ? v : JSON.stringify(v,null,2); }
  function formatTime(v){ if(!v) return "-"; const d=new Date(v); return Number.isNaN(d.getTime())?v:d.toLocaleString("zh-TW",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}); }
  function money(v){ return `NT$ ${(Number(v)||0).toLocaleString("zh-TW")}`; }
  async function copyText(str){ if(!str)return; if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(str); const ta=document.createElement("textarea"); ta.value=str; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();}
  function flash(btn,text){ if(!btn)return; const old=btn.textContent; btn.textContent=text; setTimeout(()=>btn.textContent=old,1800); }
})();
