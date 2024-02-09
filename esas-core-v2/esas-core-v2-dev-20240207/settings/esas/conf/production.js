module.exports = {
  name: 'esj-hieda',      // Set client name
  loglv: 'info',                   // debug > trace > info > warning > error
  logfile: 'esas_core_server.log', //
  customFields: {
    'Segment': 'Segment',
    'Channel': 'Channel',
    'StartTime': 'StartTime',      // V1 only
    'StartPosSec': 'StartPosSec',
    'EndPosSec': 'EndPosSec',
    'Energy': 'Energy',
    'Stress': 'Stress',
    'EMO/COG': 'EMO/COG',
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
    'CoreType': 'CoreType',
  },
  server: {
    workers: 4, // More than equal 1
    softkillTimeout: 600000, // SIGHUP timeout
    rtp: {
      url: 'rtp://127.0.0.1', // for Address field in '/CallOperation'
    },
    session: {
      maxTermMS: 3600000,
    },
    v1: {
      realtimeNotificationUrl: 'https://jbqk5fa2n8.execute-api.ap-northeast-1.amazonaws.com/dev/ESASQA',
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
    password: 'DNNXGCK($L)3JUPRJ2EC4LQQ#QIDMT@R@T^P64QTFPHE3Q)KK*CUVD95Z8UH@6W2',
    apiKey: 'ce22d598-9723-45b0-850e-d6056bf58d3c',
    dockerName: 'AmiThaiUpdated-Test20231102',
    backgroundNoise: 1000,
    analysisReportReadyTimeout: 5000,
  },
  front: {
    uploadLimit: 5, // Number of files uploaded in parallel.
  },
};
