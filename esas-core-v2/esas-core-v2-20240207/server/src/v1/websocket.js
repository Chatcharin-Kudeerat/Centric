'use strict';

const _ = require('lodash');
const nodeUuid = require('uuid');
const moment = require('moment');
const ws = require('ws');
const url = require('url');
const EventEmitter = require('events');
const config = require('config');
const lib = require('lib');
const Redis = require('redis');
const SessionManager = require('session_manager');
const EngineClient = require('engine_client');
const Logger = require('logger');

let sessionManager = null;

class V1WebsocketSession {
  static setup(serverIndex) {
    V1WebsocketSession.ServerIndex = serverIndex;
  }

  constructor(data) {
    this.id = nodeUuid.v4().split('-').join('');
    this.logger = Logger(`[${V1WebsocketSession.ServerIndex}] [${this.id}]`);
    this.data = data;
    this.segmentIndex = 0;
    this.avg_coretype = {}; // 20231218_AmiVoice_add_new_parameter_coretype
  }

  init(websocketServer) {
    this.websocketServer = websocketServer;
    this.websocketServer.emitter.on('context', (context) => {
      this.callStartTime = context.callStartTime;
      this.callID1 = context.callID1;
      this.agentID = context.agentID;
      this.channel = (context.type == 'operator' ? 0 : 1);
    });
    // 20231218_AmiVoice_add_new_parameter_coretype_add_argrument_lastSegments
    this.websocketServer.emitter.on('analyzed', (engineParams, lastSegments = false) => {
      const esasParams = _.chain(engineParams)
            .map((engineParam, i) => {
              this.logger.debug(`Engine param`, JSON.stringify(engineParam));
              // 20231218_AmiVoice_add_new_parameter_coretype_add_if_else
              if (lastSegments){
                const esasParam = lib.logic.buildEsasParam({
                  index: ++this.segmentIndex,
                  channel: i,
                }, {
                  Segment: null,
                  CoreType: lib.logic.calAvgCoretype(this.avg_coretype, i),
                });
                return esasParam;
              }else{
                const esasParam = lib.logic.buildEsasParam(engineParam, {
                  Segment: ++this.segmentIndex,
                  StartTime: moment(this.startAt).format('YYYY-MM-DD HH:mm:ss'),
                  Channel: this.channel,
                });

                if (!esasParam) {
                  return null;
                }
                this.logger.trace(`Esas param`, JSON.stringify(esasParam));

                // 20231218_AmiVoice_add_new_parameter_coretype_add_store_coretype
                const s_channel = engineParam.channel.toString();
                if (_.isUndefined(this.avg_coretype[s_channel])){
                  this.avg_coretype[s_channel] = []
                }
                this.avg_coretype[s_channel].push(lib.logic.getCoretypeValue(engineParam));

                return esasParam;
              }
            })
            .compact()
            .value();

      if (_.isEmpty(esasParams)) {
        return;
      }
      const params = {
        callID: this.callID1,
        AgentID: this.agentID,
        Port: config.server.v1.wsPort,
        Param: esasParams,
      };
      this.websocketServer.socket.send(`${WebsocketServer.COMMAND.P} ${JSON.stringify(params)}`);
    });
  }

  start() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`V1WebsocketSession.start() begin`);
        this.startAt = new Date();
        const context = await this.websocketServer.open();
        this.logger.info(`V1WebsocketSession.start() session start`, context);
        this.data = context;
        await sessionManager.setSessionRedis(this);
        this.logger.trace(`V1WebsocketSession.start() end`);
        resolve();
      } catch (e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`V1WebsocketSession.start() session error`, e);
        reject(new V1WebsocketSession.Error('V1WebsocketSession start error'));
      }
    });
  }

  close() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`V1WebsocketSession.close() begin`);
        await this.websocketServer.close();
        this.websocketServer = null;
        this.logger.info(`V1WebsocketSession.close() session closed`);
        this.logger.trace(`V1WebsocketSession.close() end`);
        resolve();
      } catch (e) {
        this.logger.error(`V1WebsocketSession.close()`, e);
        resolve();
      }
    });
  }

  storeObject() {
    return {
      callID1: this.callID1,
      agentID: this.agentID,
      data: this.data,
    };
  }
}

