#!/usr/bin/env bash
set -e

cd `dirname $0`/
docker build -t esas-core-base:latest .
