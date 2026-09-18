import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import {
  deleteGoogleCredentials,
  loadGoogleCredentials,
  storeGoogleCredentials,
} from '../repositories/googleCredentialsRepository';

// Ported from backend/app/services/google_calendar_service.rb +
// backend/lib/database_token_store.rb. Single stored token, keyed 'default'
// — matches the current app, which has no per-family-member Google account.
const TOKEN_USER_ID = 'default';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TIME_ZONE = 'America/Los_Angeles';

export class GoogleAuthRequiredError extends Error {
  constructor(public authorizationUrl: string | null, message = 'Google Calendar authorization required') {
    super(message);
  }
}

function newOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function buildAuthorizationUrl(client: OAuth2Client): string {
  return client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
}

async function loadAuthorizedClient(): Promise<OAuth2Client | null> {
  const stored = await loadGoogleCredentials(TOKEN_USER_ID);
  if (!stored) return null;

  const client = newOAuth2Client();
  client.setCredentials(JSON.parse(stored));
  return client;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const client = newOAuth2Client();
  const { tokens } = await client.getToken(code);
  await storeGoogleCredentials(TOKEN_USER_ID, JSON.stringify(tokens));
}

export async function clearCredentials(): Promise<void> {
  await deleteGoogleCredentials(TOKEN_USER_ID);
}

// Mirrors the Ruby controllers' shared rescue: invalid/expired/revoked
// tokens clear the stored credential and surface a fresh auth URL instead of
// a generic error.
export function isAuthExpiryError(e: unknown): boolean {
  const msg = ((e as Error)?.message || '').toLowerCase();
  return ['invalid_grant', 'expired', 'revoked', 'authorization failed'].some((needle) =>
    msg.includes(needle)
  );
}

async function withClient<T>(fn: (client: OAuth2Client, calendar: ReturnType<typeof google.calendar>) => Promise<T>): Promise<T> {
  const client = await loadAuthorizedClient();
  if (!client) {
    const anonClient = newOAuth2Client();
    throw new GoogleAuthRequiredError(buildAuthorizationUrl(anonClient));
  }

  try {
    return await fn(client, google.calendar({ version: 'v3', auth: client }));
  } catch (e) {
    if (isAuthExpiryError(e)) {
      await clearCredentials();
      const anonClient = newOAuth2Client();
      throw new GoogleAuthRequiredError(
        buildAuthorizationUrl(anonClient),
        'Your Google Calendar connection has expired. Please reconnect.'
      );
    }
    throw e;
  }
}

export interface CalendarEventView {
  id: string;
  summary: string | null | undefined;
  start: string | null | undefined;
  end: string | null | undefined;
  description: string | null | undefined;
  color_id?: string | null;
}

function toEventView(event: {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  colorId?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
}): CalendarEventView {
  return {
    id: event.id ?? '',
    summary: event.summary,
    start: event.start?.dateTime ?? event.start?.date,
    end: event.end?.dateTime ?? event.end?.date,
    description: event.description,
    color_id: event.colorId,
  };
}

export async function listEvents(timeMin: Date, timeMax: Date): Promise<CalendarEventView[]> {
  return withClient(async (_client, calendar) => {
    const res = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });
    return (res.data.items ?? []).map(toEventView);
  });
}

export async function createEvent(
  summary: string,
  startTime: Date,
  endTime: Date,
  description?: string | null
): Promise<CalendarEventView> {
  return withClient(async (_client, calendar) => {
    const res = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary,
        description: description ?? undefined,
        start: { dateTime: startTime.toISOString(), timeZone: TIME_ZONE },
        end: { dateTime: endTime.toISOString(), timeZone: TIME_ZONE },
      },
    });
    return toEventView(res.data);
  });
}

export async function updateEvent(
  eventId: string,
  fields: { summary?: string; startTime?: Date; endTime?: Date; description?: string }
): Promise<CalendarEventView> {
  return withClient(async (_client, calendar) => {
    const requestBody: Record<string, unknown> = {};
    if (fields.summary) requestBody.summary = fields.summary;
    if (fields.description) requestBody.description = fields.description;
    if (fields.startTime) {
      requestBody.start = { dateTime: fields.startTime.toISOString(), timeZone: TIME_ZONE };
    }
    if (fields.endTime) {
      requestBody.end = { dateTime: fields.endTime.toISOString(), timeZone: TIME_ZONE };
    }

    const res = await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId,
      requestBody,
    });
    return toEventView(res.data);
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await withClient(async (_client, calendar) => {
    await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId });
  });
}

export async function getAuthorizationUrlIfUnauthorized(): Promise<string | null> {
  const client = await loadAuthorizedClient();
  if (client) return null;
  return buildAuthorizationUrl(newOAuth2Client());
}
