import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

type Handler = (
  event: APIGatewayProxyEventV2,
  params: Record<string, string>
) => Promise<APIGatewayProxyStructuredResultV2>;

interface Route {
  method: string;
  segments: string[]; // e.g. ['api', 'v1', 'chores', ':id']
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: Handler): void {
    this.routes.push({ method: method.toUpperCase(), segments: path.split('/').filter(Boolean), handler });
  }

  async dispatch(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2 | null> {
    const method = event.requestContext.http.method.toUpperCase();
    const pathSegments = event.rawPath.split('/').filter(Boolean);

    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== pathSegments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        if (seg.startsWith(':')) {
          params[seg.slice(1)] = decodeURIComponent(pathSegments[i]);
        } else if (seg !== pathSegments[i]) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;

      return route.handler(event, params);
    }

    return null;
  }
}
