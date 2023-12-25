#!/usr/bin/env bash
set -e
CURDIR=`dirname $0`
cd $CURDIR

export NODE_ENV=test
export NODE_PATH=src
npx mocha --exit $@
