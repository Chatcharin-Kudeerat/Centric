class DashboardController < ApplicationController
    def index
        @graph = [{"name" => "Energy", "data" => [["06:00", 10], ["09:00", 32], ["12:00", 24], ["15:00", 14], ["18:00", 35], ["21:00", 34]]},
         {"name" => "Stress", "data"=> [["06:00", 22], ["09:00", 43], ["12:00", 11], ["15:00", 32], ["18:00", 43], ["21:00", 12]]}, 
         {"name" => "Concentration", "data" => [["06:00", 43], ["09:00", 52], ["12:00", 12], ["15:00", 42], ["18:00", 11], ["21:00", 27]]}, 
         {"name" => "Anticipation", "data" => [["06:00", 4], ["09:00", 8], ["12:00", 28], ["15:00", 15], ["18:00", 26], ["21:00", 33]]}, 
         {"name" => "EmoCog", "data" => [["06:00", 11], ["09:00", 41], ["12:00", 23], ["15:00", 39], ["18:00", 41], ["21:00", 27]]}
        ]

        @alert = [{"call_start_time" => "2024-03-26 09:40:20", "op_name" => "Suppharoek", "remark" => "Help me please supervisor"},
            {"call_start_time" => "2024-03-26 10:24:54", "op_name" => "Worawut", "remark" => "Shut up!"},
            {"call_start_time" => "2024-03-26 11:11:24", "op_name" => "Chatcharin", "remark" => "Bello"},
            {"call_start_time" => "2024-03-26 11:35:22", "op_name" => "Suppharoek", "remark" => "Get out"},
            {"call_start_time" => "2024-03-26 12:00:54", "op_name" => "Weerat", "remark" => "Help please"},
            {"call_start_time" => "2024-03-26 12:03:55", "op_name" => "Phimpat", "remark" => "Please wait a minute"},
            {"call_start_time" => "2024-03-26 12:54:12", "op_name" => "Suppharoek", "remark" => "Stop your mind"},
            {"call_start_time" => "2024-03-26 13:24:21", "op_name" => "Suppharoek", "remark" => "Idiot"},
            {"call_start_time" => "2024-03-26 13:45:25", "op_name" => "Worawut", "remark" => "Shut up"},
            {"call_start_time" => "2024-03-26 14:02:20", "op_name" => "Chatcharin", "remark" => "Sorry I don't understand"}]
    end
end
