'use strict';

const _ = require('lodash');
const nodeUuid = require('uuid');
const axios = require('axios');
const moment = require('moment');

const config = require('config');
const lib = require('lib');
const Redis = require('redis');
const rediskey = require('rediskey');
const SessionManager = require('session_manager');
const RtpServer = require('rtp_server');
const Logger = require('logger');

const ESASQALOG_EXPIRE = 3600;

class V1RtpSession {
  static setup(serverIndex) {
    V1RtpSession.ServerIndex = serverIndex;
  }

  constructor(data) {
    this.id = nodeUuid.v4().split('-').join('');
    this.logger = Logger(`[${V1RtpSession.ServerIndex}] [${this.id}]`);
    this.data = data;
  }

  init(rtpServers) {
    this.rtpServers = rtpServers;
    this.logger.trace(`V1RtpSession.init() begin`);
    for (const rtpServer of this.rtpServers) {
      this._init(rtpServer);
    }
    this.logger.trace(`V1RtpSession.init() end`);
  }

  _init(rtpServer) {
    rtpServer.segmentIndex = 0;
    rtpServer.emitter.on('analyzed', (engineParams) => {
      const esasParams = _.chain(engineParams)
            .map((engineParam) => {
              this.logger.debug(`Engine param`, JSON.stringify(engineParam));
              const esasParam = lib.logic.buildEsasParam(engineParam, {
                Segment: ++rtpServer.segmentIndex,
                StartTime: moment(this.startAt).format('YYYY-MM-DD HH:mm:ss'),
              });
              if (!esasParam) {
                return null;
              }
              this.logger.trace(`Esas param`, JSON.stringify(esasParam));
              return esasParam;
            })
            .compact()
            .value();
      if (_.isEmpty(esasParams)) {
        return;
      }
      if (config.server.v1.realtimeNotificationUrl) {
        const options = {
          headers: {
            'Content-Type': 'application/json',
          },
        };
        const params = {
          callID: this.callID1,
          AgentID: this.agentID,
          Port: rtpServer.port,
          Param: esasParams,
        };
        if (this.withSession) {
          params.sessionId = this.id;
        }
        axios.post(config.server.v1.realtimeNotificationUrl, params, options)
          .then(() => {
            this.logger.info(`realtimeNotification ${JSON.stringify(params)}`);
          })
          .catch((e) => {
            this.logger.error(`realtimeNotification`, e);
          });
      }
    });
  }

  start() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`V1RtpSession.start() begin`);
        this.startAt = new Date();
        for (const rtpServer of this.rtpServers) {
          rtpServer.setExpire(config.server.session.maxTermMS + 60000);
          await rtpServer.open();
        }
        await Redis.countSuccess('V1.RTP.start');
        this.logger.info(`V1RtpSession.start() session start`);
        this.logger.trace(`V1RtpSession.start() end`);
        resolve();
      } catch (e) {
        await Redis.countError('V1.RTP.start');
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`V1RtpSession.start() session error`, e);
        reject(new V1RtpSession.Error('V1RtpSession start error'));
      }
    });
  }

  close() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`V1RtpSession.close() begin`);
        await Promise.all(
          _.map(this.rtpServers, (rtpServer) => rtpServer.close())
        );
        this.rtpServers = [];
        this.logger.info(`V1RtpSession.close() session closed`);
        this.logger.trace(`V1RtpSession.close() end`);
        resolve();
      } catch (e) {
        this.logger.error(`V1RtpSession.close()`, e);
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
};

class V1RtpSessionError extends lib.EsasError {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = lib.CODE.RTP_ERROR;
  }
};

V1RtpSession.Error = V1RtpSessionError;

const esasqa = async(req, res) => {
  await Redis.testRedisClient.rpush(rediskey.esasqa(req.body.sessionId, req.body.Port), `${moment().format('YYYY-MM-DD HH:mm:ss')}\n${JSON.stringify(req.body)}`);
  await Redis.testRedisClient.expire(rediskey.esasqa(req.body.sessionId, req.body.Port), ESASQALOG_EXPIRE);
  res.header('Content-Type', 'text/javascript; charset=utf-8');
  res.status(200);
  res.send(JSON.stringify({
    ResultCode: lib.CODE.OK,
    Error: '',
  }));
}

