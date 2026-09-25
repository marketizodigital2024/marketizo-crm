const adminUsers = [
  { email: "office@marketizo.com", password: "Tastatura1.", name: "Marketizo" },
];

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
  if (!session || Number(session.expiresAt || 0) < Date.now()) {
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
      expiresAt: Date.now() + adminSessionDuration,
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
  const user = adminUsers.find((admin) => admin.email === email && admin.password === password);
  if (user) {
    setAdminSession({ ...user, role: "full-admin" });
    window.location.href = adminHomePath();
    return;
  }
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  if (submit) { submit.disabled = true; submit.textContent = "Provera pristupa..."; }
  try {
    const response = await fetch("/api/employee-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "operationalAdminLogin", email, password }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "Login podaci nisu tačni.");
    setAdminSession({ email, name: result.employee?.name || email, employeeId: result.employee?.id || "", role: "operational-admin", token: result.token });
    window.location.href = adminHomePath();
  } catch (error) {
    const message = document.getElementById("adminLoginError");
    if (message) { message.textContent = error?.message || "Login podaci nisu tačni."; message.hidden = false; }
    if (submit) { submit.disabled = false; submit.textContent = "Uloguj se"; }
  }
});

if (document.getElementById("adminLoginForm") && getAdminSession()) {
  window.location.replace(adminHomePath());
}

document.getElementById("adminLogoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem(adminSessionKey);
  window.location.href = adminLoginPath();
});

setupPasswordToggles();
