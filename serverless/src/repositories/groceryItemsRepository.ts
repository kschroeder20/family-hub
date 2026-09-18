import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TableNames } from '../lib/dynamo';
import { newId } from '../lib/ids';
import { NotFoundError, ValidationError } from '../lib/http';
import { validateGroceryItem } from '../domain/groceryItems';

export interface GroceryItemRecord {
  id: string;
  name: string;
  quantity: number;
  purchased: boolean;
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: number; // DynamoDB TTL — replaces CleanupCompletedItemsJob
}

export interface GroceryItemWriteInput {
  name: string;
  quantity?: number;
  purchased?: boolean;
}

const TTL_AFTER_PURCHASE_SECONDS = 2 * 24 * 60 * 60;

function computePurchaseFields(purchased: boolean, previousPurchasedAt: string | null) {
  if (purchased) {
    const purchasedAt = previousPurchasedAt ?? new Date().toISOString();
    return {
      purchasedAt,
      expiresAt: Math.floor(new Date(purchasedAt).getTime() / 1000) + TTL_AFTER_PURCHASE_SECONDS,
    };
  }
  return { purchasedAt: null, expiresAt: undefined };
}

export async function createGroceryItem(input: GroceryItemWriteInput): Promise<GroceryItemRecord> {
  const quantity = input.quantity ?? 1;
  const errors = validateGroceryItem({ name: input.name, quantity });
  if (errors.length) throw new ValidationError(errors);

  const now = new Date().toISOString();
  const purchased = input.purchased ?? false;
  const { purchasedAt, expiresAt } = computePurchaseFields(purchased, null);

  const record: GroceryItemRecord = {
    id: newId(),
    name: input.name,
    quantity,
    purchased,
    purchasedAt,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await ddb.send(new PutCommand({ TableName: TableNames.groceryItems, Item: record }));
  return record;
}

export async function getGroceryItem(id: string): Promise<GroceryItemRecord> {
  const res = await ddb.send(new GetCommand({ TableName: TableNames.groceryItems, Key: { id } }));
  if (!res.Item) throw new NotFoundError(`GroceryItem ${id} not found`);
  return res.Item as GroceryItemRecord;
}

export async function updateGroceryItem(
  id: string,
  input: Partial<GroceryItemWriteInput>
): Promise<GroceryItemRecord> {
  const existing = await getGroceryItem(id);

  const merged = {
    name: input.name ?? existing.name,
    quantity: input.quantity ?? existing.quantity,
  };
  const errors = validateGroceryItem(merged);
  if (errors.length) throw new ValidationError(errors);

  const purchased = input.purchased ?? existing.purchased;
  const purchaseChanged = purchased !== existing.purchased;
  const { purchasedAt, expiresAt } = purchaseChanged
    ? computePurchaseFields(purchased, null)
    : { purchasedAt: existing.purchasedAt, expiresAt: existing.expiresAt };

  const record: GroceryItemRecord = {
    ...existing,
    ...merged,
    purchased,
    purchasedAt,
    expiresAt,
    updatedAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TableNames.groceryItems, Item: record }));
  return record;
}

export async function deleteGroceryItem(id: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TableNames.groceryItems, Key: { id } }));
}

export async function listGroceryItems(): Promise<GroceryItemRecord[]> {
  const items: GroceryItemRecord[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new ScanCommand({ TableName: TableNames.groceryItems, ExclusiveStartKey })
    );
    items.push(...((res.Items as GroceryItemRecord[]) ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  // Mirrors `order(purchased: :asc, created_at: :desc)`.
  return items.sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function clearPurchasedGroceryItems(): Promise<void> {
  const all = await listGroceryItems();
  const purchased = all.filter((i) => i.purchased);
  for (const item of purchased) {
    await ddb.send(new DeleteCommand({ TableName: TableNames.groceryItems, Key: { id: item.id } }));
  }
}
