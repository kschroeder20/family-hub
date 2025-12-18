class FamilyMember < ApplicationRecord
  has_many :chores, dependent: :destroy
  has_many :recurring_chores, dependent: :nullify
  has_many :recurring_chore_completions, dependent: :nullify

  validates :name, presence: true
  validates :color, presence: true
end
