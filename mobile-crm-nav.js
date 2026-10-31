(function(){
'use strict';
function setupMobileAdminNavigation() {
  const sidebar = document.querySelector(".app-shell > .sidebar");
  const nav = sidebar?.querySelector(".nav");
  if (!nav || sidebar.querySelector(".mobile-crm-nav-toggle")) return;
  sidebar.classList.add("mobile-crm-navigation");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mobile-crm-nav-toggle";
  nav.id = nav.id || "crmMainNavigation";
  toggle.setAttribute("aria-controls", nav.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "Meni";
  sidebar.insertBefore(toggle, nav);
  const mobile = window.matchMedia("(max-width: 780px)");
  const close = () => { sidebar.classList.remove("mobile-nav-open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", () => {
    const open = !sidebar.classList.contains("mobile-nav-open");
    sidebar.classList.toggle("mobile-nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", event => {
    if (mobile.matches && event.target.closest("a[href], button[data-view], .client-cost-nav")) close();
  });
  document.addEventListener("click", event => { if (mobile.matches && !sidebar.contains(event.target)) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && sidebar.classList.contains("mobile-nav-open")) { close(); toggle.focus(); } });
  mobile.addEventListener("change", close);
}

setupMobileAdminNavigation();

})();
