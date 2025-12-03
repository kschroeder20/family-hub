class CreateChores < ActiveRecord::Migration[7.1]
  def change
    create_table :chores do |t|
      t.string :title, null: false
      t.text :description
      t.references :family_member, null: false, foreign_key: true
      t.datetime :due_date
      t.boolean :completed, default: false

      t.timestamps
    end

    add_index :chores, :due_date
    add_index :chores, :completed
  end
end
