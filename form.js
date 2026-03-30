/* ============================================================
   HSC form.js
   v7.3-form-use-shared-renderer
   完整覆蓋版 — 表單預覽直接呼叫 HSCCardRenderer.render
============================================================ */
(function(){
  "use strict";

  const DEFAULT_PHOTO_META = { x: 0.5, y: 0.5, scale: 1, rotate: 0 };
  const state = {
    photoMeta: {
      photo1: { ...DEFAULT_PHOTO_META },
      photo2: { ...DEFAULT_PHOTO_META },
      photo3: { ...DEFAULT_PHOTO_META },
      photo4: { ...DEFAULT_PHOTO_META },
      photo5: { ...DEFAULT_PHOTO_META }
    }
  };

  function qs(id){ return document.getElementById(id); }
  function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function valueOf(id){ const el = qs(id); return el ? String(el.value || "").trim() : ""; }
  function normalizeUrl_(s){
    let v = String(s || "").trim();
    if(!v) return "";
    if(/^https?:\/\//i.test(v)) return v;
    if(/^www\./i.test(v)) return "https://" + v;
    if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
    return v;
  }
  function getThemeSelection(){
    const plan = valueOf("plan") === "premium" ? "premium" : "free";
    if(plan === "premium"){
      return { plan, color: valueOf("premium_color") || "p1", style: "", paper: "" };
    }
    return {
      plan,
      color: valueOf("free_color") || "c1",
      style: valueOf("free_style") || "s1",
      paper: valueOf("free_paper") || "f1"
    };
  }
  function getLimits(){
    return valueOf("plan") === "premium"
      ? { photos: 5, ctas: 3 }
      : { photos: 2, ctas: 1 };
  }
  function buildPreviewCardData(){
    const limits = getLimits();
    const theme = getThemeSelection();
    const data = {
      id: "PREVIEW",
      tenant: "angel",
      name: valueOf("display_name"),
      unit: valueOf("unit"),
      title: valueOf("title"),
      phone: valueOf("phone"),
      email: valueOf("email"),
      website: valueOf("website"),
      line_url: valueOf("line_url"),
      wechat_id: valueOf("wechat_id"),
      experience: valueOf("experience"),
      services: valueOf("services"),
      address: valueOf("address"),
      slogan: valueOf("intro"),
      plan: theme.plan,
      color: theme.color,
      style: theme.style,
      paper: theme.paper,
      marquee_text: valueOf("marquee_text"),
      marquee_enabled: valueOf("marquee_text") ? "true" : "false",
      avatar_url: normalizeUrl_(valueOf("avatar_url")),
      logo_url: normalizeUrl_(valueOf("logo_url")),
      features: {
        photo_meta: state.photoMeta,
        preview_meta: {
          layout: "grid",
          aspect_ratio: "1:1",
          fit_mode: "cover",
          theme: theme.plan
        }
      }
    };

    for(let i = 1; i <= limits.ctas; i++){
      data[`cta_text_${i}`] = valueOf(`cta_text_${i}`);
      data[`cta_link_${i}`] = normalizeUrl_(valueOf(`cta_link_${i}`));
    }
    for(let i = 1; i <= limits.photos; i++){
      const url = normalizeUrl_(valueOf(`photo${i}_url`));
      if(url) data[`photo${i}_url`] = url;
    }
    return data;
  }
  function syncPreview(){
    if(!window.HSCCardRenderer) return;
    const root = qs("livePreviewCard");
    if(!root) return;
    const data = buildPreviewCardData();
    window.HSCCardRenderer.render(data, root, { applyBodyClasses: false });
  }
  function bindLivePreview(){
    qsa("input, textarea, select").forEach(el => {
      el.addEventListener("input", syncPreview);
      el.addEventListener("change", syncPreview);
    });
  }
  function fillDemo(){
    const demo = {
      display_name: "幸福顧問 Amanda",
      unit: "天使幸福工作室",
      title: "品牌陪跑顧問",
      intro: "把你的品牌亮點，整理成客戶一眼就懂的入口。",
      services: "品牌定位\n名片文案\n形象規劃",
      experience: "曾協助多位講師與創業者整理品牌內容，提升被看見與被記住的效率。",
      phone: "0912345678",
      email: "hello@example.com",
      website: "https://example.com",
      line_url: "https://lin.ee/G3VJoRm",
      wechat_id: "angel-card",
      address: "高雄市左營區",
      marquee_text: "歡迎預約洽詢｜智慧名片持續更新中",
      cta_text_1: "立即預約",
      cta_link_1: "https://example.com/book",
      cta_text_2: "看更多作品",
      cta_link_2: "https://example.com/work",
      cta_text_3: "加入 LINE",
      cta_link_3: "https://lin.ee/G3VJoRm"
    };
    Object.entries(demo).forEach(([id, value]) => { const el = qs(id); if(el) el.value = value; });
    const plan = qs("plan"); if(plan) plan.value = "premium";
    const pcolor = qs("premium_color"); if(pcolor) pcolor.value = "p4";
    syncPreview();
  }
  function clearForm(){
    qsa("input, textarea").forEach(el => el.value = "");
    qsa("select").forEach(el => { el.selectedIndex = 0; });
    syncPreview();
  }
  function boot(){
    bindLivePreview();
    const demoBtn = qs("btnDemoFill");
    const clearBtn = qs("btnClearForm");
    if(demoBtn) demoBtn.addEventListener("click", fillDemo);
    if(clearBtn) clearBtn.addEventListener("click", clearForm);
    syncPreview();
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
