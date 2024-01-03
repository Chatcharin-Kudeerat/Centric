'use strict';

const axios = require('axios');

exports.get = (url, params, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      const options = {
        headers,
      };
      const res = await axios.get(url, params, options);
      resolve(res);
    } catch (e) {
      reject(e);
    }
  });
};

exports.post = (url, params, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      headers['Content-Type'] = ""
      const options = {
        headers,
      };
      const res = await axios.post(url, params, options);
      resolve(res);
    } catch (e) {
      reject(e);
    }
  });
};

exports.delay = (delay) => {
  return new Promise((resolve, reject) => {
      setTimeout(() => {
          resolve();
      }, delay);
  });
}
