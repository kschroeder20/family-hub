import type { APIGatewayProxyEventV2 } from 'aws-lambda';

export function buildEvent(
  method: string,
  path: string,
  opts: { body?: unknown; query?: Record<string, string> } = {}
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: {},
    queryStringParameters: opts.query,
    requestContext: {
      accountId: 'test',
      apiId: 'test',
      domainName: 'test.local',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test-request-id',
      routeKey: `${method} ${path}`,
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2;
}

export function parse<T>(result: { body?: string }): T {
  return JSON.parse(result.body ?? 'null') as T;
}
