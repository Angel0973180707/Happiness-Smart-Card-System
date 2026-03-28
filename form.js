
(function () {
  'use strict';
  const STORAGE_KEY = 'HSC_LAST_QUOTE';
  const CONFIG = {
    GAS: 'https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec',
    HUB_URL: 'https://angel0973180707.github.io/Happiness-Smart-Card-System/',
    CUSTOMER_SERVICE_URL: 'https://lin.ee/G3VJoRm',
    GOLD_MEMBER_MESSAGE: '想瞭解金牌會員',
    GOLD_MEMBER_COPY_TEXT: '想瞭解金牌會員',
    DRAFT_KEY: 'hsc_form_draft_v681',
    BASE_LIMITS: { free: { photos: 2, ctas: 1 }, premium: { photos: 5, ctas: 3 } },
    PLAN_PRICES: { free: 1500, premium: 2000 },
    ADDON_PRICES: { addon_marquee: 300, addon_photo: 100, addon_cta: 100, addon_update_unlimited: 300, addon_bundle: 500, addon_gold_member: 10000 },
    MAX_ADDON_CTA_QTY: 10, MAX_RENDER_PHOTO: 15, MAX_RENDER_CTA: 13
  };
  const state = { plan: null, addons: new Set(), addonPhotoQty: 0, addonCtaQty: 0, photoLimit: 0, ctaLimit: 0, marqueeEnabled: false, planAmount: 0, addonAmount: 0, totalAmount: 0, isSubmitting: false };
  const els = {};
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDom(); if (!els.form) return;
    syncHiddenMetaFromQuery(); bindEvents(); restoreDraftSilently(); syncPlanPanels(); syncAddonControls(); recalculateDynamicState(); renderPhotoSlots(); renderCtaSlots();
    paintStatus('目前版本：v6.8.1 真成交完整版');
  }
  function cacheDom() {
    els.form = document.getElementById('smart-card-form');
    els.statusStrip = document.getElementById('form-status-strip');
    els.planRadios = Array.from(document.querySelectorAll('input[name="plan"]'));
    els.addonCheckboxes = Array.from(document.querySelectorAll('input[name="addons"]'));
    ['addon_photo_enabled','addon_photo_qty','addon_cta_enabled','addon_cta_qty','photo-slots','cta-slots','photo-slot-template','cta-slot-template','free-theme-group','premium-theme-group','photo_limit_total','cta_limit_total','plan_amount','addon_amount','total_amount','marquee-section','summary-plan-name','summary-photo-count','summary-cta-count','summary-marquee-status','summary-plan-pill','summary-photo-pill','summary-cta-pill','quote-state-text','quote-plan-amount','quote-addon-amount','quote-total-amount','quote-addon-breakdown','btn-save-draft','btn-clear-draft','btn-contact-service','btn-open-showcase','btn-gold-info','btn-gold-copy','btn-gold-contact','btn-submit-form'].forEach(id=>els[id.replace(/-/g,'_')] = document.getElementById(id));
  }
  function bindEvents() {
    els.planRadios.forEach(r=>r.addEventListener('change', syncAll));
    els.addonCheckboxes.forEach(c=>c.addEventListener('change', syncAll));
    els.addon_photo_qty.addEventListener('input', ()=>{ normalizeAddonNumberInput(els.addon_photo_qty, getPhotoAddonMax()); if (toInt(els.addon_photo_qty.value)>0) els.addon_photo_enabled.checked=true; syncAll(); });
    els.addon_cta_qty.addEventListener('input', ()=>{ normalizeAddonNumberInput(els.addon_cta_qty, CONFIG.MAX_ADDON_CTA_QTY); if (toInt(els.addon_cta_qty.value)>0) els.addon_cta_enabled.checked=true; syncAll(); });
    els.btn_save_draft.addEventListener('click', ()=>saveDraft(false));
    els.btn_clear_draft.addEventListener('click', clearDraft);
    els.btn_contact_service.addEventListener('click', ()=>openService(''));
    els.btn_open_showcase.addEventListener('click', ()=>window.open(CONFIG.HUB_URL + 'index.html?view=1','_blank','noopener'));
    if (els.btn_gold_info) els.btn_gold_info.addEventListener('click', ()=>alert('瞭解金牌會員權益，請在客服區輸入：想瞭解金牌會員'));
    if (els.btn_gold_copy) els.btn_gold_copy.addEventListener('click', async ()=>{ await copyText(CONFIG.GOLD_MEMBER_COPY_TEXT); paintStatus('已複製詢問文案：' + CONFIG.GOLD_MEMBER_COPY_TEXT); });
    if (els.btn_gold_contact) els.btn_gold_contact.addEventListener('click', ()=>openService(CONFIG.GOLD_MEMBER_MESSAGE));
    els.form.addEventListener('input', debounce(()=>saveDraft(true), 280));
    els.form.addEventListener('submit', submitForm);
  }
  function syncAll() { syncPlanPanels(); syncAddonControls(); recalculateDynamicState(); renderPhotoSlots(); renderCtaSlots(); }
  function getCurrentPlan() { const c = els.planRadios.find(r=>r.checked); return c ? c.value : null; }
  function getPhotoAddonMax(){ return state.plan==='premium'?5:state.plan==='free'?8:0; }
  function syncPlanPanels(){ state.plan = getCurrentPlan(); els.free_theme_group.classList.toggle('hidden', state.plan!=='free'); els.premium_theme_group.classList.toggle('hidden', state.plan!=='premium'); document.querySelectorAll('[data-plan-card]').forEach(n=>n.classList.toggle('is-selected', n.getAttribute('data-plan-card')===state.plan)); }
  function syncAddonControls(){
    const photoEnabled = !!els.addon_photo_enabled.checked;
    const ctaEnabled = !!els.addon_cta_enabled.checked;
    els.addon_photo_qty.disabled = !(state.plan && photoEnabled);
    els.addon_cta_qty.disabled = !(state.plan && ctaEnabled);
    els.addon_photo_qty.max = String(getPhotoAddonMax());
    normalizeAddonNumberInput(els.addon_photo_qty, getPhotoAddonMax());
    normalizeAddonNumberInput(els.addon_cta_qty, CONFIG.MAX_ADDON_CTA_QTY);
  }
  function recalculateDynamicState(){
    state.plan = getCurrentPlan();
    state.addons = new Set(els.addonCheckboxes.filter(b=>b.checked).map(b=>b.value));
    state.addonPhotoQty = state.addons.has('addon_photo') ? clamp(toInt(els.addon_photo_qty.value),0,getPhotoAddonMax()) : 0;
    state.addonCtaQty = state.addons.has('addon_cta') ? clamp(toInt(els.addon_cta_qty.value),0,CONFIG.MAX_ADDON_CTA_QTY) : 0;
    state.marqueeEnabled = state.addons.has('addon_marquee') || state.addons.has('addon_bundle');
    if (!state.plan) {
      state.photoLimit=0; state.ctaLimit=0; state.planAmount=0; state.addonAmount=0; state.totalAmount=0;
      els.photo_limit_total.value='0'; els.cta_limit_total.value='0'; els.plan_amount.value='0'; els.addon_amount.value='0'; els.total_amount.value='0';
      renderSummary(); renderQuote(); els.marquee_section.classList.add('hidden'); return;
    }
    const base = CONFIG.BASE_LIMITS[state.plan];
    state.photoLimit = clamp(base.photos + state.addonPhotoQty, 0, CONFIG.MAX_RENDER_PHOTO);
    state.ctaLimit = clamp(base.ctas + state.addonCtaQty, 0, CONFIG.MAX_RENDER_CTA);
    state.planAmount = CONFIG.PLAN_PRICES[state.plan];
    state.addonAmount = buildAddonItems().reduce((s, i)=>s + (Number(i.amount)||0), 0);
    state.totalAmount = state.planAmount + state.addonAmount;
    els.photo_limit_total.value=String(state.photoLimit); els.cta_limit_total.value=String(state.ctaLimit); els.plan_amount.value=String(state.planAmount); els.addon_amount.value=String(state.addonAmount); els.total_amount.value=String(state.totalAmount);
    renderSummary(); renderQuote(); els.marquee_section.classList.toggle('hidden', !state.marqueeEnabled);
  }
  function renderSummary(){
    els.summary_plan_name.textContent = state.plan ? (state.plan==='premium'?'精品設計':'自由搭配') : '請先選擇方案';
    els.summary_photo_count.textContent = state.plan ? String(state.photoLimit) : '-';
    els.summary_cta_count.textContent = state.plan ? String(state.ctaLimit) : '-';
    els.summary_marquee_status.textContent = state.marqueeEnabled ? '已開啟' : '未開啟';
    els.summary_plan_pill.textContent = state.plan ? '目前方案：' + (state.plan==='premium'?'精品設計':'自由搭配') : '請先選擇方案';
    els.summary_photo_pill.textContent = '照片上限：' + (state.plan ? state.photoLimit : '-');
    els.summary_cta_pill.textContent = 'CTA 上限：' + (state.plan ? state.ctaLimit : '-');
  }
  function renderQuote(){
    els.quote_state_text.textContent = state.plan ? '已選擇 ' + (state.plan==='premium'?'精品設計':'自由搭配') : '請先選擇方案';
    els.quote_plan_amount.textContent = state.plan ? money(state.planAmount) : '-';
    els.quote_addon_amount.textContent = money(state.addonAmount);
    els.quote_total_amount.textContent = state.plan ? money(state.totalAmount) : '-';
    const items=buildAddonItems();
    els.quote_addon_breakdown.innerHTML = items.length ? items.map(i=>'<div class="quote-breakdown-row"><span>'+i.name+'</span><strong>'+money(i.amount)+'</strong></div>').join('') : '<p class="quote-breakdown-empty">尚未選擇加購</p>';
  }
  function renderPhotoSlots(){
    els.photo_slots.innerHTML='';
    if (!state.plan) return;
    for (let i=1;i<=state.photoLimit;i++) {
      const frag=els.photo_slot_template.content.cloneNode(true);
      frag.querySelector('.photo-slot-title').textContent='照片 ' + i;
      const badge=frag.querySelector('.photo-slot-badge');
      const urlInput=frag.querySelector('.photo-url-input');
      const fileInput=frag.querySelector('.photo-file-input');
      const preview=frag.querySelector('.photo-preview-box');
      if (urlInput) urlInput.name='photo'+i+'_url';
      if (fileInput) {
        fileInput.name='photo'+i+'_file';
        fileInput.addEventListener('change', ()=>{ const f=fileInput.files&&fileInput.files[0]; badge.textContent=f?'已選檔案':'尚未上傳'; preview.textContent=f?f.name:'尚未選擇圖片';});
      }
      els.photo_slots.appendChild(frag);
    }
  }
  function renderCtaSlots(){
    const prev=[...document.querySelectorAll('.cta-slot-card')].map(c=>({label:c.querySelector('.cta-label-input')?.value||'', url:c.querySelector('.cta-url-input')?.value||''}));
    els.cta_slots.innerHTML='';
    if (!state.plan) return;
    for (let i=1;i<=state.ctaLimit;i++) {
      const frag=els.cta_slot_template.content.cloneNode(true);
      frag.querySelector('.cta-title-label').textContent='CTA '+i+' 文字';
      const li=frag.querySelector('.cta-label-input'); const ui=frag.querySelector('.cta-url-input');
      li.name='cta'+i+'_label'; ui.name='cta'+i+'_url'; li.value=prev[i-1]?.label||''; ui.value=prev[i-1]?.url||'';
      els.cta_slots.appendChild(frag);
    }
  }
  function collectCtaItems(){ return [...document.querySelectorAll('.cta-slot-card')].map(c=>({label:c.querySelector('.cta-label-input')?.value?.trim()||'', url:c.querySelector('.cta-url-input')?.value?.trim()||''})).filter(v=>v.label||v.url); }
  function collectMarqueeItems(){ return ['marquee_1','marquee_2','marquee_3'].map(id=>document.getElementById(id)?.value?.trim()||'').filter(Boolean); }
  function buildAddonItems(){
    const items=[];
    if (state.addons.has('addon_bundle')) items.push({name:'跑馬燈＋更新組合', amount:500});
    else { if (state.addons.has('addon_marquee')) items.push({name:'跑馬燈功能', amount:300}); if (state.addons.has('addon_update_unlimited')) items.push({name:'無限更新', amount:300}); }
    if (state.addonPhotoQty) items.push({name:'照片加購', qty:state.addonPhotoQty, unit_price:100, amount:state.addonPhotoQty*100});
    if (state.addonCtaQty) items.push({name:'CTA 加購', qty:state.addonCtaQty, unit_price:100, amount:state.addonCtaQty*100});
    if (state.addons.has('addon_gold_member')) items.push({name:'金牌級會員', amount:10000});
    return items;
  }
  function buildNoteText(){
    const lines=[]; const title=v('title').trim(); const addr=v('address').trim(); const intro=v('intro').trim();
    if (title) lines.push('職稱／副標：'+title); if (addr) lines.push('地址：'+addr); if (intro) lines.push('簡介：'+intro);
    const ctas=collectCtaItems(); if (ctas.length){ lines.push('CTA：'); ctas.forEach((i,idx)=>lines.push('- CTA '+(idx+1)+'｜'+(i.label||'')+'｜'+(i.url||''))); }
    const marquees=collectMarqueeItems(); if (marquees.length){ lines.push('跑馬燈：'); marquees.forEach((m,idx)=>lines.push('- 第 '+(idx+1)+' 則：'+m)); }
    const addons=buildAddonItems(); if (addons.length){ lines.push('加購：'); addons.forEach(i=>lines.push('- '+i.name+'｜'+money(i.amount))); }
    return lines.join('\\n');
  }
  function collectPayload(){
    const isFree = state.plan === 'free';
    return {
      action: 'createCardWithOfflinePayment',
      plan: state.plan,
      name: t('display_name'),
      phone: t('phone'),
      email: t('email'),
      color: isFree ? v('free_color') : v('premium_color'),
      style: isFree ? v('free_style') : '',
      paper: isFree ? v('free_paper') : '',
      note: buildNoteText(),
      amount: state.totalAmount || 0,
      is_test: 'FALSE'
    };
  }
  async function submitForm(e){
    e.preventDefault();
    if (state.isSubmitting) return;
    if (!state.plan) return paintStatus('請先選擇主方案。','error');
    if (!t('display_name')) return paintStatus('請填寫姓名／品牌名稱。','error');
    if (!t('phone')) return paintStatus('請填寫電話。','error');
    const payload=collectPayload();
    try{
      state.isSubmitting=true; setSubmitting(true); paintStatus('資料送出中，正在建立申請、卡片與付款單…');
      const res=await fetch(CONFIG.GAS,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const text=await res.text();
      let data; try{ data=JSON.parse(text);}catch(_){ throw new Error('GAS 回傳不是有效 JSON'); }
      if(!data || !data.ok) throw new Error((data&&data.error)||'送出失敗');
      const cardId=data.card?.id || data.card_id || '';
      const storeData={
        card_id: cardId,
        customer_name: payload.name,
        submitted_at: new Date().toISOString(),
        preview_url: cardId ? CONFIG.HUB_URL + 'card.html?id=' + encodeURIComponent(cardId) : '',
        plan_name: state.plan==='premium'?'精品設計':'自由搭配',
        plan_amount: state.planAmount,
        addon_amount: state.addonAmount,
        total_amount: state.totalAmount,
        addon_items: buildAddonItems(),
        payment_notice: data.payment_notice || ''
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
      localStorage.removeItem(CONFIG.DRAFT_KEY);
      window.location.href='./quote-success.html';
    }catch(err){
      paintStatus('送出失敗：' + (err && err.message ? err.message : '未知錯誤'),'error');
    }finally{
      state.isSubmitting=false; setSubmitting(false);
    }
  }
  function saveDraft(silent){
    try{
      const fd=new FormData(els.form); const data={};
      fd.forEach((value,key)=>{ if(key==='addons'){ if(!Array.isArray(data.addons)) data.addons=[]; data.addons.push(value); return; } if(value instanceof File) return; data[key]=value;});
      localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(data));
      if(!silent) paintStatus('已暫存目前表單內容。');
    }catch(_){}
  }
  function restoreDraftSilently(){
    try{
      const raw=localStorage.getItem(CONFIG.DRAFT_KEY); if(!raw) return; const data=JSON.parse(raw);
      if(data.plan) els.planRadios.forEach(r=>r.checked=r.value===data.plan);
      const set=new Set(Array.isArray(data.addons)?data.addons:[]);
      els.addonCheckboxes.forEach(b=>b.checked=set.has(b.value));
      ['invite_code','ref','addon_photo_qty','addon_cta_qty','display_name','title','phone','email','address','intro','free_color','free_style','free_paper','premium_color','marquee_1','marquee_2','marquee_3'].forEach(id=>{ if(data[id]!=null){ const el=document.getElementById(id); if(el) el.value=data[id]; }});
    }catch(_){}
  }
  function clearDraft(){ localStorage.removeItem(CONFIG.DRAFT_KEY); paintStatus('已清除暫存草稿。');}
  function syncHiddenMetaFromQuery(){ const p=new URLSearchParams(window.location.search); if(p.get('invite')||p.get('invite_code')) document.getElementById('invite_code').value=p.get('invite')||p.get('invite_code'); if(p.get('ref')) document.getElementById('ref').value=p.get('ref'); }
  function setSubmitting(v){ els.btn_submit_form.disabled=!!v; els.btn_submit_form.textContent=v?'送出中…':'送出申請';}
  function openService(msg){ const q=encodeURIComponent(msg||''); window.open(q?CONFIG.CUSTOMER_SERVICE_URL+'?text='+q:CONFIG.CUSTOMER_SERVICE_URL,'_blank','noopener');}
  async function copyText(str){ if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(str); const ta=document.createElement('textarea'); ta.value=str; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  function paintStatus(m,t){ els.statusStrip.textContent=m; els.statusStrip.dataset.state=t||'ok';}
  function money(n){ return 'NT$ ' + Number(n||0).toLocaleString('zh-TW');}
  function normalizeAddonNumberInput(input,max){ input.value=String(clamp(toInt(input.value),0,max));}
  function clamp(v,min,max){ return Math.min(max, Math.max(min, v));}
  function toInt(v){ const n=parseInt(v,10); return Number.isFinite(n)?n:0;}
  function debounce(fn,wait){ let tm=null; return function(){ clearTimeout(tm); tm=setTimeout(fn,wait);};}
  function t(id){ return (document.getElementById(id)?.value || '').trim();}
  function v(id){ return document.getElementById(id)?.value || ''; }
})();
