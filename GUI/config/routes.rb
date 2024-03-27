Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
  get "login", to: "login#index"
  post "login_authen", to: "login#login_authen"
  post "logout", to: "login#logout"
  get "audit_log", to: "audit_log#index"

  get "user", to: "user#index"
  # get "registration", to: "user#index"
  post "create_user", to: "user#create_user"
  post "upload_user", to: "user#upload_user"

  root "dashboard#index"
end
