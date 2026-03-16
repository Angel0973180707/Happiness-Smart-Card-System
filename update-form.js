/* =========================================
 * HSC update-form.js v803
 * COMPLETE OVERWRITE
 *
 * For GAS v723.3
 * - read id / utoken from URL
 * - GET action=getCardForUpdate
 * - read { ok:true, data:{...} }
 * - fill text fields
 * - fill image preview from *_url or *_img
 * - POST action=updateCardByToken
 * ========================================= */

(() => {
  "use strict";

  const GAS_URL = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const VERSION = "803";

  const TEXT_FIELDS = [
    "name","unit","title","slogan","services","experience",
    "phone","email","line_url","line_oa","wechat_id","website","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3"
  ];

  const IMAGE_FIELDS = [
    "avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url"
  ];

  const IMAGE_SLOTS = {
    avatar: {
      inputId: "avatar_url",
      previewId: "preview_avatar",
      statusId: "status_avatar",
      fallback: ["avatar_url", "avatar_img_fast", "avatar_img"]
    },
    logo: {
      inputId: "logo_url",
      previewId: "preview_logo",
      statusId: "status_logo",
      fallback: ["logo_url", "logo_img_fast", "logo_img"]
    },
    photo1: {
      inputId: "photo1_url",
      previewId: "preview_photo1",
      statusId: "status_photo1",
      fallback: ["photo1_url", "photo1_img_fast", "photo1_img"]
    },
    photo2: {
      inputId: "photo2_url",
      previewId: "preview_photo2",
      statusId: "status_photo2",
      fallback: ["photo2_url", "photo2_img_fast", "photo2_img"]
    },
    photo3: {
      inputId: "photo3_url",
      previewId: "preview_photo3",
      statusId: "status_photo3",
      fallback: ["photo3_url", "photo3_img_fast", "photo3_img"]
    },
    photo4: {
      inputId: "photo4_url",
      previewId: "preview_photo4",
      statusId: "status_photo4",
      fallback: ["photo4_url", "photo4_img_fast", "photo4_img"]
    },
    photo5: {
      inputId: "photo5_url",
      previewId: "preview_photo5",
      statusId: "status_photo5",
      fallback: ["photo5_url", "photo5_img_fast", "photo5_img"]
    }
  };

  const state = {
    id: "",
    utoken: "",
    loaded: false,
    card: null,
    busy: false
  };

  const el = {
    form: document.getElementById("updateForm"),
    statusBox: document.getElementById("statusBox"),
    btnSubmit: document.getElementById("btnSubmit"),
    btnReload: document.getElementById("btnReload"),
    btnTop: document.getElementById("btnTop")
  };

  init();

  function init() {
    const qs = new URLSearchParams(location.search);
    state.id = text(qs.get("id")).toUpperCase();
    state.utoken = text(qs.get("utoken"));

    bindBaseEvents();
    bindImageEvents();

    if (!state.id || !state.utoken) {
      showStatus("bad", "缺少更新參數 id 或 utoken。\n請聯繫客服重新取得更新連結。");
      return;
    }

    loadCard();
  }

  function bindBaseEvents() {
    el.btnReload?.addEventListener("click", () => loadCard(true));

    el.btnTop?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    el.form?.addEventListener("submit", onSubmit);
  }

  function bindImageEvents() {
    document.addEventListener("click", async (ev) => {
      const pickBtn = ev.target.closest("[data-pick]");
      if (pickBtn) {
        const slot = pickBtn.getAttribute("data-pick");
        const fileInput = document.getElementById(`file_${slot}`);
        fileInput?.click();
        return;
      }

      const editBtn = ev.target.closest("[data-edit]");
      if (editBtn) {
        const slot = editBtn.getAttribute("data-edit");
        const fileInput = document.getElementById(`file_${slot}`);
        fileInput?.click();
        return;
      }

      const clearBtn = ev.target.closest("[data-clear]");
      if (clearBtn) {
        const slot = clearBtn.getAttribute("data-clear");
        clearSlot(slot);
      }
    });

    Object.keys(IMAGE_SLOTS).forEach((slot) => {
      const input = document.getElementById(`file_${slot}`);
      if (!input) return;

      input.addEventListener("change", async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;

        try {
          const dataUrl = await fileToDataURL(file);
          setSlotPreview(slot, dataUrl);
          setSlotInputValue(slot, dataUrl);
          setSlotStatus(slot, "已選擇新圖片");
        } catch (err) {
          console.error(`[HSC update-form] read file failed: ${slot}`, err);
          showStatus("bad", "圖片讀取失敗，請重新選擇。");
        }
      });
    });
  }

  async function loadCard(isReload = false) {
    if (state.busy) return;

    setBusy(true);
    showStatus("warn", isReload ? "重新載入資料中…" : "載入資料中…");

    try {
      const url = new URL(GAS_URL);
      url.searchParams.set("action", "getCardForUpdate");
      url.searchParams.set("id", state.id);
      url.searchParams.set("utoken", state.utoken);
      url.searchParams.set("_t", Date.now().toString());
      url.searchParams.set("_v", VERSION);

      const res = await fetchJson(url.toString());
      console.log("[HSC update-form] getCardForUpdate response:", res);

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "資料載入失敗");
      }

      const card = res.data || {};
      state.card = card;
      state.loaded = true;

      fillForm(card);
      el.form?.classList.remove("hidden");

      showStatus("ok", `資料載入成功\n名片編號：${state.id}`);
    } catch (err) {
      console.error("[HSC update-form] load failed:", err);
      state.loaded = false;
      el.form?.classList.add("hidden");
      showStatus(
        "bad",
        [
          "資料沒有正常載入。",
          err?.message || "未知錯誤",
          "",
          "請檢查：",
          "1. update-form.js 是否已更新到 v803",
          "2. GAS 是否為 v723.3 最新部署",
          "3. 連結中的 id / utoken 是否正確"
        ].join("\n")
      );
    } finally {
      setBusy(false);
    }
  }

  function fillForm(card) {
    TEXT_FIELDS.forEach((key) => {
      const input = document.getElementById(key);
      if (!input) return;
      input.value = text(card[key]);
    });

    Object.keys(IMAGE_SLOTS).forEach((slot) => {
      const cfg = IMAGE_SLOTS[slot];
      const url = pickFirstImage(card, cfg.fallback);

      const hiddenInput = document.getElementById(cfg.inputId);
      if (hiddenInput) hiddenInput.value = url;

      setSlotPreview(slot, url);
      setSlotStatus(slot, url ? "已載入" : "未設定");
    });
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    if (!state.loaded) {
      showStatus("bad", "資料尚未載入完成，暫時不能送出。");
      return;
    }

    if (state.busy) return;
    setBusy(true);
    showStatus("warn", "送出更新中…");

    try {
      const payload = collectPayload();

      const res = await fetchJson(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      console.log("[HSC update-form] updateCardByToken response:", res);

      if (!res || res.ok !== true) {
        throw new Error(readError(res) || "更新失敗");
      }

      showStatus("ok", "資料更新成功。");
    } catch (err) {
      console.error("[HSC update-form] submit failed:", err);
      showStatus("bad", `資料更新失敗：${err?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  function collectPayload() {
    const out = {
      action: "updateCardByToken",
      id: state.id,
      utoken: state.utoken
    };

    TEXT_FIELDS.forEach((key) => {
      out[key] = getFieldValue(key);
    });

    IMAGE_FIELDS.forEach((key) => {
      out[key] = getFieldValue(key);
    });

    return out;
  }

  function getFieldValue(id) {
    const input = document.getElementById(id);
    return input ? text(input.value) : "";
  }

  function setBusy(busy) {
    state.busy = !!busy;
    if (el.btnSubmit) el.btnSubmit.disabled = !!busy;
    if (el.btnReload) el.btnReload.disabled = !!busy;
  }

  function showStatus(type, message) {
    if (!el.statusBox) return;
    el.statusBox.className = `status show ${type || "warn"}`;
    el.statusBox.textContent = message || "";
  }

  function readError(res) {
    if (!res || typeof res !== "object") return "";
    return text(res.error || res.message || res.msg);
  }

  function pickFirstImage(card, keys) {
    for (const k of keys) {
      const v = text(card[k]);
      if (v) return v;
    }
    return "";
  }

  function setSlotInputValue(slot, value) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) return;
    const input = document.getElementById(cfg.inputId);
    if (input) input.value = value || "";
  }

  function setSlotPreview(slot, url) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) return;
    const box = document.getElementById(cfg.previewId);
    if (!box) return;

    if (url) {
      box.style.backgroundImage = `url("${escapeCssUrl(url)}")`;
    } else {
      box.style.backgroundImage = "none";
    }
  }

  function setSlotStatus(slot, msg) {
    const cfg = IMAGE_SLOTS[slot];
    if (!cfg) return;
    const node = document.getElementById(cfg.statusId);
    if (node) node.textContent = msg || "未設定";
  }

  function clearSlot(slot) {
    const fileInput = document.getElementById(`file_${slot}`);
    if (fileInput) fileInput.value = "";

    setSlotInputValue(slot, "");
    setSlotPreview(slot, "");
    setSlotStatus(slot, "已清除");
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body,
      cache: "no-store",
      redirect: "follow"
    });

    const raw = await res.text();

    try {
      return JSON.parse(raw);
    } catch (_err) {
      const cleaned = extractJson(raw);
      if (cleaned) return JSON.parse(cleaned);
      throw new Error(`GAS 回傳非有效 JSON：${raw.slice(0, 200)}`);
    }
  }

  function extractJson(raw) {
    if (!raw) return "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return raw.slice(start, end + 1);
    }
    return "";
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeCssUrl(v) {
    return String(v || "").replace(/"/g, '\\"');
  }

  function text(v) {
    return v == null ? "" : String(v).trim();
  }
})();