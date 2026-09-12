const defaultEmployees = [
  {
    id: "emp-miljan",
    name: "Miljan Marinjes",
    email: "miljan@marketizo.local",
    position: "Founder / Strategija",
    startDate: "2023-07-01",
    salary: 0,
    weeklyHours: 40,
    vacationDays: 25,
    giftDays: 1,
    isLeader: true,
    leaderId: "",
    status: "Aktivan",
  },
  {
    id: "emp-ivana",
    name: "Ivana Marinjes",
    email: "ivana@marketizo.local",
    position: "Co-founder / Operativa",
    startDate: "2023-07-01",
    salary: 0,
    weeklyHours: 40,
    vacationDays: 25,
    giftDays: 1,
    isLeader: true,
    leaderId: "",
    status: "Aktivan",
  },
];

const currency = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

let state = loadState();
let activeEmployee = null;
let portalMonth = currentMonthKey();
let deferredInstallPrompt = null;
let onlineHydrationPromise = null;
let leaderReportInboxShown = false;
const employeeSessionKey = "marketizoEmployeeSession";
const employeeSessionDuration = 24 * 60 * 60 * 1000;

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function showCachedEmployeeSession(session) {
  if (!session?.token) return false;
  activeEmployee = (state.employees || []).find(
    (employee) => employee.id === session.employeeId || String(employee.email || "").toLowerCase() === session.email
  );
  if (!activeEmployee) return false;
  document.getElementById("employeeLoginScreen").hidden = true;
  document.getElementById("employeeApp").hidden = false;
  renderEmployeePortal();
  return true;
}

