module ApiKeyAuthenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_api_key!
  end

  private

  def authenticate_api_key!
    api_key = request.headers['X-API-Key'] || params[:api_key]
    expected_api_key = ENV['API_KEY']

    # Skip authentication in development if no API key is set
    return if Rails.env.development? && expected_api_key.blank?

    unless api_key.present? && expected_api_key.present? && ActiveSupport::SecurityUtils.secure_compare(api_key, expected_api_key)
      render json: { error: 'Unauthorized' }, status: :unauthorized
    end
  end
end
