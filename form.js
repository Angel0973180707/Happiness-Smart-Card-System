const CONFIG = {
  GAS: "https://script.google.com/macros/s/YOUR_GAS_ID/exec",
  VERSION: "v499"
};

const qs = id => document.getElementById(id);

function getParam(name){
  const p = new URLSearchParams(location.search);
  return (p.get(name) || "").trim();
}

function showMsg(text, type=""){
  const el = qs("msg");
  el.className = type;
  el.innerText = text;
}

function rejectDataUrl(v){
  if(/^data:image\//i.test(v)){
    throw new Error("不可使用 base64 圖片，請使用 Firebase downloadURL");
  }
}

async function postJSON(body){
  const res = await fetch(CONFIG.GAS, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  const txt = await res.text();
  return JSON.parse(txt);
}

async function submitForm(){
  try{
    const tenant = getParam("tenant");
    const uid    = getParam("uid");
    const exp    = getParam("exp");
    const sig    = getParam("sig");

    if(!tenant || !uid || !exp || !sig){
      showMsg("連結無效或已過期", "error");
      return;
    }

    const name = qs("name").value.trim();
    if(!name){
      showMsg("請填寫姓名", "error");
      return;
    }

    const avatar = qs("avatar").value.trim();
    const photo1 = qs("photo1").value.trim();
    const photo2 = qs("photo2").value.trim();

    rejectDataUrl(avatar);
    rejectDataUrl(photo1);
    rejectDataUrl(photo2);

    showMsg("⏳ 預占序號中...");

    const reserveRes = await postJSON({
      action:"reserve",
      tenant,
      uid,
      exp,
      sig
    });

    if(!reserveRes.ok){
      showMsg("reserve 失敗：" + reserveRes.message, "error");
      return;
    }

    const { cardId, token } = reserveRes;

    showMsg("⏳ 建立名片資料中...");

    const createRes = await postJSON({
      action:"create",
      tenant,
      id: cardId,
      uid,
      exp,
      sig,
      token,

      name,
      unit: qs("unit").value.trim(),
      title: qs("title").value.trim(),
      slogan: qs("slogan").value.trim(),

      avatar_img: avatar,
      photo1_img: photo1,
      photo2_img: photo2
    });

    if(!createRes.ok){
      showMsg("create 失敗：" + createRes.message, "error");
      return;
    }

    showMsg("✅ 送出成功！請通知館長確認。", "success");

  }catch(err){
    showMsg("錯誤：" + err.message, "error");
  }
}

qs("btnSubmit").addEventListener("click", submitForm);