function getEmployeeSession() {
  try {
    const session = JSON.parse(localStorage.getItem(employeeSessionKey) || "null");
    if (!session || Number(session.expiresAt || 0) < Date.now()) {
      localStorage.removeItem(employeeSessionKey);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(employeeSessionKey);
    return null;
  }
}

function setEmployeeSession(employee, token, expiresAt) {
  try {
    localStorage.setItem(
      employeeSessionKey,
      JSON.stringify({
        employeeId: employee.id,
        email: String(employee.email || "").toLowerCase(),
        token,
        expiresAt: Number(expiresAt || (Date.now() + employeeSessionDuration)),
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function restoreEmployeeSession() {
  const session = getEmployeeSession();
  if (!session?.token) return false;
  const validate = () => fetch("/api/employee-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", token: session.token }),
    }).catch(() => null);
  let response = await validate();
  if (!response || response.status >= 500) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    response = await validate();
  }
  if (!response || !response.ok) {
    if (response?.status === 401) localStorage.removeItem(employeeSessionKey);
    return false;
  }
  const verified = await response.json();
  activeEmployee = (state.employees || []).find(
    (employee) => employee.id === verified.employee?.id || String(employee.email || "").toLowerCase() === verified.employee?.email
  );
  if (!activeEmployee) {
    localStorage.removeItem(employeeSessionKey);
    return false;
  }
  document.getElementById("employeeLoginScreen").hidden = true;
  document.getElementById("employeeApp").hidden = false;
  renderEmployeePortal();
  setupDailyMinuteProgress();
  setupPauseActivityEntry();
  return true;
}

function loadState(sourceData = null) {
  const saved = sourceData ? "" : localStorage.getItem("agencyCrmData");
  let data = {};
  try {
    data = sourceData ? JSON.parse(JSON.stringify(sourceData)) : saved ? JSON.parse(saved) : {};
  } catch {
    data = {};
  }
  data.employees = (data.employees?.length ? data.employees : defaultEmployees).map((employee) => ({
    id: employee.id || createId(),
    name: "",
    email: "",
    password: "",
    position: "",
    startDate: "",
    salary: 0,
    weeklyHours: 40,
    openingHourBalance: 0,
    openingBalanceMonth: "",
    vacationDays: 25,
    openingVacationUsed: 0,
    giftDays: 1,
    isLeader: false,
    leaderId: "",
    status: "Aktivan",
    ...employee,
    weeklyHours: parseNumber(employee.weeklyHours || 40, 40),
    openingHourBalance: parseNumber(employee.openingHourBalance || 0, 0),
    openingBalanceMonth: employee.openingBalanceMonth || shiftMonth(currentMonthKey(), -1),
    vacationDays: parseNumber(employee.vacationDays || 25, 26),
    openingVacationUsed: parseNumber(employee.openingVacationUsed || 0, 0),
    giftDays: parseNumber(employee.giftDays || 1, 1),
    status: ["Aktivan", "Pauza", "Neaktivan"].includes(employee.status) ? employee.status : "Aktivan",
  }));
  data.employeeAbsences = data.employeeAbsences || [];
  data.employeeWorkLogs = (data.employeeWorkLogs || []).map((log) => ({
    id: log.id || createId(),
    employeeId: log.employeeId || "",
    date: log.date || currentDateKey(),
    hours: Number(log.hours || 0),
    minutes: Number(log.minutes || Math.round(Number(log.hours || 0) * 60)),
    activityId: log.activityId || "",
    activityName: log.activityName || log.note || "Rad",
    activityCategory: log.activityCategory || "Ostalo",
    clientId: log.clientId || "",
    clientName: log.clientName || "",
    type: log.type || "Rad",
    note: log.note || "",
    positive: log.positive || "",
    negative: log.negative || "",
    locked: log.locked !== false,
    submittedAt: log.submittedAt || new Date().toISOString(),
  }));
  data.employeeActivities = (data.employeeActivities || []).map((activity) => ({
    id: activity.id || createId(),
    name: activity.name || "Aktivnost",
    category: activity.category || "Ostalo",
    active: activity.active !== false,
  }));
  data.employeeHourAdjustments = (data.employeeHourAdjustments || []).map((adjustment) => ({
    id: adjustment.id || createId(),
    employeeId: adjustment.employeeId || "",
    date: adjustment.date || currentDateKey(),
    minutes: Math.max(1, Math.round(Number(adjustment.minutes || 0))),
    reason: adjustment.reason || "Korekcija salda",
    createdAt: adjustment.createdAt || new Date().toISOString(),
  }));
  if (!data.employeeActivities.some((activity) => String(activity.name || "").toLowerCase() === "pauza")) {
    data.employeeActivities.push({ id: "activity-pause", name: "Pauza", category: "Interno", active: true });
  }
  data.employeeDocuments = (data.employeeDocuments || []).map((documentItem) => ({
    id: documentItem.id || createId(),
    employeeId: documentItem.employeeId || "",
    month: documentItem.month || currentMonthKey(),
    type: documentItem.type || "Faktura",
    fileName: documentItem.fileName || "",
    fileData: documentItem.fileData || "",
    note: documentItem.note || "",
    uploadedBy: documentItem.uploadedBy || "Zaposleni",
    uploadedAt: documentItem.uploadedAt || new Date().toISOString(),
  }));
  data.employeeLateRecords = (data.employeeLateRecords || []).map((record) => ({
    id: record.id || createId(),
    employeeId: record.employeeId || "",
    date: record.date || currentDateKey(),
    minutes: Number(record.minutes || 0),
    penaltyMinutes: Math.max(15, Number(record.penaltyMinutes || record.minutes || 0)),
    reason: record.reason || "",
    acknowledgedAt: record.acknowledgedAt || "",
    createdAt: record.createdAt || new Date().toISOString(),
  }));
  data.employeeGoals = data.employeeGoals || [];
  data.employeeRatings = data.employeeRatings || [];
  data.employeeRecognitions = data.employeeRecognitions || [];
  data.employeeOneOnOnes = data.employeeOneOnOnes || [];
  data.employeeReports = data.employeeReports || [];
  data.companyPlans = data.companyPlans || [];
  data.notifications = (data.notifications || []).map((notification) => ({
    ...notification,
    hiddenUntil: notification.hiddenUntil || "",
  }));
  const sladjan = data.employees.find((employee) =>
    String(employee.name || "").trim().toLowerCase().replace(/[đ]/g, "dj") === "sladjan simic"
  );
  if (sladjan) {
    sladjan.openingHourBalance = 0;
    sladjan.openingBalanceMonth = "2025-12";
    sladjan.monthlyBalanceOverrides = {
      ...(sladjan.monthlyBalanceOverrides || {}),
      "2026-01": 2.5,
      "2026-02": 1.5,
      "2026-03": 3.5,
      "2026-04": 0,
      "2026-05": 0,
      "2026-06": -2,
      "2026-07": 1.5,
      "2026-08": -0.5,
    };
  }
  localStorage.setItem("agencyCrmData", JSON.stringify(data));
  return data;
}

function saveState(options = {}) {
  localStorage.setItem("agencyCrmData", JSON.stringify(state));
  if (options.remote === false) return Promise.resolve({ ok: true, localOnly: true });
  if (!window.MarketizoRemote?.save) {
    return Promise.resolve({ ok: false, error: "Online baza nije dostupna. Pokušaj ponovo." });
  }
  return window.MarketizoRemote.save(state);
}

window.addEventListener("marketizo-state-conflict", (event) => {
  if (event.detail?.payload) {
    const activeId = activeEmployee?.id;
    state = loadState(event.detail.payload);
    activeEmployee = (state.employees || []).find((employee) => employee.id === activeId) || activeEmployee;
    if (activeEmployee) renderEmployeePortal();
  }
  showToast("Podaci su osveženi", event.detail?.message || "Učitani su noviji podaci. Ponovi poslednju izmenu.", "warn");
});

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

function escapePortalText(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function oneOnOneContent(note) {
  const blocks = String(note || "").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return `<div class="one-on-one-answers">${blocks.map((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const question = lines[0] || "Beleška";
    const answer = lines.slice(1).join("\n") || "Bez upisanog odgovora.";
    return `<div class="one-on-one-answer"><strong>${escapePortalText(question)}</strong><p>${escapePortalText(answer).replace(/\n/g, "<br />")}</p></div>`;
  }).join("")}</div>`;
}

function normalizedActivitySearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("sr");
}

function renderPortalActivityOptions() {
  const activityInput = document.getElementById("portalActivitySearch");
  const activityIdInput = document.getElementById("portalActivityId");
  const activityOptions = document.getElementById("portalActivityOptions");
  if (!activityInput || !activityIdInput || !activityOptions) return;
  const selectedActivity = (state.employeeActivities || []).find((activity) => activity.id === activityIdInput.value);
  const query = normalizedActivitySearch(selectedActivity && activityInput.value === selectedActivity.name ? "" : activityInput.value);
  const activeActivities = (state.employeeActivities || []).filter((activity) => activity.active !== false);
  const activities = query
    ? activeActivities.filter((activity) => normalizedActivitySearch(`${activity.name} ${activity.category || "Ostalo"}`).includes(query))
    : activeActivities;
  const groups = activities.reduce((result, activity) => {
    (result[activity.category || "Ostalo"] ||= []).push(activity);
    return result;
  }, {});
  activityOptions.innerHTML = activities.length
    ? Object.entries(groups).map(([category, items]) => `<span class="activity-option-group">${category}</span>${items.map((activity) => `<button type="button" class="activity-option" role="option" data-activity-id="${activity.id}">${activity.name}</button>`).join("")}`).join("")
    : `<span class="activity-option-empty">${activeActivities.length ? "Nema rezultata za ovu pretragu" : "Admin još nije dodao aktivnosti"}</span>`;
}

function setPortalActivityOptionsOpen(open) {
  const input = document.getElementById("portalActivitySearch");
  const options = document.getElementById("portalActivityOptions");
  if (!input || !options) return;
  options.hidden = !open;
  input.setAttribute("aria-expanded", String(open));
}

function formatHours(value) {
  const number = Math.round(parseNumber(value) * 100) / 100;
  return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
}

function formatNumber(value) {
  return formatHours(value);
}

function showToast(title, message = "", type = "ok") {
  const stack = document.getElementById("employeeToastStack");
  if (!stack) return;
  const signature = `${title}|${message}`;
  if ([...stack.children].some((item) => item.dataset.signature === signature)) return;
  while (stack.children.length >= 3) stack.firstElementChild?.remove();
  const toast = document.createElement("div");
  const className = type === "danger" ? "danger" : type === "warn" ? "warn" : "ok";
  toast.className = `toast-message ${className}`;
  toast.dataset.signature = signature;
  toast.innerHTML = `<strong>${title}</strong>${message ? `<span>${message}</span>` : ""}`;
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentDateKey() {
  return dateKey(new Date());
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value, days) {
  const date = typeof value === "string" ? parseDate(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("sr-Latn-RS", { month: "long", year: "numeric" });
}

function formatDate(value) {
  if (!value) return "nije unet";
  return parseDate(value).toLocaleDateString("sr-Latn-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("sr-Latn-RS", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function monthDayKeys(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`);
}

function dateRangeKeys(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (start > end) return [];
  const days = [];
  for (let current = start; current <= end; current.setDate(current.getDate() + 1)) {
    days.push(dateKey(current));
  }
  return days;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateKey(new Date(year, month - 1, day));
}

function austrianHolidayMap(year) {
  const easter = easterSunday(year);
  return {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-01-06`]: "Heilige Drei Könige",
    [addDays(easter, 1)]: "Ostermontag",
    [`${year}-05-01`]: "Staatsfeiertag",
    [addDays(easter, 39)]: "Christi Himmelfahrt",
    [addDays(easter, 50)]: "Pfingstmontag",
    [addDays(easter, 60)]: "Fronleichnam",
    [`${year}-08-15`]: "Mariä Himmelfahrt",
    [`${year}-10-26`]: "Nationalfeiertag",
    [`${year}-11-01`]: "Allerheiligen",
    [`${year}-12-08`]: "Mariä Empfängnis",
    [`${year}-12-25`]: "Weihnachten",
    [`${year}-12-26`]: "Stephanstag",
  };
}

function publicHolidayName(value) {
  const year = Number(value.slice(0, 4));
  return austrianHolidayMap(year)[value] || "";
}

function companySpecialDayName(value) {
  if (value.endsWith("-12-24")) return "24.12. poseban radni dan";
  if (value.endsWith("-12-31")) return "31.12. poseban radni dan";
  return "";
}

function isWeekend(value) {
  const day = parseDate(value).getDay();
  return day === 0 || day === 6;
}

function isAustrianWorkingDay(value) {
  return !isWeekend(value) && !publicHolidayName(value);
}

function workdayKeysBetween(startDate, endDate) {
  return dateRangeKeys(startDate, endDate).filter(isAustrianWorkingDay);
}

function workdaysInMonth(monthKey) {
  return monthDayKeys(monthKey).filter(isAustrianWorkingDay);
}

function employeeAbsences(type = "") {
  return (state.employeeAbsences || []).filter((absence) => absence.employeeId === activeEmployee.id && (!type || absence.type === type));
}

function employeeWorkLogs(monthKey = portalMonth) {
  return (state.employeeWorkLogs || []).filter((log) => log.employeeId === activeEmployee.id && String(log.date || "").startsWith(monthKey));
}

function employeeGoals() {
  return (state.employeeGoals || []).filter((goal) => goal.employeeId === activeEmployee.id);
}

function employeeOneOnOnes() {
  return (state.employeeOneOnOnes || []).filter((note) => note.employeeId === activeEmployee.id && note.visibleToEmployee !== false);
}

function employeeLateRecords(monthKey = portalMonth) {
  return (state.employeeLateRecords || []).filter((record) => record.employeeId === activeEmployee.id && String(record.date || "").startsWith(monthKey));
}

function employeeNotifications() {
  return (state.notifications || []).filter((notification) => notification.scope === "employee" && notification.targetId === activeEmployee.id && !isNotificationHidden(notification)).slice(0, 8);
}

function hiddenEmployeeNotifications() {
  return (state.notifications || []).filter((notification) => notification.scope === "employee" && notification.targetId === activeEmployee.id && isNotificationHidden(notification)).slice(0, 6);
}

function isNotificationHidden(notification) {
  return notification.hiddenUntil && new Date(notification.hiddenUntil).getTime() > Date.now();
}

function hideNotification(id) {
  const notification = (state.notifications || []).find((item) => item.id === id);
  if (!notification) return;
  notification.hiddenUntil = addDays(currentDateKey(), 7);
  saveState();
  renderEmployeePortal();
  showToast("Sakriveno", "Obaveštenje je sklonjeno na 7 dana.", "info");
}

function unhideNotification(id) {
  const notification = (state.notifications || []).find((item) => item.id === id);
  if (!notification) return;
  notification.hiddenUntil = "";
  saveState();
  renderEmployeePortal();
  showToast("Vraćeno", "Obaveštenje je ponovo aktivno.", "ok");
}

function leaderTeam() {
  if (!activeEmployee?.isLeader) return [];
  const activeName = String(activeEmployee.name || "").toLowerCase();
  return (state.employees || []).filter((employee) => {
    if (employee.leaderId === activeEmployee.id) return true;
    const employeeName = String(employee.name || "").toLowerCase();
    return activeName.includes("sladjan") && employeeName.includes("milica blagojevic");
  });
}

function reportRecipientId() {
  if (activeEmployee.isLeader) return "admin";
  return activeEmployee.leaderId || "admin";
}

function employeeYearAbsenceDays(type, year) {
  const openingUsed = type === "Godišnji odmor" && year === Number(currentDateKey().slice(0, 4)) ? parseNumber(activeEmployee?.openingVacationUsed || 0) : 0;
  return openingUsed + employeeAbsences(type).filter((absence) => absence.status === "Odobreno").reduce((sum, absence) => {
    const days = workdayKeysBetween(absence.startDate, absence.endDate).filter((day) => day.startsWith(`${year}-`));
    return sum + days.length;
  }, 0);
}

function vacationUtcDate(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function vacationAnniversary(startDate, years) {
  const start = vacationUtcDate(startDate);
  const result = new Date(start);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function employeeVacationSnapshot(employee, referenceDate = currentDateKey()) {
  const annualAllowance = parseNumber(employee?.vacationDays || 25, 25);
  if (!employee?.startDate) return { earned: annualAllowance, used: 0, left: annualAllowance };
  const start = vacationUtcDate(employee.startDate);
  const reference = vacationUtcDate(referenceDate);
  if (reference < start) return { earned: 0, used: 0, left: 0 };
  let completedYears = 0;
  while (vacationAnniversary(employee.startDate, completedYears + 1) <= reference) completedYears += 1;
  let currentEntitlement = annualAllowance;
  if (completedYears === 0) {
    const sixMonths = new Date(start);
    sixMonths.setUTCMonth(sixMonths.getUTCMonth() + 6);
    if (reference < sixMonths) {
      const yearEnd = vacationAnniversary(employee.startDate, 1);
      const elapsedDays = Math.max((reference - start) / 86400000 + 1, 0);
      const periodDays = Math.max((yearEnd - start) / 86400000, 1);
      currentEntitlement = (annualAllowance * elapsedDays) / periodDays;
    }
  }
  const earned = Math.round((completedYears * annualAllowance + currentEntitlement) * 100) / 100;
  const firstYear = Number(String(employee.startDate).slice(0, 4));
  const lastYear = reference.getUTCFullYear();
  let used = 0;
  for (let year = firstYear; year <= lastYear; year += 1) used += employeeYearAbsenceDays("Godišnji odmor", year);
  used = Math.round(used * 100) / 100;
  return { earned, used, left: Math.max(Math.round((earned - used) * 100) / 100, 0) };
}

function formatVacationDays(value) {
  return Number(value || 0).toLocaleString("sr-RS", { maximumFractionDigits: 2 });
}

function employeeMonthAbsenceDays(employeeId, monthKey) {
  return (state.employeeAbsences || [])
    .filter((absence) => absence.employeeId === employeeId && absence.status === "Odobreno")
    .reduce((sum, absence) => {
      const days = workdayKeysBetween(absence.startDate, absence.endDate).filter((day) => day.startsWith(monthKey));
      return sum + days.length;
    }, 0);
}

function scheduledMinutesForDate(weeklyHours, date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  if (day < 1 || day > 5) return 0;
  const hours = parseNumber(weeklyHours || 0, 0);
  if (hours >= 38) return day === 5 ? 390 : 510;
  return Math.round((hours * 60) / 5);
}

function expectedHours(employee, monthKey) {
  const weeklyHours = parseNumber(employee.weeklyHoursByMonth?.[monthKey] ?? employee.weeklyHours ?? 40, 40);
  const eligibleWorkdays = workdaysInMonth(monthKey).filter((day) =>
    (!employee.startDate || day >= employee.startDate) &&
    !(state.employeeAbsences || []).some((absence) => absence.employeeId === employee.id && absence.status === "Odobreno" && day >= absence.startDate && day <= absence.endDate)
  );
  return Math.round(eligibleWorkdays.reduce((sum, day) => sum + scheduledMinutesForDate(weeklyHours, day), 0) / 60 * 100) / 100;
}

function elapsedWorkdaysToDate(employee, monthKey) {
  const selectedMonth = monthIndex(monthKey);
  const currentMonth = monthIndex(currentMonthKey());
  if (selectedMonth < currentMonth) {
    return workdaysInMonth(monthKey).filter((day) =>
      (!employee.startDate || day >= employee.startDate) &&
      !(state.employeeAbsences || []).some((absence) =>
        absence.employeeId === employee.id &&
        absence.status === "Odobreno" &&
        day >= absence.startDate &&
        day <= absence.endDate
      )
    );
  }
  if (selectedMonth > currentMonth) return [];

  const today = currentDateKey();
  return workdaysInMonth(monthKey).filter((day) =>
    day < today &&
    (!employee.startDate || day >= employee.startDate) &&
    !(state.employeeAbsences || []).some((absence) =>
      absence.employeeId === employee.id &&
      absence.status === "Odobreno" &&
      day >= absence.startDate &&
      day <= absence.endDate
    )
  );
}

function expectedHoursToDate(employee, monthKey) {
  const selectedMonth = monthIndex(monthKey);
  const currentMonth = monthIndex(currentMonthKey());
  if (selectedMonth < currentMonth) return expectedHours(employee, monthKey);
  if (selectedMonth > currentMonth) return 0;

  const weeklyHours = parseNumber(employee.weeklyHoursByMonth?.[monthKey] ?? employee.weeklyHours ?? 40, 40);
  const elapsedWorkdays = elapsedWorkdaysToDate(employee, monthKey);
  return Math.round(elapsedWorkdays.reduce((sum, day) => sum + scheduledMinutesForDate(weeklyHours, day), 0) / 60 * 100) / 100;
}

function employeeMonthLatePenaltyHours(employeeId, monthKey) {
  return (state.employeeLateRecords || [])
    .filter((record) => record.employeeId === employeeId && String(record.date || "").startsWith(monthKey))
    .reduce((sum, record) => sum + Math.max(15, Number(record.penaltyMinutes || record.minutes || 0)) / 60, 0);
}

function employeeMonthHours(employee, monthKey) {
  const logged = (state.employeeWorkLogs || [])
    .filter((log) => log.employeeId === employee.id && String(log.date || "").startsWith(monthKey))
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const adjustmentHours = (state.employeeHourAdjustments || [])
    .filter((adjustment) => adjustment.employeeId === employee.id && String(adjustment.date || "").startsWith(monthKey))
    .reduce((sum, adjustment) => sum + Math.max(0, Number(adjustment.minutes || 0)), 0) / 60;
  return Math.round((logged - employeeMonthLatePenaltyHours(employee.id, monthKey) - adjustmentHours) * 100) / 100;
}

function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthIndex(monthKey) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  if (!year || !month) return 0;
  return year * 12 + month;
}

function employeeMonthHasActivity(employeeId, monthKey) {
  const employee = (state.employees || []).find((item) => item.id === employeeId);
  return (
    Object.prototype.hasOwnProperty.call(employee?.monthlyBalanceOverrides || {}, monthKey) ||
    (state.employeeWorkLogs || []).some((log) => log.employeeId === employeeId && String(log.date || "").startsWith(monthKey)) ||
    (state.employeeHourAdjustments || []).some((adjustment) => adjustment.employeeId === employeeId && String(adjustment.date || "").startsWith(monthKey)) ||
    (state.employeeLateRecords || []).some((record) => record.employeeId === employeeId && String(record.date || "").startsWith(monthKey)) ||
    (state.employeeAbsences || []).some((absence) => absence.employeeId === employeeId && dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(monthKey)))
  );
}

function monthBalance(employee, monthKey) {
  if (Object.prototype.hasOwnProperty.call(employee.monthlyBalanceOverrides || {}, monthKey)) {
    return parseNumber(employee.monthlyBalanceOverrides[monthKey]);
  }
  let completedHours = employeeMonthHours(employee, monthKey);
  if (monthKey === currentMonthKey()) {
    const today = currentDateKey();
    const todayHours = state.employeeWorkLogs
      .filter((log) => log.employeeId === employee.id && String(log.date || "") === today)
      .reduce((sum, log) => sum + Number(log.hours || 0), 0);
    completedHours -= todayHours;
  }
  return Math.round((completedHours - expectedHoursToDate(employee, monthKey)) * 100) / 100;
}

function carryoverBalance(employee, monthKey) {
  const openingMonth = employee.openingBalanceMonth || shiftMonth(currentMonthKey(), -1);
  const openingBalance = parseNumber(employee.openingHourBalance || 0);
  let total = monthIndex(monthKey) > monthIndex(openingMonth) ? openingBalance : 0;
  for (let index = 11; index >= 1; index -= 1) {
    const key = shiftMonth(monthKey, -index);
    if (!employeeMonthHasActivity(employee.id, key)) continue;
    total += monthBalance(employee, key);
  }
  return Math.round(total * 100) / 100;
}

function hourBalance(employee, monthKey) {
  return Math.round((monthBalance(employee, monthKey) + carryoverBalance(employee, monthKey)) * 100) / 100;
}

function carryoverLabel(employee, monthKey) {
  const previousMonth = shiftMonth(monthKey, -1);
  const opening = parseNumber(employee.openingHourBalance || 0);
  const openingMonth = employee.openingBalanceMonth || previousMonth;
  const prefix = opening && monthIndex(monthKey) > monthIndex(openingMonth)
    ? `Ručno unet prenos iz ${monthLabel(openingMonth)}: ${formatHourBalance(opening)} · `
    : "";
  return `${prefix}Ukupan prenos do ${monthLabel(previousMonth)}: ${formatHourBalance(carryoverBalance(employee, monthKey))}`;
}

function employeeLateStatus(employeeId, monthKey) {
  const count = (state.employeeLateRecords || []).filter((record) => record.employeeId === employeeId && String(record.date || "").startsWith(monthKey)).length;
  if (count > 3) return { count, className: "danger", label: `${count}/3 kašnjenja · razgovor` };
  if (count === 3) return { count, className: "warn", label: `${count}/3 kašnjenja · poslednje` };
  return { count, className: "ok", label: `${count}/3 kašnjenja` };
}

function formatHourBalance(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  const formatted = formatHours(rounded);
  if (rounded > 0) return `+${formatted}h`;
  return `${formatted}h`;
}

function hasWorkLogForDate(date) {
  return (state.employeeWorkLogs || []).some((log) => log.employeeId === activeEmployee.id && log.date === date);
}

function loggedMinutesForDate(date) {
  return (state.employeeWorkLogs || [])
    .filter((log) => log.employeeId === activeEmployee.id && log.date === date)
    .reduce((sum, log) => sum + Number(log.minutes || Number(log.hours || 0) * 60), 0);
}

function expectedMinutesForDate(employee, date) {
  if (!employee || !isAustrianWorkingDay(date)) return 0;
  const monthKey = String(date || "").slice(0, 7);
  const weeklyHours = Number(employee.weeklyHoursByMonth?.[monthKey] ?? employee.weeklyHours ?? 0);
  return scheduledMinutesForDate(weeklyHours, date);
}

function setupDailyMinuteProgress() {
  const minutesInput = document.querySelector('#employeeHours input[name="minutes"]');
  const form = minutesInput?.closest("form");
  const dateInput = form?.querySelector('input[name="date"]');
  if (!form || !dateInput || form.dataset.dailyProgressReady) return;
  form.dataset.dailyProgressReady = "true";
  const progress = document.createElement("section");
  progress.className = "daily-minute-progress";
  progress.innerHTML = `<div><span>Današnji učinak</span><strong id="dailyMinuteStatus">0 min</strong></div><div class="daily-minute-track"><span id="dailyMinuteBar"></span></div><p id="dailyMinuteMessage"></p><button id="dailyReportPromptButton" class="secondary-button" type="button" hidden>Popuni izveštaj za lidera</button>`;
  form.insertAdjacentElement("afterbegin", progress);
  const reportButton = progress.querySelector("#dailyReportPromptButton");
  reportButton.addEventListener("click", () => openDailyReportDialog(dateInput.value || currentDateKey()));
  const render = () => {
    const date = dateInput.value || currentDateKey();
    const logged = loggedMinutesForDate(date);
    const expected = expectedMinutesForDate(activeEmployee, date);
    const remaining = Math.max(0, expected - logged);
    const status = progress.querySelector("#dailyMinuteStatus");
    const bar = progress.querySelector("#dailyMinuteBar");
    const message = progress.querySelector("#dailyMinuteMessage");
    reportButton.hidden = !expected || logged < expected || hasFinalDailyReport(date);
    if (!expected) {
      status.textContent = `${logged} min upisano`;
      bar.style.width = logged ? "100%" : "0%";
      progress.classList.toggle("complete", logged > 0);
      message.textContent = String(activeEmployee?.position || "").toLowerCase().includes("snimatelj")
        ? "Fleksibilan raspored: upiši sve aktivnosti koje si radio/la tog dana."
        : absenceCoversDate(date) ? "Za ovaj datum je evidentirano odsustvo." : "Za ovaj datum nema obavezne kvote.";
      return;
    }
    const percentage = Math.min(100, Math.round(logged / expected * 100));
    status.textContent = `${logged} / ${expected} min`;
    bar.style.width = `${percentage}%`;
    progress.classList.toggle("complete", remaining === 0);
    message.textContent = remaining
      ? `Nedostaje još ${remaining} minuta za ovaj radni dan.`
      : logged > expected ? `Dnevna obaveza je ispunjena. Upisano je ${logged - expected} minuta više.` : "Dnevna obaveza je ispunjena.";
  };
  dateInput.addEventListener("change", render);
  form.addEventListener("submit", () => window.setTimeout(render, 150));
  window.refreshDailyMinuteProgress = render;
  render();
}

function setupPauseActivityEntry() {
  const activityIdInput = document.querySelector('#employeeHours input[name="activityId"]');
  const form = activityIdInput?.closest("form");
  const clientSelect = form?.querySelector('select[name="clientId"]');
  const minutesInput = form?.querySelector('input[name="minutes"]');
  if (!form || !activityIdInput || !clientSelect || !minutesInput || form.dataset.pauseReady) return;
  form.dataset.pauseReady = "true";
  const note = document.createElement("p");
  note.className = "pause-entry-note";
  note.hidden = true;
  note.textContent = "Pauza se evidentira u dnevnom prisustvu, ali se ne vezuje za klijenta niti ulazi u trošak klijenta.";
  clientSelect.closest("label")?.insertAdjacentElement("afterend", note);
  const sync = () => {
    const selected = (state.employeeActivities || []).find((activity) => activity.id === activityIdInput.value);
    const isPause = String(selected?.name || "").trim().toLowerCase() === "pauza";
    clientSelect.required = !isPause;
    clientSelect.disabled = isPause;
    note.hidden = !isPause;
    if (isPause) {
      clientSelect.value = "";
      minutesInput.value = "30";
    }
  };
  activityIdInput.addEventListener("change", sync);
  form.addEventListener("reset", () => window.setTimeout(sync, 0));
  sync();
}

function absenceCoversDate(date) {
  return employeeAbsences().some((absence) => dateRangeKeys(absence.startDate, absence.endDate).includes(date));
}

function previousWorkingDay(fromDate = currentDateKey()) {
  let day = addDays(fromDate, -1);
  while (!isAustrianWorkingDay(day)) day = addDays(day, -1);
  return day;
}

function readSmallFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.name || file.size > 1500000) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function notifyOnce({ key, scope = "admin", targetId = "", type = "info", title, message }) {
  state.notifications = state.notifications || [];
  if (key && state.notifications.some((notification) => notification.key === key)) return;
  state.notifications.unshift({
    id: createId(),
    key,
    scope,
    targetId,
    type,
    title,
    message,
    read: false,
    hiddenUntil: "",
    createdAt: new Date().toISOString(),
  });
}

function renderLoginHint() {
  const hint = document.getElementById("employeeLoginHint");
  if (!hint) return;
  hint.replaceChildren();
}

async function hydrateOnlineState() {
  if (!window.MarketizoRemote || window.location.protocol === "file:") return;
  const result = await window.MarketizoRemote.load();
  if (result.payload) {
    const activeEmployeeId = activeEmployee?.id;
    const activeEmployeeEmail = activeEmployee?.email;
    state = loadState(result.payload);
    if (activeEmployeeId || activeEmployeeEmail) {
      activeEmployee =
        (state.employees || []).find((employee) => employee.id === activeEmployeeId || employee.email === activeEmployeeEmail) ||
        activeEmployee;
      if (activeEmployee) renderEmployeePortal();
    }
    renderLoginHint();
    return;
  }
  if (!result.configured && result.error) {
    const hint = document.getElementById("employeeLoginHint");
    if (hint) {
      hint.innerHTML = `<strong>Online baza nije povezana.</strong><span>Login sa drugog uređaja radi tek kada povežemo zajedničku bazu.</span>`;
    }
  }
}

async function waitForOnlineHydration() {
  if (!onlineHydrationPromise) return;
  try {
    await Promise.race([
      onlineHydrationPromise,
      new Promise((resolve) => window.setTimeout(resolve, 20000)),
    ]);
  } catch {
    // Login must never stay blocked if online sync has a temporary issue.
  }
}

function renderEmployeePortal() {
  if (!activeEmployee) return;
  state = loadState();
  activeEmployee = state.employees.find((employee) => employee.id === activeEmployee.id) || activeEmployee;
  const year = Number(portalMonth.slice(0, 4));
  const logs = employeeWorkLogs(portalMonth);
  const hours = employeeMonthHours(activeEmployee, portalMonth);
  const workdays = elapsedWorkdaysToDate(activeEmployee, portalMonth);
  const expected = expectedHoursToDate(activeEmployee, portalMonth);
  const balance = hourBalance(activeEmployee, portalMonth);
  const currentYear = Number(currentDateKey().slice(0, 4));
  const vacation = employeeVacationSnapshot(activeEmployee, year === currentYear ? currentDateKey() : `${year}-12-31`);
  const giftUsed = employeeYearAbsenceDays("Poklon dan", year);
  const sickDays = employeeYearAbsenceDays("Bolovanje", year);
  const giftLeft = Math.max(Number(activeEmployee.giftDays || 1) - giftUsed, 0);

  document.getElementById("employeePortalMonth").value = portalMonth;
  setText("employeePortalName", activeEmployee.name);
  setText("employeePortalPosition", activeEmployee.position || "Pozicija");
  setText("portalWorkdays", workdays.length);
  setText("portalHours", `${formatHours(hours)}h`);
  setText("portalExpectedHours", `od ${formatHours(expected)}h · ${carryoverLabel(activeEmployee, portalMonth)}`);
  setText("portalHourBalance", formatHourBalance(balance));
  setText("portalVacation", `${formatVacationDays(vacation.used)}/${formatVacationDays(vacation.earned)}`);
  setText("portalVacationLeft", `${formatVacationDays(vacation.left)} preostalo`);
  setText("portalGiftDay", `${giftUsed}/${activeEmployee.giftDays || 1}`);
  setText("portalGiftLeft", `${giftLeft} preostalo`);
  setText("portalSickDays", sickDays);
  setText("portalStartDate", formatDate(activeEmployee.startDate));
  setText("portalPosition", activeEmployee.position || "-");
  setText("portalSalary", currency.format(Number(activeEmployee.salary || 0)));
  setText("portalWeeklyHours", `${formatHours(activeEmployee.weeklyHours || 40)}h`);

  const hourDate = document.querySelector('#portalHoursForm input[name="date"]');
  const absenceStart = document.querySelector('#portalAbsenceForm input[name="startDate"]');
  const absenceEnd = document.querySelector('#portalAbsenceForm input[name="endDate"]');
  if (hourDate && !hourDate.value) hourDate.value = currentDateKey();
  renderPortalActivityOptions();
  const clientSelect = document.getElementById("portalClientSelect");
  if (clientSelect) {
    const selected = clientSelect.value;
    const clients = (state.clients || []).filter((client) => client.status === "Aktivan").sort((a, b) => a.name.localeCompare(b.name, "sr"));
    clientSelect.innerHTML = `<option value="">Izaberi klijenta</option>${clients.map((client) => `<option value="${client.id}">${client.name}</option>`).join("")}`;
    if (clients.some((client) => client.id === selected)) clientSelect.value = selected;
  }
  if (absenceStart && !absenceStart.value) absenceStart.value = currentDateKey();
  if (absenceEnd && !absenceEnd.value) absenceEnd.value = currentDateKey();

  renderMissingTimeAlert();
  renderPortalCalendar();
  renderPortalTeamTimeline();
  renderPortalHourRows(logs);
  renderPortalAbsences();
  renderPortalNotifications();
  renderPortalGoals();
  renderPortalOneOnOnes();
  renderPortalLateRecords();
  renderPortalCompanyPlan();
  renderLeaderPanel();
  showEmployeeNotificationPopups();
  window.refreshDailyMinuteProgress?.();
}

function renderMissingTimeAlert() {
  const alertBox = document.getElementById("employeeMissingTimeAlert");
  if (!alertBox || !activeEmployee) return;
  const previousDay = previousWorkingDay();
  if (previousDay < "2026-09-01") {
    alertBox.hidden = true;
    return;
  }
  const expected = expectedMinutesForDate(activeEmployee, previousDay);
  const logged = loggedMinutesForDate(previousDay);
  const missingMinutes = Math.max(0, expected - logged);
  const missing = expected > 0 && missingMinutes > 0 && !absenceCoversDate(previousDay);
  alertBox.hidden = !missing;
  if (!missing) return;
  alertBox.innerHTML = `
    <strong>Nedostaju aktivnosti ili minuti</strong>
    <span>Za ${formatDate(previousDay)} upisano je ${logged} od očekivanih ${expected} min. Nedostaje ${missingMinutes} min.</span>`;
}

function renderPortalCalendar() {
  const target = document.getElementById("portalEmployeeCalendar");
  if (!target) return;
  const days = monthDayKeys(portalMonth);
  const firstDay = parseDate(days[0]).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const blanks = Array.from({ length: offset }, () => `<div class="calendar-day empty"></div>`).join("");
  const absences = (state.employeeAbsences || []).filter((absence) => absence.status === "Odobreno" && dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(portalMonth)));
  const logs = employeeWorkLogs(portalMonth);
  const plans = (state.companyPlans || []).filter((plan) => String(plan.date || "").startsWith(portalMonth));
  setText("portalCalendarSummary", `${monthLabel(portalMonth)} · ${absences.length} odsustava`);
  target.innerHTML = `
    <div class="calendar-weekdays">
      <span>Pon</span><span>Uto</span><span>Sre</span><span>Čet</span><span>Pet</span><span>Sub</span><span>Ned</span>
    </div>
    <div class="calendar-grid">
      ${blanks}
      ${days
        .map((day) => {
          const holiday = publicHolidayName(day);
          const companyDay = companySpecialDayName(day);
          const dayAbsences = absences.filter((absence) => dateRangeKeys(absence.startDate, absence.endDate).includes(day));
          const dayLogs = logs.filter((log) => log.date === day);
          const dayPlans = plans.filter((plan) => plan.date === day);
          const classes = ["calendar-day"];
          if (isWeekend(day)) classes.push("weekend");
          if (holiday) classes.push("holiday");
          if (dayAbsences.length) classes.push("has-absence");
          if (dayLogs.length) classes.push("has-hours");
          return `
          <div class="${classes.join(" ")}">
            <strong>${Number(day.slice(-2))}</strong>
            ${holiday ? `<span class="calendar-note holiday-note">${holiday}</span>` : ""}
            ${companyDay ? `<span class="calendar-note company-note">${companyDay}</span>` : ""}
            ${dayPlans.map((plan) => `<span class="calendar-note plan-note">${plan.type}: ${plan.title}</span>`).join("")}
            ${dayAbsences
              .map((absence) => {
                const employee = (state.employees || []).find((item) => item.id === absence.employeeId);
                const label = absence.employeeId === activeEmployee.id ? absence.type : `${employee?.name || "Zaposleni"} · ${absence.type}`;
                return `<span class="calendar-note ${absence.type === "Bolovanje" ? "sick-note" : "vacation-note"}">${label}</span>`;
              })
              .join("")}
            ${dayLogs.length ? `<span class="calendar-note hours-note">${formatHours(dayLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0))}h</span>` : ""}
          </div>`;
        })
        .join("")}
    </div>`;
  const list = document.getElementById("portalCalendarAbsenceList");
  if (!list) return;
  const rows = absences.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  setText("portalCalendarListCount", `${rows.length} unosa`);
  list.innerHTML = rows.length
    ? rows
        .map((absence) => {
          const employee = (state.employees || []).find((item) => item.id === absence.employeeId);
          const days = workdayKeysBetween(absence.startDate, absence.endDate).length;
          return `
          <div class="setup-item alert-item ${absence.type === "Bolovanje" ? "danger" : "warn"}">
            <strong>${days}</strong>
            <span>${absence.employeeId === activeEmployee.id ? "Ti" : employee?.name || "Zaposleni"} · ${absence.type}<br />${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}${absence.note ? ` · ${absence.note}` : ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema odsustava za izabrani mesec.</div>`;
}

function renderPortalTeamTimeline() {
  const target = document.getElementById("portalTeamTimelineList");
  if (!target) return;
  const plans = (state.companyPlans || [])
    .filter((plan) => String(plan.date || "").startsWith(portalMonth))
    .map((plan) => ({
      date: plan.date,
      type: plan.type,
      title: plan.title,
      note: plan.note,
      className: "ok",
    }));
  const absences = (state.employeeAbsences || [])
    .filter((absence) => absence.status === "Odobreno")
    .filter((absence) => dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(portalMonth)))
    .map((absence) => {
      const employee = (state.employees || []).find((item) => item.id === absence.employeeId);
      return {
        date: absence.startDate,
        type: absence.type,
        title: absence.employeeId === activeEmployee.id ? "Ti" : employee?.name || "Zaposleni",
        note: `${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}${absence.note ? ` · ${absence.note}` : ""}`,
        className: absence.type === "Bolovanje" ? "danger" : "warn",
      };
    });
  const rows = [...plans, ...absences].sort((a, b) => new Date(a.date) - new Date(b.date));
  target.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
          <div class="setup-item alert-item ${row.className}">
            <strong>${formatDate(row.date).slice(0, 5)}</strong>
            <span>${row.type} · ${row.title}<br />${row.note || ""}</span>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nema datuma ni odsustava za ovaj mesec.</div>`;
}

function renderPortalHourRows(logs) {
  const selectedDate = document.getElementById("portalHoursDateFilter")?.value || "";
  const visibleLogs = selectedDate ? logs.filter((log) => log.date === selectedDate) : logs;
  const totalMinutes = visibleLogs.reduce((sum, log) => sum + Number(log.minutes || Math.round(Number(log.hours || 0) * 60)), 0);
  const rows = visibleLogs
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (log) => `
      <article class="work-log-card">
        <header>
          <div>
            <strong>${formatDate(log.date)}</strong>
            <span>${Number(log.minutes || Math.round(Number(log.hours || 0) * 60))} min · ${log.locked === false ? "Otključano" : "Zaključano"}</span>
          </div>
        </header>
        <p><b>Aktivnost:</b> ${log.activityCategory || "Ostalo"} · ${log.activityName || "Rad"}</p>
        <p><b>Klijent:</b> ${log.clientName || "Nije naveden"}</p>
        <p><b>Napomena:</b> ${log.note || "-"}</p>
        <div class="work-log-feedback">
          <span><b>Pozitivno:</b> ${log.positive || "-"}</span>
          <span><b>Negativno:</b> ${log.negative || "-"}</span>
        </div>
      </article>`
    );
  setText("portalHoursCount", `${rows.length} unosa · ${formatHours(totalMinutes / 60)}h`);
  document.getElementById("portalHoursRows").innerHTML = rows.join("") || `<div class="empty-state">${selectedDate ? "Nema upisanih aktivnosti za izabrani datum." : "Još nema unetih sati za ovaj mesec."}</div>`;
}

function renderPortalAbsences() {
  const absences = employeeAbsences().sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  setText("portalAbsenceCount", `${absences.length} unosa`);
  document.getElementById("portalAbsenceList").innerHTML = absences.length
    ? absences
        .map((absence) => {
          const days = workdayKeysBetween(absence.startDate, absence.endDate).length;
          return `
          <div class="setup-item">
            <strong>${days}</strong>
            <span>${absence.type} · ${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}<br /><b>${absence.status || "Odobreno"}</b>${absence.note ? ` · ${absence.note}` : ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Još nema unetih odsustava.</div>`;
}

function renderPortalNotifications() {
  const notifications = employeeNotifications();
  const hiddenNotifications = hiddenEmployeeNotifications();
  setText("portalNotificationCount", `${notifications.length} aktivno`);
  document.getElementById("portalNotificationList").innerHTML = notifications.length
    ? notifications
        .map(
          (notification) => `
          <div class="setup-item alert-item ${notification.type === "danger" ? "danger" : notification.type === "warn" ? "warn" : "ok"}">
            <strong>!</strong>
            <span>${notification.title}<br />${String(notification.message || "").replace(/\s*Potvrdi u dashboardu\.?\s*$/i, "")}</span>
            <button class="mini-action" data-hide-notification="${notification.id}" type="button">Sakrij 7 dana</button>
          </div>`
        )
        .join("") +
      (hiddenNotifications.length
        ? `<div class="notification-archive">
          <strong>Sakrivena obaveštenja</strong>
          ${hiddenNotifications
            .map(
              (notification) => `
              <div class="setup-item">
                <span>${notification.title}<br />Sakriveno do ${formatDate(notification.hiddenUntil)}</span>
                <button class="mini-action" data-unhide-notification="${notification.id}" type="button">Vrati</button>
              </div>`
            )
            .join("")}
        </div>`
        : "")
    : `<div class="empty-state">Nema obaveštenja.</div>${
        hiddenNotifications.length
          ? `<div class="notification-archive">
          <strong>Sakrivena obaveštenja</strong>
          ${hiddenNotifications
            .map(
              (notification) => `
              <div class="setup-item">
                <span>${notification.title}<br />Sakriveno do ${formatDate(notification.hiddenUntil)}</span>
                <button class="mini-action" data-unhide-notification="${notification.id}" type="button">Vrati</button>
              </div>`
            )
            .join("")}
        </div>`
          : ""
      }`;
  document.querySelectorAll("[data-hide-notification]").forEach((button) => {
    button.addEventListener("click", () => hideNotification(button.dataset.hideNotification));
  });
  document.querySelectorAll("[data-unhide-notification]").forEach((button) => {
    button.addEventListener("click", () => unhideNotification(button.dataset.unhideNotification));
  });
}

function showEmployeeNotificationPopups() {
  if (!activeEmployee) return;
  const shown = JSON.parse(sessionStorage.getItem(`shownEmployeeNotifications-${activeEmployee.id}`) || "[]");
  const nextShown = new Set(shown);
  employeeNotifications()
    .filter((notification) => !isNotificationHidden(notification) && !nextShown.has(notification.id))
    .slice(0, 3)
    .forEach((notification) => {
      showToast(notification.title, String(notification.message || "").replace(/\s*Potvrdi u dashboardu\.?\s*$/i, ""), notification.type);
      nextShown.add(notification.id);
    });
  sessionStorage.setItem(`shownEmployeeNotifications-${activeEmployee.id}`, JSON.stringify([...nextShown].slice(-50)));
}

function renderLateAcknowledgement() {
  const dialog = document.getElementById("lateAckDialog");
  const content = document.getElementById("lateAckContent");
  const button = document.getElementById("ackLateBtn");
  if (!dialog || !content || !button || !activeEmployee) return;
  const record = (state.employeeLateRecords || [])
    .filter((item) => item.employeeId === activeEmployee.id && !item.acknowledgedAt)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  if (!record) {
    if (dialog.open) dialog.close();
    return;
  }
  const penalty = Math.max(15, Number(record.penaltyMinutes || record.minutes || 0));
  content.innerHTML = `
    <div class="setup-item alert-item warn">
      <strong>${record.minutes}m</strong>
      <span>${formatDate(record.date)}<br />Odbija se ${penalty} min · ${record.reason || "Bez razloga"}</span>
    </div>`;
  button.dataset.lateId = record.id;
  if (!dialog.open) dialog.showModal();
}

function renderPortalGoals() {
  const goals = employeeGoals().sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
  setText("portalGoalCount", `${goals.length} ciljeva`);
  document.getElementById("portalGoalList").innerHTML = goals.length
    ? goals
        .map((goal) => {
          const daysLeft = Math.ceil((new Date(`${goal.endDate}T23:59:59`) - new Date()) / 86400000);
          const isLate = goal.status !== "Završeno" && daysLeft < 0;
          const isNear = goal.status !== "Završeno" && daysLeft >= 0 && daysLeft <= 7;
          const status = isLate || goal.status === "Rizik" ? "danger" : goal.status === "Završeno" ? "ok" : "warn";
          const deadline = goal.status === "Završeno"
            ? `Završeno ${formatDate(goal.completedDate)}`
            : isLate ? `Kasni ${Math.abs(daysLeft)} dana` : isNear ? `Rok za ${daysLeft} dana` : `Rok ${formatDate(goal.endDate)}`;
          return `
          <div class="setup-item alert-item ${status} goal-progress-row" data-employee-goal-id="${goal.id}">
            <strong>${goal.progress || 0}%</strong>
            <span>${goal.category || "Razvoj"} · ${goal.title}<br />${goal.target || ""} · ${deadline}</span>
            <div class="employee-goal-progress"><input type="range" min="0" max="100" step="5" value="${goal.progress || 0}" aria-label="Progres za ${escapePortalText(goal.title)}" /><output>${goal.progress || 0}%</output><button class="secondary-button" type="button">Sačuvaj progres</button></div>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema unetih ciljeva.</div>`;
  const featured = goals
    .filter((goal) => goal.status !== "Završeno")
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))[0];
  setText("portalFeaturedGoalTitle", featured?.title || "Nema aktivnog cilja");
  setText("portalFeaturedGoalTarget", featured?.target || "Admin ili tvoj lider mogu da dodaju razvojni cilj.");
  setText("portalFeaturedGoalDeadline", featured ? formatDate(featured.endDate) : "-");
  const featuredProgress = document.getElementById("portalFeaturedGoalProgress");
  if (featuredProgress) featuredProgress.style.width = `${Math.min(100, Math.max(0, Number(featured?.progress || 0)))}%`;
  setText("portalContributionGoals", goals.filter((goal) => goal.status === "Završeno" && String(goal.completedDate || "").startsWith(portalMonth)).length);
  renderPortalRatings();
}

function renderPortalRatings() {
  const ratings = (state.employeeRatings || []).filter((rating) => rating.employeeId === activeEmployee.id);
  const monthly = ratings.reduce((groups, rating) => {
    groups[rating.month] = groups[rating.month] || [];
    groups[rating.month].push(rating);
    return groups;
  }, {});
  const months = Object.keys(monthly).sort().slice(-6);
  const current = monthly[portalMonth] || [];
  const owner = current.filter((item) => item.source === "Vlasnik");
  const clients = current.filter((item) => item.source === "Klijent");
  const ownerAverage = owner.length ? owner.reduce((sum, item) => sum + Number(item.score || 0), 0) / owner.length : null;
  const clientAverage = clients.length ? clients.reduce((sum, item) => sum + Number(item.score || 0), 0) / clients.length : null;
  const combined = ownerAverage !== null && clientAverage !== null ? (ownerAverage + clientAverage) / 2 : ownerAverage ?? clientAverage;
  setText("portalRatingAverage", combined !== null ? `${combined.toFixed(1)}/5` : "Nema ocene");
  setText("portalMotivationRating", combined !== null ? `${combined.toFixed(1)}/5` : "Bez ocene");
  setText("portalContributionRatings", combined !== null ? `${combined.toFixed(1)}/5` : "Bez ocene");
  setText("portalContributionLate", employeeLateRecords().filter((item) => String(item.date || "").startsWith(portalMonth)).length ? "Ne" : "Da");
  const trend = document.getElementById("portalRatingTrend");
  if (trend) trend.innerHTML = months.length
    ? months.map((month) => {
        const items = monthly[month];
        const value = items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length;
        return `<div class="rating-bar"><span style="height:${value * 20}%"></span><small>${month.slice(5)}<br />${value.toFixed(1)}</small></div>`;
      }).join("")
    : `<div class="empty-state">Ocene će se prikazivati iz meseca u mesec.</div>`;
  const list = document.getElementById("portalRatingList");
  if (list) list.innerHTML = current.length
    ? current.map((rating) => `<div class="setup-item rating-row"><strong>${rating.score}/5</strong><span>${rating.source}${rating.reviewer ? ` · ${rating.reviewer}` : ""}<br />${rating.note || "Bez komentara"}</span></div>`).join("")
    : "";
  renderPortalRecognitions();
}

function renderPortalRecognitions() {
  const rows = (state.employeeRecognitions || [])
    .filter((item) => item.employeeId === activeEmployee.id && item.month === portalMonth)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  setText("portalRecognitionCount", `${rows.length} poruka`);
  const target = document.getElementById("portalRecognitionList");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows.map((item) => `<div class="setup-item recognition-row ${item.type === "Pohvala" ? "ok" : "warn"}"><strong>${item.type === "Pohvala" ? "+" : "→"}</strong><span><b>${item.type}</b> · ${item.author}<br />${item.text}</span></div>`).join("")
    : `<div class="empty-state">Nema poruke za ovaj mesec.</div>`;
}

function renderPortalOneOnOnes() {
  const notes = employeeOneOnOnes().sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById("portalOneOnOneList").innerHTML = notes.length
    ? notes
        .map(
          (note) => `
          <details class="setup-item one-on-one-card">
            <summary><strong>${escapePortalText(note.title || "1:1")}</strong><span>${formatDate(note.date)}</span></summary>
            ${oneOnOneContent(note.note)}
          </details>`
        )
        .join("")
    : `<div class="empty-state">Nema 1:1 beleški.</div>`;
}

function renderPortalLateRecords() {
  const list = document.getElementById("portalLateList");
  if (!list) return;
  const records = employeeLateRecords().sort((a, b) => new Date(b.date) - new Date(a.date));
  const lateStatus = employeeLateStatus(activeEmployee.id, portalMonth);
  setText("portalLateCount", lateStatus.label);
  list.innerHTML = records.length
    ? records
        .map(
          (record) => {
            const penalty = Math.max(15, Number(record.penaltyMinutes || record.minutes || 0));
            return `
          <div class="setup-item alert-item warn">
            <strong>${record.minutes}m</strong>
            <span>${formatDate(record.date)}<br />Odbija se ${penalty} min · ${record.acknowledgedAt ? "potvrđeno" : "čeka potvrdu"}${record.reason ? ` · ${record.reason}` : ""}</span>
          </div>`;
          }
        )
        .join("")
    : `<div class="empty-state">Nema upisanih kašnjenja u ovom mesecu.</div>`;
}

function renderPortalCompanyPlan() {
  const plans = (state.companyPlans || [])
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);
  setText("portalCompanyPlanCount", `${plans.length} unosa`);
  document.getElementById("portalCompanyPlanList").innerHTML = plans.length
    ? plans
        .map(
          (plan) => `
          <div class="setup-item">
            <strong>${formatDate(plan.date).slice(0, 5)}</strong>
            <span>${plan.type}: ${plan.title}<br />${plan.note}</span>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nema plana firme.</div>`;
}

function renderLeaderPanel() {
  const panel = document.getElementById("leaderPanel");
  if (!panel) return;
  const team = leaderTeam();
  panel.hidden = !activeEmployee.isLeader;
  if (!activeEmployee.isLeader) return;
  setText("leaderTeamCount", `${team.length} osoba`);
  const available = team;
  document.getElementById("leaderAssignmentList").innerHTML = available.length
    ? available
        .map((employee) => {
          const assigned = employee.leaderId === activeEmployee.id;
          return `
          <div class="setup-item leader-assignment-row">
            <strong>${assigned ? "✓" : "+"}</strong>
            <span>${employee.name}<br />${employee.position || "Pozicija nije uneta"}${employee.leaderId && !assigned ? " · ima drugog lidera" : ""}</span>
            <button class="secondary-button leader-assign-btn" data-employee-id="${employee.id}" type="button">${assigned ? "Ukloni" : "Dodaj"}</button>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema drugih zaposlenih.</div>`;

  document.querySelectorAll(".leader-assign-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const employee = (state.employees || []).find((item) => item.id === button.dataset.employeeId);
      if (!employee) return;
      employee.leaderId = employee.leaderId === activeEmployee.id ? "" : activeEmployee.id;
      saveState();
      renderEmployeePortal();
    });
  });

  document.getElementById("leaderTeamHoursList").innerHTML = team.length
    ? team
        .map((employee) => {
          const hours = employeeMonthHours(employee, portalMonth);
          const expected = expectedHours(employee, portalMonth);
          const balance = hourBalance(employee, portalMonth);
          const lateStatus = employeeLateStatus(employee.id, portalMonth);
          return `
          <div class="setup-item alert-item employee-hours-row ${balance < 0 || lateStatus.count > 3 ? "danger" : lateStatus.count === 3 ? "warn" : "ok"}">
            <strong>${formatHourBalance(balance)}</strong>
            <span>${employee.name}<br />${formatHours(hours)}h od ${formatHours(expected)}h · ${lateStatus.label}<br />${carryoverLabel(employee, portalMonth)}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema zaposlenih ispod ovog lidera.</div>`;
  const teamIds = new Set(team.map((employee) => employee.id));
  const leaderGoalEmployee = document.getElementById("leaderGoalEmployee");
  if (leaderGoalEmployee) {
    const selectedEmployeeId = leaderGoalEmployee.value;
    leaderGoalEmployee.innerHTML = `<option value="">Izaberi zaposlenog</option>${team.map((employee) => `<option value="${employee.id}">${escapePortalText(employee.name)}</option>`).join("")}`;
    if (teamIds.has(selectedEmployeeId)) leaderGoalEmployee.value = selectedEmployeeId;
  }
  const leaderGoalForm = document.getElementById("leaderGoalForm");
  if (leaderGoalForm) {
    const startDate = leaderGoalForm.elements.startDate;
    const endDate = leaderGoalForm.elements.endDate;
    if (startDate && !startDate.value) startDate.value = currentDateKey();
    if (endDate && !endDate.value) endDate.value = currentDateKey();
  }
  const teamGoals = (state.employeeGoals || [])
    .filter((goal) => teamIds.has(goal.employeeId))
    .sort((a, b) => String(b.endDate || "").localeCompare(String(a.endDate || "")));
  setText("leaderGoalsCount", `${teamGoals.length} ciljeva`);
  document.getElementById("leaderGoalsList").innerHTML = teamGoals.length
    ? teamGoals.map((goal) => {
        const employee = (state.employees || []).find((item) => item.id === goal.employeeId);
        const progress = Math.max(0, Math.min(100, Number(goal.progress || 0)));
        return `<div class="setup-item leader-goal-card"><strong>${progress}%</strong><span><b>${escapePortalText(employee?.name || "Zaposleni")} · ${escapePortalText(goal.title || "Cilj")}</b><br />${escapePortalText(goal.target || "Bez dodatnog opisa")} · rok ${formatDate(goal.endDate)}<div class="leader-goal-progress"><div class="progress-track"><span style="width:${progress}%"></span></div><b>${escapePortalText(goal.status || "U toku")}</b></div></span></div>`;
      }).join("")
    : `<div class="empty-state">Zaposleni ispod tebe trenutno nemaju ciljeve.</div>`;
  const activityDateFilter = document.getElementById("leaderActivityDateFilter");
  if (activityDateFilter?.value && !activityDateFilter.value.startsWith(portalMonth)) activityDateFilter.value = "";
  const selectedActivityDate = activityDateFilter?.value || "";
  const monthTeamLogs = (state.employeeWorkLogs || [])
    .filter((log) => teamIds.has(log.employeeId) && String(log.date || "").startsWith(portalMonth))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const teamLogs = selectedActivityDate
    ? monthTeamLogs.filter((log) => log.date === selectedActivityDate)
    : monthTeamLogs;
  const teamLogMinutes = teamLogs.reduce((sum, log) => sum + Number(log.minutes || Number(log.hours || 0) * 60), 0);
  setText("leaderActivitySummary", `${teamLogs.length} aktivnosti · ${formatHours(teamLogMinutes / 60)}h`);
  document.getElementById("leaderActivityLogList").innerHTML = teamLogs.length
    ? teamLogs
        .map((log) => {
          const employee = (state.employees || []).find((item) => item.id === log.employeeId);
          const minutes = Number(log.minutes || Number(log.hours || 0) * 60);
          return `
          <div class="setup-item activity-log-row">
            <strong>${formatNumber(minutes)} min</strong>
            <span>${employee?.name || "Zaposleni"} · ${log.activityName || "Aktivnost"}<br /><b>Klijent: ${log.clientName || "Bez klijenta"}</b> · ${formatDate(log.date)}${log.note ? ` · ${log.note}` : ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema upisanih aktivnosti za ${selectedActivityDate ? "izabrani dan" : "izabrani mesec"}.</div>`;
  const absences = (state.employeeAbsences || [])
    .filter((absence) => teamIds.has(absence.employeeId) && dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(portalMonth)))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 8);
  document.getElementById("leaderTeamAbsenceList").innerHTML = absences.length
    ? absences
        .map((absence) => {
          const employee = (state.employees || []).find((item) => item.id === absence.employeeId);
          return `
          <div class="setup-item alert-item ${absence.type === "Bolovanje" ? "danger" : "warn"}">
            <strong>${formatDate(absence.startDate).slice(0, 5)}</strong>
            <span>${employee?.name || "Zaposleni"} · ${absence.type}<br />${formatDate(absence.startDate)} - ${formatDate(absence.endDate)} · ${absence.status || ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema odsustava u ovom mesecu.</div>`;

  const oneOnOnes = (state.employeeOneOnOnes || [])
    .filter((note) => teamIds.has(note.employeeId) && note.visibleToEmployee !== false)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  document.getElementById("leaderOneOnOneList").innerHTML = oneOnOnes.length
    ? oneOnOnes
        .map((note) => {
          const employee = (state.employees || []).find((item) => item.id === note.employeeId);
          return `
          <div class="setup-item activity-log-row">
            <strong>${formatDate(note.date).slice(0, 5)}</strong>
            <span>${employee?.name || "Zaposleni"} · ${note.title || "1:1"}<br />${note.note || ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema 1:1 beleški za tim.</div>`;

  const reports = (state.employeeReports || [])
    .filter((report) => report.isFinalDailyReport === true && String(report.date || "").startsWith(portalMonth) && (teamIds.has(report.employeeId) || report.recipientId === activeEmployee.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  document.getElementById("leaderReportList").innerHTML = reports.length
    ? reports
        .map((report) => {
          const employee = (state.employees || []).find((item) => item.id === report.employeeId);
          const minutes = Number(report.minutes || Number(report.hours || 0) * 60);
          return `
          <div class="setup-item leader-report-card">
            <strong>${formatNumber(minutes)} min</strong>
            <span><b>${employee?.name || "Zaposleni"} · ${formatDate(report.date)}</b><br />${report.note || "Bez rezimea"}<br />+ ${report.positive || "-"}<br />- ${report.negative || "-"}<br />${report.acknowledgedAt ? `<small>✓ Pročitano ${formatDateTime(report.acknowledgedAt)}</small>` : `<button class="secondary-button leader-report-ack" data-report-id="${report.id}" type="button">Potvrđujem da sam pročitao</button>`}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema izveštaja za tim.</div>`;
  const unreadReports = reports.filter((report) => !report.acknowledgedAt);
  renderLeaderReportInbox(unreadReports);
  document.querySelectorAll(".leader-report-ack").forEach((button) => {
    button.addEventListener("click", () => acknowledgeLeaderReport(button.dataset.reportId, button));
  });
}

function renderLeaderReportInbox(reports) {
  const dialog = document.getElementById("leaderReportsDialog");
  const list = document.getElementById("leaderUnreadReportList");
  if (!dialog || !list) return;
  list.innerHTML = reports.map((report) => {
    const employee = (state.employees || []).find((item) => item.id === report.employeeId);
    return `<div class="setup-item leader-report-card"><strong>${formatDate(report.date).slice(0, 5)}</strong><span><b>${employee?.name || "Zaposleni"}</b><br />${report.note || "Bez rezimea"}<br />+ ${report.positive || "-"}<br />- ${report.negative || "-"}<br /><button class="primary-button leader-report-ack" data-report-id="${report.id}" type="button">Potvrđujem da sam pročitao</button></span></div>`;
  }).join("");
  if (reports.length && !leaderReportInboxShown) {
    leaderReportInboxShown = true;
    window.setTimeout(() => { if (!dialog.open) dialog.showModal(); }, 250);
  }
}

async function acknowledgeLeaderReport(reportId, button) {
  if (!reportId || !activeEmployee?.id) return;
  button.disabled = true;
  button.textContent = "Čuvanje...";
  let result = { ok: false, error: "Potvrda nije sačuvana." };
  try {
    const response = await fetch("/api/employee-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge", reportId, leaderId: activeEmployee.id }),
    });
    result = await response.json().catch(() => ({}));
    result.ok = response.ok && result.ok;
  } catch (error) {
    result = { ok: false, error: error?.message || "Potvrda nije sačuvana." };
  }
  if (!result.ok) {
    button.disabled = false;
    button.textContent = "Potvrđujem da sam pročitao";
    showToast("Nije potvrđeno", result.error || "Pokušaj ponovo.", "danger");
    return;
  }
  const report = (state.employeeReports || []).find((item) => item.id === reportId);
  if (report) Object.assign(report, result.report || {});
  saveState({ remote: false });
  renderLeaderPanel();
  const remaining = (state.employeeReports || []).filter((item) => item.isFinalDailyReport === true && item.recipientId === activeEmployee.id && !item.acknowledgedAt).length;
  if (!remaining) document.getElementById("leaderReportsDialog")?.close();
  showToast("Potvrđeno", "Sačuvano je da si pročitao/la izveštaj.", "ok");
}

document.getElementById("employeeLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const submitButton = form.querySelector('button[type="submit"]');
  const errorMessage = document.getElementById("employeeLoginError");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Prijavljivanje...";
  }
  if (errorMessage) errorMessage.hidden = true;
  let response;
  let result = {};
  try {
    response = await fetch("/api/employee-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    result = await response.json().catch(() => ({}));
    if (response.ok && result.employee) {
      activeEmployee = state.employees.find((employee) =>
        employee.id === result.employee.id || String(employee.email || "").toLowerCase() === result.employee.email
      );
      if (!activeEmployee) {
        await waitForOnlineHydration();
        activeEmployee = state.employees.find((employee) =>
          employee.id === result.employee.id || String(employee.email || "").toLowerCase() === result.employee.email
        );
      }
    }
  } catch {
    result = { error: "Veza sa bazom trenutno nije dostupna. Proveri internet i pokušaj ponovo." };
  }
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Uloguj se";
  }
  if (!activeEmployee || !result.token) {
    if (errorMessage) {
      errorMessage.textContent = result.error || "Login podaci nisu tačni. Pokušaj ponovo.";
      errorMessage.hidden = false;
    }
    return;
  }
  if (errorMessage) errorMessage.hidden = true;
  setEmployeeSession(activeEmployee, result.token, result.expiresAt);
  if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  document.getElementById("employeeLoginScreen").hidden = true;
  document.getElementById("employeeApp").hidden = false;
  renderEmployeePortal();
  setupDailyMinuteProgress();
  setupPauseActivityEntry();
});

document.querySelectorAll("[data-employee-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-employee-tab]").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".client-tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.employeeTab).classList.add("active");
    setText("employeePageTitle", button.textContent);
  });
});

document.getElementById("employeePortalMonth")?.addEventListener("input", (event) => {
  portalMonth = event.target.value || currentMonthKey();
  const dateFilter = document.getElementById("portalHoursDateFilter");
  if (dateFilter?.value && !dateFilter.value.startsWith(portalMonth)) dateFilter.value = "";
  renderEmployeePortal();
});

document.getElementById("portalHoursDateFilter")?.addEventListener("input", () => {
  renderPortalHourRows(employeeWorkLogs(portalMonth));
});

document.getElementById("portalHoursDateReset")?.addEventListener("click", () => {
  const dateFilter = document.getElementById("portalHoursDateFilter");
  if (dateFilter) dateFilter.value = "";
  renderPortalHourRows(employeeWorkLogs(portalMonth));
});

document.getElementById("leaderActivityDateFilter")?.addEventListener("input", () => {
  renderLeaderPanel();
});

document.getElementById("leaderActivityDateReset")?.addEventListener("click", () => {
  const dateFilter = document.getElementById("leaderActivityDateFilter");
  if (dateFilter) dateFilter.value = "";
  renderLeaderPanel();
});

document.getElementById("leaderGoalForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const employeeId = String(formData.get("employeeId") || "");
  if (!leaderTeam().some((employee) => employee.id === employeeId)) {
    showToast("Cilj nije dodat", "Možeš dodati cilj samo zaposlenom koji je dodeljen tebi.", "danger");
    return;
  }
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  if (startDate > endDate) {
    showToast("Proveri datume", "Početni datum ne može biti posle krajnjeg datuma.", "warn");
    return;
  }
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Čuvanje...";
  }
  let result = { ok: false, error: "Online čuvanje nije uspelo." };
  try {
    const response = await fetch("/api/leader-goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: getEmployeeSession()?.token || "",
        leaderId: activeEmployee.id,
        employeeId,
        category: String(formData.get("category") || "Razvoj"),
        title: String(formData.get("title") || "").trim(),
        target: String(formData.get("target") || "").trim(),
        startDate,
        endDate,
      }),
    });
    result = await response.json().catch(() => ({}));
    result.ok = response.ok && result.ok;
  } catch (error) {
    result = { ok: false, error: error?.message || "Online čuvanje nije uspelo." };
  }
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Dodaj cilj zaposlenom";
  }
  if (!result.ok) {
    showToast("Cilj nije dodat", result.error || "Pokušaj ponovo.", "danger");
    return;
  }
  state.employeeGoals = (state.employeeGoals || []).filter((goal) => goal.id !== result.goal.id);
  state.employeeGoals.unshift(result.goal);
  if (result.notification) {
    state.notifications = (state.notifications || []).filter((notification) => notification.id !== result.notification.id);
    state.notifications.unshift(result.notification);
  }
  saveState({ remote: false });
  form.reset();
  renderEmployeePortal();
  showToast("Cilj dodat", "Zaposleni ga sada vidi i može da ažurira procenat.", "ok");
});

document.getElementById("portalActivitySearch")?.addEventListener("focus", () => {
  renderPortalActivityOptions();
  setPortalActivityOptionsOpen(true);
});

document.getElementById("portalActivitySearch")?.addEventListener("input", () => {
  const activityIdInput = document.getElementById("portalActivityId");
  if (activityIdInput) activityIdInput.value = "";
  renderPortalActivityOptions();
  setPortalActivityOptionsOpen(true);
});

document.getElementById("portalActivityOptions")?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-activity-id]");
  if (!option) return;
  const activity = (state.employeeActivities || []).find((item) => item.id === option.dataset.activityId);
  if (!activity) return;
  const activityInput = document.getElementById("portalActivitySearch");
  const activityIdInput = document.getElementById("portalActivityId");
  activityInput.value = activity.name;
  activityIdInput.value = activity.id;
  activityIdInput.dispatchEvent(new Event("change", { bubbles: true }));
  setPortalActivityOptionsOpen(false);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".activity-combobox")) setPortalActivityOptionsOpen(false);
});

