import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TableNames } from '../lib/dynamo';
import { newId } from '../lib/ids';

export interface RecurringChoreCompletionRecord {
  id: string;
  recurringChoreId: string;
  familyMemberId: string | null;
  completedAt: string;
  wasDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function recordCompletion(input: {
  recurringChoreId: string;
  familyMemberId: string | null;
  completedAt: string;
  wasDueAt: string | null;
}): Promise<RecurringChoreCompletionRecord> {
  const now = new Date().toISOString();
  const record: RecurringChoreCompletionRecord = {
    id: newId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: TableNames.recurringChoreCompletions, Item: record }));
  return record;
}

export async function listCompletionsFor(recurringChoreId: string): Promise<RecurringChoreCompletionRecord[]> {
  // Scan-and-filter, not a GSI query: total completion volume for a family
  // chore list stays in the low hundreds, so this is simpler with no
  // measurable cost at this scale.
  const items: RecurringChoreCompletionRecord[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new ScanCommand({ TableName: TableNames.recurringChoreCompletions, ExclusiveStartKey })
    );
    items.push(...((res.Items as RecurringChoreCompletionRecord[]) ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items
    .filter((c) => c.recurringChoreId === recurringChoreId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}
