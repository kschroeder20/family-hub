class Chore < ApplicationRecord
  belongs_to :family_member

  validates :title, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 1000 }, allow_blank: true

  scope :overdue, -> { where("due_date < ? AND completed = ?", Time.current, false) }
  scope :incomplete, -> { where(completed: false) }
  scope :completed, -> { where(completed: true) }

  # Set completed_at timestamp when chore is marked as completed
  before_save :set_completed_at, if: :completed_changed?

  def overdue?
    due_date.present? && due_date < Time.current && !completed
  end

  private

  def set_completed_at
    if completed?
      self.completed_at = Time.current
    else
      self.completed_at = nil
    end
  end
end
