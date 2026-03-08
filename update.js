
/* =========================================
 * HSC Auto Update System v701.1
 * COMPLETE OVERWRITE
 *
 * Usage:
 * - 在各頁面底部引入 update.js
 * - 自動註冊 sw.js
 * - 自動檢查 version.json
 * - 發現新版本時跳提示
 * - 一鍵刷新到新版
 * ========================================= */

(() => {
  "use strict";

  const VERSION_URL = "./version.json";
  const SW_URL = "./sw.js?v=v701.1";
  const STORAGE_KEY = "HSC_APP_VERSION";
  const CHECK_INTERVAL = 60 * 1000;

  let currentVersion = null;
  let regRef = null;
  let checking = false;

  init();

  async function init() {
    try {
      const version = await fetchVersion();
      currentVersion = version.app || version.sw || "unknown";

      await registerSW();
      await checkUpdateSilently();

      setInterval(() => {
        checkUpdateSilently();
      }, CHECK_INTERVAL);
    } catch (err) {
      console.warn("[HSC update] init failed:", err);
    }
  }

  async function registerSW() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { updateViaCache: "none" });
      regRef = reg;

      if (reg.waiting) {
        showUpdatePrompt("系統已更新，請重新載入。", () => activateWaitingSW(reg));
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdatePrompt("偵測到新版本，請重新載入。", () => activateWaitingSW(reg));
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        location.reload();
      });
    } catch (err) {
      console.warn("[HSC update] SW register failed:", err);
    }
  }

  async function checkUpdateSilently() {
    if (checking) return;
    checking = true;

    try {
      const remote = await fetchVersion();
      const remoteVersion = remote.app || remote.sw || "unknown";
      const localVersion = localStorage.getItem(STORAGE_KEY) || currentVersion || "";

      if (!localVersion) {
        localStorage.setItem(STORAGE_KEY, remoteVersion);
        currentVersion = remoteVersion;
        checking = false;
        return;
      }

      if (remoteVersion !== localVersion) {
        localStorage.setItem(STORAGE_KEY, remoteVersion);
        currentVersion = remoteVersion;

        if (regRef) {
          await regRef.update();
          if (regRef.waiting) {
            showUpdatePrompt("系統已更新，請重新載入。", () => activateWaitingSW(regRef));
          } else {
            showUpdatePrompt("系統已更新，請重新載入。", () => hardReload());
          }
        } else {
          showUpdatePrompt("系統已更新，請重新載入。", () => hardReload());
        }
      } else {
        localStorage.setItem(STORAGE_KEY, remoteVersion);
      }
    } catch (err) {
      console.warn("[HSC update] version check failed:", err);
    }

    checking = false;
  }

  async function fetchVersion() {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`version.json load failed: ${res.status}`);
    }

    return res.json();
  }

  function activateWaitingSW(reg) {
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      hardReload();
    }
  }

  function hardReload() {
    const url = new URL(location.href);
    url.searchParams.set("_update", Date.now().toString());
    location.replace(url.toString());
  }

  function showUpdatePrompt(message, onConfirm) {
    if (document.getElementById("hsc-update-toast")) return;

    const toast = document.createElement("div");
    toast.id = "hsc-update-toast";
    toast.innerHTML = `
      <div class="hsc-update-box">
        <div class="hsc-update-title">系統更新通知</div>
        <div class="hsc-update-msg">${escapeHtml(message)}</div>
        <div class="hsc-update-actions">
          <button class="hsc-btn hsc-btn-soft" id="hsc-update-later">稍後</button>
          <button class="hsc-btn hsc-btn-primary" id="hsc-update-now">立即更新</button>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.id = "hsc-update-style";
    style.textContent = `
      #hsc-update-toast{
        position:fixed;
        left:16px;
        right:16px;
        bottom:18px;
        z-index:99999;
        display:flex;
        justify-content:center;
        pointer-events:none;
      }
      .hsc-update-box{
        width:min(520px,100%);
        background:rgba(32,28,25,.96);
        color:#fff;
        border-radius:18px;
        box-shadow:0 20px 50px rgba(0,0,0,.24);
        padding:16px;
        pointer-events:auto;
        border:1px solid rgba(255,255,255,.08);
        backdrop-filter:blur(10px);
      }
      .hsc-update-title{
        font-size:16px;
        font-weight:800;
        margin-bottom:6px;
      }
      .hsc-update-msg{
        font-size:14px;
        line-height:1.6;
        color:rgba(255,255,255,.88);
      }
      .hsc-update-actions{
        display:flex;
        gap:10px;
        margin-top:14px;
        justify-content:flex-end;
      }
      .hsc-btn{
        appearance:none;
        border:none;
        border-radius:12px;
        padding:11px 16px;
        font-size:14px;
        font-weight:800;
        cursor:pointer;
      }
      .hsc-btn-soft{
        background:rgba(255,255,255,.12);
        color:#fff;
      }
      .hsc-btn-primary{
        background:#f0b56b;
        color:#2c2118;
      }
    `;

    if (!document.getElementById("hsc-update-style")) {
      document.head.appendChild(style);
    }
    document.body.appendChild(toast);

    document.getElementById("hsc-update-later")?.addEventListener("click", () => {
      toast.remove();
    });

    document.getElementById("hsc-update-now")?.addEventListener("click", () => {
      toast.remove();
      onConfirm();
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();