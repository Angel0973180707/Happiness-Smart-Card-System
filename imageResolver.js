/* ======================================
   HSC Image Resolver
   統一解析所有圖片欄位
====================================== */

function pickImage(...args){
  for(const v of args){
    if(v && String(v).trim()){
      return String(v).trim();
    }
  }
  return "";
}

/* ---------- avatar ---------- */

function getAvatar(item){
  return pickImage(
    item.avatar_img_fast,
    item.avatar_img,
    item.avatar_url,
    item.avatar
  );
}

/* ---------- logo ---------- */

function getLogo(item){
  return pickImage(
    item.logo_img_fast,
    item.logo_img,
    item.logo_url,
    item.logo
  );
}

/* ---------- photo ---------- */

function getPhoto(item,i){

  const fast = item[`photo${i}_img_fast`];
  const img  = item[`photo${i}_img`];
  const url  = item[`photo${i}_url`];

  return pickImage(fast,img,url);

}

/* ---------- photo list ---------- */

function getPhotos(item){

  const arr=[];

  for(let i=1;i<=5;i++){

    const p=getPhoto(item,i);

    if(p) arr.push(p);

  }

  return arr;

}
