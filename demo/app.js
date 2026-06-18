/** CODE OS static demo — shell, navigation, admin/member view toggle */
(function () {
  const VIEW_KEY = "codeos-demo-view";

  const PUBLIC_PAGES = [
    { href: "index.html", label: "Home" },
    { href: "login.html", label: "Login" },
    { href: "faq.html", label: "FAQ" },
    { href: "hall-of-fame.html", label: "Hall of Fame" },
    { href: "startups.html", label: "Startups" },
    { href: "onboarding.html", label: "Onboarding" },
    { href: "client-project.html", label: "Client view" },
  ];

  const APP_PAGES = [
    { href: "dashboard.html", label: "Dashboard", icon: "▣" },
    { href: "projects.html", label: "Projects", icon: "▣" },
    { href: "project-new.html", label: "New project", icon: "＋", sub: true },
    { href: "project-detail.html", label: "Project detail", icon: "→", sub: true },
    { href: "resources.html", label: "Resources", icon: "▣" },
    { href: "resource-detail.html", label: "Resource detail", icon: "→", sub: true },
    { href: "feed.html", label: "Feed", icon: "▣" },
    { href: "events.html", label: "Events", icon: "▣" },
    { href: "eboard.html", label: "E-Board", icon: "▣", eboard: true },
    { href: "members.html", label: "Members", icon: "▣" },
    { href: "network.html", label: "Alumni network", icon: "▣" },
    { href: "profile.html", label: "Profile", icon: "▣" },
    { href: "housing-points.html", label: "Housing points", icon: "▣" },
    { href: "startups-submit.html", label: "Propose startup", icon: "＋", sub: true },
    { href: "startups-edit.html", label: "Edit startup", icon: "→", sub: true },
    { href: "admin.html", label: "Admin tools", icon: "⛨", adminOnly: true },
    { href: "admin-seed.html", label: "Admin seed", icon: "→", adminOnly: true, sub: true },
  ];

  function getView() {
    return localStorage.getItem(VIEW_KEY) === "admin" ? "admin" : "member";
  }

  function setView(v) {
    localStorage.setItem(VIEW_KEY, v);
    document.body.dataset.view = v;
    window.dispatchEvent(new CustomEvent("codeos-view-change", { detail: v }));
    refreshShell();
    applyViewToPage();
  }

  function currentPage() {
    return document.body.dataset.page || "";
  }

  function isAdminOnlyPage() {
    return document.body.dataset.adminOnly === "true";
  }

  function applyViewToPage() {
    const view = getView();
    const denied = document.getElementById("access-denied");
    const content = document.getElementById("page-content");
    if (isAdminOnlyPage() && view === "member") {
      if (denied) denied.hidden = false;
      if (content) content.hidden = true;
    } else {
      if (denied) denied.hidden = true;
      if (content) content.hidden = false;
    }
    document.querySelectorAll("[data-admin-only-block]").forEach((el) => {
      el.hidden = view !== "admin";
    });
    document.querySelectorAll("[data-member-only-block]").forEach((el) => {
      el.hidden = view === "admin";
    });
    const user = window.CODE_DEMO?.user?.[view] || {};
    document.querySelectorAll("[data-demo-user-name]").forEach((el) => {
      el.textContent = user.name || "Demo User";
    });
    document.querySelectorAll("[data-demo-user-role]").forEach((el) => {
      el.textContent = user.role || "Member";
    });
    document.querySelectorAll("[data-demo-clearance]").forEach((el) => {
      el.textContent = user.clearance || "MEMBER";
    });
  }

  function renderBanner() {
    const view = getView();
    let el = document.getElementById("demo-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-banner";
      el.className = "demo-banner";
      document.body.prepend(el);
    }
    el.innerHTML = `
      <span>CODE OS · Static demo · Sample data only</span>
      <div class="view-toggle" role="group" aria-label="View mode">
        <button type="button" class="view-toggle__btn ${view === "member" ? "active" : ""}" data-set-view="member">Member view</button>
        <button type="button" class="view-toggle__btn ${view === "admin" ? "active" : ""}" data-set-view="admin">Admin view</button>
      </div>
      <a href="sitemap.html" class="demo-banner__link">All pages</a>`;
    el.querySelectorAll("[data-set-view]").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.setView));
    });
  }

  function renderPublicNav() {
    const page = currentPage();
    let nav = document.getElementById("demo-public-nav");
    if (!nav) {
      nav = document.createElement("header");
      nav.id = "demo-public-nav";
      nav.className = "nav";
      const banner = document.getElementById("demo-banner");
      banner?.insertAdjacentElement("afterend", nav);
    }
    const links = PUBLIC_PAGES.filter((p) => !["onboarding.html", "client-project.html"].includes(p.href));
    nav.innerHTML = `
      <div class="nav__inner">
        <a href="index.html" class="nav__brand"><img src="assets/CODELogo.png" alt="" width="36" height="36" />CODE<span class="dot">.</span></a>
        <nav class="nav__links">
          ${links.map((p) => `<a href="${p.href}" class="${page === p.href.replace(".html", "") || (page === "home" && p.href === "index.html") ? "active" : ""}">${p.label}</a>`).join("")}
          <a href="dashboard.html" class="btn">Open app demo</a>
        </nav>
      </div>`;
    const active = PUBLIC_PAGES.find((p) => p.href === page + ".html" || (page === "home" && p.href === "index.html"));
    nav.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
    const href = page === "home" ? "index.html" : page + ".html";
    const link = nav.querySelector(`a[href="${href}"]`);
    if (link) link.classList.add("active");
  }

  function renderSidebar() {
    const page = currentPage();
    const view = getView();
    let wrap = document.getElementById("demo-app-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "demo-app-wrap";
      wrap.className = "layout-dash";
      const main = document.getElementById("page-content");
      if (main) {
        const parent = main.parentNode;
        parent.insertBefore(wrap, main);
        wrap.appendChild(main);
      }
    }
    let side = document.getElementById("demo-sidebar");
    if (!side) {
      side = document.createElement("aside");
      side.id = "demo-sidebar";
      side.className = "sidebar";
      wrap.insertBefore(side, wrap.firstChild);
    }
    const items = APP_PAGES.filter((p) => {
      if (p.sub) return false;
      if (p.adminOnly && view !== "admin") return false;
      return true;
    });
    const publicBottom = [
      { href: "hall-of-fame.html", label: "Hall of Fame" },
      { href: "startups.html", label: "Startups gallery" },
      { href: "faq.html", label: "Community FAQ" },
      { href: "index.html", label: "Public home" },
    ];
    side.innerHTML = `
      <div class="sidebar__brand"><img src="assets/CODELogo.png" alt="" width="28" height="28" /><span>CODE<span class="dot">.</span>OS</span></div>
      <p class="sidebar__section">App</p>
      ${items.map((p) => `<a href="${p.href}" class="sidebar__item ${page + ".html" === p.href ? "active" : ""}">${p.icon} ${p.label}</a>`).join("")}
      <p class="sidebar__section">Public</p>
      ${publicBottom.map((p) => `<a href="${p.href}" class="sidebar__item">${p.label}</a>`).join("")}
      <p class="sidebar__section">Demo</p>
      <a href="sitemap.html" class="sidebar__item">All pages</a>
      <div class="sidebar__user">
        <div class="sidebar__user-name" data-demo-user-name></div>
        <div class="sidebar__user-role" data-demo-user-role></div>
      </div>`;
    const file = page.includes(".") ? page : page + ".html";
    side.querySelectorAll(".sidebar__item").forEach((a) => {
      if (a.getAttribute("href") === file) a.classList.add("active");
    });
  }

  function renderFooter() {
    if (document.getElementById("demo-footer")) return;
    const footer = document.createElement("footer");
    footer.id = "demo-footer";
    footer.className = "footer";
    footer.innerHTML = `
      <div class="footer__inner">
        <span>CODE<span style="color:var(--primary)">.</span>OS demo</span>
        <a href="sitemap.html">Sitemap</a>
        <span>© 2026 Babson CODE</span>
      </div>`;
    document.body.appendChild(footer);
  }

  function refreshShell() {
    const layout = document.body.dataset.layout;
    if (layout === "public") renderPublicNav();
    if (layout === "app") renderSidebar();
    applyViewToPage();
  }

  function initAdminTabs() {
    const root = document.getElementById("admin-root");
    if (!root) return;
    const tabs = root.querySelectorAll("[data-admin-tab]");
    const panels = root.querySelectorAll("[data-admin-panel]");
    const gallery = document.getElementById("admin-gallery");
    const tabBar = document.getElementById("admin-tab-bar");

    function showTab(key) {
      if (!key) {
        gallery.hidden = false;
        tabBar.hidden = true;
        panels.forEach((p) => (p.hidden = true));
        location.hash = "";
        return;
      }
      gallery.hidden = true;
      tabBar.hidden = false;
      panels.forEach((p) => {
        p.hidden = p.dataset.adminPanel !== key;
      });
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.adminTab === key));
      location.hash = key;
    }

    tabs.forEach((t) => t.addEventListener("click", () => showTab(t.dataset.adminTab)));
    document.getElementById("admin-all-tools")?.addEventListener("click", () => showTab(null));
    gallery?.querySelectorAll("[data-open-tab]").forEach((btn) => {
      btn.addEventListener("click", () => showTab(btn.dataset.openTab));
    });
    const hash = location.hash.replace("#", "");
    if (hash) showTab(hash);
    else showTab(null);
  }

  function initFaqAccordion() {
    document.querySelectorAll("[data-faq-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.nextElementSibling;
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        if (panel) panel.hidden = open;
      });
    });
  }

  function initStartupModal() {
    const modal = document.getElementById("startup-modal");
    if (!modal) return;
    document.querySelectorAll("[data-startup-id]").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.startupId;
        const s = window.CODE_DEMO.startups.find((x) => x.id === id);
        if (!s) return;
        document.getElementById("startup-modal-body").innerHTML = `
          <button type="button" class="modal__close" onclick="document.getElementById('startup-modal').classList.remove('open')">×</button>
          <p class="startup-card__cat">${s.cat}</p>
          <h2 style="font-size:1.75rem;font-weight:900;margin:8px 0;">${s.name}</h2>
          <p class="text-muted">Founded ${s.year}</p>
          <p style="margin-top:16px;font-family:var(--mono);font-size:13px;">${s.overview}</p>
          ${s.story ? `<p style="margin-top:12px;font-family:var(--mono);font-size:12px;color:var(--muted);">${s.story}</p>` : ""}
          <p style="margin-top:12px;color:var(--primary);font-family:var(--mono);font-size:11px;">CODE founder: ${s.founder}</p>`;
        modal.classList.add("open");
      });
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  }

  window.CODE_DEMO_APP = { getView, setView, refreshShell };

  document.addEventListener("DOMContentLoaded", () => {
    document.body.dataset.view = getView();
    renderBanner();
    renderFooter();
    refreshShell();
    initAdminTabs();
    initFaqAccordion();
    initStartupModal();
    window.addEventListener("codeos-view-change", applyViewToPage);
  });
})();
