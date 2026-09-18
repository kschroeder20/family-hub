import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function noContent(): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 204, body: '' };
}

export function parseBody<T = Record<string, unknown>>(event: APIGatewayProxyEventV2): T {
  if (!event.body) return {} as T;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw) as T;
}

export class NotFoundError extends Error {}
export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(errors.join(', '));
  }
}

export async function handleErrors(fn: () => Promise<APIGatewayProxyStructuredResultV2>): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof NotFoundError) return json(404, { error: 'Not found' });
    if (e instanceof ValidationError) return json(422, { errors: e.errors });
    console.error(e);
    return json(500, { error: 'Internal server error' });
  }
}
