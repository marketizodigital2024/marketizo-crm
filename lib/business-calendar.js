// Keep this calendar aligned with the calendar displayed in both CRM portals.
function holidayDates(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = (h + l - 7 * m + 114) % 31 + 1;
  const easter = Date.UTC(year, month - 1, day);
  const dates = new Set(['01-01', '01-06', '05-01', '08-15', '10-26', '11-01', '12-08', '12-25', '12-26'].map(value => `${year}-${value}`));
  [1, 39, 50, 60].forEach(offset => dates.add(new Date(easter + offset * 86400000).toISOString().slice(0, 10)));
  return dates;
}

function isWorkingDay(date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5 && !holidayDates(Number(date.slice(0, 4))).has(date);
}

module.exports = { holidayDates, isWorkingDay };
