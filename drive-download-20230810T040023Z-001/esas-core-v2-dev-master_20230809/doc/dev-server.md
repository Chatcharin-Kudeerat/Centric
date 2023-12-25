## AWS server
| | |
|--|--|
| host | 43.207.176.67 |
| user | ubuntu |
| keypair | [esas-core-dev](../aws/esas-core-dev.pem) |
| AMI | ---- |
| OS | Ubuntu 22.04.2 LTS |
| ARCH | x86_64 |

## 1. 環境構築(USER: ubuntu)
### 1.1. Setup OS
```
apt -y install build-essential cmake nginx
apt install -y libnss3 libatk1.0-0 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 libpango1.0-0 libasound2
apt install -y zip genisoimage
sudo systemctl disable nginx
sudo nginx -s stop
sudo mkdir -p /usr/local/tmp
sudo chmod 777 /usr/local/tmp
sudo mkdir -p /usr/local/nginx/log
sudo mkdir -p /usr/local/nginx/tmp
sudo mkdir -p /usr/local/esas/log
sudo chmod 777 /usr/local/esas/log
cd
git clone git@github.com:esjapan/esas-core-v2.git
git clone git@github.com:esjapan/esas-core-v2-dev.git
sudo bash esas-core-v2-dev/setup_os.sh
```

### 1.2. Setup nodejs
```
sudo -u esas git clone https://github.com/nodenv/nodenv.git /opt/esas/nodenv
sudo -u esas git clone https://github.com/nodenv/node-build.git /opt/esas/nodenv/plugins/node-build
sudo -u esas mkdir /opt/esas/nodenv/shims
sudo -u esas mkdir /opt/esas/nodenv/versions
echo 'export NODENV_ROOT=/opt/esas/nodenv' > /tmp/.bashrc
echo 'export PATH="${NODENV_ROOT}/bin:$PATH"' >> /tmp/.bashrc
echo 'eval "$(nodenv init -)"' >> /tmp/.bashrc
sudo -u esas cp /tmp/.bashrc /opt/esas/.bashrc
sudo echo 'source /opt/esas/.bashrc' >> /etc/bash.bashrc
sudo bash -c 'echo "source /opt/esas/.bashrc" >> /etc/bash.bashrc'
source /opt/esas/.bashrc

pushd /opt/esas/
sudo su esas
nodenv install 16.13.0
exit
popd
```
