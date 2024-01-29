'use strict';

const _ = require('lodash');
const io = require('socket.io-client');
const puppeteer = require('puppeteer');
const fs = require('fs');
const FormData = require('form-data');
const { spawn } = require('child_process'); // 20231218_AmiVoice_add_spawn

const config = require('config');
const lib = require('lib');
const Redis = require('redis');
const Logger = require('logger');

const ENGINE_HOST = process.env.ENGINE_HOST || 'localhost';
const WEBSOCKET_URL = `ws://${ENGINE_HOST}:2259`;
const ADMIN_URL = `http://${ENGINE_HOST}:8080`;

const BROWSER_LAUNCH_ARGS = {
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
};

let logger = null;

class EngineClient {
  static setup(serverIndex) {
    if (EngineClient.ServerIndex != null) {
      return;
    }
    EngineClient.ServerIndex = serverIndex;
    logger = Logger(`[${EngineClient.ServerIndex}]`);
  }

  constructor(logger, emitter, handshake) {
    this.logger = logger;
    this.handshake = handshake;
    this.emitter = emitter;
    this.bytes = 0;
    // 20231218_AmiVoice_add_parameter_convert_and_store
    this.buffer_store = []; 
    this.current_bytes = 0; 
    this.buffer_size = 6615; 
  }

  static async _login(currentPage) {
    await currentPage.goto(ADMIN_URL, {
      waitUntil: 'networkidle0',
    });
    if (await currentPage.$('.login')) {
      await currentPage.type('.login input[type="password"]', config.engine.password);
      await currentPage.click('.login .login-button');
      for (let i = 0; i < 60; i++) {
        await lib.sleep(1000);
        if (!await currentPage.$('.login')) {
          break;
        }
      }
    }
  }

  static async _activate(currentPage) {
    await EngineClient._login(currentPage);
    if (await currentPage.$('#app')) {
      const rows = await currentPage.$$('.row');
      for (const row of rows) {
        const rowTitle = await (await row.getProperty('textContent')).jsonValue();
        if (rowTitle.indexOf('License Manager') >=0 ) {
          const elements = await row.$$('.base-input')
          for (const element of elements) {
            const text = await (await element.getProperty('textContent')).jsonValue();
            if (text.indexOf('API Key *') >= 0) {
              await (await element.$('input')).click();
              for (let i = 0; i < 100; i++) {
                await currentPage.keyboard.press('Delete');
                await currentPage.keyboard.press('Backspace');
              }
              await (await element.$('input')).type(config.engine.apiKey);
            } else if (text.indexOf('Api Key Password *') >= 0) {
              await (await element.$('input')).click();
              for (let i = 0; i < 100; i++) {
                await currentPage.keyboard.press('Delete');
                await currentPage.keyboard.press('Backspace');
              }
              await (await element.$('input')).type(config.engine.password);
            } else if (text.indexOf('Docker Name') >= 0) {
              await (await element.$('input')).click();
              for (let i = 0; i < 100; i++) {
                await currentPage.keyboard.press('Delete');
                await currentPage.keyboard.press('Backspace');
              }
              await (await element.$('input')).type(config.engine.dockerName);
            }
          }
          const activateButton = await row.$('.activate-row .base-btn');
          if (activateButton) {
            activateButton.click();
            for (let i = 0; i < 60; i++) {
              await lib.sleep(1000);
              const modalTitles = await currentPage.$$('#modals .title');
              for (const modalTitle of modalTitles) {
                const text = await (await modalTitle.getProperty('textContent')).jsonValue();
                if (text.indexOf('Activation successful') >= 0) {
                  logger.info('EngineClient._activate() Activation successful');
                  return 'Activation successful';
                }
              }
            }
            throw 'Activate Failed';
          }
          break;
        }
      }
    }
  }

