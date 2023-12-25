


## Nemsysco
### Realtime analysis API
#### `StartPosSec`, `EndPosSec` のフィッティング
Dockerバージョンでは送信時刻に依存せず、累積受信バイト数（＋BytesRate）から計算されているようだ。

- Websocket版では補正の必要はない。
- RTP版では遅延パケットやパケットロスト分の補正ロジックを組むよりも無音データを送信して調整する。

#### 音声フォーマット
- isPCM がfalseの場合の挙動は不明。事実上PCM onlyと思われる
- リトルエンディアンのみ。BE系を食う時はエンディアン変換を自前で行う

#### 終了シーケンス
解析終了を時間で待つ必要は無く待受けシーケンスが組める

1. `fetch-analysis-report` -> Nemsysco
2. `analysis-report-ready` <- Nemsysco
3. すべての `audio-analysis` が到着したことが保証されている

#### 終了シーケンス


###### run SocketIO client #######
 - node clientjs/publish/client_exampleV2.js
