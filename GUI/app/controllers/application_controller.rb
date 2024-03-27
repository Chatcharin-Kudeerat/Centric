class ApplicationController < ActionController::Base
    helper_method :is_logged_in?
    include ApplicationHelper

    def is_logged_in?
        if session["current_user"].blank?
            redirect_to login_path()
        end
    end
end