function clearPortalHoursForm(form) {
  form.reset();
  ["date", "minutes", "note", "positive", "negative", "clientId"].forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (field) field.value = "";
  });
  const activitySearch = document.getElementById("portalActivitySearch");
  if (activitySearch) activitySearch.value = "";
  const activityIdInput = document.getElementById("portalActivityId");
  if (activityIdInput) {
    activityIdInput.value = "";
    activityIdInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
  setPortalActivityOptionsOpen(false);
}

function hasFinalDailyReport(date) {
  return (state.employeeReports || []).some((report) => report.employeeId === activeEmployee.id && report.date === date && report.isFinalDailyReport === true);
}

function openDailyReportDialog(date) {
  const dialog = document.getElementById("dailyReportDialog");
  const form = document.getElementById("dailyReportForm");
  if (!dialog || !form || !date || hasFinalDailyReport(date)) return;
  form.dataset.reportDate = date;
  form.reset();
  setText("dailyReportDateLabel", `Izveštaj za ${formatDate(date)} biće vidljiv tvom lideru.`);
  if (!dialog.open) dialog.showModal();
}

function restorePortalHoursForm(form, values) {
  ["date", "minutes", "note", "positive", "negative", "clientId"].forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (field) field.value = values[fieldName] || "";
  });
  const activitySearch = document.getElementById("portalActivitySearch");
  if (activitySearch) activitySearch.value = values.activityName || "";
  const activityIdInput = document.getElementById("portalActivityId");
  if (activityIdInput) {
    activityIdInput.value = values.activityId || "";
    activityIdInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

document.getElementById("portalHoursForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const date = String(formData.get("date") || "");
  const activity = (state.employeeActivities || []).find((item) => item.id === formData.get("activityId"));
  const client = (state.clients || []).find((item) => item.id === formData.get("clientId"));
  const minutes = Math.max(1, parseNumber(formData.get("minutes"), 0));
  if (!activity) {
    alert("Izaberi aktivnost. Admin mora prvo da doda ponuđene aktivnosti.");
    return;
  }
  const isPause = String(activity.name || "").trim().toLowerCase() === "pauza";
  if (!isPause && !client) {
    alert("Izaberi klijenta za kog si radio/la ovu aktivnost.");
    return;
  }
  const submittedFormValues = {
    date,
    activityId: activity.id,
    activityName: activity.name,
    clientId: client?.id || "",
    minutes: String(formData.get("minutes") || ""),
    note: String(formData.get("note") || ""),
    positive: "",
    negative: "",
  };
  const previousState = cloneState(state);
  const employeeId = activeEmployee.id;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Čuvanje...";
  }
  clearPortalHoursForm(form);
  const workLog = {
    id: createId(),
    employeeId: activeEmployee.id,
    date,
    hours: Math.round((minutes / 60) * 10000) / 10000,
    minutes,
    activityId: activity.id,
    activityName: activity.name,
    activityCategory: activity.category || "Ostalo",
    clientId: client?.id || "",
    clientName: client?.name || "",
    type: "Rad",
    note: formData.get("note"),
    positive: "",
    negative: "",
    locked: true,
    submittedAt: new Date().toISOString(),
  };
  const recipientId = reportRecipientId();
  let saveResult = { ok: false, error: "Online čuvanje nije uspelo." };
  try {
    const response = await fetch("/api/employee-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workLog, recipientId, updateReport: false }),
    });
    const data = await response.json().catch(() => ({}));
    saveResult = { ok: response.ok && data.ok, error: data.error || "" };
  } catch (error) {
    saveResult = { ok: false, error: error?.message || "Online čuvanje nije uspelo." };
  }
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Sačuvaj sate";
  }
  if (!saveResult?.ok) {
    state = previousState;
    activeEmployee = (state.employees || []).find((employee) => employee.id === employeeId) || activeEmployee;
    saveState({ remote: false });
    renderEmployeePortal();
    restorePortalHoursForm(form, submittedFormValues);
    showToast("Nije sačuvano", saveResult?.error || "Online baza nije potvrdila upis. Pokušaj ponovo.", "danger");
    return;
  }
  state.employeeWorkLogs = (state.employeeWorkLogs || []).filter((log) => log.id !== workLog.id);
  state.employeeWorkLogs.unshift(workLog);
  saveState({ remote: false });
  renderPortalHourRows(employeeWorkLogs(portalMonth));
  renderPortalCalendar();
  window.refreshDailyMinuteProgress?.();
  clearPortalHoursForm(form);
  showToast("Sačuvano", "Sati su sačuvani.", "ok");
  const expectedMinutes = expectedMinutesForDate(activeEmployee, date);
  if (expectedMinutes > 0 && loggedMinutesForDate(date) >= expectedMinutes && !hasFinalDailyReport(date)) {
    window.setTimeout(() => openDailyReportDialog(date), 250);
  }
});

