class Chore < ApplicationRecord
  belongs_to :family_member

  validates :title, presence: true

  scope :overdue, -> { where("due_date < ? AND completed = ?", Time.current, false) }
  scope :incomplete, -> { where(completed: false) }
  scope :completed, -> { where(completed: true) }

  def overdue?
    due_date.present? && due_date < Time.current && !completed
  end
end
