
/* =========================================
 * HSC update-form.js v721.0
 * COMPLETE OVERWRITE
 * Works with:
 * - adminCreateUpdateLink24h
 * - getCardForUpdate
 * - updateCardByToken
 * ========================================= */

const GAS_URL = "https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec";

const UPDATE_FIELDS = [
  "name","unit","title","slogan","services","experience",
  "wechat_id","line_url","line_oa","email","phone","address","website",
  "video1","video2","video3","social1","social2","social3",
  "cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3",
  "avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url",
  "color","style","paper","premium_color"
];

const state = {
  id: "",
  utoken: "",
  loaded: false,
  loading: false,
  submitting: false
};

const $ = (sel) => document.querySelector(sel);

function getParam(name){
  const url = new URL(window.location.href);
  return (url.searchParams.get(name) || "").trim();
}

function setStatus(type, text){
  const box = $("#statusBox");
  box.className = `status show ${type || ""}`;
  box.textContent = text || "";
}

function clearStatus(){
  const box = $("#statusBox");
  box.className = "status";
  box.textContent = "";
}

function lockForm(locked){
  const form = $("#updateForm");
  const fields = form.querySelectorAll("input, textarea, button");
  fields.forEach(el => {
    if(el.id === "btnTop") return;
    el.disabled = !!locked;
  });
}

function showForm(show){
  $("#updateForm").classList.toggle("hidden", !show);
}

function setPreview(elId, url){
  const el = document.getElementById(elId);
  if(!el) return;
  const safe = String(url || "").trim();
  el.style.backgroundImage = safe ? `url("${safe.replace(/"/g, '\\"')}")` : "none";
}

function bindImagePreview(){
  document.querySelectorAll(".js-img-url").forEach(input => {
    input.addEventListener("input", () => {
      const previewId = input.dataset.preview;
      setPreview(previewId, input.value);
    });
  });
}

function fillForm(item){
  UPDATE_FIELDS.forEach(key => {
    const el = document.getElementById(key);
    if(!el) return;
    el.value = item[key] == null ? "" : String(item[key]);
  });

  setPreview("preview_avatar", item.avatar_url);
  setPreview("preview_logo", item.logo_url);
  setPreview("preview_photo1", item.photo1_url);
  setPreview("preview_photo2", item.photo2_url);
  setPreview("preview_photo3", item.photo3_url);
  setPreview("preview_photo4", item.photo4_url);
  setPreview("preview_photo5", item.photo5_url);
}

function collectPayload(){
  const payload = {
    action: "updateCardByToken",
    id: state.id,
    utoken: state.utoken
  };

  UPDATE_FIELDS.forEach(key => {
    const el = document.getElementById(key);
    if(!el) return;
    payload[key] = (el.value || "").trim();
  });

  return payload;
}

async function apiGet(params){
  const url = new URL(GAS_URL);
  Object.keys(params).forEach(k => {
    if(params[k] == null) return;
    url.searchParams.set(k, params[k]);
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store"
  });

  return await res.json();
}

async function apiPost(payload){
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams(payload).toString()
  });

  return await res.json();
}

function buildErrMsg(res){
  if(!res) return "系統沒有回應，請稍後再試。";
  return String(res.error || res.message || "發生未知錯誤，請聯繫客服。");
}

async function loadCard(){
  if(!state.id || !state.utoken){
    showForm(false);
    setStatus("bad", "缺少更新驗證資訊，請聯繫客服重新取得更新連結。");
    return;
  }

  state.loading = true;
  lockForm(true);
  clearStatus();
  setStatus("warn", "正在載入資料…");

  try{
    const res = await apiGet({
      action: "getCardForUpdate",
      id: state.id,
      utoken: state.utoken,
      ts: Date.now()
    });

    if(!res || !res.ok){
      showForm(false);
      setStatus("bad", buildErrMsg(res).includes("expired")
        ? "此更新連結已過期，請聯繫客服重新取得更新連結。"
        : buildErrMsg(res)
      );
      return;
    }

    fillForm(res.item || {});
    state.loaded = true;
    showForm(true);
    setStatus("ok", "資料已載入，請確認後送出更新。");
  }catch(err){
    showForm(false);
    setStatus("bad", "載入失敗，請檢查網路或聯繫客服。");
  }finally{
    state.loading = false;
    lockForm(false);
  }
}

async function submitForm(ev){
  ev.preventDefault();
  if(state.submitting) return;

  state.submitting = true;
  lockForm(true);
  setStatus("warn", "資料更新中，請稍候…");

  try{
    const payload = collectPayload();
    const res = await apiPost(payload);

    if(!res || !res.ok){
      const msg = buildErrMsg(res);
      setStatus("bad", msg.includes("expired")
        ? "此更新連結已過期，請聯繫客服重新取得更新連結。"
        : msg
      );
      return;
    }

    setStatus("ok", "您的資料已更新完成。\n若後續仍需調整，請再聯繫客服重新取得更新連結。");
    showForm(false);
  }catch(err){
    setStatus("bad", "送出失敗，請稍後再試。");
  }finally{
    state.submitting = false;
    lockForm(false);
  }
}

function bindEvents(){
  $("#updateForm").addEventListener("submit", submitForm);

  $("#btnReload").addEventListener("click", async () => {
    await loadCard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#btnTop").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  bindImagePreview();
}

function init(){
  state.id = getParam("id");
  state.utoken = getParam("utoken");

  bindEvents();
  loadCard();
}

document.addEventListener("DOMContentLoaded", init);