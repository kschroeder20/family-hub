import { beforeEach, describe, expect, it } from 'vitest';
import { testDdb } from './setup';
import { buildEvent, parse } from './helpers';
import { handler } from '../../src/main';
import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

async function clearTable(name: string) {
  const res = await testDdb.send(new ScanCommand({ TableName: name }));
  for (const item of res.Items ?? []) {
    await testDdb.send(new DeleteCommand({ TableName: name, Key: { id: item.id } }));
  }
}

beforeEach(async () => {
  await clearTable(process.env.CHORES_TABLE || 'family_hub_chores');
});

describe('chores API (via main router handler)', () => {
  it('creates a chore and includes the resolved family_member + overdue_severity', async () => {
    const createRes = await handler(
      buildEvent('POST', '/api/v1/chores', {
        body: { chore: { title: 'Clean kitchen', family_member_id: 'mom', due_date: '2020-01-01T00:00:00.000Z' } },
      })
    );
    expect(createRes.statusCode).toBe(201);
    const chore = parse<any>(createRes);
    expect(chore.title).toBe('Clean kitchen');
    expect(chore.family_member).toEqual({ id: 'mom', name: 'Mom', color: '#EC4899' });
    expect(chore.completed).toBe(false);
    expect(chore.overdue_severity).toBe('red'); // due 2020, now way past 7 days

    const listRes = await handler(buildEvent('GET', '/api/v1/chores'));
    const list = parse<any[]>(listRes);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(chore.id);
  });

  it('rejects a blank title with 422 and a validation error message', async () => {
    const res = await handler(buildEvent('POST', '/api/v1/chores', { body: { chore: { title: '  ' } } }));
    expect(res.statusCode).toBe(422);
    const body = parse<{ errors: string[] }>(res);
    expect(body.errors).toContain("title can't be blank");
  });

  it('404s on an unknown id', async () => {
    const res = await handler(buildEvent('GET', '/api/v1/chores/does-not-exist'));
    expect(res.statusCode).toBe(404);
  });

  it('stamps completed_at and a TTL when marked completed, and clears both when un-completed', async () => {
    const createRes = await handler(
      buildEvent('POST', '/api/v1/chores', { body: { chore: { title: 'Take out trash' } } })
    );
    const chore = parse<any>(createRes);
    expect(chore.completed_at).toBeNull();

    const completeRes = await handler(
      buildEvent('PATCH', `/api/v1/chores/${chore.id}`, { body: { chore: { completed: true } } })
    );
    const completed = parse<any>(completeRes);
    expect(completed.completed).toBe(true);
    expect(completed.completed_at).not.toBeNull();

    // Confirm the TTL attribute actually landed in DynamoDB (this is what
    // replaces CleanupCompletedItemsJob — DynamoDB expires the item itself).
    const raw = await testDdb.send(
      new ScanCommand({ TableName: process.env.CHORES_TABLE || 'family_hub_chores' })
    );
    const rawItem = raw.Items?.find((i) => i.id === chore.id);
    expect(rawItem?.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const uncompleteRes = await handler(
      buildEvent('PATCH', `/api/v1/chores/${chore.id}`, { body: { chore: { completed: false } } })
    );
    const uncompleted = parse<any>(uncompleteRes);
    expect(uncompleted.completed_at).toBeNull();
  });

  it('a PATCH that omits family_member_id does not clear an existing one', async () => {
    const createRes = await handler(
      buildEvent('POST', '/api/v1/chores', { body: { chore: { title: 'Dishes', family_member_id: 'dad' } } })
    );
    const chore = parse<any>(createRes);

    const updateRes = await handler(
      buildEvent('PATCH', `/api/v1/chores/${chore.id}`, { body: { chore: { title: 'Dishes (updated)' } } })
    );
    const updated = parse<any>(updateRes);
    expect(updated.family_member_id).toBe('dad');
    expect(updated.title).toBe('Dishes (updated)');
  });

  it('deletes a chore', async () => {
    const createRes = await handler(buildEvent('POST', '/api/v1/chores', { body: { chore: { title: 'X' } } }));
    const chore = parse<any>(createRes);

    const deleteRes = await handler(buildEvent('DELETE', `/api/v1/chores/${chore.id}`));
    expect(deleteRes.statusCode).toBe(204);

    const getRes = await handler(buildEvent('GET', `/api/v1/chores/${chore.id}`));
    expect(getRes.statusCode).toBe(404);
  });

  it('sorts by due_date asc with nulls last, then created_at desc (matches Postgres NULLS LAST default)', async () => {
    const noDate = parse<any>(
      await handler(buildEvent('POST', '/api/v1/chores', { body: { chore: { title: 'No date' } } }))
    );
    const later = parse<any>(
      await handler(
        buildEvent('POST', '/api/v1/chores', {
          body: { chore: { title: 'Later', due_date: '2030-01-01T00:00:00.000Z' } },
        })
      )
    );
    const sooner = parse<any>(
      await handler(
        buildEvent('POST', '/api/v1/chores', {
          body: { chore: { title: 'Sooner', due_date: '2025-01-01T00:00:00.000Z' } },
        })
      )
    );

    const list = parse<any[]>(await handler(buildEvent('GET', '/api/v1/chores')));
    expect(list.map((c) => c.title)).toEqual(['Sooner', 'Later', 'No date']);
    void noDate;
    void later;
    void sooner;
  });
});
