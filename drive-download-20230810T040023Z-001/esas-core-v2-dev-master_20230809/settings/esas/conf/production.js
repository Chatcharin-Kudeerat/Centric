module.exports = {
    name: 'AmiVoiceThai-beta',      // Set client name
    loglv: 'debug',                   // debug > trace > info > warning > error
    logfile: 'esas_core_server.log', //
    customFields: {
      'Segment': 'Segment',
      'Channel': 'Channel',
      'StartPosSec': 'StartPosSec',
      'StartTime': 'StartTime',      // V1 only
      'EndPosSec': 'EndPosSec',
      'Energy': 'Energy',
      'Stress': 'Stress',
      'Concentration': 'Concentration',
      'Anticipation': 'Anticipation',
      'Excitement': 'Excitement',
      'Hesitation': 'Hesitation',
      'Uncertainty': 'Uncertainty',
      'IntensiveThinking': 'IntensiveThinking',
      'ImaginationActivity': 'ImaginationActivity',
      'Embarrassment': 'Embarrassment',
      'Passionate': 'Passionate',
      'BrainPower': 'BrainPower',
      'Confidence': 'Confidence',
      'Aggression': 'Aggression',
      'AgentScore': 'AgentScore',
      'CallPriority': 'CallPriority',
      'Atmosphere': 'Atmosphere',
      'Upset': 'Upset',
      'Content': 'Content',
      'Dissatisfaction': 'Dissatisfaction',
      'ExtremeEmotion': 'ExtremeEmotion',
      'EMO/COG': 'EMO/COG',
      'engine.SOS': 'SOS',
      'engine.AVJ': 'AVJ',
      'engine.Fant': 'Fant',
      'engine.Fflic': 'Fflic',
      'engine.Fmain': 'Fmain',
      'engine.JQ': 'JQ',
      'engine.LJ': 'LJ',
      'engine.SPJ': 'SPJ',
      'engine.SPT': 'SPT',
      'engine.intCHL': 'intCHL',
      'report.MEE': 'MEE',
      'CoreType': 'CoreType'
    },
    server: {
        workers: 4, // More than equal 1
        softkillTimeout: 600000, // SIGHUP timeout
            rtp: {
                url: 'rtp://ec2-13-213-58-215.ap-southeast-1.compute.amazonaws.com', // for Address field in '/CallOperation'
            },
        session: {
            maxTermMS: 3600000,
        },
        v1: {
            realtimeNotificationUrl: 'http://127.0.0.1:8300/ESASQA',
            wsPort: 8001, // for WebSocket p command.
        },
        v2: {
            donwloadExpire: 3600, // The downloadable term of the CSV at fileUplaod.html.
            socketio: {
                heartbeatTimeout: 10000,
                heartbeatInterval: 4500,
            },
        },
    },
    engine: {
        password: 'G74ZPXW^!3E@*(*HW@5)CPT^)M1I6YZ$9S93$5%UUR%8CE3QUL9EYTAZAWDJR535',
        apiKey: 'bc79e737-4615-40c6-a231-588d253df583',
        dockerName: 'AmiVoiceThai-beta_20230720',
        backgroundNoise: 1000,
        analysisReportReadyTimeout: 5000,
    },
    front: {
        uploadLimit: 5, // Number of files uploaded in parallel.
    },
};