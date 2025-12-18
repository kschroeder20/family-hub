# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_12_15_214131) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "chores", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.bigint "family_member_id"
    t.datetime "due_date"
    t.boolean "completed", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "completed_at"
    t.index ["completed"], name: "index_chores_on_completed"
    t.index ["completed_at"], name: "index_chores_on_completed_at"
    t.index ["due_date"], name: "index_chores_on_due_date"
    t.index ["family_member_id"], name: "index_chores_on_family_member_id"
  end

  create_table "family_members", force: :cascade do |t|
    t.string "name", null: false
    t.string "color", default: "#3B82F6"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "google_credentials", force: :cascade do |t|
    t.string "user_id", null: false
    t.text "credentials", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_google_credentials_on_user_id", unique: true
  end

  create_table "grocery_items", force: :cascade do |t|
    t.string "name", null: false
    t.integer "quantity", default: 1
    t.boolean "purchased", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "purchased_at"
    t.index ["purchased"], name: "index_grocery_items_on_purchased"
    t.index ["purchased_at"], name: "index_grocery_items_on_purchased_at"
  end

  create_table "recurring_chore_completions", force: :cascade do |t|
    t.bigint "recurring_chore_id", null: false
    t.bigint "family_member_id"
    t.datetime "completed_at", null: false
    t.datetime "was_due_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["completed_at"], name: "index_recurring_chore_completions_on_completed_at"
    t.index ["family_member_id"], name: "index_recurring_chore_completions_on_family_member_id"
    t.index ["recurring_chore_id", "completed_at"], name: "idx_on_recurring_chore_id_completed_at_bf60a78957"
    t.index ["recurring_chore_id"], name: "index_recurring_chore_completions_on_recurring_chore_id"
  end

  create_table "recurring_chores", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.bigint "family_member_id"
    t.string "recurrence_type", null: false
    t.integer "recurrence_interval", default: 1
    t.integer "day_of_month"
    t.string "days_of_week", default: [], array: true
    t.datetime "next_due_date"
    t.datetime "last_completed_at"
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_recurring_chores_on_active"
    t.index ["family_member_id"], name: "index_recurring_chores_on_family_member_id"
    t.index ["next_due_date"], name: "index_recurring_chores_on_next_due_date"
    t.index ["recurrence_type"], name: "index_recurring_chores_on_recurrence_type"
  end

  add_foreign_key "chores", "family_members"
  add_foreign_key "recurring_chore_completions", "family_members"
  add_foreign_key "recurring_chore_completions", "recurring_chores"
  add_foreign_key "recurring_chores", "family_members"
end