document.getElementById("closeDailyReportDialog")?.addEventListener("click", () => {
  document.getElementById("dailyReportDialog")?.close();
});

document.getElementById("dailyReportLater")?.addEventListener("click", () => {
  document.getElementById("dailyReportDialog")?.close();
  showToast("Izveštaj nije poslat", "Dugme za izveštaj ostaje u delu Vreme za taj datum.", "warn");
});

document.getElementById("dailyReportForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const date = form.dataset.reportDate || "";
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Slanje...";
  }
  let result = { ok: false, error: "Online čuvanje nije uspelo." };
  try {
    const response = await fetch("/api/employee-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: activeEmployee.id,
        recipientId: reportRecipientId(),
        date,
        note: String(formData.get("summary") || "").trim(),
        positive: String(formData.get("positive") || "").trim(),
        negative: String(formData.get("negative") || "").trim(),
      }),
    });
    result = await response.json().catch(() => ({}));
    result.ok = response.ok && result.ok;
  } catch (error) {
    result = { ok: false, error: error?.message || "Online čuvanje nije uspelo." };
  }
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Pošalji lideru";
  }
  if (!result.ok) {
    showToast("Izveštaj nije poslat", result.error || "Pokušaj ponovo.", "danger");
    return;
  }
  state.employeeReports = (state.employeeReports || []).filter((report) => !(report.employeeId === activeEmployee.id && report.date === date && report.isFinalDailyReport === true));
  state.employeeReports.unshift(result.report);
  saveState({ remote: false });
  document.getElementById("dailyReportDialog")?.close();
  renderEmployeePortal();
  showToast("Izveštaj poslat", "Dnevni izveštaj je sada vidljiv lideru.", "ok");
});

