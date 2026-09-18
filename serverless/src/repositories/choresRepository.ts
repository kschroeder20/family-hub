import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TableNames } from '../lib/dynamo';
import { newId } from '../lib/ids';
import { NotFoundError, ValidationError } from '../lib/http';
import { validateChore } from '../domain/chores';

export interface ChoreRecord {
  id: string;
  title: string;
  description: string | null;
  familyMemberId: string | null;
  dueDate: string | null; // ISO 8601
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: number; // DynamoDB TTL (epoch seconds) — replaces CleanupCompletedItemsJob
}

export interface ChoreWriteInput {
  title: string;
  description?: string | null;
  familyMemberId?: string | null;
  dueDate?: string | null;
  completed?: boolean;
}

const TTL_AFTER_COMPLETION_SECONDS = 2 * 24 * 60 * 60; // 2 days, matches CleanupCompletedItemsJob

function computeCompletionFields(completed: boolean, previousCompletedAt: string | null) {
  // Mirrors Chore#set_completed_at: stamp completed_at on the transition into
  // completed, clear it on the transition out.
  if (completed) {
    const completedAt = previousCompletedAt ?? new Date().toISOString();
    return {
      completedAt,
      expiresAt: Math.floor(new Date(completedAt).getTime() / 1000) + TTL_AFTER_COMPLETION_SECONDS,
    };
  }
  return { completedAt: null, expiresAt: undefined };
}

export async function createChore(input: ChoreWriteInput): Promise<ChoreRecord> {
  const errors = validateChore({ title: input.title, description: input.description });
  if (errors.length) throw new ValidationError(errors);

  const now = new Date().toISOString();
  const completed = input.completed ?? false;
  const { completedAt, expiresAt } = computeCompletionFields(completed, null);

  const record: ChoreRecord = {
    id: newId(),
    title: input.title,
    description: input.description ?? null,
    familyMemberId: input.familyMemberId ?? null,
    dueDate: input.dueDate ?? null,
    completed,
    completedAt,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await ddb.send(new PutCommand({ TableName: TableNames.chores, Item: record }));
  return record;
}

export async function getChore(id: string): Promise<ChoreRecord> {
  const res = await ddb.send(new GetCommand({ TableName: TableNames.chores, Key: { id } }));
  if (!res.Item) throw new NotFoundError(`Chore ${id} not found`);
  return res.Item as ChoreRecord;
}

export async function updateChore(id: string, input: Partial<ChoreWriteInput>): Promise<ChoreRecord> {
  const existing = await getChore(id);

  const merged = {
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
  };
  const errors = validateChore(merged);
  if (errors.length) throw new ValidationError(errors);

  const completed = input.completed ?? existing.completed;
  const completionChanged = completed !== existing.completed;
  const { completedAt, expiresAt } = completionChanged
    ? computeCompletionFields(completed, null)
    : { completedAt: existing.completedAt, expiresAt: existing.expiresAt };

  const record: ChoreRecord = {
    ...existing,
    ...merged,
    familyMemberId: input.familyMemberId !== undefined ? input.familyMemberId : existing.familyMemberId,
    dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
    completed,
    completedAt,
    expiresAt,
    updatedAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TableNames.chores, Item: record }));
  return record;
}

export async function deleteChore(id: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TableNames.chores, Key: { id } }));
}

export async function listChores(): Promise<ChoreRecord[]> {
  // Full-table scan: the whole point of moving off RDS here is that this
  // app's data volume (a few hundred rows, ever) makes a scan-and-sort in
  // Lambda just as fast as an indexed query would be, without needing a GSI.
  const items: ChoreRecord[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new ScanCommand({ TableName: TableNames.chores, ExclusiveStartKey })
    );
    items.push(...((res.Items as ChoreRecord[]) ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  // Mirrors `order(due_date: :asc, created_at: :desc)` — Postgres puts NULL
  // due_date last in ASC order, so replicate that instead of naive sorting.
  return items.sort((a, b) => {
    if (a.dueDate == null && b.dueDate == null) return b.createdAt.localeCompare(a.createdAt);
    if (a.dueDate == null) return 1;
    if (b.dueDate == null) return -1;
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
