import { BILLING_PLANS } from './constants/billing.constants';
import { TenantPlan } from 'src/tenants/enums/tenantPlan.enum';
import { toDateString } from 'src/common/utils/helpers';

// Shops must pay before this day of the month (10 -> 10th)
export const DUE_DAY = 10;

// monthly price of a plan, from BILLING_PLANS  (STARTER -> 2999)
export function monthlyPrice(plan: TenantPlan): number {
  const found = BILLING_PLANS.find((p) => p.plan === plan);
  return found ? found.pricing.monthly.amount : 0;
}

// Date -> "2026-10"
export function toMonth(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

// Shops always get at least this many days to pay
export const MIN_DAYS_TO_PAY = 7;

// When must this month's bill be paid?
//   normally the 10th:            "2026-10" -> "2026-10-10"
//   but never sooner than 7 days from today
//   (a shop that joins on the 25th should not be "overdue" on day 1)
export function dueDateOf(month: string, today = new Date()): string {
  const tenth = `${month}-${String(DUE_DAY).padStart(2, '0')}`;

  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() + MIN_DAYS_TO_PAY);
  const earliestText = toDateString(earliest);

  // dates as "YYYY-MM-DD" text can be compared like normal text
  return tenth > earliestText ? tenth : earliestText;
}

// the last N months, oldest first: ["2026-05", ..., "2026-10"]
export function lastMonths(count: number, from = new Date()): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(from.getFullYear(), from.getMonth() - i, 1);
    months.push(toMonth(date));
  }
  return months;
}
