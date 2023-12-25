module.exports = {
  name: 'ESAStest',
  loglv: 'trace', // debug, trace, info, warning, error
  ffmpeg: '/usr/local/bin/ffmpeg',
  customFields: {
    'Segment': 'Segment',
    'Channel': 'Channel',
    'StartTime': 'StartTime',
    'StartPosSec': 'StartPosSec',
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
    'report.MEE': 'MEE',
  },
  server: {
    workers: 4, // More than equal 1
    softkillTimeout: 600000, // SIGHUP timeout
    // port: 8081,
    rtp: {
      url: 'rtp://127.0.0.1', // @@@
      delayedBufferMs: 1000,
    },
    session: {
      maxTermMS: 300000,
    },
    v1: {
      realtimeNotificationUrl: 'http://localhost/ESASQA',
      wsPort: 80, // for WebSocket p command.
    },
    v2: {
      donwloadExpire: 300, // The downloadable term of the CSV at fileUplaod.html.
      socketio: {
        heartbeatTimeout: 10000,
        heartbeatInterval: 4500,
      },
    },
  },
  engine: {
    password: 'DNNXGCK($L)3JUPRJ2EC4LQQ#QIDMT@R@T^P64QTFPHE3Q)KK*CUVD95Z8UH@6W2',
    apiKey: 'ce22d598-9723-45b0-850e-d6056bf58d3c',
    dockerName: 'engine-server',
    backgroundNoise: 1000,
    analysisReportReadyTimeout: 5000,
  },
  front: {
    uploadLimit: 3, // Number of files uploaded in parallel.
  },
};
