# リリース手順
### 0. 事前準備

- [Dockerコンテナ＆イメージをクリア](docker.md)

### 1. クライアント名のリリースブランチを切る（"test_client"）
リポジトリ：esas-core-v2、esas-core-v2-dev の両方に同じブランチ名を切って作業します。

クライアントへの納品物を保存する意味合いがあり、問題発生時の再現環境を構築できるようにしておくため、githubにブランチをpushし、そこから納品物を生成する。

### 2. ESASパラメータにNemsyscoエンジンフィールドを含めたい場合

`esas-core-v2/server/src/lib/logic.js` の `ENGINE_PARAM_FIELDS` の該当部分のコメントを解除する

### 3. 設定ファイルを作成

`esas-core-v2-dev/settings/esas/conf/production.js.sample` を `esas-core-v2-dev/settings/esas/conf/production.js` へコピーして設定する

**ESAS側のリリース手順で設定する項目**

- `name` クライアント名（日本語OK）
- `customFields` 2.にて指定したフィールドのコメントを解除
- `customFields` 残ったコメントアウト部分を削除する
- `engine.apiKey` Nemsyscoのライセンス情報
- `engine.password` Nemsyscoのライセンス情報
- `dockerName` NemesyscoのDockerName（EmotionLogicHubに記録される為、ユニークな名前に設定）

**お客様の環境に合わせて設定する項目**

- `rtp.url` /CallOperationの戻り値のAddress field。お客様の環境のサーバーアドレスを設定して頂く。
- `v1.realtimeNotificationUrl` RTP解析時の結果コールバックURL
- `v1.wsPort` Websocket p cmmandの戻り値（クライアントプログラムはsocket接続を行った後なの意味をなしていない。使われていないと思われる）
- `engine.backgroundNoise`

### 4. ビルド（開発サーバで実施）

```
export BRANCH=test_client
cd ~/esas-core-v2-dev
git fetch
git checkout -b $BRANCH remotes/origin/$BRANCH
sudo bash release.sh
```

#### リリースファイル
| ファイル | 説明 |
|---|----|
| `releaes/esas-core-$BRANCH/esas-core-$BRANCH.tar.gz` | ESAS-core Linux本体 |
| `release/esas-core-$BRANCH/esas_windows_settings.zip` | ESAS-core Windows用設定ファイル |
| `release/esas-core-$BRANCH/esas-core-$BRANCH.iso` | 上記２つが含まれたもの |
