class UserController < ApplicationController
    def index
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
end
