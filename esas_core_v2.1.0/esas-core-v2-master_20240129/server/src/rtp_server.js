'use strict';

const _ = require('lodash');
const NodeRtp = require('node-rtp');
const dgram = require('dgram');
const EventEmitter = require('events');

const lib = require('lib');
const config = require('config');

const EngineClient = require('engine_client');
const MAX_RTP_PORTS = 1000;
const RTP_PORT_PREFIX = 35000;
const SHORT_SIZE = 2**16;
const ADJUST_CHUNK_SIZE = SHORT_SIZE; // 64KB
const DELAY_PACKET_THRESHOLD = 32768;

class RtpServer {
  static ReservedRtpPorts = [];
  static InstanceByPort = {};
  static SetupInterval = null;
  static ServerIndex = null;
  static setup(serverIndex) {
    if (RtpServer.ServerIndex != null) {
      return;
    }
    RtpServer.ServerIndex = serverIndex;
    EngineClient.setup(serverIndex);
    for (let i = 0; i < MAX_RTP_PORTS; i++) {
      RtpServer.ReservedRtpPorts.push(RTP_PORT_PREFIX + RtpServer.ServerIndex * MAX_RTP_PORTS + i);
    }
    RtpServer.SetupInterval = setInterval(() => {
      for(const port in RtpServer.InstanceByPort) {
        RtpServer.InstanceByPort[port].checkExpire();
      }
    },1000);
  }

  constructor(logger, handshake, options = {}) {
    this.logger = logger;
    this.handshake = handshake;
    this.options = options;
    this.emitter = new EventEmitter();
    this.sequenceIndex = null;
    this.delayedBuffers = [];
    this.delayedTimeout = null;
  }

  setExpire(ms) {
    if (ms) {
      this.expireAt = new Date().getTime() + ms;
    } else {
      this.expireAt = null;
    }
  }

  checkExpire() {
    if (!this.expireAt || new Date().getTime() < this.expireAt) {
      return;
    }
    this.close();
  }