document.getElementById("portalAbsenceForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || startDate);
  const absence = {
    id: createId(),
    employeeId: activeEmployee.id,
    type: formData.get("type"),
    startDate: startDate <= endDate ? startDate : endDate,
    endDate: endDate >= startDate ? endDate : startDate,
    note: formData.get("note"),
    status: "Zatraženo",
    requestedAt: new Date().toISOString(),
  };
  state.employeeAbsences.unshift(absence);
  notifyOnce({
    key: `absence-request-${absence.id}`,
    scope: "admin",
    type: "warn",
    title: "Zahtev za odmor",
    message: `${activeEmployee.name} traži ${absence.type} od ${formatDate(absence.startDate)} do ${formatDate(absence.endDate)}.`,
  });
  saveState();
  event.currentTarget.reset();
  renderEmployeePortal();
  showToast("Zahtev poslat", "Admin će videti zahtev za odmor.", "warn");
});

document.getElementById("ackLateBtn")?.addEventListener("click", () => {
  const record = (state.employeeLateRecords || []).find((item) => item.id === document.getElementById("ackLateBtn").dataset.lateId);
  if (!record) return;
  record.acknowledgedAt = new Date().toISOString();
  saveState();
  document.getElementById("lateAckDialog")?.close();
  renderEmployeePortal();
  showToast("Potvrđeno", "Kašnjenje je potvrđeno.", "ok");
});

