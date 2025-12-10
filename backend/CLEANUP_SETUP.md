# Automatic Cleanup Setup for Railway

This project automatically deletes completed chores and purchased grocery items 2 days after completion.

## How It Works

1. When a chore is marked complete → `completed_at` timestamp is set
2. When a grocery item is marked purchased → `purchased_at` timestamp is set
3. A cron job runs daily at 2 AM UTC and deletes items older than 2 days

## Railway Deployment

The cleanup runs automatically via Railway's cron jobs feature.

### Configuration Files

- `railway.json` - Defines the cron job schedule
- `bin/cleanup_task` - Script that Railway executes
- `lib/tasks/cleanup.rake` - The actual cleanup logic
- `app/jobs/cleanup_completed_items_job.rb` - Background job implementation

### Setup Steps

1. **Run migrations** (done automatically via Procfile release command):
   ```bash
   rails db:migrate
   ```

2. **Deploy to Railway** - The cron job will be created automatically based on `railway.json`

3. **Verify in Railway Dashboard**:
   - Go to your service settings
   - Check the "Cron" tab to see the scheduled job
   - Monitor logs to confirm it runs daily

### Schedule

- **Frequency**: Daily at 2:00 AM UTC
- **Cron Expression**: `0 2 * * *`

To change the schedule, edit the `schedule` field in `railway.json`:
- Every 6 hours: `0 */6 * * *`
- Every 12 hours: `0 */12 * * *`
- Daily at 3 AM: `0 3 * * *`

### Manual Cleanup

To manually trigger cleanup in Railway:
```bash
railway run bin/cleanup_task
```

Or via Rails console:
```bash
railway run rails cleanup:completed_items
```

### Testing Locally

Before deploying, test the cleanup:
```bash
# Run the cleanup task
rails cleanup:completed_items

# Or execute the job directly in console
rails console
> CleanupCompletedItemsJob.perform_now
```

## Files Modified

1. **Migrations**:
   - `db/migrate/20251210000001_add_completed_at_to_chores.rb`
   - `db/migrate/20251210000002_add_purchased_at_to_grocery_items.rb`

2. **Models**:
   - `app/models/chore.rb` - Added `completed_at` callback
   - `app/models/grocery_item.rb` - Added `purchased_at` callback

3. **Background Job**:
   - `app/jobs/cleanup_completed_items_job.rb`

4. **Rake Task**:
   - `lib/tasks/cleanup.rake`

5. **Railway Config**:
   - `railway.json` - Cron job configuration
   - `bin/cleanup_task` - Execution script

## Monitoring

Check Railway logs to see cleanup results:
```
Cleanup job completed: X chores and Y grocery items deleted
```
