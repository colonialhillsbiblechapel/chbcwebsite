/**
 * Calendar helpers. Event dates are calendar days (stored as UTC midnight), and "today" is
 * always taken in Houston time so the site is right no matter where the build runs.
 */

const TIME_ZONE = 'America/Chicago';

/** Today's date in Houston as YYYY-MM-DD. */
export function todayInHouston(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

/** A calendar day (UTC midnight) as YYYY-MM-DD. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const fmt = (options: Intl.DateTimeFormatOptions) => (date: Date) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(date);

export const dayOfMonth = fmt({ day: 'numeric' });
export const monthShort = fmt({ month: 'short' });
export const weekday = fmt({ weekday: 'long' });
export const longDate = fmt({ month: 'long', day: 'numeric', year: 'numeric' });
