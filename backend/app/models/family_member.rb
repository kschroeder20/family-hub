class FamilyMember < ApplicationRecord
  has_many :chores, dependent: :destroy

  validates :name, presence: true
  validates :color, presence: true
end
