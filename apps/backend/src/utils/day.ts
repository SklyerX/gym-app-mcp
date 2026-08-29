// THIS FILE WAS MODIFIED BY CLAUDE-CODE CLI
/**
 * I kept having issues with the date parsing and the logic around that, and at a certain point I off-loaded it
 * to claude to take care of it and handle the parsing.
 */

/**
 * Calendar-day resolution in the user's own timezone.
 *
 * A day is represented as a plain 'YYYY-MM-DD' string, never a Date. A Date is
 * an instant, and an instant is only a day once you say where you are standing:
 * 2026-08-23T01:12Z is the 23rd in London and still the 22nd in New York. All
 * of this module's arithmetic is on the calendar string, so it never drifts
 * with the server's clock and never lands on a DST seam.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** True if `tz` is an IANA zone this runtime recognizes. */
export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });

    return true;
  } catch {
    return false;
  }
}

/** The calendar day `at` falls on in `timezone`, as 'YYYY-MM-DD'. */
export function localDay(timezone: string, at: Date = new Date()) {
  // formatToParts rather than a locale that happens to print ISO order.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * `day` moved by `days` calendar days. Anchored at UTC midnight purely as a
 * counting device — the string going in and out is already timezone-resolved,
 * so this is calendar arithmetic and a 23- or 25-hour DST day cannot skew it.
 */
export function shiftDay(day: string, days: number) {
  const anchor = new Date(`${day}T00:00:00Z`);

  anchor.setUTCDate(anchor.getUTCDate() + days);

  return anchor.toISOString().slice(0, 10);
}

/** True if `day` is a real calendar date, rejecting e.g. '2026-02-31'. */
export function isRealDay(day: string) {
  if (!ISO_DAY.test(day)) return false;

  const parsed = new Date(`${day}T00:00:00Z`);

  // Round-tripping catches overflow: Date rolls Feb 31st into March 3rd.
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day
  );
}

/**
 * Resolves whatever the model passed as a day into 'YYYY-MM-DD', or null if it
 * is unusable. Omitted means today. The word forms are accepted because the
 * alternative is the model doing date arithmetic itself against a "now" it
 * cannot see, which is how entries land on the wrong day.
 */
export function resolveDay(
  input: string | undefined,
  timezone: string,
): string | null {
  const today = localDay(timezone);

  if (input === undefined) return today;

  const normalized = input.trim().toLowerCase();

  if (normalized === "" || normalized === "today") return today;
  if (normalized === "yesterday") return shiftDay(today, -1);
  if (normalized === "tomorrow") return shiftDay(today, 1);

  return isRealDay(normalized) ? normalized : null;
}
