'use strict';

const _ = require('lodash');
const nodeUuid = require('uuid');
const moment = require('moment');
const EventEmitter = require('events');
const socketio = require('socket.io');

const config = require('config');
const lib = require('lib');
const Redis = require('redis');
const SessionManager = require('session_manager');
const EngineClient = require('engine_client');
const Logger = require('logger');

let sessionManager = null;

class V2SocketIoSession {
  static setup(serverIndex) {
    V2SocketIoSession.ServerIndex = serverIndex;
  }

  constructor(socket) {
    this.id = nodeUuid.v4().split('-').join('');
    this.logger = Logger(`[${V2SocketIoSession.ServerIndex}] [${this.id}]`);
    this.emitter = new EventEmitter();
    this.socket = socket;
    this.segmentIndex = 1;
    this.avg_coretype = {}; // 20231218_AmiVoice_add_new_parameter_coretype
  }

  init() {
    this.logger.trace(`V2SocketIoSession.init()`);
    this.socket.on('init', async (context, callback) => {
      try {
        this.logger.info(`V2SocketIoSession.socket.on() init`, context);
        this.handshake = {
          isPCM: true,
          backgroundNoise: config.engine.backgroundNoise,
          channels: context.channels,
          bitRate: context.bitRate,
          sampleRate: context.sampleRate,
          outputType: 'json',
          bigendian: context.bigendian,
          audioFormat: context.audioCodec, // 20231218_AmiVoice_add_param_audioFormat
        };
        this.engineClient = new EngineClient(this.logger, this.emitter, this.handshake);
        await this.engineClient.start();
        await sessionManager.startSession(this);
        this.logger.trace(`V2SocketIoSession.socket.on() init end`);
        callback({
          code: lib.CODE.OK,
          sessionId: this.id,
        });
        await Redis.countSuccess('V2.SocketIO.start');
      } catch(e) {
        await Redis.countError('V2.SocketIO.start');
        this.logger.error(`V2SocketIoSession.socket.on() init`, e);
        let code = lib.CODE.INTERNAL_ERROR;
        let message = 'internal error';
        if (e instanceof(lib.EsasError)) {
          code = e.code;
          message = e.message;
        }
        callback({
          code,
          message,
        });
      }
    });

    this.socket.on('data', (data) => {
      this.logger.trace(`V2SocketIoSession.socket.on() data ${data.length}`);
      if (this.engineClient) {
        this.engineClient.sendBuffer(data);
      }
    });

    // 20231218_AmiVoice_add_new_parameter_coretype_add_argrument_lastSegments
    this.emitter.on('analyzed', (engineParams, lastSegments = false) => {
      try{ 
        const esasParams = _.chain(engineParams)
              .map((engineParam, i) => {
                this.logger.debug(`Engine param`, JSON.stringify(engineParam));
                // 20231218_AmiVoice_add_new_parameter_coretype_add_if_else
                if (lastSegments){
                  const esasParam = lib.logic.buildEsasParam({
                    index: this.segmentIndex,
                    channel: i,
                  }, {
                    Segment: null,
                    CoreType: lib.logic.calAvgCoretype(this.avg_coretype, i),
                  });
                  return esasParam;
                }else{
                  const esasParam = lib.logic.buildEsasParam(engineParam, {
                    Segment: this.segmentIndex,
                  });
                  // AMIVOICE ADD THIS CONDITION
                  if (!(_.isObject(engineParam)) || (_.isObject(engineParam) && !(_.isNumber(engineParam.index) && _.isNumber(engineParam.channel)))){
                    this.logger.error(`SocketIO.analyzed error()`, 'code: 207, msg: Invalid Engine params');
                    return { code: new SocketIoError('Invalid Engine params').code, msg: 'Invalid Engine params' }
                  }
                  else if (!esasParam) {
                    return null;
                  }
                  this.logger.trace(`Esas param`, JSON.stringify(esasParam));
                  this.segmentIndex++;

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
        if (this.socket) {
          this.socket.emit('analyzed', {
            Param: esasParams
          });
        }
      } catch (e) {
        this.logger.error(`SocketIO.analyzed error()`, e);
        this.logger.error(`SocketIO.analyzed error()`, 'code: 207, msg: SocketIO analyzed result error');
        this.socket.emit('analyzed', {
            code: new SocketIoError().code, msg: 'SocketIO analyzed result error'
        });
      }
    });

    this.socket.on('term', async (data, callback) => {
      try {
        this.logger.trace(`V2SocketIoSession.socket.on() term`);
        await this.engineClient.close();
        this.engineClient = null;
        callback({code: lib.CODE.OK})
        this.close();
      } catch (e) {
        let code = lib.CODE.INTERNAL_ERROR;
        let message = 'internal error';
        if (e instanceof(lib.EsasError)) {
          code = e.code;
          message = e.message;
        }
        callback({
          code,
          message,
        });
      }
    });

    this.socket.on('disconnect', () => {
      this.close();
    });
  }

  start() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`V2SocketIoSession.start() begin`);
        this.startAt = new Date();
        this.logger.info(`V2SocketIoSession.start() session start`, JSON.stringify(this.handshake));
        this.logger.trace(`V2SocketIoSession.start() end`);
        resolve();
      } catch (e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`V2SocketIoSession.start() session error`, e);
        reject(new V2SocketIoSession.Error('V2SocketIoSession start error'));
      }
    });
  }

  close() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`V2SocketIoSession.close() begin`);
        if (this.engineClient) {
          await this.engineClient.close();
          this.engineClient = null;
        }
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        this.logger.info(`V2SocketIoSession.close() session closed`);
        this.logger.trace(`V2SocketIoSession.close() end`);
        resolve();
      } catch (e) {
        this.logger.error(`V2SocketIoSession.close()`, e);
        resolve();
      }
    });
  }

  storeObject() {
    return {
      data: this.handshake,
    };
  }
}

class SocketIoError extends lib.EsasError {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = lib.CODE.SOCKETIO_ERROR;
  }
};

module.exports = (serverIndex, app, httpServer) => {
  const logger = Logger(`[${serverIndex}]`);
  logger.info(`setup socketio ${serverIndex}`);
  V2SocketIoSession.setup(serverIndex);
  SessionManager.setup(serverIndex);
  sessionManager = SessionManager.createInstance('V2SocketIo');

  const socketPath = `/socket`;
  const io = socketio(httpServer, {
    transports: ['websocket'],
    path: socketPath,
    pingInterval: config.server.v2.socketio.heartbeatTimeout,
    pingTimeout: config.server.v2.socketio.heartbeatInterval,
  });
  io.on('connection', (clientSocket) => {
    const session = new V2SocketIoSession(clientSocket);
    session.init();
  });
  // End sequence
  // io.of(socketPath).on('connection', (clientSocket) => {
  //   clientSocket.disconnect();
  // });

  app.get('/V2SocketIoSessions', async(req, res) => {
    const sessionContexts = await sessionManager.listSessionContexts();
    res.header('Content-Type', 'text/javascript; charset=utf-8');
    res.status(200);
    res.send(JSON.stringify(sessionContexts));
  });
};