  static async _update(currentPage) {
    await EngineClient._login(currentPage);
    if (await currentPage.$('#app')) {
      const checkUpdateButton = await currentPage.$('.info__block__body__line .base-btn');
      if (checkUpdateButton) {
        checkUpdateButton.click();
        for (let i = 0; i < 60; i++) {
          await lib.sleep(1000);
          if (await currentPage.$('.modal .body.attention-modal-text')) {
            for (const div of await currentPage.$$('.modal .body.attention-modal-text div')) {
              const text = (await (await div.getProperty('textContent')).jsonValue()).trim();
              const prefix = 'New Version: ';
              if (text.startsWith(prefix)) {
                const version = text.slice(prefix.length);
                logger.info(`EngineClient._update() Update engine version to ${version}`)
                const modalButtons = await currentPage.$$('.modal .footer .base-btn');
                for (const modalButton of modalButtons) {
                  const text = (await (await modalButton.getProperty('textContent')).jsonValue()).trim();
                  if (text == 'Apply') {
                    modalButton.click();
                    for (let j = 0; j < 60; j++) {
                      await lib.sleep(1000);
                      for (const div of await currentPage.$$('.modal .body.attention-modal-text div')) {
                        const text = (await (await div.getProperty('textContent')).jsonValue()).trim();
                        if (text.startsWith('Update process has been started.')) {
                          await lib.sleep(1000);
                          return `Start update to ${version}`
                        }
                      }
                    }
                    break;
                  }
                }
                break;
              } else if (text.startsWith('The latest EMLO')) {
                logger.info(`EngineClient._update() Latest version`);
                return `Latest version`;
              }
            }
            break;
          }
        }
      }
      logger.error(`EngineClient._update() Unexpected page`);
      throw `Update failed`
    }
  }

  static activate() {
    return new Promise(async (resolve, reject) => {
      let browser;
      let currentPage;
      try {
        logger.trace(`EngineClient.activate() begin`);
        browser = await puppeteer.launch(BROWSER_LAUNCH_ARGS);
        currentPage = await browser.newPage();
        await currentPage.setViewport({width: 1024, height: 800});
        const result = await EngineClient._activate(currentPage);
        if (currentPage && !currentPage.isClosed()) {
          await currentPage.close();
        }
        await browser.close();
        logger.trace(`EngineClient.activate() end`);
        resolve(result);
      } catch (e) {
        try {
          if (currentPage && !currentPage.isClosed()) {
            await currentPage.close();
          }
          await browser.close();
        } catch(e) {
          logger.error(`EngineClient.activate()`, e);
        }
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        logger.error(`EngineClient.activate()`, e);
        reject(new EngineClient.Error('EngineClient activate error'));
      }
    });
  }

  static update() {
    return new Promise(async (resolve, reject) => {
      let browser;
      let currentPage;
      try {
        logger.trace(`EngineClient.update() begin`);
        browser = await puppeteer.launch(BROWSER_LAUNCH_ARGS);
        currentPage = await browser.newPage();
        await currentPage.setViewport({width: 1024, height: 800});
        const message = await EngineClient._update(currentPage);
        if (currentPage && !currentPage.isClosed()) {
          await currentPage.close();
        }
        await browser.close();
        logger.trace(`EngineClient.update() end`);
        resolve(message);
      } catch (e) {
        try {
          if (currentPage && !currentPage.isClosed()) {
            await currentPage.close();
          }
          await browser.close();
        } catch(e) {
          logger.error(`EngineClient.update()`, e);
        }
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        logger.error(`EngineClient.update()`, e);
        reject(new EngineClient.Error('EngineClient activate error'));
      }
    });
  }

