# share_mt

## signalingServer
### 初期設定
```
cd signalingServer/
npm install
```

### 開始
```
node index.js
```

ポート 8100 で待ち受け

## webClient
### 初期設定

```
cd webClient/
npm install
```

### web server の開始
```
npm run-script build:watch
```
と
```
npm run-script start:watch
```
を同時実行

### 静的ファイルの生成
```
npm run-script publish
```

-> webClient/out に生成される

デフォルトのシグナリングサーバの URL、switch 側のユーザー ID を変更するには
以下の部分を編集する
webClient/src/message.ts
```nodejs
defaultSignalingEndpoint = 'ws://defaultSignalingEndpoint';
defaultSendUserId = 'myswitch';
```

## rasberryPiClient

### 初期設定
```
cd raspberryPiClient/
npm install
```

nscon の demo を build
```
git clone https://github.com/mzyy94/nscon
cd nscon/
go build demo/main.go 
```
作成されたバイナリのパスは起動のために控えておきます

### 開始方法
switch に接続(rasberryPi の type-c ポートと switch の USB ポートを接続)

USB ガジェットの作成(rasberryPi の起動時には毎回実行)
https://gist.github.com/mzyy94/60ae253a45e2759451789a117c59acf9#file-add_procon_gadget-sh

```
wget https://gist.githubusercontent.com/mzyy94/60ae253a45e2759451789a117c59acf9/raw/23ddee29d94350be80b79d290ac3c8ce8400bd88/add_procon_gadget.sh
sudo sh add_procon_gadget.sh
```

起動

```
sudo node index.js --nsconbin <nscon demo のバイナリのパス> --url <シグナリングサーバの URL、ポート> --userid <任意の ID>
```
オプション例
```
sudo node index.js --nsconbin /home/pi/App/nscon/main --url ws://192.168.1.64:8100 --userid myswitch
```

## 利用方法
webClient の web ページにアクセス
以下を入力
* 「signaling endpoint」 : シグナリングサーバの URL
* 「My userid」 : 他のユーザと重複しない任意の ID
* 「Send userid」: rasberryPiClient に設定している userid 

「Connect」ボタンで実行

対応表
| キーボード | コントローラ |
| ------------- | ------------- |
| WASD キー | 十字キー |
| エンター | A ボタン |
| スペース | B ボタン |
| . キー | X ボタン |
| / キー | Y ボタン |
| Q キー | L ボタン |
| E キー | R ボタン |
| F キー | マイナスボタン |
| G キー | プラスボタン |

同時押しには対応してないので、交互に連打してください
