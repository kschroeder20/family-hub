# Family Hub infrastructure

CDK app (Python) that deploys the entire app: Cognito (family member login),
DynamoDB (data), Lambda + API Gateway (API), and S3 + CloudFront (the built
frontend). Four independent stacks -- `FamilyHubAuth`, `FamilyHubData`,
`FamilyHubApi`, `FamilyHubWeb` -- so any one of them can be redeployed on
its own via `cdk deploy <StackName>` without touching the others.

## Why this shape (DynamoDB + a single Lambda outside a VPC)

An earlier version of this deployed the whole app to AWS with RDS -- that
was abandoned after repeated friction from this AWS account's restrictive
"free plan" guardrails (Aurora blocked outright, Lambda capped at 10
concurrent executions, and no outbound internet access for Lambda in a
VPC without paying for a NAT gateway, which broke Google Calendar
entirely).

DynamoDB and a non-VPC Lambda sidestep all three problems at once: no
NAT gateway needed (Lambda gets a public IP by default outside a VPC, so
Google Calendar sync just works), no Aurora, and no concurrency cap tied
to VPC ENI limits. The data model (a few hundred rows, ever, no joins)
made DynamoDB a comfortable fit rather than a compromise -- see
`serverless/README.md` for the actual table design.

## Prerequisites

- `aws` CLI, configured (`aws sts get-caller-identity` should work)
- `npm install -g aws-cdk` (the CDK CLI itself -- not a pip package)
- Python 3.9+ (`make install` picks the newest `python3.x` it can find and
  creates `.venv`)
- Node.js (to build the Lambda bundle and the frontend)

## Deploying

Google Calendar credentials are read from your shell environment at
deploy time (not stored anywhere in this repo):

```bash
export GOOGLE_CLIENT_ID=...
export GOOGLE_CLIENT_SECRET=...
export GOOGLE_CALENDAR_ID=...
export GOOGLE_REDIRECT_URI=...   # https://<ApiUrl>/api/v1/google_calendar/callback
```

Then, from `infrastructure/`:

```bash
make deploy
```

This bundles the Lambda (`npm run build` in `serverless/`) and deploys
all four stacks, printing the API URL, site URL, and Cognito IDs. If this
is the account's first CDK deploy ever, run `make bootstrap` first.

The site won't have any content yet on a first deploy -- `FamilyHubWeb`
only pushes `frontend/dist` if it already exists. Build the frontend
against the printed `ApiUrl` and Cognito IDs, then run `make deploy-web`
again to publish it:

```bash
cd ../frontend
echo "VITE_API_URL=<ApiUrl, no trailing slash>
VITE_COGNITO_USER_POOL_ID=<COGNITO_USER_POOL_ID>
VITE_COGNITO_CLIENT_ID=<COGNITO_CLIENT_ID>" > .env.production
npm install && npm run build
cd ../infrastructure && make deploy-web
```

If you set up Google Calendar, register `GOOGLE_REDIRECT_URI` (the exact
URL printed above) as an authorized redirect URI on the OAuth client in
the Google Cloud Console -- Google will reject the OAuth exchange with
`redirect_uri_mismatch` otherwise.

CORS is locked to `FamilyHubWeb`'s CloudFront domain automatically (a
real CDK cross-stack reference, not an env var you have to remember to
set on every deploy).

## Creating family member logins

Self-signup is disabled -- accounts are created by an admin:

```bash
make create-user EMAIL=mom@example.com NAME=Mom
```

This prints a temporary password once. Share it with them directly (text,
in person, etc). They'll be prompted to set their own password the first
time they sign in. There's no per-member role distinction: anyone who's
signed in has full access to the app.

## Notes

- The Cognito user pool and all DynamoDB tables are retained
  (`RemovalPolicy.RETAIN`) even if their stack is destroyed -- so a
  teardown doesn't accidentally wipe out logins or data. Delete them
  manually via the console if you actually want them gone.
- `make destroy-auth` only tears down `FamilyHubAuth`. There's no
  Makefile shortcut for destroying the other stacks (data loss risk is
  higher there) -- use `cdk destroy <StackName>` directly if you really
  need to.
