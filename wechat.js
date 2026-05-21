/* ================================
 * wechat.js — v497 (COMPLETE OVERWRITE)
 * - Fetch GAS: action=card (unified)
 * - Accept payload: {ok:true, data:{...}} OR {ok:true, item:{...}}
 * - Robust image URL normalize (Drive/Dropbox/http->https)
 * - Plan split: free max 2 photos; premium max 5 photos
 * - QR -> clean card url (index.html?id=TWxxxx&view=1)
 * - html2canvas -> PNG (best effort; cross-origin images may taint canvas)
 * ================================ */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "v497",
    DEFAULT_ID: "TW0001",
    GAS: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    FETCH_TIMEOUT_MS: 12000,
    RETRY: 2
  };

  const $ = (sel) => document.querySelector(sel);

  function toast(msg, ms=1400){
    const el = $("#toast");
    if (!el) return;
    el.textContent = String(msg || "—");
    el.classList.add("show");
    clearTimeout(el.__t);
    el.__t = setTimeout(() => el.classList.remove("show"), ms);
  }

  function getId() {
    const u = new URL(location.href);
    const q = (u.searchParams.get("id") || "").trim();
    if (q) return normalizeId(q);
    const h = (location.hash || "").replace("#", "").trim();
    return normalizeId(h) || CONFIG.DEFAULT_ID;
  }

  function normalizeId(raw) {
    const s = String(raw || "").trim().toUpperCase();
    if (!s) return "";
    if (/^TW\d{4}$/.test(s)) return s;
    if (/^\d{1,4}$/.test(s)) return "TW" + s.padStart(4, "0");
    if (/^TW\d{1,4}$/.test(s)) {
      const n = s.replace(/^TW/i, "");
      return "TW" + n.padStart(4, "0");
    }
    return s;
  }

  function base_() {
    // GitHub Pages subpath safe
    // e.g. https://xxx.github.io/Happiness-Smart-Card-System/wechat.html -> .../Happiness-Smart-Card-System/
    return location.origin + location.pathname.replace(/\/[^/]*$/, "/");
  }

  function buildCleanUrl(id) {
    return base_() + "index.html?id=" + encodeURIComponent(id) + "&view=1";
  }

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      const v = obj && obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return fallback;
  }

  /* ---------- fetch helper ---------- */
  async function fetchJson(url){
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);
    try{
      const res = await fetch(url, { cache:"no-store", signal: ctrl.signal });
      const txt = await res.text();
      let j = null;
      try{ j = JSON.parse(txt); }catch(_){}
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (!j || typeof j !== "object") throw new Error("Invalid JSON");
      return j;
    }finally{
      clearTimeout(t);
    }
  }

  async function fetchCard(id){
    const url = CONFIG.GAS + "?action=card&id=" + encodeURIComponent(id) + "&ts=" + Date.now();
    let lastErr = null;
    for (let i=0; i<=CONFIG.RETRY; i++){
      try{
        const j = await fetchJson(url);
        if (!j.ok) throw new Error(j.error || "API ok=false");
        const card = j.item || j.data || {};
        if (!card || typeof card !== "object") throw new Error("Empty payload");
        return card;
      }catch(e){
        lastErr = e;
      }
    }
    throw lastErr || new Error("Fetch failed");
  }

  /* ---------- image URL normalize ---------- */
  function toHttps_(u) {
    if (!u) return "";
    let s = String(u).trim();
    if (!s) return "";
    if (s.startsWith("//")) s = "https:" + s;
    s = s.replace(/^http:\/\//i, "https://");
    return s;
  }

  function driveIdFromUrl_(u) {
    const s = String(u || "");
    let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    m = s.match(/\/uc\?[^#]*[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    return "";
  }

  /* EMPRYON_FB_PROXY 2026-05-18 firebase->/img/ 代理（中國 GFW 解）*/
  function __fbProxy(s){
    if(!s||typeof s!=="string")return s;
    var m=s.match(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^\/]+\/o\/([^?]+)/i);
    if(!m)return s;
    try{return "/img/"+decodeURIComponent(m[1]);}catch(e){return s;}
  }

  function normalizeImgUrl_(u) {
    let s = toHttps_(u);
    if (!s) return "";
    s = __fbProxy(s);

    // If it looks like a pure Google Drive file id
    if (/^[a-zA-Z0-9_-]{15,}$/.test(s)) {
      return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(s);
    }

    // Drive links -> uc?export=view&id=
    const did = driveIdFromUrl_(s);
    if (did) {
      return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(did);
    }

    // Dropbox share -> dl=1 (best effort)
    if (/dropbox\.com/i.test(s)) {
      // www.dropbox.com/s/xxx/file.jpg?dl=0 -> dl=1
      if (s.includes("?")) {
        s = s.replace(/(\?|&)dl=\d/i, "$1dl=1");
        if (!/[?&]dl=\d/i.test(s)) s += "&dl=1";
      } else {
        s += "?dl=1";
      }
      return s;
    }

    // Otherwise keep as https url
    return s;
  }

  function setImg_(imgEl, url){
    if (!imgEl) return;
    const u = normalizeImgUrl_(url);
    if (!u) return;
    imgEl.crossOrigin = "anonymous"; // best effort; may still fail if server lacks CORS headers
    imgEl.referrerPolicy = "no-referrer";
    imgEl.src = u;
    imgEl.style.display = "";
  }

  function setText_(sel, text){
    const el = $(sel);
    if (!el) return;
    el.textContent = String(text ?? "");
  }

  function setHtmlTextPreserve_(sel, text){
    // poster content: keep as text (no HTML), but preserve line breaks
    const el = $(sel);
    if (!el) return;
    el.textContent = String(text ?? "");
  }

  /* ---------- QR ---------- */
  function renderQR_(el, text){
    if (!el) return;
    el.innerHTML = "";
    if (!window.QRCode) {
      el.textContent = "QR lib missing";
      return;
    }
    // eslint-disable-next-line no-new
    new window.QRCode(el, {
      text: String(text || ""),
      width: 168,
      height: 168,
      colorDark: "#111111",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0
    });
  }

  /* ---------- photos ---------- */
  function collectPhotos_(card){
    const plan = (pick(card, ["plan","方案"], "") || "").toLowerCase();
    const isPremium = /premium|pro|paid|精品|高階|進階|付費/.test(plan);

    const keys = [
      ["photo1_img_fast","照片1_fast","photo1_url","photo1_img","照片1"],
      ["photo2_img_fast","照片2_fast","photo2_url","photo2_img","照片2"],
      ["photo3_img_fast","照片3_fast","photo3_url","photo3_img","照片3"],
      ["photo4_img_fast","照片4_fast","photo4_url","photo4_img","照片4"],
      ["photo5_img_fast","照片5_fast","photo5_url","photo5_img","照片5"]
    ];

    const max = isPremium ? 5 : 2;
    const arr = [];
    for (const ks of keys){
      const v = pick(card, ks, "");
      if (v) arr.push(__fbProxy(v));
      if (arr.length >= max) break;
    }
    return { photos: arr, isPremium };
  }

  function renderPhotos_(urls){
    const box = $("#wPhotos");
    const empty = $("#wPhotosEmpty");
    if (!box || !empty) return;

    box.innerHTML = "";
    const list = (urls || []).map(normalizeImgUrl_).filter(Boolean);

    if (!list.length){
      box.style.display = "none";
      empty.style.display = "";
      empty.textContent = "—";
      return;
    }

    for (const u of list){
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.src = u;
      box.appendChild(img);
    }
    box.style.display = "";
    empty.style.display = "none";
  }

  /* ---------- PNG render ---------- */
  async function renderPNG_(){
    const target = $("#capture");
    const out = $("#resultImg");
    if (!target || !out) return;

    if (!window.html2canvas){
      toast("html2canvas 未載入");
      return;
    }

    toast("正在產生 PNG…");

    try{
      const canvas = await window.html2canvas(target, {
        backgroundColor: null,
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY
      });
      const dataUrl = canvas.toDataURL("image/png");
      out.src = dataUrl;
      out.style.display = "";
      toast("PNG 產生完成 ✅");
    }catch(e){
      // Most common: cross-origin images taint canvas
      out.style.display = "none";
      toast("PNG 失敗：可能是圖片無 CORS（可改用 Firebase/同域圖）");
      console.warn("[wechat] renderPNG error:", e);
    }
  }

  /* ---------- clipboard ---------- */
  async function copyText_(t){
    const s = String(t||"");
    try{
      await navigator.clipboard.writeText(s);
      return true;
    }catch(_){
      const ok = prompt("請手動複製：", s);
      return ok !== null;
    }
  }

  /* ---------- main ---------- */
  (async function main(){
    const id = getId();
    setText_("#wId", id);

    const cleanUrl = buildCleanUrl(id);
    setText_("#wCleanUrl", cleanUrl);

    // buttons
    const btnCopy = $("#btnCopyLink");
    const btnOpen = $("#btnOpenLink");
    const btnRender = $("#btnRender");
    const btnBack = $("#btnBack");

    if (btnCopy){
      btnCopy.addEventListener("click", async () => {
        const ok = await copyText_(cleanUrl);
        toast(ok ? "已複製連結 ✅" : "已取消");
      });
    }
    if (btnOpen){
      btnOpen.addEventListener("click", () => location.href = cleanUrl);
    }
    if (btnRender){
      btnRender.addEventListener("click", renderPNG_);
    }
    if (btnBack){
      btnBack.addEventListener("click", () => history.length > 1 ? history.back() : (location.href = base_()));
    }

    // QR
    renderQR_($("#wQR"), cleanUrl);

    // fetch card
    try{
      const card = await fetchCard(id);

      const status = (pick(card, ["status","狀態"], "") || "").toLowerCase();
      const isInactive = (status === "inactive" || status === "locked" || status === "disabled");

      if (isInactive){
        // 交付長圖：仍可顯示基本，但遮個資（跟你 share.html 的規則一致）
        setText_("#wName", "（未開通）");
        setText_("#wUnit", "請聯繫客服開通");
        setText_("#wTitle", "狀態：" + (status || "inactive"));
        setHtmlTextPreserve_("#wSlogan", "請聯繫客服開通後再生成交付長圖。");
        setHtmlTextPreserve_("#wServices", "—");
        renderPhotos_([]);
        toast("此名片未開通（已遮罩）");
        return;
      }

      const name = pick(card, ["name","姓名"], "(未填姓名)");
      const unit = pick(card, ["unit","單位"], "—");
      const title = pick(card, ["title","頭銜"], "—");
      const slogan = pick(card, ["slogan","標語","理念標語"], "—");
      const services = pick(card, ["services","服務","服務項目"], "—");

      setText_("#wName", name);
      setText_("#wUnit", unit || "—");
      setText_("#wTitle", title || "—");
      setHtmlTextPreserve_("#wSlogan", slogan || "—");
      setHtmlTextPreserve_("#wServices", services || "—");

      // images
      const avatarRaw = pick(card, ["avatar_img_fast","個人照_fast","avatar_img","個人照","avatar_url"], "");
      const logoRaw = pick(card, ["logo_img_fast","logo_fast","logo_img","logo_url"], "");

      const av = $("#wAvatar");
      const lg = $("#wLogo");
      if (av && avatarRaw) setImg_(av, avatarRaw);
      if (lg && logoRaw) setImg_(lg, logoRaw);

      // photos (plan split)
      const { photos, isPremium } = collectPhotos_(card);
      renderPhotos_(photos);

      toast(isPremium ? "已載入（精品）" : "已載入（自由）");

    }catch(e){
      console.warn("[wechat] load error:", e);
      setText_("#wName", "讀取失敗");
      setText_("#wUnit", "—");
      setText_("#wTitle", "—");
      setHtmlTextPreserve_("#wSlogan", "可能是網路/權限/資料不存在。");
      setHtmlTextPreserve_("#wServices", String(e && e.message ? e.message : e));
      renderPhotos_([]);
      toast("讀取失敗（仍可複製連結）");
    }
  })();

})();