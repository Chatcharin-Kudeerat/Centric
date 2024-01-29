'use strict';

const Cluster = require('./cluster');

(async () => {
  const cluster = new Cluster();
  await cluster.start();
})();
