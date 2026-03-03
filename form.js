/* ======================================================
 * Happiness Smart Card System — form.js
 * v502 (COMPLETE OVERWRITE)
 *
 * Flow:
 * 1) reserve  -> { cardId, token }
 * 2) compress -> avatar 512 / cover 1200
 * 3) upload   -> Firebase Storage -> downloadURL
 * 4) create   -> GAS (text + downloadURL only)
 *
 * Requires (root):
 * - firebase.js exports: uploadAvatar, uploadCover
 * - image-compressor.js exports: compressToJpeg
 * ====================================================== */

import { uploadAvatar, uploadCover } from "./firebase.js";
import { compressToJpeg } from "./image-compressor.js";

const VERSION = "v502";
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";

// 你如果沒有 card.html，先改成 index.html?id=
const PREVIEW_PAGE = "./card.html?id=";

const $ = (id) => document.getElementById(id);

function qs(key) {
  return new URL(location.href).searchParams.get(key) || "";
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = String(text ?? "");
}

function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function log(msg) {
  const el = $("log");
  if (!el) return;
  el.textContent = `• ${msg}\n` + (el.textContent || "");
}

function setStatus(ok, text) {
  const el = $("status");
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "rgba(53,208,127,.95)" : "rgba(255,94,94,.95)";
}

async function postJSON(url, payload) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const txt = await r.text();
  let json;
  try {
    json = JSON.parse(txt);
  } catch (e) {
    throw new Error("GAS response not JSON: " + txt.slice(0, 200));
  }

  if (!r.ok) throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
  if (!json.ok) throw new Error(json.error || "GAS returned ok:false");
  return json;
}

function readFileInput(id) {
  const el = $(id);
  const f = el && el.files && el.files[0];
  return f || null;
}

function readFormText() {
  return {
    name: ($("name")?.value || "").trim(),
    unit: ($("unit")?.value || "").trim(),
    title: ($("title")?.value || "").trim(),
    phone: ($("phone")?.value || "").trim(),
    email: ($("email")?.value || "").trim(),
    line_url: ($("line_url")?.value || "").trim(),
    website: ($("website")?.value || "").trim(),
    wechat_id: ($("wechat_id")?.value || "").trim(),
    plan: ($("plan")?.value || "").trim(),
    theme: ($("theme")?.value || "").trim(),
  };
}

async function doReserve() {
  const exp = qs("exp");
  const sig = qs("sig");

  setStatus(true, "Reserve…");
  log("reserve: sending request");

  const payload = { action: "reserve" };
  if (exp && sig) {
    payload.exp = exp;
    payload.sig = sig;
  }

  const json = await postJSON(GAS_URL, payload);
  const item = json.item || {};

  const cardId = item.cardId || item.id || "";
  const token = item.token || "";

  if (!cardId || !token) throw new Error("reserve missing cardId/token");

  setText("cardId", cardId);
  log(`reserve OK: cardId=${cardId}`);

  return { cardId, token, exp, sig };
}

async function doUploadImages(cardId) {
  const avatarFile = readFileInput("avatar");
  const coverFile = readFileInput("cover");

  let avatarURL = "";
  let coverURL = "";

  if (avatarFile) {
    setStatus(true, "Compress avatar (512)…");
    log("compress avatar 512px");
    const avatarBlob = await compressToJpeg(avatarFile, 512);

    setStatus(true, "Upload avatar…");
    log(`upload avatar: ${Math.round(avatarBlob.size / 1024)} KB`);
    avatarURL = await uploadAvatar(cardId, avatarBlob);

    setText("avatarURL", avatarURL);
    log("avatar upload OK");
  }

  if (coverFile) {
    setStatus(true, "Compress cover (1200)…");
    log("compress cover 1200px");
    const coverBlob = await compressToJpeg(coverFile, 1200);

    setStatus(true, "Upload cover…");
    log(`upload cover: ${Math.round(coverBlob.size / 1024)} KB`);
    coverURL = await uploadCover(cardId, coverBlob);

    setText("coverURL", coverURL);
    log("cover upload OK");
  }

  return { avatarURL, coverURL };
}

async function doCreate(reserve, textData, imageURLs) {
  const { cardId, token, exp, sig } = reserve;

  setStatus(true, "Create…");
  log("create: sending to GAS (text + downloadURL only)");

  const payload = {
    action: "create",
    cardId,
    token,
    data: {
      ...textData,
      avatar_img: imageURLs.avatarURL || "",
      // cover 暫時寫到 photo1_img（最通用，不改表頭）
      photo1_img: imageURLs.coverURL || "",
    },
  };

  if (exp && sig) {
    payload.exp = exp;
    payload.sig = sig;
  }

  const json = await postJSON(GAS_URL, payload);
  log("create OK");
  return json;
}

async function mainSubmit() {
  try {
    const btn = $("btnSubmit");
    if (btn) btn.disabled = true;

    setStatus(true, `Submitting (${VERSION})…`);
    log(`start submit ${VERSION}`);

    const reserve = await doReserve();
    const textData = readFormText();
    const imageURLs = await doUploadImages(reserve.cardId);

    await doCreate(reserve, textData, imageURLs);

    const preview = `${PREVIEW_PAGE}${encodeURIComponent(reserve.cardId)}`;
    setHTML(
      "result",
      `✅ 已建立<br/><a href="${preview}" target="_blank" rel="noopener">打開成品預覽</a>`
    );
    setStatus(true, "Done ✅");
  } catch (err) {
    console.error(err);
    setStatus(false, "Failed");
    setHTML("result", `❌ ${String(err?.message || err)}`);
    log("ERROR: " + String(err?.message || err));
  } finally {
    const btn = $("btnSubmit");
    if (btn) btn.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setText("ver", VERSION);

  const btn = $("btnSubmit");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      mainSubmit();
    });
  } else {
    log("WARN: 找不到 #btnSubmit（請確認 form.html 送出按鈕 id）");
  }
});