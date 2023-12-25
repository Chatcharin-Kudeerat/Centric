# 設定ファイル
- [設定ファイル](/../../../../esjapan/esas-core-v2-dev/blob/master/settings/esas/conf/production.js.sample)

#### 主要項目

| フィールド | 本番 | |
|---|---|---|
| loglv | info | debug > trace > info > warning > error の順で出力量が増える |
| logfile | 'esas_core_server.log' | ファイル名を指定。出力ディレクトリは固定 |
| server.workers | 4 | nodejsプロセス数。CPU負荷に基づき調整する |
| server.rtp.url | rtp://<デプロイするサーバ> | /CallOperation の返却用 |
| session.maxTermMS | 3600000 | 解析セッションの最大時間（ミリ秒）。経過後は自動的に切断される |
| v1.realtimeNotificationUrl |  http://<解析結果を受け取るホスト>/ESASQA | RTP解析結果を返すURL |
| v1.wsPort | 80001 | p コマンドの返却値 |
| v2.donwloadExpire | 3600 | ファイルアップロード解析結果のダウンロード可能時間(秒)|
| engine.backgroundNoise | 1000 | チューニング用 |
| front.uploadLimit | 3 | ファイルアップロード解析の同時アップロード数 |

# チャンネル毎のパラメータ（customFields）

各種解析の返却パラメータのフィールド名と順番の定義

[logic.js#_buildEsasParam()](/../../../../esjapan/esas-core-v2/blob/master/server/src/lib/logic.js#L80)
の項目が対象となる。

エンジンの生パラメータを含めたい場合は
[logic.js#ENGINE_PARAM_FIELDS](/../../../../esjapan/esas-core-v2/blob/master/server/src/lib/logic.js#L7)
をコメントアウトすることで

customFieldsで指定(engine.????)する対象に含まれるようになる
