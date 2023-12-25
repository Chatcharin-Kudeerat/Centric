'use strict';

const _ = require('lodash');
const childProcess = require('child_process');

exports.logic = require('./logic');

exports.k = () => {
  return 'A19A73F1-8724-4AFF-9698-1517FBEA2517';
};

exports.sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

exports.flipEndian = (buffer, n = 2) => {
  const boundary = Math.floor(buffer.length / n) * n;
  const [target, remaining] = _.chunk(buffer, boundary);
  return [_.chain(target).chunk(2).map(c => c.reverse()).flatten().value(), remaining];
}

exports.cmd = async(cmd, cwd = process.cwd(), extraEnv = {}, mode = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const options = {
        cwd: cwd,
        env: _.merge({}, process.env, extraEnv),
        shell: '/bin/bash',
      };
      const forked = childProcess.spawn(cmd, options);
      forked.stdin.end();
      let stdOutData = '';
      let stdErrData = '';
      if (!mode.noPipe) {
        forked.stdout.on('data', (data) => {
          if (mode.simple) {
            stdOutData = data;
            process.stdout.write(data);
          } else {
            stdOutData += String(data);
          }
        });
        forked.stderr.on('data', (data) => {
          if (mode.simple) {
            stdErrData = data;
            process.stderr.write(data);
          } else {
            stdErrData += String(data);
          }
        });
      }
      forked.on('close', (code) => {
        if (code == 0) {
          resolve(stdOutData);
        } else {
          reject(`Error code=${code} ${stdErrData}`);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

exports.CODE = {
  OK: 0,
  SERVER_ERROR: 202,          // server.js             Not used
  RTP_ERROR: 203,             // v1/rtp.js             Around V1 RTP sequence, including parameter error
  RTP_SERVER_ERROR: 204,      // rtp_server.js         Around RTP server
  ENGINE_ERROR: 205,          // engine_client.js      Around Nemsysco transaction
  WEBSOCKET_ERROR: 206,       // v1/websocket.js       Around V1 Websocket sequence, including parameter error
  SOCKETIO_ERROR: 207,        // v2/socketio.js        Around V2 SocketIO sequence
  FILE_ERROR: 208,            // v2/file.js            Not used
  SESSION_MANAGER_ERROR: 211, // session_manager.js    Around real-time analysis session, including parameter error
  INTERNAL_ERROR: 501,        //                       Unexpected error
};

class EsasError extends Error {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = 501;
  }
};
exports.EsasError = EsasError;
