class DatabaseTokenStore
  def initialize(options = {})
    @user_id = options[:user_id] || 'default'
  end

  def load(id)
    GoogleCredential.load(id)
  end

  def store(id, token)
    GoogleCredential.store(id, token)
  end

  def delete(id)
    GoogleCredential.delete(id)
  end
end
