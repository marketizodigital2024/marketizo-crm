(function () {
  const rules = {
    "sladjan_simic@hotmail.com": [
      { from: "2025-10", to: "2026-03", hours: 30 },
      { from: "2026-04", hours: 38.5 },
    ],
    "hadzichazim@hotmail.com": [
      { from: "2026-01", to: "2026-06", hours: 20 },
      { from: "2026-07", hours: 30 },
    ],
    "vukasin.marketizo@gmail.com": [
      { from: "2026-06", to: "2026-07", hours: 20 },
      { from: "2026-08", hours: 30 },
    ],
    "aleksad.marketizo@gmail.com": [
      { from: "2026-01", to: "2026-07", hours: 20 },
      { from: "2026-08", hours: 38.5 },
    ],
  };

  function weeklyHoursForMonth(employee, monthKey) {
    const email = String(employee?.email || "").trim().toLowerCase();
    const rule = (rules[email] || []).find(
      (item) => monthKey >= item.from && (!item.to || monthKey <= item.to),
    );
    return rule ? rule.hours : Number(employee?.weeklyHours || 40);
  }

  if (typeof expectedHours === "function") {
    const baseExpectedHours = expectedHours;
    expectedHours = function (employee, monthKey) {
      return baseExpectedHours(
        { ...employee, weeklyHours: weeklyHoursForMonth(employee, monthKey) },
        monthKey,
      );
    };
  }

  window.marketizoWeeklyHoursForMonth = weeklyHoursForMonth;
})();