  open() {
    return new Promise( async (resolve, reject) => {
      try {
        this.logger.trace(`RtpServer.open() begin`);
        const port = RtpServer.ReservedRtpPorts.shift();
        if (!port) {
          return reject(new RtpServer.Error('No available RTP port'));
        }
        this.port = port;
        RtpServer.InstanceByPort[this.port] = this;
        this.byteRate = this.handshake.sampleRate * this.handshake.channels * this.handshake.bitRate / 8;
        this.engineClient = new EngineClient(this.logger, this.emitter, this.handshake);
        await this.engineClient.start();
        this.udpServer = dgram.createSocket('udp4');
        this.udpServer.on('error', (e) => {
          this.logger.error(`RtpServer.open() RTP server error`, e);
          this.udpServer.close();
          return reject(new RtpServer.Error('RTP server error'));
        });
        this.udpServer.on('message', async (msg) => {
          this.logger.debug(`RtpServer.open() message ${msg.length}`);
          if (this.engineClient) {
            try {
              msg[1] = 0x60; // Overwrite PT to 96
              const rtpPacket = NodeRtp.parse(msg);
              if (!(rtpPacket instanceof(NodeRtp.RtpPacket)) || !rtpPacket.payload) {
                return;
              }
              this.sequenceIndex = this.sequenceIndex || rtpPacket.seq;
              rtpPacket.seq = this.correctSequence(rtpPacket.seq);
              const diffSeq = rtpPacket.seq - this.sequenceIndex;
              if (diffSeq < 0) {
                this.logger.warning(`RtpServer.udpServer.on() Delayed packet received. seq: ${rtpPacket.seq}, now: ${this.sequenceIndex}`);
              } else if (diffSeq > 1) {
                this.logger.trace(`RtpServer.open() RTP delayedBuffers.push() seq: ${rtpPacket.seq}, now: ${this.sequenceIndex}`);
                this.delayedBuffers.push([
                  rtpPacket.seq,
                  rtpPacket.payload,
                  new Date().getTime(),
                ]);
                this.setDelayedTimer();
              } else {
                this.sendToEngine(rtpPacket.seq, rtpPacket.payload, new Date().getTime());
              }
            } catch (e) {
              this.logger.error(`RtpServer.open() message ${e}`);
            }
          }
        });
        this.udpServer.on('listening', () => {
          const address = this.udpServer.address();
          this.logger.info(address)
          this.logger.trace(`RtpServer.open() end`);
          resolve(address);
        });
        this.udpServer.bind(this.port);
        this.startAt = new Date();
      } catch(e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`RtpServer.open() RTP server error`, e);
        reject(new RtpServer.Error('RTP open error'));
      }
    });
  }

  close() {
    return new Promise( async (resolve) => {
      try {
        this.logger.trace(`RtpServer.close() begin`);
        if (this.udpServer) {
          try {
            await this.udpServer.close();
          } catch (e) {
            this.logger.error(`RtpServer.close()`, e);
          }
          this.udpServer = null;
        }
        if (this.engineClient) {
          try {
            await this.engineClient.close();
          } catch (e) {
            this.logger.error(`RtpServer.close()`, e);
          }
          this.engineClient = null;
        }
        if (this.emitter) {
          this.emitter.removeAllListeners();
          this.emitter = null;
        }
        if (this.port) {
          if (RtpServer.InstanceByPort[this.port]) {
            delete RtpServer.InstanceByPort[this.port];
            RtpServer.ReservedRtpPorts.push(this.port);
          }
        }
        this.logger.trace(`RtpServer.close() end`);
        resolve();
      } catch(e) {
        if (e instanceof(lib.EsasError)) {
          return reject(e);
        }
        this.logger.error(`RtpServer.close()`, e);
        resolve();
      }
    });
  }

  correctSequence(seq) {
    // RTP sequence id is 16bit overflow.
    const sequenceIndex = this.sequenceIndex || seq;
    const lowerSequence = sequenceIndex % SHORT_SIZE;
    const upperSequence = parseInt(sequenceIndex / SHORT_SIZE);
    const diffSeq = lowerSequence - seq;
    if (diffSeq > DELAY_PACKET_THRESHOLD) {
      return ((upperSequence + 1) * SHORT_SIZE) + seq;
    } else if (diffSeq < -DELAY_PACKET_THRESHOLD) {
      return ((upperSequence - 1) * SHORT_SIZE) + seq;
    } else {
      return (parseInt((sequenceIndex - diffSeq) / SHORT_SIZE) * SHORT_SIZE) + seq;
    }
  }

  setDelayedTimer(offset = 0) {
    this.delayedTimeout = this.delayedTimeout || setTimeout(() => {
      clearTimeout(this.delayedTimeout);
      this.delayedTimeout = null;
      // Send padding buffer to the Engine to adjust analysis timestamp.
      if (this.delayedBuffers.length > 0) {
        this.delayedBuffers.sort((a, b) => a[0] - b[0]);
        const [seq, buffer, receivedAt] = this.delayedBuffers.shift();
        const diffMs = receivedAt - this.lastDataTimestamp;
        const nSamples = _.round(diffMs * this.handshake.sampleRate  / 1000);
        let nBytes = nSamples * this.handshake.channels * this.handshake.bitRate / 8;
        this.logger.warning(`RtpServer.udpServer.on() Skipped packet (${diffMs}ms skipped). Send padding buffer(${nBytes} bytes) to the Engine`);
        for (;nBytes > 0;) {
          const buffer = Buffer.from(Array(_.min([nBytes, ADJUST_CHUNK_SIZE])).fill(0));
          this.engineClient.sendBuffer(buffer);
          nBytes -= buffer.length;
        }
        this.sendToEngine(seq, buffer, receivedAt);
      }
    }, _.max([0, (config.server.rtp.delayedBufferMs - offset)]));
  }

  _sendToEngine(seq, buffer, receivedAt) {
    this.logger.trace(`RtpServer._sendToEngine() RTP seq: ${seq}, now: ${this.sequenceIndex}`);
    this.sequenceIndex = seq;
    this.engineClient.sendBuffer(buffer);
    this.lastDataTimestamp = receivedAt + Math.floor(1000 * buffer.length / this.byteRate);
  }

  sendToEngine(seq, buffer, receivedAt) {
    this._sendToEngine(seq, buffer, receivedAt);
    clearTimeout(this.delayedTimeout);
    this.delayedTimeout = null;
    if (this.delayedBuffers.length > 0) {
      this.delayedBuffers.sort((a, b) => a[0] - b[0]);
      while (true) {
        if (this.delayedBuffers.length == 0) {
          break;
        }
        const [seq, buffer, receivedAt] = this.delayedBuffers[0];
        if ((seq - this.sequenceIndex) != 1) {
          this.setDelayedTimer((new Date().getTime() - receivedAt));
          break;
        }
        this.delayedBuffers.shift();
        this._sendToEngine(seq, buffer, receivedAt);
      }
    }
  }
};

class RtpServerError extends lib.EsasError {
  constructor (message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.code = lib.CODE.RTP_SERVER_ERROR;
  }
};
RtpServer.Error = RtpServerError;

module.exports = RtpServer;
