class GoogleCredential < ApplicationRecord
  validates :user_id, presence: true, uniqueness: true
  validates :credentials, presence: true

  def self.store(user_id, credentials_json)
    credential = find_or_initialize_by(user_id: user_id)
    credential.credentials = credentials_json
    credential.save!
  end

  def self.load(user_id)
    find_by(user_id: user_id)&.credentials
  end

  def self.delete(user_id)
    find_by(user_id: user_id)&.destroy
  end
end
