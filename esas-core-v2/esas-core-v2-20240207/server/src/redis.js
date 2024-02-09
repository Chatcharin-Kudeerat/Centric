'use strict';

const _ = require('lodash');
const Redis = require('ioredis');
const rediskey = require('rediskey');

const Logger = require('logger');
const logger = Logger(`[redis]`);
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';

const redisClientCache = {};
const redisClient = (name, db) => {
  if (redisClientCache[name]) {
    return redisClientCache[name];
  }
  const params = {
    host: REDIS_HOST,
    port: 6379,
  };
  if (db) {
    params.db = db;
  }
  redisClientCache[name] = new Redis(params);
  return redisClientCache[name];
};

exports.pubRedisClient = redisClient('pub');
exports.subRedisClient = redisClient('sub');
exports.sessionRedisClient = redisClient('session', 1);
exports.analyzedRedisClient = redisClient('analyzed', 10);
exports.downloadRedisClient = redisClient('download', 11);
const countRedisClient = exports.countRedisClient = redisClient('count', 12);
exports.testRedisClient = redisClient('test', 14);

const COUNT_EXPIRE = (366 + 31) * 86400; // 13 months

exports.countSuccess = async (name) => {
  try {
    await countRedisClient.multi([
      ['hincrby', rediskey.countKey(), rediskey.countSuccess(name), 1],
      ['expire', rediskey.countKey(), COUNT_EXPIRE],
    ]).exec();
  } catch (e) {
    logger.error(`countSuccess() ${name}`, e);
  }
};

exports.countError = async (name) => {
  try {
    await countRedisClient.multi([
      ['hincrby', rediskey.countKey(), rediskey.countError(name), 1],
      ['expire', rediskey.countKey(), COUNT_EXPIRE],
    ]).exec();
  } catch (e) {
    logger.error(`countError() ${name}`, e);
  }
};

exports.countEngine = async (n, name, channels, backgroundNoise, bitRate, sampleRate) => {
  try {
    await countRedisClient.multi([
      ['hincrby', rediskey.countKey(), name, n],
      ['hincrby', rediskey.countKey(), rediskey.countEngine(name, channels, backgroundNoise, bitRate, sampleRate), n],
      ['expire', rediskey.countKey(), COUNT_EXPIRE],
    ]).exec();
  } catch (e) {
    logger.error(`countEngine() ${name}`, e);
  }
}
