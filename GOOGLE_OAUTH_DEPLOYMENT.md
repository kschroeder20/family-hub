# Google Calendar OAuth - Persistent Token Storage

## Problem Solved

Previously, Google OAuth tokens were stored in `tmp/tokens.yaml`, which gets wiped on every Railway deployment. This required re-authentication after each deployment.

Now tokens are stored in PostgreSQL, making them persistent across deployments and restarts.

## Changes Made

1. **Database Model**: Created `GoogleCredential` model to store OAuth tokens
2. **Custom Token Store**: Created `DatabaseTokenStore` class that implements Google's token store interface
3. **Service Updates**: Updated `GoogleCalendarService` to use database storage
4. **Controller Updates**: Updated `GoogleCalendarController` to use database storage

## Deployment Steps

### 1. Run Database Migration

```bash
# On Railway, this happens automatically
# For local development:
rails db:migrate
```

### 2. Migrate Existing Token (One-time)

If you already have a valid token in `tmp/tokens.yaml`, migrate it to the database:

```bash
rails google_calendar:migrate_tokens
```

### 3. Deploy to Railway

```bash
git add .
git commit -m "Add persistent Google Calendar token storage"
git push origin main
```

Railway will automatically:
- Run the migration
- Restart the app with database-backed tokens

### 4. Re-authorize (if needed)

If you don't have a valid token yet:

1. Visit: `https://family-hub-production.up.railway.app/api/v1/google_calendar/sync`
2. Copy the `authorization_url` from the response
3. Open it in your browser and authorize with Google
4. You'll be redirected back and the token will be saved to the database

## How It Works

### Token Refresh

Google OAuth tokens have two parts:
- **Access Token**: Short-lived (1 hour), used for API calls
- **Refresh Token**: Long-lived, used to get new access tokens

The Google Auth library automatically:
1. Uses the access token for API calls
2. When it expires, uses the refresh token to get a new access token
3. Stores the new access token in the database

This means **once authorized, the token will work indefinitely** as long as:
- The user doesn't revoke access
- The Google Cloud project credentials remain valid

### Database Storage

Tokens are stored in the `google_credentials` table:

```ruby
# user_id: 'default'
# credentials: JSON string containing:
#   - client_id
#   - access_token
#   - refresh_token
#   - expiration_time_millis
```

## Monitoring

Check token status:

```bash
rails google_calendar:status
```

This shows:
- Whether a token exists
- Client ID
- Whether it has a refresh token
- Expiration time

## Security Notes

1. **Environment Variables**: Make sure these are set on Railway:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_REDIRECT_URI`

2. **Database Security**: Tokens are stored in the database. Ensure:
   - Database access is restricted
   - Regular backups are enabled
   - SSL is enforced for database connections

3. **Access Scope**: The app requests `calendar` scope, which allows:
   - Reading calendar events
   - Creating calendar events
   - Updating calendar events
   - Deleting calendar events

## Troubleshooting

### Token expired or invalid

1. Check the logs for specific error messages
2. Try re-authorizing via `/api/v1/google_calendar/sync`
3. Verify environment variables are set correctly

### "needs_auth": true every time

- Make sure the migration ran successfully
- Check that `DatabaseTokenStore` is being loaded correctly
- Verify the database connection is working

### Token disappears after deployment

- This should no longer happen with database storage
- If it does, check that the `google_credentials` table exists
- Verify Railway is using the correct PostgreSQL database
