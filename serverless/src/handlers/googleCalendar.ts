import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { json, parseBody } from '../lib/http';
import * as calendarService from '../googleCalendar/service';
import { GoogleAuthRequiredError } from '../googleCalendar/service';

async function withGoogleErrors(fn: () => Promise<APIGatewayProxyStructuredResultV2>): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof GoogleAuthRequiredError) {
      return json(401, {
        success: false,
        needs_auth: true,
        authorization_url: e.authorizationUrl,
        ...(e.message !== 'Google Calendar authorization required' ? { error: e.message } : {}),
      });
    }
    console.error(e);
    return json(422, { success: false, error: (e as Error).message });
  }
}

export async function sync(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return withGoogleErrors(async () => {
    const events = await calendarService.listEvents(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    );
    return json(200, { success: true, events });
  });
}

export async function create(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return withGoogleErrors(async () => {
    const body = parseBody<{ summary: string; start_time: string; end_time: string; description?: string }>(
      event
    );
    const created = await calendarService.createEvent(
      body.summary,
      new Date(body.start_time),
      new Date(body.end_time),
      body.description
    );
    return json(201, { success: true, event: created });
  });
}

export async function update(
  event: APIGatewayProxyEventV2,
  params: Record<string, string>
): Promise<APIGatewayProxyStructuredResultV2> {
  return withGoogleErrors(async () => {
    const body = parseBody<{ summary?: string; start_time?: string; end_time?: string; description?: string }>(
      event
    );
    const updated = await calendarService.updateEvent(params.id, {
      summary: body.summary,
      startTime: body.start_time ? new Date(body.start_time) : undefined,
      endTime: body.end_time ? new Date(body.end_time) : undefined,
      description: body.description,
    });
    return json(200, { success: true, event: updated });
  });
}

export async function destroy(
  _event: APIGatewayProxyEventV2,
  params: Record<string, string>
): Promise<APIGatewayProxyStructuredResultV2> {
  return withGoogleErrors(async () => {
    await calendarService.deleteEvent(params.id);
    return json(200, { success: true, message: 'Event deleted successfully' });
  });
}

export async function authorize(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return json(200, {
    message: 'Visit the authorization_url returned by /google_calendar/sync to connect Google Calendar',
  });
}

export async function clearCredentials(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    await calendarService.clearCredentials();
    return json(200, { success: true, message: 'Credentials cleared' });
  } catch (e) {
    return json(422, { success: false, error: (e as Error).message });
  }
}

// Public route — Google's OAuth redirect can't carry a Cognito bearer
// token, so this must stay outside the authorizer (see CDK api stack).
export async function callback(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const code = event.queryStringParameters?.code;

  if (!code) {
    return { statusCode: 400, headers: { 'content-type': 'text/html' }, body: '<h1>Error: No authorization code provided</h1>' };
  }

  try {
    await calendarService.exchangeCodeForTokens(code);
    return {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: '<h1>Authorization Successful!</h1><p>You can now close this window and return to your Family Hub app. The calendar will sync automatically.</p>',
    };
  } catch (e) {
    console.error('OAuth callback error', e);
    return {
      statusCode: 500,
      headers: { 'content-type': 'text/html' },
      body: `<h1>Error</h1><p>${(e as Error).message}</p>`,
    };
  }
}
