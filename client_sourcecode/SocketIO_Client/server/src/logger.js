'use strict';

const util = require('util');
const fs = require('fs');
const _ = require('lodash');

const config = require('config');

let fd = null;
if (config.logfile) {
  fd = fs.openSync(`/usr/local/esas/log/${config.logfile}`, 'a+', 0o644);
}

const pad = (i, n) => {
  if (!n) {
    n = 2;
  }
  return ('000' + i).slice(-1 * n);
};

const now = () => {
  const n = new Date();
  return `${n.getYear()+1900}-${pad(n.getMonth()+1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}.${pad(n.getMilliseconds(), 3)}`;
};

class Logger {
  static get LV() {
    return {
      error: 10,
      warning: 20,
      info: 30,
      trace: 50,
      debug: 1000,
    };
  }

  static setLoglv(lv) {
    Logger.loglv = Logger.LV[lv];
  }

  constructor(prefix='') {
    this.prefix = prefix;
  }

  _log(loglv, args) {
    let line = `${now()} [${loglv}] ${this.prefix} `;
    for (const arg of args) {
      if (_.isString(arg)) {
        line += arg;
      } else {
        line += util.inspect(arg, {maxStringLength: null});
      }
      line += ' ';
    }
    console.log(line);
    if (fd) {
      fs.writeSync(fd, line + '\n');
    }
  }
}

const defineLv = (lvName, lv) => {
  Object.defineProperty(Logger.prototype, lvName, {
    value: function() {
      if ( Logger.loglv >= lv ) {
        this._log(lvName, arguments); // eslint-disable-line prefer-rest-params
      }
    },
  });
}

for (const lvName in Logger.LV) {
  defineLv(lvName, Logger.LV[lvName]);
}

Logger.setLoglv(config.loglv);

module.exports = (prefix) => {
  return new Logger(prefix);
};
