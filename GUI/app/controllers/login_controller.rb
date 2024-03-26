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
    end

    def logout
        session.delete "current_user"
        flash[:success] = "Log out successfully. BYE!"
        redirect_to login_path()
    end

    def user_registration
        @role = [["User Admin", 2], ["Suppervisor", 3], ["Operator", 4]]
        data = JSON.parse(open("./lib/authenication.json").read)
        @organizations = data.keys
    end

    def create_user
        begin
            write_json([params[:regis_create_form]], params[:regis_create_form][:organization])
            flash[:success] = "User has been created successfully"
            redirect_to registration_path()
        rescue => e
            flash[:error] = "Some thing went wrong, Plase contact admin!"
            puts "Error : #{e}"
            redirect_to registration_path()
        end
    end

    def upload_user
        begin
            upload_file = params[:regis_upload_form][:import_data]
            datas = read_csv(upload_file.path)
            write_json(datas, params[:regis_upload_form][:organization])
            flash[:success] = "Upload successfully"
            redirect_to registration_path()
        rescue => e
            flash[:error] = "Some thing went wrong, Plase contact admin!"
            puts "Error : #{e}"
            redirect_to registration_path()
        end
    end

    private

    def make_format data, order
        result = {}
        result["id"] = order
        result["username"] = data["username"]
        result["password"] = data["password"]
        result["firstname"] = data["firstname"]
        result["role"] = data["role"].to_i
        result
    end

    def write_json datas, organization
        old_data = JSON.parse(open("./lib/authenication.json").read)
        datas.each do |d|
            old_data[organization] = [] if old_data[organization].blank?
            old_data[organization] << make_format(d, old_data[organization].size+1)
        end
        File.open('./lib/authenication.json', 'w') do |f|
            f.write(old_data.to_json)
        end
    end

    def read_csv path
        require 'csv'
        result = []
        csv_text = File.read(path)
        csv = CSV.parse(csv_text, :headers => true)
        csv.each do |row|
            result << row.to_hash
        end
        result
    end
end
