/* =========================================
   Happiness Smart Card System
   form.js v522.8 (COMPLETE OVERWRITE)

   升級：
   1. Step7 真名片預覽版
   2. 頭像置中
   3. Logo 放底部
   4. 新增照片牆預覽
      - 自由款：最多 2 張
      - 精品款：最多 5 張
   5. 預覽即時同步
   6. 保持 reserve / create / upload 主流程不動
========================================= */

(()=>{
"use strict";

const VERSION="522.8";

const $=(id)=>document.getElementById(id);

/* ===============================
   DOM
=============================== */

const el={
previewCard:$("previewCard"),
previewTheme:$("previewTheme"),
previewPlanBadge:$("previewPlanBadge"),

previewAvatar:$("previewAvatar"),
previewLogo:$("previewLogo"),
previewName:$("previewName"),
previewUnit:$("previewUnit"),
previewTitle:$("previewTitle"),
previewSlogan:$("previewSlogan"),
previewServices:$("previewServices"),
previewExp:$("previewExp"),
previewPhotoWall:$("previewPhotoWall"),
previewPhotoEmpty:$("previewPhotoEmpty"),

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
"wechat_poster",
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

el.btnCopyCustomerText?.addEventListener("click",async ()=>{
try{
await navigator.clipboard.writeText(el.successIdValue?.textContent || "");
}catch(err){
console.warn("copy failed",err);
}
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

function hasText(v){
return safeText(v)!=="";
}

function nl2br(s){
return escapeHtml(String(s||"")).replace(/\n/g,"<br>");
}

function getPlanLabel(){
if(state.plan==="free"){
return "自由搭配";
}
if(state.plan==="premium"){
return "精品設計";
}
return "尚未選擇";
}

function getPlanDetailText(){
if(state.plan==="free"){
return `自由搭配｜${safeText(state.color)||"未選"}｜${safeText(state.style)||"未選"}｜${safeText(state.paper)||"未選"}`;
}
if(state.plan==="premium"){
return `精品設計｜${safeText(state.premium_color)||"未選"}`;
}
return "尚未選擇";
}

function getPhotoLimit(){
return state.plan==="premium" ? 5 : 2;
}

function getCardThemeClass(){
if(state.plan==="premium"){
return "theme-premium";
}
return "theme-free";
}

function getUploadPreview(slotKey){
const item=state.uploads?.[slotKey];
if(!item) return "";
return item.previewUrl || item.mainUrl || item.fastUrl || "";
}

function setVisible(node,show){
if(!node) return;
node.style.display=show ? "" : "none";
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

const rows=[
["模式","新建資料"],
["方案外觀",getPlanDetailText()],
["姓名 / 職稱",`${payload.name||"未填寫"} / ${payload.title||"未填寫"}`],
["單位",payload.unit||"未填寫"],
["一句話介紹",payload.slogan||"未填寫"],
["服務項目",payload.services||"未填寫"],
["經歷 / 產品特色",payload.experience||"未填寫"]
];

el.summaryBox.innerHTML=rows.map(([label,value])=>{
return `<div class="sumRow">
<span>${escapeHtml(label)}</span>
<strong>${nl2br(value)}</strong>
</div>`;
}).join("");
}

/* ===============================
   UPLOAD PREVIEW
=============================== */

function bindUploadPreview(slotKey,file){

if(!file) return;

const old=state.uploads?.[slotKey]?.previewUrl;
if(old && old.startsWith("blob:")){
try{ URL.revokeObjectURL(old); }catch(e){}
}

const url=URL.createObjectURL(file);

if(!state.uploads) state.uploads={};

state.uploads[slotKey]={
...(state.uploads[slotKey]||{}),
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

/* CARD THEME */

if(el.previewCard){
el.previewCard.classList.remove("theme-free","theme-premium");
el.previewCard.classList.add(getCardThemeClass());
}

if(el.previewTheme){
el.previewTheme.textContent=getPlanDetailText();
}

if(el.previewPlanBadge){
el.previewPlanBadge.textContent=getPlanLabel();
}

/* NAME */

if(el.previewName){
el.previewName.textContent=payload.name || "你的名字";
}

/* UNIT */

if(el.previewUnit){
el.previewUnit.textContent=payload.unit || "你的單位";
}

/* TITLE */

if(el.previewTitle){
el.previewTitle.textContent=payload.title || "你的職稱";
}

/* SLOGAN */

if(el.previewSlogan){
el.previewSlogan.textContent=payload.slogan || "一句話介紹會顯示在這裡";
}

/* SERVICES */

if(el.previewServices){
el.previewServices.textContent=payload.services || "服務項目會顯示在這裡";
}

/* EXPERIENCE */

if(el.previewExp){
el.previewExp.textContent=payload.experience || "經歷／產品服務特色會顯示在這裡";
}

/* AVATAR */

const avatarUrl=getUploadPreview("avatar");

if(el.previewAvatar){
if(avatarUrl){
el.previewAvatar.src=avatarUrl;
setVisible(el.previewAvatar,true);
}else{
el.previewAvatar.removeAttribute("src");
setVisible(el.previewAvatar,false);
}
}

/* LOGO */

const logoUrl=getUploadPreview("logo");

if(el.previewLogo){
if(logoUrl){
el.previewLogo.src=logoUrl;
setVisible(el.previewLogo,true);
}else{
el.previewLogo.removeAttribute("src");
setVisible(el.previewLogo,false);
}
}

/* PHOTO WALL */

renderPhotoWall();
}

function renderPhotoWall(){

if(!el.previewPhotoWall) return;

const limit=getPhotoLimit();
const keys=["photo1","photo2","photo3","photo4","photo5"];
const urls=[];

for(const key of keys){
const url=getUploadPreview(key);
if(url) urls.push(url);
if(urls.length>=limit) break;
}

if(!urls.length){
el.previewPhotoWall.innerHTML="";
setVisible(el.previewPhotoEmpty,true);
return;
}

setVisible(el.previewPhotoEmpty,false);

el.previewPhotoWall.innerHTML=urls.map((url,idx)=>{
return `<div class="previewPhotoItem" data-idx="${idx+1}">
<img src="${escapeHtml(url)}" alt="照片預覽 ${idx+1}" />
</div>`;
}).join("");

el.previewPhotoWall.setAttribute("data-count",String(urls.length));
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

window.HSC_FORM_V5228={
bindUploadPreview,
setChoice,
collectPayload,
renderSummary,
updatePreview,
showSuccessCard,
resetSuccessCard,
getPhotoLimit
};

})();