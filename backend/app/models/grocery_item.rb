class GroceryItem < ApplicationRecord
  validates :name, presence: true
  validates :quantity, numericality: { greater_than: 0 }

  scope :unpurchased, -> { where(purchased: false) }
  scope :purchased, -> { where(purchased: true) }

  # Set purchased_at timestamp when item is marked as purchased
  before_save :set_purchased_at, if: :purchased_changed?

  private

  def set_purchased_at
    if purchased?
      self.purchased_at = Time.current
    else
      self.purchased_at = nil
    end
  end
end
