/* ==============================
   Angel Smart Card – Frontend
   app.js v364 (FULL OVERWRITE)
   - Plan chooser + breathe guide
   - Guide overlay open/close (never stuck)
   - Optional gallery: swipe + click full image
================================ */

const VERSION = 364;

const STORAGE_KEY = "ANGEL_CARD_PLAN";
const FORM_URL = "https://forms.gle/B13z5M2mwwv9ZKME8";

const els = {
  cards: Array.from(document.querySelectorAll(".card[data-plan]")),
  chosenPlan: document.getElementById("chosenPlan"),
  btnNext: document.getElementById("btnNext"),
  btnClear: document.getElementById("btnClear"),
  btnGuide: document.getElementById("btnGuide"),
  guidePanel: document.getElementById("guidePanel"),
  guideClose: document.getElementById("guideClose"),

  // optional gallery
  galleryItems: Array.from(document.querySelectorAll(".gallery-item img")),
};

function safe(el) {
  return !!el;
}

/* ---------- UI helpers ---------- */
function setCardsBreathe(on) {
  els.cards.forEach(btn => {
    btn.classList.toggle("breathe", !!on && !btn.classList.contains("selected"));
  });
}

function setNextEnabled(enabled, planText = "") {
  if (!safe(els.btnNext)) return;
  els.btnNext.classList.toggle("disabled", !enabled);
  els.btnNext.classList.toggle("breathe-soft", !!enabled);
  els.btnNext.setAttribute("aria-disabled", enabled ? "false" : "true");

  // 文字盡量少、直覺
  if (!enabled) {
    els.btnNext.textContent = "下一步";
  } else {
    els.btnNext.textContent = "前往填表";
  }
}

/* ---------- Plan ---------- */
function setSelected(plan) {
  // selected state
  els.cards.forEach(btn => {
    const p = btn.dataset.plan || "";
    btn.classList.toggle("selected", p === plan);
    // 只要已經選了，就不要卡片一直跳
    btn.classList.remove("breathe");
  });

  if (!plan) {
    localStorage.removeItem(STORAGE_KEY);

    if (safe(els.chosenPlan)) els.chosenPlan.textContent = "請選擇版型";
    setNextEnabled(false);
    setCardsBreathe(true);
    return;
  }

  localStorage.setItem(STORAGE_KEY, plan);

  if (safe(els.chosenPlan)) els.chosenPlan.textContent = `已選：${plan}`;
  setNextEnabled(true, plan);
}

function goForm() {
  const plan = localStorage.getItem(STORAGE_KEY) || "";
  if (!plan) {
    alert("請先選擇版型（精品設計款 / 自由搭配款）");
    return;
  }
  window.location.href = FORM_URL;
}

/* ---------- Guide overlay (never stuck) ---------- */
function openGuide() {
  if (!safe(els.guidePanel)) return;
  els.guidePanel.classList.add("show");
}

function closeGuide() {
  if (!safe(els.guidePanel)) return;
  els.guidePanel.classList.remove("show");
}

function bindGuideCloseBehaviors() {
  if (!safe(els.guidePanel)) return;

  // 1) Close button
  if (safe(els.guideClose)) {
    els.guideClose.addEventListener("click", closeGuide);
  }

  // 2) Click backdrop to close (點黑色區域就關)
  els.guidePanel.addEventListener("click", (ev) => {
    if (ev.target === els.guidePanel) closeGuide();
  });

  // 3) ESC to close
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeGuide();
  });
}

/* ---------- Optional Gallery (swipe + full) ---------- */
function ensureImgModal() {
  let modal = document.getElementById("imgModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "imgModal";
  modal.className = "img-modal";
  modal.innerHTML = `
    <button class="close" type="button" aria-label="close">關閉</button>
    <img alt="preview" />
  `;
  document.body.appendChild(modal);

  // close behaviors
  const btn = modal.querySelector(".close");
  btn.addEventListener("click", () => modal.classList.remove("show"));
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) modal.classList.remove("show");
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") modal.classList.remove("show");
  });

  return modal;
}

function bindGallery() {
  if (!els.galleryItems.length) return; // 沒有就跳過
  const modal = ensureImgModal();
  const img = modal.querySelector("img");

  els.galleryItems.forEach(it => {
    it.addEventListener("click", () => {
      const src = it.getAttribute("src");
      if (!src) return;
      img.src = src;
      modal.classList.add("show");
    });
  });
}

/* ---------- Bind ---------- */
function bind() {
  // Plan cards
  els.cards.forEach(btn => {
    btn.addEventListener("click", () => {
      const plan = btn.dataset.plan || "";
      setSelected(plan);
    });
  });

  // Next
  if (safe(els.btnNext)) {
    els.btnNext.addEventListener("click", () => {
      if (els.btnNext.classList.contains("disabled")) return;
      goForm();
    });
  }

  // Clear selection
  if (safe(els.btnClear)) {
    els.btnClear.addEventListener("click", () => setSelected(""));
  }

  // Guide open
  if (safe(els.btnGuide)) {
    els.btnGuide.addEventListener("click", openGuide);
  }

  bindGuideCloseBehaviors();
  bindGallery();
}

/* ---------- Init ---------- */
(function init() {
  bind();
  const saved = localStorage.getItem(STORAGE_KEY) || "";
  if (saved) setSelected(saved);
  else setSelected("");

  // debug
  // console.log("Angel Frontend", { VERSION, saved });
})();