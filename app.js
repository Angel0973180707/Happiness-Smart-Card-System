/* Angel - plan chooser (frontend) */
const STORAGE_KEY = "ANGEL_CARD_PLAN";
const FORM_URL = "PASTE_YOUR_FORM_URL_HERE"; 
// ✅ 請把上面這行換成你的 Google 表單連結（客人要填的那一個）

const els = {
  cards: Array.from(document.querySelectorAll(".card[data-plan]")),
  chosenPlan: document.getElementById("chosenPlan"),
  chosenNote: document.getElementById("chosenNote"),
  btnNext: document.getElementById("btnNext"),
  btnClear: document.getElementById("btnClear"),
};

function setSelected(plan) {
  // UI: selected state
  els.cards.forEach(btn => {
    const p = btn.getAttribute("data-plan");
    btn.classList.toggle("selected", p === plan);
    // 未選：卡片呼吸；已選：停止呼吸
    if (plan) btn.classList.remove("breathe");
  });

  // chosen text
  if (!plan) {
    els.chosenPlan.textContent = "尚未選擇";
    els.chosenNote.textContent = "請先點選上方其中一個版型（版型卡片會跳動提醒你）。";

    // Next button disabled + breathe off
    els.btnNext.classList.add("disabled");
    els.btnNext.classList.remove("breathe-soft");
    els.btnNext.setAttribute("aria-disabled", "true");
    els.btnNext.textContent = "請先選一個版型 ↑";

    // cards breathe on
    els.cards.forEach(btn => btn.classList.add("breathe"));

    // storage clear
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  // save
  localStorage.setItem(STORAGE_KEY, plan);

  els.chosenPlan.textContent = plan;
  els.chosenNote.innerHTML = `已選擇：<b>${plan}</b>。<br/>下一步填表時，請選擇相同版型名稱（請記住）。`;

  // Next enabled + breathe on (把視線帶走)
  els.btnNext.classList.remove("disabled");
  els.btnNext.classList.add("breathe-soft");
  els.btnNext.setAttribute("aria-disabled", "false");
  els.btnNext.textContent = `下一步：前往填寫表單（填「${plan}」）`;
}

function goForm() {
  const plan = localStorage.getItem(STORAGE_KEY) || "";
  if (!plan) {
    // 強制引導：沒選就不讓走
    alert("請先選一個版型（精品設計款 / 自由搭配款）。\n選版是參考，但需要記住名稱，下一步填表要填一樣的款式。");
    return;
  }

  if (!FORM_URL || FORM_URL.includes("PASTE_YOUR_FORM_URL_HERE")) {
    alert("請先在 app.js 裡把 FORM_URL 換成你的 Google 表單連結。");
    return;
  }

  // 你若想把 plan 帶到表單（需表單支援預填），未來再加
  window.location.href = FORM_URL;
}

function bind() {
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

  els.btnClear.addEventListener("click", () => {
    setSelected("");
  });
}

(function init(){
  bind();
  const saved = localStorage.getItem(STORAGE_KEY) || "";
  if (saved) {
    // restore selection
    setSelected(saved);
  } else {
    setSelected("");
  }
})();