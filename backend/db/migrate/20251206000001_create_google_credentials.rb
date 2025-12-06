class CreateGoogleCredentials < ActiveRecord::Migration[7.1]
  def change
    create_table :google_credentials do |t|
      t.string :user_id, null: false
      t.text :credentials, null: false

      t.timestamps
    end

    add_index :google_credentials, :user_id, unique: true
  end
end
