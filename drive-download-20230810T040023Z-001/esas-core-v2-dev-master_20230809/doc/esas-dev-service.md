# Nemsyscoライセンスアクティベーション
- [http://esas-core-v2-dev1.esas-dev.priv/licenseActivation](http://esas-core-v2-dev1.esas-dev.priv/licenseActivation)

Nemsysco containerの初期化を行った場合には再アクティベーションが必要

# Nemsyscoバーションアップ
- [http://esas-core-v2-dev1.esas-dev.priv/updateVersion](http://esas-core-v2-dev1.esas-dev.priv/updateVersion)

必要な場合はアップデートプロセスを起動する

# Nemsyscoバーション確認
- [http://esas-core-v2-dev1.esas-dev.priv/engineVersion](http://esas-core-v2-dev1.esas-dev.priv/engineVersion)

# ヘルスチェック
- [http://esas-core-v2-dev1.esas-dev.priv/healthcheck](http://esas-core-v2-dev1.esas-dev.priv/healthcheck)

監視用

# V1 RTP & Websocket & V2 SocketIO テストページ
- [http://esas-core-v2-dev1.esas-dev.priv/test/index.html](http://esas-core-v2-dev1.esas-dev.priv/test/index.html)

## サンプル音源
- [音源](https://github.com/esjapan/esas-core-v2/tree/master/samples)

## RTP
8kHz , 16kHz のボタンを押すとV1 RTPセッションを開始する（ブラウザから/callOperationを叩く）

成功した場合は、RTP用の２ポートが表示されるのでそのポートにRTPパケットを送信すると解析が行われる

terminateボタンを押すとRTPセッションを終了する（ブラウザから/callOperationを叩く）

例>
```
ffmpeg -re -i ./10sec_1ch_8000khz_16bit.wav -c:a pcm_s16le -f rtp 'rtp://esas-core-v2-dev1.esas-dev.priv:53000
http://esas-core-v2-dev1.esas-dev.priv/test/index.html
```

解析結果は [http://esas-core-v2-dev1.esas-dev.priv/ESASQA](https://github.com/esjapan/esas-core-v2/blob/master/config/development.js#L94)へ送信しており
それを一時的に保存している

ポートのリンク先はその結果を返す

#### Websocket
audioFormatを選択してファイルを選択し、[V1websocket]ボタンを押すと、Websocketセッションを開始する（ブラウザからWebsocketを繋いで各シーケンスを流している）

##### audioFormatとファイル
|format | ファイル |
|--|--|
| WAV | .wav ファイル（自動判別） |
| RAW lsb8k | _le.raw ファイル |
| RAW msb8k | _be.raw ファイル |
| RAW lsb16k | _le.raw ファイル |
| RAW msb16k | _be.raw ファイル |

サンプリング周波数は適切なものを選べば解析結果が表示されます。
サーバーが落ちない確認が必要

#### SocketIO
Websocket と同様の手順で、[V2socketio]ボタンを押すとSocketIOセッションを開始する

# V2 ファイルアップロード解析
- [http://esas-core-v2-dev1.esas-dev.priv/publish/fileupload.html](http://esas-core-v2-dev1.esas-dev.priv/publish/fileupload.html)

ファイルを選択するか、エリアにドロップすれば解析を開始する（複数選択可）
