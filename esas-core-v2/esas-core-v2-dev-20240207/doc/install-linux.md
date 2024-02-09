# インストール手順（お客様のサーバーで実施）
### 1. インストール先サーバーにファイルを導入（"/tmp/esas-core-$BRANCH.tar.gz" とする）
[リリース手順](release.md) で生成したファイル

### 2. ファイルを展開しインストール

```
export BRANCH=[ブランチの名称]

cd /tmp
tar xzvf esas-core-$BRANCH.tar.gz
cd esas-core-$BRANCH
sudo ./setup.sh
sudo chmod go-w /opt/esas/esas-core-v2/esas/log/
sudo chmod go-w /opt/esas/esas-core-v2/nginx/log/
sudo chmod go-w /opt/esas/esas-core-v2/redis/tmp/
```

# 起動

```
sudo /opt/esas/esas-core-v2/esas-core.sh start
```

# 停止

```
sudo /opt/esas/esas-core-v2/esas-core.sh stop
```

# ファイルの場所

| ファイル | パス |
|---|----|
| 設定ファイル | /opt/esas/esas-core-v2/esas/conf/production.js |
| ESASログディレクトリ | /opt/esas/esas-core-v2/esas/log/ |
| HTTPアクセスログ | /opt/esas/esas-core-v2/nginx/log/access.log |
| ログ保存設定 | /etc/logrotate.d/esas.conf |
  
  
# アンインストール、再インストール手順
  
### 【アンインストール手順】  
1.esas停止  
```
sudo /opt/esas/esas-core-v2/esas-core.sh stop
```
  
2.停止中および実行中のすべてのDockerコンテナを削除  
```
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
```
  
3.使用していないすべてのDockerイメージを削除  
```
docker rmi $(docker images -q)
```
  
4.すべてのDockerボリュームを削除  
```
docker volume prune
```
  
5.すべてのDockerネットワークを削除  
```
docker network prune
```
  
6.Dockerの設定ファイルやキャッシュなどを削除  
```
rm -rf /var/lib/docker
```
  
7.Dockerデーモンの設定ファイルを削除  
```
sudo rm -rf /etc/docker
```
  
8.esas削除  
```
sudo rm -rf /opt/esas
```

### 【再インストール手順】  
```
export BRANCH=[ブランチの名称]
cd /tmp
tar xzvf esas-core-$BRANCH.tar.gz
cd esas-core-$BRANCH
apt update
apt install -y ca-certificates gnupg lsb-release
apt -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
chmod +x /usr/local/bin/docker-compose
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
docker load -i esas-core-$BRANCH.img
chmod +x /usr/local/bin/docker-compose
sudo chmod go-w /opt/esas/esas-core-v2/esas/log/
sudo chmod go-w /opt/esas/esas-core-v2/nginx/log/
sudo chmod go-w /opt/esas/esas-core-v2/redis/tmp/
cp esas-core-base.yml esas-core-production.yml /opt/esas/esas-core-v2/
/opt/esas/esas-core-v2/esas-core.sh start
```
