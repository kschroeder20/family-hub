import { beforeEach, describe, expect, it } from 'vitest';
import { testDdb } from './setup';
import { buildEvent, parse } from './helpers';
import { handler } from '../../src/main';
import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.GROCERY_ITEMS_TABLE || 'family_hub_grocery_items';

async function clearTable() {
  const res = await testDdb.send(new ScanCommand({ TableName: TABLE }));
  for (const item of res.Items ?? []) {
    await testDdb.send(new DeleteCommand({ TableName: TABLE, Key: { id: item.id } }));
  }
}

beforeEach(async () => {
  await clearTable();
});

describe('grocery items API', () => {
  it('defaults quantity to 1 and purchased to false', async () => {
    const res = await handler(
      buildEvent('POST', '/api/v1/grocery_items', { body: { grocery_item: { name: 'Milk' } } })
    );
    expect(res.statusCode).toBe(201);
    const item = parse<any>(res);
    expect(item.quantity).toBe(1);
    expect(item.purchased).toBe(false);
    expect(item.purchased_at).toBeNull();
  });

  it('rejects quantity > 999', async () => {
    const res = await handler(
      buildEvent('POST', '/api/v1/grocery_items', { body: { grocery_item: { name: 'Milk', quantity: 1000 } } })
    );
    expect(res.statusCode).toBe(422);
  });

  it('sorts unpurchased first, then created_at desc within each group', async () => {
    const a = parse<any>(
      await handler(buildEvent('POST', '/api/v1/grocery_items', { body: { grocery_item: { name: 'A' } } }))
    );
    const b = parse<any>(
      await handler(buildEvent('POST', '/api/v1/grocery_items', { body: { grocery_item: { name: 'B' } } }))
    );
    await handler(
      buildEvent('PATCH', `/api/v1/grocery_items/${a.id}`, { body: { grocery_item: { purchased: true } } })
    );

    const list = parse<any[]>(await handler(buildEvent('GET', '/api/v1/grocery_items')));
    expect(list.map((i) => i.name)).toEqual(['B', 'A']);
  });

  it('clear_purchased removes only purchased items', async () => {
    const keep = parse<any>(
      await handler(buildEvent('POST', '/api/v1/grocery_items', { body: { grocery_item: { name: 'Keep' } } }))
    );
    const remove = parse<any>(
      await handler(buildEvent('POST', '/api/v1/grocery_items', { body: { grocery_item: { name: 'Remove' } } }))
    );
    await handler(
      buildEvent('PATCH', `/api/v1/grocery_items/${remove.id}`, { body: { grocery_item: { purchased: true } } })
    );

    const clearRes = await handler(buildEvent('DELETE', '/api/v1/grocery_items/clear_purchased'));
    expect(clearRes.statusCode).toBe(204);

    const list = parse<any[]>(await handler(buildEvent('GET', '/api/v1/grocery_items')));
    expect(list.map((i) => i.id)).toEqual([keep.id]);
  });
});
