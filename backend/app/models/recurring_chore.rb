class RecurringChore < ApplicationRecord
  belongs_to :family_member, optional: true
  has_many :completions, class_name: 'RecurringChoreCompletion', dependent: :destroy

  validates :title, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 1000 }, allow_blank: true
  validates :recurrence_type, presence: true,
            inclusion: { in: %w[weekly monthly quarterly custom_days] }
  validates :recurrence_interval, presence: true, numericality: { greater_than: 0 }

  # Validate days_of_week for weekly/custom_days types
  validate :validate_days_of_week
  validate :validate_day_of_month

  before_create :set_initial_due_date

  scope :active, -> { where(active: true) }
  scope :overdue, -> { active.where("next_due_date < ?", Time.current) }
  scope :unassigned, -> { where(family_member_id: nil) }
  scope :assigned, -> { where.not(family_member_id: nil) }

  # Overdue severity levels (in days)
  OVERDUE_AMBER_THRESHOLD = 1  # Just overdue: 1-6 days
  OVERDUE_RED_THRESHOLD = 7    # Significantly overdue: 7+ days

  def overdue_severity
    return nil if !next_due_date || next_due_date >= Time.current

    days_overdue = ((Time.current - next_due_date) / 1.day).floor

    if days_overdue >= OVERDUE_RED_THRESHOLD
      :red
    elsif days_overdue >= OVERDUE_AMBER_THRESHOLD
      :amber
    else
      nil
    end
  end

  def mark_complete!(completed_by: nil)
    now = Time.current

    # Record completion in history
    completions.create!(
      completed_at: now,
      was_due_at: next_due_date,
      family_member: completed_by || family_member
    )

    # Update last completion and calculate next due date
    update!(
      last_completed_at: now,
      next_due_date: calculate_next_due_date(from: now)
    )
  end

  def recurrence_description
    case recurrence_type
    when 'weekly'
      if recurrence_interval == 1 && days_of_week.present?
        if days_of_week.length == 1
          days_of_week.first.capitalize
        else
          days_of_week.map(&:capitalize).join('/')
        end
      elsif recurrence_interval == 1
        'Weekly'
      else
        "Every #{recurrence_interval} weeks"
      end
    when 'monthly'
      if recurrence_interval == 1
        day_of_month ? "Monthly (day #{day_of_month})" : 'Monthly'
      else
        "Every #{recurrence_interval} months"
      end
    when 'quarterly'
      'Quarterly'
    when 'custom_days'
      days_of_week.present? ? days_of_week.map(&:capitalize).join('/') : 'Custom'
    end
  end

  private

  def calculate_next_due_date(from: Time.current)
    case recurrence_type
    when 'weekly'
      calculate_weekly_due_date(from)
    when 'monthly'
      calculate_monthly_due_date(from)
    when 'quarterly'
      from + 3.months
    when 'custom_days'
      calculate_custom_days_due_date(from)
    end
  end

  def calculate_weekly_due_date(from)
    if days_of_week.present?
      calculate_custom_days_due_date(from)
    else
      from + recurrence_interval.weeks
    end
  end

  def calculate_monthly_due_date(from)
    target_date = from + recurrence_interval.months

    if day_of_month
      begin
        target_date.change(day: day_of_month)
      rescue ArgumentError
        # Handle invalid dates (e.g., Feb 31)
        target_date.end_of_month
      end
    else
      target_date
    end
  end

  def calculate_custom_days_due_date(from)
    return from + 1.week if days_of_week.blank?

    day_numbers = days_of_week.map { |day| Date::DAYNAMES.index(day.capitalize) }
    current_wday = from.wday

    # Find next occurrence of any specified day
    days_until_next = day_numbers.map do |target_wday|
      days = target_wday - current_wday
      days += 7 if days <= 0
      days
    end.min

    from + days_until_next.days
  end

  def set_initial_due_date
    self.next_due_date ||= calculate_next_due_date(from: Time.current)
  end

  def validate_days_of_week
    return unless %w[weekly custom_days].include?(recurrence_type)
    return if days_of_week.blank?

    valid_days = %w[monday tuesday wednesday thursday friday saturday sunday]
    invalid_days = days_of_week - valid_days

    if invalid_days.any?
      errors.add(:days_of_week, "contains invalid days: #{invalid_days.join(', ')}")
    end
  end

  def validate_day_of_month
    return unless recurrence_type == 'monthly' && day_of_month.present?

    unless (1..31).cover?(day_of_month)
      errors.add(:day_of_month, 'must be between 1 and 31')
    end
  end
end