  static version() {
    return new Promise(async (resolve, reject) => {
      let browser;
      let currentPage;
      try {
        logger.trace(`EngineClient.version() begin`);
        browser = await puppeteer.launch(BROWSER_LAUNCH_ARGS);
        currentPage = await browser.newPage();
        await currentPage.setViewport({width: 1024, height: 800});
        await EngineClient._login(currentPage);
        const infoLines = await currentPage.$$('.info__block__body__line');
        const version = {};
        for (const infoLine of infoLines) {
          const text = await (await infoLine.getProperty('textContent')).jsonValue();
          const [field, value] = text.split(':');
          if (value) {
            version[field] = value;
          }
        }
        if (currentPage && !currentPage.isClosed()) {
          await currentPage.close();
        }
        await browser.close();
        logger.trace(`EngineClient.version() end`);
        resolve(version);
      } catch (e) {
        try {
          if (currentPage && !currentPage.isClosed()) {
            await currentPage.close();
          }
          await browser.close();
        } catch(e) {
          logger.error(`EngineClient.version()`, e);
        }
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        logger.error(`EngineClient.version()`, e);
        reject(new EngineClient.Error('EngineClient version error'));
      }
    });
  }

  static analyzeFile(filepath, bg_noise) {
    return new Promise(async (resolve, reject) => {
      try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filepath));
        if (!(bg_noise)){
          bg_noise = config.engine.backgroundNoise;
        }
        form.append('backgroundNoise', bg_noise);
        // form.append('dummyResponse', true); // 20231218_AmiVoice_additional_dummyResponse_functionality
        form.submit(`${ADMIN_URL}/analysis/analyzeFile`, (err, res) => {
          const buffers = [];
          const avg_coretype = {}; // 20231218_AmiVoice_add_new_parameter_coretype
          if (err) {
            Redis.countError('ENGINE.analizeFile');
            logger.error(`EngineClient.analyzeFile() error`, err);
            return reject(new EngineClient.Error('EngineClient analyzeFile error'));
          }
          res.on('data', (buffer) => {
            buffers.push(buffer);
          })
          res.on('end', () => {
            logger.info(`EngineClient.analyzeFile() end`);
            try {
              const data = JSON.parse(String(Buffer.concat(buffers)));
              logger.debug(`EngineClient.socket.on() 'analizeFile'`, JSON.stringify(data));
              if (!data.success) {
                Redis.countError('ENGINE.analizeFile');
                logger.error(`EngineClient.analyzeFile() error`, data);
                return reject(new EngineClient.Error('EngineClient analyzeFile error'));
              }
              const headers = EngineClient.parseEnginHeader(data.data.segments.headersPositions);
              const segments = [];
              for (const segment of data.data.segments.data) {
                const engineParam = _.zipObject(headers, segment);
                segments.push(lib.logic.buildEsasParam(engineParam, {
                  Segment: engineParam.index,
                  'report.MEE': null,
                }));

                // 20231218_AmiVoice_add_new_parameter_coretype_add_store_coretype
                const s_channel = engineParam.channel.toString()
                if (_.isUndefined(avg_coretype[s_channel])){
                  avg_coretype[s_channel] = []
                }
                avg_coretype[s_channel].push(lib.logic.getCoretypeValue(engineParam));
              }

              for (const channel in data.data.reports) {
                if (!(/channel-/i.test(channel))){ continue; }
                const channelData = data.data.reports[channel];
                const mentalEffortEfficiency = _.get(channelData, 'profile.mentalEfficiency.mentalEffortEfficiency') || 0;
                segments.push(lib.logic.buildEsasParam({
                  channel: parseInt(channel.slice('channel-'.length)),
                  'report.MEE': mentalEffortEfficiency,
                }, {
                  Segment: null,
                  CoreType: lib.logic.calAvgCoretype(avg_coretype, channel.slice('channel-'.length)), // 20231218_AmiVoice_add_new_parameter_coretype
                }));
              }
              resolve(segments);
              Redis.countSuccess('ENGINE.analizeFile');
            } catch (e) {
              Redis.countError('ENGINE.analizeFile');
              logger.error(`EngineClient.analyzeFile() error`, e);
              reject(new EngineClient.Error('EngineClient analyzeFile error'));
            }
          })
          res.on('error', (e) => {
            Redis.countError('ENGINE.analizeFile');
            logger.error(`EngineClient.analyzeFile() error`, e);
            reject(new EngineClient.Error('EngineClient analyzeFile error'));
          })
        });
      } catch(e) {
        Redis.countError('ENGINE.analizeFile');
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        logger.error(`EngineClient.analyzeFile()`, e);
        reject(new EngineClient.Error('EngineClient analyzeFile error'));
      }
    });
  }

  static parseEnginHeader(headers) {
    return _.chain(headers)
      .toPairs()
      .sort((a, b) => a[1] - b[1])
      .map((a) => a[0])
      .value();
  };

  start() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`EngineClient.start() begin`);
        this.socket = await this._connect();
        this.bigendian = this.handshake.bigendian;
        this.ffmpeg_c = await this._ffmpeg_child(this.handshake.audioFormat); // 20231218_AmiVoice_call_ffmpeg
        await this._handshake(
          this.handshake.isPCM,
          this.handshake.channels,
          this.handshake.backgroundNoise,
          this.handshake.bitRate,
          this.handshake.sampleRate,
        );
        this.socket.on('audio-analysis', (r) => {
          if (!r.success) {
            Redis.countEngine(1, 'Error#ENGINE.audio-analysis', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
            this.logger.error(`EngineClient.socket.on() 'audio-analysis' ${r.error}`);
            this.close();
            return;
          }
          this.logger.trace(`EngineClient.socket.on() 'audio-analysis' ${r.data.done}`);
          if (r.data.done) {
            Redis.countEngine(1, 'Success#ENGINE.audio-analysis', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
            this.logger.debug(`EngineClient.socket.on() 'audio-analysis'`, JSON.stringify(r.data));
            this.headers = this.headers || EngineClient.parseEnginHeader(r.data.headers);
            const datas = Array(this.handshake.channels).fill([]);
            for (let i in r.data.channels) {
              datas[i] = _.zipObject(this.headers, r.data.channels[i]);
            }
            this.logger.trace(`EngineClient.socket.on() emit`);
            this.emitter.emit('analyzed', datas);
          }
        });
        this.logger.trace(`EngineClient.start() end`);
        resolve();
      } catch(e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`EngineClient.start()`, e);
        reject(new EngineClient.Error('EngineClient start error'));
      }
    });
  }

  close() {
    return new Promise( async (resolve) => {
      try {
        this.logger.trace(`EngineClient.close() begin`);
        if (this.socket) {
          await this.sendZeroBuffer(); // 20231218_AmiVoice_add_send_zero_buffer
        }
        this.closing = true;
        if (this.socket) {
          if (!this.dataSent) {
            this.socket.disconnect();
            this.socket = null;
            this.logger.trace(`EngineClient.close() disconnect`);
            return resolve();
          }
          const disconnectTimeout = setTimeout(() => {
            if (this.socket) {
              this.socket.disconnect();
              this.socket = null;
              this.logger.warning(`EngineClient.close() disconnect timeout`);
              resolve();
            }
          }, config.engine.analysisReportReadyTimeout);
          this.socket.on('analysis-report-ready', (r) => {
            clearTimeout(disconnectTimeout);
            if (!r.success) {
              this.logger.error(`EngineClient.socket.on 'analysis-report-ready' ${r.error}`);
            }
            if (this.socket) {
              this.socket.disconnect();
              this.socket = null;
              this.logger.trace(`EngineClient.socket.on analysis-report-ready end bytes: ${this.current_bytes}`); // 20231218_AmiVoice_update_parameter
              resolve();
            }
          });
          
          this.socket.on('audio-analysis-completed', async (r) => {
              this.logger.trace(`EngineClient.socket.on() audio-analysis-complete`);
              if (r.success) {
                const datas = Array(this.handshake.channels).fill([{}]);
                const lastSegments = true;
                this.logger.trace(`EngineClient.close() emit last segment`);
                this.emitter.emit('analyzed', datas, lastSegments);

                this.logger.trace(`EngineClient.close() emit fetch-analysis-report`);
                this.socket.emit('fetch-analysis-report', {
                   outputFormat: 'json',
                   fetchSegments: false,
                });
              }

              if (!r.success) {
                 Redis.countEngine(1, 'Error#ENGINE.audio-analysis-complete', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
                 this.logger.error(`EngineClient.socket.on() 'audio-analysis-complete' ${r.error}`);
                 this.close();
              }
          });
          // this.logger.trace(`EngineClient.close() emit fetch-analysis-report`);
          // this.sendBuffer(Buffer.from(Array(32).fill(0))); // Send dummy
          // this.socket.emit('fetch-analysis-report', {
          //   outputFormat: 'json',
          //   fetchSegments: false,
          // });
          return
        }
        this.logger.trace(`EngineClient.close() end`);
        resolve();
      } catch(e) {
        this.logger.error(`EngineClient.close()`, e);
        resolve();
      }
    });
  }

  sendBuffer(buffer) {
    if (!this.closing) {
      if (this.bigendian) {
        if (this.remaining) {
          buffer = Buffer.concat([new Buffer(this.remaining), buffer]);
        }
        const [fliped, remaining] = lib.flipEndian(buffer);
        this.remaining = remaining;
        buffer = new Buffer(fliped);
      }
      this.dataSent = true;
      this.bytes += buffer.length;
      // 20231218_AmiVoice_update_send_buffer_process
      if (this.ffmpeg_c){
        this.ffmpeg_c.stdin.write(buffer)
        let current_buffer = this.calBufferSize(buffer)
        if (current_buffer) {
          this.socket.emit('audio-stream', current_buffer);
          Redis.countEngine(current_buffer.length, 'Bytes#ENGINE.send', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
        }
      }else{
        this.current_bytes += buffer.length;
        this.socket.emit('audio-stream', buffer);
        Redis.countEngine(buffer.length, 'Bytes#ENGINE.send', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
      }

      // this.socket.emit('audio-stream', buffer);
      // Redis.countEngine(buffer.length, 'Bytes#ENGINE.send', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
    }
  }

  // 20231218_AmiVoice_method_send_zero_buffer
  sendZeroBuffer(){
    return new Promise( (resolve)=>{
      if (this.ffmpeg_c){ // send remain buffer
        this.ffmpeg_c.stdin.end();
        const time = Math.ceil(this.buffer_store.length/this.buffer_size);
        for (let i = 0; i < time; i++) {
          let buff_slice = this.buffer_store.splice(0, this.buffer_size)
          let buff = Buffer.from(buff_slice)
          this.current_bytes += buff.length
          this.socket.emit('audio-stream', buff);
          Redis.countEngine(buff.length, 'Bytes#ENGINE.send', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
        }
      }
      this.logger.trace(`EngineClient.close() emit zero(0) buffer`);
      this.socket.emit('audio-stream', Buffer.alloc(0));
      Redis.countEngine(Buffer.alloc(0).length, 'Bytes#ENGINE.send', this.handshake.channels, this.handshake.backgroundNoise, this.handshake.bitRate, this.handshake.sampleRate);
      resolve();
    });
  }

  // 20231218_AmiVoice_method_call_buffer
  calBufferSize(buffer){
    if (this.buffer_store.length > this.buffer_size ){
      let buff_slice = this.buffer_store.splice(0, this.buffer_size)
      let buff = Buffer.from(buff_slice)
      this.logger.trace(`EngineClient send data : ${buff.length}`);
      this.current_bytes += buff.length
      return buff
    }else{
      return 0
    }
  }

  // 20231218_AmiVoice_method_get_ffmpeg_arg
  ffmpeg_arg(audioFormat){
    const br = this.handshake.bitRate
    const ch = this.handshake.channels
    const sr = this.handshake.sampleRate
    const b_ed = this.handshake.bigendian
    let arg = []
    if (['lsb8k', 'lsb16k', '8kHz', '16kHz'].includes(audioFormat)){
      arg.push('-f', 's16le')
    } else if (['msb8k', 'msb16k'].includes(audioFormat)){
      arg.push('-f', 's16be')
    } else if (['mlaw', 'mulaw8k', 'mulaw16k'].includes(audioFormat)){
      arg.push('-f', 'mulaw')
    } else if (['alaw', 'alaw8k', 'alaw16k'].includes(audioFormat)){
      arg.push('-f', 'alaw')
    } else if (['pcml8b8k', 'pcml8b16k', 'pcmb8b8k', 'pcmb8b16k'].includes(audioFormat)){
      arg.push('-f', 'u8')
    } else {
      if (br == 8 ){
        arg.push('-f', 'u8')
      }else {
        if (b_ed){
          arg.push('-f', 's16be')
        }else {
          arg.push('-f', 's16le')
        }
      }
    }
    if (sr) { arg.push('-ar', `${sr}` ) }
    if (ch) { arg.push('-ac', `${ch}` ) }
    arg.push('-i', 'pipe:0', '-ar', '11025', '-ac', '1', '-f', 's16le', 'pipe:1')
    this.logger.trace(`ffmpeg arguments : ${arg}`);
    return arg
  }

  // 20231218_AmiVoice_method_ffmpeg
  _ffmpeg_child(audioFormat) {
    return new Promise((resolve, reject) => {
      const arg = this.ffmpeg_arg(audioFormat);
      const child = spawn('ffmpeg', arg);

      child.stdout.on('data', (data) => {
        // this.logger.trace(`ffmpeg converted data size : ${data.length}`);
        this.buffer_store.push(...data);
      });
      child.stderr.on('data', (data) => {
        // this.logger.trace(`ffmpeg : ${data.toString()}`);
      });
      child.on('close', (code) => {
        if (code === 0) {
            this.logger.trace(`ffmpeg close`);
        } else {
            // this.logger.error(`ffmpeg encountered an error, check the console output`);
        }
      });
      child.on('spawn', () => {
        this.handshake.channels = 1;
        this.handshake.bitRate = 16;
        this.handshake.sampleRate = 11025;
        let size = (this.handshake.sampleRate * this.handshake.bitRate * 0.3) / 8
        this.buffer_size = size * this.handshake.channels
        this.logger.trace(`ffmpeg spawn success`);
        resolve(child);
      });
      child.on('error', (e) => {
        this.logger.error(`ffmpeg spawn error: ${e}`);
        resolve(0);
        //reject(e);
      });
    });
  }

  _connect() {
    return new Promise((resolve, reject) => {
      const socket = io.connect(WEBSOCKET_URL, {
        transports: ['websocket']
      });
      socket.on('connect', () => {
        resolve(socket);
      });
      socket.on('connect_error', (e) => {
        reject(e);
      });
    });
  }

  _handshake(isPCM, channels, backgroundNoise, bitRate, sampleRate , outputType = 'json') {
    return new Promise((resolve, reject) => {
      this.socket.on('handshake-done', (r) => {
        if (r.success) {
          Redis.countEngine(1, 'Success#ENGINE.handshake', channels, backgroundNoise, bitRate, sampleRate);
          resolve();
        } else {
          Redis.countEngine(1, 'Error#ENGINE.handshake', channels, backgroundNoise, bitRate, sampleRate);
          this.logger.error(`EngineClient._handshake() handshake-done code: ${r.errorCode} msg: ${r.error}`)
          reject(r.error);
        }
      });
      const param = {
        isPCM,
        channels,
        backgroundNoise,
        bitRate,
        sampleRate,
        outputType,
      };
      this.logger.info(`EngineClient._handshake() emit `, JSON.stringify(param))
      this.socket.emit('handshake', param);
    });
  }
}
EngineClient.ServerIndex = null;

class EngineClientError extends lib.EsasError {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = lib.CODE.ENGINE_ERROR;
  }
};

EngineClient.Error = EngineClientError;


module.exports = EngineClient;
