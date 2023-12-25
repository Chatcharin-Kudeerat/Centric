'use strict';

const _ = require('lodash');
const os  = require('os');
const multer  = require('multer');
const upload = multer({ dest: os.tmpdir() });
const nodeUuid = require('uuid');

const config = require('config');
const lib = require('lib');
const Redis = require('redis');
const EngineClient = require('engine_client');
const Logger = require('logger');

module.exports = (serverIndex, app, httpServer) => {
  const logger = Logger(`[${serverIndex}]`);
  EngineClient.setup(serverIndex);
  app.post('/uploadFile', upload.single('uploadFile'), async(req, res) => {
    try {
      logger.info(`V2.uploadFile() start ${req.file.originalname}`);
      const params = await EngineClient.analyzeFile(req.file.path);
      let csv = '';
      let headers = null;
      for (const param of params) {
        if (!headers) {
          headers = _.keys(param);
          csv = _.map(headers, (header) => `"${header}"`).join(',') + "\n";
        }
        const values = [];
        for (const header of headers) {
          if (!param[header] && !_.isNumber(param[header])) {
            param[header] = '';
          }
          values.push(param[header]);
        }
        csv += values.join(',') + "\n";
      }
      if (_.get(req, 'body.withResult')) {
        res.header('Content-Type', 'text/plain; charset=utf-8');
        res.status(200);
        res.send(csv);
      } else {
        const key = nodeUuid.v4();
        await Redis.downloadRedisClient.multi([
          ['set', key, csv],
          ['expire', key, config.server.v2.donwloadExpire]
        ]).exec();
        res.header('Content-Type', 'text/javascript; charset=utf-8');
        res.status(200);
        res.send(JSON.stringify({
          code: 0,
          key,
        }));
        logger.info(`V2.uploadFile() end ${req.file.originalname} ${key}`);
      }
      await Redis.countSuccess('V2.FILE.start');
    } catch (e) {
      await Redis.countError('V2.FILE.start');
      logger.error(`V2.uploadFile()`, e);
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
  });

  app.post('/downloadFile', async(req, res) => {
    try {
      logger.info(`V2.downloadFile() ${req.body.key}`);
      const result = await Redis.downloadRedisClient.multi([
        ['get', req.body.key],
        ['del', req.body.key]
      ]).exec();
      const csv = _.get(result, '0.1');
      if (!csv) {
        throw 'not found'
      }
      res.header('Content-Type', 'text/plain; charset=utf-8');
      res.status(200);
      res.send(result[0][1]);
    } catch (e) {
      logger.error(`V2.downloadFile()`, e);
      let code = lib.CODE.INTERNAL_ERROR;
      let message = 'internal error';
      if (e instanceof(lib.EsasError)) {
        code = e.code;
        message = e.message;
      }
      res.header('Content-Type', 'text/javascript; charset=utf-8');
      res.status(404);
      res.send('Not found');
    }
  });
};
