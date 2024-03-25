Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
  get "login", to: "login#index"
  post "login_authen", to: "login#login_authen"
  get "registration", to: "login#user_registration"

  root "dashboard#index"
end
