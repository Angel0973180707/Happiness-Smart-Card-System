/* =========================================
 * HSC Update Form v7.7.3
 * COMPLETE OVERWRITE
 *
 * 對齊 GAS v6.7：
 * - API 最外層使用 ok / error / data
 * - getCardForUpdate => { ok:true, data:{...} }
 * - updateCardByToken => { ok:true, data:{...} }
 * ========================================= */

(() => {
  "use strict";

  const GAS_URL = "https://angel-namecard.letssyncus.com/gas-proxy/exec";
  const VERSION = "722.2";

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
    loaded: false
  };

  const statusBox = document.getElementById("statusBox");
  const form = document.getElementById("updateForm");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnReload = document.getElementById("btnReload");
  const btnTop = document.getElementById("btnTop");

  init();

  function init() {
    const qs = new URLSearchParams(location.search);
    state.id = text(qs.get("id"));
    state.utoken = text(qs.get("utoken"));

    btnReload?.addEventListener("click", loadCard);
    btnTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    form?.addEventListener("submit", submitUpdate);

    if (!state.id || !state.utoken) {
      showStatus("bad", "缺少 id 或 utoken，請聯繫客服重新取得更新連結。");
      return;
    }

    loadCard();
  }

  async function loadCard() {
    try {
      toggleBusy(true);
      showStatus("warn", "載入資料中…");

      const url = new URL(GAS_URL);
      url.searchParams.set("action", "getCardForUpdate");
      url.searchParams.set("id", state.id);
      url.searchParams.set("utoken", state.utoken);
      url.searchParams.set("_t", Date.now());
      url.searchParams.set("_v", VERSION);

      const res = await fetchJson(url.toString());
      console.log("[HSC update-form] getCardForUpdate:", res);

      if (!res || res.ok !== true) {
        throw new Error((res && (res.error || res.message)) || "更新資料載入失敗");
      }

      const card = res.data || {};
      fillForm(card);

      form.classList.remove("hidden");
      state.loaded = true;
      showStatus("ok", `資料載入成功\n名片編號：${state.id}`);
    } catch (err) {
      console.error(err);
      form.classList.add("hidden");
      showStatus("bad", `更新頁載入失敗：${err.message || err}`);
    } finally {
      toggleBusy(false);
    }
  }

  async function submitUpdate(e) {
    e.preventDefault();

    if (!state.loaded) {
      showStatus("bad", "資料尚未載入完成，暫時不能送出。");
      return;
    }

    try {
      toggleBusy(true);
      showStatus("warn", "送出更新中…");

      const payload = {
        action: "updateCardByToken",
        id: state.id,
        utoken: state.utoken
      };

      TEXT_FIELDS.forEach((k) => payload[k] = getValue(k));
      IMAGE_FIELDS.forEach((k) => payload[k] = getValue(k));

      const res = await fetchJson(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      console.log("[HSC update-form] updateCardByToken:", res);

      if (!res || res.ok !== true) {
        throw new Error((res && (res.error || res.message)) || "更新失敗");
      }

      showStatus("ok", "資料更新成功。");
    } catch (err) {
      console.error(err);
      showStatus("bad", `更新失敗：${err.message || err}`);
    } finally {
      toggleBusy(false);
    }
  }

  function fillForm(card) {
    TEXT_FIELDS.forEach((k) => {
      const el = document.getElementById(k);
      if (el) el.value = text(card[k]);
    });

    IMAGE_FIELDS.forEach((k) => {
      const el = document.getElementById(k);
      const url = pickImage(card, k);

      if (el) el.value = url;

      const slot = PREVIEW_MAP[k];
      if (slot) {
        setPreview(slot, url);
        setImageStatus(slot, url ? "已載入" : "未設定");
      }
    });
  }

  function pickImage(card, key) {
    const v = text(card[key]);
    if (v) return v;

    const fallback = {
      avatar_url: ["avatar_img_fast", "avatar_img"],
      logo_url: ["logo_img_fast", "logo_img"],
      photo1_url: ["photo1_img_fast", "photo1_img"],
      photo2_url: ["photo2_img_fast", "photo2_img"],
      photo3_url: ["photo3_img_fast", "photo3_img"],
      photo4_url: ["photo4_img_fast", "photo4_img"],
      photo5_url: ["photo5_img_fast", "photo5_img"]
    }[key] || [];

    for (const f of fallback) {
      const fv = text(card[f]);
      if (fv) return fv;
    }

    return "";
  }

  function setPreview(slot, url) {
    const el = document.getElementById(`preview_${slot}`);
    if (!el) return;
    el.style.backgroundImage = url ? `url("${escapeCssUrl(url)}")` : "none";
  }

  function setImageStatus(slot, msg) {
    const el = document.getElementById(`status_${slot}`);
    if (el) el.textContent = msg || "未設定";
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? text(el.value) : "";
  }

  function showStatus(type, msg) {
    if (!statusBox) return;
    statusBox.className = `status show ${type}`;
    statusBox.textContent = msg || "";
  }

  function toggleBusy(busy) {
    if (btnSubmit) btnSubmit.disabled = !!busy;
    if (btnReload) btnReload.disabled = !!busy;
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body,
      cache: "no-store"
    });

    const raw = await res.text();

    try {
      return JSON.parse(raw);
    } catch (_err) {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        return JSON.parse(raw.slice(start, end + 1));
      }
      throw new Error("GAS 回傳不是有效 JSON");
    }
  }

  function text(v) {
    return v == null ? "" : String(v).trim();
  }

  function escapeCssUrl(v) {
    return String(v).replace(/"/g, '\\"');
  }
})();