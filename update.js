/* =========================================
 * HSC Update Form v722.1
 * COMPLETE OVERWRITE
 *
 * 目標：
 * 1. 穩定載入更新資料
 * 2. 相容多種 GAS 回傳格式
 * 3. 顯示既有圖片
 * 4. 支援文字更新提交
 * 5. 圖片先做本地預覽與欄位回寫
 * ========================================= */

(() => {
  "use strict";

  const GAS_URL = "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const VERSION = "722.1";

  const TEXT_FIELDS = [
    "name","unit","title","slogan","services","experience",
    "phone","email","line_url","line_oa","wechat_id","website","address",
    "video1","video2","video3","social1","social2","social3",
    "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3"
  ];

  const IMAGE_FIELDS = [
    "avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url"
  ];

  const PREVIEW_MAP = {
    avatar_url: "avatar",
    logo_url: "logo",
    photo1_url: "photo1",
    photo2_url: "photo2",
    photo3_url: "photo3",
    photo4_url: "photo4",
    photo5_url: "photo5"
  };

  const state = {
    id: "",
    utoken: "",
    loading: false,
    loaded: false,
    card: null
  };

  const els = {
    form: document.getElementById("updateForm"),
    status: document.getElementById("statusBox"),
    btnReload: document.getElementById("btnReload"),
    btnSubmit: document.getElementById("btnSubmit"),
    btnTop: document.getElementById("btnTop")
  };

  boot();

  function boot() {
    const qs = new URLSearchParams(location.search);
    state.id = text(qs.get("id"));
    state.utoken = text(qs.get("utoken"));

    bindBaseEvents();
    bindImageEvents();

    if (!state.id || !state.utoken) {
      showStatus("bad", "缺少必要參數：id 或 utoken。\n請聯繫客服重新取得更新連結。");
      return;
    }

    loadCard();
  }

  function bindBaseEvents() {
    els.btnReload?.addEventListener("click", () => loadCard(true));

    els.btnTop?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    els.form?.addEventListener("submit", onSubmit);
  }

  function bindImageEvents() {
    document.addEventListener("click", (e) => {
      const pick = e.target.closest("[data-pick]");
      if (pick) {
        const slot = pick.getAttribute("data-pick");
        const input = document.getElementById(`file_${slot}`);
        input?.click();
        return;
      }

      const clear = e.target.closest("[data-clear]");
      if (clear) {
        const slot = clear.getAttribute("data-clear");
        clearImage(slot);
      }
    });

    Object.values(PREVIEW_MAP).forEach((slot) => {
      const input = document.getElementById(`file_${slot}`);
      if (!input) return;

      input.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const dataUrl = await fileToDataURL(file);
          setPreview(slot, dataUrl);
          setImageValue(slot, dataUrl);
          setSlotStatus(slot, "已選擇新圖片（尚未上傳）");
        } catch (err) {
          console.error(err);
          showStatus("bad", "圖片讀取失敗，請重新選擇。");
        }
      });
    });
  }

  async function loadCard(isReload = false) {
    if (state.loading) return;
    state.loading = true;
    toggleSubmit(true);

    showStatus("warn", isReload ? "重新載入資料中…" : "載入名片資料中…");

    try {
      const res = await fetchJson(buildGetUrl());
      console.log("[HSC update-form] getCardForUpdate response:", res);

      if (!isSuccessResponse(res)) {
        throw new Error(readErrorMessage(res) || "資料載入失敗");
      }

      const card = readCardPayload(res);
      if (!card || typeof card !== "object" || Array.isArray(card)) {
        throw new Error("更新資料格式錯誤：GAS 未回傳有效的 card data");
      }

      state.card = card;
      state.loaded = true;

      fillForm(card);
      els.form.classList.remove("hidden");

      showStatus("ok", `資料已載入，可開始更新。\n名片編號：${state.id}`);
    } catch (err) {
      console.error("[HSC update-form] load failed:", err);
      els.form.classList.add("hidden");
      showStatus("bad", [
        "更新頁資料載入失敗。",
        err?.message || "未知錯誤",
        "",
        "請優先檢查：",
        "1. GAS getCardForUpdate 是否回傳 { success:true, data:{...} }",
        "2. validateUpdateAccess_ 是否驗證成功",
        "3. update token 是否已過期"
      ].join("\n"));
    } finally {
      state.loading = false;
      toggleSubmit(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!state.loaded) {
      showStatus("bad", "資料尚未載入完成，無法送出。");
      return;
    }

    toggleSubmit(true);
    showStatus("warn", "送出更新中…");

    try {
      const payload = collectPayload();

      const res = await fetchJson(buildPostUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      console.log("[HSC update-form] update response:", res);

      if (!isSuccessResponse(res)) {
        throw new Error(readErrorMessage(res) || "更新失敗");
      }

      showStatus("ok", "資料更新成功。");
    } catch (err) {
      console.error("[HSC update-form] submit failed:", err);
      showStatus("bad", `資料更新失敗：${err?.message || "未知錯誤"}`);
    } finally {
      toggleSubmit(false);
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

  function fillForm(card) {
    TEXT_FIELDS.forEach((key) => {
      const el = document.getElementById(key);
      if (!el) return;
      el.value = text(card[key]);
    });

    IMAGE_FIELDS.forEach((key) => {
      const value = pickImageValue(card, key);
      const el = document.getElementById(key);
      if (el) el.value = text(value);

      const slot = PREVIEW_MAP[key];
      if (slot) {
        if (value) {
          setPreview(slot, value);
          setSlotStatus(slot, "已載入");
        } else {
          setPreview(slot, "");
          setSlotStatus(slot, "未設定");
        }
      }
    });
  }

  function pickImageValue(card, preferredKey) {
    const direct = text(card[preferredKey]);
    if (direct) return direct;

    const legacyMap = {
      avatar_url: ["avatar_img_fast","avatar_img"],
      logo_url: ["logo_img_fast","logo_img"],
      photo1_url: ["photo1_img_fast","photo1_img"],
      photo2_url: ["photo2_img_fast","photo2_img"],
      photo3_url: ["photo3_img_fast","photo3_img"],
      photo4_url: ["photo4_img_fast","photo4_img"],
      photo5_url: ["photo5_img_fast","photo5_img"]
    };

    const fallbacks = legacyMap[preferredKey] || [];
    for (const k of fallbacks) {
      const v = text(card[k]);
      if (v) return v;
    }
    return "";
  }

  function getFieldValue(id) {
    const el = document.getElementById(id);
    return el ? text(el.value) : "";
  }

  function setImageValue(slot, value) {
    const key = `${slot}_url`;
    const el = document.getElementById(key);
    if (el) el.value = value || "";
  }

  function clearImage(slot) {
    setPreview(slot, "");
    setImageValue(slot, "");
    setSlotStatus(slot, "已清除");
    const input = document.getElementById(`file_${slot}`);
    if (input) input.value = "";
  }

  function setPreview(slot, url) {
    const box = document.getElementById(`preview_${slot}`);
    if (!box) return;

    if (url) {
      box.style.backgroundImage = `url("${escapeCssUrl(url)}")`;
      box.dataset.hasImage = "1";
    } else {
      box.style.backgroundImage = "none";
      box.dataset.hasImage = "0";
    }
  }

  function setSlotStatus(slot, msg) {
    const el = document.getElementById(`status_${slot}`);
    if (el) el.textContent = msg || "未設定";
  }

  function toggleSubmit(disabled) {
    if (els.btnSubmit) els.btnSubmit.disabled = !!disabled;
    if (els.btnReload) els.btnReload.disabled = !!disabled;
  }

  function showStatus(type, message) {
    if (!els.status) return;
    els.status.className = `status show ${type || "warn"}`;
    els.status.textContent = message || "";
  }

  function buildGetUrl() {
    const url = new URL(GAS_URL);
    url.searchParams.set("action", "getCardForUpdate");
    url.searchParams.set("id", state.id);
    url.searchParams.set("utoken", state.utoken);
    url.searchParams.set("_t", String(Date.now()));
    url.searchParams.set("_v", VERSION);
    return url.toString();
  }

  function buildPostUrl() {
    const url = new URL(GAS_URL);
    url.searchParams.set("_t", String(Date.now()));
    url.searchParams.set("_v", VERSION);
    return url.toString();
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body || undefined,
      cache: "no-store",
      redirect: "follow"
    });

    const raw = await res.text();
    let parsed = null;

    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      const cleaned = extractJsonObject(raw);
      if (cleaned) {
        parsed = JSON.parse(cleaned);
      } else {
        throw new Error(`GAS 回傳非 JSON：${raw.slice(0, 240)}`);
      }
    }

    return parsed;
  }

  function isSuccessResponse(res) {
    return !!(
      res &&
      (
        res.success === true ||
        res.ok === true
      )
    );
  }

  function readErrorMessage(res) {
    if (!res || typeof res !== "object") return "";
    return text(res.message || res.error || res.msg);
  }

  function readCardPayload(res) {
    if (!res || typeof res !== "object") return null;
    return res.data || res.card || res.row || res.item || null;
  }

  function extractJsonObject(raw) {
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

  function escapeCssUrl(url) {
    return String(url).replace(/"/g, '\\"');
  }

  function text(v) {
    return v == null ? "" : String(v).trim();
  }
})();