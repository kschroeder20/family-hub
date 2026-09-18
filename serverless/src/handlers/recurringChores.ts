import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handleErrors, json, noContent, parseBody } from '../lib/http';
import { serializeRecurringChore } from '../serializers';
import {
  createRecurringChore,
  deactivateRecurringChore,
  getRecurringChore,
  listActiveRecurringChores,
  markRecurringChoreComplete,
  updateRecurringChore,
  type RecurringChoreWriteInput,
} from '../repositories/recurringChoresRepository';
import { listCompletionsFor } from '../repositories/recurringChoreCompletionsRepository';

function extractInput(body: Record<string, unknown>): RecurringChoreWriteInput {
  const c = (body.recurring_chore as Record<string, unknown>) ?? {};
  return {
    title: c.title as string,
    description: c.description as string | undefined,
    familyMemberId: c.family_member_id as string | null | undefined,
    recurrenceType: c.recurrence_type as RecurringChoreWriteInput['recurrenceType'],
    recurrenceInterval: c.recurrence_interval as number | undefined,
    dayOfMonth: c.day_of_month as number | null | undefined,
    daysOfWeek: c.days_of_week as string[] | undefined,
    active: c.active as boolean | undefined,
  };
}

export async function index(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return handleErrors(async () => {
    const chores = await listActiveRecurringChores();
    return json(200, chores.map((c) => serializeRecurringChore(c)));
  });
}

export async function show(_event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    const chore = await getRecurringChore(params.id);
    const completions = await listCompletionsFor(params.id);
    return json(200, serializeRecurringChore(chore, new Date(), completions));
  });
}

export async function create(event: APIGatewayProxyEventV2) {
  return handleErrors(async () => {
    const input = extractInput(parseBody(event));
    const chore = await createRecurringChore(input);
    return json(201, serializeRecurringChore(chore));
  });
}

export async function update(event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    const input = extractInput(parseBody(event));
    const chore = await updateRecurringChore(params.id, input);
    return json(200, serializeRecurringChore(chore));
  });
}

export async function destroy(_event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    await getRecurringChore(params.id);
    await deactivateRecurringChore(params.id);
    return noContent();
  });
}

export async function complete(event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    const body = parseBody<{ completed_by_id?: string }>(event);
    const existing = await getRecurringChore(params.id);
    const completedById = body.completed_by_id ?? existing.familyMemberId;
    const chore = await markRecurringChoreComplete(params.id, completedById);
    return json(200, serializeRecurringChore(chore));
  });
}