class WebsocketServer {
  static STATUS = {
    OPENED: 10,
    RECV_S: 20,
    DONE_S: 30,
    RECV_E: 40,
    DONE_E: 50,
    CLOSED: 999,
  };

  static COMMAND = {
    S: 's',
    P: 'p',
    SERVER_E: 'e',
    CLIENT_E: '0x65',
  }

  constructor(logger, socket, options = {}) {
    this.logger = logger;
    this.socket = socket;
    this.options = options;
    this.emitter = new EventEmitter();
    this.status = WebsocketServer.STATUS.OPENED;
  }

  init() {
    this.socket.on('message', async (data) => {
      if (this.status == WebsocketServer.STATUS.OPENED) {
        try {
          data = String(data);
          if (data.startsWith(`${WebsocketServer.COMMAND.S} `)) {
            this.logger.trace(`WebsocketServer.socket.on() recv s`);
            this.status = WebsocketServer.STATUS.RECV_S;
            const matches = data.slice(`${WebsocketServer.COMMAND.S} `.length).match(/^(\S+) (.+)$/)
            if (!matches) {
              throw new WebsocketServerError('Invalid s command');
            }
            const audioFormat = matches[1];
            let sampleRate = null;
            let bigendian = false;
            let bitRate = null; // 20231218_AmiVoice_add_parameter
            // if (audioFormat == 'lsb8k') {
            //   sampleRate = 8000;
            // } else if (audioFormat == 'msb8k') {
            //   sampleRate = 8000;
            //   bigendian = true;
            // } else if (audioFormat == 'lsb16k') {
            //   sampleRate = 16000;
            // } else if (audioFormat == 'msb16k') {
            //   sampleRate = 16000;
            //   bigendian = true;
            // } else {
            //   throw new WebsocketServerError(`Invalid audioFormat ${audioFormat}`);
            // }
            if (audioFormat == 'lsb8k') { // 20231218_AmiVoice_update_check_audio_format
              bitRate = 16;
              sampleRate = 8000;
            } else if (audioFormat == 'msb8k') {
              bitRate = 16;
              sampleRate = 8000;
              bigendian = true;
            } else if (audioFormat == 'lsb16k') {
              bitRate = 16;
              sampleRate = 16000;
            } else if (audioFormat == 'msb16k') {
              bitRate = 16;
              sampleRate = 16000;
              bigendian = true;
            } else if (audioFormat == 'mulaw8k' || audioFormat == 'alaw8k' || audioFormat == 'pcml8b8k') {
              bitRate = 8;
              sampleRate = 8000;
            } else if (audioFormat == 'pcmb8b8k') {
              bitRate = 8;
              sampleRate = 8000;
              bigendian = true;
            } else if (audioFormat == 'mulaw16k' || audioFormat == 'alaw16k' || audioFormat == 'pcml8b16k') {
              bitRate = 8;
              sampleRate = 16000;
            } else if (audioFormat == 'pcmb8b16k') {
              bitRate = 8;
              sampleRate = 16000;
              bigendian = true;
            } else {
              throw new WebsocketServerError(`Invalid audioFormat ${audioFormat}`);
            }
            try {
              const context = JSON.parse(matches[2]);
              this.emitter.emit('context', context);
            } catch (e) {
              throw new WebsocketServerError('Invalid s json');
            }
            this.handshake = {
              isPCM: true,
              channels: 1,
              backgroundNoise: config.engine.backgroundNoise,
              // bitRate: 16,
              bitRate, // 20231218_AmiVoice_add_param_bitRate
              sampleRate,
              bigendian,
              audioFormat: audioFormat, // 20231218_AmiVoice_add_param_audioCodec
            };
            this.logger.trace(`WebsocketServer.socket.on() send s`);
            this.engineClient = new EngineClient(this.logger, this.emitter, this.handshake);
            await this.engineClient.start();
            this.socket.send(WebsocketServer.COMMAND.S);
            await Redis.countSuccess('V1.WS.start');
            this.status = WebsocketServer.STATUS.DONE_S;
            this.logger.trace(`WebsocketServer.socket.on() doneS`);
            this.emitter.emit('doneS', {handshake: this.handshake, audioFormat});
          }
        } catch (e) {
          this.logger.error(`WebsocketServer.socket.on()`, e);
          await Redis.countError('V1.WS.start');
          if (e instanceof(lib.EsasError)) {
            this.socket.send(`${WebsocketServer.COMMAND.S} ${e.message}`);
          } else {
            this.socket.send(`${WebsocketServer.COMMAND.S} internal error`);
          }
          this.close();
          this.logger.trace(`WebsocketServer.socket.on() doneS`, e);
          this.emitter.emit('doneS', 's internal error');
        }
      } else if (this.status == WebsocketServer.STATUS.DONE_S) {
        let isEnd = false;
        const possibllyCommand = data.slice(-WebsocketServer.COMMAND.CLIENT_E.length);
        if (String(possibllyCommand) == WebsocketServer.COMMAND.CLIENT_E) {
          isEnd = true;
          data = data.slice(0, -WebsocketServer.COMMAND.CLIENT_E.length);
        }
        if (data.length > 0) {
          this.logger.trace(`WebsocketServer.socket.on() data ${data.length}`);
          if (this.engineClient) {
            this.engineClient.sendBuffer(data);
          }
        }
        if(isEnd) {
          try {
            this.logger.trace(`WebsocketServer.socket.on() recv e`);
            this.status = WebsocketServer.STATUS.RECV_E;
            this.close();
          } catch (e) {
            this.logger.error(`WebsocketServer.socket.on()`, e);
          }
        }
      }
    });
  }

