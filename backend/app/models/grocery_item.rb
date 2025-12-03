class GroceryItem < ApplicationRecord
  validates :name, presence: true
  validates :quantity, numericality: { greater_than: 0 }

  scope :unpurchased, -> { where(purchased: false) }
  scope :purchased, -> { where(purchased: true) }
end
