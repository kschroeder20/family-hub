import { describe, it, expect } from 'vitest';
import { isOverdue, choreOverdueSeverity, validateChore } from '../../src/domain/chores';

describe('isOverdue', () => {
  const now = new Date('2026-09-18T12:00:00Z');

  it('is false with no due date', () => {
    expect(isOverdue(null, false, now)).toBe(false);
  });

  it('is false when completed, even if past due', () => {
    expect(isOverdue(new Date('2026-09-01T00:00:00Z'), true, now)).toBe(false);
  });

  it('is true when past due and not completed', () => {
    expect(isOverdue(new Date('2026-09-01T00:00:00Z'), false, now)).toBe(true);
  });
});

describe('choreOverdueSeverity', () => {
  const now = new Date('2026-09-18T12:00:00Z');

  it('amber for 1-6 days', () => {
    expect(choreOverdueSeverity(new Date('2026-09-16T12:00:00Z'), false, now)).toBe('amber');
  });

  it('red for 7+ days', () => {
    expect(choreOverdueSeverity(new Date('2026-09-01T12:00:00Z'), false, now)).toBe('red');
  });

  it('null when not overdue', () => {
    expect(choreOverdueSeverity(new Date('2026-09-20T12:00:00Z'), false, now)).toBeNull();
  });
});

describe('validateChore', () => {
  it('rejects blank title', () => {
    expect(validateChore({ title: '  ' })).toContain("title can't be blank");
  });

  it('rejects an overlong title', () => {
    expect(validateChore({ title: 'a'.repeat(256) }).some((e) => e.includes('too long'))).toBe(true);
  });

  it('rejects an overlong description', () => {
    expect(
      validateChore({ title: 'Clean', description: 'a'.repeat(1001) }).some((e) => e.includes('description'))
    ).toBe(true);
  });

  it('accepts a valid chore', () => {
    expect(validateChore({ title: 'Clean kitchen', description: 'wipe counters' })).toEqual([]);
  });
});
