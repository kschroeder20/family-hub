import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handleErrors, json, noContent, parseBody } from '../lib/http';
import { serializeChore } from '../serializers';
import {
  createChore,
  deleteChore,
  getChore,
  listChores,
  updateChore,
  type ChoreWriteInput,
} from '../repositories/choresRepository';

function extractChoreInput(body: Record<string, unknown>): ChoreWriteInput {
  // The payload is nested under a `chore` key, e.g. { chore: { title: ... } }.
  const c = (body.chore as Record<string, unknown>) ?? {};
  return {
    title: c.title as string,
    description: c.description as string | undefined,
    // Left `undefined` (not coerced to null) when absent so a PATCH that
    // omits a key leaves the existing value alone instead of clearing it.
    familyMemberId: c.family_member_id as string | null | undefined,
    dueDate: c.due_date as string | null | undefined,
    completed: c.completed as boolean | undefined,
  };
}

export async function index(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return handleErrors(async () => {
    const chores = await listChores();
    return json(200, chores.map((c) => serializeChore(c)));
  });
}

export async function show(_event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    const chore = await getChore(params.id);
    return json(200, serializeChore(chore));
  });
}

export async function create(event: APIGatewayProxyEventV2) {
  return handleErrors(async () => {
    const input = extractChoreInput(parseBody(event));
    const chore = await createChore(input);
    return json(201, serializeChore(chore));
  });
}

export async function update(event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    const input = extractChoreInput(parseBody(event));
    const chore = await updateChore(params.id, input);
    return json(200, serializeChore(chore));
  });
}

export async function destroy(_event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    await getChore(params.id); // 404s if missing, before attempting the delete
    await deleteChore(params.id);
    return noContent();
  });
}
