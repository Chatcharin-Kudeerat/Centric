'use strict';

const config = require('config');
const lib = require('lib');
const rediskey = require('rediskey');
const Redis = require('redis');
const Logger = require('logger');

// TODO CallID will be deprecated after v1 abolished.
const registerCallID = async (managerKey, callID, sessionId) => {
  if (!callID) {
    return false;
  }
  const id = await Redis.sessionRedisClient.get(rediskey.CallID(managerKey, callID));
  if (id) {
    throw `callID1 ${callID} is processing`;
  }
  await Redis.sessionRedisClient.setex(rediskey.CallID(managerKey, callID), Math.floor(config.server.session.maxTermMS / 1000) + 60, sessionId);
  return true;
};

const deregisterCallID = async (managerKey, callID) => {
  if (callID) {
    await Redis.sessionRedisClient.del(rediskey.CallID(managerKey, callID));
  }
}

class SessionManager {
  static setup(serverIndex) {
    SessionManager.ServerIndex = serverIndex;
  }

  static createInstance(key) {
    const managerKey = rediskey.ManagerKey(key);
    return SessionManager.ManagerByKey[managerKey] = SessionManager.ManagerByKey[managerKey] || new SessionManager(managerKey);
  }


  constructor(managerKey) {
    this.serverIndex = null;
    this.sessionById = {};
    this.managerKey = managerKey;
    this.logger = Logger(`[${SessionManager.ServerIndex}]`);
  }

  setSessionRedis(session) {
    return Redis.sessionRedisClient.hset(this.managerKey, session.id, JSON.stringify(session.storeObject()));
  }

  startSession(session) {
    return new Promise( async (resolve, reject) => {
      try {
        if (config.server.session.maxTermMS) {
          session.closeTimeout = setTimeout(() => {
            this.logger.info(`[${session.id}] SessionManager session timeout`);
            this.closeSession({sessionId: session.id});
          }, config.server.session.maxTermMS);
        }
        const registered = await registerCallID(this.managerKey, session.callID1, session.id);
        await Redis.subRedisClient.subscribe(session.id);
        this.logger.trace(`[${session.id}] SessionManager.startSession() begin`);
        this.sessionById[session.id] = session;
        await this.setSessionRedis(session);
        await session.start();
        this.logger.trace(`[${session.id}] SessionManager.startSession() end`);
        if (!registered) {
          await registerCallID(this.managerKey, session.callID1, session.id);
        }
        resolve();
      } catch (e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`[${session.id}] SessionManager.startSession() session error`, e);
        reject(new SessionManager.Error('Session start error'));
      }
    });
  }

  closeSession(params) {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`SessionManager.closeSession() begin`);
        const session = this.sessionById[params.sessionId];
        if (session) {
          clearTimeout(session.closeTimeout);
          session.closeTimeout = null;
          await deregisterCallID(this.managerKey, session.callID1);
          await Redis.subRedisClient.unsubscribe(session.id);
          delete this.sessionById[session.id];
          await Redis.sessionRedisClient.hdel(this.managerKey, session.id);
          await session.close();
					this.logger.trace(`[${session.id}] SessionManager.closeSession() end`);
					return resolve();
				}
        if (params.callID1) {
          params.sessionId = params.sessionId || await Redis.sessionRedisClient.get(rediskey.CallID(this.managerKey, params.callID1));
        }
        if (!params.sessionId) {
          throw `No sessionId`;
        }
        this.logger.info(`[${params.sessionId}] SessionManager._closeSessionNotfound() escalation`);
        await Redis.pubRedisClient.publish(params.sessionId, JSON.stringify({op: 'terminateCallOperation', key: this.managerKey}));
        this.logger.trace(`[${params.sessionId}] SessionManager.closeSession() (not found) end`);
        resolve();
      } catch (e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`SessionManager.closeSession() session error`, e);
        reject(new SessionManager.Error('Session close error'));
      }
    });
  }

  async listSessionContexts() {
    const sessionContexts = await Redis.sessionRedisClient.hgetall(this.managerKey) || {};
    for (const sessionId in sessionContexts) {
      try {
        sessionContexts[sessionId] = JSON.parse(sessionContexts[sessionId]);
      } catch (e) {
        sessionContexts[sessionId] = {};
      }
    }
    return sessionContexts;
  }
};
SessionManager.ManagerByKey = {};

class SessionManagerError extends lib.EsasError {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = lib.CODE.SESSION_MANAGER_ERROR;
  }
};
SessionManager.Error = SessionManagerError;


Redis.subRedisClient.on('message', (sessionId, message) => {
  message = JSON.parse(message)
  if (message.op == 'terminateCallOperation') {
    const sessionManager = SessionManager.ManagerByKey[message.key];
    sessionManager.logger.info(`[${sessionId}] 'terminateCallOperation' recieved`);
    sessionManager.closeSession({sessionId});
  }
});

module.exports = SessionManager;