  open() {
    return new Promise( async (resolve, reject) => {
      this.logger.trace(`WebsocketServer.open() begin`);
      this.emitter.on('doneS', (msg) => {
        if (_.isString(msg)) {
          return reject(new WebsocketServer.Error('Websocket open error'));
        }
        resolve(msg);
      });
    });
  }

  close() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`WebsocketServer.close() begin`);
        if (this.engineClient) {
          await this.engineClient.close();
          this.engineClient = null;
        }
        if (this.socket) {
          if (this.status == WebsocketServer.STATUS.RECV_E) {
            this.socket.send(WebsocketServer.COMMAND.SERVER_E);
            this.status = WebsocketServer.STATUS.DONE_E;
          } else if (this.status == WebsocketServer.STATUS.DONE_S) {
            this.socket.send(`${WebsocketServer.COMMAND.P} internal error`);
          }
          this.socket.close()
          this.status = WebsocketServer.STATUS.CLOSED;
          this.socket = null;
        }
        resolve();
      } catch(e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`WebsocketServer.close() Websocket server error`, e);
        reject(new WebsocketServer.Error('Websocket close error'));
      }
    });
  }
};

class WebsocketServerError extends lib.EsasError {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = lib.CODE.WEBSOCKET_ERROR;
  }
};
WebsocketServer.Error = WebsocketServerError;

module.exports = (serverIndex, app, httpServer) => {
  const logger = Logger(`[${serverIndex}]`);
  V1WebsocketSession.setup(serverIndex);
  SessionManager.setup(serverIndex);
  sessionManager = SessionManager.createInstance('V1Websocket');
  const wsServer = new ws.Server({noServer: true});
  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = url.parse(request.url);
    if (pathname == '/') {
      wsServer.handleUpgrade(request, socket, head, (socket) => {
        wsServer.emit('connection', socket);
      });
    }
  });
  wsServer.on('connection', async (socket) => {
    let sessionId = null;
    try {
      logger.trace('websocket() connect');
      const session = new V1WebsocketSession({});
      sessionId = session.id;
      const websocketServer = new WebsocketServer(session.logger, socket);
      websocketServer.init();
      session.init(websocketServer);
      await sessionManager.startSession(session);
      socket.on('close', async () => {
        logger.trace('websocket() close');
        try {
          await sessionManager.closeSession({sessionId});
        } catch (e) {
          logger.error(`websocket() connect`, e);
        }
      });
    } catch (e) {
      logger.error(`websocket() connect`, e);
      try {
        await sessionManager.closeSession({sessionId});
      } catch (e) {
        logger.error(`websocket() connect`, e);
      }
    }
  });
  app.get('/V1WebsocketSessions', async(req, res) => {
    const sessionContexts = await sessionManager.listSessionContexts();
    res.header('Content-Type', 'text/javascript; charset=utf-8');
    res.status(200);
    res.send(JSON.stringify(sessionContexts));
  });
};
