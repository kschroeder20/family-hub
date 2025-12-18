class Chore < ApplicationRecord
  belongs_to :family_member, optional: true

  validates :title, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 1000 }, allow_blank: true

  scope :overdue, -> { where("due_date < ? AND completed = ?", Time.current, false) }
  scope :incomplete, -> { where(completed: false) }
  scope :completed, -> { where(completed: true) }
  scope :unassigned, -> { where(family_member_id: nil) }
  scope :assigned, -> { where.not(family_member_id: nil) }

  # Set completed_at timestamp when chore is marked as completed
  before_save :set_completed_at, if: :completed_changed?

  def overdue?
    due_date.present? && due_date < Time.current && !completed
  end

  # Overdue severity for consistency with recurring chores
  def overdue_severity
    return nil unless overdue?

    days_overdue = ((Time.current - due_date) / 1.day).floor

    if days_overdue >= 7
      :red
    elsif days_overdue >= 1
      :amber
    else
      nil
    end
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
