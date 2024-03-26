class ApplicationController < ActionController::Base
    helper_method :is_logged_in?
    include ApplicationHelper
    def is_logged_in?
        return redirect_to login_path() if session["current_user"].blank?
    end
end
