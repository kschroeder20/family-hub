// Ported from backend/app/models/recurring_chore.rb — keep in sync by hand,
// there is no shared source of truth between the Ruby and TS versions.

export type RecurrenceType = 'weekly' | 'monthly' | 'quarterly' | 'custom_days';

export const VALID_DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;
export type DayOfWeek = (typeof VALID_DAYS_OF_WEEK)[number];

export interface RecurringChoreInput {
  recurrenceType: RecurrenceType;
  recurrenceInterval: number;
  dayOfMonth?: number | null;
  daysOfWeek?: string[];
}

const OVERDUE_AMBER_THRESHOLD_DAYS = 1;
const OVERDUE_RED_THRESHOLD_DAYS = 7;

export type OverdueSeverity = 'amber' | 'red' | null;

export function overdueSeverity(nextDueDate: Date | null, now: Date): OverdueSeverity {
  if (!nextDueDate || nextDueDate.getTime() >= now.getTime()) return null;

  const daysOverdue = Math.floor((now.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOverdue >= OVERDUE_RED_THRESHOLD_DAYS) return 'red';
  if (daysOverdue >= OVERDUE_AMBER_THRESHOLD_DAYS) return 'amber';
  return null;
}

export function validateRecurringChore(input: RecurringChoreInput): string[] {
  const errors: string[] = [];

  if (!['weekly', 'monthly', 'quarterly', 'custom_days'].includes(input.recurrenceType)) {
    errors.push('recurrence_type must be one of weekly, monthly, quarterly, custom_days');
  }
  if (!(input.recurrenceInterval > 0)) {
    errors.push('recurrence_interval must be greater than 0');
  }

  if (['weekly', 'custom_days'].includes(input.recurrenceType) && input.daysOfWeek?.length) {
    const invalid = input.daysOfWeek.filter(
      (d) => !VALID_DAYS_OF_WEEK.includes(d.toLowerCase() as DayOfWeek)
    );
    if (invalid.length) errors.push(`days_of_week contains invalid days: ${invalid.join(', ')}`);
  }

  if (input.recurrenceType === 'monthly' && input.dayOfMonth != null) {
    if (input.dayOfMonth < 1 || input.dayOfMonth > 31) {
      errors.push('day_of_month must be between 1 and 31');
    }
  }

  return errors;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function endOfMonthUTC(date: Date): Date {
  // Mirrors ActiveSupport's `end_of_month`, which resets time-of-day to
  // 23:59:59.999 rather than preserving the original hour/minute.
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, daysInMonth, 23, 59, 59, 999));
}

function changeDayUTC(date: Date, day: number): Date {
  const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  if (day > daysInMonth) {
    // Mirrors Rails' `Time#change` raising ArgumentError on e.g. Feb 31,
    // caught in the Ruby code and handled by falling back to end-of-month.
    return endOfMonthUTC(date);
  }
  const d = new Date(date.getTime());
  d.setUTCDate(day);
  return d;
}

function calculateCustomDaysDueDate(from: Date, daysOfWeek: string[] | undefined): Date {
  if (!daysOfWeek || daysOfWeek.length === 0) return addWeeks(from, 1);

  const dayIndex: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  };
  const targets = daysOfWeek.map((d) => dayIndex[d.toLowerCase()]).filter((n) => n !== undefined);
  const currentWday = from.getUTCDay();

  const daysUntilNext = targets.map((targetWday) => {
    let days = targetWday - currentWday;
    if (days <= 0) days += 7;
    return days;
  });

  return addDays(from, Math.min(...daysUntilNext));
}

function calculateWeeklyDueDate(from: Date, interval: number, daysOfWeek: string[] | undefined): Date {
  if (daysOfWeek && daysOfWeek.length > 0) return calculateCustomDaysDueDate(from, daysOfWeek);
  return addWeeks(from, interval);
}

function calculateMonthlyDueDate(from: Date, interval: number, dayOfMonth: number | null | undefined): Date {
  const target = addMonths(from, interval);
  if (dayOfMonth != null) return changeDayUTC(target, dayOfMonth);
  return target;
}

export function calculateNextDueDate(input: RecurringChoreInput, from: Date): Date {
  switch (input.recurrenceType) {
    case 'weekly':
      return calculateWeeklyDueDate(from, input.recurrenceInterval, input.daysOfWeek);
    case 'monthly':
      return calculateMonthlyDueDate(from, input.recurrenceInterval, input.dayOfMonth);
    case 'quarterly':
      return addMonths(from, 3);
    case 'custom_days':
      return calculateCustomDaysDueDate(from, input.daysOfWeek);
  }
}

export function recurrenceDescription(input: RecurringChoreInput): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  switch (input.recurrenceType) {
    case 'weekly':
      if (input.recurrenceInterval === 1 && input.daysOfWeek?.length) {
        return input.daysOfWeek.length === 1
          ? cap(input.daysOfWeek[0])
          : input.daysOfWeek.map(cap).join('/');
      }
      if (input.recurrenceInterval === 1) return 'Weekly';
      return `Every ${input.recurrenceInterval} weeks`;
    case 'monthly':
      if (input.recurrenceInterval === 1) {
        return input.dayOfMonth ? `Monthly (day ${input.dayOfMonth})` : 'Monthly';
      }
      return `Every ${input.recurrenceInterval} months`;
    case 'quarterly':
      return 'Quarterly';
    case 'custom_days':
      return input.daysOfWeek?.length ? input.daysOfWeek.map(cap).join('/') : 'Custom';
  }
}