const esasqaLog = async(req, res) => {
  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.status(200);
  const [sessionId, port] = req.params[0].split('/');
  const logs = await Redis.testRedisClient.lrange(rediskey.esasqa(sessionId, port), 0, -1);
  res.send(logs.join("\n"));
}

module.exports = (serverIndex, app, httpServer) => {
  const logger = Logger(`[${serverIndex}]`);
  V1RtpSession.setup(serverIndex);
  RtpServer.setup(serverIndex);
  SessionManager.setup(serverIndex);
  const sessionManager = SessionManager.createInstance('V1Rtp');
  app.post('/CallOperation', async(req, res) => {
    let session = null;
    try {
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      if (req.body.operation == 'start') {
        logger.trace(`V1.callOperation() 'start'`);
        let sampleRate = null;
        if (req.body.Fs == '8kHz') {
          sampleRate = 8000;
        } else if (req.body.Fs == '16kHz') {
          sampleRate = 16000;
        }
        if (!sampleRate) {
          throw new V1RtpSession.Error(`Unknown Fs (${req.body.Fs})`);
        }
        const agentID = req.body.agentID;
        if (!agentID) {
          throw new V1RtpSession.Error(`agentID is required`);
        }
        const callID1 = req.body.callID1
        if (!callID1) {
          throw new V1RtpSession.Error(`callID1 is required`);
        }
        const withSession = req.body.withSession;
        const handshake = {
          isPCM: true,
          channels: 1,
          backgroundNoise: config.engine.backgroundNoise,
          bitRate: 16,
          sampleRate,
        };
        session = new V1RtpSession(handshake);
        session.init(
          _.chain(2)
            .times()
            .map(() => new RtpServer(session.logger, handshake))
            .value());
        session.callID1 = callID1;
        session.agentID = agentID;
        logger.info(`V1.callOperation() session start ${session.id}`);
        await sessionManager.startSession(session);
        const result = {
          ResultCode: lib.CODE.OK,
          Error: '',
          Address: config.server.rtp.url,
          Port0: session.rtpServers[0].port,
          Port1: session.rtpServers[1].port,
          RTPSize: 1280,
        };
        session.data.port0 = session.rtpServers[0].port;
        session.data.port1 = session.rtpServers[1].port;
        await sessionManager.setSessionRedis(session);
        if (withSession) {
          session.withSession = true;
          result.sessionId = session.id;
        }
        res.send(JSON.stringify(result));
      } else if (req.body.operation == 'terminate') {
        logger.trace(`V1.callOperation() 'terminate' ${JSON.stringify(req.body)}`);
        await sessionManager.closeSession({
          sessionId: req.body.sessionId,
          callID1: req.body.callID1,
        });
        logger.info(`V1.callOperation() session terminated ${JSON.stringify(req.body)}`);
        res.send(JSON.stringify({
          ResultCode: lib.CODE.OK,
          Error: '',
        }));
      }
    } catch (e) {
      logger.error(`V1.callOperation()`, e);
      let code = lib.CODE.INTERNAL_ERROR;
      let message = 'internal error';
      if (e instanceof(lib.EsasError)) {
        code = e.code;
        message = e.message;
      }
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      res.status(200);
      res.send(JSON.stringify({
        ResultCode: code,
        Error: message,
      }));
      if (session) {
        try {
          await sessionManager.closeSession({sessionId: session.id});
        } catch (e) {
          logger.error(`V1.callOperation()`, e);
        }
      }
    }
  });
  app.get('/V1RtpSessions', async(req, res) => {
    const sessionContexts = await sessionManager.listSessionContexts();
    res.header('Content-Type', 'text/javascript; charset=utf-8');
    res.status(200);
    res.send(JSON.stringify(sessionContexts));
  });
  if (['test', 'development'].indexOf(process.env.NODE_ENV) >= 0) {
    app.post('/ESASQA', (req, callback) => esasqa(req, callback));
    app.get('/ESASQA/*', (req, callback) => esasqaLog(req, callback));
  }
};
