import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TableNames } from '../lib/dynamo';
import { newId } from '../lib/ids';
import { NotFoundError, ValidationError } from '../lib/http';
import {
  calculateNextDueDate,
  validateRecurringChore,
  type RecurrenceType,
} from '../domain/recurringChores';
import { recordCompletion } from './recurringChoreCompletionsRepository';

export interface RecurringChoreRecord {
  id: string;
  title: string;
  description: string | null;
  familyMemberId: string | null;
  recurrenceType: RecurrenceType;
  recurrenceInterval: number;
  dayOfMonth: number | null;
  daysOfWeek: string[];
  nextDueDate: string;
  lastCompletedAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringChoreWriteInput {
  title: string;
  description?: string | null;
  familyMemberId?: string | null;
  recurrenceType: RecurrenceType;
  recurrenceInterval?: number;
  dayOfMonth?: number | null;
  daysOfWeek?: string[];
  active?: boolean;
}

export async function createRecurringChore(input: RecurringChoreWriteInput): Promise<RecurringChoreRecord> {
  const recurrenceInterval = input.recurrenceInterval ?? 1;
  const errors = validateRecurringChore({
    recurrenceType: input.recurrenceType,
    recurrenceInterval,
    dayOfMonth: input.dayOfMonth,
    daysOfWeek: input.daysOfWeek,
  });
  if (!input.title?.trim()) errors.push("title can't be blank");
  if (errors.length) throw new ValidationError(errors);

  const now = new Date();
  const record: RecurringChoreRecord = {
    id: newId(),
    title: input.title,
    description: input.description ?? null,
    familyMemberId: input.familyMemberId ?? null,
    recurrenceType: input.recurrenceType,
    recurrenceInterval,
    dayOfMonth: input.dayOfMonth ?? null,
    daysOfWeek: input.daysOfWeek ?? [],
    nextDueDate: calculateNextDueDate(
      { recurrenceType: input.recurrenceType, recurrenceInterval, dayOfMonth: input.dayOfMonth, daysOfWeek: input.daysOfWeek },
      now
    ).toISOString(),
    lastCompletedAt: null,
    active: input.active ?? true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TableNames.recurringChores, Item: record }));
  return record;
}

export async function getRecurringChore(id: string): Promise<RecurringChoreRecord> {
  const res = await ddb.send(new GetCommand({ TableName: TableNames.recurringChores, Key: { id } }));
  if (!res.Item) throw new NotFoundError(`RecurringChore ${id} not found`);
  return res.Item as RecurringChoreRecord;
}

export async function updateRecurringChore(
  id: string,
  input: Partial<RecurringChoreWriteInput>
): Promise<RecurringChoreRecord> {
  const existing = await getRecurringChore(id);

  const merged = {
    recurrenceType: input.recurrenceType ?? existing.recurrenceType,
    recurrenceInterval: input.recurrenceInterval ?? existing.recurrenceInterval,
    dayOfMonth: input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth,
    daysOfWeek: input.daysOfWeek ?? existing.daysOfWeek,
  };
  const errors = validateRecurringChore(merged);
  const title = input.title ?? existing.title;
  if (!title.trim()) errors.push("title can't be blank");
  if (errors.length) throw new ValidationError(errors);

  const record: RecurringChoreRecord = {
    ...existing,
    title,
    description: input.description !== undefined ? input.description : existing.description,
    familyMemberId: input.familyMemberId !== undefined ? input.familyMemberId : existing.familyMemberId,
    ...merged,
    active: input.active !== undefined ? input.active : existing.active,
    updatedAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TableNames.recurringChores, Item: record }));
  return record;
}

export async function deactivateRecurringChore(id: string): Promise<void> {
  // Rails does a soft delete (`update(active: false)`), not a real destroy.
  await updateRecurringChore(id, { active: false });
}

export async function hardDeleteRecurringChore(id: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TableNames.recurringChores, Key: { id } }));
}

export async function markRecurringChoreComplete(
  id: string,
  completedByFamilyMemberId: string | null
): Promise<RecurringChoreRecord> {
  const existing = await getRecurringChore(id);
  const now = new Date();

  const nextDueDate = calculateNextDueDate(
    {
      recurrenceType: existing.recurrenceType,
      recurrenceInterval: existing.recurrenceInterval,
      dayOfMonth: existing.dayOfMonth,
      daysOfWeek: existing.daysOfWeek,
    },
    now
  ).toISOString();

  // Mirrors RecurringChore#mark_complete!: record history *before* advancing
  // next_due_date, using the pre-update value as `was_due_at`.
  await recordCompletion({
    recurringChoreId: id,
    familyMemberId: completedByFamilyMemberId ?? existing.familyMemberId,
    completedAt: now.toISOString(),
    wasDueAt: existing.nextDueDate,
  });

  const record: RecurringChoreRecord = {
    ...existing,
    lastCompletedAt: now.toISOString(),
    nextDueDate,
    updatedAt: now.toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TableNames.recurringChores, Item: record }));
  return record;
}

export async function listActiveRecurringChores(): Promise<RecurringChoreRecord[]> {
  const items: RecurringChoreRecord[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new ScanCommand({ TableName: TableNames.recurringChores, ExclusiveStartKey })
    );
    items.push(...((res.Items as RecurringChoreRecord[]) ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items
    .filter((c) => c.active)
    .sort((a, b) => {
      if (a.nextDueDate !== b.nextDueDate) return a.nextDueDate < b.nextDueDate ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}
