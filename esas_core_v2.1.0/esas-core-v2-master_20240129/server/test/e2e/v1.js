'use strict';

const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const axios = require('axios');

const lib = require('lib');
const config = require('config');
const RtpServer = require('rtp_server');

const PARAM_KEYS = [
  'Segment',
  'Channel',
  'StartTime',
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

describe('v1', ()=> {
  const Clientjs = require('../../../clientjs/src');
  before(() => {
    return new Promise(async (resolve, reject) => {
      try {
        this.agentID = 'agent_0001';
        this.v1 = new Clientjs.v1({
          url: 'http://localhost',
          ws: 'ws://localhost',
        });
        RtpServer.ServerIndex = null;
        clearInterval(RtpServer.SetupInterval);
        RtpServer.ReservedRtpPorts = [];
        RtpServer.setup(0);
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

  describe('RTP', ()=> {
    it('startRtpSession 8kHz', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const callID = 'callID_0001';
          const res = await this.v1.startRtpSession(
            callID,
            this.agentID,
            '8kHz',
            {
              callStartTime: moment().format('YYYY-MM-dd HH:mm:ss'),
              withSession: '1',
            }
          );
          expect(_.isString(res.sessionId)).to.equals(true);
          this.sessionId8kHz = res.sessionId;
          expect(res).to.deep.equals({
            ResultCode: lib.CODE.OK,
            Error: '',
            Address: 'rtp://127.0.0.1',
            Port0: 35000,
            Port1: 35001,
            RTPSize: 1280,
            sessionId: this.sessionId8kHz,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('startRtpSession 16Hz', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const callID = 'callID_0002';
          const res = await this.v1.startRtpSession(
            callID,
            this.agentID,
            '16kHz',
            {
              callStartTime: moment().format('YYYY-MM-dd HH:mm:ss'),
              withSession: '1',
            }
          );
          expect(_.isString(res.sessionId)).to.equals(true);
          this.sessionId16kHz = res.sessionId;
          expect(res).to.deep.equals({
            ResultCode: lib.CODE.OK,
            Error: '',
            Address: 'rtp://127.0.0.1',
            Port0: 35002,
            Port1: 35003,
            RTPSize: 1280,
            sessionId: this.sessionId16kHz,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('startRtpSession with processing callID', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const callID = 'callID_0002';
          const res = await this.v1.startRtpSession(
            callID,
            this.agentID,
            '16kHz',
            {
              callStartTime: moment().format('YYYY-MM-dd HH:mm:ss'),
              withSession: '1',
            }
          );
          expect(res).to.deep.equals({
            ResultCode: lib.CODE.SESSION_MANAGER_ERROR,
            Error: 'Session start error',
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('startRtpSession with invalid Fs', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const callID = 'callID_0003';
          const res = await this.v1.startRtpSession(
            callID,
            this.agentID,
            '99kHz',
            {
              callStartTime: moment().format('YYYY-MM-dd HH:mm:ss'),
              withSession: '1',
            }
          );
          expect(res).to.deep.equals({
            ResultCode: lib.CODE.RTP_ERROR,
            Error: 'Unknown Fs (99kHz)',
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('listRtpSessions', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await this.v1.listRtpSessions();
          const expected = {};
          expected[this.sessionId8kHz] = {
            callID1: 'callID_0001',
            agentID: 'agent_0001',
            data: {
              isPCM: true,
              channels: 1,
              backgroundNoise: 1000,
              bitRate: 16,
              sampleRate: 8000,
              port0: 35000,
              port1: 35001
            }
          };
          expected[this.sessionId16kHz] = {
            callID1: 'callID_0002',
            agentID: 'agent_0001',
            data: {
              isPCM: true,
              channels: 1,
              backgroundNoise: 1000,
              bitRate: 16,
              sampleRate: 16000,
              port0: 35002,
              port1: 35003
            }
          };
          expect(res).to.deep.equals(expected);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('Rtp realtime analysis ', () => {
      return new Promise(async (resolve, reject) => {
        try {
          await Promise.all([
            lib.cmd(`${config.ffmpeg} -re -i ../samples/10sec_1ch_8000khz_16bit.wav -c:a pcm_s16le -f rtp 'rtp://127.0.0.1:35000'`),
            lib.cmd(`${config.ffmpeg} -re -i ../samples/10sec_1ch_16000khz_16bit.wav -c:a pcm_s16le -f rtp 'rtp://127.0.0.1:35002'`),
          ]);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('ESASQA result 8kHz', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await axios.get(`http://localhost/ESASQA/${this.sessionId8kHz}/35000`, {}, {});
          const results = _.chain(res.data.split('\n'))
                .map((line) => {
                  try { return JSON.parse(line) } catch (e) { return null};
                })
                .compact()
                .value();
          expect(results.length).to.equals(5);
          expect(_.keys(results[0].Param[0])).to.deep.equals(PARAM_KEYS);
          results[0].Param = [];

          expect(results[0]).to.deep.equals({
            callID: 'callID_0001',
            AgentID: 'agent_0001',
            Port: 35000,
            Param: [],
            sessionId: this.sessionId8kHz,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('ESASQA result 16kHz', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await axios.get(`http://localhost/ESASQA/${this.sessionId16kHz}/35002`, {}, {});
          const results = _.chain(res.data.split('\n'))
                .map((line) => {
                  try { return JSON.parse(line) } catch { return null};
                })
                .compact()
                .value();
          expect(results.length).to.equals(5);
          expect(_.keys(results[0].Param[0])).to.deep.equals(PARAM_KEYS);
          results[0].Param = [];
          expect(results[0]).to.deep.equals({
            callID: 'callID_0002',
            AgentID: 'agent_0001',
            Port: 35002,
            Param: [],
            sessionId: this.sessionId16kHz,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('terminateRtpSession by callID', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await this.v1.terminateRtpSession('callID_0001');
          expect(res).to.deep.equals({ ResultCode: 0, Error: '' });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('terminateRtpSession by sessionId', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await this.v1.terminateRtpSession(null, this.sessionId16kHz);
          expect(res).to.deep.equals({ ResultCode: 0, Error: '' });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('terminateRtpSession by invalid id', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await this.v1.terminateRtpSession('invalid call id');
          console.log(res)
          expect(res).to.deep.equals({
            ResultCode: 211,
            Error: 'Session close error',
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    it('confirm no sessions', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await this.v1.listRtpSessions();
          expect(res).to.deep.equals({});
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  describe('Websocket', ()=> {
    const startWebsocketSession = (callId, audioFormat, byteRate, file) => {
      it(`startWebsocketSession ${audioFormat}`, () => {
        return new Promise(async (resolve, reject) => {
          try {
            const results = [];
            const websocketSession = await this.v1.startWebsocketSession(
              audioFormat,
              '2023-01-01 12:00:00',
              callId,
              'agent_0002', {
                error: (e) => {
                  reject(e);
                },
                closed: () => {
                  resolve();
                },
                analyzed: (analyzed) => {
                  results.push(analyzed);
                },
              });
            const rawData = fs.readFileSync(file);
            const chunks = _.chunk(rawData, byteRate);
            const interval = setInterval(async () => {
              const chunk = chunks.shift();
              try {
                if (!chunk) {
                  clearInterval(interval);
                  await websocketSession.finishAudio();
                  expect(results.length).to.equals(5);
                  expect(_.keys(results[0].Param[0])).to.deep.equals(PARAM_KEYS);
                  results[0].Param = [];
                  expect(results[0]).to.deep.equals({
                    callID: callId,
                    AgentID: 'agent_0002',
                    Port: 80,
                    Param: [],
                  });
                  resolve();
                } else {
                  websocketSession.sendAudio(new Uint8Array(chunk));
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
    startWebsocketSession('callID_0011', 'lsb8k', 16000, '../samples/10sec_1ch_8000khz_16bit_le.raw');
    startWebsocketSession('callID_0012', 'msb8k', 16000, '../samples/10sec_1ch_8000khz_16bit_be.raw');
    startWebsocketSession('callID_0013', 'lsb16k', 32000, '../samples/10sec_1ch_16000khz_16bit_le.raw');
    startWebsocketSession('callID_0014', 'msb16k', 32000, '../samples/10sec_1ch_16000khz_16bit_be.raw');
  });
});
