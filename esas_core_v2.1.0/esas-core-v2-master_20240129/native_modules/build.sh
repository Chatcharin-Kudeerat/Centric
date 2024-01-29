#!/usr/bin/env bash
set -e

cd `dirname $0`
git clone https://github.com/Daxbot/node-rtp.git
pushd node-rtp
git checkout 4c98b94aa2019dd540965475bf33dd6d0b1d7cbb
git submodule update --init
pushd extern/librtp/
mkdir build
cd build
cmake ..
make
popd
npm install
popd
