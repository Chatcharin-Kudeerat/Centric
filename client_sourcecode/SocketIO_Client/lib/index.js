'use strict';

const _ = require('lodash');

const wavefile = require('wavefile');
const EsasClientV2 = require('./soketio');

module.exports = {
  v2: EsasClientV2,
  util: {
    lodash: _,
    WaveFile: wavefile.WaveFile
  },
};
