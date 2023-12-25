#!/usr/bin/env bash
cd `dirname $0`/../

if [ "${NODE_ENV}" == "" ]; then
  NODE_ENV=production
fi

if [ "$1" == "" ]; then
  ESAS_CONFIG_PATH=${ESAS_CONFIG_PATH} NODE_ENV=${NODE_ENV} NODE_PATH=src node src/index.js
fi

if [ "$1" == "start" ]; then
  ESAS_CONFIG_PATH=${ESAS_CONFIG_PATH} NODE_ENV=${NODE_ENV} NODE_PATH=src nohup node src/index.js &
fi

if [ "$1" == "stop" ]; then
  kill -SIGINT `cat /usr/local/tmp/esas-server.pid`
fi
