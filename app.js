
const DEFAULT_CARD_ID = "angel";

/* ===== 模擬資料（實際請改為API）===== */
const mockData = {
  id: "angel",
  name: "小天使",
  title: "天使幸福智慧名片創辦人",
  bio: "陪你把心站穩，活得自在。",
  avatar: "https://via.placeholder.com/150",
  plan: "premium",
  theme: "forest",
  glass: true,
  links: [
    { label:"YouTube", url:"https://youtube.com/angel" },
    { label:"官方網站", url:"https://angel-home.com" },
    { label:"工作室導航", url:"https://maps.google.com/xxx" }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  loadCard(DEFAULT_CARD_ID);
});

function loadCard(id){
  renderCard(mockData);
}

function renderCard(data){

  const card = document.getElementById("card");
  card.className = "container";

  applyTheme(data.plan, data.theme, data.glass);

  document.getElementById("avatar").src = data.avatar;
  document.getElementById("name").textContent = data.name;
  document.getElementById("title").textContent = data.title;
  document.getElementById("bio").textContent = data.bio;

  renderLinks(data.links);
}

function applyTheme(plan, theme, glass){

  const card = document.getElementById("card");

  if(plan === "free"){
    card.classList.add("free");
  }

  if(plan === "premium"){
    card.classList.add("premium");
    card.classList.add(getAvatarStyleByTheme(theme));
  }

  if(glass){
    card.classList.add("glass");
  }

  setColor(theme);
}

function getAvatarStyleByTheme(theme){

  const mapping = {
    forest: "round-glow",
    indigo: "rounded-square",
    amber: "round-glow",
    burgundy: "float",
    violet: "rounded-square",
    latte: "round-glow",
    silver: "float"
  };

  return mapping[theme] || "round-glow";
}

function setColor(theme){

  const colors = {
    forest:"#2f5d50",
    indigo:"#2c3e75",
    amber:"#c77d2b",
    burgundy:"#6b2e3a",
    violet:"#7a6c9d",
    latte:"#9b7b5a",
    silver:"#7a7a7a"
  };

  document.documentElement.style.setProperty(
    "--primary",
    colors[theme] || "#2f5d50"
  );
}

function renderLinks(links){

  const container = document.getElementById("links");
  container.innerHTML = "";

  links.forEach(link => {

    const icon = detectIcon(link.url);

    const a = document.createElement("a");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "link-btn";
    a.innerHTML = `${icon} ${link.label}`;

    container.appendChild(a);
  });
}

function detectIcon(url){

  if(url.includes("youtube") || url.includes("youtu.be") || url.includes("shorts") ||
     url.includes("vimeo") || url.includes("bilibili") ||
     url.includes("tiktok") || url.includes("douyin")){
    return "▶";
  }

  if(url.includes("maps") || url.includes("google.com/maps") ||
     url.includes("goo.gl/maps") || url.includes("maps.app.goo.gl")){
    return "📍";
  }

  if(url.includes("facebook")) return "f";
  if(url.includes("instagram")) return "◎";
  if(url.includes("line.me")) return "LINE";

  return "🔗";
}
