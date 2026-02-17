/* Angel - Clean Plan Chooser v362 (FULL OVERWRITE) */

const VERSION = 362;

// storage keys
const K_COLOR = "ANGEL_CARD_COLOR";
const K_PLAN  = "ANGEL_CARD_PLAN";
const K_PAPER = "ANGEL_CARD_PAPER";

// ✅ 你的 Google 表單連結（客人填的）
const FORM_URL = "https://forms.gle/aCoV85GK5vcetbfH6";

const els = {
  colorDots: Array.from(document.querySelectorAll("#colorGroup .dot[data-color]")),
  planBtns: Array.from(document.querySelectorAll("#planGroup .pill[data-plan]")),
  paperBtns: Array.from(document.querySelectorAll("#paperGroup .pill[data-paper]")),

  btnGoForm: document.getElementById("btnGoForm"),
  btnClear: document.getElementById("btnClear"),
  hint: document.getElementById("hint"),

  chipColor: document.getElementById("chipColor"),
  chipPlan: document.getElementById("chipPlan"),
  chipPaper: document.getElementById("chipPaper"),

  preview: document.getElementById("preview"),
};

function setSelectedGroup(list, attr, value) {
  list.forEach(btn => {
    const v = btn.getAttribute(attr);
    btn.classList.toggle("selected", v === value);
  });
}

function updateChips(color, plan, paper) {
  els.chipColor.textContent = `顏色：${color || "未選"}`;
  els.chipPlan.textContent  = `版型：${plan || "未選"}`;
  els.chipPaper.textContent = `紙感：${paper || "未選"}`;
}

function updatePreview(color){
  // only adjust cover gradient (keep clean)
  const cover = els.preview.querySelector(".cover");
  const map = {
    rose:  ["rgba(228,99,99,.95)","rgba(228,99,99,.55)"],
    sky:   ["rgba(74,163,255,.95)","rgba(74,163,255,.55)"],
    amber: ["rgba(224,154,68,.95)","rgba(224,154,68,.55)"],
    violet:["rgba(106,95,232,.95)","rgba(106,95,232,.55)"],
    green: ["rgba(82,179,107,.95)","rgba(82,179,107,.55)"],
  };
  const g = map[color] || ["rgba(58,160,255,.92)","rgba(58,160,255,.55)"];
  cover.style.background = `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}

function setGoButton(plan){
  const hasPlan = !!(plan && String(plan).trim());

  if (!hasPlan) {
    els.btnGoForm.classList.add("disabled");
    els.btnGoForm.classList.remove("glow");
    els.btnGoForm.setAttribute("aria-disabled", "true");
    els.hint.textContent = "小提醒：請先選擇一個版型（上方兩個其一），填表時要選相同名稱。";
    return;
  }

  // enabled + subtle glow
  els.btnGoForm.classList.remove("disabled");
  els.btnGoForm.classList.add("glow");
  els.btnGoForm.setAttribute("aria-disabled", "false");
  els.hint.innerHTML = `小提醒：填表時請選擇剛剛挑選的版型名稱（請記住：<b>${plan}</b>）。`;
}

function saveAndRender({color, plan, paper}) {
  if (color !== undefined) localStorage.setItem(K_COLOR, color || "");
  if (plan  !== undefined) localStorage.setItem(K_PLAN,  plan  || "");
  if (paper !== undefined) localStorage.setItem(K_PAPER, paper || "");

  const c = localStorage.getItem(K_COLOR) || "";
  const p = localStorage.getItem(K_PLAN) || "";
  const pa = localStorage.getItem(K_PAPER) || "";

  setSelectedGroup(els.colorDots, "data-color", c);
  setSelectedGroup(els.planBtns,  "data-plan",  p);
  setSelectedGroup(els.paperBtns, "data-paper", pa);

  updateChips(c, p, pa);
  updatePreview(c);
  setGoButton(p);
}

function goForm() {
  const plan = (localStorage.getItem(K_PLAN) || "").trim();
  if (!plan) {
    alert("請先選擇一個版型（精品設計款 / 自由搭配款）。\n填表時要選相同版型名稱。");
    return;
  }
  window.location.href = FORM_URL;
}

function bind() {
  els.colorDots.forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.getAttribute("data-color") || "";
      saveAndRender({ color });
    });
  });

  els.planBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const plan = btn.getAttribute("data-plan") || "";
      saveAndRender({ plan });
    });
  });

  els.paperBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const paper = btn.getAttribute("data-paper") || "";
      saveAndRender({ paper });
    });
  });

  els.btnGoForm.addEventListener("click", () => {
    if (els.btnGoForm.classList.contains("disabled")) return;
    goForm();
  });

  els.btnClear.addEventListener("click", () => {
    localStorage.removeItem(K_COLOR);
    localStorage.removeItem(K_PLAN);
    localStorage.removeItem(K_PAPER);
    saveAndRender({ color:"", plan:"", paper:"" });
  });
}

(function init(){
  bind();
  // restore
  const color = localStorage.getItem(K_COLOR) || "";
  const plan  = localStorage.getItem(K_PLAN) || "";
  const paper = localStorage.getItem(K_PAPER) || "";
  saveAndRender({ color, plan, paper });
})();