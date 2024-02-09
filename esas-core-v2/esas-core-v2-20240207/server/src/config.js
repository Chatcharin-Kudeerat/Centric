'use strict';

const ESAS_CONFIG_PATH = process.env.ESAS_CONFIG_PATH || `../../config`
module.exports = require(`${ESAS_CONFIG_PATH}/${process.env.NODE_ENV}.js`);
