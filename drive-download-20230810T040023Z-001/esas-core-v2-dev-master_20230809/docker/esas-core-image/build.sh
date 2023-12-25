#!/usr/bin/env bash
set -e

cd `dirname $0`/
BRANCH=`git branch --contains | cut -d " " -f 2`
echo Build $BRANCH
rm -rf tmp/*
git clone --depth=1 --branch $BRANCH git@github.com:esjapan/esas-core-v2.git tmp/esas-core-v2
docker build -t esas-core:$BRANCH .
