'use strict';

const _ = require('lodash');

const wavefile = require('wavefile');
const EsasClientV1 = require('./v1');
const EsasClientV2 = require('./v2');

module.exports = {
  v1: EsasClientV1,
  v2: EsasClientV2,
  util: {
    lodash: _,
    WaveFile: wavefile.WaveFile
  },
};
