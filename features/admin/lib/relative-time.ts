/** No dependency: the dashboard only needs minute/hour/day granularity. */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Formats how long ago `from` was relative to `now` (default: current time).
 * Future timestamps clamp to "just now" so clock skew never renders a negative
 * duration.
 */
export function formatRelativeTime(from: Date, now: Date = new Date()): string {
  const elapsedMs = now.getTime() - from.getTime();

  if (elapsedMs < MINUTE_MS) {
    return "just now";
  }

  if (elapsedMs < HOUR_MS) {
    return `${Math.floor(elapsedMs / MINUTE_MS)} min ago`;
  }

  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(elapsedMs / DAY_MS);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
