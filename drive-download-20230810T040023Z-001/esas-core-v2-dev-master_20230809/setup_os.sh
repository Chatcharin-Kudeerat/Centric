#!/usr/bin/env bash

cd `dirname $0`

if [ $UID != 0 ]; then
  echo "Must run as root"
  exit 1
fi

if [ `uname -o` != "GNU/Linux" ]; then
  echo "Rquire GNU/Linux"
  exit 1
fi

KERNEL=`uname -v | grep Ubuntu`
if [ "${KERNEL}" == "" ]; then
  echo "Rquire Ubuntu"
  exit 1
fi

timedatectl set-timezone Asia/Tokyo
apt update
apt install -y vim logrotate curl
if [ "`which docker-compose`" == "" ]; then
  apt install -y ca-certificates gnupg lsb-release
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg |  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt update
  apt -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
  curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

if [ ! -d /opt/esas ]; then
  groupadd -g 20111 esas || true
  useradd -g esas -d /opt/esas -m -u 20111 -s /bin/bash esas || true
  cp settings/etc/security/limits.d/esas.conf /etc/security/limits.d/
  cp settings/etc/sysctl.d/esas.conf /etc/sysctl.d/
  sysctl -p /etc/sysctl.d/esas.conf
  cp settings/etc/logrotate.d/esas.conf /etc/logrotate.d/

  mkdir -p /opt/esas/esas-core-v2/redis/db
  chmod 777 /opt/esas/esas-core-v2/redis/db
  mkdir -p /opt/esas/esas-core-v2/redis/tmp
  chmod 777 /opt/esas/esas-core-v2/redis/tmp
  cp -r settings/redis/conf /opt/esas/esas-core-v2/redis/

  mkdir -p /opt/esas/esas-core-v2/nginx/log
  chmod 777 /opt/esas/esas-core-v2/nginx/log
  mkdir -p /opt/esas/esas-core-v2/nginx/tmp
  chmod 777 /opt/esas/esas-core-v2/nginx/tmp
  cp -r settings/nginx/conf /opt/esas/esas-core-v2/nginx/

  mkdir -p /opt/esas/esas-core-v2/esas/log
  chmod 777 /opt/esas/esas-core-v2/esas/log
  cp -r settings/esas/conf /opt/esas/esas-core-v2/esas/

  cp esas-core.sh /opt/esas/esas-core-v2/
  chmod 755 /opt/esas/esas-core-v2/esas-core.sh

  chown esas:esas -R /opt/esas
fi
