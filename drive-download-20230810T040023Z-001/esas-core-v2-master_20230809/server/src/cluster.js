'use strict';

require('colors');
const _ = require('lodash');
const util = require('util');
const fs = require('fs');
const cluster = require('cluster');

const config = require('config');
const Redis = require('redis');
const Logger = require('logger');

const logger = Logger();

const PID_FILE = '/usr/local/tmp/esas-server.pid';

class Cluster {
  constructor() {
    this.logger = Logger('[cluster]')
  }

  master() {
    for ( let index = 0; index < (config.server.workers || 1); index++) {
      this.fork(index);
    }
  }

  forceShutdown(timeout = 1000) {
    try {
      this.logger.info('forceShutdown'.cyan);
      for (const id in cluster.workers ) {
        const worker = cluster.workers[id];
        try {
          worker.send({
            op: 'close',
            timeout,
          });
        } catch (e) {
        }
      }
      setTimeout( ()=> {
        this.logger.info(`kill worker timeout`.cyan);
        for (const id in cluster.workers ) {
          const worker = cluster.workers[id];
          this.logger.info(`kill worker ${worker.id}`.cyan);
          worker.disconnect();
          worker.kill();
        }
        setTimeout( ()=> {
          process.exit(0);
        }, 1000);
      }, 1000);
    } catch (e) {
      this.logger.error(`forceShutdown`, e);
      process.exit(1);
    }
  }

  fork(index) {
    const worker = cluster.fork();
    worker.index = index;
    return worker;
  }

  start() {
    return new Promise(async (resolve) => {
      try {
        if (_.filter(process.execArgv, (execArg) => execArg.startsWith('--inspect-brk')).length > 0) {
          this.initializeChild(0);
          return;
        }
        if (cluster.isMaster) {
          fs.writeFileSync(`${PID_FILE}`, String(process.pid));
          this.logger.info(`Start ${process.cwd()}`.cyan);
          cluster.on('exit', (worker, code, signal) => {
            this.logger.info(`worker end (${code}). ${worker.process.pid}`.cyan);
            if (this.terminating) {
              if (_.isEmpty(cluster.workers)) {
                process.exit(0);
              }
            } else {
              this.fork(worker.index);
            }
          });
          process.on('SIGHUP', () => {
            this.logger.info('SIGHUP'.cyan);
            if (_.isEmpty(cluster.workers)) {
              process.exit(0);
            }
            this.terminating = true;
            for (const id in cluster.workers ) {
              const worker = cluster.workers[id];
              worker.send({
                op: 'softkill',
                timeout: config.server.softkillTimeout,
              });
            }
            setTimeout( () => this.forceShutdown(), this.softkillTimeout + 5000);
          });
          process.on('SIGINT', () => {
            this.logger.info('SIGINT'.cyan);
            this.terminating = true;
            this.forceShutdown();
          });
          cluster.on('message', (worker, message) => {
            this.logger.info(`[message] ${util.inspect(message)}`);
            if (message.op == 'forked') {
              worker.send({
                op: 'index',
                index: worker.index,
              });
            }
            if (message.op == 'childInitialized') {
              worker.unixSockPath = message.unixSockPath;
              worker.serverIndex = message.serverIndex;
              worker.port = message.port;
            }
          });
          process.on('uncaughtException', (e) => {
            this.logger.error('uncaughtException', e);
          });
          await Redis.sessionRedisClient.flushdb();
          this.master();
          cluster.once('listening', ()=> {
            resolve();
          });
        } else {
          this.logger.info(`start worker ${process.cwd()}`.cyan);
          process.send({
            op: 'forked',
          });
          process.on('message', (message, resp) => {
            this.logger.info(`[message] ${util.inspect(message)}`);
            if (message.op == 'index') {
              this.index = message.index;
              this.initializeChild(message.index);
            } else if (message.op == 'softkill') {
              this.server.close(message.timeout);
            } else if (message.op == 'close') {
              this.server.close(message.timeout);
            }
          });
        }
      } catch (e) {
        this.logger.error(`start`, e);
        resolve();
      }
    });
  }

  initializeChild(index) {
    const Server = require('./server');
    this.server = new Server(index);
    process.send({
      op: 'childInitialized',
      serverIndex: this.server.serverIndex,
      unixSockPath: this.server.unixSockPath,
      port: this.server.port,
    });
    this.server.start();
  }
}

module.exports = Cluster;
