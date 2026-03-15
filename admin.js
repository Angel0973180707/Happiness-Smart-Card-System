/* =========================================================
 * HSC Admin Console v1.1
 * admin.js
 * COMPLETE OVERWRITE
 * Part 1 / 5
 * ---------------------------------------------------------
 * 目標：
 * 1) Lead 成為第一入口
 * 2) 中文化後台
 * 3) 客服工作流優化
 * 4) Lead -> Invite 流程修正
 * ======================================================= */

(() => {
  "use strict";

  const CONFIG = {
    VERSION: "HSC Admin Console v1.1",
    GAS_URL: "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec",
    HUB_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/",
    FORM_URL: "https://angel0973180707.github.io/Happiness-Smart-Card-System/form.html",
    FETCH_TIMEOUT_MS: 20000,
    PAGE_SIZE: 20
  };

  const state = {
    tab: "lead",
    loading: false,
    stats: null,

    leadQuery: "",
    inviteQuery: "",
    cardQuery: "",

    leads: [],
    invites: [],
    cards: [],

    currentLead: null,
    currentInvite: null,
    currentCard: null,

    leadPage: 1,
    invitePage: 1,
    cardPage: 1
  };

  const root = ensureRoot_();
  injectStyle_();
  renderShell_();
  bindShellEvents_();
  boot_();

  function ensureRoot_(){
    let el = document.getElementById("app");
    if (el) return el;
    el = document.createElement("div");
    el.id = "app";
    document.body.innerHTML = "";
    document.body.appendChild(el);
    return el;
  }

  function injectStyle_(){
    const css = `
      :root{
        --bg:#f6f2eb;
        --card:#fffdf9;
        --ink:#2f241c;
        --muted:#7d6f65;
        --line:rgba(47,36,28,.10);
        --pri:#b97a4e;
        --pri2:#8f5a36;
        --ok:#1f8f5f;
        --warn:#d97706;
        --bad:#c2410c;
        --shadow:0 12px 30px rgba(0,0,0,.08);
        --radius:18px;
      }
      *{ box-sizing:border-box; }
      html,body{
        margin:0;padding:0;
        background:var(--bg);
        color:var(--ink);
        font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
      }
      body{ padding:14px; }
      .hsc-admin{
        max-width:1180px;
        margin:0 auto;
      }
      .topbar{
        display:flex;
        flex-direction:column;
        gap:12px;
        margin-bottom:14px;
      }
      .brand{
        background:linear-gradient(135deg,#fffaf4,#fff);
        border:1px solid var(--line);
        border-radius:24px;
        padding:18px 18px 16px;
        box-shadow:var(--shadow);
      }
      .brand-title{
        font-size:24px;
        font-weight:800;
        letter-spacing:.02em;
      }
      .brand-sub{
        margin-top:6px;
        font-size:14px;
        color:var(--muted);
        line-height:1.6;
      }
      .top-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
      }
      .tabbar{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px;
        margin-bottom:14px;
      }
      .tab-btn{
        appearance:none;
        border:none;
        background:#fff;
        border-radius:18px;
        padding:14px 12px;
        font-size:16px;
        font-weight:800;
        color:var(--ink);
        border:1px solid var(--line);
        box-shadow:var(--shadow);
      }
      .tab-btn.active{
        background:linear-gradient(135deg,#c58d63,#a96a41);
        color:#fff;
        border-color:transparent;
      }
      .panel{
        display:none;
      }
      .panel.active{
        display:block;
      }
      .card{
        background:var(--card);
        border:1px solid var(--line);
        border-radius:22px;
        box-shadow:var(--shadow);
        padding:14px;
        margin-bottom:14px;
      }
      .card-title{
        font-size:20px;
        font-weight:900;
        margin-bottom:6px;
      }
      .card-sub{
        color:var(--muted);
        font-size:14px;
        line-height:1.6;
        margin-bottom:12px;
      }
      .search-row{
        display:grid;
        grid-template-columns:1fr auto auto;
        gap:10px;
      }
      .input,.select,.textarea{
        width:100%;
        border:1px solid var(--line);
        background:#fff;
        border-radius:14px;
        padding:12px 14px;
        font-size:16px;
        color:var(--ink);
        outline:none;
      }
      .textarea{
        min-height:110px;
        resize:vertical;
      }
      .btn{
        appearance:none;
        border:none;
        border-radius:14px;
        padding:12px 14px;
        font-size:15px;
        font-weight:800;
        cursor:pointer;
        background:#efe6dc;
        color:var(--ink);
      }
      .btn.primary{ background:linear-gradient(135deg,#c58d63,#a96a41); color:#fff; }
      .btn.soft{ background:#f5eee7; color:var(--pri2); }
      .btn.ok{ background:#e8f7f0; color:var(--ok); }
      .btn.warn{ background:#fff3df; color:var(--warn); }
      .btn.bad{ background:#fdebe6; color:var(--bad); }
      .btn.block{ width:100%; }
      .btn[disabled]{ opacity:.55; cursor:not-allowed; }
      .stats{
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:10px;
      }
      .stat{
        border:1px solid var(--line);
        background:#fff;
        border-radius:18px;
        padding:12px;
      }
      .stat-k{
        font-size:13px;
        color:var(--muted);
        margin-bottom:8px;
      }
      .stat-v{
        font-size:24px;
        font-weight:900;
      }
      .list{
        display:flex;
        flex-direction:column;
        gap:12px;
      }
      .item{
        border:1px solid var(--line);
        border-radius:18px;
        background:#fff;
        padding:12px;
      }
      .item-top{
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:flex-start;
        margin-bottom:10px;
      }
      .item-title{
        font-size:18px;
        font-weight:900;
        line-height:1.4;
      }
      .item-badges{
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        justify-content:flex-end;
      }
      .badge{
        display:inline-flex;
        align-items:center;
        gap:4px;
        padding:6px 10px;
        border-radius:999px;
        font-size:12px;
        font-weight:800;
        background:#f4ede6;
        color:#6b513e;
      }
      .badge.ok{ background:#e8f7f0; color:var(--ok); }
      .badge.warn{ background:#fff3df; color:var(--warn); }
      .badge.bad{ background:#fdebe6; color:var(--bad); }
      .grid{
        display:grid;
        grid-template-columns:repeat(2,1fr);
        gap:8px 12px;
        margin-bottom:12px;
      }
      .kv{
        background:#fcfaf7;
        border:1px solid var(--line);
        border-radius:12px;
        padding:10px;
        min-height:60px;
      }
      .kv-k{
        font-size:12px;
        color:var(--muted);
        margin-bottom:6px;
      }
      .kv-v{
        font-size:15px;
        font-weight:700;
        line-height:1.5;
        white-space:pre-wrap;
        word-break:break-word;
      }
      .item-actions{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .empty{
        text-align:center;
        color:var(--muted);
        padding:24px 10px;
        font-size:15px;
      }
      .footer-note{
        margin-top:10px;
        color:var(--muted);
        font-size:13px;
      }
      .drawer-mask{
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.34);
        display:none;
        z-index:90;
      }
      .drawer-mask.show{ display:block; }
      .drawer{
        position:fixed;
        right:0; top:0;
        width:min(92vw,520px);
        height:100vh;
        background:#fffdf9;
        box-shadow:-10px 0 30px rgba(0,0,0,.15);
        transform:translateX(110%);
        transition:transform .22s ease;
        z-index:100;
        display:flex;
        flex-direction:column;
      }
      .drawer.show{ transform:translateX(0); }
      .drawer-head{
        padding:16px;
        border-bottom:1px solid var(--line);
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
      }
      .drawer-title{
        font-size:20px;
        font-weight:900;
      }
      .drawer-body{
        padding:16px;
        overflow:auto;
      }
      .mono{
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      }
      .mt8{ margin-top:8px; }
      .mt12{ margin-top:12px; }
      .mt16{ margin-top:16px; }

      @media (max-width:900px){
        .stats{ grid-template-columns:repeat(2,1fr); }
      }
      @media (max-width:680px){
        body{ padding:10px; }
        .search-row{ grid-template-columns:1fr; }
        .grid{ grid-template-columns:1fr; }
        .tabbar{ grid-template-columns:1fr; }
        .brand-title{ font-size:22px; }
        .item-title{ font-size:17px; }
        .top-actions{ display:grid; grid-template-columns:1fr 1fr; }
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderShell_(){
    root.innerHTML = `
      <div class="hsc-admin">
        <div class="topbar">
          <div class="brand">
            <div class="brand-title">天使幸福智慧名片｜客服後台</div>
            <div class="brand-sub">
              ${CONFIG.VERSION}<br>
              第一入口是「Lead 申請清單」，客服收到客戶回報的申請編號後，直接搜尋、產生邀請碼、複製連結與話術。
            </div>
          </div>

          <div class="top-actions">
            <button class="btn soft" id="btnRefreshAll">重新整理</button>
            <button class="btn soft" id="btnGoHub">開名片館</button>
            <button class="btn soft" id="btnOpenForm">開申請表單</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">系統總覽</div>
          <div class="card-sub">讓客服先看目前工作量，下面直接切換到要處理的工作入口。</div>
          <div class="stats" id="statsBox">
            <div class="stat"><div class="stat-k">待處理申請</div><div class="stat-v">-</div></div>
            <div class="stat"><div class="stat-k">已發邀請碼</div><div class="stat-v">-</div></div>
            <div class="stat"><div class="stat-k">已成卡</div><div class="stat-v">-</div></div>
            <div class="stat"><div class="stat-k">總卡片數</div><div class="stat-v">-</div></div>
          </div>
        </div>

        <div class="tabbar">
          <button class="tab-btn active" data-tab="lead">Lead 申請清單</button>
          <button class="tab-btn" data-tab="invite">邀請碼清單</button>
          <button class="tab-btn" data-tab="card">卡片管理</button>
        </div>

        <section class="panel active" id="panel-lead"></section>
        <section class="panel" id="panel-invite"></section>
        <section class="panel" id="panel-card"></section>
      </div>

      <div class="drawer-mask" id="drawerMask"></div>
      <aside class="drawer" id="drawer">
        <div class="drawer-head">
          <div class="drawer-title" id="drawerTitle">詳細資料</div>
          <button class="btn" id="drawerClose">關閉</button>
        </div>
        <div class="drawer-body" id="drawerBody"></div>
      </aside>
    `;

    renderLeadPanel_();
    renderInvitePanel_();
    renderCardPanel_();
  }

  function bindShellEvents_(){
    root.addEventListener("click", onRootClick_);
    root.addEventListener("input", onRootInput_);
    document.getElementById("drawerClose").addEventListener("click", closeDrawer_);
    document.getElementById("drawerMask").addEventListener("click", closeDrawer_);
  }

  async function boot_(){
    await Promise.allSettled([
      loadStats_(),
      loadLeads_(),
      loadInvites_(),
      loadCards_()
    ]);
  }
/* =========================================================
   * Part 2 / 5
   * 畫面渲染：Lead / Invite / Card
   * ======================================================= */

  function renderLeadPanel_(){
    const el = document.getElementById("panel-lead");
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Lead 申請清單</div>
        <div class="card-sub">
          客服第一工作入口。請客戶先回報「申請編號 lead_id」，再由客服搜尋該筆資料，產生邀請碼並回覆客戶。
        </div>
        <div class="search-row">
          <input class="input" id="leadQuery" placeholder="可搜尋：申請編號、姓名、電話、Email、Line ID、備註、邀請碼、卡號、來源代理、推薦來源" value="${escapeHtml_(state.leadQuery)}">
          <button class="btn primary" id="btnSearchLead">搜尋 Lead</button>
          <button class="btn soft" id="btnReloadLead">重新載入</button>
        </div>
        <div class="footer-note">建議客服優先搜尋：申請編號 lead_id。</div>
      </div>

      <div class="card">
        <div class="card-title">待辦清單</div>
        <div class="card-sub">每一列直接完成：查看詳情 → 產生邀請碼 → 複製邀請碼／表單連結／客服話術。</div>
        <div class="list" id="leadList">${renderLeadItems_()}</div>
      </div>
    `;
  }

  function renderInvitePanel_(){
    const el = document.getElementById("panel-invite");
    el.innerHTML = `
      <div class="card">
        <div class="card-title">邀請碼清單</div>
        <div class="card-sub">
          這裡保留邀請碼管理，但不是第一入口。客服主要仍以 Lead 申請清單處理工作。
        </div>
        <div class="search-row">
          <input class="input" id="inviteQuery" placeholder="可搜尋：邀請碼、申請編號、來源代理、推薦來源、使用卡號" value="${escapeHtml_(state.inviteQuery)}">
          <button class="btn primary" id="btnSearchInvite">搜尋邀請碼</button>
          <button class="btn soft" id="btnReloadInvite">重新載入</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Invite 清單</div>
        <div class="list" id="inviteList">${renderInviteItems_()}</div>
      </div>
    `;
  }

  function renderCardPanel_(){
    const el = document.getElementById("panel-card");
    el.innerHTML = `
      <div class="card">
        <div class="card-title">卡片管理</div>
        <div class="card-sub">
          這裡用來查看卡片、開啟名片、產生更新頁、啟用／停用／延長期限。
        </div>
        <div class="search-row">
          <input class="input" id="cardQuery" placeholder="可搜尋：卡號、姓名、單位、職稱、電話、方案、來源代理" value="${escapeHtml_(state.cardQuery)}">
          <button class="btn primary" id="btnSearchCard">搜尋卡片</button>
          <button class="btn soft" id="btnReloadCard">重新載入</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">卡片列表</div>
        <div class="list" id="cardList">${renderCardItems_()}</div>
      </div>
    `;
  }

  function renderLeadItems_(){
    if (!state.leads.length) {
      return `<div class="empty">目前沒有符合條件的 Lead 資料。</div>`;
    }

    return state.leads.map(item => {
      const statusBadge = leadStatusBadge_(item.status);
      const canOpenCard = !!text_(item.card_id);
      const inviteCode = text_(item.invite_code);

      return `
        <div class="item">
          <div class="item-top">
            <div>
              <div class="item-title">
                ${escapeHtml_(text_(item.customer_name) || "未填姓名")}
              </div>
              <div class="mt8 mono">${escapeHtml_(text_(item.lead_id) || "-")}</div>
            </div>
            <div class="item-badges">
              ${statusBadge}
              ${inviteCode ? `<span class="badge ok">已產邀請碼</span>` : `<span class="badge warn">待產邀請碼</span>`}
              ${canOpenCard ? `<span class="badge ok">已成卡</span>` : ``}
            </div>
          </div>

          <div class="grid">
            ${kv_("申請編號", item.lead_id, true)}
            ${kv_("狀態", item.status)}
            ${kv_("姓名", item.customer_name)}
            ${kv_("電話", item.phone)}
            ${kv_("Email", item.email)}
            ${kv_("Line ID", item.line_id)}
            ${kv_("備註", item.note)}
            ${kv_("邀請碼", item.invite_code, true)}
            ${kv_("成卡卡號", item.card_id, true)}
            ${kv_("推薦來源", item.referrer)}
            ${kv_("來源代理", item.service_agent)}
            ${kv_("名單來源", item.source)}
            ${kv_("建立時間", formatDateTime_(item.created_at))}
            ${kv_("更新時間", formatDateTime_(item.updated_at))}
          </div>

          <div class="item-actions">
            <button class="btn soft" data-act="lead-detail" data-id="${escapeAttr_(item.lead_id)}">查看詳情</button>
            <button class="btn primary" data-act="lead-invite" data-id="${escapeAttr_(item.lead_id)}">產生邀請碼</button>
            <button class="btn" data-act="lead-copy-invite" data-id="${escapeAttr_(item.lead_id)}" ${inviteCode ? "" : "disabled"}>複製邀請碼</button>
            <button class="btn" data-act="lead-copy-form" data-id="${escapeAttr_(item.lead_id)}">複製表單連結</button>
            <button class="btn" data-act="lead-copy-script" data-id="${escapeAttr_(item.lead_id)}">複製客服話術</button>
            ${canOpenCard ? `<button class="btn ok" data-act="lead-open-card" data-card-id="${escapeAttr_(item.card_id)}">開名片</button>` : ``}
          </div>
        </div>
      `;
    }).join("");
  }

  function renderInviteItems_(){
    if (!state.invites.length) {
      return `<div class="empty">目前沒有符合條件的 Invite 資料。</div>`;
    }

    return state.invites.map(item => {
      return `
        <div class="item">
          <div class="item-top">
            <div>
              <div class="item-title mono">${escapeHtml_(text_(item.invite_code) || "-")}</div>
              <div class="mt8">${escapeHtml_(inviteStatusText_(item.status))}</div>
            </div>
            <div class="item-badges">
              ${inviteStatusBadge_(item.status)}
            </div>
          </div>

          <div class="grid">
            ${kv_("邀請碼", item.invite_code, true)}
            ${kv_("狀態", item.status)}
            ${kv_("對應申請編號", item.lead_id, true)}
            ${kv_("使用卡號", item.used_by_id || item.card_id, true)}
            ${kv_("推薦來源", item.referrer)}
            ${kv_("來源代理", item.service_agent)}
            ${kv_("名單來源", item.source)}
            ${kv_("建立時間", formatDateTime_(item.created_at))}
            ${kv_("使用時間", formatDateTime_(item.used_at))}
            ${kv_("到期時間", formatDateTime_(item.expired_at))}
          </div>

          <div class="item-actions">
            <button class="btn soft" data-act="invite-detail" data-id="${escapeAttr_(item.invite_code)}">查看</button>
            <button class="btn" data-act="invite-copy-code" data-id="${escapeAttr_(item.invite_code)}">複製邀請碼</button>
            <button class="btn" data-act="invite-copy-both" data-id="${escapeAttr_(item.invite_code)}">複製邀請碼＋表單連結</button>
            <button class="btn bad" data-act="invite-disable" data-id="${escapeAttr_(item.invite_code)}">停用邀請碼</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderCardItems_(){
    if (!state.cards.length) {
      return `<div class="empty">目前沒有符合條件的卡片資料。</div>`;
    }

    return state.cards.map(item => {
      return `
        <div class="item">
          <div class="item-top">
            <div>
              <div class="item-title">
                ${escapeHtml_(text_(item.name) || "未命名卡片")}
              </div>
              <div class="mt8 mono">${escapeHtml_(text_(item.id) || "-")}</div>
            </div>
            <div class="item-badges">
              ${cardStatusBadge_(item.status)}
              <span class="badge">${escapeHtml_(planText_(item.plan))}</span>
            </div>
          </div>

          <div class="grid">
            ${kv_("卡號", item.id, true)}
            ${kv_("姓名", item.name)}
            ${kv_("單位", item.unit)}
            ${kv_("職稱", item.title)}
            ${kv_("電話", item.phone)}
            ${kv_("方案", planText_(item.plan))}
            ${kv_("狀態", cardStatusText_(item.status))}
            ${kv_("來源代理", item.service_agent)}
            ${kv_("到期日", formatDateTime_(item.expires_at))}
            ${kv_("更新時間", formatDateTime_(item.updated_at))}
          </div>

          <div class="item-actions">
            <button class="btn soft" data-act="card-detail" data-id="${escapeAttr_(item.id)}">查看</button>
            <button class="btn ok" data-act="card-open" data-id="${escapeAttr_(item.id)}">開名片</button>
            <button class="btn ok" data-act="card-open-clean" data-id="${escapeAttr_(item.id)}">開乾淨名片</button>
            <button class="btn" data-act="card-copy-link" data-id="${escapeAttr_(item.id)}">複製名片連結</button>
            <button class="btn primary" data-act="card-gen-update" data-id="${escapeAttr_(item.id)}">產生更新頁</button>
            <button class="btn" data-act="card-copy-update" data-id="${escapeAttr_(item.id)}">複製更新頁</button>
            <button class="btn warn" data-act="card-activate" data-id="${escapeAttr_(item.id)}">啟用卡片</button>
            <button class="btn bad" data-act="card-inactivate" data-id="${escapeAttr_(item.id)}">停用卡片</button>
            <button class="btn" data-act="card-extend" data-id="${escapeAttr_(item.id)}">延長期限</button>
          </div>
        </div>
      `;
    }).join("");
  }
/* =========================================================
   * Part 3 / 5
   * 事件處理 / 工作流
   * ======================================================= */

  function onRootInput_(e){
    const t = e.target;
    if (!t) return;
    if (t.id === "leadQuery") state.leadQuery = t.value;
    if (t.id === "inviteQuery") state.inviteQuery = t.value;
    if (t.id === "cardQuery") state.cardQuery = t.value;
  }

  async function onRootClick_(e){
    const btn = e.target.closest("button");
    if (!btn) return;

    const tab = btn.dataset.tab;
    const act = btn.dataset.act;

    if (tab) {
      switchTab_(tab);
      return;
    }

    if (btn.id === "btnRefreshAll") {
      await Promise.allSettled([loadStats_(), loadLeads_(), loadInvites_(), loadCards_()]);
      toast_("已重新整理");
      return;
    }

    if (btn.id === "btnGoHub") {
      window.open(CONFIG.HUB_URL, "_blank");
      return;
    }

    if (btn.id === "btnOpenForm") {
      window.open(CONFIG.FORM_URL, "_blank");
      return;
    }

    if (btn.id === "btnSearchLead") return await loadLeads_();
    if (btn.id === "btnReloadLead") { state.leadQuery = ""; renderLeadPanel_(); return await loadLeads_(); }

    if (btn.id === "btnSearchInvite") return await loadInvites_();
    if (btn.id === "btnReloadInvite") { state.inviteQuery = ""; renderInvitePanel_(); return await loadInvites_(); }

    if (btn.id === "btnSearchCard") return await loadCards_();
    if (btn.id === "btnReloadCard") { state.cardQuery = ""; renderCardPanel_(); return await loadCards_(); }

    if (!act) return;

    try {
      if (act === "lead-detail") return await openLeadDetail_(btn.dataset.id);
      if (act === "lead-invite") return await createInviteFromLead_(btn.dataset.id);
      if (act === "lead-copy-invite") return copyLeadInvite_(btn.dataset.id);
      if (act === "lead-copy-form") return copyLeadFormLink_(btn.dataset.id);
      if (act === "lead-copy-script") return copyLeadScript_(btn.dataset.id);
      if (act === "lead-open-card") return openCard_(btn.dataset.cardId);

      if (act === "invite-detail") return await openInviteDetail_(btn.dataset.id);
      if (act === "invite-copy-code") return copyText_(btn.dataset.id, "已複製邀請碼");
      if (act === "invite-copy-both") return copyInviteBundle_(btn.dataset.id);
      if (act === "invite-disable") return await disableInvite_(btn.dataset.id);

      if (act === "card-detail") return await openCardDetail_(btn.dataset.id);
      if (act === "card-open") return openCard_(btn.dataset.id);
      if (act === "card-open-clean") return openCardClean_(btn.dataset.id);
      if (act === "card-copy-link") return copyCardLink_(btn.dataset.id);
      if (act === "card-gen-update") return await genCardUpdateLink_(btn.dataset.id);
      if (act === "card-copy-update") return copyCardUpdateLink_(btn.dataset.id);
      if (act === "card-activate") return await updateCardStatus_(btn.dataset.id, "active");
      if (act === "card-inactivate") return await updateCardStatus_(btn.dataset.id, "inactive");
      if (act === "card-extend") return await extendCard_(btn.dataset.id);
    } catch (err) {
      console.error(err);
      alert(err.message || "操作失敗");
    }
  }

  function switchTab_(tab){
    state.tab = tab;
    qsa_(".tab-btn").forEach(el => el.classList.toggle("active", el.dataset.tab === tab));
    qsa_(".panel").forEach(el => el.classList.remove("active"));
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.classList.add("active");
  }

  async function openLeadDetail_(leadId){
    const res = await api_("leadGet", { lead_id: leadId });
    const item = res?.item || res?.data || findLead_(leadId) || {};
    state.currentLead = item;

    openDrawer_("Lead 詳情", `
      ${detailSection_("Lead 基本資料", [
        ["申請編號", item.lead_id, true],
        ["姓名", item.customer_name],
        ["電話", item.phone],
        ["Email", item.email],
        ["Line ID", item.line_id],
        ["備註", item.note],
        ["狀態", item.status],
        ["邀請碼", item.invite_code, true],
        ["成卡卡號", item.card_id, true],
        ["推薦來源", item.referrer],
        ["來源代理", item.service_agent],
        ["代理類型", item.agent_type],
        ["名單來源", item.source],
        ["建立時間", formatDateTime_(item.created_at)],
        ["更新時間", formatDateTime_(item.updated_at)]
      ])}

      <div class="mt16 item-actions">
        <button class="btn primary" data-act="lead-invite" data-id="${escapeAttr_(item.lead_id || "")}">產生邀請碼</button>
        <button class="btn" data-act="lead-copy-form" data-id="${escapeAttr_(item.lead_id || "")}">複製表單連結</button>
        <button class="btn" data-act="lead-copy-script" data-id="${escapeAttr_(item.lead_id || "")}">複製客服話術</button>
      </div>
    `);
  }

  async function createInviteFromLead_(leadId){
    const lead = findLead_(leadId) || (await api_("leadGet", { lead_id: leadId }))?.item || {};
    if (!text_(lead.lead_id)) throw new Error("找不到該筆 Lead 資料");

    const payload = {
      lead_id: text_(lead.lead_id),
      referrer: text_(lead.referrer),
      service_agent: text_(lead.service_agent),
      agent_type: text_(lead.agent_type),
      source: text_(lead.source)
    };

    const inviteRes = await api_("inviteCreate", payload);
    const inviteCode =
      text_(inviteRes?.invite_code) ||
      text_(inviteRes?.item?.invite_code) ||
      text_(inviteRes?.data?.invite_code);

    if (!inviteCode) throw new Error("邀請碼產生失敗，未取得 invite_code");

    await api_("leadMarkInvited", {
      lead_id: lead.lead_id,
      invite_code: inviteCode,
      status: "invited"
    });

    toast_(`已產生邀請碼：${inviteCode}`);

    await Promise.allSettled([loadLeads_(), loadInvites_(), loadStats_()]);

    const refreshed = findLead_(lead.lead_id);
    if (refreshed && state.currentLead && text_(state.currentLead.lead_id) === text_(lead.lead_id)) {
      await openLeadDetail_(lead.lead_id);
    }
  }

  function copyLeadInvite_(leadId){
    const item = findLead_(leadId);
    const code = text_(item?.invite_code);
    if (!code) {
      alert("這筆 Lead 目前還沒有邀請碼，請先按「產生邀請碼」。");
      return;
    }
    copyText_(code, "已複製邀請碼");
  }

  function copyLeadFormLink_(leadId){
    const item = findLead_(leadId);
    const inviteCode = text_(item?.invite_code);
    const url = buildFormLink_(inviteCode);
    copyText_(url, "已複製表單連結");
  }

  function copyLeadScript_(leadId){
    const item = findLead_(leadId);
    if (!item) return;

    const inviteCode = text_(item.invite_code);
    const formLink = buildFormLink_(inviteCode);
    const script = [
      `${text_(item.customer_name) || "您好"}，您好～`,
      `這是您的智慧名片填寫入口。`,
      inviteCode ? `邀請碼：${inviteCode}` : `若您尚未收到邀請碼，請先告知客服您的申請編號：${text_(item.lead_id)}`,
      `填寫連結：${formLink}`,
      `申請編號：${text_(item.lead_id)}`,
      `若填寫過程中有問題，直接回覆客服即可。`
    ].join("\n");

    copyText_(script, "已複製客服話術");
  }

  async function openInviteDetail_(inviteCode){
    const res = await api_("inviteGet", { invite_code: inviteCode });
    const item = res?.item || res?.data || findInvite_(inviteCode) || {};
    state.currentInvite = item;

    openDrawer_("Invite 詳情", `
      ${detailSection_("邀請碼資料", [
        ["邀請碼", item.invite_code, true],
        ["狀態", item.status],
        ["申請編號", item.lead_id, true],
        ["使用卡號", item.used_by_id || item.card_id, true],
        ["推薦來源", item.referrer],
        ["來源代理", item.service_agent],
        ["代理類型", item.agent_type],
        ["名單來源", item.source],
        ["建立時間", formatDateTime_(item.created_at)],
        ["使用時間", formatDateTime_(item.used_at)],
        ["到期時間", formatDateTime_(item.expired_at)]
      ])}

      <div class="mt16 item-actions">
        <button class="btn" data-act="invite-copy-code" data-id="${escapeAttr_(item.invite_code || "")}">複製邀請碼</button>
        <button class="btn" data-act="invite-copy-both" data-id="${escapeAttr_(item.invite_code || "")}">複製邀請碼＋表單連結</button>
        <button class="btn bad" data-act="invite-disable" data-id="${escapeAttr_(item.invite_code || "")}">停用邀請碼</button>
      </div>
    `);
  }
/* =========================================================
   * Part 4 / 5
   * Invite / Card 操作、資料載入、API
   * ======================================================= */

  function copyInviteBundle_(inviteCode){
    const txt = `邀請碼：${inviteCode}\n填寫連結：${buildFormLink_(inviteCode)}`;
    copyText_(txt, "已複製邀請碼＋表單連結");
  }

  async function disableInvite_(inviteCode){
    const ok = confirm(`確定要停用邀請碼 ${inviteCode} 嗎？`);
    if (!ok) return;

    await api_("inviteDisable", { invite_code: inviteCode });
    toast_("邀請碼已停用");
    await Promise.allSettled([loadInvites_(), loadStats_()]);
    if (state.currentInvite && text_(state.currentInvite.invite_code) === text_(inviteCode)) {
      await openInviteDetail_(inviteCode);
    }
  }

  async function openCardDetail_(cardId){
    const res = await api_("adminCard", { id: cardId });
    const item = res?.item || res?.data || findCard_(cardId) || {};
    state.currentCard = item;

    openDrawer_("卡片詳情", `
      ${detailSection_("卡片資料", [
        ["卡號", item.id, true],
        ["姓名", item.name],
        ["單位", item.unit],
        ["職稱", item.title],
        ["電話", item.phone],
        ["Email", item.email],
        ["方案", planText_(item.plan)],
        ["狀態", cardStatusText_(item.status)],
        ["付款狀態", item.billing_status],
        ["推薦來源", item.referrer],
        ["來源代理", item.service_agent],
        ["名單來源", item.source],
        ["邀請碼", item.invite_code, true],
        ["到期日", formatDateTime_(item.expires_at)],
        ["建立時間", formatDateTime_(item.created_at)],
        ["更新時間", formatDateTime_(item.updated_at)]
      ])}

      <div class="mt16 item-actions">
        <button class="btn ok" data-act="card-open" data-id="${escapeAttr_(item.id || "")}">開名片</button>
        <button class="btn ok" data-act="card-open-clean" data-id="${escapeAttr_(item.id || "")}">開乾淨名片</button>
        <button class="btn" data-act="card-copy-link" data-id="${escapeAttr_(item.id || "")}">複製名片連結</button>
        <button class="btn primary" data-act="card-gen-update" data-id="${escapeAttr_(item.id || "")}">產生更新頁</button>
        <button class="btn" data-act="card-copy-update" data-id="${escapeAttr_(item.id || "")}">複製更新頁</button>
      </div>
    `);
  }

  function openCard_(cardId){
    window.open(`${CONFIG.HUB_URL}?id=${encodeURIComponent(cardId)}`, "_blank");
  }

  function openCardClean_(cardId){
    window.open(`${CONFIG.HUB_URL}?id=${encodeURIComponent(cardId)}&clean=1`, "_blank");
  }

  function copyCardLink_(cardId){
    copyText_(`${CONFIG.HUB_URL}?id=${encodeURIComponent(cardId)}`, "已複製名片連結");
  }

  async function genCardUpdateLink_(cardId){
    const res = await api_("adminCreateUpdateLink24h", { id: cardId });
    const link =
      text_(res?.update_link) ||
      text_(res?.item?.update_link) ||
      text_(res?.data?.update_link);

    if (!link) throw new Error("未取得更新頁連結");

    const card = findCard_(cardId);
    if (card) card.__update_link = link;
    if (state.currentCard && text_(state.currentCard.id) === text_(cardId)) {
      state.currentCard.__update_link = link;
      await openCardDetail_(cardId);
    }

    copyText_(link, "已產生並複製更新頁");
  }

  function copyCardUpdateLink_(cardId){
    const card = findCard_(cardId);
    const link = text_(card?.__update_link);
    if (!link) {
      alert("這張卡片尚未產生更新頁，請先按「產生更新頁」。");
      return;
    }
    copyText_(link, "已複製更新頁");
  }

  async function updateCardStatus_(cardId, status){
    const ok = confirm(`確定要將卡片 ${cardId} 設為 ${status === "active" ? "啟用" : "停用"} 嗎？`);
    if (!ok) return;

    await api_("adminUpdate", {
      id: cardId,
      status
    });

    toast_(status === "active" ? "卡片已啟用" : "卡片已停用");
    await Promise.allSettled([loadCards_(), loadStats_()]);
    if (state.currentCard && text_(state.currentCard.id) === text_(cardId)) {
      await openCardDetail_(cardId);
    }
  }

  async function extendCard_(cardId){
    const daysStr = prompt("請輸入要延長的天數", "365");
    if (daysStr == null) return;
    const days = Number(daysStr);
    if (!Number.isFinite(days) || days <= 0) {
      alert("請輸入正整數天數");
      return;
    }

    const card = findCard_(cardId) || (await api_("adminCard", { id: cardId }))?.item || {};
    const baseDate = text_(card.expires_at) ? new Date(card.expires_at) : new Date();
    const nextDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await api_("adminUpdate", {
      id: cardId,
      expires_at: nextDate.toISOString(),
      status: "active"
    });

    toast_(`已延長 ${days} 天`);
    await Promise.allSettled([loadCards_(), loadStats_()]);
    if (state.currentCard && text_(state.currentCard.id) === text_(cardId)) {
      await openCardDetail_(cardId);
    }
  }

  async function loadStats_(){
    try {
      const stats = await api_("adminStats", {});
      state.stats = stats || {};
      renderStats_();
    } catch (err) {
      console.warn("loadStats error", err);
    }
  }

  function renderStats_(){
    const box = document.getElementById("statsBox");
    if (!box) return;

    const s = state.stats || {};
    const pendingLeads =
      num_(s.pending_leads) ||
      num_(s.lead_pending) ||
      num_(s.leads_pending) ||
      0;

    const invitedLeads =
      num_(s.invited_leads) ||
      num_(s.lead_invited) ||
      0;

    const convertedLeads =
      num_(s.converted_leads) ||
      num_(s.lead_converted) ||
      0;

    const totalCards =
      num_(s.total_cards) ||
      num_(s.cards_total) ||
      0;

    box.innerHTML = `
      <div class="stat"><div class="stat-k">待處理申請</div><div class="stat-v">${pendingLeads}</div></div>
      <div class="stat"><div class="stat-k">已發邀請碼</div><div class="stat-v">${invitedLeads}</div></div>
      <div class="stat"><div class="stat-k">已成卡</div><div class="stat-v">${convertedLeads}</div></div>
      <div class="stat"><div class="stat-k">總卡片數</div><div class="stat-v">${totalCards}</div></div>
    `;
  }

  async function loadLeads_(){
    const params = {};
    if (text_(state.leadQuery)) params.q = text_(state.leadQuery);

    const res = await api_("leadList", params);
    state.leads = normalizeArrayResult_(res);
    renderLeadPanel_();
    switchTab_(state.tab);
  }

  async function loadInvites_(){
    const params = {};
    if (text_(state.inviteQuery)) params.q = text_(state.inviteQuery);

    const res = await api_("inviteList", params);
    state.invites = normalizeArrayResult_(res);
    renderInvitePanel_();
    switchTab_(state.tab);
  }

  async function loadCards_(){
    const params = {};
    if (text_(state.cardQuery)) params.q = text_(state.cardQuery);

    const res = await api_("adminFind", params);
    state.cards = normalizeArrayResult_(res);
    renderCardPanel_();
    switchTab_(state.tab);
  }

  async function api_(action, payload = {}){
    const url = CONFIG.GAS_URL;
    const body = JSON.stringify({ action, ...payload });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        signal: controller.signal
      });

      const txt = await res.text();
      let json = {};
      try {
        json = txt ? JSON.parse(txt) : {};
      } catch (err) {
        throw new Error(`API 回傳不是合法 JSON：${txt.slice(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`);
      }

      if (json && json.ok === false) {
        throw new Error(json.message || `${action} 執行失敗`);
      }

      return json;
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(`請求逾時：${action}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
/* =========================================================
   * Part 5 / 5
   * 工具函式
   * ======================================================= */

  function normalizeArrayResult_(res){
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.list)) return res.list;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.rows)) return res.rows;
    return [];
  }

  function findLead_(leadId){
    return state.leads.find(x => text_(x.lead_id) === text_(leadId));
  }

  function findInvite_(inviteCode){
    return state.invites.find(x => text_(x.invite_code) === text_(inviteCode));
  }

  function findCard_(cardId){
    return state.cards.find(x => text_(x.id) === text_(cardId));
  }

  function buildFormLink_(inviteCode){
    const url = new URL(CONFIG.FORM_URL);
    if (text_(inviteCode)) url.searchParams.set("invite", inviteCode);
    return url.toString();
  }

  function kv_(k, v, mono = false){
    return `
      <div class="kv">
        <div class="kv-k">${escapeHtml_(k)}</div>
        <div class="kv-v ${mono ? "mono" : ""}">${escapeHtml_(text_(v) || "-")}</div>
      </div>
    `;
  }

  function detailSection_(title, rows){
    return `
      <div class="card" style="margin:0;">
        <div class="card-title">${escapeHtml_(title)}</div>
        <div class="grid">
          ${rows.map(([k,v,mono]) => kv_(k, v, mono)).join("")}
        </div>
      </div>
    `;
  }

  function openDrawer_(title, html){
    document.getElementById("drawerTitle").textContent = title || "詳細資料";
    document.getElementById("drawerBody").innerHTML = html || "";
    document.getElementById("drawer").classList.add("show");
    document.getElementById("drawerMask").classList.add("show");
  }

  function closeDrawer_(){
    document.getElementById("drawer").classList.remove("show");
    document.getElementById("drawerMask").classList.remove("show");
  }

  function copyText_(text, msg = "已複製"){
    const v = String(text || "");
    navigator.clipboard.writeText(v).then(() => {
      toast_(msg);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = v;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast_(msg);
    });
  }

  function toast_(msg){
    const old = document.getElementById("hscToast");
    if (old) old.remove();

    const el = document.createElement("div");
    el.id = "hscToast";
    el.textContent = msg || "完成";
    Object.assign(el.style, {
      position: "fixed",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      background: "rgba(47,36,28,.92)",
      color: "#fff",
      padding: "12px 16px",
      borderRadius: "999px",
      zIndex: "9999",
      fontSize: "14px",
      fontWeight: "800",
      boxShadow: "0 8px 24px rgba(0,0,0,.18)"
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  function qsa_(sel){
    return Array.from(document.querySelectorAll(sel));
  }

  function text_(v){
    return v == null ? "" : String(v).trim();
  }

  function num_(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function formatDateTime_(v){
    const s = text_(v);
    if (!s) return "-";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  function planText_(v){
    const s = text_(v).toLowerCase();
    if (s === "free") return "自由款";
    if (s === "premium") return "精品款";
    return s || "-";
  }

  function leadStatusBadge_(status){
    const s = text_(status).toLowerCase();
    if (s === "converted") return `<span class="badge ok">已成卡</span>`;
    if (s === "invited") return `<span class="badge warn">已發邀請碼</span>`;
    if (s === "new" || s === "pending") return `<span class="badge">待處理</span>`;
    return `<span class="badge">${escapeHtml_(status || "未分類")}</span>`;
  }

  function inviteStatusText_(status){
    const s = text_(status).toLowerCase();
    if (s === "active") return "可使用";
    if (s === "used") return "已使用";
    if (s === "disabled") return "已停用";
    if (s === "expired") return "已過期";
    return status || "-";
  }

  function inviteStatusBadge_(status){
    const s = text_(status).toLowerCase();
    if (s === "active") return `<span class="badge ok">可使用</span>`;
    if (s === "used") return `<span class="badge">已使用</span>`;
    if (s === "disabled") return `<span class="badge bad">已停用</span>`;
    if (s === "expired") return `<span class="badge warn">已過期</span>`;
    return `<span class="badge">${escapeHtml_(status || "-")}</span>`;
  }

  function cardStatusText_(status){
    const s = text_(status).toLowerCase();
    if (s === "active") return "啟用中";
    if (s === "inactive") return "停用中";
    if (s === "expired") return "已到期";
    return status || "-";
  }

  function cardStatusBadge_(status){
    const s = text_(status).toLowerCase();
    if (s === "active") return `<span class="badge ok">啟用中</span>`;
    if (s === "inactive") return `<span class="badge bad">停用中</span>`;
    if (s === "expired") return `<span class="badge warn">已到期</span>`;
    return `<span class="badge">${escapeHtml_(status || "-")}</span>`;
  }

  function escapeHtml_(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function escapeAttr_(s){
    return escapeHtml_(s);
  }
})();