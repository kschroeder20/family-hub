class CleanupCompletedItemsJob < ApplicationJob
  queue_as :default

  def perform
    cutoff_date = 2.days.ago

    # Delete chores completed more than 2 days ago
    deleted_chores = Chore.where('completed = ? AND completed_at < ?', true, cutoff_date).delete_all

    # Delete grocery items purchased more than 2 days ago
    deleted_items = GroceryItem.where('purchased = ? AND purchased_at < ?', true, cutoff_date).delete_all

    Rails.logger.info "Cleanup job completed: #{deleted_chores} chores and #{deleted_items} grocery items deleted"
  end
end
