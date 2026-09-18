import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Router } from './lib/router';
import { json } from './lib/http';
import * as familyMembers from './handlers/familyMembers';
import * as chores from './handlers/chores';
import * as recurringChores from './handlers/recurringChores';
import * as groceryItems from './handlers/groceryItems';
import * as googleCalendar from './handlers/googleCalendar';

// NOTE: there is no /api/v1/calendar_events route here on purpose — the
// frontend only ever talks to /google_calendar/* (see
// frontend/src/services/api.js) for calendar data.
export const router = new Router();

router.add('GET', '/api/v1/family_members', familyMembers.index);

router.add('GET', '/api/v1/chores', chores.index);
router.add('POST', '/api/v1/chores', chores.create);
router.add('GET', '/api/v1/chores/:id', chores.show);
router.add('PUT', '/api/v1/chores/:id', chores.update);
router.add('PATCH', '/api/v1/chores/:id', chores.update);
router.add('DELETE', '/api/v1/chores/:id', chores.destroy);

router.add('GET', '/api/v1/recurring_chores', recurringChores.index);
router.add('POST', '/api/v1/recurring_chores', recurringChores.create);
router.add('POST', '/api/v1/recurring_chores/:id/complete', recurringChores.complete);
router.add('GET', '/api/v1/recurring_chores/:id', recurringChores.show);
router.add('PUT', '/api/v1/recurring_chores/:id', recurringChores.update);
router.add('PATCH', '/api/v1/recurring_chores/:id', recurringChores.update);
router.add('DELETE', '/api/v1/recurring_chores/:id', recurringChores.destroy);

// clear_purchased must be registered before /:id — the router matches in
// registration order and a bare `:id` segment would otherwise swallow it.
router.add('DELETE', '/api/v1/grocery_items/clear_purchased', groceryItems.clearPurchased);
router.add('GET', '/api/v1/grocery_items', groceryItems.index);
router.add('POST', '/api/v1/grocery_items', groceryItems.create);
router.add('GET', '/api/v1/grocery_items/:id', groceryItems.show);
router.add('PUT', '/api/v1/grocery_items/:id', groceryItems.update);
router.add('PATCH', '/api/v1/grocery_items/:id', groceryItems.update);
router.add('DELETE', '/api/v1/grocery_items/:id', groceryItems.destroy);

// Cognito-protected Google Calendar routes (see CDK api stack — every route
// below gets the JWT authorizer *except* the callback routes further down,
// which Google's redirect hits directly and can't attach a bearer token to).
router.add('GET', '/api/v1/google_calendar/sync', googleCalendar.sync);
router.add('POST', '/api/v1/google_calendar/create', googleCalendar.create);
router.add('PATCH', '/api/v1/google_calendar/events/:id', googleCalendar.update);
router.add('DELETE', '/api/v1/google_calendar/events/:id', googleCalendar.destroy);
router.add('GET', '/api/v1/google_calendar/authorize', googleCalendar.authorize);
router.add('DELETE', '/api/v1/google_calendar/credentials', googleCalendar.clearCredentials);

// Public routes — no Cognito authorizer.
router.add('GET', '/api/v1/google_calendar/callback', googleCalendar.callback);
router.add('GET', '/auth/google_oauth2/callback', googleCalendar.callback);
router.add('GET', '/oauth2callback', googleCalendar.callback);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const result = await router.dispatch(event);
  return result ?? json(404, { error: 'Not found' });
}
