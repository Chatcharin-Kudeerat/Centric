class LoginController < ApplicationController
    def index
    end

    def login_authen
        get_authen = JSON.parse(open("./lib/authenication.json").read)
        organization = params[:form_login][:organization]
        username = params[:form_login][:username]
        password = params[:form_login][:password]

        if get_authen[organization].present?
            destination = login_path(organization: organization, username: username)
            get_authen[organization].each do |h|
                if h["username"] == username && h["password"] == password
                    session["current_user"] = h
                    destination = root_path()
                    break
                end
            end
            redirect_to destination

        else
            redirect_to login_path(organization: organization, username: username)
        end
    end

    def logout
        session.delete "current_user"
        # flash[:success] = "Log out successfully. BYE!"
        redirect_to login_path()
    end

    def user_registration
        
    end

    def create_user
    end
end
