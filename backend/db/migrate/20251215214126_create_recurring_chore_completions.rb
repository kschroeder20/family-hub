class CreateRecurringChoreCompletions < ActiveRecord::Migration[7.1]
  def change
    create_table :recurring_chore_completions do |t|
      t.references :recurring_chore, null: false, foreign_key: true
      t.references :family_member, null: true, foreign_key: true
      t.datetime :completed_at, null: false
      t.datetime :was_due_at

      t.timestamps
    end

    add_index :recurring_chore_completions, :completed_at
    add_index :recurring_chore_completions, [:recurring_chore_id, :completed_at]
  end
end
