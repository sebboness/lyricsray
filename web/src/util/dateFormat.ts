/**
 * Extracts MM-DD from a UTC date string (YYYY-MM-DD).
 * Daily stats are keyed by UTC date, so labels reflect UTC — no local timezone
 * conversion, avoiding SSR/hydration mismatches and off-by-one-day display.
 */
export function utcDateToLocalMonthDay(utcDate: string): string {
    return utcDate.slice(5); // "YYYY-MM-DD" → "MM-DD"
}
