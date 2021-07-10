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
以下のファイルのコードを編集し、作成されたバイナリのパスを nsconbin に指定し、シグナリングサーバの URL、swtich 側の userid を設定。

raspberryPiClient/index.js
```nodejs
const nsconbin = '/home/pi/App/nscon/main'//nscon のバイナリファイル
const url = 'ws://defaultSignalingEndpoint';//シグナリングサーバのurl
const userid = 'myswitch' //userid
```

### 開始方法
switch に接続(rasberryPi の type-c ポートと switch の USB ポートを接続)

USB ガジェットの作成(都度実行すること)
https://gist.github.com/mzyy94/60ae253a45e2759451789a117c59acf9#file-add_procon_gadget-sh

```
wget https://gist.githubusercontent.com/mzyy94/60ae253a45e2759451789a117c59acf9/raw/23ddee29d94350be80b79d290ac3c8ce8400bd88/add_procon_gadget.sh
sudo sh add_procon_gadget.sh
```

起動
```
sudo node index.js
```

webClient の web ページにアクセスし、シグナリングサーバの URL、swtich 側の userid を指定し、「Connect」ボタンを実行
