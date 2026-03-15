/* ==========================================
 * HSC Admin Console v1 — admin.js v1.0
 * COMPLETE OVERWRITE
 *
 * Modules:
 * - Config / Boot
 * - API Helpers
 * - State
 * - Dashboard Module
 * - Card Manager Module
 * - Lead Manager Module
 * - Invite Manager Module
 * - Agent Manager Module
 * - Stats / Expire / CS Tools
 * - UI / Drawer / Modal / Pagination / Filters
 *
 * Notes:
 * - Align with GAS v720.2
 * - Admin auth uses admin_key
 * - Search action uses adminFind
 * - Update link action uses adminCreateUpdateLink24h
 * - Card status / expiry update uses adminUpdate
 * ========================================== */

(() => {
  "use strict";

  /* =========================
   * Config / Constants
   * ========================= */
  const VERSION = "1.0";
  const DEFAULT_GAS =
    "https://script.google.com/macros/s/AKfycbycjN-ooacgi-K-uGUTZeWUwfmjHFI_JeESbM2SEGnjFsk0TPBuUY71bW-1AYAMI-E/exec";
  const DEFAULT_BASE_URL =
    "https://angel0973180707.github.io/Happiness-Smart-Card-System/";
  const DEFAULT_TENANT = "angel";

  const LS = {
    GAS: "hsc_admin_console_gas_v1",
    TENANT: "hsc_admin_console_tenant_v1",
    ADMIN_KEY: "hsc_admin_console_admin_key_v1",
    ACTIVE_TAB: "hsc_admin_console_active_tab_v1",
    CARD_PAGE: "hsc_admin_console_card_page_v1",
    LEAD_PAGE: "hsc_admin_console_lead_page_v1",
    INVITE_PAGE: "hsc_admin_console_invite_page_v1",
    AGENT_PAGE: "hsc_admin_console_agent_page_v1"
  };

  const PAGE_SIZE = 20;
  const CARD_SEARCH_SEEDS = ["TW", "a", "0", "1", "2"];
  const STATUS_NEW = "new";

  const CARD_FIELDS = [
    "id","token","status","tenant","billing_status","created_at","updated_at",
    "activated_at","inactivated_at","expired_at","expires_at","remind_at","reminded_at","form_ts",
    "plan","color","style","paper","premium_color","name","unit","title","slogan",
    "services","experience","avatar_img","logo_img","photo1_img","photo2_img","photo3_img","photo4_img","photo5_img",
    "avatar_img_fast","logo_img_fast","photo1_img_fast","photo2_img_fast","photo3_img_fast","photo4_img_fast","photo5_img_fast",
    "wechat_id","line_url","line_oa","email","phone","address","video1","video2","video3","social1","social2","social3",
    "avatar_key","logo_key","photos_keys","invite_code","reserved_uid","reserved_at","confirmed_at","confirm_note",
    "website","uid","free_color","free_style","free_paper","line_id","avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url",
    "invite","cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3","wechat_poster",
    "view_count","last_view_at","referrer","service_agent","agent_type","is_agent","agent_id","source","renewal_owner",
    "update_token","update_token_created_at","update_token_expire","update_link_sent_at"
  ];

  const LEAD_FIELDS = [
    "lead_id","tenant","referrer","service_agent","agent_type","source","status","invite_code","card_id",
    "customer_name","phone","email","line_id","note","created_at","updated_at","sent_at","converted_at","last_editor"
  ];

  const INVITE_FIELDS = [
    "invite_code","tenant","plan","note","referrer","service_agent","agent_type","source","status",
    "created_at","expires_at","used_at","used_by_id","disabled_at","last_editor"
  ];

  const AGENT_FIELDS = [
    "agent_code","tenant","agent_key","name","title","phone","email","line_id","line_url","line_oa",
    "website","status","note","created_at","updated_at","last_editor"
  ];

  const state = {
    config: {
      gas: DEFAULT_GAS,
      tenant: DEFAULT_TENANT,
      adminKey: ""
    },

    ui: {
      activeTab: "dashboard",
      drawerOpen: false,
      drawerMode: "none"
    },

    dashboard: {
      cardsTotal: 0,
      cardsToday: 0,
      leadsTotal: 0,
      agentsTotal: 0,
      invitesTotal: 0,
      activeCards: 0,
      inactiveCards: 0,
      expiredCards: 0,
      exp30: [],
      exp7: [],
      expiredList: []
    },

    cards: {
      raw: [],
      filtered: [],
      page: 1,
      pageSize: PAGE_SIZE,
      keyword: "",
      filters: {
        status: "",
        plan: "",
        billing_status: "",
        source: "",
        service_agent: ""
      },
      selected: null
    },

    leads: {
      raw: [],
      filtered: [],
      page: 1,
      pageSize: PAGE_SIZE,
      keyword: "",
      filters: {
        status: "",
        source: "",
        service_agent: ""
      },
      selected: null
    },

    invites: {
      raw: [],
      filtered: [],
      page: 1,
      pageSize: PAGE_SIZE,
      keyword: "",
      filters: {
        status: "",
        source: "",
        service_agent: ""
      },
      selected: null
    },

    agents: {
      raw: [],
      filtered: [],
      page: 1,
      pageSize: PAGE_SIZE,
      keyword: "",
      selected: null,
      leads: [],
      cards: []
    },

    caches: {
      allCardsLoaded: false,
      updateLinks: {},
      detailById: {}
    }
  };

  const dom = {};

  /* =========================
   * Boot
   * ========================= */
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    hydrateConfig();
    bindLegacyDom();
    ensureEnhancedDom();
    bindEnhancedDom();
    applyVersionText();
    renderConfig();
    renderAllShells();
    setStatus(`HSC Admin Console v${VERSION}\n準備就緒。`, "ok");

    try {
      await pingSilently();
      await bootstrapDashboard();
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  function hydrateConfig() {
    state.config.gas = localStorage.getItem(LS.GAS) || DEFAULT_GAS;
    state.config.tenant = localStorage.getItem(LS.TENANT) || DEFAULT_TENANT;
    state.config.adminKey = localStorage.getItem(LS.ADMIN_KEY) || "";
    state.ui.activeTab = localStorage.getItem(LS.ACTIVE_TAB) || "dashboard";
    state.cards.page = num(localStorage.getItem(LS.CARD_PAGE), 1);
    state.leads.page = num(localStorage.getItem(LS.LEAD_PAGE), 1);
    state.invites.page = num(localStorage.getItem(LS.INVITE_PAGE), 1);
    state.agents.page = num(localStorage.getItem(LS.AGENT_PAGE), 1);
  }

  function persistConfig() {
    localStorage.setItem(LS.GAS, state.config.gas);
    localStorage.setItem(LS.TENANT, state.config.tenant);
    localStorage.setItem(LS.ADMIN_KEY, state.config.adminKey);
    localStorage.setItem(LS.ACTIVE_TAB, state.ui.activeTab);
    localStorage.setItem(LS.CARD_PAGE, String(state.cards.page));
    localStorage.setItem(LS.LEAD_PAGE, String(state.leads.page));
    localStorage.setItem(LS.INVITE_PAGE, String(state.invites.page));
    localStorage.setItem(LS.AGENT_PAGE, String(state.agents.page));
  }

  function bindLegacyDom() {
    dom.legacyWrap = document.querySelector(".wrap") || document.body;
    dom.statusBox =
      document.getElementById("statusBox") ||
      createFallbackStatusBox();
  }

  function createFallbackStatusBox() {
    const box = document.createElement("div");
    box.id = "statusBox";
    box.style.whiteSpace = "pre-wrap";
    box.style.padding = "12px";
    box.style.margin = "12px";
    box.style.border = "1px solid rgba(255,255,255,.15)";
    box.style.borderRadius = "12px";
    box.style.background = "rgba(255,255,255,.05)";
    box.style.color = "#fff";
    document.body.prepend(box);
    return box;
  }

  function ensureEnhancedDom() {
    let app = document.getElementById("hscAdminApp");
    if (!app) {
      app = document.createElement("div");
      app.id = "hscAdminApp";
      app.innerHTML = buildAppShell();
      if (dom.legacyWrap && dom.legacyWrap.appendChild) {
        dom.legacyWrap.appendChild(app);
      } else {
        document.body.appendChild(app);
      }
    }
    collectDom();
  }

  function collectDom() {
    dom.app = document.getElementById("hscAdminApp");

    dom.version = document.getElementById("adminVersion");
    dom.tabButtons = Array.from(document.querySelectorAll("[data-tab-target]"));
    dom.tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));

    dom.gasUrl = document.getElementById("cfgGasUrl");
    dom.tenant = document.getElementById("cfgTenant");
    dom.adminKey = document.getElementById("cfgAdminKey");
    dom.btnSaveConfig = document.getElementById("btnSaveConfig");
    dom.btnPing = document.getElementById("btnPing");
    dom.btnBootstrap = document.getElementById("btnBootstrap");

    dom.kpiCards = document.getElementById("kpiCards");
    dom.kpiCardsToday = document.getElementById("kpiCardsToday");
    dom.kpiLeads = document.getElementById("kpiLeads");
    dom.kpiAgents = document.getElementById("kpiAgents");
    dom.kpiExp30 = document.getElementById("kpiExp30");
    dom.kpiExp7 = document.getElementById("kpiExp7");
    dom.kpiExpired = document.getElementById("kpiExpired");
    dom.kpiInvites = document.getElementById("kpiInvites");

    dom.dashboardExp30 = document.getElementById("dashboardExp30");
    dom.dashboardExp7 = document.getElementById("dashboardExp7");
    dom.dashboardExpired = document.getElementById("dashboardExpired");

    dom.quickGoCards = document.getElementById("quickGoCards");
    dom.quickGoInvites = document.getElementById("quickGoInvites");
    dom.quickGoAgents = document.getElementById("quickGoAgents");
    dom.quickGoExpire = document.getElementById("quickGoExpire");
    dom.quickGoTools = document.getElementById("quickGoTools");

    dom.cardKeyword = document.getElementById("cardKeyword");
    dom.cardStatus = document.getElementById("cardStatus");
    dom.cardPlan = document.getElementById("cardPlan");
    dom.cardBilling = document.getElementById("cardBilling");
    dom.cardSource = document.getElementById("cardSource");
    dom.cardAgent = document.getElementById("cardAgent");
    dom.btnCardSearch = document.getElementById("btnCardSearch");
    dom.btnCardRefresh = document.getElementById("btnCardRefresh");
    dom.btnCardClear = document.getElementById("btnCardClear");
    dom.cardCount = document.getElementById("cardCount");
    dom.cardTable = document.getElementById("cardTable");
    dom.cardPagination = document.getElementById("cardPagination");

    dom.leadKeyword = document.getElementById("leadKeyword");
    dom.leadStatus = document.getElementById("leadStatus");
    dom.leadSource = document.getElementById("leadSource");
    dom.leadAgent = document.getElementById("leadAgent");
    dom.btnLeadRefresh = document.getElementById("btnLeadRefresh");
    dom.btnLeadClear = document.getElementById("btnLeadClear");
    dom.leadCount = document.getElementById("leadCount");
    dom.leadTable = document.getElementById("leadTable");
    dom.leadPagination = document.getElementById("leadPagination");

    dom.inviteKeyword = document.getElementById("inviteKeyword");
    dom.inviteStatus = document.getElementById("inviteStatus");
    dom.inviteSource = document.getElementById("inviteSource");
    dom.inviteAgent = document.getElementById("inviteAgent");
    dom.btnInviteRefresh = document.getElementById("btnInviteRefresh");
    dom.btnInviteClear = document.getElementById("btnInviteClear");
    dom.invitePlan = document.getElementById("invitePlan");
    dom.inviteDays = document.getElementById("inviteDays");
    dom.inviteCount = document.getElementById("inviteCount");
    dom.inviteNote = document.getElementById("inviteNote");
    dom.btnInviteCreate = document.getElementById("btnInviteCreate");
    dom.inviteCountLabel = document.getElementById("inviteCountLabel");
    dom.inviteTable = document.getElementById("inviteTable");
    dom.invitePagination = document.getElementById("invitePagination");

    dom.agentKeyword = document.getElementById("agentKeyword");
    dom.btnAgentRefresh = document.getElementById("btnAgentRefresh");
    dom.btnAgentClear = document.getElementById("btnAgentClear");
    dom.agentCount = document.getElementById("agentCount");
    dom.agentTable = document.getElementById("agentTable");
    dom.agentPagination = document.getElementById("agentPagination");
dom.statsCardsTotal = document.getElementById("statsCardsTotal");
    dom.statsCardsActive = document.getElementById("statsCardsActive");
    dom.statsCardsInactive = document.getElementById("statsCardsInactive");
    dom.statsCardsExpired = document.getElementById("statsCardsExpired");
    dom.statsCardsToday = document.getElementById("statsCardsToday");
    dom.statsLeadsTotal = document.getElementById("statsLeadsTotal");
    dom.statsInvitesTotal = document.getElementById("statsInvitesTotal");
    dom.statsAgentsTotal = document.getElementById("statsAgentsTotal");

    dom.exp30Tools = document.getElementById("exp30Tools");
    dom.exp7Tools = document.getElementById("exp7Tools");
    dom.expiredTools = document.getElementById("expiredTools");

    dom.csCardId = document.getElementById("csCardId");
    dom.csRef = document.getElementById("csRef");
    dom.csInviteCode = document.getElementById("csInviteCode");
    dom.btnOpenCard = document.getElementById("btnOpenCard");
    dom.btnOpenCleanCard = document.getElementById("btnOpenCleanCard");
    dom.btnOpenUpdateLink = document.getElementById("btnOpenUpdateLink");
    dom.btnCopyFormLink = document.getElementById("btnCopyFormLink");
    dom.btnCopyInviteMsg = document.getElementById("btnCopyInviteMsg");
    dom.btnCopyCsTemplate = document.getElementById("btnCopyCsTemplate");
    dom.btnCopyHome = document.getElementById("btnCopyHome");
    dom.btnCopyHomeRef = document.getElementById("btnCopyHomeRef");

    dom.drawer = document.getElementById("detailDrawer");
    dom.drawerTitle = document.getElementById("drawerTitle");
    dom.drawerBody = document.getElementById("drawerBody");
    dom.btnDrawerClose = document.getElementById("btnDrawerClose");
  }

  function buildAppShell() {
    return `
      <section class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">HSC Admin Console v1</h2>
            <p class="panel-sub">正式後台骨架｜Dashboard / 卡片 / 邀請碼 / 代理 / 統計工具</p>
          </div>
          <div id="adminVersion" class="count-badge">v${esc(VERSION)}</div>
        </div>

        <div class="panel-body">
          <div class="row">
            <div class="field lg">
              <label for="cfgGasUrl">GAS Exec URL</label>
              <input id="cfgGasUrl" type="text" />
            </div>
            <div class="field md">
              <label for="cfgTenant">Tenant</label>
              <input id="cfgTenant" type="text" />
            </div>
            <div class="field md">
              <label for="cfgAdminKey">Admin Key</label>
              <input id="cfgAdminKey" type="password" />
            </div>
          </div>

          <div class="row btns">
            <button id="btnSaveConfig" class="primary">儲存設定</button>
            <button id="btnPing">測試連線</button>
            <button id="btnBootstrap" class="ok">重新讀取後台資料</button>
          </div>

          <div class="row" style="margin-top:16px;">
            <div class="btns">
              <button data-tab-target="dashboard" class="primary">Dashboard</button>
              <button data-tab-target="cards">卡片管理</button>
              <button data-tab-target="invites">邀請碼管理</button>
              <button data-tab-target="agents">代理管理</button>
              <button data-tab-target="stats">統計 / 到期 / 客服工具</button>
            </div>
          </div>
        </div>
      </section>

      <section data-tab-panel="dashboard" class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Dashboard</h2>
            <p class="panel-sub">總覽與快速入口</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="stats">
            <div class="stat"><div class="stat-label">卡片總數</div><div id="kpiCards" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">今日新增</div><div id="kpiCardsToday" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">Lead 申請數</div><div id="kpiLeads" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">代理數</div><div id="kpiAgents" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">30 天內到期</div><div id="kpiExp30" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">7 天內到期</div><div id="kpiExp7" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">已過期</div><div id="kpiExpired" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">Invite 總數</div><div id="kpiInvites" class="stat-value">—</div></div>
          </div>

          <div class="row btns" style="margin-top:16px;">
            <button id="quickGoCards" class="primary">前往卡片管理</button>
            <button id="quickGoInvites">前往邀請碼管理</button>
            <button id="quickGoAgents">前往代理管理</button>
            <button id="quickGoExpire" class="warn">前往到期提醒</button>
            <button id="quickGoTools">前往客服工具</button>
          </div>

          <div class="grid" style="margin-top:16px;">
            <section class="panel">
              <div class="panel-head"><div><h3 class="panel-title">30 天內到期</h3></div></div>
              <div class="panel-body"><div id="dashboardExp30" class="result-list"></div></div>
            </section>
            <section class="panel">
              <div class="panel-head"><div><h3 class="panel-title">7 天內到期</h3></div></div>
              <div class="panel-body"><div id="dashboardExp7" class="result-list"></div></div>
            </section>
          </div>

          <section class="panel" style="margin-top:16px;">
            <div class="panel-head"><div><h3 class="panel-title">已過期</h3></div></div>
            <div class="panel-body"><div id="dashboardExpired" class="result-list"></div></div>
          </section>
        </div>
      </section>

      <section data-tab-panel="cards" class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">卡片管理</h2>
            <p class="panel-sub">搜尋、篩選、分頁、詳情與快速操作</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="field lg"><label for="cardKeyword">搜尋</label><input id="cardKeyword" type="text" placeholder="id / name / phone / unit / invite_code" /></div>
            <div class="field sm"><label for="cardStatus">status</label><input id="cardStatus" type="text" placeholder="active / inactive / reserved" /></div>
            <div class="field sm"><label for="cardPlan">plan</label><input id="cardPlan" type="text" placeholder="free / premium" /></div>
            <div class="field sm"><label for="cardBilling">billing_status</label><input id="cardBilling" type="text" placeholder="paid / unpaid" /></div>
          </div>
          <div class="row">
            <div class="field md"><label for="cardSource">source</label><input id="cardSource" type="text" placeholder="form / invite / agent_form" /></div>
            <div class="field md"><label for="cardAgent">service_agent</label><input id="cardAgent" type="text" placeholder="AG001" /></div>
          </div>
          <div class="row btns">
            <button id="btnCardSearch" class="primary">套用篩選</button>
            <button id="btnCardRefresh">重新讀卡片</button>
            <button id="btnCardClear" class="ghost">清空篩選</button>
          </div>
          <div class="result-head" style="margin-top:16px;">
            <div class="panel-sub">目前卡片筆數</div>
            <div id="cardCount" class="count-badge">0 筆</div>
          </div>
          <div id="cardTable" class="result-list"></div>
          <div id="cardPagination" class="row btns" style="margin-top:12px;"></div>
        </div>
      </section>

      <section data-tab-panel="invites" class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">邀請碼管理</h2>
            <p class="panel-sub">Lead 申請清單 + Invite 清單</p>
          </div>
        </div>
        <div class="panel-body">
          <section class="panel">
            <div class="panel-head"><div><h3 class="panel-title">申請清單（Lead）</h3></div></div>
            <div class="panel-body">
              <div class="row">
                <div class="field lg"><label for="leadKeyword">搜尋 Lead</label><input id="leadKeyword" type="text" placeholder="lead_id / customer_name / phone / email / note" /></div>
                <div class="field sm"><label for="leadStatus">status</label><input id="leadStatus" type="text" placeholder="new / invited / converted" /></div>
                <div class="field sm"><label for="leadSource">source</label><input id="leadSource" type="text" placeholder="form / agent_form" /></div>
                <div class="field sm"><label for="leadAgent">service_agent</label><input id="leadAgent" type="text" placeholder="AG001" /></div>
              </div>
              <div class="row btns">
                <button id="btnLeadRefresh" class="primary">重新讀 Lead</button>
                <button id="btnLeadClear" class="ghost">清空篩選</button>
              </div>
              <div class="result-head" style="margin-top:16px;">
                <div class="panel-sub">Lead 筆數</div>
                <div id="leadCount" class="count-badge">0 筆</div>
              </div>
              <div id="leadTable" class="result-list"></div>
              <div id="leadPagination" class="row btns" style="margin-top:12px;"></div>
            </div>
          </section>

          <section class="panel" style="margin-top:16px;">
            <div class="panel-head"><div><h3 class="panel-title">邀請碼清單（Invite）</h3></div></div>
            <div class="panel-body">
              <div class="row">
                <div class="field sm"><label for="invitePlan">建立方案</label><select id="invitePlan"><option value="free">free</option><option value="premium">premium</option></select></div>
                <div class="field sm"><label for="inviteDays">有效天數</label><input id="inviteDays" type="number" min="1" value="7" /></div>
                <div class="field sm"><label for="inviteCount">數量</label><input id="inviteCount" type="number" min="1" value="1" /></div>
                <div class="field lg"><label for="inviteNote">備註</label><input id="inviteNote" type="text" placeholder="客服註記" /></div>
              </div>
              <div class="row btns">
                <button id="btnInviteCreate" class="warn">產生邀請碼</button>
              </div>

              <div class="row" style="margin-top:16px;">
                <div class="field lg"><label for="inviteKeyword">搜尋 Invite</label><input id="inviteKeyword" type="text" placeholder="invite_code / used_by_id / note" /></div>
                <div class="field sm"><label for="inviteStatus">status</label><input id="inviteStatus" type="text" placeholder="open / used / disabled / expired" /></div>
                <div class="field sm"><label for="inviteSource">source</label><input id="inviteSource" type="text" placeholder="admin_invite" /></div>
                <div class="field sm"><label for="inviteAgent">service_agent</label><input id="inviteAgent" type="text" placeholder="AG001" /></div>
              </div>
              <div class="row btns">
                <button id="btnInviteRefresh" class="primary">重新讀 Invite</button>
                <button id="btnInviteClear" class="ghost">清空篩選</button>
              </div>
              <div class="result-head" style="margin-top:16px;">
                <div class="panel-sub">Invite 筆數</div>
                <div id="inviteCountLabel" class="count-badge">0 筆</div>
              </div>
              <div id="inviteTable" class="result-list"></div>
              <div id="invitePagination" class="row btns" style="margin-top:12px;"></div>
            </div>
          </section>
        </div>
      </section>
<section data-tab-panel="agents" class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">代理管理</h2>
            <p class="panel-sub">代理列表、基本資料、leads / cards 追蹤</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="field lg"><label for="agentKeyword">搜尋代理</label><input id="agentKeyword" type="text" placeholder="agent_code / name / phone / email" /></div>
          </div>
          <div class="row btns">
            <button id="btnAgentRefresh" class="primary">重新讀代理</button>
            <button id="btnAgentClear" class="ghost">清空篩選</button>
          </div>
          <div class="result-head" style="margin-top:16px;">
            <div class="panel-sub">代理筆數</div>
            <div id="agentCount" class="count-badge">0 筆</div>
          </div>
          <div id="agentTable" class="result-list"></div>
          <div id="agentPagination" class="row btns" style="margin-top:12px;"></div>
        </div>
      </section>

      <section data-tab-panel="stats" class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">系統統計 / 到期提醒 / 客服工具</h2>
            <p class="panel-sub">客服快速複製與到期操作</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="stats">
            <div class="stat"><div class="stat-label">card 總數</div><div id="statsCardsTotal" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">active</div><div id="statsCardsActive" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">inactive</div><div id="statsCardsInactive" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">expired</div><div id="statsCardsExpired" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">今日新增</div><div id="statsCardsToday" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">lead 總數</div><div id="statsLeadsTotal" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">invite 總數</div><div id="statsInvitesTotal" class="stat-value">—</div></div>
            <div class="stat"><div class="stat-label">agent 總數</div><div id="statsAgentsTotal" class="stat-value">—</div></div>
          </div>

          <div class="grid" style="margin-top:16px;">
            <section class="panel">
              <div class="panel-head"><div><h3 class="panel-title">30 天內到期</h3></div></div>
              <div class="panel-body"><div id="exp30Tools" class="result-list"></div></div>
            </section>
            <section class="panel">
              <div class="panel-head"><div><h3 class="panel-title">7 天內到期</h3></div></div>
              <div class="panel-body"><div id="exp7Tools" class="result-list"></div></div>
            </section>
          </div>

          <section class="panel" style="margin-top:16px;">
            <div class="panel-head"><div><h3 class="panel-title">已過期</h3></div></div>
            <div class="panel-body"><div id="expiredTools" class="result-list"></div></div>
          </section>

          <section class="panel" style="margin-top:16px;">
            <div class="panel-head"><div><h3 class="panel-title">客服工具</h3></div></div>
            <div class="panel-body">
              <div class="row">
                <div class="field md"><label for="csCardId">卡號</label><input id="csCardId" type="text" placeholder="TW0001" /></div>
                <div class="field md"><label for="csRef">ref / agent</label><input id="csRef" type="text" placeholder="AG001" /></div>
                <div class="field md"><label for="csInviteCode">invite code</label><input id="csInviteCode" type="text" placeholder="INV..." /></div>
              </div>
              <div class="row btns">
                <button id="btnOpenCard" class="primary">一鍵開名片</button>
                <button id="btnOpenCleanCard">一鍵開乾淨名片</button>
                <button id="btnOpenUpdateLink">一鍵開更新頁</button>
                <button id="btnCopyFormLink" class="warn">一鍵複製表單連結</button>
                <button id="btnCopyInviteMsg" class="warn">一鍵複製邀請碼文字</button>
                <button id="btnCopyCsTemplate">一鍵複製客服話術模板</button>
                <button id="btnCopyHome">一鍵複製首頁門面網址</button>
                <button id="btnCopyHomeRef">複製帶 ref 首頁網址</button>
              </div>
            </div>
          </section>
        </div>
      </section>

      <div id="detailDrawer" class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <div>
            <h2 id="drawerTitle" class="panel-title">詳細資料</h2>
            <p class="panel-sub">點列表查看詳情與操作</p>
          </div>
          <div class="btns">
            <button id="btnDrawerClose" class="ghost">關閉</button>
          </div>
        </div>
        <div id="drawerBody" class="panel-body">
          <div class="empty">尚未選取資料。</div>
        </div>
      </div>
    `;
  }

  function bindEnhancedDom() {
    dom.btnSaveConfig?.addEventListener("click", onSaveConfig);
    dom.btnPing?.addEventListener("click", onPing);
    dom.btnBootstrap?.addEventListener("click", bootstrapDashboard);

    dom.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tabTarget || "dashboard"));
    });

    dom.quickGoCards?.addEventListener("click", () => switchTab("cards"));
    dom.quickGoInvites?.addEventListener("click", () => switchTab("invites"));
    dom.quickGoAgents?.addEventListener("click", () => switchTab("agents"));
    dom.quickGoExpire?.addEventListener("click", () => switchTab("stats"));
    dom.quickGoTools?.addEventListener("click", () => switchTab("stats"));

    dom.btnCardSearch?.addEventListener("click", applyCardFilters);
    dom.btnCardRefresh?.addEventListener("click", refreshCards);
    dom.btnCardClear?.addEventListener("click", clearCardFilters);

    dom.btnLeadRefresh?.addEventListener("click", refreshLeads);
    dom.btnLeadClear?.addEventListener("click", clearLeadFilters);

    dom.btnInviteRefresh?.addEventListener("click", refreshInvites);
    dom.btnInviteClear?.addEventListener("click", clearInviteFilters);
    dom.btnInviteCreate?.addEventListener("click", createInviteBatch);

    dom.btnAgentRefresh?.addEventListener("click", refreshAgents);
    dom.btnAgentClear?.addEventListener("click", clearAgentFilters);

    dom.btnDrawerClose?.addEventListener("click", closeDrawer);

    dom.btnOpenCard?.addEventListener("click", () => {
      const id = val(dom.csCardId);
      if (!id) return setStatus("請先輸入卡號。", "warn");
      window.open(buildCardLink(id), "_blank", "noopener");
    });

    dom.btnOpenCleanCard?.addEventListener("click", () => {
      const id = val(dom.csCardId);
      if (!id) return setStatus("請先輸入卡號。", "warn");
      window.open(buildCardCleanLink(id), "_blank", "noopener");
    });

    dom.btnOpenUpdateLink?.addEventListener("click", async () => {
      const id = val(dom.csCardId);
      if (!id) return setStatus("請先輸入卡號。", "warn");
      const link = await getUpdateLink(id, true);
      window.open(link, "_blank", "noopener");
    });

    dom.btnCopyFormLink?.addEventListener("click", async () => {
      const code = val(dom.csInviteCode);
      if (!code) return setStatus("請先輸入 invite code。", "warn");
      const link = buildFormLink(code);
      await copyText(link);
      setStatus(`已複製表單連結\n${link}`, "ok");
    });

    dom.btnCopyInviteMsg?.addEventListener("click", async () => {
      const code = val(dom.csInviteCode);
      if (!code) return setStatus("請先輸入 invite code。", "warn");
      const text = buildInviteMessage(code);
      await copyText(text);
      setStatus("已複製邀請碼文字。", "ok");
    });

    dom.btnCopyCsTemplate?.addEventListener("click", async () => {
      const text = buildCustomerServiceTemplate({
        id: val(dom.csCardId),
        inviteCode: val(dom.csInviteCode)
      });
      await copyText(text);
      setStatus("已複製客服話術模板。", "ok");
    });

    dom.btnCopyHome?.addEventListener("click", async () => {
      const link = buildFacadeLink();
      await copyText(link);
      setStatus(`已複製首頁門面網址\n${link}`, "ok");
    });

    dom.btnCopyHomeRef?.addEventListener("click", async () => {
      const ref = val(dom.csRef);
      if (!ref) return setStatus("請先輸入 ref。", "warn");
      const link = buildFacadeLink(ref);
      await copyText(link);
      setStatus(`已複製帶 ref 首頁網址\n${link}`, "ok");
    });

    dom.cardTable?.addEventListener("click", onCardTableClick);
    dom.leadTable?.addEventListener("click", onLeadTableClick);
    dom.inviteTable?.addEventListener("click", onInviteTableClick);
    dom.agentTable?.addEventListener("click", onAgentTableClick);
    dom.dashboardExp30?.addEventListener("click", onExpireListClick);
    dom.dashboardExp7?.addEventListener("click", onExpireListClick);
    dom.dashboardExpired?.addEventListener("click", onExpireListClick);
    dom.exp30Tools?.addEventListener("click", onExpireListClick);
    dom.exp7Tools?.addEventListener("click", onExpireListClick);
    dom.expiredTools?.addEventListener("click", onExpireListClick);
  }

  function applyVersionText() {
    if (dom.version) dom.version.textContent = `admin.js v${VERSION}`;
  }

  function renderConfig() {
    if (dom.gasUrl) dom.gasUrl.value = state.config.gas;
    if (dom.tenant) dom.tenant.value = state.config.tenant;
    if (dom.adminKey) dom.adminKey.value = state.config.adminKey;
  }

  async function onSaveConfig() {
    state.config.gas = val(dom.gasUrl) || DEFAULT_GAS;
    state.config.tenant = val(dom.tenant) || DEFAULT_TENANT;
    state.config.adminKey = val(dom.adminKey);
    persistConfig();
    setStatus("設定已儲存。", "ok");
  }

  async function onPing() {
    try {
      await syncConfigFromUi();
      setStatus("測試連線中…", "warn");
      const res = await api("ping", {}, { admin: false });
      setStatus(`連線成功\nversion=${res.version || ""}\nnow=${res.now || ""}`, "ok");
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  async function pingSilently() {
    await syncConfigFromUi();
    await api("ping", {}, { admin: false });
  }

  async function syncConfigFromUi() {
    state.config.gas = val(dom.gasUrl) || state.config.gas || DEFAULT_GAS;
    state.config.tenant = val(dom.tenant) || state.config.tenant || DEFAULT_TENANT;
    state.config.adminKey = val(dom.adminKey) || state.config.adminKey || "";
    persistConfig();
  }

  function switchTab(tab) {
    state.ui.activeTab = tab;
    persistConfig();
    dom.tabButtons.forEach((btn) => {
      const active = btn.dataset.tabTarget === tab;
      btn.classList.toggle("primary", active);
    });
    dom.tabPanels.forEach((panel) => {
      panel.style.display = panel.dataset.tabPanel === tab ? "" : "none";
    });
  }
async function bootstrapDashboard() {
    await syncConfigFromUi();
    switchTab(state.ui.activeTab || "dashboard");
    setStatus("讀取後台資料中…", "warn");

    await Promise.all([
      refreshCards(true),
      refreshLeads(true),
      refreshInvites(true),
      refreshAgents(true)
    ]);

    computeDashboard();
    renderDashboard();
    renderStatsPanel();
    setStatus("後台資料已更新。", "ok");
  }

  /* =========================
   * API Helpers
   * ========================= */
  async function api(action, params = {}, options = {}) {
    const admin = options.admin !== false;
    const gas = state.config.gas || DEFAULT_GAS;
    const tenant = state.config.tenant || DEFAULT_TENANT;
    const adminKey = state.config.adminKey || "";

    if (!gas) throw new Error("GAS URL 未填。");

    const qs = new URLSearchParams();
    qs.set("action", action);
    if (!("tenant" in params) && tenant) qs.set("tenant", tenant);

    Object.keys(params || {}).forEach((k) => {
      const v = params[k];
      if (v == null || v === "") return;
      qs.set(k, String(v));
    });

    if (admin) {
      if (!adminKey) throw new Error("Admin Key 未填。");
      qs.set("admin_key", adminKey);
    }

    const url = `${gas}?${qs.toString()}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch (_err) {
      throw new Error(`JSON 解析失敗\n${text.slice(0, 280)}`);
    }

    if (!json.ok) throw new Error(json.error || "API 失敗");
    return json.data;
  }

  /* =========================
   * Card Manager
   * ========================= */
  async function refreshCards(silent = false) {
    await syncConfigFromUi();
    if (!silent) setStatus("讀取卡片中…", "warn");

    const items = await fetchAllCards();
    state.cards.raw = items;
    state.caches.allCardsLoaded = true;
    applyCardFilters();

    if (!silent) setStatus(`卡片已更新，共 ${items.length} 筆。`, "ok");
  }

  async function fetchAllCards() {
    const buckets = [];
    for (const q of CARD_SEARCH_SEEDS) {
      try {
        const res = await api("adminFind", { keyword: q });
        const items = normalizeCardItems(res.items || []);
        buckets.push(...items);
      } catch (_) {}
    }

    const map = new Map();
    buckets.forEach((item) => {
      if (!item.id) return;
      if (!map.has(item.id)) map.set(item.id, item);
      else map.set(item.id, { ...map.get(item.id), ...item });
    });

    const ids = Array.from(map.keys());
    const detailed = [];
    for (const id of ids) {
      try {
        const item = await fetchCardDetail(id);
        detailed.push(item);
      } catch (_) {
        detailed.push(map.get(id));
      }
    }

    return detailed.sort((a, b) => sortByDateDesc(a.updated_at, b.updated_at));
  }

  async function fetchCardDetail(id) {
    if (state.caches.detailById[id]) return state.caches.detailById[id];
    const item = normalizeCardItem(await api("adminCard", { id }));
    state.caches.detailById[id] = item;
    return item;
  }

  function applyCardFilters() {
    state.cards.keyword = val(dom.cardKeyword).toLowerCase();
    state.cards.filters.status = val(dom.cardStatus).toLowerCase();
    state.cards.filters.plan = val(dom.cardPlan).toLowerCase();
    state.cards.filters.billing_status = val(dom.cardBilling).toLowerCase();
    state.cards.filters.source = val(dom.cardSource).toLowerCase();
    state.cards.filters.service_agent = val(dom.cardAgent);

    state.cards.filtered = state.cards.raw.filter((x) => {
      if (state.cards.filters.status && low(x.status) !== state.cards.filters.status) return false;
      if (state.cards.filters.plan && low(x.plan) !== state.cards.filters.plan) return false;
      if (state.cards.filters.billing_status && low(x.billing_status) !== state.cards.filters.billing_status) return false;
      if (state.cards.filters.source && low(x.source) !== state.cards.filters.source) return false;
      if (state.cards.filters.service_agent && text(x.service_agent) !== state.cards.filters.service_agent) return false;

      if (state.cards.keyword) {
        const hay = [
          x.id, x.name, x.phone, x.unit, x.invite_code, x.title, x.service_agent,
          x.referrer, x.source, x.email
        ].join(" ").toLowerCase();
        if (!hay.includes(state.cards.keyword)) return false;
      }
      return true;
    });

    state.cards.page = 1;
    persistConfig();
    renderCards();
  }

  function clearCardFilters() {
    if (dom.cardKeyword) dom.cardKeyword.value = "";
    if (dom.cardStatus) dom.cardStatus.value = "";
    if (dom.cardPlan) dom.cardPlan.value = "";
    if (dom.cardBilling) dom.cardBilling.value = "";
    if (dom.cardSource) dom.cardSource.value = "";
    if (dom.cardAgent) dom.cardAgent.value = "";
    applyCardFilters();
  }

  function renderCards() {
    const list = paginate(state.cards.filtered, state.cards.page, state.cards.pageSize);
    if (dom.cardCount) dom.cardCount.textContent = `${state.cards.filtered.length} 筆`;

    if (!list.length) {
      dom.cardTable.innerHTML = `<div class="empty">查無卡片資料。</div>`;
      renderPagination(dom.cardPagination, state.cards.filtered.length, state.cards.page, state.cards.pageSize, "card");
      return;
    }

    dom.cardTable.innerHTML = list.map((item) => `
      <article class="card">
        <div class="card-top">
          <div>
            <h3 class="name">${esc(item.name || item.id || "未命名")}</h3>
            <div class="meta">
              <span class="chip">${esc(item.id)}</span>
              <span class="chip ${low(item.status) === "active" ? "active" : "inactive"}">${esc(item.status || "—")}</span>
              <span class="chip">${esc(item.plan || "—")}</span>
              <span class="chip">${esc(item.service_agent || "SELF")}</span>
            </div>
          </div>
        </div>

        <div class="data">
          <div class="kv"><b>單位</b><span>${esc(item.unit || "—")}</span></div>
          <div class="kv"><b>職稱</b><span>${esc(item.title || "—")}</span></div>
          <div class="kv"><b>電話</b><span>${esc(item.phone || "—")}</span></div>
          <div class="kv"><b>到期日</b><span>${esc(item.expires_at || "—")}</span></div>
          <div class="kv"><b>更新時間</b><span>${esc(item.updated_at || "—")}</span></div>
          <div class="kv"><b>來源</b><span>${esc(item.source || "—")}</span></div>
        </div>

        <div class="card-actions">
          <button data-act="detail" data-id="${esc(item.id)}" class="primary">查看詳情</button>
          <button data-act="open-card" data-id="${esc(item.id)}">開啟名片</button>
          <button data-act="open-clean" data-id="${esc(item.id)}">乾淨名片</button>
          <button data-act="copy-card" data-id="${esc(item.id)}" class="warn">複製名片連結</button>
          <button data-act="update-link" data-id="${esc(item.id)}">更新頁 24h</button>
          <button data-act="copy-update-link" data-id="${esc(item.id)}">複製更新頁</button>
          <button data-act="activate-card" data-id="${esc(item.id)}" class="ok">啟用卡片</button>
          <button data-act="inactive-card" data-id="${esc(item.id)}" class="danger">停用卡片</button>
          <button data-act="extend-card" data-id="${esc(item.id)}" class="warn">延長期限</button>
          <button data-act="agent-detail" data-agent="${esc(item.service_agent || item.referrer || "")}">查看來源代理</button>
        </div>
      </article>
    `).join("");

    renderPagination(dom.cardPagination, state.cards.filtered.length, state.cards.page, state.cards.pageSize, "card");
  }

  async function onCardTableClick(ev) {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id || "";
    const agent = btn.dataset.agent || "";

    try {
      if (act === "detail") return openCardDetail(id);
      if (act === "open-card") return window.open(buildCardLink(id), "_blank", "noopener");
      if (act === "open-clean") return window.open(buildCardCleanLink(id), "_blank", "noopener");
      if (act === "copy-card") {
        await copyText(buildCardLink(id));
        return setStatus(`已複製名片連結\n${buildCardLink(id)}`, "ok");
      }
      if (act === "update-link") {
        const link = await getUpdateLink(id, true);
        return window.open(link, "_blank", "noopener");
      }
      if (act === "copy-update-link") {
        const link = await getUpdateLink(id, true);
        await copyText(link);
        return setStatus(`已複製更新頁連結\n${link}`, "ok");
      }
      if (act === "activate-card") return updateCardStatus(id, "active");
      if (act === "inactive-card") return updateCardStatus(id, "inactive");
      if (act === "extend-card") return extendCardExpire(id);
      if (act === "agent-detail") {
        if (!agent) return setStatus("這張卡片沒有 service_agent / referrer。", "warn");
        return openAgentDetail(agent);
      }
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  async function openCardDetail(id) {
    const item = await fetchCardDetail(id);
    state.cards.selected = item;
    openDrawer(`卡片詳情｜${id}`, buildCardDetailHtml(item));
  }

  async function updateCardStatus(id, status) {
    setStatus(`更新卡片狀態中：${id} → ${status}`, "warn");
    const patch = { id, status, updated_at: new Date().toISOString() };
    if (status === "active") patch.activated_at = new Date().toISOString();
    if (status === "inactive") patch.inactivated_at = new Date().toISOString();
    await api("adminUpdate", patch);
    state.caches.detailById[id] = null;
    await refreshCards(true);
    computeDashboard();
    renderDashboard();
    renderStatsPanel();
    setStatus(`卡片狀態已更新：${id} → ${status}`, "ok");
  }

  async function extendCardExpire(id) {
    const current = await fetchCardDetail(id);
    const baseDate = current.expires_at && Date.parse(current.expires_at) ? new Date(current.expires_at) : new Date();
    baseDate.setDate(baseDate.getDate() + 365);
    const nextIso = baseDate.toISOString();
    setStatus(`延長期限中：${id}`, "warn");
    await api("adminUpdate", { id, expires_at: nextIso, updated_at: new Date().toISOString() });
    state.caches.detailById[id] = null;
    await refreshCards(true);
    computeDashboard();
    renderDashboard();
    renderStatsPanel();
    setStatus(`已延長期限：${id}\n新到期日：${nextIso}`, "ok");
  }

  async function getUpdateLink(id, refresh = false) {
    if (!refresh && state.caches.updateLinks[id]) return state.caches.updateLinks[id];
    const res = await api("adminCreateUpdateLink24h", { id });
    const link = res.update_link || "";
    if (!link) throw new Error("沒有取得更新頁連結。");
    state.caches.updateLinks[id] = link;
    return link;
  }
/* =========================
   * Lead / Invite / Agent
   * ========================= */
  async function refreshLeads(silent = false) {
    if (!silent) setStatus("讀取 Lead 中…", "warn");
    const res = await api("leadList", {});
    state.leads.raw = normalizeLeadItems(res.items || []);
    filterLeads();
    if (!silent) setStatus(`Lead 已更新，共 ${state.leads.raw.length} 筆。`, "ok");
  }

  function filterLeads() {
    state.leads.keyword = val(dom.leadKeyword).toLowerCase();
    state.leads.filters.status = val(dom.leadStatus).toLowerCase();
    state.leads.filters.source = val(dom.leadSource).toLowerCase();
    state.leads.filters.service_agent = val(dom.leadAgent);

    state.leads.filtered = state.leads.raw.filter((x) => {
      if (state.leads.filters.status && low(x.status) !== state.leads.filters.status) return false;
      if (state.leads.filters.source && low(x.source) !== state.leads.filters.source) return false;
      if (state.leads.filters.service_agent && text(x.service_agent) !== state.leads.filters.service_agent) return false;
      if (state.leads.keyword) {
        const hay = [x.lead_id, x.customer_name, x.phone, x.email, x.note, x.invite_code, x.card_id].join(" ").toLowerCase();
        if (!hay.includes(state.leads.keyword)) return false;
      }
      return true;
    });

    state.leads.page = 1;
    renderLeads();
  }

  function clearLeadFilters() {
    dom.leadKeyword.value = "";
    dom.leadStatus.value = "";
    dom.leadSource.value = "";
    dom.leadAgent.value = "";
    filterLeads();
  }

  function renderLeads() {
    const list = paginate(state.leads.filtered, state.leads.page, state.leads.pageSize);
    dom.leadCount.textContent = `${state.leads.filtered.length} 筆`;
    if (!list.length) {
      dom.leadTable.innerHTML = `<div class="empty">查無 Lead 資料。</div>`;
      return renderPagination(dom.leadPagination, state.leads.filtered.length, state.leads.page, state.leads.pageSize, "lead");
    }

    dom.leadTable.innerHTML = list.map((x) => `
      <article class="card">
        <div class="card-top">
          <div>
            <h3 class="name">${esc(x.customer_name || x.name || x.lead_id)}</h3>
            <div class="meta">
              <span class="chip">${esc(x.lead_id)}</span>
              <span class="chip">${esc(x.status || "—")}</span>
              <span class="chip">${esc(x.service_agent || "SELF")}</span>
            </div>
          </div>
        </div>
        <div class="data">
          <div class="kv"><b>電話</b><span>${esc(x.phone || "—")}</span></div>
          <div class="kv"><b>Email</b><span>${esc(x.email || "—")}</span></div>
          <div class="kv"><b>Invite</b><span>${esc(x.invite_code || "—")}</span></div>
          <div class="kv"><b>Card</b><span>${esc(x.card_id || "—")}</span></div>
          <div class="kv"><b>來源</b><span>${esc(x.source || "—")}</span></div>
          <div class="kv"><b>建立時間</b><span>${esc(x.created_at || "—")}</span></div>
        </div>
        <div class="card-actions">
          <button data-act="lead-detail" data-id="${esc(x.lead_id)}" class="primary">查看詳情</button>
          <button data-act="lead-create-invite" data-id="${esc(x.lead_id)}" class="warn">產生 invite</button>
          <button data-act="lead-copy-invite-msg" data-id="${esc(x.lead_id)}">複製邀請碼文字</button>
          <button data-act="lead-copy-form-link" data-id="${esc(x.lead_id)}">複製表單連結</button>
          <button data-act="lead-cs-template" data-id="${esc(x.lead_id)}">客服處理模板</button>
        </div>
      </article>
    `).join("");

    renderPagination(dom.leadPagination, state.leads.filtered.length, state.leads.page, state.leads.pageSize, "lead");
  }

  async function onLeadTableClick(ev) {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const leadId = btn.dataset.id || "";
    const lead = state.leads.raw.find((x) => x.lead_id === leadId);
    if (!lead) return;

    try {
      if (act === "lead-detail") return openDrawer(`Lead 詳情｜${leadId}`, buildLeadDetailHtml(lead));
      if (act === "lead-create-invite") {
        const res = await api("inviteCreate", {
          plan: "free",
          days: 7,
          count: 1,
          referrer: lead.referrer,
          service_agent: lead.service_agent,
          agent_type: lead.agent_type,
          source: lead.source || "lead"
        });
        const code = (res.codes || [])[0] || "";
        if (!code) throw new Error("沒有取得 invite code。");
        await api("leadMarkInvited", { lead_id: leadId, invite_code: code });
        dom.csInviteCode.value = code;
        await refreshLeads(true);
        await refreshInvites(true);
        setStatus(`已建立邀請碼：${code}`, "ok");
        return;
      }
      if (act === "lead-copy-invite-msg") {
        if (!lead.invite_code) return setStatus("這筆 lead 尚未有 invite_code。", "warn");
        await copyText(buildInviteMessage(lead.invite_code));
        return setStatus("已複製邀請碼文字。", "ok");
      }
      if (act === "lead-copy-form-link") {
        if (!lead.invite_code) return setStatus("這筆 lead 尚未有 invite_code。", "warn");
        const link = buildFormLink(lead.invite_code);
        await copyText(link);
        return setStatus(`已複製表單連結\n${link}`, "ok");
      }
      if (act === "lead-cs-template") {
        await copyText(buildCustomerServiceTemplate({ lead }));
        return setStatus("已複製客服處理模板。", "ok");
      }
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  async function refreshInvites(silent = false) {
    if (!silent) setStatus("讀取 Invite 中…", "warn");
    const res = await api("inviteList", {});
    state.invites.raw = normalizeInviteItems(res.items || []);
    filterInvites();
    if (!silent) setStatus(`Invite 已更新，共 ${state.invites.raw.length} 筆。`, "ok");
  }

  function filterInvites() {
    state.invites.keyword = val(dom.inviteKeyword).toLowerCase();
    state.invites.filters.status = val(dom.inviteStatus).toLowerCase();
    state.invites.filters.source = val(dom.inviteSource).toLowerCase();
    state.invites.filters.service_agent = val(dom.inviteAgent);

    state.invites.filtered = state.invites.raw.filter((x) => {
      if (state.invites.filters.status && low(x.status) !== state.invites.filters.status) return false;
      if (state.invites.filters.source && low(x.source) !== state.invites.filters.source) return false;
      if (state.invites.filters.service_agent && text(x.service_agent) !== state.invites.filters.service_agent) return false;
      if (state.invites.keyword) {
        const hay = [x.invite_code, x.used_by_id, x.note, x.referrer, x.service_agent].join(" ").toLowerCase();
        if (!hay.includes(state.invites.keyword)) return false;
      }
      return true;
    });

    state.invites.page = 1;
    renderInvites();
  }

  function clearInviteFilters() {
    dom.inviteKeyword.value = "";
    dom.inviteStatus.value = "";
    dom.inviteSource.value = "";
    dom.inviteAgent.value = "";
    filterInvites();
  }

  async function createInviteBatch() {
    try {
      setStatus("建立 Invite 中…", "warn");
      const res = await api("inviteCreate", {
        plan: val(dom.invitePlan) || "free",
        days: num(val(dom.inviteDays), 7),
        count: num(val(dom.inviteCount), 1),
        note: val(dom.inviteNote)
      });
      await refreshInvites(true);
      const firstCode = (res.codes || [])[0] || "";
      if (firstCode) dom.csInviteCode.value = firstCode;
      setStatus(`Invite 建立完成\ncount=${res.count || 0}\nfirst=${firstCode}`, "ok");
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  function renderInvites() {
    const list = paginate(state.invites.filtered, state.invites.page, state.invites.pageSize);
    dom.inviteCountLabel.textContent = `${state.invites.filtered.length} 筆`;
    if (!list.length) {
      dom.inviteTable.innerHTML = `<div class="empty">查無 Invite 資料。</div>`;
      return renderPagination(dom.invitePagination, state.invites.filtered.length, state.invites.page, state.invites.pageSize, "invite");
    }

    dom.inviteTable.innerHTML = list.map((x) => `
      <article class="card">
        <div class="card-top">
          <div>
            <h3 class="name">${esc(x.invite_code)}</h3>
            <div class="meta">
              <span class="chip">${esc(x.status || "—")}</span>
              <span class="chip">${esc(x.service_agent || "—")}</span>
              <span class="chip">${esc(x.plan || "—")}</span>
            </div>
          </div>
        </div>
        <div class="data">
          <div class="kv"><b>lead_id</b><span>${esc(x.lead_id || "—")}</span></div>
          <div class="kv"><b>used_by_id</b><span>${esc(x.used_by_id || "—")}</span></div>
          <div class="kv"><b>created_at</b><span>${esc(x.created_at || "—")}</span></div>
          <div class="kv"><b>expires_at</b><span>${esc(x.expires_at || "—")}</span></div>
          <div class="kv"><b>used_at</b><span>${esc(x.used_at || "—")}</span></div>
          <div class="kv"><b>source</b><span>${esc(x.source || "—")}</span></div>
        </div>
        <div class="card-actions">
          <button data-act="invite-detail" data-id="${esc(x.invite_code)}" class="primary">查看詳情</button>
          <button data-act="invite-copy-code" data-id="${esc(x.invite_code)}">複製邀請碼</button>
          <button data-act="invite-copy-msg" data-id="${esc(x.invite_code)}" class="warn">複製邀請碼＋訊息</button>
          <button data-act="invite-open-form" data-id="${esc(x.invite_code)}">開啟表單</button>
          <button data-act="invite-disable" data-id="${esc(x.invite_code)}" class="danger">停用邀請碼</button>
        </div>
      </article>
    `).join("");

    renderPagination(dom.invitePagination, state.invites.filtered.length, state.invites.page, state.invites.pageSize, "invite");
  }

  async function onInviteTableClick(ev) {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const code = btn.dataset.id || "";
    const item = state.invites.raw.find((x) => x.invite_code === code);
    if (!item) return;

    try {
      if (act === "invite-detail") return openDrawer(`Invite 詳情｜${code}`, buildInviteDetailHtml(item));
      if (act === "invite-copy-code") {
        await copyText(code);
        return setStatus(`已複製邀請碼：${code}`, "ok");
      }
      if (act === "invite-copy-msg") {
        await copyText(buildInviteMessage(code));
        return setStatus("已複製邀請碼訊息。", "ok");
      }
      if (act === "invite-open-form") return window.open(buildFormLink(code), "_blank", "noopener");
      if (act === "invite-disable") {
        await api("inviteDisable", { invite_code: code });
        await refreshInvites(true);
        return setStatus(`邀請碼已停用：${code}`, "ok");
      }
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  async function refreshAgents(silent = false) {
    if (!silent) setStatus("讀取代理中…", "warn");
    const res = await api("agentList", {});
    state.agents.raw = normalizeAgentItems(res.items || []);
    filterAgents();
    if (!silent) setStatus(`代理已更新，共 ${state.agents.raw.length} 筆。`, "ok");
  }

  function filterAgents() {
    state.agents.keyword = val(dom.agentKeyword).toLowerCase();
    state.agents.filtered = state.agents.raw.filter((x) => {
      if (!state.agents.keyword) return true;
      const hay = [x.agent_code, x.name, x.phone, x.email, x.note].join(" ").toLowerCase();
      return hay.includes(state.agents.keyword);
    });
    state.agents.page = 1;
    renderAgents();
  }

  function clearAgentFilters() {
    dom.agentKeyword.value = "";
    filterAgents();
  }

  function renderAgents() {
    const list = paginate(state.agents.filtered, state.agents.page, state.agents.pageSize);
    dom.agentCount.textContent = `${state.agents.filtered.length} 筆`;
    if (!list.length) {
      dom.agentTable.innerHTML = `<div class="empty">查無代理資料。</div>`;
      return renderPagination(dom.agentPagination, state.agents.filtered.length, state.agents.page, state.agents.pageSize, "agent");
    }

    dom.agentTable.innerHTML = list.map((x) => `
      <article class="card">
        <div class="card-top">
          <div>
            <h3 class="name">${esc(x.name || x.agent_code)}</h3>
            <div class="meta">
              <span class="chip">${esc(x.agent_code)}</span>
              <span class="chip">${esc(x.status || "—")}</span>
            </div>
          </div>
        </div>
        <div class="data">
          <div class="kv"><b>電話</b><span>${esc(x.phone || "—")}</span></div>
          <div class="kv"><b>Email</b><span>${esc(x.email || "—")}</span></div>
          <div class="kv"><b>建立時間</b><span>${esc(x.created_at || "—")}</span></div>
          <div class="kv"><b>更新時間</b><span>${esc(x.updated_at || "—")}</span></div>
        </div>
        <div class="card-actions">
          <button data-act="agent-detail" data-id="${esc(x.agent_code)}" class="primary">查看詳情</button>
          <button data-act="agent-copy-home" data-id="${esc(x.agent_code)}">複製 ref 首頁</button>
        </div>
      </article>
    `).join("");

    renderPagination(dom.agentPagination, state.agents.filtered.length, state.agents.page, state.agents.pageSize, "agent");
  }

  async function onAgentTableClick(ev) {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const agentCode = btn.dataset.id || "";

    try {
      if (act === "agent-detail") return openAgentDetail(agentCode);
      if (act === "agent-copy-home") {
        const link = buildFacadeLink(agentCode);
        await copyText(link);
        return setStatus(`已複製代理首頁網址\n${link}`, "ok");
      }
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  async function openAgentDetail(agentCode) {
    const agent = await api("agentGet", { agent_code: agentCode });
    const cardsRes = await api("agentCustomers", { agent_code: agentCode });
    const leads = state.leads.raw.filter((x) => x.service_agent === agentCode || x.referrer === agentCode);
    openDrawer(`代理詳情｜${agentCode}`, buildAgentDetailHtml(normalizeAgentItem(agent), normalizeCardItems(cardsRes.items || []), leads));
  }

  /* =========================
   * Dashboard / Stats / Expire
   * ========================= */
  function computeDashboard() {
    const cards = state.cards.raw.slice();
    const leads = state.leads.raw.slice();
    const invites = state.invites.raw.slice();
    const agents = state.agents.raw.slice();

    const today = new Date();
    const todayStr = toDateKey(today);

    const active = cards.filter((x) => low(x.status) === "active");
    const inactive = cards.filter((x) => low(x.status) === "inactive");
    const expired = cards.filter((x) => isExpired(x.expires_at));

    const createdToday = cards.filter((x) => toDateKey(x.created_at) === todayStr);

    const exp30 = active.filter((x) => daysLeft(x.expires_at) != null && daysLeft(x.expires_at) >= 0 && daysLeft(x.expires_at) <= 30)
      .sort((a, b) => daysLeft(a.expires_at) - daysLeft(b.expires_at));
    const exp7 = active.filter((x) => daysLeft(x.expires_at) != null && daysLeft(x.expires_at) >= 0 && daysLeft(x.expires_at) <= 7)
      .sort((a, b) => daysLeft(a.expires_at) - daysLeft(b.expires_at));

    state.dashboard.cardsTotal = cards.length;
    state.dashboard.cardsToday = createdToday.length;
    state.dashboard.leadsTotal = leads.length;
    state.dashboard.agentsTotal = agents.length;
    state.dashboard.invitesTotal = invites.length;
    state.dashboard.activeCards = active.length;
    state.dashboard.inactiveCards = inactive.length;
    state.dashboard.expiredCards = expired.length;
    state.dashboard.exp30 = exp30;
    state.dashboard.exp7 = exp7;
    state.dashboard.expiredList = expired.sort((a, b) => sortByDateAsc(a.expires_at, b.expires_at));
  }

  function renderDashboard() {
    textContent(dom.kpiCards, state.dashboard.cardsTotal);
    textContent(dom.kpiCardsToday, state.dashboard.cardsToday);
    textContent(dom.kpiLeads, state.dashboard.leadsTotal);
    textContent(dom.kpiAgents, state.dashboard.agentsTotal);
    textContent(dom.kpiExp30, state.dashboard.exp30.length);
    textContent(dom.kpiExp7, state.dashboard.exp7.length);
    textContent(dom.kpiExpired, state.dashboard.expiredCards);
    textContent(dom.kpiInvites, state.dashboard.invitesTotal);

    renderExpireBox(dom.dashboardExp30, state.dashboard.exp30.slice(0, 8));
    renderExpireBox(dom.dashboardExp7, state.dashboard.exp7.slice(0, 8));
    renderExpireBox(dom.dashboardExpired, state.dashboard.expiredList.slice(0, 8));
    renderExpireBox(dom.exp30Tools, state.dashboard.exp30);
    renderExpireBox(dom.exp7Tools, state.dashboard.exp7);
    renderExpireBox(dom.expiredTools, state.dashboard.expiredList);
  }

  function renderStatsPanel() {
    textContent(dom.statsCardsTotal, state.dashboard.cardsTotal);
    textContent(dom.statsCardsActive, state.dashboard.activeCards);
    textContent(dom.statsCardsInactive, state.dashboard.inactiveCards);
    textContent(dom.statsCardsExpired, state.dashboard.expiredCards);
    textContent(dom.statsCardsToday, state.dashboard.cardsToday);
    textContent(dom.statsLeadsTotal, state.dashboard.leadsTotal);
    textContent(dom.statsInvitesTotal, state.dashboard.invitesTotal);
    textContent(dom.statsAgentsTotal, state.dashboard.agentsTotal);
  }

  function renderExpireBox(target, items) {
    if (!target) return;
    if (!items.length) {
      target.innerHTML = `<div class="empty">目前沒有資料。</div>`;
      return;
    }

    target.innerHTML = items.map((x) => `
      <article class="card">
        <div class="card-top">
          <div>
            <h3 class="name">${esc(x.name || x.id)}</h3>
            <div class="meta">
              <span class="chip">${esc(x.id)}</span>
              <span class="chip">${esc(x.service_agent || "SELF")}</span>
              <span class="chip warn">${esc(expireBadgeText(x.expires_at))}</span>
            </div>
          </div>
        </div>
        <div class="data">
          <div class="kv"><b>電話</b><span>${esc(x.phone || "—")}</span></div>
          <div class="kv"><b>到期日</b><span>${esc(x.expires_at || "—")}</span></div>
          <div class="kv"><b>狀態</b><span>${esc(x.status || "—")}</span></div>
          <div class="kv"><b>service_agent</b><span>${esc(x.service_agent || "—")}</span></div>
        </div>
        <div class="card-actions">
          <button data-act="open-card" data-id="${esc(x.id)}">一鍵開名片</button>
          <button data-act="copy-update-link" data-id="${esc(x.id)}">一鍵開更新頁</button>
          <button data-act="copy-remind-list" data-id="${esc(x.id)}" class="warn">複製提醒名單文字</button>
        </div>
      </article>
    `).join("");
  }

  async function onExpireListClick(ev) {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id || "";
    try {
      if (act === "open-card") return window.open(buildCardLink(id), "_blank", "noopener");
      if (act === "copy-update-link") {
        const link = await getUpdateLink(id, true);
        await copyText(link);
        return setStatus(`已複製更新頁連結\n${link}`, "ok");
      }
      if (act === "copy-remind-list") {
        const item = state.cards.raw.find((x) => x.id === id);
        const text = `${item?.name || ""}｜${item?.id || ""}｜${item?.phone || ""}｜${item?.expires_at || ""}｜${item?.service_agent || ""}`;
        await copyText(text);
        return setStatus("已複製提醒名單文字。", "ok");
      }
    } catch (err) {
      setStatus(normalizeError(err), "err");
    }
  }

  /* =========================
   * Drawer / Detail HTML
   * ========================= */
  function openDrawer(title, html) {
    dom.drawerTitle.textContent = title;
    dom.drawerBody.innerHTML = html;
    dom.drawer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeDrawer() {
    dom.drawerTitle.textContent = "詳細資料";
    dom.drawerBody.innerHTML = `<div class="empty">尚未選取資料。</div>`;
  }

  function buildCardDetailHtml(x) {
    const imageFields = ["avatar_url","logo_url","photo1_url","photo2_url","photo3_url","photo4_url","photo5_url"];
    const socialFields = ["line_url","line_oa","wechat_id","email","phone","address","website","social1","social2","social3"];
    const ctaFields = ["cta_text_1","cta_link_1","cta_text_2","cta_link_2","cta_text_3","cta_link_3"];

    return `
      <div class="detail-box">
        <div class="statusbox">${esc(JSON.stringify(x, null, 2))}</div>
        <div class="data">
          ${buildKv("基本資料", [x.id, x.name, x.unit, x.title].filter(Boolean).join("｜"))}
          ${buildKv("來源", [x.source, x.referrer, x.service_agent, x.agent_type].filter(Boolean).join("｜"))}
          ${buildKv("invite / uid / billing", [x.invite_code, x.uid, x.billing_status].filter(Boolean).join("｜"))}
          ${buildKv("到期資訊", [x.status, x.expires_at, x.activated_at, x.inactivated_at].filter(Boolean).join("｜"))}
          ${buildKv("更新資訊", [x.updated_at, x.update_link_sent_at, x.update_token_expire].filter(Boolean).join("｜"))}
          ${buildKv("CTA", ctaFields.map(k => `${k}:${x[k] || ""}`).join("\n"))}
          ${buildKv("照片欄位", imageFields.map(k => `${k}:${x[k] || ""}`).join("\n"))}
          ${buildKv("社群欄位", socialFields.map(k => `${k}:${x[k] || ""}`).join("\n"))}
        </div>
      </div>
    `;
  }

  function buildLeadDetailHtml(x) {
    return `<div class="statusbox">${esc(JSON.stringify(x, null, 2))}</div>`;
  }

  function buildInviteDetailHtml(x) {
    return `<div class="statusbox">${esc(JSON.stringify(x, null, 2))}</div>`;
  }

  function buildAgentDetailHtml(agent, cards, leads) {
    return `
      <div class="detail-box">
        <div class="statusbox">${esc(JSON.stringify(agent, null, 2))}</div>
        <div class="data">
          ${buildKv("代理 leads", String(leads.length))}
          ${buildKv("代理 cards", String(cards.length))}
          ${buildKv("轉換狀況", `lead→card：${cards.length} / ${leads.length}`)}
          ${buildKv("預留欄位", "分潤 / 排行榜 / 收益 / 推薦連結生成器（未啟用）")}
        </div>
      </div>
    `;
  }

  function buildKv(label, value) {
    return `<div class="kv"><b>${esc(label)}</b><span>${esc(value || "—")}</span></div>`;
  }

  /* =========================
   * Helpers
   * ========================= */
  function renderAllShells() {
    switchTab(state.ui.activeTab || "dashboard");
  }

  function renderPagination(container, total, page, pageSize, type) {
    if (!container) return;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    container.innerHTML = "";
    const prev = document.createElement("button");
    prev.textContent = "上一頁";
    prev.disabled = page <= 1;
    prev.addEventListener("click", () => changePage(type, page - 1));
    const next = document.createElement("button");
    next.textContent = "下一頁";
    next.disabled = page >= pages;
    next.addEventListener("click", () => changePage(type, page + 1));
    const mid = document.createElement("span");
    mid.className = "chip";
    mid.textContent = `${page} / ${pages}`;
    container.append(prev, mid, next);
  }

  function changePage(type, nextPage) {
    if (type === "card") { state.cards.page = nextPage; persistConfig(); return renderCards(); }
    if (type === "lead") { state.leads.page = nextPage; persistConfig(); return renderLeads(); }
    if (type === "invite") { state.invites.page = nextPage; persistConfig(); return renderInvites(); }
    if (type === "agent") { state.agents.page = nextPage; persistConfig(); return renderAgents(); }
  }

  function paginate(arr, page, size) {
    const start = (page - 1) * size;
    return arr.slice(start, start + size);
  }

  function normalizeCardItems(items) { return (items || []).map(normalizeCardItem); }
  function normalizeCardItem(x) {
    const out = {};
    CARD_FIELDS.forEach((k) => out[k] = x?.[k] ?? "");
    return out;
  }
  function normalizeLeadItems(items) { return (items || []).map((x) => ({ ...x })); }
  function normalizeInviteItems(items) { return (items || []).map((x) => ({ ...x })); }
  function normalizeAgentItems(items) { return (items || []).map(normalizeAgentItem); }
  function normalizeAgentItem(x) {
    const out = {};
    AGENT_FIELDS.forEach((k) => out[k] = x?.[k] ?? "");
    return out;
  }

  function buildCardLink(id) { return `${DEFAULT_BASE_URL}?id=${encodeURIComponent(id)}`; }
  function buildCardCleanLink(id) { return `${DEFAULT_BASE_URL}?id=${encodeURIComponent(id)}&view=1`; }
  function buildFormLink(inviteCode) {
    return `${DEFAULT_BASE_URL}form.html?tenant=${encodeURIComponent(state.config.tenant || DEFAULT_TENANT)}&invite=${encodeURIComponent(inviteCode)}`;
  }
  function buildFacadeLink(ref = "") {
    const base = `${DEFAULT_BASE_URL}?tenant=${encodeURIComponent(state.config.tenant || DEFAULT_TENANT)}`;
    return ref ? `${base}&ref=${encodeURIComponent(ref)}` : base;
  }

  function buildInviteMessage(code) {
    return `您好，這是您的智慧名片申請邀請碼：${code}\n請點以下表單連結完成資料填寫：\n${buildFormLink(code)}`;
  }

  function buildCustomerServiceTemplate({ id = "", inviteCode = "", lead = null } = {}) {
    const parts = [
      "您好，這裡是天使幸福智慧名片客服。",
      inviteCode ? `您的邀請碼：${inviteCode}` : "",
      inviteCode ? `表單連結：${buildFormLink(inviteCode)}` : "",
      id ? `卡片編號：${id}` : "",
      lead ? `Lead：${lead.customer_name || lead.lead_id}` : "",
      "若您填寫完成或需要協助，請直接回覆此訊息。"
    ].filter(Boolean);
    return parts.join("\n");
  }

  function daysLeft(iso) {
    const t = Date.parse(String(iso || ""));
    if (!Number.isFinite(t)) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endDate = new Date(t);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
    return Math.ceil((end - start) / 86400000);
  }

  function expireBadgeText(iso) {
    const d = daysLeft(iso);
    if (d == null) return "無到期日";
    if (d < 0) return `已過期 ${Math.abs(d)} 天`;
    if (d === 0) return "今天到期";
    return `剩 ${d} 天`;
  }

  function isExpired(iso) {
    const t = Date.parse(String(iso || ""));
    return Number.isFinite(t) && t < Date.now();
  }

  function sortByDateDesc(a, b) {
    return (Date.parse(b || "") || 0) - (Date.parse(a || "") || 0);
  }
  function sortByDateAsc(a, b) {
    return (Date.parse(a || "") || 0) - (Date.parse(b || "") || 0);
  }
  function toDateKey(v) {
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function pad2(n) { return String(n).padStart(2, "0"); }

  function setStatus(msg, type = "") {
    if (!dom.statusBox) return;
    dom.statusBox.textContent = String(msg || "");
    dom.statusBox.className = "statusbox";
    if (type === "ok") dom.statusBox.classList.add("ok");
    if (type === "warn") dom.statusBox.classList.add("warn");
    if (type === "err") dom.statusBox.classList.add("err");
  }

  function text(v) { return v == null ? "" : String(v).trim(); }
  function low(v) { return text(v).toLowerCase(); }
  function val(node) { return text(node?.value); }
  function num(v, d = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  async function copyText(textValue) {
    const t = String(textValue || "");
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
    } catch (_err) {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  function textContent(node, value) {
    if (node) node.textContent = String(value ?? "—");
  }

  function normalizeError(err) {
    return err?.message || String(err || "未知錯誤");
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();