/* ================================
 * form.js — v496.1 (COMPLETE OVERWRITE)
 * Goal: Form -> GAS (POST ?action=create) -> card_db
 * - Keys strictly English (align DB standard)
 * - Images: accept Drive share URL or File ID (no frontend compression)
 * - Default: status=inactive, billing_status=unpaid (can be adjusted in GAS)
 * - FIX v496.1: Avoid CORS preflight by using x-www-form-urlencoded (data=JSON)
 * - Success UI: id/token/clean_card_url/og_page_url + copy
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v496.1",
    // ✅ Your deployed GAS v496 WebApp /exec
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    BASE_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    DEFAULT_LINE_OA: "https://lin.ee/G3VJoRm",
    FETCH_TIMEOUT_MS: 15000,
    RETRY: 1
  };

  const $ = (sel) => document.querySelector(sel);

  const elForm = $("#cardForm");
  const elStatus = $("#statusBox");
  const elResult = $("#resultKVs");
  const elBtnSubmit = $("#btnSubmit");
  const elBtnReset = $("#btnReset");
  const elBtnPing = $("#btnTestPing");
  const elBtnDemo = $("#btnFillDemo");

  // result fields
  const r_id = $("#r_id");
  const r_token = $("#r_token");
  const r_card = $("#r_card");
  const r_og = $("#r_og");

  function setStatus(msg, type = "info") {
    elStatus.classList.remove("ok", "err");
    if (type === "ok") elStatus.classList.add("ok");
    if (type === "err") elStatus.classList.add("err");
    elStatus.textContent = msg;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function withTimeout(promise, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return {
      signal: ctrl.signal,
      promise: Promise.race([
        promise,
        new Promise((_, rej) => {
          ctrl.signal.addEventListener("abort", () => rej(new Error("Fetch timeout")));
        })
      ]).finally(() => clearTimeout(t))
    };
  }

  function trimOrEmpty(v) {
    return (v ?? "").toString().trim();
  }

  function normalizeImageInput(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";

    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    if (/^https?:\/\//i.test(s)) return s;

    if (/^[a-zA-Z0-9_-]{15,}$/.test(s)) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(s)}`;
    }
    return s;
  }

  function normalizeLineUrl(raw) {
    const s = trimOrEmpty(raw);
    if (!s) return "";
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
    if (/^https:\/\//i.test(s)) return s;
    return s;
  }

  function buildPayload() {
    const payload = {
      // System / billing
      id: "",
      token: "",
      status: "inactive",
      tenant: trimOrEmpty($("#tenant").value),
      billing_status: "unpaid",
      created_at: "",
      updated_at: "",
      activated_at: "",
      inactivated_at: "",
      expired_at: "",
      expires_at: "",
      remind_at: "",
      reminded_at: "",
      form_ts: new Date().toISOString(),

      // Plan/theme
      plan: trimOrEmpty($("#plan").value) || "free",
      color: trimOrEmpty($("#color").value) || "",
      style: trimOrEmpty($("#style").value) || "",
      paper: trimOrEmpty($("#paper").value) || "",
      premium_color: trimOrEmpty($("#premium_color").value) || "",

      // Content
      name: trimOrEmpty($("#name").value),
      unit: trimOrEmpty($("#unit").value),
      title: trimOrEmpty($("#title").value),
      slogan: trimOrEmpty($("#slogan").value),
      services: trimOrEmpty($("#services").value),
      experience: trimOrEmpty($("#experience").value),

      // Images
      avatar_img: normalizeImageInput($("#avatar_img").value),
      logo_img: normalizeImageInput($("#logo_img").value),
      photo1_img: normalizeImageInput($("#photo1_img").value),
      photo2_img: normalizeImageInput($("#photo2_img").value),
      photo3_img: normalizeImageInput($("#photo3_img").value),
      photo4_img: normalizeImageInput($("#photo4_img").value),
      photo5_img: normalizeImageInput($("#photo5_img").value),

      // Contacts
      wechat_id: trimOrEmpty($("#wechat_id").value),
      line_url: normalizeLineUrl($("#line_url").value),
      line_oa: trimOrEmpty($("#line_oa").value) || CONFIG.DEFAULT_LINE_OA,
      email: trimOrEmpty($("#email").value),
      phone: trimOrEmpty($("#phone").value),
      address: trimOrEmpty($("#address").value),

      // Media/social
      video1: trimOrEmpty($("#video1").value),
      video2: trimOrEmpty($("#video2").value),
      video3: trimOrEmpty($("#video3").value),
      social1: trimOrEmpty($("#social1").value),
      social2: trimOrEmpty($("#social2").value),
      social3: trimOrEmpty($("#social3").value)
    };

    if (!payload.name) throw new Error("name（姓名）必填");
    return payload;
  }

  function deriveUrls(id, token) {
    const base = CONFIG.BASE_URL.replace(/\/+$/, "/");
    const clean_card_url = `${base}?id=${encodeURIComponent(id)}`;
    const og_page_url = `${base}share.html?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token || "")}`;
    return { clean_card_url, og_page_url };
  }

  async function postCreate(payload) {
    const gas = trimOrEmpty(CONFIG.GAS);
    if (!gas) throw new Error("請先在 form.js 設定 CONFIG.GAS 為你的 GAS WebApp /exec");

    const url = `${gas}${gas.includes("?") ? "&" : "?"}action=create`;

    // ✅ FIX v496.1: use form-urlencoded to avoid CORS preflight
    // GAS side should read: JSON.parse(e.parameter.data)
    const body = new URLSearchParams();
    body.append("data", JSON.stringify(payload));

    for (let attempt = 0; attempt <= CONFIG.RETRY; attempt++) {
      try {
        const req = withTimeout(fetch(url, {
          method: "POST",
          body
        }), CONFIG.FETCH_TIMEOUT_MS);

        const res = await req.promise;
        const text = await res.text();

        let data;
        try { data = JSON.parse(text); }
        catch {
          throw new Error(`回應不是 JSON：${text.slice(0, 220)}`);
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${data?.message || "Request failed"}`);
        }
        if (!data || data.ok !== true) {
          throw new Error(data?.message || "create 失敗（ok!=true）");
        }
        return data;
      } catch (err) {
        if (attempt < CONFIG.RETRY) {
          await sleep(350);
          continue;
        }
        throw err;
      }
    }
    throw new Error("create 失敗（unknown）");
  }

  function showResult({ id, token, clean_card_url, og_page_url }) {
    r_id.textContent = id || "-";
    r_token.textContent = token || "-";
    r_card.textContent = clean_card_url || "-";
    r_og.textContent = og_page_url || "-";
    elResult.style.display = "";
  }

  async function copyText(text) {
    const s = trimOrEmpty(text);
    if (!s) return false;

    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  }

  function wireCopyPills() {
    document.addEventListener("click", async (e) => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      const sel = pill.getAttribute("data-copy");
      if (!sel) return;
      const el = $(sel);
      if (!el) return;
      const ok = await copyText(el.textContent || "");
      setStatus(ok ? "✅ 已複製到剪貼簿" : "⚠️ 複製失敗（請手動複製）", ok ? "ok" : "err");
    });
  }

  function fillDefaultLineOA() {
    const el = $("#line_oa");
    if (el && !trimOrEmpty(el.value)) el.value = CONFIG.DEFAULT_LINE_OA;
  }

  function fillDemo() {
    $("#tenant").value = "T001";
    $("#plan").value = "free";
    $("#color").value = "c1";
    $("#style").value = "s3";
    $("#paper").value = "f1";
    $("#premium_color").value = "p6";
    $("#name").value = "王小明";
    $("#unit").value = "幸福緣";
    $("#title").value = "創辦人";
    $("#slogan").value = "心裡有愛，家永遠在";
    $("#services").value = "幸福教養, 健康手作, 顧問";
    $("#experience").value = "把幸福感做成可被分享的日常。\n用一張名片，把信賴與接納帶回家。";
    $("#wechat_id").value = "wechat123";
    $("#line_url").value = "@mylineid";
    $("#email").value = "hello@example.com";
    $("#phone").value = "0912-345-678";
    $("#address").value = "高雄市";
    $("#video1").value = "https://www.youtube.com/";
    $("#social1").value = "https://www.instagram.com/";
    fillDefaultLineOA();
    setStatus("已填入示範資料（你可直接送出測 create）。");
  }

  async function ping() {
    const gas = trimOrEmpty(CONFIG.GAS);
    if (!gas) {
      setStatus("請先在 form.js 設定 CONFIG.GAS。", "err");
      return;
    }
    const url = `${gas}${gas.includes("?") ? "&" : "?"}action=ping`;
    try {
      setStatus("測試 ping 中...");
      const req = withTimeout(fetch(url, { method: "GET" }), 12000);
      const res = await req.promise;
      const t = await res.text();
      setStatus(`ping 回應：\n${t.slice(0, 500)}`, "ok");
    } catch (e) {
      setStatus(`ping 失敗：${e.message}`, "err");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      elBtnSubmit.disabled = true;
      elBtnSubmit.textContent = "送出中...";

      fillDefaultLineOA();
      const payload = buildPayload();

      setStatus(
        "送出 create 中...\n" +
        "（v496.1：改用 form-urlencoded 避免 CORS 預檢）"
      );

      const data = await postCreate(payload);

      const item = data.item || {};
      const id = item.id || data.id || "";
      const token = item.token || data.token || "";

      const derived = deriveUrls(id, token);
      const clean_card_url = data.clean_card_url || item.clean_card_url || derived.clean_card_url;
      const og_page_url = data.og_page_url || item.og_page_url || derived.og_page_url;

      showResult({ id, token, clean_card_url, og_page_url });

      setStatus(
        "✅ 建立成功（create）\n" +
        `id: ${id}\n` +
        `token: ${token}\n` +
        `clean_card_url: ${clean_card_url}\n` +
        `og_page_url: ${og_page_url}`,
        "ok"
      );
    } catch (err) {
      setStatus(`❌ 建立失敗：${err.message}`, "err");
    } finally {
      elBtnSubmit.disabled = false;
      elBtnSubmit.textContent = "送出建立（create）";
    }
  }

  function handleReset() {
    elForm.reset();
    fillDefaultLineOA();
    elResult.style.display = "none";
    setStatus("已清空。");
  }

  function init() {
    fillDefaultLineOA();
    wireCopyPills();

    elForm.addEventListener("submit", handleSubmit);
    elBtnReset.addEventListener("click", handleReset);
    elBtnPing.addEventListener("click", ping);
    elBtnDemo.addEventListener("click", fillDemo);

    setStatus(
      "準備就緒。\n" +
      `版本：${CONFIG.VERSION}\n` +
      "下一步：按「一鍵填示範」→「送出建立」測 create。"
    );
  }

  document.addEventListener("DOMContentLoaded", init);
})();