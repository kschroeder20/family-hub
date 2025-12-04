require 'google/apis/calendar_v3'
require 'googleauth'
require 'googleauth/stores/file_token_store'

module Api
  module V1
    class GoogleCalendarController < ApplicationController
      before_action :init_service, only: [:sync, :create]

      def sync
        if @service.nil? || !@service.authorized?
          auth_url = begin
            GoogleCalendarService.new.authorization_url
          rescue => e
            Rails.logger.error "Failed to generate auth URL: #{e.message}"
            nil
          end
          
          render json: {
            success: false,
            needs_auth: true,
            authorization_url: auth_url
          }, status: :unauthorized
          return
        end

        events = @service.list_events

        render json: {
          success: true,
          events: events.map { |event|
            {
              id: event.id,
              summary: event.summary,
              start: event.start.date_time || event.start.date,
              end: event.end.date_time || event.end.date,
              description: event.description
            }
          }
        }
      rescue => e
        render json: {
          success: false,
          error: e.message
        }, status: :unprocessable_entity
      end

      def create
        event = @service.create_event(
          params[:summary],
          Time.parse(params[:start_time]),
          Time.parse(params[:end_time]),
          params[:description]
        )

        render json: {
          success: true,
          event: {
            id: event.id,
            summary: event.summary,
            start: event.start.date_time,
            end: event.end.date_time
          }
        }, status: :created
      rescue => e
        render json: {
          success: false,
          error: e.message
        }, status: :unprocessable_entity
      end

      def authorize
        render json: {
          message: "Visit the Rails logs to get the authorization URL",
          instructions: [
            "1. Check the backend logs for the authorization URL",
            "2. Open that URL in your browser",
            "3. Sign in with Google and authorize",
            "4. You'll be redirected with a code",
            "5. Use the /callback endpoint to save the code"
          ]
        }
      end

      def callback
        code = params[:code]

        if code.blank?
          render html: "<h1>Error: No authorization code provided</h1>", status: :bad_request
          return
        end

        begin
          # Initialize the authorizer to exchange code for credentials
          client_id = Google::Auth::ClientId.new(
            ENV['GOOGLE_CLIENT_ID'],
            ENV['GOOGLE_CLIENT_SECRET']
          )

          token_store = Google::Auth::Stores::FileTokenStore.new(
            file: Rails.root.join('tmp', 'tokens.yaml')
          )

          authorizer = Google::Auth::UserAuthorizer.new(
            client_id,
            Google::Apis::CalendarV3::AUTH_CALENDAR,
            token_store
          )

          # Exchange the authorization code for credentials
          credentials = authorizer.get_and_store_credentials_from_code(
            user_id: 'default',
            code: code,
            base_url: ENV['GOOGLE_REDIRECT_URI']
          )

          if credentials
            render html: "<h1>✅ Authorization Successful!</h1><p>You can now close this window and return to your Family Hub app. The calendar will sync automatically.</p>"
          else
            render html: "<h1>❌ Authorization Failed</h1><p>Could not exchange authorization code for credentials.</p>", status: :unprocessable_entity
          end
        rescue => e
          Rails.logger.error "OAuth callback error: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
          render html: "<h1>❌ Error</h1><p>#{e.message}</p>", status: :internal_server_error
        end
      end

      private

      def init_service
        @service = GoogleCalendarService.new
      rescue => e
        Rails.logger.error "Failed to initialize Google Calendar service: #{e.message}"
        @service = nil
      end
    end
  end
end
