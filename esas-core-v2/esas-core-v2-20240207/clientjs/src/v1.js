'use strict';

const _ = require('lodash');
const {get, post} = require('./lib');
const WebSocketClient = ((typeof WebSocket) != 'undefined' ? WebSocket : require('websocket').w3cwebsocket);
const EventEmitter = require('events');

class WebsocketSession {
  static STATUS = {
    OPENED: 1,
    SENDING_S: 20,
    DONE_S: 30,
    SENDING_E: 40,
    DONE_E: 50,
    CLOSED: 999,
  };

  static COMMAND = {
    S: 's',
    P: 'p',
    SERVER_E: 'e',
    CLIENT_E: '0x65',
  }

  constructor(socket) {
    this.socket = socket;
    this.status = WebsocketSession.STATUS.OPENED;
    this.emitter = new EventEmitter();

    this.socket.onclose = (event) => {
      this.status = WebsocketSession.STATUS.CLOSED;
      this.emitter.emit('closed');
    };

    this.socket.onmessage = (event) => {
      if (this.status == WebsocketSession.STATUS.CLOSED) {
      } else if (this.status == WebsocketSession.STATUS.SENDING_S) {
        if (event.data.startsWith(WebsocketSession.COMMAND.S)) {
          this.emitter.emit('_recvS', event.data)
        }
      } else if (this.status == WebsocketSession.STATUS.DONE_S || this.status == WebsocketSession.STATUS.SENDING_E) {
        if (event.data.startsWith(`${WebsocketSession.COMMAND.P} `)) {
          const data = event.data.slice(`${WebsocketSession.COMMAND.P} `.length);
          try {
            const analyzed = JSON.parse(data);
            this.emitter.emit('analyzed', analyzed)
          } catch (e) {
            this.status = WebsocketSession.STATUS.CLOSED;
            this.emitter.emit('error', data);
          }
        } else if(this.status == WebsocketSession.STATUS.SENDING_E) {
          if (event.data.startsWith(`${WebsocketSession.COMMAND.SERVER_E}`)) {
            this.emitter.emit('_recvE', event.data)
          }
        }
      }
    };
  };

  _sendS(audioFormat, callStartTime, callID1, agentID, type) {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.status != WebsocketSession.STATUS.OPENED) {
          throw new Error(`Unexpected _sendS() ${this.status}`)
        }
        this.socket.send(`${WebsocketSession.COMMAND.S} ${audioFormat} ${JSON.stringify({callStartTime, callID1, agentID, type})}`);
        this.status = WebsocketSession.STATUS.SENDING_S;
        this.emitter.on('_recvS', (data) => {
          this.status = WebsocketSession.STATUS.DONE_S;
          const error = data.slice(WebsocketSession.COMMAND.S.length).trim();
          if (error) {
            this.emitter.emit('error', error);
            this.close();
            return reject(error);
          }
          resolve();
        });
      } catch (e) {
        this.close();
        reject(e);
      }
    });
  }

  finishAudio() {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.status != WebsocketSession.STATUS.DONE_S) {
          throw new Error(`Unexpected finishAudio()`)
        }
        this.socket.send(WebsocketSession.COMMAND.CLIENT_E);
        this.status = WebsocketSession.STATUS.SENDING_E;
        this.emitter.on('_recvE', (data) => {
          this.status = WebsocketSession.STATUS.DONE_E;
          const error = data.slice(WebsocketSession.COMMAND.SERVER_E.length).trim();
          if (error) {
            return reject(error);
          }
          this.close();
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendAudio(buffer) {
    this.socket.send(buffer);
  }

  on(name, callback) {
    this.emitter.on(name, callback);
  }
};

class EsasClientV1 {
  constructor(config) {
    this.config = config;
  }

  startRtpSession(callID1, agentID, Fs, extraPrams = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const params = _.merge({}, extraPrams, {operation: 'start', callID1, agentID, Fs});
        const res = await post(`${this.config.url}/CallOperation`, params);
        if (res.status != 200) {
          throw `Status: ${res.status}`
        }
        resolve(res.data);
      } catch (e) {
        reject(e);
      }
    });
  }

  terminateRtpSession(callID1, sessionId) {
    return new Promise(async (resolve, reject) => {
      try {
        const params = _.merge({}, {operation: 'terminate', callID1, sessionId});
        const res = await post(`${this.config.url}/CallOperation`, params);
        if (res.status != 200) {
          throw `Status: ${res.status}`
        }
        resolve(res.data);
      } catch (e) {
        reject(e);
      }
    });
  }

  listRtpSessions() {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await get(`${this.config.url}/V1RtpSessions`, {});
        if (res.status != 200) {
          throw `Status: ${res.status}`
        }
        resolve(res.data);
      } catch (e) {
        reject(e);
      }
    });
  }

  static AUDIO_FORMATS = [
    'lsb8k',
    'msb8k',
    'lsb16k',
    'msb16k',
  ];

  startWebsocketSession(audioFormat, callStartTime, callID1, agentID, type, callbacks) {
    return new Promise(async (resolve, reject) => {
      try {
        let socket = new WebSocketClient(this.config.ws);
        socket.onopen = async (e) => {
          try {
            const websocketSession = new WebsocketSession(socket);
            if (callbacks.error) {
              websocketSession.on('error', callbacks.error);
            }
            if (callbacks.closed) {
              websocketSession.on('closed', callbacks.closed);
            }
            if (callbacks.analyzed) {
              websocketSession.on('analyzed', callbacks.analyzed);
            }
            await websocketSession._sendS(audioFormat, callStartTime, callID1, agentID, type);
            resolve(websocketSession);
          } catch (e) {
            reject(e);
          }
        };
        socket.onerror = (e) => {
          reject(e);
        };
      } catch (e) {
        reject(e);
      }
    });
  }
};

module.exports = EsasClientV1;
