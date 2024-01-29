'use strict';

require('colors');
const _ = require('lodash');
const sha1 = require('sha1');
const moment = require('moment');
const path = require("path");
const fs = require("fs");
const qs = require('qs');
const mime = require('mime');
const http = require('http');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const nodeUuid = require('uuid');

const config = require('config');
const lib = require('lib');
const Redis = require('redis');
const EngineClient = require('engine_client');

const V1 = require('v1');
const V2 = require('v2');
const Logger = require('logger');

const SOCKET_LISTEN_BACKLOG = 8192;
const SOCKET_PATH = '/usr/local/tmp';

const secretHash = (obj) => {
  return sha1(
    lib.k() + _.chain(obj)
      .toPairs()
      .sort((a, b) => a[0] - [b])
      .flatten()
      .join('')
      .value()
  );
};

class Server {
  constructor(serverIndex) {
    this.serverIndex = serverIndex;
    this.logger = Logger(`[${this.serverIndex}]`);
    this.app = express();
    this.app.use(compression());
    this.app.use(bodyParser.urlencoded({extended: true}));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.text());
    this.app.disable('etag');
    this.app.disable('x-powered-by');
    if (config.server.port) {
      this.port = config.server.port;
    } else {
      this.unixSockPath = `${SOCKET_PATH}/server-${nodeUuid.v4().split('-').join('')}.sock`;
    }
    this.httpServer = http.Server(this.app);
    this.app.get('/healthCheck', (req, callback) => this.healthCheck(req, callback));
    this.app.get('/statistics', (req, callback) => this.statistics(req, callback));
    this.app.post('/inspectStatistics', (req, callback) => this.inspectStatistics(req, callback));
    this.app.get('/config.js', (req, callback) => this.configJs(req, callback));
    this.app.get('/licenseActivation', (req, callback) => this.licenseActivation(req, callback));
    this.app.get('/engineVersion', (req, callback) => this.engineVersion(req, callback));
    this.app.get('/updateVersion', (req, callback) => this.updateVersion(req, callback));
    this.app.use('/publish', express.static(`${path.resolve(process.env.NODE_PATH)}/../public/publish`));
    if (['test', 'development'].indexOf(process.env.NODE_ENV) >= 0) {
      this.app.use('/test', express.static(`${path.resolve(process.env.NODE_PATH)}/../public/test`));
    }
    V1.setup(this.serverIndex, this.app, this.httpServer);
    V2.setup(this.serverIndex, this.app, this.httpServer);
  }

  start() {
    return new Promise(async (resolve, reject) => {
      try {
        await V1.start();
        await V2.start();
        if (this.port) {
          this.logger.info(`\t✓ start server index:${this.serverIndex}, port:${this.port} env:${process.env.NODE_ENV}`.green);
          this.httpServer.listen(this.port, (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        } else {
          this.logger.info(`\t✓ start server index:${this.serverIndex}, unix: ${this.unixSockPath} env:${process.env.NODE_ENV}`.green);
          this.httpServer.listen(this.unixSockPath, SOCKET_LISTEN_BACKLOG, (err) => {
            if (err) {
              return reject(err);
            }
            fs.chmodSync(this.unixSockPath, '666');
            const symLink = `${this.unixSockPath}.sym`;
            fs.symlinkSync(path.basename(this.unixSockPath), symLink);
            fs.renameSync(symLink, `${SOCKET_PATH}/server-${this.serverIndex}.sock`);
            resolve();
          });
        }
      } catch (e) {
        this.logger.error(`Server.start()`, e);
      }
    });
  }

  close(timeout, exit = true) {
    return new Promise(async (resolve, reject) => {
      try {
        this.logger.info(`\t✓ close server index:${this.serverIndex}, port:${this.port} env:${process.env.NODE_ENV}`.green);
        await this.httpServer.close();
        await Promise.all([
          V1.close(timeout),
          V2.close(timeout),
        ]);
        if (exit) {
          process.exit(0);
        }
        resolve();
      } catch (e) {
        this.logger.error(`Server.close()`, e);
        if (exit) {
          process.exit(1);
        }
        reject(e);
      }
    });
  }

  async healthCheck(req, res) {
    try {
      res.status(200);
      res.send('ok');
    } catch (e) {
      res.status(500);
      res.send(String(e));
      this.logger.error(`Server.healthCheck()`, e);
    }
  }

  async inspectStatistics(req, res) {
    try {
      const json = JSON.parse(req.body.json);
      const h = json.h;
      delete json.h;
      const hash = secretHash(json);
      res.status(200);
      if (hash != h) {
        return res.send('Tampered data !');
      }
      const generated = json.generated.slice(0, 7);
      if (generated <= json.month) {
        return res.send('The data of the during month !');
      }
      return res.send('ok');
    } catch (e) {
      res.status(500);
      res.send(String(e));
      this.logger.error(`Server.inspectStatistics()`, e);
    }
  }

  async statistics(req, res) {
    try {
      const prefix = 'countKey#';
      if (req.query.key) {
        const monthLog = await Redis.countRedisClient.hgetall(req.query.key);
        monthLog.generated = moment().format('YYYY/MM/DD HH:mm:ss.SSS')
        monthLog.name = config.name;
        monthLog.month = req.query.key.slice(prefix.length);
        monthLog.h = secretHash(monthLog);
        res.status(200);
        res.setHeader('Content-disposition', `attachment; filename= ${monthLog.name}-${monthLog.month}.json`);
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(monthLog));
      } else {
        const keys = await Redis.countRedisClient.keys(`${prefix}*`);
        res.setHeader('Content-type', 'application/json');
        res.status(200);
        res.send(JSON.stringify(
          _.map(keys, (key) => ({
            key,
            name: key.slice(prefix.length),
          }))
        ));
      }
    } catch (e) {
      res.status(500);
      res.send(String(e));
      this.logger.error(`Server.statistics()`, e);
    }
  }

  async configJs(req, res) {
    try {
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      res.status(200);
      res.send(`window.esas = window.esas || {}; window.esas.config=${JSON.stringify(config.front)};`);
    } catch (e) {
      res.status(500);
      res.send(String(e));
      this.logger.error(`Server.configJs()`, e);
    }
  }

  async licenseActivation(req, res) {
    try {
      const message = await EngineClient.activate();
      res.status(200);
      res.send(JSON.stringify({
        code: 0,
        message,
      }));
    } catch (e) {
      this.logger.error(`Server.licenseActivation()`, e);
      let code = lib.CODE.INTERNAL_ERROR;
      let message = 'internal error';
      if (e instanceof(lib.EsasError)) {
        code = e.code;
        message = e.message;
      }
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      res.status(200);
      res.send(JSON.stringify({
        code,
        message,
      }));
    }
  }

  async engineVersion(req, res) {
    try {
      const version = await EngineClient.version();
      res.status(200);
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      version.code = 0;
      res.send(JSON.stringify(version));
    } catch (e) {
      this.logger.error(`Server.engineVersion()`, e);
      let code = lib.CODE.INTERNAL_ERROR;
      let message = 'internal error';
      if (e instanceof(lib.EsasError)) {
        code = e.code;
        message = e.message;
      }
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      res.status(200);
      res.send(JSON.stringify({
        code,
        message,
      }));
    }
  }

  async updateVersion(req, res) {
    try {
      const message = await EngineClient.update();
      res.status(200);
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      res.send(JSON.stringify({
        code: 0,
        message,
      }));
    } catch (e) {
      this.logger.error(`Server.engineVersion()`, e);
      let code = lib.CODE.INTERNAL_ERROR;
      let message = 'internal error';
      if (e instanceof(lib.EsasError)) {
        code = e.code;
        message = e.message;
      }
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      res.status(200);
      res.send(JSON.stringify({
        code,
        message,
      }));
    }
  }
}

class ServerError extends lib.EsasError {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = lib.CODE.SERVER_ERROR;
  }
};

Server.Error = ServerError;

module.exports = Server;
