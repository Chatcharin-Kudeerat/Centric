'use strict';

const V1Rtp = require('./rtp');
const V1Websocket = require('./websocket');

module.exports = {
  setup: (serverIndex, app, httpServer) => {
    V1Rtp(serverIndex, app, httpServer);
    V1Websocket(serverIndex, app, httpServer);
  },

  start: () => {
    return new Promise((resolve, reject) => {
      try {
        resolve();
      } catch (e) {
        this.logger.error(`V1.start()`, e);
      }
    });
  },
  close: () => {
    return new Promise((resolve, reject) => {
      try {
        resolve();
      } catch (e) {
        this.logger.error(`V1.close()`, e);
      }
    });
  },
};
