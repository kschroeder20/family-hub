import { describe, it, expect } from 'vitest';
import {
  calculateNextDueDate,
  recurrenceDescription,
  overdueSeverity,
  validateRecurringChore,
  type RecurringChoreInput,
} from '../../src/domain/recurringChores';

describe('calculateNextDueDate', () => {
  it('weekly with no specific days adds N weeks', () => {
    const from = new Date('2026-09-18T12:00:00Z'); // a Friday
    const input: RecurringChoreInput = { recurrenceType: 'weekly', recurrenceInterval: 2 };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-10-02T12:00:00.000Z');
  });

  it('weekly with days_of_week picks the next matching day, wrapping to next week', () => {
    // Friday 2026-09-18. Target days: monday, wednesday -> next is Monday 2026-09-21.
    const from = new Date('2026-09-18T09:00:00Z');
    const input: RecurringChoreInput = {
      recurrenceType: 'weekly',
      recurrenceInterval: 1,
      daysOfWeek: ['monday', 'wednesday'],
    };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-09-21T09:00:00.000Z');
  });

  it('weekly with days_of_week including today wraps to next week (never same-day)', () => {
    // Friday 2026-09-18, target is friday -> next friday, not today.
    const from = new Date('2026-09-18T09:00:00Z');
    const input: RecurringChoreInput = {
      recurrenceType: 'weekly',
      recurrenceInterval: 1,
      daysOfWeek: ['friday'],
    };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-09-25T09:00:00.000Z');
  });

  it('monthly with no day_of_month adds N months at the same day/time', () => {
    const from = new Date('2026-01-15T08:00:00Z');
    const input: RecurringChoreInput = { recurrenceType: 'monthly', recurrenceInterval: 1 };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-02-15T08:00:00.000Z');
  });

  it('monthly with day_of_month sets that day in the target month', () => {
    const from = new Date('2026-01-10T08:00:00Z');
    const input: RecurringChoreInput = { recurrenceType: 'monthly', recurrenceInterval: 1, dayOfMonth: 25 };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-02-25T08:00:00.000Z');
  });

  it('monthly with day_of_month beyond the target month length falls back to end of month, resetting time-of-day (matches ActiveSupport end_of_month)', () => {
    // Jan 15 + 1 month = Feb; day_of_month 31 doesn't exist in Feb 2026 (not a leap year) -> Feb 28 23:59:59.999.
    const from = new Date('2026-01-15T08:00:00Z');
    const input: RecurringChoreInput = { recurrenceType: 'monthly', recurrenceInterval: 1, dayOfMonth: 31 };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });

  it('quarterly adds 3 months', () => {
    const from = new Date('2026-01-15T08:00:00Z');
    const input: RecurringChoreInput = { recurrenceType: 'quarterly', recurrenceInterval: 1 };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-04-15T08:00:00.000Z');
  });

  it('custom_days with no days falls back to +1 week', () => {
    const from = new Date('2026-09-18T09:00:00Z');
    const input: RecurringChoreInput = { recurrenceType: 'custom_days', recurrenceInterval: 1 };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-09-25T09:00:00.000Z');
  });

  it('custom_days picks the nearest of several days', () => {
    // Friday 2026-09-18 -> nearest of [sunday, tuesday] is Sunday 2026-09-20.
    const from = new Date('2026-09-18T09:00:00Z');
    const input: RecurringChoreInput = {
      recurrenceType: 'custom_days',
      recurrenceInterval: 1,
      daysOfWeek: ['sunday', 'tuesday'],
    };
    expect(calculateNextDueDate(input, from).toISOString()).toBe('2026-09-20T09:00:00.000Z');
  });
});

describe('recurrenceDescription', () => {
  it('describes weekly with a single day', () => {
    expect(
      recurrenceDescription({ recurrenceType: 'weekly', recurrenceInterval: 1, daysOfWeek: ['monday'] })
    ).toBe('Monday');
  });

  it('describes weekly with multiple days', () => {
    expect(
      recurrenceDescription({
        recurrenceType: 'weekly',
        recurrenceInterval: 1,
        daysOfWeek: ['monday', 'wednesday'],
      })
    ).toBe('Monday/Wednesday');
  });

  it('describes plain weekly', () => {
    expect(recurrenceDescription({ recurrenceType: 'weekly', recurrenceInterval: 1 })).toBe('Weekly');
  });

  it('describes interval weekly', () => {
    expect(recurrenceDescription({ recurrenceType: 'weekly', recurrenceInterval: 3 })).toBe('Every 3 weeks');
  });

  it('describes monthly with day', () => {
    expect(
      recurrenceDescription({ recurrenceType: 'monthly', recurrenceInterval: 1, dayOfMonth: 5 })
    ).toBe('Monthly (day 5)');
  });

  it('describes plain monthly', () => {
    expect(recurrenceDescription({ recurrenceType: 'monthly', recurrenceInterval: 1 })).toBe('Monthly');
  });

  it('describes interval monthly', () => {
    expect(recurrenceDescription({ recurrenceType: 'monthly', recurrenceInterval: 2 })).toBe('Every 2 months');
  });

  it('describes quarterly', () => {
    expect(recurrenceDescription({ recurrenceType: 'quarterly', recurrenceInterval: 1 })).toBe('Quarterly');
  });

  it('describes custom_days', () => {
    expect(
      recurrenceDescription({ recurrenceType: 'custom_days', recurrenceInterval: 1, daysOfWeek: ['friday'] })
    ).toBe('Friday');
  });
});

describe('overdueSeverity', () => {
  const now = new Date('2026-09-18T12:00:00Z');

  it('is null when not due yet', () => {
    expect(overdueSeverity(new Date('2026-09-19T12:00:00Z'), now)).toBeNull();
  });

  it('is amber when 1-6 days overdue', () => {
    expect(overdueSeverity(new Date('2026-09-16T12:00:00Z'), now)).toBe('amber');
  });

  it('is red when 7+ days overdue', () => {
    expect(overdueSeverity(new Date('2026-09-10T12:00:00Z'), now)).toBe('red');
  });

  it('is null when there is no due date', () => {
    expect(overdueSeverity(null, now)).toBeNull();
  });
});

describe('validateRecurringChore', () => {
  it('rejects an invalid recurrence_type', () => {
    const errors = validateRecurringChore({
      recurrenceType: 'daily' as never,
      recurrenceInterval: 1,
    });
    expect(errors).toContain('recurrence_type must be one of weekly, monthly, quarterly, custom_days');
  });

  it('rejects a non-positive interval', () => {
    const errors = validateRecurringChore({ recurrenceType: 'weekly', recurrenceInterval: 0 });
    expect(errors).toContain('recurrence_interval must be greater than 0');
  });

  it('rejects invalid days_of_week', () => {
    const errors = validateRecurringChore({
      recurrenceType: 'weekly',
      recurrenceInterval: 1,
      daysOfWeek: ['funday'],
    });
    expect(errors.some((e) => e.includes('funday'))).toBe(true);
  });

  it('rejects out-of-range day_of_month', () => {
    const errors = validateRecurringChore({ recurrenceType: 'monthly', recurrenceInterval: 1, dayOfMonth: 32 });
    expect(errors).toContain('day_of_month must be between 1 and 31');
  });

  it('accepts a valid weekly config', () => {
    expect(
      validateRecurringChore({ recurrenceType: 'weekly', recurrenceInterval: 1, daysOfWeek: ['monday'] })
    ).toEqual([]);
  });
});
