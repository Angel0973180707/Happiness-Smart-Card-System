(() => {
  "use strict";

  const STORAGE_KEY = "HSC_LAST_QUOTE";

  const el = {
    cardId: document.getElementById("cardId"),
    customerName: document.getElementById("customerName"),
    submittedAt: document.getElementById("submittedAt"),
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
    bindActions(data);
  }

  function readData() {
    const url = new URL(window.location.href);
    const q = url.searchParams;

    let localData = {};
    try {
      localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {
      localData = {};
    }

    let addonItems = [];
    const addonRaw = text(q.get("addon_items")) || "";
    try {
      addonItems = addonRaw ? JSON.parse(addonRaw) : (Array.isArray(localData.addon_items) ? localData.addon_items : []);
    } catch {
      addonItems = Array.isArray(localData.addon_items) ? localData.addon_items : [];
    }

    return {
      card_id: text(q.get("card_id")) || text(localData.card_id),
      plan_name: text(q.get("plan_name")) || text(localData.plan_name) || "方案",
      plan_amount: toNumber(q.get("plan_amount"), localData.plan_amount),
      addon_amount: toNumber(q.get("addon_amount"), localData.addon_amount),
      total_amount: toNumber(q.get("total_amount"), localData.total_amount),
      preview_url: text(q.get("preview_url")) || text(localData.preview_url),
      customer_name: text(q.get("customer_name")) || text(localData.customer_name) || "未提供",
      submitted_at: text(q.get("submitted_at")) || text(localData.submitted_at),
      service_url: text(q.get("service_url")) || text(localData.service_url),
      addon_items: addonItems
    };
  }

  function render(data) {
    if (el.cardId) el.cardId.textContent = data.card_id || "-";
    if (el.customerName) el.customerName.textContent = data.customer_name || "-";
    if (el.submittedAt) el.submittedAt.textContent = formatTime(data.submitted_at);
    if (el.previewUrl) el.previewUrl.value = data.preview_url || "";
    if (el.openPreviewBtn) el.openPreviewBtn.href = data.preview_url || "#";
    if (el.planName) el.planName.textContent = data.plan_name || "方案";
    if (el.planAmount) el.planAmount.textContent = money(data.plan_amount);
    if (el.addonAmount) el.addonAmount.textContent = money(data.addon_amount);
    if (el.totalAmount) el.totalAmount.textContent = money(data.total_amount);
    if (el.serviceBtn) el.serviceBtn.href = "https://lin.ee/G3VJoRm";
    if (el.addonItems) el.addonItems.textContent = formatAddonItems(data.addon_items);
    if (el.replyText) el.replyText.value = buildReplyText(data);
  }

  function bindActions(data) {
    el.copyPreviewBtn?.addEventListener("click", async () => {
      await copyText(data.preview_url || "");
      flash(el.copyPreviewBtn, "已複製預覽連結");
    });

    el.copyQuoteBtn?.addEventListener("click", async () => {
      await copyText(buildQuoteText(data));
      flash(el.copyQuoteBtn, "已複製報價單");
    });

    el.copyReplyBtn?.addEventListener("click", async () => {
      await copyText(buildReplyText(data));
      flash(el.copyReplyBtn, "已複製回覆文案");
    });
  }

  function formatAddonItems(items) {
    if (!Array.isArray(items) || !items.length) return "未加購";
    return items.map((item) => {
      let out = "";
      if (item.qty && item.unit_price) {
        out = `${item.name || "加購"}｜${item.qty} × ${money(item.unit_price || 0)}｜${money(item.amount || 0)}`;
      } else {
        out = `${item.name || "加購"}｜${money(item.amount || 0)}`;
      }
      if (Array.isArray(item.messages) && item.messages.length) {
        out += "
" + item.messages.map((m, i) => `第 ${i + 1} 則：${m}`).join("
");
      }
      return out;
    }).join("
");
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
      "提醒：請於 3 天內完成付款。"
    ].join("\n");
  }

  function buildReplyText(data) {
    return [
      "您好，我已送出智慧名片申請資料。",
      `卡片編號：${data.card_id || "-"}`,
      `方案：${data.plan_name || "方案"}`,
      `加購：${formatAddonItems(data.addon_items)}`,
      `總金額：${money(data.total_amount)}`,
      `成品預覽連結：${data.preview_url || "-"}`,
      "我已確認報價與預覽內容，請提供付款資訊，謝謝。"
    ].join("\n");
  }

  function formatTime(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function money(v) {
    const n = Number(v) || 0;
    return `NT$ ${n.toLocaleString("zh-TW")}`;
  }

  function toNumber(...vals) {
    for (const v of vals) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  }

  function text(v) {
    return v == null ? "" : String(v).trim();
  }

  async function copyText(str) {
    if (!str) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(str);
      return;
    }
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
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => {
      btn.textContent = old;
    }, 1800);
  }
})();