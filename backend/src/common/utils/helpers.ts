// Small helper functions used in many services.

// Make a number like 42 into "ORD-0042"
export function makeNumber(prefix: string, count: number): string {
  return `${prefix}-${String(count).padStart(4, '0')}`;
}

// Round money to 2 decimal places: 10.456 -> 10.46
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

// "2026-06-01" -> Date object in the SERVER's local time zone.
// (new Date("2026-06-01") would use UTC, which gives the wrong day in Bangladesh)
function toLocalDate(date: string | Date): Date {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(date);
}

// "2026-06-01" -> Date at 00:00:00 of that day
export function startOfDay(date: string | Date): Date {
  const d = toLocalDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// "2026-06-01" -> Date at 23:59:59 of that day
export function endOfDay(date: string | Date): Date {
  const d = toLocalDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Date -> "2026-06-01" (local time zone)
export function toDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
