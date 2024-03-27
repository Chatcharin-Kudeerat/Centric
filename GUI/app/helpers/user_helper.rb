module UserHelper
  def edit_organization?
    result = session['current_user']["role"] == 1 ? nil : "disabled"
  end
end
