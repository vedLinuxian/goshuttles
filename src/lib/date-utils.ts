/**
 * IST Date & Time Utility Helpers
 * Enforces Indian Standard Time (Asia/Kolkata UTC+05:30) across GoShuttles.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

export function formatIST(
  dateInput: Date | string | number | null | undefined,
  type: "datetime" | "date" | "time" | "short" = "datetime"
): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid Date";

  if (type === "date") {
    return date.toLocaleDateString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (type === "time") {
    return date.toLocaleTimeString("en-IN", {
      timeZone: IST_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (type === "short") {
    return date.toLocaleString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return date.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Returns true if the scheduled start time is in the past.
 */
export function isPastScheduledTime(startTimeInput: Date | string): boolean {
  const startTime = new Date(startTimeInput);
  return startTime.getTime() < Date.now();
}

/**
 * Parses local date (YYYY-MM-DD) and time (HH:mm) strings in IST (Asia/Kolkata)
 * and returns the correct Date instance.
 */
export function parseISTDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Construct ISO string with +05:30 offset
  const isoStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`;
  return new Date(isoStr);
}
