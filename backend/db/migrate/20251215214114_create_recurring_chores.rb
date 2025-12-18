class CreateRecurringChores < ActiveRecord::Migration[7.1]
  def change
    create_table :recurring_chores do |t|
      t.string :title, null: false
      t.text :description
      t.references :family_member, null: true, foreign_key: true

      # Recurrence pattern
      t.string :recurrence_type, null: false
      t.integer :recurrence_interval, default: 1
      t.integer :day_of_month
      t.string :days_of_week, array: true, default: []

      # Tracking
      t.datetime :next_due_date
      t.datetime :last_completed_at
      t.boolean :active, default: true

      t.timestamps
    end

    add_index :recurring_chores, :next_due_date
    add_index :recurring_chores, :recurrence_type
    add_index :recurring_chores, :active
  end
end
