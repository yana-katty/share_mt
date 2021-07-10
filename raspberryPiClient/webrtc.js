const { RTCPeerConnection } = require('wrtc');


module.exports =　class WebRtcManager {
    constructor(ws, nsconProcess) {
        this.connections = new Map();//全てのコネクションを管理するmap. オブジェクトを管理するものとする
        this.ws = ws;
        this.nsconProcess = nsconProcess;
    }

    async recevieOffer(userid, localOffer) {

        //もし既存のものが接続があったら削除する
        if (this.connections.has(userid)) {
            console.log(`${userid} is Already exists`)
            if (this.connections.get(userid)["webRTCConnection"]) {
                this.connections.get(userid)["webRTCConnection"].close();
            }
            this.connections.set(userid, {});
        }
        this.connections.set(userid,{});
        let webRTCConnection
        
        this.connections.get(userid)["webRTCConnection"] = webRTCConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        });
        webRTCConnection.onicecandidate = this.makeOnicecandidateCallback(userid);
        webRTCConnection.ondatachannel = this.makeOndatachannelCallback(userid);

        this.connections.get(userid)["webRTCConnectionInitPromise"] =  new Promise(async (resolve, reject) => { // init の処理が完了するまで他で待機するもの
            
            try {
                await webRTCConnection.setRemoteDescription(localOffer);
                const remoteAnswer = await webRTCConnection.createAnswer();
                console.log(`Got remote answer ${JSON.stringify(remoteAnswer)} and send to ${userid}`);

                await webRTCConnection.setLocalDescription(remoteAnswer);
                //remoteAnswer を送信
                let message = { sendToUserid: userid, eventType: "sendRemoteAnswer", data: { remoteAnswer: remoteAnswer } };
                this.ws.send(JSON.stringify(message));
                resolve(true);
            } catch (e) {
                reject(e);
            }
            
            
        });
    }

    makeOnicecandidateCallback(sendUserID = ""){
    return (e) => {
        console.log('local connection ICE candidate: ', e.candidate);
        //
        if (e.candidate) {
            let message = { sendToUserid: sendUserID, eventType: "sendICECandidate", data: { ICECandidate: e.candidate } };
            this.ws.send(JSON.stringify(message));
            
        }
        // console.log('now state ', JSON.stringify(this.connections.get(sendUserID)["webRTCConnection"]));
    }
}

    makeOndatachannelCallback(sendUserID = ""){
        return (event) => {
            console.log(`connected RemoteDataChannel userid: ${sendUserID} `);
            let remoteChannel;
        this.connections.get(sendUserID)["remoteChannel"] = remoteChannel = event.channel;
        remoteChannel.binaryType = 'arraybuffer';
            remoteChannel.onmessage = (event) => {
                let data
                try {
                    data = JSON.parse(event.data);
                } catch (e) {
                    console.log("failed JSON parse");
                    return
                }

            console.log(`Remote message received by: ${data}`);
            // イベント処理

                if (data.eventType == "sendCommand" && data.data.command) {
                    console.log(`excute command ${data.data.command}`)
                    switch (data.data.command) {
                        case 'Left':
                            this.nsconProcess.stdin.write("a");
                            break
                        case 'Up':
                            this.nsconProcess.stdin.write("w");
                            break
                        case 'Down':
                            this.nsconProcess.stdin.write("s");
                            break
                        case 'Right':
                            this.nsconProcess.stdin.write("d");
                            break
                        case 'A':
                            this.nsconProcess.stdin.write(new Buffer([0x0a]));
                            break
                        case 'B':
                            this.nsconProcess.stdin.write(' ');
                            break
                        case 'X':
                            this.nsconProcess.stdin.write('.');
                            break
                        case 'Y':
                            this.nsconProcess.stdin.write('/');
                            break
                        case 'L':
                            this.nsconProcess.stdin.write('q');
                            break
                        case 'R':
                            this.nsconProcess.stdin.write(']');
                            break
                        case 'Plus':
                            this.nsconProcess.stdin.write('g');
                            break
                        case 'Minus':
                            this.nsconProcess.stdin.write('f');
                            break
                    }
                
            }
            
        }
        remoteChannel.onclose = () => {
            console.log('Remote channel closed!');
            this.connections.delete(sendUserID);//チャネルclose 時にはデータも消したいけど、 wrtc 側の処理も必要？
        };
    }

    }
    async recevieICE(userid, ICECandidate) {

        if (this.connections.get(userid)["webRTCConnectionInitPromise"]) {
            await Promise.resolve(this.connections.get(userid)["webRTCConnectionInitPromise"]);// 初期化処理が終わるまで ICE 登録は待機
            console.log(`incoming ice candidate`);
            if (this.connections.has(userid) && this.connections.get(userid)["webRTCConnection"]) {
                console.log(`set remote ICECandidate userid: ${userid}`);
                await this.connections.get(userid)["webRTCConnection"].addIceCandidate(ICECandidate);

            }
        }
       
    }

}
