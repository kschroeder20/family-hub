class MakeChoresFamilyMemberOptional < ActiveRecord::Migration[7.1]
  def change
    change_column_null :chores, :family_member_id, true
  end
end
