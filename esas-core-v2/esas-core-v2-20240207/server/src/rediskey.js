'use strict';

const moment = require('moment');

module.exports = {
  CallID: (key, id) => `CallID#${key}#${id}`,
  ManagerKey: (key) => `ManagerKey#${key}`,
  esasqa: (id, port) => `esasqa#${id}#${port}`,
  countKey: ()  => `countKey#${moment().format('YYYY/MM')}`,
  countSuccess: (name)  => `Success#${name}`,
  countError: (name)  => `Error#${name}`,
  countEngine: (name, channels, backgroundNoise, bitRate, sampleRate)  => `${name}(ch:${channels},bit:${bitRate},Hz:${sampleRate},noise:${backgroundNoise})`,
};
