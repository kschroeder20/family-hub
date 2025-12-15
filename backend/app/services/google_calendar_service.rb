require 'google/apis/calendar_v3'
require 'googleauth'
require_relative '../../lib/database_token_store'

class GoogleCalendarService
  SCOPE = Google::Apis::CalendarV3::AUTH_CALENDAR

  def initialize
    @service = Google::Apis::CalendarV3::CalendarService.new
    @service.client_options.application_name = 'Family Hub'
    @service.authorization = authorize
  end

  def authorized?
    @service&.authorization.present?
  end

  def authorization_url
    return nil if authorized?

    client_id = Google::Auth::ClientId.new(
      ENV['GOOGLE_CLIENT_ID'],
      ENV['GOOGLE_CLIENT_SECRET']
    )

    token_store = DatabaseTokenStore.new

    authorizer = Google::Auth::UserAuthorizer.new(
      client_id,
      SCOPE,
      token_store,
      ENV['GOOGLE_REDIRECT_URI']
    )
    authorizer.get_authorization_url(redirect_uri: ENV['GOOGLE_REDIRECT_URI'])
  end

  def list_events(time_min = Time.now, time_max = 1.month.from_now)
    return [] unless authorized?

    result = @service.list_events(
      ENV['GOOGLE_CALENDAR_ID'],
      max_results: 100,
      single_events: true,
      order_by: 'startTime',
      time_min: time_min.iso8601,
      time_max: time_max.iso8601
    )
    result.items
  end

  def create_event(summary, start_time, end_time, description = nil)
    return nil unless authorized?
    
    event = Google::Apis::CalendarV3::Event.new(
      summary: summary,
      description: description,
      start: Google::Apis::CalendarV3::EventDateTime.new(
        date_time: start_time.iso8601,
        time_zone: 'America/Los_Angeles'
      ),
      end: Google::Apis::CalendarV3::EventDateTime.new(
        date_time: end_time.iso8601,
        time_zone: 'America/Los_Angeles'
      )
    )

    @service.insert_event(ENV['GOOGLE_CALENDAR_ID'], event)
  end

  def update_event(event_id, summary: nil, start_time: nil, end_time: nil, description: nil)
    return nil unless authorized?
    
    event = @service.get_event(ENV['GOOGLE_CALENDAR_ID'], event_id)

    event.summary = summary if summary
    event.description = description if description

    if start_time
      event.start = Google::Apis::CalendarV3::EventDateTime.new(
        date_time: start_time.iso8601,
        time_zone: 'America/Los_Angeles'
      )
    end

    if end_time
      event.end = Google::Apis::CalendarV3::EventDateTime.new(
        date_time: end_time.iso8601,
        time_zone: 'America/Los_Angeles'
      )
    end

    @service.update_event(ENV['GOOGLE_CALENDAR_ID'], event_id, event)
  end

  def delete_event(event_id)
    return nil unless authorized?
    @service.delete_event(ENV['GOOGLE_CALENDAR_ID'], event_id)
  end

  private

  def authorize
    client_id = Google::Auth::ClientId.new(
      ENV['GOOGLE_CLIENT_ID'],
      ENV['GOOGLE_CLIENT_SECRET']
    )

    token_store = DatabaseTokenStore.new

    authorizer = Google::Auth::UserAuthorizer.new(
      client_id,
      SCOPE,
      token_store,
      ENV['GOOGLE_REDIRECT_URI']
    )

    user_id = 'default'
    credentials = authorizer.get_credentials(user_id)

    if credentials.nil?
      url = authorizer.get_authorization_url(redirect_uri: ENV['GOOGLE_REDIRECT_URI'])
      Rails.logger.info "="*80
      Rails.logger.info "GOOGLE CALENDAR AUTHORIZATION REQUIRED"
      Rails.logger.info "="*80
      Rails.logger.info "Open this URL in your browser and authorize the application:"
      Rails.logger.info url
      Rails.logger.info "="*80
      Rails.logger.info "After authorizing, you'll be redirected back automatically"
      Rails.logger.info "="*80

      # Return nil to indicate authorization is needed
      return nil
    end

    credentials
  end
end
