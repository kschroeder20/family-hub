namespace :cleanup do
  desc "Delete chores and grocery items completed/purchased more than 2 days ago"
  task completed_items: :environment do
    puts "Starting cleanup of completed items..."
    CleanupCompletedItemsJob.perform_now
    puts "Cleanup complete!"
  end
end
