import { beforeEach, describe, expect, it } from 'vitest';
import { testDdb } from './setup';
import { buildEvent, parse } from './helpers';
import { handler } from '../../src/main';
import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLES = [
  process.env.RECURRING_CHORES_TABLE || 'family_hub_recurring_chores',
  process.env.RECURRING_CHORE_COMPLETIONS_TABLE || 'family_hub_recurring_chore_completions',
];

async function clearTables() {
  for (const TableName of TABLES) {
    const res = await testDdb.send(new ScanCommand({ TableName }));
    for (const item of res.Items ?? []) {
      await testDdb.send(new DeleteCommand({ TableName, Key: { id: item.id } }));
    }
  }
}

beforeEach(async () => {
  await clearTables();
});

describe('recurring chores API', () => {
  it('creates with an initial next_due_date computed from the recurrence rule', async () => {
    const res = await handler(
      buildEvent('POST', '/api/v1/recurring_chores', {
        body: {
          recurring_chore: {
            title: 'Take out trash',
            family_member_id: 'kayce',
            recurrence_type: 'weekly',
            recurrence_interval: 1,
            days_of_week: ['monday'],
          },
        },
      })
    );
    expect(res.statusCode).toBe(201);
    const rc = parse<any>(res);
    expect(rc.next_due_date).toBeTruthy();
    expect(rc.recurrence_description).toBe('Monday');
    expect(rc.family_member).toEqual({ id: 'kayce', name: 'Kayce', color: '#10B981' });
    expect(rc.active).toBe(true);
  });

  it('rejects an invalid recurrence_type', async () => {
    const res = await handler(
      buildEvent('POST', '/api/v1/recurring_chores', {
        body: { recurring_chore: { title: 'X', recurrence_type: 'daily' } },
      })
    );
    expect(res.statusCode).toBe(422);
  });

  it('complete advances next_due_date and records a completion visible on show', async () => {
    const createRes = await handler(
      buildEvent('POST', '/api/v1/recurring_chores', {
        body: {
          recurring_chore: {
            title: 'Water plants',
            recurrence_type: 'weekly',
            recurrence_interval: 1,
            family_member_id: 'gabi',
          },
        },
      })
    );
    const rc = parse<any>(createRes);
    const dueBeforeCompletion = rc.next_due_date;

    const completeRes = await handler(
      buildEvent('POST', `/api/v1/recurring_chores/${rc.id}/complete`, { body: {} })
    );
    expect(completeRes.statusCode).toBe(200);
    const completed = parse<any>(completeRes);
    expect(completed.last_completed_at).toBeTruthy();
    expect(completed.next_due_date).not.toBe(dueBeforeCompletion);
    expect(new Date(completed.next_due_date).getTime()).toBeGreaterThan(new Date(dueBeforeCompletion).getTime());

    const showRes = await handler(buildEvent('GET', `/api/v1/recurring_chores/${rc.id}`));
    const shown = parse<any>(showRes);
    expect(shown.completions).toHaveLength(1);
    expect(shown.completions[0].was_due_at).toBe(dueBeforeCompletion);
    expect(shown.completions[0].family_member).toEqual({ id: 'gabi', name: 'Gabi' });
  });

  it('destroy soft-deletes (active: false) and drops out of the index, but is still fetchable by id', async () => {
    const createRes = await handler(
      buildEvent('POST', '/api/v1/recurring_chores', {
        body: { recurring_chore: { title: 'Mow lawn', recurrence_type: 'monthly', recurrence_interval: 1 } },
      })
    );
    const rc = parse<any>(createRes);

    const destroyRes = await handler(buildEvent('DELETE', `/api/v1/recurring_chores/${rc.id}`));
    expect(destroyRes.statusCode).toBe(204);

    const listRes = await handler(buildEvent('GET', '/api/v1/recurring_chores'));
    expect(parse<any[]>(listRes)).toHaveLength(0);

    const showRes = await handler(buildEvent('GET', `/api/v1/recurring_chores/${rc.id}`));
    expect(showRes.statusCode).toBe(200);
    expect(parse<any>(showRes).active).toBe(false);
  });
});
