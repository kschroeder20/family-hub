class AddPurchasedAtToGroceryItems < ActiveRecord::Migration[7.1]
  def change
    add_column :grocery_items, :purchased_at, :datetime
    add_index :grocery_items, :purchased_at

    # Backfill existing purchased items with updated_at timestamp
    reversible do |dir|
      dir.up do
        execute <<-SQL
          UPDATE grocery_items
          SET purchased_at = updated_at
          WHERE purchased = true AND purchased_at IS NULL
        SQL
      end
    end
  end
end
