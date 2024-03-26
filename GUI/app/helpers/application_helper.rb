module ApplicationHelper
    def flash_class(level)
        case level
            when "notice" then "alert alert-info"
            when "success" then "alert alert-success"
            when "error" then "alert alert-danger"
            when "warning" then "alert alert-warning"
        end
    end

    def flash_icon(level)
        case level
            when "notice" then "#info-fill"
            when "success" then "#check-circle-fill"
            when "error" then "#exclamation-triangle-fill"
            when "warning" then "#exclamation-triangle-fill"
        end 
    end
end
