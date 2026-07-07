const adminUsers = [
  { email: "miljan@marketizo.local", password: "123456", name: "Miljan" },
  { email: "ivana@marketizo.local", password: "123456", name: "Ivana" },
];

const adminSessionKey = "marketizoAdminSession";

function getAdminSession() {
  const session = JSON.parse(localStorage.getItem(adminSessionKey) || "null");
  if (!session || Number(session.expiresAt || 0) < Date.now()) {
    localStorage.removeItem(adminSessionKey);
    return null;
  }
  return session;
}

function setAdminSession(user) {
  localStorage.setItem(
    adminSessionKey,
    JSON.stringify({
      email: user.email,
      name: user.name,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    })
  );
}

document.getElementById("adminLoginForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const user = adminUsers.find((admin) => admin.email === email && admin.password === password);
  if (!user) {
    document.getElementById("adminLoginError").hidden = false;
    return;
  }
  setAdminSession(user);
  window.location.href = "index.html";
});

if (document.getElementById("adminLoginForm") && getAdminSession()) {
  window.location.replace("index.html");
}

document.getElementById("adminLogoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem(adminSessionKey);
  window.location.href = "admin-login.html";
});
