# Family Hub API (serverless)

TypeScript port of the app's API, running as a single Lambda behind API
Gateway (HTTP API), backed by DynamoDB. See `../infrastructure/README.md`
for why this shape (DynamoDB + a non-VPC Lambda) was chosen, and for how
this actually gets deployed.

## Layout

- `src/domain/` -- pure business logic (recurrence math, validation,
  overdue-severity rules). No AWS dependency; these are the easiest
  functions to unit test and the ones most worth trusting.
- `src/repositories/` -- DynamoDB access, one module per resource.
- `src/handlers/` + `src/main.ts` -- HTTP layer: parses the API Gateway
  event, calls a repository, shapes the JSON response. `main.ts` holds
  the in-process router (`src/lib/router.ts`) that maps every route to
  its handler -- one Lambda handles all of them.
- `src/googleCalendar/` -- Google Calendar OAuth + Calendar API client.
- `src/serializers.ts` -- resolves a chore/recurring-chore's
  `family_member_id` against the static family member list and computes
  derived fields (`overdue_severity`, `recurrence_description`).

## Data model

One DynamoDB table per resource (`chores`, `recurring_chores`,
`recurring_chore_completions`, `grocery_items`, `google_credentials`),
each keyed by a UUID `id` (or `userId` for the single google_credentials
row). No GSIs -- list endpoints scan the table and sort in Lambda, which
is simpler than a GSI and just as fast at this data volume (a few
hundred rows, ever, no joins).

Family members are **not** a table -- they're a fixed list of 4 in
`src/domain/familyMembers.ts`, since that endpoint is read-only and the
membership essentially never changes.

Completed chores and purchased grocery items get a DynamoDB TTL
attribute (`expiresAt`) set 2 days after completion, so DynamoDB expires
them on its own -- no cron job, no scheduled Lambda.

## Testing

```bash
npm install
npm test                    # unit tests -- pure functions, no AWS needed
npm run dynamodb:up          # starts DynamoDB Local in Docker (port 8100)
npm run test:integration     # integration tests against real DynamoDB Local
npm run dynamodb:down        # stop it
```

## Building

```bash
npm run build
```

Bundles `src/main.ts` with esbuild into `dist/main.js` (a single ~10MB
file, googleapis included). This is a deliberate choice over CDK's
`NodejsFunction` auto-bundler, which reaches for Docker on certain
fallback paths -- pre-bundling keeps `cdk deploy` fast and predictable.
`infrastructure/stacks/api_stack.py` deploys `dist/` directly via
`lambda.Code.from_asset`, so this build has to run before a deploy.
