'use strict';

const _ = require('lodash');

const EventEmitter = require('events');
const EngineClient = require('engine_client');
const FormData = require('form-data');

const ENGINE_PARAM_TERM = 1.8;
const ENGINE_PARAM = (i) => {
  return [ i+1, 0, ENGINE_PARAM_TERM * i + 0.1, (ENGINE_PARAM_TERM + 1) * i, 'validSegment', 'energy', 31, 30, 29, 28, 'uncertainty', 27, 26, 'concentration', 51, 25, 'emotionBalance', 'emotionEnergyBalance', 'mentalEffort', 25, 24, 2100, 550, 23, -200, 'voiceEnergy', 22, 'EDP-Energetic', 'EDP-Passionate', 'EDP-Emotional', 'EDP-Uneasy', 'EDP-Stressful', 'EDP-Thoughtful', 'EDP-Confident', 'EDP-Concentrated', 'EDP-Anticipation', 'EDP-Hesitation', -1, 1, 'VOL1', 'VOL2', 'SOS', 860, 5, 'Fflic', 55, 56, 'LJ', 'SPJ', 'SPT', 4000];
};
const ENGINE_HEADERS = _.chain([ 'index', 'channel', 'startPosSec', 'endPosSec', 'validSegment', 'energy', 'joy', 'sad', 'aggression', 'stress', 'uncertainty', 'excitement', 'uneasy', 'concentration', 'anticipation', 'hesitation', 'emotionBalance', 'emotionEnergyBalance', 'mentalEffort', 'imagination', 'arousal', 'overallCognitiveActivity', 'emotionCognitiveRatio', 'extremeEmotion', 'atmosphere', 'voiceEnergy', 'dissatisfied', 'EDP-Energetic', 'EDP-Passionate', 'EDP-Emotional', 'EDP-Uneasy', 'EDP-Stressful', 'EDP-Thoughtful', 'EDP-Confident', 'EDP-Concentrated', 'EDP-Anticipation', 'EDP-Hesitation', 'callPriority', 'callPriorityAgent', 'VOL1', 'VOL2', 'SOS', 'AVJ', 'Fant', 'Fflic', 'Fmain', 'JQ', 'LJ', 'SPJ', 'SPT', 'intCHL'])
      .toPairs()
      .map(a => [a[1], a[0]])
      .fromPairs()
      .value();

class StubSocket {
  constructor() {
    console.log(`new StubSocket()`)
    this.emitter = new EventEmitter();
  };

  disconnect() {
    console.log(`StubSocket.disconnect()`)
  }

  on(name, callback) {
    console.log(`StubSocket.on(${name})`)
    this.emitter.on(name, callback);
  }

  emit(name, params, callback) {
    // console.log(`StubSocket.emit(${name})`, params)
    if (name == 'handshake') {
      this.emitter.emit('handshake-done', {success: 1});
      this.handshake = params;
      this.audioStreamIndex = 0;
      this.audioStreamBytes = 0;
    } else if (name == 'audio-stream') {
      this.audioStreamBytes += params.length;
      const byteRate = this.handshake.channels * (this.handshake.bitRate / 8) * this.handshake.sampleRate * ENGINE_PARAM_TERM;
      const currentIndex = Math.floor(this.audioStreamBytes / byteRate);
      if ( this.audioStreamIndex != currentIndex) {
        this.audioStreamIndex = currentIndex;
        const channels = [ENGINE_PARAM(this.audioStreamIndex)];
        this.emitter.emit('audio-analysis', {
          success: 1,
          data: {
            done: 1,
            headers: ENGINE_HEADERS,
            channels,
          }
        });
      }
    } else if (name == 'fetch-analysis-report') {
      this.emitter.emit('analysis-report-ready', {success: 1});
    }
  }
};

module.exports = () => {
  EngineClient.prototype._connect = async function () {
    return new StubSocket();
  };
  EngineClient._activate = async function() {
    console.log(`Stub._activete()`);
    return 'Activation successful';
  };
  FormData.prototype.submit = function (url, callback) {
    console.log(`FormData.submit(${url})`);
    const emitter = new EventEmitter();
    callback(null, emitter);
    const res = {
      success: 1,
      data: {
        segments: {
          headersPositions: ENGINE_HEADERS,
          data: [
            ENGINE_PARAM(0),
            ENGINE_PARAM(1),
            ENGINE_PARAM(2),
            ENGINE_PARAM(3),
            ENGINE_PARAM(4),
            ENGINE_PARAM(5),
          ],
        },
        reports: {
          'channel-0': {
            profile: {
              mentalEfficiency: {
                mentalEffortEfficiency: 78,
              }
            }
          }
        },
      },
    };
    emitter.emit('data', Buffer.from(JSON.stringify(res)));
    emitter.emit('end');
  }
};
