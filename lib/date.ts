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

export type DueStatus = "overdue" | "today" | "soon" | null;

const SOON_WINDOW_DAYS = 3;

/**
 * Classifies a due date (YYYY-MM-DD) relative to today in JST, for
 * highlighting in the todo list/board. Returns null for completed todos,
 * todos with no due date, or due dates more than SOON_WINDOW_DAYS away.
 */
export function getDueStatus(dueDate: string | null, isCompleted: boolean): DueStatus {
  if (!dueDate || isCompleted) return null;

  const today = getTodayInJST();
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";

  const soonLimit = getTodayInJST(
    new Date(Date.now() + SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  );
  if (dueDate <= soonLimit) return "soon";

  return null;
}