document.getElementById("logoutEmployee")?.addEventListener("click", () => {
  localStorage.removeItem(employeeSessionKey);
  document.documentElement.classList.remove("employee-session-cached");
  activeEmployee = null;
  leaderReportInboxShown = false;
  document.getElementById("employeeApp").hidden = true;
  document.getElementById("employeeLoginScreen").hidden = false;
  document.getElementById("employeeLoginForm").reset();
});

document.getElementById("closeLeaderReportsDialog")?.addEventListener("click", () => {
  document.getElementById("leaderReportsDialog")?.close();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

function syncEmployeeInstallButton() {
  const button = document.getElementById("installEmployeeAppBtn");
  if (!button) return;
  const installed = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  button.hidden = installed;
}

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  syncEmployeeInstallButton();
});

syncEmployeeInstallButton();

document.getElementById("installEmployeeAppBtn")?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    const dialog = document.getElementById("employeeInstallDialog");
    const title = document.getElementById("employeeInstallDialogTitle");
    const steps = document.getElementById("employeeInstallDialogSteps");
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!dialog || !title || !steps) return;
    title.textContent = isIOS ? "Dodaj na početni ekran" : "Instaliraj Marketizo app";
    steps.innerHTML = isIOS
      ? `<div><strong>1</strong><span>Otvori ovu stranicu u <b>Safariju</b>.</span></div>
         <div><strong>2</strong><span>Pritisni dugme <b>Deli</b> pri dnu ekrana.</span></div>
         <div><strong>3</strong><span>Izaberi <b>Dodaj na početni ekran</b>, pa potvrdi sa <b>Dodaj</b>.</span></div>`
      : `<div><strong>1</strong><span>Otvori meni browsera <b>⋮</b>.</span></div>
         <div><strong>2</strong><span>Izaberi <b>Instaliraj aplikaciju</b> ili <b>Dodaj na početni ekran</b>.</span></div>
         <div><strong>3</strong><span>Potvrdi instalaciju. Marketizo će se pojaviti među aplikacijama.</span></div>`;
    dialog.showModal();
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  syncEmployeeInstallButton();
});

