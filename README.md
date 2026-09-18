# Family Hub

A family organization SPA featuring a shared calendar, chores management, and grocery list.

## Features

- 📅 **Family Calendar** - Large, interactive calendar taking up the majority of the page, synced with Google Calendar
- ✅ **Chores Management** - Organize chores by family member with tabs, due dates, and overdue notifications
- 🔁 **Recurring Chores** - Weekly/monthly/quarterly/custom-day recurrence with completion history
- 🛒 **Grocery List** - Simple grocery list with quantity tracking and purchase status
- 🎨 **Monthly Themes** - Background automatically changes based on the current month

## Architecture

| Layer | Tech | Where it lives |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind, served via S3 + CloudFront | `frontend/` |
| API | Node/TypeScript on a single Lambda behind API Gateway (HTTP API) | `serverless/` |
| Data | DynamoDB (one table per resource, on-demand billing) | `serverless/` |
| Auth | Cognito user pool, JWT authorizer on every protected route | `infrastructure/` |
| Infra | AWS CDK (Python) | `infrastructure/` |

Everything runs serverless: no servers to patch, no containers to keep alive, and the whole stack sits comfortably in AWS's free tier at family scale (a few users, a few hundred rows of data). See `infrastructure/README.md` for the deploy flow and the reasoning behind the architecture (why DynamoDB + a single Lambda outside a VPC, specifically).

There's no per-member role distinction — any signed-in family member has full access to the app.

## Family Members

The application comes pre-configured with four family members (see `serverless/src/domain/familyMembers.ts`):
- Mom (Pink)
- Dad (Blue)
- Gabi (Purple)
- Kayce (Green)

This list is static config, not a database table — family membership doesn't change often enough to warrant one. To add or edit a member, edit that file and redeploy the API (`make deploy` in `infrastructure/`).

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs against `VITE_API_URL` from `frontend/.env` (defaults to `http://localhost:3000`, or point it at your deployed API). Cognito login is skipped entirely in dev when `VITE_COGNITO_USER_POOL_ID`/`VITE_COGNITO_CLIENT_ID` aren't set.

### Backend (serverless API)

```bash
cd serverless
npm install
npm test                    # unit tests (recurrence math, validation) -- no AWS needed
npm run dynamodb:up          # starts DynamoDB Local in Docker
npm run test:integration     # integration tests against real DynamoDB Local
```

See `serverless/` for the handler/router/repository structure -- one Lambda handles every route, matched against the same paths the API exposes in production.

## Deployment

Everything deploys via CDK from `infrastructure/`:

```bash
cd infrastructure
make deploy       # Cognito + DynamoDB + Lambda/API Gateway + S3/CloudFront
# build frontend/ with VITE_API_URL set to the printed ApiUrl, then:
make deploy-web   # publish the built frontend to the bucket
```

See `infrastructure/README.md` for prerequisites, the full walkthrough, and how to create family member logins.

## API Endpoints

### Family Members
- `GET /api/v1/family_members` - List all family members

### Chores
- `GET /api/v1/chores` - List all chores
- `POST /api/v1/chores` - Create a chore
- `PUT/PATCH /api/v1/chores/:id` - Update a chore
- `DELETE /api/v1/chores/:id` - Delete a chore

### Recurring Chores
- `GET /api/v1/recurring_chores` - List active recurring chores
- `POST /api/v1/recurring_chores` - Create a recurring chore
- `PUT/PATCH /api/v1/recurring_chores/:id` - Update a recurring chore
- `DELETE /api/v1/recurring_chores/:id` - Deactivate a recurring chore (soft delete)
- `POST /api/v1/recurring_chores/:id/complete` - Mark complete and advance the due date

### Grocery Items
- `GET /api/v1/grocery_items` - List all grocery items
- `POST /api/v1/grocery_items` - Create a grocery item
- `PUT/PATCH /api/v1/grocery_items/:id` - Update a grocery item
- `DELETE /api/v1/grocery_items/:id` - Delete a grocery item
- `DELETE /api/v1/grocery_items/clear_purchased` - Remove all purchased items

### Google Calendar
- `GET /api/v1/google_calendar/sync` - Fetch upcoming events (returns an OAuth URL if not yet connected)
- `POST /api/v1/google_calendar/create` - Create an event
- `PATCH /api/v1/google_calendar/events/:id` - Update an event
- `DELETE /api/v1/google_calendar/events/:id` - Delete an event
- `DELETE /api/v1/google_calendar/credentials` - Disconnect Google Calendar

Completed chores and purchased grocery items are automatically cleaned up 2 days after completion via a DynamoDB TTL attribute -- no cron job required.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
