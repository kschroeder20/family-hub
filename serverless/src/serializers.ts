import { FAMILY_MEMBERS } from './domain/familyMembers';
import { choreOverdueSeverity } from './domain/chores';
import { overdueSeverity as recurringOverdueSeverity, recurrenceDescription } from './domain/recurringChores';
import type { ChoreRecord } from './repositories/choresRepository';
import type { RecurringChoreRecord } from './repositories/recurringChoresRepository';
import type { RecurringChoreCompletionRecord } from './repositories/recurringChoreCompletionsRepository';
import type { GroceryItemRecord } from './repositories/groceryItemsRepository';

function familyMemberOf(id: string | null) {
  if (!id) return null;
  const m = FAMILY_MEMBERS.find((fm) => fm.id === id);
  return m ? { id: m.id, name: m.name, color: m.color } : null;
}

// Field order matches Rails' `as_json` column order (schema.rb) so a diff
// against the old API response is easy to eyeball if anything looks wrong.
export function serializeChore(chore: ChoreRecord, now: Date = new Date()) {
  return {
    id: chore.id,
    title: chore.title,
    description: chore.description,
    family_member_id: chore.familyMemberId,
    due_date: chore.dueDate,
    completed: chore.completed,
    created_at: chore.createdAt,
    updated_at: chore.updatedAt,
    completed_at: chore.completedAt,
    family_member: familyMemberOf(chore.familyMemberId),
    overdue_severity: choreOverdueSeverity(
      chore.dueDate ? new Date(chore.dueDate) : null,
      chore.completed,
      now
    ),
  };
}

export function serializeRecurringChore(
  rc: RecurringChoreRecord,
  now: Date = new Date(),
  completions?: RecurringChoreCompletionRecord[]
) {
  const base = {
    id: rc.id,
    title: rc.title,
    description: rc.description,
    family_member_id: rc.familyMemberId,
    recurrence_type: rc.recurrenceType,
    recurrence_interval: rc.recurrenceInterval,
    day_of_month: rc.dayOfMonth,
    days_of_week: rc.daysOfWeek,
    next_due_date: rc.nextDueDate,
    last_completed_at: rc.lastCompletedAt,
    active: rc.active,
    created_at: rc.createdAt,
    updated_at: rc.updatedAt,
    family_member: familyMemberOf(rc.familyMemberId),
    overdue_severity: recurringOverdueSeverity(new Date(rc.nextDueDate), now),
    recurrence_description: recurrenceDescription({
      recurrenceType: rc.recurrenceType,
      recurrenceInterval: rc.recurrenceInterval,
      dayOfMonth: rc.dayOfMonth,
      daysOfWeek: rc.daysOfWeek,
    }),
  };

  if (!completions) return base;

  return {
    ...base,
    completions: completions.map((c) => ({
      id: c.id,
      completed_at: c.completedAt,
      was_due_at: c.wasDueAt,
      family_member: c.familyMemberId
        ? (() => {
            const m = FAMILY_MEMBERS.find((fm) => fm.id === c.familyMemberId);
            return m ? { id: m.id, name: m.name } : null;
          })()
        : null,
    })),
  };
}

export function serializeGroceryItem(item: GroceryItemRecord) {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    purchased: item.purchased,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    purchased_at: item.purchasedAt,
  };
}

export function serializeFamilyMember(m: (typeof FAMILY_MEMBERS)[number]) {
  return { id: m.id, name: m.name, color: m.color };
}
