namespace :google_calendar do
  desc "Migrate Google Calendar tokens from file to database"
  task migrate_tokens: :environment do
    token_file = Rails.root.join('tmp', 'tokens.yaml')

    unless File.exist?(token_file)
      puts "No token file found at #{token_file}"
      next
    end

    require 'yaml'
    tokens = YAML.load_file(token_file)

    if tokens && tokens['default']
      GoogleCredential.store('default', tokens['default'])
      puts "Successfully migrated token from file to database"
      puts "Token will now persist across deployments"
    else
      puts "No default token found in file"
    end
  end

  desc "Show current Google Calendar token status"
  task status: :environment do
    credential = GoogleCredential.find_by(user_id: 'default')

    if credential
      require 'json'
      token_data = JSON.parse(credential.credentials)

      puts "✅ Token exists in database"
      puts "Client ID: #{token_data['client_id']}"
      puts "Has refresh token: #{token_data['refresh_token'].present?}"
      puts "Expiration: #{Time.at(token_data['expiration_time_millis'].to_i / 1000)}"
    else
      puts "❌ No token found in database"
      puts "Visit /api/v1/google_calendar/sync to authorize"
    end
  end
end
