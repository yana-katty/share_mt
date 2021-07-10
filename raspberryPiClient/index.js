const WebRtcManager = require('./webrtc');
const { spawn } = require('child_process')

const nsconbin = '/home/pi/App/nscon/main'//nscon のバイナリファイル
const nsconProcess = spawn(nsconbin)

const WebSocket = require('ws');
const url = 'wss://signaling.xn--48jegik.app';//シグナリングサーバのurl
const userid = 'myswitch' //userid
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
