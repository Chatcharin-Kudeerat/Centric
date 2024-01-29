## 1. ESAS core V2 初回ビルド
### 1.1. Build native modules
```
cd ~/esas-core-v2/
bash ./native_modules/build.sh
```

## 2. ESAS core V2 通常ビルド
### 2.1. Build client JS
```
cd ~/esas-core-v2/clientjs/
npm install
npm run build
```

### 2.2. Build server
```
cd ~/esas-core-v2/server/
npm install
```

## 3. ESAS core V2 起動
### 3.1. Start nginx
```
sudo nginx -c /opt/esas/esas-core-v2/nginx/conf/nginx.conf
```

### 3.2. Start redis & Nemsysco
```
sudo docker-compose -f ~/esas-core-v2-dev/docker-compose/esas-core-base.yml up -d
```

うまく行かない場合は [Dockerコンテナ＆イメージをクリア](docker.md) を行う

### 3.2. Start ESAS core V2
```
ESAS_CONFIG_PATH=~/esas-core-v2/config NODE_ENV=development bash ~/esas-core-v2/server/bin/esas_core_server.sh start
```

## 4. ESAS core V2 終了
### 4.1. Stop nginx
```
sudo nginx -s stop
```

### 4.2. Stop redis & Nemsysco
```
sudo docker-compose -f ~/esas-core-v2-dev/docker-compose/esas-core-base.yml kill
```

### 4.3. Stop ESAS core V2
```
bash ~/esas-core-v2/server/bin/esas_core_server.sh stop
```

## 5. Nemsysco初期化
現状のNemsysco docker containerは安定しない。何か問題が起きた場合は初期化する。

１. 4.2. Stop redis & Nemsyscoa
２. Remove container
```
sudo docker rm engine-server
```
３. 3.2. Start redis & Nemsysco

## 6. ログ（本番とは異なる）
### エントリーポイント・アクセスログ
- /usr/local/nginx/log/access.log

### ESAS core V2
- /usr/local/esas/log/esas_core_server.log

各処理はセッションとして管理されており、ログの各行にはセッションIDが含まれている。

セッションを追跡する場合はセッションIDで関連する行を絞る事ができる。

例 >
```
ubuntu@esas-core-v2-dev1:~/esas-core-v2/server$ grep 26ac78205674410ab458652386ac7d19  /usr/local/esas/log/esas_core_server.log | grep info
2023-03-22 05:32:23.568 [info] [2] V1.callOperation() session start 26ac78205674410ab458652386ac7d19
2023-03-22 05:32:23.580 [info] [2] [26ac78205674410ab458652386ac7d19] EngineClient._handshake() emit  {"isPCM":true,"channels":1,"backgroundNoise":1000,"bitRate":16,"sampleRate":16000,"outputType":"json"}
2023-03-22 05:32:23.632 [info] [2] [26ac78205674410ab458652386ac7d19] { address: '0.0.0.0', family: 'IPv4', port: 52000 }
2023-03-22 05:32:23.635 [info] [2] [26ac78205674410ab458652386ac7d19] EngineClient._handshake() emit  {"isPCM":true,"channels":1,"backgroundNoise":1000,"bitRate":16,"sampleRate":16000,"outputType":"json"}
2023-03-22 05:32:23.638 [info] [2] [26ac78205674410ab458652386ac7d19] { address: '0.0.0.0', family: 'IPv4', port: 52001 }
2023-03-22 05:32:23.638 [info] [2] [26ac78205674410ab458652386ac7d19] V1RtpSession.start() session start
2023-03-22 05:33:17.297 [info] [2] [26ac78205674410ab458652386ac7d19] realtimeNotification {"callID":"58397","AgentID":"AGENTID","Port":52000,"Param":[{"Segment":1,"Channel":0,"StartPosSec":21.58,"EndPosSec":22.12,"Energy":30,"Stress":0,"Concentration":30,"Anticipation":33,"Excitement":18,"Hesitation":12,"Uncertainty":9,"IntensiveThinking":0,"ImaginationActivity":0,"Embarrassment":0,"Passionate":9,"BrainPower":32,"Confidence":21,"Aggression":4,"AgentScore":0,"CallPriority":0,"Atmosphere":0,"Upset":0,"Content":0,"Dissatisfaction":0,"ExtremeEmotion":7,"EMO/COG":147,"StartTime":"2023-03-22 05:32:23"}],"sessionId":"26ac78205674410ab458652386ac7d19"}
2023-03-22 05:33:27.782 [info] [2] [26ac78205674410ab458652386ac7d19] realtimeNotification {"callID":"58397","AgentID":"AGENTID","Port":52000,"Param":[{"Segment":2,"Channel":0,"StartPosSec":28.82,"EndPosSec":29.36,"Energy":56,"Stress":0,"Concentration":0,"Anticipation":58,"Excitement":18,"Hesitation":12,"Uncertainty":9,"IntensiveThinking":0,"ImaginationActivity":0,"Embarrassment":0,"Passionate":9,"BrainPower":32,"Confidence":21,"Aggression":0,"AgentScore":0,"CallPriority":0,"Atmosphere":0,"Upset":0,"Content":0,"Dissatisfaction":0,"ExtremeEmotion":7,"EMO/COG":147,"StartTime":"2023-03-22 05:32:23"}],"sessionId":"26ac78205674410ab458652386ac7d19"}
2023-03-22 05:33:54.658 [info] [2] [26ac78205674410ab458652386ac7d19] realtimeNotification {"callID":"58397","AgentID":"AGENTID","Port":52000,"Param":[{"Segment":3,"Channel":0,"StartPosSec":47.88,"EndPosSec":48.72,"Energy":45,"Stress":2,"Concentration":10,"Anticipation":68,"Excitement":27,"Hesitation":17,"Uncertainty":10,"IntensiveThinking":9,"ImaginationActivity":0,"Embarrassment":0,"Passionate":4,"BrainPower":37,"Confidence":20,"Aggression":0,"AgentScore":0,"CallPriority":0,"Atmosphere":-3,"Upset":0,"Content":0,"Dissatisfaction":0,"ExtremeEmotion":9,"EMO/COG":132,"StartTime":"2023-03-22 05:32:23"}],"sessionId":"26ac78205674410ab458652386ac7d19"}
2023-03-22 05:37:23.572 [info] [2] [26ac78205674410ab458652386ac7d19] Session.close() session closed
```

## 7. テスト
**4.3. Stop ESAS core V2** を行った状態で実行すること。

### 通常実行
毎回 **5. Nemsysco初期化** を行った上で実行すること

```
cd ~/esas-core-v2/server/
./mocha.sh
```

### Nemsyscoバイパス・スタブ実行
**3.2. Start redis & Nemsysco** を行った状態で実行できます

```
cd ~/esas-core-v2/server/
WITH_STUB=1 ./mocha.sh
```
