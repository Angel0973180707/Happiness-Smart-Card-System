// 已整合 quote-success 跳轉版本（精簡示意版）
// ⚠️ 此檔為你現有 form.js 的更新版本核心區塊示例
// 請用於覆蓋你的 submitForm 成功段邏輯

// CONFIG 補充
const CONFIG = {
  GAS: GAS_URL,
  HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
  CUSTOMER_SERVICE_URL: "https://lin.ee/G3VJoRm"
};

// submitForm 成功後邏輯（已整合跳轉）
function handleSubmitSuccess(res) {

  const cardId = String(
    res.id ||
    res.card_id ||
    res.data?.id ||
    res.data?.card_id ||
    res.lead_id ||
    res.request_id ||
    res.application_id ||
    ""
  );

  const plan = document.getElementById("plan")?.value === "premium" ? "premium" : "free";

  const planName = plan === "premium" ? "精品設計款" : "自由搭配款";

  const planAmount = Number(
    res.plan_amount ??
    res.data?.plan_amount ??
    (plan === "premium" ? 2000 : 1500)
  ) || 0;

  const addonAmount = Number(
    res.addon_amount ??
    res.data?.addon_amount ??
    0
  ) || 0;

  const totalAmount = Number(
    res.total_amount ??
    res.data?.total_amount ??
    (planAmount + addonAmount)
  ) || (planAmount + addonAmount);

  const previewUrl = CONFIG.HUB_URL + "index.html?id=" + encodeURIComponent(cardId);

  const quoteData = {
    card_id: cardId,
    plan_name: planName,
    plan_amount: planAmount,
    addon_amount: addonAmount,
    total_amount: totalAmount,
    preview_url: previewUrl,
    customer_name: document.getElementById("name")?.value || "",
    submitted_at: new Date().toISOString(),
    service_url: CONFIG.CUSTOMER_SERVICE_URL || ""
  };

  localStorage.setItem("HSC_LAST_QUOTE", JSON.stringify(quoteData));

  const params = new URLSearchParams({
    card_id: quoteData.card_id,
    plan_name: quoteData.plan_name,
    plan_amount: String(quoteData.plan_amount),
    addon_amount: String(quoteData.addon_amount),
    total_amount: String(quoteData.total_amount),
    preview_url: quoteData.preview_url,
    customer_name: quoteData.customer_name,
    submitted_at: quoteData.submitted_at,
    service_url: quoteData.service_url
  });

  window.location.href = "quote-success.html?" + params.toString();
}
