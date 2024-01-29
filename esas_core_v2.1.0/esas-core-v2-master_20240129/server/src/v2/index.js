'use strict';

const V2File = require('./file');
const V2SocketIO = require('./socketio');


module.exports = {
  setup: (serverIndex, app, httpServer) => {
    V2File(serverIndex, app, httpServer);
    V2SocketIO(serverIndex, app, httpServer);
  },
  start: () => {
    return new Promise((resolve, reject) => {
      try {
        resolve();
      } catch (e) {
        this.logger.error(`V2.start()`, e);
      }
    });
  },
  close: () => {
    return new Promise((resolve, reject) => {
      try {
        resolve();
      } catch (e) {
        this.logger.error(`V2.close()`, e);
      }
    });
  },
};
