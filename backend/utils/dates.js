// Attendance dates are stored as midnight UTC of a calendar day (YYYY-MM-DD).
// "Today" is decided in the academy's own timezone, not UTC, so a teacher in
// Pakistan can mark attendance for the local date even in the early morning.

const DEFAULT_TZ = "Asia/Karachi";

function getTimezone() {
  return process.env.APP_TIMEZONE || DEFAULT_TZ;
}

// Today's calendar date in the app timezone, as "YYYY-MM-DD".
function todayString(now = new Date(), tz = getTimezone()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

// Strictly parse "YYYY-MM-DD" into a midnight-UTC Date, or return null.
function parseDateOnly(value, { allowFuture = false, now = new Date() } = {}) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  if (!allowFuture && value > todayString(now)) {
    return null;
  }

  return date;
}

function isNotFuture(date, now = new Date()) {
  return date.toISOString().slice(0, 10) <= todayString(now);
}

module.exports = { todayString, parseDateOnly, isNotFuture, getTimezone };
