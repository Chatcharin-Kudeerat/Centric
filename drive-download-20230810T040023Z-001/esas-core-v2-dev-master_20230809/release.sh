#!/usr/bin/env bash
set -e

cd `dirname $0`/
BRANCH=`git branch --contains | cut -d " " -f 2`
TMP_DIR=tmp/esas-core-$BRANCH
rm -rf $TMP_DIR || true
mkdir $TMP_DIR
RELEASE_DIR=release/esas-core-$BRANCH
rm -rf $RELEASE_DIR || true
mkdir $RELEASE_DIR
bash docker/esas-core-base-image/build.sh
bash docker/esas-core-image/build.sh
docker save esas-core:$BRANCH -o $TMP_DIR/esas-core-$BRANCH.img
cp esas-core.sh $TMP_DIR/
cp setup_os.sh $TMP_DIR/
cp docker-compose/esas-core-base.yml $TMP_DIR/
sed -e "s/BRANCH/$BRANCH/g" docker-compose/esas-core-production.yml.template > $TMP_DIR/esas-core-production.yml
sed -e "s/BRANCH/$BRANCH/g" setup.sh.template > $TMP_DIR/setup.sh
chmod 755 $TMP_DIR/setup.sh
cp setup_smb.sh $TMP_DIR/
chmod 755 $TMP_DIR/setup_smb.sh
cp -r settings $TMP_DIR/
tar czvf $RELEASE_DIR/esas-core-$BRANCH.tar.gz -C $TMP_DIR/../ esas-core-$BRANCH
zip $RELEASE_DIR/esas_windows_settings.zip esas_windows_settings/*
mkisofs -r -J -V $BRANCH -o $RELEASE_DIR/../esas-core-$BRANCH.iso $RELEASE_DIR
mv $RELEASE_DIR/../esas-core-$BRANCH.iso $RELEASE_DIR
