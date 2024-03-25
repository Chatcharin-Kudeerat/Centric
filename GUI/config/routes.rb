Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
  get "login", to: "login#index"
  post "login_authen", to: "login#login_authen"
  post "logout", to: "login#logout"
  get "registration", to: "login#user_registration"
  post "create_user", to: "login#create_user"

  root "dashboard#index"
end
