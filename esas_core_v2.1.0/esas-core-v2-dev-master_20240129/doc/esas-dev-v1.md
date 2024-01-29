# RTP
### エントリーポイント
#### [POST] /CallOperation

| ヘッダー | 値 |
|---|---|
|Content-Type | application/json |

| パラメータ | 値 | 説明 |
|---|---|---|
| - | - | ESAS-coreに準拠 |
| withSession | '1' | (任意)レスポンスに `sessionId` フィールドを返却する |

#### 解析結果
- [v1.realtimeNotificationUrl](/../../../../esjapan/esas-core-v2-dev/blob/master/doc/config.md#主要項目) のURLに結果を返却

# WebSocket
ESAS-coreに準拠