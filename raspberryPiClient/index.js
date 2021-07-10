const WebRtcManager = require('./webrtc');
const { spawn } = require('child_process')
const { program } = require('commander');
const WebSocket = require('ws');

// 実行例
//sudo node index.js --nsconbin /home/pi/App/nscon/main --url ws://192.168.1.77:8100 --userid myswitch
program
    .usage('[options] <file ...>')
    .requiredOption('-b, --nsconbin <nscon bin path>', 'nscon binary path')
    .requiredOption('-u, --url <signaling url>', 'signaling endpoint url')
    .option('-i, --userid <userid>', 'userid')
    .parse(process.argv);

const options = program.opts();

const nsconbin = options.nsconbin//nscon のバイナリファイル
const url = options.url;//シグナリングサーバのurl 例(ws://192.168.1.77:8100)
const userid = options.userid ? options.userid : 'myswitch' //switch 側のuserid。デフォルトは myswitch

const nsconProcess = spawn(nsconbin)

const ws = new WebSocket(url+'?userid='+userid);
const webRtcManager = new WebRtcManager(ws, nsconProcess);
ws.on('open', function open() {
    console.log("open");
    ws.send('something');
});

ws.on('message', message => {
    console.log(message);
    let messageObject
    try {
        messageObject = JSON.parse(message);
    } catch (e) {
        console.log("failed JSON parse");
        return
    }
    if (messageObject.from && messageObject.from!='server') {
        if (messageObject.eventType) {
            if (messageObject.eventType == "sendLocalOffer") {
                //sendLocalOffer の処理
                webRtcManager.recevieOffer(messageObject.from, messageObject.data.localOffer);
            }
            else if (messageObject.eventType == "sendICECandidate") {
                 //ICE の処理
                webRtcManager.recevieICE(messageObject.from, messageObject.data.ICECandidate);
            }
        }
    }

});