function closeEmployeeInstallGuide() {
  document.getElementById("employeeInstallDialog")?.close();
}

document.getElementById("closeEmployeeInstallDialog")?.addEventListener("click", closeEmployeeInstallGuide);
document.getElementById("confirmEmployeeInstallGuide")?.addEventListener("click", closeEmployeeInstallGuide);
document.getElementById("employeeInstallDialog")?.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeEmployeeInstallGuide();
});

document.querySelectorAll("[data-dashboard-section-button]").forEach((button) => {
  button.addEventListener("click", () => {
    const dashboard = document.getElementById("employeeDashboard");
    if (!dashboard) return;
    dashboard.dataset.dashboardSection = button.dataset.dashboardSectionButton;
    document.querySelectorAll("[data-dashboard-section-button]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.getElementById("portalGoalList")?.addEventListener("input", (event) => {
  const row = event.target.closest("[data-employee-goal-id]");
  if (!row || event.target.type !== "range") return;
  row.querySelector("output").textContent = `${event.target.value}%`;
});

document.getElementById("portalGoalList")?.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-employee-goal-id]");
  if (!row || event.target.tagName !== "BUTTON") return;
  const goal = (state.employeeGoals || []).find((item) => item.id === row.dataset.employeeGoalId && item.employeeId === activeEmployee.id);
  if (!goal) return;
  const previous = { progress: goal.progress, status: goal.status, completedDate: goal.completedDate };
  goal.progress = Number(row.querySelector('input[type="range"]').value);
  goal.status = goal.progress >= 100 ? "Završeno" : "U toku";
  goal.completedDate = goal.progress >= 100 ? (goal.completedDate || currentDateKey()) : "";
  const result = await saveState();
  if (!result?.ok) {
    Object.assign(goal, previous);
    renderEmployeePortal();
    return showToast("Nije sačuvano", result?.error || "Online baza nije potvrdila progres.", "danger");
  }
  renderEmployeePortal();
  showToast("Progres sačuvan", `${goal.title}: ${goal.progress}%`, "ok");
});

