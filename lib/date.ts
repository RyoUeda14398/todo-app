const JST_TIME_ZONE = "Asia/Tokyo";

const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: JST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Returns today's date in JST as YYYY-MM-DD, regardless of the server's own
 * timezone (Vercel runs in UTC, which is 9 hours behind JST — using the
 * server's local time/UTC directly gives the wrong calendar date for part
 * of the day).
 */
export function getTodayInJST(date: Date = new Date()): string {
  return jstDateFormatter.format(date);
}
