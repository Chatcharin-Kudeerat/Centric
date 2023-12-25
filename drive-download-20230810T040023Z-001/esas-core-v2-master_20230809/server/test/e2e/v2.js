'use strict';

const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const axios = require('axios');

const lib = require('lib');
const config = require('config');

const PARAM_KEYS = [
  'Segment',
  'Channel',
  'StartPosSec',
  'EndPosSec',
  'Energy',
  'Stress',
  'Concentration',
  'Anticipation',
  'Excitement',
  'Hesitation',
  'Uncertainty',
  'IntensiveThinking',
  'ImaginationActivity',
  'Embarrassment',
  'Passionate',
  'BrainPower',
  'Confidence',
  'Aggression',
  'AgentScore',
  'CallPriority',
  'Atmosphere',
  'Upset',
  'Content',
  'Dissatisfaction',
  'ExtremeEmotion',
  'EMO/COG',
];

describe('v2', ()=> {
  const Clientjs = require('../../../clientjs/src');
  before(() => {
    return new Promise(async (resolve, reject) => {
      try {
        this.v2 = new Clientjs.v2({
          url: 'http://localhost',
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  after(() => {
    return new Promise(async (resolve, reject) => {
      try {
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  describe('SocketIO', ()=> {
    const startSocketIoSession = (context, file) => {
      it(`startSocketIoSession ${file}`, () => {
        return new Promise(async (resolve, reject) => {
          try {
            const results = [];
            const socketIoSession = await this.v2.startSocketIoSession();
            socketIoSession.on('analyzed', (analyzed) => results.push(analyzed));
            await socketIoSession.init(context);
            const rawData = fs.readFileSync(file);
            const chunks = _.chunk(rawData, (context.bitRate / 8) * context.sampleRate * context.channels);
            const interval = setInterval(async () => {
              const chunk = chunks.shift();
              try {
                if (!chunk) {
                  clearInterval(interval);
                  await socketIoSession.term();
                  expect(results.length).to.equals(5);
                  expect(_.keys(results[0].Param[0])).to.deep.equals(PARAM_KEYS);
                  resolve();
                } else {
                  socketIoSession.send(new Uint8Array(chunk));
                }
              } catch(e) {
                reject(e);
              }
            }, 1000);
          } catch (e) {
            reject(e);
          }
        });
      });
    }
    startSocketIoSession({channels: 1, bitRate: 16, sampleRate: 8000, bigendian: false}, '../samples/10sec_1ch_8000khz_16bit_le.raw');
    startSocketIoSession({channels: 1, bitRate: 16, sampleRate: 8000, bigendian: true}, '../samples/10sec_1ch_8000khz_16bit_be.raw');
    startSocketIoSession({channels: 1, bitRate: 16, sampleRate: 16000, bigendian: false}, '../samples/10sec_1ch_16000khz_16bit_le.raw');
    startSocketIoSession({channels: 1, bitRate: 16, sampleRate: 16000, bigendian: true}, '../samples/10sec_1ch_16000khz_16bit_be.raw');
    startSocketIoSession({channels: 2, bitRate: 8, sampleRate: 16000, bigendian: false}, '../samples/10sec_2ch_16000khz_8bit.raw');
  });

  describe('FileUpload', ()=> {
    const fileUpload = (file) => {
      it(`fileUpload ${file}`, () => {
        return new Promise(async (resolve, reject) => {
          try {
            const result = await this.v2.fileAnalyze(fs.createReadStream(file), true);
            const lines = result.split('\n');
            expect(lines[0]).to.equals('"Segment","Channel","StartPosSec","EndPosSec","Energy","Stress","Concentration","Anticipation","Excitement","Hesitation","Uncertainty","IntensiveThinking","ImaginationActivity","Embarrassment","Passionate","BrainPower","Confidence","Aggression","AgentScore","CallPriority","Atmosphere","Upset","Content","Dissatisfaction","ExtremeEmotion","EMO/COG","MEE"');
            expect(lines.length).to.equals(9);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    }
    fileUpload('../samples/10sec_1ch_8000khz_16bit.wav');
  });
});
