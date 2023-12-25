# ESAS core クライアント JSライブラリ
- [Browser実装例](/../../../../esjapan/esas-core-v2/blob/master/server/public/test/index.html)
- [NPM実装例(v1)](/../../../../esjapan/esas-core-v2/blob/master/server/test/e2e/v1.js)
- [NPM実装例(v2)](/../../../../esjapan/esas-core-v2/blob/master/server/test/e2e/v2.js)

## class
### EsasClientV1
#### constructor(config)
- config

| パラメータ | 値 | |
|---|---|---|
| url | ESAS core v1 HTTP URL | http://(hostname) |
| ws | ESAS core v1 WS URL | ws://(hostname) |

#### startRtpSession(callId, agentId, fs, options)
RTP解析セッションを開始する

- options

| パラメータ | 値 | |
|---|---|---|
| withSession | （任意）'1' | 返却値にsessionIdを含める |


- 戻り値(Promise) サーバー返却値

| パラメータ | 値 |
|---|---|---|
| ResultCode | ESAS code |
| Error | メッセージ |
| Port0 | RTPポート |
| Port1 | RTPポート |
| sessionId | セッション識別子 |

#### terminateRtpSession(callId, sessionId)
RTP解析セッションを終了する

callId か sessionId のどちらかが指定されていれば良い

- 戻り値(Promise) サーバー返却値

| パラメータ | 値 |
|---|---|---|
| ResultCode | ESAS code |

#### listRtpSessions()
RTP解析セッションのリストを返却

- 戻り値(Promise) サーバー返却値
セッションIDをキーとしたハッシュを返却

バリューの構造

| パラメータ | 値 |
|---|---|
| callId | startRtpSessionで指定 |
| sessionId | セッション識別子 |
| data.sampleRate | fs |
| data.port0 |  |
| data.port1 |  |


#### startWebsocketSession(audioFormat, callStartTime, callId, agentId, options)
Websocket解析セッションを開始する

- options

| パラメータ | 値 |
|---|---|---|
| error(message) | エラーコールバック |
| closed() | Websocket切断コールバック |
| analyzed(ESASparam) | 解析結果コールバック |

- 戻り値 websocketSessionインスタンス

### websocketSession
#### sendAudio(audioData)
音声データを送信

#### finishAudio()
解析セッションを終了

### EsasClientV2
#### constructor(config)
- config

| パラメータ | 値 | |
|---|---|---|
| url | ESAS core v2 URL | http://(hostname) |

#### startSocketIoSession
SocketIO解析セッションを開始する

- 戻り値 SocketIoSessionインスタンス

### SocketIoSession
#### init(context)
解析するPCM音源の諸元を指定する

- context

| パラメータ | 値 | |
|---|---|---|
| channels | 1 or 2 | モノラル or ステレオ |
| bitRate | 8 or 16 | 量子化ビット数 |
| sampleRate | 6000, 8000, 11000, 11025, 16000, 22000, @@ TODO 44000, 48000, 44100が動かない。44000は一般的ではない。44100はドキュメントにも無い @@  | サンプリング周波数 |
| bigendian | true or false | ビッグエンディアンフラグ |

- 戻り値 Promise

#### send(data)
PCMバイナリーを送信する

- data
PCMバイナリーのchunk。

#### on(event, callback)
イベントhook登録

- event

| イベント |  |
|---|---|
| analyzed | 解析結果が順次コールバックされる |
| disconnect | 切断された |

- 解析結果

| フィールド | 値 | 備考 |
|---|---|---|
| Param | Array | チャンネル毎のパラメータ |

- [チャンネル毎のパラメータ](/../../../../esjapan/esas-core-v2-dev/blob/master/doc/config.md#チャンネル毎のパラメータcustomfields)

#### term()
解析を終了する

- 戻り値 Promise

#### disconnect()
正常系では、term()をコールする事でサーバー側から切断されるので、明示的に呼ぶ必要はない。
