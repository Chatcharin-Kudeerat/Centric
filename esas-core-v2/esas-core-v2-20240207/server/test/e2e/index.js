'use strict';

const _ = require('lodash');
const axios = require('axios');

const Redis = require('redis');
const Server = require('server');

const Stub = require('../stub');

if (process.env.WITH_STUB) {
  Stub(); // Enable
}

describe('e2e', ()=> {
  before(() => {
    return new Promise(async (resolve, reject) => {
      try {
        await Redis.sessionRedisClient.flushdb();
        this.server = new Server('0');
        await this.server.start();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  after(() => {
    return new Promise(async (resolve, reject) => {
      try {
        await this.server.close(1000, false);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  describe('manage', ()=> {
    it('licenseActivation', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await axios.get('http://localhost/licenseActivation', {}, {});
          expect(res.data).to.deep.equals({
            code: 0,
            message: 'Activation successful',
          })
          resolve();
        } catch (e) {
          console.log(e)
          reject(e);
        }
      });
    });

    if (!process.env.WITH_STUB) {
      it('engineVersion', () => {
        return new Promise(async (resolve, reject) => {
          try {
            const res = await axios.get('http://localhost/engineVersion', {}, {});
            expect(res.data.code).to.equals(0);
            expect(res.data.Status).to.equals('OK');
            expect(_.keys(res.data)).to.deep.equals([
              'Status',
              'LVA Core Version',
              'Site Version',
              'Total Minutes',
              'Total Files Processed',
              'Total Files Failures',
              'Total Days Active',
              'Total Credits left',
              'code',
            ]);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    it('healthCheck', () => {
      return new Promise(async (resolve, reject) => {
        try {
          const res = await axios.get('http://localhost/healthCheck', {}, {});
          console.log(res.data);
          expect(res.data).to.equals('ok');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  require('./v1');
  require('./v2');
});
