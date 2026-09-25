const adminSessionKey = "marketizoAdminSession";
const adminSessionDuration = 30 * 24 * 60 * 60 * 1000;

function adminHomePath() {
  return window.location.protocol === "file:" ? "index.html" : "/";
}

function adminLoginPath() {
  return window.location.protocol === "file:" ? "admin-login.html" : "/admin-login.html";
}

function getAdminSession() {
  const session = JSON.parse(localStorage.getItem(adminSessionKey) || "null");
  if (!session || !session.token || Number(session.expiresAt || 0) < Date.now()) {
    localStorage.removeItem(adminSessionKey);
    return null;
  }
  return session;
}

function setAdminSession(user) {
  if (user.role === "operational-admin") localStorage.removeItem("agencyCrmData");
  localStorage.setItem(
    adminSessionKey,
    JSON.stringify({
      email: user.email,
      name: user.name,
      role: user.role || "full-admin",
      employeeId: user.employeeId || "",
      token: user.token || "",
      expiresAt: Number(user.expiresAt || (Date.now() + adminSessionDuration)),
    })
  );
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    if (button.dataset.ready === "true") return;
    button.dataset.ready = "true";
    button.addEventListener("click", () => {
      const field = button.closest(".password-field");
      const input = field?.querySelector("input");
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "Prikaži" : "Sakrij";
      button.setAttribute("aria-label", visible ? "Prikaži lozinku" : "Sakrij lozinku");
    });
  });
}

document.getElementById("adminLoginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  if (submit) { submit.disabled = true; submit.textContent = "Provera pristupa..."; }
  try {
    let response = await fetch("/api/employee-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fullAdminLogin", email, password }) });
    let result = await response.json().catch(() => ({}));
    let role = "full-admin";
    if (!response.ok) {
      response = await fetch("/api/employee-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "operationalAdminLogin", email, password }) });
      result = await response.json().catch(() => ({}));
      role = "operational-admin";
    }
    if (!response.ok || !result.ok) throw new Error(result.error || "Login podaci nisu tačni.");
    setAdminSession({ email, name: result.employee?.name || email, employeeId: result.employee?.id || "", role, token: result.token, expiresAt: result.expiresAt });
    window.location.href = adminHomePath();
  } catch (error) {
    const message = document.getElementById("adminLoginError");
    if (message) { message.textContent = error?.message || "Login podaci nisu tačni."; message.hidden = false; }
    if (submit) { submit.disabled = false; submit.textContent = "Uloguj se"; }
  }
});

const adminLoginForm = document.getElementById("adminLoginForm");
const currentSession = getAdminSession();
if (adminLoginForm && currentSession) window.location.replace(adminHomePath());
if (!adminLoginForm && !currentSession) window.location.replace(adminLoginPath());

document.getElementById("adminLogoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem(adminSessionKey);
  window.location.href = adminLoginPath();
});

setupPasswordToggles();