window.addEventListener("storage", (event) => {
  if (event.key !== "agencyCrmData" || !activeEmployee) return;
  state = loadState();
  renderEmployeePortal();
});

document.querySelectorAll('input[type="date"], input[type="month"]').forEach((input) => {
  input.addEventListener("click", () => input.showPicker?.());
});

setupPasswordToggles();
if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
renderLoginHint();
const initialEmployeeSession = getEmployeeSession();
showCachedEmployeeSession(initialEmployeeSession);
onlineHydrationPromise = hydrateOnlineState();
(async () => {
  let restored = false;
  if (initialEmployeeSession?.token) {
    await Promise.race([
      onlineHydrationPromise,
      new Promise((resolve) => window.setTimeout(resolve, 500)),
    ]).catch(() => null);
    restored = await restoreEmployeeSession();
  }
  if (!restored) {
    document.documentElement.classList.remove("employee-session-cached");
    document.getElementById("employeeApp").hidden = true;
    document.getElementById("employeeLoginScreen").hidden = false;
  }
  await onlineHydrationPromise.catch(() => null);
  window.MarketizoRemote?.startPolling((payload) => {
    const activeId = activeEmployee?.id;
    state = loadState(payload);
    activeEmployee = (state.employees || []).find((employee) => employee.id === activeId) || activeEmployee;
    if (activeEmployee) renderEmployeePortal();
  });
})().catch(() => {
  document.documentElement.classList.remove("employee-session-cached");
  document.getElementById("employeeApp").hidden = true;
  document.getElementById("employeeLoginScreen").hidden = false;
});

// Keep employee navigation functional after portal content is rendered or refreshed.
document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-employee-tab]");
  if (!button) return;
  const target = document.getElementById(button.dataset.employeeTab);
  if (!target) return;
  document.querySelectorAll("[data-employee-tab]").forEach((item) => item.classList.toggle("active", item === button));
  document.querySelectorAll(".client-tab").forEach((item) => item.classList.toggle("active", item === target));
  setText("employeePageTitle", button.textContent.trim());
});
