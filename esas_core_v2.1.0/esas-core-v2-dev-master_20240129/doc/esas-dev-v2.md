# File upload
### 下記のURLからアップロード
- /publish/fileupload.html

### エントリーポイント
#### [POST] /uploadFile
| ヘッダー | 値 |
|---|---|
|Content-Type | multipart/form-data |

| パラメータ | 値 | 説明 |
|---|---|---|
| uploadFile | バイナリー | （必須）対象ファイル |
| withResult | '1' | (任意)結果ファイルを返す |

##### withResultを指定しない場合
`text/javascript` 形式で、`key` フィールドが返却される。

この値を下記 `/downloadFile` に渡すことで結果ファイルが得られる.

##### withResultを指定した場合
下記 `/downloadFile` と同じ結果が返却される

- [参考実装](/../../../../esjapan/esas-core-v2/blob/master/server/public/publish/fileupload.html#L156)

#### [POST] /downlodFile
| ヘッダー | 値 |
|---|---|
|Content-Type | application/json |

| パラメータ | 値 | 説明 |
|---|---|---|
| key | 文字列 | （必須）uploadFileの結果 |

`text/plain` 形式で、結果ファイルが返却される

# クライアントJSライブラリ
- [クライアントJSライブラリ](/../../../../esjapan/esas-core-v2/tree/master/clientjs)

# SocketIo
JS以外の言語で実装する場合に参考にしてください

### シーケンス

```
クライアント     サーバ
 connect    =>
    init    =>
    data    =>
        :
        :   <= analized
        :         :
    term    =>    :
                  :
            <= disconnect
```
data, analized, term は非同期で発生するため順序性はない。

term後は、滞留している解析結果が全てanalized で返却された後、ソケットが切断される。

### エントリーポイント
#### [connect] /socket
| パラメータ | 値 |
|---|---|
| transports | ['websocket'] |
| path | /socket |

### emit
#### init
コンテキストを指定する

| パラメータ | 値 | 備考 |
|---|---|---|
| channels | 1 or 2 | モノラル or ステレオ |
| bitRate | 8 or 16 | 量子化ビット数 |
| sampleRate | 6000, 8000, 11000, 11025, 16000, 22000, 44100, 48000  | サンプリング周波数 |
| bigendian | true or false | ビッグエンディアンフラグ |

#### data
PCMバイナリーを送信する

#### term
全てのデータを送った後に送信する

### on
#### analyzed
解析結果を返却する

| パラメータ | 値 | 備考 |
|---|---|---|
| Param | Array | チャンネル毎のパラメータ |

- [チャンネル毎のパラメータ](/../../../../esjapan/esas-core-v2-dev/blob/master/doc/config.md#チャンネル毎のパラメータcustomfields)

#### disconnect
ソケットが切断された
