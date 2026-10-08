(function (root) {
  "use strict";
  function monthlyValue(history, month) {
    const key = Object.keys(history || {}).filter((key) => /^\d{4}-\d{2}$/.test(key) && key <= month).sort().pop();
    return key ? history[key] : undefined;
  }
  function weeklyHours(employee, month) {
    if (employee?.endDate && month > employee.endDate.slice(0, 7)) return 0;
    const saved = monthlyValue(employee?.weeklyHoursByMonth, month);
    if (saved !== undefined) return Number(saved);
    const email = String(employee?.email || "").trim().toLowerCase();
    const history = {
      "sladjan_simic@hotmail.com": [["2025-10", "2026-03", 30], ["2026-04", "9999-12", 38.5]],
      "hadzichazim@hotmail.com": [["2026-01", "2026-06", 20], ["2026-07", "9999-12", 30]],
      "vukasin.marketizo@gmail.com": [["2026-06", "2026-07", 20], ["2026-08", "9999-12", 30]],
      "aleksad.marketizo@gmail.com": [["2026-01", "2026-07", 20], ["2026-08", "9999-12", 38.5]],
    };
    const rule = (history[email] || []).find(([from, to]) => month >= from && month <= to);
    return Number(rule?.[2] ?? employee?.weeklyHours ?? 38.5);
  }
  function terms(employee, date) {
    const month = String(date || "").slice(0, 7);
    const savedSalary = monthlyValue(employee?.salaryByMonth, month);
    const salary = Number(savedSalary ?? employee?.salary ?? 0);
    const hours = Number(monthlyValue(employee?.costWeeklyHoursByMonth, month) ?? weeklyHours(employee, month));
    const outsideEmployment = Boolean((employee?.startDate && date < employee.startDate) || (employee?.endDate && date > employee.endDate));
    const valid = Boolean(employee && Number.isFinite(salary) && salary >= 0 && Number.isFinite(hours) && hours > 0 && !outsideEmployment);
    return { salary, weeklyHours: hours, monthlyHours: hours * 52 / 12, hourlyRate: valid ? salary / (hours * 52 / 12) : 0, confirmed: savedSalary !== undefined && valid, valid, outsideEmployment };
  }
  function minutes(log) {
    const value = log.minutes !== undefined && log.minutes !== null && log.minutes !== "" ? Number(log.minutes) : Math.round(Number(log.hours || 0) * 60);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }
  function bucket(log, clients) {
    const client = (clients || []).find((item) => item.id === log.clientId) || (!log.clientId && (clients || []).find((item) => item.name === log.clientName));
    if (client) return { id: client.id, name: client.name, kind: "client" };
    if (log.clientId || log.clientName) return { id: `unknown:${log.clientId || log.clientName}`, name: log.clientName || "Nepoznat klijent", kind: "unassigned" };
    if (String(log.activityCategory || "").toLowerCase() === "interno") {
      const marketizo = (clients || []).find((item) => /^marketizo digital/i.test(item.name || ""));
      return { id: marketizo?.id || "__internal__", name: marketizo?.name || "Marketizo — interno", kind: "internal" };
    }
    return { id: "__unassigned__", name: "Neraspoređeno vreme", kind: "unassigned" };
  }
  const api = { monthlyValue, weeklyHours, terms, minutes, bucket };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MarketizoCosts = api;
})(typeof window !== "undefined" ? window : globalThis);
