class RecurringChoreCompletion < ApplicationRecord
  belongs_to :recurring_chore
  belongs_to :family_member, optional: true

  validates :completed_at, presence: true

  scope :recent, -> { order(completed_at: :desc) }
end
