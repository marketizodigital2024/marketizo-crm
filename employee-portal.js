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
const employeeSessionKey = "marketizoEmployeeSession";
const employeeSessionDuration = 24 * 60 * 60 * 1000;

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
  localStorage.setItem(
    employeeSessionKey,
    JSON.stringify({
      employeeId: employee.id,
      email: String(employee.email || "").toLowerCase(),
      token,
      expiresAt: Number(expiresAt || (Date.now() + employeeSessionDuration)),
    })
  );
}

async function restoreEmployeeSession() {
  const session = getEmployeeSession();
  if (!session?.token) return false;
  const response = await fetch("/api/employee-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "validate", token: session.token }),
  });
  if (!response.ok) {
    localStorage.removeItem(employeeSessionKey);
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
    id: employee.id || crypto.randomUUID(),
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
    id: log.id || crypto.randomUUID(),
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
    id: activity.id || crypto.randomUUID(),
    name: activity.name || "Aktivnost",
    category: activity.category || "Ostalo",
    active: activity.active !== false,
  }));
  if (!data.employeeActivities.some((activity) => String(activity.name || "").toLowerCase() === "pauza")) {
    data.employeeActivities.push({ id: "activity-pause", name: "Pauza", category: "Interno", active: true });
  }
  data.employeeDocuments = (data.employeeDocuments || []).map((documentItem) => ({
    id: documentItem.id || crypto.randomUUID(),
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
    id: record.id || crypto.randomUUID(),
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
  if (options.remote !== false) window.MarketizoRemote?.save(state);
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
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
  return openingUsed + employeeAbsences(type).filter((absence) => absence.status !== "Zatraženo").reduce((sum, absence) => {
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
    .filter((absence) => absence.employeeId === employeeId && absence.status !== "Zatraženo")
    .reduce((sum, absence) => {
      const days = workdayKeysBetween(absence.startDate, absence.endDate).filter((day) => day.startsWith(monthKey));
      return sum + days.length;
    }, 0);
}

function expectedHours(employee, monthKey) {
  const weeklyHours = parseNumber(employee.weeklyHoursByMonth?.[monthKey] ?? employee.weeklyHours ?? 40, 40);
  const dailyHours = weeklyHours / 5;
  const eligibleWorkdays = workdaysInMonth(monthKey).filter((day) => !employee.startDate || day >= employee.startDate);
  const plannedDays = Math.max(eligibleWorkdays.length - employeeMonthAbsenceDays(employee.id, monthKey), 0);
  return Math.round(plannedDays * dailyHours * 100) / 100;
}

function expectedHoursToDate(employee, monthKey) {
  const selectedMonth = monthIndex(monthKey);
  const currentMonth = monthIndex(currentMonthKey());
  if (selectedMonth < currentMonth) return expectedHours(employee, monthKey);
  if (selectedMonth > currentMonth) return 0;

  const today = currentDateKey();
  const weeklyHours = parseNumber(employee.weeklyHoursByMonth?.[monthKey] ?? employee.weeklyHours ?? 40, 40);
  const dailyHours = weeklyHours / 5;
  const elapsedWorkdays = workdaysInMonth(monthKey).filter((day) =>
    day < today &&
    (!employee.startDate || day >= employee.startDate) &&
    !(state.employeeAbsences || []).some((absence) =>
      absence.employeeId === employee.id &&
      absence.status !== "Zatraženo" &&
      day >= absence.startDate &&
      day <= absence.endDate
    )
  );
  return Math.round(elapsedWorkdays.length * dailyHours * 100) / 100;
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
  return Math.round((logged - employeeMonthLatePenaltyHours(employee.id, monthKey)) * 100) / 100;
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
  const position = String(employee.position || "").toLowerCase();
  if (position.includes("snimatelj")) return 0;
  const weeklyHours = Number(employee.weeklyHours || 0);
  const day = parseDate(date).getDay();
  if (weeklyHours >= 38) return day === 5 ? 390 : 510;
  if (weeklyHours <= 20) return 240;
  return Math.round((weeklyHours * 60) / 5);
}

function setupDailyMinuteProgress() {
  const minutesInput = document.querySelector('#employeeHours input[name="minutes"]');
  const form = minutesInput?.closest("form");
  const dateInput = form?.querySelector('input[name="date"]');
  if (!form || !dateInput || form.dataset.dailyProgressReady) return;
  form.dataset.dailyProgressReady = "true";
  const progress = document.createElement("section");
  progress.className = "daily-minute-progress";
  progress.innerHTML = `<div><span>Današnji učinak</span><strong id="dailyMinuteStatus">0 min</strong></div><div class="daily-minute-track"><span id="dailyMinuteBar"></span></div><p id="dailyMinuteMessage"></p>`;
  form.insertAdjacentElement("afterbegin", progress);
  const render = () => {
    const date = dateInput.value || currentDateKey();
    const logged = loggedMinutesForDate(date);
    const expected = expectedMinutesForDate(activeEmployee, date);
    const remaining = Math.max(0, expected - logged);
    const status = progress.querySelector("#dailyMinuteStatus");
    const bar = progress.querySelector("#dailyMinuteBar");
    const message = progress.querySelector("#dailyMinuteMessage");
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
  const activitySelect = document.querySelector('#employeeHours select[name="activityId"]');
  const form = activitySelect?.closest("form");
  const clientSelect = form?.querySelector('select[name="clientId"]');
  const minutesInput = form?.querySelector('input[name="minutes"]');
  if (!form || !activitySelect || !clientSelect || !minutesInput || form.dataset.pauseReady) return;
  form.dataset.pauseReady = "true";
  const note = document.createElement("p");
  note.className = "pause-entry-note";
  note.hidden = true;
  note.textContent = "Pauza se evidentira u dnevnom prisustvu, ali se ne vezuje za klijenta niti ulazi u trošak klijenta.";
  clientSelect.closest("label")?.insertAdjacentElement("afterend", note);
  const sync = () => {
    const selected = activitySelect.options[activitySelect.selectedIndex];
    const isPause = String(selected?.textContent || "").trim().toLowerCase() === "pauza";
    clientSelect.required = !isPause;
    clientSelect.disabled = isPause;
    note.hidden = !isPause;
    if (isPause) {
      clientSelect.value = "";
      minutesInput.value = "30";
    }
  };
  activitySelect.addEventListener("change", sync);
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
    id: crypto.randomUUID(),
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
  const workdays = workdaysInMonth(portalMonth).filter((day) => !activeEmployee.startDate || day >= activeEmployee.startDate);
  const expected = expectedHours(activeEmployee, portalMonth);
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
  const activitySelect = document.getElementById("portalActivitySelect");
  if (activitySelect) {
    const selected = activitySelect.value;
    const activities = (state.employeeActivities || []).filter((activity) => activity.active !== false);
    const groups = activities.reduce((result, activity) => {
      (result[activity.category || "Ostalo"] ||= []).push(activity);
      return result;
    }, {});
    activitySelect.innerHTML = activities.length
      ? `<option value="">Izaberi aktivnost</option>${Object.entries(groups).map(([category, items]) => `<optgroup label="${category}">${items.map((activity) => `<option value="${activity.id}">${activity.name}</option>`).join("")}</optgroup>`).join("")}`
      : `<option value="">Admin još nije dodao aktivnosti</option>`;
    if (activities.some((activity) => activity.id === selected)) activitySelect.value = selected;
  }
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
  renderLateAcknowledgement();
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
  const absences = (state.employeeAbsences || []).filter((absence) => absence.status !== "Zatraženo" && dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(portalMonth)));
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
            ${dayLogs.length ? `<span class="calendar-note hours-note">${dayLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0)}h</span>` : ""}
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
    .filter((absence) => absence.status !== "Zatraženo")
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
  const rows = logs
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
  setText("portalHoursCount", `${rows.length} unosa`);
  document.getElementById("portalHoursRows").innerHTML = rows.join("") || `<div class="empty-state">Još nema unetih sati za ovaj mesec.</div>`;
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
            <span>${notification.title}<br />${notification.message}</span>
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
    .filter((notification) => notification.title === "Odmor je odobren" && !nextShown.has(notification.id))
    .slice(0, 3)
    .forEach((notification) => {
      showToast(notification.title, notification.message, notification.type);
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
          <div class="setup-item alert-item ${status} goal-progress-row">
            <strong>${goal.progress || 0}%</strong>
            <span>${goal.category || "Razvoj"} · ${goal.title}<br />${goal.target || ""} · ${deadline}</span>
            ${goal.status !== "Završeno" ? `<button class="secondary-button goal-complete-button" data-complete-goal="${goal.id}" type="button">Označi završeno</button>` : ""}
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema unetih ciljeva.</div>`;
  const featured = goals
    .filter((goal) => goal.status !== "Završeno")
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))[0];
  setText("portalFeaturedGoalTitle", featured?.title || "Nema aktivnog cilja");
  setText("portalFeaturedGoalTarget", featured?.target || "Admin može da doda razvojni cilj.");
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
          <div class="setup-item">
            <strong>1:1</strong>
            <span>${note.title} · ${formatDate(note.date)}<br />${note.note}</span>
          </div>`
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
  const teamLogs = (state.employeeWorkLogs || [])
    .filter((log) => teamIds.has(log.employeeId) && String(log.date || "").startsWith(portalMonth))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById("leaderActivityLogList").innerHTML = teamLogs.length
    ? teamLogs
        .map((log) => {
          const employee = (state.employees || []).find((item) => item.id === log.employeeId);
          const minutes = Number(log.minutes || Number(log.hours || 0) * 60);
          return `
          <div class="setup-item activity-log-row">
            <strong>${formatNumber(minutes)} min</strong>
            <span>${employee?.name || "Zaposleni"} · ${log.activityName || "Aktivnost"}<br />${formatDate(log.date)}${log.note ? ` · ${log.note}` : ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema upisanih aktivnosti za izabrani mesec.</div>`;
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
    .filter((report) => teamIds.has(report.employeeId) || report.recipientId === activeEmployee.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  document.getElementById("leaderReportList").innerHTML = reports.length
    ? reports
        .map((report) => {
          const employee = (state.employees || []).find((item) => item.id === report.employeeId);
          const matchingLog = (state.employeeWorkLogs || []).find((item) => item.employeeId === report.employeeId && item.date === report.date && (!report.activityId || item.activityId === report.activityId));
          const minutes = Number(report.minutes || matchingLog?.minutes || Number(report.hours || matchingLog?.hours || 0) * 60);
          const activityName = report.activityName || matchingLog?.activityName || (state.employeeActivities || []).find((item) => item.id === report.activityId)?.name || "Aktivnost";
          return `
          <div class="setup-item">
            <strong>${formatNumber(minutes)} min</strong>
            <span>${employee?.name || "Zaposleni"} · ${activityName}<br />${formatDate(report.date)} · + ${report.positive || matchingLog?.positive || "-"}<br />- ${report.negative || matchingLog?.negative || "-"}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema izveštaja za tim.</div>`;
}

document.getElementById("employeeLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  await waitForOnlineHydration();
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const response = await fetch("/api/employee-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  const result = await response.json().catch(() => ({}));
  activeEmployee = response.ok ? state.employees.find((employee) =>
    employee.id === result.employee?.id || String(employee.email || "").toLowerCase() === result.employee?.email
  ) : null;
  if (!activeEmployee || !result.token) {
    document.getElementById("employeeLoginError").hidden = false;
    return;
  }
  document.getElementById("employeeLoginError").hidden = true;
  setEmployeeSession(activeEmployee, result.token, result.expiresAt);
  document.getElementById("employeeLoginScreen").hidden = true;
  document.getElementById("employeeApp").hidden = false;
  renderEmployeePortal();
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
  renderEmployeePortal();
});

document.getElementById("portalHoursForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
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
  state.employeeWorkLogs.unshift({
    id: crypto.randomUUID(),
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
    positive: formData.get("positive"),
    negative: formData.get("negative"),
    locked: true,
    submittedAt: new Date().toISOString(),
  });
  const recipientId = reportRecipientId();
  state.employeeReports = state.employeeReports || [];
  const dailyReport = state.employeeReports.find((report) => report.employeeId === activeEmployee.id && report.date === date);
  if (dailyReport) {
    dailyReport.minutes = Number(dailyReport.minutes || Number(dailyReport.hours || 0) * 60) + minutes;
    dailyReport.hours = Math.round((dailyReport.minutes / 60) * 10000) / 10000;
    dailyReport.activityName = "Dnevni zbir aktivnosti";
    dailyReport.note = [dailyReport.note, formData.get("note")].filter(Boolean).join(" | ");
    dailyReport.positive = [dailyReport.positive, formData.get("positive")].filter(Boolean).join(" | ");
    dailyReport.negative = [dailyReport.negative, formData.get("negative")].filter(Boolean).join(" | ");
    dailyReport.updatedAt = new Date().toISOString();
  } else {
    state.employeeReports.unshift({
      id: crypto.randomUUID(), employeeId: activeEmployee.id, recipientId, date,
      title: "Dnevni izveštaj", hours: Math.round((minutes / 60) * 10000) / 10000, minutes,
      activityId: activity.id, activityName: activity.name, activityCategory: activity.category || "Ostalo",
      clientId: client?.id || "", clientName: client?.name || "", positive: formData.get("positive"),
      negative: formData.get("negative"), note: formData.get("note"), createdAt: new Date().toISOString(),
    });
  }
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  event.currentTarget.elements.minutes.value = 60;
  renderEmployeePortal();
  showToast("Sačuvano", "Sati i dnevni izveštaj su sačuvani.", "ok");
});

document.getElementById("portalAbsenceForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || startDate);
  const absence = {
    id: crypto.randomUUID(),
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
  activeEmployee = null;
  document.getElementById("employeeApp").hidden = true;
  document.getElementById("employeeLoginScreen").hidden = false;
  document.getElementById("employeeLoginForm").reset();
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

document.getElementById("portalGoalList")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-complete-goal]");
  if (!button) return;
  const goal = (state.employeeGoals || []).find((item) => item.id === button.dataset.completeGoal && item.employeeId === activeEmployee.id);
  if (!goal) return;
  goal.status = "Završeno";
  goal.progress = 100;
  goal.completedDate = currentDateKey();
  saveState();
  renderEmployeePortal();
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
renderLoginHint();
onlineHydrationPromise = hydrateOnlineState().then(async () => {
  await restoreEmployeeSession();
  window.MarketizoRemote?.startPolling((payload) => {
    const activeId = activeEmployee?.id;
    state = loadState(payload);
    activeEmployee = (state.employees || []).find((employee) => employee.id === activeId) || activeEmployee;
    if (activeEmployee) renderEmployeePortal();
  });
}).catch(() => null);

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
