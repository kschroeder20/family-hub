class CreateFamilyMembers < ActiveRecord::Migration[7.1]
  def change
    create_table :family_members do |t|
      t.string :name, null: false
      t.string :color, default: "#3B82F6"

      t.timestamps
    end

    # Seed initial family members
    reversible do |dir|
      dir.up do
        FamilyMember.create!([
          { name: "Mom", color: "#EC4899" },
          { name: "Dad", color: "#3B82F6" },
          { name: "Gabi", color: "#8B5CF6" },
          { name: "Kayce", color: "#10B981" }
        ])
      end
    end
  end
end
