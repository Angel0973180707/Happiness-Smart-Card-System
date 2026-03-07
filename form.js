import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
getAuth,
signInAnonymously,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import {
getStorage,
ref as sRef,
uploadBytes,
getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

(()=>{
"use strict";

const VERSION="522.7";
const PAGE_TOTAL=7;
const MOBILE_BP=760;

const firebaseConfig={
apiKey:"AIzaSyD8DTzmzyuDFkrBMjGNZkJoN9fcY9_8mb4",
authDomain:"happiness-smart-card-pro-7389a.firebaseapp.com",
projectId:"happiness-smart-card-pro-7389a",
storageBucket:"happiness-smart-card-pro-7389a.firebasestorage.app",
messagingSenderId:"143313936007",
appId:"1:143313936007:web:7c948563c51e8a47d3a222"
};

const $=(id)=>document.getElementById(id);

const el={
summaryBox:$("summaryBox"),

previewAvatar:$("previewAvatar"),
previewLogo:$("previewLogo"),
previewName:$("previewName"),
previewUnit:$("previewUnit"),
previewTitle:$("previewTitle"),
previewSlogan:$("previewSlogan"),
previewServices:$("previewServices"),
previewExp:$("previewExp"),

btnSubmit:$("btnSubmit"),
btnReset:$("btnReset"),

successCard:$("successCard"),
successIdValue:$("successIdValue"),
btnCopyCustomerText:$("btnCopyCustomerText")
};

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

const state={
page:0,
uploads:{},
plan:"",
color:"",
style:"",
paper:"",
premium_color:""
};

boot();

async function boot(){

renderSummary();
updatePreview();

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

}
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

function labelOf(list,value){
const found=(list||[]).find(x=>x.value===value);
return found?found.label:"未選";
}

function countSelectedPhotos(){
let n=0;
Object.keys(state.uploads||{}).forEach(k=>{
const u=state.uploads[k];
if(u&&(u.previewUrl||u.mainBlob)) n++;
});
return n;
}

function collectPayload(){
const p={};

p.plan=state.plan||"";

if(state.plan==="free"){
p.color=state.color||"";
p.style=state.style||"";
p.paper=state.paper||"";
p.premium_color="";
}else if(state.plan==="premium"){
p.color="";
p.style="";
p.paper="";
p.premium_color=state.premium_color||"";
}else{
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

function renderSummary(){
if(!el.summaryBox) return;

const payload=collectPayload();

let planText="尚未選擇";
if(state.plan==="free"){
planText=`自由搭配｜${safeText(state.color)||"未選"}｜${safeText(state.style)||"未選"}｜${safeText(state.paper)||"未選"}`;
}else if(state.plan==="premium"){
planText=`精品設計｜${safeText(state.premium_color)||"未選"}`;
}

const photoCount=countSelectedPhotos();
const photoLimit=state.plan==="premium"?5:2;

const rows=[
["模式","新建資料"],
["方案外觀",planText],
["姓名 / 職稱",`${payload.name||"未填寫"} / ${payload.title||"未填寫"}`],
["單位",payload.unit||"未填寫"],
["一句話介紹",payload.slogan||"未填寫"],
["服務項目",payload.services||"未填寫"],
["經歷 / 產品特色",payload.experience||"未填寫"],
["已選圖片",`${photoCount} / ${photoLimit} 張`]
];

el.summaryBox.innerHTML=rows.map(([label,value])=>{
return `<div class="sumRow"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}).join("");
}

function getUploadPreview(slotKey){
const item=state.uploads?.[slotKey];
if(!item) return "";
return item.previewUrl||item.mainUrl||item.fastUrl||"";
}

function bindUploadPreview(slotKey,file){
if(!file) return;
const url=URL.createObjectURL(file);

if(!state.uploads) state.uploads={};
if(state.uploads[slotKey]?.previewUrl?.startsWith?.("blob:")){
try{ URL.revokeObjectURL(state.uploads[slotKey].previewUrl); }catch(_){}
}

state.uploads[slotKey]={
...(state.uploads[slotKey]||{}),
sourceFile:file,
previewUrl:url
};

renderSummary();
updatePreview();
}

function setChoice(group,value){
if(group==="plan"){
state.plan=value;

if(value==="free"){
state.premium_color="";
if(!state.color) state.color="c1";
if(!state.style) state.style="s1";
if(!state.paper) state.paper="f1";
}else if(value==="premium"){
state.color="";
state.style="";
state.paper="";
if(!state.premium_color) state.premium_color="p1";
}
}

if(group==="color"){
state.plan="free";
state.color=value;
if(!state.style) state.style="s1";
if(!state.paper) state.paper="f1";
state.premium_color="";
}

if(group==="style"){
state.plan="free";
state.style=value;
if(!state.color) state.color="c1";
if(!state.paper) state.paper="f1";
state.premium_color="";
}

if(group==="paper"){
state.plan="free";
state.paper=value;
if(!state.color) state.color="c1";
if(!state.style) state.style="s1";
state.premium_color="";
}

if(group==="premium_color"){
state.plan="premium";
state.premium_color=value;
state.color="";
state.style="";
state.paper="";
}

renderSummary();
updatePreview();
}

window.HSC_FORM_V5227={
bindUploadPreview,
setChoice,
collectPayload,
renderSummary,
updatePreview
};
function updatePreview(){
const payload=collectPayload();

if(el.previewName){
el.previewName.textContent=payload.name || "你的名字";
}

if(el.previewUnit){
el.previewUnit.textContent=payload.unit || "你的單位";
}

if(el.previewTitle){
el.previewTitle.textContent=payload.title || "你的職稱";
}

if(el.previewSlogan){
el.previewSlogan.textContent=payload.slogan || "一句話介紹會顯示在這裡";
}

if(el.previewServices){
el.previewServices.textContent=payload.services || "服務項目會顯示在這裡";
}

if(el.previewExp){
el.previewExp.textContent=payload.experience || "經歷／產品服務特色會顯示在這裡";
}

const avatarUrl=getUploadPreview("avatar");
if(el.previewAvatar){
if(avatarUrl){
el.previewAvatar.src=avatarUrl;
el.previewAvatar.style.display="block";
}else{
el.previewAvatar.removeAttribute("src");
el.previewAvatar.style.display="none";
}
}

const logoUrl=getUploadPreview("logo");
if(el.previewLogo){
if(logoUrl){
el.previewLogo.src=logoUrl;
el.previewLogo.style.display="block";

/* v522.7：Logo 預覽改方形，不用圓球 */
el.previewLogo.style.borderRadius="16px";
el.previewLogo.style.objectFit="cover";
}else{
el.previewLogo.removeAttribute("src");
el.previewLogo.style.display="none";
}
}
}

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

async function fakeSubmitForUiOnly(){
/* 這段先補齊前端成功顯示結構
   真正送出仍由你原本 reserve/create/update 流程接回去 */
const payload=collectPayload();

if(!payload.name){
alert("請先填寫姓名");
return;
}

const fakeId="TW0001";
showSuccessCard(fakeId);
}

/* 若頁面有預覽按鈕，可直接掛上 */
const btnPreview=window.document.getElementById("btnPreview");
if(btnPreview){
btnPreview.addEventListener("click",()=>{
updatePreview();
});
}

/* 若目前送出按鈕還沒綁回完整送出流程，
   可先讓 UI 至少顯示成功卡。
   之後你原本 onSubmit 完整版接回來時，
   把 showSuccessCard(實際卡號) 放進成功分支即可。 */
if(el.btnSubmit){
el.btnSubmit.addEventListener("click",()=>{
updatePreview();
});
}

window.HSC_FORM_V5227.showSuccessCard=showSuccessCard;
window.HSC_FORM_V5227.resetSuccessCard=resetSuccessCard;
window.HSC_FORM_V5227.fakeSubmitForUiOnly=fakeSubmitForUiOnly;

})();