'use strict';

const _ = require('lodash');
const SocketIoClient = require('socket.io-client');
const FormData = require('form-data');
const {post} = require('./lib.js');

class SocketIoSession {
  constructor(socket) {
    this.socket = socket;
  }

  init(context) {
    return new Promise(async (resolve, reject) => {
      this.socket.on('connect', () => {
        this.socket.headbeatTimeout = 10000;
        this.socket.headbeatInterval = 4500;
        this.socket.emit('init', context, (resp) => {
          if (resp.code != 0) {
            return reject(resp);
          }
          this.id = resp.sessionId;
          resolve();
        });
      });
      this.socket.on('disconnect', () => {
        this.disconnect();
      });
    });
  }

  on(event, callback) {
    if (event == 'analyzed') {
      this.socket.on(event, callback);
    } else if (event == 'disconnect') {
      this.socket.on(event, callback);
    }
  }

  send(data) {
    if (this.socket) {
      this.socket.emit('data', data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  term() {
    return new Promise(async (resolve, reject) => {
      if (this.socket) {
        this.socket.emit('term', {}, (resp) => {
          if (resp.code !=0) {
            return reject(resp);
          }
          resolve();
        });
      }
    });
  }
};

class EsasClientV2 {
  constructor(config) {
    this.config = config;
  }

  startSocketIoSession() {
    return new SocketIoSession(SocketIoClient.connect(`${this.config.url}`, {
      transports: ['websocket'],
      reconnection: false,
      path: '/socket',
    }));
  }

  fileAnalyze (file, withResult = false) {
    const form = new FormData();
    form.append('uploadFile', file);
    return this._fileAnalyze(form, withResult);
  }

  bufferAnalyze (buffer, filename, contentType, withResult = false) {
    const form = new FormData();
    form.append('uploadFile', buffer, {
      filename,
      contentType,
      knownLength: buffer.length,
    });
    return this._fileAnalyze(form, withResult);
  }

  _fileAnalyze (form, withResult) {
    return new Promise(async (resolve, reject) => {
      try {
        if (withResult) {
          form.append('withResult', '1');
        }
        const res = await post(`${this.config.url}/uploadFile`, form, {'Content-Type': 'multipart/form-data'});
        if (res.status != 200) {
          throw `Status: ${res.status}`
        }
        if (withResult) {
          try {
            resolve(res.data);
          } catch (e) {
            reject(e);
          }
        } else {
          if (res.data.code != 0) {
            throw `code: ${res.data.code}, ${res.data.message}`;
          }
          resolve(res.data.key);
        }
      } catch (e) {
        reject(e);
      }
    });
  }
};

module.exports = EsasClientV2;
