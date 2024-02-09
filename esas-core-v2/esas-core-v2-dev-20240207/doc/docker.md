# Dockerオペレーション
開発環境や、リリース手順中にイメージ名やコンテナ名が衝突するため、実施前に関連するリソースを削除する

開発環境では全てsudo 実行すること

## １．Dockerコンテナを全て削除する
#### Dockerコンテナ確認（docker ps -a）

例>
```
sudo docker ps -a
```
結果サンプル
```
CONTAINER ID   IMAGE                          COMMAND                  CREATED        STATUS                       PORTS                                       NAMES
bd6d55032c3c   redis:5.0                      "docker-entrypoint.s…"   27 hours ago   Up 27 hours                  0.0.0.0:6379->6379/tcp, :::6379->6379/tcp   redis
d780da84110d   nemesysco/on_premises:latest   "pm2-runtime start e…"   27 hours ago   Exited (137) 6 seconds ago                                               engine-server
```

#### Dockerコンテナ停止（docker kill <CONTAINER ID>）

Up 状態のコンテナを全て停止する

例>
```
sudo docker kill [CONTAINER ID]
```

#### Dockerコンテナ削除（docker rm <CONTAINER ID>）

例>
```
sudo docker rm [CONTAINER ID]
```

## 2．esas-coreイメージを削除する
#### Dockerイメージを確認（docker images）

例>
```
sudo docker images
```
結果サンプル
```
REPOSITORY              TAG         IMAGE ID       CREATED        SIZE
esas-core               with_stub   652af8476bd3   2 days ago     1.23GB
nemesysco/on_premises   latest      b1315eb31cb9   7 days ago     810MB
nginx                   latest      6efc10a0510f   2 weeks ago    142MB
ubuntu                  latest      08d22c0ceb15   7 weeks ago    77.8MB
redis                   5.0         99ee9af2b6b1   5 months ago   110MB
```

#### Dockerイメージを削除（docker rmi <IMAGE ID>）

例>
```
sudo docker rmi [IMAGE ID]
```
