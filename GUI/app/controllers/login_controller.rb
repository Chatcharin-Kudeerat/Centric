class LoginController < ApplicationController
    def index
    end

    def login_authen
        get_authen = JSON.parse(open("./lib/authenication.json").read)
        organization = params[:form_login][:organization]
        username = params[:form_login][:username]
        password = params[:form_login][:password]
        captcha = params[:form_login][:captcha]
        
        if captcha == "W68HP"
            if get_authen[organization].present?
                destination = login_path(organization: organization, username: username)
                get_authen[organization].each do |h|
                    if h["username"] == username && h["password"] == password
                        session["current_user"] = h
                        session["current_organization"] = organization
                        destination = root_path()
                        flash[:success] = "Login succussfully! Welcome #{h["firstname"]} to ESAS GUI"
                        break
                    end
                end
                flash[:error] = "Login failed! username or password incorrect. Please try again later" if session["current_user"].blank?
                redirect_to destination

            else
                flash[:error] = "Login failed! oranization ID not found. Please try again later"
                redirect_to login_path(organization: organization, username: username)
            end
        else
            flash[:error] = "Captcha incorrect. Please try again later"
            redirect_to login_path(organization: organization, username: username)
        end
    end

    def logout
        session.delete "current_user"
        flash[:success] = "Log out successfully. BYE!"
        redirect_to login_path()
    end

end
