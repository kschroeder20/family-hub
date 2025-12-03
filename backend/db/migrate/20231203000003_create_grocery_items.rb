class CreateGroceryItems < ActiveRecord::Migration[7.1]
  def change
    create_table :grocery_items do |t|
      t.string :name, null: false
      t.integer :quantity, default: 1
      t.boolean :purchased, default: false

      t.timestamps
    end

    add_index :grocery_items, :purchased
  end
end
