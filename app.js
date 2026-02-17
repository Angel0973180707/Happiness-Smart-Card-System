/* Angel Smart Card Front v365 — Complete Overwrite
   - Fetch: GAS public fixed TW0001
   - UI: Free (layout/paper) + Premium (7 colors + GLASS)
   - Fix images: Drive link -> direct view
   - Product images: swipe carousel + click to full-screen
   - "Before fill form" modal: closable, never blocks forever
*/

(() => {
  // ====== CONFIG ======
  const CONFIG = {
    // ✅ 改成你的 GAS（你現在 v364 那支即可）
    GAS_URL: "https://script.google.com/macros/s/AKfycbwjEhMQJRT7CUte2jJd7BzZfU1cwl0PfyInnH3zvbYU8IMZt4TnbTwPZftssW0OGva8/exec",
    // ✅ 表單連結
    FORM_URL: "https://forms.gle/B13z5M2mwwv9ZKME8",
    // 固定讀這筆
    PUBLIC_ID: "TW0001",
    LS_KEY: "angel_smartcard_front_v365"
  };

  // ====== STATE ======
  const defaultState = {
    mode: "free",          // free | premium
    layout: "arch",        // arch | flat | spotlight
    paper: "cotton",       // cotton | grain | linen | watercolor
    theme: "inkgreen"      // 7 colors
  };

  const THEMES = [
    { key: "inkgreen", name: "深墨綠", color: ["#2a7a63","#0f4d3d"] },
    { key: "bluegray", name: "深藍灰", color: ["#4b6b88","#223648"] },
    { key: "winered", name: "酒紅棕", color: ["#7a2b3a","#3c1018"] },
    { key: "caramel", name: "焦糖暖棕", color: ["#b26b2a","#6b3412"] },
    { key: "morandiblue", name: "莫蘭迪藍", color: ["#4a7fa8","#24506d"] },
    { key: "mauve", name: "霧紫灰", color: ["#7a6f86","#3b3446"] },
    { key: "graphite", name: "深石墨黑", color: ["#111827","#000000"] }
  ];

  const PAPERS = [
    { key