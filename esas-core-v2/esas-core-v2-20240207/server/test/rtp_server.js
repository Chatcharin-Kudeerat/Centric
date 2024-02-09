'use strict';

const dgram = require('dgram');
const _ = require('lodash');
const NodeRtp = require('node-rtp');

const lib = require('lib');
const RtpServer = require('rtp_server');
const EngineClient = require('engine_client');
const logger = require('logger')();

let orgEngineClientStart = null;
let orgEngineClientClose = null;
let orgEngineClientSendBuffer = null;
let sendBuffers = [];

describe('rtp_server', ()=> {
  before(() => {
    return new Promise(async (resolve, reject) => {
      try {
        orgEngineClientStart = EngineClient.prototype.start;
        orgEngineClientClose = EngineClient.prototype.close;
        orgEngineClientSendBuffer = EngineClient.prototype.sendBuffer;
        EngineClient.prototype.start = function() {
        }
        EngineClient.prototype.close = function() {
        }
        EngineClient.prototype.sendBuffer = function(buf) {
          sendBuffers.push(buf);
        }
        RtpServer.setup(0);
        this.rtpServer = new RtpServer(logger, {channels: 1, sampleRate: 8000, bitRate: 16});
        await this.rtpServer.open();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
  after(() => {
    return new Promise(async (resolve, reject) => {
      try {
        await this.rtpServer.close();
        EngineClient.prototype.start = orgEngineClientStart;
        EngineClient.prototype.close = orgEngineClientClose;
        EngineClient.prototype.sendBuffer = orgEngineClientSendBuffer;
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  it('correctSequence', () => {
    return new Promise(async (resolve, reject) => {
      try {
        expect(this.rtpServer.correctSequence(111)).to.equal(111);
        expect(this.rtpServer.correctSequence(65535)).to.equal(65535);
        this.rtpServer.sequenceIndex = 65535;
        expect(this.rtpServer.correctSequence(65534)).to.equal(65534);
        expect(this.rtpServer.correctSequence(1)).to.equal(65537);
        this.rtpServer.sequenceIndex = 65536;
        expect(this.rtpServer.correctSequence(65534)).to.equal(65534);
        expect(this.rtpServer.correctSequence(1)).to.equal(65537);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  it('delayed buffering', () => {
    return new Promise(async (resolve, reject) => {
      try {
        this.rtpServer.sequenceIndex = null;
        sendBuffers = [];
        const seqs = [
          1, 2, 5, 4, 3, 8, 6, 7, 9, 10,
          null, null, // Should pad 200ms
          13,
          null, // Should pad 100ms
          15, 16, 19, 18, 17, 20, 21
        ];
        const client = dgram.createSocket('udp4');
        const rtpPacket = new NodeRtp.RtpPacket(0x59, 1);
        for (const seq of seqs) {
          if (seq) {
            rtpPacket.seq = seq;
            rtpPacket.payload = Buffer.from(Array(this.rtpServer.byteRate / 10).fill(seq));
            client.send(rtpPacket.serialize(),  this.rtpServer.port, 'localhost', (e) => {
              if (e) {
                reject(e);
              }
            });
          }
          await lib.sleep(100);
        }
        await lib.sleep(1000);
        expect(sendBuffers.length).to.equal(seqs.length - 1);
        expect(sendBuffers[0].length).to.equal(this.rtpServer.byteRate / 10);
        expect(sendBuffers[0][0]).to.equal(1);
        expect(sendBuffers[1].length).to.equal(this.rtpServer.byteRate / 10);
        expect(sendBuffers[1][0]).to.equal(2);
        expect(sendBuffers[2].length).to.equal(this.rtpServer.byteRate / 10);
        expect(sendBuffers[2][0]).to.equal(3);
        expect(sendBuffers[3].length).to.equal(this.rtpServer.byteRate / 10);
        expect(sendBuffers[3][0]).to.equal(4);
        expect(_.round(sendBuffers[10].length / (2 * this.rtpServer.byteRate / 10), 1)).to.equal(1);
        expect(sendBuffers[10][0]).to.equal(0);
        expect(sendBuffers[11].length).to.equal(this.rtpServer.byteRate / 10);
        expect(sendBuffers[11][0]).to.equal(13);
        expect(_.round(sendBuffers[12].length / (this.rtpServer.byteRate / 10), 1)).to.equal(1);
        expect(sendBuffers[12][0]).to.equal(0);
        expect(sendBuffers[13].length).to.equal(this.rtpServer.byteRate / 10);
        expect(sendBuffers[13][0]).to.equal(15);
        expect(sendBuffers[19].length).to.equal(this.rtpServer.byteRate / 10);
        expect(sendBuffers[19][0]).to.equal(21);
        client.close();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
});
