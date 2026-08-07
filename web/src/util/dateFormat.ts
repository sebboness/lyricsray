/**
 * Converts a UTC date string (YYYY-MM-DD) to a MM-DD label in the browser's
 * local timezone. ISO date-only strings are parsed as UTC midnight per spec,
 * so getMonth/getDate read back in local time — which is what we want for charts.
 */
export function utcDateToLocalMonthDay(utcDate: string): string {
    const d = new Date(utcDate);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
