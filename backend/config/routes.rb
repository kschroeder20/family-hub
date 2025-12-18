Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :family_members, only: [:index]
      resources :chores
      resources :recurring_chores do
        member do
          post :complete
        end
      end
      resources :grocery_items
      resources :calendar_events, only: [:index, :create, :update, :destroy]

      get 'google_calendar/sync', to: 'google_calendar#sync'
      post 'google_calendar/create', to: 'google_calendar#create'
      patch 'google_calendar/events/:id', to: 'google_calendar#update'
      delete 'google_calendar/events/:id', to: 'google_calendar#destroy'
      get 'google_calendar/authorize', to: 'google_calendar#authorize'
      get 'google_calendar/callback', to: 'google_calendar#callback'
      delete 'google_calendar/credentials', to: 'google_calendar#clear_credentials'
    end
  end

  # OAuth callback routes (outside API namespace for Google redirect)
  get '/auth/google_oauth2/callback', to: 'api/v1/google_calendar#callback'
  get '/oauth2callback', to: 'api/v1/google_calendar#callback'
end
