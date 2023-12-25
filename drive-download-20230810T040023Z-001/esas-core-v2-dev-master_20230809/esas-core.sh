#!/usr/bin/env bash

if [ $UID != 0 ]; then
  echo "Must run as root"
  exit 1
fi

if [ "$1" == "start" ]; then
  docker-compose -f /opt/esas/esas-core-v2/esas-core-base.yml -f /opt/esas/esas-core-v2/esas-core-production.yml up -d
fi

if [ "$1" == "stop" ]; then
  docker-compose -f /opt/esas/esas-core-v2/esas-core-base.yml -f /opt/esas/esas-core-v2/esas-core-production.yml kill
fi
