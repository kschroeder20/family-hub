import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildEvent, parse } from '../integration/helpers';

vi.mock('../../src/googleCalendar/service', async () => {
  const actual = await vi.importActual<typeof import('../../src/googleCalendar/service')>(
    '../../src/googleCalendar/service'
  );
  return {
    ...actual,
    listEvents: vi.fn(),
    clearCredentials: vi.fn(),
  };
});

import * as calendarService from '../../src/googleCalendar/service';
import { GoogleAuthRequiredError } from '../../src/googleCalendar/service';
import * as handlers from '../../src/handlers/googleCalendar';

describe('google calendar handler error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sync returns 401 + needs_auth + authorization_url when not yet authorized', async () => {
    vi.mocked(calendarService.listEvents).mockRejectedValue(
      new GoogleAuthRequiredError('https://accounts.google.com/o/oauth2/auth?...')
    );

    const res = await handlers.sync(buildEvent('GET', '/api/v1/google_calendar/sync'));
    expect(res.statusCode).toBe(401);
    const body = parse<{ success: boolean; needs_auth: boolean; authorization_url: string }>(res);
    expect(body.success).toBe(false);
    expect(body.needs_auth).toBe(true);
    expect(body.authorization_url).toContain('accounts.google.com');
  });

  it('sync surfaces the expiry message when the stored token is stale', async () => {
    vi.mocked(calendarService.listEvents).mockRejectedValue(
      new GoogleAuthRequiredError(null, 'Your Google Calendar connection has expired. Please reconnect.')
    );

    const res = await handlers.sync(buildEvent('GET', '/api/v1/google_calendar/sync'));
    const body = parse<{ error: string }>(res);
    expect(body.error).toBe('Your Google Calendar connection has expired. Please reconnect.');
  });

  it('sync maps an unrelated error to 422, not 401', async () => {
    vi.mocked(calendarService.listEvents).mockRejectedValue(new Error('boom'));

    const res = await handlers.sync(buildEvent('GET', '/api/v1/google_calendar/sync'));
    expect(res.statusCode).toBe(422);
  });

  it('clearCredentials clears the stored token', async () => {
    vi.mocked(calendarService.clearCredentials).mockResolvedValue(undefined);

    const res = await handlers.clearCredentials(buildEvent('DELETE', '/api/v1/google_calendar/credentials'));
    expect(res.statusCode).toBe(200);
    expect(calendarService.clearCredentials).toHaveBeenCalledOnce();
  });

  it('callback with no code returns 400 html', async () => {
    const res = await handlers.callback(buildEvent('GET', '/api/v1/google_calendar/callback'));
    expect(res.statusCode).toBe(400);
    expect((res as any).body).toContain('No authorization code');
  });
});
