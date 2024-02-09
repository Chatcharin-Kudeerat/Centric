#!/usr/bin/env bash

cd `dirname $0`

if [ $UID != 0 ]; then
  echo "Must run as root"
  exit 1
fi

apt install -y samba
cp settings/etc/samba/smb.conf /etc/samba/smb.conf
systemctl restart smbd
