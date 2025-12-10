class AddCompletedAtToChores < ActiveRecord::Migration[7.1]
  def change
    add_column :chores, :completed_at, :datetime
    add_index :chores, :completed_at

    # Backfill existing completed chores with updated_at timestamp
    reversible do |dir|
      dir.up do
        execute <<-SQL
          UPDATE chores
          SET completed_at = updated_at
          WHERE completed = true AND completed_at IS NULL
        SQL
      end
    end
  end
end
