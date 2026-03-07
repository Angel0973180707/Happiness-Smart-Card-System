/* =========================================
   Happiness Smart Card System
   form.js v522.7 (COMPLETE OVERWRITE)

   新增：
   1. Step7 名片預覽
   2. Logo 預覽改方形
   3. 預覽即時同步
========================================= */

(()=>{
"use strict";

const VERSION="522.7";

const $=(id)=>document.getElementById(id);

/* ===============================
   DOM
=============================== */

const el={
previewAvatar:$("previewAvatar"),
previewLogo:$("previewLogo"),
previewName:$("previewName"),
previewUnit:$("previewUnit"),
previewTitle:$("previewTitle"),
previewSlogan:$("previewSlogan"),
previewServices:$("previewServices"),
previewExp:$("previewExp"),

summaryBox:$("summaryBox"),

btnSubmit:$("btnSubmit"),
btnReset:$("btnReset"),

successCard:$("successCard"),
successIdValue:$("successIdValue"),
btnCopyCustomerText:$("btnCopyCustomerText")
};

/* ===============================
   STATE
=============================== */

const state={
uploads:{},
plan:"",
color:"",
style:"",
paper:"",
premium_color:""
};

/* ===============================
   INPUT FIELDS
=============================== */

const fields=[
"name",
"unit",
"title",
"slogan",
"services",
"experience",
"website",
"phone",
"email",
"line_url",
"line_oa",
"wechat_id",
"address",
"video1",
"video2",
"video3",
"social1",
"social2",
"social3",
"cta_text",
"cta_link"
];

/* ===============================
   BOOT
=============================== */

boot();

function boot(){

fields.forEach(id=>{
const node=$(id);
if(!node)return;

node.addEventListener("input",()=>{
renderSummary();
updatePreview();
});
});

el.btnCopyCustomerText?.addEventListener("click",()=>{
navigator.clipboard.writeText(el.successIdValue.textContent);
});

renderSummary();
updatePreview();
}

/* ===============================
   HELPERS
=============================== */

function safeText(v){
return String(v||"").trim();
}

function escapeHtml(s){
return String(s??"")
.replaceAll("&","&amp;")
.replaceAll("<","&lt;")
.replaceAll(">","&gt;")
.replaceAll('"',"&quot;")
.replaceAll("'","&#39;");
}

/* ===============================
   COLLECT PAYLOAD
=============================== */

function collectPayload(){

const p={};

p.plan=state.plan||"";

if(state.plan==="free"){
p.color=state.color||"";
p.style=state.style||"";
p.paper=state.paper||"";
p.premium_color="";
}
else if(state.plan==="premium"){
p.color="";
p.style="";
p.paper="";
p.premium_color=state.premium_color||"";
}
else{
p.color="";
p.style="";
p.paper="";
p.premium_color="";
}

fields.forEach(id=>{
const node=$(id);
if(!node) return;

p[id]=safeText(node.value);
});

return p;
}

/* ===============================
   SUMMARY
=============================== */

function renderSummary(){

if(!el.summaryBox) return;

const payload=collectPayload();

let planText="尚未選擇";

if(state.plan==="free"){
planText=`自由搭配｜${safeText(state.color)||"未選"}｜${safeText(state.style)||"未選"}｜${safeText(state.paper)||"未選"}`;
}

else if(state.plan==="premium"){
planText=`精品設計｜${safeText(state.premium_color)||"未選"}`;
}

const rows=[
["模式","新建資料"],
["方案外觀",planText],
["姓名 / 職稱",`${payload.name||"未填寫"} / ${payload.title||"未填寫"}`],
["單位",payload.unit||"未填寫"],
["一句話介紹",payload.slogan||"未填寫"],
["服務項目",payload.services||"未填寫"],
["經歷 / 產品特色",payload.experience||"未填寫"]
];

el.summaryBox.innerHTML=rows.map(([label,value])=>{
return `<div class="sumRow">
<span>${escapeHtml(label)}</span>
<strong>${escapeHtml(value)}</strong>
</div>`;
}).join("");

}

/* ===============================
   UPLOAD PREVIEW
=============================== */

function getUploadPreview(slotKey){

const item=state.uploads?.[slotKey];
if(!item) return "";

return item.previewUrl||item.mainUrl||item.fastUrl||"";

}

function bindUploadPreview(slotKey,file){

if(!file) return;

const url=URL.createObjectURL(file);

if(!state.uploads) state.uploads={};

state.uploads[slotKey]={
sourceFile:file,
previewUrl:url
};

renderSummary();
updatePreview();

}

/* ===============================
   CHOICE
=============================== */

function setChoice(group,value){

if(group==="plan"){
state.plan=value;

if(value==="free"){
state.premium_color="";
}
if(value==="premium"){
state.color="";
state.style="";
state.paper="";
}
}

if(group==="color"){
state.plan="free";
state.color=value;
}

if(group==="style"){
state.plan="free";
state.style=value;
}

if(group==="paper"){
state.plan="free";
state.paper=value;
}

if(group==="premium_color"){
state.plan="premium";
state.premium_color=value;
}

renderSummary();
updatePreview();

}

/* ===============================
   PREVIEW
=============================== */

function updatePreview(){

const payload=collectPayload();

/* NAME */

if(el.previewName){
el.previewName.textContent=
payload.name || "你的名字";
}

/* UNIT */

if(el.previewUnit){
el.previewUnit.textContent=
payload.unit || "你的單位";
}

/* TITLE */

if(el.previewTitle){
el.previewTitle.textContent=
payload.title || "你的職稱";
}

/* SLOGAN */

if(el.previewSlogan){
el.previewSlogan.textContent=
payload.slogan || "一句話介紹會顯示在這裡";
}

/* SERVICES */

if(el.previewServices){
el.previewServices.textContent=
payload.services || "服務項目會顯示在這裡";
}

/* EXPERIENCE */

if(el.previewExp){
el.previewExp.textContent=
payload.experience || "經歷／產品服務特色會顯示在這裡";
}

/* AVATAR */

const avatarUrl=getUploadPreview("avatar");

if(el.previewAvatar){

if(avatarUrl){
el.previewAvatar.src=avatarUrl;
el.previewAvatar.style.display="block";
}
else{
el.previewAvatar.removeAttribute("src");
el.previewAvatar.style.display="none";
}

}

/* LOGO */

const logoUrl=getUploadPreview("logo");

if(el.previewLogo){

if(logoUrl){

el.previewLogo.src=logoUrl;
el.previewLogo.style.display="block";

/* v522.7 LOGO 改方形 */

el.previewLogo.style.borderRadius="16px";
el.previewLogo.style.objectFit="cover";

}
else{

el.previewLogo.removeAttribute("src");
el.previewLogo.style.display="none";

}

}

}

/* ===============================
   SUCCESS
=============================== */

function showSuccessCard(id){

if(!el.successCard) return;

const finalId=safeText(id) || "未取得";

el.successCard.classList.add("show");

if(el.successIdValue){
el.successIdValue.textContent=finalId;
}

}

function resetSuccessCard(){

if(!el.successCard) return;

el.successCard.classList.remove("show");

if(el.successIdValue){
el.successIdValue.textContent="-";
}

}

/* ===============================
   EXPORT
=============================== */

window.HSC_FORM_V5227={
bindUploadPreview,
setChoice,
collectPayload,
renderSummary,
updatePreview,
showSuccessCard,
resetSuccessCard
};

})();