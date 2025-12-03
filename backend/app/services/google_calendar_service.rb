require 'google/apis/calendar_v3'
require 'googleauth'
require 'googleauth/stores/file_token_store'

class GoogleCalendarService
  SCOPE = Google::Apis::CalendarV3::AUTH_CALENDAR

  def initialize
    @service = Google::Apis::CalendarV3::CalendarService.new
    @service.client_options.application_name = 'Family Hub'
    @service.authorization = authorize
  end

  def list_events(time_min = Time.now, time_max = 1.month.from_now)
    result = @service.list_events(
      ENV['GOOGLE_CALENDAR_ID'],
      max_results: 100,
      single_events: true,
      order_by: 'startTime',
      time_min: time_min.iso8601,
      time_max: time_max.iso8601
    )
    result.items
  rescue Google::Apis::ClientError => e
    Rails.logger.error "Google Calendar API Error: #{e.message}"
    []
  end

  def create_event(summary, start_time, end_time, description = nil)
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
    @service.delete_event(ENV['GOOGLE_CALENDAR_ID'], event_id)
  end

  private

  def authorize
    client_id = Google::Auth::ClientId.new(
      ENV['GOOGLE_CLIENT_ID'],
      ENV['GOOGLE_CLIENT_SECRET']
    )

    token_store = Google::Auth::Stores::FileTokenStore.new(
      file: Rails.root.join('tmp', 'tokens.yaml')
    )

    authorizer = Google::Auth::UserAuthorizer.new(client_id, SCOPE, token_store)

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
